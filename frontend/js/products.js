'use strict';

document.querySelectorAll('[data-spec-toggle]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const targetId = btn.getAttribute('aria-controls');
    const panel = targetId ? document.getElementById(targetId) : null;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    if (panel) panel.classList.toggle('hidden');
  });
});
