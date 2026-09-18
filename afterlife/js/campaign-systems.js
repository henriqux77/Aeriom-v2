import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260918-2';

(() => {
  'use strict';

  const id = () => {
    const q = new URLSearchParams(location.search);
    return q.get('campaign') || q.get('id') || sessionStorage.getItem('afterlife_current_campaign_id') || '';
  };

  let campaignId = id();
  let user = null;
  let role = 'player';
  let busy = false;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const $ = s => document.querySelector(s);

  function injectPanel(sectionId, html, emptyFallback) {
    const panel = document.getElementById(sectionId);
    if (!panel) return null;
    panel.innerHTML = html || emptyFallback;
    return panel;
  }

  function toast(msg, type='info') {
    const node = document.createElement('div');
    node.className = 'afterlife-system-toast';
    node.dataset.type = type;
    node.textContent = msg;
    document.body.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    setTimeout(() => { node.classList.remove('is-visible'); setTimeout(() => node.remove(), 200); }, 2800);
  }

  function closeModal() {
    document.getElementById('afterlifeSystemModalRoot')?.remove();
    document.body.classList.remove('afterlife-system-lock');
  }

  function modal(title, body) {
    closeModal();
    const root = document.createElement('div');
    root.id = 'afterlifeSystemModalRoot';
    root.innerHTML = '<div class="afterlife-system-backdrop" data-close></div><section class="afterlife-system-modal" role="dialog" aria-modal="true" aria-labelledby="afterlifeSystemModalTitle"><header><div><span>AFTERLIFE · SISTEMA</span><h2 id="afterlifeSystemModalTitle">'+esc(title)+'</h2></div><button type="button" class="afterlife-system-close" data-close>×</button></header><div class="afterlife-system-modal-body">'+body+'</div></section>';
    document.body.appendChild(root);
    document.body.classList.add('afterlife-system-lock');
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    root.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
    root.querySelector('input,textarea,select,button:not([data-close])')?.focus();
    return root;
  }

  function masterOnly() {
    return role === 'master';
  }

  async function init() {
    try {
      const session = await ensureAfterlifeSession();
      if(!session?.user) return;
      user = session.user;
      campaignId = id();
      if(!campaignId) return;
      const member = await aeriom.from('campaign_members').select('role').eq('campaign_id',campaignId).eq('user_id',user.id).maybeSingle();
      if(member.error) throw member.error;
      if(!member.data) return;
      role = member.data.role === 'master' ? 'master' : 'player';
      sessionStorage.setItem('afterlife_current_campaign_id', campaignId);

      await refresh();
      const channel = aeriom.channel('afterlife-campaign-systems:'+campaignId)
        .on('postgres_changes',{event:'*',schema:'public',table:'campaign_missions',filter:'campaign_id=eq.'+campaignId},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'campaign_diary_entries',filter:'campaign_id=eq.'+campaignId},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'campaign_factions',filter:'campaign_id=eq.'+campaignId},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'campaign_npcs',filter:'campaign_id=eq.'+campaignId},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'campaign_vehicles',filter:'campaign_id=eq.'+campaignId},refresh)
        .on('postgres_changes',{event:'*',schema:'public',table:'campaign_hordes',filter:'campaign_id=eq.'+campaignId},refresh)
        .subscribe();
      window.addEventListener('pagehide',()=>{try{aeriom.removeChannel(channel)}catch{}},{once:true});
    } catch(error) {
      console.warn('[AFTERLIFE][CAMPAIGN-SYSTEMS]',error);
    }
  }

  async function refresh() {
    const [snapshot,missions,diary,factions,npcs,vehicles,hordes,inventory] = await Promise.all([
      aeriom.rpc('get_campaign_system_snapshot',{p_campaign_id:campaignId}),
      aeriom.from('campaign_missions').select('id,title,description,status,priority,reward_xp,deadline,created_at,location_id').eq('campaign_id',campaignId).order('created_at',{ascending:false}).limit(20),
      aeriom.from('campaign_diary_entries').select('id,title,body,event_type,occurred_at,source_type').eq('campaign_id',campaignId).order('occurred_at',{ascending:false}).limit(16),
      aeriom.from('campaign_factions').select('id,name,faction_type,description,reputation_default,resources,territory').eq('campaign_id',campaignId).order('name'),
      aeriom.from('campaign_npcs').select('id,name,profession,status,faction_id,latitude,longitude').eq('campaign_id',campaignId).order('name').limit(20),
      aeriom.from('campaign_vehicles').select('id,name,vehicle_type,fuel_current,fuel_max,condition,speed_kmh,cargo_slots').eq('campaign_id',campaignId).order('name').limit(20),
      aeriom.from('campaign_hordes').select('id,name,size,speed_kmh,direction_deg,threat_level,mutant_count,detected,status,eta_minutes,latitude,longitude').eq('campaign_id',campaignId).order('updated_at',{ascending:false}).limit(20),
      aeriom.rpc('list_campaign_inventory',{p_campaign_id:campaignId})
    ]);
    [missions,diary,factions,npcs,vehicles,hordes].forEach(x=>{if(x.error) throw x.error});
    if(snapshot.error) throw snapshot.error;
    if(inventory.error) throw inventory.error;
    renderAll(snapshot.data||{},missions.data||[],diary.data||[],factions.data||[],npcs.data||[],vehicles.data||[],hordes.data||[],inventory.data||[]);
  }

  function renderAll(s,missions,diary,factions,npcs,vehicles,hordes,inventory) {
    const missionPanel = document.getElementById('missoes');
    if(missionPanel) {
      missionPanel.innerHTML = '<header><h2>MISSÕES</h2><div class="system-panel-head-actions"><span>'+esc(s.missions_active||0)+' ativas</span>'+(masterOnly()?'<button type="button" class="system-mini-action" data-create="mission">＋ NOVA</button>':'')+'</div></header><div class="system-list">'+(missions.length?missions.slice(0,8).map(m=>'<article class="system-row mission-row" data-mission-id="'+esc(m.id)+'"><div class="system-row-icon">◎</div><div class="system-row-main"><strong>'+esc(m.title)+'</strong><small>'+esc(m.description||'Sem descrição.')+'</small></div><span class="system-badge" data-status="'+esc(m.status)+'">'+esc(m.status)+'</span>'+(masterOnly()?'<button class="system-row-more" type="button" data-mission-status="'+esc(m.id)+'">•••</button>':'')+'</article>').join(''):'<div class="system-empty"><strong>Nenhuma missão registrada</strong><small>O Mestre pode criar o primeiro objetivo da campanha.</small></div>')+'</div>';
    }

    const diaryPanel = document.getElementById('diario');
    if(diaryPanel) {
      diaryPanel.innerHTML = '<header><h2>DIÁRIO</h2><div class="system-panel-head-actions"><span>'+esc(s.diary_entries||0)+' registros</span><button type="button" class="system-mini-action" data-create="diary">＋ REGISTRAR</button></div></header><div class="system-timeline">'+(diary.length?diary.slice(0,10).map(e=>'<article class="timeline-row"><time>'+new Date(e.occurred_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</time><div><strong>'+esc(e.title)+'</strong><p>'+esc(e.body||'')+'</p><small>'+esc(e.event_type||'registro')+'</small></div></article>').join(''):'<div class="system-empty"><strong>Diário vazio</strong><small>Registre acontecimentos ou deixe o motor gerar eventos automaticamente.</small></div>')+'</div>';
    }

    const inventoryPanel = document.getElementById('inventario');
    if(inventoryPanel) {
      const total = inventory.reduce((sum,x)=>sum+Number(x.quantity||0),0);
      inventoryPanel.innerHTML = '<header><h2>INVENTÁRIO</h2><span>'+esc(total)+' itens</span></header><div class="system-list compact">'+(inventory.length?inventory.slice(0,14).map(i=>'<article class="system-row"><div class="system-row-icon">▣</div><div class="system-row-main"><strong>'+esc(i.item_name)+'</strong><small>'+esc(i.character_name)+' · '+esc(i.category||'item')+'</small></div><b class="system-quantity">×'+Number(i.quantity||1)+'</b></article>').join(''):'<div class="system-empty"><strong>Nenhum item ainda</strong><small>Loot, recompensa e craft passam a alimentar este inventário real.</small></div>')+'</div>';
    }

    ensureSystemsPanel().innerHTML = [
      '<div class="campaign-systems-grid">',
      systemCard('🏴','FACÇÕES',s.factions||factions.length,factions.slice(0,4).map(f=>f.name),masterOnly()?'faction':null),
      systemCard('👤','NPCs',s.npcs||npcs.length,npcs.slice(0,4).map(n=>n.name+(n.profession?' · '+n.profession:'')),masterOnly()?'npc':null),
      systemCard('🚙','VEÍCULOS',s.vehicles||vehicles.length,vehicles.slice(0,4).map(v=>v.name+' · '+Math.round(Number(v.condition||0))+'%'),masterOnly()?'vehicle':null),
      systemCard('☢','RADAR DE HORDAS',s.hordes_active||hordes.length,hordes.slice(0,4).map(h=>h.name+' · '+h.size+' zumbis · ameaça '+h.threat_level),masterOnly()?'horde':null),
      '</div>'
    ].join('');

    bindCreateButtons();
    bindMissionStatus();
    bindManageButtons();
  }

  function systemCard(icon,title,count,items,createType) {
    return '<section class="campaign-system-card"><header><div><span>'+icon+'</span><div><small>SISTEMA</small><strong>'+title+'</strong></div></div><b>'+Number(count||0)+'</b></header><div class="campaign-system-card-list">'+(items.length?items.map(x=>'<span>'+esc(x)+'</span>').join(''):'<span class="muted">Nenhum registrado.</span>')+'</div>'+(createType?'<div class="system-card-actions"><button type="button" class="system-card-action" data-create="'+createType+'">＋ ADICIONAR</button><button type="button" class="system-card-action" data-manage="'+createType+'">GERENCIAR</button></div>':'')+'</section>';
  }

  function ensureSystemsPanel() {
    let panel = document.getElementById('campaignSystemsRuntime');
    if(panel) return panel;
    panel = document.createElement('section');
    panel.id='campaignSystemsRuntime';
    panel.className='campaign-systems-runtime';
    const anchor=document.querySelector('.empty-tools-grid');
    anchor?.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function bindCreateButtons() {
    document.querySelectorAll('[data-create]').forEach(b=>{
      if(b.dataset.bound==='1')return;
      b.dataset.bound='1';
      b.addEventListener('click',()=>openCreate(b.dataset.create));
    });
  }

  function bindMissionStatus() {
    document.querySelectorAll('[data-mission-status]').forEach(b=>{
      if(b.dataset.bound==='1')return;
      b.dataset.bound='1';
      b.addEventListener('click',()=>openMissionStatus(b.dataset.missionStatus));
    });
  }

  function bindManageButtons() {
    document.querySelectorAll('[data-manage]').forEach(b=>{
      if(b.dataset.bound==='1')return;
      b.dataset.bound='1';
      b.addEventListener('click',()=>openManage(b.dataset.manage));
    });
  }

  function openManage(type) {
    if(type==='faction') return openFactionManager();
    if(type==='vehicle') return openVehicleManager();
    if(type==='npc') return toast('O editor de NPC está disponível pela ação ADICIONAR; edição avançada fica no próximo painel.');
    if(type==='horde') return toast('Use o radar do mapa para movimentar e atualizar as ondas.');
  }

  function openCreate(type) {
    if(type==='mission') return openMissionForm();
    if(type==='diary') return openDiaryForm();
    if(type==='faction') return openFactionForm();
    if(type==='npc') return openNpcForm();
    if(type==='vehicle') return openVehicleForm();
    if(type==='horde') return openHordeForm();
  }

  function formShell(fields,submitLabel) {
    return '<form class="afterlife-system-form" id="systemCreateForm">'+fields.join('')+'<div class="afterlife-system-form-actions"><button type="button" class="system-secondary" data-close>CANCELAR</button><button type="submit" class="system-primary">'+submitLabel+'</button></div></form>';
  }

  function field(label,id,type='text',extra='') {
    return '<label><span>'+label+'</span><input id="'+id+'" type="'+type+'" '+extra+'></label>';
  }

  function openMissionForm() {
    const root=modal('Nova missão',formShell([
      field('TÍTULO','sysTitle','text','maxlength="160" required'),
      '<label><span>DESCRIÇÃO</span><textarea id="sysDescription" maxlength="600" rows="4"></textarea></label>',
      '<div class="afterlife-system-two">'+field('PRIORIDADE','sysPriority','text','value="normal"')+field('XP','sysXp','number','min="0" value="0"')+'</div>'
    ],'CRIAR MISSÃO'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('create_campaign_mission',{p_campaign_id:campaignId,p_title:$('#sysTitle').value.trim(),p_description:$('#sysDescription').value.trim(),p_priority:$('#sysPriority').value.trim()||'normal',p_location_id:null,p_reward_xp:Number($('#sysXp').value)||0}),'Missão criada.');
    });
  }

  function openDiaryForm() {
    const root=modal('Registrar no diário',formShell([
      field('TÍTULO','sysTitle','text','maxlength="180" required'),
      '<label><span>RELATO</span><textarea id="sysDescription" maxlength="1500" rows="7"></textarea></label>',
      field('TIPO','sysPriority','text','value="note" maxlength="40"')
    ],'REGISTRAR'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('append_campaign_diary_entry',{p_campaign_id:campaignId,p_title:$('#sysTitle').value.trim(),p_body:$('#sysDescription').value.trim(),p_event_type:$('#sysPriority').value.trim()||'note',p_occurred_at:new Date().toISOString(),p_source_type:null,p_source_id:null,p_metadata:{}}),'Registro adicionado.');
    });
  }

  function openFactionForm() {
    const root=modal('Nova facção',formShell([
      field('NOME','sysTitle','text','maxlength="120" required'),
      field('TIPO','sysType','text','value="survivors" maxlength="40"'),
      '<label><span>DESCRIÇÃO</span><textarea id="sysDescription" maxlength="600" rows="5"></textarea></label>'
    ],'CRIAR FACÇÃO'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('create_campaign_faction',{p_campaign_id:campaignId,p_name:$('#sysTitle').value.trim(),p_type:$('#sysType').value.trim()||'survivors',p_description:$('#sysDescription').value.trim()}),'Facção criada.');
    });
  }

  function openNpcForm() {
    const root=modal('Novo NPC',formShell([
      field('NOME','sysTitle','text','maxlength="120" required'),
      field('PROFISSÃO','sysType','text','maxlength="80"'),
      '<div class="afterlife-system-two">'+field('LATITUDE','sysLat','number','step="any" value=""')+field('LONGITUDE','sysLng','number','step="any" value=""')+'</div>'
    ],'CRIAR NPC'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('create_campaign_npc',{p_campaign_id:campaignId,p_name:$('#sysTitle').value.trim(),p_profession:$('#sysType').value.trim()||null,p_faction_id:null,p_latitude:$('#sysLat').value===''?null:Number($('#sysLat').value),p_longitude:$('#sysLng').value===''?null:Number($('#sysLng').value),p_metadata:{}}),'NPC criado.');
    });
  }

  function openVehicleForm() {
    const root=modal('Novo veículo',formShell([
      field('NOME','sysTitle','text','maxlength="120" required'),
      field('TIPO','sysType','text','value="car" maxlength="50"'),
      '<div class="afterlife-system-two">'+field('COMBUSTÍVEL MÁX.','sysFuel','number','min="0" step="0.1" value="60"')+field('VELOCIDADE','sysSpeed','number','min="0" value="60"')+'</div>',
      field('CAPACIDADE DE CARGA','sysCargo','number','min="0" value="10"')
    ],'CRIAR VEÍCULO'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('create_campaign_vehicle',{p_campaign_id:campaignId,p_name:$('#sysTitle').value.trim(),p_vehicle_type:$('#sysType').value.trim()||'car',p_fuel_max:Number($('#sysFuel').value)||0,p_speed_kmh:Number($('#sysSpeed').value)||0,p_cargo_slots:Number($('#sysCargo').value)||0,p_latitude:null,p_longitude:null}),'Veículo criado.');
    });
  }

  function openHordeForm() {
    const mapApi=window.__afterlifeCampaignMap;
    const center=mapApi?.map?.getCenter?.();
    const root=modal('Nova onda de zumbis',formShell([
      field('NOME','sysTitle','text','maxlength="120" value="Onda detectada" required'),
      '<div class="afterlife-system-two">'+field('LATITUDE','sysLat','number','step="any" value="'+(center?.lat?.toFixed?.(5)||'')+'" required')+field('LONGITUDE','sysLng','number','step="any" value="'+(center?.lng?.toFixed?.(5)||'')+'" required')+'</div>',
      '<div class="afterlife-system-two">'+field('QUANTIDADE','sysSize','number','min="1" value="30"')+field('VELOCIDADE KM/H','sysSpeed','number','min="0" value="12"')+'</div>',
      field('DIREÇÃO (°)','sysDir','number','min="0" max="359" value="45"')
    ],'CRIAR HORDA'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('create_campaign_horde',{p_campaign_id:campaignId,p_latitude:Number($('#sysLat').value),p_longitude:Number($('#sysLng').value),p_size:Number($('#sysSize').value)||30,p_speed_kmh:Number($('#sysSpeed').value)||12,p_direction_deg:Number($('#sysDir').value)||0,p_source_zone_id:null}),'Horda criada no radar.');
    });
  }

  function openMissionStatus(missionId) {
    const root=modal('Estado da missão',formShell([
      '<label><span>NOVO ESTADO</span><select id="sysStatus"><option value="active">Ativa</option><option value="paused">Pausada</option><option value="completed">Concluída</option><option value="failed">Falhou</option><option value="cancelled">Cancelada</option></select></label>'
    ],'ATUALIZAR'));
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); await run(async()=>aeriom.rpc('update_campaign_mission_status',{p_id:missionId,p_status:$('#sysStatus').value}),'Missão atualizada.');
    });
  }

  async function openFactionManager() {
    try {
      const [factions,chars] = await Promise.all([
        aeriom.from('campaign_factions').select('id,name,faction_type,description,reputation_default').eq('campaign_id',campaignId).order('name'),
        aeriom.rpc('list_campaign_character_summaries',{p_campaign_id:campaignId})
      ]);
      if(factions.error)throw factions.error;if(chars.error)throw chars.error;
      const fs=factions.data||[], cs=chars.data||[];
      const options=fs.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+'</option>').join('');
      const root=modal('Gerenciar facções',
        '<form class="afterlife-system-form" id="factionManagerForm">'+
        '<label><span>FACÇÃO</span><select id="factionPick">'+options+'</select></label>'+
        '<div id="factionManagerContent" class="system-manager-content"><small>Selecione uma facção.</small></div>'+
        '<div class="afterlife-system-two">'+
        '<label><span>MEMBRO</span><select id="factionCharacter">'+cs.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('')+'</select></label>'+
        '<label><span>POSTO</span><input id="factionRank" value="member" maxlength="40"></label></div>'+
        '<div class="afterlife-system-two">'+
        '<label><span>RELAÇÃO COM</span><select id="relationTarget">'+options+'</select></label>'+
        '<label><span>RELAÇÃO</span><select id="relationType"><option value="allied">Aliada</option><option value="friendly">Amigável</option><option value="neutral" selected>Neutra</option><option value="hostile">Hostil</option><option value="war">Guerra</option></select></label></div>'+
        '<div class="afterlife-system-form-actions"><button type="button" class="system-secondary" data-close>FECHAR</button><button type="submit" class="system-primary">APLICAR</button></div></form>'
      );
      const refreshFaction=async()=>{
        const pick=$('#factionPick').value;
        const [members,relations]=await Promise.all([
          aeriom.from('campaign_faction_members').select('id,character_id,user_id,npc_id,rank,reputation,status,characters(name)').eq('faction_id',pick).order('rank'),
          aeriom.from('campaign_faction_relations').select('target_faction_id,relation_type,reputation').eq('faction_id',pick)
        ]);
        if(members.error)throw members.error;if(relations.error)throw relations.error;
        $('#factionManagerContent').innerHTML=
          '<div class="system-manager-block"><strong>MEMBROS</strong>'+(members.data?.length?members.data.map(m=>'<div><span>'+esc(m.characters?.name||'NPC/Usuário')+'</span><small>'+esc(m.rank)+' · reputação '+Number(m.reputation||0)+'</small></div>').join(''):'<em>Nenhum membro.</em>')+'</div>'+
          '<div class="system-manager-block"><strong>RELAÇÕES</strong>'+(relations.data?.length?relations.data.map(r=>'<div><span>'+esc(fs.find(f=>f.id===r.target_faction_id)?.name||'Facção')+'</span><small>'+esc(r.relation_type)+' · '+Number(r.reputation||0)+'</small></div>').join(''):'<em>Nenhuma relação.</em>')+'</div>';
      };
      $('#factionPick').addEventListener('change',()=>refreshFaction().catch(()=>{}));
      await refreshFaction();
      root.querySelector('form').addEventListener('submit',async e=>{
        e.preventDefault();
        if(busy)return;
        busy=true;
        try{
          const faction=$('#factionPick').value,target=$('#relationTarget').value;
          if(faction && $('#factionCharacter').value){
            const mr=await aeriom.rpc('add_campaign_faction_character',{p_faction_id:faction,p_character_id:$('#factionCharacter').value,p_rank:$('#factionRank').value.trim()||'member'});
            if(mr.error)throw mr.error;
          }
          if(faction && target && target!==faction){
            const rr=await aeriom.rpc('set_campaign_faction_relation',{p_campaign_id:campaignId,p_faction_id:faction,p_target_faction_id:target,p_relation_type:$('#relationType').value,p_reputation:0});
            if(rr.error)throw rr.error;
          }
          closeModal();toast('Facção atualizada.','success');await refresh();
        }catch(error){toast(error?.message||'Não foi possível atualizar a facção.','error')}finally{busy=false}
      });
    }catch(error){toast(error?.message||'Não foi possível abrir as facções.','error')}
  }

  async function openVehicleManager() {
    try{
      const {data,error}=await aeriom.from('campaign_vehicles').select('id,name,vehicle_type,fuel_current,fuel_max,condition,speed_kmh,cargo_slots').eq('campaign_id',campaignId).order('name');
      if(error)throw error;
      const vehicles=data||[];
      const options=vehicles.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.name)+'</option>').join('');
      const root=modal('Gerenciar veículos',
        '<form class="afterlife-system-form" id="vehicleManagerForm">'+
        '<label><span>VEÍCULO</span><select id="vehiclePick">'+options+'</select></label>'+
        '<div id="vehicleManagerContent" class="system-manager-content"><small>Selecione um veículo.</small></div>'+
        '<div class="afterlife-system-two"><label><span>PEÇA</span><input id="vehiclePartType" maxlength="50" placeholder="motor"></label><label><span>NOME</span><input id="vehiclePartName" maxlength="120" placeholder="Motor revisado"></label></div>'+
        '<div class="afterlife-system-two"><label><span>UPGRADE</span><input id="vehicleUpgradeName" maxlength="120" placeholder="Blindagem"></label><label><span>TIPO</span><input id="vehicleUpgradeType" maxlength="60" placeholder="armor"></label></div>'+
        '<div class="afterlife-system-form-actions"><button type="button" class="system-secondary" data-close>FECHAR</button><button type="submit" class="system-primary">APLICAR</button></div></form>'
      );
      const refreshVehicle=async()=>{
        const vid=$('#vehiclePick').value;
        const [parts,upgrades]=await Promise.all([
          aeriom.from('vehicle_parts').select('part_type,name,durability').eq('vehicle_id',vid),
          aeriom.from('vehicle_upgrades').select('name,upgrade_type,level').eq('vehicle_id',vid)
        ]);
        if(parts.error)throw parts.error;if(upgrades.error)throw upgrades.error;
        $('#vehicleManagerContent').innerHTML='<div class="system-manager-block"><strong>PEÇAS</strong>'+(parts.data?.length?parts.data.map(p=>'<div><span>'+esc(p.name)+'</span><small>'+esc(p.part_type)+' · '+Number(p.durability||0)+'%</small></div>').join(''):'<em>Nenhuma peça.</em>')+'</div><div class="system-manager-block"><strong>UPGRADES</strong>'+(upgrades.data?.length?upgrades.data.map(u=>'<div><span>'+esc(u.name)+'</span><small>'+esc(u.upgrade_type)+' · nível '+Number(u.level||1)+'</small></div>').join(''):'<em>Nenhum upgrade.</em>')+'</div>';
      };
      $('#vehiclePick').addEventListener('change',()=>refreshVehicle().catch(()=>{}));await refreshVehicle();
      root.querySelector('form').addEventListener('submit',async e=>{
        e.preventDefault();if(busy)return;busy=true;
        try{
          const vid=$('#vehiclePick').value;
          if($('#vehiclePartType').value.trim()&&$('#vehiclePartName').value.trim()){
            const pr=await aeriom.rpc('add_vehicle_part',{p_vehicle_id:vid,p_part_type:$('#vehiclePartType').value.trim(),p_name:$('#vehiclePartName').value.trim(),p_durability:100,p_metadata:{}});
            if(pr.error)throw pr.error;
          }
          if($('#vehicleUpgradeName').value.trim()&&$('#vehicleUpgradeType').value.trim()){
            const ur=await aeriom.rpc('install_vehicle_upgrade',{p_vehicle_id:vid,p_name:$('#vehicleUpgradeName').value.trim(),p_upgrade_type:$('#vehicleUpgradeType').value.trim(),p_level:1,p_effects:{}});
            if(ur.error)throw ur.error;
          }
          closeModal();toast('Veículo atualizado.','success');await refresh();
        }catch(error){toast(error?.message||'Não foi possível atualizar o veículo.','error')}finally{busy=false}
      });
    }catch(error){toast(error?.message||'Não foi possível abrir os veículos.','error')}
  }

  async function run(action,success) {
    if(busy)return;
    busy=true;
    try {
      const r=await action();
      if(r.error)throw r.error;
      closeModal();
      toast(success,'success');
      await refresh();
    } catch(error) {
      console.error('[AFTERLIFE][CAMPAIGN-SYSTEMS]',error);
      toast(error?.message||'Não foi possível concluir a ação.','error');
    } finally { busy=false; }
  }

  window.addEventListener('afterlife:campaign-updated',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
