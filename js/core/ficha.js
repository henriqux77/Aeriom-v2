/* =========================================================
   AERION — FICHA
   js/core/ficha.js

   Núcleo da ficha.

   Responsável por:
   - estado da ficha
   - identidade
   - raça
   - Animalha
   - aparência
   - classe
   - atributos
   - dados
   - poder
   - mana
   - perícias
   - técnicas
   - inventário
   - combate
   - navegação
   - autosave

   O módulo visual do personagem NÃO controla regras.
   Ele apenas lê state.appearance.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIG
     ========================================================= */

  const CONFIG = Object.freeze({
    storageKey:
      "aerion:ficha:draft:v13",

    lastCharacterKey:
      "aerion:ficha:last:v13",

    autosaveDelay:
      350,

    maxImageSize:
      6 * 1024 * 1024
  });


  /* =========================================================
     ETAPAS
     ========================================================= */

  const STEPS = Object.freeze([
    {
      id: "identity",
      name: "Identidade"
    },

    {
      id: "race",
      name: "Raça"
    },

    {
      id: "appearance",
      name: "Aparência"
    },

    {
      id: "class",
      name: "Classe"
    },

    {
      id: "attributes",
      name: "Atributos"
    },

    {
      id: "power",
      name: "Poder"
    },

    {
      id: "mana",
      name: "Mana"
    },

    {
      id: "skills",
      name: "Perícias"
    },

    {
      id: "techniques",
      name: "Técnicas"
    },

    {
      id: "inventory",
      name: "Inventário"
    },

    {
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
      DICE.map(
        die => [
          die.id,
          die
        ]
      )
    )
  );


  /* =========================================================
     PODERES
     ========================================================= */

  const PRIMARY_POWERS = Object.freeze([
    "Fogo",
    "Ar",
    "Terra",
    "Água"
  ]);


  const PARALLEL_POWERS = Object.freeze([
    "Gelo",
    "Magnetismo",
    "Vegetação",
    "Tecnologia",
    "Gravidade",
    "Som"
  ]);


  /* =========================================================
     CLASSES
     ========================================================= */

  const CLASSES = Object.freeze({
    guerreiro: {
      id: "guerreiro",
      name: "Guerreiro",
      role: "Combatente",

      skillBonuses: {
        atletismo: 1,
        tatica: 1
      }
    },

    feiticeiro: {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",

      skillBonuses: {
        conhecimento: 1,
        controle_mana: 1
      }
    },

    curandeiro: {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",

      skillBonuses: {
        medicina: 1,
        intuicao: 1
      }
    },

    monge: {
      id: "monge",
      name: "Monge",
      role: "Marcial",

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
    acrobacia: {
      id: "acrobacia",
      name: "Acrobacia",
      description:
        "Equilíbrio e movimentos rápidos."
    },

    atletismo: {
      id: "atletismo",
      name: "Atletismo",
      description:
        "Esforço físico, corrida e escalada."
    },

    furtividade: {
      id: "furtividade",
      name: "Furtividade",
      description:
        "Mover-se sem chamar atenção."
    },

    percepcao: {
      id: "percepcao",
      name: "Percepção",
      description:
        "Perceber detalhes, ameaças e mudanças."
    },

    investigacao: {
      id: "investigacao",
      name: "Investigação",
      description:
        "Analisar pistas e informações."
    },

    conhecimento: {
      id: "conhecimento",
      name: "Conhecimento",
      description:
        "Conhecimentos gerais e especializados."
    },

    medicina: {
      id: "medicina",
      name: "Medicina",
      description:
        "Tratamento e primeiros socorros."
    },

    sobrevivencia: {
      id: "sobrevivencia",
      name: "Sobrevivência",
      description:
        "Exploração, rastreamento e adaptação."
    },

    persuasao: {
      id: "persuasao",
      name: "Persuasão",
      description:
        "Convencer e negociar."
    },

    intuicao: {
      id: "intuicao",
      name: "Intuição",
      description:
        "Perceber intenções e situações suspeitas."
    },

    enganacao: {
      id: "enganacao",
      name: "Enganação",
      description:
        "Blefes e disfarces."
    },

    tatica: {
      id: "tatica",
      name: "Tática",
      description:
        "Planejamento e leitura de combate."
    },

    oficio: {
      id: "oficio",
      name: "Ofício / Crafting",
      description:
        "Construção e reparo."
    },

    controle_mana: {
      id: "controle_mana",
      name: "Controle de Mana",
      description:
        "Precisão na manipulação de Mana."
    }
  });


  /* =========================================================
     APARÊNCIA
     
     ESTA É A PRINCIPAL ALTERAÇÃO.
     
     Todos estes campos agora pertencem ao estado da ficha.
     O personagem-render.js pode ler e modificar os mesmos
     dados sem precisar manter um estado paralelo.

     ========================================================= */

  function createDefaultAppearance() {
    return {

      /* ---------------------------------------------
         Corpo
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Pele
         --------------------------------------------- */

      skin:
        "",

      skinVariant:
        "",


      /* ---------------------------------------------
         Cabelo
         --------------------------------------------- */

      hair:
        "",

      hairStyle:
        "",

      hairColor:
        "",


      /* ---------------------------------------------
         Rosto
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Pelos
         --------------------------------------------- */

      facialHair:
        "",

      facialHairColor:
        "",


      /* ---------------------------------------------
         Anatomia racial
         --------------------------------------------- */

      ears:
        "",

      horns:
        "",

      wings:
        "",

      tail:
        "",


      /* ---------------------------------------------
         Animalha
         --------------------------------------------- */

      furColor:
        "",

      furPattern:
        "",

      feathersColor:
        "",

      scalesColor:
        "",


      /* ---------------------------------------------
         Marcas
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Marca de nascença
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Cicatrizes
         --------------------------------------------- */

      scars:
        "",

      scarCount:
        1,

      scarSize:
        1,

      scarLocation:
        "",


      /* ---------------------------------------------
         Tatuagens
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Piercings
         --------------------------------------------- */

      piercings:
        "",

      piercingLocation:
        "",

      piercingMaterial:
        "",


      /* ---------------------------------------------
         Roupas
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Armadura
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Cabeça
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Joias
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Equipamentos visuais
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Armas
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Objetos
         --------------------------------------------- */

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


      /* ---------------------------------------------
         Anotações visuais
         --------------------------------------------- */

      physicalNotes:
        ""
    };
  }


  /* =========================================================
     ESTADO PADRÃO
     ========================================================= */

  function createDefaultState() {
    return {

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


      /* ---------------------------------------------
         Raça
         --------------------------------------------- */

      race:
        "",

      raceIndex:
        0,

      animalha:
        "",


      /* ---------------------------------------------
         Aparência
         --------------------------------------------- */

      appearance:
        createDefaultAppearance(),


      /* ---------------------------------------------
         Avatar
         --------------------------------------------- */

      avatar:
        "",

      avatarName:
        "",


      /* ---------------------------------------------
         Classe
         --------------------------------------------- */

      class:
        "",


      /* ---------------------------------------------
         Atributos
         --------------------------------------------- */

      attributes: {

        forca:
          null,

        vigor:
          null,

        agilidade:
          null,

        precisao:
          null,

        intelecto:
          null,

        controle:
          null,

        presenca:
          null,

        percepcao:
          null
      },


      rolls:
        {},


      /* ---------------------------------------------
         Poder
         --------------------------------------------- */

      power:
        "",

      powerRoll:
        null,

      powerType:
        "",


      /* ---------------------------------------------
         Mana
         --------------------------------------------- */

      mana:
        "azul",


      /* ---------------------------------------------
         Perícias
         --------------------------------------------- */

      skills:
        {},


      /* ---------------------------------------------
         Técnicas
         --------------------------------------------- */

      techniques:
        [],


      /* ---------------------------------------------
         Inventário
         --------------------------------------------- */

      inventory:
        [],


      /* ---------------------------------------------
         Navegação
         --------------------------------------------- */

      step:
        0,


      /* ---------------------------------------------
         Metadados
         --------------------------------------------- */

      updatedAt:
        null
    };
  }


  let state =
    createDefaultState();


  let selectedDie =
    null;


  let autosaveTimer =
    null;


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


  function toast(
    message
  ) {
    if (
      window.AERIONFichaRender &&
      typeof
        window.AERIONFichaRender.toast ===
          "function"
    ) {
      window.AERIONFichaRender.toast(
        message
      );

      return;
    }

    console.info(
      "[AERION]",
      message
    );
  }


  function render() {
    if (
      window.AERIONFichaRender &&
      typeof
        window.AERIONFichaRender.render ===
          "function"
    ) {
      window.AERIONFichaRender.render(
        getPublicState()
      );
    }

    if (
      window.AERIONPersonagemRender &&
      typeof
        window.AERIONPersonagemRender.refresh ===
          "function"
    ) {
      window.AERIONPersonagemRender.refresh();
    }
  }


  /* =========================================================
     AUTOSAVE
     ========================================================= */

  function save() {

    clearTimeout(
      autosaveTimer
    );


    autosaveTimer =
      setTimeout(
        () => {

          state.updatedAt =
            new Date().toISOString();


          try {

            localStorage.setItem(
              CONFIG.storageKey,

              JSON.stringify(
                state
              )
            );


            document.dispatchEvent(
              new CustomEvent(
                "aerion:ficha:saved"
              )
            );

          } catch (
            error
          ) {

            console.error(
              "[AERION] Erro ao salvar ficha:",
              error
            );
          }

        },

        CONFIG.autosaveDelay
      );
  }


  function forceSave() {

    clearTimeout(
      autosaveTimer
    );


    state.updatedAt =
      new Date().toISOString();


    try {

      localStorage.setItem(
        CONFIG.storageKey,

        JSON.stringify(
          state
        )
      );


      return true;

    } catch (
      error
    ) {

      console.error(
        "[AERION] Erro ao salvar ficha:",
        error
      );


      return false;
    }
  }


  /* =========================================================
     LOAD
     ========================================================= */

  function load() {

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


      const saved =
        JSON.parse(
          raw
        );


      if (
        !saved ||
        typeof saved !==
          "object"
      ) {
        return false;
      }


      const defaults =
        createDefaultState();


      state = {

        ...defaults,

        ...saved,


        appearance: {

          ...defaults.appearance,

          ...(saved.appearance ||
            {})
        },


        attributes: {

          ...defaults.attributes,

          ...(saved.attributes ||
            {})
        },


        rolls: {

          ...(saved.rolls ||
            {})
        },


        skills: {

          ...(saved.skills ||
            {})
        },


        techniques:

          Array.isArray(
            saved.techniques
          )

            ? saved.techniques

            : [],


        inventory:

          Array.isArray(
            saved.inventory
          )

            ? saved.inventory

            : []
      };


      sanitizeState();


      return true;

    } catch (
      error
    ) {

      console.warn(
        "[AERION] Não foi possível restaurar o rascunho:",
        error
      );


      state =
        createDefaultState();


      return false;
    }
  }


  /* =========================================================
     SANITIZAÇÃO
     ========================================================= */

  function sanitizeState() {

    ensureAppearance();

    ensureAttributes();

    ensureSkills();

    ensureTechniques();

    ensureInventory();

    validateRace();

    validatePower();

    validateMana();

    clampStep();

    resetAppearanceHeight();
  }


  function ensureAppearance() {

    const defaults =
      createDefaultAppearance();


    if (
      !state.appearance ||
      typeof state.appearance !==
        "object" ||
      Array.isArray(
        state.appearance
      )
    ) {

      state.appearance =
        defaults;

      return;
    }


    state.appearance = {

      ...defaults,

      ...state.appearance
    };
  }


  /* =========================================================
     ESTADO PÚBLICO
     ========================================================= */

  function getPublicState() {

    return clone({

      ...state,

      selectedDie,

      dice:
        getDiceState(),

      raceData:
        getEffectiveRace(),

      effectiveAttributes:
        getEffectiveAttributes(),

      effectiveSkills:
        getEffectiveSkills(),

      combat:
        getCombatData(),

      progress:
        getProgress(),

      steps:
        STEPS
    });
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function getRaceCatalog() {
    return (
      window.AERIONFichaRender
        ?.RACES ||

      window.AERIONFicha
        ?.constants
        ?.RACES ||

      []
    );
  }


  function getRace() {

    const catalog =
      getRaceCatalog();


    return (
      catalog.find(
        race =>
          race.id ===
          state.race
      ) ||
      null
    );
  }


  function getPreviewRace() {

    const catalog =
      getRaceCatalog();


    return (
      catalog[
        Number(
          state.raceIndex
        ) || 0
      ] ||
      null
    );
  }


  function getAnimalha() {

    if (
      state.race !==
      "animalha"
    ) {
      return null;
    }


    const catalog =
      window.AERIONFichaRender
        ?.ANIMALHA_VARIANTS;


    if (
      !Array.isArray(
        catalog
      )
    ) {
      return null;
    }


    return (
      catalog.find(
        item =>
          item.id ===
          state.animalha
      ) ||
      null
    );
  }


  function getEffectiveRace() {

    const race =
      getRace();


    if (
      !race
    ) {
      return null;
    }


    const animal =
      getAnimalha();


    if (
      race.id !==
        "animalha" ||
      !animal
    ) {
      return race;
    }


    return {

      ...race,

      id:
        `animalha:${animal.id}`,

      name:
        `${race.name} — ${animal.name}`,

      profile:
        animal.profile ||
        race.profile,

      feature:
        animal.feature ||
        race.feature,

      modifiers: {

        ...(race.modifiers ||
          {}),

        ...(animal.modifiers ||
          {})
      },

      size:
        animal.size ||
        race.size,

      height:
        animal.height ||
        race.height,

      flight:
        Boolean(
          race.flight ||
          animal.flight
        ),

      movement: {

        ...(race.movement ||
          {}),

        ...(animal.movement ||
          {})
      }
    };
  }


  function validateRace() {

    const catalog =
      getRaceCatalog();


    if (
      !Array.isArray(
        catalog
      ) ||
      !catalog.length
    ) {
      return;
    }


    const index =
      catalog.findIndex(
        race =>
          race.id ===
          state.race
      );


    if (
      index >=
      0
    ) {

      state.raceIndex =
        index;

      return;
    }


    if (
      state.race
    ) {

      state.race =
        "";

      state.animalha =
        "";
    }
  }


  function selectRace(
    raceId
  ) {

    const catalog =
      getRaceCatalog();


    const index =
      catalog.findIndex(
        race =>
          race.id ===
          raceId
      );


    if (
      index <
      0
    ) {
      return false;
    }


    state.race =
      raceId;


    state.raceIndex =
      index;


    state.animalha =
      "";


    ensureAppearance();


    resetAppearanceHeight();


    save();
    render();


    toast(
      `${catalog[index].name} selecionada.`
    );


    return true;
  }


  function setRaceIndex(
    index
  ) {

    const catalog =
      getRaceCatalog();


    index =
      Number(
        index
      );


    if (
      !Number.isInteger(
        index
      )
    ) {
      return false;
    }


    if (
      index <
        0 ||
      index >=
        catalog.length
    ) {
      return false;
    }


    state.raceIndex =
      index;


    render();


    return true;
  }


  function previousRace() {

    const catalog =
      getRaceCatalog();


    if (
      !catalog.length
    ) {
      return false;
    }


    state.raceIndex =
      (
        state.raceIndex -
        1 +
        catalog.length
      ) %
      catalog.length;


    render();


    return true;
  }


  function nextRace() {

    const catalog =
      getRaceCatalog();


    if (
      !catalog.length
    ) {
      return false;
    }


    state.raceIndex =
      (
        state.raceIndex +
        1
      ) %
      catalog.length;


    render();


    return true;
  }


  function selectCurrentRace() {

    const race =
      getPreviewRace();


    if (
      !race
    ) {
      return false;
    }


    return selectRace(
      race.id
    );
  }


  function selectAnimalha(
    animalId
  ) {

    if (
      state.race !==
      "animalha"
    ) {
      return false;
    }


    const catalog =
      window.AERIONFichaRender
        ?.ANIMALHA_VARIANTS;


    if (
      !Array.isArray(
        catalog
      )
    ) {
      return false;
    }


    const exists =
      catalog.some(
        item =>
          item.id ===
          animalId
      );


    if (
      !exists
    ) {
      return false;
    }


    state.animalha =
      animalId;


    resetAppearanceHeight();


    save();
    render();


    return true;
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function getAppearanceField(
    field
  ) {

    ensureAppearance();


    return state.appearance[
      field
    ];
  }


  function setAppearanceField(
    field,
    value
  ) {

    ensureAppearance();


    if (
      field ===
      "height"
    ) {
      return setHeight(
        value
      );
    }


    if (
      !Object.prototype.hasOwnProperty.call(
        state.appearance,
        field
      )
    ) {
      return false;
    }


    /*
     * Campos numéricos de proporção.
     */

    const numericFields = [
      "width",
      "shoulders",
      "torso",
      "arms",
      "legs",
      "head",
      "markingOpacity",
      "markingScale",
      "birthmarkOpacity",
      "birthmarkScale",
      "scarCount",
      "scarSize",
      "tattooOpacity",
      "tattooScale"
    ];


    if (
      numericFields.includes(
        field
      )
    ) {

      const numericValue =
        Number(
          value
        );


      if (
        !Number.isFinite(
          numericValue
        )
      ) {
        return false;
      }


      state.appearance[
        field
      ] =
        numericValue;

    } else {

      state.appearance[
        field
      ] =
        String(
          value ??
            ""
        );
    }


    save();
    render();


    window.dispatchEvent(
      new CustomEvent(
        "aerion:appearance:changed",
        {
          detail: {
            field,
            value:
              state.appearance[
                field
              ]
          }
        }
      )
    );


    return true;
  }


  function resetAppearanceHeight() {

    ensureAppearance();


    const race =
      getEffectiveRace();


    if (
      !race?.height
    ) {
      return;
    }


    const min =
      Number(
        race.height.min
      );


    const max =
      Number(
        race.height.max
      );


    if (
      !Number.isFinite(
        min
      ) ||
      !Number.isFinite(
        max
      ) ||
      max <
        min
    ) {
      return;
    }


    const current =
      Number(
        state.appearance.height
      );


    if (
      !Number.isFinite(
        current
      ) ||
      current <
        min ||
      current >
        max
    ) {

      state.appearance.height =
        Math.round(
          (
            min +
            max
          ) /
            2
        );
    }
  }


  function setHeight(
    value
  ) {

    const race =
      getEffectiveRace();


    if (
      !race?.height
    ) {
      return false;
    }


    const min =
      Number(
        race.height.min
      );


    const max =
      Number(
        race.height.max
      );


    let height =
      Number(
        value
      );


    if (
      !Number.isFinite(
        height
      )
    ) {
      height =
        (
          min +
          max
        ) /
        2;
    }


    height =
      Math.max(
        min,

        Math.min(
          max,

          Math.round(
            height
          )
        )
      );


    state.appearance.height =
      height;


    save();
    render();


    return true;
  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function selectClass(
    classId
  ) {

    if (
      !CLASSES[
        classId
      ]
    ) {
      return false;
    }


    state.class =
      classId;


    ensureSkills();


    save();
    render();


    toast(
      `${CLASSES[classId].name} selecionado.`
    );


    return true;
  }


  /* =========================================================
     DADOS — INTEGRIDADE
     ========================================================= */

  function ensureAttributes() {

    if (
      !state.attributes ||
      typeof state.attributes !==
        "object"
    ) {

      state.attributes =
        {};
    }


    if (
      !state.rolls ||
      typeof state.rolls !==
        "object"
    ) {

      state.rolls =
        {};
    }


    const used =
      new Set();


    ATTRIBUTES.forEach(
      attribute => {

        const value =
          state.attributes[
            attribute.id
          ];


        if (
          value &&
          DICE_BY_ID[
            value
          ]
        ) {

          if (
            used.has(
              value
            )
          ) {

            state.attributes[
              attribute.id
            ] =
              null;

            delete state.rolls[
              attribute.id
            ];

          } else {

            used.add(
              value
            );
          }

        } else {

          state.attributes[
            attribute.id
          ] =
            null;

          delete state.rolls[
            attribute.id
          ];
        }
      }
    );
  }


  function getAssignedAttributeForDie(
    dieId
  ) {

    const result =
      ATTRIBUTES.find(
        attribute =>
          state.attributes[
            attribute.id
          ] ===
          dieId
      );


    return (
      result?.id ||
      null
    );
  }


  function isDieAssigned(
    dieId
  ) {
    return Boolean(
      getAssignedAttributeForDie(
        dieId
      )
    );
  }


  function isDieAvailable(
    dieId
  ) {
    return Boolean(
      DICE_BY_ID[
        dieId
      ]
    ) &&
      !isDieAssigned(
        dieId
      );
  }


  function getDiceState() {

    return DICE.map(
      die => {

        const assignedTo =
          getAssignedAttributeForDie(
            die.id
          );


        return {

          ...die,

          available:
            !assignedTo,

          assigned:
            Boolean(
              assignedTo
            ),

          assignedTo:
            assignedTo
        };
      }
    );
  }


  /* =========================================================
     SELEÇÃO DE DADOS
     ========================================================= */

  function selectDie(
    dieId
  ) {

    dieId =
      String(
        dieId ??
          ""
      );


    if (
      !DICE_BY_ID[
        dieId
      ]
    ) {
      return false;
    }


    if (
      !isDieAvailable(
        dieId
      )
    ) {

      toast(
        `${formatDieName(
          dieId
        )} já está atribuído.`
      );


      return false;
    }


    selectedDie =
      dieId;


    render();


    return true;
  }


  function clearDieSelection() {

    selectedDie =
      null;


    render();
  }


  /* =========================================================
     ATRIBUIÇÃO DE DADO
     ========================================================= */

  function assignDie(
    attribute,
    dieId
  ) {

    attribute =
      String(
        attribute ??
          ""
      );


    dieId =
      String(
        dieId ??
          ""
      );


    if (
      !ATTRIBUTES.some(
        item =>
          item.id ===
          attribute
      )
    ) {
      return false;
    }


    if (
      !DICE_BY_ID[
        dieId
      ]
    ) {
      return false;
    }


    const current =
      state.attributes[
        attribute
      ];


    /*
     * Clicou no mesmo dado já colocado:
     * devolve para a piscina.
     */

    if (
      current ===
      dieId
    ) {

      returnDie(
        attribute
      );


      return true;
    }


    /*
     * O mesmo dado físico não pode
     * ocupar dois atributos.
     */

    const owner =
      getAssignedAttributeForDie(
        dieId
      );


    if (
      owner &&
      owner !==
        attribute
    ) {

      toast(
        `${formatDieName(
          dieId
        )} já está em ${getAttributeName(
          owner
        )}.`
      );


      return false;
    }


    /*
     * Não substitui silenciosamente
     * outro dado.
     */

    if (
      current &&
      current !==
        dieId
    ) {

      toast(
        `${getAttributeName(
          attribute
        )} já possui um dado.`
      );


      return false;
    }


    state.attributes[
      attribute
    ] =
      dieId;


    delete state.rolls[
      attribute
    ];


    selectedDie =
      null;


    save();
    render();


    toast(
      `${formatDieName(
        dieId
      )} colocado em ${getAttributeName(
        attribute
      )}.`
    );


    return true;
  }


  function assignSelectedDie(
    attribute
  ) {

    if (
      !selectedDie
    ) {

      toast(
        "Selecione um dado primeiro."
      );


      return false;
    }


    const dieId =
      selectedDie;


    return assignDie(
      attribute,
      dieId
    );
  }


  function returnDie(
    attribute
  ) {

    attribute =
      String(
        attribute ??
          ""
      );


    if (
      !ATTRIBUTES.some(
        item =>
          item.id ===
          attribute
      )
    ) {
      return false;
    }


    const dieId =
      state.attributes[
        attribute
      ];


    if (
      !dieId
    ) {
      return false;
    }


    state.attributes[
      attribute
    ] =
      null;


    delete state.rolls[
      attribute
    ];


    if (
      selectedDie ===
      dieId
    ) {
      selectedDie =
        null;
    }


    save();
    render();


    return true;
  }


  /* =========================================================
     ROLAGEM
     ========================================================= */

  function rollAttribute(
    attribute
  ) {

    attribute =
      String(
        attribute ??
          ""
      );


    const dieId =
      state.attributes[
        attribute
      ];


    const die =
      dieId
        ? DICE_BY_ID[
            dieId
          ]
        : null;


    if (
      !die
    ) {

      toast(
        "Coloque um dado nesse atributo primeiro."
      );


      return null;
    }


    const value =
      Math.floor(
        Math.random() *
          die.sides
      ) +
      1;


    const modifier =
      getRaceModifier(
        attribute
      );


    const total =
      value +
      modifier;


    state.rolls[
      attribute
    ] = {

      dieId,

      dieType:
        die.type,

      sides:
        die.sides,

      value,

      modifier,

      total,

      timestamp:
        Date.now()
    };


    save();
    render();


    toast(
      `${getAttributeName(
        attribute
      )}: ${total}`
    );


    return total;
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function getRaceModifier(
    attribute
  ) {

    return (
      Number(
        getEffectiveRace()
          ?.modifiers?.[
          attribute
        ]
      ) ||
      0
    );
  }


  function getAttributeName(
    attribute
  ) {

    return (
      ATTRIBUTES.find(
        item =>
          item.id ===
          attribute
      )?.name ||
      attribute
    );
  }


  function getAttribute(
    attribute
  ) {

    const dieId =
      state.attributes[
        attribute
      ];


    const die =
      dieId
        ? DICE_BY_ID[
            dieId
          ]
        : null;


    const roll =
      state.rolls[
        attribute
      ];


    const modifier =
      getRaceModifier(
        attribute
      );


    return {

      id:
        attribute,

      name:
        getAttributeName(
          attribute
        ),

      die:
        dieId,

      dieId:
        dieId,

      type:
        die?.type ||
        null,

      sides:
        die?.sides ||
        0,

      racialModifier:
        modifier,

      rolled:
        Boolean(
          roll
        ),

      roll:
        roll?.value ??
        null,

      total:
        roll?.total ??
        null
    };
  }


  function getEffectiveAttributes() {

    const result =
      {};


    ATTRIBUTES.forEach(
      attribute => {

        result[
          attribute.id
        ] =
          getAttribute(
            attribute.id
          );
      }
    );


    return result;
  }


  /* =========================================================
     PODER
     ========================================================= */

  function rollPower() {

    const roll =
      Math.floor(
        Math.random() *
          100
      ) +
      1;


    const index =
      Math.min(

        PRIMARY_POWERS.length -
          1,

        Math.floor(
          (
            roll -
            1
          ) /
            25
        )
      );


    state.power =
      PRIMARY_POWERS[
        index
      ];


    state.powerRoll =
      roll;


    state.powerType =
      "principal";


    save();
    render();


    toast(
      `D100: ${roll} → ${state.power}`
    );


    return {

      roll,

      power:
        state.power
    };
  }


  function selectParallelPower(
    power
  ) {

    if (
      !PARALLEL_POWERS.includes(
        power
      )
    ) {
      return false;
    }


    state.power =
      power;


    state.powerRoll =
      null;


    state.powerType =
      "paralelo";


    save();
    render();


    return true;
  }


  function validatePower() {

    if (
      state.power &&
      !PRIMARY_POWERS.includes(
        state.power
      ) &&
      !PARALLEL_POWERS.includes(
        state.power
      )
    ) {

      state.power =
        "";

      state.powerRoll =
        null;

      state.powerType =
        "";
    }
  }


  /* =========================================================
     MANA
     ========================================================= */

  function selectMana(
    mana
  ) {

    mana =
      String(
        mana ??
          ""
      ).toLowerCase();


    if (
      mana !==
      "azul"
    ) {

      toast(
        "Esta Mana está bloqueada."
      );


      return false;
    }


    state.mana =
      "azul";


    save();
    render();


    return true;
  }


  function validateMana() {

    if (
      state.mana !==
      "azul"
    ) {

      state.mana =
        "azul";
    }
  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function ensureSkills() {

    if (
      !state.skills ||
      typeof state.skills !==
        "object"
    ) {

      state.skills =
        {};
    }


    Object.keys(
      SKILLS
    ).forEach(
      id => {

        const current =
          state.skills[
            id
          ];


        if (
          !current ||
          typeof current !==
            "object"
        ) {

          state.skills[
            id
          ] = {

            trained:
              false,

            bonus:
              0
          };


          return;
        }


        current.trained =
          Boolean(
            current.trained
          );


        current.bonus =
          Number(
            current.bonus
          ) ||
          0;
      }
    );
  }


  function trainSkill(
    skillId
  ) {

    ensureSkills();


    if (
      !SKILLS[
        skillId
      ]
    ) {
      return false;
    }


    state.skills[
      skillId
    ].trained =
      !state.skills[
        skillId
      ].trained;


    save();
    render();


    return true;
  }


  function setSkillBonus(
    skillId,
    value
  ) {

    ensureSkills();


    if (
      !SKILLS[
        skillId
      ]
    ) {
      return false;
    }


    state.skills[
      skillId
    ].bonus =
      Math.max(
        -20,

        Math.min(
          20,

          Number(
            value
          ) ||
          0
        )
      );


    save();
    render();


    return true;
  }


  function getEffectiveSkillBonus(
    skillId
  ) {

    ensureSkills();


    const data =
      state.skills[
        skillId
      ];


    if (
      !data
    ) {
      return 0;
    }


    const trained =
      data.trained
        ? 5
        : 0;


    const manual =
      Number(
        data.bonus
      ) ||
      0;


    const classBonus =
      Number(
        CLASSES[
          state.class
        ]?.skillBonuses?.[
          skillId
        ]
      ) ||
      0;


    return (
      trained +
      manual +
      classBonus
    );
  }


  function getEffectiveSkills() {

    ensureSkills();


    const result =
      {};


    Object.keys(
      SKILLS
    ).forEach(
      id => {

        result[id] = {

          id,

          trained:
            Boolean(
              state.skills[
                id
              ].trained
            ),

          bonus:
            Number(
              state.skills[
                id
              ].bonus
            ) ||
            0,

          effectiveBonus:
            getEffectiveSkillBonus(
              id
            )
        };
      }
    );


    return result;
  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function ensureTechniques() {

    if (
      !Array.isArray(
        state.techniques
      )
    ) {

      state.techniques =
        [];
    }
  }


  function createTechnique() {

    return {

      id:
        `tech-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      name:
        "",

      description:
        "",

      range:
        "",

      damage:
        "",

      cost:
        "",

      test:
        "",

      limitation:
        ""
    };
  }


  function addTechnique(
    data = {}
  ) {

    ensureTechniques();


    const technique = {

      ...createTechnique(),

      ...data
    };


    state.techniques.push(
      technique
    );


    save();
    render();


    return technique;
  }


  function updateTechnique(
    id,
    field,
    value
  ) {

    ensureTechniques();


    const item =
      state.techniques.find(
        technique =>
          technique.id ===
          id
      );


    if (
      !item
    ) {
      return false;
    }


    const allowed = [
      "name",
      "description",
      "range",
      "damage",
      "cost",
      "test",
      "limitation"
    ];


    if (
      !allowed.includes(
        field
      )
    ) {
      return false;
    }


    item[
      field
    ] =
      String(
        value ??
          ""
      );


    save();


    return true;
  }


  function removeTechnique(
    id
  ) {

    ensureTechniques();


    state.techniques =
      state.techniques.filter(
        item =>
          item.id !==
          id
      );


    save();
    render();


    return true;
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function ensureInventory() {

    if (
      !Array.isArray(
        state.inventory
      )
    ) {

      state.inventory =
        [];
    }
  }


  function createInventoryItem() {

    return {

      id:
        `item-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      name:
        "",

      quantity:
        1,

      description:
        ""
    };
  }


  function addInventoryItem(
    data = {}
  ) {

    ensureInventory();


    const item = {

      ...createInventoryItem(),

      ...data
    };


    state.inventory.push(
      item
    );


    save();
    render();


    return item;
  }


  function updateInventoryItem(
    id,
    field,
    value
  ) {

    ensureInventory();


    const item =
      state.inventory.find(
        entry =>
          entry.id ===
          id
      );


    if (
      !item
    ) {
      return false;
    }


    if (
      field ===
      "quantity"
    ) {

      item.quantity =
        Math.max(
          0,

          Number(
            value
          ) ||
          0
        );

    } else if (
      field ===
        "name" ||
      field ===
        "description"
    ) {

      item[
        field
      ] =
        String(
          value ??
            ""
        );

    } else {

      return false;
    }


    save();


    return true;
  }


  function removeInventoryItem(
    id
  ) {

    ensureInventory();


    state.inventory =
      state.inventory.filter(
        item =>
          item.id !==
          id
      );


    save();
    render();


    return true;
  }


  /* =========================================================
     COMBATE
     ========================================================= */

  function calculateHP() {

    const race =
      getEffectiveRace();


    const vigor =
      getAttribute(
        "vigor"
      );


    if (
      !race ||
      !vigor.dieId
    ) {
      return null;
    }


    const size =
      race.size ||
      "medio";


    const hpBySize = {

      pequeno:
        1,

      medio:
        3,

      grande:
        5,

      colossal:
        5
    };


    return (

      10 +

      Number(
        vigor.total ||
          0
      ) +

      (
        hpBySize[
          size
        ] ||
        3
      )
    );
  }


  function getCombatData() {

    const race =
      getEffectiveRace();


    if (
      !race
    ) {

      return {

        hp:
          null,

        movement:
          null,

        air:
          null,

        aquatic:
          null,

        canFly:
          false
      };
    }


    const sizeMovement = {

      pequeno:
        7,

      medio:
        9,

      grande:
        7,

      colossal:
        6
    };


    let movement =
      sizeMovement[
        race.size
      ] ||
      9;


    const groundMultiplier =
      Number(
        race.movement
          ?.groundMultiplier
      ) ||
      1;


    movement *=
      groundMultiplier;


    let air =
      null;


    if (
      race.flight
    ) {

      air =
        12 *
        (
          Number(
            race.movement
              ?.airMultiplier
          ) ||
          1
        );
    }


    let aquatic =
      null;


    if (
      race.movement
        ?.aquaticMultiplier
    ) {

      aquatic =
        9 *
        (
          Number(
            race.movement
              ?.aquaticMultiplier
          ) ||
          1
        );
    }


    return {

      hp:
        calculateHP(),

      movement,

      air,

      aquatic,

      canFly:
        Boolean(
          race.flight
        )
    };
  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function isStepComplete(
    index
  ) {

    switch (
      index
    ) {

      case 0:

        return Boolean(
          state.name
            ?.trim()
        ) &&
          Boolean(
            state.gender
          );


      case 1:

        return Boolean(
          state.race
        );


      case 2:

        return Boolean(
          state.appearance
            ?.height
        );


      case 3:

        return Boolean(
          state.class
        );


      case 4:

        return ATTRIBUTES.every(
          attribute =>
            Boolean(
              state.attributes[
                attribute.id
              ]
            )
        );


      case 5:

        return Boolean(
          state.power
        );


      case 6:

        return (
          state.mana ===
          "azul"
        );


      case 7:
      case 8:
      case 9:

        return true;


      case 10:

        return (

          isStepComplete(0) &&

          isStepComplete(1) &&

          isStepComplete(2) &&

          isStepComplete(3) &&

          isStepComplete(4) &&

          isStepComplete(5) &&

          isStepComplete(6)
        );


      default:

        return false;
    }
  }


  function getProgress() {

    let completed =
      0;


    STEPS.forEach(
      (
        _,
        index
      ) => {

        if (
          isStepComplete(
            index
          )
        ) {
          completed++;
        }
      }
    );


    return {

      completed,

      total:
        STEPS.length,

      percent:
        Math.round(
          (
            completed /
            STEPS.length
          ) *
            100
        )
    };
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function clampStep() {

    state.step =
      Math.max(

        0,

        Math.min(

          STEPS.length -
            1,

          Number(
            state.step
          ) ||
          0
        )
      );
  }


  function canEnterStep(
    index
  ) {

    if (
      index <=
      0
    ) {
      return true;
    }


    return isStepComplete(
      index -
        1
    );
  }


  function goToStep(
    index
  ) {

    index =
      Number(
        index
      );


    if (
      !Number.isInteger(
        index
      ) ||
      index <
        0 ||
      index >=
        STEPS.length
    ) {
      return false;
    }


    if (
      !canEnterStep(
        index
      )
    ) {

      toast(
        `Complete "${STEPS[index - 1]?.name || "a etapa anterior"}" primeiro.`
      );


      return false;
    }


    state.step =
      index;


    save();
    render();


    window.scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });


    return true;
  }


  function nextStep() {

    const current =
      Number(
        state.step
      ) ||
      0;


    if (
      !isStepComplete(
        current
      )
    ) {

      toast(
        `Complete "${STEPS[current].name}" para continuar.`
      );


      return false;
    }


    if (
      current >=
      STEPS.length -
        1
    ) {

      return finish();
    }


    state.step =
      current +
      1;


    save();
    render();


    window.scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });


    return true;
  }


  function previousStep() {

    if (
      state.step <=
      0
    ) {
      return false;
    }


    state.step -=
      1;


    save();
    render();


    window.scrollTo({
      top:
        0,

      behavior:
        "smooth"
    });


    return true;
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function setName(
    value
  ) {

    state.name =
      String(
        value ??
          ""
      );


    save();
    render();
  }


  function setAge(
    value
  ) {

    state.age =
      String(
        value ??
          ""
      );


    save();
    render();
  }


  function setGender(
    value
  ) {

    if (
      value !==
        "masculino" &&
      value !==
        "feminino"
    ) {
      return false;
    }


    state.gender =
      value;


    save();
    render();


    return true;
  }


  function setDescription(
    value
  ) {

    state.description =
      String(
        value ??
          ""
      );


    save();
    render();
  }


  function setOrigin(
    value
  ) {

    state.origin =
      String(
        value ??
          ""
      );


    save();
    render();
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function setAvatar(
    file
  ) {

    if (
      !file
    ) {
      return false;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      toast(
        "Escolha uma imagem válida."
      );


      return false;
    }


    if (
      file.size >
      CONFIG.maxImageSize
    ) {

      toast(
        "A imagem deve ter no máximo 6 MB."
      );


      return false;
    }


    const reader =
      new FileReader();


    reader.onload =
      event => {

        state.avatar =
          String(
            event.target?.result ||
              ""
          );


        state.avatarName =
          file.name ||
          "";


        save();
        render();


        toast(
          "Imagem adicionada."
        );
      };


    reader.onerror =
      () => {

        toast(
          "Não foi possível carregar a imagem."
        );
      };


    reader.readAsDataURL(
      file
    );


    return true;
  }


  function removeAvatar() {

    state.avatar =
      "";

    state.avatarName =
      "";


    save();
    render();


    return true;
  }


  /* =========================================================
     FINALIZAÇÃO
     ========================================================= */

  function validateBeforeFinish() {

    for (
      let index = 0;

      index <=
      6;

      index++
    ) {

      if (
        !isStepComplete(
          index
        )
      ) {

        state.step =
          index;


        save();
        render();


        toast(
          `Complete "${STEPS[index].name}" antes de finalizar.`
        );


        return false;
      }
    }


    return true;
  }


  function buildCharacter() {

    return {

      ...clone(
        state
      ),


      dice:
        getDiceState(),


      raceData:
        clone(
          getEffectiveRace()
        ),


      effectiveAttributes:
        getEffectiveAttributes(),


      effectiveSkills:
        getEffectiveSkills(),


      combat:
        getCombatData(),


      version:
        13,


      exportedAt:
        new Date().toISOString()
    };
  }


  function finish() {

    if (
      !validateBeforeFinish()
    ) {
      return false;
    }


    const character =
      buildCharacter();


    try {

      localStorage.setItem(
        CONFIG.lastCharacterKey,

        JSON.stringify(
          character
        )
      );

    } catch (
      error
    ) {

      console.warn(
        "[AERION] Falha ao salvar ficha final:",
        error
      );
    }


    window.AERION_LAST_CHARACTER =
      character;


    window.dispatchEvent(
      new CustomEvent(
        "aerion:ficha:complete",
        {
          detail:
            character
        }
      )
    );


    forceSave();


    toast(
      "Ficha concluída!",
      3200
    );


    return true;
  }


  /* =========================================================
     CLICK
     ========================================================= */

  function onClick(
    event
  ) {

    const target =
      event.target;


    if (
      !target
    ) {
      return;
    }


    /* ---------------------------------------------
       DADO DENTRO DO ATRIBUTO
       --------------------------------------------- */

    const attributeDie =
      target.closest(
        "[data-attribute-die]"
      );


    if (
      attributeDie
    ) {

      const attribute =
        attributeDie.dataset
          .attribute;


      if (
        attribute
      ) {

        returnDie(
          attribute
        );


        return;
      }
    }


    /* ---------------------------------------------
       ATRIBUTO RECEBE DADO
       --------------------------------------------- */

    const attributeDrop =
      target.closest(
        "[data-attribute-drop]"
      );


    if (
      attributeDrop
    ) {

      const attribute =
        attributeDrop.dataset
          .attributeDrop ||
        attributeDrop.dataset
          .attribute;


      if (
        attribute
      ) {

        if (
          selectedDie
        ) {

          assignSelectedDie(
            attribute
          );

        } else {

          toast(
            "Selecione um dado primeiro."
          );
        }


        return;
      }
    }


    /* ---------------------------------------------
       PISCINA DE DADOS
       --------------------------------------------- */

    const die =
      target.closest(
        "[data-die]"
      );


    if (
      die &&
      !die.closest(
        "[data-attribute-die]"
      )
    ) {

      selectDie(
        die.dataset.die
      );


      return;
    }


    /* ---------------------------------------------
       AÇÕES
       --------------------------------------------- */

    const action =
      target.closest(
        "[data-action]"
      );


    if (
      !action
    ) {
      return;
    }


    switch (
      action.dataset.action
    ) {

      case "next":
        nextStep();
        break;


      case "previous":
        previousStep();
        break;


      case "go-step":
        goToStep(
          action.dataset.step
        );
        break;


      case "race-previous":
        previousRace();
        break;


      case "race-next":
        nextRace();
        break;


      case "go-race-index":
        setRaceIndex(
          action.dataset.raceIndex
        );
        break;


      case "select-race-current":
        selectCurrentRace();
        break;


      case "select-race":
        selectRace(
          action.dataset.race
        );
        break;


      case "select-animalha":
        selectAnimalha(
          action.dataset.animalha
        );
        break;


      case "select-class":
        selectClass(
          action.dataset.class
        );
        break;


      case "clear-die-selection":
        clearDieSelection();
        break;


      case "remove-die":
      case "return-die":
        returnDie(
          action.dataset.attribute
        );
        break;


      case "roll-attribute":
        rollAttribute(
          action.dataset.attribute
        );
        break;


      case "roll-power":
        rollPower();
        break;


      case "select-parallel-power":
        selectParallelPower(
          action.dataset.power
        );
        break;


      case "select-mana":
        selectMana(
          action.dataset.mana
        );
        break;


      case "train-skill":
        trainSkill(
          action.dataset.skill
        );
        break;


      case "add-technique":
        addTechnique();
        break;


      case "remove-technique":
        removeTechnique(
          action.dataset.techniqueId
        );
        break;


      case "add-inventory":
        addInventoryItem();
        break;


      case "remove-inventory":
        removeInventoryItem(
          action.dataset.inventoryId
        );
        break;


      case "remove-avatar":
        removeAvatar();
        break;


      case "finish":
        finish();
        break;
    }
  }


  /* =========================================================
     INPUT
     ========================================================= */

  function onInput(
    event
  ) {

    const target =
      event.target;


    if (
      !target
    ) {
      return;
    }


    switch (
      target.id
    ) {

      case "characterName":

        setName(
          target.value
        );

        break;


      case "characterAge":

        setAge(
          target.value
        );

        break;


      case "characterDescription":

        setDescription(
          target.value
        );

        break;


      case "characterOrigin":

        setOrigin(
          target.value
        );

        break;


      case "heightRange":

        setHeight(
          target.value
        );

        break;


      case "hair":
      case "eyes":
      case "skin":
      case "clothing":
      case "scars":
      case "tattoos":
      case "physicalNotes":

        setAppearanceField(
          target.id,
          target.value
        );

        break;


      default:
        break;
    }


    if (
      target.matches(
        "[data-skill-bonus]"
      )
    ) {

      setSkillBonus(
        target.dataset.skillBonus,

        target.value
      );
    }


    if (
      target.matches(
        "[data-technique-id][data-technique-field]"
      )
    ) {

      updateTechnique(
        target.dataset.techniqueId,

        target.dataset.techniqueField,

        target.value
      );
    }


    if (
      target.matches(
        "[data-inventory-id][data-inventory-field]"
      )
    ) {

      updateInventoryItem(
        target.dataset.inventoryId,

        target.dataset.inventoryField,

        target.value
      );
    }
  }


  /* =========================================================
     CHANGE
     ========================================================= */

  function onChange(
    event
  ) {

    const target =
      event.target;


    if (
      !target
    ) {
      return;
    }


    if (
      target.id ===
      "avatarInput"
    ) {

      setAvatar(
        target.files?.[0]
      );


      return;
    }


    if (
      target.name ===
      "gender"
    ) {

      setGender(
        target.value
      );


      return;
    }
  }


  /* =========================================================
     DRAG
     ========================================================= */

  function onDragStart(
    event
  ) {

    const element =
      event.target.closest(
        "[data-die]"
      );


    if (
      !element
    ) {
      return;
    }


    if (
      element.closest(
        "[data-attribute-die]"
      )
    ) {

      event.preventDefault();

      return;
    }


    const dieId =
      element.dataset.die;


    if (
      !isDieAvailable(
        dieId
      )
    ) {

      event.preventDefault();

      return;
    }


    selectedDie =
      dieId;


    element.classList.add(
      "is-dragging"
    );


    if (
      event.dataTransfer
    ) {

      event.dataTransfer.effectAllowed =
        "move";


      event.dataTransfer.setData(
        "text/plain",
        dieId
      );
    }
  }


  function onDragEnd(
    event
  ) {

    const element =
      event.target.closest(
        "[data-die]"
      );


    element?.classList.remove(
      "is-dragging"
    );
  }


  function onDragOver(
    event
  ) {

    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );


    if (
      !target
    ) {
      return;
    }


    event.preventDefault();


    target.classList.add(
      "drag-over"
    );
  }


  function onDragLeave(
    event
  ) {

    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );


    if (
      !target
    ) {
      return;
    }


    if (
      target.contains(
        event.relatedTarget
      )
    ) {
      return;
    }


    target.classList.remove(
      "drag-over"
    );
  }


  function onDrop(
    event
  ) {

    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );


    if (
      !target
    ) {
      return;
    }


    event.preventDefault();


    target.classList.remove(
      "drag-over"
    );


    let dieId =
      event.dataTransfer
        ?.getData(
          "text/plain"
        ) ||
      selectedDie;


    if (
      !dieId
    ) {

      toast(
        "Selecione ou arraste um dado primeiro."
      );


      return;
    }


    assignDie(

      target.dataset
        .attributeDrop ||

      target.dataset
        .attribute,

      dieId
    );
  }


  /* =========================================================
     HELPERS
     ========================================================= */

  function formatDieName(
    dieId
  ) {

    const die =
      DICE_BY_ID[
        dieId
      ];


    return die
      ? `D${die.sides}`
      : "Dado";
  }


  function installLifecycle() {

    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.visibilityState ===
          "hidden"
        ) {

          forceSave();
        }
      }
    );


    window.addEventListener(
      "beforeunload",
      forceSave
    );
  }


  /* =========================================================
     RESET
     ========================================================= */

  function reset() {

    const confirmed =
      window.confirm(
        "Deseja realmente criar uma nova ficha?"
      );


    if (
      !confirmed
    ) {
      return false;
    }


    localStorage.removeItem(
      CONFIG.storageKey
    );


    state =
      createDefaultState();


    selectedDie =
      null;


    ensureSkills();


    forceSave();


    render();


    toast(
      "Nova ficha criada."
    );


    return true;
  }


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

    load();

    sanitizeState();


    document.addEventListener(
      "click",
      onClick
    );


    document.addEventListener(
      "input",
      onInput
    );


    document.addEventListener(
      "change",
      onChange
    );


    document.addEventListener(
      "dragstart",
      onDragStart
    );


    document.addEventListener(
      "dragend",
      onDragEnd
    );


    document.addEventListener(
      "dragover",
      onDragOver
    );


    document.addEventListener(
      "dragleave",
      onDragLeave
    );


    document.addEventListener(
      "drop",
      onDrop
    );


    installLifecycle();


    render();


    console.info(
      "[AERION] ficha.js inicializado."
    );
  }


  /* =========================================================
     API
     ========================================================= */

  window.AERIONFicha =
    Object.freeze({

      constants: {

        CONFIG,

        STEPS,

        ATTRIBUTES,

        DICE,

        DICE_BY_ID,

        PRIMARY_POWERS,

        PARALLEL_POWERS,

        CLASSES,

        SKILLS
      },


      getState:
        getPublicState,


      getCharacter:
        buildCharacter,


      save:
        forceSave,


      reset,


      finish,


      next:
        nextStep,


      previous:
        previousStep,


      goToStep,


      selectRace,


      selectCurrentRace,


      nextRace,


      previousRace,


      setRaceIndex,


      selectAnimalha,


      getAppearanceField,


      setAppearanceField,


      setHeight,


      selectClass,


      selectDie,


      clearDieSelection,


      assignDie,


      assignSelectedDie,


      returnDie,


      isDieAvailable,


      isDieAssigned,


      getDiceState,


      getAssignedAttributeForDie,


      getAttribute,


      getEffectiveAttributes,


      rollAttribute,


      rollPower,


      selectParallelPower,


      selectMana,


      trainSkill,


      setSkillBonus,


      getEffectiveSkillBonus,


      getEffectiveSkills,


      addTechnique,


      updateTechnique,


      removeTechnique,


      addInventoryItem,


      updateInventoryItem,


      removeInventoryItem,


      setName,


      setAge,


      setGender,


      setDescription,


      setOrigin,


      setAvatar,


      removeAvatar
    });


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:
          true
      }
    );

  } else {

    init();
  }

})();