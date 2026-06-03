import { useTranslation } from 'react-i18next';
import type { CoverTypeFilter, FilterState } from '@/lib/products/filterUtils';

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
};

export function TestSocketFilterPanel({ filters, onChange, onReset }: Props) {
  const { t } = useTranslation('products');

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="mb-8 rounded-lg border border-gray-light bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* F1: Test Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_test_type')}
          </label>
          <select
            className="rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky"
            value={filters.testType}
            onChange={(e) => set('testType', e.target.value as FilterState['testType'])}
          >
            <option value="">{t('category.filter_all')}</option>
            <option value="manual_only">{t('category.manual_only')}</option>
            <option value="both">{t('category.both')}</option>
            <option value="handler_only">{t('category.handler_only')}</option>
          </select>
        </div>

        {/* F2: Package Size */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_package_size')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 6.3"
              className="w-full rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky"
              value={filters.packageSizeMm === '' ? '' : filters.packageSizeMm}
              onChange={(e) =>
                set('packageSizeMm', e.target.value === '' ? '' : parseFloat(e.target.value))
              }
            />
            <span className="shrink-0 text-sm text-gray-mid">mm</span>
          </div>
        </div>

        {/* F3: Cover Type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_cover_type')}
          </label>
          <select
            className="rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky"
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

        {/* F4: 제품명 검색 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-mid">
            {t('category.filter_name')}
          </label>
          <input
            type="text"
            placeholder={t('category.filter_name_placeholder')}
            className="rounded border border-gray-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky"
            value={filters.nameQuery}
            onChange={(e) => set('nameQuery', e.target.value)}
          />
        </div>
      </div>

      {/* 하단 행: 전체보기 + 초기화 */}
      <div className="mt-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-mid">
          <input
            type="checkbox"
            className="h-4 w-4 accent-sky"
            checked={filters.showUndefined}
            onChange={(e) => set('showUndefined', e.target.checked)}
          />
          {t('category.filter_show_undefined')}
        </label>

        <button
          type="button"
          onClick={onReset}
          className="rounded border border-gray-light px-4 py-1.5 text-sm text-gray-mid transition hover:border-navy hover:text-navy"
        >
          {t('category.filter_reset')}
        </button>
      </div>
    </div>
  );
}
