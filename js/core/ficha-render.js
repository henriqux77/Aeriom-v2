/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   RESPONSABILIDADE:
   - Renderização visual
   - Imagens
   - Raça
   - Animalha
   - Aparência
   - Modelo 2D
   - Altura
   - Classes
   - Dados
   - Atributos
   - Radar
   - Poder
   - Mana
   - Perícias
   - Técnicas
   - Inventário
   - Revisão
   - Progresso

   NÃO contém:
   - regras centrais
   - estado principal
   - autosave
   - decisões de jogo

   O núcleo fica em:
   js/core/ficha.js
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     ESTADO LOCAL DO RENDER
     ========================================================= */

  let currentState = null;

  /* =========================================================
     UTILIDADES DOM
     ========================================================= */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(
      root.querySelectorAll(selector)
    );
  }

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

  /* =========================================================
     TOAST
     ========================================================= */

  function toast(message, duration = 2400) {
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
      element.__aerionToastTimer
    );

    element.__aerionToastTimer =
      setTimeout(() => {
        element.hidden = true;
      }, duration);
  }

  /* =========================================================
     RENDER PRINCIPAL
     ========================================================= */

  function render(state) {
    currentState = state;

    if (!currentState) {
      return;
    }

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
  }

  /* =========================================================
     PROGRESSO
     ========================================================= */

  function renderProgress() {
    const progress =
      currentState.progress || {
        percent: 0,
        completed: 0,
        total:
          currentState.steps?.length || 11
      };

    const percent =
      Number(progress.percent) || 0;

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

    const percentage =
      $("#progressPercent");

    if (percentage) {
      percentage.textContent =
        `${percent}%`;
    }

    const step =
      Number(
        currentState.step
      ) || 0;

    const title =
      currentState.steps?.[
        step
      ]?.name ||
      "Identidade";

    const progressTitle =
      $("#progressTitle");

    if (progressTitle) {
      progressTitle.textContent =
        title;
    }

    $$(".progress-step")
      .forEach(
        (element, index) => {
          const active =
            index === step;

          const complete =
            isProgressStepComplete(
              index
            );

          const unlocked =
            isStepUnlocked(
              index
            );

          element.classList.toggle(
            "active",
            active
          );

          element.classList.toggle(
            "is-active",
            active
          );

          element.classList.toggle(
            "complete",
            complete
          );

          element.classList.toggle(
            "is-complete",
            complete
          );

          element.classList.toggle(
            "locked",
            !unlocked
          );

          element.disabled =
            !unlocked;

          element.setAttribute(
            "aria-current",
            active
              ? "step"
              : "false"
          );
        }
      );
  }

  function isProgressStepComplete(
    index
  ) {
    const step =
      Number(
        currentState.step
      );

    if (
      index <
      step
    ) {
      return true;
    }

    if (
      currentState.progress
        ?.completed >=
      currentState.steps?.length
    ) {
      return true;
    }

    /*
     * O estado público não expõe necessariamente
     * isStepComplete, então calculamos os pontos
     * básicos visualmente.
     */
    switch (index) {
      case 0:
        return Boolean(
          currentState.name &&
          currentState.gender
        );

      case 1:
        return Boolean(
          currentState.race
        );

      case 2:
        return Boolean(
          currentState.appearance
            ?.height
        );

      case 3:
        return Boolean(
          currentState.class
        );

      case 4:
        return Boolean(
          currentState.effectiveAttributes &&
          Object.values(
            currentState.effectiveAttributes
          ).every(
            attribute =>
              Boolean(
                attribute?.die
              )
          )
        );

      case 5:
        return Boolean(
          currentState.power
        );

      case 6:
        return (
          currentState.mana ===
          "azul"
        );

      default:
        return false;
    }
  }

  function isStepUnlocked(
    index
  ) {
    if (
      index <= 0
    ) {
      return true;
    }

    return isProgressStepComplete(
      index - 1
    );
  }

  /* =========================================================
     PAINÉIS
     ========================================================= */

  function renderPanels() {
    const current =
      Number(
        currentState.step
      ) || 0;

    const currentId =
      currentState.steps?.[
        current
      ]?.id;

    $$(".creation-panel")
      .forEach(
        panel => {
          const panelId =
            panel.dataset
              .panel;

          const index =
            currentState.steps
              ?.findIndex(
                step =>
                  step.id ===
                  panelId
              );

          const active =
            index === current;

          panel.hidden =
            !active;

          panel.classList.toggle(
            "is-active",
            active
          );
        }
      );

    /*
     * Fallback para páginas antigas
     * usando data-step numérico.
     */
    $$(
      '[data-step]'
    ).forEach(
      element => {
        if (
          element.classList.contains(
            "progress-step"
          )
        ) {
          return;
        }

        const raw =
          element.dataset
            .step;

        const index =
          Number(raw);

        if (
          !Number.isInteger(
            index
          )
        ) {
          return;
        }

        if (
          index === current
        ) {
          element.classList.add(
            "active"
          );
        } else {
          element.classList.remove(
            "active"
          );
        }
      }
    );
  }

  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function renderIdentity() {
    const name =
      $("#characterName");

    if (
      name &&
      document.activeElement !==
        name
    ) {
      name.value =
        currentState.name ||
        "";
    }

    const age =
      $("#characterAge");

    if (
      age &&
      document.activeElement !==
        age
    ) {
      age.value =
        currentState.age ||
        "";
    }

    const description =
      $("#characterDescription");

    if (
      description &&
      document.activeElement !==
        description
    ) {
      description.value =
        currentState.description ||
        "";
    }

    const origin =
      $("#characterOrigin");

    if (
      origin &&
      document.activeElement !==
        origin
    ) {
      origin.value =
        currentState.origin ||
        "";
    }

    $$(
      'input[name="gender"]'
    ).forEach(
      radio => {
        radio.checked =
          radio.value ===
          currentState.gender;
      }
    );

    $$(
      ".gender-option"
    ).forEach(
      option => {
        const selected =
          option.dataset
            .gender ===
          currentState.gender;

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

  /* =========================================================
     AVATAR
     ========================================================= */

  function renderAvatar() {
    const avatar =
      currentState.avatar ||
      "";

    const image =
      $("#avatarImage");

    const placeholder =
      $("#avatarPlaceholder");

    const remove =
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

    if (remove) {
      remove.disabled =
        !Boolean(
          avatar
        );
    }

    $$(
      "[data-character-avatar]"
    ).forEach(
      element => {
        if (avatar) {
          element.src =
            avatar;

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

    /*
     * Preview da revisão.
     */
    const reviewAvatar =
      $("#reviewAvatar");

    const reviewFallback =
      $("#reviewAvatarFallback");

    if (
      reviewAvatar &&
      reviewFallback
    ) {
      if (avatar) {
        reviewAvatar.src =
          avatar;

        reviewAvatar.hidden =
          false;

        reviewFallback.hidden =
          true;
      } else {
        reviewAvatar.hidden =
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
      currentState.raceData;

    if (!race) {
      return;
    }

    const image =
      currentState.gender ===
      "feminino"
        ? race.female
        : race.male;

    const raceImage =
      $("#raceImage");

    if (raceImage) {
      if (image) {
        raceImage.src =
          image;

        raceImage.alt =
          race.name;

        raceImage.hidden =
          false;
      } else {
        raceImage.removeAttribute(
          "src"
        );

        raceImage.hidden =
          true;
      }
    }

    const name =
      $("#raceName");

    if (name) {
      name.textContent =
        race.name;
    }

    const description =
      $("#raceShortDescription");

    if (description) {
      description.textContent =
        race.description ||
        race.desc ||
        "";
    }

    const genderLabel =
      $("#raceGenderLabel");

    if (genderLabel) {
      const gender =
        currentState.gender ===
        "feminino"
          ? "Feminino"
          : currentState.gender ===
              "masculino"
            ? "Masculino"
            : "";

      genderLabel.textContent =
        gender
          ? `${race.name} · ${gender}`
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
      const lines = [
        race.description ||
          race.desc ||
          "",

        race.profile
          ? `Perfil natural: ${race.profile}`
          : "",

        race.feature
          ? `Característica: ${race.feature}`
          : ""
      ].filter(Boolean);

      descriptionText.textContent =
        lines.join(" ");
    }

    const selected =
      currentState.race;

    const selectedText =
      $("#raceSelectedText");

    if (selectedText) {
      selectedText.textContent =
        selected
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

    container.innerHTML =
      "";

    const races =
      window.AERIONFicha
        ?.constants
        ?.RACES ||
      [];

    const index =
      Number(
        currentState.raceIndex
      ) || 0;

    races.forEach(
      (
        race,
        raceIndex
      ) => {
        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          raceIndex ===
          index
            ? "is-active"
            : "";

        button.dataset.action =
          "go-race-index";

        button.dataset.raceIndex =
          String(
            raceIndex
          );

        button.setAttribute(
          "aria-label",
          race.name
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

  function renderAnimalha() {
    const container =
      $(
        "[data-animalha-variants]"
      );

    if (!container) {
      return;
    }

    if (
      currentState.race !==
      "animalha"
    ) {
      container.hidden =
        true;

      container.innerHTML =
        "";

      return;
    }

    container.hidden =
      false;

    const variants =
      window.AERIONFicha
        ?.constants
        ?.ANIMALHA_VARIANTS ||
      [];

    const selected =
      currentState.animalha ||
      "";

    container.innerHTML = `
      <div class="section-heading compact">

        <span class="eyebrow">
          ANIMALHA
        </span>

        <h3>
          Escolha sua linhagem
        </h3>

        <p>
          O animal escolhido altera perfil natural,
          porte, limites físicos e movimentação.
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

              <span class="animalha-variant-icon">
                ${getAnimalhaIcon(
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

  function getAnimalhaIcon(
    category
  ) {
    const value =
      String(
        category || ""
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
      currentState.appearance ||
      {};

    const height =
      Number(
        appearance.height
      ) || 0;

    const race =
      currentState.raceData;

    const min =
      Number(
        race?.height?.min
      ) || 0;

    const max =
      Number(
        race?.height?.max
      ) || 0;

    const heightRange =
      $("#heightRange");

    if (heightRange) {
      if (min) {
        heightRange.min =
          String(min);
      }

      if (max) {
        heightRange.max =
          String(max);
      }

      if (height) {
        heightRange.value =
          String(height);
      }
    }

    const heightValue =
      $("#appearanceHeightValue");

    if (heightValue) {
      heightValue.textContent =
        formatHeight(
          height
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

    renderAppearanceFigure();

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
        const element =
          $(`#${field}`);

        if (
          element &&
          document.activeElement !==
            element
        ) {
          element.value =
            appearance[field] ||
            "";
        }
      }
    );

    /*
     * Select Animalha.
     */
    const animalhaSection =
      $(
        "[data-animalha-editor]"
      );

    if (
      animalhaSection
    ) {
      animalhaSection.hidden =
        currentState.race !==
        "animalha";
    }

    const animalhaSelect =
      $("#animalhaVariant");

    if (
      animalhaSelect
    ) {
      const variants =
        window.AERIONFicha
          ?.constants
          ?.ANIMALHA_VARIANTS ||
        [];

      animalhaSelect.innerHTML =
        `
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
                currentState.animalha ===
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

    const flight =
      $(
        "[data-flight-status]"
      );

    if (flight) {
      const canFly =
        Boolean(
          race?.flight
        );

      flight.textContent =
        canFly
          ? "Voo disponível"
          : "Voo indisponível";

      flight.classList.toggle(
        "available",
        canFly
      );
    }
  }

  /* =========================================================
     MODELO 2D
     ========================================================= */

  function renderAppearanceFigure() {
    const container =
      $("#appearanceFigure");

    if (!container) {
      return;
    }

    const race =
      currentState.raceData;

    const appearance =
      currentState.appearance ||
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
      clampNumber(
        Number(
          appearance.height
        ) || (
          min +
          max
        ) / 2,
        min,
        max
      );

    const normalized =
      (
        height -
        min
      ) /
      Math.max(
        1,
        max -
          min
      );

    /*
     * Altura visual.
     */
    const visualHeight =
      225 +
      normalized *
        125;

    container.style.setProperty(
      "--character-height",
      `${visualHeight}px`
    );

    container.style.setProperty(
      "--character-scale",
      `${0.9 +
        normalized *
          0.22}`
    );

    container.classList.toggle(
      "appearance-figure--female",
      currentState.gender ===
        "feminino"
    );

    container.classList.toggle(
      "appearance-figure--male",
      currentState.gender !==
        "feminino"
    );

    /*
     * Classes raciais.
     */
    container.dataset.race =
      currentState.race ||
      "";

    container.dataset.animalha =
      currentState.animalha ||
      "";

    /*
     * Mostra elementos visuais especiais
     * sem obrigar o HTML inteiro a conhecer
     * as regras da ficha.
     */
    updateVisualFeature(
      container,
      "wings",
      Boolean(
        race?.flight
      )
    );

    updateVisualFeature(
      container,
      "tail",
      currentState.race ===
        "animalha"
    );
  }

  function updateVisualFeature(
    container,
    feature,
    visible
  ) {
    const element =
      container.querySelector(
        `[data-character-feature="${feature}"]`
      );

    if (!element) {
      return;
    }

    element.hidden =
      !visible;
  }

  /* =========================================================
     CLASSES
     ========================================================= */

  function renderClasses() {
    const classes =
      window.AERIONFicha
        ?.constants
        ?.CLASSES ||
      {};

    $$(".class-card")
      .forEach(
        card => {
          const id =
            card.dataset
              .class;

          const selected =
            id ===
            currentState.class;

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

          const classData =
            classes[
              id
            ];

          if (!classData) {
            return;
          }

          const bonus =
            card.querySelector(
              "[data-class-bonus]"
            );

          if (bonus) {
            bonus.textContent =
              Object.entries(
                classData.skillBonuses ||
                  {}
              )
                .map(
                  ([
                    skillId,
                    value
                  ]) => {
                    const skill =
                      window
                        .AERIONFicha
                        ?.constants
                        ?.SKILLS?.[
                          skillId
                        ];

                    if (!skill) {
                      return "";
                    }

                    return `${skill.name} +${value}`;
                  }
                )
                .filter(
                  Boolean
                )
                .join(" • ");
          }

          /*
           * O caminho da imagem da classe
           * pode ser configurado posteriormente
           * no HTML/data.
           */
          const image =
            card.querySelector(
              "[data-class-image]"
            );

          if (
            image &&
            image.dataset
              .src &&
            image.dataset
              .src.trim()
          ) {
            image.src =
              image.dataset
                .src;
          }
        }
      );

    const selected =
      classes[
        currentState.class
      ];

    const className =
      $(
        "[data-class-name]"
      );

    if (className) {
      className.textContent =
        selected?.name ||
        "—";
    }

    const classRole =
      $(
        "[data-class-role]"
      );

    if (classRole) {
      classRole.textContent =
        selected?.role ||
        "—";
    }
  }

  /* =========================================================
     DADOS
     ========================================================= */

  function renderDice() {
    const root =
      $("[data-dice-pool]");

    if (!root) {
      return;
    }

    const dice =
      window.AERIONFicha
        ?.constants
        ?.DICE ||
      {};

    const attributes =
      currentState
        .effectiveAttributes ||
      {};

    const used =
      {};

    Object.values(
      attributes
    ).forEach(
      attribute => {
        if (
          attribute?.die
        ) {
          used[
            attribute.die
          ] =
            (
              used[
                attribute.die
              ] || 0
            ) + 1;
        }
      }
    );

    const cards =
      [];

    Object.entries(
      dice
    ).forEach(
      ([
        id,
        data
      ]) => {
        for (
          let i = 0;
          i <
          Number(
            data.amount
          );
          i++
        ) {
          /*
           * Cada cópia possui uma chave própria.
           */
          const assigned =
            i <
            (
              used[id] || 0
            );

          cards.push(`
            <button
              type="button"
              class="dice-card ${
                assigned
                  ? "assigned"
                  : ""
              } ${
                currentState.selectedDie ===
                id
                  ? "dice-selected"
                  : ""
              }"
              data-die="${escapeHtml(
                id
              )}"
              draggable="${
                assigned
                  ? "false"
                  : "true"
              }"
              aria-label="D${data.sides}"
              aria-disabled="${assigned}"
            >

              <span
                class="dice-icon"
                aria-hidden="true"
              >

                <svg
                  viewBox="0 0 100 100"
                  class="dice-svg"
                >

                  <polygon
                    points="50,5 90,28 90,72 50,95 10,72 10,28"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="5"
                    stroke-linejoin="round"
                  />

                </svg>

                <span>
                  D${data.sides}
                </span>

              </span>

            </button>
          `);
        }
      }
    );

    root.innerHTML =
      cards.join("");
  }

  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function renderAttributes() {
    renderDice();

    const attributes =
      currentState
        .effectiveAttributes ||
      {};

    $$(".attribute-card")
      .forEach(
        card => {
          const id =
            card.dataset
              .attribute;

          const data =
            attributes[
              id
            ];

          if (!data) {
            return;
          }

          card.classList.toggle(
            "has-die",
            Boolean(
              data.die
            )
          );

          card.classList.toggle(
            "has-result",
            Boolean(
              data.rolled
            )
          );

          const die =
            card.querySelector(
              "[data-attribute-die]"
            );

          if (die) {
            if (
              data.die
            ) {
              die.innerHTML = `
                <span class="attribute-die-icon">

                  <svg
                    viewBox="0 0 100 100"
                    class="dice-svg"
                  >
                    <polygon
                      points="50,5 90,28 90,72 50,95 10,72 10,28"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="5"
                    />
                  </svg>

                  <span>
                    D${data.sides}
                  </span>

                </span>
              `;
            } else {
              die.textContent =
                "Nenhum dado";
            }
          }

          const value =
            card.querySelector(
              "[data-attribute-value]"
            );

          if (value) {
            value.textContent =
              data.total ===
              null
                ? "—"
                : String(
                    data.total
                  );
          }

          const modifier =
            card.querySelector(
              "[data-attribute-modifier]"
            );

          if (modifier) {
            modifier.textContent =
              formatModifier(
                data.racialModifier
              );

            modifier.classList.toggle(
              "positive",
              data.racialModifier >
                0
            );

            modifier.classList.toggle(
              "negative",
              data.racialModifier <
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
                ? `${data.roll} ${formatModifier(
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
              !data.die;
          }
        }
      );

    renderRadar();
  }

  function renderRadar() {
    const root =
      $(
        "[data-attribute-radar]"
      );

    if (!root) {
      return;
    }

    const attributes =
      currentState
        .effectiveAttributes ||
      {};

    const definitions =
      window.AERIONFicha
        ?.constants
        ?.ATTRIBUTES ||
      [];

    const values =
      definitions.map(
        attribute => {
          const data =
            attributes[
              attribute.id
            ];

          return Math.max(
            0,
            Number(
              data?.total
            ) || 0
          );
        }
      );

    const max =
      Math.max(
        1,
        ...values
      );

    const center =
      210;

    const radius =
      150;

    const count =
      Math.max(
        definitions.length,
        1
      );

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

    let grid = "";

    /*
     * Grades internas.
     */
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
                  level /
                  4
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

    /*
     * Eixos.
     */
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
                  max
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
        aria-label="Gráfico dos atributos do personagem"
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
        currentState.power ||
        "Nenhum poder escolhido";
    }

    const result =
      $(
        "[data-power-result]"
      );

    if (result) {
      result.textContent =
        currentState.powerRoll ??
        "—";
    }

    const note =
      $(
        "[data-power-result-note]"
      );

    if (note) {
      if (
        currentState.powerRoll
      ) {
        note.textContent =
          `D100 ${currentState.powerRoll} → ${currentState.power}`;
      } else if (
        currentState.power
      ) {
        note.textContent =
          `${currentState.powerType === "paralelo" ? "Poder paralelo" : "Poder principal"} selecionado.`;
      } else {
        note.textContent =
          "O D100 define um dos quatro poderes principais.";
      }
    }

    /*
     * Marca o botão de poder paralelo selecionado.
     */
    $$(
      '[data-action="select-parallel-power"]'
    ).forEach(
      button => {
        const power =
          button.dataset
            .power;

        button.classList.toggle(
          "selected",
          power ===
            currentState.power
        );
      }
    );
  }

  /* =========================================================
     MANA
     ========================================================= */

  function renderMana() {
    $$(".mana-card")
      .forEach(
        card => {
          const id =
            String(
              card.dataset
                .mana ||
                ""
            ).toLowerCase();

          /*
           * A Azul é a única disponível
           * fora da campanha.
           */
          const available =
            id ===
            "azul";

          const selected =
            currentState.mana ===
            id;

          card.classList.toggle(
            "selected",
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

          card.setAttribute(
            "aria-disabled",
            String(
              !available
            )
          );

          /*
           * Não deixa Mana bloqueada ser
           * ativada pelo navegador.
           */
          if (
            !available
          ) {
            card.disabled =
              true;
          } else {
            card.disabled =
              false;
          }
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
      window.AERIONFicha
        ?.constants
        ?.SKILLS ||
      {};

    const stateSkills =
      currentState
        .effectiveSkills ||
      {};

    root.innerHTML =
      Object.values(
        skills
      )
        .map(
          skill => {
            const data =
              stateSkills[
                skill.id
              ] || {
                trained: false,
                bonus: 0,
                effectiveBonus: 0
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
                window
                  .AERIONFicha
                  ?.getState?.()
                  ?.class
              ) || 0;

            return `
              <article
                class="skill-card ${
                  trained
                    ? "trained"
                    : ""
                }"
                data-skill="${escapeHtml(
                  skill.id
                )}"
              >

                <div class="skill-card-main">

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


                  <div class="skill-bonus-box">

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

                    <small
                      data-class-skill-bonus
                    ></small>

                  </div>

                </div>


                <div class="skill-actions">

                  <button
                    type="button"
                    class="button button-secondary"
                    data-action="train-skill"
                    data-skill="${escapeHtml(
                      skill.id
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
                      skill.id
                    )}"
                    aria-label="Bônus de ${escapeHtml(
                      skill.name
                    )}"
                  />

                </div>

              </article>
            `;
          }
        )
        .join("");
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
        currentState.techniques
      )
        ? currentState.techniques
        : [];

    if (
      techniques.length ===
      0
    ) {
      root.innerHTML = `
        <div class="empty-state">

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

    root.innerHTML =
      techniques
        .map(
          technique => `
            <article
              class="technique-card"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
            >

              <div class="technique-card-header">

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
                >

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


              <div class="technique-fields">

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
                >


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
                >

              </div>


              <div class="technique-extra-fields">

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
                >


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
                >


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

            </article>
          `
        )
        .join("");
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
        currentState.inventory
      )
        ? currentState.inventory
        : [];

    if (
      inventory.length ===
      0
    ) {
      root.innerHTML = `
        <div class="empty-state">

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

    root.innerHTML =
      inventory
        .map(
          item => `
            <article
              class="inventory-item"
              data-inventory-id="${escapeHtml(
                item.id
              )}"
            >

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
              >


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
              >


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
              >


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

            </article>
          `
        )
        .join("");
  }

  /* =========================================================
     COMBATE
     ========================================================= */

  function renderCombat() {
    const combat =
      currentState.combat ||
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
        combat.movement ===
        null ||
        combat.movement ===
          undefined
          ? "—"
          : `${combat.movement} m`;
    }

    const air =
      $(
        "[data-combat-air]"
      );

    if (air) {
      air.textContent =
        combat.air ===
        null ||
        combat.air ===
          undefined
          ? "—"
          : `${combat.air} m`;
    }

    const aquatic =
      $(
        "[data-combat-aquatic]"
      );

    if (aquatic) {
      aquatic.textContent =
        combat.aquatic ===
        null ||
        combat.aquatic ===
          undefined
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
      currentState.raceData;

    const classes =
      window.AERIONFicha
        ?.constants
        ?.CLASSES ||
      {};

    const classData =
      classes[
        currentState.class
      ];

    const reviewValues = {
      name:
        currentState.name ||
        "Sem nome",

      gender:
        currentState.gender ===
        "masculino"
          ? "Masculino"
          : currentState.gender ===
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
          currentState
            .appearance
            ?.height
        ),

      power:
        currentState.power ||
        "—",

      mana:
        "Mana Azul"
    };

    Object.entries(
      reviewValues
    ).forEach(
      ([
        key,
        value
      ]) => {
        $$(
          `[data-review="${key}"]`
        ).forEach(
          element =>
            element.textContent =
              value
        );
      }
    );

    $$(
      '[data-review="description"]'
    ).forEach(
      element => {
        element.textContent =
          currentState.description ||
          "Nenhuma descrição.";
      }
    );

    $$(
      '[data-review="appearance"]'
    ).forEach(
      element => {
        const appearance =
          currentState
            .appearance ||
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

    const attributeRoot =
      $(
        "[data-review-attributes]"
      );

    if (
      attributeRoot
    ) {
      const attributes =
        currentState
          .effectiveAttributes ||
        {};

      const definitions =
        window.AERIONFicha
          ?.constants
          ?.ATTRIBUTES ||
        [];

      attributeRoot.innerHTML =
        definitions
          .map(
            attribute => {
              const data =
                attributes[
                  attribute.id
                ];

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
                      data?.die
                        ? `D${data.sides}`
                        : "—"
                    }
                  </strong>

                  <small>
                    ${
                      data
                        ? formatModifier(
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
        currentState.step
      ) || 0;

    $(
      "#stepCurrent"
    )?.replaceChildren(
      document.createTextNode(
        String(
          current + 1
        )
      )
    );

    const previous =
      $$(
        '[data-action="previous"]'
      );

    previous.forEach(
      button => {
        button.disabled =
          current <=
          0;
      }
    );

    const next =
      $$(
        '[data-action="next"]'
      );

    const last =
      current >=
      (
        currentState.steps
          ?.length || 11
      ) -
        1;

    next.forEach(
      button => {
        button.textContent =
          last
            ? "Finalizar"
            : "Próximo →";
      }
    );
  }

  /* =========================================================
     AUXILIARES
     ========================================================= */

  function formatModifier(
    value
  ) {
    const number =
      Number(value) || 0;

    if (
      number >
      0
    ) {
      return `+${number}`;
    }

    if (
      number <
      0
    ) {
      return String(
        number
      );
    }

    return "0";
  }

  function formatSigned(
    value
  ) {
    const number =
      Number(value) || 0;

    return number >=
      0
      ? `+${number}`
      : String(
          number
        );
  }

  function clampNumber(
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

  /* =========================================================
     API PÚBLICA
     ========================================================= */

  window.AERIONFichaRender =
    Object.freeze({
      render,

      toast,

      renderProgress,

      renderPanels,

      renderIdentity,

      renderAvatar,

      renderRace,

      renderAnimalha,

      renderAppearance,

      renderAppearanceFigure,

      renderClasses,

      renderDice,

      renderAttributes,

      renderRadar,

      renderPower,

      renderMana,

      renderSkills,

      renderTechniques,

      renderInventory,

      renderCombat,

      renderReview,

      renderNavigation
    });

  console.info(
    "[AERION] ficha-render.js carregado."
  );

})();