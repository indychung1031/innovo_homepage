# Phase 4 기획서 — 견적 위저드 (Quote Wizard) 백엔드 연동

> **작성일**: 2026-06-04 / **업데이트**: 2026-06-06  
> **상태**: ERP 팀 확인 완료 — 홈페이지 백엔드 작업 착수 가능  
> **관련 문서**: `00_master_plan.md §7-1`, `02_plan_erp_logic_migration.md`  
> **목적**: 프론트엔드 위저드 UI와 ERP API를 연결, 실제 가 견적 계산·견적 제출·이력 조회 완성

---

## 1. 현황 요약

### 1-1. 이미 완료된 것 (프론트엔드 — 코드 확인 완료)

| 파일 | 구현 내용 | 상태 |
|------|----------|------|
| `src/pages/quote-wizard/QuoteWizardPage.tsx` | 4단계 위저드 UI 전체 | ✅ 완료 |
| `src/api/erp.ts` | ERP API 호출 함수 5개 | ✅ 완료 (모의 데이터 모드) |
| `src/features/quote-wizard/types.ts` | `WizardDraft`, `QuoteEstimateResult` 등 타입 정의 | ✅ 완료 |
| `src/features/quote-wizard/mockErp.ts` | Mock 데이터 (소켓/패키지/커버/소재/견적 계산) | ✅ 완료 |
| `src/features/quote-wizard/storage.ts` | localStorage 임시저장 | ✅ 완료 |
| `src/features/quote-wizard/recommendSocket.ts` | D/E 치수 → 소켓 자동 추천 | ✅ 완료 |
| `src/features/quote-wizard/WizardStepper.tsx` | 진행 단계 표시 컴포넌트 | ✅ 완료 |

### 1-2. 프론트엔드 API 호출 목록 (실제 구현 코드 기준)

```
GET  /api/erp/socket-types          → 소켓 패밀리 목록
GET  /api/erp/ic-package-types      → IC 패키지 타입 목록
GET  /api/erp/cover-types           → 커버 타입 목록
GET  /api/erp/material-types        → 소재 타입 목록
POST /api/erp/quote-estimate        → 가 견적 계산 (인증 필요 — authFetch)
POST /api/quote/wizard              → 견적 제출 최종 확정 (인증 필요 — authFetch)
```

### 1-3. 현재 모의 데이터 전환 조건

```
VITE_WIZARD_USE_MOCK=true   ← .env.example 기본값 (현재 상태)
VITE_WIZARD_USE_MOCK=false  ← 실제 API 연동 시 설정
```

`src/api/erp.ts` 코드:
```ts
const useMock = import.meta.env.VITE_WIZARD_USE_MOCK !== 'false';
```

`VITE_WIZARD_USE_MOCK`이 정확히 문자열 `'false'`일 때만 실제 API를 호출한다.  
Probe Pin / Test JIG 시리즈는 견적 자동 계산이 없으므로 `postQuoteEstimate`는 항상 mock 반환.

### 1-4. Vite 프록시 설정 (vite.config.ts 코드 기준)

| 프론트 요청 경로 | 실제 전달 대상 |
|----------------|--------------|
| `/api/hp/*` | ERP 서버 `http://54.116.87.172` |
| `/api/*` | 로컬 FastAPI `http://127.0.0.1:8000` |
| `/admin/api/*` | 로컬 FastAPI `http://127.0.0.1:8000` |
| `/upload/*` | 로컬 FastAPI `http://127.0.0.1:8000` |

따라서 `/api/erp/*`와 `/api/quote/wizard`는 **홈페이지 FastAPI**가 처리한다.  
홈페이지 FastAPI가 ERP `/api/public/*`을 내부에서 재호출하는 구조다 (CORS 우회).

---

## 2. Phase 4 전체 작업 목록

### 2-1. ERP 팀 확인/구현

