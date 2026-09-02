/* =========================================================
   AERION — FICHA
   js/core/ficha.js

   NÚCLEO DA FICHA

   RESPONSÁVEL POR:
   - estado do personagem;
   - identidade;
   - gênero;
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
   - ações da interface.

   NÃO RESPONSÁVEL POR:
   - renderização visual;
   - CSS;
   - desenho do personagem.

   IMPORTANTE:
   Este arquivo é o ÚNICO dono das ações [data-action].

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({

    storageKey:
      "aerion:ficha:draft:v17",

    autosaveDelay:
      350,

    maxImageSize:
      6 * 1024 * 1024,

    totalSteps:
      11

  });


  /* =========================================================
     ETAPAS
     ========================================================= */

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


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTES = Object.freeze([

    {
      id: "presenca",
      name: "Presença"
    },

    {
      id: "precisao",
      name: "Precisão"
    },

    {
      id: "intelecto",
      name: "Intelecto"
    },

    {
      id: "controle",
      name: "Controle"
    },

    {
      id: "percepcao",
      name: "Percepção"
    },

    {
      id: "vigor",
      name: "Vigor"
    },

    {
      id: "agilidade",
      name: "Agilidade"
    },

    {
      id: "forca",
      name: "Força"
    }

  ]);

  const ATTRIBUTE_IDS =
    new Set(
      ATTRIBUTES.map(
        attribute =>
          attribute.id
      )
    );


  /* =========================================================
     DADOS
     ========================================================= */

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

  const DICE_BY_ID =
    Object.freeze(
      Object.fromEntries(
        DICE.map(
          die => [
            die.id,
            die
          ]
        )
      )
    );


  /* =========================================================
     CLASSES
     ========================================================= */

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


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  const SKILLS = Object.freeze({

    acrobacia:
      "Acrobacia",

    atletismo:
      "Atletismo",

    furtividade:
      "Furtividade",

    percepcao:
      "Percepção",

    investigacao:
      "Investigação",

    conhecimento:
      "Conhecimento",

    medicina:
      "Medicina",

    sobrevivencia:
      "Sobrevivência",

    persuasao:
      "Persuasão",

    intuicao:
      "Intuição",

    enganacao:
      "Enganação",

    tatica:
      "Tática",

    oficio:
      "Ofício / Crafting",

    controle_mana:
      "Controle de Mana"

  });


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function clone(
    value
  ) {

    try {

      return JSON.parse(
        JSON.stringify(
          value
        )
      );

    } catch {

      return value;
    }
  }


  function text(
    value
  ) {

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

    return Number.isFinite(
      parsed
    )
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


  function normalize(
    value
  ) {

    return text(value)

      .toLowerCase()

      .normalize(
        "NFD"
      )

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
        window.AERION_RACES
      )
    ) {

      return window.AERION_RACES;

    }


    return [];

  }


  function getRaceById(
    raceId
  ) {

    const wanted =
      normalize(
        raceId
      );


    const assets =
      getAssets();


    if (
      assets &&
      typeof assets.getRace ===
        "function"
    ) {

      return (
        assets.getRace(
          raceId
        ) ||
        null
      );

    }


    return (
      getRaces().find(
        race =>
          normalize(
            race?.id
          ) ===
          wanted
      ) ||
      null
    );

  }


  function getAnimalhaAnimals() {

    const assets =
      getAssets();


    if (
      Array.isArray(
        assets?.animalhaAnimals
      )
    ) {

      return assets.animalhaAnimals;

    }


    return [];

  }


  function findAnimalha(
    animalId
  ) {

    const wanted =
      normalize(
        animalId
      );


    return (
      getAnimalhaAnimals()
        .find(
          animal =>
            normalize(
              animal?.id
            ) ===
            wanted
        ) ||
      null
    );

  }


  /* =========================================================
     ESTADO PADRÃO
     ========================================================= */

  function emptyAttributes() {

    return Object.fromEntries(
      ATTRIBUTES.map(
        attribute => [
          attribute.id,
          null
        ]
      )
    );

  }


  function emptyAssignedDice() {

    return Object.fromEntries(
      ATTRIBUTES.map(
        attribute => [
          attribute.id,
          null
        ]
      )
    );

  }


  function emptySkills() {

    return Object.fromEntries(
      Object.keys(
        SKILLS
      ).map(
        id => [
          id,
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


      /* =====================================================
         IDENTIDADE
         ===================================================== */

      name: "",

      age: "",

      gender: "",

      description: "",

      origin: "",


      /* =====================================================
         CONCEITO COMPLETO
         ===================================================== */

      personality: "",

      objective: "",

      fear: "",

      importantBond: "",

      history: "",

      region: "",


      /* =====================================================
         RAÇA
         ===================================================== */

      race: "",

      raceIndex: 0,


      /* =====================================================
         ANIMALHA
         ===================================================== */

      animalha: "",

      animalhaCategory: "",


      /* =====================================================
         APARÊNCIA
         ===================================================== */

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


      /* =====================================================
         IMAGEM PERSONALIZADA
         ===================================================== */

      avatar: "",

      avatarName: "",


      /* =====================================================
         CLASSE
         ===================================================== */

      class: "",


      /* =====================================================
         ATRIBUTOS
         ===================================================== */

      attributes:
        emptyAttributes(),


      /* =====================================================
         DADOS
         ===================================================== */

      assignedDice:
        emptyAssignedDice(),

      diceResults: {},

      lastRoll: null,


      /* =====================================================
         PODER
         ===================================================== */

      primaryPower: "",

      parallelPower: "",


      /* =====================================================
         MANA
         ===================================================== */

      mana: {

        current: 0,

        max: 0,

        type: ""

      },


      /* =====================================================
         PERÍCIAS
         ===================================================== */

      skills:
        emptySkills(),


      /* =====================================================
         TÉCNICAS
         ===================================================== */

      techniques: [],


      /* =====================================================
         INVENTÁRIO
         ===================================================== */

      inventory: [],


      /* =====================================================
         VIDA / COMBATE
         ===================================================== */

      hp: {

        current: 0,

        max: 0

      },

      defense: 0,

      initiative: 0,

      movement: 0,


      /* =====================================================
         DINHEIRO
         ===================================================== */

      money: 0,


      /* =====================================================
         SALVAMENTO
         ===================================================== */

      saved: false

    };

  }


  /* =========================================================
     ESTADO
     ========================================================= */

  let state =
    createDefaultState();

  let saveTimer =
    null;


  /* =========================================================
     ESTADO NORMALIZADO
     ========================================================= */

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


    const result = {

      ...defaults,

      ...source

    };


    result.currentStep =
      clamp(
        number(
          source.currentStep,
          0
        ),
        0,
        CONFIG.totalSteps - 1
      );


    result.completedSteps =
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


    result.appearance = {

      ...defaults.appearance,

      ...(
        source.appearance ||
        {}
      )

    };


    result.attributes = {

      ...defaults.attributes,

      ...(
        source.attributes ||
        {}
      )

    };


    result.assignedDice = {

      ...defaults.assignedDice,

      ...(
        source.assignedDice ||
        {}
      )

    };


    result.diceResults = {

      ...(
        source.diceResults ||
        {}
      )

    };


    result.skills = {

      ...defaults.skills,

      ...(
        source.skills ||
        {}
      )

    };


    result.mana = {

      ...defaults.mana,

      ...(
        source.mana ||
        {}
      )

    };


    result.hp = {

      ...defaults.hp,

      ...(
        source.hp ||
        {}
      )

    };


    result.techniques =
      Array.isArray(
        source.techniques
      )
        ? source.techniques
        : [];


    result.inventory =
      Array.isArray(
        source.inventory
      )
        ? source.inventory
        : [];


    /*
     * Nunca deixa etapas futuras
     * marcadas como concluídas.
     */

    for (
      let index = 0;
      index < result.completedSteps.length;
      index++
    ) {

      if (
        index >
        result.currentStep
      ) {

        result.completedSteps[
          index
        ] = false;

      }

    }


    return result;

  }


  /* =========================================================
     SALVAMENTO
     ========================================================= */

  function updateSaveStatus(
    saved
  ) {

    const element =
      document.querySelector(
        "#saveStatusText"
      );


    if (element) {

      element.textContent =
        saved
          ? "Salvo"
          : "Salvamento automático";

    }

  }


  function saveNow() {

    try {

      state.saved =
        true;

      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(
          state
        )
      );

      updateSaveStatus(
        true
      );


      emit(
        "aerion:ficha:saved",
        {
          state:
            clone(state)
        }
      );


      return true;

    } catch (
      error
    ) {

      state.saved =
        false;

      updateSaveStatus(
        false
      );


      console.error(
        "[AERION][FICHA] Erro ao salvar:",
        error
      );


      return false;

    }

  }


  function scheduleSave() {

    state.saved =
      false;

    updateSaveStatus(
      false
    );


    if (saveTimer) {

      clearTimeout(
        saveTimer
      );

    }


    saveTimer =
      setTimeout(
        saveNow,
        CONFIG.autosaveDelay
      );

  }


  /* =========================================================
     CARREGAR
     ========================================================= */

  function loadSavedState() {

    try {

      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );


      if (!raw) {

        return false;

      }


      const parsed =
        JSON.parse(
          raw
        );


      state =
        normalizeState(
          parsed
        );


      state.saved =
        true;


      updateSaveStatus(
        true
      );


      return true;

    } catch (
      error
    ) {

      console.warn(
        "[AERION][FICHA] Não foi possível carregar o rascunho:",
        error
      );


      state =
        createDefaultState();


      return false;

    }

  }


  /* =========================================================
     EVENTO CENTRAL DE ATUALIZAÇÃO
     ========================================================= */

  function notify(
    reason = ""
  ) {

    emit(
      "aerion:ficha:updated",
      {

        state:
          clone(state),

        reason,

        step:
          state.currentStep,

        stepId:
          STEPS[
            state.currentStep
          ]?.id || ""

      }
    );

  }


  function commit(
    reason = ""
  ) {

    scheduleSave();

    notify(
      reason
    );

  }


  /* =========================================================
     GETTERS
     ========================================================= */

  function getState() {

    return clone(
      state
    );

  }


  function getCurrentStep() {

    return state.currentStep;

  }


  function getCurrentStepData() {

    return (
      STEPS[
        state.currentStep
      ] ||
      null
    );

  }


  /* =========================================================
     VALIDAR IDENTIDADE
     ========================================================= */

  function validateIdentity() {

    if (
      !text(
        state.name
      )
    ) {

      return {
        valid: false,
        message:
          "Digite o nome do personagem."
      };

    }


    if (
      !text(
        state.gender
      )
    ) {

      return {
        valid: false,
        message:
          "Escolha o gênero do personagem."
      };

    }


    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function validateRace() {

    if (
      !state.race
    ) {

      return {
        valid: false,
        message:
          "Selecione uma raça antes de continuar."
      };

    }


    const race =
      getRaceById(
        state.race
      );


    if (!race) {

      return {
        valid: false,
        message:
          "A raça selecionada não foi encontrada."
      };

    }


    if (
      normalize(
        race.id
      ) ===
      "animalha"
    ) {

      if (
        !state.animalhaCategory
      ) {

        return {
          valid: false,
          message:
            "Escolha uma categoria de Animalha."
        };

      }


      if (
        !state.animalha
      ) {

        return {
          valid: false,
          message:
            "Escolha uma linhagem de Animalha."
        };

      }

    }


    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function validateAppearance() {

    const race =
      getRaceById(
        state.race
      );


    if (!race) {

      return {
        valid: false,
        message:
          "Selecione uma raça primeiro."
      };

    }


    const min =
      number(
        race.height?.min,
        0
      );

    const max =
      number(
        race.height?.max,
        0
      );


    const height =
      number(
        state.appearance?.height,
        NaN
      );


    if (
      !Number.isFinite(
        height
      )
    ) {

      return {
        valid: false,
        message:
          "Defina a altura do personagem."
      };

    }


    if (
      min &&
      max &&
      (
        height < min ||
        height > max
      )
    ) {

      return {
        valid: false,
        message:
          `A altura deve estar entre ${min} e ${max} cm.`
      };

    }


    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function validateClass() {

    const id =
      normalize(
        state.class
      );


    if (!id) {

      return {
        valid: false,
        message:
          "Escolha uma classe."
      };

    }


    if (
      !CLASSES[id]
    ) {

      return {
        valid: false,
        message:
          "A classe selecionada não existe."
      };

    }


    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function isAttributeComplete(
    attributeId
  ) {

    const die =
      state.assignedDice?.[
        attributeId
      ];


    const result =
      state.diceResults?.[
        attributeId
      ];


    return Boolean(
      die &&
      result !== undefined &&
      result !== null
    );

  }


  function countCompletedAttributes() {

    return ATTRIBUTES.filter(
      attribute =>
        isAttributeComplete(
          attribute.id
        )
    ).length;

  }


  function validateAttributes() {

    const missing =
      ATTRIBUTES.filter(
        attribute =>
          !isAttributeComplete(
            attribute.id
          )
      );


    if (
      missing.length
    ) {

      return {
        valid: false,
        message:
          `Preencha todos os 8 atributos. Faltam ${missing.length}.`
      };

    }


    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     PODER
     ========================================================= */

  function validatePower() {

    if (
      !text(
        state.primaryPower
      )
    ) {

      return {
        valid: false,
        message:
          "Escolha ou registre o poder do personagem."
      };

    }


    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     MANA
     ========================================================= */

  function validateMana() {

    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function validateSkills() {

    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function validateTechniques() {

    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function validateInventory() {

    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     REVISÃO
     ========================================================= */

  function validateReview() {

    return {
      valid: true,
      message: ""
    };

  }


  /* =========================================================
     VALIDADOR CENTRAL
     ========================================================= */

  function validateStep(
    index
  ) {

    switch (
      Number(index)
    ) {

      case 0:
        return validateIdentity();

      case 1:
        return validateRace();

      case 2:
        return validateAppearance();

      case 3:
        return validateClass();

      case 4:
        return validateAttributes();

      case 5:
        return validatePower();

      case 6:
        return validateMana();

      case 7:
        return validateSkills();

      case 8:
        return validateTechniques();

      case 9:
        return validateInventory();

      case 10:
        return validateReview();

      default:

        return {
          valid: false,
          message:
            "Etapa inválida."
        };

    }

  }


  /* =========================================================
     CONCLUIR ETAPA
     ========================================================= */

  function completeStep(
    index
  ) {

    const validation =
      validateStep(
        index
      );


    if (
      !validation.valid
    ) {

      return validation;

    }


    state.completedSteps[
      index
    ] = true;


    commit(
      `step-${index}-completed`
    );


    return validation;

  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function setIdentity(
    field,
    value
  ) {

    const allowed =
      new Set([

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
      !allowed.has(
        field
      )
    ) {

      return false;

    }


    state[field] =
      text(
        value
      );


    /*
     * Alterar identidade pode
     * invalidar a conclusão.
     */

    if (
      field === "name" ||
      field === "gender"
    ) {

      state.completedSteps[0] =
        false;

    }


    commit(
      `identity-${field}`
    );


    return true;

  }


  /* =========================================================
     GÊNERO
     ========================================================= */

  function setGender(
    gender
  ) {

    const value =
      normalize(
        gender
      );


    if (
      value !== "masculino" &&
      value !== "feminino"
    ) {

      return false;

    }


    state.gender =
      value;


    /*
     * A mudança do gênero muda
     * somente a imagem escolhida.
     */

    commit(
      "gender"
    );


    emit(
      "aerion:gender:updated",
      {
        gender:
          value
      }
    );


    return true;

  }


  /* =========================================================
     RAÇA — PRÉ-VISUALIZAÇÃO
     ========================================================= */

  function getRaceIndex() {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return 0;

    }


    return clamp(
      number(
        state.raceIndex,
        0
      ),
      0,
      races.length - 1
    );

  }


  function getPreviewRace() {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return null;

    }


    return (
      races[
        getRaceIndex()
      ] ||
      races[0] ||
      null
    );

  }


  function previewRace(
    direction
  ) {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return null;

    }


    let index =
      getRaceIndex();


    const step =
      Number(direction) < 0
        ? -1
        : 1;


    index += step;


    if (
      index < 0
    ) {

      index =
        races.length - 1;

    }


    if (
      index >=
      races.length
    ) {

      index = 0;

    }


    state.raceIndex =
      index;


    const race =
      races[index];


    emit(
      "aerion:race:preview",
      {
        race:
          clone(race),

        index
      }
    );


    notify(
      "race-preview"
    );


    return race;

  }


  /* =========================================================
     RAÇA — SELEÇÃO
     ========================================================= */

  function selectRace(
    raceId,
    raceIndex = null
  ) {

    const race =
      getRaceById(
        raceId
      );


    if (!race) {

      console.warn(
        "[AERION][FICHA] Raça não encontrada:",
        raceId
      );


      return false;

    }


    const previousRace =
      state.race;


    state.race =
      race.id;


    const races =
      getRaces();


    const indexFromId =
      races.findIndex(
        item =>
          item.id ===
          race.id
      );


    state.raceIndex =
      raceIndex !== null
        ? clamp(
            number(
              raceIndex,
              indexFromId >= 0
                ? indexFromId
                : 0
            ),
            0,
            Math.max(
              0,
              races.length - 1
            )
          )
        : (
            indexFromId >= 0
              ? indexFromId
              : 0
          );


    /*
     * Ao trocar de raça,
     * a escolha de Animalha precisa
     * ser apagada quando deixa
     * de ser Animalha.
     */

    if (
      normalize(
        race.id
      ) !==
      "animalha"
    ) {

      state.animalha =
        "";

      state.animalhaCategory =
        "";

    }


    /*
     * Ajusta altura para ficar
     * dentro do limite da raça.
     */

    const min =
      number(
        race.height?.min,
        0
      );

    const max =
      number(
        race.height?.max,
        0
      );


    if (
      min &&
      max
    ) {

      const current =
        number(
          state.appearance?.height,
          NaN
        );


      if (
        !Number.isFinite(
          current
        )
      ) {

        state.appearance.height =
          Math.round(
            (
              min +
              max
            ) / 2
          );

        } else {

          state.appearance.height =
            clamp(
              current,
              min,
              max
            );

        }

    }


    state.completedSteps[1] =
      false;

    state.completedSteps[2] =
      false;


    commit(
      "race-selected"
    );


    emit(
      "aerion:race:selected",
      {

        race:
          clone(race),

        previousRace,

        index:
          state.raceIndex

      }
    );


    return true;

  }


  function selectPreviewRace() {

    const race =
      getPreviewRace();


    if (!race) {

      return false;

    }


    return selectRace(
      race.id,
      state.raceIndex
    );

  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function selectAnimalhaCategory(
    category
  ) {

    const value =
      normalize(
        category
      );


    if (
      normalize(
        state.race
      ) !==
      "animalha"
    ) {

      return false;

    }


    if (!value) {

      return false;

    }


    state.animalhaCategory =
      value;


    /*
     * Trocar categoria apaga
     * a variação anterior.
     */

    state.animalha =
      "";


    state.completedSteps[1] =
      false;


    commit(
      "animalha-category"
    );


    emit(
      "aerion:animalha:category",
      {
        category:
          value
      }
    );


    return true;

  }


  function selectAnimalha(
    animalId
  ) {

    if (
      normalize(
        state.race
      ) !==
      "animalha"
    ) {

      return false;

    }


    const animal =
      findAnimalha(
        animalId
      );


    if (!animal) {

      console.warn(
        "[AERION][FICHA] Animalha não encontrada:",
        animalId
      );


      return false;

    }


    const animalCategory =
      normalize(
        animal.category
      );


    if (
      state.animalhaCategory &&
      normalize(
        state.animalhaCategory
      ) !==
      animalCategory
    ) {

      return false;

    }


    state.animalha =
      animal.id;


    state.animalhaCategory =
      animalCategory;


    /*
     * Ao possuir categoria +
     * variação, a etapa de raça
     * pode ser concluída.
     */

    state.completedSteps[1] =
      true;


    commit(
      "animalha-selected"
    );


    emit(
      "aerion:animalha:selected",
      {
        animal:
          clone(animal)
      }
    );


    return true;

  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

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
      !allowed.has(
        field
      )
    ) {

      return false;

    }


    if (
      field ===
      "height"
    ) {

      const race =
        getRaceById(
          state.race
        );


      const min =
        number(
          race?.height?.min,
          0
        );

      const max =
        number(
          race?.height?.max,
          999
        );


      const height =
        number(
          value,
          NaN
        );


      if (
        !Number.isFinite(
          height
        )
      ) {

        return false;

      }


      state.appearance.height =
        clamp(
          height,
          min || height,
          max || height
        );

    } else {

      state.appearance[field] =
        text(
          value
        );

    }


    /*
     * Qualquer alteração de aparência
     * exige nova validação da etapa.
     */

    state.completedSteps[2] =
      false;


    commit(
      `appearance-${field}`
    );


    emit(
      "aerion:appearance:updated",
      {
        field,
        value:
          state.appearance[field]
      }
    );


    return true;

  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function selectClass(
    classId
  ) {

    const id =
      normalize(
        classId
      );


    if (
      !CLASSES[id]
    ) {

      return false;

    }


    state.class =
      id;


    state.completedSteps[3] =
      false;


    /*
     * Bônus de Controle de Mana
     * da classe segundo o Livro I.
     */

    const manaBonus =
      number(
        CLASSES[id].manaBonus,
        0
      );


    if (
      manaBonus
    ) {

      state.mana.max =
        Math.max(
          0,
          number(
            state.mana.max,
            0
          )
        );

    }


    commit(
      "class-selected"
    );


    emit(
      "aerion:class:selected",
      {
        class:
          clone(
            CLASSES[id]
          )
      }
    );


    return true;

  }


  /* =========================================================
     DADOS — DISPONIBILIDADE
     ========================================================= */

  function isDieAssigned(
    dieId
  ) {

    return ATTRIBUTES.some(
      attribute =>
        state.assignedDice?.[
          attribute.id
        ] ===
        dieId
    );

  }


  function getRemainingDice() {

    return DICE.filter(
      die =>
        !isDieAssigned(
          die.id
        )
    );

  }


  function getDie(
    dieId
  ) {

    return (
      DICE_BY_ID[
        dieId
      ] ||
      null
    );

  }


  /* =========================================================
     DADO — ATRIBUIR
     ========================================================= */

  function assignDie(
    attributeId,
    dieId
  ) {

    const attribute =
      normalize(
        attributeId
      );


    const die =
      getDie(
        dieId
      );


    if (
      !ATTRIBUTE_IDS.has(
        attribute
      )
    ) {

      return false;

    }


    if (
      !die
    ) {

      return false;

    }


    /*
     * Se o dado já estiver em
     * outro atributo, não pode
     * ser reutilizado.
     */

    if (
      isDieAssigned(
        die.id
      )
    ) {

      /*
       * Permite clicar novamente
       * no próprio dado para mantê-lo.
       */

      if (
        state.assignedDice[
          attribute
        ] !==
        die.id
      ) {

        return false;

      }

    }


    /*
     * Se o atributo já tinha
     * outro dado, liberamos o antigo.
     */

    state.assignedDice[
      attribute
    ] =
      die.id;


    /*
     * Trocar o dado invalida
     * o resultado anterior.
     */

    delete state.diceResults[
      attribute
    ];


    state.completedSteps[4] =
      false;


    commit(
      `die-assigned-${attribute}`
    );


    emit(
      "aerion:die:assigned",
      {

        attribute,

        die:
          clone(die)

      }
    );


    return true;

  }


  /* =========================================================
     DADO — REMOVER
     ========================================================= */

  function removeDie(
    attributeId
  ) {

    const attribute =
      normalize(
        attributeId
      );


    if (
      !ATTRIBUTE_IDS.has(
        attribute
      )
    ) {

      return false;

    }


    delete state.diceResults[
      attribute
    ];


    state.assignedDice[
      attribute
    ] =
      null;


    state.completedSteps[4] =
      false;


    commit(
      `die-removed-${attribute}`
    );


    return true;

  }


  /* =========================================================
     ROLAGEM
     ========================================================= */

  function rollDie(
    sides
  ) {

    const max =
      number(
        sides,
        0
      );


    if (
      max <= 0
    ) {

      return null;

    }


    return (
      Math.floor(
        Math.random() *
        max
      ) + 1
    );

  }


  function rollAttribute(
    attributeId
  ) {

    const attribute =
      normalize(
        attributeId
      );


    if (
      !ATTRIBUTE_IDS.has(
        attribute
      )
    ) {

      return null;

    }


    const dieId =
      state.assignedDice?.[
        attribute
      ];


    const die =
      getDie(
        dieId
      );


    if (
      !die
    ) {

      emit(
        "aerion:ficha:warning",
        {
          message:
            "Adicione um dado a este atributo primeiro."
        }
      );


      return null;

    }


    const result =
      rollDie(
        die.sides
      );


    state.diceResults[
      attribute
    ] =
      result;


    state.lastRoll = {

      attribute,

      attributeName:
        ATTRIBUTES.find(
          item =>
            item.id ===
            attribute
        )?.name ||
        attribute,

      die:
        die.type,

      dieId:
        die.id,

      result,

      timestamp:
        Date.now()

    };


    commit(
      `attribute-rolled-${attribute}`
    );


    emit(
      "aerion:attribute:rolled",
      {
        attribute,
        result,
        die:
          clone(die)
      }
    );


    /*
     * Marca a etapa somente quando
     * TODOS os oito tiverem resultado.
     */

    if (
      countCompletedAttributes() ===
      ATTRIBUTES.length
    ) {

      state.completedSteps[4] =
        true;

      commit(
        "attributes-completed"
      );

    }


    return result;

  }


  function rollAllAttributes() {

    for (
      const attribute of ATTRIBUTES
    ) {

      if (
        !isAttributeComplete(
          attribute.id
        )
      ) {

        rollAttribute(
          attribute.id
        );

      }

    }


    return (
      countCompletedAttributes() ===
      ATTRIBUTES.length
    );

  }


  /* =========================================================
     PODER
     ========================================================= */

  function setPower(
    field,
    value
  ) {

    const allowed =
      new Set([
        "primaryPower",
        "parallelPower"
      ]);


    if (
      !allowed.has(
        field
      )
    ) {

      return false;

    }


    state[field] =
      text(
        value
      );


    state.completedSteps[5] =
      false;


    commit(
      `power-${field}`
    );


    return true;

  }


  /* =========================================================
     MANA
     ========================================================= */

  function setMana(
    field,
    value
  ) {

    if (
      ![
        "current",
        "max",
        "type"
      ].includes(
        field
      )
    ) {

      return false;

    }


    if (
      field === "type"
    ) {

      state.mana.type =
        text(
          value
        );

    } else {

      state.mana[field] =
        Math.max(
          0,
          number(
            value,
            0
          )
        );

    }


    commit(
      `mana-${field}`
    );


    return true;

  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function setSkill(
    skillId,
    value
  ) {

    const id =
      normalize(
        skillId
      );


    if (
      !Object.prototype.hasOwnProperty.call(
        SKILLS,
        id
      )
    ) {

      return false;

    }


    state.skills[id] =
      Math.max(
        0,
        number(
          value,
          0
        )
      );


    commit(
      `skill-${id}`
    );


    return true;

  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function addTechnique(
    technique
  ) {

    const item =
      typeof technique ===
      "string"

        ? {
            name:
              text(
                technique
              )
          }

        : {

            name:
              text(
                technique?.name
              ),

            description:
              text(
                technique?.description
              ),

            range:
              text(
                technique?.range
              ),

            target:
              text(
                technique?.target
              ),

            effect:
              text(
                technique?.effect
              ),

            cost:
              text(
                technique?.cost
              ),

            test:
              text(
                technique?.test
              ),

            limitation:
              text(
                technique?.limitation
              )

          };


    if (
      !item.name
    ) {

      return false;

    }


    state.techniques.push(
      item
    );


    commit(
      "technique-added"
    );


    return true;

  }


  function removeTechnique(
    index
  ) {

    const numericIndex =
      number(
        index,
        -1
      );


    if (
      numericIndex < 0 ||
      numericIndex >=
        state.techniques.length
    ) {

      return false;

    }


    state.techniques.splice(
      numericIndex,
      1
    );


    commit(
      "technique-removed"
    );


    return true;

  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function addInventory(
    item
  ) {

    const data =
      typeof item ===
      "string"

        ? {
            name:
              text(item)
          }

        : {

            name:
              text(
                item?.name
              ),

            quantity:
              Math.max(
                1,
                number(
                  item?.quantity,
                  1
                )
              ),

            description:
              text(
                item?.description
              ),

            category:
              text(
                item?.category
              )

          };


    if (
      !data.name
    ) {

      return false;

    }


    state.inventory.push(
      data
    );


    commit(
      "inventory-added"
    );


    return true;

  }


  function removeInventory(
    index
  ) {

    const numericIndex =
      number(
        index,
        -1
      );


    if (
      numericIndex < 0 ||
      numericIndex >=
        state.inventory.length
    ) {

      return false;

    }


    state.inventory.splice(
      numericIndex,
      1
    );


    commit(
      "inventory-removed"
    );


    return true;

  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function setAvatar(
    dataUrl,
    fileName = ""
  ) {

    if (
      !text(
        dataUrl
      )
    ) {

      return false;

    }


    state.avatar =
      dataUrl;

    state.avatarName =
      text(
        fileName
      );


    commit(
      "avatar"
    );


    emit(
      "aerion:avatar:updated"
    );


    return true;

  }


  function removeAvatar() {

    state.avatar =
      "";

    state.avatarName =
      "";


    commit(
      "avatar-removed"
    );


    return true;

  }


  async function handleAvatarFile(
    file
  ) {

    if (!file) {

      return false;

    }


    if (
      file.size >
      CONFIG.maxImageSize
    ) {

      emit(
        "aerion:ficha:warning",
        {
          message:
            "A imagem é muito grande."
        }
      );


      return false;

    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      emit(
        "aerion:ficha:warning",
        {
          message:
            "Selecione um arquivo de imagem."
        }
      );


      return false;

    }


    return new Promise(
      resolve => {

        const reader =
          new FileReader();


        reader.onload =
          () => {

            const result =
              setAvatar(
                reader.result,
                file.name
              );

            resolve(
              result
            );

          };


        reader.onerror =
          () => {

            resolve(
              false
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  /* =========================================================
     VALIDAÇÃO PARA AVANÇAR
     ========================================================= */

  function validateCurrentStep() {

    return validateStep(
      state.currentStep
    );

  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function goToStep(
    target
  ) {

    const destination =
      clamp(
        number(
          target,
          0
        ),
        0,
        CONFIG.totalSteps - 1
      );


    const current =
      state.currentStep;


    if (
      destination ===
      current
    ) {

      return true;

    }


    /*
     * Voltar é permitido.
     */

    if (
      destination <
      current
    ) {

      state.currentStep =
        destination;


      commit(
        `step-back-${destination}`
      );


      return true;

    }


    /*
     * Não permite pular etapas.
     */

    if (
      destination >
      current + 1
    ) {

      return false;

    }


    /*
     * Para avançar uma etapa,
     * a atual precisa estar válida.
     */

    const validation =
      validateCurrentStep();


    if (
      !validation.valid
    ) {

      emit(
        "aerion:ficha:warning",
        {
          message:
            validation.message
        }
      );


      return false;

    }


    state.completedSteps[
      current
    ] = true;


    state.currentStep =
      destination;


    commit(
      `step-forward-${destination}`
    );


    return true;

  }


  function nextStep() {

    if (
      state.currentStep >=
      CONFIG.totalSteps - 1
    ) {

      return false;

    }


    return goToStep(
      state.currentStep + 1
    );

  }


  function previousStep() {

    if (
      state.currentStep <=
      0
    ) {

      return false;

    }


    return goToStep(
      state.currentStep - 1
    );

  }


  /* =========================================================
     REINICIAR
     ========================================================= */

  function reset() {

    state =
      createDefaultState();


    try {

      localStorage.removeItem(
        CONFIG.storageKey
      );

    } catch {
      /* ignore */
    }


    updateSaveStatus(
      false
    );


    commit(
      "reset"
    );


    return true;

  }


  /* =========================================================
     AÇÕES DA INTERFACE
     ========================================================= */

  function handleAction(
    action,
    element
  ) {

    const normalizedAction =
      normalize(
        action
      );


    switch (
      normalizedAction
    ) {

      /* ===============================================
         NAVEGAÇÃO
         =============================================== */

      case "next-step":
      case "next":
      case "proximo":
      case "proximo-step":

        return nextStep();


      case "previous-step":
      case "previous":
      case "voltar-step":
      case "voltar":

        return previousStep();


      case "go-step": {

        const target =
          number(
            element?.dataset?.step,
            state.currentStep
          );

        return goToStep(
          target
        );

      }


      /* ===============================================
         RAÇA
         =============================================== */

      case "race-next":

        return Boolean(
          previewRace(
            1
          )
        );


      case "race-previous":

        return Boolean(
          previewRace(
            -1
          )
        );


      case "select-race-current":
      case "select-race":

        return selectPreviewRace();


      case "race-goto": {

        const index =
          number(
            element?.dataset?.index,
            -1
          );


        const races =
          getRaces();


        if (
          index < 0 ||
          index >=
            races.length
        ) {

          return false;

        }


        state.raceIndex =
          index;


        emit(
          "aerion:race:preview",
          {
            race:
              clone(
                races[index]
              ),

            index
          }
        );


        return true;

      }


      case "confirm-race":

        return selectPreviewRace();


      /* ===============================================
         ANIMALHA
         =============================================== */

      case "select-animalha-category": {

        const category =
          element?.dataset?.category ||
          element?.dataset?.animalhaCategory ||
          "";


        return selectAnimalhaCategory(
          category
        );

      }


      case "select-animalha": {

        const animal =
          element?.dataset?.animal ||
          element?.dataset?.animalha ||
          "";


        return selectAnimalha(
          animal
        );

      }


      case "select-animalha-variation": {

        const animal =
          element?.dataset?.animal ||
          element?.dataset?.variation ||
          "";


        return selectAnimalha(
          animal
        );

      }


      /* ===============================================
         CLASSE
         =============================================== */

      case "select-class":

        return selectClass(
          element?.dataset?.class ||
          element?.dataset?.classId ||
          ""
        );


      case "class-next": {

        const classes =
          Object.keys(
            CLASSES
          );


        if (
          !classes.length
        ) {

          return false;

        }


        let index =
          classes.indexOf(
            state.class
          );


        index =
          (
            index + 1
          ) %
          classes.length;


        return selectClass(
          classes[index]
        );

      }


      case "class-previous": {

        const classes =
          Object.keys(
            CLASSES
          );


        if (
          !classes.length
        ) {

          return false;

        }


        let index =
          classes.indexOf(
            state.class
          );


        index =
          index <= 0
            ? classes.length - 1
            : index - 1;


        return selectClass(
          classes[index]
        );

      }


      /* ===============================================
         DADOS
         =============================================== */

      case "assign-die":

        return assignDie(

          element?.dataset?.attribute ||
          "",

          element?.dataset?.die ||
          element?.dataset?.dieId ||
          ""

        );


      case "remove-die":

        return removeDie(
          element?.dataset?.attribute ||
          ""
        );


      case "roll-attribute":

        return (
          rollAttribute(
            element?.dataset?.attribute ||
            ""
          ) !== null
        );


      case "roll-all-attributes":

        return rollAllAttributes();


      /* ===============================================
         PODER
         =============================================== */

      case "select-power":

        return setPower(
          "primaryPower",
          element?.dataset?.power ||
          ""
        );


      /* ===============================================
         TÉCNICAS
         =============================================== */

      case "remove-technique":

        return removeTechnique(
          element?.dataset?.index
        );


      /* ===============================================
         INVENTÁRIO
         =============================================== */

      case "remove-inventory":

        return removeInventory(
          element?.dataset?.index
        );


      /* ===============================================
         AVATAR
         =============================================== */

      case "remove-avatar":

        return removeAvatar();


      /* ===============================================
         SALVAR
         =============================================== */

      case "save":

        return saveNow();


      /* ===============================================
         RESET
         =============================================== */

      case "reset":

        return reset();


      default:

        return false;

    }

  }


  /* =========================================================
     EVENTOS DE FORMULÁRIO
     ========================================================= */

  function handleInput(
    event
  ) {

    const target =
      event.target;


    if (!target) {
      return;
    }


    const id =
      target.id;


    /*
     * Identidade
     */

    if (
      id ===
      "characterName"
    ) {

      setIdentity(
        "name",
        target.value
      );

      return;

    }


    if (
      id ===
      "characterAge"
    ) {

      setIdentity(
        "age",
        target.value
      );

      return;

    }


    if (
      id ===
      "characterDescription"
    ) {

      setIdentity(
        "description",
        target.value
      );

      return;

    }


    if (
      id ===
      "characterOrigin"
    ) {

      setIdentity(
        "origin",
        target.value
      );

      return;

    }


    /*
     * Aparência — altura
     */

    if (
      target.matches(
        'input[data-height]'
      )
    ) {

      setAppearance(
        "height",
        target.value
      );

      return;

    }


    /*
     * Aparência — campos genéricos.
     */

    if (
      target.dataset.appearanceField
    ) {

      setAppearance(
        target.dataset.appearanceField,
        target.value
      );

      return;

    }


    /*
     * Poder
     */

    if (
      target.dataset.powerField
    ) {

      setPower(
        target.dataset.powerField,
        target.value
      );

      return;

    }


    /*
     * Mana
     */

    if (
      target.dataset.manaField
    ) {

      setMana(
        target.dataset.manaField,
        target.value
      );

      return;

    }


    /*
     * Perícias
     */

    if (
      target.dataset.skillId
    ) {

      setSkill(
        target.dataset.skillId,
        target.value
      );

    }

  }


  function handleChange(
    event
  ) {

    const target =
      event.target;


    if (!target) {
      return;
    }


    /*
     * Gênero.
     */

    if (
      target.name ===
      "gender"
    ) {

      setGender(
        target.value
      );

      return;

    }


    /*
     * Campos de aparência
     * com select.
     */

    if (
      target.dataset.appearanceField
    ) {

      setAppearance(
        target.dataset.appearanceField,
        target.value
      );

      return;

    }


    /*
     * Upload.
     */

    if (
      target.id ===
      "avatarInput"
    ) {

      const file =
        target.files?.[0];


      if (file) {

        handleAvatarFile(
          file
        );

      }

    }

  }


  /* =========================================================
     CLIQUES
     ========================================================= */

  function handleClick(
    event
  ) {

    const actionElement =
      event.target.closest(
        "[data-action]"
      );


    if (
      !actionElement
    ) {

      return;

    }


    /*
     * O clique pertence
     * exclusivamente ao ficha.js.
     */

    event.preventDefault();


    const action =
      actionElement.dataset.action;


    handleAction(
      action,
      actionElement
    );

  }


  /* =========================================================
     INICIALIZAÇÃO DOS EVENTOS
     ========================================================= */

  function initEvents() {

    /*
     * APENAS este arquivo registra
     * o listener de data-action.
     */

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


    window.addEventListener(
      "beforeunload",
      () => {

        if (saveTimer) {

          clearTimeout(
            saveTimer
          );

        }


        saveNow();

      }
    );

  }


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  let initialized =
    false;


  function init() {

    if (
      initialized
    ) {

      return;

    }


    initialized =
      true;


    loadSavedState();


    initEvents();


    notify(
      "init"
    );


    emit(
      "aerion:ficha:ready",
      {
        state:
          clone(state)
      }
    );

  }


  /* =========================================================
     API PÚBLICA
     ========================================================= */

  const API = {

    init,

    getState,

    getCurrentStep,

    getCurrentStepData,

    getRaces,

    getRaceById,

    getPreviewRace,

    getRaceIndex,

    getRemainingDice,

    getDie,

    getStateClone:
      getState,


    /* identidade */

    setIdentity,

    setGender,


    /* raça */

    selectRace,

    selectPreviewRace,

    previewRace,


    /* Animalha */

    selectAnimalhaCategory,

    selectAnimalha,


    /* aparência */

    setAppearance,


    /* classe */

    selectClass,


    /* atributos */

    validateAttributes,

    countCompletedAttributes,

    isAttributeComplete,


    /* dados */

    assignDie,

    removeDie,

    rollAttribute,

    rollAllAttributes,


    /* poder */

    setPower,


    /* mana */

    setMana,


    /* perícias */

    setSkill,


    /* técnicas */

    addTechnique,

    removeTechnique,


    /* inventário */

    addInventory,

    removeInventory,


    /* avatar */

    setAvatar,

    removeAvatar,

    handleAvatarFile,


    /* navegação */

    goToStep,

    nextStep,

    previousStep,


    /* validação */

    validateStep,

    validateCurrentStep,


    /* salvamento */

    saveNow,

    scheduleSave,


    /* reset */

    reset,


    /* ações */

    handleAction

  };


  /* =========================================================
     EXPOSIÇÃO GLOBAL
     ========================================================= */

  window.AERIONFicha =
    API;

  window.AERION_FICHA =
    API;


  /* =========================================================
     DOM READY
     ========================================================= */

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