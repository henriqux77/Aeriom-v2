/*

* ============================================================
* AERIOM v2
* js/core/menu.js
* Navegação e menus globais
* ============================================================
* 
* Responsabilidades:
* 
* - Navegação principal.
* - Sidebar desktop.
* - Navegação mobile.
* - Menu de usuário.
* - Controle de menus expansíveis.
* - Fechamento ao clicar fora.
* - Fechamento pelo teclado.
* 
* NÃO é responsabilidade deste arquivo:
* 
* - autenticação;
* - autorização;
* - dados de campanhas;
* - fichas;
* - mapas;
* - Realtime.
* 
* Este módulo trabalha somente com interface/navegação.
* ============================================================
  */

/* ============================================================
CONFIGURAÇÃO
============================================================ */

const MENU_CONFIG = Object.freeze({

/*

* Chave usada somente para lembrar o estado visual
* da sidebar.
* 
* Não representa permissão.
  */
  sidebarStorageKey:
  "aeriom_sidebar_collapsed",

/*

* Breakpoint utilizado apenas pelo JS.
* 
* O CSS continua sendo responsável pelo layout.
  */
  mobileBreakpoint:
  980,

/*

* Seletores aceitos pelo sistema.
  */
  selectors: Object.freeze({

sidebar:
  "[data-aeriom-sidebar]",

sidebarToggle:
  "[data-sidebar-toggle]",

userMenu:
  "[data-user-menu]",

userMenuToggle:
  "[data-user-menu-toggle]",

expandable:
  "[data-menu-expand]",

navigation:
  "[data-aeriom-navigation]",

navigationItem:
  "[data-navigation-item]",

mobileNavigation:
  "[data-mobile-navigation]"

})

});

/* ============================================================
ESTADO
============================================================ */

let menuInitialized =
false;

let userMenuOpen =
false;

let openExpandableMenu =
null;

/* ============================================================
LOG
============================================================ */

