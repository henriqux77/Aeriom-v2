import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260920-mapfix';

(() => {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const campaignId = qs.get('campaign') || qs.get('id') || sessionStorage.getItem('afterlife_current_campaign_id');
  const state = { map: null, layer: null, session: null, channel: null, timer: null, ready: false };

  function point(lat, lng) {
    const a = Number(lat), b = Number(lng);
    return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lng: b } : null;
  }

  function installMapCapture() {
    if (!window.L || state.map) return;
    const originalMap = window.L.map;
    if (originalMap.__afterlifeWrapped) return;

    function wrappedMap(...args) {
      const map = originalMap.apply(this, args);
      state.map = map;
      state.layer = window.L.layerGroup().addTo(map);
      setTimeout(() => {
        map.invalidateSize({ pan: false });
        loadMembers().catch(() => {});
      }, 120);
      return map;
    }
    wrappedMap.__afterlifeWrapped = true;
    window.L.map = wrappedMap;
  }

  async function loadMembers() {
    if (!state.map || !campaignId) return;
    try {
      state.session = state.session || await ensureAfterlifeSession();
      if (!state.session?.user) return;

      const r = await aeriom.rpc('list_campaign_map_members', { p_campaign_id: campaignId });
      if (r.error) throw r.error;
      const members = Array.isArray(r.data) ? r.data : [];
      renderMembers(members);
      if (!state.channel) subscribe();
      state.ready = true;
    } catch (error) {
      console.warn('[AFTERLIFE][MAP CHARACTER RECOVERY]', error);
    }
  }

  function renderMembers(members) {
    if (!state.layer || !state.map) return;
    state.layer.clearLayers();

    const bounds = state.map.getBounds();
    members.forEach(member => {
      const p = point(member.latitude, member.longitude);
      if (!p) return;
      if (bounds && !bounds.pad(0.35).contains([p.lat, p.lng])) return;

      const isMaster = member.role === 'master';
      const isMe = String(member.user_id) === String(state.session?.user?.id);
      const marker = window.L.circleMarker([p.lat, p.lng], {
        radius: isMe ? 8 : 7,
        weight: 2,
        color: '#b8ffd5',
        fillColor: isMaster ? '#d6b66c' : '#39e58c',
        fillOpacity: 0.95,
        bubblingMouseEvents: false,
        interactive: true,
        pane: 'markerPane'
      }).addTo(state.layer);

      marker.bindTooltip(
        `${member.display_name || 'Sobrevivente'}${isMe ? ' · VOCÊ' : ''}${isMaster ? ' · MESTRE' : ''}`,
        { direction: 'top', offset: [0, -7], opacity: 0.95 }
      );

      marker.on('click', event => {
        window.L.DomEvent.stopPropagation(event);
        const name = member.display_name || 'Sobrevivente';
        const status = isMe ? 'Sua posição' : isMaster ? 'Mestre da campanha' : 'Sobrevivente';
        const modal = document.getElementById('mapModalBackdrop');
        const title = document.getElementById('mapModalTitle');
        const body = document.getElementById('mapModalBody');
        const eyebrow = document.getElementById('mapModalEyebrow');
        if (modal && title && body) {
          if (eyebrow) eyebrow.textContent = 'AFTERLIFE · PERSONAGEM';
          title.textContent = name;
          body.innerHTML = `<div class="entity-sheet"><div class="entity-badge">${isMaster ? '♛' : '●'}</div><h3>${name}</h3><span>${status}</span><p>Posição sincronizada com o mapa da campanha.</p></div>`;
          modal.hidden = false;
        }
      });
    });
  }

  function subscribe() {
    if (!campaignId || !aeriom?.channel) return;
    state.channel = aeriom.channel(`afterlife-map-members-${campaignId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_map_positions',
        filter: `campaign_id=eq.${campaignId}`
      }, () => {
        clearTimeout(state.timer);
        state.timer = setTimeout(() => loadMembers().catch(() => {}), 180);
      })
      .subscribe();
  }

  function attachMapEvents() {
    if (!state.map) return;
    state.map.on('moveend zoomend', () => {
      clearTimeout(state.timer);
      state.timer = setTimeout(() => loadMembers().catch(() => {}), 100);
    });
  }

  installMapCapture();

  const boot = () => {
    if (!state.map) {
      setTimeout(boot, 50);
      return;
    }
    attachMapEvents();
    loadMembers().catch(() => {});
  };

  setTimeout(boot, 0);
})();
