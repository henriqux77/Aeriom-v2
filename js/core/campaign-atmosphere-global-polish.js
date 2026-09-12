/* AERIOM — aplica os ajustes de Interface/Direção Visual de forma global. */
(() => {
  "use strict";
  if (window.__AERIOM_ATMOSPHERE_GLOBAL_POLISH__) return;
  window.__AERIOM_ATMOSPHERE_GLOBAL_POLISH__ = true;

  function apply(){
    const r=document.documentElement;
    const color=document.querySelector('[data-atm-color="accent_color"]')?.value;
    const density=document.querySelector('[data-atm-select="ui_density"]')?.value||"comfortable";
    if(color){
      r.style.setProperty("--campaign-gold",color);
      r.style.setProperty("--campaign-accent-secondary",color);
      r.style.setProperty("--theme-accent",color);
    }
    r.dataset.atmosphereDensity=density;
    document.body?.style.setProperty("--aeriom-density",density);
  }
  function bind(){
    document.addEventListener("input",e=>{if(e.target.matches?.('[data-atm-color], [data-atm-range]'))apply();});
    document.addEventListener("change",e=>{if(e.target.matches?.('[data-atm-select], [data-cin-toggle]'))setTimeout(apply,0);});
    window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="theme")setTimeout(apply,180);});
    window.addEventListener("aeriom:campaign:ready",()=>setTimeout(apply,800));
  }
  const s=document.createElement("style");
  s.id="aeriom-atmosphere-global-polish-style";
  s.textContent=`
    html[data-atmosphere-density="compact"] .campaign-content{padding:20px!important}html[data-atmosphere-density="compact"] .campaign-card,.campaign-panel{gap:10px}
    html[data-atmosphere-density="comfortable"] .campaign-content{padding:30px!important}html[data-atmosphere-density="comfortable"] .campaign-card,.campaign-panel{gap:14px}
    html[data-atmosphere-density="spacious"] .campaign-content{padding:42px!important}html[data-atmosphere-density="spacious"] .campaign-card,.campaign-panel{gap:20px}
    html[data-atmosphere-density="spacious"] .campaign-nav-item{letter-spacing:.01em}
  `;
  document.head.appendChild(s); bind(); setTimeout(apply,1200);
})();
