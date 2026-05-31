import { recommendSocketType } from '@/features/quote-wizard/recommendSocket';
import type {
  MasterOption,
  QuoteEstimateResult,
  SocketTypeOption,
  WizardDraft,
} from '@/features/quote-wizard/types';

export const MOCK_SOCKET_TYPES: SocketTypeOption[] = [
  { socket_type_id: 1, type_name: 'Tiny', max_ic_width: 5, max_ic_length: 5 },
  { socket_type_id: 2, type_name: 'Mini', max_ic_width: 8, max_ic_length: 8 },
  { socket_type_id: 3, type_name: 'ExMini', max_ic_width: 12, max_ic_length: 12 },
  { socket_type_id: 4, type_name: 'Large 30', max_ic_width: 20, max_ic_length: 20 },
  { socket_type_id: 5, type_name: 'Large 48', max_ic_width: 30, max_ic_length: 30 },
];

export const MOCK_IC_PACKAGES: MasterOption[] = [
  { id: 1, code: 'WLP', display_name: 'WLP' },
  { id: 2, code: 'BGA', display_name: 'BGA' },
  { id: 3, code: 'QFN', display_name: 'QFN' },
  { id: 4, code: 'QFP', display_name: 'QFP' },
  { id: 5, code: 'LGA', display_name: 'LGA' },
];

export const MOCK_COVER_TYPES: MasterOption[] = [
  { id: 1, code: 'clamshell', display_name: 'Clamshell' },
  { id: 2, code: 'bottle_cap', display_name: 'Bottle Cap' },
];

export const MOCK_MATERIAL_TYPES: MasterOption[] = [
  { id: 1, code: 'cmf', display_name: 'CMF' },
  { id: 2, code: 'peek', display_name: 'PEEK' },
];

export function mockFetchSocketTypes(draft: WizardDraft): SocketTypeOption[] {
  const d = parseFloat(draft.dimension_d);
  const e = parseFloat(draft.dimension_e);
  if (!Number.isFinite(d) || !Number.isFinite(e)) {
    return MOCK_SOCKET_TYPES;
  }
  const tolD = parseFloat(draft.tolerance_d) || 0;
  const tolE = parseFloat(draft.tolerance_e) || 0;
  const match = recommendSocketType(MOCK_SOCKET_TYPES, d, e, tolD, tolE);
  return match ? [match, ...MOCK_SOCKET_TYPES.filter((s) => s.socket_type_id !== match.socket_type_id)] : [];
}

export function mockQuoteEstimate(
  draft: WizardDraft,
  membershipTier: string,
): QuoteEstimateResult {
  const qty = Math.max(1, parseInt(draft.quantity, 10) || 1);
  const pins = Math.max(1, parseInt(draft.pin_count, 10) || 1);

  if (!draft.socket_type_id || draft.series !== 'test_socket') {
    return {
      matched: false,
      unit_price: 0,
      currency: 'KRW',
      quantity: qty,
      total_price: 0,
    };
  }

  const baseUnit = 80000 + pins * 500;
  const isVerified = membershipTier === 'verified';
  const unit = isVerified ? baseUnit : Math.round(baseUnit * 1.3);
  const total = unit * qty;

  return {
    matched: true,
    unit_price: unit,
    currency: 'KRW',
    quantity: qty,
    total_price: total,
    lead_time_label: qty <= 20 ? '3 Weeks' : 'To be confirmed by sales',
  };
}

export function mockSubmitWizard(): { request_id: number; message: string } {
  return {
    request_id: Math.floor(Date.now() / 1000),
    message: 'Quote request received (mock).',
  };
}
