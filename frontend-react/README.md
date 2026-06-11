# Innovo Homepage — React (frontend-react)

S0 스캐폴딩: Vite + React + TypeScript + Tailwind + react-router + i18next.

## 로컬 실행

```bash
cd frontend-react
npm install
npm run dev
```

- 앱: http://localhost:5173/en/
- API·`/upload` 프록시: `http://127.0.0.1:8000` (FastAPI 실행 필요, 이미지·로고용)

```bash
# 프로젝트 루트에서 백엔드 (별도 터미널)
uvicorn backend.main:app --reload
```

## 환경 변수

`frontend-react/.env` (`.env.example` 참고):

| 변수 | 설명 |
|------|------|
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 (없으면 `dev-skip-token`) |
| `VITE_USE_HP_API=false` | 로컬 FastAPI `/api/contact`, `/api/quick-quote` |
| `VITE_USE_HP_API=true` | ERP `/api/hp/*` — [hp_api_reference.md](../document/hp_api_reference.md) |
| `VITE_HP_API_BASE_URL` | 운영 빌드: `http://54.116.87.172` (CORS 직접 호출) |
| (비움) + dev | 상대 `/api/hp` → Vite `VITE_HP_PROXY_TARGET` 프록시 |

폼 제출 전 **백엔드 또는 ERP** 중 하나가 떠 있어야 합니다.

### 인증 (S4)

- 로그인: refresh 토큰은 **httpOnly 쿠키** (`innovo_refresh_token`), 액세스 JWT는 **메모리만** (localStorage 미사용)
- `POST /api/auth/refresh` → `GET /api/auth/me` 로 앱 시작 시 세션 복구
- `/quote/wizard` 는 미로그인 시 `/:lang/login?next=...` 로 이동

### Quote Wizard (S5)

- 4단계: 제품·IC → 스펙 → 가견적 → 확정 제출
- `localStorage` 임시 저장 (`innovo_wizard_v1_{userId}_{lang}`)
- `VITE_WIZARD_USE_MOCK=true`(기본): mock ERP·제출. `false` 시 `/api/erp/*`, `POST /api/quote/wizard` 연동 (백엔드 BFF 필요)

### Legal · Cookie · GA (S6)

- `/privacy`, `/terms` — `frontend/content/legal/*.json`
- 쿠키: `innovo_cookie_consent` (`essential` | `analytics`)
- GA4: `VITE_GA_MEASUREMENT_ID` + analytics 동의 시 `gtag` 로드

### Admin (S7)

- `/admin/login` → 이메일·비밀번호 → 2FA (개발: OTP `000000`)
- `/admin/quotes`, `/admin/contacts`, `/admin/users` + 상세
- Admin JWT: 메모리 Bearer (`/admin/api/*`)

### QA (S8)

- `document/reports/20260531_frontend_s8_qa.md`

## i18n

`../frontend/content/` JSON을 `@content` alias로 import — 기존 Vanilla와 동일 문구 유지.
