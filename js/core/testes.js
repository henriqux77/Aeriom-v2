
/*
 * AERIOM — js/core/testes.js
 * Camada de testes sobre o motor existente de dice.js.
 *
 * Regras do sistema usadas aqui:
 * - o atributo é um tipo de dado (D4/D6/D8/D10/D12/D20);
 * - o teste rola o dado associado ao atributo;
 * - perícia é contextual e pode aplicar modificador;
 * - o Mestre pode solicitar um teste para um personagem;
 * - o jogador resolve o pedido;
 * - pedido e resultado ficam sincronizados via Supabase/Realtime.
 */

const TEST_CONFIG = Object.freeze({
  version: "2026-09-05-rules-2",
  attributes: Object.freeze([
    ["forca", "Força"],
    ["agilidade", "Agilidade"],
    ["vigor", "Vigor"],
    ["intelecto", "Intelecto"],
    ["percepcao", "Percepção"],
    ["presenca", "Presença"],
    ["controle", "Controle"]
  ]),
  skills: Object.freeze([
    "Acrobacia",
    "Atletismo",
    "Furtividade",
    "Percepção",
    "Investigação",
    "Conhecimento",
    "Medicina",
    "Sobrevivência",
    "Persuasão",
    "Intuição",
    "Enganação",
    "Tática",
    "Ofício / Crafting",
    "Controle de Mana"
  ]),
  allowedDice: Object.freeze([4, 6, 8, 10, 12, 20]),
  pendingExpiryMinutes: 10
});

