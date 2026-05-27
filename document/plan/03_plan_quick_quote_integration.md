# 03. 홈페이지 IC 가견적 기능 — 개발 기획서

**작성일**: 2026-05-26  
**최종 수정**: 2026-05-21 (마스터 §4-5 Sitemap·Phase 매핑 동기화)  
**대상**: Innovo_homepage 개발자 + socket_auto_design 개발자  
**연관 시스템**: `socket_auto_design` (내부 ERP)  
**목적**: 홈페이지에서 고객이 IC 규격을 입력 → ERP 영업 대시보드 접수함으로 전달 → 영업팀이 검토 후 정식 견적서 작성

> **마스터 플랜 위치**: `00_master_plan.md §7-0` — 1차 견적 채널 (비회원 Quick Quote)  
> 2차 회원 견적 위저드는 `00_master_plan.md §7-1` 및 `document/plan/02_plan_erp_logic_migration.md` 참조  
> 이 문서의 Phase 1/2/3는 마스터 플랜 **Phase 3(Ph1) / Phase 5(Ph2) / Phase 5+(Ph3, 선택)** 에 해당

---

## 1. 전체 흐름

```
[고객] 홈페이지 가견적 폼 작성 및 제출
    ↓
[Innovo_homepage] DB 저장 + 영업팀 이메일 알림 + 고객 접수 확인 이메일
    ↓
[socket_auto_design] ERP Sales 대시보드 → [홈페이지 접수] 탭에 표시
    ↓
[영업팀] 접수 내용 검토 → 고객사 등록(신규) 또는 선택(기존) → [견적서 작성] 클릭
    ↓
[socket_auto_design] IC 규격이 pre-fill된 견적 작성 폼 열림
    ↓
[영업팀] 품목·수량·단가 입력 → 정식 견적서 발행
```

### 왜 ERP 견적서 자동 생성이 아닌가?

홈페이지에서 수집하는 정보만으로는 ERP 견적서를 완성할 수 없습니다.

| ERP 견적서 필수 항목 | 홈페이지 제공 여부 | 이유 |
|---------------------|-----------------|------|
| `customer_id` (ERP 고객 ID) | ❌ 없음 | 홈페이지 고객은 ERP에 미등록 |
| `user_id` (담당 영업사원) | ❌ 없음 | 배정 전 |
| `product_groups` / 견적 품목·단가 | ❌ 없음 | 영업팀이 직접 산정 |
| IC 규격 (`pin_count`, `pitch`, `package_d/e`) | ✅ 있음 | 홈페이지 폼에서 수집 |

→ 홈페이지 정보는 **설계 기본자료 pre-fill**에만 활용하고, 나머지는 영업팀이 ERP에서 완성합니다.

---

## 2. 개발 단계

| Phase | 범위 | 시점 |
|-------|------|------|
| **Phase 1** | 홈페이지 폼 + DB 저장 + 이메일 알림 | 지금 바로 구현 |
| **Phase 2** | ERP API 연동 — 접수 데이터를 ERP로 전송 + Sales 대시보드 [홈페이지 접수] 탭 | 홈페이지 Phase 1 완료 후 |
| **Phase 3** | 고급 검색 폼 — `ic_type` 등 추가 파라미터 입력 지원 | Phase 2 완료 후 |

---

## 3. 수집할 입력 필드

### 3-1. IC 규격 (필수)

| 필드명 | 표시명 (UI) | 타입 | 입력 예시 | 비고 |
|--------|------------|------|---------|------|
| `ic_package_type` | IC 패키지 타입 | Select | WLP / BGA / QFN / QFP / SOP | ERP `IcPackageType.code` 와 일치 |
| `ic_code` | IC Code (Part No) | Text | STM32F103C8T6 | ERP 설계 폼 `ic_code` 와 동일 용도 |
| `pin_count` | 핀 수 | Number | 48, 100, 256 | 양의 정수 |
| `pitch` | 피치 (핀 간격) | Select + 직접입력 | 0.4 / 0.5 / 0.65 / 0.8 / 1.0mm | ERP `QuoteInfo.pitch` |
| `package_d` | IC 가로 크기 D (mm) | Number | 5.00 | 소수점 2자리 |
| `package_e` | IC 세로 크기 E (mm) | Number | 5.00 | 소수점 2자리 |
| `package_a` | IC 높이 A (mm) | Number | 1.20 | 소켓 cavity 높이 결정에 필요 |

