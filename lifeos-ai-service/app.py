"""
LifeOS AI 伙伴微服务入口（FastAPI）
原 Streamlit 教育助手重构为独立 RESTful 微服务，供 LifeOS Node.js 后端调用。
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import chat, insight, pdf, rag
from config import CHROMA_DB_DIR, CORS_ORIGINS, LLM_MODEL_NAME, MEMORY_DIR, VL_MODEL_NAME


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 启动时确保数据目录存在
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="LifeOS AI Companion Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/ai/health")
async def health():
    """健康检查（不触发任何 LLM 调用）"""
    return {
        "success": True,
        "message": "LifeOS AI Service 运行中",
        "data": {"llmModel": LLM_MODEL_NAME, "vlModel": VL_MODEL_NAME},
    }


app.include_router(chat.router, prefix="/api/ai", tags=["chat"])
app.include_router(rag.router, prefix="/api/ai", tags=["rag"])
app.include_router(pdf.router, prefix="/api/ai", tags=["pdf"])
app.include_router(insight.router, prefix="/api/ai", tags=["insight"])
