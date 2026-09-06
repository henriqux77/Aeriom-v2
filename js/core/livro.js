const S=[
["Visão Geral","01 · Fundamentos","CONFIRMADO","AERION é um sistema próprio de RPG de mesa acompanhado por uma aplicação web. A aplicação reúne ficha, campanha, dados, testes, personagens, inventário, Mana, Poder, técnicas, mapas e recursos de mesa.",[["Princípio","O aplicativo deve funcionar como uma mesa virtual própria, sem copiar outra plataforma."],["Dados","Um atributo não é um número fixo. FOR = D12 significa que o teste de Força rola 1D12."]]],
["Atributos & Dados","02 · Personagem","CONFIRMADO","O AERION usa tipos de dado como valor estrutural dos atributos.",[["FOR","Força"],["AGI","Agilidade"],["PER","Percepção"],["VIG","Vigor"],["INT","Intelecto"],["PRE","Presença"],["CON","Controle"],["Dados possíveis","D4, D6, D8, D10, D12 e D20."]]],
["Perícias","03 · Testes","CONFIRMADO","A perícia usa o dado do atributo relacionado e acrescenta o bônus de treinamento.",[["Acrobacia","Agilidade"],["Atletismo","Força"],["Furtividade","Agilidade"],["Pontaria","Agilidade"],["Percepção","Percepção"],["Investigação","Intelecto"],["Conhecimento","Intelecto"],["Medicina","Intelecto"],["Sobrevivência","Percepção"],["Persuasão","Presença"],["Enganação","Presença"],["Intuição","Percepção"],["Tática","Intelecto"],["Ofício / Crafting","Controle"],["Fórmula","Dado do atributo + bônus."]]],
["Poder & Mana","04 · Recursos","EM REVISÃO","A sexta etapa da criação reúne afinidade de Poder e reserva de Mana.",[["Poder Elemental","D100: 01–25 Fogo, 26–50 Terra, 51–75 Água, 76–100 Ar."],["Poderes Incomuns","Gelo, Magnetismo, Vegetação, Tecnologia e Gravidade já foram discutidos."],["Mana","Feiticeiro 100, Curandeiro 80, Guerreiro 50 e Monge 30. Valores ainda podem ser balanceados."]]],
["Combate","05 · Mesa","CONFIRMADO","A estrutura de turno combina ações de diferentes escalas.",[["Iniciativa","1D de Agilidade; maior resultado age primeiro."],["Rodada","1 Ação Principal + 1 Movimento + 1 Ação Rápida + 1 Reação."],["Ataque","1D do atributo apropriado + bônus."],["Defesa","Resultado igual ou maior que Defesa acerta."]]],
["Inventário","06 · Equipamento","CONFIRMADO","O inventário combina slots e peso.",[["Guerreiro","16 Slots · 40 kg"],["Feiticeiro","12 Slots · 25 kg"],["Curandeiro","14 Slots · 30 kg"],["Monge","10 Slots · 20 kg"],["Estados","Normal, Sobrecarregado e Excesso Extremo."]]],
["Técnicas","07 · Progressão","PROPOSTA","Técnicas possuem cinco níveis de domínio e podem receber especializações.",[["Níveis","Aprendiz, Praticante, Experiente, Mestre e Supremo."],["XP proposto","1→2 = 15 · 2→3 = 40 · 3→4 = 75 · 4→5 = 120 XP."],["Especializações","Alcance, Controle/Eficiência, Potência e Aplicação."]]],
["Criação de Ficha","08 · Procedimento","CONFIRMADO","A criação possui 10 etapas: Identidade, Raça, Aparência, Classe, Atributos, Poder + Mana, Perícias, Técnicas, Inventário e Revisão.",[["Autosave","A ficha nasce como draft com UUID próprio e continua disponível mesmo incompleta."],["Finalização","Ao finalizar, o status passa para completed e a ficha pode entrar em campanha."],["Aparência","Descrição livre, cicatrizes e outros detalhes personalizados estão disponíveis."],["Idade","A idade fica em Aparência e usa a faixa de vida da raça/linhagem."]]],
["Campanhas & Mesa","09 · Aplicação","CONFIRMADO","Uma ficha pronta pode ser vinculada a uma campanha, com validação no Supabase.",[["Personagem","Uma ficha finalizada não pode pertencer a duas campanhas simultaneamente."],["Mapa","Mapas podem possuir pins com posição e visibilidade controlada."],["Linha do tempo","Existe infraestrutura para registrar eventos gerais da campanha."]]],
["Status das Regras","10 · Governança","IMPORTANTE","O livro mantém separado o que é regra estabelecida do que ainda está em balanceamento.",[["CONFIRMADO","Regra já estabelecida."],["PROPOSTA","Ideia ainda sujeita a mudança."],["EM REVISÃO","Implementação ou decisão parcial que ainda não deve ser tratada como definitiva."]]]
];

const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const input=document.getElementById("book-search"),index=document.getElementById("book-index-list"),content=document.getElementById("book-content"),status=document.getElementById("book-search-status"),count=document.getElementById("book-result-count");

function render(q=""){
 const text=q.trim().toLowerCase();
 const hits=S.filter(x=>([x[0],x[1],x[2],x[3]].concat(x[4].flat())).join(" ").toLowerCase().includes(text));
 index.replaceChildren();content.replaceChildren();count.textContent=String(hits.length);
 status.textContent=text?hits.length+" seção(ões) encontradas para “"+text+"”.":"Mostrando todas as seções.";
 if(!hits.length){content.innerHTML="<div class='book-empty'><strong>Nenhum resultado.</strong><p>Tente outra palavra ou o nome de uma seção.</p></div>";return;}
 hits.forEach((x,n)=>{
  const b=document.createElement("button");b.type="button";b.className=n===0?"is-active":"";
  b.innerHTML="<strong>"+e(x[0])+"</strong><span>"+e(x[1])+"</span>";
  b.onclick=()=>document.getElementById("chapter-"+x[0].toLowerCase().replace(/[^a-z0-9]+/g,"-"))?.scrollIntoView({behavior:"smooth",block:"start"});
  index.appendChild(b);
  const sec=document.createElement("section");sec.className="book-chapter";sec.id="chapter-"+x[0].toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const cards=x[4].slice(0,14).map(y=>"<article class='book-card'><h3>"+e(y[0])+"</h3><p>"+e(y[1])+"</p></article>").join("");
  sec.innerHTML="<span class='book-chapter__eyebrow'>"+e(x[1])+"</span><span class='book-status'>"+e(x[2])+"</span><h2>"+e(x[0])+"</h2><p>"+e(x[3])+"</p><div class='book-grid'>"+cards+"</div>";
  content.appendChild(sec);
 });
}
input.addEventListener("input",e=>render(e.target.value));render();