/* =========================================================
   AERION — PERSONAGEM RENDER
   js/core/personagem-render.js

   Motor visual 2D do editor de personagem.

   Responsável por:
   - Corpo
   - Proporções
   - Altura
   - Pele
   - Cabelo
   - Olhos
   - Cicatrizes
   - Tatuagens
   - Roupas
   - Asas
   - Cauda
   - Elementos raciais

   NÃO altera regras da ficha.
   Apenas lê o estado exposto pelo ficha.js.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    selector: "#appearanceFigure",

    svgClass:
      "aerion-character-svg",

    viewBox:
      "0 0 180 340"
  });


  /* =========================================================
     ESTADO LOCAL
     ========================================================= */

  let lastRenderKey = "";


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function getFicha() {
    return window.AERIONFicha || null;
  }


  function getState() {
    const ficha =
      getFicha();

    if (
      !ficha ||
      typeof ficha.getState !==
        "function"
    ) {
      return null;
    }

    return ficha.getState();
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


  function escapeHtml(
    value
  ) {
    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#39;"
      );
  }


  /* =========================================================
     NORMALIZAÇÃO DE APARÊNCIA
     ========================================================= */

  function normalizeText(
    value
  ) {
    return String(
      value ?? ""
    )
      .trim()
      .toLowerCase();
  }


  /* =========================================================
     PALETA
     ========================================================= */

  function getPalette(
    appearance
  ) {
    const skinText =
      normalizeText(
        appearance.skin
      );

    const hairText =
      normalizeText(
        appearance.hair
      );

    let skin =
      "#b99f8b";

    let skinShadow =
      "#806c5f";

    let hair =
      "#27211c";

    let hairHighlight =
      "#4a3a2f";


    /* -------------------------------------------------------
       PELE
       ------------------------------------------------------- */

    if (
      skinText.includes(
        "muito clara"
      ) ||
      skinText.includes(
        "pálida"
      )
    ) {
      skin =
        "#e2c8b2";

      skinShadow =
        "#ae907b";
    }

    else if (
      skinText.includes(
        "clara"
      )
    ) {
      skin =
        "#d2b39b";

      skinShadow =
        "#987d69";
    }

    else if (
      skinText.includes(
        "morena"
      )
    ) {
      skin =
        "#a98268";

      skinShadow =
        "#725543";
    }

    else if (
      skinText.includes(
        "escura"
      ) ||
      skinText.includes(
        "negra"
      )
    ) {
      skin =
        "#704d3d";

      skinShadow =
        "#4c3429";
    }

    else if (
      skinText.includes(
        "verde"
      )
    ) {
      skin =
        "#718765";

      skinShadow =
        "#4f6248";
    }

    else if (
      skinText.includes(
        "azul"
      )
    ) {
      skin =
        "#7196aa";

      skinShadow =
        "#4d6877";
    }

    else if (
      skinText.includes(
        "vermelha"
      )
    ) {
      skin =
        "#9a5b50";

      skinShadow =
        "#653c35";
    }


    /* -------------------------------------------------------
       CABELO
       ------------------------------------------------------- */

    if (
      hairText.includes(
        "loiro"
      ) ||
      hairText.includes(
        "dourado"
      )
    ) {
      hair =
        "#c8a95d";

      hairHighlight =
        "#ecd58f";
    }

    else if (
      hairText.includes(
        "castanho claro"
      )
    ) {
      hair =
        "#72523a";

      hairHighlight =
        "#a47955";
    }

    else if (
      hairText.includes(
        "castanho"
      )
    ) {
      hair =
        "#513726";

      hairHighlight =
        "#79583c";
    }

    else if (
      hairText.includes(
        "ruivo"
      ) ||
      hairText.includes(
        "vermelho"
      )
    ) {
      hair =
        "#8c4932";

      hairHighlight =
        "#bd7250";
    }

    else if (
      hairText.includes(
        "branco"
      ) ||
      hairText.includes(
        "prata"
      ) ||
      hairText.includes(
        "prateado"
      )
    ) {
      hair =
        "#d8d8d2";

      hairHighlight =
        "#f3f3ee";
    }

    else if (
      hairText.includes(
        "azul"
      )
    ) {
      hair =
        "#4f7494";

      hairHighlight =
        "#7fa7c8";
    }

    else if (
      hairText.includes(
        "verde"
      )
    ) {
      hair =
        "#527452";

      hairHighlight =
        "#7faa70";
    }


    return {
      skin,
      skinShadow,
      hair,
      hairHighlight
    };
  }


  /* =========================================================
     CARACTERÍSTICAS RACIAIS
     ========================================================= */

  function getRaceVisualData(
    state
  ) {
    const race =
      state?.raceData ||
      {};

    const raceId =
      normalizeText(
        state?.race
      );

    const animal =
      normalizeText(
        state?.animalha
      );

    return {
      race,
      raceId,
      animal,

      isAnimalha:
        raceId ===
        "animalha",

      hasWings:
        Boolean(
          race.flight
        ),

      isSmall:
        race.size ===
        "pequeno",

      isLarge:
        race.size ===
        "grande",

      isColossal:
        race.size ===
        "colossal",

      isDwarf:
        raceId ===
        "anao",

      isOrc:
        raceId ===
        "orc",

      isTroll:
        raceId ===
        "troll",

      isColossus:
        raceId ===
        "colosso",

      isFairy:
        raceId ===
        "fada"
    };
  }


  /* =========================================================
     ESCALA CORPORAL
     ========================================================= */

  function calculateBody(
    state
  ) {
    const race =
      state?.raceData ||
      {};

    const min =
      Number(
        race.height?.min
      ) ||
      140;

    const max =
      Number(
        race.height?.max
      ) ||
      200;

    const current =
      clamp(
        Number(
          state?.appearance
            ?.height
        ) ||
          (
            min +
            max
          ) /
            2,

        min,
        max
      );

    const normalized =
      (
        current -
        min
      ) /
      Math.max(
        1,
        max -
          min
      );


    let height =
      245 +
      normalized *
        72;

    let width =
      1;


    if (
      race.size ===
      "pequeno"
    ) {
      height *=
        .90;

      width *=
        .94;
    }

    if (
      race.size ===
      "grande"
    ) {
      height *=
        1.07;

      width *=
        1.14;
    }

    if (
      race.size ===
      "colossal"
    ) {
      height *=
        1.13;

      width *=
        1.28;
    }


    return {
      current,

      normalized,

      height,

      width
    };
  }


  /* =========================================================
     CABELO
     ========================================================= */

  function getHairGeometry(
    appearance,
    palette
  ) {
    const hair =
      normalizeText(
        appearance.hair
      );

    const long =
      hair.includes(
        "longo"
      );

    const short =
      hair.includes(
        "curto"
      );

    const mohawk =
      hair.includes(
        "moicano"
      );

    if (mohawk) {
      return `
        <path
          d="
            M61 69
            Q65 32 80 19
            Q95 32 99 69
            Q91 57 80 48
            Q69 57 61 69
            Z
          "
          fill="${palette.hair}"
          stroke="${palette.hairHighlight}"
          stroke-width="2"
        />
      `;
    }

    if (long) {
      return `
        <path
          d="
            M47 70
            Q45 34 80 28
            Q115 34 113 70
            L108 120
            Q98 108 94 89
            Q90 72 80 57
            Q70 72 66 89
            Q62 108 52 120
            Z
          "
          fill="${palette.hair}"
          stroke="${palette.hairHighlight}"
          stroke-width="2"
        />
      `;
    }

    if (short) {
      return `
        <path
          d="
            M48 68
            Q47 37 80 28
            Q113 37 112 68
            Q100 50 80 51
            Q60 50 48 68
            Z
          "
          fill="${palette.hair}"
          stroke="${palette.hairHighlight}"
          stroke-width="2"
        />
      `;
    }

    return `
      <path
        d="
          M48 68
          Q47 35 80 29
          Q113 35 112 68
          Q100 49 80 50
          Q60 49 48 68
          Z
        "
        fill="${palette.hair}"
        stroke="${palette.hairHighlight}"
        stroke-width="2"
      />
    `;
  }


  /* =========================================================
     ROSTO
     ========================================================= */

  function buildFace(
    state,
    palette,
    visual
  ) {
    const appearance =
      state.appearance ||
      {};

    const female =
      state.gender ===
      "feminino";

    const headWidth =
      visual.isLarge ||
      visual.isColossal
        ? 56
        : visual.isSmall
          ? 44
          : female
            ? 45
            : 50;

    const eyeText =
      normalizeText(
        appearance.eyes
      );

    const narrowEyes =
      eyeText.includes(
        "estreito"
      ) ||
      eyeText.includes(
        "fino"
      );

    const eyeColor =
      eyeText.includes(
        "azul"
      )
        ? "#789cb9"
        : eyeText.includes(
              "verde"
            )
          ? "#70906c"
          : eyeText.includes(
                "vermelho"
              )
            ? "#9f5e56"
            : "#302c29";


    const ears =
      visual.isAnimalha
        ? `
          <path
            d="
              M53 69
              L34 49
              L48 45
              L60 63
              Z
            "
            class="character-racial"
          />

          <path
            d="
              M107 69
              L126 49
              L112 45
              L100 63
              Z
            "
            class="character-racial"
          />
        `
        : "";


    const horns =
      visual.isOrc ||
      visual.isTroll ||
      visual.isColossus
        ? `
          <path
            d="
              M61 55
              Q45 41 48 25
              Q60 31 69 52
              Z
            "
            class="character-racial"
          />

          <path
            d="
              M99 55
              Q115 41 112 25
              Q100 31 91 52
              Z
            "
            class="character-racial"
          />
        `
        : "";


    const hair =
      getHairGeometry(
        appearance,
        palette
      );


    const eyeY =
      71;

    const eyeRx =
      narrowEyes
        ? 5
        : 3.6;

    return `
      <g
        class="character-head"
      >

        <ellipse
          cx="80"
          cy="70"
          rx="${headWidth / 2}"
          ry="32"
          fill="${palette.skin}"
          stroke="${palette.skinShadow}"
          stroke-width="2"
        />

        ${ears}

        ${horns}

        ${hair}

        <ellipse
          cx="65"
          cy="${eyeY}"
          rx="${eyeRx}"
          ry="2.5"
          fill="${eyeColor}"
        />

        <ellipse
          cx="95"
          cy="${eyeY}"
          rx="${eyeRx}"
          ry="2.5"
          fill="${eyeColor}"
        />

        <path
          d="M79 73 L76 83 L82 83"
          class="character-face-line"
        />

        <path
          d="
            M72 90
            Q80 ${female ? 94 : 92}
            88 90
          "
          class="character-face-line"
        />

      </g>
    `;
  }


  /* =========================================================
     ASAS
     ========================================================= */

  function buildWings(
    visual
  ) {
    if (
      !visual.hasWings
    ) {
      return "";
    }

    return `
      <g
        class="character-wings"
      >

        <path
          d="
            M55 117
            C29 103 14 83 20 63
            C40 66 57 84 64 106
            Z
          "
          fill="rgba(225,225,218,.30)"
          stroke="currentColor"
          stroke-width="3"
        />

        <path
          d="
            M105 117
            C131 103 146 83 140 63
            C120 66 103 84 96 106
            Z
          "
          fill="rgba(225,225,218,.30)"
          stroke="currentColor"
          stroke-width="3"
        />

        <path
          d="
            M26 70
            C40 75 50 87 57 101

            M136 70
            C122 75 112 87 105 101
          "
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          opacity=".55"
        />

      </g>
    `;
  }


  /* =========================================================
     CAUDA
     ========================================================= */

  function buildTail(
    visual
  ) {
    if (
      !visual.isAnimalha
    ) {
      return "";
    }

    const animal =
      visual.animal;

    let tailShape = `
      M127 181
      C154 174 163 191 151 204
      C143 213 132 209 138 201
      C144 194 143 189 130 192
    `;

    if (
      animal ===
      "raposa"
    ) {
      tailShape = `
        M125 181
        C158 169 169 200 144 214
        C131 221 124 209 139 201
        C151 195 145 187 129 194
      `;
    }

    if (
      animal ===
      "gato"
    ) {
      tailShape = `
        M125 184
        C149 165 164 184 151 199
        C142 209 130 204 140 197
      `;
    }

    if (
      animal ===
      "cobra"
    ) {
      tailShape = `
        M124 180
        C154 177 159 194 145 202
        C134 208 132 217 149 221
      `;
    }

    return `
      <path
        d="${tailShape}"
        class="character-racial character-tail"
        fill="none"
        stroke="currentColor"
        stroke-width="9"
        stroke-linecap="round"
      />
    `;
  }


  /* =========================================================
     BRAÇOS
     ========================================================= */

  function buildArms(
    visual
  ) {
    const broad =
      visual.isLarge ||
      visual.isColossal;

    const armWidth =
      broad
        ? 17
        : 14;

    return `
      <path
        d="
          M${58 - armWidth}
          116
          Q${36 - armWidth}
          137
          ${48 - armWidth}
          169
        "
        class="character-limb"
        stroke-width="${armWidth}"
      />

      <path
        d="
          M${102 + armWidth}
          116
          Q${124 + armWidth}
          137
          ${112 + armWidth}
          169
        "
        class="character-limb"
        stroke-width="${armWidth}"
      />
    `;
  }


  /* =========================================================
     CORPO
     ========================================================= */

  function buildBody(
    state,
    palette,
    visual,
    body
  ) {
    const female =
      state.gender ===
      "feminino";

    const width =
      visual.isColossal
        ? 77
        : visual.isLarge
          ? 70
          : visual.isDwarf
            ? 58
            : female
              ? 58
              : 64;


    const clothing =
      normalizeText(
        state.appearance
          ?.clothing
      );

    const armor =
      clothing.includes(
        "armadura"
      );

    const robe =
      clothing.includes(
        "manto"
      ) ||
      clothing.includes(
        "vestido"
      );

    const bodyColor =
      armor
        ? "#383632"
        : robe
          ? "#292724"
          : "url(#character-clothes)";


    return `
      <g
        class="character-body"
      >

        <path
          d="
            M${80 - width / 2}
            105

            Q${80 - width / 2 - 8}
            134
            ${80 - width / 2 + 4}
            177

            Q80
            196
            ${80 + width / 2 - 4}
            177

            Q${80 + width / 2 + 8}
            134
            ${80 + width / 2}
            105

            Q80
            92
            ${80 - width / 2}
            105

            Z
          "
          fill="${bodyColor}"
          stroke="#11100e"
          stroke-width="2"
        />

        ${robe
          ? `
            <path
              d="
                M56 111
                Q80 101
                104 111
                L116 210
                Q80 224
                44 210
                Z
              "
              fill="#26231f"
              stroke="#141311"
              stroke-width="2"
            />
          `
          : ""
        }

        ${buildArms(
          visual
        )}

        <path
          d="
            M${63}
            181
            L${58}
            264

            Q${64}
            270
            ${73}
            265

            L${79}
            187
          "
          class="character-leg"
        />

        <path
          d="
            M${97}
            181
            L${102}
            264

            Q${96}
            270
            ${87}
            265

            L${81}
            187
          "
          class="character-leg"
        />

        <path
          d="
            M53 263
            L77 263
            L77 273
            L50 273
            Z
          "
          class="character-foot"
        />

        <path
          d="
            M83 263
            L107 263
            L110 273
            L83 273
            Z
          "
          class="character-foot"
        />

      </g>
    `;
  }


  /* =========================================================
     CICATRIZES
     ========================================================= */

  function buildScars(
    appearance
  ) {
    const scars =
      normalizeText(
        appearance.scars
      );

    if (
      !scars
    ) {
      return "";
    }

    return `
      <g
        class="character-scars"
        fill="none"
        stroke="#684941"
        stroke-width="2"
        stroke-linecap="round"
      >

        <path
          d="
            M52 77
            L66 91
          "
        />

        <path
          d="
            M55 74
            L69 88
          "
        />

      </g>
    `;
  }


  /* =========================================================
     TATUAGENS
     ========================================================= */

  function buildTattoos(
    appearance
  ) {
    const tattoos =
      normalizeText(
        appearance.tattoos
      );

    if (
      !tattoos
    ) {
      return "";
    }

    return `
      <g
        class="character-tattoos"
        fill="none"
        stroke="#4a3b35"
        stroke-width="2"
        opacity=".9"
      >

        <path
          d="
            M51 123
            Q61 133
            55 148

            M55 129
            L63 136

            M109 123
            Q99 133
            105 148

            M105 129
            L97 136
          "
        />

      </g>
    `;
  }


  /* =========================================================
     DETALHES RACIAIS
     ========================================================= */

  function buildRacialDetails(
    visual
  ) {
    if (
      visual.isDwarf
    ) {
      return `
        <path
          d="
            M55 88
            Q80 108
            105 88
          "
          class="character-racial-detail"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          opacity=".65"
        />
      `;
    }

    if (
      visual.isOrc
    ) {
      return `
        <path
          d="
            M61 93
            L68 99
            M99 93
            L92 99
          "
          class="character-racial-detail"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
      `;
    }

    if (
      visual.isFairy
    ) {
      return `
        <circle
          cx="43"
          cy="111"
          r="4"
          fill="currentColor"
          opacity=".50"
        />

        <circle
          cx="117"
          cy="111"
          r="4"
          fill="currentColor"
          opacity=".50"
        />
      `;
    }

    return "";
  }


  /* =========================================================
     SVG COMPLETO
     ========================================================= */

  function buildSvg(
    state
  ) {
    const appearance =
      state.appearance ||
      {};

    const visual =
      getRaceVisualData(
        state
      );

    const palette =
      getPalette(
        appearance
      );

    const body =
      calculateBody(
        state
      );


    const transform =
      `translate(
        ${90 - 90 * body.width}
        ${body.height >= 285 ? 3 : 8}
      ) scale(
        ${body.width}
        ${body.height / 285}
      )`;


    return `
      <svg
        class="${CONFIG.svgClass}"
        viewBox="${CONFIG.viewBox}"
        role="img"
        aria-label="Pré-visualização do personagem"
        data-race="${escapeHtml(
          state.race || ""
        )}"
        data-animalha="${escapeHtml(
          state.animalha || ""
        )}"
        data-gender="${escapeHtml(
          state.gender || ""
        )}"
      >

        <defs>

          <linearGradient
            id="character-clothes"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >

            <stop
              offset="0%"
              stop-color="#514c45"
            />

            <stop
              offset="100%"
              stop-color="#1e1c19"
            />

          </linearGradient>

        </defs>


        <g
          transform="${transform}"
        >


          <!-- =========================================
               ASAS
               ========================================= -->

          ${buildWings(
            visual
          )}


          <!-- =========================================
               SOMBRA
               ========================================= -->

          <ellipse
            cx="90"
            cy="308"
            rx="43"
            ry="8"
            class="character-shadow"
          />


          <!-- =========================================
               CAUDA
               ========================================= -->

          ${buildTail(
            visual
          )}


          <!-- =========================================
               CORPO
               ========================================= -->

          ${buildBody(
            state,
            palette,
            visual,
            body
          )}


          <!-- =========================================
               ROSTO
               ========================================= -->

          ${buildFace(
            state,
            palette,
            visual
          )}


          <!-- =========================================
               CICATRIZES
               ========================================= -->

          ${buildScars(
            appearance
          )}


          <!-- =========================================
               TATUAGENS
               ========================================= -->

          ${buildTattoos(
            appearance
          )}


          <!-- =========================================
               DETALHES RACIAIS
               ========================================= -->

          ${buildRacialDetails(
            visual
          )}

        </g>

      </svg>
    `;
  }


  /* =========================================================
     RENDER
     ========================================================= */

  function render(
    state = getState()
  ) {
    if (!state) {
      return false;
    }

    const container =
      document.querySelector(
        CONFIG.selector
      );

    if (!container) {
      return false;
    }


    const key =
      JSON.stringify({
        race:
          state.race,

        animalha:
          state.animalha,

        gender:
          state.gender,

        height:
          state.appearance
            ?.height,

        hair:
          state.appearance
            ?.hair,

        eyes:
          state.appearance
            ?.eyes,

        skin:
          state.appearance
            ?.skin,

        clothing:
          state.appearance
            ?.clothing,

        scars:
          state.appearance
            ?.scars,

        tattoos:
          state.appearance
            ?.tattoos
      });


    if (
      key ===
      lastRenderKey
    ) {
      return true;
    }


    lastRenderKey =
      key;


    container.innerHTML =
      buildSvg(
        state
      );


    const race =
      state.raceData ||
      {};

    const body =
      calculateBody(
        state
      );


    container.dataset.race =
      state.race ||
      "";

    container.dataset.animalha =
      state.animalha ||
      "";

    container.dataset.gender =
      state.gender ||
      "";

    container.dataset.size =
      race.size ||
      "medio";

    container.style.setProperty(
      "--character-scale",
      String(
        body.width
      )
    );

    container.style.setProperty(
      "--character-height",
      `${body.height}px`
    );


    container.classList.toggle(
      "has-wings",
      Boolean(
        race.flight
      )
    );


    container.classList.toggle(
      "is-animalha",
      state.race ===
        "animalha"
    );


    container.classList.toggle(
      "is-female",
      state.gender ===
        "feminino"
    );


    return true;
  }


  /* =========================================================
     REFRESH
     ========================================================= */

  function refresh() {
    lastRenderKey = "";
    return render();
  }


  /* =========================================================
     EVENTOS
     ========================================================= */

  function bindEvents() {

    window.addEventListener(
      "aerion:ficha:ready",
      () => {
        refresh();
      }
    );


    window.addEventListener(
      "aerion:ficha:complete",
      () => {
        refresh();
      }
    );


    document.addEventListener(
      "input",
      event => {

        const target =
          event.target;

        if (
          target?.id ===
            "heightRange" ||
          target?.id ===
            "hair" ||
          target?.id ===
            "eyes" ||
          target?.id ===
            "skin" ||
          target?.id ===
            "clothing" ||
          target?.id ===
            "scars" ||
          target?.id ===
            "tattoos" ||
          target?.id ===
            "physicalNotes"
        ) {
          requestAnimationFrame(
            () => {
              refresh();
            }
          );
        }
      }
    );


    document.addEventListener(
      "change",
      event => {

        const target =
          event.target;

        if (
          target?.name ===
            "gender" ||
          target?.id ===
            "animalhaVariant"
        ) {
          requestAnimationFrame(
            () => {
              refresh();
            }
          );
        }
      }
    );
  }


  /* =========================================================
     API
     ========================================================= */

  window.AERIONPersonagemRender =
    Object.freeze({

      render,

      refresh,

      buildSvg
    });


  /* =========================================================
     START
     ========================================================= */

  function init() {
    bindEvents();
    refresh();

    console.info(
      "[AERION] personagem-render.js inicializado."
    );
  }


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