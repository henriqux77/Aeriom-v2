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

  function ensureUI() {
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