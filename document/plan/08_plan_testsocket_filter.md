# 08 기획서: Test Socket 페이지 — 제품 그룹핑 + 필터/검색 기능

**문서 버전**: v1.2  
**작성일**: 2026-05-31 / 수정: 2026-06-03  
**작성자**: Claude (Builder)  
**상태**: 검토 대기

---

## 1. 배경 및 목적

현재 `/products/test-socket` 페이지는 31개의 제품군(Family)이 **분류 없이 나열**되어 있어 원하는 제품을 찾기 어렵다. 다음 3가지 개선을 동시에 진행한다.

1. **mode 변경 (사용자 요청)**: Pedestal·Pedestal EMMI의 `mode` 값을 `both` → `manual_only`로 변경
2. **섹션 그룹핑**: `mode` 필드 기준으로 3개 섹션 헤더로 시각적 구분
3. **필터/검색 패널**: 버튼 클릭으로 활성화되는 접이식(collapsed) 필터 UI 추가

---

## 2. 현재 상태 파악

### 2-1. 관련 파일

| 파일 | 역할 |
|------|------|
| `frontend/content/products/test_socket.json` | 제품 데이터 (31개 family) |
| `frontend-react/src/pages/products/ProductCategoryPage.tsx` | 카테고리 페이지 — flat grid 렌더링 |
| `frontend-react/src/components/products/FamilyCard.tsx` | 개별 제품 카드 컴포넌트 |
| `frontend-react/src/lib/products/types.ts` | 타입 정의 (`ProductFamily`, `FamilyMode`) |

> **`mode` 필드**: `types.ts`에 `mode?: FamilyMode` (optional)로 정의되어 있으나,
> 실데이터 확인 결과 **31개 전 family에 mode 필드 존재** — 누락 케이스 없음.

### 2-2. 현재 렌더링 구조

```
ProductCategoryPage
└── catalog.families.map(family => <FamilyCard />)   ← 단순 flat 그리드, 분류 없음
```

### 2-3. 현재 mode별 제품 분포 (수정 전)

| mode | 제품군 수 | 대표 제품 |
|------|-----------|-----------|
| `manual_only` | 10 | Tiny, Mini, Mini(BottleCap), Mini(HEA), Mini(Opentop), ExMini, ExMini(BottleCap), ExMini(HEA), ExMini(Opentop), Multi Array |
| `both` | 12 | ExMini with Handle, ExMini(BottleCap) with Handle, Large30C/B, Large36C/B, Large42C/B, Large48C/B, **Pedestal**, **Pedestal EMMI** 외 |
| `handler_only` | 9 | Large30CH/BH, Large36CH/BH, Large42CH/BH, Large48CH/BH, WLCSP |

### 2-4. 수정 후 mode별 분포

| mode | 제품군 수 |
|------|-----------|
| `manual_only` | **12** (Pedestal, Pedestal EMMI 추가) |
| `both` | **10** |
| `handler_only` | 9 (변동 없음) |

### 2-5. 실데이터 확인 결과 (JSON grep 기준)

**`max_package` 고유 값 목록**:

| 값 | 제품 수 | 비고 |
|----|---------|------|
| `"3.0×3.0 mm"` | 1 | |
| `"6.3×6.3 mm"` | 5 | |
| `"10.3×10.3 mm"` | 6 | |
| `"11.0×11.0 mm"` | 4 | |
| `"17.0×17.0 mm"` | 4 | |
| `"23.0×23.0 mm"` | 4 | |
| `"29.0×29.0 mm"` | 4 | |
| `"All IC sizes"` | 2 | Pedestal 계열 |
| `"TBD"` | 2 | Pedestal EMMI 계열 |

> 포맷 특성: 모두 `"X.X×X.X mm"` 대칭형. 비대칭 패키지 없음. 구분자는 유니코드 `×` (U+00D7) 고정.

**`cover_type` 고유 값 목록** (specs 내부):

| 값 | 비고 |
|----|------|
| `"Clamshell"` | 다수 |
| `"Clamshell + Handle"` | Handle 부착형 |
| `"Bottle Cap"` | 다수 |
| `"Bottle Cap + Handle"` | Handle 부착형 |
| `"Bolt joint"` | Mini(HEA), ExMini(HEA) |
| `"Open Top"` | WLCSP |
| `null` | Pedestal, Pedestal EMMI (specs null) |

---

## 3. 변경 사항 명세

### 3-1. 데이터 수정 (test_socket.json)

**변경 대상**: Pedestal, Pedestal EMMI family의 `mode` 필드

