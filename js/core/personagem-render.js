/* =========================================================
   AERION — PERSONAGEM RENDER
   js/core/personagem-render.js

   MOTOR VISUAL 2D DO CRIADOR DE PERSONAGEM

   Depende de:
     window.AERIONPersonagemAssets
     window.AERIONFicha

   Responsável por:
   - Ler estado da ficha
   - Aplicar restrições raciais
   - Aplicar Animalha
   - Montar personagem em camadas
   - Atualizar altura
   - Atualizar proporções
   - Atualizar pele / pelagem
   - Atualizar cabelo
   - Atualizar olhos
   - Atualizar roupas
   - Atualizar acessórios
   - Atualizar armas
   - Atualizar asas / cauda
   - Atualizar cicatrizes
   - Atualizar tatuagens
   - Atualizar marcas

   NÃO responsável por:
   - dados
   - atributos
   - regras de combate
   - regras de classe
   - salvar a ficha

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIG
     ========================================================= */

  const CONFIG = Object.freeze({
    rootSelector:
      "#appearanceFigure",

    svgWidth:
      360,

    svgHeight:
      620,

    viewBox:
      "0 0 360 620",

    updateEvent:
      "aerion:personagem:updated"
  });


  /* =========================================================
     ESTADO
     ========================================================= */

  let root = null;

  let currentState = null;

  let currentCharacter = null;

  let lastRenderHash = "";


  /* =========================================================
     ASSETS
     ========================================================= */

  function getAssets() {
    return (
      window.AERIONPersonagemAssets ||
      null
    );
  }


  function getFicha() {
    return (
      window.AERIONFicha ||
      null
    );
  }


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

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


  function num(
    value,
    fallback = 0
  ) {
    const result =
      Number(
        value
      );

    return Number.isFinite(
      result
    )
      ? result
      : fallback;
  }


  function safeText(
    value
  ) {
    return String(
      value ?? ""
    )
      .trim();
  }


  function normalize(
    value
  ) {
    return safeText(
      value
    )
      .toLowerCase()
      .normalize(
        "NFD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );
  }


  function escapeHtml(
    value
  ) {
    return safeText(
      value
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
        "&#039;"
      );
  }


  function hashState(
    state
  ) {
    try {
      return JSON.stringify(
        {
          race:
            state?.race,

          animalha:
            state?.animalha,

          gender:
            state?.gender,

          appearance:
            state?.appearance,

          raceData:
            state?.raceData,

          combat:
            state?.combat
        }
      );
    } catch {
      return "";
    }
  }


  /* =========================================================
     OBTENÇÃO DO ESTADO
     ========================================================= */

  function readState() {
    const ficha =
      getFicha();

    if (
      !ficha ||
      typeof
        ficha.getState !==
        "function"
    ) {
      return null;
    }

    return ficha.getState();
  }


  /* =========================================================
     DADOS RACIAIS
     ========================================================= */

  function getRaceData(
    state
  ) {
    if (
      !state
    ) {
      return null;
    }

    return (
      state.raceData ||
      null
    );
  }


  function getRaceRules(
    state
  ) {
    const assets =
      getAssets();

    if (
      !assets
    ) {
      return null;
    }

    return (
      assets.raceRules?.[
        state?.race ||
        ""
      ] ||
      null
    );
  }


  function getAnimalData(
    state
  ) {
    const assets =
      getAssets();

    if (
      !assets
    ) {
      return null;
    }

    const animalId =
      state?.animalha ||
      "";

    return (
      assets.animalhaAnimals?.[
        animalId
      ] ||
      null
    );
  }


  /* =========================================================
     DIMENSÕES
     ========================================================= */

  function getHeightData(
    state
  ) {
    const race =
      getRaceData(
        state
      );

    const min =
      num(
        race?.height?.min,
        140
      );

    const max =
      num(
        race?.height?.max,
        200
      );

    let current =
      num(
        state?.appearance
          ?.height,
        (
          min +
          max
        ) / 2
      );

    current =
      clamp(
        current,
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

    return {
      min,
      max,
      current,
      normalized
    };
  }


  function getBodyProfile(
    state
  ) {
    const race =
      getRaceData(
        state
      );

    const rules =
      getRaceRules(
        state
      );

    const animal =
      getAnimalData(
        state
      );

    const appearance =
      state?.appearance ||
      {};

    let width =
      1;

    let shoulder =
      1;

    let torso =
      1;

    let arms =
      1;

    let legs =
      1;

    let head =
      1;


    const bodyType =
      normalize(
        appearance.bodyType
      );

    switch (
      bodyType
    ) {
      case "delgado":
      case "slim":
        width *= .88;
        shoulder *= .86;
        break;

      case "atletico":
      case "lean":
        width *= .95;
        shoulder *= .94;
        break;

      case "robusto":
      case "broad":
        width *= 1.12;
        shoulder *= 1.12;
        torso *= 1.08;
        break;

      case "pesado":
      case "heavy":
        width *= 1.20;
        shoulder *= 1.18;
        torso *= 1.14;
        break;

      default:
        break;
    }


    if (
      race?.size ===
      "pequeno"
    ) {
      width *= .92;
      shoulder *= .92;
      head *= 1.02;
    }


    if (
      race?.size ===
      "grande"
    ) {
      width *= 1.10;
      shoulder *= 1.10;
      torso *= 1.08;
    }


    if (
      race?.size ===
      "colossal"
    ) {
      width *= 1.22;
      shoulder *= 1.24;
      torso *= 1.15;
      arms *= 1.08;
      legs *= 1.08;
    }


    if (
      animal?.body ===
      "slim"
    ) {
      width *= .93;
    }


    if (
      animal?.body ===
      "lean"
    ) {
      width *= .97;
    }


    if (
      animal?.body ===
      "broad"
    ) {
      width *= 1.08;
      shoulder *= 1.08;
    }


    if (
      animal?.body ===
      "heavy"
    ) {
      width *= 1.15;
      shoulder *= 1.12;
    }


    width =
      num(
        appearance.width,
        width
      );

    shoulder =
      num(
        appearance.shoulders,
        shoulder
      );

    torso =
      num(
        appearance.torso,
        torso
      );

    arms =
      num(
        appearance.arms,
        arms
      );

    legs =
      num(
        appearance.legs,
        legs
      );

    head =
      num(
        appearance.head,
        head
      );


    return {
      width:
        clamp(
          width,
          .78,
          1.35
        ),

      shoulder:
        clamp(
          shoulder,
          .78,
          1.35
        ),

      torso:
        clamp(
          torso,
          .80,
          1.30
        ),

      arms:
        clamp(
          arms,
          .82,
          1.25
        ),

      legs:
        clamp(
          legs,
          .82,
          1.25
        ),

      head:
        clamp(
          head,
          .82,
          1.25
        ),

      raceRules:
        rules
    };
  }


  /* =========================================================
     PALETA PERMITIDA
     ========================================================= */

  function getAllowedSkinPalette(
    state
  ) {
    const assets =
      getAssets();

    if (
      !assets
    ) {
      return null;
    }

    const raceId =
      state?.race ||
      "humano";

    const paletteIds =
      assets.skinRestrictions?.[
        raceId
      ] ||
      [
        "humana"
      ];

    const primaryPalette =
      paletteIds[0];

    return (
      assets.skinPalettes?.[
        primaryPalette
      ] ||
      null
    );
  }


  function getCurrentSkinColor(
    state
  ) {
    const palette =
      getAllowedSkinPalette(
        state
      );

    if (
      !palette ||
      !Array.isArray(
        palette.colors
      ) ||
      !palette.colors.length
    ) {
      return "#b99f8b";
    }

    const appearance =
      state?.appearance ||
      {};

    const selected =
      appearance.skinVariant;


    if (
      selected &&
      palette.colors.includes(
        selected
      )
    ) {
      return selected;
    }


    const skinText =
      normalize(
        appearance.skin
      );


    if (
      skinText.includes(
        "escura"
      ) ||
      skinText.includes(
        "negra"
      )
    ) {
      return (
        palette.colors[
          palette.colors.length -
            2
        ] ||
        palette.colors[0]
      );
    }


    if (
      skinText.includes(
        "clara"
      )
    ) {
      return (
        palette.colors[1] ||
        palette.colors[0]
      );
    }


    return (
      palette.colors[
        Math.floor(
          palette.colors.length /
            2
        )
      ] ||
      palette.colors[0]
    );
  }


  function getHairColor(
    state
  ) {
    const assets =
      getAssets();

    const colors =
      assets?.hairColors ||
      [];

    const appearance =
      state?.appearance ||
      {};

    const text =
      normalize(
        appearance.hair
      );


    const found =
      colors.find(
        entry =>
          text.includes(
            normalize(
              entry.name
            )
          )
      );


    return (
      found?.colors?.[0] ||
      "#27211c"
    );
  }


  function getEyeColor(
    state
  ) {
    const assets =
      getAssets();

    const colors =
      assets?.eyeColors ||
      [];

    const text =
      normalize(
        state?.appearance
          ?.eyes
      );


    const found =
      colors.find(
        entry =>
          text.includes(
            normalize(
              entry.name
            )
          )
      );


    return (
      found?.colors?.[0] ||
      "#302c29"
    );
  }


  function getAnimalColor(
    state
  ) {
    const animal =
      getAnimalData(
        state
      );

    const appearance =
      state?.appearance ||
      {};

    const chosen =
      safeText(
        appearance
          .furColor
      );


    if (
      chosen
    ) {
      return chosen;
    }


    if (
      animal?.fur?.length
    ) {
      return animal.fur[0];
    }


    if (
      animal?.feathers?.length
    ) {
      return animal.feathers[0];
    }


    if (
      animal?.scales?.length
    ) {
      return animal.scales[0];
    }


    if (
      animal?.skin?.length
    ) {
      return animal.skin[0];
    }


    return getCurrentSkinColor(
      state
    );
  }


  /* =========================================================
     SVG BASE
     ========================================================= */

  function createSvg(
    state
  ) {
    const svg =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );

    svg.setAttribute(
      "viewBox",
      CONFIG.viewBox
    );

    svg.setAttribute(
      "width",
      String(
        CONFIG.svgWidth
      )
    );

    svg.setAttribute(
      "height",
      String(
        CONFIG.svgHeight
      )

    );

    svg.classList.add(
      "aerion-character-svg"
    );

    svg.setAttribute(
      "role",
      "img"
    );

    svg.setAttribute(
      "aria-label",
      "Personagem em pré-visualização"
    );

    svg.dataset.race =
      state?.race ||
      "";

    svg.dataset.animalha =
      state?.animalha ||
      "";

    return svg;
  }


  function svgElement(
    name,
    attributes = {}
  ) {
    const element =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        name
      );

    Object.entries(
      attributes
    ).forEach(
      ([
        key,
        value
      ]) => {

        if (
          value !==
            undefined &&
          value !==
            null
        ) {
          element.setAttribute(
            key,
            String(
              value
            )
          );
        }
      }
    );

    return element;
  }


  /* =========================================================
     DEFINIÇÕES SVG
     ========================================================= */

  function addDefs(
    svg
  ) {
    const defs =
      svgElement(
        "defs"
      );


    const skinGradient =
      svgElement(
        "linearGradient",
        {
          id:
            "aerion-skin-gradient",

          x1:
            "0",

          y1:
            "0",

          x2:
            "1",

          y2:
            "1"
        }
      );


    skinGradient.append(
      svgElement(
        "stop",
        {
          offset:
            "0%",

          "stop-color":
            "var(--character-skin)"
        }
      )
    );


    skinGradient.append(
      svgElement(
        "stop",
        {
          offset:
            "100%",

          "stop-color":
            "var(--character-skin-shadow)"
        }
      )
    );


    defs.append(
      skinGradient
    );


    const clothesGradient =
      svgElement(
        "linearGradient",
        {
          id:
            "aerion-clothes-gradient",

          x1:
            "0",

          y1:
            "0",

          x2:
            "0",

          y2:
            "1"
        }
      );


    clothesGradient.append(
      svgElement(
        "stop",
        {
          offset:
            "0%",

          "stop-color":
            "var(--character-clothes)"
        }
      )
    );


    clothesGradient.append(
      svgElement(
        "stop",
        {
          offset:
            "100%",

          "stop-color":
            "var(--character-clothes-shadow)"
        }
      )
    );


    defs.append(
      clothesGradient
    );


    svg.append(
      defs
    );
  }


  /* =========================================================
     SOMBRA
     ========================================================= */

  function buildShadow() {
    return svgElement(
      "ellipse",
      {
        cx:
          "180",

        cy:
          "575",

        rx:
          "82",

        ry:
          "16",

        class:
          "character-shadow"
      }
    );
  }


  /* =========================================================
     ALTURA
     ========================================================= */

  function calculateGeometry(
    state
  ) {
    const height =
      getHeightData(
        state
      );

    const body =
      getBodyProfile(
        state
      );

    const totalHeight =
      470 +
      height.normalized *
        100;

    const headScale =
      body.head;


    const headWidth =
      52 *
      headScale *
      (
        state.gender ===
        "feminino"
          ? .97
          : 1
      );


    const torsoWidth =
      112 *
      body.width;


    const shoulderWidth =
      154 *
      body.shoulder;


    const torsoHeight =
      155 *
      body.torso;


    const armLength =
      145 *
      body.arms;


    const legLength =
      175 *
      body.legs;


    return {
      ...height,

      body,

      totalHeight,

      headWidth,

      torsoWidth,

      shoulderWidth,

      torsoHeight,

      armLength,

      legLength
    };
  }


  /* =========================================================
     PERNAS
     ========================================================= */

  function buildLegs(
    geometry
  ) {
    const {
      legLength
    } =
      geometry;


    const left =
      svgElement(
        "path",
        {
          d:
            `
              M154 362
              C152 397 151 452 149 515
              Q150 530 163 532
              L179 532
              Q184 529 182 515
              L180 364
              Z
            `,

          class:
            "character-leg character-leg-left"
        }
      );


    const right =
      svgElement(
        "path",
        {
          d:
            `
              M206 362
              C208 397 209 452 211 515
              Q210 530 197 532
              L181 532
              Q176 529 178 515
              L180 364
              Z
            `,

          class:
            "character-leg character-leg-right"
        }
      );


    left.style.strokeWidth =
      `${Math.max(
        1,
        legLength / 105
      )}px`;


    right.style.strokeWidth =
      `${Math.max(
        1,
        legLength / 105
      )}px`;


    return [
      left,
      right
    ];
  }


  /* =========================================================
     BRAÇOS
     ========================================================= */

  function buildArms(
    geometry
  ) {
    const arms = [];


    const left =
      svgElement(
        "path",
        {
          d:
            `
              M112 208
              C91 237 85 292 96 337
            `,

          class:
            "character-arm character-arm-left"
        }
      );


    const right =
      svgElement(
        "path",
        {
          d:
            `
              M248 208
              C269 237 275 292 264 337
            `,

          class:
            "character-arm character-arm-right"
        }
      );


    const stroke =
      22 *
      geometry.body.arms;


    left.style.strokeWidth =
      `${stroke}px`;

    right.style.strokeWidth =
      `${stroke}px`;


    arms.push(
      left,
      right
    );


    return arms;
  }


  /* =========================================================
     CORPO
     ========================================================= */

  function buildBody(
    geometry
  ) {
    const {
      torsoWidth,
      torsoHeight,
      shoulderWidth
    } =
      geometry;


    const top =
      186;

    const bottom =
      top +
      torsoHeight;


    return svgElement(
      "path",
      {
        d:
          `
            M${180 - torsoWidth / 2}
            ${top + 18}

            Q180
            ${top - 12}
            ${180 + torsoWidth / 2}
            ${top + 18}

            Q
            ${180 + shoulderWidth / 2}
            ${top + 38}
            ${180 + torsoWidth / 2 - 10}
            ${bottom - 18}

            Q180
            ${bottom + 12}
            ${180 - torsoWidth / 2 + 10}
            ${bottom - 18}

            Q
            ${180 - shoulderWidth / 2}
            ${top + 38}
            ${180 - torsoWidth / 2}
            ${top + 18}

            Z
          `,

        class:
          "character-body"
      }
    );
  }


  /* =========================================================
     CABEÇA
     ========================================================= */

  function buildHead(
    state,
    geometry
  ) {
    const {
      headWidth
    } =
      geometry;


    const head =
      svgElement(
        "ellipse",
        {
          cx:
            "180",

          cy:
            "133",

          rx:
            headWidth / 2,

          ry:
            headWidth *
            .62,

          class:
            "character-head"
        }
      );


    return head;
  }


  /* =========================================================
     PESCOÇO
     ========================================================= */

  function buildNeck(
    geometry
  ) {
    const neckWidth =
      geometry.headWidth *
      .45;


    return svgElement(
      "path",
      {
        d:
          `
            M
            ${180 - neckWidth / 2}
            160

            L
            ${180 - neckWidth / 2}
            200

            L
            ${180 + neckWidth / 2}
            200

            L
            ${180 + neckWidth / 2}
            160

            Z
          `,

        class:
          "character-neck"
      }
    );
  }


  /* =========================================================
     ROSTO
     ========================================================= */

  function buildFace(
    state,
    geometry
  ) {
    const group =
      svgElement(
        "g",
        {
          class:
            "character-face"
        }
      );


    const eyeColor =
      getEyeColor(
        state
      );


    const eyeShape =
      normalize(
        state?.appearance
          ?.eyeShape ||
        state?.appearance
          ?.eyes
      );


    const eyeRy =
      eyeShape.includes(
        "grande"
      ) ||
      eyeShape.includes(
        "large"
      )
        ? 5
        : 3.5;


    const eyeY =
      131;


    const leftEye =
      svgElement(
        "ellipse",
        {
          cx:
            "166",

          cy:
            String(
              eyeY
            ),

          rx:
            "4.5",

          ry:
            String(
              eyeRy
            ),

          fill:
            eyeColor,

          class:
            "character-eye"
        }
      );


    const rightEye =
      svgElement(
        "ellipse",
        {
          cx:
            "194",

          cy:
            String(
              eyeY
            ),

          rx:
            "4.5",

          ry:
            String(
              eyeRy
            ),

          fill:
            eyeColor,

          class:
            "character-eye"
        }
      );


    const nose =
      svgElement(
        "path",
        {
          d:
            "M180 135 L175 151 L182 151",

          class:
            "character-face-line"
        }
      );


    const mouth =
      svgElement(
        "path",
        {
          d:
            "M171 160 Q180 165 189 160",

          class:
            "character-mouth"
        }
      );


    group.append(
      leftEye,
      rightEye,
      nose,
      mouth
    );


    return group;
  }


  /* =========================================================
     ORELHAS
     ========================================================= */

  function buildEars(
    state
  ) {
    const raceId =
      normalize(
        state?.race
      );

    const group =
      svgElement(
        "g",
        {
          class:
            "character-ears"
        }
      );


    if (
      raceId ===
      "elfo"
    ) {
      group.append(
        svgElement(
          "path",
          {
            d:
              "M157 133 L113 104 L157 153 Z",

            class:
              "character-ear"
          }
        ),

        svgElement(
          "path",
          {
            d:
              "M203 133 L247 104 L203 153 Z",

            class:
              "character-ear"
          }
        )
      );

      return group;
    }


    const animal =
      getAnimalData(
        state
      );


    if (
      state?.race ===
      "animalha" &&
      animal?.ears
    ) {
      switch (
        normalize(
          animal.ears
        )
      ) {
        case "feline":
        case "canine":
        case "large":

          group.append(
            svgElement(
              "path",
              {
                d:
                  "M158 116 L133 79 L167 92 L174 120 Z",

                class:
                  "character-animal-ear"
              }
            ),

            svgElement(
              "path",
              {
                d:
                  "M202 116 L227 79 L193 92 L186 120 Z",

                class:
                  "character-animal-ear"
              }
            )
          );

          break;

        case "bird":

          group.append(
            svgElement(
              "path",
              {
                d:
                  "M158 125 L121 111 L159 143 Z",

                class:
                  "character-animal-ear"
              }
            ),

            svgElement(
              "path",
              {
                d:
                  "M202 125 L239 111 L201 143 Z",

                class:
                  "character-animal-ear"
              }
            )
          );

          break;

        default:
          break;
      }
    }


    return group;
  }


  /* =========================================================
     CABELO
     ========================================================= */

  function buildHair(
    state
  ) {
    const hair =
      normalize(
        state?.appearance
          ?.hair
      );


    const color =
      getHairColor(
        state
      );


    const group =
      svgElement(
        "g",
        {
          class:
            "character-hair"
        }
      );


    let path =
      `
        M137 130
        Q138 77 180 68
        Q222 77 223 130
        Q211 99 180 100
        Q149 99 137 130
        Z
      `;


    if (
      hair.includes(
        "longo"
      ) ||
      hair.includes(
        "long"
      )
    ) {
      path =
        `
          M136 131
          Q132 77 180 67
          Q228 77 224 131
          L213 213
          Q198 177 180 110
          Q162 177 147 213
          Z
        `;
    }


    if (
      hair.includes(
        "moicano"
      ) ||
      hair.includes(
        "mohawk"
      )
    ) {
      path =
        `
          M157 105
          Q159 60 180 37
          Q201 60 203 105
          Q189 91 180 75
          Q171 91 157 105
          Z
        `;
    }


    if (
      hair.includes(
        "tranca"
      ) ||
      hair.includes(
        "braid"
      )
    ) {
      path =
        `
          M136 131
          Q139 79 180 68
          Q221 79 224 131
          L216 218
          Q196 190 180 108
          Q164 190 144 218
          Z
        `;
    }


    group.append(
      svgElement(
        "path",
        {
          d:
            path,

          fill:
            color,

          class:
            "character-hair-shape"
        }
      )
    );


    return group;
  }


  /* =========================================================
     BARBA
     ========================================================= */

  function buildFacialHair(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.facialHair
      );


    if (
      !value ||
      value ===
        "nenhum" ||
      value ===
        "none"
    ) {
      return null;
    }


    const color =
      getHairColor(
        state
      );


    const group =
      svgElement(
        "g",
        {
          class:
            "character-facial-hair"
        }
      );


    group.append(
      svgElement(
        "path",
        {
          d:
            `
              M162 155
              Q180 177 198 155
              Q193 188 180 194
              Q167 188 162 155
              Z
            `,

          fill:
            color,

          class:
            "facial-hair-shape"
        }
      )
    );


    return group;
  }


  /* =========================================================
     ASAS
     ========================================================= */

  function buildWings(
    state
  ) {
    const race =
      getRaceData(
        state
      );

    if (
      !race?.flight
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-wings"
        }
      );


    group.append(
      svgElement(
        "path",
        {
          d:
            `
              M150 210
              C105 198 66 165 53 112
              C99 122 139 151 166 194
              Z
            `,

          class:
            "character-wing character-wing-left"
        }
      ),

      svgElement(
        "path",
        {
          d:
            `
              M210 210
              C255 198 294 165 307 112
              C261 122 221 151 194 194
              Z
            `,

          class:
            "character-wing character-wing-right"
        }
      )
    );


    return group;
  }


  /* =========================================================
     CAUDA
     ========================================================= */

  function buildTail(
    state
  ) {
    const race =
      getRaceData(
        state
      );

    const animal =
      getAnimalData(
        state
      );


    let type =
      animal?.tail ||
      race?.tail ||
      "";


    type =
      normalize(
        type
      );


    if (
      !type ||
      type ===
        "none"
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-tail"
        }
      );


    let path =
      `
        M245 350
        C286 346 311 372 297 394
        C288 408 270 407 262 397
      `;


    if (
      type ===
      "fox"
    ) {
      path =
        `
          M245 350
          C302 332 323 379 292 405
          C273 421 257 410 269 398
          C284 383 278 363 250 372
        `;
    }


    if (
      type ===
      "wolf"
    ) {
      path =
        `
          M244 350
          C293 339 317 369 296 395
          C282 412 268 407 274 394
        `;
    }


    if (
      type ===
      "feline"
    ) {
      path =
        `
          M244 350
          C282 329 306 349 294 376
          C288 390 274 392 268 382
        `;
    }


    group.append(
      svgElement(
        "path",
        {
          d:
            path,

          class:
            "character-tail-shape"
        }
      )
    );


    return group;
  }


  /* =========================================================
     ROUPAS
     ========================================================= */

  function getClothingColor(
    state
  ) {
    const text =
      normalize(
        state?.appearance
          ?.clothing
      );


    if (
      text.includes(
        "branco"
      )
    ) {
      return "#ddd4c5";
    }


    if (
      text.includes(
        "vermelho"
      )
    ) {
      return "#6d3231";
    }


    if (
      text.includes(
        "azul"
      )
    ) {
      return "#344967";
    }


    if (
      text.includes(
        "verde"
      )
    ) {
      return "#42583e";
    }


    return "#4d473f";
  }


  function buildClothing(
    state,
    geometry
  ) {
    const group =
      svgElement(
        "g",
        {
          class:
            "character-clothing"
        }
      );


    const color =
      getClothingColor(
        state
      );


    const chest =
      svgElement(
        "path",
        {
          d:
            `
              M130 214
              Q180 196
              230 214
              L239 347
              Q180 366
              121 347
              Z
            `,

          fill:
            color,

          class:
            "character-clothes-main"
        }
      );


    group.append(
      chest
    );


    return group;
  }


  /* =========================================================
     CAPA
     ========================================================= */

  function buildCape(
    state
  ) {
    const clothing =
      normalize(
        state?.appearance
          ?.clothing
      );


    if (
      !clothing.includes(
        "capa"
      ) &&
      !clothing.includes(
        "cape"
      )
    ) {
      return null;
    }


    return svgElement(
      "path",
      {
        d:
          `
            M130 206
            Q180 190
            230 206
            L275 485
            Q180 520
            85 485
            Z
          `,

        class:
          "character-cape"
      }
    );
  }


  /* =========================================================
     ARMADURA
     ========================================================= */

  function buildArmor(
    state
  ) {
    const clothing =
      normalize(
        state?.appearance
          ?.clothing
      );


    if (
      !clothing.includes(
        "armadura"
      ) &&
      !clothing.includes(
        "armor"
      )
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-armor"
        }
      );


    group.append(
      svgElement(
        "path",
        {
          d:
            `
              M128 214
              L154 199
              L180 213
              L206 199
              L232 214
              L240 348
              Q180 365 120 348
              Z
            `,

          class:
            "character-armor-chest"
        }
      ),

      svgElement(
        "path",
        {
          d:
            "M138 214 L110 238 L96 317",

          class:
            "character-armor-left"
        }
      ),

      svgElement(
        "path",
        {
          d:
            "M222 214 L250 238 L264 317",

          class:
            "character-armor-right"
        }
      )
    );


    return group;
  }


  /* =========================================================
     CINTO
     ========================================================= */

  function buildBelt(
    state
  ) {
    const clothing =
      normalize(
        state?.appearance
          ?.clothing
      );


    if (
      !clothing.includes(
        "cinto"
      ) &&
      !clothing.includes(
        "belt"
      )
    ) {
      return null;
    }


    return svgElement(
      "path",
      {
        d:
          `
            M116 333
            Q180 350
            244 333
            L247 350
            Q180 368
            113 350
            Z
          `,

        class:
          "character-belt"
      }
    );
  }


  /* =========================================================
     ACESSÓRIOS
     ========================================================= */

  function buildNecklace(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.necklace
      );


    if (
      !value ||
      value ===
        "nenhum" ||
      value ===
        "none"
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-necklace"
        }
      );


    group.append(
      svgElement(
        "path",
        {
          d:
            "M156 178 Q180 206 204 178",

          class:
            "necklace-chain"
        }
      ),

      svgElement(
        "circle",
        {
          cx:
            "180",

          cy:
            "201",

          r:
            "7",

          class:
            "necklace-pendant"
        }
      )
    );


    return group;
  }


  function buildGlasses(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.glasses
      );


    if (
      !value ||
      value ===
        "nenhum" ||
      value ===
        "none"
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-glasses"
        }
      );


    group.append(
      svgElement(
        "rect",
        {
          x:
            "153",

          y:
            "122",

          width:
            "22",

          height:
            "17",

          rx:
            "7",

          class:
            "glasses-frame"
        }
      ),

      svgElement(
        "rect",
        {
          x:
            "185",

          y:
            "122",

          width:
            "22",

          height:
            "17",

          rx:
            "7",

          class:
            "glasses-frame"
        }
      ),

      svgElement(
        "path",
        {
          d:
            "M175 130 H185",

          class:
            "glasses-bridge"
        }
      )
    );


    return group;
  }


  /* =========================================================
     CHAPÉU / CAPUZ
     ========================================================= */

  function buildHeadwear(
    state
  ) {
    const appearance =
      state?.appearance ||
      {};


    const text =
      normalize(
        appearance.headwear ||
        appearance.hat ||
        appearance.hood ||
        ""
      );


    if (
      !text ||
      text ===
        "nenhum" ||
      text ===
        "none"
    ) {
      return null;
    }


    if (
      text.includes(
        "capuz"
      ) ||
      text.includes(
        "hood"
      )
    ) {
      return svgElement(
        "path",
        {
          d:
            `
              M132 126
              Q136 63
              180 48
              Q224 63
              228 126
              L212 164
              Q180 146
              148 164
              Z
            `,

          class:
            "character-hood"
        }
      );
    }


    return svgElement(
      "path",
      {
        d:
          `
            M132 94
            Q180 50
            228 94
            L240 105
            Q180 89
            120 105
            Z
          `,

        class:
          "character-hat"
      }
    );
  }


  /* =========================================================
     MÁSCARA
     ========================================================= */

  function buildMask(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.mask
      );


    if (
      !value ||
      value ===
        "nenhuma" ||
      value ===
        "none"
    ) {
      return null;
    }


    return svgElement(
      "path",
      {
        d:
          `
            M149 118
            Q180 104
            211 118
            L209 153
            Q180 173
            151 153
            Z
          `,

        class:
          "character-mask"
      }
    );
  }


  /* =========================================================
     TATUAGENS
     ========================================================= */

  function buildTattoo(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.tattoos
      );


    if (
      !value
    ) {
      return null;
    }


    return svgElement(
      "path",
      {
        d:
          `
            M155 259
            Q180 240
            205 259
            Q180 281
            155 259
            Z
          `,

        class:
          "character-tattoo"
      }
    );
  }


  /* =========================================================
     CICATRIZES
     ========================================================= */

  function buildScars(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.scars
      );


    if (
      !value
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-scars"
        }
      );


    group.append(
      svgElement(
        "path",
        {
          d:
            "M158 145 L170 158",

          class:
            "character-scar"
        }
      ),

      svgElement(
        "path",
        {
          d:
            "M158 158 L170 145",

          class:
            "character-scar"
        }
      )
    );


    return group;
  }


  /* =========================================================
     MARCA DE NASCENÇA
     ========================================================= */

  function buildBirthmark(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.birthmark
      );


    if (
      !value
    ) {
      return null;
    }


    return svgElement(
      "ellipse",
      {
        cx:
          "193",

        cy:
          "144",

        rx:
          "7",

        ry:
          "4",

        class:
          "character-birthmark"
      }
    );
  }


  /* =========================================================
     MANCHAS
     ========================================================= */

  function buildMarkings(
    state
  ) {
    const animal =
      getAnimalData(
        state
      );


    const requested =
      normalize(
        state?.appearance
          ?.markings
      );


    if (
      !requested &&
      !animal?.markings?.length
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-markings"
        }
      );


    if (
      animal?.markings?.includes(
        "spots"
      ) ||
      requested.includes(
        "manchas"
      ) ||
      requested.includes(
        "spots"
      )
    ) {
      [
        [
          155,
          228,
          7
        ],

        [
          208,
          252,
          5
        ],

        [
          150,
          283,
          4
        ],

        [
          211,
          296,
          6
        ]
      ].forEach(
        ([
          cx,
          cy,
          r
        ]) => {

          group.append(
            svgElement(
              "circle",
              {
                cx,
                cy,
                r,

                class:
                  "character-spot"
              }
            )
          );
        }
      );
    }


    if (
      animal?.markings?.includes(
        "stripes"
      ) ||
      requested.includes(
        "listras"
      ) ||
      requested.includes(
        "stripes"
      )
    ) {

      [
        225,
        240,
        255,
        270
      ].forEach(
        y => {

          group.append(
            svgElement(
              "path",
              {
                d:
                  `M140 ${y} L162 ${y - 10}`,

                class:
                  "character-stripe"
              }
            )
          );


          group.append(
            svgElement(
              "path",
              {
                d:
                  `M198 ${y - 10} L220 ${y}`,

                class:
                  "character-stripe"
              }
            )
          );
        }
      );
    }


    return group;
  }


  /* =========================================================
     CHIFRES
     ========================================================= */

  function buildHorns(
    state
  ) {
    const race =
      getRaceData(
        state
      );


    const animal =
      getAnimalData(
        state
      );


    const raceId =
      normalize(
        state?.race
      );


    const enabled =
      race?.horns ||
      animal?.horns ||
      raceId ===
        "orc" ||
      raceId ===
        "troll" ||
      raceId ===
        "colosso";


    if (
      !enabled
    ) {
      return null;
    }


    const group =
      svgElement(
        "g",
        {
          class:
            "character-horns"
        }
      );


    group.append(
      svgElement(
        "path",
        {
          d:
            `
              M158 101
              Q141 76
              151 57
              Q169 78
              170 103
              Z
            `,

          class:
            "character-horn"
        }
      ),

      svgElement(
        "path",
        {
          d:
            `
              M202 101
              Q219 76
              209 57
              Q191 78
              190 103
              Z
            `,

          class:
            "character-horn"
        }
      )
    );


    return group;
  }


  /* =========================================================
     OBJETOS / ARMA
     ========================================================= */

  function buildWeapon(
    state
  ) {
    const value =
      normalize(
        state?.appearance
          ?.weapon
      );


    if (
      !value
    ) {
      return null;
    }


    if (
      value.includes(
        "espada"
      ) ||
      value.includes(
        "sword"
      )
    ) {
      return svgElement(
        "g",
        {
          class:
            "character-weapon"
        }
      );
    }


    return null;
  }


  /* =========================================================
     PERSONAGEM COMPLETO
     ========================================================= */

  function buildCharacter(
    state
  ) {
    const svg =
      createSvg(
        state
      );


    addDefs(
      svg
    );


    const geometry =
      calculateGeometry(
        state
      );


    const skin =
      getCurrentSkinColor(
        state
      );


    const animalColor =
      getAnimalColor(
        state
      );


    const hairColor =
      getHairColor(
        state
      );


    const clothesColor =
      getClothingColor(
        state
      );


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `
      .aerion-character-svg {
        --character-skin:
          ${skin};

        --character-skin-shadow:
          color-mix(
            in srgb,
            ${skin} 72%,
            #2c211c 28%
          );

        --character-animal:
          ${animalColor};

        --character-clothes:
          ${clothesColor};

        --character-clothes-shadow:
          color-mix(
            in srgb,
            ${clothesColor} 65%,
            #080706 35%
          );

        --character-hair:
          ${hairColor};
      }
    `;


    svg.append(
      style
    );


    /* ---------------------------------------------
       CAMADAS
       --------------------------------------------- */

    const shadow =
      buildShadow();


    const wings =
      buildWings(
        state
      );


    const tail =
      buildTail(
        state
      );


    const body =
      buildBody(
        geometry
      );


    const legs =
      buildLegs(
        geometry
      );


    const arms =
      buildArms(
        geometry
      );


    const neck =
      buildNeck(
        geometry
      );


    const head =
      buildHead(
        state,
        geometry
      );


    const ears =
      buildEars(
        state
      );


    const horns =
      buildHorns(
        state
      );


    const face =
      buildFace(
        state,
        geometry
      );


    const hair =
      buildHair(
        state
      );


    const facialHair =
      buildFacialHair(
        state
      );


    const clothing =
      buildClothing(
        state,
        geometry
      );


    const cape =
      buildCape(
        state
      );


    const armor =
      buildArmor(
        state
      );


    const belt =
      buildBelt(
        state
      );


    const necklace =
      buildNecklace(
        state
      );


    const glasses =
      buildGlasses(
        state
      );


    const headwear =
      buildHeadwear(
        state
      );


    const mask =
      buildMask(
        state
      );


    const markings =
      buildMarkings(
        state
      );


    const birthmark =
      buildBirthmark(
        state
      );


    const scars =
      buildScars(
        state
      );


    const tattoo =
      buildTattoo(
        state
      );


    const weapon =
      buildWeapon(
        state
      );


    /* ---------------------------------------------
       ORDEM
       --------------------------------------------- */

    const layers = [
      shadow,

      wings,

      tail,

      ...legs,

      body,

      ...arms,

      clothing,

      cape,

      armor,

      belt,

      neck,

      head,

      ears,

      horns,

      face,

      markings,

      birthmark,

      scars,

      tattoo,

      hair,

      facialHair,

      necklace,

      glasses,

      headwear,

      mask,

      weapon
    ];


    layers.forEach(
      layer => {

        if (
          !layer
        ) {
          return;
        }

        svg.append(
          layer
        );
      }
    );


    applyGeometryStyles(
      svg,
      geometry
    );


    return svg;
  }


  /* =========================================================
     ESTILO / ESCALA
     ========================================================= */

  function applyGeometryStyles(
    svg,
    geometry
  ) {
    const scale =
      0.80 +
      geometry.normalized *
        0.24;


    const width =
      geometry.body.width;


    svg.style.setProperty(
      "--character-scale",
      String(
        scale
      )
    );


    svg.style.setProperty(
      "--character-width",
      String(
        width
      )
    );


    svg.dataset.height =
      String(
        geometry.current
      );


    svg.dataset.heightMin =
      String(
        geometry.min
      );


    svg.dataset.heightMax =
      String(
        geometry.max
      );
  }


  /* =========================================================
     RENDER ROOT
     ========================================================= */

  function render(
    state = readState()
  ) {
    if (
      !state
    ) {
      return false;
    }


    if (
      !root
    ) {
      root =
        document.querySelector(
          CONFIG.rootSelector
        );
    }


    if (
      !root
    ) {
      return false;
    }


    const newHash =
      hashState(
        state
      );


    if (
      newHash ===
      lastRenderHash
    ) {
      return true;
    }


    lastRenderHash =
      newHash;


    currentState =
      state;

    currentCharacter =
      buildCharacter(
        state
      );


    root.innerHTML =
      "";


    root.append(
      currentCharacter
    );


    root.dataset.race =
      state.race ||
      "";


    root.dataset.animalha =
      state.animalha ||
      "";


    root.dataset.gender =
      state.gender ||
      "";


    root.dataset.size =
      state.raceData?.size ||
      "medio";


    root.classList.toggle(
      "has-wings",
      Boolean(
        state.raceData?.flight
      )
    );


    root.classList.toggle(
      "is-animalha",
      state.race ===
        "animalha"
    );


    root.classList.toggle(
      "is-female",
      state.gender ===
        "feminino"
    );


    window.dispatchEvent(
      new CustomEvent(
        CONFIG.updateEvent,
        {
          detail: {
            state,
            root
          }
        }
      )
    );


    return true;
  }


  /* =========================================================
     REFRESH
     ========================================================= */

  function refresh() {
    lastRenderHash =
      "";

    return render();
  }


  /* =========================================================
     CONTROLES DO EDITOR
     ========================================================= */

  function getEditorOptions(
    state
  ) {
    const assets =
      getAssets();

    if (
      !assets
    ) {
      return {};
    }


    const rules =
      getRaceRules(
        state
      );


    const result = {


      /* -----------------------------------------------
         Corpo
         ----------------------------------------------- */

      bodyTypes:
        (
          assets.bodyTypes ||
          []
        ).filter(
          item =>
            !rules?.bodyTypes ||
            rules.bodyTypes.includes(
              item.id
            )
        ),


      /* -----------------------------------------------
         Pele
         ----------------------------------------------- */

      skinPalettes:
        (
          assets.skinRestrictions?.[
            state?.race ||
            ""
          ] ||
          [
            "humana"
          ]
        )
          .map(
            paletteId =>
              assets.skinPalettes?.[
                paletteId
              ]
          )
          .filter(
            Boolean
          ),


      /* -----------------------------------------------
         Cabelo
         ----------------------------------------------- */

      hairStyles:
        assets.hairStyles ||
        [],

      hairColors:
        assets.hairColors ||
        [],


      /* -----------------------------------------------
         Face
         ----------------------------------------------- */

      eyeShapes:
        assets.eyeShapes ||
        [],

      eyeColors:
        assets.eyeColors ||
        [],

      eyebrows:
        assets.eyebrows ||
        [],

      noses:
        assets.noses ||
        [],

      mouths:
        assets.mouths ||
        [],


      /* -----------------------------------------------
         Racial
         ----------------------------------------------- */

      ears:
        getAllowedPart(
          state,
          "ears"
        ),

      horns:
        getAllowedPart(
          state,
          "horns"
        ),

      wings:
        getAllowedPart(
          state,
          "wings"
        ),

      tails:
        getAllowedPart(
          state,
          "tail"
        ),


      /* -----------------------------------------------
         Marcas
         ----------------------------------------------- */

      markings:
        rules?.markings
          ? assets.bodyMarkings
          : [],

      birthmarks:
        rules?.birthmarks
          ? assets.birthmarks
          : [],

      scars:
        rules?.scars
          ? assets.scars
          : [],

      tattoos:
        rules?.tattoos
          ? assets.tattoos
          : [],

      piercings:
        rules?.piercings
          ? assets.piercings
          : [],


      /* -----------------------------------------------
         Roupa
         ----------------------------------------------- */

      clothingStyles:
        assets.clothingStyles ||
        [],

      shirts:
        assets.shirts ||
        [],

      pants:
        assets.pants ||
        [],

      dresses:
        assets.dresses ||
        [],

      coats:
        assets.coats ||
        [],

      capes:
        assets.capes ||
        [],

      robes:
        assets.robes ||
        [],

      belts:
        assets.belts ||
        [],

      gloves:
        assets.gloves ||
        [],

      boots:
        assets.boots ||
        [],


      /* -----------------------------------------------
         Armadura
         ----------------------------------------------- */

      armorStyles:
        assets.armorStyles ||
        [],

      helmets:
        assets.helmets ||
        [],


      /* -----------------------------------------------
         Cabeça
         ----------------------------------------------- */

      hats:
        assets.hats ||
        [],

      hoods:
        assets.hoods ||
        [],

      masks:
        assets.masks ||
        [],

      glasses:
        assets.glasses ||
        [],


      /* -----------------------------------------------
         Joias
         ----------------------------------------------- */

      necklaces:
        assets.necklaces ||
        [],

      earrings:
        assets.earrings ||
        [],

      bracelets:
        assets.bracelets ||
        [],

      rings:
        assets.rings ||
        [],


      /* -----------------------------------------------
         Equipamentos
         ----------------------------------------------- */

      bags:
        assets.bags ||
        [],

      backpacks:
        assets.backpacks ||
        [],

      quivers:
        assets.quivers ||
        [],

      weapons:
        assets.weapons ||
        [],

      handItems:
        assets.handItems ||
        [],


      /* -----------------------------------------------
         Animalha
         ----------------------------------------------- */

      animalhaCategories:
        assets.animalhaCategories ||
        {},

      animalhaAnimals:
        assets.animalhaAnimals ||
        {}
    };


    return result;
  }


  /* =========================================================
     RESTRIÇÕES DE PEÇAS
     ========================================================= */

  function getAllowedPart(
    state,
    part
  ) {
    const assets =
      getAssets();

    const rules =
      getRaceRules(
        state
      );


    if (
      !assets ||
      !rules
    ) {
      return [];
    }


    const value =
      rules[
        part
      ];


    if (
      value ===
      false
    ) {
      return [];
    }


    if (
      value ===
      "required"
    ) {
      return assets[
        part ===
        "tail"
          ? "tailTypes"
          : part ===
              "wings"
            ? "wingTypes"
            : part ===
                "ears"
              ? "humanEars"
              : part ===
                  "horns"
                ? "hornStyles"
                : []
      ] || [];
    }


    if (
      value ===
      "animal-dependent"
    ) {
      const animal =
        getAnimalData(
          state
        );

      if (
        !animal
      ) {
        return [];
      }


      return [{
        id:
          animal[
            part
          ],

        name:
          animal[
            part
          ]
      }];
    }


    let source =
      [];


    switch (
      part
    ) {
      case "ears":
        source =
          assets.humanEars ||
          [];
        break;

      case "horns":
        source =
          assets.hornStyles ||
          [];
        break;

      case "wings":
        source =
          assets.wingTypes ||
          [];
        break;

      case "tail":
        source =
          assets.tailTypes ||
          [];
        break;
    }


    return source;
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function getAnimalhaCategoryAnimals(
    categoryId
  ) {
    const assets =
      getAssets();

    const category =
      assets?.animalhaCategories?.[
        categoryId
      ];


    if (
      !category
    ) {
      return [];
    }


    return (
      category.animals ||
      []
    )
      .map(
        id =>
          assets.animalhaAnimals?.[
            id
          ]
      )
      .filter(
        Boolean
      );
  }


  function getAnimalhaCategories() {
    const assets =
      getAssets();

    return Object.values(
      assets?.animalhaCategories ||
      {}
    );
  }


  /* =========================================================
     UI DO EDITOR
     ========================================================= */

  function findAppearancePanel() {
    return document.querySelector(
      '[data-panel="appearance"]'
    );
  }


  function ensureEditorShell() {
    const panel =
      findAppearancePanel();


    if (
      !panel
    ) {
      return null;
    }


    let editor =
      panel.querySelector(
        "[data-character-customizer]"
      );


    if (
      editor
    ) {
      return editor;
    }


    editor =
      document.createElement(
        "section"
      );


    editor.className =
      "character-customizer";


    editor.dataset.characterCustomizer =
      "true";


    editor.innerHTML = `
      <div
        class="character-customizer-heading"
      >
        <span class="eyebrow">
          PERSONALIZAÇÃO
        </span>

        <h3>
          Construa seu personagem
        </h3>

        <p>
          As opções mostradas aqui respeitam a raça e as
          características selecionadas.
        </p>
      </div>


      <div
        class="character-customizer-tabs"
        data-character-tabs
      ></div>


      <div
        class="character-customizer-body"
        data-character-controls
      ></div>
    `;


    const controls =
      panel.querySelector(
        ".appearance-controls"
      );


    if (
      controls
    ) {
      controls.before(
        editor
      );
    } else {
      panel.append(
        editor
      );
    }


    return editor;
  }


  /* =========================================================
     ABAS
     ========================================================= */

  const EDITOR_TABS = Object.freeze([
    {
      id:
        "body",

      label:
        "Corpo"
    },

    {
      id:
        "face",

      label:
        "Rosto"
    },

    {
      id:
        "hair",

      label:
        "Cabelo"
    },

    {
      id:
        "racial",

      label:
        "Raça"
    },

    {
      id:
        "clothing",

      label:
        "Roupas"
    },

    {
      id:
        "accessories",

      label:
        "Acessórios"
    },

    {
      id:
        "marks",

      label:
        "Marcas"
    },

    {
      id:
        "equipment",

      label:
        "Equipamento"
    }
  ]);


  let activeTab =
    "body";


  function renderEditorTabs(
    editor
  ) {
    const root =
      editor.querySelector(
        "[data-character-tabs]"
      );


    if (
      !root
    ) {
      return;
    }


    root.innerHTML =
      "";


    EDITOR_TABS.forEach(
      tab => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "character-editor-tab";


        button.classList.toggle(
          "active",
          activeTab ===
            tab.id
        );


        button.dataset.tab =
          tab.id;


        button.textContent =
          tab.label;


        button.addEventListener(
          "click",
          () => {

            activeTab =
              tab.id;

            renderEditor(
              editor,
              currentState
            );
          }
        );


        root.append(
          button
        );
      }
    );
  }


  /* =========================================================
     CONTROLES GENÉRICOS
     ========================================================= */

  function addSectionTitle(
    root,
    label,
    title
  ) {
    const heading =
      document.createElement(
        "div"
      );


    heading.className =
      "character-editor-section-title";


    heading.innerHTML = `
      <span class="eyebrow">
        ${escapeHtml(
          label
        )}
      </span>

      <h4>
        ${escapeHtml(
          title
        )}
      </h4>
    `;


    root.append(
      heading
    );
  }


  function addSelect(
    root,
    {
      id,
      label,
      value,
      options,
      onChange
    }
  ) {
    if (
      !Array.isArray(
        options
      )
    ) {
      return null;
    }


    const wrapper =
      document.createElement(
        "label"
      );


    wrapper.className =
      "character-editor-field";


    const text =
      document.createElement(
        "span"
      );


    text.className =
      "character-editor-label";


    text.textContent =
      label;


    const select =
      document.createElement(
        "select"
      );


    select.id =
      id;


    select.className =
      "character-editor-select";


    select.innerHTML = `
      <option value="">
        Padrão
      </option>

      ${options.map(
        option => `
          <option
            value="${escapeHtml(
              option.id ??
              option
            )}"
          >
            ${escapeHtml(
              option.name ??
              option
            )}
          </option>
        `
      ).join("")}
    `;


    if (
      value !=
      null
    ) {
      select.value =
        String(
          value
        );
    }


    select.addEventListener(
      "change",
      () => {

        onChange(
          select.value
        );
      }
    );


    wrapper.append(
      text,
      select
    );


    root.append(
      wrapper
    );


    return select;
  }


  function addColorGrid(
    root,
    {
      label,
      colors,
      value,
      onChange
    }
  ) {
    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "character-color-field";


    const title =
      document.createElement(
        "span"
      );


    title.className =
      "character-editor-label";


    title.textContent =
      label;


    const grid =
      document.createElement(
        "div"
      );


    grid.className =
      "character-color-grid";


    (
      colors ||
      []
    ).forEach(
      color => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "character-color-option";


        button.style.background =
          color;


        button.dataset.color =
          color;


        button.classList.toggle(
          "selected",
          color ===
            value
        );


        button.setAttribute(
          "aria-label",
          color
        );


        button.addEventListener(
          "click",
          () => {

            onChange(
              color
            );

            $$(
              ".character-color-option",
              grid
            ).forEach(
              item => {

                item.classList.toggle(
                  "selected",
                  item ===
                    button
                );
              }
            );
          }
        );


        grid.append(
          button
        );
      }
    );


    wrapper.append(
      title,
      grid
    );


    root.append(
      wrapper
    );
  }


  function addRange(
    root,
    {
      label,
      id,
      value,
      min,
      max,
      step,
      suffix,
      onChange
    }
  ) {
    const wrapper =
      document.createElement(
        "label"
      );


    wrapper.className =
      "character-editor-range";


    const top =
      document.createElement(
        "span"
      );


    top.className =
      "character-editor-label";


    const valueLabel =
      document.createElement(
        "strong"
      );


    valueLabel.textContent =
      `${value}${suffix || ""}`;


    top.textContent =
      label;


    top.append(
      valueLabel
    );


    const input =
      document.createElement(
        "input"
      );


    input.type =
      "range";


    input.id =
      id;


    input.min =
      String(
        min
      );


    input.max =
      String(
        max
      );


    input.step =
      String(
        step ??
        0.01
      );


    input.value =
      String(
        value
      );


    input.addEventListener(
      "input",
      () => {

        const next =
          Number(
            input.value
          );


        valueLabel.textContent =
          `${next}${suffix || ""}`;


        onChange(
          next
        );
      }
    );


    wrapper.append(
      top,
      input
    );


    root.append(
      wrapper
    );
  }


  /* =========================================================
     ABAS DO EDITOR
     ========================================================= */

  function renderBodyControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "CORPO",
      "Estrutura"
    );


    addSelect(
      root,
      {
        id:
          "characterBodyType",

        label:
          "Tipo corporal",

        value:
          state.appearance
            ?.bodyType,

        options:
          options.bodyTypes,

        onChange:
          value => {

            updateAppearance(
              "bodyType",
              value
            );
          }
      }
    );


    const height =
      getHeightData(
        state
      );


    addRange(
      root,
      {
        id:
          "characterHeightControl",

        label:
          "Altura",

        value:
          height.current,

        min:
          height.min,

        max:
          height.max,

        step:
          1,

        suffix:
          " cm",

        onChange:
          value => {

            const ficha =
              getFicha();


            ficha?.setHeight?.(
              value
            );
          }
      }
    );


    addRange(
      root,
      {
        id:
          "characterWidthControl",

        label:
          "Largura corporal",

        value:
          num(
            state.appearance
              ?.width,
            1
          ),

        min:
          .82,

        max:
          1.20,

        step:
          .01,

        suffix:
          "",

        onChange:
          value => {

            updateAppearance(
              "width",
              value
            );
          }
      }
    );


    addRange(
      root,
      {
        id:
          "characterShouldersControl",

        label:
          "Ombros",

        value:
          num(
            state.appearance
              ?.shoulders,
            1
          ),

        min:
          .85,

        max:
          1.20,

        step:
          .01,

        onChange:
          value => {

            updateAppearance(
              "shoulders",
              value
            );
          }
      }
    );
  }


  function renderFaceControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "ROSTO",
      "Traços faciais"
    );


    addSelect(
      root,
      {
        id:
          "characterEyeShape",

        label:
          "Formato dos olhos",

        value:
          state.appearance
            ?.eyeShape,

        options:
          options.eyeShapes,

        onChange:
          value => {

            updateAppearance(
              "eyeShape",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterEyebrows",

        label:
          "Sobrancelhas",

        value:
          state.appearance
            ?.eyebrows,

        options:
          options.eyebrows,

        onChange:
          value => {

            updateAppearance(
              "eyebrows",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterNose",

        label:
          "Nariz",

        value:
          state.appearance
            ?.nose,

        options:
          options.noses,

        onChange:
          value => {

            updateAppearance(
              "nose",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterMouth",

        label:
          "Boca",

        value:
          state.appearance
            ?.mouth,

        options:
          options.mouths,

        onChange:
          value => {

            updateAppearance(
              "mouth",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterEyeColor",

        label:
          "Cor dos olhos",

        value:
          state.appearance
            ?.eyeColor,

        options:
          options.eyeColors,

        onChange:
          value => {

            updateAppearance(
              "eyeColor",
              value
            );
          }
      }
    );
  }


  function renderHairControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "CABELO",
      "Estilo"
    );


    addSelect(
      root,
      {
        id:
          "characterHairStyle",

        label:
          "Penteado",

        value:
          state.appearance
            ?.hairStyle,

        options:
          options.hairStyles,

        onChange:
          value => {

            updateAppearance(
              "hairStyle",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterHairColor",

        label:
          "Cor do cabelo",

        value:
          state.appearance
            ?.hairColor,

        options:
          options.hairColors,

        onChange:
          value => {

            updateAppearance(
              "hairColor",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterFacialHair",

        label:
          "Pelagem facial",

        value:
          state.appearance
            ?.facialHair,

        options:
          options.facialHair ||
          [],

        onChange:
          value => {

            updateAppearance(
              "facialHair",
              value
            );
          }
      }
    );
  }


  function renderRacialControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "RAÇA",
      "Características raciais"
    );


    const race =
      state.raceData;


    if (
      race?.flight
    ) {
      root.insertAdjacentHTML(
        "beforeend",
        `
          <div
            class="character-feature-notice"
          >
            Asas disponíveis
          </div>
        `
      );
    }


    addSelect(
      root,
      {
        id:
          "characterEars",

        label:
          "Orelhas",

        value:
          state.appearance
            ?.ears,

        options:
          options.ears,

        onChange:
          value => {

            updateAppearance(
              "ears",
              value
            );
          }
      }
    );


    if (
      options.horns?.length
    ) {
      addSelect(
        root,
        {
          id:
            "characterHorns",

          label:
            "Chifres",

          value:
            state.appearance
              ?.horns,

          options:
            options.horns,

          onChange:
            value => {

              updateAppearance(
                "horns",
                value
              );
            }
        }
      );
    }


    if (
      options.wings?.length
    ) {
      addSelect(
        root,
        {
          id:
            "characterWings",

          label:
            "Asas",

          value:
            state.appearance
              ?.wings,

          options:
            options.wings,

          onChange:
            value => {

              updateAppearance(
                "wings",
                value
              );
            }
        }
      );
    }


    if (
      options.tails?.length
    ) {
      addSelect(
        root,
        {
          id:
            "characterTail",

          label:
            "Cauda",

          value:
            state.appearance
              ?.tail,

          options:
            options.tails,

          onChange:
            value => {

              updateAppearance(
                "tail",
                value
              );
            }
        }
      );
    }


    if (
      state.race ===
      "animalha"
    ) {
      renderAnimalhaControls(
        root,
        state,
        options
      );
    }
  }


  function renderAnimalhaControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "ANIMALHA",
      "Linhagem animal"
    );


    const categories =
      getAnimalhaCategories();


    addSelect(
      root,
      {
        id:
          "characterAnimalCategory",

        label:
          "Categoria",

        value:
          findAnimalCategory(
            state.animalha
          ),

        options:
          categories,

        onChange:
          value => {

            if (
              !value
            ) {
              return;
            }

            const animals =
              getAnimalhaCategoryAnimals(
                value
              );


            if (
              animals[0]
            ) {
              const ficha =
                getFicha();


              ficha?.selectAnimalha?.(
                animals[0].id
              );
            }
          }
      }
    );


    const category =
      findAnimalCategory(
        state.animalha
      );


    if (
      category
    ) {
      const animals =
        getAnimalhaCategoryAnimals(
          category
        );


      addSelect(
        root,
        {
          id:
            "characterAnimal",

          label:
            "Animal",

          value:
            state.animalha,

          options:
            animals,

          onChange:
            value => {

              if (
                value
              ) {
                getFicha()?.selectAnimalha?.(
                  value
                );
              }
            }
        }
      );
    }


    const animal =
      getAnimalData(
        state
      );


    if (
      animal
    ) {
      root.insertAdjacentHTML(
        "beforeend",
        `
          <div
            class="character-animal-profile"
          >

            <span class="eyebrow">
              PERFIL NATURAL
            </span>

            <strong>
              ${escapeHtml(
                animal.name
              )}
            </strong>

            <p>
              Categoria:
              ${escapeHtml(
                animal.category
              )}
            </p>

          </div>
        `
      );
    }
  }


  function findAnimalCategory(
    animalId
  ) {
    const assets =
      getAssets();


    for (
      const [
        id,
        category
      ] of Object.entries(
        assets?.animalhaCategories ||
        {}
      )
    ) {
      if (
        category.animals?.includes(
          animalId
        )
      ) {
        return id;
      }
    }


    return "";
  }


  function renderClothingControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "ROUPAS",
      "Vestimenta"
    );


    addSelect(
      root,
      {
        id:
          "characterClothingStyle",

        label:
          "Estilo",

        value:
          state.appearance
            ?.clothingStyle,

        options:
          options.clothingStyles,

        onChange:
          value => {

            updateAppearance(
              "clothingStyle",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterShirt",

        label:
          "Parte superior",

        value:
          state.appearance
            ?.shirt,

        options:
          options.shirts,

        onChange:
          value => {

            updateAppearance(
              "shirt",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterPants",

        label:
          "Calça",

        value:
          state.appearance
            ?.pants,

        options:
          options.pants,

        onChange:
          value => {

            updateAppearance(
              "pants",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterCoat",

        label:
          "Casaco",

        value:
          state.appearance
            ?.coat,

        options:
          options.coats,

        onChange:
          value => {

            updateAppearance(
              "coat",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterCape",

        label:
          "Capa",

        value:
          state.appearance
            ?.cape,

        options:
          options.capes,

        onChange:
          value => {

            updateAppearance(
              "cape",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterRobe",

        label:
          "Manto / robe",

        value:
          state.appearance
            ?.robe,

        options:
          options.robes,

        onChange:
          value => {

            updateAppearance(
              "robe",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterGloves",

        label:
          "Luvas",

        value:
          state.appearance
            ?.gloves,

        options:
          options.gloves,

        onChange:
          value => {

            updateAppearance(
              "gloves",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterBoots",

        label:
          "Botas",

        value:
          state.appearance
            ?.boots,

        options:
          options.boots,

        onChange:
          value => {

            updateAppearance(
              "boots",
              value
            );
          }
      }
    );
  }


  function renderAccessoryControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "ACESSÓRIOS",
      "Detalhes"
    );


    addSelect(
      root,
      {
        id:
          "characterHat",

        label:
          "Chapéu",

        value:
          state.appearance
            ?.hat,

        options:
          options.hats,

        onChange:
          value => {

            updateAppearance(
              "hat",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterHood",

        label:
          "Capuz",

        value:
          state.appearance
            ?.hood,

        options:
          options.hoods,

        onChange:
          value => {

            updateAppearance(
              "hood",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterMask",

        label:
          "Máscara",

        value:
          state.appearance
            ?.mask,

        options:
          options.masks,

        onChange:
          value => {

            updateAppearance(
              "mask",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterGlasses",

        label:
          "Óculos",

        value:
          state.appearance
            ?.glasses,

        options:
          options.glasses,

        onChange:
          value => {

            updateAppearance(
              "glasses",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterNecklace",

        label:
          "Colar",

        value:
          state.appearance
            ?.necklace,

        options:
          options.necklaces,

        onChange:
          value => {

            updateAppearance(
              "necklace",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterEarrings",

        label:
          "Brincos",

        value:
          state.appearance
            ?.earrings,

        options:
          options.earrings,

        onChange:
          value => {

            updateAppearance(
              "earrings",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterBracelet",

        label:
          "Bracelete",

        value:
          state.appearance
            ?.bracelet,

        options:
          options.bracelets,

        onChange:
          value => {

            updateAppearance(
              "bracelet",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterRing",

        label:
          "Anel",

        value:
          state.appearance
            ?.ring,

        options:
          options.rings,

        onChange:
          value => {

            updateAppearance(
              "ring",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterBag",

        label:
          "Bolsa",

        value:
          state.appearance
            ?.bag,

        options:
          options.bags,

        onChange:
          value => {

            updateAppearance(
              "bag",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterBackpack",

        label:
          "Mochila",

        value:
          state.appearance
            ?.backpack,

        options:
          options.backpacks,

        onChange:
          value => {

            updateAppearance(
              "backpack",
              value
            );
          }
      }
    );
  }


  function renderMarkControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "MARCAS",
      "Detalhes pessoais"
    );


    addColorGrid(
      root,
      {
        label:
          "Tom de pele permitido",

        colors:
          getAllowedSkinPalette(
            state
          )?.colors ||
          [],

        value:
          getCurrentSkinColor(
            state
          ),

        onChange:
          value => {

            updateAppearance(
              "skinVariant",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterMarkings",

        label:
          "Manchas / padrão",

        value:
          state.appearance
            ?.markings,

        options:
          options.markings,

        onChange:
          value => {

            updateAppearance(
              "markings",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterBirthmark",

        label:
          "Marca de nascença",

        value:
          state.appearance
            ?.birthmark,

        options:
          options.birthmarks,

        onChange:
          value => {

            updateAppearance(
              "birthmark",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterScars",

        label:
          "Cicatrizes",

        value:
          state.appearance
            ?.scars,

        options:
          options.scars,

        onChange:
          value => {

            updateAppearance(
              "scars",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterTattoos",

        label:
          "Tatuagens",

        value:
          state.appearance
            ?.tattoos,

        options:
          options.tattoos,

        onChange:
          value => {

            updateAppearance(
              "tattoos",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterPiercings",

        label:
          "Piercings",

        value:
          state.appearance
            ?.piercings,

        options:
          options.piercings,

        onChange:
          value => {

            updateAppearance(
              "piercings",
              value
            );
          }
      }
    );
  }


  function renderEquipmentControls(
    root,
    state,
    options
  ) {
    addSectionTitle(
      root,
      "EQUIPAMENTO",
      "Itens visíveis"
    );


    addSelect(
      root,
      {
        id:
          "characterWeapon",

        label:
          "Arma principal",

        value:
          state.appearance
            ?.weapon,

        options:
          options.weapons,

        onChange:
          value => {

            updateAppearance(
              "weapon",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterHandItem",

        label:
          "Objeto de mão",

        value:
          state.appearance
            ?.handItem,

        options:
          options.handItems,

        onChange:
          value => {

            updateAppearance(
              "handItem",
              value
            );
          }
      }
    );


    addSelect(
      root,
      {
        id:
          "characterQuiver",

        label:
          "Aljava",

        value:
          state.appearance
            ?.quiver,

        options:
          options.quivers,

        onChange:
          value => {

            updateAppearance(
              "quiver",
              value
            );
          }
      }
    );
  }


  function updateAppearance(
    field,
    value
  ) {
    const ficha =
      getFicha();


    if (
      !ficha ||
      typeof
        ficha.setAppearanceField !==
        "function"
    ) {
      return;
    }


    ficha.setAppearanceField(
      field,
      value
    );
  }


  /* =========================================================
     RENDER DO EDITOR
     ========================================================= */

  function renderEditor(
    editor,
    state
  ) {
    if (
      !editor ||
      !state
    ) {
      return;
    }


    renderEditorTabs(
      editor
    );


    const controls =
      editor.querySelector(
        "[data-character-controls]"
      );


    if (
      !controls
    ) {
      return;
    }


    controls.innerHTML =
      "";


    const options =
      getEditorOptions(
        state
      );


    switch (
      activeTab
    ) {
      case "body":

        renderBodyControls(
          controls,
          state,
          options
        );

        break;


      case "face":

        renderFaceControls(
          controls,
          state,
          options
        );

        break;


      case "hair":

        renderHairControls(
          controls,
          state,
          options
        );

        break;


      case "racial":

        renderRacialControls(
          controls,
          state,
          options
        );

        break;


      case "clothing":

        renderClothingControls(
          controls,
          state,
          options
        );

        break;


      case "accessories":

        renderAccessoryControls(
          controls,
          state,
          options
        );

        break;


      case "marks":

        renderMarkControls(
          controls,
          state,
          options
        );

        break;


      case "equipment":

        renderEquipmentControls(
          controls,
          state,
          options
        );

        break;
    }
  }


  /* =========================================================
     EVENTOS
     ========================================================= */

  function bindEvents() {

    window.addEventListener(
      "aerion:ficha:ready",
      () => {

        refresh();

        const editor =
          ensureEditorShell();


        if (
          editor
        ) {
          renderEditor(
            editor,
            currentState
          );
        }
      }
    );


    document.addEventListener(
      "input",
      event => {

        const target =
          event.target;


        if (
          !target
        ) {
          return;
        }


        if (
          target.closest(
            "[data-character-customizer]"
          )
        ) {
          return;
        }


        if (
          target.id ===
            "heightRange" ||
          target.id ===
            "hair" ||
          target.id ===
            "eyes" ||
          target.id ===
            "skin" ||
          target.id ===
            "clothing" ||
          target.id ===
            "scars" ||
          target.id ===
            "tattoos" ||
          target.id ===
            "physicalNotes"
        ) {
          requestAnimationFrame(
            () => {

              currentState =
                readState();

              refresh();

              const editor =
                ensureEditorShell();

              if (
                editor
              ) {
                renderEditor(
                  editor,
                  currentState
                );
              }
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
          !target
        ) {
          return;
        }


        requestAnimationFrame(
          () => {

            currentState =
              readState();

            refresh();

            const editor =
              ensureEditorShell();

            if (
              editor
            ) {
              renderEditor(
                editor,
                currentState
              );
            }
          }
        );
      }
    );
  }


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init() {

    root =
      document.querySelector(
        CONFIG.rootSelector
      );


    bindEvents();


    if (
      root
    ) {
      currentState =
        readState();

      render(
        currentState
      );


      const editor =
        ensureEditorShell();


      if (
        editor &&
        currentState
      ) {
        renderEditor(
          editor,
          currentState
        );
      }
    }


    console.info(
      "[AERION] personagem-render.js inicializado."
    );
  }


  /* =========================================================
     API
     ========================================================= */

  window.AERIONPersonagemRender =
    Object.freeze({

      render,

      refresh,

      getEditorOptions,

      getAnimalhaCategories,

      getAnimalhaCategoryAnimals,

      getRaceRules,

      getRaceData,

      getAnimalData,

      getAllowedSkinPalette
    });


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:
          true
      }
    );
  } else {
    init();
  }

})();

