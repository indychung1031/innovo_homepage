# ERP 팀 작업지시문 — 마이페이지 API 구현

> **작성일**: 2026-06-03  
> **요청자**: 홈페이지 프론트엔드 팀  
> **우선순위**: 높음  
> **배경**: 홈페이지 마이페이지(`/account`) 프론트엔드 구현 완료. 아래 API 연동 후 전체 기능 활성화 가능.

---

## 현황

현재 ERP HP API (`/api/hp/*`) 에 존재하는 엔드포인트:

```
GET  /api/hp/auth/me
POST /api/hp/auth/login
POST /api/hp/auth/logout
POST /api/hp/auth/refresh
POST /api/hp/auth/register
POST /api/hp/auth/forgot-password
POST /api/hp/auth/reset-password
GET  /api/hp/auth/verify-email
POST /api/hp/auth/resend-verification
POST /api/hp/contact
POST /api/hp/quick-quote
```

아래에 기재된 **6개 작업**이 미구현 상태.

---

## 작업 목록

### 작업 1. `GET /api/hp/auth/me` 응답 필드 추가

**현재 응답 (추정):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "홍길동",
  "company_name": "ABC Corp",
  "membership_tier": "general",
  "email_verified": true
}
```

**추가 필요 필드:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "홍길동",
  "company_name": "ABC Corp",
  "phone": "010-1234-5678",
  "created_at": "2026-01-15T09:30:00Z",
  "membership_tier": "general",
  "email_verified": true
}
```

- `phone`: 문자열 또는 `null`
- `created_at`: ISO 8601 형식 (UTC), 문자열 또는 `null`

---

### 작업 2. `PATCH /api/hp/auth/profile` — 프로필 수정

**인증**: Bearer Token 필수

**요청 Body (JSON):**
```json
{
  "full_name": "홍길동",
  "company_name": "ABC Corp",
  "phone": "010-1234-5678"
}
```
- 모든 필드 optional (포함된 필드만 업데이트)
- `email`은 수정 불가 (요청에 포함되어도 무시)

