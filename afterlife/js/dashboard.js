import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';
  const AERIOM_URL='https://kitlpowgcugvlxwhwhqv.supabase.co';
  const AERIOM_KEY='sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const aeriom=createClient(AERIOM_URL,AERIOM_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const PREFIX='afterlife_campaigns_v1_';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let user=null;
  const key=()=>PREFIX+(user?.id||'anonymous');
  const load=()=>{try{return JSON.parse(localStorage.getItem(key())||'[]')}catch{return[]}};
  function render(rows){
    const root=$('dashboardCampaignList'); const empty=$('dashboardEmpty'); const count=$('dashboardCampaignCount');
    count.textContent=`${rows.length} ${rows.length===1?'campanha':'campanhas'}`; root.replaceChildren();
    empty.hidden=rows.length!==0; root.hidden=rows.length===0;
    rows.slice(0,3).forEach(c=>{const card=document.createElement('article');card.className='dashboard-campaign-card';card.innerHTML=`<h3>${esc(c.name)}</h3><p>${esc(c.description||'Sem descrição.')}</p><div class="meta"><span>🌎 ${esc(c.country)}</span><span>${esc(c.tone)}</span></div><div style="margin-top:14px"><a class="btn btn--ghost" href="./campanha.html?id=${encodeURIComponent(c.id)}">ABRIR →</a></div>`;root.appendChild(card);});
  }
  async function boot(){
    const s=await aeriom.auth.getSession(); user=s.data?.session?.user;
    if(!user){const next=encodeURIComponent(location.pathname);location.replace(`../index.html?next=${next}`);return;}
    let name=user.user_metadata?.display_name||user.email?.split('@')[0]||'Sobrevivente';
    let avatar=null;
    try{const p=await aeriom.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();name=p.data?.display_name||name;if(p.data?.avatar_path){const u=await aeriom.storage.from('avatars').createSignedUrl(p.data.avatar_path,3600);avatar=u.data?.signedUrl||null;}}catch{}
    $('profileName').textContent=name; $('profileAvatar').replaceChildren();
    if(avatar){const img=document.createElement('img');img.src=avatar;img.alt='';$('profileAvatar').appendChild(img);}else $('profileAvatar').textContent=name.charAt(0).toUpperCase();
    const rows=load();render(rows);
  }
  $('createCampaignBtn')?.addEventListener('click',()=>location.href='./campanhas.html?create=1');
  $('viewCampaignsBtn')?.addEventListener('click',()=>location.href='./campanhas.html');
  $('mapBtn')?.addEventListener('click',()=>location.href='./mapa-mundial.html');
  $('profileChip')?.addEventListener('click',()=>document.body.classList.toggle('profile-open'));
  document.addEventListener('click',e=>{if(!e.target.closest('#profileChip')&&!e.target.closest('#profileMenu'))document.body.classList.remove('profile-open')});
  boot().catch(()=>location.replace('../index.html'));
})();