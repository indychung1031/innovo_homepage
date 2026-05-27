# Innovo_homepage Development Guide

## 1. 시작하기 (Getting Started)

### 필수 요구사항

- Python 3.11+
- PostgreSQL 15+ (로컬 설치 또는 Docker)
- Git

### 환경 설정

```bash
# 1. 가상환경
python -m venv venv
venv\Scripts\activate

# 2. 의존성 (백엔드 구현 후)
pip install -r requirements.txt

# 3. 환경변수
copy .env.example .env
# .env 에 POSTGRES_* 값 입력
```

### PostgreSQL 로컬 DB 생성 (예시)

```sql
CREATE DATABASE innovo_homepage;
CREATE USER innovo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE innovo_homepage TO innovo_user;
```

### 설치 및 실행

```bash
# Alembic 마이그레이션 (백엔드·Alembic 설정 후)
alembic upgrade head

# 서버 실행
uvicorn backend.main:app --reload --port 8000
```

## 2. 개발 워크플로우

1. `document/plan/` 에 기획서 작성
2. 사용자 승인 후 구현
3. DB 변경 시 Alembic revision 생성 및 `document/data_dictionary/` 업데이트
4. 로컬 검증
5. 문서 업데이트 (Code-Doc Sync)

## 3. 코딩 컨벤션

- `CLAUDE.md` 및 `.antigravity/rules/` 참조
