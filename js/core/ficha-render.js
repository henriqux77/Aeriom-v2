/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   CAMADA VISUAL DA FICHA

   ficha.js
     -> estado e regras

   personagem-assets.js
     -> catálogo de imagens e raças

   personagem-render.js
     -> visualizador da imagem da raça

   ficha-render.js
     -> interface / apresentação
   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({

    totalSteps:
      11,

    defaultRaceHeight:
      {
        min:
          150,

        max:
          200
      },

    progressTitles:
      [
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
      ]

  });


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


  const MANA_TYPES = Object.freeze({

    azul: {
      id:
        "azul",

      name:
        "Mana Azul",

      className:
        "mana-azul",

      symbol:
        "◆"
    },

    dourada: {
      id:
        "dourada",

      name:
        "Mana Dourada",

      className:
        "mana-dourada",

      symbol:
        "◆"
    },

    branca: {
      id:
        "branca",

      name:
        "Mana Branca",

      className:
        "mana-branca",

      symbol:
        "◆"
    },

    vermelha: {
      id:
        "vermelha",

      name:
        "Mana Vermelha",

      className:
        "mana-vermelha",

      symbol:
        "◆"
    },

    negra: {
      id:
        "negra",

      name:
        "Mana Negra",

      className:
        "mana-negra",

      symbol:
        "◆"
    }

  });


  /* =========================================================
     DOM
     ========================================================= */

  function $(selector, root = document) {
    return root.querySelector(
      selector
    );
  }


  function $$(selector, root = document) {
    return Array.from(
      root.querySelectorAll(
        selector
      )
    );
  }


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

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


  function normalize(
    value
  ) {

    return String(
      value ?? ""
    )
      .trim()
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


  function getState() {

    const core =
      getCore();

    if (
      core &&
      typeof core.getState ===
        "function"
    ) {

      try {

        return core.getState();

      } catch {

        return {};
      }
    }

    return {};
  }


  function announce(
    message
  ) {

    let region =
      $("#aerionLiveRegion");

    if (
      !region
    ) {

      region =
        document.createElement(
          "div"
        );

      region.id =
        "aerionLiveRegion";

      region.className =
        "visually-hidden";

      region.setAttribute(
        "aria-live",
        "polite"
      );

      region.setAttribute(
        "aria-atomic",
        "true"
      );

      document.body.appendChild(
        region
      );
    }


    region.textContent =
      String(
        message
      );

  }


  function toast(
    message
  ) {

    let element =
      $("#aerionToast");


    if (
      !element
    ) {

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
     ESTADO
     ========================================================= */

  let currentState =
    getState();


  /* =========================================================
     RAÇAS
     ========================================================= */

  function getRaces() {

    const assets =
      getAssets();


    if (
      Array.isArray(
        assets?.races
      ) &&
      assets.races.length
    ) {

      return assets.races;

    }


    if (
      Array.isArray(
        window.AERION_RACES
      ) &&
      window.AERION_RACES.length
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


    const wanted =
      normalize(
        raceId
      );


    return (
      getRaces().find(
        race =>
          normalize(
            race.id
          ) ===
          wanted
      ) ||
      null
    );

  }


  function getRaceIndex(
    state
  ) {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return 0;
    }


    const wanted =
      normalize(
        state?.race
      );


    const explicitIndex =
      number(
        state?.raceIndex,
        -1
      );


    if (
      explicitIndex >= 0 &&
      explicitIndex < races.length &&
      normalize(
        races[
          explicitIndex
        ]?.id
      ) ===
        wanted
    ) {

      return explicitIndex;

    }


    const found =
      races.findIndex(
        race =>
          normalize(
            race.id
          ) ===
          wanted
      );


    return found >= 0
      ? found
      : 0;

  }


  function getCurrentRace(
    state
  ) {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return null;
    }


    return (
      races[
        getRaceIndex(
          state
        )
      ] ||
      races[0]
    );

  }


  /* =========================================================
     GÊNERO
     ========================================================= */

  function getGenderKey(
    state
  ) {

    const value =
      normalize(
        state?.gender
      );


    if (
      value ===
        "feminino" ||
      value ===
        "feminina" ||
      value ===
        "female" ||
      value ===
        "f"
    ) {

      return "feminino";

    }


    return "masculino";

  }


  /* =========================================================
     IMAGEM DA RAÇA
     ========================================================= */

  function getRaceImageUrl(
    race,
    state
  ) {

    if (
      !race
    ) {

      return "";
    }


    const gender =
      getGenderKey(
        state
      );


    const assets =
      getAssets();


    if (
      assets &&
      typeof assets.getRaceImage ===
        "function"
    ) {

      const source =
        assets.getRaceImage(
          race.id,
          gender
        );


      if (
        source
      ) {

        return source;
      }

    }


    /*
     * Catálogo novo:
     *
     * race.images.masculino
     * race.images.feminino
     */

    const requested =
      race.images?.[
        gender
      ];


    if (
      requested
    ) {

      return requested;
    }


    const fallback =
      gender ===
        "feminino"
        ? race.images?.masculino
        : race.images?.feminino;


    if (
      fallback
    ) {

      return fallback;
    }


    /*
     * Compatibilidade com catálogos antigos.
     */

    return (
      race.image ||
      race.imageUrl ||
      race.src ||
      ""
    );

  }


  /* =========================================================
     ALTURA DA RAÇA
     ========================================================= */

  function getRaceHeight(
    race,
    state
  ) {

    const assets =
      getAssets();


    if (
      assets &&
      typeof assets.getRaceHeight ===
        "function"
    ) {

      const result =
        assets.getRaceHeight(
          race?.id ||
          state?.race
        );


      if (
        result
      ) {

        return {

          min:
            number(
              result.min,
              CONFIG.defaultRaceHeight.min
            ),

          max:
            number(
              result.max,
              CONFIG.defaultRaceHeight.max
            )

        };

      }

    }


    return {

      min:
        number(
          race?.height?.min,
          CONFIG.defaultRaceHeight.min
        ),

      max:
        number(
          race?.height?.max,
          CONFIG.defaultRaceHeight.max
        )

    };

  }


  /* =========================================================
     RENDER DA RAÇA
     ========================================================= */

  function renderRace(
    state
  ) {

    const race =
      getCurrentRace(
        state
      );


    if (
      !race
    ) {

      return;
    }


    raceIndex =
      getRaceIndex(
        state
      );


    const image =
      $("#raceImage");


    if (
      image
    ) {

      const src =
        getRaceImageUrl(
          race,
          state
        );


      image.alt =
        `${race.name || "Raça"} — ${getGenderKey(state)}`;


      if (
        src &&
        image.getAttribute(
          "src"
        ) !==
          src
      ) {

        image.src =
          src;

      }


      image.hidden =
        !src;

    }


    const name =
      $("#raceName");


    if (
      name
    ) {

      name.textContent =
        race.name ||
        "Raça";

    }


    const description =
      $("#raceDescription");


    if (
      description
    ) {

      description.textContent =
        race.description ||
        "";

    }


    const profile =
      $("#raceProfile");


    if (
      profile
    ) {

      profile.textContent =
        race.profile ||
        "—";

    }


    const feature =
      $("#raceFeature");


    if (
      feature
    ) {

      feature.textContent =
        race.feature ||
        "—";

    }


    const height =
      getRaceHeight(
        race,
        state
      );


    const min =
      $("#raceHeightMin");


    if (
      min
    ) {

      min.textContent =
        `${height.min} cm`;

    }


    const max =
      $("#raceHeightMax");


    if (
      max
    ) {

      max.textContent =
        `${height.max} cm`;

    }


    const select =
      $("#selectRaceButton");


    if (
      select
    ) {

      const selected =
        normalize(
          state?.race
        ) ===
        normalize(
          race.id
        );


      select.dataset.race =
        race.id;


      select.dataset.raceId =
        race.id;


      select.classList.toggle(
        "is-selected",
        selected
      );


      select.textContent =
        selected
          ? "✓ Selecionada"
          : "Selecionar";

    }


    renderRaceDots(
      state
    );


    renderRaceImageSourceForAppearance(
      state
    );

  }


  /* =========================================================
     DOTS
     ========================================================= */

  function renderRaceDots(
    state
  ) {

    const container =
      $("#raceDots");


    if (
      !container
    ) {

      return;
    }


    const races =
      getRaces();


    const active =
      getRaceIndex(
        state
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


        if (
          index ===
          active
        ) {

          button.classList.add(
            "active"
          );

          button.setAttribute(
            "aria-current",
            "true"
          );

        }


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


        container.appendChild(
          button
        );

      }
    );

  }


  /* =========================================================
     IMAGEM PARA A APARÊNCIA
     ========================================================= */

  function renderRaceImageSourceForAppearance(
    state
  ) {

    /*
     * O personagem-render.js lê o #raceImage.
     * Portanto não criamos outra URL ou outra imagem aqui.
     */

    const image =
      $("#raceImage");


    if (
      !image
    ) {

      return;
    }


    image.dataset.race =
      getCurrentRace(
        state
      )?.id ||
      "";


    image.dataset.gender =
      getGenderKey(
        state
      );

  }


  /* =========================================================
     RAÇA — NAVEGAÇÃO
     ========================================================= */

  let raceIndex =
    getRaceIndex(
      currentState
    );


  function changeRace(
    direction
  ) {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return;
    }


    raceIndex =
      (
        getRaceIndex(
          getState()
        ) +
        direction +
        races.length
      ) %
      races.length;


    const race =
      races[
        raceIndex
      ];


    const core =
      getCore();


    if (
      core &&
      typeof core.selectRace ===
        "function"
    ) {

      core.selectRace(
        race.id,
        raceIndex
      );

    }


    announce(
      `Raça: ${race.name}`
    );

  }


  function goToRaceIndex(
    index
  ) {

    const races =
      getRaces();


    if (
      !races.length
    ) {

      return;
    }


    raceIndex =
      clamp(
        number(
          index,
          0
        ),
        0,
        races.length - 1
      );


    const race =
      races[
        raceIndex
      ];


    getCore()
      ?.selectRace?.(
        race.id,
        raceIndex
      );

  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function renderAnimalha(
    state
  ) {

    const category =
      normalize(
        state?.animalhaCategory
      );


    const assets =
      getAssets();


    const categoryContainer =
      $("#animalhaCategories");


    const animalContainer =
      $("#animalhaOptions");


    if (
      categoryContainer
    ) {

      if (
        Array.isArray(
          assets?.animalhaCategories
        )
      ) {

        categoryContainer
          .querySelectorAll(
            "[data-animalha-category]"
          )
          .forEach(
            element => {

              const selected =
                normalize(
                  element.dataset.animalhaCategory
                ) ===
                category;


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

    }


    if (
      !animalContainer
    ) {

      return;
    }


    if (
      !category
    ) {

      animalContainer
        .querySelectorAll(
          "[data-animalha]"
        )
        .forEach(
          element => {

            element.hidden =
              false;

          }
        );


      return;
    }


    let animals = [];


    if (
      assets &&
      typeof assets.getAnimalhaAnimals ===
        "function"
    ) {

      animals =
        assets.getAnimalhaAnimals(
          category
        );

    } else if (
      assets?.animalhaAnimals
    ) {

      animals =
        Object.values(
          assets.animalhaAnimals
        )
          .filter(
            animal =>
              normalize(
                animal.category
              ) ===
              category
          );

    }


    const existing =
      $$(
        "[data-animalha]",
        animalContainer
      );


    existing.forEach(
      element => {

        const animalId =
          normalize(
            element.dataset.animalha
          );


        const available =
          animals.some(
            animal =>
              normalize(
                animal.id
              ) ===
              animalId
          );


        element.hidden =
          !available;


        element.classList.toggle(
          "selected",
          animalId ===
            normalize(
              state?.animalha
            )
        );

      }
    );

  }


  /* =========================================================
     ALTURA
     ========================================================= */

  function renderAppearance(
    state
  ) {

    const race =
      getCurrentRace(
        state
      );


    const range =
      getRaceHeight(
        race,
        state
      );


    const current =
      clamp(
        number(
          state?.appearance?.height,
          (
            range.min +
            range.max
          ) / 2
        ),
        range.min,
        range.max
      );


    const slider =
      $("#appearanceHeight");


    if (
      slider
    ) {

      slider.min =
        String(
          range.min
        );

      slider.max =
        String(
          range.max
        );

      slider.step =
        "1";

      slider.value =
        String(
          current
        );

    }


    const value =
      $("#appearanceHeightValue");


    if (
      value
    ) {

      value.textContent =
        `${(
          current /
          100
        ).toFixed(2)} m`;

    }


    const min =
      $("#appearanceHeightMin");


    if (
      min
    ) {

      min.textContent =
        `${range.min} cm`;

    }


    const max =
      $("#appearanceHeightMax");


    if (
      max
    ) {

      max.textContent =
        `${range.max} cm`;

    }

  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function renderAttributes(
    state
  ) {

    const attributes =
      state?.attributes ||
      {};


    $$(
      "[data-attribute]"
    ).forEach(
      element => {

        const id =
          normalize(
            element.dataset.attribute
          );


        if (
          !Object.prototype.hasOwnProperty.call(
            attributes,
            id
          )
        ) {

          return;
        }


        const value =
          attributes[
            id
          ];


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
      state
    );

  }


  /* =========================================================
     GRÁFICO
     ========================================================= */

  function renderAttributeGraph(
    state
  ) {

    const graph =
      $(
        "[data-attribute-graph]"
      );


    if (
      !graph
    ) {

      return;
    }


    const attributes =
      state?.attributes ||
      {};


    Object.entries(
      attributes
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {

        const normalized =
          number(
            value,
            0
          );


        graph.style.setProperty(
          `--attribute-${id}`,
          String(
            normalized
          )
        );

      }
    );


    graph.dataset.updated =
      String(
        Date.now()
      );

  }


  /* =========================================================
     DADOS ATRIBUÍDOS
     ========================================================= */

  function renderDiceAssignments(
    state
  ) {

    const assigned =
      state?.assignedDice ||
      {};


    $$(
      "[data-attribute-die]"
    ).forEach(
      element => {

        const attribute =
          normalize(
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
          element.querySelector(
            "[data-die-label]"
          );


        if (
          label
        ) {

          label.textContent =
            diceId ||
            "Adicionar dado";

        }

      }
    );


    $$(
      "[data-dice-assigned]"
    ).forEach(
      element => {

        const attribute =
          normalize(
            element.dataset.diceAssigned
          );


        const diceId =
          assigned[
            attribute
          ] ||
          "";


        element.textContent =
          diceId ||
          "—";


        element.dataset.dice =
          diceId;

      }
    );

  }


  /* =========================================================
     RESULTADOS DOS DADOS
     ========================================================= */

  function renderDiceResults(
    state
  ) {

    const results =
      state?.diceResults ||
      {};


    $$(
      "[data-roll-result]"
    ).forEach(
      element => {

        const diceId =
          element.dataset.rollResult;


        const value =
          results[
            diceId
          ];


        element.textContent =
          value ??
          "—";

      }
    );


    $$(
      "[data-attribute-result]"
    ).forEach(
      element => {

        const attribute =
          normalize(
            element.dataset.attributeResult
          );


        const value =
          state?.attributes?.[
            attribute
          ];


        element.textContent =
          value ??
          "—";

      }
    );

  }


  /* =========================================================
     DADOS DISPONÍVEIS
     ========================================================= */

  function renderAvailableDice(
    state
  ) {

    const assigned =
      state?.assignedDice ||
      {};


    const used =
      new Set(
        Object.values(
          assigned
        ).filter(
          Boolean
        )
      );


    $$(
      "[data-dice-id], [data-die-id]"
    ).forEach(
      element => {

        const id =
          element.dataset.diceId ||
          element.dataset.dieId;


        if (
          !id
        ) {

          return;
        }


        const active =
          used.has(
            id
          );


        element.classList.toggle(
          "is-used",
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

  }


  /* =========================================================
     CLASSES
     ========================================================= */

  function renderClasses(
    state
  ) {

    const current =
      normalize(
        state?.class
      );


    $$(
      "[data-class-id], [data-class]"
    ).forEach(
      element => {

        const id =
          normalize(
            element.dataset.classId ||
            element.dataset.class
          );


        const selected =
          id ===
          current;


        element.classList.toggle(
          "selected",
          selected
        );


        element.classList.toggle(
          "is-selected",
          selected
        );


        if (
          selected
        ) {

          element.setAttribute(
            "aria-selected",
            "true"
          );

        } else {

          element.setAttribute(
            "aria-selected",
            "false"
          );

        }

      }
    );

  }


  /* =========================================================
     MANA
     ========================================================= */

  function resolveManaType(
    element
  ) {

    const value =
      normalize(
        element.dataset.mana ||
        element.dataset.manaType ||
        element.dataset.type ||
        ""
      );


    return (
      MANA_TYPES[
        value
      ] ||
      null
    );

  }


  function renderMana() {

    const cards =
      $$(
        ".mana-card, .mana-option, [data-mana]"
      );


    cards.forEach(
      card => {

        const type =
          resolveManaType(
            card
          );


        if (
          !type
        ) {

          return;
        }


        Object.values(
          MANA_TYPES
        ).forEach(
          mana => {

            card.classList.remove(
              mana.className
            );

          }
        );


        card.classList.add(
          "aerion-mana-card",
          type.className
        );


        let icon =
          card.querySelector(
            ".mana-icon"
          );


        if (
          !icon
        ) {

          icon =
            document.createElement(
              "span"
            );

          icon.className =
            "mana-icon";

          icon.setAttribute(
            "aria-hidden",
            "true"
          );

          card.prepend(
            icon
          );

        }


        icon.textContent =
          type.symbol;


        const name =
          card.querySelector(
            ".mana-name"
          );


        if (
          name
        ) {

          name.textContent =
            type.name;

        }

      }
    );

  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function renderProgress(
    state
  ) {

    const current =
      clamp(
        number(
          state?.currentStep,
          0
        ),
        0,
        CONFIG.totalSteps - 1
      );


    const completed =
      Array.isArray(
        state?.completedSteps
      )
        ? state.completedSteps
        : [];


    const denominator =
      Math.max(
        1,
        CONFIG.totalSteps - 1
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


    if (
      progressBar
    ) {

      progressBar.style.width =
        `${percent}%`;

    }


    const percentElement =
      $("#progressPercent");


    if (
      percentElement
    ) {

      percentElement.textContent =
        `${percent}%`;

    }


    const title =
      $("#progressTitle");


    if (
      title
    ) {

      title.textContent =
        CONFIG.progressTitles[
          current
        ] ||
        "Identidade";

    }


    const track =
      $(".progress-track");


    if (
      track
    ) {

      track.setAttribute(
        "aria-valuenow",
        String(
          percent
        )
      );

    }


    /*
     * Contadores existentes.
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
            CONFIG.totalSteps
          );

      }
    );


    /*
     * Caso o projeto possua explicitamente:
     * #stepNumber
     */

    const stepNumber =
      $("#stepNumber");


    if (
      stepNumber
    ) {

      stepNumber.textContent =
        String(
          current + 1
        );

    }


    /*
     * Abas superiores.
     */

    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {

          const active =
            index ===
            current;


          const unlocked =
            index <=
            current ||
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


          /*
           * Apenas futuras ficam desabilitadas.
           *
           * Etapas passadas continuam acessíveis.
           */

          button.disabled =
            !unlocked;


          if (
            active
          ) {

            button.setAttribute(
              "aria-current",
              "step"
            );

          } else {

            button.removeAttribute(
              "aria-current"
            );

          }

        }
      );

  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function syncPanels(
    state
  ) {

    const current =
      clamp(
        number(
          state?.currentStep,
          0
        ),
        0,
        CONFIG.totalSteps - 1
      );


    const currentId =
      STEP_IDS[
        current
      ];


    $$(
      "[data-panel]"
    ).forEach(
      panel => {

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

      }
    );


    /*
     * Compatibilidade.
     */

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


  function syncNavigation(
    state
  ) {

    renderProgress(
      state
    );


    syncPanels(
      state
    );

  }


  /* =========================================================
     ATUALIZAÇÃO GERAL
     ========================================================= */

  function renderAll(
    state
  ) {

    currentState =
      state ||
      getState();


    syncNavigation(
      currentState
    );


    renderRace(
      currentState
    );


    renderAnimalha(
      currentState
    );


    renderAppearance(
      currentState
    );


    renderAttributes(
      currentState
    );


    renderDiceAssignments(
      currentState
    );


    renderDiceResults(
      currentState
    );


    renderAvailableDice(
      currentState
    );


    renderClasses(
      currentState
    );


    renderMana();

  }


  /* =========================================================
     CLIQUES
     ========================================================= */

  function bindActions() {

    /*
     * Capture = true
     * para impedir listeners antigos de executarem
     * ações conflitantes antes deste renderizador.
     */

    document.addEventListener(
      "click",
      event => {

        const element =
          event.target.closest(
            "[data-action]"
          );


        if (
          !element
        ) {

          return;
        }


        const action =
          normalize(
            element.dataset.action
          );


        /* -------------------------------------------
           Próximo
           ------------------------------------------- */

        if (
          action ===
            "next" ||
          action ===
            "next_step"
        ) {

          event.preventDefault();
          event.stopPropagation();


          const core =
            getCore();


          if (
            core &&
            typeof core.completeCurrentStep ===
              "function"
          ) {

            const validation =
              core.completeCurrentStep();


            if (
              !validation?.ok
            ) {

              toast(
                validation?.reason ||
                "Conclua a etapa atual."
              );


              return;
            }

          }


          const result =
            core?.nextStep?.();


          if (
            result ===
            false
          ) {

            toast(
              "Não é possível avançar ainda."
            );

          }


          return;

        }


        /* -------------------------------------------
           Voltar
           ------------------------------------------- */

        if (
          action ===
            "previous" ||
          action ===
            "previous_step" ||
          action ===
            "back" ||
          action ===
            "go_back"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.previousStep?.();


          return;

        }


        /* -------------------------------------------
           Aba
           ------------------------------------------- */

        if (
          action ===
          "go_step"
        ) {

          event.preventDefault();
          event.stopPropagation();


          const target =
            number(
              element.dataset.step,
              0
            );


          const state =
            getState();


          const current =
            number(
              state?.currentStep,
              0
            );


          /*
           * Não deixa saltar para frente.
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


          getCore()
            ?.goToStep?.(
              target
            );


          return;

        }


        /* -------------------------------------------
           Raça
           ------------------------------------------- */

        if (
          action ===
          "race_next"
        ) {

          event.preventDefault();
          event.stopPropagation();


          changeRace(
            +1
          );


          return;

        }


        if (
          action ===
          "race_previous"
        ) {

          event.preventDefault();
          event.stopPropagation();


          changeRace(
            -1
          );


          return;

        }


        if (
          action ===
          "race_goto"
        ) {

          event.preventDefault();
          event.stopPropagation();


          goToRaceIndex(
            element.dataset.raceIndex
          );


          return;

        }


        if (
          action ===
            "select_race" ||
          action ===
            "select_race_current"
        ) {

          event.preventDefault();
          event.stopPropagation();


          const raceId =
            element.dataset.race ||
            element.dataset.raceId ||
            getCurrentRace(
              getState()
            )?.id;


          getCore()
            ?.selectRace?.(
              raceId,
              getRaceIndex(
                getState()
              )
            );


          toast(
            "Raça selecionada."
          );


          return;

        }


        /* -------------------------------------------
           Animalha
           ------------------------------------------- */

        if (
          action ===
            "select_animalha_category"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.selectAnimalhaCategory?.(
              element.dataset.animalhaCategory ||
              element.dataset.category ||
              ""
            );


          return;

        }


        if (
          action ===
            "select_animalha"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.selectAnimalha?.(
              element.dataset.animalha ||
              element.dataset.animalId ||
              ""
            );


          return;

        }


        /* -------------------------------------------
           Classe
           ------------------------------------------- */

        if (
          action ===
          "select_class"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.selectClass?.(
              element.dataset.class ||
              element.dataset.classId ||
              ""
            );


          return;

        }


        /* -------------------------------------------
           Dado
           ------------------------------------------- */

        if (
          action ===
            "assign_die" ||
          action ===
            "assign_dice"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.assignDieToAttribute?.(
              element.dataset.diceId ||
              element.dataset.dieId ||
              "",

              element.dataset.attribute ||
              element.dataset.attributeId ||
              ""
            );


          return;

        }


        if (
          action ===
            "remove_die" ||
          action ===
            "remove_dice"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.removeDieFromAttribute?.(
              element.dataset.attribute ||
              element.dataset.attributeId ||
              ""
            );


          return;

        }


        /* -------------------------------------------
           ROLAR ATRIBUTO
           ------------------------------------------- */

        if (
          action ===
            "roll_attribute"
        ) {

          event.preventDefault();
          event.stopPropagation();


          const attribute =
            element.dataset.attribute ||
            element.dataset.attributeId;


          const result =
            getCore()
              ?.rollAttribute?.(
                attribute
              );


          if (
            result?.ok
          ) {

            toast(
              `${attribute}: ${result.result}`
            );


            announce(
              `Resultado ${result.result}`
            );


          } else {

            toast(
              result?.error ||
              "Nenhum dado atribuído."
            );

          }


          return;

        }


        /* -------------------------------------------
           ROLAR DADO
           ------------------------------------------- */

        if (
          action ===
            "roll_die" ||
          action ===
            "roll_dice"
        ) {

          event.preventDefault();
          event.stopPropagation();


          const attribute =
            element.dataset.attribute ||
            element.dataset.attributeId;


          if (
            attribute
          ) {

            getCore()
              ?.rollAttribute?.(
                attribute
              );

          } else {

            getCore()
              ?.rollDie?.(
                element.dataset.diceId ||
                element.dataset.dieId ||
                ""
              );

          }


          return;

        }


        /* -------------------------------------------
           Limpar dados
           ------------------------------------------- */

        if (
          action ===
          "clear_dice"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.clearDiceAssignments?.();


          return;

        }


        /* -------------------------------------------
           Avatar
           ------------------------------------------- */

        if (
          action ===
            "remove_avatar"
        ) {

          event.preventDefault();
          event.stopPropagation();


          getCore()
            ?.removeAvatar?.();


          return;

        }

      },
      true
    );

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


        /*
         * Altura.
         */

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


        /*
         * Aparência genérica.
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


          getCore()
            ?.setAppearance?.(
              appearanceField,
              value
            );


          return;

        }


        /*
         * Identidade.
         */

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


        /*
         * Gênero.
         */

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


        /*
         * Aparência.
         */

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


        /*
         * Atributo.
         */

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


        /*
         * Perícia.
         */

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
     EVENTOS DO ESTADO
     ========================================================= */

  function bindStateEvents() {

    window.addEventListener(
      "aerion:ficha:updated",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:race:selected",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:animalha:selected",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:animalha:category-selected",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:class:selected",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:assigned",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:rolled",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:removed",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:dice:cleared",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:appearance:updated",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:mana:updated",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:navigation:changed",
      event => {

        renderAll(
          event?.detail?.state ||
          getState()
        );

      }
    );


    window.addEventListener(
      "aerion:personagem-assets:ready",
      () => {

        renderAll(
          getState()
        );

      }
    );

  }


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  const API = Object.freeze({

    init() {

      currentState =
        getState();


      bindActions();

      bindFields();

      bindStateEvents();


      renderAll(
        currentState
      );


      return true;

    },


    render:

      renderAll,


    refresh() {

      renderAll(
        getState()
      );

    },


    nextStep() {

      return getCore()
        ?.nextStep?.();

    },


    previousStep() {

      return getCore()
        ?.previousStep?.();

    },


    nextRace() {

      changeRace(
        +1
      );

    },


    previousRace() {

      changeRace(
        -1
      );

    },


    getCurrentRace() {

      return getCurrentRace(
        getState()
      );

    }

  });


  /* =========================================================
     GLOBAL
     ========================================================= */

  window.AERIONFichaRender =
    API;


  window.AERION_FICHA_RENDER =
    API;


  /* =========================================================
     BOOT
     ========================================================= */

  function boot() {

    if (
      !API.init()
    ) {

      window.requestAnimationFrame(
        boot
      );

    }

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