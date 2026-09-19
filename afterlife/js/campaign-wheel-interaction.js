(() => {
  'use strict';
  if (window.__afterlifeCampaignWheelBooted) return;
  window.__afterlifeCampaignWheelBooted = true;

  function boot() {
    const wheel = document.getElementById('nuclearWheel');
    const center = document.getElementById('nuclearCenter');
    if (!wheel || !center) return;

    wheel.dataset.controller = 'campaign-wheel-interaction';

    let orbit = wheel.querySelector('.nuclear-wheel__orbit');
    if (!orbit) {
      orbit = document.createElement('div');
      orbit.className = 'nuclear-wheel__orbit';
      wheel.querySelectorAll('.nuclear-item').forEach((item) => orbit.appendChild(item));
      wheel.insertBefore(orbit, center);
    }

    const items = [...orbit.querySelectorAll('.nuclear-item')];

    // AERION-style radial layout: one fixed pivot in the lower-right corner,
    // with every action distributed only through the visible upper-left arc.
    // The previous -160..-10 range was mathematically wrong for the CSS
    // translateY-based orbit and pushed several actions below/off-screen.
    const angles = [-82, -66, -50, -34, -18, -2];
    items.forEach((item, index) => {
      item.style.setProperty('--item-angle', `${angles[index] ?? -2}deg`);
    });

    let backdrop = document.querySelector('.nuclear-wheel__backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.className = 'nuclear-wheel__backdrop';
      backdrop.type = 'button';
      backdrop.tabIndex = -1;
      backdrop.setAttribute('aria-label', 'Fechar ferramentas rápidas');
      document.body.appendChild(backdrop);
    }

    let open = false;
    let dragging = false;
    let moved = false;
    let pointerId = null;
    let rotation = 0;
    let lastAngle = 0;
    let velocity = 0;
    let animationFrame = 0;

    // Keep the whole fan inside the visible upper-left quadrant. A small
    // rotation range preserves the AERION-style draggable feel without ever
    // throwing an item behind the viewport edge.
    const MIN_ROTATION = -8;
    const MAX_ROTATION = 8;

    const normalizeDelta = (value) => {
      let delta = value;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      return delta;
    };

    const angleFor = (event) => {
      const rect = wheel.getBoundingClientRect();
      return Math.atan2(event.clientY - rect.bottom, event.clientX - rect.right) * 180 / Math.PI;
    };

    const clampRotation = (value) => Math.max(MIN_ROTATION, Math.min(MAX_ROTATION, value));
    const setRotation = (value) => {
      rotation = clampRotation(value);
      wheel.style.setProperty('--wheel-rotation', `${rotation}deg`);
    };

    const lock = () => {
      document.body.classList.add('afterlife-wheel-lock');
      document.documentElement.classList.add('afterlife-wheel-lock');
    };
    const unlock = () => {
      document.body.classList.remove('afterlife-wheel-lock');
      document.documentElement.classList.remove('afterlife-wheel-lock');
    };
    const stopMomentum = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const openWheel = () => {
      stopMomentum();
      open = true;
      wheel.classList.add('is-open');
      wheel.setAttribute('aria-expanded', 'true');
      backdrop.classList.add('is-visible');
      lock();
      setRotation(rotation);
    };

    const closeWheel = () => {
      stopMomentum();
      open = false;
      dragging = false;
      moved = false;
      pointerId = null;
      wheel.classList.remove('is-open', 'is-dragging', 'is-settling');
      wheel.setAttribute('aria-expanded', 'false');
      backdrop.classList.remove('is-visible');
      unlock();
    };

    center.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (open) closeWheel();
      else openWheel();
    });

    backdrop.addEventListener('click', closeWheel);

    wheel.addEventListener('pointerdown', (event) => {
      if (!open) return;
      if (event.target.closest('.nuclear-item') || event.target === center) return;

      stopMomentum();
      pointerId = event.pointerId;
      dragging = true;
      moved = false;
      lastAngle = angleFor(event);
      velocity = 0;
      wheel.classList.add('is-dragging');
      try { wheel.setPointerCapture(pointerId); } catch {}
      event.preventDefault();
    }, { passive: false });

    wheel.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const angle = angleFor(event);
      const delta = normalizeDelta(angle - lastAngle);
      if (Math.abs(delta) > 0.1) moved = true;

      const next = clampRotation(rotation + delta);
      velocity = next - rotation;
      setRotation(next);
      lastAngle = angle;
      event.preventDefault();
    }, { passive: false });

    const release = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      try { wheel.releasePointerCapture(pointerId); } catch {}
      dragging = false;
      pointerId = null;
      wheel.classList.remove('is-dragging');

      if (Math.abs(velocity) > 0.35 && rotation > MIN_ROTATION && rotation < MAX_ROTATION) {
        const animateMomentum = () => {
          velocity *= 0.90;
          const next = clampRotation(rotation + velocity);
          setRotation(next);
          if (Math.abs(velocity) > 0.05 && rotation > MIN_ROTATION && rotation < MAX_ROTATION && open) {
            animationFrame = requestAnimationFrame(animateMomentum);
          } else {
            animationFrame = 0;
          }
        };
        animationFrame = requestAnimationFrame(animateMomentum);
      }

      setTimeout(() => { moved = false; }, 90);
    };

    wheel.addEventListener('pointerup', release);
    wheel.addEventListener('pointercancel', release);
    wheel.addEventListener('lostpointercapture', () => {
      dragging = false;
      pointerId = null;
      wheel.classList.remove('is-dragging');
    });

    items.forEach((item) => {
      item.addEventListener('pointerup', (event) => {
        if (moved) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);

      item.addEventListener('click', (event) => {
        if (!open || moved) return;
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
            return;
          }
          location.href = target;
        });
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeWheel();
      }
    });

    window.addEventListener('pagehide', closeWheel, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
