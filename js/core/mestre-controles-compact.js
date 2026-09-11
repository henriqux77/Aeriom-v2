(() => {
  "use strict";

  function inject() {
    if (document.getElementById("aeriom-master-compact-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-master-compact-style";
    style.textContent = `
      #campaign-panel-master-controls .aeriom-master-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
      #campaign-panel-master-controls .aeriom-master-card{padding:11px 12px;border-radius:13px;box-shadow:none}
      #campaign-panel-master-controls .aeriom-master-card__head{gap:10px;margin-bottom:8px;align-items:center}
      #campaign-panel-master-controls .aeriom-master-card__head p{display:none}
      #campaign-panel-master-controls .aeriom-master-card h3{margin:0;font-size:15px}
      #campaign-panel-master-controls .aeriom-master-form{gap:7px}
      #campaign-panel-master-controls .aeriom-master-row{gap:7px}
      #campaign-panel-master-controls .aeriom-master-field>span{font-size:6px}
      #campaign-panel-master-controls .aeriom-master-field input,#campaign-panel-master-controls .aeriom-master-field textarea,#campaign-panel-master-controls .aeriom-master-field select{min-height:35px;padding:7px 8px;border-radius:9px;font-size:10px}
      #campaign-panel-master-controls .aeriom-master-field textarea{min-height:62px}
      #campaign-panel-master-controls .aeriom-master-button{min-height:33px;padding:0 9px;border-radius:9px;font-size:7px}
      #campaign-panel-master-controls .aeriom-master-upload{padding:8px;border-radius:10px}
      #campaign-panel-master-controls .aeriom-master-upload-preview{min-height:68px}
      #campaign-panel-master-controls .aeriom-quick-actions{gap:5px;margin-top:6px}
      #campaign-panel-master-controls .aeriom-quick-actions .aeriom-master-button{min-height:31px}
      #campaign-panel-master-controls .aeriom-mana-campaign-grid{gap:6px}
      #campaign-panel-master-controls .aeriom-mana-campaign-item{min-height:44px;padding:7px;border-radius:9px}
      #campaign-panel-master-controls .aeriom-master-list{gap:6px}
      #campaign-panel-master-controls .aeriom-master-modal .aeriom-modal-card{max-width:760px}
      @media(max-width:700px){
        #campaign-panel-master-controls .aeriom-master-grid{gap:8px}
        #campaign-panel-master-controls .aeriom-master-row{grid-template-columns:1fr!important}
        #campaign-panel-master-controls .aeriom-quick-actions{grid-template-columns:repeat(2,minmax(0,1fr))}
        #campaign-panel-master-controls .aeriom-master-actions{width:100%;display:flex;gap:5px;flex-wrap:wrap}
        #campaign-panel-master-controls .aeriom-master-actions .aeriom-master-button{flex:1 1 140px}
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject, { once:true });
  else inject();
})();
