/* =========================================================
   AERION — PERSONAGEM RENDER
   js/core/personagem-render.js

   FUNÇÃO:
   - Visualizador da aparência
   - Usa a imagem REAL da raça selecionada
   - Ajusta escala conforme altura
   - Prepara a área para futuras camadas de aparência
   - Não cria boneco genérico
   - Não controla atributos/dados
   ========================================================= */

(() => {
  "use strict";

  const CONFIG = Object.freeze({
    rootSelector: "#appearanceFigure",

    imageSelector: "#raceImage",

    raceImageSelector: "#raceImage",

    minScale: 0.78,
    maxScale: 1.24,

    transition:
      220
  });

  let root = null;
  let lastState = null;
  let raceImageObserver = null;


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }


  function safeNumber(
    value,
    fallback = 0
  ) {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
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


  function getFicha() {
    return (
      window.AERIONFicha ||
      window.AERION_FICHA ||
      null
    );
  }


  function getState() {
    const ficha =
      getFicha();

    if (
      ficha &&
      typeof ficha.getState ===
        "function"
    ) {
      try {
        return ficha.getState();
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


  /* =========================================================
     ALTURA
     ========================================================= */

  function getRaceHeightRange(
    state
  ) {
    const min =
      safeNumber(
        state?.raceData?.height?.min,
        150
      );

    const max =
      safeNumber(
        state?.raceData?.height?.max,
        200
      );

    return {
      min,
      max:
        Math.max(
          min,
          max
        )
    };
  }


  function getCurrentHeight(
    state
  ) {
    const range =
      getRaceHeightRange(
        state
      );

    const requested =
      safeNumber(
        state?.appearance?.height,
        (range.min + range.max) / 2
      );

    return clamp(
      requested,
      range.min,
      range.max
    );
  }


  function calculateScale(
    state
  ) {
    const range =
      getRaceHeightRange(
        state
      );

    const height =
      getCurrentHeight(
        state
      );

    const progress =
      (
        height -
        range.min
      ) /
      Math.max(
        1,
        range.max -
        range.min
      );

    return (
      CONFIG.minScale +
      (
        CONFIG.maxScale -
        CONFIG.minScale
      ) *
      progress
    );
  }


  /* =========================================================
     IMAGEM DA RAÇA
     ========================================================= */

  function getRaceImage() {
    return $(
      CONFIG.raceImageSelector
    );
  }


  function getRaceImageSource() {
    const image =
      getRaceImage();

    if (
      !image
    ) {
      return "";
    }

    return (
      image.currentSrc ||
      image.src ||
      image.getAttribute(
        "src"
      ) ||
      ""
    );
  }


  function getRaceImageAlt() {
    const image =
      getRaceImage();

    return (
      image?.alt ||
      ""
    );
  }


  /* =========================================================
     TEMPLATE
     ========================================================= */

  function buildViewer() {
    return `
      <div class="aerion-character-viewer">

        <div
          class="aerion-character-viewer-stage"
          data-character-stage
        >

          <div
            class="aerion-character-glow"
            aria-hidden="true"
          ></div>

          <div
            class="aerion-character-image-layer"
            data-character-image-layer
          ></div>

          <div
            class="aerion-character-overlay"
            data-character-overlay
          ></div>

        </div>

        <div
          class="aerion-character-height-guide"
          aria-hidden="true"
        >
          <span>MAX</span>
          <span>MIN</span>
        </div>

      </div>
    `;
  }


  /* =========================================================
     GARANTIR ESTRUTURA
     ========================================================= */

  function ensureViewer() {
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

    let viewer =
      root.querySelector(
        ".aerion-character-viewer"
      );

    if (
      !viewer
    ) {
      root.innerHTML =
        buildViewer();

      viewer =
        root.querySelector(
          ".aerion-character-viewer"
        );
    }

    return Boolean(
      viewer
    );
  }


  /* =========================================================
     RENDERIZAR IMAGEM
     ========================================================= */

  function renderRaceImage(
    state
  ) {
    if (
      !ensureViewer()
    ) {
      return;
    }

    const layer =
      root.querySelector(
        "[data-character-image-layer]"
      );

    if (
      !layer
    ) {
      return;
    }

    const source =
      getRaceImageSource();

    const alt =
      getRaceImageAlt() ||
      "Personagem";


    if (
      !source
    ) {
      layer.innerHTML = `
        <div
          class="aerion-character-image-empty"
          role="status"
        >
          <span>Imagem da raça não disponível.</span>
        </div>
      `;

      return;
    }


    /*
     * Evita reconstruir a imagem toda vez que apenas
     * um slider muda.
     */
    let image =
      layer.querySelector(
        "img"
      );


    if (
      !image
    ) {
      image =
        document.createElement(
          "img"
        );

      image.className =
        "aerion-character-base-image";

      image.decoding =
        "async";

      image.loading =
        "eager";

      image.draggable =
        false;

      image.setAttribute(
        "aria-hidden",
        "true"
      );

      layer.appendChild(
        image
      );
    }


    if (
      image.src !==
      source
    ) {

      image.style.opacity =
        "0";

      image.src =
        source;

      image.onload =
        () => {
          image.style.opacity =
            "1";
        };

      image.onerror =
        () => {
          image.style.opacity =
            "0";
        };
    }


    image.alt =
      alt;


    applyHeight(
      state
    );
  }


  /* =========================================================
     ALTURA VISUAL
     ========================================================= */

  function applyHeight(
    state
  ) {
    if (
      !root
    ) {
      return;
    }

    const image =
      root.querySelector(
        ".aerion-character-base-image"
      );

    if (
      !image
    ) {
      return;
    }

    const scale =
      calculateScale(
        state
      );


    /*
     * O tamanho real da imagem não é alterado.
     * Apenas sua escala visual muda.
     */
    image.style.transform =
      `translate(-50%, 0) scale(${scale})`;


    /*
     * Mantém os pés próximos da mesma linha de base.
     */
    const heightGuide =
      root.querySelector(
        ".aerion-character-height-guide"
      );

    if (
      heightGuide
    ) {
      const range =
        getRaceHeightRange(
          state
        );

      const height =
        getCurrentHeight(
          state
        );

      const progress =
        (
          height -
          range.min
        ) /
        Math.max(
          1,
          range.max -
          range.min
        );

      heightGuide.dataset.progress =
        String(
          progress
        );
    }


    root.dataset.characterHeight =
      String(
        getCurrentHeight(
          state
        )
      );
  }


  /* =========================================================
     ATUALIZAÇÃO
     ========================================================= */

  function render(
    state = null
  ) {
    lastState =
      state ||
      getState();


    if (
      !ensureViewer()
    ) {
      return false;
    }


    renderRaceImage(
      lastState
    );


    emitCharacterUpdate(
      lastState
    );

    return true;
  }


  function emitCharacterUpdate(
    state
  ) {
    const event =
      new CustomEvent(
        "aerion:personagem:rendered",
        {
          detail: {
            state,
            height:
              getCurrentHeight(
                state
              ),
            scale:
              calculateScale(
                state
              )
          }
        }
      );


    window.dispatchEvent(
      event
    );
  }


  /* =========================================================
     EVENTOS
     ========================================================= */

  function onRaceChanged() {
    /*
     * O ficha-render atualiza #raceImage.
     * Esperamos a atualização do DOM e então copiamos
     * a mesma imagem para o visualizador.
     */

    window.setTimeout(
      () => {
        render(
          getState()
        );
      },
      0
    );
  }


  function onFichaChanged(
    event
  ) {
    const nextState =
      event?.detail?.state ||
      getState();

    lastState =
      nextState;

    /*
     * Se mudou apenas altura/aparência,
     * não precisamos reconstruir tudo.
     */
    if (
      ensureViewer()
    ) {
      const image =
        root.querySelector(
          ".aerion-character-base-image"
        );

      const currentSource =
        getRaceImageSource();

      if (
        image &&
        currentSource &&
        image.src ===
          currentSource
      ) {
        applyHeight(
          nextState
        );

        return;
      }
    }

    render(
      nextState
    );
  }


  /* =========================================================
     OBSERVAR #raceImage
     ========================================================= */

  function watchRaceImage() {
    const image =
      getRaceImage();

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
          onRaceChanged();
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
            "srcset",
            "alt"
          ]
      }
    );


    image.addEventListener(
      "load",
      onRaceChanged
    );
  }


  /* =========================================================
     API
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

      watchRaceImage();

      return true;
    },


    render,


    refresh() {
      render(
        getState()
      );
    },


    setHeight(
      height
    ) {
      const ficha =
        getFicha();

      if (
        ficha &&
        typeof ficha.setAppearance ===
          "function"
      ) {
        ficha.setAppearance(
          "height",
          safeNumber(
            height
          )
        );

        return true;
      }

      return false;
    },


    getHeight() {
      return getCurrentHeight(
        getState()
      );
    },


    getScale() {
      return calculateScale(
        getState()
      );
    },


    getRoot() {
      return root;
    },


    destroy() {
      if (
        raceImageObserver
      ) {
        raceImageObserver.disconnect();

        raceImageObserver =
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

      lastState =
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

  window.AERION_CHARACTER_RENDER =
    window.AERIONPersonagemRender;


  /* =========================================================
     EVENTOS DA APLICAÇÃO
     ========================================================= */

  window.addEventListener(
    "aerion:ficha:updated",
    onFichaChanged
  );


  window.addEventListener(
    "aerion:race:selected",
    onRaceChanged
  );


  window.addEventListener(
    "aerion:race:changed",
    onRaceChanged
  );


  window.addEventListener(
    "aerion:appearance:updated",
    event => {
      onFichaChanged(
        {
          detail: {
            state:
              event?.detail?.state ||
              getState()
          }
        }
      );
    }
  );


  window.addEventListener(
    "aerion:ficha:render",
    event => {
      render(
        event?.detail?.state ||
        getState()
      );
    }
  );


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