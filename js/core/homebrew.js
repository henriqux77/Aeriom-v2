import { getSupabase } from "./supabase.js";

const TYPES={race:"Raça",subrace:"Sub-raça",animalha:"Animalha",class:"Classe",origin:"Origem",skill:"Perícia",power:"Poder",technique:"Técnica",item:"Item",equipment:"Equipamento",monster:"Monstro",recipe:"Receita",rule:"Regra"};
const S={sb:null,user:null,sources:[],sourceId:null,content:[],editing:null,campaigns:[],channels:[]};
const $=id=>document.getElementById(id);
const slug=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,110);
function toast(message,type){const el=$("hb-toast");el.textContent=String(message||"");el.classList.add("show");el.dataset.type=type||"info";clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),3000);}
function source(){return S.sources.find(x=>x.id===S.sourceId)||null;}
function openWorkspace(show){$("hb-welcome").hidden=show;$("hb-source-editor").hidden=show;}
function renderSources(){
  $("hb-source-count").textContent=S.sources.length;
  $("hb-empty-sources").hidden=S.sources.length>0;
  const root=$("hb-source-list");root.innerHTML="";
  S.sources.forEach(x=>{const b=document.createElement("button");b.type="button";b.className="hb-source"+(x.id===S.sourceId?" active":"");b.innerHTML="<strong></strong><small></small>";b.querySelector("strong").textContent=x.name;b.querySelector("small").textContent=x.version+" · "+x.status;b.onclick=()=>selectSource(x.id);root.appendChild(b);});
}
function fillSource(x){
  $("hb-source-title-display").textContent=x?x.name:"Novo livro";
  $("hb-source-meta").textContent=x?(x.status+" · "+x.visibility+" · "+new Date(x.updated_at).toLocaleString("pt-BR")):"";
  $("hb-source-name").value=x?.name||"";$("hb-source-slug").value=x?.slug||"";$("hb-source-description").value=x?.description||"";
  $("hb-source-visibility").value=x?.visibility||"private";$("hb-source-status").value=x?.status||"draft";$("hb-source-version").value=x?.version||"1.0.0";
  $("hb-source-delete").hidden=!x;
}
async function loadSources(){
  const r=await S.sb.from("homebrew_sources").select("*").order("updated_at",{ascending:false});if(r.error)throw r.error;S.sources=r.data||[];renderSources();
  if(S.sourceId&&S.sources.some(x=>x.id===S.sourceId))return selectSource(S.sourceId);
  if(S.sources[0])return selectSource(S.sources[0].id);
  openWorkspace(true);fillSource(null);
}
async function selectSource(id){S.sourceId=id;renderSources();const x=source();if(!x){openWorkspace(true);return;}openWorkspace(false);fillSource(x);await loadContent();}
async function loadContent(){
  const x=source();if(!x)return;const r=await S.sb.from("homebrew_content").select("*").eq("source_id",x.id).order("sort_order").order("updated_at",{ascending:false});if(r.error)throw r.error;S.content=r.data||[];renderContent();
}
function renderContent(){
  const root=$("hb-content-list");root.innerHTML="";
  if(!S.content.length){const e=document.createElement("div");e.className="hb-empty";e.textContent="Este livro ainda não possui entradas.";root.appendChild(e);return;}
  S.content.forEach(x=>{const row=document.createElement("article");row.className="hb-content-row";const t=document.createElement("div");t.textContent=TYPES[x.content_type]||x.content_type;t.style.color="var(--hb-accent)";const c=document.createElement("div");const h=document.createElement("strong");h.textContent=x.title;const sm=document.createElement("small");sm.textContent=x.status+" · "+x.slug+(x.summary?" · "+x.summary:"");c.append(h,sm);const actions=document.createElement("div");const edit=document.createElement("button");edit.className="hb-btn";edit.textContent="Editar";edit.onclick=()=>openEditor(x);actions.appendChild(edit);row.append(t,c,actions);root.appendChild(row);});
}
function resetEditor(){S.editing=null;$("hb-content-title-display").textContent="Nova entrada";$("hb-content-type").value="race";$("hb-content-status").value="draft";$("hb-content-title").value="";$("hb-content-slug").value="";$("hb-content-summary").value="";$("hb-content-body").value="";$("hb-content-tags").value="";$("hb-content-data").value="{}";$("hb-content-note").value="";}
function openEditor(x){
  if(!x)resetEditor();else{S.editing=x.id;$("hb-content-title-display").textContent="Editar entrada";$("hb-content-type").value=x.content_type;$("hb-content-status").value=x.status;$("hb-content-title").value=x.title;$("hb-content-slug").value=x.slug;$("hb-content-summary").value=x.summary||"";$("hb-content-body").value=x.content||"";$("hb-content-tags").value=Array.isArray(x.tags)?x.tags.join(", "):"";$("hb-content-data").value=JSON.stringify(x.data||{},null,2);$("hb-content-note").value="";}
  $("hb-editor-modal").hidden=false;
}
function closeEditor(){$("hb-editor-modal").hidden=true;}
function readData(){try{const v=JSON.parse($("hb-content-data").value||"{}");if(!v||Array.isArray(v)||typeof v!=="object")throw new Error();return v;}catch(e){throw new Error("Os dados estruturados precisam ser um JSON de objeto válido.");}}
async function saveSource(){
  const name=$("hb-source-name").value.trim();if(!name)throw new Error("Informe o nome do livro.");
  const payload={name,slug:slug($("hb-source-slug").value||name),description:$("hb-source-description").value.trim()||null,visibility:$("hb-source-visibility").value,status:$("hb-source-status").value,version:$("hb-source-version").value.trim()||"1.0.0"};
  let r=S.sourceId?await S.sb.from("homebrew_sources").update(payload).eq("id",S.sourceId).select().single():await S.sb.from("homebrew_sources").insert({...payload,owner_id:S.user.id}).select().single();
  if(r.error)throw r.error;if(!S.sourceId)S.sourceId=r.data.id;await loadSources();toast("Livro salvo.","success");
}
async function deleteSource(){const x=source();if(!x)return;if(!confirm("Excluir o livro "+x.name+" e todo o conteúdo?"))return;const r=await S.sb.from("homebrew_sources").delete().eq("id",x.id);if(r.error)throw r.error;S.sourceId=null;await loadSources();toast("Livro excluído.","success");}
async function revisionVersion(id){const r=await S.sb.from("homebrew_content_revisions").select("version").eq("content_id",id).order("version",{ascending:false}).limit(1);if(r.error)throw r.error;return Number(r.data?.[0]?.version||0)+1;}
async function saveContent(){
  const src=source();if(!src)throw new Error("Selecione um livro.");
  const title=$("hb-content-title").value.trim();if(!title)throw new Error("Informe o título da entrada.");
  const payload={source_id:src.id,owner_id:S.user.id,content_type:$("hb-content-type").value,status:$("hb-content-status").value,title,slug:slug($("hb-content-slug").value||title),summary:$("hb-content-summary").value.trim()||null,content:$("hb-content-body").value.trim()||null,tags:$("hb-content-tags").value.split(",").map(x=>x.trim()).filter(Boolean),data:readData()};
  let r;
  if(S.editing){r=await S.sb.from("homebrew_content").update(payload).eq("id",S.editing).select().single();}else{r=await S.sb.from("homebrew_content").insert(payload).select().single();}
  if(r.error)throw r.error;
  const version=S.editing?await revisionVersion(r.data.id):1;
  const rev=await S.sb.from("homebrew_content_revisions").insert({content_id:r.data.id,version,snapshot:r.data,changed_by:S.user.id,change_note:$("hb-content-note").value.trim()||null});
  if(rev.error)throw rev.error;
  closeEditor();await loadContent();toast("Entrada salva e versionada.","success");
}
async function loadCampaigns(){
  const r=await S.sb.from("campaign_members").select("campaign_id,campaigns(id,name)").eq("user_id",S.user.id).eq("role","master").order("created_at",{ascending:false});if(r.error)throw r.error;
  S.campaigns=(r.data||[]).map(x=>({id:x.campaign_id,name:x.campaigns?.name||"Campanha",books:[]}));await Promise.all(S.campaigns.map(loadCampaignBooks));renderCampaigns();
}
async function loadCampaignBooks(c){
  const r=await S.sb.from("homebrew_campaign_sources").select("id,enabled,source_id,homebrew_sources(id,name)").eq("campaign_id",c.id).order("priority").order("created_at");if(r.error)throw r.error;c.books=r.data||[];
}
function renderCampaigns(){
  const root=$("hb-campaign-list");root.innerHTML="";
  if(!S.campaigns.length){root.innerHTML='<div class="hb-empty">Você não é Mestre de nenhuma campanha.</div>';return;}
  S.campaigns.forEach(c=>{const card=document.createElement("article");card.className="hb-content-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=c.name;const sm=document.createElement("small");sm.textContent=c.books.length+" livro(s) anexado(s)";info.append(h,sm);const btn=document.createElement("button");btn.className="hb-btn";btn.textContent="＋ Anexar";btn.onclick=()=>attach(c);const chips=document.createElement("div");(c.books||[]).forEach(b=>{const d=document.createElement("span");d.className="hb-source";d.style.display="inline-block";d.style.width="auto";d.textContent=(b.homebrew_sources?.name||"Livro")+" ×";d.onclick=()=>removeAttachment(b.id);chips.appendChild(d)});card.append(info,btn,chips);root.appendChild(card);});
}
async function attach(c){
  const available=S.sources.filter(x=>x.status==="published"&&x.visibility!=="private");if(!available.length)return toast("Publique um livro e deixe-o não privado para anexá-lo.","error");
  const choice=prompt("Digite o número do livro:\n"+available.map((x,i)=>(i+1)+". "+x.name).join("\n"));const x=available[Number(choice)-1];if(!x)return;
  const r=await S.sb.from("homebrew_campaign_sources").insert({campaign_id:c.id,source_id:x.id,attached_by:S.user.id});if(r.error)throw r.error;await loadCampaigns();toast("Livro anexado.","success");
}
async function removeAttachment(id){const r=await S.sb.from("homebrew_campaign_sources").delete().eq("id",id);if(r.error)throw r.error;await loadCampaigns();toast("Livro removido.","success");}
function realtime(){
  const ch=S.sb.channel("aeriom-homebrew")
    .on("postgres_changes",{event:"*",schema:"public",table:"homebrew_sources"},()=>loadSources().catch(e=>toast(e.message,"error")))
    .on("postgres_changes",{event:"*",schema:"public",table:"homebrew_content"},()=>S.sourceId&&loadContent().catch(e=>toast(e.message,"error")))
    .on("postgres_changes",{event:"*",schema:"public",table:"homebrew_campaign_sources"},()=>loadCampaigns().catch(e=>toast(e.message,"error")))
    .subscribe(status=>{$("hb-connection").textContent=status==="SUBSCRIBED"?"Online":"Realtime: "+status;});
  S.channels.push(ch);
}
function bind(){
  $("hb-new-source").onclick=()=>{S.sourceId=null;renderSources();fillSource(null);openWorkspace(false);$("hb-content-list").innerHTML="";};
  $("hb-empty-new").onclick=()=>$("hb-new-source").click();
  $("hb-source-name").oninput=()=>{if(!$("hb-source-slug").dataset.manual)$("hb-source-slug").value=slug($("hb-source-name").value);};
  $("hb-source-slug").oninput=()=>{$("hb-source-slug").dataset.manual="1";};
  $("hb-source-save").onclick=()=>saveSource().catch(e=>toast(e.message,"error"));
  $("hb-source-delete").onclick=()=>deleteSource().catch(e=>toast(e.message,"error"));
  $("hb-new-content").onclick=()=>openEditor();
  $("hb-content-save").onclick=()=>saveContent().catch(e=>toast(e.message,"error"));
  $("hb-content-close").onclick=closeEditor;$("hb-content-cancel").onclick=closeEditor;
  $("hb-refresh-campaigns").onclick=()=>loadCampaigns().catch(e=>toast(e.message,"error"));
}
async function boot(){
  try{S.sb=await getSupabase();const u=await S.sb.auth.getUser();if(u.error)throw u.error;S.user=u.data.user;if(!S.user){location.replace("./index.html");return;}bind();await loadSources();await loadCampaigns();realtime();}
  catch(e){$("hb-connection").textContent="Erro";toast(e.message||"Falha ao iniciar o Homebrew","error");console.error("[AERIOM][HOMEBREW]",e);}
}
boot();