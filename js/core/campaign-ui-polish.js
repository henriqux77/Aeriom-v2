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

      /* Uploads — controles visuais do AERIOM, sem o input HTML cru. */
      .aeriom-file-native-hidden{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      .aeriom-file-picker,
      .aeriom-file-picker-button{
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
        text-decoration:none!important;
      }
      .aeriom-file-picker:hover,
      .aeriom-file-picker-button:hover{border-color:rgba(216,182,95,.52)!important;transform:translateY(-1px)}
      .aeriom-file-picker::before,
      .aeriom-file-picker-button::before{content:"↥";font-size:15px;line-height:1}
      .aeriom-file-picker-host{display:grid!important;gap:6px!important}
      .aeriom-file-name{display:block!important;margin-top:5px!important;color:rgba(255,255,255,.38)!important;font-size:7px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #aeriom-live-media-card .aeriom-live-upload-field{display:grid;gap:6px}
      #aeriom-master-controls-root .aeriom-master-upload .aeriom-file-picker-button{margin-top:2px}

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
    const directLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const parentLabel = input.closest("label");
    const labelContainsInput = !!parentLabel;
    let nameHost = input.parentElement;

    if (labelContainsInput) {
      const host = parentLabel;
      host.classList.add("aeriom-file-picker-host");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aeriom-file-picker-button";
      button.textContent = "Escolher arquivo";
      button.addEventListener("click", event => {
        event.preventDefault();
        input.click();
      });
      host.insertBefore(button, input);
      nameHost = host;
    } else if (directLabel) {
      directLabel.classList.add("aeriom-file-picker");
      directLabel.textContent = "Escolher arquivo";
      nameHost = directLabel.parentElement || input.parentElement;
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aeriom-file-picker-button";
      button.textContent = "Escolher arquivo";
      button.addEventListener("click", event => {
        event.preventDefault();
        input.click();
      });
      input.parentElement?.insertBefore(button, input);
    }

    let name = nameHost?.querySelector(`.aeriom-file-name[data-for="${CSS.escape(id || "file")}"]`);
    if (!name) {
      name = document.createElement("span");
      name.className = "aeriom-file-name";
      name.dataset.for = id || "file";
      name.textContent = "Nenhum arquivo selecionado.";
      nameHost?.appendChild(name);
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
