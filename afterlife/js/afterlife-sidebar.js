import './error-monitor.js?v=20260914-1';
import './aeriom-client.js?v=20260914-31';
import './shared-profile.js?v=20260914-2';

(() => {
  'use strict';
  if (window.__afterlifeSidebarBooted) return;
  window.__afterlifeSidebarBooted = true;

  const BREAKPOINT = 980;
  const $ = (id) => document.getElementById(id);
  let dragStartX = null;
  let dragStartY = null;
  let dragActive = false;

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
    dragStartX = null;
    dragStartY = null;
    dragActive = false;
  }

  function toggle() {
    if (!isMobile()) return;
    const sidebar = $('sidebar');
    if (!sidebar) return;
    if (sidebar.classList.contains('is-open')) close();
    else open();
  }

  function normalizeNavigation() {
    document.querySelectorAll('.side-nav__item').forEach((link) => {
      const label = link.querySelector('span:last-child')?.textContent?.trim().toLowerCase();
      if (label === 'personagens') link.setAttribute('href', './personagens.html');
    });
  }

  function boot() {
    const button = ensureButton();
    const sidebar = $('sidebar');
    if (!button || !sidebar || button.dataset.afterlifeSidebarBound === '1') return;
    button.dataset.afterlifeSidebarBound = '1';
    normalizeNavigation();

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }, true);

    document.addEventListener('click', (event) => {
      if (!isMobile()) return;
      const currentSidebar = $('sidebar');
      const backdrop = $('afterlifeSidebarBackdrop');
      if (!currentSidebar?.classList.contains('is-open')) return;
      const target = event.target;
      if (button.contains(target) || currentSidebar.contains(target)) return;
      if (backdrop?.contains(target)) return;
      close();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    sidebar.addEventListener('touchstart', (event) => {
      if (!isMobile() || !sidebar.classList.contains('is-open')) return;
      if (!event.touches?.length) return;
      const touch = event.touches[0];
      dragStartX = touch.clientX;
      dragStartY = touch.clientY;
      dragActive = true;
      sidebar.classList.add('is-dragging');
    }, { passive: true });

    sidebar.addEventListener('touchmove', (event) => {
      if (!dragActive || dragStartX == null || !event.touches?.length || !isMobile()) return;
      const touch = event.touches[0];
      const dx = touch.clientX - dragStartX;
      const dy = touch.clientY - dragStartY;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
        dragActive = false;
        sidebar.classList.remove('is-dragging');
        return;
      }
      if (dx >= 0) return;
      const width = sidebar.getBoundingClientRect().width || 300;
      const progress = Math.max(0, Math.min(1, Math.abs(dx) / width));
      sidebar.style.setProperty('--afterlife-drag-x', `${dx}px`);
      sidebar.style.setProperty('--afterlife-drag-progress', String(1 - progress));
      $('afterlifeSidebarBackdrop')?.style.setProperty('opacity', String(Math.max(0, 1 - progress)));
    }, { passive: true });

    sidebar.addEventListener('touchend', () => {
      if (!dragActive) return;
      const dx = parseFloat(sidebar.style.getPropertyValue('--afterlife-drag-x')) || 0;
      sidebar.classList.remove('is-dragging');
      sidebar.style.removeProperty('--afterlife-drag-x');
      sidebar.style.removeProperty('--afterlife-drag-progress');
      $('afterlifeSidebarBackdrop')?.style.removeProperty('opacity');
      dragActive = false;
      if (dx < -70) close();
      dragStartX = null;
      dragStartY = null;
    }, { passive: true });

    sidebar.addEventListener('touchcancel', () => {
      sidebar.classList.remove('is-dragging');
      sidebar.style.removeProperty('--afterlife-drag-x');
      sidebar.style.removeProperty('--afterlife-drag-progress');
      $('afterlifeSidebarBackdrop')?.style.removeProperty('opacity');
      dragActive = false;
      dragStartX = null;
      dragStartY = null;
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!isMobile()) close();
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
