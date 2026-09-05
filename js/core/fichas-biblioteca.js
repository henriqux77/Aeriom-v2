import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const CONFIG = Object.freeze({
    localDraftKey: "aerion:ficha:draft:v18",
    editorPage: "./fichas.html"
  });

  const state = {
    supabase: null,
    user: null,
    characterId: null,
    saving: false,
    lastSavedAt: 0
  };

  const $ = (id) => document.getElementById(id);

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function isEditorMode() {
    const p = params();
    return p.get("new") === "1" || Boolean(p.get("id"));
  }

  function setVisible(element, visible) {
    if (element) element.hidden = !visible;
  }

  function showMessage(message) {
    const box = $("ficha-library-message");
    if (!box) return;
    box.textContent = message || "";
    box.hidden = !message;
  }

  async function initClient() {
    state.supabase = await getSupabase();

    const { data, error } =
      await state.supabase.auth.getUser();

    if (error) throw error;

    state.user = data?.user || null;

    if (!state.user) {
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

  function snapshotPayload(snapshot, status) {
    const derived = snapshot?.derivedStats || {};
    const hp = snapshot?.hp || derived.hp || {};

    return {
      user_id: state.user.id,
      campaign_id: null,
      name:
        String(snapshot?.name || "Ficha sem nome").trim() ||
        "Ficha sem nome",
      age: snapshot?.age ? Number(snapshot.age) : null,
      gender: snapshot?.gender || null,
      race: snapshot?.race || null,
      class: snapshot?.class || null,
      power: snapshot?.primaryPower || null,
      origin: snapshot?.origin || null,

      racial_ability:
        derived.racialAbility ||
        (derived.abilities || []).join(" · ") ||
        null,

      hp_current:
        Math.max(0, Number(hp.current ?? 10)),

      hp_max:
        Math.max(1, Number(hp.max ?? 10)),

      mana_current:
        Math.max(0, Number(snapshot?.mana?.current ?? 0)),

      mana_max:
        Math.max(0, Number(snapshot?.mana?.max ?? 0)),

      defense:
        Math.max(
          1,
          Number(snapshot?.defense ?? derived.defense ?? 10)
        ),

      initiative:
        Number(snapshot?.initiative ?? derived.initiative ?? 0),

      movement:
        Number(snapshot?.movement ?? derived.movement ?? 9),

      appearance:
        snapshot?.appearance || {},

      attributes:
        snapshot?.assignedDice || snapshot?.attributes || {},

      techniques:
        snapshot?.techniques || [],

      inventory:
        snapshot?.inventory || [],

      equipment:
        snapshot?.equipment || [],

      conditions:
        snapshot?.conditions || [],

      racial_modifiers:
        derived.racialModifiers || {},

      movement_profile: {
        land: Number(snapshot?.movement ?? derived.movement ?? 9),
        water: derived.waterMovement ?? null
      },

      senses:
        derived.senses || [],

      creation_state:
        snapshot || {},

      status,

      updated_at:
        new Date().toISOString()
    };
  }

  async function persist(snapshot, forceStatus = null) {
    if (!state.supabase || !state.user || !state.characterId) {
      return;
    }

    if (state.saving) return;

    const status =
      forceStatus ||
      (requiredComplete(snapshot) ? "completed" : "draft");

    state.saving = true;

    try {
      const payload =
        snapshotPayload(
          snapshot,
          status
        );

      payload.id =
        state.characterId;

      const { error } =
        await state.supabase
          .from("characters")
          .upsert(
            payload,
            { onConflict: "id" }
          );

      if (error) throw error;

      state.lastSavedAt =
        Date.now();

      window.dispatchEvent(
        new CustomEvent(
          "aerion:fichas:cloudsaved",
          {
            detail: {
              characterId:
                state.characterId,
              status
            }
          }
        )
      );
    } finally {
      state.saving = false;
    }
  }

  function clearLocalDraft() {
    try {
      localStorage.removeItem(
        CONFIG.localDraftKey
      );
    } catch {}
  }

  function showLibrary() {
    setVisible(
      $("ficha-library"),
      true
    );
    setVisible(
      document.querySelector(".ficha-main"),
      false
    );
  }

  function showEditor() {
    setVisible(
      $("ficha-library"),
      false
    );
    setVisible(
      document.querySelector(".ficha-main"),
      true
    );
  }

  async function createNewDraft() {
    state.characterId =
      crypto.randomUUID();

    const url =
      new URL(
        window.location.href
      );

    url.search = "";
    url.searchParams.set(
      "new",
      "1"
    );
    url.searchParams.set(
      "draft",
      state.characterId
    );

    window.history.replaceState(
      {},
      "",
      url
    );

    clearLocalDraft();

    showEditor();

    await waitForFichaApi();

    window.AERIONFicha.reset();

    /*
     * Faz o rascunho nascer limpo.
     * O primeiro autosave criará a ficha no banco.
     */
    window.dispatchEvent(
      new CustomEvent(
        "aerion:fichas:new",
        {
          detail: {
            characterId:
              state.characterId
          }
        }
      )
    );
  }

  async function openExisting(id) {
    const { data, error } =
      await state.supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .eq("user_id", state.user.id)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "Ficha não encontrada."
      );
    }

    state.characterId =
      data.id;

    const url =
      new URL(
        window.location.href
      );

    url.search = "";
    url.searchParams.set(
      "id",
      data.id
    );

    window.history.replaceState(
      {},
      "",
      url
    );

    clearLocalDraft();
    showEditor();

    await waitForFichaApi();

    window.AERIONFicha.reset();

    if (
      data.creation_state &&
      typeof data.creation_state ===
        "object"
    ) {
      window.AERIONFicha.setState(
        data.creation_state
      );
    }
  }

  async function waitForFichaApi() {
    for (
      let attempt = 0;
      attempt < 80;
      attempt += 1
    ) {
      if (
        window.AERIONFicha &&
        typeof window.AERIONFicha.getState ===
          "function"
      ) {
        return true;
      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            100
          )
      );
    }

    throw new Error(
      "O editor de ficha não foi carregado."
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
          })[char]
      );
  }

  function statusLabel(status) {
    return status === "completed"
      ? "Pronta"
      : "Incompleta";
  }

  function renderCard(row) {
    const card =
      document.createElement(
        "article"
      );

    card.className =
      "ficha-card";

    const complete =
      row.status ===
      "completed";

    const name =
      row.name ||
      "Ficha sem nome";

    const meta =
      [
        row.race,
        row.class,
        row.power
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Ainda não configurada";

    card.innerHTML = `
      <div class="ficha-card__avatar">
        ${escapeHtml(
          String(name).slice(0,1).toUpperCase()
        )}
      </div>

      <div class="ficha-card__body">
        <span
          class="ficha-card__status ${complete ? "is-complete" : ""}"
        >
          ${statusLabel(row.status)}
        </span>

        <h2 class="ficha-card__title">
          ${escapeHtml(name)}
        </h2>

        <div class="ficha-card__meta">
          ${escapeHtml(meta)}
        </div>

        <div class="ficha-card__meta">
          HP ${Number(row.hp_current ?? 0)} / ${Number(row.hp_max ?? 0)}
          · Defesa ${Number(row.defense ?? 10)}
        </div>

        <div class="ficha-card__meta">
          Atualizada em
          ${new Date(row.updated_at).toLocaleString("pt-BR")}
        </div>

        <div class="ficha-card__actions">
          <button
            type="button"
            class="ficha-card__action ficha-card__action--primary"
            data-open-id="${escapeHtml(row.id)}"
          >
            ${complete ? "Abrir" : "Continuar"}
          </button>

          <button
            type="button"
            class="ficha-card__action"
            data-duplicate-id="${escapeHtml(row.id)}"
          >
            Duplicar
          </button>

          <button
            type="button"
            class="ficha-card__action ficha-card__action--danger"
            data-delete-id="${escapeHtml(row.id)}"
          >
            Excluir
          </button>
        </div>
      </div>
    `;

    return card;
  }

  async function loadCharacters() {
    const {
      data,
      error
    } =
      await state.supabase
        .from("characters")
        .select("*")
        .eq("user_id", state.user.id)
        .is("campaign_id", null)
        .neq("status", "archived")
        .order("updated_at", {
          ascending:false
        });

    if (error) throw error;

    return data || [];
  }

  async function renderLibrary() {
    const root =
      $("ficha-library-list");

    if (!root) return;

    root.replaceChildren();

    const rows =
      await loadCharacters();

    if (!rows.length) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "ficha-library__empty";

      empty.innerHTML =
        "<strong>Seu grimório ainda está vazio.</strong><br>Crie sua primeira ficha para começar.";

      root.appendChild(
        empty
      );

      return;
    }

    rows.forEach(
      (row) =>
        root.appendChild(
          renderCard(row)
        )
    );

    root
      .querySelectorAll(
        "[data-open-id]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            async () => {
              try {
                await openExisting(
                  button.dataset.openId
                );
              } catch (
                error
              ) {
                showMessage(
                  error.message ||
                    "Não foi possível abrir a ficha."
                );
              }
            }
          );
        }
      );

    root
      .querySelectorAll(
        "[data-delete-id]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            async () => {
              const ok =
                window.confirm(
                  "Excluir esta ficha? Essa ação não pode ser desfeita."
                );

              if (!ok) return;

              try {
                const {
                  error
                } =
                  await state.supabase
                    .from("characters")
                    .delete()
                    .eq(
                      "id",
                      button.dataset.deleteId
                    )
                    .eq(
                      "user_id",
                      state.user.id
                    );

                if (error)
                  throw error;

                await renderLibrary();
              } catch (
                error
              ) {
                showMessage(
                  error.message ||
                    "Não foi possível excluir a ficha."
                );
              }
            }
          );
        }
      );

    root
      .querySelectorAll(
        "[data-duplicate-id]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            async () => {
              try {
                const {
                  data:
                    original,
                  error
                } =
                  await state.supabase
                    .from("characters")
                    .select("*")
                    .eq(
                      "id",
                      button.dataset.duplicateId
                    )
                    .eq(
                      "user_id",
                      state.user.id
                    )
                    .single();

                if (error)
                  throw error;

                const copy =
                  {
                    ...original,
                    id:
                      crypto.randomUUID(),
                    name:
                      `${original.name || "Ficha"} (cópia)`,
                    campaign_id:
                      null,
                    status:
                      "draft",
                    updated_at:
                      new Date().toISOString()
                  };

                delete copy.created_at;

                const {
                  error:
                    insertError
                } =
                  await state.supabase
                    .from("characters")
                    .insert(copy);

                if (insertError)
                  throw insertError;

                await renderLibrary();
              } catch (
                error
              ) {
                showMessage(
                  error.message ||
                    "Não foi possível duplicar a ficha."
                );
              }
            }
          );
        }
      );
  }

  async function installEditorHooks() {
    window.addEventListener(
      "aerion:save",
      async (event) => {
        if (!isEditorMode()) return;

        const snapshot =
          event?.detail?.state;

        if (
          !snapshot ||
          !state.characterId
        ) {
          return;
        }

        try {
          await persist(
            snapshot
          );
        } catch (
          error
        ) {
          console.error(
            "[AERION][FICHAS] autosave",
            error
          );
        }
      }
    );

    window.addEventListener(
      "aerion:racial-rules:ready",
      () => {
        window.AERION_RACIAL_RULES?.calculate;
      }
    );
  }

  function addFinalizeButton() {
    const review =
      document.querySelector(
        '[data-panel="review"]'
      ) ||
      document.querySelector(
        ".review-panel"
      );

    if (
      !review ||
      document.querySelector(
        "#ficha-finalize-button"
      )
    ) {
      return;
    }

    const bar =
      document.createElement(
        "div"
      );

    bar.className =
      "ficha-finalize";

    bar.innerHTML = `
      <p>
        Ao finalizar, esta ficha passa a aparecer como
        <strong>Pronta</strong> no seu grimório.
        O rascunho continuará salvo enquanto você edita.
      </p>

      <button
        type="button"
        class="ficha-library__create"
        id="ficha-finalize-button"
      >
        Finalizar ficha
      </button>
    `;

    review.appendChild(
      bar
    );

    $(
      "ficha-finalize-button"
    ).addEventListener(
      "click",
      async () => {
        const snapshot =
          window.AERIONFicha?.getState?.();

        if (
          !requiredComplete(
            snapshot
          )
        ) {
          showMessage(
            "Complete Identidade, Raça, Aparência, Classe, Atributos e Poder antes de finalizar."
          );
          return;
        }

        try {
          await persist(
            snapshot,
            "completed"
          );

          showMessage(
            "Ficha finalizada e marcada como pronta."
          );
        } catch (
          error
        ) {
          showMessage(
            error.message ||
              "Não foi possível finalizar a ficha."
          );
        }
      }
    );
  }

  async function init() {
    try {
      await initClient();

      if (
        !isEditorMode()
      ) {
        showLibrary();

        $(
          "ficha-library-create"
        )?.addEventListener(
          "click",
          async () => {
            try {
              await createNewDraft();
            } catch (
              error
            ) {
              showMessage(
                error.message ||
                  "Não foi possível criar a ficha."
              );
            }
          }
        );

        await renderLibrary();
        return;
      }

      showEditor();

      const p =
        params();

      const existingId =
        p.get("id");

      const draftId =
        p.get("draft");

      state.characterId =
        existingId ||
        draftId ||
        crypto.randomUUID();

      if (existingId) {
        await openExisting(
          existingId
        );
      } else {
        clearLocalDraft();
        await waitForFichaApi();
        window.AERIONFicha.reset();
      }

      await installEditorHooks();
      addFinalizeButton();
    } catch (
      error
    ) {
      console.error(
        "[AERION][FICHAS]",
        error
      );

      showMessage(
        error.message ||
          "Não foi possível carregar suas fichas."
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once:true }
    );
  } else {
    init();
  }
})();
