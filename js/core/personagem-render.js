/* =========================================================
   AERION — PERSONAGEM RENDER
   js/core/personagem-render.js

   RESPONSABILIDADE:
   - mostrar a imagem da raça;
   - mostrar a imagem específica do Animalha;
   - respeitar masculino/feminino;
   - ajustar o tamanho visual pela altura;
   - atualizar quando a ficha mudar;
   - tratar carregamento e erro.

   NÃO RESPONSÁVEL POR:
   - ações da interface;
   - regras;
   - dados;
   - atributos;
   - rolagens;
   - persistência;
   - criação de SVG.

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

    defaultMinHeight:
      150,

    defaultMaxHeight:
      200

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

  function text(value) {
    return String(
      value ?? ""
    ).trim();
  }


  function normalize(value) {
    return text(value)
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


  function number(
    value,
    fallback = 0
  ) {
    const result =
      Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }


  function clamp(
    value,
    min,
    max
  ) {
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

    const ficha =
      getFicha();

    if (
      ficha &&
      typeof ficha.getState ===
        "function"
    ) {

      try {

        return (
          ficha.getState() ||
          {}
        );

      } catch {
        return {};
      }
    }

    return {};
  }


  /* =========================================================
     RAÇAS
     ========================================================= */

  function getRaces() {

    const assets =
      getAssets();

    if (!assets) {
      return [];
    }


    if (
      Array.isArray(
        assets.races
      )
    ) {
      return assets.races;
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
        window.AERION_RACES
      )
    ) {
      return window.AERION_RACES;
    }


    return [];
  }


  function getRace(
    state
  ) {

    const assets =
      getAssets();

    const wanted =
      normalize(
        state?.race
      );


    if (!wanted) {
      return null;
    }


    if (
      assets &&
      typeof assets.getRace ===
        "function"
    ) {

      const race =
        assets.getRace(
          state.race
        );

      if (race) {
        return race;
      }
    }


    return (
      getRaces().find(
        race => {

          const id =
            race?.id ??
            race?.key ??
            race?.slug ??
            race?.name;

          return (
            normalize(id) ===
            wanted
          );
        }
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
     IMAGEM DE RAÇA
     ========================================================= */

  function getRaceImage(
    race,
    gender
  ) {

    if (!race) {
      return "";
    }


    const assets =
      getAssets();


    /*
      Primeiro tenta a API do catálogo.
    */

    if (
      assets &&
      typeof assets.getRaceImage ===
        "function"
    ) {

      const result =
        assets.getRaceImage(
          race.id,
          gender
        );

      if (result) {
        return text(result);
      }
    }


    /*
      Depois procura no objeto da raça.
    */

    const images =
      race.images ||
      race.image ||
      {};


    if (
      typeof images ===
      "string"
    ) {
      return text(images);
    }


    if (
      gender ===
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


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function getAnimalhaId(
    state
  ) {

    return text(
      state?.animalha?.animal ||
      state?.animalha?.variation ||
      state?.animalha ||
      ""
    );
  }


  function isAnimalha(
    state,
    race
  ) {

    const raceId =
      normalize(
        race?.id ||
        state?.race
      );


    return (
      raceId ===
      "animalha"
    );
  }


  /*
    Procura a configuração:

    ANIMALHA_IMAGES = {
      masculino: {
        voadores: {
          falcao: "URL"
        },
        ...
      },

      feminino: {
        ...
      }
    }

    A parte masculina fica explícita
    para facilitar a edição.
  */

  function getAnimalhaImageFromConfig(
    animalId,
    category,
    gender
  ) {

    const assets =
      getAssets();


    if (!assets) {
      return "";
    }


    const config =
      assets.ANIMALHA_IMAGES ||
      window.ANIMALHA_IMAGES ||
      null;


    if (
      !config ||
      typeof config !==
        "object"
    ) {
      return "";
    }


    const genderMap =
      config[
        gender
      ];


    if (
      !genderMap ||
      typeof genderMap !==
        "object"
    ) {
      return "";
    }


    const normalizedAnimal =
      normalize(
        animalId
      );


    const normalizedCategory =
      normalize(
        category
      );


    /*
      Primeiro tenta pela categoria.
    */

    const categoryMap =
      genderMap[
        normalizedCategory
      ];


    if (
      categoryMap &&
      typeof categoryMap ===
        "object"
    ) {

      const result =
        categoryMap[
          normalizedAnimal
        ];

      if (result) {
        return text(result);
      }
    }


    /*
      Depois procura diretamente
      pelo ID do animal.
    */

    for (
      const key of Object.keys(
        genderMap
      )
    ) {

      const group =
        genderMap[key];

      if (
        !group ||
        typeof group !==
          "object"
      ) {
        continue;
      }


      if (
        group[
          normalizedAnimal
        ]
      ) {

        return text(
          group[
            normalizedAnimal
          ]
        );
      }
    }


    return "";
  }


  function getAnimalhaCategory(
    state
  ) {

    return text(
      state?.animalhaCategory ||
      state?.animalha?.category ||
      ""
    );
  }


  function getAnimalhaImage(
    state,
    gender
  ) {

    const animalId =
      getAnimalhaId(
        state
      );


    if (!animalId) {
      return "";
    }


    const category =
      getAnimalhaCategory(
        state
      );


    const assets =
      getAssets();


    /*
      API oficial, caso exista.
    */

    if (
      assets &&
      typeof assets.getAnimalhaImage ===
        "function"
    ) {

      const result =
        assets.getAnimalhaImage(
          animalId,
          gender,
          category
        );

      if (result) {
        return text(result);
      }
    }


    /*
      Configuração masculina/feminina.
    */

    return getAnimalhaImageFromConfig(
      animalId,
      category,
      gender
    );
  }


  /* =========================================================
     IMAGEM FINAL
     ========================================================= */

  function getCharacterImage(
    state
  ) {

    const race =
      getRace(state);

    if (!race) {
      return {
        src: "",
        race: null,
        gender:
          getGender(state),
        animalha: false
      };
    }


    const gender =
      getGender(state);


    /*
      Animalha tem prioridade:
      variação escolhida > imagem geral da raça.
    */

    if (
      isAnimalha(
        state,
        race
      )
    ) {

      const animalImage =
        getAnimalhaImage(
          state,
          gender
        );


      if (animalImage) {

        return {
          src:
            animalImage,
          race,
          gender,
          animalha:
            true
        };
      }
    }


    /*
      Fallback para a imagem geral
      da raça.
    */

    return {
      src:
        getRaceImage(
          race,
          gender
        ),

      race,

      gender,

      animalha:
        false
    };
  }


  /* =========================================================
     ALTURA
     ========================================================= */

  function getHeightRange(
    state
  ) {

    const race =
      getRace(state);

    const assets =
      getAssets();


    /*
      API do catálogo.
    */

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
          min:
            Number(range.min),

          max:
            Number(range.max)
        };
      }
    }


    const min =
      number(
        race?.height?.min ??
        race?.heightMin ??
        race?.minHeight,
        CONFIG.defaultMinHeight
      );


    const max =
      number(
        race?.height?.max ??
        race?.heightMax ??
        race?.maxHeight,
        CONFIG.defaultMaxHeight
      );


    return {
      min,
      max:
        max >= min
          ? max
          : min + 1
    };
  }


  function getCurrentHeight(
    state
  ) {

    const range =
      getHeightRange(
        state
      );


    const middle =
      (
        range.min +
        range.max
      ) / 2;


    const height =
      number(
        state?.appearance?.height,
        middle
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


    const span =
      Math.max(
        1,
        range.max -
          range.min
      );


    const progress =
      (
        height -
        range.min
      ) /
      span;


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
     ESTRUTURA DO VISUALIZADOR
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

    loading.hidden =
      true;


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
      <span>
        Não foi possível carregar
        a imagem do personagem.
      </span>
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
     ESTADOS VISUAIS
     ========================================================= */

  function setLoading(
    value
  ) {

    const enabled =
      Boolean(value);


    root?.classList.toggle(
      "is-loading",
      enabled
    );


    const element =
      getLoading();

    if (element) {
      element.hidden =
        !enabled;
    }
  }


  function setError(
    value
  ) {

    const enabled =
      Boolean(value);


    root?.classList.toggle(
      "has-error",
      enabled
    );


    const element =
      getError();

    if (element) {
      element.hidden =
        !enabled;
    }
  }


  /* =========================================================
     ESCALA
     ========================================================= */

  function applyScale(
    state
  ) {

    if (!currentImage) {
      return;
    }


    const scale =
      calculateScale(
        state
      );


    currentImage.style.transform =
      `translateX(-50%) scale(${scale})`;


    currentImage.dataset.scale =
      String(scale);
  }


  /* =========================================================
     PLACEHOLDER
     ========================================================= */

  function renderEmpty(
    message
  ) {

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


    currentImage =
      null;

    currentSrc =
      "";


    setLoading(false);
    setError(false);
  }


  /* =========================================================
     RENDER DA IMAGEM
     ========================================================= */

  function renderImage(
    state
  ) {

    if (!ensureStructure()) {
      return;
    }


    const layer =
      getImageLayer();

    if (!layer) {
      return;
    }


    const character =
      getCharacterImage(
        state
      );


    const race =
      character.race;


    /*
      Sem raça.
    */

    if (!race) {

      renderEmpty(
        "Selecione uma raça para visualizar o personagem."
      );

      return;
    }


    /*
      Sem imagem.
    */

    if (!character.src) {

      const message =
        character.animalha
          ? "Escolha uma variação Animalha com imagem cadastrada."
          : `Imagem de ${
              race.name ||
              "raça selecionada"
            } indisponível.`;

      renderEmpty(
        message
      );

      return;
    }


    /*
      Mesma imagem:
      apenas atualiza escala.
    */

    if (
      currentImage &&
      currentSrc ===
        character.src
    ) {

      applyScale(
        state
      );

      return;
    }


    setLoading(true);
    setError(false);


    layer.innerHTML =
      "";


    const image =
      document.createElement(
        "img"
      );


    image.className =
      "aerion-character-base-image";


    image.alt =
      `${
        race.name ||
        "Personagem"
      } — ${
        character.gender
      }`;


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


    image.onload =
      () => {

        setLoading(false);
        setError(false);


        image.style.opacity =
          "1";


        currentImage =
          image;


        currentSrc =
          character.src;


        applyScale(
          getState()
        );


        window.dispatchEvent(
          new CustomEvent(
            "aerion:personagem:image-loaded",
            {
              detail: {
                race:
                  race.id ||
                  race.name,

                gender:
                  character.gender,

                animalha:
                  character.animalha,

                src:
                  character.src
              }
            }
          )
        );
      };


    image.onerror =
      () => {

        setLoading(false);
        setError(true);


        image.style.opacity =
          "0";


        currentImage =
          null;

        currentSrc =
          "";


        window.dispatchEvent(
          new CustomEvent(
            "aerion:personagem:image-error",
            {
              detail: {
                race:
                  race.id ||
                  race.name,

                gender:
                  character.gender,

                animalha:
                  character.animalha,

                src:
                  character.src
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
      character.src;


    image.src =
      character.src;


    /*
      Cache do navegador.
    */

    if (image.complete) {

      if (
        image.naturalWidth >
        0
      ) {

        image.onload();

      } else {

        image.onerror();
      }
    }
  }


  /* =========================================================
     RENDER COMPLETO
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


    renderImage(
      state
    );


    const race =
      getRace(
        state
      );


    root.dataset.race =
      race?.id ||
      "";

    root.dataset.gender =
      getGender(
        state
      );


    const animalId =
      getAnimalhaId(
        state
      );


    root.dataset.animalha =
      animalId;


    root.dataset.height =
      String(
        getCurrentHeight(
          state
        )
      );


    root.classList.toggle(
      "is-animalha",
      isAnimalha(
        state,
        race
      )
    );


    if (currentImage) {
      applyScale(
        state
      );
    }


    return true;
  }


  /* =========================================================
     EVENTOS DA FICHA
     ========================================================= */

  function initEvents() {

    /*
      Atualização geral.
    */

    window.addEventListener(
      "aerion:ficha:update",
      render
    );


    /*
      Raça.
    */

    window.addEventListener(
      "aerion:race:preview",
      render
    );


    window.addEventListener(
      "aerion:race:selected",
      render
    );


    /*
      Animalha.
    */

    window.addEventListener(
      "aerion:animalha:category",
      render
    );


    window.addEventListener(
      "aerion:animalha:selected",
      render
    );


    /*
      Aparência / altura.
    */

    window.addEventListener(
      "aerion:appearance:update",
      render
    );


    /*
      Mudança de identidade/gênero.
    */

    window.addEventListener(
      "aerion:ficha:update",
      render
    );
  }


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

    if (initialized) {
      return;
    }


    initialized =
      true;


    root =
      document.querySelector(
        CONFIG.rootSelector
      );


    if (!root) {
      return;
    }


    initEvents();


    render();
  }


  /* =========================================================
     API PÚBLICA
     ========================================================= */

  window.AERIONPersonagemRender = {

    render,

    getCharacterImage,

    getRaceImage,

    getAnimalhaImage,

    getCurrentHeight,

    calculateScale

  };


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
        once: true
      }
    );

  } else {

    init();

  }

})();