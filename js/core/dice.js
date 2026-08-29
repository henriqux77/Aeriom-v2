/*
 * ============================================================
 * AERIOM v2
 * js/core/dice.js
 * Sistema de rolagem de dados
 * ============================================================
 *
 * Suporta:
 *
 * d4
 * d6
 * d8
 * d10
 * d12
 * d20
 * d100
 *
 * Modificadores positivos e negativos.
 *
 * Modos:
 * - public
 * - private
 *
 * Integração com:
 * - campaigns
 * - campaign_members
 * - characters
 * - dice_rolls
 *
 * O resultado salvo no banco contém:
 * - campaign_id
 * - user_id
 * - character_id
 * - die_type
 * - roll_result
 * - modifier
 * - total_result
 * - visibility
 * - context
 *
 * ============================================================
 */


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const DICE_CONFIG = Object.freeze({

  allowedDice:
    Object.freeze([
      4,
      6,
      8,
      10,
      12,
      20,
      100
    ]),

  defaultDie:
    20,

  defaultModifier:
    0,

  defaultVisibility:
    "public",

  maxModifier:
    999,

  minModifier:
    -999,

  maxContextLength:
    500,

  realtimeChannelPrefix:
    "campaign-dice"

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  initialized:
    false,

  supabase:
    null,

  campaignId:
    null,

  user:
    null,

  membership:
    null,

  selectedCharacterId:
    null,

  selectedDie:
    DICE_CONFIG.defaultDie,

  modifier:
    DICE_CONFIG.defaultModifier,

  visibility:
    DICE_CONFIG.defaultVisibility,

  context:
    "",

  rolling:
    false,

  lastRoll:
    null,

  realtimeChannel:
    null,

  realtimeConnected:
    false

};


/* ============================================================
   LOG
   ============================================================ */

function log(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][DICE]";


  if (
    level ===
    "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;

  }


  if (
    level ===
    "warn"
  ) {

    console.warn(
      prefix,
      message,
      details ?? ""
    );

    return;

  }


  console.info(
    prefix,
    message,
    details ?? ""
  );

}


/* ============================================================
   DOM
   ============================================================ */

function getElement(
  id
) {

  return document.getElementById(
    id
  );

}


function getElements(
  selector
) {

  if (
    typeof selector !==
    "string"
  ) {

    return [];

  }


  return Array.from(
    document.querySelectorAll(
      selector
    )
  );

}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  return typeof value ===
    "string"

    ? value

    : fallback;

}


function safeInteger(
  value,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return fallback;

  }


  return Math.trunc(
    number
  );

}


/* ============================================================
   VALIDAÇÃO
   ============================================================ */

function isValidDie(
  die
) {

  return DICE_CONFIG.allowedDice.includes(
    safeInteger(
      die
    )
  );

}


function normalizeDie(
  die
) {

  const normalized =
    safeInteger(
      die,
      DICE_CONFIG.defaultDie
    );


  if (
    isValidDie(
      normalized
    )
  ) {

    return normalized;

  }


  return DICE_CONFIG.defaultDie;

}


function normalizeModifier(
  modifier
) {

  let value =
    safeInteger(
      modifier,
      DICE_CONFIG.defaultModifier
    );


  value =
    Math.max(
      DICE_CONFIG.minModifier,
      value
    );


  value =
    Math.min(
      DICE_CONFIG.maxModifier,
      value
    );


  return value;

}


function normalizeVisibility(
  visibility
) {

  return visibility ===
    "private"

    ? "private"

    : "public";

}


function normalizeContext(
  context
) {

  const value =
    safeString(
      context
    )
      .trim();


  return value.slice(
    0,
    DICE_CONFIG.maxContextLength
  );

}


/* ============================================================
   ERRO
   ============================================================ */

function createDiceError(
  message,
  details = null
) {

  const error =
    new Error(
      message
    );


  error.details =
    details;


  return error;

}


/* ============================================================
   ACESSO
   ============================================================ */

function hasCampaignContext() {

  return Boolean(
    state.supabase &&
    state.campaignId &&
    state.user
  );

}


function isMaster() {

  return (
    state.membership?.role ===
    "master"
  );

}


function isPlayer() {

  return (
    state.membership?.role ===
    "player"
  );

}


/* ============================================================
   OBTÉM CONTEXTO DO CAMPAIGN.JS
   ============================================================ */

function readCampaignContext() {

  const api =
    window.AERIOM_CAMPAIGN;


  if (
    !api ||
    typeof api.getContext !==
      "function"
  ) {

    return false;

  }


  const context =
    api.getContext();


  if (
    !context
  ) {

    return false;

  }


  state.supabase =
    context.supabase ||
    null;


  state.campaignId =
    context.campaignId ||
    null;


  state.user =
    context.user ||
    null;


  state.membership =
    context.membership ||
    null;


  return Boolean(
    state.supabase &&
    state.campaignId &&
    state.user
  );

}


