# ERP 팀 작업 지시서 — 홈페이지 연동

**프로젝트**: socket_auto_design
**요청 시스템**: Innovo 홈페이지 (www.innovosolution.co.kr)
**목적**: 홈페이지 Quick Quote 접수 데이터를 ERP Sales 대시보드로 전달

---

## 작업 목록

### ① homepage_inquiries 테이블 생성 (Alembic revision) — ✅ ERP 구현 완료

```sql
CREATE TABLE homepage_inquiries (
    id                SERIAL        PRIMARY KEY,
    ic_package_type   VARCHAR(20)   NOT NULL,
    ic_code           VARCHAR(100),
    pin_count         INTEGER       NOT NULL,
    pitch             VARCHAR(10)   NOT NULL,
    package_d         NUMERIC(8,3)  NOT NULL,
    package_e         NUMERIC(8,3)  NOT NULL,
    package_a         NUMERIC(8,3),
    company_name      VARCHAR(100)  NOT NULL,
    contact_name      VARCHAR(50)   NOT NULL,
    contact_email     VARCHAR(254)  NOT NULL,
    contact_phone     VARCHAR(30),
    quantity          INTEGER,
    desired_delivery  DATE,
    message           TEXT,
    source            VARCHAR(20)   NOT NULL DEFAULT 'homepage',
    status            VARCHAR(20)   NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

---

### ② 외부 API 엔드포인트 신설 — ✅ ERP 구현 완료

```
POST /api/external/inquiry
인증: X-API-Key 헤더
```

**Request Body**
```json
{
  "ic_package_type_code": "BGA",
  "ic_code": "STM32F103C8T6",
  "pin_count": 100,
  "pitch": "0.5mm",
  "package_d": 10.00,
  "package_e": 10.00,
  "package_a": 1.20,
  "company_name": "테스트 반도체",
  "contact_name": "홍길동",
  "contact_email": "hong@test.com",
  "contact_phone": "010-1234-5678",
  "quantity": 500,
  "desired_delivery": "2026-07-01",
  "message": "샘플 우선 요청",
  "source": "homepage"
}
```

ic_package_type_code 허용값: WLP / BGA / QFN / DFN / SOP / QFP / LGA / ETC
선택 필드: ic_code, package_a, contact_phone, quantity, desired_delivery, message

**Response 201**
```json
{
  "inquiry_id": 15,
  "status": "pending"
}
```

---

### ③ Sales 대시보드 — [홈페이지 접수] 탭 추가 — ⏳ ERP 작업 예정

- homepage_inquiries 목록 표시 (최신순)
- 미처리(status = 'pending') 건 수 배지 표시
- 표시 컬럼: 접수일 / 패키지 타입 / 핀 수 / 피치 / 회사명 / 담당자 / 상태

---

### ④ 접수 상세 화면 + [견적서 작성] 버튼 — ⏳ ERP 작업 예정

- 상세 화면: 접수된 IC 규격 + 고객 정보 전체 표시
- [견적서 작성] 클릭 시 → 기존 견적 작성 폼으로 이동, 아래 필드 pre-fill:
  - ic_package_type, ic_code, pin_count, pitch, package_d, package_e, package_a
- 견적서 작성 완료 시 → homepage_inquiries.status = 'processed' 로 업데이트

---

### ⑤ CORS 허용 목록 추가 — ✅ ERP 구현 완료

아래 도메인은 이미 ERP CORS 허용 목록에 포함되어 있습니다.

https://www.innovosolution.co.kr

---

## 홈페이지 측 요청사항 (회신 완료)

1. **API Key**: `.env`의 `ERP_API_KEY` 참조
2. **ERP 서버 Base URL**: `http://54.116.87.172`
   - ~~http://3.35.214.138~~ (구 동적 IP — 사용 불가)
