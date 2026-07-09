# 전면 코드 검토 — 2차 증보 보고서 (2026-07-07)

> 1차 보고서: `20260707_code_review_report.md` (Critical 2건 포함 33건)
> 본 문서는 1차에서 다루지 못한 영역의 추가 검토 결과와, 1차 지적사항 중 실환경(라이브 CloudFront·운영 URL)으로 확정한 내용을 담는다.

- **2차 검토 범위**
  - 관리자 페이지 8종 전체 (`pages/admin/*`, `AdminLayout`, `AdminDetailTable`)
  - 인증 페이지 4종 (`Register`/`ResetPassword`/`VerifyEmail`/`ForgotPassword`) + `main.tsx`/`providers.tsx`
  - 제품 필터 (`filterUtils.ts`, `TestSocketFilterPanel`, `ProductCategoryPage`) + 콘텐츠 데이터 정합
  - i18n 키 전수 대조 (스크립트 자동 대조, 12개 네임스페이스 × en/ko)
  - 쿠키 동의/GA (`CookieBanner`, `useCookieConsentInit`, `analytics.ts`)
  - 문서·스크립트 (`data_dictionary`, `deploy-all.ps1`)
  - **실환경**: 라이브 CloudFront 설정(AWS CLI 조회), 운영 공개 엔드포인트 상태 확인(읽기 전용 GET)
- **미수행**: EC2 내부 설정 확인(SSM) — 이 세션의 권한 정책상 운영 서버 원격 명령이 차단됨. §4에 사용자 확인 절차를 명시.

---

## 1. 실환경 검증 결과 (1차 지적사항 확정)

### 1-1. 라이브 CloudFront behavior 조회 결과 ✅ / ⚠️

`aws cloudfront get-distribution-config --id EAD1YVAYMLDS7` (읽기 전용) 실측:

| Path Pattern | Origin | 판정 |
|---|---|---|
| `/admin/api/*` | ERP-EC2 | 정상 |
| `/api/hp/*` | ERP-EC2 | 정상 |
| `/api/erp/pins`, `/api/erp/pins/*` | ERP-EC2 | **존재함** — 1차 §2-4의 우려와 달리 라이브에는 등록돼 있음 |
| `/upload/catalog/*` | S3 | 정상 |
| `/api/account/*` | (없음) | **여전히 부재** — 아래 1-2에서 실측 확인 |

**결론**:
- 1차 §2-4 중 `/api/erp/*` 부분은 해소 — 단, **리포지토리의 `cf_config_backup.json`이 구버전**이다. 라이브에는 `/api/erp/pins*`가 추가되고 `/upload/certificate/*`는 제거된 상태(인증서는 default S3 behavior로 서빙되므로 동작 영향 없음). 콘솔 변경분이 백업에 반영되지 않는 관리 공백이 있으므로, 배포 후 `get-distribution-config` 결과를 백업 파일에 갱신하는 절차를 권장.
- `/api/account/*` 부재는 유효 — `getPublicDownloadUrl()` 사용 재개 전 반드시 해결 필요 (1차 §2-4 해결방안 3 유지).

### 1-2. 운영 엔드포인트 실측 (2026-07-07, 읽기 전용 GET)

| 요청 | 결과 | 해석 |
|---|---|---|
| `GET /api/erp/pins` | **200 `application/json`** | Probe Pin 페이지 데이터 정상 |
| `GET /api/hp/wizard/socket-types` | **200 `application/json`** | ERP 위저드 마스터 API 가동 중 |
| `GET /api/account/public-download-url?file=iso9001_en` | **200 `text/html`** | SPA fallback(index.html)이 반환됨 = 1차 지적대로 이 경로는 운영에서 죽어 있음 (현재 UI 미사용이라 실피해 없음) |
| `GET /admin/api/me` (토큰 없음) | 401 | 정상 |

---

## 2. 신규 발견 사항

### 2-1. 🟠 High — Admin 로그인 화면에 2FA 우회 코드 안내 문구가 운영에도 노출

**위치**: `frontend-react/src/pages/admin/AdminLoginPage.tsx:94`

