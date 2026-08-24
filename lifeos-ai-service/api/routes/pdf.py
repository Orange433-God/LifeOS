"""POST /api/ai/pdf/upload — PDF 上传与解析，存入用户个人向量库"""

import os
import tempfile

from fastapi import APIRouter, File, Form, UploadFile

from api.models import fail, ok
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, VL_MODEL_NAME
from core.pdf_processor import PDFProcessor
from core.vector_store import get_user_vector_store

router = APIRouter()

_ALLOWED_EXT = {".pdf"}


@router.post("/pdf/upload")
async def pdf_upload(file: UploadFile = File(...), userId: str = Form(...)):
    """接收 PDF（multipart/form-data），解析后索引到 user_{userId} collection"""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_EXT:
        return fail("仅支持 PDF 文件")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        return fail("文件过大（上限 20MB）")

    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # 三步方案：渲染 → VL 分析（可用时）→ 文本融合；无 Key 时自动回退纯文本
            merged_text, image_pages, images_parsed = PDFProcessor.process(
                tmp_path,
                api_key=DEEPSEEK_API_KEY or "",
                base_url=DEEPSEEK_BASE_URL,
                vision_model=VL_MODEL_NAME,
            )

            store = get_user_vector_store(userId)
            chunks = store.add_document(merged_text, source_name=file.filename or "pdf")

            return ok(
                {
                    "chunksIndexed": chunks,
                    "imagesParsed": images_parsed,
                    "imagePages": image_pages,
                },
                "PDF 已解析并存入你的个人资料库",
            )
        finally:
            os.unlink(tmp_path)
    except Exception as exc:  # noqa: BLE001
        return fail(str(exc), 500)
