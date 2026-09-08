import { getSupabase } from "./supabase.js";

const COMBAT = {
  supabase: null,
  campaignId: null,
  user: null,
  membership: null,
  session: null,
  combatants: [],
  monsters: [],
  ownCharacterIds: new Set(),
  events: [],
  channel: null,
  initialized: false,
  loading: false
};

const ACTIONS = [
  { value: "main", label: "Ação Principal" },
  { value: "move", label: "Movimento" },
  { value: "quick", label: "Ação Rápida" },
  { value: "reaction", label: "Reação" }
];

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const context = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
const isMaster = () => String(COMBAT.membership?.role || "").toLowerCase() === "master";

function playerCanAct(combatant) {
  return Boolean(combatant && (isMaster() || (combatant.character_id && COMBAT.ownCharacterIds.has(combatant.character_id))));
}

function currentCombatant() {
  if (!COMBAT.session) return null;
  if (COMBAT.session.turn_combatant_id) {
    return COMBAT.combatants.find((c) => c.id === COMBAT.session.turn_combatant_id) || null;
  }
  return COMBAT.combatants[Number(COMBAT.session.turn_index || 0)] || null;
}

function characterProfile(combatant) {
  const profile = combatant?.action_data?.character_profile;
  return profile && typeof profile === "object" ? profile : {};
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function attrDie(profile, key, fallback = 8) {
  const attrs = profile.attributes || {};
  const value = attrs[key] ?? profile.assignedDice?.[key] ?? fallback;
  const match = String(value).match(/\d+/);
  return Math.max(4, Number(match?.[0] || fallback));
}

function skillBonus(profile, skill) {
  const direct = profile.skill_modifiers?.[skill];
  if (direct != null) return numeric(direct);
  const state = profile.creation_state?.skills?.[skill];
  return numeric(state?.bonus ?? state?.modifier ?? 0);
}

function physicalTier(die) {
  if (die >= 20) return { damageDie: 8, bonus: 2 };
  if (die >= 12) return { damageDie: 8, bonus: 1 };
  if (die >= 10) return { damageDie: 6, bonus: 1 };
  if (die >= 8) return { damageDie: 6, bonus: 0 };
  return { damageDie: 4, bonus: 0 };
}

function racialKey(profile) {
  return String(profile.race || "").trim().toLowerCase();
}

function buildStandardActions(combatant) {
  const profile = characterProfile(combatant);
  const race = racialKey(profile);
  const strengthDie = attrDie(profile, "forca", 8);
  const agilityDie = attrDie(profile, "agilidade", 8);
  const vigorDie = attrDie(profile, "vigor", 8);
  const precisionDie = attrDie(profile, "precisao", 8);
  const perceptionDie = attrDie(profile, "percepcao", 8);
  const strength = physicalTier(strengthDie);
  const agility = physicalTier(agilityDie);

  const actions = [
    {
      id: "punch", name: "Soco", icon: "👊", cost: "main", type: "attack",
      attackDie: strengthDie, attackBonus: skillBonus(profile, "atletismo"),
      damageFormula: "1d" + strength.damageDie + "+" + strength.bonus,
      description: "Golpe direto usando Força."
    },
    {
      id: "kick", name: "Chute", icon: "🦵", cost: "main", type: "attack",
      attackDie: agilityDie, attackBonus: skillBonus(profile, "acrobacia"),
      damageFormula: "1d" + agility.damageDie + "+" + agility.bonus,
      description: "Golpe rápido usando Agilidade."
    },
    {
      id: "tackle", name: "Investida", icon: "➜", cost: "main", type: "attack",
      attackDie: Math.max(strengthDie, agilityDie),
      attackBonus: skillBonus(profile, "atletismo"),
      damageFormula: "1d" + Math.max(strength.damageDie, agility.damageDie) + "+" + Math.max(strength.bonus, agility.bonus),
      description: "Avança e atinge com o corpo."
    },
    {
      id: "grab", name: "Agarrar", icon: "✊", cost: "main", type: "contest",
      attackDie: strengthDie, defenseAttribute: "vigor", targetDie: "vigor",
      attackBonus: skillBonus(profile, "atletismo"),
      damageFormula: "", conditionOnSuccess: "Agarrado",
      description: "Disputa física contra o Vigor do alvo."
    },
    {
      id: "sweep", name: "Derrubar", icon: "⬇", cost: "quick", type: "contest",
      attackDie: agilityDie, defenseAttribute: "vigor", targetDie: "vigor",
      attackBonus: skillBonus(profile, "acrobacia"),
      damageFormula: "", conditionOnSuccess: "Caído",
      description: "Usa técnica e equilíbrio para derrubar."
    },
    {
      id: "choke", name: "Mata-leão", icon: "♜", cost: "main", type: "contest",
      attackDie: agilityDie, defenseAttribute: "vigor", targetDie: "vigor",
      attackBonus: skillBonus(profile, "acrobacia"),
      damageFormula: "1d4+" + agility.bonus, conditionOnSuccess: "Contido",
      description: "Imobilização curta; vence por Agilidade contra Vigor."
    },
    {
      id: "defend", name: "Esquiva", icon: "◇", cost: "reaction", type: "utility",
      attackDie: agilityDie, attackBonus: 0, damageFormula: "",
      conditionOnSuccess: "Defesa +2",
      description: "Prepara o corpo para o próximo golpe."
    }
  ];

  const racial = [];
  const racialMap = {
    "humano": { name: "Adaptação", icon: "✦", cost: "reaction", type: "utility", description: "Repete um teste recém-falhado; o segundo resultado é aceito.", conditionOnSuccess: "Adaptação pronta" },
    "elfo": { name: "Percepção Élfica", icon: "◉", cost: "quick", type: "utility", attackDie: perceptionDie, description: "Percebe Mana, criaturas escondidas e alterações mágicas." },
    "anão": { name: "Forja Ancestral", icon: "⚒", cost: "quick", type: "utility", attackDie: strengthDie, description: "Analisa material, estrutura ou arma em combate." },
    "orc": { name: "Fúria de Sangue", icon: "🔥", cost: "quick", type: "utility", conditionOnSuccess: "Fúria", hpGate: true, description: "Com poucos PV, entra em Fúria por uma cena." },
    "neraliano": { name: "Adaptação Abissal", icon: "≈", cost: "move", type: "utility", description: "Manobra aquática; respiração e movimento em água." },
    "aureano": { name: "Corpo Celestial", icon: "☁", cost: "move", type: "utility", description: "Salto ou queda controlada acima do normal." },
    "animalhas": { name: "Instinto Animal", icon: "🐾", cost: "quick", type: "utility", description: "Explora a característica da linhagem animal escolhida." },
    "centauro": { name: "Galope Ancestral", icon: "♞", cost: "move", type: "attack", attackDie: Math.max(strengthDie, agilityDie), attackBonus: skillBonus(profile, "atletismo"), damageFormula: "1d" + Math.max(agility.damageDie, strength.damageDie) + "+" + Math.max(agility.bonus, strength.bonus) + 1, description: "Investida acelerada que aumenta o impacto físico." },
    "povo da natureza": { name: "Vínculo Natural", icon: "❧", cost: "quick", type: "utility", description: "Sente alterações na natureza e interage com plantas, animais e ambiente." },
    "fada": { name: "Bênção Feérica", icon: "✦", cost: "quick", type: "utility", description: "Concede ou recebe uma pequena bênção de Mana quando há dignidade reconhecida." },
    "vampiro": { name: "Regeneração Sanguínea", icon: "🩸", cost: "main", type: "attack", attackDie: agilityDie, attackBonus: skillBonus(profile, "furtividade"), damageFormula: "1d4", description: "Ataque sanguíneo que pode recuperar parte dos PV segundo a regra racial." },
    "troll": { name: "Regeneração Brutal", icon: "♢", cost: "quick", type: "utility", conditionOnSuccess: "Regeneração", description: "Recuperação gradual quando não sofre tipos específicos de dano." },
    "colosso": { name: "Asas Colossais", icon: "🪽", cost: "reaction", type: "utility", conditionOnSuccess: "Guarda alada", description: "Usa as asas como escudo, arma ou para planar." },
    "povo aquático": { name: "Anfíbio", icon: "≋", cost: "move", type: "utility", description: "Respira e se move naturalmente na água." },
    "povo das nuvens": { name: "Passo do Céu", icon: "☁", cost: "move", type: "utility", description: "Salto ou plano extraordinário em altitude." },
    "duende": { name: "Leitura de Oportunidade", icon: "◈", cost: "quick", type: "utility", attackDie: perceptionDie, description: "Usa percepção comercial para identificar uma abertura, fraude ou fraqueza de negociação." }
  };
  const racialAction = racialMap[race];
  if (racialAction) racial.push({ id: "racial-" + race.replace(/\s+/g, "-"), ...racialAction, racial: true });
  return { standard: actions, racial };
}

function allCombatActions(combatant) {
  const data = actionData(combatant);
  const monsterActions = (data.actions || []).map((entry, index) => {
    const name = Array.isArray(entry) ? String(entry[0]) : String(entry);
    const text = Array.isArray(entry) ? String(entry[1] || "") : "";
    const formula = text.match(/(\d+d\d+(?:[+-]\d+)?)/i)?.[1] || "";
    return {
      id: "monster-" + index, name, icon: "🎲", cost: "main", type: "attack",
      attackDie: data.attackDie, attackBonus: data.attackBonus,
      damageFormula: formula, description: text, monsterAction: true
    };
  });
  if (combatant?.entity_type === "monster") return { standard: monsterActions, racial: [] };
  const generated = buildStandardActions(combatant);
  return { standard: generated.standard, racial: generated.racial };
}

function safeRoll(sides) {
  const n = Math.max(1, Number(sides) || 20);
  if (window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return 1 + (array[0] % n);
  }
  return 1 + Math.floor(Math.random() * n);
}

function parseFormula(formula) {
  const match = String(formula || "").replace(/\s/g, "").match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;
  return { count: Math.max(1, Number(match[1])), sides: Math.max(1, Number(match[2])), bonus: Number(match[3] || 0) };
}

function rollFormula(formula) {
  const parsed = parseFormula(formula);
  if (!parsed) return null;
  const rolls = Array.from({ length: parsed.count }, () => safeRoll(parsed.sides));
  return { ...parsed, rolls, total: rolls.reduce((a, b) => a + b, 0) + parsed.bonus };
}

function formatFormula(result) {
  if (!result) return "—";
  const bonus = result.bonus > 0 ? "+" + result.bonus : result.bonus < 0 ? String(result.bonus) : "";
  return result.rolls.join(" + ") + bonus + " = " + result.total;
}

function actionData(combatant) {
  const monster = combatant?.monster_id ? COMBAT.monsters.find((m) => m.id === combatant.monster_id) : null;
  return {
    monster,
    actions: monster?.actions || [],
    abilities: monster?.abilities || [],
    resistances: monster?.resistances || [],
    weaknesses: monster?.weaknesses || [],
    senses: monster?.senses || [],
    attackDie: Number(combatant?.action_data?.attack_die) || Number(monster?.attack_die) || 20,
    attackBonus: Number(combatant?.action_data?.attack_bonus) || Number(monster?.attack_bonus) || 0
  };
}

async function refreshContext() {
  const c = context();
  COMBAT.supabase = c.supabase || COMBAT.supabase || await getSupabase();
  COMBAT.campaignId = c.campaignId || new URLSearchParams(location.search).get("campaign");
  COMBAT.user = c.user || COMBAT.user;
  COMBAT.membership = c.membership || COMBAT.membership;
}

async function loadOwnCharacterIds() {
  if (!COMBAT.user?.id) return;
  const { data, error } = await COMBAT.supabase.from("characters").select("id").eq("user_id", COMBAT.user.id);
  if (error) {
    COMBAT.ownCharacterIds = new Set();
    return;
  }
  COMBAT.ownCharacterIds = new Set((data || []).map((row) => row.id));
}

async function loadMonsters() {
  const { data, error } = await COMBAT.supabase.from("monsters")
    .select("id,name,category,size,habitat,threat,hp_max,defense,movement,initiative_die,attack_die,attack_bonus,description,abilities,actions,reactions,resistances,weaknesses,senses,anatomy,page_number")
    .order("page_number");
  if (error) throw error;
  COMBAT.monsters = data || [];
}

async function loadActiveCombat() {
  const { data, error } = await COMBAT.supabase.from("combat_sessions")
    .select("*").eq("campaign_id", COMBAT.campaignId).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  COMBAT.session = data || null;
  if (!COMBAT.session) {
    COMBAT.combatants = [];
    COMBAT.events = [];
    return;
  }

  const q = await COMBAT.supabase.from("combatants")
    .select("*").eq("combat_id", COMBAT.session.id)
    .order("sort_order", { ascending: true })
    .order("initiative", { ascending: false });
  if (q.error) throw q.error;
  COMBAT.combatants = q.data || [];

  const ev = await COMBAT.supabase.from("combat_events")
    .select("*").eq("combat_id", COMBAT.session.id)
    .order("created_at", { ascending: false }).limit(40);
  if (!ev.error) COMBAT.events = ev.data || [];
}

async function getCharacters() {
  const { data, error } = await COMBAT.supabase.from("campaign_characters")
    .select("character_id,characters(id,name,hp_current,hp_max,defense,movement,initiative,attributes,race,class,power,origin,racial_ability,class_bonus,techniques,conditions,skill_modifiers,natural_profile,movement_profile,power_type,resistances,senses,creation_state)")
    .eq("campaign_id", COMBAT.campaignId).eq("is_present", true);
  if (error) throw error;
  return (data || []).map((row) => row.characters).filter(Boolean);
}

async function insertCombatEvent(payload) {
  if (!COMBAT.session || !COMBAT.user?.id) return;
  const { error } = await COMBAT.supabase.from("combat_events").insert({
    combat_id: COMBAT.session.id,
    campaign_id: COMBAT.campaignId,
    actor_id: COMBAT.user.id,
    ...payload
  });
  if (error) console.warn("[AERION][COMBAT] Não foi possível registrar evento.", error);
}

function setTurnResourceDefaults() {
  return { main: true, move: true, quick: true, reaction: true };
}

function resourcesFor(c) {
  return { ...setTurnResourceDefaults(), ...(c?.resource_state || {}) };
}

async function startCombat() {
  if (!isMaster()) return;
  await COMBAT.supabase.from("combat_sessions").update({
    is_active: false, ended_at: new Date().toISOString()
  }).eq("campaign_id", COMBAT.campaignId).eq("is_active", true);

  const { data, error } = await COMBAT.supabase.from("combat_sessions").insert({
    campaign_id: COMBAT.campaignId,
    is_active: true,
    round_number: 1,
    turn_index: 0,
    turn_combatant_id: null,
    started_by: COMBAT.user.id,
    turn_state: setTurnResourceDefaults(),
    last_action_at: new Date().toISOString()
  }).select("*").single();
  if (error) throw error;

  COMBAT.session = data;
  COMBAT.combatants = [];
  COMBAT.events = [];
  await insertCombatEvent({ event_type: "combat_started", action_name: "Combate iniciado", metadata: {} });
  render();
}

async function addCharacter(character) {
  if (!isMaster() || !COMBAT.session || COMBAT.combatants.some((c) => c.character_id === character.id)) return;
  const die = Number(character?.attributes?.agilidade) || 20;
  const initiative = safeRoll(die);
  const { data, error } = await COMBAT.supabase.from("combatants").insert({
    combat_id: COMBAT.session.id,
    character_id: character.id,
    name: character.name,
    initiative,
    entity_type: "character",
    hp_current: character.hp_current,
    hp_max: character.hp_max,
    defense: character.defense,
    movement: character.movement,
    resource_state: setTurnResourceDefaults(),
    action_data: {
      attack_die: die,
      attack_bonus: 0,
      initiative_die: die,
      character_profile: {
        id: character.id,
        name: character.name,
        race: character.race,
        class: character.class,
        power: character.power,
        origin: character.origin,
        racial_ability: character.racial_ability,
        class_bonus: character.class_bonus,
        attributes: character.attributes || {},
        skill_modifiers: character.skill_modifiers || {},
        techniques: character.techniques || [],
        conditions: character.conditions || [],
        natural_profile: character.natural_profile || "",
        movement_profile: character.movement_profile || {},
        power_type: character.power_type || "",
        resistances: character.resistances || [],
        senses: character.senses || [],
        creation_state: character.creation_state || {}
      }
    }
  }).select("*").single();
  if (error) throw error;
  COMBAT.combatants.push(data);
  sortCombatants();
  if (!COMBAT.session.turn_combatant_id) {
    const { data: updatedSession, error: turnError } = await COMBAT.supabase.from("combat_sessions")
      .update({ turn_combatant_id: data.id, turn_index: COMBAT.combatants.findIndex((c) => c.id === data.id) })
      .eq("id", COMBAT.session.id).select("*").single();
    if (turnError) throw turnError;
    COMBAT.session = updatedSession;
  }
  await insertCombatEvent({
    event_type: "combatant_added",
    source_combatant_id: data.id,
    action_name: "Personagem entrou no combate",
    metadata: { name: character.name, initiative }
  });
  render();
}

async function addMonster(monster) {
  if (!isMaster() || !COMBAT.session) return;
  const initiative = safeRoll(monster.initiative_die);
  const { data, error } = await COMBAT.supabase.from("combatants").insert({
    combat_id: COMBAT.session.id,
    monster_id: monster.id,
    name: monster.name,
    initiative,
    entity_type: "monster",
    hp_current: monster.hp_max,
    hp_max: monster.hp_max,
    defense: monster.defense,
    movement: monster.movement,
    resource_state: setTurnResourceDefaults(),
    action_data: { attack_die: monster.attack_die, attack_bonus: monster.attack_bonus }
  }).select("*").single();
  if (error) throw error;
  COMBAT.combatants.push(data);
  sortCombatants();
  await insertCombatEvent({
    event_type: "combatant_added",
    source_combatant_id: data.id,
    action_name: "Monstro entrou no combate",
    metadata: { name: monster.name, initiative, monster_id: monster.id }
  });
  render();
}

async function rerollInitiative() {
  if (!isMaster() || !COMBAT.session || !COMBAT.combatants.length) return;
  for (const c of COMBAT.combatants) {
    const monster = c.monster_id ? COMBAT.monsters.find((m) => m.id === c.monster_id) : null;
    const die = Number(c.action_data?.initiative_die) || Number(monster?.initiative_die) || 20;
    await updateCombatant(c.id, { initiative: safeRoll(die), resource_state: setTurnResourceDefaults() });
  }
  sortCombatants();
  const first = COMBAT.combatants[0] || null;
  const { data, error } = await COMBAT.supabase.from("combat_sessions").update({
    turn_index: 0,
    turn_combatant_id: first?.id || null,
    round_number: 1,
    turn_state: setTurnResourceDefaults(),
    updated_at: new Date().toISOString()
  }).eq("id", COMBAT.session.id).select("*").single();
  if (error) throw error;
  COMBAT.session = data;
  await insertCombatEvent({ event_type: "initiative_rerolled", action_name: "Iniciativa rolada novamente", metadata: { count: COMBAT.combatants.length } });
  render();
}

function sortCombatants() {
  COMBAT.combatants.sort((a, b) => (b.initiative - a.initiative) || ((a.sort_order || 0) - (b.sort_order || 0)));
}

async function updateCombatant(id, patch) {
  const { data, error } = await COMBAT.supabase.from("combatants")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throw error;
  const index = COMBAT.combatants.findIndex((c) => c.id === id);
  if (index >= 0) COMBAT.combatants[index] = data;
  return data;
}

async function nextTurn() {
  if (!isMaster() || !COMBAT.session || !COMBAT.combatants.length) return;

  const currentIndex = Math.max(0, COMBAT.combatants.findIndex((c) => c.id === COMBAT.session.turn_combatant_id));
  let idx = currentIndex + 1;
  let round = Number(COMBAT.session.round_number || 1);
  while (idx < COMBAT.combatants.length && COMBAT.combatants[idx].is_defeated) idx += 1;
  if (idx >= COMBAT.combatants.length) {
    idx = 0;
    round += 1;
    while (idx < COMBAT.combatants.length && COMBAT.combatants[idx].is_defeated) idx += 1;
    if (idx >= COMBAT.combatants.length) idx = currentIndex;
  }
  const nextCombatant = COMBAT.combatants[idx] || null;

  const { data, error } = await COMBAT.supabase.from("combat_sessions").update({
    turn_index: idx,
    turn_combatant_id: nextCombatant?.id || null,
    round_number: round,
    turn_state: setTurnResourceDefaults(),
    last_action_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", COMBAT.session.id).select("*").single();
  if (error) throw error;

  COMBAT.session = data;

  const current = currentCombatant();
  if (current) await updateCombatant(current.id, { resource_state: setTurnResourceDefaults() });

  await insertCombatEvent({
    event_type: "turn_changed",
    source_combatant_id: current?.id || null,
    action_name: "Próximo turno",
    metadata: { round, turn_index: idx }
  });
  render();
}

async function endCombat() {
  if (!isMaster() || !COMBAT.session) return;
  if (!window.confirm("Encerrar este combate? O histórico permanecerá salvo.")) return;

  const { error } = await COMBAT.supabase.from("combat_sessions").update({
    is_active: false, ended_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).eq("id", COMBAT.session.id);
  if (error) throw error;

  await insertCombatEvent({ event_type: "combat_ended", action_name: "Combate encerrado", metadata: {} });
  COMBAT.session = null;
  COMBAT.combatants = [];
  COMBAT.events = [];
  render();
}

async function removeCombatant(id) {
  if (!isMaster()) return;
  const combatant = COMBAT.combatants.find((c) => c.id === id);
  if (!combatant) return;
  if (!window.confirm("Remover " + combatant.name + " do combate?")) return;
  await insertCombatEvent({
    event_type: "combatant_removed",
    source_combatant_id: id,
    action_name: "Combatente removido",
    metadata: { name: combatant.name }
  });
  const { error } = await COMBAT.supabase.from("combatants").delete().eq("id", id);
  if (error) throw error;
  COMBAT.combatants = COMBAT.combatants.filter((c) => c.id !== id);
  const nextIndex = Math.min(Number(COMBAT.session.turn_index || 0), Math.max(0, COMBAT.combatants.length - 1));
  const nextId = COMBAT.combatants[nextIndex]?.id || null;
  const { data } = await COMBAT.supabase.from("combat_sessions").update({ turn_index: nextIndex, turn_combatant_id: nextId }).eq("id", COMBAT.session.id).select("*").single();
  if (data) COMBAT.session = data;
  render();
}

async function setHp(id, value, reason = "HP ajustado") {
  if (!isMaster()) return;
  const c = COMBAT.combatants.find((item) => item.id === id);
  if (!c) return;
  const max = Math.max(0, Number(c.hp_max ?? 0));
  const next = Math.max(0, Math.min(max, Number(value)));
  const before = Number(c.hp_current ?? 0);
  const defeated = next <= 0;

  await updateCombatant(id, { hp_current: next, is_defeated: defeated, defeated_at: defeated && !c.defeated_at ? new Date().toISOString() : (defeated ? c.defeated_at : null) });
  await insertCombatEvent({
    event_type: defeated ? "defeated" : "hp_changed",
    source_combatant_id: id,
    action_name: reason,
    hp_before: before,
    hp_after: next,
    damage_result: Math.max(0, before - next),
    metadata: { reason }
  });
  render();
}

async function applyDamage(id, amount, metadata = {}) {
  const c = COMBAT.combatants.find((item) => item.id === id);
  if (!c) return 0;
  const before = Number(c.hp_current ?? 0);
  const damage = Math.max(0, Math.floor(Number(amount) || 0));
  const next = Math.max(0, Math.min(Number(c.hp_max ?? 0), before - damage));
  const defeated = next <= 0;

  await updateCombatant(id, {
    hp_current: next,
    is_defeated: defeated,
    defeated_at: defeated && !c.defeated_at ? new Date().toISOString() : (defeated ? c.defeated_at : null)
  });

  if (COMBAT.session) {
    await insertCombatEvent({
      event_type: defeated ? "defeated" : "damage",
      source_combatant_id: metadata.sourceId || null,
      target_combatant_id: id,
      action_cost: metadata.actionCost || null,
      action_name: metadata.actionName || "Dano",
      roll_die: metadata.rollDie || null,
      roll_result: metadata.rollResult || null,
      attack_total: metadata.attackTotal || null,
      defense_value: metadata.defense || c.defense || null,
      damage_formula: metadata.damageFormula || null,
      damage_result: damage,
      hp_before: before,
      hp_after: next,
      metadata: metadata.extra || {}
    });
  }
  return damage;
}

async function executeAction(source, targetId, actionMeta, actionCost, manualDamageFormula, manualDie, manualBonus) {
  if (!COMBAT.session || !source || !playerCanAct(source)) return;
  if (source.id !== currentCombatant()?.id && !isMaster()) return;

  const resources = resourcesFor(source);
  const cost = actionCost || actionMeta?.cost || "main";
  if (!resources[cost]) {
    alert("Essa ação já foi usada neste turno.");
    return;
  }

  const target = targetId ? COMBAT.combatants.find((c) => c.id === targetId) : null;
  const data = actionData(source);
  const meta = actionMeta || {};
  const attackDie = Number(manualDie) || Number(meta.attackDie) || data.attackDie;
  const attackBonus = Number.isFinite(Number(manualBonus)) ? Number(manualBonus) : Number(meta.attackBonus ?? data.attackBonus);
  const damageFormula = String(manualDamageFormula || meta.damageFormula || "").trim();

  let attackResult = null;
  let hit = true;
  let contest = null;

  if (target && meta.type === "contest") {
    const attackerRoll = safeRoll(attackDie);
    const targetProfile = target.entity_type === "character" ? characterProfile(target) : null;
    const targetDie = targetProfile
      ? attrDie(targetProfile, meta.defenseAttribute || "vigor", 8)
      : Number(target.action_data?.defense_die) || 20;
    const defenderRoll = safeRoll(targetDie);
    attackResult = { die: attackDie, result: attackerRoll, total: attackerRoll + attackBonus, bonus: attackBonus };
    contest = { targetDie, result: defenderRoll, total: defenderRoll };
    hit = attackResult.total >= contest.total;
  } else if (target && meta.type === "attack") {
    const rolled = safeRoll(attackDie);
    attackResult = { die: attackDie, result: rolled, total: rolled + attackBonus, bonus: attackBonus };
    hit = attackResult.total >= Number(target.defense ?? 0);
  }

  let damageResult = null;
  if (hit && damageFormula) damageResult = rollFormula(damageFormula);

  const resourceState = { ...resources, [cost]: false };
  await updateCombatant(source.id, { resource_state: resourceState });
  await COMBAT.supabase.from("combat_sessions").update({
    turn_state: resourceState,
    last_action_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", COMBAT.session.id);

  if (attackResult) {
    window.AERIOM_DICE?.playResultEffect?.(
      attackResult.result === 20 && attackDie === 20 ? "critical" :
      attackResult.result === 1 && attackDie === 20 ? "critical-failure" : "normal",
      attackDie
    );
  }

  const extra = {
    hit,
    critical: Boolean(attackResult && attackResult.result === 20 && attackDie === 20),
    rolls: attackResult ? [attackResult.result] : [],
    target_roll: contest?.result || null,
    target_die: contest?.targetDie || null,
    target_total: contest?.total || null,
    damage_rolls: damageResult?.rolls || []
  };

  if (target && hit && damageResult) {
    await applyDamage(target.id, damageResult.total, {
      sourceId: source.id,
      actionCost: cost,
      actionName: meta.name || "Ação",
      rollDie: attackDie,
      rollResult: attackResult?.result,
      attackTotal: attackResult?.total,
      defense: meta.type === "contest" ? contest?.total : target.defense,
      damageFormula,
      extra
    });
  }

  if (target && hit && meta.conditionOnSuccess) {
    const conditions = Array.isArray(target.conditions) ? target.conditions.slice() : [];
    if (!conditions.includes(meta.conditionOnSuccess)) conditions.push(meta.conditionOnSuccess);
    await updateCombatant(target.id, { conditions });
    extra.condition = meta.conditionOnSuccess;
  }

  await insertCombatEvent({
    event_type: target ? (hit ? "action" : "attack_missed") : "action",
    source_combatant_id: source.id,
    target_combatant_id: target?.id || null,
    action_cost: cost,
    action_name: meta.name || "Ação",
    roll_die: attackDie || null,
    roll_result: attackResult?.result || null,
    attack_total: attackResult?.total || null,
    defense_value: meta.type === "contest" ? contest?.total || null : target?.defense || null,
    damage_formula: damageFormula || null,
    damage_result: damageResult?.total || null,
    metadata: extra
  });

  render();
}

function openActionModal(sourceId) {
  const source = COMBAT.combatants.find((c) => c.id === sourceId);
  if (!source || !playerCanAct(source) || (source.id !== currentCombatant()?.id && !isMaster())) return;

  const available = allCombatActions(source);
  const actions = [...available.standard, ...available.racial];
  const modal = document.createElement("div");
  modal.className = "combat-modal";
  modal.innerHTML =
    '<div class="combat-modal__card combat-modal__card--action" role="dialog" aria-modal="true">' +
      '<div class="combat-modal__head"><div><span class="campaign-panel__eyebrow">Seu turno</span><h3>' + esc(source.name) + '</h3></div><button type="button" class="combat-modal__close" data-close aria-label="Fechar">×</button></div>' +
      '<div class="combat-quick-sheet">' +
        '<div class="combat-quick-sheet__label">Ações rápidas</div>' +
        '<div class="combat-action-list">' +
          actions.map((action, index) => {
            const icon = action.icon || "🎲";
            const type = action.racial ? "racial" : "standard";
            return '<button type="button" class="combat-action-card ' + (index === 0 ? "is-selected" : "") + '" data-action-id="' + esc(action.id) + '" data-action-index="' + index + '" data-type="' + type + '">' +
              '<span class="combat-action-card__icon">' + icon + '</span><span class="combat-action-card__body"><strong>' + esc(action.name) + '</strong><small>' + esc(action.description || "Ação disponível") + (action.damageFormula ? " · " + esc(action.damageFormula) : "") + '</small></span><span class="combat-action-card__arrow">›</span>' +
            '</button>';
          }).join("") +
        '</div>' +
        '<label class="combat-target-picker"><span>Alvo</span><select name="target_id"><option value="">Sem alvo</option>' +
          COMBAT.combatants.filter((c) => c.id !== source.id && !c.is_defeated).map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + ' · DEF ' + esc(c.defense ?? "-") + '</option>').join("") +
        '</select></label>' +
        '<details class="combat-advanced"><summary>Ajustes avançados</summary><div class="combat-form__grid">' +
          '<label><span>Dado de ataque</span><input name="die" type="number" min="4" max="20" value=""></label>' +
          '<label><span>Bônus</span><input name="bonus" type="number" value=""></label>' +
          '<label><span>Dano</span><input name="damage" placeholder="automático"></label>' +
          '<label><span>Custo</span><select name="cost">' + ACTIONS.map((item) => '<option value="' + item.value + '">' + item.label + '</option>').join("") + '</select></label>' +
        '</div></details>' +
        '<div class="combat-quick-sheet__footer"><span class="combat-quick-roll"><span>🎲</span> Rolar e resolver</span><button type="button" class="campaign-button campaign-button--secondary" data-close>Cancelar</button><button type="button" class="campaign-button campaign-button--primary" data-execute>Executar</button></div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });

  const cards = Array.from(modal.querySelectorAll("[data-action-id]"));
  let selected = actions[0] || null;
  const syncAdvanced = () => {
    const die = modal.querySelector('[name="die"]');
    const bonus = modal.querySelector('[name="bonus"]');
    const damage = modal.querySelector('[name="damage"]');
    const cost = modal.querySelector('[name="cost"]');
    if (!selected) return;
    die.value = selected.attackDie || "";
    bonus.value = selected.attackBonus ?? "";
    damage.value = selected.damageFormula || "";
    cost.value = selected.cost || "main";
  };
  cards.forEach((card) => card.addEventListener("click", () => {
    cards.forEach((item) => item.classList.remove("is-selected"));
    card.classList.add("is-selected");
    selected = actions.find((item) => item.id === card.dataset.actionId) || selected;
    syncAdvanced();
  }));
  syncAdvanced();

  modal.querySelector("[data-execute]")?.addEventListener("click", async () => {
    if (!selected) return;
    const targetId = modal.querySelector('[name="target_id"]')?.value || "";
    const damage = modal.querySelector('[name="damage"]')?.value.trim() || "";
    const cost = modal.querySelector('[name="cost"]')?.value || selected.cost || "main";
    const die = modal.querySelector('[name="die"]')?.value || selected.attackDie || "";
    const bonus = modal.querySelector('[name="bonus"]')?.value || selected.attackBonus || 0;
    const button = modal.querySelector("[data-execute]");
    button.disabled = true;
    try {
      window.AERIOM_DICE?.playRollEffect?.(Number(die) || 20);
      await executeAction(source, targetId, selected, cost, damage, die, bonus);
      close();
    } catch (error) {
      alert(error?.message || "Não foi possível executar a ação.");
      button.disabled = false;
    }
  });
}

function openMonsterPicker() {
  const select = document.createElement("div");
  select.className = "combat-modal";
  select.innerHTML =
    '<div class="combat-modal__card"><div class="combat-modal__head"><h3>Adicionar monstro</h3><button data-close type="button" class="combat-modal__close">×</button></div><div class="combat-picker">' +
      '<input class="combat-picker__search" type="search" placeholder="Pesquisar monstro...">' +
      '<div class="combat-picker__list">' + COMBAT.monsters.map((m) => '<button type="button" data-monster="' + esc(m.id) + '"><strong>' + esc(m.name) + '</strong><span>' + esc(m.threat) + ' · HP ' + esc(m.hp_max) + ' · DEF ' + esc(m.defense) + '</span></button>').join("") + '</div>' +
    '</div></div>';
  document.body.appendChild(select);

  const list = select.querySelector(".combat-picker__list");
  const renderList = (term = "") => {
    list.querySelectorAll("button").forEach((button) => {
      button.hidden = !button.textContent.toLowerCase().includes(term.toLowerCase());
    });
  };
  select.querySelector("input").addEventListener("input", (e) => renderList(e.target.value));
  select.querySelector("[data-close]").addEventListener("click", () => select.remove());
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-monster]");
    if (!button) return;
    try { await addMonster(COMBAT.monsters.find((m) => m.id === button.dataset.monster)); select.remove(); } catch (error) { alert(error?.message || "Erro ao adicionar monstro."); }
  });
}

async function openCharacterPicker() {
  const chars = await getCharacters();
  const modal = document.createElement("div");
  modal.className = "combat-modal";
  modal.innerHTML =
    '<div class="combat-modal__card"><div class="combat-modal__head"><h3>Adicionar personagem</h3><button data-close type="button" class="combat-modal__close">×</button></div><div class="combat-picker__list">' +
    chars.map((c) => '<button type="button" data-character="' + esc(c.id) + '"><strong>' + esc(c.name) + '</strong><span>HP ' + esc(c.hp_current) + '/' + esc(c.hp_max) + ' · DEF ' + esc(c.defense) + '</span></button>').join("") +
    '</div></div>';
  document.body.appendChild(modal);
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
  modal.querySelector(".combat-picker__list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-character]");
    if (!button) return;
    try { await addCharacter(chars.find((c) => c.id === button.dataset.character)); modal.remove(); } catch (error) { alert(error?.message || "Erro ao adicionar personagem."); }
  });
}

