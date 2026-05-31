# 프론트엔드 S8 QA 체크리스트 (React SPA)

> **일자**: 2026-05-31  
> **범위**: `frontend-react/` — 로컬 `npm run dev` (localhost:5173)  
> **빌드**: `npm run build` 성공 확인

---

## 자동 검증

| 항목 | 결과 |
|------|------|
| TypeScript `tsc -b` | ✅ |
| Vite production build | ✅ |
| 라우트 등록 (공개·Auth·Wizard·Legal·Admin) | ✅ 코드 기준 |

---

## §10 체크리스트 (수동 스모크 권장)

| # | 항목 | 구현 상태 | 수동 확인 |
|---|------|----------|----------|
| 1 | `/{lang}/products/test-socket` 새로고침 (CloudFront fallback) | 배포 전 — 로컬 SPA OK | ☐ 배포 후 |
| 2 | EN↔KO path 유지 | Header 언어 링크 | ☐ |
| 3 | Contact 10MB 첨부 + ko/en 에러 | ContactPage | ☐ |
| 4 | reCAPTCHA dev-skip | `dev-skip-token` | ☐ |
| 5 | 401 → login redirect | AuthContext refresh 실패 시 guest | ☐ |
| 6 | Chrome / Edge / Safari | — | ☐ |
| 7 | Wizard 비로그인 → login?next= | ProtectedRoute | ☐ |
| 8 | Coming soon 카드 | FamilyCard | ☐ |
| 9 | alt, aria-expanded (햄버거) | Header | ☐ |
| 10 | 다크 섹션 대비 | Technology 등 | ☐ |

---

## 스프린트별 스모크 경로

### 공개
- `/` → `/en/` 또는 `/ko/`
- `/en/`, `/en/about`, `/en/products`, `/en/products/probe-pin/general`
- `/en/contact`, `/en/quote`
- `/en/privacy`, `/en/terms` — Legal JSON 렌더
- 쿠키 배너: 필수만 / 분석 허용 → `VITE_GA_MEASUREMENT_ID` 설정 시 gtag 로드

### Auth
- `/en/login`, `/en/register`, `/en/forgot-password`
- `/en/quote/wizard` — 비로그인 리다이렉트

### Admin (백엔드 + 시드 계정 필요)
- `/admin/login` → 2FA (dev: `000000`)
- `/admin/quotes`, `/admin/quotes/:id`
- `/admin/contacts`, `/admin/contacts/:id` (+ 첨부 다운로드)
- `/admin/users` — Approve / Revoke / Delete

---

## 알려진 제한 (백엔드 연동 대기)

| 항목 | 비고 |
|------|------|
| 회원 access JWT httpOnly | 현재 메모리 Bearer + refresh 쿠키 |
| Wizard ERP BFF | `VITE_WIZARD_USE_MOCK=true` 기본 |
| `POST /api/quote/wizard` | 미구현 시 mock 제출 |
| CloudFront SPA fallback | IT 배포 시 |

---

## 회귀 방지

```bash
cd frontend-react
npm run build
```

운영 배포 전: `VITE_GA_MEASUREMENT_ID`, CORS credentials, Admin 시드 계정 확인.
