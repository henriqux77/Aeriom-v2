/* =========================================================
   AERION — FICHA
   js/core/ficha.js

   NÚCLEO DA FICHA

   ESTE ARQUIVO É A AUTORIDADE DO ESTADO.

   Responsável por:
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
   - salvamento local.

   Não responsável por:
   - desenho do personagem;
   - CSS;
   - renderização visual;
   - criação de SVG.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    storageKey:
      "aerion:ficha:draft:v15",

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


  const ATTRIBUTE_IDS =
    new Set(
      ATTRIBUTES.map(
        item => item.id
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
      id:
        "guerreiro",

      name:
        "Guerreiro",

      role:
        "Combatente",

      icon:
        "⚔",

      description:
        "Especialista em combate direto.",

      skillBonuses: {
        atletismo:
          1,

        tatica:
          1
      }
    },


    feiticeiro: {
      id:
        "feiticeiro",

      name:
        "Feiticeiro",

      role:
        "Mágico",

      icon:
        "✦",

      description:
        "Especialista em manipulação de Mana.",

      skillBonuses: {
        conhecimento:
          1,

        controle_mana:
          1
      }
    },


    curandeiro: {
      id:
        "curandeiro",

      name:
        "Curandeiro",

      role:
        "Suporte",

      icon:
        "✚",

      description:
        "Especialista em recuperação e suporte.",

      skillBonuses: {
        medicina:
          1,

        intuicao:
          1
      }
    },


    monge: {
      id:
        "monge",

      name:
        "Monge",

      role:
        "Marcial",

      icon:
        "◈",

      description:
        "Especialista em combate corporal e disciplina.",

      skillBonuses: {
        atletismo:
          1,

        controle_mana:
          1
      }
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
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }


  function number(
    value,
    fallback = 0
  ) {
    const parsed =
      Number(
        value
      );

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


  function text(
    value
  ) {
    return String(
      value ??
      ""
    ).trim();
  }


  function normalize(
    value
  ) {
    return text(
      value
    )
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
    name,
    detail = {}
  ) {
    window.dispatchEvent(
      new CustomEvent(
        name,
        {
          detail
        }
      )
    );
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function createAppearance() {

    return {

      /*
       * A altura é a única alteração visual
       * que o sistema controla por enquanto.
       */

      height:
        null,

      bodyType:
        "average",

      width:
        1,

      shoulders:
        1,

      torso:
        1,

      arms:
        1,

      legs:
        1,

      head:
        1,

      /*
       * Campos preservados para o futuro.
       * Eles ficam armazenados, mas NÃO são
       * desenhados por este arquivo.
       */

      skin:
        "",

      skinVariant:
        "",

      hair:
        "",

      hairStyle:
        "",

      hairColor:
        "",

      eyeShape:
        "",

      eyes:
        "",

      eyeColor:
        "",

      eyebrows:
        "",

      nose:
        "",

      mouth:
        "",

      facialHair:
        "",

      facialHairColor:
        "",

      ears:
        "",

      horns:
        "",

      wings:
        "",

      tail:
        "",

      furColor:
        "",

      furPattern:
        "",

      feathersColor:
        "",

      scalesColor:
        "",

      markings:
        "",

      markingsColor:
        "",

      markingOpacity:
        1,

      markingScale:
        1,

      markingLocation:
        "",

      birthmark:
        "",

      birthmarkColor:
        "",

      birthmarkOpacity:
        1,

      birthmarkScale:
        1,

      birthmarkLocation:
        "",

      scars:
        "",

      scarCount:
        1,

      scarSize:
        1,

      scarLocation:
        "",

      tattoos:
        "",

      tattooColor:
        "",

      tattooOpacity:
        1,

      tattooScale:
        1,

      tattooLocation:
        "",

      piercings:
        "",

      piercingLocation:
        "",

      piercingMaterial:
        "",

      clothing:
        "",

      clothingStyle:
        "",

      shirt:
        "",

      pants:
        "",

      skirt:
        "",

      dress:
        "",

      coat:
        "",

      cape:
        "",

      robe:
        "",

      tunic:
        "",

      belt:
        "",

      gloves:
        "",

      boots:
        "",

      socks:
        "",

      armor:
        "",

      armorStyle:
        "",

      shoulderArmor:
        "",

      chestArmor:
        "",

      armArmor:
        "",

      legArmor:
        "",

      helmet:
        "",

      hat:
        "",

      headband:
        "",

      hood:
        "",

      mask:
        "",

      glasses:
        "",

      necklace:
        "",

      earrings:
        "",

      bracelet:
        "",

      rings:
        "",

      watch:
        "",

      bag:
        "",

      pouch:
        "",

      backpack:
        "",

      quiver:
        "",

      holster:
        "",

      scabbard:
        "",

      weapon:
        "",

      mainHand:
        "",

      offHand:
        "",

      secondaryWeapon:
        "",

      backWeapon:
        "",

      handItem:
        "",

      book:
        "",

      lantern:
        "",

      bottle:
        "",

      scroll:
        "",

      tool:
        "",

      trinket:
        "",

      physicalNotes:
        ""

    };
  }


  /* =========================================================
     ESTADO PADRÃO
     ========================================================= */

  function createDefaultState() {

    return {

      currentStep:
        0,

      completedSteps:
        [true],

      name:
        "",

      age:
        "",

      gender:
        "",

      description:
        "",

      origin:
        "",

      race:
        "",

      raceIndex:
        0,

      animalha:
        "",

      animalhaCategory:
        "",

      appearance:
        createAppearance(),

      avatar:
        "",

      avatarName:
        "",

      class:
        "",

      attributes:
        Object.fromEntries(
          ATTRIBUTES.map(
            attribute => [
              attribute.id,
              null
            ]
          )
        ),

      assignedDice:
        Object.fromEntries(
          ATTRIBUTES.map(
            attribute => [
              attribute.id,
              null
            ]
          )
        ),

      diceResults:
        {},

      lastRoll:
        null,

      primaryPower:
        "",

      parallelPower:
        "",

      mana:
        {
          current:
            0,

          max:
            0
        },

      skills:
        Object.fromEntries(
          Object.keys(
            SKILLS
          ).map(
            id => [
              id,
              0
            ]
          )
        ),

      techniques:
        [],

      inventory:
        [],

      saved:
        false

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
     NORMALIZAÇÃO
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


    result.inventory =
      Array.isArray(
        source.inventory
      )
        ? source.inventory
        : [];


    result.techniques =
      Array.isArray(
        source.techniques
      )
        ? source.techniques
        : [];


    result.completedSteps =
      Array.isArray(
        source.completedSteps
      )
        ? [...source.completedSteps]
        : [true];


    result.currentStep =
      clamp(
        number(
          source.currentStep,
          0
        ),
        0,
        CONFIG.totalSteps - 1
      );


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


    if (
      element
    ) {
      element.textContent =
        saved
          ? "Salvo"
          : "Salvamento automático";
    }
  }


  function saveLocal() {

    try {

      const copy =
        clone(
          state
        );


      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(
          copy
        )
      );


      state.saved =
        true;


      updateSaveStatus(
        true
      );


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
    }
  }


  function scheduleSave() {

    state.saved =
      false;


    updateSaveStatus(
      false
    );


    if (
      saveTimer
    ) {
      clearTimeout(
        saveTimer
      );
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


      if (
        !raw
      ) {
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


      return true;

    } catch (
      error
    ) {

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
    return clone(
      state
    );
  }


  function setState(
    updater,
    options = {}
  ) {

    const previous =
      clone(
        state
      );


    let nextState;


    if (
      typeof updater ===
      "function"
    ) {

      nextState =
        updater(
          clone(
            state
          )
        );

    } else {

      nextState = {
        ...state,
        ...(updater || {})
      };
    }


    state =
      normalizeState(
        nextState
      );


    if (
      options.save !==
      false
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

    setState(
      current => {

        if (
          values.name !==
          undefined
        ) {
          current.name =
            text(
              values.name
            );
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
            text(
              values.gender
            );
        }


        if (
          values.description !==
          undefined
        ) {
          current.description =
            text(
              values.description
            );
        }


        if (
          values.origin !==
          undefined
        ) {
          current.origin =
            text(
              values.origin
            );
        }


        current.completedSteps[0] =
          true;


        return current;
      }
    );


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
      normalize(
        raceId
      );


    if (
      !normalized
    ) {
      return false;
    }


    setState(
      current => {

        current.race =
          normalized;


        if (
          raceIndex !==
          null
        ) {

          current.raceIndex =
            Math.max(
              0,
              number(
                raceIndex,
                0
              )
            );
        }


        /*
         * Trocar raça invalida a escolha
         * específica de Animalha.
         */

        current.animalha =
          "";

        current.animalhaCategory =
          "";


        /*
         * A raça foi concluída.
         */

        current.completedSteps[1] =
          true;


        return current;
      }
    );


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


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function selectAnimalhaCategory(
    categoryId
  ) {

    const category =
      normalize(
        categoryId
      );


    if (
      !category
    ) {
      return false;
    }


    setState(
      current => {

        current.animalhaCategory =
          category;

        current.animalha =
          "";

        return current;
      }
    );


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
      normalize(
        animalId
      );


    if (
      !animal
    ) {
      return false;
    }


    setState(
      current => {

        current.animalha =
          animal;

        current.completedSteps[1] =
          true;

        return current;
      }
    );


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
      text(
        field
      );


    if (
      !key
    ) {
      return false;
    }


    setState(
      current => {

        current.appearance[key] =
          value;

        return current;
      }
    );


    emit(
      "aerion:appearance:updated",
      {
        field:
          key,

        value,

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


    setState(
      current => {

        current.appearance = {
          ...current.appearance,
          ...values
        };


        return current;
      }
    );


    emit(
      "aerion:appearance:updated",
      {
        values:
          clone(
            values
          ),

        state:
          getState()
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
      !id
    ) {
      return false;
    }


    if (
      !CLASSES[id]
    ) {
      console.warn(
        "[AERION][FICHA] Classe não encontrada:",
        id
      );
    }


    setState(
      current => {

        current.class =
          id;


        const classData =
          CLASSES[id];


        if (
          classData?.skillBonuses
        ) {

          Object.entries(
            classData.skillBonuses
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
        }


        current.completedSteps[3] =
          true;


        return current;
      }
    );


    emit(
      "aerion:class:selected",
      {
        classId:
          id,

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

    const id =
      normalize(
        attributeId
      );


    const aliases = {
      forca:
        "forca",

      força:
        "forca",

      vigor:
        "vigor",

      agilidade:
        "agilidade",

      precisao:
        "precisao",

      precisão:
        "precisao",

      intelecto:
        "intelecto",

      controle:
        "controle",

      presenca:
        "presenca",

      presença:
        "presenca",

      percepcao:
        "percepcao",

      percepção:
        "percepcao"
    };


    return (
      aliases[id] ||
      id
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
      !ATTRIBUTE_IDS.has(
        id
      )
    ) {
      return false;
    }


    const next =
      value ===
        null ||
      value ===
        ""
        ? null
        : number(
            value,
            0
          );


    setState(
      current => {

        current.attributes[id] =
          next;

        return current;
      }
    );


    emit(
      "aerion:attribute:updated",
      {
        attribute:
          id,

        value:
          state.attributes[id],

        state:
          getState()
      }
    );


    return true;
  }


  /* =========================================================
     DADOS — DISPONIBILIDADE
     ========================================================= */

  function getDice() {
    return clone(
      DICE
    );
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
        ).filter(
          Boolean
        )
      );


    return DICE.filter(
      die =>
        !used.has(
          die.id
        )
    ).map(
      clone
    );
  }


  /* =========================================================
     VERIFICAR SE O DADO JÁ FOI USADO
     ========================================================= */

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


  /* =========================================================
     ATRIBUIR DADO
     ========================================================= */

  function assignDieToAttribute(
    diceId,
    attributeId
  ) {

    const id =
      normalizeAttribute(
        attributeId
      );


    const die =
      DICE_BY_ID[
        diceId
      ];


    if (
      !die
    ) {

      return {
        ok:
          false,

        error:
          "Dado inválido."
      };
    }


    if (
      !ATTRIBUTE_IDS.has(
        id
      )
    ) {

      return {
        ok:
          false,

        error:
          "Atributo inválido."
      };
    }


    /*
     * UM DADO É IDENTIFICADO PELO ID,
     * NÃO PELO TIPO.
     *
     * Assim:
     *
     * d20-1 !== d20-2
     *
     * Isso corrige o bug de dois D20
     * interferirem um no outro.
     */

    if (
      isDiceAssigned(
        die.id,
        id
      )
    ) {

      return {
        ok:
          false,

        error:
          "Esse dado já está atribuído."
      };
    }


    /*
     * Se o atributo já tinha outro dado,
     * substituímos a associação.
     */

    const oldDice =
      state.assignedDice[
        id
      ];


    setState(
      current => {

        current.assignedDice[id] =
          die.id;


        /*
         * Só criamos o slot do resultado.
         */

        if (
          !Object.prototype.hasOwnProperty.call(
            current.diceResults,
            die.id
          )
        ) {

          current.diceResults[
            die.id
          ] =
            null;
        }


        return current;
      }
    );


    emit(
      "aerion:dice:assigned",
      {
        diceId:
          die.id,

        attributeId:
          id,

        previousDiceId:
          oldDice || null,

        state:
          getState()
      }
    );


    return {
      ok:
        true,

      diceId:
        die.id,

      attributeId:
        id,

      previousDiceId:
        oldDice || null
    };
  }


  /* =========================================================
     REMOVER DADO
     ========================================================= */

  function removeDieFromAttribute(
    attributeId
  ) {

    const id =
      normalizeAttribute(
        attributeId
      );


    if (
      !ATTRIBUTE_IDS.has(
        id
      )
    ) {
      return false;
    }


    const diceId =
      state.assignedDice[
        id
      ];


    if (
      !diceId
    ) {
      return false;
    }


    setState(
      current => {

        current.assignedDice[id] =
          null;

        return current;
      }
    );


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
      DICE_BY_ID[
        diceId
      ];


    if (
      !die
    ) {

      return {
        ok:
          false,

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
          ok:
            false,

          error:
            "Atributo inválido."
        };
      }
    }


    /*
     * Rola.
     */

    const result =
      randomInteger(
        1,
        die.sides
      );


    setState(
      current => {

        current.diceResults[
          die.id
        ] =
          result;


        /*
         * Se existe um atributo explicitamente
         * informado, ele recebe o resultado.
         */

        if (
          normalizedAttribute
        ) {

          current.attributes[
            normalizedAttribute
          ] =
            result;

        }


        /*
         * Registra a última rolagem.
         */

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


        /*
         * A rolagem de um atributo completa
         * a etapa de atributos.
         */

        if (
          normalizedAttribute
        ) {

          current.completedSteps[4] =
            true;

        }


        return current;
      }
    );


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
      ok:
        true,

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


  /* =========================================================
     ROLAR ATRIBUTO
     ========================================================= */

  function rollAttribute(
    attributeId
  ) {

    const id =
      normalizeAttribute(
        attributeId
      );


    if (
      !ATTRIBUTE_IDS.has(
        id
      )
    ) {

      return {
        ok:
          false,

        error:
          "Atributo inválido."
      };
    }


    const diceId =
      state.assignedDice[
        id
      ];


    if (
      !diceId
    ) {

      return {
        ok:
          false,

        error:
          "Nenhum dado atribuído a este atributo."
      };
    }


    return rollDie(
      diceId,
      id
    );
  }


  /* =========================================================
     ALIASES DE COMPATIBILIDADE
     ========================================================= */

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
     LIMPAR DADOS
     ========================================================= */

  function clearDiceAssignments() {

    setState(
      current => {

        current.assignedDice =
          Object.fromEntries(
            ATTRIBUTES.map(
              attribute => [
                attribute.id,
                null
              ]
            )
          );


        return current;
      }
    );


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
     PODER
     ========================================================= */

  function setPower(
    primary,
    parallel
  ) {

    setState(
      current => {

        if (
          primary !==
          undefined
        ) {

          current.primaryPower =
            text(
              primary
            );
        }


        if (
          parallel !==
          undefined
        ) {

          current.parallelPower =
            text(
              parallel
            );
        }


        current.completedSteps[5] =
          true;


        return current;
      }
    );


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
    maxMana
  ) {

    setState(
      current => {

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
          current.mana.current >
          current.mana.max
        ) {

          current.mana.current =
            current.mana.max;
        }


        current.completedSteps[6] =
          true;


        return current;
      }
    );


    emit(
      "aerion:mana:updated",
      {
        mana:
          clone(
            state.mana
          ),

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


    setState(
      current => {

        current.skills[id] =
          number(
            value,
            0
          );


        return current;
      }
    );


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

    if (
      !technique
    ) {
      return false;
    }


    setState(
      current => {

        current.techniques.push(
          typeof technique ===
            "string"
            ? {
                name:
                  technique
              }
            : clone(
                technique
              )
        );


        current.completedSteps[8] =
          true;


        return current;
      }
    );


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


    setState(
      current => {

        current.techniques.splice(
          i,
          1
        );


        return current;
      }
    );


    emit(
      "aerion:technique:removed",
      {
        index:
          i,

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

    if (
      !item
    ) {
      return false;
    }


    setState(
      current => {

        current.inventory.push(
          typeof item ===
            "string"
            ? {
                name:
                  item,

                quantity:
                  1
              }
            : clone(
                item
              )
        );


        current.completedSteps[9] =
          true;


        return current;
      }
    );


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


    setState(
      current => {

        current.inventory.splice(
          i,
          1
        );


        return current;
      }
    );


    emit(
      "aerion:inventory:item-removed",
      {
        index:
          i,

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

    if (
      !file
    ) {
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
            () =>
              resolve(
                reader.result
              );


          reader.onerror =
            () =>
              reject(
                new Error(
                  "Não foi possível ler a imagem."
                )
              );


          reader.readAsDataURL(
            file
          );

        }
      );


    setState(
      current => {

        current.avatar =
          dataUrl;

        current.avatarName =
          file.name;

        return current;
      }
    );


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

    setState(
      current => {

        current.avatar =
          "";

        current.avatarName =
          "";

        return current;
      }
    );


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
     NAVEGAÇÃO
     ========================================================= */

  function markStepComplete(
    index
  ) {

    if (
      index < 0 ||
      index >=
        CONFIG.totalSteps
    ) {
      return false;
    }


    setState(
      current => {

        current.completedSteps[
          index
        ] =
          true;


        return current;
      }
    );


    return true;
  }


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
     * Pode voltar normalmente.
     */

    if (
      target <=
      current
    ) {
      return true;
    }


    /*
     * Para avançar exatamente uma etapa,
     * basta a etapa atual estar concluída.
     */

    if (
      target ===
      current + 1
    ) {

      return (
        state.completedSteps[
          current
        ] ===
        true
      );
    }


    /*
     * Não pode pular etapas.
     */

    return false;
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


  function nextStep() {

    const current =
      state.currentStep;


    /*
     * A etapa atual precisa estar concluída.
     */

    if (
      !state.completedSteps[
        current
      ]
    ) {

      /*
       * Para a primeira etapa, validamos
       * apenas a existência de nome.
       */

      if (
        current ===
        0
      ) {

        const valid =
          Boolean(
            text(
              state.name
            )
          ) &&
          Boolean(
            text(
              state.gender
            )
          );


        if (
          !valid
        ) {

          emit(
            "aerion:navigation:blocked",
            {
              step:
                current,

              reason:
                "Preencha nome e gênero."
            }
          );


          return false;
        }


        state.completedSteps[0] =
          true;
      }
    }


    const next =
      Math.min(
        current + 1,
        CONFIG.totalSteps - 1
      );


    if (
      next ===
      current
    ) {
      return false;
    }


    return goToStep(
      next
    );
  }


  function previousStep() {

    const current =
      state.currentStep;


    if (
      current <=
      0
    ) {
      return false;
    }


    return goToStep(
      current - 1
    );
  }


  /* =========================================================
     VALIDAR ETAPA
     ========================================================= */

  function validateStep(
    step
  ) {

    const index =
      number(
        step,
        state.currentStep
      );


    switch (
      index
    ) {

      case 0:

        return {

          valid:
            Boolean(
              text(
                state.name
              )
            ) &&
            Boolean(
              text(
                state.gender
              )
            ),

          reason:
            "Nome e gênero são obrigatórios."

        };


      case 1:

        return {

          valid:
            Boolean(
              text(
                state.race
              )
            ),

          reason:
            "Escolha uma raça."

        };


      case 2:

        return {

          valid:
            true,

          reason:
            ""

        };


      case 3:

        return {

          valid:
            Boolean(
              text(
                state.class
              )
            ),

          reason:
            "Escolha uma classe."

        };


      case 4:

        return {

          valid:
            ATTRIBUTES.every(
              attribute =>
                state.attributes[
                  attribute.id
                ] !==
                null
            ),

          reason:
            "Preencha todos os atributos."

        };


      case 5:

        return {

          valid:
            true,

          reason:
            ""

        };


      case 6:

        return {

          valid:
            true,

          reason:
            ""

        };


      case 7:

        return {

          valid:
            true,

          reason:
            ""

        };


      case 8:

        return {

          valid:
            true,

          reason:
            ""

        };


      case 9:

        return {

          valid:
            true,

          reason:
            ""

        };


      case 10:

        return {

          valid:
            true,

          reason:
            ""

        };


      default:

        return {

          valid:
            false,

          reason:
            "Etapa inválida."

        };
    }
  }


  /* =========================================================
     CONCLUIR ETAPA
     ========================================================= */

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
        ok:
          false,

        reason:
          validation.reason
      };
    }


    setState(
      currentState => {

        currentState.completedSteps[
          current
        ] =
          true;


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
      ok:
        true
    };
  }


  /* =========================================================
     RENDER REQUEST
     ========================================================= */

  function requestRender() {

    emit(
      "aerion:ficha:render",
      {
        state:
          getState()
      }
    );


    emit(
      "aerion:personagem:render",
      {
        state:
          getState()
      }
    );
  }


  /* =========================================================
     FORM INPUTS
     ========================================================= */

  function handleInput(
    event
  ) {

    const element =
      event.target;


    if (
      !element
    ) {
      return;
    }


    /*
     * Identidade.
     */

    if (
      element.id ===
      "characterName"
    ) {

      setIdentity({
        name:
          element.value
      });

      return;
    }


    if (
      element.id ===
      "characterAge"
    ) {

      setIdentity({
        age:
          element.value
      });

      return;
    }


    if (
      element.id ===
      "characterDescription"
    ) {

      setIdentity({
        description:
          element.value
      });

      return;
    }


    if (
      element.id ===
      "characterOrigin"
    ) {

      setIdentity({
        origin:
          element.value
      });

      return;
    }


    /*
     * Altura e outros campos de aparência.
     */

    const appearanceField =
      element.dataset.appearanceField;


    if (
      appearanceField
    ) {

      const value =
        (
          element.type ===
            "range" ||
          element.type ===
            "number"
        )
          ? number(
              element.value
            )
          : element.value;


      setAppearance(
        appearanceField,
        value
      );


      return;
    }


    /*
     * Compatibilidade direta com
     * data-appearance.
     */

    const appearance =
      element.dataset.appearance;


    if (
      appearance
    ) {

      const value =
        (
          element.type ===
            "range" ||
          element.type ===
            "number"
        )
          ? number(
              element.value
            )
          : element.value;


      setAppearance(
        appearance,
        value
      );
    }
  }


  function handleChange(
    event
  ) {

    const element =
      event.target;


    if (
      !element
    ) {
      return;
    }


    /*
     * Gênero.
     */

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


    /*
     * Aparência.
     */

    const appearanceField =
      element.dataset.appearanceField;


    if (
      appearanceField
    ) {

      setAppearance(
        appearanceField,
        element.value
      );


      return;
    }


    /*
     * Atributo.
     */

    const attribute =
      element.dataset.attribute ||
      element.dataset.attributeId;


    if (
      attribute
    ) {

      setAttributeValue(
        attribute,
        element.value
      );


      return;
    }


    /*
     * Perícia.
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


  /* =========================================================
     AÇÕES
     ========================================================= */

  function handleAction(
    element
  ) {

    if (
      !element
    ) {
      return;
    }


    const action =
      normalize(
        element.dataset.action
      );


    if (
      !action
    ) {
      return;
    }


    switch (
      action
    ) {

      /* -----------------------------------------
         NAVEGAÇÃO
         ----------------------------------------- */

      case "next":
      case "next_step":
      case "next-step":

        completeCurrentStep();

        nextStep();

        break;


      case "previous":
      case "previous_step":
      case "previous-step":
      case "back":
      case "go-back":

        previousStep();

        break;


      case "go_step":
      case "go-step":

        goToStep(
          element.dataset.step
        );

        break;


      /* -----------------------------------------
         RAÇA
         ----------------------------------------- */

      case "select_race":
      case "select-race":

        selectRace(
          element.dataset.race ||
          element.dataset.raceId ||
          ""
        );

        break;


      case "race_next":
      case "race-next":

        emit(
          "aerion:race:next"
        );

        break;


      case "race_previous":
      case "race-previous":

        emit(
          "aerion:race:previous"
        );

        break;


      /* -----------------------------------------
         ANIMALHA
         ----------------------------------------- */

      case "select_animalha_category":
      case "select-animalha-category":

        selectAnimalhaCategory(
          element.dataset.animalhaCategory ||
          element.dataset.category ||
          ""
        );

        break;


      case "select_animalha":
      case "select-animalha":

        selectAnimalha(
          element.dataset.animalha ||
          element.dataset.animalId ||
          ""
        );

        break;


      /* -----------------------------------------
         CLASSE
         ----------------------------------------- */

      case "select_class":
      case "select-class":

        selectClass(
          element.dataset.class ||
          element.dataset.classId ||
          ""
        );

        break;


      /* -----------------------------------------
         DADOS
         ----------------------------------------- */

      case "assign_die":
      case "assign-die":
      case "assign_dice":
      case "assign-dice":

        assignDieToAttribute(
          element.dataset.diceId ||
          element.dataset.dieId ||
          "",

          element.dataset.attribute ||
          element.dataset.attributeId ||
          ""
        );

        break;


      case "remove_die":
      case "remove-die":
      case "remove_dice":
      case "remove-dice":

        removeDieFromAttribute(
          element.dataset.attribute ||
          element.dataset.attributeId ||
          ""
        );

        break;


      /*
       * ESTA É A CORREÇÃO PRINCIPAL.
       *
       * O HTML atual usa:
       *
       * data-action="roll-attribute"
       *
       * portanto esse action precisa existir.
       */

      case "roll_attribute":
      case "roll-attribute":

        {

          const attribute =
            element.dataset.attribute ||
            element.dataset.attributeId;


          const result =
            rollAttribute(
              attribute
            );


          if (
            result.ok
          ) {

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

        }

        break;


      case "roll_die":
      case "roll-die":
      case "roll_dice":
      case "roll-dice":

        {

          const attribute =
            element.dataset.attribute ||
            element.dataset.attributeId;


          if (
            attribute
          ) {

            rollAttribute(
              attribute
            );

          } else {

            rollDie(
              element.dataset.diceId ||
              element.dataset.dieId ||
              ""
            );

          }

        }

        break;


      case "clear_dice":
      case "clear-dice":

        clearDiceAssignments();

        break;


      /* -----------------------------------------
         AVATAR
         ----------------------------------------- */

      case "remove_avatar":
      case "remove-avatar":

        removeAvatar();

        break;

    }
  }


  /* =========================================================
     EVENT DELEGER
     ========================================================= */

  function bindEvents() {

    document.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-action]"
          );


        if (
          !button
        ) {
          return;
        }


        handleAction(
          button
        );

      }
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
     * Avatar.
     */

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


          if (
            !file
          ) {
            return;
          }


          try {

            await setAvatarFile(
              file
            );

          } catch (
            error
          ) {

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
     API
     ========================================================= */

  const API = Object.freeze({

    /* Estado */

    getState,

    setState,

    save:
      saveLocal,

    load:
      loadLocal,


    /* Identidade */

    setIdentity,


    /* Raça */

    selectRace,


    /* Animalha */

    selectAnimalhaCategory,

    selectAnimalha,


    /* Aparência */

    setAppearance,

    setAppearanceValues,


    /* Classe */

    selectClass,


    /* Atributos */

    setAttributeValue,


    /* Dados */

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


    /* Poder */

    setPower,


    /* Mana */

    setMana,


    /* Perícias */

    setSkill,


    /* Técnicas */

    addTechnique,

    removeTechnique,


    /* Inventário */

    addInventoryItem,

    removeInventoryItem,


    /* Avatar */

    setAvatarFile,

    removeAvatar,


    /* Navegação */

    markStepComplete,

    canGoToStep,

    goToStep,

    nextStep,

    previousStep,

    validateStep,

    completeCurrentStep,


    /* Render */

    requestRender,


    /* Catálogos */

    getSteps() {
      return clone(
        STEPS
      );
    },


    getAttributes() {
      return clone(
        ATTRIBUTES
      );
    },


    getClasses() {
      return clone(
        CLASSES
      );
    },


    getSkills() {
      return clone(
        SKILLS
      );
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
     INICIALIZAÇÃO
     ========================================================= */

  function boot() {

    loadLocal();

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
        step:
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
        once:
          true
      }
    );

  } else {

    boot();
  }

})();