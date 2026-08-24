"""
智能体编排器
使用 CrewAI 将 4 个智能体串联成顺序 Pipeline，完成教学闭环。
流程: 用户输入 → 学情分析(Agent1) → RAG(Tool) → 资源生成(Agent2)
      → 路径规划(Agent3) → 测评生成(Agent4)

架构特点（参照 part/craw_test.py 的模式）：
- 所有 Agent 在同一个 Crew 中，通过 context 传参
- RAG 检索封装为 Tool，由资源生成 Agent 按需调用
- LLM 对象全局共享（支持 streaming）
"""

import json
import re

from crewai import Agent, Crew, Process, Task
from crewai.tools import tool as crewai_tool

from src.agents import (
    profile_agent,
    resource_agent,
    path_agent,
    assessment_agent,
)
from src.agents.profile_agent import (
    PROFILE_TASK_DESCRIPTION,
    PROFILE_EXPECTED_OUTPUT,
)
from src.agents.resource_agent import (
    RESOURCE_TASK_DESCRIPTION,
    RESOURCE_EXPECTED_OUTPUT,
)
from src.agents.path_agent import (
    PATH_TASK_DESCRIPTION,
    PATH_EXPECTED_OUTPUT,
)
from src.agents.assessment_agent import (
    ASSESSMENT_TASK_DESCRIPTION,
    ASSESSMENT_EXPECTED_OUTPUT,
)
from src.vector_store import VectorStore

# 非教学问题关键词（快速过滤，不消耗 API）
_NON_TEACHING_KEYWORDS = [
    "笑话", "天气", "新闻", "股票", "彩票", "星座", "娱乐",
    "你好", "你是谁", "你叫什么", "吃了没", "再见", "拜拜",
    "游戏", "电影", "音乐", "体育", "八卦", "购物",
]

REFUSAL_MESSAGE = """## ❌ 抱歉，我只能回答教学相关问题

我是**AI 学习助手**，专注于提供学习辅导和教学支持。

**我可以帮你：**
- 📖 **讲解知识点**：如「什么是深度学习？」
- 📝 **出题练习**：如「出几道机器学习的题」
- 🗺️ **规划路径**：如「我想学 NLP，该按什么顺序？」

请提出与学习相关的问题吧！"""