```tsx
<p className="text-xs text-gray-mid">Dev: use 000000 if SMTP is unavailable.</p>
```

`/admin/login`은 공개 URL이며, 이 문구는 빌드 조건 없이 **모든 환경에서 항상 렌더링**된다. 1차 §1-2(APP_ENV 미설정 시 `000000` 우회 활성)와 결합하면, 공격자에게 "비밀번호만 뚫으면 2FA는 000000"이라는 힌트를 화면에 적어 주는 셈이다. APP_ENV가 올바르게 production이더라도 내부 우회 코드의 존재를 광고하는 것 자체가 부적절하다.

**해결방안**: 해당 `<p>` 제거. 개발 편의가 필요하면 `import.meta.env.DEV`(Vite dev 빌드 전용) 조건으로 감싸 운영 번들에서 제외.

### 2-2. 🟡 Medium — Quick Quote '미처리' 카운트를 감소시킬 방법이 UI에 없음

**위치**: `backend/routers/admin.py:608` vs `frontend-react/src/pages/admin/AdminQuoteDetailPage.tsx:7`

- 대시보드 집계: `qq_pending = count(status != "closed")` — **'closed'만이 미처리에서 빠지는 유일한 상태**
- 상세 페이지 상태 옵션: `['pending', 'reviewing', 'quoted', 'completed', 'expired']` — **'closed'가 없음**

즉 관리자가 어떤 상태로 바꿔도(completed·expired 포함) 대시보드의 "미처리 Quick Quote"는 영원히 줄지 않는다. 부수 문제로, ERP 전송 시 자동 설정되는 `sent_to_erp` 상태의 행은 상세 페이지 select의 어느 옵션과도 일치하지 않아 현재 상태가 화면에 표시되지 않는다(빈 선택 상태).

**해결방안**: ① 집계 기준을 UI 상태 체계와 일치시키거나(`status in ('pending','sent_to_erp')`를 미처리로 정의), ② 상세 페이지 옵션에 `sent_to_erp`·`closed`를 추가. 목록 페이지(`AdminQuotesPage.tsx:6`)에는 이미 `sent_to_erp`가 있으므로 상세 페이지와 목록의 상태 집합을 상수 하나로 통일할 것.

### 2-3. 🟡 Medium — 관리자 목록 4종 모두 50건 고정, 페이지네이션 UI 부재

**위치**: `AdminQuotesPage.tsx:19`, `AdminUsersPage.tsx:16`, `AdminContactsPage`, `AdminWizardQuotesPage` (모두 `listXxx()` 기본 호출)

`api/admin.ts`의 목록 함수들은 `page=1&size=50` 고정으로 호출되고, 페이지 이동 UI가 없다. 검색·상태 필터도 **이미 받아온 50건에 대한 클라이언트 필터**라서, 51번째 이후 데이터는 검색으로도 찾을 수 없다. 백엔드는 `page`/`q` 파라미터를 이미 지원하므로(`admin.py:154-169`) 서버측 기능이 놀고 있는 상태다. 접수가 쌓이는 속도를 감안하면 수개월 내 실무 문제가 된다.

**해결방안**: 마이페이지 `QuotesTab`의 페이지네이션 패턴을 재사용해 4개 목록에 적용하고, 검색어는 서버 `q` 파라미터로 전달.

### 2-4. 🟡 Medium — 관리자 화면의 API 오류가 사용자에게 전혀 표시되지 않음

**위치**: 관리자 페이지 전반

- 목록 로드: `try { ... } finally { setLoading(false) }` — **catch 없음** → API 실패(토큰 만료 포함) 시 빈 테이블 + "검색 결과가 없습니다"로 오인 표시 (`AdminQuotesPage.tsx:16-25` 등)
- 액션: `handleTier`/`handleDelete`(`AdminUsersPage.tsx:39-53`)가 실패하면 unhandled rejection — 화면 무반응, 관리자는 성공한 줄 알게 됨
- 상세 로드: `getQuickQuote(num).then(...)` catch 없음 → 404면 "Loading…" 무한 (`AdminQuoteDetailPage.tsx:22`)
- **토큰 만료(8시간) 처리 부재**: `parseAdminJson`이 401에서 토큰만 지우고 `ADMIN_UNAUTHORIZED`를 던지는데 아무도 잡지 않음 → 로그인 페이지로 리다이렉트되지 않고 화면이 조용히 죽음

