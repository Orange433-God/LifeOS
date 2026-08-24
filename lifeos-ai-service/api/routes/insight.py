"""POST /api/ai/insight/generate — 生成周报/月报形式的人生洞察"""

from fastapi import APIRouter

from api.models import InsightRequest, fail, ok
from orchestrator import orchestrator

router = APIRouter()


@router.post("/insight/generate")
def generate_insight(req: InsightRequest):
    try:
        result = orchestrator.generate_insight(
            user_id=req.userId,
            period=req.period,
            context=req.context.model_dump() if req.context else None,
        )
        return ok(result, "人生洞察已生成")
    except Exception as exc:  # noqa: BLE001
        return fail(str(exc), 500)
