"""
对话记忆管理模块（改造）
按 userId 隔离：每个用户的记忆存为独立 JSON 文件（data/memory/{userId}.json），
包含状态画像与最近对话历史。
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List

from config import MAX_HISTORY_ROUNDS, MEMORY_DIR

# 默认状态画像
DEFAULT_STATE: Dict[str, Any] = {
    "mood": "",
    "energy_level": "",
    "key_point": "",
    "interests": [],
    "concerns": [],
    "behavior_pattern": "",
    "interaction_count": 0,
}

# userId 只允许 UUID/字母数字连字符，防止路径穿越
_USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class MemoryManager:
    """按 userId 隔离的记忆管理器"""

    def __init__(self, user_id: str) -> None:
        if not _USER_ID_PATTERN.match(user_id):
            raise ValueError("userId 只能包含字母、数字、-、_，且不超过 64 位")
        self.user_id = user_id
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        self.file: Path = MEMORY_DIR / f"{user_id}.json"
        self._data = self._load()

    # ---- 持久化 ----

    def _load(self) -> Dict[str, Any]:
        if self.file.exists():
            try:
                with open(self.file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
            except (json.JSONDecodeError, IOError):
                pass
        return {"state": dict(DEFAULT_STATE), "history": []}

    def _save(self) -> None:
        with open(self.file, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=2)

    # ---- 状态画像 ----

    def load_state(self) -> Dict[str, Any]:
        state = dict(DEFAULT_STATE)
        state.update(self._data.get("state", {}))
        return state

    def merge_state(self, new_state: Dict[str, Any]) -> Dict[str, Any]:
        """合并观察者输出的新状态：标量覆盖、列表合并去重、交互次数递增"""
        existing = self.load_state()

        for key in ["mood", "energy_level", "key_point", "behavior_pattern"]:
            value = new_state.get(key)
            if value:
                existing[key] = value

        for key in ["interests", "concerns"]:
            new_list = new_state.get(key, [])
            old_list = existing.get(key, [])
            if new_list:
                existing[key] = list(dict.fromkeys(old_list + new_list))

        existing["interaction_count"] = existing.get("interaction_count", 0) + 1

        self._data["state"] = existing
        self._save()
        return existing

    # ---- 对话历史 ----

    def load_history(self) -> List[Dict[str, str]]:
        history = self._data.get("history", [])
        return history if isinstance(history, list) else []

    def append_history(self, user_msg: str, assistant_msg: str) -> None:
        history = self.load_history()
        history.append({"user": user_msg, "assistant": assistant_msg[:200]})
        self._data["history"] = history[-MAX_HISTORY_ROUNDS:]
        self._save()

    def format_history_context(self) -> str:
        """将历史对话格式化为提示词上下文"""
        history = self.load_history()
        if not history:
            return "暂无历史对话记录。"

        lines = ["### 历史对话记录（最近几轮）"]
        for i, h in enumerate(history, 1):
            lines.append(f"第{i}轮 - 用户: {h.get('user', '')}")
            lines.append(f"      小伴: {h.get('assistant', '')[:100]}")
        return "\n".join(lines)
