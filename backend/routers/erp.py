"""ERP api/public 프록시 라우터 — 위저드 마스터 데이터 + 가 견적 계산."""

import logging
import math
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.database import get_db
from backend.deps import get_current_user
from backend.models import LeadTimeRule, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["erp"])

ERP_TIMEOUT = 10


def _erp_get(path: str) -> Any:
    """ERP api/public GET 호출 — X-API-Key 인증."""
    settings = get_settings()
    url = f"{settings.erp_api_base_url}/api/public{path}"
    try:
        resp = httpx.get(url, headers={"X-API-Key": settings.erp_api_key}, timeout=ERP_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("ERP GET %s 실패: %s", path, exc.response.status_code)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ERP 서버 오류") from exc
    except httpx.RequestError as exc:
        logger.error("ERP GET %s 연결 오류: %s", path, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ERP 서버에 연결할 수 없습니다.") from exc


def _get_lead_time_label(db: Session, quantity: int) -> str:
    """lead_time_rules 테이블에서 수량 구간에 맞는 납기 라벨 조회."""
    rule = (
        db.query(LeadTimeRule)
        .filter(
            LeadTimeRule.socket_type == "all",
            LeadTimeRule.qty_min <= quantity,
            (LeadTimeRule.qty_max >= quantity) | (LeadTimeRule.qty_max.is_(None)),
        )
        .order_by(LeadTimeRule.qty_min.desc())
        .first()
    )
    return rule.lead_time_label if rule else "담당자 확인 후 안내"


# ── GET 마스터 데이터 (인증 불필요) ─────────────────────────────────────────

@router.get("/api/erp/socket-types")
def get_socket_types() -> Any:
    return _erp_get("/socket-types")


@router.get("/api/erp/ic-package-types")
def get_ic_package_types() -> Any:
    return _erp_get("/ic-package-types")


@router.get("/api/erp/cover-types")
def get_cover_types() -> Any:
    return _erp_get("/cover-types")


@router.get("/api/erp/material-types")
def get_material_types() -> Any:
    return _erp_get("/material-types")


# ── POST 가 견적 계산 (인증 필수) ────────────────────────────────────────────

class EstimateRequest(BaseModel):
    socket_type_id: int
    material_type_id: int
    cover_type_id: int
    pin_block_type_id: int | None = None
    pocket_guide_type_id: int | None = None
    pin_count: int
    quantity: int


class EstimateResponse(BaseModel):
    matched: bool
    unit_price: int
    currency: str
    quantity: int
    total_price: int
    lead_time_label: str | None = None


@router.post("/api/erp/quote-estimate", response_model=EstimateResponse)
def post_quote_estimate(
    body: EstimateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> EstimateResponse:
    settings = get_settings()
    url = f"{settings.erp_api_base_url}/api/public/quote-estimate"

    try:
        resp = httpx.post(
            url,
            json=body.model_dump(),
            headers={"X-API-Key": settings.erp_api_key},
            timeout=ERP_TIMEOUT,
        )
        resp.raise_for_status()
        erp_data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("ERP quote-estimate 실패: %s — %s", exc.response.status_code, exc.response.text)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ERP 견적 계산 오류") from exc
    except httpx.RequestError as exc:
        logger.error("ERP quote-estimate 연결 오류: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ERP 서버에 연결할 수 없습니다.") from exc

    matched: bool = erp_data.get("matched", False)
    base_unit_price: int = erp_data.get("unit_price") or 0
    currency: str = erp_data.get("currency") or "KRW"
    quantity: int = erp_data.get("quantity") or body.quantity

    # 회원 등급 적용
    if current_user.membership_tier == "verified":
        unit_price = base_unit_price
        total_price = erp_data.get("total_price") or (base_unit_price * quantity)
    else:
        # 일반회원: 기준가 × 1.3, 수량 할인 없음, 10원 절삭
        unit_price = math.ceil(base_unit_price * 1.3 / 10) * 10
        total_price = unit_price * quantity

    lead_time_label = _get_lead_time_label(db, quantity) if matched else None

    return EstimateResponse(
        matched=matched,
        unit_price=unit_price,
        currency=currency,
        quantity=quantity,
        total_price=total_price,
        lead_time_label=lead_time_label,
    )
