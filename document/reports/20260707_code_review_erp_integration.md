# 홈페이지 ↔ ERP(socket_auto_design) 연동 검토 보고서 (3차, 2026-07-07)

> 1차: `20260707_code_review_report.md` · 2차: `20260707_code_review_addendum.md`
> 본 문서는 홈페이지가 ERP DB 데이터를 API로 사용한다는 전제에서, **두 코드베이스를 직접 대조**한 결과다.
> 검토 대상: `socket_auto_design/backend/routers/hp_*.py` 5종(총 1,146줄) + `models.py` HP 테이블 + `main.py`(라우터 등록·CORS·시드) + 홈페이지 프론트 API 계층 재대조

---

## 0. 확정된 운영 아키텍처 (코드 근거)

```
[React SPA (S3+CloudFront)]
   │  /api/hp/*  ──────────────▶  ERP 앱 (socket_auto_design)  ──▶  ERP DB
   │                              · hp_auth.py    → hp_users, hp_refresh_tokens …
   │                              · hp_quick_quote.py → homepage_inquiries
   │                              · hp_contact.py → (ERP) contact_inquiries
   │                              · hp_wizard.py  → (ERP) wizard_quotes
   │                              · hp_account.py → 위 테이블 병합 조회
   │
   └─ /admin/api/* ────────────▶  홈페이지 백엔드 (innovo-homepage-api:8001) ──▶ innovo_homepage DB
                                  · users, quick_quote_inquiries,
                                    contact_inquiries, wizard_quotes (자체 테이블)
```

- ERP `main.py:838-843`에서 hp 라우터 5종 등록 확인. CORS는 운영 도메인 2종 + dev 포함 — 정상.
- 두 DB가 별도임은 `document/plan/05_plan_aws_erp_react_cloudfront.md:475`(`POSTGRES_DB=innovo_homepage`)와 `document/tasks/erp_quote_wizard_pricing_task.md`("ERP가 접근할 수 없는 별도 DB")로 교차 확인.

**→ 사용자 데이터의 쓰기 경로는 전부 ERP DB이고, 홈페이지 Admin이 읽는 것은 전부 홈페이지 자체 DB다.** 여기서 아래 Critical 2건이 파생된다.

---

## 1. 🔴 Critical

### 1-1. 인증회원(verified) 승인이 실제 시스템에 반영되지 않음

**근거**:
- 가격 계산·카탈로그 권한의 기준은 **ERP `hp_users.membership_tier`**:
  - `hp_wizard.py:63` — `is_verified = user.membership_tier == "verified"` (일반회원 ×1.3 마크업)
  - `hp_account.py:178` — `catalog-url`은 `membership_tier != "verified"`면 403
- 그런데 **ERP 코드베이스 전체에서 `membership_tier`를 변경(쓰기)하는 코드가 없다** — 참조는 `hp_auth`(가입 시 기본값)·`hp_wizard`·`hp_account`의 읽기 3곳뿐. ERP 내부 화면·관리 API 모두 부재.
- 홈페이지 Admin의 승인 기능(`Innovo_homepage/backend/routers/admin.py:445` `patch_membership`)은 **innovo_homepage DB의 `users`** 를 수정한다. 실제 회원이 저장된 ERP `hp_users`와는 다른 테이블·다른 DB다. 신규 가입자는 ERP `hp_users`에만 존재하므로, 홈페이지 Admin의 Users 목록에는 아예 나타나지도 않는다.
- 더 나쁜 점: `patch_membership`은 승인 시 **고객에게 "인증회원 승인" 메일까지 발송**한다(`send_membership_verified_email`). 승인 메일을 받은 고객이 실제로는 계속 일반가(×1.3)를 보고 카탈로그 403을 받는 시나리오가 가능하다.

**영향**: B2B 회원 등급 정책(인증회원 기준가·카탈로그 제공)이 **운영상 실행 불가능**. 현재 hp_users를 verified로 만들 방법은 DB 직접 UPDATE뿐이다.

**해결방안** (아키텍처 결정 필요 — §4 참조):
- 단기: ERP에 `PATCH /api/hp/admin/users/{id}/membership`(스태프 인증) 하나를 추가하고, 홈페이지 Admin Users 화면이 ERP의 hp_users를 조회·승인하도록 전환. 승인 메일 발송도 그 시점으로 이동.
- 그 전까지는 운영 절차로 ERP DB `UPDATE hp_users SET membership_tier='verified' WHERE email=...`을 명문화.

### 1-2. 홈페이지 Admin 전체가 레거시 DB를 조회 — 신규 데이터가 보이지 않음

