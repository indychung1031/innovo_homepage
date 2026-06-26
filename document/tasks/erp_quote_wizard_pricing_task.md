# ERP 팀 작업 요청 — Quote Wizard 실거래가 연동

**프로젝트**: socket_auto_design
**요청 시스템**: Innovo 홈페이지 (www.innovosolution.co.kr) — Quote Wizard (`/{lang}/quote`, 회원 전용 4단계 위저드)
**작성일**: 2026-06-24
**우선순위**: 높음 — 현재 운영 중인 Quote Wizard가 **실제 ERP 가격이 아니라 mock(가짜) 데이터로 전체 동작 중**

---

## 1. 현황 — 왜 지금 mock으로 운영되고 있는가

조사 결과, Quote Wizard가 실제 ERP 가격으로 전환되지 못하는 원인이 3단계로 겹쳐 있습니다. 단순히 "프론트 플래그 하나"의 문제가 아니라, **운영 인증 체계가 ERP 쪽(`socket_auto_design`)으로 통합된 이후 홈페이지 자체 백엔드에 남아있던 가격·제출 로직이 고아 코드가 된 상태**입니다.

| # | 차단 지점 | 내용 |
|---|----------|------|
| 1 | 프론트 빌드 플래그 | `frontend-react/.env.production`의 `VITE_WIZARD_USE_MOCK=true` — 2026-06-01 최초 생성 이후 한 번도 변경 안 됨. 이 값이 `true`인 한 아래 2·3과 무관하게 무조건 mock 사용 |
| 2 | CloudFront 라우팅 | `/api/erp/socket-types`, `/api/erp/ic-package-types`, `/api/erp/cover-types`, `/api/erp/material-types`, `/api/erp/quote-estimate`, `/api/quote/wizard`(제출) 모두 CloudFront behavior 미등록 → 호출 시 S3 기본 동작(`index.html`)이 반환됨 |
| 3 | 인증 체계 불일치 | 홈페이지 자체 백엔드(`Innovo_homepage/backend`)의 가격 계산·제출 로직(`routers/erp.py`, `routers/quote.py`)은 **자체 JWT secret + 정수 `user_id`** 기준으로 인증을 검사함. 그런데 실제 로그인은 ERP `/api/hp/auth/login`이 발급하는 **`HP_JWT_SECRET_KEY` + `sub="hp_user:{id}"`** 토큰을 사용하므로, 설령 2번을 고쳐도 401이 발생함 |

추가로, 마이페이지 견적 이력(`GET /api/hp/account/quotes`)은 현재 `homepage_inquiries`(Quick Quote 데이터)만 조회합니다. Quote Wizard 제출 기록은 홈페이지 자체 DB의 `wizard_quotes` 테이블에 쌓이도록 설계되어 있었는데, 이 테이블은 ERP `/api/hp/account/quotes`가 접근할 수 없는 별도 DB라 **위저드로 제출한 견적이 마이페이지 이력에 보이지 않는 문제**도 함께 있습니다.

**결론**: 인프라(CloudFront)만 고치는 임시방편 대신, 가격 계산·제출·이력 조회를 **ERP `/api/hp/*` 안으로 이전**하는 것을 권장합니다. `/api/hp/*`는 이미 CloudFront에 라우팅되어 있고 `hp_auth` 인증 체계와도 호환되므로, CloudFront/nginx 추가 설정이 필요 없습니다.

---

## 2. 요청 작업 목록

### ① 마스터 데이터 4종 — `/api/hp/wizard/*` prefix로 노출

기존 `/api/public/*` 핸들러(`backend/routers/public_api.py`)를 그대로 재사용해 `/api/hp/wizard/` prefix로 추가 등록만 하면 됩니다. 인증 불필요.

```
GET /api/hp/wizard/socket-types       (이미 /api/erp/socket-types로 존재 — prefix만 추가)
GET /api/hp/wizard/ic-package-types   (이미 /api/erp/ic-package-types로 존재 — prefix만 추가)
GET /api/hp/wizard/cover-types        (신규 — /api/public/cover-types 핸들러 재사용)
GET /api/hp/wizard/material-types     (신규 — /api/public/material-types 핸들러 재사용)
```

> `/api/erp/pins`, `/api/erp/pins/*`는 현재처럼 그대로 유지 (변경 불필요).

---

### ② 가견적 계산 — `POST /api/hp/wizard/quote-estimate` (신규, 인증 필수)

**인증**: `Authorization: Bearer <hp_user JWT>` (`hp_auth` 발급 토큰)
**내부 동작**: 기존 `/api/public/quote-estimate` 계산 결과(`unit_price`, `currency`, `quantity`, `total_price`, `matched`)를 구한 뒤, 로그인한 `hp_users.membership_tier`에 따라 마크업 적용.

