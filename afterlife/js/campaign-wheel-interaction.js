(() => {
  'use strict';
  if (window.__afterlifeCampaignWheelBooted) return;
  window.__afterlifeCampaignWheelBooted = true;

  function boot() {
    const wheel = document.getElementById('nuclearWheel');
    const center = document.getElementById('nuclearCenter');
    if (!wheel || !center) return;

    let orbit = wheel.querySelector('.nuclear-wheel__orbit');
    if (!orbit) {
      orbit = document.createElement('div');
      orbit.className = 'nuclear-wheel__orbit';
      wheel.querySelectorAll('.nuclear-item').forEach((item, index) => {
        item.style.setProperty('--item-angle', `${index * 60}deg`);
        orbit.appendChild(item);
      });
      wheel.insertBefore(orbit, center);
    }

    if (wheel.querySelector('.nuclear-wheel__backdrop')) return;
    const backdrop = document.createElement('button');
    backdrop.className = 'nuclear-wheel__backdrop';
    backdrop.type = 'button';
    backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', 'Fechar ferramentas rápidas');
    document.body.appendChild(backdrop);

    let open = false;
    let dragging = false;
    let moved = false;
    let pointerId = null;
    let startAngle = 0;
    let rotation = 0;
    let lastAngle = 0;
    let velocity = 0;
    let animationFrame = 0;

    const normalizeDelta = (value) => {
      let delta = value;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      return delta;
    };
    const angleFor = (event) => {
      const rect = wheel.getBoundingClientRect();
      return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
    };
    const setRotation = (value, animate = false) => {
      rotation = value;
      wheel.style.setProperty('--wheel-rotation', `${rotation}deg`);
      wheel.classList.toggle('is-settling', animate);
    };
    const lock = () => document.body.classList.add('afterlife-wheel-lock');
    const unlock = () => document.body.classList.remove('afterlife-wheel-lock');
    const stopMomentum = () => { if (animationFrame) cancelAnimationFrame(animationFrame); animationFrame = 0; };

    const openWheel = () => {
      open = true;
      wheel.classList.add('is-open');
      wheel.setAttribute('aria-expanded', 'true');
      backdrop.classList.add('is-visible');
      lock();
      center.focus({ preventScroll:true });
    };
    const closeWheel = () => {
      stopMomentum();
      open = false;
      dragging = false;
      moved = false;
      wheel.classList.remove('is-open','is-dragging','is-settling');
      wheel.setAttribute('aria-expanded', 'false');
      backdrop.classList.remove('is-visible');
      unlock();
    };

    center.addEventListener('click', (event) => {
      event.preventDefault();
      if (open) closeWheel(); else openWheel();
    });
    backdrop.addEventListener('click', closeWheel);

    wheel.addEventListener('pointerdown', (event) => {
      if (!open) return;
      if (event.target.closest('.nuclear-item')) return;
      stopMomentum();
      pointerId = event.pointerId;
      dragging = true;
      moved = false;
      startAngle = angleFor(event);
      lastAngle = startAngle;
      velocity = 0;
      wheel.classList.add('is-dragging');
      wheel.setPointerCapture?.(pointerId);
    });

    wheel.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const angle = angleFor(event);
      const delta = normalizeDelta(angle - lastAngle);
      if (Math.abs(angle - startAngle) > 5) moved = true;
      rotation += delta;
      velocity = delta;
      lastAngle = angle;
      setRotation(rotation);
      event.preventDefault();
    }, { passive:false });

    const release = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      try { wheel.releasePointerCapture?.(pointerId); } catch {}
      dragging = false;
      pointerId = null;
      wheel.classList.remove('is-dragging');
      if (Math.abs(velocity) > .35) {
        const animateMomentum = () => {
          velocity *= .93;
          rotation += velocity;
          setRotation(rotation);
          if (Math.abs(velocity) > .05 && open) animationFrame = requestAnimationFrame(animateMomentum);
          else animationFrame = 0;
        };
        animationFrame = requestAnimationFrame(animateMomentum);
      }
      setTimeout(() => { moved = false; }, 80);
    };

    wheel.addEventListener('pointerup', release);
    wheel.addEventListener('pointercancel', release);
    wheel.addEventListener('lostpointercapture', () => { dragging = false; pointerId = null; wheel.classList.remove('is-dragging'); });

    wheel.querySelectorAll('.nuclear-item').forEach((item) => {
      item.addEventListener('pointerup', (event) => { if (moved) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
      item.addEventListener('click', () => { if (open && !moved) closeWheel(); });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && open) { event.preventDefault(); closeWheel(); }
    });
    window.addEventListener('pagehide', closeWheel, { once:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
