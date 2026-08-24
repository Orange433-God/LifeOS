# Vector_Search.py
import os
import fitz  # PyMuPDF
from langchain_community.document_loaders.base import BaseLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from sentence_transformers import SentenceTransformer


# ---------- 自定义包装类（保持不变）----------
class SentenceTransformerWrapper:
    def __init__(self, model_name):
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts):
        return self.model.encode(texts, convert_to_numpy=True).tolist()

    def embed_query(self, text):
        return self.model.encode(text, convert_to_numpy=True).tolist()


# ---------- 自定义 PDF 加载器 ----------
class SimplePDFLoader(BaseLoader):
    """用 PyMuPDF 提取 PDF 文本，并将图片区域标记为占位符"""

    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self):
        doc = fitz.open(self.file_path)
        documents = []
        for page_num, page in enumerate(doc):
            # 1. 提取纯文本（含可复制文字、文本式公式）
            text = page.get_text()

            # 2. 提取图片信息（只标记位置，不调用 API）
            image_infos = page.get_image_info()
            for img in image_infos:
                bbox = img['bbox']
                # 在文本末尾添加占位符，描述图片位置和大小
                text += f"\n[图片占位符: 坐标({bbox[0]:.0f},{bbox[1]:.0f},{bbox[2]:.0f},{bbox[3]:.0f})]\n"

            # 3. 合并成一页的文档块（也可以后续用分割器再切）
            if text.strip():
                documents.append(Document(
                    page_content=text,
                    metadata={"source": self.file_path, "page": page_num}
                ))
        return documents


# ---------- 主流程 ----------
if __name__ == "__main__":
    # --- 1. 加载 PDF（替换原来的 TXT 路径）---
    pdf_path = r"C:\Users\33659\Desktop\SEA论文评审.pdf"  # 改成你实际上传的 PDF 文件名
    loader = SimplePDFLoader(pdf_path)
    documents = loader.load()
    print(f"✅ 从 PDF 加载了 {len(documents)} 页文档")

    # --- 2. 分割 ---
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=30)
    docs = text_splitter.split_documents(documents)
    print(f"✅ 文档已分割为 {len(docs)} 个块")

    #查看图片是否变成占位符存在
    placeholder_blocks = [doc for doc in docs if "图片占位符" in doc.page_content]
    print(f"含有图片占位符的块数量: {len(placeholder_blocks)}")
    if placeholder_blocks:
        print("图片位置:", placeholder_blocks[0].page_content[:200])
    # --- 3. 加载嵌入模型 ---
    print("⏳ 加载嵌入模型...")
    embedding_model = SentenceTransformerWrapper(r'C:\Users\33659\.cache\huggingface\hub\models--sentence-transformers--all-MiniLM-L6-v2\snapshots\1110a243fdf4706b3f48f1d95db1a4f5529b4d41')
    print("✅ 嵌入模型加载完成")

    # --- 4. 创建向量库 ---
    vectorstore = Chroma.from_documents(docs, embedding=embedding_model)
    print("✅ 向量数据库创建完成")

    # --- 5. 检索验证（换成跟公式/图片相关的查询）---
    # 如果你 PDF 里有个二次公式，就搜“一元二次方程”或具体符号试试
    query = "ytrue"
    results = vectorstore.similarity_search_with_score(query, k=3)

    print(f"\n📝 查询: '{query}'")
    for idx, (doc, score) in enumerate(results):
        # 展示找到的文本片段

        snippet = doc.page_content[:150].replace('\n', ' ')
        print(f"  [{idx + 1}] 相似度: {score:.4f}")
        print(f"       内容: {snippet}...")
        print(f"       来源页: {doc.metadata.get('page', '?')}")