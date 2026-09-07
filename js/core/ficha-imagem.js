import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const BUCKET = "avatars";
  const MAX_BYTES = 5 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  const api = () => window.AERIONFicha || window.AERION_FICHA;
  let supabase = null;
  let currentSignedUrl = "";
  let renderTimer = null;

  function notify(message, type = "info") {
    window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));
  }

  async function client() {
    if (supabase) return supabase;
    supabase = await getSupabase();
    return supabase;
  }

  async function signedUrl(path) {
    if (!path) return "";
    try {
      const sb = await client();
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error) throw error;
      return data?.signedUrl || "";
    } catch (error) {
      console.warn("[AERION][FICHA-IMAGE] Falha ao gerar URL da imagem.", error);
      return "";
    }
  }

  async function refreshPreview(state) {
    const path = String(state?.avatar || "").trim();
    const url = path ? await signedUrl(path) : "";

    const preview = $("preview-image");
    const appearance = $("appearance-image");
    const initial = $("preview-initial");
    const placeholder = $("appearance-placeholder");

    currentSignedUrl = url;

    if (url) {
      if (preview) {
        preview.src = url;
        preview.hidden = false;
      }
      if (initial) initial.hidden = true;

      if (appearance) {
        appearance.src = url;
        appearance.hidden = false;
      }
      if (placeholder) placeholder.hidden = true;
    } else {
      if (preview) preview.hidden = false;
      if (initial) initial.hidden = false;
      if (appearance) appearance.hidden = false;
      if (placeholder) placeholder.hidden = false;
    }

    const remove = $("character-image-remove-button");
    const status = $("character-image-upload-status");
    if (remove) remove.hidden = !path;
    if (status) status.textContent = path
      ? "Imagem personalizada salva na ficha."
      : "JPG, PNG, WEBP ou GIF · até 5 MB";
  }

  async function upload(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      notify("Formato de imagem não suportado.", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      notify("A imagem deve ter no máximo 5 MB.", "error");
      return;
    }

    const fapi = api();
    if (!fapi) {
      notify("A ficha ainda não terminou de carregar.", "error");
      return;
    }

    const sb = await client();
    const { data: authData, error: authError } = await sb.auth.getUser();
    if (authError) throw authError;
    const user = authData?.user;
    if (!user) throw new Error("Faça login para enviar uma imagem.");

    const current = fapi.getState?.() || {};
    const characterId =
      new URLSearchParams(window.location.search).get("id") ||
      new URLSearchParams(window.location.search).get("draft") ||
      crypto.randomUUID();

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = user.id + "/characters/" + characterId + "-" + Date.now() + "." + ext;

    const status = $("character-image-upload-status");
    const button = $("character-image-upload-button");
    if (status) status.textContent = "Enviando imagem…";
    if (button) button.disabled = true;

    try {
      const uploadResult = await sb.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600"
      });
      if (uploadResult.error) throw uploadResult.error;

      const previous = String(current.avatar || "").trim();
      fapi.setState({ avatar: path });

      if (previous && previous !== path) {
        try {
          await sb.storage.from(BUCKET).remove([previous]);
        } catch {}
      }

      await refreshPreview(fapi.getState?.() || { avatar: path });
      notify("Imagem do personagem adicionada à ficha.", "success");
    } catch (error) {
      console.error("[AERION][FICHA-IMAGE]", error);
      if (status) status.textContent = "Falha ao enviar a imagem.";
      notify(error?.message || "Não foi possível enviar a imagem.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function removeImage() {
    const fapi = api();
    if (!fapi) return;
    const state = fapi.getState?.() || {};
    const path = String(state.avatar || "").trim();
    if (!path) return;

    const button = $("character-image-remove-button");
    if (button) button.disabled = true;

    try {
      const sb = await client();
      const { error } = await sb.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      fapi.setState({ avatar: "" });
      await refreshPreview(fapi.getState?.() || {});
      notify("Imagem personalizada removida.", "success");
    } catch (error) {
      console.error("[AERION][FICHA-IMAGE]", error);
      notify(error?.message || "Não foi possível remover a imagem.", "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bind() {
    const file = $("character-image-file");
    const open = $("character-image-upload-button");
    const remove = $("character-image-remove-button");

    if (open && !open.dataset.bound) {
      open.dataset.bound = "1";
      open.addEventListener("click", () => file?.click());
    }
    if (file && !file.dataset.bound) {
      file.dataset.bound = "1";
      file.addEventListener("change", async () => {
        const selected = file.files?.[0];
        file.value = "";
        try { await upload(selected); } catch (error) {
          console.error("[AERION][FICHA-IMAGE]", error);
          notify(error?.message || "Falha ao processar a imagem.", "error");
        }
      });
    }
    if (remove && !remove.dataset.bound) {
      remove.dataset.bound = "1";
      remove.addEventListener("click", removeImage);
    }
  }

  window.addEventListener("aerion:ficha:render", (event) => {
    bind();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      void refreshPreview(event.detail?.state || api()?.getState?.() || {});
    }, 0);
  });

  function boot() {
    bind();
    const state = api()?.getState?.();
    if (state) void refreshPreview(state);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();