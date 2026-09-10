(() => {
  "use strict";

  function loadStyles() {
    if (document.getElementById("aeriom-campaign-repair-css")) return;
    const link = document.createElement("link");
    link.id = "aeriom-campaign-repair-css";
    link.rel = "stylesheet";
    link.href = "./css/campaign-repair.css?v=20260910-02";
    document.head.appendChild(link);
  }

  function markCampaignShell() {
    document.documentElement.classList.add("aeriom-campaign-shell");
  }

  function start() {
    loadStyles();
    markCampaignShell();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();