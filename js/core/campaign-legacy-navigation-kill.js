/* AERIOM — remove a navegação antiga da mesa.
 * A barra antiga visível no mobile usa rótulos MESA/DADOS/COMBATE/MAPAS/MAPA-HISTÓRICO
 * e não é a dock líquida. Este módulo remove os elementos legados e também detecta
 * qualquer contêiner equivalente por conteúdo/posição, sem MutationObserver permanente.
 */
(() => {
  "use strict";
  if (window.__AERIOM_LEGACY_NAV_KILL_V2__) return;
  window.__AERIOM_LEGACY_NAV_KILL_V2__ = true;

  const OLD = [
    "#campaign-mobile-actions",
    ".campaign-mobile-actions",
    "#aeriom-mobile-bottom-nav",
    ".aeriom-mobile-bottom-nav",
    "nav:has([data-bottom-tab])"
  ];

  const OLD_LABELS = ["mesa", "dados", "combate", "mapas", "mapa / histórico"];

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isLegacyLabelBar(element) {
    if (!element || element.id === "aeriom-liquid-mobile-dock") return false;
    const text = normalize(element.textContent);
    if (!text) return false;
    const matches = OLD_LABELS.filter(label => text.includes(label));
    if (matches.length < 4) return false;

    const buttons = element.querySelectorAll("button");
    if (buttons.length < 4 || buttons.length > 8) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const nearBottom = rect.bottom >= window.innerHeight - 170;
    const compactHeight = rect.height > 45 && rect.height < 170;
    const fixedish = style.position === "fixed" || style.position === "sticky" || nearBottom;
    return compactHeight && fixedish;
  }

  function removeOldNavigation() {
    OLD.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (element.id !== "aeriom-liquid-mobile-dock") element.remove();
      });
    });

    document.querySelectorAll("body *").forEach(element => {
      if (isLegacyLabelBar(element)) {
        element.remove();
      }
    });
  }

  function installGuardStyle() {
    if (document.getElementById("aeriom-legacy-nav-kill-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-legacy-nav-kill-style";
    style.textContent = `
      .aeriom-page--campaign #campaign-mobile-actions,
      .aeriom-page--campaign .campaign-mobile-actions,
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

  function cleanupSoon() {
    removeOldNavigation();
    window.setTimeout(removeOldNavigation, 0);
    window.setTimeout(removeOldNavigation, 80);
    window.setTimeout(removeOldNavigation, 250);
    window.setTimeout(removeOldNavigation, 600);
    window.setTimeout(removeOldNavigation, 1200);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-campaign-tab], #campaign-mobile-actions-button, #aeriom-mobile-bottom-nav")) {
      cleanupSoon();
    }
  }, true);

  window.addEventListener("aeriom:campaigntabchange", cleanupSoon);
  window.addEventListener("aeriom:campaign:ready", cleanupSoon);

  installGuardStyle();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanupSoon, { once: true });
  } else {
    cleanupSoon();
  }
})();
