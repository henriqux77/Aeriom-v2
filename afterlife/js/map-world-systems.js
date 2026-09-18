import { aeriom } from './aeriom-client-v2.js?v=20260918-2';

(() => {
  'use strict';

  let api = null;
  let map = null;
  let campaignId = '';
  let role = 'player';
  let radarTimer = null;
  let channel = null;
  let hordeMarkers = new Map();
  let deviceHeading = 0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const cardinal = deg => ['N','NE','E','SE','S','SW','W','NW'][Math.round(((Number(deg)%360)+360)%360/45)%8];
  const distanceKm=(a,b)=>{
    const R=6371,rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad,dlat=(b.lat-a.lat)*rad,dlon=(b.lng-a.lng)*rad;
    const x=Math.sin(dlat/2)**2+Math.sin(dlon/2)**2*Math.cos(lat1)*Math.cos(lat2);
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
  };
  const bearing=(a,b)=>{
    const rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad,dlon=(b.lng-a.lng)*rad;
    const y=Math.sin(dlon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dlon);
    return (Math.atan2(y,x)/rad+360)%360;
  };

  function ensureUI(){
    if(!map) return;
    const container=map.getContainer();

    let compass=container.querySelector('.afterlife-map-compass');
    if(!compass){
      compass=document.createElement('div');
      compass.className='afterlife-map-compass';
      compass.innerHTML='<button type="button" class="afterlife-compass-face" id="afterlifeCompassButton" aria-label="Ativar orientação da bússola"><span class="afterlife-compass-n">N</span><span class="afterlife-compass-e">E</span><span class="afterlife-compass-s">S</span><span class="afterlife-compass-w">W</span><i id="afterlifeCompassNeedle"></i></button><small id="afterlifeCompassReadout">N · 0°</small>';
      container.appendChild(compass);
      compass.querySelector('#afterlifeCompassButton')?.addEventListener('click',requestOrientation);
    }

    if(role==='master'){
      let radar=container.querySelector('.afterlife-horde-radar');
      if(!radar){
        radar=document.createElement('aside');
        radar.className='afterlife-horde-radar';
        radar.innerHTML='<header><div><span>☢ RADAR DO MESTRE</span><strong>ONDAS</strong></div><b id="afterlifeHordeCount">0</b></header><div id="afterlifeHordeList" class="afterlife-horde-list"><small>Buscando sinais…</small></div>';
        container.appendChild(radar);
      }
    }
  }

  async function requestOrientation(){
    try{
      if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted')return;
      }
      window.addEventListener('deviceorientationabsolute',onOrientation,true);
      window.addEventListener('deviceorientation',onOrientation,true);
    }catch(e){console.warn('[AFTERLIFE][COMPASS]',e)}
  }

  function onOrientation(event){
    const heading=Number.isFinite(event.webkitCompassHeading)?event.webkitCompassHeading:
      Number.isFinite(event.alpha)?(360-event.alpha):0;
    deviceHeading=(heading+360)%360;
    updateCompass();
  }

  function updateCompass(){
    const needle=document.getElementById('afterlifeCompassNeedle');
    const text=document.getElementById('afterlifeCompassReadout');
    if(needle)needle.style.transform='rotate('+deviceHeading+'deg)';
    if(text)text.textContent=cardinal(deviceHeading)+' · '+Math.round(deviceHeading)+'°';
  }

  function hordeIcon(h){
    const level=Math.max(1,Math.min(10,Number(h.threat_level)||1));
    return L.divIcon({
      className:'afterlife-horde-icon-wrap',
      html:'<div class="afterlife-horde-icon" data-threat="'+level+'" style="--dir:'+Number(h.direction_deg||0)+'deg"><span>'+Number(h.mutant_count||0)+'</span><i></i></div>',
      iconSize:[42,42],iconAnchor:[21,21]
    });
  }

  function renderHordes(rows){
    if(!map) return;
    rows.forEach(h=>{
      let marker=hordeMarkers.get(h.id);
      if(!marker){
        marker=L.marker([h.latitude,h.longitude],{icon:hordeIcon(h),zIndexOffset:600,keyboard:true}).addTo(map);
        marker.bindTooltip((h.name||'Horda')+' · '+Number(h.size||0)+' zumbis');
        marker.on('click',()=>marker.bindPopup('<strong>☢ '+esc(h.name||'Horda')+'</strong><br>Quantidade: '+Number(h.size||0)+'<br>Velocidade: '+Number(h.speed_kmh||0)+' km/h<br>Direção: '+cardinal(h.direction_deg)+' ('+Math.round(Number(h.direction_deg||0))+'°)<br>Ameaça: '+Number(h.threat_level||1)+'/10<br>Mutantes: '+Number(h.mutant_count||0)+(h.eta_minutes!=null?'<br>ETA: '+Number(h.eta_minutes)+' min':'')).openPopup());
        hordeMarkers.set(h.id,marker);
      }else{
        marker.setLatLng([h.latitude,h.longitude]);marker.setIcon(hordeIcon(h));
      }
    });
    const alive=new Set(rows.map(x=>x.id));
    for(const [id,marker] of hordeMarkers){if(!alive.has(id)){marker.remove();hordeMarkers.delete(id)}}
    const list=document.getElementById('afterlifeHordeList');
    const count=document.getElementById('afterlifeHordeCount');
    if(count)count.textContent=rows.length;
    if(list)list.innerHTML=rows.length?rows.slice(0,6).map(h=>{
      const center=api?.getSelfPosition?.()||map.getCenter();
      const km=distanceKm(center,{lat:Number(h.latitude),lng:Number(h.longitude)});
      const br=bearing(center,{lat:Number(h.latitude),lng:Number(h.longitude)});
      return '<button type="button" data-horde-focus="'+esc(h.id)+'"><i data-threat="'+Math.max(1,Math.min(10,Number(h.threat_level)||1))+'"></i><span><strong>'+esc(h.name||'Horda')+'</strong><small>'+Number(h.size||0)+' zumbis · '+km.toFixed(1)+' km · '+cardinal(br)+'</small></span><b>'+Number(h.threat_level||1)+'</b></button>';
    }).join(''):'<small class="afterlife-radar-empty">Nenhuma onda detectada.</small>';
    list?.querySelectorAll('[data-horde-focus]')?.forEach(btn=>btn.addEventListener('click',()=>{
      const h=rows.find(x=>x.id===btn.dataset.hordeFocus);if(!h)return;
      map.flyTo([h.latitude,h.longitude],Math.max(map.getZoom(),14),{duration:.45});
      hordeMarkers.get(h.id)?.openPopup();
    }));
  }

  async function loadRadar(){
    if(!campaignId || role!=='master') return;
    try{
      const {data,error}=await aeriom.from('campaign_hordes').select('id,name,latitude,longitude,size,speed_kmh,direction_deg,threat_level,mutant_count,detected,status,eta_minutes').eq('campaign_id',campaignId).order('updated_at',{ascending:false}).limit(30);
      if(error)throw error;
      renderHordes((data||[]).filter(h=>h.status!=='ended'&&h.status!=='dispersed'));
    }catch(e){console.warn('[AFTERLIFE][HORDE-RADAR]',e)}
  }

  async function boot(detail){
    api=detail||window.__afterlifeCampaignMap;map=api?.map||null;campaignId=api?.campaign?.id||'';role=api?.role||'player';
    if(!map||!campaignId)return;
    ensureUI();
    updateCompass();
    await loadRadar();
    clearInterval(radarTimer);radarTimer=setInterval(loadRadar,10000);
    try{if(channel)aeriom.removeChannel(channel)}catch{}
    channel=aeriom.channel('afterlife-map-systems:'+campaignId).on('postgres_changes',{event:'*',schema:'public',table:'campaign_hordes',filter:'campaign_id=eq.'+campaignId},loadRadar).subscribe();
  }

  window.addEventListener('afterlife:map-ready',e=>boot(e.detail));
  if(window.__afterlifeCampaignMap?.map)boot(window.__afterlifeCampaignMap);
  window.addEventListener('pagehide',()=>{clearInterval(radarTimer);try{channel&&aeriom.removeChannel(channel)}catch{}});
})();
