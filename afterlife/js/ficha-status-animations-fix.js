import './afterlife-sidebar.js?v=20260913-3';

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
@keyframes afterlifeStatusOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes afterlifeHeartBeat{0%,100%{transform:scale(1)}12%{transform:scale(1.16)}24%{transform:scale(.96)}36%{transform:scale(1.10)}50%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.character-builder .combat-status-ring::before,.character-builder .combat-status-card.hp .combat-status-icon{animation:none!important}}
`;

  const mount = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  };

  const boot = () => {
    mount();
    const observer = new MutationObserver(() => {
      if (document.getElementById(STYLE_ID)) {
        observer.disconnect();
        return;
      }
      if (document.querySelector('.character-builder .combat-status-ring')) mount();
    });
    observer.observe(document.head, { childList: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
