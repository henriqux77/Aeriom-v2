/* =========================================================
   AERION — CRIAÇÃO DE FICHA
   js/core/ficha.js

   Sistema:
   - Salvamento automático
   - Restauração de rascunho
   - Identidade
   - Gênero
   - Imagem
   - Raças
   - Classes
   - Atributos com estoque limitado de dados
   - Troca/devolução de dados
   - Poder com D100
   - Mana Azul
   - Perícias
   - Técnicas
   - Inventário
   - Revisão
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURAÇÃO
  ========================================================= */

  const CONFIG = {
    draftKey: "aerion:ficha:draft:v3",
    autosaveDelay: 700,

    supabaseUrl:
      window.AERION_CONFIG?.supabaseUrl ||
      document.querySelector(
        'meta[name="aerion-supabase-url"]'
      )?.content ||
      "",

    supabaseAnonKey:
      window.AERION_CONFIG?.supabaseAnonKey ||
      document.querySelector(
        'meta[name="aerion-supabase-anon-key"]'
      )?.content ||
      ""
  };


  /* =========================================================
     ETAPAS
  ========================================================= */

  const STEPS = [
    {
      id: "identity",
      title: "Identidade"
    },
    {
      id: "race",
      title: "Raça"
    },
    {
      id: "class",
      title: "Classe"
    },
    {
      id: "attributes",
      title: "Atributos"
    },
    {
      id: "power",
      title: "Poder"
    },
    {
      id: "mana",
      title: "Mana"
    },
    {
      id: "skills",
      title: "Perícias"
    },
    {
      id: "techniques",
      title: "Técnicas"
    },
    {
      id: "inventory",
      title: "Inventário"
    },
    {
      id: "review",
      title: "Revisão"
    }
  ];


  /* =========================================================
     DADOS DOS ATRIBUTOS

     REGRA DEFINIDA:

     D4  ×1
     D6  ×2
     D8  ×1
     D10 ×1
     D12 ×1
     D20 ×2

     TOTAL = 8 DADOS
     TOTAL = 8 ATRIBUTOS
  ========================================================= */

  const DICE_LIMITS = Object.freeze({
    d4: 1,
    d6: 2,
    d8: 1,
    d10: 1,
    d12: 1,
    d20: 2
  });
/* =========================================================
   DADOS INDIVIDUAIS DA FICHA
========================================================= */

const ATTRIBUTE_ORDER = Object.freeze([
  "forca",
  "vigor",
  "agilidade",
  "precisao",
  "intelecto",
  "controle",
  "presenca",
  "percepcao"
]);

const DICE_POOL = Object.freeze([
  { id: "d4-1", sides: 4 },
  { id: "d6-1", sides: 6 },
  { id: "d6-2", sides: 6 },
  { id: "d8-1", sides: 8 },
  { id: "d10-1", sides: 10 },
  { id: "d12-1", sides: 12 },
  { id: "d20-1", sides: 20 },
  { id: "d20-2", sides: 20 }
]);

  /* =========================================================
     RAÇAS
  ========================================================= */

  const RACES = [
    {
      id: "humano",
      name: "Humano",

      maleImage:
        "https://i.ibb.co/TBNmfF0S/file-000000008b74820ea8b432fcf06ed975.png",

      femaleImage:
        "https://i.ibb.co/LdmxJ2h9/file-000000004b94820ead12a26ca92d75b7.png",

      description:
        "Humanos são uma das raças clássicas de AERION, conhecidos por sua capacidade de adaptação."
    },

    {
      id: "elfo",
      name: "Elfo",

      maleImage:
        "https://i.ibb.co/0y8WXSr8/file-00000000495c820e99fc5de509918d90.png",

      femaleImage:
        "https://i.ibb.co/F1DCc3j/file-00000000dcf8820e883635d6ca9de492.png",

      description:
        "Elfos possuem uma aparência característica e forte identidade ligada à fantasia de AERION."
    },

    {
      id: "anao",
      name: "Anão",

      maleImage:
        "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",

      femaleImage:
        "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png",

      description:
        "Anões possuem constituição robusta e tradição ligada a materiais, estruturas e forja."
    },

    {
      id: "orc",
      name: "Orc",

      maleImage:
        "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",

      femaleImage:
        "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png",

      description:
        "Orcs apresentam características físicas marcantes e presença facilmente reconhecível."
    },

    {
      id: "centauro",
      name: "Centauro",

      maleImage:
        "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",

      femaleImage:
        "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png",

      description:
        "Centauros combinam características humanoides e equinas em uma única anatomia."
    },

    {
      id: "vampiro",
      name: "Vampiro",

      maleImage:
        "https://i.ibb.co/PGFcNRXZ/file-0000000019dc820ea49a893a9831ffeb.png",

      femaleImage:
        "https://i.ibb.co/Kpx8jh0j/file-000000008cfc820e827a7b8376d3fd55.png",

      description:
        "Vampiros possuem identidade sobrenatural e características visuais próprias."
    },

    {
      id: "duende",
      name: "Duende",

      maleImage:
        "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",

      femaleImage:
        "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png",

      description:
        "Duendes possuem aparência distinta e forte identidade ligada a comércio e contratos."
    },

    {
      id: "fada",
      name: "Fada",

      maleImage:
        "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",

      femaleImage:
        "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png",

      description:
        "Fadas possuem uma identidade fantástica e visual delicado."
    },

    {
      id: "povo_aquatico",
      name: "Povo Aquático",

      maleImage:
        "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png",

      femaleImage:
        "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png",

      description:
        "O Povo Aquático possui características naturalmente adaptadas ao ambiente aquático."
    },

    {
      id: "animalha_felino",
      name: "Animalha — Felino",

      maleImage:
        "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",

      femaleImage:
        "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea284e54236c00052.png",

      description:
        "Animalhas felinas possuem características animais integradas ao corpo humanoide."
    },

    {
      id: "povo_natureza",
      name: "Povo da Natureza",

      maleImage:
        "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",

      femaleImage:
        "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",

      description:
        "O Povo da Natureza possui identidade ligada aos ambientes naturais."
    },

    {
      id: "neraliano",
      name: "Neraliano",

      maleImage:
        "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",

      femaleImage:
        "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png",

      description:
        "Neralianos possuem adaptações relacionadas à água, profundidade e vibrações."
    }
  ];


  /* =========================================================
     CLASSES
  ========================================================= */

  const CLASSES = [
    {
      id: "guerreiro",
      name: "Guerreiro",
      role: "Combatente",
      bonus: "+1",
      description:
        "Especialista em armas e combate.",
      image:
        "https://i.ibb.co/Z12VGcdj/file-00000000f884820ea169d455610bbb08.png"
    },

    {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",
      bonus: "+5",
      description:
        "Especialista em magia, técnicas e Mana.",
      image:
        "https://i.ibb.co/pBsLK1dG/file-000000004438820eb1451ab0c303400a.png"
    },

    {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",
      bonus: "+2",
      description:
        "Especialista em cura e suporte.",
      image:
        "https://i.ibb.co/MkV7gWRh/file-000000008180820e865940e8302d66ee.png"
    },

    {
      id: "monge",
      name: "Monge",
      role: "Marcial",
      bonus: "+7",
      description:
        "Especialista em Mana corporal e combate marcial.",
      image:
        "https://i.ibb.co/JjgbsFKy/64403ce2-d0b6-4627-9419-b9f570e4a04c-20260829-224451-0000.png"
    }
  ];


  /* =========================================================
     ATRIBUTOS
  ========================================================= */

  const ATTRIBUTE_NAMES = Object.freeze({
    forca: "Força",
    vigor: "Vigor",
    controle: "Controle",
    precisao: "Precisão",
    presenca: "Presença",
    agilidade: "Agilidade",
    intelecto: "Intelecto",
    percepcao: "Percepção"
  });


  const ATTRIBUTE_DESCRIPTIONS = Object.freeze({
    forca: "Potência física",
    vigor: "Resistência",
    controle: "Controle de Mana",
    precisao: "Mira e precisão",
    presenca: "Influência e presença",
    agilidade: "Reflexos e movimento",
    intelecto: "Conhecimento e raciocínio",
    percepcao: "Leitura do ambiente"
  });


  /* =========================================================
     PODERES
     
     IMPORTANTE:
     O D100 gera um resultado 1–100.
     Não colocamos uma tabela inventada de poderes porque
     ela ainda não foi definida oficialmente no material.
  ========================================================= */

  const POWER_CENTRAL_ELEMENTS = [
    "Fogo",
    "Ar",
    "Terra",
    "Água"
  ];


  /* =========================================================
     ESTADO
  ========================================================= */

  function createDefaultState() {

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

      class: "",

      classBonus: "",

      attributes: {

        forca: null,
        vigor: null,
        controle: null,
        precisao: null,
        presenca: null,
        agilidade: null,
        intelecto: null,
        percepcao: null

      },

      power: "",

      powerRoll: null,

      origin: "",

      mana: "azul",

      skills: [],

      techniques: [],

      inventory: [],

      currentStep: 0,

      updatedAt: null

    };

  }


  let state =
    createDefaultState();


  let selectedDice = null;


  let saveTimer = null;


  let toastTimer = null;


  let initialized = false;


  /* =========================================================
     DOM
  ========================================================= */

  const $ = (
    selector,
    root = document
  ) =>
    root.querySelector(
      selector
    );


  const $$ = (
    selector,
    root = document
  ) =>
    Array.from(
      root.querySelectorAll(
        selector
      )
    );


  /* =========================================================
     UTILITÁRIOS
  ========================================================= */

  function safeText(value) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }

    return String(value);

  }

