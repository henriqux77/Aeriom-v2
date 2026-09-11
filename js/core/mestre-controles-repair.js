import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const MANA = [
    ["azul", "Azul", "Mana comum / normal", "🔵"],
    ["roxa", "Roxa", "Mana Negra", "🟣"],
    ["dourada", "Dourada", "Mana Boa", "🟡"],
    ["branca", "Branca", "Mana Perfeita", "⚪"]
  ];

  const PERMS = [
    ["edit_concept", "Conceito e identidade"],
    ["edit_appearance", "Aparência"],
    ["edit_attributes", "Atributos"],
    ["edit_skills", "Perícias"],
    ["edit_powers", "Poder e Mana"],
    ["edit_techniques", "Técnicas"],
    ["edit_inventory", "Inventário"],
    ["edit_equipment", "Equipamentos"]
  ];

  const ATTRS = [
    ["forca", "Força"],
    ["agilidade", "Agilidade"],
    ["percepcao", "Percepção"],
    ["vigor", "Vigor"],
    ["intelecto", "Intelecto"],
    ["presenca", "Presença"],
    ["controle", "Controle"],
    ["precisao", "Precisão"]
  ];

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const cid = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const master = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  let sb = null;
  let started = false;
  let observer = null;
  let channel = null;

  function injectStyles() {
    if ($("aeriom-master-repair-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-master-repair-style";
    style.textContent = `
      .aeriom-master-grid{grid-template-columns:1fr!important;gap:10px!important}
      .aeriom-master-card{padding:11px 12px!important;border-radius:13px!important;box-shadow:none!important}
      .aeriom-master-card__head{margin-bottom:7px!important;align-items:center!important}
      .aeriom-master-card__head p{display:none!important}
      .aeriom-master-card h3{font-size:16px!important;margin:0!important}
      .aeriom-master-badge{min-height:21px!important;font-size:6px!important}
      .aeriom-master-form{gap:7px!important}
      .aeriom-master-row{gap:7px!important}
      .aeriom-master-field>span{font-size:6px!important}
      .aeriom-master-field input,.aeriom-master-field textarea,.aeriom-master-field select{min-height:36px!important;padding:7px 8px!important;border-radius:9px!important;font-size:10px!important}
      .aeriom-master-field textarea{min-height:64px!important}
      .aeriom-master-button{min-height:34px!important;font-size:7px!important;padding:0 9px!important}
      .aeriom-master-upload{padding:8px!important}
      .aeriom-master-upload-preview{min-height:74px!important}
      .aeriom-master-upload-preview img{height:90px!important}
      .aeriom-quick-actions{margin-top:6px!important;gap:5px!important}
      .aeriom-quick-actions .aeriom-master-button{min-height:32px!important}
      .aeriom-legacy-master-hidden{display:none!important}
      .aeriom-master-repair-list{display:grid;gap:6px}
      .aeriom-master-repair-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;padding:8px;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:rgba(255,255,255,.012)}
      .aeriom-master-repair-main{min-width:0}
      .aeriom-master-repair-main strong{display:block;color:rgba(255,255,255,.88);font:500 11px Cinzel,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-master-repair-main small{display:block;margin-top:2px;color:rgba(255,255,255,.36);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-master-repair-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
      .aeriom-master-repair-chip{display:inline-flex;align-items:center;min-height:20px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;color:rgba(255,255,255,.55);font-size:6px}
      .aeriom-master-repair-chip.is-on{border-color:rgba(216,182,95,.28);color:#e6c66f;background:rgba(216,182,95,.05)}
      .aeriom-master-repair-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .aeriom-master-repair-actions button{min-height:29px;padding:0 8px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.02);color:rgba(255,255,255,.67);font-size:7px;font-weight:800;cursor:pointer}
      .aeriom-master-repair-actions button.primary{border-color:rgba(216,182,95,.23);color:#e6c66f}
      .aeriom-master-repair-mana{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:7px}
      .aeriom-master-repair-mana button{min-height:28px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.015);color:rgba(255,255,255,.54);font-size:6px;cursor:pointer}
      .aeriom-master-repair-mana button.is-unlocked{border-color:rgba(216,182,95,.26);color:#e6c66f;background:rgba(216,182,95,.05)}
      .aeriom-master-repair-mana button.is-selected{box-shadow:inset 0 -2px 0 #d8b65f}
      .aeriom-master-repair-section{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
      .aeriom-master-sheet-modal{position:fixed;inset:0;z-index:7600;display:none;align-items:flex-end;justify-content:center;padding:10px;background:rgba(0,0,0,.72);backdrop-filter:blur(9px)}
      .aeriom-master-sheet-modal.is-open{display:flex}
      .aeriom-master-sheet{width:min(900px,100%);max-height:92dvh;overflow:auto;border:1px solid rgba(216,182,95,.18);border-radius:17px 17px 10px 10px;background:#0d0c0a;box-shadow:0 30px 100px rgba(0,0,0,.5)}
      .aeriom-master-sheet__head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(13,12,10,.97);backdrop-filter:blur(14px)}
      .aeriom-master-sheet__head h3{margin:2px 0 0;font:500 20px Cinzel,serif;color:#eee8dc}
      .aeriom-master-sheet__sub{color:rgba(255,255,255,.4);font-size:7px;margin-top:2px}
      .aeriom-master-sheet__body{display:grid;gap:10px;padding:12px}
      .aeriom-master-sheet__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      .aeriom-master-sheet__group{padding:9px;border:1px solid rgba(255,255,255,.06);border-radius:11px;background:rgba(255,255,255,.012)}
      .aeriom-master-sheet__group h4{margin:0 0 7px;color:#e6c66f;font:500 11px Cinzel,serif}
      .aeriom-master-sheet__inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      .aeriom-master-sheet__field{display:grid;gap:3px}
      .aeriom-master-sheet__field span{font-size:6px;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.1em}
      .aeriom-master-sheet__field input,.aeriom-master-sheet__field textarea{width:100%;box-sizing:border-box;min-height:31px;padding:6px 7px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#11100e;color:#eee;font-size:9px;outline:none}
      .aeriom-master-sheet__field textarea{min-height:64px;resize:vertical}
      .aeriom-master-sheet__mana{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
      .aeriom-master-sheet__mana button{min-height:43px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.015);color:rgba(255,255,255,.55);font-size:7px;cursor:pointer}
      .aeriom-master-sheet__mana button.is-unlocked{border-color:rgba(216,182,95,.26);color:#e6c66f}
      .aeriom-master-sheet__mana button.is-selected{box-shadow:inset 0 -2px 0 #d8b65f;background:rgba(216,182,95,.06)}
      .aeriom-master-sheet__checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
      .aeriom-master-sheet__check{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:7px 8px;border:1px solid rgba(255,255,255,.06);border-radius:8px;color:rgba(255,255,255,.55);font-size:7px}
      .aeriom-master-sheet__check input{accent-color:#d8b65f}
      .aeriom-master-sheet__footer{display:flex;justify-content:flex-end;gap:6px;padding-top:2px}
      @media(max-width:700px){
        .aeriom-master-sheet__grid{grid-template-columns:1fr}
        .aeriom-master-sheet__checks{grid-template-columns:1fr}
        .aeriom-master-sheet__mana{grid-template-columns:repeat(2,minmax(0,1fr))}
        .aeriom-master-repair-mana{grid-template-columns:repeat(2,minmax(0,1fr))}
        .aeriom-master-repair-row{grid-template-columns:1fr}
        .aeriom-master-repair-actions{justify-content:stretch}
        .aeriom-master-repair-actions button{flex:1}
      }
    `;
    document.head.appendChild(style);
  }

  function findCardByHeading(root, text) {
    const wanted = text.toLowerCase();
    return [...root.querySelectorAll(".aeriom-master-card")].find(card =>
      (card.querySelector("h3")?.textContent || "").trim().toLowerCase().includes(wanted)
    ) || null;
  }

  function repairDuplicateContent(root) {
    const contentNodes = [...root.querySelectorAll("[id='aeriom-master-content']")];
    if (contentNodes.length < 2) return;
    for (let i = 1; i < contentNodes.length; i += 1) {
      const card = contentNodes[i].closest(".aeriom-master-card");
      if (card) card.remove();
    }
  }

  function compactDom(root) {
    root.classList.add("aeriom-master-compact");
    root.querySelectorAll("[id='aeriom-master-characters']").forEach(list => list.classList.add("aeriom-legacy-master-hidden"));
    const campaignCards = root.querySelectorAll(".aeriom-master-card");
    campaignCards.forEach(card => {
      const title = (card.querySelector("h3")?.textContent || "").trim().toLowerCase();
      if (title === "mana da campanha") {
        card.dataset.aeriomManaCard = "1";
        card.querySelector("h3").textContent = "Mana por aventureiro";
        card.querySelector("p")?.remove();
        const body = [...card.children].find(el => el.classList?.contains("aeriom-mana-campaign-grid"));
        if (body) body.remove();
        if (!card.querySelector("[data-aeriom-mana-manager]")) {
          const host = document.createElement("div");
          host.dataset.aeriomManaManager = "1";
          host.className = "aeriom-master-repair-list";
          host.innerHTML = '<div class="aeriom-master-empty">Carregando afinidades de mana…</div>';
          card.appendChild(host);
        }
      }
    });
  }

  async function loadCharacters() {
    const campaignId = cid();
    if (!campaignId || !sb) return [];
    const result = await sb.from("campaign_characters")
      .select("character_id,is_present,characters(id,user_id,name,race,class,hp_current,hp_max,mana_current,mana_max,xp_total,attributes,conditions,defense,initiative,movement,status,permission_overrides)")
      .eq("campaign_id", campaignId)
      .eq("is_present", true);
    if (result.error) throw result.error;
    const settings = await sb.from("campaign_character_settings")
      .select("character_id,unlocked_manas,selected_mana,permission_overrides,attribute_overrides,skill_overrides,technique_overrides,inventory_overrides,equipment_overrides")
      .eq("campaign_id", campaignId);
    if (settings.error) throw settings.error;
    const bySettings = new Map((settings.data || []).map(row => [row.character_id, row]));
    return (result.data || []).map(row => ({ link: row, character: row.characters, settings: bySettings.get(row.character_id) || { unlocked_manas: ["azul"], selected_mana: "azul", permission_overrides: {} } })).filter(row => row.character);
  }

  function manaButtons(item, mode = "row") {
    const unlocked = new Set(Array.isArray(item.settings?.unlocked_manas) ? item.settings.unlocked_manas : ["azul"]);
    const selected = item.settings?.selected_mana || "azul";
    return MANA.map(([id, label, desc, icon]) => `<button type="button" data-mana-id="${id}" data-mode="${mode}" class="${unlocked.has(id) ? "is-unlocked" : ""} ${selected === id ? "is-selected" : ""}" title="${esc(unlocked.has(id) ? `Selecionar ${label}` : `Liberar ${label}`)}">${icon} ${label}</button>`).join("");
  }

  function renderRows(container, items) {
    container.replaceChildren();
    if (!items.length) {
      container.innerHTML = '<div class="aeriom-master-empty">Nenhum aventureiro presente na mesa.</div>';
      return;
    }
    items.forEach(item => {
      const c = item.character;
      const row = document.createElement("article");
      row.className = "aeriom-master-repair-row";
      row.dataset.characterId = c.id;
      const unlocked = Array.isArray(item.settings?.unlocked_manas) ? item.settings.unlocked_manas : ["azul"];
      const selected = item.settings?.selected_mana || "azul";
      row.innerHTML = `<div class="aeriom-master-repair-main"><strong>${esc(c.name || "Aventureiro")}</strong><small>${esc([c.race,c.class].filter(Boolean).join(" · ") || "Personagem")}</small><div class="aeriom-master-repair-meta"><span class="aeriom-master-repair-chip">HP ${n(c.hp_current)} / ${n(c.hp_max)}</span><span class="aeriom-master-repair-chip">Mana ${n(c.mana_current)} / ${n(c.mana_max)}</span><span class="aeriom-master-repair-chip">XP ${n(c.xp_total)}</span><span class="aeriom-master-repair-chip is-on">Ativa: ${esc(MANA.find(m => m[0] === selected)?.[1] || "Azul")}</span></div></div><div class="aeriom-master-repair-actions"><button type="button" class="primary" data-sheet>Gerenciar ficha</button></div><div class="aeriom-master-repair-section" style="grid-column:1/-1"><div class="aeriom-master-repair-mana">${manaButtons(item)}</div><small style="display:block;margin-top:4px;color:rgba(255,255,255,.34);font-size:6px">Toque numa cor bloqueada para liberar; toque numa liberada para selecionar a ativa.</small></div>`;
      container.appendChild(row);
    });
  }

  function modal() {
    let root = $("aeriom-master-sheet-modal");
    if (root) return root;
    root = document.createElement("div");
    root.id = "aeriom-master-sheet-modal";
    root.className = "aeriom-master-sheet-modal";
    root.innerHTML = `<section class="aeriom-master-sheet" role="dialog" aria-modal="true"><header class="aeriom-master-sheet__head"><div><span class="campaign-panel__eyebrow">CONTROLE DO MESTRE</span><h3 data-sheet-name>Gerenciar ficha</h3><div class="aeriom-master-sheet__sub" data-sheet-sub></div></div><button type="button" class="aeriom-master-button" data-sheet-close>Fechar</button></header><div class="aeriom-master-sheet__body" data-sheet-body></div></section>`;
    document.body.appendChild(root);
    root.addEventListener("click", event => { if (event.target === root || event.target.closest("[data-sheet-close]")) root.classList.remove("is-open"); });
    return root;
  }

  function group(label, body) {
    return `<section class="aeriom-master-sheet__group"><h4>${esc(label)}</h4>${body}</section>`;
  }

  function field(name, label, value, type = "number") {
    return `<label class="aeriom-master-sheet__field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${type === "number" ? "step=1" : ""}></label>`;
  }

  async function openSheet(item) {
    const root = modal();
    const c = item.character;
    const currentPerms = item.settings?.permission_overrides && typeof item.settings.permission_overrides === "object" ? item.settings.permission_overrides : {};
    const unlocked = new Set(Array.isArray(item.settings?.unlocked_manas) ? item.settings.unlocked_manas : ["azul"]);
    const selected = item.settings?.selected_mana || "azul";
    const attrs = c.attributes && typeof c.attributes === "object" ? c.attributes : {};
    const body = root.querySelector("[data-sheet-body]");
    root.querySelector("[data-sheet-name]").textContent = c.name || "Aventureiro";
    root.querySelector("[data-sheet-sub]").textContent = [c.race,c.class].filter(Boolean).join(" · ") || "Personagem";
    body.innerHTML = `
      <form id="aeriom-master-sheet-form">
        <div class="aeriom-master-sheet__grid">
          ${group("Estado", `<div class="aeriom-master-sheet__inputs">${field("hp_current","HP atual",c.hp_current)}${field("hp_max","HP máximo",c.hp_max)}${field("mana_current","Mana atual",c.mana_current)}${field("mana_max","Mana máxima",c.mana_max)}${field("xp_total","XP",c.xp_total)}${field("defense","Defesa",c.defense, "number")}${field("initiative","Iniciativa",c.initiative)}${field("movement","Movimento",c.movement)}</div>`)}
          ${group("Atributos", `<div class="aeriom-master-sheet__inputs">${ATTRS.map(([key,label]) => field(`attr_${key}`, label, attrs[key] ?? 0)).join("")}</div>`)}
          ${group("Condições", `<label class="aeriom-master-sheet__field"><span>Uma por linha</span><textarea name="conditions">${esc(Array.isArray(c.conditions) ? c.conditions.join("\n") : "")}</textarea></label>`)}
        </div>
        ${group("Mana liberada para este aventureiro", `<div class="aeriom-master-sheet__mana">${MANA.map(([id,label,desc,icon]) => `<button type="button" class="${unlocked.has(id) ? "is-unlocked" : ""} ${selected === id ? "is-selected" : ""}" data-sheet-mana="${id}" title="${esc(desc)}">${icon}<br>${esc(label)}</button>`).join("")}</div><small style="display:block;margin-top:5px;color:rgba(255,255,255,.34);font-size:6px">Cor não liberada: libera. Cor liberada: torna-se a afinidade ativa.</small>`)}
        ${group("Permissões da ficha", `<div class="aeriom-master-sheet__checks">${PERMS.map(([key,label]) => `<label class="aeriom-master-sheet__check"><span>${esc(label)}</span><input type="checkbox" name="perm_${esc(key)}" ${currentPerms[key] !== false ? "checked" : ""}></label>`).join("")}</div>`)}
        <div class="aeriom-master-sheet__footer"><button type="button" class="aeriom-master-button" data-sheet-close>Cancelar</button><button type="submit" class="aeriom-master-button aeriom-master-button--primary">Salvar ficha</button></div>
      </form>`;

    const form = $("aeriom-master-sheet-form");
    const manaState = { unlocked: new Set(unlocked), selected };
    form.querySelectorAll("[data-sheet-mana]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.sheetMana;
      if (!manaState.unlocked.has(id)) manaState.unlocked.add(id);
      else manaState.selected = id;
      if (!manaState.unlocked.has("azul")) manaState.unlocked.add("azul");
      form.querySelectorAll("[data-sheet-mana]").forEach(b => {
        const bid = b.dataset.sheetMana;
        b.classList.toggle("is-unlocked", manaState.unlocked.has(bid));
        b.classList.toggle("is-selected", manaState.selected === bid);
      });
    }));

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const data = new FormData(form);
      const nextAttributes = { ...attrs };
      ATTRS.forEach(([key]) => { nextAttributes[key] = n(data.get(`attr_${key}`), 0); });
      const nextPermissions = {};
      PERMS.forEach(([key]) => { nextPermissions[key] = data.get(`perm_${key}`) === "on"; });
      const nextConditions = String(data.get("conditions") || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      const update = {
        hp_current: n(data.get("hp_current"), 0),
        hp_max: n(data.get("hp_max"), 0),
        mana_current: n(data.get("mana_current"), 0),
        mana_max: n(data.get("mana_max"), 0),
        xp_total: n(data.get("xp_total"), 0),
        defense: n(data.get("defense"), 10),
        initiative: n(data.get("initiative"), 0),
        movement: n(data.get("movement"), 0),
        attributes: nextAttributes,
        conditions: nextConditions
      };
      const result = await sb.from("characters").update(update).eq("id", c.id).eq("campaign_id", cid());
      if (result.error) throw result.error;
      const settingsUpdate = await sb.from("campaign_character_settings").upsert({
        campaign_id: cid(),
        character_id: c.id,
        unlocked_manas: [...manaState.unlocked],
        selected_mana: manaState.selected,
        permission_overrides: nextPermissions
      }, { onConflict: "campaign_id,character_id" });
      if (settingsUpdate.error) throw settingsUpdate.error;
      root.classList.remove("is-open");
      toast("Ficha do aventureiro atualizada.", "success");
      await refreshManager();
    });
    root.classList.add("is-open");
  }

  async function setMana(item, id) {
    const settings = item.settings || { unlocked_manas: ["azul"], selected_mana: "azul" };
    const unlocked = new Set(Array.isArray(settings.unlocked_manas) ? settings.unlocked_manas : ["azul"]);
    let selected = settings.selected_mana || "azul";
    if (!unlocked.has(id)) unlocked.add(id);
    else selected = id;
    unlocked.add("azul");
    const result = await sb.from("campaign_character_settings").upsert({ campaign_id: cid(), character_id: item.character.id, unlocked_manas: [...unlocked], selected_mana: selected }, { onConflict: "campaign_id,character_id" });
    if (result.error) throw result.error;
    toast(`${MANA.find(row => row[0] === selected)?.[1] || "Mana"} selecionada para ${item.character.name}.`, "success");
    await refreshManager();
  }

  async function refreshManager() {
    if (!master() || !sb) return;
    const items = await loadCharacters();
    const root = document.querySelector("#aeriom-master-controls-root");
    if (!root) return;
    const mana = root.querySelector("[data-aeriom-mana-manager]");
    if (mana) renderRows(mana, items);
    const existing = root.querySelector("[data-aeriom-sheet-manager]");
    if (existing) renderRows(existing, items);
  }

  function ensureManager(root) {
    if (!master()) return;
    repairDuplicateContent(root);
    compactDom(root);

    const charCard = findCardByHeading(root, "controle das fichas");
    if (charCard && !charCard.querySelector("[data-aeriom-sheet-manager]")) {
      const manager = document.createElement("div");
      manager.dataset.aeriomSheetManager = "1";
      manager.className = "aeriom-master-repair-section";
      manager.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px"><strong style="font:500 12px Cinzel,serif;color:#e6c66f">Aventureiros da mesa</strong><small style="font-size:6px;color:rgba(255,255,255,.32)">controle direto do Mestre</small></div><div class="aeriom-master-repair-list" data-aeriom-sheet-manager></div>';
      charCard.appendChild(manager);
    }

    const media = root.querySelector("[data-aeriom-live-media-card]");
    if (media) media.classList.add("aeriom-master-compact-media");
  }

  function bindClicks(root) {
    if (root.dataset.aeriomRepairBound === "1") return;
    root.dataset.aeriomRepairBound = "1";
    root.addEventListener("click", async event => {
      const mana = event.target.closest("[data-mana-id]");
      if (mana) {
        const row = mana.closest("[data-character-id]") || mana.closest(".aeriom-master-repair-row");
        const characterId = row?.dataset.characterId;
        const item = (await loadCharacters()).find(x => x.character.id === characterId);
        if (item) setMana(item, mana.dataset.manaId).catch(error => toast(error?.message || "Não foi possível atualizar a Mana.", "error"));
        return;
      }
      const sheet = event.target.closest("[data-sheet]");
      if (sheet) {
        const row = sheet.closest("[data-character-id]") || sheet.closest(".aeriom-master-repair-row");
        const characterId = row?.dataset.characterId;
        const item = (await loadCharacters()).find(x => x.character.id === characterId);
        if (item) openSheet(item).catch(error => toast(error?.message || "Não foi possível abrir a ficha.", "error"));
      }
    });
  }

  async function start() {
    if (started) return;
    started = true;
    if (!master()) return;
    injectStyles();
    sb = ctx()?.supabase || await getSupabase();
    const root = $("aeriom-master-controls-root");
    if (!root) return;
    ensureManager(root);
    bindClicks(root);
    await refreshManager();
    if (!channel && cid()) {
      channel = sb.channel(`master-controls:${cid()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "campaign_character_settings", filter: `campaign_id=eq.${cid()}` }, () => refreshManager().catch(() => {}))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "characters", filter: `campaign_id=eq.${cid()}` }, () => refreshManager().catch(() => {}))
        .subscribe();
    }
    observer = new MutationObserver(() => ensureManager(root));
    observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(() => start().catch(error => console.error("[AERIOM][MASTER REPAIR]", error)), 120));
  window.addEventListener("aeriom:campaigntabchange", event => {
    if (event.detail?.tab === "master-controls") setTimeout(() => start().catch(() => {}), 60);
  });
  window.addEventListener("aerion:campaign:characters:changed", () => refreshManager().catch(() => {}));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(() => start().catch(() => {}), 250), { once: true });
  else setTimeout(() => start().catch(() => {}), 250);
})();
