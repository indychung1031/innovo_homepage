# 10 기획서: Test Socket 필터 — 레이아웃 시각 개선

**문서 버전**: v1.0  
**작성일**: 2026-06-05  
**작성자**: Claude (Builder)  
**상태**: 검토 대기

---

## 1. 배경

`/products/test-socket` 페이지의 필터는 기능적으로 완성되어 있으나, 현재 UI에 다음 문제가 있다.

| 문제 | 상세 |
|------|------|
| 필터 존재 자체를 모름 | 기본 숨김(collapsed) 상태 → 토글 버튼을 눌러야 나타남 |
| 활성 필터 상태 불명확 | 패널이 닫힌 상태에서 어떤 필터가 걸려 있는지 알 수 없음 |
| 선택 후 시각 피드백 없음 | 드롭다운·입력창 선택 시 일반 브라우저 기본 테두리만 표시 |
| 레이아웃 불균형 | Package Size X/Y 입력 2개가 다른 단일 드롭다운과 동일 컬럼 너비에 배치 |

---

## 2. 현재 상태

### 2-1. 관련 파일

| 파일 | 역할 |
|------|------|
| `frontend-react/src/components/products/TestSocketFilterPanel.tsx` | 필터 UI 컴포넌트 |
| `frontend-react/src/pages/products/ProductCategoryPage.tsx` | 페이지 — 토글 버튼 + 패널 렌더링 |
| `frontend-react/src/lib/products/filterUtils.ts` | 필터 상태 타입 및 로직 (변경 없음) |
| `frontend/content/i18n/products.en.json` | 필터 i18n 키 (변경 없음) |
| `frontend/content/i18n/products.ko.json` | 필터 i18n 키 (변경 없음) |

### 2-2. 현재 구조 요약

```
[ProductCategoryPage — 헤더 섹션]
  <h1>제목</h1>  +  [토글 버튼: "조건 검색 / Search & Filter"]
                                                          ↑ 클릭 시만 패널 표시

[ProductCategoryPage — 제품 그리드 섹션]
  filterOpen === true 이면 ↓
  <TestSocketFilterPanel>
    [bg-white rounded-lg p-5 shadow-sm]
    grid 4열: Test Type | IC Type | Package Size X/Y | Cover Type
    [Reset 버튼]
  </TestSocketFilterPanel>
```

### 2-3. 브랜드 컬러 (index.css)

| 변수 | 값 |
|------|-----|
| `--color-navy` | `#26337d` |
| `--color-sky` | `#1c93d2` |
| `--color-gray-light` | `#c7ced7` |
| `--color-gray-mid` | `#8e959c` |
| `--color-charcoal` | `#3a3a3a` |

---

## 3. 개선 옵션

### 옵션 A — 항상 표시되는 필터 바 (Always-Visible Bar)

**개념**: 토글 버튼을 없애고, 제품 그리드 위에 필터가 항상 보이도록 변경.

```
┌─────────────────────────────────────────────────────────────────┐
│  TEST TYPE        IC TYPE         PACKAGE SIZE       COVER TYPE │
│  [All ▾]          [All ▾]          X [___] × Y [___] mm  [All ▾]│
│                                               [✕ Reset]         │
└─────────────────────────────────────────────────────────────────┘
```

- 필터 선택 시: 해당 컨트롤 테두리 `border-sky`, 배경 `sky/5` 로 강조
- Reset 버튼: 필터 활성 시에만 나타남 (`isFiltersActive` 조건)
- 모바일(sm 이하): 2열 × 2행 → Package Size 행은 전체 너비

**장점**: 필터 항상 노출, 직관적, 추가 상태 관리 불필요  
**단점**: 제품 위에 필터 공간 고정 점유 (스크롤 없이 제품 바로 볼 수 없음)

---

### 옵션 B — 개선된 접이식 패널 (Enhanced Collapsible Panel) ← **권장**

**개념**: 현재 토글 방식을 유지하되, 다음 3가지를 개선.

#### B-1. 토글 버튼 — 활성 필터 개수 뱃지

```
[필터 조건 활성 없음]   →   [조건 검색]       (기존과 동일)
[필터 1개 이상 활성]    →   [조건 검색 · 2]   (뱃지 추가)
[패널 열림]            →   [✕ 조건 검색]     (기존과 동일)
```

뱃지 스타일: 버튼 내 `<span>· {count}</span>` — sky 색상으로 표시

#### B-2. 패널 열림/닫힘 — 슬라이드 애니메이션

