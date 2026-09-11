(() => {
  "use strict";

  function loadStyles() {
    if (document.getElementById("aeriom-campaign-repair-css")) return;
    const link = document.createElement("link");
    link.id = "aeriom-campaign-repair-css";
    link.rel = "stylesheet";
    link.href = "./css/campaign-repair.css?v=20260910-04";
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

  function start() {
    loadStyles();
    markCampaignShell();
    cleanupEscapedText();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
