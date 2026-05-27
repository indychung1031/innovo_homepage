/**
 * GDPR 쿠키 동의 — localStorage innovo_cookie_consent
 * 값: essential | analytics
 */
(function () {
  const STORAGE_KEY = 'innovo_cookie_consent';

  function getConsent() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function setConsent(value) {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent('innovo:cookie-consent', { detail: value }));
    hideBanner();
    if (value === 'analytics') {
      loadAnalytics();
    }
  }

  function hideBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.hidden = true;
  }

  function showBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.hidden = false;
  }

  function loadAnalytics() {
    // Phase 6: GA4_MEASUREMENT_ID env 주입 후 gtag 로드
    if (window.__GA_MEASUREMENT_ID__) {
      console.info('[cookie-consent] Analytics enabled (GA4 placeholder)');
    }
  }

  function init() {
    const essentialBtn = document.getElementById('cookieEssentialOnly');
    const acceptBtn = document.getElementById('cookieAcceptAll');
    const settingsBtn = document.getElementById('openCookieSettings');

    if (essentialBtn) {
      essentialBtn.addEventListener('click', function () {
        setConsent('essential');
      });
    }
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        setConsent('analytics');
      });
    }
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        showBanner();
      });
    }

    const existing = getConsent();
    if (!existing) {
      showBanner();
    } else if (existing === 'analytics') {
      loadAnalytics();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.InnovoCookieConsent = { getConsent: getConsent, setConsent: setConsent };
})();
