const SCRIPT_ID = 'recaptcha-v3-script';

/** reCAPTCHA v3 스크립트 1회 로드 */
export function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (!siteKey) {
    return Promise.resolve();
  }
  if (document.getElementById(SCRIPT_ID)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA script load failed'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export async function getRecaptchaToken(
  siteKey: string,
  action: string,
): Promise<string> {
  if (!siteKey) {
    return 'dev-skip-token';
  }

  await loadRecaptchaScript(siteKey);

  if (!window.grecaptcha) {
    throw new Error('reCAPTCHA 로드 실패 — 페이지를 새로고침 후 다시 시도해 주세요.');
  }

  return new Promise((resolve, reject) => {
    window.grecaptcha!.ready(() => {
      window
        .grecaptcha!.execute(siteKey, { action })
        .then(resolve)
        .catch(reject);
    });
  });
}
