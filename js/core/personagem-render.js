/* =========================================================
   AERION — PERSONAGEM RENDER
   js/core/personagem-render.js

   MOTOR VISUAL DO CRIADOR DE PERSONAGEM 2D

   Depende de:
     window.AERIONPersonagemAssets
     window.AERIONFicha

   Responsável por:
   - ler estado da ficha;
   - aplicar restrições raciais;
   - montar personagem em camadas;
   - atualizar altura/proporções;
   - pele/pelagem;
   - cabelo;
   - olhos/rosto;
   - orelhas/chifres;
   - asas/cauda;
   - roupas;
   - armaduras;
   - marcas;
   - cicatrizes;
   - tatuagens;
   - acessórios;
   - equipamentos.

   NÃO é responsável por:
   - dados;
   - atributos;
   - regras de combate;
   - salvar ficha.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    rootSelector: "#appearanceFigure",

    width: 360,
    height: 620,

    viewBox:
      "0 0 360 620",

    event:
      "aerion:personagem:updated"
  });


  /* =========================================================
     ESTADO
     ========================================================= */

  let root = null;

  let currentState = null;

  let renderScheduled = false;

  let resizeObserver = null;


  /* =========================================================
     REFERÊNCIAS
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

  function safeText(value) {
    return String(
      value ?? ""
    ).trim();
  }


  function normalize(value) {
    return safeText(
      value
    )
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


  function num(
    value,
    fallback = 0
  ) {
    const n =
      Number(value);

    return Number.isFinite(n)
      ? n
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


  function esc(value) {
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


  function getAppearance(
    state
  ) {
    return (
      state?.appearance ||
      {}
    );
  }


  /* =========================================================
     LEITURA DA FICHA
     ========================================================= */

  function readFichaState() {
    const ficha =
      getFicha();

    if (
      !ficha ||
      typeof ficha.getState !==
        "function"
    ) {
      return (
        currentState ||
        {}
      );
    }

    try {
      return (
        ficha.getState() ||
        {}
      );
    } catch (error) {
      console.error(
        "[AERION][PERSONAGEM] Erro ao ler ficha:",
        error
      );

      return {};
    }
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function getRaceId(
    state
  ) {
    const assets =
      getAssets();

    if (
      !assets
    ) {
      return "humano";
    }

    if (
      typeof assets.normalizeRaceId ===
      "function"
    ) {
      return assets.normalizeRaceId(
        state?.race ||
        "humano"
      );
    }

    return normalize(
      state?.race ||
      "humano"
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

    if (
      typeof assets.getRaceRules ===
      "function"
    ) {
      return assets.getRaceRules(
        getRaceId(
          state
        )
      );
    }

    return (
      assets.RACE_RULES?.[
        getRaceId(
          state
        )
      ] ||
      null
    );
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

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
      safeText(
        state?.animalha
      );

    if (
      !animalId
    ) {
      return null;
    }

    return (
      assets.ANIMALHA_ANIMALS?.[
        animalId
      ] ||
      assets.animalhaAnimals?.[
        animalId
      ] ||
      null
    );
  }


  /* =========================================================
     RESTRIÇÕES
     ========================================================= */

  function allowed(
    state,
    field,
    value
  ) {
    const assets =
      getAssets();

    if (
      !assets
    ) {
      return true;
    }

    if (
      typeof assets.isOptionAllowed ===
      "function"
    ) {
      return assets.isOptionAllowed(
        getRaceId(
          state
        ),
        field,
        value
      );
    }

    const rules =
      getRaceRules(
        state
      );

    if (
      !rules
    ) {
      return true;
    }

    const list =
      rules[
        field
      ];

    if (
      !Array.isArray(list)
    ) {
      return true;
    }

    return list.includes(
      value
    );
  }


  function resolveRaceOption(
    state,
    field,
    requested,
    fallback
  ) {
    if (
      allowed(
        state,
        field,
        requested
      )
    ) {
      return requested;
    }

    if (
      allowed(
        state,
        field,
        fallback
      )
    ) {
      return fallback;
    }

    const rules =
      getRaceRules(
        state
      );

    const list =
      rules?.[
        field
      ];

    return (
      Array.isArray(list) &&
      list.length
        ? list[0]
        : fallback
    );
  }


  /* =========================================================
     PALETAS
     ========================================================= */

  function getSkinColor(
    state
  ) {
    const assets =
      getAssets();

    const appearance =
      getAppearance(
        state
      );

    const palette =
      typeof assets?.getSkinPaletteForRace ===
      "function"
        ? assets.getSkinPaletteForRace(
            getRaceId(
              state
            )
          )
        : assets?.SKIN_PALETTES?.[
            getRaceRules(
              state
            )?.skinPalette
          ];

    if (
      !palette?.colors?.length
    ) {
      return "#b89d88";
    }

    if (
      appearance.skinVariant &&
      palette.colors.includes(
        appearance.skinVariant
      )
    ) {
      return appearance.skinVariant;
    }

    const requested =
      safeText(
        appearance.skin
      );

    const index =
      num(
        appearance.skinIndex,
        Math.floor(
          palette.colors.length / 2
        )
      );

    if (
      requested
    ) {
      const match =
        palette.colors.find(
          color =>
            normalize(color) ===
            normalize(requested)
        );

      if (
        match
      ) {
        return match;
      }
    }

    return (
      palette.colors[
        clamp(
          index,
          0,
          palette.colors.length - 1
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

    const appearance =
      getAppearance(
        state
      );

    const colors =
      assets?.HAIR_COLORS ||
      assets?.hairColors ||
      [];

    const wanted =
      safeText(
        appearance.hairColor
      );

    const found =
      colors.find(
        item =>
          item.id ===
          wanted
      );

    return (
      found?.colors?.[0] ||
      "#2a211d"
    );
  }


  function getEyeColor(
    state
  ) {
    const assets =
      getAssets();

    const appearance =
      getAppearance(
        state
      );

    const colors =
      assets?.EYE_COLORS ||
      assets?.eyeColors ||
      [];

    const wanted =
      safeText(
        appearance.eyeColor
      );

    const found =
      colors.find(
        item =>
          item.id ===
          wanted
      );

    return (
      found?.colors?.[0] ||
      "#4b3528"
    );
  }


  function getAnimalColor(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const animal =
      getAnimalData(
        state
      );

    if (
      appearance.furColor
    ) {
      return appearance.furColor;
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

    return getSkinColor(
      state
    );
  }


  /* =========================================================
     DIMENSÕES
     ========================================================= */

  function getDimensions(
    state
  ) {
    const race =
      getRaceRules(
        state
      );

    const appearance =
      getAppearance(
        state
      );

    const minHeight =
      num(
        state?.raceData?.height?.min,
        150
      );

    const maxHeight =
      num(
        state?.raceData?.height?.max,
        200
      );

    const currentHeight =
      clamp(
        num(
          appearance.height,
          (minHeight + maxHeight) / 2
        ),
        minHeight,
        maxHeight
      );

    const heightRatio =
      clamp(
        (
          currentHeight -
          minHeight
        ) /
        Math.max(
          1,
          maxHeight -
          minHeight
        ),
        0,
        1
      );

    const bodyType =
      safeText(
        appearance.bodyType ||
        race?.defaultBodyType ||
        "average"
      );

    const bodyWidths = {
      slim: 0.88,
      lean: 0.95,
      average: 1,
      broad: 1.10,
      heavy: 1.18
    };

    return {
      minHeight,

      maxHeight,

      height:
        currentHeight,

      heightRatio,

      scaleY:
        0.88 +
        heightRatio * 0.18,

      bodyWidth:
        clamp(
          num(
            appearance.width,
            bodyWidths[
              bodyType
            ] ||
            1
          ),
          0.82,
          1.25
        ),

      shoulders:
        clamp(
          num(
            appearance.shoulders,
            bodyWidths[
              bodyType
            ] ||
            1
          ),
          0.84,
          1.28
        ),

      torso:
        clamp(
          num(
            appearance.torso,
            1
          ),
          0.88,
          1.22
        ),

      arms:
        clamp(
          num(
            appearance.arms,
            1
          ),
          0.88,
          1.18
        ),

      legs:
        clamp(
          num(
            appearance.legs,
            1
          ),
          0.86,
          1.20
        ),

      head:
        clamp(
          num(
            appearance.head,
            1
          ),
          0.90,
          1.15
        )
    };
  }


  /* =========================================================
     SVG HELPERS
     ========================================================= */

  function svg(
    tag,
    attrs = {},
    children = ""
  ) {
    const attributes =
      Object.entries(
        attrs
      )
        .map(
          ([key, value]) =>
            `${key}="${esc(value)}"`
        )
        .join(" ");

    return (
      `<${tag}${
        attributes
          ? ` ${attributes}`
          : ""
      }>${children}</${tag}>`
    );
  }


  function group(
    children,
    attrs = {}
  ) {
    return svg(
      "g",
      attrs,
      children
    );
  }


  /* =========================================================
     SOMBRA
     ========================================================= */

  function renderShadow(
    dimensions
  ) {
    const width =
      95 *
      dimensions.bodyWidth;

    return svg(
      "ellipse",
      {
        cx: 180,
        cy: 572,
        rx: width,
        ry: 16,
        fill:
          "rgba(0,0,0,.38)"
      }
    );
  }


  /* =========================================================
     PERNAS
     ========================================================= */

  function renderLegs(
    state,
    dimensions,
    skin
  ) {
    const legScale =
      dimensions.legs;

    const leftX =
      146 -
      (
        dimensions.bodyWidth *
        7
      );

    const rightX =
      188 +
      (
        dimensions.bodyWidth *
        7
      );

    const legWidth =
      23 *
      legScale;

    const legHeight =
      185 *
      dimensions.scaleY *
      legScale;

    const top =
      342;

    return group(
      [
        svg(
          "path",
          {
            d:
              `M ${leftX} ${top}
               C ${leftX - 2} ${top + 45},
                 ${leftX - 6} ${top + 110},
                 ${leftX - 5} ${top + legHeight}
               L ${leftX + legWidth - 3} ${top + legHeight}
               C ${leftX + legWidth} ${top + 120},
                 ${leftX + legWidth + 1} ${top + 50},
                 ${leftX + legWidth} ${top}
               Z`,
            fill:
              skin
          }
        ),

        svg(
          "path",
          {
            d:
              `M ${rightX} ${top}
               C ${rightX - 1} ${top + 50},
                 ${rightX} ${top + 115},
                 ${rightX + 2} ${top + legHeight}
               L ${rightX + legWidth + 6} ${top + legHeight}
               C ${rightX + legWidth + 3} ${top + 115},
                 ${rightX + legWidth + 1} ${top + 48},
                 ${rightX + legWidth} ${top}
               Z`,
            fill:
              skin
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     PÉS
     ========================================================= */

  function renderFeet(
    state,
    dimensions,
    skin
  ) {
    const footwear =
      getAppearance(
        state
      ).boots;

    if (
      footwear &&
      footwear !==
        "none"
    ) {
      return "";
    }

    return group(
      [
        svg(
          "path",
          {
            d:
              "M137 523 C125 531 119 541 124 548 C137 554 156 551 167 546 L167 536 C158 528 147 524 137 523 Z",
            fill:
              skin
          }
        ),

        svg(
          "path",
          {
            d:
              "M191 537 C202 527 212 525 222 529 C228 535 226 545 218 549 C206 553 195 551 188 546 Z",
            fill:
              skin
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     BRAÇOS
     ========================================================= */

  function renderArms(
    dimensions,
    skin
  ) {
    const armScale =
      dimensions.arms;

    const shoulderWidth =
      46 *
      dimensions.shoulders;

    const armWidth =
      23 *
      armScale;

    const armHeight =
      155 *
      dimensions.scaleY *
      armScale;

    return group(
      [
        svg(
          "path",
          {
            d:
              `M ${180 - shoulderWidth} 220
               C ${156 - shoulderWidth / 3} 225,
                 ${144 - shoulderWidth / 4} 275,
                 ${145 - shoulderWidth / 5} 318
               C ${146 - shoulderWidth / 6} 345,
                 ${155 - shoulderWidth / 5} 367,
                 ${166 - shoulderWidth / 5} 357
               C ${174 - shoulderWidth / 5} 349,
                 ${170 - shoulderWidth / 5} 320,
                 ${176 - shoulderWidth / 5} 287
               L ${190 - shoulderWidth / 3} 238
               Z`,
            fill:
              skin
          }
        ),

        svg(
          "path",
          {
            d:
              `M ${180 + shoulderWidth} 220
               C ${204 + shoulderWidth / 3} 225,
                 ${216 + shoulderWidth / 4} 275,
                 ${215 + shoulderWidth / 5} 318
               C ${214 + shoulderWidth / 6} 345,
                 ${205 + shoulderWidth / 5} 367,
                 ${194 + shoulderWidth / 5} 357
               C ${186 + shoulderWidth / 5} 349,
                 ${190 + shoulderWidth / 5} 320,
                 ${184 + shoulderWidth / 5} 287
               L ${170 + shoulderWidth / 3} 238
               Z`,
            fill:
              skin
          }
        ),

        svg(
          "circle",
          {
            cx:
              157,
            cy:
              358,
            r:
              armWidth * 0.50,
            fill:
              skin
          }
        ),

        svg(
          "circle",
          {
            cx:
              203,
            cy:
              358,
            r:
              armWidth * 0.50,
            fill:
              skin
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     CORPO
     ========================================================= */

  function renderBody(
    dimensions,
    skin,
    state
  ) {
    const width =
      72 *
      dimensions.bodyWidth *
      dimensions.torso;

    const shoulder =
      72 *
      dimensions.shoulders;

    const top =
      215;

    const bottom =
      382;

    return group(
      [
        svg(
          "path",
          {
            d:
              `M 180 ${top}
               C ${180 - shoulder} ${top + 8},
                 ${180 - width} ${top + 32},
                 ${180 - width * 0.78} ${bottom - 25}
               C ${180 - width * 0.65} ${bottom},
                 ${180 - width * 0.33} ${bottom + 8},
                 180 ${bottom + 11}
               C ${180 + width * 0.33} ${bottom + 8},
                 ${180 + width * 0.65} ${bottom},
                 ${180 + width * 0.78} ${bottom - 25}
               C ${180 + width} ${top + 32},
                 ${180 + shoulder} ${top + 8},
                 180 ${top}
               Z`,
            fill:
              skin
          }
        ),

        svg(
          "path",
          {
            d:
              "M180 240 C173 271 173 313 180 350 C187 313 187 271 180 240 Z",
            fill:
              "rgba(0,0,0,.08)"
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     PESCOÇO
     ========================================================= */

  function renderNeck(
    skin
  ) {
    return svg(
      "path",
      {
        d:
          "M157 196 L203 196 L199 230 C194 239 188 243 180 243 C172 243 166 239 161 230 Z",
        fill:
          skin
      }
    );
  }


  /* =========================================================
     CABEÇA
     ========================================================= */

  function renderHead(
    state,
    dimensions,
    skin
  ) {
    const appearance =
      getAppearance(
        state
      );

    const face =
      normalize(
        appearance.face
          ||
        appearance.faceShape
          ||
        "oval"
      );

    let rx =
      48 *
      dimensions.head;

    let ry =
      58 *
      dimensions.head;

    if (
      face ===
      "round"
    ) {
      rx *= 1.08;
      ry *= .96;
    }

    if (
      face ===
      "long"
    ) {
      ry *= 1.12;
    }

    if (
      face ===
      "square"
    ) {
      rx *= 1.08;
      ry *= 1.02;
    }

    return svg(
      "ellipse",
      {
        cx:
          180,

        cy:
          151,

        rx,

        ry,

        fill:
          skin
      }
    );
  }


  /* =========================================================
     ORELHAS
     ========================================================= */

  function renderEars(
    state,
    skin
  ) {
    const rules =
      getRaceRules(
        state
      );

    const appearance =
      getAppearance(
        state
      );

    const ears =
      resolveRaceOption(
        state,
        "ears",
        appearance.ears ||
          rules?.ears?.[0] ||
          "human",
        rules?.ears?.[0] ||
          "human"
      );

    if (
      ears ===
      "human" ||
      ears ===
      "round"
    ) {
      return group(
        [
          svg(
            "ellipse",
            {
              cx:
                132,
              cy:
                153,
              rx:
                9,
              ry:
                17,
              fill:
                skin
            }
          ),

          svg(
            "ellipse",
            {
              cx:
                228,
              cy:
                153,
              rx:
                9,
              ry:
                17,
              fill:
                skin
            }
          )
        ].join("")
      );
    }

    if (
      ears.includes(
        "pointed"
      ) ||
      ears ===
        "fox" ||
      ears ===
        "feline" ||
      ears ===
        "canine"
    ) {
      return group(
        [
          svg(
            "path",
            {
              d:
                "M140 151 L115 113 L147 132 Z",
              fill:
                skin
            }
          ),

          svg(
            "path",
            {
              d:
                "M220 151 L245 113 L213 132 Z",
              fill:
                skin
            }
          )
        ].join("")
      );
    }

    return "";
  }


  /* =========================================================
     CHIFRES
     ========================================================= */

  function renderHorns(
    state,
    skin
  ) {
    const rules =
      getRaceRules(
        state
      );

    const appearance =
      getAppearance(
        state
      );

    const horns =
      resolveRaceOption(
        state,
        "horns",
        appearance.horns ||
          "none",
        rules?.horns?.[0] ||
          "none"
      );

    if (
      horns ===
      "none"
    ) {
      return "";
    }

    let size =
      18;

    if (
      horns ===
      "medium"
    ) {
      size =
        25;
    }

    if (
      horns ===
      "large"
    ) {
      size =
        34;
    }

    const fill =
      "#3e332b";

    return group(
      [
        svg(
          "path",
          {
            d:
              `M151 111
               C ${145 - size / 3} ${100 - size / 2},
                 ${144 - size / 2} ${82 - size},
                 155 74
               C 161 84 160 99 158 111 Z`,
            fill
          }
        ),

        svg(
          "path",
          {
            d:
              `M209 111
               C ${215 + size / 3} ${100 - size / 2},
                 ${216 + size / 2} ${82 - size},
                 205 74
               C 199 84 200 99 202 111 Z`,
            fill
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     OLHOS
     ========================================================= */

  function renderEyes(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const shape =
      normalize(
        appearance.eyeShape ||
        appearance.eyesShape ||
        "normal"
      );

    const eyeColor =
      getEyeColor(
        state
      );

    let rx =
      10;

    let ry =
      6;

    if (
      shape ===
      "large" ||
      shape ===
      "round"
    ) {
      ry =
        8;
    }

    if (
      shape ===
      "narrow" ||
      shape ===
      "sleepy"
    ) {
      ry =
        4;
    }

    return group(
      [
        svg(
          "ellipse",
          {
            cx:
              161,
            cy:
              151,
            rx,
            ry,
            fill:
              "#eee9e0"
          }
        ),

        svg(
          "ellipse",
          {
            cx:
              199,
            cy:
              151,
            rx,
            ry,
            fill:
              "#eee9e0"
          }
        ),

        svg(
          "circle",
          {
            cx:
              163,
            cy:
              152,
            r:
              4,
            fill:
              eyeColor
          }
        ),

        svg(
          "circle",
          {
            cx:
              197,
            cy:
              152,
            r:
              4,
            fill:
              eyeColor
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     SOBRANCELHAS
     ========================================================= */

  function renderEyebrows(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const type =
      normalize(
        appearance.eyebrows ||
        "normal"
      );

    const width =
      type ===
      "thick"
        ? 18
        : 15;

    return group(
      [
        svg(
          "path",
          {
            d:
              `M ${160 - width / 2} 137
               Q 161 132
                 ${160 + width / 2} 137`,
            stroke:
              "#3a2d27",
            "stroke-width":
              type ===
              "thin"
                ? 2
                : 3,
            fill:
              "none",
            "stroke-linecap":
              "round"
          }
        ),

        svg(
          "path",
          {
            d:
              `M ${200 - width / 2} 137
               Q 199 132
                 ${200 + width / 2} 137`,
            stroke:
              "#3a2d27",
            "stroke-width":
              type ===
              "thin"
                ? 2
                : 3,
            fill:
              "none",
            "stroke-linecap":
              "round"
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     BOCA / NARIZ
     ========================================================= */

  function renderFaceDetails(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const mouth =
      normalize(
        appearance.mouth ||
        "normal"
      );

    return group(
      [
        svg(
          "path",
          {
            d:
              "M180 155 L176 177 L184 177",
            stroke:
              "rgba(68,48,42,.65)",
            "stroke-width":
              2,
            fill:
              "none",
            "stroke-linecap":
              "round"
          }
        ),

        svg(
          "path",
          {
            d:
              mouth === "thin"
                ? "M172 190 Q180 192 188 190"
                : mouth === "wide"
                  ? "M168 189 Q180 197 192 189"
                  : "M172 189 Q180 194 188 189",
            stroke:
              "#704e46",
            "stroke-width":
              2,
            fill:
              "none",
            "stroke-linecap":
              "round"
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     CABELO
     ========================================================= */

  function renderHair(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const style =
      normalize(
        appearance.hairStyle ||
        appearance.hair ||
        "short"
      );

    const color =
      getHairColor(
        state
      );

    if (
      style ===
      "bald"
    ) {
      return "";
    }

    if (
      style ===
      "long" ||
      style ===
      "very_long"
    ) {
      return group(
        [
          svg(
            "path",
            {
              d:
                "M131 147 C124 106 139 77 180 76 C221 77 236 106 229 147 C222 125 211 112 202 106 C185 95 164 96 150 108 C141 116 136 132 131 147 Z",
              fill:
                color
            }
          ),

          svg(
            "path",
            {
              d:
                "M138 108 C124 159 125 205 145 229 C153 205 158 179 155 142 Z",
              fill:
                color
            }
          ),

          svg(
            "path",
            {
              d:
                "M222 108 C236 159 235 205 215 229 C207 205 202 179 205 142 Z",
              fill:
                color
            }
          )
        ].join("")
      );
    }

    if (
      style ===
      "ponytail" ||
      style ===
      "high_ponytail"
    ) {
      return group(
        [
          svg(
            "path",
            {
              d:
                "M132 147 C126 103 145 78 180 78 C215 78 234 103 228 147 C221 121 209 107 195 101 C174 92 148 104 132 147 Z",
              fill:
                color
            }
          ),

          svg(
            "path",
            {
              d:
                "M219 100 C245 87 257 63 252 44 C270 71 263 100 237 122 Z",
              fill:
                color
            }
          )
        ].join("")
      );
    }

    if (
      style ===
      "bun"
    ) {
      return group(
        [
          svg(
            "circle",
            {
              cx:
                180,
              cy:
                69,
              r:
                26,
              fill:
                color
            }
          ),

          svg(
            "path",
            {
              d:
                "M135 147 C130 105 145 82 180 78 C215 82 230 105 225 147 C217 121 205 108 193 103 C174 95 150 106 135 147 Z",
              fill:
                color
            }
          )
        ].join("")
      );
    }

    return svg(
      "path",
      {
        d:
          "M134 146 C129 104 146 79 180 77 C214 79 231 104 226 146 C219 122 207 109 195 104 C177 96 150 106 134 146 Z",
        fill:
          color
      }
    );
  }


  /* =========================================================
     ROUPA BASE
     ========================================================= */

  function renderClothing(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const style =
      normalize(
        appearance.clothingStyle ||
        appearance.clothing ||
        ""
      );

    if (
      !style ||
      style ===
        "none"
    ) {
      return "";
    }

    const material =
      "#403b36";

    if (
      style ===
      "adventurer" ||
      style ===
      "traveler"
    ) {
      return group(
        [
          svg(
            "path",
            {
              d:
                "M143 232 L217 232 L229 361 Q205 382 180 383 Q155 382 131 361 Z",
              fill:
                material
            }
          ),

          svg(
            "path",
            {
              d:
                "M146 231 L174 231 L180 348 L186 231 L214 231 L208 212 L152 212 Z",
              fill:
                "#d9d0c3"
            }
          ),

          svg(
            "path",
            {
              d:
                "M144 250 L216 250",
              stroke:
                "#6a5b4d",
              "stroke-width":
                3
            }
          )
        ].join("")
      );
    }

    if (
      style ===
      "mage" ||
      style ===
      "cleric" ||
      style ===
      "robe"
    ) {
      return svg(
        "path",
        {
          d:
            "M145 222 L215 222 L235 390 Q180 414 125 390 Z",
          fill:
            "#3c3941"
        }
      );
    }

    if (
      style ===
      "military"
    ) {
      return group(
        [
          svg(
            "path",
            {
              d:
                "M145 225 L180 240 L215 225 L225 354 Q180 375 135 354 Z",
              fill:
                "#343536"
            }
          ),

          svg(
            "path",
            {
              d:
                "M180 241 L180 358",
              stroke:
                "#87714d",
              "stroke-width":
                5
            }
          )
        ].join("")
      );
    }

    return svg(
      "path",
      {
        d:
          "M145 225 L215 225 L222 358 Q180 378 138 358 Z",
        fill:
          "#48423d"
      }
    );
  }


  /* =========================================================
     ARMADURA
     ========================================================= */

  function renderArmor(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const armor =
      normalize(
        appearance.armor ||
        "none"
      );

    if (
      !armor ||
      armor ===
        "none"
    ) {
      return "";
    }

    let fill =
      "#57595a";

    if (
      armor ===
      "leather"
    ) {
      fill =
        "#5b3e2c";
    }

    if (
      armor ===
      "plate"
    ) {
      fill =
        "#777b7c";
    }

    return group(
      [
        svg(
          "path",
          {
            d:
              "M141 226 L164 215 L180 229 L196 215 L219 226 L214 300 Q180 314 146 300 Z",
            fill
          }
        ),

        svg(
          "path",
          {
            d:
              "M141 230 L119 246 L128 285 L146 279 L146 247 Z",
            fill
          }
        ),

        svg(
          "path",
          {
            d:
              "M219 230 L241 246 L232 285 L214 279 L214 247 Z",
            fill
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     BOTAS
     ========================================================= */

  function renderBoots(
    state
  ) {
    const boots =
      normalize(
        getAppearance(
          state
        ).boots
      );

    if (
      !boots ||
      boots ===
        "none"
    ) {
      return "";
    }

    return group(
      [
        svg(
          "path",
          {
            d:
              "M135 500 L169 500 L168 548 L125 550 Q119 541 126 532 Z",
            fill:
              "#493329"
          }
        ),

        svg(
          "path",
          {
            d:
              "M191 500 L225 500 L234 532 Q241 541 235 550 L191 548 Z",
            fill:
              "#493329"
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     ASAS
     ========================================================= */

  function renderWings(
    state
  ) {
    const rules =
      getRaceRules(
        state
      );

    const appearance =
      getAppearance(
        state
      );

    const wingType =
      resolveRaceOption(
        state,
        "wings",
        appearance.wings ||
          "none",
        rules?.wings?.[0] ||
          "none"
      );

    if (
      wingType ===
      "none"
    ) {
      return "";
    }

    let fill =
      "#d5d2c9";

    if (
      wingType ===
      "bat"
    ) {
      fill =
        "#4a3e46";
    }

    if (
      wingType ===
      "magical"
    ) {
      fill =
        "#8a739d";
    }

    return group(
      [
        svg(
          "path",
          {
            d:
              "M149 234 C118 202 83 205 56 227 C76 230 95 239 109 255 C88 251 70 258 52 271 C90 277 118 274 148 260 Z",
            fill,
            opacity:
              .95
          }
        ),

        svg(
          "path",
          {
            d:
              "M211 234 C242 202 277 205 304 227 C284 230 265 239 251 255 C272 251 290 258 308 271 C270 277 242 274 212 260 Z",
            fill,
            opacity:
              .95
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     CAUDA
     ========================================================= */

  function renderTail(
    state
  ) {
    const rules =
      getRaceRules(
        state
      );

    const appearance =
      getAppearance(
        state
      );

    const tail =
      resolveRaceOption(
        state,
        "tail",
        appearance.tail ||
          "none",
        rules?.tail?.[0] ||
          "none"
      );

    if (
      tail ===
      "none"
    ) {
      return "";
    }

    const color =
      getAnimalColor(
        state
      );

    const path =
      tail ===
      "fox"
        ? "M215 335 C253 348 268 378 246 403 C238 412 228 410 228 400 C253 383 236 363 211 356 Z"
        : tail ===
          "reptile"
          ? "M213 343 C255 350 280 378 291 413 C270 409 248 394 221 370 Z"
          : "M212 342 C246 350 261 374 252 398 C245 414 230 416 224 405 C242 390 236 369 210 361 Z";

    return svg(
      "path",
      {
        d:
          path,
        fill:
          color,
        "fill-opacity":
          .95
      }
    );
  }


  /* =========================================================
     MARCAS
     ========================================================= */

  function renderMarkings(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const marking =
      normalize(
        appearance.markings
      );

    if (
      !marking ||
      marking ===
        "none"
    ) {
      return "";
    }

    if (
      marking ===
      "freckles"
    ) {
      const dots =
        [
          [160, 169],
          [166, 172],
          [172, 168],
          [188, 168],
          [194, 172],
          [200, 169]
        ];

      return group(
        dots
          .map(
            ([cx, cy]) =>
              svg(
                "circle",
                {
                  cx,
                  cy,
                  r:
                    2.2,
                  fill:
                    "#7d5d4d"
                }
              )
          )
          .join("")
      );
    }

    if (
      marking ===
      "stripes"
    ) {
      return group(
        [
          svg(
            "path",
            {
              d:
                "M150 260 L166 276",
              stroke:
                "rgba(40,30,24,.4)",
              "stroke-width":
                5
            }
          ),

          svg(
            "path",
            {
              d:
                "M210 260 L194 276",
              stroke:
                "rgba(40,30,24,.4)",
              "stroke-width":
                5
            }
          )
        ].join("")
      );
    }

    return "";
  }


  /* =========================================================
     CICATRIZES
     ========================================================= */

  function renderScars(
    state
  ) {
    const scars =
      normalize(
        getAppearance(
          state
        ).scars
      );

    if (
      !scars ||
      scars ===
        "none"
    ) {
      return "";
    }

    return group(
      [
        svg(
          "path",
          {
            d:
              "M174 179 L168 186 M177 179 L171 188",
            stroke:
              "#825e58",
            "stroke-width":
              2,
            "stroke-linecap":
              "round"
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     TATUAGENS
     ========================================================= */

  function renderTattoos(
    state
  ) {
    const tattoo =
      normalize(
        getAppearance(
          state
        ).tattoos
      );

    if (
      !tattoo ||
      tattoo ===
        "none"
    ) {
      return "";
    }

    return group(
      [
        svg(
          "path",
          {
            d:
              "M150 290 Q180 270 210 290",
            stroke:
              "#30353b",
            "stroke-width":
              4,
            fill:
              "none",
            "stroke-linecap":
              "round"
          }
        ),

        svg(
          "circle",
          {
            cx:
              180,
            cy:
              289,
            r:
              5,
            fill:
              "#30353b"
          }
        )
      ].join("")
    );
  }


  /* =========================================================
     NASCIMENTO
     ========================================================= */

  function renderBirthmark(
    state
  ) {
    const birthmark =
      normalize(
        getAppearance(
          state
        ).birthmark
      );

    if (
      !birthmark ||
      birthmark ===
        "none"
    ) {
      return "";
    }

    return svg(
      "path",
      {
        d:
          "M207 158 C214 151 220 159 216 167 C212 174 202 173 202 164 C202 160 204 159 207 158 Z",
        fill:
          "rgba(150,90,80,.42)"
      }
    );
  }


  /* =========================================================
     PIERCINGS / JOIAS
     ========================================================= */

  function renderJewelry(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    const piercing =
      normalize(
        appearance.piercings
      );

    const necklace =
      normalize(
        appearance.necklace
      );

    let result =
      "";

    if (
      piercing &&
      piercing !==
        "none"
    ) {
      result +=
        svg(
          "circle",
          {
            cx:
              225,
            cy:
              158,
            r:
              3,
            fill:
              "#d7bd75"
          }
        );
    }

    if (
      necklace &&
      necklace !==
        "none"
    ) {
      result +=
        svg(
          "path",
          {
            d:
              "M159 202 Q180 226 201 202",
            stroke:
              "#c9ad67",
            "stroke-width":
              2,
            fill:
              "none"
          }
        );
    }

    return result;
  }


  /* =========================================================
     ACESSÓRIOS
     ========================================================= */

  function renderAccessories(
    state
  ) {
    const appearance =
      getAppearance(
        state
      );

    let result =
      "";

    if (
      appearance.glasses &&
      normalize(
        appearance.glasses
      ) !==
        "none"
    ) {
      result +=
        group(
          [
            svg(
              "rect",
              {
                x:
                  150,
                y:
                  143,
                width:
                  21,
                height:
                  13,
                rx:
                  5,
                fill:
                  "none",
                stroke:
                  "#81705f",
                "stroke-width":
                  2
              }
            ),

            svg(
              "rect",
              {
                x:
                  189,
                y:
                  143,
                width:
                  21,
                height:
                  13,
                rx:
                  5,
                fill:
                  "none",
                stroke:
                  "#81705f",
                "stroke-width":
                  2
              }
            ),

            svg(
              "path",
              {
                d:
                  "M171 149 L189 149",
                stroke:
                  "#81705f",
                "stroke-width":
                  2
              }
            )
          ].join("")
        );
    }

    if (
      appearance.hat &&
      normalize(
        appearance.hat
      ) !==
        "none"
    ) {
      result +=
        svg(
          "path",
          {
            d:
              "M141 102 Q180 67 219 102 L211 110 L149 110 Z",
            fill:
              "#2f2a28"
          }
        );
    }

    if (
      appearance.mask &&
      normalize(
        appearance.mask
      ) !==
        "none"
    ) {
      result +=
        svg(
          "path",
          {
            d:
              "M149 165 Q180 179 211 165 L207 191 Q180 202 153 191 Z",
            fill:
              "#343238"
          }
        );
    }

    return result;
  }


  /* =========================================================
     CAMADAS RACIAIS
     ========================================================= */

  function renderAnimalAnatomy(
    state
  ) {
    const animal =
      getAnimalData(
        state
      );

    if (
      !animal
    ) {
      return "";
    }

    let result =
      "";

    if (
      Array.isArray(
        animal.feathers
      ) &&
      animal.wings?.length
    ) {
      result +=
        renderWings(
          {
            ...state,
            appearance: {
              ...getAppearance(
                state
              ),
              wings:
                animal.wings[0]
            }
          }
        );
    }

    return result;
  }


  /* =========================================================
     MONTE PERSONAGEM
     ========================================================= */

  function buildCharacter(
    state
  ) {
    const dimensions =
      getDimensions(
        state
      );

    const skin =
      getSkinColor(
        state
      );

    const scaleX =
      dimensions.bodyWidth;

    const centerX =
      180;

    const transform =
      `translate(${centerX} 0) scale(${scaleX < 1 ? 1 : 1}) translate(-${centerX} 0)`;

    const layers = [];

    layers.push(
      renderShadow(
        dimensions
      )
    );

    layers.push(
      renderTail(
        state
      )
    );

    layers.push(
      renderWings(
        state
      )
    );

    layers.push(
      renderAnimalAnatomy(
        state
      )
    );

    layers.push(
      renderLegs(
        state,
        dimensions,
        skin
      )
    );

    layers.push(
      renderFeet(
        state,
        dimensions,
        skin
      )
    );

    layers.push(
      renderBody(
        dimensions,
        skin,
        state
      )
    );

    layers.push(
      renderArms(
        dimensions,
        skin
      )
    );

    layers.push(
      renderNeck(
        skin
      )
    );

    layers.push(
      renderClothing(
        state
      )
    );

    layers.push(
      renderArmor(
        state
      )
    );

    layers.push(
      renderHead(
        state,
        dimensions,
        skin
      )
    );

    layers.push(
      renderEars(
        state,
        skin
      )
    );

    layers.push(
      renderHorns(
        state,
        skin
      )
    );

    layers.push(
      renderEyes(
        state
      )
    );

    layers.push(
      renderEyebrows(
        state
      )
    );

    layers.push(
      renderFaceDetails(
        state
      )
    );

    layers.push(
      renderMarkings(
        state
      )
    );

    layers.push(
      renderBirthmark(
        state
      )
    );

    layers.push(
      renderScars(
        state
      )
    );

    layers.push(
      renderTattoos(
        state
      )
    );

    layers.push(
      renderHair(
        state
      )
    );

    layers.push(
      renderBoots(
        state
      )
    );

    layers.push(
      renderJewelry(
        state
      )
    );

    layers.push(
      renderAccessories(
        state
      )
    );

    return {
      svg:
        buildSvg(
          layers.join(""),
          state
        ),

      dimensions
    };
  }


  /* =========================================================
     SVG FINAL
     ========================================================= */

  function buildSvg(
    content,
    state
  ) {
    const race =
      getRaceId(
        state
      );

    const animal =
      getAnimalData(
        state
      );

    return `
      <svg
        class="aerion-character-svg"
        viewBox="${CONFIG.viewBox}"
        width="${CONFIG.width}"
        height="${CONFIG.height}"
        role="img"
        aria-label="Visualização do personagem"
        data-race="${esc(race)}"
        data-animalha="${esc(
          animal?.id || ""
        )}"
      >
        <defs>
          <radialGradient
            id="aerionCharacterGlow"
            cx="50%"
            cy="45%"
            r="60%"
          >
            <stop
              offset="0%"
              stop-color="#8e7650"
              stop-opacity=".16"
            />

            <stop
              offset="100%"
              stop-color="#000000"
              stop-opacity="0"
            />
          </radialGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width="360"
          height="620"
          fill="url(#aerionCharacterGlow)"
          rx="28"
        />

        ${content}
      </svg>
    `;
  }


  /* =========================================================
     RENDER
     ========================================================= */

  function render(
    state = null
  ) {
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

    const resolvedState =
      state ||
      readFichaState();

    currentState =
      resolvedState;

    try {
      const character =
        buildCharacter(
          resolvedState
        );

      root.innerHTML =
        character.svg;

      root.dataset.race =
        getRaceId(
          resolvedState
        );

      root.dataset.height =
        String(
          character.dimensions.height
        );

      root.dispatchEvent(
        new CustomEvent(
          CONFIG.updateEvent,
          {
            bubbles:
              true,

            detail: {
              state:
                resolvedState,

              dimensions:
                character.dimensions
            }
          }
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          CONFIG.updateEvent,
          {
            detail: {
              state:
                resolvedState,

              dimensions:
                character.dimensions
            }
          }
        )
      );

      return true;

    } catch (
      error
    ) {
      console.error(
        "[AERION][PERSONAGEM] Falha ao renderizar personagem:",
        error
      );

      return false;
    }
  }


  /* =========================================================
     RENDER AGENDADO
     ========================================================= */

  function scheduleRender() {
    if (
      renderScheduled
    ) {
      return;
    }

    renderScheduled =
      true;

    requestAnimationFrame(
      () => {
        renderScheduled =
          false;

        render();
      }
    );
  }


  /* =========================================================
     API PÚBLICA
     ========================================================= */

  const API = {

    init() {
      root =
        document.querySelector(
          CONFIG.rootSelector
        );

      if (
        !root
      ) {
        return false;
      }

      render();

      if (
        typeof ResizeObserver !==
          "undefined"
      ) {
        resizeObserver =
          new ResizeObserver(
            () => {
              scheduleRender();
            }
          );

        resizeObserver.observe(
          root
        );
      }

      return true;
    },

    render,

    refresh:
      scheduleRender,

    getState() {
      return currentState;
    },

    getRoot() {
      return root;
    },

    destroy() {
      if (
        resizeObserver
      ) {
        resizeObserver.disconnect();
        resizeObserver =
          null;
      }

      if (
        root
      ) {
        root.innerHTML =
          "";
      }

      root =
        null;

      currentState =
        null;
    }
  };


  /* =========================================================
     EXPORTAR
     ========================================================= */

  window.AERIONPersonagemRender =
    Object.freeze(
      API
    );


  /* =========================================================
     COMPATIBILIDADE
     ========================================================= */

  window.AERION_CHARACTER_RENDER =
    window.AERIONPersonagemRender;


  /* =========================================================
     EVENTOS DA FICHA
     ========================================================= */

  window.addEventListener(
    "aerion:ficha:updated",
    scheduleRender
  );

  window.addEventListener(
    "aeriom:ficha:updated",
    scheduleRender
  );

  window.addEventListener(
    "aerion:personagem-assets:ready",
    scheduleRender
  );


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function boot() {
    const started =
      API.init();

    if (
      !started
    ) {
      /*
       * O HTML pode ainda não existir.
       * Tenta novamente no próximo frame.
       */
      requestAnimationFrame(
        () => {
          API.init();
        }
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