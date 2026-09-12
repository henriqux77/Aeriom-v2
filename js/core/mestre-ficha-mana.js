import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  if (window.__AERIOM_MESTRE_FICHA_MANA__) return;
  window.__AERIOM_MESTRE_FICHA_MANA__ = true;

  const MANA = [
    ["azul", "Azul", "#5d9de0", "🔵"],
    ["roxa", "Roxa", "#a978e1", "🟣"],
    ["dourada", "Dourada", "#e4be5f", "🟡"],
    ["branca", "Branca", "#eeeeee", "⚪"]
  ];
  const STYLE_ID = "aeriom-master-ficha-mana-style";
  let sb = null;
  let bound = false;

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const cid = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;
  const master = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const toast = (message, type = "info") => window.dispatchEvent(new CustomEvent("aerion:toast", { detail: { message, type } }));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function installStyle() {
    if ($(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .aeriom-ficha-mana-section{margin-top:10px;padding:11px;border:1px solid rgba(216,182,95,.13);border-radius:12px;background:linear-gradient(145deg,rgba(216,182,95,.035),rgba(255,255,255,.012))}
      .aeriom-ficha-mana-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
      .aeriom-ficha-mana-head h4{margin:0;color:#e8c975;font:500 13px Cinzel,serif}
      .aeriom-ficha-mana-head p{margin:3px 0 0;color:rgba(255,255,255,.38);font-size:7px;line-height:1.4}
      .aeriom-ficha-mana-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .aeriom-ficha-mana-button{min-height:52px;display:grid;place-items:center;gap:2px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.015);color:rgba(255,255,255,.55);cursor:pointer;transition:.16s ease}
      .aeriom-ficha-mana-button:hover{transform:translateY(-1px);border-color:rgba(216,182,95,.28);color:#eee}
      .aeriom-ficha-mana-button.is-unlocked{border-color:color-mix(in srgb,var(--mana-color) 40%,transparent);color:rgba(255,255,255,.84);background:color-mix(in srgb,var(--mana-color) 7%,transparent)}
      .aeriom-ficha-mana-button.is-selected{box-shadow:inset 0 -2px 0 var(--mana-color),0 0 18px color-mix(in srgb,var(--mana-color) 12%,transparent)}
      .aeriom-ficha-mana-icon{font-size:16px;line-height:1}
      .aeriom-ficha-mana-label{font-size:7px;font-weight:900}
      .aeriom-ficha-mana-state{font-size:6px;color:rgba(255,255,255,.32)}
      @media(max-width:700px){.aeriom-ficha-mana-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  async function getCharacters() {
    sb = sb || await getSupabase();
    const campaign = cid();
    if (!campaign) return [];
    const result = await sb.from("campaign_characters").select("character_id,characters(id,name,race,class)").eq("campaign_id", campaign).eq("is_present", true);
    if (result.error) throw result.error;
    const settings = await sb.from("campaign_character_settings").select("character_id,unlocked_manas,selected_mana").eq("campaign_id", campaign);
    if (settings.error) throw settings.error;
    const byId = new Map((settings.data || []).map(row => [String(row.character_id), row]));
    return (result.data || []).map(row => ({ character: row.characters, settings: byId.get(String(row.character_id)) || { unlocked_manas:["azul"], selected_mana:"azul" } })).filter(x => x.character);
  }

  function modalRoots() {
    return [$("aeriom-master-sheet-modal"), $("aeriom-master-v2-modal")].filter(Boolean);
  }

  function modalBody(modal) {
    return modal.querySelector("[data-sheet-body], [data-v2-body]");
  }

  function modalName(modal) {
    return String(modal.querySelector("[data-sheet-name], [data-v2-name]")?.textContent || "").trim();
  }

  async function saveMana(characterId, unlocked, selected, button) {
    try {
      sb = sb || await getSupabase();
      const campaign = cid();
      const result = await sb.from("campaign_character_settings").upsert({
        campaign_id: campaign,
        character_id: characterId,
        unlocked_manas: [...unlocked],
        selected_mana: selected
      }, { onConflict:"campaign_id,character_id" });
      if (result.error) throw result.error;
      toast("Mana da ficha atualizada.", "success");
      button?.animate([{transform:"scale(.96)"},{transform:"scale(1)"}], {duration:160});
    } catch (error) {
      toast(error?.message || "Não foi possível atualizar a Mana.", "error");
    }
  }

  function render(section, item) {
    const unlocked = new Set(Array.isArray(item.settings?.unlocked_manas) ? item.settings.unlocked_manas : ["azul"]);
    unlocked.add("azul");
    let selected = item.settings?.selected_mana || "azul";
    section.innerHTML = `<div class="aeriom-ficha-mana-head"><div><h4>Cor da Mana</h4><p>Liberte as cores permitidas para esta ficha. Depois selecione a afinidade ativa.</p></div></div><div class="aeriom-ficha-mana-grid">${MANA.map(([id,label,color,icon]) => `<button type="button" class="aeriom-ficha-mana-button ${unlocked.has(id)?"is-unlocked":""} ${selected===id?"is-selected":""}" data-ficha-mana="${id}" style="--mana-color:${color}"><span class="aeriom-ficha-mana-icon">${icon}</span><span class="aeriom-ficha-mana-label">${esc(label)}</span><span class="aeriom-ficha-mana-state">${selected===id?"ATIVA":unlocked.has(id)?"LIBERADA":"BLOQUEADA"}</span></button>`).join("")}</div>`;
    section.querySelectorAll("[data-ficha-mana]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.fichaMana;
        if (!unlocked.has(id)) unlocked.add(id);
        else selected = id;
        unlocked.add("azul");
        section.querySelectorAll("[data-ficha-mana]").forEach(btn => {
          const bid = btn.dataset.fichaMana;
          btn.classList.toggle("is-unlocked", unlocked.has(bid));
          btn.classList.toggle("is-selected", selected === bid);
          const state = btn.querySelector(".aeriom-ficha-mana-state");
          if (state) state.textContent = selected === bid ? "ATIVA" : unlocked.has(bid) ? "LIBERADA" : "BLOQUEADA";
        });
        void saveMana(item.character.id, unlocked, selected, button);
      });
    });
  }

  async function enhanceOpenModal() {
    if (!master()) return;
    const modal = modalRoots().find(root => root.classList.contains("is-open") || root.classList.contains("open"));
    if (!modal) return;
    const body = modalBody(modal);
    const name = modalName(modal);
    if (!body || !name || body.querySelector(".aeriom-ficha-mana-section")) return;
    try {
      const items = await getCharacters();
      const item = items.find(x => String(x.character.name || "").trim().toLowerCase() === name.toLowerCase());
      if (!item) return;
      const section = document.createElement("section");
      section.className = "aeriom-ficha-mana-section";
      body.appendChild(section);
      render(section, item);
    } catch (error) {
      console.warn("[AERIOM][FICHA MANA]", error);
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", event => {
      const button = event.target.closest("button, a");
      if (!button) return;
      const label = String(button.textContent || "").trim().toLowerCase();
      if (!label.includes("gerenciar")) return;
      window.setTimeout(() => void enhanceOpenModal(), 120);
    }, false);
    window.addEventListener("aeriom:master:refresh", () => window.setTimeout(() => void enhanceOpenModal(), 100));
    window.addEventListener("aeriom:campaigntabchange", event => {
      if (event.detail?.tab === "master-controls") window.setTimeout(() => void enhanceOpenModal(), 250);
    });
  }

  function start() {
    installStyle();
    bind();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
