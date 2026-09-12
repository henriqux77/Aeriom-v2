/* AERIOM theme entrypoint. Atmosfera and Master Dashboard are layered UI modules. */
import "./campaign-ui-repair.js?v=20260912-master-shell2";
import "./campaign-live-media.js?v=20260912-live2";
import "./mestre-controles-compact.js?v=20260912-master-redesign1";
import "./mestre-dashboard-redesign.js?v=20260912-master2";

(() => {
  "use strict";
  window.AERIOM_THEME_UI = Object.freeze({ version: "2026-09-12-master-dashboard2" });
})();
