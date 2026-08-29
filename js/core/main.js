/*

* ============================================================
* AERIOM v2
* js/core/main.js
* Ponto de entrada da aplicação
* ============================================================
* 
* Responsabilidades:
* 
* - Inicializar os módulos principais.
* - Detectar a página atual.
* - Inicializar autenticação quando necessário.
* - Inicializar o sistema de tema.
* - Inicializar o sistema de navegação.
* - Centralizar erros de inicialização.
* 
* Este arquivo NÃO deve:
* 
* - implementar login;
* - implementar campanhas;
* - implementar fichas;
* - executar queries específicas de módulos;
* - controlar RLS;
* - manipular canais Realtime de módulos externos.
* 
* Ele apenas coordena o núcleo da aplicação.
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

/* ============================================================
CONFIGURAÇÃO
============================================================ */

const AERIOM_APP = Object.freeze({

name: "AERIOM",

version: "2.0.0",

/*

* Páginas que fazem parte da aplicação.
* 
* Isso será expandido conforme as fases forem implementadas.
  */
  pages: Object.freeze({

index: "index.html",

campaigns: "campanhas.html",

campaign: "campanha.html",

characters: "fichas.html",

character: "ficha.html"

})

});

/* ============================================================
ESTADO
============================================================ */

let applicationInitialized = false;

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

if (level === "error") {

console.error(
  prefix,
  message,
  details ?? ""
);

return;

}

if (level === "warn") {

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

function getCurrentPage() {

const pathname =
window.location.pathname;

const filename =
pathname
.split("/")
.pop()
?.toLowerCase();

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

/*

* Durante desenvolvimento local,
* o arquivo pode ser aberto sem nome explícito.
  */
  if (
  filename ===
  ""
  ) {
  return "index";
  }

return "unknown";
}

/* ============================================================
VERIFICAR SE É PÁGINA DE AUTENTICAÇÃO
============================================================ */

function isAuthenticationPage() {

return (
getCurrentPage() ===
"index"
);
}

/* ============================================================
BOOTSTRAP
============================================================ */

async function initializeApplication() {

if (applicationInitialized) {
return;
}

applicationInitialized = true;

logApplication(
"info",
"Inicializando ${AERIOM_APP.name} v${AERIOM_APP.version}."
);

const currentPage =
getCurrentPage();

logApplication(
"info",
"Página detectada.",
{
page: currentPage,
pathname: window.location.pathname
}
);

try {

/*
 * --------------------------------------------------------
 * 1. SUPABASE
 * --------------------------------------------------------
 *
 * O cliente precisa estar disponível antes dos módulos
 * que dependem dele.
 */

await initializeSupabase();


logApplication(
  "info",
  "Supabase inicializado."
);


/*
 * --------------------------------------------------------
 * 2. AUTH
 * --------------------------------------------------------
 *
 * Durante a Fase 2, o index.html é a página de
 * autenticação.
 *
 * Nas próximas fases, páginas protegidas terão seu
 * próprio guard de sessão.
 */

if (isAuthenticationPage()) {

  await initializeAuth();


  logApplication(
    "info",
    "Módulo de autenticação inicializado."
  );
}


/*
 * --------------------------------------------------------
 * 3. EVENTO GLOBAL
 * --------------------------------------------------------
 *
 * Permite que outros módulos saibam que o núcleo
 * terminou sua inicialização.
 *
 * Não carregamos dados de campanhas aqui.
 */

window.dispatchEvent(
  new CustomEvent(
    "aeriom:ready",
    {
      detail: Object.freeze({
        page: currentPage,
        version: AERIOM_APP.version
      })
    }
  )
);


logApplication(
  "info",
  "AERIOM inicializado com sucesso."
);

} catch (error) {

applicationInitialized = false;


logApplication(
  "error",
  "Falha durante a inicialização da aplicação.",
  error
);


showApplicationError(
  error
);

}
}

/* ============================================================
ERRO GLOBAL DE INICIALIZAÇÃO
============================================================ */

function showApplicationError(
error
) {

const existingMessage =
document.getElementById(
"auth-message"
);

/*

* Se estamos na tela de login,
* usamos o componente de mensagem existente.
  */

if (existingMessage) {

existingMessage.textContent =
  "Não foi possível inicializar o AERIOM. Recarregue a página e tente novamente.";

existingMessage.dataset.type =
  "error";

existingMessage.hidden =
  false;

return;

}

/*

* Para páginas futuras,
* criamos uma mensagem DOM segura.
* 
* Nunca usamos innerHTML com dados do erro.
  */

const container =
document.createElement(
"div"
);

container.setAttribute(
"role",
"alert"
);

container.style.position =
"fixed";

container.style.left =
"1rem";

container.style.right =
"1rem";

container.style.bottom =
"1rem";

container.style.zIndex =
"9999";

container.style.padding =
"1rem";

container.style.border =
"1px solid rgba(168, 59, 59, .5)";

container.style.borderRadius =
"10px";

container.style.background =
"#17110f";

container.style.color =
"#f0a4a4";

/*

* Conteúdo totalmente controlado pelo código.
  */
  container.textContent =
  "Não foi possível inicializar o AERIOM. Recarregue a página e tente novamente.";

document.body.appendChild(
container
);
}

/* ============================================================
EVENTOS GLOBAIS
============================================================ */

function registerGlobalEvents() {

/*

* Evita comportamento inesperado ao tentar enviar
* formulários enquanto a aplicação ainda está inicializando.
  */

window.addEventListener(
"error",
(event) => {

  logApplication(
    "error",
    "Erro JavaScript não tratado.",
    {
      message:
        event.message,

      source:
        event.filename,

      line:
        event.lineno,

      column:
        event.colno
    }
  );
}

);

/*

* Captura promises rejeitadas que não foram tratadas.
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
INICIALIZAÇÃO DOM
============================================================ */

function startWhenReady() {

registerGlobalEvents();

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
API GLOBAL CONTROLADA
============================================================ */

window.AERIOM = Object.freeze({

version:
AERIOM_APP.version,

getCurrentPage,

isInitialized:
() => applicationInitialized

});

/* ============================================================
START
============================================================ */

startWhenReady();