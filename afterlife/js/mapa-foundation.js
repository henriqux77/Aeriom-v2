import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

const $ = (id) => document.getElementById(id);
const POI_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const PLAYER_VISIBILITY_METERS = 380;
const POI_CACHE_TTL = 5 * 60 * 1000;
const POI_QUERY = `[out:json][timeout:10];(nwr(around:1200,{LAT},{LNG})[shop];nwr(around:1200,{LAT},{LNG})[amenity~"bar|biergarten|cafe|restaurant|fast_food|food_court|pub|pharmacy|hospital|clinic|doctors|dentist|veterinary|fuel|charging_station|bank|atm|post_office|post_box|police|fire_station|school|kindergarten|college|university|library|place_of_worship|community_centre|social_centre|shelter|bus_station|ferry_terminal|parking|bicycle_parking|car_rental|taxi|theatre|cinema|arts_centre|nightclub|marketplace|public_bath|toilets|drinking_water|recycling|waste_basket|vending_machine"];nwr(around:1200,{LAT},{LNG})[leisure~"park|garden|playground|sports_centre|stadium|pitch|swimming_pool|fitness_centre|nature_reserve|dog_park|golf_course"];nwr(around:1200,{LAT},{LNG})[tourism~"hotel|hostel|museum|attraction|viewpoint|camp_site|picnic_site|zoo|theme_park"];nwr(around:1200,{LAT},{LNG})[highway="bus_stop"];nwr(around:1200,{LAT},{LNG})[public_transport~"platform|stop_position|station|stop_area"];nwr(around:1200,{LAT},{LNG})[railway~"station|halt|tram_stop|subway_entrance|subway"];nwr(around:1200,{LAT},{LNG})[natural~"wood|forest|beach|water|peak"];nwr(around:1200,{LAT},{LNG})[landuse~"forest|cemetery|industrial|farmland"];nwr(around:1200,{LAT},{LNG})[historic~"monument|memorial|castle|ruins|archaeological_site"];nwr(around:1200,{LAT},{LNG})[craft];);out center tags qt;`;

let map = null;
let campaign = null;
let role = 'player';
let myUserId = null;
let memberData = [];
let memberMarkers = new Map();
let poiMarkers = [];
let poiTimer = null;
let lastPoiKey = '';
let poiCache = new Map();
let membersChannel = null;
let refreshTimer = null;
let refreshInFlight = null;
let refreshRequested = false;
let pageAlive = true;

