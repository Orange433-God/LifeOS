"""
统一配置管理
从环境变量读取 DeepSeek API 配置（OpenAI 兼容格式），
并同步写入 OPENAI_* 环境变量，供 LangChain / CrewAI 直接使用。
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# DeepSeek 兼容 OpenAI 格式，LangChain 的 ChatOpenAI / CrewAI 可直接使用
os.environ["OPENAI_API_KEY"] = os.getenv("DEEPSEEK_API_KEY", "")
os.environ["OPENAI_BASE_URL"] = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
os.environ.setdefault("OPENAI_API_BASE", os.environ["OPENAI_BASE_URL"])  # litellm 兼容

# 静默 CrewAI 遥测日志
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "deepseek-chat")
VL_MODEL_NAME = os.getenv("VL_MODEL_NAME", "deepseek-vl")
# 对话快速通道使用的模型（低延迟优先，deepseek-v4-flash 为平台快速模型）
FAST_CHAT_MODEL = os.getenv("FAST_CHAT_MODEL", "deepseek-v4-flash")

# CrewAI/litellm 使用的模型字符串：openai/ 前缀走 OpenAI 兼容协议，
# 配合 OPENAI_BASE_URL 环境变量指向 DeepSeek 端点（原项目同款适配方式）
LLM_MODEL_STRING = f"openai/{LLM_MODEL_NAME}"

# 数据目录
DATA_DIR = BASE_DIR / "data"
CHROMA_DB_DIR = DATA_DIR / "chroma_db"
MEMORY_DIR = DATA_DIR / "memory"

# 检索配置
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "4"))

# 对话记忆
MAX_HISTORY_ROUNDS = int(os.getenv("MAX_HISTORY_ROUNDS", "10"))

# 服务
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4000")


def ensure_api_key() -> None:
    """调用 LLM 前校验 API Key，缺失时抛出明确错误"""
    if not DEEPSEEK_API_KEY or DEEPSEEK_API_KEY.startswith("sk-your-"):
        raise RuntimeError("未配置 DEEPSEEK_API_KEY，请在 lifeos-ai-service/.env 中填写 DeepSeek API Key")


def get_llm(temperature: float = 0.7):
    """返回指向 DeepSeek 端点的 ChatOpenAI 实例（懒加载）"""
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=LLM_MODEL_NAME,
        api_key=DEEPSEEK_API_KEY or "missing",
        base_url=DEEPSEEK_BASE_URL,
        temperature=temperature,
        timeout=120,
    )
