import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { isLangCode, type LangCode } from '@/lib/lang';

const STORAGE_KEY = 'innovo_cookie_consent';

type ConsentValue = 'essential' | 'analytics';

function readConsent(): ConsentValue | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'essential' || raw === 'analytics') {
    return raw;
  }
  return null;
}

export function CookieBanner() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(readConsent() === null);
    sync();
    window.addEventListener('innovo:cookie-reopen', sync);
    return () => window.removeEventListener('innovo:cookie-reopen', sync);
  }, []);

  const setConsent = (value: ConsentValue) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
    window.dispatchEvent(new CustomEvent('innovo:cookie-consent', { detail: value }));
  };

  if (!visible) {
    return null;
  }

  const isKo = lang === 'ko';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1000] border-t-2 border-navy bg-white p-4 shadow-lg"
      role="dialog"
      aria-labelledby="cookieBannerTitle"
    >
      <div className="mx-auto max-w-4xl">
        <p id="cookieBannerTitle" className="mb-1 font-semibold text-navy">
          {isKo ? '쿠키 및 개인정보' : 'Cookies & privacy'}
        </p>
        <p className="mb-3 text-sm text-gray-mid">
          {isKo ? (
            <>
              필수 쿠키는 사이트 운영에 사용됩니다. 분석(Google Analytics)은 선택 동의 시에만
              사용됩니다.{' '}
              <Link to={`/${lang}/privacy`} className="text-sky hover:underline">
                개인정보처리방침
              </Link>
            </>
          ) : (
            <>
              Essential cookies run the site. Analytics (Google Analytics) loads only if you accept.{' '}
              <Link to={`/${lang}/privacy`} className="text-sky hover:underline">
                Privacy Policy
              </Link>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-gray-light px-4 py-2 text-sm text-navy hover:bg-slate-50"
            onClick={() => setConsent('essential')}
          >
            {isKo ? '필수만' : 'Essential only'}
          </button>
          <button
            type="button"
            className="rounded bg-sky px-4 py-2 text-sm text-white hover:opacity-95"
            onClick={() => setConsent('analytics')}
          >
            {isKo ? '분석 허용' : 'Accept analytics'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 푸터 "쿠키 설정" — 배너 다시 표시 */
export function reopenCookieBanner() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('innovo:cookie-reopen'));
}
