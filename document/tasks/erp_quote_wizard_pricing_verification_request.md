# ERP 팀 재확인 요청 — Quote Wizard 엔드포인트 미반영 확인됨

**프로젝트**: socket_auto_design
**관련 문서**: `document/tasks/erp_quote_wizard_pricing_task.md` (2026-06-24 전달, 2026-06-25 "완료" 회신 받음)
**작성일**: 2026-06-25
**우선순위**: 높음 — 회신 내용과 실제 운영 서버 상태가 다름

---

## 1. 확인 배경

"완료해뒀다"는 회신을 받고 운영 서버에서 직접 테스트했습니다. 그런데 요청했던 6개 엔드포인트가 **ERP 서버(EC2) 자체에서 전부 404 Not Found**로 응답합니다. CloudFront를 거치지 않고 ERP-EC2(`54.116.87.172`)에 `Host: www.innovosolution.co.kr` 헤더로 직접 요청해 CDN 캐시 가능성을 배제한 결과입니다.

## 2. 테스트 결과

| 엔드포인트 | 결과 |
|---|---|
| `GET /api/hp/auth/me` (기존 — 비교 기준) | `401 {"errorCode":"UNAUTHORIZED",...}` — 라우트 정상 존재 |
| `GET /api/hp/wizard/socket-types` | `404 {"detail":"Not Found"}` |
| `GET /api/hp/wizard/ic-package-types` | `404 {"detail":"Not Found"}` |
| `GET /api/hp/wizard/cover-types` | `404 {"detail":"Not Found"}` |
| `GET /api/hp/wizard/material-types` | `404 {"detail":"Not Found"}` |
| `POST /api/hp/wizard/quote-estimate` | `404 {"detail":"Not Found"}` |
| `POST /api/hp/wizard/submit` | `404 {"detail":"Not Found"}` |

> 참고: `www.innovosolution.co.kr`을 통해 같은 경로를 호출하면 `200 OK` + 홈페이지 HTML이 반환되는데, 이는 CloudFront가 origin 404를 SPA `index.html`로 치환하는 커스텀 에러 설정 때문입니다. CloudFront 단계만 보면 "정상 응답"처럼 보이지만 origin 기준으로는 동일한 404입니다. 혼선이 있을 수 있어 origin 직접 호출 결과로 안내드립니다.

## 3. 코드 측 확인

- `socket_auto_design` 로컬 저장소가 `origin/master`와 동기화된 최신 상태인지 확인 — `wizard` 관련 커밋/코드 없음
- `membership_tier` 마크업 로직도 `hp_account.py`, `hp_auth.py` 외 신규 추가된 곳 없음 (기존 카탈로그 다운로드 권한 체크 용도만 존재)

## 4. 요청 사항

아래 중 하나로 확인 부탁드립니다.

1. 배포가 아직 운영 서버에 반영 안 된 경우 → 배포 후 다시 알려주세요.
2. 다른 경로명/방식으로 구현하신 경우 → 실제 엔드포인트 경로와 스펙을 알려주세요. (저희 쪽 프론트 연동 코드를 그에 맞게 수정하겠습니다.)
3. 작업이 아직 시작 전인 경우 → 예상 일정을 알려주세요.

원본 요청 스펙은 `document/tasks/erp_quote_wizard_pricing_task.md`를 참고해 주세요.
