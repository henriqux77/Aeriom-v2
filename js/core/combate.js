
import { getSupabase } from "./supabase.js";

const COMBAT = {
  supabase: null,
  campaignId: null,
  user: null,
  membership: null,
  session: null,
  combatants: [],
  monsters: [],
  initialized: false
};

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const isMaster = () => COMBAT.membership?.role === "master";
const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};

async function refreshContext() {
  const c = ctx();
  COMBAT.supabase = c.supabase || COMBAT.supabase || await getSupabase();
  COMBAT.campaignId = c.campaignId || new URLSearchParams(location.search).get("campaign");
  COMBAT.user = c.user || COMBAT.user;
  COMBAT.membership = c.membership || COMBAT.membership;
}

function rollDie(max) {
  const n = Number(max) || 20;
  if (window.crypto?.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return 1 + (a[0] % n);
  }
  return 1 + Math.floor(Math.random() * n);
}

async function loadMonsters() {
  const { data, error } = await COMBAT.supabase
    .from("monsters")
    .select("id,name,category,size,threat,hp_max,defense,movement,initiative_die,attack_die,attack_bonus,description,abilities,actions,reactions,resistances,weaknesses,senses,anatomy")
    .order("page_number");
  if (error) throw error;
  COMBAT.monsters = data || [];
}

async function loadActiveCombat() {
  const { data, error } = await COMBAT.supabase
    .from("combat_sessions")
    .select("*")
    .eq("campaign_id", COMBAT.campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  COMBAT.session = data || null;
  if (!COMBAT.session) {
    COMBAT.combatants = [];
    return;
  }
  const q = await COMBAT.supabase
    .from("combatants")
    .select("*")
    .eq("combat_id", COMBAT.session.id)
    .order("sort_order", { ascending: true })
    .order("initiative", { ascending: false });
  if (q.error) throw q.error;
  COMBAT.combatants = q.data || [];
}

async function getCharacters() {
  const { data, error } = await COMBAT.supabase
    .from("campaign_characters")
    .select("character_id,characters(id,name,hp_current,hp_max,defense,movement,initiative,attributes)")
    .eq("campaign_id", COMBAT.campaignId);
  if (error) throw error;
  return (data || []).map((row) => row.characters).filter(Boolean);
}

function sortCombatants() {
  COMBAT.combatants.sort((a, b) => (b.initiative - a.initiative) || ((a.sort_order || 0) - (b.sort_order || 0)));
}

async function startCombat() {
  if (!isMaster()) return;
  await COMBAT.supabase.from("combat_sessions").update({
    is_active: false,
    ended_at: new Date().toISOString()
  }).eq("campaign_id", COMBAT.campaignId).eq("is_active", true);
  const { data, error } = await COMBAT.supabase.from("combat_sessions").insert({
    campaign_id: COMBAT.campaignId,
    is_active: true,
    round_number: 1,
    turn_index: 0,
    started_by: COMBAT.user.id
  }).select("*").single();
  if (error) throw error;
  COMBAT.session = data;
  COMBAT.combatants = [];
  render();
}

async function addCharacter(character) {
  if (!isMaster() || !COMBAT.session) return;
  const die = Number(character?.attributes?.agilidade) || 20;
  const initiative = rollDie(die);
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
    action_data: { attack_die: die, attack_bonus: 0 }
  }).select("*").single();
  if (error) throw error;
  COMBAT.combatants.push(data);
  sortCombatants();
  render();
}

async function addMonster(monster) {
  if (!isMaster() || !COMBAT.session) return;
  const initiative = rollDie(monster.initiative_die);
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
    action_data: { attack_die: monster.attack_die, attack_bonus: monster.attack_bonus }
  }).select("*").single();
  if (error) throw error;
  COMBAT.combatants.push(data);
  sortCombatants();
  render();
}

async function nextTurn() {
  if (!isMaster() || !COMBAT.session || !COMBAT.combatants.length) return;
  let idx = (COMBAT.session.turn_index || 0) + 1;
  let round = COMBAT.session.round_number || 1;
  if (idx >= COMBAT.combatants.length) {
    idx = 0;
    round += 1;
  }
  const { data, error } = await COMBAT.supabase.from("combat_sessions")
    .update({ turn_index: idx, round_number: round, updated_at: new Date().toISOString() })
    .eq("id", COMBAT.session.id)
    .select("*").single();
  if (error) throw error;
  COMBAT.session = data;
  render();
}

