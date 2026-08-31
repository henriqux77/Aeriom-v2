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
   - rolagem;
   - poder;
   - mana;
   - perícias;
   - técnicas;
   - inventário;
   - navegação;
   - autosave.

   REGRA ARQUITETURAL:
   ficha.js = autoridade dos dados.
   ficha-render.js = apresentação da ficha.
   personagem-assets.js = catálogo visual.
   personagem-render.js = apresentação visual.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    storageKey:
      "aerion:ficha:draft:v14",

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
      id:
        "identity",
      name:
        "Identidade"
    },

    {
      id:
        "race",
      name:
        "Raça"
    },

    {
      id:
        "appearance",
      name:
        "Aparência"
    },

    {
      id:
        "class",
      name:
        "Classe"
    },

    {
      id:
        "attributes",
      name:
        "Atributos"
    },

    {
      id:
        "power",
      name:
        "Poder"
    },

    {
      id:
        "mana",
      name:
        "Mana"
    },

    {
      id:
        "skills",
      name:
        "Perícias"
    },

    {
      id:
        "techniques",
      name:
        "Técnicas"
    },

    {
      id:
        "inventory",
      name:
        "Inventário"
    },

    {
      id:
        "review",
      name:
        "Revisão"
    }
  ]);


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTES = Object.freeze([
    {
      id:
        "forca",

      name:
        "Força"
    },

    {
      id:
        "vigor",

      name:
        "Vigor"
    },

    {
      id:
        "agilidade",

      name:
        "Agilidade"
    },

    {
      id:
        "precisao",

      name:
        "Precisão"
    },

    {
      id:
        "intelecto",

      name:
        "Intelecto"
    },

    {
      id:
        "controle",

      name:
        "Controle"
    },

    {
      id:
        "presenca",

      name:
        "Presença"
    },

    {
      id:
        "percepcao",

      name:
        "Percepção"
    }
  ]);


  /* =========================================================
     DADOS
     ========================================================= */

  const DICE = Object.freeze([
    {
      id:
        "d4-1",

      type:
        "d4",

      sides:
        4
    },

    {
      id:
        "d6-1",

      type:
        "d6",

      sides:
        6
    },

    {
      id:
        "d6-2",

      type:
        "d6",

      sides:
        6
    },

    {
      id:
        "d8-1",

      type:
        "d8",

      sides:
        8
    },

    {
      id:
        "d10-1",

      type:
        "d10",

      sides:
        10
    },

    {
      id:
        "d12-1",

      type:
        "d12",

      sides:
        12
    },

    {
      id:
        "d20-1",

      type:
        "d20",

      sides:
        20
    },

    {
      id:
        "d20-2",

      type:
        "d20",

      sides:
        20
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

  function clone(value) {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
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


  function text(value) {
    return String(
      value ??
      ""
    ).trim();
  }


  function normalize(value) {
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
     APARÊNCIA PADRÃO
     ========================================================= */

  function createAppearance() {
    return {
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


      /* -----------------------------
         Raça
         ----------------------------- */

      race:
        "",

      raceIndex:
        0,

      animalha:
        "",

      animalhaCategory:
        "",


      /* -----------------------------
         Aparência
         ----------------------------- */

      appearance:
        createAppearance(),


      /* -----------------------------
         Imagem
         ----------------------------- */

      avatar:
        "",

      avatarName:
        "",


      /* -----------------------------
         Classe
         ----------------------------- */

      class:
        "",


      /* -----------------------------
         Atributos
         ----------------------------- */

      attributes:
        Object.fromEntries(
          ATTRIBUTES.map(
            attribute => [
              attribute.id,
              null
            ]
          )
        ),


      /* -----------------------------
         Dados atribuídos
         ----------------------------- */

      assignedDice:
        Object.fromEntries(
          ATTRIBUTES.map(
            attribute => [
              attribute.id,
              null
            ]
          )
        ),


      /* -----------------------------
         Resultados dos dados
         ----------------------------- */

      diceResults:
        {},


      /* -----------------------------
         Última rolagem
         ----------------------------- */

      lastRoll:
        null,


      /* -----------------------------
         Poder
         ----------------------------- */

      primaryPower:
        "",

      parallelPower:
        "",


      /* -----------------------------
         Mana
         ----------------------------- */

      mana:
        {
          current:
            0,

          max:
            0
        },


      /* -----------------------------
         Perícias
         ----------------------------- */

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


      /* -----------------------------
         Técnicas
         ----------------------------- */

      techniques:
        [],


      /* -----------------------------
         Inventário
         ----------------------------- */

      inventory:
        [],


      /* -----------------------------
         Revisão
         ----------------------------- */

      saved:
        false
    };
  }


  /* =========================================================
     ESTADO ATUAL
     ========================================================= */

  let state =
    createDefaultState();

  let saveTimer =
    null;


  /* =========================================================
     NORMALIZAÇÃO DE ESTADO
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
     STORAGE
     ========================================================= */

  function saveLocal() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(
          state
        )
      );

      state.saved =
        true;

      updateSaveStatus(
        true
      );

    } catch (error) {
      console.error(
        "[AERION][FICHA] Falha ao salvar:",
        error
      );

      updateSaveStatus(
        false
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

      state =
        normalizeState(
          JSON.parse(
            raw
          )
        );

      return true;

    } catch (error) {
      console.warn(
        "[AERION][FICHA] Não foi possível carregar o rascunho:",
        error
      );

      return false;
    }
  }


  /* =========================================================
     STATUS DE SALVAMENTO
     ========================================================= */

  function updateSaveStatus(
    saved
  ) {
    const status =
      document.querySelector(
        "#saveStatusText"
      );

    if (
      status
    ) {
      status.textContent =
        saved
          ? "Salvo"
          : "Salvamento automático";
    }

    const dot =
      document.querySelector(
        ".save-dot"
      );

    if (
      dot
    ) {
      dot.dataset.saved =
        saved
          ? "true"
          : "false";
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

    if (
      typeof updater ===
      "function"
    ) {
      state =
        normalizeState(
          updater(
            clone(state)
          )
        );
    } else if (
      updater &&
      typeof updater ===
        "object"
    ) {
      state =
        normalizeState({
          ...state,
          ...updater
        });
    }

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
     RACAS
     ========================================================= */

  function getRaceData() {
    const assets =
      window.AERIONPersonagemAssets;

    if (
      !assets
    ) {
      return null;
    }

    const raceId =
      normalize(
        state.race
      );

    const rules =
      typeof assets.getRaceRules ===
      "function"
        ? assets.getRaceRules(
            raceId
          )
        : assets.RACE_RULES?.[
            raceId
          ];


    return {
      id:
        raceId,

      rules:
        rules ||
        null
    };
  }


  function selectRace(
    raceId,
    index = null
  ) {
    const normalized =
      normalize(
        raceId
      );

    setState(
      current => {

        current.race =
          normalized;

        if (
          index !==
          null
        ) {
          current.raceIndex =
            number(
              index,
              0
            );
        }


        current.animalha =
          "";

        current.animalhaCategory =
          "";


        applyRaceAppearanceDefaults(
          current
        );


        markStepComplete(
          current,
          1
        );


        return current;
      }
    );

    emit(
      "aerion:race:selected",
      {
        race:
          normalized
      }
    );
  }


  function applyRaceAppearanceDefaults(
    current
  ) {
    const assets =
      window.AERIONPersonagemAssets;

    if (
      !assets
    ) {
      return;
    }

    let defaults = null;

    if (
      typeof assets.getDefaultAppearanceForRace ===
      "function"
    ) {
      defaults =
        assets.getDefaultAppearanceForRace(
          current.race
        );
    }

    if (
      defaults
    ) {
      current.appearance =
        {
          ...current.appearance,
          ...defaults
        };
    }

    const rules =
      typeof assets.getRaceRules ===
      "function"
        ? assets.getRaceRules(
            current.race
          )
        : null;


    if (
      !rules
    ) {
      return;
    }


    current.appearance.ears =
      validRaceValue(
        current.appearance.ears,
        rules.ears,
        ""
      );


    current.appearance.horns =
      validRaceValue(
        current.appearance.horns,
        rules.horns,
        "none"
      );


    current.appearance.wings =
      validRaceValue(
        current.appearance.wings,
        rules.wings,
        "none"
      );


    current.appearance.tail =
      validRaceValue(
        current.appearance.tail,
        rules.tail,
        "none"
      );


    current.appearance.bodyType =
      validRaceValue(
        current.appearance.bodyType,
        rules.bodyTypes,
        rules.defaultBodyType ||
          "average"
      );
  }


  function validRaceValue(
    value,
    allowed,
    fallback
  ) {
    if (
      !Array.isArray(
        allowed
      ) ||
      !allowed.length
    ) {
      return (
        value ||
        fallback
      );
    }

    return allowed.includes(
      value
    )
      ? value
      : allowed[0];
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function selectAnimalhaCategory(
    category
  ) {
    setState(
      current => {
        current.animalhaCategory =
          normalize(
            category
          );

        current.animalha =
          "";

        return current;
      }
    );

    emit(
      "aerion:animalha:category",
      {
        category:
          normalize(
            category
          )
      }
    );
  }


  function selectAnimalha(
    animalId
  ) {
    const assets =
      window.AERIONPersonagemAssets;

    const id =
      normalize(
        animalId
      );

    let animal =
      null;

    if (
      assets?.ANIMALHA_ANIMALS
    ) {
      animal =
        assets.ANIMALHA_ANIMALS[
          id
        ];
    }

    setState(
      current => {
        current.animalha =
          id;

        if (
          animal
        ) {
          if (
            animal.body
          ) {
            current.appearance.bodyType =
              animal.body;
          }

          if (
            animal.ears?.length
          ) {
            current.appearance.ears =
              animal.ears[0];
          }

          if (
            animal.wings?.length
          ) {
            current.appearance.wings =
              animal.wings[0];
          }

          if (
            animal.tail?.length
          ) {
            current.appearance.tail =
              animal.tail[0];
          }

          if (
            animal.fur?.length
          ) {
            current.appearance.furColor =
              animal.fur[0];
          }

          if (
            animal.feathers?.length
          ) {
            current.appearance.feathersColor =
              animal.feathers[0];
          }

          if (
            animal.scales?.length
          ) {
            current.appearance.scalesColor =
              animal.scales[0];
          }

          if (
            animal.skin?.length
          ) {
            current.appearance.skinVariant =
              animal.skin[0];
          }
        }

        return current;
      }
    );

    emit(
      "aerion:animalha:selected",
      {
        animal:
          id
      }
    );
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
      return;
    }

    setState(
      current => {

        current.appearance[
          key
        ] =
          value;

        return current;
      }
    );

    emit(
      "aerion:appearance:updated",
      {
        field:
          key,

        value
      }
    );
  }


  function setAppearanceValues(
    values
  ) {
    if (
      !values ||
      typeof values !==
        "object"
    ) {
      return;
    }

    setState(
      current => {

        current.appearance =
          {
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
          clone(values)
      }
    );
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

    setState(
      current => {

        current.class =
          id;

        const data =
          CLASSES[id];

        if (
          data?.skillBonuses
        ) {
          Object.entries(
            data.skillBonuses
          ).forEach(
            ([skill, bonus]) => {
              current.skills[
                skill
              ] =
                Math.max(
                  number(
                    current.skills[
                      skill
                    ],
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

        markStepComplete(
          current,
          3
        );

        return current;
      }
    );

    emit(
      "aerion:class:selected",
      {
        classId:
          id
      }
    );
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function normalizeAttribute(
    id
  ) {
    const value =
      normalize(
        id
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
      aliases[value] ||
      value
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
      !state.attributes.hasOwnProperty(
        id
      )
    ) {
      return false;
    }

    setState(
      current => {

        current.attributes[id] =
          value === null ||
          value === ""
            ? null
            : number(
                value,
                0
              );

        return current;
      }
    );

    emit(
      "aerion:attribute:updated",
      {
        attribute:
          id,

        value:
          state.attributes[id]
      }
    );

    return true;
  }


  /* =========================================================
     DADOS — ATRIBUIÇÃO
     ========================================================= */

  function isDiceAlreadyAssigned(
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


  function isDiceTypeAlreadyAssigned(
    diceId,
    exceptAttribute = null
  ) {
    const die =
      DICE_BY_ID[
        diceId
      ];

    if (
      !die
    ) {
      return false;
    }

    return ATTRIBUTES.some(
      attribute => {

        if (
          attribute.id ===
          exceptAttribute
        ) {
          return false;
        }

        const assigned =
          state.assignedDice[
            attribute.id
          ];

        if (
          !assigned
        ) {
          return false;
        }

        const assignedDie =
          DICE_BY_ID[
            assigned
          ];

        return (
          assignedDie &&
          assignedDie.type ===
            die.type
        );
      }
    );
  }


  function assignDieToAttribute(
    dieId,
    attributeId
  ) {
    const id =
      normalizeAttribute(
        attributeId
      );

    const die =
      DICE_BY_ID[
        dieId
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
      !state.attributes.hasOwnProperty(
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
     * IMPORTANTE:
     *
     * Um D20 é uma peça individual.
     * D20-1 e D20-2 são dados diferentes.
     *
     * NÃO bloquear somente pelo type.
     *
     * Isso evita o bug em que selecionar
     * um D20 deselecionava o outro.
     */


    if (
      isDiceAlreadyAssigned(
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


    setState(
      current => {

        /*
         * Se o atributo já possuía um dado,
         * esse dado volta para a bandeja.
         */

        current.assignedDice[id] =
          die.id;

        /*
         * O valor anterior continua existindo
         * somente se já houver resultado.
         */

        if (
          !current.diceResults[
            die.id
          ]
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
          id
      }
    );

    return {
      ok:
        true
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

    const currentDie =
      state.assignedDice[
        id
      ];

    if (
      !currentDie
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

        diceId:
          currentDie
      }
    );


    return true;
  }


  /* =========================================================
     ROLAR DADO
     ========================================================= */

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
      return null;
    }


    const result =
      Math.floor(
        Math.random() *
          die.sides
      ) +
      1;


    setState(
      current => {

        current.diceResults[
          die.id
        ] =
          result;

        if (
          attributeId
        ) {
          const id =
            normalizeAttribute(
              attributeId
            );

          if (
            current.attributes.hasOwnProperty(
              id
            )
          ) {
            current.attributes[
              id
            ] =
              result;
          }
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
            attributeId
              ? normalizeAttribute(
                  attributeId
                )
              : null,

          timestamp:
            Date.now()
        };

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

        result,

        attributeId:
          attributeId
            ? normalizeAttribute(
                attributeId
              )
            : null
      }
    );


    return result;
  }


  /* =========================================================
     ROLAR DADO DO ATRIBUTO
     ========================================================= */

  function rollAttribute(
    attributeId
  ) {
    const id =
      normalizeAttribute(
        attributeId
      );

    const dieId =
      state.assignedDice[
        id
      ];

    if (
      !dieId
    ) {
      return {
        ok:
          false,

        error:
          "Nenhum dado atribuído a este atributo."
      };
    }

    const result =
      rollDie(
        dieId,
        id
      );

    return {
      ok:
        true,

      result,

      diceId:
        dieId,

      attribute:
        id
    };
  }


  /* =========================================================
     LIMPAR TODOS OS DADOS
     ========================================================= */

  function clearDiceAssignments() {
    setState(
      current => {

        ATTRIBUTES.forEach(
          attribute => {

            current.assignedDice[
              attribute.id
            ] =
              null;

          }
        );

        return current;
      }
    );


    emit(
      "aerion:dice:cleared"
    );
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function markStepComplete(
    current,
    index
  ) {
    if (
      index <
      0 ||
      index >=
        CONFIG.totalSteps
    ) {
      return;
    }

    current.completedSteps =
      Array.isArray(
        current.completedSteps
      )
        ? current.completedSteps
        : [];

    current.completedSteps[
      index
    ] =
      true;
  }


  function canGoToStep(
    index
  ) {
    if (
      index < 0 ||
      index >=
        CONFIG.totalSteps
    ) {
      return false;
    }

    if (
      index <=
      state.currentStep
    ) {
      return true;
    }

    return Boolean(
      state.completedSteps[
        index - 1
      ]
    );
  }


  function goToStep(
    index
  ) {
    const target =
      number(
        index,
        0
      );

    if (
      !canGoToStep(
        target
      )
    ) {
      return false;
    }

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
        step:
          target,

        stepData:
          STEPS[target]
      }
    );


    return true;
  }


  function nextStep() {
    const current =
      state.currentStep;

    markStepComplete(
      state,
      current
    );

    const next =
      Math.min(
        current + 1,
        CONFIG.totalSteps - 1
      );

    return goToStep(
      next
    );
  }


  function previousStep() {
    const previous =
      Math.max(
        state.currentStep - 1,
        0
      );

    return goToStep(
      previous
    );
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
            primary;
        }

        if (
          parallel !==
          undefined
        ) {
          current.parallelPower =
            parallel;
        }

        return current;
      }
    );
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
                currentMana
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
                maxMana
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

        return current;
      }
    );
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
            : clone(item)
        );

        return current;
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


    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif"
    ];


    if (
      !allowedTypes.includes(
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
            reject;

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
        dataUrl,
        fileName:
          file.name
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
      "aerion:avatar:removed"
    );
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function setIdentity(
    values
  ) {
    if (
      !values
    ) {
      return false;
    }

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
            values.gender;
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

        markStepComplete(
          current,
          0
        );

        return current;
      }
    );


    emit(
      "aerion:identity:updated",
      {
        values:
          clone(values)
      }
    );


    return true;
  }


  /* =========================================================
     EVENTOS DE INTERFACE
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
      element.dataset.action;


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
      case "next-step":
        nextStep();
        break;


      case "previous":
      case "previous-step":
      case "back":
      case "go-back":
        previousStep();
        break;


      case "go-step":
        goToStep(
          element.dataset.step
        );
        break;


      /* -----------------------------------------
         RAÇA
         ----------------------------------------- */

      case "select-race":
      case "select-race-current":
        selectRace(
          element.dataset.race ||
          element.dataset.raceId ||
          ""
        );
        break;


      case "race-next":
        emit(
          "aerion:race:next"
        );
        break;


      case "race-previous":
        emit(
          "aerion:race:previous"
        );
        break;


      /* -----------------------------------------
         ANIMALHA
         ----------------------------------------- */

      case "select-animalha-category":
        selectAnimalhaCategory(
          element.dataset.animalhaCategory ||
          element.dataset.category ||
          ""
        );
        break;


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

      case "assign-die":
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


      case "remove-die":
      case "remove-dice":
        removeDieFromAttribute(
          element.dataset.attribute ||
          element.dataset.attributeId ||
          ""
        );
        break;


      case "roll-die":
      case "roll-dice":
        if (
          element.dataset.attribute ||
          element.dataset.attributeId
        ) {
          rollAttribute(
            element.dataset.attribute ||
            element.dataset.attributeId
          );
        } else {
          rollDie(
            element.dataset.diceId ||
            element.dataset.dieId ||
            ""
          );
        }
        break;


      case "clear-dice":
        clearDiceAssignments();
        break;


      /* -----------------------------------------
         AVATAR
         ----------------------------------------- */

      case "remove-avatar":
        removeAvatar();
        break;

    }
  }


  /* =========================================================
     EVENT DELEGATION
     ========================================================= */

  function bindEvents() {

    document.addEventListener(
      "click",
      event => {

        const target =
          event.target.closest(
            "[data-action]"
          );

        if (
          !target
        ) {
          return;
        }

        handleAction(
          target
        );
      }
    );


    document.addEventListener(
      "input",
      event => {

        const element =
          event.target;


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


        const appearanceField =
          element.dataset.appearanceField;


        if (
          appearanceField
        ) {

          setAppearance(
            appearanceField,
            element.type ===
              "number" ||
            element.type ===
              "range"
              ? number(
                  element.value
                )
              : element.value
          );
        }

      }
    );


    document.addEventListener(
      "change",
      event => {

        const element =
          event.target;


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

            alert(
              error.message
            );
          }

        }
      );
    }
  }


  /* =========================================================
     SINCRONIZAÇÃO DOS CAMPOS
     ========================================================= */

  function syncForm() {

    const name =
      document.querySelector(
        "#characterName"
      );

    if (
      name
    ) {
      name.value =
        state.name;
    }


    const age =
      document.querySelector(
        "#characterAge"
      );

    if (
      age
    ) {
      age.value =
        state.age;
    }


    const description =
      document.querySelector(
        "#characterDescription"
      );

    if (
      description
    ) {
      description.value =
        state.description;
    }


    const origin =
      document.querySelector(
        "#characterOrigin"
      );

    if (
      origin
    ) {
      origin.value =
        state.origin;
    }


    document
      .querySelectorAll(
        'input[name="gender"]'
      )
      .forEach(
        input => {

          input.checked =
            input.value ===
            state.gender;

        }
      );


    document
      .querySelectorAll(
        "[data-appearance-field]"
      )
      .forEach(
        input => {

          const field =
            input.dataset.appearanceField;

          if (
            Object.prototype.hasOwnProperty.call(
              state.appearance,
              field
            )
          ) {

            input.value =
              state.appearance[
                field
              ];
          }

        }
      );


    syncAttributes();
    syncAvatar();
  }


  /* =========================================================
     ATRIBUTOS NA INTERFACE
     ========================================================= */

  function syncAttributes() {

    document
      .querySelectorAll(
        "[data-attribute]"
      )
      .forEach(
        element => {

          const id =
            normalizeAttribute(
              element.dataset.attribute
            );

          if (
            !state.attributes.hasOwnProperty(
              id
            )
          ) {
            return;
          }

          const value =
            state.attributes[id];


          if (
            element.matches(
              "input, select, textarea"
            )
          ) {

            element.value =
              value ??
              "";

          } else {

            element.textContent =
              value ??
              0;

          }

        }
      );


    document
      .querySelectorAll(
        "[data-dice-assigned]"
      )
      .forEach(
        element => {

          const id =
            normalizeAttribute(
              element.dataset.diceAssigned
            );

          const assigned =
            state.assignedDice[id];


          element.dataset.dice =
            assigned ||
            "";

          element.classList.toggle(
            "has-dice",
            Boolean(
              assigned
            )
          );

        }
      );


    document
      .querySelectorAll(
        "[data-roll-result]"
      )
      .forEach(
        element => {

          const diceId =
            element.dataset.rollResult;

          element.textContent =
            state.diceResults[
              diceId
            ] ??
            "—";

        }
      );


    updateAttributeGraph();
  }


  /* =========================================================
     GRÁFICO / RADAR
     ========================================================= */

  function updateAttributeGraph() {

    emit(
      "aerion:attributes:graph",
      {
        attributes:
          clone(
            state.attributes
          ),

        labels:
          ATTRIBUTES.map(
            attribute =>
              attribute.name
          )
      }
    );


    /*
     * Compatibilidade com gráficos que procuram
     * um elemento diretamente.
     */

    const graph =
      document.querySelector(
        "[data-attribute-graph]"
      );

    if (
      graph
    ) {

      ATTRIBUTES.forEach(
        attribute => {

          const value =
            number(
              state.attributes[
                attribute.id
              ],
              0
            );

          graph.style.setProperty(
            `--${attribute.id}`,
            String(
              value
            )
          );

        }
      );

    }
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function syncAvatar() {

    const img =
      document.querySelector(
        "#avatarImage"
      );

    const placeholder =
      document.querySelector(
        "#avatarPlaceholder"
      );

    const removeButton =
      document.querySelector(
        "#removeAvatarButton"
      );


    if (
      img
    ) {

      if (
        state.avatar
      ) {

        img.src =
          state.avatar;

        img.hidden =
          false;

      } else {

        img.removeAttribute(
          "src"
        );

        img.hidden =
          true;
      }
    }


    if (
      placeholder
    ) {

      placeholder.hidden =
        Boolean(
          state.avatar
        );
    }


    if (
      removeButton
    ) {

      removeButton.disabled =
        !state.avatar;
    }
  }


  /* =========================================================
     RENDER INTEGRADO
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
     API
     ========================================================= */

  const API = {

    getState,

    setState,

    save:
      saveLocal,

    load:
      loadLocal,

    setIdentity,

    selectRace,

    selectAnimalhaCategory,

    selectAnimalha,

    setAppearance,

    setAppearanceValues,

    selectClass,

    setAttributeValue,

    assignDieToAttribute,

    removeDieFromAttribute,

    rollDie,

    rollAttribute,

    clearDiceAssignments,

    setPower,

    setMana,

    setSkill,

    addInventoryItem,

    removeInventoryItem,

    setAvatarFile,

    removeAvatar,

    goToStep,

    nextStep,

    previousStep,

    canGoToStep,

    updateAttributeGraph,

    requestRender,

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

    getDice() {
      return clone(
        DICE
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
  };


  /* =========================================================
     EXPORTAÇÃO GLOBAL
     ========================================================= */

  window.AERIONFicha =
    Object.freeze(
      API
    );


  window.AERION_FICHA =
    window.AERIONFicha;


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function boot() {

    loadLocal();

    bindEvents();

    syncForm();

    requestRender();

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


    console.info(
      "[AERION][FICHA] Inicializada.",
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
