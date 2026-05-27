# 04. Phase 2 기획서 — 정적 프론트엔드 (HTML/CSS/JS)

> **상태**: 기획 작성 완료 (개발 착수 전 검토용)  
> **작성일**: 2026-05-21  
> **적용 Phase**: 마스터 **Phase 2**  
> **참조**: `00_master_plan.md` §3–§6, §4-1~§4-5, §8 · `01_plan_phase3_auth_contact_admin.md` §4 · `00_plan_gap_checklist.md` §5

---

## 0. 문서 목적

Phase 2에서 구현할 **공개 정적 페이지 UI**를 페이지·섹션·와이어·파일 구조·i18n·Tailwind 빌드까지 **개발 착수 가능 수준**으로 정의한다.

| 포함 | 제외 (별도 Phase) |
|------|-------------------|
| Home / About / Products / Technology / Contact **페이지 UI** | Contact·Auth **API** (Phase 3 → `01_plan`) |
| 공통 레이아웃 (header·footer·base) | Quote Wizard (Phase 4) |
| i18n JSON 구조·로더 | Admin UI (Phase 3–4) |
| Tailwind CSS 빌드 파이프라인 | Home 숫자 섹션 **Admin ON/OFF** (Phase 4) |
| Products 카드·스펙 아코디언 (정적 JSON) | Probe Pin 3D 렌더 (에셋 미완) |
| Privacy / Terms **레이아웃 통합** (본문 v1.1 ✅) | GA4 스크립트 로드 (Phase 6, 쿠키 배너 UI ✅) |

---

## 1. 코드·에셋 현황 (2026-05-21 확인)

### 1-1. 이미 구현된 항목

| 항목 | 경로 | 비고 |
|------|------|------|
| lang 라우트 | `backend/main.py` — `Literal["en","ko"]` | `/admin`, `/api/` 우선 등록 ✅ |
| 임시 Home | `frontend/templates/home_placeholder.html` | Phase 2에서 교체 |
| Quick Quote 폼 | `frontend/templates/quote/quick_quote_form.html` | 인라인 스타일 → base 레이아웃 통합 |
| Privacy / Terms | `frontend/templates/legal/document.html` + `frontend/content/legal/*.json` | v1.1, `table` 렌더 ✅ |
| 헤더·푸터 partial | `partials/site_header.html`, `site_footer.html` | **Products ▾·Technology 누락** |
| 쿠키 배너 | `partials/cookie_banner.html`, `js/cookie-consent.js` | GA 로드는 Phase 6 |
| 회원가입 placeholder | `auth/register_placeholder.html` | Phase 3 전 |
| 공통 CSS (최소) | `frontend/css/legal.css` | Phase 2에서 `site.css`로 확장 |

### 1-2. 확인된 미구현 라우트 (Phase 2 추가 대상)

| URL | 템플릿 (신규) |
|-----|--------------|
| `/{lang}/about` | `pages/about.html` |
| `/{lang}/products` | `pages/products/index.html` |
| `/{lang}/products/test-socket` | `pages/products/category.html` (+ `category=test_socket`) |
| `/{lang}/products/probe-pin` | 동일 |
| `/{lang}/products/test-jig` | 동일 |
| `/{lang}/technology` | `pages/technology.html` |
| `/{lang}/contact` | `pages/contact.html` |
| `/{lang}/login` | `auth/login_placeholder.html` (Phase 3 전 UI shell) |

### 1-3. 사용 가능 에셋 (실제 경로)

| 용도 | 경로 |
|------|------|
| 로고 | `upload/logo/LOGO (Mask 제거).png` |
| Test Socket 3D (7종) | `upload/products/renders/test_socket/*.png` |
| Technology 일러스트 | `upload/technology/simulation/*.png`, `design/*.png`, `equipment/*.png` |
| ISO9001 | `upload/certificate/ISO9001 (2024) Eng.pdf`, `... Kor.pdf` |
| Probe Pin 팁 도 | `upload/catalog/probe_pin_plunger_shape.png` |
| Socket List PDF | `upload/catalog/Socket List 250108.pdf` |

**미완 에셋 (placeholder 처리)**

