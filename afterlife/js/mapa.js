import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-3';

const $ = id => document.getElementById(id);
let marker = null;
let poiMarkers = [];
let poiTimer = null;
let lastPoiKey = '';
let map = null;

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const POI_QUERY = `[
out:json][timeout:18];
(
  nwr(around:900,{LAT},{LNG})[shop];
  nwr(around:900,{LAT},{LNG})[amenity~"cafe|restaurant|bar|fast_food|pharmacy|hospital|clinic|fuel|bank|post_office|police|fire_station|supermarket|marketplace"]; 
  nwr(around:900,{LAT},{LNG})[tourism~"hotel|hostel|museum|attraction"]; 
  nwr(around:900,{LAT},{LNG})[craft];
  nwr(around:900,{LAT},{LNG})[public_transport];
);
out center tags;`;

function initial(name){return String(name||'S').trim().charAt(0).toUpperCase()||'?';}
function escapeHtml(value){return String(value??'').replace(/[&<>\\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function poiType(tags){return tags?.shop?'Comércio':tags?.amenity==='restaurant'?'Restaurante':tags?.amenity==='cafe'?'Café':tags?.amenity==='pharmacy'?'Farmácia':tags?.amenity==='fuel'?'Posto':tags?.amenity?'Serviço':tags?.tourism?'Turismo':tags?.craft?'Ofício':'Ponto de interesse';}
function poiName(tags){return tags?.name||tags?.brand||tags?.operator||poiType(tags);}
function poiCoords(item){return [item.lat??item.center?.lat,item.lon??item.center?.lon];}

async function loadProfile(){
  try{
    const session=await ensureAfterlifeSession();
    const user=session?.user;if(!user)return;
    const {data}=await aeriom.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();
    const name=data?.display_name||user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Sobrevivente';
    $('profileName')?.replaceChildren(document.createTextNode(name));
    const box=$('profileAvatar');if(!box)return;box.replaceChildren();
    if(data?.avatar_path){const signed=await aeriom.storage.from('avatars').createSignedUrl(data.avatar_path,3600);if(!signed.error&&signed.data?.signedUrl){const img=document.createElement('img');img.src=signed.data.signedUrl;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>box.textContent=initial(name);box.appendChild(img);return;}}
    box.textContent=initial(name);
  }catch(e){console.warn('[AFTERLIFE][MAP] perfil',e);}
}

function clearPoiMarkers(){poiMarkers.forEach(m=>m.remove());poiMarkers=[];}
function renderPoiIcon(type){
  const div=document.createElement('div');
  const key=String(type||'poi').toLowerCase();
  div.className='afterlife-poi-marker afterlife-poi-marker--'+key.replace(/[^a-z0-9]+/g,'-');
  return L.divIcon({className:'afterlife-poi-icon-wrap',html:div.outerHTML,iconSize:[24,24],iconAnchor:[12,12]});
}

function renderNearby(items){
  const list=$('nearbyList'); const status=$('nearbyStatus'); const count=$('mapPoiCount');
  clearPoiMarkers();
  if(!Array.isArray(items)||!items.length){list.innerHTML='<div class="nearby-empty">Nenhum ponto encontrado nesta área.</div>';status.textContent='Sem resultados';count.textContent='0';return;}
  const sorted=items.map(item=>{const [lat,lng]=poiCoords(item);return {...item,lat:Number(lat),lng:Number(lng),name:poiName(item.tags||{}),type:poiType(item.tags||{})};}).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  const unique=sorted.filter((item,index,self)=>index===self.findIndex(x=>x.name===item.name&&Math.abs(x.lat-item.lat)<0.00008&&Math.abs(x.lng-item.lng)<0.00008)).slice(0,60);
  unique.forEach(item=>{
    const markerPoi=L.marker([item.lat,item.lng],{icon:renderPoiIcon(item.type)}).addTo(map);
    markerPoi.bindPopup(`<strong>${escapeHtml(item.name)}</strong><br><span>${escapeHtml(item.type)}</span>`);
    poiMarkers.push(markerPoi);
  });
  list.replaceChildren();
  unique.slice(0,12).forEach(item=>{
    const button=document.createElement('button');button.type='button';button.className='nearby-item';
    button.innerHTML=`<span class="nearby-item__icon">•</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)}</small></span>`;
    button.addEventListener('click',()=>map.setView([item.lat,item.lng],Math.max(map.getZoom(),16),{animate:true}));
    list.appendChild(button);
  });
  status.textContent=`${unique.length} ponto(s)`;count.textContent=String(unique.length);
}

async function fetchNearby(center,mapZoom){
  if(mapZoom<13){$('nearbyStatus').textContent='Aproxime o mapa para carregar';$('nearbyList').innerHTML='<div class="nearby-empty">Zoom 13+ para descobrir pontos de interesse.</div>';$('mapPoiCount').textContent='0';clearPoiMarkers();return;}
  const key=`${center.lat.toFixed(3)},${center.lng.toFixed(3)},${Math.round(mapZoom)}`;
  if(key===lastPoiKey)return;
  lastPoiKey=key;$('nearbyStatus').textContent='Procurando…';$('nearbyList').innerHTML='<div class="nearby-empty">Buscando pontos próximos…</div>';
  const query=POI_QUERY.replaceAll('{LAT}',center.lat.toFixed(6)).replaceAll('{LNG}',center.lng.toFixed(6));
  for(const endpoint of OVERPASS_ENDPOINTS){
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:query});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();renderNearby(data.elements||[]);return;
    }catch(error){console.warn('[AFTERLIFE][MAP] Overpass',endpoint,error);}
  }
  $('nearbyStatus').textContent='Indisponível';$('nearbyList').innerHTML='<div class="nearby-empty">Os pontos de interesse não puderam ser carregados agora.</div>';$('mapPoiCount').textContent='0';
}

