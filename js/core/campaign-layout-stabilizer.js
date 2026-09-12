(() => {
  "use strict";

  if (window.__AERIOM_LAYOUT_STABILIZER__) return;
  window.__AERIOM_LAYOUT_STABILIZER__ = true;

  const STYLE_ID = "aeriom-layout-stabilizer-style";

  function install() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* ---------------------------------------------------------
         AERIOM — layout stabilizer
         Este módulo é o último dono do layout dos dois painéis.
         Não observa o body e não cria ciclos de reparo.
         --------------------------------------------------------- */

      /* MASTER — ocupa toda a largura disponível */
      #campaign-panel-master-controls,
      #aeriom-master-controls-root,
      #campaign-panel-master-controls .aeriom-master-redesign-shell,
      #campaign-panel-master-controls .aeriom-master-grid {
        width:100% !important;
        max-width:none !important;
        min-width:0 !important;
        box-sizing:border-box !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid {
        display:grid !important;
        grid-template-columns:minmax(0,1.18fr) minmax(320px,.82fr) !important;
        gap:14px !important;
        align-items:start !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card {
        min-width:0 !important;
        max-width:none !important;
        box-sizing:border-box !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-config {
        grid-column:1 !important;
        grid-row:1 / span 2 !important;
        display:block !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-quick {
        grid-column:2 !important;
        grid-row:1 !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-sheet,
      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-mana,
      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-live {
        grid-column:1 / -1 !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-sheet { grid-row:3 !important; }
      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-mana { grid-row:4 !important; }
      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-live { grid-row:5 !important; }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-sessions {
        grid-column:1 !important;
        grid-row:6 !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-tools {
        grid-column:2 !important;
        grid-row:6 !important;
      }

      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-live-media-card {
        grid-column:1 / -1 !important;
        width:100% !important;
        box-sizing:border-box !important;
      }

      #campaign-panel-master-controls .aeriom-master-form {
        width:100% !important;
        min-width:0 !important;
      }

      #campaign-panel-master-controls .aeriom-master-row {
        min-width:0 !important;
      }

      /* A configuração interna não fica espremida por uma coluna fixa. */
      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-config > .aeriom-master-card__head {
        grid-column:auto !important;
      }

      /* THEME / MESA — painel inteiro, sem faixa estreita lateral */
      #campaign-panel-theme,
      #campaign-panel-theme > *,
      #campaign-panel-theme #campaign-theme-selector,
      #campaign-theme-selector,
      #campaign-theme-selector > .aeriom-atmosphere {
        width:100% !important;
        max-width:none !important;
        min-width:0 !important;
        box-sizing:border-box !important;
        align-self:stretch !important;
      }

      #campaign-panel-theme #campaign-theme-selector {
        display:block !important;
      }

      #campaign-theme-selector > .aeriom-atmosphere {
        display:grid !important;
        grid-template-columns:minmax(0,1fr) !important;
        gap:16px !important;
      }

      #campaign-theme-selector .aeriom-atmosphere__hero,
      #campaign-theme-selector .aeriom-atmosphere__section,
      #campaign-theme-selector .aeriom-atmosphere__save {
        width:100% !important;
        min-width:0 !important;
        box-sizing:border-box !important;
      }

      #campaign-theme-selector .aeriom-atmosphere__themes {
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      }

      #campaign-theme-selector .aeriom-atmosphere__choice-grid {
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      }

      #campaign-theme-selector .aeriom-atmosphere__grid,
      #campaign-theme-selector .aeriom-cinema-grid {
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }

      #campaign-theme-selector .aeriom-atmosphere__select-grid {
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
      }

      #campaign-theme-selector .aeriom-atmosphere__background {
        grid-template-columns:minmax(200px,260px) minmax(0,1fr) !important;
      }

      /* Nunca deixar texto/inputs criarem uma coluna implícita gigante. */
      #campaign-theme-selector .aeriom-atmosphere input,
      #campaign-theme-selector .aeriom-atmosphere select,
      #campaign-theme-selector .aeriom-atmosphere textarea,
      #campaign-panel-master-controls input,
      #campaign-panel-master-controls select,
      #campaign-panel-master-controls textarea {
        max-width:100% !important;
        min-width:0 !important;
        box-sizing:border-box !important;
      }

      /* MOBILE */
      @media (max-width:980px){
        #campaign-panel-master-controls .aeriom-master-grid{
          grid-template-columns:minmax(0,1fr) !important;
        }
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-config,
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-quick,
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-sheet,
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-mana,
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-live,
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-sessions,
        #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-tools{
          grid-column:1 !important;
          grid-row:auto !important;
        }

        #campaign-theme-selector .aeriom-atmosphere__themes,
        #campaign-theme-selector .aeriom-atmosphere__choice-grid,
        #campaign-theme-selector .aeriom-atmosphere__select-grid{
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        }

        #campaign-theme-selector .aeriom-atmosphere__grid,
        #campaign-theme-selector .aeriom-cinema-grid,
        #campaign-theme-selector .aeriom-atmosphere__background{
          grid-template-columns:minmax(0,1fr) !important;
        }
      }

      @media (max-width:620px){
        #campaign-theme-selector .aeriom-atmosphere__themes,
        #campaign-theme-selector .aeriom-atmosphere__choice-grid,
        #campaign-theme-selector .aeriom-atmosphere__select-grid{
          grid-template-columns:minmax(0,1fr) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  const start = () => {
    if (document.head) install();
    else requestAnimationFrame(install);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once:true });
  } else {
    start();
  }
})();
