import probePinCatalog from '@content/products/probe_pin.json';
import testJigCatalog from '@content/products/test_jig.json';
import testSocketCatalog from '@content/products/test_socket.json';

import type { LangCode } from '@/lib/lang';
import type { ProductCatalog, ProductSlug } from '@/lib/products/types';

export const PRODUCT_SLUGS: ProductSlug[] = ['test-socket', 'probe-pin', 'test-jig'];

const CATALOG_BY_SLUG: Record<ProductSlug, ProductCatalog> = {
  'test-socket': testSocketCatalog as ProductCatalog,
  'probe-pin': probePinCatalog as ProductCatalog,
  'test-jig': testJigCatalog as ProductCatalog,
};

export function isProductSlug(value: string | undefined): value is ProductSlug {
  return value === 'test-socket' || value === 'probe-pin' || value === 'test-jig';
}

export function loadProductCatalog(slug: ProductSlug): ProductCatalog {
  return CATALOG_BY_SLUG[slug];
}

export function loadAllCatalogs(): ProductCatalog[] {
  return PRODUCT_SLUGS.map((slug) => loadProductCatalog(slug));
}

export function catalogTitle(catalog: ProductCatalog, lang: LangCode): string {
  return lang === 'ko' ? catalog.title_ko : catalog.title_en;
}

export function catalogDescription(catalog: ProductCatalog, lang: LangCode): string {
  return lang === 'ko' ? catalog.description_ko : catalog.description_en;
}
