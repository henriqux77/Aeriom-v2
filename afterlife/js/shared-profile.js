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

  function setAvatar(el, url, name, large = false) {
    if (!el) return;
    el.replaceChildren();
    if (!url) {
      el.textContent = initials(name);
      return;
    }
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
      el.replaceChildren();
      el.textContent = initials(name);
    };
    el.appendChild(img);
    if (large) el.style.borderRadius = '50%';
  }

  function setProfile(name, avatarUrl, email) {
    const display = name || 'Sobrevivente';
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
    bindDropdown();
    try {
      const shared = await portalProfile();
      if (shared) {
        setProfile(shared.name, shared.avatarUrl, shared.email);
      }
    } catch (error) {
      console.warn('[AFTERLIFE] perfil compartilhado:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
