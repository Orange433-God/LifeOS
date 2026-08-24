"""
向量存储模块（改造）
使用 LangChain + Chroma，按 userId 隔离：每个用户一个独立 collection（user_{userId}）。
嵌入使用 Chroma 内置 ONNX 模型（all-MiniLM-L6-v2），无需外部 API。
"""

import re
from typing import Dict, List

from chromadb.utils import embedding_functions
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import CHROMA_DB_DIR, CHUNK_OVERLAP, CHUNK_SIZE, RETRIEVAL_TOP_K

_USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_COLLECTION_PREFIX = "user_"


class EmbeddingFunction:
    """Chroma 内置嵌入模型封装（ONNX Runtime 运行 all-MiniLM-L6-v2，完全离线）"""

    def __init__(self) -> None:
        self._ef = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._ef(texts)  # type: ignore[return-value]

    def embed_query(self, query: str) -> List[float]:
        return self._ef([query])[0]  # type: ignore[return-value]


class UserVectorStore:
    """单个用户的向量库：封装其专属 Chroma collection"""

    def __init__(self, user_id: str) -> None:
        if not _USER_ID_PATTERN.match(user_id):
            raise ValueError("userId 只能包含字母、数字、-、_，且不超过 64 位")
        self.user_id = user_id
        self.collection_name = f"{_COLLECTION_PREFIX}{user_id}"
        self._embeddings = EmbeddingFunction()
        self._store = Chroma(
            embedding_function=self._embeddings,
            persist_directory=str(CHROMA_DB_DIR),
            collection_name=self.collection_name,
        )
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n--- ", "\n## ", "\n### ", "\n", "。", " ", ""],
        )

    def add_document(self, content: str, source_name: str) -> int:
        """把文档内容分块加入该用户的向量库

        Returns:
            添加的文档块数量
        """
        texts = self._splitter.split_text(content)
        if not texts:
            return 0

        metadatas: List[Dict[str, object]] = [
            {"source": source_name, "type": "pdf", "chunk": i} for i in range(len(texts))
        ]
        ids = [f"{source_name}_{i}" for i in range(len(texts))]
        self._store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        return len(texts)

    def retrieve(self, query: str, k: int = RETRIEVAL_TOP_K) -> List[str]:
        """检索最相关的知识片段（collection 不存在时返回空列表）"""
        try:
            results = self._store.similarity_search(query, k=k)
            return [doc.page_content for doc in results]
        except Exception:
            # collection 尚未创建 / 嵌入初始化失败等，降级为空结果
            return []

    def retrieve_as_context(self, query: str, k: int = RETRIEVAL_TOP_K) -> str:
        """检索并将结果格式化为上下文文本"""
        results = self.retrieve(query, k)
        if not results:
            return "未检索到用户资料库中的相关内容。"

        parts = [f"[资料片段 {i}] {content}" for i, content in enumerate(results, 1)]
        return "\n".join(parts)

    def count(self) -> int:
        """当前 collection 中的文档块数量"""
        try:
            return self._store._collection.count()  # noqa: SLF001
        except Exception:
            return 0


# 进程内缓存：每个用户一个向量库实例
_store_cache: Dict[str, UserVectorStore] = {}


def get_user_vector_store(user_id: str) -> UserVectorStore:
    """获取（或创建）指定用户的向量库实例"""
    if user_id not in _store_cache:
        _store_cache[user_id] = UserVectorStore(user_id)
    return _store_cache[user_id]
