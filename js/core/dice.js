/*
 * ============================================================
 * AERIOM v2
 * js/core/dice.js
 * Sistema de rolagem de dados
 * ============================================================
 *
 * Responsabilidades:
 *
 * - Seleção de dados.
 * - Rolagem segura.
 * - Modificadores.
 * - Visibilidade.
 * - Personagem.
 * - Resultado.
 * - Histórico por campanha.
 * - Limpeza do histórico pelo Mestre.
 * - Realtime das rolagens.
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

  /*
   * Histórico visual curto.
   *
   * O banco continua contendo os registros permitidos
   * pela política de retenção.
   *
   * A interface mostra somente os últimos 10.
   */
  maxHistory:
    10,

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
    false,

  eventsBound:
    false,

  historyLoaded:
    false,

  /*
   * Cache local do histórico.
   *
   * Isso evita depender de trocar de aba
   * para atualizar a interface.
   */
  history:
    []

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
    level === "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;
  }


  if (
    level === "warn"
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


  let context;


  try {

    context =
      api.getContext();

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao obter contexto da campanha.",
      error
    );

    return false;
  }


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
   EVENTOS DO DICE
   ============================================================ */

function dispatchDiceEvent(
  name,
  detail = {}
) {

  try {

    window.dispatchEvent(
      new CustomEvent(
        `aeriom:dice:${name}`,
        {
          detail
        }
      )
    );

  } catch (
    error
  ) {

    log(
      "warn",
      `Falha ao emitir evento ${name}.`,
      error
    );

  }

}


/* ============================================================
   PERSONAGEM
   ============================================================ */

