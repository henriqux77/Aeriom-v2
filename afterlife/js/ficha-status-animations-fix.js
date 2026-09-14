import './afterlife-sidebar.js?v=20260914-33';

(() => {
  'use strict';
  if (!document.body.classList.contains('character-builder')) return;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const STYLE_ID = 'afterlife-ficha-v10-runtime';

  const css = `
.character-builder .combat-status-ring{position:relative!important;isolation:isolate!important;overflow:visible!important;animation:none!important;transform:none!important}
.character-builder .combat-status-ring::before{content:""!important;position:absolute!important;inset:-9px!important;z-index:1!important;box-sizing:border-box!important;border:5px solid transparent!important;border-radius:50%!important;pointer-events:none!important;animation:afterlifeStatusOrbit 2.4s linear infinite!important;transform-origin:50% 50%!important}
.character-builder .combat-status-card.hp .combat-status-ring::before{border-top-color:#ff625f!important;border-right-color:#ff625f!important;filter:drop-shadow(0 0 7px rgba(255,98,95,.45))!important}
.character-builder .combat-status-card.def .combat-status-ring::before{border-top-color:#39f58a!important;border-left-color:#39f58a!important;filter:drop-shadow(0 0 7px rgba(57,245,138,.40))!important;animation-direction:reverse!important}
.character-builder .combat-status-icon{position:relative!important;z-index:2!important;transform:none!important;animation:none!important}
.character-builder .combat-status-card.hp .combat-status-icon{animation:afterlifeHeartBeat 1.05s ease-in-out infinite!important}

.character-builder .carousel-window > .carousel-arrow{display:none!important;visibility:hidden!important;pointer-events:none!important;width:0!important;height:0!important;opacity:0!important}
.character-builder .carousel-footer{position:relative!important;z-index:100!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin-top:12px!important;padding:10px 2px 2px!important}
.character-builder .carousel-dots{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:120px!important;min-height:20px!important;overflow:visible!important}
.character-builder .carousel-dots button{appearance:none!important;width:8px!important;height:8px!important;min-width:8px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#2b3a32!important;box-shadow:none!important;cursor:pointer!important;transition:width .28s ease,background .28s ease,box-shadow .28s ease,transform .28s ease!important}
.character-builder .carousel-dots button:hover{transform:scale(1.18)!important;background:#4a5f54!important}
.character-builder .carousel-dots button.is-active{width:28px!important;height:8px!important;border-radius:999px!important;background:#39f58a!important;box-shadow:0 0 16px rgba(57,245,138,.28)!important}
.character-builder .footer-actions{display:grid!important;grid-template-columns:minmax(112px,1fr) minmax(112px,1fr) minmax(165px,1.35fr)!important;gap:8px!important;align-items:stretch!important}
.character-builder .footer-actions .btn{appearance:none!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:46px!important;height:46px!important;padding:0 16px!important;border-radius:11px!important;text-decoration:none!important;font:800 10px/1 Inter,system-ui,sans-serif!important;letter-spacing:.2px!important;cursor:pointer!important;transition:transform .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease!important}
.character-builder .footer-actions .btn:hover{transform:translateY(-1px)!important}
.character-builder .footer-actions .btn:active{transform:translateY(1px) scale(.99)!important}
.character-builder .footer-actions .btn:disabled{opacity:.32!important;cursor:not-allowed!important;transform:none!important}
.character-builder .footer-actions .btn--ghost{border:1px solid rgba(127,160,145,.18)!important;background:rgba(8,15,11,.76)!important;color:#cbd7d0!important}
.character-builder .footer-actions .btn--ghost:hover{border-color:rgba(57,245,138,.28)!important;background:rgba(9,21,14,.94)!important;color:#e9f4ee!important}
.character-builder .footer-actions .btn--primary{border:1px solid rgba(57,245,138,.45)!important;background:linear-gradient(135deg,#32e981,#58f7a1)!important;color:#03200f!important;box-shadow:0 8px 24px rgba(57,245,138,.12)!important}

.character-builder .class-carousel-v4{position:relative!important;z-index:20!important;display:grid!important;grid-template-columns:48px minmax(0,1fr) 48px!important;align-items:center!important;gap:8px!important;margin-top:22px!important}
.character-builder .class-deck{position:relative!important;z-index:10!important;display:block!important;min-height:350px!important;margin:0!important;overflow:visible!important;perspective:1200px!important}
.character-builder .class-card{position:absolute!important;left:50%!important;top:22px!important;width:min(270px,70%)!important;min-height:270px!important;margin:0!important;transform-origin:center center!important;transition:transform .42s cubic-bezier(.22,.78,.2,1),opacity .32s ease,filter .32s ease,box-shadow .42s ease,border-color .32s ease!important;will-change:transform,opacity!important;cursor:pointer!important}
.character-builder .class-card.selected{display:flex!important;z-index:40!important;opacity:1!important;filter:none!important;transform:translateX(-50%) scale(1.04)!important;border-color:rgba(57,245,138,.42)!important;box-shadow:0 26px 65px rgba(0,0,0,.46),0 0 35px rgba(57,245,138,.08)!important}
.character-builder .class-card.side{display:flex!important;z-index:15!important;opacity:.56!important;filter:saturate(.68)!important}
.character-builder .class-card.is-left{transform:translateX(calc(-50% - 156px)) scale(.78)!important}
.character-builder .class-card.is-right{transform:translateX(calc(-50% + 156px)) scale(.78)!important}
.character-builder .class-card.is-left:hover,.character-builder .class-card.is-right:hover{opacity:.8!important;filter:saturate(.84)!important}
.character-builder .class-arrow{position:relative!important;z-index:70!important;width:46px!important;height:46px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid rgba(57,245,138,.28)!important;border-radius:50%!important;background:rgba(3,11,7,.95)!important;color:#edf8f2!important;font:400 30px/1 Inter,sans-serif!important;cursor:pointer!important;box-shadow:0 9px 26px rgba(0,0,0,.36)!important;transition:transform .2s ease,border-color .2s ease,background .2s ease!important}
.character-builder .class-arrow:hover{transform:scale(1.08)!important;border-color:rgba(57,245,138,.58)!important;background:#081a10!important}

.character-builder .profession-builder{margin-top:22px!important}
.character-builder .profession-deck-wrap{position:relative!important;display:grid!important;grid-template-columns:52px minmax(0,1fr) 52px!important;align-items:center!important;gap:8px!important}
.character-builder .profession-deck{position:relative!important;min-height:390px!important;perspective:1300px!important;overflow:visible!important;touch-action:pan-y!important}
.character-builder .profession-card{position:absolute!important;left:50%!important;top:18px!important;width:min(340px,78%)!important;min-height:345px!important;padding:28px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;box-sizing:border-box!important;border:1px solid rgba(57,245,138,.13)!important;border-radius:24px!important;background:linear-gradient(155deg,rgba(11,29,20,.96),rgba(4,12,8,.98))!important;color:#edf6f0!important;text-align:left!important;cursor:pointer!important;opacity:.42!important;filter:saturate(.62) blur(.15px)!important;transform:translateX(-50%) scale(.73)!important;transition:transform .45s cubic-bezier(.22,.78,.2,1),opacity .35s ease,filter .35s ease,border-color .35s ease,box-shadow .45s ease!important;will-change:transform,opacity!important}
.character-builder .profession-card.is-left{transform:translateX(calc(-50% - 205px)) scale(.71)!important;z-index:10!important}
.character-builder .profession-card.is-right{transform:translateX(calc(-50% + 205px)) scale(.71)!important;z-index:10!important}
.character-builder .profession-card.is-selected{transform:translateX(-50%) scale(1)!important;z-index:30!important;opacity:1!important;filter:none!important;border-color:rgba(57,245,138,.46)!important;box-shadow:0 28px 75px rgba(0,0,0,.4),0 0 42px rgba(57,245,138,.08),inset 0 0 0 1px rgba(57,245,138,.08)!important}
.character-builder .profession-card .profession-icon{width:70px!important;height:70px!important;display:grid!important;place-items:center!important;border:1px solid rgba(57,245,138,.19)!important;border-radius:20px!important;background:radial-gradient(circle at 35% 30%,rgba(57,245,138,.2),rgba(57,245,138,.035) 55%,rgba(0,0,0,.1))!important;color:#39f58a!important;font:500 31px/1 Inter,sans-serif!important;box-shadow:0 0 30px rgba(57,245,138,.07)!important;transition:transform .35s ease,box-shadow .35s ease!important}
.character-builder .profession-card.is-selected .profession-icon{transform:translateY(-2px) scale(1.04)!important;box-shadow:0 0 30px rgba(57,245,138,.16)!important}
.character-builder .profession-card .profession-meta{display:flex!important;flex-direction:column!important;gap:8px!important}
.character-builder .profession-card h3{margin:0!important;font:800 25px/1.05 'Space Grotesk',Inter,sans-serif!important;letter-spacing:-.5px!important}
.character-builder .profession-card p{margin:0!important;color:#91a199!important;font:500 12px/1.55 Inter,sans-serif!important}
.character-builder .profession-card .profession-skill-row{display:flex!important;flex-wrap:wrap!important;gap:6px!important}
.character-builder .profession-card .profession-skill-row span{display:inline-flex!important;padding:7px 9px!important;border:1px solid rgba(57,245,138,.11)!important;border-radius:999px!important;background:rgba(57,245,138,.045)!important;color:#b9c8bf!important;font:700 9px/1 Inter,sans-serif!important}
.character-builder .profession-card .profession-select{display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;min-height:42px!important;margin-top:6px!important;border:1px solid rgba(57,245,138,.2)!important;border-radius:12px!important;background:rgba(57,245,138,.06)!important;color:#9df8bd!important;font:800 10px/1 Inter,sans-serif!important;letter-spacing:.5px!important}
.character-builder .profession-card.is-selected .profession-select{background:linear-gradient(135deg,rgba(57,245,138,.18),rgba(57,245,138,.07))!important;border-color:rgba(57,245,138,.42)!important;color:#39f58a!important}
.character-builder .profession-arrow{position:relative!important;z-index:60!important;width:46px!important;height:46px!important;display:grid!important;place-items:center!important;border:1px solid rgba(57,245,138,.27)!important;border-radius:50%!important;background:rgba(3,10,7,.95)!important;color:#eaf5ef!important;font:400 30px/1 Inter,sans-serif!important;cursor:pointer!important;box-shadow:0 10px 26px rgba(0,0,0,.34)!important;transition:transform .2s ease,background .2s ease,border-color .2s ease!important}
.character-builder .profession-arrow:hover{transform:scale(1.08)!important;background:rgba(7,24,15,.98)!important;border-color:rgba(57,245,138,.52)!important}
.character-builder .profession-arrow:active{transform:scale(.94)!important}
.character-builder .profession-summary{margin-top:16px!important;padding:20px!important;border:1px solid rgba(57,245,138,.15)!important;border-radius:18px!important;background:linear-gradient(145deg,rgba(8,25,16,.9),rgba(3,10,7,.92))!important}
.character-builder .profession-summary-head{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:12px!important;margin-bottom:16px!important}
.character-builder .profession-summary-head span{display:block!important;color:#5e7669!important;font:800 8px/1 Inter,sans-serif!important;letter-spacing:2px!important}
.character-builder .profession-summary-head h3{margin:4px 0 0!important;color:#39f58a!important;font:800 21px/1.05 'Space Grotesk',Inter,sans-serif!important}
.character-builder .profession-summary-check{color:#9df8bd!important;font:800 9px/1 Inter,sans-serif!important;white-space:nowrap!important}
.character-builder .profession-summary-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}
.character-builder .profession-summary-box{padding:12px!important;border:1px solid rgba(127,160,145,.1)!important;border-radius:12px!important;background:rgba(0,0,0,.12)!important}
.character-builder .profession-summary-box b{display:block!important;margin-bottom:6px!important;color:#718379!important;font:800 8px/1 Inter,sans-serif!important;letter-spacing:1.2px!important}
.character-builder .profession-summary-box p{margin:0!important;color:#cbd7d0!important;font:600 10px/1.55 Inter,sans-serif!important}
.character-builder .profession-final-card{margin-top:10px!important}

@keyframes afterlifeStatusOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes afterlifeHeartBeat{0%,100%{transform:scale(1)}12%{transform:scale(1.16)}24%{transform:scale(.96)}36%{transform:scale(1.10)}50%{transform:scale(1)}}

@media(max-width:980px){
  .character-builder .class-carousel-v4,.character-builder .profession-deck-wrap{grid-template-columns:46px minmax(0,1fr) 46px!important;gap:4px!important}
  .character-builder .class-deck{min-height:330px!important}
  .character-builder .class-card{width:68%!important;min-height:260px!important;top:22px!important}
  .character-builder .class-card.is-left{transform:translateX(calc(-50% - 118px)) scale(.62)!important}
  .character-builder .class-card.is-right{transform:translateX(calc(-50% + 118px)) scale(.62)!important}
  .character-builder .class-card.selected{transform:translateX(-50%) scale(.98)!important}
  .character-builder .class-arrow,.character-builder .profession-arrow{width:40px!important;height:40px!important;font-size:27px!important}
  .character-builder .profession-card{width:min(315px,80%)!important}
  .character-builder .profession-card.is-left{transform:translateX(calc(-50% - 160px)) scale(.66)!important}
  .character-builder .profession-card.is-right{transform:translateX(calc(-50% + 160px)) scale(.66)!important}
}
@media(max-width:720px){
  .character-builder .profession-deck{min-height:395px!important}
  .character-builder .profession-card{top:12px!important;width:78%!important;min-height:355px!important;padding:22px!important}
  .character-builder .profession-card.is-left{transform:translateX(calc(-50% - 118px)) scale(.55)!important;opacity:.3!important}
  .character-builder .profession-card.is-right{transform:translateX(calc(-50% + 118px)) scale(.55)!important;opacity:.3!important}
  .character-builder .profession-card.is-selected{transform:translateX(-50%) scale(.96)!important}
  .character-builder .profession-card .profession-icon{width:62px!important;height:62px!important}
  .character-builder .profession-card h3{font-size:23px!important}
  .character-builder .profession-summary-grid{grid-template-columns:1fr!important}
  .character-builder .carousel-footer{flex-direction:column!important;align-items:stretch!important;gap:8px!important}
  .character-builder .carousel-dots{order:0!important;width:100%!important;min-width:0!important}
  .character-builder .footer-actions{width:100%!important;grid-template-columns:1fr 1fr!important}
  .character-builder .footer-actions .btn:last-child{grid-column:1/-1!important}
}
@media(max-width:420px){
  .character-builder .profession-card.is-left{transform:translateX(calc(-50% - 94px)) scale(.5)!important}
  .character-builder .profession-card.is-right{transform:translateX(calc(-50% + 94px)) scale(.5)!important}
  .character-builder .profession-card.is-selected{transform:translateX(-50%) scale(.92)!important}
  .character-builder .profession-deck{min-height:385px!important}
  .character-builder .footer-actions .btn{min-height:44px!important;height:44px!important;padding:0 10px!important;font-size:9px!important}
  .character-builder .carousel-dots{gap:6px!important}
  .character-builder .carousel-dots button.is-active{width:24px!important}
}
@media(prefers-reduced-motion:reduce){.character-builder .combat-status-ring::before,.character-builder .combat-status-card.hp .combat-status-icon,.character-builder .class-card,.character-builder .profession-card{animation:none!important;transition:none!important}}
`;

  const mountStyle=()=>{let s=document.getElementById(STYLE_ID);if(!s){s=document.createElement('style');s.id=STYLE_ID;document.head.appendChild(s)}s.textContent=css};

  const professions=[
    {name:'Médico',icon:'✚',desc:'Diagnóstico, cirurgia e medicina de emergência.',skills:'Medicina • Diagnóstico',equip:'Estetoscópio • Kit médico',bonus:'Tratamentos têm maior eficiência.'},
    {name:'Enfermeiro',icon:'✚',desc:'Você aprendeu a manter pessoas vivas sob pressão.',skills:'Primeiros Socorros • Triagem',equip:'Kit médico • Ataduras',bonus:'Bônus ao estabilizar aliados.'},
    {name:'Policial',icon:'★',desc:'Patrulha, contenção e leitura de situações de ameaça.',skills:'Percepção • Armas',equip:'Algemas • Rádio',bonus:'+1 em testes de ameaça.'},
    {name:'Bombeiro',icon:'⛑',desc:'Resgate, incêndios e operações em ambientes perigosos.',skills:'Resgate • Resistência',equip:'Capacete • Ferramenta de resgate',bonus:'+1 em ações de emergência.'},
    {name:'Engenheiro',icon:'⚒',desc:'Projetos e soluções técnicas quando tudo está quebrado.',skills:'Engenharia • Construção',equip:'Ferramentas • Planta',bonus:'+1 em reparos complexos.'},
    {name:'Mecânico',icon:'⚙',desc:'Você sabe fazer máquinas voltarem a funcionar.',skills:'Reparos • Veículos',equip:'Caixa de ferramentas • Chave',bonus:'+1 em consertos mecânicos.'},
    {name:'Professor',icon:'▣',desc:'Conhecimento, comunicação e capacidade de ensinar o grupo.',skills:'Educação • Pesquisa',equip:'Caderno • Material didático',bonus:'Pode ensinar um conhecimento após estudo.'},
    {name:'Cozinheiro',icon:'♨',desc:'Transforme poucos recursos em refeições que sustentam.',skills:'Culinária • Conservação',equip:'Faca • Utensílios',bonus:'Melhora a eficiência de alimentos preparados.'},
    {name:'Agricultor',icon:'⚒',desc:'Plantas, solo e produção de alimento fazem parte da sua rotina.',skills:'Agricultura • Natureza',equip:'Enxada • Sementes',bonus:'+1 em cultivo e coleta de plantas.'},
    {name:'Eletricista',icon:'⚡',desc:'Cabos, geradores e energia ainda obedecem às suas mãos.',skills:'Eletricidade • Reparos',equip:'Multímetro • Alicate',bonus:'+1 em sistemas elétricos.'},
    {name:'Militar',icon:'✪',desc:'Treinamento, disciplina e sobrevivência em operações hostis.',skills:'Combate • Tática',equip:'Kit tático • Cantil',bonus:'+1 em testes de combate coordenado.'},
    {name:'Motorista',icon:'◉',desc:'Estradas, rotas e veículos são sua especialidade.',skills:'Condução • Navegação',equip:'Kit veicular • Mapa',bonus:'Maior controle em perseguições e viagens.'},
    {name:'Caçador',icon:'⌖',desc:'Rastreio, silêncio e leitura de sinais mantêm você vivo.',skills:'Rastreamento • Sobrevivência',equip:'Mochila de caça • Armadilha',bonus:'+1 para rastrear e encontrar alimento.'},
    {name:'Jornalista',icon:'◫',desc:'Você sabe observar, investigar e conseguir informação.',skills:'Investigação • Comunicação',equip:'Câmera • Gravador',bonus:'+1 para obter informações de testemunhas.'},
    {name:'Programador',icon:'</>',desc:'Código, redes e sistemas digitais ainda podem abrir caminhos.',skills:'Tecnologia • Sistemas',equip:'Notebook • Adaptadores',bonus:'+1 em testes de tecnologia.'},
    {name:'Farmacêutico',icon:'⚗',desc:'Medicamentos, doses e armazenamento eram seu cotidiano.',skills:'Farmacologia • Química',equip:'Maleta farmacêutica • Frascos',bonus:'Identifica medicamentos com mais facilidade.'}
  ];
  let professionIndex=1, professionTouchX=null, step=0, touchX=null;

  function injectProfessionStage(){
    const track=$('#carouselTrack');
    if(!track||$('#professionStage'))return;
    const oldSlides=$$('.builder-slide');
    const appearance=oldSlides.find(s=>s.dataset.slide==='2')||oldSlides[2];
    if(!appearance)return;
    oldSlides.filter(s=>Number(s.dataset.slide)>=2).forEach(s=>s.dataset.slide=String(Number(s.dataset.slide)+1));
    const stage=document.createElement('article');stage.className='builder-slide';stage.id='professionStage';stage.dataset.slide='2';
    stage.innerHTML=`<div class="slide-kicker">03 · PROFISSÃO</div><h2>Qual era sua profissão?</h2><p>Antes do colapso, você já tinha habilidades que podem fazer a diferença.</p><div class="profession-builder"><div class="profession-deck-wrap"><button class="profession-arrow" id="professionPrev" type="button" aria-label="Profissão anterior">‹</button><div class="profession-deck" id="professionDeck" tabindex="0" aria-label="Carrossel de profissões"></div><button class="profession-arrow" id="professionNext" type="button" aria-label="Próxima profissão">›</button></div><div class="profession-summary" id="professionSummary"><div class="profession-summary-head"><div><span>PROFISSÃO SELECIONADA</span><h3 id="professionSummaryName">Enfermeiro</h3></div><div class="profession-summary-check">✓ Selecionada</div></div><div class="profession-summary-grid"><div class="profession-summary-box"><b>HABILIDADES</b><p id="professionSummarySkills"></p></div><div class="profession-summary-box"><b>EQUIPAMENTO INICIAL</b><p id="professionSummaryEquip"></p></div><div class="profession-summary-box"><b>BÔNUS</b><p id="professionSummaryBonus"></p></div><div class="profession-summary-box"><b>IMPACTO</b><p><strong>Escolha permanente da ficha.</strong> Define conhecimentos e recursos de partida.</p></div></div><div class="profession-save-data" id="professionSaveData"></div></div></div>`;
    track.insertBefore(stage,appearance);

    const rail=document.querySelector('.builder-rail');
    if(rail){
      const oldSteps=$$('.builder-step');
      oldSteps.filter(s=>Number(s.dataset.step)>=2).forEach(s=>s.dataset.step=String(Number(s.dataset.step)+1));
      const ref=oldSteps.find(s=>s.dataset.step==='3')||oldSteps[2];
      const ps=document.createElement('button');ps.className='builder-step';ps.type='button';ps.dataset.step='2';ps.innerHTML='<span>03</span><b>Profissão</b><small>O que fazia antes</small>';
      rail.insertBefore(ps,ref||null);
    }
  }

  function renderProfession(){
    const deck=$('#professionDeck');if(!deck)return;deck.replaceChildren();
    professions.forEach((p,i)=>{const c=document.createElement('button');c.type='button';c.className='profession-card';c.dataset.professionIndex=i;c.innerHTML=`<span class="profession-icon" aria-hidden="true">${p.icon}</span><div class="profession-meta"><h3>${p.name}</h3><p>${p.desc}</p><div class="profession-skill-row"><span>${p.skills.split(' • ')[0]}</span><span>${p.skills.split(' • ')[1]}</span></div></div><span class="profession-select">${i===professionIndex?'✓ SELECIONADA':'SELECIONAR'}</span>`;c.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();professionIndex=i;renderProfession();updateProfessionSummary();syncFinalProfession()});deck.appendChild(c)});
    const n=professions.length;
    $$('.profession-card').forEach((c,i)=>{c.classList.remove('is-left','is-right','is-selected');const d=(i-professionIndex+n)%n;if(i===professionIndex)c.classList.add('is-selected');else if(d===1)c.classList.add('is-right');else c.classList.add('is-left')});
  }
  function moveProfession(d){professionIndex=(professionIndex+d+professions.length)%professions.length;renderProfession();updateProfessionSummary();syncFinalProfession()}
  function updateProfessionSummary(){const p=professions[professionIndex];[['professionSummaryName',p.name],['professionSummarySkills',p.skills],['professionSummaryEquip',p.equip],['professionSummaryBonus',p.bonus],['professionSaveData',JSON.stringify({profession:p.name,skills:p.skills,equipment:p.equip,bonus:p.bonus})]].forEach(([id,v])=>{const e=$('#'+id);if(e)e.textContent=v});document.body.dataset.selectedProfession=p.name}

  function renderDots(){const host=$('#carouselDots');if(!host)return;host.replaceChildren();allSlides().forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className=i===step?'is-active':'';b.dataset.afterlifeStep=i;b.setAttribute('aria-label','Ir para etapa '+(i+1));host.appendChild(b)})}
  function allSlides(){return $$('.builder-slide')}
  function setStep(n){const slides=allSlides(),steps=$$('.builder-step');if(!slides.length)return;step=Math.max(0,Math.min(slides.length-1,Number(n)||0));slides.forEach((s,i)=>{s.classList.toggle('is-active',i===step);s.setAttribute('aria-hidden',i===step?'false':'true')});steps.forEach((s,i)=>{s.classList.toggle('is-active',i===step);s.classList.toggle('is-complete',i<step);s.setAttribute('aria-current',i===step?'step':'false')});const count=$('#stepCount');if(count)count.textContent=`${String(step+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;const status=$('#stepStatusLabel');if(status)status.textContent=labels[step]||'';const bar=$('#progressBar');if(bar)bar.style.width=((step+1)/slides.length*100)+'%';if($('#prevStep'))$('#prevStep').disabled=step===0;if($('#nextStep'))$('#nextStep').disabled=step===slides.length-1;if($('#backStep'))$('#backStep').disabled=step===0;if($('#nextAction')){$('#nextAction').disabled=false;$('#nextAction').textContent=step===slides.length-1?'FINALIZAR FICHA ✓':'CONTINUAR →'}renderDots();const a=slides[step];if(a){a.classList.remove('afterlife-step-enter');void a.offsetWidth;a.classList.add('afterlife-step-enter')}if(step===2){renderProfession();updateProfessionSummary()}if(step===7)syncFinalProfession();window.scrollTo({top:0,behavior:'smooth'})}
  function labelsSetup(){}
  function syncFinalProfession(){const p=professions[professionIndex];[['finalProfession',p.name],['finalProfessionSkills',p.skills],['finalProfessionEquip',p.equip],['finalProfessionBonus',p.bonus]].forEach(([id,v])=>{const e=$('#'+id);if(e)e.textContent=v})}
  function injectFinalProfessionCard(){const review=$('.final-review-layout-v4');if(!review||$('#finalProfessionCard'))return;const card=document.createElement('div');card.className='review-card-v4 review-card-v4--wide profession-final-card';card.id='finalProfessionCard';card.innerHTML='<div class="review-title">PROFISSÃO</div><div class="review-text-stack"><p><b>Profissão</b><span id="finalProfession">Enfermeiro</span></p><p><b>Habilidades</b><span id="finalProfessionSkills"></span></p><p><b>Equipamento</b><span id="finalProfessionEquip"></span></p><p><b>Bônus</b><span id="finalProfessionBonus"></span></p></div>';review.insertBefore(card,review.querySelector('.review-card-v4--wide'))}

  const labels=['IDENTIDADE','ORIGEM','PROFISSÃO','APARÊNCIA','CLASSE','ATRIBUTOS','CONCEITO','REVISÃO FINAL'];
  function bindNavigation(){
    document.addEventListener('click',(e)=>{
      const t=e.target?.closest?.('button,a');if(!t)return;
      const dot=t.dataset.afterlifeStep;const rail=t.classList.contains('builder-step')?t.dataset.step:null;
      if(dot!==undefined){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setStep(dot);return}
      if(rail!==null){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setStep(rail);return}
      if(t.id==='prevStep'||t.id==='backStep'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setStep(step-1);return}
      if(t.id==='nextStep'||t.id==='nextAction'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(step<allSlides().length-1)setStep(step+1);return}
      if(t.id==='cancelBuilder'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.href='./index.html';}
    },true);
    document.addEventListener('keydown',(e)=>{const tag=e.target?.tagName?.toLowerCase();if(['input','textarea','select','button'].includes(tag))return;if(e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();setStep(step+1)}if(e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();setStep(step-1)}},true);
    const tr=$('#carouselTrack');if(tr){tr.addEventListener('touchstart',e=>{if(e.touches.length===1)touchX=e.touches[0].clientX},{passive:true,capture:true});tr.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>55){e.stopImmediatePropagation();setStep(step+(dx<0?1:-1))}},{passive:true,capture:true})}
    const deck=$('#professionDeck');if(deck){deck.addEventListener('touchstart',e=>{if(e.touches.length===1)professionTouchX=e.touches[0].clientX},{passive:true});deck.addEventListener('touchend',e=>{if(professionTouchX===null)return;const dx=e.changedTouches[0].clientX-professionTouchX;professionTouchX=null;if(Math.abs(dx)>40){e.preventDefault();moveProfession(dx<0?1:-1)}},{passive:false})}
    $('#professionPrev')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();moveProfession(-1)},true);
    $('#professionNext')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();moveProfession(1)},true);
  }

  function boot(){mountStyle();injectProfessionStage();injectFinalProfessionCard();neutralizeOldStepArrows();renderProfession();updateProfessionSummary();syncFinalProfession();bindNavigation();setStep(0)}
  function neutralizeOldStepArrows(){['prevStep','nextStep'].forEach(id=>{const e=document.getElementById(id);if(!e)return;e.setAttribute('aria-hidden','true');e.tabIndex=-1;e.disabled=true})}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
