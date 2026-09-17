import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeAreaMasterStateBooted) return;
  window.__afterlifeAreaMasterStateBooted = true;

  const STATE_LABELS = {
    unknown: 'NÃO EXPLORADA',
    identified: 'IDENTIFICADA',
    searched: 'VASCULHADA',
    revealed: 'REVELADA'
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  let observer = null;
  let busy = false;

  function injectStyle() {
    if (document.getElementById('afterlife-area-master-state-style')) return;
    const link = document.createElement('link');
    link.id = 'afterlife-area-master-state-style';
    link.rel = 'stylesheet';
    link.href = './css/mapa-area-master-state.css?v=20260917-1';
    document.head.appendChild(link);
  }

  function isMaster() {
    return window.__afterlifeCampaignMap?.role === 'master' ||
      window.sessionStorage.getItem('afterlife_campaign_role') === 'master';
  }

  function findArea(name) {
    const areas = Array.isArray(window.__afterlifeCurrentLocationAreas)
      ? window.__afterlifeCurrentLocationAreas
      : [];
    return areas.find((a) => a?.name === name) || null;
  }

  async function saveState(area, patch) {
    if (busy || !area?.id) return;
    busy = true;
    try {
      const session = await ensureAfterlifeSession();
      if (!session?.user) throw new Error('Sessão necessária.');
      const { data, error } = await aeriom.rpc('set_campaign_location_area_state', {
        p_area_id: area.id,
        p_status: patch.status ?? null,
        p_investigated: patch.investigated ?? null,
        p_note: patch.note ?? null
      });
      if (error) throw error;
      area.state = data?.state || area.state;
      return data;
    } finally {
      busy = false;
    }
  }

  async function resetArea(area, layer) {
    if (busy || !area?.id) return;
    if (!confirm(`Resetar a exploração de “${area.name}”? O histórico continuará salvo.`)) return;
    busy = true;
    const btn = layer?.querySelector('[data-area-reset]');
    if (btn) { btn.disabled = true; btn.textContent = 'RESETANDO…'; }
    try {
      const session = await ensureAfterlifeSession();
      if (!session?.user) throw new Error('Sessão necessária.');
      const { data, error } = await aeriom.rpc('reset_campaign_location_area_exploration', { p_area_id: area.id });
      if (error) throw error;
      area.state = data?.state || area.state;
      renderStatus(layer, area);
    } catch (error) {
      alert(error?.message || 'Não foi possível resetar a exploração.');
    } finally {
      busy = false;
      if (btn) { btn.disabled = false; btn.textContent = 'RESETAR EXPLORAÇÃO'; }
    }
  }

  function renderStatus(layer, area) {
    const target = layer?.querySelector('[data-master-state-status]');
    if (!target) return;
    const state = area?.state && typeof area.state === 'object' ? area.state : {};
    target.innerHTML = `<span>ESTADO ATUAL</span><strong>${esc(STATE_LABELS[state.status] || STATE_LABELS.unknown)}</strong><small>${state.investigated ? 'Investigação registrada' : 'Ainda sem investigação registrada'}</small>`;
  }

  function mount(layer) {
    if (!layer || layer.dataset.p510StateMounted === '1' || !isMaster()) return;
    const card = layer.querySelector('.afterlife-area-detail__card');
    const body = layer.querySelector('.afterlife-area-detail__body');
    const heading = card?.querySelector('header h3');
    const name = heading?.textContent?.trim();
    const area = findArea(name);
    if (!card || !body || !area?.id) return;

    const old = body.querySelector('.afterlife-area-master-state');
    if (old) old.remove();

    const section = document.createElement('section');
    section.className = 'afterlife-area-master-state';
    section.innerHTML = `<div class="afterlife-area-master-state__head"><div><span>CONTROLE DO MESTRE</span><strong>Estado da área</strong><small>Altere o estado narrativo sem apagar o histórico de ações.</small></div><div class="afterlife-area-master-state__live" data-master-state-status></div></div><div class="afterlife-area-master-state__buttons">${Object.entries(STATE_LABELS).map(([value,label]) => `<button type="button" data-state-value="${value}">${label}</button>`).join('')}</div><div class="afterlife-area-master-state__note"><label>Nota do Mestre<textarea maxlength="500" data-master-note placeholder="Observação interna sobre o estado atual…">${esc(area?.state?.master_note || '')}</textarea></label><button type="button" data-master-note-save>SALVAR NOTA</button></div><button type="button" class="afterlife-area-master-state__reset" data-area-reset>RESETAR EXPLORAÇÃO</button>`;
    body.appendChild(section);
    layer.dataset.p510StateMounted = '1';

    renderStatus(layer, area);
    section.querySelectorAll('[data-state-value]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.dataset.stateValue;
        if (busy) return;
        section.querySelectorAll('button').forEach((b) => { if (b.dataset.stateValue) b.disabled = true; });
        try {
          await saveState(area, { status: value, investigated: value === 'unknown' ? false : true });
          renderStatus(layer, area);
        } catch (error) {
          alert(error?.message || 'Não foi possível atualizar o estado.');
        } finally {
          section.querySelectorAll('[data-state-value]').forEach((b) => { b.disabled = false; });
        }
      });
    });

    section.querySelector('[data-master-note-save]').addEventListener('click', async () => {
      if (busy) return;
      const note = section.querySelector('[data-master-note]').value.trim();
      const button = section.querySelector('[data-master-note-save]');
      button.disabled = true;
      try {
        await saveState(area, { note });
        button.textContent = 'SALVO';
        setTimeout(() => { if (button.isConnected) button.textContent = 'SALVAR NOTA'; }, 1200);
      } catch (error) {
        alert(error?.message || 'Não foi possível salvar a nota.');
      } finally { button.disabled = false; }
    });

    section.querySelector('[data-area-reset]').addEventListener('click', () => resetArea(area, layer));
  }

  function scan() {
    document.querySelectorAll('.afterlife-area-detail').forEach((layer) => {
      if (getComputedStyle(layer).display !== 'none') mount(layer);
    });
  }

  function boot() {
    injectStyle();
    observer = new MutationObserver(scan);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    scan();
  }

  boot();
})();
