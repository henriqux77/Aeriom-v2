/* =========================================================
   AERION — DADOS DE RAÇA / COMBATE
   js/data/ficha-regras.js

   OBS:
   - Valores marcados como "proposta" ainda podem ser
     ajustados pelo grupo de desenvolvimento.
   - VOO é uma capacidade de movimento independente da
     categoria Animalha.
   ========================================================= */

(() => {
  "use strict";

  const ATTR = Object.freeze([
    "forca",
    "vigor",
    "agilidade",
    "precisao",
    "intelecto",
    "controle",
    "presenca",
    "percepcao"
  ]);

  const attributeNames = Object.freeze({
    forca: "Força",
    vigor: "Vigor",
    agilidade: "Agilidade",
    precisao: "Precisão",
    intelecto: "Intelecto",
    controle: "Controle",
    presenca: "Presença",
    percepcao: "Percepção"
  });

  const SIZE = Object.freeze({
    pequeno: {
      label: "Pequeno",
      lifeBonus: 1,
      movementMultiplier: 0.5
    },
    medio: {
      label: "Médio",
      lifeBonus: 3,
      movementMultiplier: 1
    },
    grande: {
      label: "Grande",
      lifeBonus: 5,
      movementMultiplier: 0.5
    },
    colossal: {
      label: "Colossal",
      lifeBonus: 5,
      movementMultiplier: 0.5
    }
  });

  const COMBAT = Object.freeze({
    baseLife: 10,
    baseMovement: 9
  });

  /*
   * Os 4 poderes principais são os que entram no D100.
   * Os demais ficam em escolha específica/paralela.
   */
  const powers = Object.freeze({
    primary: [
      "Fogo",
      "Ar",
      "Terra",
      "Água"
    ],
    parallel: [
      "Gelo",
      "Magnetismo",
      "Vegetação",
      "Tecnologia",
      "Gravidade",
      "Som"
    ]
  });

  /*
   * Classes: bônus de perícia ainda configuráveis.
   * O sistema não aplica bônus de atributo de classe.
   */
  const classes = Object.freeze({
    guerreiro: {
      id: "guerreiro",
      name: "Guerreiro",
      skillFocus: [
        "Atletismo",
        "Tática"
      ],
      initialEquipment: [],
      proposedNote:
        "Foco em combate e perícias físicas/táticas."
    },

    feiticeiro: {
      id: "feiticeiro",
      name: "Feiticeiro",
      skillFocus: [
        "Conhecimento",
        "Controle de Mana"
      ],
      initialEquipment: [],
      proposedNote:
        "Foco em conhecimento e domínio de Mana."
    },

    curandeiro: {
      id: "curandeiro",
      name: "Curandeiro",
      skillFocus: [
        "Medicina",
        "Intuição"
      ],
      initialEquipment: [],
      proposedNote:
        "Foco em cura e suporte."
    },

    monge: {
      id: "monge",
      name: "Monge",
      skillFocus: [
        "Atletismo",
        "Controle de Mana"
      ],
      initialEquipment: [],
      proposedNote:
        "Foco em domínio corporal e Mana."
    }
  });

  /*
   * Perfil racial.
   *
   * attrMods são modificadores mecânicos diretos.
   * size define o bônus de Vida e a alteração de deslocamento.
   * flight é movimento aéreo e não depende de ser Animalha.
   */
  const races = Object.freeze({
    humano: {
      id: "humano",
      name: "Humano",
      profile: "Adaptabilidade e aprendizado.",
      attrMods: {
        intelecto: 1,
        presenca: 1
      },
      feature:
        "Adaptação: pode repetir um teste recém-falhado uma vez por cena.",
      size: "medio",
      height: { min: 1.50, max: 2.00 },
      movement: {},
      flight: false
    },

    elfo: {
      id: "elfo",
      name: "Elfo",
      profile: "Percepção e afinidade com Mana.",
      attrMods: {
        percepcao: 1,
        controle: 1,
        vigor: -1
      },
      feature:
        "Percepção Élfica: percebe alterações de Mana e sinais difíceis de notar.",
      size: "medio",
      height: { min: 1.55, max: 2.05 },
      movement: {},
      flight: false
    },

    anao: {
      id: "anao",
      name: "Anão",
      profile: "Resistência e força estrutural.",
      attrMods: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },
      feature:
        "Forja Ancestral: facilidade temática com materiais e estruturas.",
      size: "pequeno",
      height: { min: 1.20, max: 1.55 },
      movement: {},
      flight: false
    },

    orc: {
      id: "orc",
      name: "Orc",
      profile: "Potência física e resistência.",
      attrMods: {
        forca: 1,
        vigor: 1,
        presenca: -1
      },
      feature:
        "Fúria de Sangue: resposta física intensa em situações extremas.",
      size: "grande",
      height: { min: 1.70, max: 2.20 },
      movement: {},
      flight: false
    },

    centauro: {
      id: "centauro",
      name: "Centauro",
      profile: "Velocidade terrestre e potência física.",
      attrMods: {
        forca: 1,
        agilidade: 1,
        controle: -1
      },
      feature:
        "Galope Ancestral: deslocamento terrestre excepcional.",
      size: "grande",
      height: { min: 1.80, max: 2.40 },
      movement: {
        groundMultiplier: 2
      },
      flight: false
    },

    vampiro: {
      id: "vampiro",
      name: "Vampiro",
      profile: "Mobilidade, percepção e sobrevivência sobrenatural.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },
      feature:
        "Regeneração Sanguínea: recuperação sobrenatural sujeita às fraquezas do sistema.",
      size: "medio",
      height: { min: 1.55, max: 2.05 },
      movement: {},
      flight: false
    },

    duende: {
      id: "duende",
      name: "Duende",
      profile: "Intelecto, negociação e precisão.",
      attrMods: {
        intelecto: 1,
        precisao: 1,
        forca: -1
      },
      feature:
        "Fortuna Mercante: percepção de fraude, preços e contratos.",
      size: "pequeno",
      height: { min: 1.00, max: 1.45 },
      movement: {},
      flight: false
    },

    fada: {
      id: "fada",
      name: "Fada",
      profile: "Leveza, Agilidade e Mana.",
      attrMods: {
        controle: 1,
        agilidade: 1,
        forca: -1
      },
      feature:
        "Bênção Feérica: característica feérica de suporte e proteção.",
      size: "pequeno",
      height: { min: 1.30, max: 1.60 },
      movement: {
        airMultiplier: 2
      },
      flight: true
    },

    povo_aquatico: {
      id: "povo_aquatico",
      name: "Povo Aquático",
      profile: "Adaptação à água e percepção ambiental.",
      attrMods: {
        vigor: 1,
        percepcao: 1,
        forca: -1
      },
      feature:
        "Anfíbio: adaptações naturais para respirar e agir em ambiente aquático.",
      size: "medio",
      height: { min: 1.50, max: 2.10 },
      movement: {
        aquaticMultiplier: 2
      },
      flight: false
    },

    povo_natureza: {
      id: "povo_natureza",
      name: "Povo da Natureza",
      profile: "Percepção ambiental e resistência natural.",
      attrMods: {
        percepcao: 1,
        vigor: 1,
        precisao: -1
      },
      feature:
        "Vínculo Natural: sintonia com ambientes e criaturas naturais.",
      size: "medio",
      height: { min: 1.50, max: 2.10 },
      movement: {},
      flight: false
    },

    neraliano: {
      id: "neraliano",
      name: "Neraliano",
      profile: "Adaptação aquática e leitura de vibrações.",
      attrMods: {
        vigor: 1,
        percepcao: 1,
        agilidade: -1
      },
      feature:
        "Adaptação Abissal: grande adaptação a água, profundidade e vibrações.",
      size: "medio",
      height: { min: 1.55, max: 2.05 },
      movement: {
        aquaticMultiplier: 2
      },
      flight: false
    },

    aureano: {
      id: "aureano",
      name: "Aureano",
      profile: "Mobilidade vertical e percepção espacial.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },
      feature:
        "Corpo Celestial: adaptação a altitude, saltos e movimento vertical.",
      size: "medio",
      height: { min: 1.70, max: 2.30 },
      movement: {},
      flight: false
    },

    povo_nuvens: {
      id: "povo_nuvens",
      name: "Povo das Nuvens",
      profile: "Leveza e mobilidade em grandes altitudes.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },
      feature:
        "Passo do Céu: movimentação e saltos excepcionais em ambientes elevados.",
      size: "medio",
      height: { min: 1.65, max: 2.25 },
      movement: {},
      flight: false
    },

    colosso: {
      id: "colosso",
      name: "Colosso",
      profile: "Força e resistência extraordinárias.",
      attrMods: {
        forca: 2,
        vigor: 1,
        agilidade: -1
      },
      feature:
        "Asas Colossais: asas capazes de proteger, atacar e sustentar movimento aéreo conforme a regra.",
      size: "colossal",
      height: { min: 2.50, max: 4.00 },
      movement: {
        airMultiplier: 2
      },
      flight: true
    },

    troll: {
      id: "troll",
      name: "Troll",
      profile: "Resistência extrema e recuperação.",
      attrMods: {
        vigor: 2,
        forca: 1,
        agilidade: -1
      },
      feature:
        "Regeneração Brutal: recuperação física excepcional.",
      size: "grande",
      height: { min: 2.20, max: 3.20 },
      movement: {},
      flight: false
    }
  });

  /*
   * Animalhas:
   * porte e limites pertencem ao animal escolhido.
   * Pequeno não significa 30 cm: é uma personagem humanoide
   * com uma faixa física jogável.
   */
  const animalhaAnimals = Object.freeze([
    {
      id: "pantera",
      name: "Pantera",
      category: "Felinos",
      profile: "Velocidade, furtividade e sentidos.",
      attrMods: { agilidade: 1, percepcao: 1, vigor: -1 },
      feature: "Movimento silencioso e reflexos felinos.",
      size: "medio",
      height: { min: 1.45, max: 1.80 },
      movement: {},
      flight: false
    },
    {
      id: "tigre",
      name: "Tigre",
      category: "Felinos",
      profile: "Força explosiva e mobilidade.",
      attrMods: { forca: 1, agilidade: 1, vigor: -1 },
      feature: "Salto e ataques físicos rápidos.",
      size: "grande",
      height: { min: 1.55, max: 1.95 },
      movement: {},
      flight: false
    },
    {
      id: "leao",
      name: "Leão",
      category: "Felinos",
      profile: "Força e presença.",
      attrMods: { forca: 1, presenca: 1, agilidade: -1 },
      feature: "Presença física e intimidação naturais.",
      size: "grande",
      height: { min: 1.65, max: 2.05 },
      movement: {},
      flight: false
    },
    {
      id: "gato",
      name: "Gato",
      category: "Felinos",
      profile: "Agilidade e percepção.",
      attrMods: { agilidade: 1, percepcao: 1, forca: -1 },
      feature: "Equilíbrio e movimentação precisa.",
      size: "pequeno",
      height: { min: 1.35, max: 1.60 },
      movement: {},
      flight: false
    },

    {
      id: "lobo",
      name: "Lobo",
      category: "Canídeos",
      profile: "Percepção, resistência e rastreamento.",
      attrMods: { percepcao: 1, vigor: 1, presenca: -1 },
      feature: "Sentidos aguçados e rastreamento.",
      size: "medio",
      height: { min: 1.45, max: 1.90 },
      movement: {},
      flight: false
    },
    {
      id: "raposa",
      name: "Raposa",
      category: "Canídeos",
      profile: "Astúcia e agilidade.",
      attrMods: { agilidade: 1, intelecto: 1, forca: -1 },
      feature: "Furtividade e adaptação.",
      size: "pequeno",
      height: { min: 1.35, max: 1.65 },
      movement: {},
      flight: false
    },
    {
      id: "cao_de_caca",
      name: "Cão de Caça",
      category: "Canídeos",
      profile: "Percepção e resistência.",
      attrMods: { percepcao: 1, vigor: 1, intelecto: -1 },
      feature: "Rastreamento especializado.",
      size: "medio",
      height: { min: 1.40, max: 1.80 },
      movement: {},
      flight: false
    },

    {
      id: "falcao",
      name: "Falcão",
      category: "Aves",
      profile: "Visão, precisão e mobilidade aérea.",
      attrMods: { percepcao: 1, precisao: 1, vigor: -1 },
      feature: "Visão aguçada e voo.",
      size: "pequeno",
      height: { min: 1.35, max: 1.65 },
      movement: { airMultiplier: 2 },
      flight: true
    },
    {
      id: "aguia",
      name: "Águia",
      category: "Aves",
      profile: "Percepção espacial e precisão.",
      attrMods: { percepcao: 1, precisao: 1, vigor: -1 },
      feature: "Visão de longa distância e voo.",
      size: "medio",
      height: { min: 1.45, max: 1.80 },
      movement: { airMultiplier: 2 },
      flight: true
    },
    {
      id: "coruja",
      name: "Coruja",
      category: "Aves",
      profile: "Percepção e intelecto.",
      attrMods: { percepcao: 1, intelecto: 1, forca: -1 },
      feature: "Percepção excepcional em baixa iluminação e voo.",
      size: "pequeno",
      height: { min: 1.35, max: 1.65 },
      movement: { airMultiplier: 2 },
      flight: true
    },

    {
      id: "cobra",
      name: "Cobra",
      category: "Répteis",
      profile: "Precisão, percepção e controle corporal.",
      attrMods: { precisao: 1, percepcao: 1, vigor: -1 },
      feature: "Leitura de movimento e controle corporal.",
      size: "pequeno",
      height: { min: 1.35, max: 1.65 },
      movement: {},
      flight: false
    },
    {
      id: "crocodilo",
      name: "Crocodilo",
      category: "Répteis",
      profile: "Força, vigor e adaptação aquática.",
      attrMods: { forca: 1, vigor: 1, agilidade: -1 },
      feature: "Grande resistência e adaptação à água.",
      size: "grande",
      height: { min: 1.80, max: 2.50 },
      movement: { aquaticMultiplier: 2 },
      flight: false
    },
    {
      id: "lagarto",
      name: "Lagarto",
      category: "Répteis",
      profile: "Agilidade e percepção.",
      attrMods: { agilidade: 1, percepcao: 1, presenca: -1 },
      feature: "Movimentos rápidos e sentidos aguçados.",
      size: "medio",
      height: { min: 1.40, max: 1.80 },
      movement: {},
      flight: false
    },

    {
      id: "urso",
      name: "Urso",
      category: "Grande porte",
      profile: "Força e resistência.",
      attrMods: { forca: 1, vigor: 1, agilidade: -1 },
      feature: "Potência física elevada.",
      size: "grande",
      height: { min: 1.90, max: 2.60 },
      movement: {},
      flight: false
    },
    {
      id: "rinoceronte",
      name: "Rinoceronte",
      category: "Grande porte",
      profile: "Resistência extrema.",
      attrMods: { vigor: 2, agilidade: -1, precisao: -1 },
      feature: "Corpo extremamente resistente.",
      size: "grande",
      height: { min: 2.00, max: 2.80 },
      movement: {},
      flight: false
    },
    {
      id: "hipopotamo",
      name: "Hipopótamo",
      category: "Grande porte",
      profile: "Força, vigor e adaptação à água.",
      attrMods: { vigor: 1, forca: 1, agilidade: -1 },
      feature: "Resistência física e adaptação aquática.",
      size: "grande",
      height: { min: 1.90, max: 2.50 },
      movement: { aquaticMultiplier: 2 },
      flight: false
    },

    {
      id: "rato",
      name: "Rato",
      category: "Pequeno porte",
      profile: "Agilidade, percepção e adaptação.",
      attrMods: { agilidade: 1, percepcao: 1, forca: -1 },
      feature: "Excelente percepção e capacidade de explorar espaços apertados.",
      size: "pequeno",
      height: { min: 1.35, max: 1.60 },
      movement: {},
      flight: false
    },

    {
      id: "tubarao",
      name: "Tubarão",
      category: "Aquáticos",
      profile: "Vigor e percepção.",
      attrMods: { vigor: 1, percepcao: 1, presenca: -1 },
      feature: "Percepção e adaptação aquática.",
      size: "grande",
      height: { min: 1.80, max: 2.50 },
      movement: { aquaticMultiplier: 2 },
      flight: false
    },
    {
      id: "peixe",
      name: "Peixe",
      category: "Aquáticos",
      profile: "Agilidade e percepção.",
      attrMods: { agilidade: 1, percepcao: 1, forca: -1 },
      feature: "Locomoção aquática natural.",
      size: "pequeno",
      height: { min: 1.35, max: 1.65 },
      movement: { aquaticMultiplier: 2 },
      flight: false
    },
    {
      id: "foca",
      name: "Foca",
      category: "Aquáticos",
      profile: "Vigor e agilidade.",
      attrMods: { vigor: 1, agilidade: 1, precisao: -1 },
      feature: "Mobilidade aquática superior.",
      size: "medio",
      height: { min: 1.45, max: 1.90 },
      movement: { aquaticMultiplier: 2 },
      flight: false
    }
  ]);

  function mergeMods(base, bonus) {
    const result = {};
    ATTR.forEach(attr => {
      result[attr] =
        (Number(base?.[attr]) || 0) +
        (Number(bonus?.[attr]) || 0);
    });
    return result;
  }

  function getRaceProfile(raceId, animalId = "") {
    const race =
      races[raceId] ||
      races.humano;

    if (
      raceId !== "animalha"
    ) {
      return race;
    }

    const animal =
      animalhaAnimals.find(
        item => item.id === animalId
      ) ||
      animalhaAnimals[0];

    return {
      ...race,
      ...animal,
      id: "animalha",
      name: "Animalha",
      animalId: animal.id,
      animalName: animal.name,
      attrMods: mergeMods(
        race.attrMods,
        animal.attrMods
      ),
      profile:
        `${animal.name}: ${animal.profile}`,
      feature:
        `${race.feature} ${animal.feature}`,
      size:
        animal.size,
      height:
        animal.height,
      movement:
        animal.movement,
      flight:
        Boolean(animal.flight)
    };
  }

  function calculateLife({
    vigorRoll,
    raceId,
    animalId
  }) {
    const profile =
      getRaceProfile(
        raceId,
        animalId
      );

    const size =
      SIZE[
        profile.size
      ] ||
      SIZE.medio;

    const raceVigor =
      Number(
        profile.attrMods?.vigor
      ) || 0;

    const roll =
      Number(vigorRoll);

    if (!Number.isFinite(roll)) {
      return null;
    }

    return {
      base: COMBAT.baseLife,
      vigorRoll: roll,
      racialVigor: raceVigor,
      sizeBonus:
        size.lifeBonus,
      total:
        COMBAT.baseLife +
        roll +
        raceVigor +
        size.lifeBonus
    };
  }

  function calculateMovement({
    raceId,
    animalId
  }) {
    const profile =
      getRaceProfile(
        raceId,
        animalId
      );

    const size =
      SIZE[
        profile.size
      ] ||
      SIZE.medio;

    let ground =
      COMBAT.baseMovement *
      (
        profile.movement?.groundMultiplier ||
        1
      );

    ground *=
      size.movementMultiplier;

    const air =
      profile.flight
        ? ground *
          (
            profile.movement?.airMultiplier ||
            2
          )
        : null;

    const aquatic =
      profile.movement?.aquaticMultiplier
        ? ground *
          profile.movement.aquaticMultiplier
        : null;

    return {
      ground,
      air,
      aquatic,
      flight:
        Boolean(profile.flight)
    };
  }

  function getAttributeModifiers(
    raceId,
    animalId
  ) {
    return {
      ...getRaceProfile(
        raceId,
        animalId
      ).attrMods
    };
  }

  window.AERION_FICHA_REGRAS =
    Object.freeze({
      ATTR,
      attributeNames,
      SIZE,
      COMBAT,
      powers,
      classes,
      races,
      animalhaAnimals,
      getRaceProfile,
      getAttributeModifiers,
      calculateLife,
      calculateMovement
    });
})();


