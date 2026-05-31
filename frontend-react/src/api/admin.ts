import { parseApiError } from '@/api/errors';
import { adminFetch, setAdminToken } from '@/lib/adminSession';

export type AdminStaff = {
  id: number;
  email: string;
  display_name: string;
  roles: string[];
};

export async function adminLogin(email: string, password: string): Promise<string> {
  const res = await adminFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { challenge_token?: string; detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Login failed'));
  }
  return data.challenge_token!;
}

export async function adminVerify2fa(challengeToken: string, otpCode: string): Promise<AdminStaff> {
  const res = await adminFetch('/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ challenge_token: challengeToken, otp_code: otpCode }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    staff?: AdminStaff;
    detail?: unknown;
  };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Invalid code'));
  }
  setAdminToken(data.access_token!);
  return data.staff!;
}

export async function adminFetchMe(): Promise<AdminStaff> {
  const res = await adminFetch('/me');
  const data = (await res.json()) as AdminStaff & { detail?: unknown };
  if (!res.ok) {
    setAdminToken(null);
    throw new Error(parseApiError(data.detail, 'Not authenticated'));
  }
  return data;
}

export function adminLogout(): void {
  setAdminToken(null);
}

export type Paginated<T> = { total: number; page: number; items: T[] };

export async function listQuickQuotes(page = 1, size = 50): Promise<Paginated<QuickQuoteRow>> {
  const res = await adminFetch(`/quick-quotes?page=${page}&size=${size}`);
  return parseAdminJson(res);
}

export type QuickQuoteRow = {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  ic_code: string | null;
  ic_package_type: string;
  pin_count: number;
  pitch: string;
  status: string;
  created_at: string;
};

export type QuickQuoteDetail = QuickQuoteRow & {
  ic_type: string | null;
  package_d: number;
  package_e: number;
  package_a: number | null;
  contact_phone: string | null;
  quantity: number | null;
  desired_delivery: string | null;
  message: string | null;
  admin_note: string | null;
};

export async function getQuickQuote(id: number): Promise<QuickQuoteDetail> {
  const res = await adminFetch(`/quick-quotes/${id}`);
  return parseAdminJson(res);
}

export type ContactRow = {
  id: number;
  category: string;
  company_name: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string;
  subject: string;
  message: string;
  status: string;
  contact_count: number;
  created_at: string;
};

export async function listContacts(page = 1, size = 50): Promise<Paginated<ContactRow>> {
  const res = await adminFetch(`/contacts?page=${page}&size=${size}`);
  return parseAdminJson(res);
}

export type ContactDetail = {
  id: number;
  category: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  subject: string;
  message: string;
  status: string;
  admin_note: string | null;
  attachment_name: string | null;
  has_attachment: boolean;
  created_at: string;
  other_contacts: { id: number; subject: string; created_at: string }[];
};

export async function getContactDetail(id: number): Promise<ContactDetail> {
  const res = await adminFetch(`/contacts/${id}/detail`);
  return parseAdminJson(res);
}

export async function downloadContactAttachment(id: number): Promise<Blob> {
  const res = await adminFetch(`/contacts/${id}/attachment`);
  if (!res.ok) {
    throw new Error('Download failed');
  }
  return res.blob();
}

export type UserRow = {
  id: number;
  email: string;
  company_name: string;
  membership_tier: string;
  email_verified: boolean;
  created_at: string;
};

export async function listUsers(page = 1, size = 50): Promise<Paginated<UserRow>> {
  const res = await adminFetch(`/users?page=${page}&size=${size}`);
  return parseAdminJson(res);
}

export async function patchUserMembership(userId: number, membershipTier: string): Promise<void> {
  const res = await adminFetch(`/users/${userId}/membership`, {
    method: 'PATCH',
    body: JSON.stringify({ membership_tier: membershipTier }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { detail?: unknown };
    throw new Error(parseApiError(data.detail, 'Update failed'));
  }
}

export async function deleteUser(userId: number): Promise<void> {
  const res = await adminFetch(`/users/${userId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = (await res.json()) as { detail?: unknown };
    throw new Error(parseApiError(data.detail, 'Delete failed'));
  }
}

async function parseAdminJson<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    setAdminToken(null);
    throw new Error('ADMIN_UNAUTHORIZED');
  }
  const data = (await res.json()) as T & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Request failed'));
  }
  return data;
}
