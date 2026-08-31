/* =========================================================
   AERION — PERSONAGEM RENDER
   js/core/personagem-render.js

   VERSÃO SIMPLIFICADA

   RESPONSABILIDADE:
   - mostrar a imagem da raça escolhida;
   - escolher imagem masculina/feminina;
   - controlar tamanho visual;
   - ajustar o personagem conforme a altura;
   - mostrar carregamento da imagem;
   - tratar erro de carregamento.

   NÃO RESPONSÁVEL POR:
   - desenhar personagem;
   - criar corpo por SVG;
   - atributos;
   - dados;
   - rolagens;
   - regras;
   - persistência.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({

    rootSelector:
      "#appearanceFigure",

    minScale:
      0.78,

    maxScale:
      1.24,

    defaultHeight:
      175,

    defaultMinHeight:
      150,

    defaultMaxHeight:
      200

  });


  /* =========================================================
     ESTADO INTERNO
     ========================================================= */

  let root =
    null;

  let currentImage =
    null;

  let currentSrc =
    "";

  let resizeObserver =
    null;


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function $(selector, parent = document) {
    return parent.querySelector(
      selector
    );
  }


  function number(
    value,
    fallback = 0
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
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


  function getFicha() {
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

        return {};
      }
    }

    return {};
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function getRace(
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
      typeof assets.getRace ===
      "function"
    ) {
      return assets.getRace(
        state?.race
      );
    }

    const races =
      assets.races ||
      [];

    const wanted =
      normalize(
        state?.race
      );

    return (
      races.find(
        race =>
          normalize(
            race.id
          ) ===
          wanted
      ) ||
      null
    );
  }


  /* =========================================================
     GÊNERO
     ========================================================= */

  function getGender(
    state
  ) {

    const gender =
      normalize(
        state?.gender
      );


    if (
      gender ===
        "feminino" ||
      gender ===
        "feminina" ||
      gender ===
        "female" ||
      gender ===
        "f"
    ) {
      return "feminino";
    }


    return "masculino";
  }


  /* =========================================================
     URL DA IMAGEM
     ========================================================= */

  function getRaceImage(
    state
  ) {

    const assets =
      getAssets();

    const race =
      getRace(
        state
      );

    if (
      !race
    ) {
      return "";
    }


    const gender =
      getGender(
        state
      );


    /*
     * Primeiro usa a API oficial do catálogo.
     */

    if (
      assets &&
      typeof assets.getRaceImage ===
        "function"
    ) {

      const image =
        assets.getRaceImage(
          race.id,
          gender
        );

      if (
        image
      ) {
        return image;
      }
    }


    /*
     * Fallback direto no objeto da raça.
     */

    const selected =
      race.images?.[
        gender
      ];


    if (
      selected
    ) {
      return selected;
    }


    /*
     * Se não existir imagem daquele gênero,
     * tenta a outra.
     */

    const fallback =
      gender ===
        "feminino"
        ? race.images?.masculino
        : race.images?.feminino;


    return (
      fallback ||
      ""
    );
  }


  /* =========================================================
     ALTURA DA RAÇA
     ========================================================= */

  function getHeightRange(
    state
  ) {

    const assets =
      getAssets();

    const race =
      getRace(
        state
      );


    if (
      assets &&
      typeof assets.getRaceHeight ===
        "function"
    ) {

      const range =
        assets.getRaceHeight(
          race?.id
        );

      if (
        range
      ) {
        return {
          min:
            number(
              range.min,
              CONFIG.defaultMinHeight
            ),

          max:
            number(
              range.max,
              CONFIG.defaultMaxHeight
            )
        };
      }
    }


    return {
      min:
        number(
          race?.height?.min,
          CONFIG.defaultMinHeight
        ),

      max:
        number(
          race?.height?.max,
          CONFIG.defaultMaxHeight
        )
    };
  }


  /* =========================================================
     ALTURA ATUAL
     ========================================================= */

  function getCurrentHeight(
    state
  ) {

    const range =
      getHeightRange(
        state
      );


    const requested =
      number(
        state?.appearance?.height,
        (
          range.min +
          range.max
        ) / 2
      );


    return clamp(
      requested,
      range.min,
      range.max
    );
  }


  /* =========================================================
     ESCALA
     ========================================================= */

  function calculateScale(
    state
  ) {

    const range =
      getHeightRange(
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
     CRIAR ESTRUTURA
     ========================================================= */

  function createViewer() {

    if (
      !root
    ) {
      return false;
    }


    root.classList.add(
      "aerion-character-render"
    );


    let stage =
      root.querySelector(
        "[data-character-stage]"
      );


    if (
      stage
    ) {
      return true;
    }


    stage =
      document.createElement(
        "div"
      );

    stage.className =
      "aerion-character-stage";

    stage.dataset.characterStage =
      "true";


    const glow =
      document.createElement(
        "div"
      );

    glow.className =
      "aerion-character-glow";

    glow.setAttribute(
      "aria-hidden",
      "true"
    );


    const imageLayer =
      document.createElement(
        "div"
      );

    imageLayer.className =
      "aerion-character-image-layer";

    imageLayer.dataset.characterImageLayer =
      "true";


    const loading =
      document.createElement(
        "div"
      );

    loading.className =
      "aerion-character-loading";

    loading.dataset.characterLoading =
      "true";

    loading.innerHTML = `
      <div class="aerion-character-spinner"
           aria-hidden="true"></div>
      <span>Carregando personagem...</span>
    `;


    const error =
      document.createElement(
        "div"
      );

    error.className =
      "aerion-character-error";

    error.dataset.characterError =
      "true";

    error.hidden =
      true;

    error.innerHTML = `
      <span>Não foi possível carregar a imagem da raça.</span>
    `;


    stage.appendChild(
      glow
    );

    stage.appendChild(
      imageLayer
    );

    stage.appendChild(
      loading
    );

    stage.appendChild(
      error
    );


    root.innerHTML =
      "";


    root.appendChild(
      stage
    );


    return true;
  }


  /* =========================================================
     ELEMENTOS
     ========================================================= */

  function getImageLayer() {

    return root?.querySelector(
      "[data-character-image-layer]"
    );
  }


  function getLoading() {

    return root?.querySelector(
      "[data-character-loading]"
    );
  }


  function getError() {

    return root?.querySelector(
      "[data-character-error]"
    );
  }


  /* =========================================================
     LOADING
     ========================================================= */

  function setLoading(
    value
  ) {

    if (
      !root
    ) {
      return;
    }


    root.classList.toggle(
      "is-loading",
      Boolean(
        value
      )
    );


    const loading =
      getLoading();


    if (
      loading
    ) {
      loading.hidden =
        !value;
    }
  }


  /* =========================================================
     ERRO
     ========================================================= */

  function setError(
    value
  ) {

    if (
      !root
    ) {
      return;
    }


    root.classList.toggle(
      "has-error",
      Boolean(
        value
      )
    );


    const error =
      getError();


    if (
      error
    ) {
      error.hidden =
        !value;
    }
  }


  /* =========================================================
     IMAGEM
     ========================================================= */

  function renderImage(
    state
  ) {

    if (
      !createViewer()
    ) {
      return false;
    }


    const layer =
      getImageLayer();


    if (
      !layer
    ) {
      return false;
    }


    const src =
      getRaceImage(
        state
      );


    const race =
      getRace(
        state
      );


    const gender =
      getGender(
        state
      );


    const alt =
      race
        ? `${race.name} — ${gender}`
        : "Personagem";


    setError(
      false
    );


    /*
     * Sem imagem.
     */

    if (
      !src
    ) {

      layer.innerHTML = `
        <div class="aerion-character-empty">
          <span>Imagem da raça indisponível.</span>
        </div>
      `;

      currentSrc =
        "";

      currentImage =
        null;

      setLoading(
        false
      );

      return false;
    }


    /*
     * Se a mesma imagem já está carregada,
     * somente atualiza a escala.
     */

    if (
      currentImage &&
      currentSrc ===
        src
    ) {

      applyScale(
        state
      );

      return true;
    }


    setLoading(
      true
    );


    layer.innerHTML =
      "";


    const image =
      document.createElement(
        "img"
      );


    image.className =
      "aerion-character-base-image";


    image.alt =
      alt;


    image.decoding =
      "async";


    image.loading =
      "eager";


    image.draggable =
      false;


    image.fetchPriority =
      "high";


    image.setAttribute(
      "aria-hidden",
      "true"
    );


    image.style.opacity =
      "0";


    image.style.transition =
      "opacity 180ms ease, transform 220ms ease";


    image.onload =
      () => {

        image.style.opacity =
          "1";

        setLoading(
          false
        );

        setError(
          false
        );


        applyScale(
          state
        );


        window.dispatchEvent(
          new CustomEvent(
            "aerion:personagem:image-loaded",
            {
              detail: {
                race:
                  race?.id ||
                  "",

                gender,

                src
              }
            }
          )
        );
      };


    image.onerror =
      () => {

        setLoading(
          false
        );

        setError(
          true
        );


        image.style.opacity =
          "0";


        window.dispatchEvent(
          new CustomEvent(
            "aerion:personagem:image-error",
            {
              detail: {
                race:
                  race?.id ||
                  "",

                gender,

                src
              }
            }
          )
        );
      };


    layer.appendChild(
      image
    );


    currentImage =
      image;


    currentSrc =
      src;


    image.src =
      src;


    /*
     * Se o navegador já tiver resolvido a imagem
     * imediatamente, o onload ainda cuidará disso.
     */

    return true;
  }


  /* =========================================================
     APLICAR ESCALA
     ========================================================= */

  function applyScale(
    state
  ) {

    if (
      !currentImage
    ) {
      return;
    }


    const scale =
      calculateScale(
        state
      );


    currentImage.style.transform =
      `translateX(-50%) scale(${scale})`;


    if (
      root
    ) {

      root.dataset.height =
        String(
          getCurrentHeight(
            state
          )
        );


      root.dataset.scale =
        String(
          scale
        );
    }
  }


  /* =========================================================
     RENDER
     ========================================================= */

  function render(
    state = null
  ) {

    const resolved =
      state ||
      getState();


    return renderImage(
      resolved
    );
  }


  /* =========================================================
     ATUALIZAÇÃO DO ESTADO
     ========================================================= */

  function onFichaUpdated(
    event
  ) {

    const state =
      event?.detail?.state ||
      getState();


    render(
      state
    );
  }


  /* =========================================================
     EVENTOS DE RAÇA
     ========================================================= */

  function onRaceChanged() {

    /*
     * O ficha-render pode atualizar a raça e a imagem
     * em momentos diferentes.
     */

    window.requestAnimationFrame(
      () => {

        render(
          getState()
        );

      }
    );
  }


  /* =========================================================
     EVENTOS DE APARÊNCIA
     ========================================================= */

  function onAppearanceChanged(
    event
  ) {

    const state =
      event?.detail?.state ||
      getState();


    /*
     * Se a aparência mudou apenas a altura,
     * não recria a imagem.
     */

    applyScale(
      state
    );


    /*
     * Se houve alteração de gênero/raça,
     * renderImage detectará nova URL.
     */

    const wantedSrc =
      getRaceImage(
        state
      );


    if (
      wantedSrc !==
      currentSrc
    ) {

      render(
        state
      );
    }
  }


  /* =========================================================
     RESIZE
     ========================================================= */

  function observeResize() {

    if (
      !root ||
      typeof ResizeObserver ===
        "undefined"
    ) {
      return;
    }


    if (
      resizeObserver
    ) {
      resizeObserver.disconnect();
    }


    resizeObserver =
      new ResizeObserver(
        () => {

          applyScale(
            getState()
          );

        }
      );


    resizeObserver.observe(
      root
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


      createViewer();

      render(
        getState()
      );


      observeResize();


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
          number(
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


    getImage() {

      return currentSrc;
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


      currentImage =
        null;


      currentSrc =
        "";
    }

  };


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  window.AERIONPersonagemRender =
    Object.freeze(
      API
    );


  window.AERION_CHARACTER_RENDER =
    window.AERIONPersonagemRender;


  /* =========================================================
     EVENTOS
     ========================================================= */

  window.addEventListener(
    "aerion:ficha:updated",
    onFichaUpdated
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
    onAppearanceChanged
  );


  window.addEventListener(
    "aerion:personagem-assets:ready",
    () => {

      render(
        getState()
      );

    }
  );


  /* =========================================================
     BOOT
     ========================================================= */

  function boot() {

    if (
      API.init()
    ) {
      return;
    }


    window.requestAnimationFrame(
      boot
    );
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