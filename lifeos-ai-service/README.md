# LifeOS AI 伙伴微服务（DeepSeek API 版）

由原 CrewAI + Streamlit 教育助手重构而来的独立 FastAPI 微服务，专供 LifeOS（Node.js 后端）调用。
核心变化：**移除 Streamlit UI → RESTful API**；**教学语境 → 人生陪伴/成长语境**；**多智能体编排保留，4 个 Agent 角色重定义**；**LLM 基座切换为 DeepSeek（OpenAI 兼容格式）**。

## 目录结构

```
lifeos-ai-service/
├── app.py                    # FastAPI 主入口（含健康检查）
├── config.py                 # 统一配置（DeepSeek 环境变量映射）
├── orchestrator.py           # CrewAI 编排器（chat / insight 两条流水线）
├── requirements.txt
├── .env / .env.example
├── agents/
│   ├── observer_agent.py     # Agent 1: 人生观察者（原教学分析师）
│   ├── memory_agent.py       # Agent 2: 记忆与建议生成器（原资源设计师）
│   ├── guide_agent.py        # Agent 3: 成长导航师（原路径规划师）
│   └── reflector_agent.py    # Agent 4: 反思导师（原测评批改）
├── core/
│   ├── vector_store.py       # Chroma 向量库（按 userId 隔离 collection）
│   ├── pdf_processor.py      # PDF 三步解析（渲染→DeepSeek-VL→锚点融合，含降级）
│   ├── memory_manager.py     # 对话记忆 + 画像（按 userId 持久化 JSON）
│   └── knowledge_graph.py    # 人生兴趣/经历图谱（原知识树改造）
├── api/
│   ├── models.py             # Pydantic 模型 + 统一响应格式
│   └── routes/               # chat / rag / pdf / insight
└── data/
    ├── chroma_db/            # 向量库（每用户独立 collection）
    └── memory/               # 用户记忆（{userId}.json）
```

## 配置

复制 `.env.example` 为 `.env`，填写 DeepSeek API Key：

```ini
DEEPSEEK_API_KEY=sk-你的-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL_NAME=deepseek-chat                    # 文本对话（deepseek-chat 为平台别名，可用）
VL_MODEL_NAME=deepseek-v4-flash-vision-exp      # 多模态（PDF 图表解析，可选）
```

> 模型名以 DeepSeek 平台**实际提供**的为准（2026-08 实测：`deepseek-chat` 作为别名可用，但 `deepseek-vl` 不存在；多模态模型为 `deepseek-v4-flash-vision-exp`）。可用 `models.list()` 查询。

DeepSeek 完全兼容 OpenAI 格式：`config.py` 会把 `DEEPSEEK_API_KEY`/`DEEPSEEK_BASE_URL` 写入 `OPENAI_*` 环境变量。CrewAI 内部经 litellm 转发，因此 Agent 使用 `openai/{模型名}` 前缀（原项目同款适配），配合 `OPENAI_BASE_URL` 指向 DeepSeek 端点，无需额外适配层。

## 启动

```bash
cd lifeos-ai-service
# 注意：必须 Python 3.10 或 3.11 —— chromadb 依赖的 chroma-hnswlib
# 没有 cp312+ 的 Windows 预编译 wheel，其他版本会触发源码编译（需 MSVC）
uv python install 3.11             # 或 py -3.11 -m venv .venv
uv venv --python 3.11 .venv
uv pip install -r requirements.txt --python .venv/Scripts/python.exe
.venv\Scripts\uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

> 本机验证环境：uv 管理的 CPython 3.11（Windows）；Python 3.12/3.14 均会因 chroma-hnswlib 无 wheel 而安装失败。

### 慢网络下预置嵌入模型（可选）

Chroma 首次使用时从 AWS S3 下载嵌入模型（all-MiniLM-L6-v2，79MB），国内直连可能极慢。
可将 hf-mirror 下载的 6 个文件放入 `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx/`，Chroma 检测到文件齐全即跳过下载：

```bash
mkdir -p ~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx && cd "$_"
for f in config.json tokenizer.json tokenizer_config.json special_tokens_map.json vocab.txt; do
  curl -sL -o "$f" "https://hf-mirror.com/sentence-transformers/all-MiniLM-L6-v2/resolve/main/$f"
