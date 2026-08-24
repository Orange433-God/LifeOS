"""
快速对话通道（延迟优化）

替代 chat 场景下的 CrewAI 多智能体流水线：单次 LLM 调用 + 标签流式解析，
首字延迟从 ~30s 降到数秒。系统提示词融合了「人生观察者」与「记忆与建议
生成器」两个 Agent 的人设；洞察生成（insight）仍走完整多智能体编排。
"""

import re
from typing import Dict, List, Optional

# 融合人设的系统提示词（观察者视角只用于理解用户，不暴露分析过程）
FAST_CHAT_SYSTEM_PROMPT = """你是 LifeOS 的 AI 伙伴「小伴」——温柔、敏锐、懂得倾听，用朋友般的语气陪伴用户。
同时你也是一位敏锐的人生观察者：从用户的话语中捕捉情绪、精力状态与兴趣，但这些洞察只用于让回复更贴心，绝不把分析过程暴露给用户。

回复要求：
- 60-150 字，温暖自然，可称呼用户昵称；不说教、不评判、不堆砌 markdown
- 结合 LifeOS 提供的七维属性与近期记录，让用户感到「你真的懂我」
- 结尾给出一个小而具体的行动建议

严格按以下格式输出（系统会解析标签，用户只会看到 <reply> 之间的内容）：
<reply>写给用户的陪伴回复</reply>
<mood>本轮情绪关键词（如：疲惫/开心/低落）</mood>
<key_point>值得记住的一件事（一句话）</key_point>
<action>一个小而具体的建议（一句话）</action>
<interests>用户提到的兴趣，逗号分隔，没有则留空</interests>
"""


class ReplyStreamParser:
    """流式解析 <reply>...</reply>：实时产出回复文本增量"""

    START = "<reply>"
    END = "</reply>"

    def __init__(self) -> None:
        self._buffer = ""
        self.started = False
        self.finished = False
        self.reply_parts: List[str] = []

    def feed(self, text: str) -> str:
        """喂入一段模型输出，返回本次可产出的回复增量"""
        if self.finished:
            return ""
        self._buffer += text

        if not self.started:
            idx = self._buffer.find(self.START)
            if idx == -1:
                return ""
            self._buffer = self._buffer[idx + len(self.START):]
            self.started = True

        end_idx = self._buffer.find(self.END)
        if end_idx != -1:
            delta = self._buffer[:end_idx]
            self._buffer = self._buffer[end_idx + len(self.END):]
            self.finished = True
        else:
            # 保守输出：保留末尾 len(END) 个字符，防止 </reply> 被 chunk 边界切开
            keep = len(self.END)
            if len(self._buffer) > keep:
                delta = self._buffer[:-keep]
                self._buffer = self._buffer[-keep:]
            else:
                delta = ""

        if delta:
            self.reply_parts.append(delta)
        return delta


def parse_tags(text: str) -> Dict[str, Optional[str]]:
    """从完整输出中提取 mood / key_point / action / interests 标签"""
    result: Dict[str, Optional[str]] = {}
    for tag in ("mood", "key_point", "action", "interests"):
        match = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.DOTALL)
        result[tag] = match.group(1).strip() if match else None
    return result


def strip_tags(text: str) -> str:
    """去掉所有 <xxx> 标签，返回纯文本（模型未按格式输出时的兜底）"""
    return re.sub(r"<[^>]+>", "", text).strip()


def build_user_prompt(
    nickname: str,
    attributes_json: str,
    recent_records: str,
    history_context: str,
    message: str,
) -> str:
    """组装用户消息（与多智能体路径相同的上下文输入）"""
    return f"""用户昵称：{nickname or '朋友'}
七维属性（0-100）：{attributes_json}
近期记录：{recent_records}

{history_context}

用户说：{message}
"""
