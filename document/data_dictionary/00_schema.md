# Innovo_homepage — 데이터 사전

> PostgreSQL 스키마 문서. Alembic revision과 동기화한다.

---

## `quick_quote_inquiries`

1차 Quick Quote (비회원 IC 가견적) 접수 테이블.

| 컬럼 | 타입 | NULL | 기본값 | 설명 |
|------|------|------|--------|------|
| `id` | SERIAL | NO | auto | PK |
| `ic_type` | VARCHAR(50) | YES | — | IC 기능 분류 (optional) |
| `ic_package_type` | VARCHAR(20) | NO | — | WLP / BGA / QFN / QFP / SOP |
| `ic_code` | VARCHAR(100) | YES | — | IC Part No |
| `pin_count` | INTEGER | NO | — | 핀 수 |
| `pitch` | VARCHAR(10) | NO | — | 예: `0.5mm` |
| `package_d` | NUMERIC(8,3) | NO | — | IC 가로 (mm) |
| `package_e` | NUMERIC(8,3) | NO | — | IC 세로 (mm) |
| `package_a` | NUMERIC(8,3) | YES | — | IC 높이 (mm) |
| `company_name` | VARCHAR(100) | NO | — | 회사명 |
| `contact_name` | VARCHAR(50) | NO | — | 담당자 |
| `contact_email` | VARCHAR(254) | NO | — | 이메일 |
| `contact_phone` | VARCHAR(30) | YES | — | 연락처 |
| `quantity` | INTEGER | YES | — | 수량 |
| `desired_delivery` | DATE | YES | — | 납기 희망 |
| `message` | TEXT | YES | — | 기타 요청 |
| `status` | VARCHAR(20) | NO | `pending` | `pending` \| `sent_to_erp` \| `closed` |
| `admin_note` | TEXT | YES | — | Admin 내부 메모 |
| `erp_inquiry_id` | INTEGER | YES | — | ERP inquiry_id (Phase 5) |
| `privacy_agreed_at` | TIMESTAMPTZ | NO | — | GDPR 동의 시각 |
| `created_at` | TIMESTAMPTZ | NO | `now()` | 생성 |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | 수정 |

**Revision**: `001_quick_quote`, `002_users_and_tokens` (admin_note)

**API**: `POST /api/quick-quote`, Admin `GET/PATCH /admin/api/quick-quotes/{id}`

---

## `users`

B2B 회원.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | |
| `email` | VARCHAR(254) UNIQUE | 로그인 ID |
| `password_hash` | VARCHAR(255) | bcrypt |
| `full_name` | VARCHAR(50) | |
| `company_name` | VARCHAR(100) | |
| `phone` | VARCHAR(30) | |
| `membership_tier` | VARCHAR(20) | `general` \| `verified` |
| `email_verified_at` | TIMESTAMPTZ | NULL = 미인증 |
| `verified_by_staff_id` | INTEGER | 승인 staff id |
| `verified_at` | TIMESTAMPTZ | 인증회원 승인 시각 |
| `is_active` | BOOLEAN | |
| `privacy_agreed_at` | TIMESTAMPTZ | |
| `terms_agreed_at` | TIMESTAMPTZ | |
| `last_login_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**Revision**: `002_users_and_tokens`

---

## `email_verification_tokens` / `password_reset_tokens`

| 테이블 | 만료 | 용도 |
|--------|------|------|
| `email_verification_tokens` | 24h | 가입 이메일 인증 |
| `password_reset_tokens` | 1h | 비밀번호 재설정 |

`token_hash`: SHA-256(hex), 원문은 URL에만.

---

## `contact_inquiries`

Contact 폼 문의.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `category` | VARCHAR(20) | test_socket / probe_pin / test_jig / other |
| `attachment_path` | VARCHAR(500) | `upload/contact/{id}/...` |
| `status` | VARCHAR(20) | new / in_progress / replied / closed |
| `lang` | VARCHAR(2) | en / ko |

**Revision**: `003_contact_inquiries`  
**API**: `POST /api/contact` (multipart)

---

## `staff_accounts` / `staff_login_otp`

내부 Admin 계정. `roles` JSONB: `["admin"]`, `["sales_admin"]` 등.

**Revision**: `004_staff_accounts`  
**Seed**: `ADMIN_SEED_*` env, staff 0건 시 startup 1회

---

## 향후 (Phase 4+)

| 테이블 | Phase | 비고 |
|--------|-------|------|
| ERP 마스터 | 4 | `02_plan` |
| `quote_requests` | 4 | Quote Wizard |
