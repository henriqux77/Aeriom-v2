(() => {
  'use strict';
  if (window.__afterlifeMapPoiIconsBooted) return;
  window.__afterlifeMapPoiIconsBooted = true;

  let map = null;
  const overlays = new Map();

  const ICONS = {
    'Igreja / culto':'✚','Floresta':'🌲','Parque':'🌳','Praça':'⛲','Parquinho':'🛝','Jardim':'🌿','Reserva natural':'🌲','Praia':'🏖️','Água':'💧','Montanha':'⛰️',
    'Ponto de ônibus':'🚌','Rodoviária':'🚌','Estação ferroviária':'🚆','Metrô':'🚇','Tram':'🚋','Aeroporto':'✈️','Ferry':'⛴️','Estacionamento':'🅿️','Bicicletário':'🚲','Táxi':'🚕','Aluguel de carros':'🚗',
    'Posto de combustível':'⛽','Recarga elétrica':'🔌','Hospital':'🏥','Clínica':'🩺','Médico':'⚕️','Dentista':'🦷','Farmácia':'💊','Veterinária':'🐾','Delegacia':'🚓','Corpo de bombeiros':'🚒',
    'Escola':'🏫','Creche':'🧸','Faculdade':'🎓','Universidade':'🎓','Biblioteca':'📚','Banco':'🏦','Caixa eletrônico':'💳','Correios':'📮','Caixa postal':'📮','Prédio público':'🏢','Prefeitura':'🏛️','Tribunal':'⚖️','Abrigo':'🏠','Centro comunitário':'🤝','Centro social':'🤝',
    'Restaurante':'🍽️','Fast food':'🍔','Café':'☕','Bar / Pub':'🍺','Casa noturna':'🎵','Mercado':'🛒','Loja de conveniência':'🛍️','Padaria':'🥖','Açougue':'🥩','Loja de roupas':'👕','Calçados':'👟','Ferragens':'🔩','Eletrônicos':'📱','Móveis':'🛋️','Informática':'💻','Celulares':'📱','Oficina de veículos':'🔧','Bicicletas':'🚲','Loja de carros':'🚘','Oficina':'🛠️',
    'Centro esportivo':'🏋️','Estádio':'🏟️','Quadra / campo':'⚽','Piscina':'🏊','Academia':'💪','Museu':'🏛️','Cinema':'🎬','Teatro':'🎭','Centro de artes':'🎨','Atração':'📍','Mirante':'🔭','Camping':'🏕️','Área de piquenique':'🧺','Zoológico':'🦁','Parque temático':'🎢','Cemitério':'🪦','Monumento':'🗿','Memorial':'🕯️','Castelo / ruínas':'🏰','Sítio arqueológico':'🏺','Área industrial':'🏭','Fazenda':'🚜','Reciclagem':'♻️','Lixeira':'🗑️','Banheiro':'🚻','Água potável':'🚰','Vending machine':'🥤','Ponto de interesse':'📍'
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));
  const iconFor = (type,name) => {
    if (ICONS[type]) return ICONS[type];
    const n = String(name || '').toLowerCase();
    const rules = [[/igreja|capela|templo|catedral/,'✚'],[/floresta|mata|bosque/,'🌲'],[/parque|praça|praca/,'🌳'],[/ônibus|onibus|bus/,'🚌'],[/metrô|metro/,'🚇'],[/estação|estacao|rail/,'🚆'],[/hospital/,'🏥'],[/farmá|farma/,'💊'],[/polícia|policia|delegacia/,'🚓'],[/bombeiro|fire/,'🚒'],[/escola|colégio|colegio/,'🏫'],[/universidade|faculdade/,'🎓'],[/biblioteca/,'📚'],[/banco/,'🏦'],[/correios|postal/,'📮'],[/mercado|supermercado|market/,'🛒'],[/restaurante/,'🍽️'],[/padaria|bakery/,'🥖'],[/hotel/,'🏨'],[/museu/,'🏛️'],[/cinema/,'🎬'],[/teatro/,'🎭'],[/estádio|estadio/,'🏟️'],[/praia|beach/,'🏖️'],[/praça|praca/,'⛲']];
    for (const [re,icon] of rules) if (re.test(n)) return icon;
    return '📍';
  };

  function parsePoi(layer){
    if (!(layer instanceof L.CircleMarker) || layer?.options?.className) return null;
    const poi = layer.options?.afterlifePoi;
    return poi?.name && poi?.type ? poi : null;
  }

  function openLocationFicha(circle){
    circle.openPopup();
    setTimeout(() => circle.getPopup?.()?.getElement?.()?.querySelector('.afterlife-open-location')?.click(), 40);
  }

  function ensureOverlay(circle){
    if (!map?.hasLayer(circle) || overlays.has(circle)) return;
    const poi = parsePoi(circle);
    if (!poi) return;
    const icon = poi.icon || iconFor(poi.type,poi.name);
    // Rebind on purpose so mapa-locations.js never loses the first word of the name.
    circle.bindPopup(`<strong>\u200B ${escapeHtml(poi.name)}</strong><br><span>${escapeHtml(poi.type)}</span>`);
    const marker = L.marker(circle.getLatLng(),{
      icon:L.divIcon({className:'afterlife-poi-icon-wrap',html:`<div class="afterlife-poi-icon" aria-hidden="true">${escapeHtml(icon)}</div>`,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-14]}),
      keyboard:true,riseOnHover:true,zIndexOffset:300
    }).addTo(map);
    marker.bindTooltip(`${escapeHtml(poi.name)} · ${escapeHtml(poi.type)}`,{direction:'top',offset:[0,-12],opacity:.96});
    marker.on('click',()=>openLocationFicha(circle));
    circle.setStyle({opacity:0,fillOpacity:0,weight:0});
    overlays.set(circle,marker);
  }

  function cleanup(){
    for (const [circle,marker] of overlays){
      if (!map?.hasLayer(circle)) { try{map.removeLayer(marker);}catch{} overlays.delete(circle); }
    }
  }

  function attach(detail){
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    if (!map) return;
    map.eachLayer((layer)=>ensureOverlay(layer));
    map.off('layeradd',onLayerAdd);
    map.off('layerremove',onLayerRemove);
    map.on('layeradd',onLayerAdd);
    map.on('layerremove',onLayerRemove);
  }
  function onLayerAdd(event){ensureOverlay(event.layer);}
  function onLayerRemove(){cleanup();}

  window.addEventListener('afterlife:map-ready',(event)=>attach(event.detail));
  if (window.__afterlifeCampaignMap?.map) attach(window.__afterlifeCampaignMap);
})();
