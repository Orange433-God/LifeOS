"""
人生兴趣/经历图谱（改造：原「知识树」→ 兴趣/经历图谱）
把用户对话中出现的兴趣与经历沉淀为轻量节点-边图，按 userId 持久化为 JSON。
用于后续洞察生成与「人生大盘」可视化（节点权重 = 出现次数）。
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import DATA_DIR

GRAPH_DIR = DATA_DIR / "graphs"
_USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class LifeGraph:
    """单用户的人生兴趣/经历图谱"""

    def __init__(self, user_id: str) -> None:
        if not _USER_ID_PATTERN.match(user_id):
            raise ValueError("userId 只能包含字母、数字、-、_，且不超过 64 位")
        self.user_id = user_id
        GRAPH_DIR.mkdir(parents=True, exist_ok=True)
        self.file: Path = GRAPH_DIR / f"{user_id}.json"
        self._data = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.file.exists():
            try:
                with open(self.file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
            except (json.JSONDecodeError, IOError):
                pass
        return {"nodes": {}, "edges": [], "last_topic": None}

    def _save(self) -> None:
        with open(self.file, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=2)

    # ---- 记录 ----

    def _record(self, topic: str, kind: str, detail: str = "") -> None:
        nodes: Dict[str, Dict[str, Any]] = self._data["nodes"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if topic in nodes:
            node = nodes[topic]
            node["weight"] = node.get("weight", 1) + (2 if kind == "experience" else 1)
            node["last_seen"] = today
        else:
            nodes[topic] = {
                "name": topic,
                "kind": kind,
                "weight": 2 if kind == "experience" else 1,
                "first_seen": today,
                "last_seen": today,
                "detail": detail[:200],
            }

        # 边：与上一个话题建立共现关联（同轮对话内）
        last_topic = self._data.get("last_topic")
        if last_topic and last_topic != topic:
            edge = {"source": last_topic, "target": topic}
            if edge not in self._data["edges"]:
                self._data["edges"].append(edge)
        self._data["last_topic"] = topic
        self._save()

    def record_interest(self, topic: str, detail: str = "") -> None:
        self._record(topic, "interest", detail)

    def record_experience(self, topic: str, detail: str = "") -> None:
        self._record(topic, "experience", detail)

    # ---- 查询 ----

    def top_interests(self, n: int = 5) -> List[Dict[str, Any]]:
        """按权重返回最热门的兴趣/经历节点"""
        nodes = list(self._data["nodes"].values())
        nodes.sort(key=lambda node: node.get("weight", 0), reverse=True)
        return nodes[:n]

    def view(self) -> Dict[str, Any]:
        """输出节点-边视图（供前端「人生大盘」渲染）"""
        return {
            "nodes": [
                {"name": node["name"], "kind": node.get("kind", "interest"), "weight": node.get("weight", 1)}
                for node in self._data["nodes"].values()
            ],
            "edges": list(self._data["edges"]),
        }