const state = {
  initialized: false,
  supabase: null,
  campaignId: null,
  user: null,
  membership: null,
  requests: [],
  realtimeChannel: null,
  selectedRequestId: null
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function safe(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function isMaster() {
  return state.membership?.role === "master";
}

function getCampaignContext() {
  try {
    return window.AERIOM_CAMPAIGN?.getContext?.() || null;
  } catch {
    return null;
  }
}

function readContext() {
  const context = getCampaignContext();
  state.supabase = context?.supabase || null;
  state.campaignId = context?.campaignId || null;
  state.user = context?.user || null;
  state.membership = context?.membership || null;
  return Boolean(state.supabase && state.campaignId && state.user);
}

function getCharacters() {
  const context = getCampaignContext();
  return Array.isArray(context?.presentCharacters)
    ? context.presentCharacters
    : [];
}

function dispatch(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(`aeriom:tests:${name}`, { detail }));
}

function friendlyError(error) {
  return error?.message || "Não foi possível concluir o teste.";
}

function attributeName(key) {
  return TEST_CONFIG.attributes.find(([id]) => id === key)?.[1] || key;
}

function normalizeDieFromCharacter(character, attributeKey) {
  const attrs = character?.attributes || {};
  const raw = attrs?.[attributeKey];

  const candidate =
    typeof raw === "string"
      ? raw
      : raw?.die || raw?.dieType || raw?.type || raw?.sides;

  const match = String(candidate ?? "").match(/\d+/);
  const die = Number(match?.[0]);

  return TEST_CONFIG.allowedDice.includes(die) ? die : null;
}

function buildCharacterSelect(select) {
  if (!select) return;

  const current = select.value;
  select.replaceChildren();

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Escolha um personagem";
  select.appendChild(empty);

  getCharacters().forEach((character) => {
    const option = document.createElement("option");
    option.value = String(character.id);
    option.textContent = character.name || "Personagem";
    select.appendChild(option);
  });

  select.value = current;
}

function ensureTestsPanel() {
  const dicePanel = $("campaign-panel-dice");
  if (!dicePanel || $("aeriom-tests-panel")) return;

  const section = document.createElement("section");
  section.id = "aeriom-tests-panel";
  section.className = "aeriom-tests-panel";
  section.innerHTML = `
    <div class="aeriom-tests-panel__header">
      <div>
        <p class="aeriom-tests-panel__eyebrow">Sistema de testes</p>
        <h2>Teste de atributo</h2>
        <p>O atributo define qual dado será rolado. A rolagem acontece somente quando o teste é executado.</p>
      </div>
      <span id="aeriom-tests-role-badge" class="aeriom-tests-role-badge"></span>
    </div>

    <div class="aeriom-tests-grid">
      <div class="aeriom-tests-form">
        <label>
          Personagem
          <select id="aeriom-test-character"></select>
        </label>

        <div class="aeriom-tests-field">
          <span>Perícia</span>
          <select id="aeriom-test-skill">
            <option value="">Sem perícia</option>
          </select>
        </div>

        <div class="aeriom-tests-field">
          <span>Modificador</span>
          <input id="aeriom-test-modifier" type="number" value="0" min="-999" max="999" step="1">
        </div>

        <div class="aeriom-tests-field">
          <span>Contexto</span>
          <input id="aeriom-test-context" type="text" maxlength="500" placeholder="Ex.: resistir à magia">
        </div>

        <div class="aeriom-tests-attributes" id="aeriom-test-attributes"></div>

        <button id="aeriom-test-roll-button" class="aeriom-tests-primary" type="button">
          Fazer teste
        </button>

        <button id="aeriom-test-request-button" class="aeriom-tests-secondary" type="button">
          Pedir teste ao jogador
        </button>

        <p id="aeriom-tests-error" class="aeriom-tests-error" hidden></p>
      </div>

      <aside class="aeriom-tests-result">
        <p class="aeriom-tests-result__eyebrow">Resultado</p>
        <div id="aeriom-test-result-empty" class="aeriom-tests-result__empty">
          <strong>Pronto para testar.</strong>
          <span>Escolha um atributo para começar.</span>
        </div>
        <div id="aeriom-test-result" class="aeriom-tests-result__value" hidden>
          <strong id="aeriom-test-result-number">—</strong>
          <span id="aeriom-test-result-meta">—</span>
          <small id="aeriom-test-result-context"></small>
        </div>
      </aside>
    </div>

    <section class="aeriom-tests-requests">
      <div class="aeriom-tests-requests__header">
        <div>
          <p class="aeriom-tests-panel__eyebrow">Pedidos</p>
          <h3>Testes aguardando resposta</h3>
        </div>
        <span id="aeriom-tests-pending-count">0</span>
      </div>
      <div id="aeriom-tests-requests-list"></div>
    </section>
  `;

  dicePanel.appendChild(section);
}

function renderSkills() {
  const select = $("aeriom-test-skill");
  if (!select) return;

  const current = select.value;
  select.replaceChildren();

  const none = document.createElement("option");
  none.value = "";
  none.textContent = "Sem perícia";
  select.appendChild(none);

  TEST_CONFIG.skills.forEach((skill) => {
    const option = document.createElement("option");
    option.value = skill;
    option.textContent = skill;
    select.appendChild(option);
  });

  select.value = current;
}

function renderAttributes() {
  const root = $("aeriom-test-attributes");
  if (!root) return;

  root.replaceChildren();

  TEST_CONFIG.attributes.forEach(([id, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "aeriom-test-attribute";
    button.dataset.attribute = id;
    button.textContent = label;
    root.appendChild(button);
  });
}

function selectedAttribute() {
  return $("aeriom-test-attributes")?.querySelector(".is-active")?.dataset.attribute || null;
}

function setSelectedAttribute(attribute) {
  $$(".aeriom-test-attribute").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.attribute === attribute);
  });
}

function renderRole() {
  const badge = $("aeriom-tests-role-badge");
  if (!badge) return;
  badge.textContent = isMaster() ? "Mestre" : "Jogador";
  badge.dataset.role = isMaster() ? "master" : "player";
  $("aeriom-test-request-button").hidden = !isMaster();
}

function getSelectedCharacter() {
  const id = $("aeriom-test-character")?.value;
  return getCharacters().find((character) => String(character.id) === String(id)) || null;
}

function getSelectedTestData() {
  const attribute = selectedAttribute();
  const character = getSelectedCharacter();

  if (!attribute) throw new Error("Escolha um atributo.");
  if (!character) throw new Error("Escolha um personagem.");

  const die = normalizeDieFromCharacter(character, attribute);
  if (!die) {
    throw new Error(`O atributo ${attributeName(attribute)} deste personagem não possui um dado válido.`);
  }

  return {
    attribute,
    attributeLabel: attributeName(attribute),
    character,
    die,
    skill: safe($("aeriom-test-skill")?.value),
    modifier: Number($("aeriom-test-modifier")?.value || 0),
    context: safe($("aeriom-test-context")?.value)
  };
}

