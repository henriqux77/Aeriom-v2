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
   - aparência básica;
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
   O ficha-render.js deve apenas renderizar.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    storageKey: "aerion:ficha:draft:v16",
    autosaveDelay: 350,
    maxImageSize: 6 * 1024 * 1024,
    totalSteps: 11
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
      id: "forca",
      name: "Força"
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
      id: "presenca",
      name: "Presença"
    },

    {
      id: "percepcao",
      name: "Percepção"
    }
  ]);

  const ATTRIBUTE_IDS = new Set(
    ATTRIBUTES.map(attribute => attribute.id)
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

  const DICE_BY_ID = Object.freeze(
    Object.fromEntries(
      DICE.map(die => [
        die.id,
        die
      ])
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
      description:
        "Especialista em combate direto.",
      skillBonuses: {
        atletismo: 1,
        tatica: 1
      }
    },

    feiticeiro: {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",
      icon: "✦",
      description:
        "Especialista em manipulação de Mana.",
      skillBonuses: {
        conhecimento: 1,
        controle_mana: 1
      }
    },

    curandeiro: {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",
      icon: "✚",
      description:
        "Especialista em recuperação e suporte.",
      skillBonuses: {
        medicina: 1,
        intuicao: 1
      }
    },

    monge: {
      id: "monge",
      name: "Monge",
      role: "Marcial",
      icon: "◈",
      description:
        "Especialista em combate corporal e disciplina.",
      skillBonuses: {
        atletismo: 1,
        controle_mana: 1
      }
    }
  });


  /* =========================================================
     PERÍCIAS
     ========================================================= */

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


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
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
    const parsed = Number(value);

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
    const assets = getAssets();

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
    const normalized =
      normalize(raceId);

    const assets =
      getAssets();

    if (
      assets &&
      typeof assets.getRace ===
        "function"
    ) {
      return (
        assets.getRace(
          normalized
        ) || null
      );
    }

    return (
      getRaces().find(
        race =>
          normalize(race.id) ===
          normalized
      ) || null
    );
  }


  /* =========================================================
     ESTADO PADRÃO
     ========================================================= */

  function createEmptyAttributes() {
    return Object.fromEntries(
      ATTRIBUTES.map(attribute => [
        attribute.id,
        null
      ])
    );
  }


  function createEmptyAssignedDice() {
    return Object.fromEntries(
      ATTRIBUTES.map(attribute => [
        attribute.id,
        null
      ])
    );
  }


  function createEmptySkills() {
    return Object.fromEntries(
      Object.keys(SKILLS).map(id => [
        id,
        0
      ])
    );
  }


  function createDefaultState() {
    return {
      currentStep: 0,

      /*
       * NENHUMA etapa começa concluída.
       * A etapa só passa a ser concluída
       * depois da validação real.
       */
      completedSteps:
        Array(CONFIG.totalSteps).fill(
          false
        ),

      /* Identidade */
      name: "",
      age: "",
      gender: "",
      description: "",
      origin: "",

      /* Raça */
      race: "",
      raceIndex: 0,

      /* Animalha */
      animalha: "",
      animalhaCategory: "",

      /*
       * Aparência atualmente utilizada:
       * somente altura.
       */
      appearance: {
        height: null
      },

      /* Imagem personalizada opcional */
      avatar: "",
      avatarName: "",

      /* Classe */
      class: "",

      /* Atributos */
      attributes:
        createEmptyAttributes(),

      /* Dados */
      assignedDice:
        createEmptyAssignedDice(),

      diceResults: {},

      lastRoll: null,

      /* Poder */
      primaryPower: "",
      parallelPower: "",

      /* Mana */
      mana: {
        current: 0,
        max: 0,
        type: ""
      },

      /* Perícias */
      skills:
        createEmptySkills(),

      /* Técnicas */
      techniques: [],

      /* Inventário */
      inventory: [],

      saved: false
    };
  }


  /* =========================================================
     ESTADO
     ========================================================= */

  let state =
    createDefaultState();

  let saveTimer = null;


  /* =========================================================
     NORMALIZAÇÃO DO ESTADO
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
      Array.isArray(
        source.completedSteps
      )
        ? Array.from(
            {
              length:
                CONFIG.totalSteps
            },
            (_, index) =>
              source.completedSteps[
                index
              ] === true
          )
        : defaults.completedSteps;

    result.appearance = {
      ...defaults.appearance,
      ...(source.appearance || {})
    };

    result.attributes = {
      ...defaults.attributes,
      ...(source.attributes || {})
    };

    result.assignedDice = {
      ...defaults.assignedDice,
      ...(source.assignedDice || {})
    };

    result.diceResults = {
      ...(source.diceResults || {})
    };

    result.skills = {
      ...defaults.skills,
      ...(source.skills || {})
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
     * Corrige estados antigos que
     * deixavam etapas futuras liberadas.
     */
    result.completedSteps.forEach(
      (_, index) => {
        if (
          index >
          result.currentStep
        ) {
          result.completedSteps[index] =
            false;
        }
      }
    );

    /*
     * Se a identidade antiga está
     * preenchida corretamente, ela
     * pode continuar concluída.
     */
    if (
      text(result.name) &&
      text(result.gender)
    ) {
      result.completedSteps[0] =
        Boolean(
          source.completedSteps?.[0]
        );
    } else {
      result.completedSteps[0] =
        false;
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


  function saveLocal() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(
          clone(state)
        )
      );

      state.saved = true;

      updateSaveStatus(true);

    } catch (error) {
      state.saved = false;

      updateSaveStatus(false);

      console.error(
        "[AERION][FICHA] Erro ao salvar:",
        error
      );
    }
  }


  function scheduleSave() {
    state.saved = false;

    updateSaveStatus(false);

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer =
      setTimeout(
        saveLocal,
        CONFIG.autosaveDelay
      );
  }


  function loadLocal() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!raw) {
        return false;
      }

      const parsed =
        JSON.parse(raw);

      state =
        normalizeState(parsed);

      return true;

    } catch (error) {
      console.warn(
        "[AERION][FICHA] Rascunho inválido:",
        error
      );

      return false;
    }
  }


  /* =========================================================
     ESTADO PÚBLICO
     ========================================================= */

  function getState() {
    return clone(state);
  }


  function setState(
    updater,
    options = {}
  ) {
    const previous =
      clone(state);

    let next;

    if (
      typeof updater ===
      "function"
    ) {
      next =
        updater(
          clone(state)
        );
    } else {
      next = {
        ...state,
        ...(updater || {})
      };
    }

    state =
      normalizeState(next);

    if (
      options.save !== false
    ) {
      scheduleSave();
    }

    emit(
      "aerion:ficha:updated",
      {
        state:
          getState(),

        previous
      }
    );

    return getState();
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function setIdentity(
    values = {}
  ) {
    setState(current => {
      if (
        values.name !==
        undefined
      ) {
        current.name =
          text(values.name);
      }

      if (
        values.age !==
        undefined
      ) {
        current.age =
          values.age;
      }

      if (
        values.gender !==
        undefined
      ) {
        current.gender =
          text(values.gender);
      }

      if (
        values.description !==
        undefined
      ) {
        current.description =
          text(values.description);
      }

      if (
        values.origin !==
        undefined
      ) {
        current.origin =
          text(values.origin);
      }

      /*
       * Só considera identidade
       * concluída quando realmente
       * possui nome + gênero.
       */
      current.completedSteps[0] =
        Boolean(
          text(current.name)
        ) &&
        Boolean(
          text(current.gender)
        );

      return current;
    });

    emit(
      "aerion:identity:updated",
      {
        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function selectRace(
    raceId,
    raceIndex = null
  ) {
    const normalized =
      normalize(raceId);

    if (!normalized) {
      return false;
    }

    const race =
      getRaceById(normalized);

    if (!race) {
      console.warn(
        "[AERION][FICHA] Raça não encontrada:",
        normalized
      );

      return false;
    }

    let nextHeight =
      state.appearance.height;

    const minHeight =
      number(
        race.height?.min,
        0
      );

    const maxHeight =
      number(
        race.height?.max,
        0
      );

    /*
     * Ao trocar de raça:
     * - Animalha é zerada;
     * - altura antiga é ajustada;
     * - a etapa ainda NÃO é marcada
     *   como concluída.
     */
    if (
      minHeight &&
      maxHeight
    ) {
      if (
        !Number.isFinite(
          number(nextHeight, NaN)
        ) ||
        number(nextHeight, 0) <
          minHeight ||
        number(nextHeight, 0) >
          maxHeight
      ) {
        nextHeight =
          Math.round(
            (
              minHeight +
              maxHeight
            ) / 2
          );
      }
    }

    setState(current => {
      current.race =
        normalized;

      if (
        raceIndex !== null
      ) {
        current.raceIndex =
          clamp(
            number(
              raceIndex,
              0
            ),
            0,
            Math.max(
              0,
              getRaces().length - 1
            )
          );
      } else {
        const index =
          getRaces().findIndex(
            item =>
              normalize(item.id) ===
              normalized
          );

        if (index >= 0) {
          current.raceIndex =
            index;
        }
      }

      current.animalha = "";
      current.animalhaCategory = "";

      current.appearance.height =
        nextHeight;

      return current;
    });

    emit(
      "aerion:race:selected",
      {
        race:
          normalized,

        raceIndex:
          state.raceIndex,

        state:
          getState()
      }
    );

    return true;
  }


  /*
   * Navegação visual do carrossel.
   *
   * IMPORTANTE:
   * isso muda somente a raça atualmente
   * visualizada.
   *
   * A confirmação da raça ocorre em
   * select-race-current.
   */
  function previewRace(
    direction
  ) {
    const races =
      getRaces();

    if (!races.length) {
      return false;
    }

    const currentIndex =
      clamp(
        number(
          state.raceIndex,
          0
        ),
        0,
        races.length - 1
      );

    const nextIndex =
      (
        currentIndex +
        direction +
        races.length
      ) %
      races.length;

    setState(
      current => {
        current.raceIndex =
          nextIndex;

        return current;
      }
    );

    emit(
      "aerion:race:preview",
      {
        raceIndex:
          nextIndex,

        race:
          races[nextIndex],

        state:
          getState()
      }
    );

    return true;
  }


  function getPreviewRace() {
    const races =
      getRaces();

    if (!races.length) {
      return null;
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

    return (
      races[index] ||
      null
    );
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
    categoryId
  ) {
    const category =
      normalize(categoryId);

    if (!category) {
      return false;
    }

    setState(current => {
      current.animalhaCategory =
        category;

      /*
       * Trocar categoria limpa
       * a variação anterior.
       */
      current.animalha = "";

      return current;
    });

    emit(
      "aerion:animalha:category-selected",
      {
        category,

        state:
          getState()
      }
    );

    return true;
  }


  function selectAnimalha(
    animalId
  ) {
    const animal =
      normalize(animalId);

    if (!animal) {
      return false;
    }

    /*
     * O catálogo é a autoridade
     * para verificar se o animal existe.
     */
    const assets =
      getAssets();

    let animalData = null;

    if (
      assets &&
      typeof assets.getAnimalha ===
        "function"
    ) {
      animalData =
        assets.getAnimalha(
          animal
        );
    }

    if (
      !animalData &&
      assets?.animalhaAnimals
    ) {
      animalData =
        assets.animalhaAnimals[
          animal
        ];
    }

    /*
     * Não recusamos um animal se o
     * catálogo exposto não tiver helper,
     * pois versões do assets.js podem
     * expor somente o array.
     */
    if (
      assets?.animalhaAnimals &&
      !animalData
    ) {
      return false;
    }

    setState(current => {
      current.animalha =
        animal;

      /*
       * Animalha é necessária somente
       * para a raça Animalha.
       */
      if (
        normalize(current.race) ===
        "animalha"
      ) {
        current.completedSteps[1] =
          Boolean(
            current.race
          ) &&
          Boolean(
            current.animalha
          ) &&
          Boolean(
            current.animalhaCategory
          );
      }

      return current;
    });

    emit(
      "aerion:animalha:selected",
      {
        animal,

        state:
          getState()
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
    const key =
      text(field);

    if (
      key !== "height"
    ) {
      /*
       * Não aceitamos mais os antigos
       * campos do gerador de aparência.
       */
      return false;
    }

    const race =
      getRaceById(
        state.race
      );

    let nextValue =
      number(
        value,
        NaN
      );

    if (
      race?.height
    ) {
      nextValue =
        clamp(
          nextValue,
          number(
            race.height.min,
            nextValue
          ),
          number(
            race.height.max,
            nextValue
          )
        );
    }

    if (
      !Number.isFinite(nextValue)
    ) {
      return false;
    }

    setState(
      current => {
        current.appearance.height =
          nextValue;

        return current;
      }
    );

    emit(
      "aerion:appearance:updated",
      {
        field: "height",

        value:
          nextValue,

        state:
          getState()
      }
    );

    return true;
  }


  function setAppearanceValues(
    values = {}
  ) {
    if (
      !values ||
      typeof values !==
        "object"
    ) {
      return false;
    }

    if (
      values.height !==
      undefined
    ) {
      return setAppearance(
        "height",
        values.height
      );
    }

    return false;
  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function selectClass(
    classId
  ) {
    const id =
      normalize(classId);

    if (
      !CLASSES[id]
    ) {
      console.warn(
        "[AERION][FICHA] Classe não encontrada:",
        id
      );

      return false;
    }

    setState(current => {
      current.class =
        id;

      /*
       * Recalcula os bônus da classe
       * partindo da base armazenada.
       *
       * Como não temos valores-base
       * separados neste estágio,
       * os bônus só são aplicados uma vez
       * por escolha.
       */
      Object.entries(
        CLASSES[id].skillBonuses || {}
      ).forEach(
        ([skill, bonus]) => {
          current.skills[skill] =
            Math.max(
              number(
                current.skills[skill],
                0
              ),
              number(
                bonus,
                0
              )
            );
        }
      );

      current.completedSteps[3] =
        true;

      return current;
    });

    emit(
      "aerion:class:selected",
      {
        classId: id,

        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function normalizeAttribute(
    attributeId
  ) {
    return normalize(
      attributeId
    );
  }


  function setAttributeValue(
    attributeId,
    value
  ) {
    const id =
      normalizeAttribute(
        attributeId
      );

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      return false;
    }

    const parsed =
      value === null ||
      value === ""
        ? null
        : number(
            value,
            NaN
          );

    if (
      parsed !== null &&
      !Number.isFinite(parsed)
    ) {
      return false;
    }

    setState(current => {
      current.attributes[id] =
        parsed;

      current.completedSteps[4] =
        areAllAttributesFilled(
          current
        );

      return current;
    });

    emit(
      "aerion:attribute:updated",
      {
        attribute: id,

        value:
          state.attributes[id],

        state:
          getState()
      }
    );

    return true;
  }


  function areAllAttributesFilled(
    currentState = state
  ) {
    return ATTRIBUTES.every(
      attribute =>
        currentState.attributes[
          attribute.id
        ] !== null &&
        Number.isFinite(
          number(
            currentState.attributes[
              attribute.id
            ],
            NaN
          )
        )
    );
  }


  /* =========================================================
     DADOS
     ========================================================= */

  function getDice() {
    return clone(DICE);
  }


  function getDiceByAttribute() {
    return clone(
      state.assignedDice
    );
  }


  function getAvailableDice() {
    const used =
      new Set(
        Object.values(
          state.assignedDice
        ).filter(Boolean)
      );

    return DICE
      .filter(
        die =>
          !used.has(
            die.id
          )
      )
      .map(clone);
  }


  function isDiceAssigned(
    diceId,
    exceptAttribute = null
  ) {
    return ATTRIBUTES.some(
      attribute => {
        if (
          attribute.id ===
          exceptAttribute
        ) {
          return false;
        }

        return (
          state.assignedDice[
            attribute.id
          ] ===
          diceId
        );
      }
    );
  }


  function assignDieToAttribute(
    diceId,
    attributeId
  ) {
    const id =
      normalizeAttribute(
        attributeId
      );

    const die =
      DICE_BY_ID[diceId];

    if (!die) {
      return {
        ok: false,
        error:
          "Dado inválido."
      };
    }

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      return {
        ok: false,
        error:
          "Atributo inválido."
      };
    }

    if (
      isDiceAssigned(
        die.id,
        id
      )
    ) {
      return {
        ok: false,
        error:
          "Esse dado já está atribuído."
      };
    }

    const previous =
      state.assignedDice[id];

    setState(current => {
      current.assignedDice[id] =
        die.id;

      /*
       * Quando o dado muda, o resultado
       * anterior daquele atributo não
       * é mais considerado válido.
       */
      current.attributes[id] =
        null;

      current.diceResults[die.id] =
        null;

      current.completedSteps[4] =
        areAllAttributesFilled(
          current
        );

      return current;
    });

    emit(
      "aerion:dice:assigned",
      {
        diceId:
          die.id,

        attributeId:
          id,

        previousDiceId:
          previous || null,

        state:
          getState()
      }
    );

    return {
      ok: true,

      diceId:
        die.id,

      attributeId:
        id,

      previousDiceId:
        previous || null
    };
  }


  function removeDieFromAttribute(
    attributeId
  ) {
    const id =
      normalizeAttribute(
        attributeId
      );

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      return false;
    }

    const diceId =
      state.assignedDice[id];

    if (!diceId) {
      return false;
    }

    setState(current => {
      current.assignedDice[id] =
        null;

      current.attributes[id] =
        null;

      current.completedSteps[4] =
        false;

      return current;
    });

    emit(
      "aerion:dice:removed",
      {
        attributeId:
          id,

        diceId,

        state:
          getState()
      }
    );

    return true;
  }


  function clearDiceAssignments() {
    setState(current => {
      current.assignedDice =
        createEmptyAssignedDice();

      current.attributes =
        createEmptyAttributes();

      current.diceResults = {};

      current.lastRoll = null;

      current.completedSteps[4] =
        false;

      return current;
    });

    emit(
      "aerion:dice:cleared",
      {
        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     ROLAGEM
     ========================================================= */

  function randomInteger(
    min,
    max
  ) {
    return Math.floor(
      Math.random() *
        (
          max -
          min +
          1
        )
    ) + min;
  }


  function rollDie(
    diceId,
    attributeId = null
  ) {
    const die =
      DICE_BY_ID[diceId];

    if (!die) {
      return {
        ok: false,
        error:
          "Dado inválido."
      };
    }

    let normalizedAttribute =
      null;

    if (
      attributeId
    ) {
      normalizedAttribute =
        normalizeAttribute(
          attributeId
        );

      if (
        !ATTRIBUTE_IDS.has(
          normalizedAttribute
        )
      ) {
        return {
          ok: false,
          error:
            "Atributo inválido."
        };
      }

      /*
       * Garante que o dado realmente
       * está ligado ao atributo.
       */
      if (
        state.assignedDice[
          normalizedAttribute
        ] !== die.id
      ) {
        return {
          ok: false,
          error:
            "Esse dado não está atribuído a este atributo."
        };
      }
    }

    const result =
      randomInteger(
        1,
        die.sides
      );

    setState(current => {
      current.diceResults[
        die.id
      ] = result;

      if (
        normalizedAttribute
      ) {
        current.attributes[
          normalizedAttribute
        ] = result;
      }

      current.lastRoll = {
        diceId:
          die.id,

        type:
          die.type,

        sides:
          die.sides,

        result,

        attributeId:
          normalizedAttribute,

        timestamp:
          Date.now()
      };

      current.completedSteps[4] =
        areAllAttributesFilled(
          current
        );

      return current;
    });

    emit(
      "aerion:dice:rolled",
      {
        diceId:
          die.id,

        type:
          die.type,

        sides:
          die.sides,

        result,

        attributeId:
          normalizedAttribute,

        state:
          getState()
      }
    );

    return {
      ok: true,

      diceId:
        die.id,

      type:
        die.type,

      sides:
        die.sides,

      result,

      attributeId:
        normalizedAttribute
    };
  }


  function rollAttribute(
    attributeId
  ) {
    const id =
      normalizeAttribute(
        attributeId
      );

    if (
      !ATTRIBUTE_IDS.has(id)
    ) {
      return {
        ok: false,
        error:
          "Atributo inválido."
      };
    }

    const diceId =
      state.assignedDice[id];

    if (!diceId) {
      return {
        ok: false,
        error:
          "Nenhum dado atribuído a este atributo."
      };
    }

    return rollDie(
      diceId,
      id
    );
  }


  function rollAttributeById(
    attributeId
  ) {
    return rollAttribute(
      attributeId
    );
  }


  function rollDiceForAttribute(
    attributeId
  ) {
    return rollAttribute(
      attributeId
    );
  }


  /* =========================================================
     PODER
     ========================================================= */

  function setPower(
    primary,
    parallel
  ) {
    setState(current => {
      if (
        primary !==
        undefined
      ) {
        current.primaryPower =
          text(primary);
      }

      if (
        parallel !==
        undefined
      ) {
        current.parallelPower =
          text(parallel);
      }

      current.completedSteps[5] =
        true;

      return current;
    });

    emit(
      "aerion:power:updated",
      {
        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     MANA
     ========================================================= */

  function setMana(
    currentMana,
    maxMana,
    type
  ) {
    setState(current => {
      if (
        currentMana !==
        undefined
      ) {
        current.mana.current =
          Math.max(
            0,
            number(
              currentMana,
              0
            )
          );
      }

      if (
        maxMana !==
        undefined
      ) {
        current.mana.max =
          Math.max(
            0,
            number(
              maxMana,
              0
            )
          );
      }

      if (
        type !==
        undefined
      ) {
        current.mana.type =
          normalize(type);
      }

      if (
        current.mana.current >
        current.mana.max
      ) {
        current.mana.current =
          current.mana.max;
      }

      current.completedSteps[6] =
        true;

      return current;
    });

    emit(
      "aerion:mana:updated",
      {
        mana:
          clone(state.mana),

        state:
          getState()
      }
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
      normalize(skillId);

    if (
      !Object.prototype.hasOwnProperty.call(
        SKILLS,
        id
      )
    ) {
      return false;
    }

    setState(current => {
      current.skills[id] =
        Math.max(
          0,
          number(
            value,
            0
          )
        );

      return current;
    });

    emit(
      "aerion:skill:updated",
      {
        skill:
          id,

        value:
          state.skills[id],

        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function addTechnique(
    technique
  ) {
    if (!technique) {
      return false;
    }

    setState(current => {
      current.techniques.push(
        typeof technique ===
          "string"
          ? {
              name:
                text(
                  technique
                )
            }
          : clone(
              technique
            )
      );

      return current;
    });

    emit(
      "aerion:technique:added",
      {
        state:
          getState()
      }
    );

    return true;
  }


  function removeTechnique(
    index
  ) {
    const i =
      number(
        index,
        -1
      );

    if (
      i < 0 ||
      i >=
        state.techniques.length
    ) {
      return false;
    }

    setState(current => {
      current.techniques.splice(
        i,
        1
      );

      return current;
    });

    emit(
      "aerion:technique:removed",
      {
        index: i,

        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function addInventoryItem(
    item
  ) {
    if (!item) {
      return false;
    }

    setState(current => {
      current.inventory.push(
        typeof item ===
          "string"
          ? {
              name:
                text(item),

              quantity:
                1
            }
          : clone(item)
      );

      return current;
    });

    emit(
      "aerion:inventory:item-added",
      {
        state:
          getState()
      }
    );

    return true;
  }


  function removeInventoryItem(
    index
  ) {
    const i =
      number(
        index,
        -1
      );

    if (
      i < 0 ||
      i >=
        state.inventory.length
    ) {
      return false;
    }

    setState(current => {
      current.inventory.splice(
        i,
        1
      );

      return current;
    });

    emit(
      "aerion:inventory:item-removed",
      {
        index: i,

        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  async function setAvatarFile(
    file
  ) {
    if (!file) {
      return false;
    }

    if (
      file.size >
      CONFIG.maxImageSize
    ) {
      throw new Error(
        "A imagem ultrapassa o limite de 6 MB."
      );
    }

    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif"
    ];

    if (
      !validTypes.includes(
        file.type
      )
    ) {
      throw new Error(
        "Formato de imagem não suportado."
      );
    }

    const dataUrl =
      await new Promise(
        (
          resolve,
          reject
        ) => {
          const reader =
            new FileReader();

          reader.onload =
            () => {
              resolve(
                reader.result
              );
            };

          reader.onerror =
            () => {
              reject(
                new Error(
                  "Não foi possível ler a imagem."
                )
              );
            };

          reader.readAsDataURL(
            file
          );
        }
      );

    setState(current => {
      current.avatar =
        dataUrl;

      current.avatarName =
        file.name;

      return current;
    });

    emit(
      "aerion:avatar:updated",
      {
        fileName:
          file.name,

        state:
          getState()
      }
    );

    return true;
  }


  function removeAvatar() {
    setState(current => {
      current.avatar = "";
      current.avatarName = "";

      return current;
    });

    emit(
      "aerion:avatar:removed",
      {
        state:
          getState()
      }
    );

    return true;
  }


  /* =========================================================
     VALIDAÇÃO DAS ETAPAS
     ========================================================= */

  function validateStep(
    step
  ) {
    const index =
      clamp(
        number(
          step,
          state.currentStep
        ),
        0,
        CONFIG.totalSteps - 1
      );

    switch (index) {

      case 0:
        return {
          valid:
            Boolean(
              text(state.name)
            ) &&
            Boolean(
              text(state.gender)
            ),

          reason:
            "Preencha nome e gênero."
        };


      case 1: {
        const validRace =
          Boolean(
            text(state.race)
          );

        const isAnimalha =
          normalize(
            state.race
          ) ===
          "animalha";

        const validAnimalha =
          !isAnimalha ||
          (
            Boolean(
              text(
                state.animalhaCategory
              )
            ) &&
            Boolean(
              text(
                state.animalha
              )
            )
          );

        return {
          valid:
            validRace &&
            validAnimalha,

          reason:
            isAnimalha
              ? "Escolha a categoria e a variação da Animalha."
              : "Escolha uma raça."
        };
      }


      case 2: {
        const race =
          getRaceById(
            state.race
          );

        const height =
          number(
            state.appearance.height,
            NaN
          );

        if (
          !race?.height
        ) {
          return {
            valid: true,
            reason: ""
          };
        }

        return {
          valid:
            Number.isFinite(height) &&
            height >=
              number(
                race.height.min,
                height
              ) &&
            height <=
              number(
                race.height.max,
                height
              ),

          reason:
            "Defina uma altura válida."
        };
      }


      case 3:
        return {
          valid:
            Boolean(
              text(state.class)
            ),

          reason:
            "Escolha uma classe."
        };


      case 4:
        return {
          valid:
            areAllAttributesFilled(),

          reason:
            "Preencha todos os atributos."
        };


      /*
       * Estas etapas podem continuar
       * mesmo sem uma escolha obrigatória.
       */
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
        return {
          valid: true,
          reason: ""
        };


      default:
        return {
          valid: false,
          reason:
            "Etapa inválida."
        };
    }
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function canGoToStep(
    targetStep
  ) {
    const target =
      number(
        targetStep,
        -1
      );

    if (
      target < 0 ||
      target >=
        CONFIG.totalSteps
    ) {
      return false;
    }

    const current =
      state.currentStep;

    /*
     * Pode voltar para qualquer etapa
     * já percorrida.
     */
    if (
      target <=
      current
    ) {
      return true;
    }

    /*
     * NUNCA pula etapas.
     */
    if (
      target >
      current + 1
    ) {
      return false;
    }

    /*
     * Para entrar na próxima etapa,
     * a atual precisa passar na validação.
     *
     * Isso impede que as tabs futuras
     * sejam liberadas antecipadamente.
     */
    return validateStep(
      current
    ).valid;
  }


  function goToStep(
    step
  ) {
    const target =
      number(
        step,
        -1
      );

    if (
      !canGoToStep(
        target
      )
    ) {
      return false;
    }

    const previous =
      state.currentStep;

    setState(
      current => {
        current.currentStep =
          target;

        /*
         * Só o caminho percorrido
         * até a etapa atual permanece
         * potencialmente desbloqueado.
         */
        for (
          let i = target + 1;
          i < CONFIG.totalSteps;
          i += 1
        ) {
          current.completedSteps[
            i
          ] = false;
        }

        return current;
      }
    );

    emit(
      "aerion:navigation:changed",
      {
        previousStep:
          previous,

        currentStep:
          target,

        step:
          STEPS[target],

        state:
          getState()
      }
    );

    return true;
  }


  function completeCurrentStep() {
    const current =
      state.currentStep;

    const validation =
      validateStep(
        current
      );

    if (
      !validation.valid
    ) {
      emit(
        "aerion:step:validation-failed",
        {
          step:
            current,

          reason:
            validation.reason,

          state:
            getState()
        }
      );

      return {
        ok: false,

        reason:
          validation.reason
      };
    }

    setState(
      currentState => {
        currentState.completedSteps[
          current
        ] = true;

        return currentState;
      }
    );

    emit(
      "aerion:step:completed",
      {
        step:
          current,

        state:
          getState()
      }
    );

    return {
      ok: true
    };
  }


  function nextStep() {
    const current =
      state.currentStep;

    const validation =
      completeCurrentStep();

    if (
      !validation.ok
    ) {
      return false;
    }

    if (
      current >=
      CONFIG.totalSteps - 1
    ) {
      return false;
    }

    const next =
      current + 1;

    return goToStep(
      next
    );
  }


  function previousStep() {
    const current =
      state.currentStep;

    if (
      current <= 0
    ) {
      return false;
    }

    return goToStep(
      current - 1
    );
  }


  function markStepComplete(
    index
  ) {
    const target =
      number(
        index,
        -1
      );

    if (
      target < 0 ||
      target >=
        CONFIG.totalSteps
    ) {
      return false;
    }

    const validation =
      validateStep(
        target
      );

    if (
      !validation.valid
    ) {
      return false;
    }

    setState(
      current => {
        current.completedSteps[
          target
        ] = true;

        return current;
      }
    );

    return true;
  }


  /* =========================================================
     INPUTS
     ========================================================= */

  function handleInput(
    event
  ) {
    const element =
      event.target;

    if (!element) {
      return;
    }


    switch (element.id) {

      case "characterName":
        setIdentity({
          name:
            element.value
        });
        return;


      case "characterAge":
        setIdentity({
          age:
            element.value
        });
        return;


      case "characterDescription":
        setIdentity({
          description:
            element.value
        });
        return;


      case "characterOrigin":
        setIdentity({
          origin:
            element.value
        });
        return;


      default:
        break;
    }


    /*
     * Aparência.
     */
    if (
      element.dataset.appearanceField
    ) {
      const field =
        element.dataset.appearanceField;

      if (
        field ===
        "height"
      ) {
        setAppearance(
          field,
          element.value
        );
      }

      return;
    }


    /*
     * Atributos.
     */
    if (
      element.dataset.attribute ||
      element.dataset.attributeId
    ) {
      setAttributeValue(
        element.dataset.attribute ||
        element.dataset.attributeId,
        element.value
      );

      return;
    }


    /*
     * Perícias.
     */
    if (
      element.dataset.skill
    ) {
      setSkill(
        element.dataset.skill,
        element.value
      );
    }
  }


  function handleChange(
    event
  ) {
    const element =
      event.target;

    if (!element) {
      return;
    }


    if (
      element.name ===
      "gender"
    ) {
      setIdentity({
        gender:
          element.value
      });

      return;
    }


    if (
      element.dataset.appearanceField
    ) {
      setAppearance(
        element.dataset.appearanceField,
        element.value
      );

      return;
    }


    if (
      element.dataset.attribute ||
      element.dataset.attributeId
    ) {
      setAttributeValue(
        element.dataset.attribute ||
        element.dataset.attributeId,
        element.value
      );

      return;
    }


    if (
      element.dataset.skill
    ) {
      setSkill(
        element.dataset.skill,
        element.value
      );
    }
  }


  /* =========================================================
     AÇÕES
     ========================================================= */

  function handleAction(
    element
  ) {
    if (!element) {
      return;
    }

    const action =
      text(
        element.dataset.action
      );

    if (!action) {
      return;
    }


    /* -------------------------------------------------------
       NAVEGAÇÃO
       ------------------------------------------------------- */

    if (
      action === "next" ||
      action === "next-step"
    ) {
      const ok =
        nextStep();

      if (!ok) {
        emit(
          "aerion:navigation:blocked",
          {
            step:
              state.currentStep,

            reason:
              validateStep(
                state.currentStep
              ).reason
          }
        );
      }

      return;
    }


    if (
      action === "previous" ||
      action === "previous-step" ||
      action === "back" ||
      action === "go-back"
    ) {
      previousStep();
      return;
    }


    if (
      action === "go-step"
    ) {
      const target =
        number(
          element.dataset.step,
          -1
        );

      if (
        !goToStep(target)
      ) {
        emit(
          "aerion:navigation:blocked",
          {
            step:
              state.currentStep,

            reason:
              "Essa etapa ainda está bloqueada."
          }
        );
      }

      return;
    }


    /* -------------------------------------------------------
       RAÇA
       ------------------------------------------------------- */

    if (
      action === "race-next"
    ) {
      previewRace(1);
      return;
    }


    if (
      action === "race-previous"
    ) {
      previewRace(-1);
      return;
    }


    if (
      action === "race-goto"
    ) {
      const target =
        number(
          element.dataset.raceIndex,
          -1
        );

      const races =
        getRaces();

      if (
        target < 0 ||
        target >=
          races.length
      ) {
        return;
      }

      setState(
        current => {
          current.raceIndex =
            target;

          return current;
        }
      );

      emit(
        "aerion:race:preview",
        {
          raceIndex:
            target,

          race:
            races[target],

          state:
            getState()
        }
      );

      return;
    }


    if (
      action === "select-race" ||
      action === "select-race-current"
    ) {
      selectPreviewRace();
      return;
    }


    /* -------------------------------------------------------
       ANIMALHA
       ------------------------------------------------------- */

    if (
      action ===
        "select-animalha-category"
    ) {
      selectAnimalhaCategory(
        element.dataset.animalhaCategory ||
        element.dataset.category ||
        ""
      );

      return;
    }


    if (
      action ===
        "select-animalha"
    ) {
      selectAnimalha(
        element.dataset.animalha ||
        element.dataset.animalId ||
        ""
      );

      return;
    }


    /* -------------------------------------------------------
       CLASSE
       ------------------------------------------------------- */

    if (
      action ===
        "select-class"
    ) {
      selectClass(
        element.dataset.classId ||
        element.dataset.class ||
        ""
      );

      return;
    }


    /* -------------------------------------------------------
       DADOS
       ------------------------------------------------------- */

    if (
      action ===
        "assign-die" ||
      action ===
        "assign-dice"
    ) {
      const result =
        assignDieToAttribute(
          element.dataset.diceId ||
          element.dataset.dieId ||
          "",
          element.dataset.attribute ||
          element.dataset.attributeId ||
          ""
        );

      if (
        result.ok === false
      ) {
        emit(
          "aerion:dice:error",
          result
        );
      }

      return;
    }


    if (
      action ===
        "remove-die" ||
      action ===
        "remove-dice"
    ) {
      removeDieFromAttribute(
        element.dataset.attribute ||
        element.dataset.attributeId ||
        ""
      );

      return;
    }


    /*
     * Ação real usada pelo HTML.
     */
    if (
      action ===
        "roll-attribute"
    ) {
      const attribute =
        element.dataset.attribute ||
        element.dataset.attributeId ||
        "";

      const result =
        rollAttribute(
          attribute
        );

      if (
        result.ok === false
      ) {
        emit(
          "aerion:dice:error",
          result
        );
      } else {
        emit(
          "aerion:ui:roll-result",
          {
            result:
              result.result,

            attribute,

            state:
              getState()
          }
        );
      }

      return;
    }


    if (
      action ===
        "roll-die" ||
      action ===
        "roll-dice"
    ) {
      const attribute =
        element.dataset.attribute ||
        element.dataset.attributeId;

      const result =
        attribute
          ? rollAttribute(
              attribute
            )
          : rollDie(
              element.dataset.diceId ||
              element.dataset.dieId ||
              ""
            );

      if (
        result.ok === false
      ) {
        emit(
          "aerion:dice:error",
          result
        );
      }

      return;
    }


    if (
      action ===
        "clear-dice"
    ) {
      clearDiceAssignments();
      return;
    }


    /* -------------------------------------------------------
       AVATAR
       ------------------------------------------------------- */

    if (
      action ===
        "remove-avatar"
    ) {
      removeAvatar();
      return;
    }


    /* -------------------------------------------------------
       TÉCNICAS
       ------------------------------------------------------- */

    if (
      action ===
        "remove-technique"
    ) {
      removeTechnique(
        element.dataset.index
      );

      return;
    }


    /* -------------------------------------------------------
       INVENTÁRIO
       ------------------------------------------------------- */

    if (
      action ===
        "remove-inventory"
    ) {
      removeInventoryItem(
        element.dataset.index
      );

      return;
    }
  }


  /* =========================================================
     EVENTOS
     =========================================================

     SOMENTE ESTE ARQUIVO captura [data-action].

     Não existe outro click listener da ficha.
     ========================================================= */

  function bindEvents() {

    document.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-action]"
          );

        if (!button) {
          return;
        }

        /*
         * Impede que outro sistema
         * processe a mesma ação.
         */
        event.preventDefault();
        event.stopPropagation();

        handleAction(
          button
        );
      },
      true
    );


    document.addEventListener(
      "input",
      handleInput
    );


    document.addEventListener(
      "change",
      handleChange
    );


    const avatarInput =
      document.querySelector(
        "#avatarInput"
      );

    if (
      avatarInput
    ) {
      avatarInput.addEventListener(
        "change",
        async event => {
          const file =
            event.target.files?.[0];

          if (!file) {
            return;
          }

          try {
            await setAvatarFile(
              file
            );
          } catch (error) {
            console.error(
              "[AERION][FICHA] Avatar:",
              error
            );

            window.alert(
              error.message
            );
          }
        }
      );
    }
  }


  /* =========================================================
     RENDER
     ========================================================= */

  function requestRender() {
    const snapshot =
      getState();

    emit(
      "aerion:ficha:render",
      {
        state:
          snapshot
      }
    );

    emit(
      "aerion:personagem:render",
      {
        state:
          snapshot
      }
    );
  }


  /* =========================================================
     API
     ========================================================= */

  const API = Object.freeze({

    /* estado */

    getState,

    setState,

    save:
      saveLocal,

    load:
      loadLocal,


    /* identidade */

    setIdentity,


    /* raça */

    selectRace,

    previewRace,

    selectPreviewRace,

    getPreviewRace,


    /* Animalha */

    selectAnimalhaCategory,

    selectAnimalha,


    /* aparência */

    setAppearance,

    setAppearanceValues,


    /* classe */

    selectClass,


    /* atributos */

    setAttributeValue,

    areAllAttributesFilled,


    /* dados */

    getDice,

    getDiceByAttribute,

    getAvailableDice,

    assignDieToAttribute,

    removeDieFromAttribute,

    rollDie,

    rollAttribute,

    rollAttributeById,

    rollDiceForAttribute,

    clearDiceAssignments,


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

    addInventoryItem,

    removeInventoryItem,


    /* avatar */

    setAvatarFile,

    removeAvatar,


    /* navegação */

    markStepComplete,

    canGoToStep,

    goToStep,

    nextStep,

    previousStep,

    validateStep,

    completeCurrentStep,


    /* render */

    requestRender,


    /* catálogos */

    getSteps() {
      return clone(STEPS);
    },

    getAttributes() {
      return clone(ATTRIBUTES);
    },

    getClasses() {
      return clone(CLASSES);
    },

    getSkills() {
      return clone(SKILLS);
    }
  });


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  window.AERIONFicha =
    API;

  window.AERION_FICHA =
    API;


  /* =========================================================
     BOOT
     ========================================================= */

  function boot() {

    loadLocal();

    /*
     * Nunca deixar estado antigo
     * apontando para uma etapa que
     * deveria estar bloqueada.
     */
    state =
      normalizeState(
        state
      );

    bindEvents();

    updateSaveStatus(
      state.saved
    );

    emit(
      "aerion:ficha:ready",
      {
        state:
          getState()
      }
    );

    requestRender();

    console.info(
      "[AERION][FICHA] Núcleo inicializado.",
      {
        currentStep:
          state.currentStep,

        race:
          state.race,

        class:
          state.class
      }
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }

})();