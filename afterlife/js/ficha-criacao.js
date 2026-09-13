(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const slides = [...document.querySelectorAll('.builder-slide')];
  const steps = [...document.querySelectorAll('.builder-step')];
  const dots = $('carouselDots');
  const track = $('carouselTrack');
  let index = 0;
  let originIndex = 0;
  let touchX = null;
  let touchY = null;
  const origins = [...document.querySelectorAll('.origin-card')];

  const countries = [
    ['BR','Brasil','🇧🇷','Preset tropical/urbano · ajuste manual disponível.'],
    ['JP','Japão','🇯🇵','Preset japonês · cabelo e olhos podem ser ajustados manualmente.'],
    ['KR','Coreia do Sul','🇰🇷','Preset coreano · use como referência visual, não como bloqueio.'],
    ['CN','China','🇨🇳','Preset chinês · personalização manual permanece livre.'],
    ['US','Estados Unidos','🇺🇸','Preset urbano ocidental · personalização manual permanece livre.'],
    ['CA','Canadá','🇨🇦','Preset norte-americano · personalização manual permanece livre.'],
    ['MX','México','🇲🇽','Preset latino · personalização manual permanece livre.'],
    ['AR','Argentina','🇦🇷','Preset sul-americano · personalização manual permanece livre.'],
    ['GB','Reino Unido','🇬🇧','Preset europeu · personalização manual permanece livre.'],
    ['FR','França','🇫🇷','Preset europeu · personalização manual permanece livre.'],
    ['DE','Alemanha','🇩🇪','Preset europeu · personalização manual permanece livre.'],
    ['IT','Itália','🇮🇹','Preset europeu · personalização manual permanece livre.'],
    ['ES','Espanha','🇪🇸','Preset europeu · personalização manual permanece livre.'],
    ['PT','Portugal','🇵🇹','Preset europeu · personalização manual permanece livre.'],
    ['IN','Índia','🇮🇳','Preset sul-asiático · personalização manual permanece livre.'],
    ['AU','Austrália','🇦🇺','Preset oceânico · personalização manual permanece livre.'],
    ['ZA','África do Sul','🇿🇦','Preset africano · personalização manual permanece livre.'],
    ['EG','Egito','🇪🇬','Preset norte-africano · personalização manual permanece livre.']
  ];

  const attrs = {
    forca: 8,
    agilidade: 8,
    vigor: 8,
    percepcao: 8,
    mente: 8,
    vontade: 8
  };
  const BASE_ATTRIBUTE = 8;
  const MAX_ATTRIBUTE = 15;
  const STARTING_POINTS = 12;

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

  function updatePreviewSub() {
    const origin = $('originReadout')?.textContent || 'Humano';
    const cls = $('classReadout')?.textContent || 'Sobrevivente';
    $('previewSub').textContent = `${origin} · ${cls}`;
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
    requestAnimationFrame(() => track?.focus({ preventScroll: true }));
  }

  function populateCountries() {
    const select = $('countryOrigin');
    if (!select) return;
    select.replaceChildren();
    countries.forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = 'BR';
    updateCountryPreset();
  }

  function applyCountryVisualPreset(code) {
    const map = {
      JP: { hair: 'Preto', eyes: 'Castanhos', shape: 'Amendoado', skin: 'Bege' },
      KR: { hair: 'Preto', eyes: 'Castanhos', shape: 'Amendoado', skin: 'Bege' },
      CN: { hair: 'Preto', eyes: 'Castanhos', shape: 'Amendoado', skin: 'Bege' },
      BR: { hair: 'Castanho', eyes: 'Castanhos', shape: 'Natural', skin: 'Moreno' },
      PT: { hair: 'Castanho', eyes: 'Castanhos', shape: 'Natural', skin: 'Claro' }
    };
    const preset = map[code];
    if (!preset) return;
    ['appearanceHair','appearanceEyes','appearanceEyeShape','appearanceSkin'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      const value = preset[{appearanceHair:'hair',appearanceEyes:'eyes',appearanceEyeShape:'shape',appearanceSkin:'skin'}[id]];
      if ([...el.options].some(o => o.value === value || o.textContent === value)) el.value = value;
    });
  }

  function updateCountryPreset() {
    const code = $('countryOrigin')?.value || 'BR';
    const row = countries.find(x => x[0] === code) || countries[0];
    $('countryFlag').textContent = row[2];
    $('countryName').textContent = row[1];
    $('countryHint').textContent = row[3];
    $('appearancePresetTitle').textContent = `Preset de origem · ${row[1]}`;
    $('appearancePresetText').textContent = row[3];
    applyCountryVisualPreset(code);
  }

  function setOrigin(i) {
    if (!origins.length) return;
    originIndex = Math.max(0, Math.min(i, origins.length - 1));
    origins.forEach((card, n) => card.classList.toggle('is-selected', n === originIndex));
    const selected = origins[originIndex];
    $('originReadout').textContent = selected.dataset.value;
    $('originDescription').textContent = selected.querySelector('small')?.textContent || '';
    updatePreviewSub();
  }

  function selectClassCard(card) {
    document.querySelectorAll('.class-card').forEach((x) => x.classList.remove('selected'));
    card.classList.add('selected');
    $('classReadout').textContent = card.dataset.class || card.querySelector('b')?.textContent || 'Sobrevivente';
    updatePreviewSub();
  }

  function moveClass(direction) {
    const cards = [...document.querySelectorAll('.class-card')];
    if (!cards.length) return;
    let current = cards.findIndex(card => card.classList.contains('selected'));
    if (current < 0) current = 0;
    current = (current + direction + cards.length) % cards.length;
    selectClassCard(cards[current]);
    $('classIndex').textContent = `${current + 1} / ${cards.length}`;
    cards.forEach((card, i) => card.classList.toggle('side', i !== current));
    cards[current].classList.remove('side');
  }

  function renderAttributes() {
    const totalSpent = Object.values(attrs).reduce((sum, value) => sum + (value - BASE_ATTRIBUTE), 0);
    const remaining = Math.max(0, STARTING_POINTS - totalSpent);
    $('pointsRemaining').textContent = remaining;
    Object.entries(attrs).forEach(([key, value]) => {
      const box = document.querySelector(`[data-attr="${key}"]`);
      if (!box) return;
      box.querySelector('strong').textContent = value;
      const fill = box.querySelector('em');
      if (fill) fill.style.width = `${Math.round((value / MAX_ATTRIBUTE) * 100)}%`;
      const minus = box.querySelector(`[data-minus="${key}"]`);
      const plus = box.querySelector(`[data-plus="${key}"]`);
      if (minus) minus.disabled = value <= BASE_ATTRIBUTE;
      if (plus) plus.disabled = value >= MAX_ATTRIBUTE || remaining <= 0;
    });
  }

  function changeAttribute(key, delta) {
    if (!(key in attrs)) return;
    const totalSpent = Object.values(attrs).reduce((sum, value) => sum + (value - BASE_ATTRIBUTE), 0);
    const remaining = STARTING_POINTS - totalSpent;
    if (delta > 0 && (attrs[key] >= MAX_ATTRIBUTE || remaining <= 0)) return;
    if (delta < 0 && attrs[key] <= BASE_ATTRIBUTE) return;
    attrs[key] += delta;
    renderAttributes();
  }

  function handleImage(file) {
    const MAX_SIZE = 5 * 1024 * 1024;
    const types = new Set(['image/jpeg','image/png','image/webp','image/gif']);
    if (!file || !types.has(file.type)) return alert('Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF.');
    if (file.size > MAX_SIZE) return alert('A imagem precisa ter no máximo 5 MB.');
    const url = URL.createObjectURL(file);
    const preview = $('portraitImg');
    const empty = $('portraitEmpty');
    preview.src = url;
    preview.hidden = false;
    empty.hidden = true;
    $('removeCharacterImage').hidden = false;
    const top = $('previewAvatar');
    top.src = url;
    top.hidden = false;
    $('previewPlaceholder').hidden = true;
  }

  steps.forEach((step) => step.addEventListener('click', () => goTo(Number(step.dataset.step))));
  $('prevStep').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(index - 1); });
  $('nextStep').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(index + 1); });
  $('backStep').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); goTo(index - 1); });
  $('nextAction').addEventListener('click', () => {
    if (index < slides.length - 1) goTo(index + 1);
    else $('nextAction').textContent = 'FICHA PREPARADA ✓';
  });

  $('characterName').addEventListener('input', (e) => { $('previewName').textContent = e.target.value.trim() || 'Sem nome'; });
  $('characterGender').addEventListener('change', updatePreviewSub);
  $('countryOrigin')?.addEventListener('change', updateCountryPreset);

  origins.forEach((card, i) => card.addEventListener('click', () => setOrigin(i)));

  document.querySelectorAll('.class-card').forEach((card) => card.addEventListener('click', () => selectClassCard(card)));
  document.querySelectorAll('[data-class-prev]').forEach(btn => btn.addEventListener('click', () => moveClass(-1)));
  document.querySelectorAll('[data-class-next]').forEach(btn => btn.addEventListener('click', () => moveClass(1)));

  document.querySelectorAll('[data-plus]').forEach(button => button.addEventListener('click', () => changeAttribute(button.dataset.plus, 1)));
  document.querySelectorAll('[data-minus]').forEach(button => button.addEventListener('click', () => changeAttribute(button.dataset.minus, -1)));

  $('uploadCharacterImage')?.addEventListener('click', () => $('characterImageFile')?.click());
  $('characterImageFile')?.addEventListener('change', (event) => handleImage(event.target.files?.[0]));
  $('removeCharacterImage')?.addEventListener('click', () => {
    const preview = $('portraitImg');
    if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
    preview.src = '';
    preview.hidden = true;
    $('portraitEmpty').hidden = false;
    $('removeCharacterImage').hidden = true;
    $('previewAvatar').src = '';
    $('previewAvatar').hidden = true;
    $('previewPlaceholder').hidden = false;
  });

  document.addEventListener('keydown', (event) => {
    if (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowRight') goTo(index + 1);
    if (event.key === 'ArrowLeft') goTo(index - 1);
  });

  track?.addEventListener('pointerdown', (event) => { touchX = event.clientX; touchY = event.clientY; });
  track?.addEventListener('pointerup', (event) => {
    if (touchX === null || touchY === null) return;
    const dx = event.clientX - touchX;
    const dy = event.clientY - touchY;
    touchX = null; touchY = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    goTo(index + (dx < 0 ? 1 : -1));
  });

  document.querySelectorAll('.field-grid input,.field-grid select').forEach((el) => el.addEventListener('focus', () => el.closest('label')?.classList.add('is-focused')));

  populateCountries();
  setOrigin(0);
  updatePreviewSub();
  renderAttributes();
  moveClass(0);
  goTo(0);
})();