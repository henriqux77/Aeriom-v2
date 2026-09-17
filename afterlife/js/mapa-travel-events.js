import { aeriom } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeTravelEventsBooted) return;
  window.__afterlifeTravelEventsBooted = true;

  const $ = (id) => document.getElementById(id);
  const TYPE = {
    encounter:'ENCONTRO', hazard:'PERIGO', discovery:'DESCOBERTA', resource:'RECURSO',
    survivor:'SOBREVIVENTE', faction:'FACÇÃO', zombie:'ZUMBI', custom:'EVENTO'
  };
  const TYPE_ICON = { encounter:'⚔', hazard:'⚠', discovery:'◈', resource:'▣', survivor:'●', faction:'◆', zombie:'☢', custom:'✦' };
  const EVENT_STATUS = { pending:'AGUARDANDO', active:'ATIVO', resolved:'RESOLVIDO', skipped:'IGNORADO' };

  let map = null, campaign = null, role = 'player';
  let travel = null, events = [], channel = null, travelMarker = null, busy = false;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const pct = (v) => `${Math.max(0, Math.min(100, Number(v) || 0)).toFixed(0)}%`;

  async function load() {
    if (!campaign) return;
    const result = await aeriom.rpc('list_campaign_travels', { p_campaign_id: campaign.id, p_limit: 12 });
    if (result.error) throw result.error;
    const list = Array.isArray(result.data) ? result.data : [];
    travel = list.find((item) => item.status === 'planned' || item.status === 'in_transit') || null;
    if (!travel && list.length) travel = list[0];
    events = [];
    if (travel?.id) {
      const eventResult = await aeriom.rpc('list_campaign_travel_events', { p_travel_id: travel.id });
      if (!eventResult.error) events = Array.isArray(eventResult.data) ? eventResult.data : [];
    }
    render();
  }

  function ensurePanel() {
    if ($('afterlifeTravelEventsPanel')) return;
    const sidebar = document.querySelector('.map-sidebar');
    if (!sidebar) return;
    const panel = document.createElement('section');
    panel.id = 'afterlifeTravelEventsPanel';
    panel.className = 'afterlife-travel-events-panel';
    panel.innerHTML = `
      <div class="afterlife-travel-events-head">
        <div><span>VIAGEM VIVA</span><strong>PROGRESSO & EVENTOS</strong></div>
        <b id="afterlifeTravelProgressBadge">0%</b>
      </div>
      <div id="afterlifeTravelProgressBlock" class="afterlife-travel-progress-block"></div>
      <div id="afterlifeTravelEventCreator" class="afterlife-travel-event-creator" hidden></div>
      <div class="afterlife-travel-events-label">REGISTRO DA ROTA</div>
      <div id="afterlifeTravelEventsList" class="afterlife-travel-events-list"></div>`;
    const anchor = $('afterlifeTravelPanel') || $('masterTools') || sidebar.firstElementChild;
    anchor?.insertAdjacentElement('afterend', panel);
  }

  function renderProgress() {
    const host = $('afterlifeTravelProgressBlock');
    if (!host) return;
    const progress = Number(travel?.progress_percent) || 0;
    const active = travel?.status === 'in_transit';
    const badge = $('afterlifeTravelProgressBadge');
    if (badge) badge.textContent = pct(progress);
    if (!travel) {
      host.innerHTML = '<div class="afterlife-travel-events-empty">Nenhuma viagem ativa no momento.</div>';
      return;
    }
    host.innerHTML = `
      <div class="afterlife-travel-progress-track"><span style="width:${progress}%"></span></div>
      <div class="afterlife-travel-progress-meta"><strong>${pct(progress)} percorrido</strong><small>${active ? 'O Mestre controla o avanço do grupo.' : 'A viagem ainda não está em deslocamento.'}</small></div>`;
    if (role === 'master' && active) {
      const controls = document.createElement('div');
      controls.className = 'afterlife-travel-progress-controls';
      controls.innerHTML = `<label><span>AVANÇAR PARA</span><input id="travelProgressInput" type="number" min="0" max="100" step="5" value="${Math.round(progress)}"></label><button id="travelProgressAdvance" type="button" class="afterlife-travel-events-btn afterlife-travel-events-btn--primary">AVANÇAR</button>`;
      host.appendChild(controls);
      $('travelProgressAdvance')?.addEventListener('click', advance);
    }
  }

  function renderCreator() {
    const host = $('afterlifeTravelEventCreator');
    if (!host) return;
    const visible = role === 'master' && travel && (travel.status === 'planned' || travel.status === 'in_transit');
    host.hidden = !visible;
    if (!visible) return;
    host.innerHTML = `
      <div class="afterlife-travel-events-label">CRIAR EVENTO FUTURO</div>
      <div class="afterlife-travel-event-form">
        <label><span>SURGIR EM · %</span><input id="travelEventProgress" type="number" min="0" max="100" step="5" value="25"></label>
        <label><span>TIPO</span><select id="travelEventType">${Object.entries(TYPE).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <input id="travelEventTitle" maxlength="140" placeholder="Título do evento">
        <textarea id="travelEventDescription" maxlength="1000" rows="3" placeholder="O que o Mestre quer narrar quando o grupo chegar a este ponto?"></textarea>
        <button id="travelEventCreate" type="button" class="afterlife-travel-events-btn afterlife-travel-events-btn--primary">ADICIONAR EVENTO</button>
      </div>`;
    $('travelEventCreate')?.addEventListener('click', createEvent);
  }

  function renderEvents() {
    const host = $('afterlifeTravelEventsList');
    if (!host) return;
    host.replaceChildren();
    if (!travel) {
      host.innerHTML = '<div class="afterlife-travel-events-empty">Os eventos aparecem aqui durante um deslocamento.</div>';
      return;
    }
    const visible = [...events].sort((a,b) => Number(a.progress_percent)-Number(b.progress_percent) || String(a.created_at).localeCompare(String(b.created_at)));
    visible.forEach((event) => {
      const row = document.createElement('article');
      row.className = 'afterlife-travel-event';
      row.dataset.status = event.status;
      row.innerHTML = `
        <div class="afterlife-travel-event__icon">${TYPE_ICON[event.type] || '✦'}</div>
        <div class="afterlife-travel-event__body">
          <div class="afterlife-travel-event__top"><strong>${esc(event.title)}</strong><span>${pct(event.progress_percent)}</span></div>
          <small>${TYPE[event.type] || 'EVENTO'} · ${EVENT_STATUS[event.status] || event.status}</small>
          ${event.description ? `<p>${esc(event.description)}</p>` : ''}
          ${event.outcome ? `<div class="afterlife-travel-event__outcome"><b>RESULTADO</b><span>${esc(event.outcome)}</span></div>` : ''}
        </div>`;
      if (role === 'master' && event.status === 'active') {
        const actions = document.createElement('div');
        actions.className = 'afterlife-travel-event__actions';
        actions.innerHTML = `<button type="button" data-event-action="resolved">RESOLVER</button><button type="button" data-event-action="skipped">IGNORAR</button>`;
        actions.querySelector('[data-event-action="resolved"]')?.addEventListener('click', () => resolveEvent(event, 'resolved'));
        actions.querySelector('[data-event-action="skipped"]')?.addEventListener('click', () => resolveEvent(event, 'skipped'));
        row.appendChild(actions);
      }
      host.appendChild(row);
    });
    if (!host.children.length) host.innerHTML = '<div class="afterlife-travel-events-empty">Nenhum evento registrado para esta viagem.</div>';
  }

  function renderMarker() {
    if (travelMarker) { travelMarker.remove(); travelMarker = null; }
    if (!map || !travel) return;
    const lat = Number(travel.current_latitude ?? (Number(travel.origin_latitude) + (Number(travel.destination_latitude)-Number(travel.origin_latitude)) * ((Number(travel.progress_percent)||0)/100)));
    const lng = Number(travel.current_longitude ?? (Number(travel.origin_longitude) + (Number(travel.destination_longitude)-Number(travel.origin_longitude)) * ((Number(travel.progress_percent)||0)/100)));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    travelMarker = L.circleMarker([lat,lng], { radius: 9, weight: 3, fillOpacity: .8, className: 'afterlife-travel-progress-marker' }).addTo(map);
    travelMarker.bindTooltip(`Viagem · ${pct(travel.progress_percent)}`, { direction:'top', offset:[0,-8] });
  }

  function render() {
    renderProgress(); renderCreator(); renderEvents(); renderMarker();
  }

  async function advance() {
    if (busy || role !== 'master' || !travel || travel.status !== 'in_transit') return;
    const input = $('travelProgressInput');
    const next = Number(input?.value);
    if (!Number.isFinite(next)) return;
    busy = true;
    try {
      const { data, error } = await aeriom.rpc('advance_campaign_travel_progress', { p_travel_id: travel.id, p_progress_percent: next });
      if (error) throw error;
      travel = data;
      await window.__afterlifeCampaignMap?.refreshMembers?.();
      await load();
    } catch (error) {
      console.error('[AFTERLIFE][TRAVEL][PROGRESS]', error);
      alert(error?.message || 'Não foi possível avançar a viagem.');
    } finally { busy = false; }
  }

  async function createEvent() {
    if (busy || role !== 'master' || !travel) return;
    const progress = Number($('travelEventProgress')?.value);
    if (!Number.isFinite(progress)) return;
    busy = true;
    try {
      const { error } = await aeriom.rpc('create_campaign_travel_event', {
        p_travel_id: travel.id,
        p_progress_percent: progress,
        p_type: $('travelEventType')?.value || 'custom',
        p_title: $('travelEventTitle')?.value?.trim() || 'Evento de viagem',
        p_description: $('travelEventDescription')?.value?.trim() || ''
      });
      if (error) throw error;
      await load();
      $('travelEventTitle').value = '';
      $('travelEventDescription').value = '';
    } catch (error) {
      console.error('[AFTERLIFE][TRAVEL][EVENT_CREATE]', error);
      alert(error?.message || 'Não foi possível criar o evento.');
    } finally { busy = false; }
  }

  async function resolveEvent(event, status) {
    if (busy || role !== 'master') return;
    const outcome = prompt(status === 'resolved' ? 'Resultado/narração do evento:' : 'Motivo para ignorar o evento:');
    if (outcome === null) return;
    busy = true;
    try {
      const { error } = await aeriom.rpc('resolve_campaign_travel_event', { p_event_id: event.id, p_status: status, p_outcome: outcome });
      if (error) throw error;
      await load();
    } catch (error) {
      console.error('[AFTERLIFE][TRAVEL][EVENT_RESOLVE]', error);
      alert(error?.message || 'Não foi possível atualizar o evento.');
    } finally { busy = false; }
  }

  function subscribe() {
    if (!aeriom?.channel || !campaign) return;
    if (channel) { try { aeriom.removeChannel(channel); } catch {} }
    channel = aeriom.channel(`afterlife-travel-events-${campaign.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_travels', filter:`campaign_id=eq.${campaign.id}` }, () => load().catch(() => {}))
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_travel_events', filter:`campaign_id=eq.${campaign.id}` }, () => load().catch(() => {}))
      .subscribe();
  }

  function boot(detail) {
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    if (!map || !campaign) return;
    ensurePanel();
    load().catch((error) => { console.error('[AFTERLIFE][TRAVEL][EVENTS_BOOT]', error); });
    subscribe();
  }

  window.addEventListener('afterlife:map-ready', (event) => boot(event.detail), { once:true });
  if (window.__afterlifeCampaignMap?.map && window.__afterlifeCampaignMap?.campaign) boot(window.__afterlifeCampaignMap);
})();
