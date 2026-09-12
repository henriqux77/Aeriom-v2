(() => {
  "use strict";

  document.addEventListener("click", event => {
    const button = event.target?.closest?.("[data-atm-theme]");
    if (!button) return;
    const id = button.dataset.atmTheme;
    if (!id) return;
    const ctx = window.AERIOM_CAMPAIGN?.getContext?.() || {};
    if (String(ctx?.membership?.role || "").toLowerCase() !== "master") return;
    window.dispatchEvent(new CustomEvent("aeriom:atmospherechange", {
      detail: { campaignId: ctx?.campaignId || ctx?.campaign?.id || null, settings: { preset:id } }
    }));
  }, true);
})();
