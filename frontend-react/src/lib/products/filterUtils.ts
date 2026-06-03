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

/**
 * 4종 필터를 AND 조건으로 적용한다.
 * - 이름/Test Type: 모든 제품에 적용 (TBD 포함)
 * - Package Size/Cover Type: 데이터 미정(TBD/null) 제품은 해당 조건에서 제외.
 *   showUndefined=true이면 미정 제품을 강제 포함.
 */
export function applyFilters(families: ProductFamily[], filters: FilterState): ProductFamily[] {
  return families.filter((family) => {
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
    // 크기 미정(TBD) 제품은 비교 불가 → showUndefined=true이면 통과, false이면 제외
    if (filters.packageSizeMm !== '') {
      const parsed = parseMaxPackage(family.max_package);
      if (parsed === null) {
        if (!filters.showUndefined) return false;
      } else {
        if (parsed < filters.packageSizeMm) return false;
      }
    }

    // ── Cover Type ────────────────────────────────
    // specs=null 제품은 커버 타입 비교 불가 → showUndefined=true이면 통과, false이면 제외
    if (filters.coverType !== '') {
      const coverType = family.specs?.en?.cover_type ?? null;
      if (coverType === null) {
        if (!filters.showUndefined) return false;
      } else {
        if (!matchesCoverType(coverType, filters.coverType)) return false;
      }
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
