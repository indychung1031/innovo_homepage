# 전면 코드 검토 보고서 (2026-07-07)

- **검토 범위**: `backend/` 전체 (약 3,000줄), `frontend-react/src/` 핵심 모듈 (API 계층·인증·견적 위저드·마이페이지·관리자), 배포 설정 (`cf_config_backup.json`, `scripts/deploy-backend.ps1`, `frontend-react/.env.production`), Alembic 마이그레이션, `requirements.txt`
- **검토 방법**: 전 파일 정독 + 백엔드↔프론트엔드 API 계약 대조 + CloudFront 라우팅 설정 대조 + git 이력 확인
- **심각도 기준**: 🔴 Critical(핵심 기능 불능/보안 구멍) · 🟠 High(운영 장애·데이터 위험) · 🟡 Medium(조건부 오류·품질 저하) · ⚪ Low(개선 권장)

---

## 요약

| # | 심각도 | 영역 | 제목 |
|---|--------|------|------|
| 1 | 🔴 | FE | Quote Wizard: test_socket 시리즈에서 1단계 통과 불가 (검증 순서 데드락) |
| 2 | 🔴 | BE 보안 | `APP_ENV` 미설정 시 Admin 2FA가 고정 코드 `000000`으로 우회됨 |
| 3 | 🟠 | BE 배포 | `requirements.txt`에 `boto3` 누락 — 신규 환경에서 백엔드 기동 실패 |
| 4 | 🟠 | FE 로직 | 소켓 추천 tolerance 부호가 ERP 로직과 반대 — 작은 소켓 오추천 가능 |
| 5 | 🟠 | FE | 운영에서 ERP 견적 API 실패 시 mock 가격으로 무언(無言) 폴백 |
| 6 | 🟠 | Infra | CloudFront에 `/api/erp/*`·`/api/account/*` behavior 부재 (백업 설정 기준) |
| 7 | 🟡 | BE 개인정보 | 회원 탈퇴/삭제 시 wizard_quotes·contact_inquiries PII 미익명화 |
| 8 | 🟡 | BE 성능 | async 엔드포인트 안에서 동기 SMTP·bcrypt 실행 → 이벤트 루프 블로킹 |
| 9 | 🟡 | BE | 인메모리 rate limit의 3가지 문제 (프록시 IP·메모리 누수·다중 워커) |
| 10 | 🟡 | BE | Contact 첨부: 전체 파일을 메모리에 읽은 뒤 크기 검사 |
| 11 | 🟡 | BE 보안 | `/upload` 전체 공개 마운트 — 고객 첨부 도면이 무인증 접근 가능 경로에 존재 |
| 12 | 🟡 | BE 보안 | Refresh 토큰 서버측 폐기 불가 (로그아웃·비번 변경 후에도 유효) |
| 13 | 🟡 | FE | 마이페이지 견적 상태값 불일치 — `sent_to_erp`/`closed` 표시 깨짐 |
| 14 | 🟡 | FE | reCAPTCHA 미로딩 시 `dev-skip-token` 전송 → 원인 불명 제출 실패 |
| 15 | 🟡 | BE | 회원가입 동시 요청 경쟁 조건 → 500 오류 |
| 16 | 🟡 | BE | Admin OTP 메일 발송 실패 시에도 "코드 발송됨" 응답 |
| 17〜 | ⚪ | 전반 | Low 항목 15건 (아래 §4) |

이미 별도 문서로 추적 중인 이슈(위저드 mock 3중 원인, ERP `/catalog-url` 보류, 위저드 이력 마이페이지 미표시, 위저드 파일 첨부 미전송)는 §5에 관계만 정리했다.

---

## 1. Critical

### 1-1. Quote Wizard: test_socket 시리즈에서 1단계 통과 불가 🔴

**위치**: `frontend-react/src/pages/quote-wizard/QuoteWizardPage.tsx:142`, `:415-426`

