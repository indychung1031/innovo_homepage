'use strict';

(function () {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('siteNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    const open = nav.classList.toggle('hidden');
    const isOpen = !nav.classList.contains('hidden');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      nav.classList.add('flex', 'flex-col', 'absolute', 'left-0', 'right-0', 'top-full', 'bg-white', 'text-charcoal', 'border-t', 'border-gray-light', 'px-4', 'pb-4', 'shadow-lg', 'gap-3');
    } else {
      nav.classList.remove('flex', 'flex-col', 'absolute', 'left-0', 'right-0', 'top-full', 'bg-white', 'text-charcoal', 'border-t', 'border-gray-light', 'px-4', 'pb-4', 'shadow-lg', 'gap-3');
      if (window.matchMedia('(min-width: 768px)').matches) {
        nav.classList.add('md:flex');
      }
    }
  });

  document.querySelectorAll('.products-trigger').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (window.matchMedia('(min-width: 768px)').matches) return;
      e.preventDefault();
      const dropdown = btn.parentElement.querySelector('.products-dropdown');
      if (dropdown) dropdown.classList.toggle('hidden');
    });
  });
})();
