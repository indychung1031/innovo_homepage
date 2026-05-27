# database/

PostgreSQL 관련 파일을 저장하는 폴더입니다.

## 용도

- Alembic 마이그레이션 스크립트
- 시드(seed) SQL·Python 스크립트
- 수동 SQL 스크립트

## 참고

- DB 데이터 파일(`.db`, `.sqlite`)은 **사용하지 않습니다**. PostgreSQL 서버에 저장됩니다.
- 접속 정보는 프로젝트 루트 `.env`의 `POSTGRES_*` 환경변수를 사용합니다.
- 스키마 문서: `document/data_dictionary/`
