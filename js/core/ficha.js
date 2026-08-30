/* =========================================================
   AERION — FICHA
   ficha.js
   Lógica da tela de criação de ficha.

   IMPORTANTE:
   - Este arquivo não altera o banco sozinho sem configuração.
   - Se AERION_SUPABASE_URL / AERION_SUPABASE_ANON_KEY não
     estiverem disponíveis, o rascunho continua funcionando
     localmente.
   - Quando a estrutura definitiva do banco estiver confirmada,
     a função saveToSupabase pode ser ligada à tabela final.
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURAÇÃO
  ========================================================= */

  const CONFIG = {
    draftKey: "aerion:ficha:draft:v1",

    // Pode ser sobrescrito antes deste script:
    // window.AERION_CONFIG = {
    //   supabaseUrl: "...",
    //   supabaseAnonKey: "..."
    // };
    supabaseUrl:
      window.AERION_CONFIG?.supabaseUrl ||
      document.querySelector('meta[name="aerion-supabase-url"]')?.content ||
      "",

    supabaseAnonKey:
      window.AERION_CONFIG?.supabaseAnonKey ||
      document.querySelector('meta[name="aerion-supabase-anon-key"]')?.content ||
      "",

    autosaveDelay: 700
  };

  const STEPS = [
    { id: "identity", title: "Identidade" },
    { id: "race", title: "Raça" },
    { id: "class", title: "Classe" },
    { id: "attributes", title: "Atributos" },
    { id: "power", title: "Poder" },
    { id: "mana", title: "Mana" },
    { id: "skills", title: "Perícias" },
    { id: "techniques", title: "Técnicas" },
    { id: "inventory", title: "Inventário" },
    { id: "review", title: "Revisão" }
  ];

  /*
   * Catálogo inicial de raças.
   *
   * Povo das Nuvens / Aureano ainda NÃO entra aqui,
   * conforme decidido no projeto.
   */
  const RACES = [
    {
      id: "humano",
      name: "Humano",
      maleImage:
        "https://i.ibb.co/TBNmfF0S/file-000000008b74820ea8b432fcf06ed975.png",
      femaleImage:
        "https://i.ibb.co/LdmxJ2h9/file-000000004b94820ead12a26ca92d75b7.png",
      description:
        "Humanos são uma das raças clássicas de AERION, adaptáveis e presentes em diferentes regiões do mundo."
    },

    {
      id: "elfo",
      name: "Elfo",
      maleImage:
        "https://i.ibb.co/0y8WXSr8/file-00000000495c820e99fc5de509918d90.png",
      femaleImage:
        "https://i.ibb.co/F1DCc3j/file-00000000dcf8820e883635d6ca9de492.png",
      description:
        "Elfos possuem uma aparência distinta e uma forte identidade ligada à fantasia de AERION."
    },

    {
      id: "anao",
      name: "Anão",
      maleImage:
        "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",
      femaleImage:
        "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png",
      description:
        "Anões apresentam uma constituição robusta e uma identidade própria dentro do mundo de AERION."
    },

    {
      id: "orc",
      name: "Orc",
      maleImage:
        "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",
      femaleImage:
        "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png",
      description:
        "Orcs possuem características físicas marcantes e uma presença facilmente reconhecível."
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
        "Vampiros possuem uma identidade visual própria, associada à sua natureza sobrenatural."
    },

    {
      id: "duende",
      name: "Duende",
      maleImage:
        "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",
      femaleImage:
        "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png",
      description:
        "Duendes apresentam pele esverdeada, orelhas grandes e aparência mais primitiva."
    },

    {
      id: "fada",
      name: "Fada",
      maleImage:
        "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",
      femaleImage:
        "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png",
      description:
        "Fadas possuem uma identidade leve e fantástica, mantendo o estilo visual estabelecido para AERION."
    },

    {
      id: "povo_aquatico",
      name: "Povo Aquático",
      maleImage:
        "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png",
      femaleImage:
        "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png",
      description:
        "O Povo Aquático possui características físicas claramente adaptadas ao ambiente aquático."
    },

    {
      id: "animalha_felino",
      name: "Animalha — Felino",
      maleImage:
        "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",
      femaleImage:
        "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea284e54236c00052.png",
      description:
        "Esta é a linhagem felina das Animalhas, com características animais integradas naturalmente à anatomia."
    },

    {
      id: "povo_natureza",
      name: "Povo da Natureza",
      maleImage:
        "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",
      femaleImage:
        "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",
      description:
        "O Povo da Natureza possui identidade ligada aos ambientes naturais e à vida selvagem."
    },

    {
      id: "neraliano",
      name: "Neraliano",
      maleImage:
        "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",
      femaleImage:
        "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png",
      description:
        "Neralianos possuem características humanoides integradas a adaptações próprias de ambientes aquáticos e profundos."
    }
  ];

  const CLASSES = [
    {
      id: "guerreiro",
      name: "Guerreiro",
      description: "Combatente de linha de frente."
    },

    {
      id: "feiticeiro",
      name: "Feiticeiro",
      description: "Aventureiro especializado em magia."
    },

    {
      id: "curandeiro",
      name: "Curandeiro",
      description: "Especialista em suporte e recuperação."
    },

    {
      id: "monge",
      name: "Monge",
      description: "Combatente marcial de grande mobilidade."
    }
  ];

  const ATTRIBUTE_NAMES = {
    forca: "Força",
    vigor: "Vigor",
    controle: "Controle",
    precisao: "Precisão",
    presenca: "Presença",
    agilidade: "Agilidade",
    intelecto: "Intelecto",
    percepcao: "Percepção"
  };

  /* =========================================================
     ESTADO
  ========================================================= */

  const defaultState = () => ({
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
  });

  let state = defaultState();

  let saveTimer = null;

  let toastTimer = null;

  let selectedDice = null;

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

  function safeText(
    value
  ) {

    return value == null
      ? ""
      : String(
          value
        );

  }


  function normalizeState(
    raw
  ) {

    const base =
      defaultState();


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

        ...(raw.attributes ||
          {})

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
      ) ||
      merged.currentStep <
        0 ||
      merged.currentStep >=
        STEPS.length
    ) {

      merged.currentStep =
        0;
    }


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
     * somente Mana Azul na criação base.
     */
    merged.mana =
      "azul";


    return merged;

  }


  function showToast(
    message,
    duration = 2500
  ) {

    const toast =
      $("#toast");


    if (
      !toast
    ) {

      return;
    }


    toast.textContent =
      message;


    toast.hidden =
      false;


    clearTimeout(
      toastTimer
    );


    toastTimer =
      setTimeout(
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

    const textEl =
      $("#saveStatusText");


    const dot =
      $(".save-dot");


    if (
      textEl
    ) {

      textEl.textContent =
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
     RASCUNHO LOCAL
  ========================================================= */

  function saveLocalDraft() {

    try {

      const copy = {

        ...state,

        /*
         * Evita transformar localStorage em um depósito
         * de imagens enormes.
         */
        avatarDataUrl:
          state.avatarDataUrl &&
          state.avatarDataUrl.length <
            2_000_000

            ? state.avatarDataUrl

            : "",

        updatedAt:
          new Date().toISOString()

      };


      localStorage.setItem(
        CONFIG.draftKey,
        JSON.stringify(
          copy
        )
      );


      state.updatedAt =
        copy.updatedAt;


      setSaveStatus(
        "saved",
        "Salvo automaticamente"
      );


      return true;

    } catch (
      error
    ) {

      console.error(
        "[AERION][FICHA] Falha ao salvar rascunho:",
        error
      );


      setSaveStatus(
        "error",
        "Não foi possível salvar"
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
      setTimeout(
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
      !window.supabase?.createClient
    ) {

      console.warn(
        "[AERION][FICHA] Supabase carregou, mas createClient não está disponível."
      );


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
   * Deliberadamente sem INSERT/UPDATE definitivo ainda.
   *
   * A estrutura final de ficha-base + instância de campanha
   * precisa ser ligada ao schema aprovado antes da gravação
   * definitiva no banco.
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
        "Tabela final de fichas ainda não configurada neste módulo."

    };

  }

  /* =========================================================
     PROGRESSO
  ========================================================= */

  function updateProgress() {

    const currentIndex =
      state.currentStep;


    const percent =
      Math.round(
        (
          currentIndex /
          (
            STEPS.length -
            1
          )
        ) *
        100
      );


    const fill =
      $("#progressFill");


    const percentEl =
      $("#progressPercent");


    const title =
      $("#progressTitle");


    const counter =
      $("#stepCounter");


    if (
      fill
    ) {

      fill.style.width =
        `${Math.max(
          0,
          percent
        )}%`;

    }


    if (
      percentEl
    ) {

      percentEl.textContent =
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

          const active =
            index ===
            currentIndex;


          const complete =
            index <
            currentIndex;


          button.classList.toggle(
            "is-active",
            active
          );


          button.classList.toggle(
            "is-complete",
            complete
          );


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

      next.textContent =
        currentIndex ===
        STEPS.length - 1

          ? "Finalizar →"

          : "Próximo →";

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


    if (
      index >=
        1 &&
      !state.name.trim()
    ) {

      return false;
    }


    if (
      index >=
        2 &&
      !state.race
    ) {

      return false;
    }


    if (
      index >=
        3 &&
      !state.class
    ) {

      return false;
    }


    return true;

  }


  function goToStep(
    index
  ) {

    const safeIndex =
      Math.max(
        0,
        Math.min(
          STEPS.length - 1,
          index
        )
      );


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
        top:
          0,

        behavior:
          "smooth"
      }
    );


    if (
      STEPS[
        safeIndex
      ].id ===
      "review"
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
            event.target.value;


          $("#nameError")
            .hidden =
            true;


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
            event.target.value;


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
            event.target.value;


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
            event.target.value;


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
            event.target.value;


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


    const allowed = [

      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif"

    ];


    if (
      !allowed.includes(
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
        "feminino" &&
      race.femaleImage
    ) {

      return race.femaleImage;

    }


    if (
      state.gender ===
        "masculino" &&
      race.maleImage
    ) {

      return race.maleImage;

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
          () => {

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

      const src =
        getRaceImage(
          race
        );


      image.src =
        src;


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
      `${race.name} selecionado.`
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


    $("#modalRaceName")
      .textContent =
      race.name;


    $("#modalRaceDescription")
      .textContent =
      race.description;


    if (
      typeof modal.showModal ===
      "function"
    ) {

      modal.showModal();

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

      modal.close();

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
        () => {

          state.raceIndex =
            (
              state.raceIndex -
              1 +
              RACES.length
            ) %
            RACES.length;


          renderRace();

        }
      );


    $("#raceNext")
      ?.addEventListener(
        "click",
        () => {

          state.raceIndex =
            (
              state.raceIndex +
              1
            ) %
            RACES.length;


          renderRace();

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

          const selected =
            card.dataset.class ===
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

        }
      );

  }


  function bindClasses() {

    $$(".class-card")
      .forEach(
        card => {

          card.addEventListener(
            "click",
            () => {

              const classId =
                card.dataset.class;


              if (
                !CLASSES.some(
                  item =>
                    item.id ===
                    classId
                )
              ) {

                return;
              }


              state.class =
                classId;


              updateState(
                {
                  class:
                    classId
                }
              );


              renderClass();


              const selected =
                CLASSES.find(
                  item =>
                    item.id ===
                    classId
                );


              showToast(
                `${selected?.name || "Classe"} selecionada.`
              );

            }
          );

        }
      );

  }

  /* =========================================================
     ATRIBUTOS
  ========================================================= */

  function renderAttributes() {

    $$(".dice-card")
      .forEach(
        card => {

          card.classList.toggle(
            "is-selected",
            card.dataset.die ===
              selectedDice
          );

        }
      );


    $$(".attribute-slot")
      .forEach(
        button => {

          const attribute =
            button.dataset.attributeSlot;


          const die =
            state.attributes[
              attribute
            ];


          if (
            die
          ) {

            button.textContent =
              die.toUpperCase();


            button.classList.add(
              "is-filled"
            );

          } else {

            button.textContent =
              "Selecionar dado";


            button.classList.remove(
              "is-filled"
            );

          }

        }
      );


    renderAttributeChart();

  }


  function bindAttributes() {

    $$(".dice-card")
      .forEach(
        card => {

          card.addEventListener(
            "click",
            () => {

              selectedDice =
                card.dataset.die;


              renderAttributes();


              showToast(
                `${selectedDice.toUpperCase()} selecionado. Agora escolha o atributo.`
              );

            }
          );

        }
      );


    $$(".attribute-slot")
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const attribute =
                button.dataset.attributeSlot;


              if (
                !selectedDice
              ) {

                showToast(
                  "Escolha um dado primeiro."
                );


                return;
              }


              state.attributes[
                attribute
              ] =
                selectedDice;


              updateState(
                {

                  attributes:
                    {
                      ...state.attributes
                    }

                }
              );


              selectedDice =
                null;


              renderAttributes();

            }
          );

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
                    die.replace(
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
                ] ||
                id,

              sides

            };

          }
        );


    const hasAny =
      values.some(
        item =>
          item.sides >
          0
      );


    if (
      !hasAny
    ) {

      container.innerHTML =
        `
        <div class="chart-placeholder">
          O gráfico aparecerá conforme os atributos forem definidos.
        </div>
        `;


      return;

    }


    const max =
      20;


    container.innerHTML =
      "";


    const list =
      document.createElement(
        "div"
      );


    list.style.width =
      "100%";


    list.style.display =
      "grid";


    list.style.gap =
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
          "95px 1fr 42px";


        row.style.alignItems =
          "center";


        row.style.gap =
          "9px";


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
          "7px";


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


        fill.style.width =
          `${Math.min(
            100,
            (
              item.sides /
              max
            ) *
            100
          )}%`;


        fill.style.height =
          "100%";


        fill.style.borderRadius =
          "inherit";


        fill.style.background =
          "linear-gradient(90deg,#a47d29,#edd58d)";


        fill.style.transition =
          "width .25s ease";


        const value =
          document.createElement(
            "strong"
          );


        value.textContent =
          item.sides
            ? item.sides
            : "—";


        value.style.color =
          item.sides
            ? "var(--gold-soft)"
            : "#67635c";


        value.style.textAlign =
          "right";


        value.style.fontFamily =
          "Georgia, serif";


        track.appendChild(
          fill
        );


        row.append(
          label,
          track,
          value
        );


        list.appendChild(
          row
        );

      }
    );


    container.appendChild(
      list
    );

  }

  /* =========================================================
     MANA
  ========================================================= */

  function bindMana() {

    $$(".mana-card")
      .forEach(
        card => {

          card.addEventListener(
            "click",
            () => {

              if (
                card.disabled ||
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

            }
          );

        }
      );

  }


  function renderMana() {

    $$(".mana-card")
      .forEach(
        card => {

          card.classList.toggle(
            "is-selected",
            card.dataset.mana ===
              state.mana
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
      <div style="display:grid;gap:12px;text-align:left">

        <label class="field">
          <span class="field-label">Nome</span>

          <input
            type="text"
            data-technique-field="name"
            maxlength="100"
          >
        </label>

        <label class="field">
          <span class="field-label">Descrição</span>

          <textarea
            data-technique-field="description"
            rows="4"
            maxlength="1000"
          ></textarea>
        </label>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">

          <label class="field">
            <span class="field-label">Alcance</span>

            <input
              type="text"
              data-technique-field="range"
              maxlength="80"
            >
          </label>

          <label class="field">
            <span class="field-label">Dano</span>

            <input
              type="text"
              data-technique-field="damage"
              maxlength="80"
            >
          </label>

        </div>

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

              updateReview();

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
          ""

      }
    );


    renderTechniques();

    scheduleAutosave();


    const inputs =
      $$(
        "[data-technique-field]",
        $("#techniquesList")
      );


    inputs[
      inputs.length -
      4
    ]?.focus();

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
      <div style="display:grid;gap:12px;text-align:left">

        <label class="field">
          <span class="field-label">Item</span>

          <input
            type="text"
            data-inventory-field="name"
            maxlength="100"
          >
        </label>

        <label class="field">
          <span class="field-label">Descrição</span>

          <textarea
            data-inventory-field="description"
            rows="3"
            maxlength="500"
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


    const classEl =
      $("#reviewClass");


    const mana =
      $("#reviewMana");


    const gender =
      $("#reviewGender");


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
        parts.join(
          " · "
        ) ||
        "Identidade ainda não definida.";

    }


    if (
      race
    ) {

      race.textContent =
        getRaceName();

    }


    if (
      classEl
    ) {

      classEl.textContent =
        getClassName();

    }


    if (
      mana
    ) {

      mana.textContent =
        "Mana Azul";

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
        "Falta escolher a raça."
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
        "Falta escolher a classe."
      );


      goToStep(
        2
      );


      return false;

    }


    if (
      !state.mana
    ) {

      state.mana =
        "azul";

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

      /*
       * Ainda é um rascunho local porque a estrutura final
       * do banco será conectada depois.
       */
      showToast(
        "Ficha salva como rascunho neste dispositivo."
      );


      return;

    }


    if (
      !result.ok
    ) {

      showToast(
        "Ficha salva localmente; banco não foi atualizado."
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
            STEPS.length - 1
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

    $("#addTechniqueButton")
      ?.addEventListener(
        "click",
        addTechnique
      );


    $("#addInventoryButton")
      ?.addEventListener(
        "click",
        addInventoryItem
      );


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

    const restored =
      loadLocalDraft();


    if (
      restored
    ) {

      showToast(
        "Rascunho anterior restaurado.",
        1800
      );

    }


    bindIdentity();

    bindRace();

    bindClasses();

    bindAttributes();

    bindMana();

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


    console.info(
      "[AERION][FICHA] módulo iniciado.",
      {

        restored,

        races:
          RACES.length,

        classes:
          CLASSES.length,

        supabaseConfigured:
          Boolean(
            CONFIG.supabaseUrl &&
            CONFIG.supabaseAnonKey
          )

      }
    );

  }


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


  /* =========================================================
     API PÚBLICA
  ========================================================= */

  window.AERIONFicha =
    Object.freeze({

      getState:
        () =>
          structuredClone(
            state
          ),

      saveDraft:
        saveLocalDraft,

      goToStep

    });

})();