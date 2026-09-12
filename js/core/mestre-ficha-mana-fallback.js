import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  if (window.__AERIOM_MESTRE_FICHA_MANA_FALLBACK__) return;
  window.__AERIOM_MESTRE_FICHA_MANA_FALLBACK__ = true;

  const MANA = [["azul","Azul","#5d9de0","🔵"],["roxa","Roxa","#a978e1","🟣"],["dourada","Dourada","#e4be5f","🟡"],["branca","Branca","#eeeeee","⚪"]];
  let sb = null;
  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const cid = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const master = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail:{message,type} }));

  async function characters() {
    sb = sb || await getSupabase();
    const campaign = cid();
    if (!campaign) return [];
    const chars = await sb.from("campaign_characters").select("character_id,characters(id,name,race,class)").eq("campaign_id",campaign).eq("is_present",true);
    if (chars.error) throw chars.error;
    const settings = await sb.from("campaign_character_settings").select("character_id,unlocked_manas,selected_mana").eq("campaign_id",campaign);
    if (settings.error) throw settings.error;
    const byId = new Map((settings.data||[]).map(row=>[String(row.character_id),row]));
    return (chars.data||[]).map(row=>({character:row.characters,settings:byId.get(String(row.character_id))||{unlocked_manas:["azul"],selected_mana:"azul"}})).filter(x=>x.character);
  }

  function injectStyle(){
    if($("aeriom-ficha-mana-fallback-style")) return;
    const style=document.createElement("style"); style.id="aeriom-ficha-mana-fallback-style";
    style.textContent=`
      .aeriom-ficha-manage-button{width:100%;min-height:34px;margin-top:7px;border:1px solid rgba(216,182,95,.25);border-radius:9px;background:rgba(216,182,95,.055);color:#e6c66f;font-size:7px;font-weight:900;cursor:pointer}
      .aeriom-ficha-manage-button:hover{border-color:rgba(216,182,95,.5);transform:translateY(-1px)}
      .aeriom-ficha-fallback-modal{position:fixed;inset:0;z-index:7800;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(9px)}
      .aeriom-ficha-fallback-modal.is-open{display:flex}
      .aeriom-ficha-fallback-dialog{width:min(560px,100%);max-height:90dvh;overflow:auto;border:1px solid rgba(216,182,95,.18);border-radius:16px;background:#0d0c0a;box-shadow:0 30px 100px rgba(0,0,0,.5)}
      .aeriom-ficha-fallback-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;border-bottom:1px solid rgba(255,255,255,.06)}
      .aeriom-ficha-fallback-head h3{margin:2px 0 0;color:#eee8dc;font:500 18px Cinzel,serif}
      .aeriom-ficha-fallback-head small{color:rgba(255,255,255,.38);font-size:7px}
      .aeriom-ficha-fallback-close{min-height:32px;padding:0 10px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.02);color:#bbb;font-size:7px;cursor:pointer}
      .aeriom-ficha-fallback-body{padding:13px}
      .aeriom-ficha-fallback-body .aeriom-ficha-mana-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .aeriom-ficha-fallback-body .aeriom-ficha-mana-button{min-height:58px;display:grid;place-items:center;gap:2px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.015);color:rgba(255,255,255,.58);cursor:pointer}
      .aeriom-ficha-fallback-body .aeriom-ficha-mana-button.is-unlocked{border-color:var(--mana-color);color:#eee;background:rgba(216,182,95,.04)}
      .aeriom-ficha-fallback-body .aeriom-ficha-mana-button.is-selected{box-shadow:inset 0 -2px 0 var(--mana-color),0 0 18px color-mix(in srgb,var(--mana-color) 12%,transparent)}
      @media(max-width:700px){.aeriom-ficha-fallback-body .aeriom-ficha-mana-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `; document.head.appendChild(style);
  }

  async function save(item, unlocked, selected){
    sb=sb||await getSupabase();
    const result=await sb.from("campaign_character_settings").upsert({campaign_id:cid(),character_id:item.character.id,unlocked_manas:[...unlocked],selected_mana:selected},{onConflict:"campaign_id,character_id"});
    if(result.error) throw result.error;
    toast("Mana da ficha atualizada.","success");
  }

  function renderModal(item){
    let modal=$("aeriom-ficha-fallback-modal");
    if(!modal){
      modal=document.createElement("div"); modal.id="aeriom-ficha-fallback-modal"; modal.className="aeriom-ficha-fallback-modal";
      modal.innerHTML='<section class="aeriom-ficha-fallback-dialog" role="dialog" aria-modal="true"><header class="aeriom-ficha-fallback-head"><div><small>CONTROLE DO MESTRE · GERENCIAR FICHA</small><h3 data-ficha-fallback-name></h3></div><button type="button" class="aeriom-ficha-fallback-close">Fechar</button></header><div class="aeriom-ficha-fallback-body"><p style="margin:0 0 10px;color:rgba(255,255,255,.42);font-size:8px">Defina quais cores de Mana esta ficha pode usar e qual afinidade está ativa.</p><div class="aeriom-ficha-mana-grid" data-ficha-fallback-mana></div></div></section>';
      document.body.appendChild(modal);
      modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest(".aeriom-ficha-fallback-close"))modal.classList.remove("is-open")});
    }
    modal.querySelector("[data-ficha-fallback-name]").textContent=item.character.name||"Aventureiro";
    const host=modal.querySelector("[data-ficha-fallback-mana]");
    const unlocked=new Set(Array.isArray(item.settings?.unlocked_manas)?item.settings.unlocked_manas:["azul"]); unlocked.add("azul");
    let selected=item.settings?.selected_mana||"azul";
    host.innerHTML=MANA.map(([id,label,color,icon])=>`<button type="button" class="aeriom-ficha-mana-button ${unlocked.has(id)?"is-unlocked":""} ${selected===id?"is-selected":""}" data-ficha-fallback-mana="${id}" style="--mana-color:${color}"><span style="font-size:17px">${icon}</span><strong style="font-size:8px">${label}</strong><small style="font-size:6px;color:rgba(255,255,255,.32)">${selected===id?"ATIVA":unlocked.has(id)?"LIBERADA":"BLOQUEADA"}</small></button>`).join("");
    host.querySelectorAll("[data-ficha-fallback-mana]").forEach(button=>button.addEventListener("click",async()=>{
      const id=button.dataset.fichaFallbackMana;
      if(!unlocked.has(id)) unlocked.add(id); else selected=id;
      unlocked.add("azul");
      host.querySelectorAll("[data-ficha-fallback-mana]").forEach(btn=>{const bid=btn.dataset.fichaFallbackMana;btn.classList.toggle("is-unlocked",unlocked.has(bid));btn.classList.toggle("is-selected",selected===bid);const s=btn.querySelector("small");if(s)s.textContent=selected===bid?"ATIVA":unlocked.has(bid)?"LIBERADA":"BLOQUEADA"});
      try{await save(item,unlocked,selected)}catch(error){toast(error?.message||"Não foi possível salvar a Mana.","error")}
    }));
    modal.classList.add("is-open");
  }

  async function addButtons(){
    if(!master()) return;
    const host=$("aeriom-master-controls-root"); if(!host) return;
    const items=await characters();
    const byName=new Map(items.map(item=>[String(item.character.name||"").trim().toLowerCase(),item]));
    host.querySelectorAll("#aeriom-master-characters .aeriom-master-character").forEach(card=>{
      if(card.querySelector(".aeriom-ficha-manage-button")||[...card.querySelectorAll("button,a")].some(el=>/gerenciar/i.test(el.textContent||""))) return;
      const name=String(card.querySelector("strong,h3")?.textContent||"").trim().toLowerCase();
      const item=byName.get(name); if(!item) return;
      const button=document.createElement("button"); button.type="button"; button.className="aeriom-ficha-manage-button"; button.textContent="Gerenciar ficha";
      button.addEventListener("click",()=>renderModal(item));
      (card.querySelector(".aeriom-master-actions")||card).appendChild(button);
    });
  }

  function start(){injectStyle();window.setTimeout(()=>void addButtons().catch(error=>console.warn("[AERIOM][FICHA MANA FALLBACK]",error)),220)}
  window.addEventListener("aeriom:campaign:ready",start);
  window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="master-controls")start()});
  window.addEventListener("aeriom:master:refresh",start);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