| # | 작업 | 확인 필요 사항 |
|---|------|--------------|
| A | `GET /api/public/socket-types` | 현재 운영 서버에 존재하는지 테스트 필요 |
| B | `GET /api/public/ic-package-types` | 동일 |
| C | `GET /api/public/cover-types` | 동일 |
| D | `GET /api/public/material-types` | 동일 |
| E | `POST /api/public/quote-estimate` | 동일 — 응답 스펙 확인 필요 |

응답 스펙 (기존 `02_plan_erp_logic_migration.md §0` 확정 내용):

```json
// GET /api/public/socket-types 응답 (배열)
[
  { "socket_type_id": 1, "type_name": "Tiny", "max_ic_width": 3.0, "max_ic_length": 3.0 }
]

// GET /api/public/ic-package-types 응답 (배열)
[
  { "id": 1, "code": "WLP", "display_name": "WLP (Wafer Level Package)" }
]

// GET /api/public/cover-types 응답 (배열)
[
  { "id": 1, "code": "clamshell", "display_name": "Clamshell" }
]

// GET /api/public/material-types 응답 (배열)
[
  { "id": 1, "code": "cmf", "display_name": "CMF" }
]

// POST /api/public/quote-estimate 응답
{
  "matched": true,
  "unit_price": 150000,    // 기준가 (base_price) — 등급 조정 전
  "currency": "KRW",
  "quantity": 5,
  "total_price": 712500    // 기준가 × 수량 (등급 조정 전)
}
```

> ⚠️ **중요**: ERP `/api/public/quote-estimate`는 **기준가 기반** 단순 계산을 반환한다.  
> 회원 등급 조정 (+30% 일반회원)은 **홈페이지 FastAPI**에서 수행한다.  
> 최종 단가·총액을 프론트에 반환하기 전에 등급을 적용해야 한다.

---

### 2-2. 홈페이지 백엔드 (FastAPI) — 신규 라우터

#### 라우터 파일: `backend/routers/erp.py` (신규)

**A. 마스터 데이터 프록시 엔드포인트 (GET 4종)**

인증 불필요 — 위저드 페이지 진입 즉시 로드.

```
GET /api/erp/socket-types
GET /api/erp/ic-package-types
GET /api/erp/cover-types
GET /api/erp/material-types
```

처리 흐름:
1. 홈페이지 FastAPI가 ERP `GET /api/public/{endpoint}` 호출 (X-API-Key 헤더 추가)
2. 응답을 그대로 클라이언트에 전달
3. **선택: 짧은 인메모리 캐시 적용** (60초) — 위저드 트래픽이 ERP에 그대로 전달되지 않도록

**B. 가 견적 계산 엔드포인트**

```
POST /api/erp/quote-estimate
Authorization: Bearer {JWT}   ← 인증 필수 (authFetch)
Content-Type: application/json
```

요청 바디 (프론트 → 홈페이지):
```json
{
  "socket_type_id": 1,
  "material_type_id": 2,
  "cover_type_id": 1,
  "pin_block_type_id": null,
  "pocket_guide_type_id": null,
  "pin_count": 144,
  "quantity": 5
}
```

처리 흐름:
1. JWT 디코딩 → `user.membership_tier` 확인 (`general` or `verified`)
2. ERP `POST /api/public/quote-estimate` 호출 (X-API-Key)
3. ERP 응답 `unit_price` 기반으로 등급 조정:
   - `general`: `unit_price × 1.3` 적용, 수량 할인 없음
   - `verified`: `unit_price` 그대로, `discount_rule` 수량 할인 적용
4. 응답 반환 (보안: ERP raw `base_price` 미포함, 최종 금액만 반환)

```json
// 홈페이지 FastAPI 최종 응답
{
  "matched": true,
  "unit_price": 195000,    // general: 150000 × 1.3
  "currency": "KRW",
  "quantity": 5,
  "total_price": 975000,   // unit_price × quantity (general: 할인 없음)
  "lead_time_label": "3 Weeks"
}
```

