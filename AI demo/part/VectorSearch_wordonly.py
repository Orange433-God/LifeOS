# VectorSearch_wordonly.py
import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from sentence_transformers import SentenceTransformer


# ---------- 自定义包装类 ----------
class SentenceTransformerWrapper:
    def __init__(self, model_name):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts):
        # Chroma 调用此方法将多个文档文本转为向量
        return self.model.encode(texts, convert_to_numpy=True).tolist()

    def embed_query(self, text):
        # Chroma 调用此方法将单个查询文本转为向量
        return self.model.encode(text, convert_to_numpy=True).tolist()


# ---------- 包装类结束 ----------

# --- 1. 准备文档 ---
loader = TextLoader("./岁月是朵两生花.txt", encoding="utf-8")
documents = loader.load()

# --- 2. 分割 ---
text_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
docs = text_splitter.split_documents(documents)
print(f"✅ 文档已分割为 {len(docs)} 个块")

# --- 3. 加载嵌入模型（使用包装类）---
print("⏳ 加载嵌入模型...")
embedding_model = SentenceTransformerWrapper('all-MiniLM-L6-v2')
print("✅ 嵌入模型加载完成")

# --- 4. 创建向量库（传入包装类实例）---
vectorstore = Chroma.from_documents(docs, embedding=embedding_model)
print("✅ 向量数据库创建完成")

# --- 5. 检索验证 ---
query = "青年才俊"
results = vectorstore.similarity_search_with_score(query, k=2)

print(f"\n📝 查询: '{query}'")
for idx, (doc, score) in enumerate(results):
    print(f"  [{idx + 1}] 内容: {doc.page_content[:60]}... (相似度: {score:.4f})")

print("✅ 验证三完成")