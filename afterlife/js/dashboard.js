import { aeriom, afterlifeReady } from './aeriom-client.js?v=20260914-23';

(() => {
  'use strict';
  const PREFIX='afterlife_campaigns_v1_';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let user=null;
  const key=()=>PREFIX+(user?.id||'anonymous');
  const load=()=>{try{return JSON.parse(localStorage.getItem(key())||'[]')}catch{return[]}};

  function render(rows){
    const root=$('dashboardCampaignList'); const empty=$('dashboardEmpty');
    if(!root||!empty)return;
    root.replaceChildren();
    empty.hidden=rows.length!==0; root.hidden=rows.length===0;
    rows.slice(0,3).forEach(c=>{
      const card=document.createElement('article'); card.className='dashboard-campaign-card';
      card.innerHTML=`<h3>${esc(c.name)}</h3><p>${esc(c.description||'Sem descrição.')}</p><div class="meta"><span>🌎 ${esc(c.country||c.locationName||'Local definido')}</span><span>${esc(c.tone||'')}</span></div><div style="margin-top:14px"><a class="btn btn--ghost" href="./campanhas.html?selected=${encodeURIComponent(c.id)}">ABRIR →</a></div>`;
      root.appendChild(card);
    });
  }

  async function boot(){
    await afterlifeReady;
    const s=await aeriom.auth.getSession();
    user=s.data?.session?.user||null;
    render(load());
  }

  const openCreate=()=>location.href='./campanhas.html?create=1';
  $('createCampaignBtn')?.addEventListener('click',openCreate);
  $('dashboardCreateBtn')?.addEventListener('click',openCreate);
  $('viewCampaignsBtn')?.addEventListener('click',()=>location.href='./campanhas.html');
  $('mapBtn')?.addEventListener('click',()=>location.href='./mapa-mundial.html');
  boot().catch(error=>{console.error('[AFTERLIFE][DASHBOARD]',error);render(load())});
})();
