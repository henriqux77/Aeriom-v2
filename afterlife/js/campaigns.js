import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';
  const AERIOM_URL='https://kitlpowgcugvlxwhwhqv.supabase.co';
  const AERIOM_KEY='sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const aeriom=createClient(AERIOM_URL,AERIOM_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const KEY_PREFIX='afterlife_campaigns_v1_';
  const $=id=>document.getElementById(id);
  let user=null;
  let pickerMap=null;
  let pickerMarker=null;
  const escapeHtml=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function key(){return KEY_PREFIX+(user?.id||'anonymous');}
  function loadCampaigns(){try{return JSON.parse(localStorage.getItem(key())||'[]')}catch{return[]}}
  function saveCampaigns(rows){localStorage.setItem(key(),JSON.stringify(rows));}
  function render(){
    const rows=loadCampaigns(); const list=$('campaignList'); const empty=$('campaignEmpty'); const count=$('campaignCount');
    count.textContent=`${rows.length} ${rows.length===1?'campanha':'campanhas'}`;
    list.replaceChildren(); empty.style.display=rows.length?'none':'block';
    rows.forEach(c=>{
      const article=document.createElement('article'); article.className='campaign-item';
      const location=c.locationName||'Local definido no mapa';
      const coords=(Number.isFinite(c.latitude)&&Number.isFinite(c.longitude))?`${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`:'';
      article.innerHTML=`<div><div class="campaign-item__top"><h3>${escapeHtml(c.name)}</h3><span class="panel-count">${escapeHtml(c.tone)}</span></div><p>${escapeHtml(c.description||'Sem descrição.')}</p><div class="campaign-item__meta"><span>🌎 ${escapeHtml(location)}</span>${coords?`<span>⌖ ${coords}</span>`:''}<span>👤 1 Mestre</span></div></div><div class="campaign-item__actions"><button class="btn btn--primary" data-open="${escapeHtml(c.id)}">ABRIR →</button><button class="btn btn--ghost" data-delete="${escapeHtml(c.id)}">EXCLUIR</button></div>`;
      list.appendChild(article);
    });
    list.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{location.href=`./campanhas.html?selected=${encodeURIComponent(b.dataset.open)}`}));
    list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Excluir esta campanha?')){saveCampaigns(loadCampaigns().filter(c=>c.id!==b.dataset.delete));render();}}));
  }
  function setMessage(text=''){const el=$('campaignMessage');el.textContent=text;el.classList.toggle('is-visible',Boolean(text));}
  function toggleCreate(show){$('createPanel').hidden=!show;if(show){requestAnimationFrame(()=>{initLocationMap();$('campaignName').focus()})}else setMessage('');}
  function updateLocation(latlng){
    $('campaignLatitude').value=latlng.lat.toFixed(6);
    $('campaignLongitude').value=latlng.lng.toFixed(6);
    $('campaignLocationName').value='Ponto selecionado';
    $('campaignLocationStatus').innerHTML=`<strong>Local escolhido</strong><span>${latlng.lat.toFixed(5)}°, ${latlng.lng.toFixed(5)}°</span>`;
  }
  function placeMarker(latlng){
    if(!pickerMap)return;
    if(pickerMarker)pickerMarker.remove();
    pickerMarker=L.marker(latlng,{draggable:true}).addTo(pickerMap);
    pickerMarker.on('dragend',e=>updateLocation(e.target.getLatLng()));
    pickerMap.panTo(latlng,{animate:true});
    updateLocation(latlng);
  }
  function initLocationMap(){
    if(typeof L==='undefined'||!$('campaignLocationMap'))return;
    if(pickerMap){pickerMap.invalidateSize();return;}
    pickerMap=L.map('campaignLocationMap',{center:[15,0],zoom:2,minZoom:2,maxZoom:18,worldCopyJump:true,zoomControl:true});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:20,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(pickerMap);
    pickerMap.on('click',e=>placeMarker(e.latlng));
    window.addEventListener('resize',()=>pickerMap?.invalidateSize());
  }
  function resetLocation(){
    if(pickerMarker){pickerMarker.remove();pickerMarker=null;}
    $('campaignLatitude').value='';$('campaignLongitude').value='';$('campaignLocationName').value='';
    $('campaignLocationStatus').textContent='Nenhum ponto selecionado.';
  }
  async function boot(){
    const s=await aeriom.auth.getSession(); user=s.data?.session?.user||null;
    if(!user){const next=encodeURIComponent(location.pathname);location.replace(`../index.html?next=${next}`);return;}
    $('profileName').textContent=user.user_metadata?.display_name||user.email?.split('@')[0]||'Sobrevivente';
    const fallback=(user.user_metadata?.display_name||'S').charAt(0).toUpperCase(); $('profileAvatar').textContent=fallback;
    try{const p=await aeriom.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();if(p.data?.display_name)$('profileName').textContent=p.data.display_name;if(p.data?.avatar_path){const u=await aeriom.storage.from('avatars').createSignedUrl(p.data.avatar_path,3600);if(!u.error&&u.data?.signedUrl){$('profileAvatar').innerHTML=`<img src="${u.data.signedUrl}" alt="">`;}}}catch{}
    render();
    if(new URLSearchParams(location.search).get('create')==='1')toggleCreate(true);
  }
  $('openCreate').addEventListener('click',()=>toggleCreate(true)); $('emptyCreate').addEventListener('click',()=>toggleCreate(true)); $('closeCreate').addEventListener('click',()=>toggleCreate(false)); $('cancelCreate').addEventListener('click',()=>toggleCreate(false));
  $('useMapLocation')?.addEventListener('click',()=>{initLocationMap();$('campaignLocationMap')?.scrollIntoView({behavior:'smooth',block:'center'});});
  $('campaignForm').addEventListener('submit',e=>{e.preventDefault();setMessage('');const name=$('campaignName').value.trim();const desc=$('campaignDescription').value.trim();const tone=$('campaignTone').value;const scale=$('campaignScale').value;const lat=parseFloat($('campaignLatitude').value);const lng=parseFloat($('campaignLongitude').value);if(name.length<3){setMessage('Dê um nome com pelo menos 3 caracteres.');return;}if(!Number.isFinite(lat)||!Number.isFinite(lng)){setMessage('Escolha no mapa o ponto onde a campanha começa.');return;}const rows=loadCampaigns();rows.unshift({id:crypto.randomUUID(),name,description:desc,tone,scale,latitude:lat,longitude:lng,locationName:'Ponto selecionado',createdAt:new Date().toISOString()});saveCampaigns(rows);e.target.reset();resetLocation();toggleCreate(false);render();});
  $('mobileMenu')?.addEventListener('click',()=>document.body.classList.toggle('menu-open'));
  $('profileChip')?.addEventListener('click',()=>document.body.classList.toggle('profile-open'));
  document.addEventListener('click',e=>{if(!e.target.closest('#profileChip')&&!e.target.closest('#profileMenu'))document.body.classList.remove('profile-open')});
  boot().catch(()=>location.replace('../index.html'));
})();