# 11. Admin 대시보드 기획서

> **작성일**: 2026-06-08
> **업데이트**: 2026-06-08 v1.1 (KST 명시, 신규 회원 기준, Quick Quote 미처리 범위, role 권한 확정)
> **상태**: 기획 완료 — 구현 승인 대기
> **마스터 플랜 위치**: `00_master_plan.md §7-4` Phase 4-B
> **목적**: Admin 로그인 후 첫 화면에서 핵심 수치와 미처리 항목을 한눈에 파악

---

## 1. 목표 및 범위

### 포함
- `/admin/dashboard` 페이지 신규 구현
- `GET /admin/api/dashboard` 통계 API 엔드포인트 추가
- Admin 네비게이션에 "Dashboard" 링크 추가
- Admin 로그인 후 기본 진입 경로를 `/admin/dashboard`로 변경

### 미포함
- 차트/그래프 라이브러리 (숫자 카드 방식으로만 구현 — 추후 선택)
- 실시간 WebSocket 업데이트
- PDF 내보내기

---

## 2. 데이터 소스 (현행 DB 기준)

| 테이블 | 활용 컬럼 |
|--------|---------|
| `wizard_quotes` | `status`, `matched`, `total_price`, `membership_tier`, `created_at` |
| `quick_quote_inquiries` | `status`, `created_at` |
| `users` | `membership_tier`, `email_verified_at`, `is_active`, `created_at` |
| `contact_inquiries` | `status`, `created_at` |

---

## 3. 화면 구성

```
/admin/dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[KPI 카드 행 — 이번 달 기준]
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 위저드 견적  │ │  Quick Quote │ │   신규 회원  │ │   문 의      │
│    이번 달   │ │    이번 달   │ │    이번 달   │ │    이번 달   │
│     NN 건    │ │     NN 건    │ │     NN 명    │ │     NN 건    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

[미처리 현황 행 — 전체 누적]
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│미처리 위저드 │ │미처리 Quick  │ │  미처리 문의 │ │  인증회원 수 │
│  (pending)   │ │   Quote      │ │   (new)      │ │  (verified)  │
│     NN 건    │ │     NN 건    │ │     NN 건    │ │     NN 명    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

[만료 임박 견적 — 위저드 견적 status=pending, 접수 5일 이상 경과]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
만료 임박 견적 (NN건)                        [Wizard Quotes →]
──────────────────────────────────────────────────
#ID   IC Code         회사명           접수일      남은 시간
10    BGA-U-178...   TestCo           06-01      1일 후
 9    QFN-V-452...   SampleCo         06-02      2일 후
──────────────────────────────────────────────────
```

---

## 4. 만료 임박 기준

- `wizard_quotes.status = 'pending'` AND `created_at < NOW() - INTERVAL '5 days'`
- 즉, **접수 후 5일 이상 경과**한 미처리 견적 (7일 기한에서 2일 이내 만료)
- 없으면 "만료 임박 견적이 없습니다." 메시지 표시

---

## 5. 백엔드 API

### 5-1. 엔드포인트

```
GET /admin/api/dashboard
Authorization: require_staff_roles("admin", "sales_admin") — 기존 엔드포인트 패턴 동일
```

### 5-2. 응답 스펙

```json
{
  "this_month": {
    "wizard_quotes": 5,
    "quick_quotes": 12,
    "new_users": 3,
    "contacts": 7
  },
  "pending": {
    "wizard_quotes": 8,
    "quick_quotes": 15,
    "contacts": 4,
    "verified_users": 6
  },
  "expiring_soon": [
    {
      "id": 10,
      "ic_code": "BGA-U-1780727480",
      "contact_company": "TestCo",
      "created_at": "2026-06-01T09:30:00Z",
      "days_until_expiry": 1
    }
  ]
}
```

### 5-3. 쿼리 로직

```python
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))

# 현재 시각 (KST 기준)
now = datetime.now(KST)

# this_month 기준: 현재 월의 1일 00:00:00 KST 이후
month_start = datetime(now.year, now.month, 1, tzinfo=KST)

# this_month.wizard_quotes
SELECT COUNT(*) FROM wizard_quotes WHERE created_at >= :month_start

# this_month.quick_quotes
SELECT COUNT(*) FROM quick_quote_inquiries WHERE created_at >= :month_start

# this_month.new_users — 이번 달 이메일 인증 완료된 회원 (가입일 기준 아님)
SELECT COUNT(*) FROM users WHERE email_verified_at >= :month_start

# this_month.contacts
SELECT COUNT(*) FROM contact_inquiries WHERE created_at >= :month_start

# pending.wizard_quotes
SELECT COUNT(*) FROM wizard_quotes WHERE status = 'pending'

# pending.quick_quotes — closed가 아닌 것 전부 (pending + sent_to_erp)
# Phase 5 ERP 연동 후 대부분 sent_to_erp로 전환되므로 pending만 카운트 시 항상 0에 가까워짐
SELECT COUNT(*) FROM quick_quote_inquiries WHERE status != 'closed'

# pending.contacts
SELECT COUNT(*) FROM contact_inquiries WHERE status = 'new'

# pending.verified_users
SELECT COUNT(*) FROM users WHERE membership_tier = 'verified' AND is_active = true

# expiring_soon
SELECT id, ic_code, contact_company, created_at
FROM wizard_quotes
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '5 days'
ORDER BY created_at ASC
LIMIT 10
```

