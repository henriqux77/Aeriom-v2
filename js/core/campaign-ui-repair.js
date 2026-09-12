(() => {
  "use strict";

  const RELEASE = "20260912-master-shell3";

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

  function loadAtmosphere() {
    if (window.__AERIOM_ATMOSPHERE_BOOT__) return;
    window.__AERIOM_ATMOSPHERE_BOOT__ = true;
    const modules = [
      `./atmosphere-ui.js?v=${RELEASE}`,
      `./campaign-theme-runtime-clean.js?v=${RELEASE}`,
      `./campaign-theme-guard.js?v=${RELEASE}`,
      `./campaign-atmosphere-fix.js?v=${RELEASE}`,
      `./campaign-cinematic-clean.js?v=${RELEASE}`,
      `./campaign-cover-fix.js?v=${RELEASE}`
    ];
    Promise.allSettled(modules.map(specifier => import(specifier))).then(results => {
      results.filter(result => result.status === "rejected").forEach(result => console.error("[AERIOM][CAMPAIGN BOOT]", result.reason));
    });
  }

  function start() { loadStyles(); markCampaignShell(); cleanupEscapedText(); loadAtmosphere(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
