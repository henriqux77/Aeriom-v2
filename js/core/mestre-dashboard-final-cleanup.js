(() => {
  "use strict";

  const ROOT = "#campaign-panel-master-controls";
  const root = () => document.querySelector(ROOT);

  function cleanDuplicateHero(host) {
    const heroes = [...host.querySelectorAll(":scope > .aeriom-master-redesign-hero")];
    if (heroes.length > 1) heroes.slice(1).forEach(el => el.remove());
    // A descrição pertence à configuração da campanha, não ao banner.
    heroes.forEach(hero => hero.querySelector(".aeriom-master-redesign-hero__content > p")?.remove());
  }

  function removeLegacyHero(host) {
    host.querySelectorAll(":scope > .aeriom-master-redesign-shell").forEach(shell => {
      const heroes = [...shell.querySelectorAll(":scope > .aeriom-master-redesign-hero")];
      if (heroes.length > 1) heroes.slice(1).forEach(el => el.remove());
      heroes.forEach(hero => hero.querySelector(".aeriom-master-redesign-hero__content > p")?.remove());
    });
  }

  function hideDashboardContent(host) {
    const card = [...host.querySelectorAll(":scope > .aeriom-master-grid > .aeriom-master-card")]
      .find(el => /conteúdo da campanha|conteudo da campanha/i.test(el.querySelector("h3")?.textContent || ""));
    if (card) card.classList.add("aeriom-master-content-secondary");
  }

  function improvePortraitSheets(host) {
    const list = host.querySelector("#aeriom-master-characters");
    if (!list) return;
    list.classList.add("aeriom-master-portrait-list");
    list.querySelectorAll(".aeriom-master-character").forEach(card => card.classList.add("aeriom-master-portrait-card"));
  }

  function enhance() {
    const host = root();
    if (!host) return;
    cleanDuplicateHero(host);
    removeLegacyHero(host);
    hideDashboardContent(host);
    improvePortraitSheets(host);
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; enhance(); }, 80);
  }

  window.addEventListener("aeriom:campaign:ready", schedule);
  window.addEventListener("aeriom:campaigntabchange", event => {
    if (event.detail?.tab === "master-controls") schedule();
  });
  window.addEventListener("aeriom:master:refresh", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
})();