/* ============================================================
   SELEÇÃO DE PERSONAGEM
   ============================================================ */

function setCharacter(
  characterId
) {

  if (
    characterId ===
      null ||
    characterId ===
      undefined ||
    characterId ===
      ""
  ) {

    state.selectedCharacterId =
      null;

    renderCharacterSelection();

    return null;

  }


  state.selectedCharacterId =
    String(
      characterId
    );


  renderCharacterSelection();


  dispatchDiceEvent(
    "characterchange",
    {

      characterId:
        state.selectedCharacterId

    }
  );


  return state.selectedCharacterId;

}


function getSelectedCharacterId() {

  return (
    state.selectedCharacterId
      ? String(
          state.selectedCharacterId
        )
      : null
  );

}


/* ============================================================
   DADOS
   ============================================================ */

function setDie(
  die
) {

  const normalized =
    normalizeDie(
      die
    );


  state.selectedDie =
    normalized;


  renderDiceSelection();


  dispatchDiceEvent(
    "dieselectionchange",
    {

      die:
        normalized

    }
  );


  return normalized;

}


/* ============================================================
   MODIFICADOR
   ============================================================ */

function setModifier(
  modifier
) {

  const normalized =
    normalizeModifier(
      modifier
    );


  state.modifier =
    normalized;


  renderModifier();


  dispatchDiceEvent(
    "modifierchange",
    {

      modifier:
        normalized

    }
  );


  return normalized;

}


/* ============================================================
   VISIBILIDADE
   ============================================================ */

function setVisibility(
  visibility
) {

  const normalized =
    normalizeVisibility(
      visibility
    );


  /*
   * Jogador não pode usar "private" para esconder
   * uma rolagem do Mestre se o projeto futuramente
   * determinar que o Mestre precisa receber todas.
   *
   * Por enquanto a visibilidade é exatamente a opção
   * existente no schema.
   */

  state.visibility =
    normalized;


  renderVisibility();


  dispatchDiceEvent(
    "visibilitychange",
    {

      visibility:
        normalized

    }
  );


  return normalized;

}


/* ============================================================
   CONTEXTO DA ROLAGEM
   ============================================================ */

function setContext(
  context
) {

  const normalized =
    normalizeContext(
      context
    );


  state.context =
    normalized;


  renderContext();


  return normalized;

}


/* ============================================================
   ROLAGEM LOCAL
   ============================================================ */

function randomInteger(
  min,
  max
) {

  const range =
    max -
    min +
    1;


  /*
   * crypto.getRandomValues é preferível ao Math.random
   * para dados do RPG.
   */

  if (
    window.crypto &&
    typeof window.crypto.getRandomValues ===
      "function"
  ) {

    const maxUint =
      0xFFFFFFFF;


    const limit =
      maxUint -
      (
        maxUint %
        range
      );


    const buffer =
      new Uint32Array(
        1
      );


    let value;


    do {

      window.crypto.getRandomValues(
        buffer
      );


      value =
        buffer[0];

    }
    while (
      value >=
      limit
    );


    return (
      min +
      (
        value %
        range
      )
    );

  }


  return (
    Math.floor(
      Math.random() *
      range
    ) +
    min
  );

}


function rollLocal(
  die,
  modifier
) {

  const normalizedDie =
    normalizeDie(
      die
    );


  const normalizedModifier =
    normalizeModifier(
      modifier
    );


  const result =
    randomInteger(
      1,
      normalizedDie
    );


  const total =
    result +
    normalizedModifier;


  return {

    dieType:
      normalizedDie,

    rollResult:
      result,

    modifier:
      normalizedModifier,

    totalResult:
      total

  };

}


/* ============================================================
   CLASSIFICAÇÃO
   ============================================================ */

function classifyRoll(
  roll
) {

  if (
    !roll
  ) {

    return "normal";

  }


  const die =
    safeInteger(
      roll.dieType
    );


  const result =
    safeInteger(
      roll.rollResult
    );


  if (
    die ===
      20 &&
    result ===
      20
  ) {

    return "critical";

  }


  if (
    die ===
      20 &&
    result ===
      1
  ) {

    return "critical-failure";

  }


  return "normal";

}


/* ============================================================
   FORMATAÇÃO
   ============================================================ */

