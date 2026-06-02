import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  catalogDescription,
  catalogTitle,
  loadAllCatalogs,
} from '@/lib/products/catalog';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';

export function ProductsIndexPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['products', 'common']);
  const categories = loadAllCatalogs();

  return (
    <>
      <Helmet>
        <title>{t('products:meta.title')}</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <Breadcrumb items={[{ label: t('common:nav.products') }]} />
          <h1 className="mb-3 text-3xl font-bold">{t('products:index.title')}</h1>
          <p className="max-w-2xl whitespace-pre-line text-lg text-gray-mid">{t('products:index.lead')}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          {categories.map((cat) => {
            const thumb = cat.families[0]?.image ?? null;
            return (
              <Link
                key={cat.slug}
                to={withLang(lang, `/products/${cat.slug}`)}
                className="group block overflow-hidden rounded-lg border border-gray-light transition-shadow hover:shadow-lg"
              >
                <div className="flex h-48 items-center justify-center bg-slate-100">
                  {thumb ? (
                    <img
                      src={mediaUrl(thumb)}
                      alt=""
                      className="max-h-full max-w-full object-contain p-4"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-display text-lg text-navy/40">{catalogTitle(cat, lang)}</span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-semibold transition-colors group-hover:text-sky">
                    {catalogTitle(cat, lang)}
                  </h2>
                  <p className="mt-2 text-sm text-gray-mid">{catalogDescription(cat, lang)}</p>
                  <span className="mt-4 inline-block text-sm font-medium text-sky">
                    {t('common:cta.view_details')} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
