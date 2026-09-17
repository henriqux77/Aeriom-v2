import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeTravelBooted) return;
  window.__afterlifeTravelBooted = true;

  const $ = (id) => document.getElementById(id);
  const ROUTE_ENDPOINTS = [
    'https://router.project-osrm.org/route/v1/driving'
  ];
  const STATUS_LABEL = {
    planned: 'PLANEJADA',
    in_transit: 'EM DESLOCAMENTO',
    completed: 'CONCLUÍDA',
    cancelled: 'CANCELADA'
  };
  const RESULT_LABEL = {
    planned: 'A viagem está pronta para o Mestre iniciar.',
    in_transit: 'O grupo está em deslocamento. O destino ainda não foi aplicado ao mapa.',
    completed: 'A viagem chegou ao destino e as posições participantes foram atualizadas.',
    cancelled: 'A viagem foi cancelada sem alterar as posições.'
  };

  let map = null;
  let campaign = null;
  let role = 'player';
  let members = [];
  let currentTravel = null;
  let history = [];
  let destination = null;
  let route = null;
  let routeLine = null;
  let channel = null;
  let busy = false;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const getCampaignId = () => new URLSearchParams(location.search).get('campaign') || new URLSearchParams(location.search).get('id') || sessionStorage.getItem('afterlife_current_campaign_id') || '';
  const formatDistance = (meters) => {
    const km = Math.max(0, Number(meters) || 0) / 1000;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  };
  const formatDuration = (minutes) => {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    if (value < 60) return `${value} min`;
    const h = Math.floor(value / 60); const m = value % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  };
  const formatNumber = (value, digits = 1) => Number(value || 0).toFixed(digits).replace('.', ',');

  function selfPosition() {
    return window.__afterlifeCampaignMap?.getSelfPosition?.() || null;
  }

  function clearRoute() {
    if (routeLine) routeLine.remove();
    routeLine = null;
  }

  function drawRoute(points) {
    clearRoute();
    if (!map || !Array.isArray(points) || points.length < 2) return;
    routeLine = L.polyline(points, { weight: 5, opacity: 0.9, dashArray: '10 8', className: 'afterlife-travel-route' }).addTo(map);
  }

  function ensurePanel() {
    if ($('afterlifeTravelPanel')) return;
    const sidebar = document.querySelector('.map-sidebar');
    if (!sidebar) return;
    const panel = document.createElement('section');
    panel.id = 'afterlifeTravelPanel';
    panel.className = 'afterlife-travel-panel';
    panel.innerHTML = `
      <div class="afterlife-travel-panel__head">
        <div><span>DESLOCAMENTO</span><strong>VIAGEM</strong></div>
        <b id="afterlifeTravelStatusBadge">SEM VIAGEM</b>
      </div>
      <div id="afterlifeTravelCurrent" class="afterlife-travel-current"></div>
      <div id="afterlifeTravelMaster" class="afterlife-travel-master" hidden>
        <div class="afterlife-travel-block">
          <div class="afterlife-travel-label">DESTINO</div>
          <div id="afterlifeTravelDestination" class="afterlife-travel-destination">Clique no mapa ou escolha um local para definir.</div>
          <div class="afterlife-travel-actions"><button type="button" id="afterlifeTravelClearDestination" class="afterlife-travel-btn">LIMPAR</button></div>
        </div>
        <div class="afterlife-travel-block">
          <div class="afterlife-travel-label">PARTICIPANTES</div>
          <div id="afterlifeTravelParticipants" class="afterlife-travel-participants"></div>
        </div>
        <div class="afterlife-travel-grid">
          <label><span>RITMO (km/h)</span><input id="travelSpeed" type="number" min="0.1" max="300" step="0.1" value="5"></label>
          <label><span>COMBUSTÍVEL / km</span><input id="travelFuelPerKm" type="number" min="0" step="0.01" value="0"></label>
          <label><span>ENERGIA / km</span><input id="travelEnergyPerKm" type="number" min="0" step="0.01" value="0"></label>
          <label><span>EXPOSIÇÃO / km</span><input id="travelExposurePerKm" type="number" min="0" step="0.01" value="0"></label>
        </div>
        <div id="afterlifeTravelQuote" class="afterlife-travel-quote">Defina um destino para calcular a rota.</div>
        <button type="button" id="afterlifeTravelCreate" class="afterlife-travel-btn afterlife-travel-btn--primary" disabled>CRIAR VIAGEM</button>
      </div>
      <div id="afterlifeTravelNotice" class="afterlife-travel-notice"></div>
      <div class="afterlife-travel-history"><div class="afterlife-travel-label">HISTÓRICO</div><div id="afterlifeTravelHistoryList"></div></div>`;
    const anchor = $('masterTools') || sidebar.firstElementChild;
    anchor?.insertAdjacentElement('afterend', panel);

    $('afterlifeTravelClearDestination')?.addEventListener('click', () => { destination = null; route = null; clearRoute(); render(); });
    $('afterlifeTravelCreate')?.addEventListener('click', createTravel);
    ['travelSpeed','travelFuelPerKm','travelEnergyPerKm','travelExposurePerKm'].forEach((id) => $(id)?.addEventListener('input', () => refreshQuote()));
  }

  function renderParticipants() {
    const host = $('afterlifeTravelParticipants');
    if (!host) return;
    host.replaceChildren();
    const playable = (members || []).filter((m) => m.role !== 'master');
    if (!playable.length) {
      host.innerHTML = '<small>Nenhum sobrevivente disponível para a viagem.</small>';
      return;
    }
    const active = new Set(currentTravel?.participant_user_ids || []);
    playable.forEach((member) => {
      const label = document.createElement('label');
      label.className = 'afterlife-travel-check';
      const checked = active.size ? active.has(member.user_id) : true;
      label.innerHTML = `<input type="checkbox" data-travel-member="${esc(member.user_id)}" ${checked ? 'checked' : ''}><span>${esc(member.display_name || 'Sobrevivente')}</span>`;
      host.appendChild(label);
    });
  }

  function selectedParticipants() {
    return [...document.querySelectorAll('[data-travel-member]:checked')].map((input) => input.dataset.travelMember).filter(Boolean);
  }

  function currentOrigin() {
    const participants = selectedParticipants();
    const candidate = participants.map((id) => (members || []).find((m) => m.user_id === id)).find((m) => Number.isFinite(Number(m?.latitude)) && Number.isFinite(Number(m?.longitude)));
    if (candidate) return { lat: Number(candidate.latitude), lng: Number(candidate.longitude) };
    return selfPosition();
  }

  async function routeBetween(origin, target) {
    const direct = () => {
      const meters = map ? map.distance([origin.lat, origin.lng], [target.lat, target.lng]) : 0;
      return { distance_m: meters, geometry: [[origin.lat, origin.lng], [target.lat, target.lng]], provider: 'straight-line-fallback' };
    };
    for (const endpoint of ROUTE_ENDPOINTS) {
      try {
        const url = `${endpoint}/${origin.lng},${origin.lat};${target.lng},${target.lat}?overview=full&geometries=geojson&steps=false`;
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const first = data?.routes?.[0];
        const coords = first?.geometry?.coordinates;
        if (!first || !Array.isArray(coords) || coords.length < 2) throw new Error('ROUTE_EMPTY');
        return { distance_m: Number(first.distance) || 0, geometry: coords.map(([lng, lat]) => [Number(lat), Number(lng)]), provider: 'osrm' };
      } catch (error) { console.warn('[AFTERLIFE][TRAVEL][ROUTE]', error); }
    }
    return direct();
  }

  async function setDestination(point, name = 'Destino no mapa', locationId = null) {
    if (role !== 'master') return;
    const target = { lat: Number(point.lat), lng: Number(point.lng), name: String(name || 'Destino no mapa').slice(0, 140), locationId };
    if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return;
    destination = target;
    const origin = currentOrigin();
    route = null;
    render();
    if (!origin) return;
    const quote = $('afterlifeTravelQuote');
    if (quote) quote.textContent = 'Calculando rota…';
    try {
      route = await routeBetween(origin, target);
      drawRoute(route.geometry);
    } catch (error) {
      console.warn('[AFTERLIFE][TRAVEL][QUOTE]', error);
    }
    render();
  }

  function refreshQuote() {
    if (!destination || !route) { render(); return; }
    const speed = Math.max(0.1, Number($('travelSpeed')?.value) || 5);
    const fuelPerKm = Math.max(0, Number($('travelFuelPerKm')?.value) || 0);
    const energyPerKm = Math.max(0, Number($('travelEnergyPerKm')?.value) || 0);
    const exposurePerKm = Math.max(0, Number($('travelExposurePerKm')?.value) || 0);
    const km = route.distance_m / 1000;
    const minutes = Math.round((km / speed) * 60);
    const fuel = km * fuelPerKm;
    const energy = km * energyPerKm;
    const exposure = km * exposurePerKm;
    const quote = $('afterlifeTravelQuote');
    if (quote) quote.innerHTML = `<div><strong>${formatDistance(route.distance_m)}</strong><span>rota: ${esc(route.provider)}</span></div><div><strong>${formatDuration(minutes)}</strong><span>tempo estimado</span></div><div><strong>${formatNumber(fuel)}</strong><span>combustível</span></div><div><strong>${formatNumber(energy)}</strong><span>energia</span></div><div><strong>${formatNumber(exposure)}</strong><span>exposição</span></div>`;
  }

  function renderCurrent() {
    const host = $('afterlifeTravelCurrent');
    if (!host) return;
    const badge = $('afterlifeTravelStatusBadge');
    if (!currentTravel) {
      if (badge) { badge.textContent = 'SEM VIAGEM'; badge.dataset.status = 'idle'; }
      host.innerHTML = '<div class="afterlife-travel-empty">Nenhuma viagem ativa. O Mestre pode definir um destino no mapa.</div>';
      return;
    }
    if (badge) { badge.textContent = STATUS_LABEL[currentTravel.status] || currentTravel.status; badge.dataset.status = currentTravel.status; }
    host.innerHTML = `<div class="afterlife-travel-card"><div class="afterlife-travel-card__route"><span>ORIGEM</span><strong>${Number(currentTravel.origin_latitude).toFixed(4)}°, ${Number(currentTravel.origin_longitude).toFixed(4)}°</strong><i>→</i><span>DESTINO</span><strong>${esc(currentTravel.destination_name)}</strong></div><div class="afterlife-travel-card__metrics"><span><b>${formatDistance(currentTravel.distance_m)}</b> distância</span><span><b>${formatDuration(currentTravel.estimated_minutes)}</b> tempo</span><span><b>${formatNumber(currentTravel.fuel_cost)}</b> combustível</span></div><p>${esc(RESULT_LABEL[currentTravel.status] || '')}</p></div>`;
  }

  function renderHistory() {
    const host = $('afterlifeTravelHistoryList');
    if (!host) return;
    host.replaceChildren();
    history.slice(0, 6).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'afterlife-travel-history-row';
      row.innerHTML = `<span data-status="${esc(item.status)}"></span><div><strong>${esc(item.destination_name)}</strong><small>${STATUS_LABEL[item.status] || item.status} · ${formatDistance(item.distance_m)}</small></div>`;
      host.appendChild(row);
    });
    if (!history.length) host.innerHTML = '<small>Nenhuma viagem registrada.</small>';
  }

  function renderMaster() {
    const panel = $('afterlifeTravelMaster');
    if (!panel) return;
    panel.hidden = role !== 'master' || Boolean(currentTravel);
    if (role === 'master' && !currentTravel) {
      renderParticipants();
      const destinationEl = $('afterlifeTravelDestination');
      if (destinationEl) destinationEl.innerHTML = destination ? `<strong>${esc(destination.name)}</strong><small>${destination.lat.toFixed(5)}°, ${destination.lng.toFixed(5)}°${destination.locationId ? ' · local persistido' : ''}</small>` : 'Clique no mapa ou escolha um local para definir.';
      const create = $('afterlifeTravelCreate');
      if (create) create.disabled = !destination || !route || !selectedParticipants().length || busy;
      refreshQuote();
    }
  }

  function renderNotice(message = '') {
    const host = $('afterlifeTravelNotice');
    if (host) host.textContent = message;
  }

  function render() {
    renderCurrent();
    renderMaster();
    renderHistory();
  }

  async function loadTravels() {
    if (!campaign) return;
    const { data, error } = await aeriom.rpc('list_campaign_travels', { p_campaign_id: campaign.id, p_limit: 12 });
    if (error) throw error;
    history = Array.isArray(data) ? data : [];
    currentTravel = history.find((item) => item.status === 'planned' || item.status === 'in_transit') || null;
    if (currentTravel?.route?.geometry) {
      drawRoute(currentTravel.route.geometry);
    } else if (!currentTravel) {
      clearRoute();
    }
    render();
  }

  async function createTravel() {
    if (busy || role !== 'master' || !destination || !route) return;
    const origin = currentOrigin();
    if (!origin) return renderNotice('Nenhum participante possui posição válida para ser a origem.');
    const participants = selectedParticipants();
    if (!participants.length) return renderNotice('Selecione ao menos um sobrevivente.');
    busy = true; render(); renderNotice('Criando viagem…');
    try {
      const speed = Math.max(0.1, Number($('travelSpeed')?.value) || 5);
      const fuelPerKm = Math.max(0, Number($('travelFuelPerKm')?.value) || 0);
      const energyPerKm = Math.max(0, Number($('travelEnergyPerKm')?.value) || 0);
      const exposurePerKm = Math.max(0, Number($('travelExposurePerKm')?.value) || 0);
      const { data, error } = await aeriom.rpc('create_campaign_travel', {
        p_campaign_id: campaign.id,
        p_origin_latitude: origin.lat,
        p_origin_longitude: origin.lng,
        p_destination_latitude: destination.lat,
        p_destination_longitude: destination.lng,
        p_destination_location_id: destination.locationId,
        p_destination_name: destination.name,
        p_route: { provider: route.provider, geometry: route.geometry },
        p_distance_m: route.distance_m,
        p_speed_kmh: speed,
        p_fuel_per_km: fuelPerKm,
        p_energy_per_km: energyPerKm,
        p_exposure_per_km: exposurePerKm,
        p_participant_user_ids: participants
      });
      if (error) throw error;
      destination = null; route = null;
      clearRoute();
      await loadTravels();
      renderNotice('Viagem criada. O Mestre ainda precisa iniciá-la.');
    } catch (error) {
      console.error('[AFTERLIFE][TRAVEL][CREATE]', error);
      renderNotice(error?.message || 'Não foi possível criar a viagem.');
    } finally { busy = false; render(); }
  }

  async function actionTravel(fn, successMessage) {
    if (!currentTravel || busy || role !== 'master') return;
    busy = true; renderNotice('Atualizando viagem…');
    try {
      const { data, error } = await aeriom.rpc(fn, { p_travel_id: currentTravel.id });
      if (error) throw error;
      await loadTravels();
      if (fn === 'complete_campaign_travel') await window.__afterlifeCampaignMap?.refreshMembers?.();
      renderNotice(successMessage);
    } catch (error) {
      console.error('[AFTERLIFE][TRAVEL][ACTION]', fn, error);
      renderNotice(error?.message || 'Não foi possível atualizar a viagem.');
    } finally { busy = false; render(); }
  }

  function renderActionButtons() {
    const host = $('afterlifeTravelCurrent');
    if (!host || !currentTravel || role !== 'master') return;
    const actions = document.createElement('div');
    actions.className = 'afterlife-travel-card__actions';
    if (currentTravel.status === 'planned') {
      const start = document.createElement('button'); start.type='button'; start.className='afterlife-travel-btn afterlife-travel-btn--primary'; start.textContent='INICIAR DESLOCAMENTO'; start.onclick=()=>actionTravel('start_campaign_travel','Deslocamento iniciado.'); actions.appendChild(start);
    }
    if (currentTravel.status === 'in_transit') {
      const complete = document.createElement('button'); complete.type='button'; complete.className='afterlife-travel-btn afterlife-travel-btn--primary'; complete.textContent='CONCLUIR E MOVER GRUPO'; complete.onclick=()=>{ if(confirm('Concluir esta viagem e mover os participantes para o destino?')) actionTravel('complete_campaign_travel','Viagem concluída e grupo movido para o destino.'); }; actions.appendChild(complete);
    }
    if (currentTravel.status === 'planned' || currentTravel.status === 'in_transit') {
      const cancel = document.createElement('button'); cancel.type='button'; cancel.className='afterlife-travel-btn'; cancel.textContent='CANCELAR'; cancel.onclick=()=>{ if(confirm('Cancelar esta viagem?')) actionTravel('cancel_campaign_travel','Viagem cancelada.'); }; actions.appendChild(cancel);
    }
    host.appendChild(actions);
  }

  function subscribe() {
    if (!aeriom?.channel || !campaign) return;
    if (channel) { try { aeriom.removeChannel(channel); } catch {} }
    channel = aeriom.channel(`afterlife-travels-${campaign.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_travels', filter:`campaign_id=eq.${campaign.id}` }, () => loadTravels().catch((error) => console.warn('[AFTERLIFE][TRAVEL][REALTIME]', error)))
      .subscribe();
  }

  function bindWorldLocationEvents() {
    window.addEventListener('afterlife:world-location-opened', (event) => {
      const location = event.detail?.location;
      if (!location || role !== 'master' || !$('afterlifeLocationActions')) return;
      const actions = $('afterlifeLocationActions');
      const old = actions.querySelector('[data-travel-from-location]');
      old?.remove();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'location-action location-action--primary';
      button.dataset.travelFromLocation = '1';
      button.textContent = 'DEFINIR COMO DESTINO';
      button.onclick = () => {
        setDestination({ lat: Number(location.latitude), lng: Number(location.longitude) }, location.name || 'Destino', location.id || null);
        document.getElementById('afterlifeLocationModal')?.classList.remove('is-open');
        map?.setView([Number(location.latitude), Number(location.longitude)], Math.max(map.getZoom(), 15), { animate:true });
      };
      actions.insertBefore(button, actions.firstChild);
    });
  }

  function bindMapClicks() {
    if (!map || map.__afterlifeTravelBound) return;
    map.__afterlifeTravelBound = true;
    map.on('click', (event) => {
      if (role !== 'master') return;
      setDestination(event.latlng, 'Destino marcado no mapa');
    });
  }

  function bindMemberUpdates() {
    window.addEventListener('afterlife:map-members-updated', (event) => {
      members = Array.isArray(event.detail?.members) ? event.detail.members : [];
      if (role === 'master' && !currentTravel && destination) {
        const origin = currentOrigin();
        if (origin && route) { route = null; setDestination(destination, destination.name, destination.locationId); }
      }
      renderParticipants();
    });
  }

  function boot(detail) {
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    if (!map || !campaign) return;
    ensurePanel();
    bindMapClicks();
    bindWorldLocationEvents();
    bindMemberUpdates();
    window.__afterlifeTravel = {
      setDestination,
      clearDestination: () => { destination = null; route = null; clearRoute(); render(); }
    };
    (async () => {
      try {
        members = await window.__afterlifeCampaignMap?.refreshMembers?.() || [];
        await loadTravels();
        renderActionButtons();
      } catch (error) {
        console.error('[AFTERLIFE][TRAVEL][BOOT]', error);
        renderNotice(error?.message || 'Não foi possível carregar as viagens.');
      }
      subscribe();
    })();
  }

  window.addEventListener('afterlife:map-ready', (event) => boot(event.detail), { once:true });
  if (window.__afterlifeCampaignMap?.map && window.__afterlifeCampaignMap?.campaign) boot(window.__afterlifeCampaignMap);
})();
