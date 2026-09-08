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

const DICE_AUDIO_CONFIG = Object.freeze({
  storageKey: "aeriom:dice:sound",
  defaultEnabled: true,
  defaultVolume: 0.52
});

const diceAudio = {
  context: null,
  masterGain: null,
  enabled: true,
  volume: DICE_AUDIO_CONFIG.defaultVolume,
  combatAtmosphere: true,
  atmosphereGain: null,
  atmosphereSource: null,
  atmosphereFilter: null,
  atmosphereTimer: null,
  initialized: false
};

function loadDiceAudioPreferences() {
  try {
    const raw = localStorage.getItem(DICE_AUDIO_CONFIG.storageKey);
    if (!raw) return;
    const value = JSON.parse(raw);
    if (typeof value.enabled === "boolean") diceAudio.enabled = value.enabled;
    if (Number.isFinite(value.volume)) diceAudio.volume = Math.max(0, Math.min(1, value.volume));
    if (typeof value.combatAtmosphere === "boolean") diceAudio.combatAtmosphere = value.combatAtmosphere;
  } catch {}
}

function saveDiceAudioPreferences() {
  try {
    localStorage.setItem(DICE_AUDIO_CONFIG.storageKey, JSON.stringify({
      enabled: diceAudio.enabled,
      volume: diceAudio.volume,
      combatAtmosphere: diceAudio.combatAtmosphere
    }));
  } catch {}
}

function ensureDiceAudio() {
  if (!diceAudio.enabled) return false;
  try {
    if (!diceAudio.context) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      diceAudio.context = new Ctx();
      diceAudio.masterGain = diceAudio.context.createGain();
      diceAudio.masterGain.gain.value = diceAudio.volume;
      diceAudio.masterGain.connect(diceAudio.context.destination);
    }
    if (diceAudio.context.state === "suspended") void diceAudio.context.resume();
    diceAudio.initialized = true;
    return true;
  } catch (error) {
    log("warn", "Áudio das rolagens indisponível.", error);
    return false;
  }
}

function audioBuffer({ duration = 0.12, generator }) {
  const ctx = diceAudio.context;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  generator(data, ctx.sampleRate);
  return buffer;
}

function playBuffer(buffer, { start = 0, gain = 0.1, attack = 0.004, release = 0.06, filter = null } = {}) {
  if (!ensureDiceAudio()) return;
  const ctx = diceAudio.context;
  const source = ctx.createBufferSource();
  const g = ctx.createGain();
  const now = ctx.currentTime + start;
  if (filter) {
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter.type || "lowpass";
    biquad.frequency.value = filter.frequency || 2500;
    if (filter.Q) biquad.Q.value = filter.Q;
    source.connect(biquad);
    biquad.connect(g);
  } else {
    source.connect(g);
  }
  g.connect(diceAudio.masterGain);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), now + Math.max(0.001, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(attack + 0.005, release));
  source.buffer = buffer;
  source.start(now);
  source.stop(now + Math.max(release, buffer.duration) + 0.02);
}

function makeBreathNoise(duration, cutoff = 3600) {
  return audioBuffer({
    duration,
    generator(data) {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.72 + white * 0.28;
        const envelope = Math.pow(1 - i / data.length, 1.8);
        data[i] = last * envelope;
      }
    }
  });
}

function makeImpact(duration = 0.08, body = 0.42) {
  return audioBuffer({
    duration,
    generator(data, sampleRate) {
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * (18 + body * 16));
        const click = (Math.random() * 2 - 1) * Math.exp(-t * 58);
        const low = Math.sin(2 * Math.PI * (105 - 35 * t) * t) * Math.exp(-t * 24);
        data[i] = (click * 0.72 + low * 0.48) * env;
      }
    }
  });
}

function makeWoodenRoll(duration = 0.16) {
  return audioBuffer({
    duration,
    generator(data, sampleRate) {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const white = Math.random() * 2 - 1;
        last = last * 0.78 + white * 0.22;
        const grain = Math.sin(2 * Math.PI * 90 * t) * 0.10;
        data[i] = (last * 0.32 + grain) * Math.exp(-t * 10);
      }
    }
  });
}

function makeMetalClatter(duration = 0.11) {
  return audioBuffer({
    duration,
    generator(data, sampleRate) {
      const freqs = [680, 1110, 1470, 1880];
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 24);
        let v = 0;
        freqs.forEach((f, n) => {
          v += Math.sin(2 * Math.PI * (f + n * 7) * t + n * 0.7) * (0.025 + n * 0.006);
        });
        v += (Math.random() * 2 - 1) * 0.18 * Math.exp(-t * 44);
        data[i] = v * env;
      }
    }
  });
}

