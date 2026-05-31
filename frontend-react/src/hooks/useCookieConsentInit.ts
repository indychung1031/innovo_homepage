import { useEffect } from 'react';

import { loadGoogleAnalytics } from '@/lib/analytics';

const STORAGE_KEY = 'innovo_cookie_consent';

/** 앱 시작 시 기존 analytics 동의면 GA 로드 */
export function useCookieConsentInit() {
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'analytics') {
      loadGoogleAnalytics();
    }

    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === 'analytics') {
        loadGoogleAnalytics();
      }
    };
    window.addEventListener('innovo:cookie-consent', onConsent);
    return () => window.removeEventListener('innovo:cookie-consent', onConsent);
  }, []);
}
