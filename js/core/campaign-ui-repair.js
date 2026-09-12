(() => {
  "use strict";
  function loadStyles(){if(document.getElementById("aeriom-campaign-repair-css"))return;const link=document.createElement("link");link.id="aeriom-campaign-repair-css";link.rel="stylesheet";link.href="./css/campaign-repair.css?v=20260911-clean5";document.head.appendChild(link);}
  function markCampaignShell(){document.documentElement.classList.add("aeriom-campaign-shell");}
  function cleanupEscapedText(){const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),remove=[];while(w.nextNode()){if(w.currentNode.nodeValue?.trim()==="\\n")remove.push(w.currentNode);}remove.forEach(n=>n.remove());}
  function loadAtmosphere(){if(window.__AERIOM_ATMOSPHERE_BOOT__)return;window.__AERIOM_ATMOSPHERE_BOOT__=true;Promise.allSettled([
    import("./atmosphere-ui.js?v=20260911-atmosphere7"),
    import("./campaign-theme-runtime-clean.js?v=20260911-runtime3"),
    import("./campaign-theme-guard.js?v=20260911-guard3"),
    import("./campaign-atmosphere-fix.js?v=20260911-fix2"),
    import("./campaign-cinematic-clean.js?v=20260911-clean3"),
    import("./campaign-cover-fix.js?v=20260911-cover1")
  ]).then(results=>results.filter(r=>r.status==="rejected").forEach(r=>console.error("[AERIOM][ATMOSPHERE BOOT]",r.reason)))}
  function start(){loadStyles();markCampaignShell();cleanupEscapedText();loadAtmosphere();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