function playDiceRollSound(die) {
  if (!ensureDiceAudio()) return;
  const scale = die >= 20 ? 1.0 : die >= 10 ? 0.92 : 0.78;
  const duration = die >= 20 ? 0.56 : die >= 12 ? 0.48 : 0.40;
  const events = die >= 20 ? 8 : die >= 12 ? 6 : 5;
  for (let i = 0; i < events; i++) {
    const t = (duration * i) / events + (Math.random() * 0.022);
    const metallic = die >= 20 && i % 3 === 1;
    playBuffer(metallic ? makeMetalClatter(0.085) : makeImpact(0.055 + Math.random() * 0.045, 0.35 + Math.random() * 0.35), {
      start: t,
      gain: (0.085 - i * 0.004) * scale,
      attack: 0.002,
      release: 0.045 + Math.random() * 0.035,
      filter: { type: "lowpass", frequency: metallic ? 4300 : 2800 }
    });
  }
  playBuffer(makeWoodenRoll(0.18), {
    start: duration * 0.55,
    gain: 0.045 * scale,
    attack: 0.012,
    release: 0.14,
    filter: { type: "lowpass", frequency: 1900 }
  });
}

function playDiceResultSound(classification, die) {
  if (!ensureDiceAudio()) return;
  if (classification === "critical") {
    playBuffer(makeImpact(0.14, 0.82), {
      start: 0,
      gain: 0.20,
      attack: 0.001,
      release: 0.10,
      filter: { type: "lowpass", frequency: 2200 }
    });
    playBuffer(makeMetalClatter(0.18), {
      start: 0.055,
      gain: 0.11,
      attack: 0.002,
      release: 0.16,
      filter: { type: "bandpass", frequency: 2200, Q: 1.1 }
    });
    playBuffer(makeImpact(0.12, 0.65), {
      start: 0.16,
      gain: 0.13,
      attack: 0.001,
      release: 0.09,
      filter: { type: "lowpass", frequency: 1800 }
    });
    return;
  }
  if (classification === "critical-failure") {
    playBuffer(makeImpact(0.18, 1.0), {
      start: 0,
      gain: 0.18,
      attack: 0.001,
      release: 0.13,
      filter: { type: "lowpass", frequency: 1500 }
    });
    playBuffer(makeMetalClatter(0.12), {
      start: 0.065,
      gain: 0.07,
      attack: 0.002,
      release: 0.10,
      filter: { type: "bandpass", frequency: 1200, Q: 0.9 }
    });
    return;
  }
  playBuffer(makeImpact(0.10, 0.58), {
    gain: 0.13,
    attack: 0.001,
    release: 0.08,
    filter: { type: "lowpass", frequency: 1800 }
  });
}

function stopCombatAtmosphere() {
  if (diceAudio.atmosphereTimer) {
    clearTimeout(diceAudio.atmosphereTimer);
    diceAudio.atmosphereTimer = null;
  }
  try {
    diceAudio.atmosphereSource?.stop();
    diceAudio.atmosphereSource?.disconnect();
  } catch {}
  diceAudio.atmosphereSource = null;
  try { diceAudio.atmosphereGain?.disconnect(); } catch {}
  try { diceAudio.atmosphereFilter?.disconnect(); } catch {}
  diceAudio.atmosphereGain = null;
  diceAudio.atmosphereFilter = null;
}

