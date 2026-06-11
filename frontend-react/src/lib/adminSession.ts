/** Admin JWT — 메모리만 (sessionStorage 미사용) */
let adminAccessToken: string | null = null;

export function getAdminToken(): string | null {
  return adminAccessToken;
}

export function setAdminToken(token: string | null): void {
  adminAccessToken = token;
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAdminToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`/admin/api${path}`, { ...init, headers, credentials: 'include' });
}