done
curl -sL -o model.onnx "https://hf-mirror.com/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx"
```

## API

统一返回格式与 LifeOS 一致：`{ success: boolean, data?: any, message?: string }`

### 1. POST /api/ai/chat（核心，SSE 流式）

```json
{
  "userId": "uuid-string",
  "message": "我今天感觉很疲惫，不太想动",
  "context": {
    "nickname": "林然",
    "attributes": { "explore": 72, "learn": 60, "execute": 45, "create": 80, "health": 55, "connect": 65, "stable": 50 },
    "recentRecords": ["完成了产品设计作业", "阅读了设计心理学"]
  }
}
```

SSE 事件（打字机效果）：
- `data: {"type":"delta","content":"..."}` — 回复文本分块
- `data: {"type":"done","payload":{"success":true,"data":{"reply":"...","memoryUpdate":{"mood":"疲惫","keyPoint":"..."},"suggestedAction":"..."}}}` — 完整结果
- `data: {"type":"error","payload":{"success":false,"message":"..."}}` — 错误

### 2. POST /api/ai/rag/query

```json
{ "userId": "uuid", "query": "深度学习", "topK": 5 }
```
→ `{ "success": true, "data": { "results": ["片段1...", "片段2..."] } }`

### 3. POST /api/ai/pdf/upload（multipart/form-data）

`file` + `userId` → `{ "success": true, "data": { "chunksIndexed": 42, "imagesParsed": 3, "imagePages": 5 } }`

### 4. POST /api/ai/insight/generate

```json
{ "userId": "uuid", "period": "weekly" }
```
→ `{ "success": true, "data": { "summary": "...", "suggestions": ["..."], "roomSuggestion": { "addItem": "瑜伽垫", "changeLighting": "warm" } } }`

### 5. GET /api/ai/health — 健康检查

## 智能体编排

| 原 Agent | 新 Agent | LifeOS 职责 |
| --- | --- | --- |
| 教学分析师 | 人生观察者 | 分析情绪/行为模式/兴趣变化，生成「当前状态画像」 |
| 资源设计师 | 记忆与建议生成器 | 生成陪伴回复、记忆更新、行动建议（可调用用户 RAG 工具） |
| 路径规划师 | 成长导航师 | 结合七维属性生成阶段性成长方向与小步骤 |
| 测评批改 | 反思导师 | 周/月复盘，产出人生洞察与房间变化建议 |

- **chat 快速通道（默认）**：单次流式 LLM 调用（`deepseek-v4-flash`）+ `<reply>` 标签增量解析，
  融合了观察者与小伴的人设，边生成边推送真实 delta 事件——实测首字延迟 ~2.6s、总耗时 ~4s
- **chat 完整流水线（可选）**：观察者 → 记忆与建议生成器（CrewAI 2-Agent，`orchestrator.chat`，带 RAG 工具）
- **insight 流水线**：观察者(汇总) → 成长导航师 → 反思导师（3 个 Agent）

## PDF 多模态解析（DeepSeek-VL 三步方案）

1. PyMuPDF 将含图页渲染为 200DPI PNG
2. DeepSeek-VL 按编号输出图表描述 JSON（figure_id / description）
3. 正则匹配 `图N` / `Figure N` 引用，描述插入锚点后；无引用则附页尾

**容灾**：VL 未配置或调用失败 → 自动回退纯文本提取 + 图片占位符标记，基础功能可用。

## 数据隔离

- 对话记忆：`data/memory/{userId}.json`（状态画像 + 最近 10 轮历史）
- 向量库：每个用户独立 Chroma collection（`user_{userId}`）
- 兴趣图谱：`data/graphs/{userId}.json`（节点-边，节点权重 = 出现次数）
- userId 仅允许 `[A-Za-z0-9_-]{1,64}`，防路径穿越

## 与 LifeOS 对接计划（预留，暂未实现）

- LifeOS Node.js 后端新增 ai-service 模块，通过 axios 调用本服务
- LifeOS 前端 AI 伙伴 UI 保持，API 调用指向 Node.js 代理接口
