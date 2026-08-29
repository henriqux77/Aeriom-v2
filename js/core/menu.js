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
 * - Menus expansíveis.
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

  sidebarStorageKey:
    "aeriom_sidebar_collapsed",

  /*
   * Breakpoint usado somente para decisões do JavaScript.
   * O layout continua sendo responsabilidade do CSS.
   */
  mobileBreakpoint:
    980,

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

    expandableTrigger:
      "[data-menu-expand-trigger]",

    expandableContent:
      "[data-menu-expand-content]",

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

let menuInitialized = false;

let userMenuOpen = false;

let openExpandableMenu = null;


/*
 * Guardamos referências dos listeners globais.
 *
 * Isso permite destruir corretamente o módulo caso
 * futuramente o AERIOM passe a utilizar navegação SPA.
 */

let globalListeners = [];


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
   HELPERS DOM
   ============================================================ */

function getElement(
  selector
) {

  return document.querySelector(
    selector
  );
}


function getElements(
  selector
) {

  return Array.from(
    document.querySelectorAll(
      selector
    )
  );
}


/* ============================================================
   MOBILE
   ============================================================ */

function isMobile() {

  return window.matchMedia(
    `(max-width: ${MENU_CONFIG.mobileBreakpoint}px)`
  ).matches;
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


  /*
   * Se a página atual não possui sidebar,
   * simplesmente não fazemos nada.
   */

  if (!sidebar) {
    return;
  }


  const isCollapsed =
    Boolean(collapsed);


  /*
   * No mobile não aplicamos o estado colapsado
   * da sidebar desktop.
   */

  if (isMobile()) {

    document.documentElement.classList.remove(
      "aeriom-sidebar-collapsed"
    );

    return;
  }


  document.documentElement.classList.toggle(
    "aeriom-sidebar-collapsed",
    isCollapsed
  );


  sidebar.setAttribute(
    "aria-expanded",
    String(!isCollapsed)
  );


  if (persist) {

    try {

      localStorage.setItem(
        MENU_CONFIG.sidebarStorageKey,
        isCollapsed
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
            isCollapsed
        }
      }
    )
  );
}


function toggleSidebar() {

  if (isMobile()) {
    return;
  }


  const collapsed =
    document.documentElement.classList.contains(
      "aeriom-sidebar-collapsed"
    );


  setSidebarCollapsed(
    !collapsed
  );
}


