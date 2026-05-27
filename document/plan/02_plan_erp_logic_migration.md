# ERP 연동 기획서 (API 방식 — 확정)

> 상태: **API 스펙 확정** — 작성일: 2026-05-22 / 최종 수정: 2026-05-27  
> 적용 Phase: **Phase 4** (ERP API 연동 + Quote Wizard 가격·추천 엔진)  
> 목적: ERP 공개 API를 통해 마스터 데이터 조회 및 가 견적 계산  
> **마스터 플랜**: `document/plan/00_master_plan.md` §7-0, §10

> ⚠️ **기획 변경 (2026-05-27)**: 당초 pg_dump 방식 → **ERP REST API 방식으로 전환 확정**  
> ERP 팀이 `api/public` 엔드포인트를 제공하므로 홈페이지 DB에 마스터 테이블 이식 불필요.  
> `sales_logic.py` / `design_logic.py` 직접 호출도 불필요 — 가 견적 계산은 ERP API가 담당.

---

## 0. ERP API 스펙 (2026-05-27 확정)

### Base URL
```
https://[ERP 서버 주소]/api/public
```
> 실제 ERP 서버 주소는 `.env`의 `ERP_API_BASE_URL`에 보관

### 인증
- 기존 `X-API-Key` 헤더 방식 유지 (`ERP_API_KEY` 환경변수)

### CORS
- `www.innovosolution.co.kr` 허용 완료 (ERP 팀 설정 완료)

---

