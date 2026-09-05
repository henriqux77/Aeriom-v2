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
    storageKey: "aerion:ficha:draft:v18",
    editorPage: "./fichas.html",
    table: "characters"
  });

  const session = {
    supabase: null,
    user: null,
    characterId: null,
    currentCampaignId: null,
    saving: false,
    finalizing: false,
    hooksInstalled: false,
    finalizeBridgeInstalled: false,
    cloudFlushInstalled: false,
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

  function showMessage(message, type = "") {
    const box = $("ficha-library-message");
    if (!box) return;
    box.textContent = safeText(message);
    box.hidden = !safeText(message);
    box.dataset.type = type;
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

  function injectStyles() {
    if ($("aerion-ficha-library-styles")) return;

    const style = document.createElement("style");
    style.id = "aerion-ficha-library-styles";
    style.textContent = `
      #ficha-library {
        max-width: 1100px;
        margin: 0 auto;
        padding: 20px 18px 44px;
      }

      #ficha-library[hidden] {
        display: none !important;
      }

      .aerion-library-head {
        display: grid;
        gap: 12px;
        margin-bottom: 18px;
      }

      .aerion-library-headline {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 12px;
      }

      .aerion-library-head h2 {
        margin: 4px 0 0;
        font-family: Cinzel, serif;
        font-size: clamp(28px, 7vw, 44px);
        line-height: 1;
      }

      .aerion-library-head p {
        margin: 0;
        color: rgba(255,255,255,.50);
        font-size: 11px;
        line-height: 1.5;
      }

      .aerion-library-create {
        min-height: 46px;
        padding: 0 18px;
        border: 1px solid rgba(216,182,95,.34);
        border-radius: 12px;
        background: linear-gradient(
          135deg,
          rgba(216,182,95,.18),
          rgba(216,182,95,.07)
        );
        color: #e6c66f;
        font-weight: 900;
        cursor: pointer;
      }

      .aerion-library-message {
        margin: 0 0 14px;
        padding: 11px 13px;
        border: 1px solid rgba(216,182,95,.15);
        border-radius: 12px;
        background: rgba(216,182,95,.04);
        color: rgba(255,255,255,.72);
        font-size: 10px;
      }

      .aerion-library-message[hidden] {
        display: none !important;
      }

      .aerion-library-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .aerion-library-empty {
        grid-column: 1 / -1;
        padding: 36px 18px;
        border: 1px dashed rgba(255,255,255,.10);
        border-radius: 18px;
        text-align: center;
        color: rgba(255,255,255,.46);
        line-height: 1.6;
      }

      .aerion-ficha-card {
        display: grid;
        grid-template-columns: 68px minmax(0, 1fr);
        gap: 12px;
        padding: 12px;
        border: 1px solid rgba(255,255,255,.07);
        border-radius: 16px;
        background: rgba(255,255,255,.014);
      }

      .aerion-ficha-avatar {
        width: 68px;
        height: 68px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(216,182,95,.16);
        border-radius: 13px;
        overflow: hidden;
        background: rgba(216,182,95,.04);
        color: #e6c66f;
        font-family: Cinzel, serif;
        font-size: 22px;
      }

      .aerion-ficha-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .aerion-ficha-body {
        min-width: 0;
        display: grid;
        gap: 4px;
      }

      .aerion-ficha-status {
        justify-self: start;
        padding: 4px 7px;
        border-radius: 999px;
        background: rgba(216,182,95,.08);
        color: #e6c66f;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .11em;
        text-transform: uppercase;
      }

      .aerion-ficha-status.is-complete {
        background: rgba(100,160,110,.10);
        color: #9dc7a2;
      }

      .aerion-ficha-title {
        margin: 0;
        color: rgba(255,255,255,.90);
        font-family: Cinzel, serif;
        font-size: 15px;
      }

      .aerion-ficha-meta {
        color: rgba(255,255,255,.44);
        font-size: 9px;
        line-height: 1.45;
      }

      .aerion-ficha-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 5px;
      }

      .aerion-ficha-action {
        min-height: 32px;
        padding: 0 9px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 9px;
        background: rgba(255,255,255,.018);
        color: rgba(255,255,255,.68);
        font-size: 8px;
        font-weight: 800;
        cursor: pointer;
      }

      .aerion-ficha-action--primary {
        border-color: rgba(216,182,95,.28);
        color: #e6c66f;
      }

      .aerion-ficha-action--danger {
        border-color: rgba(200,100,100,.18);
        color: #d99a9a;
      }

      .aerion-ficha-finalize {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 18px 0;
        padding: 12px;
        border: 1px solid rgba(216,182,95,.12);
        border-radius: 14px;
        background: rgba(216,182,95,.025);
      }

      .aerion-ficha-finalize p {
        flex: 1;
        margin: 0;
        color: rgba(255,255,255,.49);
        font-size: 9px;
        line-height: 1.45;
      }

      @media (max-width: 760px) {
        #ficha-library {
          padding: 18px 14px 38px;
        }

        .aerion-library-headline {
          align-items: stretch;
          flex-direction: column;
        }

        .aerion-library-create {
          width: 100%;
        }

        .aerion-library-list {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLibraryRoot() {
    injectStyles();

    let root = $("ficha-library");
    if (root) return root;

    const main = document.querySelector(".ficha-main");
    if (!main || !main.parentNode) return null;

    root = document.createElement("section");
    root.id = "ficha-library";
    root.className = "aerion-ficha-library";
    root.innerHTML = `
      <div class="aerion-library-head">
        <div class="aerion-library-headline">
          <div>
            <span class="eyebrow">MEU GRIMÓRIO</span>
            <h2>Minhas Fichas</h2>
            <p>Suas fichas pessoais e rascunhos salvos automaticamente.</p>
          </div>
          <button type="button" class="aerion-library-create" id="ficha-library-create">
            + Criar nova ficha
          </button>
        </div>
      </div>

      <div
        class="aerion-library-message"
        id="ficha-library-message"
        hidden
        aria-live="polite"
      ></div>

      <div class="aerion-library-list" id="ficha-library-list">
        <div class="aerion-library-empty">Carregando suas fichas…</div>
      </div>
    `;

    main.parentNode.insertBefore(root, main);
    return root;
  }

  function showLibrary() {
    const root = ensureLibraryRoot();
    const main = document.querySelector(".ficha-main");

    if (!root) {
      console.warn("[AERION][FICHAS] Biblioteca não foi criada; editor permanece visível.");
      setVisible(main, true);
      return false;
    }

    setVisible(root, true);
    setVisible(main, false);
    return true;
  }

  function showEditor() {
    const root = $("ficha-library");
    const main = document.querySelector(".ficha-main");
    setVisible(root, false);
    setVisible(main, true);
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
      const status =
        forcedStatus || "draft";

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

  function installEditorHooks() {
    if (session.hooksInstalled) return;
    session.hooksInstalled = true;

    const scheduleCloudSave = (event) => {
      const snapshot =
        event?.detail?.state ||
        window.AERIONFicha?.getState?.();

      if (
        !snapshot ||
        !isEditorMode() ||
        !session.characterId ||
        session.finalizing
      ) {
        return;
      }

      clearTimeout(window.__AERIONCloudSaveTimer);
      window.__AERIONCloudSaveTimer = setTimeout(() => {
        persist(snapshot).catch((error) => {
          console.error("[AERION][FICHAS] Autosave cloud falhou:", error);
          showMessage(error?.message || "Não foi possível salvar a ficha na nuvem.", "error");
        });
      }, 180);
    };

    window.addEventListener("aerion:ficha:update", scheduleCloudSave);
    window.addEventListener("aerion:save", scheduleCloudSave);
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
    clearLocalDraft();

    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("new", "1");
    url.searchParams.set("draft", session.characterId);
    window.history.replaceState({}, "", url);

    showEditor();

    /*
     * RESET OBRIGATÓRIO:
     * toda ficha nova começa limpa.
     * O autosave seguinte criará outro registro.
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
    clearLocalDraft();

    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("id", data.id);
    window.history.replaceState({}, "", url);

    showEditor();

    window.AERIONFicha.reset();

    if (data.creation_state && typeof data.creation_state === "object") {
      window.AERIONFicha.setState(data.creation_state);
    }
  }

  async function deleteCharacter(id) {
    if (!id) return;

    const confirmed = window.confirm(
      "Excluir esta ficha?\n\nEssa ação remove a ficha da sua biblioteca. Não será possível desfazer."
    );

    if (!confirmed) return;

    const { error } = await session.supabase
      .from(CONFIG.table)
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    if (session.characterId === id) {
      session.characterId = null;
    }

    notify("Ficha excluída.", "success");
    await renderLibrary();
  }

  async function duplicateCharacter(id) {
    const { data, error } = await session.supabase
      .from(CONFIG.table)
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Ficha não encontrada.");

    const newId = crypto.randomUUID();

    const copy = {
      ...data,
      id: newId,
      user_id: session.user.id,
      campaign_id: null,
      name: `${safeText(data.name) || "Ficha sem nome"} (Cópia)`,
      status: "draft",
      updated_at: new Date().toISOString()
    };

    delete copy.created_at;

    const { error: insertError } = await session.supabase
      .from(CONFIG.table)
      .insert(copy);

    if (insertError) throw insertError;

    notify("Ficha duplicada.", "success");
    await renderLibrary();
  }

  function statusLabel(status) {
    return status === "completed" ? "Pronta" : "Incompleta";
  }

  function renderCard(row) {
    const card = document.createElement("article");
    card.className = "aerion-ficha-card";

    const complete = row.status === "completed";
    const name = safeText(row.name) || "Ficha sem nome";
    const meta = [row.race, row.class, row.power]
      .map(safeText)
      .filter(Boolean)
      .join(" · ") || "Ainda não configurada";

    card.innerHTML = `
      <div class="aerion-ficha-avatar">
        ${escapeHtml(name.slice(0, 1).toUpperCase())}
      </div>

      <div class="aerion-ficha-body">
        <span class="aerion-ficha-status ${complete ? "is-complete" : ""}">
          ${statusLabel(row.status)}
        </span>

        <h3 class="aerion-ficha-title">${escapeHtml(name)}</h3>

        <div class="aerion-ficha-meta">${escapeHtml(meta)}</div>

        <div class="aerion-ficha-meta">
          HP ${number(row.hp_current, 0)} / ${number(row.hp_max, 10)}
          · Defesa ${number(row.defense, 10)}
        </div>

        <div class="aerion-ficha-meta">
          ${row.updated_at
            ? `Atualizada em ${new Date(row.updated_at).toLocaleString("pt-BR")}`
            : "Sem data de atualização"}
        </div>

        <div class="aerion-ficha-actions">
          <button
            type="button"
            class="aerion-ficha-action aerion-ficha-action--primary"
            data-ficha-open="${escapeHtml(row.id)}"
          >
            ${complete ? "Abrir" : "Continuar"}
          </button>

          <button
            type="button"
            class="aerion-ficha-action"
            data-ficha-duplicate="${escapeHtml(row.id)}"
          >
            Duplicar
          </button>

          <button
            type="button"
            class="aerion-ficha-action aerion-ficha-action--danger"
            data-ficha-delete="${escapeHtml(row.id)}"
          >
            Excluir
          </button>
        </div>
      </div>
    `;

    return card;
  }

  async function loadCharacters() {
    const { data, error } = await session.supabase
      .from(CONFIG.table)
      .select("*")
      .eq("user_id", session.user.id)
      .is("campaign_id", null)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function renderLibrary() {
    const root = ensureLibraryRoot();
    const list = $("ficha-library-list");

    if (!root || !list) return;

    list.innerHTML = `
      <div class="aerion-library-empty">
        Carregando suas fichas…
      </div>
    `;

    try {
      const rows = await loadCharacters();
      list.replaceChildren();

      if (!rows.length) {
        const empty = document.createElement("div");
        empty.className = "aerion-library-empty";
        empty.innerHTML =
          "<strong>Seu grimório ainda está vazio.</strong><br>Crie sua primeira ficha para começar.";
        list.appendChild(empty);
        return;
      }

      rows.forEach((row) => {
        list.appendChild(renderCard(row));
      });
    } catch (error) {
      console.error("[AERION][FICHAS] Falha ao carregar biblioteca:", error);
      showMessage(
        error?.message || "Não foi possível carregar suas fichas.",
        "error"
      );
    }
  }

  function bindLibraryEvents() {
    const root = ensureLibraryRoot();
    if (!root || root.dataset.bound === "1") return;

    root.dataset.bound = "1";

    $("ficha-library-create")?.addEventListener("click", async () => {
      try {
        await createNewDraft();
      } catch (error) {
        console.error("[AERION][FICHAS]", error);
        showMessage(
          error?.message || "Não foi possível criar a ficha.",
          "error"
        );
      }
    });

    $("ficha-library-list")?.addEventListener("click", async (event) => {
      const openButton = event.target.closest("[data-ficha-open]");
      const duplicateButton = event.target.closest("[data-ficha-duplicate]");
      const deleteButton = event.target.closest("[data-ficha-delete]");

      try {
        if (openButton) {
          await openExisting(openButton.dataset.fichaOpen);
          return;
        }

        if (duplicateButton) {
          await duplicateCharacter(duplicateButton.dataset.fichaDuplicate);
          return;
        }

        if (deleteButton) {
          await deleteCharacter(deleteButton.dataset.fichaDelete);
        }
      } catch (error) {
        console.error("[AERION][FICHAS]", error);
        showMessage(
          error?.message || "A operação não pôde ser concluída.",
          "error"
        );
      }
    });
  }

  function addFinalizeButton() {
    if (
      document.querySelector("#aerion-finalize-bottom") ||
      document.querySelector("#aerion-finalize-ficha")
    ) return;

    const review =
      document.querySelector('[data-panel="review"]') ||
      document.querySelector(".review-panel");

    if (!review) return;

    const box = document.createElement("div");
    box.className = "aerion-ficha-finalize";
    box.id = "aerion-finalize-ficha";
    box.innerHTML = `
      <p>
        O salvamento automático mantém a ficha como <strong>Incompleta</strong>.
        Quando tudo estiver revisado, finalize para marcá-la como pronta.
      </p>
      <button
        type="button"
        class="primary-button"
        id="aerion-finalize-ficha-button"
      >
        Finalizar ficha
      </button>
    `;

    review.prepend(box);

    $("aerion-finalize-ficha-button")?.addEventListener("click", () => {
      window.AERIONFicha?.finalizeCharacter?.();
    });
;
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

  function addHeaderFinalizeButton() {
    if (document.getElementById("aerion-header-finalize")) return;

    const header = document.querySelector(".ficha-header");
    const saveStatus = document.getElementById("saveStatus");
    if (!header || !saveStatus) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "aerion-header-finalize";
    button.className = "ficha-header-finalize";
    button.hidden = true;
    button.textContent = "Finalizar";

    button.addEventListener("click", () => {
      window.AERIONFicha?.finalizeCharacter?.();
    });

    saveStatus.insertAdjacentElement("afterend", button);
  }

  function installCloudFlushHandlers() {
    if (session.cloudFlushInstalled) return;
    session.cloudFlushInstalled = true;

    const flush = () => {
      if (!isEditorMode() || session.finalizing || !session.characterId) return;
      const snapshot = window.AERIONFicha?.getState?.();
      if (snapshot) {
        persist(snapshot).catch((error) =>
          console.error("[AERION][FICHAS] Flush:", error)
        );
      }
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
      clearTimeout(window.__AERIONCloudSaveTimer);

      try {
        const finalized = await persist(snapshot, "completed");
        if (!finalized) {
          throw new Error("A ficha não pôde ser gravada como pronta.");
        }
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
    addHeaderFinalizeButton();
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

    showEditor();

    /*
     * Toda ficha nova nasce no Supabase como rascunho imediatamente.
     * O autosave posterior continua atualizando o mesmo UUID.
     */
    if (!existingId) {
      await persist(window.AERIONFicha.getState(), "draft");
    }

    addFinalizeButton();
  }

  async function init() {
    if (session.booted) return;
    session.booted = true;

    try {
      await initClient();

      bindLibraryEvents();

      if (!isEditorMode()) {
        if (showLibrary()) {
          await renderLibrary();
        }
        return;
      }

      await startEditor();
    } catch (error) {
      console.error("[AERION][FICHAS]", error);

      /*
       * Nunca esconder o editor por causa da biblioteca.
       * Esse é o guard principal que evita repetir o bug atual.
       */
      const main = document.querySelector(".ficha-main");
      if (main) {
        main.hidden = false;
        main.style.removeProperty("display");
      }

      const root = $("ficha-library");
      if (root) root.hidden = true;

      showMessage(
        error?.message || "Não foi possível carregar suas fichas.",
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
