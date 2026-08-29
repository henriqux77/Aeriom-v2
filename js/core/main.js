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
* - Centralizar erros críticos de inicialização.
* 
* NÃO é responsabilidade deste arquivo:
* 
* - executar queries de campanhas;
* - controlar fichas;
* - controlar combate;
* - controlar mapas;
* - controlar Realtime de módulos;
* - decidir permissões;
* - implementar login.
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

* Quando a aplicação é aberta pela raiz:
* 
* /
* 
* consideramos index.html.
  */

if (
!filename
) {

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
TIPO DE PÁGINA
============================================================ */

function isAuthenticationPage() {

return (
getCurrentPage() ===
"index"
);
}

/* ============================================================
INICIALIZAÇÃO DO NÚCLEO
============================================================ */

async function initializeApplication() {

if (
applicationInitialized
) {

return;

}

/*

* Marcamos como inicializado somente depois que todos
* os módulos CORE terminarem corretamente.
  */

logApplication(
"info",
"Iniciando ${AERIOM_APP.name} v${AERIOM_APP.version}."
);

const currentPage =
getCurrentPage();

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
   ======================================================
   
   O tema é inicializado antes do evento global.
   
   Assim, quando outros módulos receberem
   "aeriom:ready", a base visual já estará pronta.
   ====================================================== */

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
   4. AUTH
   ======================================================
   
   Na tela index:
   
   - verifica sessão;
   - registra listener;
   - prepara login;
   - prepara cadastro;
   - prepara Discord.
   
   Nas páginas futuras, o sistema de proteção de sessão
   será expandido sem colocar essa lógica nos módulos
   individuais.
   ====================================================== */

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


/* ======================================================
   6. EVENTO GLOBAL
   ====================================================== */

window.dispatchEvent(

  new CustomEvent(
    "aeriom:ready",
    {
      detail: Object.freeze({

        page:
          currentPage,

        version:
          AERIOM_APP.version,

        app:
          AERIOM_APP.name

      })
    }
  )

);


logApplication(
  "info",
  "AERIOM inicializado com sucesso."
);

} catch (error) {

/*
 * Se qualquer módulo crítico falhar,
 * a aplicação não fica marcada como pronta.
 */

applicationInitialized =
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
ERRO DE INICIALIZAÇÃO
============================================================ */

function showApplicationError(
error
) {

/*

* Nunca mostramos diretamente mensagens provenientes
* de erros externos através de innerHTML.
  */

const authMessage =
document.getElementById(
"auth-message"
);

/*

* Caso estejamos no login,
* usamos o componente já existente.
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

* Caso seja outra página,
* criamos um aviso seguro.
  */

if (
!document.body
) {

return;

}

const container =
document.createElement(
"div"
);

container.setAttribute(
"role",
"alert"
);

container.className =
"aeriom-critical-error";

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

* Estilos mínimos de emergência.
* 
* Não dependemos do CSS para mostrar um erro crítico.
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

* O parâmetro error é utilizado somente para logging.
  */

if (
error
) {

console.error(
  "[AERIOM][APP] Detalhes do erro:",
  error
);

}
}

/* ============================================================
ERROS JAVASCRIPT GLOBAIS
============================================================ */

function registerGlobalErrorHandlers() {

/*

* Erros síncronos não tratados.
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
EVENTO DE NAVEGAÇÃO
============================================================ */

function registerNavigationEvents() {

/*

* Quando a aplicação navega por páginas tradicionais,
* o navegador recarrega o documento e o main.js é
* inicializado novamente.
* 
* Este evento existe para módulos que eventualmente
* precisem reagir a mudanças internas de navegação.
  */

window.addEventListener(
"popstate",
() => {

  document.dispatchEvent(

    new CustomEvent(
      "aeriom:navigationchange",
      {
        detail: Object.freeze({

          page:
            getCurrentPage(),

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