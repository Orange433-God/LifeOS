"""
配置管理模块
从环境变量读取 API 密钥和模型配置，支持 OpenAI 兼容格式
"""

import os

# 加载 .env 文件
from dotenv import load_dotenv

load_dotenv()

# LLM 配置 - 讯飞星火 (OpenAI 兼容格式)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv(
    "OPENAI_BASE_URL", "https://spark-api-open.xf-yun.com/v1"
)
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "openai/lite")

# 设置环境变量，供 litellm / CrewAI 读取讯飞 API 配置
os.environ.setdefault("OPENAI_API_KEY", OPENAI_API_KEY)
os.environ.setdefault("OPENAI_BASE_URL", OPENAI_BASE_URL)
os.environ.setdefault("OPENAI_API_BASE", OPENAI_BASE_URL)  # litellm 兼容

# 模型名字符串，供 Agent 使用（由 CrewAI/litellm 内部创建 LLM 对象）
LLM_MODEL_STRING = LLM_MODEL_NAME

# 知识库路径
KNOWLEDGE_BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "knowledge_base",
)
CHROMA_DB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "chroma_db",
)

# 检索配置
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
RETRIEVAL_TOP_K = 4