> **공차(tolerance)**: 홈페이지에서는 받지 않음 → ERP 견적 전환 시 기본값 ±0.10mm 자동 적용  
> **`ic_type`**: 기본 폼에서는 수집하지 않음 → §3-4 고급 검색(Phase 3) 참조

### 3-2. 고객 정보 (필수)

| 필드명 | 표시명 (UI) | 타입 | 비고 |
|--------|------------|------|------|
| `company_name` | 회사명 | Text | |
| `contact_name` | 담당자 이름 | Text | |
| `contact_email` | 이메일 | Email | 접수 확인 이메일 발송용 |
| `contact_phone` | 연락처 | Tel | 선택 |

### 3-3. 추가 정보 (선택)

| 필드명 | 표시명 (UI) | 타입 | 비고 |
|--------|------------|------|------|
| `quantity` | 수량 | Number | 예: 500 pcs |
| `desired_delivery` | 납기 희망일 | Date | |
| `message` | 기타 요청사항 | Textarea | |

### 3-4. 고급 검색 추가 파라미터 (Phase 3 — 향후)

기본 폼 하단의 **[+ 고급 파라미터 입력]** 링크를 클릭하면 추가 필드 영역이 펼쳐집니다.  
기본 폼 제출 시 이 필드들은 전송되지 않으며 DB에 `NULL`로 저장됩니다.

| 필드명 | 표시명 (UI) | 타입 | 입력 예시 | 비고 |
|--------|------------|------|---------|------|
| `ic_type` | IC Type (기능 분류) | Select | Memory / Logic / Power IC / PMIC / Mixed-Signal / Other | IC 기능 분류 |
| (TBD) | 추가 파라미터 | - | - | Phase 3 기획 시 협의 |

**DB 처리**: `quick_quote_inquiries.ic_type` 컬럼에 저장 (nullable — 기본 폼 제출 시 NULL)  
**ERP 전달**: Phase 3 시점에 ERP `homepage_inquiries` 테이블에 `ic_type VARCHAR(50)` 컬럼 추가 + 외부 API Request Body에 `ic_type` 필드 추가 (Alembic revision 필요 — socket_auto_design 담당)

### 3-5. 동의 항목 (필수)

| 필드명 | 표시명 (UI) | 타입 | 비고 |
|--------|------------|------|------|
| `privacy_agreed` | 개인정보 수집 및 이용 동의 | Checkbox | 미동의 시 제출 불가 — 개인정보처리방침 링크 포함 |

---

## 4. Phase 1 — 홈페이지 처리 (이메일 + DB)

### 4-1. 흐름

```
고객 폼 제출
    ↓
POST /api/quick-quote   (Innovo_homepage FastAPI)
    ↓
홈페이지 DB 저장  →  quick_quote_inquiries 테이블
    ↓
이메일 발송 (동시 처리)
  ├─ 영업팀 알림  →  sbchung@innovotech.co.kr
  └─ 고객 접수 확인  →  contact_email
```

### 4-2. DB 테이블 설계 — `quick_quote_inquiries`

```sql
CREATE TABLE quick_quote_inquiries (
    id                SERIAL       PRIMARY KEY,
    -- IC 규격
    ic_type           VARCHAR(50),              -- 예: "Memory", "Power IC"
    ic_package_type   VARCHAR(20)  NOT NULL,    -- 예: "BGA"
    ic_code           VARCHAR(100),             -- IC Part No (예: STM32F103C8T6)
    pin_count         INTEGER      NOT NULL,
    pitch             VARCHAR(10)  NOT NULL,    -- 예: "0.5mm"
    package_d         NUMERIC(8,3) NOT NULL,    -- mm (가로)
    package_e         NUMERIC(8,3) NOT NULL,    -- mm (세로)
    package_a         NUMERIC(8,3),             -- mm (높이 A)
    -- 고객 정보
    company_name      VARCHAR(100) NOT NULL,
    contact_name      VARCHAR(50)  NOT NULL,
    contact_email     VARCHAR(254) NOT NULL,    -- RFC 5321 기준 최대 254자
    contact_phone     VARCHAR(30),
    -- 추가 정보
    quantity          INTEGER,
    desired_delivery  DATE,
    message           TEXT,
    -- 처리 상태
    status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
                      -- pending | sent_to_erp | closed
    erp_inquiry_id    INTEGER,                  -- Phase 2: ERP homepage_inquiries.inquiry_id 저장
    -- 동의
    privacy_agreed_at TIMESTAMP    NOT NULL,             -- 동의 시각 기록 (GDPR 증적)
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### 4-3. API 엔드포인트

```
POST /api/quick-quote
Content-Type: application/json

