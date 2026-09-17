(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const returnTarget = './campanhas.html?create=1';

  let map = null;
  let marker = null;
  let selected = null;
  let searchTimer = null;
  let requestId = 0;

  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));

  function setStatus(text, type = 'info') {
    const el = $('locationPickerStatus');
    if (!el) return;
    el.innerHTML = `<strong>${esc(text)}</strong>`;
    el.dataset.type = type;
  }

  function markerIcon() {
    const div = document.createElement('div');
    div.className = 'campaign-location-marker';
    div.innerHTML = '<span>⌖</span>';
    return L.divIcon({
      className: 'campaign-location-marker-wrap',
      html: div.outerHTML,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
      popupAnchor: [0, -25]
    });
  }

  function renderSelected() {
    const confirm = $('locationPickerConfirm');
    if (!confirm) return;

    const hasSelection = Boolean(
      selected &&
      Number.isFinite(Number(selected.lat)) &&
      Number.isFinite(Number(selected.lng))
    );

    confirm.disabled = !hasSelection;
    confirm.setAttribute('aria-disabled', String(!hasSelection));
    confirm.style.opacity = hasSelection ? '1' : '.45';
    confirm.style.pointerEvents = hasSelection ? 'auto' : 'none';
  }

  async function reverseGeocode(lat, lng, id) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' } }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (id !== requestId || !selected) return;
      selected.name = data.name || data.address?.city || data.address?.town || data.address?.village || 'Local selecionado';
      selected.address = data.display_name || '';
      renderSelected();
      marker?.bindPopup(`<strong>📍 ${esc(selected.name)}</strong><br><small>${esc(selected.address)}</small>`).openPopup();
      setStatus('Local identificado. Você pode ajustar o ponto arrastando o marcador.', 'success');
    } catch {
      if (id !== requestId || !selected) return;
      selected.name = 'Local selecionado no mapa';
      selected.address = `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
      renderSelected();
      marker?.bindPopup(`<strong>📍 Local selecionado</strong><br><small>${lat.toFixed(6)}°, ${lng.toFixed(6)}°</small>`).openPopup();
      setStatus('Coordenadas selecionadas. O ponto pode ser usado para a campanha.', 'success');
    }
  }

  function selectPoint(latlng, zoomTo = false) {
    const lat = Number(latlng.lat);
    const lng = Number(latlng.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    selected = { lat, lng, name: 'Localizando…', address: '' };
    if (!marker) {
      marker = L.marker([lat, lng], { icon: markerIcon(), draggable: true }).addTo(map);
      marker.on('dragend', (event) => selectPoint(event.target.getLatLng()));
    } else {
      marker.setLatLng([lat, lng]);
    }

    if (zoomTo) map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
    marker.bindPopup('<strong>📍 Local inicial</strong><br><small>Localizando…</small>').openPopup();
    renderSelected();
    setStatus('Localizando o ponto…', 'info');

    const id = ++requestId;
    reverseGeocode(lat, lng, id);
  }

  function clearPoint() {
    requestId += 1;
    marker?.remove();
    marker = null;
    selected = null;
    renderSelected();
    setStatus('Clique no mapa para selecionar o ponto inicial.', 'info');
  }

  function confirmSelection() {
    if (!selected) return;
    const lat = Number(selected.lat);
    const lng = Number(selected.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const params = new URLSearchParams({
      create: '1',
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      label: selected.address || selected.name || 'Local selecionado no mapa'
    });

    sessionStorage.setItem('afterlife_selected_location', JSON.stringify({
      lat,
      lng,
      label: selected.address || selected.name || 'Local selecionado no mapa'
    }));

    location.href = `./campanhas.html?${params.toString()}`;
  }

  async function searchPlaces(query) {
    const q = String(query || '').trim();
    const results = $('locationPickerResults');
    if (!results) return;
    if (q.length < 3) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }

    setStatus('Pesquisando localização…', 'info');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&accept-language=pt-BR&q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      results.replaceChildren();

      (data || []).forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'location-picker-result';
        button.innerHTML = `<strong>${esc(item.name || item.display_name || 'Local')}</strong><small>${esc(item.display_name || '')}</small>`;
        button.addEventListener('click', () => {
          results.hidden = true;
          $('locationPickerSearch').value = item.name || item.display_name || '';
          selectPoint({ lat: Number(item.lat), lng: Number(item.lon) }, true);
        });
        results.appendChild(button);
      });

      results.hidden = !(data && data.length);
      setStatus(data?.length ? 'Selecione um resultado ou clique diretamente no mapa.' : 'Nenhum resultado encontrado.', data?.length ? 'info' : 'error');
    } catch (error) {
      console.warn('[AFTERLIFE][LOCATION_PICKER][SEARCH]', error);
      results.hidden = true;
      setStatus('Não foi possível pesquisar agora. Você ainda pode clicar diretamente no mapa.', 'error');
    }
  }

  function init() {
    document.body.classList.add('campaign-location-picker-page');
    if (typeof L === 'undefined') {
      setStatus('Biblioteca do mapa indisponível.', 'error');
      return;
    }

    map = L.map('locationPickerMap', {
      center: [-14.235004, -51.92528],
      zoom: 4,
      minZoom: 2,
      maxZoom: 19,
      worldCopyJump: true,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (event) => selectPoint(event.latlng));
    $('locationPickerSearch')?.addEventListener('input', (event) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchPlaces(event.target.value), 450);
    });
    $('locationPickerConfirm')?.addEventListener('click', confirmSelection);
    $('locationPickerClear')?.addEventListener('click', clearPoint);
    $('locationPickerCancel')?.addEventListener('click', () => { location.href = returnTarget; });
    $('locationPickerBack')?.addEventListener('click', () => { location.href = returnTarget; });

    document.addEventListener('click', (event) => {
      const results = $('locationPickerResults');
      const search = $('locationPickerSearch');
      if (results && search && !results.contains(event.target) && event.target !== search) results.hidden = true;
    });

    renderSelected();
    setTimeout(() => map.invalidateSize(), 80);

    const lat = Number(qs.get('lat'));
    const lng = Number(qs.get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) selectPoint({ lat, lng }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
