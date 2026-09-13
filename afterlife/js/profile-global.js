(() => {
'use strict';
if (window.__afterlifeGlobalProfileBooted) return;
window.__afterlifeGlobalProfileBooted = true;

const $ = (id) => document.getElementById(id);
const initial = (name) => String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
let chip = null;
let menu = null;
let currentUser = null;
let currentProfile = null;
let refreshTimer = null;

function loadCss() {
  if (document.querySelector('link[data-afterlife-profile-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './css/afterlife-profile-global.css?v=20260913-10';
  link.dataset.afterlifeProfileCss = '1';
  document.head.appendChild(link);
}

function setAvatar(box, url, name) {
  if (!box) return;
  box.replaceChildren();
  if (!url) {
    box.textContent = initial(name);
    return;
  }
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.loading = 'eager';
  img.onerror = () => {
    box.replaceChildren();
    box.textContent = initial(name);
  };
  box.appendChild(img);
}

function applyBrandLogo() {
  const brand = document.querySelector('.brand__title');
  if (!brand || brand.dataset.afterlifeLogoApplied === '1') return;
  brand.dataset.afterlifeLogoApplied = '1';
  brand.replaceChildren();
  const img = document.createElement('img');
  img.src = './assets/afterlife-logo.svg?v=20260913-1';
  img.alt = 'AFTERLIFE — Sobrevivência além do fim';
  img.decoding = 'async';
  img.style.display = 'block';
  img.style.width = '165px';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.objectFit = 'contain';
  brand.appendChild(img);
}

function applyCombatAnimationFix() {
  if (!document.body?.classList.contains('character-builder')) return;
  if (document.getElementById('afterlife-combat-animation-fix')) return;

  const style = document.createElement('style');
  style.id = 'afterlife-combat-animation-fix';
  style.textContent = `
    /* O arco gira; o símbolo central permanece estático. */
    .character-builder .combat-status-ring{animation:none!important;transform:none!important}
    .character-builder .combat-status-ring::before{transform-origin:50% 50%!important}
    .character-builder .combat-status-ring::before{animation:afterlifeGlobalStatusArcSpin 2.2s linear infinite!important}
    .character-builder .combat-status-icon{transform:none!important}
    @keyframes afterlifeGlobalStatusArcSpin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(style);
}

function startCombatAnimationGuard() {
  if (!document.body?.classList.contains('character-builder')) return;
  const tryFix = () => applyCombatAnimationFix();
  tryFix();
  requestAnimationFrame(tryFix);
  setTimeout(tryFix, 0);
  setTimeout(tryFix, 50);
  const observer = new MutationObserver(() => {
    if (document.getElementById('afterlife-combat-animation-fix')) {
      observer.disconnect();
      return;
    }
    tryFix();
  });
  observer.observe(document.head, { childList: true });
}

function findElements() {
  chip = $('profileChip') || document.querySelector('.profile-chip');
  if (!chip) return false;
  chip.classList.add('afterlife-global-profile-chip');

  const wrap = chip.closest('.profile-wrap') || chip.parentElement;
  wrap?.classList.add('afterlife-global-profile-wrap');

  menu = $('profileMenu') || $('profileDropdown') || $('afterlifeGlobalProfileMenu') || document.querySelector('.afterlife-profile-menu, .afterlife-profile-dropdown, .afterlife-account-menu');

  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'afterlifeGlobalProfileMenu';
    menu.className = 'afterlife-global-profile-menu';
    menu.innerHTML = `
      <div class="afterlife-global-profile-head">
        <span class="afterlife-global-profile-avatar" id="afterlifeGlobalProfileAvatar">A</span>
        <div>
          <strong id="afterlifeGlobalProfileName">Sobrevivente</strong>
          <small id="afterlifeGlobalProfileEmail">Conta Afterlife</small>
        </div>
      </div>
      <div class="afterlife-global-profile-actions">
        <a href="./perfil.html">Editar perfil</a>
        <a href="../index.html">Trocar sistema</a>
        <button type="button" class="danger" id="afterlifeGlobalLogout">Sair da conta</button>
      </div>`;
    (wrap || document.querySelector('.top-actions') || document.body).appendChild(menu);
  }

  menu.classList.add('afterlife-global-profile-menu');
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  return true;
}

function setProfile(name, avatarUrl, email) {
  const display = name || 'Sobrevivente';
  ['profileName', 'profileDropdownName', 'profileMenuName', 'afterlifeGlobalProfileName'].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = display;
  });
  ['profileDropdownEmail', 'profileMenuEmail', 'afterlifeGlobalProfileEmail'].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = email || 'Conta Afterlife';
  });

  setAvatar($('profileAvatar'), avatarUrl, display);
  setAvatar($('profileDropdownAvatar'), avatarUrl, display);
  setAvatar($('profileMenuAvatar'), avatarUrl, display);
  setAvatar($('afterlifeGlobalProfileAvatar'), avatarUrl, display);
}

function toggle(open) {
  if (!chip || !menu) return;
  const state = typeof open === 'boolean' ? open : menu.hidden;
  menu.hidden = !state;
  menu.setAttribute('aria-hidden', String(!state));
  chip.setAttribute('aria-expanded', String(state));
}

async function getClient() {
  const mod = await import('./aeriom-client.js');
  return mod.aeriom;
}

async function loadProfile() {
  try {
    const sb = await getClient();
    const { data: sessionData } = await sb.auth.getSession();
    currentUser = sessionData?.session?.user || null;

    if (!currentUser) {
      setProfile('Sobrevivente', '', 'Faça login no AERIOM');
      return;
    }

    let name = currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Sobrevivente';
    const { data, error } = await sb.from('profiles').select('id,display_name,avatar_path').eq('id', currentUser.id).maybeSingle();
    if (error) throw error;

    currentProfile = data || { id: currentUser.id, display_name: name, avatar_path: null };
    if (data?.display_name) name = data.display_name;

    // Garante que toda conta autenticada tenha um registro no perfil compartilhado.
    if (!data) {
      const { data: created } = await sb.from('profiles').upsert({
        id: currentUser.id,
        display_name: name,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).select('id,display_name,avatar_path').single();
      if (created) currentProfile = created;
    }

    let avatarUrl = '';
    if (currentProfile?.avatar_path) {
      const signed = await sb.storage.from('avatars').createSignedUrl(currentProfile.avatar_path, 3600);
      avatarUrl = signed.data?.signedUrl || '';
    }

    setProfile(name, avatarUrl, currentUser.email || 'Conta Afterlife');
  } catch (error) {
    console.warn('[AFTERLIFE] perfil global:', error);
    setProfile('Sobrevivente', '', currentUser?.email || 'Conta Afterlife');
  }
}

async function logout(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  try {
    const sb = await getClient();
    await sb.auth.signOut();
  } finally {
    location.replace('../index.html');
  }
}

function bind() {
  if (!chip || !menu || chip.dataset.afterlifeProfileBound === '1') return;
  chip.dataset.afterlifeProfileBound = '1';

  // Um único controlador global. Listeners antigos/locais não recebem o clique.
  chip.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    toggle();
  }, true);

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && !chip.contains(event.target)) toggle(false);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') toggle(false);
  });

  menu.addEventListener('click', (event) => {
    event.stopPropagation();
  }, true);

  menu.querySelector('#profileLogout, #profileSignOut, #afterlifeGlobalLogout')?.addEventListener('click', logout, true);
}

function bindAuthListener() {
  if (window.__afterlifeGlobalProfileAuthBound) return;
  window.__afterlifeGlobalProfileAuthBound = true;
  getClient().then((sb) => {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') loadProfile();
      if (event === 'SIGNED_OUT') setProfile('Sobrevivente', '', 'Faça login no AERIOM');
    });
  }).catch(() => {});
}

async function boot() {
  loadCss();
  applyBrandLogo();
  startCombatAnimationGuard();
  if (!findElements()) return;
  bind();
  bindAuthListener();
  await loadProfile();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadProfile, 120000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
})();