function startCombatAtmosphere() {
  if (diceAudio.atmosphereSource) return;
  if (!diceAudio.combatAtmosphere || !ensureDiceAudio()) return;
  stopCombatAtmosphere();
  const ctx = diceAudio.context;
  const length = Math.floor(ctx.sampleRate * 4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let low = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    low = low * 0.996 + white * 0.004;
    const slow = Math.sin(2 * Math.PI * 18 * i / ctx.sampleRate) * 0.012;
    data[i] = (low * 0.14 + slow) * 0.55;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 320;
  gain.gain.value = Math.min(0.022, diceAudio.volume * 0.042);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(diceAudio.masterGain);
  source.start();
  diceAudio.atmosphereSource = source;
  diceAudio.atmosphereFilter = filter;
  diceAudio.atmosphereGain = gain;

  const subtleClink = () => {
    if (!diceAudio.atmosphereSource || !diceAudio.combatAtmosphere || !diceAudio.enabled) return;
    diceAudio.atmosphereTimer = setTimeout(() => {
      playBuffer(makeMetalClatter(0.045), {
        gain: 0.009 + Math.random() * 0.006,
        attack: 0.001,
        release: 0.04,
        filter: { type: "bandpass", frequency: 1500 + Math.random() * 700, Q: 1.3 }
      });
      subtleClink();
    }, 3500 + Math.random() * 6500);
  };
  subtleClink();
}

function setCombatAtmosphereEnabled(enabled) {
  diceAudio.combatAtmosphere = Boolean(enabled);
  saveDiceAudioPreferences();
  if (diceAudio.combatAtmosphere && document.body?.classList.contains("aeriom-combat-active")) {
    startCombatAtmosphere();
  } else if (!diceAudio.combatAtmosphere) {
    stopCombatAtmosphere();
  }
  renderDiceAudioSettings();
}

function playDiceClick() {
  playBuffer(makeImpact(0.035, 0.22), {
    gain: 0.035,
    attack: 0.001,
    release: 0.028,
    filter: { type: "lowpass", frequency: 2200 }
  });
}

function setDiceAudioEnabled(enabled) {
  diceAudio.enabled = Boolean(enabled);
  saveDiceAudioPreferences();
  if (diceAudio.enabled) ensureDiceAudio();
  renderDiceAudioSettings();
}

function setDiceAudioVolume(volume) {
  const value = Number(volume);
  diceAudio.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DICE_AUDIO_CONFIG.defaultVolume;
  if (diceAudio.masterGain) diceAudio.masterGain.gain.value = diceAudio.volume;
  saveDiceAudioPreferences();
  renderDiceAudioSettings();
}

function createDiceAudioSettings() {
  let root = document.getElementById("dice-audio-settings");
  if (root) return root;
  const anchor = document.getElementById("campaign-mobile-actions");
  if (!anchor) return null;
  root = document.createElement("div");
  root.id = "dice-audio-settings";
  root.className = "dice-audio-settings";
  root.innerHTML = '<button type="button" class="dice-audio-settings__toggle" aria-expanded="false" aria-controls="dice-audio-settings-panel">🔊 Sons da mesa</button><div id="dice-audio-settings-panel" class="dice-audio-settings__panel" hidden><label><span>Efeitos das rolagens</span><input id="dice-audio-enabled" type="checkbox"></label><label><span>Volume</span><input id="dice-audio-volume" type="range" min="0" max="1" step="0.01"></label><label><span>Atmosfera de combate</span><input id="dice-combat-atmosphere" type="checkbox"></label></div>';
  anchor.prepend(root);
  const toggle = root.querySelector(".dice-audio-settings__toggle");
  const panel = root.querySelector(".dice-audio-settings__panel");
  toggle.addEventListener("click", () => {
    playDiceClick();
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });
  root.querySelector("#dice-audio-enabled").addEventListener("change", e => setDiceAudioEnabled(e.target.checked));
  root.querySelector("#dice-audio-volume").addEventListener("input", e => setDiceAudioVolume(e.target.value));
  root.querySelector("#dice-combat-atmosphere")?.addEventListener("change", e => setCombatAtmosphereEnabled(e.target.checked));
  renderDiceAudioSettings();
  return root;
}

function renderDiceAudioSettings() {
  const root = document.getElementById("dice-audio-settings");
  if (!root) return;
  const enabled = root.querySelector("#dice-audio-enabled");
  const volume = root.querySelector("#dice-audio-volume");
  if (enabled) enabled.checked = diceAudio.enabled;
  if (volume) volume.value = String(diceAudio.volume);
  const atmosphere = root.querySelector("#dice-combat-atmosphere");
  if (atmosphere) atmosphere.checked = diceAudio.combatAtmosphere;
}

loadDiceAudioPreferences();


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
      "O personagem selecionado não pertence a esta campanha."
    );

  }


  /*
   * Jogadores só podem usar seus próprios
   * personagens. O Mestre pode usar qualquer
   * personagem presente na campanha.
   */
  if (
    !isMaster() &&
    String(
      data.user_id
    ) !==
      String(
        state.user.id
      )
  ) {
    throw new Error(
      "O personagem selecionado não pertence a você."
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


  const saved = normalizeSavedRoll(data);

  try {
    const { error: logError } = await state.supabase
      .from("timeline_events")
      .insert({
        campaign_id: state.campaignId,
        actor_id: state.user.id,
        character_id: roll.characterId || null,
        event_type: "action",
        title: `🡒 ${state.user.user_metadata?.display_name || "Jogador"} rolou D${saved.dieType}`,
        description: `Resultado: ${saved.totalResult}${saved.modifier ? ` (${saved.modifier > 0 ? "+" : ""}${saved.modifier})` : ""}${saved.context ? ` · ${saved.context}` : ""}`,
        metadata: {
          source: "dice",
          roll_id: saved.id,
          die_type: saved.dieType,
          total_result: saved.totalResult
        }
      });
    if (logError) log("warn", "Rolagem salva, mas não foi possível registrar o log.", logError);
  } catch (logError) {
    log("warn", "Rolagem salva, mas o log falhou.", logError);
  }

  return saved;

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

  createDiceAudioSettings();


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


    playDiceRollSound(die);

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

    window.setTimeout(() => playDiceResultSound(rollData.classification, die), 260);


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

  playDiceResultSound(roll.classification, roll.dieType);


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

      createDiceAudioSettings();
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

      setAudioEnabled: setDiceAudioEnabled,
      setAudioVolume: setDiceAudioVolume,
      getAudioSettings: () => ({ enabled: diceAudio.enabled, volume: diceAudio.volume, combatAtmosphere: diceAudio.combatAtmosphere }),
      playRollEffect: (die = 20) => playDiceRollSound(Number(die) || 20),
      playResultEffect: (classification = "normal", die = 20) => playDiceResultSound(classification, Number(die) || 20),
      startCombatAtmosphere,
      stopCombatAtmosphere,
      setCombatAtmosphereEnabled,

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
  createDiceAudioSettings();

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
