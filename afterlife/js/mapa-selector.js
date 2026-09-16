import './shared-profile.js?v=20260916-1';

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const returnTarget = qs.get('return') === 'create' ? './campanhas.html?create=1' : './campanhas.html?create=1';

  let map = null;
  let marker = null;
  let selected = null;
  let searchTimer = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyle() {
    if ($('afterlife-map-picker-style')) return;
    const style = document.createElement('style');
    style.id = 'afterlife-map-picker-style';
    style.textContent = `
      body.afterlife-map-picker .map-head{padding-bottom:14px}
      body.afterlife-map-picker .map-head .eyebrow{color:#63f6a8}
      body.afterlife-map-picker .map-context-copy{color:#a4b2aa}
      body.afterlife-map-picker .map-layout{grid-template-columns:1fr}
      body.afterlife-map-picker .map-sidebar{display:none!important}
      body.afterlife-map-picker .map-shell{min-height:calc(100vh - 220px)}
      body.afterlife-map-picker #worldMap{height:min(70vh,700px)!important;min-height:420px;border-radius:18px;overflow:hidden}
      body.afterlife-map-picker .map-mode-note{display:flex;justify-content:space-between;align-items:center;gap:12px}
      .afterlife-picker-panel{display:flex;align-items:center;gap:12px;position:absolute;z-index:1200;left:14px;right:14px;bottom:14px;flex-wrap:wrap;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(4,10,7,.92);backdrop-filter:blur(12px);box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .afterlife-picker-copy{min-width:0;flex:1 1 240px}.afterlife-picker-copy strong{display:block;color:#eff7f2;font-size:12px}.afterlife-picker-copy small{display:block;margin-top:4px;color:#8ea097;font-size:10px;line-height:1.45}
      .afterlife-picker-actions{display:flex;gap:8px}.afterlife-picker-btn{appearance:none;border:0;border-radius:11px;padding:11px 14px;font:800 10px/1 Inter,sans-serif;letter-spacing:.06em;cursor:pointer}.afterlife-picker-btn--confirm{background:#39f58a;color:#041008}.afterlife-picker-btn--cancel{background:#101916;color:#c8d5ce;border:1px solid rgba(255,255,255,.09)}
      .afterlife-picker-search{position:absolute;z-index:1200;top:14px;left:14px;width:min(420px,calc(100% - 28px));display:flex;gap:8px}.afterlife-picker-search input{width:100%;height:42px;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:0 13px;background:rgba(4,10,7,.9);color:#eff7f2;outline:none;backdrop-filter:blur(10px);box-shadow:0 10px 25px rgba(0,0,0,.22)}
      .afterlife-picker-results{position:absolute;left:0;right:0;top:48px;display:none;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#08110d;box-shadow:0 18px 38px rgba(0,0,0,.35)}.afterlife-picker-result{display:block;width:100%;padding:10px 12px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#dce9e1;text-align:left;cursor:pointer}.afterlife-picker-result:last-child{border-bottom:0}.afterlife-picker-result:hover{background:#102019}.afterlife-picker-result strong{display:block;font-size:11px}.afterlife-picker-result small{display:block;margin-top:3px;color:#7f9087;font-size:9px}
      .afterlife-picker-marker{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#39f58a;color:#041008;border:3px solid #dfffe9;box-shadow:0 0 0 8px rgba(57,245,138,.16),0 10px 25px rgba(0,0,0,.4);font-size:19px}
      @media(max-width:700px){body.afterlife-map-picker #worldMap{min-height:calc(100vh - 300px);height:68vh!important}.afterlife-picker-panel{left:10px;right:10px;bottom:10px}.afterlife-picker-actions{width:100%}.afterlife-picker-btn{flex:1}.afterlife-picker-search{top:10px;left:10px;width:calc(100% - 20px)}}
    `;
    document.head.appendChild(style);
  }

  function markerIcon() {
    const div = document.createElement('div');
    div.className = 'afterlife-picker-marker';
    div.textContent = '⌖';
    return L.divIcon({ className:'afterlife-picker-marker-wrap', html:div.outerHTML, iconSize:[44,44], iconAnchor:[22,22], popupAnchor:[0,-24] });
  }

  async function reverse(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`, { headers:{'Accept':'application/json','Accept-Language':'pt-BR'} });
      if (!response.ok) throw new Error('reverse');
      const data = await response.json();
      return { label: data.display_name || `Ponto ${lat.toFixed(5)}, ${lng.toFixed(5)}`, short: data.name || data.display_name || 'Local selecionado' };
    } catch {
      return { label:`${lat.toFixed(5)}°, ${lng.toFixed(5)}°`, short:'Local selecionado no mapa' };
    }
  }

  async function selectPoint(latlng, fly = false) {
    const lat = Number(latlng.lat), lng = Number(latlng.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    selected = { lat, lng, label:'Local selecionado no mapa', address:'' };
    if (!marker) marker = L.marker([lat,lng], { icon:markerIcon(), draggable:true }).addTo(map);
    else marker.setLatLng([lat,lng]);
    marker.bindPopup('<strong>Local inicial</strong><br><span>Carregando localização…</span>').openPopup();
    if (fly) map.setView([lat,lng], Math.max(map.getZoom(), 15), { animate:true });
    const place = await reverse(lat,lng);
    selected.label = place.short;
    selected.address = place.label;
    marker.bindPopup(`<strong>📍 ${esc(place.short)}</strong><br><small>${esc(place.label)}</small>`).openPopup();
    renderSelection();
  }

  function renderSelection() {
    const copy = $('pickerSelectionCopy');
    const confirm = $('pickerConfirm');
    if (!copy || !confirm) return;
    if (!selected) {
      copy.innerHTML = '<strong>Nenhum ponto selecionado</strong><small>Clique no mapa ou procure uma cidade/endereço. O ponto escolhido será usado como início da campanha.</small>';
      confirm.disabled = true;
      confirm.style.opacity = '.45';
      return;
    }
    copy.innerHTML = `<strong>📍 ${esc(selected.label)}</strong><small>${selected.lat.toFixed(6)}°, ${selected.lng.toFixed(6)}° · Este será o local inicial da campanha.</small>`;
    confirm.disabled = false;
    confirm.style.opacity = '1';
  }

  function chooseAndReturn() {
    if (!selected) return;
    const params = new URLSearchParams();
    params.set('create','1');
    params.set('lat', selected.lat.toFixed(6));
    params.set('lng', selected.lng.toFixed(6));
    params.set('label', selected.address || selected.label || 'Local selecionado no mapa');
    location.href = `${returnTarget.split('?')[0]}?${params.toString()}`;
  }

  function cancel() { location.href = returnTarget; }

  async function searchPlaces(query) {
    const q = String(query || '').trim();
    const results = $('pickerSearchResults');
    if (!results || q.length < 3) { if (results) results.style.display = 'none'; return; }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&accept-language=pt-BR&q=${encodeURIComponent(q)}`, { headers:{'Accept':'application/json'} });
      if (!response.ok) throw new Error('search');
      const data = await response.json();
      results.replaceChildren();
      (data || []).forEach((item) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'afterlife-picker-result';
        b.innerHTML = `<strong>${esc(item.name || item.display_name || 'Local')}</strong><small>${esc(item.display_name || '')}</small>`;
        b.addEventListener('click', () => { results.style.display='none'; $('pickerSearch').value = item.name || item.display_name || ''; selectPoint({ lat:Number(item.lat), lng:Number(item.lon) }, true); });
        results.appendChild(b);
      });
      results.style.display = data?.length ? 'block' : 'none';
    } catch (error) {
      console.warn('[AFTERLIFE][MAP][PICKER][SEARCH]', error);
      results.style.display = 'none';
    }
  }

  function buildOverlay() {
    document.body.classList.add('afterlife-map-picker');
    const head = document.querySelector('.map-head');
    if (head) {
      const title = $('mapTitle'); if (title) title.textContent = 'Escolha o local inicial';
      const sub = $('mapSubtitle'); if (sub) sub.textContent = 'Clique exatamente no ponto onde sua campanha começará.';
      const badge = $('mapRoleBadge'); if (badge) { badge.textContent = 'SELEÇÃO DE LOCAL'; badge.dataset.role = 'selector'; }
      const context = head.querySelector('.map-context-copy'); if (context) context.textContent = 'Você pode ampliar até a escala de rua e selecionar qualquer ponto do planeta.';
      head.querySelector('.page-actions')?.replaceChildren();
      const actions = head.querySelector('.page-actions');
      if (actions) {
        const back = document.createElement('a'); back.className='btn btn--ghost'; back.href=returnTarget; back.textContent='← CANCELAR'; actions.appendChild(back);
      }
    }

    const shell = document.querySelector('.map-shell');
    const mapHost = $('worldMap');
    if (!shell || !mapHost || shell.querySelector('.afterlife-picker-panel')) return;
    shell.style.position = 'relative';

    const search = document.createElement('div'); search.className='afterlife-picker-search';
    search.innerHTML = '<input id="pickerSearch" type="search" placeholder="Pesquisar cidade, endereço ou região…" autocomplete="off"><div class="afterlife-picker-results" id="pickerSearchResults"></div>';
    shell.appendChild(search);
    $('pickerSearch')?.addEventListener('input', (event) => { clearTimeout(searchTimer); searchTimer=setTimeout(()=>searchPlaces(event.target.value), 420); });

    const panel = document.createElement('div'); panel.className='afterlife-picker-panel';
    panel.innerHTML = '<div class="afterlife-picker-copy" id="pickerSelectionCopy"></div><div class="afterlife-picker-actions"><button type="button" class="afterlife-picker-btn afterlife-picker-btn--cancel" id="pickerCancel">CANCELAR</button><button type="button" class="afterlife-picker-btn afterlife-picker-btn--confirm" id="pickerConfirm">USAR ESTE LOCAL →</button></div>';
    shell.appendChild(panel);
    $('pickerConfirm')?.addEventListener('click', chooseAndReturn);
    $('pickerCancel')?.addEventListener('click', cancel);
    renderSelection();
  }

  function initMap() {
    const center = [-14.235004, -51.92528];
    map = L.map('worldMap', { center, zoom: 4, minZoom: 2, maxZoom: 19, worldCopyJump: true, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; OpenStreetMap contributors' }).addTo(map);
    map.on('click', (event) => selectPoint(event.latlng));
    renderSelection();
  }

  function boot() {
    injectStyle();
    buildOverlay();
    initMap();
    setTimeout(() => map.invalidateSize(), 80);
    const initialLat = Number(qs.get('lat'));
    const initialLng = Number(qs.get('lng'));
    if (Number.isFinite(initialLat) && Number.isFinite(initialLng)) selectPoint({lat:initialLat,lng:initialLng}, true).catch(()=>{});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
