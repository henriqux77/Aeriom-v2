(() => {
  'use strict';

  // Fix/polish isolado da criação de ficha.
  // IMPORTANTE: não observa mudanças de atributo/classe. Observar 'class' aqui
  // causava um loop infinito de MutationObserver e congelava a página.
  if (!document.body.classList.contains('character-builder')) return;

  const cssId = 'afterlife-ficha-ui-fix-v3';
  const addStyles = () => {
    if (document.getElementById(cssId)) return;
    const style = document.createElement('style');
    style.id = cssId;
    style.textContent = `
      /* As setas antigas de navegação da etapa ficam removidas de verdade. */
      .character-builder #prevStep,
      .character-builder #nextStep,
      .character-builder .carousel-window > .carousel-arrow {
        display:none !important;
        width:0 !important;
        height:0 !important;
        opacity:0 !important;
        pointer-events:none !important;
        visibility:hidden !important;
      }

      /* Carrossel de classes: centro + duas cartas laterais. */
      .character-builder .class-carousel-v4 {
        position:relative !important;
        z-index:20 !important;
        display:grid !important;
        grid-template-columns:48px minmax(0,1fr) 48px !important;
        align-items:center !important;
        gap:6px !important;
        margin-top:22px !important;
      }
      .character-builder .class-deck {
        position:relative !important;
        z-index:10 !important;
        height:360px !important;
        min-height:360px !important;
        overflow:visible !important;
        perspective:1200px !important;
      }
      .character-builder .class-card {
        position:absolute !important;
        left:50% !important;
        top:24px !important;
        width:min(280px,70%) !important;
        min-height:270px !important;
        margin:0 !important;
        transform-origin:center !important;
        transition:transform .45s cubic-bezier(.22,.8,.2,1),opacity .3s ease,filter .3s ease,box-shadow .4s ease,border-color .3s ease !important;
        will-change:transform,opacity !important;
        cursor:pointer !important;
      }
      .character-builder .class-card.selected {
        display:flex !important;
        z-index:40 !important;
        opacity:1 !important;
        filter:none !important;
        transform:translateX(-50%) scale(1.03) !important;
        border-color:rgba(57,245,138,.45) !important;
        box-shadow:0 24px 70px rgba(0,0,0,.46),0 0 30px rgba(57,245,138,.08) !important;
      }
      .character-builder .class-card.side { display:flex !important; }
      .character-builder .class-card.is-left {
        transform:translateX(calc(-50% - 160px)) scale(.78) !important;
        z-index:15 !important;
        opacity:.5 !important;
        filter:saturate(.7) brightness(.82) !important;
      }
      .character-builder .class-card.is-right {
        transform:translateX(calc(-50% + 160px)) scale(.78) !important;
        z-index:15 !important;
        opacity:.5 !important;
        filter:saturate(.7) brightness(.82) !important;
      }
      .character-builder .class-arrow {
        position:relative !important;
        z-index:60 !important;
        width:46px !important;
        height:46px !important;
        display:grid !important;
        place-items:center !important;
        padding:0 !important;
        border:1px solid rgba(57,245,138,.3) !important;
        border-radius:50% !important;
        background:rgba(3,11,7,.96) !important;
        color:#edf8f2 !important;
        cursor:pointer !important;
        font:400 30px/1 Inter,system-ui,sans-serif !important;
        box-shadow:0 10px 28px rgba(0,0,0,.4) !important;
        transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease !important;
      }
      .character-builder .class-arrow:hover { transform:scale(1.08) !important; border-color:rgba(57,245,138,.62) !important; }
      .character-builder .class-arrow:active { transform:scale(.94) !important; }

      /* HP/DEF: somente o anel gira; ícone não gira. */
      .character-builder .combat-status-ring { position:relative !important; isolation:isolate !important; overflow:visible !important; animation:none !important; transform:none !important; }
      .character-builder .combat-status-ring::before {
        content:"" !important;
        position:absolute !important;
        inset:-9px !important;
        z-index:1 !important;
        border:5px solid transparent !important;
        border-radius:50% !important;
        pointer-events:none !important;
        animation:afterlifeStatusOrbit 2.4s linear infinite !important;
      }
      .character-builder .combat-status-card.hp .combat-status-ring::before { border-top-color:#ff625f !important; border-right-color:#ff625f !important; }
      .character-builder .combat-status-card.def .combat-status-ring::before { border-top-color:#39f58a !important; border-left-color:#39f58a !important; animation-direction:reverse !important; }
      .character-builder .combat-status-icon { position:relative !important; z-index:2 !important; transform:none !important; }
      .character-builder .combat-status-card.hp .combat-status-icon { animation:afterlifeHeartBeat 1.05s ease-in-out infinite !important; display:inline-block !important; }
      .character-builder .combat-status-card.def .combat-status-icon { animation:none !important; }

      @keyframes afterlifeStatusOrbit { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      @keyframes afterlifeHeartBeat { 0%,100%{transform:scale(1)} 12%{transform:scale(1.16)} 24%{transform:scale(.96)} 36%{transform:scale(1.1)} 50%{transform:scale(1)} }

      @media (max-width:720px) {
        .character-builder .class-carousel-v4 { grid-template-columns:44px minmax(0,1fr) 44px !important; gap:4px !important; }
        .character-builder .class-deck { height:330px !important; min-height:330px !important; }
        .character-builder .class-card { width:64% !important; min-height:255px !important; top:20px !important; }
        .character-builder .class-card.selected { transform:translateX(-50%) scale(.94) !important; }
        .character-builder .class-card.is-left { transform:translateX(calc(-50% - 108px)) scale(.58) !important; opacity:.42 !important; }
        .character-builder .class-card.is-right { transform:translateX(calc(-50% + 108px)) scale(.58) !important; opacity:.42 !important; }
        .character-builder .class-arrow { width:40px !important; height:40px !important; font-size:27px !important; }
      }
      @media (max-width:420px) {
        .character-builder .class-card { width:68% !important; }
        .character-builder .class-card.is-left { transform:translateX(calc(-50% - 94px)) scale(.52) !important; }
        .character-builder .class-card.is-right { transform:translateX(calc(-50% + 94px)) scale(.52) !important; }
      }
      @media (prefers-reduced-motion:reduce) {
        .character-builder .combat-status-ring::before,.character-builder .combat-status-card.hp .combat-status-icon,.character-builder .class-card { animation:none !important; transition:none !important; }
      }
    `;
    document.head.appendChild(style);
  };

  const removeOldStepArrows = () => {
    ['prevStep','nextStep'].forEach(id => document.getElementById(id)?.remove());
  };

  const cards = () => Array.from(document.querySelectorAll('.class-card'));

  const syncClassPositions = () => {
    const list = cards();
    if (!list.length) return;
    let current = list.findIndex(card => card.classList.contains('selected'));
    if (current < 0) current = 0;
    list.forEach((card,index) => {
      card.classList.remove('is-left','is-right','side');
      if (index === current) return;
      card.classList.add('side');
      if (index === (current + 1) % list.length) card.classList.add('is-right');
      else card.classList.add('is-left');
    });
  };

  const bindCarousel = () => {
    const list = cards();
    const prev = document.querySelector('[data-class-prev]');
    const next = document.querySelector('[data-class-next]');
    if (!list.length) return;

    list.forEach(card => {
      if (card.dataset.fixBound === '1') return;
      card.dataset.fixBound = '1';
      card.addEventListener('click', () => setTimeout(syncClassPositions, 0));
    });

    if (prev && prev.dataset.fixBound !== '1') {
      prev.dataset.fixBound = '1';
      prev.addEventListener('click', () => setTimeout(syncClassPositions, 30));
    }
    if (next && next.dataset.fixBound !== '1') {
      next.dataset.fixBound = '1';
      next.addEventListener('click', () => setTimeout(syncClassPositions, 30));
    }

    const deck = document.getElementById('classDeck');
    if (deck && deck.dataset.swipeBound !== '1') {
      deck.dataset.swipeBound = '1';
      let startX = null;
      deck.addEventListener('pointerdown', e => { startX = e.clientX; }, {passive:true});
      deck.addEventListener('pointerup', e => {
        if (startX == null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) < 45) return;
        const now = cards();
        const current = now.findIndex(card => card.classList.contains('selected'));
        const target = now[(current + (dx < 0 ? 1 : -1) + now.length) % now.length];
        target?.click();
      }, {passive:true});
    }

    syncClassPositions();
  };

  const boot = () => {
    addStyles();
    removeOldStepArrows();
    bindCarousel();
    // Observa apenas criação/remoção de elementos. NÃO observa 'class'.
    // Assim, syncClassPositions() não consegue disparar um loop infinito.
    const observer = new MutationObserver(() => {
      removeOldStepArrows();
      bindCarousel();
    });
    observer.observe(document.body, { childList:true, subtree:true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
