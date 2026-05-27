# 00. 기획 갭 체크리스트 (Master Gap Checklist)

> **목적**: Innovo_homepage 전 Phase 기획 완성도 추적 — **개발 착수 GO/NO-GO** 판단용  
> **최종 갱신**: 2026-05-27  
> **갱신 규칙**: 기획서 작성·승인·담당자 답변 시 해당 `[ ]` → `[x]` 및 날짜 기록

---

## 1. 사용법

| 기호 | 의미 |
|------|------|
| `[x]` | 기획 확정 — 개발 가능 |
| `[~]` | 부분 완료 — 조건부 개발 가능 |
| `[ ]` | 미완 — **개발 블로커** 또는 담당자 입력 대기 |
| `[—]` | 해당 Phase 범위 밖 / 의도적 제외 |
| **🔴** | Phase 착수 전 필수 |
| **🟡** | 있으면 좋음 / Phase 중반까지 |
| **🟢** | Phase 후반·운영 전 |

**완성도 기준**

- **90%+**: 이 문서만 보고 해당 Phase 개발 가능
- **70~89%**: 핵심 흐름 가능, `[ ]` 항목은 placeholder·TBD로 개발
- **<70%**: 기획 보완 후 착수

---

## 2. 전체 요약 (2026-05-21)

| Phase | 기획 완성도 | 착수 판정 | 병목 |
|-------|------------|----------|------|
| **Phase 1** (요구사항) | **~85%** | GO | 이용약관·특허·ERP API 확인 |
| **Phase 2** (정적 UI) | **~35%** | NO-GO | **전용 기획서 없음**, Products JSON·Tailwind·월드맵 |
| **Phase 3** (백엔드) | **~90%** | GO | Phase 2 레이아웃·법무 최종 검토 |
| **Phase 4** (위저드) | **~45%** | NO-GO | 패밀리별 스pec, 납기 테이블, ERP pg_dump |
| **Phase 5** (ERP) | **~70%** | NO-GO | ERP API·socket_auto_design 작업 |
| **Phase 6** (배포) | **~25%** | NO-GO | 배포 아키텍처 세부 미정 |

---

## 3. 기획서 파일 인덱스

| 파일 | Phase | 완성도 | 비고 |
|------|-------|--------|------|
| `00_master_plan.md` | 전체 | ~80% | 골격·정책 SSOT |
| `00_plan_gap_checklist.md` | 전체 | — | **본 문서** |
| `01_plan_phase3_auth_contact_admin.md` | 3 | ~85% | Contact·Auth·Admin 통합 |
| `02_plan_erp_logic_migration.md` | 4 | ~70% | DB·로직 이식 |
| `03_plan_quick_quote_integration.md` | 3·5 | ~85% | Quick Quote |
| `01_plan_phase2_frontend.md` | 2 | **0%** | 🔴 **미작성** |
| `01_plan_phase4_quote_wizard.md` | 4 | **0%** | 🔴 **미작성** |
| `document/data_dictionary/00_schema.md` | 3+ | ~30% | quick_quote만 |

---

## 4. Phase 1 — 요구사항·정책

| # | 항목 | 상태 | 문서 | 담당 |
|---|------|------|------|------|
| 1.1 | 브랜드 컬러·폰트 | [x] | 마스터 §6 | — |
| 1.2 | Sitemap URL 표 | [x] | 마스터 §4-5 | — |
| 1.3 | 견적 1차/2차 구조 | [x] | 마스터 §7-0 | — |
| 1.4 | 회원 등급·이메일 인증 | [x] | 마스터 §7-2 | — |
| 1.5 | Admin 2역할 (admin / sales_admin) | [x] | 마스터 §7-4 | customer_admin 1차 제외 |
| 1.6 | Mailnara SMTP 통일 | [x] | 마스터 §7-6 | — |
| 1.7 | 🔴 **이용약관 본문** | [~] | `frontend/content/legal/terms.*.json` | **v1.1** — 변호사 최종 확인 권장 |
| 1.8 | 🔴 **개인정보처리방침 본문** | [~] | `frontend/content/legal/privacy.*.json` | **v1.1** — 변호사 최종 확인 권장 |
| 1.9 | FAQ **답변** 10건 | [ ] | 마스터 §4-4 | 영업 |
| 1.10 | Home 숫자 섹션 **실제 수치** | [ ] | 마스터 §11 | 대표 |
| 1.11 | 특허 목록·수량 | [ ] | 마스터 §11 | R&D |
| 1.12 | Pedestal / EMMI 스pec | [ ] | 마스터 §11 | 설계 |
| 1.13 | 🔴 **ERP REST API 가능 여부** | [ ] | 마스터 §11 | ERP 개발 |
| 1.14 | 견적 **상태 변경 알림** 수신자 | [ ] | 마스터 §11 | 영업 |
| 1.15 | 도메인 innovosolution.co.kr | [ ] | 마스터 §11 | IT |

---

## 5. Phase 2 — 정적 프론트엔드