/* =========================================================
   AERION — CRIAÇÃO DE FICHA
   js/core/ficha.js

   Motor da criação de ficha.
   Regras detalhadas ficam em js/data/ficha-regras.js.
   ========================================================= */

(() => {
  "use strict";

  const RULES = window.AERION_FICHA_REGRAS;

  if (!RULES) {
    console.error("[AERION] ficha-regras.js não foi carregado.");
    return;
  }

  const STEPS = [
    { id: "identity", title: "Identidade" },
    { id: "race", title: "Raça" },
    { id: "appearance", title: "Aparência" },
    { id: "class", title: "Classe" },
    { id: "attributes", title: "Atributos" },
    { id: "power", title: "Poder" },
    { id: "mana", title: "Mana" },
    { id: "skills", title: "Perícias" },
    { id: "techniques", title: "Técnicas" },
    { id: "inventory", title: "Inventário" },
    { id: "review", title: "Revisão" }
  ];

  const DICE_LIMITS = Object.freeze({
    d4: 1, d6: 2, d8: 1, d10: 1, d12: 1, d20: 2
  });

  const ATTR = RULES.ATTR;
  const ATTR_NAMES = RULES.attributeNames;

  const CONFIG = Object.freeze({
    draftKey: "aerion:ficha:draft:v7",
    autosaveDelay: 650
  });

  function baseState() {
    return {
      id: null,
      name: "",
      age: "",
      description: "",
      gender: "",
      avatarDataUrl: "",
      avatarFileName: "",
      race: "",
      raceIndex: 0,
      animalId: "",
      appearance: {
        heightCm: 170,
        bodyType: "equilibrado",
        hair: "",
        clothing: "",
        marks: ""
      },
      class: "",
      attributes: Object.fromEntries(ATTR.map(a => [a, null])),
      power: "",
      powerRoll: null,
      mana: "azul",
      skills: [],
      techniques: [],
      inventory: [],
      combat: {
        vigorRolled: false,
        vigorResult: null,
        life: null
      },
      currentStep: 0,
      updatedAt: null
    };
  }

  let state = baseState();
  let selectedDie = null;
  let saveTimer = null;
  let toastTimer = null;
  let initialized = false;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function text(v) { return v == null ? "" : String(v); }

  function deepClone(obj) {
    try { return structuredClone(obj); }
    catch { return JSON.parse(JSON.stringify(obj)); }
  }

  function showToast(message, duration = 2300) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = text(message);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, duration);
  }

  function saveStatus(type, message) {
    const textEl = $("#saveStatusText");
    const dot = $(".save-dot");
    if (textEl) textEl.textContent = message;
    if (!dot) return;

    if (type === "error") {
      dot.style.background = "var(--danger)";
      dot.style.boxShadow = "0 0 12px rgba(197,108,99,.4)";
    } else if (type === "saving") {
      dot.style.background = "var(--gold)";
      dot.style.boxShadow = "0 0 12px rgba(216,180,90,.4)";
    } else {
      dot.style.background = "var(--success)";
      dot.style.boxShadow = "0 0 12px rgba(131,173,121,.4)";
    }
  }

  function saveDraft() {
    try {
      const payload = deepClone(state);
      payload.updatedAt = new Date().toISOString();
      payload.avatarDataUrl =
        payload.avatarDataUrl?.length <= 2_000_000
          ? payload.avatarDataUrl
          : "";
      localStorage.setItem(CONFIG.draftKey, JSON.stringify(payload));
      state.updatedAt = payload.updatedAt;
      saveStatus("saved", "Salvo automaticamente");
      return true;
    } catch (error) {
      console.error("[AERION] Falha ao salvar rascunho:", error);
      saveStatus("error", "Erro ao salvar");
      return false;
    }
  }

  function scheduleSave() {
    saveStatus("saving", "Salvando...");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, CONFIG.autosaveDelay);
  }

  function normalizeState(raw) {
    const next = baseState();
    if (!raw || typeof raw !== "object") return next;

    Object.assign(next, raw);

    next.attributes = Object.fromEntries(
      ATTR.map(attr => {
        const die = text(raw.attributes?.[attr]).toLowerCase();
        return [attr, Object.hasOwn(DICE_LIMITS, die) ? die : null];
      })
    );

    next.appearance = {
      ...baseState().appearance,
      ...(raw.appearance || {})
    };

    next.skills = Array.isArray(raw.skills) ? raw.skills : [];
    next.techniques = Array.isArray(raw.techniques) ? raw.techniques : [];
    next.inventory = Array.isArray(raw.inventory) ? raw.inventory : [];

    next.currentStep = Math.max(
      0,
      Math.min(STEPS.length - 1, Number(raw.currentStep) || 0)
    );

    next.raceIndex = Math.max(
      0,
      Math.min(RULES.races ? Object.keys(RULES.races).length - 1 : 0, Number(raw.raceIndex) || 0)
    );

    next.mana = "azul";
    return next;
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(CONFIG.draftKey);
      if (!raw) return false;
      state = normalizeState(JSON.parse(raw));
      return true;
    } catch (error) {
      console.warn("[AERION] Rascunho inválido removido.", error);
      localStorage.removeItem(CONFIG.draftKey);
      return false;
    }
  }

  /* =========================================================
     REGRAS RACIAIS / PERFIL
     ========================================================= */

  function isAnimalha() {
    return state.race === "animalha";
  }

  function currentRaceProfile() {
    return RULES.getRaceProfile(state.race || "humano", state.animalId);
  }

  function currentSize() {
    const profile = currentRaceProfile();
    return RULES.SIZE[profile?.size] || RULES.SIZE.medio;
  }

  function getHeightBounds() {
    const p = currentRaceProfile();
    const min = Math.round((p?.height?.min || 1.2) * 100);
    const max = Math.round((p?.height?.max || 2.0) * 100);
    return { min, max };
  }

  function clampAppearanceHeight() {
    const b = getHeightBounds();
    const h = Number(state.appearance.heightCm) || b.min;
    state.appearance.heightCm = Math.max(b.min, Math.min(b.max, h));
  }

  function racialMods() {
    return RULES.getAttributeModifiers(state.race || "humano", state.animalId);
  }

  /* =========================================================
     PROGRESSÃO
     ========================================================= */

  function identityComplete() { return Boolean(state.name.trim()); }
  function raceComplete() { return Boolean(state.race); }
  function appearanceComplete() {
    clampAppearanceHeight();
    return (
      Number.isFinite(Number(state.appearance.heightCm)) &&
      state.appearance.heightCm >= getHeightBounds().min &&
      state.appearance.heightCm <= getHeightBounds().max
    );
  }
  function classComplete() { return Boolean(state.class); }
  function attributesComplete() {
    return ATTR.every(attr => Boolean(state.attributes[attr]));
  }
  function powerComplete() { return Boolean(state.power); }
  function manaComplete() { return state.mana === "azul"; }

  function stepComplete(index) {
    switch (STEPS[index]?.id) {
      case "identity": return identityComplete();
      case "race": return raceComplete();
      case "appearance": return appearanceComplete();
      case "class": return classComplete();
      case "attributes": return attributesComplete();
      case "power": return powerComplete();
      case "mana": return manaComplete();
      case "skills": return true;       // módulo pode ser opcional
      case "techniques": return true;   // módulo pode ser opcional
      case "inventory": return true;    // módulo pode ser opcional
      case "review":
        return identityComplete() &&
          raceComplete() &&
          appearanceComplete() &&
          classComplete() &&
          attributesComplete() &&
          powerComplete() &&
          manaComplete();
      default: return false;
    }
  }

  function canEnter(index) {
    if (index <= 0) return true;
    if (!identityComplete()) return false;
    if (index >= 2 && !raceComplete()) return false;
    if (index >= 3 && !appearanceComplete()) return false;
    if (index >= 4 && !classComplete()) return false;
    if (index >= 5 && !attributesComplete()) return false;
    if (index >= 6 && !powerComplete()) return false;
    return true;
  }

  function progressPercent() {
    const complete = STEPS.reduce(
      (sum, _, i) => sum + (stepComplete(i) ? 1 : 0),
      0
    );
    return Math.round((complete / STEPS.length) * 100);
  }

  function updateProgress() {
    const pct = progressPercent();
    if ($("#progressFill")) $("#progressFill").style.width = `${pct}%`;
    if ($("#progressPercent")) $("#progressPercent").textContent = `${pct}%`;
    if ($("#progressTitle")) $("#progressTitle").textContent = STEPS[state.currentStep]?.title || "Identidade";
    if ($("#stepCounter")) $("#stepCounter").textContent = `${state.currentStep + 1} de ${STEPS.length}`;

    $$(".creation-step").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === state.currentStep);
      btn.classList.toggle("is-complete", i < state.currentStep && stepComplete(i));
      btn.disabled = i > state.currentStep && !canEnter(i);
    });

    if ($("#previousStepButton"))
      $("#previousStepButton").disabled = state.currentStep === 0;

    if ($("#nextStepButton"))
      $("#nextStepButton").textContent =
        state.currentStep === STEPS.length - 1 ? "Finalizar →" : "Próximo →";
  }

  function goToStep(index) {
    const target = Math.max(0, Math.min(STEPS.length - 1, Number(index)));

    if (target > state.currentStep && !canEnter(target)) {
      validateCurrentStep();
      return false;
    }

    state.currentStep = target;

    $$(".creation-panel").forEach(panel => {
      const active = panel.dataset.panel === STEPS[target].id;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    updateProgress();

    switch (STEPS[target].id) {
      case "race": renderRace(); break;
      case "appearance": renderAppearance(); break;
      case "class": renderClasses(); break;
      case "attributes": renderAttributes(); break;
      case "power": renderPower(); break;
      case "mana": renderMana(); break;
      case "skills": renderSkills(); break;
      case "techniques": renderTechniques(); break;
      case "inventory": renderInventory(); break;
      case "review": renderReview(); break;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    scheduleSave();
    return true;
  }

  function validateCurrentStep() {
    switch (STEPS[state.currentStep]?.id) {
      case "identity":
        if (!identityComplete()) {
          showToast("Digite o nome do aventureiro.");
          $("#characterName")?.focus();
          return false;
        }
        break;
      case "race":
        if (!raceComplete()) {
          showToast("Escolha uma raça.");
          return false;
        }
        break;
      case "appearance":
        if (!appearanceComplete()) {
          showToast("Defina uma altura válida para a raça.");
          return false;
        }
        break;
      case "class":
        if (!classComplete()) {
          showToast("Escolha uma classe.");
          return false;
        }
        break;
      case "attributes":
        if (!attributesComplete()) {
          showToast(`Complete os atributos: ${Object.values(state.attributes).filter(Boolean).length}/8.`);
          return false;
        }
        break;
      case "power":
        if (!powerComplete()) {
          showToast("Defina o poder.");
          return false;
        }
        break;
      case "mana":
        if (!manaComplete()) {
          showToast("A Mana Azul é a única Mana inicial disponível.");
          return false;
        }
        break;
    }
    return true;
  }

  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function renderIdentity() {
    const name = $("#characterName");
    const age = $("#characterAge");
    const desc = $("#characterDescription");

    if (name) name.value = state.name;
    if (age) age.value = state.age;
    if (desc) desc.value = state.description;

    $$('input[name="gender"]').forEach(r => {
      r.checked = r.value === state.gender;
    });

    renderAvatar();
  }

  function bindIdentity() {
    $("#characterName")?.addEventListener("input", e => {
      state.name = e.target.value;
      $("#nameError")?.setAttribute("hidden", "");
      updateProgress();
      scheduleSave();
      renderReview();
    });

    $("#characterAge")?.addEventListener("input", e => {
      state.age = e.target.value;
      scheduleSave();
      renderReview();
    });

    $("#characterDescription")?.addEventListener("input", e => {
      state.description = e.target.value;
      scheduleSave();
    });

    $$('input[name="gender"]').forEach(r => {
      r.addEventListener("change", () => {
        state.gender = r.value;
        renderRace();
        scheduleSave();
        renderReview();
      });
    });

    $("#avatarInput")?.addEventListener("change", handleAvatar);
    $("#removeAvatarButton")?.addEventListener("click", () => {
      state.avatarDataUrl = "";
      state.avatarFileName = "";
      if ($("#avatarInput")) $("#avatarInput").value = "";
      renderAvatar();
      scheduleSave();
    });
  }

  function handleAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png","image/jpeg","image/webp","image/avif"].includes(file.type)) {
      showToast("Formato de imagem não suportado.");
      e.target.value = "";
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      showToast("A imagem deve ter no máximo 6 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      state.avatarDataUrl = text(reader.result);
      state.avatarFileName = file.name;
      renderAvatar();
      scheduleSave();
    };
    reader.onerror = () => showToast("Não foi possível carregar a imagem.");
    reader.readAsDataURL(file);
  }

  function renderAvatar() {
    const img = $("#avatarImage");
    const placeholder = $("#avatarPlaceholder");
    const remove = $("#removeAvatarButton");

    if (!img || !placeholder) return;

    if (state.avatarDataUrl) {
      img.src = state.avatarDataUrl;
      img.hidden = false;
      placeholder.hidden = true;
      if (remove) remove.disabled = false;
    } else {
      img.hidden = true;
      img.removeAttribute("src");
      placeholder.hidden = false;
      if (remove) remove.disabled = true;
    }

    const reviewImg = $("#reviewAvatar");
    const fallback = $("#reviewAvatarFallback");
    if (reviewImg && fallback) {
      if (state.avatarDataUrl) {
        reviewImg.src = state.avatarDataUrl;
        reviewImg.hidden = false;
        fallback.hidden = true;
      } else {
        reviewImg.hidden = true;
        fallback.hidden = false;
      }
    }
  }

  /* =========================================================
     RAÇA / ANIMALHA
     ========================================================= */

  function raceList() {
    return Object.values(RULES.races);
  }

  function currentRace() {
    return raceList()[state.raceIndex] || raceList()[0];
  }

  function raceImage(race) {
    if (!race) return "";
    if (state.gender === "feminino") return race.femaleImage || race.maleImage || "";
    return race.maleImage || race.femaleImage || "";
  }

  function renderRace() {
    const race = currentRace();
    if (!race) return;

    if ($("#raceImage")) {
      $("#raceImage").src = raceImage(race);
      $("#raceImage").alt = race.name;
      $("#raceImage").style.display = raceImage(race) ? "" : "none";
    }
    if ($("#raceName")) $("#raceName").textContent = race.name;
    if ($("#raceShortDescription")) $("#raceShortDescription").textContent = race.profile || "";
    if ($("#raceGenderLabel")) $("#raceGenderLabel").textContent =
      `${race.name}${state.gender ? ` · ${state.gender}` : ""}`;

    const chosen = state.race === race.id;
    if ($("#raceSelectedText")) $("#raceSelectedText").textContent =
      chosen ? "✓ Selecionada" : "Selecionar raça";

    if ($("#raceDescriptionTitle")) $("#raceDescriptionTitle").textContent = race.name;
    if ($("#raceDescriptionText")) $("#raceDescriptionText").textContent = race.feature || "";

    renderRaceDots();
    renderAnimalhaSubchoice();
    updateProgress();
  }

  function renderRaceDots() {
    const box = $("#raceDots");
    if (!box) return;
    box.innerHTML = "";

    raceList().forEach((race, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = i === state.raceIndex ? "is-active" : "";
      b.ariaLabel = race.name;
      b.addEventListener("click", e => {
        e.stopPropagation();
        state.raceIndex = i;
        renderRace();
        scheduleSave();
      });
      box.appendChild(b);
    });
  }

  function selectRace() {
    const race = currentRace();
    if (!race) return;

    state.race = race.id;

    if (race.id === "animalha" && !state.animalId) {
      state.animalId = RULES.animalhaAnimals[0]?.id || "";
    }

    clampAppearanceHeight();
    renderRace();
    renderAppearance();
    updateProgress();
    renderReview();
    scheduleSave();

    showToast(`${race.name} selecionada.`);
  }

  function bindRace() {
    $("#racePrevious")?.addEventListener("click", e => {
      e.stopPropagation();
      state.raceIndex =
        (state.raceIndex - 1 + raceList().length) % raceList().length;
      renderRace();
      scheduleSave();
    });

    $("#raceNext")?.addEventListener("click", e => {
      e.stopPropagation();
      state.raceIndex =
        (state.raceIndex + 1) % raceList().length;
      renderRace();
      scheduleSave();
    });

    $("#raceCard")?.addEventListener("click", e => {
      if (e.target.closest(".race-select-indicator")) {
        selectRace();
        return;
      }

      const modal = $("#raceModal");
      if (modal?.showModal) {
        const race = currentRace();
        $("#modalRaceName").textContent = race.name;
        $("#modalRaceDescription").textContent = race.profile || race.feature || "";
        modal.showModal();
      } else if (raceComplete()) {
        const desc = $("#raceDescription");
        if (desc) desc.hidden = !desc.hidden;
      }
    });

    $("#modalSelectRace")?.addEventListener("click", () => {
      selectRace();
      $("#raceModal")?.close();
    });

    $("#closeRaceModal")?.addEventListener("click", () => $("#raceModal")?.close());

    $("#raceModal")?.addEventListener("click", e => {
      if (e.target === e.currentTarget) e.currentTarget.close();
    });
  }

  function renderAnimalhaSubchoice() {
    const panel = $("#animalhaSubchoice");
    if (!panel) return;

    const active = state.race === "animalha";
    panel.hidden = !active;
    if (!active) return;

    const tabs = $("#animalhaCategoryTabs");
    const options = $("#animalhaOptions");
    if (!tabs || !options) return;

    const categories = [...new Set(RULES.animalhaAnimals.map(a => a.category))];
    const current = RULES.animalhaAnimals.find(a => a.id === state.animalId) ||
      RULES.animalhaAnimals[0];

    tabs.innerHTML = "";
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = current?.category === cat ? "is-active" : "";
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        renderAnimalOptions(cat);
        tabs.querySelectorAll("button").forEach(x => x.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
      tabs.appendChild(btn);
    });

    renderAnimalOptions(current?.category || categories[0]);
  }

  function renderAnimalOptions(category) {
    const box = $("#animalhaOptions");
    if (!box) return;

    box.innerHTML = "";

    RULES.animalhaAnimals
      .filter(animal => animal.category === category)
      .forEach(animal => {
        const button = document.createElement("button");
        button.type = "button";
        button.className =
          `animalha-option ${state.animalId === animal.id ? "is-selected" : ""}`;

        button.innerHTML = `
          <strong>${animal.name}</strong>
          <small>${animal.profile}</small>
        `;

        button.addEventListener("click", () => {
          state.animalId = animal.id;
          clampAppearanceHeight();
          renderRace();
          renderAppearance();
          renderAttributes();
          renderReview();
          scheduleSave();
          showToast(`${animal.name} selecionado.`);
        });

        box.appendChild(button);
      });
  }

  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance() {
    clampAppearanceHeight();

    const b = getHeightBounds();
    const a = state.appearance;

    if ($("#heightSlider")) {
      $("#heightSlider").min = String(b.min);
      $("#heightSlider").max = String(b.max);
      $("#heightSlider").value = String(a.heightCm);
    }

    if ($("#heightValue"))
      $("#heightValue").textContent = `${(a.heightCm / 100).toFixed(2).replace(".", ",")} m`;

    if ($("#heightBounds"))
      $("#heightBounds").textContent =
        `${(b.min / 100).toFixed(2).replace(".", ",")}–${(b.max / 100).toFixed(2).replace(".", ",")} m`;

    if ($("#heightMinLabel"))
      $("#heightMinLabel").textContent =
        `${(b.min / 100).toFixed(2).replace(".", ",")} m`;

    if ($("#heightMaxLabel"))
      $("#heightMaxLabel").textContent =
        `${(b.max / 100).toFixed(2).replace(".", ",")} m`;

    if ($("#heightLimitText"))
      $("#heightLimitText").textContent =
        `${currentRaceProfile()?.name || "Raça"} · ${currentSize().label}`;

    const indicator = $("#heightIndicator");
    if (indicator) {
      const ratio =
        (a.heightCm - b.min) / Math.max(1, b.max - b.min);
      indicator.style.bottom = `${ratio * 100}%`;
    }

    const body = $("#bodyPreview");
    if (body) {
      body.classList.toggle("body-preview-female", state.gender === "feminino");
      body.classList.toggle("body-preview-male", state.gender !== "feminino");
      body.classList.toggle("body-type-esguio", a.bodyType === "esguio");
      body.classList.toggle("body-type-robusto", a.bodyType === "robusto");
      body.style.setProperty("--body-height", `${Math.max(220, 220 * (a.heightCm / 170))}px`);
    }

    if ($("#appearanceHair")) $("#appearanceHair").value = a.hair;
    if ($("#appearanceClothing")) $("#appearanceClothing").value = a.clothing;
    if ($("#appearanceMarks")) $("#appearanceMarks").value = a.marks;

    $$(".appearance-choice").forEach(btn => {
      btn.classList.toggle("is-selected", btn.dataset.bodyType === a.bodyType);
    });
  }

  function bindAppearance() {
    $("#heightSlider")?.addEventListener("input", e => {
      state.appearance.heightCm = Number(e.target.value);
      renderAppearance();
      scheduleSave();
      renderReview();
    });

    ["appearanceHair","appearanceClothing","appearanceMarks"].forEach(id => {
      $(`#${id}`)?.addEventListener("input", e => {
        const key = id.replace("appearance", "").toLowerCase();
        state.appearance[
          key
        ] = e.target.value;
        scheduleSave();
      });
    });

    $$(".appearance-choice").forEach(btn => {
      btn.addEventListener("click", () => {
        state.appearance.bodyType = btn.dataset.bodyType || "equilibrado";
        renderAppearance();
        scheduleSave();
      });
    });
  }

  /* =========================================================
     CLASSE / PERÍCIAS
     ========================================================= */

  function renderClasses() {
    $$(".class-card").forEach(card => {
      const selected = card.dataset.class === state.class;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
      const indicator = card.querySelector(".class-selection span");
      if (indicator) indicator.textContent = selected ? "✓ Selecionada" : "Selecionar";
    });
  }

  function bindClasses() {
    document.addEventListener("click", e => {
      const card = e.target.closest(".class-card[data-class]");
      if (!card) return;

      const id = card.dataset.class;
      if (!RULES.classes[id]) return;

      state.class = id;
      renderClasses();
      renderSkills();
      updateProgress();
      renderReview();
      scheduleSave();

      showToast(`${RULES.classes[id].name} selecionada.`);
    });
  }

  const SKILLS = [
    ["acrobacia","Acrobacia"], ["atletismo","Atletismo"],
    ["furtividade","Furtividade"], ["percepcao","Percepção"],
    ["investigacao","Investigação"], ["conhecimento","Conhecimento"],
    ["medicina","Medicina"], ["sobrevivencia","Sobrevivência"],
    ["persuasao","Persuasão"], ["intuicao","Intuição"],
    ["enganacao","Enganação"], ["tatica","Tática"],
    ["oficio","Ofício / Crafting"], ["controle_mana","Controle de Mana"]
  ];

  function renderSkills() {
    const panel = $('[data-panel="skills"]');
    if (!panel) return;
    let list = $("#skillList");
    if (!list) {
      list = document.createElement("div");
      list.id = "skillList";
      list.className = "skill-list";
      const empty = panel.querySelector(".empty-module");
      if (empty) empty.replaceWith(list);
      else panel.appendChild(list);
    }

    const classRule = RULES.classes[state.class];
    const focus = new Set(classRule?.skillFocus || []);

    list.innerHTML = "";

    SKILLS.forEach(([id,name]) => {
      const skill = state.skills.find(s => s.id === id) || {
        id, name, trained: false, customBonus: ""
      };

      const card = document.createElement("article");
      card.className = `skill-card ${skill.trained ? "is-trained" : ""}`;

      const classFocus =
        focus.has(name) ||
        (name === "Controle de Mana" && focus.has("Controle de Mana"));

      card.innerHTML = `
        <div class="skill-main">
          <strong>${name}</strong>
          <small>${classFocus ? "Foco da classe" : "Perícia"}</small>
        </div>

        <div class="skill-actions">
          <span class="skill-bonus">
            ${skill.customBonus || (skill.trained ? "+treinado" : "+0")}
          </span>

          <button type="button" class="skill-train-button">
            ${skill.trained ? "Treinada ✓" : "Treinar"}
          </button>
        </div>
      `;

      card.querySelector(".skill-train-button").addEventListener("click", () => {
        const idx = state.skills.findIndex(s => s.id === id);
        if (idx >= 0) state.skills.splice(idx, 1);
        else state.skills.push({ id, name, trained: true, customBonus: "" });
        renderSkills();
        updateProgress();
        scheduleSave();
      });

      list.appendChild(card);
    });
  }

  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function diceUsage() {
    const use = Object.fromEntries(
      Object.keys(DICE_LIMITS).map(k => [k, 0])
    );

    Object.values(state.attributes).forEach(die => {
      if (die) use[die]++;
    });

    return use;
  }

  function remaining(die) {
    return Math.max(
      0,
      (DICE_LIMITS[die] || 0) -
        (diceUsage()[die] || 0)
    );
  }

  function renderDicePool() {
    $$(".dice-card[data-die]").forEach(card => {
      const die = card.dataset.die;
      card.classList.toggle("is-selected", selectedDie === die);
      card.classList.toggle("is-exhausted", remaining(die) <= 0);
    });

    const count = Object.values(state.attributes).filter(Boolean).length;
    if ($("#attributeCount")) $("#attributeCount").textContent = `${count}/8`;
  }

  function assignDie(attr, die) {
    if (!ATTR.includes(attr) || !Object.hasOwn(DICE_LIMITS, die)) return false;

    const old = state.attributes[attr];

    if (old === die) {
      state.attributes[attr] = null;
      selectedDie = null;
      renderAttributes();
      scheduleSave();
      return true;
    }

    state.attributes[attr] = null;

    if (remaining(die) <= 0) {
      state.attributes[attr] = old;
      showToast(`${die.toUpperCase()} não está disponível.`);
      renderAttributes();
      return false;
    }

    state.attributes[attr] = die;
    selectedDie = null;

    renderAttributes();
    scheduleSave();
    return true;
  }

  function swapAttributes(a,b) {
    if (!ATTR.includes(a) || !ATTR.includes(b) || a === b) return;

    const temp = state.attributes[a];
    state.attributes[a] = state.attributes[b];
    state.attributes[b] = temp;

    selectedDie = null;
    renderAttributes();
    scheduleSave();
  }

  function bindAttributeInteraction() {
    document.addEventListener("click", e => {
      const die = e.target.closest(".dice-card[data-die]");
      if (die) {
        const d = die.dataset.die;
        if (remaining(d) > 0) {
          selectedDie = d;
          renderDicePool();
        } else showToast(`${d.toUpperCase()} já está em uso.`);
        return;
      }

      const slot = e.target.closest(".attribute-slot");
      if (!slot) return;

      const attr = slot.dataset.attribute;
      if (!attr) return;

      if (selectedDie) {
        assignDie(attr, selectedDie);
      } else if (state.attributes[attr]) {
        state.attributes[attr] = null;
        renderAttributes();
        scheduleSave();
      }
    });

    $$(".attribute-slot").forEach(slot => {
      slot.draggable = true;

      slot.addEventListener("dragover", e => {
        e.preventDefault();
        slot.classList.add("is-drag-over");
      });

      slot.addEventListener("dragleave", () => slot.classList.remove("is-drag-over"));

      slot.addEventListener("drop", e => {
        e.preventDefault();
        slot.classList.remove("is-drag-over");

        const payload = e.dataTransfer.getData("text/plain");
        const source = e.dataTransfer.getData("application/x-aerion-source");
        const target = slot.dataset.attribute;

        if (source && ATTR.includes(source)) swapAttributes(source, target);
        else if (payload) assignDie(target, payload);
      });

      slot.addEventListener("dragstart", e => {
        const attr = slot.dataset.attribute;
        const die = state.attributes[attr];
        if (!die) {
          e.preventDefault();
          return;
        }

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", die);
        e.dataTransfer.setData("application/x-aerion-source", attr);
      });
    });

    $$(".dice-card[data-die]").forEach(card => {
      card.draggable = true;

      card.addEventListener("dragstart", e => {
        const die = card.dataset.die;
        if (remaining(die) <= 0) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", die);
        e.dataTransfer.setData("application/x-aerion-source", "pool");
      });
    });
  }

  function renderAttributes() {
    const mods = racialMods();

    $$(".attribute-row").forEach(row => {
      const attr = row.dataset.attribute;
      const die = state.attributes[attr];
      const slot = row.querySelector(".attribute-slot");
      const value = row.querySelector(".attribute-die-value");

      if (value) {
        const bonus = Number(mods[attr]) || 0;
        value.textContent = die
          ? `${die.toUpperCase()}${bonus ? ` ${bonus > 0 ? "+" : ""}${bonus}` : ""}`
          : "D?";
      }

      if (slot) slot.classList.toggle("is-filled", Boolean(die));
    });

    renderDicePool();
    renderAttributeChart();
    updateProgress();
  }

  function renderAttributeChart() {
    const svg = $("#attributeChart");
    if (!svg) return;

    const cx=180, cy=180, radius=112;
    const total=ATTR.length;
    svg.innerHTML="";

    const point = (i,val,r=radius) => {
      const angle=-Math.PI/2+i*(Math.PI*2/total);
      return [
        cx+Math.cos(angle)*r*val,
        cy+Math.sin(angle)*r*val
      ];
    };

    [0.25,0.5,0.75,1].forEach(scale => {
      const pts=ATTR.map((_,i)=>point(i,scale).join(",")).join(" ");
      const p=document.createElementNS("http://www.w3.org/2000/svg","polygon");
      p.setAttribute("points",pts);
      p.setAttribute("class","attribute-chart-ring");
      svg.appendChild(p);
    });

    ATTR.forEach((_,i)=>{
      const [x,y]=point(i,1);
      const line=document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1",cx); line.setAttribute("y1",cy);
      line.setAttribute("x2",x); line.setAttribute("y2",y);
      line.setAttribute("class","attribute-chart-axis");
      svg.appendChild(line);
    });

    const pts=ATTR.map((attr,i)=>{
      const die=state.attributes[attr];
      const n=die ? Number(die.slice(1))/20 : 0.08;
      const bonus=Number(racialMods()[attr])||0;
      const adj=Math.max(0.06, Math.min(1, n + bonus*0.03));
      const [x,y]=point(i,adj);
      return {x,y,attr};
    });

    const polygon=document.createElementNS("http://www.w3.org/2000/svg","polygon");
    polygon.setAttribute("points",pts.map(p=>`${p.x},${p.y}`).join(" "));
    polygon.setAttribute("class","attribute-chart-area");
    svg.appendChild(polygon);

    pts.forEach(p=>{
      const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
      c.setAttribute("cx",p.x); c.setAttribute("cy",p.y); c.setAttribute("r","5");
      c.setAttribute("class","attribute-chart-point");
      svg.appendChild(c);
    });

    pts.forEach((_,i)=>{
      const [x,y]=point(i,1,radius+30);
      const t=document.createElementNS("http://www.w3.org/2000/svg","text");
      t.setAttribute("x",x); t.setAttribute("y",y);
      t.setAttribute("class","attribute-chart-label");
      t.setAttribute("text-anchor", x<cx-10?"end":x>cx+10?"start":"middle");
      t.setAttribute("dominant-baseline","middle");
      t.textContent=ATTR_NAMES[ATTR[i]];
      svg.appendChild(t);
    });

    const center=document.createElementNS("http://www.w3.org/2000/svg","circle");
    center.setAttribute("cx",cx); center.setAttribute("cy",cy); center.setAttribute("r","3");
    center.setAttribute("class","attribute-chart-center");
    svg.appendChild(center);
  }

  /* =========================================================
     PODER
     ========================================================= */

  function renderPower() {
    if ($("#characterPower")) $("#characterPower").value = state.power;
    const current = $("[data-power-current]");
    if (current) current.textContent = state.power || "Nenhum poder escolhido";

    const result = $("[data-power-result]");
    if (result) result.textContent = state.powerRoll ? String(state.powerRoll) : "—";

    const note = $("[data-power-result-note]");
    if (note)
      note.textContent = state.powerRoll
        ? `D100: ${state.powerRoll} → ${state.power}`
        : "Gire o D100 para sortear um dos quatro poderes principais.";

    const powerPanel = $('[data-panel="power"]');
    if (powerPanel && !powerPanel.querySelector(".power-system")) buildPowerUI(powerPanel);

    updateProgress();
  }

  function buildPowerUI(panel) {
    const old = panel.querySelector("#powerLegacy");
    if (old) old.remove();

    const box=document.createElement("div");
    box.className="power-system";
    box.id="powerLegacy";

    const primaryButtons = RULES.powers.primary.map(p =>
      `<button type="button" class="button button-secondary" data-power-value="${p}">${p}</button>`
    ).join("");

    const parallelButtons = RULES.powers.parallel.map(p =>
      `<button type="button" class="button button-secondary" data-power-value="${p}">${p}</button>`
    ).join("");

    box.innerHTML=`
      <div class="power-mode-buttons">
        <button type="button" class="button button-secondary" data-power-mode="roll">◈ Girar D100</button>
        <button type="button" class="button button-secondary" data-power-mode="manual">Escolher poder específico</button>
      </div>

      <div class="power-section" data-power-section="roll">
        <div class="power-roll-result">
          <span class="eyebrow">D100 · PODER PRINCIPAL</span>
          <strong data-power-result>—</strong>
          <p data-power-result-note>Gire para sortear Fogo, Ar, Terra ou Água.</p>
        </div>
        <button type="button" class="button button-primary" data-roll-power>◈ Girar D100</button>
      </div>

      <div class="power-section" data-power-section="manual" hidden>
        <span class="field-label">Poderes principais</span>
        <div class="power-options">${primaryButtons}</div>
        <span class="field-label">Poderes paralelos</span>
        <div class="power-options">${parallelButtons}</div>
      </div>

      <div class="power-selected">
        <span class="eyebrow">PODER ESCOLHIDO</span>
        <strong data-power-current>Nenhum poder escolhido</strong>
      </div>
    `;

    panel.appendChild(box);
  }

  function rollPower() {
    const roll = Math.floor(Math.random()*100)+1;
    const primary = RULES.powers.primary[
      Math.floor((roll-1)/25)
    ] || RULES.powers.primary[0];

    state.powerRoll = roll;
    state.power = primary;
    renderPower();
    renderReview();
    scheduleSave();
    showToast(`D100: ${roll} → ${primary}`);
  }

  function bindPower() {
    document.addEventListener("click", e => {
      const mode=e.target.closest("[data-power-mode]");
      if(mode){
        const which=mode.dataset.powerMode;
        $$('.power-section[data-power-section]').forEach(s=>{
          s.hidden=s.dataset.powerSection!==which;
        });
        return;
      }

      const value=e.target.closest("[data-power-value]");
      if(value){
        state.power=value.dataset.powerValue;
        state.powerRoll=null;
        renderPower();
        renderReview();
        updateProgress();
        scheduleSave();
        showToast(`${state.power} escolhido.`);
        return;
      }

      const roll=e.target.closest("[data-roll-power]");
      if(roll) rollPower();
    });
  }

  /* =========================================================
     MANA
     ========================================================= */

  function renderMana() {
    state.mana="azul";
    $$(".mana-card").forEach(card => {
      const blue=card.dataset.mana==="azul";
      card.classList.toggle("is-selected",blue);
      if(!blue) card.disabled=true;
    });
    updateProgress();
  }

  function bindMana() {
    document.addEventListener("click",e=>{
      const card=e.target.closest(".mana-card[data-mana]");
      if(!card || card.dataset.mana!=="azul") return;
      state.mana="azul";
      renderMana();
      scheduleSave();
    });
  }

  /* =========================================================
     TÉCNICAS / INVENTÁRIO
     ========================================================= */

  function renderTechniques() {
    const list=$("#techniquesList");
    if(!list) return;
    list.innerHTML="";

    state.techniques.forEach((tech,index)=>{
      const box=document.createElement("div");
      box.className="empty-module";
      box.innerHTML=`
        <div class="dynamic-form">
          <label class="field"><span class="field-label">Nome</span><input data-k="name" maxlength="100"></label>
          <label class="field"><span class="field-label">Descrição</span><textarea data-k="description" rows="4"></textarea></label>
          <div class="dynamic-form-grid">
            <label class="field"><span class="field-label">Alcance</span><input data-k="range"></label>
            <label class="field"><span class="field-label">Dano / Efeito</span><input data-k="damage"></label>
          </div>
          <label class="field"><span class="field-label">Custo</span><input data-k="cost"></label>
          <label class="field"><span class="field-label">Teste</span><input data-k="test"></label>
          <label class="field"><span class="field-label">Limitação</span><textarea data-k="limitation" rows="3"></textarea></label>
          <button type="button" class="button button-ghost" data-remove-technique>Remover técnica</button>
        </div>
      `;

      $$("[data-k]",box).forEach(input=>{
        input.value=text(tech[input.dataset.k]);
        input.addEventListener("input",()=>{
          state.techniques[index][input.dataset.k]=input.value;
          scheduleSave();
        });
      });

      $("[data-remove-technique]",box).addEventListener("click",()=>{
        state.techniques.splice(index,1);
        renderTechniques();
        scheduleSave();
      });

      list.appendChild(box);
    });
  }

  function addTechnique(){
    state.techniques.push({
      name:"", description:"", range:"", damage:"",
      cost:"", test:"", limitation:""
    });
    renderTechniques();
    scheduleSave();
  }

  function renderInventory(){
    const list=$("#inventoryList");
    if(!list) return;
    list.innerHTML="";

    state.inventory.forEach((item,index)=>{
      const box=document.createElement("div");
      box.className="empty-module";
      box.innerHTML=`
        <div class="dynamic-form">
          <label class="field"><span class="field-label">Item</span><input data-k="name" maxlength="100"></label>
          <label class="field"><span class="field-label">Descrição</span><textarea data-k="description" rows="3"></textarea></label>
          <button type="button" class="button button-ghost" data-remove-item>Remover item</button>
        </div>
      `;

      $$("[data-k]",box).forEach(input=>{
        input.value=text(item[input.dataset.k]);
        input.addEventListener("input",()=>{
          state.inventory[index][input.dataset.k]=input.value;
          scheduleSave();
        });
      });

      $("[data-remove-item]",box).addEventListener("click",()=>{
        state.inventory.splice(index,1);
        renderInventory();
        scheduleSave();
      });

      list.appendChild(box);
    });
  }

  function bindDynamic() {
    $("#addTechniqueButton")?.addEventListener("click",addTechnique);
    $("#addInventoryButton")?.addEventListener("click",()=>{
      state.inventory.push({name:"",description:""});
      renderInventory();
      scheduleSave();
    });
  }

  /* =========================================================
     COMBATE / DERIVAÇÃO
     ========================================================= */

  function vigorDie() {
    return state.attributes.vigor;
  }

  function rollVigorForLife() {
    const die = vigorDie();
    if (!die) {
      showToast("Defina o dado de Vigor antes de rolar.");
      goToStep(4);
      return;
    }

    if (state.combat.vigorRolled) {
      showToast(`Vigor já rolado: ${state.combat.vigorResult}.`);
      return;
    }

    const sides = Number(die.slice(1));
    const result = Math.floor(Math.random()*sides)+1;

    state.combat.vigorRolled = true;
    state.combat.vigorResult = result;

    const life = RULES.calculateLife({
      vigorRoll: result,
      raceId: state.race || "humano",
      animalId: state.animalId
    });

    state.combat.life = life;
    renderReview();
    scheduleSave();

    showToast(
      `Vigor: ${result} → Vida atualizada para ${life.total} PV.`
    );
  }

  function renderReview() {
    if ($("#reviewName"))
      $("#reviewName").textContent=state.name||"Sem nome";

    if ($("#reviewIdentity")) {
      const parts=[];
      if(state.age) parts.push(`${state.age} anos`);
      if(state.gender) parts.push(state.gender==="masculino"?"Masculino":"Feminino");
      const p=currentRaceProfile();
      if(p) parts.push(p.name);
      if(isAnimalha() && p?.animalName) parts.push(p.animalName);
      $("#reviewIdentity").textContent=parts.join(" · ")||"Identidade ainda não definida.";
    }

    if ($("#reviewRace")) $("#reviewRace").textContent=currentRaceProfile()?.name||"—";
    if ($("#reviewClass")) $("#reviewClass").textContent=RULES.classes[state.class]?.name||"—";
    if ($("#reviewGender")) $("#reviewGender").textContent=state.gender ? (state.gender==="masculino"?"Masculino":"Feminino") : "—";
    if ($("#reviewMana")) $("#reviewMana").textContent="Mana Azul";

    const p=currentRaceProfile();
    const movement=RULES.calculateMovement({
      raceId:state.race||"humano",
      animalId:state.animalId
    });

    const moveText = movement.flight && movement.air
      ? `${Number(movement.ground.toFixed(2))} m terrestre · ${Number(movement.air.toFixed(2))} m aéreo`
      : `${Number(movement.ground.toFixed(2))} m`;

    if($("#combatMovement")) $("#combatMovement").textContent=moveText;
    if($("#combatMovementFormula")){
      const flags=[];
      if(p?.flight) flags.push("voo");
      if((p?.movement?.aquaticMultiplier||0)>1) flags.push("aquático");
      $("#combatMovementFormula").textContent=
        flags.length ? `Base 9 m · ${flags.join(" · ")}` : "Base 9 m · porte";
    }

    if($("#combatLife")){
      $("#combatLife").textContent =
        state.combat.life ? `${state.combat.life.total} PV` : "—";
    }

    if($("#combatStatus")){
      $("#combatStatus").textContent =
        state.combat.vigorRolled
          ? `Vigor rolado: ${state.combat.vigorResult}`
          : "Vigor ainda não rolado";
    }

    if($("#combatLifeFormula")){
      const size=currentSize();
      const racial=Number(racialMods().vigor)||0;
      $("#combatLifeFormula").textContent=
        `10 + Vigor${racial?` ${racial>0?"+":""}${racial}`:""} + porte +3/+1/+5`;
    }

    if($("#combatRollNotification")){
      $("#combatRollNotification").textContent=
        state.combat.vigorRolled
          ? `Vigor ${state.combat.vigorResult} foi aplicado automaticamente. Vida: ${state.combat.life?.total ?? "—"} PV.`
          : `Role o ${vigorDie()?.toUpperCase()||"dado"} de Vigor uma única vez para calcular sua Vida.`;
    }

    renderAvatar();
  }

  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function bindNavigation(){
    $("#previousStepButton")?.addEventListener("click",()=>goToStep(state.currentStep-1));

    $("#nextStepButton")?.addEventListener("click",()=>{
      if(state.currentStep===STEPS.length-1){
        finish();
        return;
      }

      if(!validateCurrentStep()){
        return;
      }

      goToStep(state.currentStep+1);
    });

    $$(".creation-step").forEach((button,index)=>{
      button.addEventListener("click",()=>{
        if(!button.disabled) goToStep(index);
      });
    });
  }

  function finish(){
    if(!identityComplete() ||
       !raceComplete() ||
       !appearanceComplete() ||
       !classComplete() ||
       !attributesComplete() ||
       !powerComplete() ||
       !manaComplete()){
      showToast("Há etapas obrigatórias pendentes.");
      return;
    }

    if(!state.combat.vigorRolled){
      showToast("Na revisão, role o Vigor para calcular sua Vida.");
      return;
    }

    saveDraft();
    showToast("Ficha concluída e salva neste dispositivo.",3200);
  }

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init(){
    if(initialized) return;
    initialized=true;

    const restored=loadDraft();

    bindIdentity();
    bindRace();
    bindClasses();
    bindAttributeInteraction();
    bindAppearance();
    bindPower();
    bindMana();
    bindDynamic();
    bindNavigation();

    $("[data-combat-roll='vigor']")?.addEventListener("click",rollVigorForLife);

    renderIdentity();
    renderRace();
    renderAppearance();
    renderClasses();
    renderAttributes();
    renderPower();
    renderMana();
    renderSkills();
    renderTechniques();
    renderInventory();
    renderReview();
    updateProgress();

    state.currentStep = Math.min(
      state.currentStep,
      STEPS.length-1
    );

    if(!canEnter(state.currentStep)){
      state.currentStep=0;
    }

    goToStep(state.currentStep);

    window.addEventListener("beforeunload",saveDraft);
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="hidden") saveDraft();
    });

    if(restored) showToast("Rascunho anterior restaurado.",1800);
  }

  window.AERIONFicha=Object.freeze({
    getState:()=>deepClone(state),
    saveDraft,
    goToStep,
    rollVigorForLife,
    getRaceProfile:currentRaceProfile,
    calculateMovement:()=>RULES.calculateMovement({
      raceId:state.race||"humano",
      animalId:state.animalId
    })
  });

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }
})();
