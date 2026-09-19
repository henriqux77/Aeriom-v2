import { aeriom } from './aeriom-client-v2.js?v=20260918-2';

(() => {
  'use strict';
  if (window.__afterlifeZombieDensityBooted) return;
  window.__afterlifeZombieDensityBooted = true;

  let map=null, campaign=null, role='player';
  let layer=null, zones=[], renderTimer=null, channel=null;
  const markers=new Map();

  const GRID_METERS=220;
  const MAX_CLUSTERS=90;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function hash(str){
    let h=2166136261;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0)/4294967295;
  }
  function offset(lat,lng,meters,bearingDeg){
    const rad=Math.PI/180;
    const dLat=meters*Math.cos(bearingDeg*rad)/111320;
    const dLng=meters*Math.sin(bearingDeg*rad)/(111320*Math.max(.22,Math.cos(lat*rad)));
    return {lat:lat+dLat,lng:lng+dLng};
  }

  function icon(count, threat){
    const size=count>=25?7:count>=12?6:5;
    return L.divIcon({
      className:'afterlife-zombie-density-wrap',
      html:'<span class="afterlife-zombie-density" data-threat="'+clamp(Math.round(threat/10),1,10)+'" style="--dot-size:'+size+'px"></span>',
      iconSize:[size+8,size+8],
      iconAnchor:[(size+8)/2,(size+8)/2]
    });
  }

  function buildClusters(){
    const result=[];
    const seen=new Map();

    for(const zone of zones){
      const lat=Number(zone.latitude),lng=Number(zone.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;

      const infection=clamp(Number(zone.infection_percent)||0,0,100);
      const density=clamp(Number(zone.zombie_density_percent)||0,0,100);
      if(infection<8&&density<8)continue;

      const radius=Math.max(180,Number(zone.radius_m)||650);
      const rings=[
        {d:0, a:0, weight:1},
        {d:radius*.42, a:0, weight:.92},
        {d:radius*.42, a:90, weight:.95},
        {d:radius*.42, a:180, weight:.84},
        {d:radius*.42, a:270, weight:.88}
      ];

      for(const ring of rings){
        const point=ring.d?offset(lat,lng,ring.d,ring.a):{lat,lng};
        const key=Math.round(point.lat*1000)+'|'+Math.round(point.lng*1000);
        const base=2+Math.round(density*.28);
        const jitter=Math.round((hash(zone.id+':'+ring.a)*8)-4);
        const count=clamp(Math.round(base*ring.weight)+jitter,1,48);
        const threat=clamp(infection*.62+density*.38,0,100);

        if(seen.has(key)){
          const old=seen.get(key);
          old.count=clamp(old.count+Math.round(count*.55),1,60);
          old.threat=Math.max(old.threat,threat);
        }else{
          const item={id:zone.id+':'+ring.a,lat:point.lat,lng:point.lng,count,threat,zone:zone.zone_name||'Zona infectada'};
          seen.set(key,item);result.push(item);
        }
      }
    }

    // Only render what is relevant to the current map viewport.
    const bounds=map?.getBounds();
    const visible=result.filter(x=>!bounds||bounds.pad(.25).contains([x.lat,x.lng]));
    visible.sort((a,b)=>b.threat-a.threat);
    return visible.slice(0,MAX_CLUSTERS);
  }

  function render(){
    if(!map||role!=='master')return;
    if(!layer)layer=L.layerGroup().addTo(map);
    const next=buildClusters();
    const alive=new Set(next.map(x=>x.id));

    for(const [id,m] of markers){
      if(!alive.has(id)){m.remove();markers.delete(id);}
    }

    next.forEach(x=>{
      let m=markers.get(x.id);
      if(!m){
        m=L.marker([x.lat,x.lng],{
          icon:icon(x.count,x.threat),
          keyboard:false,
          interactive:true,
          zIndexOffset:180
        }).addTo(layer);
        m.bindTooltip('≈ '+x.count+' zumbis · '+Math.round(x.threat)+'% ameaça · '+esc(x.zone),{direction:'top',offset:[0,-5],opacity:.92});
        m.bindPopup('<strong>🧟 PRESENÇA DE ZUMBIS</strong><br><span>Quantidade aproximada: '+x.count+'</span><br><span>Ameaça local: '+Math.round(x.threat)+'%</span><br><small>O sistema agrupa os infectados para manter o mapa leve.</small>');
        markers.set(x.id,m);
      }else{
        m.setLatLng([x.lat,x.lng]);
        m.setIcon(icon(x.count,x.threat));
      }
    });
  }

  async function loadZones(){
    if(!campaign||role!=='master')return;
    try{
      let r=await aeriom.rpc('list_campaign_infection_zones',{p_campaign_id:campaign.id});
      if(r.error||!Array.isArray(r.data)){
        r=await aeriom.rpc('ensure_campaign_infection_zones',{p_campaign_id:campaign.id,p_city_name:campaign.country||'Cidade'});
      }
      zones=Array.isArray(r.data)?r.data:[];
      render();
    }catch(e){console.warn('[AFTERLIFE][ZOMBIE-DENSITY]',e);}
  }

  function schedule(){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(render,120);
  }

  function boot(detail){
    const ready=detail||window.__afterlifeCampaignMap;
    map=ready?.map||null;campaign=ready?.campaign||null;role=ready?.role||'player';
    if(!map||!campaign||role!=='master')return;
    if(!map.__afterlifeZombieDensityBound){
      map.__afterlifeZombieDensityBound=true;
      map.on('moveend zoomend resize',schedule);
    }
    loadZones();
  }

  window.__afterlifeZombieDensity={refresh:loadZones,render};
  window.addEventListener('afterlife:map-ready',e=>boot(e.detail));
  window.addEventListener('afterlife:infection-updated',e=>{
    zones=Array.isArray(e.detail?.zones)?e.detail.zones:zones;
    render();
  });
  if(window.__afterlifeCampaignMap?.map)setTimeout(()=>boot(window.__afterlifeCampaignMap),0);

  window.addEventListener('pagehide',()=>{
    clearTimeout(renderTimer);
    try{if(channel)aeriom.removeChannel(channel);}catch{}
    if(layer){try{layer.remove();}catch{}}
  },{once:true});
})();