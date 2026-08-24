"""
知识图谱构建模块
从 Markdown 教材自动解析章节结构，生成 ECharts 树图所需的数据格式。
"""

import os
import re
import json
from typing import List, Optional

from src.config import KNOWLEDGE_BASE_DIR

# 知识图谱缓存
CACHE_DIR = os.path.join(
    os.path.dirname(KNOWLEDGE_BASE_DIR),
    "knowledge_graph.json",
)


def _parse_markdown_heading(line: str) -> tuple:
    """解析 Markdown 标题行

    Args:
        line: "# 第一章 XXX" 或 "## 1.1 XXX"

    Returns:
        (level, title, is_leaf) 或 None
    """
    match = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
    if match:
        level = len(match.group(1))
        title = match.group(2).strip()
        # 去掉编号前缀用于显示
        clean_title = re.sub(r"^[\d.、\s]+", "", title).strip()
        # 叶节点判定：是 ### 级别或是具体知识点
        is_leaf = level >= 3 or "知识点" in title or "节" in title
        return level, title if clean_title else title, is_leaf
    return None


def build_tree_from_markdown(kb_dir: str = None) -> dict:
    """从 Markdown 知识库解析构建知识树

    Args:
        kb_dir: 知识库目录，默认使用配置路径

    Returns:
        ECharts 树图格式的 dict
    """
    kb_dir = kb_dir or KNOWLEDGE_BASE_DIR

    if not os.path.exists(kb_dir):
        return {"name": "知识库为空", "children": []}

    # 根节点
    root = {
        "name": "📚 人工智能导论",
        "itemStyle": {"color": "#4472C4"},
        "children": [],
    }

    md_files = sorted([f for f in os.listdir(kb_dir) if f.endswith(".md")])

    for md_file in md_files:
        filepath = os.path.join(kb_dir, md_file)
        chapter_name = os.path.splitext(md_file)[0]

        # 清理章节名：去掉编号前缀
        clean_chapter = re.sub(r"^\d+[-_]", "", chapter_name)
        clean_chapter = re.sub(r"^第.*?章[-_]?", "", clean_chapter)

        chapter_node = {
            "name": clean_chapter,
            "children": [],
        }

        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        current_section = None  # ## 级别
        for line in lines:
            parsed = _parse_markdown_heading(line)
            if parsed is None:
                continue

            level, title, is_leaf = parsed

            if level == 1:
                # # 标题 = 章节名（跳过，用文件名）
                continue
            elif level == 2:
                # ## 标题 = 小节
                current_section = {
                    "name": title,
                    "children": [],
                }
                chapter_node["children"].append(current_section)
            elif level >= 3:
                # ### 及以上 = 知识点（叶节点）
                if current_section is not None:
                    current_section["children"].append({
                        "name": title,
                        "itemStyle": {"color": "#E7E7E7"},  # 默认灰色（未学）
                    })

        # 如果章节下没有二级标题，将二级及以上标题作为直接子节点
        if not chapter_node["children"]:
            # 重新扫描，收集所有非一级标题
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
            for line in lines:
                parsed = _parse_markdown_heading(line)
                if parsed and parsed[0] >= 2:
                    chapter_node["children"].append({
                        "name": parsed[1],
                        "itemStyle": {"color": "#E7E7E7"},
                    })

        root["children"].append(chapter_node)

    return root


def load_or_build_tree(kb_dir: str = None, force_rebuild: bool = False) -> dict:
    """加载或构建知识树（带缓存）

    Args:
        kb_dir: 知识库目录
        force_rebuild: 强制重建

    Returns:
        知识树 dict
    """
    cache_file = CACHE_DIR

    if not force_rebuild and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    tree = build_tree_from_markdown(kb_dir)

    # 写入缓存
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(tree, f, ensure_ascii=False, indent=2)
    except IOError:
        pass

    return tree