Request Body:
{
  "ic_package_type": "BGA",
  "ic_code": "STM32F103C8T6",          // optional
  "pin_count": 100,
  "pitch": "0.5mm",
  "package_d": 10.00,
  "package_e": 10.00,
  "package_a": 1.20,                   // optional — IC 높이 (mm)
  "company_name": "테스트 반도체",
  "contact_name": "홍길동",
  "contact_email": "hong@test.com",
  "contact_phone": "010-1234-5678",   // optional
  "quantity": 500,                     // optional
  "desired_delivery": "2026-07-01",   // optional
  "message": "샘플 우선 요청",          // optional
  "recaptcha_token": "03AGdBq...",      // 필수 — reCAPTCHA v3 토큰
  "privacy_agreed": true,               // 필수 — false 또는 누락 시 400 반환
  "lang": "ko",                          // 필수 — "en" 또는 "ko" (고객 확인 이메일 언어 결정)
  "ic_type": "Memory"                   // Phase 3 전용 optional — 고급 검색 시에만 전송
}

Response 200:
{
  "success": true,
  "inquiry_id": 42,
  "message": "가견적 요청이 접수되었습니다. 영업팀이 1-2 영업일 내 연락드립니다."
}
```

### 4-4. 이메일 내용

**영업팀 수신 이메일**
```
제목: [홈페이지 가견적 접수] BGA / 100핀 / 10.0×10.0mm — 테스트 반도체

── IC 규격 ─────────────────────────────
패키지 타입 : BGA
IC Code     : STM32F103C8T6
핀 수       : 100 pin
피치        : 0.5mm
크기        : D=10.00mm / E=10.00mm / A(높이)=1.20mm

── 고객 정보 ───────────────────────────
회사명      : 테스트 반도체
담당자      : 홍길동
이메일      : hong@test.com
연락처      : 010-1234-5678

── 추가 정보 ───────────────────────────
수량        : 500 pcs
납기 희망   : 2026-07-01
기타 요청   : 샘플 우선 요청

── 처리 안내 ───────────────────────────
ERP 대시보드 [홈페이지 접수] 탭에서 확인 후 견적서를 작성해 주세요.
ERP URL: {ERP_API_BASE_URL}  ← .env 환경변수 값으로 치환
```

> Phase 3(고급 검색) 구현 시: `ic_type` 값이 있으면 `IC Type : Memory` 행 추가, 없으면 생략

**고객 접수 확인 이메일**
```
제목: [이노보솔루션] 가견적 요청이 접수되었습니다

안녕하세요, 홍길동님.
이노보솔루션에 가견적 요청이 접수되었습니다.
담당자가 1-2 영업일 내 연락드리겠습니다.

접수 내용:
  IC 패키지 : BGA / 100핀 / 0.5mm pitch
  IC Code   : STM32F103C8T6
  IC 크기   : D=10.00mm × E=10.00mm × A=1.20mm

문의: sbchung@innovotech.co.kr
```

---

## 5. Phase 2 — ERP 접수함 연동

> **선행 조건**: Phase 1 완료 + socket_auto_design에 아래 작업 완료

### 5-1. 흐름

```
홈페이지 POST /api/quick-quote (Phase 1 처리)
    ↓
socket_auto_design POST /api/external/inquiry  (API Key 인증)
    ↓
ERP: homepage_inquiries 테이블에 저장
    ↓
ERP 반환 → erp_inquiry_id 홈페이지 DB에 저장 (status: "sent_to_erp")
    ↓
영업팀: Sales 대시보드 [홈페이지 접수] 탭에서 확인
    ↓
[견적서 작성] 클릭
    ↓