**마크업 로직 (홈페이지 마스터플랜 §7-1 확정 사항 — 참고용 의사코드)**:
```python
if user.membership_tier == "verified":
    unit_price = base_unit_price  # discount_rule은 이미 /api/public/quote-estimate에서 적용됨
    total_price = base_total_price
else:  # general
    unit_price = ceil(base_unit_price * 1.3 / 10) * 10  # 10원 절삭, 수량 할인 미적용
    total_price = unit_price * quantity
```

**Request**: 기존 `/api/public/quote-estimate`와 동일 바디
```json
{
  "socket_type_id": 1,
  "material_type_id": 2,
  "cover_type_id": 1,
  "pin_block_type_id": 3,
  "pocket_guide_type_id": null,
  "pin_count": 144,
  "quantity": 500
}
```

**Response**:
```json
{
  "matched": true,
  "unit_price": 1300,
  "currency": "KRW",
  "quantity": 500,
  "total_price": 650000,
  "lead_time_label": "3 Weeks"
}
```

> **`lead_time_label`**: 수량 구간별 납기 표시 텍스트 (마스터플랜 §7-1 `lead_time_rules` 시드값 참조 — 우선 "20 set 이하 → `3 Weeks`, 초과 → `담당자 확인 후 안내`" 하드코딩으로 시작해도 무방. 추후 Admin에서 구간 조정이 필요해지면 별도 작은 테이블로 분리 협의)

---

### ③ 위저드 제출 — `POST /api/hp/wizard/submit` (신규, 인증 필수)

**인증**: `Authorization: Bearer <hp_user JWT>`
**동작**: 신규 테이블(예: `wizard_quotes`, 아래 컬럼 참고)에 저장 + 영업팀/고객 이메일 발송(`hp_email.py` 재사용) + `homepage_inquiries`와 구분되는 `status` 추적(`pending` → `reviewed` → `quoted` → `expired` 등, 마스터플랜 §7-1 견적 상태 체계 참고)

**저장 컬럼** (홈페이지 자체 DB `wizard_quotes` 테이블 — `Innovo_homepage/backend/models.py:183` — 과 동일하게 맞추면 마이그레이션 편함):
```
user_id, status, lang, series, ic_type, ic_code, ic_package_code,
dimension_d, dimension_e, dimension_a, pitch, pin_count,
socket_type_id, socket_type_name, quantity, cover_type_id, material_type_id,
spec_notes, attachment_name, matched, unit_price, currency, total_price,
contact_name, contact_company, contact_email, contact_phone, created_at
```

**Request**: 기존 `Innovo_homepage`의 `POST /api/quote/wizard` 바디와 동일 (`frontend-react/src/api/erp.ts`의 `WizardSubmitPayload` 참고)

**Response**:
```json
{ "message": "견적 요청이 접수되었습니다..." }
```

---

### ④ 견적 이력 통합 — `GET /api/hp/account/quotes` 확장

현재 `homepage_inquiries`(Quick Quote)만 조회하고 있는데, ③에서 신설하는 위저드 견적 테이블도 함께 조회되도록 UNION 또는 별도 `source` 구분 필드를 추가해 주세요. 마이페이지에서 Quick Quote 문의와 Quote Wizard 견적이 모두 보여야 합니다.

---

## 3. 홈페이지 측 후속 작업 (ERP 작업 완료 후 — 우리 쪽에서 진행)

ERP 작업이 완료되면 아래는 홈페이지 팀이 직접 처리합니다 (ERP팀 작업 불필요):

1. `frontend-react/src/api/erp.ts`의 호출 경로를 `/api/erp/*`, `/api/quote/wizard` → `/api/hp/wizard/*`로 변경
2. 엔드투엔드 테스트 통과 후 `frontend-react/.env.production`의 `VITE_WIZARD_USE_MOCK=true` → `false`로 변경 + 재배포
3. 고아 코드 정리: `backend/routers/erp.py`, `backend/routers/quote.py`, `WizardQuote` 모델, 관련 마이그레이션 제거 (홈페이지 자체 DB에서는 더 이상 가격/제출 로직을 갖지 않게 됨)
4. `document/plan/00_master_plan.md` §11, `00_plan_gap_checklist.md` Phase 4 항목 갱신

---

## 4. 참고 — 현재 CloudFront 라우팅 현황 (변경 불필요, 참고용)

```
/admin/api/*       → ERP-EC2 (홈페이지 자체 백엔드, 포트 8001)
/api/hp/*          → ERP-EC2 (socket_auto_design, hp_* 라우터)  ← 본 작업도 이 prefix 사용
/api/erp/pins      → ERP-EC2 (socket_auto_design, public_api.py 직접 alias)
/api/erp/pins/*    → 〃
/upload/catalog/*  → S3 (innovo-www-prod)
```

`/api/hp/*` 안에 신규 라우트를 추가하는 것만으로 CloudFront/nginx 변경이 전혀 필요 없습니다.