### 마스터 데이터 조회 (GET)

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /socket-types` | 소켓 패밀리 + max IC 치수 (D/E 추천 로직) |
| `GET /ic-package-types` | IC 패키지 타입 (BGA, QFN, WLP 등) |
| `GET /cover-types` | 커버 타입 (Clamshell, Bottle Cap) |
| `GET /pin-block-types` | 핀 블록 타입 |
| `GET /material-types` | 소재 타입 (CMF, PEEK 등, estimate 입력 매핑용) |
| `GET /suppliers` | 공급사 목록 (supplier_id, supplier_name, is_active만) |

---

### 가 견적 계산 (POST)

```
POST /api/public/quote-estimate
Content-Type: application/json
X-API-Key: {ERP_API_KEY}
```

**요청 바디:**
```json
{
  "socket_type_id": 1,
  "material_type_id": 2,
  "cover_type_id": 1,
  "pin_block_type_id": 3,
  "pocket_guide_type_id": null,
  "pin_count": 144,
  "quantity": 5
}
```

**응답:**
```json
{
  "matched": true,
  "unit_price": 150000,
  "currency": "KRW",
  "quantity": 5,
  "total_price": 712500
}
```

> **보안**: 원가(`service_cost_logic`) 미노출, 할인율 미노출, 최종 금액만 반환  
> `matched: false` 응답 시 → "해당 조합의 가 견적을 자동 계산할 수 없습니다. 담당자에게 문의해주세요." 안내

---

## 0-1. 다른 ERP 연동 기획과의 구분

| 트랙 | 기획서 | 역할 | 마스터 Phase |
|------|--------|------|-------------|
| **마스터 데이터 + 가 견적** | **본 문서 (`02_plan`)** | ERP `api/public` GET/POST → Quote Wizard | **Phase 4** |
| **Quick Quote 접수함** | `03_plan` Phase 2 | `POST /api/external/inquiry` — 비회원 폼 → ERP pre-fill | **Phase 5** |
| **고급 검색 필드** | `03_plan` Phase 3 | `ic_type` 등 optional — ERP 컬럼·API 확장 | **Phase 5+ (선택)** |

> 본 문서는 **회원 견적 위저드**용 ERP API 연동만 다룬다. 비회원 Quick Quote ERP 전송은 `document/plan/03_plan_quick_quote_integration.md`를 따른다.

---

## 1. 개요

홈페이지 견적 위저드(Quote Wizard)에서 필요한 두 가지 핵심 로직이 ERP에 이미 구현되어 있다.

| 기능 | ERP 파일 | 홈페이지 적용 위저드 단계 |
|------|---------|----------------------|
| 소켓/핀 패밀리 자동 추천 | `backend/utils/design_logic.py` | 1단계: IC 정보 입력 → 패밀리 추천 |
| 가 견적 금액 계산 | `backend/utils/sales_logic.py` | 3단계: 가 견적 확인 화면 |

두 파일은 이미 홈페이지 프로젝트에 복사되어 있다 (`backend/utils/`).  
코드 자체보다 **DB 마스터 데이터 마이그레이션이 핵심 작업**이다.

---

## 2. 이식 파일 현황

| 파일 | 위치 | 상태 | 수정 필요 여부 |
|------|------|------|-------------|
| `sales_logic.py` | `backend/utils/sales_logic.py` | ✅ 복사 완료 | 없음 — 순수 Python, 의존성 없음 |
| `design_logic.py` | `backend/utils/design_logic.py` | ✅ 복사 완료 | import 경로 수정 필요 (Phase 4 시작 시) |

---

## 3. DB 마이그레이션 상세

### 3-1. 마이그레이션 대상 테이블 목록

| # | ERP 테이블명 | 용도 | 우선순위 | 이식 방법 |
|---|------------|------|---------|---------|
| 1 | `socket_type` | 소켓 패밀리 목록 + 최대 IC 치수 (추천 로직 기준) | 🔴 필수 | pg_dump |
| 2 | `service_cost_logic` | 소켓별 기준가 + 수량 할인 규칙 + 가격 매트릭스 | 🔴 필수 | pg_dump |
| 3 | `ic_package_type` | IC 패키지 타입 목록 (BGA, QFN, WLP 등) | 🔴 필수 | pg_dump |
| 4 | `cover_type` | 소켓 커버 타입 (Clamshell, Bottle Cap) | 🔴 필수 | pg_dump |
| 5 | `pin_type` | 핀 타입 분류 | 🟡 권장 | pg_dump |
| 6 | `pin_master` | 핀 마스터 목록 | 🟡 권장 | pg_dump |
| 7 | `pin_mechanical_spec` | 핀 기계 규격 (Pitch, 길이 등) | 🟡 권장 | pg_dump |
| 8 | `suppliers` | 핀 공급사 정보 | 🟡 권장 | pg_dump |
| 9 | `pin_block_type` | 핀 블록 타입 | 🟢 선택 | pg_dump |

> 🔴 필수 = 소켓 추천·가 견적 계산에 직접 필요  
> 🟡 권장 = Probe Pin 추천 기능에 필요 (Phase 4)  
> 🟢 선택 = 향후 스펙 필터 확장 시 필요

---

### 3-2. 테이블별 컬럼 정의

#### `socket_type` — 소켓 패밀리 기준 테이블
```sql
CREATE TABLE socket_type (
    socket_type_id  SERIAL PRIMARY KEY,
    type_name       VARCHAR,          -- 예: "Tiny", "Mini", "Large 30"
    max_ic_width    FLOAT,            -- IC D 치수 최대값 (mm)
    max_ic_length   FLOAT             -- IC E 치수 최대값 (mm)
);
```
> `recommend_socket_type()` 함수가 이 테이블로 IC 치수 → 패밀리를 매핑한다.  
> **이 데이터가 없으면 소켓 자동 추천이 작동하지 않는다.**

---

#### `service_cost_logic` — 소켓 가격 테이블 ⭐ 가장 중요
```sql
CREATE TABLE service_cost_logic (
    logic_id            SERIAL PRIMARY KEY,
    socket_type_id      INTEGER REFERENCES socket_type(socket_type_id),
    cover_type_id       INTEGER REFERENCES cover_type(cover_type_id),
    pin_block_type_id   INTEGER REFERENCES pin_block_type(pin_block_type_id),
    base_price          INTEGER,       -- 기준가 (원, KRW)
    pin_adder_price     INTEGER,       -- 핀 수에 따른 추가 단가
    discount_rule       JSON,          -- 수량별 할인율 [{min, max, rate}]
    price_matrix        JSON           -- 매트릭스 단가 [{pin_max, qty_min, qty_max, total_price}]
);
```

**`discount_rule` JSON 구조 예시:**
```json
[
  {"min": 1,   "max": 9,   "rate": 0},
  {"min": 10,  "max": 49,  "rate": 5},
  {"min": 50,  "max": 99,  "rate": 10},
  {"min": 100, "max": 999, "rate": 15}
]
```

**`price_matrix` JSON 구조 예시:**
```json
[
  {"pin_max": 100, "qty_min": 1,  "qty_max": 9,   "total_price": 85000},
  {"pin_max": 100, "qty_min": 10, "qty_max": 49,  "total_price": 75000},
  {"pin_max": 200, "qty_min": 1,  "qty_max": 9,   "total_price": 105000}
]
```

> 홈페이지 가 견적 계산 흐름:  
> 1. 고객이 선택한 소켓 타입 + 커버 타입으로 `service_cost_logic` 조회  
> 2. 회원 등급 확인: 인증회원 → `base_price` 그대로, 일반회원 → `base_price × 1.3` 고정 단가  
> 3. 총액 = 적용 단가 × 수량 (인증회원만 `discount_rule` 수량 할인 적용, 일반회원은 수량 할인 없음)  
> 4. VAT 처리 (10% 별도)  
> ※ `price_matrix`는 1차 오픈 미사용

---

#### `ic_package_type` — IC 패키지 타입
```sql
CREATE TABLE ic_package_type (
    ic_package_type_id  SERIAL PRIMARY KEY,
    code                VARCHAR UNIQUE NOT NULL,  -- "WLP", "BGA", "QFN", "LGA" 등
    display_name        VARCHAR NOT NULL,          -- "WLP (Wafer Level Package)"
    display_order       INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE
);
```
> 위저드 1단계에서 고객이 IC 패키지 타입을 선택할 때 이 목록을 보여준다.

---

#### `cover_type` — 소켓 커버 타입
```sql
CREATE TABLE cover_type (
    cover_type_id  SERIAL PRIMARY KEY,
    type_name      VARCHAR   -- "Clamshell", "Bottle Cap"
);
```

---

#### `pin_block_type` — 핀 블록 타입
```sql
CREATE TABLE pin_block_type (
    pin_block_type_id  SERIAL PRIMARY KEY,
    type_name          VARCHAR    -- 핀 블록 타입명
);
```
> `service_cost_logic` 테이블이 이 테이블을 참조한다. 핀 블록 타입별로 기준가가 달라지는 소켓이 있을 경우 이 컬럼으로 구분한다.

---

#### `pin_type` — 핀 타입 분류
```sql
CREATE TABLE pin_type (
    pin_type_id  SERIAL PRIMARY KEY,
    type_name    VARCHAR,
    symbol       VARCHAR    -- 예: "G" (General), "S" (Special)
);
```

---

#### `pin_master` — 핀 마스터
```sql
CREATE TABLE pin_master (
    pin_id           SERIAL PRIMARY KEY,
    pin_name         VARCHAR,
    manufacturer_pn  VARCHAR,
    supplier_id      INTEGER REFERENCES suppliers(supplier_id),
    pin_type_id      INTEGER REFERENCES pin_type(pin_type_id),
    is_active        BOOLEAN DEFAULT TRUE,
    unit_price       INTEGER,
    min_order_qty    INTEGER
);
```

---

#### `pin_mechanical_spec` — 핀 기계 규격
```sql
CREATE TABLE pin_mechanical_spec (
    id                      SERIAL PRIMARY KEY,
    pin_id                  INTEGER REFERENCES pin_master(pin_id),
    pitch                   VARCHAR,        -- 예: "0.5mm", "1.27mm"
    recommended_stroke      FLOAT,
    top_plunger_length      FLOAT,
    barrel_length           FLOAT,
    bottom_plunger_length   FLOAT,
    spring_force            VARCHAR
);
```
> `recommend_pins()` 함수가 `pitch` 컬럼으로 IC Pitch ≥ Pin Pitch 조건 필터링을 한다.

---

#### `suppliers` — 공급사 (핀 추천에 필요한 컬럼만)
```sql
CREATE TABLE suppliers (
    supplier_id    SERIAL PRIMARY KEY,
    supplier_name  VARCHAR,
    is_active      BOOLEAN DEFAULT TRUE
    -- 나머지 ERP 전용 컬럼(사업자번호, 계좌 등)은 홈페이지 DB에 불필요
);
```
> **주의**: ERP `suppliers` 테이블에는 은행 계좌, 사업자번호 등 민감 정보가 있다.  
> pg_dump 후 홈페이지 DB에 적재 시 민감 컬럼은 제외하고 삽입한다 (아래 마이그레이션 명령어 참고).

---

### 3-3. 마이그레이션 실행 명령어

#### Step 1 — ERP DB에서 데이터 추출 (ERP 서버에서 실행)

```bash
# ERP DB 접속 정보 확인 후 실행 (.env 참조)
# 각 테이블을 INSERT 구문 형태로 추출

