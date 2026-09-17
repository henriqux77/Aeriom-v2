(() => {
  'use strict';
  if (window.__afterlifeMapPoiIconsBooted) return;
  window.__afterlifeMapPoiIconsBooted = true;

  let map = null;
  let observerTimer = null;
  const overlays = new Map();

  const ICONS = {
    fire_station: '🚒',
    police: '🚓',
    hospital: '🏥',
    clinic: '🩺',
    pharmacy: '💊',
    school: '🏫',
    college: '🎓',
    university: '🎓',
    bank: '🏦',
    post_office: '📮',
    fuel: '⛽',
    supermarket: '🛒',
    marketplace: '🛒',
    cafe: '☕',
    restaurant: '🍽️',
    bar: '🍺',
    fast_food: '🍔',
    hotel: '🏨',
    hostel: '🛏️',
    museum: '🏛️',
    attraction: '📍',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function iconFor(type, name) {
    const key = String(type || '').toLowerCase();
    if (ICONS[key]) return ICONS[key];
    const n = String(name || '').toLowerCase();
    if (n.includes('bombeiro') || n.includes('fire')) return '🚒';
    if (n.includes('escola') || n.includes('colégio') || n.includes('colegio')) return '🏫';
    if (n.includes('hospital')) return '🏥';
    if (n.includes('farmá') || n.includes('farma')) return '💊';
    if (n.includes('polícia') || n.includes('policia') || n.includes('delegacia')) return '🚓';
    if (n.includes('mercado') || n.includes('supermercado')) return '🛒';
    if (n.includes('banco')) return '🏦';
    if (n.includes('posto')) return '⛽';
    return '📍';
  }

  function parsePoiPopup(layer) {
    const popup = layer?.getPopup?.();
    if (!popup) return null;
    const content = popup.getContent?.();
    if (typeof content !== 'string') return null;
    const holder = document.createElement('div');
    holder.innerHTML = content;
    const strong = holder.querySelector('strong');
    const span = holder.querySelector('span');
    const name = strong?.textContent?.replace(/^\u200B/, '').trim() || '';
    const type = span?.textContent?.trim() || '';
    if (!name || !type) return null;
    return { name, type, content };
  }

  function ensureOverlay(circle) {
    if (!map?.hasLayer(circle)) return;
    if (overlays.has(circle) && map.hasLayer(overlays.get(circle))) return;

    const poi = parsePoiPopup(circle);
    if (!poi) return;

    // The legacy location-ficha handler strips the first non-space token from
    // the popup <strong>. A zero-width prefix preserves the complete POI name.
    if (!poi.content.includes('\u200B')) {
      const safeName = escapeHtml(poi.name);
      const safeType = escapeHtml(poi.type);
      circle.bindPopup(`<strong>\u200B${safeName}</strong><br><span>${safeType}</span>`);
    }

    const html = `<div class="afterlife-poi-icon" aria-hidden="true">${iconFor(poi.type, poi.name)}</div>`;
    const marker = L.marker(circle.getLatLng(), {
      icon: L.divIcon({
        className: 'afterlife-poi-icon-wrap',
        html,
        iconSize: [34,34],
        iconAnchor: [17,17],
        popupAnchor: [0,-15],
      }),
      keyboard: true,
      riseOnHover: true,
      zIndexOffset: 300,
    }).addTo(map);

    marker.bindTooltip(`${poi.name} · ${poi.type}`, { direction:'top', offset:[0,-14] });
    marker.on('click', () => {
      circle.openPopup();
    });

    // Hide the old green dot while keeping it as the popup source so the
    // existing location ficha implementation continues to work unchanged.
    circle.setStyle({ opacity: 0, fillOpacity: 0, weight: 0 });
    overlays.set(circle, marker);
  }

  function cleanup() {
    for (const [circle, marker] of overlays) {
      if (!map?.hasLayer(circle)) {
        try { map.removeLayer(marker); } catch {}
        overlays.delete(circle);
      }
    }
  }

  function scan() {
    if (!map?._layers) return;
    Object.values(map._layers).forEach((layer) => {
      if (!(layer instanceof L.CircleMarker)) return;
      ensureOverlay(layer);
    });
    cleanup();
  }

  function attach(detail) {
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    if (!map) return;
    clearInterval(observerTimer);
    observerTimer = setInterval(scan, 700);
    scan();
    map.on('moveend zoomend', () => setTimeout(scan, 650));
  }

  window.addEventListener('afterlife:map-ready', (event) => attach(event.detail));
  if (window.__afterlifeCampaignMap?.map) attach(window.__afterlifeCampaignMap);
})();
