/* =========================================================
   AERION — PERSONAGEM ASSETS
   Catálogo visual consolidado.
   ========================================================= */
(() => {
  "use strict";

  const VERSION = 10;

  const pairImages = [
    {
      race:"animalha",
      male:"https://i.ibb.co/mV94b1vK/file-00000000dee8820eb4f157009c1ceb5b.png",
      female:"https://i.ibb.co/gbP4Tx0x/file-000000003cb0820e842b5d0997ee34f5.png"
    },
    {
      race:"colosso",
      male:"https://i.ibb.co/MkgrWPnf/file-00000000a170820eaf15f8650242c3c9.png",
      female:"https://i.ibb.co/MkTmcZxc/file-000000001e48820ebb3f101b2dc9f0f3.png"
    },
    {
      race:"neraliano",
      male:"https://i.ibb.co/GQ51CTfr/file-00000000b344820e9cd0c4ace952b82c.png",
      female:"https://i.ibb.co/Zzn3TRDT/file-000000007a70820ea18c5cf3ce6529b7.png"
    },
    {
      race:"povo_natureza",
      male:"https://i.ibb.co/8qtYvfd/file-00000000e4b0820eab531990258bbb09.png",
      female:"https://i.ibb.co/N6C75zkX/file-000000001b7c820e8a317d79973c8733.png"
    },
    {
      race:"povo_nuvens",
      male:"https://i.ibb.co/C5L91tgZ/file-0000000089f0820e89d6953c4857240c.png",
      female:"https://i.ibb.co/SXYVf9Bs/file-00000000779c820ea18c5cf3ce6529b7.png"
    },
    {
      race:"povo_aquatico",
      male:"https://i.ibb.co/qFWcNhJG/file-00000000f014820e954413d3d309ae96.png",
      female:"https://i.ibb.co/BKzMBd4n/file-000000008c00820ebf7da3010a79bf7c.png"
    },
    {
      race:"fada",
      male:"https://i.ibb.co/HTZzCQM4/file-000000003eb4820ebb3f101b2dc9f0f3.png",
      female:"https://i.ibb.co/Zp8z4NzH/file-00000000639c820e85562494fed2f3d6.png"
    },
    {
      race:"duende",
      male:"https://i.ibb.co/1Yh8qxJQ/file-00000000d1ec820eb0c562669244c953.png",
      female:"https://i.ibb.co/HDYJtsDf/file-000000001ce8820ea3db1f6c8da1c8dd.png"
    },
    {
      race:"vampiro",
      male:"https://i.ibb.co/p6PfF563/file-0000000019dc820ea49a893a9831ffeb.png",
      female:"https://i.ibb.co/JRX44rnH/file-000000008cfc820e827a7b8376d3fd55.png"
    },
    {
      race:"centauro",
      male:"https://i.ibb.co/zHmxKwLS/file-00000000e5c8820ebb67aa67f2d7a1b8.png",
      female:"https://i.ibb.co/KcPtMvxt/file-000000007e1c820ebec26e736b57ba50.png"
    },
    {
      race:"orc",
      male:"https://i.ibb.co/1Jr9NxJf/file-00000000decc820e9cd0c4ace952b82c.png",
      female:"https://i.ibb.co/fWFkyLS/file-00000000e724820ebbe72fa63e4e81e3.png"
    },
    {
      race:"anao",
      male:"https://i.ibb.co/RpJF2JFY/file-000000001824820e952c5a665ae3496f.png",
      female:"https://i.ibb.co/39m7zLqY/file-00000000a4fc820e9bd0551b2472e125.png"
    },
    {
      race:"elfo",
      male:"https://i.ibb.co/Zbk4qXM/file-00000000dcf8820e883635d6ca9de492.png",
      female:"https://i.ibb.co/xq6Xz2dG/file-00000000495c820e99fc5de509918d90.png"
    },
    {
      race:"humano",
      male:"https://i.ibb.co/rKGXTzDt/file-000000004b94820ead12a26ca92d75b7.png",
      female:"https://i.ibb.co/ymbZDFh9/file-000000008b74820ea8b432fcf06ed975.png"
    }
  ];

  const base = {
    humano:["Humano","Versátil e equilibrado.","Equilibrado","Versatilidade",{min:150,max:200},{min:16,max:90}],
    elfo:["Elfo","Povo ágil e perceptivo, ligado à natureza e à magia.","Ágil e perceptivo","Percepção elevada",{min:155,max:205},{min:18,max:500}],
    anao:["Anão","Povo compacto e resistente.","Robusto","Resistência",{min:125,max:155},{min:20,max:250}],
    orc:["Orc","Povo de estrutura poderosa.","Forte e robusto","Potência física",{min:175,max:225},{min:14,max:75}],
    centauro:["Centauro","Povo de anatomia híbrida.","Potente e resistente","Anatomia híbrida",{min:180,max:230},{min:16,max:100}],
    vampiro:["Vampiro","Ser sobrenatural de grande afinidade vital.","Sobrenatural","Natureza vampírica",{min:150,max:200},{min:18,max:500}],
    duende:["Duende","Pequeno povo astuto e adaptável.","Ágil e astuto","Pequeno porte",{min:100,max:145},{min:12,max:120}],
    fada:["Fada","Ser feérico ligado à magia.","Leve e ágil","Afinidade feérica",{min:90,max:140},{min:10,max:300}],
    povo_aquatico:["Povo Aquático","Povo adaptado a ambientes aquáticos.","Adaptado à água","Adaptação aquática",{min:145,max:205},{min:16,max:120}],
    povo_nuvens:["Povo das Nuvens","Povo associado aos céus.","Leve","Afinidade aérea",{min:145,max:200},{min:16,max:150}],
    povo_natureza:["Povo da Natureza","Povo ligado à natureza.","Ligado à natureza","Afinidade natural",{min:140,max:205},{min:15,max:180}],
    neraliano:["Neraliano","Povo adaptado a ambientes aquáticos e costeiros.","Adaptável","Afinidade aquática",{min:145,max:205},{min:16,max:130}],
    aureano:["Aureano","Povo de forte presença e características singulares.","Equilibrado","Características especiais",{min:150,max:205},{min:18,max:220}],
    colosso:["Colosso","Raça de porte colossal.","Colossal","Grande porte",{min:220,max:320},{min:20,max:180}]
  };

  const RACES = Object.entries(base).map(([id,v]) => {
    const pair = pairImages.find(x => x.race === id);
    return {
      id,
      name:v[0],
      description:v[1],
      profile:v[2],
      feature:v[3],
      height:v[4],
      lifespan:v[5],
      images: pair ? {masculino:pair.male,feminino:pair.female} : {},
      imagesPending: !pair
    };
  });

  RACES.push({
    id:"animalha",
    name:"Animalha",
    description:"Humanoide de linhagem animal com características próprias.",
    profile:"Definido pela linhagem animal",
    feature:"Características animais",
    height:{min:140,max:220},
    lifespan:{min:1,max:100},
    images:{},
    lineage:"animalha"
  });

  const ANIMALHA_CATEGORIES = [
    {id:"voadores",name:"Voadores",description:"Linhagens com características aéreas.",icon:"◇"},
    {id:"terrestres",name:"Terrestres",description:"Linhagens adaptadas ao ambiente terrestre.",icon:"◇"},
    {id:"marinhos",name:"Marinhos",description:"Linhagens adaptadas ao ambiente aquático.",icon:"◇"},
    {id:"reptilianos",name:"Reptilianos",description:"Linhagens de origem reptiliana.",icon:"◇"},
    {id:"pequenos",name:"Pequenos",description:"Linhagens de pequeno porte.",icon:"◇"},
    {id:"grandes",name:"Grandes",description:"Linhagens de grande porte.",icon:"◇"}
  ];

  const ANIMALHA_ANIMALS = {
    gato:{id:"gato",name:"Gato",category:"terrestres",lineage:"felino",lifespan:{min:15,max:22}},
    pantera:{id:"pantera",name:"Pantera",category:"terrestres",lineage:"felino",lifespan:{min:12,max:18}},
    tigre:{id:"tigre",name:"Tigre",category:"terrestres",lineage:"felino",lifespan:{min:10,max:18}},
    leao:{id:"leao",name:"Leão",category:"terrestres",lineage:"felino",lifespan:{min:15,max:22}},
    lobo:{id:"lobo",name:"Lobo",category:"terrestres",lineage:"canino",lifespan:{min:8,max:15}},
    raposa:{id:"raposa",name:"Raposa",category:"terrestres",lineage:"canino",lifespan:{min:8,max:14}},
    urso:{id:"urso",name:"Urso",category:"grandes",lineage:"ursino",lifespan:{min:20,max:35}},
    falcao:{id:"falcao",name:"Falcão",category:"voadores",lineage:"ave",lifespan:{min:12,max:25}},
    aguia:{id:"aguia",name:"Águia",category:"voadores",lineage:"ave",lifespan:{min:20,max:35}},
    coruja:{id:"coruja",name:"Coruja",category:"voadores",lineage:"ave",lifespan:{min:10,max:25}},
    cobra:{id:"cobra",name:"Cobra",category:"reptilianos",lineage:"reptil",lifespan:{min:10,max:30}},
    crocodilo:{id:"crocodilo",name:"Crocodilo",category:"marinhos",lineage:"reptil",lifespan:{min:50,max:80}},
    tubarao:{id:"tubarao",name:"Tubarão",category:"marinhos",lineage:"aquatico",lifespan:{min:20,max:70}}
  };

  function normalizeId(v){
    return String(v??"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"_");
  }
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function getRace(id){const n=normalizeId(id);return RACES.find(r=>normalizeId(r.id)===n)||null;}
  function getAnimalha(id){return ANIMALHA_ANIMALS[normalizeId(id)]||null;}
  function getRaceImage(raceId,gender){
    const race=getRace(raceId); if(!race)return "";
    const key=normalizeId(gender)==="feminino"?"feminino":"masculino";
    return race.images?.[key]||race.images?.default||"";
  }
  function getAnimalhaImage(id,gender){
    const animal=getAnimalha(id); if(!animal)return "";
    return "";
  }
  function getRaceHeight(id){
    const race=getRace(id);
    return race?.height ? {min:Number(race.height.min)||150,max:Number(race.height.max)||200}:{min:150,max:200};
  }
  function getAgeRange(raceId,animalhaId=""){
    const race=getRace(raceId);
    if(race?.id==="animalha"){
      const animal=getAnimalha(animalhaId);
      if(animal?.lifespan)return clone(animal.lifespan);
    }
    return race?.lifespan ? clone(race.lifespan) : {min:1,max:100};
  }
  function getAnimalhaCategory(id){
    const n=normalizeId(id);
    return ANIMALHA_CATEGORIES.find(c=>normalizeId(c.id)===n)||null;
  }
  function getAnimalhaAnimals(categoryId=""){
    const n=normalizeId(categoryId);
    const all=Object.values(ANIMALHA_ANIMALS);
    return clone(n?all.filter(a=>normalizeId(a.category)===n):all);
  }

  const API=Object.freeze({
    version:VERSION,
    races:RACES,
    animalhaCategories:ANIMALHA_CATEGORIES,
    animalhaAnimals:ANIMALHA_ANIMALS,
    getRace,getRaceImage,getAnimalhaImage,getRaceHeight,getAgeRange,
    getAnimalhaCategory,getAnimalhaAnimals,getAnimalha,
    hasRace:id=>Boolean(getRace(id)),
    hasAnimalha:id=>Boolean(getAnimalha(id))
  });

  window.AERIONPersonagemAssets=API;
  window.AERION_CHARACTER_ASSETS=API;
  window.AERION_RACES=RACES;
  window.dispatchEvent(new CustomEvent("aerion:personagem-assets:ready",{detail:{
    version:VERSION,raceCount:RACES.length,animalhaCategoryCount:ANIMALHA_CATEGORIES.length,animalhaCount:Object.keys(ANIMALHA_ANIMALS).length
  }}));
})();