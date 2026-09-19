(() => {
  'use strict';
  if (window.__afterlifePoiPriorityBooted) return;
  window.__afterlifePoiPriorityBooted = true;

  const LOW_PRIORITY = /Parque|Jardim|Parquinho|Teatro|Cinema|Centro de artes|Área de piquenique|Campo de golfe|Piscina|Centro esportivo|Estádio|Quadra|Praça/i;
  const KEEP_OPEN = /hospital|farmácia|delegacia|bombeiro|posto|mercado|supermercado|restaurante|café|padaria|açougue|banco|caixa|oficina|veterinária|academia|abrigo|escola/i;

  function markerText(layer) {
    const popup = layer.getPopup?.();
    const tooltip = layer.getTooltip?.();
    return `${popup?.getContent?.() || ''} ${tooltip?.getContent?.() || ''} ${layer._icon?.textContent || ''}`.replace(/\s+/g, ' ');
  }

  function applyPriority() {
    const map = window.__afterlifeCampaignMap?.map;
    if (!map?._layers) return;
    const openCounts = new Map();
    Object.values(map._layers).forEach(layer => {
      if (!layer?.getLatLng || !layer._icon) return;
      const text = markerText(layer);
      if (!LOW_PRIORITY.test(text) || KEEP_OPEN.test(text)) return;
      const key = text.match(LOW_PRIORITY)?.[0]?.toLowerCase() || 'open';
      const count = openCounts.get(key) || 0;
      openCounts.set(key, count + 1);
      // Keep only a small representative sample of open/public spaces.
      if (count >= 2) {
        layer.setOpacity?.(0);
        if (layer._icon) layer._icon.style.display = 'none';
        layer.__afterlifePoiSuppressed = true;
      } else if (layer.__afterlifePoiSuppressed) {
        layer.setOpacity?.(1);
        if (layer._icon) layer._icon.style.display = '';
        layer.__afterlifePoiSuppressed = false;
      }
    });
  }

  function boot() {
    setTimeout(applyPriority, 700);
    setTimeout(applyPriority, 1800);
    setTimeout(applyPriority, 3200);
    const map = window.__afterlifeCampaignMap?.map;
    if (!map) return;
    map.on('moveend zoomend', () => setTimeout(applyPriority, 150));
  }

  window.addEventListener('afterlife:map-ready', boot, { once: true });
  if (window.__afterlifeCampaignMap?.map) boot();
  window.__afterlifePoiPriority = { refresh: applyPriority };
})();