- Probe Pin 3D: `upload/products/renders/probe_pin/` — **SolidWorks 치수선 제거 버전 대기**
- Pedestal / Pedestal EMMI: 스펙·이미지 **미확인** → 카드 "Coming soon" 또는 목록에서 제외 (§12 질문)
- 월드맵 좌표: **담당자 제공 전** SVG placeholder + "Global delivery" 카피만

---

## 2. 기술 결정

### 2-1. Tailwind CSS 빌드 (**권장: CLI standalone**)

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| **Tailwind CLI v4** (`@tailwindcss/cli`) | Purge·프로덕션 CSS 최소화, 디자인 토큰 일관 | `npm install` 1회 필요 | **✅ 권장** |
| CDN `<script src="cdn.tailwindcss.com">` | 설정 없음 | 프로덕션 비권장, 커스텀 purge 불가 | ❌ |

**구현 스켈레톤**

```
frontend/css/
  tailwind.src.css    # @import "tailwindcss"; + @theme 브랜드 컬러
  site.css            # 빌드 산출물 (git 추적 — 배포 단순화)
package.json          # devDependencies: tailwindcss, @tailwindcss/cli
```

**빌드 명령 (개발·CI 공통)**

```bash
npx @tailwindcss/cli -i frontend/css/tailwind.src.css -o frontend/css/site.css --minify
```

**브랜드 토큰 (`tailwind.src.css` @theme)** — 마스터 §6 확정값

| 토큰 | HEX | Tailwind 용도 |
|------|-----|---------------|
| `navy` | `#26337D` | 헤더 bg, 본문 CTA |
| `sky` | `#1C93D2` | 링크, 헤더 Request Quote |
| `gray-light` | `#C7CED7` | border, card bg |
| `gray-mid` | `#8E959C` | 보조 텍스트 |
| `charcoal` | `#3A3A3A` | 본문 |

**폰트** (Google Fonts `<link>` in `base.html`)

- EN 제목: Barlow 600/700  
- EN 본문: Inter 400/500  
- KO: Noto Sans KR 400/500  

### 2-2. i18n — 서버 사이드 Jinja + JSON

마스터 §5·법적 문서(`legal_content.py`) 패턴과 동일.

```
frontend/content/i18n/
  common.en.json / common.ko.json      # nav, footer, CTA, a11y
  home.en.json / home.ko.json
  about.en.json / about.ko.json
  products.en.json / products.ko.json  # UI 라벨만
  technology.en.json / technology.ko.json
  contact.en.json / contact.ko.json
```

**로더**: `backend/utils/i18n_content.py`

```python
def load_i18n(page: str, lang: str) -> dict:
    # page: common | home | about | ...
    # common은 모든 페이지에 merge
```

**SEO**

- `<html lang="{{ lang }}">`  
- `<link rel="alternate" hreflang="en" href="https://www.innovosolution.co.kr/en/...">`  
- `<link rel="alternate" hreflang="ko" href=".../ko/...">`  
- `<link rel="alternate" hreflang="x-default" href=".../en/...">`

**템플릿 사용**

```jinja2
<h1>{{ t.home.hero.title }}</h1>
```

(`t` = merged dict: `common` + page namespace)

### 2-3. 공통 레이아웃

**신규** `frontend/templates/base.html`

```jinja2
<!DOCTYPE html>
<html lang="{{ lang }}">
<head>… fonts, site.css, {% block head %}{% endblock %}</head>
<body>
  {% include "partials/site_header.html" %}
  <main>{% block content %}{% endblock %}</main>
  {% include "partials/site_footer.html" %}
  {% include "partials/cookie_banner.html" %}
  <script src="/static/js/cookie-consent.js"></script>
  {% block scripts %}{% endblock %}
</body>
</html>
```

**`site_header.html` 보완 (마스터 §4-1)**

| 요소 | 동작 |
|------|------|
| 로고 | `/{{ lang }}/` |
| About | `/{{ lang }}/about` |
| Products ▾ | hover(PC) / accordion(모바일) → 3 하위 링크 |
| Technology | `/{{ lang }}/technology` |
| Contact | `/{{ lang }}/contact` |
| Request Quote | `/{{ lang }}/quote` — **bg-sky `#1C93D2`** |
| EN \| KO | 기존 `path_without_lang` 유지 |
| 햄버거 | `<768px` — `frontend/js/nav.js` |

