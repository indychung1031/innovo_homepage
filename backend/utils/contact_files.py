"""Contact 파일 첨부 검증·저장."""

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from backend.config import get_settings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

ALLOWED_EXTENSIONS = {".pdf", ".dxf", ".step", ".stp"}
ALLOWED_MIMES = {
    "application/pdf",
    "application/dxf",
    "application/x-dxf",
    "model/step",
    "application/step",
    "application/octet-stream",
}


def validate_and_save_attachment(
    inquiry_id: int,
    upload: UploadFile | None,
) -> tuple[str | None, str | None, int | None, str | None]:
    """저장 후 (path, name, size, mime) 반환. 파일 없으면 전부 None."""
    if upload is None or not upload.filename:
        return None, None, None, None

    settings = get_settings()
    filename = Path(upload.filename).name
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않는 파일 형식입니다. (pdf, dxf, step, stp)",
        )

    content = upload.file.read()
    size = len(content)
    if size > settings.contact_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="파일 크기는 10MB를 초과할 수 없습니다.",
        )

    mime = upload.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIMES and ext not in {".step", ".stp", ".dxf"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용되지 않는 MIME 타입입니다.",
        )

    rel_dir = settings.contact_upload_dir
    base = PROJECT_ROOT / rel_dir / str(inquiry_id)
    base.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{filename}"
    dest = base / safe_name
    dest.write_bytes(content)

    rel_path = f"{rel_dir}/{inquiry_id}/{safe_name}"
    return rel_path, filename, size, mime
