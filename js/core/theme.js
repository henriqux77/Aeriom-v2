/*
 * ============================================================
 * AERIOM v2
 * js/core/theme.js
 * Gerenciador global de temas
 * ============================================================
 *
 * Responsável por:
 *
 * - aplicar temas visuais;
 * - controlar variáveis CSS;
 * - salvar preferência visual local;
 * - aplicar/remover background;
 * - fornecer API global para outros módulos.
 *
 * NÃO é responsável por:
 *
 * - autenticação;
 * - autorização;
 * - banco de dados;
 * - RLS;
 * - campanhas;
 * - Realtime.
 *
 * ============================================================
 */

const THEME_CONFIG = Object.freeze({
  storageKey: "aeriom_theme",
  defaultTheme: "default",
  transitionDuration: 220,

  themes: Object.freeze({
    default: Object.freeze({
      id: "default",
      name: "AERIOM",
      description: "O tema padrão da mesa.",

      variables: Object.freeze({
        "--theme-accent": "#c49e53",
        "--theme-accent-light": "#e3c67f",
        "--theme-accent-dark": "#886a31",
        "--theme-danger": "#a83b3b",
        "--theme-mana": "#3f72b7",
        "--theme-bg": "#090807",
        "--theme-surface": "#15120f"
      })
    }),

    forest: Object.freeze({
      id: "forest",
      name: "Floresta",
      description: "Uma atmosfera antiga e selvagem.",

      variables: Object.freeze({
        "--theme-accent": "#a88d52",
        "--theme-accent-light": "#d0bb7a",
        "--theme-accent-dark": "#746438",
        "--theme-danger": "#9d4138",
        "--theme-mana": "#477b70",
        "--theme-bg": "#080c09",
        "--theme-surface": "#101611"
      })
    }),

    cave: Object.freeze({
      id: "cave",
      name: "Caverna",
      description: "Pedra, sombras e profundezas.",

      variables: Object.freeze({
        "--theme-accent": "#9f8a69",
        "--theme-accent-light": "#c9b28a",
        "--theme-accent-dark": "#6e604d",
        "--theme-danger": "#963f3f",
        "--theme-mana": "#536f91",
        "--theme-bg": "#08090a",
        "--theme-surface": "#121315"
      })
    }),

    volcano: Object.freeze({
      id: "volcano",
      name: "Vulcão",
      description: "Calor, cinzas e perigo.",

      variables: Object.freeze({
        "--theme-accent": "#c28a45",
        "--theme-accent-light": "#e2ad60",
        "--theme-accent-dark": "#80582b",
        "--theme-danger": "#c04432",
        "--theme-mana": "#5c74a1",
        "--theme-bg": "#100907",
        "--theme-surface": "#1a0e0b"
      })
    }),

    castle: Object.freeze({
      id: "castle",
      name: "Castelo",
      description: "Pedra antiga, nobreza e mistério.",

      variables: Object.freeze({
        "--theme-accent": "#b59a62",
        "--theme-accent-light": "#dfc889",
        "--theme-accent-dark": "#76643f",
        "--theme-danger": "#934141",
        "--theme-mana": "#506e9d",
        "--theme-bg": "#09090a",
        "--theme-surface": "#151516"
      })
    }),

    coast: Object.freeze({
      id: "coast",
      name: "Costa",
      description: "Mar, vento e horizontes distantes.",

      variables: Object.freeze({
        "--theme-accent": "#bba36b",
        "--theme-accent-light": "#dfca91",
        "--theme-accent-dark": "#786943",
        "--theme-danger": "#a14b46",
        "--theme-mana": "#4382a7",
        "--theme-bg": "#080b0d",
        "--theme-surface": "#101619"
      })
    }),

    ruins: Object.freeze({
      id: "ruins",
      name: "Ruínas",
      description: "Vestígios de uma civilização esquecida.",

      variables: Object.freeze({
        "--theme-accent": "#a68e62",
        "--theme-accent-light": "#d0b982",
        "--theme-accent-dark": "#6f6043",
        "--theme-danger": "#99413f",
        "--theme-mana": "#596f8c",
        "--theme-bg": "#090908",
        "--theme-surface": "#141311"
      })
    })
  })
});


