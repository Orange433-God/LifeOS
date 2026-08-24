"""
智能体编排器（改造后）
- chat：人生观察者(Agent1) → 记忆与建议生成器(Agent2，带用户 RAG 工具)
- insight：人生观察者(汇总) → 成长导航师(Agent3) → 反思导师(Agent4)

多智能体架构保留，按接口场景编排不同 Agent 组合，控制对话延迟。
"""

import json
import re
from typing import Any, Dict, Optional

from crewai import Agent, Crew, Process, Task
from crewai.tools import tool as crewai_tool

from agents import guide_agent, memory_agent, observer_agent, reflector_agent
from agents.guide_agent import GUIDE_EXPECTED_OUTPUT, GUIDE_TASK_DESCRIPTION
from agents.memory_agent import MEMORY_EXPECTED_OUTPUT, MEMORY_TASK_DESCRIPTION
from agents.observer_agent import OBSERVER_EXPECTED_OUTPUT, OBSERVER_TASK_DESCRIPTION
from agents.reflector_agent import REFLECTOR_EXPECTED_OUTPUT, REFLECTOR_TASK_DESCRIPTION
from config import (
    DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL,
    FAST_CHAT_MODEL,
    ensure_api_key,
)
from core.fast_chat import (
    FAST_CHAT_SYSTEM_PROMPT,
    ReplyStreamParser,
    build_user_prompt,
    parse_tags,
    strip_tags,
)
from core.knowledge_graph import LifeGraph
from core.memory_manager import MemoryManager
from core.vector_store import get_user_vector_store

_PERIOD_LABELS = {"weekly": "本周", "monthly": "本月"}


