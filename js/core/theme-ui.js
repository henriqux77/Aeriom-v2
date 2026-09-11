import { getAvailableThemes, getTheme, applyCampaignTheme } from "./theme.js";
import "./campaign-live-media.js";
import "./campaign-ui-repair.js";
import "./mestre-controles-v2.js";

(() => {
  "use strict";

  const caveBg = new URL("../../assets/themes/cave/background.webp", import.meta.url).href;
  const THEME_IMAGES = Object.freeze({
    default: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=82",
    forest: "https://backiee.com/static/wallpapers/1000x563/392020.jpg",
    cave: caveBg,
    volcano: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=82",
    castle: "https://static.wixstatic.com/media/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg/v1/fill/w_1600,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg",
    coast: "https://wallpapercrafter.com/desktop/98690-fantasy-art-sea-ship-storm-lightning-video-games-cyan.jpg",
    ruins: "https://uploads.worldanvil.com/uploads/images/3ea699821c678eb3956df7a9cea2985b.jpg"
  });

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;

  function themeBridge(themeId) {
    const root = document.documentElement;
    const vars = getTheme(themeId)?.variables || {};
    const accent = vars["--theme-accent"] || "#d8b65f";
    const accentLight = vars["--theme-accent-light"] || accent;
    const accentDark = vars["--theme-accent-dark"] || accent;
    const bg = vars["--theme-bg"] || "#090807";
    const surface = vars["--theme-surface"] || "#11100e";
    const danger = vars["--theme-danger"] || "#c87979";
    const mana = vars["--theme-mana"] || "#3f72b7";

    root.style.setProperty("--campaign-bg", bg);
    root.style.setProperty("--campaign-surface", surface);
    root.style.setProperty("--campaign-surface-2", surface);
    root.style.setProperty("--campaign-surface-3", surface);
    root.style.setProperty("--campaign-gold", accent);
    root.style.setProperty("--campaign-gold-soft", `color-mix(in srgb, ${accent} 12%, transparent)`);
    root.style.setProperty("--campaign-danger", danger);
    root.style.setProperty("--campaign-theme-accent-light", accentLight);
    root.style.setProperty("--campaign-theme-accent-dark", accentDark);
    root.style.setProperty("--campaign-theme-mana", mana);
    root.dataset.theme = themeId;
  }

  async function resolveCampaignBackground(campaign) {
    const path = campaign?.backgroundPath || campaign?.background_path || null;
    const c = ctx();
    if (!path || !c?.supabase) return null;
    try {
      const { data, error } = await c.supabase.storage.from("campaign-covers").createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }

  async function applyCampaignVisuals(themeId, campaignOverride = null) {
    const c = ctx();
    themeBridge(themeId);
    const campaign = campaignOverride || c?.campaign || {};
    const customBackground = await resolveCampaignBackground(campaign);
    const background = customBackground || THEME_IMAGES[themeId] || THEME_IMAGES.default;
    await applyCampaignTheme(themeId, background);
  }

  async function loadCampaignVisualState() {
    const c = ctx();
    const cid = campaignId();
    if (!c?.supabase || !cid) return;
    const result = await c.supabase.from("campaigns").select("id,theme,background_path").eq("id", cid).maybeSingle();
    if (result.error || !result.data) return;
    if (c.campaign) {
      c.campaign.theme = result.data.theme || "default";
      c.campaign.backgroundPath = result.data.background_path || null;
    }
    await applyCampaignVisuals(result.data.theme || "default", {
      theme: result.data.theme || "default",
      backgroundPath: result.data.background_path || null
    });
  }

  function getCurrentTheme() {
    return String(ctx()?.campaign?.theme || document.documentElement.dataset.theme || "default");
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
      button.title = isMaster() ? `Usar tema ${theme.name}` : "Somente o Mestre pode alterar a atmosfera da mesa.";

      const preview = document.createElement("div");
      preview.className = "campaign-theme-option__preview";
      const image = THEME_IMAGES[theme.id];
      if (image) preview.style.backgroundImage = `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.55)),url("${String(image).replaceAll('"', '\\"')}")`;

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
    const cid = campaignId();
    if (!isMaster() || !c?.supabase || !cid || !getTheme(id)) return;
    try {
      const result = await c.supabase.from("campaigns").update({ theme: id }).eq("id", cid);
      if (result.error) throw result.error;
      if (c.campaign) c.campaign.theme = id;
      await applyCampaignVisuals(id, c.campaign || { theme: id });
      render();
      window.dispatchEvent(new CustomEvent("aeriom:campaigntheme", { detail: { campaignId: cid, theme: id, backgroundPath: c.campaign?.backgroundPath || null } }));
    } catch (error) {
      console.error("[AERIOM][THEME]", error);
    }
  }

  function subscribeCampaignTheme() {
    const c = ctx();
    const cid = campaignId();
    if (!c?.supabase || !cid || window.__AERIOM_CAMPAIGN_THEME_CHANNEL__) return;
    window.__AERIOM_CAMPAIGN_THEME_CHANNEL__ = c.supabase.channel(`campaign-theme:${cid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campaigns", filter: `id=eq.${cid}` }, payload => {
        const next = payload.new || {};
        if (c.campaign) {
          c.campaign.theme = next.theme || "default";
          c.campaign.backgroundPath = next.background_path || null;
        }
        void applyCampaignVisuals(next.theme || "default", { theme: next.theme || "default", backgroundPath: next.background_path || null });
        render();
      })
      .subscribe();
  }

  async function sync() {
    render();
    await loadCampaignVisualState();
    render();
    subscribeCampaignTheme();
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(() => { void sync(); }, 80));
  window.addEventListener("aeriom:campaigntheme", async event => {
    const theme = event.detail?.theme || "default";
    const c = ctx();
    if (c?.campaign) {
      c.campaign.theme = theme;
      if (event.detail?.backgroundPath !== undefined) c.campaign.backgroundPath = event.detail.backgroundPath;
    }
    await applyCampaignVisuals(theme, c?.campaign || { theme });
    render();
  });
  window.addEventListener("aeriom:campaigntabchange", event => {
    if (event.detail?.tab === "theme") setTimeout(() => void sync(), 30);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { void sync(); }, { once: true });
  else void sync();
})();