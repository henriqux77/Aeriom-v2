(() => {
  "use strict";

  if (window.__AERIOM_CAMPAIGN_INTERACTION_REPAIR__) return;
  window.__AERIOM_CAMPAIGN_INTERACTION_REPAIR__ = true;

  const panels = () => [...document.querySelectorAll("[data-campaign-panel]")];
  const tabs = () => [...document.querySelectorAll("[data-campaign-tab]")];

  function activate(tabId) {
    if (!tabId) return false;
    const target = panels().find(panel => panel.dataset.campaignPanel === tabId);
    if (!target) return false;

    tabs().forEach(button => {
      button.classList.toggle("is-active", button.dataset.campaignTab === tabId);
      button.setAttribute("aria-current", button.dataset.campaignTab === tabId ? "page" : "false");
    });

    panels().forEach(panel => {
      const active = panel === target;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    document.documentElement.dataset.campaignTab = tabId;
    window.dispatchEvent(new CustomEvent("aeriom:campaigntabchange", { detail: { tab: tabId, repaired: true } }));
    return true;
  }

  function ensureInitial() {
    const active = tabs().find(button => button.classList.contains("is-active"));
    const firstVisiblePanel = panels().find(panel => !panel.hidden);
    const tabId = active?.dataset.campaignTab || firstVisiblePanel?.dataset.campaignPanel || tabs()[0]?.dataset.campaignTab;
    if (tabId && panels().some(panel => panel.dataset.campaignPanel === tabId)) activate(tabId);
  }

  document.addEventListener("click", event => {
    const button = event.target?.closest?.("[data-campaign-tab]");
    if (!button) return;
    const tabId = button.dataset.campaignTab;
    if (!activate(tabId)) return;
  }, false);

  window.addEventListener("aeriom:campaign:ready", () => {
    window.setTimeout(ensureInitial, 0);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureInitial, { once: true });
  } else {
    window.setTimeout(ensureInitial, 0);
  }
})();
