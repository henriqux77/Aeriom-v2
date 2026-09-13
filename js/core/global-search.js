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
      /* Botão hambúrguer: mesmo acabamento da mesa, com morph para X. */
      #campaigns-mobile-menu-button,
      #campaign-mobile-menu-button,
      #hb-mobile-menu-button,
      [data-mobile-menu-trigger] {
        position:relative!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
      }
      #campaigns-mobile-menu-button > span,
      #campaign-mobile-menu-button > span,
      #hb-mobile-menu-button > span,
      [data-mobile-menu-trigger] > span {
        display:block!important;
        width:22px!important;
        height:16px!important;
        position:relative!important;
        font-size:0!important;
        line-height:0!important;
      }
      #campaigns-mobile-menu-button > span::before,
      #campaigns-mobile-menu-button > span::after,
      #campaign-mobile-menu-button > span::before,
      #campaign-mobile-menu-button > span::after,
      #hb-mobile-menu-button > span::before,
      #hb-mobile-menu-button > span::after,
      [data-mobile-menu-trigger] > span::before,
      [data-mobile-menu-trigger] > span::after {
        content:"";
        position:absolute;
        left:0;
        width:22px;
        height:2px;
        border-radius:999px;
        background:currentColor;
        transition:transform .28s cubic-bezier(.2,.8,.2,1),top .28s cubic-bezier(.2,.8,.2,1),opacity .2s ease;
      }
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
      [data-mobile-menu-trigger][aria-expanded="true"] > span::before {
        top:7px;
        transform:rotate(45deg);
        box-shadow:none;
      }
      #campaigns-mobile-menu-button[aria-expanded="true"] > span::after,
      #campaign-mobile-menu-button[aria-expanded="true"] > span::after,
      #hb-mobile-menu-button[aria-expanded="true"] > span::after,
      [data-mobile-menu-trigger][aria-expanded="true"] > span::after {
        display:block;
        top:7px;
        transform:rotate(-45deg);
      }
      #campaigns-mobile-menu-button[aria-expanded="true"] > span,
      #campaign-mobile-menu-button[aria-expanded="true"] > span,
      #hb-mobile-menu-button[aria-expanded="true"] > span,
      [data-mobile-menu-trigger][aria-expanded="true"] > span { width:22px!important; }

      /* A tela de criação de ficha não precisa do atalho de busca global. */
      body.aeriom-page--character #aeriom-global-search-trigger { display:none!important; }

      /* Em campanha, a barra antiga e as ações flutuantes não competem com o dock líquido. */
      @media(max-width:760px){
        .aeriom-page--campaign #aeriom-mobile-bottom-nav,
        .aeriom-page--campaign .aeriom-mobile-bottom-nav,
        .aeriom-page--campaign .campaign-mobile-actions { display:none!important; }
      }

      /* Botão de entrada na lista de campanhas. */
      .aeriom-campaign-join-inline{
        min-height:44px;
        padding:0 18px;
        border:1px solid rgba(216,182,95,.28);
        border-radius:12px;
        background:linear-gradient(135deg,rgba(216,182,95,.10),rgba(255,255,255,.018));
        color:#e6c66f;
        font:700 12px Inter,sans-serif;
        cursor:pointer;
        transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease;
      }
      .aeriom-campaign-join-inline:hover{
        transform:translateY(-1px);
        border-color:rgba(216,182,95,.48);
        background:rgba(216,182,95,.14);
        box-shadow:0 12px 26px rgba(0,0,0,.18);
      }
      @media(max-width:700px){
        .aeriom-campaign-join-inline{ flex:1; min-width:0; }
      }
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
    join.addEventListener("click", () => {
      window.location.href = "./entrar.html";
    });

    actions.classList.add("aeriom-campaign-heading-actions");
    actions.insertBefore(join, createButton);
  }

  function ensureUI() {
    installMobileControlPolish();
    installCampaignJoinButton();

    if (document.body?.classList.contains("aeriom-page--character")) {
      return;
    }

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
    if (topbar) topbar.appendChild(button);
    else document.body.appendChild(button);

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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
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

        (knowledge.data || []).forEach(row => datasets.push({ kind: "Conhecimento", type: row.node_type, title: row.title, text: row.content, id: row.id, tab: "knowledge" }));
        (mural.data || []).forEach(row => datasets.push({ kind: "Mural", type: row.post_type, title: row.title, text: row.content, id: row.id, tab: "mural" }));
        (timeline.data || []).forEach(row => datasets.push({ kind: "Histórico", type: row.event_type, title: row.title, text: row.description, id: row.id, tab: "timeline" }));
        (characters.data || []).forEach(row => {
          const character = row.characters;
          if (character) datasets.push({ kind: "Personagem", type: character.class || "personagem", title: character.name, text: [character.race, character.class].filter(Boolean).join(" · "), id: character.id, href: `./ficha.html?id=${encodeURIComponent(character.id)}&campaign=${encodeURIComponent(campaignId)}` });
        });
        (maps.data || []).forEach(row => datasets.push({ kind: "Mapa", type: "mapa", title: row.name, text: row.description, id: row.id, tab: "maps" }));
      } else {
        const campaigns = await supabase.from("campaigns").select("id,name,description");
        (campaigns.data || []).forEach(row => datasets.push({ kind: "Campanha", type: "campaign", title: row.name, text: row.description, id: row.id, href: `./campanha.html?campaign=${encodeURIComponent(row.id)}` }));
      }

      state.rows = datasets;
      state.loadedKey = key;
      return datasets;
    } finally {
      state.loading = false;
    }
  }

  async function render() {
    const input = $("#aeriom-global-search-input");
    const root = $("#aeriom-global-search-results");
    const status = $("#aeriom-global-search-status");
    if (!input || !root || !status) return;

    const query = input.value.trim().toLowerCase();
    root.replaceChildren();
    if (!query) {
      status.textContent = "Digite para pesquisar.";
      return;
    }

    status.textContent = "Pesquisando…";
    const rows = await load();
    const matches = rows.filter(row => `${row.title || ""} ${row.text || ""} ${row.kind || ""} ${row.type || ""}`.toLowerCase().includes(query)).slice(0, 40);
    status.textContent = matches.length ? `${matches.length} resultado(s)` : "Nenhum resultado encontrado.";

    matches.forEach(row => {
      const result = document.createElement(row.href ? "a" : "button");
      result.className = "aeriom-global-search__result";
      if (row.href) result.href = row.href;
      else result.type = "button";
      result.innerHTML = `<span>${esc(row.kind)}</span><strong>${esc(row.title)}</strong><small>${esc(row.text || "")}</small>`;
      if (!row.href && row.tab) {
        result.addEventListener("click", () => {
          close();
          window.AERIOM_CAMPAIGN?.setActiveTab?.(row.tab);
        });
      }
      root.appendChild(result);
    });
  }

  function open() {
    const modal = $("#aeriom-global-search");
    if (!modal) return;
    modal.hidden = false;
    requestAnimationFrame(() => $("#aeriom-global-search-input")?.focus());
    void render();
  }

  function close() {
    const modal = $("#aeriom-global-search");
    if (modal) modal.hidden = true;
  }

  window.AERIOM_GLOBAL_SEARCH = {
    open,
    close,
    refresh: () => { state.rows = []; state.loadedKey = null; void render(); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureUI, { once: true });
  else ensureUI();
})();