> **납기 라벨 (`lead_time_label`)**: 홈페이지 FastAPI가 `lead_time_rules` 테이블 조회 후 추가.  
> ERP 응답에는 납기 정보 없음 — 홈페이지에서 관리.

---

#### 라우터 파일: `backend/routers/quote.py` (신규 또는 기존 확장)

**C. 견적 제출 엔드포인트**

```
POST /api/quote/wizard
Authorization: Bearer {JWT}   ← 인증 필수 (회원만 가능)
Content-Type: application/json
```

요청 바디 (`WizardSubmitPayload` 타입 — `src/api/erp.ts` 기준):
```json
{
  "lang": "en",
  "series": "test_socket",
  "ic_type": "Memory",
  "ic_code": "PROJECT-001",
  "ic_package_code": "BGA",
  "dimension_d": 10.0,
  "dimension_e": 10.0,
  "dimension_a": 1.2,
  "pitch": "0.5",
  "pin_count": 144,
  "socket_type_id": 3,
  "socket_type_name": "ExMini",
  "quantity": 5,
  "cover_type_id": 1,
  "material_type_id": 1,
  "spec_notes": "특이사항 없음",
  "estimate": {
    "matched": true,
    "unit_price": 150000,
    "currency": "KRW",
    "quantity": 5,
    "total_price": 750000,
    "lead_time_label": "3 Weeks"
  },
  "contact_name": "홍길동",
  "contact_company": "(주) 테스트",
  "contact_email": "test@example.com",
  "contact_phone": "010-1234-5678"
}
```

처리 흐름:
1. JWT 인증 확인 (비회원 차단 → 401)
2. `wizard_quotes` 테이블에 견적 데이터 저장 → `quote_id` 생성
3. 고객에게 접수 확인 이메일 발송 (Mailnara SMTP)
4. `sbchung@innovotech.co.kr`에 신규 견적 접수 알림 이메일 발송
5. `{ "message": "Quote request received." }` 반환

---

### 2-3. 홈페이지 DB 스키마 — 신규 테이블

#### `wizard_quotes` 테이블

```sql
CREATE TABLE wizard_quotes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- 탈퇴 시 NULL
    status          VARCHAR NOT NULL DEFAULT 'pending',
        -- 허용값: pending | reviewing | quoted | completed | expired
    lang            VARCHAR NOT NULL DEFAULT 'en',
    series          VARCHAR NOT NULL,             -- test_socket | probe_pin | test_jig
    ic_type         VARCHAR NOT NULL,
    ic_code         VARCHAR NOT NULL,
    ic_package_code VARCHAR NOT NULL,
    dimension_d     FLOAT,
    dimension_e     FLOAT,
    dimension_a     FLOAT,
    pitch           VARCHAR,
    pin_count       INTEGER,
    socket_type_id  INTEGER,
    socket_type_name VARCHAR,
    quantity        INTEGER NOT NULL,
    cover_type_id   INTEGER,
    material_type_id INTEGER,
    spec_notes      TEXT,
    attachment_name VARCHAR,                      -- 파일명만 저장 (Phase 4 실제 업로드 미구현)
    matched         BOOLEAN NOT NULL DEFAULT FALSE,
    unit_price      INTEGER,
    currency        VARCHAR DEFAULT 'KRW',
    total_price     INTEGER,
    lead_time_label VARCHAR,
    contact_name    VARCHAR NOT NULL,
    contact_company VARCHAR NOT NULL,
    contact_email   VARCHAR NOT NULL,
    contact_phone   VARCHAR,
    membership_tier VARCHAR NOT NULL DEFAULT 'general',  -- 견적 시점 등급 기록
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at      TIMESTAMP WITH TIME ZONE
        GENERATED ALWAYS AS (created_at + INTERVAL '7 days') STORED
);
```

상태(status) 전이:
```
pending → reviewing → quoted → completed
                    ↘ expired  (7일 경과 또는 수동)
```

