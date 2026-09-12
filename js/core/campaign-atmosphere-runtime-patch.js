/* AERIOM — calibração dos ajustes da atmosfera. */
(() => {
  "use strict";
  if (window.__AERIOM_ATMOSPHERE_RUNTIME_PATCH__) return;
  window.__AERIOM_ATMOSPHERE_RUNTIME_PATCH__ = true;
  const root=()=>document.documentElement;
  const val=(sel,fallback)=>Number(document.querySelector(sel)?.value??fallback);
  const bool=(sel)=>!!document.querySelector(sel)?.checked;
  function apply(){
    const r=root(),fx=document.getElementById("aeriom-atmosphere-fx");if(!fx)return;
    const animations=bool('[data-cin-toggle="animations_enabled"]'),particles=bool('[data-cin-toggle="particles_enabled"]');
    const density=val('[data-atm-range="particle_density"]',12),speed=val('[data-atm-range="animation_speed"]',62),grain=val('[data-atm-range="grain"]',0),glow=val('[data-atm-range="glow"]',20),blur=val('[data-atm-range="blur"]',0),intensity=val('[data-atm-range="intensity"]',55)/100;
    fx.style.setProperty("--fx-grain",`${grain/100}`);fx.style.setProperty("--fx-glow",`${(glow/60)*intensity}`);
    fx.style.setProperty("--fx-animation-scale",animations?Math.max(.25,62/Math.max(25,speed)):0);
    fx.style.setProperty("--fx-blur",`${blur}px`);
    fx.querySelector(".fx-front")?.style.setProperty("opacity",particles?"1":"0");
    fx.querySelector(".fx-back")?.style.setProperty("filter",`blur(${blur}px)`);
    fx.style.backgroundImage=grain>0?`repeating-radial-gradient(circle at 20% 30%,rgba(255,255,255,${grain/700}) 0 1px,transparent 1px 4px)`:"none";
    fx.style.opacity=String(.82+(glow/60)*.18);
    r.style.setProperty("--campaign-atmosphere-grain",String(grain/100));
    r.style.setProperty("--campaign-atmosphere-glow-strength",String((glow/60)*intensity));
    const scene=document.querySelector('[data-atm-select="scene_mode"]')?.value||"immersive";
    r.dataset.atmosphereScene=scene;
  }
  function bind(){
    document.addEventListener("input",e=>{if(e.target.closest("[data-atm-range]"))apply()});
    document.addEventListener("change",e=>{if(e.target.closest("[data-cin-toggle],[data-atm-select]"))setTimeout(apply,0)});
    window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="theme")setTimeout(apply,180)});
    window.addEventListener("aeriom:campaign:ready",()=>setTimeout(apply,700));
  }
  bind();setTimeout(apply,1100);
})();