```json
// 변경 전
{ "mode": "both" }

// 변경 후
{ "mode": "manual_only" }
```

정확한 id 값은 구현 시 JSON에서 직접 확인 후 적용.

---

### 3-2. 섹션 그룹핑 UI

`ProductCategoryPage.tsx`에서 test-socket 카테고리에만 그룹핑을 적용한다.  
(다른 카테고리 probe-pin, test-jig는 기존 flat grid 유지)

#### 섹션 순서 및 헤더 레이블

| 순서 | mode | 영어 헤더 | 한국어 헤더 |
|------|------|-----------|------------|
| 1 | `manual_only` | Manual Only | Manual 전용 |
| 2 | `both` | Manual + Handler | Manual + Handler |
| 3 | `handler_only` | Handler Only | Handler 전용 |

#### 레이아웃

```
[섹션 헤더 — 구분선 포함]
[제품 카드 grid (sm:2열 / lg:3열)]

[섹션 헤더]
[제품 카드 grid]

[섹션 헤더]
[제품 카드 grid]
```

- 헤더 스타일: `text-xl font-bold text-navy`, 하단 `border-b border-gray-light mb-6 pb-2`
- 섹션 간 간격: `mb-14`
- 필터 적용 후 해당 섹션에 결과가 0개이면 섹션 헤더도 숨김

---

### 3-3. 필터/검색 패널

#### 활성화 방식

- 기본 상태: **숨김(collapsed)**
- 페이지 상단 헤더 영역 우측에 "Filter / 필터" 토글 버튼 배치
- 클릭 시 필터 패널이 펼쳐짐, 재클릭 시 닫힘

#### 필터 조건 (4종)

| 번호 | 필터명 | 타입 | 동작 |
|------|--------|------|------|
| F1 | Test Type | 드롭다운 (단일 선택) | `mode` 필드와 매칭 |
| F2 | Package Size | 숫자 입력 (mm) | `max_package` 파싱 후 비교 |
| F3 | Cover Type | 드롭다운 (단일 선택) | `specs.cover_type` 포함 여부 매칭 |
| F4 | 제품명 검색 | 텍스트 입력 | `family.name` 부분 일치(대소문자 무시) |

---

#### F1. Test Type 필터 상세

**드롭다운 옵션**:

| 값 | 표시 (EN) | 표시 (KO) |
|----|-----------|-----------|
| `""` (기본) | All types | 전체 |
| `manual_only` | Manual only | Manual 전용 |
| `both` | Manual + Handler | Manual + Handler |
| `handler_only` | Handler only | Handler 전용 |

**동작**: 선택된 값과 `family.mode`가 일치하는 제품만 표시. `""` 선택 시 전체 표시.

> 섹션 그룹핑과 연동: Test Type 필터 선택 시 해당 mode 섹션만 표시되고 나머지 섹션은 숨김.

---

#### F2. Package Size 필터 상세

**입력**: 숫자 하나 (예: `5.0`) — 단위 mm, UI에 "mm" 라벨 표시

**파싱 규칙** (실데이터 기반 — 대칭형 `"X×X mm"` 포맷만 존재):

| `max_package` 값 | 파싱 결과 | 처리 |
|------------------|-----------|------|
| `"6.3×6.3 mm"` | 6.3 | 숫자 비교 대상 |
| `"All IC sizes"` | `Infinity` | 항상 통과 |
| `"TBD"` | `null` | **Q5 참조** |
| `null` | `null` | **Q5 참조** |

**파싱 함수 동작**: `×` 기준으로 양쪽 숫자를 모두 추출한 뒤 **더 큰 값** 기준으로 비교

```typescript
// "6.3×6.3 mm" → max(6.3, 6.3) = 6.3
// "10.0×14.0 mm" (향후 비대칭) → max(10.0, 14.0) = 14.0
const parts = raw.split('×').map(s => parseFloat(s));
const size = Math.max(...parts);
```

> **추천 이유 (Q1 확정)**: 현재 실데이터는 대칭형만 존재하므로 결과는 동일하나,
> 향후 비대칭 패키지 추가 시 재수정 없이 동작하도록 선제적으로 적용.

**비교 로직**:  
사용자가 `N` mm를 입력하면 → `parsedValue >= N` 인 제품 표시  
(의미: "내 칩이 N mm인데 수용 가능한 소켓 찾기")

---

#### F3. Cover Type 필터 상세

**실데이터 기반 드롭다운 옵션**:

