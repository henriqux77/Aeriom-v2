(() => {
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const state=()=>window.AERIONFicha?.getState?.()||{};
const api=()=>window.AERIONFicha;
const skin=[
{id:"clara",name:"Clara",color:"#ead8c0",desc:"Tom claro e neutro"},
{id:"dourada",name:"Dourada",color:"#d2a46b",desc:"Tom quente e solar"},
{id:"morena",name:"Morena",color:"#a86f47",desc:"Tom médio e quente"},
{id:"escura",name:"Escura",color:"#67412f",desc:"Tom profundo e quente"},
{id:"retinta",name:"Retinta",color:"#3e251e",desc:"Tom muito profundo"}];
const hair=["Preto","Castanho","Loiro","Ruivo","Branco"];
const eyes=["Castanhos","Azuis","Verdes","Âmbar","Cinzentos"];

function currentRace(){return window.AERIONPersonagemAssets?.getRace?.(state().race)||null;}
function classMap(){return api()?.getClasses?.()||{};}
function renderPreview(){
 const s=state(),r=currentRace(),c=classMap()[s.class];
 $("#preview-name")&&($("#preview-name").textContent=s.name||"Sem nome");
 $("#preview-initial")&&($("#preview-initial").textContent=(s.name||"A").slice(0,1).toUpperCase());
 $("#preview-subtitle")&&($("#preview-subtitle").textContent=[r?.name,c?.name].filter(Boolean).join(" · ")||"Escolha raça e classe para começar.");
 const src=window.AERIONPersonagemAssets?.getRaceImage?.(s.race,s.gender)||"";
 const img=$("#preview-image");if(img){img.hidden=!src;if(src)img.src=src;}
 $("#preview-hp")&&($("#preview-hp").textContent=num(s.hp?.max,10));
 $("#preview-defense")&&($("#preview-defense").textContent=num(s.defense,10));
 $("#preview-mana")&&($("#preview-mana").textContent=num(s.mana?.max,0));
}
function renderIdentity(){
 const s=state();
 $$("[data-field]").forEach(e=>{if(e===document.activeElement)return;e.value=s[e.dataset.field]??""});
 $$("[data-field-choice]").forEach(e=>e.classList.toggle("is-selected",e.dataset.value===s.gender));
}
function renderRace(){
 const root=$("#race-grid");if(!root)return;
 const q=String($("#race-search")?.value||"").toLowerCase();
 const races=(window.AERIONPersonagemAssets?.races||[]).filter(r=>!q||r.name.toLowerCase().includes(q));
 $("#race-count")&&($("#race-count").textContent=races.length+" opções");
 root.innerHTML=races.map(r=>{const src=r.images?.default||"";return '<button type="button" class="race-card '+(state().race===r.id?"is-selected":"")+'" data-action="select-race" data-race="'+esc(r.id)+'"><div class="race-card-art">'+(src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc(r.name[0])+'</span>')+'</div><div class="race-card-copy"><strong>'+esc(r.name)+'</strong><span>'+esc(r.profile||"")+'</span></div><span class="selection-check">✓</span></button>';}).join("");
 const r=currentRace(),info=$("#race-info");
 if(info){info.hidden=!r;if(r)info.innerHTML='<strong>'+esc(r.name)+'</strong><span>'+esc(r.description||"")+'</span><span>'+esc(r.feature||"")+'</span>';}
 const block=$("#animalha-block");if(block){block.hidden=state().race!=="animalha";if(!block.hidden)renderAnimalha();}
}
function renderAnimalha(){
 const A=window.AERIONPersonagemAssets||{},s=state(),cats=A.animalhaCategories||[];
 $("#animalha-category-grid")&&($("#animalha-category-grid").innerHTML=cats.map(c=>'<button type="button" class="lineage-card '+(s.animalhaCategory===c.id?"is-selected":"")+'" data-action="select-animalha-category" data-category="'+esc(c.id)+'"><span class="lineage-icon">'+esc(c.icon||"◇")+'</span><strong>'+esc(c.name)+'</strong><small>'+esc(c.description||"")+'</small></button>').join(""));
 const animals=A.getAnimalhaAnimals?.(s.animalhaCategory)||[],wrap=$("#animalha-variation-wrap");
 if(wrap)wrap.hidden=!s.animalhaCategory;
 $("#animalha-variation-title")&&($("#animalha-variation-title").textContent=s.animalhaCategory?animals.length+" linhagens disponíveis":"Variações");
 $("#animalha-variation-grid")&&($("#animalha-variation-grid").innerHTML=animals.map(a=>'<button type="button" class="animal-card '+(s.animalha===a.id?"is-selected":"")+'" data-action="select-animalha" data-animal="'+esc(a.id)+'"><strong>'+esc(a.name)+'</strong><small>'+esc(a.lineage||"")+'</small><span>✓</span></button>').join(""));
}
function renderAppearance(){
 const s=state(),r=currentRace(),min=num(r?.height?.min,90),max=num(r?.height?.max,320),h=$("#height-range");
 if(h){h.min=min;h.max=max;h.value=Math.min(max,Math.max(min,num(s.appearance?.height,min)));}
 $("#height-value")&&($("#height-value").textContent=num(s.appearance?.height,min));
 $("#height-min-label")&&($("#height-min-label").textContent=min+" cm");
 $("#height-max-label")&&($("#height-max-label").textContent=max+" cm");
 $("#appearance-race-label")&&($("#appearance-race-label").textContent=r?.name||"Escolha uma raça");
 $("#appearance-size-label")&&($("#appearance-size-label").textContent=s.derivedStats?.size||"—");
 const src=window.AERIONPersonagemAssets?.getRaceImage?.(s.race,s.gender)||"",img=$("#appearance-image");
 if(img){img.hidden=!src;if(src)img.src=src;}
 const selected=skin.find(x=>x.name===s.appearance?.skinTone);
 $("#skin-value")&&($("#skin-value").textContent=s.appearance?.skinTone||"Escolher");
 $("#skin-swatch")&&( $("#skin-swatch").style.background=selected?.color||"transparent");
 const pop=$("#skin-picker");
 if(pop&&!pop.dataset.ready){pop.dataset.ready="1";pop.innerHTML=skin.map(x=>'<button type="button" class="swatch-option" data-action="select-skin" data-value="'+esc(x.name)+'"><span class="swatch" style="background:'+x.color+'"></span><span><strong>'+esc(x.name)+'</strong><small>'+esc(x.desc)+'</small></span></button>').join("");}
 $("#hair-grid")&&($("#hair-grid").innerHTML=hair.map(v=>'<button type="button" class="mini-choice '+(s.appearance?.hairColor===v?"is-selected":"")+'" data-action="select-hair" data-value="'+esc(v)+'">'+esc(v)+'</button>').join(""));
 $("#eyes-grid")&&($("#eyes-grid").innerHTML=eyes.map(v=>'<button type="button" class="mini-choice '+(s.appearance?.eyeColor===v?"is-selected":"")+'" data-action="select-eyes" data-value="'+esc(v)+'">'+esc(v)+'</button>').join(""));
}
function renderClass(){
 const s=state(),root=$("#class-grid");if(!root)return;const cs=classMap();
 root.innerHTML=Object.values(cs).map(c=>'<button type="button" class="class-card '+(s.class===c.id?"is-selected":"")+'" data-action="select-class" data-class="'+esc(c.id)+'"><div class="class-icon">'+esc(c.icon)+'</div><div class="class-copy"><strong>'+esc(c.name)+'</strong><span>'+esc(c.role)+'</span><p>'+esc(c.description)+'</p></div><div class="class-mana"><span>MANA</span><strong>'+num(c.mana)+'</strong></div><span class="selection-check">✓</span></button>').join("");
}
function renderAttributes(){
 const s=state(),attrs=api()?.getAttributes?.()||[],dice=api()?.getDice?.()||[],used=new Set(Object.values(s.assignedDice||{}));
 $("#dice-pool")&&($("#dice-pool").innerHTML=dice.map(d=>'<span class="pool-die '+(used.has(d.id)?"is-used":"")+'">'+esc(d.label)+'</span>').join(""));
 $("#attribute-grid")&&($("#attribute-grid").innerHTML=attrs.map(a=>{const d=dice.find(x=>x.id===s.assignedDice?.[a.id]);const bonus=num(s.derivedStats?.racialModifiers?.[a.id],0);return '<article class="attribute-card '+(d?"is-filled":"")+'"><div class="attribute-card-header"><div><span>'+esc(a.short)+'</span><strong>'+esc(a.name)+'</strong></div><span class="racial-bonus-badge" '+(bonus?'':'hidden')+'>'+esc(bonus>0?"+": "")+bonus+' raça</span></div><div class="attribute-value"><strong>'+esc(d?.label||"—")+'</strong>'+(d?'<button type="button" class="icon-action" data-action="remove-die" data-attribute="'+esc(a.id)+'">×</button>':'')+'</div><div class="attribute-dice">'+dice.map(x=>'<button type="button" class="mini-die '+(d?.id===x.id?"is-selected":"")+' '+(used.has(x.id)&&d?.id!==x.id?"is-disabled":"")+'" '+(used.has(x.id)&&d?.id!==x.id?"disabled":"")+' data-action="assign-die" data-attribute="'+esc(a.id)+'" data-die="'+esc(x.id)+'">'+esc(x.label)+'</button>').join("")+'</div></article>';}).join(""));
 $("#attributes-status")&&($("#attributes-status").textContent=attrs.every(a=>s.assignedDice?.[a.id])?"Todos os atributos receberam um dado.":"Distribua um dado em cada atributo.");
}
function renderPower(){
 const s=state(),c=classMap()[s.class];
 $("#power-roll-result")&&($("#power-roll-result").textContent=s.powerRoll??"—");
 $("#mana-value")&&($("#mana-value").textContent=num(s.mana?.max,0));
 $("#mana-class-label")&&($("#mana-class-label").textContent=c?c.name+" · reserva inicial":"Escolha uma classe para ver sua reserva.");
 $("#uncommon-powers")&&($("#uncommon-powers").innerHTML=["Gelo","Magnetismo","Vegetação","Tecnologia","Gravidade"].map(p=>'<button type="button" class="choice-card '+(s.primaryPower===p?"is-selected":"")+'" data-action="select-uncommon-power" data-power="'+esc(p)+'"><strong>'+esc(p)+'</strong><span>Incomum</span></button>').join(""));
 $("#power-summary")&&($("#power-summary").hidden=!s.primaryPower);
 if($("#power-summary")&&s.primaryPower)$("#power-summary").innerHTML='<strong>Poder principal: '+esc(s.primaryPower)+'</strong><span>'+((s.powerMode==="d100"&&s.powerRoll)?"D100 "+s.powerRoll+".":"")+'</span>'+(s.customPowerDescription?'<span>'+esc(s.customPowerDescription)+'</span>':"");
 $$("[data-power]").forEach(e=>{if(e===document.activeElement)return;e.value=e.dataset.power==="customPower"&&s.powerMode==="custom"?s.primaryPower||"":e.dataset.power==="customDescription"?s.customPowerDescription||"":"";});
}
function attrDie(sk){const d=(api()?.getDice?.()||[]).find(x=>x.id===state().assignedDice?.[sk.attribute]);return d?.label||"—";}
function renderSkills(){
 const s=state(),root=$("#skills-grid"),skills=api()?.getSkills?.()||[];if(!root)return;
 root.innerHTML=skills.map(sk=>{const v=s.skills?.[sk.id]||{trained:false,bonus:0};return '<article class="skill-card '+(v.trained?"is-trained":"")+'"><div class="skill-main"><div><span class="ficha-eyebrow">'+esc(sk.attribute)+'</span><h3>'+esc(sk.name)+'</h3><p>'+esc(sk.desc)+'</p></div><div class="skill-die">'+esc(attrDie(sk))+'</div></div><div class="skill-foot"><button type="button" class="training-toggle '+(v.trained?"is-trained":"")+'" data-action="toggle-skill" data-skill="'+esc(sk.id)+'">'+(v.trained?"Treinada":"Não treinada")+'</button><label class="skill-bonus"><span>Bônus</span><input type="number" min="0" max="20" value="'+num(v.bonus,0)+'" data-skill-bonus="1" data-id="'+esc(sk.id)+'"></label></div></article>';}).join("");
}
function renderTechniques(){
 const root=$("#techniques-list"),s=state();if(!root)return;
 root.innerHTML=s.techniques?.length?s.techniques.map(t=>'<article class="technique-card"><div class="technique-head"><input value="'+esc(t.name)+'" data-technique="name" data-id="'+esc(t.id)+'"><button type="button" class="icon-action danger" data-action="remove-technique" data-id="'+esc(t.id)+'">×</button></div><div class="technique-fields"><label><span>Nível</span><input type="number" min="1" max="5" value="'+num(t.level,1)+'" data-technique="level" data-id="'+esc(t.id)+'"></label><label><span>XP</span><input type="number" min="0" max="120" value="'+num(t.xp,0)+'" data-technique="xp" data-id="'+esc(t.id)+'"></label><label><span>Mana</span><input type="number" min="0" value="'+num(t.cost,0)+'" data-technique="cost" data-id="'+esc(t.id)+'"></label><label><span>Ação</span><input value="'+esc(t.action)+'" data-technique="action" data-id="'+esc(t.id)+'"></label><label><span>Alcance</span><input value="'+esc(t.range)+'" data-technique="range" data-id="'+esc(t.id)+'"></label><label class="field--full"><span>Efeito</span><textarea data-technique="effect" data-id="'+esc(t.id)+'">'+esc(t.effect)+'</textarea></label></div></article>').join(""):'<div class="empty-state"><strong>Nenhuma técnica registrada.</strong><span>Adicione sua primeira técnica.</span></div>';
}
function renderInventory(){
 const root=$("#inventory-list"),s=state(),c=classMap()[s.class]||{},inv=s.inventory||[],slots=inv.reduce((n,i)=>n+num(i.slots,1)*num(i.quantity,1),0),weight=inv.reduce((n,i)=>n+num(i.weight,0)*num(i.quantity,1),0),stateLabel=weight<=num(c.weight,0)?"Normal":weight<=num(c.weight,0)*1.25?"Sobrecarregado":"Excesso extremo";
 $("#slots-used")&&($("#slots-used").textContent=slots);$("#slots-max")&&($("#slots-max").textContent=c.slots||"—");$("#weight-used")&&($("#weight-used").textContent=weight.toFixed(1));$("#weight-max")&&($("#weight-max").textContent=c.weight||"—");$("#encumbrance-state")&&($("#encumbrance-state").textContent=stateLabel);
 if(root)root.innerHTML=inv.length?inv.map(i=>'<article class="inventory-card"><div class="inventory-head"><input value="'+esc(i.name)+'" data-item="name" data-id="'+esc(i.id)+'"><button type="button" class="icon-action danger" data-action="remove-item" data-id="'+esc(i.id)+'">×</button></div><div class="inventory-fields"><label><span>Slots</span><input type="number" min="0" value="'+num(i.slots,1)+'" data-item="slots" data-id="'+esc(i.id)+'"></label><label><span>Peso kg</span><input type="number" min="0" step=".1" value="'+num(i.weight,1)+'" data-item="weight" data-id="'+esc(i.id)+'"></label><label><span>Qtd.</span><input type="number" min="1" value="'+num(i.quantity,1)+'" data-item="quantity" data-id="'+esc(i.id)+'"></label></div></article>').join(""):'<div class="empty-state"><strong>Inventário vazio.</strong><span>Adicione os equipamentos que deseja levar.</span></div>';
}
function renderReview(){
 const s=state(),attrs=api()?.getAttributes?.()||[],skills=api()?.getSkills?.()||[],dice=api()?.getDice?.()||[],cls=classMap()[s.class];
 const a=attrs.map(x=>'<span><b>'+esc(x.short)+'</b>'+esc(dice.find(d=>d.id===s.assignedDice?.[x.id])?.label||"—")+'</span>').join("");
 const trained=skills.filter(x=>s.skills?.[x.id]?.trained).map(x=>x.name).join(", ")||"Nenhuma";
 const c=$("#review-grid");if(!c)return;
 c.innerHTML='<article class="review-card"><span class="ficha-eyebrow">IDENTIDADE</span><h3>'+esc(s.name||"Sem nome")+'</h3><p>'+esc([s.gender,s.origin].filter(Boolean).join(" · ")||"—")+'</p></article><article class="review-card"><span class="ficha-eyebrow">RAÇA & CLASSE</span><h3>'+esc(s.race||"—")+'</h3><p>'+esc([s.animalha,cls?.name].filter(Boolean).join(" · ")||"—")+'</p></article><article class="review-card"><span class="ficha-eyebrow">ATRIBUTOS</span><div class="review-attribute-list">'+a+'</div></article><article class="review-card"><span class="ficha-eyebrow">PODER & MANA</span><h3>'+esc(s.primaryPower||"—")+'</h3><p>'+num(s.mana?.max,0)+' Mana</p></article><article class="review-card"><span class="ficha-eyebrow">PERÍCIAS</span><p>'+esc(trained)+'</p></article><article class="review-card"><span class="ficha-eyebrow">TÉCNICAS</span><p>'+esc((s.techniques||[]).map(t=>t.name).join(", ")||"Nenhuma")+'</p></article><article class="review-card"><span class="ficha-eyebrow">INVENTÁRIO</span><p>'+esc((s.inventory||[]).map(i=>i.name+" ×"+i.quantity).join(", ")||"Vazio")+'</p></article><article class="review-card review-card--stats"><div><span>HP</span><strong>'+num(s.hp?.max,10)+'</strong></div><div><span>DEF</span><strong>'+num(s.defense,10)+'</strong></div><div><span>MOV</span><strong>'+num(s.movement,9)+'m</strong></div></article>';
}
function render(){renderPreview();renderIdentity();renderRace();renderAppearance();renderClass();renderAttributes();renderPower();renderSkills();renderTechniques();renderInventory();renderReview();}
function start(){render();window.addEventListener("aerion:ficha:update",render);window.addEventListener("aerion:ficha:render",render);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();