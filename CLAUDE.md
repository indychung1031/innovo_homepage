# Innovo_homepage - Claude 지침

## 프로젝트 정보
- **Git Root**: `c:/Users/indyc/Desktop/antigravity/project/Innovo_homepage`
- **Remote**: `https://github.com/indychung1031/innovo_homepage.git`
- **Branch**: `master`
- **규칙 원본**: `.antigravity/rules/` (11개 파일)
- **목적**: Innovosolution 공식 홈페이지 (www.innovosolution.co.kr)

---

## 필수 규칙

### 언어
- 모든 문서, 답변, 커밋 메시지는 **한국어**로 작성한다.
- 코드 주석도 한국어로 작성한다 (의도와 이유 중심).

---

## 역할 정의 (Role Definitions)

사용자가 역할을 지정하면 해당 역할의 제약을 따른다.

| 역할 | 설명 | 제약 |
|------|------|------|
| **👑 Supervisor** | 규칙 관리, 승인 권한, 진행 추적 | 코드 작성 안 함 |
| **📝 Planner** | 요구사항 분석, 계획 문서 작성 | 코드 직접 수정 안 함 (읽기 전용) |
| **🛠️ Builder** | 승인된 계획에 따라 코드 구현 | DB 스키마 변경 임의 결정 불가 |
| **⚡ Utility** | 빠른 수정, Q&A, 간단한 작업 | 오타/주석/포맷팅은 즉시 실행 가능 |

**기본 역할**: 사용자가 지정하지 않으면 **Builder**로 동작한다.

---

## 개발 워크플로우 (Development Workflow)

### 표준 흐름 (Builder / Planner)
1. **기획**: 무엇을 만들지 명확히 정의
2. **승인**: 계획 제안 → **사용자 명시적 승인("진행해", "좋아") 전까지 코드 수정 금지**
3. **구현**: 승인된 계획에 따라 단계적으로 구현
4. **검증**: 기능 동작 확인, 예외 처리 점검

### 승인 예외 (Utility 역할)
- 오타 수정, 주석 추가/제거, 코드 포맷팅, 단순 파일 이동 → 즉시 실행 가능
- 로직 변경은 여전히 승인 필요

### 무인 작업 모드
- 사용자가 "퇴근", "알아서 해", "배치 작업" 등 지시 시 승인 절차 생략
- 작업 완료 후 `document/reports/YYYYMMDD_work_report.md` 생성

### 기획서 작성 순서 (필수)
기획서를 작성할 때는 반드시 아래 순서를 따른다.

1. **코드 먼저 읽기**: 관련 HTML, CSS, JS, 라우터, 템플릿을 먼저 읽어 실제 구조를 확인한다. 추정으로 쓰지 않는다.
2. **확인된 내용 기준으로 작성**: 코드에서 확인한 실제 값만 기획서에 기재한다.
3. **비즈니스 기준은 반드시 질문**: 코드로 알 수 없는 판정 기준, 예외 처리 정책, 디자인 가이드 등은 사용자에게 먼저 질문하고 답변을 받은 후 기획서에 반영한다.
4. **자체 검토**: 작성 완료 후 "이 문서만 보고 바로 개발할 수 있는가"를 기준으로 스스로 검토한다.

---

## 파일 & 폴더 구조 (File Organization)

### 표준 구조
```
Innovo_homepage/
├── frontend/              # HTML/CSS/JS (홈페이지 UI)
│   ├── css/
│   ├── js/
│   └── templates/       # Jinja2 또는 정적 HTML 페이지
├── backend/             # FastAPI — 문의 폼·API 등
├── database/            # Alembic 마이그레이션·시드·SQL 스크립트
├── upload/              # 사용자 업로드·미디어 에셋
├── document/
│   ├── plan/            # 기획 문서 (계층적 번호 체계)
│   ├── tasks/           # 태스크 문서
│   ├── reports/         # 작업 보고서
│   └── data_dictionary/ # DB 스키마 문서
└── .antigravity/        # 규칙 원본 (Junction)
```

### DB 규칙 (PostgreSQL)
- **✅ 기본 DB**: **PostgreSQL** (로컬·운영 공통)
- **✅ 접속 설정**: `.env`의 `POSTGRES_*` 환경변수 사용 (`os.getenv()`)
- **✅ 스키마 변경**: **Alembic** revision으로 관리
- **❌ 절대 금지**: SQLite를 기본 DB로 사용
- **❌ 절대 금지**: `backend/` 폴더 내 `.db` 파일 생성
- **❌ 절대 금지**: DB 비밀번호·연결 문자열 하드코딩

### 데이터 사전 (Data Dictionary)
- **위치**: `document/data_dictionary/` (예: `00_schema.md`)
- **DB 스키마를 수정한 경우**: 반드시 위 폴더 문서를 해당 변경에 맞게 업데이트한다.

### 기획 문서 명명 규칙
- 마스터: `00_master_plan.md`
- Phase별 기획: `NN_plan_phaseN_역할.md` (`document/plan/`)
- 스텝 태스크: `01_01_step_plan_페이지명.md`

