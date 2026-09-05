/*
 * AERIOM — Regras raciais provisórias v0.1
 * Base: HP 10, Defesa 10, movimento terrestre 9 m.
 *
 * Não altera o dado-base dos atributos.
 * Modificadores raciais ficam separados para uso em testes.
 */

(() => {
  "use strict";

  const R = {
    humano:{hp:0,def:0,movement:9,mods:{presenca:1},size:"Médio",profile:"Versátil",res:[],senses:["Sentidos humanos normais"],ability:["Adaptação"]},
    elfo:{hp:0,def:1,movement:10,mods:{agilidade:1,percepcao:1},size:"Médio",profile:"Ágil e perceptivo",res:["Efeitos mentais sobrenaturais leves"],senses:["Visão na penumbra","Percepção de Mana"],ability:["Percepção Élfica"]},
    anao:{hp:3,def:2,movement:7,mods:{vigor:1},size:"Pequeno",profile:"Robusto",res:["Empurrões","Quedas"],senses:["Visão subterrânea"],ability:["Forja Ancestral"]},
    orc:{hp:4,def:1,movement:9,mods:{forca:1,vigor:1},size:"Grande",profile:"Forte e robusto",res:["Dano físico"],senses:["Olfato aguçado"],ability:["Fúria de Sangue"]},
    centauro:{hp:3,def:1,movement:13,mods:{forca:1,agilidade:1},size:"Grande",profile:"Potente e veloz",res:["Impacto de quedas"],senses:["Percepção de distância"],ability:["Galope Ancestral"]},
    vampiro:{hp:1,def:2,movement:10,mods:{agilidade:1,presenca:1},size:"Médio",profile:"Sobrenatural",res:["Dano físico comum"],senses:["Visão noturna","Audição aguçada"],ability:["Regeneração Sanguínea"]},
    duende:{hp:-1,def:-1,movement:8,mods:{agilidade:1,intelecto:1},size:"Pequeno",profile:"Ágil e astuto",res:[],senses:["Percepção de detalhes"],ability:["Fortuna Mercante"]},
    fada:{hp:-2,def:0,movement:9,mods:{agilidade:1,controle:1},size:"Pequeno",profile:"Leve e feérica",res:["Efeitos mágicos leves"],senses:["Sentidos feéricos"],ability:["Bênção Feérica"]},
    povo_aquatico:{hp:2,def:0,movement:8,water:10,mods:{vigor:1,percepcao:1},size:"Médio",profile:"Adaptado à água",res:["Pressão aquática"],senses:["Respiração aquática"],ability:["Anfíbio"]},
    povo_nuvens:{hp:0,def:0,movement:10,mods:{agilidade:1,percepcao:1},size:"Médio",profile:"Leve",res:["Altitude"],senses:["Percepção de vento e altitude"],ability:["Passo do Céu"]},
    povo_natureza:{hp:1,def:0,movement:9,mods:{vigor:1},size:"Médio",profile:"Ligado à natureza",res:["Toxinas naturais"],senses:["Percepção ambiental"],ability:["Vínculo Natural"]},
    neraliano:{hp:2,def:1,movement:8,water:10,mods:{vigor:1,controle:1},size:"Médio",profile:"Adaptado às profundezas",res:["Pressão","Frio aquático"],senses:["Respiração aquática","Vibrações na água"],ability:["Adaptação Abissal"]},
    aureano:{hp:1,def:1,movement:10,mods:{presenca:1,agilidade:1},size:"Médio",profile:"Luminosa presença",res:["Baixa pressão"],senses:["Visão de longa distância"],ability:["Corpo Celestial"]},
    colosso:{hp:7,def:3,movement:8,mods:{forca:2,vigor:1},size:"Colossal",profile:"Colossal",res:["Físico excepcional","Impacto"],senses:["Grande alcance visual"],ability:["Asas Colossais"]},
    troll:{hp:6,def:3,movement:8,mods:{forca:2,vigor:1},size:"Grande",profile:"Resistente",res:["Dano físico","Impacto"],senses:["Olfato aguçado"],ability:["Regeneração Brutal"]},
    animalha:{hp:0,def:0,movement:9,mods:{},size:"Variável",profile:"Definido pela linhagem",res:[],senses:["Sentidos animais"],ability:[]}
  };

  const A = {
    gato:{hp:0,def:1,movement:10,mods:{agilidade:1},profile:"Reflexos felinos",senses:["Audição aguçada","Visão noturna"],ability:["Reflexos Felinos"]},
    pantera:{hp:0,def:1,movement:11,mods:{agilidade:1},profile:"Predador furtivo",senses:["Visão noturna","Audição aguçada"],ability:["Passos Silenciosos"]},
    tigre:{hp:1,def:1,movement:10,mods:{forca:1},profile:"Predador poderoso",senses:["Olfato aguçado"],ability:["Predador"]},
    leao:{hp:1,def:1,movement:10,mods:{presenca:1},profile:"Predador dominante",senses:["Olfato aguçado"],ability:["Presença Dominante"]},
    lobo:{hp:1,def:0,movement:10,mods:{percepcao:1},profile:"Caçador de matilha",senses:["Olfato aguçado","Audição aguçada"],ability:["Rastreio"]},
    raposa:{hp:0,def:1,movement:9,mods:{intelecto:1},profile:"Astuta",senses:["Audição aguçada"],ability:["Astúcia"]},
    urso:{hp:2,def:1,movement:8,mods:{vigor:1},profile:"Robusto",senses:["Olfato aguçado"],ability:["Força Ursina"]},
    falcao:{hp:-1,def:1,movement:12,mods:{percepcao:1},profile:"Caçador aéreo",senses:["Visão de longa distância"],ability:["Voo"]},
    aguia:{hp:-1,def:1,movement:12,mods:{percepcao:1},profile:"Predador aéreo",senses:["Visão de longa distância"],ability:["Voo Ágil"]},
    coruja:{hp:-1,def:1,movement:11,mods:{percepcao:1},profile:"Caçador noturno",senses:["Visão noturna","Audição aguçada"],ability:["Olhar Noturno"]},
    cobra:{hp:0,def:0,movement:8,mods:{precisao:1},profile:"Predador sinuoso",senses:["Percepção térmica","Vibrações"],ability:["Sentido Térmico"]},
    crocodilo:{hp:2,def:2,movement:7,water:10,mods:{vigor:1},profile:"Caçador anfíbio",senses:["Vibrações na água"],ability:["Couro Resistente"]},
    tubarao:{hp:2,def:1,movement:7,water:12,mods:{percepcao:1},profile:"Predador aquático",senses:["Percepção de sangue na água","Vibrações"],ability:["Caça Aquática"]},
    foca:{hp:1,def:1,movement:8,water:11,mods:{vigor:1},profile:"Nadador resistente",senses:["Audição aguçada na água"],ability:["Adaptação ao Frio"]}
  };

  const clone = (v) => JSON.parse(JSON.stringify(v));

  function key(v) {
    return String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .replace(/\s+/g,"_");
  }

  function calculate(snapshot) {
    const base = clone(R[key(snapshot?.race)] || {});
    const lineage = key(snapshot?.race) === "animalha"
      ? clone(A[key(snapshot?.animalha)] || {})
      : {};

    return {
      hp: Math.max(1, 10 + (base.hp || 0) + (lineage.hp || 0)),
      defense: Math.max(1, 10 + (base.def || 0) + (lineage.def || 0)),
      movement: lineage.movement ?? base.movement ?? 9,
      waterMovement: lineage.water ?? base.water ?? null,
      racialModifiers: { ...(base.mods || {}), ...(lineage.mods || {}) },
      naturalProfile: lineage.profile || base.profile || "",
      sizeCategory: base.size || "Médio",
      resistances: [...new Set([...(base.res || []), ...(lineage.res || [])])],
      senses: [...new Set([...(base.senses || []), ...(lineage.senses || [])])],
      abilities: [...(base.ability || []), ...(lineage.ability || [])]
    };
  }

  let applying = false;

  function apply() {
    const api = window.AERIONFicha;
    if (!api?.getState || !api?.setState) return false;
    if (applying) return false;

    const snapshot = api.getState();
    if (!snapshot?.race) return false;

    const derived = calculate(snapshot);
    applying = true;

    try {
      const currentHp = Number(snapshot.hp?.current);
      api.setState({
        ...snapshot,
        hp: {
          current: Number.isFinite(currentHp) && currentHp > 0
            ? Math.min(currentHp, derived.hp)
            : derived.hp,
          max: derived.hp
        },
        defense: derived.defense,
        movement: derived.movement,
        derivedStats: derived
      });
    } finally {
      applying = false;
    }

    render();
    return true;
  }

  function ensurePanel() {
    const review = document.querySelector('[data-panel="review"]') ||
      document.querySelector(".review-panel");
    if (!review || document.querySelector("#aeriom-derived-card")) return null;

    const card = document.createElement("div");
    card.id = "aeriom-derived-card";
    card.className = "ficha-derived-card";
    review.prepend(card);
    return card;
  }

  function render() {
    const api = window.AERIONFicha;
    if (!api?.getState) return;
    const s = api.getState();
    const d = s?.derivedStats;
    if (!d) return;

    const card = ensurePanel();
    if (!card) return;

    card.innerHTML = [
      ["HP", `${s.hp?.current ?? d.hp?.current ?? d.hp ?? 10} / ${s.hp?.max ?? d.hp?.max ?? d.hp ?? 10}`],
      ["Defesa", s.defense ?? d.defense ?? 10],
      ["Deslocamento", `${s.movement ?? d.movement ?? 9} m`],
      ["Tamanho", d.sizeCategory || "Médio"]
    ].map(([label,value]) =>
      `<div class="ficha-derived-stat"><span>${label}</span><strong>${value}</strong></div>`
    ).join("");
  }

  function bind() {
    const names = [
      "aerion:ficha:update",
      "aerion:ficha:render",
      "aerion:race:selected",
      "aerion:animalha:selected",
      "aerion:animalha:category",
      "aerion:class:selected"
    ];
    names.forEach((name) => {
      window.addEventListener(name, () => {
        if (!applying) {
          calculateAndApplySoon();
        }
      });
    });

    let timer = 0;
    function calculateAndApplySoon() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        apply();
      }, 0);
    }

    window.AERIOM_RACIAL_RULES = Object.freeze({
      version: "0.1",
      rules: R,
      animalha: A,
      calculate
    });

    window.addEventListener("DOMContentLoaded", () => {
      calculateAndApplySoon();
      setTimeout(calculateAndApplySoon, 450);
    }, { once:true });
  }

  bind();
})();
