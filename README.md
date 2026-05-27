# Innovo_homepage

Innovosolution 공식 홈페이지 프로젝트

## 규칙

- 프로젝트 규칙: [`CLAUDE.md`](CLAUDE.md)
- 공통 규칙: [`.antigravity/rules/`](.antigravity/rules/)

## 폴더 구조

```
Innovo_homepage/
├── frontend/       # HTML, CSS, JS
├── backend/        # FastAPI
├── database/       # Alembic 마이그레이션·SQL 스크립트
├── document/       # 기획·보고서·데이터 사전
└── upload/         # 미디어 에셋
```

## 기술 스택

- Frontend: HTML5, CSS3, Vanilla JS, Tailwind CSS
- Backend: FastAPI + Jinja2
- Database: **PostgreSQL** (SQLAlchemy + Alembic)

## CSS 빌드 (Tailwind)

```bash
npm install
npm run build:css
```

- 입력: `frontend/css/tailwind.src.css` → 출력: `frontend/css/site.css`
- 템플릿·Tailwind 클래스 변경 후 위 명령을 다시 실행합니다.

## 로컬 실행 (Phase 3)

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# .env 에 POSTGRES_* 값 입력 후 PostgreSQL DB 생성

alembic upgrade head
uvicorn backend.main:app --reload --port 8000
```

- 헬스체크: http://127.0.0.1:8000/health
- Quick Quote: http://127.0.0.1:8000/en/quote
- API 문서: http://127.0.0.1:8000/docs

## 문서

- [마스터 플랜](document/plan/00_master_plan.md)
- [아키텍처](document/ARCHITECTURE.md)
- [개발 가이드](document/DEVELOPMENT_GUIDE.md)