IC 규격 pre-fill된 견적 작성 폼 오픈
    ↓
영업팀: 고객사 선택/등록, 품목·단가 입력 → 견적서 발행
```

### 5-2. Phase 2 ERP API 스펙

```
POST /api/external/inquiry
Headers:
  X-API-Key: {ERP_API_KEY}
  Content-Type: application/json

Request Body:
{
  "ic_package_type_code": "BGA",
  "ic_code": "STM32F103C8T6",
  "pin_count": 100,
  "pitch": "0.5mm",
  "package_d": 10.00,
  "package_e": 10.00,
  "package_a": 1.20,
  "company_name": "테스트 반도체",
  "contact_name": "홍길동",
  "contact_email": "hong@test.com",
  "contact_phone": "010-1234-5678",
  "quantity": 500,
  "desired_delivery": "2026-07-01",
  "message": "샘플 우선 요청",
  "source": "homepage",
  "ic_type": "Memory"                  // Phase 3 전용 optional — 고급 검색 시에만 포함
}

Response 201:
{
  "inquiry_id": 15,
  "status": "pending"
}
```

### 5-3. socket_auto_design 개발 작업 목록

> **이 항목은 socket_auto_design 담당 개발자가 처리합니다.**  
> 상세 기획: `socket_auto_design/document/tasks_next_step/27_homepage_inquiry_integration_plan.md`

| 번호 | 작업 | 내용 |
|------|------|------|
| ① | `homepage_inquiries` 테이블 추가 | Alembic revision 생성 |
| ② | 외부 API 엔드포인트 추가 | `POST /api/external/inquiry` + API Key 인증 |
| ③ | Sales 대시보드 [홈페이지 접수] 탭 추가 | 미처리 건 수 배지 포함 |
| ④ | 접수 상세 + [견적서 작성] 버튼 | IC 규격 pre-fill 후 견적 폼으로 이동 |
| ⑤ | 견적 폼에서 homepage_inquiries 연결 | 처리 완료 후 status 업데이트 |

---

## 6. UI/UX 가이드 (홈페이지)

### 6-1. 이중언어 적용

마스터 플랜 §5와 동일한 방식으로 적용한다.

| 항목 | 내용 |
|------|------|
| **URL** | `/en/quote` (영어) / `/ko/quote` (한국어) |
| **라우터** | `GET /{lang:en\|ko}/quote` — FastAPI, `lang` 값을 템플릿에 전달 |
| **번역** | Vanilla JS + JSON 번역 파일 (`frontend/static/i18n/en.json`, `ko.json`) |
| **API** | `POST /api/quick-quote` — 언어 prefix 없음 (API는 언어 분리 불필요) |
| **고객 확인 이메일** | 제출 시 `lang` 값을 함께 전송 → 백엔드에서 해당 언어로 이메일 발송 |

> **번역 적용 대상**: 폼 레이블, placeholder, 버튼 텍스트, 검증 오류 메시지, 제출 완료 안내 문구

### 6-2. 진입점

- 네비게이션 **[Request Quote]** CTA 버튼 → `/{lang}/quote` 페이지
- Products 페이지 각 제품 카드 **"Request a Quote"** → 해당 패키지 타입 pre-fill

### 6-3. 폼 레이아웃

```
┌────────────────────────────────────────────────┐
│  IC 규격                                              │
│  패키지 타입  [BGA ▼]   IC Code  [___________]        │
│  핀 수        [____] 개                               │
│  피치         [0.5mm ▼] (직접입력 선택 시 노출)        │
│  IC 크기  D [____] mm  E [____] mm  A(높이) [____] mm │
│                                                │
│  고객 정보                                      │
│  회사명  [__________]  담당자  [__________]     │
│  이메일  [__________]  연락처  [__________]     │
│                                                │
│  추가 정보 (선택)                               │
│  수량  [____] pcs   납기  [날짜 선택]            │
│  기타 요청사항  [_______________________________]│
│                                                │
│  ☐ 개인정보 수집 및 이용에 동의합니다. (필수)    │
│    → [개인정보처리방침 보기]                     │
│                                                │
│  (reCAPTCHA v3 — 비가시 자동 실행)              │
│  [가견적 요청하기]                               │
└────────────────────────────────────────────────┘
```

### 6-4. 입력값 검증

| 필드 | 검증 규칙 |
|------|---------|
| `pin_count` | 양의 정수, 1 이상 |
| `package_d`, `package_e` | 양의 실수, 0 초과 100 이하 (mm) |
| `package_a` | 양의 실수, 0 초과 50 이하 (mm) — 입력 시에만 검증 |
| `contact_email` | 이메일 형식 |
| `pitch` 직접입력 | 숫자만 허용, `"0.35"` 입력 → `"0.35mm"` 로 저장 |
| `privacy_agreed` | `true` 필수 — `false` 또는 누락 시 400 Bad Request 반환 |
| `recaptcha_token` | 빈 값 불가 — 백엔드에서 Google reCAPTCHA v3 API로 검증, score < 0.5 시 거부 |

---

## 7. 파일 구성 (홈페이지 프로젝트)

```
Innovo_homepage/
├── backend/
│   ├── routers/
│   │   └── quick_quote.py             # 신규 — POST /api/quick-quote
│   ├── models.py                      # 수정 — QuickQuoteInquiry 모델 추가
│   └── utils/
│       └── email_utils.py             # 신규 — SMTP 이메일 발송 유틸
├── frontend/
│   └── templates/
│       └── quote/
│           └── quick_quote_form.html  # 신규 — 폼 UI
└── database/
    └── versions/
        └── xxxx_add_quick_quote_inquiries.py  # 신규 — DB 마이그레이션 (CLAUDE.md 폴더 구조 기준)
