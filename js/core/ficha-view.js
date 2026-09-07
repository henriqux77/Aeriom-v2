import { getSupabase } from "./supabase.js";
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"' : "&quot;" }[c]));
  const attrDefs = [
    ["forca","Força"],["agilidade","Agilidade"],["percepcao","Percepção"],["vigor","Vigor"],
    ["intelecto","Intelecto"],["presenca","Presença"],["controle","Controle"],["precisao","Precisão"]
  ];
  const skillDefs = [
    ["acrobacia","Acrobacia","agilidade"],["atletismo","Atletismo","forca"],["furtividade","Furtividade","agilidade"],["pontaria","Pontaria","agilidade"],
    ["percepcao","Percepção","percepcao"],["investigacao","Investigação","intelecto"],["conhecimento","Conhecimento","intelecto"],["medicina","Medicina","intelecto"],
    ["sobrevivencia","Sobrevivência","percepcao"],["persuasao","Persuasão","presenca"],["enganacao","Enganação","presenca"],["intuicao","Intuição","percepcao"],
    ["tatica","Tática","intelecto"],["oficio","Ofício / Crafting","controle"]
  ];
  async function main(){
    const sb=await getSupabase();
    const auth=await sb.auth.getUser();
    if(!auth.data?.user){ location.href="./index.html"; return; }
    const p=new URLSearchParams(location.search);
    const id=p.get("id"); const returnCampaign=p.get("returnCampaign");
    if(!id) throw new Error("Ficha não informada.");
    const q=await sb.from("characters").select("*").eq("id",id).eq("user_id",auth.data.user.id).maybeSingle();
    if(q.error) throw q.error; if(!q.data) throw new Error("Ficha não encontrada.");
    const row=q.data, s=row.creation_state||{}, d=s.derivedStats||{}, dice=s.assignedDice||{};
    const set=(id,v)=>{const e=$(id);if(e)e.textContent=(v===undefined||v===null||v==="")?"—":v};
    set("name",row.name||s.name||"Ficha sem nome");
    set("meta",[row.race||s.race,row.class||s.class,row.power||s.primaryPower].filter(Boolean).join(" · ")||"Aventureiro");
    set("hp",(row.hp_current??s.hp?.current??10)+"/"+(row.hp_max??s.hp?.max??10));
    set("def",row.defense??s.defense??10); set("move",(row.movement??s.movement??9)+"m");
    set("mana",(row.mana_current??s.mana?.current??0)+"/"+(row.mana_max??s.mana?.max??0));
    set("race",row.race||s.race); set("class",row.class||s.class); set("power",row.power||s.primaryPower); set("parallel",row.parallelPower||s.parallelPower);
    set("gender",row.gender||s.gender); set("origin",row.origin||s.origin); set("region",s.region); set("description",s.description||row.description);
    set("height",s.appearance?.height ? s.appearance.height+" cm" : "—"); set("skin",s.appearance?.skinTone); set("hair",s.appearance?.hairColor); set("eyes",s.appearance?.eyeColor);
    set("personality",s.personality); set("objective",s.objective); set("fear",s.fear); set("bond",s.importantBond); set("history",s.history);
    const tags=$("race-tags"); const mods=row.racial_modifiers||d.racialModifiers||{};
    if(tags) tags.innerHTML=Object.entries(mods).map(([k,v])=>"<span class=\"fv-tag\">"+esc(k)+" "+(Number(v)>0?"+":"")+esc(v)+"</span>").join("")||"<span class=\"fv-tag\">Sem modificadores</span>";
    const avatarPath=String(s.avatar||row.avatar_path||"").trim();
    let avatarUrl=""; if(avatarPath){ const ar=await sb.storage.from("avatars").createSignedUrl(avatarPath,3600); avatarUrl=ar.data?.signedUrl||""; }
    const av=$("avatar"); const ph=$("avatar-placeholder"); if(av && avatarUrl){av.src=avatarUrl;av.hidden=false;if(ph)ph.hidden=true;}
    else if(ph){ph.hidden=false;ph.textContent=(row.name||s.name||"?").slice(0,1).toUpperCase();}
    const attrs=$("attributes-list"); if(attrs){attrs.innerHTML=attrDefs.map(([id,name])=>"<div class=\"fv-list-item\"><b>"+name+"</b><small>"+esc(dice[id]||"—")+"</small></div>").join("");}
    const skills=$("skills-list"); const sv=s.skills||{}; if(skills){skills.innerHTML=skillDefs.filter(x=>sv[x[0]]?.trained||sv[x[0]]?.bonus).map(x=>"<div class=\"fv-list-item\"><b>"+x[1]+"</b><small>"+(sv[x[0]]?.trained?"Treinada":"")+(sv[x[0]]?.bonus? " · Bônus "+sv[x[0]].bonus:"")+"</small></div>").join("")||"<div class=\"fv-list-item\"><small>Nenhuma perícia treinada.</small></div>";}
    const tech=$("techniques-list"); if(tech) tech.innerHTML=(s.techniques||[]).map(x=>"<div class=\"fv-list-item\"><b>"+esc(x.name||"Técnica")+"</b><small>Nível "+esc(x.level||1)+" · XP "+esc(x.xp||0)+"</small></div>").join("")||"<div class=\"fv-list-item\"><small>Nenhuma técnica registrada.</small></div>";
    const inv=$("inventory-list"); const inventory=s.inventory||s.equipment||[]; if(inv) inv.innerHTML=inventory.map(x=>"<div class=\"fv-list-item\"><b>"+esc(x.name||x.item||"Item")+"</b><small>"+esc(x.description||"")+"</small></div>").join("")||"<div class=\"fv-list-item\"><small>Inventário vazio.</small></div>";
    const u=new URL("./fichas.html",location.href); u.searchParams.set("id",row.id); if(returnCampaign)u.searchParams.set("returnCampaign",returnCampaign); $("edit").onclick=()=>location.href=u.href;
    $("back").href=returnCampaign?"./campanha.html?campaign="+encodeURIComponent(returnCampaign):"./minhas-fichas.html";
    $("menu-toggle").onclick=()=>$( "menu").classList.toggle("is-open");
    document.querySelectorAll(".fv-menu-item").forEach((b)=>b.addEventListener("click",()=>{$("menu").classList.remove("is-open"); const t=$(b.dataset.target); if(t)t.scrollIntoView({behavior:"smooth",block:"start"});}));
  }
  main().catch((e)=>{console.error("[AERION][FICHA-VIEW]",e);const er=$("error");if(er){er.hidden=false;er.textContent=e?.message||"Não foi possível abrir a ficha.";}});
})();