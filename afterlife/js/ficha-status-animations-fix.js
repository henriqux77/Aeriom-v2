import './afterlife-sidebar.js?v=20260914-32';

(() => {
  'use strict';
  if (!document.body.classList.contains('character-builder')) return;

  const STYLE_ID = 'afterlife-status-animation-fix';
  const css = `
.character-builder .combat-status-ring{position:relative!important;isolation:isolate!important;overflow:visible!important;animation:none!important;transform:none!important}
.character-builder .combat-status-ring::before{content:""!important;position:absolute!important;inset:-9px!important;z-index:1!important;box-sizing:border-box!important;border:5px solid transparent!important;border-radius:50%!important;pointer-events:none!important;animation:afterlifeStatusOrbit 2.4s linear infinite!important;transform-origin:50% 50%!important}
.character-builder .combat-status-card.hp .combat-status-ring::before{border-top-color:#ff625f!important;border-right-color:#ff625f!important;filter:drop-shadow(0 0 7px rgba(255,98,95,.45))!important}
.character-builder .combat-status-card.def .combat-status-ring::before{border-top-color:#39f58a!important;border-left-color:#39f58a!important;filter:drop-shadow(0 0 7px rgba(57,245,138,.40))!important}
.character-builder .combat-status-icon{position:relative!important;z-index:2!important;transform:none!important;animation:none!important}
.character-builder .combat-status-card.hp .combat-status-icon{animation:afterlifeHeartBeat 1.05s ease-in-out infinite!important}
.character-builder .combat-status-card.def .combat-status-icon{animation:none!important;transform:none!important}

/* Classe: carrossel de 3 cartões, inclusive no celular. */
.character-builder .class-carousel-v4{position:relative!important;z-index:20!important;display:grid!important;grid-template-columns:52px minmax(0,1fr) 52px!important;align-items:center!important;gap:8px!important;margin-top:22px!important}
.character-builder .class-deck{position:relative!important;z-index:10!important;min-height:340px!important;margin:0!important;display:block!important;perspective:1200px!important;overflow:visible!important}
.character-builder .class-card{position:absolute!important;left:50%!important;top:28px!important;width:min(270px,72%)!important;min-height:265px!important;margin:0!important;transition:transform .32s cubic-bezier(.2,.8,.2,1),opacity .24s ease,filter .24s ease,box-shadow .32s ease!important;will-change:transform!important;cursor:pointer!important}
.character-builder .class-card.selected{z-index:30!important;opacity:1!important;filter:none!important;transform:translateX(-50%) scale(1.04)!important}
.character-builder .class-card.side{display:flex!important;z-index:15!important;opacity:.58!important;filter:saturate(.72)!important}
.character-builder .class-card.is-left{transform:translateX(calc(-50% - 155px)) scale(.78)!important}
.character-builder .class-card.is-right{transform:translateX(calc(-50% + 155px)) scale(.78)!important}
.character-builder .class-card.is-left:hover,.character-builder .class-card.is-right:hover{opacity:.82!important}
.character-builder .class-arrow{position:relative!important;z-index:50!important;width:44px!important;height:44px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid rgba(57,245,138,.28)!important;border-radius:50%!important;background:rgba(3,11,7,.94)!important;color:#eaf5ef!important;font:400 30px/1 Inter,sans-serif!important;cursor:pointer!important;box-shadow:0 8px 24px rgba(0,0,0,.35)!important;transition:transform .2s ease,border-color .2s ease,background .2s ease!important}
.character-builder .class-arrow:hover{transform:scale(1.08)!important;border-color:rgba(57,245,138,.55)!important;background:rgba(8,24,15,.98)!important}
.character-builder .class-arrow:active{transform:scale(.95)!important}
.character-builder .class-arrow--left{grid-column:1!important}
.character-builder .class-arrow--right{grid-column:3!important}

/* Navegação da página: menor e atrás do carrossel interno. */
.character-builder .carousel-arrow{z-index:5!important;width:30px!important;height:44px!important;opacity:.48!important;border:0!important;background:rgba(4,10,7,.72)!important;color:#c5d2cb!important;border-radius:10px!important;font-size:26px!important}
.character-builder .carousel-arrow:hover{opacity:.9!important;background:rgba(8,20,13,.9)!important}
.character-builder .class-carousel-v4~.carousel-footer{position:relative!important;z-index:2!important}

@keyframes afterlifeStatusOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes afterlifeHeartBeat{0%,100%{transform:scale(1)}12%{transform:scale(1.16)}24%{transform:scale(.96)}36%{transform:scale(1.10)}50%{transform:scale(1)}}

@media(max-width:720px){
  .character-builder .class-carousel-v4{grid-template-columns:46px minmax(0,1fr) 46px!important;gap:4px!important}
  .character-builder .class-deck{min-height:330px!important}
  .character-builder .class-card{width:68%!important;min-height:260px!important;top:22px!important}
  .character-builder .class-card.is-left{transform:translateX(calc(-50% - 118px)) scale(.62)!important;opacity:.42!important}
  .character-builder .class-card.is-right{transform:translateX(calc(-50% + 118px)) scale(.62)!important;opacity:.42!important}
  .character-builder .class-card.selected{transform:translateX(-50%) scale(.98)!important}
  .character-builder .class-arrow{width:40px!important;height:40px!important;font-size:27px!important}
}
@media(max-width:420px){
  .character-builder .class-card{width:72%!important}
  .character-builder .class-card.is-left{transform:translateX(calc(-50% - 96px)) scale(.54)!important}
  .character-builder .class-card.is-right{transform:translateX(calc(-50% + 96px)) scale(.54)!important}
  .character-builder .class-deck{min-height:315px!important}
}
@media(prefers-reduced-motion:reduce){.character-builder .combat-status-ring::before,.character-builder .combat-status-card.hp .combat-status-icon,.character-builder .class-card{animation:none!important;transition:none!important}}
`;

  const mount = () => {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  };

  function syncClassPositions() {
    const cards = Array.from(document.querySelectorAll('.class-card'));
    if (!cards.length) return;
    const selected = cards.findIndex((card) => card.classList.contains('selected'));
    const current = selected >= 0 ? selected : 0;
    cards.forEach((card, index) => {
      card.classList.remove('is-left', 'is-right');
      if (index === current) return;
      const distance = (index - current + cards.length) % cards.length;
      if (distance === 1) card.classList.add('is-right');
      else card.classList.add('is-left');
    });
  }

  function bindClassCarousel() {
    const cards = Array.from(document.querySelectorAll('.class-card'));
    const prev = document.querySelector('[data-class-prev]');
    const next = document.querySelector('[data-class-next]');
    if (!cards.length) return;

    cards.forEach((card, index) => {
      if (card.dataset.afterlifeClassFixBound === '1') return;
      card.dataset.afterlifeClassFixBound = '1';
      card.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        cards.forEach((item) => item.classList.remove('selected'));
        card.classList.add('selected');
        cards.forEach((item) => item.classList.add('side'));
        card.classList.remove('side');
        const label = card.dataset.class || card.querySelector('b')?.textContent || 'Sobrevivente';
        const readout = document.getElementById('classReadout');
        if (readout) readout.textContent = label;
        const indexOut = document.getElementById('classIndex');
        if (indexOut) indexOut.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
        syncClassPositions();
      }, true);
    });

    if (prev && prev.dataset.afterlifeClassFixBound !== '1') {
      prev.dataset.afterlifeClassFixBound = '1';
      prev.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = cards.findIndex((card) => card.classList.contains('selected'));
        const nextIndex = (current <= 0 ? cards.length - 1 : current - 1);
        cards[nextIndex].click();
      }, true);
    }
    if (next && next.dataset.afterlifeClassFixBound !== '1') {
      next.dataset.afterlifeClassFixBound = '1';
      next.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = cards.findIndex((card) => card.classList.contains('selected'));
        const nextIndex = (current + 1) % cards.length;
        cards[nextIndex].click();
      }, true);
    }
    cards.forEach((card) => card.classList.add('side'));
    cards.find((card) => card.classList.contains('selected'))?.classList.remove('side');
    syncClassPositions();
  }

  const boot = () => {
    mount();
    bindClassCarousel();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(STYLE_ID)) mount();
      bindClassCarousel();
      syncClassPositions();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();