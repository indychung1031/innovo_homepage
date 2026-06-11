/** 제품 카탈로그 JSON 스키마 — frontend/content/products/*.json */

export type ProductSlug = 'test-socket' | 'probe-pin' | 'test-jig';

export type FamilyMode = 'manual_only' | 'handler_only' | 'both';

export type FamilySpecsRow = {
  ic_type: string | null;
  socket_size: string | null;
  operating_temp: string | null;
  humidity: string | null;
  cover_type: string | null;
  material: string | null;
};

export type ProductFamily = {
  id: string;
  name: string;
  max_package: string | null;
  mode?: FamilyMode;
  image: string | null;
  coming_soon: boolean;
  desc_en?: string;
  desc_ko?: string;
  detail_url?: string;
  link_text_en?: string;
  link_text_ko?: string;
  specs?: {
    en: FamilySpecsRow;
    ko: FamilySpecsRow;
  } | null;
};

export type ProductCatalog = {
  slug: ProductSlug;
  title_en: string;
  title_ko: string;
  description_en: string;
  description_ko: string;
  socket_list_pdf: string | null;
  families: ProductFamily[];
};
