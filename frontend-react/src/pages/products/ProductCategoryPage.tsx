import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';

import { FamilyCard } from '@/components/products/FamilyCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  catalogDescription,
  catalogTitle,
  isProductSlug,
  loadProductCatalog,
} from '@/lib/products/catalog';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';

export function ProductCategoryPage() {
  const { lang: langParam, categorySlug } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['products', 'common']);

  if (!isProductSlug(categorySlug)) {
    return <Navigate to={withLang(lang, '/products')} replace />;
  }

  const catalog = loadProductCatalog(categorySlug);
  const title = catalogTitle(catalog, lang);

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
          <h1 className="mb-3 text-3xl font-bold">{title}</h1>
          <p className="max-w-2xl text-gray-mid">{catalogDescription(catalog, lang)}</p>
          {catalog.socket_list_pdf && (
            <a
              href={mediaUrl(catalog.socket_list_pdf)}
              className="mt-4 inline-block text-sm font-medium text-sky hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('products:category.socket_list')}
            </a>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.families.map((family) => (
            <FamilyCard key={family.id} family={family} />
          ))}
        </div>
      </section>
    </>
  );
}
