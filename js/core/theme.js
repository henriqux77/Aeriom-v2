/*

* ============================================================
* AERIOM v2
* js/core/theme.js
* Gerenciador global de temas
* ============================================================
* 
* Responsabilidades:
* 
* - Aplicar o tema visual atual.
* - Controlar temas globais da aplicação.
* - Preparar a estrutura para temas das campanhas.
* - Aplicar variáveis CSS através do DOM.
* - Persistir apenas preferências visuais locais.
* 
* IMPORTANTE:
* 
* Este módulo NÃO decide se um usuário pode alterar o tema
* de uma campanha.
* 
* Permissão de Mestre/Jogador será determinada pelo Supabase.
* 
* localStorage neste arquivo serve SOMENTE para preferência
* visual local. Nunca para autorização.
* ============================================================
  */

/* ============================================================
CONFIGURAÇÃO
============================================================ */

const THEME_CONFIG = Object.freeze({

storageKey:
"aeriom_theme",

defaultTheme:
"default",

transitionDuration:
220,

themes: Object.freeze({

default: Object.freeze({
  id: "default",

  name: "AERIOM",

  description:
    "O tema padrão da mesa.",

  variables: Object.freeze({

    "--theme-accent":
      "#c49e53",

    "--theme-accent-light":
      "#e3c67f",

    "--theme-accent-dark":
      "#886a31",

    "--theme-danger":
      "#a83b3b",

    "--theme-mana":
      "#3f72b7",

    "--theme-bg":
      "#090807",

    "--theme-surface":
      "#15120f"

  })
}),


forest: Object.freeze({
  id: "forest",

  name: "Floresta",

  description:
    "Uma atmosfera antiga e selvagem.",

  variables: Object.freeze({

    "--theme-accent":
      "#a88d52",

    "--theme-accent-light":
      "#d0bb7a",

    "--theme-accent-dark":
      "#746438",

    "--theme-danger":
      "#9d4138",

    "--theme-mana":
      "#477b70",

    "--theme-bg":
      "#080c09",

    "--theme-surface":
      "#101611"

  })
}),


cave: Object.freeze({
  id: "cave",

  name: "Caverna",

  description:
    "Pedra, sombras e profundezas.",

  variables: Object.freeze({

    "--theme-accent":
      "#9f8a69",

    "--theme-accent-light":
      "#c9b28a",

    "--theme-accent-dark":
      "#6e604d",

    "--theme-danger":
      "#963f3f",

    "--theme-mana":
      "#536f91",

    "--theme-bg":
      "#08090a",

    "--theme-surface":
      "#121315"

  })
}),


volcano: Object.freeze({
  id: "volcano",

  name: "Vulcão",

  description:
    "Calor, cinzas e perigo.",

  variables: Object.freeze({

    "--theme-accent":
      "#c28a45",

    "--theme-accent-light":
      "#e2ad60",

    "--theme-accent-dark":
      "#80582b",

    "--theme-danger":
      "#c04432",

    "--theme-mana":
      "#5c74a1",

    "--theme-bg":
      "#100907",

    "--theme-surface":
      "#1a0e0b"

  })
}),


castle: Object.freeze({
  id: "castle",

  name: "Castelo",

  description:
    "Pedra antiga, nobreza e mistério.",

  variables: Object.freeze({

    "--theme-accent":
      "#b59a62",

    "--theme-accent-light":
      "#dfc889",

    "--theme-accent-dark":
      "#76643f",

    "--theme-danger":
      "#934141",

    "--theme-mana":
      "#506e9d",

    "--theme-bg":
      "#09090a",

    "--theme-surface":
      "#151516"

  })
}),


coast: Object.freeze({
  id: "coast",

  name: "Costa",

  description:
    "Mar, vento e horizontes distantes.",

  variables: Object.freeze({

    "--theme-accent":
      "#bba36b",

    "--theme-accent-light":
      "#dfca91",

    "--theme-accent-dark":
      "#786943",

    "--theme-danger":
      "#a14b46",

    "--theme-mana":
      "#4382a7",

    "--theme-bg":
      "#080b0d",

    "--theme-surface":
      "#101619"

  })
}),


ruins: Object.freeze({
  id: "ruins",

  name: "Ruínas",

  description:
    "Vestígios de uma civilização esquecida.",

  variables: Object.freeze({

    "--theme-accent":
      "#a68e62",

    "--theme-accent-light":
      "#d0b982",

    "--theme-accent-dark":
      "#6f6043",

    "--theme-danger":
      "#99413f",

    "--theme-mana":
      "#596f8c",

    "--theme-bg":
      "#090908",

    "--theme-surface":
      "#141311"

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
!isValidTheme(themeId)
) {

return THEME_CONFIG.themes[
  THEME_CONFIG.defaultTheme
];

}

return THEME_CONFIG.themes[
themeId
];
}

/* ============================================================
LISTAR TEMAS
============================================================ */

export function getAvailableThemes() {

return Object.values(
THEME_CONFIG.themes
).map(
(theme) => ({
id: theme.id,

  name: theme.name,

  description:
    theme.description
})

);
}

/* ============================================================
PREFERÊNCIA LOCAL
============================================================ */

function getStoredTheme() {

try {

const stored =
  localStorage.getItem(
    THEME_CONFIG.storageKey
  );


if (
  isValidTheme(stored)
) {
  return stored;
}

} catch (error) {

logTheme(
  "warn",
  "Não foi possível acessar a preferência de tema local.",
  error
);

}

return THEME_CONFIG.defaultTheme;
}

function storeTheme(
themeId
) {

try {

localStorage.setItem(
  THEME_CONFIG.storageKey,
  themeId
);

} catch (error) {

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

document.documentElement
.classList
.add(
"aeriom-theme-transition"
);

window.setTimeout(
() => {

  document.documentElement
    .classList
    .remove(
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
getTheme(themeId);

if (
!isValidTheme(theme.id)
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

if (animate) {
enableThemeTransition();
}

applyThemeVariables(
theme
);

document.documentElement
.dataset
.theme =
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
backgroundImage !== null
) {

applyBackgroundImage(
  backgroundImage
);

} else {

/*
 * Quando o tema é aplicado sem uma imagem explícita,
 * preservamos a imagem atualmente definida.
 */

if (currentBackground) {

  applyBackgroundImage(
    currentBackground
  );
}

}

document.dispatchEvent(
new CustomEvent(
"aeriom:themechange",
{
detail: Object.freeze({
themeId: theme.id,

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
TEMA DA CAMPANHA
============================================================ */

/**

* Aplica o tema visual de uma campanha.
* 
* Esta função NÃO consulta o banco.
* 
* O módulo da campanha será responsável por obter:
* 
* campaign.theme
* campaign.background_url
* 
* e então chamar esta função.
  */
  export function applyCampaignTheme(
  themeId,
  backgroundImage = null
  ) {

return applyTheme(
themeId,
{
persist: false,
animate: true,
backgroundImage
}
);
}

/* ============================================================
BACKGROUND
============================================================ */

export function applyBackgroundImage(
imageUrl
) {

const body =
document.body;

if (!body) {
return;
}

/*

* Nunca inserimos a URL através de innerHTML.
* 
* O CSS recebe a URL através de uma variável.
* 
* A URL vem do banco/Storage e deve ser validada
* pelos módulos responsáveis pelo conteúdo.
  */

if (
typeof imageUrl !==
"string" ||
!imageUrl.trim()
) {

body.style.removeProperty(
  "--aeriom-background-image"
);

currentBackground =
  null;

return;

}

const normalizedUrl =
imageUrl.trim();

body.style.setProperty(
"--aeriom-background-image",
"url("${CSS.escape(normalizedUrl)}")"
);

currentBackground =
normalizedUrl;
}

/* ============================================================
LIMPAR BACKGROUND
============================================================ */

export function clearBackgroundImage() {

document.body?.style.removeProperty(
"--aeriom-background-image"
);

currentBackground =
null;
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

/*

* A preferência local é utilizada somente para a aparência
* da própria aplicação fora de uma campanha.
  */

const storedTheme =
getStoredTheme();

applyTheme(
storedTheme,
{
persist: false,
animate: false
}
);

logTheme(
"info",
"Gerenciador de temas inicializado.",
{
theme: storedTheme
}
);

return storedTheme;
}

/* ============================================================
EVENTO GLOBAL
============================================================ */

window.addEventListener(
"aeriom:ready",
() => {

/*
 * O main.js dispara este evento depois que o núcleo
 * terminou de inicializar.
 *
 * O tema é inicializado uma única vez.
 */

initializeTheme();

},
{
once: true
}
);

/* ============================================================
API GLOBAL CONTROLADA
============================================================ */

window.AERIOM_THEME = Object.freeze({

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
clearBackgroundImage

});