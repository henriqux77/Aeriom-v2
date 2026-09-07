import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const state = {
    sb:null,user:null,campaignId:null,nodes:[],edges:[],
    zoom:1,panX:0,panY:0,selected:null,connectFrom:null,
    boardObserver:null
  };

  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const ctx=()=>window.AERIOM_CAMPAIGN?.getContext?.()||null;
  const isMaster=()=>String(ctx()?.membership?.role||"").toLowerCase()==="master";

  async function ready(){
    const c=ctx();
    state.sb=c?.supabase||state.sb;
    state.user=c?.user||state.user;
    state.campaignId=c?.campaignId||c?.campaign?.id||state.campaignId;
    if(!state.user && state.sb){try{state.user=(await state.sb.auth.getUser()).data?.user||null;}catch{}}
    if(!state.sb) state.sb=await getSupabase();
    return Boolean(state.sb&&state.user&&state.campaignId);
  }

  function board(){return document.getElementById("aerion-mind-map-board");}
  function world(){return document.getElementById("aerion-mind-map-world");}
  function toast(msg,type="info"){const r=document.getElementById("aeriom-toast-region");if(!r)return;const e=document.createElement("div");e.className="aeriom-toast";e.dataset.type=type;e.textContent=msg;r.appendChild(e);setTimeout(()=>e.remove(),2600);}

  async function load(){
    if(!await ready()) return false;
    const nodesRes=await state.sb.from("aerion_mind_nodes").select("*").eq("campaign_id",state.campaignId).order("created_at",{ascending:true});
    if(nodesRes.error) throw nodesRes.error;
    const edgeRes=await state.sb.from("aerion_mind_edges").select("*").eq("campaign_id",state.campaignId).order("created_at",{ascending:true});
    if(edgeRes.error) throw edgeRes.error;
    state.nodes=nodesRes.data||[];
    state.edges=edgeRes.data||[];
    await Promise.all(state.nodes.map(async node=>{
      if(!node.image_path)return;
      try{
        const r=await state.sb.storage.from("campaign-assets").createSignedUrl(node.image_path,3600);
        if(!r.error) node.imageUrl=r.data?.signedUrl||"";
      }catch(error){console.warn("[AERION][MIND] image",error);}
    }));
    return true;
  }

  function applyView(){
    const w=world();if(!w)return;
    w.style.transform="translate3d("+state.panX+"px,"+state.panY+"px,0) scale("+state.zoom+")";
    const label=document.querySelector("#aerion-mind-map-tools [data-zoom-label]");
    if(label)label.textContent=Math.round(state.zoom*100)+"%";
  }

  function nodePoint(node,rect){
    return {x:(Number(node.pos_x)/100)*rect.width+75,y:(Number(node.pos_y)/100)*rect.height+44};
  }

  function renderEdges(){
    const b=board(),svg=document.getElementById("aerion-mind-map-svg");if(!b||!svg)return;
    const r=b.getBoundingClientRect(),map=new Map(state.nodes.map(n=>[String(n.id),n]));
    svg.innerHTML="";
    state.edges.forEach(edge=>{
      const a=map.get(String(edge.from_node_id)),z=map.get(String(edge.to_node_id));if(!a||!z)return;
      const p=nodePoint(a,r),q=nodePoint(z,r);
      const line=document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1",p.x);line.setAttribute("y1",p.y);line.setAttribute("x2",q.x);line.setAttribute("y2",q.y);
      line.setAttribute("stroke",edge.color||"#8b6f36");line.setAttribute("stroke-width",edge.id===state.selected?"3":"2");line.setAttribute("stroke-linecap","round");
      line.style.pointerEvents="stroke";
      line.addEventListener("click",ev=>{ev.stopPropagation();state.selected=edge.id;edgeEditor(edge);});
      svg.appendChild(line);
    });
  }

  function render(){
    const b=board();if(!b)return;
    let w=world();
    const nodesRoot=document.getElementById("aerion-mind-map-nodes"),svg=document.getElementById("aerion-mind-map-svg");
    if(!w&&nodesRoot&&svg){w=document.createElement("div");w.id="aerion-mind-map-world";w.className="aerion-mind-map-world";b.appendChild(w);w.append(svg,nodesRoot);}
    if(!nodesRoot||!svg)return;
    nodesRoot.innerHTML="";
    const empty=document.getElementById("aerion-mind-map-empty"); if(empty) empty.hidden=state.nodes.length>0;
    state.nodes.forEach(node=>{
      const el=document.createElement("article");el.className="aerion-mind-node"+(state.connectFrom===String(node.id)?" is-connect":"");
      el.dataset.id=node.id;el.style.left=Number(node.pos_x)+"%";el.style.top=Number(node.pos_y)+"%";el.style.setProperty("--node-color",node.color||"#8b6f36");
      el.innerHTML='<button type="button" class="aerion-mind-node__edit" title="Editar">✎</button>'+
        (node.imageUrl?'<img src="'+esc(node.imageUrl)+'" alt="">':"")+
        '<div class="aerion-mind-node__type">'+esc(node.node_type)+(node.visibility==="private"?" · privado":node.visibility==="shared"?" · compartilhado":node.visibility==="master"?" · mestre":"")+'</div>'+
        '<h3>'+esc(node.title)+'</h3>'+(node.content?'<p>'+esc(node.content).slice(0,160)+'</p>':"");
      el.querySelector(".aerion-mind-node__edit").onclick=e=>{e.stopPropagation();editor(node);};
      el.addEventListener("click",e=>{
        if(!state.connectFrom)return;
        e.stopPropagation();const id=String(node.id);if(id===state.connectFrom)return;
        const from=state.connectFrom;state.connectFrom=null;createEdge(from,id);
      });
      dragNode(el,node);
      nodesRoot.appendChild(el);
    });
    renderEdges();applyView();
  }

  function dragNode(el,node){
    let active=false,moved=false,sx=0,sy=0,ox=0,oy=0;
    el.addEventListener("pointerdown",e=>{
      if(e.target.closest(".aerion-mind-node__edit")||state.connectFrom)return;
      active=true;moved=false;sx=e.clientX;sy=e.clientY;ox=Number(node.pos_x);oy=Number(node.pos_y);el.setPointerCapture?.(e.pointerId);el.classList.add("is-dragging");e.stopPropagation();
    });
    el.addEventListener("pointermove",e=>{
      if(!active)return;e.preventDefault();e.stopPropagation();
      const r=board().getBoundingClientRect(),z=state.zoom||1;
      const dx=((e.clientX-sx)/r.width/z)*100,dy=((e.clientY-sy)/r.height/z)*100;
      if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>4)moved=true;
      node.pos_x=Math.max(1,Math.min(95,ox+dx));node.pos_y=Math.max(1,Math.min(95,oy+dy));
      el.style.left=node.pos_x+"%";el.style.top=node.pos_y+"%";renderEdges();
    });
    const finish=async()=>{if(!active)return;active=false;el.classList.remove("is-dragging");if(moved){const r=await state.sb.from("aerion_mind_nodes").update({pos_x:node.pos_x,pos_y:node.pos_y,updated_at:new Date().toISOString()}).eq("id",node.id);if(r.error)toast(r.error.message,"error");}};
    el.addEventListener("pointerup",finish);el.addEventListener("pointercancel",finish);
  }

  function bindBoard(){
    const b=board();if(!b||b.dataset.bound)return;b.dataset.bound="1";
    let moving=false,sx=0,sy=0,px=0,py=0;
    b.addEventListener("pointerdown",e=>{if(e.target.closest(".aerion-mind-node"))return;moving=true;sx=e.clientX;sy=e.clientY;px=state.panX;py=state.panY;b.setPointerCapture?.(e.pointerId);});
    b.addEventListener("pointermove",e=>{if(!moving)return;e.preventDefault();state.panX=px+e.clientX-sx;state.panY=py+e.clientY-sy;applyView();});
    b.addEventListener("pointerup",()=>moving=false);b.addEventListener("pointercancel",()=>moving=false);
    b.addEventListener("wheel",e=>{e.preventDefault();state.zoom=Math.max(.5,Math.min(2.5,state.zoom+(e.deltaY<0?.1:-.1)));applyView();},{passive:false});
  }

  function controls(){
    const tools=document.getElementById("aerion-mind-map-tools");if(!tools||tools.dataset.bound)return;
    tools.dataset.bound="1";
    tools.innerHTML='<button class="aeriom-mini-button" type="button" data-add>＋ Nota</button><button class="aeriom-mini-button" type="button" data-connect>🔗 Ligar</button><button class="aeriom-mini-button" type="button" data-minus>−</button><span data-zoom-label>100%</span><button class="aeriom-mini-button" type="button" data-plus>＋</button><button class="aeriom-mini-button" type="button" data-reset>⟳</button>';
    tools.querySelector("[data-add]").onclick=()=>editor();
    document.getElementById("aerion-mind-map-empty")?.querySelector("[data-mind-add]")?.addEventListener("click",()=>editor());
    tools.querySelector("[data-connect]").onclick=()=>{state.connectFrom=null;state.connectMode=!state.connectMode;toast(state.connectMode?"Modo ligar: toque em duas notas.":"Modo ligar desativado.");render();};
    tools.querySelector("[data-minus]").onclick=()=>{state.zoom=Math.max(.5,state.zoom-.15);applyView();};
    tools.querySelector("[data-plus]").onclick=()=>{state.zoom=Math.min(2.5,state.zoom+.15);applyView();};
    tools.querySelector("[data-reset]").onclick=()=>{state.zoom=1;state.panX=0;state.panY=0;applyView();};
    tools.dataset.bound="1";state.connectMode=false;
  }

  async function memberChoices(selected){
    try{
      const r=await state.sb.from("campaign_members").select("user_id,role").eq("campaign_id",state.campaignId);
      const profiles=r.data?.length?(await state.sb.from("profiles").select("id,display_name").in("id",r.data.map(x=>x.user_id))).data||[]:[];
      return (r.data||[]).filter(x=>x.user_id!==state.user?.id).map(x=>({id:x.user_id,name:profiles.find(p=>p.id===x.user_id)?.display_name||"Jogador",role:x.role,checked:selected.has(x.user_id)}));
    }catch{return[]}
  }

  function modal(){
    let m=document.getElementById("aerion-mind-modal");if(!m){m=document.createElement("div");m.id="aerion-mind-modal";m.className="aerion-mind-modal";document.body.appendChild(m);}return m;
  }

  async function editor(node=null){
    if(!await ready())return toast("Campanha ainda não carregada.","error");
    const m=modal(),meta=new Set(Array.isArray(node?.shared_with)?node.shared_with:[]),members=await memberChoices(meta);
    m.innerHTML='<div class="aerion-mind-modal__card"><header><div><small>MAPA MENTAL</small><h2>'+(node?"Editar nota":"Nova nota")+'</h2></div><button type="button" data-close>×</button></header>'+
      '<form data-form><label>Título<input name="title" required maxlength="180" value="'+esc(node?.title||"")+'"></label><label>Tipo<select name="type">'+["note","npc","location","clue","quest","item","faction","event"].map(v=>'<option value="'+v+'" '+(node?.node_type===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label><label>Texto<textarea name="content" maxlength="6000">'+esc(node?.content||"")+'</textarea></label>'+
      '<div class="aerion-mind-form-grid"><label>Cor<input name="color" type="color" value="'+esc(node?.color||"#8b6f36")+'"></label><label>Imagem<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></div>'+
      '<label>Visibilidade<select name="visibility"><option value="public" '+(node?.visibility==="public"?"selected":"")+'>Todos</option>'+(isMaster()?'<option value="master" '+(node?.visibility==="master"?"selected":"")+'>Somente Mestre</option>':"")+'<option value="private" '+(node?.visibility==="private"?"selected":"")+'>Somente eu</option><option value="shared" '+(node?.visibility==="shared"?"selected":"")+'>Pessoas específicas</option></select></label>'+
      '<div class="aerion-mind-share">'+(members.length?members.map(x=>'<label><input type="checkbox" name="share" value="'+x.id+'" '+(x.checked?"checked":"")+'><span>'+esc(x.name)+'</span><small>'+esc(x.role)+'</small></label>').join(""):"<small>Nenhum outro integrante.</small>")+'</div>'+
      '<footer>'+(node?'<button type="button" class="aeriom-mini-button aeriom-mini-button--danger" data-delete>Excluir</button>':"")+'<span></span><button type="button" data-close class="aeriom-mini-button">Cancelar</button><button type="submit" class="aeriom-mini-button">Salvar</button></footer></form></div>';
    m.classList.add("is-open");
    m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("is-open"));
    const vis=m.querySelector("[name=visibility]"),share=m.querySelector(".aerion-mind-share");const sync=()=>share.hidden=vis.value!=="shared";vis.onchange=sync;sync();
    m.querySelector("[data-delete]")?.addEventListener("click",async()=>{if(!confirm("Excluir esta nota?"))return;const r=await state.sb.from("aerion_mind_nodes").delete().eq("id",node.id);if(r.error)return toast(r.error.message,"error");m.classList.remove("is-open");await load();render();toast("Nota excluída.","success");});
    m.querySelector("[data-form]").addEventListener("submit",async e=>{
      e.preventDefault();const f=e.currentTarget,btn=f.querySelector("[type=submit]");btn.disabled=true;
      try{
        const id=node?.id||crypto.randomUUID(),out={color:f.color.value};
        const file=f.image.files?.[0];
        if(file){const ext=(file.name.split(".").pop()||"png").toLowerCase().replace(/[^a-z0-9]/g,"");const path=state.campaignId+"/mind-map/"+id+"-"+Date.now()+"."+ext;const up=await state.sb.storage.from("campaign-assets").upload(path,file,{upsert:true,contentType:file.type});if(up.error)throw up.error;out.image_path=path;}
        const payload={campaign_id:state.campaignId,created_by:node?.created_by||state.user.id,title:f.title.value.trim(),content:f.content.value.trim()||null,node_type:f.type.value,color:out.color,pos_x:node?.pos_x??(20+Math.random()*55),pos_y:node?.pos_y??(18+Math.random()*60),visibility:f.visibility.value,image_path:out.image_path??node?.image_path??null,updated_at:new Date().toISOString()};
        let saved;
        if(node){const r=await state.sb.from("aerion_mind_nodes").update(payload).eq("id",node.id).select("*").single();if(r.error)throw r.error;saved=r.data;}else{const r=await state.sb.from("aerion_mind_nodes").insert(payload).select("*").single();if(r.error)throw r.error;saved=r.data;}
        const clearPerms=await state.sb.from("aerion_mind_permissions").delete().eq("node_id",saved.id); if(clearPerms.error)throw clearPerms.error;
        if(f.visibility.value==="shared"){const ids=[...m.querySelectorAll('input[name="share"]:checked')].map(x=>x.value);if(ids.length){const pr=await state.sb.from("aerion_mind_permissions").insert(ids.map(uid=>({node_id:saved.id,user_id:uid,created_by:state.user.id})));if(pr.error)throw pr.error;}}
        if(saved.image_path){try{saved.imageUrl=(await state.sb.storage.from("campaign-assets").createSignedUrl(saved.image_path,3600)).data?.signedUrl||"";}catch{}}
        const idx=state.nodes.findIndex(n=>String(n.id)===String(saved.id));if(idx>=0)state.nodes[idx]=saved;else state.nodes.push(saved);
        m.classList.remove("is-open");render();toast(node?"Nota atualizada.":"Nota criada.","success");
      }catch(err){console.error(err);toast(err?.message||"Não foi possível salvar a nota.","error");}finally{btn.disabled=false;}
    });
  }

  async function createEdge(from,to){
    if(String(from)===String(to))return;
    if(state.edges.some(e=>(String(e.from_node_id)===String(from)&&String(e.to_node_id)===String(to))||(String(e.from_node_id)===String(to)&&String(e.to_node_id)===String(from))))return toast("Essa ligação já existe.","error");
    const r=await state.sb.from("aerion_mind_edges").insert({campaign_id:state.campaignId,from_node_id:from,to_node_id:to,created_by:state.user.id,color:"#8b6f36"}).select("*").single();
    if(r.error)return toast(r.error.message,"error");state.edges.push(r.data);render();toast("Ligação criada.","success");
  }

  function edgeEditor(edge){
    const m=modal();
    m.innerHTML='<div class="aerion-mind-modal__card"><header><div><small>MAPA MENTAL</small><h2>Editar ligação</h2></div><button type="button" data-close>×</button></header><form data-form><label>Rótulo<input name="label" value="'+esc(edge.label||"")+'"></label><label>Cor<input name="color" type="color" value="'+esc(edge.color||"#8b6f36")+'"></label><footer><button type="button" data-delete class="aeriom-mini-button aeriom-mini-button--danger">Excluir</button><span></span><button type="button" data-close class="aeriom-mini-button">Cancelar</button><button type="submit" class="aeriom-mini-button">Salvar</button></footer></form></div>';
    m.classList.add("is-open");m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("is-open"));
    m.querySelector("[data-delete]").onclick=async()=>{const r=await state.sb.from("aerion_mind_edges").delete().eq("id",edge.id);if(r.error)return toast(r.error.message,"error");m.classList.remove("is-open");await load();render();};
    m.querySelector("[data-form]").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,r=await state.sb.from("aerion_mind_edges").update({label:f.label.value.trim()||null,color:f.color.value,updated_at:new Date().toISOString()}).eq("id",edge.id);if(r.error)return toast(r.error.message,"error");m.classList.remove("is-open");await load();render();};
  }

  async function boot(){
    const init=async()=>{
      if(!(await ready()))return;
      await load();
      const panel=document.getElementById("campaign-panel-timeline");
      if(panel&&!panel.hidden){controls();bindBoard();render();}
      if(!state.realtimeChannel&&state.sb&&state.campaignId){
        state.realtimeChannel=state.sb.channel("aerion-mind-"+state.campaignId)
          .on("postgres_changes",{event:"*",schema:"public",table:"aerion_mind_nodes",filter:"campaign_id=eq."+state.campaignId},async()=>{try{await load();render();}catch{}})
          .on("postgres_changes",{event:"*",schema:"public",table:"aerion_mind_edges",filter:"campaign_id=eq."+state.campaignId},async()=>{try{await load();render();}catch{}})
          .subscribe();
      }
    };
    window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="timeline")setTimeout(init,0);});
    const observe=()=>{
      const panel=document.getElementById("campaign-panel-timeline");if(!panel||!window.MutationObserver)return;
      state.boardObserver?.disconnect();
      state.boardObserver=new MutationObserver(()=>{const b=board();if(b){controls();bindBoard();render();}});
      state.boardObserver.observe(panel,{childList:true,subtree:true});
    };
    observe();
    setTimeout(init,250);setTimeout(init,900);setTimeout(init,1800);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();