function restoreSidebarState() {

  const sidebar =
    getSidebar();


  if (!sidebar) {
    return;
  }


  if (isMobile()) {

    document.documentElement.classList.remove(
      "aeriom-sidebar-collapsed"
    );

    return;
  }


  let collapsed = false;


  try {

    collapsed =
      localStorage.getItem(
        MENU_CONFIG.sidebarStorageKey
      ) === "true";

  } catch (error) {

    collapsed = false;

    logMenu(
      "warn",
      "Não foi possível ler o estado da sidebar.",
      error
    );
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


  userMenuOpen = true;
}


function closeUserMenu() {

  const menu =
    getUserMenu();

  const toggle =
    getUserMenuToggle();


  if (menu) {

    menu.hidden = true;

    menu.classList.remove(
      "is-open"
    );
  }


  if (toggle) {

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );
  }


  userMenuOpen = false;
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

function getExpandableTrigger(
  item
) {

  return item.querySelector(
    MENU_CONFIG.selectors.expandableTrigger
  );
}


function getExpandableContent(
  item
) {

  return item.querySelector(
    MENU_CONFIG.selectors.expandableContent
  );
}


function closeExpandableMenu(
  item
) {

  if (!item) {
    return;
  }


  const trigger =
    getExpandableTrigger(
      item
    );


  const content =
    getExpandableContent(
      item
    );


  if (content) {

    content.hidden =
      true;
  }


  if (trigger) {

    trigger.setAttribute(
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


  /*
   * Fecha o menu expansível anterior.
   *
   * Isso impede vários submenus de ficarem abertos
   * simultaneamente.
   */

  if (
    openExpandableMenu &&
    openExpandableMenu !== item
  ) {

    closeExpandableMenu(
      openExpandableMenu
    );
  }


  const trigger =
    getExpandableTrigger(
      item
    );


  const content =
    getExpandableContent(
      item
    );


  if (content) {

    content.hidden =
      false;
  }


  if (trigger) {

    trigger.setAttribute(
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
   * O destino vem do próprio HTML.
   *
   * Não construímos URLs usando dados do banco.
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


  if (!item) {
    return;
  }


  const destination =
    item.dataset.navigationItem;


  if (!destination) {
    return;
  }


  /*
   * Mantemos o comportamento padrão do navegador
   * para Ctrl/Cmd + clique e outras combinações.
   */

  if (
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  ) {

    return;
  }


  /*
   * Se for um botão, impedimos o comportamento padrão.
   * Se for um link, também controlamos a navegação para
   * manter o comportamento consistente.
   */

  event.preventDefault();


  navigateTo(
    destination
  );
}


/* ============================================================
   NAVEGAÇÃO ATIVA
   ============================================================ */

function normalizePath(
  path
) {

  if (!path) {
    return "/";
  }


  let normalized =
    String(path)
      .split("?")[0]
      .split("#")[0]
      .replace(
        /\/+/g,
        "/"
      )
      .toLowerCase();


  /*
   * Remove a barra final, mas preserva "/".
   */

  if (
    normalized.length > 1 &&
    normalized.endsWith("/")
  ) {

    normalized =
      normalized.slice(
        0,
        -1
      );
  }


  return normalized;
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
            window.location.href
          ).pathname;

      } catch (error) {

        logMenu(
          "warn",
          "Destino de navegação inválido.",
          {
            destination,
            error
          }
        );
      }


      const active =
        normalizePath(
          destinationPath
        ) === currentPath;


      item.classList.toggle(
        "is-active",
        active
      );


      if (active) {

        item.setAttribute(
          "aria-current",
          "page"
        );

      } else {

        item.removeAttribute(
          "aria-current"
        );
      }
    }
  );
}


/* ============================================================
   FECHAR TODOS OS MENUS
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


  /*
   * Menu do usuário.
   */

  if (userMenuOpen) {

    const userMenu =
      getUserMenu();

    const userMenuToggle =
      getUserMenuToggle();


    const clickedInsideMenu =
      userMenu &&
      userMenu.contains(
        target
      );


    const clickedToggle =
      userMenuToggle &&
      userMenuToggle.contains(
        target
      );


    if (
      !clickedInsideMenu &&
      !clickedToggle
    ) {

      closeUserMenu();
    }
  }


  /*
   * Menu expansível.
   */

  if (openExpandableMenu) {

    const clickedInside =
      openExpandableMenu.contains(
        target
      );


    if (!clickedInside) {

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

  /*
   * ESC fecha menus abertos.
   */

  if (
    event.key ===
    "Escape"
  ) {

    closeAllMenus();

    return;
  }


  /*
   * Ctrl+B / Cmd+B alterna a sidebar no desktop.
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

    document.documentElement.classList.remove(
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
      !document.documentElement.classList.contains(
        "aeriom-sidebar-collapsed"
      )
    )
  );
}


/* ============================================================
   BIND MENU DO USUÁRIO
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
   BIND MENUS EXPANSÍVEIS
   ============================================================ */

function bindExpandableMenus() {

  const items =
    getElements(
      MENU_CONFIG.selectors.expandable
    );


  items.forEach(
    (item) => {

      const trigger =
        getExpandableTrigger(
          item
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


      const content =
        getExpandableContent(
          item
        );


      if (content) {

        content.hidden =
          true;
      }
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
   EVENTOS GLOBAIS
   ============================================================ */

function bindGlobalEvents() {

  const pointerHandler =
    handleDocumentPointerDown;


  const keyboardHandler =
    handleKeyDown;


  const resizeHandler =
    handleResize;


  document.addEventListener(
    "pointerdown",
    pointerHandler
  );


  document.addEventListener(
    "keydown",
    keyboardHandler
  );


  window.addEventListener(
    "resize",
    resizeHandler
  );


  globalListeners = [
    {
      target: document,
      event: "pointerdown",
      handler: pointerHandler
    },
    {
      target: document,
      event: "keydown",
      handler: keyboardHandler
    },
    {
      target: window,
      event: "resize",
      handler: resizeHandler
    }
  ];
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

  if (!menuInitialized) {
    return;
  }


  closeAllMenus();


  /*
   * Remove somente os listeners pertencentes a este módulo.
   */

  globalListeners.forEach(
    ({
      target,
      event,
      handler
    }) => {

      target.removeEventListener(
        event,
        handler
      );
    }
  );


  globalListeners = [];


  menuInitialized =
    false;


  logMenu(
    "info",
    "Sistema de navegação destruído."
  );
}


/* ============================================================
   API PÚBLICA
   ============================================================ */

export {
  toggleSidebar,
  openUserMenu,
  closeUserMenu,
  closeAllMenus,
  navigateTo,
  updateActiveNavigation
};