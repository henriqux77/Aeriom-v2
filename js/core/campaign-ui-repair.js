(() => {
  "use strict";

  function loadStyles() {
    if (document.getElementById("aeriom-campaign-repair-css")) return;
    const link = document.createElement("link");
    link.id = "aeriom-campaign-repair-css";
    link.rel = "stylesheet";
    link.href = "./css/campaign-repair.css?v=20260911-stable";
    document.head.appendChild(link);
  }

  function markCampaignShell() {
    document.documentElement.classList.add("aeriom-campaign-shell");
  }

  function cleanupEscapedText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const remove = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue?.trim() === "\\n") remove.push(walker.currentNode);
    }
    remove.forEach(node => node.remove());
  }

  function loadAtmosphere() {
    if (window.__AERIOM_ATMOSPHERE_BOOT__) return;
    window.__AERIOM_ATMOSPHERE_BOOT__ = true;
    Promise.allSettled([
      import("./atmosphere-ui.js?v=20260911-stable"),
      import("./campaign-atmosphere-patch.js?v=20260911-stable")
    ]).then(results => {
      results.filter(r => r.status === "rejected").forEach(r => console.error("[AERIOM][ATMOSPHERE BOOT]", r.reason));
    });
  }

  function start() {
    loadStyles();
    markCampaignShell();
    cleanupEscapedText();
    loadAtmosphere();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
