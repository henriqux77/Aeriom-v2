import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';
  const AERIOM_URL='https://kitlpowgcugvlxwhwhqv.supabase.co';
  const AERIOM_KEY='sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const aeriom=createClient(AERIOM_URL,AERIOM_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const KEY_PREFIX='afterlife_campaigns_v1_';
  const $=id=>document.getElementById(id);
  let user=null;

  const escapeHtml=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function key(){return KEY_PREFIX+(user?.id||'anonymous');}
  function loadCampaigns(){try{return JSON.parse(localStorage.getItem(key())||'[]')}catch{return[]}}
  function saveCampaigns(rows){localStorage.setItem(key(),JSON.stringify(rows));}
  function initial(name){return String(name||'S').trim().charAt(0).toUpperCase()||'?';}

  function render(){
    const rows=loadCampaigns(); const list=$('campaignList'); const empty=$('campaignEmpty'); const count=$('campaignCount');
    count.textContent=`${rows.length} ${rows.length===1?'campanha':'campanhas'}`;
    list.replaceChildren(); empty.style.display=rows.length?'none':'block';
    rows.forEach(c=>{
      const article=document.createElement('article'); article.className='campaign-item';
      const location=c.locationName||c.locationAddress||'Local definido no mapa';
      const coords=(Number.isFinite(Number(c.latitude))&&Number.isFinite(Number(c.longitude)))?`${Number(c.latitude).toFixed(3)}, ${Number(c.longitude).toFixed(3)}`:'';
      article.innerHTML=`<div><div class="campaign-item__top"><h3>${escapeHtml(c.name)}</h3><span class="panel-count">${escapeHtml(c.tone)}</span></div><p>${escapeHtml(c.description||'Sem descrição.')}</p><div class="campaign-item__meta"><span>🌎 ${escapeHtml(location)}</span>${coords?`<span>⌖ ${coords}</span>`:''}<span>👤 1 Mestre</span></div></div><div class="campaign-item__actions"><button class="btn btn--primary" data-open="${escapeHtml(c.id)}">ABRIR →</button><button class="btn btn--ghost" data-delete="${escapeHtml(c.id)}">EXCLUIR</button></div>`;
      list.appendChild(article);
    });
    list.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{location.href=`./campanhas.html?selected=${encodeURIComponent(b.dataset.open)}`}));
    list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Excluir esta campanha?')){saveCampaigns(loadCampaigns().filter(c=>c.id!==b.dataset.delete));render();}}));
  }

  function setMessage(text=''){const el=$('campaignMessage');el.textContent=text;el.classList.toggle('is-visible',Boolean(text));}
  function toggleCreate(show){$('createPanel').hidden=!show;if(show){requestAnimationFrame(()=>$('campaignName').focus())}else setMessage('');}

  function applyLocationFromParams(){
    const qs=new URLSearchParams(location.search);
    const lat=Number(qs.get('lat'));
    const lng=Number(qs.get('lng'));
    const label=qs.get('label')||qs.get('name')||'';
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    $('campaignLatitude').value=lat.toFixed(6);
    $('campaignLongitude').value=lng.toFixed(6);
    $('campaignLocationName').value=label||'Local selecionado no mapa';
    const title=$('campaignLocationTitle'); const desc=$('campaignLocationDescription');
    if(title)title.textContent=label||'Local selecionado no mapa';
    if(desc)desc.textContent=`${lat.toFixed(5)}°, ${lng.toFixed(5)}° · Você pode alterar a localização pelo Mapa Mundial.`;
  }

  async function loadSharedProfile(){
    const fallback=user?.user_metadata?.display_name||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Sobrevivente';
    let name=fallback, avatarPath='';
    try{
      const p=await aeriom.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();
      if(p.data){name=p.data.display_name||fallback;avatarPath=p.data.avatar_path||'';}
      if($('profileName'))$('profileName').textContent=name;
      if($('profileMenuName'))$('profileMenuName').textContent=name;
      if($('profileAvatar')){
        $('profileAvatar').replaceChildren();
        const avatarBox=$('profileAvatar');
        if(avatarPath){
          const signed=await aeriom.storage.from('avatars').createSignedUrl(avatarPath,3600);
          if(!signed.error&&signed.data?.signedUrl){
            const img=document.createElement('img');img.src=signed.data.signedUrl;img.alt='';img.loading='eager';img.referrerPolicy='no-referrer';
            img.onerror=()=>{avatarBox.textContent=initial(name)};
            avatarBox.appendChild(img);
          }else avatarBox.textContent=initial(name);
        }else avatarBox.textContent=initial(name);
      }
      if($('profileMenuAvatar')){
        $('profileMenuAvatar').replaceChildren();
        if(avatarPath){
          const signed=await aeriom.storage.from('avatars').createSignedUrl(avatarPath,3600);
          if(!signed.error&&signed.data?.signedUrl){const img=document.createElement('img');img.src=signed.data.signedUrl;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>$('profileMenuAvatar').textContent=initial(name);$('profileMenuAvatar').appendChild(img);}else $('profileMenuAvatar').textContent=initial(name);
        }else $('profileMenuAvatar').textContent=initial(name);
      }
      return {name,avatarPath};
    }catch{
      if($('profileName'))$('profileName').textContent=name;
      if($('profileAvatar'))$('profileAvatar').textContent=initial(name);
      if($('profileMenuName'))$('profileMenuName').textContent=name;
      if($('profileMenuAvatar'))$('profileMenuAvatar').textContent=initial(name);
      return {name,avatarPath};
    }
  }

  function bindProfile(){
    const chip=$('profileChip');const menu=$('profileMenu'); if(!chip||!menu)return;
    chip.addEventListener('click',e=>{e.stopPropagation();const open=!document.body.classList.contains('profile-open');document.body.classList.toggle('profile-open',open);menu.setAttribute('aria-hidden',String(!open));chip.setAttribute('aria-expanded',String(open));});
    menu.addEventListener('click',e=>e.stopPropagation());
    $('profileLogout')?.addEventListener('click',async()=>{await aeriom.auth.signOut();location.replace('../index.html');});
    document.addEventListener('click',()=>{document.body.classList.remove('profile-open');menu.setAttribute('aria-hidden','true');chip.setAttribute('aria-expanded','false')});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('profile-open');menu.setAttribute('aria-hidden','true');chip.setAttribute('aria-expanded','false')}});
  }

  async function boot(){
    const s=await aeriom.auth.getSession(); user=s.data?.session?.user||null;
    if(!user){const next=encodeURIComponent(`${location.pathname}${location.search}`);location.replace(`../index.html?next=${next}`);return;}
    await loadSharedProfile();
    bindProfile();
    render();
    const qs=new URLSearchParams(location.search);
    if(qs.get('create')==='1'){toggleCreate(true);applyLocationFromParams();}
  }

  $('openCreate').addEventListener('click',()=>toggleCreate(true));
  $('emptyCreate').addEventListener('click',()=>toggleCreate(true));
  $('closeCreate').addEventListener('click',()=>toggleCreate(false));
  $('cancelCreate').addEventListener('click',()=>toggleCreate(false));
  $('openWorldMap')?.addEventListener('click',()=>{});
  $('campaignForm').addEventListener('submit',e=>{
    e.preventDefault();setMessage('');
    const name=$('campaignName').value.trim(), desc=$('campaignDescription').value.trim(), tone=$('campaignTone').value, scale=$('campaignScale').value;
    const lat=parseFloat($('campaignLatitude').value), lng=parseFloat($('campaignLongitude').value);
    const locationName=$('campaignLocationName').value.trim()||'Local selecionado no mapa';
    if(name.length<3){setMessage('Dê um nome com pelo menos 3 caracteres.');return;}
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){setMessage('Abra o Mapa Mundial e escolha o local inicial da campanha.');return;}
    const rows=loadCampaigns();rows.unshift({id:crypto.randomUUID(),name,description:desc,tone,scale,latitude:lat,longitude:lng,locationName,createdAt:new Date().toISOString()});saveCampaigns(rows);e.target.reset();toggleCreate(false);render();
  });
  $('mobileMenu')?.addEventListener('click',()=>document.body.classList.toggle('menu-open'));
  boot().catch(()=>location.replace('../index.html'));
})();