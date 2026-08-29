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
 * IMPORTANTE:
 *
 * A autenticação possui prioridade sobre módulos opcionais.
 *
 * theme.js e menu.js não podem impedir o Auth de iniciar.
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

  pages: Object.freeze({

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

  })

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
   * URL terminando em "/".
   */

  if (
    !filename
  ) {

    return "index";
  }


  /*
   * GitHub Pages pode apresentar index
   * implicitamente na raiz.
   */

  if (
    filename ===
    ""
  ) {

    return "index";
  }


  /*
   * Remove query/hash caso apareçam no pathname
   * em algum ambiente.
   */

  filename =
    filename
      .split("?")[0]
      .split("#")[0];


  switch (
    filename
  ) {

    case "index.html":
      return "index";


    case "campanhas.html":
      return "campaigns";


    case "campanha.html":
      return "campaign";


    case "fichas.html":
      return "characters";


    case "ficha.html":
      return "character";


    default:
      return "unknown";
  }
}


/* ============================================================
   PÁGINA DE AUTENTICAÇÃO
   ============================================================ */

export function isAuthenticationPage() {

  return (
    getCurrentPage() ===
    "index"
  );
}


/* ============================================================
   PÁGINA PROTEGIDA
   ============================================================ */

export function isProtectedPage() {

  const page =
    getCurrentPage();


  return (
    page === "campaigns" ||
    page === "campaign" ||
    page === "characters" ||
    page === "character"
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
   * Se estamos na tela de autenticação,
   * aproveitamos o elemento existente.
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
   * Não duplica mensagens.
   */

  const existing =
    document.querySelector(
      ".aeriom-critical-error"
    );


  if (
    existing
  ) {

    return;
  }


  if (
    !document.body
  ) {

    return;
  }


  /*
   * Criamos tudo com DOM seguro.
   */

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
        "0 15px 40px rgba(0,0,0,.45)"

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
    "Carregando núcleo Supabase..."
  );


  try {

    /*
     * Import dinâmico.
     *
     * Se algum outro módulo tiver problema,
     * isso não impede o Supabase de iniciar.
     */

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


    supabaseReady =
      true;


    logApplication(
      "info",
      "Supabase inicializado com sucesso."
    );


    return supabaseModule;

  } catch (error) {

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
    "Carregando módulo de autenticação..."
  );


  try {

    /*
     * Auth é carregado separadamente.
     *
     * Isso facilita descobrir exatamente se o problema
     * está no auth.js.
     */

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
      "Autenticação inicializada com sucesso."
    );


    return authModule;

  } catch (error) {

    authReady =
      false;


    logApplication(
      "error",
      "Falha ao inicializar o módulo de autenticação.",
      error
    );


    throw error;
  }
}


/* ============================================================
   TEMA
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

      logApplication(
        "warn",
        "theme.js carregado, mas initializeTheme não foi encontrado."
      );


      return;
    }


    await themeModule.initializeTheme();


    themeReady =
      true;


    logApplication(
      "info",
      "Tema inicializado."
    );

  } catch (error) {

    themeReady =
      false;


    /*
     * Tema é módulo visual.
     *
     * Nunca deve derrubar o login.
     */

    logApplication(
      "warn",
      "Não foi possível inicializar o tema. O restante da aplicação continuará.",
      error
    );
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

      logApplication(
        "warn",
        "menu.js carregado, mas initializeMenu não foi encontrado."
      );


      return;
    }


    await menuModule.initializeMenu();


    menuReady =
      true;


    logApplication(
      "info",
      "Menu inicializado."
    );

  } catch (error) {

    menuReady =
      false;


    /*
     * Menu também é módulo visual.
     *
     * Um erro nele não pode bloquear Auth.
     */

    logApplication(
      "warn",
      "Não foi possível inicializar o menu. O restante da aplicação continuará.",
      error
    );
  }
}


/* ============================================================
   EVENTO GLOBAL DE READY
   ============================================================ */

function dispatchReadyEvent(
  currentPage
) {

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

            page:
              currentPage,

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

  const page =
    getCurrentPage();


  document.dispatchEvent(
    new CustomEvent(
      "aeriom:navigationchange",
      {

        detail:
          Object.freeze({

            page,

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

  window.addEventListener(
    "error",
    (event) => {

      /*
       * Não exibir erro interno ao usuário.
       *
       * O console recebe os detalhes.
       */

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

      logApplication(
        "error",
        "Promise rejeitada sem tratamento.",
        event.reason
      );
    }
  );
}


/* ============================================================
   INICIALIZAÇÃO PRINCIPAL
   ============================================================ */

async function initializeApplication() {

  /*
   * Impede duas inicializações simultâneas.
   */

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
    "Página atual:",
    currentPage
  );


  try {

    /* ========================================================
       ETAPA 1
       SUPABASE
       ======================================================== */

    await initializeSupabaseCore();


    /* ========================================================
       ETAPA 2
       AUTH
       ======================================================== */

    /*
     * Auth é inicializado imediatamente depois do Supabase.
     *
     * Isso é proposital.
     */

    await initializeAuthentication();


    /* ========================================================
       ETAPA 3
       TEMA
       ======================================================== */

    /*
     * Tema não pode quebrar Auth.
     */

    await initializeThemeModule();


    /* ========================================================
       ETAPA 4
       MENU
       ======================================================== */

    /*
     * Menu não pode quebrar Auth.
     */

    await initializeMenuModule();


    /* ========================================================
       ETAPA 5
       FINAL
       ======================================================== */

    applicationInitialized =
      true;

    applicationStarting =
      false;


    dispatchReadyEvent(
      currentPage
    );


    logApplication(
      "info",
      "AERIOM inicializado com sucesso."
    );


    logApplication(
      "info",
      "Estado dos módulos:",
      {

        supabase:
          supabaseReady,

        auth:
          authReady,

        theme:
          themeReady,

        menu:
          menuReady

      }
    );

  } catch (error) {

    applicationInitialized =
      false;

    applicationStarting =
      false;


    /*
     * Neste ponto, somente falhas críticas chegam aqui.
     *
     * Principalmente:
     *
     * - Supabase;
     * - Auth.
     */

    showApplicationError(
      error
    );
  }
}


/* ============================================================
   API PÚBLICA AERIOM
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

    isInitialized:
      () =>
        applicationInitialized,

    isSupabaseReady:
      () =>
        supabaseReady,

    isAuthReady:
      () =>
        authReady

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