(() => {
"use strict";
const CONFIG={storageKey:"aerion:ficha:draft:v22",autosaveDelay:350,totalSteps:10};
const STEPS=[
{id:0,key:"identity",label:"Identidade"},
{id:1,key:"race",label:"Raça"},
{id:2,key:"appearance",label:"Aparência"},
{id:3,key:"class",label:"Classe"},
{id:4,key:"attributes",label:"Atributos"},
{id:5,key:"power",label:"Poder & Mana"},
{id:6,key:"skills",label:"Perícias"},
{id:7,key:"techniques",label:"Técnicas"},
{id:8,key:"inventory",label:"Inventário"},
{id:9,key:"review",label:"Revisão"}];
const ATTRIBUTES=[
{id:"forca",name:"Força",short:"FOR"},
{id:"agilidade",name:"Agilidade",short:"AGI"},
{id:"percepcao",name:"Percepção",short:"PER"},
{id:"vigor",name:"Vigor",short:"VIG"},
{id:"intelecto",name:"Intelecto",short:"INT"},
{id:"presenca",name:"Presença",short:"PRE"},
{id:"controle",name:"Controle",short:"CON"}];
const DICE=[
{id:"d4",label:"D4",sides:4},
{id:"d6a",label:"D6",sides:6},
{id:"d6b",label:"D6",sides:6},
{id:"d8",label:"D8",sides:8},
{id:"d10",label:"D10",sides:10},
{id:"d12",label:"D12",sides:12},
{id:"d20a",label:"D20",sides:20},
{id:"d20b",label:"D20",sides:20}];
const CLASSES={
guerreiro:{id:"guerreiro",name:"Guerreiro",role:"Combatente",icon:"⚔",mana:50,slots:16,weight:40,description:"Especialista em combate físico, armas e presença no campo de batalha."},
feiticeiro:{id:"feiticeiro",name:"Feiticeiro",role:"Mágico",icon:"✦",mana:100,slots:12,weight:25,description:"Especialista em controle, canalização e manipulação de Mana."},
curandeiro:{id:"curandeiro",name:"Curandeiro",role:"Suporte",icon:"✚",mana:80,slots:14,weight:30,description:"Especialista em suporte, recuperação e uso de Mana sobre aliados."},
monge:{id:"monge",name:"Monge",role:"Marcial",icon:"◈",mana:30,slots:10,weight:20,description:"Transforma Mana em capacidade corporal, mobilidade e força física."}};
const SKILLS=[
{id:"acrobacia",name:"Acrobacia",attribute:"agilidade",desc:"Equilíbrio, saltos, esquivas e movimentos difíceis."},
{id:"atletismo",name:"Atletismo",attribute:"forca",desc:"Correr, escalar, nadar, saltar e feitos físicos."},
{id:"furtividade",name:"Furtividade",attribute:"agilidade",desc:"Esconder-se, andar silenciosamente e passar despercebido."},
{id:"pontaria",name:"Pontaria",attribute:"agilidade",desc:"Ataques à distância, mira e arremessos."},
{id:"percepcao",name:"Percepção",attribute:"percepcao",desc:"Notar inimigos, armadilhas, sons e detalhes."},
{id:"investigacao",name:"Investigação",attribute:"intelecto",desc:"Procurar pistas, analisar evidências e resolver mistérios."},
{id:"conhecimento",name:"Conhecimento",attribute:"intelecto",desc:"História, criaturas, magia, geografia e assuntos acadêmicos."},
{id:"medicina",name:"Medicina",attribute:"intelecto",desc:"Primeiros socorros, diagnóstico e tratamento."},
{id:"sobrevivencia",name:"Sobrevivência",attribute:"percepcao",desc:"Rastrear, encontrar comida, navegar e sobreviver na natureza."},
{id:"persuasao",name:"Persuasão",attribute:"presenca",desc:"Convencer, negociar e influenciar pessoas."},
{id:"enganacao",name:"Enganação",attribute:"presenca",desc:"Mentir, blefar, disfarçar intenções e manipular."},
{id:"intuicao",name:"Intuição",attribute:"percepcao",desc:"Perceber mentiras, intenções e comportamento estranho."},
{id:"tatica",name:"Tática",attribute:"intelecto",desc:"Estratégia, planejamento e análise de combate."},
{id:"oficio",name:"Ofício / Crafting",attribute:"controle",desc:"Criar, reparar e aprimorar equipamentos com materiais e Mana."}];
const UNCOMMON=["Gelo","Magnetismo","Vegetação","Tecnologia","Gravidade"];
const DEFAULT=()=>({
currentStep:0,completedSteps:Array(10).fill(false),
name:"",age:"",gender:"",origin:"",description:"",history:"",region:"",objective:"",fear:"",importantBond:"",
race:"",animalha:"",animalhaCategory:"",class:"",
appearance:{height:170,skinTone:"",hairColor:"",eyeColor:""},
assignedDice:{},primaryPower:"",parallelPower:"",powerRoll:null,powerMode:"",customPowerDescription:"",
mana:{current:0,max:0},skills:{},techniques:[],inventory:[],equipment:[],
defense:10,movement:9,hp:{current:10,max:10},derivedStats:{hpMax:10,defense:10,movement:9,size:"Médio",racialModifiers:{},abilities:[],resistances:[],senses:[]},
saved:false,finalized:false});
let state=DEFAULT(),timer=null,started=false;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const text=v=>String(v??"").trim();
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const norm=v=>text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"_");
const clone=v=>{try{return structuredClone(v);}catch{return JSON.parse(JSON.stringify(v));}};
function emit(name,detail={}){window.dispatchEvent(new CustomEvent(name,{detail}));}
function notify(message,type="info"){emit("aerion:toast",{message,type});}
function setSaveLabel(v){const e=$("#saveStatusText");if(e)e.textContent=v;}
function saveLocal(immediate=false){
clearTimeout(timer);
const run=()=>{try{state.saved=true;localStorage.setItem(CONFIG.storageKey,JSON.stringify(state));emit("aerion:save",{state:clone(state)});setSaveLabel("Salvo agora");}catch(e){console.error(e);setSaveLabel("Erro local");}};
if(immediate)run();else{setSaveLabel("Salvando…");timer=setTimeout(run,CONFIG.autosaveDelay);}
}
function computeCompletion(){
state.completedSteps[0]=Boolean(text(state.name)&&text(state.gender));
state.completedSteps[1]=Boolean(text(state.race))&&(norm(state.race)!=="animalha"||Boolean(text(state.animalhaCategory)&&text(state.animalha)));
state.completedSteps[2]=num(state.appearance?.height)>0;
state.completedSteps[3]=Boolean(text(state.class));
state.completedSteps[4]=ATTRIBUTES.every(a=>Boolean(state.assignedDice[a.id]));
state.completedSteps[5]=Boolean(text(state.primaryPower));
}
function commit(eventName="aerion:ficha:update"){state.saved=false;computeCompletion();saveLocal();emit(eventName,{state:clone(state)});render();}
function loadLocal(){
try{const raw=localStorage.getItem(CONFIG.storageKey);if(!raw)return;const p=JSON.parse(raw);state={...DEFAULT(),...p,appearance:{...DEFAULT().appearance,...p.appearance},mana:{...DEFAULT().mana,...p.mana}};computeCompletion();}catch(e){console.warn("[AERION] local draft",e);}
}
function getRules(){
const racial=window.AERION_RACIAL_RULES?.calculate?.(state)||{hp:10,defense:10,movement:9,mods:{},size:"Médio",abilities:[],resistances:[],senses:[]};
state.derivedStats={...state.derivedStats,...racial,hpMax:racial.hp,racialModifiers:racial.mods||{},abilities:racial.abilities||[],resistances:racial.resistances||[],senses:racial.senses||[]};
state.hp={current:Math.min(num(state.hp?.current,10),racial.hp),max:racial.hp};
state.defense=num(racial.defense,10);state.movement=num(racial.movement,9);
return racial;
}
function chooseRace(race){state.race=text(race);state.animalha="";state.animalhaCategory="";const d=window.AERIONPersonagemAssets?.getRace?.(race);if(d?.height)state.appearance.height=Math.round((num(d.height.min,150)+num(d.height.max,200))/2);getRules();commit("aerion:race:selected");}
function chooseAnimalCategory(v){state.animalhaCategory=text(v);state.animalha="";commit("aerion:animalha:category");}
function chooseAnimal(v){state.animalha=text(v);getRules();commit("aerion:animalha:selected");}
function chooseClass(v){const c=CLASSES[text(v)];if(!c)return false;state.class=c.id;state.mana.max=c.mana;state.mana.current=c.mana;commit("aerion:class:selected");return true;}
function chooseGender(v){state.gender=text(v);commit("aerion:gender:selected");}
function assignDie(attr,dieId){
if(!ATTRIBUTES.some(a=>a.id===attr)||!DICE.some(d=>d.id===dieId))return false;
const duplicate=Object.entries(state.assignedDice).find(([a,d])=>d===dieId);
if(duplicate&&duplicate[0]!==attr){delete state.assignedDice[duplicate[0]];}
state.assignedDice[attr]=dieId;commit("aerion:attributes:update");return true;}
function removeDie(attr){delete state.assignedDice[attr];commit("aerion:attributes:update");}
function rollPowerD100(){const r=Math.floor(Math.random()*100)+1;const p=r<=25?"Fogo":r<=50?"Terra":r<=75?"Água":"Ar";state.powerRoll=r;state.primaryPower=p;state.powerMode="d100";state.customPowerDescription="";commit("aerion:power:selected");notify("D100: "+r+" — "+p+".","success");return{roll:r,power:p};}
function selectUncommonPower(p){if(!UNCOMMON.includes(text(p)))return false;state.primaryPower=text(p);state.powerMode="uncommon";state.powerRoll=null;state.customPowerDescription="";commit("aerion:power:selected");return true;}
function setPowerValue(key,value){if(key==="customPower"){state.primaryPower=text(value);state.powerMode="custom";state.powerRoll=null;}else state.customPowerDescription=text(value);commit("aerion:power:update");}
function setAppearance(k,v){state.appearance[k]=k==="height"?num(v):text(v);commit("aerion:appearance:update");}
function toggleSkill(id){const v=state.skills[id]||{trained:false,bonus:0};state.skills[id]={...v,trained:!v.trained};commit("aerion:skills:update");}
function setSkillBonus(id,v){state.skills[id]={...(state.skills[id]||{}),trained:true,bonus:Math.max(0,num(v))};commit("aerion:skills:update");}
function addTechnique(){state.techniques.push({id:crypto.randomUUID(),name:"Nova técnica",level:1,xp:0,cost:0,action:"Ação Principal",range:"",effect:""});commit("aerion:technique:add");}
function updateTechnique(id,key,v){const t=state.techniques.find(x=>x.id===id);if(!t)return;t[key]=["level","xp","cost"].includes(key)?num(v):text(v);commit("aerion:technique:update");}
function removeTechnique(id){state.techniques=state.techniques.filter(x=>x.id!==id);commit("aerion:technique:remove");}
function addItem(){state.inventory.push({id:crypto.randomUUID(),name:"Novo item",slots:1,weight:1,quantity:1});commit("aerion:inventory:add");}
function updateItem(id,key,v){const t=state.inventory.find(x=>x.id===id);if(!t)return;t[key]=["slots","weight","quantity"].includes(key)?Math.max(key==="quantity"?1:0,num(v)):text(v);commit("aerion:inventory:update");}
function removeItem(id){state.inventory=state.inventory.filter(x=>x.id!==id);commit("aerion:inventory:remove");}
function validateStep(i=state.currentStep){
if(i===0&&!state.completedSteps[0]){notify("Preencha nome e gênero.","warning");return false;}
if(i===1&&!state.completedSteps[1]){notify("Escolha a raça e, para Animalha, a linhagem.","warning");return false;}
if(i===2&&!state.completedSteps[2]){notify("Defina a altura.","warning");return false;}
if(i===3&&!state.completedSteps[3]){notify("Escolha uma classe.","warning");return false;}
if(i===4&&!state.completedSteps[4]){notify("Distribua um dado em cada atributo.","warning");return false;}
if(i===5&&!state.completedSteps[5]){notify("Escolha ou sorteie um poder.","warning");return false;}
return true;}
function goToStep(i,strict=true){i=num(i,-1);if(i<0||i>=10)return false;if(i>state.currentStep&&strict&&!validateStep())return false;state.currentStep=i;saveLocal();render();window.scrollTo({top:0,behavior:"smooth"});return true;}
function nextStep(){return state.currentStep<9?goToStep(state.currentStep+1,true):false;}
function previousStep(){return state.currentStep>0?goToStep(state.currentStep-1,false):false;}
function finalizeCharacter(){
for(let i=0;i<6;i++)if(!validateStep(i))return false;
state.currentStep=9;state.completedSteps[9]=true;state.finalized=true;saveLocal(true);emit("aerion:ficha:finalize",{state:clone(state)});render();return true;}
function reset(){state=DEFAULT();saveLocal(true);emit("aerion:ficha:update",{state:clone(state)});render();}
function setState(partial){state={...state,...clone(partial),appearance:{...state.appearance,...(partial?.appearance||{})},mana:{...state.mana,...(partial?.mana||{})}};computeCompletion();getRules();saveLocal();emit("aerion:ficha:update",{state:clone(state)});render();}
function handleInput(e){
const t=e.target;if(!t)return;
if(t.dataset.field){state[t.dataset.field]=t.dataset.field==="age"?num(t.value):t.value;commit();}
if(t.dataset.appearance)setAppearance(t.dataset.appearance,t.value);
if(t.dataset.power==="customPower"||t.dataset.power==="customDescription")setPowerValue(t.dataset.power,t.value);
if(t.dataset.skillBonus)setSkillBonus(t.dataset.id,t.value);
if(t.dataset.technique)updateTechnique(t.dataset.id,t.dataset.technique,t.value);
if(t.dataset.item)updateItem(t.dataset.id,t.dataset.item,t.value);}
function handleClick(e){
const x=e.target.closest("[data-action]");if(x){
switch(x.dataset.action){
case"next-step":nextStep();break;case"previous-step":previousStep();break;case"roll-power":rollPowerD100();break;case"select-uncommon-power":selectUncommonPower(x.dataset.power);break;case"select-race":chooseRace(x.dataset.race);break;case"select-animalha-category":chooseAnimalCategory(x.dataset.category);break;case"select-animalha":chooseAnimal(x.dataset.animal);break;case"select-class":chooseClass(x.dataset.class);break;case"assign-die":assignDie(x.dataset.attribute,x.dataset.die);break;case"remove-die":removeDie(x.dataset.attribute);break;case"toggle-skill":toggleSkill(x.dataset.skill);break;case"add-technique":addTechnique();break;case"remove-technique":removeTechnique(x.dataset.id);break;case"add-item":addItem();break;case"remove-item":removeItem(x.dataset.id);break;case"select-skin":setAppearance("skinTone",x.dataset.value);$("#skin-picker")?.setAttribute("hidden","");break;case"select-hair":setAppearance("hairColor",x.dataset.value);break;case"select-eyes":setAppearance("eyeColor",x.dataset.value);break;case"finalize":finalizeCharacter();break;}}
const g=e.target.closest("[data-field-choice]");if(g&&g.dataset.field==="gender")chooseGender(g.dataset.value);
const step=e.target.closest(".creation-step");if(step)goToStep(num(step.dataset.step),false);
if(e.target.id==="skin-picker-button"){const p=$("#skin-picker");if(p)p.hidden=!p.hidden;}}
function render(){
getRules();
const current=state.currentStep;
$$(".creation-panel").forEach(p=>p.hidden=p.dataset.panel!==(["identity","race","appearance","class","attributes","power","skills","techniques","inventory","review"][current]));
$$(".creation-step").forEach(b=>{const i=num(b.dataset.step);b.classList.toggle("is-active",i===current);b.classList.toggle("is-done",!!state.completedSteps[i]);b.disabled=i>current+1;});
const pct=Math.round(current/9*100);$("#progressBar")&&($("#progressBar").style.width=pct+"%");$("#progressPercent")&&($("#progressPercent").textContent=pct+"%");$(".progress-track")?.setAttribute("aria-valuenow",pct);
$$("[data-current-step]").forEach(x=>x.textContent=current+1);$$("[data-total-steps]").forEach(x=>x.textContent="10");$$("[data-current-step-title]").forEach(x=>x.textContent=STEPS[current].label);
const next=$('[data-action="next-step"]');if(next)next.hidden=current===9;
$("#aerion-finalize-bottom")?.toggleAttribute("hidden",current!==9);$("#aerion-header-finalize")?.toggleAttribute("hidden",current!==9);
getRules();
}
document.addEventListener("input",handleInput);document.addEventListener("change",handleInput);document.addEventListener("click",handleClick);
function start(){if(started)return;started=true;loadLocal();getRules();window.AERIONFicha=API;window.AERION_FICHA=API;render();emit("aerion:ficha:ready",{state:clone(state)});}
const API={getState:()=>clone(state),setState,reset,nextStep,previousStep,goToStep,validateCurrentStep:()=>validateStep(),finalizeCharacter,rollPowerD100,selectUncommonPower,setAppearance,chooseRace,chooseAnimalCategory,chooseAnimal,chooseClass,assignDie,removeDie,toggleSkill,setSkillBonus,addTechnique,updateTechnique,removeTechnique,addItem,updateItem,removeItem,getAttributes:()=>clone(ATTRIBUTES),getSkills:()=>clone(SKILLS),getClasses:()=>clone(CLASSES),getDice:()=>clone(DICE)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();