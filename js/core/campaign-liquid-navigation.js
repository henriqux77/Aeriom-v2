/* AERIOM — navegação líquida da campanha. */
(() => {
  "use strict";
  if (window.__AERIOM_LIQUID_NAV__) return;
  window.__AERIOM_LIQUID_NAV__ = true;

  const STYLE_ID = "aeriom-liquid-navigation-style";
  const MOBILE_ITEMS = [
    ["overview", "⌂", "Início"],
    ["maps", "⌖", "Mapa"],
    ["knowledge", "✦", "Conhec."],
    ["combat", "⚔", "Combate"],
    ["mural", "▤", "Mural"]
  ];

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .campaign-nav-item{position:relative;overflow:visible;transition:color .24s ease,transform .32s cubic-bezier(.2,.8,.2,1),background .24s ease,border-color .24s ease}
      .campaign-nav-item::before{content:"";position:absolute;inset:3px;border-radius:11px;background:radial-gradient(circle at 30% 50%,color-mix(in srgb,var(--campaign-gold,#d8b65f) 17%,transparent),transparent 72%);opacity:0;transform:scale(.72);transition:.28s cubic-bezier(.2,.8,.2,1);z-index:-1}
      .campaign-nav-item.is-active::before{opacity:1;transform:scale(1)}
      .campaign-nav-item__icon{transition:transform .28s cubic-bezier(.2,.8,.2,1),filter .25s ease}
      .campaign-nav-item.is-active .campaign-nav-item__icon{transform:translateY(-1px) scale(1.1);filter:drop-shadow(0 0 8px color-mix(in srgb,var(--campaign-gold,#d8b65f) 45%,transparent))}

      .aeriom-liquid-mobile-dock{display:none}
      @media(max-width:760px){
        /* O dock líquido é a única navegação inferior da mesa. */
        #aeriom-mobile-bottom-nav,
        .aeriom-mobile-bottom-nav,
        .campaign-mobile-actions{display:none!important}

        /* Sidebar fecha em estado compacto, mas volta a ser um drawer real ao abrir. */
        .campaign-sidebar{background:transparent!important;border:0!important;box-shadow:none!important;position:fixed!important;inset:auto!important;width:0!important;height:0!important;overflow:visible!important;pointer-events:none!important;z-index:1200!important}
        .campaign-sidebar:not(.is-open) .campaign-sidebar__brand,
        .campaign-sidebar:not(.is-open) .campaign-sidebar__campaign,
        .campaign-sidebar:not(.is-open) .campaign-sidebar__nav,
        .campaign-sidebar:not(.is-open) .campaign-sidebar__section-label,
        .campaign-sidebar:not(.is-open) .campaign-sidebar__separator,
        .campaign-sidebar:not(.is-open) .campaign-sidebar__footer{display:none!important}

        .campaign-sidebar.is-open{
          inset:0 auto 0 0!important;
          width:min(324px,86vw)!important;
          height:100dvh!important;
          max-height:100dvh!important;
          overflow:auto!important;
          overflow-x:hidden!important;
          pointer-events:auto!important;
          display:flex!important;
          flex-direction:column!important;
          background:linear-gradient(180deg,#100e0b 0%,#0b0908 100%)!important;
          border-right:1px solid rgba(216,182,95,.16)!important;
          box-shadow:24px 0 70px rgba(0,0,0,.42)!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
        }
        .campaign-sidebar.is-open .campaign-sidebar__brand{display:flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;padding:24px 18px 18px!important}
        .campaign-sidebar.is-open .campaign-sidebar__campaign,
        .campaign-sidebar.is-open .campaign-sidebar__nav,
        .campaign-sidebar.is-open .campaign-sidebar__section-label,
        .campaign-sidebar.is-open .campaign-sidebar__separator,
        .campaign-sidebar.is-open .campaign-sidebar__footer{display:flex!important;visibility:visible!important;opacity:1!important}
        .campaign-sidebar.is-open .campaign-sidebar__nav{flex-direction:column!important;gap:6px!important;padding:12px 14px 18px!important;width:auto!important;height:auto!important}
        .campaign-sidebar.is-open .campaign-sidebar__footer{margin-top:auto!important;padding:18px 14px 28px!important}
        .campaign-sidebar.is-open .campaign-nav-item{width:100%!important;min-height:48px!important}

        .campaign-mobile-menu-backdrop{z-index:1150!important;background:rgba(0,0,0,.56)!important;backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important}
        .campaign-mobile-topbar{z-index:1250!important}
        .campaign-mobile-actions{z-index:1260!important}

        .aeriom-liquid-mobile-dock{position:fixed;left:12px;right:12px;bottom:12px;height:70px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;align-items:end;padding:6px;border:1px solid color-mix(in srgb,var(--campaign-gold,#d8b65f) 17%,transparent);border-radius:24px;background:color-mix(in srgb,var(--campaign-surface,#15120f) 91%,#000);backdrop-filter:blur(22px) saturate(1.14);box-shadow:0 20px 65px rgba(0,0,0,.42);pointer-events:auto;box-sizing:border-box}
        .aeriom-liquid-mobile-dock__item{position:relative;min-width:0;height:58px;border:0;border-radius:18px;background:transparent;color:var(--campaign-muted,#a69d8e);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;cursor:pointer;overflow:visible;padding:0 2px 6px;transition:color .24s ease,transform .36s cubic-bezier(.2,.8,.2,1)}
        .aeriom-liquid-mobile-dock__item::before{content:"";position:absolute;left:50%;top:-19px;width:56px;height:56px;border-radius:50%;transform:translate(-50%,16px) scale(.72);opacity:0;background:linear-gradient(145deg,color-mix(in srgb,var(--campaign-surface-3,#262018) 94%,#000),color-mix(in srgb,var(--campaign-surface,#15120f) 86%,#000));border:1px solid color-mix(in srgb,var(--campaign-gold,#d8b65f) 27%,transparent);box-shadow:0 8px 26px rgba(0,0,0,.34),0 0 0 5px color-mix(in srgb,var(--campaign-gold,#d8b65f) 4%,transparent);transition:opacity .3s ease,transform .42s cubic-bezier(.18,1.2,.32,1)}
        .aeriom-liquid-mobile-dock__item::after{content:"";position:absolute;left:25%;right:25%;bottom:2px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--campaign-gold,#d8b65f),transparent);opacity:0;transform:scaleX(.25);transition:.25s ease}
        .aeriom-liquid-mobile-dock__item.is-active{color:var(--campaign-gold,#d8b65f);transform:translateY(-2px)}
        .aeriom-liquid-mobile-dock__item.is-active::before{opacity:1;transform:translate(-50%,0) scale(1)}
        .aeriom-liquid-mobile-dock__item.is-active::after{opacity:.9;transform:scaleX(1)}
        .aeriom-liquid-mobile-dock__icon{position:relative;z-index:1;width:30px;height:30px;display:grid;place-items:center;font-size:20px;line-height:1;transition:transform .36s cubic-bezier(.18,1.2,.32,1),filter .25s ease}
        .aeriom-liquid-mobile-dock__item.is-active .aeriom-liquid-mobile-dock__icon{transform:translateY(-13px) scale(1.08);filter:drop-shadow(0 0 9px color-mix(in srgb,var(--campaign-gold,#d8b65f) 38%,transparent))}
        .aeriom-liquid-mobile-dock__label{position:relative;z-index:1;font-size:8px;font-weight:800;letter-spacing:.01em;line-height:1;opacity:.72;transition:opacity .25s ease,transform .3s ease}
        .aeriom-liquid-mobile-dock__item.is-active .aeriom-liquid-mobile-dock__label{opacity:1;transform:translateY(-1px)}
        .campaign-main{width:100%!important;margin-left:0!important;padding-bottom:98px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function campaignTarget(tab) {
    return [...document.querySelectorAll("[data-campaign-tab]")].find(el => el.dataset.campaignTab === tab) || null;
  }

  function activeTab() {
    return document.documentElement.dataset.campaignTab || document.querySelector("[data-campaign-tab].is-active")?.dataset.campaignTab || "overview";
  }

  function setActive(tab) {
    const dock = document.getElementById("aeriom-liquid-mobile-dock");
    dock?.querySelectorAll("[data-liquid-tab]").forEach(item => item.classList.toggle("is-active", item.dataset.liquidTab === tab));
  }

  function buildMobileDock() {
    if (document.getElementById("aeriom-liquid-mobile-dock")) return;
    if (!document.querySelector(".campaign-sidebar")) return;
    const dock = document.createElement("nav");
    dock.id = "aeriom-liquid-mobile-dock";
    dock.className = "aeriom-liquid-mobile-dock";
    dock.setAttribute("aria-label", "Navegação rápida da campanha");
    MOBILE_ITEMS.forEach(([tab, icon, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aeriom-liquid-mobile-dock__item";
      button.dataset.liquidTab = tab;
      button.innerHTML = `<span class="aeriom-liquid-mobile-dock__icon" aria-hidden="true">${icon}</span><span class="aeriom-liquid-mobile-dock__label">${label}</span>`;
      button.addEventListener("click", () => {
        const target = campaignTarget(tab);
        if (!target) return;
        target.click();
        window.setTimeout(() => setActive(tab), 30);
      });
      dock.appendChild(button);
    });
    document.body.appendChild(dock);
    setActive(activeTab());
  }

  function syncDesktop() {
    const tab = activeTab();
    document.querySelectorAll(".campaign-nav-item").forEach(item => item.setAttribute("aria-current", item.dataset.campaignTab === tab ? "page" : "false"));
    setActive(tab);
  }

  function bind() {
    document.addEventListener("click", event => {
      if (event.target.closest("[data-campaign-tab]")) window.setTimeout(syncDesktop, 25);
    });
    window.addEventListener("aeriom:campaigntabchange", event => syncDesktop(event.detail?.tab || activeTab()));
    window.addEventListener("resize", buildMobileDock, { passive:true });
  }

  installStyle();
  buildMobileDock();
  bind();
  window.setTimeout(buildMobileDock, 500);
  window.setTimeout(syncDesktop, 700);
})();