"""회원 계정 관련 API (마이페이지)."""

import logging
from datetime import datetime
from urllib.parse import quote, urlparse, urlunparse

import boto3
from botocore.config import Config
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.deps import get_current_user
from backend.models import QuickQuoteInquiry, User

logger = logging.getLogger(__name__)

CATALOG_FILES: dict[str, str] = {
    "socket_list": "upload/catalog/Socket List 250108.pdf",
    "probe_pin_plunger": "upload/catalog/probe_pin_plunger_shape.png",
    "iso9001_en": "upload/certificate/ISO9001 (2024) Eng.pdf",
    "iso9001_ko": "upload/certificate/ISO9001 (2024) Kor.pdf",
}

# 인증 없이 공개 허용하는 파일 (ISO 인증서만)
PUBLIC_FILES: dict[str, str] = {
    "iso9001_en": "upload/certificate/ISO9001 (2024) Eng.pdf",
    "iso9001_ko": "upload/certificate/ISO9001 (2024) Kor.pdf",
}

S3_BUCKET = "innovo-www-prod"

router = APIRouter(prefix="/api/account", tags=["account"])


class QuoteItem(BaseModel):
    id: int
    ic_package_type: str
    ic_type: str | None
    ic_code: str | None
    package_d: float
    package_e: float
    pin_count: int
    pitch: str
    quantity: int | None
    created_at: datetime
    status: str


class QuoteListResponse(BaseModel):
    items: list[QuoteItem]
    total: int
    page: int
    size: int


@router.get("/quotes", response_model=QuoteListResponse)
def my_quotes(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuoteListResponse:
    base = select(QuickQuoteInquiry).where(QuickQuoteInquiry.contact_email == user.email)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.order_by(QuickQuoteInquiry.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    items = [
        QuoteItem(
            id=r.id,
            ic_package_type=r.ic_package_type,
            ic_type=r.ic_type,
            ic_code=r.ic_code,
            package_d=float(r.package_d),
            package_e=float(r.package_e),
            pin_count=r.pin_count,
            pitch=r.pitch,
            quantity=r.quantity,
            created_at=r.created_at,
            status=r.status,
        )
        for r in rows
    ]
    return QuoteListResponse(items=items, total=total, page=page, size=size)


class CatalogUrlResponse(BaseModel):
    url: str
    expires_in: int = 60


@router.get("/public-download-url", response_model=CatalogUrlResponse)
def get_public_download_url(
    file: str = Query(..., description="iso9001_en | iso9001_ko"),
) -> CatalogUrlResponse:
    s3_key = PUBLIC_FILES.get(file)
    if not s3_key:
        raise HTTPException(status_code=404, detail="존재하지 않는 파일입니다.")
    try:
        client = boto3.client(
            "s3",
            region_name="ap-northeast-2",
            config=Config(signature_version="s3v4"),
        )
        raw_url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=60,
        )
        parsed = urlparse(raw_url)
        url = urlunparse(parsed._replace(path=quote(parsed.path, safe="/")))
    except Exception:
        logger.exception("S3 presigned URL 생성 실패 file=%s", file)
        raise HTTPException(status_code=500, detail="파일 URL 생성에 실패했습니다.")
    return CatalogUrlResponse(url=url)


@router.get("/catalog-url", response_model=CatalogUrlResponse)
def get_catalog_url(
    file: str = Query(..., description="file_id: socket_list | probe_pin_plunger | iso9001_en | iso9001_ko"),
    user: User = Depends(get_current_user),
) -> CatalogUrlResponse:
    if user.membership_tier != "verified":
        raise HTTPException(status_code=403, detail="인증 회원 전용 자료입니다.")
    s3_key = CATALOG_FILES.get(file)
    if not s3_key:
        raise HTTPException(status_code=404, detail="존재하지 않는 파일입니다.")
    try:
        client = boto3.client(
            "s3",
            region_name="ap-northeast-2",
            config=Config(signature_version="s3v4"),
        )
        raw_url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=60,
        )
        # boto3가 path에 공백·괄호를 그대로 두는 경우가 있어 path만 별도 인코딩
        # query string(AWS 서명 파라미터)은 절대 건드리지 않음
        parsed = urlparse(raw_url)
        url = urlunparse(parsed._replace(path=quote(parsed.path, safe="/")))
    except Exception:
        logger.exception("S3 presigned URL 생성 실패 file=%s", file)
        raise HTTPException(status_code=500, detail="파일 URL 생성에 실패했습니다.")
    return CatalogUrlResponse(url=url)
