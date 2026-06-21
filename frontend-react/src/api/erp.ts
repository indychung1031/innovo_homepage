import { parseApiError } from '@/api/errors';
import {
  MOCK_COVER_TYPES,
  MOCK_IC_PACKAGES,
  MOCK_MATERIAL_TYPES,
  MOCK_SOCKET_TYPES,
  mockQuoteEstimate,
  mockSubmitWizard,
} from '@/features/quote-wizard/mockErp';
import type {
  MasterOption,
  QuoteEstimateResult,
  SocketTypeOption,
  WizardDraft,
} from '@/features/quote-wizard/types';
import { authFetch } from '@/lib/authSession';

const useMock = import.meta.env.VITE_WIZARD_USE_MOCK !== 'false';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  const data = (await res.json()) as T & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Request failed'));
  }
  return data;
}

export async function fetchSocketTypes(): Promise<SocketTypeOption[]> {
  if (useMock) {
    return MOCK_SOCKET_TYPES;
  }
  try {
    return await fetchJson<SocketTypeOption[]>('/api/erp/socket-types');
  } catch {
    return MOCK_SOCKET_TYPES;
  }
}

export async function fetchIcPackageTypes(): Promise<MasterOption[]> {
  if (useMock) {
    return MOCK_IC_PACKAGES;
  }
  try {
    return await fetchJson<MasterOption[]>('/api/erp/ic-package-types');
  } catch {
    return MOCK_IC_PACKAGES;
  }
}

export async function fetchCoverTypes(): Promise<MasterOption[]> {
  if (useMock) {
    return MOCK_COVER_TYPES;
  }
  try {
    return await fetchJson<MasterOption[]>('/api/erp/cover-types');
  } catch {
    return MOCK_COVER_TYPES;
  }
}

export async function fetchMaterialTypes(): Promise<MasterOption[]> {
  if (useMock) {
    return MOCK_MATERIAL_TYPES;
  }
  try {
    return await fetchJson<MasterOption[]>('/api/erp/material-types');
  } catch {
    return MOCK_MATERIAL_TYPES;
  }
}

export type PinSpec = {
  pin_id: number;
  pin_name: string;
  total_length: number | null;
  full_stroke: number | null;
  recommended_stroke: number | null;
  top_plunger_shape: string | null;
  bottom_plunger_shape: string | null;
  spring_force: string | null;
  current_continuous: string | null;
  resistance: string | null;
  bandwidth3db: string | null;
};

export async function fetchPins(): Promise<PinSpec[]> {
  return fetchJson<PinSpec[]>('/api/erp/pins');
}

export type EstimateRequest = {
  socket_type_id: number;
  material_type_id: number;
  cover_type_id: number;
  pin_block_type_id?: number | null;
  pocket_guide_type_id?: number | null;
  pin_count: number;
  quantity: number;
};

export async function postQuoteEstimate(
  body: EstimateRequest,
  draft: WizardDraft,
  membershipTier: string,
): Promise<QuoteEstimateResult> {
  if (useMock || draft.series !== 'test_socket') {
    return mockQuoteEstimate(draft, membershipTier);
  }

  try {
    const res = await authFetch('/api/erp/quote-estimate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as QuoteEstimateResult & { detail?: unknown };
    if (!res.ok) {
      throw new Error(parseApiError(data.detail, 'Estimate failed'));
    }
    return {
      ...data,
      lead_time_label: data.lead_time_label ?? (draft.quantity && parseInt(draft.quantity, 10) <= 20 ? '3 Weeks' : undefined),
    };
  } catch {
    return mockQuoteEstimate(draft, membershipTier);
  }
}

export type WizardSubmitPayload = {
  lang: 'en' | 'ko';
  series: string;
  ic_type: string;
  ic_code: string;
  ic_package_code: string;
  dimension_d: number;
  dimension_e: number;
  dimension_a: number;
  pitch: string;
  pin_count: number;
  socket_type_id: number | null;
  socket_type_name: string;
  quantity: number;
  cover_type_id: number | null;
  material_type_id: number | null;
  spec_notes: string;
  attachment_name: string;
  estimate: QuoteEstimateResult;
  contact_name: string;
  contact_company: string;
  contact_email: string;
  contact_phone: string;
};

export async function submitWizardQuote(payload: WizardSubmitPayload): Promise<{ message: string }> {
  if (useMock) {
    const result = mockSubmitWizard();
    return { message: result.message };
  }

  const res = await authFetch('/api/quote/wizard', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { message?: string; detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Submit failed'));
  }
  return { message: data.message ?? 'Quote request received.' };
}
