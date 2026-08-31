(() => {
  "use strict";

  /* =========================================================
     AERION — FICHA RENDER
     js/core/ficha-render.js

     CAMADA VISUAL

     ficha.js
       -> estado / regras / dados

     personagem-assets.js
       -> catálogo das raças e imagens

     personagem-render.js
       -> imagem da raça no visualizador

     Este arquivo
       -> interface da ficha
     ========================================================= */


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const TOTAL_STEPS = 11;

  const STEP_IDS = Object.freeze([
    "identity",
    "race",
    "appearance",
    "class",
    "attributes",
    "power",
    "mana",
    "skills",
    "techniques",
    "inventory",
    "review"
  ]);

  const STEP_NAMES = Object.freeze([
    "Identidade",
    "Raça",
    "Aparência",
    "Classe",
    "Atributos",
    "Poder",
    "Mana",
    "Perícias",
    "Técnicas",
    "Inventário",
    "Revisão"
  ]);


  /* =========================================================
     ESTADO
     ========================================================= */

  let state = null;

  let initialized = false;

  let raceIndex = 0;


  /* =========================================================
     DOM
     ========================================================= */

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return Array.from(
      parent.querySelectorAll(selector)
    );
  }


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function text(value) {
    return String(value ?? "").trim();
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


  function number(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }


  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }


  function getCore() {
    return (
      window.AERIONFicha ||
      window.AERION_FICHA ||
      null
    );
  }


  function getAssets() {
    return (
      window.AERIONPersonagemAssets ||
      window.AERION_CHARACTER_ASSETS ||
      null
    );
  }


  function getCurrentState() {
    const core = getCore();

    if (
      core &&
      typeof core.getState === "function"
    ) {
      try {
        return core.getState();
      } catch (error) {
        console.warn(
          "[AERION] Não foi possível ler o estado:",
          error
        );
      }
    }

    return state || {};
  }


  /* =========================================================
     NOTIFICAÇÃO
     ========================================================= */

  function announce(message) {
    let live = $("#aerionLiveRegion");

    if (!live) {
      live = document.createElement("div");

      live.id = "aerionLiveRegion";

      live.className = "visually-hidden";

      live.setAttribute(
        "aria-live",
        "polite"
      );

      live.setAttribute(
        "aria-atomic",
        "true"
      );

      document.body.appendChild(live);
    }

    live.textContent = text(message);
  }


  function toast(message) {
    let element = $("#aerionToast");

    if (!element) {
      element = document.createElement("div");

      element.id = "aerionToast";

      element.className = "toast";

      document.body.appendChild(element);
    }

    element.textContent = text(message);

    element.hidden = false;

    clearTimeout(
      element.__aerionToastTimer
    );

    element.__aerionToastTimer = setTimeout(
      () => {
        element.hidden = true;
      },
      1800
    );
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function getCurrentStep(current = getCurrentState()) {
    return clamp(
      number(
        current?.currentStep,
        0
      ),
      0,
      TOTAL_STEPS - 1
    );
  }


  function getCurrentStepId(current = getCurrentState()) {
    return (
      STEP_IDS[
        getCurrentStep(current)
      ] ||
      STEP_IDS[0]
    );
  }


  function isStepUnlocked(
    index,
    currentState = getCurrentState()
  ) {
    const current =
      getCurrentStep(
        currentState
      );

    if (index <= current) {
      return true;
    }

    return (
      currentState?.completedSteps?.[
        index - 1
      ] === true
    );
  }


  function renderPanels(currentState) {
    const current =
      getCurrentStep(
        currentState
      );

    const currentId =
      STEP_IDS[current];


    /*
     * Painéis principais.
     */

    $$("[data-panel]")
      .forEach(panel => {
        const active =
          panel.dataset.panel ===
          currentId;

        panel.hidden =
          !active;

        panel.classList.toggle(
          "is-active",
          active
        );

        panel.setAttribute(
          "aria-hidden",
          active
            ? "false"
            : "true"
        );
      });


    /*
     * Compatibilidade com data-step-panel.
     */

    $$("[data-step-panel]")
      .forEach(panel => {
        const active =
          normalize(
            panel.dataset.stepPanel
          ) ===
          normalize(
            currentId
          );

        panel.hidden =
          !active;

        panel.classList.toggle(
          "is-active",
          active
        );
      });
  }


  function renderStepTabs(currentState) {
    const current =
      getCurrentStep(
        currentState
      );


    $$(".creation-step")
      .forEach(
        (button, index) => {

          const unlocked =
            isStepUnlocked(
              index,
              currentState
            );

          const active =
            index === current;


          button.classList.toggle(
            "active",
            active
          );


          button.classList.toggle(
            "locked",
            !unlocked
          );


          /*
           * Etapas futuras continuam bloqueadas.
           * Etapas atuais e anteriores podem ser acessadas.
           */

          button.disabled =
            !unlocked;


          if (active) {
            button.setAttribute(
              "aria-current",
              "step"
            );
          } else {
            button.removeAttribute(
              "aria-current"
            );
          }


          if (unlocked) {
            button.removeAttribute(
              "aria-disabled"
            );
          } else {
            button.setAttribute(
              "aria-disabled",
              "true"
            );
          }
        }
      );
  }


  function renderProgress(currentState) {
    const current =
      getCurrentStep(
        currentState
      );


    const percent =
      Math.round(
        (
          current /
          Math.max(
            1,
            TOTAL_STEPS - 1
          )
        ) *
        100
      );


    const progressBar =
      $("#progressBar");

    if (progressBar) {
      progressBar.style.width =
        `${percent}%`;
    }


    const progressPercent =
      $("#progressPercent");

    if (progressPercent) {
      progressPercent.textContent =
        `${percent}%`;
    }


    const progressTitle =
      $("#progressTitle");

    if (progressTitle) {
      progressTitle.textContent =
        STEP_NAMES[current] ||
        "Identidade";
    }


    const progressTrack =
      $(".progress-track");

    if (progressTrack) {
      progressTrack.setAttribute(
        "aria-valuenow",
        String(percent)
      );
    }


    /*
     * Contador da etapa.
     */

    $$("[data-current-step]")
      .forEach(
        element => {
          element.textContent =
            String(
              current + 1
            );
        }
      );


    $$("[data-total-steps]")
      .forEach(
        element => {
          element.textContent =
            String(
              TOTAL_STEPS
            );
        }
      );


    const stepNumber =
      $("#stepNumber");

    if (stepNumber) {
      stepNumber.textContent =
        String(
          current + 1
        );
    }


    const stepTitle =
      $("[data-current-step-title]");

    if (stepTitle) {
      stepTitle.textContent =
        STEP_NAMES[current] ||
        "Identidade";
    }
  }


  function renderNavigation(
    currentState
  ) {
    renderPanels(
      currentState
    );

    renderStepTabs(
      currentState
    );

    renderProgress(
      currentState
    );
  }


  /* =========================================================
     RAÇAS
     ========================================================= */

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


  function getRace(
    raceId
  ) {
    const assets =
      getAssets();


    if (
      assets &&
      typeof assets.getRace ===
        "function"
    ) {
      return assets.getRace(
        raceId
      );
    }


    const id =
      normalize(
        raceId
      );


    return (
      getRaces().find(
        race =>
          normalize(
            race.id
          ) ===
          id
      ) ||
      null
    );
  }


  function getRaceIndex(
    currentState
  ) {
    const races =
      getRaces();


    if (!races.length) {
      return 0;
    }


    const raceId =
      normalize(
        currentState?.race
      );


    const explicit =
      number(
        currentState?.raceIndex,
        -1
      );


    if (
      explicit >= 0 &&
      explicit < races.length &&
      normalize(
        races[explicit]?.id
      ) === raceId
    ) {
      return explicit;
    }


    const found =
      races.findIndex(
        race =>
          normalize(
            race.id
          ) === raceId
      );


    return found >= 0
      ? found
      : 0;
  }


  function getCurrentRace(
    currentState
  ) {
    const races =
      getRaces();


    if (!races.length) {
      return null;
    }


    return (
      races[
        getRaceIndex(
          currentState
        )
      ] ||
      races[0]
    );
  }


  function getRaceImage(
    race,
    currentState
  ) {
    if (!race) {
      return "";
    }


    const gender =
      normalize(
        currentState?.gender
      );


    const genderKey =
      (
        gender === "feminino" ||
        gender === "feminina" ||
        gender === "female" ||
        gender === "f"
      )
        ? "feminino"
        : "masculino";


    const assets =
      getAssets();


    /*
     * Catálogo oficial.
     */

    if (
      assets &&
      typeof assets.getRaceImage ===
        "function"
    ) {

      const source =
        assets.getRaceImage(
          race.id,
          genderKey
        );


      if (source) {
        return source;
      }
    }


    /*
     * Catálogo novo.
     */

    if (
      race.images?.[
        genderKey
      ]
    ) {
      return race.images[
        genderKey
      ];
    }


    /*
     * Fallback para o outro gênero.
     */

    const other =
      genderKey ===
        "feminino"
        ? "masculino"
        : "feminino";


    return (
      race.images?.[
        other
      ] ||
      race.image ||
      race.imageUrl ||
      race.src ||
      ""
    );
  }


  function renderRace(
    currentState
  ) {
    const race =
      getCurrentRace(
        currentState
      );


    if (!race) {
      return;
    }


    raceIndex =
      getRaceIndex(
        currentState
      );


    const image =
      $("#raceImage");


    const source =
      getRaceImage(
        race,
        currentState
      );


    /*
     * Imagem principal.
     */

    if (image) {

      image.alt =
        `${race.name || "Raça"} — ${currentState?.gender || ""}`
          .trim();


      if (
        source &&
        image.getAttribute(
          "src"
        ) !== source
      ) {

        image.src =
          source;

      }


      image.hidden =
        !source;
    }


    /*
     * Nome.
     */

    const name =
      $("#raceName");

    if (name) {
      name.textContent =
        race.name ||
        "Raça";
    }


    /*
     * Descrição.
     */

    const description =
      $(
        "#raceShortDescription"
      ) ||
      $(
        "#raceDescriptionText"
      );


    if (description) {
      description.textContent =
        race.description ||
        "";
    }


    /*
     * Perfil.
     */

    const profile =
      $(
        "#raceProfile"
      ) ||
      $(
        "[data-race-profile]"
      );


    if (profile) {
      profile.textContent =
        race.profile ||
        "—";
    }


    /*
     * Característica.
     */

    const feature =
      $(
        "#raceFeature"
      ) ||
      $(
        "[data-race-feature]"
      );


    if (feature) {
      feature.textContent =
        race.feature ||
        "—";
    }


    /*
     * Altura.
     */

    const height =
      getRaceHeight(
        race,
        currentState
      );


    const min =
      $(
        "#raceHeightMin"
      ) ||
      $(
        "[data-race-height-min]"
      );


    const max =
      $(
        "#raceHeightMax"
      ) ||
      $(
        "[data-race-height-max]"
      );


    if (min) {
      min.textContent =
        `${height.min} cm`;
    }


    if (max) {
      max.textContent =
        `${height.max} cm`;
    }


    /*
     * Botão selecionar.
     */

    const selectButton =
      $(
        "#selectRaceButton"
      ) ||
      $(
        ".race-select-indicator"
      );


    if (selectButton) {

      const selected =
        normalize(
          currentState?.race
        ) ===
        normalize(
          race.id
        );


      selectButton.dataset.race =
        race.id;


      selectButton.dataset.raceId =
        race.id;


      selectButton.classList.toggle(
        "is-selected",
        selected
      );


      selectButton.classList.toggle(
        "selected",
        selected
      );


      const label =
        $(
          "#raceSelectedText",
          selectButton
        );


      if (label) {

        label.textContent =
          selected
            ? "✓ Selecionada"
            : "Selecionar";

      } else {

        selectButton.textContent =
          selected
            ? "✓ Selecionada"
            : "Selecionar";

      }

    }


    renderRaceDots(
      currentState
    );


    /*
     * Informa ao renderizador da aparência
     * qual raça/gênero está ativo.
     */

    if (image) {

      image.dataset.race =
        race.id;

      image.dataset.gender =
        normalize(
          currentState?.gender
        );
    }

  }


  function renderRaceDots(
    currentState
  ) {

    const container =
      $("#raceDots");


    if (!container) {
      return;
    }


    const races =
      getRaces();


    const active =
      getRaceIndex(
        currentState
      );


    container.innerHTML =
      "";


    races.forEach(
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
          "race-dot";


        button.dataset.action =
          "race-goto";


        button.dataset.raceIndex =
          String(
            index
          );


        button.setAttribute(
          "aria-label",
          `Escolher ${race.name}`
        );


        if (
          index === active
        ) {

          button.classList.add(
            "active"
          );

          button.setAttribute(
            "aria-current",
            "true"
          );

        }


        container.appendChild(
          button
        );

      }
    );
  }


  function getRaceHeight(
    race,
    currentState
  ) {

    const assets =
      getAssets();


    if (
      assets &&
      typeof assets.getRaceHeight ===
        "function"
    ) {

      const value =
        assets.getRaceHeight(
          race?.id ||
          currentState?.race
        );


      if (value) {

        return {
          min:
            number(
              value.min,
              150
            ),

          max:
            number(
              value.max,
              200
            )
        };

      }
    }


    return {

      min:
        number(
          race?.height?.min,
          150
        ),

      max:
        number(
          race?.height?.max,
          200
        )

    };
  }


  /* =========================================================
     RAÇA — AÇÕES
     ========================================================= */

  function nextRace() {

    const races =
      getRaces();


    if (!races.length) {
      return false;
    }


    const current =
      getRaceIndex(
        getCurrentState()
      );


    const next =
      (
        current +
        1
      ) %
      races.length;


    const race =
      races[next];


    const core =
      getCore();


    if (
      core &&
      typeof core.selectRace ===
        "function"
    ) {

      core.selectRace(
        race.id,
        next
      );


      return true;
    }


    return false;
  }


  function previousRace() {

    const races =
      getRaces();


    if (!races.length) {
      return false;
    }


    const current =
      getRaceIndex(
        getCurrentState()
      );


    const previous =
      (
        current -
        1 +
        races.length
      ) %
      races.length;


    const race =
      races[previous];


    const core =
      getCore();


    if (
      core &&
      typeof core.selectRace ===
        "function"
    ) {

      core.selectRace(
        race.id,
        previous
      );


      return true;
    }


    return false;
  }


  function gotoRace(
    index
  ) {

    const races =
      getRaces();


    if (!races.length) {
      return false;
    }


    const target =
      clamp(
        number(
          index,
          0
        ),
        0,
        races.length - 1
      );


    const race =
      races[target];


    return Boolean(
      getCore()
        ?.selectRace?.(
          race.id,
          target
        )
    );
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance(
    currentState
  ) {

    const race =
      getCurrentRace(
        currentState
      );


    const height =
      getRaceHeight(
        race,
        currentState
      );


    const currentHeight =
      clamp(
        number(
          currentState?.appearance?.height,
          (
            height.min +
            height.max
          ) / 2
        ),
        height.min,
        height.max
      );


    const slider =
      $("#appearanceHeight");


    if (slider) {

      slider.min =
        String(
          height.min
        );


      slider.max =
        String(
          height.max
        );


      slider.step =
        "1";


      slider.value =
        String(
          currentHeight
        );

    }


    const value =
      $("#appearanceHeightValue");


    if (value) {

      value.textContent =
        `${(
          currentHeight /
          100
        ).toFixed(2)} m`;

    }


    const min =
      $("#appearanceHeightMin");


    if (min) {

      min.textContent =
        `${height.min} cm`;

    }


    const max =
      $("#appearanceHeightMax");


    if (max) {

      max.textContent =
        `${height.max} cm`;

    }


    /*
     * Garante que o renderizador simples da imagem
     * seja atualizado.
     */

    window.dispatchEvent(
      new CustomEvent(
        "aerion:personagem:render",
        {
          detail: {
            state:
              currentState
          }
        }
      )
    );
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function renderAnimalha(
    currentState
  ) {

    const selectedCategory =
      normalize(
        currentState?.animalhaCategory
      );


    $$(
      "[data-animalha-category]"
    )
      .forEach(
        element => {

          const selected =
            normalize(
              element.dataset.animalhaCategory
            ) ===
            selectedCategory;


          element.classList.toggle(
            "selected",
            selected
          );


          element.classList.toggle(
            "is-selected",
            selected
          );

        }
      );


    $$(
      "[data-animalha]"
    )
      .forEach(
        element => {

          const animalId =
            normalize(
              element.dataset.animalha
            );


          const selected =
            animalId ===
            normalize(
              currentState?.animalha
            );


          element.classList.toggle(
            "selected",
            selected
          );


          element.classList.toggle(
            "is-selected",
            selected
          );

        }
      );
  }


  /* =========================================================
     CLASSES
     ========================================================= */

  function renderClasses(
    currentState
  ) {

    const selected =
      normalize(
        currentState?.class
      );


    $$(

      "[data-class-id], [data-class]"

    )
      .forEach(
        card => {

          const id =
            normalize(
              card.dataset.classId ||
              card.dataset.class
            );


          const active =
            id ===
            selected;


          card.classList.toggle(
            "selected",
            active
          );


          card.classList.toggle(
            "is-selected",
            active
          );


          card.setAttribute(
            "aria-selected",
            active
              ? "true"
              : "false"
          );

        }
      );
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTE_IDS = [
    "forca",
    "vigor",
    "agilidade",
    "precisao",
    "intelecto",
    "controle",
    "presenca",
    "percepcao"
  ];


  function normalizeAttribute(
    value
  ) {

    const id =
      normalize(
        value
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


  function renderAttributes(
    currentState
  ) {

    const attributes =
      currentState?.attributes ||
      {};


    $$(
      "[data-attribute]"
    )
      .forEach(
        element => {

          const id =
            normalizeAttribute(
              element.dataset.attribute
            );


          if (
            !ATTRIBUTE_IDS.includes(
              id
            )
          ) {

            return;
          }


          const value =
            attributes[id];


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
              "—";

          }

        }
      );


    renderAttributeGraph(
      currentState
    );
  }


  /* =========================================================
     GRÁFICO DE ATRIBUTOS
     ========================================================= */

  function renderAttributeGraph(
    currentState
  ) {

    const attributes =
      currentState?.attributes ||
      {};


    /*
     * 1. Atualiza qualquer elemento que use
     * data-attribute-value.
     */

    $$(
      "[data-attribute-value]"
    )
      .forEach(
        element => {

          const id =
            normalizeAttribute(
              element.dataset.attributeValue
            );


          element.textContent =
            attributes[id] ??
            "—";

        }
      );


    /*
     * 2. Atualiza variáveis CSS para gráficos
     * existentes no projeto.
     */

    const graph =
      $(
        "[data-attribute-graph]"
      );


    if (
      graph
    ) {

      ATTRIBUTE_IDS.forEach(
        id => {

          const value =
            number(
              attributes[id],
              0
            );


          graph.style.setProperty(
            `--attribute-${id}`,
            String(
              value
            )
          );

        }
      );


      graph.dataset.updated =
        String(
          Date.now()
        );

    }


    /*
     * 3. Informa ao sistema de gráfico.
     */

    window.dispatchEvent(
      new CustomEvent(
        "aerion:attributes:graph",
        {
          detail: {
            attributes:
              {
                ...attributes
              }
          }
        }
      )
    );
  }


  /* =========================================================
     DADOS
     ========================================================= */

  function renderDice(
    currentState
  ) {

    const assigned =
      currentState?.assignedDice ||
      {};


    /*
     * Cards ligados diretamente ao atributo.
     */

    $$(
      "[data-attribute-die]"
    )
      .forEach(
        element => {

          const attribute =
            normalizeAttribute(
              element.dataset.attributeDie
            );


          const diceId =
            assigned[
              attribute
            ] ||
            "";


          element.dataset.assignedDice =
            diceId;


          element.classList.toggle(
            "is-assigned",
            Boolean(
              diceId
            )
          );


          const label =
            $(
              "[data-die-label]",
              element
            );


          if (label) {

            label.textContent =
              diceId ||
              "Adicionar dado";

          }

        }
      );


    /*
     * Elementos específicos do dado atribuído.
     */

    $$(
      "[data-dice-assigned]"
    )
      .forEach(
        element => {

          const attribute =
            normalizeAttribute(
              element.dataset.diceAssigned
            );


          element.textContent =
            assigned[
              attribute
            ] ||
            "—";

        }
      );


    /*
     * Resultados conhecidos.
     */

    const results =
      currentState?.diceResults ||
      {};


    $$(
      "[data-roll-result]"
    )
      .forEach(
        element => {

          const diceId =
            element.dataset.rollResult;


          element.textContent =
            results[
              diceId
            ] ??
            "—";

        }
      );


    $$(
      "[data-attribute-result]"
    )
      .forEach(
        element => {

          const attribute =
            normalizeAttribute(
              element.dataset.attributeResult
            );


          element.textContent =
            currentState?.attributes?.[
              attribute
            ] ??
            "—";

        }
      );


    /*
     * Dados já usados.
     */

    const used =
      new Set(
        Object.values(
          assigned
        )
          .filter(
            Boolean
          )
      );


    $$(
      "[data-dice-id], [data-die-id]"
    )
      .forEach(
        element => {

          const diceId =
            element.dataset.diceId ||
            element.dataset.dieId;


          if (!diceId) {
            return;
          }


          const isUsed =
            used.has(
              diceId
            );


          element.classList.toggle(
            "is-used",
            isUsed
          );

        }
      );
  }


  /* =========================================================
     MANA
     ========================================================= */

  const MANA_META = Object.freeze({

    azul: {
      className:
        "mana-azul",

      label:
        "Mana Azul"
    },

    dourada: {
      className:
        "mana-dourada",

      label:
        "Mana Dourada"
    },

    branca: {
      className:
        "mana-branca",

      label:
        "Mana Branca"
    },

    vermelha: {
      className:
        "mana-vermelha",

      label:
        "Mana Vermelha"
    },

    negra: {
      className:
        "mana-negra",

      label:
        "Mana Negra"
    }

  });


  function renderMana() {

    $(
      ".mana-card"
    );


    $$(
      ".mana-card, .mana-option, [data-mana]"
    )
      .forEach(
        card => {

          const type =
            normalize(
              card.dataset.mana ||
              card.dataset.manaType ||
              card.dataset.type
            );


          const meta =
            MANA_META[
              type
            ];


          if (!meta) {
            return;
          }


          Object.values(
            MANA_META
          )
          .forEach(
            item => {

              card.classList.remove(
                item.className
              );

            }
          );


          card.classList.add(
            "aerion-mana-card",
            meta.className
          );


          card.dataset.manaNormalized =
            type;


          const title =
            $(
              ".mana-name",
              card
            );


          if (
            title &&
            !title.textContent.trim()
          ) {

            title.textContent =
              meta.label;

          }

        }
      );
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function renderAvatar(
    currentState
  ) {

    const image =
      $("#avatarImage");


    const placeholder =
      $("#avatarPlaceholder");


    const removeButton =
      $("#removeAvatarButton");


    if (
      image
    ) {

      if (
        currentState?.avatar
      ) {

        image.src =
          currentState.avatar;

        image.hidden =
          false;

      } else {

        image.removeAttribute(
          "src"
        );

        image.hidden =
          true;

      }

    }


    if (
      placeholder
    ) {

      placeholder.hidden =
        Boolean(
          currentState?.avatar
        );

    }


    if (
      removeButton
    ) {

      removeButton.disabled =
        !currentState?.avatar;

    }
  }


  /* =========================================================
     RENDER GERAL
     ========================================================= */

  function render(
    nextState = null
  ) {

    state =
      nextState ||
      getCurrentState();


    renderNavigation(
      state
    );


    renderRace(
      state
    );


    renderAnimalha(
      state
    );


    renderAppearance(
      state
    );


    renderClasses(
      state
    );


    renderAttributes(
      state
    );


    renderDice(
      state
    );


    renderMana();


    renderAvatar(
      state
    );


    return true;
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


    /*
     * IMPORTANTE:
     * NÃO normalizamos para snake_case aqui.
     *
     * O HTML usa os nomes reais com hífen.
     */

    const action =
      text(
        element.dataset.action
      );


    if (
      !action
    ) {
      return;
    }


    const core =
      getCore();


    /* ---------------------------------------------
       PRÓXIMO
       --------------------------------------------- */

    if (
      action === "next" ||
      action === "next-step"
    ) {

      const result =
        core?.completeCurrentStep?.();


      if (
        result &&
        result.ok === false
      ) {

        toast(
          result.reason ||
          "Conclua esta etapa antes de avançar."
        );


        return;
      }


      const next =
        core?.nextStep?.();


      if (
        next === false
      ) {

        toast(
          "Não é possível avançar ainda."
        );

        return;
      }


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });


      return;
    }


    /* ---------------------------------------------
       VOLTAR
       --------------------------------------------- */

    if (
      action === "previous" ||
      action === "previous-step" ||
      action === "back" ||
      action === "go-back"
    ) {

      core?.previousStep?.();


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });


      return;
    }


    /* ---------------------------------------------
       IR PARA ETAPA
       --------------------------------------------- */

    if (
      action === "go-step"
    ) {

      const target =
        number(
          element.dataset.step,
          0
        );


      const current =
        getCurrentStep(
          getCurrentState()
        );


      /*
       * Não pode pular etapas futuras.
       */

      if (
        target >
        current
      ) {

        toast(
          "Conclua as etapas anteriores primeiro."
        );


        return;
      }


      const result =
        core?.goToStep?.(
          target
        );


      if (
        result === false
      ) {

        toast(
          "Essa etapa ainda está bloqueada."
        );

        return;
      }


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });


      return;
    }


    /* ---------------------------------------------
       RAÇA ANTERIOR
       --------------------------------------------- */

    if (
      action === "race-previous"
    ) {

      previousRace();

      return;
    }


    /* ---------------------------------------------
       RAÇA PRÓXIMA
       --------------------------------------------- */

    if (
      action === "race-next"
    ) {

      nextRace();

      return;
    }


    /* ---------------------------------------------
       IR PARA RAÇA
       --------------------------------------------- */

    if (
      action === "race-goto"
    ) {

      gotoRace(
        element.dataset.raceIndex
      );

      return;
    }


    /* ---------------------------------------------
       SELECIONAR RAÇA
       --------------------------------------------- */

    if (
      action === "select-race" ||
      action === "select-race-current"
    ) {

      const race =
        element.dataset.race ||
        element.dataset.raceId ||
        getCurrentRace(
          getCurrentState()
        )?.id;


      if (
        race
      ) {

        core?.selectRace?.(
          race,
          getRaceIndex(
            getCurrentState()
          )
        );


        toast(
          "Raça selecionada."
        );

      }


      return;
    }


    /* ---------------------------------------------
       ANIMALHA
       --------------------------------------------- */

    if (
      action ===
      "select-animalha-category"
    ) {

      core?.selectAnimalhaCategory?.(
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

      core?.selectAnimalha?.(
        element.dataset.animalha ||
        element.dataset.animalId ||
        ""
      );


      return;
    }


    /* ---------------------------------------------
       CLASSE
       --------------------------------------------- */

    if (
      action ===
      "select-class"
    ) {

      core?.selectClass?.(
        element.dataset.class ||
        element.dataset.classId ||
        ""
      );


      return;
    }


    /* ---------------------------------------------
       DADO — ATRIBUIR
       --------------------------------------------- */

    if (
      action ===
        "assign-die" ||
      action ===
        "assign-dice"
    ) {

      core?.assignDieToAttribute?.(
        element.dataset.diceId ||
        element.dataset.dieId ||
        "",

        element.dataset.attribute ||
        element.dataset.attributeId ||
        ""
      );


      return;
    }


    /* ---------------------------------------------
       DADO — REMOVER
       --------------------------------------------- */

    if (
      action ===
        "remove-die" ||
      action ===
        "remove-dice"
    ) {

      core?.removeDieFromAttribute?.(
        element.dataset.attribute ||
        element.dataset.attributeId ||
        ""
      );


      return;
    }


    /* ---------------------------------------------
       ROLAR ATRIBUTO

       ESTE É O BUG QUE ESTAVA QUEBRADO.

       O HTML usa:
       data-action="roll-attribute"
       --------------------------------------------- */

    if (
      action ===
        "roll-attribute"
    ) {

      const attribute =
        element.dataset.attribute ||
        element.dataset.attributeId;


      if (
        !attribute
      ) {

        toast(
          "Atributo não identificado."
        );


        return;
      }


      const result =
        core?.rollAttribute?.(
          attribute
        );


      if (
        result?.ok
      ) {

        toast(
          `Resultado: ${result.result}`
        );


        announce(
          `Resultado ${result.result}`
        );

      } else {

        toast(
          result?.error ||
          "Nenhum dado atribuído a este atributo."
        );

      }


      return;
    }


    /* ---------------------------------------------
       ROLAR DADO NORMAL
       --------------------------------------------- */

    if (
      action ===
        "roll-die" ||
      action ===
        "roll-dice"
    ) {

      const attribute =
        element.dataset.attribute ||
        element.dataset.attributeId;


      if (
        attribute
      ) {

        const result =
          core?.rollAttribute?.(
            attribute
          );


        if (
          result?.ok
        ) {

          toast(
            `Resultado: ${result.result}`
          );

        } else {

          toast(
            result?.error ||
            "Não foi possível rolar."
          );

        }

      } else {

        const result =
          core?.rollDie?.(
            element.dataset.diceId ||
            element.dataset.dieId ||
            ""
          );


        if (
          result?.ok
        ) {

          toast(
            `Resultado: ${result.result}`
          );

        }

      }


      return;
    }


    /* ---------------------------------------------
       LIMPAR DADOS
       --------------------------------------------- */

    if (
      action ===
        "clear-dice"
    ) {

      core?.clearDiceAssignments?.();


      return;
    }


    /* ---------------------------------------------
       AVATAR
       --------------------------------------------- */

    if (
      action ===
        "remove-avatar"
    ) {

      core?.removeAvatar?.();


      return;
    }

  }


  /* =========================================================
     CAMPOS
     ========================================================= */

  function bindFields() {

    document.addEventListener(
      "input",
      event => {

        const element =
          event.target;


        if (
          !element
        ) {
          return;
        }


        /* -----------------------------------------
           ALTURA
           ----------------------------------------- */

        if (
          element.id ===
          "appearanceHeight"
        ) {

          getCore()
            ?.setAppearance?.(
              "height",
              number(
                element.value
              )
            );


          return;
        }


        /* -----------------------------------------
           APARÊNCIA
           ----------------------------------------- */

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


          getCore()
            ?.setAppearance?.(
              appearanceField,
              value
            );


          return;
        }


        /* -----------------------------------------
           IDENTIDADE
           ----------------------------------------- */

        if (
          element.id ===
          "characterName"
        ) {

          getCore()
            ?.setIdentity?.({
              name:
                element.value
            });


          return;
        }


        if (
          element.id ===
          "characterAge"
        ) {

          getCore()
            ?.setIdentity?.({
              age:
                element.value
            });


          return;
        }


        if (
          element.id ===
          "characterDescription"
        ) {

          getCore()
            ?.setIdentity?.({
              description:
                element.value
            });


          return;
        }


        if (
          element.id ===
          "characterOrigin"
        ) {

          getCore()
            ?.setIdentity?.({
              origin:
                element.value
            });


          return;
        }

      }
    );


    document.addEventListener(
      "change",
      event => {

        const element =
          event.target;


        if (
          !element
        ) {
          return;
        }


        /* -----------------------------------------
           GÊNERO
           ----------------------------------------- */

        if (
          element.name ===
          "gender"
        ) {

          getCore()
            ?.setIdentity?.({
              gender:
                element.value
            });


          return;
        }


        /* -----------------------------------------
           APARÊNCIA
           ----------------------------------------- */

        const appearanceField =
          element.dataset.appearanceField;


        if (
          appearanceField
        ) {

          getCore()
            ?.setAppearance?.(
              appearanceField,
              element.value
            );


          return;
        }


        /* -----------------------------------------
           ATRIBUTO
           ----------------------------------------- */

        const attribute =
          element.dataset.attribute ||
          element.dataset.attributeId;


        if (
          attribute
        ) {

          getCore()
            ?.setAttributeValue?.(
              attribute,
              element.value
            );


          return;
        }


        /* -----------------------------------------
           PERÍCIA
           ----------------------------------------- */

        if (
          element.dataset.skill
        ) {

          getCore()
            ?.setSkill?.(
              element.dataset.skill,
              element.value
            );

        }

      }
    );

  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function bindAvatar() {

    const input =
      $("#avatarInput");


    if (
      !input
    ) {
      return;
    }


    input.addEventListener(
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

          await getCore()
            ?.setAvatarFile?.(
              file
            );

        } catch (
          error
        ) {

          console.error(
            "[AERION] Erro no avatar:",
            error
          );


          toast(
            error?.message ||
            "Não foi possível carregar a imagem."
          );

        }

      }
    );

  }


  /* =========================================================
     EVENTOS DE ESTADO
     ========================================================= */

  function bindStateEvents() {

    window.addEventListener(
      "aerion:ficha:updated",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:navigation:changed",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:race:selected",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:animalha:selected",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:animalha:category-selected",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:class:selected",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:assigned",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:removed",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:cleared",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:rolled",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:appearance:updated",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:mana:updated",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:avatar:updated",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:avatar:removed",
      event => {

        render(
          event?.detail?.state ||
          getCurrentState()
        );

      }
    );


    window.addEventListener(
      "aerion:personagem-assets:ready",
      () => {

        render(
          getCurrentState()
        );

      }
    );

  }


  /* =========================================================
     API
     ========================================================= */

  const API = {

    init() {

      if (
        initialized
      ) {
        render(
          getCurrentState()
        );

        return true;
      }


      initialized =
        true;


      bindFields();

      bindAvatar();

      bindStateEvents();


      render(
        getCurrentState()
      );


      console.info(
        "[AERION][FICHA-RENDER] Inicializado."
      );


      return true;
    },


    render,


    refresh() {

      render(
        getCurrentState()
      );

    },


    nextRace,

    previousRace,

    gotoRace,


    getCurrentRace() {

      return getCurrentRace(
        getCurrentState()
      );

    }

  };


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  window.AERIONFichaRender =
    API;

  window.AERION_FICHA_RENDER =
    API;


  /* =========================================================
     CLIQUES
     ========================================================= */

  /*
   * Um único listener de ações.
   *
   * Isso é importante porque versões anteriores
   * poderiam deixar vários listeners competindo.
   */

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

    },
    true
  );


  /* =========================================================
     BOOT
     ========================================================= */

  function boot() {

    API.init();

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