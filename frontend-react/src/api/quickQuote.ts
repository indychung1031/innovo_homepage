import { parseApiError } from '@/api/errors';

export type QuickQuotePayload = {
  ic_package_type: string;
  ic_code: string | null;
  pin_count: number;
  pitch: string;
  package_d: number;
  package_e: number;
  package_a: number | null;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  quantity: number | null;
  desired_delivery: string | null;
  message: string | null;
  privacy_agreed: boolean;
  recaptcha_token: string;
  lang: 'en' | 'ko';
};

export type QuickQuoteResult = {
  inquiry_id: number;
  message: string;
};

const useHpApi = import.meta.env.VITE_USE_HP_API === 'true';

export async function submitQuickQuote(payload: QuickQuotePayload): Promise<QuickQuoteResult> {
  const path = useHpApi ? '/api/hp/quick-quote' : '/api/quick-quote';
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const data = (await res.json()) as { detail?: unknown; message?: string; inquiry_id?: number };

  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Submit failed'));
  }

  return {
    inquiry_id: data.inquiry_id ?? 0,
    message: data.message ?? '',
  };
}
