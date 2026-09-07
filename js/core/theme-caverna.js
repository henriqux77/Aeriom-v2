import { getSupabase } from "./supabase.js";
(() => {
"use strict";
const THEMES=[
["default","AERIOM","Tema padrão da mesa."],
["forest","Floresta","Uma atmosfera antiga e selvagem."],
["cave","Caverna","Pedra, sombras e profundezas."],
["volcano","Vulcão","Calor, cinzas e perigo."],
["castle","Castelo","Pedra antiga, nobreza e mistério."],
["coast","Costa","Mar, vento e horizontes distantes."],
["ruins","Ruínas","Vestígios de uma civilização esquecida."]
];
const CAVE_BG="https://i.ibb.co/ch7J9bmn/file-00000000d334820eabb913a2eaccee9b.png";
const CAVE_TOP="https://i.ibb.co/N2vCMQB5/file-00000000e5a8820e95d23516d122ff4f.png";
const CAVE_BOTTOM="https://i.ibb.co/MDgyr3N1/file-000000004614820e8063f423e89cea85.png";
const $=id=>document.getElementById(id);
const ctx=()=>window.AERIOM_CAMPAIGN?.getContext?.()||null;
const master=()=>String(ctx()?.membership?.role||"").toLowerCase()==="master";
function render(){
 const root=$("campaign-theme-selector"); if(!root)return;
 const current=String(ctx()?.campaign?.theme||document.documentElement.dataset.theme||"default");
 root.innerHTML=THEMES.map(([id,name,desc])=>'<button type="button" class="campaign-theme-option '+(id===current?"is-active":"")+'" data-cave-theme-option="'+id+'"><div class="campaign-theme-option__preview '+(id==="cave"?"is-cave":"")+'"></div><div><strong>'+name+'</strong><span>'+desc+'</span></div></button>').join("");
 root.querySelectorAll("[data-cave-theme-option]").forEach(btn=>btn.addEventListener("click",()=>selectTheme(btn.dataset.caveThemeOption)));
 apply(current);
}
function apply(theme){
 document.documentElement.dataset.theme=theme;
 const body=document.body;
 if(!body)return;
 body.dataset.caveTheme=String(theme==="cave");
 if(theme==="cave")body.style.setProperty("--aeriom-background-image",'url("'+CAVE_BG+'")');
 else body.style.removeProperty("--aeriom-background-image");
 document.documentElement.style.setProperty("--cave-rock-top",'url("'+CAVE_TOP+'")');
 document.documentElement.style.setProperty("--cave-rock-bottom",'url("'+CAVE_BOTTOM+'")');
}
async function selectTheme(theme){
 if(!master())return;
 const c=ctx();
 try{
   const sb=c?.supabase||await getSupabase();
   const {error}=await sb.from("campaigns").update({theme}).eq("id",c.campaignId);
   if(error)throw error;
   apply(theme);
   render();
 }catch(e){console.error("[AERION][THEME-CAVERNA]",e);}
}
function boot(){render();}
window.addEventListener("aeriom:campaign:ready",()=>setTimeout(boot,0));
window.addEventListener("aeriom:campaigntheme",e=>{apply(e.detail?.theme||"default");setTimeout(render,0);});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();