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
 * - Inicializar os módulos CORE.
 * - Coordenar a ordem de inicialização.
 * - Emitir o evento global "aeriom:ready".
 * - Centralizar erros críticos.
 *
 * NÃO é responsabilidade deste arquivo:
 *
 * - queries de campanhas;
 * - fichas;
 * - combate;
 * - mapas;
 * - Realtime de módulos;
 * - autorização;
 * - implementação interna de login.
 *
 * Cada responsabilidade pertence ao seu respectivo módulo.
 * ============================================================
 */


/* ============================================================
   IMPORTS
   ============================================================ */

import {
  initializeSupabase
} from "./supabase.js";


import {
  initializeAuth
} from "./auth.js";


import {
  initializeTheme
} from "./theme.js";


import {
  initializeMenu
} from "./menu.js";


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


  const filename =
    pathname
      .split("/")
      .pop()
      ?.toLowerCase();


  /*
   * GitHub Pages pode entregar a aplicação pela raiz
   * dependendo da URL utilizada.
   */

  if (!filename) {

    return "index";
  }


  if (
    filename ===
    AERIOM_APP.pages.index
  ) {

    return "index";
  }


  if (
    filename ===
    AERIOM_APP.pages.campaigns
  ) {

    return "campaigns";
  }


  if (
    filename ===
    AERIOM_APP.pages.campaign
  ) {

    return "campaign";
  }


  if (
    filename ===
    AERIOM_APP.pages.characters
  ) {

    return "characters";
  }


  if (
    filename ===
    AERIOM_APP.pages.character
  ) {

    return "character";
  }


  return "unknown";
}


/* ============================================================
   VERIFICAR PÁGINA DE AUTENTICAÇÃO
   ============================================================ */

function isAuthenticationPage() {

  return (
    getCurrentPage() ===
    "index"
  );
}


/* ============================================================
   ERRO CRÍTICO
   ============================================================ */

function showApplicationError(
  error
) {

  /*
   * Nunca colocamos a mensagem do erro diretamente
   * em innerHTML.
   */

  const authMessage =
    document.getElementById(
      "auth-message"
    );


  /*
   * Se estamos na tela de autenticação,
   * utilizamos o componente existente.
   */

  if (
    authMessage
  ) {

    authMessage.textContent =
      "Não foi possível inicializar o AERIOM. Recarregue a página e tente novamente.";


    authMessage.dataset.type =
      "error";


    authMessage.hidden =
      false;


    return;
  }


  /*
   * Para páginas futuras, criamos um aviso de emergência.
   */

  if (
    !document.body
  ) {

    return;
  }


  /*
   * Evita criar vários avisos caso aconteça mais
   * de um erro crítico.
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
    "Recarregue a página e tente novamente. Se o problema continuar, verifique a configuração do Supabase.";


  container.append(
    title,
    message
  );


  /*
   * Estilo mínimo de emergência.
   *
   * Não dependemos do CSS para informar um erro crítico.
   */

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
        "1px solid rgba(168, 59, 59, .55)",

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


  /*
   * Detalhes completos ficam apenas no console.
   */

  logApplication(
    "error",
    "Detalhes do erro crítico.",
    error
  );
}


/* ============================================================
   INICIALIZAÇÃO DA APLICAÇÃO
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
    "Página detectada.",
    {
      page:
        currentPage,

      pathname:
        window.location.pathname
    }
  );


  try {

    /* ======================================================
       1. SUPABASE
       ====================================================== */

    await initializeSupabase();


    logApplication(
      "info",
      "Supabase inicializado."
    );


    /* ======================================================
       2. TEMA
       ====================================================== */

    /*
     * Tema não precisa ser assíncrono neste estágio.
     */

    initializeTheme();


    logApplication(
      "info",
      "Tema inicializado."
    );


    /* ======================================================
       3. MENU
       ====================================================== */

    initializeMenu();


    logApplication(
      "info",
      "Menu inicializado."
    );


    /* ======================================================
       4. AUTENTICAÇÃO
       ====================================================== */

    /*
     * Neste momento a página index é a tela de autenticação.
     *
     * Quando criarmos campanhas.html, campanha.html etc.,
     * o controle de sessão dessas páginas será expandido
     * de forma própria, sem duplicar a lógica do auth.js.
     */

    if (
      isAuthenticationPage()
    ) {

      await initializeAuth();


      logApplication(
        "info",
        "Autenticação inicializada."
      );
    }


    /* ======================================================
       5. ESTADO FINAL
       ====================================================== */

    applicationInitialized =
      true;

    applicationStarting =
      false;


    /* ======================================================
       6. EVENTO GLOBAL
       ====================================================== */

    window.dispatchEvent(
      new CustomEvent(
        "aeriom:ready",
        {
          detail: Object.freeze({

            app:
              AERIOM_APP.name,

            version:
              AERIOM_APP.version,

            page:
              currentPage

          })
        }
      )
    );


    logApplication(
      "info",
      "AERIOM inicializado com sucesso."
    );

  } catch (error) {

    applicationInitialized =
      false;

    applicationStarting =
      false;


    logApplication(
      "error",
      "Falha crítica durante a inicialização.",
      error
    );


    showApplicationError(
      error
    );
  }
}


/* ============================================================
   ERROS JAVASCRIPT GLOBAIS
   ============================================================ */

function registerGlobalErrorHandlers() {

  /*
   * Erros JavaScript não tratados.
   */

  window.addEventListener(
    "error",
    (event) => {

      /*
       * Erros disparados por recursos externos podem
       * não possuir uma mensagem útil.
       */

      logApplication(
        "error",
        "Erro JavaScript não tratado.",
        {

          message:
            event.message || "Erro desconhecido.",

          source:
            event.filename || null,

          line:
            event.lineno || null,

          column:
            event.colno || null

        }
      );
    }
  );


  /*
   * Promises rejeitadas sem catch.
   */

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
   EVENTOS DE NAVEGAÇÃO
   ============================================================ */

function registerNavigationEvents() {

  /*
   * O AERIOM atualmente utiliza páginas HTML tradicionais.
   *
   * Mesmo assim, registramos popstate para deixar o núcleo
   * preparado para futuras mudanças de navegação.
   */

  window.addEventListener(
    "popstate",
    () => {

      const page =
        getCurrentPage();


      document.dispatchEvent(
        new CustomEvent(
          "aeriom:navigationchange",
          {
            detail: Object.freeze({

              page,

              pathname:
                window.location.pathname

            })
          }
        )
      );
    }
  );
}


/* ============================================================
   INICIALIZAÇÃO QUANDO DOM ESTIVER PRONTO
   ============================================================ */

function startWhenReady() {

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
        once: true
      }
    );

    return;
  }


  initializeApplication();
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

    isInitialized:
      () =>
        applicationInitialized

  });


/* ============================================================
   START
   ============================================================ */

startWhenReady();