function formatDiceNotation(
  die,
  modifier
) {

  const normalizedDie =
    normalizeDie(
      die
    );


  const normalizedModifier =
    normalizeModifier(
      modifier
    );


  if (
    normalizedModifier ===
    0
  ) {

    return `d${normalizedDie}`;

  }


  if (
    normalizedModifier >
    0
  ) {

    return (
      `d${normalizedDie}+${normalizedModifier}`
    );

  }


  return (
    `d${normalizedDie}${normalizedModifier}`
  );

}


function formatRollResult(
  roll
) {

  if (
    !roll
  ) {

    return "";

  }


  const notation =
    formatDiceNotation(
      roll.dieType,
      roll.modifier
    );


  return (
    `${notation} → ${roll.totalResult}`
  );

}


/* ============================================================
   SALVAR NO SUPABASE
   ============================================================ */

async function saveRoll(
  roll
) {

  if (
    !hasCampaignContext()
  ) {

    throw createDiceError(
      "O contexto da campanha ainda não foi carregado."
    );

  }


  const payload = {

    campaign_id:
      state.campaignId,

    user_id:
      state.user.id,

    character_id:
      roll.characterId,

    die_type:
      roll.dieType,

    roll_result:
      roll.rollResult,

    modifier:
      roll.modifier,

    total_result:
      roll.totalResult,

    visibility:
      roll.visibility,

    context:
      roll.context ||
      null

  };


  const {
    data,
    error
  } =
    await state.supabase
      .from(
        "dice_rolls"
      )
      .insert(
        payload
      )
      .select(
        `
          id,
          campaign_id,
          user_id,
          character_id,
          die_type,
          roll_result,
          modifier,
          total_result,
          visibility,
          context,
          created_at
        `
      )
      .single();


  if (
    error
  ) {

    log(
      "error",
      "Falha ao salvar rolagem.",
      error
    );


    throw error;

  }


  return normalizeSavedRoll(
    data
  );

}


/* ============================================================
   NORMALIZA ROLAGEM DO BANCO
   ============================================================ */

function normalizeSavedRoll(
  row
) {

  if (
    !row
  ) {

    return null;

  }


  return {

    id:
      row.id
        ? String(
            row.id
          )
        : null,

    campaignId:
      row.campaign_id
        ? String(
            row.campaign_id
          )
        : null,

    userId:
      row.user_id
        ? String(
            row.user_id
          )
        : null,

    characterId:
      row.character_id
        ? String(
            row.character_id
          )
        : null,

    dieType:
      normalizeDie(
        row.die_type
      ),

    rollResult:
      safeInteger(
        row.roll_result
      ),

    modifier:
      normalizeModifier(
        row.modifier
      ),

    totalResult:
      safeInteger(
        row.total_result
      ),

    visibility:
      normalizeVisibility(
        row.visibility
      ),

    context:
      normalizeContext(
        row.context
      ),

    createdAt:
      row.created_at ||
      null

  };

}


/* ============================================================
   EXECUTA ROLAGEM
   ============================================================ */

async function roll(
  options = {}
) {

  if (
    state.rolling
  ) {

    return null;

  }


  if (
    !readCampaignContext()
  ) {

    throw createDiceError(
      "O contexto da campanha ainda não está disponível."
    );

  }


  if (
    !state.membership
  ) {

    throw createDiceError(
      "Você não possui uma função nesta campanha."
    );

  }


  state.rolling =
    true;


  setRollingUi(
    true
  );


  try {

    const die =
      normalizeDie(
        options.die ??
        state.selectedDie
      );


    const modifier =
      normalizeModifier(
        options.modifier ??
        state.modifier
      );


    const visibility =
      normalizeVisibility(
        options.visibility ??
        state.visibility
      );


    const context =
      normalizeContext(
        options.context ??
        state.context
      );


    const characterId =
      options.characterId !==
        undefined

        ? (
            options.characterId
              ? String(
                  options.characterId
                )
              : null
          )

        : getSelectedCharacterId();


    /*
     * Não permitimos um character_id arbitrário.
     *
     * O personagem precisa pertencer ao próprio usuário
     * e à campanha atual.
     */

    if (
      characterId
    ) {

      await validateCharacterOwnership(
        characterId
      );

    }


    const local =
      rollLocal(
        die,
        modifier
      );


    const rollData = {

      ...local,

      campaignId:
        state.campaignId,

      userId:
        state.user.id,

      characterId,

      visibility,

      context,

      notation:
        formatDiceNotation(
          die,
          modifier
        ),

      classification:
        classifyRoll(
          {

            dieType:
              die,

            rollResult:
              local.rollResult,

            modifier,

            totalResult:
              local.totalResult

          }
        )

    };


    /*
     * O resultado local é mostrado imediatamente.
     */

    state.lastRoll =
      rollData;


    renderLastRoll(
      rollData
    );


    dispatchDiceEvent(
      "rollstart",
      rollData
    );


    /*
     * Depois persistimos no banco.
     */

    const saved =
      await saveRoll(
        rollData
      );


    const finalRoll = {

      ...rollData,

      id:
        saved?.id ||
        null,

      createdAt:
        saved?.createdAt ||
        new Date().toISOString()

    };


    state.lastRoll =
      finalRoll;


    renderLastRoll(
      finalRoll
    );


    dispatchDiceEvent(
      "roll",
      finalRoll
    );


    return finalRoll;

  } catch (
    error
  ) {

    log(
      "error",
      "Erro durante a rolagem.",
      error
    );


    showDiceError(
      getDiceErrorMessage(
        error
      )
    );


    dispatchDiceEvent(
      "rollerror",
      {

        error

      }
    );


    throw error;

  } finally {

    state.rolling =
      false;


    setRollingUi(
      false
    );

  }

}