**근거**:
```tsx
// validateStep1() — 142행
if (draft.series === 'test_socket' && !draft.socket_type_id) {
  return false;
}

// Step 1 "다음" 버튼 — 415행 이하
onClick={() => {
  if (!validateStep1()) {          // ← socket_type_id가 null이면 여기서 차단
    setError(t('errors.required'));
    return;
  }
  patch({
    step: 2,
    socket_type_id: recommended?.socket_type_id ?? null,  // ← 검증 통과 후에야 비로소 대입
    ...
  });
}}
```
`draft.socket_type_id`에 값을 넣는 코드는 이 "다음" 버튼의 `patch()`가 유일한데(시리즈 변경 시에는 오히려 `null`로 초기화, 306행), 그 `patch()`는 `validateStep1()` 통과 **후에만** 실행된다. 즉 새 사용자(localStorage 초안 없음)가 test_socket 시리즈로 모든 필드를 채워도 1단계에서 "필수 입력" 오류만 반복되고 절대 2단계로 진행할 수 없다. 이 로직은 최초 구현 커밋(`f6c74be`)부터 동일했으며, S8 QA 보고서는 라우트 등록 여부만 점검해 이 흐름을 통과 테스트하지 않았다. (과거 프로토타입 초안이 localStorage에 남아 있던 개발 환경에서는 재현되지 않았을 수 있음.)

**영향**: 회원 전용 핵심 기능(테스트 소켓 견적 위저드)이 신규 사용자에게 사실상 사용 불가.

**해결방안** (택1):
1. `validateStep1()`의 해당 조건을 `if (draft.series === 'test_socket' && !recommended) return false;`로 변경 — "추천 소켓이 존재하는가"가 원래 의도로 보임.
2. 또는 치수 입력 시점에 추천 결과를 `draft.socket_type_id`에 즉시 persist(useEffect)하고 검증은 그대로 유지.

수정 후 브라우저에서 신규 계정 + localStorage 초기화 상태로 1→4단계 전체 통과를 반드시 확인할 것.

---

### 1-2. `APP_ENV` 미설정 시 Admin 2FA가 `000000`으로 우회됨 🔴

**위치**: `backend/routers/admin.py:99-102`, `backend/config.py:26`

**근거**:
```python
# config.py — 기본값이 development
app_env: str = "development"

# admin.py verify_2fa
if settings_check.is_development and payload.otp_code == "000000":
    otp_valid = True
```
`APP_ENV`가 운영 서버 `.env`에 **누락되기만 해도** `is_development=True`가 되어, 비밀번호만 알면 고정 코드 `000000`으로 2FA를 통과할 수 있다. 같은 플래그에 refresh 쿠키의 `secure` 해제(`auth.py:60`)와 SQLAlchemy `echo=True`(SQL 전문·개인정보가 로그에 기록, `database.py:15`)도 함께 묶여 있어 파급이 크다.

**영향**: 환경변수 설정 실수 하나로 관리자 2FA 무력화 + 쿠키 보안 약화 + 로그에 PII 유출.

**해결방안**:
1. **즉시**: EC2 운영 `.env`에 `APP_ENV=production`이 실제로 설정돼 있는지 확인 (`sudo cat /home/ec2-user/innovo_homepage/.env | grep APP_ENV`).
2. **코드**: 안전한 기본값으로 전환 — `app_env: str = "production"`으로 바꾸고 로컬 개발은 `.env`에서 명시적으로 development 지정. `000000` 우회는 별도 플래그(`ADMIN_2FA_DEV_BYPASS`)로 분리하고 `is_development and bypass_flag` 이중 조건으로.
3. **방어**: 앱 기동 시 `app_env == production`인데 `secret_key == "change-me"` 등 기본값이면 기동 실패(fail-fast)시키는 검증을 `startup.py`에 추가.

---

## 2. High

### 2-1. `requirements.txt`에 `boto3` 누락 🟠

**위치**: `backend/routers/account.py:7` (`import boto3` — 모듈 최상단), `requirements.txt`

`main.py`가 `account` 라우터를 항상 import하므로, boto3가 없는 환경(새 EC2, 새 venv, CI)에서는 **서버가 기동 자체에 실패**한다. 현재 운영 EC2는 수동 설치된 boto3에 의존하고 있을 가능성이 높다 — `deploy-backend.ps1`은 코드만 동기화하고 `pip install -r requirements.txt`를 실행하지 않아 지금까지 드러나지 않았다.

**해결방안**: `requirements.txt`에 `boto3>=1.34,<2.0` 추가. 배포 스크립트의 EC2 단계에 `pip install -r requirements.txt --quiet`도 추가 권장.

