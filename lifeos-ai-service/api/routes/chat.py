"""POST /api/ai/chat — 核心对话接口（SSE 流式，真实打字机）

快速通道：单次流式 LLM 调用（deepseek-v4-flash），<reply> 标签增量解析，
边生成边推送 delta 事件，首字延迟数秒。
"""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.models import ChatRequest
from orchestrator import orchestrator

router = APIRouter()

# SSE 事件约定：
#   data: {"type":"delta","content":"..."}                      — 回复文本增量（真实流式）
#   data: {"type":"done","payload":{"success":true,"data":{...}}} — 完整结果（统一格式）
#   data: {"type":"error","payload":{"success":false,...}}        — 错误（统一格式）


@router.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    """接收 userId + message + context，返回 AI 流式响应"""

    def generate():
        try:
            for event in orchestrator.chat_stream(
                user_id=req.userId,
                message=req.message,
                context=req.context.model_dump() if req.context else None,
            ):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as exc:  # noqa: BLE001 — 所有异常统一为 LifeOS 风格错误
            payload = {"success": False, "data": None, "message": str(exc)}
            yield f"data: {json.dumps({'type': 'error', 'payload': payload}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
