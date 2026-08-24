"""POST /api/ai/rag/query — 从用户个人向量库检索相关内容"""

from fastapi import APIRouter

from api.models import RagQueryRequest, fail, ok
from core.vector_store import get_user_vector_store

router = APIRouter()


@router.post("/rag/query")
def rag_query(req: RagQueryRequest):
    try:
        store = get_user_vector_store(req.userId)
        results = store.retrieve(req.query, req.topK)
        return ok({"results": results})
    except Exception as exc:  # noqa: BLE001
        return fail(str(exc), 500)
