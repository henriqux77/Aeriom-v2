(() => {
  "use strict";

  const THEMES = Object.freeze({
    default: {
      icon:"✦", label:"AERIOM", image:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2200&q=84",
      bg:"#090807", surface:"#15120f", surface2:"#1b1712", surface3:"#241e17", accent:"#c49e53", accent2:"#e0c77e", mana:"#4d79b6", danger:"#ad5350", success:"#83ad78", border:"rgba(204,170,101,.20)", glow:"rgba(216,179,91,.18)", text:"#efe8dc", muted:"#aaa093"
    },
    forest: {
      icon:"❧", label:"FLORESTA", image:"https://backiee.com/static/wallpapers/1000x563/392020.jpg",
      bg:"#07100a", surface:"#0d1710", surface2:"#122016", surface3:"#19291b", accent:"#8eaa64", accent2:"#c4d889", mana:"#5593a0", danger:"#a64d45", success:"#8cb86e", border:"rgba(143,176,103,.22)", glow:"rgba(117,165,88,.18)", text:"#e8eddf", muted:"#a6b19a"
    },
    cave: {
      icon:"◈", label:"CAVERNA", image:new URL("../../assets/themes/cave/background.webp", import.meta.url).href,
      bg:"#07090d", surface:"#10141a", surface2:"#161d25", surface3:"#202a34", accent:"#869eb2", accent2:"#b5c9d8", mana:"#6c92c0", danger:"#9d514e", success:"#7daa8c", border:"rgba(133,162,190,.22)", glow:"rgba(115,148,184,.18)", text:"#e5e9ec", muted:"#9ba7b0"
    },
    volcano: {
      icon:"✹", label:"VULCÃO", image:"https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2200&q=84",
      bg:"#120705", surface:"#1b0c09", surface2:"#27110b", surface3:"#37170d", accent:"#d36a35", accent2:"#f0a04e", mana:"#647db5", danger:"#e34c32", success:"#9ba85b", border:"rgba(215,93,42,.24)", glow:"rgba(235,83,25,.22)", text:"#f4e8df", muted:"#b9a49a"
    },
    castle: {
      icon:"♜", label:"CASTELO", image:"https://static.wixstatic.com/media/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg/v1/fill/w_1600,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg",
      bg:"#0a0b0e", surface:"#14151b", surface2:"#1c1d25", surface3:"#272833", accent:"#b7a064", accent2:"#e1cc96", mana:"#667fae", danger:"#9e5155", success:"#8ca675", border:"rgba(196,174,119,.21)", glow:"rgba(214,190,129,.16)", text:"#eee9df", muted:"#a6a09a"
    },
    coast: {
      icon:"≈", label:"COSTA", image:"https://wallpapercrafter.com/desktop/98690-fantasy-art-sea-ship-storm-lightning-video-games-cyan.jpg",
      bg:"#061016", surface:"#0d1920", surface2:"#11232c", surface3:"#18313a", accent:"#69a7bd", accent2:"#a7d8df", mana:"#4b8fd2", danger:"#a65b5b", success:"#7ea98d", border:"rgba(98,173,202,.23)", glow:"rgba(93,179,205,.18)", text:"#e4eef0", muted:"#9dafb4"
    },
    ruins: {
      icon:"𓂀", label:"RUÍNAS", image:"https://uploads.worldanvil.com/uploads/images/3ea699821c678eb3956df7a9cea2985b.jpg",
      bg:"#0b0a08", surface:"#151410", surface2:"#1d1a14", surface3:"#282318", accent:"#a99063", accent2:"#d1bd8c", mana:"#637794", danger:"#9f524b", success:"#8ea172", border:"rgba(175,148,91,.22)", glow:"rgba(172,141,83,.18)", text:"#ede8dd", muted:"#aaa092"
    }
  });

  const state = { theme:"default", settings:{ animations_enabled:true, particles_enabled:true, particle_density:12, animation_speed:.62, vignette:42, grain:0, glow:18, intensity:55, lighting:"balanced", scene_mode:"immersive", background_source:"theme" }, layer:null, particles:null, special:null };

  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

  function installStyle(){
    if(document.getElementById("aeriom-cinematic-v2-style")) return;
    const style=document.createElement("style"); style.id="aeriom-cinematic-v2-style";
    style.textContent=`
      :root{--cin-accent:#c49e53;--cin-accent-2:#e0c77e;--cin-bg:#090807;--cin-surface:#15120f;--cin-surface-2:#1b1712;--cin-surface-3:#241e17;--cin-border:rgba(204,170,101,.20);--cin-glow:rgba(216,179,91,.18);--cin-text:#efe8dc;--cin-muted:#aaa093;--cin-panel-opacity:86%;--cin-vignette:.42;--cin-glow-opacity:.18;--cin-intensity:.55;--cin-speed:.62;}
      .aeriom-page--campaign,.aeriom-page--campaign body{background:var(--cin-bg)!important;color:var(--cin-text)}
      .aeriom-page--campaign .campaign-app{background-image:linear-gradient(180deg,rgba(0,0,0,.26),rgba(0,0,0,.50)),var(--cin-page-image)!important;background-position:center;background-size:cover;background-attachment:fixed;background-color:var(--cin-bg)!important}
      .aeriom-page--campaign .campaign-main{background:transparent!important;color:var(--cin-text)}
      .aeriom-page--campaign .campaign-sidebar{background:linear-gradient(180deg,color-mix(in srgb,var(--cin-surface) 94%,black),color-mix(in srgb,var(--cin-bg) 98%,black))!important;border-color:var(--cin-border)!important;box-shadow:18px 0 60px rgba(0,0,0,.28)!important}
      .aeriom-page--campaign .campaign-topbar{background:color-mix(in srgb,var(--cin-bg) 90%,transparent)!important;border-color:var(--cin-border)!important}
      .aeriom-page--campaign .campaign-panel,.aeriom-page--campaign .campaign-card,.aeriom-page--campaign .campaign-section,.aeriom-page--campaign .campaign-sidebar__campaign,.aeriom-page--campaign .campaign-sidebar__section{background:color-mix(in srgb,var(--cin-surface) var(--cin-panel-opacity),transparent)!important;border-color:var(--cin-border)!important;box-shadow:0 18px 44px rgba(0,0,0,.16)!important;backdrop-filter:blur(var(--campaign-atmosphere-blur,0px)) saturate(110%)}
      .aeriom-page--campaign .campaign-panel h1,.aeriom-page--campaign .campaign-panel h2,.aeriom-page--campaign .campaign-panel h3,.aeriom-page--campaign .campaign-card h1,.aeriom-page--campaign .campaign-card h2,.aeriom-page--campaign .campaign-card h3{color:var(--cin-text)}
      .aeriom-page--campaign .campaign-panel p,.aeriom-page--campaign .campaign-card p,.aeriom-page--campaign .campaign-sidebar__campaign small{color:var(--cin-muted)}
      .aeriom-page--campaign .campaign-nav-item,.aeriom-page--campaign .campaign-mobile-nav-item{color:var(--cin-muted);border-color:transparent}
      .aeriom-page--campaign .campaign-nav-item.is-active,.aeriom-page--campaign .campaign-mobile-nav-item.is-active{color:var(--cin-accent-2)!important;background:color-mix(in srgb,var(--cin-accent) 12%,transparent)!important;border-color:var(--cin-border)!important}
      .aeriom-page--campaign button:not(.aeriom-cinematic-particle),.aeriom-page--campaign select,.aeriom-page--campaign input:not([type="checkbox"]):not([type="radio"]){accent-color:var(--cin-accent);border-color:var(--cin-border);color:var(--cin-text)}
      .aeriom-page--campaign input,.aeriom-page--campaign select,.aeriom-page--campaign textarea{background:color-mix(in srgb,var(--cin-surface-2) 92%,transparent)!important}
      .aeriom-page--campaign ::selection{background:color-mix(in srgb,var(--cin-accent) 34%,transparent);color:#fff}

      .aeriom-cinematic-v2{position:fixed;inset:0;z-index:95;pointer-events:none;overflow:hidden;opacity:1;transition:opacity .8s ease}
      .aeriom-cinematic-v2.is-disabled{opacity:0}
      .aeriom-cinematic-v2__wash{position:absolute;inset:0;background:linear-gradient(180deg,color-mix(in srgb,var(--cin-accent) calc(8% * var(--cin-intensity)),transparent),transparent 48%,color-mix(in srgb,var(--cin-bg) calc(20% * var(--cin-intensity)),transparent));mix-blend-mode:screen}
      .aeriom-cinematic-v2__vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 36%,rgba(0,0,0,.74) 120%);opacity:var(--cin-vignette);}
      .aeriom-cinematic-v2__grain{position:absolute;inset:-50%;opacity:calc(.012 * var(--cin-grain));background:repeating-radial-gradient(circle at 20% 30%,rgba(255,255,255,.16) 0 1px,transparent 1px 3px);mix-blend-mode:soft-light;animation:cinGrain 1s steps(2) infinite}
      @keyframes cinGrain{0%{transform:translate(0,0)}25%{transform:translate(2%,-1%)}50%{transform:translate(-1%,2%)}75%{transform:translate(1%,1%)}100%{transform:translate(-2%,-1%)}}
      .aeriom-cinematic-v2__particles{position:absolute;inset:0;overflow:hidden}
      .aeriom-cinematic-v2__particle{position:absolute;left:var(--x);top:var(--y);width:var(--size);height:var(--height,var(--size));opacity:var(--op);border-radius:var(--radius,50%);background:var(--pcolor);box-shadow:0 0 var(--glow) var(--pcolor);animation:cinParticle var(--duration) var(--delay) linear infinite}
      @keyframes cinParticle{0%{transform:translate3d(0,18vh,0) rotate(0deg);opacity:0}10%{opacity:var(--op)}55%{opacity:var(--op)}92%{opacity:0}100%{transform:translate3d(var(--drift),-125vh,0) rotate(360deg);opacity:0}}

      html[data-aeriom-cinematic-theme="forest"] .aeriom-cinematic-v2__wash{background:radial-gradient(circle at 20% 85%,rgba(90,145,74,.18),transparent 32%),radial-gradient(circle at 86% 16%,rgba(129,169,101,.13),transparent 34%)}
      html[data-aeriom-cinematic-theme="forest"] .campaign-panel,html[data-aeriom-cinematic-theme="forest"] .campaign-card{box-shadow:0 18px 48px rgba(11,49,18,.24)!important}
      html[data-aeriom-cinematic-theme="forest"] .aeriom-cinematic-v2__wash:after{content:"";position:absolute;inset:auto 0 0;height:25vh;background:linear-gradient(180deg,transparent,rgba(47,87,35,.12))}

      html[data-aeriom-cinematic-theme="cave"] .aeriom-cinematic-v2__wash{background:radial-gradient(circle at 50% 42%,rgba(102,137,173,.12),transparent 34%),radial-gradient(circle at 18% 65%,rgba(193,158,103,.08),transparent 22%)}
      html[data-aeriom-cinematic-theme="cave"] .aeriom-cinematic-v2__vignette{opacity:calc(var(--cin-vignette) + .18)}

      html[data-aeriom-cinematic-theme="volcano"] .aeriom-cinematic-v2__wash{background:radial-gradient(ellipse at 52% 94%,rgba(255,74,7,.25),transparent 34%),radial-gradient(circle at 85% 15%,rgba(224,76,27,.12),transparent 25%)}
      .aeriom-volcano-glow{position:absolute;left:50%;bottom:-18vh;width:min(72vw,760px);height:34vh;transform:translateX(-50%);border-radius:50% 50% 0 0;background:radial-gradient(ellipse at center,rgba(255,105,35,.35),rgba(172,32,5,.16) 44%,transparent 72%);filter:blur(16px);animation:volcanoPulse 5.5s ease-in-out infinite alternate}
      .aeriom-volcano-fissure{position:absolute;left:50%;bottom:-2px;width:min(38vw,420px);height:8vh;transform:translateX(-50%) skewX(-18deg);border-radius:50% 50% 0 0;background:linear-gradient(180deg,rgba(255,232,116,.76),rgba(242,90,16,.65) 28%,rgba(87,9,2,.92) 72%);box-shadow:0 -2px 35px rgba(255,70,12,.32);filter:blur(.3px)}
      .aeriom-volcano-fissure:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(167deg,transparent 0 26px,rgba(255,215,92,.22) 27px 31px,transparent 32px 54px);animation:lavaFlow 5s linear infinite}
      @keyframes lavaFlow{to{background-position:120px 0}} @keyframes volcanoPulse{from{opacity:.45;transform:translateX(-50%) scale(.94)}to{opacity:.85;transform:translateX(-50%) scale(1.08)}}
      html[data-aeriom-cinematic-theme="volcano"] .aeriom-cinematic-v2__particle{box-shadow:0 0 9px rgba(255,74,18,.66);border-radius:42%}

      html[data-aeriom-cinematic-theme="castle"] .aeriom-cinematic-v2__wash{background:radial-gradient(circle at 50% 4%,rgba(255,224,161,.16),transparent 26%),radial-gradient(circle at 20% 30%,rgba(98,124,177,.06),transparent 28%)}
      .aeriom-castle-moon{position:absolute;right:12%;top:8%;width:18vw;height:18vw;border-radius:50%;background:radial-gradient(circle,rgba(255,241,202,.20),rgba(191,205,224,.06) 48%,transparent 70%);filter:blur(2px);animation:moonBreath 7s ease-in-out infinite alternate}
      @keyframes moonBreath{from{opacity:.3;transform:scale(.95)}to{opacity:.75;transform:scale(1.05)}}

      html[data-aeriom-cinematic-theme="coast"] .aeriom-cinematic-v2__wash{background:linear-gradient(180deg,rgba(94,180,208,.07),transparent 48%,rgba(36,119,153,.10))}
      .aeriom-coast-mist-v2{position:absolute;left:-12%;right:-12%;bottom:4%;height:35%;background:linear-gradient(180deg,transparent,rgba(161,211,221,.12),transparent);filter:blur(14px);animation:mistMove 14s ease-in-out infinite alternate}
      .aeriom-coast-horizon{position:absolute;left:-8%;right:-8%;bottom:17%;height:9%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(115,198,220,.20),transparent 66%);filter:blur(7px);animation:horizonPulse 6s ease-in-out infinite alternate}
      @keyframes mistMove{from{transform:translateX(-3%)}to{transform:translateX(3%)}} @keyframes horizonPulse{from{opacity:.35}to{opacity:.9}}

      html[data-aeriom-cinematic-theme="ruins"] .aeriom-cinematic-v2__wash{background:radial-gradient(circle at 26% 26%,rgba(179,150,94,.10),transparent 25%),linear-gradient(180deg,transparent 56%,rgba(103,73,38,.10))}
      .aeriom-ruins-dust{position:absolute;left:12%;top:32%;width:76%;height:42%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(201,182,143,.055),transparent 70%);filter:blur(14px);animation:dustPulse 9s ease-in-out infinite alternate}
      @keyframes dustPulse{from{opacity:.3;transform:scale(.96)}to{opacity:.75;transform:scale(1.06)}}

      .aeriom-theme-symbol{color:var(--cin-accent-2)!important;text-shadow:0 0 14px var(--cin-glow)}
      html[data-aeriom-cinematic-theme="forest"] .aeriom-theme-symbol::before{content:"❧"}
      html[data-aeriom-cinematic-theme="cave"] .aeriom-theme-symbol::before{content:"◈"}
      html[data-aeriom-cinematic-theme="volcano"] .aeriom-theme-symbol::before{content:"✹"}
      html[data-aeriom-cinematic-theme="castle"] .aeriom-theme-symbol::before{content:"♜"}
      html[data-aeriom-cinematic-theme="coast"] .aeriom-theme-symbol::before{content:"≈"}
      html[data-aeriom-cinematic-theme="ruins"] .aeriom-theme-symbol::before{content:"𓂀"}

      html[data-aeriom-cinematic-scene="standard"] .aeriom-cinematic-v2{opacity:.72}
      html[data-aeriom-cinematic-scene="cinematic"] .aeriom-cinematic-v2{opacity:1}
      html[data-aeriom-cinematic-light="cold"] .aeriom-cinematic-v2__wash{filter:hue-rotate(10deg) saturate(.9)}
      html[data-aeriom-cinematic-light="warm"] .aeriom-cinematic-v2__wash{filter:saturate(1.12)}
      html[data-aeriom-cinematic-light="dramatic"] .aeriom-cinematic-v2__vignette{opacity:calc(var(--cin-vignette) + .16)}
      html[data-aeriom-cinematic-light="dim"] .aeriom-cinematic-v2__wash{opacity:.64}
      html[data-aeriom-cinematic-animate="0"] .aeriom-cinematic-v2 *{animation:none!important}
      html[data-aeriom-cinematic-particles="0"] .aeriom-cinematic-v2__particles{display:none}
      @media(prefers-reduced-motion:reduce){.aeriom-cinematic-v2 *{animation:none!important}.aeriom-cinematic-v2{transition:none!important}}
      @media(max-width:700px){.aeriom-volcano-fissure{width:54vw}.aeriom-castle-moon{width:28vw;height:28vw}}
    `;
    document.head.appendChild(style);
  }

  function ensureLayer(){
    if(state.layer?.isConnected) return state.layer;
    state.layer=document.createElement("div"); state.layer.id="aeriom-cinematic-v2"; state.layer.className="aeriom-cinematic-v2"; state.layer.setAttribute("aria-hidden","true");
    state.layer.innerHTML='<div class="aeriom-cinematic-v2__wash"></div><div class="aeriom-cinematic-v2__particles"></div><div class="aeriom-cinematic-v2__vignette"></div><div class="aeriom-cinematic-v2__grain"></div><div class="aeriom-cinematic-v2__special"></div>';
    document.body.appendChild(state.layer);
    state.particles=state.layer.querySelector(".aeriom-cinematic-v2__particles"); state.special=state.layer.querySelector(".aeriom-cinematic-v2__special");
    return state.layer;
  }

  const rand=(a,b)=>Math.random()*(b-a)+a;

  function setThemeRoot(theme){
    const meta=THEMES[theme]||THEMES.default, root=document.documentElement;
    state.theme=THEMES[theme]?theme:"default";
    root.dataset.aeriomCinematic="1"; root.dataset.aeriomCinematicTheme=state.theme;
    root.style.setProperty("--cin-page-image",`url("${meta.image.replaceAll('"','\\"')}")`);
    root.style.setProperty("--cin-bg",meta.bg); root.style.setProperty("--cin-surface",meta.surface); root.style.setProperty("--cin-surface-2",meta.surface2); root.style.setProperty("--cin-surface-3",meta.surface3);
    root.style.setProperty("--cin-accent",meta.accent); root.style.setProperty("--cin-accent-2",meta.accent2); root.style.setProperty("--cin-border",meta.border); root.style.setProperty("--cin-glow",meta.glow); root.style.setProperty("--cin-text",meta.text); root.style.setProperty("--cin-muted",meta.muted);
    root.style.setProperty("--campaign-bg",meta.bg); root.style.setProperty("--campaign-surface",meta.surface); root.style.setProperty("--campaign-surface-2",meta.surface2); root.style.setProperty("--campaign-surface-3",meta.surface3); root.style.setProperty("--campaign-gold",state.settings.accent_color||meta.accent); root.style.setProperty("--campaign-gold-soft",`color-mix(in srgb, ${state.settings.accent_color||meta.accent} 16%, transparent)`); root.style.setProperty("--campaign-danger",meta.danger); root.style.setProperty("--campaign-success",meta.success);
  }

  function applySettings(next={}){
    state.settings={...state.settings,...next}; const r=document.documentElement;
    r.style.setProperty("--cin-panel-opacity",`${Math.max(45,Math.min(100,Number(state.settings.surface_opacity??86)))}%`);
    r.style.setProperty("--cin-vignette",String(Math.max(0,Math.min(100,Number(state.settings.vignette??42)))/100));
    r.style.setProperty("--cin-grain",String(Math.max(0,Math.min(60,Number(state.settings.grain??0))));
    r.style.setProperty("--cin-glow-opacity",String(Math.max(0,Math.min(60,Number(state.settings.glow??18)))/100));
    r.style.setProperty("--cin-intensity",String(Math.max(0,Math.min(100,Number(state.settings.intensity??55)))/100));
    r.style.setProperty("--cin-speed",String(Math.max(.25,Math.min(2.5,Number(state.settings.animation_speed??.62))));
    r.dataset.aeriomCinematicAnimate=state.settings.animations_enabled===false?"0":"1";
    r.dataset.aeriomCinematicParticles=state.settings.particles_enabled===false?"0":"1";
    r.dataset.aeriomCinematicScene=state.settings.scene_mode||"immersive";
    r.dataset.aeriomCinematicLight=state.settings.lighting||"balanced";
  }

  function particleCount(theme){
    const density=Math.max(0,Math.min(60,Number(state.settings.particle_density??12)));
    const base={default:5,forest:4,cave:4,volcano:5,castle:3,coast:3,ruins:4}[theme]||4;
    return Math.round(base + density*.72);
  }

  function particleFor(theme,i,total){
    const colors={
      default:"rgba(236,219,178,.40)", forest:"rgba(198,224,138,.46)", cave:"rgba(194,184,165,.26)", volcano:"rgba(255,103,32,.80)", castle:"rgba(232,220,184,.28)", coast:"rgba(178,226,237,.28)", ruins:"rgba(216,190,145,.31)"
    };
    const slow=Math.max(.25,Math.min(2.5,Number(state.settings.animation_speed??.62)));
    const baseDuration={forest:22,cave:20,volcano:13,coast:26,default:24,castle:30,ruins:28}[theme]||24;
    const duration=(baseDuration/slow)*rand(.78,1.22);
    const p=document.createElement("span"); p.className="aeriom-cinematic-v2__particle";
    const isVolcano=theme==="volcano", isForest=theme==="forest";
    p.style.cssText=`--x:${rand(0,100).toFixed(2)}vw;--y:${rand(-8,100).toFixed(2)}vh;--size:${(isVolcano?rand(2,4):isForest?rand(3,7):rand(2,4)).toFixed(2)}px;--height:${(isVolcano?rand(3,7):isForest?rand(4,9):rand(2,5)).toFixed(2)}px;--drift:${rand(-14,14).toFixed(2)}vw;--duration:${duration.toFixed(2)}s;--delay:${(-rand(0,duration)).toFixed(2)}s;--op:${rand(.17,.50).toFixed(2)};--pcolor:${colors[theme]||colors.default};--glow:${isVolcano?8:4}px;--radius:${isForest?"30% 70% 45% 55%":"50%"}`;
    return p;
  }

  function rebuildParticles(){
    if(!state.particles) return;
    const count=particleCount(state.theme), frag=document.createDocumentFragment();
    for(let i=0;i<count;i++) frag.appendChild(particleFor(state.theme,i,count));
    state.particles.replaceChildren(frag);
  }

  function specialEffects(theme){
    if(!state.special) return; state.special.replaceChildren();
    if(state.settings.animations_enabled===false) return;
    const s=state.special;
    if(theme==="forest"){
      for(let i=0;i<2;i++){const bird=document.createElement("i"); bird.className="aeriom-forest-bird"; bird.style.cssText=`position:absolute;left:${rand(-15,10)}vw;top:${rand(10,32)}vh;width:28px;height:12px;opacity:.72;animation:cinBird ${(32/state.settings.animation_speed).toFixed(1)}s linear ${(-rand(0,28)).toFixed(1)}s infinite;filter:drop-shadow(0 2px 5px rgba(0,0,0,.4))`; bird.innerHTML='<span style="position:absolute;left:0;top:5px;width:13px;height:6px;border-top:2px solid rgba(24,31,19,.72);border-radius:80% 80% 0 0;transform:rotate(12deg)"></span><span style="position:absolute;right:0;top:5px;width:13px;height:6px;border-top:2px solid rgba(24,31,19,.72);border-radius:80% 80% 0 0;transform:rotate(-12deg)"></span>'; s.appendChild(bird); }
      for(let i=0;i<6;i++){const leaf=document.createElement("i"); leaf.style.cssText=`position:absolute;left:${rand(0,100)}vw;top:-5vh;width:${rand(6,10)}px;height:${rand(9,15)}px;border-radius:80% 0 80% 0;background:linear-gradient(135deg,#8fa963,#43552f);opacity:.5;animation:cinLeaf ${(25/state.settings.animation_speed).toFixed(1)}s linear ${(-rand(0,24)).toFixed(1)}s infinite;--drift:${rand(-20,20)}vw`; leaf.className="aeriom-forest-leaf-v2"; s.appendChild(leaf); }
      injectForestKeyframes();
    }
    if(theme==="volcano"){
      const glow=document.createElement("div"); glow.className="aeriom-volcano-glow"; s.appendChild(glow);
      const fissure=document.createElement("div"); fissure.className="aeriom-volcano-fissure"; s.appendChild(fissure);
    }
    if(theme==="castle"){const moon=document.createElement("div"); moon.className="aeriom-castle-moon"; s.appendChild(moon);}
    if(theme==="coast"){const mist=document.createElement("div"); mist.className="aeriom-coast-mist-v2"; const h=document.createElement("div"); h.className="aeriom-coast-horizon"; s.append(mist,h);}
    if(theme==="ruins"){const dust=document.createElement("div"); dust.className="aeriom-ruins-dust"; s.appendChild(dust);}
  }

  function injectForestKeyframes(){
    if(document.getElementById("aeriom-forest-v2-keyframes")) return;
    const st=document.createElement("style"); st.id="aeriom-forest-v2-keyframes"; st.textContent='@keyframes cinBird{0%{transform:translateX(0) translateY(8px) scale(.72);opacity:0}12%{opacity:.7}55%{opacity:.6}100%{transform:translateX(125vw) translateY(-22px) scale(1);opacity:0}}@keyframes cinLeaf{0%{transform:translate3d(0,0,0) rotate(20deg)}34%{transform:translate3d(var(--drift),34vh,0) rotate(140deg)}70%{transform:translate3d(calc(var(--drift)*-.4),70vh,0) rotate(240deg)}100%{transform:translate3d(var(--drift),112vh,0) rotate(330deg);opacity:0}}'; document.head.appendChild(st);
  }

  function decorateIcons(){
    const targets=document.querySelectorAll("[data-theme-icon],.campaign-panel__icon,.campaign-section__icon,.campaign-nav__icon,.aeriom-theme-symbol");
    targets.forEach(el=>{ if(!el.classList.contains("aeriom-theme-symbol")) el.classList.add("aeriom-theme-symbol"); });
  }

  function apply(detail={}){
    installStyle(); ensureLayer();
    const settings={...(detail.settings||{})};
    if(detail.theme||detail.preset||detail.themeId) settings.preset=detail.theme||detail.preset||detail.themeId;
    applySettings(settings);
    const theme=String(settings.preset||document.documentElement.dataset.theme||state.theme||"default").toLowerCase();
    setThemeRoot(THEMES[theme]?theme:"default");
    if(settings.accent_color) document.documentElement.style.setProperty("--campaign-gold",settings.accent_color);
    if(state.settings.background_source!=="custom"){
      const src=state.settings.background_source||"theme";
      let image=null;
      if(src==="campaign") image=ctx()?.campaign?.backgroundUrl||ctx()?.campaign?.cover_url||THEMES[state.theme].image;
      else image=THEMES[state.theme].image;
      document.documentElement.style.setProperty("--cin-page-image",`url("${String(image).replaceAll('"','\\"')}")`);
      delete document.documentElement.dataset.atmosphereCustomBackground;
    }
    rebuildParticles(); specialEffects(state.theme); decorateIcons();
    state.layer.classList.toggle("is-disabled",state.settings.animations_enabled===false);
  }

  window.addEventListener("aeriom:atmospherechange",e=>apply(e.detail||{}));
  window.addEventListener("aeriom:themechange",e=>apply({theme:e.detail?.themeId,settings:e.detail||{}}));
  window.addEventListener("aeriom:campaigntheme",e=>apply({theme:e.detail?.theme,settings:e.detail||{}}));
  window.addEventListener("aeriom:campaign:ready",()=>setTimeout(()=>apply(),250));
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>apply(),350),{once:true}); else setTimeout(()=>apply(),350);
})();