/* ============================================================
   VALIDAÇÃO DO PERSONAGEM
   ============================================================ */

async function validateCharacterOwnership(
  characterId
) {

  if (
    !state.supabase ||
    !state.user ||
    !state.campaignId
  ) {

    throw createDiceError(
      "Contexto insuficiente para validar personagem."
    );

  }


  const {
    data,
    error
  } =
    await state.supabase
      .from(
        "characters"
      )
      .select(
        `
          id,
          user_id,
          campaign_id
        `
      )
      .eq(
        "id",
        characterId
      )
      .eq(
        "user_id",
        state.user.id
      )
      .eq(
        "campaign_id",
        state.campaignId
      )
      .maybeSingle();


  if (
    error
  ) {

    throw error;

  }


  if (
    !data
  ) {

    throw createDiceError(
      "Este personagem não pertence a você nesta campanha."
    );

  }


  return true;

}


/* ============================================================
   BUSCAR ROLAGENS
   ============================================================ */

async function loadRecentRolls(
  limit = 30
) {

  if (
    !hasCampaignContext()
  ) {

    return [];

  }


  let safeLimit =
    safeInteger(
      limit,
      30
    );


  safeLimit =
    Math.max(
      1,
      safeLimit
    );


  safeLimit =
    Math.min(
      100,
      safeLimit
    );


  const {
    data,
    error
  } =
    await state.supabase
      .from(
        "dice_rolls"
      )
      .select(
        `
          id,
          campaign_id,
          user_id,
          character_id,
          die_type,
          roll_result,
          modifier,
          total_result,
          visibility,
          context,
          created_at
        `
      )
      .eq(
        "campaign_id",
        state.campaignId
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .limit(
        safeLimit
      );


  if (
    error
  ) {

    log(
      "error",
      "Falha ao carregar histórico de dados.",
      error
    );


    throw error;

  }


  return Array.isArray(
    data
  )

    ? data
        .map(
          normalizeSavedRoll
        )
        .filter(
          Boolean
        )

    : [];

}


/* ============================================================
   REALTIME
   ============================================================ */

function getRealtimeChannelName() {

  return [
    DICE_CONFIG.realtimeChannelPrefix,
    state.campaignId
  ]
    .join(
      "-"
    );

}


function removeRealtimeChannel() {

  if (
    state.realtimeChannel &&
    state.supabase
  ) {

    try {

      state.supabase
        .removeChannel(
          state.realtimeChannel
        );

    } catch (
      error
    ) {

      log(
        "warn",
        "Falha ao remover canal de dados.",
        error
      );

    }

  }


  state.realtimeChannel =
    null;


  state.realtimeConnected =
    false;


  updateRealtimeUi();

}


function subscribeRealtime() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    return;

  }


  removeRealtimeChannel();


  const channel =
    state.supabase.channel(
      getRealtimeChannelName()
    );


  channel.on(
    "postgres_changes",
    {

      event:
        "INSERT",

      schema:
        "public",

      table:
        "dice_rolls",

      filter:
        `campaign_id=eq.${state.campaignId}`

    },
    handleRemoteRoll
  );


  state.realtimeChannel =
    channel;


  channel.subscribe(
    (
      status
    ) => {

      log(
        "info",
        `Realtime de dados: ${status}`
      );


      state.realtimeConnected =
        status ===
        "SUBSCRIBED";


      updateRealtimeUi();

    }
  );

}


/* ============================================================
   ROLAGEM REMOTA
   ============================================================ */

