import { getAvailableThemes, applyCampaignTheme } from "./theme.js";
import "./mesa-experience-guard.js";
(() => {
  "use strict";
  const caveBg=new URL("../../assets/themes/cave/background.webp", import.meta.url).href;
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
    if(String(c?.membership?.role||"").toLowerCase()!=="master")return;
    try{const r=await c.supabase.from("campaigns").update({theme:id}).eq("id",c.campaignId);if(r.error)throw r.error;if(c.campaign)c.campaign.theme=id;applyCampaignTheme(id,id==="cave"?caveBg:null);render();}catch(e){console.error("[AERION][THEME]",e)}
  }
  async function sync(){render();const theme=String(ctx()?.campaign?.theme||document.documentElement.dataset.theme||"default");await applyCampaignTheme(theme,null);}
  window.addEventListener("aeriom:campaign:ready",()=>setTimeout(sync,30));
  window.addEventListener("aeriom:campaigntheme",async e=>{await applyCampaignTheme(e.detail?.theme||"default",null);render()});
  window.addEventListener("aeriom:campaigntabchange",e=>{if(e.detail?.tab==="theme")setTimeout(sync,30)});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{void sync()},{once:true});else void sync();
})();