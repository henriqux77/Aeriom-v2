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
   - controlar ações;
   - navegar;
   - realizar rolagens;
   - alterar o estado;
   - salvar;
   - criar personagem.

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
      sides: 4,
      label: "D4"
    },
    {
      id: "d6-1",
      type: "d6",
      sides: 6,
      label: "D6"
    },
    {
      id: "d6-2",
      type: "d6",
      sides: 6,
      label: "D6"
    },
    {
      id: "d8-1",
      type: "d8",
      sides: 8,
      label: "D8"
    },
    {
      id: "d10-1",
      type: "d10",
      sides: 10,
      label: "D10"
    },
    {
      id: "d12-1",
      type: "d12",
      sides: 12,
      label: "D12"
    },
    {
      id: "d20-1",
      type: "d20",
      sides: 20,
      label: "D20"
    },
    {
      id: "d20-2",
      type: "d20",
      sides: 20,
      label: "D20"
    }
  ]);


  /* =========================================================
     CLASSES
     ========================================================= */

  const CLASS_FALLBACK = Object.freeze([
    {
      id: "guerreiro",
      name: "Guerreiro",
      icon: "⚔",
      description: "Especialista em combate físico e resistência.",
      tags: ["Combate", "Resistência"]
    },
    {
      id: "feiticeiro",
      name: "Feiticeiro",
      icon: "✦",
      description: "Manipulador de magia e energia sobrenatural.",
      tags: ["Magia", "Mana"]
    },
    {
      id: "curandeiro",
      name: "Curandeiro",
      icon: "✚",
      description: "Especialista em restauração e suporte.",
      tags: ["Suporte", "Cura"]
    },
    {
      id: "monge",
      name: "Monge",
      icon: "◈",
      description: "Guerreiro disciplinado que combina corpo e energia.",
      tags: ["Disciplina", "Mana"]
    }
  ]);


  /* =========================================================
     VARIÁVEIS
     ========================================================= */

  let state = {};
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
    return String(value ?? "").trim();
  }


  function number(value, fallback = 0) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }


  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }


  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
  }


  function escapeHTML(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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


  function readState() {
    const core = getCore();

    if (
      core &&
      typeof core.getState === "function"
    ) {
      try {
        return core.getState() || {};
      } catch (error) {
        console.warn(
          "[AERION][RENDER] Falha ao ler estado:",
          error
        );
      }
    }

    return state || {};
  }


  function currentStep(currentState = readState()) {
    return clamp(
      number(
        currentState?.currentStep,
        0
      ),
      0,
      TOTAL_STEPS - 1
    );
  }


  function currentStepId(currentState = readState()) {
    return (
      STEP_IDS[
        currentStep(currentState)
      ] ||
      STEP_IDS[0]
    );
  }


  function emit(eventName, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(
        eventName,
        { detail }
      )
    );
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function showToast(message, type = "") {
    if (!message) {
      return;
    }

    let toast = $("#aerionToast");

    if (!toast) {
      toast =
        document.createElement("div");

      toast.id = "aerionToast";
      toast.className = "ficha-toast";

      document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.classList.remove(
      "success",
      "warning",
      "error"
    );

    if (type) {
      toast.classList.add(type);
    }

    toast.classList.add(
      "is-visible"
    );

    clearTimeout(
      toast.__timer
    );

    toast.__timer =
      setTimeout(() => {
        toast.classList.remove(
          "is-visible"
        );
      }, 2200);
  }


  function announce(message) {
    let live =
      $("#aerionLiveRegion");

    if (!live) {
      live =
        document.createElement("div");

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
     PAINÉIS
     ========================================================= */

  function renderPanels(currentState) {
    const activeId =
      normalize(
        currentStepId(
          currentState
        )
      );

    $$("[data-panel]").forEach(
      panel => {
        const id =
          normalize(
            panel.dataset.panel
          );

        const active =
          id === activeId;

        panel.hidden = !active;

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

    $$("[data-step-panel]").forEach(
      panel => {
        const id =
          normalize(
            panel.dataset.stepPanel
          );

        const active =
          id === activeId;

        panel.hidden = !active;

        panel.classList.toggle(
          "is-active",
          active
        );
      }
    );
  }


  /* =========================================================
     ETAPAS
     ========================================================= */

  function renderStepTabs(currentState) {
    const current =
      currentStep(
        currentState
      );

    const completed =
      Array.isArray(
        currentState?.completedSteps
      )
        ? currentState.completedSteps
        : [];

    $$(".creation-step").forEach(
      (button, index) => {
        const active =
          index === current;

        const unlocked =
          index <= current;

        const complete =
          completed[index] === true;

        button.classList.toggle(
          "active",
          active
        );

        button.classList.toggle(
          "is-active",
          active
        );

        button.classList.toggle(
          "complete",
          complete
        );

        button.classList.toggle(
          "is-complete",
          complete
        );

        button.classList.toggle(
          "locked",
          !unlocked
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
      }
    );
  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function renderProgress(currentState) {
    const current =
      currentStep(
        currentState
      );

    const completed =
      Array.isArray(
        currentState?.completedSteps
      )
        ? currentState.completedSteps.filter(
            Boolean
          ).length
        : 0;

    const percent =
      current >= TOTAL_STEPS - 1
        ? 100
        : Math.round(
            (
              Math.max(
                current,
                Math.min(
                  completed,
                  TOTAL_STEPS - 1
                )
              ) /
              Math.max(
                1,
                TOTAL_STEPS - 1
              )
            ) * 100
          );

    const percentText =
      `${percent}%`;

    /*
      IMPORTANTE:
      o HTML atual usa #progressPercent.
      Também aceitamos [data-progress-percent]
      para manter compatibilidade.
    */

    const percentElement =
      $("#progressPercent");

    if (percentElement) {
      percentElement.textContent =
        percentText;
    }

    $$("[data-progress-percent]")
      .forEach(element => {
        element.textContent =
          percentText;
      });

    const progressBar =
      $("#progressBar");

    if (progressBar) {
      progressBar.style.width =
        percentText;
    }

    $$("[data-current-step]")
      .forEach(element => {
        element.textContent =
          String(current + 1);
      });

    $$("[data-total-steps]")
      .forEach(element => {
        element.textContent =
          String(TOTAL_STEPS);
      });

    $$("[data-current-step-title]")
      .forEach(element => {
        element.textContent =
          STEP_NAMES[current] ||
          "";
      });

    /*
      O botão Próximo só fica habilitado quando a etapa atual
      realmente está pronta. Isso evita desbloqueio por cliques
      em áreas aleatórias da tela ou por estado antigo salvo.
    */
    const nextButton =
      $('[data-action="next-step"]');

    if (nextButton) {
      const stepId =
        normalize(
          currentStepId(
            currentState
          )
        );

      let ready = false;

      switch (stepId) {
        case "identity":
          ready =
            Boolean(
              text(currentState?.name)
            ) &&
            Boolean(
              text(currentState?.gender)
            );
          break;

        case "race":
          ready =
            Boolean(
              text(currentState?.race)
            );

          if (
            ready &&
            normalize(currentState?.race) ===
              "animalha"
          ) {
            ready =
              Boolean(
                text(currentState?.animalhaCategory)
              ) &&
              Boolean(
                text(
                  typeof currentState?.animalha ===
                    "string"
                    ? currentState.animalha
                    : currentState?.animalha?.animal ||
                      currentState?.animalha?.variation ||
                      currentState?.animalhaAnimal
                )
              );
          }
          break;

        case "appearance":
          ready =
            Number(
              currentState?.appearance?.height
            ) > 0;
          break;

        case "class":
          ready =
            Boolean(
              text(currentState?.class)
            );
          break;

        case "attributes":
          ready =
            ATTRIBUTES.every(
              attribute =>
                Boolean(
                  currentState?.assignedDice?.[
                    attribute.id
                  ]
                )
            );
          break;

        case "power":
          ready =
            Boolean(
              text(currentState?.primaryPower)
            );
          break;

        default:
          ready = true;
      }

      nextButton.disabled =
        current >= TOTAL_STEPS - 1 ||
        !ready;

      nextButton.setAttribute(
        "aria-disabled",
        nextButton.disabled
          ? "true"
          : "false"
      );
    }


    const track =
      $(".progress-track");

    if (track) {
      track.setAttribute(
        "aria-valuemin",
        "0"
      );

      track.setAttribute(
        "aria-valuemax",
        "100"
      );

      track.setAttribute(
        "aria-valuenow",
        String(percent)
      );
    }
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function renderIdentity(currentState) {
    const values = {
      name:
        currentState?.name ||
        currentState?.characterName ||
        "",

      age:
        currentState?.age ||
        currentState?.characterAge ||
        "",

      gender:
        currentState?.gender ||
        "",

      description:
        currentState?.description ||
        currentState?.characterDescription ||
        "",

      origin:
        currentState?.origin ||
        currentState?.characterOrigin ||
        "",

      personality:
        currentState?.personality || "",

      objective:
        currentState?.objective || "",

      fear:
        currentState?.fear || "",

      importantBond:
        currentState?.importantBond || "",

      history:
        currentState?.history || "",

      region:
        currentState?.region || ""
    };

    /*
      Inputs da ficha.
    */

    const fields = {
      "#characterName":
        values.name,

      "#characterAge":
        values.age,

      "#characterDescription":
        values.description,

      "#characterOrigin":
        values.origin
    };

    Object.entries(fields)
      .forEach(
        ([selector, value]) => {
          const element =
            $(selector);

          if (
            element &&
            document.activeElement !==
              element
          ) {
            element.value =
              text(value);
          }
        }
      );

    /*
      Radio de gênero.
    */

    $$(
      'input[name="gender"]'
    ).forEach(
      radio => {
        radio.checked =
          normalize(
            radio.value
          ) ===
          normalize(
            values.gender
          );
      }
    );

    /*
      Campos de resumo/revisão.
    */

    $$("[data-render-field]")
      .forEach(
        element => {
          const field =
            element.dataset.renderField;

          const value =
            values[field] ?? "";

          element.textContent =
            text(value) || "—";
        }
      );


    /*
      Compatibilidade com
      data-field-name.
    */

    $$("[data-field-name]")
      .forEach(
        element => {
          const field =
            element.dataset.fieldName;

          const value =
            values[field] ?? "";

          if (
            "value" in element &&
            document.activeElement !==
              element
          ) {
            element.value =
              text(value);
          } else {
            element.textContent =
              text(value) || "—";
          }
        }
      );


    $$("[data-concept-field], [data-identity-field]")
      .forEach(
        element => {
          const field =
            element.dataset.conceptField ||
            element.dataset.identityField;

          const value =
            values[field] ?? "";

          if (
            "value" in element &&
            document.activeElement !==
              element
          ) {
            element.value =
              text(value);
          } else if (
            !("value" in element)
          ) {
            element.textContent =
              text(value) || "—";
          }
        }
      );
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function getRaceCollection() {
    const assets =
      getAssets();

    if (!assets) {
      return [];
    }

    if (
      Array.isArray(
        assets.RACES
      )
    ) {
      return assets.RACES;
    }

    if (
      Array.isArray(
        assets.races
      )
    ) {
      return assets.races;
    }

    if (
      assets.RACES &&
      typeof assets.RACES ===
        "object"
    ) {
      return Object.values(
        assets.RACES
      );
    }

    if (
      assets.races &&
      typeof assets.races ===
        "object"
    ) {
      return Object.values(
        assets.races
      );
    }

    return [];
  }


  function getRaceById(id) {
    const target =
      normalize(id);

    return getRaceCollection()
      .find(
        race =>
          normalize(
            race?.id ||
            race?.key ||
            race?.slug ||
            race?.name
          ) === target
      ) || null;
  }


  function getRaceImage(
    race,
    gender
  ) {
    if (!race) {
      return "";
    }

    const normalizedGender =
      normalize(gender);

    const images =
      race.images ||
      race.image ||
      race.art ||
      {};

    if (
      typeof images ===
      "string"
    ) {
      return images;
    }

    if (
      normalizedGender ===
      "feminino"
    ) {
      return text(
        images.feminino ||
        images.F ||
        race.feminino ||
        race.imageFemale ||
        ""
      );
    }

    return text(
      images.masculino ||
      images.M ||
      race.masculino ||
      race.imageMale ||
      ""
    );
  }


  function renderRace(currentState) {
    const races =
      getRaceCollection();

    const fallbackRace =
      currentState?.race
        ? getRaceById(
            currentState.race
          )
        : null;

    const index =
      clamp(
        number(
          currentState?.raceIndex,
          0
        ),
        0,
        Math.max(
          0,
          races.length - 1
        )
      );

    const previewRace =
      races[index] ||
      fallbackRace ||
      null;

    const selectedRace =
      currentState?.race
        ? getRaceById(
            currentState.race
          )
        : null;

    const race =
      previewRace ||
      selectedRace;


    const name =
      race?.name ||
      race?.label ||
      "Nenhuma raça";


    const description =
      race?.shortDescription ||
      race?.description ||
      race?.summary ||
      "";


    const image =
      getRaceImage(
        race,
        currentState?.gender
      );


    const imageElement =
      $("#raceImage");

    if (imageElement) {
      imageElement.src =
        image ||
        "";

      imageElement.alt =
        name;

      imageElement.hidden =
        !image;
    }


    const nameElement =
      $("#raceName");

    if (nameElement) {
      nameElement.textContent =
        name;
    }


    const descriptionElement =
      $("#raceShortDescription");

    if (descriptionElement) {
      descriptionElement.textContent =
        description;
    }


    /*
      Altura.
    */

    const heightMin =
      race?.height?.min ??
      race?.heightMin ??
      race?.minHeight;

    const heightMax =
      race?.height?.max ??
      race?.heightMax ??
      race?.maxHeight;


    const minElement =
      $("#raceHeightMin");

    const maxElement =
      $("#raceHeightMax");

    if (minElement) {
      minElement.textContent =
        heightMin != null
          ? `${heightMin} cm`
          : "—";
    }

    if (maxElement) {
      maxElement.textContent =
        heightMax != null
          ? `${heightMax} cm`
          : "—";
    }


    /*
      Características.
    */

    const features =
      race?.features ||
      race?.traits ||
      race?.abilities ||
      [];

    $$(

      "[data-race-feature]"

    ).forEach(
      (
        element,
        featureIndex
      ) => {
        element.textContent =
          text(
            features[
              featureIndex
            ]
          );

        element.hidden =
          !text(
            features[
              featureIndex
            ]
          );
      }
    );


    /*
      Perfil de raça.
    */

    $$("[data-race-profile]")
      .forEach(
        element => {
          element.textContent =
            text(
              race?.profile ||
              race?.specialty ||
              "—"
            );
        }
      );

    $$("[data-race-feature]")
      .forEach(
        element => {
          element.textContent =
            text(
              race?.feature ||
              race?.features?.[0] ||
              race?.traits?.[0] ||
              "—"
            );
        }
      );


    /*
      Texto de seleção.
    */

    const selection =
      $("#raceSelectedText");

    if (selection) {
      const selectedId =
        normalize(
          currentState?.race
        );

      const previewId =
        normalize(
          race?.id ||
          race?.name
        );

      const isSelected =
        Boolean(
          selectedId &&
          selectedId ===
            previewId
        );

      selection.textContent =
        isSelected
          ? `✓ ${name} selecionada`
          : "Pré-visualizando raça";

      selection.classList.toggle(
        "is-selected",
        isSelected
      );
    }


    /*
      Card de raça.
    */

    const raceCard =
      $("#raceCard");

    if (raceCard) {
      const hasRace =
        Boolean(race);

      raceCard.dataset.raceId =
        race?.id ||
        race?.name ||
        "";

      // O CSS oculta o card de raça por padrão.
      // O renderer precisa abrir o card ativo,
      // assim como já faz com as classes.
      raceCard.hidden =
        !hasRace;

      raceCard.classList.toggle(
        "is-active",
        hasRace
      );
    }


    /*
      Dots.
    */

    const dotsContainer =
      $("#raceDots");

    if (dotsContainer) {

      dotsContainer.innerHTML =
        races
          .map(
            (item, raceIndex) => {
              const active =
                raceIndex === index;

              return `
                <button
                  type="button"
                  class="race-dot ${active ? "active" : ""}"
                  data-action="race-goto"
                  data-race-index="${raceIndex}"
                  aria-label="Ver ${escapeHTML(
                    item?.name ||
                    item?.label ||
                    `raça ${raceIndex + 1}`
                  )}"
                  aria-current="${
                    active
                      ? "true"
                      : "false"
                  }"
                ></button>
              `;
            }
          )
          .join("");
    }


    /*
      Controles.
    */

    const previous =
      $(
        '[data-action="race-previous"]'
      );

    const next =
      $(
        '[data-action="race-next"]'
      );

    if (previous) {
      previous.disabled =
        races.length <= 1 ||
        index <= 0;
    }

    if (next) {
      next.disabled =
        races.length <= 1 ||
        index >=
          races.length - 1;
    }
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function getAnimalhaData() {
    const assets =
      getAssets();

    if (!assets) {
      return {
        categories: [],
        animals: []
      };
    }

    const source =
      assets.ANIMALHA ||
      assets.animalha ||
      assets.animalhaData ||
      {};

    let categories =
      source.categories ||
      assets.ANIMALHA_CATEGORIES ||
      assets.animalhaCategories ||
      [];

    let animals =
      source.animals ||
      assets.ANIMALHA_ANIMALS ||
      assets.animalhaAnimals ||
      [];


    if (
      !Array.isArray(categories)
    ) {
      categories =
        Object.entries(
          categories
        ).map(
          ([id, value]) => ({
            id,
            ...(value || {})
          })
        );
    }

    if (
      !Array.isArray(animals)
    ) {
      animals =
        Object.entries(
          animals
        ).map(
          ([id, value]) => ({
            id,
            ...(value || {})
          })
        );
    }


    return {
      categories,
      animals
    };
  }


  function getAnimalCategory(id) {
    const data =
      getAnimalhaData();

    return data.categories
      .find(
        category =>
          normalize(
            category.id ||
            category.key ||
            category.name
          ) ===
          normalize(id)
      ) || null;
  }


  function getAnimalVariations(categoryId) {
    const data =
      getAnimalhaData();

    const normalizedCategory =
      normalize(categoryId);

    return data.animals.filter(
      animal =>
        normalize(
          animal.category ||
          animal.categoryId ||
          animal.group
        ) ===
        normalizedCategory
    );
  }


  function getAnimalhaArt(category) {
    if (!category) {
      return "";
    }

    return text(
      category.art ||
      category.image ||
      category.background ||
      category.backgroundImage ||
      ""
    );
  }


  function renderAnimalha(currentState) {
    const data =
      getAnimalhaData();

    const categoryContainer =
      $(
        "[data-animalha-categories]"
      );

    const animalsContainer =
      $(
        "[data-animalha-animals]"
      );

    if (
      !categoryContainer &&
      !animalsContainer
    ) {
      return;
    }

    const section =
      $(
        "[data-animalha-section]"
      );

    const isAnimalha =
      normalize(
        currentState?.race
      ) === "animalha";

    if (section) {
      section.hidden =
        !isAnimalha;

      section.classList.toggle(
        "is-visible",
        isAnimalha
      );
    }

    const selectedCategory =
      normalize(
        currentState?.animalhaCategory ||
        currentState?.animalha?.category ||
        ""
      );

    const selectedAnimal =
      normalize(
        typeof currentState?.animalha ===
          "string"
          ? currentState.animalha
          : currentState?.animalha?.animal ||
            currentState?.animalha?.variation ||
            currentState?.animalhaAnimal ||
            currentState?.animalhaVariation ||
            ""
      );


    /*
      CATEGORIAS
    */

    if (categoryContainer) {

      categoryContainer.innerHTML =
        data.categories
          .map(
            category => {

              const id =
                category.id ||
                category.key ||
                category.name;

              const normalizedId =
                normalize(id);

              const selected =
                normalizedId ===
                selectedCategory;

              const art =
                getAnimalhaArt(
                  category
                );

              return `
                <button
                  type="button"
                  class="animalha-category ${
                    selected
                      ? "is-selected active"
                      : ""
                  }"
                  data-action="select-animalha-category"
                  data-category="${escapeHTML(
                    id
                  )}"
                  aria-pressed="${
                    selected
                      ? "true"
                      : "false"
                  }"
                >

                  <span
                    class="animalha-category-art"
                    data-art="${escapeHTML(
                      id
                    )}"
                    ${
                      art
                        ? `style="background-image:url('${escapeHTML(
                            art
                          )}')"`
                        : ""
                    }
                  ></span>

                  <strong>
                    ${escapeHTML(
                      category.name ||
                      category.label ||
                      id
                    )}
                  </strong>

                  <small>
                    ${escapeHTML(
                      category.description ||
                      category.subtitle ||
                      "Escolha uma linhagem."
                    )}
                  </small>

                </button>
              `;
            }
          )
          .join("");
    }


    /*
      VARIAÇÕES
    */

    if (
      animalsContainer
    ) {

      if (!selectedCategory) {

        animalsContainer.innerHTML = `
          <div class="animalha-empty">
            Escolha uma categoria de Animalha.
          </div>
        `;

      } else {

        const variations =
          getAnimalVariations(
            selectedCategory
          );

        animalsContainer.innerHTML =
          variations.length

            ? variations
                .map(
                  animal => {

                    const id =
                      animal.id ||
                      animal.key ||
                      animal.name;

                    const selected =
                      normalize(id) ===
                      selectedAnimal;

                    return `
                      <button
                        type="button"
                        class="animalha-animal ${
                          selected
                            ? "is-selected active"
                            : ""
                        }"
                        data-action="select-animalha-animal"
                        data-animal="${escapeHTML(
                          id
                        )}"
                        aria-pressed="${
                          selected
                            ? "true"
                            : "false"
                        }"
                      >

                        <strong>
                          ${escapeHTML(
                            animal.name ||
                            animal.label ||
                            id
                          )}
                        </strong>

                        <small>
                          ${escapeHTML(
                            animal.description ||
                            animal.type ||
                            animal.subtype ||
                            ""
                          )}
                        </small>

                      </button>
                    `;
                  }
                )
                .join("")

            : `
              <div class="animalha-empty">
                Nenhuma variação cadastrada nesta categoria.
              </div>
            `;
      }
    }
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance(currentState) {

    const height =
      number(
        currentState?.appearance?.height ??
        currentState?.height,
        170
      );


    const race =
      getRaceById(
        currentState?.race
      );


    const minHeight =
      number(
        race?.height?.min ??
        race?.heightMin ??
        race?.minHeight,
        100
      );


    const maxHeight =
      number(
        race?.height?.max ??
        race?.heightMax ??
        race?.maxHeight,
        220
      );


    const slider =
      $(
        "#appearanceHeight"
      );


    if (slider) {
      slider.min =
        String(minHeight);

      slider.max =
        String(maxHeight);

      slider.value =
        String(
          clamp(
            height,
            minHeight,
            maxHeight
          )
        );
    }


    /*
      Valor visível.
    */

    const value =
      $("#appearanceHeightValue") ||
      $(".appearance-height-value");


    if (value) {
      value.textContent =
        `${Math.round(height)} cm`;
    }


    $$(
      "[data-height-value]"
    ).forEach(
      element => {
        element.textContent =
          `${Math.round(height)} cm`;
      }
    );


    /*
      Mínimo / máximo.
    */

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


    /*
      Campos descritivos.
    */

    const appearance =
      currentState?.appearance ||
      {};

    const appearanceFields = {
      hairColor:
        appearance.hairColor ||
        currentState?.hairColor ||
        "",

      eyeColor:
        appearance.eyeColor ||
        currentState?.eyeColor ||
        "",

      skinTone:
        appearance.skinTone ||
        currentState?.skinTone ||
        "",

      hairType:
        appearance.hairType ||
        currentState?.hairType ||
        "",

      physicalFeatures:
        appearance.physicalFeatures ||
        currentState?.physicalFeatures ||
        "",

      scars:
        appearance.scars ||
        currentState?.scars ||
        "",

      description:
        appearance.description ||
        currentState?.appearanceDescription ||
        ""
    };


    $$(
      "[data-appearance-field]"
    ).forEach(
      element => {

        const field =
          element.dataset.appearanceField;

        const value =
          appearanceFields[field] ??
          "";

        if (
          "value" in element &&
          document.activeElement !==
            element
        ) {
          element.value =
            text(value);
        }
      }
    );


    const APPEARANCE_PRESETS = {
      humano: {
        skinTone: [
          ["claro", "Claro"],
          ["medio", "Médio"],
          ["escuro", "Escuro"]
        ]
      },

      elfo: {
        skinTone: [
          ["claro", "Claro"],
          ["medio", "Médio"],
          ["oliva", "Oliva"]
        ]
      },

      anao: {
        skinTone: [
          ["claro", "Claro"],
          ["medio", "Médio"],
          ["escuro", "Escuro"],
          ["avermelhado", "Avermelhado"]
        ]
      },

      orc: {
        skinTone: [
          ["verde_claro", "Verde claro"],
          ["verde", "Verde"],
          ["verde_escuro", "Verde escuro"],
          ["oliva", "Oliva"]
        ]
      },

      troll: {
        skinTone: [
          ["verde_claro", "Verde claro"],
          ["verde", "Verde"],
          ["verde_escuro", "Verde escuro"]
        ],
        eyeColor: [
          ["amarelo", "Amarelo"],
          ["vermelho", "Vermelho"],
          ["castanho", "Castanho"],
          ["preto", "Preto"]
        ]
      },

      vampiro: {
        skinTone: [
          ["palido", "Pálido"],
          ["muito_palido", "Muito pálido"],
          ["acinzentado", "Acinzentado"]
        ],
        eyeColor: [
          ["vermelho", "Vermelho"],
          ["violeta", "Violeta"],
          ["dourado", "Dourado"],
          ["preto", "Preto"]
        ]
      },

      neraliano: {
        skinTone: [
          ["azulado", "Azulado"],
          ["esverdeado", "Esverdeado"],
          ["medio", "Médio"]
        ]
      },

      povo_aquatico: {
        skinTone: [
          ["azulado", "Azulado"],
          ["esverdeado", "Esverdeado"],
          ["medio", "Médio"]
        ]
      },

      fada: {
        skinTone: [
          ["claro", "Claro"],
          ["medio", "Médio"],
          ["dourado", "Dourado"]
        ]
      }
    };

    const raceKey =
      normalize(
        race?.id ||
        race?.key ||
        currentState?.race ||
        ""
      );

    const preset =
      APPEARANCE_PRESETS[
        raceKey
      ] || {};

    $$(
      "[data-appearance-field]"
    ).forEach(
      select => {

        const field =
          select.dataset.appearanceField;

        const options =
          preset[field];

        if (
          !Array.isArray(options) ||
          !options.length
        ) {
          return;
        }

        const currentValue =
          text(
            appearanceFields[field]
          );

        select.innerHTML =
          options
            .map(
              ([value, label]) =>
                `<option value="${escapeHTML(
                  value
                )}">${escapeHTML(
                  label
                )}</option>`
            )
            .join("") +
          `<option value="personalizado">Personalizado</option>`;

        const compatible =
          options.some(
            ([value]) =>
              normalize(value) ===
              normalize(currentValue)
          );

        select.value =
          compatible
            ? currentValue
            : options[0][0];
      }
    );

    $$(
      "[data-appearance-custom]"
    ).forEach(
      element => {

        const field =
          element.dataset.appearanceCustom;

        const value =
          appearanceFields[field] ??
          "";

        if (
          "value" in element &&
          document.activeElement !==
            element
        ) {
          element.value =
            text(value);
        }
      }
    );

    const powerRoll =
      $(
        "[data-power-roll-result]"
      );

    if (powerRoll) {
      powerRoll.textContent =
        currentState?.powerRoll != null
          ? `D100: ${currentState.powerRoll}`
          : "—";
    }

    $$(
      ".power-choice"
    ).forEach(
      button => {
        button.classList.toggle(
          "is-selected",
          normalize(
            button.dataset.power
          ) ===
            normalize(
              currentState?.primaryPower
            )
        );
      }
    );

    /*
      Emitimos para o personagem-render
      atualizar a imagem/tamanho.
    */

    emit(
      "aerion:personagem:render",
      {
        state: currentState
      }
    );
  }


  /* =========================================================
     CLASSES
     ========================================================= */

  function getClasses() {
    const assets =
      getAssets();

    const external =
      assets?.CLASSES ||
      assets?.classes ||
      window.AERION_CLASSES ||
      null;

    if (
      Array.isArray(external) &&
      external.length
    ) {
      return external;
    }

    if (
      external &&
      typeof external ===
        "object"
    ) {
      return Object.values(
        external
      );
    }

    return CLASS_FALLBACK;
  }


  function renderClass(currentState) {
    const classes =
      getClasses();

    const selected =
      normalize(
        currentState?.classId ||
        currentState?.class ||
        currentState?.characterClass
      );

    const currentIndex =
      clamp(
        number(
          currentState?.classIndex,
          selected
            ? Math.max(
                0,
                classes.findIndex(
                  item =>
                    normalize(
                      item?.id ||
                      item?.key ||
                      item?.name
                    ) === selected
                )
              )
            : 0
        ),
        0,
        Math.max(
          0,
          classes.length - 1
        )
      );


    /*
      Atualiza cards existentes.
    */

    const cards =
      $$(
        "[data-class-id]"
      );


    cards.forEach(
      (
        card
      ) => {

        const id =
          normalize(
            card.dataset.classId
          );

        const active =
          id ===
          normalize(
            classes[
              currentIndex
            ]?.id ||
            classes[
              currentIndex
            ]?.key ||
            classes[
              currentIndex
            ]?.name
          );

        card.classList.toggle(
          "is-active",
          active
        );

        card.hidden =
          !active;
      }
    );


    /*
      Caso o HTML tenha o card
      específico de carrossel.
    */

    const activeClass =
      classes[
        currentIndex
      ] ||
      null;


    const genericCard =
      $("#classCarouselCard");


    if (genericCard) {

      genericCard.innerHTML =
        createClassCard(
          activeClass,
          selected
        );
    }


    /*
      Preenche elementos existentes
      do card ativo.
    */

    $$(

      "[data-class-name]"

    ).forEach(
      element => {
        element.textContent =
          activeClass?.name ||
          activeClass?.label ||
          "Classe";
      }
    );


    $$(

      "[data-class-description]"

    ).forEach(
      element => {
        element.textContent =
          activeClass?.description ||
          activeClass?.shortDescription ||
          "";
      }
    );


    $$(

      "[data-class-icon]"

    ).forEach(
      element => {
        element.textContent =
          activeClass?.icon ||
          "";
      }
    );


    /*
      Botão de seleção.
    */

    $$(
      '[data-action="select-class"]'
    ).forEach(
      button => {

        const id =
          normalize(
            button.dataset.classId ||
            activeClass?.id ||
            ""
          );

        const isSelected =
          id === selected &&
          Boolean(id);

        button.classList.toggle(
          "is-selected",
          isSelected
        );

        button.classList.toggle(
          "selected",
          isSelected
        );

        button.textContent =
          isSelected
            ? "✓ Classe selecionada"
            : "Selecionar classe";
      }
    );


    /*
      Contador.
    */

    $$(
      "[data-class-counter]"
    ).forEach(
      element => {
        element.textContent =
          `${currentIndex + 1} / ${Math.max(
            1,
            classes.length
          )}`;
      }
    );


    /*
      Classe escolhida.
    */

    $$(
      "[data-class-selected]"
    ).forEach(
      element => {

        const active =
          selected ===
          normalize(
            activeClass?.id ||
            activeClass?.key ||
            activeClass?.name
          );

        element.textContent =
          active
            ? `✓ ${activeClass?.name || "Classe"} selecionada`
            : "Nenhuma classe selecionada";

        element.classList.toggle(
          "is-selected",
          active
        );
      }
    );


    /*
      Setas.
    */

    const previous =
      $(
        '[data-action="class-previous"]'
      );

    const next =
      $(
        '[data-action="class-next"]'
      );

    if (previous) {
      previous.disabled =
        classes.length <= 1 ||
        currentIndex <= 0;
    }

    if (next) {
      next.disabled =
        classes.length <= 1 ||
        currentIndex >=
          classes.length - 1;
    }
  }


  function createClassCard(
    classData,
    selectedId
  ) {
    if (!classData) {
      return `
        <div class="class-empty">
          Nenhuma classe cadastrada.
        </div>
      `;
    }

    const id =
      classData.id ||
      classData.key ||
      classData.name ||
      "";

    const selected =
      normalize(id) ===
      normalize(selectedId);

    const tags =
      Array.isArray(classData.tags)
        ? classData.tags
        : [];

    const image =
      classData.image ||
      classData.imageUrl ||
      "";

    return `
      <div class="class-option-content">
        ${
          image
            ? `
              <div class="class-option-image">
                <img
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(
                    classData.name ||
                    "Classe"
                  )}"
                >
              </div>
            `
            : ""
        }

        <div class="class-option-body">
          <div class="class-icon-large">
            ${escapeHTML(classData.icon || "")}
          </div>

          <span class="eyebrow">
            ${escapeHTML(classData.role || "CLASSE")}
          </span>

          <h3>
            ${escapeHTML(
              classData.name ||
              classData.label ||
              "Classe"
            )}
          </h3>

          <p>
            ${escapeHTML(
              classData.description ||
              classData.shortDescription ||
              ""
            )}
          </p>

          ${
            tags.length
              ? `
                <div class="class-option-tags">
                  ${tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}
                </div>
              `
              : ""
          }

          <button
            type="button"
            class="primary-button class-select-button ${
              selected ? "is-selected" : ""
            }"
            data-action="select-class"
            data-class-id="${escapeHTML(id)}"
          >
            ${
              selected
                ? "✓ Classe selecionada"
                : "Selecionar classe"
            }
          </button>
        </div>
      </div>
    `;
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function getAttributeValue(
    currentState,
    attributeId
  ) {
    const values =
      currentState?.attributes ||
      {};

    return number(
      values[attributeId],
      0
    );
  }


  function getAssignedDie(
    currentState,
    attributeId
  ) {
    const assigned =
      currentState?.assignedDice ||
      {};

    return (
      assigned[attributeId] ||
      ""
    );
  }


  function getDieResult(
    currentState,
    attributeId
  ) {
    const diceResults =
      currentState?.diceResults ||
      {};

    const dieId =
      getAssignedDie(
        currentState,
        attributeId
      );

    if (!dieId) {
      return "";
    }

    const result =
      diceResults[dieId];

    return result == null
      ? ""
      : result;
  }


  function getDieById(dieId) {
    return DICE.find(
      die =>
        die.id === dieId
    ) || null;
  }


  function renderAttributes(
    currentState
  ) {

    const attributesContainer =
      $(
        "[data-attributes-list]"
      );


    /*
      Se o HTML tiver container
      dinâmico, montamos os cards.
    */

    if (
      attributesContainer
    ) {

      attributesContainer.innerHTML =
        ATTRIBUTES
          .map(
            attribute =>
              createAttributeCard(
                currentState,
                attribute
              )
          )
          .join("");

    } else {

      /*
        Se já existirem cards estáticos,
        apenas atualizamos.
      */

      $$(
        "[data-attribute-card]"
      ).forEach(
        card => {

          const id =
            card.dataset.attributeCard;

          updateAttributeCard(
            card,
            currentState,
            id
          );
        }
      );
    }


    /*
      Cards genéricos com data-attribute.
    */

    $$(
      ".attribute-card[data-attribute]"
    ).forEach(
      card => {

        const id =
          card.dataset.attribute;

        updateAttributeCard(
          card,
          currentState,
          id
        );
      }
    );


    /*
      Atributo atualmente selecionado
      para receber o dado.

      O ficha.js deve controlar
      selectedAttribute.
    */

    const selectedAttribute =
      normalize(
        currentState?.selectedAttribute ||
        currentState?.attributeSelection
      );


    $$(
      ".attribute-card"
    ).forEach(
      card => {

        const id =
          normalize(
            card.dataset.attribute ||
            card.dataset.attributeCard
          );

        card.classList.toggle(
          "is-selected",
          id === selectedAttribute
        );

        card.classList.toggle(
          "selected",
          id === selectedAttribute
        );

        card.setAttribute(
          "aria-pressed",
          id === selectedAttribute
            ? "true"
            : "false"
        );
      }
    );


    /*
      Na criação contamos DADOS ATRIBUÍDOS, não rolagens.
    */
    const assignedCount =
      ATTRIBUTES.filter(
        attribute =>
          Boolean(
            currentState?.assignedDice?.[
              attribute.id
            ]
          )
      ).length;

    $$
      (
        "[data-attributes-complete]"
      )
      .forEach(
        element => {
          element.textContent =
            `${assignedCount}/${ATTRIBUTES.length}`;
        }
      );


    renderAttributeGraph(
      currentState
    );
  }


  function createAttributeCard(
    currentState,
    attribute
  ) {
    const dieId =
      getAssignedDie(
        currentState,
        attribute.id
      );

    const die =
      getDieById(
        dieId
      );

    return `
      <article
        class="attribute-card"
        data-action="select-attribute"
        data-attribute="${escapeHTML(
          attribute.id
        )}"
        aria-pressed="false"
      >

        <div class="attribute-card-header">
          <div class="attribute-heading">
            <span
              class="attribute-short attribute-abbr"
              data-attribute-short
            >
              ${escapeHTML(attribute.short)}
            </span>

            <span
              class="attribute-label attribute-name"
              data-attribute-name
            >
              ${escapeHTML(attribute.name)}
            </span>
          </div>

          <strong
            class="attribute-value"
            data-attribute-value
          >
            ${escapeHTML(die?.label || "Escolha um dado")}
          </strong>
        </div>

        <div class="attribute-card-middle">
          <div
            class="attribute-die-slot attribute-die"
            data-attribute-die
          >
            ${die ? escapeHTML(die.label) : "Nenhum dado atribuído"}
          </div>
        </div>

        <div class="attribute-card-actions">
          <button
            type="button"
            class="attribute-remove-button"
            data-action="remove-die"
            data-attribute="${escapeHTML(attribute.id)}"
            ${die ? "" : "disabled"}
          >
            ${die ? "Remover dado" : "Aguardando dado"}
          </button>
        </div>

      </article>
    `;
  }

  function updateAttributeCard(
    card,
    currentState,
    attributeId
  ) {
    const id =
      normalize(attributeId);

    const attribute =
      ATTRIBUTE_MAP[id];

    if (!attribute) {
      return;
    }

    const dieId =
      getAssignedDie(
        currentState,
        id
      );

    const die =
      getDieById(
        dieId
      );

    const name =
      $(".attribute-name", card);

    const abbr =
      $(".attribute-abbr", card);

    const valueElement =
      $(".attribute-value", card);

    if (name) {
      name.textContent =
        attribute.name;
    }

    if (abbr) {
      abbr.textContent =
        attribute.short;
    }

    if (valueElement) {
      valueElement.textContent =
        die?.label ||
        "Escolha um dado";
    }

    const dieElement =
      $(".attribute-die", card);

    if (dieElement) {
      dieElement.textContent =
        die?.label ||
        "Nenhum dado atribuído";
      dieElement.hidden =
        false;
    }

    const rollButton =
      $('[data-action="roll-attribute"]', card);

    if (rollButton) {
      rollButton.remove();
    }

    const removeButton =
      $('[data-action="remove-die"]', card);

    if (removeButton) {
      removeButton.disabled =
        !Boolean(die);
      removeButton.textContent =
        die
          ? "Remover dado"
          : "Aguardando dado";
    }

    const resultElement =
      $(".attribute-result", card);

    if (resultElement) {
      resultElement.textContent = "";
      resultElement.hidden = true;
    }
  }


  /* =========================================================
     GRÁFICO
     ========================================================= */

  function renderAttributeGraph(
    currentState
  ) {
    const graph =
      $("[data-attribute-graph]") ||
      $("#attributeGraph") ||
      $("[data-attributes-chart]");

    if (!graph) {
      return;
    }

    graph.innerHTML = `
      <div class="attribute-dice-summary">
        ${ATTRIBUTES
          .map(attribute => {
            const die =
              getDieById(
                getAssignedDie(
                  currentState,
                  attribute.id
                )
              );

            return `
              <div class="attribute-dice-summary-item">
                <span>${escapeHTML(attribute.short)}</span>
                <strong>${escapeHTML(
                  die?.label || "—"
                )}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
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

    const diceResults =
      currentState?.diceResults ||
      {};

    const selectedAttribute =
      normalize(
        currentState?.selectedAttribute ||
        currentState?.attributeSelection
      );


    /*
      Atualiza dados existentes.
    */

    $$(
      "[data-die-id]"
    ).forEach(
      button => {

        const id =
          button.dataset.dieId;

        const die =
          getDieById(id);

        if (!die) {
          return;
        }

        const assignedAttribute =
          ATTRIBUTES.find(
            attribute =>
              normalize(
                assigned[
                  attribute.id
                ]
              ) ===
              normalize(id)
          )?.id || "";


        const isUsed =
          Boolean(
            assignedAttribute
          );


        button.classList.toggle(
          "is-used",
          isUsed
        );

        button.classList.toggle(
          "used",
          isUsed
        );


        button.classList.toggle(
          "is-assigned",
          assignedAttribute ===
            selectedAttribute
        );


        button.dataset.attribute =
          selectedAttribute;


        button.setAttribute(
          "aria-label",
          selectedAttribute
            ? `${die.label} para ${
                ATTRIBUTE_MAP[
                  selectedAttribute
                ]?.name ||
                "atributo"
              }`
            : `${die.label}`
        );


        const result =
          diceResults[id];

        if (
          result != null
        ) {
          button.dataset.result =
            String(result);
        } else {
          delete button.dataset.result;
        }
      }
    );


    /*
      Atualiza indicador textual
      do atributo selecionado.
    */

    $$(
      "[data-selected-attribute]"
    ).forEach(
      element => {

        const attribute =
          ATTRIBUTE_MAP[
            selectedAttribute
          ];

        element.textContent =
          attribute
            ? `${attribute.name} selecionado`
            : "Selecione um atributo";
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
      "[data-power], [data-power-field]"
    ).forEach(
      element => {

        const key =
          element.dataset.power ||
          element.dataset.powerField;

        const value =
          currentState?.power?.[key] ??
          currentState?.[key] ??
          currentState?.power ??
          "";

        if (
          "value" in element &&
          document.activeElement !==
            element
        ) {
          element.value =
            value;
        } else if (
          !("value" in element)
        ) {
          element.textContent =
            text(value) || "—";
        }
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

    $$(

      "[data-mana]"

    ).forEach(
      element => {

        const key =
          element.dataset.mana;

        const value =
          mana[key] ?? "";

        if (
          "value" in element &&
          document.activeElement !==
            element
        ) {
          element.value =
            value;
        } else if (
          !("value" in element)
        ) {
          element.textContent =
            text(value) || "—";
        }
      }
    );


    /*
      Barra visual de mana.
    */

    const current =
      number(
        mana.current,
        0
      );

    const max =
      Math.max(
        0,
        number(
          mana.max,
          0
        )
      );

    const percent =
      max > 0
        ? clamp(
            (
              current /
              max
            ) * 100,
            0,
            100
          )
        : 0;


    const bar =
      $("#manaProgressBar");

    if (bar) {
      bar.style.width =
        `${percent}%`;
    }


    const currentLabel =
      $("#manaCurrent");

    if (currentLabel) {
      currentLabel.textContent =
        String(current);
    }


    const maxLabel =
      $("#manaMax");

    if (maxLabel) {
      maxLabel.textContent =
        String(max);
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
      "[data-skill], [data-skill-value]"
    ).forEach(
      element => {

        const key =
          element.dataset.skill ||
          element.dataset.skillId;

        const value =
          skills[key] ?? "";

        if (
          "value" in element &&
          document.activeElement !==
            element
        ) {
          element.value =
            value;
        } else if (
          !("value" in element)
        ) {
          element.textContent =
            text(value) || "—";
        }
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
      "[data-technique-index]"
    ).forEach(
      card => {

        const index =
          number(
            card.dataset.techniqueIndex
          );

        const technique =
          techniques[index] ||
          {};

        $$(
          "[data-technique-field]",
          card
        ).forEach(
          field => {

            const key =
              field.dataset
                .techniqueField;

            const value =
              technique[key] ??
              "";

            if (
              "value" in field &&
              document.activeElement !==
                field
            ) {
              field.value =
                value;
            } else if (
              !("value" in field)
            ) {
              field.textContent =
                text(value);
            }
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
    const inventory =
      Array.isArray(
        currentState?.inventory
      )
        ? currentState.inventory
        : [];


    $$(
      "[data-inventory-index]"
    ).forEach(
      card => {

        const index =
          number(
            card.dataset.inventoryIndex
          );

        const item =
          inventory[index] ||
          {};


        $$(
          "[data-inventory-field]",
          card
        ).forEach(
          field => {

            const key =
              field.dataset
                .inventoryField;

            const value =
              item[key] ??
              "";

            if (
              "value" in field &&
              document.activeElement !==
                field
            ) {
              field.value =
                value;
            } else if (
              !("value" in field)
            ) {
              field.textContent =
                text(value);
            }
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
    const avatar =
      currentState?.avatar ||
      currentState?.avatarUrl ||
      "";


    const image =
      $("#avatarPreviewImage") ||
      $("#avatarImage");


    if (image) {
      image.src =
        text(avatar);

      image.hidden =
        !text(avatar);
    }


    const preview =
      $("#avatarPreview");

    if (preview) {
      preview.classList.toggle(
        "empty",
        !text(avatar)
      );
    }


    const removeButton =
      $("#removeAvatarButton");

    if (removeButton) {
      removeButton.disabled =
        !text(avatar);
    }
  }


  /* =========================================================
     REVISÃO
     ========================================================= */

  function renderReview(
    currentState
  ) {

    const reviewGrid =
      $(".review-grid");

    if (!reviewGrid) {
      return;
    }

    const race =
      getRaceById(
        currentState?.race
      );

    const animalCategory =
      currentState?.animalhaCategory ||
      "";

    const animal =
      typeof currentState?.animalha ===
        "string"
        ? currentState.animalha
        : currentState?.animalha?.animal ||
          currentState?.animalha?.variation ||
          currentState?.animalhaAnimal ||
          "";

    const classId =
      currentState?.class ||
      currentState?.classId ||
      currentState?.characterClass ||
      "";

    const classData =
      getClasses().find(
        item =>
          normalize(
            item?.id ||
            item?.key ||
            item?.name
          ) ===
          normalize(classId)
      );

    const appearance =
      currentState?.appearance ||
      {};

    const attributes =
      ATTRIBUTES.map(
        attribute => {
          const dieId =
            currentState?.assignedDice?.[
              attribute.id
            ] || "";

          const die =
            getDieById(dieId);

          const result =
            currentState?.diceResults?.[
              dieId
            ];

          return {
            ...attribute,
            die:
              die?.label ||
              "—",
            result:
              result == null
                ? "—"
                : String(result)
          };
        }
      );

    const SKILL_LABELS = {
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
    };

    const skills =
      Object.entries(
        currentState?.skills || {}
      ).filter(
        ([, value]) =>
          Number(value) !== 0
      );

    const safe = value =>
      escapeHTML(
        text(value) || "—"
      );

    reviewGrid.innerHTML = `

      <article class="review-card">
        <span class="eyebrow">IDENTIDADE</span>
        <h3>${safe(currentState?.name)}</h3>
        <p><strong>Idade:</strong> ${safe(currentState?.age)}</p>
        <p><strong>Gênero:</strong> ${safe(currentState?.gender)}</p>
        <p><strong>Origem:</strong> ${safe(currentState?.origin)}</p>
        <p><strong>Descrição:</strong> ${safe(currentState?.description)}</p>
      </article>

      <article class="review-card">
        <span class="eyebrow">CONCEITO</span>
        <p><strong>Personalidade:</strong> ${safe(currentState?.personality)}</p>
        <p><strong>Objetivo:</strong> ${safe(currentState?.objective)}</p>
        <p><strong>Medo:</strong> ${safe(currentState?.fear)}</p>
        <p><strong>Vínculo:</strong> ${safe(currentState?.importantBond)}</p>
        <p><strong>História:</strong> ${safe(currentState?.history)}</p>
        <p><strong>Região:</strong> ${safe(currentState?.region)}</p>
      </article>

      <article class="review-card">
        <span class="eyebrow">RAÇA</span>
        <h3>${safe(race?.name || currentState?.race)}</h3>
        <p><strong>Habilidade:</strong> ${safe(race?.feature || race?.ability || race?.specialty)}</p>
        <p><strong>Animalha:</strong> ${safe(
          race?.id === "animalha"
            ? `${animalCategory || "—"}${animal ? ` — ${animal}` : ""}`
            : "—"
        )}</p>
        <p><strong>Altura:</strong> ${safe(appearance.height ? `${appearance.height} cm` : "")}</p>
      </article>

      <article class="review-card">
        <span class="eyebrow">CLASSE</span>
        <h3>${safe(classData?.name || classId)}</h3>
        <p><strong>Controle de Mana:</strong> ${safe(
          classData?.manaBonus != null
            ? `+${classData.manaBonus}`
            : ""
        )}</p>
      </article>

      <article class="review-card">
        <span class="eyebrow">APARÊNCIA</span>
        <p><strong>Cabelo:</strong> ${safe(appearance.hairColor)}</p>
        <p><strong>Olhos:</strong> ${safe(appearance.eyeColor)}</p>
        <p><strong>Pele:</strong> ${safe(appearance.skinTone)}</p>
        <p><strong>Tipo de cabelo:</strong> ${safe(appearance.hairType)}</p>
        <p><strong>Características:</strong> ${safe(appearance.physicalFeatures)}</p>
        <p><strong>Marcas/Cicatrizes:</strong> ${safe(appearance.scars)}</p>
      </article>

      <article class="review-card">
        <span class="eyebrow">PODER & MANA</span>
        <h3>${safe(currentState?.primaryPower)}</h3>
        <p><strong>Sorteio:</strong> ${safe(
          currentState?.powerRoll != null
            ? `D100 = ${currentState.powerRoll}`
            : currentState?.powerMode === "uncommon"
              ? "Escolha incomum"
              : "Escolha manual"
        )}</p>
        <p><strong>Poder paralelo:</strong> ${safe(currentState?.parallelPower)}</p>
        <p><strong>Reserva:</strong> ${safe(
          `${currentState?.mana?.current ?? 0} / ${currentState?.mana?.max ?? 0}`
        )}</p>
        <p><strong>Tipo de Mana:</strong> ${safe(currentState?.mana?.type)}</p>
      </article>

      <article class="review-card">
        <span class="eyebrow">ATRIBUTOS</span>
        <div class="review-attributes">
          ${attributes
            .map(
              attribute =>
                `<span>${escapeHTML(attribute.short)}:
                  <b>${escapeHTML(
                    `${attribute.die} / ${attribute.result}`
                  )}</b>
                </span>`
            )
            .join("")}
        </div>
      </article>

      <article class="review-card">
        <span class="eyebrow">PERÍCIAS</span>
        ${
          skills.length
            ? skills
                .map(
                  ([id, value]) =>
                    `<p><strong>${escapeHTML(
                      SKILL_LABELS[id] ||
                      id
                    )}:</strong> ${escapeHTML(
                      value
                    )}</p>`
                )
                .join("")
            : "<p>Nenhum bônus personalizado informado.</p>"
        }
      </article>

      <article class="review-card">
        <span class="eyebrow">TÉCNICAS & INVENTÁRIO</span>
        <p><strong>Técnicas registradas:</strong> ${
          Array.isArray(currentState?.techniques)
            ? currentState.techniques.filter(Boolean).length
            : 0
        }</p>
        <p><strong>Itens no inventário:</strong> ${
          Array.isArray(currentState?.inventory)
            ? currentState.inventory.filter(Boolean).length
            : 0
        }</p>
        <p><strong>Imagem:</strong> ${
          currentState?.avatar
            ? "Adicionada"
            : "Não adicionada"
        }</p>
      </article>
    `;
  }


  /* =========================================================
     EVENTOS VISUAIS
     ========================================================= */

  function handleExternalEvents() {

    const events = [
      "aerion:ficha:update",
      "aerion:ficha:render",
      "aerion:race:preview",
      "aerion:race:selected",
      "aerion:animalha:selected",
      "aerion:appearance:update",
      "aerion:class:selected",
      "aerion:attribute:selected",
      "aerion:dice:update",
      "aerion:toast"
    ];


    events.forEach(
      eventName => {

        window.addEventListener(
          eventName,
          event => {

            state =
              readState();

            renderAll();

            const detail =
              event?.detail || {};

            if (
              eventName ===
              "aerion:toast"
            ) {
              showToast(
                detail.message ||
                detail.text ||
                "",
                detail.type ||
                ""
              );
            }

          }
        );
      }
    );
  }


  /* =========================================================
     RENDER COMPLETO
     ========================================================= */

  function renderAll() {
    state =
      readState();


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
  }


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init() {
    if (initialized) {
      return;
    }

    initialized = true;

    state =
      readState();

    handleExternalEvents();

    renderAll();

    announce(
      "Criador de personagem carregado."
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


  /* =========================================================
     API VISUAL
     ========================================================= */

  window.AERIONFichaRender = {
    render:
      renderAll,

    renderRace:
      () => renderRace(
        readState()
      ),

    renderAnimalha:
      () => renderAnimalha(
        readState()
      ),

    renderAppearance:
      () => renderAppearance(
        readState()
      ),

    renderClass:
      () => renderClass(
        readState()
      ),

    renderAttributes:
      () => renderAttributes(
        readState()
      ),

    renderDice:
      () => renderDice(
        readState()
      ),

    toast:
      showToast
  };

})();
