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

  function open() {
    const sidebar = $('sidebar');
    const button = ensureButton();
    if (!sidebar || !isMobile()) return;
    const backdrop = ensureBackdrop();
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('afterlife-sidebar-open');
    button?.setAttribute('aria-expanded', 'true');
  }

  function close() {
    const sidebar = $('sidebar');
    const backdrop = $('afterlifeSidebarBackdrop');
    const button = ensureButton();
    sidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.classList.remove('afterlife-sidebar-open');
    button?.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    const sidebar = $('sidebar');
    if (!isMobile()) return;
    sidebar?.classList.contains('is-open') ? close() : open();
  }

  function boot() {
    const button = ensureButton();
    if (!button || button.dataset.afterlifeSidebarBound === '1') return;
    button.dataset.afterlifeSidebarBound = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    document.querySelectorAll('.side-nav__item').forEach((item) => {
      item.addEventListener('click', () => {
        if (isMobile()) close();
      });
    });

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
