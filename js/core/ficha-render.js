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
   - Combate
   - Revisão
   - Progresso

   O estado e as regras ficam em:
   js/core/ficha.js
   ========================================================= */

(() => {
  "use strict";

  let lastState = null;

  /* =======================================================
     DOM
     ======================================================= */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  /* =======================================================
     SEGURANÇA / FORMATAÇÃO
     ======================================================= */

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

  /* =======================================================
     TOAST
     ======================================================= */

  function toast(message, duration = 2200) {
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

  /* =======================================================
     RENDER GERAL
     ======================================================= */

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
  }

  /* =======================================================
     PROGRESSO
     ======================================================= */

  function renderProgress() {
    const progress =
      lastState.progress || {
        percent: 0,
        completed: 0,
        total: 11
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

    const percentage =
      $("#progressPercent");

    if (percentage) {
      percentage.textContent =
        `${percent}%`;
    }

    const step =
      Number(
        lastState.step
      ) || 0;

    const title =
      lastState.steps?.[step]?.name ||
      "Identidade";

    const progressTitle =
      $("#progressTitle");

    if (progressTitle) {
      progressTitle.textContent =
        title;
    }

    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {
          const active =
            index === step;

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

          button.setAttribute(
            "aria-current",
            active
              ? "step"
              : "false"
          );
        }
      );
  }

  function isStepCompleteVisual(
    index
  ) {
    const step =
      Number(
        lastState.step
      ) || 0;

    if (
      index <
      step
    ) {
      return true;
    }

    switch (index) {
      case 0:
        return Boolean(
          String(
            lastState.name || ""
          ).trim()
        ) &&
          Boolean(
            lastState.gender
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
        return Boolean(
          lastState.effectiveAttributes &&
          Object.values(
            lastState.effectiveAttributes
          ).every(
            attribute =>
              Boolean(
                attribute?.die
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
    if (index <= 0) {
      return true;
    }

    return isStepCompleteVisual(
      index - 1
    );
  }

  /* =======================================================
     PAINÉIS
     ======================================================= */

  function renderPanels() {
    const current =
      Number(
        lastState.step
      ) || 0;

    lastState.steps?.forEach(
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
          index === current;

        panel.hidden =
          !active;

        panel.classList.toggle(
          "is-active",
          active
        );
      }
    );
  }

  /* =======================================================
     IDENTIDADE
     ======================================================= */

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
      value || "";
  }

  /* =======================================================
     AVATAR
     ======================================================= */

  function renderAvatar() {
    const avatar =
      lastState.avatar ||
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

    const reviewAvatar =
      $("#reviewAvatar");

    const fallback =
      $("#reviewAvatarFallback");

    if (
      reviewAvatar &&
      fallback
    ) {
      if (avatar) {
        reviewAvatar.src =
          avatar;

        reviewAvatar.hidden =
          false;

        fallback.hidden =
          true;
      } else {
        reviewAvatar.removeAttribute(
          "src"
        );

        reviewAvatar.hidden =
          true;

        fallback.hidden =
          false;
      }
    }
  }

  /* =======================================================
     RAÇA
     ======================================================= */

  function renderRace() {
    /*
     * Aqui usamos previewRace, não raceData.
     *
     * Isso é importante:
     * navegar pelo carrossel NÃO seleciona a raça.
     * A raça só é escolhida ao clicar em Selecionar.
     */
    const race =
      lastState.previewRace;

    if (!race) {
      return;
    }

    const gender =
      lastState.gender;

    const image =
      gender === "feminino"
        ? race.female
        : race.male;

    const imageElement =
      $("#raceImage");

    if (imageElement) {
      if (image) {
        imageElement.src =
          image;

        imageElement.alt =
          `${race.name}${
            gender
              ? ` — ${gender}`
              : ""
          }`;

        imageElement.hidden =
          false;
      } else {
        imageElement.removeAttribute(
          "src"
        );

        imageElement.hidden =
          true;
      }
    }

    const name =
      $("#raceName");

    if (name) {
      name.textContent =
        race.name;
    }

    const short =
      $("#raceShortDescription");

    if (short) {
      short.textContent =
        race.description ||
        "";
    }

    const label =
      $("#raceGenderLabel");

    if (label) {
      const genderText =
        gender ===
        "feminino"
          ? "Feminino"
          : gender ===
              "masculino"
            ? "Masculino"
            : "";

      label.textContent =
        genderText
          ? `${race.name} · ${genderText}`
          : race.name;
    }

    const descTitle =
      $("#raceDescriptionTitle");

    if (descTitle) {
      descTitle.textContent =
        race.name;
    }

    const descText =
      $("#raceDescriptionText");

    if (descText) {
      const parts = [];

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

      descText.textContent =
        parts.join(" ");
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

    const descriptionPanel =
      $("#raceDescription");

    if (descriptionPanel) {
      /*
       * Continua fechado por padrão.
       * O clique na imagem pode ser tratado
       * depois pelo HTML/UI.
       */
      if (
        descriptionPanel.dataset
          .open === "true"
      ) {
        descriptionPanel.hidden =
          false;
      }
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

        container.appendChild(
          button
        );
      }
    );
  }

  /* =======================================================
     ANIMALHA
     ======================================================= */

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
      <div class="section-heading compact">

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

  /* =======================================================
     APARÊNCIA
     ======================================================= */

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

    const height =
      Number(
        appearance.height
      ) || 0;

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
          height
        );
    }

    const value =
      $("#appearanceHeightValue");

    if (value) {
      value.textContent =
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

    renderCharacterModel();
    renderAppearanceFields();
    renderAnimalhaEditor();

    const movementStatus =
      $(
        "[data-flight-status]"
      );

    if (movementStatus) {
      const canFly =
        Boolean(
          race?.flight
        );

      movementStatus.textContent =
        canFly
          ? "Voo disponível"
          : "Voo indisponível";

      movementStatus.classList.toggle(
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

  /* =======================================================
     MODELO 2D
     ======================================================= */

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
        ) / 2
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

    /*
     * Escala visual.
     *
     * Não tenta representar centímetros físicos.
     * Apenas preserva proporção visual entre mínimo
     * e máximo da raça.
     */
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

    container.dataset.race =
      lastState.race ||
      "";

    container.dataset.animalha =
      lastState.animalha ||
      "";

    /*
     * Adapta visualmente o modelo ao porte.
     */
    const size =
      race?.size ||
      "medio";

    container.dataset.size =
      size;

    /*
     * Características especiais.
     */
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

  /* =======================================================
     CLASSES
     ======================================================= */

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
                      )?.[
                        skillId
                      ];

                    if (
                      Array.isArray(
                        skill
                      )
                    ) {
                      return `${skill[0]} +${amount}`;
                    }

                    if (
                      skill &&
                      skill.name
                    ) {
                      return `${skill.name} +${amount}`;
                    }

                    return "";
                  }
                )
                .filter(
                  Boolean
                )
                .join(" • ");
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

  /* =======================================================
     ATRIBUTOS
     ======================================================= */

  function renderAttributes() {
    renderDice();
    renderAttributeCards();
    renderRadar();
  }

  /* =======================================================
     DADOS
     ======================================================= */

  function renderDice() {
    const root =
      $(
        "[data-dice-pool]"
      );

    if (!root) {
      return;
    }

    const dice =
      getConstants(
        "DICE"
      );

    const attributes =
      lastState.effectiveAttributes ||
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

    root.innerHTML =
      "";

    Object.entries(
      dice
    ).forEach(
      ([
        die,
        data
      ]) => {
        const amount =
          Number(
            data.amount
          ) || 0;

        const availableCount =
          Math.max(
            0,
            amount -
              (
                used[die] ||
                0
              )
          );

        /*
         * O pool só mostra dados ainda disponíveis.
         * Os dados usados aparecem dentro dos atributos.
         */
        for (
          let index = 0;
          index <
          availableCount;
          index++
        ) {
          const button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            `dice-card ${
              lastState.selectedDie ===
              die
                ? "dice-selected"
                : ""
            }`;

          button.dataset.die =
            die;

          button.draggable =
            true;

          button.setAttribute(
            "aria-label",
            `D${data.sides}`
          );

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
          `;

          root.appendChild(
            button
          );
        }
      }
    );

    /*
     * Mostra estado vazio se tudo estiver atribuído.
     */
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
        "Todos os dados foram distribuídos.";

      root.appendChild(
        empty
      );
    }
  }

  /* =======================================================
     CARDS DOS ATRIBUTOS
     ======================================================= */

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
                <span
                  class="attribute-die-icon"
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
              data.total ??
              "—";
          }

          const modifier =
            card.querySelector(
              "[data-attribute-modifier]"
            );

          if (modifier) {
            modifier.textContent =
              formatSigned(
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
              !data.die;
          }
        }
      );
  }

  /* =======================================================
     RADAR DOS ATRIBUTOS
     ======================================================= */

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

    let grid =
      "";

    /*
     * 4 níveis de grade.
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

    /*
     * Linhas de cada atributo.
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
        aria-label="Perfil dos oito atributos"
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

  /* =======================================================
     PODER
     ======================================================= */

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

  /* =======================================================
     MANA
     ======================================================= */

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

          /*
           * Nesta criação de ficha apenas Azul
           * fica liberada.
           *
           * As outras permanecem reservadas
           * para a liberação dentro da campanha.
           */
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

  /* =======================================================
     PERÍCIAS
     ======================================================= */

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
          effective[id] || {
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
            getCore()
              ?.constants
              ?.CLASSES?.[
              lastState.class
            ]?.skillBonuses?.[
              id
            ]
          ) || 0;

        const card =
          document.createElement(
            "article"
          );

        card.className =
          `skill-card ${
            trained
              ? "trained"
              : ""
          }`;

        card.dataset.skill =
          id;

        card.innerHTML = `
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

              <small
                data-class-skill-bonus
              >
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
          card
        );
      }
    );
  }

  /* =======================================================
     TÉCNICAS
     ======================================================= */

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

  /* =======================================================
     INVENTÁRIO
     ======================================================= */

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

  /* =======================================================
     COMBATE
     ======================================================= */

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

  /* =======================================================
     REVISÃO
     ======================================================= */

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
          lastState
            .appearance ||
          {};

        const lines = [];

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
        lastState
          .effectiveAttributes ||
        {};

      attributesRoot.innerHTML =
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

    renderReviewAvatarText();
  }

  function renderReviewAvatarText() {
    const name =
      $(
        '[data-review="name"]'
      );

    if (name) {
      name.title =
        lastState.name ||
        "Sem nome";
    }
  }

  /* =======================================================
     NAVEGAÇÃO
     ======================================================= */

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
          current >= 10
            ? "Finalizar"
            : "Próximo →";
      }
    );
  }

  /* =======================================================
     ACESSIBILIDADE
     ======================================================= */

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

      live.setAttribute(
        "aria-live",
        "polite"
      );

      live.setAttribute(
        "aria-atomic",
        "true"
      );

      live.className =
        "visually-hidden";

      document.body.appendChild(
        live
      );
    }

    live.textContent =
      message;
  }

  /* =======================================================
     EVENTOS VISUAIS DO RENDERER
     ======================================================= */

  function initRendererEvents() {
    /*
     * Clique na imagem da raça:
     * abre/fecha a descrição.
     */
    const raceCard =
      $("#raceCard");

    if (
      raceCard &&
      !raceCard.dataset
        .rendererBound
    ) {
      raceCard.dataset
        .rendererBound =
        "true";

      raceCard.addEventListener(
        "click",
        event => {
          /*
           * Não intercepta botões internos.
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

          announce(
            open
              ? "Descrição da raça aberta."
              : "Descrição da raça fechada."
          );
        }
      );
    }
  }

  /* =======================================================
     API
     ======================================================= */

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

      initRendererEvents
    });

  /* =======================================================
     INICIALIZAÇÃO DO RENDERER
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initRendererEvents,
      {
        once: true
      }
    );
  } else {
    initRendererEvents();
  }

  console.info(
    "[AERION] ficha-render.js carregado."
  );

})();