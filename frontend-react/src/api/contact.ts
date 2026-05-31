import { parseApiError } from '@/api/errors';

export type ContactCategory = 'test_socket' | 'probe_pin' | 'test_jig' | 'other';

export type ContactPayload = {
  category: ContactCategory;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  subject: string;
  message: string;
  privacy_agreed: boolean;
  recaptcha_token: string;
  lang: 'en' | 'ko';
};

export type ContactResult = {
  inquiry_id: number;
  message: string;
};

const useHpApi = import.meta.env.VITE_USE_HP_API === 'true';

export async function submitContact(
  payload: ContactPayload,
  file?: File | null,
): Promise<ContactResult> {
  const fd = new FormData();

  if (useHpApi) {
    fd.append(
      'data',
      JSON.stringify({
        inquiry_type: payload.category,
        company_name: payload.company_name,
        contact_name: payload.contact_name,
        contact_email: payload.contact_email,
        contact_phone: payload.contact_phone,
        subject: payload.subject,
        message: payload.message,
        privacy_agreed: payload.privacy_agreed,
        recaptcha_token: payload.recaptcha_token,
        lang: payload.lang,
      }),
    );
  } else {
    fd.append('data', JSON.stringify(payload));
  }

  if (file) {
    fd.append('file', file);
  }

  const path = useHpApi ? '/api/hp/contact' : '/api/contact';
  const res = await fetch(path, {
    method: 'POST',
    body: fd,
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
