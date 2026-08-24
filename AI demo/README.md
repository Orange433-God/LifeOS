# 📚 AI 学习助手 — 多智能体个性化教学系统

> 软件杯参赛项目 · 多智能体协同 · 个性化学习资源生成

---

## 项目简介

本系统是一个基于 **CrewAI + 讯飞星火大模型** 的多智能体教学辅助平台，能够通过多轮对话动态构建学生画像，自动生成个性化教学资源、学习路径和测评题目。

### 核心功能

| 功能 | 说明 |
|:-----|:------|
| 🤖 **多智能体协同** | 4 个智能体串联：学情分析 → 资源生成 → 路径规划 → 测评批改 |
| 👤 **动态学习画像** | 8 维度画像（知识水平/薄弱环节/认知风格/已掌握等），随学随新 |
| 📄 **PDF 教材解析** | 上传教材 PDF，自动解析文字+图表位置，建立向量索引 |
| 🔍 **RAG 知识检索** | Chroma 向量库 + 本地嵌入模型，离线运行，无需外部 API |
| 🌳 **知识树导航** | 从教材自动生成知识图谱，标记已学/未学节点 |
| 📝 **流式输出** | 打字机效果逐字显示，提升交互体验 |

### 系统架构

```
┌──────────────────────────────────────────────────┐
│  app.py (Streamlit 前端)                          │
├──────────────────────────────────────────────────┤
│  orchestrator.py (CrewAI 编排器)                  │
│    ├─ Agent 1: 教学分析师  → 学习画像              │
│    ├─ Agent 2: 资源设计师  → 教学内容 + RAG 检索    │
│    ├─ Agent 3: 学习导航师  → 学习路径              │
│    └─ Agent 4: 评阅导师    → 测评批改              │
├──────────────────────────────────────────────────┤
│  vector_store.py (LangChain + Chroma 向量库)      │
│  pdf_processor.py (PyMuPDF 解析 + 多模态融合)      │
│  knowledge_graph.py (知识树构建)                   │
│  memory.py (对话记忆 + 画像持久化)                 │
├──────────────────────────────────────────────────┤
│  模型层：讯飞星火 API (OpenAI 兼容格式)             │
└──────────────────────────────────────────────────┘
```

---

## 快速开始

### 环境要求

- Python 3.10+
- Windows / macOS / Linux
- 讯飞星火 API Key（如无则自动使用演示模式）

### 安装部署

```bash
# 1. 解压项目
unzip softwarecup.zip
cd softwarecup

# 2. 安装依赖
pip install -r requirements.txt

# 3. （可选）配置 API Key
#    复制 .env.example 为 .env，填入你的讯飞星火 Key
cp .env.example .env
#    编辑 .env 文件:
#    OPENAI_API_KEY=你的APPID:你的APISecret
#    OPENAI_BASE_URL=https://spark-api-open.xf-yun.com/v1
#    LLM_MODEL_NAME=lite

# 4. 启动应用
streamlit run app.py

# 或直接双击 start.bat（Windows）
```

### 访问

启动后浏览器打开 **http://localhost:8501**

---

## 使用说明

### 第一步：初始化知识库

点击侧边栏 **「🔧 初始化」** 按钮，系统会：

1. 读取 `data/knowledge_base/` 下的 6 章《人工智能导论》Markdown 教材
2. 使用 Chroma 内置 ONNX 模型进行文本分块和向量化
3. 构建可检索的知识索引（约 10 秒）

### 第二步：开始提问

在对话框输入学习问题，例如：

| 问题类型 | 示例 |
|:---------|:-----|
| 知识点讲解 | "什么是深度学习？" |
| 练习题生成 | "出几道机器学习的题" |
| 学习路径规划 | "我想学 NLP，该按什么顺序？" |
| 多轮追问 | "再讲详细一点"（画像会记住上下文） |

### 第三步：上传 PDF（可选）

侧边栏上传教材 PDF（含图表效果更佳），系统自动：

1. 提取每页文字内容
2. 检测图片/图表位置并标记占位符
3. 将融合后的文本加入向量索引
4. 在知识树中展示 PDF 章节

> 如有 `generalv3.5` / `4.0Ultra` 等支持 vision 的模型，会自动调用多模态 API 描述图表内容。

---

## 项目结构

```
softwarecup/
├── app.py                     # Streamlit 主程序
├── start.bat                  # Windows 一键启动
├── requirements.txt           # 依赖清单
├── .env.example               # API Key 配置模板
├── README.md                  # 本文件
│
├── src/
│   ├── config.py              # 统一配置
│   ├── orchestrator.py        # 多智能体编排器
│   ├── vector_store.py        # 向量检索模块
│   ├── pdf_processor.py       # PDF 多模态解析
│   ├── knowledge_graph.py     # 知识树生成
│   ├── memory.py              # 对话记忆管理
│   ├── mock_orchestrator.py   # 演示模式（无 API Key 时）
│   │
│   └── agents/
│       ├── profile_agent.py     # Agent 1: 学习画像
│       ├── resource_agent.py    # Agent 2: 资源生成
│       ├── path_agent.py        # Agent 3: 路径规划
│       └── assessment_agent.py  # Agent 4: 测评批改
│
├── data/
│   ├── knowledge_base/        # 纯文本教材（6章）
│   │   ├── 1-人工智能概述.md
│   │   ├── 2-机器学习基础.md
│   │   ├── 3-深度学习基础.md
│   │   ├── 4-自然语言处理.md
│   │   ├── 5-计算机视觉.md
│   │   └── 6-知识表示与推理.md
│   ├── chroma_db/             # 向量数据库（自动生成）
│   └── memory/                # 画像和对话历史（自动生成）
│
└── part/                      # 组员实验文件
    ├── API_connection_test.py
    ├── craw_test.py
    ├── VectorSearch_pdf.py
    ├── VectorSearch_pdfpicture.py
    ├── VectorSearch_wordonly.py
    └── web_page.py
```

---

## 配置说明

### `.env` 文件

```ini
# LLM API 配置 - 讯飞星火 (OpenAI 兼容格式)
OPENAI_API_KEY=你的APPID:你的APISecret
OPENAI_BASE_URL=https://spark-api-open.xf-yun.com/v1
LLM_MODEL_NAME=lite
```

### 模型选择

| 模型名 | 说明 | 可用性 |
|:-------|:-----|:------|
| `lite` | 轻量版，速度最快 | 默认可用 |
| `generalv3.5` | Spark Max，支持多模态 | 需在讯飞控制台开通 |
| `4.0Ultra` | Spark 4.0，最强模型 | 需在讯飞控制台开通 |

> 修改 `.env` 中的 `LLM_MODEL_NAME` 即可切换模型。

### 演示模式

**无需任何 API Key**，系统自动使用 `mock_orchestrator.py` 中的预设模板数据，可完整展示前端 UI 和交互流程。

---

## 技术栈

| 组件 | 技术选型 | 说明 |
|:-----|:---------|:-----|
| 前端框架 | Streamlit | Python 原生，快速构建 AI 应用 |
| 智能体编排 | CrewAI | 多 Agent 任务编排与通信 |
| 向量存储 | Chroma | 本地向量数据库，无需部署 |
| 文本嵌入 | all-MiniLM-L6-v2 (ONNX) | Chroma 内置，完全离线 |
| PDF 解析 | PyMuPDF (fitz) | 文字提取 + 页面渲染 |
| 大模型 | 讯飞星火 API | OpenAI 兼容格式 |
| 可视化 | ECharts | 知识树渲染 |

---

## 许可

本项目仅用于软件杯竞赛，代码仅供学习参考。

