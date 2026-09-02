/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   CAMADA VISUAL DA FICHA

   RESPONSÁVEL POR:
   - atualizar painéis;
   - atualizar barra de progresso;
   - atualizar abas das etapas;
   - atualizar raça;
   - atualizar Animalha;
   - atualizar aparência;
   - atualizar classes;
   - atualizar atributos;
   - atualizar dados;
   - atualizar mana;
   - atualizar avatar;
   - atualizar técnicas;
   - atualizar inventário;
   - mensagens visuais.

   NÃO RESPONSÁVEL POR:
   - controlar ações [data-action];
   - navegar etapas;
   - realizar rolagens;
   - alterar o estado diretamente;
   - salvar dados;
   - criar SVG.

   O ficha.js é o único dono das ações.

   ========================================================= */

(() => {
  "use strict";


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

  const ATTRIBUTE_IDS = Object.freeze([
    "forca",
    "vigor",
    "agilidade",
    "precisao",
    "intelecto",
    "controle",
    "presenca",
    "percepcao"
  ]);

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
     ESTADO LOCAL
     ========================================================= */

  let state = null;

  let initialized = false;


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
    const core =
      getCore();

    if (
      core &&
      typeof core.getState ===
        "function"
    ) {
      try {
        return core.getState();
      } catch (error) {
        console.warn(
          "[AERION][FICHA-RENDER] Erro ao obter estado:",
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
    let live =
      $("#aerionLiveRegion");

    if (!live) {
      live =
        document.createElement(
          "div"
        );

      live.id =
        "aerionLiveRegion";

      live.className =
        "visually-hidden";

      live.setAttribute(
        "aria-live",
        "polite"
      );

      live.setAttribute(
        "aria-atomic",
        "true"
      );

      document.body.appendChild(
        live
      );
    }

    live.textContent =
      text(message);
  }


  function toast(message) {
    let element =
      $("#aerionToast");

    if (!element) {
      element =
        document.createElement(
          "div"
        );

      element.id =
        "aerionToast";

      element.className =
        "toast";

      document.body.appendChild(
        element
      );
    }

    element.textContent =
      text(message);

    element.hidden =
      false;

    clearTimeout(
      element.__aerionToastTimer
    );

    element.__aerionToastTimer =
      setTimeout(
        () => {
          element.hidden =
            true;
        },
        1800
      );
  }


  /* =========================================================
     ETAPA ATUAL
     ========================================================= */

  function getCurrentStep(
    current = getCurrentState()
  ) {
    return clamp(
      number(
        current?.currentStep,
        0
      ),
      0,
      TOTAL_STEPS - 1
    );
  }


  function getCurrentStepId(
    current = getCurrentState()
  ) {
    return (
      STEP_IDS[
        getCurrentStep(
          current
        )
      ] ||
      STEP_IDS[0]
    );
  }


  /* =========================================================
     DESBLOQUEIO
     ========================================================= */

  function isStepUnlocked(
    index,
    currentState = getCurrentState()
  ) {
    const current =
      getCurrentStep(
        currentState
      );

    /*
     * A etapa atual e anteriores
     * ficam acessíveis.
     */
    if (
      index <=
      current
    ) {
      return true;
    }

    /*
     * A próxima só aparece
     * desbloqueada se a etapa
     * imediatamente anterior
     * estiver concluída.
     */
    return (
      currentState
        ?.completedSteps?.[
          index - 1
        ] === true
    );
  }


  /* =========================================================
     PAINÉIS
     ========================================================= */

  function renderPanels(
    currentState
  ) {
    const current =
      getCurrentStep(
        currentState
      );

    const currentId =
      STEP_IDS[current];


    $$(

      "[data-panel]"

    ).forEach(
      panel => {
        const active =
          normalize(
            panel.dataset.panel
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

        panel.setAttribute(
          "aria-hidden",
          active
            ? "false"
            : "true"
        );
      }
    );


    $$(

      "[data-step-panel]"

    ).forEach(
      panel => {
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
      }
    );
  }


  /* =========================================================
     ABAS DE ETAPAS
     ========================================================= */

  function renderStepTabs(
    currentState
  ) {
    const current =
      getCurrentStep(
        currentState
      );

    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {

          const unlocked =
            isStepUnlocked(
              index,
              currentState
            );

          const active =
            index ===
            current;

          const complete =
            currentState
              ?.completedSteps?.[
                index
              ] === true;


          button.classList.toggle(
            "active",
            active
          );

          button.classList.toggle(
            "locked",
            !unlocked
          );

          button.classList.toggle(
            "completed",
            complete
          );


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


          button.setAttribute(
            "aria-disabled",
            unlocked
              ? "false"
              : "true"
          );
        }
      );
  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function renderProgress(
    currentState
  ) {
    const current =
      getCurrentStep(
        currentState
      );

    const denominator =
      Math.max(
        1,
        TOTAL_STEPS - 1
      );

    const percent =
      Math.round(
        (
          current /
          denominator
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
        STEP_NAMES[0];
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
     * Contador 1/11.
     */
    $$(
      "[data-current-step]"
    ).forEach(
      element => {
        element.textContent =
          String(
            current + 1
          );
      }
    );


    $$(
      "[data-total-steps]"
    ).forEach(
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


    const title =
      $(
        "[data-current-step-title]"
      );

    if (title) {
      title.textContent =
        STEP_NAMES[current] ||
        STEP_NAMES[0];
    }
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
    const id =
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
          id
        ) || null
      );
    }

    return (
      getRaces().find(
        race =>
          normalize(
            race.id
          ) === id
      ) || null
    );
  }


  function getCurrentRace(
    currentState
  ) {
    const races =
      getRaces();

    if (!races.length) {
      return null;
    }

    const explicitIndex =
      number(
        currentState?.raceIndex,
        -1
      );

    const raceId =
      normalize(
        currentState?.race
      );


    /*
     * Primeiro tenta o índice
     * oficial do estado.
     */
    if (
      explicitIndex >= 0 &&
      explicitIndex <
        races.length
    ) {
      const indexedRace =
        races[
          explicitIndex
        ];

      /*
       * Se houver raça selecionada
       * e ela bater com o índice,
       * usamos o índice.
       */
      if (
        !raceId ||
        normalize(
          indexedRace?.id
        ) === raceId
      ) {
        return indexedRace;
      }
    }


    /*
     * Depois procura pelo ID.
     */
    if (raceId) {
      const found =
        races.find(
          race =>
            normalize(
              race.id
            ) === raceId
        );

      if (found) {
        return found;
      }
    }


    /*
     * Último fallback:
     * primeira raça.
     */
    return races[0];
  }


  function getGenderKey(
    currentState
  ) {
    const gender =
      normalize(
        currentState?.gender
      );

    if (
      gender === "feminino" ||
      gender === "feminina" ||
      gender === "female" ||
      gender === "f"
    ) {
      return "feminino";
    }

    return "masculino";
  }


  function getRaceImage(
    race,
    currentState
  ) {
    if (!race) {
      return "";
    }

    const genderKey =
      getGenderKey(
        currentState
      );

    const assets =
      getAssets();


    if (
      assets &&
      typeof assets.getRaceImage ===
        "function"
    ) {
      const result =
        assets.getRaceImage(
          race.id,
          genderKey
        );

      if (result) {
        return result;
      }
    }


    const direct =
      race.images?.[
        genderKey
      ];

    if (direct) {
      return direct;
    }


    const opposite =
      genderKey ===
        "feminino"
        ? "masculino"
        : "feminino";

    return (
      race.images?.[
        opposite
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


    /* -------------------------------------------------------
       IMAGEM
       ------------------------------------------------------- */

    const image =
      $("#raceImage");

    const source =
      getRaceImage(
        race,
        currentState
      );

    if (image) {
      image.alt =
        `${race.name || "Raça"}${currentState?.gender ? ` — ${currentState.gender}` : ""}`;

      if (
        source &&
        image.src !== source
      ) {
        image.src =
          source;
      }

      image.hidden =
        !source;
    }


    /* -------------------------------------------------------
       NOME
       ------------------------------------------------------- */

    const name =
      $("#raceName");

    if (name) {
      name.textContent =
        race.name ||
        "Raça";
    }


    /* -------------------------------------------------------
       DESCRIÇÃO
       ------------------------------------------------------- */

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
        "Escolha uma raça.";
    }


    /* -------------------------------------------------------
       PERFIL
       ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       CARACTERÍSTICA
       ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       ALTURA
       ------------------------------------------------------- */

    const heightMin =
      $("#raceHeightMin");

    const heightMax =
      $("#raceHeightMax");

    if (heightMin) {
      heightMin.textContent =
        race.height?.min
          ? `${race.height.min} cm`
          : "—";
    }

    if (heightMax) {
      heightMax.textContent =
        race.height?.max
          ? `${race.height.max} cm`
          : "—";
    }


    /* -------------------------------------------------------
       TEXTO DO BOTÃO
       ------------------------------------------------------- */

    const selectedText =
      $("#raceSelectedText");

    if (selectedText) {
      const selected =
        normalize(
          currentState?.race
        ) ===
        normalize(
          race.id
        );

      const animalhaSelected =
        selected &&
        normalize(
          race.id
        ) === "animalha" &&
        Boolean(
          text(
            currentState?.animalha
          )
        );

      if (
        animalhaSelected
      ) {
        selectedText.textContent =
          "Selecionada";
      } else if (
        selected
      ) {
        selectedText.textContent =
          "Selecionada";
      } else {
        selectedText.textContent =
          "Selecionar";
      }
    }


    /* -------------------------------------------------------
       ESTADO VISUAL DO CARTÃO
       ------------------------------------------------------- */

    const card =
      $("#raceCard");

    if (card) {
      const selected =
        normalize(
          currentState?.race
        ) ===
        normalize(
          race.id
        );

      card.classList.toggle(
        "selected",
        selected
      );

      card.classList.toggle(
        "is-selected",
        selected
      );
    }


    /*
     * Caso o HTML tenha um rótulo
     * de gênero.
     */
    const genderLabel =
      $("#raceGenderLabel");

    if (genderLabel) {
      genderLabel.textContent =
        race.name ||
        "RAÇA";
    }


    renderRaceDots(
      currentState
    );
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

    if (!races.length) {
      container.innerHTML =
        "";

      return;
    }


    const currentIndex =
      clamp(
        number(
          currentState?.raceIndex,
          0
        ),
        0,
        races.length - 1
      );


    /*
     * Recria somente a estrutura
     * dos indicadores.
     */
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
          "carousel-dot";

        if (
          index ===
          currentIndex
        ) {
          button.classList.add(
            "active"
          );
        }

        button.dataset.action =
          "race-goto";

        button.dataset.raceIndex =
          String(index);

        button.setAttribute(
          "aria-label",
          `Ir para ${race.name || `raça ${index + 1}`}`
        );

        button.setAttribute(
          "aria-current",
          index ===
            currentIndex
            ? "true"
            : "false"
        );

        container.appendChild(
          button
        );
      }
    );
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function getAnimalhaCategories() {
    const assets =
      getAssets();

    if (
      Array.isArray(
        assets?.animalhaCategories
      )
    ) {
      return assets.animalhaCategories;
    }

    if (
      Array.isArray(
        assets?.ANIMALHA_CATEGORIES
      )
    ) {
      return assets.ANIMALHA_CATEGORIES;
    }

    return [];
  }


  function getAnimalhaAnimals() {
    const assets =
      getAssets();

    /*
     * Formato objeto:
     * {
     *   gato: {...},
     *   pantera: {...}
     * }
     */
    if (
      assets?.animalhaAnimals &&
      typeof assets.animalhaAnimals ===
        "object"
    ) {
      return Object.values(
        assets.animalhaAnimals
      );
    }


    if (
      Array.isArray(
        assets?.animalhaAnimals
      )
    ) {
      return assets.animalhaAnimals;
    }


    if (
      Array.isArray(
        assets?.animalhas
      )
    ) {
      return assets.animalhas;
    }


    return [];
  }


  function getAnimalhaAnimal(
    animalId
  ) {
    const id =
      normalize(
        animalId
      );

    return (
      getAnimalhaAnimals().find(
        animal =>
          normalize(
            animal.id
          ) === id
      ) ||
      null
    );
  }


  function getAnimalhaCategoryId(
    animal
  ) {
    if (!animal) {
      return "";
    }

    return normalize(
      animal.category ||
      animal.animalhaCategory ||
      animal.group ||
      ""
    );
  }


  function renderAnimalha(
    currentState
  ) {
    const container =
      $(
        "[data-animalha-variants]"
      );

    /*
     * Animalha só aparece
     * para a raça Animalha.
     */
    const isAnimalha =
      normalize(
        currentState?.race
      ) ===
      "animalha";


    if (container) {
      container.hidden =
        !isAnimalha;

      container.classList.toggle(
        "is-visible",
        isAnimalha
      );
    }


    if (!isAnimalha) {
      return;
    }


    renderAnimalhaCategories(
      currentState
    );

    renderAnimalhaVariants(
      currentState
    );
  }


  function renderAnimalhaCategories(
    currentState
  ) {
    const container =
      $(
        "[data-animalha-categories]"
      );

    if (!container) {
      return;
    }


    const categories =
      getAnimalhaCategories();

    const selected =
      normalize(
        currentState?.animalhaCategory
      );


    /*
     * Se o catálogo não fornecer
     * categorias, preserva o HTML
     * existente.
     */
    if (!categories.length) {

      $$(
        "[data-animalha-category]",
        container
      ).forEach(
        button => {

          const id =
            normalize(
              button.dataset.animalhaCategory
            );

          button.classList.toggle(
            "selected",
            id === selected
          );

          button.classList.toggle(
            "is-selected",
            id === selected
          );
        }
      );

      return;
    }


    container.innerHTML =
      "";


    categories.forEach(
      category => {

        const id =
          normalize(
            category.id
          );

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "animalha-category-card";

        button.dataset.action =
          "select-animalha-category";

        button.dataset.animalhaCategory =
          id;

        button.classList.toggle(
          "selected",
          id === selected
        );

        button.classList.toggle(
          "is-selected",
          id === selected
        );

        button.setAttribute(
          "aria-pressed",
          id === selected
            ? "true"
            : "false"
        );


        const icon =
          document.createElement(
            "span"
          );

        icon.className =
          "animalha-category-icon";

        icon.setAttribute(
          "aria-hidden",
          "true"
        );

        icon.textContent =
          category.icon ||
          "◇";


        const title =
          document.createElement(
            "strong"
          );

        title.textContent =
          category.name ||
          id;


        const description =
          document.createElement(
            "small"
          );

        description.textContent =
          category.description ||
          "";


        button.appendChild(
          icon
        );

        button.appendChild(
          title
        );

        button.appendChild(
          description
        );

        container.appendChild(
          button
        );
      }
    );
  }


  function renderAnimalhaVariants(
    currentState
  ) {
    /*
     * Pode haver diferentes
     * seletores no HTML.
     */
    const container =
      $(
        "[data-animalha-options]"
      ) ||
      $(
        "[data-animalha-animals]"
      ) ||
      $(
        "[data-animalha-variations]"
      );


    if (!container) {
      return;
    }


    const selectedCategory =
      normalize(
        currentState?.animalhaCategory
      );

    const selectedAnimal =
      normalize(
        currentState?.animalha
      );

    const animals =
      getAnimalhaAnimals();


    /*
     * Remove elementos antigos
     * somente se o catálogo
     * realmente existir.
     */
    if (
      !animals.length
    ) {
      $$(
        "[data-action='select-animalha']",
        container
      ).forEach(
        button => {

          const animal =
            normalize(
              button.dataset.animalha
            );

          const info =
            getAnimalhaAnimal(
              animal
            );

          const category =
            getAnimalhaCategoryId(
              info
            );

          const visible =
            !selectedCategory ||
            category ===
              selectedCategory;

          button.hidden =
            !visible;

          button.classList.toggle(
            "selected",
            animal ===
              selectedAnimal
          );
        }
      );

      return;
    }


    container.innerHTML =
      "";


    const filtered =
      animals.filter(
        animal => {

          const category =
            getAnimalhaCategoryId(
              animal
            );

          return (
            !selectedCategory ||
            category ===
              selectedCategory
          );
        }
      );


    /*
     * Nenhum animal na categoria.
     */
    if (
      !filtered.length
    ) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "animalha-empty";

      empty.textContent =
        selectedCategory
          ? "Nenhuma variação disponível nesta categoria."
          : "Escolha uma categoria para ver as variações.";

      container.appendChild(
        empty
      );

      return;
    }


    filtered.forEach(
      animal => {

        const id =
          normalize(
            animal.id
          );

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "animalha-option-card";

        button.dataset.action =
          "select-animalha";

        button.dataset.animalha =
          id;


        const selected =
          id ===
          selectedAnimal;

        button.classList.toggle(
          "selected",
          selected
        );

        button.classList.toggle(
          "is-selected",
          selected
        );

        button.setAttribute(
          "aria-pressed",
          selected
            ? "true"
            : "false"
        );


        /*
         * Imagem da variação,
         * quando o catálogo possuir.
         */
        const imageSource =
          animal.image ||
          animal.imageUrl ||
          animal.src ||
          animal.icon ||
          "";


        if (imageSource) {
          const image =
            document.createElement(
              "img"
            );

          image.src =
            imageSource;

          image.alt =
            animal.name ||
            id;

          image.loading =
            "lazy";

          image.decoding =
            "async";

          image.className =
            "animalha-option-image";

          button.appendChild(
            image
          );
        } else {
          const icon =
            document.createElement(
              "span"
            );

          icon.className =
            "animalha-option-icon";

          icon.setAttribute(
            "aria-hidden",
            "true"
          );

          icon.textContent =
            animal.icon ||
            "◇";

          button.appendChild(
            icon
          );
        }


        const info =
          document.createElement(
            "span"
          );

        info.className =
          "animalha-option-info";


        const name =
          document.createElement(
            "strong"
          );

        name.textContent =
          animal.name ||
          id;


        const description =
          document.createElement(
            "small"
          );

        description.textContent =
          animal.description ||
          "";


        info.appendChild(
          name
        );

        if (
          animal.description
        ) {
          info.appendChild(
            description
          );
        }


        button.appendChild(
          info
        );


        container.appendChild(
          button
        );
      }
    );
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance(
    currentState
  ) {
    const race =
      getRace(
        currentState?.race
      );

    const slider =
      $("#appearanceHeight");

    const valueElement =
      $("#appearanceHeightValue");

    const minElement =
      $("#appearanceHeightMin");

    const maxElement =
      $("#appearanceHeightMax");


    if (
      !race?.height
    ) {
      if (slider) {
        slider.disabled =
          true;
      }

      return;
    }


    const min =
      number(
        race.height.min,
        0
      );

    const max =
      number(
        race.height.max,
        min
      );

    const currentHeight =
      number(
        currentState
          ?.appearance
          ?.height,
        Math.round(
          (
            min +
            max
          ) / 2
        )
      );


    if (slider) {
      slider.min =
        String(min);

      slider.max =
        String(max);

      slider.step =
        "1";

      slider.value =
        String(
          clamp(
            currentHeight,
            min,
            max
          )
        );

      slider.disabled =
        false;
    }


    if (valueElement) {
      valueElement.textContent =
        `${clamp(
          currentHeight,
          min,
          max
        )} cm`;
    }


    if (minElement) {
      minElement.textContent =
        `${min} cm`;
    }


    if (maxElement) {
      maxElement.textContent =
        `${max} cm`;
    }
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

    ).forEach(
      card => {

        const id =
          normalize(
            card.dataset.classId ||
            card.dataset.class ||
            ""
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
          "aria-pressed",
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

  function normalizeAttribute(
    value
  ) {
    return normalize(
      value
    );
  }


  function renderAttributes(
    currentState
  ) {
    const attributes =
      currentState?.attributes ||
      {};


    /*
     * Elementos que usam:
     * data-attribute
     */
    $$(
      "[data-attribute]"
    ).forEach(
      element => {

        /*
         * Não processar botões de rolagem
         * aqui; eles pertencem ao dado.
         */
        if (
          element.dataset.action ===
          "roll-attribute"
        ) {
          return;
        }

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
            value ?? "";
        } else {
          element.textContent =
            value ?? "—";
        }
      }
    );


    /*
     * Elementos que usam:
     * data-attribute-value
     */
    $$(
      "[data-attribute-value]"
    ).forEach(
      element => {

        const id =
          normalizeAttribute(
            element.dataset
              .attributeValue
          );

        element.textContent =
          attributes[id] ??
          "—";
      }
    );


    /*
     * Elementos que exibem apenas
     * o nome do atributo.
     */
    $$(
      "[data-attribute-name]"
    ).forEach(
      element => {

        const id =
          normalizeAttribute(
            element.dataset
              .attributeName
          );

        element.textContent =
          ATTRIBUTE_NAMES[id] ||
          id;
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


    const graph =
      $(
        "[data-attribute-graph]"
      );


    if (graph) {

      ATTRIBUTE_IDS.forEach(
        id => {

          const raw =
            attributes[id];

          const value =
            Number.isFinite(
              Number(raw)
            )
              ? Number(raw)
              : 0;


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
     * Suporte a elementos individuais
     * do gráfico.
     */
    $$(
      "[data-attribute-bar]"
    ).forEach(
      element => {

        const id =
          normalizeAttribute(
            element.dataset
              .attributeBar
          );

        if (
          !ATTRIBUTE_IDS.includes(
            id
          )
        ) {
          return;
        }

        const value =
          number(
            attributes[id],
            0
          );

        element.style.setProperty(
          "--attribute-value",
          String(
            value
          )
        );

        element.setAttribute(
          "aria-valuenow",
          String(
            value
          )
        );
      }
    );


    window.dispatchEvent(
      new CustomEvent(
        "aerion:attributes:graph",
        {
          detail: {
            attributes: {
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

    const results =
      currentState?.diceResults ||
      {};


    /*
     * Cards associados aos atributos.
     */
    $$(
      "[data-attribute-die]"
    ).forEach(
      element => {

        const attribute =
          normalizeAttribute(
            element.dataset
              .attributeDie
          );

        if (
          !ATTRIBUTE_IDS.includes(
            attribute
          )
        ) {
          return;
        }

        const diceId =
          assigned[
            attribute
          ] || "";


        element.dataset.assignedDice =
          diceId;


        element.classList.toggle(
          "is-assigned",
          Boolean(
            diceId
          )
        );


        element.classList.toggle(
          "assigned",
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


        const result =
          $(
            "[data-die-result]",
            element
          );

        if (result) {

          result.textContent =
            diceId
              ? (
                  results[
                    diceId
                  ] ??
                  "—"
                )
              : "—";
        }
      }
    );


    /*
     * Texto do dado atribuído.
     */
    $$(
      "[data-dice-assigned]"
    ).forEach(
      element => {

        const attribute =
          normalizeAttribute(
            element.dataset
              .diceAssigned
          );

        element.textContent =
          assigned[
            attribute
          ] ||
          "—";
      }
    );


    /*
     * Resultado pelo ID do dado.
     */
    $$(
      "[data-roll-result]"
    ).forEach(
      element => {

        const diceId =
          element.dataset
            .rollResult;

        element.textContent =
          results[
            diceId
          ] ??
          "—";
      }
    );


    /*
     * Resultado pelo atributo.
     */
    $$(
      "[data-attribute-result]"
    ).forEach(
      element => {

        const attribute =
          normalizeAttribute(
            element.dataset
              .attributeResult
          );

        element.textContent =
          currentState
            ?.attributes?.[
              attribute
            ] ??
          "—";
      }
    );


    /*
     * Marca dados utilizados.
     */
    const used =
      new Set(
        Object.values(
          assigned
        ).filter(Boolean)
      );


    $$(
      "[data-dice-id], [data-die-id]"
    ).forEach(
      element => {

        const diceId =
          element.dataset.diceId ||
          element.dataset.dieId ||
          "";

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

        element.classList.toggle(
          "used",
          isUsed
        );
      }
    );


    /*
     * Resultado da última rolagem.
     */
    const lastRoll =
      currentState?.lastRoll;

    $$(
      "[data-last-roll-result]"
    ).forEach(
      element => {

        element.textContent =
          lastRoll?.result ??
          "—";
      }
    );


    $$(
      "[data-last-roll-dice]"
    ).forEach(
      element => {

        element.textContent =
          lastRoll?.type ||
          "—";
      }
    );


    $$(
      "[data-last-roll-attribute]"
    ).forEach(
      element => {

        const id =
          normalizeAttribute(
            lastRoll?.attributeId
          );

        element.textContent =
          ATTRIBUTE_NAMES[id] ||
          "—";
      }
    );
  }


  /* =========================================================
     MANA
     ========================================================= */

  const MANA_META =
    Object.freeze({

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


  function renderMana(
    currentState
  ) {
    const mana =
      currentState?.mana ||
      {};


    const current =
      Math.max(
        0,
        number(
          mana.current,
          0
        )
      );

    const max =
      Math.max(
        0,
        number(
          mana.max,
          0
        )
      );


    /*
     * Valor atual.
     */
    $$(
      "[data-mana-current]"
    ).forEach(
      element => {
        element.textContent =
          String(
            current
          );
      }
    );


    /*
     * Valor máximo.
     */
    $$(
      "[data-mana-max]"
    ).forEach(
      element => {
        element.textContent =
          String(
            max
          );
      }
    );


    /*
     * Combinação atual/máxima.
     */
    $$(
      "[data-mana-value]"
    ).forEach(
      element => {
        element.textContent =
          `${current}/${max}`;
      }
    );


    /*
     * Barra.
     */
    $$(
      "[data-mana-bar]"
    ).forEach(
      element => {

        const percent =
          max > 0
            ? (
                current /
                max
              ) * 100
            : 0;

        element.style.width =
          `${clamp(
            percent,
            0,
            100
          )}%`;

        element.setAttribute(
          "aria-valuemin",
          "0"
        );

        element.setAttribute(
          "aria-valuemax",
          String(
            max
          )
        );

        element.setAttribute(
          "aria-valuenow",
          String(
            current
          )
        );
      }
    );


    /*
     * Tipo de mana.
     */
    const normalizedType =
      normalize(
        mana.type
      );


    $$(
      ".mana-card, .mana-option, [data-mana]"
    ).forEach(
      card => {

        const type =
          normalize(
            card.dataset.mana ||
            card.dataset.manaType ||
            card.dataset.type ||
            ""
          );

        /*
         * Remove classes anteriores.
         */
        Object.values(
          MANA_META
        ).forEach(
          meta => {
            card.classList.remove(
              meta.className
            );
          }
        );


        const meta =
          MANA_META[type];

        if (meta) {
          card.classList.add(
            "aerion-mana-card",
            meta.className
          );
        }


        if (
          normalizedType &&
          type ===
            normalizedType
        ) {
          card.classList.add(
            "selected",
            "is-selected"
          );

          card.setAttribute(
            "aria-pressed",
            "true"
          );
        } else {
          card.classList.remove(
            "selected",
            "is-selected"
          );

          card.setAttribute(
            "aria-pressed",
            "false"
          );
        }


        const title =
          $(
            ".mana-name",
            card
          );

        if (
          title &&
          meta &&
          !title.textContent.trim()
        ) {
          title.textContent =
            meta.label;
        }
      }
    );
  }


  /* =========================================================
     PODER
     ========================================================= */

  function renderPower(
    currentState
  ) {
    $$(
      "[data-power-primary]"
    ).forEach(
      element => {
        element.textContent =
          currentState
            ?.primaryPower ||
          "—";
      }
    );


    $$(
      "[data-power-parallel]"
    ).forEach(
      element => {
        element.textContent =
          currentState
            ?.parallelPower ||
          "—";
      }
    );


    $$(
      "[data-primary-power]"
    ).forEach(
      element => {

        if (
          element.matches(
            "input, textarea, select"
          )
        ) {
          element.value =
            currentState
              ?.primaryPower ||
            "";
        }
      }
    );


    $$(
      "[data-parallel-power]"
    ).forEach(
      element => {

        if (
          element.matches(
            "input, textarea, select"
          )
        ) {
          element.value =
            currentState
              ?.parallelPower ||
            "";
        }
      }
    );
  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function renderSkills(
    currentState
  ) {
    const skills =
      currentState?.skills ||
      {};


    $$(
      "[data-skill]"
    ).forEach(
      element => {

        const id =
          normalize(
            element.dataset.skill
          );

        if (
          !Object.prototype.hasOwnProperty.call(
            skills,
            id
          )
        ) {
          return;
        }

        const value =
          number(
            skills[id],
            0
          );


        if (
          element.matches(
            "input, select, textarea"
          )
        ) {
          element.value =
            String(
              value
            );
        } else {
          element.textContent =
            String(
              value
            );
        }
      }
    );


    $$(
      "[data-skill-value]"
    ).forEach(
      element => {

        const id =
          normalize(
            element.dataset.skillValue
          );

        element.textContent =
          String(
            number(
              skills[id],
              0
            )
          );
      }
    );
  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function renderTechniques(
    currentState
  ) {
    const techniques =
      Array.isArray(
        currentState?.techniques
      )
        ? currentState.techniques
        : [];


    $$(
      "[data-techniques-count]"
    ).forEach(
      element => {
        element.textContent =
          String(
            techniques.length
          );
      }
    );


    const lists =
      $$(
        "[data-techniques-list]"
      );


    lists.forEach(
      list => {

        list.innerHTML =
          "";


        if (
          !techniques.length
        ) {
          const empty =
            document.createElement(
              "div"
            );

          empty.className =
            "empty-state";

          empty.textContent =
            "Nenhuma técnica adicionada.";

          list.appendChild(
            empty
          );

          return;
        }


        techniques.forEach(
          (
            technique,
            index
          ) => {

            const item =
              document.createElement(
                "div"
              );

            item.className =
              "technique-item";


            const title =
              document.createElement(
                "strong"
              );

            title.textContent =
              typeof technique ===
                "string"
                ? technique
                : (
                    technique?.name ||
                    `Técnica ${index + 1}`
                  );


            item.appendChild(
              title
            );


            if (
              technique?.description
            ) {
              const description =
                document.createElement(
                  "small"
                );

              description.textContent =
                technique.description;

              item.appendChild(
                description
              );
            }


            const remove =
              document.createElement(
                "button"
              );

            remove.type =
              "button";

            remove.className =
              "button button-ghost";

            remove.dataset.action =
              "remove-technique";

            remove.dataset.index =
              String(index);

            remove.textContent =
              "Remover";


            item.appendChild(
              remove
            );


            list.appendChild(
              item
            );
          }
        );
      }
    );
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function renderInventory(
    currentState
  ) {
    const items =
      Array.isArray(
        currentState?.inventory
      )
        ? currentState.inventory
        : [];


    $$(
      "[data-inventory-count]"
    ).forEach(
      element => {
        element.textContent =
          String(
            items.length
          );
      }
    );


    $$(
      "[data-inventory-list]"
    ).forEach(
      list => {

        list.innerHTML =
          "";


        if (
          !items.length
        ) {
          const empty =
            document.createElement(
              "div"
            );

          empty.className =
            "empty-state";

          empty.textContent =
            "Nenhum item adicionado.";

          list.appendChild(
            empty
          );

          return;
        }


        items.forEach(
          (
            item,
            index
          ) => {

            const row =
              document.createElement(
                "div"
              );

            row.className =
              "inventory-item";


            const name =
              document.createElement(
                "strong"
              );

            name.textContent =
              typeof item ===
                "string"
                ? item
                : (
                    item?.name ||
                    `Item ${index + 1}`
                  );


            row.appendChild(
              name
            );


            const quantity =
              number(
                typeof item ===
                  "object"
                  ? item?.quantity
                  : 1,
                1
              );


            const quantityElement =
              document.createElement(
                "span"
              );

            quantityElement.className =
              "inventory-quantity";

            quantityElement.textContent =
              `x${quantity}`;


            row.appendChild(
              quantityElement
            );


            const remove =
              document.createElement(
                "button"
              );

            remove.type =
              "button";

            remove.className =
              "button button-ghost";

            remove.dataset.action =
              "remove-inventory";

            remove.dataset.index =
              String(index);

            remove.textContent =
              "Remover";


            row.appendChild(
              remove
            );


            list.appendChild(
              row
            );
          }
        );
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


    const hasAvatar =
      Boolean(
        currentState?.avatar
      );


    if (image) {

      if (hasAvatar) {

        if (
          image.src !==
          currentState.avatar
        ) {
          image.src =
            currentState.avatar;
        }

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


    if (placeholder) {
      placeholder.hidden =
        hasAvatar;
    }


    if (removeButton) {
      removeButton.disabled =
        !hasAvatar;
    }
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function renderIdentity(
    currentState
  ) {
    const values = {
      characterName:
        currentState?.name ||
        "",

      characterAge:
        currentState?.age ||
        "",

      characterDescription:
        currentState?.description ||
        "",

      characterOrigin:
        currentState?.origin ||
        ""
    };


    Object.entries(
      values
    ).forEach(
      ([id, value]) => {

        const element =
          document.getElementById(
            id
          );

        if (!element) {
          return;
        }

        if (
          element.matches(
            "input, textarea, select"
          )
        ) {
          if (
            element.value !==
            String(value)
          ) {
            element.value =
              String(value);
          }
        }
      }
    );


    $$(
      "input[name='gender']"
    ).forEach(
      input => {
        input.checked =
          normalize(
            input.value
          ) ===
          normalize(
            currentState?.gender
          );
      }
    );


    $$(
      "[data-character-name]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.name ||
          "—";
      }
    );


    $$(
      "[data-character-age]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.age ||
          "—";
      }
    );


    $$(
      "[data-character-origin]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.origin ||
          "—";
      }
    );
  }


  /* =========================================================
     REVISÃO
     ========================================================= */

  function renderReview(
    currentState
  ) {
    const race =
      getRace(
        currentState?.race
      );


    $$(
      "[data-review-name]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.name ||
          "—";
      }
    );


    $$(
      "[data-review-gender]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.gender ||
          "—";
      }
    );


    $$(
      "[data-review-race]"
    ).forEach(
      element => {
        element.textContent =
          race?.name ||
          "—";
      }
    );


    $$(
      "[data-review-animalha]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.animalha ||
          "—";
      }
    );


    $$(
      "[data-review-class]"
    ).forEach(
      element => {
        element.textContent =
          currentState?.class ||
          "—";
      }
    );


    $$(
      "[data-review-height]"
    ).forEach(
      element => {

        const height =
          currentState
            ?.appearance
            ?.height;

        element.textContent =
          height
            ? `${height} cm`
            : "—";
      }
    );


    ATTRIBUTE_IDS.forEach(
      id => {

        $$(
          `[data-review-attribute="${id}"]`
        ).forEach(
          element => {

            element.textContent =
              currentState
                ?.attributes?.[
                  id
                ] ??
              "—";
          }
        );
      }
    );


    $$(
      "[data-review-primary-power]"
    ).forEach(
      element => {
        element.textContent =
          currentState
            ?.primaryPower ||
          "—";
      }
    );


    $$(
      "[data-review-parallel-power]"
    ).forEach(
      element => {
        element.textContent =
          currentState
            ?.parallelPower ||
          "—";
      }
    );
  }


  /* =========================================================
     ESTADO DE SALVAMENTO
     ========================================================= */

  function renderSaveState(
    currentState
  ) {
    const element =
      $("#saveStatusText");

    if (!element) {
      return;
    }

    element.textContent =
      currentState?.saved
        ? "Salvo"
        : "Salvamento automático";
  }


  /* =========================================================
     RENDERIZAÇÃO GERAL
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

    renderIdentity(
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

    renderPower(
      state
    );

    renderMana(
      state
    );

    renderSkills(
      state
    );

    renderTechniques(
      state
    );

    renderInventory(
      state
    );

    renderAvatar(
      state
    );

    renderReview(
      state
    );

    renderSaveState(
      state
    );

    return true;
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

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
     EVENTOS DO ESTADO
     ========================================================= */

  function bindStateEvents() {

    const updateFromEvent =
      event => {

        const nextState =
          event?.detail?.state;

        render(
          nextState ||
          getCurrentState()
        );
      };


    window.addEventListener(
      "aerion:ficha:ready",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:ficha:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:ficha:render",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:identity:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:race:selected",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:race:preview",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:animalha:category-selected",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:animalha:selected",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:appearance:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:class:selected",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:attribute:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:dice:assigned",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:dice:removed",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:dice:cleared",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:dice:rolled",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:power:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:mana:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:skill:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:technique:added",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:technique:removed",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:inventory:item-added",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:inventory:item-removed",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:avatar:updated",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:avatar:removed",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:navigation:changed",
      updateFromEvent
    );


    window.addEventListener(
      "aerion:step:completed",
      updateFromEvent
    );


    /*
     * Erros de validação.
     */
    window.addEventListener(
      "aerion:step:validation-failed",
      event => {

        const reason =
          event?.detail?.reason ||
          "Conclua esta etapa antes de avançar.";

        toast(
          reason
        );

        announce(
          reason
        );
      }
    );


    window.addEventListener(
      "aerion:navigation:blocked",
      event => {

        const reason =
          event?.detail?.reason ||
          "Essa etapa ainda está bloqueada.";

        toast(
          reason
        );

        announce(
          reason
        );
      }
    );


    /*
     * Erro de dado.
     */
    window.addEventListener(
      "aerion:dice:error",
      event => {

        const message =
          event?.detail?.error ||
          "Não foi possível executar a ação com o dado.";

        toast(
          message
        );

        announce(
          message
        );
      }
    );


    /*
     * Atualização dos assets.
     */
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
     OBSERVADOR DE INPUT VISUAL
     =========================================================

     Não altera o estado.

     Apenas mantém pequenos elementos
     visuais em sincronia enquanto
     o ficha.js processa os dados.

     ========================================================= */

  function bindVisualInputObservers() {

    const height =
      $("#appearanceHeight");

    if (height) {
      height.addEventListener(
        "input",
        () => {

          const value =
            number(
              height.value,
              0
            );

          const display =
            $("#appearanceHeightValue");

          if (display) {
            display.textContent =
              `${value} cm`;
          }
        }
      );
    }
  }


  /* =========================================================
     API
     ========================================================= */

  const API =
    Object.freeze({

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

        bindStateEvents();

        bindVisualInputObservers();

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

      getCurrentState
    });


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  window.AERIONFichaRender =
    API;

  window.AERION_FICHA_RENDER =
    API;


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
        once: true
      }
    );
  } else {
    boot();
  }

})();