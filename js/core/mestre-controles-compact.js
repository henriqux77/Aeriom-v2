(() => {
  "use strict";

  const STYLE_ID = "aeriom-master-redesign-css";
  const CSS_URL = "./css/mestre-controles-redesign.css?v=20260912-master-redesign1";

  const context = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const root = () => document.getElementById("aeriom-master-controls-root");

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = CSS_URL;
    document.head.appendChild(link);
  }

  function text(value) {
    return String(value || "").trim();
  }

  function addCardSemanticClasses(host) {
    host.querySelectorAll(":scope > .aeriom-master-grid > .aeriom-master-card").forEach(card => {
      const title = text(card.querySelector(".aeriom-master-card__head h3, h3")?.textContent).toLowerCase();
      card.classList.remove("is-config", "is-quick", "is-sheet", "is-mana", "is-live", "is-sessions", "is-tools");
      if (title.includes("configura")) card.classList.add("is-config");
      else if (title.includes("açõ") || title.includes("ações")) card.classList.add("is-quick");
      else if (title.includes("ficha")) card.classList.add("is-sheet");
      else if (title.includes("mana")) card.classList.add("is-mana");
      else if (title.includes("transmiss")) card.classList.add("is-live");
      else if (title.includes("últimas") || title.includes("sessões")) card.classList.add("is-sessions");
      else if (title.includes("ferramentas")) card.classList.add("is-tools");
    });
  }

  function campaignTitle() {
    const c = context()?.campaign || {};
    return text(c.name) || text(document.querySelector("#campaign-master-controls-title")?.textContent) || "Campanha";
  }

  function campaignDescription() {
    const c = context()?.campaign || {};
    return text(c.description) || "Tudo o que você precisa para criar histórias inesquecíveis.";
  }

  function campaignImage() {
    const c = context()?.campaign || {};
    return text(c.coverUrl) || text(c.backgroundUrl) || "./assets/themes/aeriom/default.svg";
  }

  function countPresentCharacters(host) {
    const direct = host.querySelectorAll(".aeriom-master-character").length;
    const v2 = host.querySelectorAll("[data-v2-sheet-host] .aeriom-master-v2-row").length;
    return Math.max(direct, v2);
  }

  function makeStat(icon, label, value, sub) {
    const card = document.createElement("article");
    card.className = "aeriom-master-redesign-stat";
    card.innerHTML = `<div class="aeriom-master-redesign-stat__icon" aria-hidden="true">${icon}</div><div><span class="aeriom-master-redesign-stat__value">${value}</span><span class="aeriom-master-redesign-stat__label">${label}</span><div class="aeriom-master-redesign-stat__sub">${sub}</div></div>`;
    return card;
  }

  function ensureHero(host) {
    let hero = host.querySelector(":scope > .aeriom-master-redesign-hero");
    if (!hero) {
      hero = document.createElement("section");
      hero.className = "aeriom-master-redesign-hero";
      hero.setAttribute("aria-label", "Controle do Mestre");
      host.insertBefore(hero, host.firstChild);
    }
    const image = campaignImage().replaceAll('"', "\\\"");
    hero.style.backgroundImage = `linear-gradient(180deg,rgba(4,7,10,.08),rgba(4,7,10,.88)),url("${image}")`;
    hero.innerHTML = `<div class="aeriom-master-redesign-hero__content"><div class="aeriom-master-redesign-crumb"><span>⌂</span><span>Campanha</span><span>›</span><strong>Controle do Mestre</strong></div><div class="aeriom-master-redesign-kicker">✦ MESA DO MESTRE</div><h1>Controle do Mestre</h1><p>${campaignDescription()}</p><div class="aeriom-master-redesign-quote">“Grandes aventuras começam com um grande mestre.”</div></div>`;
  }

  function ensureStats(host) {
    let stats = host.querySelector(":scope > .aeriom-master-redesign-stats");
    if (!stats) {
      stats = document.createElement("section");
      stats.className = "aeriom-master-redesign-stats";
      host.insertBefore(stats, host.querySelector(":scope > .aeriom-master-grid") || null);
    }
    const characters = countPresentCharacters(host);
    stats.replaceChildren(
      makeStat("♟", "Aventureiros", characters, "Na campanha"),
      makeStat("♙", "NPCs", "—", "Cadastrados"),
      makeStat("⌖", "Locais", "—", "Mapeados"),
      makeStat("▤", "Missões", "—", "Ativas"),
      makeStat("◷", "Última sessão", "—", "Agendada")
    );
  }

  function enhance() {
    const host = root();
    if (!host) return;
    injectCss();
    ensureHero(host);
    ensureStats(host);
    addCardSemanticClasses(host);
  }

  function start() {
    injectCss();
    enhance();
    const host = root();
    if (!host || host.dataset.masterRedesignObserved === "1") return;
    host.dataset.masterRedesignObserved = "1";
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        enhance();
      });
    });
    observer.observe(host, { childList:true, subtree:true });
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(start, 120));
  window.addEventListener("aeriom:campaigntabchange", event => {
    if (event.detail?.tab === "master-controls") setTimeout(start, 80);
    if (event.detail?.tab === "overview") setTimeout(enhance, 120);
  });
  window.addEventListener("aeriom:master:refresh", () => setTimeout(enhance, 80));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else setTimeout(start, 80);
})();
