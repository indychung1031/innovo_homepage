'use strict';

document.querySelectorAll('[data-faq-toggle]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const panel = btn.nextElementSibling;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    if (panel) panel.classList.toggle('hidden');
  });
});
