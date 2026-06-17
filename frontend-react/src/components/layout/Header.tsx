import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { isLangCode, pathWithoutLang, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';

const LOGO_PATH = '/upload/logo/LOGO (Mask 제거).png';

export function Header() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathSuffix = pathWithoutLang(location.pathname, lang);
  const [navOpen, setNavOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
    setProductsOpen(false);
  }, [location.pathname]);

  const renewalLabel = lang === 'ko' ? '리뉴얼중' : 'Under Renewal';

  return (
    <header className="site-header sticky top-0 z-50 border-b border-gray-light bg-white text-charcoal shadow-sm">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to={withLang(lang, '/')} className="flex shrink-0 items-center gap-2">
          <img
            src={mediaUrl(LOGO_PATH)}
            alt="Innovo Solution"
            className="h-8 w-auto"
            width={120}
            height={32}
          />
        </Link>

        <button
          type="button"
          className="rounded border border-gray-light p-2 text-navy md:hidden"
          aria-expanded={navOpen}
          aria-controls="siteNav"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span className="sr-only">{navOpen ? t('nav.menu_close') : t('nav.menu_open')}</span>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <nav
          id="siteNav"
          className={`site-nav text-sm ${navOpen ? 'flex flex-col gap-3 border-t border-gray-light pt-4 md:border-0 md:pt-0' : 'hidden md:flex md:flex-wrap md:items-center md:gap-5'}`}
          aria-label={t('a11y.main_nav')}
        >
          <span className="whitespace-nowrap rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            {renewalLabel}
          </span>

          <Link to={withLang(lang, '/about')} className="text-charcoal hover:text-navy">
            {t('nav.about')}
          </Link>

          <div className="group relative">
            <span
              className="flex cursor-pointer items-center gap-1 text-charcoal md:cursor-auto md:pointer-events-none"
              onClick={() => setProductsOpen((open) => !open)}
            >
              {t('nav.products')}
              <svg
                className={`h-4 w-4 transition-transform md:inline ${productsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            <div className={`${productsOpen ? 'block' : 'hidden'} mt-2 border-l border-gray-light pl-4 md:block md:absolute md:left-0 md:top-full md:mt-0 md:border-0 md:pl-0 md:pt-2 md:opacity-0 md:invisible md:transition-all md:group-hover:visible md:group-hover:opacity-100`}>
              <div className="md:min-w-[11rem] md:rounded md:bg-white md:py-2 md:shadow-lg">
                <Link
                  to={withLang(lang, '/products/test-socket')}
                  className="block whitespace-nowrap rounded px-3 py-2 text-charcoal hover:bg-slate-50"
                >
                  {t('nav.test_socket')}
                </Link>
                <Link
                  to={withLang(lang, '/products/probe-pin')}
                  className="block whitespace-nowrap rounded px-3 py-2 text-charcoal hover:bg-slate-50"
                >
                  {t('nav.probe_pin')}
                </Link>
                <Link
                  to={withLang(lang, '/products/test-jig')}
                  className="block whitespace-nowrap rounded px-3 py-2 text-charcoal hover:bg-slate-50"
                >
                  {t('nav.test_jig')}
                </Link>
              </div>
            </div>
          </div>

          <Link to={withLang(lang, '/technology')} className="text-charcoal hover:text-navy">
            {t('nav.technology')}
          </Link>
          {user ? (
            <>
              <Link to={withLang(lang, '/account')} className="text-charcoal hover:text-navy">
                {t('nav.account')}
              </Link>
              <button
                type="button"
                className="text-charcoal hover:text-navy"
                onClick={() => void logout()}
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link to={withLang(lang, '/login')} className="text-charcoal hover:text-navy">
              {t('nav.login')}
            </Link>
          )}

          <Link
            to={withLang(lang, '/contact')}
            className="inline-flex items-center justify-center rounded bg-navy px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
          >
            {t('nav.contact')}
          </Link>
          <Link
            to={withLang(lang, '/quote')}
            className="inline-flex items-center justify-center rounded bg-sky px-4 py-2 font-medium text-white transition-opacity hover:opacity-95"
          >
            {t('nav.quote')}
          </Link>

          <span className="flex items-center gap-1 text-gray-mid">
            <Link
              to={`/en${pathSuffix}`}
              className={lang === 'en' ? 'font-semibold text-navy' : 'hover:text-navy'}
              aria-current={lang === 'en' ? 'page' : undefined}
            >
              EN
            </Link>
            <span aria-hidden>|</span>
            <Link
              to={`/ko${pathSuffix}`}
              className={lang === 'ko' ? 'font-semibold text-navy' : 'hover:text-navy'}
              aria-current={lang === 'ko' ? 'page' : undefined}
            >
              KO
            </Link>
          </span>
        </nav>
      </div>
    </header>
  );
}
