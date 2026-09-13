(() => {
  'use strict';
  if (window.__afterlifeSidebarBooted) return;
  window.__afterlifeSidebarBooted = true;

  const BREAKPOINT = 980;
  const $ = (id) => document.getElementById(id);

  function isMobile() {
    return window.matchMedia ? window.matchMedia(`(max-width:${BREAKPOINT}px)`).matches : window.innerWidth <= BREAKPOINT;
  }

  function ensureButton() {
    const button = $('mobileMenu');
    if (!button || button.dataset.afterlifeSidebarReady === '1') return button;
    button.dataset.afterlifeSidebarReady = '1';
    button.innerHTML = '<span aria-hidden="true"></span>';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'sidebar');
    button.setAttribute('aria-label', 'Abrir menu');
    return button;
  }

  function ensureBackdrop() {
    let backdrop = $('afterlifeSidebarBackdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('button');
    backdrop.id = 'afterlifeSidebarBackdrop';
    backdrop.type = 'button';
    backdrop.className = 'afterlife-sidebar-backdrop';
    backdrop.setAttribute('aria-label', 'Fechar menu lateral');
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', close);
    return backdrop;
  }

  function setButtonState(open) {
    const button = ensureButton();
    button?.setAttribute('aria-expanded', String(open));
    button?.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  function open() {
    const sidebar = $('sidebar');
    const button = ensureButton();
    if (!sidebar || !isMobile()) return;
    const backdrop = ensureBackdrop();
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('afterlife-sidebar-open');
    setButtonState(true);
  }

  function close() {
    const sidebar = $('sidebar');
    const backdrop = $('afterlifeSidebarBackdrop');
    sidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.classList.remove('afterlife-sidebar-open');
    setButtonState(false);
  }

  function toggle() {
    if (!isMobile()) return;
    const sidebar = $('sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('is-open')) close();
    else open();
  }

  function boot() {
    const button = ensureButton();
    if (!button || button.dataset.afterlifeSidebarBound === '1') return;
    button.dataset.afterlifeSidebarBound = '1';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }, true);

    document.addEventListener('click', (event) => {
      if (!isMobile()) return;
      const sidebar = $('sidebar');
      const backdrop = $('afterlifeSidebarBackdrop');
      if (!sidebar?.classList.contains('is-open')) return;
      const target = event.target;
      if (button.contains(target) || sidebar.contains(target) || backdrop?.contains(target)) return;
      close();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) close();
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
