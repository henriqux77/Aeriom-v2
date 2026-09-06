import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

const BUCKET="avatars";
const MAX_SIZE=5*1024*1024;
const TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const $=(id)=>document.getElementById(id);
let supabase=null,user=null,profile=null,recovery=null,selectedFile=null,previewUrl=null,originalRecovery={email:"",phone:""};

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
function bind(){
 $("profile-avatar-file").addEventListener("change",()=>{
  const file=$("profile-avatar-file").files?.[0]; selectedFile=null;
  if(!file){$("profile-avatar-status").textContent="Nenhuma nova imagem selecionada.";return;}
  if(!TYPES.has(file.type)){message("Formato de imagem não permitido.","error");return;}
  if(file.size>MAX_SIZE){message("A imagem precisa ter no máximo 5 MB.","error");return;}
  selectedFile=file;
  $("profile-avatar-status").textContent=file.name+" selecionada.";
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(file);
  renderAvatar(previewUrl,$("profile-display-name").value||"Aventureiro");
 });
 $("profile-display-name").addEventListener("input",()=>{if(!selectedFile)renderAvatar(null,$("profile-display-name").value||"Aventureiro");$("profile-preview-name").textContent=$("profile-display-name").value||"Aventureiro";});
 $("profile-cancel").addEventListener("click",()=>history.back());
 $("profile-form").addEventListener("submit",save);
}
async function save(event){
 event.preventDefault();message("");
 const name=$("profile-display-name").value.trim();
 const recoveryEmail=$("profile-recovery-email").value.trim().toLowerCase();
 const recoveryPhone=$("profile-recovery-phone").value.trim();
 if(name.length<2){message("Digite um nome de exibição com pelo menos 2 caracteres.","error");return;}
 if(recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)){message("Digite um e-mail de recuperação válido.","error");return;}
 if(!recoveryEmail && !recoveryPhone){message("Informe um e-mail ou telefone de recuperação.","error");return;}
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