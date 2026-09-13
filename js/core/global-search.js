import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
  const state = { rows: [], loading: false, loadedKey: null };

  function getCampaignContext() {
    return window.AERIOM_CAMPAIGN?.getContext?.() || {};
  }

  function getCampaignId() {
    const context = getCampaignContext();
    return new URLSearchParams(location.search).get("campaign") || context.campaignId || context.campaign?.id || null;
  }

  function installMobileControlPolish() {
    if (document.getElementById("aeriom-global-mobile-controls-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-global-mobile-controls-style";
    style.textContent = `
      #campaigns-mobile-menu-button,
      #campaign-mobile-menu-button,
      #hb-mobile-menu-button,
      [data-mobile-menu-trigger] { position:relative!important; display:grid!important; place-items:center!important; overflow:hidden!important; }
      #campaigns-mobile-menu-button > span,
      #campaign-mobile-menu-button > span,
      #hb-mobile-menu-button > span,
      [data-mobile-menu-trigger] > span { display:block!important; width:22px!important; height:16px!important; position:relative!important; font-size:0!important; line-height:0!important; }
      #campaigns-mobile-menu-button > span::before,
      #campaigns-mobile-menu-button > span::after,
      #campaign-mobile-menu-button > span::before,
      #campaign-mobile-menu-button > span::after,
      #hb-mobile-menu-button > span::before,
      #hb-mobile-menu-button > span::after,
      [data-mobile-menu-trigger] > span::before,
      [data-mobile-menu-trigger] > span::after { content:""; position:absolute; left:0; width:22px; height:2px; border-radius:999px; background:currentColor; transition:transform .28s cubic-bezier(.2,.8,.2,1),top .28s cubic-bezier(.2,.8,.2,1),opacity .2s ease; }
      #campaigns-mobile-menu-button > span::before,
      #campaign-mobile-menu-button > span::before,
      #hb-mobile-menu-button > span::before,
      [data-mobile-menu-trigger] > span::before { top:1px; box-shadow:0 6px 0 currentColor,0 12px 0 currentColor; }
      #campaigns-mobile-menu-button > span::after,
      #campaign-mobile-menu-button > span::after,
      #hb-mobile-menu-button > span::after,
      [data-mobile-menu-trigger] > span::after { display:none; }
      #campaigns-mobile-menu-button[aria-expanded="true"] > span::before,
      #campaign-mobile-menu-button[aria-expanded="true"] > span::before,
      #hb-mobile-menu-button[aria-expanded="true"] > span::before,
      [data-mobile-menu-trigger][aria-expanded="true"] > span::before { top:7px; transform:rotate(45deg); box-shadow:none; }
      #campaigns-mobile-menu-button[aria-expanded="true"] > span::after,
      #campaign-mobile-menu-button[aria-expanded="true"] > span::after,
      #hb-mobile-menu-button[aria-expanded="true"] > span::after,
      [data-mobile-menu-trigger][aria-expanded="true"] > span::after { display:block; top:7px; transform:rotate(-45deg); }
      #campaigns-mobile-menu-button[aria-expanded="true"] > span,
      #campaign-mobile-menu-button[aria-expanded="true"] > span,
      #hb-mobile-menu-button[aria-expanded="true"] > span,
      [data-mobile-menu-trigger][aria-expanded="true"] > span { width:22px!important; }
      body.aeriom-page--character #aeriom-global-search-trigger { display:none!important; }
      @media(max-width:760px){ .aeriom-page--campaign #aeriom-mobile-bottom-nav,.aeriom-page--campaign .aeriom-mobile-bottom-nav,.aeriom-page--campaign .campaign-mobile-actions{display:none!important;} }
      .aeriom-campaign-join-inline{min-height:44px;padding:0 18px;border:1px solid rgba(216,182,95,.28);border-radius:12px;background:linear-gradient(135deg,rgba(216,182,95,.10),rgba(255,255,255,.018));color:#e6c66f;font:700 12px Inter,sans-serif;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease}
      .aeriom-campaign-join-inline:hover{transform:translateY(-1px);border-color:rgba(216,182,95,.48);background:rgba(216,182,95,.14);box-shadow:0 12px 26px rgba(0,0,0,.18)}
      @media(max-width:700px){.aeriom-campaign-join-inline{flex:1;min-width:0;}}

      /* Menu de conta compartilhada do AERIOM. */
      .aeriom-profile-wrap{position:relative;display:inline-flex;align-items:center;z-index:80}
      .aeriom-profile-menu{position:absolute;right:0;top:calc(100% + 10px);width:300px;padding:10px;border:1px solid rgba(183,150,91,.22);border-radius:14px;background:rgba(12,10,8,.985);box-shadow:0 24px 70px rgba(0,0,0,.58);backdrop-filter:blur(18px);opacity:0;transform:translateY(-6px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}
      .aeriom-profile-wrap.is-open .aeriom-profile-menu{opacity:1;transform:none;pointer-events:auto}
      .aeriom-profile-head{display:flex;align-items:center;gap:11px;padding:9px 9px 13px;border-bottom:1px solid rgba(190,177,151,.13)}
      .aeriom-profile-avatar{width:48px;height:48px;border-radius:50%;flex:none;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 25%,#6e6659,#191713 65%,#0a0907);border:1px solid rgba(220,202,165,.24);font-weight:800;color:#f3eee3}
      .aeriom-profile-avatar img{width:100%;height:100%;display:block;object-fit:cover}
      .aeriom-profile-copy{min-width:0;display:flex;flex-direction:column}
      .aeriom-profile-copy strong{font-size:13px;color:#f4f0e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-profile-copy small{margin-top:3px;color:#958d80;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-profile-badge{display:inline-flex;align-items:center;gap:5px;margin-top:4px;color:#d7b77d;font-size:9px}
      .aeriom-profile-badge i{width:6px;height:6px;border-radius:50%;background:#d7b77d;box-shadow:0 0 9px rgba(215,183,125,.5)}
      .aeriom-profile-actions{display:grid;gap:4px;padding-top:8px}
      .aeriom-profile-actions a,.aeriom-profile-actions button{width:100%;padding:10px 9px;border:0;border-radius:9px;background:transparent;color:#e3ddd2;text-align:left;text-decoration:none;font:600 11px Inter,system-ui;cursor:pointer}
      .aeriom-profile-actions a:hover,.aeriom-profile-actions button:hover{background:rgba(200,166,107,.07);color:#fff}
      .aeriom-profile-actions .danger{color:#e9aaa4}
      .aeriom-profile-actions .danger:hover{background:rgba(198,70,62,.08)}
      .campaigns-user-badge__avatar{overflow:hidden}
      .campaigns-user-badge__avatar img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}
      @media(max-width:700px){.aeriom-profile-menu{right:-4px;width:min(300px,calc(100vw - 28px));}}
    `;
    document.head.appendChild(style);
  }

  function installCampaignJoinButton() {
    if (!document.body?.classList.contains("aeriom-page--campaigns")) return;
    if ($("#aeriom-campaign-join-inline")) return;
    const createButton = $("#campaigns-create-button");
    const actions = createButton?.parentElement;
    if (!createButton || !actions) return;
    const join = document.createElement("button");
    join.id = "aeriom-campaign-join-inline";
    join.type = "button";
    join.className = "aeriom-campaign-join-inline";
    join.innerHTML = "<span aria-hidden=\"true\">↗</span> Entrar com código";
    join.addEventListener("click", () => { window.location.href = "./entrar.html"; });
    actions.classList.add("aeriom-campaign-heading-actions");
    actions.insertBefore(join, createButton);
  }

  function ensureUI() {
    installMobileControlPolish();
    installCampaignJoinButton();
    if (document.body?.classList.contains("aeriom-page--character")) return;
    if ($("#aeriom-global-search-trigger")) return;
    const button = document.createElement("button");
    button.id = "aeriom-global-search-trigger";
    button.className = "aeriom-global-search-trigger";
    button.type = "button";
    button.setAttribute("aria-label", "Abrir busca global");
    button.innerHTML = '⌕ <span>Buscar</span>';
    button.title = "Busca global · Ctrl K";
    const campaignTopbar = $(".campaign-topbar__right");
    const topbar = campaignTopbar || $(".campaigns-topbar__right,.hb-top-actions,.aeriom-topbar__right");
    if (topbar) topbar.appendChild(button); else document.body.appendChild(button);
    const modal = document.createElement("div");
    modal.id = "aeriom-global-search";
    modal.className = "aeriom-global-search";
    modal.hidden = true;
    modal.innerHTML = '<div class="aeriom-global-search__backdrop"></div><section class="aeriom-global-search__dialog" role="dialog" aria-modal="true" aria-labelledby="aeriom-global-search-title"><header><div><span>BUSCA GLOBAL</span><h2 id="aeriom-global-search-title">Pesquisar no AERIOM</h2></div><button type="button" data-search-close aria-label="Fechar busca">×</button></header><input id="aeriom-global-search-input" type="search" autocomplete="off" placeholder="NPC, personagem, quest, nota, Homebrew…"><div id="aeriom-global-search-status" class="aeriom-global-search__status">Digite para pesquisar.</div><div id="aeriom-global-search-results" class="aeriom-global-search__results"></div></section>';
    document.body.appendChild(modal);
    button.addEventListener("click", open);
    modal.querySelector("[data-search-close]").addEventListener("click", close);
    modal.querySelector(".aeriom-global-search__backdrop").addEventListener("click", close);
    modal.querySelector("#aeriom-global-search-input").addEventListener("input", render);
    modal.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); open(); }
    });
  }

  async function load() {
    const campaignId = getCampaignId();
    const key = campaignId || "global";
    if (state.loading || state.loadedKey === key) return state.rows;
    state.loading = true;
    try {
      const supabase = await getSupabase();
      const auth = await supabase.auth.getUser();
      if (auth.error || !auth.data?.user) return [];
      const datasets = [];
      if (campaignId) {
        const [knowledge, mural, timeline, characters, maps] = await Promise.all([
          supabase.from("knowledge_nodes").select("id,title,content,node_type,campaign_id").eq("campaign_id", campaignId),
          supabase.from("mural_posts").select("id,title,content,post_type,campaign_id").eq("campaign_id", campaignId),
          supabase.from("timeline_events").select("id,title,description,event_type,campaign_id").eq("campaign_id", campaignId),
          supabase.from("campaign_characters").select("character_id,characters(id,name,race,class)").eq("campaign_id", campaignId),
          supabase.from("maps").select("id,name,description,campaign_id").eq("campaign_id", campaignId)
        ]);
        (knowledge.data || []).forEach(row => datasets.push({ kind:"Conhecimento", type:row.node_type, title:row.title, text:row.content, id:row.id, tab:"knowledge" }));
        (mural.data || []).forEach(row => datasets.push({ kind:"Mural", type:row.post_type, title:row.title, text:row.content, id:row.id, tab:"mural" }));
        (timeline.data || []).forEach(row => datasets.push({ kind:"Histórico", type:row.event_type, title:row.title, text:row.description, id:row.id, tab:"timeline" }));
        (characters.data || []).forEach(row => { const character=row.characters; if(character) datasets.push({kind:"Personagem",type:character.class||"personagem",title:character.name,text:[character.race,character.class].filter(Boolean).join(" · "),id:character.id,href:`./ficha.html?id=${encodeURIComponent(character.id)}&campaign=${encodeURIComponent(campaignId)}`}); });
        (maps.data || []).forEach(row => datasets.push({ kind:"Mapa", type:"mapa", title:row.name, text:row.description, id:row.id, tab:"maps" }));
      } else {
        const campaigns = await supabase.from("campaigns").select("id,name,description");
        (campaigns.data || []).forEach(row => datasets.push({ kind:"Campanha",type:"campaign",title:row.name,text:row.description,id:row.id,href:`./campanha.html?campaign=${encodeURIComponent(row.id)}` }));
      }
      state.rows = datasets;
      state.loadedKey = key;
      return datasets;
    } finally { state.loading = false; }
  }

  async function render() {
    const input = $("#aeriom-global-search-input");
    const root = $("#aeriom-global-search-results");
    const status = $("#aeriom-global-search-status");
    if (!input || !root || !status) return;
    const query = input.value.trim().toLowerCase();
    root.replaceChildren();
    if (!query) { status.textContent = "Digite para pesquisar."; return; }
    status.textContent = "Pesquisando…";
    const rows = await load();
    const matches = rows.filter(row => `${row.title || ""} ${row.text || ""} ${row.kind || ""} ${row.type || ""}`.toLowerCase().includes(query)).slice(0,40);
    status.textContent = matches.length ? `${matches.length} resultado(s)` : "Nenhum resultado encontrado.";
    matches.forEach(row => {
      const result = document.createElement(row.href ? "a" : "button");
      result.className = "aeriom-global-search__result";
      if (row.href) result.href = row.href; else result.type="button";
      result.innerHTML = `<span>${esc(row.kind)}</span><strong>${esc(row.title)}</strong><small>${esc(row.text || "")}</small>`;
      if (!row.href && row.tab) result.addEventListener("click",()=>{close();window.AERIOM_CAMPAIGN?.setActiveTab?.(row.tab);});
      root.appendChild(result);
    });
  }

  function open() {
    const modal=$("#aeriom-global-search");
    if(!modal)return;
    modal.hidden=false;
    requestAnimationFrame(()=>$("#aeriom-global-search-input")?.focus());
    void render();
  }
  function close(){const modal=$("#aeriom-global-search");if(modal)modal.hidden=true;}

  window.AERIOM_GLOBAL_SEARCH={open,close,refresh:()=>{state.rows=[];state.loadedKey=null;void render();}};

  function installCampaignProfileMenu(){
    if(!document.body?.classList.contains("aeriom-page--campaigns"))return;
    const badge=$("#campaigns-user-badge");
    if(!badge || badge.dataset.profileMenuReady==="true")return;
    badge.dataset.profileMenuReady="true";
    installMobileControlPolish();

    let wrap=badge.parentElement;
    if(!wrap?.classList.contains("aeriom-profile-wrap")){
      wrap=document.createElement("div");
      wrap.className="aeriom-profile-wrap";
      badge.parentNode.insertBefore(wrap,badge);
      wrap.appendChild(badge);
    }

    const userBadgeName=$("#campaigns-user-name");
    const userBadgeEmail=$("#campaigns-user-email");
    const userBadgeAvatar=$("#campaigns-user-avatar");
    const profileCache={name:userBadgeName?.textContent?.trim()||"Aventureiro",email:userBadgeEmail?.textContent?.trim()||"",avatarUrl:""};

    const hydrate=async()=>{
      try{
        const supabase=await getSupabase();
        const auth=await supabase.auth.getUser();
        const user=auth.data?.user;
        if(!user)return;
        let name=userBadgeName?.textContent?.trim()||user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"Aventureiro";
        let email=user.email||userBadgeEmail?.textContent?.trim()||"";
        let avatarPath="";
        const {data}=await supabase.from("profiles").select("display_name,avatar_path").eq("id",user.id).maybeSingle();
        if(data?.display_name)name=data.display_name;
        avatarPath=data?.avatar_path||"";
        let avatarUrl="";
        if(avatarPath){
          const signed=await supabase.storage.from("avatars").createSignedUrl(avatarPath,3600);
          avatarUrl= signed.error ? "" : (signed.data?.signedUrl||"");
          if(!avatarUrl){try{avatarUrl=supabase.storage.from("avatars").getPublicUrl(avatarPath).data?.publicUrl||"";}catch(_){}}
        }
        if(userBadgeName)userBadgeName.textContent=name;
        if(userBadgeEmail)userBadgeEmail.textContent=email;
        if(userBadgeAvatar){
          userBadgeAvatar.replaceChildren();
          if(avatarUrl){
            const img=document.createElement("img");img.src=avatarUrl;img.alt="";img.referrerPolicy="no-referrer";img.onerror=()=>{userBadgeAvatar.textContent=initial(name);};userBadgeAvatar.appendChild(img);
          }else userBadgeAvatar.textContent=initial(name);
        }
        profileCache.name=name;profileCache.email=email;profileCache.avatarUrl=avatarUrl;
        return profileCache;
      }catch(error){console.warn("[AERIOM][PROFILE MENU] Falha ao hidratar perfil",error);return profileCache;}
    };

    const menu=document.createElement("div");
    menu.id="aeriom-profile-menu";
    menu.className="aeriom-profile-menu";
    menu.setAttribute("role","menu");

    const head=document.createElement("div");head.className="aeriom-profile-head";
    const avatar=document.createElement("span");avatar.className="aeriom-profile-avatar";avatar.textContent=initial(profileCache.name);
    const copy=document.createElement("div");copy.className="aeriom-profile-copy";
    const nameEl=document.createElement("strong");nameEl.textContent=profileCache.name;
    const emailEl=document.createElement("small");emailEl.textContent=profileCache.email;
    const badgeState=document.createElement("span");badgeState.className="aeriom-profile-badge";badgeState.innerHTML="<i></i> Perfil compartilhado";
    copy.append(nameEl,emailEl,badgeState);head.append(avatar,copy);

    const actions=document.createElement("div");actions.className="aeriom-profile-actions";
    actions.innerHTML='<a href="./perfil.html" role="menuitem">Editar perfil</a><a href="./index.html" role="menuitem">Trocar sistema</a><button type="button" class="danger" data-aeriom-profile-logout>Sair da conta</button>';
    menu.append(head,actions);wrap.appendChild(menu);

    const syncMenu=()=>{nameEl.textContent=profileCache.name||"Aventureiro";emailEl.textContent=profileCache.email||"";avatar.replaceChildren();if(profileCache.avatarUrl){const img=document.createElement("img");img.src=profileCache.avatarUrl;img.alt="";img.referrerPolicy="no-referrer";img.onerror=()=>{avatar.textContent=initial(profileCache.name);};avatar.appendChild(img);}else avatar.textContent=initial(profileCache.name);};

    const closeMenu=()=>{wrap.classList.remove("is-open");badge.setAttribute("aria-expanded","false");};
    const openMenu=()=>{wrap.classList.add("is-open");badge.setAttribute("aria-expanded","true");};

    badge.setAttribute("role","button");badge.setAttribute("tabindex","0");badge.setAttribute("aria-haspopup","true");badge.setAttribute("aria-expanded","false");badge.setAttribute("aria-label","Abrir perfil");badge.title="Abrir perfil";

    // Capture no document intercepta o clique antes do listener antigo do campanhas.js, que apenas navegava para perfil.html.
    document.addEventListener("click",event=>{
      if(event.target instanceof Node && badge.contains(event.target)){
        event.preventDefault();event.stopImmediatePropagation();
        if(wrap.classList.contains("is-open"))closeMenu();else{syncMenu();openMenu();void hydrate().then(syncMenu);}
        return;
      }
      if(!(event.target instanceof Node) || !wrap.contains(event.target))closeMenu();
    },true);

    badge.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();if(wrap.classList.contains("is-open"))closeMenu();else{syncMenu();openMenu();void hydrate().then(syncMenu);}}
      if(event.key==="Escape")closeMenu();
    });
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closeMenu();});
    actions.querySelector("[data-aeriom-profile-logout]")?.addEventListener("click",async()=>{closeMenu();try{const supabase=await getSupabase();await supabase.auth.signOut();}finally{location.replace("./index.html");}});
  }

  function initial(name){return String(name||"Aventureiro").trim().charAt(0).toUpperCase()||"?";}

  const baseReady=ensureUI;
  function ensureUIWithProfile(){baseReady();installCampaignProfileMenu();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureUIWithProfile,{once:true});
  else ensureUIWithProfile();
})();