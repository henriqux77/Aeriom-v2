import { getSupabase } from "./supabase.js";

const TYPES={race:"Raça",subrace:"Sub-raça",animalha:"Animalha",class:"Classe",origin:"Origem",skill:"Perícia",power:"Poder",technique:"Técnica",item:"Item",equipment:"Equipamento",monster:"Monstro",recipe:"Receita",rule:"Regra"};
const S={sb:null,user:null,sources:[],sourceId:null,content:[],editing:null,campaigns:[],channels:[]};
const $=id=>document.getElementById(id);
const slug=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,110);
function toast(message,type){const el=$("hb-toast");el.textContent=String(message||"");el.classList.add("show");el.dataset.type=type||"info";clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),3000);}
function source(){return S.sources.find(x=>x.id===S.sourceId)||null;}
function openWorkspace(show){$("hb-welcome").hidden=show;$("hb-source-editor").hidden=show;}
function renderSources(){
  const root=$("hb-source-list");root.innerHTML="";
  const content=S.content||[];
  $("hb-source-count").textContent=content.length;
  $("hb-empty-sources").hidden=content.length>0;
  const iconFor=t=>t==="class"?"⚔":t==="race"||t==="subrace"||t==="animalha"?"◇":t==="monster"?"☠":t==="recipe"?"✦":t==="item"||t==="equipment"?"◆":t==="power"||t==="technique"?"✧":"•";
  content.slice(0,40).forEach(x=>{
    const b=document.createElement("button");b.type="button";b.className="hb-source"+(x.id===S.editing?" active":"");b.innerHTML="<strong></strong><small></small>";
    b.querySelector("strong").textContent=iconFor(x.content_type)+"  "+x.title;
    b.querySelector("small").textContent=(TYPES[x.content_type]||x.content_type)+" · "+(x.status||"draft");
    b.onclick=()=>openEditor(x);
    root.appendChild(b);
  });
}
function fillSource(x){
  $("hb-source-title-display").textContent=x?x.name:"Novo livro";
  $("hb-source-meta").textContent=x?(x.status+" · "+x.visibility+" · "+new Date(x.updated_at).toLocaleString("pt-BR")):"";
  $("hb-source-name").value=x?.name||"";$("hb-source-slug").value=x?.slug||"";$("hb-source-description").value=x?.description||"";
  $("hb-source-visibility").value=x?.visibility||"private";$("hb-source-status").value=x?.status||"draft";$("hb-source-version").value=x?.version||"1.0.0";
  $("hb-source-delete").hidden=!x;$("hb-source-share").hidden=!x||x.status!=="published"||x.visibility==="private";
}
async function ensureWorkspaceSource(){
  if(S.sourceId && source()) return source();
  if(S.sources[0]){S.sourceId=S.sources[0].id;return source();}
  const payload={owner_id:S.user.id,name:"AERION Homebrew",slug:"aerion-homebrew",description:"Conteúdo criado pelo usuário para o AERION.",visibility:"private",status:"draft",version:"1.0.0"};
  const r=await S.sb.from("homebrew_sources").insert(payload).select().single();if(r.error)throw r.error;
  S.sources=[r.data];S.sourceId=r.data.id;return r.data;
}
async function loadSources(){
  const r=await S.sb.from("homebrew_sources").select("*").order("updated_at",{ascending:false});if(r.error)throw r.error;S.sources=r.data||[];
  if(S.sourceId&&S.sources.some(x=>x.id===S.sourceId)){}else if(S.sources[0])S.sourceId=S.sources[0].id;
  openWorkspace(false);fillSource(source()||null);
  await loadAllContent();
}
async function loadAllContent(){
  if(!S.sources.length){S.content=[];renderSources();renderContent();return;}
  const all=[];
  for(const x of S.sources){
    const r=await S.sb.from("homebrew_content").select("*").eq("source_id",x.id).order("sort_order").order("updated_at",{ascending:false});
    if(r.error)throw r.error;
    (r.data||[]).forEach(item=>all.push({...item,homebrew_source:x}));
  }
  S.content=all;
  renderContent();
}
async function selectSource(id){S.sourceId=id;renderSources();const x=source();if(!x){openWorkspace(false);await loadAllContent();return;}openWorkspace(false);fillSource(x);await loadAllContent();}
async function loadContent(){return loadAllContent();}
function renderContent(){
  const root=$("hb-content-list");root.innerHTML="";
  const q=String($("hb-content-search")?.value||"").trim().toLowerCase();
  const filter=String($("hb-content-filter")?.value||"");
  const content=S.content.filter(x=>
    (!filter||x.content_type===filter) &&
    (!q||String(x.title||"").toLowerCase().includes(q)||String(x.summary||"").toLowerCase().includes(q)||String(x.slug||"").toLowerCase().includes(q))
  );
  if(!content.length){const e=document.createElement("div");e.className="hb-empty";e.textContent=S.content.length?"Nenhum conteúdo corresponde ao filtro.":"Este livro ainda não possui entradas.";root.appendChild(e);return;}
  const groups={};
  content.forEach(x=>(groups[x.content_type]??=[]).push(x));
  Object.entries(groups).forEach(([type,items])=>{
    const section=document.createElement("section");section.className="hb-content-group";
    const head=document.createElement("div");head.className="hb-group-title";head.innerHTML="<span>"+(TYPES[type]||type).toUpperCase()+"</span><b>"+items.length+"</b>";
    section.appendChild(head);
    items.forEach(x=>{
      const row=document.createElement("article");row.className="hb-content-row";
      const badge=document.createElement("div");badge.className="hb-entry-icon";badge.textContent=type==="class"?"⚔":type==="race"?"◇":type==="monster"?"☠":type==="item"||type==="equipment"?"◆":type==="recipe"?"✦":"•";
      const c=document.createElement("div");const h=document.createElement("strong");h.textContent=x.title;const sm=document.createElement("small");sm.textContent=x.status+" · "+x.slug+(x.summary?" · "+x.summary:"");c.append(h,sm);
      const actions=document.createElement("div");
      const preview=document.createElement("button");preview.className="hb-btn";preview.textContent="Pré-visualizar";preview.onclick=()=>previewContent(x);
      const duplicate=document.createElement("button");duplicate.className="hb-btn";duplicate.textContent="Duplicar";duplicate.onclick=()=>duplicateContent(x).catch(e=>toast(e.message||"Não foi possível duplicar.","error"));
      const edit=document.createElement("button");edit.className="hb-btn";edit.textContent="Editar";edit.onclick=()=>openEditor(x);
      actions.append(preview,duplicate,edit);row.append(badge,c,actions);section.appendChild(row);
    });
    root.appendChild(section);
  });
}
function previewContent(x){
  const m=document.createElement("div");m.className="hb-preview-modal";m.innerHTML='<div class="hb-preview-backdrop"></div><section class="hb-preview-card"><header><div><span>PRÉ-VISUALIZAÇÃO</span><h2></h2><small></small></div><button type="button" data-close>×</button></header><div class="hb-preview-body"></div></section>';
  m.querySelector("h2").textContent=x.title;m.querySelector("small").textContent=TYPES[x.content_type]||x.content_type;
  const body=m.querySelector(".hb-preview-body");body.innerHTML="<p></p>";body.querySelector("p").textContent=x.summary||x.content||"Sem descrição.";
  const d=x.data||{};if(d.image_url){const im=document.createElement("img");im.src=d.image_url;im.alt=x.title;im.loading="lazy";body.prepend(im)}
  const pre=document.createElement("pre");pre.textContent=JSON.stringify(d,null,2);pre.hidden=!Object.keys(d).length;body.append(pre);
  document.body.appendChild(m);const close=()=>m.remove();m.querySelector("[data-close]").onclick=close;m.querySelector(".hb-preview-backdrop").onclick=close;
}
async function duplicateContent(x){
  const src=source();if(!src)throw new Error("Selecione uma fonte.");
  const payload={source_id:src.id,owner_id:S.user.id,content_type:x.content_type,status:"draft",title:x.title+" — Cópia",slug:slug(x.slug+"-copia-"+Date.now()),summary:x.summary,content:x.content,tags:x.tags||[],data:x.data||{},sort_order:Number(x.sort_order||0)+1};
  const r=await S.sb.from("homebrew_content").insert(payload).select("*").single();if(r.error)throw r.error;
  await S.sb.from("homebrew_content_revisions").insert({content_id:r.data.id,version:1,snapshot:r.data,changed_by:S.user.id,change_note:"Duplicado de "+x.title});
  await loadAllContent();toast("Conteúdo duplicado como rascunho.","success");
}
function resetEditor(){S.editing=null;$("hb-content-title-display").textContent="Nova entrada";$("hb-content-type").value="race";$("hb-content-status").value="draft";$("hb-content-title").value="";$("hb-content-slug").value="";$("hb-content-summary").value="";$("hb-content-body").value="";$("hb-content-tags").value="";$("hb-content-data").value="{}";$("hb-content-note").value="";renderStructuredFields({});}
function openEditor(x){
  if(!x)resetEditor();else{S.editing=x.id;$("hb-content-title-display").textContent="Editar entrada";$("hb-content-type").value=x.content_type;$("hb-content-status").value=x.status;$("hb-content-title").value=x.title;$("hb-content-slug").value=x.slug;$("hb-content-summary").value=x.summary||"";$("hb-content-body").value=x.content||"";$("hb-content-tags").value=Array.isArray(x.tags)?x.tags.join(", "):"";$("hb-content-data").value=JSON.stringify(x.data||{},null,2);$("hb-content-note").value="";renderStructuredFields(x.data||{});}
  $("hb-editor-modal").hidden=false;
}
function closeEditor(){$("hb-editor-modal").hidden=true;}
function fieldHtml(label,key,value,type="text",placeholder=""){return '<label>'+label+'<input data-structured-key="'+key+'" type="'+type+'" value="'+String(value??"").replace(/"/g,'&quot;')+'" placeholder="'+placeholder+'"></label>';}
function textareaHtml(label,key,value,placeholder=""){return '<label>'+label+'<textarea data-structured-key="'+key+'" rows="3" placeholder="'+placeholder+'">'+String(value??"").replace(/</g,"&lt;")+'</textarea></label>';}
function renderStructuredFields(data={}){
  const root=$("hb-structured-fields");if(!root)return;
  const type=$("hb-content-type")?.value||"race";root.innerHTML="";
  const d=data&&typeof data==="object"?data:{};
  const common='<div class="hb-structured-heading"><span>FORMATO DO SISTEMA</span><small>Preencha estes campos. O AERION salva tudo de forma estruturada para poder usar este conteúdo dentro das fichas e campanhas.</small></div>';
  let body="";
  if(type==="race"||type==="subrace"||type==="animalha"){
    body='<div class="hb-two">'+fieldHtml("Imagem (URL)","image_url",d.image_url)+fieldHtml("Tamanho","size",d.size||"Médio")+'</div><div class="hb-three">'+fieldHtml("Vida","hp",d.hp,"number")+fieldHtml("Defesa","defense",d.defense,"number")+fieldHtml("Movimento","movement",d.movement,"number")+'</div>'+textareaHtml("Habilidades","abilities",Array.isArray(d.abilities)?d.abilities.join(", "):d.abilities,"Uma por vírgula")+textareaHtml("Resistências","resistances",Array.isArray(d.resistances)?d.resistances.join(", "):d.resistances,"Uma por vírgula")+textareaHtml("Sentidos","senses",Array.isArray(d.senses)?d.senses.join(", "):d.senses,"Uma por vírgula");
  }else if(type==="class"){
    body='<div class="hb-three">'+fieldHtml("Mana","mana",d.mana,"number")+fieldHtml("Slots","slots",d.slots,"number")+fieldHtml("Peso máximo","weight",d.weight,"number")+'</div>'+textareaHtml("Itens iniciais","starting_items",Array.isArray(d.starting_items)?d.starting_items.join("\n"):d.starting_items,"Um item por linha")+textareaHtml("Perícias treinadas","trained_skills",Array.isArray(d.trained_skills)?d.trained_skills.join("\n"):d.trained_skills,"Uma perícia por linha")+textareaHtml("Observação dos itens","item_note",d.item_note,"Ex.: pode trocar o arco por arma de duas mãos");
  }else if(type==="item"||type==="equipment"){
    body='<div class="hb-three">'+fieldHtml("Raridade","rarity",d.rarity||"Comum")+fieldHtml("Custo","cost",d.cost,"number")+fieldHtml("Peso","weight",d.weight,"number")+'</div>'+fieldHtml("Slots","slots",d.slots,"number")+textareaHtml("Efeitos","effects",d.effects)+textareaHtml("Materiais / Receita","crafting_materials",Array.isArray(d.crafting_materials)?d.crafting_materials.join("\n"):d.crafting_materials);
  }else if(type==="power"||type==="technique"){
    body='<div class="hb-three">'+fieldHtml("Custo de Mana","mana_cost",d.mana_cost,"number")+fieldHtml("Ação","action",d.action)+fieldHtml("Alcance","range",d.range)+'</div>'+textareaHtml("Efeito","effect",d.effect)+textareaHtml("Requisitos","requirements",d.requirements);
  }else if(type==="monster"){
    body='<div class="hb-three">'+fieldHtml("Vida","hp",d.hp,"number")+fieldHtml("Defesa","defense",d.defense,"number")+fieldHtml("ND / Grau","difficulty",d.difficulty)+'</div>'+textareaHtml("Partes obtidas","loot_parts",Array.isArray(d.loot_parts)?d.loot_parts.join("\n"):d.loot_parts,"Carne, órgão especial, defesa, glândula, sangue, ossos, ingrediente raro…")+textareaHtml("Habilidades","abilities",d.abilities);
  }else if(type==="recipe"){
    body=textareaHtml("Ingredientes","ingredients",Array.isArray(d.ingredients)?d.ingredients.join("\n"):d.ingredients,"Um ingrediente por linha")+textareaHtml("Efeitos ao comer","effects",d.effects)+fieldHtml("Dificuldade","difficulty",d.difficulty);
  }else{
    body=textareaHtml("Dados principais","effect",d.effect)+fieldHtml("Ícone","icon",d.icon||"✦");
  }
  root.innerHTML=common+body;
  root.querySelectorAll("[data-structured-key]").forEach(el=>el.addEventListener("input",syncStructuredData));
}
function syncStructuredData(){
  const base=readData();
  $("hb-structured-fields")?.querySelectorAll("[data-structured-key]").forEach(el=>{
    let v=el.value;
    if(["abilities","resistances","senses"].includes(el.dataset.structuredKey))v=v.split(",").map(x=>x.trim()).filter(Boolean);
    else if(["starting_items","trained_skills","crafting_materials","ingredients","loot_parts"].includes(el.dataset.structuredKey))v=v.split("\n").map(x=>x.trim()).filter(Boolean);
    else if(["hp","defense","movement","mana","slots","weight","cost","mana_cost"].includes(el.dataset.structuredKey)&&v!=="")v=Number(v);
    base[el.dataset.structuredKey]=v;
  });
  $("hb-content-data").value=JSON.stringify(base,null,2);
}
function readData(){try{const v=JSON.parse($("hb-content-data").value||"{}");if(!v||Array.isArray(v)||typeof v!=="object")throw new Error();return v;}catch(e){throw new Error("Os dados estruturados precisam ser um JSON de objeto válido.");}}
async function saveSource(){
  const name=$("hb-source-name").value.trim()||"AERION Homebrew";
  const payload={name,slug:slug($("hb-source-slug").value||name),description:$("hb-source-description").value.trim()||"Conteúdo Homebrew do AERION.",visibility:$("hb-source-visibility").value,status:$("hb-source-status").value,version:$("hb-source-version").value.trim()||"1.0.0"};
  const r=S.sourceId?await S.sb.from("homebrew_sources").update(payload).eq("id",S.sourceId).select().single():await S.sb.from("homebrew_sources").insert({...payload,owner_id:S.user.id}).select().single();
  if(r.error)throw r.error;if(!S.sourceId)S.sourceId=r.data.id;await loadSources();toast("Configurações salvas.","success");
}
async function deleteSource(){const x=source();if(!x)return;if(!confirm("Excluir o livro "+x.name+" e todo o conteúdo?"))return;const r=await S.sb.from("homebrew_sources").delete().eq("id",x.id);if(r.error)throw r.error;S.sourceId=null;await loadSources();toast("Livro excluído.","success");}
async function revisionVersion(id){const r=await S.sb.from("homebrew_content_revisions").select("version").eq("content_id",id).order("version",{ascending:false}).limit(1);if(r.error)throw r.error;return Number(r.data?.[0]?.version||0)+1;}
async function saveContent(){
  const src=await ensureWorkspaceSource();
  syncStructuredData();
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
  S.campaigns.forEach(c=>{const card=document.createElement("article");card.className="hb-content-row";const info=document.createElement("div");const h=document.createElement("strong");h.textContent=c.name;const sm=document.createElement("small");sm.textContent=c.books.length+" livro(s) anexado(s)";info.append(h,sm);const btn=document.createElement("button");btn.className="hb-btn";btn.textContent="＋ Adicionar";btn.onclick=()=>attach(c);const chips=document.createElement("div");(c.books||[]).forEach(b=>{const d=document.createElement("span");d.className="hb-source";d.style.display="inline-block";d.style.width="auto";d.textContent=(b.homebrew_sources?.name||"Livro")+" ×";d.onclick=()=>removeAttachment(b.id);chips.appendChild(d)});card.append(info,btn,chips);root.appendChild(card);});
}
async function attach(c){
  const available=S.sources.filter(x=>x.status==="published"&&x.visibility!=="private");if(!available.length)return toast("Publique um livro e deixe-o não privado para anexá-lo.","error");
  const choice=prompt("Digite o número do livro:\n"+available.map((x,i)=>(i+1)+". "+x.name).join("\n"));const x=available[Number(choice)-1];if(!x)return;
  const r=await S.sb.from("homebrew_campaign_sources").insert({campaign_id:c.id,source_id:x.id,attached_by:S.user.id});if(r.error)throw r.error;await loadCampaigns();toast("Livro anexado.","success");
}
async function removeAttachment(id){const r=await S.sb.from("homebrew_campaign_sources").delete().eq("id",id);if(r.error)throw r.error;await loadCampaigns();toast("Livro removido.","success");}
async function openPublicBook(bookId){
  const view=$("hb-public-view");if(!view)return;
  const src=await S.sb.from("homebrew_sources").select("id,name,slug,description,version,visibility,status,updated_at").eq("id",bookId).eq("status","published").maybeSingle();
  if(src.error||!src.data||src.data.visibility==="private"){view.innerHTML='<div class="hb-welcome"><strong>⚠</strong><h2>Livro não disponível</h2><p>Este conteúdo é privado ou não está publicado.</p></div>';view.hidden=false;document.querySelector(".hb-main")?.classList.add("hb-main-public");return;}
  const cr=await S.sb.from("homebrew_content").select("id,title,content_type,summary,content,tags,data").eq("source_id",bookId).eq("status","published").order("sort_order").order("updated_at",{ascending:false});
  if(cr.error)throw cr.error;
  view.innerHTML='<div class="hb-public-shell"><div class="hb-public-back"><a href="./homebrew.html">← Abrir Homebrew</a></div><header><span>HOME BREW PUBLICADO</span><h1>'+String(src.data.name).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</h1><p>'+String(src.data.description||'Seu livro de regras do AERION.').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</p><small>Versão '+src.data.version+'</small></header><div class="hb-public-entries"></div></div>';
  const root=view.querySelector(".hb-public-entries");
  (cr.data||[]).forEach(x=>{const card=document.createElement("article");card.className="hb-public-entry";card.innerHTML='<span class="hb-public-type">'+(TYPES[x.content_type]||x.content_type)+'</span><h2></h2><p class="hb-public-summary"></p>';card.querySelector("h2").textContent=x.title;card.querySelector(".hb-public-summary").textContent=x.summary||"";const body=document.createElement("div");body.className="hb-public-body";body.textContent=x.content||"";card.appendChild(body);const d=x.data||{};if(d.image_url){const im=document.createElement("img");im.src=d.image_url;im.alt=x.title;im.loading="lazy";im.className="hb-public-image";card.prepend(im);}if(Array.isArray(d.starting_items)&&d.starting_items.length){const b=document.createElement("div");b.className="hb-public-list";b.innerHTML="<strong>Itens iniciais</strong><ul>"+d.starting_items.map(i=>"<li></li>").join("")+"</ul>";d.starting_items.forEach((i,n)=>b.querySelectorAll("li")[n].textContent=i);card.appendChild(b);}if(Array.isArray(d.trained_skills)&&d.trained_skills.length){const b=document.createElement("div");b.className="hb-public-list";b.innerHTML="<strong>Perícias treinadas</strong><ul>"+d.trained_skills.map(i=>"<li></li>").join("")+"</ul>";d.trained_skills.forEach((i,n)=>b.querySelectorAll("li")[n].textContent=i);card.appendChild(b);}root.appendChild(card);});
  document.querySelector(".hb-sidebar")?.setAttribute("hidden","");
  document.querySelector(".hb-grid")?.setAttribute("hidden","");
  view.hidden=false;
}

function realtime(){
  const ch=S.sb.channel("aeriom-homebrew")
    .on("postgres_changes",{event:"*",schema:"public",table:"homebrew_sources"},()=>loadSources().catch(e=>toast(e.message,"error")))
    .on("postgres_changes",{event:"*",schema:"public",table:"homebrew_content"},()=>S.sourceId&&loadContent().catch(e=>toast(e.message,"error")))
    .on("postgres_changes",{event:"*",schema:"public",table:"homebrew_campaign_sources"},()=>loadCampaigns().catch(e=>toast(e.message,"error")))
    .subscribe(status=>{$("hb-connection").textContent=status==="SUBSCRIBED"?"Online":"Realtime: "+status;});
  S.channels.push(ch);
}
function openMobileMenu(){
  const sidebar=document.querySelector(".hb-sidebar");
  const backdrop=$("hb-mobile-menu-backdrop");
  const button=$("hb-mobile-menu-button");
  sidebar?.classList.add("is-open");
  backdrop?.classList.add("is-open");
  button?.setAttribute("aria-expanded","true");
}
function closeMobileMenu(){
  const sidebar=document.querySelector(".hb-sidebar");
  const backdrop=$("hb-mobile-menu-backdrop");
  const button=$("hb-mobile-menu-button");
  sidebar?.classList.remove("is-open");
  backdrop?.classList.remove("is-open");
  button?.setAttribute("aria-expanded","false");
}
function bind(){
  $("hb-mobile-menu-button")?.addEventListener("click",openMobileMenu);
  $("hb-mobile-menu-backdrop")?.addEventListener("click",closeMobileMenu);
  document.querySelectorAll(".hb-sidebar nav a").forEach(a=>a.addEventListener("click",closeMobileMenu));
  $("hb-new-source").onclick=()=>openEditor();
  $("hb-empty-new").onclick=()=>$("hb-new-source").click();
  $("hb-source-name").oninput=()=>{if(!$("hb-source-slug").dataset.manual)$("hb-source-slug").value=slug($("hb-source-name").value);};
  $("hb-source-slug").oninput=()=>{$("hb-source-slug").dataset.manual="1";};
  $("hb-source-save").onclick=()=>saveSource().catch(e=>toast(e.message,"error"));
  $("hb-source-delete").onclick=()=>deleteSource().catch(e=>toast(e.message,"error"));
  $("hb-source-share").onclick=()=>{const x=source();if(!x)return;const url=new URL("./homebrew.html?book="+encodeURIComponent(x.id),location.href).href;navigator.clipboard?.writeText(url).then(()=>toast("Link de compartilhamento copiado.","success")).catch(()=>window.prompt("Copie o link:",url));};
  $("hb-new-content").onclick=()=>openEditor();
  $("hb-content-type").addEventListener("change",()=>renderStructuredFields(readData()));
  $("hb-content-search").addEventListener("input",renderContent);
  $("hb-content-filter").addEventListener("change",renderContent);
  $("hb-content-save").onclick=()=>saveContent().catch(e=>toast(e.message,"error"));
  $("hb-content-close").onclick=closeEditor;$("hb-content-cancel").onclick=closeEditor;
  $("hb-refresh-campaigns").onclick=()=>loadCampaigns().catch(e=>toast(e.message,"error"));
}
async function boot(){
  try{S.sb=await getSupabase();const u=await S.sb.auth.getUser();if(u.error)throw u.error;S.user=u.data.user;const bookId=new URLSearchParams(location.search).get("book");if(bookId){await openPublicBook(bookId);return;}if(!S.user){location.replace("./index.html");return;}bind();await loadSources();await loadCampaigns();realtime();}
  catch(e){$("hb-connection").textContent="Erro";toast(e.message||"Falha ao iniciar o Homebrew","error");console.error("[AERIOM][HOMEBREW]",e);}
}
boot();