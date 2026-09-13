const $ = id => document.getElementById(id);
let marker = null;

function initMap(){
  if(typeof L === 'undefined'){
    $('coords').textContent = 'Mapa indisponível';
    return;
  }
  const map = L.map('worldMap', {center:[15,0], zoom:2, minZoom:2, maxZoom:18, worldCopyJump:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.on('click', event => selectPoint(map,event.latlng));
  $('clearPoint').addEventListener('click', clearPoint);
  window.addEventListener('resize', () => map.invalidateSize());
}

function selectPoint(map, latlng){
  if(marker) marker.remove();
  const icon = L.divIcon({className:'', html:'<div class="afterlife-marker"></div>', iconSize:[14,14], iconAnchor:[7,7]});
  marker = L.marker(latlng,{icon}).addTo(map);
  const lat = latlng.lat.toFixed(4), lng = latlng.lng.toFixed(4);
  const payload = {lat:Number(lat),lng:Number(lng),label:`${lat}°, ${lng}°`};
  sessionStorage.setItem('afterlife_selected_location',JSON.stringify(payload));
  $('regionEmpty').hidden = true;
  $('regionSelected').hidden = false;
  $('regionName').textContent = 'Ponto selecionado';
  $('regionCoords').textContent = `${lat}°, ${lng}°`;
  $('coords').textContent = `${lat}, ${lng}`;
  $('mapState').textContent = 'Selecionado';
  $('createHere').href = `./campanhas.html?create=1&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
  marker.bindPopup(`<strong>Local inicial</strong><br>${lat}, ${lng}`).openPopup();
}

function clearPoint(){
  if(marker) marker.remove();
  marker = null;
  sessionStorage.removeItem('afterlife_selected_location');
  $('regionSelected').hidden = true;
  $('regionEmpty').hidden = false;
  $('coords').textContent = '—';
  $('mapState').textContent = 'Nenhum';
  $('createHere').href = './campanhas.html';
}

document.addEventListener('DOMContentLoaded',()=>{
  $('mobileMenu')?.addEventListener('click',()=>document.body.classList.toggle('menu-open'));
  initMap();
});