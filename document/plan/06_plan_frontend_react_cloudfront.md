# 06. 프론트엔드 전용 기획서 — React + CloudFront

> **작성일**: 2026-05-31  
> **최종 업데이트**: 2026-06-02  
> **담당 범위**: **프론트엔드만** (React SPA, S3/CloudFront 배포, UI/UX, i18n, 공개·Admin 화면)  
> **담당 제외**: FastAPI, PostgreSQL, ERP 연동, Alembic, SMTP, 서버 Nginx — **백엔드 담당자**  
> **참조**: `04_plan_phase2_static_frontend.md`, `00_master_plan.md` §4~§6, `05_plan_aws_erp_react_cloudfront.md` (전체 맥락)  
> **상태**: **v1.2** — S0~S8 구현·배포 완료, 운영 중

---

## 1. 역할·경계

### 1-1. 프론트엔드가 할 일

| 포함 | 산출물 |
|------|--------|
| React 앱 신규 구축 | `frontend-react/` (공개 + Admin + Quote Wizard 단일 앱) |
| 기존 UI 이전 | Jinja 27템플릿 → React 페이지·컴포넌트 |
| 스타일 | Tailwind — `frontend/css/tailwind.src.css`, `site.css` 토큰 이전 |
| i18n | `frontend/content/**/*.json` → `react-i18next` |
| API 호출 | `fetch`/`axios` — **백엔드가 제공하는 OpenAPI·베이스 URL만 소비** |
| CloudFront 배포 | `npm run build` → S3 sync, invalidation (CI는 IT·백엔드와 협의) |
| reCAPTCHA v3, 쿠키 배너, GA(opt-in) | 클라이언트 통합 |
| SEO | `hreflang`, `<title>`, meta, SPA fallback 전제 |

### 1-2. 프론트엔드가 하지 않는 일

- ERP API Key, DB, `erp_client`, systemd, ALB, `api.innovosolution.co.kr` 인프라 구축
- `POST /api/*` 비즈니스 로직·이메일·JWT 발급 구현
- `upload/` S3 마이그레이션 **실행** (URL만 env로 받아 사용)

### 1-3. 백엔드 담당자에게 받아야 할 **계약** (프론트 착수 전)

| 항목 | 프론트에 필요한 형태 | 예시 |
|------|---------------------|------|
| API Base URL | env 문서 1장 | `VITE_API_BASE_URL=https://api...` |
| CORS | `www` 오리진 허용 확인 | 배포 도메인 확정 후 |
| 인증 | **httpOnly 쿠키** + `credentials: 'include'` | CORS `Access-Control-Allow-Credentials: true`, 회원/Admin 쿠키 분리 여부 명시 |
| 에러 형식 | 통일 | `{ detail: string }` 또는 `{ message, code }` |
| Contact | multipart 규격 | `data` JSON + `file` — **현행 유지** (`contact.js` 기준) |
| OpenAPI | 권장 | `/openapi.json` 또는 공유 문서 |

> 프론트는 **계약이 고정되기 전**에도 mock server로 UI 개발 가능. 운영 연동은 계약 확정 후.

---

## 2. 확정 결정 (2026-05-31)

| # | 항목 | 확정 내용 |
|---|------|----------|
| FQ1 | 기술 스택 | **Vite + React 18+ + TypeScript + Tailwind CSS** |
| FQ2 | UI | **현행 Jinja 화면 그대로 이전** (Jinja 미사용, `frontend/templates`·CSS 기준 React화) |
| FQ3 | 인증 저장 | **httpOnly + Secure + SameSite 쿠키** (`credentials: 'include'`) — **백엔드 Set-Cookie 필수** |
| FQ4 | 마이페이지 | **`/:lang/account` 2차** (1차 제외) |
| FQ5 | Quote Wizard | **1차 포함** — `/:lang/quote/wizard` (회원·이메일 인증) |
| FQ6 | Admin | **동일 React 앱**, `/admin/*` path만 분리 |
| FQ7 | 리뉴얼 뱃지 | **유지** |
| FQ8 | Probe Pin | **general / special / custom 3 URL 유지** |
| FQ9 | 미완 에셋 | **Coming soon 카드 유지** |
| FQ10 | 브라우저 | **Chrome · Edge · Safari** (IE 미지원) |
| FQ11 | 폴더 | **`frontend-react/` 신규**, `frontend/` 유지 후 추후 삭제 |
| FQ12 | 미리보기 | **로컬만** (`localhost:5173`) |

---

## 3. 현재 프론트 자산 (코드 기준)

### 3-1. 화면 목록 (이전 대상)

