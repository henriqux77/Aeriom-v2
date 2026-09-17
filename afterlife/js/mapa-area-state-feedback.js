import { aeriom } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeAreaStateFeedbackBooted) return;
  window.__afterlifeAreaStateFeedbackBooted = true;

  const STATUS = {
    unknown: {
      label: 'NÃO EXPLORADA',
      tone: 'unknown',
      text: 'Ainda não há uma descoberta consolidada nesta área.'
    },
    identified: {
      label: 'IDENTIFICADA',
      tone: 'identified',
      text: 'O grupo já identificou este ambiente.'
    },
    searched: {
      label: 'VASCULHADA',
      tone: 'searched',
      text: 'A área já foi vasculhada e teve elementos relevantes percebidos.'
    },
    revealed: {
      label: 'REVELADA',
      tone: 'revealed',
      text: 'As principais informações disponíveis para esta área foram reveladas.'
    }
  };

  const RESULT = {
    critical: 'Crítico',
    great_success: 'Grande sucesso',
    success: 'Sucesso',
    failure: 'Falha',
    critical_failure: 'Falha crítica'
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  let channel = null;
  let campaignId = null;
  let retryTimer = 0;
  let observer = null;

  function injectStyle() {
    if (document.getElementById('afterlife-area-state-feedback-style')) return;
    const link = document.createElement('link');
    link.id = 'afterlife-area-state-feedback-style';
    link.rel = 'stylesheet';
    link.href = './css/mapa-area-state-feedback.css?v=20260917-1';
    document.head.appendChild(link);
  }

  function context() {
    return window.__afterlifeCampaignMap || {};
  }

  function currentAreas() {
    return Array.isArray(window.__afterlifeCurrentLocationAreas)
      ? window.__afterlifeCurrentLocationAreas
      : [];
  }

  function normalizeArea(area) {
    if (!area || typeof area !== 'object') return area;
    if (!area.state || typeof area.state !== 'object') area.state = {};
    return area;
  }

  function statusInfo(area) {
    const state = area?.state && typeof area.state === 'object' ? area.state : {};
    return STATUS[state.status] || STATUS.unknown;
  }

  function resultLabel(area) {
    const result = area?.state?.last_result;
    return result ? (RESULT[result] || String(result)) : '';
  }

  function findAreaByName(name) {
    return currentAreas().find((area) => String(area?.name || '').trim() === String(name || '').trim()) || null;
  }

  function createBadge(area) {
    const info = statusInfo(area);
    const badge = document.createElement('span');
    badge.className = `afterlife-area-state-badge afterlife-area-state-badge--${info.tone}`;
    badge.dataset.areaStateBadge = '1';
    badge.textContent = info.label;
    badge.title = info.text;
    return badge;
  }

  function areaSignature(area) {
    const state = area?.state && typeof area.state === 'object' ? area.state : {};
    return [
      state.status || 'unknown',
      state.investigated ? '1' : '0',
      state.last_result || '',
      state.last_test_id || ''
    ].join('|');
  }

  function decorateCard(card, area) {
    if (!card || !area?.id) return;
    const signature = areaSignature(area);
    if (card.dataset.p511StateSignature === signature) return;

    const info = statusInfo(area);
    card.dataset.areaState = area?.state?.status || 'unknown';
    card.dataset.areaId = area.id;

    const meta = card.querySelector('.afterlife-area-card__copy span');
    if (!meta) return;

    meta.classList.add('afterlife-area-card__meta');
    meta.parentElement?.querySelectorAll('[data-area-state-badge="1"], [data-area-state-copy]').forEach((node) => node.remove());
    meta.insertAdjacentElement('afterend', createBadge(area));

    const stateLine = document.createElement('small');
    stateLine.className = 'afterlife-area-state-copy';
    stateLine.dataset.areaStateCopy = '1';
    const suffix = resultLabel(area);
    stateLine.textContent = suffix ? `${info.text} · Último teste: ${suffix}.` : info.text;
    meta.insertAdjacentElement('afterend', stateLine);
    card.dataset.p511StateSignature = signature;
  }

  function decorateMasterRow(row, area) {
    if (!row || !area?.id) return;
    const signature = areaSignature(area);
    if (row.dataset.p511StateSignature === signature) return;
    row.dataset.areaState = area?.state?.status || 'unknown';
    row.dataset.areaId = area.id;
    const first = row.querySelector(':scope > div:first-child');
    if (!first) return;
    first.querySelectorAll('[data-area-state-badge="1"], [data-area-state-copy]').forEach((node) => node.remove());
    first.appendChild(createBadge(area));
    row.dataset.p511StateSignature = signature;
  }

  function decorateList() {
    document.querySelectorAll('.afterlife-area-card').forEach((card) => {
      const name = card.querySelector('.afterlife-area-card__copy strong')?.textContent?.trim();
      const area = findAreaByName(name);
      if (area) decorateCard(card, area);
    });

    document.querySelectorAll('.afterlife-area-master-row').forEach((row) => {
      const name = row.querySelector(':scope > div:first-child strong')?.textContent?.trim();
      const area = findAreaByName(name);
      if (area) decorateMasterRow(row, area);
    });
  }

  function detailLayer() {
    const layers = [...document.querySelectorAll('.afterlife-area-detail')];
    return layers.reverse().find((layer) => getComputedStyle(layer).display !== 'none') || null;
  }

  function decorateDetail() {
    const layer = detailLayer();
    if (!layer) return;
    const name = layer.querySelector('header h3')?.textContent?.trim();
    const area = findAreaByName(name);
    if (!area?.id) return;

    const body = layer.querySelector('.afterlife-area-detail__body');
    if (!body) return;
    const signature = areaSignature(area);
    let panel = body.querySelector('[data-area-state-feedback]');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'afterlife-area-state-feedback';
      panel.dataset.areaStateFeedback = '1';
      const description = body.querySelector('.afterlife-area-detail__description');
      body.insertBefore(panel, description?.nextSibling || body.firstChild);
    }
    if (panel.dataset.p511StateSignature === signature) return;

    const info = statusInfo(area);
    const suffix = resultLabel(area);
    const investigated = area?.state?.investigated === true;
    panel.dataset.areaState = area?.state?.status || 'unknown';
    panel.innerHTML = `<div class="afterlife-area-state-feedback__icon">◈</div><div class="afterlife-area-state-feedback__copy"><span>ESTADO DA ÁREA</span><strong>${esc(info.label)}</strong><p>${esc(info.text)}</p>${investigated ? `<small>Investigação registrada${suffix ? ` · Último teste: ${esc(suffix)}` : ''}.</small>` : '<small>Nenhuma investigação registrada neste ciclo.</small>'}</div>`;
    panel.dataset.p511StateSignature = signature;
  }

  function decorateAll() {
    decorateList();
    decorateDetail();
  }

  function applyRealtimePayload(payload) {
    const row = payload?.new || payload?.old;
    if (!row?.id) return;
    const areas = currentAreas();
    if (!Array.isArray(areas)) return;

    if (payload.eventType === 'DELETE') {
      window.__afterlifeCurrentLocationAreas = areas.filter((area) => area?.id !== row.id);
      decorateAll();
      return;
    }

    if (payload.eventType === 'INSERT') {
      const exists = areas.some((area) => area?.id === row.id);
      if (!exists) areas.push(normalizeArea(row));
    } else {
      const index = areas.findIndex((area) => area?.id === row.id);
      if (index >= 0) areas[index] = { ...areas[index], ...row, state: row.state || areas[index].state || {} };
    }
    decorateAll();
  }

  function subscribe() {
    const cid = context()?.campaign?.id;
    if (!cid || !aeriom?.channel) return false;
    if (channel && campaignId === cid) return true;
    if (channel) {
      try { aeriom.removeChannel(channel); } catch {}
      channel = null;
    }
    campaignId = cid;
    channel = aeriom.channel(`afterlife-area-state-feedback:${cid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_location_areas',
        filter: `campaign_id=eq.${cid}`
      }, (payload) => {
        applyRealtimePayload(payload);
        setTimeout(decorateAll, 0);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[AFTERLIFE][P5.11][REALTIME]', status);
        }
      });
    return true;
  }

  function retryBoot() {
    clearTimeout(retryTimer);
    if (subscribe()) {
      decorateAll();
      retryTimer = setTimeout(() => {
        retryBoot();
        decorateAll();
      }, 2500);
      return;
    }
    retryTimer = setTimeout(retryBoot, 800);
  }

  function boot() {
    injectStyle();
    observer = new MutationObserver(() => {
      decorateAll();
      if (!campaignId) subscribe();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    retryBoot();
  }

  boot();
})();
