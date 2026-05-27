#!/usr/bin/env python3
"""
Phase 3 통합 테스트 — 01_plan §11 체크리스트.

사전 조건:
  .env + PostgreSQL + alembic upgrade head
  scripts/setup_phase3_local.ps1 실행 또는 수동 DB 설정

실행:
  python scripts/phase3_integration_test.py
"""

from __future__ import annotations

import io
import json
import sys
import uuid

# Windows 콘솔(cp949)에서 유니코드 출력 오류 방지
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

# 프로젝트 루트
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from fastapi.testclient import TestClient
from sqlalchemy import select, text

from backend.config import get_settings
from backend.database import SessionLocal, engine
from backend.main import app
from backend.models import ContactInquiry, EmailVerificationToken, StaffLoginOtp, User
from backend.startup import seed_staff_if_needed
from backend.utils.security import hash_token

# 설정 캐시 초기화
get_settings.cache_clear()

RESULTS: list[tuple[str, bool, str]] = []
CAPTURED: dict[str, str] = {}


def record(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" - {detail}" if detail else ""))


def _write_report(*, early_exit: bool = False) -> Path:
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    failed = sum(1 for _, ok, _ in RESULTS if not ok)
    report_path = ROOT / "document" / "reports" / f"{datetime.now(timezone.utc).strftime('%Y%m%d')}_phase3_integration_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    status = "중단 (DB 미연결)" if early_exit else f"{passed} PASS / {failed} FAIL"
    lines = [
        "# Phase 3 통합 테스트 보고서\n",
        f"> 실행: {datetime.now(timezone.utc).isoformat()}\n",
        f"**결과**: {status}\n",
    ]
    if early_exit:
        lines.append(
            "\n## 조치 필요\n"
            "1. PowerShell에서 postgres 슈퍼유저 비밀번호 설정\n"
            '   `$env:POSTGRES_SUPER_PASSWORD="..." ; .\\scripts\\setup_phase3_local.ps1`\n'
            "2. `python scripts/phase3_integration_test.py` 재실행\n"
        )
    lines.append("\n| 테스트 | 결과 | 비고 |\n|--------|------|------|\n")
    for name, ok, detail in RESULTS:
        lines.append(f"| {name} | {'PASS' if ok else 'FAIL'} | {detail} |\n")
    report_path.write_text("".join(lines), encoding="utf-8")
    print(f"보고서: {report_path}")
    return report_path


def check_db() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except UnicodeDecodeError:
        record(
            "DB connection",
            False,
            "PostgreSQL 인증 실패 (비밀번호 불일치). setup_phase3_local.ps1 실행 필요",
        )
        return False
    except Exception as exc:
        msg = str(exc)
        if "password authentication failed" in msg or "인증" in msg:
            msg = "PostgreSQL 인증 실패 - POSTGRES_PASSWORD 확인 또는 setup 스크립트 실행"
        record("DB connection", False, msg[:120])
        return False


def mock_send_verification(user, raw_token, lang):
    CAPTURED["verify_token"] = raw_token


def mock_send_otp(email, otp):
    CAPTURED["admin_otp"] = otp


def mock_emails(*args, **kwargs):
    pass


