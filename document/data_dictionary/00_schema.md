# Innovo_homepage — 데이터 사전

> PostgreSQL 스키마 문서. Alembic revision과 동기화한다.

> ⚠️ **운영 데이터 위치 주의 (2026-07-07 3차 검토)**: 프론트엔드가 ERP HP API(`/api/hp/*`)로
> 전환된 이후, 회원·퀵견적·문의·위저드의 **운영 데이터는 ERP DB**(`hp_users`,
> `homepage_inquiries`, ERP측 `contact_inquiries`·`wizard_quotes`)에 쌓인다.
> 본 문서의 테이블들은 홈페이지 자체 DB(`innovo_homepage`)로, 현재 `/admin/api`와
> staff 계정만 실사용 중이다. 상세: `document/reports/20260707_code_review_erp_integration.md` §0.

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
| `product_category` | VARCHAR(30) | YES | — | test_socket / probe_pin / test_jig / other (007) |
| `status` | VARCHAR(20) | NO | `pending` | `pending` \| `sent_to_erp` \| `closed` |
| `admin_note` | TEXT | YES | — | Admin 내부 메모 |
| `erp_inquiry_id` | INTEGER | YES | — | ERP inquiry_id (Phase 5) |
| `privacy_agreed_at` | TIMESTAMPTZ | NO | — | GDPR 동의 시각 |
| `created_at` | TIMESTAMPTZ | NO | `now()` | 생성 |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | 수정 |

**Revision**: `001_quick_quote`, `002_users_and_tokens` (admin_note), `007_quick_quote_product_category`

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

## `wizard_quotes`

Quote Wizard 제출 기록 (Phase 4, revision `005_wizard_quotes` + `006_wizard_admin_note`).

> ⚠️ 운영에서 위저드 제출은 ERP `POST /api/hp/wizard/submit` → **ERP DB의 동명 테이블**에
> 저장된다. 이 테이블은 ERP 전환 이전(홈페이지 자체 제출 경로 시절)의 기록만 보유.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | |
| `user_id` | INTEGER FK(users) ON DELETE SET NULL | 제출 회원 |
| `status` | VARCHAR(20) | `pending` 등 — Admin에서 전환 |
| `lang` | VARCHAR(2) | en / ko |
| `series` | VARCHAR(20) | test_socket / probe_pin / test_jig |
| `ic_type` / `ic_code` / `ic_package_code` | VARCHAR | IC 정보 |
| `dimension_d` / `dimension_e` / `dimension_a` | NUMERIC(8,3) | IC 치수 (mm) |
| `pitch` | VARCHAR(20) | |
| `pin_count` | INTEGER | |
| `socket_type_id` / `socket_type_name` | INTEGER / VARCHAR(100) | 추천 소켓 |
| `quantity` | INTEGER | |
| `cover_type_id` / `material_type_id` | INTEGER | 옵션 |
| `spec_notes` | TEXT | 추가 요구사항 |
| `attachment_name` | VARCHAR(255) | 파일명만 저장 (실파일 미전송 — 기획서 §13) |
| `matched` | BOOLEAN | 견적 매칭 여부 |
| `unit_price` / `total_price` | INTEGER | 제출 시점 견적 스냅샷 |
| `currency` | VARCHAR(10) | 기본 KRW |
| `lead_time_label` | VARCHAR(100) | 납기 라벨 |
| `contact_*` | VARCHAR | 이름·회사·이메일·연락처 |
| `membership_tier` | VARCHAR(20) | 제출 시점 등급 스냅샷 |
| `admin_note` | TEXT | Admin 내부 메모 (006) |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

## `lead_time_rules`

납기 규칙 — 소켓 종류 × 수량 구간별 납기 라벨 (revision `005_wizard_quotes`).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | SERIAL PK | |
| `socket_type` | VARCHAR(50) | 소켓 종류 |
| `qty_min` / `qty_max` | INTEGER | 수량 구간 (`qty_max` NULL = 무제한) |
| `lead_time_label` | VARCHAR(100) | 예: `3 Weeks` |
| `note` | TEXT | 비고 |

---

## 향후 (Phase 4+)

| 테이블 | Phase | 비고 |
|--------|-------|------|
| ERP 마스터 | 4 | `02_plan` — ERP API 방식으로 대체되어 이식 불필요 확정 |
