(() => {
  "use strict";
  if (window.__AERIOM_CAMPAIGN_FEATURE_LOADER__) return;
  window.__AERIOM_CAMPAIGN_FEATURE_LOADER__ = true;
  const loaded = new Map(); const importing = new Map();
  const modules = {
    master:["./mestre-dashboard-redesign.js?v=20260912-master4","./mestre-dashboard-redesign-patch.js?v=20260912-master3","./mestre-dashboard-final-patch.js?v=20260912-final5","./mestre-dashboard-final-cleanup.js?v=20260912-cleanup2","./campaign-live-media.js?v=20260912-live7","./campaign-live-media-upload.js?v=20260912-live-upload3","./mestre-ficha-mana.js?v=20260912-ficha-mana1","./mestre-ficha-mana-fallback.js?v=20260912-ficha-mana-fallback1","./campaign-layout-stabilizer.js?v=20260912-layout2"],
    theme:["./atmosphere-ui.js?v=20260912-atmosphere-lazy2","./campaign-theme-runtime-clean.js?v=20260912-theme-runtime1","./campaign-cinematic-clean.js?v=20260912-cinematic-lazy1","./campaign-layout-stabilizer.js?v=20260912-layout2","./campaign-atmosphere-runtime.js?v=20260912-atmosphere-runtime1","./campaign-atmosphere-runtime-patch.js?v=20260912-atmosphere-runtime-patch1","./campaign-liquid-navigation.js?v=20260912-liquid1"]
  };
  async function loadGroup(group){if(loaded.get(group))return true;if(importing.has(group))return importing.get(group);const list=modules[group];if(!list)return false;const task=Promise.allSettled(list.map(spec=>import(spec))).then(results=>{const failed=results.filter(r=>r.status==="rejected");failed.forEach(r=>console.error("[AERIOM][FEATURE LOAD]",r.reason));if(!failed.length)loaded.set(group,true);return !failed.length}).finally(()=>importing.delete(group));importing.set(group,task);return task;}
  function currentTab(){return document.documentElement.dataset.campaignTab||document.querySelector("[data-campaign-tab].is-active")?.dataset.campaignTab||"overview";}
  function onTabChange(e){const tab=e.detail?.tab||currentTab();if(tab==="master-controls")void loadGroup("master");else if(tab==="theme")void loadGroup("theme");}
  window.addEventListener("aeriom:campaigntabchange",onTabChange);window.addEventListener("aeriom:campaign:ready",()=>{const tab=currentTab();if(tab==="master-controls")void loadGroup("master");else if(tab==="theme")void loadGroup("theme");});
  const boot=()=>{const tab=currentTab();if(tab==="master-controls")void loadGroup("master");else if(tab==="theme")void loadGroup("theme");};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.AERIOM_FEATURES=Object.freeze({loadMaster:()=>loadGroup("master"),loadTheme:()=>loadGroup("theme")});
})();
