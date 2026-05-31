import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { isLangCode, pathWithoutLang, type LangCode } from '@/lib/lang';

const APP_ORIGIN = import.meta.env.VITE_APP_BASE_URL || 'https://www.innovosolution.co.kr';

/** :lang 검증 + i18n·hreflang 동기화 */
export function LangShell() {
  const { lang: langParam } = useParams();
  const { i18n } = useTranslation();
  const location = useLocation();

  if (!isLangCode(langParam)) {
    return <Navigate to="/en/" replace />;
  }

  const lang: LangCode = langParam;
  const suffix = pathWithoutLang(location.pathname, lang);
  const canonical = `${APP_ORIGIN}/${lang}${suffix === '/' ? '/' : suffix}`;

  useEffect(() => {
    void i18n.changeLanguage(lang);
  }, [lang, i18n]);

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <link rel="alternate" hrefLang="en" href={`${APP_ORIGIN}/en${suffix}`} />
        <link rel="alternate" hrefLang="ko" href={`${APP_ORIGIN}/ko${suffix}`} />
        <link rel="alternate" hrefLang="x-default" href={`${APP_ORIGIN}/en${suffix}`} />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <PublicLayout />
    </>
  );
}
