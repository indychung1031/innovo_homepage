import { useTranslation } from 'react-i18next';
import type { CoverTypeFilter, FilterState } from '@/lib/products/filterUtils';
import { isFiltersActive } from '@/lib/products/filterUtils';

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
};

const IC_TYPE_OPTIONS = ['BGA', 'QFN', 'DFN', 'QFP', 'SOP', 'LGA', 'WLP', 'WLCSP'];

function selectClass(active: boolean) {
  return `rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky transition-colors ${
    active ? 'border-sky bg-sky/5 ring-1 ring-sky/30' : 'border-gray-light'
  }`;
}

function inputClass(active: boolean) {
  return `w-full rounded border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky transition-colors ${
    active ? 'border-sky bg-sky/5 ring-1 ring-sky/30' : 'border-gray-light'
  }`;
}

export function TestSocketFilterPanel({ filters, onChange, onReset }: Props) {
  const { t } = useTranslation('products');

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function parseSizeInput(val: string): number | '' {
    return val === '' ? '' : parseFloat(val);
  }

  return (
    <div className="rounded-lg border border-gray-light bg-white p-5 shadow-sm">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* F1: Test Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_test_type')}
          </label>
          <select
            className={selectClass(filters.testType !== '')}
            value={filters.testType}
            onChange={(e) => set('testType', e.target.value as FilterState['testType'])}
          >
            <option value="">{t('category.filter_all')}</option>
            <option value="manual_only">{t('category.manual_only')}</option>
            <option value="both">{t('category.both')}</option>
            <option value="handler_only">{t('category.handler_only')}</option>
          </select>
        </div>

        {/* F2: IC Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_ic_type')}
          </label>
          <select
            className={selectClass(filters.icType !== '')}
            value={filters.icType}
            onChange={(e) => set('icType', e.target.value)}
          >
            <option value="">{t('category.filter_all')}</option>
            {IC_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* F3: Package Size X / Y */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_package_size')} (mm)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1">
              <span className="shrink-0 text-xs text-gray-mid">X</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="mm"
                className={inputClass(filters.packageSizeX !== '')}
                value={filters.packageSizeX === '' ? '' : filters.packageSizeX}
                onChange={(e) => set('packageSizeX', parseSizeInput(e.target.value))}
              />
            </div>
            <span className="text-gray-mid">×</span>
            <div className="flex flex-1 items-center gap-1">
              <span className="shrink-0 text-xs text-gray-mid">Y</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="mm"
                className={inputClass(filters.packageSizeY !== '')}
                value={filters.packageSizeY === '' ? '' : filters.packageSizeY}
                onChange={(e) => set('packageSizeY', parseSizeInput(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* F4: Cover Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_cover_type')}
          </label>
          <select
            className={selectClass(filters.coverType !== '')}
            value={filters.coverType}
            onChange={(e) => set('coverType', e.target.value as CoverTypeFilter)}
          >
            <option value="">{t('category.filter_all')}</option>
            <option value="clamshell">Clamshell</option>
            <option value="bottle_cap">Bottle Cap</option>
            <option value="handle">Handle</option>
            <option value="bolt_joint">Bolt Joint</option>
            <option value="open_top">Open Top</option>
          </select>
        </div>

      </div>

      {/* Reset 버튼 — 활성 필터가 있을 때만 표시 */}
      <div className="mt-4 flex justify-end">
        {isFiltersActive(filters) && (
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-sky px-4 py-1.5 text-sm text-sky transition hover:bg-sky hover:text-white"
          >
            {t('category.filter_reset')}
          </button>
        )}
      </div>
    </div>
  );
}
