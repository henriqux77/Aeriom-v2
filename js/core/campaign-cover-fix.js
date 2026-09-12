(() => {
  "use strict";

  const BUCKET = "campaign-covers";
  const CACHE = new Map();
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const validUrl = value => {
    if (!value) return false;
    try { const u = new URL(String(value), location.href); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; }
  };

  async function getCoverUrl() {
    const id = campaignId();
    if (!id) return null;
    if (CACHE.has(id)) return CACHE.get(id);
    const supabase = ctx()?.supabase;
    if (!supabase) return null;
    try {
      const result = await supabase.from("campaigns").select("cover_path,cover_url").eq("id", id).maybeSingle();
      if (result.error || !result.data) return null;
      let url = validUrl(result.data.cover_url) ? result.data.cover_url : null;
      if (!url && result.data.cover_path) {
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(result.data.cover_path, 3600);
        url = validUrl(signed.data?.signedUrl) ? signed.data.signedUrl : null;
      }
      CACHE.set(id, url);
      return url;
    } catch { CACHE.set(id, null); return null; }
  }

  function applyUrl(url) {
    if (!url) return;
    const hero = document.getElementById("campaign-hero-cover");
    if (hero) {
      hero.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.52)),url(${JSON.stringify(url)})`;
      hero.dataset.coverFixed = "1";
    }
    document.querySelectorAll("img").forEach(img => {
      const marker = `${img.className || ""} ${img.id || ""} ${img.getAttribute("alt") || ""}`.toLowerCase();
      const src = img.getAttribute("src") || "";
      if ((marker.includes("cover") || src.includes("campaign-covers")) && img.dataset.coverFixed !== "1") {
        img.dataset.coverFixed = "1";
        img.src = url;
      }
    });
  }

  async function repair() {
    const url = await getCoverUrl();
    applyUrl(url);
  }

  window.addEventListener("aeriom:campaign:ready", () => window.setTimeout(repair, 120));
  window.addEventListener("aeriom:campaigntabchange", () => window.setTimeout(repair, 100));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => window.setTimeout(repair, 300), { once: true });
  else window.setTimeout(repair, 300);
})();
