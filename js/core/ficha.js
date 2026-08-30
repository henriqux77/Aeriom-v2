/* =========================================================
   AERION — CRIAÇÃO DE FICHA
   js/core/ficha.js

   Versão atualizada:
   - Salvamento automático local
   - Restauração de rascunho
   - Identidade
   - Gênero
   - Upload / preview de imagem
   - Carrossel de raças
   - Seleção de classes
   - Distribuição correta dos dados dos atributos
   - Gráfico de características
   - Mana Azul
   - Técnicas
   - Inventário
   - Revisão
   - Navegação entre etapas
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURAÇÃO
  ========================================================= */

  const CONFIG = {
    draftKey: "aerion:ficha:draft:v2",
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
     DISTRIBUIÇÃO OFICIAL DOS DADOS
     
     Livro I:
     D4  ×1
     D6  ×2
     D8  ×1
     D10 ×1
     D12 ×1
     D20 ×2
     
     Total = 8 dados
     Total = 8 atributos
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
     RAÇAS
     
     Povo das Nuvens / Aureano continua fora
     conforme a decisão atual do projeto.
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
        "Elfos possuem uma aparência característica e uma forte ligação com Mana e fenômenos mágicos."
    },

    {
      id: "anao",
      name: "Anão",

      maleImage:
        "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",

      femaleImage:
        "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png",

      description:
        "Anões possuem constituição robusta e grande tradição ligada a materiais, estruturas e forja."
    },

    {
      id: "orc",
      name: "Orc",

      maleImage:
        "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",

      femaleImage:
        "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png",

      description:
        "Orcs apresentam presença física marcante e uma forte identidade guerreira."
    },

    {
      id: "centauro",
      name: "Centauro",

      maleImage:
        "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",

      femaleImage:
        "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png",

      description:
        "Centauros possuem anatomia humanoide e equina, com grande mobilidade terrestre."
    },

    {
      id: "vampiro",
      name: "Vampiro",

      maleImage:
        "https://i.ibb.co/PGFcNRXZ/file-0000000019dc820ea49a893a9831ffeb.png",

      femaleImage:
        "https://i.ibb.co/Kpx8jh0j/file-000000008cfc820e827a7b8376d3fd55.png",

      description:
        "Vampiros possuem características sobrenaturais e identidade visual própria."
    },

    {
      id: "duende",
      name: "Duende",

      maleImage:
        "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",

      femaleImage:
        "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png",

      description:
        "Duendes são pequenos, inteligentes e muito ligados ao comércio, contratos e finanças."
    },

    {
      id: "fada",
      name: "Fada",

      maleImage:
        "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",

      femaleImage:
        "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png",

      description:
        "Fadas possuem uma identidade fantástica e uma forte conexão com Mana."
    },

    {
      id: "povo_aquatico",
      name: "Povo Aquático",

      maleImage:
        "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png",

      femaleImage:
        "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png",

      description:
        "O Povo Aquático possui adaptações naturais para viver dentro e fora da água."
    },

    {
      id: "animalha_felino",
      name: "Animalha — Felino",

      maleImage:
        "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",

      femaleImage:
        "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea284e54236c00052.png",

      description:
        "Animalhas felinas possuem características animais integradas naturalmente ao corpo."
    },

    {
      id: "povo_natureza",
      name: "Povo da Natureza",

      maleImage:
        "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",

      femaleImage:
        "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",

      description:
        "O Povo da Natureza possui forte vínculo com ambientes naturais, plantas e animais."
    },

    {
      id: "neraliano",
      name: "Neraliano",

      maleImage:
        "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",

      femaleImage:
        "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png",

      description:
        "Neralianos possuem adaptações naturais relacionadas à água, profundidade e percepção de vibrações."
    }
  ];


  /* =========================================================
     CLASSES
     
     Bônus oficiais presentes no Livro I:
     Feiticeiro +5
     Guerreiro +1
     Curandeiro +2
     Monge +7
  ========================================================= */

  const CLASSES = [
    {
      id: "guerreiro",
      name: "Guerreiro",
      role: "Combatente",
      bonus: "+1",
      description:
        "Armas e combate.",
      image:
        "https://i.ibb.co/Z12VGcdj/file-00000000f884820ea169d455610bbb08.png"
    },

    {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",
      bonus: "+5",
      description:
        "Especialista em técnicas e Mana.",
      image:
        "https://i.ibb.co/pBsLK1dG/file-000000004438820eb1451ab0c303400a.png"
    },

    {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",
      bonus: "+2",
      description:
        "Cura, proteção e utilidade.",
      image:
        "https://i.ibb.co/MkV7gWRh/file-000000008180820e865940e8302d66ee.png"
    },

    {
      id: "monge",
      name: "Monge",
      role: "Marcial",
      bonus: "+7",
      description:
        "Mana corporal para força, defesa, movimento e objetos simples.",
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
    forca: "Potência física.",
    vigor: "Resistência.",
    controle: "Controle de Mana.",
    precisao: "Mira e precisão.",
    presenca: "Influência e interação.",
    agilidade: "Reflexos e movimento.",
    intelecto: "Conhecimento e raciocínio.",
    percepcao: "Ambiente e detalhes."
  });


  /* =========================================================
     ESTADO PADRÃO
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
  ) => {

    return root.querySelector(
      selector
    );

  };


  const $$ = (
    selector,
    root = document
  ) => {

    return Array.from(
      root.querySelectorAll(
        selector
      )
    );

  };


  /* =========================================================
     UTILITÁRIOS
  ========================================================= */

  function safeText(
    value
  ) {

    return value === null ||
      value === undefined

      ? ""

      : String(
          value
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


  function showToast(
    message,
    duration = 2400
  ) {

    const toast =
      $("#toast");


    if (
      !toast
    ) {

      return;

    }


    toast.textContent =
      safeText(
        message
      );


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
     NORMALIZAÇÃO DO ESTADO
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

      attributes: {

        ...base.attributes,

        ...(
          raw.attributes &&
          typeof raw.attributes ===
            "object"

            ? raw.attributes

            : {}

        )

      },

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


    if (
      !CLASSES.some(
        item =>
          item.id ===
          merged.class
      )
    ) {

      merged.class =
        "";

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
     * Regra atual:
     * somente Mana Azul é permitida na ficha-base.
     */
    merged.mana =
      "azul";


    /*
     * Corrige dados inválidos antigos.
     * Também garante que apenas os dados permitidos
     * existam nos atributos.
     */
    merged.attributes =
      normalizeAttributes(
        merged.attributes
      );


    return merged;

  }


  function normalizeAttributes(
    attributes
  ) {

    const output = {

      forca:
        null,

      vigor:
        null,

      controle:
        null,

      precisao:
        null,

      presenca:
        null,

      agilidade:
        null,

      intelecto:
        null,

      percepcao:
        null

    };


    if (
      !attributes ||
      typeof attributes !==
      "object"
    ) {

      return output;

    }


    /*
     * Reconstrói respeitando os limites.
     *
     * Isso também protege a aplicação caso um rascunho
     * antigo tenha valores inválidos.
     */
    const used =
      {
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

          const raw =
            safeText(
              attributes[
                attribute
              ]
            )
            .toLowerCase();


          if (
            !Object.prototype.hasOwnProperty.call(
              DICE_LIMITS,
              raw
            )
          ) {

            output[
              attribute
            ] =
              null;

            return;

          }


          if (
            used[
              raw
            ] >=
            DICE_LIMITS[
              raw
            ]
          ) {

            output[
              attribute
            ] =
              null;

            return;

          }


          output[
            attribute
          ] =
            raw;


          used[
            raw
          ]++;

        }
      );


    return output;

  }


  /* =========================================================
     CONTAGEM DOS DADOS
  ========================================================= */

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


    const max =
      DICE_LIMITS[
        normalized
      ] || 0;


    const usage =
      getDiceUsage();


    return Math.max(
      0,
      max -
      (
        usage[
          normalized
        ] || 0
      )
    );

  }


  function getAttributeCount() {

    return Object.values(
      state.attributes
    )
      .filter(
        Boolean
      )
      .length;

  }


  function areAllAttributesAssigned() {

    return (
      getAttributeCount() ===
      Object.keys(
        ATTRIBUTE_NAMES
      ).length
    );

  }


  /* =========================================================
     RASCUNHO
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
            technique =>
              ({
                ...technique
              })
          ),

        inventory:
          state.inventory.map(
            item =>
              ({
                ...item
              })
          ),

        /*
         * Imagens muito grandes não devem
         * explodir o localStorage.
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
        "[AERION][FICHA] Erro ao salvar rascunho:",
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
        () => {

          saveLocalDraft();

        },
        CONFIG.autosaveDelay
      );

  }


  function updateState(
    partial
  ) {

    state = {

      ...state,

      ...partial

    };


    scheduleAutosave();

    updateProgress();

    updateReview();

  }


  /* =========================================================
     SUPABASE
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


  /*
   * Ainda não executa INSERT/UPDATE definitivo.
   *
   * Isso é intencional: a arquitetura de ficha-base
   * e instância de campanha precisa permanecer separada.
   */
  async function saveToSupabase() {

    const client =
      getSupabaseClient();


    if (
      !client
    ) {

      return {

        ok: false,

        skipped: true,

        reason:
          "Supabase não configurado."

      };

    }


    return {

      ok: false,

      skipped: true,

      reason:
        "Persistência definitiva da ficha ainda não ligada."

    };

  }


  /* =========================================================
     PROGRESSO
  ========================================================= */

  function getStepCompletion(
    stepId
  ) {

    switch (
      stepId
    ) {

      case "identity":

        return Boolean(
          state.name.trim()
        );


      case "race":

        return Boolean(
          state.race
        );


      case "class":

        return Boolean(
          state.class
        );


      case "attributes":

        return areAllAttributesAssigned();


      case "power":

        return Boolean(
          state.power.trim()
        );


      case "mana":

        return state.mana ===
          "azul";


      case "skills":

        return (
          state.skills.length >
          0
        );


      case "techniques":

        return (
          state.techniques.length >
          0
        );


      case "inventory":

        return (
          state.inventory.length >
          0
        );


      case "review":

        return isMinimumCharacterReady();


      default:

        return false;

    }

  }


  function getProgressPercent() {

    let completed =
      0;


    STEPS.forEach(
      step => {

        if (
          getStepCompletion(
            step.id
          )
        ) {

          completed++;

        }

      }
    );


    return Math.round(
      (
        completed /
        STEPS.length
      ) *
      100
    );

  }


  function updateProgress() {

    const currentIndex =
      state.currentStep;


    /*
     * A barra mostra progresso de etapas concluídas,
     * enquanto o contador continua indicando a etapa atual.
     */
    const percent =
      getProgressPercent();


    const fill =
      $("#progressFill");


    const percentElement =
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
      percentElement
    ) {

      percentElement.textContent =
        `${percent}%`;

    }


    if (
      title
    ) {

      title.textContent =
        STEPS[
          currentIndex
        ]?.title ||
        "Identidade";

    }


    if (
      counter
    ) {

      counter.textContent =
        `${currentIndex + 1} de ${STEPS.length}`;

    }


    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {

          const isCurrent =
            index ===
            currentIndex;


          const isComplete =
            index <
            currentIndex &&
            getStepCompletion(
              STEPS[index].id
            );


          button.classList.toggle(
            "is-active",
            isCurrent
          );


          button.classList.toggle(
            "is-complete",
            isComplete
          );


          /*
           * O histórico anterior pode ser revisitado.
           * A próxima etapa só abre quando seus pré-requisitos
           * estiverem cumpridos.
           */
          button.disabled =
            index >
              currentIndex &&
            !canEnterStep(
              index
            );

        }
      );


    const previous =
      $("#previousStepButton");


    if (
      previous
    ) {

      previous.disabled =
        currentIndex ===
        0;

    }


    const next =
      $("#nextStepButton");


    if (
      next
    ) {

      if (
        currentIndex ===
        STEPS.length - 1
      ) {

        next.textContent =
          "Finalizar →";

      } else {

        next.textContent =
          "Próximo →";

      }

    }

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


    /*
     * Raça só depois da identidade.
     */
    if (
      index >=
        1 &&
      !state.name.trim()
    ) {

      return false;

    }


    /*
     * Classe só depois da raça.
     */
    if (
      index >=
        2 &&
      !state.race
    ) {

      return false;

    }


    /*
     * Atributos só depois da classe.
     */
    if (
      index >=
        3 &&
      !state.class
    ) {

      return false;

    }


    /*
     * Poder só depois de 8/8 atributos.
     */
    if (
      index >=
        4 &&
      !areAllAttributesAssigned()
    ) {

      return false;

    }


    /*
     * Mana só depois de poder.
     *
     * O poder pode ficar temporariamente vazio durante a
     * montagem do sistema, mas para liberar a etapa seguinte
     * exigimos o preenchimento.
     */
    if (
      index >=
        5 &&
      !state.power.trim()
    ) {

      return false;

    }


    return true;

  }


  function goToStep(
    index
  ) {

    const safeIndex =
      clamp(
        Number(index) || 0,
        0,
        STEPS.length - 1
      );


    /*
     * Permite voltar normalmente.
     */
    if (
      safeIndex >
      state.currentStep &&
      !canEnterStep(
        safeIndex
      )
    ) {

      validateBeforeNext();

      return false;

    }


    state.currentStep =
      safeIndex;


    $$(".creation-panel")
      .forEach(
        panel => {

          const active =
            panel.dataset.panel ===
            STEPS[
              safeIndex
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


    const activeButton =
      $(
        `.creation-step[data-step="${STEPS[safeIndex].id}"]`
      );


    activeButton?.scrollIntoView(
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
        top: 0,
        behavior: "smooth"
      }
    );


    if (
      safeIndex ===
      1
    ) {

      renderRace();

    }


    if (
      safeIndex ===
      2
    ) {

      renderClass();

    }


    if (
      safeIndex ===
      3
    ) {

      renderAttributes();

    }


    if (
      safeIndex ===
      5
    ) {

      renderMana();

    }


    if (
      safeIndex ===
      7
    ) {

      renderTechniques();

    }


    if (
      safeIndex ===
      8
    ) {

      renderInventory();

    }


    if (
      safeIndex ===
      9
    ) {

      updateReview();

    }


    scheduleAutosave();


    return true;

  }


  function validateBeforeNext() {

    if (
      !state.name.trim()
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
      !state.race
    ) {

      showToast(
        "Escolha uma raça antes de continuar."
      );


      goToStep(
        1
      );


      return false;

    }


    if (
      !state.class
    ) {

      showToast(
        "Escolha uma classe antes de continuar."
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
        `Preencha os 8 atributos. Atualmente: ${getAttributeCount()}/8.`
      );


      goToStep(
        3
      );


      return false;

    }


    if (
      !state.power.trim()
    ) {

      showToast(
        "Defina o poder antes de continuar."
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


          const error =
            $("#nameError");


          if (
            error
          ) {

            error.hidden =
              true;

          }


          updateState(
            {
              name:
                state.name
            }
          );

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


          updateState(
            {
              age:
                state.age
            }
          );

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


          updateState(
            {
              description:
                state.description
            }
          );

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


          updateState(
            {
              power:
                state.power
            }
          );

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


          updateState(
            {
              origin:
                state.origin
            }
          );

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


              updateState(
                {
                  gender:
                    state.gender
                }
              );


              renderRace();

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


          updateState(
            {

              avatarDataUrl:
                "",

              avatarFileName:
                ""

            }
          );

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
          "Não foi possível ler a imagem."
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

      image.removeAttribute(
        "src"
      );


      image.hidden =
        true;


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


        button.setAttribute(
          "aria-current",
          index ===
            state.raceIndex
            ? "true"
            : "false"
        );


        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();


            state.raceIndex =
              index;


            renderRace();

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


    const short =
      $("#raceShortDescription");


    const selectedText =
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


      image.onerror =
        () => {

          image.removeAttribute(
            "src"
          );


          image.alt =
            `${race.name} — imagem indisponível`;

        };

    }


    if (
      name
    ) {

      name.textContent =
        race.name;

    }


    if (
      short
    ) {

      short.textContent =
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
      selectedText
    ) {

      selectedText.textContent =
        state.race ===
        race.id

          ? "✓ Selecionada"

          : "Selecionar raça";

    }


    renderRaceDots();

  }


  function selectCurrentRace() {

    const race =
      getCurrentRace();


    if (
      !race
    ) {

      return;

    }


    state.race =
      race.id;


    updateState(
      {

        race:
          race.id,

        raceIndex:
          state.raceIndex

      }
    );


    renderRace();


    showToast(
      `${race.name} selecionada.`
    );

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


    const modalName =
      $("#modalRaceName");


    const modalDescription =
      $("#modalRaceDescription");


    if (
      modalName
    ) {

      modalName.textContent =
        race.name;

    }


    if (
      modalDescription
    ) {

      modalDescription.textContent =
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


    /*
     * No card da raça, clicar no indicador seleciona.
     * Clicar na área principal abre a descrição.
     */
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


    $("#raceCard")
      ?.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {

            event.preventDefault();

            openRaceModal();

          }

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

  function renderClass() {

    $$(".class-card")
      .forEach(
        card => {

          const classId =
            safeText(
              card.dataset.class
            )
            .toLowerCase();


          const selected =
            classId ===
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


    /*
     * Se a estrutura antiga do HTML ainda estiver usando
     * imagens/classes dentro do card, não tentamos reconstruí-la.
     * O data-class continua sendo a fonte principal.
     */
    $$(".class-card img")
      .forEach(
        image => {

          const card =
            image.closest(
              ".class-card"
            );


          if (
            !card
          ) {

            return;

          }


          const classId =
            card.dataset.class;


          const classData =
            CLASSES.find(
              item =>
                item.id ===
                classId
            );


          if (
            !classData
          ) {

            return;

          }


          /*
           * Só substitui a imagem se o HTML não tiver
           * uma URL explícita diferente.
           */
          if (
            !image.getAttribute(
              "src"
            ) ||
            image.getAttribute(
              "src"
            ) ===
              ""
          ) {

            image.src =
              classData.image;

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

      console.warn(
        "[AERION][FICHA] Classe desconhecida:",
        classId
      );


      return false;

    }


    state.class =
      classData.id;


    updateState(
      {
        class:
          classData.id
      }
    );


    renderClass();


    showToast(
      `${classData.name} selecionado.`
    );


    return true;

  }


  function bindClasses() {

    /*
     * O listener fica no document para funcionar tanto
     * com o HTML novo quanto com cards antigos que possuam
     * data-class.
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


        /*
         * Botões internos continuam podendo funcionar
         * normalmente, mas o card inteiro seleciona.
         */
        if (
          event.target.closest(
            "a"
          )
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

  }

  /* =========================================================
     ATRIBUTOS
  ========================================================= */

  function updateDiceUI() {

    const usage =
      getDiceUsage();


    $$(".dice-card[data-die]")
      .forEach(
        card => {

          const die =
            safeText(
              card.dataset.die
            )
            .toLowerCase();


          const max =
            DICE_LIMITS[
              die
            ] || 0;


          const used =
            usage[
              die
            ] || 0;


          const remaining =
            Math.max(
              0,
              max -
              used
            );


          const remainingElement =
            card.querySelector(
              ".dice-remaining"
            );


          if (
            remainingElement
          ) {

            if (
              remaining ===
              1
            ) {

              remainingElement.textContent =
                "1 disponível";

            } else {

              remainingElement.textContent =
                `${remaining} disponíveis`;

            }

          }


          const exhausted =
            remaining <=
            0;


          card.classList.toggle(
            "is-exhausted",
            exhausted
          );


          card.setAttribute(
            "aria-disabled",
            String(
              exhausted
            )
          );


          card.disabled =
            exhausted;


          card.title =
            exhausted

              ? `${die.toUpperCase()} esgotado`

              : `${remaining} ${die.toUpperCase()} disponível(is)`;

        }
      );


    /*
     * Se algum dado estiver atualmente selecionado,
     * mantém selecionável apenas quando ainda houver
     * disponibilidade.
     */
    if (
      selectedDice &&
      getRemainingDice(
        selectedDice
      ) <=
      0
    ) {

      selectedDice =
        null;

    }


    $$(".dice-card")
      .forEach(
        card => {

          card.classList.toggle(
            "is-selected",
            safeText(
              card.dataset.die
            )
            .toLowerCase() ===
            selectedDice
          );

        }
      );

  }


  function renderAttributes() {

    updateDiceUI();


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


            slot.setAttribute(
              "aria-label",
              `${ATTRIBUTE_NAMES[attribute]} usando ${die.toUpperCase()}`
            );

          } else {

            slot.textContent =
              "Selecionar dado";


            slot.classList.remove(
              "is-filled"
            );


            slot.removeAttribute(
              "aria-label"
            );

          }

        }
      );


    updateAttributeCountUI();


    renderAttributeChart();

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


      indicator.style.margin =
        "0 0 12px";


      indicator.style.color =
        "var(--muted)";


      indicator.style.fontSize =
        "12px";


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
        `${normalized.toUpperCase()} já atingiu o limite permitido.`
      );


      selectedDice =
        null;


      updateDiceUI();


      return false;

    }


    selectedDice =
      normalized;


    updateDiceUI();


    showToast(
      `${normalized.toUpperCase()} selecionado. Agora escolha o atributo.`
    );


    return true;

  }


  function assignSelectedDiceToAttribute(
    attribute
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        attribute
      )
    ) {

      return false;

    }


    if (
      !selectedDice
    ) {

      showToast(
        "Escolha um dado primeiro."
      );


      return false;

    }


    const currentDie =
      state.attributes[
        attribute
      ];


    /*
     * Se o atributo já possui exatamente esse dado,
     * não há consumo adicional.
     */
    if (
      currentDie ===
      selectedDice
    ) {

      selectedDice =
        null;


      updateDiceUI();


      return true;

    }


    /*
     * Se o atributo já possuía outro dado,
     * esse dado volta ao estoque antes da nova atribuição.
     */
    if (
      currentDie
    ) {

      /*
       * Como getRemainingDice conta o estado atual,
       * precisamos temporariamente remover o dado antigo.
       */
      state.attributes[
        attribute
      ] =
        null;

    }


    /*
     * Agora checamos o novo dado com o atributo antigo
     * já liberado.
     */
    const remaining =
      getRemainingDice(
        selectedDice
      );


    if (
      remaining <=
      0
    ) {

      /*
       * Restaura o valor antigo se não houver espaço.
       */
      state.attributes[
        attribute
      ] =
        currentDie;


      showToast(
        `${selectedDice.toUpperCase()} já está esgotado.`
      );


      updateDiceUI();


      return false;

    }


    state.attributes[
      attribute
    ] =
      selectedDice;


    const assigned =
      selectedDice;


    selectedDice =
      null;


    updateState(
      {
        attributes:
          {
            ...state.attributes
          }
      }
    );


    renderAttributes();


    showToast(
      `${assigned.toUpperCase()} colocado em ${ATTRIBUTE_NAMES[attribute]}.`
    );


    return true;

  }


  function clearAttribute(
    attribute
  ) {

    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        attribute
      )
    ) {

      return;

    }


    const current =
      state.attributes[
        attribute
      ];


    if (
      !current
    ) {

      return;

    }


    state.attributes[
      attribute
    ] =
      null;


    updateState(
      {
        attributes:
          {
            ...state.attributes
          }
      }
    );


    renderAttributes();


    showToast(
      `${current.toUpperCase()} devolvido aos dados disponíveis.`
    );

  }


  function bindAttributes() {

    /*
     * NÃO usa apenas querySelectorAll fixo para os dados.
     * O listener delegado funciona mesmo depois de a UI
     * ser redesenhada.
     */
    document.addEventListener(
      "click",
      event => {

        const diceCard =
          event.target.closest(
            ".dice-card[data-die]"
          );


        if (
          diceCard
        ) {

          const die =
            safeText(
              diceCard.dataset.die
            )
            .toLowerCase();


          /*
           * Atualiza a disponibilidade em tempo real.
           */
          if (
            getRemainingDice(
              die
            ) <=
            0
          ) {

            event.preventDefault();
            event.stopPropagation();


            showToast(
              `${die.toUpperCase()} já foi usado o número máximo de vezes.`
            );


            updateDiceUI();


            return;

          }


          selectDice(
            die
          );


          return;

        }


        const attributeSlot =
          event.target.closest(
            ".attribute-slot[data-attribute-slot]"
          );


        if (
          attributeSlot
        ) {

          assignSelectedDiceToAttribute(
            attributeSlot.dataset.attributeSlot
          );

          return;

        }

      },
      true
    );


    /*
     * Clique secundário em um atributo preenchido:
     * remove o dado e devolve ao estoque.
     *
     * Útil no celular: toque normal continua atribuindo.
     * Para remover, o JS também expõe clearAttribute().
     */
    document.addEventListener(
      "dblclick",
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


        const attribute =
          slot.dataset.attributeSlot;


        if (
          state.attributes[
            attribute
          ]
        ) {

          clearAttribute(
            attribute
          );

        }

      }
    );

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

            const sides =
              die

                ? Number(
                    safeText(
                      die
                    )
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

              sides

            };

          }
        );


    const hasValues =
      values.some(
        item =>
          item.sides >
          0
      );


    if (
      !hasValues
    ) {

      container.innerHTML =
        `
        <div class="chart-placeholder">
          O gráfico aparecerá conforme os atributos forem definidos.
        </div>
        `;


      return;

    }


    /*
     * Este é o gráfico provisório da primeira implementação.
     *
     * Ele representa visualmente a força relativa de cada
     * atributo e pode ser trocado pelo radar de 8 pontas
     * quando refinarmos a interface.
     */
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
          "95px 1fr 48px";


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


        label.style.fontSize =
          "12px";


        label.style.color =
          "#bdb7ac";


        const track =
          document.createElement(
            "div"
          );


        track.style.height =
          "8px";


        track.style.borderRadius =
          "999px";


        track.style.overflow =
          "hidden";


        track.style.background =
          "rgba(255,255,255,.07)";


        const bar =
          document.createElement(
            "div"
          );


        const percentage =
          item.sides
            ? (
                item.sides /
                20
              ) *
              100
            : 0;


        bar.style.width =
          `${Math.min(
            100,
            percentage
          )}%`;


        bar.style.height =
          "100%";


        bar.style.background =
          "linear-gradient(90deg,#a47d29,#edd58d)";


        bar.style.borderRadius =
          "inherit";


        bar.style.transition =
          "width .3s ease";


        track.appendChild(
          bar
        );


        const value =
          document.createElement(
            "strong"
          );


        value.textContent =
          item.sides
            ? `D${item.sides}`
            : "—";


        value.style.textAlign =
          "right";


        value.style.color =
          item.sides

            ? "var(--gold-soft)"

            : "#67635c";


        value.style.fontFamily =
          "Georgia, serif";


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

  /* =========================================================
     MANA
  ========================================================= */

  function renderMana() {

    $$(".mana-card")
      .forEach(
        card => {

          const selected =
            card.dataset.mana ===
            "azul";


          card.classList.toggle(
            "is-selected",
            selected
          );


          if (
            card.dataset.mana !==
            "azul"
          ) {

            card.disabled =
              true;

          }

        }
      );

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


        if (
          card.dataset.mana !==
          "azul"
        ) {

          return;

        }


        state.mana =
          "azul";


        updateState(
          {
            mana:
              "azul"
          }
        );


        renderMana();

        showToast(
          "Mana Azul selecionada."
        );

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
      <div style="
        display:grid;
        gap:12px;
        text-align:left;
      ">

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


        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
        ">

          <label class="field">

            <span class="field-label">
              Alcance
            </span>

            <input
              type="text"
              data-technique-field="range"
              maxlength="80"
              placeholder="Ex.: 10 m"
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
              placeholder="Ex.: 1D8"
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
            placeholder="Custo da técnica"
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
            placeholder="Limitações da técnica"
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

              if (
                !state.techniques[
                  index
                ]
              ) {

                return;

              }


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

  }


  function addTechnique() {

    state.techniques.push(
      {

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

      }
    );


    renderTechniques();


    scheduleAutosave();


    updateProgress();


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
      <div style="
        display:grid;
        gap:12px;
        text-align:left;
      ">

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
            placeholder="Descrição do item"
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

              if (
                !state.inventory[
                  index
                ]
              ) {

                return;

              }


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

  }


  function addInventoryItem() {

    state.inventory.push(
      {

        name:
          "",

        description:
          ""

      }
    );


    renderInventory();


    scheduleAutosave();


    updateProgress();


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


  function isMinimumCharacterReady() {

    return Boolean(
      state.name.trim() &&
      state.race &&
      state.class &&
      areAllAttributesAssigned() &&
      state.power.trim() &&
      state.mana ===
        "azul"
    );

  }


  function updateReview() {

    const reviewName =
      $("#reviewName");


    const reviewIdentity =
      $("#reviewIdentity");


    const reviewRace =
      $("#reviewRace");


    const reviewClass =
      $("#reviewClass");


    const reviewMana =
      $("#reviewMana");


    const reviewGender =
      $("#reviewGender");


    if (
      reviewName
    ) {

      reviewName.textContent =
        state.name.trim() ||
        "Sem nome";

    }


    if (
      reviewIdentity
    ) {

      const pieces =
        [];


      if (
        state.age
      ) {

        pieces.push(
          `${state.age} anos`
        );

      }


      if (
        state.gender
      ) {

        pieces.push(
          state.gender ===
            "masculino"

            ? "Masculino"

            : "Feminino"
        );

      }


      reviewIdentity.textContent =
        pieces.length

          ? pieces.join(
              " · "
            )

          : "Identidade ainda não definida.";

    }


    if (
      reviewRace
    ) {

      reviewRace.textContent =
        getRaceName();

    }


    if (
      reviewClass
    ) {

      reviewClass.textContent =
        getClassName();

    }


    if (
      reviewMana
    ) {

      reviewMana.textContent =
        "Mana Azul";

    }


    if (
      reviewGender
    ) {

      reviewGender.textContent =
        state.gender ===
          "masculino"

          ? "Masculino"

          : state.gender ===
              "feminino"

            ? "Feminino"

            : "—";

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
      !state.name.trim()
    ) {

      showToast(
        "Falta o nome do aventureiro."
      );


      goToStep(
        0
      );


      return false;

    }


    if (
      !state.race
    ) {

      showToast(
        "Falta escolher uma raça."
      );


      goToStep(
        1
      );


      return false;

    }


    if (
      !state.class
    ) {

      showToast(
        "Falta escolher uma classe."
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
      !state.power.trim()
    ) {

      showToast(
        "Defina o poder do personagem."
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
        "Ficha salva localmente; banco ainda não atualizado."
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


    /*
     * IMPORTANTE:
     * Um rascunho antigo pode ter uma etapa de atributos
     * incompleta. Nesse caso, não permitimos que ele pule
     * para uma etapa inválida.
     */
    if (
      !canEnterStep(
        state.currentStep
      )
    ) {

      state.currentStep =
        0;

    }


    bindIdentity();

    bindRace();

    bindClasses();

    bindAttributes();

    bindMana();

    bindTechniques();

    bindInventory();

    bindNavigation();

    bindGeneralEvents();


    hydrateIdentity();


    renderRace();

    renderClass();

    renderAttributes();

    renderMana();

    renderTechniques();

    renderInventory();

    updateReview();

    updateProgress();


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
      "[AERION][FICHA] módulo iniciado.",
      {

        restored,

        races:
          RACES.length,

        classes:
          CLASSES.length,

        diceLimits:
          {
            ...DICE_LIMITS
          },

        attributes:
          getAttributeCount(),

        supabaseConfigured:
          Boolean(
            CONFIG.supabaseUrl &&
            CONFIG.supabaseAnonKey
          )

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


      assignDice(
        attribute,
        die
      ) {

        if (
          die !==
          undefined &&
          die !==
          null
        ) {

          if (
            !selectDice(
              die
            )
          ) {

            return false;

          }

        }


        return assignSelectedDiceToAttribute(
          attribute
        );

      },


      clearAttribute,


      areAllAttributesAssigned,

      getAttributeCount

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