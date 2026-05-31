# Innovo Homepage — 백엔드 API 레퍼런스

> **API 서버**: `http://54.116.87.172` (socket_auto_design ERP 서버)  
> **프론트 파일에서 base URL 변경**: `quick_quote_form.html`, `contact.js` 내 `ERP_API_BASE` 상수

---

## 공통 사항

| 항목 | 값 |
|------|-----|
| Base URL | `http://54.116.87.172` |
| CORS 허용 Origin | `https://www.innovosolution.co.kr`, `https://innovosolution.co.kr` |
| 인증 | 불필요 (공개 API) |
| Rate Limit | IP당 분당 5회 (첨부 파일 포함 Contact: 분당 3회) |

### 에러 응답 형식

```json
{ "detail": "에러 메시지" }
```

| HTTP | 의미 |
|------|------|
| 400 | 입력값 오류 / reCAPTCHA 실패 |
| 413 | 파일 크기 초과 (10MB 이상) |
| 422 | 필수 필드 누락 또는 타입 오류 |
| 429 | Rate Limit 초과 |
| 500 | 서버 내부 오류 |

---

## 1. Quick Quote (가견적 접수)

### `POST /api/hp/quick-quote`

**Content-Type**: `application/json`

#### Request Body

```json
{
  "ic_package_type": "BGA",
  "ic_code": "STM32F103C8T6",
  "pin_count": 64,
  "pitch": "0.5mm",
  "package_d": 7.0,
  "package_e": 7.0,
  "package_a": 1.2,
  "company_name": "ACME Corp",
  "contact_name": "홍길동",
  "contact_email": "hong@acme.com",
  "contact_phone": "010-1234-5678",
  "quantity": 100,
  "desired_delivery": "2026-07-01",
  "message": "빠른 납기 부탁드립니다",
  "recaptcha_token": "<reCAPTCHA v3 token>",
  "privacy_agreed": true,
  "lang": "ko",
  "ic_type": "Memory"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `ic_package_type` | string | ✅ | `WLP` `BGA` `QFN` `QFP` `SOP` 중 하나 |
| `ic_code` | string\|null | | IC Part Number |
| `pin_count` | integer | ✅ | 1 이상 |
| `pitch` | string | ✅ | `0.4mm` `0.5mm` `0.65mm` `0.8mm` `1.0mm` 또는 숫자 직접입력 (`0.35` → `0.35mm` 자동 변환) |
| `package_d` | float | ✅ | IC 가로 크기 (mm), 0 초과 100 이하 |
| `package_e` | float | ✅ | IC 세로 크기 (mm), 0 초과 100 이하 |
| `package_a` | float\|null | | IC 높이 (mm), 0 초과 50 이하 |
| `company_name` | string | ✅ | 최대 100자 |
| `contact_name` | string | ✅ | 최대 50자 |
| `contact_email` | string | ✅ | 유효한 이메일 형식 |
| `contact_phone` | string\|null | | 최대 30자 |
| `quantity` | integer\|null | | 1 이상 |
| `desired_delivery` | string\|null | | `YYYY-MM-DD` 형식 |
| `message` | string\|null | | 자유 입력 |
| `recaptcha_token` | string | ✅ | `grecaptcha.execute(key, {action: 'quick_quote'})` 결과 |
| `privacy_agreed` | boolean | ✅ | `true` 이어야 함 (false 시 400) |
| `lang` | `"en"` \| `"ko"` | | 기본값 `"en"` — 고객 확인 메일 언어 |
| `ic_type` | string\|null | | `Memory` `Logic` `Power` 등 자유 입력 |

#### Response `200 OK`

```json
{
  "success": true,
  "inquiry_id": 42,
  "message": "가견적 요청이 접수되었습니다. 영업팀이 1-2 영업일 내 연락드립니다."
}
```

#### 프론트엔드 연동 코드 (현재 상태)

```javascript
// quick_quote_form.html
const ERP_API_BASE = 'http://54.116.87.172';