pg_dump \
  -h [ERP_DB_HOST] \
  -U [ERP_DB_USER] \
  -d [ERP_DB_NAME] \
  --data-only \
  --inserts \
  -t socket_type \
  -t ic_package_type \
  -t cover_type \
  -t pin_block_type \
  -t pin_type \
  -t service_cost_logic \
  > erp_master_data.sql
```

```bash
# pin_master, pin_mechanical_spec, suppliers (민감 컬럼 제외)
pg_dump \
  -h [ERP_DB_HOST] \
  -U [ERP_DB_USER] \
  -d [ERP_DB_NAME] \
  --data-only \
  --inserts \
  -t pin_master \
  -t pin_mechanical_spec \
  >> erp_master_data.sql
```

```bash
# suppliers — 민감 컬럼 제외하여 별도 추출
psql -h [ERP_DB_HOST] -U [ERP_DB_USER] -d [ERP_DB_NAME] -c \
  "COPY (SELECT supplier_id, supplier_name, is_active FROM suppliers) TO STDOUT WITH CSV HEADER" \
  > suppliers_safe.csv
```

---

#### Step 2 — 홈페이지 DB에 적재 (홈페이지 서버에서 실행)

```bash
# Alembic으로 테이블 먼저 생성 (Phase 4 ERP 마스터 마이그레이션 실행 후)
alembic upgrade head

