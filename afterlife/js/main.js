import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';

  const SUPABASE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const sidebar = document.getElementById('sidebar');
  const mobileMenu = document.getElementById('mobileMenu');
  const clock = document.getElementById('clock');
  const continueBtn = document.getElementById('continueBtn');
  const profileCopy = document.querySelector('.profile-copy strong');

  const boot = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      location.replace(`./entrar.html?next=${next}`);
      return;
    }

    const user = data.session.user;
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Sobrevivente';
    if (profileCopy) profileCopy.textContent = displayName;
    document.body.dataset.authenticated = 'true';
  };

  void boot();

  mobileMenu?.addEventListener('click', () => {
    sidebar?.classList.toggle('is-open');
  });

  document.querySelectorAll('.side-nav__item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.side-nav__item').forEach((nav) => nav.classList.remove('is-active'));
      item.classList.add('is-active');
      sidebar?.classList.remove('is-open');
    });
  });

  const updateClock = () => {
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  updateClock();
  window.setInterval(updateClock, 1000);

  continueBtn?.addEventListener('click', () => {
    const target = document.getElementById('campanhas');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('.btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const el = event.currentTarget;
      if (!(el instanceof HTMLButtonElement)) return;
      if (el.id === 'continueBtn') return;
      if (el.dataset.feedback === 'done') return;
      el.dataset.feedback = 'done';
      const original = el.textContent;
      el.textContent = 'EM BREVE';
      window.setTimeout(() => {
        el.textContent = original;
        delete el.dataset.feedback;
      }, 950);
    });
  });

  const search = document.querySelector('.search-box input');
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search?.focus();
    }
  });
})();
