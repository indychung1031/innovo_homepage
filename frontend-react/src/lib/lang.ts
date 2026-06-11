/** 지원 언어 — FastAPI Literal["en","ko"] 와 동일 */
export type LangCode = 'en' | 'ko';

export const LANGS: LangCode[] = ['en', 'ko'];

export function isLangCode(value: string | undefined): value is LangCode {
  return value === 'en' || value === 'ko';
}

/** 브라우저 선호 언어 → en | ko */
export function detectBrowserLang(): LangCode {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

/** /en/products → /products (언어 토글용) */
export function pathWithoutLang(pathname: string, lang: LangCode): string {
  const prefix = `/${lang}`;
  if (pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length);
    return rest || '/';
  }
  return pathname;
}

export function withLang(lang: LangCode, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') {
    return `/${lang}/`;
  }
  return `/${lang}${normalized}`;
}
