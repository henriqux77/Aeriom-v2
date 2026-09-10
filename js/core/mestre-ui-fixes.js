import "./mesa-experience.js";

(() => {
  "use strict";
  const cleanDuplicateContentCards=()=>{
    const nodes=[...document.querySelectorAll('#campaign-panel-master-controls #aeriom-master-content')];
    if(nodes.length<2)return;
    nodes.slice(1).forEach(node=>{
      const section=node.closest('.aeriom-master-card');
      if(section) section.remove(); else node.remove();
    });
  };
  const keepPlayerActionsMasterOnly=()=>{
    const role=String(window.AERIOM_CAMPAIGN?.getContext?.()?.membership?.role||"").toLowerCase();
    const actions=document.querySelector('.campaign-table-hud__actions');
    if(actions)actions.style.display=role==='master'?'flex':'none';
  };
  const run=()=>{cleanDuplicateContentCards();keepPlayerActionsMasterOnly();};
  window.addEventListener('aeriom:campaign:ready',()=>setTimeout(run,180));
  window.addEventListener('aeriom:campaigntabchange',()=>setTimeout(run,180));
  if(document.readyState!=='loading')setTimeout(run,500);else document.addEventListener('DOMContentLoaded',()=>setTimeout(run,500),{once:true});
})();
