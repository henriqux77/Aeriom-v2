import { aeriom, afterlifeReady, ensureAfterlifeSession } from './aeriom-client.js?v=20260914-30';

const BUCKET = 'avatars';
const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);
const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const HANDOFF_KEY = 'afterlife_portal_handoff';
const $ = (id) => document.getElementById(id);
let user = null;
let profile = {};
let shared = null;
let selectedFile = null;
let previewUrl = null;
let crop = { image:null, zoom:1, x:0, y:0, baseScale:1, dragging:false, lastX:0, lastY:0 };

function message(text,type='') { const el=$('profile-message'); if(!el)return; el.textContent=text||''; el.dataset.type=type; }
function initial(name){ return String(name||'A').trim().charAt(0).toUpperCase()||'?'; }
function renderAvatar(url,name){ const box=$('profile-avatar-large'); if(!box)return; box.replaceChildren(); if(url){ const img=document.createElement('img'); img.src=url; img.alt=''; img.referrerPolicy='no-referrer'; img.loading='eager'; img.onerror=()=>{box.innerHTML='<span>'+initial(name)+'</span>';}; box.appendChild(img); } else box.innerHTML='<span>'+initial(name)+'</span>'; }

async function getPortalClient(){ const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); return createClient(PORTAL_URL,PORTAL_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}); }
async function getSharedProfile(){
  try{
    const raw=localStorage.getItem(HANDOFF_KEY); if(!raw)return null;
    const handoff=JSON.parse(raw); if(!handoff?.access_token||!handoff?.refresh_token)return null;
    if(handoff.created_at&&Date.now()-Number(handoff.created_at)>300000){localStorage.removeItem(HANDOFF_KEY);return null;}
    const portal=await getPortalClient();
    const restored=await portal.auth.setSession({access_token:handoff.access_token,refresh_token:handoff.refresh_token});
    if(restored.error||!restored.data?.session?.user)return null;
    const portalUser=restored.data.session.user;
    const {data,error}=await portal.from('profiles').select('id,display_name,avatar_path').eq('id',portalUser.id).maybeSingle();
    if(error)throw error;
    const {data:recovery,error:recoveryError}=await portal.from('profile_recovery_contacts').select('recovery_email,recovery_phone').eq('user_id',portalUser.id).maybeSingle();
    if(recoveryError)throw recoveryError;
    let avatarUrl='';
    if(data?.avatar_path){const signed=await portal.storage.from(BUCKET).createSignedUrl(data.avatar_path,3600);avatarUrl=signed.data?.signedUrl||'';}
    return { portal, user:portalUser, profile:data||{}, recovery:recovery||{}, avatarUrl };
  }catch(error){ console.warn('[AFTERLIFE][PROFILE][SHARED]',error); return null; }
}

async function signedUrl(path){ if(!path)return null; const {data,error}=await aeriom.storage.from(BUCKET).createSignedUrl(path,3600); if(error)throw error; return data?.signedUrl||null; }

async function load(){
  const localResult=await aeriom.from('profiles').select('id,display_name,avatar_path').eq('id',user.id).maybeSingle();
  if(localResult.error)throw localResult.error;
  profile=localResult.data||{};
  const rc=await aeriom.from('profile_recovery_contacts').select('recovery_email,recovery_phone').eq('user_id',user.id).maybeSingle();
  if(rc.error)throw rc.error;

  shared=await getSharedProfile();
  const name=shared?.profile?.display_name||profile.display_name||shared?.user?.user_metadata?.display_name||shared?.user?.user_metadata?.full_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Sobrevivente';
  const email=shared?.user?.email||user.email||'';
  const recoveryEmail=shared?.recovery?.recovery_email||rc.data?.recovery_email||'';
  const recoveryPhone=shared?.recovery?.recovery_phone||rc.data?.recovery_phone||'';

  $('profile-display-name').value=name;
  $('profile-recovery-email').value=recoveryEmail;
  $('profile-recovery-phone').value=recoveryPhone;
  $('profile-preview-name').textContent=name;
  $('profile-preview-email').textContent=email;

  let avatarUrl=shared?.avatarUrl||'';
  if(!avatarUrl && profile.avatar_path) avatarUrl=await signedUrl(profile.avatar_path);
  renderAvatar(avatarUrl,name);
}

