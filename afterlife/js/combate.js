import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeCombatBooted) return;
  window.__afterlifeCombatBooted = true;
  const $=id=>document.getElementById(id);
  const qs=new URLSearchParams(location.search);
  const campaignId=()=>qs.get('campaign')||qs.get('id')||sessionStorage.getItem('afterlife_current_campaign_id')||'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const statusLabel={setup:'PREPARAÇÃO',active:'EM COMBATE',ended:'ENCERRADO'};
  let campaign=null,role='player',userId=null,combat=null,combatants=[],events=[],rewards=[],characters=[],busy=false,channel=null,detailChannel=null;
  const nameOf=id=>combatants.find(x=>x.id===id)?.display_name||'—';
  const actor=()=>combatants.find(x=>x.id===combat?.turn_combatant_id)||null;
  const myCombatants=()=>combatants.filter(x=>x.owner_user_id===userId&&!x.defeated_at);
  const currentOwn=()=>myCombatants().find(x=>x.id===combat?.turn_combatant_id)||null;

  function writeStatus(text){$('combatSubtitle').textContent=text;}
  function selectedActor(){return $('actorSelect')?.value||combat?.turn_combatant_id||'';}
  function selectedTarget(){return $('targetSelect')?.value||'';}
  function actionsFor(c){
    if(!c||c.defeated_at)return[];
    const s=c.action_state||{}; const list=[];
    if(s.main!==false){list.push(['basic_attack','👊 ATAQUE',true]);list.push(['ranged_attack','🎯 DISTÂNCIA',true]);list.push(['kick','🦵 CHUTE',true]);}
    if(s.quick!==false)list.push(['quick_strike','⚡ GOLPE RÁPIDO',true]);
    if(s.reaction!==false)list.push(['defend','◇ DEFENDER',false]);
    if(s.move!==false)list.push(['move','↗ MOVIMENTO',false]);
    const tech=Array.isArray(c.metadata?.techniques)?c.metadata.techniques:[];
    tech.forEach((t,i)=>{if(t&&typeof t==='object')list.push([`technique:${i}`,`✦ ${String(t.name||`Técnica ${i+1}`).slice(0,26)}`,true]);});
    return list;
  }

  async function loadCampaign(){
    const session=await ensureAfterlifeSession(); if(!session?.user)throw new Error('Sessão Afterlife não encontrada.'); userId=session.user.id;
    const id=campaignId(); if(!id)throw new Error('Campanha não definida.');
    const {data,error}=await aeriom.from('campaigns').select('id,name').eq('id',id).maybeSingle(); if(error)throw error; if(!data)throw new Error('Campanha não encontrada.'); campaign=data;
    const member=await aeriom.from('campaign_members').select('role').eq('campaign_id',id).eq('user_id',userId).maybeSingle(); if(member.error)throw member.error; if(!member.data)throw new Error('Você não participa desta campanha.'); role=member.data.role==='master'?'master':'player';
    sessionStorage.setItem('afterlife_current_campaign_id',id); $('combatTitle').textContent=campaign.name; $('combatCrumb').textContent=campaign.name; $('combatBack').href=`./campanha.html?campaign=${encodeURIComponent(id)}`; $('combatBackBtn').onclick=()=>location.href=`./campanha.html?campaign=${encodeURIComponent(id)}`;
  }
  async function loadCharacters(){if(role!=='master')return;const {data,error}=await aeriom.rpc('list_campaign_available_characters',{p_campaign_id:campaign.id});if(error)throw error;characters=data||[];$('characterSelect').innerHTML=characters.length?characters.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''):'<option value="">Nenhum personagem elegível</option>';}
  async function loadCombats(){const {data,error}=await aeriom.rpc('list_campaign_combats',{p_campaign_id:campaign.id,p_limit:15});if(error)throw error;combat=(data||[]).find(x=>x.status==='setup'||x.status==='active')||(data||[])[0]||null;if(combat)await loadCombatData();else render();}
  async function loadCombatData(){const [a,e,r]=await Promise.all([aeriom.rpc('list_campaign_combatants',{p_combat_id:combat.id}),aeriom.rpc('list_campaign_combat_events',{p_combat_id:combat.id,p_limit:100}),aeriom.rpc('list_campaign_combat_rewards',{p_combat_id:combat.id})]);if(a.error)throw a.error;if(e.error)throw e.error;if(r.error)throw r.error;combatants=a.data||[];events=(e.data||[]).reverse();rewards=r.data||[];render();}
  function renderState(){
    $('combatStatus').textContent=combat?statusLabel[combat.status]||combat.status:'SEM COMBATE';$('combatRound').textContent=combat?.status==='setup'?'—':String(combat?.round??'—');$('combatTurn').textContent=actor()?.display_name||'—';
    const card=$('turnCard');
    if(!combat)card.innerHTML='<div class="combat-empty"><strong>Nenhum combate ativo</strong><span>O Mestre pode criar um novo encontro.</span></div>';
    else if(combat.status==='setup')card.innerHTML='<div class="combat-empty"><strong>Combate em preparação</strong><span>Adicione os participantes e inicie a iniciativa.</span></div>';
    else {const a=actor();card.innerHTML=`<div class="combat-turn"><div><span>VEZ DE</span><strong>${esc(a?.display_name||'—')}</strong><small>${a?.entity_type==='character'?'Sobrevivente':'Ameaça'}</small></div><b>RODADA ${combat.round}</b></div>`;}
  }
  function renderRoster(){
    const host=$('combatRoster');host.replaceChildren();
    combatants.slice().sort((a,b)=>(Number(b.initiative_roll)-Number(a.initiative_roll))||(a.sort_order-b.sort_order)).forEach(c=>{const row=document.createElement('article');row.className='combatant-card';if(c.id===combat?.turn_combatant_id)row.classList.add('is-turn');if(c.defeated_at)row.classList.add('is-defeated');const hp=Math.max(0,Number(c.hp_current)||0),max=Math.max(1,Number(c.hp_max)||1),pct=Math.min(100,Math.round(hp/max*100));const actions=role==='master'?`<button data-remove="${esc(c.id)}" class="mini-btn">REMOVER</button>`:'';row.innerHTML=`<div class="combatant-card__top"><div><span>${c.entity_type==='character'?'SOBREVIVENTE':c.entity_type==='npc'?'NPC':'CRIATURA'}</span><strong>${esc(c.display_name)}</strong></div><b class="initiative">${combat?.status!=='setup'?c.initiative_roll:'—'}</b></div><div class="combatant-hp"><div><span>PV</span><strong>${hp}/${max}</strong></div><i><em style="width:${pct}%"></em></i></div><div class="combatant-meta"><span>DEF ${c.defense}</span><span>MOV ${c.movement}</span><span>${c.mana_max?`MANA ${c.mana_current}/${c.mana_max}`:'SEM MANA'}</span>${c.defeated_at?'<b>DERROTADO</b>':''}</div>${actions}`;host.appendChild(row);row.querySelector('[data-remove]')?.addEventListener('click',()=>removeCombatant(c.id));});
    bindTargetOptions();
  }
  function bindTargetOptions(){
    const target=$('targetSelect');if(!target)return;const prev=target.value;target.innerHTML='<option value="">Selecione o alvo</option>'+combatants.filter(c=>!c.defeated_at).map(c=>`<option value="${esc(c.id)}">${esc(c.display_name)}</option>`).join('');if(combatants.some(c=>c.id===prev&&!c.defeated_at))target.value=prev;else if(actor()&&target.value===actor().id)target.value='';
    const actorSel=$('actorSelect');if(!actorSel)return;const old=actorSel.value;actorSel.innerHTML=combatants.filter(c=>!c.defeated_at).map(c=>`<option value="${esc(c.id)}">${esc(c.display_name)}</option>`).join('');actorSel.value=combatants.some(c=>c.id===old&&!c.defeated_at)?old:(actor()?.id||'');
  }
  function renderActions(){
    const master=$('masterActionGrid'),player=$('playerActionGrid');
    const render=(host,c)=>{host.replaceChildren();if(!c){host.innerHTML='<span class="combat-hint">Nenhum atuante válido.</span>';return;}actionsFor(c).forEach(([key,label,needsTarget])=>{const b=document.createElement('button');b.type='button';b.className='combat-action';b.textContent=label;b.disabled=busy||c.defeated_at||(!isAllowed(c));b.onclick=()=>doAction(c.id,key,needsTarget?selectedTarget():null);host.appendChild(b);});};
    render(master,role==='master'?combatants.find(c=>c.id===selectedActor()):null);render(player,currentOwn());
    $('playerActionHint').textContent=currentOwn()?`É seu turno: ${currentOwn().display_name}. Escolha uma ação. Ações disponíveis são renovadas no próximo turno.`:'Aguardando seu turno.';
  }
  const isAllowed=c=>Boolean(c&&(role==='master'||(c.owner_user_id===userId&&c.id===combat?.turn_combatant_id)));
  function renderMaster(){
    $('masterSetup').hidden=role!=='master'||Boolean(combat&&combat.status!=='setup');$('masterActions').hidden=role!=='master'||!combat||combat.status!=='active';$('playerActions').hidden=role==='master'||!combat||combat.status!=='active';$('createCombat').hidden=role!=='master';
    if(role==='master')$('startCombat').disabled=!combatants.length||!combat||combat.status!=='setup';
    renderActions();
  }
  function renderLog(){const host=$('combatLog');host.replaceChildren();events.slice(-40).reverse().forEach(e=>{const p=e.payload||{};const text=e.event_type==='attack'?`${nameOf(e.actor_combatant_id)} atacou ${nameOf(e.target_combatant_id)} · ${p.total??'—'} vs DEF ${p.defense??'—'} · dano ${p.damage??0}${p.target_defeated?' · DERROTADO':''}`:e.event_type==='turn_started'?`Turno de ${nameOf(e.actor_combatant_id)}`:e.event_type==='combat_started'?'Combate iniciado.':e.event_type==='combat_ended'?'Combate encerrado.':e.event_type==='defend'?`${nameOf(e.actor_combatant_id)} preparou defesa +${p.defense_bonus||2}`:`${nameOf(e.actor_combatant_id)} usou ${e.action_key||e.event_type}`;const row=document.createElement('div');row.className='combat-log-row';row.innerHTML=`<span>R${e.round||0}</span><p>${esc(text)}</p>`;host.appendChild(row);});if(!host.children.length)host.innerHTML='<small>Nenhum evento ainda.</small>';}
  function renderRewards(){const host=$('combatRewards');host.replaceChildren();rewards.forEach(r=>{const killer=nameOf(r.killer_combatant_id),loot=Array.isArray(r.loot)?r.loot:[];const own=r.character_id&&combatants.find(c=>c.id===r.killer_combatant_id)?.owner_user_id===userId;const card=document.createElement('div');card.className='reward-card';card.innerHTML=`<div><strong>Último golpe: ${esc(killer)}</strong><span>XP recebido: ${r.xp_amount||0}</span></div><div class="reward-loot">${loot.length?loot.map(x=>`<span>${esc(x.name||'Item')} ×${Number(x.quantity||1)}</span>`).join(''):'Sem loot configurado'}</div>${own&&!r.loot_claimed?'<button class="combat-btn combat-btn--primary" data-claim>PEGAR LOOT</button>':r.loot_claimed?'<small>Loot coletado.</small>':''}`;host.appendChild(card);card.querySelector('[data-claim]')?.addEventListener('click',()=>claimLoot(r.id));});if(!host.children.length)host.innerHTML='<small>Nenhuma recompensa ainda.</small>';}
  function render(){renderState();renderRoster();renderMaster();renderLog();renderRewards();}

  async function createCombat(){if(busy||role!=='master')return;busy=true;writeStatus('Criando combate…');try{const {data,error}=await aeriom.rpc('create_campaign_combat',{p_campaign_id:campaign.id});if(error)throw error;combat=data;combatants=[];events=[];rewards=[];render();writeStatus('Combate criado. Adicione os participantes.');}catch(e){writeStatus(e?.message||'Não foi possível criar o combate.');}finally{busy=false;render();}}
  async function addCharacter(){if(busy||!combat)return;const id=$('characterSelect').value;if(!id)return;busy=true;try{const {data,error}=await aeriom.rpc('add_campaign_combat_character',{p_combat_id:combat.id,p_character_id:id});if(error)throw error;combatants.push(data);render();}catch(e){writeStatus(e?.message||'Não foi possível adicionar o personagem.');}finally{busy=false;}}
  async function addCreature(){if(busy||!combat)return;const name=$('creatureName').value.trim()||'Criatura',hp=Number($('creatureHp').value)||12,defense=Number($('creatureDefense').value)||10,movement=Number($('creatureMovement').value)||0,initiative=Math.max(4,Number($('creatureInitiative').value)||8);let meta={initiative_die:initiative};try{const extra=$('creatureMeta').value.trim();if(extra)meta={...meta,...JSON.parse(extra)};}catch{writeStatus('JSON de XP/Loot inválido.');return;}busy=true;try{const {data,error}=await aeriom.rpc('add_campaign_combat_creature',{p_combat_id:combat.id,p_name:name,p_hp_max:hp,p_defense:defense,p_movement:movement,p_metadata:meta});if(error)throw error;combatants.push(data);$('creatureName').value='';render();}catch(e){writeStatus(e?.message||'Não foi possível adicionar a criatura.');}finally{busy=false;}}
  async function startCombat(){if(busy||!combat)return;busy=true;try{const {data,error}=await aeriom.rpc('start_campaign_combat',{p_combat_id:combat.id});if(error)throw error;combat=data;await loadCombatData();writeStatus('Iniciativa definida. Combate iniciado.');}catch(e){writeStatus(e?.message||'Não foi possível iniciar o combate.');}finally{busy=false;render();}}
  async function doAction(actorId,key,targetId){if(busy||!combat||combat.status!=='active')return;if((key!=='move'&&key!=='defend')&&!targetId){writeStatus('Selecione um alvo.');return;}busy=true;try{const {data,error}=await aeriom.rpc('resolve_campaign_combat_action',{p_combat_id:combat.id,p_actor_id:actorId,p_target_id:targetId||null,p_action_key:key});if(error)throw error;await loadCombatData();const result=data||{};if(result.target_defeated)writeStatus(`${nameOf(actorId)} deu o último golpe em ${nameOf(targetId)}.`);else writeStatus(key==='move'?'Movimento usado.':key==='defend'?'Defesa preparada.':`Ação resolvida · ${result.damage??0} dano.`);}catch(e){writeStatus(e?.message||'Não foi possível resolver a ação.');}finally{busy=false;render();}}
  async function advanceTurn(){if(busy||!combat)return;busy=true;try{const {data,error}=await aeriom.rpc('advance_campaign_combat_turn',{p_combat_id:combat.id});if(error)throw error;combat=data;await loadCombatData();}catch(e){writeStatus(e?.message||'Não foi possível avançar o turno.');}finally{busy=false;render();}}
  async function endCombat(){if(busy||!combat||role!=='master')return;if(!confirm('Encerrar este combate?'))return;busy=true;try{const {data,error}=await aeriom.rpc('end_campaign_combat',{p_combat_id:combat.id});if(error)throw error;combat=data;await loadCombatData();writeStatus('Combate encerrado.');}catch(e){writeStatus(e?.message||'Não foi possível encerrar o combate.');}finally{busy=false;render();}}
  async function removeCombatant(id){if(busy)return;if(!confirm('Remover este participante do combate?'))return;busy=true;try{const {error}=await aeriom.rpc('remove_campaign_combatant',{p_combatant_id:id});if(error)throw error;combatants=combatants.filter(x=>x.id!==id);render();}catch(e){writeStatus(e?.message||'Não foi possível remover.');}finally{busy=false;}}
  async function claimLoot(id){if(busy)return;busy=true;try{const {error}=await aeriom.rpc('claim_campaign_combat_loot',{p_reward_id:id});if(error)throw error;await loadCombatData();writeStatus('Loot adicionado ao inventário.');}catch(e){writeStatus(e?.message||'Não foi possível coletar o loot.');}finally{busy=false;render();}}
  function subscribe(){if(!combat)return;channel=aeriom.channel(`afterlife-combat:${combat.id}`).on('postgres_changes',{event:'*',schema:'public',table:'campaign_combats',filter:`id=eq.${combat.id}`},()=>loadCombats().catch(()=>{})).subscribe();detailChannel=aeriom.channel(`afterlife-combat-detail:${combat.id}`).on('postgres_changes',{event:'*',schema:'public',table:'campaign_combatants',filter:`combat_id=eq.${combat.id}`},()=>loadCombatData().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'campaign_combat_events',filter:`combat_id=eq.${combat.id}`},()=>loadCombatData().catch(()=>{})).on('postgres_changes',{event:'*',schema:'public',table:'campaign_combat_rewards',filter:`combat_id=eq.${combat.id}`},()=>loadCombatData().catch(()=>{})).subscribe();}
  function bind(){
    $('createCombat').onclick=createCombat;$('addCharacter').onclick=addCharacter;$('addCreature').onclick=addCreature;$('startCombat').onclick=startCombat;$('advanceTurn').onclick=advanceTurn;$('endCombat').onclick=endCombat;$('actorSelect')?.addEventListener('change',renderActions);$('targetSelect')?.addEventListener('change',renderActions);
  }
  async function boot(){try{await loadCampaign();bind();await loadCharacters();await loadCombats();if(combat)subscribe();render();if(!combat&&role==='master')writeStatus('Nenhum combate criado para esta campanha.');else writeStatus(combat?'Combate sincronizado em tempo real.':'Aguardando o Mestre criar um combate.');}catch(e){console.error('[AFTERLIFE][COMBAT]',e);writeStatus(e?.message||'Não foi possível carregar o combate.');}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();