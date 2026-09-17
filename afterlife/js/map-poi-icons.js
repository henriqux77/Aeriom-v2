(() => {
  'use strict';
  if (window.__afterlifeMapPoiIconsBooted) return;
  window.__afterlifeMapPoiIconsBooted = true;

  let map = null;
  const overlays = new Map();

  const ICONS = {
    'Igreja / culto': '✚',
    'Floresta': '🌲',
    'Parque': '🌳',
    'Praça': '⛲',
    'Parquinho': '🛝',
    'Jardim': '🌿',
    'Reserva natural': '🌲',
    'Praia': '🏖️',
    'Água': '💧',
    'Montanha': '⛰️',
    'Ponto de ônibus': '🚌',
    'Rodoviária': '🚌',
    'Estação ferroviária': '🚆',
    'Metrô': '🚇',
    'Tram': '🚋',
    'Aeroporto': '✈️',
    'Ferry': '⛴️',
    'Estacionamento': '🅿️',
    'Bicicletário': '🚲',
    'Táxi': '🚕',
    'Aluguel de carros': '🚗',
    'Posto de combustível': '⛽',
    'Recarga elétrica': '🔌',
    'Hospital': '🏥',
    'Clínica': '🩺',
    'Médico': '⚕️',
    'Dentista': '🦷',
    'Farmácia': '💊',
    'Veterinária': '🐾',
    'Delegacia': '🚓',
    'Corpo de bombeiros': '🚒',
    'Escola': '🏫',
    'Creche': '🧸',
    'Faculdade': '🎓',
    'Universidade': '🎓',
    'Biblioteca': '📚',
    'Banco': '🏦',
    'Caixa eletrônico': '💳',
    'Correios': '📮',
    'Prédio público': '🏢',
    'Prefeitura': '🏛️',
    'Tribunal': '⚖️',
    'Abrigo': '🏠',
    'Centro comunitário': '🤝',
    'Restaurante': '🍽️',
    'Fast food': '🍔',
    'Café': '☕',
    'Bar / Pub': '🍺',
    'Casa noturna': '🎵',
    'Mercado': '🛒',
    'Loja de conveniência': '🛍️',
    'Padaria': '🥖',
    'Açougue': '🥩',
    'Loja de roupas': '👕',
    'Calçados': '👟',
    'Ferragens': '🔩',
    'Eletrônicos': '📱',
    'Móveis': '🛋️',
    'Informática': '💻',
    'Celulares': '📱',
    'Oficina de veículos': '🔧',
    'Bicicletas': '🚲',
    'Loja de carros': '🚘',
    'Oficina': '🛠️',
    'Centro esportivo': '🏋️',
    'Estádio': '🏟️',
    'Quadra / campo': '⚽',
    'Piscina': '🏊',
    'Academia': '💪',
    'Museu': '🏛️',
    'Cinema': '🎬',
    'Teatro': '🎭',
    'Centro de artes': '🎨',
    'Atração': '📍',
    'Mirante': '🔭',
    'Camping': '🏕️',
    'Área de piquenique': '🧺',
    'Zoológico': '🦁',
    'Parque temático': '🎢',
    'Cemitério': '🪦',
    'Monumento': '🗿',
    'Memorial': '🕯️',
    'Castelo / ruínas': '🏰',
    'Área industrial': '🏭',
    'Fazenda': '🚜',
    'Reciclagem': '♻️',
    'Lixeira': '🗑️',
    'Banheiro': '🚻',
    'Água potável': '🚰',
    'Vending machine': '🥤',
    'Ponto de interesse': '📍'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function iconFor(type, name) {
    if (ICONS[type]) return ICONS[type];
    const n = String(name || '').toLowerCase();
    const rules = [
      [/igreja|capela|templo|catedral/, '✚'], [/floresta|mata|bosque/, '🌲'], [/parque|praça|praca/, '🌳'],
      [/ônibus|onibus|bus/, '🚌'], [/metrô|metro/, '🚇'], [/estação|estacao|rail/, '🚆'], [/hospital/, '🏥'],
      [/farmá|farma/, '💊'], [/polícia|policia|delegacia/, '🚓'], [/bombeiro|fire/, '🚒'], [/escola|colégio|colegio/, '🏫'],
      [/universidade|faculdade/, '🎓'], [/biblioteca/, '📚'], [/banco/, '🏦'], [/correios|postal/, '📮'],
      [/mercado|supermercado|market/, '🛒'], [/restaurante/, '🍽️'], [/padaria|bakery/, '🥖'], [/hotel/, '🏨'],
      [/museu/, '🏛️'], [/cinema/, '🎬'], [/teatro/, '🎭'], [/estádio|estadio/, '🏟️'], [/praia|beach/, '🏖️']
    ];
    for (const [re, icon] of rules) if (re.test(n)) return icon;
    return '📍';
  }

  function parsePoiPopup(layer) {
    if (layer?.options?.className) return null;
    if (!layer?.options?.afterlifePoi) return null;
    const poi = layer.options.afterlifePoi;
    if (!poi.name || !poi.type) return null;
    return poi;
  }

  function openLocationFicha(circle) {
    circle.openPopup();
    setTimeout(() => {
      const button = circle.getPopup?.()?.getElement?.()?.querySelector('.afterlife-open-location');
      if (button && !button.disabled) button.click();
    }, 50);
  }

  function ensureOverlay(circle) {
    if (!map?.hasLayer(circle)) return;
    if (overlays.has(circle) && map.hasLayer(overlays.get(circle))) return;
    const poi = parsePoiPopup(circle);
    if (!poi) return;

    const icon = poi.icon || iconFor(poi.type, poi.name);
    if (!circle.getPopup?.()) {
      circle.bindPopup(`<strong>\u200B ${escapeHtml(poi.name)}</strong><br><span>${escapeHtml(poi.type)}</span>`);
    }

    const marker = L.marker(circle.getLatLng(), {
      icon: L.divIcon({
        className: 'afterlife-poi-icon-wrap',
        html: `<div class="afterlife-poi-icon" aria-hidden="true">${escapeHtml(icon)}</div>`,
        iconSize: [30,30], iconAnchor: [15,15], popupAnchor: [0,-14]
      }),
      keyboard: true,
      riseOnHover: true,
      zIndexOffset: 300
    }).addTo(map);

    marker.bindTooltip(`${poi.name} · ${poi.type}`, { direction:'top', offset:[0,-12], opacity:.96 });
    marker.on('click', () => openLocationFicha(circle));
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
    for (const layer of Object.values(map._layers)) {
      if (layer instanceof L.CircleMarker) ensureOverlay(layer);
    }
    cleanup();
  }

  function attach(detail) {
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    if (!map) return;
    scan();
    map.off('layeradd', scan);
    map.off('layerremove', cleanup);
    map.on('layeradd', scan);
    map.on('layerremove', cleanup);
    map.on('moveend zoomend', scan);
  }

  window.addEventListener('afterlife:map-ready', (event) => attach(event.detail));
  if (window.__afterlifeCampaignMap?.map) attach(window.__afterlifeCampaignMap);
})();
