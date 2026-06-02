# 07. 마이페이지 기획서

> **작성일**: 2026-06-02  
> **Phase**: 4 (마스터 플랜 §4-5 `/:lang/account`)  
> **상태**: 기획 중 — 개발 착수 전 사용자 승인 필요  
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
- 최신순 정렬, 최대 50건 표시 (페이지네이션 선택)
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

> 카탈로그 파일은 `upload/catalog/`에 추가되면 목록에 반영.  
> 다운로드는 S3 presigned URL 또는 직접 `/upload/` 경로 제공 (인증회원 여부는 프론트 Access Token으로 확인).

---

## 4. 필요한 신규 API

| Method | Path | 역할 | 인증 |
|--------|------|------|------|
| `PATCH` | `/api/auth/profile` | 이름·회사명·연락처 수정 | Access Token |
| `POST` | `/api/auth/change-password` | 현재 비밀번호 확인 후 변경 | Access Token |
| `GET` | `/api/account/quotes` | 내 견적 이력 조회 | Access Token |

> `/api/account/catalogs` — 정적 파일 목록이므로 API 불필요. 프론트에서 하드코딩 or JSON 파일로 관리.

---

## 5. 기존 코드 변경 사항

### 백엔드
- `backend/routers/auth.py`: `PATCH /api/auth/profile`, `POST /api/auth/change-password` 추가
- `backend/routers/` 신규: `account.py` — `GET /api/account/quotes`
- DB 스키마 변경 없음 (기존 `users`, `quick_quote_inquiries` 테이블 그대로 사용)

### 프론트엔드 (React)
- `frontend-react/src/pages/AccountPage.tsx` 신규
- `frontend-react/src/api/account.ts` 신규 (API 호출)
- `frontend-react/src/app/router.tsx`: `/{lang}/account` 라우트 추가 (ProtectedRoute 적용)

---

## 6. 미결 사항 (개발 전 확인 필요)

| # | 질문 | 기본값 |
|---|------|--------|
| Q1 | 견적 이력 페이지네이션 필요 여부? 초기엔 최대 50건으로 충분한가? | 50건 단순 표시 |
| Q2 | 카탈로그 파일 목록을 JSON으로 관리할지, 하드코딩으로 할지? | 하드코딩 (파일 수 적음) |
| Q3 | 회원 탈퇴 기능 포함 여부? | 마스터 플랜 §7-3에 탈퇴 처리 정책 확정됨 — 1차 포함 여부 결정 필요 |
