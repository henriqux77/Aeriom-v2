/*
 * ============================================================
 * AERIOM v2
 * js/core/dice.js
 * Sistema de rolagem de dados
 * ============================================================
 *
 * Dados suportados:
 *
 * d4
 * d6
 * d8
 * d10
 * d12
 * d20
 * d100
 *
 * Recursos:
 *
 * - seleção de dado;
 * - modificador;
 * - personagem;
 * - visibilidade;
 * - contexto da rolagem;
 * - rolagem segura no cliente;
 * - persistência em dice_rolls;
 * - histórico;
 * - Realtime;
 * - crítico/falha crítica para d20;
 * - integração com campanha.js.
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

  minModifier:
    -999,

  maxModifier:
    999,

  maxContextLength:
    500,

  maxHistory:
    50,

  realtimeChannelPrefix:
    "campaign-dice"

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  initialized:
    false,

  initializing:
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
    false,

  eventsBound:
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
   HELPERS
   ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  if (
    typeof value !==
    "string"
  ) {

    return fallback;

  }


  return value.trim();

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


function normalizeContext(
  value
) {

  return safeString(
    value
  )
    .slice(
      0,
      DICE_CONFIG.maxContextLength
    );

}


/* ============================================================
   VALIDAÇÃO DE DADOS
   ============================================================ */

function isValidDie(
  die
) {

  return DICE_CONFIG.allowedDice
    .includes(
      safeInteger(
        die
      )
    );

}


