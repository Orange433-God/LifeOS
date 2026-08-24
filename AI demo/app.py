"""
Streamlit 前端应用
多智能体学习助手 - 支持 PDF 上传解析 + 知识树可视化
"""

import os
import time
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

# ---------- 检查是否有 API Key ----------
HAS_API_KEY = bool(os.getenv("OPENAI_API_KEY", "").strip())

if HAS_API_KEY:
    from src.orchestrator import Orchestrator, format_final_answer
    from src.vector_store import VectorStore
else:
    from src.mock_orchestrator import MockOrchestrator, format_mock_answer

from src.memory import MemoryManager

# ---------- 页面配置 ----------
st.set_page_config(
    page_title="AI 学习助手 - 多智能体教学系统",
    page_icon="📚",
    layout="wide",
)

st.title("📚 AI 学习助手")
st.caption("多智能体协同 · 个性化学习资源生成系统 · 支持 PDF 教材上传与知识图谱")


# ---------- 流式渲染辅助函数 ----------
def stream_text(text: str, speed: float = 0.008):
    lines = text.split("\n")
    for i, line in enumerate(lines):
        for char in line:
            yield char
            time.sleep(speed)
        if i < len(lines) - 1:
            yield "\n"


if HAS_API_KEY:
    st.sidebar.success("🔵 真实模式（讯飞星火）")
else:
    st.sidebar.info("🟡 演示模式")


def init_session_state():
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "kb_ready" not in st.session_state:
        st.session_state.kb_ready = False
    if "memory" not in st.session_state:
        st.session_state.memory = MemoryManager()
    if "selected_topic" not in st.session_state:
        st.session_state.selected_topic = ""
    if "pdf_indexed" not in st.session_state:
        st.session_state.pdf_indexed = False
    if "pdf_tree" not in st.session_state:
        st.session_state.pdf_tree = None

    if HAS_API_KEY:
        if "vector_store" not in st.session_state:
            vs = VectorStore()
            st.session_state.vector_store = vs
        if "orch" not in st.session_state:
            st.session_state.orch = Orchestrator(st.session_state.vector_store)
    else:
        if "orch" not in st.session_state:
            st.session_state.orch = MockOrchestrator()


def initialize_knowledge_base():
    if not HAS_API_KEY:
        st.session_state.kb_ready = True
        return "演示模式: 知识库已就绪"

    vs = st.session_state.vector_store
    loaded = vs.load_knowledge_base()
    if loaded:
        st.session_state.kb_ready = True
        return "已加载已有知识库索引"
    try:
        chunk_count = vs.build_knowledge_base()
        st.session_state.kb_ready = True
        return f"知识库构建成功！共 {chunk_count} 个文档块"
    except Exception as e:
        st.session_state.kb_ready = False
        return f"知识库构建失败: {e}"


