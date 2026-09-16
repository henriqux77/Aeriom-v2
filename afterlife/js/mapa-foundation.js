import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

const $ = (id) => document.getElementById(id);
const POI_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const PLAYER_VISIBILITY_METERS = 380;
const POI_QUERY = `[out:json][timeout:18];(nwr(around:1000,{LAT},{LNG})[shop];nwr(around:1000,{LAT},{LNG})[amenity~"cafe|restaurant|bar|fast_food|pharmacy|hospital|clinic|fuel|bank|post_office|police|fire_station|supermarket|marketplace|school|college|university"];nwr(around:1000,{LAT},{LNG})[tourism~"hotel|hostel|museum|attraction"];nwr(around:1000,{LAT},{LNG})[craft];);out center tags;`;

let map = null;
let campaign = null;
let role = 'player';
let myUserId = null;
let memberData = [];
let memberMarkers = new Map();
let poiMarkers = [];
let poiTimer = null;
let lastPoiKey = '';
let membersChannel = null;
let refreshTimer = null;
let refreshInFlight = null;
let refreshRequested = false;
let pageAlive = true;

function esc(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function initials(v){return String(v||'S').trim().charAt(0).toUpperCase()||'S';}
function getCampaignId(){const qs=new URLSearchParams(location.search);return qs.get('campaign')||qs.get('id')||sessionStorage.getItem('afterlife_current_campaign_id')||'';}
function scaleLabel(z){return z<7?'Mundo':z<12?'Região':z<15?'Cidade':'Rua';}
function poiName(tags){return tags?.name||tags?.brand||tags?.operator||'Local sem nome';}
function poiType(tags){if(tags?.shop)return 'Comércio';const a=tags?.amenity;const types={hospital:'Hospital',clinic:'Clínica',pharmacy:'Farmácia',fuel:'Posto',police:'Delegacia',school:'Escola',college:'Faculdade',university:'Universidade',supermarket:'Mercado',marketplace:'Mercado'};return types[a]||(tags?.craft?'Oficina':'Ponto de interesse');}
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
  refreshInFlight=loadMembers().catch(error=>{
    console.error('[AFTERLIFE][MAP][REFRESH]',reason,error);
    updateStatus('Não foi possível sincronizar as posições do mapa.','error');
  }).finally(()=>{
    refreshInFlight=null;
    if(refreshRequested)runMembersRefresh('queued');
  });
  await refreshInFlight;
}
function teardownRealtime(){
  if(refreshTimer){clearTimeout(refreshTimer);refreshTimer=null;}
  if(membersChannel){
    try{aeriom.removeChannel(membersChannel);}catch(error){console.warn('[AFTERLIFE][MAP][REALTIME][CLEANUP]',error);}
    membersChannel=null;
  }
}
function setupRealtime(){
  teardownRealtime();
  if(!campaign)return;
  const channelName=`afterlife-map-positions:${campaign.id}`;
  membersChannel=aeriom.channel(channelName)
    .on('postgres_changes',{event:'*',schema:'public',table:'campaign_map_positions',filter:`campaign_id=eq.${campaign.id}`},(payload)=>{
      if(!pageAlive)return;
      console.debug('[AFTERLIFE][MAP][REALTIME]',payload.eventType,payload.new||payload.old||{});
      requestMembersRefresh('position-change');
    })
    .subscribe((status,error)=>{
      if(error)console.warn('[AFTERLIFE][MAP][REALTIME][SUBSCRIBE]',error);
      if(status==='SUBSCRIBED')updateStatus(role==='master'?'Mapa sincronizado em tempo real.':'Mapa sincronizado em tempo real.');
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')updateStatus('Sincronização em tempo real indisponível; usando atualização manual.','error');
    });
}
async function loadCampaign(){const id=getCampaignId();if(!id){location.replace('./campanhas.html');return false;}const session=await ensureAfterlifeSession();if(!session?.user){updateStatus('Sessão Afterlife não encontrada.','error');return false;}myUserId=session.user.id;const {data,error}=await aeriom.from('campaigns').select('id,name,country,latitude,longitude').eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('Campanha não encontrada.');campaign=data;sessionStorage.setItem('afterlife_current_campaign_id',String(id));const member=await aeriom.from('campaign_members').select('role').eq('campaign_id',id).eq('user_id',myUserId).maybeSingle();if(member.error)throw member.error;if(!member.data)throw new Error('Você não participa desta campanha.');role=member.data.role==='master'?'master':'player';return true;}
function setupHeader(){if(!campaign)return;document.title=`AFTERLIFE — ${campaign.name} · Mapa`;const title=$('mapTitle'),sub=$('mapSubtitle'),badge=$('mapRoleBadge'),mode=$('mapModeLabel');if(title)title.textContent=campaign.name;if(sub)sub.textContent=`Mapa da campanha · ponto inicial: ${campaign.country||'local definido'}`;if(badge){badge.textContent=role==='master'?'MESTRE · VISÃO GLOBAL':'JOGADOR · EXPLORAÇÃO';badge.dataset.role=role;}if(mode)mode.textContent=role==='master'?'GESTÃO':'EXPLORAÇÃO';}
function initMap(){map=L.map('worldMap',{center:[Number(campaign.latitude)||0,Number(campaign.longitude)||0],zoom:14,minZoom:2,maxZoom:19,worldCopyJump:true,zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);map.on('zoomend',()=>{const z=map.getZoom();$('mapScale')&&($('mapScale').textContent=scaleLabel(z));if(z>=13)schedulePois(map.getCenter());else clearPois();});map.on('moveend',()=>{if(map.getZoom()>=13)schedulePois(map.getCenter());});$('mapCenterCampaign')?.addEventListener('click',()=>map.setView([Number(campaign.latitude)||0,Number(campaign.longitude)||0],14,{animate:true}));}
function updateStatus(text,type='info'){const el=$('mapStatus');if(el){el.textContent=text||'';el.dataset.type=type;}}
async function reverse(lat,lng){try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,{headers:{'Accept':'application/json','Accept-Language':'pt-BR'}});if(!r.ok)throw new Error('reverse');const d=await r.json();return d.display_name||'';}catch{return '';}}
async function showMapPoint(latlng){const lat=Number(latlng.lat),lng=Number(latlng.lng);const address=await reverse(lat,lng);const panel=$('selectedLocation');if(panel){panel.hidden=false;panel.innerHTML=`<div class="map-selected-card"><strong>${esc((address||'Ponto no mapa').split(',').slice(0,3).join(', '))}</strong><small>${lat.toFixed(5)}°, ${lng.toFixed(5)}°</small><span>${role==='master'?'Ponto de gestão do Mestre':'Você está explorando esta região.'}</span></div>`;}}
function schedulePois(center){clearTimeout(poiTimer);poiTimer=setTimeout(()=>loadPois(center,map.getZoom()),550);}
async function loadPois(center,zoom){if(zoom<13)return;const key=`${center.lat.toFixed(3)},${center.lng.toFixed(3)},${Math.round(zoom)},${role}`;if(key===lastPoiKey)return;lastPoiKey=key;const status=$('poiStatus');status&&(status.textContent='Carregando locais reais…');const q=POI_QUERY.replaceAll('{LAT}',center.lat.toFixed(6)).replaceAll('{LNG}',center.lng.toFixed(6));for(const endpoint of POI_ENDPOINTS){try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:q});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();clearPois();const self=getSelfPosition();const unique=(d.elements||[]).map(it=>{const lat=Number(it.lat??it.center?.lat),lng=Number(it.lon??it.center?.lon),tags=it.tags||{};return {id:`${it.type}:${it.id}`,lat,lng,name:poiName(tags),type:poiType(tags)};}).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)).filter(x=>role==='master'||!self||L.latLng(x.lat,x.lng).distanceTo([self.lat,self.lng])<=PLAYER_VISIBILITY_METERS).filter((x,i,a)=>i===a.findIndex(y=>y.name===x.name&&Math.abs(y.lat-x.lat)<.00008&&Math.abs(y.lng-x.lng)<.00008)).slice(0,80);unique.forEach(p=>{const m=L.circleMarker([p.lat,p.lng],{radius:4,weight:1,color:'#53e89a',fillOpacity:.9});m.bindPopup(`<strong>${esc(p.name)}</strong><br><span>${esc(p.type)}</span>`);m.addTo(map);poiMarkers.push(m);});const list=$('poiList');if(list){list.replaceChildren();unique.slice(0,14).forEach(p=>{const b=document.createElement('button');b.type='button';b.className='map-poi-row';b.innerHTML=`<span>•</span><span><strong>${esc(p.name)}</strong><small>${esc(p.type)}</small></span>`;b.addEventListener('click',()=>map.setView([p.lat,p.lng],Math.max(map.getZoom(),16),{animate:true}));list.appendChild(b);});}if(status)status.textContent=role==='master'?`${unique.length} locais próximos`:`${unique.length} locais dentro da sua visão`;return;}catch(e){console.warn('[AFTERLIFE][MAP][POI]',endpoint,e);}}if(status)status.textContent='Locais reais indisponíveis agora';}
function bindMasterTools(){const tools=$('masterTools');if(!tools)return;tools.hidden=role!=='master';$('mapPanGlobal')?.addEventListener('click',()=>map.setView([0,0],2,{animate:true}));$('refreshMembers')?.addEventListener('click',()=>{refreshRequested=true;runMembersRefresh('manual');});}
function bindPlayerTools(){const box=$('playerTools');if(box)box.hidden=role==='master';}
function exposeApi(){window.__afterlifeCampaignMap={map,campaign,role,myUserId,getSelfPosition,refreshMembers:loadMembers,requestMembersRefresh,teardownRealtime};}
function bindLifecycle(){const shutdown=()=>{if(!pageAlive)return;pageAlive=false;teardownRealtime();};window.addEventListener('pagehide',shutdown,{once:true});window.addEventListener('beforeunload',shutdown,{once:true});}
async function boot(){try{bindLifecycle();const ok=await loadCampaign();if(!ok)return;setupHeader();initMap();exposeApi();bindMasterTools();bindPlayerTools();await loadMembers();setupRealtime();exposeApi();updateStatus(role==='master'?'Mapa da campanha carregado · modo Mestre.':'Mapa da campanha carregado · modo exploração.');emit('afterlife:map-ready',{map,campaign,role,myUserId});}catch(e){console.error('[AFTERLIFE][MAP][FOUNDATION]',e);updateStatus(e?.message||'Não foi possível carregar o mapa.','error');}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
