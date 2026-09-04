/* =========================================================
   AERION — FICHA
   js/core/ficha.js

   NÚCLEO DA FICHA

   Responsável por:
   - estado;
   - identidade;
   - raça;
   - Animalha;
   - aparência;
   - classe;
   - atributos;
   - dados;
   - rolagens;
   - poder;
   - mana;
   - perícias;
   - técnicas;
   - inventário;
   - navegação;
   - salvamento local;
   - ações [data-action].

   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = Object.freeze({
    storageKey: "aerion:ficha:draft:v18",
    autosaveDelay: 300,
    maxImageSize: 6 * 1024 * 1024,
    totalSteps: 11
  });


  /* =======================================================
     ETAPAS
     ======================================================= */

  const STEPS = Object.freeze([
    {
      index: 0,
      id: "identity",
      name: "Identidade"
    },
    {
      index: 1,
      id: "race",
      name: "Raça"
    },
    {
      index: 2,
      id: "appearance",
      name: "Aparência"
    },
    {
      index: 3,
      id: "class",
      name: "Classe"
    },
    {
      index: 4,
      id: "attributes",
      name: "Atributos"
    },
    {
      index: 5,
      id: "power",
      name: "Poder"
    },
    {
      index: 6,
      id: "mana",
      name: "Mana"
    },
    {
      index: 7,
      id: "skills",
      name: "Perícias"
    },
    {
      index: 8,
      id: "techniques",
      name: "Técnicas"
    },
    {
      index: 9,
      id: "inventory",
      name: "Inventário"
    },
    {
      index: 10,
      id: "review",
      name: "Revisão"
    }
  ]);


  /* =======================================================
     ATRIBUTOS
     ======================================================= */

  const ATTRIBUTES = Object.freeze([
    {
      id: "presenca",
      name: "Presença",
      short: "PRS"
    },
    {
      id: "precisao",
      name: "Precisão",
      short: "PRE"
    },
    {
      id: "intelecto",
      name: "Intelecto",
      short: "INT"
    },
    {
      id: "controle",
      name: "Controle",
      short: "CON"
    },
    {
      id: "percepcao",
      name: "Percepção",
      short: "PER"
    },
    {
      id: "vigor",
      name: "Vigor",
      short: "VIG"
    },
    {
      id: "agilidade",
      name: "Agilidade",
      short: "AGI"
    },
    {
      id: "forca",
      name: "Força",
      short: "FOR"
    }
  ]);

  const ATTRIBUTE_IDS = new Set(
    ATTRIBUTES.map(
      attribute => attribute.id
    )
  );


  /* =======================================================
     DADOS
     ======================================================= */

  const DICE = Object.freeze([
    {
      id: "d4-1",
      type: "d4",
      sides: 4
    },
    {
      id: "d6-1",
      type: "d6",
      sides: 6
    },
    {
      id: "d6-2",
      type: "d6",
      sides: 6
    },
    {
      id: "d8-1",
      type: "d8",
      sides: 8
    },
    {
      id: "d10-1",
      type: "d10",
      sides: 10
    },
    {
      id: "d12-1",
      type: "d12",
      sides: 12
    },
    {
      id: "d20-1",
      type: "d20",
      sides: 20
    },
    {
      id: "d20-2",
      type: "d20",
      sides: 20
    }
  ]);

  const DICE_BY_ID = Object.freeze(
    Object.fromEntries(
      DICE.map(
        die => [
          die.id,
          die
        ]
      )
    )
  );


  /* =======================================================
     CLASSES
     ======================================================= */

  const CLASSES = Object.freeze({
    guerreiro: {
      id: "guerreiro",
      name: "Guerreiro",
      role: "Combatente",
      icon: "⚔",
      manaBonus: 1
    },

    feiticeiro: {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",
      icon: "✦",
      manaBonus: 5
    },

    curandeiro: {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",
      icon: "✚",
      manaBonus: 2
    },

    monge: {
      id: "monge",
      name: "Monge",
      role: "Marcial",
      icon: "◈",
      manaBonus: 7
    }
  });


  /* =======================================================
     PODERES
     ======================================================= */

  const MAIN_ELEMENTAL_POWERS = Object.freeze([
    "Fogo",
    "Ar",
    "Terra",
    "Água"
  ]);

  const UNCOMMON_POWERS = Object.freeze([
    "Gelo",
    "Magnetismo",
    "Vegetação",
    "Tecnologia",
    "Gravidade"
  ]);

  function rollPowerD100() {
    const roll =
      Math.floor(
        Math.random() * 100
      ) + 1;

    const index =
      Math.min(
        3,
        Math.floor((roll - 1) / 25)
      );

    const power =
      MAIN_ELEMENTAL_POWERS[index];

    state.powerRoll = roll;
    state.powerMode = "d100";
    state.primaryPower = power;
    state.completedSteps[5] = true;

    commit(
      "aerion:power:selected"
    );

    emit(
      "aerion:toast",
      {
        message:
          `D100: ${roll} — Poder sorteado: ${power}.`,
        type: "success"
      }
    );

    return {
      roll,
      power
    };
  }

  function selectUncommonPower(power) {
    const selected =
      text(power);

    if (
      !UNCOMMON_POWERS.includes(
        selected
      )
    ) {
      warn(
        "Poder incomum inválido."
      );

      return false;
    }

    state.primaryPower =
      selected;

    state.powerRoll = null;
    state.powerMode =
      "uncommon";
    state.completedSteps[5] =
      true;

    commit(
      "aerion:power:selected"
    );

    emit(
      "aerion:toast",
      {
        message:
          `${selected} escolhido como poder principal.`,
        type: "success"
      }
    );

    return true;
  }


  /* =======================================================
     PERÍCIAS
     ======================================================= */

  const SKILLS = Object.freeze({
    acrobacia: "Acrobacia",
    atletismo: "Atletismo",
    furtividade: "Furtividade",
    percepcao: "Percepção",
    investigacao: "Investigação",
    conhecimento: "Conhecimento",
    medicina: "Medicina",
    sobrevivencia: "Sobrevivência",
    persuasao: "Persuasão",
    intuicao: "Intuição",
    enganacao: "Enganação",
    tatica: "Tática",
    oficio: "Ofício / Crafting",
    controle_mana: "Controle de Mana"
  });


  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function clone(value) {
    try {
      return JSON.parse(
        JSON.stringify(value)
      );
    } catch {
      return value;
    }
  }


  function text(value) {
    return String(
      value ?? ""
    ).trim();
  }


  function number(
    value,
    fallback = 0
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }


  function clamp(
    value,
    min,
    max
  ) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }


  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /\s+/g,
        "_"
      );
  }


  function emit(
    eventName,
    detail = {}
  ) {
    window.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail
        }
      )
    );
  }


  function getAssets() {
    return (
      window.AERIONPersonagemAssets ||
      window.AERION_CHARACTER_ASSETS ||
      null
    );
  }


  function getRaces() {
    const assets =
      getAssets();

    if (
      Array.isArray(
        assets?.races
      )
    ) {
      return assets.races;
    }

    if (
      Array.isArray(
        assets?.RACES
      )
    ) {
      return assets.RACES;
    }

    if (
      Array.isArray(
        window.AERION_RACES
      )
    ) {
      return window.AERION_RACES;
    }

    return [];
  }


  function findRace(
    raceId
  ) {
    const wanted =
      normalize(raceId);

    return (
      getRaces().find(
        race => {
          const id =
            race?.id ??
            race?.key ??
            race?.slug ??
            race?.name;

          return (
            normalize(id) ===
            wanted
          );
        }
      ) ||
      null
    );
  }


  function getClass(
    classId
  ) {
    const wanted =
      normalize(classId);

    return (
      Object.values(CLASSES)
        .find(
          item =>
            normalize(
              item.id
            ) === wanted
        ) ||
      null
    );
  }


  /* =======================================================
     ESTADO PADRÃO
     ======================================================= */

  function makeAttributes() {
    return Object.fromEntries(
      ATTRIBUTES.map(
        attribute => [
          attribute.id,
          null
        ]
      )
    );
  }


  function makeAssignedDice() {
    return Object.fromEntries(
      ATTRIBUTES.map(
        attribute => [
          attribute.id,
          null
        ]
      )
    );
  }


  function makeSkills() {
    return Object.fromEntries(
      Object.keys(
        SKILLS
      ).map(
        key => [
          key,
          0
        ]
      )
    );
  }


  function createDefaultState() {
    return {
      currentStep: 0,

      completedSteps:
        Array(
          CONFIG.totalSteps
        ).fill(false),

      /* identidade */
      name: "",
      age: "",
      gender: "",
      description: "",
      origin: "",

      /* conceito */
      personality: "",
      objective: "",
      fear: "",
      importantBond: "",
      history: "",
      region: "",

      /* raça */
      race: "",
      raceIndex: 0,

      /* animalha */
      animalha: "",
      animalhaCategory: "",

      /* aparência */
      appearance: {
        height: null,
        hairColor: "",
        eyeColor: "",
        skinTone: "",
        hairType: "",
        physicalFeatures: "",
        scars: "",
        description: ""
      },

      /* avatar */
      avatar: "",
      avatarName: "",

      /* classe */
      class: "",
      classIndex: 0,

      /* atributos */
      attributes:
        makeAttributes(),

      selectedAttribute: "",

      /* dados */
      assignedDice:
        makeAssignedDice(),

      diceResults: {},

      lastRoll: null,

      /* poder */
      primaryPower: "",
      parallelPower: "",

      /* mana */
      mana: {
        current: 0,
        max: 0,
        type: ""
      },

      /* perícias */
      skills:
        makeSkills(),

      /* técnicas */
      techniques: [],

      /* inventário */
      inventory: [],

      /* combate */
      hp: {
        current: 0,
        max: 0
      },

      defense: 0,
      initiative: 0,
      movement: 0,

      money: 0,

      saved: false
    };
  }


  let state =
    createDefaultState();


  let saveTimer =
    null;


  /* =======================================================
     NORMALIZAÇÃO
     ======================================================= */

  function normalizeState(
    incoming
  ) {
    const defaults =
      createDefaultState();

    const source =
      incoming &&
      typeof incoming ===
        "object"
        ? incoming
        : {};

    const next = {
      ...defaults,
      ...clone(source)
    };


    next.currentStep =
      clamp(
        number(
          source.currentStep,
          0
        ),
        0,
        CONFIG.totalSteps - 1
      );


    next.completedSteps =
      Array.from(
        {
          length:
            CONFIG.totalSteps
        },
        (
          _,
          index
        ) =>
          source.completedSteps?.[
            index
          ] === true
      );


    next.appearance = {
      ...defaults.appearance,
      ...(
        source.appearance &&
        typeof source.appearance ===
          "object"
          ? source.appearance
          : {}
      )
    };


    next.attributes = {
      ...defaults.attributes,
      ...(
        source.attributes &&
        typeof source.attributes ===
          "object"
          ? source.attributes
          : {}
      )
    };


    next.assignedDice = {
      ...defaults.assignedDice,
      ...(
        source.assignedDice &&
        typeof source.assignedDice ===
          "object"
          ? source.assignedDice
          : {}
      )
    };


    next.diceResults = {
      ...(
        source.diceResults &&
        typeof source.diceResults ===
          "object"
          ? source.diceResults
          : {}
      )
    };


    next.skills = {
      ...defaults.skills,
      ...(
        source.skills &&
        typeof source.skills ===
          "object"
          ? source.skills
          : {}
      )
    };


    next.mana = {
      ...defaults.mana,
      ...(
        source.mana &&
        typeof source.mana ===
          "object"
          ? source.mana
          : {}
      )
    };


    if (
      !ATTRIBUTE_IDS.has(
        next.selectedAttribute
      )
    ) {
      next.selectedAttribute =
        "";
    }


    /*
      Recalcula apenas as etapas que possuem requisitos objetivos.
      Isso impede que um completedSteps antigo/liberado por uma versão
      anterior do formulário desbloqueie etapas sem preenchimento real.
    */
    next.completedSteps[0] =
      Boolean(text(next.name)) &&
      Boolean(text(next.gender));

    next.completedSteps[1] =
      Boolean(text(next.race)) &&
      (normalize(next.race) !==
        "animalha" ||
        (Boolean(text(next.animalhaCategory)) &&
          Boolean(
            text(
              typeof next.animalha ===
                "string"
                ? next.animalha
                : next.animalha?.animal ||
                  next.animalha?.variation ||
                  next.animalhaAnimal
            )
          )));

    next.completedSteps[2] =
      Number(next.appearance?.height) > 0;

    next.completedSteps[3] =
      Boolean(text(next.class));

    next.completedSteps[4] =
      ATTRIBUTES.every(
        attribute =>
          Boolean(
            next.assignedDice[
              attribute.id
            ]
          )
      );

    next.completedSteps[5] =
      Boolean(text(next.primaryPower));


    return next;
  }


  /* =======================================================
     STORAGE
     ======================================================= */

  function loadState() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!raw) {
        return createDefaultState();
      }

      return normalizeState(
        JSON.parse(raw)
      );
    } catch (error) {
      console.warn(
        "[AERION] Falha ao carregar ficha:",
        error
      );

      return createDefaultState();
    }
  }


  function saveState(
    immediate = false
  ) {
    clearTimeout(
      saveTimer
    );

    const execute =
      () => {
        try {
          state.saved = true;

          localStorage.setItem(
            CONFIG.storageKey,
            JSON.stringify(state)
          );

          emit(
            "aerion:save",
            {
              state: clone(state)
            }
          );
        } catch (error) {
          console.error(
            "[AERION] Falha ao salvar:",
            error
          );
        }
      };


    if (immediate) {
      execute();
      return;
    }


    saveTimer =
      setTimeout(
        execute,
        CONFIG.autosaveDelay
      );
  }


  function commit(
    eventName =
      "aerion:ficha:update"
  ) {
    state.saved = false;

    saveState();

    emit(
      eventName,
      {
        state: clone(state)
      }
    );
  }


  /* =======================================================
     GET / SET
     ======================================================= */

  function getState() {
    return clone(state);
  }


  function setState(
    partial
  ) {
    state =
      normalizeState({
        ...state,
        ...clone(partial)
      });

    commit();
  }


  /* =======================================================
     COMPLETAR ETAPAS
     ======================================================= */

  function setStepComplete(
    index,
    complete = true
  ) {
    if (
      index < 0 ||
      index >= CONFIG.totalSteps
    ) {
      return;
    }

    state.completedSteps[index] =
      Boolean(complete);

    commit();
  }


  /* =======================================================
     VALIDAÇÕES
     ======================================================= */

  function validateIdentity() {

    const name =
      text(state.name);

    if (!name) {
      warn(
        "Digite o nome do personagem."
      );

      focus(
        "#characterName"
      );

      return false;
    }

    if (!text(state.gender)) {
      warn(
        "Escolha o gênero do personagem."
      );

      return false;
    }


    state.completedSteps[0] =
      true;

    saveState();

    return true;
  }


  function validateRace() {

    if (!state.race) {
      warn(
        "Escolha uma raça antes de continuar."
      );

      return false;
    }


    if (
      normalize(state.race) ===
      "animalha"
    ) {
      if (
        !state.animalhaCategory ||
        !state.animalha
      ) {
        warn(
          "Escolha a categoria e a variação do Animalha."
        );

        return false;
      }
    }


    state.completedSteps[1] =
      true;

    saveState();

    return true;
  }


  function validateAppearance() {

    const height =
      number(
        state.appearance?.height,
        0
      );

    if (height <= 0) {
      warn(
        "Defina a altura do personagem."
      );

      return false;
    }


    state.completedSteps[2] =
      true;

    saveState();

    return true;
  }


  function validateClass() {

    if (!state.class) {
      warn(
        "Escolha uma classe antes de continuar."
      );

      return false;
    }


    state.completedSteps[3] =
      true;

    saveState();

    return true;
  }


  function validateAttributes() {

    /*
      Na criação, atributo NÃO é um número.
      O atributo recebe um tipo de dado (D4, D6, etc.).
      A rolagem acontece somente quando um teste for realizado
      durante o jogo.
    */

    const missingAttribute =
      ATTRIBUTES.find(
        attribute =>
          !state.assignedDice[
            attribute.id
          ]
      );


    if (missingAttribute) {
      warn(
        `Atribua um dado ao atributo ${missingAttribute.name} antes de continuar.`
      );

      return false;
    }


    state.completedSteps[4] =
      true;

    saveState();

    return true;
  }


  function validatePower() {
    if (
      !text(state.primaryPower)
    ) {
      warn(
        "Escolha ou sorteie um poder antes de continuar."
      );

      return false;
    }

    state.completedSteps[5] =
      true;

    saveState();

    return true;
  }


  function validateCurrentStep() {

    switch (
      STEPS[
        state.currentStep
      ]?.id
    ) {

      case "identity":
        return validateIdentity();

      case "race":
        return validateRace();

      case "appearance":
        return validateAppearance();

      case "class":
        return validateClass();

      case "attributes":
        return validateAttributes();

      case "power":
        return validatePower();

      default:
        state.completedSteps[
          state.currentStep
        ] = true;

        saveState();

        return true;
    }
  }


  /* =======================================================
     NAVEGAÇÃO
     ======================================================= */

  function goToStep(
    index,
    validate = true
  ) {
    const target =
      clamp(
        number(index, 0),
        0,
        CONFIG.totalSteps - 1
      );


    if (
      target >
      state.currentStep
    ) {
      if (
        validate &&
        !validateCurrentStep()
      ) {
        return false;
      }
    }


    /*
      Não permite pular várias etapas
      futuras.
    */

    if (
      target >
      state.currentStep + 1
    ) {
      return false;
    }


    state.currentStep =
      target;

    state.saved =
      false;

    saveState();

    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    return true;
  }


  function nextStep() {
    return goToStep(
      state.currentStep + 1,
      true
    );
  }


  function previousStep() {
    if (
      state.currentStep <= 0
    ) {
      return false;
    }

    return goToStep(
      state.currentStep - 1,
      false
    );
  }


  /* =======================================================
     IDENTIDADE
     ======================================================= */

  function setIdentity(
    field,
    value
  ) {
    const allowed = new Set([
      "name",
      "age",
      "gender",
      "description",
      "origin",
      "personality",
      "objective",
      "fear",
      "importantBond",
      "history",
      "region"
    ]);

    if (
      !allowed.has(field)
    ) {
      return false;
    }

    state[field] =
      text(value);

    /*
      Evita recalcular classes/dados
      sem necessidade.
    */

    state.saved = false;

    saveState();

    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );

    return true;
  }


  /* =======================================================
     RAÇA
     ======================================================= */

  function previewRace(
    direction
  ) {
    const races =
      getRaces();

    if (!races.length) {
      warn(
        "Nenhuma raça foi cadastrada."
      );

      return false;
    }


    const current =
      clamp(
        number(
          state.raceIndex,
          0
        ),
        0,
        races.length - 1
      );


    const next =
      clamp(
        current +
          number(
            direction,
            0
          ),
        0,
        races.length - 1
      );


    state.raceIndex =
      next;


    emit(
      "aerion:race:preview",
      {
        race:
          races[next],
        index: next
      }
    );


    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );


    return true;
  }


  function gotoRace(
    index
  ) {
    const races =
      getRaces();

    const next =
      clamp(
        number(index, 0),
        0,
        Math.max(
          0,
          races.length - 1
        )
      );


    state.raceIndex =
      next;


    emit(
      "aerion:race:preview",
      {
        race:
          races[next] ||
          null,
        index: next
      }
    );


    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );
  }


  const RACE_APPEARANCE_DEFAULTS = Object.freeze({
    humano: {
      skinTone: "medio",
      hairColor: "castanho",
      eyeColor: "castanho"
    },

    elfo: {
      skinTone: "claro",
      hairColor: "loiro",
      eyeColor: "verde"
    },

    anao: {
      skinTone: "medio",
      hairColor: "castanho",
      eyeColor: "castanho"
    },

    orc: {
      skinTone: "verde",
      hairColor: "preto",
      eyeColor: "vermelho"
    },

    troll: {
      skinTone: "verde",
      hairColor: "preto",
      eyeColor: "amarelo"
    },

    vampiro: {
      skinTone: "muito_palido",
      hairColor: "preto",
      eyeColor: "vermelho"
    },

    neraliano: {
      skinTone: "azulado",
      hairColor: "azul",
      eyeColor: "azul"
    },

    povo_aquatico: {
      skinTone: "azulado",
      hairColor: "azul",
      eyeColor: "azul"
    },

    fada: {
      skinTone: "claro",
      hairColor: "branco",
      eyeColor: "dourado"
    },

    aureano: {
      skinTone: "claro",
      hairColor: "branco",
      eyeColor: "azul"
    },

    povo_nuvens: {
      skinTone: "claro",
      hairColor: "branco",
      eyeColor: "azul"
    }
  });

  function applyRaceAppearanceDefaults(
    race
  ) {
    const key =
      normalize(
        race?.id ||
        race?.key ||
        race?.name
      );

    const defaults =
      RACE_APPEARANCE_DEFAULTS[key];

    if (!defaults) {
      return;
    }

    Object.entries(
      defaults
    ).forEach(
      ([field, value]) => {
        if (
          !text(
            state.appearance?.[field]
          )
        ) {
          state.appearance[field] =
            value;
        }
      }
    );
  }


  function selectCurrentRace() {
    const races =
      getRaces();

    if (!races.length) {
      warn(
        "Nenhuma raça foi cadastrada."
      );

      return false;
    }


    const index =
      clamp(
        number(
          state.raceIndex,
          0
        ),
        0,
        races.length - 1
      );


    const race =
      races[index];

    if (!race) {
      return false;
    }


    const previousRace =
      normalize(
        state.race
      );

    state.race =
      race.id ||
      race.key ||
      race.slug ||
      race.name ||
      "";

    if (
      previousRace !==
      normalize(state.race)
    ) {
      applyRaceAppearanceDefaults(
        race
      );
    }


    /*
      Ao trocar a raça, o Animalha antigo
      não pode permanecer escondido.
    */

    if (
      normalize(state.race) !==
      "animalha"
    ) {
      state.animalha =
        "";

      state.animalhaCategory =
        "";
    }


    /*
      Ajuste automático da altura
      para dentro dos limites da raça.
    */

    const minHeight =
      number(
        race?.height?.min ??
        race?.heightMin ??
        race?.minHeight,
        0
      );

    const maxHeight =
      number(
        race?.height?.max ??
        race?.heightMax ??
        race?.maxHeight,
        0
      );


    if (
      minHeight > 0 &&
      maxHeight >= minHeight
    ) {

      const currentHeight =
        number(
          state.appearance.height,
          0
        );


      state.appearance.height =
        currentHeight >= minHeight &&
        currentHeight <= maxHeight
          ? currentHeight
          : Math.round(
              (
                minHeight +
                maxHeight
              ) / 2
            );
    }


    state.completedSteps[1] =
      false;


    commit(
      "aerion:race:selected"
    );


    emit(
      "aerion:toast",
      {
        message:
          `${race.name || "Raça"} selecionada.`,
        type: "success"
      }
    );


    return true;
  }


  /* =======================================================
     ANIMALHA
     ======================================================= */

  function selectAnimalhaCategory(
    category
  ) {
    if (
      !category
    ) {
      return false;
    }


    state.animalhaCategory =
      text(category);

    state.animalha =
      "";


    state.completedSteps[1] =
      false;


    commit(
      "aerion:animalha:category"
    );


    return true;
  }


  function selectAnimalhaAnimal(
    animal
  ) {
    if (
      !animal
    ) {
      return false;
    }


    state.animalha =
      text(animal);


    state.completedSteps[1] =
      true;


    commit(
      "aerion:animalha:selected"
    );


    emit(
      "aerion:toast",
      {
        message:
          "Variação Animalha selecionada.",
        type: "success"
      }
    );


    return true;
  }


  /* =======================================================
     APARÊNCIA
     ======================================================= */

  function setAppearance(
    field,
    value
  ) {
    const allowed =
      new Set([
        "height",
        "hairColor",
        "eyeColor",
        "skinTone",
        "hairType",
        "physicalFeatures",
        "scars",
        "description"
      ]);


    if (
      !allowed.has(field)
    ) {
      return false;
    }


    if (
      field === "height"
    ) {
      state.appearance.height =
        number(
          value,
          state.appearance.height ||
            0
        );
    } else {
      state.appearance[field] =
        text(value);
    }


    state.completedSteps[2] =
      false;


    state.saved = false;

    saveState();

    emit(
      "aerion:appearance:update",
      {
        state: clone(state),
        field,
        value
      }
    );

    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );


    return true;
  }


  /* =======================================================
     CLASSE
     ======================================================= */

  function selectClass(
    classId
  ) {
    const selected =
      getClass(classId);

    if (!selected) {
      warn(
        "Classe inválida."
      );

      return false;
    }


    state.class =
      selected.id;


    state.classIndex =
      Object.keys(
        CLASSES
      ).indexOf(
        selected.id
      );


    /*
      O bônus de mana da classe
      fica guardado junto da mana máxima.
    */

    const oldBonus =
      number(
        state.mana.classBonus,
        0
      );


    const baseMax =
      Math.max(
        0,
        number(
          state.mana.max,
          0
        ) - oldBonus
      );


    state.mana =
      {
        ...state.mana,
        classBonus:
          selected.manaBonus,
        max:
          baseMax +
          selected.manaBonus,
        current:
          Math.min(
            number(
              state.mana.current,
              0
            ),
            baseMax +
              selected.manaBonus
          )
      };


    state.completedSteps[3] =
      true;


    commit(
      "aerion:class:selected"
    );


    emit(
      "aerion:toast",
      {
        message:
          `${selected.name} selecionado.`,
        type: "success"
      }
    );


    return true;
  }


  function previewClass(
    direction
  ) {
    const ids =
      Object.keys(
        CLASSES
      );

    if (!ids.length) {
      return false;
    }


    const current =
      clamp(
        number(
          state.classIndex,
          0
        ),
        0,
        ids.length - 1
      );


    const next =
      clamp(
        current +
          number(
            direction,
            0
          ),
        0,
        ids.length - 1
      );


    state.classIndex =
      next;


    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );


    return true;
  }


  /* =======================================================
     ATRIBUTOS
     ======================================================= */

  function selectAttribute(
    attributeId
  ) {
    const id =
      normalize(attributeId);

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      warn(
        "Atributo inválido."
      );

      return false;
    }


    state.selectedAttribute =
      id;


    state.saved = false;

    saveState();

    emit(
      "aerion:attribute:selected",
      {
        attributeId: id,
        state: clone(state)
      }
    );


    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );


    return true;
  }


  /* =======================================================
     DADOS
     ======================================================= */

  function isDieAssigned(
    dieId
  ) {
    return Object.values(
      state.assignedDice
    ).includes(
      dieId
    );
  }


  function getAttributeForDie(
    dieId
  ) {
    return ATTRIBUTES.find(
      attribute =>
        state.assignedDice[
          attribute.id
        ] === dieId
    ) || null;
  }


  function assignDie(
    attributeId,
    dieId
  ) {
    const id =
      normalize(attributeId);

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      warn(
        "Primeiro selecione um atributo."
      );

      return false;
    }


    if (
      !DICE_BY_ID[dieId]
    ) {
      warn(
        "Dado inválido."
      );

      return false;
    }


    const currentAttribute =
      state.assignedDice[id];


    /*
      Clicando no mesmo dado novamente:
      remove o dado daquele atributo.
    */

    if (
      currentAttribute ===
      dieId
    ) {

      state.assignedDice[id] =
        null;

      delete state.diceResults[
        dieId
      ];

      state.completedSteps[4] =
        ATTRIBUTES.every(
          attribute =>
            Boolean(
              state.assignedDice[
                attribute.id
              ]
            )
        );

      commit(
        "aerion:dice:update"
      );

      return true;
    }


    /*
      Não permite o mesmo dado em
      dois atributos.
    */

    const occupiedBy =
      getAttributeForDie(
        dieId
      );


    if (
      occupiedBy &&
      occupiedBy.id !== id
    ) {
      warn(
        `${DICE_BY_ID[dieId].type.toUpperCase()} já está atribuído a ${occupiedBy.name}.`
      );

      return false;
    }


    /*
      Se o atributo já possuía outro dado,
      retiramos o resultado anterior.
    */

    if (
      currentAttribute
    ) {
      delete state.diceResults[
        currentAttribute
      ];
    }


    state.assignedDice[id] =
      dieId;

    delete state.diceResults[
      dieId
    ];


    state.completedSteps[4] =
      ATTRIBUTES.every(
        attribute =>
          Boolean(
            state.assignedDice[
              attribute.id
            ]
          )
      );


    commit(
      "aerion:dice:update"
    );


    return true;
  }


  function removeDie(
    attributeId
  ) {
    const id =
      normalize(attributeId);

    if (!ATTRIBUTE_IDS.has(id)) {
      warn(
        "Atributo inválido."
      );
      return false;
    }

    const dieId =
      state.assignedDice[id];

    if (!dieId) {
      return false;
    }

    state.assignedDice[id] = null;
    delete state.diceResults[dieId];
    state.attributes[id] = null;
    state.completedSteps[4] =
      ATTRIBUTES.every(
        attribute =>
          Boolean(
            state.assignedDice[
              attribute.id
            ]
          )
      );

    commit(
      "aerion:dice:update"
    );

    return true;
  }


  function rollAttribute(
    attributeId
  ) {
    const id =
      normalize(attributeId);

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      warn(
        "Selecione um atributo."
      );

      return false;
    }


    const dieId =
      state.assignedDice[id];

    if (!dieId) {
      warn(
        "Atribua um dado a esse atributo primeiro."
      );

      return false;
    }


    const die =
      DICE_BY_ID[dieId];

    if (!die) {
      return false;
    }


    const result =
      Math.floor(
        Math.random() *
          die.sides
      ) + 1;


    state.diceResults[dieId] =
      result;


    state.attributes[id] =
      result;


    state.lastRoll = {
      attribute:
        id,
      die:
        dieId,
      sides:
        die.sides,
      result,
      timestamp:
        Date.now()
    };


    const complete =
      ATTRIBUTES.every(
        attribute =>
          Boolean(
            state.assignedDice[
              attribute.id
            ]
          ) &&
          state.diceResults[
            state.assignedDice[
              attribute.id
            ]
          ] != null
      );


    state.completedSteps[4] =
      ATTRIBUTES.every(
        attribute =>
          Boolean(
            state.assignedDice[
              attribute.id
            ]
          )
      );


    commit(
      "aerion:dice:update"
    );


    emit(
      "aerion:toast",
      {
        message:
          `${attributeName(id)}: ${result} no D${die.sides}.`,
        type: "success"
      }
    );


    return result;
  }


  function rollSelectedAttribute() {
    if (
      !state.selectedAttribute
    ) {
      warn(
        "Selecione um atributo antes de rolar."
      );

      return false;
    }

    return rollAttribute(
      state.selectedAttribute
    );
  }


  function rollAllDice() {
    let rolled = 0;


    ATTRIBUTES.forEach(
      attribute => {

        const dieId =
          state.assignedDice[
            attribute.id
          ];

        if (!dieId) {
          return;
        }

        const die =
          DICE_BY_ID[dieId];

        if (!die) {
          return;
        }

        const result =
          Math.floor(
            Math.random() *
              die.sides
          ) + 1;

        state.diceResults[
          dieId
        ] = result;

        state.attributes[
          attribute.id
        ] = result;

        rolled++;
      }
    );


    const complete =
      ATTRIBUTES.every(
        attribute =>
          Boolean(
            state.assignedDice[
              attribute.id
            ]
          ) &&
          state.diceResults[
            state.assignedDice[
              attribute.id
            ]
          ] != null
      );


    state.completedSteps[4] =
      complete;


    if (rolled) {
      state.lastRoll = {
        attribute:
          "all",
        count:
          rolled,
        timestamp:
          Date.now()
      };
    }


    commit(
      "aerion:dice:update"
    );


    emit(
      "aerion:toast",
      {
        message:
          `${rolled} dado(s) rolado(s).`,
        type:
          rolled
            ? "success"
            : "warning"
      }
    );


    return rolled;
  }


  function attributeName(
    id
  ) {
    return (
      ATTRIBUTES.find(
        item =>
          item.id === id
      )?.name ||
      id
    );
  }


  /* =======================================================
     PODER
     ======================================================= */

  function setPower(
    field,
    value
  ) {
    if (
      field !==
        "primaryPower" &&
      field !==
        "parallelPower"
    ) {
      return false;
    }

    const nextValue =
      text(value);

    state[field] =
      nextValue;

    if (
      field ===
      "primaryPower"
    ) {
      state.powerMode =
        "manual";
      state.powerRoll = null;
      state.completedSteps[5] =
        Boolean(nextValue);
    }

    commit(
      "aerion:power:update"
    );

    return true;
  }


  /* =======================================================
     MANA
     ======================================================= */

  function setMana(
    field,
    value
  ) {
    if (
      ![
        "current",
        "max",
        "type"
      ].includes(field)
    ) {
      return false;
    }


    if (
      field ===
      "current" ||
      field ===
      "max"
    ) {
      state.mana[field] =
        Math.max(
          0,
          number(value, 0)
        );
    } else {
      state.mana[field] =
        text(value);
    }


    if (
      state.mana.current >
      state.mana.max
    ) {
      state.mana.current =
        state.mana.max;
    }


    commit();

    return true;
  }


  /* =======================================================
     PERÍCIAS
     ======================================================= */

  function setSkill(
    skill,
    value
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        SKILLS,
        skill
      )
    ) {
      return false;
    }


    state.skills[skill] =
      number(value, 0);

    commit();

    return true;
  }


  /* =======================================================
     AVATAR
     ======================================================= */

  function setAvatarFile(
    file
  ) {
    if (!file) {
      return false;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      warn(
        "Escolha uma imagem válida."
      );

      return false;
    }


    if (
      file.size >
      CONFIG.maxImageSize
    ) {
      warn(
        "A imagem é muito grande. Limite: 6 MB."
      );

      return false;
    }


    const reader =
      new FileReader();


    reader.onload = () => {

      state.avatar =
        String(
          reader.result || ""
        );

      state.avatarName =
        file.name;


      commit(
        "aerion:avatar:update"
      );


      emit(
        "aerion:toast",
        {
          message:
            "Imagem adicionada.",
          type:
            "success"
        }
      );

    };


    reader.onerror = () => {
      warn(
        "Não foi possível carregar a imagem."
      );
    };


    reader.readAsDataURL(
      file
    );


    return true;
  }


  function removeAvatar() {
    state.avatar = "";
    state.avatarName = "";

    commit(
      "aerion:avatar:update"
    );

    return true;
  }


  /* =======================================================
     TÉCNICAS
     ======================================================= */

  function setTechnique(
    index,
    field,
    value
  ) {
    const techniqueIndex =
      Math.max(
        0,
        number(index, 0)
      );


    if (
      !state.techniques[
        techniqueIndex
      ]
    ) {
      state.techniques[
        techniqueIndex
      ] = {};
    }


    state.techniques[
      techniqueIndex
    ][field] =
      text(value);


    commit();

    return true;
  }


  /* =======================================================
     INVENTÁRIO
     ======================================================= */

  function setInventory(
    index,
    field,
    value
  ) {
    const itemIndex =
      Math.max(
        0,
        number(index, 0)
      );


    if (
      !state.inventory[
        itemIndex
      ]
    ) {
      state.inventory[
        itemIndex
      ] = {};
    }


    state.inventory[
      itemIndex
    ][field] =
      text(value);


    commit();

    return true;
  }


  /* =======================================================
     FOCO
     ======================================================= */

  function focus(
    selector
  ) {
    setTimeout(() => {
      const element =
        document.querySelector(
          selector
        );

      if (
        element &&
        typeof element.focus ===
          "function"
      ) {
        element.focus();
      }
    }, 20);
  }


  /* =======================================================
     AVISOS
     ======================================================= */

  function warn(
    message
  ) {
    emit(
      "aerion:toast",
      {
        message,
        type:
          "warning"
      }
    );


    emit(
      "aerion:warning",
      {
        message
      }
    );


    console.warn(
      "[AERION]",
      message
    );
  }


  /* =======================================================
     EVENTOS DE INPUT
     ======================================================= */

  function handleInput(
    event
  ) {
    const target =
      event.target;


    if (!target) {
      return;
    }


    /*
      Identidade.
    */

    const identityField =
      target.dataset
        ?.identityField;


    if (identityField) {

      setIdentity(
        identityField,
        target.value
      );

      return;
    }


    /*
      Compatibilidade com IDs antigos.
    */

    const identityById = {
      characterName:
        "name",

      characterAge:
        "age",

      characterDescription:
        "description",

      characterOrigin:
        "origin"
    };


    if (
      identityById[
        target.id
      ]
    ) {

      setIdentity(
        identityById[
          target.id
        ],
        target.value
      );

      return;
    }


    /*
      Conceito.
    */

    const conceptField =
      target.dataset
        ?.conceptField;


    if (conceptField) {

      setIdentity(
        conceptField,
        target.value
      );

      return;
    }


    /*
      Aparência.
    */

    const appearanceField =
      target.dataset
        ?.appearanceField ||
      target.dataset
        ?.appearanceCustom;


    if (appearanceField) {

      setAppearance(
        appearanceField,
        target.value
      );

      return;
    }


    /*
      Poder.
    */

    const powerField =
      target.dataset
        ?.power ||
      target.dataset
        ?.powerField;


    if (powerField) {

      setPower(
        powerField,
        target.value
      );

      return;
    }


    /*
      Mana.
    */

    const manaField =
      target.dataset
        ?.mana ||
      target.dataset
        ?.manaField;


    if (manaField) {

      setMana(
        manaField,
        target.value
      );

      return;
    }


    /*
      Perícia.
    */

    const skill =
      target.dataset
        ?.skill ||
      target.dataset
        ?.skillId;


    if (skill) {

      setSkill(
        skill,
        target.value
      );

      return;
    }


    /*
      Técnica.
    */

    if (
      target.dataset
        ?.techniqueField
    ) {

      setTechnique(
        target.closest(
          "[data-technique-index]"
        )?.dataset
          ?.techniqueIndex,
        target.dataset
          .techniqueField,
        target.value
      );

      return;
    }


    /*
      Inventário.
    */

    if (
      target.dataset
        ?.inventoryField
    ) {

      setInventory(
        target.closest(
          "[data-inventory-index]"
        )?.dataset
          ?.inventoryIndex,
        target.dataset
          .inventoryField,
        target.value
      );

      return;
    }


    /*
      Altura.
    */

    if (
      target.dataset
        ?.height !== undefined ||
      target.id ===
        "appearanceHeight"
    ) {

      setAppearance(
        "height",
        target.value
      );

      return;
    }
  }


  /* =======================================================
     CHANGE
     ======================================================= */

  function handleChange(
    event
  ) {
    const target =
      event.target;


    if (!target) {
      return;
    }


    /*
      Gênero.
    */

    if (
      target.name ===
      "gender"
    ) {

      setIdentity(
        "gender",
        target.value
      );

      return;
    }


    /*
      Avatar.
    */

    if (
      target.id ===
      "avatarInput"
    ) {

      setAvatarFile(
        target.files?.[0]
      );

      return;
    }


    /*
      Inputs de aparência,
      caso o navegador só dispare change.
    */

    const appearanceField =
      target.dataset
        ?.appearanceField ||
      target.dataset
        ?.appearanceCustom;


    if (
      appearanceField
    ) {

      setAppearance(
        appearanceField,
        target.value
      );

      return;
    }
  }


  /* =======================================================
     ACTION DISPATCHER
     ======================================================= */

  function handleAction(
    action,
    target
  ) {
    switch (action) {

      /* -----------------------------------------
         NAVEGAÇÃO
         ----------------------------------------- */

      case "next-step":
        nextStep();
        return;


      case "previous-step":
        previousStep();
        return;


      case "go-step":
        goToStep(
          target.dataset.step,
          true
        );
        return;


      /* -----------------------------------------
         RAÇA
         ----------------------------------------- */

      case "race-previous":
        previewRace(-1);
        return;


      case "race-next":
        previewRace(1);
        return;


      case "race-goto":
        gotoRace(
          target.dataset
            .raceIndex
        );
        return;


      case "select-race-current":
        selectCurrentRace();
        return;


      /* -----------------------------------------
         ANIMALHA
         ----------------------------------------- */

      case "select-animalha-category":
        selectAnimalhaCategory(
          target.dataset
            .category
        );
        return;


      case "select-animalha-animal":
        selectAnimalhaAnimal(
          target.dataset
            .animal
        );
        return;


      /* -----------------------------------------
         APARÊNCIA
         ----------------------------------------- */

      case "remove-avatar":
        removeAvatar();
        return;


      /* -----------------------------------------
         PODER
         ----------------------------------------- */

      case "roll-power":
        rollPowerD100();
        return;


      case "select-uncommon-power":
        selectUncommonPower(
          target.dataset
            .power
        );
        return;


      /* -----------------------------------------
         CLASSE
         ----------------------------------------- */

      case "class-previous":
        previewClass(-1);
        return;


      case "class-next":
        previewClass(1);
        return;


      case "select-class":

        selectClass(
          target.dataset
            .classId ||
          target.dataset
            .class
        );

        return;


      /* -----------------------------------------
         ATRIBUTOS
         ----------------------------------------- */

      case "select-attribute":

        selectAttribute(
          target.dataset
            .attribute ||
          target.dataset
            .attributeCard
        );

        return;


      /* -----------------------------------------
         DADOS
         ----------------------------------------- */

      case "roll-attribute":

        rollAttribute(
          target.dataset
            .attribute ||
          target.dataset
            .attributeCard
        );

        return;


      case "remove-die":

        removeDie(
          target.dataset
            .attribute ||
          target.dataset
            .attributeCard
        );

        return;


      case "assign-die": {

        const selectedAttribute =
          state.selectedAttribute ||
          target.dataset
            .attribute;


        if (
          !selectedAttribute
        ) {

          warn(
            "Selecione um atributo primeiro."
          );

          return;
        }


        assignDie(
          selectedAttribute,
          target.dataset
            .dieId
        );

        return;
      }


      case "roll-selected-die":
        rollSelectedAttribute();
        return;


      case "roll-all-dice":
        rollAllDice();
        return;


      /* -----------------------------------------
         SALVAR
         ----------------------------------------- */

      case "save":
        saveState(true);

        emit(
          "aerion:toast",
          {
            message:
              "Ficha salva.",
            type:
              "success"
          }
        );

        return;


      default:

        console.warn(
          `[AERION] Ação desconhecida: ${action}`
        );

    }
  }


  /* =======================================================
     CLICK GLOBAL
     ======================================================= */

  function handleClick(
    event
  ) {
    const target =
      event.target?.closest(
        "[data-action]"
      );


    if (!target) {
      return;
    }


    const action =
      target.dataset.action;


    if (!action) {
      return;
    }


    event.preventDefault();


    handleAction(
      action,
      target
    );
  }


  /* =======================================================
     INIT
     ======================================================= */

  function init() {

    state =
      loadState();


    document.addEventListener(
      "click",
      handleClick
    );


    document.addEventListener(
      "input",
      handleInput
    );


    document.addEventListener(
      "change",
      handleChange
    );


    /*
      Sincronização inicial.
    */

    emit(
      "aerion:ficha:update",
      {
        state: clone(state)
      }
    );


    window.addEventListener(
      "beforeunload",
      () => {
        saveState(true);
      }
    );


    console.log(
      "[AERION] Ficha inicializada."
    );
  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  window.AERIONFicha = {

    getState,

    setState,

    save:
      () => saveState(true),

    reset:
      () => {
        state =
          createDefaultState();

        saveState(true);

        emit(
          "aerion:ficha:update",
          {
            state:
              clone(state)
          }
        );
      },

    nextStep,

    previousStep,

    goToStep,

    selectCurrentRace,

    previewRace,

    selectAnimalhaCategory,

    selectAnimalhaAnimal,

    setAppearance,

    selectClass,

    previewClass,

    selectAttribute,

    assignDie,

    removeDie,

    rollAttribute,

    rollSelectedAttribute,

    rollAllDice,

    setIdentity,

    setPower,

    rollPowerD100,

    selectUncommonPower,

    setMana,

    setSkill,

    setTechnique,

    setInventory,

    setAvatarFile,

    removeAvatar
  };


  /*
    Compatibilidade com possíveis scripts
    antigos do projeto.
  */

  window.AERION_FICHA =
    window.AERIONFicha;


  /* =======================================================
     START
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();