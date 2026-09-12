(() => {
  "use strict";
  let timer=0;
  function repair(){const host=document.getElementById("campaign-theme-selector");if(!host)return;if(!host.querySelector(".aeriom-atmosphere")){clearTimeout(timer);timer=setTimeout(()=>window.dispatchEvent(new CustomEvent("aeriom:campaigntabchange",{detail:{tab:"theme"}})),40);}}
  function start(){const host=document.getElementById("campaign-theme-selector");if(!host)return;const observer=new MutationObserver(repair);observer.observe(host,{childList:true,subtree:false});repair();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(start,500),{once:true});else setTimeout(start,500);
})();