---

## 기술 스택 제약 (Technology Stack)

### 프론트엔드 - Vanilla Stack 전용
- **✅ 허용**: HTML5, CSS3, Vanilla JS (ES6+), Tailwind CSS
- **❌ 금지**: React, Vue.js, Angular, Svelte 등 SPA 프레임워크
- 외부 라이브러리 추가 시 반드시 사용자 승인 후 설치

### 백엔드
- **FastAPI** (Python) + **PostgreSQL** + **SQLAlchemy** + **Jinja2**
- DB 드라이버: `psycopg2` (또는 `psycopg2-binary`)
- 스키마 마이그레이션: **Alembic**
- 정적 페이지만 먼저 구현하더라도, DB·API 설계는 PostgreSQL 기준으로 작성한다.

### PostgreSQL 환경변수 (`.env`)
```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=innovo_homepage
POSTGRES_USER=
POSTGRES_PASSWORD=
```
- `.env.example`을 참고하고, 실제 값은 `.env`에만 저장한다.

### 배포 (확정 전 — 기획 단계에서 결정)
- 후보: AWS S3 + CloudFront, EC2, GitHub Pages 등
- 배포 방식 확정 후 본 섹션과 Git 브랜치 전략을 업데이트한다.

---

## 코딩 표준 (Coding Standards)

### Python
- PEP 8 준수, 줄 길이 최대 100자, 들여쓰기 4칸
- 주석: 코드의 '동작'보다 '**의도와 이유**'를 설명

### JavaScript
- ES6+ 사용, 세미콜론 사용, 작은따옴표 선호
- 비동기: `async/await` 선호

### HTML/CSS
- 시맨틱 HTML5 태그 사용
- 반응형 디자인 (모바일 우선)
- 접근성(a11y) 기본 준수 (alt, aria-label 등)

### 명명 규칙
- Python: 변수/함수 `snake_case`, 클래스 `PascalCase`, 상수 `UPPER_SNAKE_CASE`
- JavaScript: 변수/함수 `camelCase`, 클래스 `PascalCase`, 상수 `UPPER_SNAKE_CASE`
- 파일명: 영문 사용 권장 (한글/특수문자 지양)

---

## 보안 (Security)

- API 키, DB 비밀번호, 암호화 키 등 **하드코딩 절대 금지** → `os.getenv()` 사용
- `.env` 파일은 Git 커밋하지 않는다
- 코드 리뷰 중 민감 정보 발견 시 즉시 사용자에게 경고
- **`.env` 파일을 읽더라도 내용(API 키, 비밀번호 등 민감 값)을 응답에 절대 출력하지 않는다** — 존재 여부·키 이름만 언급한다

---

## 백업 프로토콜 (Backup Protocol)

- 대규모 구현 작업 전 백업 여부 확인
- 전체 폴더 백업 금지 → **변경 부분만** 선별 백업
- 백업 위치: `backups/Innovo_homepage/YYYYMMDD_HHMM/`
- DB 백업: `pg_dump innovo_homepage > backup_YYYYMMDD.sql`
- 제외 항목: `__pycache__/`, `*.pyc`, `.git/`, `venv/`, `node_modules/`

---

## Git 커밋 & Push 지침

### 브랜치 전략

| 브랜치 | 용도 | 규칙 |
|--------|------|------|
| `master` | 개발 작업 브랜치 | 모든 코드 수정은 여기서만 |
| `live` | 운영 배포 브랜치 | 배포 파이프라인 확정 후 사용 |

**⛔ 절대 금지 사항**:
1. `live` 브랜치에서 직접 코드 수정 또는 커밋 — **master에서만 작업**
2. 서버에 SSH 접속하여 코드를 직접 수정 — **Git을 통해서만 배포**
3. 사용자 요청 없이 `live` 브랜치에 merge — **배포 요청이 있을 때만 실행**

### 작업 완료 후 커밋 절차
코드 수정 작업이 완료된 후:

1. **변경 내역 확인**: `git status` + `git diff` 실행
2. **커밋 메시지 작성**: 아래 형식에 따라 한국어로 작성
3. **스테이징 및 커밋**: 변경된 파일을 커밋
4. **Push**: `git push origin master` 실행 (원격 저장소 설정 후)

### 커밋 메시지 형식
```
<타입>: <요약 (한국어, 50자 이내)>

<상세 설명 (선택, 72자 이내 줄바꿈)>
```

**타입 종류**:
- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `refactor`: 리팩토링 (기능 변화 없음)
- `style`: UI/CSS 변경
- `docs`: 문서 변경
- `chore`: 기타 (설정, 의존성 등)

### Push 전 확인 사항
- 민감 정보 (`.env`, 비밀번호, API 키) 가 포함된 파일은 커밋하지 않는다.
- `.env`, DB 덤프 파일(`*.sql`), 빌드 결과물, 임시 파일은 커밋하지 않는다.
- DB 스키마 변경이 포함된 커밋은 사용자 확인 후 진행한다.
