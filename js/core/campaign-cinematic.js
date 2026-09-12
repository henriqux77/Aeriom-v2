(() => {
  "use strict";

  const THEME_META = Object.freeze({
    default: { icon: "✦", label: "AERIOM", density: 24 },
    forest: { icon: "🌿", label: "FLORESTA", density: 30 },
    cave: { icon: "⛰", label: "CAVERNA", density: 34 },
    volcano: { icon: "🌋", label: "VULCÃO", density: 42 },
    castle: { icon: "♜", label: "CASTELO", density: 18 },
    coast: { icon: "🌊", label: "COSTA", density: 26 },
    ruins: { icon: "🏛", label: "RUÍNAS", density: 28 }
  });

  const THEME_ICONS = {
    default: "✦",
    forest: "❧",
    cave: "◈",
    volcano: "✹",
    castle: "♜",
    coast: "≈",
    ruins: "𓂀"
  };

  let root = null;
  let particleLayer = null;
  let frame = 0;
  let running = false;
  let activeTheme = "default";

  const esc = value => String(value ?? "").replace(/[&<>\"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[ch]));

  function installStyle() {
    if (document.getElementById("aeriom-cinematic-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-cinematic-style";
    style.textContent = `
      :root{
        --cin-accent:#c49e53;
        --cin-accent-soft:rgba(196,158,83,.20);
        --cin-bg:#090807;
        --cin-surface:rgba(12,10,8,.82);
        --cin-glow:rgba(255,255,255,.08);
        --cin-particle-a:rgba(255,255,255,.34);
        --cin-particle-b:rgba(255,255,255,.12);
      }

      html[data-aeriom-cinematic="1"] body::before{
        content:"";
        position:fixed;
        inset:0;
        z-index:9970;
        pointer-events:none;
        background:
          radial-gradient(circle at 50% -10%, rgba(255,255,255,.045), transparent 42%),
          linear-gradient(180deg, transparent 68%, rgba(0,0,0,.18));
        mix-blend-mode:screen;
      }

      .aeriom-cinematic-layer{
        position:fixed;
        inset:0;
        z-index:9975;
        pointer-events:none;
        overflow:hidden;
        opacity:1;
        transition:opacity .45s ease;
      }
      .aeriom-cinematic-layer.is-hidden{opacity:0}
      .aeriom-cinematic-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 42%,rgba(0,0,0,.48) 120%);opacity:.48;}
      .aeriom-cinematic-particles{position:absolute;inset:0;overflow:hidden;}
      .aeriom-cinematic-particle{position:absolute;left:var(--x);top:calc(var(--y) + 105vh);width:var(--s);height:var(--s);border-radius:50%;background:var(--pcolor);box-shadow:0 0 var(--glow) var(--pcolor);opacity:var(--op);animation: aeriomParticle var(--dur) linear var(--delay) infinite;transform:translate3d(0,0,0);}
      @keyframes aeriomParticle{
        0%{transform:translate3d(0,0,0) rotate(0deg);opacity:0}
        8%{opacity:var(--op)}
        52%{opacity:var(--op)}
        92%{opacity:0}
        100%{transform:translate3d(var(--drift),-125vh,0) rotate(300deg);opacity:0}
      }

      /* Floresta */
      html[data-aeriom-cinematic-theme="forest"] .aeriom-cinematic-layer{background:radial-gradient(circle at 16% 86%,rgba(82,121,67,.13),transparent 30%),radial-gradient(circle at 84% 22%,rgba(117,155,89,.10),transparent 35%)}
      .aeriom-forest-birds{position:absolute;inset:0;}
      .aeriom-forest-bird{position:absolute;width:28px;height:12px;left:var(--x);top:var(--y);opacity:0;animation:aeriomBird var(--dur) linear var(--delay) infinite;filter:drop-shadow(0 2px 5px rgba(0,0,0,.35));}
      .aeriom-forest-bird::before,.aeriom-forest-bird::after{content:"";position:absolute;top:4px;width:16px;height:7px;border-top:2px solid rgba(31,27,20,.82);border-radius:70% 70% 0 0;}
      .aeriom-forest-bird::before{left:0;transform:rotate(12deg)}.aeriom-forest-bird::after{right:0;transform:rotate(-12deg)}
      @keyframes aeriomBird{0%{transform:translateX(-12vw) translateY(8px) scale(.72);opacity:0}12%{opacity:.8}55%{opacity:.65}100%{transform:translateX(118vw) translateY(-20px) scale(1);opacity:0}}

      .aeriom-forest-leaf{position:absolute;left:var(--x);top:-5vh;width:10px;height:15px;border-radius:80% 0 80% 0;background:linear-gradient(135deg,#7f9c58,#394e2c);opacity:.62;transform:rotate(35deg);animation:aeriomLeaf var(--dur) linear var(--delay) infinite;}
      @keyframes aeriomLeaf{0%{transform:translate3d(0,0,0) rotate(25deg)}35%{transform:translate3d(var(--drift),34vh,0) rotate(150deg)}70%{transform:translate3d(calc(var(--drift) * -.45),68vh,0) rotate(240deg)}100%{transform:translate3d(var(--drift),112vh,0) rotate(330deg);opacity:0}}

      /* Caverna */
      html[data-aeriom-cinematic-theme="cave"] .aeriom-cinematic-vignette{opacity:.78;background:radial-gradient(circle at 50% 42%,rgba(120,145,172,.08),transparent 38%),radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,.76) 110%)}
      html[data-aeriom-cinematic-theme="cave"] .aeriom-cinematic-particle{background:rgba(191,183,164,.22);box-shadow:0 0 7px rgba(191,183,164,.12);}

      /* Vulcão */
      html[data-aeriom-cinematic-theme="volcano"] .aeriom-cinematic-layer{background:linear-gradient(180deg,rgba(100,20,5,.08),transparent 45%,rgba(255,70,0,.05))}
      .aeriom-lava-river{position:absolute;left:-6vw;right:-6vw;bottom:-3vh;height:18vh;opacity:.82;filter:blur(.2px);background:
        radial-gradient(ellipse at 18% 80%,rgba(255,245,135,.88),transparent 8%),
        radial-gradient(ellipse at 43% 35%,rgba(255,210,70,.72),transparent 11%),
        radial-gradient(ellipse at 74% 67%,rgba(255,92,18,.65),transparent 10%),
        linear-gradient(165deg,rgba(57,8,2,.97) 0 11%,rgba(160,23,4,.94) 12% 27%,rgba(255,86,10,.88) 28% 39%,rgba(82,7,2,.96) 40% 55%,rgba(211,37,4,.90) 56% 75%,rgba(55,6,2,.98) 76%);
        box-shadow:0 -8px 35px rgba(255,75,10,.18);animation:aeriomLava 7s ease-in-out infinite alternate;transform:skewX(-8deg);}
      .aeriom-lava-river::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(165deg,transparent 0 28px,rgba(255,226,80,.19) 29px 36px,transparent 37px 62px);mix-blend-mode:screen;animation:aeriomLavaFlow 4s linear infinite;}
      @keyframes aeriomLava{from{transform:translateX(-2%) skewX(-8deg) scaleY(.92)}to{transform:translateX(2%) skewX(-8deg) scaleY(1.06)}}
      @keyframes aeriomLavaFlow{to{background-position:140px 0}}
      html[data-aeriom-cinematic-theme="volcano"] .aeriom-cinematic-particle{background:rgba(255,120,38,.8);box-shadow:0 0 10px rgba(255,74,10,.72);border-radius:45%;width:var(--s);height:calc(var(--s) * 1.3);}

      /* Castelo */
      .aeriom-castle-light{position:absolute;width:35vw;height:35vw;left:50%;top:6%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,rgba(255,228,157,.12),transparent 60%);filter:blur(12px);animation:aeriomLight 6s ease-in-out infinite alternate;}
      @keyframes aeriomLight{from{opacity:.35;transform:translateX(-50%) scale(.94)}to{opacity:.8;transform:translateX(-50%) scale(1.05)}}
      html[data-aeriom-cinematic-theme="castle"] .aeriom-cinematic-particle{background:rgba(221,211,186,.28);box-shadow:none}

      /* Costa */
      .aeriom-coast-mist{position:absolute;left:-10%;right:-10%;bottom:6%;height:38%;background:linear-gradient(180deg,transparent,rgba(180,211,220,.09),rgba(180,211,220,.03));filter:blur(16px);animation:aeriomMist 12s ease-in-out infinite alternate;}
      @keyframes aeriomMist{from{transform:translateX(-3%)}to{transform:translateX(3%)}}
      .aeriom-coast-glow{position:absolute;right:8%;top:10%;width:25vw;height:25vw;border-radius:50%;background:radial-gradient(circle,rgba(130,193,218,.12),transparent 66%);filter:blur(8px);animation:aeriomWaveGlow 8s ease-in-out infinite alternate;}
      @keyframes aeriomWaveGlow{from{opacity:.35}to{opacity:.85}}

      /* Ruínas */
      html[data-aeriom-cinematic-theme="ruins"] .aeriom-cinematic-layer{background:linear-gradient(180deg,rgba(133,112,73,.06),transparent 52%,rgba(92,70,38,.09))}
      html[data-aeriom-cinematic-theme="ruins"] .aeriom-cinematic-vignette{opacity:.62}

      /* Ícones temáticos: altera glifo sem mudar layout */
      html[data-aeriom-cinematic-theme="default"] .aeriom-theme-symbol::before{content:"✦"}
      html[data-aeriom-cinematic-theme="forest"] .aeriom-theme-symbol::before{content:"❧"}
      html[data-aeriom-cinematic-theme="cave"] .aeriom-theme-symbol::before{content:"◈"}
      html[data-aeriom-cinematic-theme="volcano"] .aeriom-theme-symbol::before{content:"✹"}
      html[data-aeriom-cinematic-theme="castle"] .aeriom-theme-symbol::before{content:"♜"}
      html[data-aeriom-cinematic-theme="coast"] .aeriom-theme-symbol::before{content:"≈"}
      html[data-aeriom-cinematic-theme="ruins"] .aeriom-theme-symbol::before{content:"𓂀"}

      /* Profundidade do painel sem alterar dimensões */
      html[data-aeriom-cinematic-theme="forest"] .campaign-panel,
      html[data-aeriom-cinematic-theme="forest"] .campaign-card{box-shadow:0 18px 45px rgba(5,20,8,.20)}
      html[data-aeriom-cinematic-theme="volcano"] .campaign-panel,
      html[data-aeriom-cinematic-theme="volcano"] .campaign-card{box-shadow:0 18px 45px rgba(70,12,3,.28)}
      html[data-aeriom-cinematic-theme="coast"] .campaign-panel,
      html[data-aeriom-cinematic-theme="coast"] .campaign-card{box-shadow:0 18px 45px rgba(5,32,45,.22)}

      @media (prefers-reduced-motion: reduce){
        .aeriom-cinematic-particle,.aeriom-forest-bird,.aeriom-forest-leaf,.aeriom-lava-river,.aeriom-castle-light,.aeriom-coast-mist,.aeriom-coast-glow{animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLayer() {
    if (root?.isConnected) return root;
    root = document.createElement("div");
    root.id = "aeriom-cinematic-layer";
    root.className = "aeriom-cinematic-layer";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = '<div class="aeriom-cinematic-vignette"></div><div class="aeriom-cinematic-particles"></div><div class="aeriom-cinematic-special"></div>';
    document.body.appendChild(root);
    particleLayer = root.querySelector(".aeriom-cinematic-particles");
    return root;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function clearSpecial() {
    root?.querySelector(".aeriom-cinematic-special")?.replaceChildren();
  }

  function particleStyle(theme, i, total) {
    const x = `${rand(0, 100).toFixed(2)}vw`;
    const y = `${rand(-15, 100).toFixed(2)}vh`;
    const size = theme === "volcano" ? rand(2, 5) : theme === "forest" ? rand(4, 10) : rand(2, 4.5);
    const drift = `${rand(-16, 16).toFixed(2)}vw`;
    const dur = `${rand(theme === "volcano" ? 3.2 : 7, theme === "volcano" ? 7.5 : 16).toFixed(2)}s`;
    const delay = `${(-rand(0, 15)).toFixed(2)}s`;
    const op = rand(.18, .68).toFixed(2);
    const colors = {
      default: "rgba(255,255,255,.28)",
      forest: "rgba(217,237,167,.56)",
      cave: "rgba(192,183,165,.24)",
      volcano: "rgba(255,104,32,.82)",
      castle: "rgba(236,225,193,.34)",
      coast: "rgba(186,226,240,.26)",
      ruins: "rgba(214,191,145,.34)"
    };
    return `--x:${x};--y:${y};--s:${size.toFixed(2)}px;--drift:${drift};--dur:${dur};--delay:${delay};--op:${op};--pcolor:${colors[theme] || colors.default};--glow:${theme === "volcano" ? 10 : 5}px`;
  }

  function renderParticles(theme) {
    if (!particleLayer) return;
    const meta = THEME_META[theme] || THEME_META.default;
    const total = meta.density + (theme === "volcano" ? 10 : 0);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i += 1) {
      const p = document.createElement("span");
      p.className = "aeriom-cinematic-particle";
      p.style.cssText = particleStyle(theme, i, total);
      frag.appendChild(p);
    }
    particleLayer.replaceChildren(frag);
  }

  function addForestEffects(host) {
    const birds = document.createElement("div");
    birds.className = "aeriom-forest-birds";
    for (let i = 0; i < 4; i += 1) {
      const bird = document.createElement("i");
      bird.className = "aeriom-forest-bird";
      bird.style.cssText = `--x:${rand(-20, 15).toFixed(2)}vw;--y:${rand(8, 40).toFixed(2)}vh;--dur:${rand(16, 28).toFixed(1)}s;--delay:${(-rand(0, 18)).toFixed(1)}s;`;
      birds.appendChild(bird);
    }
    host.appendChild(birds);
    for (let i = 0; i < 11; i += 1) {
      const leaf = document.createElement("i");
      leaf.className = "aeriom-forest-leaf";
      leaf.style.cssText = `--x:${rand(0,100).toFixed(2)}vw;--dur:${rand(8,17).toFixed(1)}s;--delay:${(-rand(0,14)).toFixed(1)}s;--drift:${rand(-22,22).toFixed(2)}vw;`;
      host.appendChild(leaf);
    }
  }

  function addVolcanoEffects(host) {
    const river = document.createElement("div");
    river.className = "aeriom-lava-river";
    river.title = "Rio de magma cinematográfico";
    host.appendChild(river);
  }

  function addCastleEffects(host) {
    const light = document.createElement("div");
    light.className = "aeriom-castle-light";
    host.appendChild(light);
  }

  function addCoastEffects(host) {
    const mist = document.createElement("div");
    mist.className = "aeriom-coast-mist";
    const glow = document.createElement("div");
    glow.className = "aeriom-coast-glow";
    host.append(mist, glow);
  }

  function decorateThemeSymbols(theme) {
    const symbolTargets = document.querySelectorAll("[data-theme-icon], .campaign-panel__icon, .campaign-section__icon, .campaign-nav__icon, .aeriom-theme-symbol");
    symbolTargets.forEach((el) => {
      if (!el.classList.contains("aeriom-theme-symbol")) el.classList.add("aeriom-theme-symbol");
      if (!el.dataset.aeriomOriginalText) el.dataset.aeriomOriginalText = el.textContent?.trim() || "";
      // Only replace standalone decorative one/two-character icons; never touch labels.
      const original = el.dataset.aeriomOriginalText || "";
      if (["✦","★","☆","◈","◇","⚔","⚑","☰","♜","🌲","🌋","🌊","🏛"].includes(original)) {
        el.textContent = THEME_ICONS[theme] || THEME_ICONS.default;
      }
    });
  }

  function applyTheme(theme) {
    if (!THEME_META[theme]) theme = "default";
    activeTheme = theme;
    const doc = document.documentElement;
    installStyle();
    ensureLayer();
    doc.dataset.aeriomCinematic = "1";
    doc.dataset.aeriomCinematicTheme = theme;

    const vars = {
      default: ["#c49e53","rgba(196,158,83,.16)","#090807","rgba(255,255,255,.28)"],
      forest: ["#9db66f","rgba(121,159,90,.20)","#071009","rgba(202,232,174,.42)"],
      cave: ["#9f8a69","rgba(116,133,159,.16)","#07080a","rgba(191,183,164,.21)"],
      volcano: ["#d86e35","rgba(221,63,20,.28)","#110604","rgba(255,104,32,.76)"],
      castle: ["#c2aa72","rgba(194,170,114,.18)","#09090b","rgba(236,225,193,.30)"],
      coast: ["#74aec6","rgba(92,166,192,.17)","#071015","rgba(186,226,240,.24)"],
      ruins: ["#b59a69","rgba(181,154,105,.16)","#0b0a08","rgba(214,191,145,.30)"]
    }[theme];
    doc.style.setProperty("--cin-accent", vars[0]);
    doc.style.setProperty("--cin-accent-soft", vars[1]);
    doc.style.setProperty("--cin-bg", vars[2]);
    doc.style.setProperty("--cin-particle-a", vars[3]);

    clearSpecial();
    const special = root.querySelector(".aeriom-cinematic-special");
    if (theme === "forest") addForestEffects(special);
    if (theme === "volcano") addVolcanoEffects(special);
    if (theme === "castle") addCastleEffects(special);
    if (theme === "coast") addCoastEffects(special);
    renderParticles(theme);
    decorateThemeSymbols(theme);

    root.classList.remove("is-hidden");
    return theme;
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
    if (root) root.classList.add("is-hidden");
  }

  function detectTheme(detail = {}) {
    return String(detail.theme || detail.themeId || detail.preset || document.documentElement.dataset.theme || "default").toLowerCase();
  }

  function start() {
    if (running) return;
    running = true;
    const existing = document.documentElement.dataset.theme || "default";
    applyTheme(existing);
    const tick = () => {
      if (!running) return;
      frame = requestAnimationFrame(tick);
    };
    tick();
  }

  window.addEventListener("aeriom:themechange", event => {
    applyTheme(detectTheme(event.detail || {}));
  });
  window.addEventListener("aeriom:campaigntheme", event => {
    applyTheme(detectTheme(event.detail || {}));
  });
  window.addEventListener("aeriom:atmospherechange", event => {
    const theme = detectTheme(event.detail || {});
    if (theme !== activeTheme) applyTheme(theme);
    else decorateThemeSymbols(theme);
  });
  window.addEventListener("aeriom:campaign:ready", () => setTimeout(() => start(), 120));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 180), { once: true });
  } else {
    setTimeout(start, 180);
  }
})();
