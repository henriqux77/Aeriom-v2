/* AERIOM — limpeza segura da navegação legada.
 * Importante: #campaign-mobile-actions é o menu de três pontos da mesa.
 * Ele NÃO é navegação legada e nunca deve ser removido ou ocultado aqui.
 */
(() => {
  "use strict";

  if (window.__AERIOM_LEGACY_NAV_KILL_V3__) return;
  window.__AERIOM_LEGACY_NAV_KILL_V3__ = true;

  const LEGACY_SELECTORS = [
    "#aeriom-mobile-bottom-nav",
    ".aeriom-mobile-bottom-nav",
    "nav:has([data-bottom-tab])"
  ];

  const LEGACY_LABELS = [
    "mesa",
    "dados",
    "combate",
    "mapas",
    "mapa / histórico"
  ];

  const normalize = value => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

  function isLegacyLabelBar(element) {
    if (!element || element.id === "aeriom-liquid-mobile-dock") return false;

    const tag = String(element.tagName || "").toLowerCase();
    if (tag !== "nav" && !element.matches("[class*=bottom], [class*=mobile-nav], [data-bottom-navigation]")) {
      return false;
    }

    const text = normalize(element.textContent);
    const matches = LEGACY_LABELS.filter(label => text.includes(label));
    if (matches.length < 4) return false;

    const buttons = element.querySelectorAll("button, a");
    if (buttons.length < 4 || buttons.length > 8) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const nearBottom = rect.bottom >= window.innerHeight - 180;
    const compactHeight = rect.height >= 45 && rect.height <= 180;
    const fixedish = style.position === "fixed" || style.position === "sticky" || nearBottom;

    return compactHeight && fixedish;
  }

  function removeLegacyNavigation() {
    LEGACY_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => element.remove());
    });

    document.querySelectorAll("nav, [class*=bottom], [class*=mobile-nav], [data-bottom-navigation]")
      .forEach(element => {
        if (element.id === "aeriom-liquid-mobile-dock") return;
        if (isLegacyLabelBar(element)) element.remove();
      });
  }

  function installStyle() {
    if (document.getElementById("aeriom-legacy-nav-kill-v3-style")) return;

    const style = document.createElement("style");
    style.id = "aeriom-legacy-nav-kill-v3-style";
    style.textContent = `
      .aeriom-page--campaign #aeriom-mobile-bottom-nav,
      .aeriom-page--campaign .aeriom-mobile-bottom-nav,
      .aeriom-page--campaign nav:has([data-bottom-tab]) {
        display:none!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function repairOverflowMenu() {
    const button = document.getElementById("campaign-mobile-actions-button");
    const menu = document.getElementById("campaign-mobile-actions");
    if (!button || !menu || button.dataset.aeriomOverflowRepair === "1") return;

    // O fluxo original do campanha.html já faz o binding. Só criamos fallback
    // quando ele não conseguiu registrar o botão.
    if (button.dataset.aeriomBound !== "1") {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        const open = menu.hidden;
        menu.hidden = !open;
        menu.classList.toggle("is-open", open);
        button.setAttribute("aria-expanded", String(open));
      });
    }

    if (menu.hidden == null) menu.hidden = true;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", String(!menu.hidden));
    button.dataset.aeriomOverflowRepair = "1";
  }

  function closeOverflowOutside(event) {
    const button = document.getElementById("campaign-mobile-actions-button");
    const menu = document.getElementById("campaign-mobile-actions");
    if (!button || !menu || menu.hidden) return;
    if (event.target.closest("#campaign-mobile-actions-button, #campaign-mobile-actions")) return;
    menu.hidden = true;
    menu.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }

  function run() {
    installStyle();
    repairOverflowMenu();
    removeLegacyNavigation();
  }

  document.addEventListener("click", closeOverflowOutside, true);
  window.addEventListener("aeriom:campaign:ready", run);
  window.addEventListener("aeriom:campaigntabchange", run);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