class Orchestrator:
    """多智能体编排器：协调 4 个 Agent 完成陪伴对话与人生洞察"""

    def __init__(self) -> None:
        pass

    # ---- 工具 ----

    def _rag_tool_for(self, user_id: str):
        """每个用户独立的 RAG 检索工具（指向该用户的 Chroma collection）"""

        @crewai_tool("检索用户资料库")
        def retrieve_user_docs(query: str) -> str:
            """从用户上传的个人资料（PDF/笔记）中检索与查询最相关的内容。
            当用户提到自己的笔记、资料或上传过的文档时调用。"""
            return get_user_vector_store(user_id).retrieve_as_context(query)

        return retrieve_user_docs

    # ---- 对话（chat）----

    def chat_stream(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
    ):
        """对话快速通道（低延迟）

        单次流式 LLM 调用（deepseek-v4-flash）+ 标签增量解析：
        - 边生成边产出 {"type": "delta", "content": ...} 事件（真实打字机）
        - 生成完成后产出 {"type": "done", "payload": {...}} 事件
        记忆沉淀与完整多智能体路径一致（状态画像 / 兴趣图谱 / 对话历史）。
        """
        ensure_api_key()
        context = context or {}
        nickname = context.get("nickname") or ""
        attributes = context.get("attributes") or {}
        recent_records = context.get("recentRecords") or []

        memory = MemoryManager(user_id)
        history_context = memory.format_history_context()

        from openai import OpenAI

        client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
        messages = [
            {"role": "system", "content": FAST_CHAT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(
                    nickname=nickname,
                    attributes_json=json.dumps(attributes, ensure_ascii=False),
                    recent_records="、".join(recent_records) if recent_records else "暂无",
                    history_context=history_context,
                    message=message,
                ),
            },
        ]

        parser = ReplyStreamParser()
        full_text_parts: list = []

        stream = client.chat.completions.create(
            model=FAST_CHAT_MODEL,
            messages=messages,
            stream=True,
            temperature=0.8,
            max_tokens=600,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta_text = chunk.choices[0].delta.content or ""
            if not delta_text:
                continue
            full_text_parts.append(delta_text)
            reply_delta = parser.feed(delta_text)
            if reply_delta:
                yield {"type": "delta", "content": reply_delta}

        # 生成完成：解析标签，组装结果
        full_text = "".join(full_text_parts)
        reply = "".join(parser.reply_parts).strip()
        if not parser.started or not reply:
            # 模型未按标签格式输出：整段作为回复（去标签兜底）
            reply = strip_tags(full_text) or "我在听，继续说吧。"
            tags: Dict[str, Optional[str]] = {}
        else:
            tags = parse_tags(full_text)

        memory_update = {
            "mood": tags.get("mood") or "",
            "keyPoint": tags.get("key_point") or "",
        }
        suggested_action = tags.get("action") or ""

        # 记忆沉淀（与多智能体路径一致）
        state: Dict[str, Any] = {}
        if memory_update["mood"]:
            state["mood"] = memory_update["mood"]
        if memory_update["keyPoint"]:
            state["key_point"] = memory_update["keyPoint"]
        if state:
            memory.merge_state(state)
        interests = [
            item.strip()
            for item in (tags.get("interests") or "").replace("，", ",").split(",")
            if item.strip()
        ]
        graph = LifeGraph(user_id)
        for topic in interests[:5]:
            graph.record_interest(topic)
        memory.append_history(message, reply)

        yield {
            "type": "done",
            "payload": {
                "success": True,
                "data": {
                    "reply": reply,
                    "memoryUpdate": memory_update,
                    "suggestedAction": suggested_action,
                },
                "message": "ok",
            },
        }

    def chat(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """完整多智能体流水线（观察者 → 记忆与建议生成器，带 RAG 工具）

        注：对话接口默认走 chat_stream 快速通道；本方法保留完整编排，
        供需要深度分析/工具调用的场景切换使用。
        """
        ensure_api_key()
        context = context or {}
        nickname = context.get("nickname") or ""
        attributes = context.get("attributes") or {}
        recent_records = context.get("recentRecords") or []

        memory = MemoryManager(user_id)
        history_context = memory.format_history_context()
        attributes_json = json.dumps(attributes, ensure_ascii=False)
        records_text = "、".join(recent_records) if recent_records else "暂无"

        # 带用户 RAG 工具的记忆 Agent 副本
        memory_agent_tooled = Agent(
            role=memory_agent.role,
            goal=memory_agent.goal,
            backstory=memory_agent.backstory,
            llm=memory_agent.llm,
            tools=[self._rag_tool_for(user_id)],
            allow_delegation=False,
            verbose=False,
        )

        t1 = Task(
            description=OBSERVER_TASK_DESCRIPTION.format(
                user_message=message,
                history_context=history_context,
                attributes_json=attributes_json,
                recent_records=records_text,
            ),
            expected_output=OBSERVER_EXPECTED_OUTPUT,
            agent=observer_agent,
        )
        t2 = Task(
            description=MEMORY_TASK_DESCRIPTION.format(
                nickname=nickname,
                user_message=message,
                observer_output="{来自上一步的观察结果}",
            ),
            expected_output=MEMORY_EXPECTED_OUTPUT,
            agent=memory_agent_tooled,
            context=[t1],
        )

        crew = Crew(
            agents=[observer_agent, memory_agent_tooled],
            tasks=[t1, t2],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()

        outputs = [str(o) for o in result.tasks_output] if hasattr(result, "tasks_output") else [str(result)]
        observer_raw = outputs[0] if len(outputs) > 0 else ""
        reply_raw = outputs[1] if len(outputs) > 1 else "{}"

        observer_state = self._parse_json_output(observer_raw)
        reply_json = self._parse_json_output(reply_raw)

        reply = (reply_json.get("reply") or "").strip() or "我在听，继续说吧。"
        memory_update = reply_json.get("memoryUpdate") or {}
        suggested_action = reply_json.get("suggestedAction") or ""

        # 记忆沉淀：状态画像合并 + 兴趣写入人生图谱 + 对话历史追加
        memory.merge_state(observer_state)
        graph = LifeGraph(user_id)
        for topic in observer_state.get("interests", []):
            if topic:
                graph.record_interest(str(topic))
        memory.append_history(message, reply)

        return {
            "reply": reply,
            "memoryUpdate": memory_update,
            "suggestedAction": suggested_action,
        }

    # ---- 人生洞察（insight）----

    def generate_insight(
        self,
        user_id: str,
        period: str = "weekly",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """生成周报/月报形式的人生洞察

        流程：观察者汇总 → 成长导航师 → 反思导师
        """
        ensure_api_key()
        context = context or {}
        period_label = _PERIOD_LABELS.get(period, "本周")
        attributes = context.get("attributes") or {}

        memory = MemoryManager(user_id)
        profile_json = json.dumps(memory.load_state(), ensure_ascii=False)
        attributes_json = json.dumps(attributes, ensure_ascii=False)

        t1 = Task(
            description=(
                f"## 任务：汇总{period_label}的用户状态\n\n"
                f"{memory.format_history_context()}\n\n"
                f"用户状态画像：{profile_json}\n\n"
                "请输出 JSON（只输出 JSON 本身）：\n"
                '{"period_summary": "该周期状态摘要（80 字内）", '
                '"highlights": ["成长亮点"], "lows": ["值得关注的点"]}'
            ),
            expected_output="仅输出 JSON 对象。",
            agent=observer_agent,
        )
        t2 = Task(
            description=GUIDE_TASK_DESCRIPTION.format(
                period_label=period_label,
                attributes_json=attributes_json,
                period_summary="{来自上一步的周期汇总}",
            ),
            expected_output=GUIDE_EXPECTED_OUTPUT,
            agent=guide_agent,
            context=[t1],
        )
        t3 = Task(
            description=REFLECTOR_TASK_DESCRIPTION.format(
                period_label=period_label,
                period_summary="{来自上一步的周期汇总}",
                guide_output="{来自上一步的阶段建议}",
                profile_json=profile_json,
            ),
            expected_output=REFLECTOR_EXPECTED_OUTPUT,
            agent=reflector_agent,
            context=[t1, t2],
        )

        crew = Crew(
            agents=[observer_agent, guide_agent, reflector_agent],
            tasks=[t1, t2, t3],
            process=Process.sequential,
            verbose=False,
        )
        result = crew.kickoff()

        outputs = [str(o) for o in result.tasks_output] if hasattr(result, "tasks_output") else [str(result)]
        summary_raw = outputs[0] if len(outputs) > 0 else "{}"
        guide_raw = outputs[1] if len(outputs) > 1 else "{}"
        insight_raw = outputs[2] if len(outputs) > 2 else "{}"

        period_state = self._parse_json_output(summary_raw)
        guide_json = self._parse_json_output(guide_raw)
        insight_json = self._parse_json_output(insight_raw)

        return {
            "summary": insight_json.get("summary") or period_state.get("period_summary", ""),
            "suggestions": insight_json.get("suggestions") or guide_json.get("next_steps", []),
            "roomSuggestion": insight_json.get("roomSuggestion") or {
                "addItem": "",
                "changeLighting": "warm",
            },
        }

    # ---- 工具函数 ----

    @staticmethod
    def _parse_json_output(text: str) -> Dict[str, Any]:
        """从 Agent 输出中提取并解析 JSON"""
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        json_str = json_match.group(1) if json_match else text
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            brace_match = re.search(r"\{.*\}", json_str, re.DOTALL)
            if brace_match:
                try:
                    return json.loads(brace_match.group())
                except json.JSONDecodeError:
                    pass
            return {}


# 全局单例（编排器无状态，各请求按 userId 取用各自的数据）
orchestrator = Orchestrator()
