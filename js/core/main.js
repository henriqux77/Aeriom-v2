/*
 * ============================================================
 * AERIOM v2
 * js/core/main.js
 * Núcleo / ponto de entrada da aplicação
 * ============================================================
 *
 * Responsabilidades:
 *
 * - Inicializar o Supabase.
 * - Detectar a página atual.
 * - Inicializar a autenticação.
 * - Inicializar módulos visuais.
 * - Coordenar a ordem de inicialização.
 * - Emitir eventos globais.
 * - Centralizar erros críticos.
 *
 * NÃO é responsabilidade deste arquivo:
 *
 * - regras de negócio de campanhas;
 * - fichas;
 * - mapas;
 * - combate;
 * - Realtime específico de módulos.
 *
 * ============================================================
 */


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const AERIOM_APP = Object.freeze({

  name:
    "AERIOM",

  version:
    "2.0.0",

  pages:
    Object.freeze({

      index:
        "index.html",

      campaigns:
        "campanhas.html",

      campaign:
        "campanha.html",

      characters:
        "fichas.html",

      character:
        "ficha.html"

    }),

  authPages:
    Object.freeze([
      "index"
    ]),

  protectedPages:
    Object.freeze([
      "campaigns",
      "campaign",
      "characters",
      "character"
    ])

});


/* ============================================================
   ESTADO
   ============================================================ */

let applicationInitialized =
  false;

let applicationStarting =
  false;

let supabaseReady =
  false;

let authReady =
  false;

let themeReady =
  false;

let menuReady =
  false;

let globalHandlersRegistered =
  false;


/* ============================================================
   LOG
   ============================================================ */

