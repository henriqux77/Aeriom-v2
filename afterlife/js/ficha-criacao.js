(() => {
  const $ = (id) => document.getElementById(id);
  const slides = [...document.querySelectorAll('.builder-slide')];
  const steps = [...document.querySelectorAll('.builder-step')];
  const dots = $('carouselDots');
  let index = 0;
  let originIndex = 0;
  const origins = [...document.querySelectorAll('.origin-card')];

  function renderDots() {
    dots.replaceChildren();
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === index ? 'is-active' : '';
      b.setAttribute('aria-label', `Ir para etapa ${i + 1}`);
      b.addEventListener('click', () => goTo(i));
      dots.appendChild(b);
    });
  }

  function goTo(next) {
    index = Math.max(0, Math.min(next, slides.length - 1));
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index);
      step.classList.toggle('is-complete', i < index);
    });
    $('stepCount').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    $('progressBar').style.width = `${((index + 1) / slides.length) * 100}%`;
    $('prevStep').disabled = index === 0;
    $('backStep').disabled = index === 0;
    $('nextAction').textContent = index === slides.length - 1 ? 'FINALIZAR FICHA →' : 'CONTINUAR →';
    renderDots();
    const active = slides[index];
    active?.querySelector('input,select,textarea,button')?.focus({preventScroll:true});
  }

  steps.forEach((step) => step.addEventListener('click', () => goTo(Number(step.dataset.step))));
  $('prevStep').addEventListener('click', () => goTo(index - 1));
  $('backStep').addEventListener('click', () => goTo(index - 1));
  $('nextAction').addEventListener('click', () => {
    if (index < slides.length - 1) goTo(index + 1);
    else $('nextAction').textContent = 'FICHA PREPARADA ✓';
  });

  $('characterName').addEventListener('input', (e) => {
    $('previewName').textContent = e.target.value.trim() || 'Sem nome';
  });
  $('characterGender').addEventListener('change', (e) => {
    $('previewSub').textContent = `${e.target.value} · ${$('classReadout').textContent || 'Sobrevivente'}`;
  });

  function setOrigin(i) {
    originIndex = (i + origins.length) % origins.length;
    origins.forEach((card, n) => card.classList.toggle('is-selected', n === originIndex));
    const selected = origins[originIndex];
    $('originReadout').textContent = selected.dataset.value;
    $('originDescription').textContent = selected.querySelector('small')?.textContent || '';
    $('previewSub').textContent = `${selected.dataset.value} · ${$('classReadout').textContent || 'Sobrevivente'}`;
  }
  origins.forEach((card, i) => card.addEventListener('click', () => setOrigin(i)));
  document.querySelectorAll('[data-origin]').forEach((button) => button.addEventListener('click', () => setOrigin(originIndex + (button.dataset.origin === 'next' ? 1 : -1))));

  document.querySelectorAll('.class-card').forEach((card) => card.addEventListener('click', () => {
    document.querySelectorAll('.class-card').forEach((x) => x.classList.remove('selected'));
    card.classList.add('selected');
    $('classReadout').textContent = card.querySelector('b')?.textContent || 'Sobrevivente';
    $('previewSub').textContent = `${$('originReadout').textContent || 'Humano'} · ${$('classReadout').textContent}`;
  }));

  document.addEventListener('keydown', (event) => {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowRight') goTo(index + 1);
    if (event.key === 'ArrowLeft') goTo(index - 1);
  });

  let touchX = null;
  const track = $('carouselTrack');
  track.addEventListener('pointerdown', (e) => { touchX = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (touchX === null) return;
    const dx = e.clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 55) return;
    goTo(index + (dx < 0 ? 1 : -1));
  });

  document.querySelectorAll('.field-grid input,.field-grid select').forEach((el) => el.addEventListener('focus', () => {
    el.closest('label')?.classList.add('is-focused');
  }));

  goTo(0);
})();