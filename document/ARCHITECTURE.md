# Innovo_homepage Architecture

> 최종 갱신: 2026-07-09 (3차 코드 검토 결과 반영 — `document/reports/20260707_code_review_erp_integration.md`)

## 1. 프로젝트 개요

Innovosolution 공식 홈페이지 (www.innovosolution.co.kr)

## 2. 시스템 구조 (운영 현행)

```
[사용자 브라우저]
   │ https://www.innovosolution.co.kr
   ▼
[CloudFront  EAD1YVAYMLDS7]
   ├─ (default) ──────────────▶ S3 innovo-www-prod        · React SPA 정적 파일, /upload/* 미디어
   ├─ /api/hp/* ──────────────▶ ERP-EC2 (54.116.87.172)   · ERP 앱(socket_auto_design)의 HP API
   ├─ /api/erp/pins* ─────────▶ ERP-EC2                   · Probe Pin 공개 스펙 API
   └─ /admin/api/* ───────────▶ ERP-EC2 → nginx → :8001   · 홈페이지 백엔드 (innovo-homepage-api)

[EC2 i-0709c24299d92c883 — ERP와 홈페이지 백엔드 공존]
   ├─ ERP 앱 (socket_auto_design)      → ERP DB
   │    · /api/hp/auth·account·quick-quote·contact·wizard
   │    · 회원(hp_users)·퀵견적(homepage_inquiries)·문의·위저드 데이터 보유
   └─ innovo-homepage-api (:8001)      → innovo_homepage DB
        · /admin/api/* (staff 인증·관리 화면 API)
        · /api/auth 등 자체 라우터는 레거시 (운영 트래픽 없음)
```

### ⚠️ 이중 DB 유의사항 (2026-07-07 확인)

- **운영 쓰기 경로는 전부 ERP DB**: 회원 가입/로그인, Quick Quote, Contact, Quote Wizard 제출.
- **홈페이지 Admin(`/admin/api`)은 별도의 `innovo_homepage` DB를 조회** — ERP 전환 이전 레거시
  데이터만 보임. 인증회원 승인·문의/위저드 관리가 실데이터와 단절돼 있으며, 해소 방안(ERP에
  HP 관리 API 추가 등)은 3차 보고서 §4에서 결정 대기 중.
- Quick Quote는 ERP 내부 "홈페이지 접수" 화면(`sales.py`)에서 처리 가능. Contact·Wizard는
  현재 이메일 알림이 유일한 채널.

## 3. 기술 스택

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4 (`frontend-react/`)
  - 배포: S3 + CloudFront (`frontend-react/scripts/deploy-s3.ps1`)
  - i18n: i18next, 콘텐츠 JSON은 `frontend/content/` (구 vanilla 폴더의 content만 사용)
- **Backend (홈페이지)**: FastAPI + SQLAlchemy + Alembic, PostgreSQL(psycopg2)
  - 배포: `scripts/deploy-backend.ps1` (S3 스테이징 → SSM → systemd 재시작)
- **HP API (ERP측)**: socket_auto_design 프로젝트가 제공 — 스펙은 `document/hp_api_reference.md`
- 인증: 회원 = ERP HP JWT(access 메모리 + refresh httpOnly 쿠키), Admin = 홈페이지 백엔드
  JWT + 이메일 OTP 2FA

## 4. PostgreSQL

- 로컬·운영 모두 PostgreSQL 사용 (SQLite 미사용)
- 접속: `.env`의 `POSTGRES_*` 환경변수
- 홈페이지 DB명: `innovo_homepage` (ERP DB와 별도 — §2 유의사항 참조)
- 스키마 문서: `document/data_dictionary/`

## 5. 페이지 구성

라우팅 원본: `frontend-react/src/app/router.tsx`

- 공개: Home, About, Products(index·test-socket·probe-pin 3종·test-jig), Technology,
  Contact, Quick Quote, Downloads, Careers, Privacy/Terms (전부 `/:lang` 프리픽스, en/ko)
- 회원 전용: Account(마이페이지), Quote Wizard
- 인증: Login, Register, Forgot/Reset Password, Verify Email
- Admin (`/admin`): Dashboard, Quotes, Wizard Quotes, Contacts, Users