**Products 하위 URL**

- `/{{ lang }}/products/test-socket`
- `/{{ lang }}/products/probe-pin`
- `/{{ lang }}/products/test-jig`

---

## 3. 페이지별 와이어·섹션

### 3-1. Home — `/{lang}/`

```
┌─────────────────────────────────────────────────────────┐
│ [Header]                                                 │
├─────────────────────────────────────────────────────────┤
│ HERO (dark navy bg #26337D)                              │
│   H1: Innovative test solution provider                  │
│   sub: Integrated test socket & probe pin design         │
│   [Request a Quote]  [Explore Products]                  │
│   (CTA: 본문 → navy btn / outline white)                 │
├─────────────────────────────────────────────────────────┤
│ CORE VALUES ×4 (grid 2×2 mobile → 4 col desktop)         │
│   icons or numbers 1–4 + §2 핵심 가치 카피               │
├─────────────────────────────────────────────────────────┤
│ STATS "Numbers that define Innovo" (§4-3)                │
│   default: hidden OR placeholder "—" until data          │
│   data-i18n + JSON `home.stats.items[]`                  │
│   Phase 4: Admin ON/OFF — Phase 2는 CSS class `hidden`   │
├─────────────────────────────────────────────────────────┤
│ GLOBAL MAP                                               │
│   SVG world outline + dots (coords TBD)                  │
│   caption: delivery regions, no customer names           │
├─────────────────────────────────────────────────────────┤
│ PRODUCT TEASER (3 cards)                                 │
│   Test Socket | Probe Pin | Test JIG → category URLs   │
├─────────────────────────────────────────────────────────┤
│ CTA band (sky or navy)                                   │
│   "Need a custom test socket?" → /quote                  │
├─────────────────────────────────────────────────────────┤
│ [Footer]                                                 │
└─────────────────────────────────────────────────────────┘
```

| 섹션 | 데이터 소스 | placeholder |
|------|------------|-------------|
| Hero | `home.{lang}.json` | — |
| Core values | 마스터 §2 (4항목) | EN/KO 번역 JSON |
| Stats | `home.stats` | `visible: false` 기본 |
| World map | `home.map.dots[]` `{lat,lng,label?}` | 빈 배열 → 일러스트만 |
| Product teaser | `common.nav.products` | 3D thumb 1장씩 |

### 3-2. About — `/{lang}/about`

```
┌──────────────────────────────────────────┐
│ Page title: About Innovo Solution        │
├──────────────────────────────────────────┤
│ CEO MESSAGE                              │
│   photo placeholder (optional)           │
│   name: Young-Jae Chung (정영재)         │
│   body: Lorem / "추후 제공" placeholder   │
├──────────────────────────────────────────┤
│ VISION & VALUES (§2 비전 테이블)          │
├──────────────────────────────────────────┤
│ ORG CHART (§2 조직도 — CSS tree)         │
├──────────────────────────────────────────┤
│ TIMELINE (vertical, alternating)         │
│   3–5 placeholder milestones             │
│   "2007 Founded" only if confirmed       │
├──────────────────────────────────────────┤
│ ISO 9001                                 │
│   thumbnail → PDF link (lang별 cert)     │
├──────────────────────────────────────────┤
│ FAQ (accordion, 10 items §4-4)           │
│   Q: i18n JSON / A: "Answer coming soon" │
├──────────────────────────────────────────┤
│ Contact strip → /contact                 │
└──────────────────────────────────────────┘
```

**FAQ 초안 10문항** — 질문만 `about.faq.items[].q`, 답변 `a`는 placeholder 문자열.

### 3-3. Products — `/{lang}/products` + 카테고리 3종

**인덱스**: 3대 카테고리 hero 카드 (이미지 + 설명 + "View details")

**카테고리 상세** (`category.html` + context `category`)