| # | 항목 | 상태 | 문서 | 비고 |
|---|------|------|------|------|
| 2.1 | 🔴 **Phase 2 전용 기획서** | [x] | `04_plan_phase2_static_frontend.md` | 2026-05-21 |
| 2.2 | 공통 레이아웃 (header/footer) | [x] | `base.html` + partials | 2026-05-21 |
| 2.3 | Home — 히어로·강점·월드맵 | [x] | `pages/home.html` | stats hidden |
| 2.4 | About — CEO·연혁·FAQ·ISO | [~] | `pages/about.html` | FAQ 답 placeholder |
| 2.5 | Products — 카드·스pec·JSON | [x] | `content/products/*.json` | probe pin render 대기 |
| 2.6 | Technology | [x] | `pages/technology.html` | |
| 2.7 | Contact **페이지** (폼 UI) | [x] | `pages/contact.html` | submit Ph3 |
| 2.8 | Privacy / Terms **페이지** | [x] | v1.1 + base 레이아웃 | |
| 2.9 | Tailwind **빌드 방식** | [x] | CLI + `site.css` | `npm run build:css` |
| 2.10 | i18n JSON 구조 | [x] | `content/i18n/` + loader | |
| 2.11 | 제품 필터 조건 | [ ] | 마스터 §11 | — |
| 2.12 | GA4 + 쿠키 동의 UI | [~] | 마스터 §7-6 | 정책만 |

**Phase 2 착수 GO 조건**: 2.1 ✅ + 2.9·2.10 확정 + §12 Q1–Q7 placeholder 정책 합의

---

## 6. Phase 3 — 백엔드 (통합)

| # | 항목 | 상태 | 문서 | 비고 |
|---|------|------|------|------|
| 3.1 | Quick Quote API·DB | [x] | 03_plan, 코드 | bootstrap 존재 |
| 3.2 | Quick Quote i18n 문구표 | [ ] | 03 §6-3 | |
| 3.3 | **Contact API·DB·첨부** | [x] | `routers/contact.py` | 2026-05-21 |
| 3.4 | **users·JWT·이메일 인증** | [x] | `routers/auth.py` | 2026-05-21 |
| 3.5 | **staff·Admin·2FA** | [x] | `routers/admin.py` | 이메일 OTP |
| 3.6 | data_dictionary users/contact | [x] | 00_schema.md | |
| 3.7 | Admin 목록 UI 3화면 | [x] | `/admin/quotes` 등 | |
| 3.8 | 🔴 이용약관 (가입 필수) | [x] | v1.1 JSON | |
| 3.9 | Contact 10MB·1파일 정책 | [x] | 01_plan §4-3 | 2026-05-21 |
| 3.10 | Admin seed `sbchung@` sales_admin | [x] | startup seed | ADMIN_SEED_PASSWORD |
| 3.11 | 비밀번호 재설정 (Phase 3) | [x] | 01_plan §5-4-1 | |
| 3.12 | Phase 2 Contact/Login **레이아웃** | [x] | base.html | |

**Phase 3 완료 조건**: `alembic upgrade head` + `.env` SMTP·ADMIN_SEED_PASSWORD + 통합 테스트 §11

---

## 7. Phase 4 — Quote Wizard

| # | 항목 | 상태 | 문서 | 비고 |
|---|------|------|------|------|
| 4.1 | 🔴 **Phase 4 UI 기획서** | [ ] | — | 4단계 와이어 |
| 4.2 | ERP pg_dump 9테이블 | [ ] | 02_plan §3 | ERP 접속 |
| 4.3 | design_logic 연결 | [ ] | 02_plan §4 | models |
| 4.4 | 🔴 **패밀리별 2단계 스pec** | [ ] | 마스터 §7-1 | 담당자 |
| 4.5 | 🔴 **납기 테이블** | [ ] | 마스터 §11 | 담당자 |
| 4.6 | quote_requests 테이블 | [ ] | — | JSONB 스pec |
| 4.7 | `/quote` UI: 탭 vs 업그레이드 | [ ] | 마스터 §7-0 | 미결 |
| 4.8 | 견적 PDF 생성 | [~] | 마스터 §7-1 | 단순 HTML |
| 4.9 | Admin 대시보드 통계 | [~] | 마스터 §7-4 | |
| 4.10 | 만료 7일·2일 전 알림 | [x] | 마스터 §7-1 | 수신자 1.14 |
| 4.11 | Probe Pin / JIG 위저드 | [ ] | 마스터 §7-1 | 스pec 없음 |

**Phase 4 착수 GO 조건**: 4.1 + 4.2 + 4.4 + 4.5

---

## 8. Phase 5 — ERP 연동

| # | 항목 | 상태 | 문서 | 비고 |
|---|------|------|------|------|
| 5.1 | ERP inquiry API 스pec | [x] | 03_plan §5 | socket_auto_design |
| 5.2 | ERP homepage_inquiries 테이블 | [ ] | 03_plan | ERP 측 |
| 5.3 | `ERP_API_KEY` 발급 | [ ] | .env | |
| 5.4 | Quick Quote → ERP 전송 | [ ] | 03 Ph2 | Ph3.1 후 |
| 5.5 | ic_type 고급 검색 (선택) | [~] | 03 Ph3 | Phase 5+ |

---