function normalizeDie(
  die
) {

  const value =
    safeInteger(
      die,
      DICE_CONFIG.defaultDie
    );


  return isValidDie(
    value
  )
    ? value
    : DICE_CONFIG.defaultDie;

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


/* ============================================================
   CONTEXTO DA CAMPANHA
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
   PERSONAGEM
   ============================================================ */

function setCharacter(
  characterId
) {

  const value =
    characterId ===
      null ||
    characterId ===
      undefined ||
    characterId ===
      ""

      ? null

      : String(
          characterId
        );


  state.selectedCharacterId =
    value;


  renderCharacterSelection();


  dispatchDiceEvent(
    "characterchange",
    {

      characterId:
        value

    }
  );


  return value;

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
   SELEÇÃO DE DADO
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
   CONTEXTO
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
   RANDOM
   ============================================================ */

function randomInteger(
  min,
  max
) {

  const low =
    Math.trunc(
      min
    );

  const high =
    Math.trunc(
      max
    );


  if (
    high <
    low
  ) {

    throw new Error(
      "Intervalo inválido para rolagem."
    );

  }


  const range =
    high -
    low +
    1;


  /*
   * Usa Web Crypto quando disponível.
   *
   * Isso evita depender de Math.random()
   * em navegadores modernos.
   */

  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.getRandomValues ===
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

      crypto.getRandomValues(
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
      low +
      (
        value %
        range
      )
    );

  }


  /*
   * Fallback para ambientes sem Web Crypto.
   */

  return (
    Math.floor(
      Math.random() *
      range
    ) +
    low
  );

}


/* ============================================================
   ROLAGEM LOCAL
   ============================================================ */

function rollLocal(
  die,
  modifier = 0
) {

  const normalizedDie =
    normalizeDie(
      die
    );


  const normalizedModifier =
    normalizeModifier(
      modifier
    );


  const rollResult =
    randomInteger(
      1,
      normalizedDie
    );


  const totalResult =
    rollResult +
    normalizedModifier;


  return {

    dieType:
      normalizedDie,

    rollResult,

    modifier:
      normalizedModifier,

    totalResult

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
    normalizeDie(
      roll.dieType
    );


  const result =
    safeInteger(
      roll.rollResult
    );


  /*
   * Regra provisória:
   *
   * somente d20 possui crítico/falha crítica.
   *
   * Isso poderá ser alterado quando o sistema oficial
   * do AERION for implementado.
   */

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
   NOTAÇÃO
   ============================================================ */

function formatDiceNotation(
  die,
  modifier = 0
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


  return (
    `${formatDiceNotation(
      roll.dieType,
      roll.modifier
    )} → ${roll.totalResult}`
  );

}


/* ============================================================
   VALIDAR PERSONAGEM
   ============================================================ */

async function validateCharacterOwnership(
  characterId
) {

  if (
    !characterId
  ) {

    return true;

  }


  if (
    !hasCampaignContext()
  ) {

    throw new Error(
      "Contexto da campanha não está disponível."
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

    throw new Error(
      "O personagem selecionado não pertence a você nesta campanha."
    );

  }


  return true;

}


/* ============================================================
   BANCO
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


async function saveRoll(
  roll
) {

  if (
    !hasCampaignContext()
  ) {

    throw new Error(
      "Não existe contexto de campanha para salvar a rolagem."
    );

  }


  const payload = {

    campaign_id:
      state.campaignId,

    user_id:
      state.user.id,

    character_id:
      roll.characterId ||
      null,

    die_type:
      normalizeDie(
        roll.dieType
      ),

    roll_result:
      safeInteger(
        roll.rollResult
      ),

    modifier:
      normalizeModifier(
        roll.modifier
      ),

    total_result:
      safeInteger(
        roll.totalResult
      ),

    visibility:
      normalizeVisibility(
        roll.visibility
      ),

    context:
      normalizeContext(
        roll.context
      ) ||
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
   EXECUTAR ROLAGEM
   ============================================================ */

async function roll(
  options = {}
) {

  if (
    state.rolling
  ) {

    return null;

  }


  /*
   * Garante que a seleção atual seja lida
   * da campanha caso o módulo tenha carregado antes.
   */

  if (
    !hasCampaignContext()
  ) {

    readCampaignContext();

  }


  if (
    !hasCampaignContext()
  ) {

    throw new Error(
      "A mesa ainda não terminou de carregar."
    );

  }


  state.rolling =
    true;


  setRollingUi(
    true
  );


  try {

    /*
     * ========================================================
     * CORREÇÃO PRINCIPAL
     * ========================================================
     *
     * A ordem é:
     *
     * 1. options.die, se explicitamente informado;
     * 2. state.selectedDie, caso contrário.
     *
     * Não existe mais d20 fixo.
     */

    const die =
      options.die !==
        undefined

        ? normalizeDie(
            options.die
          )

        : normalizeDie(
            state.selectedDie
          );


    const modifier =
      options.modifier !==
        undefined

        ? normalizeModifier(
            options.modifier
          )

        : normalizeModifier(
            state.modifier
          );


    const visibility =
      options.visibility !==
        undefined

        ? normalizeVisibility(
            options.visibility
          )

        : normalizeVisibility(
            state.visibility
          );


    const context =
      options.context !==
        undefined

        ? normalizeContext(
            options.context
          )

        : normalizeContext(
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
     * Se o usuário explicitou um dado no options,
     * atualizamos a seleção visual também.
     */

    state.selectedDie =
      die;


    state.modifier =
      modifier;


    state.visibility =
      visibility;


    state.context =
      context;


    renderDiceSelection();

    renderModifier();

    renderVisibility();

    renderContext();


    if (
      characterId
    ) {

      await validateCharacterOwnership(
        characterId
      );

    }


    /*
     * ROLAGEM REAL
     */

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
          local
        )

    };


    /*
     * Mostra imediatamente.
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
     * Persiste.

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
      "Erro ao realizar rolagem.",
      error
    );


    showDiceError(
      getFriendlyError(
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
   HISTÓRICO
   ============================================================ */

async function loadRecentRolls(
  limit = 30
) {

  if (
    !hasCampaignContext()
  ) {

    return [];

  }


  const safeLimit =
    Math.max(
      1,
      Math.min(
        100,
        safeInteger(
          limit,
          30
        )
      )
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

    throw error;

  }


  return arrayFrom(
    data
  )
    .map(
      normalizeSavedRoll
    )
    .filter(
      Boolean
    );

}


/* ============================================================
   ARRAY
   ============================================================ */

function arrayFrom(
  value
) {

  return Array.isArray(
    value
  )
    ? value
    : [];

}


/* ============================================================
   REALTIME
   ============================================================ */

function realtimeChannelName() {

  return (
    `${DICE_CONFIG.realtimeChannelPrefix}:${state.campaignId}`
  );

}


function removeRealtime() {

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
        "Falha ao remover canal Realtime dos dados.",
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


function setupRealtime() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    return;

  }


  removeRealtime();


  try {

    const channel =
      state.supabase.channel(
        realtimeChannelName()
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
      status => {

        state.realtimeConnected =
          status ===
          "SUBSCRIBED";


        updateRealtimeUi();


        log(
          "info",
          `Realtime dos dados: ${status}`
        );

      }
    );

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao iniciar Realtime dos dados.",
      error
    );

  }

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
   * Nossa própria rolagem já foi renderizada localmente.
   */

  if (
    state.user &&
    roll.userId ===
      state.user.id
  ) {

    return;

  }


  renderRemoteRoll(
    roll
  );


  dispatchDiceEvent(
    "remoteroll",
    roll
  );

}


/* ============================================================
   UI — SELEÇÃO
   ============================================================ */

function renderDiceSelection() {

  getElements(
    "[data-die]"
  )
    .forEach(
      button => {

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
      element => {

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
    !select
  ) {

    return;

  }


  if (
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
   UI — RESULTADO
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

  const empty =
    getElement(
      "dice-result-empty"
    );


  if (
    result
  ) {

    result.hidden =
      false;


    result.dataset.result =
      roll.classification ||
      "normal";


    /*
     * Permite que o CSS saiba qual dado foi lançado.
     */

    result.dataset.die =
      `d${normalizeDie(
        roll.dieType
      )}`;

  }


  if (
    empty
  ) {

    empty.hidden =
      true;

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


  animateResult(
    result
  );

}


/* ============================================================
   ANIMAÇÃO
   ============================================================ */

function animateResult(
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
   * Reinicia a animação.
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
      button => {

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

  const status =
    getElement(
      "dice-realtime-status"
    );


  if (
    !status
  ) {

    return;

  }


  status.dataset.connected =
    String(
      state.realtimeConnected
    );


  const textElement =
    status.querySelector(
      "[data-dice-realtime-text]"
    );


  if (
    textElement
  ) {

    textElement.textContent =
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


  window.clearTimeout(
    showDiceError.timeout
  );


  showDiceError.timeout =
    window.setTimeout(
      () => {

        element.hidden =
          true;

      },
      5000
    );

}


/* ============================================================
   ERRO AMIGÁVEL
   ============================================================ */

function getFriendlyError(
  error
) {

  const message =
    safeString(
      error?.message
    );


  const lower =
    message.toLowerCase();


  if (
    lower.includes(
      "row-level security"
    ) ||
    lower.includes(
      "permission"
    ) ||
    lower.includes(
      "forbidden"
    ) ||
    lower.includes(
      "42501"
    )
  ) {

    return (
      "O banco recusou essa rolagem. Verifique as permissões da mesa."
    );

  }


  if (
    lower.includes(
      "personagem"
    )
  ) {

    return message;

  }


  if (
    lower.includes(
      "contexto"
    ) ||
    lower.includes(
      "mesa ainda"
    )
  ) {

    return (
      "A mesa ainda está carregando. Tente novamente."
    );

  }


  return (
    message ||
    "Não foi possível realizar a rolagem."
  );

}


/* ============================================================
   ROLAGEM REMOTA — UI
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


  /*
   * Evita duplicação caso o evento seja recebido
   * novamente por alguma condição de reconexão.
   */

  if (
    roll.id
  ) {

    const existing =
      history.querySelector(
        `[data-roll-id="${CSS.escape(
          roll.id
        )}"]`
      );


    if (
      existing
    ) {

      return;

    }

  }


  const item =
    document.createElement(
      "article"
    );


  item.className =
    "dice-history__item";


  if (
    roll.id
  ) {

    item.dataset.rollId =
      roll.id;

  }


  item.dataset.die =
    `d${normalizeDie(
      roll.dieType
    )}`;


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
    DICE_CONFIG.maxHistory
  ) {

    history.lastElementChild
      ?.remove();

  }

}


/* ============================================================
   HISTÓRICO — RENDER
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


    /*
     * Banco entrega do mais novo para o mais antigo.
     * Para inserir corretamente no DOM usamos do mais antigo
     * para o mais novo com prepend().
     */

    rolls
      .reverse()
      .forEach(
        roll => {

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
      "Falha ao carregar histórico de dados.",
      error
    );

  }

}


/* ============================================================
   EVENTOS
   ============================================================ */

function dispatchDiceEvent(
  name,
  detail
) {

  window.dispatchEvent(
    new CustomEvent(
      `aeriom:dice:${name}`,
      {
        detail
      }
    )
  );

}


/* ============================================================
   BIND — DADOS
   ============================================================ */

function bindDiceButtons() {

  getElements(
    "[data-die]"
  )
    .forEach(
      button => {

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
   BIND — MODIFICADOR
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

      /*
       * Não sobrescrevemos o campo enquanto o usuário
       * ainda está digitando.
       */

      const number =
        Number(
          input.value
        );


      if (
        Number.isFinite(
          number
        )
      ) {

        state.modifier =
          normalizeModifier(
            number
          );


        updateNotationUi();

      }

    }
  );


  input.addEventListener(
    "change",
    () => {

      setModifier(
        input.value
      );

    }
  );


  input.addEventListener(
    "blur",
    () => {

      setModifier(
        input.value
      );

    }
  );

}


/* ============================================================
   BIND — VISIBILIDADE
   ============================================================ */

function bindVisibility() {

  getElements(
    "[data-dice-visibility]"
  )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            setVisibility(
              button.dataset.diceVisibility
            );

          }
        );

      }
    );


  const select =
    getElement(
      "dice-visibility"
    );


  if (
    select
  ) {

    select.addEventListener(
      "change",
      () => {

        setVisibility(
          select.value
        );

      }
    );

  }

}


/* ============================================================
   BIND — PERSONAGEM
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
   BIND — CONTEXTO
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

      state.context =
        normalizeContext(
          input.value
        );

    }
  );


  input.addEventListener(
    "change",
    () => {

      setContext(
        input.value
      );

    }
  );

}


/* ============================================================
   BIND — BOTÃO ROLAR
   ============================================================ */

function bindRollButtons() {

  getElements(
    "[data-dice-roll]"
  )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async () => {

            /*
             * ==================================================
             * CORREÇÃO DEFINITIVA
             * ==================================================
             *
             * Se o botão tiver data-dice-roll explícito,
             * usamos esse valor.
             *
             * Caso contrário, usamos state.selectedDie.
             *
             * Portanto:
             *
             * D100 selecionado → rola D100.
             * D6 selecionado   → rola D6.
             * D20 selecionado  → rola D20.
             */

            const explicitDie =
              button.dataset.diceRoll;


            const options =
              explicitDie
                ? {
                    die:
                      normalizeDie(
                        explicitDie
                      )
                  }
                : {
                    die:
                      state.selectedDie
                  };


            try {

              await roll(
                options
              );

            } catch {

              /*
               * O erro já foi mostrado na interface.
               */

            }

          }
        );

      }
    );

}


