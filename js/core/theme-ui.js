/* AERIOM — entrada visual temporariamente neutralizada para recuperação de performance.
 * Os módulos de atmosfera/dashboard são carregados de forma isolada posteriormente.
 */
(() => {
  "use strict";
  if (!window.AERIOM_THEME_UI) {
    window.AERIOM_THEME_UI = Object.freeze({ version: "2026-09-12-safe-boot2" });
  }
})();
