import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260920-map20';

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);

  const state = {
    session: null, campaign: null, role: 'player', map: null,
    members: [], locations: [], entities: [], factions: [], npcs: [], vehicles: [], stations: [],
    hordes: [], infection: [], travels: [], selected: null, mapPosition: null, devicePosition: null,
    editorMode: null, drawing: null, realtime: [], poiCache: new Map(), poiTimer: null, refreshTimer: null,
    renderer: null, selectedMarker: null, layer: {
      locations: null, members: null, entities: null, hordes: null, infection: null,
      factions: null, npcs: null, vehicles: null, stations: null, pois: null, vision: null, device: null, drawing: null
    },
    compass: { active: false, bound: false, heading: 0 },
    sync: { ok: true }
  };

  const MAX_VISIBLE = { locations: 80, entities: 70, members: 30, npcs: 35, vehicles: 35, stations: 25, pois: 30 };
  const VISION_M = 380;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const n = (v, f=0) => { const x=Number(v); return Number.isFinite(x) ? x : f; };
  const pt = (lat,lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? {lat:Number(lat),lng:Number(lng)} : null;
  const campaignCenter = () => pt(state.campaign?.latitude,state.campaign?.longitude) || {lat:-23.55,lng:-46.63};
  const currentPoint = () => state.mapPosition || state.devicePosition || campaignCenter();
  const meters = (a,b) => { const R=6371000,r=Math.PI/180,p1=n(a.lat)*r,p2=n(b.lat)*r,dp=(n(b.lat)-n(a.lat))*r,dl=(n(b.lng)-n(a.lng))*r,x=Math.sin(dp/2)**2+Math.sin(dl/2)**2*Math.cos(p1)*Math.cos(p2); return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x))); };
  const km = m => n(m) < 1000 ? Math.round(n(m))+' m' : (n(m)/1000).toFixed(n(m)<10000?1:0)+' km';
  const initials = s => String(s||'S').trim().charAt(0).toUpperCase() || 'S';
  const isMaster = () => state.role === 'master';
  const iconByCategory = c => ({hospital:'🏥',clinic:'🩺',pharmacy:'💊',fuel:'⛽',police:'🚓',restaurant:'🍽',cafe:'☕',supermarket:'🛒',marketplace:'🛒',hotel:'🏨',park:'🌳',forest:'🌲',school:'🏫',museum:'🏛',ruins:'🏚',monument:'🗿',station:'⚒',shelter:'⌂',commerce:'⌂'}[String(c||'').toLowerCase()] || '⌖');

  function setStatus(message, type='ok') {
    const el=$('mapStatus'); if(el){el.textContent=message;el.dataset.state=type;}
    const live=$('mapLiveText'), wrap=live?.parentElement;
    if(live) live.textContent=type==='error'?'ERRO DE SINCRONIA':type==='loading'?'SINCRONIZANDO':'AO VIVO';
    if(wrap) wrap.dataset.state=type;
    const dot=$('syncDot'); if(dot) dot.dataset.state=type;
  }
  function toast(message,type='ok'){setStatus(message,type);clearTimeout(state.refreshTimer);state.refreshTimer=setTimeout(()=>setStatus('Mundo pronto para a mesa.'),4200);}
  function report(type, details){ try { window.AFTERLIFE_ERROR_MONITOR?.record(type, details || {}); } catch {} }
  function safeCall(name, fn){ return Promise.resolve().then(fn).catch(err=>{ report('map-api-error',{name,message:err?.message||String(err),stack:err?.stack||''}); throw err; }); }

  async function boot() {
    try {
      state.session=await ensureAfterlifeSession();
      if(!state.session?.user){ location.href='../index.html'; return; }
      const cid=qs.get('campaign')||qs.get('id')||sessionStorage.getItem('afterlife_current_campaign_id');
      if(!cid) throw new Error('Campanha não informada.');
      const c=await aeriom.from('campaigns').select('id,created_by,name,description,country,tone,scale,latitude,longitude').eq('id',cid).maybeSingle();
      if(c.error) throw c.error;
      if(!c.data) throw new Error('Campanha não encontrada.');
      state.campaign=c.data;
      await safeCall('ensure_campaign_map_positions',()=>aeriom.rpc('ensure_campaign_map_positions',{p_campaign_id:cid}));
      const m=await aeriom.rpc('list_campaign_map_members',{p_campaign_id:cid});
      if(m.error) throw m.error;
      state.members=Array.isArray(m.data)?m.data:[];
      const me=state.members.find(x=>String(x.user_id)===String(state.session.user.id));
      if(!me) throw new Error('Você não participa desta campanha.');
      state.role=me.role==='master'||String(state.campaign.created_by)===String(state.session.user.id)?'master':'player';
      setupUi(); initMap(); exposeApi();
      await refreshAll();
      subscribeRealtime();
      setStatus('Mundo pronto para a mesa.');
    } catch(err) {
      console.error('[AFTERLIFE][MAP][BOOT]',err);
      report('map-boot-error',{message:err?.message||String(err),stack:err?.stack||''});
      setStatus(err?.message||'Falha ao iniciar o mapa.','error');
      openModal('MAPA INDISPONÍVEL','<div class="map-empty-state">'+esc(err?.message||'Não foi possível iniciar o mapa.')+'</div>');
    }
  }

  function setupUi(){
    $('mapCampaignName').textContent=state.campaign.name||'Campanha';
    $('mapTitle').textContent=state.campaign.name||'Mapa da campanha';
    $('mapRoleBadge').textContent=isMaster()?'MESTRE':'SOBREVIVENTE';
    $('mapBackCampaign').href='./campanha.html?campaign='+encodeURIComponent(state.campaign.id);
    $('masterCard').setAttribute('aria-hidden',String(!isMaster()));
    $('mobileMasterBtn').classList.toggle('is-hidden',!isMaster());
    $('mapCenterCampaign').onclick=()=>centerTo(campaignCenter(),Math.max(state.map.getZoom(),13));
    $('mapCenterMe').onclick=()=>centerTo(currentPoint(),Math.max(state.map.getZoom(),15));
    $('mapFocusMe')?.addEventListener('click',()=>centerTo(currentPoint(),15));
    $('mapLocateDevice').onclick=locateDevice;
    $('clearSelection').onclick=()=>{state.selected=null;state.selectedMarker?.remove();state.selectedMarker=null;renderSelection();};
    $('mapCompass').onclick=toggleCompass;
    $('mobileOpenPanel').onclick=()=>openSheet('systems');
    $('sheetClose').onclick=closeSheet;
    document.querySelectorAll('[data-system-view]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.systemView)));
    document.querySelectorAll('[data-mobile-panel]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.mobilePanel)));
    $('mapModalClose').onclick=closeModal;
    $('mapModalBackdrop').addEventListener('click',e=>{if(e.target===$('mapModalBackdrop'))closeModal();});
  }

  function initMap(){
    const c=campaignCenter();
    const canvas=L.canvas({padding:.4});
    state.renderer=canvas;
    state.map=L.map('worldMap',{
      center:[c.lat,c.lng], zoom:5, minZoom:2, maxZoom:19,
      zoomControl:false, preferCanvas:true, worldCopyJump:false,
      zoomAnimation:false, fadeAnimation:false, markerZoomAnimation:false,
      inertia:true, wheelDebounceTime:90, wheelPxPerZoomLevel:120,
      renderer:canvas, tap:true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      subdomains:['a','b','c'],maxZoom:19,noWrap:true,updateWhenZooming:false,
      updateWhenIdle:true,keepBuffer:1,attribution:'&copy; OpenStreetMap contributors'
    }).addTo(state.map);
    state.layer.locations=L.layerGroup().addTo(state.map);
    state.layer.members=L.layerGroup().addTo(state.map);
    state.layer.entities=L.layerGroup().addTo(state.map);
    state.layer.hordes=L.layerGroup().addTo(state.map);
    state.layer.infection=L.layerGroup().addTo(state.map);
    state.layer.factions=L.layerGroup().addTo(state.map);
    state.layer.npcs=L.layerGroup().addTo(state.map);
    state.layer.vehicles=L.layerGroup().addTo(state.map);
    state.layer.stations=L.layerGroup().addTo(state.map);
    state.layer.pois=L.layerGroup().addTo(state.map);
    state.layer.vision=L.layerGroup().addTo(state.map);
    state.layer.device=L.layerGroup().addTo(state.map);
    state.map.on('moveend zoomend',scheduleViewport);
    state.map.on('click',onMapClick);
    state.map.on('mousemove',e=>setCoordinates(e.latlng));
    updateReadout();
  }

  function exposeApi(){
    window.__afterlifeCampaignMap={
      map:state.map,campaign:state.campaign,role:state.role,user:state.session.user,
      refresh:refreshAll,refreshMembers:refreshMembers,getSelfPosition:currentPoint,
      openLocation,centerTo
    };
    window.dispatchEvent(new CustomEvent('afterlife:map-ready',{detail:window.__afterlifeCampaignMap}));
  }

  async function refreshAll(){
    setStatus('Sincronizando mundo…','loading');
    const jobs=[
      ['members',refreshMembers],
      ['locations',refreshLocations],
      ['entities',refreshEntities],
      ['factions',refreshFactions],
      ['npcs',refreshNpcs],
      ['vehicles',refreshVehicles],
      ['stations',refreshStations],
      ['travels',refreshTravels]
    ];
    if(isMaster()){jobs.push(['infection',refreshInfection],['hordes',refreshHordes]);}
    const results=await Promise.allSettled(jobs.map(x=>safeCall(x[0],x[1])));
    const failed=results.map((r,i)=>r.status==='rejected'?jobs[i][0]:null).filter(Boolean);
    await refreshMembers();
    if(!isMaster()) await refreshPlayerPosition();
    renderEverything();
    if(!isMaster()&&state.mapPosition) centerTo(state.mapPosition,Math.max(15,state.map.getZoom()));
    if(isMaster()){
      const party=state.members.map(validMemberPoint).filter(Boolean), base=center();
      if(party.length) state.map.fitBounds([base,...party].map(p=>[p.lat,p.lng]),{padding:[90,90],maxZoom:10,animate:false});
    }
    if(failed.length){setStatus('Mapa carregado com falhas: '+failed.join(', ')+'.','error');report('map-refresh-partial',{failed});}
    else setStatus('Mundo pronto para a mesa.');
  }

  async function refreshMembers(){
    const r=await aeriom.rpc('list_campaign_map_members',{p_campaign_id:state.campaign.id});
    if(r.error) throw r.error;
    state.members=Array.isArray(r.data)?r.data:[];
    const me=state.members.find(x=>String(x.user_id)===String(state.session.user.id));
    state.mapPosition=validMemberPoint(me);
    renderMembers();
    renderPartyList();
    $('partyCount').textContent=String(state.members.length);
  }

  function validMemberPoint(m){
    const p=pt(m?.latitude,m?.longitude);
    if(p && !(Math.abs(p.lat)<0.00001 && Math.abs(p.lng)<0.00001)) return p;
    return null;
  }

  async function refreshPlayerPosition(){
    const r=await aeriom.rpc('ensure_campaign_map_position',{p_campaign_id:state.campaign.id});
    if(r.error){ state.mapPosition=null; report('map-position-error',{message:r.error.message}); return null; }
    state.mapPosition=pt(r.data?.latitude,r.data?.longitude);
    if(state.mapPosition && (Math.abs(state.mapPosition.lat)<.00001 && Math.abs(state.mapPosition.lng)<.00001)) state.mapPosition=null;
    return state.mapPosition;
  }

  async function refreshLocations(){
    const r=isMaster()
      ? await aeriom.from('campaign_world_locations').select('*').eq('campaign_id',state.campaign.id).order('updated_at',{ascending:false}).limit(450)
      : await aeriom.rpc('list_campaign_visible_world_locations',{p_campaign_id:state.campaign.id});
    if(r.error) throw r.error;
    state.locations=Array.isArray(r.data)?r.data:[];
  }

  async function refreshEntities(){const r=await aeriom.rpc('list_campaign_map_entities',{p_campaign_id:state.campaign.id});if(r.error)throw r.error;state.entities=Array.isArray(r.data)?r.data:[];}
  async function refreshFactions(){const r=await aeriom.from('campaign_factions').select('*').eq('campaign_id',state.campaign.id).limit(120);if(r.error)throw r.error;state.factions=r.data||[];}
  async function refreshNpcs(){const r=await aeriom.from('campaign_npcs').select('*').eq('campaign_id',state.campaign.id).limit(100);if(r.error)throw r.error;state.npcs=r.data||[];}
  async function refreshVehicles(){const r=await aeriom.from('campaign_vehicles').select('*').eq('campaign_id',state.campaign.id).limit(80);if(r.error)throw r.error;state.vehicles=r.data||[];}
  async function refreshStations(){const r=await aeriom.from('crafting_stations').select('*').eq('campaign_id',state.campaign.id).limit(80);if(r.error)throw r.error;state.stations=r.data||[];}
  async function refreshHordes(){const r=await aeriom.from('campaign_hordes').select('*').eq('campaign_id',state.campaign.id).limit(120);if(r.error)throw r.error;state.hordes=r.data||[];}
  async function refreshInfection(){const r=await aeriom.rpc('list_campaign_infection_zones',{p_campaign_id:state.campaign.id});if(r.error)throw r.error;state.infection=Array.isArray(r.data)?r.data:[];}
  async function refreshTravels(){const r=await aeriom.rpc('list_campaign_travels',{p_campaign_id:state.campaign.id,p_limit:12});if(r.error)throw r.error;state.travels=Array.isArray(r.data)?r.data:[];$('statTravels').textContent=String(state.travels.length);}

  function renderEverything(){renderMembers();renderLocations();renderEntities();renderFactions();renderNpcs();renderVehicles();renderStations();renderThreats();renderVision();renderSelection();renderStats();renderMasterTools();updateReadout();}
  function inView(p,pad=.08){const b=state.map?.getBounds()?.pad(pad);return !b||b.contains([p.lat,p.lng]);}

  function renderMembers(){
    state.layer.members.clearLayers();
    const pts=state.members.map(m=>({m,p:validMemberPoint(m)})).filter(x=>x.p).slice(0,MAX_VISIBLE.members);
    pts.forEach(({m,p})=>{
      const me=String(m.user_id)===String(state.session.user.id), masterRow=m.role==='master';
      const circle=L.circleMarker([p.lat,p.lng],{
        renderer:state.renderer,radius:me?8:7,
        color:masterRow?'#f0cf84':me?'#7fe7a7':'#c7c0b4',
        fillColor:masterRow?'#f0cf84':me?'#7fe7a7':'#c7c0b4',
        fillOpacity:1,weight:2
      }).addTo(state.layer.members);
      circle.on('click',e=>{L.DomEvent.stopPropagation(e);openMember(m,p);});
    });
  }


  function openMember(m,p){
    const isMe=String(m?.user_id)===String(state.session.user.id);
    openModal('SOBREVIVENTE','<div class="map-location-sheet"><div class="selected-location-hero"><div class="selected-location-icon">'+esc(initials(m?.display_name))+'</div><div><strong>'+esc(m?.display_name||'Sobrevivente')+'</strong><small>'+esc(m?.role==='master'?'MESTRE':'SOBREVIVENTE')+(isMe?' · VOCÊ':'')+'</small></div></div><div class="map-location-kpis"><div><span>POSIÇÃO</span><b>'+ (p?'ATIVA':'SEM POSIÇÃO') +'</b></div><div><span>DISTÂNCIA</span><b>'+ (p?km(distance(currentPoint(),p)):'—') +'</b></div><div><span>REALTIME</span><b>AO VIVO</b></div></div><div class="selection-actions"><button type="button" id="centerMember">CENTRALIZAR</button></div></div>');
    $('centerMember').onclick=()=>{closeModal();centerTo(p,Math.max(15,state.map.getZoom()));};
  }

  function renderLocations(){
    state.layer.locations.clearLayers();
    const bounds=state.map?.getBounds()?.pad(.1);
    const visible=state.locations.filter(l=>{
      const p=pt(l.latitude,l.longitude);
      if(!p||!inView(p,.1)) return false;
      if(isMaster()) return true;
      return l.discovered===true;
    }).slice(0,state.map.getZoom()<=7?45:state.map.getZoom()<=11?65:MAX_VISIBLE.locations);
    visible.forEach(l=>{
      const p=pt(l.latitude,l.longitude); if(!p)return;
      const c=L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:7,color:'#090908',weight:2,fillColor:'#d5b46c',fillOpacity:.95}).addTo(state.layer.locations);
      c.on('click',e=>{L.DomEvent.stopPropagation(e);openLocation(l);});
    });
  }

  function renderEntities(){
    state.layer.entities.clearLayers();
    const zoom=state.map.getZoom();
    state.entities.slice(0,zoom<9?45:MAX_VISIBLE.entities).forEach(e=>{
      const g=e.geometry||{};
      if(g.type==='polygon'&&Array.isArray(g.coordinates)){L.polygon(g.coordinates,{renderer:state.renderer,color:'#d5b46c',weight:1,fillColor:'#d5b46c',fillOpacity:.06,dashArray:'6 6'}).addTo(state.layer.entities);return;}
      if(g.type==='polyline'&&Array.isArray(g.coordinates)){L.polyline(g.coordinates,{renderer:state.renderer,color:'#7fe7a7',weight:3,opacity:.7}).addTo(state.layer.entities);return;}
      const p=pt(e.latitude,e.longitude);if(!p||!inView(p,.1))return;
      const c=L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:6,color:'#0b0b0a',weight:2,fillColor:entityColor(e.entity_type),fillOpacity:.95}).addTo(state.layer.entities);
      c.on('click',ev=>{L.DomEvent.stopPropagation(ev);openEntity(e);});
    });
  }

  function entityColor(t){return ({hospital:'#dbe6db',shelter:'#d5b46c',commerce:'#a9b5a5',fuel:'#d5b46c',barricade:'#b5aaa0',hazard:'#d85a54',military:'#89958c',custom:'#c7c0b4',station:'#d5b46c',vehicle:'#9ba59d'}[t]||'#b0aa9e');}

  function renderThreats(){
    state.layer.hordes.clearLayers();state.layer.infection.clearLayers();
    if(!isMaster()) return;
    state.hordes.slice(0,60).forEach(h=>{
      const p=pt(h.latitude,h.longitude);
      const c=L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:9,color:'#0b0808',weight:2,fillColor:'#d85a54',fillOpacity:1}).addTo(state.layer.hordes);
      c.on('click',ev=>{L.DomEvent.stopPropagation(ev);openHordeEditor(h);});
    });
    state.infection.slice(0,25).forEach(z=>{
      const p=pt(z.latitude,z.longitude);if(!p)return;
      const pct=n(z.infection_percent);
      const col=pct>=80?'#d85a54':pct>=60?'#c08c5a':'#d5b46c';
      L.circle([p.lat,p.lng],{renderer:state.renderer,radius:Math.max(150,n(z.radius_m,650)),color:col,weight:1,opacity:.65,fillColor:col,fillOpacity:.055}).addTo(state.layer.infection);
    });
  }

  function renderFactions(){
    state.layer.factions.clearLayers();
    if(state.map.getZoom()<5) return;
    state.factions.slice(0,24).forEach(f=>{
      const g=f.territory||{},coords=g.coordinates||g.polygon;
      if(Array.isArray(coords)&&coords.length>=3)L.polygon(coords,{renderer:state.renderer,color:'#d5b46c',weight:1,fillColor:'#d5b46c',fillOpacity:.035,dashArray:'8 8'}).addTo(state.layer.factions);
    });
  }
  function renderNpcs(){state.layer.npcs.clearLayers();const bounds=state.map.getBounds().pad(.08);state.npcs.slice(0,35).forEach(x=>{const p=pt(x.latitude,x.longitude);if(p&&bounds.contains([p.lat,p.lng]))L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:5,color:'#0a0a09',weight:2,fillColor:'#b6aea1',fillOpacity:.95}).addTo(state.layer.npcs).on('click',e=>{L.DomEvent.stopPropagation(e);openEntity({entity_type:'npc',name:x.name,description:x.profession||x.description,latitude:p.lat,longitude:p.lng,state:x.state||{},metadata:x});})})}
  function renderVehicles(){state.layer.vehicles.clearLayers();const bounds=state.map.getBounds().pad(.08);state.vehicles.slice(0,35).forEach(x=>{const p=pt(x.latitude,x.longitude);if(p&&bounds.contains([p.lat,p.lng]))L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:5,color:'#0a0a09',weight:2,fillColor:'#9ba59d',fillOpacity:.95}).addTo(state.layer.vehicles).on('click',e=>{L.DomEvent.stopPropagation(e);openEntity({entity_type:'vehicle',name:x.name,description:x.vehicle_type||x.description,latitude:p.lat,longitude:p.lng,state:x.state||{},metadata:x});})})}
  function renderStations(){state.layer.stations.clearLayers();const bounds=state.map.getBounds().pad(.08);state.stations.slice(0,25).forEach(x=>{const p=pt(x.latitude,x.longitude);if(p&&bounds.contains([p.lat,p.lng]))L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:5,color:'#0a0a09',weight:2,fillColor:'#d5b46c',fillOpacity:.95}).addTo(state.layer.stations).on('click',e=>{L.DomEvent.stopPropagation(e);openEntity({entity_type:'station',name:x.name,description:x.station_type,latitude:p.lat,longitude:p.lng,state:{condition:x.condition},metadata:x});})})}

  function renderVision(){
    const fog=$('mapFog');
    if(!fog||!state.map)return;
    if(isMaster()||!state.mapPosition||state.map.getZoom()<12){fog.classList.remove('is-active');return;}
    const origin=L.latLng(state.mapPosition.lat,state.mapPosition.lng);
    const px=state.map.latLngToContainerPoint(origin);
    const px2=L.point(px.x+100,px.y);
    const metersPer100px=Math.max(1,state.map.distance(origin,state.map.containerPointToLatLng(px2)));
    const radius=Math.max(34,Math.min(560,VISION_M*(100/metersPer100px)));
    fog.style.setProperty('--fog-x',px.x+'px');
    fog.style.setProperty('--fog-y',px.y+'px');
    fog.style.setProperty('--fog-radius',radius+'px');
    fog.classList.add('is-active');
  }

  function renderPartyList(){
    const el=$('partyList'); if(!el)return;
    el.innerHTML=state.members.map(m=>{
      const me=String(m.user_id)===String(state.session.user.id),p=validMemberPoint(m);
      return '<div class="party-row"><span class="party-avatar">'+esc(initials(m.display_name))+'<i></i></span><span><strong>'+esc(m.display_name||'Sobrevivente')+(me?' · você':'')+'</strong><small>'+esc(m.role==='master'?'MESTRE':'SOBREVIVENTE')+' · '+(p?'POSIÇÃO ATIVA':'SEM GPS')+'</small></span><b>'+ (p?'●':'—') +'</b></div>';
    }).join('') || '<div class="selection-placeholder">Nenhum membro encontrado.</div>';
    const vs=$('visionStatus'); if(vs)vs.textContent=state.mapPosition?'Posição sincronizada':'Posição ainda não definida';
  }

  function renderSelection(){
    const title=$('selectionTitle'), body=$('selectionBody');
    if(!title||!body)return;
    if(!state.selected){title.textContent='Nenhum local';body.innerHTML='<div class="selection-placeholder">Toque em um marcador para abrir a ficha do local.</div>';return;}
    const l=state.selected;
    title.textContent=l.name||'Local';
    const dist=km(meters(currentPoint(),pt(l.latitude,l.longitude)||currentPoint()));
    body.innerHTML='<div class="selected-location-preview"><div class="selected-location-hero"><div class="selected-location-icon">'+esc(iconByCategory(l.category))+'</div><div><strong>'+esc(l.name)+'</strong><small>'+esc(l.category||'Local')+' · '+dist+'</small></div></div><div class="selected-location-stats"><div><span>TIPO</span><b>'+esc(l.category||'—')+'</b></div><div><span>PERIGO</span><b>'+esc(l.danger||'—')+'</b></div><div><span>DESCOBERTO</span><b>'+ (l.discovered?'SIM':'NÃO') +'</b></div></div><div class="selection-actions"><button type="button" id="selectionOpen">ABRIR FICHA</button><button type="button" id="selectionCenter">CENTRALIZAR</button></div></div>';
    $('selectionOpen').onclick=()=>openLocation(l);
    $('selectionCenter').onclick=()=>centerTo(pt(l.latitude,l.longitude),16);
  }

  function renderStats(){
    $('statLocations').textContent=String(state.locations.filter(x=>x.discovered!==false).length);
    $('statThreats').textContent=String(isMaster()?state.hordes.length:0);
    $('statTravels').textContent=String(state.travels.length);
  }

  async function openLocation(l){
    state.selected=l;renderSelection();
    centerTo(pt(l.latitude,l.longitude),Math.max(15,state.map.getZoom()));
    let areas=[];
    try{
      const r=await aeriom.rpc(isMaster()?'list_campaign_location_areas':'list_campaign_visible_location_areas',{p_location_id:l.id});
      if(r.error)throw r.error; areas=Array.isArray(r.data)?r.data:[];
    }catch(err){report('map-location-areas-error',{message:err?.message||String(err)});}
    const safeStatus=l.danger||'descoberto';
    openModal('FICHA DO LOCAL',renderLocationHtml(l,areas,safeStatus));
  }

  function renderLocationHtml(l,areas,status){
    const hero=l?.metadata?.image_url||l?.metadata?.image||'';
    const actionsForArea=(area)=>['observe','search','investigate'].map(action=>
      '<button type="button" class="map-action-choice" data-area-action="'+action+'" data-area="'+esc(area.id)+'"><span>'+({observe:'◉',search:'⌕',investigate:'⌁'}[action])+'</span><strong>'+({observe:'OBSERVAR',search:'VASCULHAR',investigate:'INVESTIGAR'}[action])+'</strong><small>'+({observe:'Perceber o ambiente.',search:'Procurar itens e recursos.',investigate:'Analisar pistas e detalhes.'}[action])+'</small></button>'
    ).join('');
    const areaBlocks=areas.length?areas.map(a=>'<section class="map-location-area-block"><div class="map-area-card-head"><div><strong>'+esc(a.name)+'</strong><small>'+esc(a.category||'Área')+' · '+esc(a.danger||'unknown')+(a.difficulty?' · CD '+a.difficulty:'')+'</small></div><span class="area-step">ÁREA</span></div><p>'+esc(a.description||'Nenhuma descrição revelada.')+'</p><div class="map-action-choice-grid map-action-choice-grid--compact">'+actionsForArea(a)+'</div></section>').join(''):'';
    const genericActions=['observe','search','investigate'].map(action=>
      '<button type="button" class="map-action-choice" data-location-action="'+action+'"><span>'+({observe:'◉',search:'⌕',investigate:'⌁'}[action])+'</span><strong>'+({observe:'OBSERVAR',search:'VASCULHAR',investigate:'INVESTIGAR'}[action])+'</strong><small>'+({observe:'Perceber o ambiente.',search:'Procurar itens e recursos.',investigate:'Analisar pistas e detalhes.'}[action])+'</small></button>'
    ).join('');
    const heroStyle=hero?' style="background-image:linear-gradient(180deg,rgba(5,5,4,.02),rgba(5,5,4,.82)),url(\''+esc(hero)+'\')"':'';
    const tools=isMaster()?'<div class="map-sheet-actions"><button type="button" id="editLocation">EDITAR LOCAL</button><button type="button" id="createArea">+ CRIAR ÁREA</button></div>':'';
    return '<div class="map-action-layout">'+
      '<aside class="map-action-context"><div class="map-action-kicker">LOCAL DA CAMPANHA</div><h3>'+esc(l.name||'Local')+'</h3><div class="map-location-kpis"><div><span>PERIGO</span><b>'+esc(status||'DESCONHECIDO')+'</b></div><div><span>CONDIÇÃO</span><b>'+esc(l.condition||l.state?.condition||'DESCOBERTO')+'</b></div><div><span>RUÍDO</span><b>'+((isMaster()&&l.noise_level!=null)?String(l.noise_level):'—')+'</b></div></div><p class="map-location-address">'+esc(l.address||'Local registrado no mundo da campanha.')+'</p>'+tools+'<div class="map-action-note"><span>MEMÓRIA DO MUNDO</span><p>O mapa registra onde a mesa esteve e o que foi descoberto.</p></div></aside>'+
      '<main class="map-action-main"><div class="map-action-hero"'+heroStyle+'><div><span>AFTERLIFE · EXPLORAÇÃO</span><strong>O local responde à sua ação.</strong><small>Escolha a intenção. A perícia resolve a mecânica; o Mestre conduz a cena.</small></div></div><div class="action-stepper"><span class="active">01 PREPARAR</span><i></i><span>02 TESTE</span><i></i><span>03 RESULTADO</span><i></i><span>04 REGISTRAR</span></div><div class="map-action-copy"><span>AÇÃO DO SOBREVIVENTE</span><strong>O que você faz?</strong><small>'+esc(areas.length?'Escolha uma ação dentro de uma área descoberta.':'Comece observando o local; novas informações podem ser reveladas pela mesa.')+'</small></div><div class="map-action-choice-grid">'+(areas.length?areaBlocks:genericActions)+'</div><div id="mapActionResult" class="map-action-result"></div></main>'+
      '<aside class="map-action-info"><div class="map-info-card"><span>PERÍCIA</span><strong>O sistema calcula o teste.</strong><p>Perícia, dado, dificuldade, condição do local e modificadores entram no resultado.</p></div><div class="map-info-card"><span>VISIBILIDADE</span><strong>'+esc(isMaster()?'Visão total do Mestre':'Informação descoberta')+'</strong><p>'+esc(isMaster()?'Segredos do cenário permanecem no controle da preparação do Mestre.':'O sobrevivente recebe somente o que sua exploração permitiu descobrir.')+'</p></div><div class="map-info-card map-info-tip"><span>DICA DE MESA</span><strong>Narre primeiro. Clique depois.</strong><p>O mapa apoia a interpretação cara a cara; ele não substitui a narração do Mestre.</p></div></aside>'+
    '</div>';
  }

  async function resolveLocationAction(locationId,action){
    const out=$('mapActionResult');if(out)out.innerHTML='<div class="map-spinner">EXECUTANDO TESTE…</div>';
    try{
      const r=await aeriom.rpc('resolve_location_action',{p_location_id:locationId,p_action_key:action});if(r.error)throw r.error;
      const d=r.data||{},loot=Array.isArray(d.loot)?d.loot:[];
      if(out)out.innerHTML='<div class="action-stepper"><span class="done">01 PREPARAR</span><i></i><span class="done">02 TESTE</span><i></i><span class="active">03 RESULTADO</span><i></i><span>04 REGISTRAR</span></div><div class="map-result-head"><span>'+esc(d.skill_label||'PERÍCIA')+' · '+esc(d.attribute_label||'ATRIBUTO')+'</span><strong>'+esc(String(d.result||'RESULTADO').replaceAll('_',' ').toUpperCase())+'</strong></div><div class="map-roll-line"><b>'+esc(d.die||'D?')+'</b><strong>'+n(d.natural_roll)+' + '+n(d.training_bonus)+' + '+n(d.modifier)+' = '+n(d.total)+'</strong><small>Dificuldade '+n(d.difficulty,10)+'</small></div><p>'+esc(d.consequence||'O Mestre narra o que acontece.')+'</p>'+(d.discovery_text?'<div class="map-result-block"><span>DESCOBERTA</span><p>'+esc(d.discovery_text)+'</p></div>':'')+(d.revealed_information?'<div class="map-result-block"><span>INFORMAÇÃO</span><p>'+esc(d.revealed_information)+'</p></div>':'')+(loot.length?'<div class="map-result-block"><span>SAQUE DISPONÍVEL</span><div class="map-loot-list">'+loot.map(x=>'<button type="button" data-loot="'+esc(x.id)+'"><span>◆</span><b>'+esc(x.item_name)+'</b><small>'+esc(x.item_category||'item')+' · x'+n(x.quantity,1)+' · '+esc(x.rarity||'comum')+'</small></button>').join('')+'</div></div>':'');
      bindLootButtons(out);
      if(d.discovered){await refreshLocations();renderEverything();if(state.selected){state.selected=state.locations.find(x=>x.id===locationId)||state.selected;renderSelection();}}
      toast('Ação resolvida.');
    }catch(err){report('map-location-action-error',{message:err?.message||String(err),locationId,action});if(out)out.innerHTML='<div class="map-result-error">'+esc(err?.message||'Não foi possível resolver a ação.')+'</div>';toast(err?.message||'Falha no teste.','error');}
  }

  function bindLootButtons(root){
    root?.querySelectorAll('[data-loot]').forEach(btn=>btn.onclick=()=>claimLoot(btn));
  }

  async function claimLoot(btn){
    try{
      const r=await aeriom.rpc('claim_area_loot',{p_loot_id:btn.dataset.loot});if(r.error)throw r.error;
      btn.disabled=true;btn.innerHTML='<span>✓</span><b>COLETADO</b><small>Adicionado ao inventário.</small>';toast('Saque coletado.');
    }catch(err){report('map-loot-claim-error',{message:err?.message||String(err)});toast(err?.message||'Não foi possível coletar o saque.','error');}
  }

  function bindModal(){const b=$('mapModalBody');if(!b)return;b.querySelectorAll('[data-area-action]').forEach(x=>x.onclick=()=>resolveArea(x.dataset.area,x.dataset.areaAction));b.querySelectorAll('[data-location-action]').forEach(x=>x.onclick=()=>resolveLocationAction(state.selected?.id,x.dataset.locationAction));bindLootButtons(b);b.querySelector('[id="editLocation"]')?.addEventListener('click',()=>openLocationEditor(state.selected));b.querySelector('[id="createArea"]')?.addEventListener('click',()=>openCreateArea(state.selected));}

  function openModal(title,html){$('mapModalTitle').textContent=title;$('mapModalBody').innerHTML=html;$('mapModalBackdrop').hidden=false;bindModal();}
  function closeModal(){$('mapModalBackdrop').hidden=true;}

  function openLocationEditor(l){
    if(!isMaster())return;
    openModal('EDITAR LOCAL','<form id="locForm" class="map-form"><label>CONDIÇÃO<input name="condition" value="'+esc(l.state?.condition||'unknown')+'"></label><label>PERIGO<input name="danger" value="'+esc(l.danger||'unknown')+'"></label><label>NOTA<textarea name="note" rows="4">'+esc(l.note||'')+'</textarea></label><footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">SALVAR</button></footer></form>');
    const f=$('locForm');$('cancelForm').onclick=closeModal;
    f.onsubmit=async e=>{e.preventDefault();const r=await aeriom.rpc('update_campaign_world_location',{p_id:l.id,p_condition:f.condition.value,p_resources:l.resources||{},p_danger:f.danger.value,p_note:f.note.value});if(r.error){toast(r.error.message||'Falha ao salvar.','error');return;}await refreshLocations();renderEverything();closeModal();toast('Local atualizado.');};
  }

  function openCreateArea(l){
    if(!isMaster())return;
    openModal('NOVA ÁREA','<form id="areaForm" class="map-form"><label>NOME<input name="name" required value="Área principal"></label><label>CATEGORIA<input name="category" value="área"></label><label>DESCRIÇÃO<textarea name="description" rows="3"></textarea></label><div class="map-form-grid"><label>CD<input name="difficulty" type="number" value="10" min="1" max="20"></label><label>PERIGO<select name="danger"><option>unknown</option><option>low</option><option selected>medium</option><option>high</option><option>critical</option></select></label></div><label>INFORMAÇÃO DO MESTRE<textarea name="information" rows="3"></textarea></label><footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">CRIAR ÁREA</button></footer></form>');
    const f=$('areaForm');$('cancelForm').onclick=closeModal;
    f.onsubmit=async e=>{e.preventDefault();const r=await aeriom.rpc('create_campaign_location_area',{p_location_id:l.id,p_name:f.name.value.trim(),p_category:f.category.value.trim(),p_description:f.description.value.trim()||null,p_difficulty:n(f.difficulty.value,10),p_danger:f.danger.value,p_information:f.information.value.trim()||null,p_event:{},p_loot_profile:{},p_creatures:[],p_secrets:[]});if(r.error){toast(r.error.message||'Falha ao criar área.','error');return;}closeModal();toast('Área criada.');openLocation(l);};
  }

  function openEntity(e){
    openModal('ELEMENTO DO MUNDO','<div class="map-location-sheet"><div class="selected-location-hero"><div class="selected-location-icon">'+esc(iconByCategory(e.entity_type))+'</div><div><strong>'+esc(e.name||'Elemento')+'</strong><small>'+esc(e.entity_type||'mundo')+'</small></div></div><p class="map-location-address">'+esc(e.description||'Sem descrição.')+'</p>'+(isMaster()&&e.id?'<div class="selection-actions"><button type="button" id="deleteEntity">EXCLUIR</button></div>':'')+'</div>');
    $('deleteEntity')?.addEventListener('click',async()=>{if(!confirm('Excluir este elemento?'))return;const r=await aeriom.rpc('delete_campaign_map_entity',{p_entity_id:e.id});if(r.error){toast(r.error.message||'Falha ao excluir.','error');return;}await refreshEntities();renderEntities();renderMasterTools();closeModal();toast('Elemento excluído.');});
  }

  function openEntityEditor(p){
    const types=[['house','🏚 Casa'],['commerce','⌂ Comércio'],['hospital','🏥 Hospital'],['fuel','⛽ Posto'],['shelter','⌂ Abrigo'],['barricade','🚧 Barricada'],['hazard','☣ Perigo'],['station','⚒ Estação'],['custom','✦ Outro']];
    openModal('NOVO ELEMENTO','<form id="entityForm" class="map-form"><label>TIPO<select name="type">'+types.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('')+'</select></label><label>NOME<input name="name" required value="Elemento do mundo"></label><label>DESCRIÇÃO<textarea name="description" rows="3"></textarea></label><input type="hidden" name="lat" value="'+n(p.lat)+'"><input type="hidden" name="lng" value="'+n(p.lng)+'"><footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">SALVAR</button></footer></form>');
    const f=$('entityForm');$('cancelForm').onclick=closeModal;
    f.onsubmit=async e=>{e.preventDefault();const r=await aeriom.rpc('create_campaign_map_entity',{p_campaign_id:state.campaign.id,p_entity_type:f.type.value,p_name:f.name.value.trim(),p_description:f.description.value.trim()||null,p_latitude:n(f.lat.value),p_longitude:n(f.lng.value),p_geometry:null,p_state:{},p_metadata:{}});if(r.error){toast(r.error.message||'Falha ao criar.','error');return;}await refreshEntities();renderEntities();renderMasterTools();closeModal();toast('Elemento criado.');};
  }

  function openHordeEditor(existing,p){
    if(!isMaster())return;
    const e=existing||{};
    openModal(existing?'EDITAR HORDA':'NOVA HORDA','<form id="hordeForm" class="map-form"><input type="hidden" name="id" value="'+esc(e.id||'')+'"><input type="hidden" name="lat" value="'+(e.latitude??p?.lat??'')+'"><input type="hidden" name="lng" value="'+(e.longitude??p?.lng??'')+'"><label>NOME<input name="name" value="'+esc(e.name||'Onda detectada')+'"></label><div class="map-form-grid"><label>ZUMBIS<input type="number" name="size" value="'+n(e.size,30)+'" min="1"></label><label>VELOCIDADE<input type="number" name="speed" value="'+n(e.speed_kmh,10)+'" min="0"></label></div><div class="map-form-grid"><label>DIREÇÃO<input type="number" name="direction" value="'+n(e.direction_deg,0)+'" min="0" max="359"></label><label>ETA<input type="number" name="eta" value="'+n(e.eta_minutes,0)+'" min="0"></label></div><footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">SALVAR</button></footer></form>');
    const f=$('hordeForm');$('cancelForm').onclick=closeModal;
    f.onsubmit=async e2=>{e2.preventDefault();const r=f.id.value?await aeriom.rpc('update_campaign_horde',{p_id:f.id.value,p_latitude:n(f.lat.value),p_longitude:n(f.lng.value),p_size:n(f.size.value,30),p_speed_kmh:n(f.speed.value,10),p_direction_deg:n(f.direction.value),p_detected:true,p_status:'moving',p_eta_minutes:n(f.eta.value)||null}):await aeriom.rpc('create_campaign_horde',{p_campaign_id:state.campaign.id,p_latitude:n(f.lat.value),p_longitude:n(f.lng.value),p_size:n(f.size.value,30),p_speed_kmh:n(f.speed.value,10),p_direction_deg:n(f.direction.value),p_source_zone_id:null});if(r.error){toast(r.error.message||'Falha ao salvar horda.','error');return;}await refreshHordes();renderThreats();renderStats();closeModal();toast('Horda sincronizada.');};
  }

  function renderMasterTools(){
    const host=$('masterTools');if(!host)return;
    if(!isMaster()){host.innerHTML='';return;}
    const tools=[['entity','✦','ELEMENTO'],['horde','☢','HORDA'],['territory','🏴','TERRITÓRIO'],['barricade','🚧','BARRICADA'],['travel','➜','VIAGEM']];
    host.innerHTML=tools.map(t=>'<button type="button" class="master-tool" data-mode="'+t[0]+'"><span>'+t[1]+'</span><b>'+t[2]+'</b></button>').join('');
    host.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>activateEditor(b.dataset.mode));
  }

  function activateEditor(mode){
    state.editorMode=mode;
    state.drawing=null;
    document.querySelectorAll('.master-tool').forEach(b=>b.classList.toggle('is-active',b.dataset.mode===mode));
    const text={entity:'Clique no mapa para colocar um elemento.',horde:'Clique no mapa para criar uma horda.',territory:'Clique no mapa para desenhar o território. Duplo clique finaliza.',barricade:'Clique no mapa para desenhar uma barricada. Duplo clique finaliza.',travel:'Clique no mapa para escolher o destino da viagem.'}[mode];
    toast(text);
    if(mode==='territory'||mode==='barricade'){state.map.doubleClickZoom.disable();ensureDrawingListener();}
  }

  function ensureDrawingListener(){if(state.drawingBound)return;state.drawingBound=true;state.map.on('dblclick',finishDrawing);}
  function onMapClick(e){
    setCoordinates(e.latlng);
    if(!isMaster()||!state.editorMode)return;
    if(state.editorMode==='entity'){state.editorMode=null;openEntityEditor(e.latlng);return;}
    if(state.editorMode==='horde'){state.editorMode=null;openHordeEditor(null,e.latlng);return;}
    if(state.editorMode==='travel'){state.editorMode=null;openTravelCreator(e.latlng);return;}
    if(state.editorMode==='territory'||state.editorMode==='barricade'){addDrawingPoint(e.latlng);}
  }

  function addDrawingPoint(p){
    if(!state.drawing)state.drawing={type:state.editorMode,points:[],layer:null};
    state.drawing.points.push([p.lat,p.lng]);
    if(!state.drawing.layer){
      state.drawing.layer=state.drawing.type==='territory'
        ? L.polygon(state.drawing.points,{renderer:state.renderer,color:'#d5b46c',weight:2,fillColor:'#d5b46c',fillOpacity:.08,dashArray:'6 6'})
        : L.polyline(state.drawing.points,{renderer:state.renderer,color:'#7fe7a7',weight:4,dashArray:'8 7'});
      state.drawing.layer.addTo(state.map);
    } else state.drawing.layer.setLatLngs(state.drawing.points);
  }

  function finishDrawing(){
    if(!state.drawing)return;
    const d=state.drawing;state.drawing=null;d.layer?.remove();state.map.doubleClickZoom.enable();
    if(d.type==='territory'){openTerritoryEditor(d.points);}
    else if(d.type==='barricade'&&d.points.length>=2){openEntityEditor({lat:d.points[0][0],lng:d.points[0][1],geometry:{type:'polyline',coordinates:d.points}});}
    state.editorMode=null;
    document.querySelectorAll('.master-tool').forEach(b=>b.classList.remove('is-active'));
  }

  function openTerritoryEditor(points){
    if(!state.factions.length){toast('Cadastre uma facção antes de desenhar um território.','error');return;}
    const opts=state.factions.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+'</option>').join('');
    openModal('TERRITÓRIO','<form id="territoryForm" class="map-form"><label>FACÇÃO<select name="faction">'+opts+'</select></label><footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">SALVAR TERRITÓRIO</button></footer></form>');
    const f=$('territoryForm');$('cancelForm').onclick=closeModal;
    f.onsubmit=async e=>{e.preventDefault();const fac=state.factions.find(x=>x.id===f.faction.value);const r=await aeriom.rpc('update_campaign_faction',{p_id:fac.id,p_name:fac.name,p_description:fac.description||null,p_reputation_default:n(fac.reputation_default),p_resources:fac.resources||{},p_territory:{type:'polygon',coordinates:points}});if(r.error){toast(r.error.message||'Falha ao salvar território.','error');return;}await refreshFactions();renderFactions();closeModal();toast('Território salvo.');};
  }

  function openTravelCreator(destination){
    const origin=currentPoint(),d=pt(destination?.lat,destination?.lng);if(!d)return;
    const players=state.members.filter(m=>m.role!=='master');
    openModal('PLANEJAR VIAGEM','<form id="travelForm" class="map-form"><div class="selected-location-hero"><div class="selected-location-icon">➜</div><div><strong>Origem → destino</strong><small>'+origin.lat.toFixed(5)+'°, '+origin.lng.toFixed(5)+'° → '+d.lat.toFixed(5)+'°, '+d.lng.toFixed(5)+'°</small></div></div><label>NOME DO DESTINO<input name="name" required value="Destino no mapa"></label><div class="map-form-grid"><label>KM/H<input name="speed" type="number" min=".1" value="5"></label><label>EXPOSIÇÃO/KM<input name="exposure" type="number" min="0" value="0"></label></div><div class="map-section-title">PARTICIPANTES</div>'+players.map(m=>'<label><span><input type="checkbox" name="participant" value="'+esc(m.user_id)+'"> '+esc(m.display_name||'Sobrevivente')+'</span></label>').join('')+'<footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">CRIAR VIAGEM</button></footer></form>');
    const f=$('travelForm');$('cancelForm').onclick=closeModal;
    f.onsubmit=async e=>{e.preventDefault();const ids=[...f.querySelectorAll('[name="participant"]:checked')].map(x=>x.value);if(!ids.length){toast('Selecione ao menos um sobrevivente.','error');return;}const dist=meters(origin,d),r=await aeriom.rpc('create_campaign_travel',{p_campaign_id:state.campaign.id,p_origin_latitude:origin.lat,p_origin_longitude:origin.lng,p_destination_latitude:d.lat,p_destination_longitude:d.lng,p_destination_location_id:null,p_destination_name:f.name.value.trim(),p_route:{provider:'straight',geometry:{coordinates:[[origin.lng,origin.lat],[d.lng,d.lat]]}},p_distance_m:dist,p_speed_kmh:n(f.speed.value,5),p_fuel_per_km:0,p_energy_per_km:0,p_exposure_per_km:n(f.exposure.value),p_participant_user_ids:ids});if(r.error){toast(r.error.message||'Falha na viagem.','error');return;}await refreshTravels();renderStats();closeModal();toast('Viagem planejada.');};
  }

  function openSheet(kind){
    if(window.matchMedia && !window.matchMedia('(max-width:700px)').matches){
      return openSystemModal(kind);
    }
    const sheet=$('mapPanelSheet'),title=$('sheetTitle'),body=$('sheetBody'); if(!sheet||!body)return;
    let t='Painel',html='';
    if(kind==='party'){t='Grupo';html='<div class="sheet-section"><div class="sheet-section-title">SOBREVIVENTES</div><div class="sheet-party">'+state.members.map(m=>'<div class="sheet-card"><strong>'+esc(m.display_name||'Sobrevivente')+'</strong><small>'+esc(m.role==='master'?'MESTRE':'SOBREVIVENTE')+' · '+(validMemberPoint(m)?'posição ativa':'sem posição')+'</small></div>').join('')+'</div></div>';}
    else if(kind==='explore'){t='Explorar';html='<div class="sheet-section"><div class="sheet-section-title">LOCAIS DESCOBERTOS</div><div class="sheet-party">'+state.locations.filter(x=>x.discovered!==false).slice(0,20).map(l=>'<button class="sheet-card" type="button" data-sheet-location="'+esc(l.id)+'"><strong>'+esc(l.name)+'</strong><small>'+esc(l.category||'Local')+'</small></button>').join('')+'</div></div>';}
    else if(kind==='master'){t='Mestre';html=buildMasterSheet();}
    else {t='Sistemas';html='<div class="sheet-actions"><button type="button" data-sheet-system="radar">☢ RADAR</button><button type="button" data-sheet-system="travel">➜ VIAGENS</button><button type="button" data-sheet-system="world">✦ MUNDO</button><button type="button" data-sheet-system="explore">⌁ EXPLORAR</button></div>';}
    title.textContent=t;body.innerHTML=html;sheet.classList.add('is-open');sheet.setAttribute('aria-hidden','false');
    body.querySelectorAll('[data-sheet-location]').forEach(b=>b.onclick=()=>{const l=state.locations.find(x=>x.id===b.dataset.sheetLocation);if(l){closeSheet();openLocation(l);}});
    body.querySelectorAll('[data-sheet-system]').forEach(b=>b.onclick=()=>{closeSheet();openSheet(b.dataset.sheetSystem);});
    bindMasterSheet(body);
  }

  function openSystemModal(kind){
    const titleMap={explore:'EXPLORAÇÃO',radar:'RADAR DE HORDA',travel:'VIAGENS',world:'MUNDO'};
    let html='';
    if(kind==='explore'){
      const rows=state.locations.filter(x=>x.discovered!==false).slice(0,16).map(l=>'<button type="button" class="map-list-row" data-modal-location="'+esc(l.id)+'"><span class="map-list-icon">'+esc(iconByCategory(l.category))+'</span><span><strong>'+esc(l.name)+'</strong><small>'+esc(l.category||'Local')+'</small></span><b>→</b></button>').join('');
      html='<div class="map-area-list">'+(rows||'<div class="map-empty-state">Nenhum local descoberto.</div>')+'</div>';
    } else if(kind==='radar'){
      html=isMaster()
        ? '<div class="map-area-list">'+(state.hordes.slice(0,24).map(h=>'<div class="map-area-card"><strong>☢ '+esc(h.name||'Horda')+'</strong><small>'+Math.round(n(h.size))+' zumbis · '+Math.round(n(h.threat_level,1))+'/10 · '+Math.round(n(h.direction_deg))+'°</small></div>').join('')||'<div class="map-empty-state">Nenhuma horda ativa.</div>')+'</div>'
        : '<div class="map-empty-state">O radar de hordas é informação controlada pelo Mestre.</div>';
    } else if(kind==='travel'){
      const t=state.travels.slice(0,12).map(x=>'<div class="map-area-card"><strong>➜ '+esc(x.destination_name||'Destino')+'</strong><small>'+esc(x.status||'planejada')+' · '+Math.round(n(x.progress_percent))+'%</small></div>').join('');
      html='<div class="map-area-list">'+(t||'<div class="map-empty-state">Nenhuma viagem registrada.</div>')+'</div>';
    } else {
      html='<div class="map-location-sheet"><div class="map-location-kpis"><div><span>FACÇÕES</span><b>'+state.factions.length+'</b></div><div><span>NPCs</span><b>'+state.npcs.length+'</b></div><div><span>VEÍCULOS</span><b>'+state.vehicles.length+'</b></div></div><p class="map-location-address">Infraestrutura e atores do mundo ficam sincronizados com a campanha.</p></div>';
    }
    openModal(titleMap[kind]||'SISTEMA',html);
    $('mapModalBody').querySelectorAll('[data-modal-location]').forEach(b=>b.onclick=()=>{const l=state.locations.find(x=>x.id===b.dataset.modalLocation);if(l){closeModal();openLocation(l);}});
  }

  function buildMasterSheet(){if(!isMaster())return '<div class="map-empty-state">Controles do Mestre.</div>';return '<div class="sheet-section"><div class="sheet-section-title">FERRAMENTAS</div><div class="sheet-actions"><button type="button" data-sheet-mode="entity">✦ ELEMENTO</button><button type="button" data-sheet-mode="horde">☢ HORDA</button><button type="button" data-sheet-mode="territory">🏴 TERRITÓRIO</button><button type="button" data-sheet-mode="travel">➜ VIAGEM</button></div></div><div class="sheet-section"><div class="sheet-section-title">INFECÇÃO</div><div class="sheet-party">'+state.infection.slice(0,12).map(z=>'<button class="sheet-card" type="button" data-sheet-zone="'+esc(z.id)+'"><strong>'+esc(z.zone_name||'Zona')+'</strong><small>'+Math.round(n(z.infection_percent))+'% · '+esc(z.outbreak_stage||'active')+'</small></button>').join('')+'</div></div>';}
  function bindMasterSheet(body){body.querySelectorAll('[data-sheet-mode]').forEach(b=>b.onclick=()=>{closeSheet();activateEditor(b.dataset.sheetMode);});body.querySelectorAll('[data-sheet-zone]').forEach(b=>b.onclick=()=>{const z=state.infection.find(x=>x.id===b.dataset.sheetZone);if(z){closeSheet();openInfectionEditor(z);}});}

  function openInfectionEditor(z){
    openModal('ZONA DE INFECÇÃO','<form id="infectionForm" class="map-form"><label>INFECÇÃO <output id="infVal">'+Math.round(n(z.infection_percent))+'%</output><input name="infection" type="range" min="0" max="100" value="'+n(z.infection_percent)+'"></label><label>DENSIDADE <output id="densVal">'+Math.round(n(z.zombie_density_percent))+'%</output><input name="density" type="range" min="0" max="100" value="'+n(z.zombie_density_percent)+'"></label><label>PROPAGAÇÃO<input name="spread" type="range" min="0" max="100" value="'+n(z.spread_rate)+'"></label><label>ESTÁGIO<select name="stage">'+['contained','active','severe','critical'].map(k=>'<option '+(z.outbreak_stage===k?'selected':'')+'>'+k+'</option>').join('')+'</select></label><footer><button type="button" id="cancelForm">CANCELAR</button><button type="submit">SALVAR ZONA</button></footer></form>');
    const f=$('infectionForm');$('cancelForm').onclick=closeModal;f.infection.oninput=()=>{$('infVal').textContent=f.infection.value+'%';};f.density.oninput=()=>{$('densVal').textContent=f.density.value+'%';};
    f.onsubmit=async e=>{e.preventDefault();const r=await aeriom.rpc('update_campaign_infection_zone',{p_id:z.id,p_infection:n(f.infection.value),p_zombie_density:n(f.density.value),p_spread_rate:n(f.spread.value),p_stage:f.stage.value});if(r.error){toast(r.error.message||'Falha ao salvar zona.','error');return;}await refreshInfection();renderThreats();closeModal();toast('Zona de infecção atualizada.');};
  }

  function centerTo(p,z){if(!p||!state.map)return;state.map.setView([p.lat,p.lng],Math.min(19,Math.max(2,n(z,5))),{animate:false});}
  function setCoordinates(p){$('mapCoordinates').textContent=n(p?.lat).toFixed(6)+'°, '+n(p?.lng).toFixed(6)+'°';}
  function updateReadout(){if(!state.map)return;const z=state.map.getZoom();$('mapZoomLabel').textContent='Z'+z;$('mapScaleLabel').textContent=z<7?'MUNDO':z<12?'REGIÃO':z<15?'CIDADE':'RUA';$('mapScaleHint').textContent=z>=16?'MODO RUA':'ARRASTE PARA EXPLORAR';}
  function scheduleViewport(){
    updateReadout();
    clearTimeout(state.viewportTimer);
    state.viewportTimer=setTimeout(()=>{
      if(state.map.getZoom()>=16){
        clearTimeout(state.poiTimer);
        state.poiTimer=setTimeout(()=>loadPoisAroundView(),320);
      }else{
        state.layer.pois.clearLayers();
      }
      if(!isMaster())renderVision();
    },120);
  }

  function renderStats(){renderPartyList();renderSelection();$('statLocations').textContent=String(state.locations.filter(x=>x.discovered!==false).length);$('statThreats').textContent=String(isMaster()?state.hordes.length:0);$('statTravels').textContent=String(state.travels.length);}
  function renderMasterTools(){if(isMaster()){$('masterCard').removeAttribute('aria-hidden');}else{$('masterCard').setAttribute('aria-hidden','true');}}

  function poiKey(){const c=state.map.getCenter();return c.lat.toFixed(2)+':'+c.lng.toFixed(2)+':'+Math.floor(state.map.getZoom());}
  async function loadPoisAroundView(){
    const k=poiKey(),old=state.poiCache.get(k);if(old&&Date.now()-old.ts<10*60*1000){drawPois(old.items);return;}
    const c=state.map.getCenter();
    const q='[out:json][timeout:6];(nwr(around:800,'+c.lat+','+c.lng+')[name][amenity];nwr(around:800,'+c.lat+','+c.lng+')[name][shop];nwr(around:800,'+c.lat+','+c.lng+')[name][tourism];nwr(around:800,'+c.lat+','+c.lng+')[name][craft];nwr(around:800,'+c.lat+','+c.lng+')[name][leisure];nwr(around:800,'+c.lat+','+c.lng+')[name][historic];);out center tags;';
    let data=null;
    for(const ep of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
      try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),6500),r=await fetch(ep,{method:'POST',body:q,headers:{'Content-Type':'text/plain;charset=UTF-8'},signal:ac.signal});clearTimeout(tm);if(r.ok){data=await r.json();break;}}catch{}
    }
    if(!data)return;
    const items=(data.elements||[]).map(e=>{const tags=e.tags||{},p=pt(e.lat??e.center?.lat,e.lon??e.center?.lon);return p?{key:'osm:'+e.type+':'+e.id,name:tags.name||tags.brand||'Local',type:tags.amenity||tags.shop||tags.tourism||tags.craft||tags.leisure||tags.historic||'POI',lat:p.lat,lng:p.lng,address:tags['addr:full']||'',tags}:null;}).filter(Boolean).slice(0,MAX_VISIBLE.pois);
    state.poiCache.set(k,{ts:Date.now(),items});drawPois(items);
  }

  function drawPois(items){
    state.layer.pois.clearLayers();
    const bounds=state.map.getBounds().pad(.03);
    (items||[]).filter(p=>bounds.contains([p.lat,p.lng])).slice(0,MAX_VISIBLE.pois).forEach(p=>{const c=L.circleMarker([p.lat,p.lng],{renderer:state.renderer,radius:4,color:'#090908',weight:1,fillColor:'#aca497',fillOpacity:.9}).addTo(state.layer.pois);c.on('click',e=>{L.DomEvent.stopPropagation(e);openPoi(p);});});
  }
  function openPoi(p){centerTo(p,16);openModal('PONTO REAL','<div class="map-location-sheet"><div class="selected-location-hero"><div class="selected-location-icon">'+esc(iconByCategory(p.type))+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.type)+' · OpenStreetMap</small></div></div><p class="map-location-address">'+esc(p.address||'Ponto descoberto no mundo real.')+'</p><div class="selection-actions"><button type="button" id="savePoi">SALVAR NA CAMPANHA</button></div></div>');$('savePoi').onclick=async()=>{const r=await aeriom.rpc('discover_campaign_world_location',{p_campaign_id:state.campaign.id,p_source:'osm',p_external_id:p.key,p_name:p.name,p_category:p.type,p_latitude:p.lat,p_longitude:p.lng,p_address:p.address||null,p_metadata:{tags:p.tags||{}}});if(r.error){toast(r.error.message||'Falha ao salvar o ponto.','error');return;}await refreshLocations();renderLocations();renderStats();closeModal();toast('Local salvo na campanha.');};}

  function locateDevice(){
    if(!navigator.geolocation){toast('GPS indisponível neste navegador.','error');return;}
    toast('Buscando GPS…','loading');
    navigator.geolocation.getCurrentPosition(async p=>{
      state.devicePosition={lat:p.coords.latitude,lng:p.coords.longitude};
      state.layer.device.clearLayers();
      L.circleMarker([state.devicePosition.lat,state.devicePosition.lng],{renderer:state.renderer,radius:8,color:'#0a0a09',weight:2,fillColor:'#7fe7a7',fillOpacity:1}).addTo(state.layer.device).bindTooltip('Sua posição física');
      centerTo(state.devicePosition,16);
      if(!isMaster()){
        const r=await aeriom.from('campaign_map_positions').upsert({campaign_id:state.campaign.id,user_id:state.session.user.id,latitude:state.devicePosition.lat,longitude:state.devicePosition.lng,updated_at:new Date().toISOString()},{onConflict:'campaign_id,user_id'});
        if(r.error){toast('GPS encontrado, mas não foi salvo na campanha.','error');return;}
        state.mapPosition=state.devicePosition;renderMembers();renderVision();renderPartyList();toast('Posição sincronizada.');
      }
    },err=>toast(err?.message||'Não foi possível obter o GPS.','error'),{enableHighAccuracy:true,timeout:9000,maximumAge:15000});
  }

  async function toggleCompass(){
    try{
      if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted'){toast('Permissão da bússola recusada.','error');return;}}
      if(!state.compass.bound){state.compass.bound=true;addEventListener('deviceorientationabsolute',onOrientation,true);addEventListener('deviceorientation',onOrientation,true);}
      state.compass.active=!state.compass.active;$('mapCompass').classList.toggle('is-active',state.compass.active);toast(state.compass.active?'Bússola ativa.':'Bússola pausada.');
    }catch{toast('Bússola indisponível.','error');}
  }
  function onOrientation(e){if(!state.compass.active)return;const h=Number.isFinite(e.webkitCompassHeading)?e.webkitCompassHeading:Number.isFinite(e.alpha)?360-e.alpha:null;if(h!=null){state.compass.heading=(h+360)%360;$('mapCompass').textContent=['N','NE','E','SE','S','SW','W','NW'][Math.round(state.compass.heading/45)%8];}}

  function subscribeRealtime(){
    const cid=state.campaign.id;
    const specs=[
      ['campaign_map_positions',()=>refreshMembers().then(renderVision)],
      ['campaign_world_locations',()=>refreshLocations().then(()=>{renderLocations();renderStats();})],
      ['campaign_map_entities',()=>refreshEntities().then(renderEntities)],
      ['campaign_factions',()=>refreshFactions().then(renderFactions)],
      ['campaign_npcs',()=>refreshNpcs().then(renderNpcs)],
      ['campaign_vehicles',()=>refreshVehicles().then(renderVehicles)],
      ['crafting_stations',()=>refreshStations().then(renderStations)],
      ['campaign_travels',()=>refreshTravels().then(renderStats)],
      ['campaign_hordes',()=>refreshHordes().then(()=>{renderThreats();renderStats();})]
    ];
    if(isMaster()) specs.push(['campaign_infection_zones',()=>refreshInfection().then(renderThreats)],['campaign_horde_events',()=>refreshHordes().then(()=>{renderThreats();renderStats();})]);
    specs.forEach(([table,handler])=>{
      const ch=aeriom.channel('afterlife-map20-'+table+'-'+cid);
      ch.on('postgres_changes',{event:'*',schema:'public',table,filter:'campaign_id=eq.'+cid},()=>{
        clearTimeout(ch.__timer);ch.__timer=setTimeout(()=>handler().catch(err=>report('map-realtime-handler',{table,message:err?.message||String(err)})),160);
      }).subscribe(s=>{if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s)){setStatus('Realtime do mapa indisponível.','error');report('map-realtime-state',{table,state:s});}});
      state.realtime.push(ch);
    });
  }

  boot();
})();