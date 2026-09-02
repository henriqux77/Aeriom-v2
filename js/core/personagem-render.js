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
    rootSelector: "#appearanceFigure",

    minScale: 0.78,
    maxScale: 1.24,

    defaultMinHeight: 150,
    defaultMaxHeight: 200
  });

  /* =========================================================
     ESTADO INTERNO
     ========================================================= */

  let root = null;
  let currentImage = null;
  let currentSrc = "";
  let initialized = false;

  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
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
    const ficha = getFicha();

    if (
      ficha &&
      typeof ficha.getState === "function"
    ) {
      try {
        return ficha.getState() || {};
      } catch {
        return {};
      }
    }

    return {};
  }

  /* =========================================================
     RAÇA
     ========================================================= */

  function getRace(state) {
    const assets = getAssets();

    if (!assets) {
      return null;
    }

    if (
      typeof assets.getRace === "function"
    ) {
      return assets.getRace(
        state?.race
      );
    }

    const races =
      Array.isArray(assets.races)
        ? assets.races
        : [];

    const wanted =
      normalize(state?.race);

    return (
      races.find(
        race =>
          normalize(race?.id) === wanted
      ) || null
    );
  }

  /* =========================================================
     GÊNERO
     ========================================================= */

  function getGender(state) {
    const gender =
      normalize(state?.gender);

    if (
      gender === "feminino" ||
      gender === "feminina" ||
      gender === "female" ||
      gender === "f"
    ) {
      return "feminino";
    }

    return "masculino";
  }

  /* =========================================================
     IMAGEM DA RAÇA
     ========================================================= */

  function getRaceImage(state) {
    const assets = getAssets();
    const race = getRace(state);

    if (!race) {
      return "";
    }

    const gender =
      getGender(state);

    /*
     * API oficial do catálogo.
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

      if (image) {
        return image;
      }
    }

    /*
     * Fallback direto no objeto da raça.
     */

    const images =
      race.images || {};

    const selected =
      images[gender];

    if (selected) {
      return selected;
    }

    /*
     * Fallback para o outro gênero.
     */

    const otherGender =
      gender === "feminino"
        ? "masculino"
        : "feminino";

    return (
      images[otherGender] ||
      ""
    );
  }

  /* =========================================================
     ALTURA DA RAÇA
     ========================================================= */

  function getHeightRange(state) {
    const assets = getAssets();
    const race = getRace(state);

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
        range &&
        Number.isFinite(
          Number(range.min)
        ) &&
        Number.isFinite(
          Number(range.max)
        )
      ) {
        return {
          min: Number(range.min),
          max: Number(range.max)
        };
      }
    }

    const raceMin =
      toNumber(
        race?.height?.min,
        CONFIG.defaultMinHeight
      );

    const raceMax =
      toNumber(
        race?.height?.max,
        CONFIG.defaultMaxHeight
      );

    return {
      min: raceMin,
      max: raceMax
    };
  }

  /* =========================================================
     ALTURA ATUAL
     ========================================================= */

  function getCurrentHeight(state) {
    const range =
      getHeightRange(state);

    const defaultHeight =
      (
        range.min +
        range.max
      ) / 2;

    const height =
      toNumber(
        state?.appearance?.height,
        defaultHeight
      );

    return clamp(
      height,
      range.min,
      range.max
    );
  }

  /* =========================================================
     ESCALA
     ========================================================= */

  function calculateScale(state) {
    const range =
      getHeightRange(state);

    const height =
      getCurrentHeight(state);

    const difference =
      Math.max(
        1,
        range.max - range.min
      );

    const progress =
      (
        height -
        range.min
      ) /
      difference;

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
     ESTRUTURA
     ========================================================= */

  function ensureStructure() {
    if (!root) {
      return false;
    }

    root.classList.add(
      "aerion-character-render"
    );

    let stage =
      root.querySelector(
        "[data-character-stage]"
      );

    if (stage) {
      return true;
    }

    root.innerHTML = "";

    stage =
      document.createElement("div");

    stage.className =
      "aerion-character-stage";

    stage.dataset.characterStage =
      "true";

    const glow =
      document.createElement("div");

    glow.className =
      "aerion-character-glow";

    glow.setAttribute(
      "aria-hidden",
      "true"
    );

    const imageLayer =
      document.createElement("div");

    imageLayer.className =
      "aerion-character-image-layer";

    imageLayer.dataset.characterImageLayer =
      "true";

    const loading =
      document.createElement("div");

    loading.className =
      "aerion-character-loading";

    loading.dataset.characterLoading =
      "true";

    loading.hidden = true;

    loading.innerHTML = `
      <div
        class="aerion-character-spinner"
        aria-hidden="true"
      ></div>

      <span>
        Carregando personagem...
      </span>
    `;

    const error =
      document.createElement("div");

    error.className =
      "aerion-character-error";

    error.dataset.characterError =
      "true";

    error.hidden = true;

    error.innerHTML = `
      <span>
        Não foi possível carregar
        a imagem da raça.
      </span>
    `;

    stage.appendChild(glow);
    stage.appendChild(imageLayer);
    stage.appendChild(loading);
    stage.appendChild(error);

    root.appendChild(stage);

    return true;
  }

  /* =========================================================
     ELEMENTOS INTERNOS
     ========================================================= */

  function getImageLayer() {
    return root?.querySelector(
      "[data-character-image-layer]"
    );
  }

  function getLoadingElement() {
    return root?.querySelector(
      "[data-character-loading]"
    );
  }

  function getErrorElement() {
    return root?.querySelector(
      "[data-character-error]"
    );
  }

  /* =========================================================
     LOADING
     ========================================================= */

  function setLoading(value) {
    if (!root) {
      return;
    }

    const enabled =
      Boolean(value);

    root.classList.toggle(
      "is-loading",
      enabled
    );

    const element =
      getLoadingElement();

    if (element) {
      element.hidden =
        !enabled;
    }
  }

  /* =========================================================
     ERRO
     ========================================================= */

  function setError(value) {
    if (!root) {
      return;
    }

    const enabled =
      Boolean(value);

    root.classList.toggle(
      "has-error",
      enabled
    );

    const element =
      getErrorElement();

    if (element) {
      element.hidden =
        !enabled;
    }
  }

  /* =========================================================
     ESCALA DA IMAGEM
     ========================================================= */

  function applyScale(state) {
    if (!currentImage) {
      return;
    }

    const scale =
      calculateScale(state);

    currentImage.style.transform =
      `translateX(-50%) scale(${scale})`;

    currentImage.dataset.scale =
      String(scale);
  }

  /* =========================================================
     PLACEHOLDER
     ========================================================= */

  function renderEmpty(message) {
    const layer =
      getImageLayer();

    if (!layer) {
      return;
    }

    layer.innerHTML = `
      <div class="aerion-character-empty">
        <span>
          ${message}
        </span>
      </div>
    `;

    currentImage = null;
    currentSrc = "";

    setLoading(false);
    setError(false);
  }

  /* =========================================================
     IMAGEM
     ========================================================= */

  function renderImage(state) {
    if (!ensureStructure()) {
      return;
    }

    const layer =
      getImageLayer();

    if (!layer) {
      return;
    }

    const race =
      getRace(state);

    /*
     * Nenhuma raça selecionada.
     */

    if (!race) {
      renderEmpty(
        "Selecione uma raça para visualizar o personagem."
      );

      return;
    }

    const src =
      getRaceImage(state);

    /*
     * A raça existe, mas não possui
     * imagem cadastrada.
     */

    if (!src) {
      renderEmpty(
        `Imagem de ${race.name || "raça selecionada"} indisponível.`
      );

      return;
    }

    /*
     * A mesma imagem já está carregada.
     * Só atualiza a escala.
     */

    if (
      currentImage &&
      currentSrc === src
    ) {
      applyScale(state);
      return;
    }

    const gender =
      getGender(state);

    setLoading(true);
    setError(false);

    layer.innerHTML = "";

    const image =
      document.createElement("img");

    image.className =
      "aerion-character-base-image";

    image.alt =
      `${race.name || "Personagem"} — ${gender}`;

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

    image.style.opacity =
      "0";

    image.style.transform =
      "translateX(-50%) scale(1)";

    image.onload = () => {
      setLoading(false);
      setError(false);

      image.style.opacity =
        "1";

      currentImage =
        image;

      currentSrc =
        src;

      applyScale(
        getState()
      );

      window.dispatchEvent(
        new CustomEvent(
          "aerion:personagem:image-loaded",
          {
            detail: {
              race: race.id,
              gender,
              src
            }
          }
        )
      );
    };

    image.onerror = () => {
      setLoading(false);
      setError(true);

      image.style.opacity =
        "0";

      currentImage = null;
      currentSrc = "";

      window.dispatchEvent(
        new CustomEvent(
          "aerion:personagem:image-error",
          {
            detail: {
              race: race.id,
              gender,
              src
            }
          }
        )
      );
    };

    layer.appendChild(image);

    currentImage =
      image;

    currentSrc =
      src;

    image.src =
      src;

    /*
     * Caso o navegador tenha a imagem
     * em cache e o load tenha ocorrido
     * imediatamente.
     */

    if (image.complete) {
      if (image.naturalWidth > 0) {
        image.onload();
      } else {
        image.onerror();
      }
    }
  }

  /* =========================================================
     RENDER
     ========================================================= */

  function render() {
    if (!root) {
      root =
        document.querySelector(
          CONFIG.rootSelector
        );
    }

    if (!root) {
      return false;
    }

    const state =
      getState();

    ensureStructure();

    renderImage(state);

    const race =
      getRace(state);

    root.dataset.race =
      race?.id || "";

    root.dataset.gender =
      getGender(state);

    if (currentImage) {
      applyScale(state);
    }

    return true;
  }

  /* =========================================================
     EVENTOS
     ========================================================= */

  function handleFichaUpdate() {
    render();
  }

  function initEvents() {

    window.addEventListener(
      "aerion:ficha:updated",
      handleFichaUpdate
    );

    window.addEventListener(
      "aerion:appearance:updated",
      handleFichaUpdate
    );

    window.addEventListener(
      "aerion:race:selected",
      handleFichaUpdate
    );

    window.addEventListener(
      "aerion:race:preview",
      handleFichaUpdate
    );

    window.addEventListener(
      "aerion:personagem:render",
      handleFichaUpdate
    );

    window.addEventListener(
      "aerion:personagem-assets:ready",
      handleFichaUpdate
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

    root =
      document.querySelector(
        CONFIG.rootSelector
      );

    if (!root) {
      return;
    }

    ensureStructure();

    initEvents();

    render();

    window.AERIONPersonagemRender = {
      render,

      refresh:
        render,

      getScale() {
        return calculateScale(
          getState()
        );
      },

      getCurrentHeight() {
        return getCurrentHeight(
          getState()
        );
      },

      getHeightRange() {
        return getHeightRange(
          getState()
        );
      }
    };

    window.AERION_PERSONAGEM_RENDER =
      window.AERIONPersonagemRender;
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

})();