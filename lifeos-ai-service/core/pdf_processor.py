"""
PDF 多模态解析模块（改造：使用 DeepSeek-VL）
三步方案：
Step 1: 整页高分辨率渲染 — PyMuPDF 将含图页渲染为 200DPI PNG
Step 2: 多模态结构化理解 — DeepSeek-VL 按编号输出图表描述（JSON 数组）
Step 3: 文本锚点插入 — 将描述按 图N / Figure N 引用插入原文
容灾：VL 未配置或调用失败时，回退为纯文本提取 + 图片占位符标记。
"""

import base64
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF


class PDFProcessor:
    """PDF 解析器：提取文字、渲染图片、融合图表描述"""

    @staticmethod
    def extract_text_only(pdf_path: str) -> List[Dict[str, Any]]:
        """提取每页纯文字，并标记页面是否含图片/图形"""
        doc = fitz.open(pdf_path)
        pages: List[Dict[str, Any]] = []
        for page_num, page in enumerate(doc):
            text = page.get_text()
            has_images = len(page.get_images()) > 0 or bool(page.get_drawings())
            pages.append(
                {
                    "page": page_num,
                    "text": text.strip(),
                    "has_images": has_images,
                    "image_count": len(page.get_images()),
                }
            )
        doc.close()
        return pages

    @staticmethod
    def render_page_images(
        pdf_path: str,
        output_dir: str,
        dpi: int = 200,
        page_numbers: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """Step 1：整页高分辨率渲染为 PNG"""
        doc = fitz.open(pdf_path)
        os.makedirs(output_dir, exist_ok=True)
        pdf_name = Path(pdf_path).stem
        rendered: List[Dict[str, Any]] = []

        pages_to_render = page_numbers if page_numbers is not None else range(len(doc))
        for page_num in pages_to_render:
            page = doc[page_num]
            pix = page.get_pixmap(dpi=dpi)
            img_name = f"{pdf_name}_page_{page_num:03d}.png"
            img_path = os.path.join(output_dir, img_name)
            pix.save(img_path)
            rendered.append({"page": page_num, "image_path": img_path})

        doc.close()
        return rendered

    @staticmethod
    def describe_images_multimodal(
        rendered_pages: List[Dict[str, Any]],
        api_key: str,
        base_url: str,
        model: str,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Step 2：调用 DeepSeek-VL 分析页面图表

        Returns:
            (每页图表描述列表, 成功解析的图表数量)
        """
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=base_url)
        results: List[Dict[str, Any]] = []
        parsed_count = 0

        prompt = """请分析这张页面图像，识别其中所有图表（Figure/图/表格/流程图/线形图等）。
按编号顺序以 JSON 数组形式输出，每个元素包含：
- figure_id: 图表编号（如 "Figure 1"、"图2"），若无编号则用 "Figure 1" 依次编号
- description: 用中文详细描述图表类型、关键数据、趋势、结论
对于不含图表的页面，返回空数组 []。
只输出 JSON 本身，不要其他文字。"""

        for page_data in rendered_pages:
            page_num = page_data["page"]
            image_path = page_data["image_path"]

            with open(image_path, "rb") as f:
                img_base64 = base64.b64encode(f.read()).decode("utf-8")
            mime = "image/png"
            data_url = f"data:{mime};base64,{img_base64}"

            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {"type": "image_url", "image_url": {"url": data_url}},
                            ],
                        }
                    ],
                    max_tokens=2000,
                    temperature=0.1,
                )
                answer = (resp.choices[0].message.content or "").strip()
                figures = PDFProcessor._parse_figures_json(answer)
                if figures:
                    parsed_count += len(figures)
                results.append({"page": page_num, "figures": figures, "api_success": True})
            except Exception:
                # VL 不可用/调用失败：该页降级为占位符
                results.append(
                    {
                        "page": page_num,
                        "figures": [
                            {
                                "figure_id": "Figure 1",
                                "description": f"[第 {page_num + 1} 页包含图表/示意图，请查看源文件]",
                                "position": "页面中",
                            }
                        ],
                        "api_success": False,
                    }
                )

        return results, parsed_count

    @staticmethod
    def _parse_figures_json(text: str) -> List[Dict[str, Any]]:
        """从 API 返回中解析 JSON 图表列表"""
        json_match = re.search(r"\[.*?\]", text, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                if isinstance(parsed, list):
                    return [item for item in parsed if isinstance(item, dict)]
            except json.JSONDecodeError:
                pass
        return []

    @staticmethod
    def merge_descriptions(
        pages_text: List[Dict[str, Any]],
        figure_descriptions: List[Dict[str, Any]],
    ) -> str:
        """Step 3：将图表描述按编号锚点插入原文（无引用则附在页尾）"""
        page_figures: Dict[int, List[Dict[str, Any]]] = {}
        for desc in figure_descriptions:
            page_figures[desc["page"]] = desc.get("figures", [])

        parts: List[str] = ["# PDF 解析内容\n\n"]

        for page_data in pages_text:
            page_num = page_data["page"]
            text = page_data["text"]
            figures = page_figures.get(page_num, [])

            parts.append(f"--- 第 {page_num + 1} 页 ---\n")
            parts.append(text)
            parts.append("\n")

            for index, fig in enumerate(figures):
                fig_id = str(fig.get("figure_id") or f"Figure {index + 1}")
                desc = str(fig.get("description") or "")
                position = str(fig.get("position") or "")

                # 检查原文是否有编号引用（图1 / Figure 1 等）
                number = re.search(r"\d+", fig_id)
                digit = number.group() if number else str(index + 1)
                has_ref = any(
                    re.search(pattern, text[-500:])
                    for pattern in (
                        rf"图\s*{re.escape(digit)}",
                        rf"Figure\s*{re.escape(digit)}",
                        rf"如图\s*{re.escape(digit)}",
                    )
                )
                anchor = f"[图表描述: {fig_id}]" if has_ref else f"[{fig_id}（第 {page_num + 1} 页）]"
                parts.append(f"\n{anchor} {desc}\n")
                if position:
                    parts.append(f"（位置: {position}）\n")

            parts.append("\n")

        return "".join(parts)

    @staticmethod
    def process(
        pdf_path: str,
        api_key: str = "",
        base_url: str = "",
        vision_model: str = "",
    ) -> Tuple[str, int, int]:
        """完整流程：渲染 → 多模态分析（可用时）→ 融合

        Args:
            pdf_path: PDF 文件路径
            api_key: DeepSeek API Key（空则不调用 VL，回退纯文本）
            base_url: DeepSeek API 地址
            vision_model: VL 模型名

        Returns:
            (融合后的完整文本, 分块前图像页数, 成功解析的图表数量)
        """
        # Step 1: 提取文字，定位含图页
        pages_text = PDFProcessor.extract_text_only(pdf_path)
        pages_with_images = [p["page"] for p in pages_text if p["has_images"]]

        rendered_pages: List[Dict[str, Any]] = []
        with tempfile.TemporaryDirectory(prefix="lifeos_pdf_") as output_dir:
            if pages_with_images:
                rendered_pages = PDFProcessor.render_page_images(
                    pdf_path, output_dir, page_numbers=pages_with_images
                )

            # Step 2: VL 分析（配置齐全时），否则占位符降级
            figure_descriptions: List[Dict[str, Any]] = []
            parsed_count = 0
            if rendered_pages and api_key and vision_model:
                figure_descriptions, parsed_count = PDFProcessor.describe_images_multimodal(
                    rendered_pages, api_key, base_url, vision_model
                )
            elif rendered_pages:
                for rp in rendered_pages:
                    figure_descriptions.append(
                        {
                            "page": rp["page"],
                            "figures": [
                                {
                                    "figure_id": "Figure 1",
                                    "description": f"[第 {rp['page'] + 1} 页包含图表/示意图，请查看源文件]",
                                    "position": "页面中",
                                }
                            ],
                            "api_success": False,
                        }
                    )

            # Step 3: 融合
            merged_text = PDFProcessor.merge_descriptions(pages_text, figure_descriptions)

        return merged_text, len(rendered_pages), parsed_count
