(() => {
  'use strict';

  if (window.__afterlifeCampaignWheelBooted) return;
  window.__afterlifeCampaignWheelBooted = true;

  const boot = () => {
    const wheel = document.getElementById('nuclearWheel');
    const center = document.getElementById('nuclearCenter');
    if (!wheel || !center) return;

    const orbit = wheel.querySelector('.nuclear-wheel__orbit') || (() => {
      const node = document.createElement('div');
      node.className = 'nuclear-wheel__orbit';
      wheel.querySelectorAll('.nuclear-item').forEach((item) => node.appendChild(item));
      wheel.insertBefore(node, center);
      return node;
    })();

    const items = [...orbit.querySelectorAll('.nuclear-item')];
    const fanAngles = [0, 18, 36, 54, 72, 90];
    let radius = 112;
    let rotation = 0;
    let open = false;
    let dragging = false;
    let moved = false;
    let pointerId = null;
    let lastPointerAngle = 0;
    let velocity = 0;
    let momentumFrame = 0;

    const backdrop = document.querySelector('.nuclear-wheel__backdrop') || (() => {
      const node = document.createElement('button');
      node.className = 'nuclear-wheel__backdrop';
      node.type = 'button';
      node.setAttribute('aria-label', 'Fechar ferramentas rápidas');
      node.tabIndex = -1;
      document.body.appendChild(node);
      return node;
    })();

    const setRadius = () => {
      const width = window.innerWidth;
      radius = width <= 390 ? 88 : width <= 620 ? 96 : 112;
      wheel.style.setProperty('--wheel-radius', `${radius}px`);
      wheel.style.setProperty('--wheel-size', `${Math.ceil(radius + 62)}px`);
    };

    const clamp = (value) => Math.max(-12, Math.min(12, value));

    const applyRotation = (value) => {
      rotation = clamp(value);
      wheel.style.setProperty('--wheel-rotation', `${rotation}deg`);
    };

    const stopMomentum = () => {
      if (momentumFrame) cancelAnimationFrame(momentumFrame);
      momentumFrame = 0;
    };

    const lockPage = () => {
      document.documentElement.classList.add('afterlife-wheel-lock');
      document.body.classList.add('afterlife-wheel-lock');
    };

    const unlockPage = () => {
      document.documentElement.classList.remove('afterlife-wheel-lock');
      document.body.classList.remove('afterlife-wheel-lock');
    };

    const openWheel = () => {
      stopMomentum();
      setRadius();
      applyRotation(0);
      open = true;
      wheel.classList.add('is-open');
      wheel.setAttribute('aria-expanded', 'true');
      backdrop.classList.add('is-visible');
      lockPage();
    };

    const closeWheel = () => {
      stopMomentum();
      open = false;
      dragging = false;
      moved = false;
      pointerId = null;
      applyRotation(0);
      wheel.classList.remove('is-open', 'is-dragging');
      wheel.setAttribute('aria-expanded', 'false');
      backdrop.classList.remove('is-visible');
      unlockPage();
    };

    const pointerAngle = (event) => {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.right;
      const cy = rect.bottom;
      return Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI;
    };

    const normalizeDelta = (delta) => {
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      return delta;
    };

    center.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      open ? closeWheel() : openWheel();
    });

    backdrop.addEventListener('click', closeWheel);

    wheel.addEventListener('pointerdown', (event) => {
      if (!open || event.target === center) return;
      stopMomentum();
      pointerId = event.pointerId;
      dragging = true;
      moved = false;
      velocity = 0;
      lastPointerAngle = pointerAngle(event);
      wheel.classList.add('is-dragging');
      try { wheel.setPointerCapture(pointerId); } catch {}
      event.preventDefault();
    }, { passive: false });

    wheel.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const current = pointerAngle(event);
      const delta = normalizeDelta(current - lastPointerAngle);
      if (Math.abs(delta) >= 1.5) moved = true;
      if (Math.abs(delta) < 0.01) return;
      const next = clamp(rotation + delta);
      velocity = next - rotation;
      applyRotation(next);
      lastPointerAngle = current;
      event.preventDefault();
    }, { passive: false });

    const releasePointer = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      try { wheel.releasePointerCapture(pointerId); } catch {}
      dragging = false;
      pointerId = null;
      wheel.classList.remove('is-dragging');

      if (Math.abs(velocity) > 0.35 && rotation > -12 && rotation < 12) {
        const tick = () => {
          velocity *= 0.82;
          const next = clamp(rotation + velocity);
          applyRotation(next);
          if (open && Math.abs(velocity) > 0.05 && rotation > -12 && rotation < 12) {
            momentumFrame = requestAnimationFrame(tick);
          } else {
            momentumFrame = 0;
          }
        };
        momentumFrame = requestAnimationFrame(tick);
      }

      window.setTimeout(() => { moved = false; }, 100);
    };

    wheel.addEventListener('pointerup', releasePointer);
    wheel.addEventListener('pointercancel', releasePointer);
    wheel.addEventListener('lostpointercapture', () => {
      dragging = false;
      pointerId = null;
      wheel.classList.remove('is-dragging');
    });

    items.forEach((item, index) => {
      item.style.setProperty('--fan-angle', `${fanAngles[index] ?? 0}deg`);

      item.addEventListener('click', (event) => {
        if (!open || moved) {
          if (moved) {
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        const target = item.dataset.target || '';
        closeWheel();

        requestAnimationFrame(() => {
          if (!target) return;
          if (target.startsWith('#')) {
            const section = document.querySelector(target);
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else location.hash = target.slice(1);
          } else {
            location.href = target;
          }
        });
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeWheel();
      }
    });

    window.addEventListener('resize', setRadius, { passive: true });
    window.addEventListener('pagehide', closeWheel, { once: true });
    setRadius();
    applyRotation(0);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