> **탈퇴 처리**: `user_id` → NULL, `contact_name`/`contact_email`/`contact_phone`/`contact_company` → `'탈퇴회원'` (익명화)  
> 비식별 기록은 5년 보관 (전자상거래법 / `00_master_plan §7-3`)

---

#### `lead_time_rules` 테이블

```sql
CREATE TABLE lead_time_rules (
    id               SERIAL PRIMARY KEY,
    socket_type      VARCHAR NOT NULL,    -- tiny | mini | exmini | large30 | large36 | ... | all
    qty_min          INTEGER NOT NULL DEFAULT 1,
    qty_max          INTEGER,             -- NULL = 상한 없음
    lead_time_label  VARCHAR NOT NULL,    -- "3 Weeks", "2 Months" 등 자유 텍스트
    note             TEXT
);
```

초기 seed 데이터:

| socket_type | qty_min | qty_max | lead_time_label |
|-------------|---------|---------|-----------------|
| all | 1 | 20 | 3 Weeks |
| all | 21 | NULL | 담당자 확인 후 안내 |

> 운영 중 Admin에서 행 추가/수정으로 유연하게 변경 가능.  
> 조회 시: 소켓 종류 매칭 우선, 없으면 `socket_type='all'` 폴백.

---

## 3. 관리자 대시보드 (`/admin/dashboard`)

### 3-1. 표시 지표

| 지표 | 계산 방법 | 업데이트 주기 |
|------|----------|-------------|
| 이번 달 신규 견적 건수 | `wizard_quotes.created_at >= 이번달 1일` | 페이지 로드 시 |
| 이번 달 신규 회원 수 | `users.created_at >= 이번달 1일` | 페이지 로드 시 |
| 전체 인증회원 수 | `users WHERE membership_tier = 'verified'` | 페이지 로드 시 |
| 이번 달 문의 건수 | `contact_inquiries.created_at >= 이번달 1일` | 페이지 로드 시 |
| 만료 임박 견적 수 | `wizard_quotes WHERE expires_at <= NOW() + 2 days AND status = 'pending'` | 페이지 로드 시 |
| 처리 대기 견적 수 | `wizard_quotes WHERE status = 'pending'` | 페이지 로드 시 |

### 3-2. 신규 백엔드 엔드포인트

```
GET /admin/api/dashboard/stats
Authorization: Bearer {Admin JWT}
```

응답:
```json
{
  "monthly_quotes": 12,
  "monthly_new_users": 5,
  "verified_users": 23,
  "monthly_contacts": 8,
  "expiring_quotes": 2,
  "pending_quotes": 7
}
```

### 3-3. 신규 프론트엔드 페이지

파일: `src/pages/admin/AdminDashboardPage.tsx` (신규)

- 6개 지표를 카드 그리드로 표시
- 각 카드에서 해당 목록 페이지로 링크 (`/admin/quotes`, `/admin/users`, `/admin/contacts`)
- 만료 임박 견적이 있으면 황색 경고 카드

---

## 4. 견적 이력 (마이페이지 — AccountPage)

> ERP 팀 `09_erp_task` 작업 #4: `GET /api/hp/account/quotes` 이미 구현 완료.

### 4-1. 현재 상태 확인 필요

`AccountPage.tsx`가 이미 존재하는지 확인 필요.  
없으면 Phase 4에서 신규 생성. 있으면 견적 이력 섹션 추가.

URL: `/{lang}/account`

### 4-2. 호출 API

```
GET /api/hp/account/quotes
Authorization: Bearer {JWT}
```

Vite 프록시: `/api/hp/*` → ERP 서버 `http://54.116.87.172`

ERP 응답 (예상):
```json
{
  "items": [
    {
      "id": 1,
      "series": "test_socket",
      "ic_code": "PROJECT-001",
      "socket_type_name": "ExMini",
      "quantity": 5,
      "total_price": 750000,
      "status": "pending",
      "created_at": "2026-06-04T10:00:00Z"
    }
  ]
}
```

