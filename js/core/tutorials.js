import "./supabase.js";

(() => {
  "use strict";
  const tutorials = [
    {id:"first-steps",icon:"✦",title:"Primeiros passos",desc:"Entenda o AERIOM do começo ao fim.",steps:[
      {eyebrow:"COMECE AQUI",title:"Crie ou entre em uma campanha",text:"Na página de Campanhas você reúne a mesa, cria uma aventura e acessa os recursos da campanha.",example:"Crie uma campanha chamada As Ruínas de Aster e entre nela.",target:"a[href='./campanhas.html']",href:"./campanhas.html"},
      {eyebrow:"DENTRO DA CAMPANHA",title:"Use o menu lateral",text:"Mapa mostra o mundo físico. Conhecimento organiza informações. Histórico registra acontecimentos.",example:"Mapa = onde. Conhecimento = o quê, quem e por quê. Histórico = o que aconteceu.",target:".campaign-sidebar"},
      {eyebrow:"PRONTO",title:"Continue aprendendo",text:"Escolha outro tutorial para aprender fichas, combate, mapas, Conhecimento, Mural e Homebrew.",example:"Você pode sair e voltar depois."}
    ]},
    {id:"character",icon:"♜",title:"Criar personagem",desc:"Monte sua ficha passo a passo.",steps:[
      {eyebrow:"FICHA",title:"Escolha a raça",text:"O AERIOM usa um carrossel para escolher a raça e recalcula os valores derivados.",example:"Troque de raça e observe Vida e Defesa.",target:"body",href:"./fichas.html"},
      {eyebrow:"CLASSE",title:"Escolha a classe",text:"Cada classe mostra itens iniciais e perícias treinadas.",example:"Compare Guerreiro, Monge, Controlador e Curandeiro."},
      {eyebrow:"FINALIZAÇÃO",title:"Revise e salve",text:"Complete aparência, atributos e demais etapas e salve a ficha.",example:"A ficha passa a acompanhar a campanha."}
    ]},
    {id:"campaign",icon:"⚔",title:"Campanha",desc:"Aprenda as ferramentas da mesa.",steps:[
      {eyebrow:"COMBATE",title:"Combate",text:"Iniciativa, turnos, combatentes, dano, loot e XP ficam no módulo de combate.",example:"O Mestre conduz e os jogadores acompanham.",target:"[data-campaign-tab='combat']"},
      {eyebrow:"MAPA",title:"Mapa físico",text:"Use mapas para locais e marcadores do mundo.",example:"Esconda um templo e revele o pin quando o grupo descobrir o local.",target:"[data-campaign-tab='maps']"},
      {eyebrow:"CONHECIMENTO",title:"Conhecimento",text:"Organize NPCs, locais, pistas, quests, facções, itens e relações.",example:"Mira → conhece → Mina Abandonada.",target:"[data-campaign-tab='knowledge']"},
      {eyebrow:"HISTÓRICO",title:"Histórico",text:"A linha do tempo registra acontecimentos da mesa.",example:"Registre uma descoberta importante.",target:"[data-campaign-tab='timeline']"}
    ]},
    {id:"knowledge",icon:"🧠",title:"Conhecimento",desc:"Construa a inteligência do mundo.",steps:[
      {eyebrow:"ENTIDADE",title:"Crie conhecimento",text:"Uma entidade pode ser NPC, local, pista, quest, facção, item, evento ou nota.",example:"NPC: Mira, a ferreira.",target:"[data-campaign-tab='knowledge']"},
      {eyebrow:"RELAÇÃO",title:"Relacione entidades",text:"Use Relacionar, escolha duas entidades e informe o significado da relação.",example:"Mira → protege → Oficina Real."},
      {eyebrow:"SEGREDO",title:"Controle o que é revelado",text:"Use visibilidade para manter informações restritas.",example:"A identidade do vilão pode ficar invisível para os jogadores."}
    ]},
    {id:"homebrew",icon:"✦",title:"Homebrew",desc:"Crie conteúdo próprio para o sistema.",steps:[
      {eyebrow:"CRIAR",title:"Escolha o tipo",text:"Crie raças, classes, poderes, técnicas, itens, monstros, receitas ou regras.",example:"Uma classe pode registrar Mana, itens iniciais e perícias.",target:"a[href='./homebrew.html']"},
      {eyebrow:"PUBLICAR",title:"Publique",text:"Ao publicar, o conteúdo pode ser usado onde o AERIOM oferece suporte.",example:"Uma raça publicada pode aparecer na criação de personagem."},
      {eyebrow:"COMPARTILHAR",title:"Compartilhe",text:"Use o compartilhamento para distribuir seu conteúdo.",example:"Envie o link para seu grupo."}
    ]}
  ];
  const state={active:null,index:0};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const saved=()=>{try{return JSON.parse(localStorage.getItem("aeriom.tutorial.progress")||"null")}catch{return null}};
  function save(){localStorage.setItem("aeriom.tutorial.progress",JSON.stringify({id:state.active,index:state.index}))}
  function ensureGuideUi(){
    if($("tutorial-overlay"))return;
    if(!new URLSearchParams(location.search).has("tutorial"))return;
    const wrap=document.createElement("div");
    wrap.innerHTML='<div id="tutorial-overlay" class="tutorial-overlay" hidden><div class="tutorial-backdrop"></div><div id="tutorial-highlight" class="tutorial-highlight"></div><div id="tutorial-arrow" class="tutorial-arrow">➜</div><section id="tutorial-card" class="tutorial-card"><div class="tutorial-card__progress"><span id="tutorial-progress">1/1</span><button id="tutorial-close">×</button></div><p id="tutorial-card-eyebrow" class="tutorial-eyebrow"></p><h2 id="tutorial-card-title"></h2><p id="tutorial-card-text"></p><div id="tutorial-example" class="tutorial-example"></div><div class="tutorial-card__actions"><button id="tutorial-prev" class="tutorial-secondary">Anterior</button><button id="tutorial-next" class="tutorial-primary">Próximo</button></div></section></div>';
    document.body.appendChild(wrap.firstElementChild);
  }
  function renderList(){ $("tutorial-list").innerHTML=tutorials.map(t=>'<button class="tutorial-tile" type="button" data-tutorial="'+t.id+'"><span>'+t.icon+'</span><h3>'+esc(t.title)+'</h3><p>'+esc(t.desc)+'</p></button>').join(""); $("tutorial-list").querySelectorAll("[data-tutorial]").forEach(b=>b.onclick=()=>start(b.dataset.tutorial,0)); }
  function target(selector){if(!selector)return null;return document.querySelector(selector)}
  function samePageTarget(step){if(step.target)return target(step.target);return null}
  function navigateStep(step){
    if(!step.href)return false;
    const url=new URL(step.href,location.href);
    url.searchParams.set("tutorial",state.active);
    url.searchParams.set("tutorialStep",String(state.index));
    location.href=url.href;
    return true;
  }
  function focusTarget(selector){const h=$("tutorial-highlight"),a=$("tutorial-arrow"),el=target(selector);if(!el){h.style.display="none";a.style.display="none";return}el.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>{const r=el.getBoundingClientRect();h.style.display="block";h.style.left=Math.max(8,r.left-6)+"px";h.style.top=Math.max(8,r.top-6)+"px";h.style.width=Math.max(40,r.width+12)+"px";h.style.height=Math.max(36,r.height+12)+"px";a.style.display="block";a.style.left=Math.min(window.innerWidth-56,Math.max(12,r.right+10))+"px";a.style.top=Math.max(12,r.top+r.height/2-20)+"px"},160)}
  function renderStep(){const t=tutorials.find(x=>x.id===state.active),s=t?.steps[state.index];if(!s)return;$("tutorial-progress").textContent=(state.index+1)+"/"+t.steps.length;$("tutorial-card-eyebrow").textContent=s.eyebrow;$("tutorial-card-title").textContent=s.title;$("tutorial-card-text").textContent=s.text;$("tutorial-example").innerHTML="<strong>Exemplo</strong><br>"+esc(s.example);$("tutorial-prev").disabled=state.index===0;$("tutorial-next").textContent=state.index===t.steps.length-1?"Concluir":"Próximo";$("tutorial-next").dataset.go=s.href||"";save();focusTarget(s.target)}
  function start(id,index){state.active=id;state.index=index||0;$("tutorial-overlay").hidden=false;renderStep()}
  function close(){state.active=null;$("tutorial-overlay").hidden=true;$("tutorial-highlight").style.display="none";$("tutorial-arrow").style.display="none"}
  function bind(){
    ensureGuideUi();
    const params=new URLSearchParams(location.search),resumeId=params.get("tutorial"),resumeStep=Number(params.get("tutorialStep")||0);
    if(resumeId&&tutorials.some(t=>t.id===resumeId)) start(resumeId,resumeStep);
    renderList();
    $("tutorial-next").onclick=()=>{const t=tutorials.find(x=>x.id===state.active);if(!t)return;const s=t.steps[state.index];if(s.href&&state.index<t.steps.length-1){if(navigateStep(s))return}if(state.index<t.steps.length-1){state.index++;renderStep()}else{localStorage.removeItem("aeriom.tutorial.progress");close()}};
    $("tutorial-prev").onclick=()=>{if(state.index>0){state.index--;renderStep()}};
    $("tutorial-close").onclick=close;
    $("tutorial-continue").onclick=()=>{const s=saved();if(s&&tutorials.some(t=>t.id===s.id))start(s.id,s.index);else start("first-steps",0)};
    window.addEventListener("resize",()=>{const t=tutorials.find(x=>x.id===state.active),s=t?.steps[state.index];if(s)focusTarget(s.target)});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();