**해결방안**: 관리자 공용 오류 배너 + `ADMIN_UNAUTHORIZED` 감지 시 `/admin/login` 리다이렉트를 `AdminLayout` 수준에서 한 번 구현해 전 페이지에 적용.

### 2-5. 🟡 Medium — 이메일 인증 링크가 GET으로 토큰을 소비 — 메일 스캐너 선클릭 문제

**위치**: `backend/routers/auth.py:181-198`, `frontend-react/src/pages/auth/VerifyEmailPage.tsx:27-41`

기업 메일 게이트웨이(Microsoft SafeLinks 등)는 수신 메일의 링크를 보안 검사 목적으로 선방문한다. 인증 링크가 GET 한 번으로 `used_at`을 소비하므로, 스캐너가 먼저 방문하면 사용자는 클릭 시 "유효하지 않거나 만료된 토큰"을 보게 된다. B2B 고객사(기업 메일) 대상 서비스라 발생 확률이 낮지 않다. 부수적으로 React StrictMode 때문에 **개발 모드에서는 이 API가 항상 2회 호출**되어 두 번째가 실패한다(운영 빌드는 해당 없음).

**해결방안**: `verify_email`을 멱등하게 — 토큰이 이미 사용됐어도 해당 사용자의 `email_verified_at`이 설정돼 있으면 성공 응답을 반환. 이 한 줄이면 스캐너·StrictMode·재클릭 문제가 모두 해소된다.

### 2-6. 문서 — 데이터 사전 미갱신 (CLAUDE.md 규칙 위반)

**위치**: `document/data_dictionary/00_schema.md`

마이그레이션 005~007에서 추가된 `wizard_quotes`, `lead_time_rules` 테이블과 `quick_quote_inquiries.product_category` 컬럼이 데이터 사전에 없다. `wizard_quotes`는 "향후 (Phase 4+)" 절에 `quote_requests`라는 옛 이름으로만 남아 있다. CLAUDE.md의 "DB 스키마 수정 시 데이터 사전 업데이트 필수" 규칙 위반 상태.

**해결방안**: 3개 항목을 `00_schema.md`에 반영하고 "향후" 절 정리.

---

## 3. 검토했으나 문제 없음 / 경미한 사항

### 이상 없음으로 확인된 것
- **i18n 키 전수 대조**: 12개 네임스페이스 × en/ko 자동 대조 결과 정적 키 누락 **0건**. 동적 키 8곳도 대상 JSON에 모두 존재 — 단, 1차 §3-7에서 지적한 `account:quotes.status.sent_to_erp`/`closed` 누락은 재확인됨(1차 조치 그대로 필요).
- **제품 필터**: `filterUtils`의 커버타입 분기·치수 파싱이 `test_socket.json` 실데이터 값(31개 패밀리)과 전부 정합. `ProductCategoryPage`·`TestSocketFilterPanel` 특이사항 없음.
- **쿠키 동의**: GA가 동의(`analytics`) 후에만 로드됨 — GDPR 기본 요건 충족. `.env.production`의 `VITE_GA_MEASUREMENT_ID`가 비어 있어 현재는 GA 자체가 비활성.
- **AdminLayout/AdminDetailTable**: 특이사항 없음. 로그아웃 → 가드 리다이렉트 흐름 정상.
- **`cf_private_key.pem`(리포 루트)**: `.gitignore` 처리돼 있고 커밋 이력 없음 — **유출 아님**. 다만 작업 폴더 밖(예: `~/.aws/`)으로 이동 권장 (향후 `git add -f` 실수·백업 스크립트 포함 위험).

