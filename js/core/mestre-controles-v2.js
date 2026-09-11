import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const MANA = [
    ["azul", "Azul", "🔵"],
    ["roxa", "Roxa", "🟣"],
    ["dourada", "Dourada", "🟡"],
    ["branca", "Branca", "⚪"]
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
    ["forca", "Força"], ["agilidade", "Agilidade"], ["percepcao", "Percepção"], ["vigor", "Vigor"],
    ["intelecto", "Intelecto"], ["presenca", "Presença"], ["controle", "Controle"], ["precisao", "Precisão"]
  ];

  let sb = null;
  let channel = null;
  let started = false;
  let managerRoot = null;

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function styles() {
    if ($("aeriom-master-v2-style")) return;
    const s = document.createElement("style");
    s.id = "aeriom-master-v2-style";
    s.textContent = `
      .aeriom-master-v2-card{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
      .aeriom-master-v2-list{display:grid;gap:6px}
      .aeriom-master-v2-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;padding:8px;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:rgba(255,255,255,.012)}
      .aeriom-master-v2-main{min-width:0}.aeriom-master-v2-main strong{display:block;font:500 11px Cinzel,serif;color:#eee}.aeriom-master-v2-main small{display:block;margin-top:2px;color:rgba(255,255,255,.38);font-size:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .aeriom-master-v2-meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.aeriom-master-v2-chip{padding:3px 6px;border:1px solid rgba(255,255,255,.06);border-radius:999px;color:rgba(255,255,255,.52);font-size:6px}.aeriom-master-v2-chip.on{border-color:rgba(216,182,95,.25);color:#e6c66f}
      .aeriom-master-v2-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.aeriom-master-v2-actions button{min-height:29px;padding:0 8px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.02);color:rgba(255,255,255,.65);font-size:7px;font-weight:800;cursor:pointer}.aeriom-master-v2-actions .primary{border-color:rgba(216,182,95,.24);color:#e6c66f}
      .aeriom-master-v2-mana{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.aeriom-master-v2-mana button{min-height:27px;border:1px solid rgba(255,255,255,.06);border-radius:8px;background:rgba(255,255,255,.01);color:rgba(255,255,255,.48);font-size:6px;cursor:pointer}.aeriom-master-v2-mana button.is-unlocked{border-color:rgba(216,182,95,.24);color:#e6c66f;background:rgba(216,182,95,.04)}.aeriom-master-v2-mana button.is-selected{box-shadow:inset 0 -2px 0 #d8b65f}
      .aeriom-master-v2-modal{position:fixed;inset:0;z-index:7800;display:none;align-items:flex-end;justify-content:center;padding:10px;background:rgba(0,0,0,.74);backdrop-filter:blur(10px)}.aeriom-master-v2-modal.open{display:flex}.aeriom-master-v2-dialog{width:min(920px,100%);max-height:92dvh;overflow:auto;border:1px solid rgba(216,182,95,.18);border-radius:18px 18px 10px 10px;background:#0d0c0a}
      .aeriom-master-v2-head{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(13,12,10,.98)}.aeriom-master-v2-head h3{margin:3px 0 0;font:500 20px Cinzel,serif;color:#eee}.aeriom-master-v2-sub{font-size:7px;color:rgba(255,255,255,.38)}
      .aeriom-master-v2-body{display:grid;gap:9px;padding:12px}.aeriom-master-v2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.aeriom-master-v2-group{padding:9px;border:1px solid rgba(255,255,255,.06);border-radius:11px}.aeriom-master-v2-group h4{margin:0 0 7px;color:#e6c66f;font:500 11px Cinzel,serif}.aeriom-master-v2-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.aeriom-master-v2-field{display:grid;gap:3px}.aeriom-master-v2-field span{font-size:6px;color:rgba(255,255,255,.36);text-transform:uppercase;letter-spacing:.08em}.aeriom-master-v2-field input,.aeriom-master-v2-field textarea{width:100%;box-sizing:border-box;min-height:31px;padding:6px 7px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#11100e;color:#eee;font-size:9px}.aeriom-master-v2-field textarea{min-height:60px;resize:vertical}
      .aeriom-master-v2-mana-editor{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.aeriom-master-v2-mana-editor button{min-height:43px;border:1px solid rgba(255,255,255,.06);border-radius:9px;background:rgba(255,255,255,.01);color:rgba(255,255,255,.5);font-size:7px;cursor:pointer}.aeriom-master-v2-mana-editor button.is-unlocked{border-color:rgba(216,182,95,.25);color:#e6c66f}.aeriom-master-v2-mana-editor button.is-selected{box-shadow:inset 0 -2px 0 #d8b65f;background:rgba(216,182,95,.05)}
      .aeriom-master-v2-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.aeriom-master-v2-check{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:7px 8px;border:1px solid rgba(255,255,255,.06);border-radius:8px;color:rgba(255,255,255,.55);font-size:7px}.aeriom-master-v2-check input{accent-color:#d8b65f}.aeriom-master-v2-foot{display:flex;justify-content:flex-end;gap:6px}
      @media(max-width:700px){.aeriom-master-v2-grid{grid-template-columns:1fr}.aeriom-master-v2-checks{grid-template-columns:1fr}.aeriom-master-v2-mana-editor{grid-template-columns:repeat(2,minmax(0,1fr))}.aeriom-master-v2-mana{grid-template-columns:repeat(2,minmax(0,1fr))}.aeriom-master-v2-row{grid-template-columns:1fr}.aeriom-master-v2-actions{justify-content:stretch}.aeriom-master-v2-actions button{flex:1}}
    `;
    document.head.appendChild(s);
  }

  async function loadItems() {
    const campaign = campaignId();
    if (!campaign || !sb) return [];
    const chars = await sb.from("campaign_characters")
      .select("character_id,is_present,characters(id,user_id,name,race,class,hp_current,hp_max,mana_current,mana_max,xp_total,attributes,conditions,defense,initiative,movement,status)")
      .eq("campaign_id", campaign)
      .eq("is_present", true);
    if (chars.error) throw chars.error;
    const settings = await sb.from("campaign_character_settings")
      .select("character_id,unlocked_manas,selected_mana,permission_overrides,attribute_overrides,skill_overrides,technique_overrides,inventory_overrides,equipment_overrides")
      .eq("campaign_id", campaign);
    if (settings.error) throw settings.error;
    const byId = new Map((settings.data || []).map(x => [x.character_id, x]));
    return (chars.data || []).map(x => ({ character:x.characters, settings:byId.get(x.character_id) || { unlocked_manas:["azul"], selected_mana:"azul", permission_overrides:{} } })).filter(x => x.character);
  }

  function cardForHeading(root, label) {
    const wanted = label.toLowerCase();
    return [...root.querySelectorAll(".aeriom-master-card")].find(card => (card.querySelector("h3")?.textContent || "").trim().toLowerCase().includes(wanted)) || null;
  }

  function repairStructure(root) {
    root.classList.add("aeriom-master-compact");
    const duplicateLists = [...root.querySelectorAll("[id='aeriom-master-content']")];
    for (let i=1;i<duplicateLists.length;i++) duplicateLists[i].closest(".aeriom-master-card")?.remove();
    root.querySelectorAll("#aeriom-master-characters").forEach(el => el.style.display = "none");

    const manaCard = cardForHeading(root, "mana da campanha");
    if (manaCard) {
      manaCard.querySelector("h3").textContent = "Mana por aventureiro";
      manaCard.querySelector("p")?.remove();
      manaCard.querySelector(".aeriom-mana-campaign-grid")?.remove();
      if (!manaCard.querySelector("[data-v2-mana-host]")) {
        const host = document.createElement("div"); host.dataset.v2ManaHost = "1"; host.className = "aeriom-master-v2-list"; host.innerHTML = '<div class="aeriom-master-empty">Carregando…</div>'; manaCard.appendChild(host);
      }
    }

    let charCard = cardForHeading(root, "controle das fichas");
    if (!charCard) return;
    if (!charCard.querySelector("[data-v2-sheet-host]")) {
      const host = document.createElement("div");
      host.dataset.v2SheetHost = "1";
      host.className = "aeriom-master-v2-card";
      host.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><strong style="font:500 12px Cinzel,serif;color:#e6c66f">Aventureiros</strong><small style="font-size:6px;color:rgba(255,255,255,.32)">Editar ficha, Mana e permissões</small></div><div class="aeriom-master-v2-list" data-v2-sheet-host></div>';
      charCard.appendChild(host);
    }
  }

  function manaMarkup(item) {
    const unlocked = new Set(Array.isArray(item.settings?.unlocked_manas) ? item.settings.unlocked_manas : ["azul"]);
    const selected = item.settings?.selected_mana || "azul";
    return MANA.map(([id,label,icon]) => `<button type="button" data-v2-mana="${id}" class="${unlocked.has(id)?"is-unlocked":""} ${selected===id?"is-selected":""}" title="${unlocked.has(id)?"Selecionar":"Liberar"} ${label}">${icon} ${label}</button>`).join("");
  }

  function render(items) {
    const root = document.querySelector("[data-v2-sheet-host]");
    const mana = document.querySelector("[data-v2-mana-host]");
    if (root) root.replaceChildren();
    if (mana) mana.replaceChildren();
    if (!items.length) {
      const empty = '<div class="aeriom-master-empty">Nenhum aventureiro presente.</div>';
      if (root) root.innerHTML = empty;
      if (mana) mana.innerHTML = empty;
      return;
    }
    items.forEach(item => {
      const c = item.character;
      const row = document.createElement("article");
      row.className = "aeriom-master-v2-row";
      row.dataset.characterId = c.id;
      const selected = item.settings?.selected_mana || "azul";
      row.innerHTML = `<div class="aeriom-master-v2-main"><strong>${esc(c.name || "Aventureiro")}</strong><small>${esc([c.race,c.class].filter(Boolean).join(" · ") || "Personagem")}</small><div class="aeriom-master-v2-meta"><span class="aeriom-master-v2-chip">HP ${num(c.hp_current)} / ${num(c.hp_max)}</span><span class="aeriom-master-v2-chip">Mana ${num(c.mana_current)} / ${num(c.mana_max)}</span><span class="aeriom-master-v2-chip">XP ${num(c.xp_total)}</span><span class="aeriom-master-v2-chip on">Ativa: ${esc(MANA.find(x=>x[0]===selected)?.[1]||"Azul")}</span></div></div><div class="aeriom-master-v2-actions"><button type="button" class="primary" data-v2-sheet>Gerenciar</button></div><div class="aeriom-master-v2-mana">${manaMarkup(item)}</div>`;
      root?.appendChild(row);

      const mrow = row.cloneNode(true);
      mrow.className = "aeriom-master-v2-row";
      mrow.querySelector(".aeriom-master-v2-actions")?.remove();
      mana?.appendChild(mrow);
    });
  }

  function modal() {
    let root = $("aeriom-master-v2-modal");
    if (root) return root;
    root = document.createElement("div"); root.id = "aeriom-master-v2-modal"; root.className = "aeriom-master-v2-modal";
    root.innerHTML = '<section class="aeriom-master-v2-dialog" role="dialog" aria-modal="true"><header class="aeriom-master-v2-head"><div><span class="campaign-panel__eyebrow">CONTROLE DO MESTRE</span><h3 data-v2-name>Gerenciar ficha</h3><div class="aeriom-master-v2-sub" data-v2-sub></div></div><button type="button" class="aeriom-master-button" data-v2-close>Fechar</button></header><div class="aeriom-master-v2-body" data-v2-body></div></section>';
    document.body.appendChild(root);
    root.addEventListener("click", e => { if (e.target === root || e.target.closest("[data-v2-close]")) root.classList.remove("open"); });
    return root;
  }

  const field = (name, label, value) => `<label class="aeriom-master-v2-field"><span>${esc(label)}</span><input name="${esc(name)}" type="number" step="1" value="${esc(value)}"></label>`;

  async function openEditor(item) {
    const c = item.character;
    const settings = item.settings || {};
    const permissions = settings.permission_overrides && typeof settings.permission_overrides === "object" ? settings.permission_overrides : {};
    const attrs = c.attributes && typeof c.attributes === "object" ? c.attributes : {};
    const conditions = Array.isArray(c.conditions) ? c.conditions.join("\n") : "";
    const unlocked = new Set(Array.isArray(settings.unlocked_manas) ? settings.unlocked_manas : ["azul"]); unlocked.add("azul");
    const selected = settings.selected_mana || "azul";
    const root = modal();
    root.querySelector("[data-v2-name]").textContent = c.name || "Aventureiro";
    root.querySelector("[data-v2-sub]").textContent = [c.race,c.class].filter(Boolean).join(" · ") || "Personagem";
    root.querySelector("[data-v2-body]").innerHTML = `<form id="aeriom-master-v2-form"><div class="aeriom-master-v2-grid">
      <section class="aeriom-master-v2-group"><h4>Estado</h4><div class="aeriom-master-v2-fields">${field("hp_current","HP atual",c.hp_current)}${field("hp_max","HP máximo",c.hp_max)}${field("mana_current","Mana atual",c.mana_current)}${field("mana_max","Mana máxima",c.mana_max)}${field("xp_total","XP",c.xp_total)}${field("defense","Defesa",c.defense)}${field("initiative","Iniciativa",c.initiative)}${field("movement","Movimento",c.movement)}</div></section>
      <section class="aeriom-master-v2-group"><h4>Atributos</h4><div class="aeriom-master-v2-fields">${ATTRS.map(([key,label])=>field(`attr_${key}`,label,attrs[key]??0)).join("")}</div></section>
      <section class="aeriom-master-v2-group"><h4>Condições</h4><label class="aeriom-master-v2-field"><span>Uma por linha</span><textarea name="conditions">${esc(conditions)}</textarea></label></section></div>
      <section class="aeriom-master-v2-group"><h4>Mana liberada</h4><div class="aeriom-master-v2-mana-editor">${MANA.map(([id,label,icon])=>`<button type="button" data-editor-mana="${id}" class="${unlocked.has(id)?"is-unlocked":""} ${selected===id?"is-selected":""}">${icon}<br>${esc(label)}</button>`).join("")}</div><small style="display:block;margin-top:5px;color:rgba(255,255,255,.35);font-size:6px">Bloqueada = clique para liberar. Liberada = clique para escolher.</small></section>
      <section class="aeriom-master-v2-group"><h4>Permissões do jogador</h4><div class="aeriom-master-v2-checks">${PERMS.map(([key,label])=>`<label class="aeriom-master-v2-check"><span>${esc(label)}</span><input type="checkbox" name="perm_${key}" ${permissions[key]!==false?"checked":""}></label>`).join("")}</div></section>
      <div class="aeriom-master-v2-foot"><a class="aeriom-master-button" href="./ficha.html?id=${encodeURIComponent(c.id)}&campaign=${encodeURIComponent(campaignId())}" target="_blank" rel="noopener">Abrir ficha completa</a><button type="button" class="aeriom-master-button" data-v2-close>Cancelar</button><button type="submit" class="aeriom-master-button aeriom-master-button--primary">Salvar</button></div>
      </form>`;
    const form = $("aeriom-master-v2-form");
    const manaState = { unlocked, selected };
    form.querySelectorAll("[data-editor-mana]").forEach(button => button.addEventListener("click", () => { const id = button.dataset.editorMana; if (!manaState.unlocked.has(id)) manaState.unlocked.add(id); else manaState.selected = id; manaState.unlocked.add("azul"); form.querySelectorAll("[data-editor-mana]").forEach(b => { const bid=b.dataset.editorMana; b.classList.toggle("is-unlocked",manaState.unlocked.has(bid)); b.classList.toggle("is-selected",manaState.selected===bid); }); }));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const nextAttrs = { ...attrs }; ATTRS.forEach(([key]) => nextAttrs[key] = num(fd.get(`attr_${key}`),0));
      const nextPerms = {}; PERMS.forEach(([key]) => nextPerms[key] = fd.get(`perm_${key}`) === "on");
      const nextConditions = String(fd.get("conditions")||"").split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
      const update = { hp_current:Math.max(0,num(fd.get("hp_current"),0)), hp_max:Math.max(0,num(fd.get("hp_max"),0)), mana_current:Math.max(0,num(fd.get("mana_current"),0)), mana_max:Math.max(0,num(fd.get("mana_max"),0)), xp_total:Math.max(0,num(fd.get("xp_total"),0)), defense:num(fd.get("defense"),10), initiative:num(fd.get("initiative"),0), movement:num(fd.get("movement"),0), attributes:nextAttrs, conditions:nextConditions };
      const campaign = campaignId();
      const updateResult = await sb.from("characters").update(update).eq("id",c.id).eq("campaign_id",campaign);
      if (updateResult.error) throw updateResult.error;
      const settingsResult = await sb.from("campaign_character_settings").upsert({ campaign_id:campaign, character_id:c.id, unlocked_manas:[...manaState.unlocked], selected_mana:manaState.selected, permission_overrides:nextPerms }, { onConflict:"campaign_id,character_id" });
      if (settingsResult.error) throw settingsResult.error;
      root.classList.remove("open"); toast("Ficha atualizada pelo Mestre.","success"); await refresh();
    });
    root.classList.add("open");
  }

  async function setMana(characterId, id) {
    const items = await loadItems();
    const item = items.find(x => x.character.id === characterId);
    if (!item) return;
    const unlocked = new Set(Array.isArray(item.settings?.unlocked_manas) ? item.settings.unlocked_manas : ["azul"]);
    let selected = item.settings?.selected_mana || "azul";
    if (!unlocked.has(id)) unlocked.add(id); else selected = id;
    unlocked.add("azul");
    const result = await sb.from("campaign_character_settings").upsert({ campaign_id:campaignId(), character_id:characterId, unlocked_manas:[...unlocked], selected_mana:selected }, { onConflict:"campaign_id,character_id" });
    if (result.error) throw result.error;
    toast(`${MANA.find(x=>x[0]===selected)?.[1] || "Mana"} definida para ${item.character.name}.`,"success");
    await refresh();
  }

  async function refresh() {
    if (!isMaster() || !sb) return;
    const items = await loadItems();
    render(items);
  }

  function bind(root) {
    if (root.dataset.v2Bound === "1") return;
    root.dataset.v2Bound = "1";
    root.addEventListener("click", async e => {
      const targetMana = e.target.closest("[data-v2-mana]");
      if (targetMana) {
        const row = targetMana.closest("[data-character-id]"); if (!row) return;
        setMana(row.dataset.characterId, targetMana.dataset.v2Mana).catch(err => toast(err?.message || "Não foi possível atualizar Mana.","error")); return;
      }
      const sheet = e.target.closest("[data-v2-sheet]");
      if (sheet) {
        const row = sheet.closest("[data-character-id]"); if (!row) return;
        const items = await loadItems(); const item = items.find(x => x.character.id === row.dataset.characterId); if (item) openEditor(item).catch(err => toast(err?.message || "Não foi possível abrir a ficha.","error"));
      }
    });
  }

  async function start() {
    if (!isMaster()) return;
    styles();
    sb = ctx()?.supabase || sb || await getSupabase();
    const root = $("aeriom-master-controls-root");
    if (!root) return;
    repairStructure(root);
    managerRoot = root;
    bind(root);
    await refresh();
    if (!channel && campaignId()) {
      channel = sb.channel(`master-sheet-v2:${campaignId()}`)
        .on("postgres_changes", { event:"*", schema:"public", table:"campaign_character_settings", filter:`campaign_id=eq.${campaignId()}` }, () => refresh().catch(()=>{}))
        .on("postgres_changes", { event:"UPDATE", schema:"public", table:"characters", filter:`campaign_id=eq.${campaignId()}` }, () => refresh().catch(()=>{}))
        .subscribe();
    }
    if (!observer) {
      const observer = new MutationObserver(() => { if (managerRoot?.isConnected) repairStructure(managerRoot); });
      observer.observe(root, { childList:true, subtree:true });
    }
    started = true;
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(() => start().catch(err => console.error("[AERIOM][MASTER V2]",err)), 180));
  window.addEventListener("aeriom:campaigntabchange", e => { if (e.detail?.tab === "master-controls") setTimeout(() => start().catch(()=>{}), 80); });
  window.addEventListener("aerion:campaign:characters:changed", () => refresh().catch(()=>{}));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(() => start().catch(()=>{}), 300), {once:true}); else setTimeout(() => start().catch(()=>{}), 300);
})();
