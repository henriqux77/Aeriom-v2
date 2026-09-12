(() => {
  "use strict";

  const STYLE = "./css/mestre-dashboard-final.css?v=20260912-final3";
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const text = v => String(v ?? "").trim();

  function css() {
    if ($("#aeriom-master-final-css")) return;
    const link = document.createElement("link");
    link.id = "aeriom-master-final-css";
    link.rel = "stylesheet";
    link.href = STYLE;
    document.head.appendChild(link);
  }

  function removeDuplicateHeroes(root) {
    const shells = $$("#campaign-panel-master-controls .aeriom-master-redesign-shell");
    shells.slice(1).forEach(node => node.remove());
    const heroes = $$("#campaign-panel-master-controls .aeriom-master-redesign-hero");
    heroes.slice(1).forEach(node => node.remove());
    const headings = $$("#campaign-panel-master-controls > .campaign-panel__heading");
    headings.forEach(node => node.remove());
  }

  function cleanHeroText() {
    const root = $("#campaign-panel-master-controls");
    if (!root) return;
    const p = root.querySelector(".aeriom-master-redesign-hero p");
    if (p && text(p.textContent).toLowerCase() === "teste") p.classList.add("is-placeholder-description");
  }

  function addGuideButtons() {
    const guide = $("#campaign-panel-master-controls .aeriom-master-redesign-guide");
    if (!guide) return;
    const existing = new Set($$("button", guide).map(b => b.dataset.redesignTarget));
    const extras = [["content", "▤", "Conteúdo"], ["theme", "✦", "Aparência"]];
    extras.forEach(([id, icon, label]) => {
      if (existing.has(id)) return;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.redesignTarget = id;
      b.innerHTML = `<span>${icon}</span>${label}`;
      b.addEventListener("click", () => {
        if (id === "theme") {
          const tab = $$("[data-campaign-tab]").find(x => x.dataset.campaignTab === "theme");
          tab?.click();
          return;
        }
        document.querySelector(".aeriom-master-redesign-anchor[data-redesign-anchor=content]")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      guide.appendChild(b);
    });
  }

  function hideContentCard(root) {
    const card = root.querySelector(".aeriom-master-grid > .aeriom-master-card.is-content");
    if (card) card.classList.add("aeriom-master-content-deprioritized");
  }

  function fixCarousel() {
    const root = $("#campaign-panel-master-controls");
    const list = root?.querySelector("#aeriom-master-characters");
    const viewport = root?.querySelector(".aeriom-master-carousel__viewport");
    if (!list || !viewport || viewport.dataset.finalCarousel === "1") return;
    viewport.dataset.finalCarousel = "1";
    root.querySelectorAll(".aeriom-master-carousel__arrow").forEach((button, index) => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const amount = Math.max(210, Math.round(viewport.clientWidth * 0.88));
        list.scrollBy({ left: index === 0 ? -amount : amount, behavior: "smooth" });
      }, true);
    });
  }

  function manaFlames() {
    const buttons = $$("#campaign-panel-master-controls .aeriom-mana-manager button, #campaign-panel-master-controls .aeriom-master-repair-mana button, #campaign-panel-master-controls [data-mana-id]");
    buttons.forEach(button => {
      const id = text(button.dataset.manaId || button.dataset.mana || "").toLowerCase();
      if (["azul", "roxa", "dourada", "branca"].includes(id)) button.classList.add("aeriom-mana-fire", id);
    });
  }

  function run() {
    const root = $("#campaign-panel-master-controls");
    if (!root) return;
    css();
    removeDuplicateHeroes(root);
    cleanHeroText();
    addGuideButtons();
    hideContentCard(root);
    fixCarousel();
    manaFlames();
  }

  let timer = 0;
  let started = false;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 80);
  };

  function boot() {
    if (started) return;
    started = true;
    window.addEventListener("aeriom:campaign:ready", schedule);
    window.addEventListener("aeriom:campaigntabchange", schedule);
    window.addEventListener("aeriom:master:refresh", schedule);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else schedule();
  }

  boot();
})();
