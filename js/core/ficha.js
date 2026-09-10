(() => {
  'use strict';

  const STEPS = [
    {id:'identity',name:'Identidade'}, {id:'race',name:'Raça'}, {id:'appearance',name:'Aparência'}, {id:'class',name:'Classe'},
    {id:'attributes',name:'Atributos'}, {id:'power',name:'Poder & Mana'}, {id:'skills',name:'Perícias'}, {id:'techniques',name:'Técnicas'},
    {id:'inventory',name:'Inventário'}, {id:'review',name:'Revisão'}
  ];
  const ATTRIBUTES = [
    {id:'forca',name:'Força',short:'FOR'},
    {id:'agilidade',name:'Agilidade',short:'AGI'},
    {id:'percepcao',name:'Percepção',short:'PER'},
    {id:'vigor',name:'Vigor',short:'VIG'},
    {id:'intelecto',name:'Intelecto',short:'INT'},
    {id:'presenca',name:'Presença',short:'PRE'},
    {id:'controle',name:'Controle',short:'CON'},
    {id:'precisao',name:'Precisão',short:'PRI'}
  ];
  const DICE = [
    {id:'d4',label:'D4',sides:4}, {id:'d6a',label:'D6',sides:6}, {id:'d6b',label:'D6',sides:6}, {id:'d8',label:'D8',sides:8},
    {id:'d10',label:'D10',sides:10}, {id:'d12',label:'D12',sides:12}, {id:'d20a',label:'D20',sides:20}, {id:'d20b',label:'D20',sides:20}
  ];
  const CLASSES = {
    guerreiro:{id:'guerreiro',name:'Guerreiro',role:'Combatente',icon:'⚔',mana:50,slots:16,weight:40,skillCount:5,
      description:'Especialista em combate físico, armas e presença no campo de batalha.',
      startingItems:['Espada ou Machado','Arco ou Besta','Proteção básica'],
      itemNote:'Pode trocar o arco/besta por uma arma de duas mãos.',
      trainedSkills:['Atletismo','Tática','Pontaria','Sobrevivência','Ofício / Crafting']},
    feiticeiro:{id:'feiticeiro',name:'Controlador',role:'Mágico',icon:'✦',mana:100,slots:12,weight:25,skillCount:5,
      description:'Especialista em controle, canalização e manipulação de Mana.',
      startingItems:['Canalizador de Mana (pulseira básica)'],
      itemNote:'Equipamento inicial focado em canalização manual.',
      trainedSkills:['Conhecimento','Ofício / Crafting','Percepção','Investigação','Intuição']},
    curandeiro:{id:'curandeiro',name:'Curandeiro',role:'Suporte',icon:'✚',mana:80,slots:14,weight:30,skillCount:4,
      description:'Especialista em suporte, recuperação e uso de Mana sobre aliados.',
      startingItems:['Livro de poções','Canalizador de Mana (anel básico)'],
      itemNote:'Preparado para suporte e recuperação.',
      trainedSkills:['Medicina','Conhecimento','Intuição','Percepção']},
    monge:{id:'monge',name:'Monge',role:'Marcial',icon:'◈',mana:30,slots:10,weight:20,skillCount:6,
      description:'Transforma Mana em capacidade corporal, mobilidade e força física.',
      startingItems:['Armas básicas (facas e adagas)','Bastão Bo'],
      itemNote:'Pode lutar com armas básicas e canalizar Mana através do corpo.',
      trainedSkills:['Acrobacia','Atletismo','Furtividade','Intuição','Tática','Sobrevivência']}
  };
  const SKILLS = [
    ['acrobacia','Acrobacia','agilidade','Equilíbrio, saltos e movimentos difíceis.'],['atletismo','Atletismo','forca','Corrida, escalada, natação e feitos físicos.'],
    ['furtividade','Furtividade','agilidade','Mover-se sem chamar atenção.'],['pontaria','Pontaria','agilidade','Mira, ataques à distância e arremessos.'],
    ['percepcao','Percepção','percepcao','Notar ameaças, sons e detalhes.'],['investigacao','Investigação','intelecto','Buscar pistas e analisar evidências.'],
    ['conhecimento','Conhecimento','intelecto','Criaturas, história, magia e geografia.'],['medicina','Medicina','intelecto','Primeiros socorros e tratamento.'],
    ['sobrevivencia','Sobrevivência','percepcao','Rastrear, navegar e encontrar recursos.'],['persuasao','Persuasão','presenca','Convencer, negociar e influenciar.'],
    ['enganacao','Enganação','presenca','Blefar e disfarçar intenções.'],['intuicao','Intuição','percepcao','Perceber intenções e comportamentos estranhos.'],
    ['tatica','Tática','intelecto','Planejamento e leitura de combate.'],['oficio','Ofício / Crafting','controle','Criar, reparar e aprimorar equipamentos.']
  ].map(function(x){return{id:x[0],name:x[1],attribute:x[2],description:x[3]};});
  const UNCOMMON = [
    {name:'Gelo',description:'Manipulação e formação de gelo.'},{name:'Magnetismo',description:'Atração, repulsão e controle magnético.'},
    {name:'Vegetação',description:'Manipulação de plantas e matéria vegetal.'},{name:'Tecnologia',description:'Afinidade com mecanismos e artefatos tecnológicos.'},
    {name:'Gravidade',description:'Alteração localizada de peso e atração.'}
  ];
  const STORAGE_PREFIX = 'aerion:ficha:draft:v40:';
  const $ = function(s,r){return (r||document).querySelector(s);};
  const $$ = function(s,r){return Array.from((r||document).querySelectorAll(s));};
  const txt = function(v){return String(v == null ? '' : v).trim();};
  const num = function(v,d){var n=Number(v);return Number.isFinite(n)?n:(d||0);};
  const clone = function(v){try{return structuredClone(v);}catch(e){return JSON.parse(JSON.stringify(v));}};
  const emit = function(n,d){window.dispatchEvent(new CustomEvent(n,{detail:d||{}}));};
  const toast = function(m,t){emit('aerion:toast',{message:m,type:t||'info'});};
  const DEFAULT = function(){return {
    currentStep:0,completedSteps:Array(10).fill(false),finalized:false,saved:false,
    name:'',age:'',gender:'',origin:'',description:'',personality:'',objective:'',fear:'',importantBond:'',history:'',region:'',
    race:'',animalha:'',animalhaCategory:'',class:'',
    appearance:{height:170,skinTone:'',skinHex:'',hairColor:'Preto',eyeColor:'Castanhos',description:'',scars:'',customDetails:''},
    assignedDice:{},primaryPower:'',parallelPower:'',powerRoll:null,powerMode:'',customPowerDescription:'',elementalMaster:{element:'',species:'',image:'',name:'',personality:'',appearance:''},
    mana:{current:0,max:0,color:'azul',unlocked:['azul'],channeler:{type:'none',tier:0,slots:0,stones:[]}},skills:{},techniques:[],inventory:[],equipment:[],conditions:[],hp:{current:10,max:10},defense:10,movement:9,
    derivedStats:{hpMax:10,defense:10,movement:9,size:'Médio',racialModifiers:{},abilities:[],resistances:[],senses:[]}
  };};
  let state=DEFAULT(), timer=null, ready=false;
  function characterStorageKey(id){return STORAGE_PREFIX+String(id||'unassigned');}
  function currentCharacterId(){var p=new URLSearchParams(window.location.search);return p.get('id')||p.get('draft')||'unassigned';}
  function storageKey(){return characterStorageKey(currentCharacterId());}
  function normalizeGender(value){var v=txt(value).toLowerCase();return v==='feminino'?'Feminino':v==='masculino'?'Masculino':'';}
  function getAgeRange(){if(String(state.race||'').indexOf('homebrew:')===0){var hb=window.AERION_HOMEBREW||{};var hr=(hb.races||[]).find(function(x){return 'homebrew:'+x.id===state.race;});var d=hr?.data||{};if(Number.isFinite(Number(d.age_min))||Number.isFinite(Number(d.age_max)))return{min:num(d.age_min,1),max:num(d.age_max,999)};}var a=window.AERIONPersonagemAssets;if(!a||typeof a.getAgeRange!=='function')return{min:1,max:999};return a.getAgeRange(state.race,state.animalha);}
  function validAge(){var n=num(state.age,-1),r=getAgeRange();return n>=r.min&&n<=r.max;}
  function calculateDerived(){
    var hb=window.AERION_HOMEBREW||{};
    var racial;
    if(String(state.race||'').indexOf('homebrew:')===0){
      var hr=(hb.races||[]).find(function(x){return 'homebrew:'+x.id===state.race;});
      if(hr){
        var d=hr.data||{};
        racial={hp:Math.max(1,num(d.hp,10)),defense:Math.max(1,num(d.defense,10)),movement:num(d.movement,9),mods:d.mods||{},size:d.size||'Médio',resistances:Array.isArray(d.resistances)?d.resistances:[],senses:Array.isArray(d.senses)?d.senses:[],abilities:Array.isArray(d.abilities)?d.abilities:[]};
      }
    }
    if(!racial) racial=window.AERION_RACIAL_RULES && window.AERION_RACIAL_RULES.calculate ? window.AERION_RACIAL_RULES.calculate(state) : null;
    if(racial){
      state.derivedStats=Object.assign({},state.derivedStats,racial,{hpMax:num(racial.hp,10),defense:num(racial.defense,10),movement:num(racial.movement,9),racialModifiers:racial.mods||{},abilities:racial.abilities||[],resistances:racial.resistances||[],senses:racial.senses||[]});
      state.hp.max=Math.max(1,num(racial.hp,10)); state.hp.current=Math.min(Math.max(0,num(state.hp.current,state.hp.max)),state.hp.max);
      state.defense=Math.max(1,num(racial.defense,10)); state.movement=Math.max(0,num(racial.movement,9));
    }
    var k=CLASSES[state.class];
    if(String(state.class||'').indexOf('homebrew:')===0){
      var hc=(hb.classes||[]).find(function(x){return 'homebrew:'+x.id===state.class;});
      if(hc){k=Object.assign({},hc.data||{},{id:state.class,name:hc.title||'Classe Homebrew',mana:num(hc.data?.mana,0),slots:num(hc.data?.slots,0),weight:num(hc.data?.weight,0),skillCount:Array.isArray(hc.data?.trained_skills)?hc.data.trained_skills.length:0,description:hc.summary||hc.content||'Classe Homebrew'});}
    }
    if(k){state.mana.max=num(k.mana,0);state.mana.current=Math.min(Math.max(0,num(state.mana.current,k.mana)),k.mana);}else{state.mana.max=0;state.mana.current=0;}
  }
  function computeCompletion(){
    state.completedSteps[0]=!!(txt(state.name)&&txt(state.gender));
    state.completedSteps[1]=!!txt(state.race)&&(txt(state.race).toLowerCase()!=='animalha'||!!(txt(state.animalhaCategory)&&txt(state.animalha)));
    state.completedSteps[2]=num(state.appearance.height)>0&&validAge(); state.completedSteps[3]=!!txt(state.class);
    state.completedSteps[4]=ATTRIBUTES.every(function(a){return !!state.assignedDice[a.id];}); state.completedSteps[5]=!!txt(state.primaryPower);
    state.completedSteps[6]=true;state.completedSteps[7]=true;state.completedSteps[8]=true;state.completedSteps[9]=state.completedSteps.slice(0,6).every(Boolean);
  }
  function saveLocal(immediate){clearTimeout(timer);var run=function(){try{state.saved=true;localStorage.setItem(storageKey(),JSON.stringify(state));emit('aerion:save',{state:clone(state)});var e=$('#saveStatusText');if(e)e.textContent='Rascunho local';}catch(e){var x=$('#saveStatusText');if(x)x.textContent='Erro ao salvar';}};var s=$('#saveStatusText');if(s)s.textContent='Salvando…';if(immediate)run();else timer=setTimeout(run,350);}
  function commit(ev){calculateDerived();computeCompletion();state.saved=false;saveLocal(false);emit(ev||'aerion:ficha:update',{state:clone(state)});renderRequest();}
  function renderRequest(){emit('aerion:ficha:render',{state:clone(state)});}
  function reset(){state=DEFAULT();calculateDerived();computeCompletion();localStorage.removeItem(storageKey());saveLocal(true);renderRequest();}
  function load(){try{var raw=localStorage.getItem(storageKey());if(raw){var saved=JSON.parse(raw),d=DEFAULT();state=Object.assign(d,saved,{gender:normalizeGender(saved.gender),appearance:Object.assign({},d.appearance,saved.appearance||{}),mana:Object.assign({},d.mana,saved.mana||{},{unlocked:Array.from(new Set(['azul',...(saved.mana?.unlocked||[])]))}),hp:Object.assign({},d.hp,saved.hp||{}),derivedStats:Object.assign({},d.derivedStats,saved.derivedStats||{})});}}catch(e){state=DEFAULT();}calculateDerived();computeCompletion();}
  function setState(partial){state=Object.assign({},state,clone(partial),{gender:normalizeGender(partial.gender===undefined?state.gender:partial.gender),appearance:Object.assign({},state.appearance,partial.appearance||{}),mana:Object.assign({},state.mana,partial.mana||{},{unlocked:Array.from(new Set(['azul',...(partial.mana?.unlocked||state.mana.unlocked||[])]))}),hp:Object.assign({},state.hp,partial.hp||{}),derivedStats:Object.assign({},state.derivedStats,partial.derivedStats||{})});calculateDerived();computeCompletion();saveLocal(false);renderRequest();}
  function selectRace(v){state.race=txt(v);state.animalha='';state.animalhaCategory='';state.appearance.coatTone='';var h=null;if(state.race.indexOf('homebrew:')===0){var hb=window.AERION_HOMEBREW||{};var hr=(hb.races||[]).find(function(x){return 'homebrew:'+x.id===state.race;});if(hr&&hr.data)h={min:num(hr.data.height_min,150),max:num(hr.data.height_max,200)};}if(!h){var a=window.AERIONPersonagemAssets;h=a&&a.getRaceHeight?a.getRaceHeight(state.race):null;}if(h)state.appearance.height=Math.round((num(h.min,150)+num(h.max,200))/2);calculateDerived();if(state.hp&&state.hp.max)state.hp.current=state.hp.max;commit('aerion:race:selected');}
  function selectAnimalCategory(v){state.animalhaCategory=txt(v);state.animalha='';state.appearance.coatTone='';commit('aerion:animalha:category');}
  function selectAnimal(v){state.animalha=txt(v);calculateDerived();if(state.hp&&state.hp.max)state.hp.current=state.hp.max;commit('aerion:animalha:selected');}
  function selectChanneler(type){const map={none:{tier:0,slots:0,label:"Sem canalizador"},ring:{tier:1,slots:0,label:"Anel básico"},bracelet:{tier:2,slots:0,label:"Pulseira básica"},bracelet_control:{tier:3,slots:2,label:"Bracelete de Controle"},glove:{tier:4,slots:2,label:"Luva Canalizadora"}};const k=map[txt(type)];if(!k)return false;state.mana.channeler={type:txt(type),tier:k.tier,slots:k.slots,stones:Array.isArray(state.mana.channeler?.stones)?state.mana.channeler.stones:[],label:k.label};commit('aerion:channeler:selected');return true;}
  function selectClass(v){var id=txt(v),k=CLASSES[id];if(!k&&id.indexOf('homebrew:')===0){var hb=window.AERION_HOMEBREW||{};var hc=(hb.classes||[]).find(function(x){return 'homebrew:'+x.id===id;});if(hc){k=Object.assign({},hc.data||{},{id:id,name:hc.title||'Classe Homebrew',mana:num(hc.data?.mana,0)});}}if(!k)return false;state.class=k.id;state.mana.max=num(k.mana,0);state.mana.current=state.mana.max;commit('aerion:class:selected');return true;}
  function selectGender(v){var g=normalizeGender(v);if(!g)return false;state.gender=g;commit('aerion:gender:selected');return true;}
  function assignDie(a,d){if(!ATTRIBUTES.some(function(x){return x.id===a;})||!DICE.some(function(x){return x.id===d;}))return false;Object.keys(state.assignedDice).forEach(function(k){if(k!==a&&state.assignedDice[k]===d)delete state.assignedDice[k];});state.assignedDice[a]=d;commit('aerion:attributes:update');return true;}
  function removeDie(a){delete state.assignedDice[a];commit('aerion:attributes:update');}
  function rollPower(){var r=Math.floor(Math.random()*100)+1,p=r<=25?'Fogo':r<=50?'Terra':r<=75?'Água':'Ar';var masters={Fogo:{species:'Pequeno Dragão',image:'https://i.ibb.co/r2XVnVWL/file-00000000a8a4820e907177fd92724e5c.png'},Terra:{species:'Tartaruga',image:'https://i.ibb.co/Psn3SPTs/file-00000000f894820e8433f2f40b4c188b.png'},Água:{species:'Polvo',image:'https://i.ibb.co/Ndt9106B/file-00000000de18820ea959e3f6b2bcfafd.png'},Ar:{species:'Grifo',image:'https://i.ibb.co/Y7Wbw3PY/file-000000000d44820e96b63eab4655b189.png'}};var m=masters[p];state.powerRoll=r;state.primaryPower=p;state.powerMode='d100';state.customPowerDescription='';state.elementalMaster=Object.assign({},state.elementalMaster,{element:p,species:m.species,image:m.image});commit('aerion:power:selected');toast('D100: '+r+' — '+p+' · '+m.species+'.','success');return{roll:r,power:p,master:m.species};}
  function uncommon(v){var p=UNCOMMON.find(function(x){return x.name===txt(v);});if(!p)return false;state.primaryPower=p.name;state.powerMode='uncommon';state.powerRoll=null;state.customPowerDescription=p.description;commit('aerion:power:selected');return true;}
  function masterField(k,v){if(!state.elementalMaster)return;state.elementalMaster[k]=txt(v);commit('aerion:master:update');}
  function powerField(k,v){if(k==='customPower'){state.primaryPower=txt(v);state.powerMode='custom';state.powerRoll=null;}else if(k==='customDescription'){state.customPowerDescription=txt(v);}commit('aerion:power:update');}
  function appearance(k,v){if(!(k in state.appearance))return;state.appearance[k]=k==='height'?num(v,170):txt(v);commit('aerion:appearance:update');}
  function manaCurrent(v){state.mana.current=Math.min(Math.max(0,num(v,0)),num(state.mana.max,0));commit('aerion:mana:update');}
  function setManaColor(v){var color=txt(v).toLowerCase();var unlocked=Array.isArray(state.mana.unlocked)?state.mana.unlocked:['azul'];if(!unlocked.includes(color))return false;state.mana.color=color;commit('aerion:mana:color');return true;}
  async function loadCampaignManaAccess(){
    try{
      var params=new URLSearchParams(window.location.search);
      var campaignId=params.get('returnCampaign');
      var characterId=currentCharacterId();
      if(!campaignId||characterId==='unassigned')return;
      var mod=await import('./supabase.js');
      var sb=await mod.getSupabase();
      var res=await sb.from('campaign_character_settings').select('unlocked_manas,selected_mana').eq('campaign_id',campaignId).eq('character_id',characterId).maybeSingle();
      if(res.error||!res.data)return;
      var unlocked=Array.isArray(res.data.unlocked_manas)?res.data.unlocked_manas.map(function(x){return txt(x).toLowerCase();}):['azul'];
      state.mana.unlocked=Array.from(new Set(['azul'].concat(unlocked)));
      if(state.mana.unlocked.includes(txt(res.data.selected_mana).toLowerCase()))state.mana.color=txt(res.data.selected_mana).toLowerCase();
    }catch(e){}
  }
  function toggleSkill(id){var s=state.skills[id]||{trained:false,bonus:0};state.skills[id]={trained:!s.trained,bonus:s.bonus||0};commit('aerion:skills:update');}
  function skillBonus(id,v){state.skills[id]=Object.assign({},state.skills[id]||{}, {trained:true,bonus:Math.max(0,num(v,0))});commit('aerion:skills:update');}
  function addTechnique(){state.techniques.push({id:crypto.randomUUID(),name:'',level:1,xp:0,cost:0,action:'Ação Principal',range:'',effect:''});commit('aerion:technique:add');}
  function updateTechnique(id,k,v){var t=state.techniques.find(function(x){return x.id===id;});if(!t)return;t[k]=['level','xp','cost'].includes(k)?Math.max(0,num(v)):txt(v);commit('aerion:technique:update');}
  function removeTechnique(id){state.techniques=state.techniques.filter(function(x){return x.id!==id;});commit('aerion:technique:remove');}
  function addItem(){state.inventory.push({id:crypto.randomUUID(),name:'',quantity:1,slots:1,weight:1});commit('aerion:inventory:add');}
  function updateItem(id,k,v){var i=state.inventory.find(function(x){return x.id===id;});if(!i)return;i[k]=['quantity','slots','weight'].includes(k)?Math.max(k==='quantity'?1:0,num(v)):txt(v);commit('aerion:inventory:update');}
  function removeItem(id){state.inventory=state.inventory.filter(function(x){return x.id!==id;});commit('aerion:inventory:remove');}
  function validateStep(i){computeCompletion();if(i===0&&!state.completedSteps[0]){var missing=[];if(!txt(state.name))missing.push('nome');if(!['Masculino','Feminino'].includes(state.gender))missing.push('gênero');toast('Complete esta etapa antes de avançar: '+missing.join(' e ')+'.','warning');if(!txt(state.name)){var name=$('#characterName');if(name)name.focus();}return false;}if(i===1&&!state.completedSteps[1]){toast('Escolha a raça e, para Animalha, categoria e variação.','warning');return false;}if(i===2&&!state.completedSteps[2]){var r=getAgeRange();if(!validAge())toast('Defina uma idade entre '+r.min+' e '+r.max+' anos para esta raça/linhagem.','warning');else toast('Defina a altura.','warning');return false;}if(i===3&&!state.completedSteps[3]){toast('Escolha uma classe.','warning');return false;}if(i===4&&!state.completedSteps[4]){toast('Distribua os 8 dados nos atributos.','warning');return false;}if(i===5&&!state.completedSteps[5]){toast('Escolha ou sorteie um poder.','warning');return false;}return true;}
  function goToStep(target,validate){var current=state.currentStep,t=Math.max(0,Math.min(9,num(target,0)));if(t===current){renderRequest();return true;}if(t>current&&(validate!==false)){var ok=validateStep(current);if(!ok){state.currentStep=current;renderRequest();return false;}}if(t>current+1){state.currentStep=current;renderRequest();return false;}state.currentStep=t;saveLocal(false);emit('aerion:ficha:step',{currentStep:t});renderRequest();window.scrollTo({top:0,behavior:'smooth'});return true;}
  function next(){if(state.currentStep===9)return finalizeCharacter();return goToStep(state.currentStep+1,true);}
  function previous(){if(state.currentStep<=0)return false;state.currentStep--;saveLocal(false);emit('aerion:ficha:step',{currentStep:state.currentStep});renderRequest();window.scrollTo({top:0,behavior:'smooth'});return true;}
  function finalizeCharacter(){computeCompletion();var ok=[0,1,2,3,4,5].every(function(i){return state.completedSteps[i];});if(!ok){var missing=[0,1,2,3,4,5].find(function(i){return !state.completedSteps[i];});toast('Complete a etapa '+(STEPS[missing]?STEPS[missing].name:'anterior')+' antes de finalizar.','warning');goToStep(missing,false);return false;}state.completedSteps=Array(10).fill(true);state.finalized=true;saveLocal(true);emit('aerion:ficha:finalize',{state:clone(state)});emit('aerion:ficha:update',{state:clone(state)});renderRequest();return true;}
  function bind(){
    document.addEventListener('input',function(e){var f=e.target.closest('[data-field]'),c=e.target.closest('[data-concept-field]'),p=e.target.closest('[data-power]'),a=e.target.closest('[data-appearance]'),m=e.target.closest('[data-mana]'),em=e.target.closest('[data-master-field]');if(f){state[f.dataset.field]=f.dataset.field==='age'?(f.value===''?'':num(f.value)):f.value;commit();return;}if(c){state[c.dataset.conceptField]=c.value;commit();return;}if(p){powerField(p.dataset.power,p.value);return;}if(a){appearance(a.dataset.appearance,a.value);return;}if(m){manaCurrent(m.value);return;}if(em){masterField(em.dataset.masterField,em.value);}});
    document.addEventListener('change',function(e){var t=e.target.closest('[data-technique-field]'),i=e.target.closest('[data-item-field]'),s=e.target.closest('[data-skill-bonus]');if(t)updateTechnique(t.dataset.techniqueId,t.dataset.techniqueField,t.value);if(i)updateItem(i.dataset.itemId,i.dataset.itemField,i.value);if(s)skillBonus(s.dataset.skillBonus,s.value);});
    // A navegação usa um único listener delegado por data-action.
    // Evita que os botões com ID + data-action executem a etapa duas vezes.
    $$('[data-field-choice="gender"]').forEach(function(button){
      button.addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        selectGender(button.dataset.value);
      });
    });

    document.addEventListener('click',function(e){
      var g=e.target.closest('[data-field-choice]'),step=e.target.closest('[data-step]'),act=e.target.closest('[data-action]'),manaColor=e.target.closest('[data-mana-color]'),channeler=e.target.closest('[data-channeler]'),race=e.target.closest('[data-race-id]'),cat=e.target.closest('[data-animalha-category]'),animal=e.target.closest('[data-animalha-id]'),klass=e.target.closest('[data-class-id]'),die=e.target.closest('[data-assign-die]'),remDie=e.target.closest('[data-remove-die]'),skin=e.target.closest('[data-skin]'),hair=e.target.closest('[data-hair]'),eyes=e.target.closest('[data-eyes]'),power=e.target.closest('[data-uncommon-power]'),skill=e.target.closest('[data-skill-id]'),tr=e.target.closest('[data-remove-technique]'),it=e.target.closest('[data-remove-item]');
      if(g){selectGender(g.dataset.value);return;} if(step){var target=num(step.dataset.step);if(target<=state.currentStep)goToStep(target,false);else if(target===state.currentStep+1)goToStep(target,true);else toast('Conclua as etapas anteriores antes de avançar.','warning');return;} if(race){selectRace(race.dataset.raceId);return;}if(cat){selectAnimalCategory(cat.dataset.animalhaCategory);return;}if(animal){selectAnimal(animal.dataset.animalhaId);return;}if(klass){selectClass(klass.dataset.classId);return;}if(die){assignDie(die.dataset.attribute,die.dataset.assignDie);return;}if(remDie){removeDie(remDie.dataset.removeDie);return;}if(skin){appearance(skin.dataset.skinKind==='coat'?'coatTone':'skinTone',skin.dataset.skin);$('#skin-picker').hidden=true;$('#skin-picker-button').setAttribute('aria-expanded','false');return;}if(hair){appearance('hairColor',hair.dataset.hair);return;}if(eyes){appearance('eyeColor',eyes.dataset.eyes);return;}if(power){uncommon(power.dataset.uncommonPower);return;}if(skill){toggleSkill(skill.dataset.skillId);return;}if(tr){removeTechnique(tr.dataset.removeTechnique);return;}if(it){removeItem(it.dataset.removeItem);return;}
      if(manaColor){setManaColor(manaColor.dataset.manaColor);return;}if(act){var type=act.dataset.action;if(type==='roll-power'){rollPower();return;}if(type==='next-step'){next();return;}if(type==='previous-step'){previous();return;}if(type==='finalize'){finalizeCharacter();return;}if(type==='add-technique'){addTechnique();return;}if(type==='add-item'){addItem();return;}}
    });
    $('#race-search')&&$('#race-search').addEventListener('input',function(e){emit('aerion:ficha:filter-race',{query:e.target.value});});
    $('#skin-picker-button')&&$('#skin-picker-button').addEventListener('click',function(e){e.stopPropagation();var p=$('#skin-picker');if(!p)return;p.hidden=!p.hidden;this.setAttribute('aria-expanded',String(!p.hidden));});
    document.addEventListener('click',function(e){if(!e.target.closest('#skin-picker')&&!e.target.closest('#skin-picker-button')){var p=$('#skin-picker');if(p)p.hidden=true;}});
  }
  async function boot(){if(ready)return;ready=true;load();bind();await loadCampaignManaAccess();renderRequest();window.addEventListener('beforeunload',function(){saveLocal(true);});}
  window.AERIONFicha=Object.freeze({getState:function(){return clone(state);},setState:setState,reset:reset,save:function(){saveLocal(true);},selectGender:selectGender,selectRace:selectRace,selectAnimalhaCategory:selectAnimalCategory,selectAnimalha:selectAnimal,selectClass:selectClass,assignDie:assignDie,removeDie:removeDie,rollPowerD100:rollPower,selectUncommonPower:uncommon,setPowerValue:powerField,setAppearance:appearance,setManaCurrent:manaCurrent,setManaColor:setManaColor,toggleSkill:toggleSkill,setSkillBonus:skillBonus,addTechnique:addTechnique,updateTechnique:updateTechnique,removeTechnique:removeTechnique,addItem:addItem,updateItem:updateItem,removeItem:removeItem,validateStep:validateStep,goToStep:goToStep,nextStep:next,previousStep:previous,finalizeCharacter:finalizeCharacter,getSteps:function(){return clone(STEPS);},getAttributes:function(){return clone(ATTRIBUTES);},getDice:function(){return clone(DICE);},getClasses:function(){return clone(CLASSES);},getSkills:function(){return clone(SKILLS);},getUncommonPowers:function(){return clone(UNCOMMON);}});
  window.AERION_FICHA=window.AERIONFicha;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();