function setCharacter(
  characterId
) {

  const value =
    characterId === null ||
    characterId === undefined ||
    characterId === ""

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
   DADO
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
   RANDOM SEGURO
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


  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.getRandomValues ===
      "function"
  ) {

    const maxUint =
      0x100000000;


    const limit =
      Math.floor(
        maxUint /
        range
      ) *
      range;


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

    } while (
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


  if (
    die === 20 &&
    result === 20
  ) {

    return "critical";
  }


  if (
    die === 20 &&
    result === 1
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
   PERSONAGEM — VALIDAÇÃO
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
   NORMALIZAR REGISTRO DO BANCO
   ============================================================ */

function normalizeSavedRoll(
  row
) {

  if (
    !row
  ) {

    return null;
  }


  const normalized = {

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


  normalized.classification =
    classifyRoll(
      normalized
    );


  return normalized;

}


/* ============================================================
   SALVAR
   ============================================================ */

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
   ROLAR
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

    const hasOwnDie =
      Object.prototype.hasOwnProperty.call(
        options,
        "die"
      );


    const die =
      hasOwnDie &&
      options.die !==
        undefined &&
      options.die !==
        null &&
      options.die !== ""

        ? normalizeDie(
            options.die
          )

        : normalizeDie(
            state.selectedDie
          );


    const modifier =
      Object.prototype.hasOwnProperty.call(
        options,
        "modifier"
      )

        ? normalizeModifier(
            options.modifier
          )

        : normalizeModifier(
            state.modifier
          );


    const visibility =
      Object.prototype.hasOwnProperty.call(
        options,
        "visibility"
      )

        ? normalizeVisibility(
            options.visibility
          )

        : normalizeVisibility(
            state.visibility
          );


    const context =
      Object.prototype.hasOwnProperty.call(
        options,
        "context"
      )

        ? normalizeContext(
            options.context
          )

        : normalizeContext(
            state.context
          );


    const characterId =
      Object.prototype.hasOwnProperty.call(
        options,
        "characterId"
      )

        ? (
            options.characterId
              ? String(
                  options.characterId
                )
              : null
          )

        : getSelectedCharacterId();


    state.selectedDie =
      die;

    state.modifier =
      modifier;

    state.visibility =
      visibility;

    state.context =
      context;

    state.selectedCharacterId =
      characterId;


    renderDiceSelection();

    renderModifier();

    renderVisibility();

    renderContext();

    renderCharacterSelection();


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
          local
        )

    };


    /*
     * Mostra o resultado imediatamente.
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
     * Salva no Supabase.
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


    /*
     * ========================================================
     * IMPORTANTE
     *
     * Atualização local imediata.
     *
     * Não esperamos:
     * - trocar de aba;
     * - Realtime;
     * - novo SELECT.
     * ========================================================
     */

    addRollToHistory(
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
   HISTÓRICO — BUSCAR
   ============================================================ */

async function loadRecentRolls(
  limit = DICE_CONFIG.maxHistory
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
        DICE_CONFIG.maxHistory,
        safeInteger(
          limit,
          DICE_CONFIG.maxHistory
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


  return (
    Array.isArray(
      data
    )
      ? data
      : []
  )
    .map(
      normalizeSavedRoll
    )
    .filter(
      Boolean
    );

}


/* ============================================================
   HISTÓRICO — DEDUPLICAÇÃO
   ============================================================ */

function historyContains(
  rollId
) {

  if (
    !rollId
  ) {

    return false;
  }


  return state.history.some(
    roll =>
      String(
        roll.id
      ) ===
      String(
        rollId
      )
  );

}


/* ============================================================
   HISTÓRICO — INSERIR CACHE
   ============================================================ */

function addRollToHistory(
  roll
) {

  if (
    !roll
  ) {

    return;
  }


  if (
    roll.campaignId &&
    state.campaignId &&
    String(
      roll.campaignId
    ) !==
    String(
      state.campaignId
    )
  ) {

    return;
  }


  if (
    roll.id &&
    historyContains(
      roll.id
    )
  ) {

    /*
     * Se já existe, atualiza o registro.
     */
    state.history =
      state.history.map(
        existing =>
          String(
            existing.id
          ) ===
          String(
            roll.id
          )
            ? roll
            : existing
      );

  } else {

    state.history.unshift(
      roll
    );

  }


  /*
   * Histórico curto.
   */
  state.history =
    state.history
      .slice(
        0,
        DICE_CONFIG.maxHistory
      );


  state.historyLoaded =
    true;


  renderHistoryFromState();

}


/* ============================================================
   HISTÓRICO — REMOVER
   ============================================================ */

function removeRollFromHistory(
  rollId
) {

  if (
    !rollId
  ) {

    return;
  }


  state.history =
    state.history.filter(
      roll =>
        String(
          roll.id
        ) !==
        String(
          rollId
        )
    );


  renderHistoryFromState();

}


/* ============================================================
   HISTÓRICO — ELEMENTO
   ============================================================ */

function createHistoryElement(
  roll
) {

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
      String(
        roll.id
      );

  }


  item.dataset.die =
    `d${normalizeDie(
      roll.dieType
    )}`;


  item.dataset.result =
    roll.classification ||
    classifyRoll(
      roll
    );


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


  const value =
    document.createElement(
      "strong"
    );


  value.className =
    "dice-history__result";


  value.textContent =
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
    value,
    meta
  );


  return item;

}


/* ============================================================
   HISTÓRICO — RENDER CACHE
   ============================================================ */

function renderHistoryFromState() {

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


  /*
   * state.history já está do mais novo
   * para o mais antigo.
   */
  state.history
    .slice(
      0,
      DICE_CONFIG.maxHistory
    )
    .forEach(
      roll => {

        history.appendChild(
          createHistoryElement(
            roll
          )
        );

      }
    );


  ensureClearHistoryButton();

}


/* ============================================================
   HISTÓRICO — RENDER DO BANCO
   ============================================================ */

async function renderHistory() {

  if (
    !hasCampaignContext()
  ) {

    return;
  }


  try {

    const rolls =
      await loadRecentRolls(
        DICE_CONFIG.maxHistory
      );


    /*
     * Substitui completamente o cache.
     *
     * Isso evita duplicações e registros antigos
     * permanecendo na tela.
     */
    state.history =
      rolls
        .slice(
          0,
          DICE_CONFIG.maxHistory
        );


    state.historyLoaded =
      true;


    renderHistoryFromState();


  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao carregar histórico.",
      error
    );

  }

}


/* ============================================================
   LIMPAR HISTÓRICO
   ============================================================ */

