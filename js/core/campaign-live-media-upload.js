import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  if (window.__AERIOM_LIVE_MEDIA_UPLOAD_STARTED__) return;
  window.__AERIOM_LIVE_MEDIA_UPLOAD_STARTED__ = true;

  const BUCKET = "campaign-assets";
  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const cid = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const ext = file => (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));
  let sb = null;

  function validFile(file) {
    if (!file) return "Escolha um arquivo.";
    const allowed = /^(image\/(png|jpeg|webp|gif)|audio\/(mpeg|ogg|wav|webm|mp4)|video\/(mp4|webm|ogg))$/i;
    if (!allowed.test(file.type)) return "Formato não suportado. Use imagem, áudio ou vídeo.";
    if (file.size > 50 * 1024 * 1024) return "O arquivo deve ter no máximo 50 MB.";
    return null;
  }

  function mediaType(file) {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    return "video";
  }

  function injectInput() {
    const host = $("aeriom-live-media-card");
    if (!host || $("aeriom-live-file")) return;
    const url = $("aeriom-live-url");
    if (url) { url.style.display = "none"; url.closest("*")?.classList.add("aeriom-live-url-legacy-hidden"); }
    const wrap = document.createElement("div");
    wrap.className = "aeriom-live-upload-field";
    wrap.innerHTML = '<label for="aeriom-live-file">Arquivo da mídia</label><input id="aeriom-live-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/ogg,audio/mpeg,audio/ogg,audio/wav,audio/webm"><div id="aeriom-live-file-name">Nenhum arquivo selecionado.</div>';
    const title = $("aeriom-live-title");
    title?.parentElement?.insertBefore(wrap, title);
    $("aeriom-live-file")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      $("aeriom-live-file-name").textContent = file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Nenhum arquivo selecionado.";
    });
  }

  function hijackPublish() {
    const button = $("aeriom-live-send");
    if (!button || button.dataset.uploadBound === "1") return;
    button.dataset.uploadBound = "1";
    button.addEventListener("click", async event => {
      if (!isMaster()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const file = $("aeriom-live-file")?.files?.[0];
      const errorMessage = validFile(file);
      if (errorMessage) { toast(errorMessage, "warning"); return; }
      try {
        sb = sb || await getSupabase();
        const campaign = cid();
        if (!campaign) throw new Error("Campanha não encontrada.");
        const user = ctx()?.user;
        const path = `${campaign}/live-media/${crypto.randomUUID()}.${ext(file)}`;
        button.disabled = true;
        button.textContent = "Enviando…";
        const upload = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
        if (upload.error) throw upload.error;
        const row = { campaign_id: campaign, media_type: mediaType(file), source_url: path, title: $("aeriom-live-title")?.value.trim() || null, active: true, autoplay: true, loop: false, volume: .7, updated_by: user?.id || null };
        const result = await sb.from("campaign_live_media").upsert(row, { onConflict: "campaign_id" }).select("*").single();
        if (result.error) throw result.error;
        window.dispatchEvent(new CustomEvent("aeriom:live-media-refresh", { detail: { campaignId: campaign } }));
        toast("Mídia enviada para a mesa.", "success");
      } catch (error) {
        console.error("[AERIOM][LIVE MEDIA UPLOAD] publish failed", error);
        toast(error?.message || "Não foi possível enviar a mídia.", "error");
      } finally {
        button.disabled = false;
        button.textContent = "Transmitir para a mesa";
      }
    }, true);
  }

  function patchStop() {
    const button = $("aeriom-live-stop");
    if (!button || button.dataset.uploadStopBound === "1") return;
    button.dataset.uploadStopBound = "1";
    button.addEventListener("click", async event => {
      if (!isMaster()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        sb = sb || await getSupabase();
        const campaign = cid();
        if (!campaign) throw new Error("Campanha não encontrada.");
        const result = await sb.from("campaign_live_media").delete().eq("campaign_id", campaign);
        if (result.error) throw result.error;
        document.getElementById("aeriom-live-media-stage")?.classList.remove("is-open");
        window.dispatchEvent(new CustomEvent("aeriom:live-media-refresh", { detail: { campaignId: campaign } }));
        toast("Mídia encerrada.", "success");
      } catch (error) {
        toast(error?.message || "Não foi possível encerrar a mídia.", "error");
      }
    }, true);
  }

  async function start() {
    try { sb = sb || await getSupabase(); } catch (error) { console.error("[AERIOM][LIVE MEDIA UPLOAD]", error); return; }
    injectInput();
    hijackPublish();
    patchStop();
  }

  const schedule = () => window.setTimeout(() => void start(), 100);
  window.addEventListener("aeriom:campaign:ready", schedule);
  window.addEventListener("aeriom:campaigntabchange", schedule);
  window.addEventListener("aeriom:master:refresh", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
  else schedule();
})();
