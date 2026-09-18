import { aeriom, afterlifeReady } from './aeriom-client.js?v=20260918-1';

(() => {
  'use strict';

  const grid = document.getElementById('charactersGrid');
  if(!grid) return;

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let activeCharacter = null;
  let modalRoot = null;
  let busy = false;

  function toast(message,type='info'){
    const n=document.createElement('div');n.className='character-system-toast';n.dataset.type=type;n.textContent=message;document.body.appendChild(n);
    requestAnimationFrame(()=>n.classList.add('is-visible'));
    setTimeout(()=>{n.classList.remove('is-visible');setTimeout(()=>n.remove(),180)},2600);
  }

  function closeModal(){
    modalRoot?.remove();modalRoot=null;document.body.classList.remove('character-system-lock');activeCharacter=null;
  }

  function openModal(title,body){
    closeModal();
    modalRoot=document.createElement('div');
    modalRoot.className='character-system-root';
    modalRoot.innerHTML='<div class="character-system-backdrop" data-close></div><section class="character-system-modal" role="dialog" aria-modal="true" aria-labelledby="characterSystemTitle"><header><div><span>AFTERLIFE · SOBREVIVENTE</span><h2 id="characterSystemTitle">'+esc(title)+'</h2></div><button type="button" class="character-system-close" data-close>×</button></header><div class="character-system-body">'+body+'</div></section>';
    document.body.appendChild(modalRoot);document.body.classList.add('character-system-lock');
    modalRoot.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
    modalRoot.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
    return modalRoot;
  }

  function addCardActions(){
    grid.querySelectorAll('.character-card').forEach(card=>{
      if(card.dataset.systemActions==='1') return;
      const id=card.dataset.characterId;if(!id)return;
      card.dataset.systemActions='1';
      const body=card.querySelector('.character-body');if(!body)return;
      const actions=document.createElement('div');
      actions.className='character-system-actions';
      actions.innerHTML='<button type="button" data-character-system="inventory" data-character-id="'+esc(id)+'">▣ INVENTÁRIO</button><button type="button" data-character-system="survival" data-character-id="'+esc(id)+'">♥ SOBREVIVÊNCIA</button>';
      body.appendChild(actions);
    });
  }

  async function getCharacter(id){
    const {data,error}=await aeriom.from('characters').select('id,name,class,hp_current,hp_max,defense,movement,inventory,equipment,campaign_id').eq('id',id).maybeSingle();
    if(error)throw error;if(!data)throw new Error('Personagem não encontrado.');return data;
  }

  async function openInventory(id){
    busy=true;
    try{
      activeCharacter=await getCharacter(id);
      const [items,summary,eq,recipes,materials] = await Promise.all([
        aeriom.from('character_inventory').select('id,item_template_id,quantity,custom_name,slot_index,durability_current,durability_max,metadata,item_templates(name,category,rarity,weight_kg,item_type)').eq('character_id',id).order('acquired_at'),
        aeriom.rpc('get_character_inventory_summary',{p_character_id:id}),
        aeriom.from('character_equipment').select('id,inventory_id,slot_key,metadata').eq('character_id',id).order('slot_key'),
        aeriom.from('crafting_recipes').select('id,name,output_quantity,station_type,description,output_item_template_id').eq('enabled',true).order('name').limit(30),
        aeriom.from('crafting_recipe_materials').select('recipe_id,quantity,item_template_id,item_templates(name)').limit(120)
      ]);
      if(items.error)throw items.error;if(summary.error)throw summary.error;if(eq.error)throw eq.error;if(recipes.error)throw recipes.error;if(materials.error)throw materials.error;
      const s=summary.data||{};
      const equipment=eq.data||[];
      const itemRows=items.data||[];
      const recipeRows=recipes.data||[];
      const materialRows=materials.data||[];

      const root=openModal('Inventário · '+activeCharacter.name,
        '<div class="character-system-capacity"><div><span>CAPACIDADE</span><strong>'+Number(s.slots_used||0)+' / '+Number(s.slots_max||0)+' slots</strong></div><div><span>PESO</span><strong>'+Number(s.weight_used_kg||0)+' / '+Number(s.weight_max_kg||0)+' kg</strong></div><b data-state="'+esc(s.state||'normal')+'">'+esc(s.state||'normal').toUpperCase()+'</b></div>'+
        '<section class="character-system-section"><header><span>ITENS</span><b>'+itemRows.length+' pilhas</b></header><div class="character-system-list">'+(itemRows.length?itemRows.map(i=>'<article class="character-system-item"><div><strong>'+esc(i.custom_name||i.item_templates?.name||'Item')+'</strong><small>'+esc(i.item_templates?.category||'item')+' · '+esc(i.item_templates?.rarity||'common')+' · '+Number(i.item_templates?.weight_kg||0)+' kg</small></div><b>×'+Number(i.quantity||1)+'</b><div class="character-system-item-actions"><button type="button" data-inv-remove="'+esc(i.id)+'">USAR/REMOVER</button><button type="button" data-inv-equip="'+esc(i.id)+'">EQUIPAR</button></div></article>').join(''):'<div class="character-system-empty">Nenhum item. O loot e as recompensas passam a entrar aqui.</div>')+'</div></section>'+
        '<section class="character-system-section"><header><span>EQUIPAMENTO</span><b>'+equipment.length+' slots</b></header><div class="character-system-eq">'+(equipment.length?equipment.map(e=>'<div><strong>'+esc(e.slot_key)+'</strong><span>Inventário '+esc(e.inventory_id.slice(0,8))+'…</span><button type="button" data-eq-remove="'+esc(e.slot_key)+'">DESEQUIPAR</button></div>').join(''):'<div class="character-system-empty">Nada equipado.</div>')+'</div></section>'+
        '<section class="character-system-section"><header><span>CRAFT</span><b>'+recipeRows.length+' receitas</b></header><div class="character-system-recipes">'+(recipeRows.length?recipeRows.map(r=>{const mats=materialRows.filter(m=>m.recipe_id===r.id).map(m=>Number(m.quantity)+'× '+(m.item_templates?.name||'material')).join(' · ');return '<article><div><strong>'+esc(r.name)+'</strong><small>'+esc(mats||'Sem materiais configurados')+'</small></div><button type="button" data-craft="'+esc(r.id)+'">CRIAR ×'+Number(r.output_quantity||1)+'</button></article>'}).join(''):'<div class="character-system-empty">Nenhuma receita disponível.</div>')+'</div></section>'
      );

      root.querySelectorAll('[data-inv-remove]').forEach(b=>b.addEventListener('click',()=>removeItem(b.dataset.invRemove,1)));
      root.querySelectorAll('[data-inv-equip]').forEach(b=>b.addEventListener('click',()=>equipItem(b.dataset.invEquip)));
      root.querySelectorAll('[data-eq-remove]').forEach(b=>b.addEventListener('click',()=>unequipItem(b.dataset.eqRemove)));
      root.querySelectorAll('[data-craft]').forEach(b=>b.addEventListener('click',()=>craft(b.dataset.craft)));
      root.querySelector('input,button')?.focus();
    }catch(error){toast(error?.message||'Não foi possível abrir o inventário.','error')}
    finally{busy=false}
  }

  async function removeItem(id,qty){
    if(busy)return;busy=true;try{const r=await aeriom.rpc('remove_character_inventory_item',{p_inventory_id:id,p_quantity:qty});if(r.error)throw r.error;toast('Item removido.','success');await openInventory(activeCharacter.id)}catch(e){toast(e?.message||'Não foi possível remover o item.','error')}finally{busy=false}
  }

  async function equipItem(id){
    const slots=['primary','secondary','head','body','armor','backpack','utility'];
    const slot=window.prompt('Slot de equipamento: '+slots.join(', '),'primary');
    if(!slot)return;
    if(!slots.includes(slot))return toast('Slot inválido.','error');
    try{const r=await aeriom.rpc('equip_character_item',{p_inventory_id:id,p_slot_key:slot});if(r.error)throw r.error;toast('Item equipado.','success');await openInventory(activeCharacter.id)}catch(e){toast(e?.message||'Não foi possível equipar.','error')}
  }

  async function unequipItem(slot){
    try{const r=await aeriom.rpc('unequip_character_item',{p_character_id:activeCharacter.id,p_slot_key:slot});if(r.error)throw r.error;toast('Item desequipado.','success');await openInventory(activeCharacter.id)}catch(e){toast(e?.message||'Não foi possível desequipar.','error')}
  }

  async function craft(recipeId){
    if(busy)return;busy=true;
    try{const r=await aeriom.rpc('craft_recipe',{p_recipe_id:recipeId,p_character_id:activeCharacter.id,p_quantity:1,p_station_id:null});if(r.error)throw r.error;toast('Item fabricado e adicionado ao inventário.','success');await openInventory(activeCharacter.id)}catch(e){toast(e?.message||'Não foi possível fabricar.','error')}finally{busy=false}
  }

  async function openSurvival(id){
    busy=true;
    try{
      activeCharacter=await getCharacter(id);
      const [{data:survival,error:sErr},{data:injuries,error:iErr}]=await Promise.all([
        aeriom.from('character_survival').select('*').eq('character_id',id).maybeSingle(),
        aeriom.from('character_injuries').select('id,injury_type,body_part,severity,bleeding,pain,infected,treated,status,notes,created_at').eq('character_id',id).eq('status','active').order('created_at',{ascending:false})
      ]);
      if(sErr)throw sErr;if(iErr)throw iErr;
      const s=survival||{hunger:100,thirst:100,fatigue:0,stress:0,temperature:37,contamination:0};
      const meter=(label,value,min,max,unit,goodHigh)=>'<div class="survival-meter"><div><span>'+label+'</span><strong>'+Number(value).toFixed(label==='TEMPERATURA'?1:0)+unit+'</strong></div><i><em data-meter="'+label+'" style="width:'+Math.max(0,Math.min(100,goodHigh?value:100-value))+'%"></em></i></div>';
      const root=openModal('Sobrevivência · '+activeCharacter.name,
        '<div class="survival-grid">'+meter('FOME',s.hunger,0,100,'% ',true)+meter('SEDE',s.thirst,0,100,'% ',true)+meter('FADIGA',s.fatigue,0,100,'% ',false)+meter('ESTRESSE',s.stress,0,100,'% ',false)+meter('TEMPERATURA',s.temperature,25,45,'°C',false)+meter('CONTAMINAÇÃO',s.contamination,0,100,'% ',false)+'</div>'+
        '<div class="survival-quick-actions"><button data-survival="food">🍖 COMER</button><button data-survival="water">💧 BEBER</button><button data-survival="rest">🛏 DESCANSAR</button><button data-survival="calm">◌ ACALMAR</button><button data-survival="clean">☣ DESCONTAMINAR</button></div>'+
        '<section class="character-system-section"><header><span>FERIMENTOS</span><b>'+injuries.length+' ativos</b></header><div class="character-system-eq">'+(injuries.length?injuries.map(i=>'<div><strong>'+esc(i.injury_type)+' · '+esc(i.body_part||'corpo')+'</strong><span>gravidade '+Number(i.severity)+'/5 · dor '+Number(i.pain)+'</span><small>'+esc(i.notes||'')+'</small></div>').join(''):'<div class="character-system-empty">Nenhum ferimento ativo.</div>')+'</div></section>'+
        '<section class="character-system-section"><header><span>NOVO FERIMENTO</span></header><form id="characterInjuryForm" class="character-system-form">'+
        '<label><span>TIPO</span><input id="injuryType" maxlength="120" required placeholder="Ex.: fratura"></label><label><span>PARTE DO CORPO</span><input id="injuryBody" maxlength="80" placeholder="Ex.: braço esquerdo"></label>'+
        '<div class="character-system-two"><label><span>GRAVIDADE</span><input id="injurySeverity" type="number" min="1" max="5" value="1"></label><label><span>DOR</span><input id="injuryPain" type="number" min="0" max="100" value="10"></label></div>'+
        '<button class="character-system-primary" type="submit">REGISTRAR FERIMENTO</button></form></section>'
      );
      root.querySelectorAll('[data-survival]').forEach(b=>b.addEventListener('click',()=>applySurvival(b.dataset.survival)));
      root.querySelector('#characterInjuryForm')?.addEventListener('submit',addInjury);
    }catch(e){toast(e?.message||'Não foi possível abrir sobrevivência.','error')}
    finally{busy=false}
  }

  async function applySurvival(type){
    const delta={food:[20,0,-2,0,null,0],water:[0,25,-1,0,null,0],rest:[0,0,-25,-5,null,0],calm:[0,0,0,-20,null,0],clean:[0,0,0,0,null,-15]}[type];
    if(!delta)return;
    try{const r=await aeriom.rpc('advance_character_survival',{p_character_id:activeCharacter.id,p_hunger_delta:delta[0],p_thirst_delta:delta[1],p_fatigue_delta:delta[2],p_stress_delta:delta[3],p_temperature:delta[4],p_contamination_delta:delta[5]});if(r.error)throw r.error;toast('Estado atualizado.','success');await openSurvival(activeCharacter.id)}catch(e){toast(e?.message||'Não foi possível atualizar.','error')}
  }

  async function addInjury(e){
    e.preventDefault();
    try{const r=await aeriom.rpc('add_character_injury',{p_character_id:activeCharacter.id,p_injury_type:document.getElementById('injuryType').value.trim(),p_body_part:document.getElementById('injuryBody').value.trim()||null,p_severity:Number(document.getElementById('injurySeverity').value)||1,p_bleeding:0,p_pain:Number(document.getElementById('injuryPain').value)||0,p_notes:''});if(r.error)throw r.error;toast('Ferimento registrado.','success');await openSurvival(activeCharacter.id)}catch(err){toast(err?.message||'Não foi possível registrar ferimento.','error')}
  }

  grid.addEventListener('click',e=>{
    const b=e.target.closest('[data-character-system]');if(!b)return;
    e.preventDefault();const id=b.dataset.characterId;
    if(b.dataset.characterSystem==='inventory')openInventory(id);
    if(b.dataset.characterSystem==='survival')openSurvival(id);
  });

  const observe=new MutationObserver(addCardActions);observe.observe(grid,{childList:true,subtree:true});
  afterlifeReady.then(addCardActions).catch(()=>addCardActions());
  addCardActions();
})();