function logApplication(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][APP]";


  if (
    level ===
    "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;
  }


  if (
    level ===
    "warn"
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
   DETECTAR PÁGINA
   ============================================================ */

export function getCurrentPage() {

  const pathname =
    window.location.pathname;


  let filename =
    pathname
      .split("/")
      .pop()
      ?.toLowerCase();


  /*
   * GitHub Pages:
   *
   * https://usuario.github.io/Aeriom-v2/
   *
   * Pode resultar em pathname terminando em "/".
   */

  if (
    !filename
  ) {

    return "index";

  }


  /*
   * Remove qualquer eventual query/hash.
   */

  filename =
    filename
      .split("?")[0]
      .split("#")[0];


  switch (
    filename
  ) {

    case "":
    case "index":
    case "index.html":

      return "index";


    case "campanhas":
    case "campanhas.html":

      return "campaigns";


    case "campanha":
    case "campanha.html":

      return "campaign";


    case "fichas":
    case "fichas.html":

      return "characters";


    case "ficha":
    case "ficha.html":

      return "character";


    default:

      return "unknown";

  }

}


/* ============================================================
   CLASSIFICAÇÃO DA PÁGINA
   ============================================================ */

export function isAuthenticationPage() {

  return AERIOM_APP.authPages.includes(
    getCurrentPage()
  );

}


export function isProtectedPage() {

  return AERIOM_APP.protectedPages.includes(
    getCurrentPage()
  );

}


/* ============================================================
   URL BASE DO PROJETO
   ============================================================ */

function getApplicationBaseUrl() {

  const currentUrl =
    new URL(
      window.location.href
    );


  /*
   * GitHub Pages usa:
   *
   * /Aeriom-v2/
   *
   * Como não queremos assumir domínio,
   * calculamos a pasta atual.
   */

  const path =
    currentUrl.pathname;


  const filename =
    path
      .split("/")
      .pop();


  if (
    filename &&
    filename.includes(".")
  ) {

    currentUrl.pathname =
      path.slice(
        0,
        path.lastIndexOf(
          "/"
        ) + 1
      );

  }
  else if (
    !path.endsWith("/")
  ) {

    currentUrl.pathname =
      `${path}/`;

  }


  currentUrl.search =
    "";

  currentUrl.hash =
    "";


  return currentUrl;

}


/* ============================================================
   URL DE LOGIN
   ============================================================ */

export function getLoginUrl() {

  const base =
    getApplicationBaseUrl();


  base.pathname =
    `${base.pathname.replace(
      /\/+$/,
      ""
    )}/${AERIOM_APP.pages.index}`;


  return base.href;

}


/* ============================================================
   URL CAMPANHAS
   ============================================================ */

export function getCampaignsUrl() {

  const base =
    getApplicationBaseUrl();


  base.pathname =
    `${base.pathname.replace(
      /\/+$/,
      ""
    )}/${AERIOM_APP.pages.campaigns}`;


  return base.href;

}


/* ============================================================
   REDIRECIONAMENTO SEGURO
   ============================================================ */

export function redirectToLogin() {

  window.location.replace(
    getLoginUrl()
  );

}


export function redirectToCampaigns() {

  window.location.replace(
    getCampaignsUrl()
  );

}


/* ============================================================
   ERRO CRÍTICO
   ============================================================ */

function showApplicationError(
  error
) {

  logApplication(
    "error",
    "Erro crítico durante a inicialização.",
    error
  );


  /*
   * Se existir o componente de mensagem do Auth,
   * usamos ele.
   */

  const authMessage =
    document.getElementById(
      "auth-message"
    );


  if (
    authMessage
  ) {

    authMessage.textContent =
      "Não foi possível iniciar o AERIOM. Recarregue a página e tente novamente.";

    authMessage.dataset.type =
      "error";

    authMessage.hidden =
      false;


    return;

  }


  /*
   * Evita duplicar o alerta.
   */

  if (
    document.querySelector(
      ".aeriom-critical-error"
    )
  ) {

    return;

  }


  if (
    !document.body
  ) {

    return;

  }


  const container =
    document.createElement(
      "div"
    );


  container.className =
    "aeriom-critical-error";


  container.setAttribute(
    "role",
    "alert"
  );


  const title =
    document.createElement(
      "strong"
    );


  title.textContent =
    "AERIOM não conseguiu iniciar";


  const message =
    document.createElement(
      "p"
    );


  message.textContent =
    "Recarregue a página. Se o problema continuar, verifique a conexão com o Supabase.";


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.textContent =
    "Recarregar";


  button.addEventListener(
    "click",
    () => {

      window.location.reload();

    }
  );


  container.append(
    title,
    message,
    button
  );


  Object.assign(
    container.style,
    {

      position:
        "fixed",

      left:
        "1rem",

      right:
        "1rem",

      bottom:
        "1rem",

      zIndex:
        "99999",

      padding:
        "1rem",

      border:
        "1px solid rgba(168,59,59,.55)",

      borderRadius:
        "10px",

      background:
        "#17110f",

      color:
        "#f0a4a4",

      boxShadow:
        "0 15px 40px rgba(0,0,0,.45)",

      fontFamily:
        "Inter, sans-serif"

    }

  );


  document.body.appendChild(
    container
  );

}


/* ============================================================
   SUPABASE
   ============================================================ */

async function initializeSupabaseCore() {

  logApplication(
    "info",
    "Inicializando Supabase..."
  );


  try {

    const supabaseModule =
      await import(
        "./supabase.js"
      );


    if (
      typeof supabaseModule.initializeSupabase !==
      "function"
    ) {

      throw new Error(
        "initializeSupabase não foi encontrado em supabase.js."
      );

    }


    await supabaseModule.initializeSupabase();


    /*
     * Confirma explicitamente que o getter consegue
     * devolver uma instância real.
     */

    const client =
      await supabaseModule.getSupabase();


    if (
      !client ||
      !client.auth
    ) {

      throw new Error(
        "O cliente Supabase foi inicializado, mas não possui o módulo Auth."
      );

    }


    supabaseReady =
      true;


    logApplication(
      "info",
      "Supabase inicializado com sucesso."
    );


    return supabaseModule;

  } catch (
    error
  ) {

    supabaseReady =
      false;


    logApplication(
      "error",
      "Falha ao inicializar o Supabase.",
      error
    );


    throw error;

  }

}


/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */

async function initializeAuthentication() {

  logApplication(
    "info",
    "Inicializando autenticação..."
  );


  try {

    const authModule =
      await import(
        "./auth.js"
      );


    if (
      typeof authModule.initializeAuth !==
      "function"
    ) {

      throw new Error(
        "initializeAuth não foi encontrado em auth.js."
      );

    }


    await authModule.initializeAuth();


    authReady =
      true;


    logApplication(
      "info",
      "Autenticação inicializada."
    );


    return authModule;

  } catch (
    error
  ) {

    authReady =
      false;


    logApplication(
      "error",
      "Falha ao inicializar autenticação.",
      error
    );


    /*
     * Auth é crítico.
     * O erro sobe para initializeApplication().
     */

    throw error;

  }

}


/* ============================================================
   THEME
   ============================================================ */

async function initializeThemeModule() {

  try {

    const themeModule =
      await import(
        "./theme.js"
      );


    if (
      typeof themeModule.initializeTheme !==
      "function"
    ) {

      throw new Error(
        "initializeTheme não foi encontrado em theme.js."
      );

    }


    themeModule.initializeTheme();


    themeReady =
      true;


    logApplication(
      "info",
      "Tema inicializado."
    );


    return themeModule;

  } catch (
    error
  ) {

    themeReady =
      false;


    /*
     * Tema é opcional.
     * Nunca impede o login.
     */

    logApplication(
      "warn",
      "Tema não pôde ser inicializado. Continuando aplicação.",
      error
    );


    return null;

  }

}


/* ============================================================
   MENU
   ============================================================ */

async function initializeMenuModule() {

  try {

    const menuModule =
      await import(
        "./menu.js"
      );


    if (
      typeof menuModule.initializeMenu !==
      "function"
    ) {

      throw new Error(
        "initializeMenu não foi encontrado em menu.js."
      );

    }


    menuModule.initializeMenu();


    menuReady =
      true;


    logApplication(
      "info",
      "Menu inicializado."
    );


    return menuModule;

  } catch (
    error
  ) {

    menuReady =
      false;


    /*
     * Menu é opcional.
     */

    logApplication(
      "warn",
      "Menu não pôde ser inicializado. Continuando aplicação.",
      error
    );


    return null;

  }

}


/* ============================================================
   EVENTO READY
   ============================================================ */

function dispatchReadyEvent() {

  const page =
    getCurrentPage();


  window.dispatchEvent(
    new CustomEvent(
      "aeriom:ready",
      {

        detail:
          Object.freeze({

            app:
              AERIOM_APP.name,

            version:
              AERIOM_APP.version,

            page,

            supabase:
              supabaseReady,

            auth:
              authReady,

            theme:
              themeReady,

            menu:
              menuReady

          })

      }
    )
  );

}


/* ============================================================
   EVENTO DE NAVEGAÇÃO
   ============================================================ */

function dispatchNavigationEvent() {

  document.dispatchEvent(
    new CustomEvent(
      "aeriom:navigationchange",
      {

        detail:
          Object.freeze({

            page:
              getCurrentPage(),

            pathname:
              window.location.pathname

          })

      }
    )
  );

}


/* ============================================================
   NAVEGAÇÃO
   ============================================================ */

function registerNavigationEvents() {

  window.addEventListener(
    "popstate",
    dispatchNavigationEvent
  );

}


/* ============================================================
   ERROS GLOBAIS
   ============================================================ */

function registerGlobalErrorHandlers() {

  if (
    globalHandlersRegistered
  ) {

    return;

  }


  globalHandlersRegistered =
    true;


  window.addEventListener(
    "error",
    (event) => {

      /*
       * Erros relacionados a extensões do navegador
       * não precisam ser tratados como erro interno
       * se a origem for claramente uma extensão.
       */

      const source =
        String(
          event.filename ||
          ""
        );


      if (
        source.includes(
          "chrome-extension://"
        ) ||
        source.includes(
          "moz-extension://"
        ) ||
        source.includes(
          "extension://"
        )
      ) {

        return;

      }


      logApplication(
        "error",
        "Erro JavaScript não tratado.",
        {

          message:
            event.message ||
            "Erro desconhecido.",

          source:
            event.filename ||
            null,

          line:
            event.lineno ||
            null,

          column:
            event.colno ||
            null

        }
      );

    }
  );


  window.addEventListener(
    "unhandledrejection",
    (event) => {

      const reason =
        event.reason;


      /*
       * Rejeições causadas por cancelamentos de fluxo
       * não precisam gerar outro alerta.
       */

      if (
        reason?.name ===
        "AbortError"
      ) {

        return;

      }


      logApplication(
        "error",
        "Promise rejeitada sem tratamento.",
        reason
      );

    }
  );

}


/* ============================================================
   ESTADO DA APLICAÇÃO
   ============================================================ */

export function getApplicationState() {

  return Object.freeze({

    initialized:
      applicationInitialized,

    starting:
      applicationStarting,

    supabase:
      supabaseReady,

    auth:
      authReady,

    theme:
      themeReady,

    menu:
      menuReady,

    page:
      getCurrentPage()

  });

}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function initializeApplication() {

  if (
    applicationInitialized ||
    applicationStarting
  ) {

    return;

  }


  applicationStarting =
    true;


  const currentPage =
    getCurrentPage();


  logApplication(
    "info",
    `Iniciando ${AERIOM_APP.name} v${AERIOM_APP.version}.`
  );


  logApplication(
    "info",
    "Página atual.",
    currentPage
  );


  try {

    /*
     * --------------------------------------------------------
     * 1. Supabase
     * --------------------------------------------------------
     */

    await initializeSupabaseCore();


    /*
     * --------------------------------------------------------
     * 2. Auth
     * --------------------------------------------------------
     *
     * Auth precisa vir antes dos módulos opcionais.
     */

    await initializeAuthentication();


    /*
     * --------------------------------------------------------
     * 3. Tema
     * --------------------------------------------------------
     */

    await initializeThemeModule();


    /*
     * --------------------------------------------------------
     * 4. Menu
     * --------------------------------------------------------
     */

    await initializeMenuModule();


    /*
     * --------------------------------------------------------
     * 5. Finalização
     * --------------------------------------------------------
     */

    applicationInitialized =
      true;

    applicationStarting =
      false;


    dispatchReadyEvent();


    logApplication(
      "info",
      "AERIOM inicializado com sucesso.",
      getApplicationState()
    );


  } catch (
    error
  ) {

    applicationInitialized =
      false;

    applicationStarting =
      false;


    showApplicationError(
      error
    );

  }

}


/* ============================================================
   API GLOBAL
   ============================================================ */

window.AERIOM =
  Object.freeze({

    name:
      AERIOM_APP.name,

    version:
      AERIOM_APP.version,

    getCurrentPage,

    isAuthenticationPage,

    isProtectedPage,

    getLoginUrl,

    getCampaignsUrl,

    redirectToLogin,

    redirectToCampaigns,

    getApplicationState,

    isInitialized:
      () =>
        applicationInitialized,

    isSupabaseReady:
      () =>
        supabaseReady,

    isAuthReady:
      () =>
        authReady,

    isThemeReady:
      () =>
        themeReady,

    isMenuReady:
      () =>
        menuReady

  });


/* ============================================================
   START
   ============================================================ */

function startAeriom() {

  registerGlobalErrorHandlers();

  registerNavigationEvents();


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeApplication,
      {
        once:
          true
      }
    );


    return;

  }


  initializeApplication();

}


startAeriom();
