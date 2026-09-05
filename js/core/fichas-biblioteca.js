import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  /*
   * AERION — BIBLIOTECA DE FICHAS
   *
   * Corrige o problema em que o módulo da biblioteca escondia
   * .ficha-main mesmo quando o HTML não possuía #ficha-library.
   *
   * Também:
   * - cria a biblioteca dinamicamente quando necessário;
   * - cria rascunho limpo para cada nova ficha;
   * - mantém autosave no Supabase;
   * - marca ficha como "Incompleta" até finalizar;
   * - não reutiliza o rascunho anterior ao clicar em "Criar ficha";
   * - preenche campos NOT NULL do banco com valores seguros;
   * - abre fichas existentes sem sobrescrever o estado antigo;
   * - permite duplicar e excluir;
   * - injeta o CSS da biblioteca sem exigir alteração adicional no HTML.
   */

  const CONFIG = Object.freeze({
    storageKey: "aerion:ficha:draft:v40",
    editorPage: "./fichas.html",
    table: "characters"
  });

  const session = {
    supabase: null,
    user: null,
    characterId: null,
    currentCampaignId: null,
    status: "draft",
    saving: false,
    finalizing: false,
    hooksInstalled: false,
    finalizeBridgeInstalled: false,
    cloudFlushInstalled: false,
    cloudSaveTimer: null,
    pendingSnapshot: null,
    saveChain: Promise.resolve(),
    booted: false
  };

  const $ = (id) => document.getElementById(id);

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function isEditorMode() {
    const p = params();
    return p.get("new") === "1" || Boolean(p.get("id"));
  }

  function clone(value, fallback = null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function safeText(value) {
    return String(value ?? "").trim();
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function notify(message, type = "") {
    window.dispatchEvent(
      new CustomEvent("aerion:toast", {
        detail: { message, type }
      })
    );
  }

  function clearLocalDraft() {
    try {
      localStorage.removeItem(CONFIG.storageKey);
    } catch {}
  }

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
  }

  async function initClient() {
    session.supabase = await getSupabase();
    const { data, error } = await session.supabase.auth.getUser();

    if (error) throw error;

    session.user = data?.user || null;
    if (!session.user) {
      throw new Error("Faça login para acessar suas fichas.");
    }
  }

  function requiredComplete(snapshot) {
    const completed = snapshot?.completedSteps || [];
    return (
      completed[0] === true &&
      completed[1] === true &&
      completed[2] === true &&
      completed[3] === true &&
      completed[4] === true &&
      completed[5] === true
    );
  }

  function objectOrEmpty(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? clone(value, {})
      : {};
  }

  function arrayOrEmpty(value) {
    return Array.isArray(value) ? clone(value, []) : [];
  }

  function buildPayload(snapshot, status) {
    const derived = objectOrEmpty(snapshot?.derivedStats);
    const hp = objectOrEmpty(snapshot?.hp);
    const mana = objectOrEmpty(snapshot?.mana);
    const appearance = objectOrEmpty(snapshot?.appearance);

    return {
      id: session.characterId,
      user_id: session.user.id,
      campaign_id: session.currentCampaignId ?? null,

      name: safeText(snapshot?.name) || "Ficha sem nome",
      age: safeText(snapshot?.age) ? number(snapshot.age) : null,
      gender: safeText(snapshot?.gender) || null,
      race: safeText(snapshot?.race) || null,
      class: safeText(snapshot?.class) || null,
      power: safeText(snapshot?.primaryPower) || null,
      origin: safeText(snapshot?.origin) || null,

      racial_ability:
        safeText(derived?.racialAbility) ||
        arrayOrEmpty(derived?.abilities).join(" · ") ||
        null,

      class_bonus:
        safeText(mana?.classBonus) ? String(mana.classBonus) : null,

      personality: safeText(snapshot?.personality) ? [safeText(snapshot.personality)] : [],
      backstory: safeText(snapshot?.history) || null,
      goals: safeText(snapshot?.objective)
        ? [safeText(snapshot.objective)]
        : [],
      fears: safeText(snapshot?.fear)
        ? [safeText(snapshot.fear)]
        : [],
      important_bonds: safeText(snapshot?.importantBond)
        ? [safeText(snapshot.importantBond)]
        : [],

      hp_current: Math.max(0, number(hp.current, 10)),
      hp_max: Math.max(1, number(hp.max, 10)),
      mana_current: Math.max(0, number(mana.current, 0)),
      mana_max: Math.max(0, number(mana.max, 0)),
      defense: Math.max(1, number(snapshot?.defense ?? derived?.defense, 10)),
      initiative: number(snapshot?.initiative ?? derived?.initiative, 0),
      movement: Math.max(0, number(snapshot?.movement ?? derived?.movement, 9)),

      appearance,
      attributes: objectOrEmpty(snapshot?.assignedDice || snapshot?.attributes),
      techniques: arrayOrEmpty(snapshot?.techniques),
      inventory: arrayOrEmpty(snapshot?.inventory),
      equipment: arrayOrEmpty(snapshot?.equipment),
      conditions: arrayOrEmpty(snapshot?.conditions),

      avatar_path: safeText(snapshot?.avatar) || null,

      size_category: safeText(derived?.sizeCategory) || "Médio",
      natural_profile: safeText(derived?.naturalProfile) || null,
      racial_modifiers: objectOrEmpty(derived?.racialModifiers),
      movement_profile: {
        land: number(snapshot?.movement ?? derived?.movement, 9),
        water: derived?.waterMovement ?? null
      },
      resistances: arrayOrEmpty(derived?.resistances),
      senses: arrayOrEmpty(derived?.senses),
      power_roll:
        snapshot?.powerRoll == null ? null : number(snapshot.powerRoll),
      power_type: safeText(snapshot?.powerMode) || null,
      skill_modifiers: objectOrEmpty(snapshot?.skills),

      creation_state: clone(snapshot, {}),
      status: status || "draft",
      updated_at: new Date().toISOString()
    };
  }

  async function persist(snapshot, forcedStatus = null) {
    const saveText = document.getElementById("saveStatusText");
    if (saveText) saveText.textContent = "Salvando…";
    if (
      !session.supabase ||
      !session.user ||
      !session.characterId
    ) {
      return false;
    }

    while (session.saving) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    session.saving = true;

    try {
      const status = forcedStatus || session.status || "draft";

      const payload = buildPayload(snapshot, status);

      const { error } = await session.supabase
        .from(CONFIG.table)
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      const saveTextDone = document.getElementById("saveStatusText");
      if (saveTextDone) saveTextDone.textContent = "Salvo agora";

      window.dispatchEvent(
        new CustomEvent("aerion:fichas:cloudsaved", {
          detail: {
            characterId: session.characterId,
            status
          }
        })
      );

      return true;
    } finally {
      session.saving = false;
    }
  }

  function scheduleCloudFlush(snapshot, immediate = false) {
    if (!snapshot || !isEditorMode() || !session.characterId || session.finalizing) return;

    session.pendingSnapshot = snapshot;
    clearTimeout(session.cloudSaveTimer);

    const flush = () => {
      const pending = session.pendingSnapshot;
      session.pendingSnapshot = null;
      if (!pending) return;

      session.saveChain = session.saveChain
        .catch(() => {})
        .then(() => persist(pending))
        .catch((error) => {
          console.error("[AERION][FICHAS] Autosave cloud falhou:", error);
          notify(error?.message || "Não foi possível salvar a ficha na nuvem.", "error");
        })
        .finally(() => {
          if (session.pendingSnapshot && !session.finalizing) {
            scheduleCloudFlush(session.pendingSnapshot, false);
          }
        });
    };

    if (immediate) flush();
    else session.cloudSaveTimer = setTimeout(flush, 220);
  }

  function installEditorHooks() {
    if (session.hooksInstalled) return;
    session.hooksInstalled = true;

    const onUpdate = (event) => {
      scheduleCloudFlush(
        event?.detail?.state || window.AERIONFicha?.getState?.(),
        false
      );
    };

    window.addEventListener("aerion:ficha:update", onUpdate);
    window.addEventListener("aerion:save", onUpdate);
  }
  async function waitForFichaApi() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (
        window.AERIONFicha &&
        typeof window.AERIONFicha.getState === "function" &&
        typeof window.AERIONFicha.reset === "function"
      ) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    throw new Error("O editor de ficha não foi carregado.");
  }

  async function createNewDraft() {
    await waitForFichaApi();

    session.characterId = crypto.randomUUID();
    session.status = "draft";
    clearLocalDraft();

    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("new", "1");
    url.searchParams.set("draft", session.characterId);
    window.history.replaceState({}, "", url);

    /*
     * RESET OBRIGATÓRIO:
     * toda ficha nova começa limpa.
     */
    window.AERIONFicha.reset();

    /*
     * Garante que a ficha exista no banco mesmo que o usuário
     * ainda não tenha digitado nada.
     */
    await persist(window.AERIONFicha.getState(), "draft");

    notify("Nova ficha criada.", "success");
  }

  async function openExisting(id) {
    if (!id) return;

    await waitForFichaApi();

    const { data, error } = await session.supabase
      .from(CONFIG.table)
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Ficha não encontrada.");

    session.characterId = data.id;
    session.currentCampaignId = data.campaign_id || null;
    session.status = data.status === "completed" ? "completed" : "draft";
    clearLocalDraft();

    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("id", data.id);
    window.history.replaceState({}, "", url);

    window.AERIONFicha.reset();

    if (data.creation_state && typeof data.creation_state === "object") {
      window.AERIONFicha.setState(data.creation_state);
    }
  }

  function bindFinalizeButtons() {
    const api = window.AERIONFicha;
    if (!api?.finalizeCharacter) return;

    [
      document.getElementById("aerion-finalize-bottom"),
      document.getElementById("aerion-header-finalize")
    ].forEach((button) => {
      if (!button || button.dataset.finalizeBound === "1") return;

      button.dataset.finalizeBound = "1";
      button.addEventListener("click", () => {
        api.finalizeCharacter();
      });
    });
  }

  function installCloudFlushHandlers() {
    if (session.cloudFlushInstalled) return;
    session.cloudFlushInstalled = true;

    const flush = () => {
      if (!isEditorMode() || session.finalizing || !session.characterId) return;

      const snapshot = window.AERIONFicha?.getState?.();
      if (!snapshot) return;

      scheduleCloudFlush(snapshot, true);
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
  function installFinalizeBridge() {
    if (session.finalizeBridgeInstalled) return;
    session.finalizeBridgeInstalled = true;

    window.addEventListener("aerion:ficha:finalize", async (event) => {
      const snapshot = event?.detail?.state ||
        window.AERIONFicha?.getState?.();

      if (!snapshot || !session.characterId) return;

      session.finalizing = true;
      clearTimeout(session.cloudSaveTimer);

      try {
        const finalized = await persist(snapshot, "completed");
        if (!finalized) {
          throw new Error("A ficha não pôde ser gravada como pronta.");
        }
        session.status = "completed";
        notify("Ficha finalizada.", "success");

        const url = new URL(window.location.href);
        window.location.href = url.pathname.includes("fichas.html")
          ? "./minhas-fichas.html"
          : "./minhas-fichas.html";
      } catch (error) {
        console.error("[AERION][FICHAS] Finalização:", error);
        session.finalizing = false;
        notify(
          error?.message || "Não foi possível finalizar a ficha.",
          "error"
        );
      }
    });
  }

  async function startEditor() {
    await waitForFichaApi();

    installEditorHooks();
    installCloudFlushHandlers();
    installFinalizeBridge();
    bindFinalizeButtons();

    const p = params();
    const existingId = p.get("id");
    const draftId = p.get("draft");

    session.characterId =
      existingId ||
      draftId ||
      crypto.randomUUID();

    if (existingId) {
      await openExisting(existingId);
      return;
    }

    /*
     * Quando a página foi aberta diretamente como editor,
     * limpamos a ficha antiga para impedir herança acidental.
     */
    if (p.get("new") === "1") {
      clearLocalDraft();
      window.AERIONFicha.reset();
    }

    /*
     * Toda ficha nova nasce no Supabase como rascunho imediatamente.
     * O autosave posterior continua atualizando o mesmo UUID.
     */
    if (!existingId) {
      session.status = "draft";
      await persist(window.AERIONFicha.getState(), "draft");
    }
  }

  async function init() {
    if (session.booted) return;
    session.booted = true;

    try {
      await initClient();

      if (!isEditorMode()) {
        window.location.replace("./minhas-fichas.html");
        return;
      }

      await startEditor();
    } catch (error) {
      console.error("[AERION][FICHAS]", error);
      notify(
        error?.message || "Não foi possível carregar o editor de ficha.",
        "error"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