### 2-2. 소켓 추천 tolerance 부호가 ERP 로직과 반대 🟠

**위치**: `frontend-react/src/features/quote-wizard/recommendSocket.ts:16` vs `backend/utils/design_logic.py:85-91`

**근거**:
```ts
// 프론트 (주석: "ERP design_logic.recommend_socket_type 와 동일한 클라이언트 추천")
if (icD <= socket.max_ic_width + tolD && icE <= socket.max_ic_length + tolE)
```
```python
# ERP 원본 로직
max_ic_w = ic_d + tol_d          # tolerance를 IC 치수에 더한다
candidates = ... SocketType.max_ic_width >= max_ic_w ...
```
ERP는 `ic + tol ≤ max`(공차만큼 **더 큰** 소켓 요구), 프론트는 `ic ≤ max + tol`(공차만큼 **더 작은** 소켓 허용)로 부등식 방향이 반대다. 공차가 0이 아닌 경우 프론트는 IC가 물리적으로 들어가지 않는 소켓을 추천할 수 있다. 정렬 기준도 다르다(ERP: 면적 `w*l` 오름차순, 프론트: 폭→길이 사전순) — 폭·길이가 비대칭인 소켓 목록에서는 서로 다른 결과가 나온다.

현재 UI에 tolerance 입력 필드가 노출되지 않아(`tolerance_d/e` 기본 '0') 실피해는 정렬 차이에 한정되지만, 주석과 달리 "동일 로직"이 아니므로 수정해야 한다.

**해결방안**:
```ts
if (icD + tolD <= socket.max_ic_width && icE + tolE <= socket.max_ic_length)
```
정렬도 `(a.max_ic_width * a.max_ic_length) - (b.max_ic_width * b.max_ic_length)`로 통일.

### 2-3. ERP 견적 API 실패 시 mock 가격으로 무언 폴백 🟠

**위치**: `frontend-react/src/api/erp.ts:116-138` (`postQuoteEstimate`), `:29-71` (마스터 4종도 동일 패턴)

`VITE_WIZARD_USE_MOCK=false`인 운영 빌드에서도 ERP 호출이 실패하면 `catch { return mockQuoteEstimate(...) }`로 **임의 산식(80,000 + 핀수×500원)의 가격을 실제 견적처럼 표시**한다. 실패 사실이 사용자·운영자 어느 쪽에도 드러나지 않는다. (ERP측 원인은 `document/tasks/erp_quote_wizard_pricing_task.md`로 추적 중이지만, ERP가 복구되어도 일시 장애 때마다 같은 문제가 재발하는 구조다.)

**해결방안**: 운영 모드에서는 폴백 대신 오류를 던지고 3단계에서 "잠시 후 다시 시도" 안내를 표시. mock 폴백은 `useMock === true`일 때만 허용. 마스터 데이터(소켓·커버·재질)는 폴백을 유지하더라도 **가격만큼은** 폴백 금지 권장.

### 2-4. CloudFront에 `/api/erp/*`·`/api/account/*` behavior 부재 (확인 필요) 🟠

**위치**: `cf_config_backup.json` / `cf_update.json` (behavior: `/admin/api/*`, `/api/hp/*`, `/upload/catalog/*`, `/upload/certificate/*` 4종뿐)

리포지토리에 저장된 CloudFront 설정 기준으로:
- `fetchPins()`의 `/api/erp/pins` (`frontend-react/src/api/erp.ts:103`) — Probe Pin 3개 페이지·Contact 페이지 핀 프리필이 사용
- `getPublicDownloadUrl()`의 `/api/account/public-download-url` (`frontend-react/src/api/account.ts:90`)

이 두 경로는 매칭 behavior가 없어 default(S3) → 404 → CustomErrorResponse로 **`index.html`이 200으로 반환**되고, `res.json()` 파싱이 실패한다. Probe Pin 페이지는 catch로 오류 화면을 띄우므로 조용히 기능이 죽고, `public-download-url`은 현재 DownloadsPage에서 ISO 인증서가 `request` 모드로 바뀌어 실호출되지 않아 잠복 상태다.

