/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MEDIA_BASE_URL: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_USE_HP_API: string;
  readonly VITE_HP_API_BASE_URL: string;
  readonly VITE_HP_PROXY_TARGET: string;
  /** false → /api/erp/* 실연동 시도, 실패 시 mock 폴백 */
  readonly VITE_WIZARD_USE_MOCK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
