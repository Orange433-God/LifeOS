# LifeOS AI 伙伴微服务（FastAPI + DeepSeek + Chroma）
# 构建上下文 = 仓库根目录
FROM python:3.11-slim

WORKDIR /app

# onnxruntime（Chroma 嵌入模型）需要 libgomp
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY lifeos-ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY lifeos-ai-service ./

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