async function clearHistory() {

  if (
    !hasCampaignContext()
  ) {

    showDiceError(
      "A campanha ainda não está disponível."
    );

    return false;
  }


  if (
    !isMaster()
  ) {

    showDiceError(
      "Somente o Mestre pode limpar o histórico da campanha."
    );
state.history = [];
state.historyLoaded = true;

renderHistory();
    return false;
  }


  const confirmed =
    window.confirm(
      "Limpar todo o histórico de rolagens desta campanha?"
    );


  if (
    !confirmed
  ) {

    return false;
  }


  const button =
    getElement(
      "dice-history-clear"
    );


  if (
    button
  ) {

    button.disabled =
      true;

    button.textContent =
      "Limpando...";

  }


  try {

    const {
      error
    } =
      await state.supabase
        .from(
          "dice_rolls"
        )
        .delete()
        .eq(
          "campaign_id",
          state.campaignId
        );


    if (
      error
    ) {

      throw error;
    }


    /*
     * Primeiro limpa o cache.
     */
    state.history =
      [];


    state.historyLoaded =
      true;


    /*
     * Depois limpa visualmente.
     */
    renderHistoryFromState();


    showDiceSuccess(
      "Histórico de rolagens limpo."
    );


    dispatchDiceEvent(
      "historyclear",
      {
        campaignId:
          state.campaignId
      }
    );


    return true;

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao limpar histórico.",
      error
    );


    showDiceError(
      getFriendlyError(
        error
      )
    );


    return false;

  } finally {

    const currentButton =
      getElement(
        "dice-history-clear"
      );


    if (
      currentButton
    ) {

      currentButton.disabled =
        false;

      currentButton.textContent =
        "Limpar histórico";

    }

  }

}


/* ============================================================
   BOTÃO DE LIMPAR
   ============================================================ */

