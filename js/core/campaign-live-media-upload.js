import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const BUCKET = "campaign-assets";
  const ROOT = "#campaign-panel-master-controls";
  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const cid = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const ext = file => (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));
  let sb = null;
  let channel = null;

  function validFile(file) {
    if (!file) return "Escolha um arquivo.";
    const allowed = /^(image\/(png|jpeg|webp|gif)|audio\/(mpeg|ogg|wav|webm|mp4)|video\/(mp4|webm|ogg))$/i;
    if (!allowed.test(file.type)) return "Formato não suportado. Use imagem, áudio ou vídeo.";
    const max = 50 * 1024 * 1024;
    if (file.size > max) return "O arquivo deve ter no máximo 50 MB.";
    return null;
  }

  function mediaType(file) {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    return "video";
  }

  async function signedUrl(path) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl || null;
  }

  async function loadMedia() {
    const campaign = cid();
    if (!campaign || !sb) return null;
    const result = await sb.from("campaign_live_media").select("*").eq("campaign_id", campaign).maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  function ensureStage() {
    let stage = $("aeriom-live-media-stage");
    if (stage) return stage;
    stage = document.createElement("div");
    stage.id = "aeriom-live-media-stage";
    stage.className = "aeriom-live-media-stage";
    stage.innerHTML = '<div class="aeriom-live-media-stage__panel"><button type="button" class="aeriom-live-media-stage__close" aria-label="Fechar mídia">×</button><div data-live-upload-content></div><div class="aeriom-live-media-stage__title" data-live-upload-title></div></div>';
    document.body.appendChild(stage);
    stage.addEventListener("click", e => { if (e.target === stage) stage.classList.remove("is-open"); });
    stage.querySelector(".aeriom-live-media-stage__close").addEventListener("click", () => stage.classList.remove("is-open"));
    return stage;
  }

  function render(media, url) {
    const stage = ensureStage();
    const content = stage.querySelector("[data-live-upload-content]");
    const title = stage.querySelector("[data-live-upload-title]");
    content.replaceChildren();
    title.textContent = media?.title || "";
    if (!media?.active || !url) { stage.classList.remove("is-open"); return; }
    let node;
    if (media.media_type === "image") {
      node = document.createElement("img"); node.src = url; node.alt = media.title || "Mídia da mesa";
    } else if (media.media_type === "audio") {
      node = document.createElement("audio"); node.src = url; node.controls = true; node.autoplay = Boolean(media.autoplay); node.loop = Boolean(media.loop); node.volume = Math.max(0, Math.min(1, Number(media.volume ?? .7)));
    } else {
      node = document.createElement("video"); node.src = url; node.controls = true; node.playsInline = true; node.autoplay = Boolean(media.autoplay); node.loop = Boolean(media.loop); node.volume = Math.max(0, Math.min(1, Number(media.volume ?? .7)));
    }
    content.appendChild(node);
    stage.classList.add("is-open");
    if (node.tagName === "VIDEO" || node.tagName === "AUDIO") node.play?.().catch(() => {});
  }

  async function syncDisplay() {
    try {
      const media = await loadMedia();
      const url = media?.source_url?.startsWith("http") ? media.source_url : media?.source_url ? await signedUrl(media.source_url) : null;
      render(media, url);
    } catch (error) {
      console.error("[AERIOM][LIVE MEDIA UPLOAD] sync failed", error);
    }
  }

  function injectInput() {
    const host = $("aeriom-live-media-card");
    if (!host || $("aeriom-live-file")) return;
    const url = $("aeriom-live-url");
    if (url) url.closest("*")?.classList.add("aeriom-live-url-legacy-hidden");
    if (url) url.style.display = "none";
    const wrap = document.createElement("div");
    wrap.className = "aeriom-live-upload-field";
    wrap.innerHTML = '<label for="aeriom-live-file">Arquivo da mídia</label><input id="aeriom-live-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/ogg,audio/mpeg,audio/ogg,audio/wav,audio/webm"><div id="aeriom-live-file-name">Nenhum arquivo selecionado.</div>';
    const title = $("aeriom-live-title");
    title?.parentElement?.insertBefore(wrap, title);
    $("aeriom-live-file")?.addEventListener("change", e => { const file = e.target.files?.[0]; $("aeriom-live-file-name").textContent = file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Nenhum arquivo selecionado."; });
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
        const user = ctx()?.user;
        const path = `${campaign}/live-media/${crypto.randomUUID()}.${ext(file)}`;
        button.disabled = true;
        button.textContent = "Enviando…";
        const upload = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
        if (upload.error) throw upload.error;
        const type = mediaType(file);
        const title = $("aeriom-live-title")?.value.trim() || null;
        const row = { campaign_id: campaign, media_type: type, source_url: path, title, active: true, autoplay: true, loop: false, volume: .7, updated_by: user?.id || null };
        const result = await sb.from("campaign_live_media").upsert(row, { onConflict: "campaign_id" }).select("*").single();
        if (result.error) throw result.error;
        toast("Mídia enviada para a mesa.", "success");
        await syncDisplay();
      } catch (error) {
        console.error("[AERIOM][LIVE MEDIA UPLOAD] publish failed", error);
        toast(error?.message || "Não foi possível enviar a mídia.", "error");
      } finally {
        button.disabled = false;
        button.textContent = "Transmitir para a mesa";
      }
    }, true);
  }

  async function stopPatch() {
    const button = $("aeriom-live-stop");
    if (!button || button.dataset.uploadStopBound === "1") return;
    button.dataset.uploadStopBound = "1";
    button.addEventListener("click", async event => {
      if (!isMaster()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      try {
        sb = sb || await getSupabase();
        const result = await sb.from("campaign_live_media").delete().eq("campaign_id", cid());
        if (result.error) throw result.error;
        document.getElementById("aeriom-live-media-stage")?.classList.remove("is-open");
        toast("Mídia encerrada.", "success");
      } catch (error) { toast(error?.message || "Não foi possível encerrar a mídia.", "error"); }
    }, true);
  }

  async function start() {
    sb = sb || await getSupabase();
    ensureStage();
    injectInput();
    hijackPublish();
    stopPatch();
    await syncDisplay();
    if (channel) return;
    const campaign = cid();
    if (!campaign) return;
    channel = sb.channel(`campaign-live-media-upload:${campaign}`).on("postgres_changes", { event: "*", schema: "public", table: "campaign_live_media", filter: `campaign_id=eq.${campaign}` }, () => void syncDisplay()).subscribe();
  }

  const schedule = () => setTimeout(() => void start().catch(e => console.error("[AERIOM][LIVE MEDIA UPLOAD]", e)), 100);
  window.addEventListener("aeriom:campaign:ready", schedule);
  window.addEventListener("aeriom:campaigntabchange", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true }); else schedule();
})();
