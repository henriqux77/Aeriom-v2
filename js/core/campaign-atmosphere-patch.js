import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  const ICONS = ["✦", "🌲", "⛰", "🌋", "♜", "🌊", "🏛"];
  const $ = (s, root = document) => root.querySelector(s);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const campaignId = () => ctx()?.campaignId || ctx()?.campaign?.id || new URLSearchParams(location.search).get("campaign");
  let styleReady = false;

  function toast(message, type = "info") {
    const region = document.getElementById("aeriom-toast-region");
    if (!region) return;
    const e = document.createElement("div");
    e.className = "aeriom-toast";
    e.dataset.type = type;
    e.textContent = message;
    region.appendChild(e);
    setTimeout(() => e.remove(), 3200);
  }

  function installStyle() {
    if (styleReady || document.getElementById("aeriom-atmosphere-patch-style")) return;
    styleReady = true;
    const style = document.createElement("style");
    style.id = "aeriom-atmosphere-patch-style";
    style.textContent = `
      .aeriom-atmosphere__theme{position:relative;min-height:0!important}
      .aeriom-atmosphere__theme-icon{position:absolute;right:8px;top:8px;z-index:3;width:30px;height:30px;display:grid;place-items:center;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(6,5,4,.58);box-shadow:0 8px 18px rgba(0,0,0,.24);font-size:15px;pointer-events:none}
      .aeriom-atmosphere__gallery{display:grid;grid-template-columns:minmax(0,180px) minmax(0,1fr);gap:10px;align-items:stretch;margin-top:9px}
      .aeriom-atmosphere__gallery-preview{min-height:108px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:center/cover no-repeat linear-gradient(135deg,#171411,#0b0b0a);box-shadow:inset 0 0 0 1px rgba(255,255,255,.025)}
      .aeriom-atmosphere__gallery-controls{display:grid;gap:7px;align-content:center}
      .aeriom-atmosphere__gallery-title{font-size:9px;color:rgba(255,255,255,.65);font-weight:800}
      .aeriom-atmosphere__gallery-help{font-size:8px;color:rgba(255,255,255,.35);line-height:1.45}
      .aeriom-atmosphere__gallery input[type=file]{width:100%;box-sizing:border-box;padding:9px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#12100e;color:rgba(255,255,255,.55);font-size:8px}
      @media(max-width:650px){.aeriom-atmosphere__gallery{grid-template-columns:1fr}.aeriom-atmosphere__gallery-preview{min-height:150px}}
    `;
    document.head.appendChild(style);
  }

  function addIcons(root) {
    root.querySelectorAll(".aeriom-atmosphere__theme").forEach((card, index) => {
      if (card.querySelector(".aeriom-atmosphere__theme-icon")) return;
      const icon = document.createElement("span");
      icon.className = "aeriom-atmosphere__theme-icon";
      icon.textContent = ICONS[index] || "✦";
      icon.setAttribute("aria-hidden", "true");
      card.appendChild(icon);
    });
  }

  async function resolveBackground(pathOrUrl) {
    const value = String(pathOrUrl || "").trim();
    if (!value) return null;
    if (/^https?:\\/\\//i.test(value)) return value;
    try {
      const sb = ctx()?.supabase || await getSupabase();
      const result = await sb.storage.from("campaign-assets").createSignedUrl(value, 3600);
      return result.data?.signedUrl || null;
    } catch { return null; }
  }

  function applyBackground(url) {
    if (!url) return;
    const root = document.documentElement;
    root.style.setProperty("--campaign-theme-bg-image", `url("${String(url).replaceAll('"','\\"')}")`);
    root.dataset.atmosphereCustomBackground = "true";
  }

  async function loadSavedBackground() {
    const id = campaignId();
    const sb = ctx()?.supabase;
    if (!id || !sb) return;
    const { data } = await sb.from("campaign_atmosphere_settings")
      .select("background_source,background_url")
      .eq("campaign_id", id)
      .maybeSingle();
    if (data?.background_source === "custom" && data?.background_url) {
      const url = await resolveBackground(data.background_url);
      if (url) applyBackground(url);
    }
  }

  function ensureGallery(root) {
    if (!isMaster() || root.querySelector(".aeriom-atmosphere__gallery")) return;
    const section = [...root.querySelectorAll(".aeriom-atmosphere__section")]
      .find(el => /Palco e fundo/i.test(el.textContent || ""));
    if (!section) return;
    const existingPreview = section.querySelector("[data-atm-preview=background]");
    const gallery = document.createElement("div");
    gallery.className = "aeriom-atmosphere__gallery";
    gallery.innerHTML = '<div class="aeriom-atmosphere__gallery-preview"></div><div class="aeriom-atmosphere__gallery-controls"><div class="aeriom-atmosphere__gallery-title">Imagem da galeria</div><div class="aeriom-atmosphere__gallery-help">Escolha uma imagem do aparelho para usar como fundo da mesa. Ela fica armazenada na campanha.</div><input type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div>';
    const preview = gallery.querySelector(".aeriom-atmosphere__gallery-preview");
    if (existingPreview) preview.style.backgroundImage = existingPreview.style.backgroundImage;
    section.appendChild(gallery);
    const input = gallery.querySelector("input[type=file]");
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { toast("A imagem deve ter no máximo 8 MB.", "error"); input.value=""; return; }
      if (!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)) { toast("Formato não suportado.", "error"); input.value=""; return; }
      try {
        const sb = ctx()?.supabase || await getSupabase();
        const id = campaignId();
        if (!sb || !id) throw new Error("Campanha ainda não carregada.");
        const safe = String(file.name || "imagem.jpg").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = id + "/atmosphere/" + crypto.randomUUID() + "." + safe;
        const upload = await sb.storage.from("campaign-assets").upload(path, file, { upsert:false, contentType:file.type, cacheControl:"3600" });
        if (upload.error) throw upload.error;
        const signed = await sb.storage.from("campaign-assets").createSignedUrl(path, 3600);
        const url = signed.data?.signedUrl;
        if (!url) throw new Error("Não foi possível preparar a imagem.");
        const { error } = await sb.from("campaign_atmosphere_settings").update({ background_source:"custom", background_url:path, updated_by:ctx()?.user?.id || null, updated_at:new Date().toISOString() }).eq("campaign_id", id);
        if (error) throw error;
        applyBackground(url);
        preview.style.backgroundImage = `url("${String(url).replaceAll('"','\\"')}")`;
        toast("Fundo da mesa atualizado.", "success");
        window.dispatchEvent(new CustomEvent("aeriom:atmospherechange", { detail:{ campaignId:id, source:"gallery" } }));
      } catch (error) {
        console.error("[AERIOM][ATMOSPHERE PATCH]", error);
        toast(error?.message || "Não foi possível enviar a imagem.", "error");
      } finally { input.value = ""; }
    });
  }

  function enhance() {
    installStyle();
    const root = document.getElementById("campaign-theme-selector");
    if (!root) return;
    addIcons(root);
    ensureGallery(root);
    void loadSavedBackground();
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(enhance, 100));
  window.addEventListener("aeriom:campaigntabchange", event => { if (event.detail?.tab === "theme") setTimeout(enhance, 80); });
  window.addEventListener("aeriom:atmospherechange", () => setTimeout(() => { const root = document.getElementById("campaign-theme-selector"); if (root) addIcons(root); }, 40));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(enhance, 250), { once:true }); else setTimeout(enhance, 250);
})();