### Low (개선 권장)
| # | 위치 | 내용 |
|---|------|------|
| A-1 | `mapAuthError.ts:28` + `auth.{en,ko}.json` | 백엔드의 **한국어 detail 원문 전체**("이메일 또는 비밀번호가 올바르지 않습니다." 등)를 i18n 키로 사용 — 백엔드 문구가 한 글자라도 바뀌면 영어 사용자에게 한국어 원문이 노출됨. 백엔드가 `invalid_credentials` 같은 기계 코드를 반환하도록 정리 권장 |
| A-2 | `AuthContext.tsx:36-53` | 게스트 방문마다 무조건 `POST /api/hp/auth/refresh` 호출 → 매 방문 401 발생. 동작엔 문제 없으나 불필요한 요청·서버 로그 노이즈 |
| A-3 | `useCookieConsentInit.ts` | 동의 철회(배너 재오픈 → 필수만) 시 이미 로드된 GA가 세션 종료까지 계속 동작 — 철회 시 `window['ga-disable-<ID>'] = true` 설정 권장 |
| A-4 | `AdminUsersPage.tsx:44-53` | 회원 삭제가 `window.confirm` 1단계뿐 — hard delete + PII 익명화(1차 §3-1)와 결합 시 실수 비용이 큼. 이메일 재입력 확인 등 2단계 권장 |
| A-5 | `RegisterPage.tsx` | 비밀번호 정책(8자+영문+숫자)이 클라이언트에 안내·검증 없음 — 서버 거부 후에야 오류 인지. placeholder 또는 helper text 추가 |
| A-6 | `AdminDashboardPage.tsx:59` | `new Date(item.created_at)` — 백엔드가 KST aware ISO를 주므로 정상이나, 브라우저 로캘 타임존에 따라 날짜가 하루 어긋나 보일 수 있음 (표시용이라 영향 미미) |

---

## 4. 이 세션에서 확인 불가 — 사용자 확인 필요 (재게시)

EC2 원격 명령(SSM)이 권한 정책으로 차단되어 아래는 직접 확인이 필요하다. **1차 Critical §1-2의 실제 노출 여부를 결정하는 항목**이므로 최우선:

```bash
# ① APP_ENV 확인 (Critical §1-2) — 값이 production이어야 함
aws ssm start-session --target i-0709c24299d92c883
grep -E "^APP_ENV=" /home/ec2-user/innovo_homepage/.env

# ② uvicorn 프록시 헤더 (1차 §3-3 rate limit IP 문제 확정용)
systemctl cat innovo-homepage-api | grep ExecStart
#    → --proxy-headers --forwarded-allow-ips 옵션 유무 확인

# ③ nginx 라우팅 실체 (/api/hp vs /admin/api가 어느 앱으로 가는지)
grep -rE "location|proxy_pass" /etc/nginx/conf.d/
```

추가로 ERP HP API의 `/api/hp/account/quotes` 실응답에 `source`·상태값이 어떻게 오는지(1차 §3-7·§5 관련)는 로그인 토큰이 필요해 미확인 — ERP팀 회신 시 함께 확인 권장.

---

## 5. 통합 우선순위 (1차 + 2차)

1. **즉시**: 운영 `APP_ENV` 확인(§4-①) · `boto3` requirements 추가(1차 §2-1) · **Admin 로그인 화면 000000 문구 제거(2차 §2-1)**
2. **이번 주**: 위저드 데드락(1차 §1-1) · mock 폴백 제거(1차 §2-3) · Quick Quote 상태 체계 통일(2차 §2-2 + 1차 §3-7 일괄) · reCAPTCHA 로딩 대기(1차 §3-8)
3. **다음 스프린트**: 관리자 페이지네이션·오류 표시(2차 §2-3·2-4) · 이메일 인증 멱등화(2차 §2-5) · 추천 로직 정합화(1차 §2-2) · PII 익명화 통일(1차 §3-1)
4. **정비**: `cf_config_backup.json` 갱신 절차 수립(2차 §1-1) · 데이터 사전 갱신(2차 §2-6) · pem 파일 이동 · Low 항목

---

*작성: Claude Code 2차 검토 (Fable 5) — 라이브 CloudFront·운영 엔드포인트 실측 포함, EC2 내부 확인은 권한 정책상 제외*