| 값 | 표시 | 매칭 조건 |
|----|------|-----------|
| `""` (기본) | All / 전체 | — |
| `clamshell` | Clamshell | `cover_type === "Clamshell"` |
| `bottle_cap` | Bottle Cap | `cover_type === "Bottle Cap"` |
| `handle` | Handle | `cover_type` contains `"+ Handle"` (Clamshell + Handle, Bottle Cap + Handle 모두) |
| `bolt_joint` | Bolt Joint | `cover_type === "Bolt joint"` |
| `open_top` | Open Top | `cover_type === "Open Top"` |

**매칭 방식**:
- `clamshell` / `bottle_cap` / `bolt_joint` / `open_top` → 완전 일치
- `handle` → `cover_type.includes("+ Handle")` (핸들 부착형 전체)

**`cover_type`이 null인 제품**: **Q5 참조**

---

#### F4. 제품명 검색 상세

- 입력창 placeholder: `"Search by name..."` / `"제품명 검색..."`
- `family.name.toLowerCase().includes(query.toLowerCase())` 방식
- 글자 입력 즉시 실시간 필터링 (클라이언트 데이터이므로 debounce 불필요)

---

#### 복합 필터 동작

모든 활성 조건을 **AND** 로 적용한다.  
(예: Test Type = Manual only + Package Size = 5.0 → 두 조건 모두 만족하는 제품만 표시)

**필터 초기화**: "초기화 / Reset" 버튼으로 전체 조건 한 번에 리셋

---

#### 데이터 미정 제품 처리 (null / TBD)

`cover_type: null` 또는 `max_package: "TBD"` 인 제품 (현재: Pedestal EMMI 등):

- **기본 상태**: 필터 패널 닫힘 → 전체 제품과 함께 정상 표시
- **필터 활성 상태**: 해당 필터 조건 적용 시 결과에서 **제외**
- **"전체보기" 버튼**: 필터 패널 하단에 배치. 클릭 시 null/TBD 제품을 포함하여 전체 표시

> "전체보기" 버튼은 필터 패널이 열린 상태에서만 표시. 클릭 시 다른 필터 조건은 유지하되 null/TBD 제품을 강제 포함.

---

#### 필터 결과 0건 처리

모든 섹션에 결과가 없으면 섹션 헤더 없이 중앙에:
```
제품을 찾을 수 없습니다. 조건을 변경해 보세요.
No products found. Try adjusting your filters.
```
`text-gray-mid text-center py-12` 스타일로 표시

---

## 4. 구현 대상 파일

| 파일 | 변경 유형 | 변경 내용 요약 |
|------|-----------|---------------|
| `frontend/content/products/test_socket.json` | **데이터 수정** | Pedestal, Pedestal EMMI의 `mode`: `"both"` → `"manual_only"` |
| `frontend-react/src/pages/products/ProductCategoryPage.tsx` | **수정** | test-socket 전용 그룹핑 분기 + 필터 패널 연결 |
| `frontend-react/src/components/products/TestSocketFilterPanel.tsx` | **신규 생성** | 필터 UI 컴포넌트 (4종 필터 + 초기화) |
| `frontend-react/src/lib/products/filterUtils.ts` | **신규 생성** | 패키지 사이즈 파싱, 필터 적용 순수 함수 |
| `frontend/content/i18n/products.en.json` | **수정** | 필터·섹션 i18n 키 추가 |
| `frontend/content/i18n/products.ko.json` | **수정** | 필터·섹션 i18n 키 추가 |

> `FamilyCard.tsx`와 `types.ts`는 수정하지 않는다.

---

## 5. 컴포넌트 설계

### 5-1. TestSocketFilterPanel.tsx

```typescript
type CoverTypeFilter = 'clamshell' | 'bottle_cap' | 'handle' | 'bolt_joint' | 'open_top' | '';

type FilterState = {
  testType: FamilyMode | '';
  packageSizeMm: number | '';
  coverType: CoverTypeFilter;
  nameQuery: string;
  showUndefined: boolean; // true = "전체보기" — null/TBD 제품 강제 포함
};

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};
```

### 5-2. filterUtils.ts

```typescript
parseMaxPackage(raw: string | null): number | null
  // "6.3×6.3 mm" → 6.3  (× 앞 숫자)
  // "All IC sizes" → Infinity
  // "TBD" | null → null (Q5에 따라 처리 분기)

applyFilters(families: ProductFamily[], filters: FilterState): ProductFamily[]
  // AND 조건으로 4종 필터 순차 적용

groupByMode(families: ProductFamily[]): Record<FamilyMode, ProductFamily[]>
  // { manual_only: [...], both: [...], handler_only: [...] }
```

