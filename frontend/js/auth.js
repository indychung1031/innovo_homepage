'use strict';

window.InnovoAuth = {
  saveToken(token) {
    sessionStorage.setItem('innovo_access_token', token);
  },
  getToken() {
    return sessionStorage.getItem('innovo_access_token');
  },
  clearToken() {
    sessionStorage.removeItem('innovo_access_token');
  },
};