def run_tests() -> int:
    print("=== Phase 3 통합 테스트 ===\n")
    if not (ROOT / ".env").exists():
        record(".env 존재", False, ".env.example 복사 또는 setup_phase3_local.ps1 실행")
        return 1

    settings = get_settings()
    if not check_db():
        print("\nDB 연결 실패 - scripts/setup_phase3_local.ps1 참고")
        _write_report(early_exit=True)
        return 1
    record("DB 연결", True)

    seed_staff_if_needed()

    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    test_email = f"phase3_test_{uid}@example.com"
    test_password = "TestPass123"

    # --- Quick Quote ---
    qq_payload = {
        "ic_package_type": "BGA",
        "pin_count": 100,
        "pitch": "0.5mm",
        "package_d": 5.0,
        "package_e": 5.0,
        "company_name": "Test Co",
        "contact_name": "Tester",
        "contact_email": f"qq_{uid}@example.com",
        "privacy_agreed": True,
        "lang": "en",
        "recaptcha_token": "dev-skip",
    }
    r = client.post("/api/quick-quote", json=qq_payload)
    record("Quick Quote POST", r.status_code == 200, f"status={r.status_code}")

    r_bad = client.post(
        "/api/quick-quote",
        json={**qq_payload, "recaptcha_token": "invalid", "contact_email": f"qq2_{uid}@example.com"},
    )
    if settings.recaptcha_skip_verify:
        record("reCAPTCHA 실패->400", True, "skip 모드 - 수동 확인 필요")
    else:
        record("reCAPTCHA 실패→400", r_bad.status_code == 400, f"status={r_bad.status_code}")

    # --- Contact ---
    contact_data = {
        "category": "test_socket",
        "company_name": "Contact Co",
        "contact_name": "Contact User",
        "contact_email": f"ct_{uid}@example.com",
        "subject": "Test inquiry",
        "message": "Phase 3 integration test message",
        "privacy_agreed": True,
        "recaptcha_token": "dev-skip",
        "lang": "en",
    }
    r = client.post(
        "/api/contact",
        data={"data": json.dumps(contact_data)},
    )
    record("Contact (첨부 없음)", r.status_code == 200, f"status={r.status_code}")

    pdf_bytes = b"%PDF-1.4 test content"
    r = client.post(
        "/api/contact",
        data={"data": json.dumps({**contact_data, "contact_email": f"ct2_{uid}@example.com"})},
        files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    record("Contact PDF 첨부", r.status_code == 200, f"status={r.status_code}")

    big = b"x" * (10 * 1024 * 1024 + 1)
    r = client.post(
        "/api/contact",
        data={"data": json.dumps({**contact_data, "contact_email": f"ct3_{uid}@example.com"})},
        files={"file": ("big.pdf", io.BytesIO(big), "application/pdf")},
    )
    record("Contact 10MB 초과 거부", r.status_code == 413, f"status={r.status_code}")

    db = SessionLocal()
    cats = db.scalars(select(ContactInquiry.category).limit(10)).all()
    record("Contact DB 저장", len(cats) >= 1, f"rows={len(cats)}")
    db.close()

    # --- Auth ---
    fixed_verify = f"fixed-verify-token-{uid}"
    fixed_otp = "123456"

    with patch("backend.routers.auth.send_verification_email", mock_send_verification):
        with patch("backend.utils.auth_email._send_email", mock_emails):
            with patch("backend.routers.auth.generate_raw_token", return_value=fixed_verify):
                r = client.post(
                    "/api/auth/register",
                    json={
                        "full_name": "Test User",
                        "company_name": "Test Corp",
                        "email": test_email,
                        "phone": "010-1234-5678",
                        "password": test_password,
                        "password_confirm": test_password,
                        "privacy_agreed": True,
                        "terms_agreed": True,
                        "recaptcha_token": "dev-skip",
                        "lang": "en",
                    },
                )
    record("회원가입", r.status_code == 201, f"status={r.status_code}")

    r_dup = client.post(
        "/api/auth/register",
        json={
            "full_name": "Dup",
            "company_name": "Dup",
            "email": test_email,
            "phone": "010",
            "password": test_password,
            "password_confirm": test_password,
            "privacy_agreed": True,
            "terms_agreed": True,
            "recaptcha_token": "dev-skip",
            "lang": "en",
        },
    )
    record("중복 email→409", r_dup.status_code == 409, f"status={r_dup.status_code}")

    r = client.post("/api/auth/login", json={"email": test_email, "password": test_password})
    record("미인증 로그인→403", r.status_code == 403, f"detail={r.json().get('detail')}")

    r = client.get(f"/api/auth/verify-email?token={fixed_verify}")
    record("이메일 인증", r.status_code == 200, f"status={r.status_code}")

    r = client.post("/api/auth/login", json={"email": test_email, "password": test_password})
    record("인증 후 로그인", r.status_code == 200, f"status={r.status_code}")
    user_token = r.json().get("access_token") if r.status_code == 200 else None

    fixed_reset = f"fixed-reset-token-{uid}"
    with patch("backend.routers.auth.send_password_reset_email", mock_emails):
        with patch("backend.routers.auth.generate_raw_token", return_value=fixed_reset):
            r = client.post(
                "/api/auth/forgot-password",
                json={"email": test_email, "lang": "en"},
            )
    record("forgot-password", r.status_code == 200, f"status={r.status_code}")

    new_pass = "NewTest456"
    r = client.post(
        "/api/auth/reset-password",
        json={
            "token": fixed_reset,
            "new_password": new_pass,
            "new_password_confirm": new_pass,
        },
    )
    record("reset-password", r.status_code == 200, f"status={r.status_code}")

    r = client.post("/api/auth/login", json={"email": test_email, "password": new_pass})
    record("재설정 후 로그인", r.status_code == 200, f"status={r.status_code}")

    # --- Admin ---
    seed_email = settings.admin_seed_email
    seed_pw = settings.admin_seed_password or "AdminTest123!"

    with patch("backend.routers.admin.send_staff_otp_email", mock_send_otp):
        with patch("backend.routers.admin.generate_otp_code", return_value=fixed_otp):
            r = client.post("/admin/api/login", json={"email": seed_email, "password": seed_pw})

    if r.status_code == 401:
        record("Admin login", False, "seed 계정 없음 - ADMIN_SEED_PASSWORD 확인 후 앱 재시작")
        admin_token = None
    else:
        record("Admin login→challenge", r.status_code == 200 and "challenge_token" in r.json(), "")
        challenge = r.json().get("challenge_token", "")
        r2 = client.post(
            "/admin/api/verify-2fa",
            json={"challenge_token": challenge, "otp_code": fixed_otp},
        )
        record("2FA 없이 JWT 불가", "access_token" not in (r.json() if r.status_code == 200 else {}), "")
        record("Admin 2FA→JWT", r2.status_code == 200, f"status={r2.status_code}")
        admin_token = r2.json().get("access_token") if r2.status_code == 200 else None

    if admin_token:
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = client.get("/admin/api/quick-quotes", headers=headers)
        record("Admin quotes 목록", r.status_code == 200, f"total={r.json().get('total')}")

        r = client.get("/admin/api/contacts", headers=headers)
        record("Admin contacts 목록", r.status_code == 200, "")

        db = SessionLocal()
        user = db.scalar(select(User).where(User.email == test_email))
        if user:
            r = client.patch(
                f"/admin/api/users/{user.id}/membership",
                headers=headers,
                json={"membership_tier": "verified"},
            )
            record("인증회원 승인", r.status_code == 200, f"tier={r.json().get('membership_tier')}")
        db.close()

        # 첨부 다운로드
        db = SessionLocal()
        ci = db.scalar(
            select(ContactInquiry)
            .where(ContactInquiry.attachment_path.isnot(None))
            .order_by(ContactInquiry.id.desc())
        )
        db.close()
        if ci:
            r = client.get(f"/admin/api/contacts/{ci.id}/attachment", headers=headers)
            record("Admin 첨부 다운로드", r.status_code == 200, f"bytes={len(r.content)}")
        else:
            record("Admin 첨부 다운로드", False, "첨부 문의 없음")

    # --- 요약 ---
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    failed = sum(1 for _, ok, _ in RESULTS if not ok)
    print(f"\n=== 결과: {passed} PASS / {failed} FAIL / {len(RESULTS)} total ===")
    _write_report()
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_tests())
