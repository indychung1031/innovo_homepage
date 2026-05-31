import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { isLangCode, type LangCode, withLang } from '@/lib/lang';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  variant?: 'default' | 'light';
};

export function Breadcrumb({ items, variant = 'default' }: BreadcrumbProps) {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('common');

  const isLight = variant === 'light';
  const linkClass = isLight ? 'text-sky hover:text-white' : 'text-sky hover:underline';
  const navClass = isLight ? 'mb-4 text-sm text-slate-300' : 'mb-4 text-sm text-gray-mid';

  return (
    <nav className={navClass} aria-label="Breadcrumb">
      <Link to={withLang(lang, '/')} className={linkClass}>
        {t('breadcrumb.main')}
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          <span className="mx-1" aria-hidden>
            /
          </span>
          {item.href ? (
            <Link to={item.href} className={linkClass}>
              {item.label}
            </Link>
          ) : (
            <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
