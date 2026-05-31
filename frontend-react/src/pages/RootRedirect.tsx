import { Navigate } from 'react-router-dom';

import { detectBrowserLang, withLang } from '@/lib/lang';

/** / → 브라우저 언어 기반 /en/ 또는 /ko/ */
export function RootRedirect() {
  const lang = detectBrowserLang();
  return <Navigate to={withLang(lang, '/')} replace />;
}
