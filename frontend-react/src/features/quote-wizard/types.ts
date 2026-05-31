import type { LangCode } from '@/lib/lang';

export type ProductSeries = 'test_socket' | 'probe_pin' | 'test_jig';

export type WizardStep = 1 | 2 | 3 | 4 | 'complete';

export type SocketTypeOption = {
  socket_type_id: number;
  type_name: string;
  max_ic_width: number;
  max_ic_length: number;
};

export type MasterOption = {
  id: number;
  code: string;
  display_name: string;
};

export type QuoteEstimateResult = {
  matched: boolean;
  unit_price: number;
  currency: string;
  quantity: number;
  total_price: number;
  lead_time_label?: string;
};

export type WizardDraft = {
  version: 1;
  step: WizardStep;
  series: ProductSeries;
  ic_type: string;
  ic_code: string;
  ic_package_type_id: number | null;
  ic_package_code: string;
  dimension_d: string;
  dimension_e: string;
  dimension_a: string;
  pitch: string;
  pin_count: string;
  tolerance_d: string;
  tolerance_e: string;
  socket_type_id: number | null;
  socket_type_name: string;
  quantity: string;
  cover_type_id: number | null;
  material_type_id: number | null;
  spec_notes: string;
  attachment_name: string;
  estimate: QuoteEstimateResult | null;
  contact_name: string;
  contact_company: string;
  contact_email: string;
  contact_phone: string;
};

export const EMPTY_DRAFT: WizardDraft = {
  version: 1,
  step: 1,
  series: 'test_socket',
  ic_type: '',
  ic_code: '',
  ic_package_type_id: null,
  ic_package_code: '',
  dimension_d: '',
  dimension_e: '',
  dimension_a: '',
  pitch: '',
  pin_count: '',
  tolerance_d: '0',
  tolerance_e: '0',
  socket_type_id: null,
  socket_type_name: '',
  quantity: '',
  cover_type_id: null,
  material_type_id: null,
  spec_notes: '',
  attachment_name: '',
  estimate: null,
  contact_name: '',
  contact_company: '',
  contact_email: '',
  contact_phone: '',
};

export function storageKey(userId: number, lang: LangCode): string {
  return `innovo_wizard_v1_${userId}_${lang}`;
}
