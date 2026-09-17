import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeLocationActionsBooted) return;
  window.__afterlifeLocationActionsBooted = true;

  const ACTIONS = [
    { key: 'observe', label: 'OBSERVAR', help: 'Perceba detalhes sem mexer no ambiente.', icon: '◉' },
    { key: 'investigate', label: 'INVESTIGAR', help: 'Analise pistas e informações do ambiente.', icon: '⌕' },
    { key: 'search', label: 'VASCULHAR', help: 'Procure recursos e possíveis itens escondidos.', icon: '◇' },
    { key: 'track', label: 'RASTREAR', help: 'Procure sinais, rastros e movimentações recentes.', icon: '⌁' }
  ];

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const resultLabel = (v) => ({ critical:'CRÍTICO', great_success:'GRANDE SUCESSO', success:'SUCESSO', failure:'FALHA', critical_failure:'FALHA CRÍTICA' }[v] || v || '—');
  const resultTone = (v) => ({ critical:'critical', great_success:'great', success:'success', failure:'failure', critical_failure:'critical-failure' }[v] || 'failure');
  const titleKey = (area) => area?.id || area?.name || '';

  let observer = null;
  let busy = false;
  let activeLayer = null;

  function injectStyle() {
    if (document.getElementById('afterlife-location-actions-style')) return;
    const link = document.createElement('link');
    link.id = 'afterlife-location-actions-style';
    link.rel = 'stylesheet';
    link.href = './css/mapa-location-actions.css?v=20260917-1';
    document.head.appendChild(link);
  }

  function findAreaByName(name) {
    const list = Array.isArray(window.__afterlifeCurrentLocationAreas) ? window.__afterlifeCurrentLocationAreas : [];
    return list.find((a) => a?.name === name) || null;
  }

  function renderResult(result) {
    const tone = resultTone(result?.result);
    const creatures = Array.isArray(result?.revealed_creatures) ? result.revealed_creatures : [];
    const secrets = Array.isArray(result?.revealed_secrets) ? result.revealed_secrets : [];
    const event = result?.revealed_event && typeof result.revealed_event === 'object' ? result.revealed_event : {};
    return `<div class="afterlife-action-result afterlife-action-result--${tone}">
      <div class="afterlife-action-result__top"><span>${esc(result?.action || 'TESTE')}</span><strong>${esc(resultLabel(result?.result))}</strong></div>
      <div class="afterlife-action-result__score"><b>${Number(result?.total ?? 0)}</b><span>CD ${Number(result?.difficulty ?? 0)}</span></div>
      <div class="afterlife-action-result__meta">${esc(result?.skill_label || 'Teste')} · ${esc(result?.attribute_label || 'Atributo')} · ${esc(result?.die || 'D8')}</div>
      <p>${esc(result?.consequence || result?.discovery_text || 'Teste concluído.')}</p>
      ${result?.revealed_information ? `<div class="afterlife-action-reveal"><span>INFORMAÇÃO</span><p>${esc(result.revealed_information)}</p></div>` : ''}
      ${Object.keys(event).length ? `<div class="afterlife-action-reveal"><span>EVENTO</span><pre>${esc(JSON.stringify(event, null, 2))}</pre></div>` : ''}
      ${creatures.length ? `<div class="afterlife-action-reveal"><span>CRIATURAS</span><p>${esc(creatures.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(', '))}</p></div>` : ''}
      ${secrets.length ? `<div class="afterlife-action-reveal"><span>SEGREDOS</span><p>${esc(secrets.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(', '))}</p></div>` : ''}
      ${Number(result?.noise_delta || 0) ? `<small class="afterlife-action-noise">RUÍDO +${Number(result.noise_delta)}</small>` : ''}
    </div>`;
  }

  async function run(area, action, host, buttonsHost) {
    if (busy || !area?.id) return;
    busy = true;
    buttonsHost?.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const target = buttonsHost?.querySelector(`[data-action="${action}"]`);
    if (target) target.textContent = 'TESTANDO…';
    try {
      const session = await ensureAfterlifeSession();
      if (!session?.user) throw new Error('Sessão necessária.');
      const { data, error } = await aeriom.rpc('resolve_location_area_action', { p_area_id: area.id, p_action_key: action });
      if (error) throw error;
      if (host) host.innerHTML = renderResult(data || {});
      if (buttonsHost) buttonsHost.querySelectorAll('button').forEach((b) => {
        const key = b.dataset.action;
        const same = key === action;
        b.disabled = same;
        if (same) b.textContent = 'REALIZADO';
        else b.disabled = false;
      });
      if (window.__afterlifeRefreshLocationAreas) await window.__afterlifeRefreshLocationAreas();
    } catch (error) {
      if (host) host.innerHTML = `<div class="afterlife-action-error">${esc(error?.message || 'Não foi possível realizar o teste.')}</div>`;
      buttonsHost?.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      if (target) target.textContent = ACTIONS.find((x) => x.key === action)?.label || 'TESTAR';
    } finally {
      busy = false;
    }
  }

  function mountOnAreaDetail(layer) {
    if (!layer || layer === activeLayer) return;
    const card = layer.querySelector('.afterlife-area-detail__card');
    const body = layer.querySelector('.afterlife-area-detail__body');
    if (!card || !body) return;
    const heading = card.querySelector('header h3');
    const name = heading?.textContent?.trim();
    const area = findAreaByName(name);
    if (!area) return;

    const old = body.querySelector('.afterlife-area-investigation');
    if (old) old.remove();

    const block = document.createElement('section');
    block.className = 'afterlife-area-action-panel';
    block.innerHTML = `<div class="afterlife-area-action-panel__head"><div><span>AÇÕES DO AMBIENTE</span><strong>Escolha como explorar</strong><small>Cada ação usa automaticamente a ficha do personagem.</small></div></div><div class="afterlife-area-action-panel__grid">${ACTIONS.map((a) => `<button type="button" data-action="${a.key}" title="${esc(a.help)}"><span>${a.icon}</span><strong>${a.label}</strong><small>${esc(a.help)}</small></button>`).join('')}</div><div class="afterlife-area-action-result"></div>`;
    body.appendChild(block);

    const resultHost = block.querySelector('.afterlife-area-action-result');
    const buttonsHost = block.querySelector('.afterlife-area-action-panel__grid');
    buttonsHost.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      run(area, button.dataset.action, resultHost, buttonsHost);
    });

    activeLayer = layer;
  }

  function scan() {
    const layers = [...document.querySelectorAll('.afterlife-area-detail')];
    layers.forEach((layer) => {
      const visible = getComputedStyle(layer).display !== 'none';
      if (visible) mountOnAreaDetail(layer);
    });
  }

  function boot() {
    injectStyle();
    if (observer) observer.disconnect();
    observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    scan();
  }

  window.__afterlifeLocationActionsBooted = true;
  boot();
})();
