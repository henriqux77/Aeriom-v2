import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeWorldLocationsBooted) return;
  window.__afterlifeWorldLocationsBooted = true;

  const $ = (id) => document.getElementById(id);
  const LOCATION_RADIUS_METERS = 1200;
  const DEFAULTS = {
    low: ['food','water'],
    hospital: ['medical','supplies'],
    pharmacy: ['medical','supplies'],
    fuel: ['fuel','parts'],
    workshop: ['tools','parts'],
    police: ['supplies','equipment'],
    military: ['equipment','ammo','fuel'],
    school: ['food','supplies'],
    commerce: ['food','supplies'],
    market: ['food','water','supplies']
  };

  let campaign = null;
  let role = 'player';
  let map = null;
  let current = null;
  let busy = false;
  let channel = null;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const normalizeCategory = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const getCampaignId = () => new URLSearchParams(location.search).get('campaign') || new URLSearchParams(location.search).get('id') || sessionStorage.getItem('afterlife_current_campaign_id') || '';

  function buildResources(category) {
    const key = normalizeCategory(category);
    let names = DEFAULTS.low;
    if (key.includes('hospital')) names = DEFAULTS.hospital;
    else if (key.includes('farmacia')) names = DEFAULTS.pharmacy;
    else if (key.includes('posto')) names = DEFAULTS.fuel;
    else if (key.includes('oficina')) names = DEFAULTS.workshop;
    else if (key.includes('delegacia')) names = DEFAULTS.police;
    else if (key.includes('militar')) names = DEFAULTS.military;
    else if (key.includes('escola')) names = DEFAULTS.school;
    else if (key.includes('mercado') || key.includes('comercio')) names = DEFAULTS.market;
    const result = {};
    names.forEach((name) => { result[name] = 50; });
    return result;
  }

  function formatCondition(value) {
    const map = { operational:'Operacional', unknown:'Desconhecido', damaged:'Danificado', partially_looted:'Parcialmente saqueado', looted:'Saqueado', abandoned:'Abandonado', destroyed:'Destruído' };
    return map[value] || value || 'Desconhecido';
  }

  function formatDanger(value) {
    const map = { low:'Baixo', medium:'Médio', high:'Alto', critical:'Crítico', unknown:'Não definido' };
    return map[value] || value || 'Não definido';
  }

  function formatTime(value) {
    if (!value) return 'Nunca';
    const diff = Math.max(0, Date.now() - new Date(value).getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `há ${hour}h`;
    return `há ${Math.floor(hour / 24)}d`;
  }

  function ensureModal() {
    if ($('afterlifeLocationModal')) return;
    const modal = document.createElement('div');
    modal.id = 'afterlifeLocationModal';
    modal.className = 'afterlife-location-modal';
    modal.innerHTML = `<div class="afterlife-location-card" role="dialog" aria-modal="true" aria-labelledby="afterlifeLocationTitle">
      <header class="afterlife-location-head"><div><span id="afterlifeLocationCategory">LOCAL</span><h2 id="afterlifeLocationTitle">Local</h2></div><button type="button" id="afterlifeLocationClose" aria-label="Fechar">×</button></header>
      <div class="afterlife-location-body">
        <div class="afterlife-location-meta"><span id="afterlifeLocationAddress"></span><span id="afterlifeLocationDistance"></span></div>
        <div class="afterlife-location-grid">
          <div><span>ESTADO</span><strong id="afterlifeLocationCondition">Desconhecido</strong></div>
          <div><span>PERIGO</span><strong id="afterlifeLocationDanger">Não definido</strong></div>
          <div><span>RECURSOS</span><strong id="afterlifeLocationSupply">—</strong></div>
          <div><span>VISITADO</span><strong id="afterlifeLocationVisited">Nunca</strong></div>
        </div>
        <div class="afterlife-location-note" id="afterlifeLocationNote"></div>
        <div class="afterlife-location-actions" id="afterlifeLocationActions"></div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    $('afterlifeLocationClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  function closeModal() { $('afterlifeLocationModal')?.classList.remove('is-open'); current = null; }

  function renderModal(location) {
    ensureModal();
    current = location;
    $('afterlifeLocationCategory').textContent = String(location.category || 'LOCAL').toUpperCase();
    $('afterlifeLocationTitle').textContent = location.name || 'Local';
    $('afterlifeLocationAddress').textContent = location.address || `${Number(location.latitude).toFixed(5)}°, ${Number(location.longitude).toFixed(5)}°`;
    $('afterlifeLocationDistance').textContent = '';
    $('afterlifeLocationCondition').textContent = formatCondition(location.state?.condition);
    $('afterlifeLocationDanger').textContent = formatDanger(location.danger);
    const resources = location.resources && typeof location.resources === 'object' ? Object.entries(location.resources) : [];
    $('afterlifeLocationSupply').textContent = resources.length ? resources.map(([k,v]) => `${k}: ${v}%`).join(' · ') : 'Não definido';
    $('afterlifeLocationVisited').textContent = formatTime(location.last_visited_at);
    const note = $('afterlifeLocationNote');
    note.innerHTML = location.note ? `<strong>NOTA DO MESTRE</strong><p>${esc(location.note)}</p>` : '<span>Nenhuma observação registrada.</span>';
    const actions = $('afterlifeLocationActions');
    actions.replaceChildren();
    if (role === 'master') {
      const edit = document.createElement('button'); edit.className = 'location-action location-action--primary'; edit.textContent = 'EDITAR ESTADO'; edit.onclick = () => renderMasterEditor(location);
      actions.appendChild(edit);
    } else if (!location.last_visited_at) {
      const visit = document.createElement('button'); visit.className = 'location-action location-action--primary'; visit.textContent = 'MARCAR COMO VISITADO'; visit.onclick = () => markVisited(location.id);
      actions.appendChild(visit);
    }
    const close = document.createElement('button'); close.className = 'location-action'; close.textContent = 'FECHAR'; close.onclick = closeModal; actions.appendChild(close);
    $('afterlifeLocationModal').classList.add('is-open');
  }

  function renderMasterEditor(location) {
    const body = $('afterlifeLocationNote');
    const actions = $('afterlifeLocationActions');
    const resources = location.resources && typeof location.resources === 'object' ? location.resources : {};
    $('afterlifeLocationCondition').innerHTML = `<select id="locationConditionEdit"><option value="unknown">Desconhecido</option><option value="operational">Operacional</option><option value="damaged">Danificado</option><option value="partially_looted">Parcialmente saqueado</option><option value="looted">Saqueado</option><option value="abandoned">Abandonado</option><option value="destroyed">Destruído</option></select>`;
    $('locationConditionEdit').value = location.state?.condition || 'unknown';
    $('afterlifeLocationDanger').innerHTML = `<select id="locationDangerEdit"><option value="unknown">Não definido</option><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select>`;
    $('locationDangerEdit').value = location.danger || 'unknown';
    const noteValue = location.note || '';
    body.innerHTML = `<strong>NOTA DO MESTRE</strong><textarea id="locationNoteEdit" maxlength="600" placeholder="Escreva o que os jogadores podem descobrir aqui.">${esc(noteValue)}</textarea><div class="location-resource-editor"><span>RECURSOS (%)</span>${Object.entries(resources).map(([k,v]) => `<label>${esc(k)}<input type="number" min="0" max="100" value="${Number(v)||0}" data-resource="${esc(k)}"></label>`).join('') || '<small>Defina recursos para este local.</small>'}</div>`;
    actions.replaceChildren();
    const save = document.createElement('button'); save.className = 'location-action location-action--primary'; save.textContent = 'SALVAR ALTERAÇÕES'; save.onclick = () => saveMasterEdit(location);
    const cancel = document.createElement('button'); cancel.className = 'location-action'; cancel.textContent = 'CANCELAR'; cancel.onclick = () => renderModal(location);
    actions.append(save, cancel);
  }

  async function saveMasterEdit(location) {
    if (busy) return; busy = true;
    try {
      const resources = {};
      document.querySelectorAll('#afterlifeLocationNote [data-resource]').forEach((input) => {
        const value = Math.max(0, Math.min(100, Number(input.value) || 0)); resources[input.dataset.resource] = value;
      });
      const { data, error } = await aeriom.rpc('update_campaign_world_location', {
        p_id: location.id,
        p_condition: $('locationConditionEdit')?.value || null,
        p_resources: resources,
        p_danger: $('locationDangerEdit')?.value || null,
        p_note: $('locationNoteEdit')?.value?.trim() || ''
      });
      if (error) throw error;
      renderModal(data || { ...location, state:{ ...(location.state||{}), condition:$('locationConditionEdit')?.value }, resources, danger:$('locationDangerEdit')?.value, note:$('locationNoteEdit')?.value?.trim() || '' });
    } catch (error) {
      alert(error?.message || 'Não foi possível salvar o local.');
    } finally { busy = false; }
  }

  async function markVisited(id) {
    if (busy) return; busy = true;
    try {
      const { data, error } = await aeriom.rpc('visit_campaign_world_location', { p_id: id });
      if (error) throw error;
      renderModal(data);
    } catch (error) { alert(error?.message || 'Não foi possível registrar a visita.'); }
    finally { busy = false; }
  }

  async function ensureLocation({ name, category, lat, lng, address = '', externalId = '' }) {
    const session = await ensureAfterlifeSession();
    if (!session?.user || !campaign) return null;
    const id = externalId || `latlng:${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}:${String(name).toLowerCase()}`;
    const { data, error } = await aeriom.rpc('upsert_campaign_world_location', {
      p_campaign_id: campaign.id,
      p_source: 'osm',
      p_external_id: id,
      p_name: name || 'Local sem nome',
      p_category: category || 'Ponto de interesse',
      p_latitude: Number(lat),
      p_longitude: Number(lng),
      p_address: address || null,
      p_metadata: { generated_defaults: buildResources(category) }
    });
    if (error) throw error;
    const location = Array.isArray(data) ? data[0] : data;
    if (location && (!location.resources || !Object.keys(location.resources).length) && location.created_at) {
      const defaults = buildResources(category);
      if (Object.keys(defaults).length) {
        try { await aeriom.rpc('update_campaign_world_location', { p_id: location.id, p_resources: defaults }); location.resources = defaults; } catch {}
      }
    }
    return location;
  }

  function injectPopupAction(popup) {
    const source = popup?.source;
    if (!(source instanceof L.CircleMarker)) return;
    const container = popup.getElement()?.querySelector('.leaflet-popup-content');
    if (!container || container.querySelector('.afterlife-open-location')) return;
    const strong = container.querySelector('strong');
    const span = container.querySelector('span');
    const name = strong?.textContent?.replace(/^\S+\s*/,'').trim() || 'Local sem nome';
    const category = span?.textContent?.trim() || 'Ponto de interesse';
    const point = source.getLatLng();
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'afterlife-open-location'; button.textContent = 'ABRIR FICHA';
    button.addEventListener('click', async () => {
      button.disabled = true; button.textContent = 'CARREGANDO…';
      try {
        const location = await ensureLocation({ name, category, lat: point.lat, lng: point.lng, externalId: `osm:${point.lat.toFixed(6)}:${point.lng.toFixed(6)}:${name.toLowerCase()}` });
        if (!location) throw new Error('Não foi possível carregar a ficha.');
        renderModal(location);
        map.closePopup();
      } catch (error) { alert(error?.message || 'Não foi possível abrir a ficha.'); }
      finally { button.disabled = false; button.textContent = 'ABRIR FICHA'; }
    });
    container.appendChild(button);
  }

  async function loadCachedForMap() {
    if (!campaign) return;
    const center = map.getCenter();
    const { data, error } = await aeriom.from('campaign_world_locations').select('*').eq('campaign_id', campaign.id).gte('latitude', center.lat - 0.08).lte('latitude', center.lat + 0.08).gte('longitude', center.lng - 0.08).lte('longitude', center.lng + 0.08).order('updated_at', { ascending:false }).limit(120);
    if (error) return;
    window.__afterlifeWorldLocationsCache = Array.isArray(data) ? data : [];
  }

  function subscribeRealtime() {
    if (!aeriom?.channel || !campaign) return;
    channel = aeriom.channel(`afterlife-world-locations-${campaign.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_world_locations', filter:`campaign_id=eq.${campaign.id}` }, (payload) => {
        const next = payload.new || payload.old;
        window.__afterlifeWorldLocationsCache = Array.isArray(window.__afterlifeWorldLocationsCache) ? window.__afterlifeWorldLocationsCache : [];
        if (payload.eventType === 'DELETE') window.__afterlifeWorldLocationsCache = window.__afterlifeWorldLocationsCache.filter((x)=>x.id!==next.id);
        else {
          const index = window.__afterlifeWorldLocationsCache.findIndex((x)=>x.id===next.id);
          if(index>=0) window.__afterlifeWorldLocationsCache[index]=next; else window.__afterlifeWorldLocationsCache.push(next);
          if(current?.id===next.id && $('afterlifeLocationModal')?.classList.contains('is-open')) renderModal(next);
        }
      }).subscribe();
  }

  async function bootReady(detail) {
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    if (!map || !campaign) return;
    ensureModal();
    map.on('popupopen', injectPopupAction);
    await loadCachedForMap();
    subscribeRealtime();
    if (role === 'master') {
      try { await aeriom.rpc('prune_campaign_world_locations', { p_campaign_id: campaign.id }); } catch {}
    }
  }

  window.addEventListener('afterlife:map-ready', (event) => bootReady(event.detail));
  if (window.__afterlifeCampaignMap?.map) bootReady(window.__afterlifeCampaignMap).catch((error)=>console.warn('[AFTERLIFE][LOCATIONS]',error));
})();
