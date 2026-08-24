# render_pages.py
import os
import fitz


def render_pdf_pages(pdf_path, output_dir, dpi=200):
    doc = fitz.open(pdf_path)
    os.makedirs(output_dir, exist_ok=True)
    pages_data = []

    for page_num, page in enumerate(doc):
        text = page.get_text()
        # 渲染整页为图片
        pix = page.get_pixmap(dpi=dpi)
        img_name = f"page_{page_num}.png"
        img_path = os.path.join(output_dir, img_name)
        pix.save(img_path)

        # 插入占位符（占位符内容后续由多模态模型填充）
        text += f"\n[页面图像: {img_name}]\n"

        pages_data.append({
            "page": page_num,
            "text": text,
            "image_path": img_path
        })

    return pages_data


if __name__ == "__main__":
    pdf_path = r"C:\Users\33659\Desktop\SEA论文评审.pdf"
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    output_dir = os.path.join(os.path.dirname(pdf_path), pdf_name + "_pages")

    pages = render_pdf_pages(pdf_path, output_dir, dpi=200)
    print(f"✅ 已渲染 {len(pages)} 页，图片保存在：{output_dir}")
    # 显示一页示例
    print(pages[0]['text'][-200:])