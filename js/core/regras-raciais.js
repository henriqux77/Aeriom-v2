/*
 * AERION — REGRAS RACIAIS
 *
 * Mantém a regra de raça isolada do renderer.
 * A ficha continua sendo dona do estado.
 *
 * Base:
 *   HP = 10
 *   Defesa = 10
 *   Deslocamento terrestre = 9 m
 *
 * A raça pode modificar:
 *   - HP;
 *   - Defesa;
 *   - deslocamento;
 *   - deslocamento aquático;
 *   - modificadores de atributos;
 *   - resistências;
 *   - sentidos;
 *   - tamanho;
 *   - perfil natural;
 *   - habilidades raciais.
 */

(() => {
  "use strict";

  const RACES = Object.freeze({
    humano: {
      hp: 0,
      defense: 0,
      movement: 9,
      mods: { presenca: 1 },
      size: "Médio",
      profile: "Versátil",
      resistances: [],
      senses: ["Sentidos humanos normais"],
      abilities: ["Adaptação"]
    },

    elfo: {
      hp: 0,
      defense: 1,
      movement: 10,
      mods: { agilidade: 1, percepcao: 1 },
      size: "Médio",
      profile: "Ágil e perceptivo",
      resistances: ["Efeitos mentais sobrenaturais leves"],
      senses: ["Visão na penumbra", "Percepção de Mana"],
      abilities: ["Percepção Élfica"]
    },

    anao: {
      hp: 3,
      defense: 2,
      movement: 7,
      mods: { vigor: 1 },
      size: "Pequeno",
      profile: "Robusto",
      resistances: ["Empurrões", "Quedas"],
      senses: ["Visão subterrânea"],
      abilities: ["Forja Ancestral"]
    },

    orc: {
      hp: 4,
      defense: 1,
      movement: 9,
      mods: { forca: 1, vigor: 1 },
      size: "Grande",
      profile: "Forte e robusto",
      resistances: ["Dano físico"],
      senses: ["Olfato aguçado"],
      abilities: ["Fúria de Sangue"]
    },

    centauro: {
      hp: 3,
      defense: 1,
      movement: 13,
      mods: { forca: 1, agilidade: 1 },
      size: "Grande",
      profile: "Potente e veloz",
      resistances: ["Impacto de quedas"],
      senses: ["Percepção de distância"],
      abilities: ["Galope Ancestral"]
    },

    vampiro: {
      hp: 1,
      defense: 2,
      movement: 10,
      mods: { agilidade: 1, presenca: 1 },
      size: "Médio",
      profile: "Sobrenatural",
      resistances: ["Dano físico comum"],
      senses: ["Visão noturna", "Audição aguçada"],
      abilities: ["Regeneração Sanguínea"]
    },

    duende: {
      hp: -1,
      defense: -1,
      movement: 8,
      mods: { agilidade: 1, intelecto: 1 },
      size: "Pequeno",
      profile: "Ágil e astuto",
      resistances: [],
      senses: ["Percepção de detalhes"],
      abilities: ["Fortuna Mercante"]
    },

    fada: {
      hp: -2,
      defense: 0,
      movement: 9,
      mods: { agilidade: 1, controle: 1 },
      size: "Pequeno",
      profile: "Leve e feérica",
      resistances: ["Efeitos mágicos leves"],
      senses: ["Sentidos feéricos"],
      abilities: ["Bênção Feérica"]
    },

    povo_aquatico: {
      hp: 2,
      defense: 0,
      movement: 8,
      water: 10,
      mods: { vigor: 1, percepcao: 1 },
      size: "Médio",
      profile: "Adaptado à água",
      resistances: ["Pressão aquática"],
      senses: ["Respiração aquática"],
      abilities: ["Anfíbio"]
    },

    povo_nuvens: {
      hp: 0,
      defense: 0,
      movement: 10,
      mods: { agilidade: 1, percepcao: 1 },
      size: "Médio",
      profile: "Leve",
      resistances: ["Altitude"],
      senses: ["Percepção de vento e altitude"],
      abilities: ["Passo do Céu"]
    },

    povo_natureza: {
      hp: 1,
      defense: 0,
      movement: 9,
      mods: { vigor: 1 },
      size: "Médio",
      profile: "Ligado à natureza",
      resistances: ["Toxinas naturais"],
      senses: ["Percepção ambiental"],
      abilities: ["Vínculo Natural"]
    },

    neraliano: {
      hp: 2,
      defense: 1,
      movement: 8,
      water: 10,
      mods: { vigor: 1, controle: 1 },
      size: "Médio",
      profile: "Adaptado às profundezas",
      resistances: ["Pressão", "Frio aquático"],
      senses: ["Respiração aquática", "Vibrações na água"],
      abilities: ["Adaptação Abissal"]
    },

    aureano: {
      hp: 1,
      defense: 1,
      movement: 10,
      mods: { presenca: 1, agilidade: 1 },
      size: "Médio",
      profile: "Luminosa presença",
      resistances: ["Baixa pressão"],
      senses: ["Visão de longa distância"],
      abilities: ["Corpo Celestial"]
    },

    colosso: {
      hp: 7,
      defense: 3,
      movement: 8,
      mods: { forca: 2, vigor: 1 },
      size: "Colossal",
      profile: "Colossal",
      resistances: ["Físico excepcional", "Impacto"],
      senses: ["Grande alcance visual"],
      abilities: ["Asas Colossais"]
    },

    troll: {
      hp: 6,
      defense: 3,
      movement: 8,
      mods: { forca: 2, vigor: 1 },
      size: "Grande",
      profile: "Resistente",
      resistances: ["Dano físico", "Impacto"],
      senses: ["Olfato aguçado"],
      abilities: ["Regeneração Brutal"]
    },

    animalha: {
      hp: 0,
      defense: 0,
      movement: 9,
      mods: {},
      size: "Variável",
      profile: "Definido pela linhagem",
      resistances: [],
      senses: ["Sentidos animais"],
      abilities: []
    }
  });

  const ANIMALHA = Object.freeze({
    gato: {
      hp: 0, defense: 1, movement: 10,
      mods: { agilidade: 1 },
      profile: "Reflexos felinos",
      senses: ["Audição aguçada", "Visão noturna"],
      abilities: ["Reflexos Felinos"]
    },
    pantera: {
      hp: 0, defense: 1, movement: 11,
      mods: { agilidade: 1 },
      profile: "Predador furtivo",
      senses: ["Visão noturna", "Audição aguçada"],
      abilities: ["Passos Silenciosos"]
    },
    tigre: {
      hp: 1, defense: 1, movement: 10,
      mods: { forca: 1 },
      profile: "Predador poderoso",
      senses: ["Olfato aguçado"],
      abilities: ["Predador"]
    },
    leao: {
      hp: 1, defense: 1, movement: 10,
      mods: { presenca: 1 },
      profile: "Predador dominante",
      senses: ["Olfato aguçado"],
      abilities: ["Presença Dominante"]
    },
    lobo: {
      hp: 1, defense: 0, movement: 10,
      mods: { percepcao: 1 },
      profile: "Caçador de matilha",
      senses: ["Olfato aguçado", "Audição aguçada"],
      abilities: ["Rastreio"]
    },
    raposa: {
      hp: 0, defense: 1, movement: 9,
      mods: { intelecto: 1 },
      profile: "Astuta",
      senses: ["Audição aguçada"],
      abilities: ["Astúcia"]
    },
    urso: {
      hp: 2, defense: 1, movement: 8,
      mods: { vigor: 1 },
      profile: "Robusto",
      senses: ["Olfato aguçado"],
      abilities: ["Força Ursina"]
    },
    falcao: {
      hp: -1, defense: 1, movement: 12,
      mods: { percepcao: 1 },
      profile: "Caçador aéreo",
      senses: ["Visão de longa distância"],
      abilities: ["Voo"]
    },
    aguia: {
      hp: -1, defense: 1, movement: 12,
      mods: { percepcao: 1 },
      profile: "Predador aéreo",
      senses: ["Visão de longa distância"],
      abilities: ["Voo Ágil"]
    },
    coruja: {
      hp: -1, defense: 1, movement: 11,
      mods: { percepcao: 1 },
      profile: "Caçador noturno",
      senses: ["Visão noturna", "Audição aguçada"],
      abilities: ["Olhar Noturno"]
    },
    cobra: {
      hp: 0, defense: 0, movement: 8,
      mods: { precisao: 1 },
      profile: "Predador sinuoso",
      senses: ["Percepção térmica", "Vibrações"],
      abilities: ["Sentido Térmico"]
    },
    crocodilo: {
      hp: 2, defense: 2, movement: 7, water: 10,
      mods: { vigor: 1 },
      profile: "Caçador anfíbio",
      senses: ["Vibrações na água"],
      abilities: ["Couro Resistente"]
    },
    tubarao: {
      hp: 2, defense: 1, movement: 7, water: 12,
      mods: { percepcao: 1 },
      profile: "Predador aquático",
      senses: ["Percepção de sangue na água", "Vibrações"],
      abilities: ["Caça Aquática"]
    },
    foca: {
      hp: 1, defense: 1, movement: 8, water: 11,
      mods: { vigor: 1 },
      profile: "Nadador resistente",
      senses: ["Audição aguçada na água"],
      abilities: ["Adaptação ao Frio"]
    }
  });

  const clone = (value, fallback) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  };

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
  }

  function getFicha() {
    return window.AERIONFicha || window.AERION_FICHA || null;
  }

  function calculate(snapshot = {}) {
    const raceKey = normalize(snapshot.race);
    const base = clone(RACES[raceKey], {}) || {};
    const lineage =
      raceKey === "animalha"
        ? clone(ANIMALHA[normalize(
            typeof snapshot.animalha === "string"
              ? snapshot.animalha
              : snapshot.animalha?.animal ||
                snapshot.animalha?.variation ||
                snapshot.animalhaAnimal
          )], {})
        : {};

    const racialModifiers = {
      ...(base.mods || {}),
      ...(lineage.mods || {})
    };

    const abilities = [
      ...(base.abilities || []),
      ...(lineage.abilities || [])
    ];

    const resistances = [
      ...new Set([
        ...(base.resistances || []),
        ...(lineage.resistances || [])
      ])
    ];

    const senses = [
      ...new Set([
        ...(base.senses || []),
        ...(lineage.senses || [])
      ])
    ];

    const hpMax = Math.max(
      1,
      10 + number(base.hp, 0) + number(lineage.hp, 0)
    );

    const defense = Math.max(
      1,
      10 + number(base.defense, 0) + number(lineage.defense, 0)
    );

    const movement =
      lineage.movement ??
      base.movement ??
      9;

    const waterMovement =
      lineage.water ??
      base.water ??
      null;

    return {
      hpMax,
      defense,
      movement,
      waterMovement,
      racialModifiers,
      naturalProfile:
        lineage.profile ||
        base.profile ||
        "",
      sizeCategory:
        base.size ||
        "Médio",
      resistances,
      senses,
      abilities
    };
  }

  let applying = false;

  function apply() {
    const api = getFicha();
    if (!api?.getState || !api?.setState) return false;
    if (applying) return false;

    const snapshot = api.getState();
    if (!snapshot?.race) return false;

    const derived = calculate(snapshot);

    applying = true;
    try {
      const currentHp = number(snapshot.hp?.current, derived.hpMax);

      api.setState({
        hp: {
          current: Math.min(Math.max(1, currentHp), derived.hpMax),
          max: derived.hpMax
        },
        defense: derived.defense,
        movement: derived.movement,
        derivedStats: {
          ...derived,
          racialAbility: derived.abilities.join(" · ")
        }
      });
    } finally {
      applying = false;
    }

    return true;
  }

  function scheduleApply() {
    clearTimeout(window.__AERION_RacialRulesTimer);
    window.__AERION_RacialRulesTimer = setTimeout(() => {
      apply();
    }, 0);
  }

  const EVENTS = [
    "aerion:ficha:update",
    "aerion:ficha:render",
    "aerion:race:selected",
    "aerion:animalha:selected",
    "aerion:animalha:category"
  ];

  EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, scheduleApply);
  });

  window.AERIOM_RACIAL_RULES = Object.freeze({
    version: "0.2",
    rules: RACES,
    animalha: ANIMALHA,
    calculate
  });

  window.addEventListener("DOMContentLoaded", () => {
    scheduleApply();
    setTimeout(scheduleApply, 350);
  }, { once: true });
})();
