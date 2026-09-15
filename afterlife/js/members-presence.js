import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-5';

(() => {
  'use strict';
  if (window.__afterlifeMembersPresenceBooted) return;
  window.__afterlifeMembersPresenceBooted = true;

  const $ = (id) => document.getElementById(id);
  const campaignId = () => new URLSearchParams(location.search).get('campaign') || new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('selected');
  let currentUser = null;
  let currentRows = [];
  let pollTimer = null;
  let realtimeChannel = null;
  let visibilityHandler = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  function relativeTime(value) {
    if (!value) return 'Nunca visto';
    const ms = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 'agora';
    const sec = Math.floor(ms / 1000);
    if (sec < 20) return 'agora';
    if (sec < 60) return `há ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `há ${min}min`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `há ${hour}h`;
    const days = Math.floor(hour / 24);
    if (days < 7) return `há ${days}d`;
    return new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(value));
  }

  function injectStyles() {
    if ($('afterlife-members-presence-style')) return;
    const style = document.createElement('style');
    style.id = 'afterlife-members-presence-style';
    style.textContent = `
      .afterlife-members-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 12px 12px}
      .afterlife-member-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;min-width:0;padding:10px;border:1px solid rgba(255,255,255,.06);border-radius:11px;background:linear-gradient(145deg,rgba(255,255,255,.022),rgba(255,255,255,.008));transition:border-color .2s ease,transform .2s ease,background .2s ease}
      .afterlife-member-card:hover{transform:translateY(-1px);border-color:rgba(57,245,138,.2);background:rgba(57,245,138,.025)}
      .afterlife-member-avatar{position:relative;width:42px;height:42px;border-radius:50%;overflow:hidden;display:grid;place-items:center;flex:none;background:radial-gradient(circle at 50% 25%,#496256,#101812 68%);border:1px solid rgba(255,255,255,.12);font-size:12px;font-weight:900;color:#eef7f1}
      .afterlife-member-avatar img{width:100%;height:100%;object-fit:cover;display:block}
      .afterlife-member-status{position:absolute;right:-1px;bottom:0;width:11px;height:11px;border-radius:50%;background:#5d6862;border:2px solid #06100b;box-shadow:0 0 0 1px rgba(0,0,0,.25)}
      .afterlife-member-status.online{background:#39f58a;box-shadow:0 0 11px rgba(57,245,138,.55)}
      .afterlife-member-copy{min-width:0;display:grid;gap:3px}
      .afterlife-member-name{display:flex;align-items:center;gap:6px;min-width:0}
      .afterlife-member-name strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#edf4ef}
      .afterlife-member-role{padding:3px 5px;border:1px solid rgba(57,245,138,.14);border-radius:999px;color:#56ed9b;background:rgba(57,245,138,.035);font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;flex:none}
      .afterlife-member-meta{display:flex;gap:6px;align-items:center;min-width:0;color:#718078;font-size:8px}
      .afterlife-member-presence{white-space:nowrap}
      .afterlife-member-meta-dot{opacity:.35}
      .afterlife-member-you{color:#aebbb4}
      .afterlife-members-empty{padding:18px 12px;color:#718078;text-align:center;font-size:9px;border-top:1px solid rgba(255,255,255,.04)}
      .afterlife-members-online-count{font-size:8px;color:#6e7c75;font-weight:800}
      @media(max-width:620px){.afterlife-members-grid{grid-template-columns:1fr}.afterlife-member-card{padding:9px}.afterlife-member-avatar{width:40px;height:40px}}
    `;
    document.head.appendChild(style);
  }

  async function avatarUrl(path) {
    if (!path) return '';
    try {
      const { data, error } = await aeriom.storage.from('avatars').createSignedUrl(path, 3600);
      if (error) return '';
      return data?.signedUrl || '';
    } catch { return ''; }
  }

  async function loadRows() {
    const id = campaignId();
    if (!id || !currentUser) return [];
    const { data, error } = await aeriom.rpc('list_campaign_members', { p_campaign_id: id });
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : data ? [data] : []).map((row) => ({
      user_id: String(row.user_id || ''),
      role: String(row.role || 'player'),
      display_name: String(row.display_name || 'Sobrevivente'),
      avatar_path: row.avatar_path || '',
      is_online: Boolean(row.is_online),
      last_seen_at: row.last_seen_at || null,
    }));
    const withUrls = await Promise.all(rows.map(async (row) => ({ ...row, avatar_url: await avatarUrl(row.avatar_path) })));
    currentRows = withUrls;
    return withUrls;
  }

  function render(rows) {
    const host = $('memberList');
    if (!host) return;
    const total = rows.length;
    const online = rows.filter((r) => r.is_online).length;
    $('membersPanelCount')?.replaceChildren(document.createTextNode(`(${total})`));
    $('campaignMembersCount')?.replaceChildren(document.createTextNode(String(total)));

    host.className = 'afterlife-members-grid';
    host.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'afterlife-members-empty';
      empty.textContent = 'Nenhum sobrevivente registrado nesta campanha.';
      host.appendChild(empty);
      return;
    }

    rows.forEach((row) => {
      const card = document.createElement('article');
      card.className = 'afterlife-member-card';
      const avatar = document.createElement('div');
      avatar.className = 'afterlife-member-avatar';
      if (row.avatar_url) {
        const image = document.createElement('img');
        image.src = row.avatar_url;
        image.alt = '';
        image.loading = 'eager';
        image.onerror = () => { avatar.replaceChildren(document.createTextNode(row.display_name.trim().charAt(0).toUpperCase() || 'S')); };
        avatar.appendChild(image);
      } else avatar.textContent = row.display_name.trim().charAt(0).toUpperCase() || 'S';
      const status = document.createElement('span');
      status.className = `afterlife-member-status${row.is_online ? ' online' : ''}`;
      avatar.appendChild(status);

      const copy = document.createElement('div');
      copy.className = 'afterlife-member-copy';
      const name = document.createElement('div');
      name.className = 'afterlife-member-name';
      const strong = document.createElement('strong');
      strong.textContent = row.display_name;
      name.appendChild(strong);
      if (row.role === 'master') {
        const role = document.createElement('span');
        role.className = 'afterlife-member-role';
        role.textContent = 'Mestre';
        name.appendChild(role);
      }
      const meta = document.createElement('div');
      meta.className = 'afterlife-member-meta';
      const presence = document.createElement('span');
      presence.className = 'afterlife-member-presence';
      presence.textContent = row.is_online ? 'Online agora' : relativeTime(row.last_seen_at);
      meta.appendChild(presence);
      if (row.user_id === currentUser?.id) {
        const dot = document.createElement('span');
        dot.className = 'afterlife-member-meta-dot';
        dot.textContent = '•';
        meta.appendChild(dot);
        const you = document.createElement('span');
        you.className = 'afterlife-member-you';
        you.textContent = 'Você';
        meta.appendChild(you);
      }
      copy.append(name, meta);

      const right = document.createElement('span');
      right.className = 'afterlife-members-online-count';
      right.textContent = row.is_online ? '●' : '';
      right.title = row.is_online ? 'Online' : `Visto ${relativeTime(row.last_seen_at)}`;

      card.append(avatar, copy, right);
      host.appendChild(card);
    });

    const existing = document.querySelector('.afterlife-members-online-count');
    if (existing) existing.setAttribute('data-online-total', String(online));
  }

  async function refresh() {
    try {
      const rows = await loadRows();
      render(rows);
    } catch (error) {
      console.warn('[AFTERLIFE][PRESENCE]', error?.message || error);
    }
  }

  async function touch() {
    const id = campaignId();
    if (!id || !currentUser) return;
    try { await aeriom.rpc('touch_campaign_presence', { p_campaign_id: id }); } catch (error) { console.warn('[AFTERLIFE][PRESENCE TOUCH]', error?.message || error); }
  }

  function setupRealtime() {
    const id = campaignId();
    if (!id || realtimeChannel) return;
    realtimeChannel = aeriom.channel(`afterlife-presence:${id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_presence', filter:`campaign_id=eq.${id}` }, () => { void refresh(); })
      .subscribe();
  }

  function setupPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (document.visibilityState === 'visible') { void touch(); void refresh(); } }, 15000);
  }

  function setupVisibility() {
    visibilityHandler = () => {
      if (document.visibilityState === 'visible') { void touch(); void refresh(); }
      else { const id = campaignId(); if (id) void aeriom.rpc('mark_campaign_presence_offline', { p_campaign_id: id }); }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  function setupUnload() {
    window.addEventListener('pagehide', () => {
      const id = campaignId();
      if (!id || !currentUser) return;
      try { aeriom.rpc('mark_campaign_presence_offline', { p_campaign_id:id }); } catch {}
    });
  }

  function removeLegacyMissionDiary() {
    const style = document.createElement('style');
    style.id = 'afterlife-remove-mission-diary';
    style.textContent = 'a[href="#missoes"],a[href="#diario"],.feature-card[href="#missoes"],.feature-card[href="#diario"],#missoes,#diario{display:none!important}';
    document.head.appendChild(style);
    document.querySelectorAll('a[href="#missoes"],a[href="#diario"],.feature-card[href="#missoes"],.feature-card[href="#diario"],#missoes,#diario').forEach((el) => el.remove());
    document.querySelectorAll('.nuclear-item').forEach((el) => { if (el.dataset.target === '#diario') el.remove(); });
  }

  async function init() {
    injectStyles();
    removeLegacyMissionDiary();
    const session = await ensureAfterlifeSession();
    if (!session?.user) return;
    currentUser = session.user;
    const id = campaignId();
    if (!id) return;
    await touch();
    await refresh();
    setupRealtime();
    setupPolling();
    setupVisibility();
    setupUnload();
  }

  init().catch((error) => console.warn('[AFTERLIFE][MEMBERS INIT]', error?.message || error));
})();
