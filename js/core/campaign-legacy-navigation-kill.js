/* AERIOM — remove a navegação antiga da mesa.
 * Deve rodar na entrada da campanha, independentemente da aba atual.
 * Não usa MutationObserver nem intervalos permanentes.
 */
(() => {
  "use strict";
  if (window.__AERIOM_LEGACY_NAV_KILL__) return;
  window.__AERIOM_LEGACY_NAV_KILL__ = true;

  const OLD = [
    "#campaign-mobile-actions",
    ".campaign-mobile-actions",
    "#aeriom-mobile-bottom-nav",
    ".aeriom-mobile-bottom-nav",
    "nav:has([data-bottom-tab])"
  ];

  function removeOldNavigation() {
    OLD.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (element.id === "aeriom-liquid-mobile-dock") return;
        element.remove();
      });
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
    window.setTimeout(removeOldNavigation, 50);
    window.setTimeout(removeOldNavigation, 300);
    window.setTimeout(removeOldNavigation, 1000);
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-campaign-tab], #campaign-mobile-actions-button")) {
      window.setTimeout(removeOldNavigation, 0);
      window.setTimeout(removeOldNavigation, 40);
    }
  }, true);

  window.addEventListener("aeriom:campaigntabchange", cleanupSoon);
  window.addEventListener("aeriom:campaign:ready", cleanupSoon);

  installGuardStyle();
  cleanupSoon();
})();
