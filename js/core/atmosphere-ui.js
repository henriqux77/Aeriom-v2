import { getAvailableThemes, getTheme, applyCampaignTheme } from "./theme.js";

(() => {
  "use strict";

  const THEME_IMAGES = Object.freeze({
    default: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1800&q=84",
    forest: "https://backiee.com/static/wallpapers/1000x563/392020.jpg",
    cave: new URL("../../assets/themes/cave/background.webp", import.meta.url).href,
    volcano: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=84",
    castle: "https://static.wixstatic.com/media/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg/v1/fill/w_1600,h_900,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/456894_17c7209811c34dd2bed5d73c9c443709~mv2.jpg",
    coast: "https://wallpapercrafter.com/desktop/98690-fantasy-art-sea-ship-storm-lightning-video-games-cyan.jpg",
    ruins: "https://uploads.worldanvil.com/uploads/images/3ea699821c678eb3956df7a9cea2985b.jpg"
  });

  const MOODS = [
    ["adventure", "Aventura", "Exploração e descoberta"],
    ["mystery", "Mistério", "Segredos e investigação"],
    ["danger", "Perigo", "Tensão e ameaça"],
    ["calm", "Calmaria", "Descanso e viagem"],
    ["celebration", "Celebração", "Vitória e festividade"],
    ["horror", "Horror", "Sombras e inquietação"]
  ];

  const TIMES = [["dawn","Aurora"],["day","Dia"],["dusk","Crepúsculo"],["night","Noite"],["void","Abismo"]];
  const LIGHTS = [["warm","Quente"],["balanced","Equilibrada"],["cold","Fria"],["dramatic","Dramática"],["dim","Baixa"]];
  const DENSITIES = [["compact","Compacta"],["comfortable","Confortável"],["spacious","Espaçosa"]];
  const SIDEBARS = [["full","Completa"],["minimal","Minimalista"]];
  const SCENES = [["standard","Padrão"],["immersive","Imersiva"],["cinematic","Cinematográfica"]];

  const state = {
    supabase: null,
    campaignId: null,
    settings: null,
    campaign: null,
    channel: null,
    started: false,
    saving: false,
    saveTimer: null,
    hydrated: false
  };

  const $ = id => document.getElementById(id);
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const isMaster = () => String(ctx()?.membership?.role || "").toLowerCase() === "master";
  const campaignId = () => new URLSearchParams(location.search).get("campaign") || ctx()?.campaignId || ctx()?.campaign?.id || null;

  function injectStyle() {
    if ($("aeriom-atmosphere-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-atmosphere-style";
    style.textContent = `
      .aeriom-atmosphere{display:grid;gap:16px}
      .aeriom-atmosphere__hero{position:relative;overflow:hidden;min-height:190px;border:1px solid var(--campaign-border,rgba(255,255,255,.09));border-radius:20px;background:linear-gradient(135deg,rgba(15,14,12,.88),rgba(15,14,12,.42)),var(--aeriom-atmosphere-preview,none) center/cover;box-shadow:0 20px 55px rgba(0,0,0,.18)}
      .aeriom-atmosphere__hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 30%,rgba(255,255,255,.08),transparent 28%),linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5));pointer-events:none}
      .aeriom-atmosphere__hero-content{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:24px;height:100%;box-sizing:border-box}
      .aeriom-atmosphere__eyebrow{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:800}
      .aeriom-atmosphere__hero h2{margin:6px 0 5px;font:700 clamp(24px,4vw,38px)/1.05 Cinzel,Georgia,serif;color:#f4ecda}
      .aeriom-atmosphere__hero p{margin:0;max-width:620px;color:rgba(255,255,255,.62);font-size:11px;line-height:1.6}
      .aeriom-atmosphere__status{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid rgba(216,182,95,.18);border-radius:999px;padding:8px 11px;background:rgba(7,7,6,.45);color:#dfc989;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;backdrop-filter:blur(8px)}
      .aeriom-atmosphere__dot{width:7px;height:7px;border-radius:50%;background:#77b47a;box-shadow:0 0 14px rgba(119,180,122,.45)}
      .aeriom-atmosphere__section{border:1px solid var(--campaign-border,rgba(255,255,255,.08));border-radius:16px;background:rgba(255,255,255,.018);padding:15px}
      .aeriom-atmosphere__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}
      .aeriom-atmosphere__head h3{margin:0;color:rgba(255,255,255,.88);font:600 15px/1.2 Cinzel,Georgia,serif}
      .aeriom-atmosphere__head p{margin:5px 0 0;color:rgba(255,255,255,.42);font-size:9px;line-height:1.5}
      .aeriom-atmosphere__badge{border:1px solid rgba(216,182,95,.18);border-radius:999px;padding:5px 8px;color:#c9b16e;font-size:8px;font-weight:800;letter-spacing:.06em}
      .aeriom-atmosphere__themes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      .aeriom-atmosphere__theme{border:1px solid rgba(255,255,255,.07);border-radius:13px;overflow:hidden;padding:0;background:rgba(255,255,255,.02);color:inherit;text-align:left;cursor:pointer;transition:.18s ease;min-width:0}
      .aeriom-atmosphere__theme:hover{transform:translateY(-2px);border-color:rgba(216,182,95,.28)}
      .aeriom-atmosphere__theme.is-active{border-color:rgba(216,182,95,.7);box-shadow:0 0 0 1px rgba(216,182,95,.16),0 12px 30px rgba(0,0,0,.16)}
      .aeriom-atmosphere__theme[disabled]{cursor:default;opacity:.75}
      .aeriom-atmosphere__theme-preview{aspect-ratio:16/9;background-position:center;background-size:cover;position:relative}
      .aeriom-atmosphere__theme-preview:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.5))}
      .aeriom-atmosphere__theme-copy{padding:9px 10px 10px;display:grid;gap:3px}
      .aeriom-atmosphere__theme-copy strong{font-size:10px;color:rgba(255,255,255,.82)}
      .aeriom-atmosphere__theme-copy span{font-size:8px;color:rgba(255,255,255,.38);line-height:1.4}
      .aeriom-atmosphere__choice-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
      .aeriom-atmosphere__choice{display:grid;gap:3px;min-width:0;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.018);padding:9px;cursor:pointer;text-align:left;color:rgba(255,255,255,.72)}
      .aeriom-atmosphere__choice strong{font-size:9px}.aeriom-atmosphere__choice span{font-size:7px;color:rgba(255,255,255,.34);line-height:1.35}.aeriom-atmosphere__choice.is-active{border-color:rgba(216,182,95,.48);background:rgba(216,182,95,.08);color:#e6d49f}
      .aeriom-atmosphere__range-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px}
      .aeriom-atmosphere__control{display:grid;gap:7px}.aeriom-atmosphere__control-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.aeriom-atmosphere__control-head label{font-size:9px;color:rgba(255,255,255,.56);font-weight:700}.aeriom-atmosphere__value{font-size:9px;color:#d1b76b;font-weight:800}
      .aeriom-atmosphere input[type=range]{width:100%;accent-color:var(--campaign-gold,#c49e53)}
      .aeriom-atmosphere__select-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .aeriom-atmosphere__select{display:grid;gap:6px}.aeriom-atmosphere__select label{font-size:8px;color:rgba(255,255,255,.4);font-weight:800;text-transform:uppercase;letter-spacing:.08em}.aeriom-atmosphere__select select,.aeriom-atmosphere__input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:#14120f;color:rgba(255,255,255,.78);padding:9px 10px;font-size:9px;outline:none}.aeriom-atmosphere__select select:focus,.aeriom-atmosphere__input:focus{border-color:rgba(216,182,95,.45)}
      .aeriom-atmosphere__toggles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.aeriom-atmosphere__toggle{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:9px;background:rgba(255,255,255,.015);font-size:9px;color:rgba(255,255,255,.6)}.aeriom-atmosphere__toggle input{accent-color:var(--campaign-gold,#c49e53)}
      .aeriom-atmosphere__background{display:grid;grid-template-columns:180px minmax(0,1fr);gap:10px}.aeriom-atmosphere__background-preview{min-height:100px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:var(--aeriom-atmosphere-preview,none) center/cover,linear-gradient(135deg,#171411,#0b0b0a)}
      .aeriom-atmosphere__background-fields{display:grid;gap:8px}.aeriom-atmosphere__inline{display:flex;gap:8px;flex-wrap:wrap}.aeriom-atmosphere__button{border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025);color:rgba(255,255,255,.68);padding:9px 12px;font-size:9px;font-weight:800;cursor:pointer}.aeriom-atmosphere__button:hover{border-color:rgba(216,182,95,.3)}.aeriom-atmosphere__button.primary{background:rgba(216,182,95,.1);border-color:rgba(216,182,95,.3);color:#e4d091}.aeriom-atmosphere__button:disabled{opacity:.45;cursor:default}
      .aeriom-atmosphere__player{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px}.aeriom-atmosphere__player-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:rgba(216,182,95,.08);border:1px solid rgba(216,182,95,.14);color:#d8ba72;font-size:15px}.aeriom-atmosphere__player-copy{min-width:0}.aeriom-atmosphere__player-copy strong{display:block;font-size:10px;color:rgba(255,255,255,.76);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aeriom-atmosphere__player-copy span{display:block;margin-top:3px;font-size:8px;color:rgba(255,255,255,.34)}
      .aeriom-atmosphere__save{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(0,0,0,.12);position:sticky;bottom:10px;z-index:5;backdrop-filter:blur(10px)}.aeriom-atmosphere__save-copy{font-size:8px;color:rgba(255,255,255,.38)}.aeriom-atmosphere__save-copy.is-dirty{color:#ddc27d}.aeriom-atmosphere__save-actions{display:flex;gap:7px}
      .aeriom-atmosphere__locked{padding:12px;border:1px dashed rgba(255,255,255,.08);border-radius:12px;color:rgba(255,255,255,.35);font-size:9px;line-height:1.5}
      @media(max-width:900px){.aeriom-atmosphere__themes{grid-template-columns:repeat(2,minmax(0,1fr))}.aeriom-atmosphere__choice-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.aeriom-atmosphere__select-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.aeriom-atmosphere__toggles{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.aeriom-atmosphere__hero-content{align-items:flex-start;flex-direction:column;padding:18px}.aeriom-atmosphere__hero{min-height:240px}.aeriom-atmosphere__themes,.aeriom-atmosphere__choice-grid,.aeriom-atmosphere__range-grid,.aeriom-atmosphere__select-grid,.aeriom-atmosphere__toggles{grid-template-columns:1fr}.aeriom-atmosphere__background{grid-template-columns:1fr}.aeriom-atmosphere__background-preview{min-height:150px}.aeriom-atmosphere__player{grid-template-columns:auto minmax(0,1fr)}.aeriom-atmosphere__player>.aeriom-atmosphere__inline{grid-column:1/-1}.aeriom-atmosphere__save{position:static;flex-direction:column;align-items:stretch}.aeriom-atmosphere__save-actions>*{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function defaults(theme = "default") {
    const vars = getTheme(theme)?.variables || {};
    return {
      campaign_id: state.campaignId,
      preset: getTheme(theme)?.id || "default",
      mood: "adventure",
      time_of_day: "night",
      lighting: "balanced",
      intensity: 55,
      accent_color: vars["--theme-accent"] || "#c49e53",
      surface_opacity: 86,
      vignette: 42,
      grain: 0,
      glow: 18,
      blur: 0,
      ui_density: "comfortable",
      sidebar_mode: "full",
      scene_mode: "immersive",
      ambient_enabled: false,
      show_live_media: true,
      show_map_overlay: true,
      background_source: "theme",
      background_url: null
    };
  }

  function normalize(row) {
    return { ...defaults(row?.preset || state.campaign?.theme || "default"), ...(row || {}), campaign_id: state.campaignId };
  }

  function setDirty(dirty) {
    const node = $("aeriom-atmosphere-dirty");
    if (!node) return;
    node.classList.toggle("is-dirty", Boolean(dirty));
    node.textContent = dirty ? "Alterações pendentes" : "Configuração sincronizada";
  }

  function optionButtons(list, name, value, disabled) {
    return list.map(([id,label,sub]) => `<button type="button" class="aeriom-atmosphere__choice${id===value?" is-active":""}" data-atm-field="${name}" data-atm-value="${id}"${disabled?" disabled":""}><strong>${label}</strong>${sub?`<span>${sub}</span>`:""}</button>`).join("");
  }

  function themeButtons(current, disabled) {
    return getAvailableThemes().map(theme => {
      const image = THEME_IMAGES[theme.id] || THEME_IMAGES.default;
      return `<button type="button" class="aeriom-atmosphere__theme${theme.id===current?" is-active":""}" data-atm-theme="${theme.id}"${disabled?" disabled":""}><div class="aeriom-atmosphere__theme-preview" style="background-image:url(\"${String(image).replaceAll('"','\\"')}\")"></div><div class="aeriom-atmosphere__theme-copy"><strong>${theme.name}</strong><span>${theme.description}</span></div></button>`;
    }).join("");
  }

  function rangeField(field, label, min, max, suffix="%") {
    const value = Number(state.settings?.[field] ?? 0);
    return `<div class="aeriom-atmosphere__control"><div class="aeriom-atmosphere__control-head"><label>${label}</label><span class="aeriom-atmosphere__value" data-atm-value-for="${field}">${value}${suffix}</span></div><input type="range" min="${min}" max="${max}" value="${value}" step="1" data-atm-range="${field}"${isMaster()?"":" disabled"}></div>`;
  }

  function selectField(field, label, options) {
    const value = state.settings?.[field];
    return `<div class="aeriom-atmosphere__select"><label>${label}</label><select data-atm-select="${field}"${isMaster()?"":" disabled"}>${options.map(([id,text])=>`<option value="${id}"${id===value?" selected":""}>${text}</option>`).join("")}</select></div>`;
  }

  function render() {
    const root = $("campaign-theme-selector");
    if (!root || !state.settings) return;
    const s = state.settings;
    const master = isMaster();
    const theme = getTheme(s.preset) || getTheme("default");
    const preview = backgroundUrl(s) || THEME_IMAGES[s.preset] || THEME_IMAGES.default;
    root.classList.add("aeriom-atmosphere-host");
    root.innerHTML = `<div class="aeriom-atmosphere" style="--aeriom-atmosphere-preview:url(\"${String(preview).replaceAll('"','\\"')}\")">
      <section class="aeriom-atmosphere__hero"><div class="aeriom-atmosphere__hero-content"><div><div class="aeriom-atmosphere__eyebrow">Configuração de mesa • AERIOM</div><h2>Atmosfera</h2><p>Defina a identidade visual, o clima e o palco da campanha. A mesma configuração é aplicada à mesa inteira.</p></div><div class="aeriom-atmosphere__status"><span class="aeriom-atmosphere__dot"></span>${master?"Mestre • Controle ativo":"Mesa • Somente leitura"}</div></div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Identidade da mesa</h3><p>O preset define o DNA visual da campanha.</p></div><span class="aeriom-atmosphere__badge">${theme?.name || "AERIOM"}</span></div><div class="aeriom-atmosphere__themes">${themeButtons(s.preset,!master)}</div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Clima narrativo</h3><p>Escolha a sensação dominante da sessão atual.</p></div></div><div class="aeriom-atmosphere__choice-grid">${optionButtons(MOODS,"mood",s.mood,!master)}</div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Luz e momento</h3><p>Esses controles alteram a leitura visual sem trocar o tema.</p></div></div><div class="aeriom-atmosphere__select-grid">${selectField("time_of_day","Momento do dia",TIMES)}${selectField("lighting","Iluminação",LIGHTS)}${selectField("scene_mode","Palco",SCENES)}</div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Direção visual</h3><p>Microcontroles para dar profundidade e personalidade à interface.</p></div></div><div class="aeriom-atmosphere__range-grid">${rangeField("intensity","Intensidade do clima",0,100)}${rangeField("surface_opacity","Opacidade dos painéis",45,100)}${rangeField("vignette","Vinheta",0,100)}${rangeField("grain","Granulação",0,60)}${rangeField("glow","Brilho ambiente",0,60)}${rangeField("blur","Profundidade / blur",0,18,"px")}</div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Interface da mesa</h3><p>Controle a quantidade de ruído visual sem afetar as regras.</p></div></div><div class="aeriom-atmosphere__select-grid">${selectField("ui_density","Densidade",DENSITIES)}${selectField("sidebar_mode","Navegação lateral",SIDEBARS)}<div class="aeriom-atmosphere__select"><label>Cor de destaque</label><input class="aeriom-atmosphere__input" type="color" value="${escapeAttr(s.accent_color)}" data-atm-color="accent_color"${master?"":" disabled"}></div></div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Palco e fundo</h3><p>Use a arte do preset, o fundo da campanha ou uma imagem externa.</p></div></div><div class="aeriom-atmosphere__background"><div class="aeriom-atmosphere__background-preview" data-atm-preview="background"></div><div class="aeriom-atmosphere__background-fields"><div class="aeriom-atmosphere__inline"><button type="button" class="aeriom-atmosphere__button${s.background_source==='theme'?" primary":""}" data-atm-bg-source="theme"${master?"":" disabled"}>Preset</button><button type="button" class="aeriom-atmosphere__button${s.background_source==='campaign'?" primary":""}" data-atm-bg-source="campaign"${master?"":" disabled"}>Fundo da campanha</button><button type="button" class="aeriom-atmosphere__button${s.background_source==='custom'?" primary":""}" data-atm-bg-source="custom"${master?"":" disabled"}>URL personalizada</button></div><input class="aeriom-atmosphere__input" type="url" placeholder="https://.../imagem.jpg" value="${escapeAttr(s.background_url||"")}" data-atm-input="background_url"${master?"":" disabled"}><div class="aeriom-atmosphere__inline"><button type="button" class="aeriom-atmosphere__button" data-atm-reset-bg="1"${master?"":" disabled"}>Voltar ao preset</button></div></div></div></section>
      <section class="aeriom-atmosphere__section"><div class="aeriom-atmosphere__head"><div><h3>Imersão em tempo real</h3><p>Integra a transmissão de mídia e a apresentação do palco à atmosfera.</p></div></div><div class="aeriom-atmosphere__toggles"><label class="aeriom-atmosphere__toggle"><input type="checkbox" data-atm-check="ambient_enabled" ${s.ambient_enabled?"checked":""}${master?"":" disabled"}> Áudio ambiente</label><label class="aeriom-atmosphere__toggle"><input type="checkbox" data-atm-check="show_live_media" ${s.show_live_media?"checked":""}${master?"":" disabled"}> Transmissão ao vivo</label><label class="aeriom-atmosphere__toggle"><input type="checkbox" data-atm-check="show_map_overlay" ${s.show_map_overlay?"checked":""}${master?"":" disabled"}> Camada do mapa</label></div><div id="aeriom-atmosphere-live-slot" style="margin-top:10px"></div></section>
      ${master?`<div class="aeriom-atmosphere__save"><div id="aeriom-atmosphere-dirty" class="aeriom-atmosphere__save-copy">Configuração sincronizada</div><div class="aeriom-atmosphere__save-actions"><button type="button" class="aeriom-atmosphere__button" data-atm-action="reset">Restaurar padrão</button><button type="button" class="aeriom-atmosphere__button primary" data-atm-action="save">Aplicar à mesa</button></div></div>`:`<div class="aeriom-atmosphere__locked">Somente o Mestre pode alterar a Atmosfera. Esta tela acompanha automaticamente a configuração publicada para a campanha.</div>`}
    </div>`;
    const previewNode = root.querySelector("[data-atm-preview=background]");
    if (previewNode) previewNode.style.backgroundImage = `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.5)),url(\"${String(preview).replaceAll('"','\\"')}\")`;
    bind();
    setDirty(false);
  }

  function backgroundUrl(s) {
    if (!s) return null;
    if (s.background_source === "custom" && /^https?:\/\//i.test(String(s.background_url||""))) return String(s.background_url).trim();
    if (s.background_source === "campaign") return state.campaign?.backgroundUrl || state.campaign?.cover_url || null;
    return THEME_IMAGES[s.preset] || THEME_IMAGES.default;
  }

  function escapeAttr(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function markChanged() {
    setDirty(true);
    if (!isMaster()) return;
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(() => void save().catch(error => console.error("[AERIOM][ATMOSPHERE]", error)), 900);
  }

  function mutate(field, value) { state.settings = { ...state.settings, [field]: value }; markChanged(); render(); }

  function bind() {
    const root = $("campaign-theme-selector");
    if (!root) return;
    root.querySelectorAll("[data-atm-theme]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.atmTheme;
      const theme = getTheme(id);
      if (!theme || !isMaster()) return;
      state.settings = { ...state.settings, preset: id, accent_color: theme.variables?.["--theme-accent"] || state.settings.accent_color };
      markChanged();
      render();
    }));
    root.querySelectorAll("[data-atm-field]").forEach(button => button.addEventListener("click", () => { if (isMaster()) mutate(button.dataset.atmField, button.dataset.atmValue); }));
    root.querySelectorAll("[data-atm-range]").forEach(input => input.addEventListener("input", () => {
      const field = input.dataset.atmRange; state.settings = { ...state.settings, [field]: Number(input.value) };
      const value = root.querySelector(`[data-atm-value-for="${field}"]`); if (value) value.textContent = `${input.value}${field==='blur'?"px":"%"}`;
      markChanged();
      applyVisualState();
    }));
    root.querySelectorAll("[data-atm-select]").forEach(select => select.addEventListener("change", () => mutate(select.dataset.atmSelect, select.value)));
    root.querySelectorAll("[data-atm-color]").forEach(input => input.addEventListener("input", () => mutate(input.dataset.atmColor, input.value)));
    root.querySelectorAll("[data-atm-check]").forEach(input => input.addEventListener("change", () => mutate(input.dataset.atmCheck, input.checked)));
    root.querySelectorAll("[data-atm-bg-source]").forEach(button => button.addEventListener("click", () => { if (isMaster()) mutate("background_source", button.dataset.atmBgSource); }));
    root.querySelector("[data-atm-input=background_url]")?.addEventListener("input", event => { state.settings = { ...state.settings, background_url: event.target.value }; state.settings.background_source = "custom"; markChanged(); });
    root.querySelector("[data-atm-reset-bg]")?.addEventListener("click", () => { state.settings = { ...state.settings, background_source: "theme", background_url: null }; markChanged(); render(); });
    root.querySelector("[data-atm-action=save]")?.addEventListener("click", () => void save(true));
    root.querySelector("[data-atm-action=reset]")?.addEventListener("click", () => { state.settings = defaults(state.campaign?.theme || "default"); markChanged(); render(); });
  }

  function applyVisualState() {
    const s = state.settings;
    if (!s) return;
    const root = document.documentElement;
    const theme = getTheme(s.preset);
    const vars = theme?.variables || {};
    root.style.setProperty("--campaign-bg", vars["--theme-bg"] || "#090807");
    root.style.setProperty("--campaign-surface", vars["--theme-surface"] || "#15120f");
    root.style.setProperty("--campaign-gold", s.accent_color || vars["--theme-accent"] || "#c49e53");
    root.style.setProperty("--campaign-gold-soft", `color-mix(in srgb, ${s.accent_color || vars["--theme-accent"] || "#c49e53"} 12%, transparent)`);
    root.style.setProperty("--campaign-theme-intensity", `${Number(s.intensity)/100}`);
    root.style.setProperty("--campaign-panel-opacity", `${Number(s.surface_opacity)/100}`);
    root.style.setProperty("--campaign-vignette-opacity", `${Number(s.vignette)/100}`);
    root.style.setProperty("--campaign-grain-opacity", `${Number(s.grain)/100}`);
    root.style.setProperty("--campaign-atmosphere-glow", `${Number(s.glow)/100}`);
    root.style.setProperty("--campaign-atmosphere-blur", `${Number(s.blur)}px`);
    root.dataset.atmosphereMood = s.mood || "adventure";
    root.dataset.atmosphereTime = s.time_of_day || "night";
    root.dataset.atmosphereLight = s.lighting || "balanced";
    root.dataset.atmosphereDensity = s.ui_density || "comfortable";
    root.dataset.atmosphereSidebar = s.sidebar_mode || "full";
    root.dataset.atmosphereScene = s.scene_mode || "immersive";
    void applyCampaignTheme(s.preset || "default", backgroundUrl(s));
    window.dispatchEvent(new CustomEvent("aeriom:atmospherechange", { detail: { campaignId: state.campaignId, settings: { ...s } } }));
  }

  async function load() {
    if (!state.supabase || !state.campaignId) return;
    const campaignResult = await state.supabase.from("campaigns").select("id,theme,background_path,cover_url").eq("id", state.campaignId).maybeSingle();
    if (!campaignResult.error && campaignResult.data) {
      state.campaign = campaignResult.data;
      if (!state.campaign?.theme) state.campaign.theme = "default";
    }
    const result = await state.supabase.from("campaign_atmosphere_settings").select("*").eq("campaign_id", state.campaignId).maybeSingle();
    if (result.error) throw result.error;
    state.settings = normalize(result.data || { preset: state.campaign?.theme || "default" });
    state.hydrated = true;
    applyVisualState();
    render();
    await loadLiveSummary();
  }

  async function save(force = false) {
    if (!isMaster() || !state.supabase || !state.campaignId || state.saving) return;
    state.saving = true;
    window.clearTimeout(state.saveTimer);
    try {
      const payload = { ...state.settings, updated_by: ctx()?.user?.id || null };
      delete payload.id; delete payload.created_at;
      const result = await state.supabase.from("campaign_atmosphere_settings").upsert(payload, { onConflict: "campaign_id" }).select("*").single();
      if (result.error) throw result.error;
      state.settings = normalize(result.data);
      await state.supabase.from("campaigns").update({ theme: state.settings.preset }).eq("id", state.campaignId);
      applyVisualState();
      setDirty(false);
      if (force) render();
    } finally {
      state.saving = false;
    }
  }

  async function loadLiveSummary() {
    const host = $("aeriom-atmosphere-live-slot");
    if (!host || !state.supabase || !state.settings?.show_live_media) { if (host) host.innerHTML = ""; return; }
    const result = await state.supabase.from("campaign_live_media").select("media_type,title,active,source_url,updated_at").eq("campaign_id",state.campaignId).maybeSingle();
    const media = result.data;
    if (!media?.active) {
      host.innerHTML = `<div class="aeriom-atmosphere__player"><div class="aeriom-atmosphere__player-icon">◈</div><div class="aeriom-atmosphere__player-copy"><strong>Nenhuma mídia ao vivo</strong><span>${isMaster()?"O Mestre pode transmitir uma imagem, vídeo ou áudio pela configuração de imersão.":"A mesa está sem transmissão ativa."}</span></div></div>`;
      return;
    }
    const label = media.media_type === "audio" ? "Áudio" : media.media_type === "video" ? "Vídeo" : "Imagem";
    host.innerHTML = `<div class="aeriom-atmosphere__player"><div class="aeriom-atmosphere__player-icon">${media.media_type === "audio" ? "♫" : media.media_type === "video" ? "▶" : "▧"}</div><div class="aeriom-atmosphere__player-copy"><strong>${escapeAttr(media.title || `Transmissão de ${label.toLowerCase()}`)}</strong><span>Ativo para a mesa • ${label}</span></div>${isMaster()?`<div class="aeriom-atmosphere__inline"><button type="button" class="aeriom-atmosphere__button" data-atm-stop-media="1">Encerrar</button></div>`:""}</div>`;
    host.querySelector("[data-atm-stop-media]")?.addEventListener("click", async () => {
      const deleteResult = await state.supabase.from("campaign_live_media").delete().eq("campaign_id", state.campaignId);
      if (deleteResult.error) console.error("[AERIOM][ATMOSPHERE]", deleteResult.error);
      await loadLiveSummary();
    });
  }

  function subscribe() {
    if (state.channel || !state.supabase || !state.campaignId) return;
    state.channel = state.supabase.channel(`campaign-atmosphere:${state.campaignId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_atmosphere_settings", filter: `campaign_id=eq.${state.campaignId}` }, payload => {
        if (payload.eventType === "DELETE") state.settings = defaults(state.campaign?.theme || "default");
        else state.settings = normalize(payload.new);
        applyVisualState();
        render();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campaigns", filter: `id=eq.${state.campaignId}` }, payload => {
        state.campaign = { ...state.campaign, ...(payload.new || {}) };
        if (!state.settings || !isMaster()) { state.settings = normalize({ ...(state.settings||{}), preset: payload.new?.theme || state.settings?.preset || "default" }); applyVisualState(); render(); }
      })
      .subscribe();
  }

  async function start() {
    if (state.started) return;
    state.started = true;
    injectStyle();
    state.campaignId = campaignId();
    if (!state.campaignId) return;
    const c = ctx();
    state.supabase = c?.supabase || null;
    if (!state.supabase) {
      try { const { getSupabase } = await import("./supabase.js"); state.supabase = await getSupabase(); } catch (error) { console.error("[AERIOM][ATMOSPHERE]", error); return; }
    }
    await load();
    subscribe();
  }

  window.addEventListener("aeriom:campaign:ready", () => void start().catch(error => console.error("[AERIOM][ATMOSPHERE]", error)));
  window.addEventListener("aeriom:campaigntabchange", event => { if (event.detail?.tab === "theme") window.setTimeout(() => { injectStyle(); void start().catch(()=>{}); if (state.hydrated) render(); }, 30); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void start().catch(error => console.error("[AERIOM][ATMOSPHERE]", error)), { once:true });
  else void start().catch(error => console.error("[AERIOM][ATMOSPHERE]", error));
})();
