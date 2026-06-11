import { HP_MAX_ATTACHMENT_BYTES, postHpFormData } from '@/api/hpFetch';
import { isHpApiEnabled, resolveFormApiUrl } from '@/lib/hpApi';

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

export { HP_MAX_ATTACHMENT_BYTES };

export async function submitContact(
  payload: ContactPayload,
  file?: File | null,
): Promise<ContactResult> {
  if (file && file.size > HP_MAX_ATTACHMENT_BYTES) {
    throw new Error(
      payload.lang === 'ko' ? '파일 크기는 10MB 이하여야 합니다.' : 'File must be 10MB or less.',
    );
  }

  const fd = new FormData();

  if (isHpApiEnabled()) {
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

  const url = resolveFormApiUrl('/api/hp/contact', '/api/contact');
  return postHpFormData(
    url,
    fd,
    payload.lang,
    payload.lang === 'ko' ? '제출에 실패했습니다.' : 'Submit failed',
  );
}
