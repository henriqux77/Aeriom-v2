import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const state={sb:null,user:null,campaignId:null,posts:[],initialized:false,channel:null};

  function ctx(){return window.AERIOM_CAMPAIGN?.getContext?.()||null}
  function isMaster(){return String(ctx()?.membership?.role||"").toLowerCase()==="master"}
  function toast(msg,type="info"){const r=$("aeriom-toast-region");if(!r)return;const e=document.createElement("div");e.className="aeriom-toast";e.dataset.type=type;e.textContent=msg;r.appendChild(e);setTimeout(()=>e.remove(),2600)}
  async function ready(){const c=ctx();state.sb=c?.supabase||state.sb;state.user=c?.user||state.user;state.campaignId=c?.campaignId||state.campaignId;if(!state.sb)state.sb=await getSupabase();return !!(state.sb&&state.user&&state.campaignId)}
  async function load(){
    if(!await ready())return;
    const {data,error}=await state.sb.from("mural_posts").select("*").eq("campaign_id",state.campaignId).order("created_at",{ascending:false});
    if(error)throw error;
    state.posts=data||[];
    await Promise.all(state.posts.map(async p=>{if(!p.image_path)return;try{const r=await state.sb.storage.from("campaign-assets").createSignedUrl(p.image_path,3600);p.imageUrl=r.data?.signedUrl||""}catch{}}));
  }
  function modal(){
    let m=$("aerion-mural-modal");
    if(!m){m=document.createElement("div");m.id="aerion-mural-modal";m.className="aerion-mural-modal";document.body.appendChild(m)}
    return m
  }
  function render(){
    const root=$("campaign-notes-grid");if(!root)return;
    root.innerHTML="";
    if(!state.posts.length){root.innerHTML='<div class="aerion-mural-empty"><strong>Nenhuma nota no mural</strong><span>Crie a primeira nota para registrar uma pista, aviso ou informação da campanha.</span></div>';return}
    state.posts.forEach(p=>{
      const card=document.createElement("article");card.className="aerion-mural-card";
      card.innerHTML=(p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="">':"")+
        '<div class="aerion-mural-card__body"><span class="aerion-mural-card__type">'+esc(p.post_type)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.content)+'</p><small>'+new Date(p.updated_at||p.created_at).toLocaleString("pt-BR")+'</small></div>'+
        '<div class="aerion-mural-card__actions"><button type="button" data-knowledge title="Adicionar ao conhecimento">🧠</button>'+(isMaster()?'<button type="button" data-edit>✎</button><button type="button" data-delete>🗑</button>':"")+'</div>';
      card.addEventListener("click",e=>{if(e.target.closest("button"))return;editor(p)});
      card.querySelector("[data-edit]")?.addEventListener("click",e=>{e.stopPropagation();editor(p)});
      card.querySelector("[data-delete]")?.addEventListener("click",async e=>{e.stopPropagation();if(!confirm("Excluir esta nota do mural?"))return;const r=await state.sb.from("mural_posts").delete().eq("id",p.id);if(r.error)return toast(r.error.message,"error");await load();render();toast("Nota removida.","success")});
      card.querySelector("[data-knowledge]")?.addEventListener("click",async e=>{e.stopPropagation();try{const {data,error}=await state.sb.from("aerion_mind_nodes").insert({campaign_id:state.campaignId,created_by:state.user.id,title:p.title,content:p.content,node_type:p.post_type==="clue"?"clue":"note",color:"#8b6f36",pos_x:36,pos_y:36,visibility:"public"}).select("*").single();if(error)throw error;toast("Nota adicionada ao Conhecimento.","success");window.dispatchEvent(new CustomEvent("aeriom:knowledge:refresh",{detail:{nodeId:data.id}}));}catch(err){toast(err?.message||"Não foi possível adicionar ao Conhecimento.","error")}});
      root.appendChild(card)
    })
  }
  async function editor(post=null){
    if(!await ready())return toast("A campanha ainda não terminou de carregar.","error");
    const m=modal();
    m.innerHTML='<div class="aerion-mural-modal__card"><header><div><small>MURAL DE NOTAS</small><h2>'+(post?"Editar nota":"Nova nota")+'</h2></div><button type="button" data-close>×</button></header>'+
      '<form data-form><label>Título<input name="title" required maxlength="180" value="'+esc(post?.title||"")+'"></label>'+
      '<label>Tipo<select name="type">'+["note","clue","announcement","map"].map(v=>'<option value="'+v+'" '+(post?.post_type===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
      '<label>Conteúdo<textarea name="content" required maxlength="10000">'+esc(post?.content||"")+'</textarea></label>'+
      '<label>Imagem<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>'+
      (post?.imageUrl?'<div class="aerion-mural-current-image"><img src="'+esc(post.imageUrl)+'" alt=""></div>':"")+
      '<footer>'+(post?'<button type="button" class="aeriom-mini-button aeriom-mini-button--danger" data-delete>Excluir</button>':"")+'<span></span><button type="button" class="aeriom-mini-button" data-close>Cancelar</button><button class="aeriom-mini-button" type="submit">Salvar</button></footer></form></div>';
    m.classList.add("is-open");
    m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("is-open"));
    m.querySelector("[data-delete]")?.addEventListener("click",async()=>{if(!confirm("Excluir esta nota?"))return;const r=await state.sb.from("mural_posts").delete().eq("id",post.id);if(r.error)return toast(r.error.message,"error");m.classList.remove("is-open");await load();render();toast("Nota removida.","success")});
    m.querySelector("[data-form]").onsubmit=async e=>{
      e.preventDefault();const f=e.currentTarget,btn=f.querySelector("[type=submit]");btn.disabled=true;
      try{
        const id=post?.id||crypto.randomUUID();let imagePath=post?.image_path||null;
        const file=f.image.files?.[0];
        if(file){const ext=(file.name.split(".").pop()||"png").toLowerCase().replace(/[^a-z0-9]/g,"");const path=state.campaignId+"/mural/"+id+"-"+Date.now()+"."+ext;const up=await state.sb.storage.from("campaign-assets").upload(path,file,{upsert:true,contentType:file.type});if(up.error)throw up.error;imagePath=path}
        const payload={campaign_id:state.campaignId,author_id:state.user.id,title:f.title.value.trim(),content:f.content.value.trim(),image_path:imagePath,post_type:f.type.value,updated_at:new Date().toISOString()};
        let r;
        if(post)r=await state.sb.from("mural_posts").update(payload).eq("id",post.id).select("*").single();else r=await state.sb.from("mural_posts").insert(payload).select("*").single();
        if(r.error)throw r.error;
        m.classList.remove("is-open");await load();render();toast(post?"Nota atualizada.":"Nota criada.","success");
      }catch(err){console.error("[AERION][MURAL]",err);toast(err?.message||"Não foi possível salvar a nota.","error")}finally{btn.disabled=false}
    }
  }
  function bind(){
    document.addEventListener("click",e=>{const b=e.target.closest?.("#campaign-create-note-button");if(!b)return;e.preventDefault();editor()});
  }
  async function init(){
    if(state.initialized)return;
    if(!document.getElementById("campaign-panel-mural"))return setTimeout(init,500);
    bind();
    try{await ready();await load();render()}catch(e){console.warn("[AERION][MURAL]",e)}
    if(state.sb&&state.campaignId&&!state.channel){
      state.channel=state.sb.channel("aerion-mural-"+state.campaignId).on("postgres_changes",{event:"*",schema:"public",table:"mural_posts",filter:"campaign_id=eq."+state.campaignId},async()=>{try{await load();render()}catch{}}).subscribe()
    }
    state.initialized=true;
  }
  window.addEventListener("aeriom:campaign:ready",()=>{state.initialized=false;init()});
  window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="mural"){setTimeout(async()=>{try{await ready();await load();render()}catch{}},0)}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();