
import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  let sb = null;
  let campaignId = null;
  let user = null;
  let state = { nodes: [], edges: [], zoom: 1, panX: 0, panY: 0, connectMode: false, connectFirst: null };

  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || null;
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";

  async function ready() {
    const c = ctx();
    if (!c?.campaignId || !c?.user) return false;
    campaignId = c.campaignId; user = c.user; sb = c.supabase || sb;
    if (!sb) sb = await getSupabase();
    return Boolean(sb && campaignId && user);
  }

  async function load() {
    if (!await ready()) return;
    const a = await sb.from("knowledge_nodes").select("*").eq("campaign_id", campaignId).order("updated_at", { ascending: false });
    const b = await sb.from("knowledge_edges").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true });
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    state.nodes = a.data || [];
    state.edges = b.data || [];
    await Promise.all(state.nodes.map(async (n) => {
      const path = n.metadata?.image_path;
      if (!path) return;
      try {
        const r = await sb.storage.from("campaign-assets").createSignedUrl(path, 3600);
        n.__imageUrl = r.data?.signedUrl || "";
      } catch {}
    }));
  }

  function board() {
    return document.getElementById("aeriom-knowledge-board");
  }

  function world() {
    return document.getElementById("aeriom-knowledge-world");
  }

  function controls() {
    const b = board();
    if (!b || b.querySelector(".aeriom-knowledge-enhanced-tools")) return;
    const toolbar = b.parentElement?.querySelector(".aeriom-map-toolbar");
    if (!toolbar) return;
    const tools = document.createElement("div");
    tools.className = "aeriom-knowledge-enhanced-tools";
    tools.innerHTML =
      '<button type="button" class="aeriom-mini-button" data-km-minus>−</button>' +
      '<span class="aeriom-knowledge-zoom-label">100%</span>' +
      '<button type="button" class="aeriom-mini-button" data-km-plus>＋</button>' +
      '<button type="button" class="aeriom-mini-button" data-km-reset>⟳</button>' +
      '<button type="button" class="aeriom-mini-button" data-km-connect>🔗 Conectar</button>';
    toolbar.appendChild(tools);
    tools.querySelector("[data-km-minus]").onclick = () => zoom(-0.15);
    tools.querySelector("[data-km-plus]").onclick = () => zoom(0.15);
    tools.querySelector("[data-km-reset]").onclick = () => { state.zoom = 1; state.panX = 0; state.panY = 0; applyView(); };
    tools.querySelector("[data-km-connect]").onclick = () => {
      state.connectMode = !state.connectMode;
      state.connectFirst = null;
      tools.querySelector("[data-km-connect]").classList.toggle("is-active", state.connectMode);
      toast(state.connectMode ? "Modo conectar: toque em dois nós." : "Modo conectar desativado.", "success");
      render();
    };
  }

  function zoom(delta) {
    state.zoom = Math.min(2.2, Math.max(0.55, state.zoom + delta));
    applyView(); updateZoomLabel();
  }

  function updateZoomLabel() {
    const el = document.querySelector(".aeriom-knowledge-zoom-label");
    if (el) el.textContent = Math.round(state.zoom * 100) + "%";
  }

  function applyView() {
    const w = world();
    if (!w) return;
    w.style.transform = "translate(" + state.panX + "px," + state.panY + "px) scale(" + state.zoom + ")";
    w.style.transformOrigin = "50% 50%";
    updateZoomLabel();
  }

  function pos(n, rect) {
    return { x:(Number(n.pos_x)/100)*rect.width + 75, y:(Number(n.pos_y)/100)*rect.height + 40 };
  }

  function render() {
    const b = board();
    if (!b) return;
    let w = world();
    if (!w) {
      w = document.createElement("div");
      w.id = "aeriom-knowledge-world";
      w.className = "aeriom-knowledge-world";
      const svg = document.getElementById("aeriom-knowledge-svg");
      const nodes = document.getElementById("aeriom-knowledge-nodes");
      if (svg) w.appendChild(svg);
      if (nodes) w.appendChild(nodes);
      b.appendChild(w);
    }
    const svg = document.getElementById("aeriom-knowledge-svg");
    const nodesRoot = document.getElementById("aeriom-knowledge-nodes");
    if (!svg || !nodesRoot) return;
    svg.innerHTML = "";
    nodesRoot.innerHTML = "";
    const rect = b.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + (rect.width || 640) + " " + (rect.height || 480));
    const byId = new Map(state.nodes.map((n) => [String(n.id), n]));
    state.edges.forEach((e) => {
      const a = byId.get(String(e.from_node_id)), z = byId.get(String(e.to_node_id));
      if (!a || !z) return;
      const p1=pos(a,rect), p2=pos(z,rect);
      const line=document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1",p1.x); line.setAttribute("y1",p1.y); line.setAttribute("x2",p2.x); line.setAttribute("y2",p2.y);
      line.setAttribute("stroke",e.color||"#8b6f36"); line.setAttribute("stroke-width",e.id===state.selectedEdge?3:2); line.setAttribute("stroke-linecap","round");
      line.style.pointerEvents="stroke";
      line.addEventListener("click",(ev)=>{ev.stopPropagation(); edgeEditor(e);});
      svg.appendChild(line);
    });
    state.nodes.forEach((n)=>{
      const el=document.createElement("article"); el.className="aeriom-knowledge-node";
      el.style.left=Number(n.pos_x)+"%"; el.style.top=Number(n.pos_y)+"%";
      el.style.setProperty("--node-color", n.metadata?.color || "#8b6f36");
      if(state.connectFirst===String(n.id)) el.classList.add("is-connect-selected");
      el.innerHTML =
        '<div class="aeriom-knowledge-node__actions"><button type="button" data-edit>✎</button></div>' +
        (n.__imageUrl ? '<img class="aeriom-knowledge-node__image" src="' + esc(n.__imageUrl) + '" alt="">' : "") +
        '<span>' + esc(n.node_type) + (n.visibility==="private"?" · privado":n.visibility==="shared"?" · compartilhado":"") + '</span>' +
        '<strong>' + esc(n.title) + '</strong>' +
        (n.content ? '<p>' + esc(n.content).slice(0,140) + '</p>' : "");
      el.querySelector("[data-edit]").onclick=(ev)=>{ev.stopPropagation();editor(n);};
      el.addEventListener("dblclick",(ev)=>{ev.stopPropagation(); if(!state.connectMode) editor(n);});
      el.addEventListener("click",(ev)=>{
        if(!state.connectMode) return;
        ev.stopPropagation();
        const id=String(n.id);
        if(!state.connectFirst){state.connectFirst=id;render();return;}
        if(state.connectFirst===id)return;
        const from=state.connectFirst; state.connectFirst=null; createEdge(from,id);
      });
      drag(el,n);
      nodesRoot.appendChild(el);
    });
    controls(); applyView();
  }

  function drag(el,n) {
    let moving=false,sx=0,sy=0,lx=0,ly=0;
    const b=board();
    el.addEventListener("pointerdown",(e)=>{
      if(state.connectMode || e.target.closest("[data-edit]")) return;
      moving=true; sx=e.clientX; sy=e.clientY; lx=Number(n.pos_x); ly=Number(n.pos_y); el.setPointerCapture?.(e.pointerId); el.classList.add("is-dragging");
    });
    el.addEventListener("pointermove",(e)=>{
      if(!moving)return; e.preventDefault();
      const r=b.getBoundingClientRect(), z=state.zoom||1;
      n.pos_x=Math.min(90,Math.max(0,lx+((e.clientX-sx)/r.width/z)*100));
      n.pos_y=Math.min(90,Math.max(0,ly+((e.clientY-sy)/r.height/z)*100));
      el.style.left=n.pos_x+"%"; el.style.top=n.pos_y+"%"; renderEdges();
    });
    const finish=async()=>{if(!moving)return;moving=false;el.classList.remove("is-dragging");if(n.created_by===user?.id||isMaster())await sb.from("knowledge_nodes").update({pos_x:n.pos_x,pos_y:n.pos_y,updated_at:new Date().toISOString()}).eq("id",n.id);};
    el.addEventListener("pointerup",finish); el.addEventListener("pointercancel",finish);
  }

  function renderEdges() {
    const svg=document.getElementById("aeriom-knowledge-svg"), b=board(); if(!svg||!b)return;
    svg.innerHTML=""; const rect=b.getBoundingClientRect(), byId=new Map(state.nodes.map(n=>[String(n.id),n]));
    state.edges.forEach((e)=>{const a=byId.get(String(e.from_node_id)),z=byId.get(String(e.to_node_id));if(!a||!z)return;const p1=pos(a,rect),p2=pos(z,rect);const line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1",p1.x);line.setAttribute("y1",p1.y);line.setAttribute("x2",p2.x);line.setAttribute("y2",p2.y);line.setAttribute("stroke",e.color||"#8b6f36");line.setAttribute("stroke-width",e.id===state.selectedEdge?3:2);line.setAttribute("stroke-linecap","round");line.style.pointerEvents="stroke";line.addEventListener("click",(ev)=>{ev.stopPropagation();edgeEditor(e);});svg.appendChild(line);});
  }

  async function createEdge(from,to){
    if(state.edges.some(e=>(String(e.from_node_id)===from&&String(e.to_node_id)===to)||(String(e.from_node_id)===to&&String(e.to_node_id)===from))){toast("Essa ligação já existe.","error");return;}
    const r=await sb.from("knowledge_edges").insert({campaign_id:campaignId,from_node_id:from,to_node_id:to,created_by:user.id,color:"#8b6f36",style:"solid"}).select("*").single();
    if(r.error){toast(r.error.message,"error");return;}
    state.edges.push(r.data);render();toast("Ligação criada.","success");
  }

  function ensureModal() {
    let m=document.getElementById("aeriom-knowledge-modal");
    if(!m){m=document.createElement("div");m.id="aeriom-knowledge-modal";m.className="aeriom-knowledge-modal";document.body.appendChild(m);}
    return m;
  }

  async function memberChoices(selected) {
    const r=await sb.from("campaign_members").select("user_id,role").eq("campaign_id",campaignId);
    if(r.error)throw r.error;
    const ids=(r.data||[]).map(x=>x.user_id);
    let profiles=[];
    if(ids.length){const p=await sb.from("profiles").select("id,display_name").in("id",ids);profiles=p.data||[];}
    return (r.data||[]).filter(x=>x.user_id!==user?.id).map(x=>({id:x.user_id,role:x.role,name:profiles.find(p=>p.id===x.user_id)?.display_name||"Jogador",checked:selected.has(x.user_id)}));
  }

  async function editor(node) {
    const m=ensureModal(), meta=node?.metadata||{}, selected=new Set(Array.isArray(meta.shared_with)?meta.shared_with:[]);
    let members=[]; if(node?.visibility==="shared" || isMaster()) { try{members=await memberChoices(selected);}catch{} }
    m.innerHTML='<div class="aeriom-modal-card">' +
      '<header class="aeriom-modal-card__head"><div><p class="campaign-panel__eyebrow">Mapa mental</p><h3>'+(node?"Editar nota":"Nova nota")+'</h3></div><button class="campaign-icon-button" data-close>×</button></header>' +
      '<form class="aeriom-modal-card__body" data-editor>' +
      '<label class="aeriom-modal-field"><span>Título</span><input name="title" required maxlength="180" value="'+esc(node?.title||"")+'"></label>' +
      '<label class="aeriom-modal-field"><span>Tipo</span><select name="type">'+["note","npc","location","clue","quest","item","faction","event"].map(v=>'<option value="'+v+'" '+(node?.node_type===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label>' +
      '<label class="aeriom-modal-field"><span>Informação</span><textarea name="content" maxlength="5000">'+esc(node?.content||"")+'</textarea></label>' +
      '<div class="aeriom-knowledge-editor-grid"><label class="aeriom-modal-field"><span>Cor da nota</span><input type="color" name="color" value="'+esc(meta.color||"#8b6f36")+'"></label><label class="aeriom-modal-field"><span>Imagem</span><input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif"></label></div>' +
      (node?.__imageUrl?'<div class="aeriom-knowledge-current-image"><img src="'+esc(node.__imageUrl)+'" alt="Imagem atual"></div>':"") +
      '<label class="aeriom-modal-field"><span>Visibilidade</span><select name="visibility"><option value="public" '+(node?.visibility==="public"?"selected":"")+'>Todos</option>'+(isMaster()?'<option value="master" '+(node?.visibility==="master"?"selected":"")+'>Somente Mestre</option>':"")+'<option value="private" '+(node?.visibility==="private"?"selected":"")+'>Somente eu</option><option value="shared" '+(node?.visibility==="shared"?"selected":"")+'>Pessoas específicas</option></select></label>' +
      '<div class="aeriom-knowledge-share-panel"><div class="aeriom-knowledge-share-list">'+(members.length?members.map(x=>'<label class="aeriom-share-user"><input type="checkbox" name="share" value="'+x.id+'" '+(x.checked?"checked":"")+'><span>'+esc(x.name)+'</span><small>'+esc(x.role)+'</small></label>').join(""):'<small>Nenhum outro integrante.</small>')+'</div></div>' +
      '<div class="aeriom-modal-actions">'+(node?'<button class="aeriom-mini-button aeriom-mini-button--danger" type="button" data-delete>Excluir</button>':"")+'<button class="campaign-button campaign-button--secondary" type="button" data-close>Cancelar</button><button class="campaign-button campaign-button--primary" type="submit">Salvar</button></div>' +
      '</form></div>';
    m.classList.add("is-open");
    m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("is-open"));
    m.querySelector("[data-delete]")?.addEventListener("click",async()=>{if(!confirm("Excluir esta nota e suas ligações?"))return;const r=await sb.from("knowledge_nodes").delete().eq("id",node.id);if(r.error){toast(r.error.message,"error");return;}m.classList.remove("is-open");await load();render();toast("Nota excluída.","success");});
    m.querySelector("[data-editor]").addEventListener("submit",async(e)=>{
      e.preventDefault();const f=e.currentTarget;let id=node?.id, metaOut={...(node?.metadata||{}),color:f.color.value};let imagePath=metaOut.image_path||"";
      const file=f.image.files?.[0];
      if(file){const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");imagePath=""+campaignId+"/knowledge/"+(id||crypto.randomUUID())+"-"+Date.now()+"."+ext;const up=await sb.storage.from("campaign-assets").upload(imagePath,file,{upsert:true,contentType:file.type});if(up.error)throw up.error;metaOut.image_path=imagePath;}
      const shared=[...m.querySelectorAll('input[name="share"]:checked')].map(x=>x.value);metaOut.shared_with=shared;
      const payload={campaign_id:campaignId,created_by:node?.created_by||user.id,owner_id:(f.visibility.value==="private"||f.visibility.value==="shared")?user.id:null,visibility:f.visibility.value,node_type:f.type.value,title:f.title.value.trim(),content:f.content.value.trim()||null,pos_x:node?.pos_x??20+Math.random()*45,pos_y:node?.pos_y??20+Math.random()*45,linked_pin_id:node?.linked_pin_id||null,metadata:metaOut};
      if(node){const r=await sb.from("knowledge_nodes").update({...payload,updated_at:new Date().toISOString()}).eq("id",node.id);if(r.error)throw r.error;id=node.id;}else{const r=await sb.from("knowledge_nodes").insert(payload).select("id").single();if(r.error)throw r.error;id=r.data.id;}
      await sb.from("knowledge_node_permissions").delete().eq("node_id",id);
      if(f.visibility.value==="shared"&&shared.length){const r=await sb.from("knowledge_node_permissions").insert(shared.map(uid=>({node_id:id,user_id:uid,created_by:user.id})));if(r.error)throw r.error;}
      m.classList.remove("is-open");await load();render();toast(node?"Nota atualizada.":"Nota criada.","success");
    });
  }

  function edgeEditor(edge) {
    const m=ensureModal();
    m.innerHTML='<div class="aeriom-modal-card"><header class="aeriom-modal-card__head"><div><p class="campaign-panel__eyebrow">Conexão</p><h3>Editar ligação</h3></div><button class="campaign-icon-button" data-close>×</button></header><form class="aeriom-modal-card__body" data-edge><label class="aeriom-modal-field"><span>Rótulo</span><input name="label" maxlength="120" value="'+esc(edge.label||"")+'"></label><label class="aeriom-modal-field"><span>Cor da linha</span><input type="color" name="color" value="'+esc(edge.color||"#8b6f36")+'"></label><div class="aeriom-modal-actions"><button type="button" class="aeriom-mini-button aeriom-mini-button--danger" data-delete-edge>Excluir</button><button type="button" class="campaign-button campaign-button--secondary" data-close>Cancelar</button><button type="submit" class="campaign-button campaign-button--primary">Salvar</button></div></form></div>';
    m.classList.add("is-open");m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("is-open"));
    m.querySelector("[data-delete-edge]").onclick=async()=>{const r=await sb.from("knowledge_edges").delete().eq("id",edge.id);if(r.error){toast(r.error.message,"error");return;}m.classList.remove("is-open");await load();render();toast("Ligação excluída.","success");};
    m.querySelector("[data-edge]").onsubmit=async(e)=>{e.preventDefault();const f=e.currentTarget;const r=await sb.from("knowledge_edges").update({label:f.label.value.trim()||null,color:f.color.value}).eq("id",edge.id);if(r.error){toast(r.error.message,"error");return;}m.classList.remove("is-open");await load();render();toast("Ligação atualizada.","success");};
  }

  function watch() {
    let lastPanel=false;
    const timer=setInterval(async()=>{
      const panel=document.getElementById("campaign-panel-timeline");
      const open=panel && !panel.hidden;
      if(open && !lastPanel){try{await load();render();}catch(e){console.warn("[AERION][KNOWLEDGE]",e);}}
      lastPanel=Boolean(open);
    },700);
    window.addEventListener("resize",()=>{ if(document.getElementById("campaign-panel-timeline") && !document.getElementById("campaign-panel-timeline").hidden) render(); });
  }

  async function start(){watch();try{await load();render();}catch{}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