function handleRemoteRoll(
  payload
) {

  const row =
    payload?.new;


  if (
    !row
  ) {

    return;

  }


  const roll =
    normalizeSavedRoll(
      row
    );


  if (
    !roll
  ) {

    return;

  }


  /*
   * Não adicionamos a própria rolagem novamente.
   *
   * A rolagem local já foi renderizada.
   */

  if (
    state.user &&
    roll.userId ===
      state.user.id
  ) {

    return;

  }


  /*
   * Rolagens privadas só podem aparecer para o próprio
   * autor ou para quem o RLS permitir que leia.
   *
   * O Realtime respeita a configuração do Supabase.
   */

  renderRemoteRoll(
    roll
  );


  dispatchDiceEvent(
    "remoteroll",
    roll
  );

}


/* ============================================================
   UI — DADOS
   ============================================================ */

function renderDiceSelection() {

  getElements(
    "[data-die]"
  )
    .forEach(
      (
        button
      ) => {

        const die =
          normalizeDie(
            button.dataset.die
          );


        const active =
          die ===
          state.selectedDie;


        button.classList.toggle(
          "is-active",
          active
        );


        button.setAttribute(
          "aria-pressed",
          String(
            active
          )
        );

      }
    );


  const display =
    getElement(
      "dice-selected-die"
    );


  if (
    display
  ) {

    display.textContent =
      `d${state.selectedDie}`;

  }


  updateNotationUi();

}


/* ============================================================
   UI — MODIFICADOR
   ============================================================ */

function renderModifier() {

  const input =
    getElement(
      "dice-modifier"
    );


  if (
    input &&
    document.activeElement !==
      input
  ) {

    input.value =
      String(
        state.modifier
      );

  }


  const display =
    getElement(
      "dice-modifier-display"
    );


  if (
    display
  ) {

    display.textContent =
      state.modifier >=
        0

        ? `+${state.modifier}`

        : String(
            state.modifier
          );

  }


  updateNotationUi();

}


/* ============================================================
   UI — VISIBILIDADE
   ============================================================ */

function renderVisibility() {

  getElements(
    "[data-dice-visibility]"
  )
    .forEach(
      (
        element
      ) => {

        const value =
          normalizeVisibility(
            element.dataset.diceVisibility
          );


        const active =
          value ===
          state.visibility;


        element.classList.toggle(
          "is-active",
          active
        );


        element.setAttribute(
          "aria-pressed",
          String(
            active
          )
        );

      }
    );


  const select =
    getElement(
      "dice-visibility"
    );


  if (
    select &&
    document.activeElement !==
      select
  ) {

    select.value =
      state.visibility;

  }

}


/* ============================================================
   UI — CONTEXTO
   ============================================================ */

function renderContext() {

  const input =
    getElement(
      "dice-context"
    );


  if (
    input &&
    document.activeElement !==
      input
  ) {

    input.value =
      state.context;

  }


}


/* ============================================================
   UI — PERSONAGEM
   ============================================================ */

function renderCharacterSelection() {

  const select =
    getElement(
      "dice-character"
    );


  if (
    select &&
    document.activeElement !==
      select
  ) {

    select.value =
      state.selectedCharacterId ||
      "";

  }

}


/* ============================================================
   UI — NOTAÇÃO
   ============================================================ */

function updateNotationUi() {

  const notation =
    getElement(
      "dice-notation"
    );


  if (
    notation
  ) {

    notation.textContent =
      formatDiceNotation(
        state.selectedDie,
        state.modifier
      );

  }

}


/* ============================================================
   UI — ÚLTIMA ROLAGEM
   ============================================================ */

function renderLastRoll(
  roll
) {

  if (
    !roll
  ) {

    return;

  }


  const result =
    getElement(
      "dice-result"
    );


  const number =
    getElement(
      "dice-result-number"
    );


  const notation =
    getElement(
      "dice-result-notation"
    );


  const classification =
    getElement(
      "dice-result-classification"
    );


  if (
    result
  ) {

    result.hidden =
      false;


    result.dataset.result =
      roll.classification ||
      "normal";

  }


  if (
    number
  ) {

    number.textContent =
      String(
        roll.totalResult
      );

  }


  if (
    notation
  ) {

    notation.textContent =
      formatDiceNotation(
        roll.dieType,
        roll.modifier
      );

  }


  if (
    classification
  ) {

    if (
      roll.classification ===
      "critical"
    ) {

      classification.textContent =
        "CRÍTICO!";

    }
    else if (
      roll.classification ===
      "critical-failure"
    ) {

      classification.textContent =
        "FALHA CRÍTICA";

    }
    else {

      classification.textContent =
        "";

    }

  }


  animateDiceResult(
    result
  );

}


/* ============================================================
   ANIMAÇÃO
   ============================================================ */

