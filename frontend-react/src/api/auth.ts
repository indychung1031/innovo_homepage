import { parseApiError } from '@/api/errors';
import { authFetch, setAccessToken } from '@/lib/authSession';
import type { LangCode } from '@/lib/lang';

export type UserPublic = {
  id: number;
  email: string;
  full_name: string;
  company_name: string;
  membership_tier: string;
  email_verified: boolean;
};

type LoginResponse = {
  access_token: string;
  expires_in: number;
  user: UserPublic;
};

type MessageResponse = {
  message: string;
};

function applyLoginResponse(data: LoginResponse): UserPublic {
  setAccessToken(data.access_token);
  return data.user;
}

export async function login(email: string, password: string): Promise<UserPublic> {
  const res = await authFetch('/api/hp/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginResponse & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Login failed'));
  }
  return applyLoginResponse(data);
}

export async function refreshSession(): Promise<UserPublic> {
  const res = await authFetch('/api/hp/auth/refresh', { method: 'POST' });
  const data = (await res.json()) as LoginResponse & { detail?: unknown };
  if (!res.ok) {
    setAccessToken(null);
    throw new Error(parseApiError(data.detail, 'Session expired'));
  }
  return applyLoginResponse(data);
}

export async function fetchMe(): Promise<UserPublic> {
  const res = await authFetch('/api/hp/auth/me');
  const data = (await res.json()) as UserPublic & { detail?: unknown };
  if (!res.ok) {
    setAccessToken(null);
    throw new Error(parseApiError(data.detail, 'Not authenticated'));
  }
  return data;
}

export async function logout(): Promise<void> {
  try {
    await authFetch('/api/hp/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export type RegisterPayload = {
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  privacy_agreed: boolean;
  terms_agreed: boolean;
  recaptcha_token: string;
  lang: LangCode;
};

export async function register(payload: RegisterPayload): Promise<string> {
  const res = await fetch('/api/hp/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as MessageResponse & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Registration failed'));
  }
  return data.message;
}

export async function forgotPassword(email: string, lang: LangCode): Promise<string> {
  const res = await fetch('/api/hp/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, lang }),
  });
  const data = (await res.json()) as MessageResponse & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Request failed'));
  }
  return data.message;
}

export async function resetPassword(
  token: string,
  newPassword: string,
  newPasswordConfirm: string,
): Promise<string> {
  const res = await fetch('/api/hp/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    }),
  });
  const data = (await res.json()) as MessageResponse & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Reset failed'));
  }
  return data.message;
}

export async function verifyEmail(token: string): Promise<string> {
  const res = await fetch(`/api/hp/auth/verify-email?token=${encodeURIComponent(token)}`);
  const data = (await res.json()) as MessageResponse & { detail?: unknown };
  if (!res.ok) {
    throw new Error(parseApiError(data.detail, 'Verification failed'));
  }
  return data.message;
}