**해결방안**:
1. 라이브 CloudFront 배포 설정을 확인: `aws cloudfront get-distribution-config --id EAD1YVAYMLDS7`. 콘솔에서 `/api/erp/*` behavior를 이미 추가했다면 `cf_config_backup.json`이 구버전이므로 백업 갱신.
2. 없다면 `/api/erp/*` → ERP-EC2 behavior 추가.
3. `getPublicDownloadUrl`은 사용 재개 전에 경로를 `/api/hp/...` 체계로 통일하거나 behavior를 추가할 것. 미사용이면 dead code로 제거.

---

## 3. Medium

### 3-1. 회원 탈퇴/삭제 시 PII 익명화 불완전 🟡

**위치**: `backend/routers/auth.py:325-351` (`delete_account`), `backend/routers/admin.py:425-442` (`delete_user`)

- 본인 탈퇴: `quick_quote_inquiries`만 익명화. **`wizard_quotes`(contact_name/email/phone/company)와 `contact_inquiries`는 실명 그대로 보존**된다. `wizard_quotes.user_id`는 FK가 SET NULL이지만 탈퇴는 삭제가 아니라 비활성화이므로 user_id 연결도 남는다.
- 관리자 삭제: User 행을 hard delete하고 quick_quote만 익명화 — 마찬가지로 wizard/contact 미처리. 본인 탈퇴는 `company_name`을 남기고 관리자 삭제는 지우는 등 두 경로의 익명화 범위도 서로 다르다.
- `admin.py:436`의 `__import__("sqlalchemy")` 인라인 임포트는 상단 `from sqlalchemy import update`로 정리.

**해결방안**: 공용 `anonymize_user_records(db, user)` 유틸을 만들어 두 경로가 동일하게 quick_quote + wizard_quotes + contact_inquiries를 익명화하도록 통일. 개인정보처리방침의 보존·파기 조항과 범위 일치 여부도 확인.

### 3-2. async 엔드포인트 내 동기 SMTP·bcrypt 🟡

**위치**: `backend/utils/email_utils.py:15-46` (smtplib, timeout 10초), 호출부 `auth.py` register/forgot 등, `contact.py:78-82`, `quick_quote.py:130-134`; bcrypt는 `auth.py:126` 등

`async def` 엔드포인트 안에서 동기 함수를 직접 호출하면 FastAPI가 스레드풀로 넘기지 못하고 **이벤트 루프 전체가 최대 10초 멈춘다** (SMTP 서버 지연 시 그 동안 모든 요청 처리 중단). bcrypt 검증(~100ms)도 동일한 구조.

**해결방안**: 이메일 발송은 `BackgroundTasks`로 전환(응답 후 발송 — 현재도 실패를 무시하므로 의미 동일)하거나 `await asyncio.to_thread(_send_email, ...)`. bcrypt는 `await asyncio.to_thread(verify_password, ...)` 또는 해당 엔드포인트를 `def`(sync)로 선언해 스레드풀에서 실행되게 변경.

### 3-3. 인메모리 rate limit의 구조적 한계 🟡

**위치**: `backend/utils/rate_limit.py`

1. **프록시 IP 문제**: CloudFront → nginx → uvicorn 구조에서 uvicorn이 `--proxy-headers`(+`--forwarded-allow-ips`) 없이 돌면 `request.client.host`가 전부 프록시 IP → **전 사용자가 버킷 하나를 공유**해 admin-login 5회/분 같은 한도가 전역 한도가 된다(정상 사용자 429 유발, 역으로 공격자 IP 차단은 불가). EC2 systemd 유닛의 uvicorn 옵션 확인 필요.
2. **메모리 누수**: `_request_log` 키가 삭제되지 않아 IP×버킷 조합만큼 무한 증가.
3. **다중 워커/재시작**: 워커별 독립 카운터라 실효 한도가 워커 수만큼 곱해지고 재시작 시 리셋.

**해결방안**: 단기 — uvicorn proxy 헤더 설정 확인 + 주기적 키 청소(마지막 접근 60초 경과 키 삭제). 중기 — 단일 인스턴스라도 nginx `limit_req` 병용 권장.

### 3-4. Contact 첨부의 전체 메모리 적재 🟡

**위치**: `backend/utils/contact_files.py:40-46`