function scheduleNearby(center){clearTimeout(poiTimer);poiTimer=setTimeout(()=>fetchNearby(center,map.getZoom()),450);}

async function reverseGeocode(lat,lng){
  try{
    const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`,{headers:{'Accept':'application/json','Accept-Language':'pt-BR'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    return data.display_name||'';
  }catch{return ''}
}

async function selectPoint(mapInstance,latlng){
  if(marker)marker.remove();
  const icon=L.divIcon({className:'',html:'<div class="afterlife-marker"></div>',iconSize:[14,14],iconAnchor:[7,7]});
  marker=L.marker(latlng,{icon,draggable:true}).addTo(mapInstance);
  marker.on('dragend',e=>selectPoint(mapInstance,e.target.getLatLng()));
  const lat=Number(latlng.lat.toFixed(6)),lng=Number(latlng.lng.toFixed(6));
  $('regionEmpty').hidden=true;$('regionSelected').hidden=false;$('regionName').textContent='Localizando…';$('regionCoords').textContent=`${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;$('coords').textContent=`${lat.toFixed(5)}, ${lng.toFixed(5)}`;$('mapState')?.replaceChildren(document.createTextNode('Selecionado'));
  const address=await reverseGeocode(lat,lng); const label=address||`${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  $('regionName').textContent=label.split(',').slice(0,3).join(',');$('regionCoords').textContent=`${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  $('createHere').href=`./campanhas.html?create=1&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&label=${encodeURIComponent(label)}`;
  sessionStorage.setItem('afterlife_selected_location',JSON.stringify({lat,lng,label}));
  marker.bindPopup(`<strong>Local inicial</strong><br>${escapeHtml(label)}`).openPopup();
  scheduleNearby(latlng);
}

function clearPoint(){
  if(marker)marker.remove();marker=null;sessionStorage.removeItem('afterlife_selected_location');$('regionSelected').hidden=true;$('regionEmpty').hidden=false;$('coords').textContent='—';$('mapState')?.replaceChildren(document.createTextNode('Nenhum'));$('createHere').href='./campanhas.html';
}

function initMap(){
  if(typeof L==='undefined'){ $('coords').textContent='Mapa indisponível'; return; }
  map=L.map('worldMap',{center:[15,0],zoom:2,minZoom:2,maxZoom:19,worldCopyJump:true,zoomControl:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  map.on('click',event=>selectPoint(map,event.latlng));
  map.on('moveend',()=>{if(map.getZoom()>=13)scheduleNearby(map.getCenter());});
  map.on('zoomend',()=>{const zoom=map.getZoom();$('mapScale').textContent=zoom<7?'Mundo':zoom<12?'Região':zoom<15?'Cidade':'Rua';if(zoom<13)clearPoiMarkers();scheduleNearby(map.getCenter());});
  $('clearPoint')?.addEventListener('click',clearPoint);
  window.addEventListener('resize',()=>map.invalidateSize());
}

document.addEventListener('DOMContentLoaded',()=>{ loadProfile(); initMap(); });