/* ============================================================
   ESTADO
   ============================================================ */

let currentTheme =
  THEME_CONFIG.defaultTheme;

let currentBackground =
  null;


/* ============================================================
   LOG
   ============================================================ */

function logTheme(
  level,
  message,
  details = null
) {
  const prefix =
    "[AERIOM][THEME]";

  if (
    level === "error"
  ) {
    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;
  }

  if (
    level === "warn"
  ) {
    console.warn(
      prefix,
      message,
      details ?? ""
    );

    return;
  }

  console.info(
    prefix,
    message,
    details ?? ""
  );
}


/* ============================================================
   VALIDAR TEMA
   ============================================================ */

function isValidTheme(
  themeId
) {
  if (
    typeof themeId !==
    "string"
  ) {
    return false;
  }

  return Boolean(
    THEME_CONFIG.themes[
      themeId
    ]
  );
}


/* ============================================================
   OBTER TEMA
   ============================================================ */

export function getTheme(
  themeId = currentTheme
) {
  if (
    !isValidTheme(
      themeId
    )
  ) {
    return (
      THEME_CONFIG.themes[
        THEME_CONFIG.defaultTheme
      ]
    );
  }

  return (
    THEME_CONFIG.themes[
      themeId
    ]
  );
}


/* ============================================================
   LISTAR TEMAS
   ============================================================ */

export function getAvailableThemes() {
  return Object.values(
    THEME_CONFIG.themes
  ).map(
    theme => ({
      id:
        theme.id,

      name:
        theme.name,

      description:
        theme.description
    })
  );
}


/* ============================================================
   TEMA SALVO
   ============================================================ */

function getStoredTheme() {
  try {
    const stored =
      localStorage.getItem(
        THEME_CONFIG.storageKey
      );

    if (
      isValidTheme(
        stored
      )
    ) {
      return stored;
    }
  } catch (
    error
  ) {
    logTheme(
      "warn",
      "Não foi possível acessar a preferência visual local.",
      error
    );
  }

  return (
    THEME_CONFIG.defaultTheme
  );
}


function storeTheme(
  themeId
) {
  try {
    localStorage.setItem(
      THEME_CONFIG.storageKey,
      themeId
    );
  } catch (
    error
  ) {
    logTheme(
      "warn",
      "Não foi possível salvar a preferência visual local.",
      error
    );
  }
}


/* ============================================================
   TRANSIÇÃO
   ============================================================ */

function enableThemeTransition() {
  const root =
    document.documentElement;

  root.classList.add(
    "aeriom-theme-transition"
  );

  window.setTimeout(
    () => {
      root.classList.remove(
        "aeriom-theme-transition"
      );
    },
    THEME_CONFIG.transitionDuration
  );
}


/* ============================================================
   APLICAR VARIÁVEIS
   ============================================================ */

function applyThemeVariables(
  theme
) {
  const root =
    document.documentElement;

  Object.entries(
    theme.variables
  ).forEach(
    ([property, value]) => {
      root.style.setProperty(
        property,
        value
      );
    }
  );
}


/* ============================================================
   VALIDAR URL DO BACKGROUND
   ============================================================ */

function isValidBackgroundUrl(
  imageUrl
) {
  if (
    typeof imageUrl !==
    "string"
  ) {
    return false;
  }

  const value =
    imageUrl.trim();

  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(
        value,
        window.location.href
      );

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}


/* ============================================================
   APLICAR BACKGROUND
   ============================================================ */

