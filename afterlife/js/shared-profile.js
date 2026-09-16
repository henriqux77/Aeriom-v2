import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeSharedProfileBooted) return;
  window.__afterlifeSharedProfileBooted = true;

  const $ = (id) => document.getElementById(id);
  const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
  const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const PORTAL_STORAGE_KEY = 'sb-kitlpowgcugvlxwhwhqv-auth-token';
  const initials = (name) => String(name || 'Sobrevivente').trim().charAt(0).toUpperCase() || 'S';

  let sharedState = { name:'', avatarUrl:'', email:'' };
  let syncing = false;
  let portalClient = null;
  let refreshTimers = [];

  function injectFix(){
    if($('afterlife-shared-profile-presentation-fix')) return;
    const style=document.createElement('style'); style.id='afterlife-shared-profile-presentation-fix';
    style.textContent=`
      .profile-chip{display:flex!important;align-items:center!important;visibility:visible!important}
      .profile-avatar,.afterlife-global-profile-avatar,.afterlife-profile-avatar{position:relative!important;overflow:hidden!important;display:grid!important;place-items:center!important;border-radius:50%!important}
      .profile-avatar img,.afterlife-global-profile-avatar img,.afterlife-profile-avatar img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;display:block!important}
    `;
    document.head.appendChild(style);
  }

  function setAvatar(el,url,name){
    if(!el||syncing) return;
    syncing=true;
    try{
      el.replaceChildren();
      if(!url){el.textContent=initials(name);return;}
      const img=document.createElement('img');
      img.src=url; img.alt=''; img.loading='eager'; img.referrerPolicy='no-referrer';
      img.onerror=()=>{el.replaceChildren();el.textContent=initials(name);};
      el.appendChild(img);
    }finally{syncing=false;}
  }

  function setProfile(name,avatarUrl,email){
    const display=name||'Sobrevivente';
    sharedState={name:display,avatarUrl:avatarUrl||'',email:email||''};
    ['profileName','profileDropdownName','profileMenuName','afterlifeGlobalProfileName'].forEach(id=>$(id)?.replaceChildren(document.createTextNode(display)));
    ['profileDropdownEmail','profileMenuEmail','afterlifeGlobalProfileEmail'].forEach(id=>$(id)?.replaceChildren(document.createTextNode(email||'Conta')));
    setAvatar($('profileAvatar'),avatarUrl,display);
    setAvatar($('profileDropdownAvatar'),avatarUrl,display);
    setAvatar($('profileMenuAvatar'),avatarUrl,display);
    setAvatar($('afterlifeGlobalProfileAvatar'),avatarUrl,display);
  }

  async function getPortalProfile(){
    try{
      if(!portalClient){
        portalClient=createClient(PORTAL_URL,PORTAL_KEY,{
          auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:false,
            storageKey:PORTAL_STORAGE_KEY,
          }
        });
      }

      const {data:sessionData,error:sessionError}=await portalClient.auth.getSession();
      if(sessionError) throw sessionError;
      const portalUser=sessionData?.session?.user;
      if(!portalUser?.id) return null;

      const {data:profile,error:profileError}=await portalClient
        .from('profiles')
        .select('id,display_name,avatar_path')
        .eq('id',portalUser.id)
        .maybeSingle();
      if(profileError) throw profileError;

      const metadata=portalUser.user_metadata||{};
      const name=profile?.display_name || metadata.display_name || metadata.full_name || metadata.name || portalUser.email?.split('@')[0] || 'Sobrevivente';

      let avatarUrl='';
      if(profile?.avatar_path){
        const signed=await portalClient.storage.from('avatars').createSignedUrl(profile.avatar_path,3600);
        avatarUrl=signed.data?.signedUrl||'';
        if(!avatarUrl){
          const fallback=portalClient.storage.from('avatars').getPublicUrl(profile.avatar_path);
          avatarUrl=fallback.data?.publicUrl||'';
        }
      }

      return {name,avatarUrl,email:portalUser.email||''};
    }catch(error){
      console.warn('[AFTERLIFE] perfil Portal:',error?.message||error);
      return null;
    }
  }

  async function getAfterlifeProfile(){
    try{
      const session=await ensureAfterlifeSession();
      const user=session?.user;
      if(!user?.id) return null;
      const {data:profile}=await aeriom.from('profiles').select('id,display_name,avatar_path').eq('id',user.id).maybeSingle();
      const metadata=user.user_metadata||{};
      const name=profile?.display_name||metadata.display_name||metadata.full_name||metadata.name||user.email?.split('@')[0]||'Sobrevivente';
      let avatarUrl='';
      if(profile?.avatar_path){
        try{
          const signed=await aeriom.storage.from('avatars').createSignedUrl(profile.avatar_path,3600);
          avatarUrl=signed.data?.signedUrl||'';
          if(!avatarUrl){
            const fallback=aeriom.storage.from('avatars').getPublicUrl(profile.avatar_path);
            avatarUrl=fallback.data?.publicUrl||'';
          }
        }catch{}
      }
      return {name,avatarUrl,email:user.email||''};
    }catch(error){
      console.warn('[AFTERLIFE] perfil local:',error?.message||error);
      return null;
    }
  }

  async function load(){
    const portalProfile=await getPortalProfile();
    if(portalProfile){
      setProfile(portalProfile.name,portalProfile.avatarUrl,portalProfile.email);
      return true;
    }

    const afterlifeProfile=await getAfterlifeProfile();
    if(afterlifeProfile){
      setProfile(afterlifeProfile.name,afterlifeProfile.avatarUrl,afterlifeProfile.email);
      return true;
    }

    setProfile('Sobrevivente','','Faça login no portal');
    return false;
  }

  function observeAvatars(){
    const observer=new MutationObserver(()=>{
      if(syncing||!sharedState.name) return;
      const targets=[$('profileAvatar'),$('profileDropdownAvatar'),$('profileMenuAvatar'),$('afterlifeGlobalProfileAvatar')].filter(Boolean);
      targets.forEach(target=>{
        if(sharedState.avatarUrl){
          const img=target.querySelector('img');
          if(!img||img.src!==sharedState.avatarUrl) setAvatar(target,sharedState.avatarUrl,sharedState.name);
        }
      });
    });
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
  }

  function bindDropdown(){
    const chip=$('profileChip');
    if(!chip||chip.dataset.sharedProfileBound==='1') return;
    const menu=$('profileDropdown')||$('profileMenu')||$('afterlifeGlobalProfileMenu');
    if(!menu) return;
    chip.dataset.sharedProfileBound='1';
    chip.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const open=menu.hidden;menu.hidden=!open;menu.setAttribute('aria-hidden',String(!open));chip.setAttribute('aria-expanded',String(open));},true);
    document.addEventListener('click',event=>{if(!menu.contains(event.target)&&!chip.contains(event.target)){menu.hidden=true;menu.setAttribute('aria-hidden','true');chip.setAttribute('aria-expanded','false');}},true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;menu.setAttribute('aria-hidden','true');chip.setAttribute('aria-expanded','false');}});
  }

  function schedulePortalRefresh(){
    refreshTimers.forEach(clearTimeout);
    refreshTimers=[250,900,2000].map(delay=>setTimeout(async()=>{
      const profile=await getPortalProfile();
      if(profile) setProfile(profile.name,profile.avatarUrl,profile.email);
    },delay));
  }

  async function boot(){
    injectFix();
    observeAvatars();
    bindDropdown();
    const found=await load();
    if(found) schedulePortalRefresh();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
