import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-4';

(() => {
  'use strict';
  if (window.__afterlifeInvitesBooted) return;
  window.__afterlifeInvitesBooted = true;

  const CODE_LENGTH = 5;
  const INVITE_MINUTES = 5;
  const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=';
  const $ = (id) => document.getElementById(id);
  let timer = null;
  let invite = null;
  let busy = false;

  const normalizeCode = (value) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const validCode = (code) => /^[A-Z0-9]{5}$/.test(code);
  const campaignId = () => new URLSearchParams(location.search).get('campaign') || new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('selected');

  function injectStyles() {
    if ($('afterlife-invite-styles')) return;
    const style = document.createElement('style');
    style.id = 'afterlife-invite-styles';
    style.textContent = `
      .afterlife-invite-modal{position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}
      .afterlife-invite-modal.is-open{display:flex}
      .afterlife-invite-card{width:min(560px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(57,245,138,.18);border-radius:22px;background:linear-gradient(180deg,#0b1711,#050907);box-shadow:0 40px 100px rgba(0,0,0,.55)}
      .afterlife-invite-head{display:flex;justify-content:space-between;gap:12px;padding:20px;border-bottom:1px solid rgba(255,255,255,.06)}
      .afterlife-invite-head span{display:block;color:#39f58a;font:900 9px Inter,sans-serif;letter-spacing:1.5px}
      .afterlife-invite-head h2{margin:7px 0 0;color:#edf5f0;font-size:22px}
      .afterlife-invite-close{width:36px;height:36px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:transparent;color:#c7d0ca;font-size:22px;cursor:pointer}
      .afterlife-invite-body{padding:20px;display:grid;gap:16px}
      .afterlife-invite-code{display:grid;place-items:center;padding:18px;border:1px solid rgba(57,245,138,.15);border-radius:16px;background:rgba(57,245,138,.035)}
      .afterlife-invite-code strong{font:900 38px/1.1 Inter,sans-serif;letter-spacing:8px;color:#eaf7ef}
      .afterlife-invite-code small{margin-top:8px;color:#7f8d86;font-size:9px}
      .afterlife-invite-countdown{text-align:center;color:#b8c5bd;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .afterlife-invite-link-row{display:grid;grid-template-columns:1fr auto;gap:8px}
      .afterlife-invite-link-row input{min-width:0;height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:#050907;color:#dfe8e2;font:500 11px Inter}
      .afterlife-invite-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .afterlife-invite-actions button{min-height:44px;border-radius:10px;border:1px solid rgba(190,210,199,.16);background:rgba(255,255,255,.025);color:#e7eee9;font:900 10px Inter;cursor:pointer}
      .afterlife-invite-actions button.primary{border-color:rgba(57,245,138,.42);background:linear-gradient(180deg,#4cf99a,#26d777);color:#041008}
      .afterlife-invite-qr{display:grid;place-items:center;padding:10px;min-height:220px;border:1px dashed rgba(255,255,255,.08);border-radius:14px;background:#fff}
      .afterlife-invite-qr img{width:200px;height:200px;display:block}
      .afterlife-join-modal .afterlife-invite-card{width:min(520px,100%)}
      .afterlife-join-form{display:grid;gap:12px}
      .afterlife-join-form label{display:grid;gap:7px;color:#aebbb4;font-size:10px;font-weight:800}
      .afterlife-join-form input{height:52px;padding:0 14px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#050907;color:#eef5f0;font:900 20px Inter;text-align:center;letter-spacing:5px;text-transform:uppercase}
      .afterlife-join-message{min-height:20px;font-size:10px;color:#aab8b0;text-align:center}
      .afterlife-join-message.error{color:#ffaaa2}.afterlife-join-message.success{color:#68f7a6}
      @media(max-width:520px){.afterlife-invite-code strong{font-size:30px;letter-spacing:5px}.afterlife-invite-actions,.afterlife-invite-link-row{grid-template-columns:1fr}.afterlife-invite-card{border-radius:18px}}
    `;
    document.head.appendChild(style);
  }

  function modalMarkup() {
    if ($('afterlifeInviteModal')) return;
    const modal = document.createElement('div');
    modal.id = 'afterlifeInviteModal';
    modal.className = 'afterlife-invite-modal';
    modal.innerHTML = `<div class="afterlife-invite-card" role="dialog" aria-modal="true" aria-labelledby="afterlifeInviteTitle">
      <header class="afterlife-invite-head"><div><span>AFTERLIFE · CONVITE</span><h2 id="afterlifeInviteTitle">Convide sobreviventes</h2></div><button class="afterlife-invite-close" id="afterlifeInviteClose" type="button" aria-label="Fechar">×</button></header>
      <div class="afterlife-invite-body">
        <div class="afterlife-invite-code"><strong id="afterlifeInviteCode">•••••</strong><small>Código válido por 5 minutos</small></div>
        <div class="afterlife-invite-countdown" id="afterlifeInviteCountdown">Gerando convite…</div>
        <div class="afterlife-invite-link-row"><input id="afterlifeInviteLink" readonly aria-label="Link do convite"><button class="afterlife-invite-actions-copy" id="afterlifeInviteCopyLink" type="button">COPIAR LINK</button></div>
        <div class="afterlife-invite-actions"><button id="afterlifeInviteCopyCode" type="button">COPIAR CÓDIGO</button><button id="afterlifeInviteShare" class="primary" type="button">COMPARTILHAR</button></div>
        <div class="afterlife-invite-qr" id="afterlifeInviteQr"><span style="color:#555;font:600 11px Inter">QR DO CONVITE</span></div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    $('afterlifeInviteClose').addEventListener('click', closeInvite);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeInvite(); });
    $('afterlifeInviteCopyCode').addEventListener('click', () => copy(invite?.code));
    $('afterlifeInviteCopyLink').addEventListener('click', () => copy(invite?.link));
    $('afterlifeInviteShare').addEventListener('click', async () => {
      if (!invite?.link) return;
      if (navigator.share) { try { await navigator.share({ title: 'Convite AFTERLIFE', text: `Entre na minha campanha do AFTERLIFE com o código ${invite.code}.`, url: invite.link }); return; } catch {} }
      await copy(invite.link);
    });
  }

  function closeInvite() {
    const modal = $('afterlifeInviteModal');
    if (modal) modal.classList.remove('is-open');
    if (timer) { clearInterval(timer); timer = null; }
  }

  async function copy(value) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); } catch {
      const input = document.createElement('textarea'); input.value = value; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
  }

  function startCountdown(expiresAt) {
    if (timer) clearInterval(timer);
    const tick = () => {
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      const el = $('afterlifeInviteCountdown');
      if (!el) return;
      if (!remaining) { el.textContent = 'Convite expirado'; clearInterval(timer); timer = null; return; }
      const total = Math.ceil(remaining / 1000);
      const mm = String(Math.floor(total / 60)).padStart(2,'0');
      const ss = String(total % 60).padStart(2,'0');
      el.textContent = `Expira em ${mm}:${ss}`;
    };
    tick(); timer = setInterval(tick, 1000);
  }

  async function generate() {
    if (busy) return;
    busy = true;
    try {
      const session = await ensureAfterlifeSession();
      if (!session?.user) throw new Error('Sessão do Afterlife não encontrada.');
      const id = campaignId();
      if (!id) throw new Error('Campanha não informada.');
      const { data, error } = await aeriom.rpc('generate_campaign_invite', { p_campaign_id: id, p_max_uses: 1 });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const code = normalizeCode(row?.invite_code || row?.code || row?.inviteCode);
      if (!validCode(code)) throw new Error('O servidor não retornou um código de convite válido.');
      const url = new URL('./entrar-campanha.html', location.href); url.searchParams.set('code', code);
      invite = { code, expiresAt: row?.expires_at || Date.now() + INVITE_MINUTES * 60000, link: url.href };
      $('afterlifeInviteCode').textContent = code;
      $('afterlifeInviteLink').value = invite.link;
      const qr = $('afterlifeInviteQr'); qr.innerHTML = `<img alt="QR Code do convite AFTERLIFE" src="${QR_API + encodeURIComponent(invite.link)}">`;
      $('afterlifeInviteModal').classList.add('is-open');
      startCountdown(invite.expiresAt);
    } catch (error) {
      console.error('[AFTERLIFE][INVITE]', error);
      alert(error?.message || 'Não foi possível gerar o convite.');
    } finally { busy = false; }
  }

  function bindCampaign() {
    if (!campaignId()) return;
    ['inviteMember','inviteMemberCard'].forEach((id) => {
      const el = $(id); if (!el || el.dataset.afterlifeInviteBound === '1') return;
      el.dataset.afterlifeInviteBound = '1';
      el.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); void generate(); }, true);
    });
  }

  function ensureJoinButton() {
    if (!location.pathname.endsWith('/campanhas.html')) return;
    if ($('afterlifeJoinCampaignBtn')) return;
    const host = $('campaignEmpty') || document.querySelector('.empty-state');
    if (!host) return;
    const button = document.createElement('button');
    button.id = 'afterlifeJoinCampaignBtn';
    button.className = 'btn btn--ghost';
    button.type = 'button';
    button.textContent = 'ENTRAR COM CONVITE';
    host.querySelector('.empty-state p')?.insertAdjacentElement('afterend', button) || host.appendChild(button);
    button.addEventListener('click', openJoin);
  }

  function joinMarkup() {
    if ($('afterlifeJoinModal')) return;
    const modal = document.createElement('div'); modal.id='afterlifeJoinModal'; modal.className='afterlife-invite-modal afterlife-join-modal';
    modal.innerHTML=`<div class="afterlife-invite-card" role="dialog" aria-modal="true"><header class="afterlife-invite-head"><div><span>AFTERLIFE · ENTRAR NA MESA</span><h2>Usar código de convite</h2></div><button class="afterlife-invite-close" id="afterlifeJoinClose" type="button" aria-label="Fechar">×</button></header><div class="afterlife-invite-body"><form class="afterlife-join-form" id="afterlifeJoinForm"><label>Código de 5 caracteres<input id="afterlifeJoinCode" maxlength="5" autocomplete="one-time-code" placeholder="ABCDE" inputmode="text"></label><div class="afterlife-join-message" id="afterlifeJoinMessage"></div><button class="btn btn--primary" type="submit">ENTRAR NA CAMPANHA →</button></form></div></div>`;
    document.body.appendChild(modal);
    $('afterlifeJoinClose').addEventListener('click', () => modal.classList.remove('is-open'));
    modal.addEventListener('click',(event)=>{if(event.target===modal)modal.classList.remove('is-open')});
    $('afterlifeJoinForm').addEventListener('submit',(event)=>{event.preventDefault();void join();});
    $('afterlifeJoinCode').addEventListener('input',(event)=>{event.target.value=normalizeCode(event.target.value).slice(0,5)});
  }

  function openJoin() { joinMarkup(); const modal=$('afterlifeJoinModal'); modal.classList.add('is-open'); $('afterlifeJoinCode').focus(); }

  async function join() {
    const message = $('afterlifeJoinMessage'); const code = normalizeCode($('afterlifeJoinCode')?.value);
    if (!validCode(code)) { message.textContent='Digite um código válido de 5 caracteres.'; message.className='afterlife-join-message error'; return; }
    message.textContent='Verificando convite…'; message.className='afterlife-join-message';
    try {
      const session = await ensureAfterlifeSession();
      if (!session?.user) throw new Error('Faça login no Afterlife para entrar na campanha.');
      const { data, error } = await aeriom.rpc('accept_campaign_invite', { p_invite_code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const id = row?.campaign_id || row?.id;
      message.textContent='Convite confirmado! Entrando…'; message.className='afterlife-join-message success';
      setTimeout(() => { location.href = id ? `./campanha.html?campaign=${encodeURIComponent(id)}` : './campanhas.html'; }, 420);
    } catch (error) {
      const raw = String(error?.message || '').toLowerCase();
      const text = raw.includes('expired') || raw.includes('invite_invalid') ? 'Esse convite expirou ou não é mais válido.' : raw.includes('already') ? 'Você já faz parte dessa campanha.' : error?.message || 'Não foi possível entrar na campanha.';
      message.textContent=text; message.className='afterlife-join-message error';
    }
  }

  function applyUrlJoin() {
    if (!location.pathname.endsWith('/entrar-campanha.html')) return;
    const code = normalizeCode(new URLSearchParams(location.search).get('code') || '');
    joinMarkup();
    if (code) $('afterlifeJoinCode').value = code;
    $('afterlifeJoinModal').classList.add('is-open');
    ensureAfterlifeSession().then((session) => { if (!session?.user) { const target = `${location.pathname}${location.search}${location.hash}`; const url = new URL('./entrar.html', location.href); url.searchParams.set('returnTo', target); location.replace(url.href); } });
  }

  function boot() {
    injectStyles();
    modalMarkup();
    bindCampaign();
    ensureJoinButton();
    setTimeout(ensureJoinButton, 700);
    applyUrlJoin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
