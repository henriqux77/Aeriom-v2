import { aeriom } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeAreaCycleBooted) return;
  window.__afterlifeAreaCycleBooted = true;

  let channel = null;
  let campaignId = null;
  let timer = 0;

  function context() { return window.__afterlifeCampaignMap || {}; }

  async function refreshCurrentArea(areaId) {
    const cid = context()?.campaign?.id;
    const locationId = window.__afterlifeCurrentLocation?.id || null;
    if (!cid || !areaId || !locationId) return;
    try {
      const { data, error } = await aeriom.rpc('list_campaign_location_areas', { p_location_id: locationId });
      if (error) throw error;
      const areas = Array.isArray(data) ? data : [];
      window.__afterlifeCurrentLocationAreas = areas;
      window.dispatchEvent(new CustomEvent('afterlife:area-state-synced', {
        detail: { areaId, campaignId: cid, areas }
      }));
    } catch (error) {
      console.warn('[AFTERLIFE][P5.12][SYNC]', error);
    }
  }

  function subscribe() {
    const cid = context()?.campaign?.id;
    if (!cid || !aeriom?.channel) return false;
    if (channel && campaignId === cid) return true;
    if (channel) { try { aeriom.removeChannel(channel); } catch {} }
    campaignId = cid;
    channel = aeriom.channel(`afterlife-area-cycle:${cid}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'campaign_location_areas', filter: `campaign_id=eq.${cid}`
      }, (payload) => {
        const row = payload?.new || payload?.old;
        if (!row?.id) return;
        const areas = Array.isArray(window.__afterlifeCurrentLocationAreas) ? window.__afterlifeCurrentLocationAreas : [];
        const index = areas.findIndex((a) => a?.id === row.id);
        if (payload.eventType === 'DELETE') {
          window.__afterlifeCurrentLocationAreas = areas.filter((a) => a?.id !== row.id);
        } else if (index >= 0) {
          areas[index] = { ...areas[index], ...row, state: row.state || areas[index]?.state || {} };
        } else if (row.location_id === window.__afterlifeCurrentLocation?.id) {
          areas.push(row);
        }
        window.dispatchEvent(new CustomEvent('afterlife:area-state-synced', {
          detail: { areaId: row.id, campaignId: cid, areas: window.__afterlifeCurrentLocationAreas || [] }
        }));
      }).subscribe();
    return true;
  }

  function retry() {
    clearTimeout(timer);
    if (subscribe()) timer = setTimeout(retry, 3000);
    else timer = setTimeout(retry, 900);
  }

  window.addEventListener('afterlife:area-action-resolved', (event) => {
    const areaId = event.detail?.areaId;
    if (!areaId) return;
    clearTimeout(timer);
    timer = setTimeout(() => refreshCurrentArea(areaId), 50);
  });

  const observer = new MutationObserver(() => {
    if (!campaignId) subscribe();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  retry();
})();
