# 10 — 홈페이지 개선 기획서

> 작성일: 2026-06-05  
> 대상: frontend-react + backend  
> 전제: Phase 4(견적 위저드) · Phase 5(ERP) 는 별도 개발자 진행 중

---

## 1. 개요

현재 홈페이지 완성도는 높지만, 아래 4가지 개선 영역이 남아 있다.

| 영역 | 항목 | 난이도 | 우선순위 |
|------|------|--------|---------|
| **A** | Admin 상태·노트 편집 UI | 낮음 | ★★★ |
| **B** | 다운로드 센터 (비회원 접근) | 낮음 | ★★★ |
| **C** | 뉴스/공지 게시판 | 중간 | ★★ |
| **D** | Careers 페이지 | 낮음 | ★ |

> **FAQ**: AboutPage `#faq` 섹션에 이미 구현 완료 — 범위 제외  
> **제품 비교**: 복잡도 대비 효용 낮음 — 차후 검토

---

## 2. 영역 A — Admin 상태·노트 편집 UI

### 현황
- `AdminContactDetailPage`, `AdminQuoteDetailPage` 모두 `AdminDetailTable`로 **표시 전용**
- 백엔드 PATCH API는 이미 존재
  - `PATCH /admin/api/contacts/{id}` → `{ status, admin_note }`
  - `PATCH /admin/api/quick-quotes/{id}` → `{ status, admin_note }`
- 현재는 DB에 직접 접근하거나 curl로만 상태 변경 가능

### 구현 계획

#### A-1. Contact Detail 편집 UI
파일: `frontend-react/src/pages/admin/AdminContactDetailPage.tsx`

**Status 드롭다운 추가**
```
현재: Status    | new         (읽기 전용)
변경: Status    | [new ▼]     (드롭다운 선택 → PATCH 즉시 저장)
```
선택 옵션: `new | in_progress | resolved | closed`

**Admin Note 인라인 편집**
```
현재: Admin Note | —            (읽기 전용)
변경: Admin Note | [텍스트 영역] [저장] 버튼
```

#### A-2. Quote Detail 편집 UI
파일: `frontend-react/src/pages/admin/AdminQuoteDetailPage.tsx`

**Status 드롭다운 추가**
선택 옵션: `pending | reviewing | quoted | completed | expired`

**Admin Note 인라인 편집** (동일 패턴)

#### A-3. API 연결
파일: `frontend-react/src/api/admin.ts`

추가할 함수:
```typescript
export async function patchContact(id: number, body: { status?: string; admin_note?: string }): Promise<void>
export async function patchQuickQuote(id: number, body: { status?: string; admin_note?: string }): Promise<void>
```

#### A-4. UX 정책
- Status 드롭다운 변경 → 즉시 PATCH (confirm 불필요)
- Admin Note → 텍스트 영역 편집 후 "저장" 버튼 클릭 시 PATCH
- 저장 성공: 인라인 토스트 or 버튼 "저장됨" 텍스트 전환 (1.5초)
- 저장 실패: 인라인 에러 메시지

#### 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `src/pages/admin/AdminContactDetailPage.tsx` | Status 드롭다운 + Admin Note 편집 추가 |
| `src/pages/admin/AdminQuoteDetailPage.tsx` | 동일 패턴 |
| `src/api/admin.ts` | `patchContact`, `patchQuickQuote` 함수 추가 |

---

## 3. 영역 B — 다운로드 센터 (비회원 접근)

### 현황
- `catalogs.json` 4종: `socket_list`, `probe_pin_plunger`, `iso9001_en`, `iso9001_ko`
- 현재 `AccountPage` 카탈로그 탭 → **인증회원(verified)만 S3 presigned URL 발급**
- 비회원은 파일 목록조차 볼 수 없음

### 구현 계획

**새 공개 페이지 `/{lang}/downloads` 추가**

#### B-1. 페이지 구조
```
Downloads / 자료실

┌────────────────────────────────────┐
│ 파일명              형식  버튼      │
├────────────────────────────────────┤
│ Socket List (250108) PDF  [다운로드]│ ← 인증회원만 활성화
│ Probe Pin Plunger Shape  PNG  [다운로드]│
│ ISO9001 Certificate (EN) PDF  [다운로드]│ ← 공개 (누구나)
│ ISO9001 Certificate (KO) PDF  [다운로드]│ ← 공개 (누구나)
└────────────────────────────────────┘

비회원이 잠긴 파일 클릭 시:
"카탈로그 다운로드는 인증회원에게 제공됩니다. → 회원가입"
```

#### B-2. 공개/비공개 분류 정책

| 파일 | 공개 범위 | 이유 |
|------|----------|------|
| Socket List | 인증회원 전용 | 영업 자료, 경쟁사 유출 방지 |
| Probe Pin Plunger | 인증회원 전용 | 동일 |
| ISO9001 (EN/KO) | **전체 공개** | 신뢰도 지표, 공개해도 무방 |

> ❓ **확인 필요**: ISO 인증서를 비회원에게 공개해도 괜찮은지 확인

