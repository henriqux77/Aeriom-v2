(() => {
  "use strict";

  const IMAGES = Object.freeze({
    default:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=82",
    forest:"https://backiee.com/static/wallpapers/1000x563/392020.jpg",
    cave:new URL("../../assets/themes/cave/background.webp", import.meta.url).href,
    volcano:"https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=82",
    castle:"https://static.wixstatic.com/media/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg/v1/fill/w_1600,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg",
    coast:"https://wallpapercrafter.com/desktop/98690-fantasy-art-sea-ship-storm-lightning-video-games-cyan.jpg",
    ruins:"https://uploads.worldanvil.com/uploads/images/3ea699821c678eb3956df7a9cea2985b.jpg"
  });

  const FALLBACKS = Object.freeze({
    default:"linear-gradient(135deg,#211a12,#090807 62%,#352717)",
    forest:"linear-gradient(135deg,#17281b,#07100a 58%,#314528)",
    cave:"linear-gradient(135deg,#1f2a35,#07090d 58%,#4d3c2a)",
    volcano:"linear-gradient(135deg,#321208,#120504 48%,#b33b0b)",
    castle:"linear-gradient(135deg,#283044,#090b10 58%,#6d5736)",
    coast:"linear-gradient(135deg,#1e596b,#061016 58%,#173b52)",
    ruins:"linear-gradient(135deg,#51432b,#0b0a08 58%,#8a7045)"
  });

  function paint(){
    const root=document.getElementById("campaign-theme-selector");
    if(!root) return;
    root.querySelectorAll("[data-atm-theme]").forEach(card=>{
      const id=card.dataset.atmTheme || "default";
      const preview=card.querySelector(".aeriom-atmosphere__theme-preview");
      if(!preview || !IMAGES[id]) return;
      preview.style.backgroundColor="#10100f";
      preview.style.backgroundImage=`${FALLBACKS[id]},url(\"${IMAGES[id].replaceAll('"','\\"')}\")`;
      preview.style.backgroundSize="cover";
      preview.style.backgroundPosition="center";
      preview.dataset.themePreview=id;
    });
  }

  function start(){ setTimeout(paint,40); setTimeout(paint,300); }
  window.addEventListener("aeriom:campaign:ready",start);
  window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="theme") start();});
  window.addEventListener("aeriom:atmospherechange",start);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true}); else start();
})();
