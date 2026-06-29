# ERP 팀 작업 요청 — 마이페이지 API 운영 배포 확인

**프로젝트**: socket_auto_design  
**작성일**: 2026-06-26  
**상태**: ✅ 완료 (2026-06-26 ERP팀 확인)

---

## 결과 요약

2026-06-26 운영 서버 확인 및 ERP팀 회신 결과, 마이페이지 관련 API 전체가 정상 배포되어 있음이 확인됨.

| 엔드포인트 | 상태 |
|-----------|------|
| `GET /api/hp/auth/me` | ✅ 배포 완료 |
| `PATCH /api/hp/auth/profile` | ✅ 배포 완료 |
| `POST /api/hp/auth/change-password` | ✅ 배포 완료 |
| `DELETE /api/hp/auth/account` | ✅ 배포 완료 |
| `GET /api/hp/account/quotes` | ✅ 배포 완료 (Quote Wizard 연동으로 확인) |
| `GET /api/hp/account/catalog-url` | ⏸ ERP측 보류 — 별도 일정 협의 필요 |

> 오전 테스트에서 405가 발생한 원인: GET 메서드로 PATCH/POST/DELETE 엔드포인트를 호출했기 때문 (라우트 자체는 정상 존재).

---

## 후속 사항

- 카탈로그 다운로드(`/catalog-url`) 재개 일정은 ERP팀 확정 후 별도 협의
- 홈페이지 마이페이지 기능 배포 후 실 계정으로 통합 테스트 예정