# ERP 마스터 데이터 적재
psql -h localhost -U [HP_DB_USER] -d innovo_homepage -f erp_master_data.sql

# suppliers 적재 (CSV)
psql -h localhost -U [HP_DB_USER] -d innovo_homepage -c \
  "\COPY suppliers(supplier_id, supplier_name, is_active) FROM 'suppliers_safe.csv' CSV HEADER"
```

---

#### Step 3 — 적재 검증

```sql
-- 각 테이블 건수 확인
SELECT 'socket_type' AS tbl, COUNT(*) FROM socket_type
UNION ALL SELECT 'service_cost_logic', COUNT(*) FROM service_cost_logic
UNION ALL SELECT 'ic_package_type', COUNT(*) FROM ic_package_type
UNION ALL SELECT 'cover_type', COUNT(*) FROM cover_type
UNION ALL SELECT 'pin_master', COUNT(*) FROM pin_master
UNION ALL SELECT 'pin_mechanical_spec', COUNT(*) FROM pin_mechanical_spec;

-- 소켓 추천 로직 동작 확인 (예: IC 10x10mm)
SELECT type_name, max_ic_width, max_ic_length
FROM socket_type
WHERE max_ic_width >= 10.0 AND max_ic_length >= 10.0
ORDER BY max_ic_width * max_ic_length ASC;
-- 기대 결과: Large 30, Large 36 등이 순서대로 나와야 함
```

---

## 4. 코드 연결 작업 (Phase 4 시작 시)

> Phase 3에서 SQLAlchemy·Alembic 부트스트랩 및 `users`·`quick_quote_inquiries` 등 기본 모델은 이미 존재한다. Phase 4에서 **ERP 마스터 테이블용 models 클래스**를 추가한다.

### 4-1. `design_logic.py` import 수정

현재 파일 상단:
```python
from backend import models  # TODO: homepage models.py 작성 후 유효
```

Phase 4에서 ERP 마스터 테이블용 `backend/models.py` 클래스 작성 완료 후 — 수정 없이 그대로 동작한다.  
(홈페이지 백엔드도 동일한 패키지 구조 `backend/` 사용)

---

### 4-2. 홈페이지 `backend/models.py`에 추가해야 할 클래스

아래 클래스들을 홈페이지 `models.py`에 정의해야 `design_logic.py`가 정상 동작한다.

```python
# backend/models.py 에 추가할 클래스 목록

class SocketType(Base):
    __tablename__ = "socket_type"
    socket_type_id = Column(Integer, primary_key=True)
    type_name      = Column(String)
    max_ic_width   = Column(Float)
    max_ic_length  = Column(Float)

class IcPackageType(Base):
    __tablename__ = "ic_package_type"
    ic_package_type_id = Column(Integer, primary_key=True)
    code               = Column(String, unique=True, nullable=False)
    display_name       = Column(String, nullable=False)
    display_order      = Column(Integer, default=0)
    is_active          = Column(Boolean, default=True)