### 5-3. ProductCategoryPage.tsx 분기 로직

```tsx
const isTestSocket = categorySlug === 'test-socket';

if (isTestSocket) {
  // <TestSocketFilterPanel> + 그룹핑 섹션 렌더링
} else {
  // 기존 flat grid 렌더링 (변경 없음)
}
```

---

## 6. i18n 추가 키

`frontend/content/i18n/products.en.json` (`category` 하위 추가):

```json
"filter_toggle": "Filter",
"filter_reset": "Reset",
"filter_test_type": "Test Type",
"filter_package_size": "Package Size (mm)",
"filter_cover_type": "Cover Type",
"filter_name": "Search by name",
"filter_all": "All",
"filter_no_results": "No products found. Try adjusting your filters.",
"section_manual_only": "Manual Only",
"section_both": "Manual + Handler",
"section_handler_only": "Handler Only"
```

`frontend/content/i18n/products.ko.json` (`category` 하위 추가):

```json
"filter_toggle": "필터",
"filter_reset": "초기화",
"filter_test_type": "테스트 타입",
"filter_package_size": "패키지 사이즈 (mm)",
"filter_cover_type": "커버 타입",
"filter_name": "제품명 검색",
"filter_all": "전체",
"filter_no_results": "제품을 찾을 수 없습니다. 조건을 변경해 보세요.",
"section_manual_only": "Manual 전용",
"section_both": "Manual + Handler",
"section_handler_only": "Handler 전용"
```

---

## 7. 구현 순서

1. **STEP 1** — `test_socket.json`: Pedestal, Pedestal EMMI `mode` 변경
2. **STEP 2** — `filterUtils.ts`: 순수 함수 구현 (parseMaxPackage, applyFilters, groupByMode)
3. **STEP 3** — `TestSocketFilterPanel.tsx`: 필터 UI 컴포넌트 구현
4. **STEP 4** — `ProductCategoryPage.tsx`: 분기·그룹핑·필터 패널 연결
5. **STEP 5** — i18n 키 추가 (en/ko)
6. **STEP 6** — 로컬 빌드 확인 후 사용자 요청 시 S3 배포

---

## 8. 확정 사항 (전체 완료)

| # | 항목 | 확정 내용 |
|---|------|-----------|
| Q1 | Package Size 필터 — 비대칭 패키지 | ✅ **양쪽 값 추출 후 더 큰 값 기준** 비교. 현재 대칭형 데이터에서 동일 동작, 향후 비대칭 제품 추가 시 재수정 불필요 |
| Q2 | 필터 상태를 URL 파라미터로 유지 | ✅ **미구현 확정**. 이유: 클라이언트 사이드 31개 소규모 데이터, 링크 공유 필요성 낮음, 구현 복잡도 대비 효과 미미. 향후 요청 시 추가 |
| Q3 | 모바일 필터 패널 UI | ✅ **전체 너비 세로 배치 확정**. 필터 4개 항목은 모바일에서도 스크롤 없이 표현 가능. Bottom sheet / Modal 전환은 과도한 복잡도로 판단 |
| Q4 | Cover Type 필터 — Handle 처리 방식 | ✅ Handle을 별도 옵션으로 추가 (5개 옵션) |
| Q5 | `cover_type: null` 및 `max_package: "TBD"` 제품의 필터 동작 | ✅ 필터 활성 시 제외, "전체보기" 버튼 클릭 시에만 표시 |

---

## 9. 자체 검토 (이 문서만 보고 바로 개발 가능한가)

- [x] 변경할 파일 목록 명시됨
- [x] 데이터 변경 내용 (JSON id 제외, 구현 시 확인) 명시됨
- [x] 필터 4종 각각 동작 로직 명시됨
- [x] 패키지 사이즈 파싱 규칙 실데이터 기반 확정 (비대칭 대비 max값 기준)
- [x] cover_type 실데이터 기반 옵션 확정 (Bolt joint 포함)
- [x] 컴포넌트 Props/타입 설계 명시됨
- [x] i18n 키 명시됨
- [x] 구현 순서 명시됨
- [x] Q1 확정: 비대칭 대비 max값 기준 파싱
- [x] Q2 확정: URL 파라미터 미구현
- [x] Q3 확정: 모바일 전체 너비 세로 배치
- [x] Q4 확정: Handle 별도 옵션 (5개)
- [x] Q5 확정: null/TBD 필터 제외 + "전체보기" 버튼

---

*기획서 승인 후 코드 수정 진행*