function animateDiceResult(
  element
) {

  if (
    !element
  ) {

    return;

  }


  element.classList.remove(
    "dice-result--rolling"
  );


  /*
   * Força reflow para permitir repetir a animação.
   */

  void element.offsetWidth;


  element.classList.add(
    "dice-result--rolling"
  );


  window.setTimeout(
    () => {

      element.classList.remove(
        "dice-result--rolling"
      );

    },
    500
  );

}


/* ============================================================
   UI — ROLANDO
   ============================================================ */

function setRollingUi(
  rolling
) {

  getElements(
    "[data-dice-roll]"
  )
    .forEach(
      (
        button
      ) => {

        button.disabled =
          rolling;


        button.classList.toggle(
          "is-rolling",
          rolling
        );

      }
    );


  const result =
    getElement(
      "dice-result"
    );


  if (
    rolling &&
    result
  ) {

    result.classList.add(
      "dice-result--rolling"
    );

  }

}


/* ============================================================
   UI — REALTIME
   ============================================================ */

function updateRealtimeUi() {

  const indicator =
    getElement(
      "dice-realtime-status"
    );


  if (
    !indicator
  ) {

    return;

  }


  indicator.dataset.connected =
    String(
      state.realtimeConnected
    );


  const text =
    indicator.querySelector(
      "[data-dice-realtime-text]"
    );


  if (
    text
  ) {

    text.textContent =
      state.realtimeConnected

        ? "Dados sincronizados"

        : "Reconectando dados...";

  }

}


/* ============================================================
   UI — ERRO
   ============================================================ */

function showDiceError(
  message
) {

  const element =
    getElement(
      "dice-error"
    );


  if (
    !element
  ) {

    return;

  }


  element.textContent =
    message;


  element.hidden =
    false;


  window.setTimeout(
    () => {

      element.hidden =
        true;

    },
    5000
  );

}


/* ============================================================
   ERROS AMIGÁVEIS
   ============================================================ */

function getDiceErrorMessage(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    );


  const normalized =
    message.toLowerCase();


  if (
    normalized.includes(
      "row-level security"
    ) ||
    normalized.includes(
      "permission"
    ) ||
    normalized.includes(
      "forbidden"
    )
  ) {

    return (
      "O banco recusou esta rolagem. Verifique as políticas RLS de dice_rolls."
    );

  }


  if (
    normalized.includes(
      "personagem"
    )
  ) {

    return message;

  }


  if (
    normalized.includes(
      "contexto"
    )
  ) {

    return (
      "A mesa ainda está carregando. Tente novamente em alguns segundos."
    );

  }


  return (
    message ||
    "Não foi possível realizar a rolagem."
  );

}


/* ============================================================
   RENDER REMOTO
   ============================================================ */

function renderRemoteRoll(
  roll
) {

  const history =
    getElement(
      "dice-history"
    );


  if (
    !history
  ) {

    return;

  }


  const item =
    document.createElement(
      "article"
    );


  item.className =
    "dice-history__item";


  item.dataset.rollId =
    roll.id ||
    "";


  const notation =
    document.createElement(
      "span"
    );


  notation.className =
    "dice-history__notation";


  notation.textContent =
    formatDiceNotation(
      roll.dieType,
      roll.modifier
    );


  const result =
    document.createElement(
      "strong"
    );


  result.className =
    "dice-history__result";


  result.textContent =
    String(
      roll.totalResult
    );


  const meta =
    document.createElement(
      "span"
    );


  meta.className =
    "dice-history__meta";


  meta.textContent =
    roll.context ||
    "Rolagem";


  item.append(
    notation,
    result,
    meta
  );


  history.prepend(
    item
  );


  while (
    history.children.length >
    50
  ) {

    history.lastElementChild
      ?.remove();

  }

}


/* ============================================================
   HISTÓRICO
   ============================================================ */

async function renderHistory() {

  const history =
    getElement(
      "dice-history"
    );


  if (
    !history
  ) {

    return;

  }


  history.replaceChildren();


  try {

    const rolls =
      await loadRecentRolls(
        30
      );


    rolls
      .reverse()
      .forEach(
        (
          roll
        ) => {

          renderRemoteRoll(
            roll
          );

        }
      );

  } catch (
    error
  ) {

    log(
      "warn",
      "Não foi possível renderizar o histórico.",
      error
    );

  }

}


/* ============================================================
   EVENTOS
   ============================================================ */

function dispatchDiceEvent(
  eventName,
  detail
) {

  window.dispatchEvent(
    new CustomEvent(
      `aeriom:dice:${eventName}`,
      {

        detail

      }
    )
  );

}


/* ============================================================
   BIND DOS DADOS
   ============================================================ */

function bindDiceSelection() {

  getElements(
    "[data-die]"
  )
    .forEach(
      (
        button
      ) => {

        button.addEventListener(
          "click",
          () => {

            setDie(
              button.dataset.die
            );

          }
        );

      }
    );

}


