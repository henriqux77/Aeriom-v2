(() => {
  'use strict';

  const boot = async () => {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const AFTERLIFE_SUPABASE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
    const AFTERLIFE_SUPABASE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
    const AERIOM_SUPABASE_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
    const AERIOM_SUPABASE_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
    const supabase = createClient(AFTERLIFE_SUPABASE_URL, AFTERLIFE_SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const aeriom = createClient(AERIOM_SUPABASE_URL, AERIOM_SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');
    const clock = document.getElementById('clock');
    const continueBtn = document.getElementById('continueBtn');
    const profileChip = document.querySelector('.profile-chip');
    const profileCopy = document.querySelector('.profile-copy strong');
    const profileAvatar = document.querySelector('.profile-avatar');
    const profileNameEl = document.getElementById('profileName');
    const initial = (name) => String(name || 'A').trim().charAt(0).toUpperCase() || '?';

    const renderTopAvatar = (url,name) => {
      if(!profileAvatar) return;
      profileAvatar.replaceChildren();
      if(!url){profileAvatar.textContent=initial(name);return;}
      const img=document.createElement('img');img.src=url;img.alt='';img.referrerPolicy='no-referrer';
      img.onerror=()=>{profileAvatar.replaceChildren();profileAvatar.textContent=initial(name)};
      profileAvatar.appendChild(img);
    };
    const loadProfile = async user => {
      const fallback=user?.user_metadata?.display_name||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Sobrevivente';
      let name=fallback,avatarUrl='';
      try{const {data}=await aeriom.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();name=data?.display_name||fallback;if(data?.avatar_path){const {data:s}=await aeriom.storage.from('avatars').createSignedUrl(data.avatar_path,3600);avatarUrl=s?.signedUrl||'';}}catch(_){ }
      avatarUrl ||= user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
      if(profileCopy) profileCopy.textContent=name;
      if(profileNameEl) profileNameEl.textContent=name;
      renderTopAvatar(avatarUrl,name);
      return {name,email:user?.email||'',avatarUrl};
    };
    const setupProfile = profile => {
      if(!profileChip) return;
      const wrap=profileChip.closest('.profile-wrap')||profileChip.parentElement;
      if(!wrap || wrap.dataset.afterlifeProfileBound==='1') return;
      wrap.dataset.afterlifeProfileBound='1';
      let menu=wrap.querySelector('.afterlife-account-menu');
      if(!menu){
        menu=document.createElement('div');menu.className='afterlife-account-menu';menu.hidden=true;menu.setAttribute('role','menu');
        menu.innerHTML=`<div class="afterlife-account-head"><span class="afterlife-account-avatar"></span><div class="afterlife-account-head-copy"><strong></strong><small></small></div></div><div class="afterlife-account-actions"><a href="./perfil.html">Editar perfil</a><a href="../index.html">Trocar sistema</a><button class="danger" type="button" data-account-logout>Sair da conta</button></div>`;
        wrap.appendChild(menu);
      }
      const av=menu.querySelector('.afterlife-account-avatar');av.replaceChildren();
      if(profile.avatarUrl){const img=document.createElement('img');img.src=profile.avatarUrl;img.alt='';img.referrerPolicy='no-referrer';av.appendChild(img);}else av.textContent=initial(profile.name);
      menu.querySelector('.afterlife-account-head-copy strong').textContent=profile.name;
      menu.querySelector('.afterlife-account-head-copy small').textContent=profile.email||'Conta Afterlife';
      const close=()=>{menu.hidden=true;profileChip.setAttribute('aria-expanded','false')};
      profileChip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();menu.hidden=!menu.hidden;profileChip.setAttribute('aria-expanded',String(!menu.hidden))});
      document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()},{passive:true});
      document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
      menu.querySelector('[data-account-logout]')?.addEventListener('click',async()=>{await aeriom.auth.signOut();await supabase.auth.signOut();location.replace('../index.html')});
    };

    try{const {data}=await aeriom.auth.getSession();if(data?.session?.user && profileChip)setupProfile(await loadProfile(data.session.user));}catch(_){ }
    mobileMenu?.addEventListener('click',()=>sidebar?.classList.toggle('is-open'));
    document.querySelectorAll('.side-nav__item').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.side-nav__item').forEach(nav=>nav.classList.remove('is-active'));item.classList.add('is-active');sidebar?.classList.remove('is-open')}));
    const updateClock=()=>{if(clock)clock.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false})};updateClock();window.setInterval(updateClock,1000);
    continueBtn?.addEventListener('click',()=>document.getElementById('campanhas')?.scrollIntoView({behavior:'smooth',block:'start'}));
    const search=document.querySelector('.search-box input');window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search?.focus()}});
  };
  boot().catch(console.error);
})();
