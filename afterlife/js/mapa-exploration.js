import { ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';

  const STATE_KEY_PREFIX = 'afterlife.exploration.v1';
  const CELL_SIZE_METERS = 150;
  const PLAYER_VISION_METERS = 380;
  const REGION_RESET_METERS = 200000;
  const MAX_CELLS = 12000;
  const $ = (id) => document.getElementById(id);

  let map = null;
  let role = 'player';
  let campaign = null;
  let userId = null;
  let state = { anchor: null, cells: [], visitedRegions: [] };
  let overlay = null;
  let pollTimer = null;
  let renderQueued = false;

  const distance = (a, b) => (!map || !a || !b ? Infinity : map.distance([a.lat, a.lng], [b.lat, b.lng]));

  function stateKey() { return `${STATE_KEY_PREFIX}.${campaign?.id || 'unknown'}.${userId || 'anonymous'}`; }

  function loadState() {
    try {
      const raw = localStorage.getItem(stateKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.cells)) {
        state = {
          anchor: parsed.anchor || null,
          cells: parsed.cells.slice(-MAX_CELLS),
          visitedRegions: Array.isArray(parsed.visitedRegions) ? parsed.visitedRegions.slice(-100) : []
        };
      }
    } catch (error) { console.warn('[AFTERLIFE][EXPLORATION] state', error); }
  }

  function saveState() {
    try { localStorage.setItem(stateKey(), JSON.stringify(state)); }
    catch (error) { console.warn('[AFTERLIFE][EXPLORATION] save', error); }
  }

  function project(lat, lng) { return L.CRS.EPSG3857.project(L.latLng(lat, lng)); }
  function unproject(x, y) { return L.CRS.EPSG3857.unproject(L.point(x, y)); }
  function cellKey(x, y) { return `${x}:${y}`; }
  function cellFor(lat, lng) { const p = project(lat, lng); return { x: Math.floor(p.x / CELL_SIZE_METERS), y: Math.floor(p.y / CELL_SIZE_METERS) }; }

  function cellBounds(x, y) {
    const nw = unproject(x * CELL_SIZE_METERS, y * CELL_SIZE_METERS);
    const se = unproject((x + 1) * CELL_SIZE_METERS, (y + 1) * CELL_SIZE_METERS);
    return { nw, se };
  }

  function cellCenter(x, y) {
    const c = cellBounds(x, y);
    return { lat: (c.nw.lat + c.se.lat) / 2, lng: (c.nw.lng + c.se.lng) / 2 };
  }

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
        const meters = distance(position, c);
        if (meters <= maxDistance) {
          const key = cellKey(center.x + dx, center.y + dy);
          if (!set.has(key)) { set.add(key); state.cells.push(key); changed = true; }
        }
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

    for (const key of state.cells) {
      const [xs, ys] = key.split(':');
      const x = Number(xs); const y = Number(ys);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const bounds = cellBounds(x, y);
      const p1 = screenPoint(bounds.nw.lat, bounds.nw.lng);
      const p2 = screenPoint(bounds.nw.lat, bounds.se.lng);
      const p3 = screenPoint(bounds.se.lat, bounds.se.lng);
      const p4 = screenPoint(bounds.se.lat, bounds.nw.lng);
      const left = Math.min(p1.x, p4.x), top = Math.min(p1.y, p2.y), right = Math.max(p2.x, p3.x), bottom = Math.max(p4.y, p3.y);
      if (right < -20 || left > width + 20 || bottom < -20 || top > height + 20) continue;
      addHole(holes, left, top, right - left, bottom - top, 3);
    }

    if (position) {
      const p = screenPoint(position.lat, position.lng);
      addCircleHole(holes, p.x, p.y, metersToPixels(position.lat, PLAYER_VISION_METERS));
    }
  }

  function updatePanel(position) {
    $('explorationDiscoveredCount') && ($('explorationDiscoveredCount').textContent = String(state.cells.length));
    $('explorationRegionsVisited') && ($('explorationRegionsVisited').textContent = String(state.visitedRegions.length + (state.anchor ? 1 : 0)));
    $('explorationVisionRadius') && ($('explorationVisionRadius').textContent = `${PLAYER_VISION_METERS} m`);
    $('explorationHint') && ($('explorationHint').textContent = position ? 'A área clara mostra o que o sobrevivente consegue perceber agora. O que já foi descoberto permanece conhecido nesta região.' : 'Aguardando a posição do sobrevivente.');
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
    });
  }

  function hookMapEvents() {
    if (!map || map.__afterlifeExplorationBound) return;
    map.__afterlifeExplorationBound = true;
    map.on('moveend zoomend resize', queueRender);
    window.addEventListener('resize', queueRender, { passive: true });
  }

  async function refreshSelfPosition() {
    if (role !== 'player') return;
    try { await window.__afterlifeCampaignMap?.refreshMembers?.(); queueRender(); }
    catch (error) { console.warn('[AFTERLIFE][EXPLORATION] refresh', error); }
  }

  function startPolling() { if (!pollTimer && role === 'player') pollTimer = setInterval(refreshSelfPosition, 5000); }

  async function boot() {
    const session = await ensureAfterlifeSession();
    if (!session?.user) return;
    const ready = window.__afterlifeCampaignMap;
    if (!ready?.map || !ready.campaign) return;
    map = ready.map; role = ready.role || 'player'; campaign = ready.campaign; userId = session.user.id;
    if (role === 'master') return;
    loadState(); buildOverlay(); hookMapEvents(); queueRender(); startPolling();
  }

  window.addEventListener('afterlife:map-ready', boot, { once: true });
  window.addEventListener('afterlife:map-members-updated', queueRender);
  if (window.__afterlifeCampaignMap?.map) boot().catch((error) => console.warn('[AFTERLIFE][EXPLORATION]', error));
})();
