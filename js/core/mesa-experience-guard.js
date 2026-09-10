import "./mesa-experience.js";
(() => {
  "use strict";
  const ctx=()=>window.AERIOM_CAMPAIGN?.getContext?.()||{};
  const master=()=>String(ctx()?.membership?.role||"").toLowerCase()==="master";
  const apply=()=>{
    if(master())return;
    document.querySelectorAll("#campaign-theme-selector button").forEach(b=>{b.disabled=true;b.setAttribute("aria-disabled","true");b.title="Somente o Mestre pode alterar a atmosfera da mesa.";});
    document.querySelectorAll("[data-campaign-tab=master-controls]").forEach(el=>el.hidden=true);
  };
  window.addEventListener("aeriom:campaign:ready",()=>setTimeout(apply,120));
  window.addEventListener("aeriom:campaigntabchange",()=>setTimeout(apply,120));
  if(document.readyState!=="loading")setTimeout(apply,400);else document.addEventListener("DOMContentLoaded",()=>setTimeout(apply,400),{once:true});
})();