```css
/* 현재: 조건부 렌더링 (갑자기 나타남/사라짐) */
{filterOpen && <TestSocketFilterPanel ... />}

/* 개선: 항상 렌더링 + CSS transition으로 슬라이드 */
<div className={`overflow-hidden transition-all duration-200 ${filterOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
  <TestSocketFilterPanel ... />
</div>
```

#### B-3. 필터 패널 내부 — 활성 상태 강조

선택된 드롭다운·입력창에 강조 테두리 적용:

```
비활성: border-gray-light  (현재와 동일)
활성:   border-sky + ring-1 ring-sky/30 + bg-sky/5
```

#### B-4. 패널 닫힘 상태에서 활성 필터 요약 표시

```
[토글 버튼: 조건 검색 · 2]
[활성 필터 칩: Test Type: Manual only  ✕  |  Cover Type: Clamshell  ✕]
```

칩 스타일: `bg-sky/10 text-sky border border-sky/30 rounded-full px-3 py-1 text-xs`  
칩의 ✕ 클릭 시 해당 필터만 개별 해제

**장점**: 기존 UX 패턴 유지, 필터 활성화 여부가 항상 명확히 보임, 애니메이션으로 부드러운 전환  
**단점**: 구현 요소가 옵션 A보다 다소 많음

---

## 4. 권장 방향: 옵션 B (Enhanced Collapsible Panel)

**선택 이유**:

1. **기존 UX 패턴 유지**: 현재 토글 방식에 익숙한 사용자 혼란 없음
2. **필터 상태 가시성**: 패널 닫힘 상태에서도 활성 필터를 칩으로 표시
3. **B2B 하드웨어 사이트 적합**: 제품 목록이 첫 화면에 충분히 노출됨 (옵션 A는 공간 점유)
4. **점진적 개선**: 기존 filterUtils.ts / FilterState 로직 변경 없음

---

## 5. 구현 명세 (옵션 B 기준)

### 5-1. ProductCategoryPage.tsx 변경

#### 변경 1: 토글 버튼 — 뱃지 추가

```tsx
// 현재
{filterOpen ? '✕ ' : ''}{t('products:category.filter_toggle')}

// 변경 후
{filterOpen ? '✕ ' : ''}
{t('products:category.filter_toggle')}
{!filterOpen && activeCount > 0 && (
  <span className="ml-1.5 font-normal text-sky">· {activeCount}</span>
)}
```

`activeCount` 계산:

```tsx
const activeCount = [
  filters.testType !== '',
  filters.icType !== '',
  filters.packageSizeX !== '',
  filters.packageSizeY !== '',
  filters.coverType !== '',
].filter(Boolean).length;
```

#### 변경 2: 패널 슬라이드 애니메이션

```tsx
// 현재
{isTestSocket && filterOpen && (
  <TestSocketFilterPanel ... />
)}

// 변경 후
{isTestSocket && (
  <div
    className={`overflow-hidden transition-all duration-200 ease-in-out ${
      filterOpen ? 'max-h-[400px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'
    }`}
  >
    <TestSocketFilterPanel ... />
  </div>
)}
```

#### 변경 3: 활성 필터 칩 표시 (패널 닫힌 상태)

토글 버튼 아래에 활성 필터 칩 렌더링. 위치는 헤더 섹션 하단, 배경 `bg-sky/5 border-t border-sky/20` 영역.

```tsx
{isTestSocket && !filterOpen && activeCount > 0 && (
  <div className="border-t border-sky/20 bg-sky/5 py-2">
    <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4">
      {filters.testType !== '' && (
        <FilterChip
          label={`${t('products:category.filter_test_type')}: ${t(`products:category.${filters.testType}`)}`}
          onRemove={() => setFilters({ ...filters, testType: '' })}
        />
      )}
      {filters.icType !== '' && (
        <FilterChip
          label={`${t('products:category.filter_ic_type')}: ${filters.icType}`}
          onRemove={() => setFilters({ ...filters, icType: '' })}
        />
      )}
      {filters.packageSizeX !== '' && (
        <FilterChip
          label={`X ≥ ${filters.packageSizeX} mm`}
          onRemove={() => setFilters({ ...filters, packageSizeX: '' })}
        />
      )}
      {filters.packageSizeY !== '' && (
        <FilterChip
          label={`Y ≥ ${filters.packageSizeY} mm`}
          onRemove={() => setFilters({ ...filters, packageSizeY: '' })}
        />
      )}
      {filters.coverType !== '' && (
        <FilterChip
          label={`${t('products:category.filter_cover_type')}: ${filters.coverType}`}
          onRemove={() => setFilters({ ...filters, coverType: '' })}
        />
      )}
    </div>
  </div>
)}
```

#### FilterChip 컴포넌트 (ProductCategoryPage.tsx 내부 선언 또는 별도 파일)

```tsx
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/10 px-3 py-1 text-xs text-sky">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-navy" aria-label="Remove filter">
        ✕
      </button>
    </span>
  );
}
```

---

### 5-2. TestSocketFilterPanel.tsx 변경

#### 변경 1: 활성 컨트롤 강조 클래스

공통 헬퍼 함수 선언:

```tsx
function selectClass(active: boolean) {
  return `rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky transition-colors ${
    active
      ? 'border-sky bg-sky/5 ring-1 ring-sky/30'
      : 'border-gray-light'
  }`;
}

