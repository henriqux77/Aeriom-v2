/* AERIOM — entrypoint visual do Controle do Mestre
 * MODO DE RECUPERAÇÃO: manter somente o shell estável enquanto
 * os módulos pesados do dashboard são reestruturados.
 */
import "./campaign-ui-repair.js?v=20260912-master-shell5";

(() => {
  "use strict";
  window.AERIOM_THEME_UI = Object.freeze({ version: "2026-09-12-safe-boot1" });
})();