class CoverType(Base):
    __tablename__ = "cover_type"
    cover_type_id = Column(Integer, primary_key=True)
    type_name     = Column(String)

class PinType(Base):
    __tablename__ = "pin_type"
    pin_type_id = Column(Integer, primary_key=True)
    type_name   = Column(String)
    symbol      = Column(String)

class Supplier(Base):
    __tablename__ = "suppliers"
    supplier_id   = Column(Integer, primary_key=True)
    supplier_name = Column(String)
    is_active     = Column(Boolean, default=True)

class PinMaster(Base):
    __tablename__ = "pin_master"
    pin_id       = Column(Integer, primary_key=True)
    pin_name     = Column(String)
    supplier_id  = Column(Integer, ForeignKey("suppliers.supplier_id"))
    pin_type_id  = Column(Integer, ForeignKey("pin_type.pin_type_id"))
    is_active    = Column(Boolean, default=True)
    pin_type     = relationship("PinType")
    mechanical_spec = relationship("PinMechanicalSpec", uselist=False, backref="pin")

class PinMechanicalSpec(Base):
    __tablename__ = "pin_mechanical_spec"
    id                    = Column(Integer, primary_key=True)
    pin_id                = Column(Integer, ForeignKey("pin_master.pin_id"))
    pitch                 = Column(String)
    top_plunger_length    = Column(Float)
    barrel_length         = Column(Float)
    bottom_plunger_length = Column(Float)

class PinBlockType(Base):
    __tablename__ = "pin_block_type"
    pin_block_type_id = Column(Integer, primary_key=True)
    type_name         = Column(String)

class ServiceCostLogic(Base):
    __tablename__ = "service_cost_logic"
    logic_id            = Column(Integer, primary_key=True)
    socket_type_id      = Column(Integer, ForeignKey("socket_type.socket_type_id"))
    cover_type_id       = Column(Integer, ForeignKey("cover_type.cover_type_id"), nullable=True)
    pin_block_type_id   = Column(Integer, ForeignKey("pin_block_type.pin_block_type_id"), nullable=True)  # SQL 스키마와 일치 필수
    base_price          = Column(Integer)
    pin_adder_price     = Column(Integer, nullable=True)
    discount_rule       = Column(JSON)
    price_matrix        = Column(JSON, nullable=True)
    socket_type         = relationship("SocketType")
    cover_type          = relationship("CoverType")
    pin_block_type      = relationship("PinBlockType")
```

---

## 5. 홈페이지 맞춤 수정 — 가 견적 계산 흐름

ERP와 홈페이지의 가격 정책이 다르므로, `sales_logic.py`를 호출하는 **상위 레이어**에서 아래 처리가 필요하다.

### 5-1. 홈페이지 가 견적 계산 흐름 (FastAPI 라우터)

```
[고객 입력]
  소켓 타입 ID + 커버 타입 ID + 수량
        ↓
[1단계: DB 조회]
  service_cost_logic 테이블에서 해당 소켓+커버 조합의
  base_price, discount_rule 조회
        ↓
[2단계: 회원 등급 확인 + 단가 결정]
  인증회원(registered) → base_price 그대로 사용 (discount_rule 수량 할인 적용 대상)
  일반회원(regular)    → base_price × 1.3 고정 단가 (수량 할인 없음)
        ↓
[3단계: sales_logic.py 호출]
  calculate_product_groups_amounts(
      product_groups=[{
          "category": "Test Socket",
          "set_quantity": 수량,
          "set_unit_price": (등급 적용된 단가),  # 1set 기준
          "set_linked": True
      }],
      # 인증회원: discount_rule 전달 / 일반회원: [] 전달 (수량 할인 없음)
      discount_policy=discount_rule if is_registered else [],
      vat_type="separate",
      currency="KRW"
  )
        ↓
[4단계: 결과 반환]
  {
    subtotal,        # 소계
    discount_amount, # 할인액
    supply_amount,   # 공급가
    vat_amount,      # VAT (10%)
    total_amount     # 최종 합계
  }
```

### 5-2. 비회원 보안 처리

```python
# FastAPI 라우터 예시 — 비회원 차단
@router.post("/{lang:en|ko}/quote/calculate")
async def calculate_quote(
    lang: str,
    request: QuoteRequest,
    current_user: User = Depends(get_current_user)  # JWT 필수
):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Login required")
    # 가격 데이터는 이 함수 안에서만 계산 후 반환 — API 응답에 raw base_price 포함 금지
