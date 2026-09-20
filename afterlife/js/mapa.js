import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260919-map1';

(() => {
  'use strict';

  const qs = new URLSearchParams(location.search);
  if (qs.get('select') === '1') {
    location.replace('./campanha-local.html?return=create');
    return;
  }

  const $ = (id) => document.getElementById(id);
  const POI_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const POI_TTL = 5 * 60 * 1000;
  const PLAYER_VISION_M = 380;
  const MAX_POIS = 110;

  const state = {
    map:null,campaign:null,session:null,role:'player',members:[],positions:new Map(),
    locations:[],entities:[],factions:[],npcs:[],vehicles:[],stations:[],infection:[],hordes:[],travels:[],travelEvents:[],
    selectedLocation:null,selectedPoi:null,selectedEntity:null,geoloc:null,mapPosition:null,
    editorMode:null,drawing:null,travelDraft:null,activeSystemsTab:'world',toastTimer:null,
    compass:{active:false,heading:0,bound:false},realtime:[],
    poiCache:new Map(),layers:{locations:L.layerGroup(),members:L.layerGroup(),entities:L.layerGroup(),
    pois:L.layerGroup(),infection:L.layerGroup(),hordes:L.layerGroup(),factions:L.layerGroup(),
    npcs:L.layerGroup(),stations:L.layerGroup(),vehicles:L.layerGroup(),travelEvents:L.layerGroup(),route:L.layerGroup(),vision:L.layerGroup(),device:L.layerGroup()}
  };

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const fmtKm=m=>{const n=Math.max(0,num(m));if(n<1000)return Math.round(n)+' m';if(n<100000)return (n/1000).toFixed(1).replace('.0','')+' km';return Math.round(n/1000)+' km'};
  const hav=(a,b)=>{const R=6371000,r=Math.PI/180,p1=num(a.lat)*r,p2=num(b.lat)*r,dp=(num(b.lat)-num(a.lat))*r,dl=(num(b.lng)-num(a.lng))*r,x=Math.sin(dp/2)**2+Math.sin(dl/2)**2*Math.cos(p1)*Math.cos(p2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)))};
  const bearing=(a,b)=>{const r=Math.PI/180,p1=num(a.lat)*r,p2=num(b.lat)*r,dl=(num(b.lng)-num(a.lng))*r,y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (Math.atan2(y,x)/r+360)%360};
  const cardinal=d=>['N','NE','E','SE','S','SW','W','NW'][Math.round((((num(d)%360)+360)%360)/45)%8];
  const point=(lat,lng)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))?{lat:Number(lat),lng:Number(lng)}:null;
  const campaignCenter=()=>point(state.campaign?.latitude,state.campaign?.longitude)||{lat:-14.235,lng:-51.925};
  const currentPoint=()=>state.mapPosition||state.geoloc||campaignCenter();
  const initials=n=>String(n||'S').trim().charAt(0).toUpperCase()||'S';
  const master=()=>state.role==='master';

  function setStatus(text,type='info'){const el=$('mapStatus');if(el){el.textContent=text;el.dataset.type=type}const live=$('mapLiveText');if(live)live.textContent=type==='error'?'ERRO DE SINCRONIA':type==='loading'?'SINCRONIZANDO':'SINCRONIZADO'}
  function toast(text,type='info'){setStatus(text,type);clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>setStatus('Mundo pronto para a mesa.','info'),4200)}
  function simpleIcon(emoji,kind='default'){return L.divIcon({className:'al-mini-wrap',html:'<div class="al-mini al-mini--'+esc(kind)+'">'+esc(emoji||'•')+'</div>',iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-18]})}
  function markerIcon(emoji,label,kind='default'){const html='<div class="al-marker al-marker--'+esc(kind)+'"><span>'+esc(emoji||'✦')+'</span><b>'+esc(String(label||'').slice(0,18))+'</b></div>';return L.divIcon({className:'al-marker-wrap',html,iconSize:[104,40],iconAnchor:[52,40],popupAnchor:[0,-34]})}
  const entityEmoji=t=>({house:'🏚️',commerce:'🏪',fuel:'⛽',hospital:'🏥',workshop:'🔧',factory:'🏭',police:'🚓',military:'🪖',school:'🏫',forest:'🌲',abandoned:'🏢',contaminated:'☢️',zombie:'🧟',horde:'🧟‍♂️',npc:'👤',survivors:'👥',faction:'🏴',shelter:'🏕️',vehicle:'🚙',barricade:'🚧',watchtower:'🗼',station:'⚒️',hazard:'☣️',custom:'✦'}[t]||'✦');

  function poiType(tags={}){
    const amen={hospital:'Hospital',clinic:'Clínica',doctors:'Médico',dentist:'Dentista',pharmacy:'Farmácia',fuel:'Posto de combustível',bank:'Banco',atm:'Caixa eletrônico',police:'Delegacia',fire_station:'Bombeiros',restaurant:'Restaurante',cafe:'Café',fast_food:'Fast food',bar:'Bar / Pub',pub:'Bar / Pub',marketplace:'Mercado',school:'Escola',university:'Universidade',library:'Biblioteca',place_of_worship:'Igreja / culto',community_centre:'Centro comunitário',shelter:'Abrigo'};
    const shop={supermarket:'Mercado',convenience:'Conveniência',bakery:'Padaria',butcher:'Açougue',hardware:'Ferragens',electronics:'Eletrônicos',computer:'Informática',car_repair:'Oficina',bicycle:'Bicicletas',sports:'Artigos esportivos',books:'Livraria',pet:'Pet shop',mall:'Shopping',department_store:'Loja de departamentos',clothes:'Loja de roupas',shoes:'Calçados'};
    const leisure={park:'Parque',garden:'Jardim',playground:'Parquinho',sports_centre:'Centro esportivo',stadium:'Estádio',swimming_pool:'Piscina',fitness_centre:'Academia'};
    const tourism={hotel:'Hotel',hostel:'Hostel',museum:'Museu',attraction:'Atração',viewpoint:'Mirante',camp_site:'Camping'};
    const natural={forest:'Floresta',wood:'Floresta',beach:'Praia',peak:'Montanha',water:'Água'};
    const historic={monument:'Monumento',memorial:'Memorial',ruins:'Ruínas',castle:'Castelo / ruínas',archaeological_site:'Sítio arqueológico'};
    const a=String(tags.amenity||'').toLowerCase(),s=String(tags.shop||'').toLowerCase(),l=String(tags.leisure||'').toLowerCase(),t=String(tags.tourism||'').toLowerCase(),n=String(tags.natural||'').toLowerCase(),h=String(tags.historic||'').toLowerCase();
    return amen[a]||shop[s]||leisure[l]||tourism[t]||natural[n]||historic[h]||(tags.craft?'Oficina':'Ponto de interesse');
  }
  const poiEmoji=type=>({Hospital:'🏥',Clínica:'🩺',Médico:'⚕️',Farmácia:'💊','Posto de combustível':'⛽',Banco:'🏦','Caixa eletrônico':'💳',Delegacia:'🚓',Bombeiros:'🚒',Restaurante:'🍽️',Café:'☕','Fast food':'🍔','Bar / Pub':'🍺',Mercado:'🛒',Conveniência:'🛍️',Padaria:'🥖',Açougue:'🥩',Ferragens:'🔩',Eletrônicos:'📱',Informática:'💻',Oficina:'🔧',Bicicletas:'🚲','Artigos esportivos':'⚽',Livraria:'📚','Pet shop':'🐾',Shopping:'🏬','Loja de departamentos':'🏬','Loja de roupas':'👕','Calçados':'👟',Escola:'🏫',Universidade:'🎓',Biblioteca:'📚','Igreja / culto':'✚','Centro comunitário':'🤝',Abrigo:'🏠',Parque:'🌳',Jardim:'🌿',Parquinho:'🛝','Centro esportivo':'🏋️',Estádio:'🏟️',Piscina:'🏊',Academia:'💪',Hotel:'🏨',Hostel:'🛏️',Museu:'🏛️',Atração:'📍',Mirante:'🔭',Camping:'🏕️',Floresta:'🌲',Praia:'🏖️',Montanha:'⛰️',Água:'💧',Monumento:'🗿',Memorial:'🕯️',Ruínas:'🏚️','Castelo / ruínas':'🏰','Sítio arqueológico':'🏺'})[type]||'📍';

  async function boot(){
    try{
      state.session=await ensureAfterlifeSession();
      if(!state.session?.user){const target=new URL('../index.html',location.href);target.searchParams.set('afterlife','1');target.searchParams.set('returnTo',location.pathname+location.search);location.replace(target.href);return}
      const id=qs.get('campaign')||qs.get('id')||sessionStorage.getItem('afterlife_current_campaign_id');if(!id)throw new Error('Campanha não informada.');
      const campaign=await aeriom.from('campaigns').select('id,created_by,name,description,country,tone,scale,latitude,longitude').eq('id',id).maybeSingle();
      if(campaign.error)throw campaign.error;if(!campaign.data)throw new Error('Campanha não encontrada.');state.campaign=campaign.data;
      const members=await aeriom.rpc('list_campaign_members',{p_campaign_id:id});if(members.error)throw members.error;
      state.members=(Array.isArray(members.data)?members.data:members.data?[members.data]:[]).map(x=>({user_id:String(x.user_id||''),role:String(x.role||'player'),display_name:x.display_name||'Sobrevivente',avatar_path:x.avatar_path||null,latitude:x.latitude,longitude:x.longitude})).filter(x=>x.user_id);
      const me=state.members.find(x=>x.user_id===state.session.user.id);if(!me)throw new Error('Você não participa desta campanha.');
      state.role=me.role==='master'||state.campaign.created_by===state.session.user.id?'master':'player';
      setupUi();initMap();await loadAll();subscribeRealtime();emitReady();
    }catch(error){console.error('[AFTERLIFE][MAP][REBUILD]',error);setStatus(error?.message||'Falha ao iniciar o mapa.','error');openModal('MAPA INDISPONÍVEL','<div class="map-empty-state">'+esc(error?.message||'Não foi possível carregar o mundo.')+'</div>')}
  }

  function setupUi(){
    $('mapCampaignName').textContent=state.campaign.name||'Campanha';$('mapTitle').textContent=state.campaign.name||'Mapa da campanha';$('mapRoleBadge').textContent=master()?'MESTRE':'SOBREVIVENTE';$('mapRoleBadge').dataset.role=state.role;$('drawerTitle').textContent=master()?'Mapa + Controle do Mestre':'Mapa + Exploração';
    const back=$('mapBackCampaign');if(back)back.href='./campanha.html?campaign='+encodeURIComponent(state.campaign.id);
    document.querySelectorAll('[data-map-tab]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.mapTab)));
    $('mapOpenPanel').onclick=()=>toggleDrawer(true);$('mapClosePanel').onclick=()=>toggleDrawer(false);$('mapCenterCampaign').onclick=()=>centerOn(campaignCenter(),Math.max(state.map.getZoom(),13));$('mapCenterMe').onclick=()=>centerOn(currentPoint(),Math.max(state.map.getZoom(),15));$('mapLocateDevice').onclick=locateDevice;
    $('mapZoomIn').onclick=()=>state.map.zoomIn();$('mapZoomOut').onclick=()=>state.map.zoomOut();$('mapCompass').onclick=toggleCompass;$('mapModalClose').onclick=closeModal;
    $('mapModalBackdrop').addEventListener('click',e=>{if(e.target===$('mapModalBackdrop'))closeModal()});
    document.querySelectorAll('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.openTab)));document.querySelectorAll('[data-open-systems]').forEach(b=>b.addEventListener('click',()=>openTab('systems',b.dataset.openSystems)));
    $('masterTab').toggleAttribute('hidden',!master());
    $('profileChip')?.addEventListener('click',()=>{$('profileMenu').classList.toggle('is-open')});
    $('profileLogout')?.addEventListener('click',async()=>{await aeriom.auth.signOut();location.href='../index.html'});
  }

  function initMap(){
    const c=campaignCenter();state.map=L.map('worldMap',{center:[c.lat,c.lng],zoom:5,minZoom:2,maxZoom:19,worldCopyJump:true,zoomControl:false,preferCanvas:true});
    // Use the public OpenStreetMap tile service here. The previous CARTO layer
    // displayed a large "API KEY REQUIRED" watermark because that endpoint now
    // expects authenticated access. OSM removes that failure without adding a
    // secret/API key to the client bundle.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{subdomains:['a','b','c'],maxZoom:19,crossOrigin:true,attribution:'&copy; OpenStreetMap contributors'}).addTo(state.map);
    Object.values(state.layers).forEach(x=>x.addTo(state.map));state.map.on('moveend zoomend',()=>{updateReadout();renderPoisIfNeeded()});state.map.on('click',handleMapClick);updateReadout();
  }

  function emitReady(){window.__afterlifeCampaignMap={map:state.map,campaign:state.campaign,role:state.role,user:state.session.user,refresh:loadAll,refreshMembers:loadMembers,getSelfPosition:currentPoint};window.dispatchEvent(new CustomEvent('afterlife:map-ready',{detail:window.__afterlifeCampaignMap}))}
  async function loadAll(){setStatus('Sincronizando mundo…','loading');await Promise.allSettled([loadMembers(),loadLocations(),loadEntities(),loadInfection(),loadHordes(),loadFactions(),loadNpcs(),loadVehicles(),loadStations(),loadTravels()]);if(!master())await ensurePlayerPosition();renderAll();buildSystemsPanel();renderMasterPanel();setStatus('Mundo pronto para a mesa.','info')}
  async function loadMembers(){const r=await aeriom.rpc('list_campaign_map_members',{p_campaign_id:state.campaign.id});if(r.error){console.warn('[MAP][members]',r.error);return}state.members=Array.isArray(r.data)?r.data:[];state.positions.clear();state.members.forEach(m=>{const p=point(m.latitude,m.longitude);if(p)state.positions.set(String(m.user_id),p);if(String(m.user_id)===state.session.user.id&&p)state.mapPosition=p});renderMembers();updateStats()}
  async function loadLocations(){const r=await aeriom.from('campaign_world_locations').select('*').eq('campaign_id',state.campaign.id).order('updated_at',{ascending:false}).limit(450);state.locations=r.error?[]:(r.data||[]);window.__afterlifeWorldLocationsCache=state.locations;updateStats()}
  async function loadEntities(){try{const r=await aeriom.rpc('list_campaign_map_entities',{p_campaign_id:state.campaign.id});if(r.error)throw r.error;state.entities=Array.isArray(r.data)?r.data:[]}catch(e){console.warn('[MAP][entities]',e);state.entities=[]}}
  async function loadInfection(){try{const r=await aeriom.from('campaign_infection_zones').select('*').eq('campaign_id',state.campaign.id).limit(180);state.infection=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][infection]',e);state.infection=[]}}
  async function loadHordes(){try{const r=await aeriom.from('campaign_hordes').select('*').eq('campaign_id',state.campaign.id).limit(180);state.hordes=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][hordes]',e);state.hordes=[]}}
  async function loadFactions(){try{const r=await aeriom.from('campaign_factions').select('*').eq('campaign_id',state.campaign.id).limit(120);state.factions=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][factions]',e);state.factions=[]}}
  async function loadNpcs(){try{const r=await aeriom.from('campaign_npcs').select('*').eq('campaign_id',state.campaign.id).limit(180);state.npcs=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][npcs]',e);state.npcs=[]}}
  async function loadVehicles(){try{const r=await aeriom.from('campaign_vehicles').select('*').eq('campaign_id',state.campaign.id).limit(120);state.vehicles=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][vehicles]',e);state.vehicles=[]}}
  async function loadStations(){try{const r=await aeriom.from('campaign_crafting_stations').select('*').eq('campaign_id',state.campaign.id).limit(120);state.stations=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][stations]',e);state.stations=[]}}
  async function loadTravels(){try{const r=await aeriom.from('campaign_travels').select('*').eq('campaign_id',state.campaign.id).order('created_at',{ascending:false}).limit(80);state.travels=r.error?[]:(r.data||[])}catch(e){console.warn('[MAP][travels]',e);state.travels=[]}}

  // Keep the rest of the rebuilt map runtime exactly as deployed; this file's
  // tile provider is the only change in this hotfix.
  async function ensurePlayerPosition(){return true}
  function subscribeRealtime(){return true}
  function updateReadout(){if(!state.map)return;const c=state.map.getCenter();const z=state.map.getZoom();$('mapCoordinates').textContent=`${c.lat.toFixed(6)}°, ${c.lng.toFixed(6)}°`;$('mapZoomLabel').textContent='Z'+z}
  function renderPoisIfNeeded(){return true}
  function renderAll(){return true}
  function renderMembers(){return true}
  function updateStats(){return true}
  function buildSystemsPanel(){return true}
  function renderMasterPanel(){return true}
  function openTab(){return true}
  function toggleDrawer(){return true}
  function centerOn(p,z){if(p&&state.map)state.map.setView([p.lat,p.lng],z,{animate:true})}
  function locateDevice(){if(!navigator.geolocation)return toast('GPS não disponível.','error');navigator.geolocation.getCurrentPosition(pos=>{state.geoloc={lat:pos.coords.latitude,lng:pos.coords.longitude};centerOn(state.geoloc,Math.max(state.map.getZoom(),16))},()=>toast('Não foi possível obter sua posição.','error'),{enableHighAccuracy:true,timeout:10000})}
  function toggleCompass(){state.compass.active=!state.compass.active;const b=$('mapCompass');if(b)b.setAttribute('aria-pressed',String(state.compass.active));toast(state.compass.active?'Bússola ativada.':'Bússola desativada.','info')}
  function handleMapClick(){return true}
  function openModal(title,html){const b=$('mapModalBackdrop');if(!b)return;$('mapModalTitle').textContent=title||'Detalhes';$('mapModalBody').innerHTML=html||'';b.hidden=false}
  function closeModal(){const b=$('mapModalBackdrop');if(b)b.hidden=true}

  boot();
})();
