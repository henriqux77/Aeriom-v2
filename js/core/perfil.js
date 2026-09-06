import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

const BUCKET="avatars";
const MAX_SIZE=5*1024*1024;
const TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const $=(id)=>document.getElementById(id);
let supabase=null,user=null,profile=null,recovery=null,selectedFile=null,previewUrl=null,
    originalRecovery={email:"",phone:""},
    crop={image:null,zoom:1,x:0,y:0,baseScale:1,dragging:false,lastX:0,lastY:0};

function message(text,type=""){
 const el=$("profile-message"); if(!el)return;
 el.textContent=text||"";
 el.dataset.type=type;
}
function initial(name){return String(name||"A").trim().charAt(0).toUpperCase()||"?";}
function renderAvatar(url,name){
 const box=$("profile-avatar-large"); if(!box)return;
 box.replaceChildren();
 if(url){
  const img=document.createElement("img"); img.src=url; img.alt=""; img.onerror=()=>{box.innerHTML="<span>"+initial(name)+"</span>"}; box.appendChild(img);
 }else box.innerHTML="<span>"+initial(name)+"</span>";
}
async function signedUrl(path){
 if(!path)return null;
 const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,3600);
 if(error)throw error;
 return data?.signedUrl||null;
}
async function load(){
 const {data,error}=await supabase.from("profiles").select("id,display_name,avatar_path").eq("id",user.id).maybeSingle();
 if(error)throw error;
 profile=data||{};
 const rc=await supabase.from("profile_recovery_contacts").select("recovery_email,recovery_phone").eq("user_id",user.id).maybeSingle();
 if(rc.error)throw rc.error;
 recovery=rc.data||{};
 originalRecovery={email:recovery.recovery_email||"",phone:recovery.recovery_phone||""};
 $("profile-display-name").value=profile.display_name||"";
 $("profile-recovery-email").value=originalRecovery.email;
 $("profile-recovery-phone").value=originalRecovery.phone;
 const name=profile.display_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"Aventureiro";
 $("profile-preview-name").textContent=name;
 $("profile-preview-email").textContent=user.email||"";
 renderAvatar(profile.avatar_path?await signedUrl(profile.avatar_path):null,name);
}
function clampImagePosition(){
 const size=320;
 const width=crop.image.width*crop.baseScale*crop.zoom;
 const height=crop.image.height*crop.baseScale*crop.zoom;
 const minX=size-width;
 const minY=size-height;
 crop.x=Math.min(0,Math.max(minX,crop.x));
 crop.y=Math.min(0,Math.max(minY,crop.y));
}
function drawCrop(){
 const canvas=$("profile-crop-canvas");
 if(!canvas||!crop.image)return;
 const ctx=canvas.getContext("2d");
 const size=320;
 ctx.clearRect(0,0,size,size);
 ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality="high";
 const scale=crop.baseScale*crop.zoom;
 ctx.drawImage(crop.image,crop.x,crop.y,crop.image.width*scale,crop.image.height*scale);
 const zoomValue=Math.round(crop.zoom*100);
 $("profile-crop-zoom-value").textContent=zoomValue+"%";
}
function centerCropImage(){
 const size=320;
 const scale=crop.baseScale*crop.zoom;
 crop.x=(size-crop.image.width*scale)/2;
 crop.y=(size-crop.image.height*scale)/2;
 clampImagePosition();
}
async function openCropEditor(file){
 const img=new Image();
 img.decoding="async";
 img.onload=()=>{
   crop.image=img;
   crop.zoom=1;
   crop.baseScale=Math.max(320/img.naturalWidth,320/img.naturalHeight);
   crop.x=0;
   crop.y=0;
   centerCropImage();
   $("profile-crop-zoom").value="1";
   $("profile-crop-stage").classList.remove("has-moved");
   const modal=$("profile-crop-modal");
   modal.hidden=false;
   modal.setAttribute("aria-hidden","false");
   document.body.classList.add("profile-crop-open");
   drawCrop();
 };
 img.onerror=()=>message("Não foi possível abrir esta imagem.","error");
 img.src=URL.createObjectURL(file);
}
function closeCropEditor(){
 const modal=$("profile-crop-modal");
 if(!modal)return;
 modal.hidden=true;
 modal.setAttribute("aria-hidden","true");
 document.body.classList.remove("profile-crop-open");
 if(crop.image && crop.image.src.startsWith("blob:")){
   URL.revokeObjectURL(crop.image.src);
 }
 crop.image=null;
 crop.dragging=false;
}
function pointerCropStart(event){
 if(!crop.image)return;
 const point=event.touches?.[0]||event;
 crop.dragging=true;
 crop.lastX=point.clientX;
 crop.lastY=point.clientY;
 $("profile-crop-stage").classList.add("has-moved");
 event.currentTarget.setPointerCapture?.(event.pointerId);
}
function pointerCropMove(event){
 if(!crop.dragging||!crop.image)return;
 const dx=event.clientX-crop.lastX;
 const dy=event.clientY-crop.lastY;
 crop.lastX=event.clientX;
 crop.lastY=event.clientY;
 crop.x+=dx;
 crop.y+=dy;
 clampImagePosition();
 drawCrop();
}
function pointerCropEnd(){crop.dragging=false;}
function applyCrop(){
 if(!crop.image)return;
 const output=document.createElement("canvas");
 output.width=512;
 output.height=512;
 const ctx=output.getContext("2d");
 const factor=512/320;
 const scale=crop.baseScale*crop.zoom*factor;
 const x=crop.x*factor;
 const y=crop.y*factor;
 ctx.fillStyle="#0b0a08";
 ctx.fillRect(0,0,512,512);
 ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality="high";
 ctx.drawImage(crop.image,x,y,crop.image.width*scale,crop.image.height*scale);
 output.toBlob((blob)=>{
   if(!blob){
     message("Não foi possível preparar o recorte.","error");
     return;
   }
   selectedFile=new File([blob],"aerion-avatar.jpg",{type:"image/jpeg"});
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   previewUrl=URL.createObjectURL(blob);
   renderAvatar(previewUrl,$("profile-display-name").value||"Aventureiro");
   $("profile-avatar-status").textContent="Recorte preparado. Salve o perfil para aplicar.";
   message("");
   closeCropEditor();
 }, "image/jpeg", .92);
}
function bind(){
 $("profile-avatar-file").addEventListener("change",()=>{
  const file=$("profile-avatar-file").files?.[0];
  if(!file){
    $("profile-avatar-status").textContent="Nenhuma nova imagem selecionada.";
    return;
  }
  if(!TYPES.has(file.type)){message("Formato de imagem não permitido.","error");$("profile-avatar-file").value="";return;}
  if(file.size>MAX_SIZE){message("A imagem precisa ter no máximo 5 MB.","error");$("profile-avatar-file").value="";return;}
  openCropEditor(file);
 });
 $("profile-display-name").addEventListener("input",()=>{if(!selectedFile)renderAvatar(null,$("profile-display-name").value||"Aventureiro");$("profile-preview-name").textContent=$("profile-display-name").value||"Aventureiro";});
 $("profile-cancel").addEventListener("click",()=>history.back());

 $("profile-crop-zoom").addEventListener("input",(event)=>{
   const next=Number(event.target.value);
   const oldZoom=crop.zoom;
   crop.zoom=next;
   const factor=next/oldZoom;
   const size=320;
   const centerX=size/2;
   const centerY=size/2;
   crop.x=centerX-(centerX-crop.x)*factor;
   crop.y=centerY-(centerY-crop.y)*factor;
   clampImagePosition();
   drawCrop();
 });

 $("profile-crop-stage").addEventListener("pointerdown",pointerCropStart);
 $("profile-crop-stage").addEventListener("pointermove",pointerCropMove);
 $("profile-crop-stage").addEventListener("pointerup",pointerCropEnd);
 $("profile-crop-stage").addEventListener("pointercancel",pointerCropEnd);
 $("profile-crop-stage").addEventListener("pointerleave",pointerCropEnd);

 document.querySelectorAll("[data-crop-close]").forEach((el)=>el.addEventListener("click",closeCropEditor));
 $("profile-crop-apply").addEventListener("click",applyCrop);

 $("profile-form").addEventListener("submit",save);
}
async function save(event){
 event.preventDefault();message("");
 const name=$("profile-display-name").value.trim();
 const recoveryEmail=$("profile-recovery-email").value.trim().toLowerCase();
 const recoveryPhone=$("profile-recovery-phone").value.trim();
 if(name.length<2){message("Digite um nome de exibição com pelo menos 2 caracteres.","error");return;}
 if(recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)){message("Digite um e-mail de recuperação válido.","error");return;}
 const saveBtn=$("profile-save");saveBtn.disabled=true;
 try{
  let avatarPath=profile.avatar_path||null;
  if(selectedFile){
   const ext=selectedFile.name.split(".").pop().toLowerCase();
   const path=user.id+"/"+crypto.randomUUID()+"."+ext;
   const {error}=await supabase.storage.from(BUCKET).upload(path,selectedFile,{contentType:selectedFile.type,upsert:false,cacheControl:"3600"});
   if(error)throw error;
   avatarPath=path;
  }
  const {error:profileError}=await supabase.from("profiles").upsert({
    id:user.id,
    display_name:name,
    avatar_path:avatarPath,
    updated_at:new Date().toISOString()
  },{onConflict:"id"});
  if(profileError)throw profileError;
  const {error:metadataError}=await supabase.auth.updateUser({data:{display_name:name}});
  if(metadataError)throw metadataError;
  if(recoveryEmail || recoveryPhone){
    const values={
      user_id:user.id,
      recovery_email:recoveryEmail||null,
      recovery_phone:recoveryPhone||null,
      updated_at:new Date().toISOString()
    };
    const {error:rcError}=await supabase.from("profile_recovery_contacts").upsert(values,{onConflict:"user_id"});
    if(rcError)throw rcError;
  }else{
    const {error:deleteRecoveryError}=await supabase
      .from("profile_recovery_contacts")
      .delete()
      .eq("user_id",user.id);
    if(deleteRecoveryError)throw deleteRecoveryError;
  }
  if(profile.avatar_path && avatarPath && profile.avatar_path!==avatarPath){
    await supabase.storage.from(BUCKET).remove([profile.avatar_path]).catch(()=>{});
  }
  profile={...profile,display_name:name,avatar_path:avatarPath};
  originalRecovery={email:recoveryEmail,phone:recoveryPhone};
  selectedFile=null;
  $("profile-avatar-file").value="";
  $("profile-avatar-status").textContent="Alterações salvas.";
  $("profile-preview-name").textContent=name;
  $("profile-preview-email").textContent=user.email||"";
  renderAvatar(avatarPath?await signedUrl(avatarPath):null,name);
  message("Perfil atualizado com sucesso.","success");
 }catch(error){
  console.error("[AERION][PROFILE]",error);
  message(error?.message||"Não foi possível salvar o perfil.","error");
 }finally{saveBtn.disabled=false;}
}
async function boot(){
 try{ user=await getCurrentUser(); if(!user){location.replace("./index.html");return;} supabase=await getSupabase(); await load(); bind(); }
 catch(error){console.error("[AERION][PROFILE] Falha ao carregar perfil",error);message("Não foi possível carregar o perfil.","error");}
}
boot();