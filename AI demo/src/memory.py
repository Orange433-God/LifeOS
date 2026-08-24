"""
对话记忆管理模块
负责对话历史的持久化、学习画像的累积和更新，实现"随学随新"。
"""

import json
import os
from typing import Dict, List, Optional

# 记忆文件存储路径
MEMORY_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "memory",
)
PROFILE_FILE = os.path.join(MEMORY_DIR, "student_profile.json")
HISTORY_FILE = os.path.join(MEMORY_DIR, "conversation_history.json")

# 默认画像模板（6+ 维度）
DEFAULT_PROFILE = {
    "knowledge_level": "未知",          # 知识基础
    "weak_points": [],                   # 薄弱环节
    "learning_goal": "",                 # 学习目标
    "cognitive_style": "综合型",         # 认知风格
    "teaching_strategy": "",             # 推荐教学策略
    "current_topic": "",                 # 当前知识点
    "mastered_topics": [],               # 已掌握知识点（累积）
    "learning_progress": 0,              # 学习进度（0-100）
    "interaction_count": 0,              # 交互次数
    "recent_interests": [],              # 近期兴趣方向
}


class MemoryManager:
    """对话记忆管理器
    管理学生画像的跨轮次累积和对话历史持久化。
    """

    def __init__(self):
        os.makedirs(MEMORY_DIR, exist_ok=True)

    # ---- 画像管理 ----

    def load_profile(self) -> dict:
        """加载已有画像，不存在则返回默认"""
        if os.path.exists(PROFILE_FILE):
            try:
                with open(PROFILE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return dict(DEFAULT_PROFILE)

    def save_profile(self, profile: dict):
        """保存更新后的画像"""
        # 确保所有默认字段存在
        merged = dict(DEFAULT_PROFILE)
        merged.update(profile)
        # 注：交互次数在 merge_profile() 中已经递增，此处不再重复
        # save_profile 仅负责持久化
        with open(PROFILE_FILE, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

    def merge_profile(self, new_profile: dict) -> dict:
        """将新画像合并到已有画像中

        策略：新信息覆盖旧信息，列表字段合并去重
        """
        existing = self.load_profile()

        # 标量字段：新值不为空时覆盖
        for key in ["knowledge_level", "learning_goal", "cognitive_style",
                     "teaching_strategy", "current_topic"]:
            new_val = new_profile.get(key)
            if new_val and new_val != "未知":
                existing[key] = new_val

        # 列表字段：合并去重
        for key in ["weak_points", "mastered_topics", "recent_interests"]:
            new_list = new_profile.get(key, [])
            old_list = existing.get(key, [])
            if new_list:
                combined = list(dict.fromkeys(old_list + new_list))  # 去重保持顺序
                existing[key] = combined

        # 进度推进
        existing["learning_progress"] = min(
            100, existing.get("learning_progress", 0) + 5
        )
        # 交互次数递增
        existing["interaction_count"] = existing.get("interaction_count", 0) + 1

        return existing

    # ---- 对话历史管理 ----

    def load_history(self) -> List[Dict]:
        """加载历史对话（最近 10 轮）"""
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return []

    def append_history(self, user_msg: str, assistant_msg: str):
        """追加一轮对话到历史"""
        history = self.load_history()
        history.append({
            "user": user_msg,
            "assistant": assistant_msg[:200],  # 只存前200字，节省 token
        })
        # 只保留最近 10 轮
        history = history[-10:]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def format_history_context(self) -> str:
        """将历史对话格式化为提示词上下文"""
        history = self.load_history()
        if not history:
            return "暂无历史对话记录。"

        lines = ["### 历史对话记录（最近几轮）"]
        for i, h in enumerate(history, 1):
            lines.append(f"第{i}轮 - 学生: {h['user']}")
            lines.append(f"      助手: {h['assistant'][:100]}...")
        return "\n".join(lines)

    # ---- 重置 ----

    def reset(self):
        """重置所有记忆"""
        if os.path.exists(PROFILE_FILE):
            os.remove(PROFILE_FILE)
        if os.path.exists(HISTORY_FILE):
            os.remove(HISTORY_FILE)
