import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';
  if (window.__afterlifeSharedProfileBooted) return;
  window.__afterlifeSharedProfileBooted = true;

  const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
  const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const HANDOFF_KEY = 'afterlife_portal_handoff';
  const $ = (id) => document.getElementById(id);
  const initials = (name) => String(name || 'Sobrevivente').trim().charAt(0).toUpperCase() || 'S';
  let sharedState = { name: '', avatarUrl: '', email: '' };
  let syncing = false;

  function injectProfilePresentationFix() {
    if (document.getElementById('afterlife-shared-profile-presentation-fix')) return;
    const style = document.createElement('style');
    style.id = 'afterlife-shared-profile-presentation-fix';
    style.textContent = `
      .profile-chip{display:flex!important;align-items:center!important;visibility:visible!important}
      .afterlife-profile-dropdown:not([hidden]),.afterlife-profile-menu:not([hidden]),.afterlife-account-menu:not([hidden]),.afterlife-global-profile-menu:not([hidden]){display:block!important;visibility:visible!important}
      .profile-avatar,.afterlife-global-profile-avatar,.afterlife-profile-avatar,.profile-dropdown-head .profile-avatar,.afterlife-account-avatar{position:relative!important;overflow:hidden!important;display:grid!important;place-items:center!important;border-radius:50%!important}
      .profile-avatar img,.afterlife-global-profile-avatar img,.afterlife-profile-avatar img,.profile-dropdown-head .profile-avatar img,.afterlife-account-avatar img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;object-position:center!important;border-radius:50%!important;display:block!important}
      .afterlife-profile-dropdown .profile-avatar--large,.afterlife-profile-dropdown .profile-dropdown-head .profile-avatar--large{width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;border-radius:50%!important}
      .afterlife-global-profile-menu .afterlife-global-profile-avatar{border-radius:50%!important}
      .afterlife-global-profile-menu .afterlife-global-profile-avatar img{border-radius:50%!important}
    `;
    document.head.appendChild(style);
  }

  function setAvatar(el, url, name, large = false) {
    if (!el || syncing) return;
    syncing = true;
    try {
      el.replaceChildren();
      if (!url) {
        el.textContent = initials(name);
      } else {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.loading = 'eager';
        img.decoding = 'async';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
        img.onerror = () => {
          el.dataset.sharedAvatarFailed = '1';
          el.replaceChildren();
          el.textContent = initials(name);
        };
        el.appendChild(img);
      }
      if (large) el.style.borderRadius = '50%';
    } finally {
      syncing = false;
    }
  }

  function setProfile(name, avatarUrl, email) {
    const display = name || 'Sobrevivente';
    sharedState = { name: display, avatarUrl: avatarUrl || '', email: email || '' };
    ['profileName', 'profileDropdownName', 'profileMenuName', 'afterlifeGlobalProfileName'].forEach((id) => {
      const el = $(id);
      if (el) el.textContent = display;
    });
    ['profileDropdownEmail', 'profileMenuEmail', 'afterlifeGlobalProfileEmail'].forEach((id) => {
      const el = $(id);
      if (el) el.textContent = email || 'Conta';
    });
    setAvatar($('profileAvatar'), avatarUrl, display);
    setAvatar($('profileDropdownAvatar'), avatarUrl, display, true);
    setAvatar($('profileMenuAvatar'), avatarUrl, display, true);
    setAvatar($('afterlifeGlobalProfileAvatar'), avatarUrl, display, true);
  }

  function avatarNeedsRepair(el) {
    if (!el || !sharedState.avatarUrl || el.dataset.sharedAvatarFailed === '1') return false;
    const img = el.querySelector('img');
    return !img || img.src !== sharedState.avatarUrl;
  }

  function startAvatarGuard() {
    const observer = new MutationObserver(() => {
      if (syncing || !sharedState.avatarUrl) return;
      const targets = [
        $('profileAvatar'), $('profileDropdownAvatar'), $('profileMenuAvatar'), $('afterlifeGlobalProfileAvatar')
      ].filter(Boolean);
      targets.forEach((target) => {
        if (avatarNeedsRepair(target)) setAvatar(target, sharedState.avatarUrl, sharedState.name, target.id !== 'profileAvatar');
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function portalProfile() {
    const portal = createClient(PORTAL_URL, PORTAL_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    let session = null;
    try {
      const current = await portal.auth.getSession();
      session = current.data?.session || null;
    } catch {}

    if (!session) {
      try {
        const raw = localStorage.getItem(HANDOFF_KEY);
        if (raw) {
          const handoff = JSON.parse(raw);
          if (handoff?.access_token && handoff?.refresh_token) {
            const restored = await portal.auth.setSession({
              access_token: handoff.access_token,
              refresh_token: handoff.refresh_token
            });
            session = restored.data?.session || null;
          }
        }
      } catch {}
    }

    if (!session?.user) return null;
    const user = session.user;
    const { data: profile } = await portal.from('profiles')
      .select('id,display_name,avatar_path')
      .eq('id', user.id)
      .maybeSingle();

    const name = profile?.display_name || user.user_metadata?.display_name ||
      user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sobrevivente';
    let avatarUrl = '';
    if (profile?.avatar_path) {
      const signed = await portal.storage.from('avatars').createSignedUrl(profile.avatar_path, 3600);
      avatarUrl = signed.data?.signedUrl || '';
    }
    return { name, avatarUrl, email: user.email || '' };
  }

  function bindDropdown() {
    const chip = $('profileChip');
    if (!chip || chip.dataset.sharedProfileBound === '1') return;
    const menu = $('profileDropdown') || $('profileMenu') || $('afterlifeGlobalProfileMenu');
    if (!menu) return;
    chip.dataset.sharedProfileBound = '1';
    chip.setAttribute('aria-expanded', chip.getAttribute('aria-expanded') || 'false');

    chip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      menu.setAttribute('aria-hidden', String(!open));
      chip.setAttribute('aria-expanded', String(open));
    }, true);

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !chip.contains(event.target)) {
        menu.hidden = true;
        menu.setAttribute('aria-hidden', 'true');
        chip.setAttribute('aria-expanded', 'false');
      }
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        menu.hidden = true;
        menu.setAttribute('aria-hidden', 'true');
        chip.setAttribute('aria-expanded', 'false');
      }
    });
  }

  async function boot() {
    injectProfilePresentationFix();
    startAvatarGuard();
    bindDropdown();
    try {
      const shared = await portalProfile();
      if (shared) setProfile(shared.name, shared.avatarUrl, shared.email);
    } catch (error) {
      console.warn('[AFTERLIFE] perfil compartilhado:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