**데이터별 관리 채널 매트릭스** (코드 확인 결과):

| 데이터 | 실제 저장 위치 (ERP DB) | ERP 관리 화면 | 홈페이지 Admin(현행) | 결과 |
|---|---|---|---|---|
| Quick Quote | `homepage_inquiries` | ✅ 있음 (`sales.py:3871~` 홈페이지 접수) | ❌ 다른 DB 조회 | ERP에서 처리 가능 — 홈페이지 Admin 화면은 중복·무용 |
| Contact 문의 | (ERP) `contact_inquiries` | **❌ 없음** | ❌ 다른 DB 조회 | **이메일 알림이 유일한 채널** — 메일 유실 시 문의 추적 불가, 첨부파일 재열람 불가 |
| Wizard 견적 | (ERP) `wizard_quotes` | **❌ 없음** | ❌ 다른 DB 조회 | 동일 — 대시보드의 "만료 임박 견적" 관리 흐름도 실데이터와 무관 |
| B2B 회원 | `hp_users` | **❌ 없음** | ❌ 다른 DB 조회 | §1-1 |

(ERP 라우터 전수 grep: `WizardQuote`·HP `ContactInquiry`·`HpUser`를 hp_* 라우터 외에 참조하는 코드 0건)

**영향**: 최근 구축한 홈페이지 Admin(대시보드 KPI·미처리 현황·만료 임박, `11_plan_admin_dashboard`)이 표시하는 수치는 **레거시(초기 로컬 백엔드 시절) 데이터**다. 프론트가 ERP HP API로 전환된 이후(`ed1ccdf` auth 전환, `9fd80d9` wizard 전환)의 신규 회원·문의·견적은 어느 화면에도 나타나지 않는다.

**해결방안**: §4의 아키텍처 옵션 중 하나를 결정해야 한다. 코드 수정 전이라도, **Contact·Wizard 접수 알림 메일이 실제로 수신되는지**(ERP 서버의 SMTP 설정) 즉시 확인 권장 — 현재 이 둘은 메일이 전부다.

---

## 2. 🟠 High — Quick Quote API 계약 불일치 3건 (실사용 장애)

홈페이지 프론트는 과거 홈페이지 자체 백엔드의 관대한 스키마에 맞춰져 있고, ERP `hp_quick_quote.py`는 더 엄격하다. 직접 호출 전환 과정에서 다음이 깨졌다:

### 2-1. `pitch: "N/A"` 거부 → test_jig / other 카테고리 가견적 제출 항상 실패

- 프론트: 카테고리가 test_jig·other면 pitch 입력란이 없고 `resolvePitch() || 'N/A'`로 **'N/A'를 전송** (`QuickQuotePage.tsx:70`)
- ERP: `PITCH_PRESETS`에 없으면 `_normalize_pitch()` → 숫자 형식 아니면 `ValueError` → **422** (`hp_quick_quote.py:34-38,61-67`)
- 홈페이지 구백엔드는 `"N/A"`를 명시 허용했으나(`schemas/quick_quote.py:57`) ERP는 허용하지 않음.

**결과**: Test JIG·기타 카테고리의 가견적 제출이 운영에서 **항상 422로 실패**하고, 사용자에게는 pydantic 오류 원문이 노출된다. probe_pin은 pitch 실값을 보내므로 통과.

**해결**: ERP `validate_pitch`에 `"N/A"` 허용 추가(홈페이지 구백엔드와 동일하게), 또는 프론트에서 해당 카테고리일 때 필드 자체를 생략하고 ERP 스키마를 Optional로.

### 2-2. WLCSP 선택 시 400 — ERP 마스터에 WLCSP 없음

