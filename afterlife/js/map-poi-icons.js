(() => {
  'use strict';
  if (window.__afterlifeMapPoiIconsBooted) return;
  window.__afterlifeMapPoiIconsBooted = true;

  let map = null;
  let observerTimer = null;
  const overlays = new Map();

  const ICONS = {
    'corpo de bombeiros': '🚒',
    'delegacia': '🚓',
    'hospital': '🏥',
    'clínica': '🩺',
    'farmácia': '💊',
    'escola': '🏫',
    'faculdade': '🎓',
    'universidade': '🎓',
    'banco': '🏦',
    'correios': '📮',
    'posto': '⛽',
    'mercado': '🛒',
    'café': '☕',
    'restaurante': '🍽️',
    'bar': '🍺',
    'alimentação': '🍔',
    'hotel': '🏨',
    'hostel': '🛏️',
    'museu': '🏛️',
    'atração': '📍',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function iconFor(type, name) {
    const key = String(type || '').toLowerCase().trim();
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
    if (layer?.options?.className) return null;
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
    if (/^(local avistado|local inicial)$/i.test(name)) return null;
    return { name, type, content };
  }

  function openLocationFicha(circle) {
    circle.openPopup();
    setTimeout(() => {
      const button = circle.getPopup?.()?.getElement?.()?.querySelector('.afterlife-open-location');
      if (button && !button.disabled) button.click();
    }, 90);
  }

  function ensureOverlay(circle) {
    if (!map?.hasLayer(circle)) return;
    if (overlays.has(circle) && map.hasLayer(overlays.get(circle))) return;

    const poi = parsePoiPopup(circle);
    if (!poi) return;

    // The existing location-ficha handler strips the first non-space token
    // from <strong>. A zero-width prefix followed by whitespace is invisible
    // but causes that legacy cleanup to remove only the prefix.
    if (!poi.content.includes('\u200B')) {
      circle.bindPopup(`<strong>\u200B ${escapeHtml(poi.name)}</strong><br><span>${escapeHtml(poi.type)}</span>`);
    }

    const marker = L.marker(circle.getLatLng(), {
      icon: L.divIcon({
        className: 'afterlife-poi-icon-wrap',
        html: `<div class="afterlife-poi-icon" aria-hidden="true">${iconFor(poi.type, poi.name)}</div>`,
        iconSize: [34,34],
        iconAnchor: [17,17],
        popupAnchor: [0,-15],
      }),
      keyboard: true,
      riseOnHover: true,
      zIndexOffset: 300,
    }).addTo(map);

    marker.bindTooltip(`${poi.name} · ${poi.type}`, { direction:'top', offset:[0,-14] });
    marker.on('click', () => openLocationFicha(circle));

    // Hide the old green dot. It remains as the popup source so the existing
    // location-ficha module can create the full location record/modal.
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
