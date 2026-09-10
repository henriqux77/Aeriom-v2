import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const state={rows:[],loading:false};
  function ensureUI(){
    if($("#aeriom-global-search"))return;
    const b=document.createElement("button");
    b.id="aeriom-global-search-trigger";b.className="aeriom-global-search-trigger";b.type="button";b.innerHTML="⌕ <span>Buscar no AERIOM</span>";b.title="Busca global · Ctrl K";
    (document.querySelector(".campaign-topbar__right,.campaigns-topbar__right,.hb-top-actions,.aeriom-topbar__right")||document.body).prepend(b);
    const o=document.createElement("div");o.id="aeriom-global-search";o.className="aeriom-global-search";o.hidden=true;
    o.innerHTML='<div class="aeriom-global-search__backdrop"></div><section class="aeriom-global-search__dialog"><header><div><span>BUSCA GLOBAL</span><h2>Pesquisar no AERIOM</h2></div><button type="button" data-search-close>×</button></header><input id="aeriom-global-search-input" type="search" placeholder="NPC, personagem, quest, nota, Homebrew…"><div id="aeriom-global-search-status" class="aeriom-global-search__status">Digite para pesquisar.</div><div id="aeriom-global-search-results" class="aeriom-global-search__results"></div></section>';
    document.body.appendChild(o);
    b.addEventListener("click",open);o.querySelector("[data-search-close]").onclick=close;o.querySelector(".aeriom-global-search__backdrop").onclick=close;
    o.querySelector("#aeriom-global-search-input").addEventListener("input",render);
    document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();}});
  }
  async function load(){
    if(state.loading)return;state.loading=true;
    try{
      const sb=await getSupabase();const u=await sb.auth.getUser();if(u.error||!u.data.user)return;
      const datasets=[];const campaignId=window.AERIOM_CAMPAIGN?.getContext?.()?.campaignId;
      if(campaignId){
        const [n,m,t,c]=await Promise.all([
          sb.from("knowledge_nodes").select("id,title,content,node_type,campaign_id").eq("campaign_id",campaignId),
          sb.from("mural_posts").select("id,title,content,post_type,campaign_id").eq("campaign_id",campaignId),
          sb.from("timeline_events").select("id,title,description,event_type,campaign_id").eq("campaign_id",campaignId),
          sb.from("campaign_characters").select("character_id,characters(id,name,race,class,campaign_id)").eq("campaign_id",campaignId).eq("is_present",true)
        ]);
        (n.data||[]).forEach(x=>datasets.push({kind:"Conhecimento",type:x.node_type,title:x.title,text:x.content,id:x.id,tab:"knowledge"}));
        (m.data||[]).forEach(x=>datasets.push({kind:"Mural",type:x.post_type,title:x.title,text:x.content,id:x.id,tab:"mural"}));
        (t.data||[]).forEach(x=>datasets.push({kind:"Histórico",type:x.event_type,title:x.title,text:x.description,id:x.id,tab:"timeline"}));
        (c.data||[]).forEach(x=>{const ch=x.characters;if(ch)datasets.push({kind:"Personagem",type:ch.class||"personagem",title:ch.name,text:[ch.race,ch.class].filter(Boolean).join(" · "),id:ch.id,tab:null})});
      }else{
        const c=await sb.from("campaigns").select("id,name,description,created_by");
        (c.data||[]).forEach(x=>datasets.push({kind:"Campanha",type:"campaign",title:x.name,text:x.description,id:x.id,href:"./campanha.html?id="+encodeURIComponent(x.id)}));
      }
      state.rows=datasets;return datasets;
    }finally{state.loading=false}
  }
  async function render(){
    const input=$("#aeriom-global-search-input"),root=$("#aeriom-global-search-results"),status=$("#aeriom-global-search-status");if(!input||!root)return;
    const q=input.value.trim().toLowerCase();root.innerHTML="";
    if(!q){status.textContent="Digite para pesquisar.";return}
    status.textContent="Pesquisando…";await load();
    const list=state.rows.filter(x=>(x.title+" "+(x.text||"")+" "+x.kind+" "+(x.type||"")).toLowerCase().includes(q)).slice(0,40);
    status.textContent=list.length?list.length+" resultado(s)":"Nenhum resultado encontrado.";
    list.forEach(x=>{const a=document.createElement(x.href?"a":"button");a.className="aeriom-global-search__result";if(x.href)a.href=x.href;else a.type="button";a.innerHTML='<span>'+esc(x.kind)+'</span><strong>'+esc(x.title)+'</strong><small>'+esc(x.text||"")+'</small>';if(!x.href&&x.tab)a.onclick=()=>{close();window.AERIOM_CAMPAIGN?.setActiveTab?.(x.tab)};root.appendChild(a)});
  }
  function open(){const o=$("#aeriom-global-search");if(!o)return;o.hidden=false;requestAnimationFrame(()=>$("#aeriom-global-search-input")?.focus())}
  function close(){$("#aeriom-global-search")?.setAttribute("hidden","");}
  window.AERIOM_GLOBAL_SEARCH={open,close,refresh:()=>{state.rows=[];render()}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureUI,{once:true});else ensureUI();
})();