/* ============================================================
   BIND MODIFICADOR
   ============================================================ */

function bindModifier() {

  const input =
    getElement(
      "dice-modifier"
    );


  if (
    !input
  ) {

    return;

  }


  input.addEventListener(
    "input",
    () => {

      setModifier(
        input.value
      );

    }
  );


  input.addEventListener(
    "blur",
    () => {

      input.value =
        String(
          state.modifier
        );

    }
  );

}


/* ============================================================
   BIND VISIBILIDADE
   ============================================================ */

function bindVisibility() {

  getElements(
    "[data-dice-visibility]"
  )
    .forEach(
      (
        element
      ) => {

        element.addEventListener(
          "click",
          () => {

            setVisibility(
              element.dataset.diceVisibility
            );

          }
        );

      }
    );


  const select =
    getElement(
      "dice-visibility"
    );


  select?.addEventListener(
    "change",
    () => {

      setVisibility(
        select.value
      );

    }
  );

}


/* ============================================================
   BIND PERSONAGEM
   ============================================================ */

function bindCharacter() {

  const select =
    getElement(
      "dice-character"
    );


  if (
    !select
  ) {

    return;

  }


  select.addEventListener(
    "change",
    () => {

      setCharacter(
        select.value ||
        null
      );

    }
  );

}


/* ============================================================
   BIND CONTEXTO
   ============================================================ */

function bindContext() {

  const input =
    getElement(
      "dice-context"
    );


  if (
    !input
  ) {

    return;

  }


  input.addEventListener(
    "input",
    () => {

      setContext(
        input.value
      );

    }
  );

}


/* ============================================================
   BIND ROLAR
   ============================================================ */

function bindRollButtons() {

  getElements(
    "[data-dice-roll]"
  )
    .forEach(
      (
        button
      ) => {

        button.addEventListener(
          "click",
          async () => {

            const die =
              button.dataset.diceRoll;


            try {

              await roll({

                die:
                  die ||
                  state.selectedDie

              });

            } catch {

              /*
               * O erro já foi apresentado na UI.
               */

            }

          }
        );

      }
    );


  /*
   * Atalho:
   *
   * Espaço / Enter quando o foco está no botão.
   * O clique nativo já resolve isso.
   */

}


/* ============================================================
   BIND EVENTOS DA CAMPANHA
   * ============================================================ */

function bindCampaignEvents() {

  window.addEventListener(
    "aeriom:campaignready",
    () => {

      initializeFromCampaign();

    }
  );


  window.addEventListener(
    "aeriom:campaigncharacterschange",
    () => {

      populateCharacterSelect();

    }
  );


  window.addEventListener(
    "aeriom:campaigntabchange",
    (
      event
    ) => {

      if (
        event.detail?.tab ===
        "dice"
      ) {

        renderHistory();

      }

    }
  );

}


/* ============================================================
   POPULAR PERSONAGENS
   ============================================================ */

function populateCharacterSelect() {

  const select =
    getElement(
      "dice-character"
    );


  if (
    !select
  ) {

    return;

  }


  const context =
    window.AERIOM_CAMPAIGN
      ?.getContext?.();


  const characters =
    Array.isArray(
      context?.presentCharacters
    )

      ? context.presentCharacters

      : [];


  const current =
    state.selectedCharacterId;


  select.replaceChildren();


  const empty =
    document.createElement(
      "option"
    );


  empty.value =
    "";


  empty.textContent =
    "Sem personagem";


  select.appendChild(
    empty
  );


  characters
    .forEach(
      (
        entry
      ) => {

        const character =
          entry?.character;


        if (
          !character?.id
        ) {

          return;

        }


        /*
         * Jogador somente pode selecionar seus próprios
         * personagens.
         *
         * O Mestre pode selecionar qualquer personagem
         * presente.
         */

        if (
          !isMaster() &&
          character.userId !==
            state.user?.id
        ) {

          return;

        }


        const option =
          document.createElement(
            "option"
          );


        option.value =
          String(
            character.id
          );


        option.textContent =
          character.name ||
          "Personagem";


        select.appendChild(
          option
        );

      }
    );


  if (
    current &&
    Array.from(
      select.options
    )
      .some(
        (
          option
        ) =>
          option.value ===
          current
      )
  ) {

    select.value =
      current;

  }
  else {

    select.value =
      "";

    state.selectedCharacterId =
      null;

  }

}


/* ============================================================
   INICIALIZAÇÃO A PARTIR DA CAMPANHA
   ============================================================ */

