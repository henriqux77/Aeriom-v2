/* =========================================================
   AERION — CRIAÇÃO DE FICHA
   js/core/ficha.js

   FUNÇÕES:
   - Identidade
   - Gênero
   - Imagem
   - Raças
   - Classes
   - Atributos
   - Dados limitados
   - Clique para atribuir
   - Drag & Drop
   - Troca de dados
   - Devolução de dados
   - Gráfico radial de 8 eixos
   - Poder com D100
   - Mana Azul
   - Técnicas
   - Inventário
   - Revisão
   - Autosave
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURAÇÃO
  ========================================================= */

  const CONFIG = {
    draftKey: "aerion:ficha:draft:v5",
    autosaveDelay: 700
  };

  /* =========================================================
     ETAPAS
  ========================================================= */

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

  /* =========================================================
     DADOS OFICIAIS DA PISCINA
  ========================================================= */

  const DICE_LIMITS = Object.freeze({
    d4: 1,
    d6: 2,
    d8: 1,
    d10: 1,
    d12: 1,
    d20: 2
  });

  const ATTRIBUTE_ORDER = [
    "forca",
    "vigor",
    "agilidade",
    "precisao",
    "intelecto",
    "controle",
    "presenca",
    "percepcao"
  ];

  const ATTRIBUTE_NAMES = Object.freeze({
    forca: "Força",
    vigor: "Vigor",
    agilidade: "Agilidade",
    precisao: "Precisão",
    intelecto: "Intelecto",
    controle: "Controle",
    presenca: "Presença",
    percepcao: "Percepção"
  });

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
      bonus: "+1"
    },

    {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",
      bonus: "+5"
    },

    {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",
      bonus: "+2"
    },

    {
      id: "monge",
      name: "Monge",
      role: "Marcial",
      bonus: "+7"
    }
  ];

  /* =========================================================
     PODERES

     LISTA PROVISÓRIA.

     O D100 funciona agora.
     Quando definirmos a tabela oficial 1–100,
     substituímos somente este bloco.
  ========================================================= */

  const POWER_POOL = [
    "Fogo",
    "Ar",
    "Terra",
    "Água",
    "Gelo",
    "Magnetismo",
    "Vegetação",
    "Tecnologia",
    "Gravidade",
    "Som"
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
        agilidade: null,
        precisao: null,
        intelecto: null,
        controle: null,
        presenca: null,
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
    return value === null ||
      value === undefined
      ? ""
      : String(value);
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

    if (textElement) {
      textElement.textContent =
        text;
    }

    if (!dot) {
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
     NORMALIZAÇÃO
  ========================================================= */

  function normalizeDieType(
    value
  ) {
    const raw =
      safeText(
        value
      )
      .toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(
        DICE_LIMITS,
        raw
      )
    ) {
      return raw;
    }

    const match =
      raw.match(
        /^d(4|6|8|10|12|20)/
      );

    return match
      ? `d${match[1]}`
      : null;
  }

  function normalizeAttributes(
    raw
  ) {
    const result = {
      forca: null,
      vigor: null,
      agilidade: null,
      precisao: null,
      intelecto: null,
      controle: null,
      presenca: null,
      percepcao: null
    };

    if (
      !raw ||
      typeof raw !==
        "object"
    ) {
      return result;
    }

    const usage = {
      d4: 0,
      d6: 0,
      d8: 0,
      d10: 0,
      d12: 0,
      d20: 0
    };

    ATTRIBUTE_ORDER.forEach(
      attribute => {
        const die =
          normalizeDieType(
            raw[attribute]
          );

        if (!die) {
          return;
        }

        if (
          usage[die] >=
          DICE_LIMITS[die]
        ) {
          return;
        }

        result[attribute] =
          die;

        usage[die]++;
      }
    );

    return result;
  }

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

    const result = {
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

    result.currentStep =
      clamp(
        Number(
          result.currentStep
        ) || 0,
        0,
        STEPS.length - 1
      );

    result.raceIndex =
      clamp(
        Number(
          result.raceIndex
        ) || 0,
        0,
        RACES.length - 1
      );

    if (
      !RACES.some(
        race =>
          race.id ===
          result.race
      )
    ) {
      result.race = "";
    }

    const classData =
      CLASSES.find(
        item =>
          item.id ===
          result.class
      );

    if (classData) {
      result.classBonus =
        classData.bonus;
    } else {
      result.class = "";
      result.classBonus = "";
    }

    if (
      ![
        "masculino",
        "feminino"
      ].includes(
        result.gender
      )
    ) {
      result.gender = "";
    }

    result.mana =
      "azul";

    return result;
  }

  /* =========================================================
     AUTOSAVE
  ========================================================= */

  function saveLocalDraft() {
    try {
      const data = {
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
          data
        )
      );

      state.updatedAt =
        data.updatedAt;

      setSaveStatus(
        "saved",
        "Salvo automaticamente"
      );

      return true;
    } catch (error) {
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
    } catch (error) {
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
     PROGRESSO / ETAPAS
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

  function getAttributeCount() {
    return Object.values(
      state.attributes
    ).filter(
      Boolean
    ).length;
  }

  function areAllAttributesAssigned() {
    return (
      getAttributeCount() ===
      ATTRIBUTE_ORDER.length
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
    if (index <= 0) {
      return true;
    }

    if (
      index >= 1 &&
      !isIdentityComplete()
    ) {
      return false;
    }

    if (
      index >= 2 &&
      !isRaceComplete()
    ) {
      return false;
    }

    if (
      index >= 3 &&
      !isClassComplete()
    ) {
      return false;
    }

    if (
      index >= 4 &&
      !areAllAttributesAssigned()
    ) {
      return false;
    }

    if (
      index >= 5 &&
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
    const complete =
      STEPS.filter(
        (_, index) =>
          isStepComplete(
            index
          )
      ).length;

    return Math.round(
      (
        complete /
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

    const percentEl =
      $("#progressPercent");

    const title =
      $("#progressTitle");

    const counter =
      $("#stepCounter");

    if (fill) {
      fill.style.width =
        `${percent}%`;
    }

    if (percentEl) {
      percentEl.textContent =
        `${percent}%`;
    }

    if (title) {
      title.textContent =
        STEPS[index]?.title ||
        "Identidade";
    }

    if (counter) {
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
            buttonIndex <
              index &&
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

    if (previous) {
      previous.disabled =
        index === 0;
    }

    const next =
      $("#nextStepButton");

    if (next) {
      next.textContent =
        index ===
        STEPS.length - 1
          ? "Finalizar →"
          : "Próximo →";
    }
  }

  function goToStep(
    target
  ) {
    const index =
      clamp(
        Number(
          target
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
            STEPS[index].id;

          panel.hidden =
            !active;

          panel.classList.toggle(
            "is-active",
            active
          );
        }
      );

    updateProgress();

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

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

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
      goToStep(0);
      $("#characterName")?.focus();
      return false;
    }

    if (
      !isRaceComplete()
    ) {
      showToast(
        "Escolha uma raça."
      );
      goToStep(1);
      return false;
    }

    if (
      !isClassComplete()
    ) {
      showToast(
        "Escolha uma classe."
      );
      goToStep(2);
      return false;
    }

    if (
      !areAllAttributesAssigned()
    ) {
      showToast(
        `Complete os atributos: ${getAttributeCount()}/8.`
      );
      goToStep(3);
      return false;
    }

    if (
      !isPowerComplete()
    ) {
      showToast(
        "Defina o poder."
      );
      goToStep(4);
      return false;
    }

    return true;
  }

  /* =========================================================
     IDENTIDADE
  ========================================================= */

  function hydrateIdentity() {
    $("#characterName")?.setAttribute(
      "value",
      state.name
    );

    const name =
      $("#characterName");

    const age =
      $("#characterAge");

    const description =
      $("#characterDescription");

    if (name) {
      name.value =
        state.name;
    }

    if (age) {
      age.value =
        state.age;
    }

    if (description) {
      description.value =
        state.description;
    }

    $$(
      'input[name="gender"]'
    ).forEach(
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

          if (error) {
            error.hidden =
              true;
          }

          updateProgress();
          updateReview();
          scheduleAutosave();
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

          updateReview();
          scheduleAutosave();
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

    $$(
      'input[name="gender"]'
    ).forEach(
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

          if (input) {
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

    if (!file) {
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
      6 * 1024 * 1024
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

      if (remove) {
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

      if (remove) {
        remove.disabled =
          true;
      }
    }

    updateReview();
  }

  /* =========================================================
     RAÇA
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
    if (!race) {
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

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    RACES.forEach(
      (race, index) => {
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

    if (!race) {
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

    const gender =
      $("#raceGenderLabel");

    if (image) {
      image.src =
        getRaceImage(
          race
        );

      image.alt =
        `${race.name} — personagem`;
    }

    if (name) {
      name.textContent =
        race.name;
    }

    if (description) {
      description.textContent =
        race.description;
    }

    if (gender) {
      gender.textContent =
        state.gender
          ? `${race.name} · ${state.gender}`
          : race.name;
    }

    if (selected) {
      selected.textContent =
        state.race ===
        race.id
          ? "✓ Selecionada"
          : "Selecionar raça";
    }

    $("#raceDescriptionTitle")
      ?.replaceChildren(
        document.createTextNode(
          race.name
        )
      );

    $("#raceDescriptionText")
      ?.replaceChildren(
        document.createTextNode(
          race.description
        )
      );

    renderRaceDots();
  }

  function selectCurrentRace() {
    const race =
      getCurrentRace();

    if (!race) {
      return false;
    }

    state.race =
      race.id;

    state.raceIndex =
      RACES.findIndex(
        item =>
          item.id ===
          race.id
      );

    renderRace();
    updateProgress();
    updateReview();
    scheduleAutosave();

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

    $("#modalRaceName")
      ?.replaceChildren(
        document.createTextNode(
          race.name
        )
      );

    $("#modalRaceDescription")
      ?.replaceChildren(
        document.createTextNode(
          race.description
        )
      );

    if (
      typeof modal.showModal ===
      "function"
    ) {
      if (!modal.open) {
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

    if (!modal) {
      return;
    }

    if (
      typeof modal.close ===
      "function"
    ) {
      if (modal.open) {
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

          const indicator =
            card.querySelector(
              ".class-selection span"
            );

          if (indicator) {
            indicator.textContent =
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

    if (!classData) {
      return false;
    }

    state.class =
      classData.id;

    state.classBonus =
      classData.bonus;

    renderClasses();
    updateProgress();
    updateReview();
    scheduleAutosave();

    showToast(
      `${classData.name} selecionada.`
    );

    return true;
  }

  function bindClasses() {
    document.addEventListener(
      "click",
      event => {
        const card =
          event.target.closest(
            ".class-card[data-class]"
          );

        if (!card) {
          return;
        }

        selectClass(
          card.dataset.class
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

        if (!card) {
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
     ATRIBUTOS — PISCINA
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
          const normalized =
            normalizeDieType(
              die
            );

          if (
            normalized &&
            Object.prototype.hasOwnProperty.call(
              usage,
              normalized
            )
          ) {
            usage[
              normalized
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
      normalizeDieType(
        die
      );

    if (!normalized) {
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

  function renderDicePool() {
    const cards =
      $$(".dice-card[data-die]");

    const usage =
      getDiceUsage();

    cards.forEach(
      card => {
        const die =
          normalizeDieType(
            card.dataset.die
          );

        if (!die) {
          return;
        }

        const remaining =
          Math.max(
            0,
            DICE_LIMITS[
              die
            ] -
            (
              usage[
                die
              ] || 0
            )
          );

        const remainingText =
          card.querySelector(
            ".dice-remaining"
          );

        if (
          remainingText
        ) {
          remainingText.textContent =
            remaining === 1
              ? "1 disponível"
              : `${remaining} disponíveis`;
        }

        const exhausted =
          remaining <= 0;

        card.classList.toggle(
          "is-exhausted",
          exhausted
        );

        card.classList.toggle(
          "is-selected",
          selectedDice ===
          die
        );

        card.setAttribute(
          "aria-disabled",
          String(
            exhausted
          )
        );

        /*
         * Mantemos o card no DOM para continuar
         * mostrando a quantidade. O clique é bloqueado
         * quando não houver estoque.
         */
        card.disabled =
          false;
      }
    );

    /*
     * Piscina futura #dicePool.
     */
    const newPool =
      $("#dicePool");

    if (
      newPool &&
      !newPool.hasAttribute(
        "data-static-pool"
      )
    ) {
      newPool.innerHTML =
        "";

      Object.entries(
        DICE_LIMITS
      ).forEach(
        ([die, limit]) => {
          const remaining =
            Math.max(
              0,
              limit -
              (
                usage[
                  die
                ] || 0
              )
            );

          for (
            let i = 0;
            i < remaining;
            i++
          ) {
            const item =
              document.createElement(
                "button"
              );

            item.type =
              "button";

            item.className =
              "attribute-die";

            item.draggable =
              true;

            item.dataset.dieType =
              die;

            item.textContent =
              die.toUpperCase();

            newPool.appendChild(
              item
            );
          }
        }
      );
    }
  }

  /* =========================================================
     ATRIBUTOS — INTERAÇÃO
  ========================================================= */

  function selectDice(
    die
  ) {
    const normalized =
      normalizeDieType(
        die
      );

    if (!normalized) {
      return false;
    }

    if (
      getRemainingDice(
        normalized
      ) <= 0
    ) {
      showToast(
        `${normalized.toUpperCase()} já está esgotado.`
      );

      selectedDice =
        null;

      renderDicePool();

      return false;
    }

    selectedDice =
      normalized;

    renderDicePool();

    showToast(
      `${normalized.toUpperCase()} selecionado.`
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
      return false;
    }

    const old =
      state.attributes[
        attribute
      ];

    if (!old) {
      return false;
    }

    state.attributes[
      attribute
    ] =
      null;

    selectedDice =
      null;

    renderAttributes();
    scheduleAutosave();

    showToast(
      `${old.toUpperCase()} devolvido aos dados.`
    );

    return true;
  }

  function assignDiceToAttribute(
    attribute,
    die
  ) {
    const normalized =
      normalizeDieType(
        die
      );

    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        attribute
      )
    ) {
      return false;
    }

    if (!normalized) {
      return false;
    }

    const current =
      state.attributes[
        attribute
      ];

    /*
     * Caso seja o mesmo dado no mesmo atributo,
     * devolve.
     */
    if (
      current ===
      normalized
    ) {
      return clearAttribute(
        attribute
      );
    }

    /*
     * Temporariamente libera o dado antigo.
     * Isso permite a troca:
     *
     * D6 → D20
     *
     * sem criar D6/D20 extras.
     */
    state.attributes[
      attribute
    ] =
      null;

    /*
     * Agora verifica o estoque real do novo dado.
     */
    if (
      getRemainingDice(
        normalized
      ) <= 0
    ) {
      state.attributes[
        attribute
      ] =
        current;

      selectedDice =
        null;

      renderAttributes();

      showToast(
        `${normalized.toUpperCase()} não está disponível.`
      );

      return false;
    }

    state.attributes[
      attribute
    ] =
      normalized;

    selectedDice =
      null;

    renderAttributes();
    scheduleAutosave();

    showToast(
      `${normalized.toUpperCase()} colocado em ${ATTRIBUTE_NAMES[attribute]}.`
    );

    return true;
  }

  function moveAttribute(
    source,
    target
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        source
      ) ||
      !Object.prototype.hasOwnProperty.call(
        state.attributes,
        target
      ) ||
      source === target
    ) {
      return false;
    }

    const sourceDie =
      state.attributes[
        source
      ];

    const targetDie =
      state.attributes[
        target
      ];

    /*
     * Troca os dois valores.
     */
    state.attributes[
      source
    ] =
      targetDie || null;

    state.attributes[
      target
    ] =
      sourceDie || null;

    selectedDice =
      null;

    renderAttributes();
    scheduleAutosave();

    return true;
  }

  function renderAttributeSlots() {
    $$(".attribute-slot")
      .forEach(
        slot => {
          const attribute =
            slot.dataset.attributeSlot ||
            slot.dataset.attribute;

          if (!attribute) {
            return;
          }

          const die =
            state.attributes[
              attribute
            ];

          const value =
            slot.querySelector(
              ".attribute-die-value"
            );

          if (value) {
            value.textContent =
              die
                ? die.toUpperCase()
                : "D?";
          } else {
            /*
             * Compatibilidade com a estrutura antiga.
             */
            slot.textContent =
              die
                ? die.toUpperCase()
                : "Selecionar dado";
          }

          slot.classList.toggle(
            "is-filled",
            Boolean(die)
          );

          slot.dataset.attribute =
            attribute;

          slot.draggable =
            Boolean(die);
        }
      );
  }

  function renderAttributes() {
    renderDicePool();

    renderAttributeSlots();

    renderAttributeChart();

    updateAttributeCountUI();

    updateProgress();
  }

  function updateAttributeCountUI() {
    const list =
      $("#attributeList");

    if (!list) {
      return;
    }

    let indicator =
      list.querySelector(
        ".attribute-count-indicator"
      );

    if (!indicator) {
      indicator =
        document.createElement(
          "div"
        );

      indicator.className =
        "attribute-count-indicator";

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

  /* =========================================================
     DRAG & DROP DOS DADOS
  ========================================================= */

  function setupAttributeDragAndDrop() {
    $$(".dice-card[data-die]")
      .forEach(
        card => {
          card.draggable =
            true;

          card.addEventListener(
            "dragstart",
            event => {
              const die =
                normalizeDieType(
                  card.dataset.die
                );

              if (
                !die ||
                getRemainingDice(
                  die
                ) <= 0
              ) {
                event.preventDefault();
                return;
              }

              event.dataTransfer.effectAllowed =
                "copy";

              event.dataTransfer.setData(
                "text/plain",
                die
              );

              event.dataTransfer.setData(
                "application/x-aerion-source",
                "pool"
              );

              card.classList.add(
                "is-dragging"
              );
            }
          );

          card.addEventListener(
            "dragend",
            () => {
              card.classList.remove(
                "is-dragging"
              );
            }
          );
        }
      );

    /*
     * Slots dos atributos.
     */
    $$(".attribute-slot")
      .forEach(
        slot => {
          const attribute =
            slot.dataset.attributeSlot ||
            slot.dataset.attribute;

          if (!attribute) {
            return;
          }

          slot.dataset.attribute =
            attribute;

          slot.addEventListener(
            "dragover",
            event => {
              event.preventDefault();

              slot.classList.add(
                "is-drag-over"
              );

              if (
                event.dataTransfer
              ) {
                event.dataTransfer.dropEffect =
                  "move";
              }
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

              const die =
                normalizeDieType(
                  event.dataTransfer.getData(
                    "text/plain"
                  )
                );

              const source =
                event.dataTransfer.getData(
                  "application/x-aerion-source"
                );

              if (!die) {
                return;
              }

              /*
               * Drag de um atributo para outro.
               */
              if (
                source &&
                source !== "pool" &&
                ATTRIBUTE_ORDER.includes(
                  source
                )
              ) {
                moveAttribute(
                  source,
                  attribute
                );

                return;
              }

              /*
               * Drag da piscina.
               */
              assignDiceToAttribute(
                attribute,
                die
              );
            }
          );

          slot.addEventListener(
            "dragstart",
            event => {
              const die =
                state.attributes[
                  attribute
                ];

              if (!die) {
                event.preventDefault();
                return;
              }

              event.dataTransfer.effectAllowed =
                "move";

              event.dataTransfer.setData(
                "text/plain",
                die
              );

              event.dataTransfer.setData(
                "application/x-aerion-source",
                attribute
              );

              slot.classList.add(
                "is-dragging"
              );
            }
          );

          slot.addEventListener(
            "dragend",
            () => {
              slot.classList.remove(
                "is-dragging"
              );
            }
          );
        }
      );
  }

  function bindAttributeClicks() {
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
            normalizeDieType(
              diceCard.dataset.die
            );

          if (
            die &&
            getRemainingDice(
              die
            ) > 0
          ) {
            selectDice(
              die
            );
          } else {
            showToast(
              `${die?.toUpperCase() || "DADO"} esgotado.`
            );
          }

          return;
        }

        const newDice =
          event.target.closest(
            ".attribute-die[data-die-type]"
          );

        if (
          newDice
        ) {
          selectDice(
            newDice.dataset.dieType
          );

          return;
        }

        const slot =
          event.target.closest(
            ".attribute-slot"
          );

        if (
          !slot
        ) {
          return;
        }

        const attribute =
          slot.dataset.attributeSlot ||
          slot.dataset.attribute;

        if (!attribute) {
          return;
        }

        if (
          selectedDice
        ) {
          assignDiceToAttribute(
            attribute,
            selectedDice
          );

          return;
        }

        /*
         * Sem dado selecionado:
         * toque no atributo preenchido = devolve.
         */
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

  /* =========================================================
     GRÁFICO RADIAL
  ========================================================= */

  function chartValue(
    die
  ) {
    const normalized =
      normalizeDieType(
        die
      );

    if (!normalized) {
      return 0.08;
    }

    const number =
      Number(
        normalized.replace(
          "d",
          ""
        )
      );

    return clamp(
      number / 20,
      0.08,
      1
    );
  }

  function createSvgElement(
    name,
    attributes = {}
  ) {
    const element =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        name
      );

    Object.entries(
      attributes
    ).forEach(
      ([key, value]) => {
        element.setAttribute(
          key,
          String(value)
        );
      }
    );

    return element;
  }

  function renderAttributeChart() {
    let container =
      $("#attributeChart");

    if (!container) {
      return;
    }

    let svg;

    if (
      container.tagName.toLowerCase() ===
      "svg"
    ) {
      svg =
        container;
    } else {
      svg =
        container.querySelector(
          "svg"
        );

      if (!svg) {
        svg =
          createSvgElement(
            "svg"
          );

        container.innerHTML =
          "";

        container.appendChild(
          svg
        );
      }
    }

    const width =
      360;

    const height =
      360;

    const cx =
      180;

    const cy =
      180;

    const radius =
      112;

    const total =
      ATTRIBUTE_ORDER.length;

    svg.setAttribute(
      "viewBox",
      `0 0 ${width} ${height}`
    );

    svg.setAttribute(
      "aria-label",
      "Gráfico radial dos atributos"
    );

    svg.setAttribute(
      "role",
      "img"
    );

    svg.innerHTML =
      "";

    /*
     * Anéis do gráfico.
     */
    [0.25, 0.5, 0.75, 1]
      .forEach(
        scale => {
          const points =
            ATTRIBUTE_ORDER
              .map(
                (_, index) => {
                  const angle =
                    -Math.PI / 2 +
                    index *
                      (
                        Math.PI *
                        2 /
                        total
                      );

                  const x =
                    cx +
                    Math.cos(
                      angle
                    ) *
                    radius *
                    scale;

                  const y =
                    cy +
                    Math.sin(
                      angle
                    ) *
                    radius *
                    scale;

                  return `${x},${y}`;
                }
              )
              .join(
                " "
              );

          svg.appendChild(
            createSvgElement(
              "polygon",
              {
                points,
                class:
                  "attribute-chart-ring"
              }
            )
          );
        }
      );

    /*
     * Eixos.
     */
    ATTRIBUTE_ORDER.forEach(
      (_, index) => {
        const angle =
          -Math.PI / 2 +
          index *
            (
              Math.PI *
              2 /
              total
            );

        const x =
          cx +
          Math.cos(
            angle
          ) *
          radius;

        const y =
          cy +
          Math.sin(
            angle
          ) *
          radius;

        svg.appendChild(
          createSvgElement(
            "line",
            {
              x1: cx,
              y1: cy,
              x2: x,
              y2: y,
              class:
                "attribute-chart-axis"
            }
          )
        );
      }
    );

    /*
     * Polígono dos valores.
     */
    const points =
      ATTRIBUTE_ORDER
        .map(
          (
            attribute,
            index
          ) => {
            const value =
              chartValue(
                state.attributes[
                  attribute
                ]
              );

            const angle =
              -Math.PI / 2 +
              index *
                (
                  Math.PI *
                  2 /
                  total
                );

            const x =
              cx +
              Math.cos(
                angle
              ) *
              radius *
              value;

            const y =
              cy +
              Math.sin(
                angle
              ) *
              radius *
              value;

            return {
              x,
              y,
              attribute
            };
          }
        );

    svg.appendChild(
      createSvgElement(
        "polygon",
        {
          points:
            points
              .map(
                point =>
                  `${point.x},${point.y}`
              )
              .join(
                " "
              ),
          class:
            "attribute-chart-area"
        }
      )
    );

    /*
     * Pontos.
     */
    points.forEach(
      point => {
        svg.appendChild(
          createSvgElement(
            "circle",
            {
              cx:
                point.x,
              cy:
                point.y,
              r:
                5,
              class:
                "attribute-chart-point"
            }
          )
        );
      }
    );

    /*
     * Nomes dos atributos.
     */
    points.forEach(
      (
        point,
        index
      ) => {
        const labelRadius =
          radius + 30;

        const angle =
          -Math.PI / 2 +
          index *
            (
              Math.PI *
              2 /
              total
            );

        const x =
          cx +
          Math.cos(
            angle
          ) *
          labelRadius;

        const y =
          cy +
          Math.sin(
            angle
          ) *
          labelRadius;

        let anchor =
          "middle";

        if (
          x <
          cx - 10
        ) {
          anchor =
            "end";
        }

        if (
          x >
          cx + 10
        ) {
          anchor =
            "start";
        }

        const label =
          createSvgElement(
            "text",
            {
              x,
              y,
              "text-anchor":
                anchor,
              "dominant-baseline":
                "middle",
              class:
                "attribute-chart-label"
            }
          );

        label.textContent =
          ATTRIBUTE_NAMES[
            point.attribute
          ];

        svg.appendChild(
          label
        );
      }
    );

    /*
     * Centro.
     */
    svg.appendChild(
      createSvgElement(
        "circle",
        {
          cx,
          cy,
          r: 3,
          class:
            "attribute-chart-center"
        }
      )
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

    if (!panel) {
      return;
    }

    if (
      panel.querySelector(
        ".power-system"
      )
    ) {
      return;
    }

    const heading =
      panel.querySelector(
        ".section-heading"
      );

    const system =
      document.createElement(
        "div"
      );

    system.className =
      "power-system";

    system.innerHTML =
      `
      <div
        class="power-mode-buttons"
        style="
          display:grid;
          grid-template-columns:1fr 1fr;
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
          🎲 Girar D100
        </button>

      </div>


      <div
        class="power-section"
        data-power-section="manual"
        hidden
      >

        <span class="field-label">
          Poderes disponíveis
        </span>

        <div
          class="power-options"
          style="
            display:grid;
            grid-template-columns:repeat(2,1fr);
            gap:10px;
            margin-top:12px;
          "
        >

          ${POWER_POOL.map(
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
          ).join("")}

        </div>

      </div>


      <div
        class="power-section"
        data-power-section="roll"
        hidden
      >

        <div
          class="power-roll-result"
          style="
            padding:28px;
            border:1px solid var(--line);
            border-radius:18px;
            text-align:center;
          "
        >

          <span class="eyebrow">
            RESULTADO
          </span>

          <strong
            data-power-result
            style="
              display:block;
              margin-top:8px;
              font-family:Georgia,serif;
              font-size:58px;
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
            Gire o D100 para sortear seu poder.
          </p>

        </div>


        <button
          type="button"
          class="button button-primary"
          data-roll-power
          style="width:100%;margin-top:12px;"
        >
          🎲 Girar D100
        </button>

      </div>


      <div
        class="power-selected"
        style="
          padding:18px;
          border:1px solid var(--line);
          border-radius:16px;
          margin-top:4px;
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
            font-size:28px;
          "
        >
          Nenhum poder escolhido
        </strong>

      </div>
      `;

    if (heading) {
      heading.after(
        system
      );
    } else {
      panel.prepend(
        system
      );
    }

    /*
     * Esconde os campos antigos.
     */
    $("#characterPower")
      ?.closest(
        ".field"
      )
      ?.setAttribute(
        "hidden",
        ""
      );

    $("#characterOrigin")
      ?.closest(
        ".field"
      )
      ?.setAttribute(
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

    if (current) {
      current.textContent =
        state.power.trim() ||
        "Nenhum poder escolhido";
    }

    if (result) {
      result.textContent =
        state.powerRoll
          ? String(
              state.powerRoll
            )
          : "—";
    }

    if (note) {
      if (
        state.powerRoll
      ) {
        note.textContent =
          `D100: ${state.powerRoll} → ${state.power || "sem poder"}`;
      } else {
        note.textContent =
          "Gire o D100 para sortear seu poder.";
      }
    }

    updateProgress();
  }

  function choosePower(
    power,
    roll = null
  ) {
    state.power =
      power;

    state.powerRoll =
      roll;

    const oldInput =
      $("#characterPower");

    if (oldInput) {
      oldInput.value =
        power;
    }

    renderPower();
    updateReview();
    updateProgress();
    scheduleAutosave();
  }

  function rollPowerD100() {
    const roll =
      Math.floor(
        Math.random() *
        100
      ) + 1;

    /*
     * A lista atual é provisória até a tabela
     * oficial 1–100 ser definida.
     */
    const power =
      POWER_POOL[
        Math.floor(
          Math.random() *
          POWER_POOL.length
        )
      ];

    choosePower(
      power,
      roll
    );

    showToast(
      `D100: ${roll} → ${power}`
    );

    return {
      roll,
      power
    };
  }

  function bindPower() {
    ensurePowerInterface();

    document.addEventListener(
      "click",
      event => {
        const mode =
          event.target.closest(
            "[data-power-mode]"
          );

        if (mode) {
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

          if (manual) {
            manual.hidden =
              selectedMode !==
              "manual";
          }

          if (roll) {
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

        if (powerButton) {
          choosePower(
            powerButton.dataset.powerValue
          );

          showToast(
            `${powerButton.dataset.powerValue} escolhido.`
          );

          return;
        }

        const rollButton =
          event.target.closest(
            "[data-roll-power]"
          );

        if (rollButton) {
          rollPowerD100();
        }
      }
    );
  }

  /* =========================================================
     MANA
  ========================================================= */

  function renderMana() {
    state.mana =
      "azul";

    $$(".mana-card")
      .forEach(
        card => {
          const isBlue =
            card.dataset.mana ===
            "azul";

          card.classList.toggle(
            "is-selected",
            isBlue
          );

          if (!isBlue) {
            card.disabled =
              true;
          }
        }
      );

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

        if (!card) {
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
            placeholder="Descrição"
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
    ).forEach(
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
            updateProgress();
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

    if (!list) {
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
    state.techniques.push({
      name: "",
      description: "",
      range: "",
      damage: "",
      cost: "",
      test: "",
      limitation: ""
    });

    renderTechniques();
    scheduleAutosave();

    $(
      '[data-technique-field="name"]'
    )?.focus();
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
    ).forEach(
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

    if (!list) {
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
    state.inventory.push({
      name: "",
      description: ""
    });

    renderInventory();
    scheduleAutosave();

    $(
      '[data-inventory-field="name"]'
    )?.focus();
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

    const gender =
      $("#reviewGender");

    const mana =
      $("#reviewMana");

    if (name) {
      name.textContent =
        state.name.trim() ||
        "Sem nome";
    }

    if (identity) {
      const parts =
        [];

      if (state.age) {
        parts.push(
          `${state.age} anos`
        );
      }

      if (state.gender) {
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

    if (race) {
      race.textContent =
        getRaceName();
    }

    if (classEl) {
      classEl.textContent =
        getClassName();
    }

    if (gender) {
      gender.textContent =
        state.gender ===
          "masculino"
          ? "Masculino"
          : state.gender ===
              "feminino"
            ? "Feminino"
            : "—";
    }

    if (mana) {
      mana.textContent =
        "Mana Azul";
    }

    const image =
      $("#reviewAvatar");

    const fallback =
      $("#reviewAvatarFallback");

    if (
      image &&
      fallback
    ) {
      if (
        state.avatarDataUrl
      ) {
        image.src =
          state.avatarDataUrl;

        image.hidden =
          false;

        fallback.hidden =
          true;
      } else {
        image.hidden =
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
      goToStep(0);
      return false;
    }

    if (
      !isRaceComplete()
    ) {
      showToast(
        "Falta a raça."
      );
      goToStep(1);
      return false;
    }

    if (
      !isClassComplete()
    ) {
      showToast(
        "Falta a classe."
      );
      goToStep(2);
      return false;
    }

    if (
      !areAllAttributesAssigned()
    ) {
      showToast(
        `Complete os atributos: ${getAttributeCount()}/8.`
      );
      goToStep(3);
      return false;
    }

    if (
      !isPowerComplete()
    ) {
      showToast(
        "Falta o poder."
      );
      goToStep(4);
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

    if (
      !saveLocalDraft()
    ) {
      showToast(
        "Não foi possível salvar a ficha."
      );
      return;
    }

    /*
     * O Supabase será ligado na etapa de persistência
     * definitiva, depois de fecharmos o schema.
     */
    showToast(
      "Ficha salva como rascunho neste dispositivo."
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
    window.addEventListener(
      "beforeunload",
      saveLocalDraft
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

    bindIdentity();
    bindRace();
    bindClasses();

    bindAttributeClicks();
    bindPower();
    bindMana();

    bindNavigation();
    bindGeneralEvents();

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

    setupAttributeDragAndDrop();

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

    if (restored) {
      showToast(
        "Rascunho anterior restaurado.",
        1800
      );
    }

    console.info(
      "[AERION][FICHA] Inicializado.",
      {
        races:
          RACES.length,
        classes:
          CLASSES.length,
        dice:
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
        () => ({
          ...getDiceUsage()
        }),

      getRemainingDice,

      selectDice,

      clearAttribute,

      assignDice:
        assignDiceToAttribute,

      swapAttributes:
        moveAttribute,

      areAllAttributesAssigned,

      getAttributeCount,

      rollPowerD100,

      selectPower:
        choosePower
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
        once: true
      }
    );
  } else {
    init();
  }

})();