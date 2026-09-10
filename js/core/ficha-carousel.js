/* AERION — carrossel de seleção de Raça e Classe */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const txt = (v) => String(v == null ? '' : v).trim();

  const CONFIG = {
    race: {
      grid: '#race-grid',
      stateKey: 'race',
      list: () => window.AERIONPersonagemAssets?.races || [],
      getId: (item) => item.id,
      getApi: () => window.AERIONFicha || window.AERION_FICHA,
      select: (id) => window.AERIONFicha?.selectRace?.(id),
      search: '#race-search'
    },
    class: {
      grid: '#class-grid',
      stateKey: 'class',
      list: () => Object.values((window.AERIONFicha || window.AERION_FICHA)?.getClasses?.() || {}),
      getId: (item) => item.id,
      getApi: () => window.AERIONFicha || window.AERION_FICHA,
      select: (id) => window.AERIONFicha?.selectClass?.(id),
      search: null
    }
  };

  const activeIndex = {
    race: 0,
    class: 0
  };

  let suppressClick = false;
  let swipeStartX = null;
  let swipeStartY = null;

  function getState() {
    return CONFIG.race.getApi()?.getState?.() || {};
  }

  function getVisibleItems(type) {
    const cfg = CONFIG[type];
    let items = cfg.list().slice();
    if (type === 'race') {
      const q = txt($(cfg.search)?.value).toLowerCase();
      if (q) {
        items = items.filter((r) =>
          txt(r.name).toLowerCase().includes(q) ||
          txt(r.description).toLowerCase().includes(q) ||
          txt(r.profile).toLowerCase().includes(q)
        );
      }
    }
    return items;
  }

  function getSelectedId(type) {
    const state = getState();
    return txt(state[CONFIG[type].stateKey]);
  }

  function ensureSelectedIndex(type, items) {
    if (!items.length) {
      activeIndex[type] = 0;
      return 0;
    }

    const selectedId = getSelectedId(type);
    const selectedIndex = items.findIndex((item) => CONFIG[type].getId(item) === selectedId);

    if (selectedIndex >= 0) {
      activeIndex[type] = selectedIndex;
      return selectedIndex;
    }

    activeIndex[type] = Math.max(0, Math.min(activeIndex[type], items.length - 1));
    return activeIndex[type];
  }

  function imageForRace(race, state) {
    if (!race) return '';
    const assets = window.AERIONPersonagemAssets;
    if (!assets) return '';
    return assets.getRaceImage?.(race.id, state.gender) || '';
  }

  function findCardItems(grid) {
    return Array.from(grid.children).filter((el) => el.matches('button.aerion-carousel-card'));
  }

  function setCardPosition(card, offset) {
    const abs = Math.abs(offset);
    const hidden = abs > 3;

    if (hidden) {
      card.style.opacity = '0';
      card.style.pointerEvents = 'none';
      card.style.filter = 'blur(3px)';
      card.style.transform = 'translate3d(-50%, 34px, -520px) scale(.54)';
      card.style.zIndex = '1';
      return;
    }

    let x = 0;
    let z = 90;
    let scale = 1;
    let opacity = 1;
    let rotateY = 0;
    let translateY = 0;
    let filter = 'none';

    if (offset === 0) {
      x = 0;
      z = 50;
      scale = 1;
      opacity = 1;
    } else if (offset === -1) {
      x = -1;
      z = 30;
      scale = .80;
      opacity = .82;
      rotateY = 12;
      translateY = 24;
      filter = 'saturate(.82) brightness(.90)';
    } else if (offset === 1) {
      x = 1;
      z = 30;
      scale = .80;
      opacity = .82;
      rotateY = -12;
      translateY = 24;
      filter = 'saturate(.82) brightness(.90)';
    } else if (offset === -2) {
      x = -2;
      z = 15;
      scale = .64;
      opacity = .48;
      rotateY = 18;
      translateY = 48;
      filter = 'grayscale(.28) saturate(.65) brightness(.82)';
    } else if (offset === 2) {
      x = 2;
      z = 15;
      scale = .64;
      opacity = .48;
      rotateY = -18;
      translateY = 48;
      filter = 'grayscale(.28) saturate(.65) brightness(.82)';
    } else {
      x = offset < 0 ? -2.9 : 2.9;
      z = 5;
      scale = .50;
      opacity = .20;
      rotateY = offset < 0 ? 24 : -24;
      translateY = 62;
      filter = 'grayscale(.65) brightness(.72) blur(1px)';
    }

    const gap = 'var(--carousel-gap)';
    card.style.opacity = String(opacity);
    card.style.pointerEvents = abs <= 2 ? 'auto' : 'none';
    card.style.filter = filter;
    card.style.zIndex = String(z);
    card.style.transform =
      'translate3d(calc(-50% + ' +
      (x === 0 ? '0px' : '(' + x + ' * ' + gap + ')') +
      '), ' + translateY + 'px, ' + (offset === 0 ? '90px' : '0px') + ') ' +
      'rotateY(' + rotateY + 'deg) scale(' + scale + ')';
  }

  function makeNav(type, direction, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aerion-carousel-nav ' + direction;
    button.dataset.carousel = type;
    button.dataset.carouselDirection = direction;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = direction === 'prev' ? '‹' : '›';
    return button;
  }

  function makeMeta(type, index, count) {
    const meta = document.createElement('div');
    meta.className = 'aerion-carousel-meta';
    meta.dataset.carouselMeta = type;
    meta.textContent = (index + 1) + ' / ' + count;
    return meta;
  }

  function makeDots(type, index, count) {
    const wrap = document.createElement('div');
    wrap.className = 'aerion-carousel-dots';
    wrap.dataset.carouselDots = type;

    // Most catálogos têm muitas opções; mostramos no máximo 11 marcadores.
    const maxDots = Math.min(11, count);
    const start = Math.max(0, Math.min(index - Math.floor(maxDots / 2), count - maxDots));

    for (let i = 0; i < maxDots; i += 1) {
      const dot = document.createElement('i');
      const itemIndex = start + i;
      if (itemIndex === index) dot.classList.add('is-active');
      wrap.appendChild(dot);
    }

    return wrap;
  }

  function render(type) {
    const cfg = CONFIG[type];
    const grid = $(cfg.grid);
    if (!grid) return;

    const items = getVisibleItems(type);
    if (!items.length) return;

    let index = ensureSelectedIndex(type, items);

    // A renderização-base do AERION já criou os cartões; só decoramos e reorganizamos.
    let cards = Array.from(grid.children).filter((el) => el.matches('button.' + (type === 'race' ? 'race-card' : 'class-card')));
    if (cards.length !== items.length) {
      // Se o filtro mudou ou a renderização-base ainda não terminou, aguardamos o próximo ciclo.
      window.requestAnimationFrame(() => render(type));
      return;
    }

    cards.forEach((card) => card.classList.add('aerion-carousel-card'));
    cards.forEach((card, i) => {
      card.dataset.carouselIndex = String(i);
      card.tabIndex = Math.abs(i - index) <= 2 ? 0 : -1;
      setCardPosition(card, i - index);
      card.classList.toggle('is-selected', i === index);
      card.setAttribute('aria-current', i === index ? 'true' : 'false');
    });

    grid.classList.toggle('is-filtered', type === 'race' && !!txt($(cfg.search)?.value));

    grid.querySelectorAll('.aerion-carousel-nav, .aerion-carousel-meta, .aerion-carousel-dots')
      .forEach((el) => el.remove());

    if (items.length > 1 && !(type === 'race' && txt($(cfg.search)?.value))) {
      grid.appendChild(makeNav(type, 'prev', type === 'race' ? 'Raça anterior' : 'Classe anterior'));
      grid.appendChild(makeNav(type, 'next', type === 'race' ? 'Próxima raça' : 'Próxima classe'));
      grid.appendChild(makeDots(type, index, items.length));
      grid.appendChild(makeMeta(type, index, items.length));
    }
  }

  function move(type, delta) {
    const cfg = CONFIG[type];
    const items = getVisibleItems(type);
    if (!items.length) return;

    let index = ensureSelectedIndex(type, items);
    index = (index + delta + items.length) % items.length;
    activeIndex[type] = index;

    const id = cfg.getId(items[index]);
    cfg.select(id);
    // Atualiza o carrossel imediatamente após a seleção.
    // O render global da ficha continua acontecendo em paralelo, sem segurar a animação.
    render(type);
  }

  function selectByCard(type, index) {
    const cfg = CONFIG[type];
    const items = getVisibleItems(type);
    if (!items.length) return;
    const i = Math.max(0, Math.min(index, items.length - 1));
    activeIndex[type] = i;
    cfg.select(cfg.getId(items[i]));
    render(type);
  }

  function onCarouselClick(event) {
    const control = event.target.closest('[data-carousel][data-carousel-direction]');
    if (control) {
      const type = control.dataset.carousel;
      const delta = control.dataset.carouselDirection === 'next' ? 1 : -1;
      event.preventDefault();
      event.stopPropagation();
      move(type, delta);
      return;
    }

    const raceCard = event.target.closest('#race-grid button.aerion-carousel-card');
    if (raceCard) {
      event.preventDefault();
      event.stopPropagation();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      selectByCard('race', Number(raceCard.dataset.carouselIndex || 0));
      return;
    }

    const classCard = event.target.closest('#class-grid button.aerion-carousel-card');
    if (classCard) {
      event.preventDefault();
      event.stopPropagation();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      selectByCard('class', Number(classCard.dataset.carouselIndex || 0));
    }
  }

  function attachGesture(grid, type) {
    if (!grid || grid.dataset.carouselGestureBound === '1') return;
    grid.dataset.carouselGestureBound = '1';

    grid.addEventListener('pointerdown', (event) => {
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
    }, {passive: true});

    grid.addEventListener('pointerup', (event) => {
      if (swipeStartX == null || swipeStartY == null) return;
      const dx = event.clientX - swipeStartX;
      const dy = event.clientY - swipeStartY;
      swipeStartX = null;
      swipeStartY = null;

      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      suppressClick = true;
      move(type, dx < 0 ? 1 : -1);
    }, {passive: true});
  }

  function refresh() {
    render('race');
    render('class');
  }

  function bind() {
    document.addEventListener('click', onCarouselClick, true);

    const raceSearch = $(CONFIG.race.search);
    if (raceSearch) {
      raceSearch.addEventListener('input', () => {
        window.requestAnimationFrame(() => render('race'));
      });
    }

    attachGesture($('#race-grid'), 'race');
    attachGesture($('#class-grid'), 'class');

    window.addEventListener('aerion:ficha:render', () => {
      window.requestAnimationFrame(refresh);
    });

    window.addEventListener('aerion:personagem-assets:ready', () => {
      window.requestAnimationFrame(refresh);
    });

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, {once: true});
  } else {
    bind();
  }
})();