function inputClass(active: boolean) {
  return `w-full rounded border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky transition-colors ${
    active
      ? 'border-sky bg-sky/5 ring-1 ring-sky/30'
      : 'border-gray-light'
  }`;
}
```

각 드롭다운·입력창의 `className` 을 위 함수로 교체:

| 컨트롤 | `active` 조건 |
|--------|--------------|
| Test Type select | `filters.testType !== ''` |
| IC Type select | `filters.icType !== ''` |
| Package Size X input | `filters.packageSizeX !== ''` |
| Package Size Y input | `filters.packageSizeY !== ''` |
| Cover Type select | `filters.coverType !== ''` |

#### 변경 2: Package Size 컬럼 — 레이블 개선

현재 레이블 "PACKAGE SIZE" → "PACKAGE SIZE (mm)" 으로 변경하여 단위 명시.  
(i18n은 기존 `filter_package_size` 키 사용, 값에 "(mm)" 이미 포함되어 있음)

#### 변경 3: Reset 버튼 — 조건부 표시 + 스타일 강화

현재: 항상 표시, 밋밋한 테두리 버튼  
변경: 활성 필터 있을 때만 표시, sky 강조 색상

```tsx
// 현재
<button type="button" onClick={onReset} className="...">
  {t('category.filter_reset')}
</button>

// 변경 후 — isActive prop 추가 또는 isFiltersActive(filters) 직접 호출
{isFiltersActive(filters) && (
  <button
    type="button"
    onClick={onReset}
    className="rounded border border-sky px-4 py-1.5 text-sm text-sky transition hover:bg-sky hover:text-white"
  >
    {t('category.filter_reset')}
  </button>
)}
```

---

## 6. 변경 대상 파일 요약

| 파일 | 변경 유형 | 변경 내용 |
|------|-----------|----------|
| `frontend-react/src/pages/products/ProductCategoryPage.tsx` | 수정 | 뱃지, 슬라이드 애니메이션, 활성 필터 칩 |
| `frontend-react/src/components/products/TestSocketFilterPanel.tsx` | 수정 | 활성 상태 강조 클래스, Reset 조건부 표시 |

변경 없음: `filterUtils.ts`, `i18n/*.json`, `types.ts`

---

## 7. 구현 순서

1. **STEP 1** — `TestSocketFilterPanel.tsx`: `selectClass` / `inputClass` 헬퍼 추가, 활성 강조 적용, Reset 조건부 표시
2. **STEP 2** — `ProductCategoryPage.tsx`: `activeCount` 계산, 토글 버튼 뱃지, 슬라이드 애니메이션
3. **STEP 3** — `ProductCategoryPage.tsx`: `FilterChip` 컴포넌트 + 활성 필터 칩 영역
4. **STEP 4** — 로컬 `npm run dev` 에서 시각 확인

---

## 8. 미결 사항 (구현 전 확인 필요)

| # | 항목 | 내용 |
|---|------|------|
| Q1 | FilterChip 위치 | 헤더 섹션 하단(흰 배경) vs 제품 그리드 섹션 상단(slate-50 배경) — 어느 쪽이 자연스러운지 시각 확인 필요 |
| Q2 | 슬라이드 애니메이션 | `max-h-[400px]` 고정값 사용 — 패널 실제 높이 측정 후 값 조정 필요 |

---

## 9. 자체 검토

- [x] 변경 파일 2개만 — 범위 최소화
- [x] filterUtils.ts / FilterState 타입 변경 없음 — 로직 회귀 없음
- [x] 브랜드 컬러 (#1c93d2 sky, #26337d navy) 기반 디자인
- [x] 구현 순서 명시
- [x] 미결 사항 2건 식별

---

*기획서 승인 후 코드 수정 진행*
