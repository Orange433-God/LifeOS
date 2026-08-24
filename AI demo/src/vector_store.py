"""
向量存储模块
使用 LangChain + Chroma 构建知识库向量索引
嵌入使用 Chroma 内置的 ONNX 模型(all-MiniLM-L6-v2)，无需下载、无需API
"""

import os
from typing import List, Tuple

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import Chroma

from chromadb.utils import embedding_functions

from src.config import (
    KNOWLEDGE_BASE_DIR,
    CHROMA_DB_DIR,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    RETRIEVAL_TOP_K,
)


class EmbeddingFunction:
    """Chroma 内置嵌入模型封装
    使用 ONNX Runtime 运行 all-MiniLM-L6-v2，完全离线
    """

    def __init__(self):
        self._ef = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._ef(texts)  # type: ignore

    def embed_query(self, query: str) -> List[float]:
        return self._ef([query])[0]  # type: ignore


class VectorStore:
    """向量知识库管理器
    使用 Chroma 内置 ONNX 嵌入模型，完全离线运行
    """

    def __init__(self):
        self._embeddings = EmbeddingFunction()
        self._vector_store = None

    def build_knowledge_base(self) -> int:
        """从知识库目录加载文档，构建/重建向量索引

        Returns:
            处理的文档块数量
        """
        # 加载所有 .md 文件
        documents = []
        for filename in sorted(os.listdir(KNOWLEDGE_BASE_DIR)):
            if filename.endswith(".md"):
                filepath = os.path.join(KNOWLEDGE_BASE_DIR, filename)
                loader = TextLoader(filepath, encoding="utf-8")
                documents.extend(loader.load())

        if not documents:
            raise ValueError(f"知识库目录 {KNOWLEDGE_BASE_DIR} 中没有找到 .md 文件")

        # 文本分块
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n## ", "\n### ", "\n#### ", "\n", "。", " ", ""],
        )
        chunks = text_splitter.split_documents(documents)

        print(f"文档分块完成，共 {len(chunks)} 个块，正在构建向量索引...")

        # 使用 Chroma 的 from_documents 但绕过其 embedding 参数
        # 直接在 Chroma 初始化后添加文档
        self._vector_store = Chroma(
            embedding_function=self._embeddings,
            persist_directory=CHROMA_DB_DIR,
        )

        # 分批添加文档
        texts = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        self._vector_store.add_texts(
            texts=texts,
            metadatas=metadatas,
            ids=ids,
        )

        return len(chunks)

    def load_knowledge_base(self) -> bool:
        """加载已有向量索引

        Returns:
            是否成功加载
        """
        if not os.path.exists(CHROMA_DB_DIR):
            return False

        try:
            self._vector_store = Chroma(
                embedding_function=self._embeddings,
                persist_directory=CHROMA_DB_DIR,
            )
            return True
        except Exception:
            return False

    def build_from_pdf(
        self, pdf_path: str, source_name: str = None
    ) -> int:
        """解析 PDF 并将内容加入向量索引

        按技术文档三步方案：渲染→多模态→融合
        当前账号仅 lite 模型时，自动使用占位符降级。

        Args:
            pdf_path: PDF 文件路径
            source_name: 来源名称（默认用文件名）

        Returns:
            添加的文档块数量
        """
        from src.pdf_processor import PDFProcessor
        from src.config import OPENAI_API_KEY, OPENAI_BASE_URL, LLM_MODEL_NAME

        if source_name is None:
            source_name = os.path.basename(pdf_path)

        # 解析 PDF（渲染+多模态API+融合）
        merged_text, _ = PDFProcessor.process(
            pdf_path=pdf_path,
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            vision_model=LLM_MODEL_NAME,
        )

        # 创建 Document 对象
        from langchain_core.documents import Document
        doc = Document(
            page_content=merged_text,
            metadata={"source": source_name, "type": "pdf"},
        )

        # 文本分块
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n--- ", "\n## ", "\n### ", "\n", "。", " ", ""],
        )
        chunks = text_splitter.split_documents([doc])

        # 确保 Chroma 已初始化
        if self._vector_store is None:
            self._vector_store = Chroma(
                embedding_function=self._embeddings,
                persist_directory=CHROMA_DB_DIR,
            )

        # 添加文档块
        texts = [chunk.page_content for chunk in chunks]
        metadatas = [{"source": source_name, "type": "pdf", "chunk": i}
                     for i in range(len(chunks))]
        ids = [f"pdf_{source_name}_{i}" for i in range(len(chunks))]
        self._vector_store.add_texts(
            texts=texts,
            metadatas=metadatas,
            ids=ids,
        )

        return len(chunks)

    def retrieve(self, query: str, k: int = None) -> List[Tuple[str, float]]:
        """检索与查询最相关的知识片段

        Args:
            query: 查询文本
            k: 返回结果数量，默认使用配置值

        Returns:
            (文档内容, 相关性分数) 列表
        """
        if self._vector_store is None:
            raise RuntimeError("向量存储未初始化，请先调用 build_knowledge_base() 或 load_knowledge_base()")

        k = k or RETRIEVAL_TOP_K
        results = self._vector_store.similarity_search_with_relevance_scores(
            query, k=k
        )

        return [(doc.page_content, score) for doc, score in results]

    def retrieve_as_context(self, query: str, k: int = None) -> str:
        """检索并将结果格式化为上下文文本

        Args:
            query: 查询文本
            k: 返回结果数量

        Returns:
            格式化后的上下文文本
        """
        results = self.retrieve(query, k)

        if not results:
            return "未检索到相关知识。"

        context_parts = []
        for i, (content, score) in enumerate(results, 1):
            context_parts.append(
                f"[知识片段 {i}]（相关度: {score:.3f}）\n{content}\n"
            )

        return "\n".join(context_parts)

    @property
    def is_initialized(self) -> bool:
        """向量存储是否已初始化"""
        return self._vector_store is not None