`upload.file.read()`로 파일 전체를 읽은 **후** 10MB 검사를 한다. Content-Length를 속이거나 스트리밍으로 대용량을 보내면 검사 전에 메모리를 소모한다(Starlette가 일정 크기 이상은 디스크 스풀링하므로 완전한 OOM은 아니지만, read() 시 RAM에 올라옴).

**해결방안**: 루프로 청크 단위 read하며 누적 크기가 한도 초과 시 즉시 413 반환. nginx `client_max_body_size 11m` 설정 병행.

### 3-5. `/upload` 전체 공개 마운트에 고객 첨부 포함 🟡

**위치**: `backend/main.py:41-42`, `backend/config.py:55` (`contact_upload_dir = "upload/contact"`)

`/upload`가 StaticFiles로 무인증 공개되는데 contact 첨부(고객 도면·NDA성 자료)가 그 하위 `upload/contact/{id}/{uuid}_{원본명}`에 저장된다. uuid4 hex 덕에 URL 추측은 사실상 불가능하지만, "인증된 관리자만 다운로드"(전용 엔드포인트 `admin.py:376` 존재)라는 설계 의도와 달리 링크 유출 시 누구나 접근 가능하다.

**해결방안**: `contact_upload_dir`를 `private_upload/contact` 등 공개 마운트 밖으로 이동(기존 파일 이전 + DB `attachment_path` 갱신). 관리자 다운로드는 이미 별도 엔드포인트가 있으므로 영향 없음.

### 3-6. Refresh 토큰 폐기 수단 없음 🟡

**위치**: `backend/utils/jwt_utils.py`, `backend/routers/auth.py:148-178`

Refresh JWT(14일)가 서버측 저장 없이 서명만으로 검증되어 로그아웃(쿠키만 삭제)·비밀번호 변경·계정 탈취 대응 시 **기존 토큰을 무효화할 방법이 없다**. 탈퇴 시에는 `is_active=False` 체크로 차단되므로 커버됨.

**해결방안**: 토큰에 `jti`를 넣고 해시를 DB에 저장, refresh 시 rotation + 이전 jti 폐기. 최소한 비밀번호 변경 시각(`password_changed_at`)을 두고 그 이전 발급 토큰(`iat` 비교)을 거부하는 경량 방식도 가능.

### 3-7. 마이페이지 견적 상태값 불일치 🟡

**위치**: `frontend-react/src/api/account.ts:5` (`QuoteStatus`), `AccountPage.tsx:28-34` (`STATUS_STYLES`), `frontend/content/i18n/account.{en,ko}.json` (`quotes.status`)

프론트는 `pending | reviewing | quoted | completed | expired`만 정의했으나, 백엔드는 ERP 전송 성공 시 **자동으로 `sent_to_erp`** 를 설정하고(`quick_quote.py:140`), 관리자 화면은 `closed` 등도 사용한다(`AdminQuotesPage.tsx:6`). 해당 상태의 견적은 마이페이지에서 배지 스타일이 `undefined`가 되고 라벨이 원시 키(`account:quotes.status.sent_to_erp`)로 노출된다.

**해결방안**: i18n에 `sent_to_erp`·`closed`(및 admin이 쓰는 값 전부) 추가 + `STATUS_STYLES`에 대응 스타일 추가 + 미정의 상태는 회색 기본 배지로 폴백하는 방어 코드.

### 3-8. reCAPTCHA 미로딩 시 `dev-skip-token` 전송 🟡

**위치**: `frontend-react/src/lib/recaptcha.ts:36-38`

```ts
if (!siteKey || !window.grecaptcha) {
  return 'dev-skip-token';
}
```
운영에서도 스크립트 로드가 늦거나(느린 회선에서 빠른 제출) 광고 차단기가 스크립트를 막으면 `dev-skip-token`이 전송되어 서버 검증이 100% 실패한다. 사용자는 "reCAPTCHA 검증 실패"만 보게 되어 원인 파악이 어렵다.

**해결방안**: `siteKey`가 있으면 먼저 `await loadRecaptchaScript(siteKey)` 후 `window.grecaptcha` 존재를 재확인하고, 그래도 없으면 "보안 스크립트 로드 실패 — 새로고침 후 재시도" 오류를 명시적으로 던질 것.

### 3-9. 회원가입 동시 요청 경쟁 조건 🟡

**위치**: `backend/routers/auth.py:78-102`