function initializeFromCampaign() {

  if (
    !readCampaignContext()
  ) {

    return false;

  }


  state.initialized =
    true;


  populateCharacterSelect();

  renderDiceSelection();

  renderModifier();

  renderVisibility();

  renderCharacterSelection();

  renderContext();

  updateNotationUi();

  updateRealtimeUi();

  subscribeRealtime();


  exposeGlobalApi();


  dispatchDiceEvent(
    "ready",
    getDiceContext()
  );


  log(
    "info",
    "Sistema de dados inicializado.",
    {

      campaignId:
        state.campaignId,

      userId:
        state.user?.id,

      role:
        state.membership?.role

    }
  );


  return true;

}


/* ============================================================
   CONTEXTO
   ============================================================ */

function getDiceContext() {

  return Object.freeze({

    campaignId:
      state.campaignId,

    user:
      state.user,

    membership:
      state.membership,

    selectedCharacterId:
      state.selectedCharacterId,

    selectedDie:
      state.selectedDie,

    modifier:
      state.modifier,

    visibility:
      state.visibility,

    context:
      state.context,

    rolling:
      state.rolling,

    lastRoll:
      state.lastRoll,

    realtimeConnected:
      state.realtimeConnected

  });

}


/* ============================================================
   API GLOBAL
   ============================================================ */

function exposeGlobalApi() {

  window.AERIOM_DICE =
    Object.freeze({

      roll,

      rollLocal,

      setDie,

      setModifier,

      setVisibility,

      setContext,

      setCharacter,

      getSelectedCharacterId,

      loadRecentRolls,

      getContext:
        getDiceContext,

      isMaster,

      isPlayer,

      formatDiceNotation,

      formatRollResult,

      classifyRoll,

      refresh:
        async () => {

          readCampaignContext();

          populateCharacterSelect();

          await renderHistory();

        },

      destroy:
        destroyDice

    });

}


/* ============================================================
   DESTROY
   ============================================================ */

function destroyDice() {

  removeRealtimeChannel();


  state.initialized =
    false;

  state.supabase =
    null;

  state.campaignId =
    null;

  state.user =
    null;

  state.membership =
    null;

  state.selectedCharacterId =
    null;

  state.selectedDie =
    DICE_CONFIG.defaultDie;

  state.modifier =
    DICE_CONFIG.defaultModifier;

  state.visibility =
    DICE_CONFIG.defaultVisibility;

  state.context =
    "";

  state.rolling =
    false;

  state.lastRoll =
    null;


  /*
   * Não usamos delete global:
   *
   * delete window.AERIOM_DICE
   *
   * porque outros módulos podem estar segurando
   * uma referência. Apenas substituímos por undefined.
   */

  try {

    delete window.AERIOM_DICE;

  } catch {

    window.AERIOM_DICE =
      undefined;

  }


  log(
    "info",
    "Sistema de dados destruído."
  );

}


/* ============================================================
   TECLADO GLOBAL
   ============================================================ */

function bindKeyboardShortcuts() {

  document.addEventListener(
    "keydown",
    (
      event
    ) => {

      /*
       * Não interceptar teclado enquanto usuário escreve.
       */

      const target =
        event.target;


      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target instanceof
          HTMLSelectElement
      ) {

        return;

      }


      /*
       * D = rolar d20.
       */

      if (
        event.key.toLowerCase() ===
        "d"
      ) {

        if (
          !state.initialized ||
          state.rolling
        ) {

          return;

        }


        event.preventDefault();


        roll({
          die:
            state.selectedDie
        })
          .catch(
            () => {}
          );

      }

    }
  );

}


/* ============================================================
   START
   ============================================================ */

function startDice() {

  bindDiceSelection();

  bindModifier();

  bindVisibility();

  bindCharacter();

  bindContext();

  bindRollButtons();

  bindCampaignEvents();

  bindKeyboardShortcuts();

  exposeGlobalApi();


  /*
   * Se campanha.js já estiver pronto quando este módulo
   * carregar, inicializamos imediatamente.
   */

  initializeFromCampaign();

}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startDice,
    {
      once:
        true
    }
  );

}
else {

  startDice();

}


/* ============================================================
   PAGE LIFECYCLE
   ============================================================ */

window.addEventListener(
  "pagehide",
  destroyDice,
  {
    once:
      true
  }
);


/* ============================================================
   EXPORTS
   ============================================================ */

export {

  roll,

  rollLocal,

  setDie,

  setModifier,

  setVisibility,

  setContext,

  setCharacter,

  getSelectedCharacterId,

  loadRecentRolls,

  getDiceContext,

  isMaster,

  isPlayer,

  formatDiceNotation,

  formatRollResult,

  classifyRoll,

  initializeFromCampaign,

  destroyDice

};