> **주의**: ERP `/api/hp/account/quotes`가 실제로 `wizard_quotes` 테이블을 읽는지,  
> 아니면 ERP 자체 견적 테이블을 읽는지 ERP 팀에 확인 필요.  
> 홈페이지 `wizard_quotes`를 읽어야 한다면 별도 홈페이지 FastAPI 엔드포인트 필요.

---

## 5. 파일 첨부 처리 (Phase 4 MVP 방침)

현재 프론트엔드 구현:
- Step 2에 파일 선택 UI 있음 (DXF, PDF, STEP, ZIP — 최대 10MB)
- `draft.attachment_name`에 파일명만 저장됨
- `WizardSubmitPayload`에 파일 데이터 포함 안 됨

**Phase 4 MVP 결정**:
- 파일명을 `wizard_quotes.attachment_name`에 저장
- 실제 파일은 업로드하지 않음
- 이메일 안내 문구 추가: "도면 파일이 있으신 경우 `sbchung@innovotech.co.kr`로 직접 첨부해 주세요."
- 실제 S3 업로드는 Phase 5 또는 별도 태스크로 처리

`WizardSubmitPayload` 수정 필요: `attachment_name` 필드 추가.

```ts
export type WizardSubmitPayload = {
  // ... (기존 필드)
  attachment_name: string;   // 추가 필요
};
```

`handleSubmit` 함수 (`QuoteWizardPage.tsx`) 수정 필요: `attachment_name: draft.attachment_name.trim()` 추가.

---

## 6. 이메일 발송 정책

### 6-1. 고객 접수 확인 이메일

- 발신: `sbchung@innovotech.co.kr` (Mailnara SMTP)
- 수신: `contact_email`
- 제목: `[Innovo Solution] Quote Request Received — {ic_code}` (lang=en)  
         `[이노보솔루션] 견적 접수 완료 — {ic_code}` (lang=ko)
- 내용: IC 코드, 소켓 종류, 수량, 가 견적 금액, 유효기간(7일), 담당자 연락처

### 6-2. 내부 영업팀 알림 이메일

- 발신: `sbchung@innovotech.co.kr`
- 수신: `sbchung@innovotech.co.kr` (SALES_NOTIFY_EMAIL env)
- 제목: `[새 견적 요청] {contact_company} — {ic_code}`
- 내용: 전체 견적 정보 + 관리자 페이지 링크 (`/admin/quotes/{id}`)

### 6-3. 상태 변경 알림 이메일

관리자가 `/admin/quotes/{id}` 에서 상태를 변경할 때:
- 고객 + `sbchung@innovotech.co.kr` 동시 발송
- 상태별 메시지:
  - `reviewing` → "견적 검토 중입니다"
  - `quoted` → "공식 견적이 발행되었습니다"
  - `completed` → "견적이 완료되었습니다"
  - `expired` → "견적 유효기간이 만료되었습니다"

### 6-4. 만료 2일 전 알림

- 스케줄러 또는 조회 시점 계산 방식으로 구현
- Phase 4 MVP: FastAPI startup event 또는 APScheduler로 매일 오전 9시 실행 (KST)

---

## 7. Mock → 실제 연동 전환 체크리스트

전환 전 모두 완료되어야 한다.

