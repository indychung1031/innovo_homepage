import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';

import { FamilyCard } from '@/components/products/FamilyCard';
import { TestSocketFilterPanel } from '@/components/products/TestSocketFilterPanel';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  catalogDescription,
  catalogTitle,
  isProductSlug,
  loadProductCatalog,
} from '@/lib/products/catalog';
import {
  applyFilters,
  DEFAULT_FILTERS,
  groupByMode,
  isFiltersActive,
  MODE_ORDER,
  type FilterState,
} from '@/lib/products/filterUtils';
import type { FamilyMode } from '@/lib/products/types';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

const SECTION_LABEL_KEY: Record<FamilyMode, string> = {
  manual_only: 'category.section_manual_only',
  both:        'category.section_both',
  handler_only: 'category.section_handler_only',
};

export function ProductCategoryPage() {
  const { lang: langParam, categorySlug } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['products', 'common']);

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  if (!isProductSlug(categorySlug)) {
    return <Navigate to={withLang(lang, '/products')} replace />;
  }

  const catalog = loadProductCatalog(categorySlug);
  const title = catalogTitle(catalog, lang);
  const isTestSocket = categorySlug === 'test-socket';

  const filtered = isTestSocket ? applyFilters(catalog.families, filters) : catalog.families;
  const grouped = isTestSocket ? groupByMode(filtered) : null;
  const active = isTestSocket && isFiltersActive(filters);

  return (
    <>
      <Helmet>
        <title>
          {title} | Innovo Solution
        </title>
      </Helmet>

      <section className="border-b border-gray-light bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <Breadcrumb
            items={[
              { label: t('common:nav.products'), href: withLang(lang, '/products') },
              { label: title },
            ]}
          />
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="mb-3 text-3xl font-bold">{title}</h1>
              <p className="max-w-2xl whitespace-pre-line text-gray-mid">{catalogDescription(catalog, lang)}</p>
            </div>
            {isTestSocket && (
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={`shrink-0 rounded border px-5 py-2 text-sm font-medium transition ${
                  filterOpen
                    ? 'border-navy bg-navy text-white'
                    : 'border-gray-light text-gray-mid hover:border-navy hover:text-navy'
                }`}
              >
                {filterOpen ? '✕ ' : ''}{t('products:category.filter_toggle')}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">

          {/* 필터 패널 — test-socket 전용 */}
          {isTestSocket && filterOpen && (
            <TestSocketFilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          )}

          {/* test-socket: 그룹핑 섹션 렌더링 */}
          {isTestSocket && grouped && (
            <>
              {MODE_ORDER.every((mode) => grouped[mode].length === 0) ? (
                <p className="py-12 text-center text-gray-mid">
                  {t('products:category.filter_no_results')}
                </p>
              ) : (
                MODE_ORDER.map((mode) => {
                  const families = grouped[mode];
                  if (families.length === 0) return null;
                  return (
                    <div key={mode} className="mb-14">
                      <h2 className="mb-6 border-b border-gray-light pb-2 text-xl font-bold text-navy">
                        {t(SECTION_LABEL_KEY[mode])}
                        {active && (
                          <span className="ml-2 text-sm font-normal text-gray-mid">
                            ({families.length})
                          </span>
                        )}
                      </h2>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {families.map((family) => (
                          <FamilyCard key={family.id} family={family} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* 다른 카테고리: 기존 flat grid */}
          {!isTestSocket && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.families.map((family) => (
                <FamilyCard key={family.id} family={family} />
              ))}
            </div>
          )}

        </div>
      </section>
    </>
  );
}
