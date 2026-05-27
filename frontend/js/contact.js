'use strict';

(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const LANG = document.documentElement.lang || 'en';
  const RECAPTCHA_KEY = form.dataset.recaptchaKey || '';

  async function getRecaptchaToken() {
    if (!RECAPTCHA_KEY || !window.grecaptcha) return 'dev-skip-token';
    return grecaptcha.execute(RECAPTCHA_KEY, { action: 'contact' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const msg = document.getElementById('contactResult');
    btn.disabled = true;
    if (msg) msg.classList.add('hidden');

    const payload = {
      category: document.getElementById('category').value,
      company_name: document.getElementById('company_name').value.trim(),
      contact_name: document.getElementById('contact_name').value.trim(),
      contact_email: document.getElementById('contact_email').value.trim(),
      contact_phone: document.getElementById('contact_phone').value.trim() || null,
      subject: document.getElementById('subject').value.trim(),
      message: document.getElementById('message').value.trim(),
      privacy_agreed: document.getElementById('privacy_agreed').checked,
      recaptcha_token: await getRecaptchaToken(),
      lang: LANG,
    };

    const fd = new FormData();
    fd.append('data', JSON.stringify(payload));
    const fileInput = document.getElementById('attachment');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      fd.append('file', fileInput.files[0]);
    }

    try {
      const res = await fetch('/api/contact', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      if (msg) {
        msg.textContent = data.message;
        msg.className = 'mt-4 p-3 rounded text-sm bg-green-50 text-green-800';
        msg.classList.remove('hidden');
      }
      form.reset();
    } catch (err) {
      if (msg) {
        msg.textContent = err.message || 'Submit failed';
        msg.className = 'mt-4 p-3 rounded text-sm bg-red-50 text-red-800';
        msg.classList.remove('hidden');
      }
    } finally {
      btn.disabled = false;
    }
  });
})();
