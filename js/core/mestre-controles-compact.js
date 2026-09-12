(() => {
  "use strict";
  const STYLE_ID = "aeriom-master-redesign-css";
  const CSS_URL = "./css/mestre-controles-redesign.css?v=20260912-master-redesign2";
  const root = () => document.getElementById("aeriom-master-controls-root");
  const text = value => String(value || "").trim();

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = CSS_URL;
    document.head.appendChild(link);
  }

  function addCardSemanticClasses(host) {
    host.querySelectorAll(":scope > .aeriom-master-grid > .aeriom-master-card").forEach(card => {
      const title = text(card.querySelector(".aeriom-master-card__head h3, h3")?.textContent).toLowerCase();
      card.classList.remove("is-config", "is-quick", "is-sheet", "is-mana", "is-live", "is-sessions", "is-tools", "is-content");
      if (title.includes("configura")) card.classList.add("is-config");
      else if (title.includes("açõ") || title.includes("ações")) card.classList.add("is-quick");
      else if (title.includes("ficha")) card.classList.add("is-sheet");
      else if (title.includes("mana")) card.classList.add("is-mana");
      else if (title.includes("transmiss")) card.classList.add("is-live");
      else if (title.includes("últimas") || title.includes("sessões")) card.classList.add("is-sessions");
      else if (title.includes("ferramentas")) card.classList.add("is-tools");
      else if (title.includes("conteúdo") || title.includes("conteudo")) card.classList.add("is-content");
    });
  }

  function enhance() {
    const host = root();
    if (!host) return;
    injectCss();
    addCardSemanticClasses(host);
  }

  let observer = null;
  let queued = false;
  function startObserver(host) {
    if (!host || observer) return;
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; if (host.isConnected) enhance(); });
    });
    observer.observe(host, { childList: true, subtree: true });
  }

  function start() { injectCss(); enhance(); startObserver(root()); }
  window.addEventListener("aeriom:campaign:ready", () => setTimeout(start, 120));
  window.addEventListener("aeriom:campaigntabchange", event => { if (event.detail?.tab === "master-controls") setTimeout(start, 80); });
  window.addEventListener("aeriom:master:refresh", () => setTimeout(enhance, 80));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else setTimeout(start, 80);
})();
