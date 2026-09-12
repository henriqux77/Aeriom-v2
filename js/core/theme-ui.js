/*
 * AERIOM — compatibilidade do sistema de temas.
 *
 * O renderizador da aba Atmosfera é o único responsável por desenhar
 * #campaign-theme-selector. Este módulo permanece carregado pela campanha
 * para manter compatibilidade com páginas antigas, mas não re-renderiza a
 * interface e não disputa o mesmo DOM com atmosphere-ui.js.
 */

(() => {
  "use strict";

  // API mínima de compatibilidade para módulos antigos.
  window.AERIOM_THEME_UI = Object.freeze({
    version: "2026-09-11-atmosphere-owner"
  });
})();