| 구분 | 경로 (현재) | React Route (안) |
|------|-------------|------------------|
| Home | `pages/home.html` | `/:lang/` |
| About | `pages/about.html` | `/:lang/about` |
| Products | `index`, `category`, probe-pin 3종 | `/:lang/products`, `.../test-socket`, `probe-pin`, `probe-pin/general` 등 |
| Technology | `technology.html` | `/:lang/technology` |
| Contact | `contact.html` | `/:lang/contact` |
| Quote (Quick) | `quote/quick_quote_form.html` | `/:lang/quote` |
| Quote Wizard | (신규 — 마스터 §7-1) | `/:lang/quote/wizard` (로그인·이메일 인증 필수) |
| Auth | login, register, forgot, reset, verify | `/:lang/login` 등 5 |
| Legal | `legal/document.html` | `/:lang/privacy`, `terms` |
| Admin | login, quotes, contacts, users, detail 2 | `/admin/*` (lang prefix 없음, **동일 SPA**) |

**2차 (1차 제외)**: `/:lang/account` (마이페이지·견적 히스토리)

### 3-2. 클라이언트 JS (이전 로직)

| 파일 | 역할 |
|------|------|
| `nav.js` | 모바일 메뉴, Products 드롭다운 |
| `contact.js` | `POST /api/contact` multipart + reCAPTCHA |
| `auth.js` | register/login 등 |
| `admin.js` | Admin API + JWT |
| `cookie-consent.js` | GDPR 배너, GA opt-in |
| `faq.js`, `products.js` | About FAQ, 제품 아코디언 |

### 3-3. 디자인 토큰 (마스터 §6 — 그대로 유지)

| 토큰 | HEX | 용도 |
|------|-----|------|
| navy | `#26337D` | 본문 CTA, 강조 |
| sky | `#1C93D2` | 헤더 Request Quote |
| gray-light | `#C7CED7` | 구분선 |
| gray-mid | `#8E959C` | 보조 텍스트 |
| charcoal | `#3A3A3A` | 본문 |

폰트: Barlow / Inter / Noto Sans KR (`base.html` 와 동일)

### 3-4. 이미지·정적 URL

- 현재: `/upload/...` 절대 경로 (예: 로고 URL 인코딩 포함)
- React: `import.meta.env.VITE_MEDIA_BASE_URL` + path 조합 권장

---

## 4. 기술 스택 (확정)

| 항목 | 선택 |
|------|------|
| 빌드 | **Vite 6** |
| UI | **React 18+** |
| 언어 | **TypeScript** |
| 스타일 | **Tailwind CSS v4** (`@tailwindcss/vite` 또는 CLI — `04_plan` §2-1) |
| 라우팅 | `react-router-dom` v6 — **단일 `createBrowserRouter`**, public / admin / wizard 분기 |
| i18n | `react-i18next` + 기존 JSON |
| 서버 상태 | `@tanstack/react-query` |
| HTTP | `fetch` + **`credentials: 'include'`** (쿠키 인증) |
| 폼 | Contact / Quote / Wizard — controlled + **zod** |
| SEO | `react-helmet-async` |
| 테스트 | Vitest + RTL (Contact, Quote, Wizard, Auth 핵심) |
| 브라우저 | **browserslist**: `last 2 Chrome versions`, `last 2 Edge versions`, `last 2 Safari versions` |

**금지**: Next.js SSR, Jinja 런타임, 별도 Admin 번들

---

## 5. 프로젝트 구조

```
frontend-react/
├── public/                 # favicon, robots.txt
├── src/
│   ├── app/                # providers, router
│   ├── components/
│   │   ├── layout/         # Header, Footer, CookieBanner
│   │   └── ui/
│   ├── pages/              # route 단위
│   ├── features/           # contact, quote, quote-wizard, auth, admin
│   ├── api/                # types + client (백엔드 계약)
│   ├── i18n/               # loader, namespaces
│   ├── hooks/
│   └── lib/                # recaptcha, analytics
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── .env.example            # VITE_* only
```

기존 `frontend/`: **삭제하지 않음** — React 안정화·운영 cutover 후 제거 (참고용· diff용)

---

## 6. 라우팅·i18n

### 6-1. URL 규칙 (현행 유지)

- 공개: `https://www.innovosolution.co.kr/{en|ko}/...`
- Admin: `/admin/...` (언어 prefix 없음, **공개와 같은 React 앱**)
- Quote Wizard: `/:lang/quote/wizard` — 미로그인 시 `/:lang/login?next=...` 리다이렉트
- 루트 `/`: 브라우저 `Accept-Language` → `/en/` 또는 `/ko/` (React `Navigate`, 로컬·CloudFront 공통)