function openMonsterDetails(monsterId) {
  const monster = COMBAT.monsters.find((m) => m.id === monsterId);
  if (!monster) return;
  const modal = document.createElement("div");
  modal.className = "combat-modal";
  modal.innerHTML =
    '<div class="combat-modal__card combat-modal__card--wide"><div class="combat-modal__head"><div><span class="campaign-panel__eyebrow">Monstruário · página ' + esc(monster.page_number) + '</span><h3>' + esc(monster.name) + '</h3></div><button data-close type="button" class="combat-modal__close">×</button></div>' +
    '<div class="combat-monster-sheet"><div class="combat-stat-grid">' +
    '<div><b>HP</b><span>' + esc(monster.hp_max) + '</span></div><div><b>DEF</b><span>' + esc(monster.defense) + '</span></div><div><b>MOV</b><span>' + esc(monster.movement) + 'm</span></div><div><b>INI</b><span>1D' + esc(monster.initiative_die) + '</span></div>' +
    '</div><p>' + esc(monster.description) + '</p><section><h4>Sentidos</h4><p>' + esc((monster.senses || []).join(" · ") || "—") + '</p></section><section><h4>Habilidades</h4><p>' + esc((monster.abilities || []).join(" · ") || "—") + '</p></section><section><h4>Ações</h4><p>' + esc((monster.actions || []).map((a) => Array.isArray(a) ? a[0] + ": " + a[1] : a).join(" · ") || "—") + '</p></section><section><h4>Resistências</h4><p>' + esc((monster.resistances || []).join(" · ") || "Nenhuma") + '</p></section><section><h4>Fraquezas</h4><p>' + esc((monster.weaknesses || []).join(" · ") || "Nenhuma") + '</p></section><section><h4>Anatomia</h4><p>' + esc((monster.anatomy || []).join(" · ") || "—") + '</p></section></div></div>';
  document.body.appendChild(modal);
  modal.querySelector("[data-close]").addEventListener("click", () => modal.remove());
}

