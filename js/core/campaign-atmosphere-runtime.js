/* AERIOM — runtime vivo da atmosfera da mesa.
 * Sem MutationObserver: reage apenas a eventos/controles explícitos.
 */
import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  if (window.__AERIOM_ATMOSPHERE_RUNTIME__) return;
  window.__AERIOM_ATMOSPHERE_RUNTIME__ = true;

  const ASSET = name => new URL(`../../assets/themes/aeriom/v2-${name}.svg`, import.meta.url).href;
  const THEME_ASSETS = { default:ASSET("default"), forest:ASSET("forest"), cave:ASSET("cave"), volcano:ASSET("volcano"), castle:ASSET("castle"), coast:ASSET("coast"), ruins:ASSET("ruins") };
  const MOODS = {
    adventure:{type:"dust",color:"#d9c58d",speed:1.0}, mystery:{type:"fog",color:"#8d9bc5",speed:.45}, danger:{type:"embers",color:"#e66a3b",speed:1.45}, calm:{type:"fireflies",color:"#b8d889",speed:.6}, celebration:{type:"confetti",color:"#e7c86e",speed:1.25}, horror:{type:"ash",color:"#b6b6b6",speed:.3}
  };
  const TIMES = { dawn:["#d59a75",.16], day:["#7fa8c9",.08], dusk:["#8d5d8d",.22], night:["#1c2858",.32], void:["#32194b",.48] };
  const LIGHTS = { warm:["#d78c48",.18], balanced:["#ffffff",0], cold:["#6b9fe8",.16], dramatic:["#6e3a9b",.28], dim:["#050505",.36] };
  const MANA = { azul:"#5d9de0", roxa:"#a978e1", dourada:"#e4be5f", branca:"#eeeeee" };
  let audio = null;
  let audioOn = false;

  const root = () => document.documentElement;
  const settings = () => ({
    mood: root().dataset.atmosphereMood || "adventure",
    time: root().dataset.atmosphereTime || "night",
    light: root().dataset.atmosphereLight || "balanced",
    scene: root().dataset.atmosphereScene || "immersive",
    intensity: Number(getComputedStyle(root()).getPropertyValue("--campaign-theme-intensity") || .55),
    vignette: Number(getComputedStyle(root()).getPropertyValue("--campaign-vignette-opacity") || .42),
    glow: Number(getComputedStyle(root()).getPropertyValue("--campaign-atmosphere-glow") || .2),
    density: Number(document.querySelector('[data-atm-range="particle_density"]')?.value || 12),
    speed: Number(document.querySelector('[data-atm-range="animation_speed"]')?.value || 62)
  });

  function installStyle(){
    if(document.getElementById("aeriom-atmosphere-runtime-style")) return;
    const s=document.createElement("style"); s.id="aeriom-atmosphere-runtime-style";
    s.textContent=`
      /* Arte real dos presets */
      .aeriom-atmosphere__theme[data-atm-theme="default"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.default}") !important}
      .aeriom-atmosphere__theme[data-atm-theme="forest"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.forest}") !important}
      .aeriom-atmosphere__theme[data-atm-theme="cave"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.cave}") !important}
      .aeriom-atmosphere__theme[data-atm-theme="volcano"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.volcano}") !important}
      .aeriom-atmosphere__theme[data-atm-theme="castle"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.castle}") !important}
      .aeriom-atmosphere__theme[data-atm-theme="coast"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.coast}") !important}
      .aeriom-atmosphere__theme[data-atm-theme="ruins"] .aeriom-atmosphere__theme-preview{background-image:url("${THEME_ASSETS.ruins}") !important}
      html[data-theme="default"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.default}") !important}
      html[data-theme="forest"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.forest}") !important}
      html[data-theme="cave"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.cave}") !important}
      html[data-theme="volcano"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.volcano}") !important}
      html[data-theme="castle"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.castle}") !important}
      html[data-theme="coast"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.coast}") !important}
      html[data-theme="ruins"] .aeriom-atmosphere__hero{background-image:linear-gradient(130deg,rgba(0,0,0,.72),rgba(0,0,0,.25)),url("${THEME_ASSETS.ruins}") !important}
      #aeriom-atmosphere-fx{position:fixed;inset:0;z-index:3;pointer-events:none;overflow:hidden;isolation:isolate}
      #aeriom-atmosphere-fx .fx-back,#aeriom-atmosphere-fx .fx-front,#aeriom-atmosphere-fx .fx-vignette,#aeriom-atmosphere-fx .fx-light{position:absolute;inset:0;pointer-events:none}
      #aeriom-atmosphere-fx .fx-back{mix-blend-mode:screen;opacity:.8}
      #aeriom-atmosphere-fx .fx-vignette{box-shadow:inset 0 0 180px rgba(0,0,0,var(--fx-vignette,.35));z-index:4}
      #aeriom-atmosphere-fx .fx-light{background:radial-gradient(circle at 50% 20%,var(--fx-light-color),transparent 62%);opacity:var(--fx-light-opacity,.1);mix-blend-mode:screen;z-index:2}
      #aeriom-atmosphere-fx .particle{position:absolute;left:0;top:0;will-change:transform,opacity;opacity:0}
      #aeriom-atmosphere-fx .confetti{width:7px;height:13px;border-radius:2px;background:var(--p);animation:fx-confetti var(--d) linear var(--delay) infinite}
      #aeriom-atmosphere-fx .ember{width:5px;height:5px;border-radius:50%;background:var(--p);box-shadow:0 0 12px var(--p);animation:fx-rise var(--d) linear var(--delay) infinite}
      #aeriom-atmosphere-fx .dust{width:3px;height:3px;border-radius:50%;background:var(--p);animation:fx-drift var(--d) ease-in-out var(--delay) infinite}
      #aeriom-atmosphere-fx .firefly{width:5px;height:5px;border-radius:50%;background:var(--p);box-shadow:0 0 14px 4px var(--p);animation:fx-firefly var(--d) ease-in-out var(--delay) infinite}
      #aeriom-atmosphere-fx .ash{width:4px;height:4px;border-radius:50%;background:var(--p);animation:fx-ash var(--d) linear var(--delay) infinite}
      #aeriom-atmosphere-fx .fog{width:280px;height:100px;border-radius:50%;background:radial-gradient(ellipse,var(--p),transparent 70%);filter:blur(18px);opacity:.12;animation:fx-fog var(--d) ease-in-out var(--delay) infinite}
      @keyframes fx-confetti{0%{transform:translate3d(var(--x),-12vh,0) rotate(0);opacity:0}8%{opacity:.9}100%{transform:translate3d(calc(var(--x) + var(--drift)),112vh,0) rotate(720deg);opacity:0}}
      @keyframes fx-rise{0%{transform:translate3d(var(--x),110vh,0) scale(.5);opacity:0}15%{opacity:.9}100%{transform:translate3d(calc(var(--x) + var(--drift)), -15vh,0) scale(1.1);opacity:0}}
      @keyframes fx-drift{0%,100%{transform:translate3d(var(--x),var(--y),0);opacity:0}30%{opacity:.5}50%{transform:translate3d(calc(var(--x) + var(--drift)),calc(var(--y) - 4vh),0);opacity:.65}80%{opacity:.2}}
      @keyframes fx-firefly{0%,100%{transform:translate3d(var(--x),var(--y),0);opacity:0}35%{opacity:.85}65%{transform:translate3d(calc(var(--x) + var(--drift)),calc(var(--y) - 5vh),0);opacity:.35}}
      @keyframes fx-ash{0%{transform:translate3d(var(--x),-5vh,0);opacity:0}15%{opacity:.4}100%{transform:translate3d(calc(var(--x) + var(--drift)),105vh,0);opacity:0}}
      @keyframes fx-fog{0%,100%{transform:translateX(-12vw) scale(.9);opacity:0}40%{opacity:.55}70%{transform:translateX(65vw) scale(1.2);opacity:.2}}
      html[data-atmosphere-scene="cinematic"] body{--campaign-cinematic-gap:clamp(10px,2.4vw,28px)}
      html[data-atmosphere-scene="cinematic"] #aeriom-atmosphere-fx .fx-vignette{box-shadow:inset 0 0 220px rgba(0,0,0,.52)}
      html[data-atmosphere-scene="immersive"] .campaign-main,html[data-atmosphere-scene="immersive"] main{--campaign-content-lift:1}
      html[data-atmosphere-density="compact"] .aeriom-atmosphere__section,html[data-atmosphere-density="compact"] .aeriom-master-card{padding:11px !important}
      html[data-atmosphere-density="spacious"] .aeriom-atmosphere__section,html[data-atmosphere-density="spacious"] .aeriom-master-card{padding:20px !important}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar{width:min(72px,18vw) !important}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar .sidebar-label,html[data-atmosphere-sidebar="minimal"] .campaign-sidebar .nav-label{display:none !important}
      html[data-atmosphere-sidebar="minimal"] .campaign-main{margin-left:min(72px,18vw) !important}
      #aeriom-atmosphere-sound{display:inline-flex;align-items:center;gap:7px;margin-top:9px}
      #aeriom-atmosphere-sound.is-on{border-color:var(--campaign-accent);box-shadow:0 0 18px color-mix(in srgb,var(--campaign-accent) 16%,transparent)}
    `;
    document.head.appendChild(s);
  }

  function fxRoot(){
    let el=document.getElementById("aeriom-atmosphere-fx");
    if(el) return el;
    el=document.createElement("div"); el.id="aeriom-atmosphere-fx";
    el.innerHTML='<div class="fx-back"></div><div class="fx-light"></div><div class="fx-front"></div><div class="fx-vignette"></div>';
    document.body.appendChild(el); return el;
  }

  function particleCount(s){ return Math.max(0,Math.min(55,Math.round(s.density * Math.max(.25,s.intensity)))); }
  function buildParticles(layer,s){
    layer.replaceChildren();
    if(!document.documentElement.dataset.atmosphereMood || document.documentElement.dataset.atmosphereMood === "off") return;
    const mood=MOODS[s.mood]||MOODS.adventure, count=particleCount(s);
    for(let i=0;i<count;i++){
      const p=document.createElement("span"); p.className=`particle ${mood.type}`;
      p.style.setProperty("--p",mood.color); p.style.setProperty("--x",`${Math.random()*100}vw`); p.style.setProperty("--y",`${18+Math.random()*75}vh`); p.style.setProperty("--drift",`${(Math.random()-.5)*18}vw`);
      p.style.setProperty("--delay",`${-Math.random()*10}s`); p.style.setProperty("--d",`${(5+Math.random()*8)/(Math.max(.35,s.speed/62))*mood.speed}s`);
      layer.appendChild(p);
    }
    if(mood.type === "fog") for(let i=0;i<5;i++){const p=document.createElement("span");p.className="particle fog";p.style.setProperty("--p",mood.color);p.style.setProperty("--delay",`${-Math.random()*12}s`);p.style.setProperty("--d",`${16+Math.random()*12}s`);layer.appendChild(p);}
  }

  function apply(){
    const s=settings(), r=root(), fx=fxRoot(), mood=MOODS[s.mood]||MOODS.adventure, tm=TIMES[s.time]||TIMES.night, light=LIGHTS[s.light]||LIGHTS.balanced;
    r.dataset.atmosphereDensity=document.querySelector('[data-atm-select="ui_density"]')?.value||"comfortable";
    r.dataset.atmosphereSidebar=document.querySelector('[data-atm-select="sidebar_mode"]')?.value||"full";
    r.style.setProperty("--fx-vignette",String(Math.min(1,s.vignette*(.55+.45*s.intensity))));
    r.style.setProperty("--fx-light-color",light[0]); r.style.setProperty("--fx-light-opacity",String(light[1]*s.intensity + tm[1]*.55*s.intensity));
    fx.dataset.mood=mood.type; fx.dataset.time=s.time; fx.dataset.light=s.light;
    buildParticles(fx.querySelector(".fx-front"),s);
    const back=fx.querySelector(".fx-back"); back.style.background=`linear-gradient(180deg,${tm[0]} 0%,transparent 72%)`; back.style.opacity=String(tm[1]*s.intensity);
    if(s.mood === "celebration") fx.style.filter="saturate(1.12)"; else fx.style.filter="none";
  }

  function ensureSoundButton(){
    const host=document.getElementById("campaign-theme-selector"); if(!host || document.getElementById("aeriom-atmosphere-sound")) return;
    const save=host.querySelector(".aeriom-atmosphere__save"); if(!save) return;
    const b=document.createElement("button"); b.type="button"; b.id="aeriom-atmosphere-sound"; b.className="aeriom-atmosphere__button"; b.textContent="♫ Som ambiente: desligado";
    b.addEventListener("click",()=>{ audioOn=!audioOn; if(audioOn) startAudio(); else stopAudio(); b.classList.toggle("is-on",audioOn); b.textContent=`♫ Som ambiente: ${audioOn?"ligado":"desligado"}`; });
    save.querySelector(".aeriom-atmosphere__row")?.prepend(b);
  }

  function startAudio(){
    try{
      const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
      if(!audio) audio=new C(); if(audio.state==="suspended") audio.resume();
      const now=audio.currentTime, s=settings(), freq={celebration:392,danger:110,mystery:174,calm:261,horror:82,adventure:220}[s.mood]||220;
      const osc=audio.createOscillator(), gain=audio.createGain(); osc.type=s.mood==="danger"?"sawtooth":"sine"; osc.frequency.value=freq; gain.gain.setValueAtTime(0.0001,now); gain.gain.exponentialRampToValueAtTime(.035,now+.35); gain.gain.exponentialRampToValueAtTime(.0001,now+2.8); osc.connect(gain).connect(audio.destination); osc.start(now); osc.stop(now+3); setTimeout(()=>{if(audioOn)startAudio();},2600);
    }catch{}
  }
  function stopAudio(){ audioOn=false; }

  function bind(){
    document.addEventListener("click",e=>{if(e.target.closest("[data-atm-theme],[data-atm-choice],[data-atm-reset],[data-atm-bg]")) setTimeout(()=>{apply();ensureSoundButton();},30);});
    document.addEventListener("input",e=>{if(e.target.closest("[data-atm-range],[data-atm-color]")) setTimeout(apply,0);});
    document.addEventListener("change",e=>{if(e.target.closest("[data-atm-select],[data-cin-toggle]")) setTimeout(()=>{apply();ensureSoundButton();},0);});
    window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="theme") setTimeout(()=>{apply();ensureSoundButton();},120);});
    window.addEventListener("aeriom:campaign:ready",()=>setTimeout(()=>{apply();ensureSoundButton();},600));
  }
  installStyle(); bind(); setTimeout(()=>{apply();ensureSoundButton();},900);
})();