def mark_mastered_nodes(
    tree: dict,
    mastered_topics: List[str],
    current_topic: str = "",
) -> dict:
    """标记已掌握和当前学习的节点

    Args:
        tree: 知识树 dict
        mastered_topics: 已掌握的知识点列表
        current_topic: 当前学习知识点

    Returns:
        标记颜色后的知识树
    """
    if not mastered_topics and not current_topic:
        return tree

    import copy
    tree = copy.deepcopy(tree)

    def _mark(node):
        # 检查节点名是否在已掌握列表中
        name = node.get("name", "")
        is_mastered = any(
            kw.lower() in name.lower() or name.lower() in kw.lower()
            for kw in mastered_topics
        )
        is_current = (
            current_topic.lower() in name.lower()
            or name.lower() in current_topic.lower()
        ) and not is_mastered

        if is_mastered:
            node["itemStyle"] = {"color": "#70AD47"}  # 绿色-已掌握
        elif is_current:
            node["itemStyle"] = {"color": "#4472C4"}  # 蓝色-学习中

        # 递归子节点
        for child in node.get("children", []):
            _mark(child)

    _mark(tree)
    return tree


def extract_headings_from_text(text: str, source_label: str = "PDF") -> dict:
    """从 PDF 解析后的文本中提取章节结构，生成树节点

    Args:
        text: PDFProcessor 融合后的文本
        source_label: 来源名称（文件名）

    Returns:
        ECharts 树节点 dict
    """
    root = {
        "name": f"📄 {source_label}",
        "itemStyle": {"color": "#ED7D31"},
        "children": [],
    }

    lines = text.split("\n")
    current_section = None

    for line in lines:
        parsed = _parse_markdown_heading(line)
        if parsed is None:
            continue
        level, title, is_leaf = parsed

        if level == 1:
            # # 标题作为一级子节点
            node = {"name": title, "children": []}
            root["children"].append(node)
            current_section = node
        elif level == 2:
            node = {"name": title, "children": []}
            root["children"].append(node)
            current_section = node
        elif level >= 3:
            if current_section is not None:
                current_section["children"].append({
                    "name": title,
                    "itemStyle": {"color": "#E7E7E7"},
                })
            else:
                root["children"].append({
                    "name": title,
                    "itemStyle": {"color": "#E7E7E7"},
                })

    # 如果没有任何标题结构，至少显示 "PDF 内容" 节点
    if not root["children"]:
        # 从 --- 第 X 页 --- 分割提取
        page_sections = re.findall(r"--- 第 (\d+) 页 ---\n(.+?)(?=--- 第|$)", text, re.DOTALL)
        for page_num, content in page_sections:
            content_preview = content.strip()[:80].replace("\n", " ")
            root["children"].append({
                "name": f"第{page_num}页",
                "children": [{"name": content_preview, "itemStyle": {"color": "#E7E7E7"}}],
            })

    return root


def generate_echarts_html(tree_data: dict, height: int = 400) -> str:
    """生成 ECharts 树图的 HTML

    Args:
        tree_data: 知识树数据
        height: 图表高度

    Returns:
        可直接嵌入的 HTML 字符串
    """
    tree_json = json.dumps(tree_data, ensure_ascii=False)

    return f"""
    <div id="knowledge-tree" style="width:100%;height:{height}px;"></div>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <script>
    (function() {{
        var chart = echarts.init(document.getElementById('knowledge-tree'));
        var option = {{
            tooltip: {{
                trigger: 'item',
                triggerOn: 'mousemove',
                formatter: function(params) {{
                    return '<b>' + params.name + '</b>';
                }}
            }},
            series: [{{
                type: 'tree',
                data: [{tree_json}],
                top: '5%',
                left: '5%',
                bottom: '5%',
                right: '15%',
                symbolSize: 8,
                label: {{
                    position: 'left',
                    verticalAlign: 'middle',
                    align: 'right',
                    fontSize: 12,
                    color: '#333',
                }},
                leaves: {{
                    label: {{
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left',
                    }}
                }},
                expandAndCollapse: true,
                initialTreeDepth: 2,
                animationDuration: 550,
                animationEasing: 'cubicOut',
                lineStyle: {{
                    color: '#ccc',
                    width: 1.5,
                }},
                itemStyle: {{
                    borderColor: '#666',
                    borderWidth: 1,
                }},
            }}]
        }};
        chart.setOption(option);
        window.addEventListener('resize', function() {{ chart.resize(); }});

        // 点击节点时触发 Streamlit 事件
        chart.on('click', function(params) {{
            // 通过 URL 参数传递点击信息给 Streamlit
            var nodeName = params.name;
            // 触发自定义事件
            var event = new CustomEvent('knowledge-node-click', {{detail: nodeName}});
            document.dispatchEvent(event);
        }});
    }})();
    </script>
    """
