import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeCampaignSocialBooted) return;
  window.__afterlifeCampaignSocialBooted = true;

  const $ = (id) => document.getElementById(id);
  const campaignId = () => new URLSearchParams(location.search).get('campaign') || new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('selected') || sessionStorage.getItem('afterlife_current_campaign_id') || '';
  const unreadKey = (id) => `afterlife.social.unread.${id}`;
  const seenKey = (id) => `afterlife.social.seen.${id}`;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
  const time = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(d); };

  let user = null;
  let campaign = '';
  let channel = null;
  let rows = [];

  function unreadCount(){ return Number(localStorage.getItem(unreadKey(campaign)) || 0); }
  function setUnread(n){ const value = Math.max(0, Number(n)||0); localStorage.setItem(unreadKey(campaign), String(value)); updateBadge(value); }
  function updateBadge(count = unreadCount()){
    const button = [...document.querySelectorAll('.top-icon')].find((el) => el.getAttribute('aria-label') === 'Notificações');
    if (!button) return;
    button.classList.toggle('has-unread', count > 0);
    button.dataset.unread = count > 0 ? String(count) : '';
    button.title = count > 0 ? `${count} nova${count === 1 ? '' : 's'} mensagem${count === 1 ? '' : 'ns'}` : 'Notificações';
  }

  function injectStyles(){
    if ($('afterlife-social-style')) return;
    const s=document.createElement('style'); s.id='afterlife-social-style'; s.textContent=`
      .afterlife-social-launch{display:flex;align-items:center;gap:8px;margin:10px;padding:11px 12px;border:1px solid rgba(57,245,138,.14);border-radius:10px;background:rgba(57,245,138,.025);color:#cfe3d7;cursor:pointer;text-align:left;width:calc(100% - 20px)}
      .afterlife-social-launch strong{font-size:10px}.afterlife-social-launch small{display:block;color:#73857b;font-size:8px;margin-top:2px}.afterlife-social-launch b{margin-left:auto;color:#39f58a}
      .afterlife-social-overlay{position:fixed;inset:0;z-index:2000;pointer-events:none;background:rgba(0,0,0,0);transition:background .22s ease}.afterlife-social-overlay.is-open{pointer-events:auto;background:rgba(0,0,0,.48);backdrop-filter:blur(5px)}
      .afterlife-social-drawer{position:absolute;top:0;right:0;height:100%;width:min(440px,100%);display:grid;grid-template-rows:auto 1fr auto;background:#07100b;border-left:1px solid rgba(57,245,138,.14);box-shadow:-30px 0 80px rgba(0,0,0,.38);transform:translateX(102%);transition:transform .24s ease}.afterlife-social-overlay.is-open .afterlife-social-drawer{transform:none}
      .afterlife-social-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px;border-bottom:1px solid rgba(255,255,255,.06)}.afterlife-social-head span{display:block;color:#6e7d74;font-size:8px;letter-spacing:.12em;font-weight:900}.afterlife-social-head strong{display:block;color:#edf5ef;font-size:15px;margin-top:3px}.afterlife-social-close{width:34px;height:34px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.02);color:#9eaba3;cursor:pointer}
      .afterlife-social-feed{overflow:auto;padding:14px;display:grid;align-content:start;gap:10px}.afterlife-social-empty{padding:30px 16px;text-align:center;color:#77857e;font-size:9px;border:1px dashed rgba(255,255,255,.07);border-radius:12px}.afterlife-social-row{display:grid;gap:4px;max-width:88%}.afterlife-social-row.mine{justify-self:end;justify-items:end}.afterlife-social-row__meta{display:flex;align-items:center;gap:7px;color:#6f7e76;font-size:8px}.afterlife-social-row.mine .afterlife-social-row__meta{flex-direction:row-reverse}.afterlife-social-row__bubble{padding:10px 11px;border:1px solid rgba(255,255,255,.06);border-radius:13px;background:rgba(255,255,255,.022);color:#d5e0da;font-size:10px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.afterlife-social-row.mine .afterlife-social-row__bubble{background:rgba(57,245,138,.07);border-color:rgba(57,245,138,.14)}.afterlife-social-row__action{border:0;background:transparent;color:#67766e;font-size:8px;cursor:pointer}.afterlife-social-compose{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,.06);background:#061009}.afterlife-social-input{min-height:44px;max-height:120px;resize:vertical;padding:11px 12px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.02);color:#eef6f0;outline:none;font:inherit;font-size:10px}.afterlife-social-send{min-width:88px;border:1px solid rgba(57,245,138,.22);border-radius:11px;background:rgba(57,245,138,.09);color:#5bf0a0;font-size:9px;font-weight:900;cursor:pointer}.afterlife-social-send:disabled{opacity:.45;cursor:not-allowed}.top-icon.has-unread{position:relative;color:#39f58a}.top-icon.has-unread:after{content:attr(data-unread);position:absolute;right:-4px;top:-4px;min-width:15px;height:15px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:#39f58a;color:#04100a;font-size:7px;font-weight:900;box-shadow:0 0 14px rgba(57,245,138,.4)}
      @media(max-width:620px){.afterlife-social-drawer{width:100%;border-left:0}.afterlife-social-feed{padding:12px}.afterlife-social-compose{grid-template-columns:1fr}.afterlife-social-send{min-height:42px}}
    `; document.head.appendChild(s);
  }

  function ensureDrawer(){
    if($('afterlifeSocialOverlay'))return;
    const overlay=document.createElement('div'); overlay.id='afterlifeSocialOverlay'; overlay.className='afterlife-social-overlay';
    overlay.innerHTML=`<section class="afterlife-social-drawer" role="dialog" aria-modal="true" aria-labelledby="afterlifeSocialTitle"><header class="afterlife-social-head"><div><span>SALA DA CAMPANHA</span><strong id="afterlifeSocialTitle">Conversa</strong></div><button type="button" class="afterlife-social-close" id="afterlifeSocialClose" aria-label="Fechar">×</button></header><div id="afterlifeSocialFeed" class="afterlife-social-feed"></div><form id="afterlifeSocialCompose" class="afterlife-social-compose"><textarea id="afterlifeSocialInput" class="afterlife-social-input" maxlength="1000" rows="2" placeholder="Fale com a mesa…"></textarea><button id="afterlifeSocialSend" class="afterlife-social-send" type="submit">ENVIAR</button></form></section>`;
    document.body.appendChild(overlay); overlay.addEventListener('click',(e)=>{if(e.target===overlay)close();}); $('afterlifeSocialClose').addEventListener('click',close);
    $('afterlifeSocialCompose').addEventListener('submit',send);
  }

  function open(){ ensureDrawer(); $('afterlifeSocialOverlay').classList.add('is-open'); setUnread(0); localStorage.setItem(seenKey(campaign),new Date().toISOString()); $('afterlifeSocialInput')?.focus(); scrollEnd(); }
  function close(){ $('afterlifeSocialOverlay')?.classList.remove('is-open'); }
  function scrollEnd(){ const feed=$('afterlifeSocialFeed'); if(feed)feed.scrollTop=feed.scrollHeight; }

  function render(){
    const feed=$('afterlifeSocialFeed'); if(!feed)return; feed.replaceChildren();
    if(!rows.length){feed.innerHTML='<div class="afterlife-social-empty"><strong>A mesa ainda está em silêncio.</strong><br>Envie a primeira mensagem da campanha.</div>';return;}
    rows.forEach((m)=>{
      const row=document.createElement('article'); row.className=`afterlife-social-row${m.author_user_id===user?.id?' mine':''}`;
      const meta=document.createElement('div'); meta.className='afterlife-social-row__meta'; meta.innerHTML=`<strong>${esc(m.author_name||'Sobrevivente')}</strong><span>${time(m.created_at)}</span>`;
      const bubble=document.createElement('div'); bubble.className='afterlife-social-row__bubble'; bubble.textContent=m.body;
      row.append(meta,bubble);
      if(m.author_user_id===user?.id){ const del=document.createElement('button');del.type='button';del.className='afterlife-social-row__action';del.textContent='apagar';del.onclick=()=>removeMessage(m.id);row.appendChild(del); }
      feed.appendChild(row);
    }); scrollEnd();
  }

  async function loadMessages(){
    const {data,error}=await aeriom.rpc('list_campaign_messages',{p_campaign_id:campaign,p_limit:120});
    if(error)throw error; rows=(Array.isArray(data)?data:[]).reverse(); render();
    if(rows.length && !localStorage.getItem(seenKey(campaign))) localStorage.setItem(seenKey(campaign), rows[rows.length-1].created_at || new Date().toISOString());
  }
  async function send(e){
    e.preventDefault(); const input=$('afterlifeSocialInput'), sendBtn=$('afterlifeSocialSend'); const body=input?.value?.trim(); if(!body)return;
    sendBtn.disabled=true;
    try{ const {data,error}=await aeriom.rpc('send_campaign_message',{p_campaign_id:campaign,p_body:body,p_message_type:'chat',p_metadata:{}}); if(error)throw error; input.value=''; if(data&&!channel){rows=[...rows,data];render();} }catch(error){console.error('[AFTERLIFE][SOCIAL][SEND]',error);}
    finally{sendBtn.disabled=false;input.focus();}
  }
  async function removeMessage(id){ if(!id)return; try{const {error}=await aeriom.rpc('delete_campaign_message',{p_message_id:id});if(error)throw error;}catch(error){console.warn('[AFTERLIFE][SOCIAL][DELETE]',error);}}

  function subscribe(){
    if(channel){try{aeriom.removeChannel(channel);}catch{}}
    channel=aeriom.channel(`afterlife-social:${campaign}`).on('postgres_changes',{event:'*',schema:'public',table:'campaign_messages',filter:`campaign_id=eq.${campaign}`},(payload)=>{
      if(payload.eventType==='DELETE'){rows=rows.filter((x)=>x.id!==payload.old?.id);render();return;}
      const next=payload.new; if(!next?.id)return; if(!rows.some((x)=>x.id===next.id)){ const mine=next.author_user_id===user?.id; rows=[...rows,next].slice(-120); render(); if(!mine&&!$('afterlifeSocialOverlay')?.classList.contains('is-open'))setUnread(unreadCount()+1); }
    }).subscribe((status)=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('[AFTERLIFE][SOCIAL][REALTIME]',status);});
  }

  function bindLauncher(){
    const button=[...document.querySelectorAll('.top-icon')].find((el)=>el.getAttribute('aria-label')==='Notificações');
    if(button&&!button.dataset.socialBound){button.dataset.socialBound='1';button.addEventListener('click',(e)=>{e.preventDefault();open();});}
    if(!document.querySelector('.afterlife-social-launch')){
      const anchor=document.querySelector('.quick-panel')||document.querySelector('.campaign-main-grid');
      if(anchor){const b=document.createElement('button');b.type='button';b.className='afterlife-social-launch';b.innerHTML='<span>◉</span><span><strong>SALA DA CAMPANHA</strong><small>Converse com a mesa em tempo real</small></span><b>→</b>';b.onclick=open;anchor.parentElement?.insertBefore(b,anchor.nextSibling);}
    }
    updateBadge();
  }

  async function init(){
    injectStyles();ensureDrawer();
    const session=await ensureAfterlifeSession(); if(!session?.user)return; user=session.user; campaign=campaignId(); if(!campaign)return;
    bindLauncher(); await loadMessages(); subscribe();
  }
  init().catch((e)=>console.warn('[AFTERLIFE][SOCIAL][INIT]',e?.message||e));
})();