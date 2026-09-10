import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  const THEMES = [
    ["default","AERIOM","Equilibrado","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80"],
    ["forest","Floresta","Misteriosa","https://backiee.com/static/wallpapers/1000x563/392020.jpg"],
    ["cave","Caverna","Profunda","https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80"],
    ["castle","Castelo","Sombria","https://static.wixstatic.com/media/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg/v1/fill/w_980,h_552,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg"],
    ["coast","Tempestade","Mar revolto","https://wallpapercrafter.com/desktop/98690-fantasy-art-sea-ship-storm-lightning-video-games-cyan.jpg"],
    ["ruins","Abismo","Antiga ruína","https://uploads.worldanvil.com/uploads/images/3ea699821c678eb3956df7a9cea2985b.jpg"]
  ];
  const MANA = [["azul","Azul","🔵"],["roxa","Roxa","🟣"],["dourada","Dourada","🟡"],["branca","Branca","⚪"]];
  const state = { timer:null, bound:false, sb:null, user:null, channel:null, media:null };
  const $ = (id) => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const toast = (message,type="info") => window.dispatchEvent(new CustomEvent("aerion:toast",{detail:{message,type}}));
  const themeImage = (id) => THEMES.find(x=>x[0]===id)?.[3] || THEMES[0][3];

  function injectStyles(){
    if(document.getElementById("mesa-experience-css")) return;
    const l=document.createElement("link"); l.id="mesa-experience-css"; l.rel="stylesheet"; l.href="./css/mesa-experience.css?v=20260910-01"; document.head.appendChild(l);
  }

  function hideRedundantAndPlayerTools(){
    const overview=document.querySelector('[data-campaign-panel="overview"]');
    if(!overview) return;
    overview.querySelectorAll("h2,h3,h4,strong,p").forEach(node=>{
      const t=(node.textContent||"").trim().toLowerCase();
      if(t!=="estado da mesa") return;
      const box=node.closest("section,article,.campaign-card,.campaign-panel__card,.campaign-overview-card,div");
      if(box && box!==overview) box.classList.add("aeriom-master-state-hidden");
    });
    const quick=overview.querySelector(".campaign-table-hud__actions");
    if(quick && !isMaster()) quick.classList.add("aeriom-master-state-hidden");
  }

  function routeMapClicks(){
    document.addEventListener("click",(e)=>{
      const target=e.target.closest?.('[data-campaign-tab-target="maps"]');
      if(!target)return;
      e.preventDefault(); e.stopImmediatePropagation();
      window.AERIOM_CAMPAIGN?.setActiveTab?.("maps");
      window.dispatchEvent(new CustomEvent("aeriom:campaigntabchange",{detail:{campaignId:campaignId(),tab:"maps"}}));
    },true);
  }

  async function selectTheme(id){
    const cid=campaignId(), c=ctx(); if(!cid||!c.supabase) return;
    try{
      const r=await c.supabase.from("campaigns").update({theme:id}).eq("id",cid);
      if(r.error) throw r.error;
      if(c.campaign)c.campaign.theme=id;
      applyVisualTheme(id);
      renderThemePanel();
      toast("Atmosfera aplicada para toda a mesa.","success");
    }catch(e){toast(e?.message||"Não foi possível aplicar o tema.","error");}
  }
  function applyVisualTheme(id){
    const url=themeImage(id); if(!url)return;
    document.documentElement.style.setProperty("--aeriom-custom-campaign-bg",`url("${url}")`);
    document.body.classList.add("aeriom-custom-atmosphere");
    const hero=document.querySelector(".campaign-hero__background");
    if(hero){hero.style.backgroundImage=`linear-gradient(rgba(7,6,5,.58),rgba(7,6,5,.88)),url("${url}")`;hero.style.backgroundSize="cover";hero.style.backgroundPosition="center";}
  }
  function renderThemePanel(){
    const root=$("campaign-theme-selector"); if(!root) return;
    const current=String(ctx()?.campaign?.theme||document.documentElement.dataset.theme||"default");
    root.classList.add("aeriom-theme-visual-grid"); root.replaceChildren();
    THEMES.forEach(([id,name,desc,url])=>{
      const b=document.createElement("button"); b.type="button"; b.className="aeriom-master-theme"+(id===current?" is-active":"");
      const img=document.createElement("div");img.className="aeriom-master-theme__img";img.style.backgroundImage=`url("${url}")`;
      const copy=document.createElement("div");copy.className="aeriom-master-theme__copy";copy.innerHTML="<strong></strong><small></small>";copy.querySelector("strong").textContent=name;copy.querySelector("small").textContent=desc;
      b.append(img,copy);b.onclick=()=>selectTheme(id);root.appendChild(b);
    });
  }

  function masterPanelExtra(){
    if(!isMaster()) return;
    const root=$("aeriom-master-controls-root"); if(!root || root.querySelector("[data-mesa-extra]")) return;
    const section=document.createElement("section");section.className="aeriom-master-card";section.dataset.mesaExtra="1";
    section.innerHTML=`<div class="aeriom-master-card__head"><div><h3>Centro de comando</h3><p>Ações que realmente pertencem ao Mestre, em um só lugar.</p></div><span class="aeriom-master-badge">MESTRE</span></div><div class="aeriom-master-command-grid"><button class="aeriom-master-command" data-cmd="maps"><strong>⌖ Mapa</strong><small>Abrir o mapa da campanha.</small></button><button class="aeriom-master-command" data-cmd="tests"><strong>◇ Teste</strong><small>Pedir um teste ao grupo.</small></button><button class="aeriom-master-command" data-cmd="combat"><strong>⚔ Combate</strong><small>Entrar no controle de combate.</small></button><button class="aeriom-master-command" data-cmd="theme"><strong>✦ Atmosfera</strong><small>Trocar tema da mesa.</small></button><button class="aeriom-master-command" data-cmd="media"><strong>▣ Mídia ao vivo</strong><small>Transmitir imagem, vídeo ou áudio.</small></button></div>`;
    section.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>command(b.dataset.cmd));
    root.prepend(section);
    const mana=document.createElement("section");mana.className="aeriom-master-card";mana.dataset.mesaExtra="1";mana.innerHTML=`<div class="aeriom-master-card__head"><div><h3>Mana dos aventureiros</h3><p>Libere cores e escolha a afinidade ativa por personagem.</p></div></div><div id="aeriom-mana-controls" class="aeriom-mana-control-grid"><div class="aeriom-master-empty">Carregando personagens…</div></div>`;root.insertBefore(mana,section.nextSibling);loadManaControls().catch(()=>{});
    const media=document.createElement("section");media.className="aeriom-master-card";media.dataset.mesaExtra="1";media.innerHTML=`<div class="aeriom-master-card__head"><div><h3>Mídia ao vivo para a mesa</h3><p>O conteúdo aparece em todos os jogadores conectados em tempo real.</p></div></div><div class="aeriom-live-media-form"><select id="aeriom-media-type"><option value="image">Imagem</option><option value="video">Vídeo</option><option value="audio">Áudio</option></select><input id="aeriom-media-url" type="url" placeholder="Cole a URL da mídia"><input id="aeriom-media-title" maxlength="120" placeholder="Título (opcional)"></div><div class="aeriom-live-media-actions"><button class="aeriom-master-button aeriom-master-button--primary" id="aeriom-media-send" type="button">Transmitir para todos</button><button class="aeriom-master-button" id="aeriom-media-stop" type="button">Encerrar mídia</button></div><div class="aeriom-live-media-status" id="aeriom-media-status">Nenhuma mídia ativa.</div>`;root.insertBefore(media,mana.nextSibling);$("aeriom-media-send").onclick=()=>publishMedia().catch(e=>toast(e?.message||"Falha ao transmitir mídia.","error"));$("aeriom-media-stop").onclick=()=>stopMedia().catch(e=>toast(e?.message||"Falha ao encerrar mídia.","error"));
  }
  function command(cmd){
    const tab={maps:"maps",tests:"tests",combat:"combat",theme:"theme"}[cmd]; if(tab){window.AERIOM_CAMPAIGN?.setActiveTab?.(tab);return;} if(cmd==="media") document.getElementById("aeriom-media-url")?.focus();
  }

  async function loadManaControls(){
    const cid=campaignId(), root=$("aeriom-mana-controls"); if(!cid||!root||!ctx()?.supabase)return;
    const r=await ctx().supabase.from("campaign_characters").select("character_id,characters(id,name,race,class)").eq("campaign_id",cid).eq("is_present",true);
    if(r.error)throw r.error;
    const chars=(r.data||[]).map(x=>x.characters).filter(Boolean); if(!chars.length){root.innerHTML='<div class="aeriom-master-empty">Nenhum aventureiro presente na mesa.</div>';return;}
    const settings=await ctx().supabase.from("campaign_character_settings").select("character_id,unlocked_manas,selected_mana").eq("campaign_id",cid);if(settings.error)throw settings.error;
    const byId=new Map((settings.data||[]).map(x=>[x.character_id,x]));root.replaceChildren();
    chars.forEach(ch=>{const s=byId.get(ch.id)||{unlocked_manas:["azul"],selected_mana:"azul"};const card=document.createElement("div");card.className="aeriom-mana-character";const name=document.createElement("div");name.className="aeriom-mana-character__name";name.innerHTML="<strong></strong><small></small>";name.querySelector("strong").textContent=ch.name;name.querySelector("small").textContent=[ch.race,ch.class].filter(Boolean).join(" · ");const pills=document.createElement("div");pills.className="aeriom-mana-pills";MANA.forEach(([id,label,icon])=>{const b=document.createElement("button");b.type="button";b.className="aeriom-mana-pill"+(Array.isArray(s.unlocked_manas)&&s.unlocked_manas.includes(id)?" is-active":"");b.textContent=icon+" "+label;b.onclick=()=>toggleMana(ch.id,s,id,b,pills);pills.appendChild(b)});card.append(name,pills);root.appendChild(card);});
  }
  async function toggleMana(characterId,settings,id,button,pills){
    const unlocked=new Set(Array.isArray(settings.unlocked_manas)?settings.unlocked_manas:["azul"]);
    if(id==="azul"){unlocked.add("azul");settings.unlocked_manas=[...unlocked];settings.selected_mana=id;}
    else if(unlocked.has(id)){unlocked.delete(id);settings.unlocked_manas=[...unlocked].filter(x=>x==="azul"||x!==id);if(settings.selected_mana===id)settings.selected_mana="azul";}
    else unlocked.add(id),settings.unlocked_manas=[...unlocked];
    const cid=campaignId();const sb=ctx()?.supabase; if(!cid||!sb)return;
    const r=await sb.from("campaign_character_settings").upsert({campaign_id:cid,character_id:characterId,unlocked_manas:settings.unlocked_manas,selected_mana:settings.selected_mana},{onConflict:"campaign_id,character_id"});if(r.error)throw r.error;
    pills.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("is-active",settings.unlocked_manas.includes(MANA[i][0])));toast("Mana atualizada.","success");
  }

  async function publishMedia(){
    if(!isMaster())return;const cid=campaignId(),sb=ctx()?.supabase;if(!cid||!sb)throw new Error("Campanha não carregada.");
    const type=$("aeriom-media-type").value,url=$("aeriom-media-url").value.trim(),title=$("aeriom-media-title").value.trim()||null;if(!/^https?:\\/\\//i.test(url))throw new Error("Informe uma URL HTTP/HTTPS válida.");
    const payload={campaign_id:cid,media_type:type,source_url:url,title,active:true,autoplay:true,loop:type!=="image",volume:.7,updated_by:ctx()?.user?.id||state.user?.id};
    let r=await sb.from("campaign_live_media").upsert(payload,{onConflict:"campaign_id"});if(r.error)throw r.error;toast("Mídia transmitida para todos.","success");
  }
  async function stopMedia(){const cid=campaignId(),sb=ctx()?.supabase;if(!cid||!sb)return;const r=await sb.from("campaign_live_media").delete().eq("campaign_id",cid);if(r.error)throw r.error;toast("Mídia encerrada.","success");}

  function ensureMediaOverlay(){
    if($("aeriom-live-media-overlay"))return;
    const o=document.createElement("div");o.id="aeriom-live-media-overlay";o.className="aeriom-live-media-overlay";o.innerHTML='<button class="aeriom-live-media-overlay__close" type="button" aria-label="Fechar mídia">×</button><div data-media-content></div><div class="aeriom-live-media-overlay__title" data-media-title></div>';document.body.appendChild(o);o.querySelector("button").onclick=()=>o.classList.remove("is-open");
  }
  function renderLiveMedia(media){
    ensureMediaOverlay();const o=$("aeriom-live-media-overlay"),root=o.querySelector("[data-media-content]"),title=o.querySelector("[data-media-title]");root.replaceChildren();title.textContent=media?.title||"";
    if(!media?.active){o.classList.remove("is-open");return;}
    let el;if(media.media_type==="video"){el=document.createElement("video");el.src=media.source_url;el.controls=true;el.autoplay=!!media.autoplay;el.loop=!!media.loop;el.playsInline=true;el.volume=Number(media.volume||.7);}else if(media.media_type==="audio"){el=document.createElement("audio");el.src=media.source_url;el.controls=true;el.autoplay=!!media.autoplay;el.loop=!!media.loop;el.volume=Number(media.volume||.7);}else{el=document.createElement("img");el.src=media.source_url;el.alt=media.title||"Mídia da mesa";}
    root.appendChild(el);o.classList.add("is-open");
  }
  async function loadLiveMedia(){const cid=campaignId(),sb=ctx()?.supabase;if(!cid||!sb)return;const r=await sb.from("campaign_live_media").select("*").eq("campaign_id",cid).maybeSingle();if(r.error)return;state.media=r.data;renderLiveMedia(r.data);const status=$("aeriom-media-status");if(status)status.textContent=r.data?.active?`Transmitindo: ${r.data.title||r.data.media_type}`:"Nenhuma mídia ativa.";}
  function subscribeMedia(){const cid=campaignId(),sb=ctx()?.supabase;if(!cid||!sb)return;if(state.channel)sb.removeChannel(state.channel);state.channel=sb.channel("campaign-live-media-"+cid).on("postgres_changes",{event:"*",schema:"public",table:"campaign_live_media",filter:`campaign_id=eq.${cid}`},payload=>{state.media=payload.eventType==="DELETE"?null:payload.new;renderLiveMedia(state.media);const status=$("aeriom-media-status");if(status)status.textContent=state.media?.active?`Transmitindo: ${state.media.title||state.media.media_type}`:"Nenhuma mídia ativa.";}).subscribe();}

  function enhance(){
    injectStyles();hideRedundantAndPlayerTools();
    if(isMaster()) { masterPanelExtra(); }
    const theme=String(ctx()?.campaign?.theme||document.documentElement.dataset.theme||"default");applyVisualTheme(theme);renderThemePanel();void loadLiveMedia();subscribeMedia();
  }
  function start(){
    if(state.bound)return;state.bound=true;routeMapClicks();ensureMediaOverlay();
    window.addEventListener("aeriom:campaign:ready",()=>{clearTimeout(state.timer);state.timer=setTimeout(enhance,60);});
    window.addEventListener("aeriom:campaigntabchange",()=>{clearTimeout(state.timer);state.timer=setTimeout(enhance,60);});
    const obs=new MutationObserver(()=>{if(document.querySelector("#aeriom-master-controls-root")){clearTimeout(state.timer);state.timer=setTimeout(enhance,80);hideRedundantAndPlayerTools();}});obs.observe(document.body,{childList:true,subtree:true});
    if(document.readyState!=="loading")setTimeout(enhance,250);else document.addEventListener("DOMContentLoaded",()=>setTimeout(enhance,250),{once:true});
  }
  start();
})();
