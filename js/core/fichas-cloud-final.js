import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  /*
   * AERION — persistência da ficha
   *
   * Usa o estado já mantido pelo ficha.js.
   * Não substitui ficha.js nem ficha-render.js.
   *
   * Regras:
   * - cada ficha nova recebe um UUID próprio;
   * - o autosave cria a ficha como draft/incompleta;
   * - a ficha continua disponível em Minhas Fichas;
   * - o botão "Salvar e finalizar" transforma o mesmo registro em completed;
   * - os tipos JSON respeitam os CHECKs reais do Supabase.
   */

  const TABLE = "characters";
  let supabase = null;
  let user = null;
  let characterId = null;
  let started = false;
  let saving = false;
  let timer = null;

  const $ = (id) => document.getElementById(id);

  function text(v) {
    return String(v ?? "").trim();
  }

  function num(v, fallback=0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function arr(v) {
    if (Array.isArray(v)) return v.slice();
    if (v == null || v === "") return [];
    return [String(v)];
  }

  function obj(v) {
    return v && typeof v === "object" && !Array.isArray(v)
      ? structuredClone(v)
      : {};
  }

  function urlParams() {
    return new URLSearchParams(location.search);
  }

  function editorMode() {
    const p=urlParams();
    return p.get("new")==="1" || Boolean(p.get("id")) || Boolean(p.get("draft"));
  }

  function toast(message,type="warning") {
    window.dispatchEvent(new CustomEvent("aerion:toast",{
      detail:{message,type}
    }));
  }

  function buildRow(state,status) {
    const d=obj(state.derivedStats);
    const hp=obj(state.hp);
    const mana=obj(state.mana);
    const appearance=obj(state.appearance);

    const personality=text(state.personality);
    const objective=text(state.objective);
    const fear=text(state.fear);
    const bond=text(state.importantBond);

    return {
      id: characterId,
      user_id: user.id,
      campaign_id: null,

      name: text(state.name) || "Ficha sem nome",
      age: text(state.age) ? num(state.age) : null,
      race: text(state.race) || null,
      class: text(state.class) || null,
      power: text(state.primaryPower) || null,
      origin: text(state.origin) || null,
      gender: text(state.gender) || null,
      description: text(state.description) || null,

      personality: personality ? [personality] : [],
      backstory: text(state.history) || null,
      goals: objective ? [objective] : [],
      fears: fear ? [fear] : [],
      important_bonds: bond ? [bond] : [],
      region: text(state.region) || null,

      hp_current: Math.max(0,num(hp.current,10)),
      hp_max: Math.max(0,num(hp.max,d.hpMax ?? 10)),
      mana_current: Math.max(0,num(mana.current,0)),
      mana_max: Math.max(0,num(mana.max,0)),

      attributes: obj(state.assignedDice || state.attributes),
      conditions: arr(state.conditions),
      techniques: arr(state.techniques),
      inventory: arr(state.inventory),
      equipment: arr(state.equipment),

      appearance,
      avatar_path: null,

      size_category:
        ["pequeno","medio","grande","colossal"].includes(
          text(d.sizeCategory).toLowerCase()
        )
          ? text(d.sizeCategory).toLowerCase()
          : null,

      natural_profile:
        text(d.naturalProfile) || null,

      racial_modifiers:
        obj(d.racialModifiers),

      movement_profile: {
        land:num(state.movement ?? d.movement,0),
        water:d.waterMovement ?? null
      },

      racial_ability:
        text(d.racialAbility) ||
        arr(d.abilities).join(" · ") ||
        null,

      resistances:arr(d.resistances),
      senses:arr(d.senses),

      power_roll:
        state.powerRoll == null
          ? null
          : num(state.powerRoll),

      power_type:
        text(state.powerMode) || null,

      skill_modifiers:
        obj(state.skillModifiers || d.skillModifiers),

      class_bonus:
        text(state.classBonus) || null,

      defense:
        Math.max(1,num(state.defense ?? d.defense,10)),

      initiative:
        num(state.initiative,0),

      movement:
        Math.max(0,num(state.movement ?? d.movement,9)),

      status,
      creation_state:
        structuredClone(state),

      updated_at:
        new Date().toISOString()
    };
  }

  async function save(forceStatus=null) {
    const api=window.AERIONFicha || window.AERION_FICHA;
    const state=api?.getState?.();

    if (!user || !supabase || !state || !characterId || saving) {
      return false;
    }

    saving=true;

    try {
      const status = forceStatus || "draft";
      const row=buildRow(state,status);

      const {error}=await supabase
        .from(TABLE)
        .upsert(row,{onConflict:"id"});

      if (error) throw error;

      window.dispatchEvent(new CustomEvent("aerion:ficha:cloudsaved",{
        detail:{characterId,status}
      }));

      return true;
    } finally {
      saving=false;
    }
  }

  function scheduleSave() {
    clearTimeout(timer);
    timer=setTimeout(()=>{
      save("draft").catch(error=>{
        console.error("[AERION][FICHA CLOUD]",error);
      });
    },250);
  }

  function completeRequired(state) {
    const c=state.completedSteps || [];
    return [0,1,2,3,4,5].every(i=>c[i]===true);
  }

  function ensureFinalizeButton() {
    const review=document.querySelector('[data-panel="review"]');
    if (!review || $("aerion-cloud-finalize")) return;

    const wrap=document.createElement("div");
    wrap.id="aerion-cloud-finalize";
    wrap.style.cssText=[
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:12px",
      "margin-top:16px",
      "padding:14px",
      "border:1px solid rgba(216,182,95,.18)",
      "border-radius:14px",
      "background:rgba(216,182,95,.035)"
    ].join(";");

    wrap.innerHTML=`
      <div style="display:grid;gap:4px;min-width:0">
        <span class="eyebrow">FINALIZAÇÃO</span>
        <strong>Salvar ficha</strong>
        <small style="color:var(--muted);font-size:8px">
          Salve o personagem como uma ficha pronta.
        </small>
      </div>
      <button
        type="button"
        id="aerion-cloud-finalize-button"
        class="button button-primary"
      >
        Salvar e finalizar
      </button>
    `;

    review.appendChild(wrap);

    $("aerion-cloud-finalize-button").addEventListener("click",async()=>{
      const api=window.AERIONFicha || window.AERION_FICHA;
      const state=api?.getState?.();

      if (!state) return;

      if (!completeRequired(state)) {
        toast(
          "Complete Identidade, Raça, Aparência, Classe, Atributos e Poder antes de finalizar.",
          "warning"
        );
        return;
      }

      try {
        const ok=await save("completed");

        if (!ok) {
          toast("Não foi possível salvar a ficha.","warning");
          return;
        }

        toast("Ficha salva e finalizada.","success");

        window.dispatchEvent(
          new CustomEvent("aerion:ficha:finalized",{
            detail:{characterId}
          })
        );
      } catch(error) {
        console.error("[AERION][FICHA FINALIZE]",error);
        toast(
          error?.message || "Não foi possível finalizar a ficha.",
          "error"
        );
      }
    });
  }

  async function loadExisting() {
    const p=urlParams();
    const id=p.get("id");

    if (!id) return false;

    const {data,error}=await supabase
      .from(TABLE)
      .select("id,user_id,creation_state,status")
      .eq("id",id)
      .eq("user_id",user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Ficha não encontrada.");

    characterId=data.id;

    const api=window.AERIONFicha || window.AERION_FICHA;

    if (
      data.creation_state &&
      typeof data.creation_state==="object"
    ) {
      api?.setState?.(data.creation_state);
    }

    return true;
  }

  function makeNewId() {
    const p=urlParams();
    return (
      p.get("draft") ||
      p.get("new_id") ||
      crypto.randomUUID()
    );
  }

  async function waitApi() {
    for(let i=0;i<100;i++){
      if(
        window.AERIONFicha &&
        typeof window.AERIONFicha.getState==="function"
      ) return true;

      await new Promise(r=>setTimeout(r,80));
    }

    throw new Error("O editor de ficha não foi carregado.");
  }

  async function init() {
    if(started || !editorMode()) return;
    started=true;

    try {
      supabase=await getSupabase();

      const auth=await supabase.auth.getUser();
      if(auth.error) throw auth.error;

      user=auth.data?.user;
      if(!user) return;

      await waitApi();

      const loaded=await loadExisting();

      if(!loaded) {
        characterId=makeNewId();

        const url=new URL(location.href);
        url.searchParams.set("new","1");
        url.searchParams.set("draft",characterId);
        history.replaceState({}, "", url);

        /*
         * Nova ficha começa limpa.
         */
        const api=window.AERIONFicha || window.AERION_FICHA;
        api?.reset?.();

        /*
         * Cria imediatamente o rascunho.
         */
        await save("draft");
      }

      window.addEventListener(
        "aerion:save",
        scheduleSave
      );

      window.addEventListener(
        "aerion:ficha:update",
        scheduleSave
      );

      window.addEventListener(
        "aerion:ficha:render",
        scheduleSave
      );

      ensureFinalizeButton();
      setTimeout(ensureFinalizeButton,500);
      setTimeout(scheduleSave,700);

    } catch(error) {
      console.error("[AERION][FICHA CLOUD]",error);
      toast(
        error?.message || "Não foi possível salvar a ficha.",
        "error"
      );
    }
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
