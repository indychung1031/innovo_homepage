import { parseApiError } from '@/api/errors';
import type { UserPublic } from '@/api/auth';
import { authFetch } from '@/lib/authSession';

export type QuoteStatus = 'pending' | 'reviewing' | 'quoted' | 'completed' | 'expired';

export type QuoteItem = {
  id: number;
  source?: 'quick_quote' | 'wizard';
  ic_package_type: string;
  ic_type: string | null;
  ic_code: string | null;
  package_d: number | null;
  package_e: number | null;
  pin_count: number | null;
  pitch: string | null;
  quantity: number | null;
  created_at: string;
  status: QuoteStatus;
  unit_price?: number | null;
  total_price?: number | null;
  currency?: string | null;
};

export type QuotesPage = {
  items: QuoteItem[];
  total: number;
  page: number;
  size: number;
};

export async function getMyQuotes(page = 1, size = 20): Promise<QuotesPage> {
  const res = await authFetch(`/api/hp/account/quotes?page=${page}&size=${size}`);
  const data = (await res.json()) as QuotesPage & { detail?: unknown };
  if (!res.ok) throw new Error(parseApiError(data.detail, 'Failed to load quotes'));
  return data;
}

export async function updateProfile(body: {
  full_name?: string;
  company_name?: string;
  phone?: string;
}): Promise<UserPublic> {
  const res = await authFetch('/api/hp/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as UserPublic & { detail?: unknown };
  if (!res.ok) throw new Error(parseApiError(data.detail, 'Failed to update profile'));
  return data;
}

export async function changePassword(body: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<string> {
  const res = await authFetch('/api/hp/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { message?: string; detail?: unknown };
  if (!res.ok) throw new Error(parseApiError(data.detail, 'Failed to change password'));
  return data.message ?? '';
}

export async function deleteAccount(): Promise<void> {
  const res = await authFetch('/api/hp/auth/account', { method: 'DELETE' });
  if (!res.ok) {
    const data = (await res.json()) as { detail?: unknown };
    throw new Error(parseApiError(data.detail, 'Failed to delete account'));
  }
}

export async function getWizardQuoteHistory(): Promise<QuoteItem[]> {
  const res = await authFetch('/api/hp/account/quotes?page=1&size=100');
  const data = (await res.json()) as QuotesPage & { detail?: unknown };
  if (!res.ok) throw new Error(parseApiError(data.detail, 'Failed to load wizard quotes'));
  return data.items.filter((item) => item.source === 'wizard');
}

export async function getCatalogDownloadUrl(fileId: string): Promise<string> {
  const res = await authFetch(`/api/hp/account/catalog-url?file=${encodeURIComponent(fileId)}`);
  const data = (await res.json()) as { url?: string; detail?: unknown };
  if (!res.ok) throw new Error(parseApiError(data.detail, 'Failed to get download URL'));
  return data.url ?? '';
}

export async function getPublicDownloadUrl(fileId: string): Promise<string> {
  const res = await fetch(`/api/account/public-download-url?file=${encodeURIComponent(fileId)}`);
  const data = (await res.json()) as { url?: string; detail?: unknown };
  if (!res.ok) throw new Error(parseApiError(data.detail, 'Failed to get download URL'));
  return data.url ?? '';
}