/* ============================================================
   BIND — CAMPANHA
   ============================================================ */

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
    event => {

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
    arrayFrom(
      context?.presentCharacters
    );


  const previous =
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


  characters.forEach(
    entry => {

      const character =
        entry?.character;


      if (
        !character?.id
      ) {

        return;

      }


      /*
       * Jogador só enxerga seus personagens.
       * Mestre pode selecionar os personagens presentes
       * da campanha.
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
        safeString(
          character.name,
          "Personagem"
        );


      select.appendChild(
        option
      );

    }
  );


  if (
    previous &&
    Array.from(
      select.options
    )
      .some(
        option =>
          option.value ===
          previous
      )
  ) {

    select.value =
      previous;

  }
  else {

    select.value =
      "";


    state.selectedCharacterId =
      null;

  }

}


/* ============================================================
   API
   ============================================================ */

function getContext() {

  return {

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

  };

}


/* ============================================================
   INIT FROM CAMPAIGN
   ============================================================ */

function initializeFromCampaign() {

  if (
    !readCampaignContext()
  ) {

    return false;

  }


  if (
    state.initialized
  ) {

    /*
     * Mesmo já inicializado, atualizamos a seleção
     * dos personagens porque a campanha pode ter mudado.
     */

    populateCharacterSelect();

    return true;

  }


  state.initialized =
    true;


  renderDiceSelection();

  renderModifier();

  renderVisibility();

  renderContext();

  renderCharacterSelection();

  populateCharacterSelect();

  updateNotationUi();

  updateRealtimeUi();

  setupRealtime();

  renderHistory();

  exposeApi();


  dispatchDiceEvent(
    "ready",
    getContext()
  );


  log(
    "info",
    "Sistema de dados inicializado.",
    {

      campaignId:
        state.campaignId,

      role:
        state.membership?.role,

      selectedDie:
        state.selectedDie

    }
  );


  return true;

}


/* ============================================================
   API GLOBAL
   ============================================================ */

function exposeApi() {

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

      getContext,

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

  removeRealtime();


  state.initialized =
    false;

  state.initializing =
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
   ATALHO DE TECLADO
   ============================================================ */

function bindKeyboard() {

  document.addEventListener(
    "keydown",
    event => {

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
       * D = rolar o dado atualmente selecionado.
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

function start() {

  if (
    state.eventsBound
  ) {

    return;

  }


  state.eventsBound =
    true;


  bindDiceButtons();

  bindModifier();

  bindVisibility();

  bindCharacter();

  bindContext();

  bindRollButtons();

  bindCampaignEvents();

  bindKeyboard();

  exposeApi();

  initializeFromCampaign();

}


/* ============================================================
   AUTO START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    start,
    {
      once:
        true
    }
  );

}
else {

  start();

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

  getContext,

  isMaster,

  isPlayer,

  formatDiceNotation,

  formatRollResult,

  classifyRoll,

  initializeFromCampaign,

  destroyDice

};