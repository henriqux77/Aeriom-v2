/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   CAMADA VISUAL DA FICHA

   RESPONSÁVEL POR:
   - atualizar painéis;
   - atualizar progresso;
   - atualizar abas;
   - atualizar identidade;
   - atualizar raça;
   - atualizar Animalha;
   - atualizar aparência;
   - atualizar classe;
   - atualizar atributos;
   - atualizar dados;
   - atualizar poder;
   - atualizar mana;
   - atualizar perícias;
   - atualizar técnicas;
   - atualizar inventário;
   - atualizar revisão;
   - mensagens visuais.

   NÃO RESPONSÁVEL POR:
   - controlar ações [data-action];
   - navegar;
   - realizar rolagens;
   - alterar o estado diretamente;
   - salvar dados;
   - criar personagem;
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


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTES = Object.freeze([
    {
      id: "forca",
      name: "Força",
      short: "FOR"
    },

    {
      id: "vigor",
      name: "Vigor",
      short: "VIG"
    },

    {
      id: "agilidade",
      name: "Agilidade",
      short: "AGI"
    },

    {
      id: "precisao",
      name: "Precisão",
      short: "PRE"
    },

    {
      id: "intelecto",
      name: "Intelecto",
      short: "INT"
    },

    {
      id: "controle",
      name: "Controle",
      short: "CON"
    },

    {
      id: "presenca",
      name: "Presença",
      short: "PRS"
    },

    {
      id: "percepcao",
      name: "Percepção",
      short: "PER"
    }
  ]);

  const ATTRIBUTE_MAP = Object.freeze(
    Object.fromEntries(
      ATTRIBUTES.map(
        attribute => [
          attribute.id,
          attribute
        ]
      )
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


  /* =========================================================
     CLASSES
     ========================================================= */

  const CLASSES = Object.freeze({
    guerreiro: {
      id: "guerreiro",
      name: "Guerreiro",
      icon: "⚔"
    },

    feiticeiro: {
      id: "feiticeiro",
      name: "Feiticeiro",
      icon: "✦"
    },

    curandeiro: {
      id: "curandeiro",
      name: "Curandeiro",
      icon: "✚"
    },

    monge: {
      id: "monge",
      name: "Monge",
      icon: "◈"
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
     ESTADO
     ========================================================= */

  let initialized = false;

  let state = {};


  /* =========================================================
     DOM
     ========================================================= */

  function $(selector, parent = document) {
    return parent.querySelector(
      selector
    );
  }


  function $$(selector, parent = document) {
    return Array.from(
      parent.querySelectorAll(
        selector
      )
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


  function normalize(
    value
  ) {
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


  /* =========================================================
     CORE
     ========================================================= */

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


  function readState() {
    const core =
      getCore();

    if (
      core &&
      typeof core.getState ===
        "function"
    ) {
      try {
        return (
          core.getState() ||
          {}
        );
      } catch (
        error
      ) {
        console.warn(
          "[AERION][RENDER] Não foi possível ler o estado:",
          error
        );
      }
    }

    return state || {};
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message
  ) {
    if (!message) {
      return;
    }

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
      message;

    element.hidden =
      false;

    clearTimeout(
      element.__aerionTimer
    );

    element.__aerionTimer =
      setTimeout(
        () => {
          element.hidden =
            true;
        },
        1800
      );
  }


  /* =========================================================
     LIVE REGION
     ========================================================= */

  function announce(
    message
  ) {
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


  /* =========================================================
     ETAPA
     ========================================================= */

  function getCurrentStep(
    currentState = readState()
  ) {
    return clamp(
      number(
        currentState?.currentStep,
        0
      ),
      0,
      TOTAL_STEPS - 1
    );
  }


  function getCurrentStepId(
    currentState = readState()
  ) {
    return (
      STEP_IDS[
        getCurrentStep(
          currentState
        )
      ] ||
      STEP_IDS[0]
    );
  }


  /* =========================================================
     PAINÉIS
     ========================================================= */

  function renderPanels(
    currentState
  ) {
    const currentId =
      getCurrentStepId(
        currentState
      );


    $$(

      "[data-panel]"

    ).forEach(
      panel => {

        const panelId =
          normalize(
            panel.dataset.panel
          );

        const active =
          panelId ===
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

        const panelId =
          normalize(
            panel.dataset.stepPanel
          );

        const active =
          panelId ===
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
     ABAS
     ========================================================= */

  function renderStepTabs(
    currentState
  ) {
    const current =
      getCurrentStep(
        currentState
      );

    const completed =
      Array.isArray(
        currentState?.completedSteps
      )
        ? currentState.completedSteps
        : [];


    $$(

      ".creation-step"

    ).forEach(
      (
        button,
        index
      ) => {

        const unlocked =
          index <=
          current;

        const active =
          index ===
          current;

        const complete =
          completed[index] ===
          true;


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


    $$(

      "[data-progress-percent]"

    ).forEach(
      element => {
        element.textContent =
          `${percent}%`;
      }
    );


    const progress =
      $("#progressBar");

    if (progress) {
      progress.style.width =
        `${percent}%`;
    }


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


    const title =
      $(
        "[data-current-step-title]"
      );

    if (title) {
      title.textContent =
        STEP_NAMES[current];
    }


    const progressTrack =
      $(".progress-track");

    if (progressTrack) {
      progressTrack.setAttribute(
        "aria-valuenow",
        String(percent)
      );
    }
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function renderIdentity(
    currentState
  ) {
    const values = {
      name:
        text(
          currentState?.name
        ),

      age:
        text(
          currentState?.age
        ),

      gender:
        text(
          currentState?.gender
        ),

      description:
        text(
          currentState?.description
        ),

      origin:
        text(
          currentState?.origin
        )
    };


    $$(
      "[data-render-field]"
    ).forEach(
      element => {

        const field =
          element.dataset.renderField;

        if (
          Object.prototype.hasOwnProperty.call(
            values,
            field
          )
        ) {
          element.textContent =
            values[field] || "—";
        }
      }
    );


    $$(

      "[data-field-name]"

    ).forEach(
      element => {

        const input =
          $(
            `[name="${element.dataset.fieldName}"]`
          );

        if (!input) {
          return;
        }

        if (
          document.activeElement !==
          input
        ) {
          input.value =
            input.value ||
            "";
        }
      }
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
      return (
        assets.getRace(
          raceId
        ) ||
        null
      );
    }

    const wanted =
      normalize(
        raceId
      );

    return (
      getRaces().find(
        race =>
          normalize(
            race?.id
          ) ===
          wanted
      ) ||
      null
    );
  }


  function getSelectedRace(
    currentState
  ) {
    const raceId =
      text(
        currentState?.race
      );

    if (raceId) {
      return getRace(
        raceId
      );
    }

    const races =
      getRaces();

    const index =
      number(
        currentState?.raceIndex,
        0
      );

    return (
      races[index] ||
      null
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


    if (
      assets &&
      typeof assets.getRaceImage ===
        "function"
    ) {

      const image =
        assets.getRaceImage(
          race.id,
          genderKey
        );

      if (image) {
        return image;
      }
    }


    return (
      race.images?.[
        genderKey
      ] ||
      race.images?.[
        genderKey ===
          "feminino"
          ? "masculino"
          : "feminino"
      ] ||
      ""
    );
  }


  function renderRace(
    currentState
  ) {
    const race =
      getSelectedRace(
        currentState
      );

    const races =
      getRaces();


    $$(

      "[data-race-name]"

    ).forEach(
      element => {
        element.textContent =
          race?.name ||
          "Nenhuma raça";
      }
    );


    $$(

      "[data-race-id]"

    ).forEach(
      element => {
        element.textContent =
          race?.id ||
          "—";
      }
    );


    $$(

      "[data-race-description]"

    ).forEach(
      element => {
        element.textContent =
          race?.description ||
          race?.profile ||
          "—";
      }
    );


    /*
     * Imagem da raça.
     */

    const image =
      getRaceImage(
        race,
        currentState
      );


    $$(
      "[data-race-image]"
    ).forEach(
      element => {

        if (image) {
          element.src =
            image;

          element.alt =
            race?.name ||
            "Raça";
        } else {
          element.removeAttribute(
            "src"
          );

          element.alt =
            "Imagem indisponível";
        }
      }
    );


    /*
     * Dots / indicadores.
     */

    $$(

      "[data-race-index]"

    ).forEach(
      element => {

        const index =
          number(
            element.dataset.raceIndex,
            -1
          );

        const active =
          (
            index ===
            number(
              currentState?.raceIndex,
              -1
            )
          ) ||
          (
            race &&
            index ===
            races.findIndex(
              item =>
                item.id ===
                race.id
            )
          );


        element.classList.toggle(
          "active",
          active
        );

        element.classList.toggle(
          "selected",
          active
        );
      }
    );


    /*
     * Dados de altura.
     */

    const minHeight =
      number(
        race?.height?.min,
        0
      );

    const maxHeight =
      number(
        race?.height?.max,
        0
      );


    $$(

      "[data-race-height-min]"

    ).forEach(
      element => {
        element.textContent =
          minHeight
            ? `${minHeight} cm`
            : "—";
      }
    );


    $$(

      "[data-race-height-max]"

    ).forEach(
      element => {
        element.textContent =
          maxHeight
            ? `${maxHeight} cm`
            : "—";
      }
    );
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function getAnimalhaCategories() {
    const assets =
      getAssets();

    return Array.isArray(
      assets?.animalhaCategories
    )
      ? assets.animalhaCategories
      : [];
  }


  function getAnimalhaAnimals() {
    const assets =
      getAssets();

    return Array.isArray(
      assets?.animalhaAnimals
    )
      ? assets.animalhaAnimals
      : [];
  }


  function getAnimalhaCategoryName(
    categoryId
  ) {
    const categories =
      getAnimalhaCategories();

    const found =
      categories.find(
        category =>
          normalize(
            category.id
          ) ===
          normalize(
            categoryId
          )
      );

    return (
      found?.name ||
      categoryId ||
      "—"
    );
  }


  function renderAnimalha(
    currentState
  ) {
    const isAnimalha =
      normalize(
        currentState?.race
      ) ===
      "animalha";


    /*
     * Bloco inteiro.
     */

    $$(
      "[data-animalha-section]"
    ).forEach(
      element => {
        element.hidden =
          !isAnimalha;
      }
    );


    if (!isAnimalha) {
      return;
    }


    const categories =
      getAnimalhaCategories();

    const animals =
      getAnimalhaAnimals();

    const category =
      text(
        currentState?.animalhaCategory
      );


    /*
     * Categorias.
     */

    const categoryContainer =
      $(
        "[data-animalha-categories]"
      );


    if (
      categoryContainer &&
      categories.length
    ) {

      categoryContainer.innerHTML =
        categories
          .map(
            item => {

              const active =
                normalize(
                  item.id
                ) ===
                normalize(
                  category
                );

              return `
                <button
                  type="button"
                  class="animalha-category-card ${
                    active
                      ? "active selected"
                      : ""
                  }"
                  data-action="select-animalha-category"
                  data-category="${item.id}"
                  ${active
                    ? 'aria-pressed="true"'
                    : 'aria-pressed="false"'}
                >
                  <span class="animalha-category-name">
                    ${item.name || item.id}
                  </span>
                </button>
              `;
            }
          )
          .join("");
    }


    /*
     * Animais da categoria selecionada.
     */

    const animalContainer =
      $(
        "[data-animalha-animals]"
      );


    if (!animalContainer) {
      return;
    }


    if (!category) {
      animalContainer.innerHTML = `
        <div class="empty-state">
          Escolha uma categoria.
        </div>
      `;

      return;
    }


    const filtered =
      animals.filter(
        animal =>
          normalize(
            animal.category
          ) ===
          normalize(
            category
          )
      );


    if (!filtered.length) {
      animalContainer.innerHTML = `
        <div class="empty-state">
          Nenhuma variação disponível
          para esta categoria.
        </div>
      `;

      return;
    }


    const selectedAnimal =
      text(
        currentState?.animalha
      );


    animalContainer.innerHTML =
      filtered
        .map(
          animal => {

            const active =
              normalize(
                animal.id
              ) ===
              normalize(
                selectedAnimal
              );

            return `
              <button
                type="button"
                class="animalha-animal-card ${
                  active
                    ? "active selected"
                    : ""
                }"
                data-action="select-animalha"
                data-animal="${animal.id}"
                aria-pressed="${
                  active
                    ? "true"
                    : "false"
                }"
              >
                <span class="animalha-animal-name">
                  ${animal.name || animal.id}
                </span>

                ${
                  animal.subtype
                    ? `
                      <span class="animalha-animal-type">
                        ${animal.subtype}
                      </span>
                    `
                    : ""
                }
              </button>
            `;
          }
        )
        .join("");


    $$(

      "[data-animalha-category-name]"

    ).forEach(
      element => {
        element.textContent =
          getAnimalhaCategoryName(
            category
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
      getSelectedRace(
        currentState
      );


    const minHeight =
      number(
        race?.height?.min,
        150
      );

    const maxHeight =
      number(
        race?.height?.max,
        200
      );


    const currentHeight =
      clamp(
        number(
          currentState?.appearance?.height,
          (
            minHeight +
            maxHeight
          ) / 2
        ),
        minHeight,
        maxHeight
      );


    $$(

      "[data-appearance-height]"

    ).forEach(
      element => {
        element.textContent =
          `${currentHeight} cm`;
      }
    );


    $$(

      "[data-height-min]"

    ).forEach(
      element => {
        element.textContent =
          `${minHeight} cm`;
      }
    );


    $$(

      "[data-height-max]"

    ).forEach(
      element => {
        element.textContent =
          `${maxHeight} cm`;
      }
    );


    $$(

      'input[type="range"][data-height]'

    ).forEach(
      input => {

        input.min =
          String(minHeight);

        input.max =
          String(maxHeight);

        if (
          document.activeElement !==
          input
        ) {
          input.value =
            String(
              currentHeight
            );
        }
      }
    );


    /*
     * O desenho da imagem continua
     * sendo responsabilidade do
     * personagem-render.js.
     */

    emit(
      "aerion:personagem:render"
    );
  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function renderClass(
    currentState
  ) {
    const selected =
      normalize(
        currentState?.class
      );


    $$(

      "[data-class-id]"

    ).forEach(
      element => {

        const id =
          normalize(
            element.dataset.classId
          );

        const active =
          id ===
          selected;


        element.classList.toggle(
          "active",
          active
        );

        element.classList.toggle(
          "selected",
          active
        );

        element.setAttribute(
          "aria-pressed",
          active
            ? "true"
            : "false"
        );
      }
    );


    const classData =
      CLASSES[selected];


    $$(

      "[data-selected-class]"

    ).forEach(
      element => {
        element.textContent =
          classData?.name ||
          "—";
      }
    );
  }


  /* =========================================================
     ATRIBUTOS — VALOR
     ========================================================= */

  function getAttributeValue(
    currentState,
    attributeId
  ) {
    const value =
      currentState?.attributes?.[
        attributeId
      ];

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    return number(
      value,
      null
    );
  }


  /* =========================================================
     ATRIBUTOS — DADO
     ========================================================= */

  function getAssignedDie(
    currentState,
    attributeId
  ) {
    const assigned =
      currentState?.assignedDice?.[
        attributeId
      ];

    if (!assigned) {
      return null;
    }

    if (
      typeof assigned ===
      "string"
    ) {
      return (
        DICE.find(
          die =>
            die.id ===
            assigned
        ) ||
        null
      );
    }

    if (
      typeof assigned ===
      "object"
    ) {
      return (
        DICE.find(
          die =>
            die.id ===
            assigned.id
        ) ||
        {
          id:
            assigned.id ||
            "",
          type:
            assigned.type ||
            "",
          sides:
            number(
              assigned.sides,
              0
            )
        }
      );
    }

    return null;
  }


  /* =========================================================
     ATRIBUTOS — RESULTADO
     ========================================================= */

  function getDiceResult(
    currentState,
    attributeId
  ) {
    const result =
      currentState?.diceResults?.[
        attributeId
      ];

    if (
      result === null ||
      result === undefined ||
      result === ""
    ) {
      return null;
    }

    if (
      typeof result ===
      "object"
    ) {
      return number(
        result.value ??
        result.result,
        null
      );
    }

    return number(
      result,
      null
    );
  }


  /* =========================================================
     ATRIBUTOS — STATUS
     ========================================================= */

  function isAttributeComplete(
    currentState,
    attributeId
  ) {
    return (
      getAssignedDie(
        currentState,
        attributeId
      ) !== null &&
      getDiceResult(
        currentState,
        attributeId
      ) !== null
    );
  }


  /* =========================================================
     ATRIBUTOS — CARD ESTÁTICO
     ========================================================= */

  function updateAttributeCard(
    card,
    attribute,
    currentState
  ) {
    const value =
      getAttributeValue(
        currentState,
        attribute.id
      );

    const die =
      getAssignedDie(
        currentState,
        attribute.id
      );

    const result =
      getDiceResult(
        currentState,
        attribute.id
      );

    const complete =
      isAttributeComplete(
        currentState,
        attribute.id
      );


    /*
     * Nome.
     */

    const name =
      card.querySelector(
        "[data-attribute-name]"
      );

    if (name) {
      name.textContent =
        attribute.name;
    }


    /*
     * Sigla.
     *
     * IMPORTANTE:
     * Precisão = PRE
     * Presença = PRS
     *
     * Não usamos PRE nos dois.
     */

    const short =
      card.querySelector(
        "[data-attribute-short]"
      );

    if (short) {
      short.textContent =
        attribute.short;
    }


    /*
     * Valor principal.
     */

    const valueElements =
      card.querySelectorAll(
        "[data-attribute-value]"
      );

    valueElements.forEach(
      element => {

        element.textContent =
          value === null
            ? "—"
            : String(value);
      }
    );


    /*
     * Caso o próprio card
     * seja o elemento de valor.
     */

    if (
      card.matches(
        "[data-attribute-value]"
      )
    ) {
      card.textContent =
        value === null
          ? "—"
          : String(value);
    }


    /*
     * Dado atribuído.
     */

    const dieElements =
      card.querySelectorAll(
        "[data-attribute-die]"
      );

    dieElements.forEach(
      element => {

        element.textContent =
          die
            ? die.type.toUpperCase()
            : "Adicionar dado";
      }
    );


    /*
     * Resultado da rolagem.
     */

    const resultElements =
      card.querySelectorAll(
        "[data-attribute-result]"
      );

    resultElements.forEach(
      element => {

        element.textContent =
          result === null
            ? "—"
            : String(result);
      }
    );


    /*
     * Estado visual.
     */

    card.classList.toggle(
      "has-die",
      Boolean(die)
    );

    card.classList.toggle(
      "has-result",
      result !== null
    );

    card.classList.toggle(
      "completed",
      complete
    );


    card.dataset.attributeId =
      attribute.id;
  }


  /* =========================================================
     ATRIBUTOS — RENDER
     ========================================================= */

  function renderAttributes(
    currentState
  ) {
    /*
     * 1. Atualiza cards que já
     * existem no HTML.
     */

    $$(

      "[data-attribute]"

    ).forEach(
      card => {

        const id =
          normalize(
            card.dataset.attribute
          );

        const attribute =
          ATTRIBUTE_MAP[id];

        if (!attribute) {
          return;
        }

        updateAttributeCard(
          card,
          attribute,
          currentState
        );
      }
    );


    /*
     * 2. Atualiza listas dinâmicas,
     * caso existam.
     */

    const list =
      $(
        "[data-attributes-list]"
      );


    if (list) {

      list.innerHTML =
        ATTRIBUTES
          .map(
            attribute => {

              const value =
                getAttributeValue(
                  currentState,
                  attribute.id
                );

              const die =
                getAssignedDie(
                  currentState,
                  attribute.id
                );

              const result =
                getDiceResult(
                  currentState,
                  attribute.id
                );

              const complete =
                isAttributeComplete(
                  currentState,
                  attribute.id
                );


              return `
                <article
                  class="attribute-card ${
                    complete
                      ? "completed"
                      : ""
                  }"
                  data-attribute="${attribute.id}"
                >

                  <div class="attribute-card-header">

                    <div class="attribute-card-heading">

                      <span
                        class="attribute-short"
                        data-attribute-short
                      >
                        ${attribute.short}
                      </span>

                      <h3
                        data-attribute-name
                      >
                        ${attribute.name}
                      </h3>

                    </div>

                    <strong
                      class="attribute-value"
                      data-attribute-value
                    >
                      ${
                        value === null
                          ? "—"
                          : value
                      }
                    </strong>

                  </div>


                  <div
                    class="attribute-card-body"
                  >

                    <div
                      class="attribute-die"
                      data-attribute-die
                    >
                      ${
                        die
                          ? die.type.toUpperCase()
                          : "Adicionar dado"
                      }
                    </div>

                    <div
                      class="attribute-result"
                      data-attribute-result
                    >
                      ${
                        result === null
                          ? "—"
                          : result
                      }
                    </div>

                  </div>


                  <button
                    type="button"
                    class="attribute-roll-button"
                    data-action="roll-attribute"
                    data-attribute="${attribute.id}"
                  >
                    Rolar
                  </button>

                </article>
              `;
            }
          )
          .join("");
    }


    /*
     * 3. Gráfico.
     */

    renderAttributeGraph(
      currentState
    );


    /*
     * 4. Verificação final.
     */

    const completeCount =
      ATTRIBUTES.filter(
        attribute =>
          isAttributeComplete(
            currentState,
            attribute.id
          )
      ).length;


    $$(

      "[data-attributes-complete]"

    ).forEach(
      element => {
        element.textContent =
          `${completeCount}/${ATTRIBUTES.length}`;
      }
    );


    const allComplete =
      completeCount ===
      ATTRIBUTES.length;


    $$(

      "[data-attributes-status]"

    ).forEach(
      element => {

        element.textContent =
          allComplete
            ? "Completo"
            : `${completeCount} de ${ATTRIBUTES.length}`;

        element.classList.toggle(
          "complete",
          allComplete
        );
      }
    );
  }


  /* =========================================================
     GRÁFICO
     ========================================================= */

  function renderAttributeGraph(
    currentState
  ) {
    ATTRIBUTES.forEach(
      attribute => {

        const value =
          getAttributeValue(
            currentState,
            attribute.id
          );

        const numeric =
          value === null
            ? 0
            : clamp(
                value,
                0,
                100
              );


        const rootStyles =
          document.documentElement.style;


        rootStyles.setProperty(
          `--attribute-${attribute.id}`,
          String(
            numeric
          )
        );


        $$(
          `[data-graph-attribute="${attribute.id}"]`
        ).forEach(
          element => {

            element.style.setProperty(
              "--attribute-value",
              String(
                numeric
              )
            );

            element.style.setProperty(
              "--attribute-percent",
              `${numeric}%`
            );
          }
        );
      }
    );
  }


  /* =========================================================
     DADOS
     ========================================================= */

  function renderDice(
    currentState
  ) {
    $$(

      "[data-die-id]"

    ).forEach(
      element => {

        const dieId =
          element.dataset.dieId;

        const assigned =
          ATTRIBUTES.some(
            attribute =>
              getAssignedDie(
                currentState,
                attribute.id
              )?.id ===
              dieId
          );

        element.classList.toggle(
          "used",
          assigned
        );

        element.classList.toggle(
          "assigned",
          assigned
        );

        element.setAttribute(
          "aria-pressed",
          assigned
            ? "true"
            : "false"
        );
      }
    );


    /*
     * Resultado da última rolagem.
     */

    const lastRoll =
      currentState?.lastRoll;


    $$(

      "[data-last-roll]"

    ).forEach(
      element => {

        if (!lastRoll) {
          element.textContent =
            "—";

          return;
        }

        const result =
          lastRoll.result ??
          lastRoll.value;

        element.textContent =
          result === undefined
            ? "—"
            : String(result);
      }
    );
  }


  /* =========================================================
     PODER
     ========================================================= */

  function renderPower(
    currentState
  ) {
    const values = {
      primary:
        text(
          currentState?.primaryPower
        ),

      parallel:
        text(
          currentState?.parallelPower
        )
    };


    $$(

      "[data-power-primary]"

    ).forEach(
      element => {
        element.textContent =
          values.primary ||
          "—";
      }
    );


    $$(

      "[data-power-parallel]"

    ).forEach(
      element => {
        element.textContent =
          values.parallel ||
          "—";
      }
    );
  }


  /* =========================================================
     MANA
     ========================================================= */

  function renderMana(
    currentState
  ) {
    const mana =
      currentState?.mana ||
      {};

    const current =
      number(
        mana.current,
        0
      );

    const max =
      number(
        mana.max,
        0
      );

    const percent =
      max > 0
        ? clamp(
            (
              current /
              max
            ) *
            100,
            0,
            100
          )
        : 0;


    $$(

      "[data-mana-current]"

    ).forEach(
      element => {
        element.textContent =
          String(current);
      }
    );


    $$(

      "[data-mana-max]"

    ).forEach(
      element => {
        element.textContent =
          String(max);
      }
    );


    $$(

      "[data-mana-type]"

    ).forEach(
      element => {
        element.textContent =
          text(
            mana.type
          ) ||
          "—";
      }
    );


    $$(

      "[data-mana-percent]"

    ).forEach(
      element => {
        element.textContent =
          `${Math.round(percent)}%`;
      }
    );


    const bar =
      $(
        "[data-mana-bar]"
      );

    if (bar) {
      bar.style.width =
        `${percent}%`;
    }
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

      "[data-skill-id]"

    ).forEach(
      element => {

        const id =
          normalize(
            element.dataset.skillId
          );

        const value =
          number(
            skills[id],
            0
          );

        const name =
          SKILLS[id];


        const nameElement =
          element.querySelector(
            "[data-skill-name]"
          );

        if (nameElement) {
          nameElement.textContent =
            name ||
            id;
        }


        const valueElement =
          element.querySelector(
            "[data-skill-value]"
          );

        if (valueElement) {
          valueElement.textContent =
            String(value);
        }


        element.dataset.skillValue =
          String(value);
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


    const containers =
      $$(
        "[data-techniques-list]"
      );


    containers.forEach(
      container => {

        if (!techniques.length) {

          container.innerHTML = `
            <div class="empty-state">
              Nenhuma técnica adicionada.
            </div>
          `;

          return;
        }


        container.innerHTML =
          techniques
            .map(
              (
                technique,
                index
              ) => {

                const item =
                  typeof technique ===
                  "object"
                    ? technique
                    : {
                        name:
                          technique
                      };

                return `
                  <article
                    class="technique-item"
                  >

                    <div>
                      <strong>
                        ${
                          item.name ||
                          "Técnica"
                        }
                      </strong>

                      ${
                        item.description
                          ? `
                            <p>
                              ${item.description}
                            </p>
                          `
                          : ""
                      }
                    </div>

                    <button
                      type="button"
                      data-action="remove-technique"
                      data-index="${index}"
                    >
                      Remover
                    </button>

                  </article>
                `;
              }
            )
            .join("");
      }
    );
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function renderInventory(
    currentState
  ) {
    const inventory =
      Array.isArray(
        currentState?.inventory
      )
        ? currentState.inventory
        : [];


    $$(
      "[data-inventory-list]"
    ).forEach(
      container => {

        if (!inventory.length) {

          container.innerHTML = `
            <div class="empty-state">
              Inventário vazio.
            </div>
          `;

          return;
        }


        container.innerHTML =
          inventory
            .map(
              (
                item,
                index
              ) => {

                const data =
                  typeof item ===
                  "object"
                    ? item
                    : {
                        name:
                          item
                      };

                return `
                  <article
                    class="inventory-item"
                  >

                    <div>

                      <strong>
                        ${
                          data.name ||
                          "Item"
                        }
                      </strong>

                      ${
                        data.quantity !==
                        undefined
                          ? `
                            <span>
                              x${data.quantity}
                            </span>
                          `
                          : ""
                      }

                    </div>

                    <button
                      type="button"
                      data-action="remove-inventory"
                      data-index="${index}"
                    >
                      Remover
                    </button>

                  </article>
                `;
              }
            )
            .join("");
      }
    );
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function renderAvatar(
    currentState
  ) {
    const avatar =
      text(
        currentState?.avatar
      );

    const name =
      text(
        currentState?.avatarName
      );


    $$(

      "[data-avatar-image]"

    ).forEach(
      element => {

        if (avatar) {

          element.src =
            avatar;

          element.alt =
            name ||
            "Avatar do personagem";

          element.hidden =
            false;

        } else {

          element.removeAttribute(
            "src"
          );

          element.hidden =
            true;
        }
      }
    );


    $$(

      "[data-avatar-name]"

    ).forEach(
      element => {
        element.textContent =
          name ||
          "Nenhuma imagem personalizada";
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
      getSelectedRace(
        currentState
      );

    const selectedClass =
      CLASSES[
        normalize(
          currentState?.class
        )
      ];


    $$(

      "[data-review-name]"

    ).forEach(
      element => {
        element.textContent =
          text(
            currentState?.name
          ) ||
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

      "[data-review-class]"

    ).forEach(
      element => {
        element.textContent =
          selectedClass?.name ||
          "—";
      }
    );


    $$(

      "[data-review-gender]"

    ).forEach(
      element => {
        element.textContent =
          text(
            currentState?.gender
          ) ||
          "—";
      }
    );


    $$(

      "[data-review-animalha]"

    ).forEach(
      element => {
        element.textContent =
          text(
            currentState?.animalha
          ) ||
          "—";
      }
    );


    ATTRIBUTES.forEach(
      attribute => {

        const value =
          getAttributeValue(
            currentState,
            attribute.id
          );


        $$(
          `[data-review-attribute="${attribute.id}"]`
        ).forEach(
          element => {
            element.textContent =
              value === null
                ? "—"
                : String(value);
          }
        );
      }
    );
  }


  /* =========================================================
     STATUS DE SALVAMENTO
     ========================================================= */

  function renderSaveStatus(
    currentState
  ) {
    const saved =
      currentState?.saved === true;


    $$(

      "[data-save-status]"

    ).forEach(
      element => {

        element.textContent =
          saved
            ? "Salvo"
            : "Salvamento automático";

        element.classList.toggle(
          "saved",
          saved
        );
      }
    );


    const saveText =
      $("#saveStatusText");

    if (saveText) {
      saveText.textContent =
        saved
          ? "Salvo"
          : "Salvamento automático";
    }
  }


  /* =========================================================
     RENDER GERAL
     ========================================================= */

  function render(
    nextState = null
  ) {
    state =
      nextState &&
      typeof nextState ===
        "object"
        ? nextState
        : readState();


    renderPanels(
      state
    );

    renderStepTabs(
      state
    );

    renderProgress(
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

    renderClass(
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

    renderSaveStatus(
      state
    );

    return state;
  }


  /* =========================================================
     EVENTOS
     ========================================================= */

  function handleFichaUpdated(
    event
  ) {
    render(
      event?.detail?.state ||
      null
    );
  }


  function handleRaceSelected() {
    render();
  }


  function handleAppearanceUpdated() {
    render();
  }


  function handleAssetsReady() {
    render();
  }


  function handlePersonagemRender() {
    render();
  }


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function initEvents() {

    window.addEventListener(
      "aerion:ficha:updated",
      handleFichaUpdated
    );

    window.addEventListener(
      "aerion:race:selected",
      handleRaceSelected
    );

    window.addEventListener(
      "aerion:race:preview",
      handleRaceSelected
    );

    window.addEventListener(
      "aerion:appearance:updated",
      handleAppearanceUpdated
    );

    window.addEventListener(
      "aerion:personagem-assets:ready",
      handleAssetsReady
    );

    window.addEventListener(
      "aerion:personagem:render",
      handlePersonagemRender
    );
  }


  /* =========================================================
     API PÚBLICA
     ========================================================= */

  function exposeAPI() {

    window.AERIONFichaRender = {
      init,

      render,

      refresh:
        render,

      getCurrentState() {
        return state;
      },

      getCurrentStep() {
        return getCurrentStep(
          readState()
        );
      },

      getAttributes() {
        return (
          readState()?.attributes ||
          {}
        );
      }
    };


    window.AERION_FICHA_RENDER =
      window.AERIONFichaRender;
  }


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

    if (initialized) {
      return;
    }

    initialized =
      true;

    initEvents();

    exposeAPI();

    render();


    announce(
      "Ficha carregada."
    );
  }


  /* =========================================================
     DOM READY
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