const res = await fetch(`${ERP_API_BASE}/api/hp/quick-quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

---

## 2. Contact (문의하기)

### `POST /api/hp/contact`

**Content-Type**: `multipart/form-data`  
JSON 데이터는 `data` 필드에 문자열로, 파일은 `file` 필드에 첨부합니다.

#### Form Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| `data` | string (JSON) | 아래 Contact JSON을 `JSON.stringify()` 한 값 |
| `file` | File (선택) | PDF / DXF / STEP / STP, 최대 10MB |

#### `data` 필드 JSON 구조

```json
{
  "inquiry_type": "test_socket",
  "company_name": "ACME Corp",
  "contact_name": "홍길동",
  "contact_email": "hong@acme.com",
  "contact_phone": "010-1234-5678",
  "subject": "BGA 소켓 문의",
  "message": "BGA 1.0mm pitch 소켓 제작 가능한지 문의드립니다.",
  "recaptcha_token": "<reCAPTCHA v3 token>",
  "privacy_agreed": true,
  "lang": "ko"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `inquiry_type` | string | | `test_socket` `probe_pin` `test_jig` `other` `product_inquiry` `technical_support` `general_inquiry` — 기본값 `general_inquiry` |
| `company_name` | string | ✅ | 최대 100자 |
| `contact_name` | string | ✅ | 최대 50자 |
| `contact_email` | string | ✅ | 유효한 이메일 형식 |
| `contact_phone` | string\|null | | 최대 30자 |
| `subject` | string | ✅ | 최대 200자 |
| `message` | string | ✅ | 내용 필수 |
| `recaptcha_token` | string | ✅ | `grecaptcha.execute(key, {action: 'contact'})` 결과 |
| `privacy_agreed` | boolean | ✅ | `true` 이어야 함 |
| `lang` | `"en"` \| `"ko"` | | 기본값 `"en"` — 고객 확인 메일 언어 |

#### Response `200 OK`

```json
{
  "success": true,
  "inquiry_id": 17,
  "message": "문의가 접수되었습니다. 1-2 영업일 내 연락드리겠습니다."
}
```

#### 프론트엔드 연동 코드 (현재 상태)

```javascript
// contact.js
const ERP_API_BASE = 'http://54.116.87.172';

const payload = {
  inquiry_type: document.getElementById('category').value,  // HTML element id는 'category' 그대로 유지
  // ... 나머지 필드
};

const fd = new FormData();
fd.append('data', JSON.stringify(payload));
if (fileInput.files[0]) fd.append('file', fileInput.files[0]);

const res = await fetch(`${ERP_API_BASE}/api/hp/contact`, { method: 'POST', body: fd });
```

---

## 환경 변수 설정 (서버)

API 서버(`socket_auto_design`)의 `.env`에 아래 항목을 추가해야 이메일 발송이 동작합니다.

```env
# Mailnara SMTP (Innovo_homepage와 동일한 값 사용)
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_SALES_NOTIFY_EMAIL=

# reCAPTCHA v3 (Innovo_homepage와 동일한 값 사용)
RECAPTCHA_SECRET_KEY=

# 개발 환경에서 reCAPTCHA 검증 건너뛰기 (선택)
# RECAPTCHA_SKIP_VERIFY=true
```

---

## 개발 환경 테스트

reCAPTCHA를 통과시키지 않고 테스트하려면 서버 `.env`에 `RECAPTCHA_SKIP_VERIFY=true` 설정 후 토큰에 아무 값이나 넣으면 됩니다.

```bash
# Quick Quote 테스트
curl -X POST http://54.116.87.172/api/hp/quick-quote \
  -H "Content-Type: application/json" \
  -d '{
    "ic_package_type": "BGA",
    "pin_count": 64,
    "pitch": "0.5mm",
    "package_d": 7.0,
    "package_e": 7.0,
    "company_name": "Test Corp",
    "contact_name": "테스터",
    "contact_email": "test@example.com",
    "recaptcha_token": "dev-skip",
    "privacy_agreed": true,
    "lang": "ko"
  }'

# Contact 테스트 (파일 없음)
curl -X POST http://54.116.87.172/api/hp/contact \
  -F 'data={"inquiry_type":"test_socket","company_name":"Test Corp","contact_name":"테스터","contact_email":"test@example.com","subject":"테스트 문의","message":"테스트입니다","recaptcha_token":"dev-skip","privacy_agreed":true,"lang":"ko"}'
```