function renderEvents() {
  if (!COMBAT.events.length) return '<div class="combat-log__empty">Nenhuma ação registrada ainda.</div>';
  return COMBAT.events.slice(0, 12).map((e) => {
    const result = e.attack_total != null ? ' · Ataque ' + esc(e.attack_total) + (e.defense_value != null ? ' vs DEF ' + esc(e.defense_value) : '') : '';
    const dmg = e.damage_result != null ? ' · Dano ' + esc(e.damage_result) : '';
    return '<div class="combat-log__item"><span>' + esc(new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })) + '</span><strong>' + esc(e.action_name || e.event_type) + '</strong><p>' + esc(e.metadata?.hit === false ? "Ataque errou." : e.metadata?.hit === true ? "Ataque acertou." : "") + result + dmg + (e.hp_after != null ? ' · HP ' + esc(e.hp_after) : '') + '</p></div>';
  }).join("");
}

function render() {
  const root = $("campaign-combat-content");
  if (!root) return;

  if (!COMBAT.session) {
    document.body.classList.remove("aeriom-combat-active");
    window.AERIOM_DICE?.stopCombatAtmosphere?.();
    root.innerHTML =
      '<div class="combat-empty">' +
        '<div class="combat-empty__icon">⚔</div>' +
        '<span class="campaign-panel__eyebrow">Combate</span>' +
        '<h2>Nenhum combate ativo</h2>' +
        '<p>O Mestre inicia o encontro. A iniciativa e as ações serão compartilhadas com toda a mesa.</p>' +
        (isMaster() ? '<button class="campaign-button campaign-button--primary" id="combat-start">Iniciar combate</button>' : '') +
      '</div>';
    root.querySelector("#combat-start")?.addEventListener("click", () => startCombat().catch((e) => alert(e?.message || "Erro ao iniciar combate.")));
    return;
  }

  document.body.classList.add("aeriom-combat-active");
  if (window.AERIOM_DICE?.getAudioSettings?.().combatAtmosphere !== false) {
    window.AERIOM_DICE?.startCombatAtmosphere?.();
  }

  const current = currentCombatant();
  const turnResources = resourcesFor(current);

  const actions = isMaster()
    ? '<button class="combat-icon-action" id="combat-add-char" title="Adicionar personagem" aria-label="Adicionar personagem"><span>👤</span><small>Personagem</small></button>' +
      '<button class="combat-icon-action" id="combat-add-monster" title="Adicionar monstro" aria-label="Adicionar monstro"><span>👹</span><small>Monstro</small></button>' +
      '<button class="combat-icon-action combat-dice-button" id="combat-reroll" title="Rolar iniciativa novamente" aria-label="Rolar iniciativa novamente"><span>🎲</span><small>Iniciativa</small></button>'
    : "";

  const canAct = Boolean(current && (isMaster() || (current.character_id && COMBAT.ownCharacterIds.has(current.character_id))));
  const turnButtons = canAct
    ? '<button class="combat-icon-action combat-icon-action--primary" id="combat-action" title="Abrir ações do turno" aria-label="Abrir ações do turno"><span>⚔</span><small>Ação</small></button>'
    : "";

  const masterFlow = isMaster()
    ? '<button class="combat-icon-action" id="combat-next" title="Próximo turno" aria-label="Próximo turno"><span>›</span><small>Próximo</small></button>' +
      '<button class="combat-icon-action combat-icon-action--danger" id="combat-end" title="Encerrar combate" aria-label="Encerrar combate"><span>×</span><small>Encerrar</small></button>'
    : "";

  const list = COMBAT.combatants.map((c, index) => {
    const percent = Math.max(0, Math.min(100, ((Number(c.hp_current ?? 0) / Math.max(1, Number(c.hp_max ?? 1))) * 100)));
    const cRes = resourcesFor(c);
    const active = c.id === COMBAT.session.turn_combatant_id ||
      (!COMBAT.session.turn_combatant_id && index === Number(COMBAT.session.turn_index || 0));
    const monsterButton = c.entity_type === "monster" && c.monster_id
      ? '<button class="combatant__details" data-monster="' + esc(c.monster_id) + '">Ficha</button>'
      : "";
    const status = c.is_defeated ? "Derrotado" : active ? "Turno atual" : "Aguardando";
    return '<article class="combatant ' + (active ? "is-active " : "") + (c.is_defeated ? "is-defeated" : "") + '">' +
      '<div class="combatant__initiative">' + esc(c.initiative) + '</div>' +
      '<div class="combatant__main">' +
        '<div class="combatant__name-row"><strong>' + esc(c.name) + '</strong><span class="combatant__status">' + status + '</span></div>' +
        '<small>' + (c.entity_type === "monster" ? "Monstro" : "Personagem") + ' · DEF ' + esc(c.defense ?? "-") + ' · ' + esc(c.movement ?? "-") + 'm</small>' +
        '<div class="combat-hp"><span style="width:' + percent + '%"></span></div>' +
        '<small>HP ' + esc(c.hp_current ?? 0) + '/' + esc(c.hp_max ?? 0) + '</small>' +
        '<div class="combat-resources">' +
          [['main','A'],['move','M'],['quick','R'],['reaction','↩']].map(([key,label]) =>
            '<span class="' + (cRes[key] ? "is-ready" : "is-used") + '" title="' + esc(ACTIONS.find(a => a.value === key)?.label || key) + '">' + label + '</span>'
          ).join("") +
        '</div>' +
      '</div>' +
      '<div class="combatant__actions">' + monsterButton +
        (isMaster() ? '<button data-hp="-5" data-id="' + esc(c.id) + '" title="Dano 5">−5</button><button data-hp="5" data-id="' + esc(c.id) + '" title="Cura 5">+5</button><button data-remove="' + esc(c.id) + '" title="Remover">×</button>' : '') +
      '</div>' +
    '</article>';
  }).join("");

  root.innerHTML =
    '<div class="combat-shell">' +
      '<div class="combat-turnbar">' +
        '<div class="combat-turnbar__identity">' +
          '<span class="campaign-panel__eyebrow">COMBATE ATIVO</span>' +
          '<div class="combat-turnbar__round">Rodada ' + esc(COMBAT.session.round_number || 1) + '</div>' +
          '<div class="combat-turnbar__current">' + (current ? '<span>Turno de</span> <strong>' + esc(current.name) + '</strong>' : 'Prepare a iniciativa') + '</div>' +
        '</div>' +
        '<div class="combat-turnbar__resources" aria-label="Ações do turno">' +
          '<span class="' + (turnResources.main ? "is-ready" : "is-used") + '">A</span>' +
          '<span class="' + (turnResources.move ? "is-ready" : "is-used") + '">M</span>' +
          '<span class="' + (turnResources.quick ? "is-ready" : "is-used") + '">R</span>' +
          '<span class="' + (turnResources.reaction ? "is-ready" : "is-used") + '">↩</span>' +
        '</div>' +
      '</div>' +
      '<div class="combat-actionbar">' + actions + turnButtons + masterFlow + '</div>' +
      '<div class="combat-grid">' +
        '<section class="combat-card"><div class="combat-card__head"><h3>Iniciativa</h3><span>' + COMBAT.combatants.length + ' combatentes</span></div><div class="combat-list">' + list + '</div></section>' +
        '<section class="combat-card combat-card--log"><div class="combat-card__head"><h3>Registro</h3><span>Últimas ações</span></div><div class="combat-log">' + renderEvents() + '</div></section>' +
      '</div>' +
    '</div>';

  root.querySelector("#combat-add-char")?.addEventListener("click", () => openCharacterPicker());
  root.querySelector("#combat-add-monster")?.addEventListener("click", () => openMonsterPicker());
  root.querySelector("#combat-reroll")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.classList.remove("is-rolling");
    void button.offsetWidth;
    button.classList.add("is-rolling");
    try { await rerollInitiative(); } catch (e) { alert(e?.message || "Erro ao rolar iniciativa."); }
    window.setTimeout(() => button.classList.remove("is-rolling"), 700);
  });
  root.querySelector("#combat-action")?.addEventListener("click", () => openActionModal(current.id));
  root.querySelector("#combat-next")?.addEventListener("click", () => nextTurn().catch((e) => alert(e?.message || "Erro ao avançar o turno.")));
  root.querySelector("#combat-end")?.addEventListener("click", () => endCombat().catch((e) => alert(e?.message || "Erro ao encerrar combate.")));
  root.querySelectorAll("[data-hp]").forEach((button) => {
    button.addEventListener("click", () => setHp(button.dataset.id, Number(COMBAT.combatants.find((c) => c.id === button.dataset.id)?.hp_current || 0) + Number(button.dataset.hp)));
  });
  root.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => removeCombatant(button.dataset.remove).catch((e) => alert(e?.message || "Erro ao remover."))));
  root.querySelectorAll("[data-monster]").forEach((button) => button.addEventListener("click", () => openMonsterDetails(button.dataset.monster)));
}

