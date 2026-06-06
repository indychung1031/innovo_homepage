import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { reopenCookieBanner } from '@/components/layout/CookieBanner';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

export function Footer() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('common');

  useEffect(() => {
    const handler = () => reopenCookieBanner();
    window.addEventListener('innovo:cookie-reopen', handler);
    return () => window.removeEventListener('innovo:cookie-reopen', handler);
  }, []);

  return (
    <footer className="site-footer mt-auto border-t border-gray-light bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
        <p className="mb-1 font-semibold text-navy">{t('footer.company')}</p>
        <p className="mb-2 text-gray-mid">{t('footer.address')}</p>
        <p className="mb-4 text-gray-mid">
          Tel: +82-31-735-6141 · Fax: +82-31-735-6145 ·{' '}
          <a href="mailto:sbchung@innovotech.co.kr" className="text-sky hover:underline">
            sbchung@innovotech.co.kr
          </a>
        </p>
        <nav className="mb-4 flex flex-wrap gap-4" aria-label={t('a11y.legal_nav')}>
          <Link to={withLang(lang, '/privacy')} className="text-sky hover:underline">
            {t('footer.privacy')}
          </Link>
          <Link to={withLang(lang, '/terms')} className="text-sky hover:underline">
            {t('footer.terms')}
          </Link>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 font-inherit text-sky hover:underline"
            onClick={() => reopenCookieBanner()}
          >
            {t('footer.cookies')}
          </button>
        </nav>
        <p className="text-xs text-gray-mid">© 2026 Innovo Solution Co., Ltd.</p>
      </div>
    </footer>
  );
}