def render_sidebar():
    """渲染侧边栏"""
    with st.sidebar:
        # ----- 系统状态 -----
        st.header("⚙️ 系统状态")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔧 初始化", use_container_width=True):
                with st.spinner("构建中..."):
                    msg = initialize_knowledge_base()
                    st.success(msg)
        with col2:
            if st.button("🔄 重置记忆", use_container_width=True):
                st.session_state.memory.reset()
                st.rerun()

        kb_status = "✅ 就绪" if st.session_state.get("kb_ready") else "❌ 未初始化"
        st.metric("知识库", kb_status)

        # ----- PDF 上传 -----
        st.divider()
        st.header("📄 PDF 教材上传")
        uploaded_pdf = st.file_uploader(
            "上传教材 PDF（含图表的教材效果更佳）",
            type=["pdf"],
            label_visibility="collapsed",
        )
        if uploaded_pdf and HAS_API_KEY:
            pdf_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data",
                "uploads",
            )
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_path = os.path.join(pdf_dir, uploaded_pdf.name)
            with open(pdf_path, "wb") as f:
                f.write(uploaded_pdf.getbuffer())

            with st.spinner("正在解析 PDF（渲染+多模态分析+索引构建）..."):
                try:
                    count = st.session_state.vector_store.build_from_pdf(
                        pdf_path, source_name=uploaded_pdf.name
                    )
                    st.session_state.pdf_indexed = True
                    st.success(f"✅ PDF 解析完成！已添加 {count} 个知识块")

                    # 记录 PDF 章节到 session，供知识树显示
                    from src.pdf_processor import PDFProcessor
                    pages = PDFProcessor.extract_text_only(pdf_path)
                    pdf_tree = {
                        "name": uploaded_pdf.name,
                        "children": [
                            {"name": f"第{p['page']+1}页（{len(p['text'])}字）",
                             "itemStyle": {"color": "#E7E7E7"},
                             "children": [] if len(p['text']) < 100 else
                             [{"name": p['text'][:60] + "...",
                               "itemStyle": {"color": "#E7E7E7"}}]}
                            for p in pages if p["text"].strip()
                        ],
                    }
                    st.session_state.pdf_tree = pdf_tree

                except Exception as e:
                    st.error(f"PDF 解析失败: {e}")
        elif uploaded_pdf and not HAS_API_KEY:
            st.info("演示模式不支持 PDF 解析，配置 API Key 后使用")

        # ----- 知识树（快速导航） -----
        st.divider()
        st.header("🌳 知识导航")

        # 从知识库构建树
        try:
            from src.knowledge_graph import (
                load_or_build_tree,
                mark_mastered_nodes,
                generate_echarts_html,
            )

            tree = load_or_build_tree(force_rebuild=False)
            memory = st.session_state.memory
            profile = memory.load_profile()
            mastered = profile.get("mastered_topics", [])
            current = profile.get("current_topic", "")

            colored_tree = mark_mastered_nodes(tree, mastered, current)

            # 简短树（只显示章节）
            st.markdown("**课程章节**")

            # 显示 Markdown 知识库章节
            for chapter in colored_tree.get("children", []):
                chap_name = chapter.get("name", "")
                has_mastered = any(
                    c.get("itemStyle", {}).get("color") == "#70AD47"
                    for c in chapter.get("children", [])
                )
                icon = "✅" if has_mastered else "📖"
                st.markdown(f"{icon} **{chap_name}**")

            # 显示已上传的 PDF 章节
            pdf_tree = st.session_state.get("pdf_tree")
            if pdf_tree:
                pdf_label = pdf_tree.get("name", "📄 PDF教材")
                st.markdown(f"📄 **{pdf_label}**")
                for chapter in pdf_tree.get("children", []):
                    pdf_chap = chapter.get("name", "")
                    has_sub = len(chapter.get("children", [])) > 0
                    sub_icon = "📄" if has_sub else "📝"
                    st.markdown(f"&nbsp;&nbsp;{sub_icon} {pdf_chap}")

            # 快速导航按钮
            st.markdown("**快速跳转**")
            all_topics = []
            for ch in tree.get("children", []):
                all_topics.append(ch["name"])
                for sec in ch.get("children", []):
                    all_topics.append(f"  {sec['name']}")

            clicked = st.selectbox(
                "选择知识点",
                [""] + all_topics,
                label_visibility="collapsed",
            )
            if clicked and clicked.strip():
                st.session_state.selected_topic = clicked.strip()
                st.rerun()

        except Exception as e:
            st.caption(f"知识树加载中... ({str(e)[:30]})")

        # ----- 学习画像 -----
        st.divider()
        st.header("👤 学习画像")
        memory = st.session_state.get("memory")
        if memory:
            profile = memory.load_profile()
            if profile.get("knowledge_level") and profile["knowledge_level"] != "未知":
                st.markdown(
                    f"- **水平**: {profile['knowledge_level']}"
                    f"\n- **风格**: {profile.get('cognitive_style', '—')}"
                    f"\n- **目标**: {profile.get('learning_goal', '—')}"
                )
                weak = profile.get("weak_points", [])
                if weak:
                    st.markdown("**薄弱**: " + ", ".join(weak[:2]))
                mastered_topics = profile.get("mastered_topics", [])
                if mastered_topics:
                    st.markdown("**已掌握**: " + ", ".join(mastered_topics[-3:]))
                st.progress(
                    min(profile.get("learning_progress", 0) / 100, 1.0)
                )
                st.caption(f"交互 {profile.get('interaction_count', 0)} 次")
            else:
                st.caption("提问后将在此展示画像")

        st.caption("---")
        st.caption("📚 知识库: 人工智能导论(6章) + PDF上传")
        st.caption("🤖 智能体: 画像→资源→路径→测评")


