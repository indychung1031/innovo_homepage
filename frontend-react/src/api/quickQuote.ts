import { postHpJson } from '@/api/hpFetch';
import { isHpApiEnabled, normalizePitch, resolveFormApiUrl } from '@/lib/hpApi';

export type QuickQuotePayload = {
  product_category: string | null;
  ic_package_type: string;
  ic_code: string | null;
  ic_type: string | null;
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

export async function submitQuickQuote(payload: QuickQuotePayload): Promise<QuickQuoteResult> {
  const url = resolveFormApiUrl('/api/hp/quick-quote', '/api/quick-quote');

  const body = isHpApiEnabled()
    ? {
        ...payload,
        pitch: normalizePitch(payload.pitch),
        ic_type: payload.ic_type?.trim() || null,
      }
    : payload;

  return postHpJson(url, body, payload.lang, payload.lang === 'ko' ? '제출에 실패했습니다.' : 'Submit failed');
}