| 순서 | 조건 | 확인 방법 |
|------|------|---------|
| 1 | ERP `/api/public/socket-types` 응답 확인 | `curl -H "X-API-Key: ..." http://54.116.87.172/api/public/socket-types` |
| 2 | ERP `/api/public/ic-package-types` 응답 확인 | 동일 |
| 3 | ERP `/api/public/cover-types` 응답 확인 | 동일 |
| 4 | ERP `/api/public/material-types` 응답 확인 | 동일 |
| 5 | ERP `/api/public/quote-estimate` POST 응답 확인 | 샘플 바디로 테스트 |
| 6 | 홈페이지 FastAPI `GET /api/erp/socket-types` 구현 완료 | dev 서버에서 직접 호출 |
| 7 | 홈페이지 FastAPI `POST /api/erp/quote-estimate` 구현 완료 (등급 조정 포함) | 인증 토큰으로 테스트 |
| 8 | 홈페이지 FastAPI `POST /api/quote/wizard` 구현 완료 | dev 서버에서 직접 호출 |
| 9 | `wizard_quotes` 테이블 Alembic 마이그레이션 실행 완료 | DB 테이블 존재 확인 |
| 10 | `lead_time_rules` seed 데이터 적재 완료 | `SELECT * FROM lead_time_rules` |
| 11 | Mailnara SMTP 이메일 발송 테스트 완료 | 테스트 이메일 수신 확인 |
| → | `.env`에 `VITE_WIZARD_USE_MOCK=false` 설정 | `npm run dev` 후 위저드 실제 호출 확인 |

---

## 8. 작업 분담 및 순서

### 8-1. ERP 팀 선행 작업

| # | 작업 | 내용 |
|---|------|------|
| ERP-1 | `GET /api/public/socket-types` 확인 | 응답 스펙 확인 및 테스트 |
| ERP-2 | `GET /api/public/ic-package-types` 확인 | 동일 |
| ERP-3 | `GET /api/public/cover-types` 확인 | 동일 |
| ERP-4 | `GET /api/public/material-types` 확인 | 동일 |
| ERP-5 | `POST /api/public/quote-estimate` 확인 | 요청/응답 스펙 최종 확인 |

> ERP 팀 결과 수신 후 홈페이지 백엔드 작업 착수.

### 8-2. 홈페이지 팀 작업 순서

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | Alembic 마이그레이션: `wizard_quotes` + `lead_time_rules` 테이블 | `database/migrations/` |
| 2 | `backend/models.py` — `WizardQuote`, `LeadTimeRule` 클래스 추가 | `backend/models.py` |
| 3 | `backend/routers/erp.py` 신규 — 마스터 데이터 프록시 4개 엔드포인트 | `backend/routers/erp.py` |
| 4 | `backend/routers/erp.py` — `POST /api/erp/quote-estimate` (등급 조정 로직 포함) | 동일 |
| 5 | `backend/routers/quote.py` 신규 — `POST /api/quote/wizard` (저장 + 이메일) | `backend/routers/quote.py` |
| 6 | `src/api/erp.ts` — `WizardSubmitPayload`에 `attachment_name` 추가 | `src/api/erp.ts` |
| 7 | `src/pages/quote-wizard/QuoteWizardPage.tsx` — `handleSubmit`에 `attachment_name` 추가 | `QuoteWizardPage.tsx` |
| 8 | `.env` — `VITE_WIZARD_USE_MOCK=false` 설정 + 전체 위저드 흐름 테스트 | `.env` |
| 9 | `src/pages/admin/AdminDashboardPage.tsx` 신규 | `AdminDashboardPage.tsx` |
| 10 | `backend/routers/admin.py` — `GET /admin/api/dashboard/stats` 추가 | `admin.py` |
| 11 | `src/pages/account/AccountPage.tsx` — 견적 이력 섹션 확인/추가 | `AccountPage.tsx` |
| 12 | Admin 견적 상세 페이지 — 상태 변경 + 이메일 발송 | `AdminQuoteDetailPage.tsx` |

---

## 9. ERP 팀 확인 결과 (2026-06-06)

| 요청 | 결과 | 처리 방침 |
|------|------|---------|
| api/public 5개 엔드포인트 | ✅ 운영 서버 배포 완료. 필드명 수정 후 재배포 대기 중 (2026-06-06) | 재배포 후 테스트 |
| quote-estimate unit_price 기준 | ✅ 회원 등급 미반영 기준가 (수량 할인만 적용). 홈페이지에서 일반회원 ×1.3 적용 | 기획 그대로 진행 |
| /api/hp/account/quotes 데이터 소스 | Case A — ERP `homepage_inquiries` 테이블(Quick Quote 경로)에서 읽음 | 아래 방침 참조 |

