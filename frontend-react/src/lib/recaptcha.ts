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
  if (!siteKey || !window.grecaptcha) {
    return 'dev-skip-token';
  }

  await loadRecaptchaScript(siteKey);

  return new Promise((resolve, reject) => {
    window.grecaptcha!.ready(() => {
      window
        .grecaptcha!.execute(siteKey, { action })
        .then(resolve)
        .catch(reject);
    });
  });
}
