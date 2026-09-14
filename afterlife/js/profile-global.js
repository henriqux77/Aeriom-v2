(() => {
  'use strict';
  if (window.__afterlifeGlobalProfileBooted) return;
  window.__afterlifeGlobalProfileBooted = true;

  const NEW_LOGO = 'https://i.ibb.co/BH2Hqr3P/file-00000000b47c820e88b788de23f77e3e.png';
  const $ = (id) => document.getElementById(id);
  const initial = (name) => String(name || 'A').trim().charAt(0).toUpperCase() || 'A';

  function isAfterlifeHome() { return Boolean(document.querySelector('.dashboard-hero')); }

  function loadCss() {
    if (!document.querySelector('link[data-afterlife-profile-css]')) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href='./css/afterlife-profile-global.css?v=20260914-25'; link.dataset.afterlifeProfileCss='1'; document.head.appendChild(link);
    }
    if (!document.querySelector('link[data-afterlife-sidebar-css]')) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href='./css/afterlife-sidebar.css?v=20260914-25'; link.dataset.afterlifeSidebarCss='1'; document.head.appendChild(link);
    }
  }

  function setAvatar(box,url,name){
    if(!box)return; box.replaceChildren(); if(!url){box.textContent=initial(name);return;}
    const img=document.createElement('img'); img.src=url; img.alt=''; img.referrerPolicy='no-referrer'; img.loading='eager'; img.onerror=()=>{box.replaceChildren();box.textContent=initial(name)}; box.appendChild(img);
  }

  function applyBrandLogo(){
    document.querySelectorAll('.brand__title').forEach((brand)=>{
      let img=brand.querySelector('.brand__logo');
      if(!img){brand.replaceChildren();img=document.createElement('img');img.className='brand__logo';brand.appendChild(img);}
      img.src=NEW_LOGO; img.alt='AFTERLIFE — Sobrevivência além do fim'; img.decoding='async'; img.loading='eager'; img.style.display='block'; img.style.width='165px'; img.style.maxWidth='100%'; img.style.height='auto'; img.style.objectFit='contain';
    });
  }

  function applyCombatAnimationFix(){
    if(!document.body?.classList.contains('character-builder'))return;
    let style=document.getElementById('afterlife-combat-animation-fix');
    if(!style){
      style=document.createElement('style'); style.id='afterlife-combat-animation-fix'; style.textContent=`.character-builder .combat-status-ring{animation:none!important;transform:none!important}.character-builder .combat-status-ring::before{transform-origin:50% 50%!important;animation:afterlifeGlobalStatusArcSpin 2.2s linear infinite!important}.character-builder .combat-status-icon{transform:none!important;animation:none!important}@keyframes afterlifeGlobalStatusArcSpin{to{transform:rotate(360deg)}}`; document.head.appendChild(style);
    } else document.head.appendChild(style);
  }

  function startCombatAnimationGuard(){
    if(!document.body?.classList.contains('character-builder'))return;
    const run=()=>applyCombatAnimationFix(); run(); setTimeout(run,0); setTimeout(run,60); setTimeout(run,250); let timer=0;
    const observer=new MutationObserver((records)=>{if(timer)clearTimeout(timer);if(records.some((record)=>Array.from(record.addedNodes).some((node)=>node.nodeType===1&&node.id!=='afterlife-combat-animation-fix'))){timer=setTimeout(()=>{applyCombatAnimationFix();observer.disconnect()},0)}}); observer.observe(document.head,{childList:true});
  }

  function setProfile(name,avatarUrl,email){
    const display=name||'Sobrevivente';
    ['profileName','profileDropdownName','profileMenuName','afterlifeGlobalProfileName'].forEach((id)=>{const el=$(id);if(el)el.textContent=display});
    ['profileDropdownEmail','profileMenuEmail','afterlifeGlobalProfileEmail'].forEach((id)=>{const el=$(id);if(el)el.textContent=email||'Conta Afterlife'});
    setAvatar($('profileAvatar'),avatarUrl,display); setAvatar($('profileDropdownAvatar'),avatarUrl,display); setAvatar($('profileMenuAvatar'),avatarUrl,display); setAvatar($('afterlifeGlobalProfileAvatar'),avatarUrl,display);
  }

  function createMenu(chip){
    const wrap=chip.closest('.profile-wrap')||chip.parentElement; wrap?.classList.add('afterlife-global-profile-wrap');
    let menu=$('afterlifeGlobalProfileMenu')||$('profileMenu')||$('profileDropdown');
    if(!menu){
      menu=document.createElement('div'); menu.id='afterlifeGlobalProfileMenu'; menu.className='afterlife-global-profile-menu';
      menu.innerHTML=`<div class="afterlife-global-profile-head"><span class="afterlife-global-profile-avatar" id="afterlifeGlobalProfileAvatar">A</span><div><strong id="afterlifeGlobalProfileName">Sobrevivente</strong><small id="afterlifeGlobalProfileEmail">Conta Afterlife</small><span class="afterlife-global-profile-badge"><i></i> Conta Afterlife</span></div></div><div class="afterlife-global-profile-actions"><a href="./perfil.html">Editar perfil</a><a href="../index.html">Trocar sistema</a><button type="button" class="danger" id="afterlifeGlobalLogout">Sair da conta</button></div>`;
      (wrap||document.querySelector('.top-actions')||document.body).appendChild(menu);
    }
    menu.classList.add('afterlife-global-profile-menu'); menu.hidden=true; menu.setAttribute('aria-hidden','true'); return {wrap,menu};
  }

  async function getClient(){const mod=await import('./aeriom-client.js?v=20260914-25');return mod.aeriom;}

  async function loadProfile(){
    try{
      const sb=await getClient(); const {data:sessionData}=await sb.auth.getSession(); const user=sessionData?.session?.user||null;
      if(!user){setProfile('Sobrevivente','','Faça login no AFTERLIFE');return;}
      let name=user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Sobrevivente';
      const {data,error}=await sb.from('profiles').select('id,display_name,avatar_path').eq('id',user.id).maybeSingle(); if(error)throw error;
      const profile=data||{id:user.id,display_name:name,avatar_path:null}; if(data?.display_name)name=data.display_name; let avatarUrl='';
      if(profile.avatar_path){const signed=await sb.storage.from('avatars').createSignedUrl(profile.avatar_path,3600);avatarUrl=signed.data?.signedUrl||'';}
      setProfile(name,avatarUrl,user.email||'Conta Afterlife');
    }catch(error){console.warn('[AFTERLIFE] perfil:',error);setProfile('Sobrevivente','','Conta Afterlife');}
  }

  async function bootProfile(){
    if(!isAfterlifeHome())return; const chip=$('profileChip')||document.querySelector('.profile-chip'); if(!chip)return; const {menu}=createMenu(chip); chip.classList.add('afterlife-global-profile-chip'); chip.setAttribute('aria-expanded','false');
    if(chip.dataset.afterlifeProfileBound!=='1'){
      chip.dataset.afterlifeProfileBound='1';
      chip.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();const open=menu.hidden;menu.hidden=!open;menu.setAttribute('aria-hidden',String(!open));chip.setAttribute('aria-expanded',String(open));},true);
      document.addEventListener('click',(event)=>{if(!menu.contains(event.target)&&!chip.contains(event.target)){menu.hidden=true;menu.setAttribute('aria-hidden','true');chip.setAttribute('aria-expanded','false');}},true);
      document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){menu.hidden=true;menu.setAttribute('aria-hidden','true');chip.setAttribute('aria-expanded','false');}});
      menu.addEventListener('click',(event)=>event.stopPropagation(),true);
      menu.querySelector('#afterlifeGlobalLogout')?.addEventListener('click',async(event)=>{event.preventDefault();event.stopPropagation();try{const sb=await getClient();await sb.auth.signOut();}finally{location.replace('../index.html');}},true);
    }
    await loadProfile();
  }

  async function boot(){
    loadCss(); applyBrandLogo(); startCombatAnimationGuard();
    if(!isAfterlifeHome())try{await import('./afterlife-sidebar.js?v=20260914-25')}catch(error){console.warn('[AFTERLIFE] sidebar:',error)}
    await bootProfile();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
