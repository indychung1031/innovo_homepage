'use strict';

window.InnovoAdmin = {
  TOKEN_KEY: 'innovo_admin_token',
  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },
  setToken(t) {
    sessionStorage.setItem(this.TOKEN_KEY, t);
  },
  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
  },
  authHeaders() {
    const t = this.getToken();
    return t ? { Authorization: 'Bearer ' + t } : {};
  },
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = '/admin';
      return false;
    }
    return true;
  },
  async api(path, options) {
    const res = await fetch('/admin/api' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...this.authHeaders(), ...(options && options.headers) },
    });
    if (res.status === 401) {
      this.clearToken();
      window.location.href = '/admin';
      return null;
    }
    return res;
  },
};