### 6-2. 언어 전환

- EN | KO 링크: **path만 교체** (`path_without_lang` 패턴 — `site_header.html` 동일)
- `hreflang` + `<html lang>`: `react-helmet-async` 또는 Vite plugin

### 6-3. i18n 네임스페이스

| namespace | 소스 파일 |
|-----------|----------|
| common | `i18n/common.{en,ko}.json` |
| home, about, products, technology, contact | 동일 패턴 |
| legal | `legal/privacy.*.json`, `terms.*.json` |
| products catalog | `products/test_socket.json` 등 |

---

## 7. API 연동 (프론트 관점 — 백엔드 구현 가정)

### 7-1. 엔드포인트 매핑 (변경 없음 가정)

| 화면 | Method | Path | 비고 |
|------|--------|------|------|
| Contact | POST | `/api/contact` | FormData `data` + `file` |
| Quick Quote | POST | `/api/quick-quote` | JSON body |
| Register | POST | `/api/auth/register` | |
| Login | POST | `/api/auth/login` | 응답 **Set-Cookie** (httpOnly) |
| Me | GET | `/api/auth/me` | `credentials: 'include'` |
| Wizard 계산 | POST | `/api/erp/quote-estimate` 등 | 백엔드 BFF — `02_plan` (mock 가능) |
| Admin | `/admin/api/*` | Admin 전용 httpOnly 쿠키 또는 동일 세션 정책 — **백엔드 확정** |

개발 시 Vite proxy:

```ts
// vite.config.ts — 로컬만
server: {
  proxy: {
    '/api': 'http://127.0.0.1:8000',
    '/admin/api': 'http://127.0.0.1:8000',
    '/upload': 'http://127.0.0.1:8000',
  },
}
```

### 7-2. 환경 변수 (프론트만)

```bash
VITE_API_BASE_URL=          # 운영: 백엔드 팀 제공. 비우면 '' → 상대경로 /api
VITE_MEDIA_BASE_URL=        # 예: https://cdn.../upload 또는 /upload
VITE_RECAPTCHA_SITE_KEY=
VITE_GA_MEASUREMENT_ID=     # 쿠키 동의 후 로드
VITE_APP_BASE_URL=https://www.innovosolution.co.kr  # canonical, og:url
```

---

## 8. CloudFront 배포 (프론트 작업 범위)

### 8-1. 빌드 산출물

- `dist/index.html` — **Cache-Control: no-cache**
- `dist/assets/*` — hash 파일명, **max-age 1년**

### 8-2. SPA 필수 설정 (IT에 요청할 체크리스트)

- Custom Error Response: 403/404 → `/index.html` (200)
- HTTPS + ACM
- `www` Alternate Domain
- (선택) Response Headers: CSP — reCAPTCHA·Google Fonts·GA 도메인 allowlist

### 8-3. 프론트 배포 스크립트 (예시)

```bash
npm ci && npm run build
aws s3 sync dist/ s3://$BUCKET --delete
aws cloudfront create-invalidation --distribution-id $ID --paths "/*"
```

> 버킷·Distribution ID는 IT/백엔드가 생성 후 **프론트에 전달**.

---

## 9. 구현 단계 (프론트 일정)

| Sprint | 내용 | 완료 기준 |
|--------|------|----------|
| S0 | Vite+React+TS+Tailwind+i18n+Router, Layout(헤더·푸터·**리뉴얼 뱃지**) | `localhost:5173/en/` — **✅ 2026-05-31** (`frontend-react/`) |
| S1 | Home, About, Technology | 기존 Jinja와 시각 동일, hreflang — **✅ 2026-05-31** |
| S2 | Products (+ probe-pin 3URL, **Coming soon 카드**) | catalog JSON, 아코디언 — **✅ 2026-05-31** |
| S3 | Contact, Quick Quote (`/:lang/quote`) | multipart, reCAPTCHA, proxy 연동 — **✅ 2026-05-31** |
| S4 | Auth 5페이지 | 쿠키 로그인, `me`, protected route — **✅ 2026-05-31** |
| S5 | **Quote Wizard 4단계** | localStorage 임시저장, ERP estimate mock/연동 — **✅ 2026-05-31** |
| S6 | Legal, Cookie, GA | GDPR opt-in — **✅ 2026-05-31** |
| S7 | Admin (`/admin/*`) | 2FA, quotes/contacts/users·detail — **✅ 2026-05-31** |
| S8 | QA (Chrome/Edge/Safari), a11y, Lighthouse | §10 체크리스트 — **✅ 2026-05-31** (`document/reports/20260531_frontend_s8_qa.md`) |
| **2차** | `/:lang/account` | 백엔드 견적 히스토리 API 준비 후 |