function logMenu(
level,
message,
details = null
) {

const prefix =
"[AERIOM][MENU]";

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
HELPERS
============================================================ */

function getElements(
selector
) {

return Array.from(
document.querySelectorAll(
selector
)
);
}

function getElement(
selector
) {

return document.querySelector(
selector
);
}

/* ============================================================
MOBILE
============================================================ */

function isMobile() {

return (
window.matchMedia(
"(max-width: ${MENU_CONFIG.mobileBreakpoint}px)"
).matches
);
}

/* ============================================================
SIDEBAR
============================================================ */

function getSidebar() {

return getElement(
MENU_CONFIG.selectors.sidebar
);
}

function setSidebarCollapsed(
collapsed,
options = {}
) {

const {
persist = true
} = options;

const sidebar =
getSidebar();

if (!sidebar) {
return;
}

document.documentElement
.classList
.toggle(
"aeriom-sidebar-collapsed",
Boolean(collapsed)
);

sidebar.setAttribute(
"aria-expanded",
String(!collapsed)
);

if (persist) {

try {

  localStorage.setItem(
    MENU_CONFIG.sidebarStorageKey,
    collapsed
      ? "true"
      : "false"
  );

} catch (error) {

  logMenu(
    "warn",
    "Não foi possível salvar o estado da sidebar.",
    error
  );
}

}

document.dispatchEvent(
new CustomEvent(
"aeriom:sidebarchange",
{
detail: {
collapsed:
Boolean(collapsed)
}
}
)
);
}

function toggleSidebar() {

const collapsed =
document.documentElement
.classList
.contains(
"aeriom-sidebar-collapsed"
);

setSidebarCollapsed(
!collapsed
);
}

function restoreSidebarState() {

if (isMobile()) {
return;
}

let collapsed = false;

try {

collapsed =
  localStorage.getItem(
    MENU_CONFIG.sidebarStorageKey
  ) === "true";

} catch {
collapsed = false;
}

setSidebarCollapsed(
collapsed,
{
persist: false
}
);
}

/* ============================================================
MENU DO USUÁRIO
============================================================ */

function getUserMenu() {

return getElement(
MENU_CONFIG.selectors.userMenu
);
}

function getUserMenuToggle() {

return getElement(
MENU_CONFIG.selectors.userMenuToggle
);
}

function openUserMenu() {

const menu =
getUserMenu();

const toggle =
getUserMenuToggle();

if (!menu) {
return;
}

menu.hidden = false;

menu.classList.add(
"is-open"
);

if (toggle) {

toggle.setAttribute(
  "aria-expanded",
  "true"
);

}

userMenuOpen =
true;
}

function closeUserMenu() {

const menu =
getUserMenu();

const toggle =
getUserMenuToggle();

if (!menu) {
return;
}

menu.hidden = true;

menu.classList.remove(
"is-open"
);

if (toggle) {

toggle.setAttribute(
  "aria-expanded",
  "false"
);

}

userMenuOpen =
false;
}

function toggleUserMenu() {

if (userMenuOpen) {

closeUserMenu();

return;

}

openUserMenu();
}

/* ============================================================
MENUS EXPANSÍVEIS
============================================================ */

function closeExpandableMenu(
item
) {

if (!item) {
return;
}

const button =
item.querySelector(
"[data-menu-expand-trigger]"
);

const content =
item.querySelector(
"[data-menu-expand-content]"
);

if (content) {
content.hidden = true;
}

if (button) {

button.setAttribute(
  "aria-expanded",
  "false"
);

}

item.classList.remove(
"is-open"
);

if (
openExpandableMenu === item
) {

openExpandableMenu =
  null;

}
}

function openExpandableMenuItem(
item
) {

if (!item) {
return;
}

if (
openExpandableMenu &&
openExpandableMenu !== item
) {

closeExpandableMenu(
  openExpandableMenu
);

}

const button =
item.querySelector(
"[data-menu-expand-trigger]"
);

const content =
item.querySelector(
"[data-menu-expand-content]"
);

if (content) {
content.hidden = false;
}

if (button) {

button.setAttribute(
  "aria-expanded",
  "true"
);

}

item.classList.add(
"is-open"
);

openExpandableMenu =
item;
}

function toggleExpandableMenu(
item
) {

if (!item) {
return;
}

const isOpen =
item.classList.contains(
"is-open"
);

if (isOpen) {

closeExpandableMenu(
  item
);

return;

}

openExpandableMenuItem(
item
);
}

/* ============================================================
NAVEGAÇÃO
============================================================ */

function navigateTo(
destination
) {

if (
typeof destination !==
"string"
) {
return;
}

const target =
destination.trim();

if (!target) {
return;
}

/*

* Aceitamos somente destinos definidos pelo HTML.
* 
* Não construímos URLs com dados externos.
  */

window.location.assign(
target
);
}

function handleNavigationClick(
event
) {

const item =
event.currentTarget;

const destination =
item.dataset.navigationItem;

if (!destination) {
return;
}

/*

* Permite abrir links em nova aba usando
* Ctrl/Cmd + clique normalmente.
  */

if (
event.ctrlKey ||
event.metaKey ||
event.shiftKey ||
event.altKey
) {
return;
}

event.preventDefault();

navigateTo(
destination
);
}

/* ============================================================
MARCAR NAVEGAÇÃO ATIVA
============================================================ */

function normalizePath(
path
) {

if (!path) {
return "/";
}

return path
.replace(
//+/g,
"/"
)
.replace(
//$/,
""
)
.toLowerCase();
}

function updateActiveNavigation() {

const currentPath =
normalizePath(
window.location.pathname
);

const items =
getElements(
MENU_CONFIG.selectors.navigationItem
);

items.forEach(
(item) => {

  const destination =
    item.dataset.navigationItem;


  if (!destination) {
    return;
  }


  let destinationPath =
    destination;


  try {

    destinationPath =
      new URL(
        destination,
        window.location.origin
      ).pathname;

  } catch {
    destinationPath =
      destination;
  }


  const active =
    normalizePath(
      destinationPath
    ) === currentPath;


  item.classList.toggle(
    "is-active",
    active
  );


  item.setAttribute(
    "aria-current",
    active
      ? "page"
      : "false"
  );
}

);
}

/* ============================================================
FECHAR MENUS
============================================================ */

function closeAllMenus() {

closeUserMenu();

if (openExpandableMenu) {

closeExpandableMenu(
  openExpandableMenu
);

}
}

/* ============================================================
CLIQUE FORA
============================================================ */

function handleDocumentPointerDown(
event
) {

const target =
event.target;

if (
!(target instanceof Node)
) {
return;
}

const userMenu =
getUserMenu();

const userToggle =
getUserMenuToggle();

if (
userMenuOpen &&
userMenu &&
!userMenu.contains(target) &&
userToggle &&
!userToggle.contains(target)
) {

closeUserMenu();

}

if (
openExpandableMenu
) {

if (
  !openExpandableMenu.contains(
    target
  )
) {

  closeExpandableMenu(
    openExpandableMenu
  );
}

}
}

/* ============================================================
TECLADO
============================================================ */

function handleKeyDown(
event
) {

if (
event.key ===
"Escape"
) {

closeAllMenus();

return;

}

/*

* Sidebar desktop:
* 
* Ctrl/Cmd + B pode alternar a sidebar.
  */

if (
event.key.toLowerCase() === "b" &&
(event.ctrlKey || event.metaKey)
) {

if (!isMobile()) {

  event.preventDefault();

  toggleSidebar();
}

}
}

/* ============================================================
RESIZE
============================================================ */

function handleResize() {

if (isMobile()) {

/*
 * No mobile não mantemos estado de sidebar desktop.
 */

document.documentElement
  .classList
  .remove(
    "aeriom-sidebar-collapsed"
  );

return;

}

restoreSidebarState();
}

/* ============================================================
BIND SIDEBAR
============================================================ */

function bindSidebar() {

const toggle =
getElement(
MENU_CONFIG.selectors.sidebarToggle
);

if (!toggle) {
return;
}

toggle.addEventListener(
"click",
toggleSidebar
);

toggle.setAttribute(
"aria-expanded",
String(
!document.documentElement
.classList
.contains(
"aeriom-sidebar-collapsed"
)
)
);
}

/* ============================================================
BIND USER MENU
============================================================ */

function bindUserMenu() {

const toggle =
getUserMenuToggle();

if (!toggle) {
return;
}

toggle.addEventListener(
"click",
(event) => {

  event.preventDefault();

  event.stopPropagation();

  toggleUserMenu();
}

);

toggle.setAttribute(
"aria-expanded",
"false"
);
}

/* ============================================================
BIND EXPANDABLE MENUS
============================================================ */

function bindExpandableMenus() {

const items =
getElements(
MENU_CONFIG.selectors.expandable
);

items.forEach(
(item) => {

  const trigger =
    item.querySelector(
      "[data-menu-expand-trigger]"
    );


  if (!trigger) {
    return;
  }


  trigger.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();

      toggleExpandableMenu(
        item
      );
    }
  );


  trigger.setAttribute(
    "aria-expanded",
    "false"
  );
}

);
}

