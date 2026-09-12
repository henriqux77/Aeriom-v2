(() => {
  "use strict";

  const IMAGES = Object.freeze({
    default: "./assets/themes/aeriom/default.svg",
    forest: "./assets/themes/aeriom/forest.svg",
    cave: "./assets/themes/aeriom/cave.svg",
    volcano: "./assets/themes/aeriom/volcano.svg",
    castle: "./assets/themes/aeriom/castle.svg",
    coast: "./assets/themes/aeriom/coast.svg",
    ruins: "./assets/themes/aeriom/ruins.svg"
  });

  let observer = null;
  let lastHost = null;
  let controlsBoundHost = null;

  const context = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(context()?.membership?.role || "").toLowerCase() === "master";
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || context()?.campaignId || context()?.campaign?.id || null;

  function dispatch(settings = {}) {
    window.dispatchEvent(new CustomEvent("aeriom:atmospherechange", {
      detail: { campaignId: campaignId(), settings: { ...settings } }
    }));
  }

  function currentSettings(host) {
    const value = name => host.querySelector(`[data-atm-range="${name}"]`)?.value;
    const selected = name => host.querySelector(`[data-atm-select="${name}"]`)?.value;
    const checked = name => host.querySelector(`[data-cin-toggle="${name}"]`)?.checked;
    const preset = document.documentElement.dataset.theme || "default";
    const s = {
      preset,
      intensity: Number(value("intensity") ?? 55),
      surface_opacity: Number(value("surface_opacity") ?? 88),
      vignette: Number(value("vignette") ?? 42),
      grain: Number(value("grain") ?? 0),
      glow: Number(value("glow") ?? 20),
      blur: Number(value("blur") ?? 0),
      lighting: selected("lighting") || "balanced",
      scene_mode: selected("scene_mode") || "immersive",
      animations_enabled: checked("animations_enabled"),
      particles_enabled: checked("particles_enabled"),
      particle_density: Number(value("particle_density") ?? 12),
      animation_speed: Number(value("animation_speed") ?? 62) / 100
    };
    return s;
  }

  function paintImages(host) {
    host.querySelectorAll("[data-theme-image]").forEach(node => {
      const id = node.dataset.themeImage || "default";
      const url = IMAGES[id] || IMAGES.default;
      node.style.backgroundImage = `url(${JSON.stringify(url)})`;
      node.style.backgroundSize = "cover";
      node.style.backgroundPosition = "center";
      node.style.backgroundRepeat = "no-repeat";
    });

    const active = host.querySelector("[data-atm-theme].is-active");
    const id = active?.dataset.atmTheme || document.documentElement.dataset.theme || "default";
    const image = IMAGES[id] || IMAGES.default;
    const hero = host.querySelector(".aeriom-atmosphere__hero");
    if (hero) hero.style.setProperty("--aeriom-theme-image", `url(${JSON.stringify(image)})`);
  }

  function bindControls(host) {
    if (!host || controlsBoundHost === host) return;
    controlsBoundHost = host;

    host.addEventListener("input", event => {
      if (!isMaster() || !event.target?.matches?.("[data-atm-range]")) return;
      const f = event.target.dataset.atmRange;
      const v = Number(event.target.value);
      const out = host.querySelector(`[data-atm-value="${f}"]`);
      if (out) out.textContent = f === "animation_speed" ? `${Math.round(v)}%` : f === "blur" ? `${Math.round(v)}px` : `${Math.round(v)}%`;
      dispatch(currentSettings(host));
    }, true);

    host.addEventListener("change", event => {
      if (!isMaster()) return;
      if (event.target?.matches?.("[data-cin-toggle]")) dispatch(currentSettings(host));
      if (event.target?.matches?.("[data-atm-select]")) dispatch(currentSettings(host));
      if (event.target?.matches?.("[data-atm-theme]")) setTimeout(() => { paintImages(host); dispatch(currentSettings(host)); }, 50);
    }, true);
  }

  function enhance() {
    const host = document.getElementById("campaign-theme-selector");
    if (!host) return;
    paintImages(host);
    bindControls(host);
    lastHost = host;
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(() => {
      const host = document.getElementById("campaign-theme-selector");
      if (host !== lastHost || host?.querySelector("[data-theme-image]")) enhance();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  observe();
  window.addEventListener("aeriom:campaign:ready", () => setTimeout(enhance, 250));
  window.addEventListener("aeriom:campaigntabchange", event => { if (event.detail?.tab === "theme") setTimeout(enhance, 100); });
  window.addEventListener("aeriom:atmospherechange", () => setTimeout(enhance, 30));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(enhance, 300), { once: true });
  else setTimeout(enhance, 300);
})();
