(() => {
  "use strict";
  if (window.__AERIOM_CAMPAIGN_UI_POLISH__) return;
  window.__AERIOM_CAMPAIGN_UI_POLISH__ = true;

  const STYLE_ID = "aeriom-campaign-ui-polish-style";
  const FILE_SELECTOR = [
    "#campaign-background-file",
    "#aeriom-live-file",
    "#aeriom-master-controls-root input[type=file]"
  ].join(",");

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* O banner mostra identidade visual, não a descrição da campanha. */
      #campaign-overview-description{display:none!important}
      #campaign-panel-master-controls .aeriom-master-redesign-hero__content > p{display:none!important}

      /* Uploads — esconder o controle nativo e usar o botão visual do AERIOM. */
      .aeriom-file-native-hidden{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      .aeriom-file-picker{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:8px!important;
        min-height:42px!important;
        width:100%!important;
        box-sizing:border-box!important;
        padding:0 13px!important;
        border:1px dashed rgba(216,182,95,.28)!important;
        border-radius:11px!important;
        background:linear-gradient(180deg,rgba(216,182,95,.10),rgba(216,182,95,.035))!important;
        color:#ead18b!important;
        font-size:8px!important;
        font-weight:900!important;
        letter-spacing:.06em!important;
        cursor:pointer!important;
        transition:.18s ease!important;
      }
      .aeriom-file-picker:hover{border-color:rgba(216,182,95,.52)!important;transform:translateY(-1px)}
      .aeriom-file-picker::before{content:"↥";font-size:15px;line-height:1}
      .aeriom-file-name{display:block!important;margin-top:5px!important;color:rgba(255,255,255,.38)!important;font-size:7px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}

      #campaign-background-file.aeriom-file-native-hidden + *{margin-top:0}
      #aeriom-live-media-card .aeriom-live-upload-field > label.aeriom-file-picker{justify-content:center}
      #aeriom-live-media-card .aeriom-live-upload-field{display:grid;gap:6px}

      /* Banner/capa do Controle do Mestre */
      #aeriom-master-controls-root .aeriom-master-upload .aeriom-file-picker{margin-top:2px}

      /* A Mana deixa de ocupar um card próprio: ela vive no gerenciamento da ficha. */
      #campaign-panel-master-controls .aeriom-master-grid > .aeriom-master-card.is-mana{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function decorate(input) {
    if (!input || input.dataset.aeriomFileUi === "1") return;
    input.dataset.aeriomFileUi = "1";
    input.classList.add("aeriom-file-native-hidden");

    const id = input.id;
    let label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    if (!label && input.closest("label")) label = input.closest("label");

    if (label) {
      label.classList.add("aeriom-file-picker");
      label.textContent = "Escolher arquivo";
    } else {
      label = document.createElement("label");
      label.className = "aeriom-file-picker";
      label.htmlFor = id;
      label.textContent = "Escolher arquivo";
      input.parentElement?.insertBefore(label, input);
    }

    let name = input.parentElement?.querySelector(`.aeriom-file-name[data-for="${CSS.escape(id || "")}"]`);
    if (!name) {
      name = document.createElement("span");
      name.className = "aeriom-file-name";
      name.dataset.for = id || "file";
      name.textContent = "Nenhum arquivo selecionado.";
      label.insertAdjacentElement("afterend", name);
    }
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      name.textContent = file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Nenhum arquivo selecionado.";
    });
  }

  function scan() {
    installStyle();
    document.querySelectorAll(FILE_SELECTOR).forEach(decorate);
  }

  const schedule = () => window.setTimeout(scan, 120);
  window.addEventListener("aeriom:campaign:ready", schedule);
  window.addEventListener("aeriom:campaigntabchange", schedule);
  window.addEventListener("aeriom:master:refresh", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan, { once:true });
  else scan();
})();