이메일 중복을 SELECT로 검사한 뒤 INSERT하므로, 같은 이메일 동시 가입(더블 클릭 포함)이면 두 번째 요청이 UNIQUE 제약 위반 `IntegrityError` → 500. `db.commit()`을 `try/except IntegrityError`로 감싸 409로 응답할 것. (contact/quick_quote는 UNIQUE 제약이 없어 해당 없음.)

### 3-10. Admin OTP 메일 실패 시에도 정상 응답 🟡

**위치**: `backend/routers/admin.py:60-72`

운영에서 SMTP 장애면 OTP를 못 받는데 프론트에는 "Verification code sent"가 표시된다. TOTP 미등록 관리자라면 로그인 자체가 불가능한 상태를 인지할 수 없다. 발송 실패 시 503 + "잠시 후 재시도" 응답으로 변경 권장 (단, 이메일 존재 열거 방지를 위해 자격 증명 검증 이후 단계이므로 문제 없음).

---

## 4. Low (개선 권장)

| # | 위치 | 내용 | 권장 |
|---|------|------|------|
| L-1 | `backend/utils/design_logic.py` | 존재하지 않는 `models.SocketType`·`PinMaster` 등을 참조하는 사장(死藏) 코드. import는 되지만 호출 시 `AttributeError`. 현재 어떤 라우터도 사용 안 함 | 삭제하거나 파일 상단 docstring에 "미사용 — ERP 이식 대기" 명시 유지 결정 |
| L-2 | `backend/config.py:25,45` | `secret_key`/`admin_secret_key` 기본값 `change-me` — 미설정 시 JWT 위조 가능 | 1-2 해결방안 3의 fail-fast에 포함 |
| L-3 | `backend/schemas/admin.py:35` | `StatusPatch.status`가 자유 문자열 — 오타 상태값 유입 가능 | `Literal[...]`로 제한 |
| L-4 | `backend/utils/security.py` | bcrypt는 72바이트 초과분을 무시 — 128자 허용과 불일치 | 안내문 또는 `max_length=72`로 정합화 |
| L-5 | `backend/routers/admin.py:154-169` | 검색어의 `%`·`_` 미이스케이프 — 와일드카드로 동작 (보안 문제는 아님) | `q.replace('%','\\%')` 등 이스케이프 |
| L-6 | `database/env.py:30` | DB 비밀번호에 `%` 포함 시 configparser interpolation 오류로 alembic 실패 | `settings.database_url.replace('%','%%')` |
| L-7 | `backend/main.py:36` | `@app.on_event("startup")` deprecated | lifespan 컨텍스트로 전환 |
| L-8 | `backend/routers/auth.py:201-230` | 인증 메일 재발송 시 기존 토큰 계속 유효 + 토큰 테이블 무기한 적재 | 재발송 시 기존 미사용 토큰 무효화, 만료 토큰 주기 삭제 |
| L-9 | `backend/routers/admin.py:75-126` | OTP 6자리·5분 유효·IP당 10회/분 — 다중 IP 브루트포스에 이론상 취약 | challenge 토큰당 시도 횟수(예: 5회) 제한 |
| L-10 | `frontend-react/src/pages/auth/LoginPage.tsx:51-55` | `next` 없으면 로그인 후 리다이렉트 없이 성공 메시지만 표시 | 홈 또는 `/account`로 이동 |
| L-11 | `frontend-react/src/pages/DownloadsPage.tsx:152` | 오류 문구가 한국어 하드코딩 — 영어 사용자에게도 한국어 노출 | i18n 키로 이동 |
| L-12 | `frontend-react/.env.production` | git에 추적됨 (공개값뿐이라 유출은 아니나 CLAUDE.md 정책과 상충 소지) | example만 추적하는 관례로 통일할지 결정 |
| L-13 | `frontend-react/src/api/hpFetch.ts:26` 등 | 비JSON 응답(예: 502 HTML) 시 `res.json()`이 SyntaxError를 그대로 노출 | `try { json } catch → 상태코드 기반 메시지` |
| L-14 | `frontend-react/src/pages/AccountPage.tsx:644` | `tab` 쿼리 미검증 — 임의 값이면 빈 화면 | 화이트리스트 검증 후 기본 탭 폴백 |
| L-15 | `frontend-react/src/components/products/SpecTable.tsx:18,35` | `dangerouslySetInnerHTML`(정적 i18n이라 저위험) + ReactNode label의 `String()` key가 `[object Object]` | 주석 명시, key를 고정 문자열로 |
| L-16 | `frontend-react/src/pages/AccountPage.tsx:91` | 전화번호를 비워서 저장 불가 (`trim() \|\| undefined`) | 빈 문자열 전송 허용 여부 정책 결정 |
| L-17 | `document/hp_api_reference.md` vs `quick_quote.py:94` | 문서는 분당 5회, 로컬 백엔드 구현은 기본 10회 | 문서 또는 구현 정합화 |

