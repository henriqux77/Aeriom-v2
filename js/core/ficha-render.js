/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   RESPONSABILIDADE:
   - renderização visual;
   - raça;
   - Animalha;
   - aparência;
   - classe;
   - atributos;
   - poder;
   - mana;
   - perícias;
   - técnicas;
   - inventário;
   - revisão;
   - navegação.

   NÃO RESPONSÁVEL POR:
   - regras dos dados;
   - geração dos resultados;
   - persistência do estado;
   - regras de atributos.

   ficha.js é a autoridade dos dados.
   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     ESTADO
     ========================================================= */

  let lastState = null;

  let raceIndex = 0;

  let raceImageObserver = null;


  /* =========================================================
     DOM
     ========================================================= */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(
      root.querySelectorAll(selector)
    );
  }


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }


  function normalize(value) {
    return String(value ?? "")
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
        return (
          lastState ||
          {}
        );
      }
    }

    return (
      lastState ||
      {}
    );
  }


  function toast(
    message,
    duration = 2200
  ) {
    let element =
      $("#toast");

    if (
      !element
    ) {
      element =
        document.createElement(
          "div"
        );

      element.id =
        "toast";

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
        duration
      );
  }


  function announce(
    message
  ) {
    let live =
      $("#aerionLiveRegion");

    if (
      !live
    ) {
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
      message;
  }


  /* =========================================================
     RAÇAS
     ========================================================= */

  const FALLBACK_RACES = [
    {
      id:
        "humano",

      name:
        "Humano",

      description:
        "Versátil e equilibrado, com ampla capacidade de adaptação.",

      profile:
        "Equilibrado",

      feature:
        "Versatilidade",

      height:
        {
          min:
            150,

          max:
            200
        }
    },

    {
      id:
        "elfo",

      name:
        "Elfo",

      description:
        "Povo ágil e perceptivo, ligado à natureza e à magia.",

      profile:
        "Ágil e perceptivo",

      feature:
        "Percepção elevada",

      height:
        {
          min:
            155,

          max:
            205
        }
    },

    {
      id:
        "anao",

      name:
        "Anão",

      description:
        "Povo compacto e resistente, conhecido por sua robustez.",

      profile:
        "Robusto",

      feature:
        "Resistência",

      height:
        {
          min:
            125,

          max:
            155
        }
    },

    {
      id:
        "orc",

      name:
        "Orc",

      description:
        "Corpo poderoso e presença marcante.",

      profile:
        "Forte e robusto",

      feature:
        "Potência física",

      height:
        {
          min:
            175,

          max:
            225
        }
    },

    {
      id:
        "fada",

      name:
        "Fada",

      description:
        "Ser feérico capaz de manipular forças sobrenaturais.",

      profile:
        "Leve e ágil",

      feature:
        "Asas feéricas",

      height:
        {
          min:
            90,

          max:
            140
        }
    },

    {
      id:
        "animalha",

      name:
        "Animalha",

      description:
        "Humanoides com características animais integradas à anatomia.",

      profile:
        "Definido pela linhagem animal",

      feature:
        "Características animais",

      height:
        {
          min:
            140,

          max:
            220
        }
    },

    {
      id:
        "vampiro",

      name:
        "Vampiro",

      description:
        "Ser sobrenatural com grande afinidade com forças vitais.",

      profile:
        "Sobrenatural",

      feature:
        "Natureza vampírica",

      height:
        {
          min:
            150,

          max:
            200
        }
    },

    {
      id:
        "centauro",

      name:
        "Centauro",

      description:
        "Humanoide de anatomia híbrida e grande capacidade física.",

      profile:
        "Potente e resistente",

      feature:
        "Anatomia híbrida",

      height:
        {
          min:
            180,

          max:
            230
        }
    },

    {
      id:
        "duende",

      name:
        "Duende",

      description:
        "Pequeno povo conhecido por sua astúcia e adaptação.",

      profile:
        "Ágil e astuto",

      feature:
        "Pequeno porte",

      height:
        {
          min:
            100,

          max:
            145
        }
    },

    {
      id:
        "povo_aquatico",

      name:
        "Povo Aquático",

      description:
        "Povo adaptado a ambientes aquáticos.",

      profile:
        "Adaptado à água",

      feature:
        "Adaptação aquática",

      height:
        {
          min:
            145,

          max:
            205
        }
    },

    {
      id:
        "povo_natureza",

      name:
        "Povo da Natureza",

      description:
        "Seres ligados às forças naturais do mundo.",

      profile:
        "Ligado à natureza",

      feature:
        "Afinidade natural",

      height:
        {
          min:
            140,

          max:
            205
        }
    },

    {
      id:
        "neraliano",

      name:
        "Neraliano",

      description:
        "Povo adaptado a ambientes aquáticos e costeiros.",

      profile:
        "Adaptável",

      feature:
        "Afinidade aquática",

      height:
        {
          min:
            145,

          max:
            205
        }
    },

    {
      id:
        "aureano",

      name:
        "Aureano",

      description:
        "Povo de forte presença e características singulares.",

      profile:
        "Equilibrado",

      feature:
        "Afinidade especial",

      height:
        {
          min:
            150,

          max:
            205
        }
    },

    {
      id:
        "povo_nuvens",

      name:
        "Povo das Nuvens",

      description:
        "Povo leve associado aos céus e às regiões elevadas.",

      profile:
        "Leve",

      feature:
        "Afinidade aérea",

      height:
        {
          min:
            145,

          max:
            200
        }
    },

    {
      id:
        "colosso",

      name:
        "Colosso",

      description:
        "Ser de proporções extraordinárias e grande presença física.",

      profile:
        "Gigantesco",

      feature:
        "Grande porte",

      height:
        {
          min:
            250,

          max:
            400
        }
    },

    {
      id:
        "troll",

      name:
        "Troll",

      description:
        "Criatura de grande resistência e estrutura corporal robusta.",

      profile:
        "Muito resistente",

      feature:
        "Resistência natural",

      height:
        {
          min:
            190,

          max:
            270
        }
    }
  ];


  function getRaces() {
    if (
      Array.isArray(
        window.AERION_RACES
      ) &&
      window.AERION_RACES.length
    ) {
      return window.AERION_RACES;
    }

    return FALLBACK_RACES;
  }


  function getCurrentRaceIndex(
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

    const fromState =
      number(
        state?.raceIndex,
        -1
      );

    if (
      fromState >= 0 &&
      fromState < races.length &&
      (
        !wanted ||
        normalize(
          races[fromState]?.id
        ) === wanted
      )
    ) {
      return fromState;
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

    return (
      races[
        getCurrentRaceIndex(
          state
        )
      ] ||
      races[0] ||
      null
    );
  }


  /* =========================================================
     IMAGENS DAS RAÇAS
     ========================================================= */

  /*
   * Prioridade:
   *
   * 1. URL explicitamente definida na raça;
   * 2. possíveis campos de imagem existentes;
   * 3. URL que já esteja no #raceImage;
   * 4. sem imagem.
   *
   * Isso evita inventar caminhos de arquivo.
   */

  function resolveRaceImage(
    race
  ) {
    if (
      !race
    ) {
      return "";
    }

    const possible =
      [
        race.image,
        race.imageUrl,
        race.imageURL,
        race.src,
        race.asset,
        race.visual,
        race.visualUrl,
        race.img
      ];

    const found =
      possible.find(
        value =>
          typeof value ===
            "string" &&
          value.trim()
      );

    if (
      found
    ) {
      return found.trim();
    }

    const existing =
      $("#raceImage");

    if (
      existing
    ) {
      const current =
        existing.currentSrc ||
        existing.getAttribute(
          "src"
        ) ||
        "";

      if (
        current
      ) {
        return current;
      }
    }

    return "";
  }


  function setImageLoading(
    image,
    loading
  ) {
    if (
      !image
    ) {
      return;
    }

    image.classList.toggle(
      "is-loading",
      loading
    );

    image.parentElement
      ?.classList.toggle(
        "is-loading",
        loading
      );
  }


  function renderRaceImage(
    state
  ) {
    const image =
      $("#raceImage");

    const race =
      getCurrentRace(
        state
      );

    if (
      !image ||
      !race
    ) {
      return;
    }

    const source =
      resolveRaceImage(
        race
      );

    const name =
      race.name ||
      "Raça";


    image.alt =
      `Ilustração da raça ${name}`;


    if (
      !source
    ) {
      image.hidden =
        true;

      image.removeAttribute(
        "src"
      );

      setImageLoading(
        image,
        false
      );

      return;
    }


    if (
      image.getAttribute(
        "src"
      ) ===
      source
    ) {
      image.hidden =
        false;

      return;
    }


    setImageLoading(
      image,
      true
    );


    const preload =
      new Image();


    preload.decoding =
      "async";


    preload.onload =
      () => {

        image.src =
          source;

        image.hidden =
          false;

        setImageLoading(
          image,
          false
        );

        announce(
          `Imagem de ${name} carregada.`
        );
      };


    preload.onerror =
      () => {

        setImageLoading(
          image,
          false
        );

        image.hidden =
          true;

        console.warn(
          "[AERION][RAÇA] Não foi possível carregar:",
          source
        );
      };


    preload.src =
      source;
  }


  /* =========================================================
     CARD DA RAÇA
     ========================================================= */

  function renderRaceCard(
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


    const name =
      $("#raceName");

    const description =
      $("#raceDescription");

    const profile =
      $("#raceProfile");

    const feature =
      $("#raceFeature");

    const minHeight =
      $("#raceHeightMin");

    const maxHeight =
      $("#raceHeightMax");

    const selectButton =
      $("#selectRaceButton");


    if (
      name
    ) {
      name.textContent =
        race.name ||
        "Raça";
    }


    if (
      description
    ) {
      description.textContent =
        race.description ||
        "";
    }


    if (
      profile
    ) {
      profile.textContent =
        race.profile ||
        "—";
    }


    if (
      feature
    ) {
      feature.textContent =
        race.feature ||
        "—";
    }


    if (
      minHeight
    ) {
      minHeight.textContent =
        race.height?.min
          ? `${race.height.min} cm`
          : "—";
    }


    if (
      maxHeight
    ) {
      maxHeight.textContent =
        race.height?.max
          ? `${race.height.max} cm`
          : "—";
    }


    if (
      selectButton
    ) {
      const selected =
        normalize(
          state?.race
        ) ===
        normalize(
          race.id
        );

      selectButton.textContent =
        selected
          ? "✓ Selecionada"
          : "Selecionar";


      selectButton.dataset.race =
        race.id;


      selectButton.classList.toggle(
        "is-selected",
        selected
      );
    }
  }


  /* =========================================================
     DOTS DA RAÇA
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
      getCurrentRaceIndex(
        state
      );


    container.innerHTML =
      races
        .map(
          (race, index) =>
            `
              <button
                type="button"
                class="race-dot${
                  index === active
                    ? " active"
                    : ""
                }"
                data-action="race-goto"
                data-race-index="${index}"
                aria-label="Ir para ${escapeHtml(
                  race.name
                )}"
                ${
                  index === active
                    ? 'aria-current="true"'
                    : ""
                }
              ></button>
            `
        )
        .join("");
  }


  /* =========================================================
     NAVEGAÇÃO DAS RAÇAS
     ========================================================= */

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


    const current =
      getCurrentRaceIndex(
        getState()
      );


    const next =
      (
        current +
        direction +
        races.length
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

    } else {

      lastState = {
        ...getState(),

        race:
          race.id,

        raceIndex:
          next
      };

      render(
        lastState
      );
    }


    announce(
      `Raça: ${race.name}`
    );
  }


  /* =========================================================
     ALTURA
     ========================================================= */

  function getHeightRange(
    state
  ) {
    const race =
      getCurrentRace(
        state
      );

    return {
      min:
        number(
          race?.height?.min,
          150
        ),

      max:
        Math.max(
          number(
            race?.height?.min,
            150
          ),

          number(
            race?.height?.max,
            200
          )
        )
    };
  }


  function renderHeight(
    state
  ) {
    const range =
      getHeightRange(
        state
      );

    const requested =
      number(
        state?.appearance?.height,
        (range.min + range.max) / 2
      );

    const height =
      clamp(
        requested,
        range.min,
        range.max
      );


    const value =
      $("#appearanceHeightValue");


    const slider =
      $("#appearanceHeight");


    const min =
      $("#appearanceHeightMin");


    const max =
      $("#appearanceHeightMax");


    if (
      value
    ) {
      value.textContent =
        `${(height / 100).toFixed(2)} m`;
    }


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

      slider.value =
        String(
          height
        );
    }


    if (
      min
    ) {
      min.textContent =
        `${range.min} cm`;
    }


    if (
      max
    ) {
      max.textContent =
        `${range.max} cm`;
    }
  }


  /* =========================================================
     MANA
     ========================================================= */

  const MANA_STYLES = {
    azul: {
      label:
        "Mana Azul",

      className:
        "mana-azul",

      symbol:
        "◆"
    },

    dourada: {
      label:
        "Mana Dourada",

      className:
        "mana-dourada",

      symbol:
        "◆"
    },

    branca: {
      label:
        "Mana Branca",

      className:
        "mana-branca",

      symbol:
        "◆"
    },

    vermelha: {
      label:
        "Mana Vermelha",

      className:
        "mana-vermelha",

      symbol:
        "◆"
    },

    negra: {
      label:
        "Mana Negra",

      className:
        "mana-negra",

      symbol:
        "◆"
    }
  };


  function getManaKey(
    value
  ) {
    return normalize(
      value
    )
      .replace(
        "mana_",
        ""
      );
  }


  function renderMana() {
    /*
     * Não substitui o HTML existente.
     *
     * Apenas transforma os cards encontrados em cards
     * menores e visualmente identificáveis.
     */

    const cards =
      $$(
        "[data-mana], .mana-card, .mana-option"
      );


    cards.forEach(
      card => {

        const raw =
          card.dataset.mana ||
          card.dataset.manaType ||
          card.dataset.type ||
          card.textContent ||
          "";


        const key =
          getManaKey(
            raw
          );


        const data =
          MANA_STYLES[
            key
          ];


        if (
          !data
        ) {
          return;
        }


        card.classList.add(
          "aerion-mana-card"
        );


        card.classList.remove(
          "mana-azul",
          "mana-dourada",
          "mana-branca",
          "mana-vermelha",
          "mana-negra"
        );


        card.classList.add(
          data.className
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
          data.symbol;


        const title =
          card.querySelector(
            ".mana-name, h3, h4, strong"
          );


        if (
          title
        ) {
          title.textContent =
            data.label;
        }

      }
    );
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function renderAttributes(
    state
  ) {
    $$(

      "[data-attribute]"

    ).forEach(
      element => {

        const attribute =
          normalize(
            element.dataset.attribute
          );


        if (
          !state?.attributes ||
          !Object.prototype.hasOwnProperty.call(
            state.attributes,
            attribute
          )
        ) {
          return;
        }


        const value =
          state.attributes[
            attribute
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
  }


  /* =========================================================
     DADOS ATRIBUÍDOS
     ========================================================= */

  function renderAssignedDice(
    state
  ) {
    const assigned =
      state?.assignedDice ||
      {};


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
          ];


        element.dataset.dice =
          diceId ||
          "";


        element.classList.toggle(
          "has-dice",
          Boolean(
            diceId
          )
        );

      }
    );
  }


  /* =========================================================
     RESULTADOS DE DADOS
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
     CLASSES
     ========================================================= */

  function renderClasses(
    state
  ) {
    $$(
      "[data-class-id], [data-class]"
    ).forEach(
      card => {

        const id =
          normalize(
            card.dataset.classId ||
            card.dataset.class
          );


        const selected =
          normalize(
            state?.class
          ) ===
          id;


        card.classList.toggle(
          "selected",
          selected
        );

        card.classList.toggle(
          "is-selected",
          selected
        );


        const icon =
          card.querySelector(
            ".class-icon, .class-card-icon"
          );


        if (
          icon
        ) {

          icon.classList.add(
            "aerion-class-icon-large"
          );
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
    const total =
      11;

    const current =
      clamp(
        number(
          state?.currentStep,
          0
        ),
        0,
        total - 1
      );


    const percent =
      Math.round(
        (
          current /
          (total - 1)
        ) *
        100
      );


    const bar =
      $("#progressBar");


    const percentText =
      $("#progressPercent");


    const title =
      $("#progressTitle");


    const track =
      $(".progress-track");


    if (
      bar
    ) {
      bar.style.width =
        `${percent}%`;
    }


    if (
      percentText
    ) {
      percentText.textContent =
        `${percent}%`;
    }


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


    const titles = [
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
    ];


    if (
      title
    ) {
      title.textContent =
        titles[
          current
        ] ||
        "Identidade";
    }


    $$(".creation-step")
      .forEach(
        (button, index) => {

          const active =
            index ===
            current;

          const unlocked =
            index <=
            current ||
            Boolean(
              state?.completedSteps?.[
                index
              ]
            );


          button.classList.toggle(
            "active",
            active
          );


          button.classList.toggle(
            "locked",
            !unlocked
          );


          button.disabled =
            !unlocked;

        }
      );
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance(
    state
  ) {
    renderHeight(
      state
    );


    /*
     * O visualizador agora usa a mesma imagem da raça.
     * O personagem-render.js cuida da cópia visual.
     */

    window.dispatchEvent(
      new CustomEvent(
        "aerion:personagem:render",
        {
          detail: {
            state
          }
        }
      )
    );
  }


  /* =========================================================
     RENDER GERAL
     ========================================================= */

  function render(
    state = null
  ) {
    lastState =
      state ||
      getState();


    renderProgress(
      lastState
    );


    renderRaceImage(
      lastState
    );


    renderRaceCard(
      lastState
    );


    renderRaceDots(
      lastState
    );


    renderAppearance(
      lastState
    );


    renderAttributes(
      lastState
    );


    renderAssignedDice(
      lastState
    );


    renderDiceResults(
      lastState
    );


    renderClasses(
      lastState
    );


    renderMana();


    return true;
  }


  /* =========================================================
     EVENTOS
     ========================================================= */

  function bindClicks() {
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


        const action =
          target.dataset.action;


        /* -----------------------------------------
           Navegação
           ----------------------------------------- */

        if (
          action ===
            "next" ||
          action ===
            "next-step"
        ) {

          getCore()
            ?.nextStep?.();

          return;
        }


        if (
          action ===
            "previous" ||
          action ===
            "previous-step" ||
          action ===
            "back"
        ) {

          getCore()
            ?.previousStep?.();

          return;
        }


        if (
          action ===
          "go-step"
        ) {

          getCore()
            ?.goToStep?.(
              target.dataset.step
            );

          return;
        }


        /* -----------------------------------------
           Raça
           ----------------------------------------- */

        if (
          action ===
          "race-next"
        ) {

          changeRace(
            +1
          );

          return;
        }


        if (
          action ===
          "race-previous"
        ) {

          changeRace(
            -1
          );

          return;
        }


        if (
          action ===
          "race-goto"
        ) {

          const races =
            getRaces();


          const index =
            clamp(
              number(
                target.dataset.raceIndex,
                0
              ),
              0,
              races.length - 1
            );


          const race =
            races[index];


          getCore()
            ?.selectRace?.(
              race.id,
              index
            );

          return;
        }


        if (
          action ===
            "select-race" ||
          action ===
            "select-race-current"
        ) {

          const raceId =
            target.dataset.race ||
            target.dataset.raceId ||
            getCurrentRace(
              getState()
            )?.id;


          getCore()
            ?.selectRace?.(
              raceId,
              getCurrentRaceIndex(
                getState()
              )
            );


          toast(
            "Raça selecionada."
          );


          return;
        }


        /* -----------------------------------------
           Classe
           ----------------------------------------- */

        if (
          action ===
          "select-class"
        ) {

          const classId =
            target.dataset.class ||
            target.dataset.classId;


          getCore()
            ?.selectClass?.(
              classId
            );


          return;
        }


        /* -----------------------------------------
           DADOS
           ----------------------------------------- */

        if (
          action ===
            "roll-die" ||
          action ===
            "roll-dice"
        ) {

          const attribute =
            target.dataset.attribute ||
            target.dataset.attributeId;


          if (
            attribute
          ) {

            const result =
              getCore()
                ?.rollAttribute?.(
                  attribute
                );


            if (
              result?.ok
            ) {

              toast(
                `${result.result}`
              );


              announce(
                `Resultado: ${result.result}`
              );

            } else {

              toast(
                result?.error ||
                "Nenhum dado atribuído."
              );
            }

          } else {

            const diceId =
              target.dataset.diceId ||
              target.dataset.dieId;


            getCore()
              ?.rollDie?.(
                diceId
              );
          }


          return;
        }


        if (
          action ===
            "assign-die" ||
          action ===
            "assign-dice"
        ) {

          getCore()
            ?.assignDieToAttribute?.(
              target.dataset.diceId ||
              target.dataset.dieId,

              target.dataset.attribute ||
              target.dataset.attributeId
            );

          return;
        }


        if (
          action ===
            "remove-die" ||
          action ===
            "remove-dice"
        ) {

          getCore()
            ?.removeDieFromAttribute?.(
              target.dataset.attribute ||
              target.dataset.attributeId
            );

          return;
        }


        if (
          action ===
          "clear-dice"
        ) {

          getCore()
            ?.clearDiceAssignments?.();

          return;
        }

      }
    );
  }


  /* =========================================================
     INPUTS
     ========================================================= */

  function bindInputs() {

    document.addEventListener(
      "input",
      event => {

        const input =
          event.target;


        if (
          !input
        ) {
          return;
        }


        const field =
          input.dataset.appearanceField;


        if (
          field
        ) {

          const value =
            (
              input.type ===
                "range" ||
              input.type ===
                "number"
            )
              ? number(
                  input.value
                )
              : input.value;


          getCore()
            ?.setAppearance?.(
              field,
              value
            );

          return;
        }


        if (
          input.id ===
          "appearanceHeight"
        ) {

          getCore()
            ?.setAppearance?.(
              "height",
              number(
                input.value
              )
            );

          return;
        }

      }
    );


    document.addEventListener(
      "change",
      event => {

        const input =
          event.target;


        if (
          !input
        ) {
          return;
        }


        const field =
          input.dataset.appearanceField;


        if (
          field
        ) {

          getCore()
            ?.setAppearance?.(
              field,
              input.value
            );

          return;
        }

      }
    );
  }


  /* =========================================================
     SINCRONIZAÇÃO
     ========================================================= */

  function onFichaUpdated(
    event
  ) {
    const state =
      event?.detail?.state ||
      getState();


    lastState =
      state;


    render(
      state
    );
  }


  function onRaceSelected(
    event
  ) {
    const state =
      event?.detail?.state ||
      getState();


    raceIndex =
      getCurrentRaceIndex(
        state
      );


    render(
      state
    );
  }


  /* =========================================================
     OBSERVADOR DA IMAGEM
     ========================================================= */

  function observeRaceImage() {
    const image =
      $("#raceImage");


    if (
      !image ||
      typeof MutationObserver ===
        "undefined"
    ) {
      return;
    }


    if (
      raceImageObserver
    ) {
      raceImageObserver.disconnect();
    }


    raceImageObserver =
      new MutationObserver(
        () => {

          const state =
            getState();


          /*
           * Atualização da imagem não pode apagar
           * o restante do card.
           */

          if (
            image.src
          ) {
            setImageLoading(
              image,
              false
            );
          }

        }
      );


    raceImageObserver.observe(
      image,
      {
        attributes:
          true,

        attributeFilter:
          [
            "src",
            "srcset"
          ]
      }
    );


    image.addEventListener(
      "load",
      () => {
        setImageLoading(
          image,
          false
        );
      }
    );


    image.addEventListener(
      "error",
      () => {
        setImageLoading(
          image,
          false
        );
      }
    );
  }


  /* =========================================================
     API
     ========================================================= */

  const API = {

    init() {

      observeRaceImage();

      bindClicks();

      bindInputs();

      render();

      return true;
    },


    render,


    refresh() {
      render(
        getState()
      );
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
    },


    getRaces() {
      return [...getRaces()];
    }
  };


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  window.AERIONFichaRender =
    Object.freeze(
      API
    );


  window.AERION_FICHA_RENDER =
    window.AERIONFichaRender;


  /* =========================================================
     EVENTOS
     ========================================================= */

  window.addEventListener(
    "aerion:ficha:updated",
    onFichaUpdated
  );


  window.addEventListener(
    "aerion:race:selected",
    onRaceSelected
  );


  window.addEventListener(
    "aerion:appearance:updated",
    onFichaUpdated
  );


  window.addEventListener(
    "aerion:dice:assigned",
    onFichaUpdated
  );


  window.addEventListener(
    "aerion:dice:rolled",
    onFichaUpdated
  );


  window.addEventListener(
    "aerion:dice:removed",
    onFichaUpdated
  );


  window.addEventListener(
    "aerion:dice:cleared",
    onFichaUpdated
  );


  window.addEventListener(
    "aerion:class:selected",
    onFichaUpdated
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