# ========== 主对话区域 ==========
init_session_state()

# 处理知识树导航点击
if st.session_state.selected_topic:
    topic = st.session_state.selected_topic
    st.session_state.selected_topic = ""
    # 构造一个针对该知识点的提问
    prompt = f"请给我讲解一下「{topic}」"
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    # 继续执行下面的逻辑
else:
    prompt = None

# 欢迎消息
if not st.session_state.messages:
    with st.chat_message("assistant"):
        welcome = (
            "你好！我是 **AI 学习助手** 🎓\n\n"
            "我可以帮你：\n"
            "- 📖 **讲解知识点**：如「什么是深度学习？」\n"
            "- 📝 **出题练习**：如「出几道机器学习的题」\n"
            "- 🗺️ **规划路径**：如「我想学 NLP，该按什么顺序？」\n"
            "- 📄 **上传教材**：侧边栏上传 PDF，系统自动解析并建立索引\n\n"
            "请问你今天想学什么？"
        )
        st.markdown(welcome)
        st.session_state.messages.append({"role": "assistant", "content": welcome})

# 显示历史消息
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# 聊天输入（当有选中主题时已自动填入 prompt）
if prompt is None:
    prompt = st.chat_input("请输入你的学习问题...")

if prompt:
    # 完整流程
    if not st.session_state.messages or st.session_state.messages[-1].get("content") != prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})

    if HAS_API_KEY and not st.session_state.kb_ready:
        with st.chat_message("assistant"):
            st.warning("请先在侧边栏点击「初始化」构建知识库")
        st.stop()

    with st.chat_message("assistant"):
        with st.spinner("🧠 分析中..."):
            try:
                progress = st.empty()
                memory = st.session_state.memory
                existing_profile = memory.load_profile()
                history_context = memory.format_history_context()

                progress.text("📋 分析画像...")
                if HAS_API_KEY:
                    result = st.session_state.orch.process_query(
                        prompt,
                        history_context=history_context,
                        existing_profile=existing_profile,
                    )
                    if not result.get("is_refused"):
                        updated = result.get("profile_parsed", {})
                        if updated:
                            memory.save_profile(updated)
                    progress.text("📚 生成回答...")
                    final_answer = format_final_answer(result)
                else:
                    result = st.session_state.orch.process_query(
                        prompt,
                        history_context=history_context,
                        existing_profile=existing_profile,
                    )
                    if not result.get("is_refused"):
                        updated = result.get("profile_parsed", {})
                        if updated:
                            memory.save_profile(updated)
                    final_answer = format_mock_answer(result)

                progress.empty()

                if len(final_answer) > 100:
                    display_text = st.write_stream(stream_text(final_answer))
                else:
                    st.markdown(final_answer)
                    display_text = final_answer

                # 保存助手回复到会话历史（重要！否则 rerun 后消失）
                st.session_state.messages.append(
                    {"role": "assistant", "content": display_text}
                )

                if not result.get("is_refused"):
                    memory.append_history(prompt, display_text)

                st.rerun()

            except Exception as e:
                st.error(f"处理时出错: {e}")

# 渲染侧边栏（放在最后确保状态最新）
render_sidebar()