```

> ⚠️ **라우트 정의 주의**: `/{lang}/` 패턴은 `/admin`, `/api/`, `/static/` 등 모든 경로를 `lang=admin`으로 잘못 포착할 수 있다.  
> 반드시 `{lang:en|ko}` 정규식 제약을 사용해야 한다 — FastAPI(Starlette)는 `{param:regex}` 형식을 지원한다.  
> 정규식 미적용 시 라우트 우선순위에 따라 `/admin` 접근이 견적 라우터에 먼저 걸릴 수 있으므로, 라우터 등록 순서와 함께 반드시 확인한다.

---

## 6. 테스트 체크리스트

Phase 4 개발 완료 후 아래 항목을 순서대로 검증한다.

### DB 데이터 검증
- [ ] `socket_type` 테이블에 12개 패밀리 데이터 존재 확인
- [ ] `service_cost_logic` 테이블에 소켓별 기준가 데이터 존재 확인
- [ ] `ic_package_type` 테이블에 BGA/QFN/WLP 등 패키지 타입 존재 확인

### 소켓 자동 추천 테스트
- [ ] IC D=5.0mm, E=5.0mm 입력 → Mini 또는 Expanded Mini 추천되는지 확인
- [ ] IC D=12.0mm, E=12.0mm 입력 → Large 30 추천되는지 확인
- [ ] IC D=30.0mm, E=30.0mm 입력 → Large 48 추천되는지 확인
- [ ] 범위 초과 IC 치수 입력 → 빈 결과 반환 (에러 아님) 확인

### 가 견적 계산 테스트
- [ ] 인증회원, 수량 10개 → 기준가 × 0.95 (5% 수량 할인 가정) + VAT 10% 계산 확인
- [ ] 일반회원, 수량 10개 → 기준가 × 1.3 고정 (수량 할인 없음) + VAT 10% 계산 확인
- [ ] 비회원 API 직접 호출 → 401 Unauthorized 반환 확인
- [ ] KRW 10원 절삭 규칙 적용 확인 (예: 85,003원 → 85,000원)

### 보안 테스트
- [ ] 비로그인 상태에서 `/en/quote/calculate` 호출 시 401 반환 확인
- [ ] API 응답에 `base_price` raw 값이 포함되지 않는지 확인

---

## 7. 주의사항 및 트러블슈팅

| 상황 | 원인 | 해결 방법 |
|------|------|---------|
| 소켓 추천 결과가 빈 배열 | `socket_type` 테이블에 데이터 없음 | ERP DB에서 pg_dump 재실행 |
| 가 견적 금액이 0 | `service_cost_logic`에 해당 조합 없음 | ERP DB 데이터 확인 후 누락 행 추가 |
| import 오류 (`models` 없음) | ERP 마스터용 `models` 클래스 미작성 | Phase 4 models 작성 완료 후 재시도 |
| `suppliers` 민감 정보 노출 | pg_dump 전체 테이블 복사 시 | 위 Step 1의 SELECT 방식으로 필요 컬럼만 추출 |
| ERP DB 접속 불가 | 네트워크/방화벽 문제 | ERP 개발자에게 DB 읽기 전용 접속 권한 요청 |

---

## 8. 작업 담당자 및 순서

| 순서 | 작업 | 담당 | 시점 |
|------|------|------|------|
| 1 | ERP DB 접속 정보 및 읽기 권한 확보 | ERP 개발자 | Phase 4 시작 전 |
| 2 | `erp_master_data.sql` 추출 | ERP 개발자 또는 개발자 | Phase 4 시작 시 |
| 3 | 홈페이지 `backend/models.py` — ERP 마스터 클래스 추가 | 개발자 | Phase 4 |
| 4 | Alembic 마이그레이션 생성 및 실행 (ERP 마스터 테이블) | 개발자 | Phase 4 |
| 5 | 홈페이지 DB에 마스터 데이터 적재 | 개발자 | Phase 4 |
| 6 | `design_logic.py` 연결 확인 및 테스트 | 개발자 | Phase 4 |
| 7 | 가 견적 계산 API 구현 (sales_logic 연결) | 개발자 | Phase 4 |
| 8 | 전체 테스트 체크리스트 실행 | 개발자 | Phase 4 완료 시 |
