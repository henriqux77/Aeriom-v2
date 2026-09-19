(() => {
  "use strict";

  const RELEASE = "20260919-atmosphere-order1";

  function loadStyles() {
    if (document.getElementById("aeriom-campaign-repair-css")) return;
    const link = document.createElement("link");
    link.id = "aeriom-campaign-repair-css";
    link.rel = "stylesheet";
    link.href = `./css/campaign-repair.css?v=${RELEASE}`;
    document.head.appendChild(link);
  }

  function markCampaignShell() { document.documentElement.classList.add("aeriom-campaign-shell"); }

  function cleanupEscapedText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const remove = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue?.trim() === "\\n") remove.push(walker.currentNode);
    remove.forEach(node => node.remove());
  }

  async function loadAtmosphere() {
    if (window.__AERIOM_ATMOSPHERE_BOOT_PROMISE__) {
      return window.__AERIOM_ATMOSPHERE_BOOT_PROMISE__;
    }

    if (window.__AERIOM_ATMOSPHERE_BOOT__) {
      return window.__AERIOM_ATMOSPHERE_READY_PROMISE__ || Promise.resolve();
    }

    window.__AERIOM_ATMOSPHERE_BOOT__ = true;

    const modules = [
      `./atmosphere-ui.js?v=${RELEASE}`,
      `./campaign-theme-runtime-clean.js?v=${RELEASE}`,
      `./campaign-theme-guard.js?v=${RELEASE}`,
      `./campaign-atmosphere-fix.js?v=${RELEASE}`,
      `./campaign-cinematic-clean.js?v=${RELEASE}`,
      `./campaign-cover-fix.js?v=${RELEASE}`
    ];

    window.__AERIOM_ATMOSPHERE_BOOT_PROMISE__ = (async () => {
      try {
        /*
         * Atmosphere owns hydration from Supabase. Do not let dependent
         * modules execute before the persisted palette/background exists.
         */
        await import(modules[0]);
        if (window.__AERIOM_ATMOSPHERE_READY_PROMISE__) {
          await window.__AERIOM_ATMOSPHERE_READY_PROMISE__;
        }

        for (const specifier of modules.slice(1)) {
          try {
            await import(specifier);
          } catch (error) {
            console.error("[AERIOM][CAMPAIGN BOOT]", error);
          }
        }
      } catch (error) {
        console.error("[AERIOM][CAMPAIGN BOOT]", error);
      }
    })();

    return window.__AERIOM_ATMOSPHERE_BOOT_PROMISE__;
  }
  function start() { loadStyles(); markCampaignShell(); cleanupEscapedText(); loadAtmosphere(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