- Test Socket: **카드 그리드** — 패밀리별 (마스터 §3 표)
- 각 카드: 3D render (있으면) / placeholder, 패밀리명, max package, Manual/Handler 뱃지
- **"View Specifications"** → 아코디언 펼침 (변형 C/CH/B/BH 테이블)
- **"Request a Quote"** → `/{{ lang }}/quote` (navy CTA)

**정적 데이터** `frontend/content/products/test_socket.json`

```json
{
  "families": [
    {
      "id": "tiny",
      "name_en": "Tiny",
      "name_ko": "Tiny",
      "max_package": "3.0×3.0 mm",
      "variants": [{"code": "—", "type": "Manual"}],
      "image": "/upload/products/renders/test_socket/tiny_socket_render.png"
    }
  ]
}
```

| 카테고리 | JSON | 렌더 이미지 |
|----------|------|------------|
| test_socket | `test_socket.json` | 7 PNG ✅ |
| probe_pin | `probe_pin.json` | placeholder SVG |
| test_jig | `test_jig.json` | placeholder |

**필터 UI**: 마스터 §11 "세부 조건 추후" → Phase 2 **필터 없음**, 카드 그리드만.

### 3-4. Technology — `/{lang}/technology`

```
┌──────────────────────────────────────────┐
│ Hero: Engineering & Simulation           │
├──────────────────────────────────────────┤
│ 3D DESIGN & SIMULATION                   │
│   IC_loading_simulation.png              │
│   pin_align_simulation.png               │
├──────────────────────────────────────────┤
│ HIGH CURRENT SOLUTION (§2 가치 #3)       │
├──────────────────────────────────────────┤
│ SIZE OPTIMIZATION (§2 가치 #2)           │
│   probe_pin_design.png                   │
├──────────────────────────────────────────┤
│ EQUIPMENT (grid)                         │
│   dimension_meter, life_cycle_tester, …  │
├──────────────────────────────────────────┤
│ PATENTS (placeholder)                    │
│   "N patents" — count TBD §12            │
└──────────────────────────────────────────┘
```

### 3-5. Contact — `/{lang}/contact`

`01_plan` §4-2 필드·API와 **UI 1:1 정합**. Phase 2는 폼 HTML + 클라이언트 검증만, submit은 Phase 3.

```
┌──────────────────────────────────────────┐
│ Contact Us                               │
├──────────────────────────────────────────┤
│ Info column │ Map embed                  │
│ address/tel │ Google Maps iframe         │
│ fax/email   │ (lat/lng: 성남 주소)        │
├──────────────────────────────────────────┤
│ ⚠ NDA notice (§4-2 고정 문구)             │
├──────────────────────────────────────────┤
│ Form: category, company, name, email,    │
│ phone, subject, message, file, privacy   │
│ [Submit] — Phase 2: disabled or mock     │
└──────────────────────────────────────────┘
```

**지도**: `upload/contact/location_map.png` + Google Maps 외부 링크 (`/en` → `hl=en`, `/ko` → `hl=ko`). Google Business Profile 등록은 Phase 6 전 KST 업무시간 전화 확인 후 완료 (마스터 §7-6).

### 3-6. 기존 페이지 리팩터

| 페이지 | 작업 |
|--------|------|
| `quote/quick_quote_form.html` | `extends base.html`, Tailwind 클래스, i18n JSON |
| `legal/document.html` | `extends base.html`, `legal.css` → `site.css` merge |
| `home_placeholder.html` | 삭제 → `pages/home.html` |
| `auth/*_placeholder.html` | base 확장 |

---

## 4. JavaScript 모듈

| 파일 | 역할 |
|------|------|
| `nav.js` | 햄버거, Products dropdown, focus trap |
| `faq.js` | About FAQ accordion (aria-expanded) |
| `products.js` | Spec accordion, lazy image |
| `contact.js` | 클라이언트 검증, Phase 3 fetch stub |
| `home-map.js` | SVG dot placement from `window.HOME_MAP_DOTS` |
| `cookie-consent.js` | ✅ 유지 |

---

## 5. FastAPI 라우트 추가 (스켈레톤)

