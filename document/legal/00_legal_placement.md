# 법적 문서 — 배치 및 유지보수

> **버전**: 1.1 · **시행일**: 2026-05-21  
> ⚠️ 본문은 B2B 웹사이트용 **v1.1 초안**입니다. 공식 오픈 전 **법무·대표 검토**를 권장합니다.

---

## 1. 콘텐츠 원본 (SSOT)

| 문서 | EN | KO |
|------|----|----|
| 개인정보처리방침 | `frontend/content/legal/privacy.en.json` | `privacy.ko.json` |
| 이용약관 | `frontend/content/legal/terms.en.json` | `terms.ko.json` |

수정 시 **EN/KO 쌍으로** 갱신하고 `meta.effective_date`·`meta.version`을 올립니다.

---

## 2. 고객 노출 위치

| 위치 | 내용 | Phase |
|------|------|-------|
| **푸터 (전 페이지)** | Privacy · Terms · Cookie settings | 3 ✅ |
| **`/{lang}/privacy`** | 개인정보처리방침 전문 | 3 ✅ |
| **`/{lang}/terms`** | 이용약관 전문 | 3 ✅ |
| **쿠키 배너 (최초 방문)** | 필수만 / 분석 허용 + Privacy 링크 | 3 ✅ |
| **Quick Quote 폼** | Privacy 동의 체크 (필수) + 기밀 문서 안내 | 3 ✅ |
| **Contact 폼** | Privacy 동의 (Phase 3 API) | 3 |
| **회원가입** | Privacy + Terms 동의 (각 필수) | 3 |
| **서비스 이메일 푸터** | Privacy URL (Phase 3 구현 시) | 3 |

---

## 3. 기술 연결

- 로더: `backend/utils/legal_content.py`
- 라우트: `backend/main.py` → `GET /{lang}/privacy`, `GET /{lang}/terms`
- 템플릿: `frontend/templates/legal/document.html`
- 공통 UI: `partials/site_header.html`, `site_footer.html`, `cookie_banner.html`
- 스크립트: `frontend/js/cookie-consent.js` (`localStorage`: `innovo_cookie_consent`)

---

## 4. GDPR / 마스터 플랜 정합

- 보관 기간: 마스터 §7-3 (회원 즉시파기 / 견적 5년 / 문의 3년)
- GA4: 쿠키 동의 **opt-in** 후만 로드 (Phase 6 `GA_MEASUREMENT_ID`)
- reCAPTCHA·Mailnara: Privacy §6 제3자 처리 위탁에 명시

---

## 5. 관련 기획

- `document/plan/00_master_plan.md` §7-3
- `document/plan/01_plan_phase3_auth_contact_admin.md` §5-2 (가입 동의)
