import { aeriom } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeTravelV2Booted) return;
  window.__afterlifeTravelV2Booted = true;

  const $ = (id) => document.getElementById(id);
  const STATUS = { planned:'PLANEJADA', in_transit:'EM DESLOCAMENTO', completed:'CONCLUÍDA', cancelled:'CANCELADA' };
  const STATUS_COPY = {
    planned:'A viagem está pronta para o Mestre iniciar.',
    in_transit:'O grupo está em deslocamento. O destino ainda não foi aplicado ao mapa.',
    completed:'A viagem chegou ao destino e as posições participantes foram atualizadas.',
    cancelled:'A viagem foi cancelada sem alterar as posições.'
  };
  let map = null, campaign = null, role = 'player', members = [];
  let currentTravel = null, history = [], destination = null, route = null, routeLine = null, channel = null, busy = false;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const fmtDistance = (m) => { const km = Math.max(0, Number(m)||0)/1000; return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`; };
  const fmtTime = (m) => { const v=Math.max(0,Math.round(Number(m)||0)); if(v<60)return `${v} min`; const h=Math.floor(v/60), r=v%60; return r?`${h}h ${r}min`:`${h}h`; };
  const fmtNum = (v) => Number(v||0).toFixed(1).replace('.',',');
  const selfPos = () => window.__afterlifeCampaignMap?.getSelfPosition?.() || null;
  function clearRoute(){ if(routeLine)routeLine.remove(); routeLine=null; }
  function drawRoute(points){ clearRoute(); if(!map||!Array.isArray(points)||points.length<2)return; routeLine=L.polyline(points,{weight:5,opacity:.9,dashArray:'10 8',className:'afterlife-travel-route'}).addTo(map); }

  function ensurePanel(){
    if($('afterlifeTravelPanel'))return;
    const sidebar=document.querySelector('.map-sidebar'); if(!sidebar)return;
    const panel=document.createElement('section'); panel.id='afterlifeTravelPanel'; panel.className='afterlife-travel-panel';
    panel.innerHTML=`
      <div class="afterlife-travel-panel__head"><div><span>DESLOCAMENTO</span><strong>VIAGEM</strong></div><b id="afterlifeTravelStatusBadge">SEM VIAGEM</b></div>
      <div id="afterlifeTravelCurrent" class="afterlife-travel-current"></div>
      <div id="afterlifeTravelMaster" class="afterlife-travel-master" hidden>
        <div class="afterlife-travel-block"><div class="afterlife-travel-label">DESTINO</div><div id="afterlifeTravelDestination" class="afterlife-travel-destination">Clique no mapa ou escolha um local.</div><div class="afterlife-travel-actions"><button type="button" id="afterlifeTravelClearDestination" class="afterlife-travel-btn">LIMPAR</button></div></div>
        <div class="afterlife-travel-block"><div class="afterlife-travel-label">PARTICIPANTES</div><div id="afterlifeTravelParticipants" class="afterlife-travel-participants"></div></div>
        <div class="afterlife-travel-grid">
          <label><span>RITMO · km/h</span><input id="travelSpeed" type="number" min="0.1" max="300" step="0.1" value="5"></label>
          <label><span>COMBUSTÍVEL / km</span><input id="travelFuelPerKm" type="number" min="0" step="0.01" value="0"></label>
          <label><span>ENERGIA / km</span><input id="travelEnergyPerKm" type="number" min="0" step="0.01" value="0"></label>
          <label><span>EXPOSIÇÃO / km</span><input id="travelExposurePerKm" type="number" min="0" step="0.01" value="0"></label>
        </div>
        <div id="afterlifeTravelQuote" class="afterlife-travel-quote">Defina um destino para calcular a rota.</div>
        <button type="button" id="afterlifeTravelCreate" class="afterlife-travel-btn afterlife-travel-btn--primary" disabled>CRIAR VIAGEM</button>
      </div>
      <div id="afterlifeTravelNotice" class="afterlife-travel-notice"></div>
      <div class="afterlife-travel-history"><div class="afterlife-travel-label">HISTÓRICO</div><div id="afterlifeTravelHistoryList"></div></div>`;
    ($('masterTools')||sidebar.firstElementChild)?.insertAdjacentElement('afterend',panel);
    $('afterlifeTravelClearDestination')?.addEventListener('click',()=>{destination=null;route=null;clearRoute();render();});
    $('afterlifeTravelCreate')?.addEventListener('click',createTravel);
    ['travelSpeed','travelFuelPerKm','travelEnergyPerKm','travelExposurePerKm'].forEach((id)=>$(id)?.addEventListener('input',refreshQuote));
  }

  function selectedParticipants(){ return [...document.querySelectorAll('[data-travel-member]:checked')].map((el)=>el.dataset.travelMember).filter(Boolean); }
  function renderParticipants(){
    const host=$('afterlifeTravelParticipants'); if(!host)return; host.replaceChildren();
    const players=(members||[]).filter((m)=>m.role!=='master');
    if(!players.length){host.innerHTML='<small>Nenhum sobrevivente disponível.</small>';return;}
    const active=new Set(currentTravel?.participant_user_ids||[]);
    players.forEach((m)=>{ const label=document.createElement('label'); label.className='afterlife-travel-check'; const checked=active.size?active.has(m.user_id):true; label.innerHTML=`<input type="checkbox" data-travel-member="${esc(m.user_id)}" ${checked?'checked':''}><span>${esc(m.display_name||'Sobrevivente')}</span>`; host.appendChild(label); });
  }
  function origin(){
    const ids=selectedParticipants();
    const member=ids.map((id)=>(members||[]).find((m)=>m.user_id===id)).find((m)=>Number.isFinite(Number(m?.latitude))&&Number.isFinite(Number(m?.longitude)));
    return member?{lat:Number(member.latitude),lng:Number(member.longitude)}:selfPos();
  }

  async function routeBetween(a,b){
    try{
      const url=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;
      const response=await fetch(url,{headers:{Accept:'application/json'}}); if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json(), r=data?.routes?.[0], coords=r?.geometry?.coordinates;
      if(!r||!Array.isArray(coords)||coords.length<2)throw new Error('ROUTE_EMPTY');
      return {distance_m:Number(r.distance)||0,geometry:coords.map(([lng,lat])=>[Number(lat),Number(lng)]),provider:'osrm'};
    }catch(error){
      console.warn('[AFTERLIFE][TRAVEL][ROUTE]',error);
      const meters=map?map.distance([a.lat,a.lng],[b.lat,b.lng]):0;
      return {distance_m:meters,geometry:[[a.lat,a.lng],[b.lat,b.lng]],provider:'straight-line-fallback'};
    }
  }

  async function setDestination(point,name='Destino no mapa',locationId=null){
    if(role!=='master')return;
    const target={lat:Number(point.lat),lng:Number(point.lng),name:String(name||'Destino no mapa').slice(0,140),locationId};
    if(!Number.isFinite(target.lat)||!Number.isFinite(target.lng))return;
    destination=target; route=null; render();
    const a=origin(); if(!a)return;
    const quote=$('afterlifeTravelQuote'); if(quote)quote.textContent='Calculando rota…';
    route=await routeBetween(a,target); drawRoute(route.geometry); render();
  }

  function refreshQuote(){
    const quote=$('afterlifeTravelQuote'); if(!quote)return;
    if(!destination||!route){quote.textContent='Defina um destino para calcular a rota.';return;}
    const speed=Math.max(.1,Number($('travelSpeed')?.value)||5), fuelPerKm=Math.max(0,Number($('travelFuelPerKm')?.value)||0), energyPerKm=Math.max(0,Number($('travelEnergyPerKm')?.value)||0), exposurePerKm=Math.max(0,Number($('travelExposurePerKm')?.value)||0);
    const km=route.distance_m/1000, minutes=Math.round(km/speed*60), fuel=km*fuelPerKm, energy=km*energyPerKm, exposure=km*exposurePerKm;
    quote.innerHTML=`<div><strong>${fmtDistance(route.distance_m)}</strong><span>distância · ${esc(route.provider)}</span></div><div><strong>${fmtTime(minutes)}</strong><span>tempo estimado</span></div><div><strong>${fmtNum(fuel)}</strong><span>combustível</span></div><div><strong>${fmtNum(energy)}</strong><span>energia</span></div><div><strong>${fmtNum(exposure)}</strong><span>exposição</span></div>`;
  }

  function renderCurrent(){
    const host=$('afterlifeTravelCurrent'), badge=$('afterlifeTravelStatusBadge'); if(!host)return;
    if(!currentTravel){if(badge){badge.textContent='SEM VIAGEM';badge.dataset.status='idle';}host.innerHTML='<div class="afterlife-travel-empty">Nenhuma viagem ativa. O Mestre pode marcar um destino no mapa.</div>';return;}
    if(badge){badge.textContent=STATUS[currentTravel.status]||currentTravel.status;badge.dataset.status=currentTravel.status;}
    host.innerHTML=`<div class="afterlife-travel-card"><div class="afterlife-travel-card__route"><div><span>ORIGEM</span><strong>${Number(currentTravel.origin_latitude).toFixed(4)}°, ${Number(currentTravel.origin_longitude).toFixed(4)}°</strong></div><i>→</i><div><span>DESTINO</span><strong>${esc(currentTravel.destination_name)}</strong></div></div><div class="afterlife-travel-card__metrics"><span><b>${fmtDistance(currentTravel.distance_m)}</b>distância</span><span><b>${fmtTime(currentTravel.estimated_minutes)}</b>tempo</span><span><b>${fmtNum(currentTravel.fuel_cost)}</b>combustível</span></div><p>${esc(STATUS_COPY[currentTravel.status]||'')}</p></div>`;
    if(role==='master'){
      const actions=document.createElement('div'); actions.className='afterlife-travel-card__actions';
      if(currentTravel.status==='planned'){const b=document.createElement('button');b.className='afterlife-travel-btn afterlife-travel-btn--primary';b.textContent='INICIAR DESLOCAMENTO';b.onclick=()=>action('start_campaign_travel','Deslocamento iniciado.');actions.appendChild(b);}
      if(currentTravel.status==='in_transit'){const b=document.createElement('button');b.className='afterlife-travel-btn afterlife-travel-btn--primary';b.textContent='CONCLUIR E MOVER GRUPO';b.onclick=()=>{if(confirm('Concluir a viagem e mover os participantes para o destino?'))action('complete_campaign_travel','Viagem concluída e grupo movido para o destino.');};actions.appendChild(b);}
      if(currentTravel.status==='planned'||currentTravel.status==='in_transit'){const b=document.createElement('button');b.className='afterlife-travel-btn';b.textContent='CANCELAR';b.onclick=()=>{if(confirm('Cancelar esta viagem?'))action('cancel_campaign_travel','Viagem cancelada.');};actions.appendChild(b);}
      host.appendChild(actions);
    }
  }

  function renderHistory(){
    const host=$('afterlifeTravelHistoryList'); if(!host)return; host.replaceChildren();
    history.filter((x)=>x.id!==currentTravel?.id).slice(0,6).forEach((x)=>{const row=document.createElement('div');row.className='afterlife-travel-history-row';row.innerHTML=`<span data-status="${esc(x.status)}"></span><div><strong>${esc(x.destination_name)}</strong><small>${STATUS[x.status]||x.status} · ${fmtDistance(x.distance_m)}</small></div>`;host.appendChild(row);});
    if(!host.children.length)host.innerHTML='<small>Nenhuma viagem concluída ou cancelada.</small>';
  }

  function renderMaster(){
    const host=$('afterlifeTravelMaster'); if(!host)return; host.hidden=role!=='master'||Boolean(currentTravel); if(role!=='master'||currentTravel)return;
    renderParticipants();
    const d=$('afterlifeTravelDestination'); if(d)d.innerHTML=destination?`<strong>${esc(destination.name)}</strong><small>${destination.lat.toFixed(5)}°, ${destination.lng.toFixed(5)}°${destination.locationId?' · local persistido':''}</small>`:'Clique no mapa ou escolha um local.';
    const create=$('afterlifeTravelCreate'); if(create)create.disabled=!destination||!route||!selectedParticipants().length||busy;
    refreshQuote();
  }
  function renderNotice(text=''){const el=$('afterlifeTravelNotice');if(el)el.textContent=text;}
  function render(){renderCurrent();renderMaster();renderHistory();}

  async function loadTravels(){
    const {data,error}=await aeriom.rpc('list_campaign_travels',{p_campaign_id:campaign.id,p_limit:12}); if(error)throw error;
    history=Array.isArray(data)?data:[]; currentTravel=history.find((x)=>x.status==='planned'||x.status==='in_transit')||null;
    if(currentTravel?.route?.geometry)drawRoute(currentTravel.route.geometry); else if(!currentTravel)clearRoute();
    render();
  }

  async function createTravel(){
    if(busy||role!=='master'||!destination||!route)return;
    const a=origin(), participants=selectedParticipants(); if(!a)return renderNotice('Nenhum participante possui posição válida para ser a origem.'); if(!participants.length)return renderNotice('Selecione ao menos um sobrevivente.');
    busy=true;renderNotice('Criando viagem…');render();
    try{
      const speed=Math.max(.1,Number($('travelSpeed')?.value)||5), fuel=Math.max(0,Number($('travelFuelPerKm')?.value)||0), energy=Math.max(0,Number($('travelEnergyPerKm')?.value)||0), exposure=Math.max(0,Number($('travelExposurePerKm')?.value)||0);
      const {error}=await aeriom.rpc('create_campaign_travel',{p_campaign_id:campaign.id,p_origin_latitude:a.lat,p_origin_longitude:a.lng,p_destination_latitude:destination.lat,p_destination_longitude:destination.lng,p_destination_location_id:destination.locationId,p_destination_name:destination.name,p_route:{provider:route.provider,geometry:route.geometry},p_distance_m:route.distance_m,p_speed_kmh:speed,p_fuel_per_km:fuel,p_energy_per_km:energy,p_exposure_per_km:exposure,p_participant_user_ids:participants});
      if(error)throw error; destination=null;route=null;clearRoute();await loadTravels();renderNotice('Viagem criada. O Mestre ainda precisa iniciá-la.');
    }catch(error){console.error('[AFTERLIFE][TRAVEL][CREATE]',error);renderNotice(error?.message||'Não foi possível criar a viagem.');}
    finally{busy=false;render();}
  }

  async function action(fn,message){
    if(!currentTravel||busy||role!=='master')return; busy=true;renderNotice('Atualizando viagem…');render();
    try{const {error}=await aeriom.rpc(fn,{p_travel_id:currentTravel.id});if(error)throw error;await loadTravels();if(fn==='complete_campaign_travel')await window.__afterlifeCampaignMap?.refreshMembers?.();renderNotice(message);}
    catch(error){console.error('[AFTERLIFE][TRAVEL][ACTION]',fn,error);renderNotice(error?.message||'Não foi possível atualizar a viagem.');}
    finally{busy=false;render();}
  }

  function subscribe(){
    if(!aeriom?.channel||!campaign)return; if(channel){try{aeriom.removeChannel(channel);}catch{}}
    channel=aeriom.channel(`afterlife-travels-${campaign.id}`).on('postgres_changes',{event:'*',schema:'public',table:'campaign_travels',filter:`campaign_id=eq.${campaign.id}`},()=>loadTravels().catch((e)=>console.warn('[AFTERLIFE][TRAVEL][REALTIME]',e))).subscribe();
  }
  function bindWorldLocationEvents(){
    window.addEventListener('afterlife:world-location-opened',(event)=>{
      const location=event.detail?.location, actions=$('afterlifeLocationActions'); if(!location||role!=='master'||!actions)return;
      actions.querySelector('[data-travel-from-location]')?.remove();
      const b=document.createElement('button');b.type='button';b.className='location-action location-action--primary';b.dataset.travelFromLocation='1';b.textContent='DEFINIR COMO DESTINO';
      b.onclick=()=>{setDestination({lat:Number(location.latitude),lng:Number(location.longitude)},location.name||'Destino',location.id||null);$('afterlifeLocationModal')?.classList.remove('is-open');map?.setView([Number(location.latitude),Number(location.longitude)],Math.max(map.getZoom(),15),{animate:true});}; actions.insertBefore(b,actions.firstChild);
    });
  }
  function bindMapClicks(){if(!map||map.__afterlifeTravelBound)return;map.__afterlifeTravelBound=true;map.on('click',(e)=>{if(role==='master'&&!e.originalEvent?.target?.closest?.('.leaflet-marker-icon,.leaflet-interactive'))setDestination(e.latlng,'Destino marcado no mapa');});}
  function bindMembers(){window.addEventListener('afterlife:map-members-updated',(e)=>{members=Array.isArray(e.detail?.members)?e.detail.members:[];if(role==='master'&&!currentTravel&&destination){route=null;setDestination(destination,destination.name,destination.locationId);}renderParticipants();});}

  function boot(detail){
    map=detail?.map||window.__afterlifeCampaignMap?.map||null; campaign=detail?.campaign||window.__afterlifeCampaignMap?.campaign||null; role=detail?.role||window.__afterlifeCampaignMap?.role||'player'; if(!map||!campaign)return;
    ensurePanel();bindMapClicks();bindWorldLocationEvents();bindMembers();window.__afterlifeTravel={setDestination,clearDestination:()=>{destination=null;route=null;clearRoute();render();}};
    (async()=>{try{members=await window.__afterlifeCampaignMap?.refreshMembers?.()||[];await loadTravels();}catch(error){console.error('[AFTERLIFE][TRAVEL][BOOT]',error);renderNotice(error?.message||'Não foi possível carregar as viagens.');}subscribe();})();
  }
  window.addEventListener('afterlife:map-ready',(event)=>boot(event.detail),{once:true});
  if(window.__afterlifeCampaignMap?.map&&window.__afterlifeCampaignMap?.campaign)boot(window.__afterlifeCampaignMap);
})();
