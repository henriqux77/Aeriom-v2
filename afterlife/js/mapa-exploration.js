import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';

  const STATE_KEY_PREFIX = 'afterlife.exploration.v2';
  const CELL_SIZE_METERS = 150;
  const PLAYER_VISION_METERS = 380;
  const REGION_RESET_METERS = 200000;
  const MAX_CELLS = 240;
  const DISCOVERY_MIN_INTERVAL = 900;
  const POI_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const POI_QUERY = `[out:json][timeout:10];(nwr(around:650,{LAT},{LNG})[name][shop~"supermarket|convenience|bakery|butcher|hardware|electronics|car_repair|pet|mall|department_store"];nwr(around:650,{LAT},{LNG})[name][amenity~"restaurant|fast_food|cafe|bar|pub|pharmacy|hospital|clinic|doctors|dentist|veterinary|fuel|charging_station|bank|atm|police|fire_station|school|college|university|library|place_of_worship|shelter|marketplace|cinema|theatre"];nwr(around:650,{LAT},{LNG})[name][leisure~"park|sports_centre|stadium|swimming_pool|fitness_centre"];nwr(around:650,{LAT},{LNG})[name][tourism~"hotel|hostel|museum|attraction|camp_site"];nwr(around:650,{LAT},{LNG})[name][craft];);out center tags;`;
  const $ = (id) => document.getElementById(id);

  let map = null;
  let role = 'player';
  let campaign = null;
  let userId = null;
  let state = { anchor: null, cells: [], visitedRegions: [], sighted: {}, discovered: {}, attempted: {} };
  let overlay = null;
  let pollTimer = null;
  let renderQueued = false;
  let discoveryTimer = null;
  let discoveryBusy = false;
  let lastDiscoveryCenter = null;
  let discoveredMarkers = new Map();
  let knownLocations = new Map();

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const normalizeName = (v) => String(v || 'Local').trim().replace(/\s+/g, ' ');
  const poiType = (tags) => {
    if (tags?.shop) return 'Comércio';
    const mapType = { hospital:'Hospital', clinic:'Clínica', pharmacy:'Farmácia', fuel:'Posto', police:'Delegacia', school:'Escola', college:'Faculdade', university:'Universidade', supermarket:'Mercado', marketplace:'Mercado' };
    return mapType[tags?.amenity] || (tags?.craft ? 'Oficina' : 'Ponto de interesse');
  };
  const poiName = (tags) => tags?.name || tags?.brand || tags?.operator || 'Local sem nome';
  const locationKey = (poi) => `osm:${poi.id}`;

  function stateKey() { return `${STATE_KEY_PREFIX}.${campaign?.id || 'unknown'}.${userId || 'anonymous'}`; }

  function loadState() {
    try {
      const raw = localStorage.getItem(stateKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      state = {
        anchor: parsed.anchor || null,
        cells: Array.isArray(parsed.cells) ? parsed.cells.slice(-MAX_CELLS) : [],
        visitedRegions: Array.isArray(parsed.visitedRegions) ? parsed.visitedRegions.slice(-100) : [],
        sighted: parsed.sighted && typeof parsed.sighted === 'object' ? parsed.sighted : {},
        discovered: parsed.discovered && typeof parsed.discovered === 'object' ? parsed.discovered : {},
        attempted: parsed.attempted && typeof parsed.attempted === 'object' ? parsed.attempted : {}
      };
    } catch (error) { console.warn('[AFTERLIFE][EXPLORATION][STATE]', error); }
  }

  function saveState() {
    try { localStorage.setItem(stateKey(), JSON.stringify(state)); }
    catch (error) { console.warn('[AFTERLIFE][EXPLORATION][SAVE]', error); }
  }

  function distance(a, b) { return !map || !a || !b ? Infinity : map.distance([a.lat, a.lng], [b.lat, b.lng]); }
  function project(lat, lng) { return L.CRS.EPSG3857.project(L.latLng(lat, lng)); }
  function unproject(x, y) { return L.CRS.EPSG3857.unproject(L.point(x, y)); }
  function cellKey(x, y) { return `${x}:${y}`; }
  function cellFor(lat, lng) { const p = project(lat, lng); return { x: Math.floor(p.x / CELL_SIZE_METERS), y: Math.floor(p.y / CELL_SIZE_METERS) }; }
  function cellBounds(x, y) { return { nw: unproject(x * CELL_SIZE_METERS, y * CELL_SIZE_METERS), se: unproject((x + 1) * CELL_SIZE_METERS, (y + 1) * CELL_SIZE_METERS) }; }
  function cellCenter(x, y) { const c = cellBounds(x, y); return { lat: (c.nw.lat + c.se.lat) / 2, lng: (c.nw.lng + c.se.lng) / 2 }; }

  function discoverAround(position) {
    if (!position) return false;
    if (!state.anchor) state.anchor = { lat: position.lat, lng: position.lng };
    else if (distance(state.anchor, position) > REGION_RESET_METERS) {
      state.visitedRegions.push({ lat: state.anchor.lat, lng: state.anchor.lng, at: Date.now() });
      state.anchor = { lat: position.lat, lng: position.lng };
      state.cells = [];
    }

    const center = cellFor(position.lat, position.lng);
    const radius = Math.ceil(PLAYER_VISION_METERS / CELL_SIZE_METERS) + 2;
    const maxDistance = PLAYER_VISION_METERS + CELL_SIZE_METERS * 0.75;
    const set = new Set(state.cells);
    let changed = false;

    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const c = cellCenter(center.x + dx, center.y + dy);
        if (distance(position, c) > maxDistance) continue;
        const key = cellKey(center.x + dx, center.y + dy);
        if (!set.has(key)) { set.add(key); state.cells.push(key); changed = true; }
      }
    }

    if (state.cells.length > MAX_CELLS) state.cells = state.cells.slice(-MAX_CELLS);
    if (changed) saveState();
    return changed;
  }

  function getSelfPosition() { return window.__afterlifeCampaignMap?.getSelfPosition?.() || null; }

  function buildOverlay() {
    const host = $('worldMap');
    if (!host || overlay) return;
    overlay = document.createElement('svg');
    overlay.className = 'afterlife-exploration-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<defs><mask id="afterlifeExplorationMask"><rect x="0" y="0" width="100%" height="100%" fill="white"></rect><g id="afterlifeExplorationHoles" fill="black"></g></mask></defs><rect id="afterlifeExplorationFog" x="0" y="0" width="100%" height="100%" fill="#030604" fill-opacity="0.87" mask="url(#afterlifeExplorationMask)"></rect>';
    host.appendChild(overlay);
  }

  function screenPoint(lat, lng) { const p = map.latLngToContainerPoint([lat, lng]); return { x: p.x, y: p.y }; }
  function addHole(group, x, y, w, h, radius = 0) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    node.setAttribute('x', String(x)); node.setAttribute('y', String(y)); node.setAttribute('width', String(Math.max(0, w))); node.setAttribute('height', String(Math.max(0, h)));
    if (radius) { node.setAttribute('rx', String(radius)); node.setAttribute('ry', String(radius)); }
    group.appendChild(node);
  }
  function addCircleHole(group, cx, cy, r) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('cx', String(cx)); node.setAttribute('cy', String(cy)); node.setAttribute('r', String(Math.max(0, r))); group.appendChild(node);
  }
  function metersToPixels(lat, meters) {
    const lngDelta = meters / (111320 * Math.max(0.18, Math.cos((lat * Math.PI) / 180)));
    const p1 = map.latLngToContainerPoint([lat, 0]);
    const p2 = map.latLngToContainerPoint([lat, lngDelta]);
    return Math.abs(p2.x - p1.x);
  }

  function renderOverlay(position) {
    if (!overlay || role !== 'player' || !map) return;
    const host = $('worldMap');
    const holes = overlay.querySelector('#afterlifeExplorationHoles');
    if (!holes) return;
    holes.replaceChildren();
    const width = host.clientWidth;
    const height = host.clientHeight;
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    overlay.setAttribute('width', String(width));
    overlay.setAttribute('height', String(height));

    // A survivor sees only the current perception radius. Previously discovered
    // places are remembered as data/markers, but do not permanently reveal map tiles.
    if (position) {
      const p = screenPoint(position.lat, position.lng);
      addCircleHole(holes, p.x, p.y, metersToPixels(position.lat, PLAYER_VISION_METERS));
    }
  }

  function updatePanel(position) {
    $('explorationDiscoveredCount') && ($('explorationDiscoveredCount').textContent = String(Object.keys(state.discovered).length));
    $('explorationRegionsVisited') && ($('explorationRegionsVisited').textContent = String(state.visitedRegions.length + (state.anchor ? 1 : 0)));
    $('explorationVisionRadius') && ($('explorationVisionRadius').textContent = `${PLAYER_VISION_METERS} m`);
    $('explorationHint') && ($('explorationHint').textContent = position ? 'A área clara mostra sua percepção atual. Locais identificados permanecem conhecidos e podem ser investigados na próxima etapa.' : 'Aguardando a posição do sobrevivente.');
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      const position = getSelfPosition();
      if (position) discoverAround(position);
      renderOverlay(position);
      updatePanel(position);
      renderDiscoveredMarkers(position);
    });
  }

  let correctingView = false;
  function enforcePlayerView() {
    if (role !== 'player' || !map || correctingView) return;
    const self = getSelfPosition();
    if (!self) return;
    const center = map.getCenter();
    const d = map.distance(center, [self.lat, self.lng]);
    if (d > 460) {
      correctingView = true;
      map.setView([self.lat, self.lng], Math.max(map.getZoom(), 16), { animate: true });
      window.setTimeout(() => { correctingView = false; }, 420);
    }
    if (map.getZoom() < 16) map.setZoom(16, { animate: false });
  }

  function hookMapEvents() {
    if (!map || map.__afterlifeExplorationBound) return;
    map.__afterlifeExplorationBound = true;
    map.on('moveend zoomend resize dragend', () => { enforcePlayerView(); queueRender(); });
    window.addEventListener('resize', () => { enforcePlayerView(); queueRender(); }, { passive: true });
  }

  function showToast(title, text, kind = 'info') {
    const host = $('worldMap');
    if (!host) return;
    let toast = host.querySelector('.afterlife-discovery-toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'afterlife-discovery-toast'; host.appendChild(toast); }
    toast.dataset.kind = kind;
    toast.innerHTML = `<strong>${esc(title)}</strong><span>${esc(text)}</span>`;
    toast.classList.remove('is-visible');
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => toast.classList.remove('is-visible'), 4800);
  }

  function markerForLocation(location) {
    if (!map || !location) return null;
    const discovered = Boolean(location.discovered);
    const marker = L.circleMarker([Number(location.latitude), Number(location.longitude)], {
      radius: discovered ? 7 : 5,
      weight: discovered ? 2 : 1,
      opacity: discovered ? 0.95 : 0.45,
      fillOpacity: discovered ? 0.82 : 0.28,
      className: discovered ? 'afterlife-discovered-location' : 'afterlife-sighted-location'
    });
    marker.bindTooltip(discovered ? normalizeName(location.name) : 'Algo foi avistado aqui', { direction: 'top', offset: [0, -7] });
    marker.bindPopup(`<strong>${esc(discovered ? normalizeName(location.name) : 'Local avistado')}</strong><br><span>${esc(location.category || 'Ponto de interesse')}</span>`);
    marker.addTo(map);
    return marker;
  }

  function clearDiscoveredMarkers() { discoveredMarkers.forEach((marker) => marker.remove()); discoveredMarkers.clear(); }

  function renderDiscoveredMarkers(position) {
    if (!map || role !== 'player') return;
    clearDiscoveredMarkers();
    const maxKnownDistance = PLAYER_VISION_METERS;
    for (const location of knownLocations.values()) {
      const lat = Number(location.latitude); const lng = Number(location.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (!location.discovered && !state.sighted[location.id]) continue;
      if (position && distance(position, { lat, lng }) > maxKnownDistance) continue;
      const marker = markerForLocation(location);
      if (marker) discoveredMarkers.set(location.id, marker);
    }
  }

  async function refreshSelfPosition() {
    if (role !== 'player') return;
    try { await window.__afterlifeCampaignMap?.refreshMembers?.(); queueRender(); }
    catch (error) { console.warn('[AFTERLIFE][EXPLORATION][POSITION]', error); }
  }

  async function getNearbyPois(position) {
    if (!position) return [];
    const q = POI_QUERY.replaceAll('{LAT}', Number(position.lat).toFixed(6)).replaceAll('{LNG}', Number(position.lng).toFixed(6));
    for (const endpoint of POI_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: q });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return (data.elements || []).map((it) => {
          const lat = Number(it.lat ?? it.center?.lat); const lng = Number(it.lon ?? it.center?.lon); const tags = it.tags || {};
          return { id: `${it.type}:${it.id}`, lat, lng, name: poiName(tags), category: poiType(tags) };
        }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
          .filter((p) => map.distance([position.lat, position.lng], [p.lat, p.lng]) <= PLAYER_VISION_METERS)
          .filter((p, i, arr) => i === arr.findIndex((x) => x.name === p.name && Math.abs(x.lat-p.lat) < .00008 && Math.abs(x.lng-p.lng) < .00008))
          .slice(0, 50);
      } catch (error) { console.warn('[AFTERLIFE][EXPLORATION][POI]', endpoint, error); }
    }
    return [];
  }

  async function ensureLocation(poi) {
    const externalId = locationKey(poi);
    const { data, error } = await aeriom.rpc('discover_campaign_world_location', {
      p_campaign_id: campaign.id,
      p_source: 'osm',
      p_external_id: externalId,
      p_name: normalizeName(poi.name),
      p_category: poi.category || 'Ponto de interesse',
      p_latitude: Number(poi.lat),
      p_longitude: Number(poi.lng),
      p_address: null,
      p_metadata: { discovery_source: 'player-perception', osm_id: poi.id }
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function autoDiscover(position) {
    if (role !== 'player' || !campaign || discoveryBusy || !position) return;
    if (lastDiscoveryCenter && distance(lastDiscoveryCenter, position) < DISCOVERY_MIN_INTERVAL) return;
    lastDiscoveryCenter = { lat: position.lat, lng: position.lng };
    discoveryBusy = true;
    try {
      const pois = await getNearbyPois(position);
      if (!pois.length) return;
      for (const poi of pois) {
        const key = locationKey(poi);
        if (state.attempted[key]) continue;
        const location = await ensureLocation(poi);
        if (!location) continue;
        knownLocations.set(location.id, location);
        state.attempted[key] = { locationId: location.id, at: Date.now() };
        state.sighted[location.id] = { name: location.name, lat: location.latitude, lng: location.longitude, at: Date.now() };
        saveState();

        try {
          const { data, error } = await aeriom.rpc('resolve_location_action', { p_location_id: location.id, p_action_key: 'observe' });
          if (error) throw error;
          const result = data || {};
          knownLocations.set(location.id, { ...location, discovered: Boolean(result.discovered) });
          if (result.discovered) {
            state.discovered[location.id] = { name: location.name, level: result.discovery_level || 'identified', at: Date.now() };
            showToast(`LOCAL DESCOBERTO · ${location.name}`, result.discovery_text || 'Você conseguiu identificar este local.', 'success');
          } else {
            showToast('ALGO FOI AVISTADO', result.discovery_text || 'Há algo nesta região, mas ainda não foi possível identificar.', 'sighted');
          }
          saveState();
          renderDiscoveredMarkers(position);
          await new Promise((resolve) => setTimeout(resolve, 160));
        } catch (error) {
          console.warn('[AFTERLIFE][EXPLORATION][OBSERVE]', location.id, error);
        }
      }
      updatePanel(position);
    } catch (error) {
      console.warn('[AFTERLIFE][EXPLORATION][DISCOVERY]', error);
    } finally {
      discoveryBusy = false;
    }
  }

  function scheduleDiscovery(position) {
    clearTimeout(discoveryTimer);
    discoveryTimer = setTimeout(() => autoDiscover(position), 650);
  }

  async function loadKnownLocations() {
    if (!campaign) return;
    try {
      const { data, error } = await aeriom.rpc('list_campaign_visible_world_locations', { p_campaign_id: campaign.id });
      if (error) throw error;
      knownLocations.clear();
      (data || []).forEach((location) => {
        if (role === 'player' && !location.discovered && !state.sighted[location.id]) return;
        knownLocations.set(location.id, location);
        if (location.discovered) state.discovered[location.id] ||= { name: location.name, at: Date.now() };
      });
      saveState();
      queueRender();
    } catch (error) { console.warn('[AFTERLIFE][EXPLORATION][LOCATIONS]', error); }
  }

  function subscribeLocations() {
    if (!aeriom?.channel || !campaign) return;
    const channel = aeriom.channel(`afterlife-exploration-${campaign.id}-${userId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_world_locations', filter:`campaign_id=eq.${campaign.id}` }, (payload) => {
        const location = payload.new || payload.old;
        if (!location?.id) return;
        if (payload.eventType === 'DELETE') {
          knownLocations.delete(location.id);
          delete state.sighted[location.id];
          delete state.discovered[location.id];
          for (const [attemptKey, attempt] of Object.entries(state.attempted)) if (attempt?.locationId === location.id) delete state.attempted[attemptKey];
          saveState();
          queueRender();
          return;
        }
        if (role === 'player' && !location.discovered && !state.sighted[location.id]) return;
        knownLocations.set(location.id, location);
        if (location.discovered) state.discovered[location.id] ||= { name: location.name, at: Date.now() };
        saveState();
        queueRender();
      }).subscribe();
    window.__afterlifeExplorationChannel = channel;
  }

  function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }
  function startPolling() { if (!pollTimer && role === 'player') pollTimer = setInterval(refreshSelfPosition, 5000); }

  async function boot() {
    const session = await ensureAfterlifeSession();
    if (!session?.user) return;
    const ready = window.__afterlifeCampaignMap;
    if (!ready?.map || !ready.campaign) return;
    map = ready.map; role = ready.role || 'player'; campaign = ready.campaign; userId = session.user.id;
    if (role === 'master') return;
    loadState(); buildOverlay(); hookMapEvents(); enforcePlayerView();
    await loadKnownLocations();
    subscribeLocations();
    queueRender();
    scheduleDiscovery(getSelfPosition());
    startPolling();
  }

  function cleanup() {
    stopPolling();
    clearTimeout(discoveryTimer);
    try { if (window.__afterlifeExplorationChannel) aeriom.removeChannel(window.__afterlifeExplorationChannel); } catch (error) { console.warn('[AFTERLIFE][EXPLORATION][CLEANUP]', error); }
    window.__afterlifeExplorationChannel = null;
  }

  window.__afterlifeExploration = { refresh: () => { queueRender(); scheduleDiscovery(getSelfPosition()); }, getKnownLocations: () => [...knownLocations.values()] };
  window.addEventListener('afterlife:map-ready', boot, { once: true });
  window.addEventListener('afterlife:map-members-updated', () => { queueRender(); scheduleDiscovery(getSelfPosition()); });
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('beforeunload', cleanup, { once: true });
  if (window.__afterlifeCampaignMap?.map) boot().catch((error) => console.warn('[AFTERLIFE][EXPLORATION]', error));
})();
