(() => {
  "use strict";
  const STYLE_ID = "aeriom-master-redesign-patch";
  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #campaign-panel-master-controls > .campaign-panel__heading,
      #campaign-panel-master-controls #aeriom-master-controls-root > .campaign-panel__heading {
        display:none!important;
      }
      #campaign-panel-master-controls .aeriom-master-redesign-shell,
      #campaign-panel-master-controls .aeriom-master-redesign-stats {
        width:100%;
        box-sizing:border-box;
      }
      #campaign-panel-master-controls .aeriom-master-redesign-guide {
        position:relative;
        z-index:2;
      }
      #campaign-panel-master-controls .aeriom-master-redesign-hero {
        background-color:#0a0c0f;
      }
    `;
    document.head.appendChild(style);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject, { once:true });
  else inject();
})();
