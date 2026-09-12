import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const MANA = [
    ["azul", "Azul", "#5d9de0"],
    ["roxa", "Roxa", "#a978e1"],
    ["dourada", "Dourada", "#e4be5f"],
    ["branca", "Branca", "#eeeeee"]
  ];

  const state = { supabase: null, campaignId: null, hydrated: false, manaItems: [], observer: null, boundHost: null };
  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const text = value => String(value ?? "").trim();
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));

  function currentCampaign() {
    return ctx()?.campaign || {};
  }

  function campaignImage() {
    const c = currentCampaign();
    return text(c.coverUrl) || text(c.backgroundUrl) || "./assets/themes/aeriom/default.svg";
  }

  function injectCss() {
    if ($("aeriom-master-redesign-link")) return;
    const link = document.createElement("link");
    link.id = "aeriom-master-redesign-link";
    link.rel = "stylesheet";
    link.href = "./css/mestre-dashboard-redesign.css?v=20260912-master2";
    document.head.appendChild(link);
  }

  function findCards(root) {
    return [...root.querySelectorAll(":scope > .aeriom-master-grid > .aeriom-master-card")];
  }

  function titleOf(card) {
    return text(card.querySelector(".aeriom-master-card__head h3, h3")?.textContent).toLowerCase();
  }

  function classifyCards(root) {
    findCards(root).forEach(card => {
      card.classList.remove("is-config", "is-quick", "is-sheet", "is-mana", "is-content", "is-system", "is-live", "is-sessions", "is-tools");
      const title = titleOf(card);
      if (title.includes("configura")) card.classList.add("is-config");
      else if (title.includes("ações") || title.includes("ações rápidas")) card.classList.add("is-quick");
      else if (title.includes("ficha")) card.classList.add("is-sheet");
      else if (title.includes("mana")) card.classList.add("is-mana");
      else if (title.includes("transmiss")) card.classList.add("is-live");
      else if (title.includes("sala de combate") || title.includes("efeitos")) card.classList.add("is-system");
      else if (title.includes("campanha")) card.classList.add("is-content");
      else if (title.includes("sess")) card.classList.add("is-sessions");
      else if (title.includes("ferrament")) card.classList.add("is-tools");
    });
  }

  function buildHero(root) {
    if (root.querySelector(":scope > .aeriom-master-redesign-shell")) return;
    const shell = document.createElement("div");
    shell.className = "aeriom-master-redesign-shell";

    const hero = document.createElement("section");
    hero.className = "aeriom-master-redesign-hero";
    hero.style.backgroundImage = `url(${JSON.stringify(campaignImage())})`;
    const name = text(currentCampaign().name) || "Campanha";
    const description = text(currentCampaign().description) || "Tudo o que você precisa para criar histórias inesquecíveis.";
    hero.innerHTML = `<div class="aeriom-master-redesign-hero__content">
      <div class="aeriom-master-redesign-crumb"><span>⌂</span><span>Campanha</span><span>›</span><strong>Controle do Mestre</strong></div>
      <div class="aeriom-master-redesign-kicker">✦ MESA DO MESTRE</div>
      <h1>${esc(name)}</h1>
      <p>${esc(description)}</p>
      <div class="aeriom-master-redesign-quote">“Grandes aventuras começam com um grande mestre.”</div>
    </div>`;

    const guide = document.createElement("nav");
    guide.className = "aeriom-master-redesign-guide";
    guide.setAttribute("aria-label", "Guia rápido do Mestre");
    const links = [
      ["overview", "♜", "Visão geral"],
      ["config", "⚙", "Configuração"],
      ["sheets", "♟", "Fichas"],
      ["mana", "✦", "Mana"],
      ["media", "▶", "Transmissão"],
      ["system", "⚔", "Regras & efeitos"]
    ];
    links.forEach(([id, icon, label], index) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.redesignTarget = id;
      b.className = index === 0 ? "is-active" : "";
      b.innerHTML = `<span>${icon}</span>${label}`;
      b.addEventListener("click", () => {
        const target = root.querySelector(`[data-redesign-anchor="${id}"]`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        guide.querySelectorAll("button").forEach(x => x.classList.toggle("is-active", x === b));
      });
      guide.appendChild(b);
    });

    shell.append(hero, guide);
    root.insertBefore(shell, root.firstChild);
  }

  function buildStats(root) {
    if (root.querySelector(":scope > .aeriom-master-redesign-stats")) return;
    const stats = document.createElement("section");
    stats.className = "aeriom-master-redesign-stats";
    stats.innerHTML = `
      <article class="aeriom-master-redesign-stat"><div class="aeriom-master-redesign-stat__icon">♟</div><div><span class="aeriom-master-redesign-stat__value" data-stat="adventurers">0</span><span class="aeriom-master-redesign-stat__label">Aventureiros</span><div class="aeriom-master-redesign-stat__sub">Na campanha</div></div></article>
      <article class="aeriom-master-redesign-stat"><div class="aeriom-master-redesign-stat__icon">♙</div><div><span class="aeriom-master-redesign-stat__value" data-stat="npcs">0</span><span class="aeriom-master-redesign-stat__label">NPCs</span><div class="aeriom-master-redesign-stat__sub">Cadastrados</div></div></article>
      <article class="aeriom-master-redesign-stat"><div class="aeriom-master-redesign-stat__icon">⌖</div><div><span class="aeriom-master-redesign-stat__value" data-stat="locations">0</span><span class="aeriom-master-redesign-stat__label">Locais</span><div class="aeriom-master-redesign-stat__sub">Mapeados</div></div></article>
      <article class="aeriom-master-redesign-stat"><div class="aeriom-master-redesign-stat__icon">▤</div><div><span class="aeriom-master-redesign-stat__value" data-stat="missions">0</span><span class="aeriom-master-redesign-stat__label">Missões</span><div class="aeriom-master-redesign-stat__sub">Ativas</div></div></article>
      <article class="aeriom-master-redesign-stat"><div class="aeriom-master-redesign-stat__icon">◷</div><div><span class="aeriom-master-redesign-stat__value">—</span><span class="aeriom-master-redesign-stat__label">Última sessão</span><div class="aeriom-master-redesign-stat__sub">Agendada</div></div></article>`;
    root.insertBefore(stats, root.querySelector(":scope > .aeriom-master-grid") || null);
  }

  function addAnchor(card, id) {
    if (!card || card.dataset.redesignAnchor === id) return;
    card.dataset.redesignAnchor = id;
    card.classList.add("aeriom-master-redesign-anchor");
  }

  function addConfigRail(card) {
    if (!card || card.querySelector(".aeriom-master-rail")) return;
    const rail = document.createElement("div");
    rail.className = "aeriom-master-rail";
    const items = [
      ["◉", "Identidade", "Nome, descrição e imagens", "config"],
      ["♟", "Membros", "Aventureiros e fichas", "sheets"],
      ["◈", "Mundo", "Conteúdo da campanha", "content"],
      ["⚔", "Regras", "Regras, XP e efeitos", "system"],
      ["✦", "Aparência", "Temas e atmosfera", "theme"]
    ];
    items.forEach(([icon, label, sub, target]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span class="aeriom-master-rail__icon">${icon}</span><span><strong>${label}</strong><small>${sub}</small></span>`;
      b.addEventListener("click", () => {
        if (target === "theme") {
          const tabs = document.querySelectorAll("[data-campaign-tab]");
          const tab = [...tabs].find(x => x.dataset.campaignTab === "theme");
          tab?.click();
          return;
        }
        const el = document.querySelector(`[data-redesign-anchor="${target}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      rail.appendChild(b);
    });
    card.querySelector(".aeriom-master-form")?.appendChild(rail);
  }

  function renameSections(root) {
    const quick = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-quick h3");
    if (quick) quick.textContent = "Ações rápidas";
    const quickP = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-quick .aeriom-master-card__head p");
    if (quickP) quickP.textContent = "Atalhos comuns para administrar a mesa em poucos toques.";

    const mana = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-mana h3");
    if (mana) mana.textContent = "Mana por aventureiro";
    const manaP = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-mana .aeriom-master-card__head p");
    if (manaP) manaP.textContent = "Libere cores específicas para um jogador ou para toda a campanha.";

    const content = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-content h3");
    if (content) content.textContent = "Conteúdo da campanha";

    const system = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-system h3");
    if (system) system.textContent = "Regras, efeitos e mesa";
  }

  function normalizeDuplicateContent(root) {
    const lists = [...root.querySelectorAll("#aeriom-master-content")];
    lists.slice(1).forEach(list => list.closest(".aeriom-master-card")?.remove());
  }

  function carousel(root) {
    const card = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-sheet");
    const list = $("aeriom-master-characters");
    if (!card || !list || card.querySelector(".aeriom-master-carousel")) return;
    const old = list.parentElement;
    if (!old) return;
    const shell = document.createElement("div");
    shell.className = "aeriom-master-carousel";
    const left = document.createElement("button"); left.type = "button"; left.className = "aeriom-master-carousel__arrow"; left.textContent = "‹"; left.setAttribute("aria-label", "Ficha anterior");
    const viewport = document.createElement("div"); viewport.className = "aeriom-master-carousel__viewport";
    const right = document.createElement("button"); right.type = "button"; right.className = "aeriom-master-carousel__arrow"; right.textContent = "›"; right.setAttribute("aria-label", "Próxima ficha");
    viewport.appendChild(list);
    shell.append(left, viewport, right);
    old.replaceWith(shell);
    const scrollByCard = dir => viewport.scrollBy({ left: dir * Math.max(220, viewport.clientWidth * .82), behavior: "smooth" });
    left.addEventListener("click", () => scrollByCard(-1));
    right.addEventListener("click", () => scrollByCard(1));
    const dots = document.createElement("div"); dots.className = "aeriom-master-carousel__dots"; dots.innerHTML = "<i class='is-active'></i><i></i><i></i><i></i>"; card.appendChild(dots);
    viewport.addEventListener("scroll", () => {
      const page = Math.min(3, Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth * .82)));
      [...dots.children].forEach((d, i) => d.classList.toggle("is-active", i === page));
    }, { passive: true });
  }

  async function setupMana() {
    if (!state.supabase) state.supabase = await getSupabase();
    state.campaignId = campaignId();
    if (!state.campaignId || !isMaster()) return [];
    const chars = await state.supabase.from("campaign_characters").select("character_id,is_present,characters(id,name,race,class)").eq("campaign_id", state.campaignId).order("is_present", { ascending: false });
    if (chars.error) throw chars.error;
    const settings = await state.supabase.from("campaign_character_settings").select("character_id,unlocked_manas,selected_mana").eq("campaign_id", state.campaignId);
    if (settings.error) throw settings.error;
    const byId = new Map((settings.data || []).map(row => [String(row.character_id), row]));
    state.manaItems = (chars.data || []).map(row => ({ character: row.characters, settings: byId.get(String(row.character_id)) || { unlocked_manas: ["azul"], selected_mana: "azul" } })).filter(x => x.character);
    renderMana();
    return state.manaItems;
  }

  function manaManagerHost() {
    const card = document.querySelector("#campaign-panel-master-controls .aeriom-master-grid > .is-mana");
    if (!card) return null;
    let host = card.querySelector("[data-redesign-mana]");
    if (!host) { host = document.createElement("div"); host.dataset.redesignMana = "1"; card.appendChild(host); }
    return host;
  }

  function renderMana() {
    const host = manaManagerHost();
    if (!host) return;
    host.className = "aeriom-mana-manager";
    const rows = state.manaItems;
    if (!rows.length) { host.innerHTML = '<div class="aeriom-master-empty">Nenhum aventureiro cadastrado.</div>'; return; }
    const allUnlocked = mana => rows.length > 0 && rows.every(item => new Set(item.settings?.unlocked_manas || ["azul"]).has(mana));
    host.innerHTML = `<div class="aeriom-mana-global"><span>Liberação para todos</span>${MANA.map(([id,label]) => `<button type="button" data-mana-all="${id}"><span class="aeriom-mana-dot ${id}"></span>${allUnlocked(id) ? "Bloquear" : "Liberar"} ${label}</button>`).join("")}</div><div class="aeriom-mana-note">Azul é a afinidade inicial. Cada cor pode ser liberada individualmente por jogador.</div>${rows.map(item => {
      const c = item.character; const unlocked = new Set(item.settings?.unlocked_manas || ["azul"]); const selected = item.settings?.selected_mana || "azul";
      return `<div class="aeriom-mana-row" data-mana-character="${esc(c.id)}"><div class="aeriom-mana-row__identity"><strong>${esc(c.name || "Aventureiro")}</strong><small>${esc([c.race,c.class].filter(Boolean).join(" · ") || "Personagem")}</small></div><div class="aeriom-mana-row__buttons">${MANA.map(([id,label]) => `<button type="button" data-mana-toggle="${id}" class="${unlocked.has(id)?"is-unlocked":""} ${selected===id?"is-selected":""}"><span class="aeriom-mana-dot ${id}"></span>${label}</button>`).join("")}</div></div>`;
    }).join("")}`;
    host.onclick = async event => {
      const all = event.target.closest("[data-mana-all]");
      const row = event.target.closest("[data-mana-character]");
      const one = event.target.closest("[data-mana-toggle]");
      try {
        if (all) { await toggleManaAll(all.dataset.manaAll); return; }
        if (row && one) { await toggleManaCharacter(row.dataset.manaCharacter, one.dataset.manaToggle); }
      } catch (error) { toast(error?.message || "Não foi possível atualizar Mana.", "error"); }
    };
  }

  async function saveSettingsRow(characterId, unlocked, selected) {
    const cid = state.campaignId;
    const existing = state.manaItems.find(x => String(x.character?.id) === String(characterId))?.settings;
    const payload = { campaign_id: cid, character_id: characterId, unlocked_manas: unlocked, selected_mana: selected };
    if (existing) {
      const r = await state.supabase.from("campaign_character_settings").update({ unlocked_manas: unlocked, selected_mana: selected }).eq("campaign_id", cid).eq("character_id", characterId);
      if (r.error) throw r.error;
    } else {
      const r = await state.supabase.from("campaign_character_settings").insert(payload);
      if (r.error) throw r.error;
    }
  }

  async function toggleManaCharacter(characterId, manaId) {
    const item = state.manaItems.find(x => String(x.character?.id) === String(characterId)); if (!item) return;
    const unlocked = new Set(item.settings?.unlocked_manas || ["azul"]);
    const selected = item.settings?.selected_mana || "azul";
    if (unlocked.has(manaId)) {
      if (unlocked.size === 1) return;
      unlocked.delete(manaId);
      const next = unlocked.has(selected) ? selected : [...unlocked][0];
      await saveSettingsRow(characterId, [...unlocked], next);
      item.settings = { ...(item.settings || {}), unlocked_manas: [...unlocked], selected_mana: next };
    } else {
      unlocked.add(manaId);
      await saveSettingsRow(characterId, [...unlocked], selected);
      item.settings = { ...(item.settings || {}), unlocked_manas: [...unlocked], selected_mana: selected };
    }
    renderMana();
    window.dispatchEvent(new CustomEvent("aeriom:mana:change", { detail: { campaignId: state.campaignId, characterId, mana: item.settings } }));
  }

  async function toggleManaAll(manaId) {
    const everyoneHas = state.manaItems.every(item => new Set(item.settings?.unlocked_manas || ["azul"]).has(manaId));
    await Promise.all(state.manaItems.map(async item => {
      const unlocked = new Set(item.settings?.unlocked_manas || ["azul"]);
      let nextSelected = item.settings?.selected_mana || "azul";
      if (everyoneHas && manaId !== "azul") {
        unlocked.delete(manaId);
        if (!unlocked.has(nextSelected)) nextSelected = [...unlocked][0] || "azul";
      } else {
        unlocked.add(manaId);
      }
      const arr = [...unlocked];
      await saveSettingsRow(item.character.id, arr, nextSelected);
      item.settings = { ...(item.settings || {}), unlocked_manas: arr, selected_mana: nextSelected };
    }));
    renderMana();
    window.dispatchEvent(new CustomEvent("aeriom:mana:change", { detail: { campaignId: state.campaignId, mana: manaId, all: true } }));
  }

  function updateStats(root) {
    const sheetCount = root.querySelectorAll("#aeriom-master-characters .aeriom-master-character").length;
    root.querySelector('[data-stat="adventurers"]')?.replaceChildren(document.createTextNode(String(sheetCount)));
    const contentItems = root.querySelectorAll("#aeriom-master-content .aeriom-content-item");
    const lower = [...contentItems].map(x => text(x.textContent).toLowerCase());
    const countType = token => lower.filter(x => x.includes(token)).length;
    root.querySelector('[data-stat="npcs"]')?.replaceChildren(document.createTextNode(String(countType("npc"))));
    root.querySelector('[data-stat="locations"]')?.replaceChildren(document.createTextNode(String(countType("local"))));
    root.querySelector('[data-stat="missions"]')?.replaceChildren(document.createTextNode(String(countType("miss"))));
  }

  function enhance() {
    const root = $("aeriom-master-controls-root");
    if (!root || !isMaster()) return;
    injectCss();
    normalizeDuplicateContent(root);
    classifyCards(root);
    buildHero(root);
    buildStats(root);
    renameSections(root);
    const cards = findCards(root);
    const by = cls => cards.find(c => c.classList.contains(cls));
    addAnchor(by("is-config"), "config");
    addAnchor(by("is-sheet"), "sheets");
    addAnchor(by("is-mana"), "mana");
    addAnchor(by("is-content"), "content");
    addAnchor(by("is-system"), "system");
    const live = by("is-live") || root.querySelector(".aeriom-live-media-card");
    if (live) { live.dataset.redesignAnchor = "media"; live.classList.add("aeriom-master-redesign-anchor"); }
    addConfigRail(by("is-config"));
    carousel(root);
    updateStats(root);
    setupMana().catch(error => console.warn("[AERIOM][MASTER REDESIGN][MANA]", error));
  }

  function observe() {
    if (state.observer) return;
    state.observer = new MutationObserver(() => {
      const root = $("aeriom-master-controls-root");
      if (!root || !isMaster()) return;
      if (state.boundHost === root && root.querySelector(":scope > .aeriom-master-redesign-shell")) {
        updateStats(root);
        return;
      }
      state.boundHost = root;
      window.setTimeout(enhance, 40);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    injectCss();
    observe();
    window.setTimeout(enhance, 250);
  }

  window.addEventListener("aeriom:campaign:ready", () => { state.boundHost = null; setTimeout(start, 160); });
  window.addEventListener("aeriom:campaigntabchange", event => { if (event.detail?.tab === "master-controls") { state.boundHost = null; setTimeout(start, 80); } });
  window.addEventListener("aeriom:master:refresh", () => { state.boundHost = null; setTimeout(start, 120); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
