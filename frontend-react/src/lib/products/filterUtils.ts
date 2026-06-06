import type { FamilyMode, ProductFamily } from './types';

export type CoverTypeFilter = 'clamshell' | 'bottle_cap' | 'handle' | 'bolt_joint' | 'open_top' | '';

export type FilterState = {
  testType: FamilyMode | '';
  icType: string;
  packageSizeX: number | '';
  packageSizeY: number | '';
  coverType: CoverTypeFilter;
};

export const DEFAULT_FILTERS: FilterState = {
  testType: '',
  icType: '',
  packageSizeX: '',
  packageSizeY: '',
  coverType: '',
};

export function isFiltersActive(filters: FilterState): boolean {
  return (
    filters.testType !== '' ||
    filters.icType !== '' ||
    filters.packageSizeX !== '' ||
    filters.packageSizeY !== '' ||
    filters.coverType !== ''
  );
}

/**
 * max_package 문자열에서 X, Y 크기(mm)를 각각 추출한다.
 * "6.3×6.3 mm" → { x: 6.3, y: 6.3 }
 * "10.0×14.0 mm" (비대칭) → { x: 10.0, y: 14.0 }
 * "All IC sizes" → { x: Infinity, y: Infinity }
 * "TBD" | null → null
 */
export function parsePackageDimensions(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null;
  if (raw === 'All IC sizes') return { x: Infinity, y: Infinity };
  if (raw === 'TBD') return null;

  const parts = raw.split('×').map((s) => parseFloat(s));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { x: parts[0], y: parts[1] };
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
 * - Test Type / IC Type: 이름이나 타입이 있는 필드 → TBD 제품에도 적용
 * - Package Size / Cover Type: 데이터 미정(TBD/null) 제품은 해당 조건에서 제외
 */
export function applyFilters(families: ProductFamily[], filters: FilterState): ProductFamily[] {
  return families.filter((family) => {
    // ── Test Type ─────────────────────────────────
    if (filters.testType !== '') {
      if (family.mode !== filters.testType) return false;
    }

    // ── IC Type ───────────────────────────────────
    // ic_type은 "BGA / QFN / DFN / LGA" 처럼 묶여 저장되므로 개별 타입 포함 여부로 비교
    if (filters.icType !== '') {
      const icType = family.specs?.en?.ic_type ?? null;
      if (!icType) return false;
      const types = icType.split(' / ').map((s) => s.trim());
      if (!types.includes(filters.icType)) return false;
    }

    // ── Package Size X ────────────────────────────
    // ── Package Size Y ────────────────────────────
    if (filters.packageSizeX !== '' || filters.packageSizeY !== '') {
      const dims = parsePackageDimensions(family.max_package);
      if (dims === null) {
        // 크기 미정(TBD) 제품: 비교 불가이므로 제외
        return false;
      }
      if (filters.packageSizeX !== '' && dims.x < filters.packageSizeX) return false;
      if (filters.packageSizeY !== '' && dims.y < filters.packageSizeY) return false;
    }

    // ── Cover Type ────────────────────────────────
    if (filters.coverType !== '') {
      const coverType = family.specs?.en?.cover_type ?? null;
      if (coverType === null) return false; // 커버 타입 미정 제품 제외
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