function ensureClearHistoryButton() {

  const history =
    getElement(
      "dice-history"
    );


  if (
    !history
  ) {

    return;
  }


  const existing =
    getElement(
      "dice-history-clear"
    );


  if (
    existing
  ) {

    existing.hidden =
      !isMaster();

    return;
  }


  const section =
    history.closest(
      ".dice-history-section"
    );


  if (
    !section
  ) {

    return;
  }


  const heading =
    section.querySelector(
      ".campaign-section__heading"
    );


  if (
    !heading
  ) {

    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.id =
    "dice-history-clear";


  button.type =
    "button";


  button.className =
    "dice-history__clear";


  button.textContent =
    "Limpar histórico";


  button.hidden =
    !isMaster();


  button.setAttribute(
    "aria-label",
    "Limpar histórico de rolagens"
  );


  button.addEventListener(
    "click",
    () => {

      clearHistory();

    }
  );


  /*
   * Coloca o botão dentro do cabeçalho.
   *
   * Assim ele fica ao lado de
   * "Últimas Rolagens", em vez de
   * ficar solto acima da lista.
   */
  heading.appendChild(
    button
  );

}


/* ============================================================
   SUCESSO
   ============================================================ */

function showDiceSuccess(
  message
) {

  const element =
    getElement(
      "dice-success"
    );


  if (
    element
  ) {

    element.textContent =
      message;


    element.hidden =
      false;


    window.clearTimeout(
      showDiceSuccess.timeout
    );


    showDiceSuccess.timeout =
      window.setTimeout(
        () => {

          element.hidden =
            true;

        },
        3500
      );


    return;
  }


  log(
    "info",
    message
  );

}


/* ============================================================
   ERRO
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

    log(
      "error",
      message
    );

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
      "O banco recusou essa operação. Verifique as permissões da mesa."
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
      "carregando"
    )
  ) {

    return (
      "A mesa ainda está carregando. Tente novamente."
    );

  }


  return (
    message ||
    "Não foi possível realizar a operação."
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
      state.modifier >= 0

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
      button => {

        const value =
          normalizeVisibility(
            button.dataset.diceVisibility
          );


        const active =
          value ===
          state.visibility;


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


  const empty =
    getElement(
      "dice-result-empty"
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
      classifyRoll(
        roll
      );


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
   REALTIME — NOME
   ============================================================ */

function getRealtimeChannelName() {

  return (
    `${DICE_CONFIG.realtimeChannelPrefix}:${state.campaignId}`
  );

}


/* ============================================================
   REALTIME — REMOVER
   ============================================================ */

function removeRealtime() {

  if (
    state.realtimeChannel &&
    state.supabase
  ) {

    try {

      state.supabase.removeChannel(
        state.realtimeChannel
      );

    } catch (
      error
    ) {

      log(
        "warn",
        "Falha ao remover canal Realtime.",
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


/* ============================================================
   REALTIME — INICIAR
   ============================================================ */

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


    channel.on(
      "postgres_changes",
      {
        event:
          "DELETE",

        schema:
          "public",

        table:
          "dice_rolls",

        filter:
          `campaign_id=eq.${state.campaignId}`

      },
      handleRemoteDelete
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
   REALTIME — INSERT
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
   * Segurança adicional:
   * somente a campanha atual.
   */
  if (
    String(
      roll.campaignId
    ) !==
    String(
      state.campaignId
    )
  ) {

    return;
  }


  /*
   * Se foi a própria rolagem,
   * ela provavelmente já entrou no cache.
   *
   * addRollToHistory faz deduplicação.
   */
  addRollToHistory(
    roll
  );


  dispatchDiceEvent(
    "remoteroll",
    roll
  );

}


/* ============================================================
   REALTIME — DELETE
   ============================================================ */

function handleRemoteDelete(
  payload
) {

  const deleted =
    payload?.old;


  const id =
    deleted?.id
      ? String(
          deleted.id
        )
      : null;


  /*
   * Se o Realtime não enviar o ID antigo,
   * fazemos uma sincronização completa.
   */
  if (
    !id
  ) {

    renderHistory();

    return;
  }


  removeRollFromHistory(
    id
  );


  dispatchDiceEvent(
    "remotedelete",
    {
      id
    }
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
          event => {

            event.preventDefault();


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
          event => {

            event.preventDefault();


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
   BIND — ROLAR
   ============================================================ */

function bindRollButtons() {

  getElements(
    "[data-dice-roll]"
  )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          async event => {

            event.preventDefault();


            const explicitValue =
              button.getAttribute(
                "data-dice-roll"
              );


            const hasExplicitDie =
              explicitValue !==
                null &&
              explicitValue.trim() !==
                "";


            try {

              await roll(

                hasExplicitDie

                  ? {
                      die:
                        explicitValue
                    }

                  : {
                      die:
                        state.selectedDie
                    }

              );

            } catch {

              /*
               * O erro já foi exibido
               * pela função roll().
               */

            }

          }
        );

      }
    );

}


/* ============================================================
   BIND — HISTÓRICO
   ============================================================ */

function bindHistory() {

  /*
   * O botão é criado quando o HTML
   * estiver disponível.
   */
  ensureClearHistoryButton();

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

        /*
         * Ao entrar na aba:
         *
         * - fazemos uma sincronização;
         * - mas a interface já possui o cache local.
         */
        renderHistory();

      }

    }
  );

}


/* ============================================================
   PERSONAGENS
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


  characters.forEach(
    entry => {

      const character =
        entry?.character;


      if (
        !character?.id
      ) {

        return;
      }


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
    current &&
    Array.from(
      select.options
    )
      .some(
        option =>
          option.value ===
          current
      )
  ) {

    select.value =
      current;

  } else {

    select.value =
      "";


    state.selectedCharacterId =
      null;

  }

}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function initializeFromCampaign() {

  if (
    !readCampaignContext()
  ) {

    return false;
  }


  renderDiceSelection();

  renderModifier();

  renderVisibility();

  renderContext();

  renderCharacterSelection();

  populateCharacterSelect();

  updateNotationUi();

  updateRealtimeUi();

  ensureClearHistoryButton();


  if (
    !state.realtimeChannel
  ) {

    setupRealtime();

  }


  /*
   * Carrega imediatamente.
   */
  renderHistory();


  exposeApi();


  state.initialized =
    true;


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

      selectedDie:
        state.selectedDie,

      role:
        state.membership?.role

    }
  );


  return true;

}


/* ============================================================
   CONTEXTO PÚBLICO
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
      state.realtimeConnected,

    history:
      state.history.slice()

  };

}


/* ============================================================
   API
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

      renderHistory,

      clearHistory,

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

          ensureClearHistoryButton();

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

  state.historyLoaded =
    false;

  state.history =
    [];


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
   TECLADO
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

  bindHistory();

  bindCampaignEvents();

  bindKeyboard();


  exposeApi();


  /*
   * Caso a campanha já esteja pronta.
   */
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

} else {

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

  renderHistory,

  clearHistory,

  getContext,

  isMaster,

  isPlayer,

  formatDiceNotation,

  formatRollResult,

  classifyRoll,

  initializeFromCampaign,

  destroyDice

};