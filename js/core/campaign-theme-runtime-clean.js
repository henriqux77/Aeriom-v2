(() => {
  "use strict";
  const styleId="aeriom-theme-runtime-clean-style";
  function install(){if(document.getElementById(styleId))return;const s=document.createElement("style");s.id=styleId;s.textContent=`
    .aeriom-page--campaign,.aeriom-page--campaign body{background:var(--campaign-bg)!important;color:var(--campaign-text)!important}
    .aeriom-page--campaign .campaign-app{background-color:var(--campaign-bg)!important;background-image:linear-gradient(180deg,rgba(0,0,0,.20),rgba(0,0,0,.54)),var(--aeriom-theme-image)!important;background-size:cover;background-position:center;background-attachment:fixed}
    .aeriom-page--campaign .campaign-main{background:transparent!important;color:var(--campaign-text)!important}
    .aeriom-page--campaign .campaign-sidebar{background:linear-gradient(180deg,var(--campaign-surface),var(--campaign-bg))!important;border-color:var(--campaign-border)!important}
    .aeriom-page--campaign .campaign-topbar{background:color-mix(in srgb,var(--campaign-bg) 88%,transparent)!important;border-color:var(--campaign-border)!important;color:var(--campaign-text)!important}
    .aeriom-page--campaign .campaign-panel,.aeriom-page--campaign .campaign-card,.aeriom-page--campaign .campaign-section{background:color-mix(in srgb,var(--campaign-surface) calc(var(--campaign-panel-opacity, .88)*100%),transparent)!important;border-color:var(--campaign-border)!important;color:var(--campaign-text)!important;box-shadow:0 18px 44px rgba(0,0,0,.18)!important;backdrop-filter:blur(var(--campaign-atmosphere-blur,0px)) saturate(115%)}
    .aeriom-page--campaign .campaign-panel h1,.aeriom-page--campaign .campaign-panel h2,.aeriom-page--campaign .campaign-panel h3,.aeriom-page--campaign .campaign-card h1,.aeriom-page--campaign .campaign-card h2,.aeriom-page--campaign .campaign-card h3{color:var(--campaign-text)!important}
    .aeriom-page--campaign .campaign-panel p,.aeriom-page--campaign .campaign-card p,.aeriom-page--campaign .campaign-sidebar small{color:var(--campaign-muted)!important}
    .aeriom-page--campaign .campaign-nav-item,.aeriom-page--campaign .campaign-mobile-nav-item{color:var(--campaign-muted)!important}
    .aeriom-page--campaign .campaign-nav-item.is-active,.aeriom-page--campaign .campaign-mobile-nav-item.is-active{color:var(--campaign-accent-secondary)!important;background:color-mix(in srgb,var(--campaign-gold) 13%,transparent)!important;border-color:var(--campaign-border)!important}
    .aeriom-page--campaign .campaign-button,.aeriom-page--campaign button{border-color:var(--campaign-border);color:var(--campaign-text)}
    .aeriom-page--campaign .campaign-button--primary{background:color-mix(in srgb,var(--campaign-gold) 15%,var(--campaign-surface2,var(--campaign-surface)))!important;color:var(--campaign-accent-secondary)!important;border-color:var(--campaign-gold)!important}
    .aeriom-page--campaign input,.aeriom-page--campaign textarea,.aeriom-page--campaign select{background:var(--campaign-surface2)!important;color:var(--campaign-text)!important;border-color:var(--campaign-border)!important}
    .aeriom-page--campaign .campaign-mobile-nav{background:color-mix(in srgb,var(--campaign-bg) 90%,transparent)!important;border-color:var(--campaign-border)!important}
    .aeriom-page--campaign [data-theme-icon],.aeriom-page--campaign .campaign-panel__icon,.aeriom-page--campaign .campaign-section__icon{color:var(--campaign-accent-secondary)!important}
  `;document.head.appendChild(s);}
  install();
  window.addEventListener("aeriom:atmospherechange",install);window.addEventListener("aeriom:campaigntheme",install);
})();