async function endCombat() {
  if (!isMaster() || !COMBAT.session) return;
  if (!window.confirm("Encerrar este combate? O histórico dos participantes será preservado.")) return;
  const { error } = await COMBAT.supabase.from("combat_sessions").update({
    is_active: false,
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", COMBAT.session.id);
  if (error) throw error;
  COMBAT.session = null;
  COMBAT.combatants = [];
  render();
}

async function adjustHp(id, delta) {
  if (!isMaster()) return;
  const c = COMBAT.combatants.find((item) => item.id === id);
  if (!c) return;
  const max = Number(c.hp_max ?? 9999);
  const next = Math.max(0, Math.min(max, Number(c.hp_current ?? 0) + delta));
  const defeated = next <= 0;
  const { data, error } = await COMBAT.supabase.from("combatants")
    .update({ hp_current: next, is_defeated: defeated, updated_at: new Date().toISOString() })
    .eq("id", id).select("*").single();
  if (error) throw error;
  Object.assign(c, data);
  render();
}

async function openCharacterPicker() {
  const chars = await getCharacters();
  const index = window.prompt("Escolha o personagem:\n" + chars.map((c, i) => (i + 1) + " - " + c.name).join("\n"));
  const pick = chars[Number(index) - 1];
  if (pick) await addCharacter(pick);
}

async function openMonsterPicker() {
  if (!COMBAT.monsters.length) await loadMonsters();
  const index = window.prompt("Escolha o monstro:\n" + COMBAT.monsters.map((m, i) => (i + 1) + " - " + m.name + " [" + m.threat + "]").join("\n"));
  const pick = COMBAT.monsters[Number(index) - 1];
  if (pick) await addMonster(pick);
}

function render() {
  const root = $("campaign-combat-content");
  if (!root) return;

  if (!COMBAT.session) {
    root.innerHTML = '<div class="combat-empty"><div class="combat-empty__icon">⚔</div><h2>Nenhum combate ativo</h2><p>Inicie um encontro e monte a iniciativa da batalha.</p>' +
      (isMaster() ? '<button class="campaign-button campaign-button--primary" id="combat-start">Iniciar combate</button>' : '') +
      '</div>';
    root.querySelector("#combat-start")?.addEventListener("click", () => startCombat().catch((e) => alert(e?.message || "Erro ao iniciar combate.")));
    return;
  }

  const current = COMBAT.combatants[COMBAT.session.turn_index] || null;
  const actions = isMaster() ? '<button class="campaign-button campaign-button--secondary" id="combat-add-char">＋ Personagem</button><button class="campaign-button campaign-button--secondary" id="combat-add-monster">＋ Monstro</button><button class="campaign-button campaign-button--primary" id="combat-next">Próximo turno</button><button class="campaign-button campaign-button--secondary" id="combat-end">Encerrar</button>' : '';

  const list = COMBAT.combatants.map((c, index) => {
    const percent = Math.max(0, Math.min(100, ((Number(c.hp_current ?? 0) / Math.max(1, Number(c.hp_max ?? 1))) * 100)));
    return '<article class="combatant ' + (index === (COMBAT.session.turn_index || 0) ? 'is-active ' : '') + (c.is_defeated ? 'is-defeated' : '') + '">' +
      '<div class="combatant__initiative">' + esc(c.initiative) + '</div>' +
      '<div class="combatant__main"><strong>' + esc(c.name) + '</strong><small>' + (c.entity_type === "monster" ? "Monstro" : "Personagem") + ' · DEF ' + esc(c.defense ?? "-") + ' · ' + esc(c.movement ?? "-") + 'm</small><div class="combat-hp"><span style="width:' + percent + '%"></span></div><small>HP ' + esc(c.hp_current ?? 0) + '/' + esc(c.hp_max ?? 0) + '</small></div>' +
      (isMaster() ? '<div class="combatant__actions"><button data-hp="-5" data-id="' + esc(c.id) + '">−5</button><button data-hp="5" data-id="' + esc(c.id) + '">+5</button></div>' : '') +
      '</article>';
  }).join("");

  root.innerHTML =
    '<div class="combat-shell">' +
      '<div class="combat-toolbar"><div><span class="campaign-panel__eyebrow">Combate ativo</span><h2>Rodada ' + esc(COMBAT.session.round_number || 1) + '</h2><p>' + (current ? 'Turno de <strong>' + esc(current.name) + '</strong>' : 'Monte a iniciativa abaixo.') + '</p></div><div class="combat-toolbar__actions">' + actions + '</div></div>' +
      '<div class="combat-grid"><section class="combat-card"><div class="combat-card__head"><h3>Iniciativa</h3><span>' + COMBAT.combatants.length + ' combatentes</span></div><div class="combat-list">' + list + '</div></section>' +
      '<section class="combat-card"><div class="combat-card__head"><h3>Regras da rodada</h3><span>AERION</span></div><div class="combat-rules"><p><b>Iniciativa:</b> 1D de Agilidade; maior resultado age primeiro.</p><p><b>Turno:</b> 1 Ação Principal + 1 Movimento + 1 Ação Rápida + 1 Reação.</p><p><b>Ataque:</b> 1D do atributo apropriado + bônus. Resultado igual ou maior que a Defesa acerta.</p><p><b>Condições:</b> ficam registradas no combatente e poderão crescer com o livro.</p></div></section></div>' +
    '</div>';

  root.querySelector("#combat-add-char")?.addEventListener("click", () => openCharacterPicker().catch((e) => alert(e?.message || "Erro ao adicionar personagem.")));
  root.querySelector("#combat-add-monster")?.addEventListener("click", () => openMonsterPicker().catch((e) => alert(e?.message || "Erro ao adicionar monstro.")));
  root.querySelector("#combat-next")?.addEventListener("click", () => nextTurn().catch((e) => alert(e?.message || "Erro ao avançar o turno.")));
  root.querySelector("#combat-end")?.addEventListener("click", () => endCombat().catch((e) => alert(e?.message || "Erro ao encerrar combate.")));
  root.querySelectorAll("[data-hp]").forEach((button) => {
    button.addEventListener("click", () => adjustHp(button.dataset.id, Number(button.dataset.hp)).catch((e) => alert(e?.message || "Erro ao alterar HP.")));
  });
}

async function init() {
  if (COMBAT.initialized) return;
  await refreshContext();
  if (!COMBAT.supabase || !COMBAT.campaignId || !COMBAT.user) return;
  await loadMonsters();
  await loadActiveCombat();
  render();
  COMBAT.initialized = true;
}

window.addEventListener("aeriom:campaigntabchange", (event) => {
  if (event.detail?.tab === "combat") init().catch((e) => console.warn("[AERION][COMBAT]", e));
});
window.addEventListener("aeriom:campaignready", () => init().catch((e) => console.warn("[AERION][COMBAT]", e)));
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init().catch(() => {}), { once: true });
else init().catch(() => {});