/* ============================================================
BIND NAVEGAÇÃO
============================================================ */

function bindNavigation() {

const items =
getElements(
MENU_CONFIG.selectors.navigationItem
);

items.forEach(
(item) => {

  item.addEventListener(
    "click",
    handleNavigationClick
  );
}

);

updateActiveNavigation();
}

/* ============================================================
GLOBAL EVENTS
============================================================ */

function bindGlobalEvents() {

document.addEventListener(
"pointerdown",
handleDocumentPointerDown
);

document.addEventListener(
"keydown",
handleKeyDown
);

window.addEventListener(
"resize",
handleResize
);
}

/* ============================================================
INICIALIZAÇÃO
============================================================ */

export function initializeMenu() {

if (menuInitialized) {
return;
}

menuInitialized =
true;

bindSidebar();

bindUserMenu();

bindExpandableMenus();

bindNavigation();

bindGlobalEvents();

restoreSidebarState();

logMenu(
"info",
"Sistema de navegação inicializado."
);
}

/* ============================================================
DESTROY
============================================================ */

export function destroyMenu() {

/*

* Os listeners registrados diretamente nos elementos serão
* removidos naturalmente quando a página for destruída.
* 
* Como a aplicação é uma VTT tradicional por páginas,
* não precisamos criar um sistema complexo de desmontagem
* neste módulo.
  */

closeAllMenus();

menuInitialized =
false;
}

/* ============================================================
API
============================================================ */

export {
toggleSidebar,
openUserMenu,
closeUserMenu,
closeAllMenus,
navigateTo,
updateActiveNavigation
};

/* ============================================================
INTEGRAÇÃO COM O NÚCLEO
============================================================ */

window.addEventListener(
"aeriom:ready",
() => {

initializeMenu();

},
{
once: true
}
);