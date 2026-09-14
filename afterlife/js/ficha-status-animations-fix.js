import './afterlife-sidebar.js?v=20260914-33';

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

/* Remove as setas antigas de navegação de etapa que ficavam sobre o carrossel de classes. */
.character-builder .carousel-window > .carousel-arrow{display:none!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;opacity:0!important}

/* Navegação principal: os controles ficam somente no rodapé e têm hierarquia visual clara. */
.character-builder .carousel-footer{position:relative!important;z-index:100!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin-top:12px!important;padding:10px 2px 2px!important}
.character-builder .carousel-dots{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:120px!important;min-height:20px!important;overflow:visible!important}
.character-builder .carousel-dots button{appearance:none!important;width:8px!important;height:8px!important;min-width:8px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#2b3a32!important;box-shadow:none!important;cursor:pointer!important;transition:width .28s ease,background .28s ease,box-shadow .28s ease,transform .28s ease!important}
.character-builder .carousel-dots button:hover{transform:scale(1.18)!important;background:#4a5f54!important}
.character-builder .carousel-dots button.is-active{width:28px!important;height:8px!important;border-radius:999px!important;background:#39f58a!important;box-shadow:0 0 16px rgba(57,245,138,.28)!important}
.character-builder .footer-actions{display:grid!important;grid-template-columns:minmax(112px,1fr) minmax(112px,1fr) minmax(165px,1.35fr)!important;gap:8px!important;align-items:stretch!important}
.character-builder .footer-actions .btn{appearance:none!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:46px!important;height:46px!important;padding:0 16px!important;border-radius:11px!important;text-decoration:none!important;font:800 10px/1 Inter,system-ui,sans-serif!important;letter-spacing:.2px!important;cursor:pointer!important;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease!important}
.character-builder .footer-actions .btn:hover{transform:translateY(-1px)!important}
.character-builder .footer-actions .btn:active{transform:translateY(1px) scale(.99)!important}
.character-builder .footer-actions .btn:disabled{opacity:.32!important;cursor:not-allowed!important;transform:none!important}
.character-builder .footer-actions .btn--ghost{border:1px solid rgba(127,160,145,.18)!important;background:rgba(8,15,11,.76)!important;color:#cbd7d0!important;box-shadow:inset 0 1px rgba(255,255,255,.02)!important}
.character-builder .footer-actions .btn--ghost:hover{border-color:rgba(57,245,138,.28)!important;background:rgba(9,21,14,.94)!important;color:#e9f4ee!important}
.character-builder .footer-actions .btn--primary{border:1px solid rgba(57,245,138,.45)!important;background:linear-gradient(135deg,#32e981,#58f7a1)!important;color:#03200f!important;box-shadow:0 8px 24px rgba(57,245,138,.12)!important}
.character-builder .footer-actions .btn--primary:hover{box-shadow:0 12px 30px rgba(57,245,138,.2)!important}

/* Carrossel de classes: sempre três cartas visíveis, com a selecionada no centro e as outras atrás. */
.character-builder .class-carousel-v4{position:relative!important;z-index:20!important;display:grid!important;grid-template-columns:48px minmax(0,1fr) 48px!important;align-items:center!important;gap:8px!important;margin-top:22px!important}
.character-builder .class-deck{position:relative!important;z-index:10!important;display:block!important;min-height:350px!important;margin:0!important;overflow:visible!important;perspective:1200px!important}
.character-builder .class-card{position:absolute!important;left:50%!important;top:22px!important;width:min(270px,70%)!important;min-height:270px!important;margin:0!important;transform-origin:center center!important;transition:transform .42s cubic-bezier(.22,.78,.2,1),opacity .32s ease,filter .32s ease,box-shadow .42s ease,border-color .32s ease!important;will-change:transform,opacity!important;cursor:pointer!important}
.character-builder .class-card.selected{display:flex!important;z-index:40!important;opacity:1!important;filter:none!important;transform:translateX(-50%) scale(1.04)!important;border-color:rgba(57,245,138,.42)!important;box-shadow:0 26px 65px rgba(0,0,0,.46),0 0 35px rgba(57,245,138,.08)!important}
.character-builder .class-card.side{display:flex!important;z-index:15!important;opacity:.56!important;filter:saturate(.68)!important}
.character-builder .class-card.is-left{transform:translateX(calc(-50% - 156px)) scale(.78)!important}
.character-builder .class-card.is-right{transform:translateX(calc(-50% + 156px)) scale(.78)!important}
.character-builder .class-card.is-left:hover,.character-builder .class-card.is-right:hover{opacity:.8!important;filter:saturate(.84)!important}
.character-builder .class-arrow{position:relative!important;z-index:70!important;width:46px!important;height:46px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid rgba(57,245,138,.28)!important;border-radius:50%!important;background:rgba(3,11,7,.95)!important;color:#edf8f2!important;font:400 30px/1 Inter,sans-serif!important;cursor:pointer!important;box-shadow:0 9px 26px rgba(0,0,0,.36)!important;transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease!important}
.character-builder .class-arrow:hover{transform:scale(1.08)!important;border-color:rgba(57,245,138,.58)!important;background:#081a10!important;box-shadow:0 12px 30px rgba(57,245,138,.08)!important}
.character-builder .class-arrow:active{transform:scale(.94)!important}
.character-builder .class-arrow--left{grid-column:1!important}
.character-builder .class-arrow--right{grid-column:3!important}

@keyframes afterlifeStatusOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes afterlifeHeartBeat{0%,100%{transform:scale(1)}12%{transform:scale(1.16)}24%{transform:scale(.96)}36%{transform:scale(1.10)}50%{transform:scale(1)}}

@media(max-width:980px){
  .character-builder .class-carousel-v4{grid-template-columns:46px minmax(0,1fr) 46px!important;gap:4px!important}
  .character-builder .class-deck{min-height:330px!important}
  .character-builder .class-card{width:68%!important;min-height:260px!important;top:22px!important}
  .character-builder .class-card.is-left{transform:translateX(calc(-50% - 118px)) scale(.62)!important}
  .character-builder .class-card.is-right{transform:translateX(calc(-50% + 118px)) scale(.62)!important}
  .character-builder .class-card.selected{transform:translateX(-50%) scale(.98)!important}
  .character-builder .class-arrow{width:40px!important;height:40px!important;font-size:27px!important}
}
@media(max-width:720px){
  .character-builder .carousel-footer{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
  .character-builder .carousel-dots{order:0;width:100%!important;min-width:0!important}
  .character-builder .footer-actions{width:100%!important;grid-template-columns:1fr 1fr!important}
  .character-builder .footer-actions .btn:last-child{grid-column:1/-1!important}
  .character-builder .class-deck{min-height:325px!important}
  .character-builder .class-card{width:62%!important;min-height:255px!important;top:20px!important}
  .character-builder .class-card.is-left{transform:translateX(calc(-50% - 106px)) scale(.58)!important;opacity:.42!important}
  .character-builder .class-card.is-right{transform:translateX(calc(-50% + 106px)) scale(.58)!important;opacity:.42!important}
  .character-builder .class-card.selected{transform:translateX(-50%) scale(.93)!important}
}
@media(max-width:420px){
  .character-builder .footer-actions .btn{min-height:44px!important;height:44px!important;padding:0 10px!important;font-size:9px!important}
  .character-builder .carousel-dots{gap:6px!important}
  .character-builder .carousel-dots button.is-active{width:24px!important}
  .character-builder .class-card{width:66%!important;min-height:245px!important}
  .character-builder .class-card.is-left{transform:translateX(calc(-50% - 91px)) scale(.51)!important}
  .character-builder .class-card.is-right{transform:translateX(calc(-50% + 91px)) scale(.51)!important}
  .character-builder .class-card.selected{transform:translateX(-50%) scale(.9)!important}
}
@media(prefers-reduced-motion:reduce){
  .character-builder .combat-status-ring::before,.character-builder .combat-status-card.hp .combat-status-icon,.character-builder .class-card{animation:none!important;transition:none!important}
}
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
      card.classList.add('side');
    });
    cards[current]?.classList.remove('side');
  }

  function bindClassCarousel() {
    const cards = Array.from(document.querySelectorAll('.class-card'));
    const prev = document.querySelector('[data-class-prev]');
    const next = document.querySelector('[data-class-next]');
    if (!cards.length) return;

    cards.forEach((card) => {
      if (card.dataset.afterlifeClassFixBound !== '1') {
        card.dataset.afterlifeClassFixBound = '1';
        card.addEventListener('click', () => {
          requestAnimationFrame(syncClassPositions);
          window.setTimeout(syncClassPositions, 60);
        }, { capture: true });
      }
    });

    if (prev && prev.dataset.afterlifeClassFixBound !== '1') {
      prev.dataset.afterlifeClassFixBound = '1';
      prev.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const current = cards.findIndex((card) => card.classList.contains('selected'));
        const target = cards[(current <= 0 ? cards.length - 1 : current - 1)];
        target?.click();
        syncClassPositions();
      }, true);
    }

    if (next && next.dataset.afterlifeClassFixBound !== '1') {
      next.dataset.afterlifeClassFixBound = '1';
      next.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const current = cards.findIndex((card) => card.classList.contains('selected'));
        const target = cards[(current + 1) % cards.length];
        target?.click();
        syncClassPositions();
      }, true);
    }

    syncClassPositions();
  }

  function neutralizeOldStepArrows() {
    ['prevStep', 'nextStep'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('aria-hidden', 'true');
      el.tabIndex = -1;
      el.disabled = true;
    });
  }

  const boot = () => {
    mount();
    neutralizeOldStepArrows();
    bindClassCarousel();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(STYLE_ID)) mount();
      neutralizeOldStepArrows();
      bindClassCarousel();
      syncClassPositions();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();