function setupRealtime() {
  if (!COMBAT.supabase || !COMBAT.campaignId) return;
  if (COMBAT.channel) COMBAT.supabase.removeChannel(COMBAT.channel);
  COMBAT.channel = COMBAT.supabase.channel("aeriom-combat-" + COMBAT.campaignId)
    .on("postgres_changes", { event: "*", schema: "public", table: "combat_sessions", filter: "campaign_id=eq." + COMBAT.campaignId }, async () => {
      await loadActiveCombat();
      render();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "combatants" }, async () => {
      await loadActiveCombat();
      render();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "combat_events", filter: "campaign_id=eq." + COMBAT.campaignId }, async () => {
      await loadActiveCombat();
      render();
    })
    .subscribe();
}

async function init() {
  if (COMBAT.initialized || COMBAT.loading) return;
  COMBAT.loading = true;
  try {
    await refreshContext();
    if (!COMBAT.supabase || !COMBAT.campaignId || !COMBAT.user) return;
    await Promise.all([loadMonsters(), loadOwnCharacterIds()]);
    await loadActiveCombat();
    setupRealtime();
    render();
    COMBAT.initialized = true;
  } finally {
    COMBAT.loading = false;
  }
}

window.addEventListener("aeriom:campaigntabchange", (event) => {
  if (event.detail?.tab === "combat") init().catch((e) => console.warn("[AERION][COMBAT]", e));
});
window.addEventListener("aeriom:campaignready", () => init().catch((e) => console.warn("[AERION][COMBAT]", e)));
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init().catch(() => {}), { once: true });
else init().catch(() => {});
