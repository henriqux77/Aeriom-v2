/* AERIOM — entrada visual segura do Controle do Mestre.
 * Módulos pesados de atmosfera/dashboard ficam desacoplados do boot da campanha
 * para preservar responsividade. A navegação básica permanece ativa pelo reparo leve.
 */
import "./campaign-interaction-repair.js?v=20260912-interaction1";

(() => {
  "use strict";
  window.AERIOM_THEME_UI = Object.freeze({ version: "2026-09-12-safe-lite1" });
})();
