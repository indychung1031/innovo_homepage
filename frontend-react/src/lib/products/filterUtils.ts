import type { FamilyMode, ProductFamily } from './types';

export type CoverTypeFilter = 'clamshell' | 'bottle_cap' | 'handle' | 'bolt_joint' | 'open_top' | '';

export type FilterState = {
  testType: FamilyMode | '';
  packageSizeMm: number | '';
  coverType: CoverTypeFilter;
  nameQuery: string;
  showUndefined: boolean; // true = null/TBD 제품 강제 포함
};

export const DEFAULT_FILTERS: FilterState = {
  testType: '',
  packageSizeMm: '',
  coverType: '',
  nameQuery: '',
  showUndefined: false,
};

export function isFiltersActive(filters: FilterState): boolean {
  return (
    filters.testType !== '' ||
    filters.packageSizeMm !== '' ||
    filters.coverType !== '' ||
    filters.nameQuery.trim() !== ''
  );
}

/**
 * max_package 문자열에서 크기(mm)를 추출한다.
 * "6.3×6.3 mm" → 6.3, "10.0×14.0 mm" (비대칭) → 14.0 (더 큰 값)
 * "All IC sizes" → Infinity
 * "TBD" | null → null
 */
export function parseMaxPackage(raw: string | null): number | null {
  if (!raw) return null;
  if (raw === 'All IC sizes') return Infinity;
  if (raw === 'TBD') return null;

  const parts = raw.split('×').map((s) => parseFloat(s));
  const valid = parts.filter((n) => !isNaN(n));
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

function matchesCoverType(coverType: string | null, filter: CoverTypeFilter): boolean {
  if (!coverType) return false;
  switch (filter) {
    case 'clamshell':  return coverType === 'Clamshell';
    case 'bottle_cap': return coverType === 'Bottle Cap';
    case 'handle':     return coverType.includes('+ Handle');
    case 'bolt_joint': return coverType === 'Bolt joint';
    case 'open_top':   return coverType === 'Open Top';
    default:           return true;
  }
}

/** 4종 필터를 AND 조건으로 적용한다. null/TBD 제품은 필터 활성 시 제외(showUndefined가 true이면 강제 포함). */
export function applyFilters(families: ProductFamily[], filters: FilterState): ProductFamily[] {
  const active = isFiltersActive(filters);

  return families.filter((family) => {
    // ── null/TBD 제품 전역 제외 ──────────────────────────────
    // 필터가 하나라도 활성이면 max_package=TBD 또는 specs=null 제품을 제외한다.
    // showUndefined(전체보기)가 true이면 이 제외를 건너뛴다.
    if (active && !filters.showUndefined) {
      if (family.max_package === 'TBD' || family.specs === null) return false;
    }

    // ── 이름 검색 ────────────────────────────────
    if (filters.nameQuery.trim() !== '') {
      const q = filters.nameQuery.trim().toLowerCase();
      if (!family.name.toLowerCase().includes(q)) return false;
    }

    // ── Test Type ─────────────────────────────────
    if (filters.testType !== '') {
      if (family.mode !== filters.testType) return false;
    }

    // ── Package Size ──────────────────────────────
    if (filters.packageSizeMm !== '') {
      const parsed = parseMaxPackage(family.max_package);
      if (parsed === null) {
        // TBD/null은 전역 제외에서 이미 처리됨. showUndefined=true일 때만 여기 도달.
        // → 패키지 크기 비교 불가이므로 통과 처리.
      } else {
        if (parsed < filters.packageSizeMm) return false;
      }
    }

    // ── Cover Type ────────────────────────────────
    if (filters.coverType !== '') {
      const coverType = family.specs?.en?.cover_type ?? null;
      if (!matchesCoverType(coverType, filters.coverType)) return false;
    }

    return true;
  });
}

const MODE_ORDER: FamilyMode[] = ['manual_only', 'both', 'handler_only'];

/** mode 기준으로 제품을 3개 그룹으로 분류한다. */
export function groupByMode(families: ProductFamily[]): Record<FamilyMode, ProductFamily[]> {
  const result: Record<FamilyMode, ProductFamily[]> = {
    manual_only: [],
    both: [],
    handler_only: [],
  };
  for (const family of families) {
    if (family.mode) {
      result[family.mode].push(family);
    }
  }
  return result;
}

export { MODE_ORDER };
