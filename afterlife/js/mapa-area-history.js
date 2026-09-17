import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeAreaHistoryBooted) return;
  window.__afterlifeAreaHistoryBooted = true;

  const ACTION_LABELS = {
    observe: 'OBSERVAR',
    investigate: 'INVESTIGAR',
    search: 'VASCULHAR',
    track: 'RASTREAR'
  };

  const RESULT_LABELS = {
    critical: 'CRÍTICO',
    great_success: 'GRANDE SUCESSO',
    success: 'SUCESSO',
    failure: 'FALHA',
    critical_failure: 'FALHA CRÍTICA'
  };

  const RESULT_TONES = {
    critical: 'critical',
    great_success: 'great',
    success: 'success',
    failure: 'failure',
    critical_failure: 'critical-failure'
  };

  const STATE_LABELS = {
    unknown: 'NÃO EXPLORADA',
    identified: 'IDENTIFICADA',
    searched: 'VASCULHADA',
    revealed: 'REVELADA'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  let observer = null;
  const timers = new WeakMap();

  function injectStyle() {
    if (document.getElementById('afterlife-area-history-style')) return;
    const link = document.createElement('link');
    link.id = 'afterlife-area-history-style';
    link.rel = 'stylesheet';
    link.href = './css/mapa-area-history.css?v=20260917-1';
    document.head.appendChild(link);
  }

  function locationFromCache() {
    const title = document.getElementById('afterlifeLocationTitle')?.textContent?.trim();
    if (!title) return null;
    const cache = Array.isArray(window.__afterlifeWorldLocationsCache)
      ? window.__afterlifeWorldLocationsCache
      : [];
    return cache.find((location) => location?.name === title) || null;
  }

  async function findAreaByName(name) {
    const cached = Array.isArray(window.__afterlifeCurrentLocationAreas)
      ? window.__afterlifeCurrentLocationAreas.find((area) => area?.name === name)
      : null;
    if (cached) return cached;

    const location = locationFromCache();
    if (!location?.id || !name) return null;

    const session = await ensureAfterlifeSession();
    if (!session?.user) return null;

    const { data, error } = await aeriom.rpc('list_campaign_location_areas', {
      p_location_id: location.id
    });
    if (error) throw error;

    const areas = Array.isArray(data) ? data : [];
    window.__afterlifeCurrentLocationAreas = areas;
    return areas.find((area) => area?.name === name) || null;
  }

  function formatTime(value) {
    if (!value) return 'agora';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'agora';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function renderState(area, tests) {
    const state = area?.state && typeof area.state === 'object' ? area.state : {};
    const status = STATE_LABELS[state.status] || STATE_LABELS.unknown;
    const investigated = state.investigated === true;
    const lastResult = RESULT_LABELS[state.last_result] || '';

    return `<div class="afterlife-area-history__state">
      <div><span>ESTADO ATUAL</span><strong>${esc(status)}</strong></div>
      <div><span>AÇÕES REGISTRADAS</span><strong>${Number(tests.length)}</strong></div>
      <div><span>ÚLTIMA SITUAÇÃO</span><strong>${investigated && lastResult ? esc(lastResult) : '—'}</strong></div>
    </div>`;
  }

  function renderTest(test) {
    const result = test?.result || '';
    const tone = RESULT_TONES[result] || 'failure';
    const action = ACTION_LABELS[test?.action_key] || String(test?.action_key || 'AÇÃO').toUpperCase();
    const roll = Number(test?.total ?? 0);
    const difficulty = Number(test?.difficulty ?? 0);
    const noise = Number(test?.noise_delta || 0);

    return `<article class="afterlife-area-history__item afterlife-area-history__item--${tone}">
      <div class="afterlife-area-history__item-top">
        <div class="afterlife-area-history__who">
          <strong>${esc(test?.character_name || 'Personagem')}</strong>
          <span>${esc(action)} · ${esc(formatTime(test?.created_at))}</span>
        </div>
        <strong class="afterlife-area-history__result">${esc(RESULT_LABELS[result] || result || 'RESULTADO')}</strong>
      </div>
      <div class="afterlife-area-history__item-meta">
        <span>${esc(test?.skill_key || 'teste')}</span>
        <span>${esc(test?.attribute_key || 'atributo')}</span>
        <span>D${Number(test?.die_sides || 8)}</span>
        <b>${roll} / CD ${difficulty}</b>
      </div>
      ${test?.consequence ? `<p>${esc(test.consequence)}</p>` : ''}
      ${noise ? `<small>RUÍDO +${noise}</small>` : ''}
    </article>`;
  }

  function renderHistory(section, area, tests) {
    if (!section) return;
    section.innerHTML = `<div class="afterlife-area-history__head">
      <div>
        <span>HISTÓRICO DA ÁREA</span>
        <strong>O que já aconteceu aqui</strong>
        <small>As ações realizadas ficam registradas para todos os participantes da sessão.</small>
      </div>
      <button type="button" class="afterlife-area-history__refresh" data-history-refresh aria-label="Atualizar histórico">↻</button>
    </div>
    ${renderState(area, tests)}
    <div class="afterlife-area-history__list">
      ${tests.length
        ? tests.map(renderTest).join('')
        : '<div class="afterlife-area-history__empty"><strong>Nenhuma ação registrada</strong><span>Esta área ainda não possui histórico de exploração.</span></div>'}
    </div>`;
  }

  async function refresh(layer, area, section) {
    if (!document.body.contains(layer) || getComputedStyle(layer).display === 'none') return;
    if (!area?.id || !section) return;

    const { data, error } = await aeriom.rpc('list_campaign_location_area_tests', {
      p_area_id: area.id,
      p_limit: 15
    });
    if (error) throw error;

    renderHistory(section, area, Array.isArray(data) ? data : []);
    const button = section.querySelector('[data-history-refresh]');
    if (button) button.addEventListener('click', () => refresh(layer, area, section).catch((e) => {
      console.warn('[AFTERLIFE][P5.8][HISTORY]', e);
    }), { once: true });
  }

  function clearTimer(layer) {
    const timer = timers.get(layer);
    if (timer) {
      clearInterval(timer);
      timers.delete(layer);
    }
  }

  function startPolling(layer, area, section) {
    clearTimer(layer);
    const timer = window.setInterval(() => {
      if (!document.body.contains(layer) || getComputedStyle(layer).display === 'none') {
        clearTimer(layer);
        return;
      }
      refresh(layer, area, section).catch((error) => {
        console.warn('[AFTERLIFE][P5.8][POLL]', error);
      });
    }, 5000);
    timers.set(layer, timer);
  }

  async function mount(layer) {
    if (!layer || layer.dataset.p58HistoryMounted === '1') return;

    const card = layer.querySelector('.afterlife-area-detail__card');
    const body = layer.querySelector('.afterlife-area-detail__body');
    const heading = card?.querySelector('header h3');
    const name = heading?.textContent?.trim();
    if (!card || !body || !name) return;

    let area;
    try {
      area = await findAreaByName(name);
    } catch (error) {
      console.warn('[AFTERLIFE][P5.8][AREA]', error);
      return;
    }
    if (!area?.id) return;

    const old = body.querySelector('.afterlife-area-history');
    if (old) old.remove();

    const section = document.createElement('section');
    section.className = 'afterlife-area-history';
    section.dataset.areaId = area.id;
    body.appendChild(section);
    layer.dataset.p58HistoryMounted = '1';

    try {
      await refresh(layer, area, section);
    } catch (error) {
      section.innerHTML = `<div class="afterlife-area-history__error">${esc(error?.message || 'Não foi possível carregar o histórico.')}</div>`;
    }

    startPolling(layer, area, section);
  }

  function scan() {
    document.querySelectorAll('.afterlife-area-detail').forEach((layer) => {
      if (getComputedStyle(layer).display !== 'none') void mount(layer);
    });
  }

  function boot() {
    injectStyle();
    if (observer) observer.disconnect();
    observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    scan();
  }

  window.__afterlifeAreaHistoryRefresh = () => scan();
  boot();
})();
