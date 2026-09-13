import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';

  const AFTERLIFE_SUPABASE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
  const AFTERLIFE_SUPABASE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
  const AERIOM_SUPABASE_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
  const AERIOM_SUPABASE_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';

  const supabase = createClient(AFTERLIFE_SUPABASE_URL, AFTERLIFE_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const aeriom = createClient(AERIOM_SUPABASE_URL, AERIOM_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const sidebar = document.getElementById('sidebar');
  const mobileMenu = document.getElementById('mobileMenu');
  const clock = document.getElementById('clock');
  const continueBtn = document.getElementById('continueBtn');
  const profileChip = document.querySelector('.profile-chip');
  const profileCopy = document.querySelector('.profile-copy strong');
  const profileAvatar = document.querySelector('.profile-avatar');

  const ACCOUNT_STYLE = `
    .afterlife-account-wrap{position:relative;z-index:60}
    .afterlife-account-menu{position:absolute;right:0;top:calc(100% + 10px);width:300px;padding:10px;border:1px solid rgba(127,160,145,.24);border-radius:12px;background:rgba(5,11,9,.985);box-shadow:0 24px 70px rgba(0,0,0,.62);backdrop-filter:blur(18px);opacity:0;transform:translateY(-5px) scale(.98);pointer-events:none;transition:.18s ease}
    .afterlife-account-wrap.is-open .afterlife-account-menu{opacity:1;transform:none;pointer-events:auto}
    .afterlife-account-head{display:flex;align-items:center;gap:11px;padding:9px 9px 12px;border-bottom:1px solid rgba(127,160,145,.13)}
    .afterlife-account-avatar{width:48px;height:48px;border-radius:50%;flex:none;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 25%,#455b51,#121b17 62%,#07100c);border:1px solid rgba(255,255,255,.14);font-weight:800;color:#eff5f1}
    .afterlife-account-avatar img{width:100%;height:100%;display:block;object-fit:cover}
    .afterlife-account-head-copy{min-width:0;display:flex;flex-direction:column}
    .afterlife-account-head-copy strong{font-size:13px;color:#f2f6f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .afterlife-account-head-copy small{margin-top:3px;color:#8d9b94;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .afterlife-account-badge{display:inline-flex;align-items:center;gap:5px;margin-top:4px;color:#62e99c;font-size:9px}
    .afterlife-account-badge i{width:6px;height:6px;border-radius:50%;background:#39f58a;box-shadow:0 0 9px rgba(57,245,138,.7)}
    .afterlife-account-actions{display:grid;gap:4px;padding-top:8px}
    .afterlife-account-actions a,.afterlife-account-actions button{width:100%;padding:10px 9px;border:0;border-radius:8px;background:transparent;color:#dce5df;text-align:left;text-decoration:none;font:600 11px Inter,system-ui;cursor:pointer}
    .afterlife-account-actions a:hover,.afterlife-account-actions button:hover{background:rgba(57,245,138,.06);color:#fff}
    .afterlife-account-actions .danger{color:#ff9e98}
    .profile-avatar img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}
    @media(max-width:620px){.afterlife-account-menu{right:-6px;width:min(300px,calc(100vw - 32px))}.profile-copy{display:none}.profile-chip{padding:5px}.profile-caret{margin-left:0}}
  `;

  const addAccountStyles = () => {
    if (document.getElementById('afterlife-account-style')) return;
    const style = document.createElement('style');
    style.id = 'afterlife-account-style';
    style.textContent = ACCOUNT_STYLE;
    document.head.appendChild(style);
  };

  const initial = (name) => String(name || 'A').trim().charAt(0).toUpperCase() || '?';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));

  const renderTopAvatar = (url, name) => {
    if (!profileAvatar) return;
    profileAvatar.replaceChildren();
    if (!url) {
      profileAvatar.textContent = initial(name);
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      profileAvatar.textContent = initial(name);
    }, { once: true });
    profileAvatar.appendChild(img);
  };

  const loadAvatarFromAeriom = async (avatarPath, user) => {
    if (avatarPath) {
      const { data, error } = await aeriom.storage.from('avatars').createSignedUrl(avatarPath, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;

      try {
        const { data: publicData } = aeriom.storage.from('avatars').getPublicUrl(avatarPath);
        if (publicData?.publicUrl) return publicData.publicUrl;
      } catch (_) {}
    }

    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  };

  const loadSharedProfile = async (user) => {
    const fallback = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Sobrevivente';
    let name = fallback;
    let avatarPath = '';

    const { data, error } = await aeriom
      .from('profiles')
      .select('display_name,avatar_path')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      name = data.display_name || fallback;
      avatarPath = data.avatar_path || '';
    }

    // Garante que a sessão do projeto AERIOM esteja restaurada antes de pedir a URL assinada.
    await aeriom.auth.getSession();
    const avatarUrl = await loadAvatarFromAeriom(avatarPath, user);

    if (profileCopy) profileCopy.textContent = name;
    renderTopAvatar(avatarUrl, name);

    return { name, email: user.email || '', avatarPath, avatarUrl };
  };

  const ensureAccountMenu = (profile) => {
    if (!profileChip) return;
    addAccountStyles();

    const existingWrap = profileChip.parentElement?.classList.contains('afterlife-account-wrap')
      ? profileChip.parentElement
      : null;
    if (existingWrap) return;

    const wrap = document.createElement('div');
    wrap.className = 'afterlife-account-wrap';
    profileChip.parentNode.insertBefore(wrap, profileChip);
    wrap.appendChild(profileChip);

    const menu = document.createElement('div');
    menu.className = 'afterlife-account-menu';
    menu.setAttribute('role', 'menu');

    const avatar = document.createElement('span');
    avatar.className = 'afterlife-account-avatar';
    if (profile.avatarUrl) {
      const img = document.createElement('img');
      img.src = profile.avatarUrl;
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { avatar.textContent = initial(profile.name); }, { once: true });
      avatar.appendChild(img);
    } else {
      avatar.textContent = initial(profile.name);
    }

    const head = document.createElement('div');
    head.className = 'afterlife-account-head';
    const copy = document.createElement('div');
    copy.className = 'afterlife-account-head-copy';
    const nameEl = document.createElement('strong');
    nameEl.textContent = profile.name;
    const emailEl = document.createElement('small');
    emailEl.textContent = profile.email;
    const badge = document.createElement('span');
    badge.className = 'afterlife-account-badge';
    badge.innerHTML = '<i></i> Perfil compartilhado com AERIOM';
    copy.append(nameEl, emailEl, badge);
    head.append(avatar, copy);

    const actions = document.createElement('div');
    actions.className = 'afterlife-account-actions';
    actions.innerHTML = `
      <a href="./perfil.html" role="menuitem">Editar perfil</a>
      <a href="../index.html" role="menuitem">Trocar sistema</a>
      <button class="danger" type="button" data-account-logout>Sair da conta</button>`;

    menu.append(head, actions);
    wrap.appendChild(menu);

    profileChip.setAttribute('aria-haspopup', 'true');
    profileChip.setAttribute('aria-expanded', 'false');
    profileChip.title = 'Abrir perfil';

    const close = () => {
      wrap.classList.remove('is-open');
      profileChip.setAttribute('aria-expanded', 'false');
    };

    profileChip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = wrap.classList.toggle('is-open');
      profileChip.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', (event) => event.stopPropagation());
    actions.querySelector('[data-account-logout]')?.addEventListener('click', async () => {
      close();
      await aeriom.auth.signOut();
      await supabase.auth.signOut();
      location.replace('../index.html');
    });

    document.addEventListener('click', close, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  };

  const boot = async () => {
    const { data: aeriomSession } = await aeriom.auth.getSession();
    const user = aeriomSession.session?.user;
    if (!user) {
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      location.replace(`../index.html?next=${next}`);
      return;
    }

    const profile = await loadSharedProfile(user);
    ensureAccountMenu(profile);
    document.body.dataset.authenticated = 'true';
  };

  void boot();

  mobileMenu?.addEventListener('click', () => sidebar?.classList.toggle('is-open'));
  document.querySelectorAll('.side-nav__item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.side-nav__item').forEach((nav) => nav.classList.remove('is-active'));
      item.classList.add('is-active');
      sidebar?.classList.remove('is-open');
    });
  });

  const updateClock = () => {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', hour12:false });
  };
  updateClock();
  window.setInterval(updateClock, 1000);

  continueBtn?.addEventListener('click', () => document.getElementById('campanhas')?.scrollIntoView({ behavior:'smooth', block:'start' }));

  document.querySelectorAll('.btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const el = event.currentTarget;
      if (!(el instanceof HTMLButtonElement) || el.id === 'continueBtn' || el.dataset.feedback === 'done') return;
      el.dataset.feedback = 'done';
      const original = el.textContent;
      el.textContent = 'EM BREVE';
      window.setTimeout(() => { el.textContent = original; delete el.dataset.feedback; }, 950);
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
