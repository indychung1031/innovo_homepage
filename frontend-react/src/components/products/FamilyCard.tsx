import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { SpecTable } from '@/components/products/SpecTable';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';
import type { ProductFamily } from '@/lib/products/types';

type FamilyCardProps = {
  family: ProductFamily;
};

export function FamilyCard({ family }: FamilyCardProps) {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['products', 'common']);
  const [specOpen, setSpecOpen] = useState(false);

  const desc = lang === 'ko' ? family.desc_ko : family.desc_en;
  const specs = family.specs ? (lang === 'ko' ? family.specs.ko : family.specs.en) : null;

  const modeLabel =
    family.mode === 'manual_only'
      ? t('products:category.manual_only')
      : family.mode === 'handler_only'
        ? t('products:category.handler_only')
        : family.mode === 'both'
          ? t('products:category.both')
          : null;

  const detailHref =
    family.detail_url && !family.coming_soon
      ? withLang(lang, family.detail_url)
      : null;

  const linkText =
    lang === 'ko'
      ? family.link_text_ko || family.link_text_en
      : family.link_text_en || family.link_text_ko;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border border-gray-light bg-white ${family.coming_soon ? 'opacity-75' : ''}`}
    >
      <div className="flex h-44 items-center justify-center bg-slate-100 p-4">
        {family.image ? (
          <img
            src={mediaUrl(family.image)}
            alt={family.name}
            className="max-h-full object-contain"
          />
        ) : (
          <span className="text-sm text-gray-mid">{family.name}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{family.name}</h2>
          {family.coming_soon && (
            <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs text-gray-mid">
              {t('common:cta.coming_soon')}
            </span>
          )}
        </div>

        {desc ? (
          <p className="mb-4 text-sm text-gray-mid">{desc}</p>
        ) : family.max_package ? (
          <p className={`text-sm text-gray-mid ${modeLabel ? 'mb-1' : 'mb-4'}`}>
            {t('products:category.max_package')}: {family.max_package}
          </p>
        ) : null}

        {modeLabel && <p className="mb-4 text-xs text-gray-mid">{modeLabel}</p>}

        {detailHref && (
          <Link to={detailHref} className="mb-2 inline-block text-sm font-medium text-sky hover:underline">
            {linkText || t('products:category.view_detail_list')}
          </Link>
        )}

        {specs && !family.coming_soon && !detailHref && (
          <>
            <button
              type="button"
              className="mb-2 text-left text-sm font-medium text-sky"
              aria-expanded={specOpen}
              aria-controls={`spec-${family.id}`}
              onClick={() => setSpecOpen((open) => !open)}
            >
              {t('common:cta.view_specs')}
            </button>
            {specOpen && (
              <div
                id={`spec-${family.id}`}
                className="mb-4 border-t border-gray-light pt-3 text-sm"
              >
                <SpecTable specs={specs} />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
