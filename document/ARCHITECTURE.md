# Innovo_homepage Architecture

## 1. 프로젝트 개요

Innovosolution 공식 홈페이지 (www.innovosolution.co.kr)

## 2. 시스템 구조

(기획 완료 후 아키텍처 다이어그램 및 설명을 작성하세요)

## 3. 기술 스택

- Frontend: HTML5, CSS3, Vanilla JS, Tailwind CSS
- Backend: FastAPI + Jinja2
- Database: **PostgreSQL** (SQLAlchemy + Alembic)
- DB 드라이버: psycopg2
- Hosting: (미정)

## 4. PostgreSQL

- 로컬·운영 모두 PostgreSQL 사용 (SQLite 미사용)
- 접속: `.env`의 `POSTGRES_*` 환경변수
- 기본 DB명: `innovo_homepage`
- 스키마 문서: `document/data_dictionary/`

## 5. 페이지 구성

(마스터 플랜 확정 후 페이지 목록을 기록하세요)
