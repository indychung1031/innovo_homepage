import { parseApiError } from '@/api/errors';
import { hpStatusMessage, isHpApiEnabled } from '@/lib/hpApi';
import type { LangCode } from '@/lib/lang';

type HpJsonBody = {
  detail?: unknown;
  message?: string;
  inquiry_id?: number;
  success?: boolean;
};

/** Contact·Quick Quote 공통 fetch — HP API는 credentials 불필요 */
export async function postHpJson(
  url: string,
  body: unknown,
  lang: LangCode,
  fallbackError: string,
): Promise<{ inquiry_id: number; message: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: isHpApiEnabled() ? 'omit' : 'include',
  });

  const data = (await res.json()) as HpJsonBody;
  const statusMsg = hpStatusMessage(res.status, lang);

  if (!res.ok) {
    throw new Error(statusMsg ?? parseApiError(data.detail, fallbackError));
  }

  return {
    inquiry_id: data.inquiry_id ?? 0,
    message: data.message ?? '',
  };
}

export async function postHpFormData(
  url: string,
  formData: FormData,
  lang: LangCode,
  fallbackError: string,
): Promise<{ inquiry_id: number; message: string }> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: isHpApiEnabled() ? 'omit' : 'include',
  });

  const data = (await res.json()) as HpJsonBody;
  const statusMsg = hpStatusMessage(res.status, lang);

  if (!res.ok) {
    throw new Error(statusMsg ?? parseApiError(data.detail, fallbackError));
  }

  return {
    inquiry_id: data.inquiry_id ?? 0,
    message: data.message ?? '',
  };
}

export const HP_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