#### B-3. 백엔드
- ISO 인증서용 공개 API 엔드포인트 추가 (또는 S3 public 설정)
- 기존 `/api/account/catalogs/{id}/url` — 인증회원 전용 유지

#### B-4. 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `frontend-react/src/pages/DownloadsPage.tsx` | 신규 생성 |
| `frontend-react/src/app/router.tsx` | `/{lang}/downloads` 라우트 추가 |
| `frontend/content/i18n/downloads.{en,ko}.json` | 신규 생성 |
| `backend/routers/` | ISO 공개 다운로드 엔드포인트 (선택) |
| 공통 Nav | Downloads 링크 추가 여부 검토 |

---

## 4. 영역 C — 뉴스/공지 게시판

### 현황
- 관련 페이지·DB·라우터 전혀 없음
- 마스터 플랜: "1차 오픈 제외" 로 명시됐으나 재검토 가능

### 구현 범위 (최소 구현안)

**공개 페이지**: `/{lang}/news` — 게시글 목록 + 상세  
**Admin 관리**: `AdminNewsPage` — 작성/수정/삭제  
**DB 테이블**: `news_posts` (id, title_en, title_ko, body_en, body_ko, published_at, is_published)

#### C-1. 게시글 구조
```
┌─────────────────────────────────┐
│ 제목                            │
│ 날짜    카테고리(공지/전시회/인증) │
│ 본문 (Markdown 또는 plain text) │
└─────────────────────────────────┘
```

카테고리: `notice | exhibition | certification | product`

#### C-2. Admin 기능
- 목록 (제목, 날짜, 공개여부, 편집/삭제)
- 작성/수정: 한/영 제목·본문 동시 입력

#### C-3. 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `database/versions/005_news_posts.py` | 마이그레이션 신규 |
| `backend/models.py` | `NewsPost` 모델 추가 |
| `backend/routers/news.py` | 공개 GET API |
| `backend/routers/admin.py` | Admin CRUD API 추가 |
| `src/pages/NewsPage.tsx` | 신규 |
| `src/pages/NewsDetailPage.tsx` | 신규 |
| `src/pages/admin/AdminNewsPage.tsx` | 신규 |
| `src/app/router.tsx` | 라우트 추가 |

> ❓ **확인 필요**
> - 뉴스 운영 주체: 대표 직접 작성 vs 담당자?
> - 본문 형식: Markdown 지원 필요 vs plain text 충분?
> - 카테고리 목록 확정 필요

---

## 5. 영역 D — Careers 페이지

### 현황
- 마스터 플랜에 "미정"으로 남아 있음
- 라우터·페이지 없음

### 구현 범위

**최소 구현**: 정적 페이지 `/{lang}/careers`  
- 회사 문화/복지 소개 (이미지 + 텍스트)
- 현재 채용 중인 포지션 목록 (JSON 파일로 관리)
- 지원 방법: 이메일 or Contact 폼 연결

**채용 공고 관리**: `frontend/content/careers.json`으로 정적 관리 (DB 불필요)

```json
{
  "positions": [
    {
      "id": "design_engineer",
      "title_ko": "소켓 설계 엔지니어",
      "title_en": "Socket Design Engineer",
      "department_ko": "설계팀",
      "department_en": "Design",
      "type": "full_time",
      "active": true
    }
  ]
}
```

#### D-1. 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `frontend/content/careers.json` | 신규 (채용 공고 데이터) |
| `frontend/content/i18n/careers.{en,ko}.json` | 신규 |
| `src/pages/CareersPage.tsx` | 신규 |
| `src/app/router.tsx` | `/{lang}/careers` 라우트 추가 |
| 공통 Nav/Footer | Careers 링크 추가 |

> ❓ **확인 필요**
> - 현재 채용 중인 포지션이 있는지?
> - 없다면 "채용 예정" 형태의 페이지로 운영할지?
> - 지원 방법: 이메일 직접 발송 vs Contact 폼 재활용?

---

## 6. 구현 우선순위 및 일정 제안

| 순서 | 영역 | 이유 |
|------|------|------|
| 1 | **A — Admin 편집 UI** | 백엔드 완성, 프론트만 추가하면 됨. 즉시 업무 효율 향상 |
| 2 | **B — 다운로드 센터** | ISO 공개 여부만 확인되면 바로 구현 가능 |
| 3 | **D — Careers** | 채용 공고 내용만 있으면 1~2일 내 완성 |
| 4 | **C — 뉴스/공지** | DB 마이그레이션 포함, 가장 많은 공수 필요 |

---

## 7. 미결 확인 사항 (진행 전 답변 필요)

| # | 질문 | 해당 영역 |
|---|------|----------|
| Q1 | ISO 인증서를 비회원에게 공개해도 괜찮은지? | B |
| Q2 | 뉴스 게시판 운영 주체 및 본문 형식(Markdown vs 일반 텍스트)? | C |
| Q3 | 뉴스 카테고리 목록 확정 (`notice | exhibition | certification | product`)? | C |
| Q4 | 현재 채용 중인 포지션 있는지? 없으면 어떤 형태로 운영? | D |
| Q5 | 지원 방법 — 이메일 직발송 vs Contact 폼 재활용? | D |