### ERP 코드 수정 내역 (2026-06-06 — master push 완료, 배포 대기 중)

| # | 엔드포인트 | 변경 내용 | 프론트엔드 영향 |
|---|-----------|---------|--------------|
| 1 | `GET /api/public/ic-package-types` | `ic_package_type_id` → `id` | ✅ 없음 — 프론트 `MasterOption.id` 와 이미 일치 |
| 2 | `GET /api/public/cover-types` | `id · code · display_name` 형식으로 통일 | ✅ 없음 — `MasterOption` 타입과 이미 일치 |
| 3 | `GET /api/public/material-types` | 동일 | ✅ 없음 |
| 4 | `POST /api/public/quote-estimate` 요청 | `pin_block_type_id` 필수 → Optional (null 허용), SQL 조건도 함께 수정 | ✅ 없음 — `EstimateRequest.pin_block_type_id?: number \| null` 으로 이미 선언됨 |

### 요청 3 처리 방침 — 확정

위저드 견적 이력은 **홈페이지 FastAPI가 직접 서빙**한다. ERP 추가 작업 불필요.

- 이유: 위저드 데이터 구조(`socket_type_id`, `dimension_d/e/a`, `cover_type_id`, `estimate` 등)가 Quick Quote와 완전히 달라 `homepage_inquiries`에 합치면 스키마 오염이 발생함
- 신규 엔드포인트: `GET /api/quote/history` (홈페이지 FastAPI → `wizard_quotes` 테이블 직접 조회)
- AccountPage는 두 섹션으로 분리:
  - **Quick Quote 이력**: `GET /api/hp/account/quotes` (기존 ERP API 유지)
  - **견적 위저드 이력**: `GET /api/quote/history` (홈페이지 FastAPI 신규)

---

## 10. 테스트 체크리스트 (Phase 4 완료 기준)

### 위저드 흐름

- [ ] 로그인하지 않은 상태에서 위저드 접근 시 로그인 페이지로 리다이렉트
- [ ] Step 1: 소켓 타입 목록이 ERP 실데이터로 표시됨
- [ ] Step 1: IC D/E 입력 → 소켓 자동 추천 작동
- [ ] Step 2: 커버 타입 / 소재 타입 목록이 ERP 실데이터로 표시됨
- [ ] Step 3 (일반회원): 가 견적 금액이 기준가 +30% 적용된 값으로 표시됨
- [ ] Step 3 (인증회원): 가 견적 금액이 기준가 그대로 표시됨
- [ ] Step 3: 납기 라벨이 `lead_time_rules` 기반으로 표시됨
- [ ] Step 4 → 제출: `wizard_quotes` DB에 저장 확인
- [ ] 제출 후 고객 이메일 수신 확인 (`contact_email`)
- [ ] 제출 후 영업팀 이메일 수신 확인 (`sbchung@innovotech.co.kr`)
- [ ] Probe Pin / Test JIG: Step 3에 "담당자 확인 후 안내" 표시 (금액 없음)

### 관리자 기능

- [ ] `/admin/dashboard` 접속 시 6개 지표 카드 표시
- [ ] `/admin/quotes` 목록에 신규 제출 견적 표시
- [ ] 견적 상태 변경 시 고객 이메일 발송 확인
- [ ] 만료 임박 견적 카드에 황색 경고 표시

### 보안

- [ ] 비로그인 상태에서 `POST /api/erp/quote-estimate` 호출 → 401
- [ ] 비로그인 상태에서 `POST /api/quote/wizard` 호출 → 401
- [ ] API 응답에 raw `base_price` 또는 `service_cost_logic` 데이터 미포함 확인