---

## 5. 기존 추적 이슈와의 관계 (신규 아님, 참고)

| 기존 문서 | 관련 검토 결과 |
|-----------|----------------|
| `document/tasks/erp_quote_wizard_pricing_task.md` (ERP팀 회신 대기) | 위저드 실거래가·이력 통합의 근본 원인은 ERP측이지만, **§2-3(mock 무언 폴백)은 홈페이지 코드에서 별도로 고쳐야** ERP 복구 후에도 재발하지 않음 |
| `document/tasks/erp_mypage_api_request.md` (`/catalog-url` ERP측 보류) | DownloadsPage·마이페이지 카탈로그 탭에서 verified 회원이 다운로드 클릭 시 실패하는 현상은 이 보류 때문. 이 리포지토리 백엔드에는 동일 기능(`/api/account/catalog-url`)이 이미 구현돼 있으므로, ERP 일정이 늦어지면 CloudFront에 `/api/account/*` behavior를 추가해 자체 백엔드로 서비스하는 우회안도 가능 (§2-4와 연계) |
| 기획서 §13 (위저드 파일 첨부 미전송) | 코드 확인 결과 일치 — `QuoteWizardPage.tsx:494-501`에서 파일명만 저장, 실제 업로드 없음. 사용자는 첨부가 전송됐다고 오인할 수 있으므로 구현 전까지 UI에 "파일명만 전달됩니다" 안내 추가 권장 |
| `getWizardQuoteHistory()` (`account.ts:75-80`) | ERP `/api/hp/account/quotes`가 `source` 필드로 wizard 항목을 반환하기 전까지 항상 빈 목록 — 위 pricing task ④에 이미 포함됨 |

---

## 6. 우선순위 제안

1. **즉시 (배포 전 확인)**: §1-2 운영 `.env`의 `APP_ENV` 확인, §2-1 boto3 requirements 추가, §2-4 라이브 CloudFront behavior 확인
2. **이번 주**: §1-1 위저드 데드락 수정(+실기기 검증), §2-3 mock 폴백 제거, §3-7 상태값 정합화, §3-8 reCAPTCHA 로딩 대기
3. **다음 스프린트**: §2-2 추천 로직 정합화, §3-1 익명화 통일, §3-2 이메일 비동기화, §3-5 업로드 경로 이동, §3-6 refresh 토큰 폐기
4. **백로그**: §3-3, §3-4, §3-9, §3-10 및 Low 전체

---

## 7. 검토에서 확인한 양호 사항

- 비밀번호 bcrypt 해싱, 토큰류(이메일 인증·비밀번호 재설정·OTP)는 원문 대신 SHA-256 해시만 DB 저장 — 올바른 패턴
- 이메일 존재 열거 방지 응답(가입/재설정/재발송의 중립 메시지) 일관 적용
- SQL은 전부 SQLAlchemy 파라미터 바인딩 — 인젝션 경로 없음
- React 기본 이스케이프 + `dangerouslySetInnerHTML` 1곳(정적 리소스)뿐 — XSS 표면 작음
- 액세스 토큰 메모리 보관 + refresh httpOnly 쿠키 구조는 XSS 내성 관점에서 양호
- 프론트 `.env`(로컬)는 gitignore 처리, 백엔드 하드코딩 비밀값 없음 (`os.getenv`/pydantic-settings 일관)
- Alembic 마이그레이션 7종이 models.py와 정합 (lead_time_rules 포함)
- 콘텐츠 i18n JSON 31종 전부 파싱 정상

---

*작성: Claude Code 전면 검토 (Fable 5) — 근거 라인 번호는 2026-07-07 시점 master 브랜치 기준*
