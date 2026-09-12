import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  if (window.__AERIOM_LIVE_MEDIA_STARTED__) return;
  window.__AERIOM_LIVE_MEDIA_STARTED__ = true;

  const state = {
    supabase: null,
    channel: null,
    campaignId: null,
    current: null,
    masterCardReady: false,
    started: false
  };

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;

  function injectStyles() {
    if ($("aeriom-live-media-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-live-media-style";
    style.textContent = `
      .aeriom-live-media-card{margin-top:16px;border:1px solid var(--campaign-border,rgba(220,185,105,.14));border-radius:16px;padding:16px;background:rgba(255,255,255,.018)}
      .aeriom-live-media-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:10px}
      .aeriom-live-media-grid input,.aeriom-live-media-grid select{min-width:0;width:100%;box-sizing:border-box}
      .aeriom-live-media-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .aeriom-live-media-stage{position:fixed;inset:0;z-index:7000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
      .aeriom-live-media-stage.is-open{display:flex}
      .aeriom-live-media-stage__panel{position:relative;width:min(1180px,96vw);max-height:92dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
      .aeriom-live-media-stage img,.aeriom-live-media-stage video{display:block;max-width:100%;max-height:78dvh;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.55);background:#050505}
      .aeriom-live-media-stage audio{width:min(720px,92vw)}
      .aeriom-live-media-stage iframe{width:min(1100px,94vw);height:min(70dvh,680px);border:0;border-radius:14px;background:#000}
      .aeriom-live-media-stage__close{position:absolute;right:0;top:-46px;width:38px;height:38px;border:1px solid rgba(255,255,255,.15);border-radius:11px;background:rgba(20,20,20,.8);color:#fff;font-size:22px;cursor:pointer}
      .aeriom-live-media-stage__title{max-width:90%;color:#f4efe5;font:600 14px/1.4 Cinzel,Georgia,serif;text-align:center}
      .aeriom-live-media-stage__notice{padding:10px 13px;border:1px solid rgba(216,182,95,.2);border-radius:10px;background:rgba(18,16,13,.92);color:#d9ccb3;font-size:11px;text-align:center}
      @media(max-width:650px){.aeriom-live-media-grid{grid-template-columns:1fr}.aeriom-live-media-stage{padding:8px}.aeriom-live-media-stage iframe{height:58dvh}.aeriom-live-media-stage__close{top:-44px;right:2px}}
    `;
    document.head.appendChild(style);
  }

  function ensureStage() {
    let stage = $("aeriom-live-media-stage");
    if (stage) return stage;
    stage = document.createElement("div");
    stage.id = "aeriom-live-media-stage";
    stage.className = "aeriom-live-media-stage";
    stage.innerHTML = '<div class="aeriom-live-media-stage__panel"><button type="button" class="aeriom-live-media-stage__close" aria-label="Fechar transmissão">×</button><div data-live-content></div><div class="aeriom-live-media-stage__title" data-live-title></div></div>';
    document.body.appendChild(stage);
    stage.addEventListener("click", event => { if (event.target === stage) closeStage(); });
    stage.querySelector(".aeriom-live-media-stage__close").addEventListener("click", closeStage);
    return stage;
  }

  function closeStage() {
    const stage = $("aeriom-live-media-stage");
    if (!stage) return;
    stage.classList.remove("is-open");
    stage.querySelector("[data-live-content]")?.replaceChildren();
    stage.querySelector("[data-live-upload-content]")?.replaceChildren();
  }

  function youtubeEmbed(url) {
    try {
      const parsed = new URL(url);
      let id = parsed.searchParams.get("v");
      if (!id && parsed.hostname.includes("youtu.be")) id = parsed.pathname.slice(1).split("/")[0];
      if (!id) return null;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    } catch { return null; }
  }

  function render(media) {
    state.current = media || null;
    const stage = ensureStage();
    const root = stage.querySelector("[data-live-content]") || stage.querySelector("[data-live-upload-content]");
    const title = stage.querySelector("[data-live-title]") || stage.querySelector("[data-live-upload-title]");
    if (!root || !title) return;
    root.replaceChildren();
    title.textContent = media?.title || "";
    if (!media?.active || !media?.source_url) {
      stage.classList.remove("is-open");
      return;
    }

    if (media.media_type === "video") {
      const embed = youtubeEmbed(media.source_url);
      if (embed) {
        const iframe = document.createElement("iframe");
        iframe.src = embed;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        root.appendChild(iframe);
      } else {
        const video = document.createElement("video");
        video.src = media.source_url;
        video.controls = true;
        video.playsInline = true;
        video.autoplay = Boolean(media.autoplay);
        video.loop = Boolean(media.loop);
        video.volume = Math.max(0, Math.min(1, Number(media.volume ?? .7)));
        root.appendChild(video);
        const promise = video.play();
        if (promise?.catch) promise.catch(() => showAutoplayNotice(root));
      }
    } else if (media.media_type === "audio") {
      const audio = document.createElement("audio");
      audio.src = media.source_url;
      audio.controls = true;
      audio.autoplay = Boolean(media.autoplay);
      audio.loop = Boolean(media.loop);
      audio.volume = Math.max(0, Math.min(1, Number(media.volume ?? .7)));
      root.appendChild(audio);
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => showAutoplayNotice(root));
    } else {
      const image = document.createElement("img");
      image.src = media.source_url;
      image.alt = media.title || "Transmissão da mesa";
      root.appendChild(image);
    }
    stage.classList.add("is-open");
  }

  function showAutoplayNotice(root) {
    const notice = document.createElement("div");
    notice.className = "aeriom-live-media-stage__notice";
    notice.textContent = "O navegador bloqueou a reprodução automática. Use os controles da mídia para iniciar o som/vídeo.";
    root.appendChild(notice);
  }

  async function loadState() {
    const cid = campaignId();
    if (!cid || !state.supabase) return;
    const result = await state.supabase.from("campaign_live_media").select("*").eq("campaign_id", cid).maybeSingle();
    if (result.error) throw result.error;
    render(result.data || null);
  }

  function formMarkup() {
    return `<div class="aeriom-live-media-card" id="aeriom-live-media-card"><div class="aeriom-master-card__head"><div><h3>Transmissão ao vivo</h3><p>O Mestre publica uma mídia para todos os jogadores da campanha em tempo real.</p></div><span class="aeriom-master-badge">MESTRE</span></div><div class="aeriom-live-media-grid"><select id="aeriom-live-type" aria-label="Tipo de mídia"><option value="image">Imagem</option><option value="video">Vídeo</option><option value="audio">Áudio</option></select><input id="aeriom-live-url" type="url" inputmode="url" placeholder="URL da imagem, vídeo direto ou YouTube"></div><input id="aeriom-live-title" maxlength="120" placeholder="Título da transmissão (opcional)" style="margin-top:10px;width:100%;box-sizing:border-box"><div class="aeriom-live-media-actions"><button type="button" class="aeriom-master-button aeriom-master-button--primary" id="aeriom-live-send">Transmitir para a mesa</button><button type="button" class="aeriom-master-button aeriom-master-button--danger" id="aeriom-live-stop">Encerrar</button></div><div class="aeriom-master-empty" id="aeriom-live-status" style="margin-top:8px">Nenhuma transmissão ativa.</div></div>`;
  }

  async function publish() {
    if (!isMaster() || !state.supabase || !state.campaignId) return;
    const type = $("aeriom-live-type")?.value || "image";
    const url = $("aeriom-live-url")?.value.trim() || "";
    const title = $("aeriom-live-title")?.value.trim() || null;
    if (!/^https?:\/\//i.test(url)) {
      setStatus("Informe uma URL HTTP/HTTPS válida.", true);
      return;
    }
    const user = ctx()?.user;
    const result = await state.supabase.from("campaign_live_media").upsert({ campaign_id: state.campaignId, media_type: type, source_url: url, title, active: true, autoplay: true, loop: false, volume: .7, updated_by: user?.id || null }, { onConflict: "campaign_id" }).select("*").single();
    if (result.error) throw result.error;
    setStatus("Transmissão enviada para a mesa.");
  }

  async function stop() {
    if (!isMaster() || !state.supabase || !state.campaignId) return;
    const result = await state.supabase.from("campaign_live_media").delete().eq("campaign_id", state.campaignId);
    if (result.error) throw result.error;
    setStatus("Transmissão encerrada.");
  }

  function setStatus(text, error = false) {
    const node = $("aeriom-live-status");
    if (!node) return;
    node.textContent = text;
    node.dataset.error = error ? "true" : "false";
  }

  function ensureMasterCard() {
    if (!isMaster() || state.masterCardReady) return;
    const root = $("aeriom-master-controls-root") || $("campaign-panel-master-controls");
    if (!root || $("aeriom-live-media-card")) return;
    const host = root.querySelector(".aeriom-master-grid") || root;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = formMarkup();
    host.appendChild(wrapper.firstElementChild);
    $("aeriom-live-send").addEventListener("click", () => publish().catch(error => setStatus(error?.message || "Não foi possível transmitir a mídia.", true)));
    $("aeriom-live-stop").addEventListener("click", () => stop().catch(error => setStatus(error?.message || "Não foi possível encerrar a mídia.", true)));
    state.masterCardReady = true;
    if (state.current?.active) setStatus(`Ativa: ${state.current.title || state.current.media_type}`);
  }

  function onTabChange(event) {
    if (event.detail?.tab === "master-controls" || !event.detail?.tab) window.setTimeout(ensureMasterCard, 30);
  }

  async function start() {
    if (state.started) return;
    state.started = true;
    injectStyles();
    state.campaignId = campaignId();
    if (!state.campaignId) return;
    state.supabase = await getSupabase();
    ensureStage();
    await loadState();
    state.channel = state.supabase.channel(`campaign-live-media:${state.campaignId}`).on("postgres_changes", { event: "*", schema: "public", table: "campaign_live_media", filter: `campaign_id=eq.${state.campaignId}` }, payload => render(payload.eventType === "DELETE" ? null : payload.new || null)).subscribe();
    ensureMasterCard();
  }

  window.addEventListener("aeriom:campaign:ready", () => void start().catch(error => console.error("[AERIOM][LIVE MEDIA]", error)));
  window.addEventListener("aeriom:campaigntabchange", onTabChange);
  window.addEventListener("aeriom:master:refresh", () => window.setTimeout(ensureMasterCard, 30));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { void start().catch(error => console.error("[AERIOM][LIVE MEDIA]", error)); }, { once: true });
  else void start().catch(error => console.error("[AERIOM][LIVE MEDIA]", error));
})();
