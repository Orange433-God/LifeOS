"""
PDF 多模态解析模块
严格按照技术文档的三步方案：
Step 1: 整页高分辨率渲染 — PyMuPDF 将每页渲染为 200DPI PNG
Step 2: 多模态 API 结构化理解 — 调用多模态 API 分析图表（有则用，无则占位）
Step 3: 文本锚点插入 — 将描述按 Figure 编号插入原文引用位置
"""

import os
import re
import json
import base64
from io import BytesIO
from typing import List, Optional, Tuple

import fitz  # PyMuPDF


class PDFProcessor:
    """PDF 解析器：提取文字、渲染图片、融合图表描述"""

    @staticmethod
    def extract_text_only(pdf_path: str) -> List[dict]:
        """Step 1 的一部分：提取每页纯文字

        Args:
            pdf_path: PDF 文件路径

        Returns:
            [{page: 0, text: "...", has_images: bool, image_count: int}, ...]
        """
        doc = fitz.open(pdf_path)
        pages = []
        for page_num, page in enumerate(doc):
            text = page.get_text()
            # 检查是否有嵌入图片
            images = page.get_images()
            # 检查是否有矢量图形（流程图、线形图等）
            has_vector = bool(page.get_drawings())

            pages.append({
                "page": page_num,
                "text": text.strip(),
                "has_images": len(images) > 0 or has_vector,
                "image_count": len(images),
            })
        doc.close()
        return pages

    @staticmethod
    def render_page_images(
        pdf_path: str,
        output_dir: str,
        dpi: int = 200,
        page_numbers: Optional[List[int]] = None,
    ) -> List[dict]:
        """Step 1：整页高分辨率渲染

        将 PDF 的指定页（或全部页）渲染为 PNG 图片。

        Args:
            pdf_path: PDF 文件路径
            output_dir: 输出目录
            dpi: 渲染分辨率，默认 200
            page_numbers: 指定页码（从0开始），None 表示所有页

        Returns:
            [{page: 0, image_path: "...", text: "..."}, ...]
        """
        doc = fitz.open(pdf_path)
        os.makedirs(output_dir, exist_ok=True)
        pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
        rendered = []

        pages_to_render = page_numbers if page_numbers is not None else range(len(doc))

        for page_num in pages_to_render:
            page = doc[page_num]
            text = page.get_text()
            pix = page.get_pixmap(dpi=dpi)
            img_name = f"{pdf_name}_page_{page_num:03d}.png"
            img_path = os.path.join(output_dir, img_name)
            pix.save(img_path)

            rendered.append({
                "page": page_num,
                "image_path": img_path,
                "text": text.strip(),
            })

        doc.close()
        return rendered

    @staticmethod
    def describe_images_multimodal(
        rendered_pages: List[dict],
        api_key: str,
        base_url: str,
        model: str = "generalv3.5",
    ) -> List[dict]:
        """Step 2：多模态 API 结构化理解

        将每页图片发送给多模态 API 分析，返回图表描述。
        当前账号仅开通 lite 模型时此步骤会失败，将优雅降级为占位符。

        Args:
            rendered_pages: render_page_images() 的输出
            api_key: 讯飞 API Key
            base_url: API 地址
            model: 支持 vision 的模型名

        Returns:
            [{page: 0, figures: [{"figure_id": "Figure1", "description": "..."}]}, ...]
        """
        from openai import OpenAI

        # 去掉 openai/ 前缀（CrewAI 风格的模型名）
        clean_model = model.replace("openai/", "")

        client = OpenAI(api_key=api_key, base_url=base_url)
        results = []

        for page_data in rendered_pages:
            page_num = page_data["page"]
            image_path = page_data["image_path"]

            # 读取图片并转为 base64
            with open(image_path, "rb") as f:
                img_base64 = base64.b64encode(f.read()).decode("utf-8")

            # 获取图片格式
            img_ext = os.path.splitext(image_path)[1].lower().lstrip(".")
            if img_ext in ("jpg", "jpeg"):
                mime = "image/jpeg"
            else:
                mime = "image/png"

            data_url = f"data:{mime};base64,{img_base64}"

            prompt = """请分析这张页面图像，识别其中所有图表（Figure/图/表格/流程图/线形图等）。

按编号顺序以 JSON 数组形式输出，每个元素包含：
- figure_id: 图表编号（如"Figure1"、"图2"），若无编号则用 "Figure1" 依次编号
- description: 用中文详细描述图表类型、关键数据、趋势、结论等
- position: 图表在页面中的位置描述（左上/右下/中部等）

对于不含图表的页面，返回空数组 []。
只输出 JSON 本身，不要其他文字。"""

            try:
                resp = client.chat.completions.create(
                    model=clean_model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": data_url},
                                },
                            ],
                        }
                    ],
                    max_tokens=2000,
                    temperature=0.1,
                )

                answer = resp.choices[0].message.content.strip()
                figures = PDFProcessor._parse_figures_json(answer)

                results.append({
                    "page": page_num,
                    "figures": figures,
                    "api_success": True,
                })

            except Exception:
                # API 调用失败（模型不支持 vision、账号未开通等）
                results.append({
                    "page": page_num,
                    "figures": [
                        {
                            "figure_id": f"Figure1",
                            "description": f"[页面 {page_num + 1} 包含图表/示意图，请查看源文件]",
                            "position": "页面中",
                        }
                    ],
                    "api_success": False,
                })

        return results

    @staticmethod
    def _parse_figures_json(text: str) -> list:
        """从 API 返回中解析 JSON 图表列表"""
        # 尝试找 JSON 数组
        json_match = re.search(r"\[.*?\]", text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return []

    @staticmethod
    def merge_descriptions(
        pages_text: List[dict],
        figure_descriptions: List[dict],
    ) -> str:
        """Step 3：文本锚点插入

        将图表描述插入原文引用位置。

        Args:
            pages_text: extract_text_only() 的输出
            figure_descriptions: describe_images_multimodal() 的输出

        Returns:
            融合后的完整文本
        """
        # 建立 page -> figures 查找表
        page_figures = {}
        for desc in figure_descriptions:
            page_figures[desc["page"]] = desc.get("figures", [])

        all_text = []
        all_text.append("# PDF 解析内容\n\n")

        for page_data in pages_text:
            page_num = page_data["page"]
            text = page_data["text"]
            figures = page_figures.get(page_num, [])

            all_text.append(f"--- 第 {page_num + 1} 页 ---\n")
            all_text.append(text)
            all_text.append("\n")

            # 插入图表描述
            if figures:
                for fig in figures:
                    fig_id = fig.get("figure_id", f"Figure{figures.index(fig) + 1}")
                    desc = fig.get("description", "")
                    position = fig.get("position", "")

                    # 尝试在原文中找引用
                    ref_patterns = [
                        rf"{{?{re.escape(fig_id)}}}?",
                        rf"{{?图\s*{re.escape(fig_id[-1])}}}?",
                        rf"{{?如图\s*{re.escape(fig_id[-1])}}}?",
                        rf"{{?Figure\s*{re.escape(fig_id[-1])}}}?",
                    ]
                    found_ref = False
                    for pattern in ref_patterns:
                        if re.search(pattern, text[-300:]):
                            found_ref = True
                            break

                    if found_ref:
                        all_text.append(
                            f"\n[图表描述: {fig_id}] {desc}\n"
                        )
                    else:
                        all_text.append(
                            f"\n[{fig_id}（第 {page_num + 1} 页）] {desc}\n"
                        )

                    if position:
                        all_text.append(f"（位置: {position}）\n")

            all_text.append("\n")

        return "".join(all_text)

    @staticmethod
    def process(
        pdf_path: str,
        output_dir: str = None,
        api_key: str = None,
        base_url: str = None,
        vision_model: str = None,
    ) -> Tuple[str, List[str]]:
        """完整流程：渲染 → 多模态分析 → 融合

        Args:
            pdf_path: PDF 文件路径
            output_dir: 图片输出目录（None 则自动创建）
            api_key: 多模态 API Key（None 则仅提取文字+占位符）
            base_url: 多模态 API 地址
            vision_model: 支持 vision 的模型名

        Returns:
            (融合后的完整文本, 渲染的图片路径列表)
        """
        # Step 1: 提取文字 + 渲染页面
        pages_text = PDFProcessor.extract_text_only(pdf_path)

        # 确定哪些页需要渲染（有图片的页）
        pages_with_images = [p["page"] for p in pages_text if p["has_images"]]

        rendered_pages = []
        image_paths = []

        if pages_with_images:
            if output_dir is None:
                pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
                output_dir = os.path.join(
                    os.path.dirname(pdf_path),
                    f"{pdf_name}_pages",
                )

            rendered_pages = PDFProcessor.render_page_images(
                pdf_path, output_dir, page_numbers=pages_with_images
            )
            image_paths = [r["image_path"] for r in rendered_pages]

        # Step 2: 多模态 API 分析
        figure_descriptions = []
        if rendered_pages and api_key and base_url and vision_model:
            figure_descriptions = PDFProcessor.describe_images_multimodal(
                rendered_pages, api_key, base_url, vision_model
            )
        elif rendered_pages:
            # 无 API 时使用占位符
            for rp in rendered_pages:
                figure_descriptions.append({
                    "page": rp["page"],
                    "figures": [
                        {
                            "figure_id": f"Figure1",
                            "description": (
                                f"[📷 第 {rp['page'] + 1} 页包含图表/流程图/示意图，"
                                f"详见源文件: {os.path.basename(rp['image_path'])}]"
                            ),
                            "position": "页面中",
                        }
                    ],
                    "api_success": False,
                })

        # Step 3: 文本锚点插入
        merged_text = PDFProcessor.merge_descriptions(
            pages_text, figure_descriptions
        )

        return merged_text, image_paths
