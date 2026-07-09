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

const CATEGORY_LABELS: Record<string, { en: string; ko: string }> = {
  test_socket: { en: 'Test Socket', ko: '테스트 소켓' },
  probe_pin: { en: 'Probe Pin', ko: '프로브 핀' },
  test_jig: { en: 'Test JIG', ko: '테스트 지그' },
  other: { en: 'Other', ko: '기타' },
};

/**
 * ERP HP API 계약 보정 (2026-07-07 3차 검토 §2 대응).
 * ERP `hp_quick_quote.py` 스키마가 로컬 백엔드보다 엄격해, 그대로 보내면
 * 유실(422/400)되는 값을 전송 직전에 변환하고 원본 정보는 message에 보존한다.
 */
function adaptForHpApi(payload: QuickQuotePayload): QuickQuotePayload {
  const isKo = payload.lang === 'ko';
  const notes: string[] = [];

  // ERP 스키마에 product_category 필드가 없어 조용히 유실됨 — message 머리에 명기
  const label = payload.product_category ? CATEGORY_LABELS[payload.product_category] : undefined;
  if (label) {
    notes.push(isKo ? `[카테고리: ${label.ko}]` : `[Category: ${label.en}]`);
  }

  // ERP ic_package_type 마스터에 WLCSP가 없어 400 거부 — ETC로 변환, 원본은 message에 보존
  let icPackageType = payload.ic_package_type;
  if (icPackageType === 'WLCSP') {
    icPackageType = 'ETC';
    notes.push(isKo ? '[IC 패키지: WLCSP]' : '[IC Package: WLCSP]');
  }

  // ERP는 pitch 'N/A'를 422 거부 — 규격 미해당 카테고리(test_jig/other)는
  // package_d/e(0.001)와 같은 자리표시 값으로 대체하고 그 사실을 message에 남긴다
  let pitch = payload.pitch;
  if (pitch === 'N/A') {
    pitch = '0.001mm';
    notes.push(
      isKo
        ? '(핀 수·피치·크기 항목은 자리표시 값 — 고객 미입력)'
        : '(Pin/pitch/size fields are placeholders — not provided by customer)',
    );
  } else if (payload.product_category === 'probe_pin') {
    // probe_pin은 핀 수·피치는 실값이지만 D/E 크기는 입력받지 않아 0.001 자리표시로 전송됨
    notes.push(
      isKo
        ? '(D/E 크기 항목은 자리표시 값 — 해당 없음)'
        : '(D/E size fields are placeholders — not applicable)',
    );
  }

  if (notes.length === 0) {
    return payload;
  }

  const message = [...notes, payload.message ?? ''].filter(Boolean).join('\n');
  return { ...payload, ic_package_type: icPackageType, pitch, message };
}

export async function submitQuickQuote(payload: QuickQuotePayload): Promise<QuickQuoteResult> {
  const url = resolveFormApiUrl('/api/hp/quick-quote', '/api/quick-quote');

  let body: QuickQuotePayload = payload;
  if (isHpApiEnabled()) {
    const adapted = adaptForHpApi(payload);
    body = {
      ...adapted,
      pitch: normalizePitch(adapted.pitch),
      ic_type: adapted.ic_type?.trim() || null,
    };
  }

  return postHpJson(url, body, payload.lang, payload.lang === 'ko' ? '제출에 실패했습니다.' : 'Submit failed');
}
