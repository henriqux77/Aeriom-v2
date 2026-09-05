(() => {
"use strict";
const R={
  humano:{hp:0,def:0,movement:9,mods:{presenca:1},size:"Médio",res:[],senses:["Sentidos humanos normais"],abilities:["Adaptação"]},
  elfo:{hp:0,def:1,movement:10,mods:{agilidade:1,percepcao:1},size:"Médio",res:["Efeitos mentais sobrenaturais leves"],senses:["Visão na penumbra","Percepção de Mana"],abilities:["Percepção Élfica"]},
  anao:{hp:3,def:2,movement:7,mods:{vigor:1},size:"Pequeno",res:["Empurrões","Quedas"],senses:["Visão subterrânea"],abilities:["Forja Ancestral"]},
  orc:{hp:4,def:1,movement:9,mods:{forca:1,vigor:1},size:"Grande",res:["Dano físico"],senses:["Olfato aguçado"],abilities:["Fúria de Sangue"]},
  centauro:{hp:3,def:1,movement:13,mods:{forca:1,agilidade:1},size:"Grande",res:["Impacto de quedas"],senses:["Percepção de distância"],abilities:["Galope Ancestral"]},
  vampiro:{hp:1,def:2,movement:10,mods:{agilidade:1,presenca:1},size:"Médio",res:["Dano físico comum"],senses:["Visão noturna","Audição aguçada"],abilities:["Regeneração Sanguínea"]},
  duende:{hp:-1,def:-1,movement:8,mods:{agilidade:1,intelecto:1},size:"Pequeno",res:[],senses:["Percepção de detalhes"],abilities:["Fortuna Mercante"]},
  fada:{hp:-2,def:0,movement:9,mods:{agilidade:1,controle:1},size:"Pequeno",res:["Efeitos mágicos leves"],senses:["Sentidos feéricos"],abilities:["Bênção Feérica"]},
  povo_aquatico:{hp:2,def:0,movement:8,water:10,mods:{vigor:1,percepcao:1},size:"Médio",res:["Pressão aquática"],senses:["Respiração aquática"],abilities:["Anfíbio"]},
  povo_nuvens:{hp:0,def:0,movement:10,mods:{agilidade:1,percepcao:1},size:"Médio",res:["Altitude"],senses:["Percepção de vento e altitude"],abilities:["Passo do Céu"]},
  povo_natureza:{hp:1,def:0,movement:9,mods:{vigor:1},size:"Médio",res:["Toxinas naturais"],senses:["Percepção ambiental"],abilities:["Vínculo Natural"]},
  neraliano:{hp:2,def:1,movement:8,water:10,mods:{vigor:1,controle:1},size:"Médio",res:["Pressão","Frio aquático"],senses:["Respiração aquática","Vibrações na água"],abilities:["Adaptação Abissal"]},
  aureano:{hp:1,def:1,movement:10,mods:{presenca:1,agilidade:1},size:"Médio",res:["Baixa pressão"],senses:["Visão de longa distância"],abilities:["Corpo Celestial"]},
  colosso:{hp:7,def:3,movement:8,mods:{forca:2,vigor:1},size:"Colossal",res:["Físico excepcional","Impacto"],senses:["Grande alcance visual"],abilities:["Asas Colossais"]},
  troll:{hp:6,def:3,movement:8,mods:{forca:2,vigor:1},size:"Grande",res:["Dano físico","Impacto"],senses:["Olfato aguçado"],abilities:["Regeneração Brutal"]},
  animalha:{hp:0,def:0,movement:9,mods:{},size:"Variável",res:[],senses:["Sentidos animais"],abilities:[]}
};
const A={
  gato:{hp:0,def:1,movement:10,mods:{agilidade:1},profile:"Reflexos felinos",senses:["Audição aguçada","Visão noturna"],abilities:["Reflexos Felinos"]},
  pantera:{hp:0,def:1,movement:11,mods:{agilidade:1},profile:"Predador furtivo",senses:["Visão noturna","Audição aguçada"],abilities:["Passos Silenciosos"]},
  tigre:{hp:1,def:1,movement:10,mods:{forca:1},profile:"Predador poderoso",senses:["Olfato aguçado"],abilities:["Predador"]},
  leao:{hp:1,def:1,movement:10,mods:{presenca:1},profile:"Predador dominante",senses:["Olfato aguçado"],abilities:["Presença Dominante"]},
  lobo:{hp:1,def:0,movement:10,mods:{percepcao:1},profile:"Caçador de matilha",senses:["Olfato aguçado","Audição aguçada"],abilities:["Rastreio"]},
  raposa:{hp:0,def:1,movement:9,mods:{intelecto:1},profile:"Astuta",senses:["Audição aguçada"],abilities:["Astúcia"]},
  urso:{hp:2,def:1,movement:8,mods:{vigor:1},profile:"Robusto",senses:["Olfato aguçado"],abilities:["Força Ursina"]},
  falcao:{hp:-1,def:1,movement:12,mods:{percepcao:1},profile:"Caçador aéreo",senses:["Visão de longa distância"],abilities:["Voo"]},
  aguia:{hp:-1,def:1,movement:12,mods:{percepcao:1},profile:"Predador aéreo",senses:["Visão de longa distância"],abilities:["Voo Ágil"]},
  coruja:{hp:-1,def:1,movement:11,mods:{percepcao:1},profile:"Caçador noturno",senses:["Visão noturna","Audição aguçada"],abilities:["Olhar Noturno"]},
  cobra:{hp:0,def:0,movement:8,mods:{percepcao:1},profile:"Predador sinuoso",senses:["Percepção térmica","Vibrações"],abilities:["Sentido Térmico"]},
  crocodilo:{hp:2,def:2,movement:7,water:10,mods:{vigor:1},profile:"Caçador anfíbio",senses:["Vibrações na água"],abilities:["Couro Resistente"]},
  tubarao:{hp:2,def:1,movement:7,water:12,mods:{percepcao:1},profile:"Predador aquático",senses:["Percepção de sangue na água","Vibrações"],abilities:["Caça Aquática"]}
};
const norm=v=>String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"_");
function calculate(s){
  const base=R[norm(s?.race)]||R.humano;
  const key=norm(typeof s?.animalha==="string"?s.animalha:s?.animalha?.animal||s?.animalha?.variation);
  const lineage=norm(s?.race)==="animalha"?(A[key]||{}):{};
  const mods={...(base.mods||{}),...(lineage.mods||{})};
  return {hp:Math.max(1,10+(base.hp||0)+(lineage.hp||0)),defense:Math.max(1,10+(base.def||0)+(lineage.def||0)),movement:lineage.movement??base.movement??9,waterMovement:lineage.water??base.water??null,mods,size:base.size||"Médio",profile:lineage.profile||"",resistances:[...new Set([...(base.res||[]),...(lineage.res||[])])],senses:[...new Set([...(base.senses||[]),...(lineage.senses||[])])],abilities:[...(base.abilities||[]),...(lineage.abilities||[])]};
}
window.AERION_RACIAL_RULES=Object.freeze({version:"1.0",calculate,races:R,animalha:A});
})();