function clampImagePosition(){ const size=320,w=crop.image.width*crop.baseScale*crop.zoom,h=crop.image.height*crop.baseScale*crop.zoom; crop.x=Math.min(0,Math.max(size-w,crop.x)); crop.y=Math.min(0,Math.max(size-h,crop.y)); }
function drawCrop(){ const canvas=$('profile-crop-canvas'); if(!canvas||!crop.image)return; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,320,320); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; const scale=crop.baseScale*crop.zoom; ctx.drawImage(crop.image,crop.x,crop.y,crop.image.width*scale,crop.image.height*scale); $('profile-crop-zoom-value').textContent=Math.round(crop.zoom*100)+'%'; }
function centerCropImage(){ const scale=crop.baseScale*crop.zoom; crop.x=(320-crop.image.width*scale)/2; crop.y=(320-crop.image.height*scale)/2; clampImagePosition(); }
function openCropEditor(file){ const img=new Image(); img.decoding='async'; img.onload=()=>{ crop.image=img; crop.zoom=1; crop.baseScale=Math.max(320/img.naturalWidth,320/img.naturalHeight); centerCropImage(); $('profile-crop-zoom').value='1'; $('profile-crop-stage').classList.remove('has-moved'); const modal=$('profile-crop-modal'); modal.hidden=false; modal.setAttribute('aria-hidden','false'); document.body.classList.add('profile-crop-open'); drawCrop(); }; img.onerror=()=>message('Não foi possível abrir esta imagem.','error'); img.src=URL.createObjectURL(file); }
function closeCropEditor(){ const modal=$('profile-crop-modal'); if(!modal)return; modal.hidden=true; modal.setAttribute('aria-hidden','true'); document.body.classList.remove('profile-crop-open'); if(crop.image?.src?.startsWith('blob:'))URL.revokeObjectURL(crop.image.src); crop.image=null; crop.dragging=false; }
function pointerCropStart(event){ if(!crop.image)return; crop.dragging=true; crop.lastX=event.clientX; crop.lastY=event.clientY; $('profile-crop-stage').classList.add('has-moved'); event.currentTarget.setPointerCapture?.(event.pointerId); }
function pointerCropMove(event){ if(!crop.dragging||!crop.image)return; crop.x+=event.clientX-crop.lastX; crop.y+=event.clientY-crop.lastY; crop.lastX=event.clientX; crop.lastY=event.clientY; clampImagePosition(); drawCrop(); }
function pointerCropEnd(){crop.dragging=false;}
function applyCrop(){ if(!crop.image)return; const output=document.createElement('canvas'); output.width=512; output.height=512; const ctx=output.getContext('2d'); const factor=512/320,scale=crop.baseScale*crop.zoom*factor; ctx.fillStyle='#07100c'; ctx.fillRect(0,0,512,512); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(crop.image,crop.x*factor,crop.y*factor,crop.image.width*scale,crop.image.height*scale); output.toBlob((blob)=>{ if(!blob){message('Não foi possível preparar o recorte.','error');return;} selectedFile=new File([blob],'shared-avatar.jpg',{type:'image/jpeg'}); if(previewUrl)URL.revokeObjectURL(previewUrl); previewUrl=URL.createObjectURL(blob); renderAvatar(previewUrl,$('profile-display-name').value||'Sobrevivente'); $('profile-avatar-status').textContent='Recorte preparado. Salve o perfil para aplicar nos dois sistemas.'; message(''); closeCropEditor(); },'image/jpeg',.92); }

function bind(){
  $('profile-avatar-file')?.addEventListener('change',()=>{ const file=$('profile-avatar-file').files?.[0]; if(!file){$('profile-avatar-status').textContent='Nenhuma nova imagem selecionada.';return;} if(!TYPES.has(file.type)){message('Formato de imagem não permitido.','error');$('profile-avatar-file').value='';return;} if(file.size>MAX_SIZE){message('A imagem precisa ter no máximo 5 MB.','error');$('profile-avatar-file').value='';return;} $('profile-avatar-file').value=''; openCropEditor(file); });
  $('profile-display-name')?.addEventListener('input',()=>{if(!selectedFile)renderAvatar(null,$('profile-display-name').value||'Sobrevivente');$('profile-preview-name').textContent=$('profile-display-name').value||'Sobrevivente';});
  $('profile-cancel')?.addEventListener('click',()=>history.back());
  $('profile-crop-zoom')?.addEventListener('input',(event)=>{ const next=Number(event.target.value),old=crop.zoom,factor=next/old; crop.zoom=next; const center=160; crop.x=center-(center-crop.x)*factor; crop.y=center-(center-crop.y)*factor; clampImagePosition(); drawCrop(); });
  $('profile-crop-stage')?.addEventListener('pointerdown',pointerCropStart); $('profile-crop-stage')?.addEventListener('pointermove',pointerCropMove); $('profile-crop-stage')?.addEventListener('pointerup',pointerCropEnd); $('profile-crop-stage')?.addEventListener('pointercancel',pointerCropEnd); $('profile-crop-stage')?.addEventListener('pointerleave',pointerCropEnd);
  document.querySelectorAll('[data-crop-close]').forEach((el)=>el.addEventListener('click',closeCropEditor)); $('profile-crop-apply')?.addEventListener('click',applyCrop); $('profile-form')?.addEventListener('submit',save);
}