function esc(v){return String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
function initials(v){return String(v||'S').trim().charAt(0).toUpperCase()||'S';}
function getCampaignId(){const qs=new URLSearchParams(location.search);return qs.get('campaign')||qs.get('id')||sessionStorage.getItem('afterlife_current_campaign_id')||'';}
function scaleLabel(z){return z<7?'Mundo':z<12?'Região':z<15?'Cidade':'Rua';}
function poiName(tags){return tags?.name||tags?.brand||tags?.operator||tags?.ref||'Local sem nome';}
function poiType(tags){
  const amenity=String(tags?.amenity||'').toLowerCase();
  const shop=String(tags?.shop||'').toLowerCase();
  const leisure=String(tags?.leisure||'').toLowerCase();
  const tourism=String(tags?.tourism||'').toLowerCase();
  const railway=String(tags?.railway||'').toLowerCase();
  const natural=String(tags?.natural||'').toLowerCase();
  const landuse=String(tags?.landuse||'').toLowerCase();
  const historic=String(tags?.historic||'').toLowerCase();
  if(tags?.highway==='bus_stop'||amenity==='bus_station'||tags?.public_transport==='platform'||tags?.public_transport==='stop_position'||tags?.public_transport==='stop_area')return amenity==='bus_station'?'Rodoviária':'Ponto de ônibus';
  const amenityMap={hospital:'Hospital',clinic:'Clínica',doctors:'Médico',dentist:'Dentista',pharmacy:'Farmácia',veterinary:'Veterinária',fuel:'Posto de combustível',charging_station:'Recarga elétrica',police:'Delegacia',fire_station:'Corpo de bombeiros',school:'Escola',kindergarten:'Creche',college:'Faculdade',university:'Universidade',library:'Biblioteca',bank:'Banco',atm:'Caixa eletrônico',post_office:'Correios',post_box:'Caixa postal',place_of_worship:'Igreja / culto',community_centre:'Centro comunitário',social_centre:'Centro social',shelter:'Abrigo',parking:'Estacionamento',bicycle_parking:'Bicicletário',car_rental:'Aluguel de carros',taxi:'Táxi',ferry_terminal:'Ferry',theatre:'Teatro',cinema:'Cinema',arts_centre:'Centro de artes',nightclub:'Casa noturna',marketplace:'Mercado',public_bath:'Banho público',toilets:'Banheiro',drinking_water:'Água potável',recycling:'Reciclagem',waste_basket:'Lixeira',vending_machine:'Vending machine',restaurant:'Restaurante',cafe:'Café',fast_food:'Fast food',bar:'Bar / Pub',pub:'Bar / Pub',biergarten:'Bar / Pub',food_court:'Alimentação'};
  if(amenityMap[amenity])return amenityMap[amenity];
  const shopMap={supermarket:'Mercado',convenience:'Loja de conveniência',bakery:'Padaria',butcher:'Açougue',clothes:'Loja de roupas',shoes:'Calçados',hardware:'Ferragens',doityourself:'Ferragens',electronics:'Eletrônicos',furniture:'Móveis',computer:'Informática',mobile_phone:'Celulares',car:'Loja de carros',car_repair:'Oficina de veículos',bicycle:'Bicicletas',sports:'Artigos esportivos',books:'Livraria',chemist:'Produtos químicos',beverages:'Bebidas',florist:'Floricultura',garden_centre:'Jardinagem',pet:'Pet shop',beauty:'Beleza',hairdresser:'Cabeleireiro',laundry:'Lavanderia',stationery:'Papelaria',jewelry:'Joalheria',travel_agency:'Agência de viagens',confectionery:'Confeitaria',seafood:'Peixaria',greengrocer:'Hortifruti',department_store:'Loja de departamentos',mall:'Shopping',variety_store:'Loja'};
  if(shopMap[shop])return shopMap[shop];
  const leisureMap={park:'Parque',garden:'Jardim',playground:'Parquinho',sports_centre:'Centro esportivo',stadium:'Estádio',pitch:'Quadra / campo',swimming_pool:'Piscina',fitness_centre:'Academia',nature_reserve:'Reserva natural',dog_park:'Parque canino',golf_course:'Campo de golfe'};
  if(leisureMap[leisure])return leisureMap[leisure];
  const tourismMap={hotel:'Hotel',hostel:'Hostel',museum:'Museu',attraction:'Atração',viewpoint:'Mirante',camp_site:'Camping',picnic_site:'Área de piquenique',zoo:'Zoológico',theme_park:'Parque temático'};
  if(tourismMap[tourism])return tourismMap[tourism];
  const railMap={station:'Estação ferroviária',halt:'Estação ferroviária',tram_stop:'Tram',subway_entrance:'Metrô',subway:'Metrô'};
  if(railMap[railway])return railMap[railway];
  const naturalMap={wood:'Floresta',forest:'Floresta',beach:'Praia',water:'Água',peak:'Montanha'};
  if(naturalMap[natural])return naturalMap[natural];
  const landMap={forest:'Floresta',cemetery:'Cemitério',industrial:'Área industrial',farmland:'Fazenda'};
  if(landMap[landuse])return landMap[landuse];
  const historyMap={monument:'Monumento',memorial:'Memorial',castle:'Castelo / ruínas',ruins:'Castelo / ruínas',archaeological_site:'Sítio arqueológico'};
  if(historyMap[historic])return historyMap[historic];
  return tags?.craft?'Oficina':'Ponto de interesse';
}
function poiIcon(tags){
  const type=poiType(tags);
  const icons={'Igreja / culto':'✚','Floresta':'🌲','Parque':'🌳','Praça':'⛲','Parquinho':'🛝','Jardim':'🌿','Reserva natural':'🌲','Praia':'🏖️','Água':'💧','Montanha':'⛰️','Ponto de ônibus':'🚌','Rodoviária':'🚌','Estação ferroviária':'🚆','Metrô':'🚇','Tram':'🚋','Aeroporto':'✈️','Ferry':'⛴️','Estacionamento':'🅿️','Bicicletário':'🚲','Táxi':'🚕','Aluguel de carros':'🚗','Posto de combustível':'⛽','Recarga elétrica':'🔌','Hospital':'🏥','Clínica':'🩺','Médico':'⚕️','Dentista':'🦷','Farmácia':'💊','Veterinária':'🐾','Delegacia':'🚓','Corpo de bombeiros':'🚒','Escola':'🏫','Creche':'🧸','Faculdade':'🎓','Universidade':'🎓','Biblioteca':'📚','Banco':'🏦','Caixa eletrônico':'💳','Correios':'📮','Caixa postal':'📮','Prédio público':'🏢','Prefeitura':'🏛️','Tribunal':'⚖️','Abrigo':'🏠','Centro comunitário':'🤝','Centro social':'🤝','Restaurante':'🍽️','Fast food':'🍔','Café':'☕','Bar / Pub':'🍺','Casa noturna':'🎵','Mercado':'🛒','Loja de conveniência':'🛍️','Padaria':'🥖','Açougue':'🥩','Loja de roupas':'👕','Calçados':'👟','Ferragens':'🔩','Eletrônicos':'📱','Móveis':'🛋️','Informática':'💻','Celulares':'📱','Oficina de veículos':'🔧','Bicicletas':'🚲','Oficina':'🛠️','Centro esportivo':'🏋️','Estádio':'🏟️','Quadra / campo':'⚽','Piscina':'🏊','Academia':'💪','Museu':'🏛️','Cinema':'🎬','Teatro':'🎭','Centro de artes':'🎨','Atração':'📍','Mirante':'🔭','Camping':'🏕️','Área de piquenique':'🧺','Zoológico':'🦁','Parque temático':'🎢','Cemitério':'🪦','Monumento':'🗿','Memorial':'🕯️','Castelo / ruínas':'🏰','Sítio arqueológico':'🏺','Área industrial':'🏭','Fazenda':'🚜','Reciclagem':'♻️','Lixeira':'🗑️','Banheiro':'🚻','Água potável':'🚰','Vending machine':'🥤'};
  if(icons[type])return icons[type];
  const name=String(tags?.name||'').toLowerCase();
  if(/igreja|capela|catedral|templo/.test(name))return '✚';
  if(/floresta|mata|bosque/.test(name))return '🌲';
  if(/parque|praça|praca/.test(name))return '🌳';
  if(/ônibus|onibus|bus/.test(name))return '🚌';
  return '📍';
}
function clearPois(){poiMarkers.forEach(m=>m.remove());poiMarkers=[];}
function clearMembers(){memberMarkers.forEach(m=>m.remove());memberMarkers.clear();}
function getSelfPosition(){const member=memberData.find(m=>m.user_id===myUserId);if(!member)return null;const lat=Number(member.latitude),lng=Number(member.longitude);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;}
function emit(name,detail){window.dispatchEvent(new CustomEvent(name,{detail}));}
function makeMemberIcon(member,isMe){const color=member.role==='master'?'#d6b66c':isMe?'#39f58a':'#70a8ff';const html=`<div class="afterlife-map-member ${member.role==='master'?'is-master':''} ${isMe?'is-me':''}" style="--marker-accent:${color}"><div class="afterlife-map-member__avatar">${esc(initials(member.display_name))}</div><span></span></div>`;return L.divIcon({className:'afterlife-map-member-wrap',html,iconSize:[42,50],iconAnchor:[21,50],popupAnchor:[0,-44]});}
function renderMembers(members){clearMembers();memberData=Array.isArray(members)?members:[];const visible=role==='master'?memberData:memberData.filter(m=>m.user_id===myUserId);visible.forEach(member=>{const lat=Number(member.latitude),lng=Number(member.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const isMe=member.user_id===myUserId;const marker=L.marker([lat,lng],{icon:makeMemberIcon(member,isMe),draggable:role==='master'}).addTo(map);marker.bindPopup(`<strong>${esc(member.display_name)}</strong><br><span>${member.role==='master'?'Mestre':isMe?'Você':'Jogador'}</span>`);if(role==='master')marker.on('dragend',async(e)=>{const p=e.target.getLatLng();try{const {error}=await aeriom.rpc('move_campaign_member_position',{p_campaign_id:campaign.id,p_user_id:member.user_id,p_latitude:Number(p.lat.toFixed(6)),p_longitude:Number(p.lng.toFixed(6))});if(error)throw error;member.latitude=p.lat;member.longitude=p.lng;updateStatus(`Posição de ${member.display_name} atualizada.`);emit('afterlife:map-members-updated',{members:memberData});}catch(err){console.error('[AFTERLIFE][MAP][MOVE]',err);marker.setLatLng([lat,lng]);updateStatus('Não foi possível mover esse membro.','error');}});memberMarkers.set(member.user_id,marker);});emit('afterlife:map-members-updated',{members:memberData});}
function updateMemberList(members){const list=$('mapMemberList');if(!list)return;list.replaceChildren();(members||[]).forEach(m=>{const row=document.createElement('button');row.type='button';row.className='map-member-row';row.innerHTML=`<span class="map-member-row__avatar">${esc(initials(m.display_name))}</span><span class="map-member-row__copy"><strong>${esc(m.display_name)}</strong><small>${m.role==='master'?'Mestre':m.user_id===myUserId?'Você':'Jogador'}</small></span><span class="map-member-row__go">${role==='master'?'→':''}</span>`;row.addEventListener('click',()=>{if(role==='master'||m.user_id===myUserId){if(Number.isFinite(Number(m.latitude))&&Number.isFinite(Number(m.longitude)))map.setView([m.latitude,m.longitude],Math.max(map.getZoom(),16),{animate:true});}});list.appendChild(row);});}
async function loadMembers(){
  if(!campaign || !pageAlive)return [];
  const seeded=await aeriom.rpc('ensure_campaign_map_positions',{p_campaign_id:campaign.id});
  if(seeded.error)console.warn('[AFTERLIFE][MAP][SEED]',seeded.error);
  const {data,error}=await aeriom.rpc('list_campaign_map_members',{p_campaign_id:campaign.id});
  if(error)throw error;
  renderMembers(data||[]);
  updateMemberList(data||[]);
  const count=$('mapMemberCount');if(count)count.textContent=String(data?.length||0);
  return data||[];
}
function requestMembersRefresh(reason='realtime'){
  if(!pageAlive || !campaign)return;
  refreshRequested=true;
  if(refreshTimer)clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{refreshTimer=null;runMembersRefresh(reason);},180);
}
async function runMembersRefresh(reason='refresh'){
  if(!pageAlive || !campaign || !refreshRequested)return;
  refreshRequested=false;
  if(refreshInFlight){refreshRequested=true;return;}
  refreshInFlight=loadMembers().catch(error=>{console.error('[AFTERLIFE][MAP][REFRESH]',reason,error);updateStatus('Não foi possível sincronizar as posições do mapa.','error');}).finally(()=>{refreshInFlight=null;if(refreshRequested)runMembersRefresh('queued');});
  await refreshInFlight;
}
function teardownRealtime(){if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}if(membersChannel){try{aeriom.removeChannel(membersChannel);}catch(error){console.warn('[AFTERLIFE][MAP][REALTIME][CLEANUP]',error);}membersChannel=null;}}
function setupRealtime(){teardownRealtime();if(!campaign)return;const channelName=`afterlife-map-positions:${campaign.id}`;membersChannel=aeriom.channel(channelName).on('postgres_changes',{event:'*',schema:'public',table:'campaign_map_positions',filter:`campaign_id=eq.${campaign.id}`},(payload)=>{if(!pageAlive)return;requestMembersRefresh('position-change');}).subscribe((status,error)=>{if(error)console.warn('[AFTERLIFE][MAP][REALTIME][SUBSCRIBE]',error);if(status==='SUBSCRIBED')updateStatus('Mapa sincronizado em tempo real.');if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')updateStatus('Sincronização em tempo real indisponível; usando atualização manual.','error');});}
async function loadCampaign(){const id=getCampaignId();if(!id){location.replace('./campanhas.html');return false;}const session=await ensureAfterlifeSession();if(!session?.user){updateStatus('Sessão Afterlife não encontrada.','error');return false;}myUserId=session.user.id;const {data,error}=await aeriom.from('campaigns').select('id,name,country,latitude,longitude').eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('Campanha não encontrada.');campaign=data;sessionStorage.setItem('afterlife_current_campaign_id',String(id));const member=await aeriom.from('campaign_members').select('role').eq('campaign_id',id).eq('user_id',myUserId).maybeSingle();if(member.error)throw member.error;if(!member.data)throw new Error('Você não participa desta campanha.');role=member.data.role==='master'?'master':'player';return true;}
function setupHeader(){if(!campaign)return;document.title=`AFTERLIFE — ${campaign.name} · Mapa`;const title=$('mapTitle'),sub=$('mapSubtitle'),badge=$('mapRoleBadge'),mode=$('mapModeLabel');if(title)title.textContent=campaign.name;if(sub)sub.textContent=`Mapa da campanha · ponto inicial: ${campaign.country||'local definido'}`;if(badge){badge.textContent=role==='master'?'MESTRE · VISÃO GLOBAL':'JOGADOR · EXPLORAÇÃO';badge.dataset.role=role;}if(mode)mode.textContent=role==='master'?'GESTÃO':'EXPLORAÇÃO';}
function initMap(){map=L.map('worldMap',{center:[Number(campaign.latitude)||0,Number(campaign.longitude)||0],zoom:14,minZoom:2,maxZoom:19,worldCopyJump:true,zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);map.on('zoomend',()=>{const z=map.getZoom();$('mapScale')&&($('mapScale').textContent=scaleLabel(z));if(z>=13)schedulePois(map.getCenter());else clearPois();});map.on('moveend',()=>{if(map.getZoom()>=13)schedulePois(map.getCenter());});if(map.getZoom()>=13)schedulePois(map.getCenter());$('mapCenterCampaign')?.addEventListener('click',()=>map.setView([Number(campaign.latitude)||0,Number(campaign.longitude)||0],14,{animate:true}));}
function updateStatus(text,type='info'){const el=$('mapStatus');if(el){el.textContent=text||'';el.dataset.type=type;}}
async function reverse(lat,lng){try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,{headers:{'Accept':'application/json','Accept-Language':'pt-BR'}});if(!r.ok)throw new Error('reverse');const d=await r.json();return d.display_name||'';}catch{return '';}}
async function showMapPoint(latlng){const lat=Number(latlng.lat),lng=Number(latlng.lng);const address=await reverse(lat,lng);const panel=$('selectedLocation');if(panel){panel.hidden=false;panel.innerHTML=`<div class="map-selected-card"><strong>${esc((address||'Ponto no mapa').split(',').slice(0,3).join(', '))}</strong><small>${lat.toFixed(5)}°, ${lng.toFixed(5)}°</small><span>${role==='master'?'Ponto de gestão do Mestre':'Você está explorando esta região.'}</span></div>`;}}
function schedulePois(center){clearTimeout(poiTimer);poiTimer=setTimeout(()=>loadPois(center,map.getZoom()),260);}
function cleanupPoiCache(){const now=Date.now();for(const [key,value] of poiCache){if(now-value.at>POI_CACHE_TTL)poiCache.delete(key);}}
function renderPoiSet(unique){clearPois();unique.forEach(p=>{const m=L.circleMarker([p.lat,p.lng],{radius:4,weight:1,color:'#53e89a',fillOpacity:.9,afterlifePoi:p});m.bindPopup(`<strong>\u200B ${esc(p.name)}</strong><br><span>${esc(p.type)}</span>`);m.addTo(map);poiMarkers.push(m);});const list=$('poiList');if(list){list.replaceChildren();unique.slice(0,18).forEach(p=>{const b=document.createElement('button');b.type='button';b.className='map-poi-row';b.innerHTML=`<span class="map-poi-row__icon">${esc(p.icon||'📍')}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.type)}</small></span>`;b.addEventListener('click',()=>map.setView([p.lat,p.lng],Math.max(map.getZoom(),16),{animate:true}));list.appendChild(b);});}}
async function loadPois(center,zoom){if(zoom<13)return;cleanupPoiCache();const key=`${center.lat.toFixed(3)},${center.lng.toFixed(3)},${Math.round(zoom)},${role}`;if(key===lastPoiKey)return;lastPoiKey=key;const cached=poiCache.get(key);if(cached){renderPoiSet(cached.data);const status=$('poiStatus');if(status)status.textContent=role==='master'?`${cached.data.length} locais próximos`:`${cached.data.length} locais dentro da sua visão`;return;}const status=$('poiStatus');status&&(status.textContent='Carregando locais…');const q=POI_QUERY.replaceAll('{LAT}',center.lat.toFixed(6)).replaceAll('{LNG}',center.lng.toFixed(6));for(const endpoint of POI_ENDPOINTS){try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:q});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();const self=getSelfPosition();const unique=(d.elements||[]).map(it=>{const lat=Number(it.lat??it.center?.lat),lng=Number(it.lon??it.center?.lon),tags=it.tags||{};const type=poiType(tags);return {id:`${it.type}:${it.id}`,lat,lng,name:poiName(tags),type,icon:poiIcon(tags),tags};}).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)).filter(x=>role==='master'||!self||L.latLng(x.lat,x.lng).distanceTo([self.lat,self.lng])<=PLAYER_VISIBILITY_METERS).filter((x,i,a)=>i===a.findIndex(y=>y.name===x.name&&Math.abs(y.lat-x.lat)<.00008&&Math.abs(y.lng-x.lng)<.00008)).slice(0,120);poiCache.set(key,{at:Date.now(),data:unique});renderPoiSet(unique);if(status)status.textContent=role==='master'?`${unique.length} locais próximos`:`${unique.length} locais dentro da sua visão`;return;}catch(e){console.warn('[AFTERLIFE][MAP][POI]',endpoint,e);}}if(status)status.textContent='Locais reais indisponíveis agora';}
function bindMasterTools(){const tools=$('masterTools');if(!tools)return;tools.hidden=role!=='master';$('mapPanGlobal')?.addEventListener('click',()=>map.setView([0,0],2,{animate:true}));$('refreshMembers')?.addEventListener('click',()=>{refreshRequested=true;runMembersRefresh('manual');});}
function bindPlayerTools(){const box=$('playerTools');if(box)box.hidden=role==='master';}
function exposeApi(){window.__afterlifeCampaignMap={map,campaign,role,myUserId,getSelfPosition,refreshMembers:loadMembers,requestMembersRefresh,teardownRealtime};}
function bindLifecycle(){const shutdown=()=>{if(!pageAlive)return;pageAlive=false;teardownRealtime();clearTimeout(poiTimer);};window.addEventListener('pagehide',shutdown,{once:true});window.addEventListener('beforeunload',shutdown,{once:true});}
async function boot(){try{bindLifecycle();const ok=await loadCampaign();if(!ok)return;setupHeader();initMap();exposeApi();bindMasterTools();bindPlayerTools();await loadMembers();setupRealtime();exposeApi();updateStatus(role==='master'?'Mapa da campanha carregado · modo Mestre.':'Mapa da campanha carregado · modo exploração.');emit('afterlife:map-ready',{map,campaign,role,myUserId});}catch(e){console.error('[AFTERLIFE][MAP][FOUNDATION]',e);updateStatus(e?.message||'Não foi possível carregar o mapa.','error');}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
