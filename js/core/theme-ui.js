import { getAvailableThemes, applyCampaignTheme } from "./theme.js";
(() => {
  "use strict";
  const caveBg="https://i.ibb.co/ch7J9bmn/file-00000000d334820eabb913a2eaccee9b.png";
  const $=id=>document.getElementById(id);
  const ctx=()=>window.AERIOM_CAMPAIGN?.getContext?.()||{};
  function render(){
    const root=$("campaign-theme-selector");if(!root)return;
    const current=String(ctx()?.campaign?.theme||document.documentElement.dataset.theme||"default");
    root.replaceChildren();
    getAvailableThemes().forEach(theme=>{
      const b=document.createElement("button");b.type="button";b.className="campaign-theme-option"+(theme.id===current?" is-active":"");b.dataset.themeId=theme.id;
      const p=document.createElement("div");p.className="campaign-theme-option__preview";if(theme.id==="cave")p.style.backgroundImage="url("+caveBg+")";
      const copy=document.createElement("div");const strong=document.createElement("strong");strong.textContent=theme.name;const span=document.createElement("span");span.textContent=theme.description;copy.append(strong,span);b.append(p,copy);b.onclick=()=>select(theme.id);root.appendChild(b);
    });
  }
  async function select(id){
    const c=ctx();if(!c?.supabase||!c.campaignId)return;
    try{const r=await c.supabase.from("campaigns").update({theme:id}).eq("id",c.campaignId);if(r.error)throw r.error;if(c.campaign)c.campaign.theme=id;applyCampaignTheme(id,id==="cave"?caveBg:null);render();}catch(e){console.error("[AERION][THEME]",e)}
  }
  function sync(){render();const theme=String(ctx()?.campaign?.theme||document.documentElement.dataset.theme||"default");applyCampaignTheme(theme,theme==="cave"?caveBg:null);}
  window.addEventListener("aeriom:campaign:ready",()=>setTimeout(sync,30));
  window.addEventListener("aeriom:campaigntheme",e=>{applyCampaignTheme(e.detail?.theme||"default",e.detail?.theme==="cave"?caveBg:null);render()});
  window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="theme")setTimeout(sync,30)});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",sync,{once:true});else sync();
})();