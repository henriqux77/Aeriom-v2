(() => {
'use strict';

if (!document.body.classList.contains('character-builder')) return;

// O criador já carrega o script principal da ficha. Este módulo é um "polish/fix"
// independente: não usa import em script clássico, evitando SyntaxError.
function loadSidebarModule() {
  if (window.__afterlifeSidebarFixLoaded) return;
  if (document.querySelector('script[data-afterlife-sidebar-module]')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = './js/afterlife-sidebar.js?v=20260914-34';
  s.dataset.afterlifeSidebarModule = '1';
  document.head.appendChild(s);
  window.__afterlifeSidebarFixLoaded = true;
}

function injectCSS() {
  if (document.getElementById('afterlife-class-carousel-fix')) return;
  const style = document.createElement('style');
  style.id = 'afterlife-class-carousel-fix';
  style.textContent = `
    /* As setas antigas de trocar ETAPA não fazem parte do carrossel de classes. */
    .character-builder #prevStep,
    .character-builder #nextStep,
    .character-builder .carousel-window > .carousel-arrow {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }

    /* Carrossel de classes: centro + vizinhas parcialmente visíveis. */
    .character-builder .class-carousel-v4 {
      position: relative !important;
      z-index: 30 !important;
      display: grid !important;
      grid-template-columns: 52px minmax(0, 1fr) 52px !important;
      align-items: center !important;
      gap: 8px !important;
      margin-top: 24px !important;
    }
    .character-builder .class-deck {
      position: relative !important;
      z-index: 20 !important;
      height: 360px !important;
      min-height: 360px !important;
      overflow: visible !important;
      perspective: 1200px !important;
    }
    .character-builder .class-card {
      position: absolute !important;
      left: 50% !important;
      top: 24px !important;
      width: min(280px, 70%) !important;
      min-height: 270px !important;
      margin: 0 !important;
      transform-origin: center center !important;
      transition: transform .48s cubic-bezier(.22,.8,.2,1), opacity .32s ease, filter .32s ease, box-shadow .4s ease, border-color .32s ease !important;
      will-change: transform, opacity !important;
      cursor: pointer !important;
    }
    .character-builder .class-card.selected {
      display: flex !important;
      z-index: 40 !important;
      opacity: 1 !important;
      filter: none !important;
      transform: translateX(-50%) scale(1.03) !important;
      border-color: rgba(57,245,138,.45) !important;
      box-shadow: 0 24px 70px rgba(0,0,0,.46), 0 0 30px rgba(57,245,138,.08) !important;
    }
    .character-builder .class-card.side {
      display: flex !important;
    }
    .character-builder .class-card.is-left {
      transform: translateX(calc(-50% - 162px)) scale(.78) !important;
      z-index: 15 !important;
      opacity: .52 !important;
      filter: saturate(.7) brightness(.82) !important;
    }
    .character-builder .class-card.is-right {
      transform: translateX(calc(-50% + 162px)) scale(.78) !important;
      z-index: 15 !important;
      opacity: .52 !important;
      filter: saturate(.7) brightness(.82) !important;
    }
    .character-builder .class-card.is-left:hover,
    .character-builder .class-card.is-right:hover {
      opacity: .78 !important;
      filter: saturate(.9) brightness(.94) !important;
    }

    /* Botões do carrossel de classe ficam acima dos cards. */
    .character-builder .class-arrow {
      position: relative !important;
      z-index: 60 !important;
      width: 46px !important;
      height: 46px !important;
      display: grid !important;
      place-items: center !important;
      padding: 0 !important;
      border: 1px solid rgba(57,245,138,.30) !important;
      border-radius: 50% !important;
      background: rgba(3,11,7,.96) !important;
      color: #edf8f2 !important;
      font: 400 30px/1 Inter,system-ui,sans-serif !important;
      cursor: pointer !important;
      box-shadow: 0 10px 28px rgba(0,0,0,.4) !important;
      transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease !important;
    }
    .character-builder .class-arrow:hover {
      transform: scale(1.08) !important;
      border-color: rgba(57,245,138,.62) !important;
      box-shadow: 0 12px 34px rgba(57,245,138,.10) !important;
    }
    .character-builder .class-arrow:active { transform: scale(.94) !important; }

    @media (max-width: 720px) {
      .character-builder .class-carousel-v4 {
        grid-template-columns: 44px minmax(0,1fr) 44px !important;
        gap: 4px !important;
      }
      .character-builder .class-deck {
        height: 330px !important;
        min-height: 330px !important;
      }
      .character-builder .class-card {
        width: 64% !important;
        min-height: 255px !important;
        top: 20px !important;
      }
      .character-builder .class-card.selected { transform: translateX(-50%) scale(.94) !important; }
      .character-builder .class-card.is-left {
        transform: translateX(calc(-50% - 110px)) scale(.58) !important;
        opacity: .42 !important;
      }
      .character-builder .class-card.is-right {
        transform: translateX(calc(-50% + 110px)) scale(.58) !important;
        opacity: .42 !important;
      }
      .character-builder .class-arrow { width: 40px !important; height: 40px !important; font-size: 27px !important; }
    }
    @media (max-width: 420px) {
      .character-builder .class-card { width: 68% !important; }
      .character-builder .class-card.is-left { transform: translateX(calc(-50% - 94px)) scale(.52) !important; }
      .character-builder .class-card.is-right { transform: translateX(calc(-50% + 94px)) scale(.52) !important; }
    }
  `;
  document.head.appendChild(style);
}

function removeOldStepArrows() {
  ['prevStep', 'nextStep'].forEach((id) => document.getElementById(id)?.remove());
}

function getCards() {
  return Array.from(document.querySelectorAll('.class-card'));
}

function syncClassPositions() {
  const cards = getCards();
  if (!cards.length) return;
  let current = cards.findIndex((card) => card.classList.contains('selected'));
  if (current < 0) current = 0;

  cards.forEach((card, index) => {
    card.classList.remove('is-left', 'is-right');
    card.classList.add('side');
    if (index === current) card.classList.remove('side');
    else if (index === (current + 1) % cards.length) card.classList.add('is-right');
    else card.classList.add('is-left');
  });
}

function bindClassCarousel() {
  const cards = getCards();
  const prev = document.querySelector('[data-class-prev]');
  const next = document.querySelector('[data-class-next]');
  if (!cards.length) return;

  cards.forEach((card) => {
    if (card.dataset.classCarouselFix === '1') return;
    card.dataset.classCarouselFix = '1';
    card.addEventListener('click', () => {
      window.setTimeout(syncClassPositions, 0);
      window.setTimeout(syncClassPositions, 80);
    });
  });

  if (prev && prev.dataset.classCarouselFix !== '1') {
    prev.dataset.classCarouselFix = '1';
    prev.addEventListener('click', () => window.setTimeout(syncClassPositions, 30));
  }
  if (next && next.dataset.classCarouselFix !== '1') {
    next.dataset.classCarouselFix = '1';
    next.addEventListener('click', () => window.setTimeout(syncClassPositions, 30));
  }

  // Arrastar horizontal no mobile.
  const deck = document.getElementById('classDeck');
  if (deck && deck.dataset.swipeBound !== '1') {
    deck.dataset.swipeBound = '1';
    let startX = null;
    deck.addEventListener('pointerdown', (e) => { startX = e.clientX; }, { passive: true });
    deck.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < 45) return;
      const selected = getCards().findIndex((c) => c.classList.contains('selected'));
      const target = dx < 0 ? selected + 1 : selected - 1;
      const targetCard = getCards()[(target + getCards().length) % getCards().length];
      targetCard?.click();
      window.setTimeout(syncClassPositions, 60);
    }, { passive: true });
  }

  syncClassPositions();
}

function boot() {
  loadSidebarModule();
  injectCSS();
  removeOldStepArrows();
  bindClassCarousel();
  const observer = new MutationObserver(() => {
    removeOldStepArrows();
    bindClassCarousel();
    syncClassPositions();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
})();