> CloudFront cutover·S3 배포는 **로컬 개발 완료 + 백엔드 운영 URL 확정 후** 별도 스프린트.

---

## 10. 프론트 QA 체크리스트

- [ ] `/{lang}/products/test-socket` 새로고침 404 없음 (CloudFront fallback)
- [ ] EN↔KO 전환 시 동일 path 유지
- [ ] Contact 10MB 첨부 UI + 에러 메시지 ko/en
- [ ] reCAPTCHA 키 없을 때 로컬 dev 동작 (`dev-skip` 패턴은 백엔드 `RECAPTCHA_SKIP_VERIFY`와 쌍)
- [ ] 세션 만료(401) 시 `/admin/login` 또는 `/:lang/login` 리다이렉트
- [ ] Chrome / Edge / Safari 수동 스모크 (주요 경로)
- [ ] Wizard: 비로그인 `/quote/wizard` → login redirect
- [ ] 미완 제품 카드 "Coming soon" 표시
- [ ] 이미지 alt, 키보드 포커스, 모바일 햄버거 `aria-expanded`
- [ ] 다크 섹션 텍스트 `text-slate-300` 이상 대비

---

## 11. 백엔드 팀 전달용 요청 목록 (프론트가 기다리는 것)

프론트 담당자가 백엔드 담당자에게 전달할 **최소 요청**:

1. **쿠키 인증**: `POST /api/auth/login` · `POST /admin/api/login` 시 `Set-Cookie` (HttpOnly, Secure prod, SameSite=Lax/Strict)
2. CORS: `Allow-Origin` = `http://localhost:5173` (배포 시 `https://www...`), **`Allow-Credentials: true`**
3. OpenAPI 또는 Postman collection
4. Refresh: 쿠키 자동 갱신 vs `POST /api/auth/refresh` — **localStorage에 토큰 저장하지 않음**
5. Admin 2FA: login → challenge → `verify-2fa` 후 Admin 쿠키
6. 미디어: dev 에서 `/upload` proxy 유지
7. **Wizard BFF**: `GET /api/erp/socket-types`, `GET /api/erp/ic-package-types`, `POST /api/erp/quote-estimate` 스키마·샘플
8. 회원 등급(`general`/`verified`) — Wizard 3단계 가격 표시 정책 (`00_master_plan` §7-1)

---

## 12. 자체 검토

| 기준 | 결과 |
|------|------|
| 코드 기반 화면·JS·CSS 반영 | ✅ |
| 백엔드 경계 분리 | ✅ |
| S0~S8 (1차) | ✅ 로컬 React 구현 완료 |
| CloudFront 배포 | ✅ `EAD1YVAYMLDS7` · `www.innovosolution.co.kr` CNAME 연결 완료 (2026-05-31) |
| Jinja2 레거시 삭제 | ✅ `frontend/templates·css·js·content` 전체 삭제 완료 (commit `c084a3c`, 2026-05-31) |
| Wizard / ERP | ⚠️ `VITE_WIZARD_USE_MOCK` — BFF 확정 후 `false` |
| Auth 쿠키 (access) | ⚠️ 백엔드 Set-Cookie 전환 시 프론트 메모리 제거만 |
| Account | 2차로 분리 ✅ |
| **@content 별칭** | ⚠️ `vite.config.ts`의 `@content` → `../frontend/content` 가 삭제된 경로를 가리킴 — **ERP 담당자에게 i18n 파일 이전 위임 (2026-06-02)** |

---

## 13. 운영 후 변경 이력

| 날짜 | 변경 내용 | 커밋 |
|------|----------|------|
| 2026-05-31 | React SPA S0~S8 1차 구현 완료, CloudFront 배포 | `f6c74be` |
| 2026-05-31 | Jinja2 레거시 전체 삭제 (templates·css·js·content) | `c084a3c` |
| 2026-05-31 | Home hero subtitle "설계·제조" 반영, tagline "고객 사양이 우리의 출발점" 변경 | — |
| 2026-05-31 | Home Product lines — Test Socket 카드에 mini·large30c 렌더 이미지 50:50 배치 | — |
| 2026-05-31 | About 연혁 14개 항목 추가 (창립~현재) | `b38e83e` |
| 2026-06-01 | `/products/test-socket` 소켓 목록 PDF 다운로드 버튼 숨김 | `6a83f24` |