function showResult({ result, die, modifier, skill, context }) {
  $("aeriom-test-result-empty").hidden = true;
  const panel = $("aeriom-test-result");
  panel.hidden = false;
  $("aeriom-test-result-number").textContent = String(result);
  $("aeriom-test-result-meta").textContent =
    `D${die}${modifier ? ` ${modifier > 0 ? "+" : ""}${modifier}` : ""}${skill ? ` · ${skill}` : ""}`;
  $("aeriom-test-result-context").textContent = context || "";
}

async function performTest() {
  readContext();
  const dice = window.AERIOM_DICE;
  if (!dice?.roll) throw new Error("Motor de dados ainda não está pronto.");

  const data = getSelectedTestData();

  const roll = await dice.roll({
    die: data.die,
    modifier: data.modifier,
    characterId: data.character.id,
    visibility: "public",
    context: [data.attributeLabel, data.skill, data.context].filter(Boolean).join(" · ")
  });

  showResult({
    result: roll.totalResult,
    die: roll.dieType,
    modifier: roll.modifier,
    skill: data.skill,
    context: data.context
  });

  dispatch("roll", { ...data, roll });
  await refreshRequests();
  return roll;
}

async function requestTest() {
  if (!isMaster()) throw new Error("Somente o Mestre pode solicitar testes.");

  readContext();
  const data = getSelectedTestData();

  const payload = {
    campaign_id: state.campaignId,
    created_by: state.user.id,
    character_id: data.character.id,
    test_type: data.attribute,
    attribute_key: data.attribute,
    skill_key: data.skill || null,
    modifier: data.modifier,
    context: data.context || null,
    requested_by: state.user.id,
    status: "pending",
    expires_at: new Date(Date.now() + TEST_CONFIG.pendingExpiryMinutes * 60 * 1000).toISOString()
  };

  const { data: row, error } = await state.supabase
    .from("test_requests")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  await refreshRequests();
  dispatch("requestcreated", row);
  return row;
}

async function loadRequests() {
  if (!state.supabase || !state.campaignId) return;

  const { data, error } = await state.supabase
    .from("test_requests")
    .select("*")
    .eq("campaign_id", state.campaignId)
    .in("status", ["pending", "rolled"])
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  state.requests = Array.isArray(data) ? data : [];
}

function visibleToCurrentUser(request) {
  if (isMaster()) return true;
  const character = getCharacters().find((c) => String(c.id) === String(request.character_id));
  return Boolean(character);
}

function renderRequests() {
  const root = $("aeriom-tests-requests-list");
  const count = $("aeriom-tests-pending-count");
  if (!root) return;

  const visible = state.requests.filter(visibleToCurrentUser);
  const pending = visible.filter((r) => r.status === "pending");

  count.textContent = String(pending.length);
  root.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "aeriom-tests-empty";
    empty.textContent = "Nenhum teste aguardando.";
    root.appendChild(empty);
    return;
  }

  visible.forEach((request) => {
    const character = getCharacters().find((c) => String(c.id) === String(request.character_id));
    const card = document.createElement("article");
    card.className = "aeriom-test-request";
    card.dataset.status = request.status;

    const title = document.createElement("strong");
    title.textContent = `${attributeName(request.attribute_key || request.test_type)} · D${normalizeDieFromCharacter(character, request.attribute_key || request.test_type) || "?"}`;

    const meta = document.createElement("span");
    meta.textContent = [
      character?.name || "Personagem",
      request.skill_key || "",
      request.context || ""
    ].filter(Boolean).join(" · ");

    card.append(title, meta);

    if (request.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "aeriom-test-request__actions";

      if (!isMaster()) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Fazer teste";
        button.dataset.requestId = request.id;
        button.dataset.action = "resolve-test";
        actions.appendChild(button);
      } else {
        const badge = document.createElement("span");
        badge.textContent = "Aguardando jogador";
        actions.appendChild(badge);
      }

      card.appendChild(actions);
    } else if (request.status === "rolled") {
      const result = document.createElement("span");
      result.className = "aeriom-test-request__result";
      result.textContent = `Resultado: ${request.result ?? "—"}`;
      card.appendChild(result);
    }

    root.appendChild(card);
  });
}

