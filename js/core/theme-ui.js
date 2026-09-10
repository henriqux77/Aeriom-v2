import { getAvailableThemes, applyCampaignTheme } from "./theme.js";

(() => {
  "use strict";

  const caveBg = new URL("../../assets/themes/cave/background.webp", import.meta.url).href;

  const THEME_IMAGES = Object.freeze({
    default: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
    forest: "https://backiee.com/static/wallpapers/1000x563/392020.jpg",
    cave: caveBg,
    volcano: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
    castle: "https://static.wixstatic.com/media/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg/v1/fill/w_980,h_552,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg",
    coast: "https://wallpapercrafter.com/desktop/98690-fantasy-art-sea-ship-storm-lightning-video-games-cyan.jpg",
    ruins: "https://uploads.worldanvil.com/uploads/images/3ea699821c678eb3956df7a9cea2985b.jpg"
  });

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";

  function getCurrentTheme() {
    return String(
      ctx()?.campaign?.theme ||
      document.documentElement.dataset.theme ||
      "default"
    );
  }

  function render() {
    const root = $("campaign-theme-selector");
    if (!root) return;

    const current = getCurrentTheme();
    root.replaceChildren();

    getAvailableThemes().forEach(theme => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "campaign-theme-option" + (theme.id === current ? " is-active" : "");
      button.dataset.themeId = theme.id;
      button.disabled = !isMaster();
      button.title = isMaster()
        ? `Usar tema ${theme.name}`
        : "Somente o Mestre pode alterar a atmosfera da mesa.";

      const preview = document.createElement("div");
      preview.className = "campaign-theme-option__preview";
      const image = THEME_IMAGES[theme.id];
      if (image) {
        preview.style.backgroundImage = `linear-gradient(rgba(0,0,0,.24),rgba(0,0,0,.48)),url(\"${image.replaceAll("\"", "\\\"")}\")`;
      }

      const copy = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = theme.name;
      const span = document.createElement("span");
      span.textContent = theme.description;
      copy.append(strong, span);

      button.append(preview, copy);
      button.addEventListener("click", () => select(theme.id));
      root.appendChild(button);
    });
  }

  async function select(id) {
    const c = ctx();
    if (!isMaster() || !c?.supabase || !c.campaignId) return;

    try {
      const result = await c.supabase
        .from("campaigns")
        .update({ theme: id })
        .eq("id", c.campaignId);

      if (result.error) throw result.error;
      if (c.campaign) c.campaign.theme = id;

      await applyCampaignTheme(id, THEME_IMAGES[id] || null);
      render();
    } catch (error) {
      console.error("[AERIOM][THEME]", error);
    }
  }

  async function sync() {
    render();
    const theme = getCurrentTheme();
    await applyCampaignTheme(theme, THEME_IMAGES[theme] || null);
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(sync, 30));
  window.addEventListener("aeriom:campaigntheme", async event => {
    const theme = event.detail?.theme || "default";
    await applyCampaignTheme(theme, THEME_IMAGES[theme] || null);
    render();
  });
  window.addEventListener("aeriom:campaigntabchange", event => {
    if (event.detail?.tab === "theme") setTimeout(sync, 30);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { void sync(); }, { once: true });
  } else {
    void sync();
  }
})();