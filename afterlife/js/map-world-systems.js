import { aeriom } from './aeriom-client-v2.js?v=20260918-2';

(() => {
  'use strict';
  if (window.__afterlifeMapWorldSystemsBooted) return;
  window.__afterlifeMapWorldSystemsBooted = true;

  let api=null,map=null,campaignId='',role='player',radarTimer=null,channel=null;
  let hordeMarkers=new Map(),orientationBound=false,orientationActive=false,deviceHeading=0;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const cardinal=deg=>['N','NE','E','SE','S','SW','W','NW'][Math.round((((Number(deg)||0)%360)+360)%360/45)%8];

  const distanceKm=(a,b)=>{
    const R=6371,rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad,dLat=(b.lat-a.lat)*rad,dLon=(b.lng-a.lng)*rad;
    const x=Math.sin(dLat/2)**2+Math.sin(dLon/2)**2*Math.cos(lat1)*Math.cos(lat2);
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
  };
  const bearing=(a,b)=>{
    const rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad,dLon=(b.lng-a.lng)*rad;
    const y=Math.sin(dLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    return (Math.atan2(y,x)/rad+360)%360;
  };

  function updateCompass(){
    const needle=$('afterlifeCompassNeedle'),readout=$('afterlifeCompassReadout'),btn=$('afterlifeCompassButton');
    if(needle)needle.style.transform='rotate('+deviceHeading+'deg)';
    if(readout)readout.textContent=cardinal(deviceHeading)+' · '+Math.round(deviceHeading)+'°';
    if(btn)btn.classList.toggle('is-active',orientationActive);
  }

  async function activateOrientation(){
    try{
      if(typeof DeviceOrientationEvent==='undefined'){
        orientationActive=true;updateCompass();return;
      }
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        const p=await DeviceOrientationEvent.requestPermission();
        if(p!=='granted'){orientationActive=false;updateCompass();return;}
      }
      if(!orientationBound){
        orientationBound=true;
        window.addEventListener('deviceorientationabsolute',onOrientation,true);
        window.addEventListener('deviceorientation',onOrientation,true);
      }
      orientationActive=true;updateCompass();
      $('afterlifeCompassReadout') && ($('afterlifeCompassReadout').textContent='N · aguardando…');
    }catch(e){
      console.warn('[AFTERLIFE][COMPASS]',e);
      orientationActive=true;updateCompass();
    }
  }

  function onOrientation(e){
    const h=Number.isFinite(e?.webkitCompassHeading)?Number(e.webkitCompassHeading):
      Number.isFinite(e?.alpha)?360-Number(e.alpha):null;
    if(!Number.isFinite(h))return;
    deviceHeading=(h+360)%360;updateCompass();
  }

  function ensureCompass(){
    if(!map)return;
    const c=map.getContainer();
    let root=c.querySelector('.afterlife-map-compass');
    if(!root){
      root=document.createElement('div');
      root.className='afterlife-map-compass';
      root.innerHTML='<button type="button" class="afterlife-compass-face" id="afterlifeCompassButton" aria-label="Ativar orientação da bússola"><span class="afterlife-compass-n">N</span><span class="afterlife-compass-e">E</span><span class="afterlife-compass-s">S</span><span class="afterlife-compass-w">W</span><i id="afterlifeCompassNeedle"></i></button><small id="afterlifeCompassReadout">N · 0°</small>';
      c.appendChild(root);
      $('afterlifeCompassButton')?.addEventListener('click',activateOrientation);
    }
    updateCompass();
  }

  function hordeIcon(h){
    const level=Math.max(1,Math.min(10,Number(h.threat_level)||1));
    return L.divIcon({
      className:'afterlife-horde-icon-wrap',
      html:'<div class="afterlife-horde-icon" data-threat="'+level+'" style="--dir:'+(Number(h.direction_deg)||0)+'deg"><span>'+(Number(h.mutant_count)||0)+'</span><i></i></div>',
      iconSize:[36,36],iconAnchor:[18,18]
    });
  }

  function renderHordes(rows){
    if(!map)return;
    const visible=rows.filter(h=>Number.isFinite(Number(h.latitude))&&Number.isFinite(Number(h.longitude)));
    visible.forEach(h=>{
      let m=hordeMarkers.get(h.id);
      if(!m){
        m=L.marker([h.latitude,h.longitude],{icon:hordeIcon(h),zIndexOffset:600,keyboard:true}).addTo(map);
        m.bindTooltip((h.name||'Horda')+' · '+(Number(h.size)||0)+' zumbis');
        m.on('click',()=>m.bindPopup('<strong>☢ '+esc(h.name||'Horda')+'</strong><br>Quantidade: '+(Number(h.size)||0)+'<br>Velocidade: '+(Number(h.speed_kmh)||0)+' km/h<br>Direção: '+cardinal(h.direction_deg)+' ('+Math.round(Number(h.direction_deg)||0)+'°)<br>Ameaça: '+(Number(h.threat_level)||1)+'/10<br>Mutantes: '+(Number(h.mutant_count)||0)+(h.eta_minutes!=null?'<br>ETA: '+Number(h.eta_minutes)+' min':'')).openPopup());
        hordeMarkers.set(h.id,m);
      }else{m.setLatLng([h.latitude,h.longitude]);m.setIcon(hordeIcon(h));}
    });
    const alive=new Set(visible.map(h=>h.id));
    for(const [id,m] of hordeMarkers)if(!alive.has(id)){m.remove();hordeMarkers.delete(id);}
    const list=$('afterlifeHordeList'),count=$('afterlifeHordeCount');
    if(count)count.textContent=String(visible.length);
    if(list)list.innerHTML=visible.length?visible.slice(0,6).map(h=>{
      const center=api?.getSelfPosition?.()||map.getCenter();
      const km=distanceKm(center,{lat:Number(h.latitude),lng:Number(h.longitude)});
      const br=bearing(center,{lat:Number(h.latitude),lng:Number(h.longitude)});
      return '<button type="button" data-horde-focus="'+esc(h.id)+'"><i data-threat="'+Math.max(1,Math.min(10,Number(h.threat_level)||1))+'"></i><span><strong>'+esc(h.name||'Horda')+'</strong><small>'+(Number(h.size)||0)+' zumbis · '+km.toFixed(1)+' km · '+cardinal(br)+'</small></span><b>'+(Number(h.threat_level)||1)+'</b></button>';
    }).join(''):'<small class="afterlife-radar-empty">Nenhuma onda detectada.</small>';
    list?.querySelectorAll('[data-horde-focus]')?.forEach(btn=>btn.addEventListener('click',()=>{
      const h=visible.find(x=>x.id===btn.dataset.hordeFocus);if(!h)return;
      map.flyTo([h.latitude,h.longitude],Math.max(map.getZoom(),14),{duration:.45});hordeMarkers.get(h.id)?.openPopup();
    }));
  }

  async function loadRadar(){
    if(!campaignId||role!=='master')return;
    try{
      const {data,error}=await aeriom.from('campaign_hordes').select('id,name,latitude,longitude,size,speed_kmh,direction_deg,threat_level,mutant_count,detected,status,eta_minutes').eq('campaign_id',campaignId).order('updated_at',{ascending:false}).limit(24);
      if(error)throw error;
      renderHordes((data||[]).filter(h=>!['ended','dispersed'].includes(h.status)));
    }catch(e){console.warn('[AFTERLIFE][HORDE-RADAR]',e);}
  }

  async function advanceHordes(){
    if(role!=='master'||!campaignId)return;
    const b=$('afterlifeAdvanceHordes');if(b)b.disabled=true;
    try{
      const {data,error}=await aeriom.rpc('advance_campaign_hordes',{p_campaign_id:campaignId,p_minutes:10});
      if(error)throw error;
      window.afterlifeToast?.((Number(data)||0)+' hordas avançaram 10 minutos.','success');
      await loadRadar();
    }catch(e){window.afterlifeToast?.(e?.message||'Não foi possível avançar as hordas.','error');}
    finally{if(b)b.disabled=false;}
  }

  function ensureRadar(){
    if(!map||role!=='master')return;
    const c=map.getContainer();
    let root=c.querySelector('.afterlife-horde-radar');
    if(!root){
      root=document.createElement('aside');
      root.className='afterlife-horde-radar';
      root.innerHTML='<header><div><span>☢ RADAR DO MESTRE</span><strong>ONDAS</strong></div><div class="afterlife-radar-head-actions"><button type="button" id="afterlifeAdvanceHordes">+10m</button><b id="afterlifeHordeCount">0</b></div></header><div id="afterlifeHordeList" class="afterlife-horde-list"><small>Buscando sinais…</small></div>';
      c.appendChild(root);
      $('afterlifeAdvanceHordes')?.addEventListener('click',advanceHordes);
    }
  }

  async function boot(detail){
    api=detail||window.__afterlifeCampaignMap;map=api?.map||null;campaignId=api?.campaign?.id||'';role=api?.role||'player';
    if(!map||!campaignId)return;
    ensureCompass();ensureRadar();await loadRadar();
    clearInterval(radarTimer);radarTimer=setInterval(loadRadar,12000);
    try{if(channel)aeriom.removeChannel(channel);}catch{}
    if(role==='master'){
      channel=aeriom.channel('afterlife-map-horde-radar:'+campaignId).on('postgres_changes',{event:'*',schema:'public',table:'campaign_hordes',filter:'campaign_id=eq.'+campaignId},loadRadar).subscribe();
    }
  }

  window.__afterlifeMapWorldSystems={activateCompass:activateOrientation,refreshRadar:loadRadar};
  window.addEventListener('afterlife:map-ready',e=>boot(e.detail));
  if(window.__afterlifeCampaignMap?.map)setTimeout(()=>boot(window.__afterlifeCampaignMap),0);
  window.addEventListener('pagehide',()=>{clearInterval(radarTimer);try{if(channel)aeriom.removeChannel(channel);}catch{}},{once:true});
})();