function getDieById(dieId) {
  return DICE_POOL.find(
    die => die.id === dieId
  ) || null;
}
  function getUsedDieIds() {
  const used = new Set();

  Object.values(state.attributes || {}).forEach(
    dieId => {
      if (dieId) {
        used.add(dieId);
      }
    }
  );

  return used;
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


  function showToast(
    message,
    duration = 2400
  ) {

    const toast =
      $("#toast");

    if (!toast) {
      return;
    }

    toast.textContent =
      safeText(message);

    toast.hidden =
      false;

    clearTimeout(
      toastTimer
    );

    toastTimer =
      window.setTimeout(
        () => {

          toast.hidden =
            true;

        },
        duration
      );

  }


  function setSaveStatus(
    type,
    text
  ) {

    const textElement =
      $("#saveStatusText");

    const dot =
      $(".save-dot");

    if (
      textElement
    ) {

      textElement.textContent =
        text;

    }

    if (
      !dot
    ) {

      return;

    }

    if (
      type ===
      "error"
    ) {

      dot.style.background =
        "var(--danger)";

      dot.style.boxShadow =
        "0 0 12px rgba(197,108,99,.4)";

      return;

    }

    if (
      type ===
      "saved"
    ) {

      dot.style.background =
        "var(--success)";

      dot.style.boxShadow =
        "0 0 12px rgba(131,173,121,.4)";

      return;

    }

    dot.style.background =
      "var(--gold)";

    dot.style.boxShadow =
      "0 0 12px rgba(216,180,90,.4)";

  }


  /* =========================================================
     ATRIBUTOS — NORMALIZAÇÃO
  ========================================================= */

  function normalizeAttributes(
    rawAttributes
  ) {

    const output = {

      forca: null,
      vigor: null,
      controle: null,
      precisao: null,
      presenca: null,
      agilidade: null,
      intelecto: null,
      percepcao: null

    };


    if (
      !rawAttributes ||
      typeof rawAttributes !==
      "object"
    ) {

      return output;

    }


    const used = {

      d4: 0,
      d6: 0,
      d8: 0,
      d10: 0,
      d12: 0,
      d20: 0

    };


    Object.keys(
      output
    )
      .forEach(
        attribute => {

          const die =
            safeText(
              rawAttributes[
                attribute
              ]
            )
            .toLowerCase();


          if (
            !Object.prototype.hasOwnProperty.call(
              DICE_LIMITS,
              die
            )
          ) {

            return;

          }


          if (
            used[
              die
            ] >=
            DICE_LIMITS[
              die
            ]
          ) {

            return;

          }


          output[
            attribute
          ] =
            die;


          used[
            die
          ]++;

        }
      );


    return output;

  }


  /* =========================================================
     NORMALIZAÇÃO COMPLETA
  ========================================================= */

  function normalizeState(
    raw
  ) {

    const base =
      createDefaultState();


    if (
      !raw ||
      typeof raw !==
      "object"
    ) {

      return base;

    }


    const merged = {

      ...base,

      ...raw,

      attributes:
        normalizeAttributes(
          raw.attributes
        ),

      skills:
        Array.isArray(
          raw.skills
        )
          ? raw.skills
          : [],

      techniques:
        Array.isArray(
          raw.techniques
        )
          ? raw.techniques
          : [],

      inventory:
        Array.isArray(
          raw.inventory
        )
          ? raw.inventory
          : []

    };


    if (
      !Number.isInteger(
        merged.currentStep
      )
    ) {

      merged.currentStep =
        0;

    }


    merged.currentStep =
      clamp(
        merged.currentStep,
        0,
        STEPS.length - 1
      );


    if (
      !Number.isInteger(
        merged.raceIndex
      )
    ) {

      merged.raceIndex =
        0;

    }


    merged.raceIndex =
      clamp(
        merged.raceIndex,
        0,
        RACES.length - 1
      );


    if (
      !RACES.some(
        race =>
          race.id ===
          merged.race
      )
    ) {

      merged.race =
        "";

    }


    const classData =
      CLASSES.find(
        item =>
          item.id ===
          merged.class
      );


    if (
      !classData
    ) {

      merged.class =
        "";

      merged.classBonus =
        "";

    } else {

      merged.classBonus =
        classData.bonus;

    }


    if (
      ![
        "masculino",
        "feminino"
      ].includes(
        merged.gender
      )
    ) {

      merged.gender =
        "";

    }


    /*
     * Ficha-base:
     * Mana Azul somente.
     */
    merged.mana =
      "azul";


    return merged;

  }


  /* =========================================================
     SALVAMENTO LOCAL
  ========================================================= */

  function saveLocalDraft() {

    try {

      const draft = {

        ...state,

        attributes: {
          ...state.attributes
        },

        skills: [
          ...state.skills
        ],

        techniques:
          state.techniques.map(
            item => ({
              ...item
            })
          ),

        inventory:
          state.inventory.map(
            item => ({
              ...item
            })
          ),

        /*
         * Data URL só permanece se for pequena.
         * A persistência definitiva da imagem ficará no Storage.
         */
        avatarDataUrl:
          state.avatarDataUrl &&
          state.avatarDataUrl.length <=
          2_000_000

            ? state.avatarDataUrl

            : "",

        updatedAt:
          new Date().toISOString()

      };


      localStorage.setItem(
        CONFIG.draftKey,
        JSON.stringify(
          draft
        )
      );


      state.updatedAt =
        draft.updatedAt;


      setSaveStatus(
        "saved",
        "Salvo automaticamente"
      );


      return true;

    } catch (
      error
    ) {

      console.error(
        "[AERION][FICHA] Erro ao salvar:",
        error
      );


      setSaveStatus(
        "error",
        "Erro ao salvar"
      );


      return false;

    }

  }


  function loadLocalDraft() {

    try {

      const raw =
        localStorage.getItem(
          CONFIG.draftKey
        );


      if (!raw) {

        return false;

      }


      state =
        normalizeState(
          JSON.parse(
            raw
          )
        );


      return true;

    } catch (
      error
    ) {

      console.warn(
        "[AERION][FICHA] Rascunho inválido:",
        error
      );


      localStorage.removeItem(
        CONFIG.draftKey
      );


      return false;

    }

  }


  function scheduleAutosave() {

    setSaveStatus(
      "saving",
      "Salvando..."
    );


    clearTimeout(
      saveTimer
    );


    saveTimer =
      window.setTimeout(
        saveLocalDraft,
        CONFIG.autosaveDelay
      );

  }


  /* =========================================================
     SUPABASE
     
     A persistência definitiva não é ativada aqui ainda,
     para não escrever em uma tabela incorreta.
  ========================================================= */

  function getSupabaseClient() {

    if (
      !CONFIG.supabaseUrl ||
      !CONFIG.supabaseAnonKey
    ) {

      return null;

    }


    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
      "function"
    ) {

      return null;

    }


    if (
      !window.__AERION_SUPABASE_CLIENT__
    ) {

      window.__AERION_SUPABASE_CLIENT__ =
        window.supabase.createClient(
          CONFIG.supabaseUrl,
          CONFIG.supabaseAnonKey
        );

    }


    return window.__AERION_SUPABASE_CLIENT__;

  }


  async function saveToSupabase() {

    const client =
      getSupabaseClient();


    if (
      !client
    ) {

      return {

        ok: false,
        skipped: true

      };

    }


    /*
     * Não executa operação destrutiva ou especulativa.
     * A estrutura definitiva de ficha-base + campanha
     * será conectada quando o schema estiver fechado.
     */
    return {

      ok: false,

      skipped: true,

      reason:
        "Persistência definitiva ainda não conectada."

    };

  }


  /* =========================================================
     PROGRESSO
  ========================================================= */

  function isIdentityComplete() {

    return Boolean(
      state.name.trim()
    );

  }


  function isRaceComplete() {

    return Boolean(
      state.race
    );

  }


  function isClassComplete() {

    return Boolean(
      state.class
    );

  }


  function areAllAttributesAssigned() {

    return (
      Object.values(
        state.attributes
      )
      .filter(
        Boolean
      )
      .length ===
      Object.keys(
        ATTRIBUTE_NAMES
      ).length
    );

  }


  function isPowerComplete() {

    return Boolean(
      state.power.trim()
    );

  }


  function isManaComplete() {

    return (
      state.mana ===
      "azul"
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


    if (
      index >=
      1 &&
      !isIdentityComplete()
    ) {

      return false;

    }


    if (
      index >=
      2 &&
      !isRaceComplete()
    ) {

      return false;

    }


    if (
      index >=
      3 &&
      !isClassComplete()
    ) {

      return false;

    }


    if (
      index >=
      4 &&
      !areAllAttributesAssigned()
    ) {

      return false;

    }


    if (
      index >=
      5 &&
      !isPowerComplete()
    ) {

      return false;

    }


    return true;

  }


  function isStepComplete(
    index
  ) {

    switch (
      STEPS[index]?.id
    ) {

      case "identity":
        return isIdentityComplete();

      case "race":
        return isRaceComplete();

      case "class":
        return isClassComplete();

      case "attributes":
        return areAllAttributesAssigned();

      case "power":
        return isPowerComplete();

      case "mana":
        return isManaComplete();

      case "skills":
        return state.skills.length > 0;

      case "techniques":
        return state.techniques.length > 0;

      case "inventory":
        return state.inventory.length > 0;

      case "review":
        return (
          isIdentityComplete() &&
          isRaceComplete() &&
          isClassComplete() &&
          areAllAttributesAssigned() &&
          isPowerComplete() &&
          isManaComplete()
        );

      default:
        return false;

    }

  }


  function getProgressPercent() {

    let completed =
      0;


    for (
      let i = 0;
      i < STEPS.length;
      i++
    ) {

      if (
        isStepComplete(
          i
        )
      ) {

        completed++;

      }

    }


    return Math.round(
      (
        completed /
        STEPS.length
      ) *
      100
    );

  }


  function updateProgress() {

    const index =
      state.currentStep;


    const percent =
      getProgressPercent();


    const fill =
      $("#progressFill");


    const percentage =
      $("#progressPercent");


    const title =
      $("#progressTitle");


    const counter =
      $("#stepCounter");


    if (
      fill
    ) {

      fill.style.width =
        `${percent}%`;

    }


    if (
      percentage
    ) {

      percentage.textContent =
        `${percent}%`;

    }


    if (
      title
    ) {

      title.textContent =
        STEPS[
          index
        ]?.title ||
        "Identidade";

    }


    if (
      counter
    ) {

      counter.textContent =
        `${index + 1} de ${STEPS.length}`;

    }


    $$(".creation-step")
      .forEach(
        (
          button,
          buttonIndex
        ) => {

          button.classList.toggle(
            "is-active",
            buttonIndex ===
            index
          );


          button.classList.toggle(
            "is-complete",
            isStepComplete(
              buttonIndex
            )
          );


          button.disabled =
            buttonIndex >
            index &&
            !canEnterStep(
              buttonIndex
            );

        }
      );


    const previous =
      $("#previousStepButton");


    if (
      previous
    ) {

      previous.disabled =
        index ===
        0;

    }


    const next =
      $("#nextStepButton");


    if (
      next
    ) {

      next.textContent =
        index ===
        STEPS.length - 1

          ? "Finalizar →"

          : "Próximo →";

    }

  }


  function goToStep(
    targetIndex
  ) {

    const index =
      clamp(
        Number(
          targetIndex
        ) || 0,

        0,

        STEPS.length - 1
      );


    if (
      index >
      state.currentStep &&
      !canEnterStep(
        index
      )
    ) {

      validateBeforeNext();

      return false;

    }


    state.currentStep =
      index;


    $$(".creation-panel")
      .forEach(
        panel => {

          const active =
            panel.dataset.panel ===
            STEPS[
              index
            ].id;


          panel.hidden =
            !active;


          panel.classList.toggle(
            "is-active",
            active
          );

        }
      );


    updateProgress();


    const stepButton =
      $(
        `.creation-step[data-step="${STEPS[index].id}"]`
      );


    stepButton?.scrollIntoView(
      {
        behavior:
          "smooth",

        block:
          "nearest",

        inline:
          "center"
      }
    );


    window.scrollTo(
      {
        top:
          0,

        behavior:
          "smooth"
      }
    );


    /*
     * Atualiza a etapa individual.
     */
    switch (
      STEPS[index].id
    ) {

      case "race":
        renderRace();
        break;

      case "class":
        renderClasses();
        break;

      case "attributes":
        renderAttributes();
        break;

      case "power":
        renderPower();
        break;

      case "mana":
        renderMana();
        break;

      case "techniques":
        renderTechniques();
        break;

      case "inventory":
        renderInventory();
        break;

      case "review":
        updateReview();
        break;

    }


    scheduleAutosave();


    return true;

  }


  function validateBeforeNext() {

    if (
      !isIdentityComplete()
    ) {

      showToast(
        "Digite o nome do aventureiro."
      );


      goToStep(
        0
      );


      $("#characterName")
        ?.focus();


      return false;

    }


    if (
      !isRaceComplete()
    ) {

      showToast(
        "Escolha uma raça."
      );


      goToStep(
        1
      );


      return false;

    }


    if (
      !isClassComplete()
    ) {

      showToast(
        "Escolha uma classe."
      );


      goToStep(
        2
      );


      return false;

    }


    if (
      !areAllAttributesAssigned()
    ) {

      showToast(
        `Complete os atributos: ${getAttributeCount()}/8.`
      );


      goToStep(
        3
      );


      return false;

    }


    if (
      !isPowerComplete()
    ) {

      showToast(
        "Defina o poder do aventureiro."
      );


      goToStep(
        4
      );


      return false;

    }


    return true;

  }


  /* =========================================================
     IDENTIDADE
  ========================================================= */

  function hydrateIdentity() {

    const name =
      $("#characterName");

    const age =
      $("#characterAge");

    const description =
      $("#characterDescription");

    const power =
      $("#characterPower");

    const origin =
      $("#characterOrigin");


    if (
      name
    ) {

      name.value =
        state.name;

    }


    if (
      age
    ) {

      age.value =
        state.age;

    }


    if (
      description
    ) {

      description.value =
        state.description;

    }


    if (
      power
    ) {

      power.value =
        state.power;

    }


    if (
      origin
    ) {

      origin.value =
        state.origin;

    }


    $$(
      'input[name="gender"]'
    )
      .forEach(
        radio => {

          radio.checked =
            radio.value ===
            state.gender;

        }
      );


    renderAvatar();

  }


  function bindIdentity() {

    $("#characterName")
      ?.addEventListener(
        "input",
        event => {

          state.name =
            safeText(
              event.target.value
            );


          $("#nameError")?.setAttribute(
            "hidden",
            ""
          );


          updateProgress();

          scheduleAutosave();

          updateReview();

        }
      );


    $("#characterAge")
      ?.addEventListener(
        "input",
        event => {

          state.age =
            safeText(
              event.target.value
            );


          scheduleAutosave();

          updateReview();

        }
      );


    $("#characterDescription")
      ?.addEventListener(
        "input",
        event => {

          state.description =
            safeText(
              event.target.value
            );


          scheduleAutosave();

        }
      );


    $("#characterPower")
      ?.addEventListener(
        "input",
        event => {

          state.power =
            safeText(
              event.target.value
            );


          scheduleAutosave();

          updateProgress();

          updateReview();

        }
      );


    $("#characterOrigin")
      ?.addEventListener(
        "input",
        event => {

          state.origin =
            safeText(
              event.target.value
            );


          scheduleAutosave();

        }
      );


    $$(
      'input[name="gender"]'
    )
      .forEach(
        radio => {

          radio.addEventListener(
            "change",
            () => {

              state.gender =
                radio.value;


              renderRace();

              updateReview();

              scheduleAutosave();

            }
          );

        }
      );


    $("#avatarInput")
      ?.addEventListener(
        "change",
        handleAvatarUpload
      );


    $("#removeAvatarButton")
      ?.addEventListener(
        "click",
        () => {

          state.avatarDataUrl =
            "";

          state.avatarFileName =
            "";


          const input =
            $("#avatarInput");


          if (
            input
          ) {

            input.value =
              "";

          }


          renderAvatar();

          scheduleAutosave();

        }
      );

  }


  function handleAvatarUpload(
    event
  ) {

    const file =
      event.target.files?.[0];


    if (
      !file
    ) {

      return;

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

      showToast(
        "Formato de imagem não suportado."
      );


      event.target.value =
        "";


      return;

    }


    if (
      file.size >
      6 *
      1024 *
      1024
    ) {

      showToast(
        "A imagem deve ter no máximo 6 MB."
      );


      event.target.value =
        "";


      return;

    }


    const reader =
      new FileReader();


    reader.onload =
      () => {

        state.avatarDataUrl =
          safeText(
            reader.result
          );


        state.avatarFileName =
          file.name;


        renderAvatar();

        scheduleAutosave();

      };


    reader.onerror =
      () => {

        showToast(
          "Não foi possível carregar a imagem."
        );

      };


    reader.readAsDataURL(
      file
    );

  }


  function renderAvatar() {

    const image =
      $("#avatarImage");


    const placeholder =
      $("#avatarPlaceholder");


    const remove =
      $("#removeAvatarButton");


    if (
      !image ||
      !placeholder
    ) {

      return;

    }


    if (
      state.avatarDataUrl
    ) {

      image.src =
        state.avatarDataUrl;


      image.hidden =
        false;


      placeholder.hidden =
        true;


      if (
        remove
      ) {

        remove.disabled =
          false;

      }

    } else {

      image.hidden =
        true;


      image.removeAttribute(
        "src"
      );


      placeholder.hidden =
        false;


      if (
        remove
      ) {

        remove.disabled =
          true;

      }

    }


    updateReview();

  }


  /* =========================================================
     RAÇAS
  ========================================================= */

  function getCurrentRace() {

    return (
      RACES[
        state.raceIndex
      ] ||
      RACES[0]
    );

  }


  function getRaceImage(
    race
  ) {

    if (
      !race
    ) {

      return "";

    }


    if (
      state.gender ===
      "feminino"
    ) {

      return (
        race.femaleImage ||
        race.maleImage ||
        ""
      );

    }


    if (
      state.gender ===
      "masculino"
    ) {

      return (
        race.maleImage ||
        race.femaleImage ||
        ""
      );

    }


    return (
      race.maleImage ||
      race.femaleImage ||
      ""
    );

  }


  function renderRaceDots() {

    const container =
      $("#raceDots");


    if (
      !container
    ) {

      return;

    }


    container.innerHTML =
      "";


    RACES.forEach(
      (
        race,
        index
      ) => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          index ===
          state.raceIndex

            ? "is-active"

            : "";


        button.setAttribute(
          "aria-label",
          race.name
        );


        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();


            state.raceIndex =
              index;


            renderRace();

            scheduleAutosave();

          }
        );


        container.appendChild(
          button
        );

      }
    );

  }


  function renderRace() {

    const race =
      getCurrentRace();


    if (
      !race
    ) {

      return;

    }


    const image =
      $("#raceImage");


    const name =
      $("#raceName");


    const description =
      $("#raceShortDescription");


    const selected =
      $("#raceSelectedText");


    const genderLabel =
      $("#raceGenderLabel");


    if (
      image
    ) {

      image.src =
        getRaceImage(
          race
        );


      image.alt =
        `${race.name} — personagem`;

    }


    if (
      name
    ) {

      name.textContent =
        race.name;

    }


    if (
      description
    ) {

      description.textContent =
        race.description;

    }


    if (
      genderLabel
    ) {

      genderLabel.textContent =
        state.gender

          ? `${race.name} · ${state.gender}`

          : race.name;

    }


    if (
      selected
    ) {

      selected.textContent =
        state.race ===
        race.id

          ? "✓ Selecionada"

          : "Selecionar raça";

    }


    const detailsTitle =
      $("#raceDescriptionTitle");


    const detailsText =
      $("#raceDescriptionText");


    if (
      detailsTitle
    ) {

      detailsTitle.textContent =
        race.name;

    }


    if (
      detailsText
    ) {

      detailsText.textContent =
        race.description;

    }


    renderRaceDots();

  }


  function selectCurrentRace() {

    const race =
      getCurrentRace();


    if (
      !race
    ) {

      return false;

    }


    state.race =
      race.id;


    updateStateAndRender();


    showToast(
      `${race.name} selecionada.`
    );


    return true;

  }


  function openRaceModal() {

    const race =
      getCurrentRace();


    const modal =
      $("#raceModal");


    if (
      !race ||
      !modal
    ) {

      return;

    }


    const title =
      $("#modalRaceName");


    const description =
      $("#modalRaceDescription");


    if (
      title
    ) {

      title.textContent =
        race.name;

    }


    if (
      description
    ) {

      description.textContent =
        race.description;

    }


    if (
      typeof modal.showModal ===
      "function"
    ) {

      if (
        !modal.open
      ) {

        modal.showModal();

      }

    } else {

      modal.setAttribute(
        "open",
        ""
      );

    }

  }


  function closeRaceModal() {

    const modal =
      $("#raceModal");


    if (
      !modal
    ) {

      return;

    }


    if (
      typeof modal.close ===
      "function"
    ) {

      if (
        modal.open
      ) {

        modal.close();

      }

    } else {

      modal.removeAttribute(
        "open"
      );

    }

  }


  function bindRace() {

    $("#racePrevious")
      ?.addEventListener(
        "click",
        event => {

          event.stopPropagation();


          state.raceIndex =
            (
              state.raceIndex -
              1 +
              RACES.length
            ) %
            RACES.length;


          renderRace();

          scheduleAutosave();

        }
      );


    $("#raceNext")
      ?.addEventListener(
        "click",
        event => {

          event.stopPropagation();


          state.raceIndex =
            (
              state.raceIndex +
              1
            ) %
            RACES.length;


          renderRace();

          scheduleAutosave();

        }
      );


    $("#raceCard")
      ?.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".race-select-indicator"
            )
          ) {

            selectCurrentRace();

            return;

          }


          openRaceModal();

        }
      );


    $("#modalSelectRace")
      ?.addEventListener(
        "click",
        () => {

          selectCurrentRace();

          closeRaceModal();

        }
      );


    $("#closeRaceModal")
      ?.addEventListener(
        "click",
        closeRaceModal
      );


    $("#raceModal")
      ?.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            event.currentTarget
          ) {

            closeRaceModal();

          }

        }
      );

  }


  /* =========================================================
     CLASSES
  ========================================================= */

  function renderClasses() {

    $$(".class-card")
      .forEach(
        card => {

          const id =
            safeText(
              card.dataset.class
            )
            .trim()
            .toLowerCase();


          const selected =
            id ===
            state.class;


          card.classList.toggle(
            "is-selected",
            selected
          );


          card.setAttribute(
            "aria-pressed",
            String(
              selected
            )
          );


          const selection =
            card.querySelector(
              ".class-selection span"
            );


          if (
            selection
          ) {

            selection.textContent =
              selected

                ? "✓ Selecionada"

                : "Selecionar";

          }

        }
      );

  }


  function selectClass(
    classId
  ) {

    const normalized =
      safeText(
        classId
      )
      .trim()
      .toLowerCase();


    const classData =
      CLASSES.find(
        item =>
          item.id ===
          normalized
      );


    if (
      !classData
    ) {

      return false;

    }


    state.class =
      classData.id;


    state.classBonus =
      classData.bonus;


    updateStateAndRender();


    showToast(
      `${classData.name} selecionada.`
    );


    return true;

  }


  function bindClasses() {

    /*
     * Funciona com o HTML atual:
     * <article class="class-card" data-class="guerreiro">
     *
     * Também funciona com botão, caso o HTML seja alterado.
     */
    document.addEventListener(
      "click",
      event => {

        const card =
          event.target.closest(
            ".class-card[data-class]"
          );


        if (
          !card
        ) {

          return;

        }


        const classId =
          card.dataset.class;


        selectClass(
          classId
        );

      }
    );


    document.addEventListener(
      "keydown",
      event => {

        const card =
          event.target.closest(
            ".class-card[data-class]"
          );


        if (
          !card
        ) {

          return;

        }


        if (
          event.key !==
            "Enter" &&
          event.key !==
            " "
        ) {

          return;

        }


        event.preventDefault();


        selectClass(
          card.dataset.class
        );

      }
    );


    /*
     * Se os cards forem criados sem imagem,
     * preenchemos usando os dados oficiais do catálogo.
     */
    $$(".class-card[data-class]")
      .forEach(
        card => {

          const id =
            card.dataset.class;


          const classData =
            CLASSES.find(
              item =>
                item.id ===
                id
            );


          if (
            !classData
          ) {

            return;

          }


          const image =
            card.querySelector(
              "img"
            );


          if (
            image &&
            !image.src
          ) {

            image.src =
              classData.image;

          }

        }
      );

  }


  /* =========================================================
     ATRIBUTOS
  ========================================================= */

  function getAttributeCount() {

    return Object.values(
      state.attributes
    )
      .filter(
        Boolean
      )
      .length;

  }


  function getDiceUsage() {

    const usage = {

      d4: 0,
      d6: 0,
      d8: 0,
      d10: 0,
      d12: 0,
      d20: 0

    };


    Object.values(
      state.attributes
    )
      .forEach(
        die => {

          if (
            die &&
            Object.prototype.hasOwnProperty.call(
              usage,
              die
            )
          ) {

            usage[
              die
            ]++;

          }

        }
      );


    return usage;

  }


  function getRemainingDice(
    die
  ) {

    const normalized =
      safeText(
        die
      )
      .toLowerCase();


    if (
      !Object.prototype.hasOwnProperty.call(
        DICE_LIMITS,
        normalized
      )
    ) {

      return 0;

    }


    const usage =
      getDiceUsage();


    return Math.max(
      0,
      DICE_LIMITS[
        normalized
      ] -
      (
        usage[
          normalized
        ] || 0
      )
    );

  }


 function updateDiceCards() {
  const container =
    $("#dicePool");

  if (!container) {
    return;
  }

  const usedDice =
    getUsedDieIds();

  container.innerHTML = "";

  DICE_POOL.forEach(die => {
    if (usedDice.has(die.id)) {
      return;
    }

    const card =
      document.createElement("button");

    card.type = "button";
    card.className = "attribute-die";
    card.draggable = true;

    card.dataset.dieId =
      die.id;

    card.dataset.sides =
      String(die.sides);

    card.textContent =
      `D${die.sides}`;

    card.addEventListener(
      "click",
      () => {
        openAttributePicker(
          die.id
        );
      }
    );
function assignDieToAttribute(
  dieId,
  attribute
) {
  const die =
    getDieById(dieId);

  if (!die) {
    return false;
  }

  if (
    !ATTRIBUTE_ORDER.includes(
      attribute
    )
  ) {
    return false;
  }

  /*
   * Se o atributo já possui um dado,
   * não substituímos automaticamente.
   */
  if (
    state.attributes[attribute]
  ) {
    showToast(
      "Esse atributo já possui um dado."
    );

    return false;
  }

  /*
   * O mesmo dado não pode existir
   * em dois atributos.
   */
  const alreadyUsed =
    Object.entries(
      state.attributes
    ).some(
      ([key, value]) =>
        key !== attribute &&
        value === dieId
    );

  if (alreadyUsed) {
    return false;
  }

  state.attributes[attribute] =
    dieId;

  selectedDice = null;

  updateDiceCards();
  renderAttributeSlots();
  renderAttributeChart();

  scheduleSave();

  return true;
}
    function removeDieFromAttribute(
  attribute
) {
  if (
    !ATTRIBUTE_ORDER.includes(
      attribute
    )
  ) {
    return;
  }

  state.attributes[attribute] =
    null;

  updateDiceCards();
  renderAttributeSlots();
  renderAttributeChart();

  scheduleSave();
}
    card.addEventListener(
      "dragstart",
      event => {
        event.dataTransfer.effectAllowed =
          "move";

        event.dataTransfer.setData(
          "text/plain",
          die.id
        );

        card.classList.add(
          "is-dragging"
        );
      }
    );
function setupAttributeDropZones() {
  $$(".attribute-slot").forEach(
    slot => {

      slot.addEventListener(
        "dragover",
        event => {
          event.preventDefault();

          slot.classList.add(
            "is-drag-over"
          );
        }
      );

      slot.addEventListener(
        "dragleave",
        () => {
          slot.classList.remove(
            "is-drag-over"
          );
        }
      );

      slot.addEventListener(
        "drop",
        event => {
          event.preventDefault();

          slot.classList.remove(
            "is-drag-over"
          );

          const dieId =
            event.dataTransfer.getData(
              "text/plain"
            );

          const attribute =
            slot.dataset.attribute;

          if (!dieId || !attribute) {
            return;
          }

          assignDieToAttribute(
            dieId,
            attribute
          );
        }
      );
    }
  );
}
    function renderAttributeSlots() {
  $$(".attribute-slot").forEach(
    slot => {

      const attribute =
        slot.dataset.attribute;

      const dieId =
        state.attributes[
          attribute
        ];

      const die =
        dieId
          ? getDieById(dieId)
          : null;

      const value =
        slot.querySelector(
          ".attribute-die-value"
        );

      if (!value) {
        return;
      }

      if (die) {
        value.textContent =
          `D${die.sides}`;

        slot.classList.add(
          "has-die"
        );

        slot.dataset.dieId =
          die.id;

      } else {
        value.textContent =
          "D?";

        slot.classList.remove(
          "has-die"
        );

        delete slot.dataset.dieId;
      }
    }
  );
}
    card.addEventListener(
      "dragend",
      () => {
        card.classList.remove(
          "is-dragging"
        );
      }
    );

    container.appendChild(
      card
    );
  });
}

  function selectDice(
    die
  ) {

    const normalized =
      safeText(
        die
      )
      .toLowerCase();


    if (
      !Object.prototype.hasOwnProperty.call(
        DICE_LIMITS,
        normalized
      )
    ) {

      return false;

    }


    const remaining =
      getRemainingDice(
        normalized
      );


    if (
      remaining <=
      0
    ) {

      showToast(
        `${normalized.toUpperCase()} já está esgotado.`
      );


      selectedDice =
        null;


      updateDiceCards();


      return false;

    }


    selectedDice =
      normalized;


    updateDiceCards();


    showToast(
      `${normalized.toUpperCase()} selecionado.`
    );


    return true;

  }


  function clearAttribute(
    attributeId
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        attributeId
      )
    ) {

      return false;

    }


    const oldDie =
      state.attributes[
        attributeId
      ];


    if (
      !oldDie
    ) {

      return false;

    }


    state.attributes[
      attributeId
    ] =
      null;


    selectedDice =
      null;


    updateStateAndRender();


    showToast(
      `${oldDie.toUpperCase()} devolvido aos dados disponíveis.`
    );


    return true;

  }


  function assignSelectedDice(
    attributeId
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        attributeId
      )
    ) {

      return false;

    }


    /*
     * Sem dado selecionado:
     *
     * atributo preenchido -> devolve o dado
     */
    if (
      !selectedDice
    ) {

      return clearAttribute(
        attributeId
      );

    }


    const newDie =
      selectedDice;


    const oldDie =
      state.attributes[
        attributeId
      ];


    /*
     * Clicou no mesmo dado:
     *
     * D20 em Força
     * seleciona D20
     * toca em Força
     * -> D20 volta para o estoque.
     */
    if (
      oldDie ===
      newDie
    ) {

      return clearAttribute(
        attributeId
      );

    }


    /*
     * Como o dado antigo fica liberado antes
     * da nova atribuição, uma troca como:
     *
     * Força D6
     * D20 selecionado
     *
     * resulta em:
     *
     * Força D20
     * D6 devolvido ao estoque
     */
    state.attributes[
      attributeId
    ] =
      null;


    /*
     * Confirma que ainda existe quantidade
     * do novo dado.
     */
    if (
      getRemainingDice(
        newDie
      ) <=
      0
    ) {

      state.attributes[
        attributeId
      ] =
        oldDie;


      showToast(
        `${newDie.toUpperCase()} não possui mais unidades disponíveis.`
      );


      selectedDice =
        null;


      updateDiceCards();


      return false;

    }


    state.attributes[
      attributeId
    ] =
      newDie;


    selectedDice =
      null;


    updateStateAndRender();


    showToast(
      `${newDie.toUpperCase()} colocado em ${ATTRIBUTE_NAMES[attributeId]}.`
    );


    return true;

  }


  /*
   * Função extra para troca direta entre DOIS atributos.
   *
   * Não é obrigatória para o uso normal da interface,
   * mas deixa a API preparada para drag-and-drop depois.
   */
  function swapAttributes(
    firstId,
    secondId
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        firstId
      ) ||
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        secondId
      )
    ) {

      return false;

    }


    if (
      firstId ===
      secondId
    ) {

      return false;

    }


    const firstDie =
      state.attributes[
        firstId
      ];


    const secondDie =
      state.attributes[
        secondId
      ];


    state.attributes[
      firstId
    ] =
      secondDie || null;


    state.attributes[
      secondId
    ] =
      firstDie || null;


    selectedDice =
      null;


    updateStateAndRender();


    return true;

  }


  function renderAttributes() {

    updateDiceCards();


    $$(".attribute-row")
      .forEach(
        row => {

          const attribute =
            row.dataset.attribute;


          const slot =
            row.querySelector(
              ".attribute-slot"
            );


          if (
            !slot
          ) {

            return;

          }


          const die =
            state.attributes[
              attribute
            ];


          if (
            die
          ) {

            slot.textContent =
              die.toUpperCase();


            slot.classList.add(
              "is-filled"
            );


            slot.title =
              "Clique sem selecionar outro dado para devolver este dado. Selecione outro dado para trocar.";

          } else {

            slot.textContent =
              "Selecionar dado";


            slot.classList.remove(
              "is-filled"
            );


            slot.removeAttribute(
              "title"
            );

          }

        }
      );


    updateAttributeCountUI();

    renderAttributeChart();

    updateProgress();

  }


  function updateAttributeCountUI() {

    const list =
      $("#attributeList");


    if (
      !list
    ) {

      return;

    }


    let indicator =
      list.querySelector(
        ".attribute-count-indicator"
      );


    if (
      !indicator
    ) {

      indicator =
        document.createElement(
          "div"
        );


      indicator.className =
        "attribute-count-indicator";


      indicator.style.color =
        "var(--muted)";


      indicator.style.fontSize =
        "12px";


      indicator.style.marginBottom =
        "10px";


      list.prepend(
        indicator
      );

    }


    const count =
      getAttributeCount();


    indicator.textContent =
      areAllAttributesAssigned()

        ? "✓ 8/8 atributos definidos"

        : `${count}/8 atributos definidos`;

  }


  function renderAttributeChart() {

    const container =
      $("#attributeChart");


    if (
      !container
    ) {

      return;

    }


    const values =
      Object.entries(
        state.attributes
      )
      .map(
        ([
          id,
          die
        ]) => {

          const numeric =
            die

              ? Number(
                  die
                    .replace(
                      "d",
                      ""
                    )
                )

              : 0;


          return {

            id,

            label:
              ATTRIBUTE_NAMES[
                id
              ],

            sides:
              numeric

          };

        }
      );


    if (
      !values.some(
        item =>
          item.sides >
          0
      )
    ) {

      container.innerHTML =
        `
        <div class="chart-placeholder">
          O gráfico aparecerá conforme os atributos forem definidos.
        </div>
        `;


      return;

    }


    container.innerHTML =
      "";


    const chart =
      document.createElement(
        "div"
      );


    chart.style.width =
      "100%";


    chart.style.display =
      "grid";


    chart.style.gap =
      "10px";


    values.forEach(
      item => {

        const row =
          document.createElement(
            "div"
          );


        row.style.display =
          "grid";


        row.style.gridTemplateColumns =
          "95px minmax(0,1fr) 48px";


        row.style.alignItems =
          "center";


        row.style.gap =
          "10px";


        const label =
          document.createElement(
            "span"
          );


        label.textContent =
          item.label;


        label.style.color =
          "#bdb7ac";


        label.style.fontSize =
          "12px";


        const track =
          document.createElement(
            "div"
          );


        track.style.height =
          "8px";


        track.style.overflow =
          "hidden";


        track.style.borderRadius =
          "999px";


        track.style.background =
          "rgba(255,255,255,.07)";


        const fill =
          document.createElement(
            "div"
          );


        fill.style.height =
          "100%";


        fill.style.width =
          `${Math.min(
            100,
            (
              item.sides /
              20
            ) *
            100
          )}%`;


        fill.style.borderRadius =
          "inherit";


        fill.style.background =
          "linear-gradient(90deg,#a47d29,#edd58d)";


        fill.style.transition =
          "width .3s ease";


        const value =
          document.createElement(
            "strong"
          );


        value.textContent =
          item.sides

            ? `D${item.sides}`

            : "—";


        value.style.color =
          item.sides

            ? "var(--gold-soft)"

            : "#67635c";


        value.style.textAlign =
          "right";


        value.style.fontFamily =
          "Georgia,serif";


        track.appendChild(
          fill
        );


        row.append(
          label,
          track,
          value
        );


        chart.appendChild(
          row
        );

      }
    );


    container.appendChild(
      chart
    );

  }


  function bindAttributes() {

    /*
     * Dados
     */
    document.addEventListener(
      "click",
      event => {

        const diceCard =
          event.target.closest(
            ".dice-card[data-die]"
          );


        if (
          !diceCard
        ) {

          return;

        }


        const die =
          diceCard.dataset.die;


        selectDice(
          die
        );

      },
      true
    );


    /*
     * Slots dos atributos
     */
    document.addEventListener(
      "click",
      event => {

        const slot =
          event.target.closest(
            ".attribute-slot[data-attribute-slot]"
          );


        if (
          !slot
        ) {

          return;

        }


        assignSelectedDice(
          slot.dataset.attributeSlot
        );

      }
    );

  }


  /* =========================================================
     PODER — D100
  ========================================================= */

  function ensurePowerInterface() {

    const panel =
      $(
        '.creation-panel[data-panel="power"]'
      );


    if (
      !panel
    ) {

      return;

    }


    /*
     * Se o HTML futuro já possuir o sistema completo,
     * não duplicamos.
     */
    if (
      panel.querySelector(
        ".power-system"
      )
    ) {

      return;

    }


    /*
     * Apenas adiciona o núcleo interativo do D100
     * ao painel existente.
     */
    const existingHeading =
      panel.querySelector(
        ".section-heading"
      );


    const container =
      document.createElement(
        "div"
      );


    container.className =
      "power-system";


    container.style.display =
      "grid";


    container.style.gap =
      "18px";


    container.innerHTML =
      `
      <div
        class="power-choice-mode"
        style="
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:12px;
        "
      >

        <button
          type="button"
          class="button button-secondary"
          data-power-mode="manual"
        >
          Escolher poder
        </button>

        <button
          type="button"
          class="button button-secondary"
          data-power-mode="roll"
        >
          🎲 Sortear D100
        </button>

      </div>


      <div
        class="power-manual"
        data-power-section="manual"
        hidden
      >

        <span class="field-label">
          Elementos centrais
        </span>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:10px;
            margin-top:10px;
          "
        >

          ${POWER_CENTRAL_ELEMENTS
            .map(
              power =>
                `
                <button
                  type="button"
                  class="button button-secondary"
                  data-power-value="${power}"
                >
                  ${power}
                </button>
                `
            )
            .join("")}

        </div>

      </div>


      <div
        class="power-roll"
        data-power-section="roll"
        hidden
      >

        <div
          style="
            padding:25px;
            border:1px solid var(--line);
            border-radius:18px;
            text-align:center;
            background:rgba(255,255,255,.015);
          "
        >

          <span class="eyebrow">
            RESULTADO DO D100
          </span>

          <strong
            data-power-result
            style="
              display:block;
              margin-top:8px;
              font-family:Georgia,serif;
              font-size:54px;
              color:var(--gold-soft);
            "
          >
            —
          </strong>

          <p
            data-power-result-note
            style="
              margin:10px 0 0;
              color:var(--muted);
            "
          >
            Role o D100 para obter um resultado.
          </p>

        </div>

        <button
          type="button"
          class="button button-primary"
          data-roll-power
        >
          🎲 Rolar D100
        </button>

      </div>


      <div
        class="power-current"
        style="
          padding:18px;
          border:1px solid var(--line);
          border-radius:16px;
          background:rgba(255,255,255,.012);
        "
      >

        <span class="eyebrow">
          PODER ESCOLHIDO
        </span>

        <strong
          data-power-current
          style="
            display:block;
            margin-top:6px;
            font-family:Georgia,serif;
            font-size:27px;
          "
        >
          Nenhum poder escolhido
        </strong>

      </div>
      `;


    /*
     * Encontra a posição correta:
     * depois do heading.
     */
    if (
      existingHeading
    ) {

      existingHeading.after(
        container
      );

    } else {

      panel.prepend(
        container
      );

    }


    /*
     * Esconde os inputs antigos de poder/origem visualmente
     * sem apagar dados que possam existir.
     */
    $("#characterPower")?.closest(
      ".field"
    )?.setAttribute(
      "hidden",
      ""
    );

  }


  function renderPower() {

    ensurePowerInterface();


    const current =
      $(
        "[data-power-current]"
      );


    const result =
      $(
        "[data-power-result]"
      );


    const note =
      $(
        "[data-power-result-note]"
      );


    if (
      current
    ) {

      current.textContent =
        state.power.trim() ||
        "Nenhum poder escolhido";

    }


    if (
      result
    ) {

      result.textContent =
        state.powerRoll
          ? String(
              state.powerRoll
            )
          : "—";

    }


    if (
      note
    ) {

      if (
        state.powerRoll
      ) {

        note.textContent =
          "Resultado gerado pelo D100. A associação entre faixas e poderes será aplicada quando a tabela oficial estiver definida.";

      } else {

        note.textContent =
          "Role o D100 para obter um resultado.";

      }

    }


    updateProgress();

  }


  function selectManualPower(
    power
  ) {

    if (
      !POWER_CENTRAL_ELEMENTS.includes(
        power
      )
    ) {

      return false;

    }


    state.power =
      power;


    updateStateAndRender();


    renderPower();


    showToast(
      `${power} selecionado como poder.`
    );


    return true;

  }


  function rollPowerD100() {

    const result =
      Math.floor(
        Math.random() *
        100
      ) +
      1;


    state.powerRoll =
      result;


    /*
     * NÃO atribuímos automaticamente um elemento,
     * porque a tabela 1–100 de poderes ainda não foi fechada.
     */


    const resultElement =
      $(
        "[data-power-result]"
      );


    const note =
      $(
        "[data-power-result-note]"
      );


    if (
      resultElement
    ) {

      resultElement.textContent =
        String(
          result
        );

    }


    if (
      note
    ) {

      note.textContent =
        `Resultado: ${result}. A tabela oficial do D100 definirá qual poder corresponde a este número.`;

    }


    scheduleAutosave();


    showToast(
      `D100: ${result}`
    );


    return result;

  }


  function bindPower() {

    /*
     * O HTML pode não ter os controles ainda;
     * eles são criados automaticamente.
     */
    ensurePowerInterface();


    document.addEventListener(
      "click",
      event => {

        const mode =
          event.target.closest(
            "[data-power-mode]"
          );


        if (
          mode
        ) {

          const selectedMode =
            mode.dataset.powerMode;


          const manual =
            $(
              '[data-power-section="manual"]'
            );


          const roll =
            $(
              '[data-power-section="roll"]'
            );


          if (
            manual
          ) {

            manual.hidden =
              selectedMode !==
              "manual";

          }


          if (
            roll
          ) {

            roll.hidden =
              selectedMode !==
              "roll";

          }


          return;

        }


        const powerButton =
          event.target.closest(
            "[data-power-value]"
          );


        if (
          powerButton
        ) {

          selectManualPower(
            powerButton.dataset.powerValue
          );


          return;

        }


        const rollButton =
          event.target.closest(
            "[data-roll-power]"
          );


        if (
          rollButton
        ) {

          rollPowerD100();

        }

      }
    );

  }


  /* =========================================================
     MANA
  ========================================================= */

  function renderMana() {

    $$(".mana-card")
      .forEach(
        card => {

          const azul =
            card.dataset.mana ===
            "azul";


          card.classList.toggle(
            "is-selected",
            azul
          );


          if (
            !azul
          ) {

            card.disabled =
              true;

          }

        }
      );


    state.mana =
      "azul";


    updateProgress();

  }


  function bindMana() {

    document.addEventListener(
      "click",
      event => {

        const card =
          event.target.closest(
            ".mana-card[data-mana]"
          );


        if (
          !card
        ) {

          return;

        }


        if (
          card.disabled
        ) {

          return;

        }


        state.mana =
          "azul";


        renderMana();

        scheduleAutosave();

      }
    );

  }


  /* =========================================================
     TÉCNICAS
  ========================================================= */

  function createTechniqueElement(
    index,
    technique
  ) {

    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "empty-module";


    wrapper.dataset.techniqueIndex =
      String(
        index
      );


    wrapper.innerHTML =
      `
      <div
        style="
          display:grid;
          gap:12px;
          text-align:left;
        "
      >

        <label class="field">

          <span class="field-label">
            Nome
          </span>

          <input
            type="text"
            data-technique-field="name"
            maxlength="100"
            placeholder="Nome da técnica"
          >

        </label>


        <label class="field">

          <span class="field-label">
            Descrição
          </span>

          <textarea
            data-technique-field="description"
            rows="4"
            maxlength="1000"
            placeholder="O que essa técnica faz?"
          ></textarea>

        </label>


        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
          "
        >

          <label class="field">

            <span class="field-label">
              Alcance
            </span>

            <input
              type="text"
              data-technique-field="range"
              maxlength="80"
              placeholder="Alcance"
            >

          </label>


          <label class="field">

            <span class="field-label">
              Dano / Efeito
            </span>

            <input
              type="text"
              data-technique-field="damage"
              maxlength="100"
              placeholder="Dano ou efeito"
            >

          </label>

        </div>


        <label class="field">

          <span class="field-label">
            Custo
          </span>

          <input
            type="text"
            data-technique-field="cost"
            maxlength="80"
            placeholder="Custo"
          >

        </label>


        <label class="field">

          <span class="field-label">
            Teste
          </span>

          <input
            type="text"
            data-technique-field="test"
            maxlength="100"
            placeholder="Teste utilizado"
          >

        </label>


        <label class="field">

          <span class="field-label">
            Limitação
          </span>

          <textarea
            data-technique-field="limitation"
            rows="3"
            maxlength="500"
            placeholder="Limitações"
          ></textarea>

        </label>


        <button
          type="button"
          class="button button-ghost"
          data-remove-technique
        >
          Remover técnica
        </button>

      </div>
      `;


    $$(
      "[data-technique-field]",
      wrapper
    )
      .forEach(
        input => {

          const key =
            input.dataset.techniqueField;


          input.value =
            safeText(
              technique?.[
                key
              ]
            );


          input.addEventListener(
            "input",
            () => {

              state.techniques[
                index
              ][key] =
                input.value;


              scheduleAutosave();

            }
          );

        }
      );


    $(
      "[data-remove-technique]",
      wrapper
    )
      ?.addEventListener(
        "click",
        () => {

          state.techniques.splice(
            index,
            1
          );


          renderTechniques();

          scheduleAutosave();

          updateProgress();

        }
      );


    return wrapper;

  }


  function renderTechniques() {

    const list =
      $("#techniquesList");


    if (
      !list
    ) {

      return;

    }


    list.innerHTML =
      "";


    state.techniques.forEach(
      (
        technique,
        index
      ) => {

        list.appendChild(
          createTechniqueElement(
            index,
            technique
          )
        );

      }
    );


    updateProgress();

  }


  function addTechnique() {

    state.techniques.push(
      {

        name: "",

        description: "",

        range: "",

        damage: "",

        cost: "",

        test: "",

        limitation: ""

      }
    );


    renderTechniques();

    scheduleAutosave();


    const firstEmpty =
      $$(
        "[data-technique-field]",
        $("#techniquesList")
      )
      .find(
        input =>
          !input.value
      );


    firstEmpty?.focus();

  }


  function bindTechniques() {

    $("#addTechniqueButton")
      ?.addEventListener(
        "click",
        addTechnique
      );

  }


  /* =========================================================
     INVENTÁRIO
  ========================================================= */

  function createInventoryElement(
    index,
    item
  ) {

    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "empty-module";


    wrapper.dataset.inventoryIndex =
      String(
        index
      );


    wrapper.innerHTML =
      `
      <div
        style="
          display:grid;
          gap:12px;
          text-align:left;
        "
      >

        <label class="field">

          <span class="field-label">
            Item
          </span>

          <input
            type="text"
            data-inventory-field="name"
            maxlength="100"
            placeholder="Nome do item"
          >

        </label>


        <label class="field">

          <span class="field-label">
            Descrição
          </span>

          <textarea
            data-inventory-field="description"
            rows="3"
            maxlength="500"
            placeholder="Descrição"
          ></textarea>

        </label>


        <button
          type="button"
          class="button button-ghost"
          data-remove-inventory
        >
          Remover item
        </button>

      </div>
      `;


    $$(
      "[data-inventory-field]",
      wrapper
    )
      .forEach(
        input => {

          const key =
            input.dataset.inventoryField;


          input.value =
            safeText(
              item?.[
                key
              ]
            );


          input.addEventListener(
            "input",
            () => {

              state.inventory[
                index
              ][key] =
                input.value;


              scheduleAutosave();

              updateProgress();

            }
          );

        }
      );


    $(
      "[data-remove-inventory]",
      wrapper
    )
      ?.addEventListener(
        "click",
        () => {

          state.inventory.splice(
            index,
            1
          );


          renderInventory();

          scheduleAutosave();

          updateProgress();

        }
      );


    return wrapper;

  }


  function renderInventory() {

    const list =
      $("#inventoryList");


    if (
      !list
    ) {

      return;

    }


    list.innerHTML =
      "";


    state.inventory.forEach(
      (
        item,
        index
      ) => {

        list.appendChild(
          createInventoryElement(
            index,
            item
          )
        );

      }
    );


    updateProgress();

  }


  function addInventoryItem() {

    state.inventory.push(
      {

        name: "",

        description: ""

      }
    );


    renderInventory();

    scheduleAutosave();


    const firstEmpty =
      $$(
        "[data-inventory-field]",
        $("#inventoryList")
      )
      .find(
        input =>
          !input.value
      );


    firstEmpty?.focus();

  }


  function bindInventory() {

    $("#addInventoryButton")
      ?.addEventListener(
        "click",
        addInventoryItem
      );

  }


  /* =========================================================
     REVISÃO
  ========================================================= */

  function getRaceName() {

    return (
      RACES.find(
        race =>
          race.id ===
          state.race
      )?.name ||
      "—"
    );

  }


  function getClassName() {

    return (
      CLASSES.find(
        item =>
          item.id ===
          state.class
      )?.name ||
      "—"
    );

  }


  function updateReview() {

    const name =
      $("#reviewName");


    const identity =
      $("#reviewIdentity");


    const race =
      $("#reviewRace");


    const classElement =
      $("#reviewClass");


    const gender =
      $("#reviewGender");


    const mana =
      $("#reviewMana");


    if (
      name
    ) {

      name.textContent =
        state.name.trim() ||
        "Sem nome";

    }


    if (
      identity
    ) {

      const parts =
        [];


      if (
        state.age
      ) {

        parts.push(
          `${state.age} anos`
        );

      }


      if (
        state.gender
      ) {

        parts.push(
          state.gender ===
            "masculino"

            ? "Masculino"

            : "Feminino"

        );

      }


      identity.textContent =
        parts.length

          ? parts.join(
              " · "
            )

          : "Identidade ainda não definida.";

    }


    if (
      race
    ) {

      race.textContent =
        getRaceName();

    }


    if (
      classElement
    ) {

      classElement.textContent =
        getClassName();

    }


    if (
      gender
    ) {

      gender.textContent =
        state.gender ===
          "masculino"

          ? "Masculino"

          : state.gender ===
              "feminino"

            ? "Feminino"

            : "—";

    }


    if (
      mana
    ) {

      mana.textContent =
        "Mana Azul";

    }


    const reviewImage =
      $("#reviewAvatar");


    const fallback =
      $("#reviewAvatarFallback");


    if (
      reviewImage &&
      fallback
    ) {

      if (
        state.avatarDataUrl
      ) {

        reviewImage.src =
          state.avatarDataUrl;


        reviewImage.hidden =
          false;


        fallback.hidden =
          true;

      } else {

        reviewImage.hidden =
          true;


        fallback.hidden =
          false;

      }

    }

  }


  /* =========================================================
     FINALIZAÇÃO
  ========================================================= */

  function validateFinal() {

    if (
      !isIdentityComplete()
    ) {

      showToast(
        "Falta o nome."
      );


      goToStep(
        0
      );


      return false;

    }


    if (
      !isRaceComplete()
    ) {

      showToast(
        "Falta escolher a raça."
      );


      goToStep(
        1
      );


      return false;

    }


    if (
      !isClassComplete()
    ) {

      showToast(
        "Falta escolher a classe."
      );


      goToStep(
        2
      );


      return false;

    }


    if (
      !areAllAttributesAssigned()
    ) {

      showToast(
        `Faltam atributos: ${getAttributeCount()}/8.`
      );


      goToStep(
        3
      );


      return false;

    }


    if (
      !isPowerComplete()
    ) {

      showToast(
        "Falta definir o poder."
      );


      goToStep(
        4
      );


      return false;

    }


    return true;

  }


  async function finishCharacter() {

    if (
      !validateFinal()
    ) {

      return;

    }


    state.updatedAt =
      new Date().toISOString();


    const localSaved =
      saveLocalDraft();


    if (
      !localSaved
    ) {

      showToast(
        "Não foi possível salvar a ficha."
      );


      return;

    }


    const result =
      await saveToSupabase();


    if (
      result.skipped
    ) {

      showToast(
        "Ficha salva como rascunho neste dispositivo."
      );


      return;

    }


    if (
      !result.ok
    ) {

      showToast(
        "Ficha salva localmente."
      );


      return;

    }


    showToast(
      "Ficha criada com sucesso!"
    );

  }


  /* =========================================================
     NAVEGAÇÃO
  ========================================================= */

  function bindNavigation() {

    $("#previousStepButton")
      ?.addEventListener(
        "click",
        () => {

          goToStep(
            state.currentStep -
            1
          );

        }
      );


    $("#nextStepButton")
      ?.addEventListener(
        "click",
        () => {

          if (
            state.currentStep ===
            STEPS.length -
            1
          ) {

            finishCharacter();

            return;

          }


          if (
            !validateBeforeNext()
          ) {

            return;

          }


          goToStep(
            state.currentStep +
            1
          );

        }
      );


    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {

          button.addEventListener(
            "click",
            () => {

              if (
                button.disabled
              ) {

                return;

              }


              goToStep(
                index
              );

            }
          );

        }
      );


    $("#saveDraftButton")
      ?.addEventListener(
        "click",
        () => {

          if (
            saveLocalDraft()
          ) {

            showToast(
              "Rascunho salvo."
            );

          }

        }
      );


    $("#finishCharacterButton")
      ?.addEventListener(
        "click",
        finishCharacter
      );

  }


  /* =========================================================
     EVENTOS GERAIS
  ========================================================= */

  function bindGeneralEvents() {

    window.addEventListener(
      "beforeunload",
      () => {

        saveLocalDraft();

      }
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.visibilityState ===
          "hidden"
        ) {

          saveLocalDraft();

        }

      }
    );

  }


  /* =========================================================
     ATUALIZA ESTADO + INTERFACE
  ========================================================= */

  function updateStateAndRender() {

    scheduleAutosave();

    renderRace();

    renderClasses();

    renderAttributes();

    renderPower();

    renderMana();

    updateReview();

    updateProgress();

  }


  /* =========================================================
     INICIALIZAÇÃO
  ========================================================= */

  function init() {

    if (
      initialized
    ) {

      return;

    }


    initialized =
      true;


    const restored =
      loadLocalDraft();


    bindIdentity();

    bindRace();

    bindClasses();

    bindAttributes();

    bindPower();

    bindMana();

    bindTechniques();

    bindInventory();

    bindNavigation();

    bindGeneralEvents();


    hydrateIdentity();


    renderRace();

    renderClasses();

    renderAttributes();

    renderPower();

    renderMana();

    renderTechniques();

    renderInventory();

    updateReview();

    updateProgress();


    /*
     * Não deixa abrir uma etapa que perdeu
     * seus pré-requisitos.
     */
    if (
      !canEnterStep(
        state.currentStep
      )
    ) {

      state.currentStep =
        0;

    }


    goToStep(
      state.currentStep
    );


    if (
      restored
    ) {

      showToast(
        "Rascunho anterior restaurado.",
        1800
      );

    }


    console.info(
      "[AERION][FICHA] Inicializado.",
      {

        restored,

        races:
          RACES.length,

        classes:
          CLASSES.length,

        attributeDice:
          DICE_LIMITS,

        attributes:
          getAttributeCount()

      }
    );

  }


  /* =========================================================
     API PÚBLICA
  ========================================================= */

  window.AERIONFicha =
    Object.freeze({

      getState() {

        try {

          return structuredClone(
            state
          );

        } catch {

          return JSON.parse(
            JSON.stringify(
              state
            )
          );

        }

      },


      saveDraft:
        saveLocalDraft,


      goToStep,


      getDiceUsage:
        () =>
          ({
            ...getDiceUsage()
          }),


      getRemainingDice,


      selectDice,


      assignDice:
        assignSelectedDice,


      clearAttribute,


      swapAttributes,


      areAllAttributesAssigned,


      getAttributeCount,


      rollPowerD100,


      selectPower:
        selectManualPower

    });


  /* =========================================================
     INICIAR
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

