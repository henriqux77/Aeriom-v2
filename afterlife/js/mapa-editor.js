import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TYPES = [
    ['house','🏚️','Casa'],['commerce','🏪','Comércio'],['fuel','⛽','Posto'],['hospital','🏥','Hospital'],['workshop','🔧','Oficina'],['factory','🏭','Fábrica'],['police','🚓','Delegacia'],['military','🪖','Base militar'],['school','🏫','Escola'],['forest','🌲','Floresta'],['abandoned','🏢','Prédio abandonado'],['contaminated','☢️','Área contaminada'],
    ['zombie','🧟','Zumbi'],['horde','🧟‍♂️','Horda'],['npc','👤','NPC'],['survivors','👥','Grupo de sobreviventes'],['faction','🏴','Facção'],['shelter','🏕️','Abrigo'],['vehicle','🚙','Veículo'],['barricade','🚧','Barricada'],['watchtower','🗼','Torre de vigia'],['custom','✦','Outro']
  ];
  const typeMap = Object.fromEntries(TYPES.map(([key,icon,label]) => [key,{key,icon,label}]));
  const drawTypes = new Set(['faction','barricade']);

  let map = null;
  let campaign = null;
  let role = 'player';
  let entities = [];
  let markers = new Map();
  let pendingType = null;
  let drawing = null;
  let busy = false;

  function esc(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function iconFor(type){return typeMap[type]?.icon || '✦';}
  function labelFor(type){return typeMap[type]?.label || type;}

  function bootReady(detail){
    map = detail?.map || window.__afterlifeCampaignMap?.map || null;
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    if (!map || !campaign || role !== 'master') return;
    $('mapEditor')?.removeAttribute('hidden');
    document.body.classList.add('afterlife-map-editor-enabled');
    injectInspector();
    injectPalette();
    loadEntities().catch(error => setEditorStatus(error?.message || 'Não foi possível carregar os elementos do mapa.','error'));
  }

  function setEditorStatus(text,type='info'){
    const el=$('mapEditorStatus'); if(!el)return; el.textContent=text||''; el.dataset.type=type;
  }

  function injectPalette(){
    const host=$('mapEditorPalette'); if(!host||host.dataset.bound==='1')return;
    host.dataset.bound='1'; host.replaceChildren();
    TYPES.forEach(([key,icon,label])=>{
      const button=document.createElement('button'); button.type='button'; button.className='map-editor-type'; button.dataset.type=key; button.innerHTML=`<span>${icon}</span><small>${esc(label)}</small>`;
      button.addEventListener('click',()=>startPlacing(key)); host.appendChild(button);
    });
  }

  function injectInspector(){
    const host=$('mapEditorInspector'); if(!host||host.dataset.bound==='1')return;
    host.dataset.bound='1';
    host.innerHTML=`<div class="map-editor-inspector__empty" id="mapEditorEmpty"><strong>Selecione algo para editar</strong><small>Escolha um tipo ao lado e clique no mapa para adicionar.</small></div>
      <form class="map-editor-form" id="mapEditorForm" hidden>
        <div class="map-editor-form-head"><div><span id="mapEditorFormType">ELEMENTO</span><strong id="mapEditorFormTitle">Novo elemento</strong></div><button type="button" id="mapEditorCancel">×</button></div>
        <label>Nome<input id="mapEntityName" maxlength="100" required></label>
        <label>Descrição<textarea id="mapEntityDescription" maxlength="600" rows="3"></textarea></label>
        <div class="map-editor-form-grid"><label>Estado<input id="mapEntityState" maxlength="80" placeholder="Ex.: ativo, saqueado..."></label><label>Perigo<select id="mapEntityDanger"><option value="low">Baixo</option><option value="medium" selected>Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select></label></div>
        <div class="map-editor-form-actions"><button type="button" class="map-tool" id="mapEditorDelete" hidden>EXCLUIR</button><button type="submit" class="map-tool map-tool--primary" id="mapEditorSave">SALVAR</button></div>
      </form>`;
    $('mapEditorCancel').addEventListener('click',cancelEditor);
    $('mapEditorDelete').addEventListener('click',deleteSelected);
    $('mapEditorForm').addEventListener('submit',saveEntity);
  }

  function startPlacing(type){
    if(role!=='master'||!map)return;
    cancelDrawing();
    pendingType=type;
    document.querySelectorAll('.map-editor-type').forEach(b=>b.classList.toggle('is-selected',b.dataset.type===type));
    setEditorStatus(drawTypes.has(type)?`Desenhe ${labelFor(type).toLowerCase()} no mapa.`:`Clique no mapa para colocar ${labelFor(type).toLowerCase()}.`,'success');
    if(drawTypes.has(type)) startDrawing(type);
  }

  function startDrawing(type){
    drawing={type,points:[],layer:null};
    map.doubleClickZoom.disable();
    map.on('click',onDrawClick);
    map.on('dblclick',finishDrawing);
  }

  function onDrawClick(e){
    if(!drawing)return;
    drawing.points.push([e.latlng.lat,e.latlng.lng]);
    if(drawing.layer) drawing.layer.setLatLngs(drawing.points);
    else drawing.layer = L.polyline(drawing.points,{color:typeMap[drawing.type].key==='faction'?'#d6b66c':'#63f6a8',weight:drawing.type==='faction'?3:6,dashArray:drawing.type==='faction'?'8 7':null,interactive:false}).addTo(map);
    setEditorStatus(`${drawing.points.length} ponto(s). Continue clicando ou dê duplo clique para finalizar.`);
  }

  function finishDrawing(e){
    if(!drawing||drawing.points.length<2)return;
    L.DomEvent.stop(e);
    const points=drawing.points.slice();
    const type=drawing.type;
    const layer=drawing.layer;
    endDrawing();
    if(type==='faction') openCreateForm(type,{geometry:{type:'polygon',coordinates:points.map(p=>[p[0],p[1]])}});
    else openCreateForm(type,{geometry:{type:'polyline',coordinates:points.map(p=>[p[0],p[1]])}});
    if(layer) layer.remove();
  }

  function endDrawing(){
    if(!drawing)return; map.off('click',onDrawClick); map.off('dblclick',finishDrawing); map.doubleClickZoom.enable(); drawing=null;
  }
  function cancelDrawing(){endDrawing();}

  function onMapClick(e){
    if(role!=='master'||!pendingType||drawTypes.has(pendingType))return;
    const type=pendingType; pendingType=null;
    document.querySelectorAll('.map-editor-type').forEach(b=>b.classList.remove('is-selected'));
    openCreateForm(type,{latitude:Number(e.latlng.lat.toFixed(6)),longitude:Number(e.latlng.lng.toFixed(6))});
  }

  function openCreateForm(type,geo){
    const form=$('mapEditorForm'), empty=$('mapEditorEmpty'); if(!form)return;
    form.hidden=false; if(empty)empty.hidden=true;
    $('mapEditorFormType').textContent=labelFor(type).toUpperCase();
    $('mapEditorFormTitle').textContent='Novo elemento';
    $('mapEntityName').value=labelFor(type); $('mapEntityDescription').value=''; $('mapEntityState').value=''; $('mapEntityDanger').value='medium';
    $('mapEditorDelete').hidden=true; form.dataset.mode='create'; form.dataset.type=type; form.dataset.geometry=JSON.stringify(geo||{}); form.dataset.entityId='';
    setEditorStatus('Defina os detalhes e salve no mapa.','success');
  }

  function openEditForm(entity){
    const form=$('mapEditorForm'), empty=$('mapEditorEmpty'); if(!form)return;
    form.hidden=false; if(empty)empty.hidden=true;
    $('mapEditorFormType').textContent=labelFor(entity.entity_type).toUpperCase(); $('mapEditorFormTitle').textContent='Editar elemento';
    $('mapEntityName').value=entity.name||labelFor(entity.entity_type); $('mapEntityDescription').value=entity.description||''; $('mapEntityState').value=entity.state?.status||''; $('mapEntityDanger').value=entity.state?.danger||'medium';
    $('mapEditorDelete').hidden=false; form.dataset.mode='edit'; form.dataset.type=entity.entity_type; form.dataset.geometry=JSON.stringify(entity.geometry||{}); form.dataset.entityId=entity.id;
  }

  function cancelEditor(){
    pendingType=null; cancelDrawing(); const form=$('mapEditorForm'), empty=$('mapEditorEmpty'); if(form){form.hidden=true;form.dataset.mode='';} if(empty)empty.hidden=false; document.querySelectorAll('.map-editor-type').forEach(b=>b.classList.remove('is-selected')); setEditorStatus('Selecione um tipo para adicionar ao mapa.');
  }

  async function saveEntity(e){
    e.preventDefault(); if(busy)return; busy=true;
    try{
      const session=await ensureAfterlifeSession(); if(!session?.user)throw new Error('Sessão Afterlife não encontrada.');
      const form=$('mapEditorForm'); const type=form.dataset.type; const name=$('mapEntityName').value.trim(); const desc=$('mapEntityDescription').value.trim();
      if(name.length<1)throw new Error('Informe um nome.');
      const geo=JSON.parse(form.dataset.geometry||'{}'); const state={status:$('mapEntityState').value.trim(),danger:$('mapEntityDanger').value};
      let data,error;
      if(form.dataset.mode==='edit')({data,error}=await aeriom.rpc('update_campaign_map_entity',{p_entity_id:form.dataset.entityId,p_name:name,p_description:desc||null,p_latitude:geo.latitude??null,p_longitude:geo.longitude??null,p_geometry:geo.geometry??null,p_state:state,p_metadata:{}}));
      else({data,error}=await aeriom.rpc('create_campaign_map_entity',{p_campaign_id:campaign.id,p_entity_type:type,p_name:name,p_description:desc||null,p_latitude:geo.latitude??null,p_longitude:geo.longitude??null,p_geometry:geo.geometry??null,p_state:state,p_metadata:{}}));
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data; if(form.dataset.mode==='edit'){entities=entities.map(x=>x.id===row.id?row:x);}else entities.push(row);
      renderEntities(); cancelEditor(); setEditorStatus('Elemento salvo no mapa.','success');
    }catch(error){setEditorStatus(error?.message||'Não foi possível salvar o elemento.','error');}finally{busy=false;}
  }

  async function deleteSelected(){
    const id=$('mapEditorForm')?.dataset.entityId; if(!id||busy)return; if(!confirm('Excluir este elemento do mapa?'))return; busy=true;
    try{const {error}=await aeriom.rpc('delete_campaign_map_entity',{p_entity_id:id});if(error)throw error;entities=entities.filter(x=>x.id!==id);renderEntities();cancelEditor();setEditorStatus('Elemento excluído.','success');}catch(error){setEditorStatus(error?.message||'Não foi possível excluir.','error');}finally{busy=false;}
  }

  async function loadEntities(){
    const {data,error}=await aeriom.rpc('list_campaign_map_entities',{p_campaign_id:campaign.id}); if(error)throw error; entities=Array.isArray(data)?data:[]; renderEntities();
  }

  function removeLayer(item){try{item?.remove();}catch{}}

  function renderEntities(){
    for(const layer of markers.values()) removeLayer(layer);
    markers.clear();
    entities.forEach(entity=>{
      const geom=entity.geometry||{}; let layer=null;
      if(geom.type==='polygon'&&Array.isArray(geom.coordinates)&&geom.coordinates.length>=2){layer=L.polygon(geom.coordinates,{color:'#d6b66c',fillColor:'#d6b66c',fillOpacity:.10,weight:2,dashArray:'7 6'}).addTo(map);}
      else if(geom.type==='polyline'&&Array.isArray(geom.coordinates)&&geom.coordinates.length>=2){layer=L.polyline(geom.coordinates,{color:'#63f6a8',weight:6,opacity:.75}).addTo(map);}
      else if(Number.isFinite(Number(entity.latitude))&&Number.isFinite(Number(entity.longitude))){layer=L.marker([entity.latitude,entity.longitude],{icon:makeEntityIcon(entity)}).addTo(map);}
      if(!layer)return;
      layer.bindPopup(`<strong>${esc(iconFor(entity.entity_type))} ${esc(entity.name)}</strong><br><span>${esc(labelFor(entity.entity_type))}</span>${entity.description?`<br><small>${esc(entity.description)}</small>`:''}`);
      layer.on('click',(ev)=>{if(ev?.originalEvent)L.DomEvent.stopPropagation(ev.originalEvent);openEditForm(entity);});
      markers.set(entity.id,layer);
    });
    const list=$('mapEditorEntities'); if(list){list.replaceChildren();entities.slice().reverse().forEach(entity=>{const b=document.createElement('button');b.type='button';b.className='map-editor-entity-row';b.innerHTML=`<span>${iconFor(entity.entity_type)}</span><span><strong>${esc(entity.name)}</strong><small>${esc(labelFor(entity.entity_type))}</small></span><b>→</b>`;b.addEventListener('click',()=>{openEditForm(entity);const geom=entity.geometry||{};if(Number.isFinite(Number(entity.latitude))&&Number.isFinite(Number(entity.longitude)))map.setView([entity.latitude,entity.longitude],Math.max(map.getZoom(),16),{animate:true});else if(Array.isArray(geom.coordinates)&&geom.coordinates.length)map.fitBounds(geom.coordinates,{padding:[40,40],animate:true});});list.appendChild(b);});}
  }

  function makeEntityIcon(entity){
    const icon=iconFor(entity.entity_type); const div=document.createElement('div'); div.className='afterlife-map-entity-marker'; div.innerHTML=`<span>${icon}</span><b>${esc(entity.name.slice(0,22))}</b>`; return L.divIcon({className:'afterlife-map-entity-wrap',html:div.outerHTML,iconSize:[86,38],iconAnchor:[43,38],popupAnchor:[0,-34]});
  }

  function bindMap(){ if(!map||map.__afterlifeEditorBound)return; map.__afterlifeEditorBound=true; map.on('click',onMapClick); }

  window.addEventListener('afterlife:map-ready',(event)=>bootReady(event.detail));
  if(window.__afterlifeCampaignMap?.map) bootReady(window.__afterlifeCampaignMap);
  document.addEventListener('DOMContentLoaded',()=>{bindMap(); if(window.__afterlifeCampaignMap?.map)bootReady(window.__afterlifeCampaignMap);});
})();
