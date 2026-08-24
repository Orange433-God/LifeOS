"""Pydantic 请求/响应模型与统一响应格式（与 LifeOS 风格一致）"""

from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


# ---- 统一响应格式 ----

def ok(data: Any = None, message: str = "ok") -> Dict[str, Any]:
    body: Dict[str, Any] = {"success": True}
    if data is not None:
        body["data"] = data
    body["message"] = message
    return body


def fail(message: str, status: int = 400) -> Tuple[Dict[str, Any], int]:
    return {"success": False, "message": message}, status


# ---- 请求模型 ----


class ChatContext(BaseModel):
    nickname: str = ""
    attributes: Dict[str, float] = Field(default_factory=dict)
    recentRecords: List[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    userId: str
    message: str
    context: Optional[ChatContext] = None


class RagQueryRequest(BaseModel):
    userId: str
    query: str
    topK: int = Field(default=5, ge=1, le=20)


class InsightRequest(BaseModel):
    userId: str
    period: str = Field(default="weekly", pattern="^(weekly|monthly)$")
    context: Optional[ChatContext] = None