async function save(event){
  event.preventDefault(); message('');
  const name=$('profile-display-name').value.trim(), recoveryEmail=$('profile-recovery-email').value.trim().toLowerCase(), recoveryPhone=$('profile-recovery-phone').value.trim();
  if(name.length<2){message('Digite um nome de exibição com pelo menos 2 caracteres.','error');return;}
  if(recoveryEmail&&!/^\S+@\S+\.\S+$/.test(recoveryEmail)){message('Digite um e-mail de recuperação válido.','error');return;}
  const saveBtn=$('profile-save'); saveBtn.disabled=true;
  try{
    const sharedNow=shared||await getSharedProfile();
    if(!sharedNow?.user){throw new Error('Não foi possível acessar a identidade compartilhada. Volte ao portal e entre novamente antes de salvar.');}

    let sharedAvatarPath=sharedNow.profile?.avatar_path||null;
    if(selectedFile){
      const path=`${sharedNow.user.id}/${crypto.randomUUID()}.jpg`;
      const {error}=await sharedNow.client.storage.from(BUCKET).upload(path,selectedFile,{contentType:selectedFile.type,upsert:false,cacheControl:'3600'});
      if(error)throw error;
      sharedAvatarPath=path;
    }

    const now=new Date().toISOString();
    const {error:sharedProfileError}=await sharedNow.client.from('profiles').upsert({id:sharedNow.user.id,display_name:name,avatar_path:sharedAvatarPath,updated_at:now},{onConflict:'id'});
    if(sharedProfileError)throw sharedProfileError;
    const {error:sharedMetadataError}=await sharedNow.client.auth.updateUser({data:{display_name:name}});
    if(sharedMetadataError)throw sharedMetadataError;
    if(recoveryEmail||recoveryPhone){ const {error}=await sharedNow.client.from('profile_recovery_contacts').upsert({user_id:sharedNow.user.id,recovery_email:recoveryEmail||null,recovery_phone:recoveryPhone||null,updated_at:now},{onConflict:'user_id'}); if(error)throw error; }
    else { const {error}=await sharedNow.client.from('profile_recovery_contacts').delete().eq('user_id',sharedNow.user.id); if(error)throw error; }

    // Mirror the shared identity into the Afterlife profile cache too. Fiches/campaigns remain Afterlife-only.
    let localAvatarPath=profile.avatar_path||null;
    if(selectedFile){ const path=`${user.id}/${crypto.randomUUID()}.jpg`; const {error}=await aeriom.storage.from(BUCKET).upload(path,selectedFile,{contentType:selectedFile.type,upsert:false,cacheControl:'3600'}); if(error)throw error; localAvatarPath=path; }
    const {error:localProfileError}=await aeriom.from('profiles').upsert({id:user.id,display_name:name,avatar_path:localAvatarPath,updated_at:now},{onConflict:'id'}); if(localProfileError)throw localProfileError;
    const {error:localMetadataError}=await aeriom.auth.updateUser({data:{display_name:name}}); if(localMetadataError)throw localMetadataError;
    if(recoveryEmail||recoveryPhone){ const {error}=await aeriom.from('profile_recovery_contacts').upsert({user_id:user.id,recovery_email:recoveryEmail||null,recovery_phone:recoveryPhone||null,updated_at:now},{onConflict:'user_id'}); if(error)throw error; }
    else { const {error}=await aeriom.from('profile_recovery_contacts').delete().eq('user_id',user.id); if(error)throw error; }

    profile={...profile,display_name:name,avatar_path:localAvatarPath}; selectedFile=null; shared={...sharedNow,profile:{...sharedNow.profile,display_name:name,avatar_path:sharedAvatarPath}};
    $('profile-avatar-status').textContent='Alterações salvas nos dois sistemas.'; $('profile-preview-name').textContent=name;
    const avatarUrl=sharedAvatarPath?((await sharedNow.client.storage.from(BUCKET).createSignedUrl(sharedAvatarPath,3600)).data?.signedUrl||''):(localAvatarPath?await signedUrl(localAvatarPath):'');
    renderAvatar(avatarUrl,name); message('Perfil compartilhado atualizado com sucesso.','success');
  }catch(error){ console.error('[SHARED][PROFILE]',error); message(error?.message||'Não foi possível salvar o perfil compartilhado.','error'); }
  finally{saveBtn.disabled=false;}
}

async function boot(){
  try{
    await afterlifeReady;
    const session=await ensureAfterlifeSession();
    if(!session){
      // The identity can still be previewed from the central Aeriom profile when the Afterlife session is temporarily unavailable.
      shared=await getSharedProfile();
      if(shared){ user=shared.user; profile={}; $('profile-display-name').value=shared.profile?.display_name||shared.user.user_metadata?.display_name||''; $('profile-recovery-email').value=shared.recovery?.recovery_email||''; $('profile-recovery-phone').value=shared.recovery?.recovery_phone||''; $('profile-preview-name').textContent=$('profile-display-name').value||'Sobrevivente'; $('profile-preview-email').textContent=shared.user.email||''; renderAvatar(shared.avatarUrl,$('profile-display-name').value||'Sobrevivente'); bind(); return; }
      message('Não foi possível restaurar sua identidade compartilhada. Volte ao portal e entre novamente.','error'); return;
    }
    user=session.user||session;
    await load(); bind();
  }catch(error){ console.error('[AFTERLIFE][PROFILE]',error); message('Não foi possível carregar o perfil compartilhado.','error'); }
}
boot();
