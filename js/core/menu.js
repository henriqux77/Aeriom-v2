/*
 * ============================================================
 * AERIOM v2
 * js/core/menu.js
 * Navegação e menus globais
 * ============================================================
 */

const MENU_CONFIG = Object.freeze({
sidebarStorageKey:
    "aeriom_sidebar_collapsed",

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

let menuInitialized =
  false;

let userMenuOpen =
  false;

let openExpandableMenu =
  null;

let globalListeners =
  [];

let boundElements =
  [];


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
   DOM
   ============================================================ */

function getElement(
  selector
) {

  if (
    typeof selector !==
    "string"
  ) {

    return null;

  }


  return document.querySelector(
    selector
  );

}


function getElements(
  selector
) {

  if (
    typeof selector !==
    "string"
  ) {

    return [];

  }


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

  if (
    typeof window.matchMedia !==
    "function"
  ) {

    return window.innerWidth <=
      MENU_CONFIG.mobileBreakpoint;

  }


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


  if (
    !sidebar
  ) {

    return;

  }


  const isCollapsed =
    Boolean(
      collapsed
    );


  /*
   * No mobile, a sidebar desktop não utiliza
   * o estado collapsed.
   */

  if (
    isMobile()
  ) {

    document.documentElement.classList.remove(
      "aeriom-sidebar-collapsed"
    );

    sidebar.setAttribute(
      "aria-expanded",
      "true"
    );

    return;

  }


  document.documentElement.classList.toggle(
    "aeriom-sidebar-collapsed",
    isCollapsed
  );


  sidebar.setAttribute(
    "aria-expanded",
    String(
      !isCollapsed
    )
  );


  if (
    persist
  ) {

    try {

      localStorage.setItem(
        MENU_CONFIG.sidebarStorageKey,
        isCollapsed
          ? "true"
          : "false"
      );

    } catch (
      error
    ) {

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


function ensureMobileSidebarBackdrop() {
  let backdrop = document.getElementById("aeriom-mobile-sidebar-backdrop");
  if (backdrop) return backdrop;

  backdrop = document.createElement("button");
  backdrop.id = "aeriom-mobile-sidebar-backdrop";
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Fechar menu");
  backdrop.className = "aeriom-mobile-sidebar-backdrop";
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", closeMobileSidebar);
  return backdrop;
}

function openMobileSidebar() {
  const sidebar = getSidebar();
  const backdrop = ensureMobileSidebarBackdrop();
  if (!sidebar) return;
  sidebar.classList.add("is-mobile-open");
  backdrop.classList.add("is-open");
  document.body.classList.add("aeriom-mobile-menu-open");
  const toggle = getElement(MENU_CONFIG.selectors.sidebarToggle);
  toggle?.setAttribute("aria-expanded", "true");
}

function closeMobileSidebar() {
  const sidebar = getSidebar();
  const backdrop = document.getElementById("aeriom-mobile-sidebar-backdrop");
  sidebar?.classList.remove("is-mobile-open");
  backdrop?.classList.remove("is-open");
  document.body.classList.remove("aeriom-mobile-menu-open");
  const toggle = getElement(MENU_CONFIG.selectors.sidebarToggle);
  toggle?.setAttribute("aria-expanded", "false");
}

function toggleSidebar() {
  if (isMobile()) {
    const sidebar = getSidebar();
    if (sidebar?.classList.contains("is-mobile-open")) closeMobileSidebar();
    else openMobileSidebar();
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


  if (
    !sidebar
  ) {

    return;

  }


  if (
    isMobile()
  ) {

    document.documentElement.classList.remove(
      "aeriom-sidebar-collapsed"
    );

    sidebar.setAttribute(
      "aria-expanded",
      "true"
    );

    return;

  }


  let collapsed =
    false;


  try {

    collapsed =
      localStorage.getItem(
        MENU_CONFIG.sidebarStorageKey
      ) === "true";

  } catch (
    error
  ) {

    logMenu(
      "warn",
      "Não foi possível ler o estado da sidebar.",
      error
    );

  }


  setSidebarCollapsed(
    collapsed,
    {
      persist:
        false
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


  if (
    !menu
  ) {

    return;

  }


  menu.hidden =
    false;


  menu.classList.add(
    "is-open"
  );


  if (
    toggle
  ) {

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


  if (
    menu
  ) {

    menu.hidden =
      true;

    menu.classList.remove(
      "is-open"
    );

  }


  if (
    toggle
  ) {

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );

  }


  userMenuOpen =
    false;

}


function toggleUserMenu() {

  if (
    userMenuOpen
  ) {

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

  return item?.querySelector(
    MENU_CONFIG.selectors.expandableTrigger
  ) || null;

}


function getExpandableContent(
  item
) {

  return item?.querySelector(
    MENU_CONFIG.selectors.expandableContent
  ) || null;

}


function closeExpandableMenu(
  item
) {

  if (
    !item
  ) {

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


  if (
    content
  ) {

    content.hidden =
      true;

  }


  if (
    trigger
  ) {

    trigger.setAttribute(
      "aria-expanded",
      "false"
    );

  }


  item.classList.remove(
    "is-open"
  );


  if (
    openExpandableMenu ===
    item
  ) {

    openExpandableMenu =
      null;

  }

}


function openExpandableMenuItem(
  item
) {

  if (
    !item
  ) {

    return;

  }


  if (
    openExpandableMenu &&
    openExpandableMenu !==
      item
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


  if (
    content
  ) {

    content.hidden =
      false;

  }


  if (
    trigger
  ) {

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

  if (
    !item
  ) {

    return;

  }


  const isOpen =
    item.classList.contains(
      "is-open"
    );


  if (
    isOpen
  ) {

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


  if (
    !target
  ) {

    return;

  }


  /*
   * O destino é definido pelo próprio HTML.
   * Não recebe dados do banco.
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


  if (
    !item
  ) {

    return;

  }


  const destination =
    item.dataset.navigationItem;


  if (
    !destination
  ) {

    return;

  }


  /*
   * Não interceptamos combinações usadas para
   * abrir links em nova aba/janela.
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
   * Links <a> normais devem continuar funcionando
   * pelo comportamento nativo do navegador.
   *
   * Só controlamos a navegação quando o elemento
   * explicitamente pede comportamento via
   * data-navigation-item.
   */

  if (
    item.tagName ===
    "A"
  ) {

    const href =
      item.getAttribute(
        "href"
      );


    if (
      href &&
      href.trim()
    ) {

      return;

    }

  }


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

  if (
    !path
  ) {

    return "/";

  }


  let normalized =
    String(
      path
    )
      .split("?")[0]
      .split("#")[0]
      .replace(
        /\/+/g,
        "/"
      )
      .toLowerCase();


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


      if (
        !destination
      ) {

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

      } catch (
        error
      ) {

        logMenu(
          "warn",
          "Destino de navegação inválido.",
          {
            destination,
            error
          }
        );


        return;

      }


      const active =
        normalizePath(
          destinationPath
        ) ===
        currentPath;


      item.classList.toggle(
        "is-active",
        active
      );


      if (
        active
      ) {

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
   FECHAR MENUS
   ============================================================ */

function closeAllMenus() {

  closeUserMenu();


  if (
    openExpandableMenu
  ) {

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
  const target = event.target;
  if (!(target instanceof Node)) return;

  if (userMenuOpen) {
    const menu = getUserMenu();
    const toggle = getUserMenuToggle();
    if (!menu?.contains(target) && !toggle?.contains(target)) closeUserMenu();
  }

  if (openExpandableMenu && !openExpandableMenu.contains(target)) {
    closeExpandableMenu(openExpandableMenu);
  }

  if (isMobile()) {
    const sidebar = getSidebar();
    const toggle = getElement(MENU_CONFIG.selectors.sidebarToggle);
    if (
      sidebar?.classList.contains("is-mobile-open") &&
      !sidebar.contains(target) &&
      !toggle?.contains(target)
    ) {
      closeMobileSidebar();
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
    closeMobileSidebar();

    return;

  }


  if (
    event.key?.toLowerCase() ===
      "b" &&
    (event.ctrlKey ||
      event.metaKey)
  ) {

    if (
      !isMobile()
    ) {

      event.preventDefault();

      toggleSidebar();

    }

  }

}


/* ============================================================
   RESIZE
   ============================================================ */

function handleResize() {

  if (
    isMobile()
  ) {

    const sidebar =
      getSidebar();


    document.documentElement.classList.remove(
      "aeriom-sidebar-collapsed"
    );


    sidebar?.setAttribute(
      "aria-expanded",
      "true"
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


  if (
    !toggle
  ) {

    return;

  }


  toggle.addEventListener(
    "click",
    toggleSidebar
  );


  boundElements.push(
    {
      element:
        toggle,

      event:
        "click",

      handler:
        toggleSidebar
    }
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
   BIND USER MENU
   ============================================================ */

function bindUserMenu() {

  const toggle =
    getUserMenuToggle();


  if (
    !toggle
  ) {

    return;

  }


  const handler =
    (event) => {

      event.preventDefault();

      event.stopPropagation();

      toggleUserMenu();

    };


  toggle.addEventListener(
    "click",
    handler
  );


  boundElements.push(
    {
      element:
        toggle,

      event:
        "click",

      handler
    }
  );


  toggle.setAttribute(
    "aria-expanded",
    "false"
  );

}


/* ============================================================
   BIND EXPANDABLE
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


      if (
        !trigger
      ) {

        return;

      }


      const handler =
        (event) => {

          event.preventDefault();

          event.stopPropagation();

          toggleExpandableMenu(
            item
          );

        };


      trigger.addEventListener(
        "click",
        handler
      );


      boundElements.push(
        {
          element:
            trigger,

          event:
            "click",

          handler
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


      if (
        content
      ) {

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

      const handler =
        handleNavigationClick;


      item.addEventListener(
        "click",
        handler
      );


      boundElements.push(
        {
          element:
            item,

          event:
            "click",

          handler
        }
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
      target:
        document,

      event:
        "pointerdown",

      handler:
        pointerHandler
    },

    {
      target:
        document,

      event:
        "keydown",

      handler:
        keyboardHandler
    },

    {
      target:
        window,

      event:
        "resize",

      handler:
        resizeHandler
    }

  ];

}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

export function initializeMenu() {

  if (
    menuInitialized
  ) {

    return;

  }


  try {

    bindSidebar();

    bindUserMenu();

    bindExpandableMenus();

    bindNavigation();

    bindGlobalEvents();
    bindCommandPaletteShortcuts();

    restoreSidebarState();


    menuInitialized =
      true;


    logMenu(
      "info",
      "Sistema de navegação inicializado."
    );

  } catch (
    error
  ) {

    menuInitialized =
      false;


    logMenu(
      "error",
      "Falha ao inicializar o sistema de navegação.",
      error
    );

  }

}


/* ============================================================
   DESTROY
   ============================================================ */

export function destroyMenu() {

  if (
    !menuInitialized
  ) {

    return;

  }


  closeAllMenus();


  boundElements.forEach(
    ({
      element,
      event,
      handler
    }) => {

      element.removeEventListener(
        event,
        handler
      );

    }
  );


  boundElements =
    [];


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


  globalListeners =
    [];


  menuInitialized =
    false;


  userMenuOpen =
    false;


  openExpandableMenu =
    null;


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


/* ============================================================
   AUTO INIT
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeMenu,
    {
      once:
        true
    }
  );

} else {

  initializeMenu();

}function ensureCommandPalette() {
  if (document.getElementById("aeriom-command-palette")) return;

  const panel = document.createElement("div");
  panel.id = "aeriom-command-palette";
  panel.className = "aeriom-command-palette";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="aeriom-command-backdrop" data-command-close></div>
    <section class="aeriom-command-dialog" role="dialog" aria-modal="true" aria-labelledby="aeriom-command-title">
      <div class="aeriom-command-head">
        <div><span>ATALHO DA MESA</span><strong id="aeriom-command-title">Pesquisar no AERION</strong></div>
        <button type="button" data-command-close aria-label="Fechar">×</button>
      </div>
      <label class="aeriom-command-input">
        <span aria-hidden="true">⌕</span>
        <input id="aeriom-command-search" type="search" placeholder="Buscar ferramenta, página ou aba…" autocomplete="off">
        <kbd>ESC</kbd>
      </label>
      <div id="aeriom-command-results" class="aeriom-command-results"></div>
      <small class="aeriom-command-help">Ctrl/⌘ K ou / para abrir · ↑ ↓ para navegar · Enter para abrir</small>
    </section>
  `;
  document.body.appendChild(panel);

  const items = [
    ["Campanhas","Abrir sua biblioteca de campanhas","./campanhas.html"],
    ["Minhas Fichas","Abrir personagens salvos","./minhas-fichas.html"],
    ["Livro do AERION","Consultar regras e pesquisar no livro","./livro.html"],
    ["Mesa","Voltar para a campanha atual","__campaign__"]
  ];

  function campaignItems() {
    return [...document.querySelectorAll("[data-campaign-tab]")].map((el) => [
      String(el.textContent || "").replace(/\s+/g," ").trim(),
      "Abrir esta ferramenta na mesa",
      "__tab__:" + (el.dataset.campaignTab || "")
    ]);
  }

  const input = panel.querySelector("#aeriom-command-search");
  const results = panel.querySelector("#aeriom-command-results");
  let active = 0;

  function close() {
    panel.hidden = true;
    document.body.classList.remove("aeriom-command-open");
  }

  function open() {
    panel.hidden = false;
    document.body.classList.add("aeriom-command-open");
    input.value = "";
    active = 0;
    render();
    requestAnimationFrame(() => input.focus());
  }

  function allItems() {
    return location.pathname.includes("campanha.html")
      ? items.concat(campaignItems())
      : items.filter(([name,,href]) => href !== "__campaign__");
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    const list = allItems().filter(([name,desc]) => (name+" "+desc).toLowerCase().includes(q));
    active = Math.min(active, Math.max(0,list.length-1));
    results.replaceChildren();

    list.forEach(([name,desc,target],index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === active ? "is-active" : "";
      button.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
      button.addEventListener("click",()=> {
        close();
        if (target.startsWith("__tab__:")) {
          document.querySelector(`[data-campaign-tab="${target.slice(8)}"]`)?.click();
        } else if (target === "__campaign__") {
          const id = new URLSearchParams(location.search).get("campaign");
          if (id) location.href = \`./campanha.html?campaign=${encodeURIComponent(id)}\`;
        } else {
          location.href = target;
        }
      });
      results.appendChild(button);
    });
  }

  input.addEventListener("input", render);
  input.addEventListener("keydown", (event) => {
    const buttons = [...results.querySelectorAll("button")];
    if (event.key === "ArrowDown") { event.preventDefault(); active=Math.min(active+1,buttons.length-1); render(); }
    if (event.key === "ArrowUp") { event.preventDefault(); active=Math.max(active-1,0); render(); }
    if (event.key === "Enter") { event.preventDefault(); buttons[active]?.click(); }
    if (event.key === "Escape") close();
  });
  panel.addEventListener("click",(event)=>{ if(event.target.closest("[data-command-close]")) close(); });

  window.AERIONCommand = { open, close };
}

function bindCommandPaletteShortcuts() {
  if (window.__AERIONCommandBound) return;
  window.__AERIONCommandBound = true;
  ensureCommandPalette();

  document.addEventListener("keydown",(event) => {
    const key = String(event.key || "").toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      window.AERIONCommand.open();
    } else if (key === "/" && !event.ctrlKey && !event.metaKey && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      window.AERIONCommand.open();
    }
  });
}