**성공 응답 `200`:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "홍길동",
  "company_name": "ABC Corp",
  "phone": "010-1234-5678",
  "created_at": "2026-01-15T09:30:00Z",
  "membership_tier": "general",
  "email_verified": true
}
```
> 작업 1에서 확장한 `UserPublic` 스키마와 동일한 형태로 반환

**실패 응답 `401`:**
```json
{ "detail": "인증이 필요합니다." }
```

---

### 작업 3. `POST /api/hp/auth/change-password` — 비밀번호 변경

**인증**: Bearer Token 필수

**요청 Body (JSON):**
```json
{
  "current_password": "현재비밀번호",
  "new_password": "새비밀번호",
  "confirm_password": "새비밀번호확인"
}
```

**성공 응답 `200`:**
```json
{ "message": "비밀번호가 변경되었습니다." }
```

**실패 응답:**
- `400` — `current_password` 불일치: `{ "detail": "현재 비밀번호가 올바르지 않습니다." }`
- `400` — `new_password` / `confirm_password` 불일치: `{ "detail": "새 비밀번호가 일치하지 않습니다." }`
- `400` — 비밀번호 정책 미충족 (최소 8자 권장): `{ "detail": "비밀번호는 8자 이상이어야 합니다." }`
- `401` — 미인증: `{ "detail": "인증이 필요합니다." }`

---

### 작업 4. `GET /api/hp/account/quotes` — 내 견적 이력 조회

**인증**: Bearer Token 필수

**Query Parameters:**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `page` | int | `1` | 페이지 번호 (1-based) |
| `size` | int | `20` | 페이지 크기 |

**조회 조건**: `quick_quote_inquiries.contact_email = 로그인 유저 이메일` (현재 `user_id` FK 없음)

**성공 응답 `200`:**
```json
{
  "items": [
    {
      "id": 42,
      "ic_package_type": "BGA",
      "ic_type": "Memory",
      "ic_code": "K4AAG165WA",
      "package_d": 12.0,
      "package_e": 12.0,
      "pin_count": 200,
      "pitch": "0.65mm",
      "quantity": 100,
      "created_at": "2026-05-20T10:00:00Z",
      "status": "quoted"
    }
  ],
  "total": 5,
  "page": 1,
  "size": 20
}
```

**`status` 값 목록 (기존 `quick_quote_inquiries` 컬럼 기준):**
`pending` | `reviewing` | `quoted` | `completed` | `expired`

**`ic_type`, `ic_code`, `quantity`** 는 `null` 허용

**실패 응답 `401`:**
```json
{ "detail": "인증이 필요합니다." }
```

---

### 작업 5. `DELETE /api/hp/auth/account` — 회원 탈퇴

**인증**: Bearer Token 필수

**처리 순서:**
1. `users` 레코드 익명화:
   - `full_name` → `"탈퇴회원"`
   - `email` → `"deleted_{user_id}@deleted.invalid"`
   - `phone` → `NULL`
   - `hashed_password` → 빈 문자열 또는 무작위 값 (재로그인 불가 처리)
   - `is_active` → `False`
2. `quick_quote_inquiries` 중 `contact_email = 탈퇴 이메일` 건 익명화:
   - `contact_name` → `"탈퇴회원"`
   - `contact_email` → `"deleted@deleted.invalid"`
   - `contact_phone` → `NULL`
   - 견적 내용(IC 스펙·수량·일자·상태) 자체는 유지 (5년 보관 의무)
3. Refresh Token 쿠키 삭제 (Set-Cookie: `refresh_token=; Max-Age=0`)

**성공 응답 `200`:**
```json
{ "message": "회원 탈퇴가 완료되었습니다." }
```

**실패 응답 `401`:**
```json
{ "detail": "인증이 필요합니다." }
```

---

### 작업 6. `GET /api/hp/account/catalog-url` — 카탈로그 CloudFront Signed URL 발급

**인증**: Bearer Token 필수 + `membership_tier == "verified"` 확인

**Query Parameter:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `file` | string | 파일 ID (`catalogs.json`의 `id` 값) |

**파일 ID → S3 경로 매핑 (ERP 서버 내부에서 관리):**

| `file` 값 | S3 경로 |
|-----------|---------|
| `socket_list` | `upload/catalog/Socket List 250108.pdf` |
| `probe_pin_plunger` | `upload/catalog/probe_pin_plunger_shape.png` |
| `iso9001_en` | `upload/certificate/ISO9001 (2024) Eng.pdf` |
| `iso9001_ko` | `upload/certificate/ISO9001 (2024) Kor.pdf` |

> 현재 파일들은 S3 `innovo-www-prod` 버킷의 `/upload/` 경로에 **공개 상태**로 존재.  
> 이 작업의 핵심은 해당 파일들을 **비공개 S3 버킷(또는 비공개 경로)으로 이전**한 후,  
> CloudFront Signed URL (만료 시간 포함)을 발급해 반환하는 것.

**성공 응답 `200`:**
```json
{
  "url": "https://[CloudFront Domain]/upload/catalog/Socket%20List%20250108.pdf?Expires=...&Signature=...&Key-Pair-Id=..."
}
```
- URL 만료 시간: **5분** 권장 (다운로드 완료 후 재사용 방지)

**실패 응답:**
- `401` — 미인증: `{ "detail": "인증이 필요합니다." }`
- `403` — 일반 회원 접근: `{ "detail": "인증회원 전용 기능입니다." }`
- `400` — 잘못된 file ID: `{ "detail": "존재하지 않는 파일입니다." }`

---

## 프론트엔드 연동 정보

### 인증 방식
모든 인증 필요 요청에 **Bearer Token** 자동 포함됨:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### 프론트엔드 호출 코드 위치
| 엔드포인트 | 파일 |
|-----------|------|
| `GET /api/hp/auth/me` | `frontend-react/src/api/auth.ts` — `fetchMe()` |
| `PATCH /api/hp/auth/profile` | `frontend-react/src/api/account.ts` — `updateProfile()` |
| `POST /api/hp/auth/change-password` | `frontend-react/src/api/account.ts` — `changePassword()` |
| `GET /api/hp/account/quotes` | `frontend-react/src/api/account.ts` — `getMyQuotes()` |
| `DELETE /api/hp/auth/account` | `frontend-react/src/api/account.ts` — `deleteAccount()` |
| `GET /api/hp/account/catalog-url` | `frontend-react/src/api/account.ts` — `getCatalogDownloadUrl()` |

### 공통 에러 포맷
프론트엔드는 응답의 `detail` 필드로 에러 메시지 표시. 형식 통일 필수:
```json
{ "detail": "에러 메시지" }
```

---

## 확인 요청 사항

ERP 팀 구현 완료 후 아래 항목 홈페이지 팀에 회신 부탁드립니다:

- [ ] 작업 1~5 구현 완료 여부
- [ ] 작업 6 (Signed URL) 구현 완료 여부 및 CloudFront 도메인 변경 여부
- [ ] `GET /api/hp/auth/me` 응답에 `phone`, `created_at` 추가 확인
- [ ] CORS 설정 — `https://www.innovosolution.co.kr` 허용 확인 (신규 엔드포인트 포함)
