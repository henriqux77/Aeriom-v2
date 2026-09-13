import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const slides = [...document.querySelectorAll('.builder-slide')];
  const steps = [...document.querySelectorAll('.builder-step')];
  const dots = $('carouselDots');
  const track = $('carouselTrack');
  const AERIOM_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
  const AERIOM_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const aeriom = createClient(AERIOM_URL, AERIOM_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  let index = 0;
  let classIndex = 1;
  let touchX = null;
  let touchY = null;
  let previewObjectUrl = null;

  const countries = [
    ['BR','Brasil','🇧🇷','Preset tropical/urbano · ajuste manual disponível.'],
    ['JP','Japão','🇯🇵','Preset japonês · referência visual de cabelo, olhos e estilo.'],
    ['KR','Coreia do Sul','🇰🇷','Preset coreano · referência visual ajustável.'],
    ['CN','China','🇨🇳','Preset chinês · referência visual ajustável.'],
    ['US','Estados Unidos','🇺🇸','Preset urbano ocidental · referência visual ajustável.'],
    ['CA','Canadá','🇨🇦','Preset norte-americano · referência visual ajustável.'],
    ['MX','México','🇲🇽','Preset latino · referência visual ajustável.'],
    ['AR','Argentina','🇦🇷','Preset sul-americano · referência visual ajustável.'],
    ['GB','Reino Unido','🇬🇧','Preset europeu · referência visual ajustável.'],
    ['FR','França','🇫🇷','Preset europeu · referência visual ajustável.'],
    ['DE','Alemanha','🇩🇪','Preset europeu · referência visual ajustável.'],
    ['IT','Itália','🇮🇹','Preset europeu · referência visual ajustável.'],
    ['ES','Espanha','🇪🇸','Preset europeu · referência visual ajustável.'],
    ['PT','Portugal','🇵🇹','Preset europeu · referência visual ajustável.'],
    ['IN','Índia','🇮🇳','Preset sul-asiático · referência visual ajustável.'],
    ['AU','Austrália','🇦🇺','Preset oceânico · referência visual ajustável.'],
    ['ZA','África do Sul','🇿🇦','Preset africano · referência visual ajustável.'],
    ['EG','Egito','🇪🇬','Preset norte-africano · referência visual ajustável.']
  ];

  const attrs = { forca: 8, agilidade: 8, vigor: 8, percepcao: 8, mente: 8, vontade: 8 };
  const BASE_ATTRIBUTE = 8;
  const MAX_ATTRIBUTE = 15;
  const STARTING_POINTS = 12;

  function renderDots() {
    dots?.replaceChildren();
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === index ? 'is-active' : '';
      b.setAttribute('aria-label', `Ir para etapa ${i + 1}`);
      b.addEventListener('click', () => goTo(i));
      dots?.appendChild(b);
    });
  }

  function updatePreviewSub() {
    const cls = $('classReadout')?.textContent || 'Sobrevivente';
    const country = $('countryName')?.textContent || 'Brasil';
    if ($('previewSub')) $('previewSub').textContent = `Humano · ${cls} · ${country}`;
  }

  function updateStepStatus() {
    const labels = ['IDENTIDADE','ORIGEM','APARÊNCIA','CLASSE','ATRIBUTOS','CONCEITO','REVISÃO FINAL'];
    if ($('stepStatusLabel')) $('stepStatusLabel').textContent = labels[index] || 'CONFIGURAÇÃO';
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
    $('nextStep').disabled = index === slides.length - 1;
    $('nextAction').textContent = index === slides.length - 1 ? 'FINALIZAR FICHA ✓' : 'CONTINUAR →';
    updateStepStatus();
    renderDots();
    renderFinalReview();
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
      JP: { hair: 'Preto', eyes: 'Castanhos', shape: 'Amendoado' },
      KR: { hair: 'Preto', eyes: 'Castanhos', shape: 'Amendoado' },
      CN: { hair: 'Preto', eyes: 'Castanhos', shape: 'Amendoado' },
      BR: { hair: 'Castanho', eyes: 'Castanhos', shape: 'Natural' },
      PT: { hair: 'Castanho', eyes: 'Castanhos', shape: 'Natural' }
    };
    const preset = map[code];
    if (!preset) return;
    const fields = { appearanceHair: preset.hair, appearanceEyes: preset.eyes, appearanceEyeShape: preset.shape };
    Object.entries(fields).forEach(([id, value]) => {
      const el = $(id);
      if (el && [...el.options].some(o => o.value === value || o.textContent === value)) el.value = value;
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
    updatePreviewSub();
    renderFinalReview();
  }

  function selectClassCard(card) {
    const cards = [...document.querySelectorAll('.class-card')];
    const selected = cards.indexOf(card);
    cards.forEach((x, i) => x.classList.toggle('selected', i === selected));
    cards.forEach((x, i) => x.classList.toggle('side', i !== selected));
    if (cards[selected]) {
      cards[selected].classList.remove('side');
      classIndex = selected;
      $('classReadout').textContent = cards[selected].dataset.class || cards[selected].querySelector('b')?.textContent || 'Sobrevivente';
      $('classIndex').textContent = `${selected + 1} / ${cards.length}`;
    }
    updatePreviewSub();
    renderFinalReview();
  }

  function moveClass(direction) {
    const cards = [...document.querySelectorAll('.class-card')];
    if (!cards.length) return;
    let current = cards.findIndex(card => card.classList.contains('selected'));
    if (current < 0) current = classIndex;
    current = (current + direction + cards.length) % cards.length;
    selectClassCard(cards[current]);
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
    updateLiveStats();
    renderFinalReview();
  }

  function changeAttribute(key, delta) {
    if (!(key in attrs)) return;
    const spent = Object.values(attrs).reduce((sum, value) => sum + (value - BASE_ATTRIBUTE), 0);
    const remaining = STARTING_POINTS - spent;
    if (delta > 0 && (attrs[key] >= MAX_ATTRIBUTE || remaining <= 0)) return;
    if (delta < 0 && attrs[key] <= BASE_ATTRIBUTE) return;
    attrs[key] += delta;
    renderAttributes();
  }

  function setLiveStat(id, value, min, max) {
    const valueEl = $(`${id}Value`);
    const barEl = $(`${id}Bar`);
    if (valueEl) valueEl.textContent = value;
    if (barEl) barEl.style.width = `${Math.max(4, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
  }

  function updateLiveStats() {
    const hp = 10 + (attrs.vigor - 8) * 2;
    const def = 10 + (attrs.agilidade - 8) + Math.floor((attrs.percepcao - 8) / 2);
    const stamina = 6 + Math.floor((attrs.vigor - 8 + attrs.agilidade - 8) / 2);
    const attack = 5 + (attrs.forca - 8);
    const focus = 5 + Math.floor((attrs.vontade - 8 + attrs.mente - 8) / 2);
    setLiveStat('liveHp', hp, 10, 24);
    setLiveStat('liveDef', def, 10, 20);
    setLiveStat('liveStamina', stamina, 6, 13);
    setLiveStat('liveAttack', attack, 5, 12);
    setLiveStat('liveFocus', focus, 5, 12);
    $('previewHp').textContent = hp;
    $('previewDef').textContent = def;
    $('previewStamina').textContent = stamina;
    $('liveHpHint').textContent = `Vigor ${attrs.vigor} · vida calculada no protótipo.`;
    $('liveDefHint').textContent = `Agilidade ${attrs.agilidade} + percepção ${attrs.percepcao}.`;
    $('liveStaminaHint').textContent = `Vigor ${attrs.vigor} + agilidade ${attrs.agilidade}.`;
    $('liveAttackHint').textContent = `Força ${attrs.forca} · ataque calculado no protótipo.`;
    $('liveFocusHint').textContent = `Vontade ${attrs.vontade} + mente ${attrs.mente}.`;
  }

  function updateHeightScale() {
    const value = parseFloat(($('appearanceHeight')?.value || '1,70').replace(',', '.')) || 1.7;
    const scale = Math.max(.88, Math.min(1.12, 1 + ((value - 1.7) * 0.52)));
    document.documentElement.style.setProperty('--character-height-scale', scale.toFixed(3));
    if ($('heightReadout')) $('heightReadout').textContent = `${value.toFixed(2).replace('.', ',')} m`;
    renderFinalReview();
  }

  function updateWeightScale() {
    const value = parseInt($('appearanceWeight')?.value || '70', 10);
    const pct = ((value - 45) / (120 - 45)) * 100;
    if ($('weightMarker')) $('weightMarker').style.left = `${Math.max(0, Math.min(100, pct))}%`;
    renderFinalReview();
  }

  function handleImage(file) {
    const MAX_SIZE = 5 * 1024 * 1024;
    const types = new Set(['image/jpeg','image/png','image/webp','image/gif']);
    if (!file) return;
    if (!types.has(file.type)) return alert('Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF.');
    if (file.size > MAX_SIZE) return alert('A imagem precisa ter no máximo 5 MB.');
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = URL.createObjectURL(file);
    $('portraitImg').src = previewObjectUrl;
    $('portraitImg').hidden = false;
    $('portraitEmpty').hidden = true;
    $('removeCharacterImage').hidden = false;
    $('previewAvatar').src = previewObjectUrl;
    $('previewAvatar').hidden = false;
    $('previewPlaceholder').hidden = true;
  }

  function text(id) { return ($(id)?.value || '').trim(); }
  function value(id, fallback = '—') { return text(id) || fallback; }

  function renderFinalReview() {
    if (!$('finalName')) return;
    $('finalName').textContent = value('characterName', 'Sem nome');
    $('finalNickname').textContent = value('characterNickname');
    $('finalGender').textContent = $('characterGender')?.value || 'Masculino';
    const age = $('characterAge')?.value;
    $('finalAge').textContent = age ? `${age} anos` : '—';
    $('finalCountry').textContent = $('countryName')?.textContent || 'Brasil';
    $('finalCountryFlag').textContent = $('countryFlag')?.textContent || '🇧🇷';
    $('finalClass').textContent = $('classReadout')?.textContent || 'Sobrevivente';
    $('finalAppearanceSummary').textContent = `${$('appearanceHeight')?.value || '1,70 m'} · ${$('appearanceWeight')?.value || '70 kg'}`;
    $('finalAppearanceDetails').textContent = [
      text('appearanceScar') ? `Marca: ${text('appearanceScar')}` : '',
      text('appearanceFeatures') ? text('appearanceFeatures') : '',
      text('appearanceDescription') ? text('appearanceDescription') : ''
    ].filter(Boolean).join(' · ') || 'Sem características adicionais.';
    $('finalSkin').textContent = `Pele: ${$('appearanceSkin')?.value || 'Claro'}`;
    $('finalHair').textContent = `Cabelo: ${$('appearanceHair')?.value || 'Preto'}`;
    $('finalEyes').textContent = `Olhos: ${$('appearanceEyes')?.value || 'Castanhos'}`;
    $('finalPersonality').textContent = value('characterPersonality');
    $('finalObjective').textContent = value('characterObjective');
    $('finalFear').textContent = value('characterFear');
    $('finalHistory').textContent = value('characterHistory');
    const root = $('finalAttributes');
    if (root) {
      root.replaceChildren();
      Object.entries(attrs).forEach(([key, val]) => {
        const name = {forca:'Força',agilidade:'Agilidade',vigor:'Vigor',percepcao:'Percepção',mente:'Mente',vontade:'Vontade'}[key];
        const item = document.createElement('span');
        item.innerHTML = `<b>${name}</b><strong>${val}</strong>`;
        root.appendChild(item);
      });
    }
  }

  function setupProfile() {
    const chip = $('profileChip');
    const dropdown = $('profileDropdown');
    const wrap = $('profileWrap');
    const close = () => { if (dropdown) dropdown.hidden = true; chip?.setAttribute('aria-expanded','false'); };
    chip?.addEventListener('click', (event) => { event.stopPropagation(); const open = dropdown.hidden; dropdown.hidden = !open; chip.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', (event) => { if (!wrap?.contains(event.target)) close(); });
    $('profileSignOut')?.addEventListener('click', async () => { try { await aeriom.auth.signOut(); location.replace('../index.html'); } catch {} });
  }

  async function loadProfile() {
    try {
      const { data } = await aeriom.auth.getSession();
      const user = data?.session?.user;
      if (!user) { location.replace('../index.html'); return; }
      const fallback = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sobrevivente';
      let name = fallback;
      let avatar = null;
      const p = await aeriom.from('profiles').select('display_name,avatar_path').eq('id', user.id).maybeSingle();
      if (p.data?.display_name) name = p.data.display_name;
      if (p.data?.avatar_path) {
        const u = await aeriom.storage.from('avatars').createSignedUrl(p.data.avatar_path, 3600);
        avatar = u.data?.signedUrl || null;
      }
      $('profileName').textContent = name;
      $('profileDropdownName').textContent = name;
      $('profileDropdownEmail').textContent = user.email || 'Conta Afterlife';
      document.querySelectorAll('#profileAvatar,#profileDropdownAvatar').forEach(el => {
        el.replaceChildren();
        if (avatar) { const img = document.createElement('img'); img.src = avatar; img.alt = ''; el.appendChild(img); }
        else el.textContent = name.charAt(0).toUpperCase();
      });
    } catch {
      const name = $('profileName')?.textContent || 'Sobrevivente';
      $('profileDropdownName').textContent = name;
    }
  }

  steps.forEach(step => step.addEventListener('click', () => goTo(Number(step.dataset.step))));
  $('prevStep').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(index - 1); });
  $('nextStep').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(index + 1); });
  $('backStep').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(index - 1); });
  $('nextAction').addEventListener('click', () => {
    if (index < slides.length - 1) goTo(index + 1);
    else $('nextAction').textContent = 'FICHA PREPARADA ✓';
  });

  $('characterName')?.addEventListener('input', e => { $('previewName').textContent = e.target.value.trim() || 'Sem nome'; renderFinalReview(); });
  ['characterNickname','characterGender','characterAge','characterPersonality','characterObjective','characterFear','characterHistory','appearanceScar','appearanceFeatures','appearanceDescription'].forEach(id => $(id)?.addEventListener('input', renderFinalReview));
  $('characterGender')?.addEventListener('change', renderFinalReview);
  $('countryOrigin')?.addEventListener('change', updateCountryPreset);
  ['appearanceSkin','appearanceHair','appearanceEyes','appearanceEyeShape','appearanceStyle'].forEach(id => $(id)?.addEventListener('change', renderFinalReview));
  $('appearanceHeight')?.addEventListener('change', updateHeightScale);
  $('appearanceWeight')?.addEventListener('change', updateWeightScale);

  document.querySelectorAll('.class-card').forEach(card => card.addEventListener('click', () => selectClassCard(card)));
  document.querySelectorAll('[data-class-prev]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); moveClass(-1); }));
  document.querySelectorAll('[data-class-next]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); moveClass(1); }));
  document.querySelectorAll('[data-plus]').forEach(btn => btn.addEventListener('click', () => changeAttribute(btn.dataset.plus, 1)));
  document.querySelectorAll('[data-minus]').forEach(btn => btn.addEventListener('click', () => changeAttribute(btn.dataset.minus, -1)));

  $('uploadCharacterImage')?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); $('characterImageFile')?.click(); });
  $('characterImageFile')?.addEventListener('change', e => handleImage(e.target.files?.[0]));
  $('removeCharacterImage')?.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
    $('portraitImg').src = ''; $('portraitImg').hidden = true; $('portraitEmpty').hidden = false; $('removeCharacterImage').hidden = true;
    $('previewAvatar').src = ''; $('previewAvatar').hidden = true; $('previewPlaceholder').hidden = false;
  });

  document.addEventListener('keydown', event => {
    if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowRight') goTo(index + 1);
    if (event.key === 'ArrowLeft') goTo(index - 1);
  });

  track?.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    if (event.target.closest('input,select,textarea,button,a,label')) { touchX = null; touchY = null; return; }
    touchX = event.clientX; touchY = event.clientY;
  }, {passive:true});
  track?.addEventListener('pointerup', event => {
    if (event.pointerType !== 'touch' || touchX === null || touchY === null) return;
    const dx = event.clientX - touchX;
    const dy = event.clientY - touchY;
    touchX = null; touchY = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    goTo(index + (dx < 0 ? 1 : -1));
  }, {passive:true});

  document.querySelectorAll('.field-grid input,.field-grid select,.field-stack input,.field-stack textarea,.appearance-extra-grid input,.appearance-description textarea').forEach(el => el.addEventListener('focus', () => el.closest('label')?.classList.add('is-focused')));

  setupProfile();
  populateCountries();
  updateHeightScale();
  updateWeightScale();
  updatePreviewSub();
  renderAttributes();
  selectClassCard(document.querySelector('.class-card.selected') || document.querySelector('.class-card'));
  goTo(0);
  loadProfile();
})();