- ERP는 `ic_package_type`을 DB 마스터(`ic_package_type`) 기준 검증 — 시드 목록: WLP/BGA/QFN/DFN/SOP/QFP/LGA/**ETC** (WLCSP 없음, `main.py:547-556`)
- 프론트 `PACKAGE_TYPES`에는 **WLCSP 포함** (`QuickQuotePage.tsx:14`)
- 홈페이지 구백엔드는 이를 알고 ERP 전송 시 `WLCSP → ETC` 변환을 했으나(`quick_quote.py:43`), 프론트→ERP 직접 호출 경로에는 변환이 없다.

**결과**: test_socket 카테고리에서 WLCSP를 고른 사용자의 제출은 400 "지원하지 않는 IC 패키지 타입" 실패.

**해결**: 프론트 `submitQuickQuote`에서 HP API 경로일 때 `WLCSP → ETC` 변환(+ message에 "WLCSP" 명기), 또는 ERP 마스터에 WLCSP 추가.

### 2-3. `product_category` 유실 — probe_pin 문의가 더미 규격의 소켓 문의로 둔갑

- 프론트는 `product_category`(test_socket/probe_pin/test_jig/other)를 전송하지만 **ERP `QuickQuoteRequest`에 이 필드가 없다** (pydantic 기본 동작으로 조용히 무시됨). `HomepageInquiry` 테이블에도 해당 컬럼 없음 (ERP 전체 grep 0건).
- 프론트는 test_socket이 아니면 `package_d/e = 0.001` 더미 값을 보낸다 (`QuickQuotePage.tsx:71-72`).

**결과**: probe_pin·test_jig·other 문의가 ERP "홈페이지 접수" 탭에 **카테고리 구분 없이 D=0.001×E=0.001mm 규격의 접수 건**으로 저장된다. 영업팀은 무엇에 대한 문의인지 message 본문을 읽어야만 알 수 있고, 더미 규격이 실규격으로 오인될 수 있다.

**해결**: ERP `homepage_inquiries`에 `product_category` 컬럼 추가 + 스키마 반영(홈페이지 구백엔드 migration 007과 동일한 확장). 단기 완화로는 프론트에서 message 앞에 `[카테고리: Probe Pin]`을 자동 삽입.

---

## 3. 🟡 Medium / ⚪ Low

| # | 심각도 | 위치 | 내용 |
|---|--------|------|------|
| 3-1 | 🟡 | ERP `hp_account.py:100-169` | `get_my_quotes`가 두 테이블을 **전량 로드 후 Python 정렬** — 페이지네이션이 DB에 위임되지 않아 데이터 증가 시 매 요청 전체 스캔. 초기엔 무해하나 구조적 부채 |
| 3-2 | 🟡 | ERP `homepage_inquiries` status vs 홈페이지 i18n | ERP는 `pending`으로 저장하고 이후 `sales.py`의 상태 전환 값을 따름 — 마이페이지 `QuoteStatus`(pending/reviewing/quoted/completed/expired)와 값 집합이 일치하는지 ERP 상태 전환 코드 기준으로 대조 필요. 1차 §3-7의 "미정의 상태 회색 폴백" 방어가 여기서도 유효 |
| 3-3 | 🟡 | ERP `hp_auth.py:170` vs 홈페이지 `config.py:26` | 운영 판정 환경변수가 ERP는 `ENV=production`, 홈페이지 백엔드는 `APP_ENV=production`으로 **서로 다른 이름** — 서버 점검 시 둘 다 확인해야 함. ERP `ENV` 미설정 시 refresh 쿠키가 `secure=False`/`SameSite=Lax`로 발급됨 (2차 §4 체크리스트에 추가) |
| 3-4 | ⚪ | ERP `hp_auth.py:179` | 운영에서 `SameSite=None` 쿠키 — CloudFront 동일 오리진 구조에선 `Lax`로 충분하며 None은 CSRF 표면을 불필요하게 넓힘 (refresh 응답을 타 사이트가 읽을 수는 없어 실위험 낮음) |
| 3-5 | ⚪ | ERP `hp_account.py:136,149` | `created_at.isoformat() + "Z"` — 컬럼이 timezone-aware면 `"+00:00Z"` 이중 표기가 됨. 홈페이지 프론트는 `slice(0,10)`만 사용해 실해 없음 |
| 3-6 | ⚪ | ERP `hp_contact.py:30-33` | inquiry_type 화이트리스트가 홈페이지 카테고리 4종을 포함 — 정상. 미포함 값은 `general_inquiry`로 강등(조용한 변환) — 의도 확인만 |
| 3-7 | ⚪ | 홈페이지 `backend/` | `/api/auth·account·contact·quick-quote` 라우터는 **운영 트래픽이 없는 레거시**가 됨(프론트 전 경로가 /api/hp/*). 실사용은 `/admin/api`뿐. 혼동 방지를 위해 레거시 라우터의 존치/제거를 결정하고 ARCHITECTURE.md에 현행 구조(§0 다이어그램)를 기록할 것 |

### 1·2차 보고서 정정 (ERP 코드 확인으로 판정 변경)

| 기존 항목 | 정정 |
|---|---|
| 1차 §3-7 / §5 — "`getWizardQuoteHistory()`가 항상 빈 목록" | **해소됨** — ERP `hp_account.py`가 `source` 필드 포함으로 Quick Quote + Wizard를 병합 반환하도록 이미 구현돼 있음 (작업요청 문서 ④가 반영된 상태). 상태값 i18n 보강(§3-2)만 남음 |
| 2차 §5 관련 — "`catalog-url` ERP측 보류" | **문서와 코드 불일치** — ERP `hp_account.py:172`에 CloudFront Signed URL 방식으로 구현돼 있음. 미동작 원인은 코드가 아니라 ERP 서버의 `CLOUDFRONT_DOMAIN`/`CLOUDFRONT_KEY_PAIR_ID`/`CLOUDFRONT_PRIVATE_KEY` 환경변수 설정 여부(미설정 시 503). `erp_mypage_api_request.md` 상태 갱신 필요 |
| 1차 백엔드 지적 다수 (register 경쟁조건·이메일 블로킹·rate limit 등 auth/contact/quick-quote 관련) | 해당 라우터가 레거시(운영 미사용)로 확인됨에 따라 **우선순위 하향** — 단 `/admin/api` 관련 지적(1차 §1-2 APP_ENV·2FA, §3-3 rate limit, 2차 §2-1~2-4)은 실사용 경로이므로 그대로 유효 |

---

## 4. 아키텍처 결정 필요 사항 (사용자 판단 요청)

홈페이지 Admin과 실데이터의 단절(§1)을 해소하는 경로는 세 가지다. 어느 쪽이든 ERP팀과의 협의가 필요하므로 결정만 요청드린다:

| 옵션 | 내용 | 장점 | 단점 |
|------|------|------|------|
| **A. ERP에 HP 관리 API 추가** (권장) | ERP에 `/api/hp/admin/*`(회원 등급·wizard/contact 목록·상태 변경)를 추가하고, 홈페이지 Admin 프론트가 이를 호출. 홈페이지 백엔드는 staff 인증만 유지 또는 ERP staff 인증 재사용 | 데이터 단일 원본 유지, 홈페이지 Admin UI 재사용 | ERP팀 개발 필요 (기존 `09_erp_task` 방식의 작업요청 1건) |
| B. 홈페이지 백엔드가 ERP DB 직접 조회 | innovo-homepage-api의 `POSTGRES_*`를 ERP DB로 전환하고 모델을 hp_* 테이블 기준으로 재작성 | ERP팀 개발 불필요 | 두 코드베이스가 같은 테이블에 쓰기 — 스키마 변경 시 이중 관리, 결합도 급증. 비권장 |
| C. 현상 유지 + 운영 절차 보완 | 등급 승인은 DB 직접 UPDATE, contact/wizard는 메일 기반 처리 명문화, 홈페이지 Admin의 Users·Contacts·Wizard 메뉴 숨김 | 즉시 가능 | Admin 투자 사장, 휴먼 에러 위험 지속 |

어느 옵션이든 **§2의 Quick Quote 계약 불일치 3건은 별도로 즉시 수정**이 필요하다 (2-1·2-2는 프론트 단독 수정으로도 가능).

---

## 5. 통합 우선순위 (1·2·3차 전체)

1. **즉시 (사용자 확인/결정)**
   - Contact·Wizard 접수 알림 메일 실수신 여부 확인 (§1-2 — 현재 유일한 채널)
   - 인증회원 승인 임시 절차 결정 (§1-1) + Admin 승인 기능 사용 중단 공지(승인 메일 오발송 방지)
   - §4 아키텍처 옵션 결정
2. **이번 주 (코드 수정 — 프론트 단독 가능분)**
   - Quick Quote: pitch 'N/A' 카테고리 처리(§2-1), WLCSP→ETC 변환(§2-2), 카테고리 message 삽입(§2-3 단기 완화)
   - 1·2차의 기존 1순위: 위저드 데드락, mock 폴백 제거, Admin 000000 문구 제거, `APP_ENV`(+ERP `ENV`) 확인
3. **ERP팀 협의분**
   - `homepage_inquiries.product_category` 컬럼 추가(§2-3 근본 해결), pitch 'N/A' 허용(§2-1)
   - HP 관리 API(§4-A 채택 시), `CLOUDFRONT_*` 환경변수 설정(catalog-url 활성화)
   - `erp_mypage_api_request.md`·`erp_quote_wizard_pricing_task.md` 상태 현행화
4. **정비**: ARCHITECTURE.md에 §0 구조 기록, 홈페이지 레거시 라우터 존치 결정(§3-7), 기존 1·2차 백로그

---

*작성: Claude Code 3차 검토 (Fable 5) — socket_auto_design 코드 직접 대조 기준. ERP 코드는 읽기만 했으며 수정하지 않음.*
