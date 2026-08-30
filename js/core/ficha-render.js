/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   RESPONSABILIDADE:
   - Apenas renderização visual da ficha
   - Atualização de textos
   - Cards
   - Raça
   - Animalha
   - Aparência
   - Classe
   - ATRIBUTOS
   - RADAR
   - Poder
   - Mana
   - Perícias
   - Técnicas
   - Inventário
   - Combate
   - Revisão
   - Navegação

   NÃO RESPONSÁVEL POR:
   - Regras dos dados
   - Controle dos dados
   - IDs dos dados
   - Distribuição dos dados
   - Seleção de dados
   - Devolução de dados
   - Validação dos dados

   Toda a lógica dos dados pertence ao:
   js/core/ficha.js

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     ESTADO LOCAL
     ========================================================= */

  let lastState = null;


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

  function formatHeight(cm) {
    const value = Number(cm);

    if (!Number.isFinite(value)) {
      return "—";
    }

    return `${(value / 100).toFixed(2)} m`;
  }

  function formatSigned(value) {
    const number = Number(value) || 0;

    if (number > 0) {
      return `+${number}`;
    }

    return String(number);
  }

  function getCore() {
    return window.AERIONFicha || null;
  }

  function getConstants(name) {
    return getCore()?.constants?.[name] || [];
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message,
    duration = 2200
  ) {
    let element = $("#toast");

    if (!element) {
      element =
        document.createElement("div");

      element.id = "toast";
      element.className = "toast";

      document.body.appendChild(
        element
      );
    }

    element.textContent =
      String(message);

    element.hidden = false;

    clearTimeout(
      element.__aerionTimer
    );

    element.__aerionTimer =
      setTimeout(() => {
        element.hidden = true;
      }, duration);
  }


  /* =========================================================
     RENDER PRINCIPAL
     ========================================================= */

  function render(state) {
    if (!state) {
      return;
    }

    lastState = state;

    renderProgress();
    renderPanels();

    renderIdentity();
    renderAvatar();

    renderRace();
    renderAnimalha();

    renderAppearance();
    renderClasses();

    renderAttributes();

    renderPower();
    renderMana();

    renderSkills();
    renderTechniques();
    renderInventory();

    renderCombat();
    renderReview();

    renderNavigation();

    initializeVisualBindings();
  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function renderProgress() {
    const progress =
      lastState.progress || {
        completed: 0,
        total: 11,
        percent: 0
      };

    const percent =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            progress.percent
          ) || 0
        )
      );

    const bar =
      $("#progressBar");

    if (bar) {
      bar.style.width =
        `${percent}%`;

      bar.setAttribute(
        "aria-valuenow",
        String(percent)
      );
    }

    const percentElement =
      $("#progressPercent");

    if (percentElement) {
      percentElement.textContent =
        `${percent}%`;
    }

    const currentStep =
      Number(
        lastState.step
      ) || 0;

    const title =
      lastState.steps?.[
        currentStep
      ]?.name ||
      "Identidade";

    const titleElement =
      $("#progressTitle");

    if (titleElement) {
      titleElement.textContent =
        title;
    }

    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {
          const active =
            index ===
            currentStep;

          const complete =
            isStepCompleteVisual(
              index
            );

          const unlocked =
            isStepUnlockedVisual(
              index
            );

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


  function isStepCompleteVisual(
    index
  ) {
    const currentStep =
      Number(
        lastState.step
      ) || 0;

    if (
      index <
      currentStep
    ) {
      return true;
    }

    switch (index) {
      case 0:
        return (
          Boolean(
            String(
              lastState.name ||
                ""
            ).trim()
          ) &&
          Boolean(
            lastState.gender
          )
        );

      case 1:
        return Boolean(
          lastState.race
        );

      case 2:
        return Boolean(
          lastState.appearance
            ?.height
        );

      case 3:
        return Boolean(
          lastState.class
        );

      case 4:
        return (
          lastState.effectiveAttributes &&
          Object.values(
            lastState.effectiveAttributes
          ).every(
            attribute =>
              Boolean(
                attribute?.die ||
                attribute?.dieId
              )
          )
        );

      case 5:
        return Boolean(
          lastState.power
        );

      case 6:
        return (
          lastState.mana ===
          "azul"
        );

      case 10:
        return (
          isStepCompleteVisual(0) &&
          isStepCompleteVisual(1) &&
          isStepCompleteVisual(2) &&
          isStepCompleteVisual(3) &&
          isStepCompleteVisual(4) &&
          isStepCompleteVisual(5) &&
          isStepCompleteVisual(6)
        );

      default:
        return false;
    }
  }


  function isStepUnlockedVisual(
    index
  ) {
    if (
      index <= 0
    ) {
      return true;
    }

    return isStepCompleteVisual(
      index - 1
    );
  }


  /* =========================================================
     PAINÉIS
     ========================================================= */

  function renderPanels() {
    const current =
      Number(
        lastState.step
      ) || 0;

    (
      lastState.steps ||
      []
    ).forEach(
      (
        step,
        index
      ) => {
        const panel =
          $(
            `.creation-panel[data-panel="${step.id}"]`
          );

        if (!panel) {
          return;
        }

        const active =
          index ===
          current;

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
     IDENTIDADE
     ========================================================= */

  function renderIdentity() {
    setInputValue(
      "#characterName",
      lastState.name
    );

    setInputValue(
      "#characterAge",
      lastState.age
    );

    setInputValue(
      "#characterDescription",
      lastState.description
    );

    setInputValue(
      "#characterOrigin",
      lastState.origin
    );

    $$(
      'input[name="gender"]'
    ).forEach(
      radio => {
        radio.checked =
          radio.value ===
          lastState.gender;
      }
    );

    $$(".gender-option")
      .forEach(
        option => {
          const selected =
            option.dataset
              .gender ===
            lastState.gender;

          option.classList.toggle(
            "selected",
            selected
          );

          option.classList.toggle(
            "active",
            selected
          );
        }
      );
  }


  function setInputValue(
    selector,
    value
  ) {
    const element =
      $(selector);

    if (
      !element ||
      document.activeElement ===
        element
    ) {
      return;
    }

    element.value =
      value ?? "";
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function renderAvatar() {
    const avatar =
      lastState.avatar ||
      "";

    const image =
      $("#avatarImage");

    const placeholder =
      $("#avatarPlaceholder");

    const removeButton =
      $("#removeAvatarButton");

    if (image) {
      if (avatar) {
        image.src =
          avatar;

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
        Boolean(
          avatar
        );
    }

    if (removeButton) {
      removeButton.disabled =
        !Boolean(
          avatar
        );
    }

    const reviewImage =
      $("#reviewAvatar");

    const reviewFallback =
      $("#reviewAvatarFallback");

    if (
      reviewImage &&
      reviewFallback
    ) {
      if (avatar) {
        reviewImage.src =
          avatar;

        reviewImage.hidden =
          false;

        reviewFallback.hidden =
          true;
      } else {
        reviewImage.removeAttribute(
          "src"
        );

        reviewImage.hidden =
          true;

        reviewFallback.hidden =
          false;
      }
    }
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function renderRace() {
    const race =
      lastState.previewRace;

    if (!race) {
      return;
    }

    const imageElement =
      $("#raceImage");

    const gender =
      lastState.gender;

    const image =
      gender ===
      "feminino"
        ? race.female
        : race.male;

    if (imageElement) {
      updateImageSource(
        imageElement,
        image,
        `${race.name}${
          gender
            ? ` — ${gender}`
            : ""
        }`
      );
    }

    const nameElement =
      $("#raceName");

    if (nameElement) {
      nameElement.textContent =
        race.name;
    }

    const shortDescription =
      $("#raceShortDescription");

    if (shortDescription) {
      shortDescription.textContent =
        race.description ||
        "";
    }

    const genderLabel =
      $("#raceGenderLabel");

    if (genderLabel) {
      const genderText =
        gender ===
        "feminino"
          ? "Feminino"
          : gender ===
              "masculino"
            ? "Masculino"
            : "";

      genderLabel.textContent =
        genderText
          ? `${race.name} · ${genderText}`
          : race.name;
    }

    const descriptionTitle =
      $("#raceDescriptionTitle");

    if (descriptionTitle) {
      descriptionTitle.textContent =
        race.name;
    }

    const descriptionText =
      $("#raceDescriptionText");

    if (descriptionText) {
      const parts =
        [];

      if (
        race.description
      ) {
        parts.push(
          race.description
        );
      }

      if (
        race.profile
      ) {
        parts.push(
          `Perfil natural: ${race.profile}`
        );
      }

      if (
        race.feature
      ) {
        parts.push(
          `Característica: ${race.feature}`
        );
      }

      descriptionText.textContent =
        parts.join(
          " "
        );
    }

    const selectedText =
      $("#raceSelectedText");

    if (selectedText) {
      selectedText.textContent =
        lastState.race ===
        race.id
          ? "✓ Selecionada"
          : "Selecionar";
    }

    renderRaceDots();
  }


  function renderRaceDots() {
    const container =
      $("#raceDots");

    if (!container) {
      return;
    }

    const races =
      getConstants(
        "RACES"
      );

    const current =
      Number(
        lastState.raceIndex
      ) || 0;

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
          index ===
          current
            ? "is-active"
            : "";

        button.dataset.action =
          "go-race-index";

        button.dataset.raceIndex =
          String(index);

        button.setAttribute(
          "aria-label",
          race.name
        );

        button.title =
          race.name;

        container.appendChild(
          button
        );
      }
    );
  }


  /* =========================================================
     CARREGAMENTO DE IMAGENS
     ========================================================= */

  function updateImageSource(
    imageElement,
    source,
    alt = ""
  ) {
    if (!imageElement) {
      return;
    }

    imageElement.alt =
      alt;

    if (!source) {
      imageElement.removeAttribute(
        "src"
      );

      imageElement.hidden =
        true;

      imageElement.classList.remove(
        "image-loading",
        "image-loaded",
        "image-error"
      );

      imageElement.removeAttribute(
        "data-image-loading"
      );

      return;
    }

    /*
     * Evita reiniciar o carregamento
     * se a mesma imagem já está na tela.
     */
    if (
      imageElement.dataset
        .loadedSrc ===
      source
    ) {
      return;
    }

    imageElement.classList.remove(
      "image-error"
    );

    imageElement.classList.add(
      "image-loading"
    );

    imageElement.dataset
      .imageLoading =
      "true";

    imageElement.hidden =
      false;

    imageElement.src =
      source;

    imageElement.dataset
      .loadedSrc =
      source;

    if (
      imageElement.dataset
        .aerionImageBound !==
      "true"
    ) {
      imageElement.dataset
        .aerionImageBound =
        "true";

      imageElement.addEventListener(
        "load",
        () => {
          imageElement.classList.remove(
            "image-loading"
          );

          imageElement.classList.add(
            "image-loaded"
          );

          imageElement.dataset
            .imageLoading =
            "false";
        }
      );

      imageElement.addEventListener(
        "error",
        () => {
          imageElement.classList.remove(
            "image-loading"
          );

          imageElement.classList.add(
            "image-error"
          );

          imageElement.dataset
            .imageLoading =
            "false";

          imageElement.hidden =
            false;
        }
      );
    }
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function renderAnimalha() {
    const container =
      $(
        "[data-animalha-variants]"
      );

    if (!container) {
      return;
    }

    if (
      lastState.race !==
      "animalha"
    ) {
      container.hidden =
        true;

      container.innerHTML =
        "";

      return;
    }

    const variants =
      getConstants(
        "ANIMALHA_VARIANTS"
      );

    const selected =
      lastState.animalha ||
      "";

    container.hidden =
      false;

    container.innerHTML = `
      <div
        class="section-heading compact"
      >

        <span class="eyebrow">
          ANIMALHA
        </span>

        <h3>
          Escolha sua linhagem
        </h3>

        <p>
          A linhagem altera o perfil natural,
          porte, limites físicos e características.
        </p>

      </div>

      <div class="animalha-grid">

        ${variants.map(
          variant => `
            <button
              type="button"
              class="animalha-variant-card ${
                selected ===
                variant.id
                  ? "selected"
                  : ""
              }"
              data-action="select-animalha"
              data-animalha="${escapeHtml(
                variant.id
              )}"
            >

              <span
                class="animalha-variant-icon"
                aria-hidden="true"
              >
                ${getAnimalIcon(
                  variant.category
                )}
              </span>

              <strong>
                ${escapeHtml(
                  variant.name
                )}
              </strong>

              <small>
                ${escapeHtml(
                  variant.category
                )}
              </small>

              <span>
                ${escapeHtml(
                  variant.profile
                )}
              </span>

            </button>
          `
        ).join("")}

      </div>
    `;
  }


  function getAnimalIcon(
    category
  ) {
    const value =
      String(
        category ||
          ""
      ).toLowerCase();

    if (
      value.includes(
        "ave"
      )
    ) {
      return "◇";
    }

    if (
      value.includes(
        "aqu"
      )
    ) {
      return "≈";
    }

    if (
      value.includes(
        "répt"
      )
    ) {
      return "⌁";
    }

    return "✦";
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance() {
    const appearance =
      lastState.appearance ||
      {};

    const race =
      lastState.raceData;

    const min =
      Number(
        race?.height?.min
      ) || 0;

    const max =
      Number(
        race?.height?.max
      ) || 0;

    const currentHeight =
      Number(
        appearance.height
      ) ||
      (
        min &&
        max
          ? Math.round(
              (
                min +
                max
              ) /
                2
            )
          : 0
      );

    const range =
      $("#heightRange");

    if (range) {
      range.min =
        String(
          min ||
          100
        );

      range.max =
        String(
          max ||
          400
        );

      range.value =
        String(
          currentHeight
        );
    }

    const heightValue =
      $("#appearanceHeightValue");

    if (heightValue) {
      heightValue.textContent =
        formatHeight(
          currentHeight
        );
    }

    const limits =
      $("#appearanceHeightLimits");

    if (limits) {
      limits.textContent =
        min &&
        max
          ? `${formatHeight(
              min
            )} — ${formatHeight(
              max
            )}`
          : "Selecione uma raça.";
    }

    const minLabel =
      $("#appearanceMinLabel");

    if (minLabel) {
      minLabel.textContent =
        min
          ? `${min} cm`
          : "—";
    }

    const maxLabel =
      $("#appearanceMaxLabel");

    if (maxLabel) {
      maxLabel.textContent =
        max
          ? `${max} cm`
          : "—";
    }

    renderCharacterModel();
    renderAppearanceFields();
    renderAnimalhaEditor();

    const flightStatus =
      $(
        "[data-flight-status]"
      );

    if (flightStatus) {
      const canFly =
        Boolean(
          race?.flight
        );

      flightStatus.textContent =
        canFly
          ? "Voo disponível"
          : "Voo indisponível";

      flightStatus.classList.toggle(
        "available",
        canFly
      );
    }
  }


  function renderAppearanceFields() {
    const appearance =
      lastState.appearance ||
      {};

    [
      "hair",
      "eyes",
      "skin",
      "clothing",
      "scars",
      "tattoos",
      "physicalNotes"
    ].forEach(
      field => {
        setInputValue(
          `#${field}`,
          appearance[field]
        );
      }
    );
  }


  function renderAnimalhaEditor() {
    const section =
      $(
        "[data-animalha-editor]"
      );

    const select =
      $("#animalhaVariant");

    const active =
      lastState.race ===
      "animalha";

    if (section) {
      section.hidden =
        !active;
    }

    if (
      !active ||
      !select
    ) {
      return;
    }

    const variants =
      getConstants(
        "ANIMALHA_VARIANTS"
      );

    select.innerHTML = `
      <option value="">
        Escolha a linhagem
      </option>

      ${variants.map(
        variant => `
          <option
            value="${escapeHtml(
              variant.id
            )}"
            ${
              lastState.animalha ===
              variant.id
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              variant.name
            )}
          </option>
        `
      ).join("")}
    `;
  }


  /* =========================================================
     MODELO 2D TEMPORÁRIO
     ========================================================= */

  function renderCharacterModel() {
    const container =
      $("#appearanceFigure");

    if (!container) {
      return;
    }

    const race =
      lastState.raceData;

    const appearance =
      lastState.appearance ||
      {};

    const min =
      Number(
        race?.height?.min
      ) || 140;

    const max =
      Number(
        race?.height?.max
      ) || 200;

    const height =
      Number(
        appearance.height
      ) ||
      Math.round(
        (
          min +
          max
        ) /
          2
      );

    const normalized =
      Math.max(
        0,
        Math.min(
          1,

          (
            height -
            min
          ) /
            Math.max(
              1,
              max -
                min
            )
        )
      );

    const visualScale =
      0.88 +
      normalized *
        0.24;

    const visualHeight =
      220 +
      normalized *
        120;

    container.style.setProperty(
      "--character-scale",
      String(
        visualScale
      )
    );

    container.style.setProperty(
      "--character-height",
      `${visualHeight}px`
    );

    container.dataset.race =
      lastState.race ||
      "";

    container.dataset.animalha =
      lastState.animalha ||
      "";

    container.dataset.gender =
      lastState.gender ||
      "";

    container.dataset.size =
      race?.size ||
      "medio";

    container.classList.toggle(
      "appearance-figure--female",
      lastState.gender ===
        "feminino"
    );

    container.classList.toggle(
      "appearance-figure--male",
      lastState.gender !==
        "feminino"
    );

    const wings =
      container.querySelector(
        '[data-character-feature="wings"]'
      );

    if (wings) {
      wings.hidden =
        !Boolean(
          race?.flight
        );
    }

    const tail =
      container.querySelector(
        '[data-character-feature="tail"]'
      );

    if (tail) {
      tail.hidden =
        lastState.race !==
        "animalha";
    }
  }


  /* =========================================================
     CLASSES
     ========================================================= */

  function renderClasses() {
    const classes =
      getConstants(
        "CLASSES"
      );

    $$(".class-card")
      .forEach(
        card => {
          const id =
            card.dataset
              .class;

          const data =
            classes[id];

          const selected =
            id ===
            lastState.class;

          card.classList.toggle(
            "selected",
            selected
          );

          card.classList.toggle(
            "active",
            selected
          );

          card.setAttribute(
            "aria-pressed",
            String(
              selected
            )
          );

          if (!data) {
            return;
          }

          const bonus =
            card.querySelector(
              "[data-class-bonus]"
            );

          if (bonus) {
            bonus.textContent =
              Object.entries(
                data.skillBonuses ||
                  {}
              )
                .map(
                  ([
                    skillId,
                    amount
                  ]) => {
                    const skill =
                      getConstants(
                        "SKILLS"
                      )[
                        skillId
                      ];

                    return skill?.name
                      ? `${skill.name} +${amount}`
                      : "";
                  }
                )
                .filter(
                  Boolean
                )
                .join(
                  " • "
                );
          }
        }
      );

    const className =
      $(
        "[data-class-name]"
      );

    if (className) {
      className.textContent =
        classes[
          lastState.class
        ]?.name ||
        "—";
    }

    const role =
      $(
        "[data-class-role]"
      );

    if (role) {
      role.textContent =
        classes[
          lastState.class
        ]?.role ||
        "—";
    }
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function renderAttributes() {
    renderDice();

    renderAttributeCards();

    renderRadar();
  }


  /* =========================================================
     DADOS
     
     ATENÇÃO:
     Este código NÃO decide disponibilidade.
     O ficha.js já entrega exatamente quais dados
     existem e onde estão.

     Aqui apenas mostramos.
     ========================================================= */

  function renderDice() {
    const root =
      $(
        "[data-dice-pool]"
      );

    if (!root) {
      return;
    }

    const dice =
      Array.isArray(
        lastState.dice
      )
        ? lastState.dice
        : [];

    root.innerHTML =
      "";

    /*
     * O estado recebido pelo ficha.js
     * já contém:
     *
     * id
     * type
     * sides
     * available
     * assigned
     * assignedTo
     *
     * Portanto não recalculamos nada aqui.
     */
    dice.forEach(
      die => {
        /*
         * Mostramos somente o que está
         * disponível para seleção.
         */
        if (
          die.assigned
        ) {
          return;
        }

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "dice-card";

        if (
          lastState.selectedDie ===
          die.id
        ) {
          button.classList.add(
            "dice-selected"
          );
        }

        button.dataset.die =
          die.id;

        button.dataset.dieType =
          die.type ||
          "";

        button.dataset.dieSides =
          String(
            die.sides ||
              ""
          );

        button.draggable =
          true;

        button.setAttribute(
          "aria-label",
          `D${die.sides}`
        );

        button.title =
          `D${die.sides}`;

        button.innerHTML = `
          <span
            class="dice-icon"
            aria-hidden="true"
          >

            <svg
              class="dice-svg"
              viewBox="0 0 100 100"
            >

              <polygon
                points="
                  50,5
                  90,28
                  90,72
                  50,95
                  10,72
                  10,28
                "
                fill="none"
                stroke="currentColor"
                stroke-width="5"
                stroke-linejoin="round"
              />

            </svg>

            <span>
              D${die.sides}
            </span>

          </span>
        `;

        root.appendChild(
          button
        );
      }
    );

    if (
      root.children.length ===
      0
    ) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "dice-pool-empty";

      empty.textContent =
        "Todos os dados estão atribuídos.";

      root.appendChild(
        empty
      );
    }
  }


  /* =========================================================
     CARDS DE ATRIBUTOS
     ========================================================= */

  function renderAttributeCards() {
    const attributes =
      lastState.effectiveAttributes ||
      {};

    $$(".attribute-card")
      .forEach(
        card => {
          const id =
            card.dataset
              .attribute;

          const data =
            attributes[id];

          if (!data) {
            return;
          }

          const dieId =
            data.dieId ||
            data.die ||
            null;

          const sides =
            Number(
              data.sides
            ) || 0;

          card.classList.toggle(
            "has-die",
            Boolean(
              dieId
            )
          );

          card.classList.toggle(
            "has-result",
            Boolean(
              data.rolled
            )
          );

          card.dataset.dieId =
            dieId ||
            "";

          /*
           * Mantém a área de dado existente
           * como alvo visual.
           */
          const dieElement =
            card.querySelector(
              "[data-attribute-die]"
            );

          if (dieElement) {

            dieElement.dataset.attribute =
              id;

            dieElement.dataset.die =
              dieId ||
              "";

            if (
              dieId &&
              sides
            ) {
              dieElement.innerHTML = `
                <button
                  type="button"
                  class="attribute-die-button"
                  data-action="return-die"
                  data-attribute="${escapeHtml(
                    id
                  )}"
                  aria-label="Devolver D${sides} de ${escapeHtml(
                    data.name ||
                    id
                  )}"
                  title="Devolver D${sides}"
                >

                  <span
                    class="attribute-die-icon"
                    aria-hidden="true"
                  >

                    <svg
                      viewBox="0 0 100 100"
                      class="dice-svg"
                    >

                      <polygon
                        points="
                          50,5
                          90,28
                          90,72
                          50,95
                          10,72
                          10,28
                        "
                        fill="none"
                        stroke="currentColor"
                        stroke-width="5"
                        stroke-linejoin="round"
                      />

                    </svg>

                    <span>
                      D${sides}
                    </span>

                  </span>

                </button>
              `;
            } else {
              dieElement.innerHTML = `
                <span
                  class="attribute-empty-die"
                >
                  Solte um dado aqui
                </span>
              `;
            }
          }

          const value =
            card.querySelector(
              "[data-attribute-value]"
            );

          if (value) {
            value.textContent =
              data.total ??
              "—";
          }

          const modifier =
            card.querySelector(
              "[data-attribute-modifier]"
            );

          if (modifier) {
            const racialModifier =
              Number(
                data.racialModifier
              ) || 0;

            modifier.textContent =
              formatSigned(
                racialModifier
              );

            modifier.classList.toggle(
              "positive",
              racialModifier >
                0
            );

            modifier.classList.toggle(
              "negative",
              racialModifier <
                0
            );
          }

          const result =
            card.querySelector(
              "[data-attribute-result]"
            );

          if (result) {
            result.textContent =
              data.rolled
                ? `${data.roll} ${formatSigned(
                    data.racialModifier
                  )} = ${data.total}`
                : "";
          }

          const rollButton =
            card.querySelector(
              '[data-action="roll-attribute"]'
            );

          if (rollButton) {
            rollButton.disabled =
              !dieId;
          }

          const dieLabel =
            card.querySelector(
              "[data-attribute-die-label]"
            );

          if (dieLabel) {
            dieLabel.textContent =
              sides
                ? `D${sides}`
                : "";
          }
        }
      );
  }


  /* =========================================================
     RADAR
     ========================================================= */

  function renderRadar() {
    const root =
      $(
        "[data-attribute-radar]"
      );

    if (!root) {
      return;
    }

    const definitions =
      getConstants(
        "ATTRIBUTES"
      );

    const attributes =
      lastState.effectiveAttributes ||
      {};

    if (
      !definitions.length
    ) {
      root.innerHTML =
        "";

      return;
    }

    const values =
      definitions.map(
        attribute =>
          Math.max(
            0,

            Number(
              attributes[
                attribute.id
              ]?.total
            ) || 0
          )
      );

    const maximum =
      Math.max(
        1,
        ...values
      );

    const center =
      210;

    const radius =
      150;

    const count =
      definitions.length;

    function point(
      index,
      distance
    ) {
      const angle =
        (
          360 /
          count
        ) *
          index -
        90;

      const radians =
        angle *
        Math.PI /
        180;

      return [
        center +
          Math.cos(
            radians
          ) *
            distance,

        center +
          Math.sin(
            radians
          ) *
            distance
      ];
    }

    let grid =
      "";

    for (
      let level = 1;
      level <= 4;
      level++
    ) {
      const points =
        definitions
          .map(
            (
              _attribute,
              index
            ) =>
              point(
                index,

                radius *
                  (
                    level /
                    4
                  )
              ).join(",")
          )
          .join(" ");

      grid += `
        <polygon
          points="${points}"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          opacity=".16"
        />
      `;
    }

    definitions.forEach(
      (
        _attribute,
        index
      ) => {
        const [
          x,
          y
        ] =
          point(
            index,
            radius
          );

        grid += `
          <line
            x1="${center}"
            y1="${center}"
            x2="${x}"
            y2="${y}"
            stroke="currentColor"
            stroke-width="1"
            opacity=".13"
          />
        `;
      }
    );

    const polygon =
      values
        .map(
          (
            value,
            index
          ) =>
            point(
              index,

              radius *
                (
                  value /
                  maximum
                )
            ).join(",")
        )
        .join(" ");

    const labels =
      definitions
        .map(
          (
            attribute,
            index
          ) => {
            const [
              x,
              y
            ] =
              point(
                index,
                radius +
                  30
              );

            return `
              <text
                x="${x}"
                y="${y}"
                class="radar-label"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                ${escapeHtml(
                  attribute.name
                )}
              </text>
            `;
          }
        )
        .join("");

    root.innerHTML = `
      <svg
        class="radar-svg"
        viewBox="0 0 420 420"
        role="img"
        aria-label="Perfil dos atributos"
      >

        ${grid}

        <polygon
          class="radar-value"
          points="${polygon}"
        />

        ${labels}

      </svg>
    `;
  }


  /* =========================================================
     PODER
     ========================================================= */

  function renderPower() {
    const current =
      $(
        "[data-power-current]"
      );

    if (current) {
      current.textContent =
        lastState.power ||
        "Nenhum poder escolhido";
    }

    const result =
      $(
        "[data-power-result]"
      );

    if (result) {
      result.textContent =
        lastState.powerRoll ??
        "—";
    }

    const note =
      $(
        "[data-power-result-note]"
      );

    if (note) {
      if (
        lastState.powerRoll
      ) {
        note.textContent =
          `D100 ${lastState.powerRoll} → ${lastState.power}`;
      } else if (
        lastState.power
      ) {
        note.textContent =
          "Poder selecionado.";
      } else {
        note.textContent =
          "O D100 define um dos quatro poderes principais.";
      }
    }

    $$(
      '[data-action="select-parallel-power"]'
    ).forEach(
      button => {
        const selected =
          button.dataset
            .power ===
          lastState.power;

        button.classList.toggle(
          "selected",
          selected
        );

        button.classList.toggle(
          "active",
          selected
        );

        button.setAttribute(
          "aria-pressed",
          String(
            selected
          )
        );
      }
    );
  }


  function setPowerMode(
    mode
  ) {
    const roll =
      $(
        '[data-power-section="roll"]'
      );

    const manual =
      $(
        '[data-power-section="manual"]'
      );

    if (roll) {
      roll.hidden =
        mode !==
        "roll";
    }

    if (manual) {
      manual.hidden =
        mode !==
        "manual";
    }
  }


  /* =========================================================
     MANA
     ========================================================= */

  function renderMana() {
    $$(".mana-card")
      .forEach(
        card => {
          const mana =
            String(
              card.dataset
                .mana ||
                ""
            ).toLowerCase();

          const available =
            mana ===
            "azul";

          const selected =
            lastState.mana ===
            mana;

          card.classList.toggle(
            "selected",
            selected
          );

          card.classList.toggle(
            "is-selected",
            selected
          );

          card.classList.toggle(
            "locked",
            !available
          );

          card.classList.toggle(
            "is-locked",
            !available
          );

          card.disabled =
            !available;

          card.setAttribute(
            "aria-disabled",
            String(
              !available
            )
          );
        }
      );
  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function renderSkills() {
    const root =
      $("#skillsList");

    if (!root) {
      return;
    }

    const skills =
      getConstants(
        "SKILLS"
      );

    const effective =
      lastState.effectiveSkills ||
      {};

    root.innerHTML =
      "";

    Object.entries(
      skills
    ).forEach(
      ([
        id,
        skill
      ]) => {
        const data =
          effective[id] ||
          {
            trained:
              false,

            bonus:
              0,

            effectiveBonus:
              0
          };

        const trained =
          Boolean(
            data.trained
          );

        const total =
          Number(
            data.effectiveBonus
          ) || 0;

        const classBonus =
          Number(
            getCore()
              ?.constants
              ?.CLASSES?.[
              lastState.class
            ]?.skillBonuses?.[
              id
            ]
          ) || 0;

        const article =
          document.createElement(
            "article"
          );

        article.className =
          `skill-card ${
            trained
              ? "trained"
              : ""
          }`;

        article.dataset.skill =
          id;

        article.innerHTML = `
          <div
            class="skill-card-main"
          >

            <div>

              <span class="eyebrow">
                PERÍCIA
              </span>

              <h3>
                ${escapeHtml(
                  skill.name
                )}
              </h3>

              <p>
                ${escapeHtml(
                  skill.description
                )}
              </p>

            </div>

            <div
              class="skill-bonus-box"
            >

              <span>
                Bônus
              </span>

              <strong
                data-skill-value
              >
                ${formatSigned(
                  total
                )}
              </strong>

              <small>
                ${
                  classBonus
                    ? `Classe +${classBonus}`
                    : ""
                }
              </small>

            </div>

          </div>

          <div
            class="skill-actions"
          >

            <button
              type="button"
              class="button button-secondary"
              data-action="train-skill"
              data-skill="${escapeHtml(
                id
              )}"
            >
              ${
                trained
                  ? "✓ Treinado"
                  : "Treinar"
              }
            </button>

            <input
              class="skill-bonus-input"
              type="number"
              min="-20"
              max="20"
              value="${Number(
                data.bonus
              ) || 0}"
              data-skill-bonus="${escapeHtml(
                id
              )}"
              aria-label="Bônus de ${escapeHtml(
                skill.name
              )}"
            />

          </div>
        `;

        root.appendChild(
          article
        );
      }
    );
  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function renderTechniques() {
    const root =
      $(
        "[data-techniques-list]"
      );

    if (!root) {
      return;
    }

    const techniques =
      Array.isArray(
        lastState.techniques
      )
        ? lastState.techniques
        : [];

    root.innerHTML =
      "";

    if (
      techniques.length ===
      0
    ) {
      root.innerHTML = `
        <div
          class="empty-state"
        >

          <span>
            Nenhuma técnica adicionada.
          </span>

          <small>
            Crie uma técnica personalizada.
          </small>

        </div>
      `;

      return;
    }

    techniques.forEach(
      technique => {
        const article =
          document.createElement(
            "article"
          );

        article.className =
          "technique-card";

        article.dataset
          .techniqueId =
          technique.id;

        article.innerHTML = `
          <div
            class="technique-card-header"
          >

            <input
              type="text"
              value="${escapeHtml(
                technique.name
              )}"
              placeholder="Nome da técnica"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              data-technique-field="name"
            />

            <button
              type="button"
              class="icon-button"
              data-action="remove-technique"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              aria-label="Remover técnica"
            >
              ×
            </button>

          </div>

          <textarea
            placeholder="Descrição da técnica"
            data-technique-id="${escapeHtml(
              technique.id
            )}"
            data-technique-field="description"
          >${escapeHtml(
            technique.description
          )}</textarea>

          <div
            class="technique-fields"
          >

            <input
              type="text"
              value="${escapeHtml(
                technique.range
              )}"
              placeholder="Alcance"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              data-technique-field="range"
            />

            <input
              type="text"
              value="${escapeHtml(
                technique.damage
              )}"
              placeholder="Dano / efeito"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              data-technique-field="damage"
            />

          </div>

          <div
            class="technique-extra-fields"
          >

            <input
              type="text"
              value="${escapeHtml(
                technique.cost
              )}"
              placeholder="Custo"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              data-technique-field="cost"
            />

            <input
              type="text"
              value="${escapeHtml(
                technique.test
              )}"
              placeholder="Teste"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              data-technique-field="test"
            />

            <textarea
              rows="2"
              placeholder="Limitação"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
              data-technique-field="limitation"
            >${escapeHtml(
              technique.limitation
            )}</textarea>

          </div>
        `;

        root.appendChild(
          article
        );
      }
    );
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function renderInventory() {
    const root =
      $(
        "[data-inventory-list]"
      );

    if (!root) {
      return;
    }

    const inventory =
      Array.isArray(
        lastState.inventory
      )
        ? lastState.inventory
        : [];

    root.innerHTML =
      "";

    if (
      inventory.length ===
      0
    ) {
      root.innerHTML = `
        <div
          class="empty-state"
        >

          <span>
            Inventário vazio.
          </span>

          <small>
            Adicione equipamentos ou objetos iniciais.
          </small>

        </div>
      `;

      return;
    }

    inventory.forEach(
      item => {
        const article =
          document.createElement(
            "article"
          );

        article.className =
          "inventory-item";

        article.dataset
          .inventoryId =
          item.id;

        article.innerHTML = `
          <input
            type="text"
            value="${escapeHtml(
              item.name
            )}"
            placeholder="Nome do item"
            data-inventory-id="${escapeHtml(
              item.id
            )}"
            data-inventory-field="name"
          />

          <input
            type="number"
            min="0"
            value="${Number(
              item.quantity
            ) || 0}"
            data-inventory-id="${escapeHtml(
              item.id
            )}"
            data-inventory-field="quantity"
            aria-label="Quantidade"
          />

          <input
            type="text"
            value="${escapeHtml(
              item.description
            )}"
            placeholder="Descrição"
            data-inventory-id="${escapeHtml(
              item.id
            )}"
            data-inventory-field="description"
          />

          <button
            type="button"
            class="icon-button"
            data-action="remove-inventory"
            data-inventory-id="${escapeHtml(
              item.id
            )}"
            aria-label="Remover item"
          >
            ×
          </button>
        `;

        root.appendChild(
          article
        );
      }
    );
  }


  /* =========================================================
     COMBATE
     ========================================================= */

  function renderCombat() {
    const combat =
      lastState.combat ||
      {};

    const hp =
      $(
        "[data-combat-hp]"
      );

    if (hp) {
      hp.textContent =
        combat.hp ??
        "—";
    }

    const movement =
      $(
        "[data-combat-movement]"
      );

    if (movement) {
      movement.textContent =
        combat.movement ==
          null
          ? "—"
          : `${combat.movement} m`;
    }

    const air =
      $(
        "[data-combat-air]"
      );

    if (air) {
      air.textContent =
        combat.air ==
          null
          ? "—"
          : `${combat.air} m`;
    }

    const aquatic =
      $(
        "[data-combat-aquatic]"
      );

    if (aquatic) {
      aquatic.textContent =
        combat.aquatic ==
          null
          ? "—"
          : `${combat.aquatic} m`;
    }

    const flight =
      $(
        "[data-combat-flight]"
      );

    if (flight) {
      flight.textContent =
        combat.canFly
          ? "Sim"
          : "Não";
    }
  }


  /* =========================================================
     REVISÃO
     ========================================================= */

  function renderReview() {
    const race =
      lastState.raceData;

    const classes =
      getConstants(
        "CLASSES"
      );

    const classData =
      classes[
        lastState.class
      ];

    const values = {
      name:
        lastState.name ||
        "Sem nome",

      gender:
        lastState.gender ===
        "masculino"
          ? "Masculino"
          : lastState.gender ===
              "feminino"
            ? "Feminino"
            : "—",

      race:
        race?.name ||
        "—",

      class:
        classData?.name ||
        "—",

      height:
        formatHeight(
          lastState
            .appearance
            ?.height
        ),

      power:
        lastState.power ||
        "—",

      mana:
        "Mana Azul"
    };

    Object.entries(
      values
    ).forEach(
      ([
        key,
        value
      ]) => {
        $$(
          `[data-review="${key}"]`
        ).forEach(
          element => {
            element.textContent =
              value;
          }
        );
      }
    );

    $$(
      '[data-review="description"]'
    ).forEach(
      element => {
        element.textContent =
          lastState.description ||
          "Nenhuma descrição.";
      }
    );

    $$(
      '[data-review="appearance"]'
    ).forEach(
      element => {
        const appearance =
          lastState.appearance ||
          {};

        const lines =
          [];

        if (
          appearance.hair
        ) {
          lines.push(
            `Cabelo: ${appearance.hair}`
          );
        }

        if (
          appearance.eyes
        ) {
          lines.push(
            `Olhos: ${appearance.eyes}`
          );
        }

        if (
          appearance.skin
        ) {
          lines.push(
            `Pele: ${appearance.skin}`
          );
        }

        if (
          appearance.clothing
        ) {
          lines.push(
            `Vestimenta: ${appearance.clothing}`
          );
        }

        if (
          appearance.scars
        ) {
          lines.push(
            `Cicatrizes: ${appearance.scars}`
          );
        }

        if (
          appearance.tattoos
        ) {
          lines.push(
            `Tatuagens: ${appearance.tattoos}`
          );
        }

        if (
          appearance.physicalNotes
        ) {
          lines.push(
            appearance.physicalNotes
          );
        }

        element.textContent =
          lines.length
            ? lines.join(
                " • "
              )
            : "Nenhuma informação.";
      }
    );

    const attributesRoot =
      $(
        "[data-review-attributes]"
      );

    if (
      attributesRoot
    ) {
      const definitions =
        getConstants(
          "ATTRIBUTES"
        );

      const attributes =
        lastState.effectiveAttributes ||
        {};

      const dice =
        Array.isArray(
          lastState.dice
        )
          ? lastState.dice
          : [];

      attributesRoot.innerHTML =
        definitions
          .map(
            attribute => {
              const data =
                attributes[
                  attribute.id
                ];

              const dieId =
                data?.dieId ||
                data?.die ||
                null;

              const die =
                dice.find(
                  item =>
                    item.id ===
                    dieId
                );

              return `
                <div
                  class="review-attribute"
                >

                  <span>
                    ${escapeHtml(
                      attribute.name
                    )}
                  </span>

                  <strong>
                    ${
                      die
                        ? `D${die.sides}`
                        : "—"
                    }
                  </strong>

                  <small>
                    ${
                      data
                        ? formatSigned(
                            data.racialModifier
                          )
                        : ""
                    }
                  </small>

                </div>
              `;
            }
          )
          .join("");
    }
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function renderNavigation() {
    const current =
      Number(
        lastState.step
      ) || 0;

    const currentStep =
      $("#stepCurrent");

    if (currentStep) {
      currentStep.textContent =
        String(
          current + 1
        );
    }

    $$(
      '[data-action="previous"]'
    ).forEach(
      button => {
        button.disabled =
          current <=
          0;
      }
    );

    $$(
      '[data-action="next"]'
    ).forEach(
      button => {
        button.textContent =
          current >=
          10
            ? "Finalizar"
            : "Próximo →";
      }
    );
  }


  /* =========================================================
     LIGAÇÕES VISUAIS
     ========================================================= */

  function initializeVisualBindings() {
    initializeRaceDescription();
    initializeImageLoading();
  }


  /* =========================================================
     DESCRIÇÃO DA RAÇA
     ========================================================= */

  function initializeRaceDescription() {
    const raceCard =
      $("#raceCard");

    if (
      !raceCard ||
      raceCard.dataset
        .descriptionBound ===
      "true"
    ) {
      return;
    }

    raceCard.dataset
      .descriptionBound =
      "true";

    raceCard.addEventListener(
      "click",
      event => {
        /*
         * Botões internos pertencem ao
         * sistema de eventos principal.
         */
        if (
          event.target.closest(
            "button"
          )
        ) {
          return;
        }

        const description =
          $(
            "#raceDescription"
          );

        if (!description) {
          return;
        }

        const open =
          description.hidden;

        description.hidden =
          !open;

        description.dataset.open =
          open
            ? "true"
            : "false";
      }
    );
  }


  /* =========================================================
     IMAGENS
     ========================================================= */

  function initializeImageLoading() {
    const images =
      $$(
        "img"
      );

    images.forEach(
      image => {
        if (
          image.dataset
            .imageLoadingBound ===
          "true"
        ) {
          return;
        }

        image.dataset
          .imageLoadingBound =
          "true";

        image.addEventListener(
          "load",
          () => {
            image.classList.remove(
              "image-loading"
            );

            image.classList.add(
              "image-loaded"
            );
          }
        );

        image.addEventListener(
          "error",
          () => {
            image.classList.remove(
              "image-loading"
            );

            image.classList.add(
              "image-error"
            );
          }
        );
      }
    );
  }


  /* =========================================================
     ACESSIBILIDADE
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
      String(message);
  }


  /* =========================================================
     API
     ========================================================= */

  window.AERIONFichaRender =
    Object.freeze({

      render,

      toast,

      announce,

      setPowerMode,

      renderProgress,
      renderPanels,

      renderIdentity,
      renderAvatar,

      renderRace,
      renderAnimalha,

      renderAppearance,
      renderAppearanceFields,
      renderAnimalhaEditor,
      renderCharacterModel,

      renderClasses,

      renderAttributes,
      renderDice,
      renderAttributeCards,
      renderRadar,

      renderPower,
      renderMana,

      renderSkills,
      renderTechniques,
      renderInventory,

      renderCombat,
      renderReview,

      renderNavigation,

      initializeVisualBindings
    });


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeVisualBindings,
      {
        once:
          true
      }
    );
  } else {
    initializeVisualBindings();
  }


  console.info(
    "[AERION] ficha-render.js carregado."
  );

})();