async function resolveRequest(requestId) {
  readContext();

  const request = state.requests.find((item) => String(item.id) === String(requestId));
  if (!request) throw new Error("Pedido de teste não encontrado.");

  const character = getCharacters().find((c) => String(c.id) === String(request.character_id));
  if (!character) throw new Error("Personagem do teste não está disponível nesta sessão.");

  const attribute = request.attribute_key || request.test_type;
  const die = normalizeDieFromCharacter(character, attribute);
  if (!die) throw new Error(`O atributo ${attributeName(attribute)} não possui um dado válido.`);

  const dice = window.AERIOM_DICE;
  if (!dice?.roll) throw new Error("Motor de dados ainda não está pronto.");

  const roll = await dice.roll({
    die,
    modifier: request.modifier || 0,
    characterId: character.id,
    visibility: "public",
    context: [
      attributeName(attribute),
      request.skill_key || "",
      request.context || ""
    ].filter(Boolean).join(" · ")
  });

  const { data, error } = await state.supabase
    .from("test_requests")
    .update({
      status: "rolled",
      resolved_by: state.user.id,
      resolved_at: new Date().toISOString(),
      result: roll.totalResult,
      die_type: roll.dieType,
      roll_id: roll.id
    })
    .eq("id", request.id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error) throw error;

  await refreshRequests();

  showResult({
    result: roll.totalResult,
    die: roll.dieType,
    modifier: roll.modifier,
    skill: request.skill_key,
    context: request.context
  });

  dispatch("requestresolved", data);
  return data;
}

async function refreshRequests() {
  await loadRequests();
  renderRequests();
}

function bindEvents() {
  $("aeriom-test-character")?.addEventListener("change", () => {
    setSelectedAttribute(null);
  });

  $("aeriom-test-roll-button")?.addEventListener("click", async () => {
    const error = $("aeriom-tests-error");
    error.hidden = true;
    try {
      await performTest();
    } catch (err) {
      error.textContent = friendlyError(err);
      error.hidden = false;
    }
  });

  $("aeriom-test-request-button")?.addEventListener("click", async () => {
    const error = $("aeriom-tests-error");
    error.hidden = true;
    try {
      await requestTest();
    } catch (err) {
      error.textContent = friendlyError(err);
      error.hidden = false;
    }
  });

  $("aeriom-test-attributes")?.addEventListener("click", (event) => {
    const button = event.target.closest(".aeriom-test-attribute");
    if (!button) return;
    setSelectedAttribute(button.dataset.attribute);
  });

  $("aeriom-tests-requests-list")?.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="resolve-test"]');
    if (!button) return;

    const error = $("aeriom-tests-error");
    error.hidden = true;

    try {
      button.disabled = true;
      await resolveRequest(button.dataset.requestId);
    } catch (err) {
      button.disabled = false;
      error.textContent = friendlyError(err);
      error.hidden = false;
    }
  });
}

function setupRealtime() {
  if (!state.supabase || !state.campaignId || state.realtimeChannel) return;

  state.realtimeChannel = state.supabase
    .channel(`campaign-tests:${state.campaignId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "test_requests",
        filter: `campaign_id=eq.${state.campaignId}`
      },
      async () => {
        try {
          await refreshRequests();
          dispatch("realtime", state.requests);
        } catch (error) {
          console.warn("[AERIOM][TESTS] Realtime refresh failed", error);
        }
      }
    )
    .subscribe();
}

async function init() {
  if (state.initialized) return;

  ensureTestsPanel();
  readContext();
  buildCharacterSelect($("aeriom-test-character"));
  renderSkills();
  renderAttributes();
  renderRole();
  bindEvents();
  setupRealtime();
  await refreshRequests();

  state.initialized = true;
  dispatch("ready", { ...state, requests: state.requests });
}

function refreshContext() {
  readContext();
  buildCharacterSelect($("aeriom-test-character"));
  renderRole();
  setupRealtime();
}

window.addEventListener("aeriom:campaign:ready", async () => {
  refreshContext();
  if (!state.initialized) {
    await init();
  } else {
    await refreshRequests();
  }
});

window.addEventListener("aeriom:dice:ready", () => {
  refreshContext();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

window.AERIOM_TESTS = Object.freeze({
  init,
  performTest,
  requestTest,
  resolveRequest,
  refresh: refreshRequests,
  getRequests: () => state.requests.slice()
});

export {
  init,
  performTest,
  requestTest,
  resolveRequest,
  refreshRequests
};
