/* AERIOM — navegação líquida inspirada no padrão visual enviado. */
(() => {
  "use strict";
  if (window.__AERIOM_LIQUID_NAV__) return;
  window.__AERIOM_LIQUID_NAV__ = true;

  const STYLE_ID="aeriom-liquid-navigation-style";
  function install(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement("style");s.id=STYLE_ID;s.textContent=`
      .campaign-sidebar{--liquid-accent:var(--campaign-gold,#d8b65f);transition:width .28s cubic-bezier(.2,.8,.2,1),transform .28s cubic-bezier(.2,.8,.2,1),background .28s ease;}
      .campaign-sidebar__nav{position:relative;isolation:isolate;}
      .campaign-nav-item{position:relative;overflow:hidden;z-index:0;border-radius:13px!important;transition:color .2s ease,transform .2s ease,background .2s ease,border-color .2s ease;}
      .campaign-nav-item::before{content:"";position:absolute;inset:3px;border-radius:10px;background:radial-gradient(circle at 25% 50%,color-mix(in srgb,var(--liquid-accent) 20%,transparent),transparent 70%);opacity:0;transform:scale(.78);transition:opacity .24s ease,transform .28s cubic-bezier(.2,.8,.2,1);z-index:-1;}
      .campaign-nav-item::after{content:"";position:absolute;left:7px;right:7px;bottom:4px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--liquid-accent),transparent);opacity:0;transform:scaleX(.35);transition:opacity .2s ease,transform .24s ease;}
      .campaign-nav-item:hover::before,.campaign-nav-item.is-active::before{opacity:1;transform:scale(1);}
      .campaign-nav-item.is-active{border-color:color-mix(in srgb,var(--liquid-accent) 32%,transparent)!important;background:linear-gradient(135deg,color-mix(in srgb,var(--liquid-accent) 11%,transparent),rgba(255,255,255,.018))!important;box-shadow:0 8px 24px color-mix(in srgb,var(--liquid-accent) 8%,transparent),inset 0 1px 0 rgba(255,255,255,.05);}
      .campaign-nav-item.is-active::after{opacity:.85;transform:scaleX(1);}
      .campaign-nav-item__icon{transition:transform .22s cubic-bezier(.2,.8,.2,1),filter .22s ease;color:inherit;}
      .campaign-nav-item:hover .campaign-nav-item__icon,.campaign-nav-item.is-active .campaign-nav-item__icon{transform:scale(1.12);filter:drop-shadow(0 0 7px color-mix(in srgb,var(--liquid-accent) 38%,transparent));}
      html[data-atmosphere-density="compact"] .campaign-nav-item{min-height:37px;padding-top:0;padding-bottom:0;}
      html[data-atmosphere-density="comfortable"] .campaign-nav-item{min-height:43px;}
      html[data-atmosphere-density="spacious"] .campaign-nav-item{min-height:51px;margin-bottom:4px;}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar{width:86px!important;}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar__campaign-info,html[data-atmosphere-sidebar="minimal"] .campaign-sidebar__section-label,html[data-atmosphere-sidebar="minimal"] .campaign-nav-item span:not(.campaign-nav-item__icon),html[data-atmosphere-sidebar="minimal"] .campaign-sidebar-action span:not(.campaign-nav-item__icon){display:none!important;}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar__campaign{justify-content:center;padding:9px;margin-inline:9px;}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar__nav{padding:0 9px;}
      html[data-atmosphere-sidebar="minimal"] .campaign-nav-item{justify-content:center;padding-inline:0;gap:0;}
      html[data-atmosphere-sidebar="minimal"] .campaign-nav-item__icon{width:auto;flex-basis:auto;font-size:18px;}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar__footer{padding-inline:9px;}
      html[data-atmosphere-sidebar="minimal"] .campaign-sidebar-action{justify-content:center;padding-inline:0;}
      html[data-atmosphere-sidebar="minimal"] .campaign-main{margin-left:86px!important;width:calc(100% - 86px)!important;}
      @media(max-width:760px){
        .campaign-sidebar{inset:auto 12px 12px 12px!important;width:auto!important;height:68px!important;max-height:68px;border:1px solid color-mix(in srgb,var(--campaign-gold) 20%,transparent)!important;border-radius:22px!important;display:flex!important;flex-direction:row!important;overflow:hidden!important;background:color-mix(in srgb,var(--campaign-surface) 92%,black)!important;backdrop-filter:blur(22px) saturate(1.12);box-shadow:0 20px 60px rgba(0,0,0,.38)!important;}
        .campaign-sidebar__brand,.campaign-sidebar__campaign,.campaign-sidebar__section-label,.campaign-sidebar__separator,.campaign-sidebar__footer{display:none!important;}
        .campaign-sidebar__nav{width:100%;height:100%;display:flex;flex-direction:row;align-items:center;justify-content:space-evenly;gap:5px;padding:6px!important;}
        .campaign-nav-item{flex:1;min-width:0!important;height:56px!important;min-height:56px!important;justify-content:center!important;padding:0!important;gap:0!important;border-radius:18px!important;}
        .campaign-nav-item__icon{width:auto!important;flex-basis:auto!important;font-size:19px!important;}
        .campaign-nav-item > span:not(.campaign-nav-item__icon){display:none!important;}
        .campaign-nav-item.is-active{box-shadow:0 8px 24px color-mix(in srgb,var(--liquid-accent) 14%,transparent),inset 0 1px 0 rgba(255,255,255,.07)!important;}
        .campaign-nav-item.is-active::after{left:25%;right:25%;bottom:4px;height:2px;}
        .campaign-main{width:100%!important;margin-left:0!important;padding-bottom:88px!important;}
      }
    `;document.head.appendChild(s);
  }
  function sync(){
    const root=document.documentElement;
    const active=document.querySelector(".campaign-nav-item.is-active,[data-campaign-tab].is-active");
    document.querySelectorAll(".campaign-nav-item").forEach(item=>item.setAttribute("aria-current",item===active?"page":"false"));
    if(active){root.style.setProperty("--aeriom-liquid-x",`${active.offsetLeft + active.offsetWidth/2}px`);}
  }
  function bind(){
    document.addEventListener("click",e=>{if(e.target.closest(".campaign-nav-item,[data-campaign-tab]"))setTimeout(sync,30);});
    window.addEventListener("aeriom:campaigntabchange",()=>setTimeout(sync,10));
    window.addEventListener("resize",sync,{passive:true});
    setTimeout(sync,600);
  }
  install();bind();
})();