class Orchestrator:
    """多智能体编排器，协调 4 个智能体完成教学任务"""

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        # 创建 RAG 检索工具，供资源生成 Agent 按需调用
        @crewai_tool("检索知识库")
        def retrieve_knowledge(query: str) -> str:
            """从课程教材知识库中检索与查询最相关的知识点。
            当你需要教材内容来讲解时，调用此工具。
            """
            return vector_store.retrieve_as_context(query)

        self._rag_tool = retrieve_knowledge

    def _is_teaching_related(self, query: str) -> bool:
        """两步策略判断是否与教学相关"""
        # Step 1: 关键词快速过滤
        for kw in _NON_TEACHING_KEYWORDS:
            if kw in query.lower() or kw in query:
                return False
        # Step 2: LLM 语义判断（默认放行）
        return True

    def process_query(
        self,
        user_query: str,
        history_context: str = "",
        existing_profile: dict = None,
    ) -> dict:
        """处理用户查询，执行多智能体全流程

        使用 1 个 Crew 串联 4 个 Agent，通过 context 自动传参，
        资源生成 Agent 可调用「检索知识库」工具获取教材内容。

        Args:
            user_query: 用户输入的文本问题
            history_context: 历史对话上下文
            existing_profile: 已有的学生画像（用于随学随新）

        Returns:
            包含各智能体输出和最终结果的字典
        """
        # 前置过滤：非教学问题直接拒绝
        if not self._is_teaching_related(user_query):
            return {
                "student_profile": "",
                "profile_parsed": {},
                "rag_context": "",
                "teaching_resource": REFUSAL_MESSAGE,
                "learning_path": "",
                "assessment": "",
                "is_refused": True,
            }

        # 将已有画像格式化为 JSON 字符串
        profile_json = json.dumps(existing_profile or {}, ensure_ascii=False)

        # 创建带 RAG 工具的资源生成 Agent 副本
        resource_agent_tooled = Agent(
            role=resource_agent.role,
            goal=resource_agent.goal,
            backstory=resource_agent.backstory,
            llm=resource_agent.llm,
            tools=[self._rag_tool],
            allow_delegation=False,
            verbose=False,
        )

        # ---- 定义 4 个 Task ----
        # Task 1: 学情分析（基于已有画像更新）
        t1 = Task(
            description=PROFILE_TASK_DESCRIPTION.format(
                user_query=user_query,
                history_context=history_context or "暂无历史对话记录。",
                existing_profile=profile_json,
            ),
            expected_output=PROFILE_EXPECTED_OUTPUT,
            agent=profile_agent,
        )

        # Task 2: 资源生成（可调用 RAG 工具）
        t2 = Task(
            description=RESOURCE_TASK_DESCRIPTION.format(
                user_query=user_query,
            ),
            expected_output=RESOURCE_EXPECTED_OUTPUT,
            agent=resource_agent_tooled,
            context=[t1],  # t1 的输出自动传入作为上下文
        )

        # Task 3: 路径规划
        t3 = Task(
            description=PATH_TASK_DESCRIPTION.format(
                user_query=user_query,
            ),
            expected_output=PATH_EXPECTED_OUTPUT,
            agent=path_agent,
            context=[t2],  # t2 的输出自动传入
        )

        # Task 4: 测评生成
        t4 = Task(
            description=ASSESSMENT_TASK_DESCRIPTION.format(
                user_query=user_query,
            ),
            expected_output=ASSESSMENT_EXPECTED_OUTPUT,
            agent=assessment_agent,
            context=[t2],  # t2 的输出自动传入（测评需要教学资源）
        )

        # ---- 单 Crew 执行所有任务 ----
        crew = Crew(
            agents=[profile_agent, resource_agent_tooled, path_agent, assessment_agent],
            tasks=[t1, t2, t3, t4],
            process=Process.sequential,
            verbose=False,
        )

        result = crew.kickoff()

        # ---- 提取各 Task 输出 ----
        try:
            task_outputs = [str(o) for o in result.tasks_output]
        except AttributeError:
            # 兼容可能没有 tasks_output 的版本
            task_outputs = [str(result)]

        profile_str = task_outputs[0] if len(task_outputs) > 0 else ""
        resource_str = task_outputs[1] if len(task_outputs) > 1 else ""
        path_str = task_outputs[2] if len(task_outputs) > 2 else ""
        assessment_str = task_outputs[3] if len(task_outputs) > 3 else ""

        # 解析画像 JSON
        profile_parsed = self._parse_json_output(profile_str)

        # 与已有画像合并（本地合并确保字段一致性）
        from src.memory import MemoryManager
        mm = MemoryManager()
        merged_profile = mm.merge_profile(profile_parsed)
        # 用本地合并的版本覆盖纯 LLM 输出，更稳定
        final_profile = dict(merged_profile)
        final_profile["current_topic"] = profile_parsed.get(
            "current_topic", final_profile.get("current_topic", "")
        )

        return {
            "student_profile": profile_str,
            "profile_parsed": final_profile,
            "rag_context": "(由资源生成智能体按需检索)",
            "teaching_resource": resource_str,
            "learning_path": path_str,
            "assessment": assessment_str,
            "is_refused": False,
        }

    @staticmethod
    def _parse_json_output(text: str) -> dict:
        """从 Agent 输出中提取并解析 JSON"""
        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = text
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


def format_final_answer(result: dict) -> str:
    """将编排器的结果格式化为前端展示文本"""
    if result.get("is_refused"):
        return result.get("teaching_resource", REFUSAL_MESSAGE)

    parts = []
    if result.get("teaching_resource"):
        parts.append(result["teaching_resource"])
    if result.get("learning_path"):
        parts.append("\n---\n## 📍 学习路径规划\n")
        parts.append(result["learning_path"])
    if result.get("assessment"):
        parts.append("\n---\n## 📝 配套测评\n")
        parts.append(result["assessment"])

    profile_info = result.get("profile_parsed", {})
    if profile_info:
        parts.append("\n---\n## 👤 学习画像摘要\n")
        parts.append(
            f"- **知识水平**: {profile_info.get('knowledge_level', '未知')}\n"
            f"- **认知风格**: {profile_info.get('cognitive_style', '未知')}\n"
            f"- **学习目标**: {profile_info.get('learning_goal', '未知')}\n"
            f"- **推荐策略**: {profile_info.get('teaching_strategy', '未知')}\n"
        )

    return "\n".join(parts)
