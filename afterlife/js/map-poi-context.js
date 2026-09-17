(() => {
  'use strict';
  if (window.__afterlifeMapPoiContextBooted) return;
  window.__afterlifeMapPoiContextBooted = true;

  const ENDPOINTS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  const TTL = 5 * 60 * 1000;
  const cache = new Map();
  let map = null;
  let role = 'player';
  let timer = null;
  let lastKey = '';
  const extraLayers = [];

  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));
  const nameOf = (tags) => tags?.name || tags?.brand || tags?.operator || 'Local sem nome';

  function typeOf(tags) {
    const place = String(tags?.place || '').toLowerCase();
    const aero = String(tags?.aeroway || '').toLowerCase();
    const amenity = String(tags?.amenity || '').toLowerCase();
    const landuse = String(tags?.landuse || '').toLowerCase();
    if (place === 'square' || place === 'village_green') return 'Praça';
    if (aero === 'aerodrome') return 'Aeroporto';
    if (aero === 'terminal') return 'Terminal';
    if (aero === 'helipad') return 'Heliponto';
    if (amenity === 'townhall') return 'Prefeitura';
    if (amenity === 'courthouse') return 'Tribunal';
    if (amenity === 'grave_yard') return 'Cemitério';
    if (landuse === 'military') return 'Área militar';
    if (landuse === 'quarry') return 'Pedreira';
    if (landuse === 'retail') return 'Área comercial';
    if (landuse === 'commercial') return 'Área comercial';
    return 'Ponto de interesse';
  }

  function iconOf(type) {
    return ({'Praça':'⛲','Aeroporto':'✈️','Terminal':'🛫','Heliponto':'🚁','Prefeitura':'🏛️','Tribunal':'⚖️','Cemitério':'🪦','Área militar':'🪖','Pedreira':'⛏️','Área comercial':'🏬'})[type] || '📍';
  }

  function clearExtras() {
    while (extraLayers.length) {
      const layer = extraLayers.pop();
      try { map?.removeLayer(layer); } catch {}
    }
  }

  function render(items) {
    clearExtras();
    for (const p of items) {
      const circle = L.circleMarker([p.lat,p.lng], {radius:4,weight:1,color:'#53e89a',fillOpacity:.9,afterlifePoi:p});
      circle.bindPopup(`<strong>\u200B ${esc(p.name)}</strong><br><span>${esc(p.type)}</span>`);
      circle.addTo(map);
      extraLayers.push(circle);
    }
  }

  async function load(center, zoom) {
    if (!map || zoom < 12) return;
    const key = `${center.lat.toFixed(3)},${center.lng.toFixed(3)},${Math.round(zoom)},${role}`;
    if (key === lastKey) return;
    lastKey = key;
    const hit = cache.get(key);
    if (hit && Date.now()-hit.at < TTL) { render(hit.data); return; }
    const q = `[out:json][timeout:8];(nwr(around:1200,${center.lat.toFixed(6)},${center.lng.toFixed(6)})[place~"square|village_green"];nwr(around:1200,${center.lat.toFixed(6)},${center.lng.toFixed(6)})[aeroway~"aerodrome|terminal|helipad"];nwr(around:1200,${center.lat.toFixed(6)},${center.lng.toFixed(6)})[amenity~"townhall|courthouse|grave_yard"];nwr(around:1200,${center.lat.toFixed(6)},${center.lng.toFixed(6)})[landuse~"military|quarry|retail|commercial"];);out center tags qt;`;
    for (const endpoint of ENDPOINTS) {
      try {
        const r = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:q});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const seen = new Set();
        const items = (d.elements||[]).map((it)=>{
          const lat=Number(it.lat??it.center?.lat),lng=Number(it.lon??it.center?.lon),tags=it.tags||{};
          const type=typeOf(tags); const name=nameOf(tags); const id=`extra:${it.type}:${it.id}`;
          return {id,lat,lng,name,type,icon:iconOf(type)};
        }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)).filter(x=>{const k=`${x.name}|${x.type}|${x.lat.toFixed(4)}|${x.lng.toFixed(4)}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,60);
        cache.set(key,{at:Date.now(),data:items});
        render(items);
        return;
      } catch (error) { console.warn('[AFTERLIFE][MAP][POI-CONTEXT]',endpoint,error); }
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(()=>load(map.getCenter(),map.getZoom()),320);
  }

  function attach(detail) {
    map=detail?.map||window.__afterlifeCampaignMap?.map||null;
    role=detail?.role||window.__afterlifeCampaignMap?.role||'player';
    if (!map) return;
    map.on('moveend zoomend',schedule);
    load(map.getCenter(),map.getZoom());
  }

  window.addEventListener('afterlife:map-ready',(event)=>attach(event.detail));
  if (window.__afterlifeCampaignMap?.map) attach(window.__afterlifeCampaignMap);
  window.addEventListener('pagehide',()=>clearExtras(),{once:true});
})();