export function applyBackgroundImage(
  imageUrl
) {
  const body =
    document.body;

  if (!body) {
    return false;
  }

  if (
    imageUrl ===
      null ||
    imageUrl ===
      undefined ||
    String(imageUrl).trim() ===
      ""
  ) {
    body.style.removeProperty(
      "--aeriom-background-image"
    );

    body.removeAttribute(
      "data-aeriom-background"
    );

    currentBackground =
      null;

    return true;
  }

  const normalizedUrl =
    String(
      imageUrl
    ).trim();

  if (
    !isValidBackgroundUrl(
      normalizedUrl
    )
  ) {
    logTheme(
      "warn",
      "Background recusado por possuir URL inválida.",
      {
        imageUrl:
          normalizedUrl
      }
    );

    return false;
  }

  /*
   * Escapamos aspas da URL antes de colocá-la
   * dentro da função CSS url().
   */

  const safeUrl =
    normalizedUrl.replaceAll(
      "\"",
      "\\\""
    );

  body.style.setProperty(
    "--aeriom-background-image",
    `url("${safeUrl}")`
  );

  body.dataset.aeriomBackground =
    "true";

  currentBackground =
    normalizedUrl;

  return true;
}


/* ============================================================
   LIMPAR BACKGROUND
   ============================================================ */

export function clearBackgroundImage() {
  const body =
    document.body;

  if (body) {
    body.style.removeProperty(
      "--aeriom-background-image"
    );

    body.removeAttribute(
      "data-aeriom-background"
    );
  }

  currentBackground =
    null;

  return true;
}


/* ============================================================
   APLICAR TEMA
   ============================================================ */

export function applyTheme(
  themeId,
  options = {}
) {
  const {
    persist = true,
    animate = true,
    backgroundImage = null
  } = options;

  const theme =
    getTheme(
      themeId
    );

  if (
    !isValidTheme(
      theme.id
    )
  ) {
    logTheme(
      "warn",
      "Tema solicitado não existe.",
      {
        themeId
      }
    );

    return false;
  }

  if (
    animate
  ) {
    enableThemeTransition();
  }

  applyThemeVariables(
    theme
  );

  document.documentElement.dataset.theme =
    theme.id;

  currentTheme =
    theme.id;

  if (
    persist
  ) {
    storeTheme(
      theme.id
    );
  }

  if (
    backgroundImage !==
    null
  ) {
    applyBackgroundImage(
      backgroundImage
    );
  }
  else if (
    currentBackground
  ) {
    applyBackgroundImage(
      currentBackground
    );
  }

  document.dispatchEvent(
    new CustomEvent(
      "aeriom:themechange",
      {
        detail:
          Object.freeze({
            themeId:
              theme.id,

            themeName:
              theme.name,

            backgroundImage:
              currentBackground
          })
      }
    )
  );

  return true;
}


/* ============================================================
   TEMA DE CAMPANHA
   ============================================================ */

export function applyCampaignTheme(
  themeId,
  backgroundImage = null
) {
  return applyTheme(
    themeId,
    {
      persist:
        false,

      animate:
        true,

      backgroundImage
    }
  );
}


/* ============================================================
   ESTADO ATUAL
   ============================================================ */

export function getCurrentThemeId() {
  return currentTheme;
}


export function getCurrentBackgroundImage() {
  return currentBackground;
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

export function initializeTheme() {
  const storedTheme =
    getStoredTheme();

  applyTheme(
    storedTheme,
    {
      persist:
        false,

      animate:
        false,

      backgroundImage:
        null
    }
  );

  logTheme(
    "info",
    "Gerenciador de temas inicializado.",
    {
      theme:
        storedTheme
    }
  );

  return storedTheme;
}


/* ============================================================
   API GLOBAL
   ============================================================ */

window.AERIOM_THEME =
  Object.freeze({
    apply:
      applyTheme,

    applyCampaign:
      applyCampaignTheme,

    get:
      getTheme,

    getCurrent:
      getCurrentThemeId,

    getAll:
      getAvailableThemes,

    setBackground:
      applyBackgroundImage,

    clearBackground:
      clearBackgroundImage,

    initialize:
      initializeTheme
  });


/* ============================================================
   INICIALIZAÇÃO AUTOMÁTICA
   ============================================================ */

function bootTheme() {
  try {
    initializeTheme();
  } catch (
    error
  ) {
    logTheme(
      "error",
      "Falha ao inicializar o gerenciador de temas.",
      error
    );
  }
}


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    bootTheme,
    {
      once:
        true
    }
  );
} else {
  bootTheme();
}