```

---

## 8. 환경변수 (`.env` 추가)

```
# reCAPTCHA v3
RECAPTCHA_SITE_KEY=        # 프론트엔드 JS에서 사용
RECAPTCHA_SECRET_KEY=      # 백엔드 검증용 (절대 프론트 노출 금지)

# Phase 1 — 이메일 발송 (Mailnara)
SMTP_HOST=smtp.mailnara.com
SMTP_PORT=465
SMTP_USER=noreply@innovotech.co.kr
SMTP_PASSWORD=
SMTP_FROM_EMAIL=sbchung@innovotech.co.kr
SALES_NOTIFY_EMAIL=sbchung@innovotech.co.kr

# Phase 2 — ERP 연동
ERP_API_BASE_URL=http://3.35.214.138
ERP_API_KEY=
```

---

## 9. 개발 순서

### Phase 1 (홈페이지)

1. `alembic revision` — `quick_quote_inquiries` 테이블 생성
2. `backend/models.py` — `QuickQuoteInquiry` SQLAlchemy 모델 추가
3. `backend/utils/email_utils.py` — SMTP 이메일 발송 함수 작성
4. `backend/routers/quick_quote.py` — `POST /api/quick-quote` 엔드포인트 구현 (reCAPTCHA v3 토큰 검증 + Rate limiting 적용 — 마스터 플랜 §7-5 기준)
5. `backend/main.py` — 라우터 등록
6. `frontend/templates/quote/quick_quote_form.html` — 폼 UI 구현
7. 로컬 동작 확인 → Phase 2 일정 협의

### Phase 2 (ERP 연동 — socket_auto_design 작업 완료 후)

8. `POST /api/external/inquiry` 호출 코드 추가 (`quick_quote.py` 수정)
9. `erp_inquiry_id` 저장 처리
10. 홈페이지 `status` → `"sent_to_erp"` 업데이트

### Phase 3 (고급 검색 — Phase 2 완료 후)

11. `quick_quote_form.html` — [+ 고급 파라미터 입력] 펼침 UI 추가 (`ic_type` select 등)
12. `POST /api/quick-quote` — `ic_type` optional 수신 + DB 저장 처리 (기존 endpoint 확장)
13. ERP `homepage_inquiries` 테이블에 `ic_type VARCHAR(50)` 컬럼 추가 (Alembic revision — socket_auto_design 담당)
14. ERP 외부 API `POST /api/external/inquiry` — `ic_type` 필드 추가 수신 처리 (socket_auto_design 담당)

---

*이 문서만 보고 Phase 1을 바로 개발 가능한 수준으로 작성함.*  
*Phase 2/3 ERP 측 작업은 `socket_auto_design/document/tasks_next_step/27_homepage_inquiry_integration_plan.md` 참조.*