```python
# backend/main.py — i18n merge helper 사용
@app.get("/{lang}/about")
def about_page(request: Request, lang: LangCode):
    t = load_page_i18n("about", lang)
    return templates.TemplateResponse("pages/about.html", _page_context(request, lang, t=t))

# products: index + category slug enum
CategorySlug = Literal["test-socket", "probe-pin", "test-jig"]
```

**slug → JSON 매핑**

| URL slug | JSON file |
|----------|-----------|
| test-socket | `test_socket.json` |
| probe-pin | `probe_pin.json` |
| test-jig | `test_jig.json` |

---

## 6. 구현 순서 (권장)

| Step | 산출물 | 검증 |
|------|--------|------|
| 1 | `package.json`, Tailwind build, `base.html`, header/footer | `/en/` 레이아웃 |
| 2 | `i18n_content.py` + `common.*.json` | nav EN/KO 전환 |
| 3 | Home | 6섹션 + responsive |
| 4 | About | timeline + FAQ accordion |
| 5 | Products JSON + index + test-socket | 7 render 표시 |
| 6 | probe-pin, test-jig category | placeholder OK |
| 7 | Technology | 8 equipment images |
| 8 | Contact UI | 필드 = 01_plan §4-2 |
| 9 | Quote/Legal base 통합 | regression 없음 |
| 10 | login placeholder | 링크 from register |

---

## 7. Phase 2 GO / NO-GO

| # | 조건 | 본 문서 |
|---|------|---------|
| 2.1 | Phase 2 전용 기획서 | ✅ 본 문서 |
| 2.2 | 공통 레이아웃 spec | ✅ §2-3 |
| 2.9 | Tailwind 빌드 방식 | ✅ §2-1 CLI 권장 |
| 2.10 | i18n JSON 구조 | ✅ §2-2 |

**착수 GO**: 위 4건 + 사용자 §12 **placeholder 정책** 확인 후 Builder 구현 시작.

**Phase 2 완료 Definition of Done**

- [ ] Sitemap §4-5 공개 URL 전부 200 (placeholder 콘텐츠 허용)
- [ ] EN/KO 전환 시 동일 path 유지
- [ ] Lighthouse 모바일 Accessibility ≥ 90 (목표)
- [ ] Contact 폼 필드 = Phase 3 API 스키마와 일치
- [ ] `site.css` committed, Tailwind src documented in README

---

## 8. 갭 체크리스트 연동

| Gap # | 항목 | Phase 2 후 상태 |
|-------|------|----------------|
| 2.3 | Home | 구현 시 [x] |
| 2.4 | About | FAQ 답변 placeholder → [~] |
| 2.5 | Products | [~] probe pin render 대기 |
| 2.6 | Technology | [x] 일러스트 있음 |
| 2.7 | Contact UI | [x] |
| 2.8 | Privacy/Terms | **이미 [x]** v1.1 |
| 2.12 | GA4 UI | 쿠키 배너 [~], GA 스크립트 Ph6 |

---

## 9. 🔴 미결 — 사용자 확인 (구현 전)

| # | 질문 | 기본안 (답 없으면 적용) |
|---|------|------------------------|
| Q1 | Home **stats** 3~4개 지표 초기값 공개 가능? | 전부 hidden, Admin 전까지 비표시 |
| Q2 | 월드맵 **납품국 dot 좌표** 제공 가능? | placeholder SVG, dots 없음 |
| Q3 | FAQ **10개 답변** 제공 일정? | "Coming soon" placeholder |
| Q4 | Pedestal / EMMI 카드 **노출**? | 목록에 greyed "Coming soon" |
| Q5 | Tailwind **CLI + npm** 도입 OK? | §2-1 권장안 |
| Q6 | Google Maps **Embed API 키** 보유? | 없으면 static map image + 외부 링크 |
| Q7 | CEO 인사말 **사진** 사용? | 텍스트 only placeholder |

---

## 10. 관련 문서

- `00_master_plan.md` §4-1~§4-5, §6, §8  
- `01_plan_phase3_auth_contact_admin.md` §4 (Contact API·필드)  
- `document/legal/00_legal_placement.md`  
- `00_plan_gap_checklist.md` §5  

---

*작성: Phase 2 기획 (코드·에셋 실측 기준)*
