# 07. 마이페이지 기획서

> **작성일**: 2026-06-02  
> **Phase**: 4 (마스터 플랜 §4-5 `/:lang/account`)  
> **상태**: 기획 확정 — 개발 착수 가능  
> **참조**: `00_master_plan.md` §7-1·§7-2, `backend/models.py`, `backend/routers/auth.py`

---

## 1. 개요

로그인한 회원이 자신의 계정 정보와 견적 이력을 확인·관리하는 페이지.  
결제·주문 기능이 없는 B2B 견적 기반 사이트이므로 "주문이력" 대신 **견적 이력**이 핵심.

---

## 2. 페이지 구성

| URL | 탭/섹션 | 접근 조건 |
|-----|---------|---------|
| `/{lang}/account` | 내 정보 (기본) | 로그인 + 이메일 인증 |
| `/{lang}/account?tab=quotes` | 견적 이력 | 로그인 + 이메일 인증 |
| `/{lang}/account?tab=catalogs` | 카탈로그 다운로드 | 로그인 + **인증회원(verified)** |

> 단일 페이지(`/account`) + 탭 전환 구조. URL에 `?tab=` 파라미터 유지해 딥링크 가능.  
> 미로그인 접근 시 `/{lang}/login?next=/{lang}/account` 리다이렉트.

---

## 3. 탭별 상세 명세

### 3-1. 내 정보 탭 (기본)

**표시 정보** (`users` 테이블 기반)

| 항목 | 수정 가능 | 비고 |
|------|---------|------|
| 이메일 | ❌ | 변경 불가 (계정 식별자) |
| 이름 (`full_name`) | ✅ | |
| 회사명 (`company_name`) | ✅ | |
| 연락처 (`phone`) | ✅ | |
| 회원 등급 (`membership_tier`) | ❌ | `general` / `verified` 표시만 |
| 가입일 (`created_at`) | ❌ | 표시만 |

**비밀번호 변경** (별도 섹션)
- 현재 비밀번호 입력 → 새 비밀번호 → 확인
- 현재 비밀번호 검증 후 변경 (`POST /api/auth/change-password`)

**회원 등급 안내**
- `general` 표시 시: "인증회원 승인 후 카탈로그 다운로드 및 기준가 견적 혜택이 제공됩니다. 담당자에게 문의해 주세요." + Contact 링크
- `verified` 표시 시: "✅ 인증회원" 뱃지

---

### 3-2. 견적 이력 탭

**데이터 소스**: `quick_quote_inquiries` 테이블 — `contact_email = 로그인 사용자 이메일` 조건으로 조회

> **제약 사항**: 현재 `quick_quote_inquiries`에 `user_id` FK가 없음.  
> 동일 이메일로 제출한 견적만 표시됨 (비회원으로 제출한 경우 포함, 다른 이메일 제출 건은 미표시).

**목록 표시 항목**

| 항목 | 설명 |
|------|------|
| 접수 번호 | `id` |
| IC 패키지 | `ic_package_type` |
| IC 크기 | `D × E mm` |
| 핀 수 | `pin_count` pin |
| 수량 | `quantity` (없으면 "-") |
| 접수일 | `created_at` |
| 상태 | `pending` / `reviewing` / `quoted` / `completed` / `expired` |

**상태 배지 색상**
| 상태 | 표시 | 색상 |
|------|------|------|
| pending | 접수됨 | 회색 |
| reviewing | 검토중 | 파랑 |
| quoted | 견적발행 | 초록 |
| completed | 완료 | 네이비 |
| expired | 만료 | 빨강 |

**기능**
- 최신순 정렬, **페이지당 20건 표시**, 페이지네이션 UI
- **재요청 버튼**: 동일 IC 스펙으로 `/quote` 폼 자동 채워서 이동 (새 견적 요청)
- 견적이 없을 경우: "아직 견적 요청 이력이 없습니다. [견적 요청하기]" 안내

---

### 3-3. 카탈로그 다운로드 탭

**접근 조건**: `membership_tier === "verified"` 만 표시. `general` 회원은 탭 클릭 시 "인증회원 전용" 안내 표시.

**파일 목록** (정적 파일 기반 — DB 테이블 불필요)

| 파일 | 경로 |
|------|------|
| Socket List (250108) | `/upload/catalog/Socket List 250108.pdf` |
| Probe Pin Plunger Shape | `/upload/catalog/probe_pin_plunger_shape.png` |
| ISO9001 인증서 (영문) | `/upload/certificate/ISO9001 (2024) Eng.pdf` |
| ISO9001 인증서 (국문) | `/upload/certificate/ISO9001 (2024) Kor.pdf` |

> **파일 목록 관리**: `frontend/content/catalogs.json` (또는 `frontend-react/src/content/catalogs.json`) 으로 관리.  
> 파일 추가·삭제 시 JSON만 편집하면 되며 코드 수정 불필요.  
> 다운로드는 직접 `/upload/` 경로 제공 (인증회원 여부는 프론트 Access Token으로 확인).

---

## 4. 필요한 신규 API

| Method | Path | 역할 | 인증 |
|--------|------|------|------|
| `PATCH` | `/api/auth/profile` | 이름·회사명·연락처 수정 | Access Token |
| `POST` | `/api/auth/change-password` | 현재 비밀번호 확인 후 변경 | Access Token |
| `GET` | `/api/account/quotes` | 내 견적 이력 조회 (page, size=20) | Access Token |
| `DELETE` | `/api/auth/account` | 회원 탈퇴 — 개인정보 즉시 삭제, 견적 익명화 | Access Token |

> `/api/account/catalogs` — 정적 JSON 파일 목록이므로 API 불필요.

---

## 5. 기존 코드 변경 사항

### 백엔드
- `backend/routers/auth.py`: `PATCH /api/auth/profile`, `POST /api/auth/change-password`, `DELETE /api/auth/account` 추가
- `backend/routers/` 신규: `account.py` — `GET /api/account/quotes?page=1&size=20`
- DB 스키마 변경 없음 (기존 `users`, `quick_quote_inquiries` 테이블 그대로 사용)

### 탈퇴 처리 로직 (`DELETE /api/auth/account`)
마스터 플랜 §7-3 확정 내용 기준:
1. `users` 레코드에서 이름·이메일·전화번호·비밀번호 즉시 삭제 (또는 `is_active=False` + 필드 익명화)
2. `quick_quote_inquiries` 중 `contact_email = 탈퇴 이메일` → `contact_name="탈퇴회원"`, `contact_email="deleted@deleted"`, `contact_phone=NULL` 익명화
3. 견적 기록(제품·수량·금액·날짜) 자체는 5년 보관
4. Refresh 쿠키 삭제

### 프론트엔드 (React)
- `frontend-react/src/pages/AccountPage.tsx` 신규
- `frontend-react/src/api/account.ts` 신규 (API 호출)
- `frontend-react/src/app/router.tsx`: `/{lang}/account` 라우트 추가 (ProtectedRoute 적용)
- 탈퇴 버튼: "정말 탈퇴하시겠습니까?" 확인 다이얼로그 후 처리

---

## 6. 확정 사항

| # | 항목 | 확정 내용 |
|---|------|---------|
| Q1 | 견적 이력 표시 | ✅ 페이지네이션, 페이지당 **20건** |
| Q2 | 카탈로그 목록 관리 | ✅ **JSON 파일** 관리 (코드 수정 없이 파일 추가·삭제 가능) |
| Q3 | 회원 탈퇴 | ✅ **포함** — 개인정보 즉시 삭제, 견적 기록 익명화 후 5년 보관 |