## 9. Phase 6 — 배포·운영

| # | 항목 | 상태 | 문서 | 비고 |
|---|------|------|------|------|
| 6.1 | EC2 + S3 + SSL | [~] | 마스터 §9·§12 | 방향만 |
| 6.2 | CI/CD·브랜치 live | [ ] | CLAUDE.md | |
| 6.3 | noreply@innovosolution.co.kr | [ ] | 마스터 §7-6 | |
| 6.4 | Contact S3·바이러스 스캔 | [ ] | 01_plan §4-3 | |
| 6.5 | 백업·pg_dump 운영 | [~] | CLAUDE.md | |
| 6.6 | 🟡 **Google Business Profile** | [~] | 마스터 §7-6 | **2026-05-27 보류** — 전화 확인; KST 업무시간(평일 09~18) 재개. Local store + Electronics manufacturer 입력됨 |

---

## 10. 도메인별 횡단 체크

### 10-1. DB / data_dictionary

| 테이블 | 기획 | migration | dictionary |
|--------|------|-----------|------------|
| quick_quote_inquiries | [x] | [x] | [x] |
| contact_inquiries | [x] | [ ] | [ ] |
| users | [x] | [ ] | [ ] |
| email_verification_tokens | [x] | [ ] | [ ] |
| password_reset_tokens | [x] | [ ] | [ ] |
| staff_accounts | [x] | [ ] | [ ] |
| staff_login_otp | [x] | [ ] | [ ] |
| quote_requests (Ph4) | [ ] | [ ] | [ ] |
| ERP 마스터 9종 (Ph4) | [x] | [ ] | [ ] |

### 10-2. API

| API | 기획 | 구현 |
|-----|------|------|
| POST /api/quick-quote | [x] | [x] |
| POST /api/contact | [x] | [ ] |
| POST /api/auth/* | [x] | [ ] |
| Admin /admin/api/* | [x] | [ ] |
| POST /api/quote/* (Ph4) | [~] | [ ] |

### 10-3. 이메일 (Mailnara)

| 트리거 | 기획 | 구현 |
|--------|------|------|
| Quick Quote 접수 | [x] | [x] |
| Contact 접수 | [x] | [ ] |
| 회원 이메일 인증 | [x] | [ ] |
| 비밀번호 재설정 | [x] | [ ] |
| 인증회원 승인 | [x] | [ ] |
| 견적 만료 2일 전 (Ph4) | [x] | [ ] |
| 견적 상태 변경 (Ph4) | [ ] | [ ] |

### 10-4. 에셋

| 에셋 | 상태 |
|------|------|
| 로고 PNG | [x] |
| ISO PDF | [x] |
| 카탈로그 PDF | [x] |
| Socket List | [x] |
| 제품 3D 렌더 | [ ] 🔴 |
| 월드맵 좌표 | [ ] |
| CEO 인사말 본문 | [ ] |
| 연혁 마일스톤 | [ ] |
| Contact 지도 이미지 | [x] | `upload/contact/location_map.png` |
| Google Business Profile | [~] | 전화 확인 대기 (KST 업무시간) |

---

## 11. 코드 vs 기획 정합성

| 항목 | 기획 | 코드 | 조치 |
|------|------|------|------|
| lang 라우트 | `{lang:en\|ko}` (마스터 §5) | `Literal["en","ko"]` | 마스터 §5 예시 코드 업데이트 권장 |
| Quick Quote bootstrap | 승인 후 개발 | **이미 구현** | 기획 승인 후 잔여만 |
| Contact/Auth | 01_plan | 없음 | 정합 |
| `.env` JWT/Admin 키 | 01_plan §8 | .env.example 미반영 | 기획 승인 후 example 갱신 |

---

## 12. 권장 작업 순서 (기획만)

```
1. [ ] Phase 2 기획서 (`01_plan_phase2_frontend.md`) — 🔴 최우선
2. [ ] FAQ 답변 + Privacy/Terms 초안 — 담당자 Q&A
3. [x] Phase 3 통합 기획 (`01_plan_phase3_auth_contact_admin.md`) — 검토·승인
4. [x] 01_plan §12 — Contact·seed·역할·비밀번호 재설정 확정 (2026-05-21)
5. [ ] data_dictionary — users/contact/staff 반영
6. [ ] Phase 4 위저드 기획서 — ERP·영업 입력 후
7. [ ] 마스터 §5 lang 라우트 예시 수정
```

---

## 13. 개발 착수 GO/NO-GO (한 줄)

| 범위 | 판정 |
|------|------|
| Phase 2 UI only | **NO-GO** — 2.1 기획서 없음 |
| Phase 3 Quick Quote only | **GO** — 03_plan + 코드 |
| Phase 3 전체 (Contact+Auth+Admin) | **GO** — 01_plan 승인 + 법무 검토(선택) |
| Phase 4 Wizard | **NO-GO** — 4.4·4.5·4.2 |
| Phase 5 ERP | **NO-GO** — ERP 측 + 1.13 |

---

*체크리스트 갱신 시 `00_master_plan.md` §10 부속 기획서 표에 `01_plan_phase3` 링크 추가 여부 확인.*