### 5-4. 구현 위치

- **파일**: `backend/routers/admin.py`
- **위치**: 기존 라우터 파일 하단에 추가 (신규 파일 없음)
- **스키마**: `backend/schemas/admin.py` — `DashboardResponse` Pydantic 모델 추가

---

## 6. 프론트엔드

### 6-1. 신규 파일

| 파일 | 내용 |
|------|------|
| `frontend-react/src/pages/admin/AdminDashboardPage.tsx` | 대시보드 페이지 |
| `frontend-react/src/api/admin.ts` 수정 | `getDashboard()` 함수 추가 |

### 6-2. 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `frontend-react/src/app/router.tsx` | index route를 `quotes` → `dashboard`로 변경, dashboard 라우트 추가 |
| `frontend-react/src/components/admin/AdminLayout.tsx` | "Dashboard" NavLink 맨 앞에 추가 |

### 6-3. 라우터 변경

```typescript
// 변경 전
{ index: true, element: <Navigate to="quotes" replace /> },

// 변경 후
{ index: true, element: <Navigate to="dashboard" replace /> },
{ path: 'dashboard', element: <AdminDashboardPage /> },
```

### 6-4. KPI 카드 컴포넌트 스펙

```tsx
// 카드 1개 구조
<div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
  <p className="text-sm text-gray-mid">{label}</p>
  <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
  {link && <Link to={link} className="mt-2 text-xs text-sky hover:underline">{linkLabel} →</Link>}
</div>
```

- 카드 클릭 시 해당 관리 페이지로 이동 (링크 포함)
- 로딩 중: skeleton 애니메이션 (`animate-pulse`)
- 에러: "데이터를 불러오지 못했습니다." 텍스트

### 6-5. 만료 임박 테이블

- `expiring_soon` 배열이 빈 경우: "만료 임박 견적이 없습니다." (회색 텍스트, 테이블 숨김)
- 행 클릭 시 `/admin/wizard-quotes/:id`로 이동
- `days_until_expiry` ≤ 1: 빨간색 텍스트, ≥ 2: 주황색

### 6-6. 날짜 기준 ("이번 달") 표시

- 페이지 상단에 현재 기준 월 표시: `"2026년 6월 기준"`
- `getDashboard()` 호출 시 서버 시간 기준으로 계산됨 (프론트는 받은 값만 표시)

---

## 7. Admin 네비게이션 변경

```tsx
// AdminLayout.tsx 변경 후 순서
Dashboard | Quotes | Wizard Quotes | Contacts | Users | [Logout]
```

---

## 8. 구현 순서

1. `backend/schemas/admin.py` — `DashboardStats`, `ExpiringSoonItem`, `DashboardResponse` 스키마 추가
2. `backend/routers/admin.py` — `GET /admin/api/dashboard` 엔드포인트 추가
3. `frontend-react/src/api/admin.ts` — `getDashboard()` 함수·타입 추가
4. `frontend-react/src/pages/admin/AdminDashboardPage.tsx` — 페이지 구현
5. `frontend-react/src/app/router.tsx` — 라우트 추가, index 변경
6. `frontend-react/src/components/admin/AdminLayout.tsx` — Dashboard NavLink 추가
7. 로컬 동작 확인 (`/admin/dashboard` 접근, 카드 수치 확인, 만료 임박 테이블 확인)

---

## 9. 자체 검토

- [x] 이 문서만 보고 바로 개발 가능한가? → **Yes** (쿼리·스펙·파일·순서 모두 명시)
- [x] 신규 DB 마이그레이션이 필요한가? → **No** (기존 테이블만 조회)
- [x] 신규 모델이 필요한가? → **No**
- [x] 외부 의존성 추가가 필요한가? → **No** (차트 라이브러리 미사용)
- [x] Admin 인증은 기존 방식과 동일한가? → **Yes** (Staff JWT, 현행 `@router.get` 패턴 동일)
