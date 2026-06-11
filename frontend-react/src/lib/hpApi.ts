/**
 * ERP HP API — document/hp_api_reference.md
 * Base: http://54.116.87.172 · 경로: /api/hp/*
 */

const HP_DEFAULT_BASE = 'http://54.116.87.172';

/** 로컬 FastAPI 대신 ERP HP API 사용 여부 */
export function isHpApiEnabled(): boolean {
  if (import.meta.env.VITE_USE_HP_API === 'false') {
    return false;
  }
  if (import.meta.env.VITE_USE_HP_API === 'true') {
    return true;
  }
  return Boolean(import.meta.env.VITE_HP_API_BASE_URL);
}

function hpApiBaseUrl(): string {
  return (import.meta.env.VITE_HP_API_BASE_URL ?? '').replace(/\/$/, '');
}

/** HP 경로 또는 로컬 FastAPI 경로 */
export function resolveFormApiUrl(hpPath: string, localPath: string): string {
  if (!isHpApiEnabled()) {
    return localPath;
  }
  const base = hpApiBaseUrl();
  return base ? `${base}${hpPath}` : hpPath;
}

export function hpApiDefaultBase(): string {
  return HP_DEFAULT_BASE;
}

/** Pitch: 숫자만 입력 시 mm 접미사 (HP API 규격) */
export function normalizePitch(pitch: string): string {
  const trimmed = pitch.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}mm`;
  }
  return trimmed;
}

const HP_STATUS_MESSAGES: Record<number, { en: string; ko: string }> = {
  413: {
    en: 'File exceeds 10MB limit.',
    ko: '파일 크기는 10MB 이하여야 합니다.',
  },
  429: {
    en: 'Too many requests. Please try again in a minute.',
    ko: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  },
};

export function hpStatusMessage(status: number, lang: 'en' | 'ko'): string | null {
  return HP_STATUS_MESSAGES[status]?.[lang] ?? null;
}
