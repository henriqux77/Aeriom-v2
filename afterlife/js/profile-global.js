(() => {
  'use strict';
  if (window.__afterlifeGlobalProfileBooted) return;
  window.__afterlifeGlobalProfileBooted = true;

  const AERIOM_URL='https://kitlpowgcugvlxwhwhqv.supabase.co';
  const AERIOM_KEY='sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const $=id=>document.getElementById(id);
  const initial=name=>String(name||'A').trim().charAt(0).toUpperCase()||'A';

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='./css/afterlife-profile-global.css?v=20260913-1';
  document.head.appendChild(css);

  let menu=null;
  let chip=null;

  function avatar(box,url,name,large=false){
    if(!box)return;
    box.replaceChildren();
    box.style.position='relative';
    box.style.overflow='hidden';
    box.style.flex='0 0 auto';
    box.style.width=large?'48px':'35px';
    box.style.height=large?'48px':'35px';
    box.style.minWidth=large?'48px':'35px';
    box.style.minHeight=large?'48px':'35px';
    box.style.maxWidth=large?'48px':'35px';
    box.style.maxHeight=large?'48px':'35px';
    if(!url){box.textContent=initial(name);return;}
    const img=document.createElement('img');
    img.src=url;img.alt='';img.referrerPolicy='no-referrer';
    img.onerror=()=>{box.replaceChildren();box.textContent=initial(name);};
    box.appendChild(img);
  }

  function ensureMenu(){
    chip=$('profileChip')||document.querySelector('.profile-chip');
    if(!chip)return null;
    chip.classList.add('afterlife-global-profile-chip');
    const wrap=chip.closest('.profile-wrap')||chip.parentElement;
    if(wrap)wrap.classList.add('afterlife-global-profile-wrap');

    menu=$('profileDropdown')||$('profileMenu');
    if(menu){
      menu.classList.add('afterlife-global-profile-menu');
      if(menu.id==='profileMenu')menu.hidden=true;
      return menu;
    }

    menu=document.createElement('div');
    menu.id='afterlifeGlobalProfileMenu';
    menu.className='afterlife-global-profile-menu';
    menu.hidden=true;
    menu.innerHTML='<div class="afterlife-global-profile-head"><span class="afterlife-global-profile-avatar" id="afterlifeGlobalProfileAvatar">A</span><div><strong id="afterlifeGlobalProfileName">Sobrevivente</strong><small id="afterlifeGlobalProfileEmail">Conta Afterlife</small></div></div><div class="afterlife-global-profile-actions"><a href="./perfil.html">Editar perfil</a><a href="../index.html">Trocar sistema</a><button type="button" class="danger" id="afterlifeGlobalLogout">Sair da conta</button></div>';
    (wrap||document.querySelector('.top-actions')||document.body).appendChild(menu);
    return menu;
  }

  function setProfile(name,url,email){
    const n=name||'Sobrevivente';
    const ids=['profileName','profileDropdownName','profileMenuName','afterlifeGlobalProfileName'];
    ids.forEach(id=>{if($(id))$(id).textContent=n;});
    if($('profileDropdownEmail'))$('profileDropdownEmail').textContent=email||'Conta Afterlife';
    if($('profileMenuEmail'))$('profileMenuEmail').textContent=email||'Perfil compartilhado com AERIOM';
    if($('afterlifeGlobalProfileEmail'))$('afterlifeGlobalProfileEmail').textContent=email||'Conta Afterlife';
    avatar($('profileAvatar'),url,n,false);
    avatar($('profileDropdownAvatar'),url,n,true);
    avatar($('profileMenuAvatar'),url,n,true);
    avatar($('afterlifeGlobalProfileAvatar'),url,n,true);
  }

  function toggle(open){
    if(!menu||!chip)return;
    const state=typeof open==='boolean'?open:menu.hidden;
    menu.hidden=!state;
    if(menu.id==='profileMenu')document.body.classList.toggle('profile-open',state);
    chip.setAttribute('aria-expanded',String(state));
  }

  async function loadProfile(){
    try{
      const mod=await import('https://esm.sh/@supabase/supabase-js@2');
      const sb=window.__afterlifeAeriom||mod.createClient(AERIOM_URL,AERIOM_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      window.__afterlifeAeriom=sb;
      const session=await sb.auth.getSession();
      const user=session?.data?.session?.user;
      if(!user){setProfile('Sobrevivente','', 'Faça login no AERIOM');return;}
      let name=user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Sobrevivente';
      let url='';
      const p=await sb.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();
      if(p.data?.display_name)name=p.data.display_name;
      if(p.data?.avatar_path){const signed=await sb.storage.from('avatars').createSignedUrl(p.data.avatar_path,3600);url=signed.data?.signedUrl||'';}
      setProfile(name,url,user.email||'Conta Afterlife');
    }catch(error){console.warn('[AFTERLIFE] perfil global:',error);setProfile('Sobrevivente','', 'Conta Afterlife');}
  }

  function bind(){
    ensureMenu();
    if(!chip||!menu)return;
    chip.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggle();},{capture:true});
    document.addEventListener('click',event=>{if(!menu.contains(event.target)&&!chip.contains(event.target))toggle(false);},{capture:true});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')toggle(false);});
    menu.addEventListener('click',event=>event.stopPropagation());
    $('profileLogout')?.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();try{const mod=await import('https://esm.sh/@supabase/supabase-js@2');const sb=window.__afterlifeAeriom||mod.createClient(AERIOM_URL,AERIOM_KEY);await sb.auth.signOut();}finally{location.replace('../index.html');}});
    $('profileSignOut')?.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();try{const mod=await import('https://esm.sh/@supabase/supabase-js@2');const sb=window.__afterlifeAeriom||mod.createClient(AERIOM_URL,AERIOM_KEY);await sb.auth.signOut();}finally{location.replace('../index.html');}});
    $('afterlifeGlobalLogout')?.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();try{const mod=await import('https://esm.sh/@supabase/supabase-js@2');const sb=window.__afterlifeAeriom||mod.createClient(AERIOM_URL,AERIOM_KEY);await sb.auth.signOut();}finally{location.replace('../index.html');}});
  }

  function boot(){
    bind();
    loadProfile();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
