import { aeriom } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeMapInfectionBooted) return;
  window.__afterlifeMapInfectionBooted = true;

  let map = null;
  let campaign = null;
  let role = 'player';
  let layer = null;
  let zones = [];
  let channel = null;
  let enabled = true;
  let cityName = 'Cidade da campanha';
  let selectedZone = null;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));

  function infectionColor(value) {
    const n = Number(value) || 0;
    if (n >= 82) return '#e55353';
    if (n >= 62) return '#e88b4a';
    if (n >= 40) return '#e3bd52';
    return '#57c879';
  }
  function stageLabel(value) {
    return ({ contained:'CONTIDA', active:'ATIVA', severe:'SEVERA', critical:'CRÍTICA' })[value] || 'ATIVA';
  }
  function pct(value) { return `${Math.round(Number(value) || 0)}%`; }

  async function resolveCity() {
    if (!campaign?.latitude || !campaign?.longitude) return;
    const key = `afterlife_infection_city:${campaign.id}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) { cityName = cached; return; }
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(campaign.latitude)}&lon=${encodeURIComponent(campaign.longitude)}&zoom=10&addressdetails=1`;
      const r = await fetch(url, { headers:{ 'Accept':'application/json','Accept-Language':'pt-BR' } });
      if (!r.ok) return;
      const data = await r.json();
      const address = data?.address || {};
      cityName = address.city || address.town || address.municipality || address.suburb || campaign.country || cityName;
      if (cityName) sessionStorage.setItem(key, cityName);
    } catch {}
  }

  function buildUi() {
    const tools = $('masterTools');
    if (!tools || role !== 'master') return;
    const grid = tools.querySelector('.map-tool-grid');
    if (grid && !$('toggleInfection')) {
      const button = document.createElement('button');
      button.className = 'map-tool map-tool--infection';
      button.id = 'toggleInfection';
      button.type = 'button';
      button.innerHTML = '☣ <span>INFECÇÃO</span>';
      button.addEventListener('click', () => { enabled = !enabled; render(); updateUi(); });
      grid.appendChild(button);
    }

    let panel = $('infectionControlPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'infectionControlPanel';
      panel.className = 'infection-control-panel';
      panel.innerHTML = `<div class="infection-panel-head"><div><span>☣ AMEAÇA BIOLÓGICA</span><strong id="infectionCityName">Cidade da campanha</strong><small>Visão estratégica do Mestre · estado da campanha</small></div><button id="infectionRefresh" type="button" aria-label="Atualizar mapa de infecção">↻</button></div><div class="infection-summary"><div><span>INFECÇÃO</span><b id="infectionAvg">—</b></div><div><span>ZUMBIS</span><b id="infectionZombie">—</b></div><div><span>CRÍTICAS</span><b id="infectionCritical">—</b></div></div><div class="infection-legend"><span><i data-level="low"></i>Baixa</span><span><i data-level="mid"></i>Ativa</span><span><i data-level="high"></i>Severa</span><span><i data-level="critical"></i>Crítica</span></div><div class="infection-editor" id="infectionEditor" hidden></div></section>`;
      tools.after(panel);
      $('infectionRefresh')?.addEventListener('click', loadZones);
    }
  }

  function updateUi() {
    const button = $('toggleInfection');
    if (button) button.classList.toggle('is-active', enabled);
    const city = $('infectionCityName'); if (city) city.textContent = cityName;
    const avg = $('infectionAvg'); const zombie = $('infectionZombie'); const critical = $('infectionCritical');
    const avgInf = zones.length ? zones.reduce((s,z)=>s+Number(z.infection_percent||0),0)/zones.length : 0;
    const avgZombie = zones.length ? zones.reduce((s,z)=>s+Number(z.zombie_density_percent||0),0)/zones.length : 0;
    const crit = zones.filter(z => Number(z.infection_percent||0) >= 82).length;
    if (avg) avg.textContent = pct(avgInf);
    if (zombie) zombie.textContent = pct(avgZombie);
    if (critical) critical.textContent = String(crit);
  }

  function openEditor(zone) {
    selectedZone = zone;
    const editor = $('infectionEditor');
    if (!editor) return;
    editor.hidden = false;
    editor.innerHTML = `<div class="infection-editor-head"><strong>${esc(zone.zone_name)}</strong><small>${esc(zone.city_name || cityName)}</small></div><label>Infecção <output id="infectionValue">${pct(zone.infection_percent)}</output><input id="infectionSlider" type="range" min="0" max="100" value="${Number(zone.infection_percent||0)}"></label><label>Densidade de zumbis <output id="zombieValue">${pct(zone.zombie_density_percent)}</output><input id="zombieSlider" type="range" min="0" max="100" value="${Number(zone.zombie_density_percent||0)}"></label><label>Estágio<select id="infectionStage"><option value="contained">Contida</option><option value="active">Ativa</option><option value="severe">Severa</option><option value="critical">Crítica</option></select></label><div class="infection-editor-actions"><button id="infectionSave" type="button">SALVAR</button><button id="infectionCancel" type="button">CANCELAR</button></div>`;
    $('infectionStage').value = zone.outbreak_stage || 'active';
    $('infectionSlider').addEventListener('input', (e) => $('infectionValue').textContent = pct(e.target.value));
    $('zombieSlider').addEventListener('input', (e) => $('zombieValue').textContent = pct(e.target.value));
    $('infectionSave').addEventListener('click', saveSelectedZone);
    $('infectionCancel').addEventListener('click', () => { selectedZone = null; editor.hidden = true; });
  }

  async function saveSelectedZone() {
    if (!selectedZone) return;
    const { data, error } = await aeriom.rpc('update_campaign_infection_zone', {
      p_id: selectedZone.id,
      p_infection: Number($('infectionSlider')?.value || 0),
      p_zombie_density: Number($('zombieSlider')?.value || 0),
      p_spread_rate: Math.round(Number($('infectionSlider')?.value || 0) * .62),
      p_stage: $('infectionStage')?.value || 'active'
    });
    if (error) { alert(error.message || 'Não foi possível salvar a zona.'); return; }
    selectedZone = data;
    const idx = zones.findIndex(z => z.id === data.id);
    if (idx >= 0) zones[idx] = data;
    render(); updateUi(); openEditor(data);
  }

  function render() {
    if (!map) return;
    if (!layer) layer = L.layerGroup().addTo(map);
    layer.clearLayers();
    if (!enabled || role !== 'master') return;
    zones.forEach((zone) => {
      const infection = Number(zone.infection_percent) || 0;
      const circle = L.circle([Number(zone.latitude), Number(zone.longitude)], {
        radius: Math.max(120, Number(zone.radius_m)||650),
        color: infectionColor(infection),
        weight: 1,
        opacity: .72,
        fillColor: infectionColor(infection),
        fillOpacity: Math.min(.28, .08 + infection / 400),
        interactive: true
      });
      circle.bindTooltip(`${zone.zone_name} · ${pct(infection)} infecção`, { sticky:true, direction:'top' });
      circle.bindPopup(`<strong>☣ ${esc(zone.zone_name)}</strong><br><span>${esc(cityName)}</span><br><span>Infecção: ${pct(infection)} · Zumbis: ${pct(zone.zombie_density_percent)}</span><br><span>Estágio: ${esc(stageLabel(zone.outbreak_stage))}</span>`);
      circle.on('click', () => openEditor(zone));
      circle.addTo(layer);
    });
  }

  async function loadZones() {
    if (role !== 'master' || !campaign) return;
    const { data, error } = await aeriom.rpc('ensure_campaign_infection_zones', { p_campaign_id:campaign.id, p_city_name:cityName });
    if (error) {
      console.warn('[AFTERLIFE][INFECTION]', error);
      return;
    }
    zones = Array.isArray(data) ? data : [];
    render(); updateUi();
  }

  function teardown() {
    if (channel) {
      try { aeriom.removeChannel(channel); } catch {}
      channel = null;
    }
    if (layer) { try { layer.remove(); } catch {} layer = null; }
  }

  function subscribe() {
    if (!campaign || role !== 'master') return;
    teardown();
    channel = aeriom.channel(`afterlife-infection:${campaign.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'campaign_infection_zones',filter:`campaign_id=eq.${campaign.id}`},(payload)=>{
        const next = payload.new || payload.old;
        if (!next) return;
        if (payload.eventType==='DELETE') zones = zones.filter(z=>z.id!==next.id);
        else {
          const i = zones.findIndex(z=>z.id===next.id);
          if (i >= 0) zones[i] = next; else zones.push(next);
        }
        render(); updateUi();
        if (selectedZone?.id === next.id) openEditor(next);
      })
      .subscribe();
  }

  async function boot(detail) {
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    if (!map || role !== 'master' || !campaign) return;
    buildUi();
    await resolveCity();
    await loadZones();
    subscribe();
  }

  window.addEventListener('afterlife:map-ready', (event) => boot(event.detail));
  if (window.__afterlifeCampaignMap?.map) boot(window.__afterlifeCampaignMap);
  window.addEventListener('pagehide', teardown, { once:true });
})();
