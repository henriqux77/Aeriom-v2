import './profile-global.js';

(() => {
  'use strict';

  const sidebar = document.getElementById('sidebar');
  const mobileMenu = document.getElementById('mobileMenu');
  const clock = document.getElementById('clock');
  const continueBtn = document.getElementById('continueBtn');

  const boot = () => {
    mobileMenu?.addEventListener('click', () => sidebar?.classList.toggle('is-open'));

    document.querySelectorAll('.side-nav__item').forEach(item => item.addEventListener('click', () => {
      document.querySelectorAll('.side-nav__item').forEach(nav => nav.classList.remove('is-active'));
      item.classList.add('is-active');
      sidebar?.classList.remove('is-open');
    }));

    const updateClock = () => {
      if (clock) {
        clock.textContent = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    };
    updateClock();
    window.setInterval(updateClock, 1000);

    continueBtn?.addEventListener('click', () => {
      document.getElementById('campanhas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const search = document.querySelector('.search-box input');
    window.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search?.focus();
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
