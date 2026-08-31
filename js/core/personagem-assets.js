/* =========================================================
   AERION — PERSONAGEM ASSETS
   js/core/personagem-assets.js

   CATÁLOGO DO GERADOR DE APARÊNCIA 2D

   Este arquivo NÃO:
   - controla a ficha;
   - salva dados;
   - calcula atributos;
   - controla dados;
   - manipula o DOM.

   Este arquivo DEFINE:
   - peças;
   - categorias;
   - paletas;
   - camadas;
   - anatomias;
   - restrições raciais;
   - opções do personagem;
   - presets;
   - configurações do renderizador.

   O personagem-render.js interpreta este catálogo.

   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     VERSÃO
     ========================================================= */

  const VERSION = 2;


  /* =========================================================
     AUXILIARES
     ========================================================= */

  function option(id, name, extra = {}) {
    return {
      id,
      name,
      enabled: true,
      ...extra
    };
  }

  function palette(id, name, colors, extra = {}) {
    return {
      id,
      name,
      colors: [...colors],
      ...extra
    };
  }

  function immutable(value) {
    return Object.freeze(value);
  }


  /* =========================================================
     CAMADAS
     ========================================================= */

  const LAYERS = immutable({
    BACKGROUND: 0,
    SHADOW: 10,

    WINGS_BACK: 20,
    TAIL_BACK: 25,
    BACK_HAIR: 30,

    BODY: 40,
    BODY_MARKINGS: 45,

    LEGS: 50,
    FEET: 55,

    CLOTHING_UNDER: 60,
    CLOTHING_MAIN: 70,
    CLOTHING_UPPER: 80,

    ARMOR: 90,

    WINGS_FRONT: 95,

    NECK: 100,
    FACE: 110,
    EARS: 115,
    HORNS: 120,

    HAIR: 130,
    FACIAL_FEATURES: 140,

    FACE_MARKINGS: 145,

    HEADWEAR: 150,
    MASK: 155,

    JEWELRY: 160,

    ACCESSORY_BACK: 165,
    ACCESSORY: 170,
    HAND_ACCESSORY: 175,

    WEAPON_BACK: 180,
    WEAPON: 190,

    EFFECT: 200
  });


  /* =========================================================
     PARTES DO PERSONAGEM
     ========================================================= */

  const PARTS = immutable({
    BODY: "body",
    BODY_SHAPE: "body_shape",
    HEAD_SHAPE: "head_shape",

    FACE: "face",
    EYES: "eyes",
    EYEBROWS: "eyebrows",
    NOSE: "nose",
    MOUTH: "mouth",

    EARS: "ears",
    HAIR: "hair",
    FACIAL_HAIR: "facial_hair",

    HORNS: "horns",
    WINGS: "wings",
    TAIL: "tail",

    SKIN: "skin",

    MARKINGS: "markings",
    BIRTHMARK: "birthmark",
    SCARS: "scars",
    TATTOOS: "tattoos",
    PIERCINGS: "piercings",

    CLOTHING_BASE: "clothing_base",
    SHIRT: "shirt",
    PANTS: "pants",
    SKIRT: "skirt",
    DRESS: "dress",
    COAT: "coat",
    CAPE: "cape",
    ROBE: "robe",
    TUNIC: "tunic",
    BELT: "belt",
    GLOVES: "gloves",
    BOOTS: "boots",
    SOCKS: "socks",

    ARMOR: "armor",
    SHOULDER_ARMOR: "shoulder_armor",
    CHEST_ARMOR: "chest_armor",
    ARM_ARMOR: "arm_armor",
    LEG_ARMOR: "leg_armor",
    HELMET: "helmet",

    HAT: "hat",
    HEADBAND: "headband",
    HOOD: "hood",
    MASK: "mask",
    GLASSES: "glasses",

    NECKLACE: "necklace",
    EARRINGS: "earrings",
    BRACELET: "bracelet",
    RING: "ring",
    WATCH: "watch",

    BAG: "bag",
    POUCH: "pouch",
    BACKPACK: "backpack",
    QUIVER: "quiver",
    HOLSTER: "holster",
    SCABBARD: "scabbard",

    WEAPON: "weapon",
    OFF_HAND: "off_hand",
    TRINKET: "trinket",
    PROP: "prop"
  });


  /* =========================================================
     CATEGORIAS VISUAIS
     ========================================================= */

  const CATEGORIES = immutable([
    {
      id: "body",
      name: "Corpo",
      description: "Forma e proporções corporais.",
      order: 10
    },

    {
      id: "skin",
      name: "Pele",
      description: "Tom e variações raciais.",
      order: 20
    },

    {
      id: "face",
      name: "Rosto",
      description: "Formato do rosto e características faciais.",
      order: 30
    },

    {
      id: "eyes",
      name: "Olhos",
      description: "Formato, cor e detalhes dos olhos.",
      order: 40
    },

    {
      id: "hair",
      name: "Cabelo",
      description: "Estilo, comprimento e cor.",
      order: 50
    },

    {
      id: "facial_hair",
      name: "Pelos",
      description: "Barba, bigode e pelos faciais.",
      order: 60
    },

    {
      id: "anatomy",
      name: "Anatomia racial",
      description: "Orelhas, chifres, asas, caudas e outras partes.",
      order: 70
    },

    {
      id: "markings",
      name: "Marcas",
      description: "Manchas, marcas de nascença e padrões.",
      order: 80
    },

    {
      id: "scars",
      name: "Cicatrizes",
      description: "Cicatrizes e marcas adquiridas.",
      order: 90
    },

    {
      id: "tattoos",
      name: "Tatuagens",
      description: "Desenhos e símbolos corporais.",
      order: 100
    },

    {
      id: "piercings",
      name: "Piercings",
      description: "Piercings e joias corporais.",
      order: 110
    },

    {
      id: "clothing",
      name: "Roupas",
      description: "Vestimenta principal.",
      order: 120
    },

    {
      id: "armor",
      name: "Armadura",
      description: "Proteções visuais e equipamentos.",
      order: 130
    },

    {
      id: "headwear",
      name: "Cabeça",
      description: "Chapéus, capuzes, máscaras e óculos.",
      order: 140
    },

    {
      id: "jewelry",
      name: "Acessórios",
      description: "Joias e acessórios.",
      order: 150
    },

    {
      id: "equipment",
      name: "Equipamentos",
      description: "Bolsas, mochilas, armas e objetos.",
      order: 160
    }
  ]);


  /* =========================================================
     MORFOLOGIA
     ========================================================= */

  const BODY_TYPES = immutable([
    option("slim", "Delgado", {
      description:
        "Estrutura mais estreita.",
      width:
        0.88
    }),

    option("lean", "Atlético", {
      description:
        "Estrutura definida e equilibrada.",
      width:
        0.95
    }),

    option("average", "Médio", {
      description:
        "Proporção equilibrada.",
      width:
        1
    }),

    option("broad", "Robusto", {
      description:
        "Ombros e tronco mais largos.",
      width:
        1.12
    }),

    option("heavy", "Pesado", {
      description:
        "Estrutura corporal volumosa.",
      width:
        1.20
    })
  ]);


  const BODY_PROPORTIONS = immutable({
    height: {
      min: 0.75,
      max: 1.25
    },

    width: {
      min: 0.82,
      max: 1.20
    },

    shoulders: {
      min: 0.85,
      max: 1.18
    },

    torso: {
      min: 0.90,
      max: 1.15
    },

    arms: {
      min: 0.90,
      max: 1.12
    },

    legs: {
      min: 0.88,
      max: 1.15
    },

    head: {
      min: 0.90,
      max: 1.12
    }
  });


  /* =========================================================
     PALETAS RACIAIS DE PELE
     ========================================================= */

  const SKIN_PALETTES = immutable({

    humana: palette(
      "humana",
      "Humana",
      [
        "#f3d8c0",
        "#e9c5a8",
        "#d7ac8b",
        "#c28f70",
        "#a87155",
        "#8c5c46",
        "#704536",
        "#56352b"
      ]
    ),

    elfica: palette(
      "elfica",
      "Élfica",
      [
        "#f1ddcb",
        "#e5c7b0",
        "#d5ad93",
        "#bb9176",
        "#96735f"
      ]
    ),

    ana: palette(
      "ana",
      "Anã",
      [
        "#efd1b6",
        "#dcb394",
        "#bd916f",
        "#966c52",
        "#73503d"
      ]
    ),

    orc: palette(
      "orc",
      "Orc",
      [
        "#9eb47c",
        "#879f67",
        "#708851",
        "#5c733f",
        "#4b6036"
      ]
    ),

    fada: palette(
      "fada",
      "Feérica",
      [
        "#f4ddd6",
        "#e9c7d0",
        "#d8aec2",
        "#c19ab9",
        "#add0cb",
        "#b9d59c"
      ]
    ),

    animalia: palette(
      "animalia",
      "Animalha",
      [
        "#f0d2b6",
        "#cda17c",
        "#a87551",
        "#79533e",
        "#563b31",
        "#d6bca5",
        "#a9a9a0",
        "#7a7b78",
        "#555653"
      ]
    ),

    undead: palette(
      "undead",
      "Sobrenatural",
      [
        "#ece7dc",
        "#c8c4ba",
        "#a8a69f",
        "#85857f",
        "#62635f"
      ]
    ),

    nature: palette(
      "nature",
      "Natureza",
      [
        "#b8cc9e",
        "#91ab78",
        "#718e5f",
        "#58704b",
        "#9eaa7f"
      ]
    )
  });


  /* =========================================================
     CABELOS
     ========================================================= */

  const HAIR_STYLES = immutable([

    option("bald", "Careca"),

    option("short", "Curto"),

    option("short_textured", "Curto texturizado"),

    option("medium", "Médio"),

    option("long", "Longo"),

    option("very_long", "Muito longo"),

    option("ponytail", "Rabo de cavalo"),

    option("high_ponytail", "Rabo de cavalo alto"),

    option("braid", "Trança"),

    option("multiple_braids", "Tranças múltiplas"),

    option("bun", "Coque"),

    option("half_up", "Preso parcialmente"),

    option("messy", "Desgrenhado"),

    option("mohawk", "Moicano"),

    option("undercut", "Undercut"),

    option("dreadlocks", "Dreadlocks"),

    option("curly", "Cacheado"),

    option("wavy", "Ondulado")
  ]);


  const HAIR_COLORS = immutable([

    palette(
      "black",
      "Preto",
      ["#171513"]
    ),

    palette(
      "dark_brown",
      "Castanho escuro",
      ["#38271d"]
    ),

    palette(
      "brown",
      "Castanho",
      ["#5a3c28"]
    ),

    palette(
      "light_brown",
      "Castanho claro",
      ["#806044"]
    ),

    palette(
      "red",
      "Ruivo",
      ["#8b3f28"]
    ),

    palette(
      "auburn",
      "Auburn",
      ["#633526"]
    ),

    palette(
      "blonde",
      "Loiro",
      ["#c9a85e"]
    ),

    palette(
      "white",
      "Branco",
      ["#ddd9d0"]
    ),

    palette(
      "silver",
      "Prateado",
      ["#aeb2b1"]
    ),

    palette(
      "gold",
      "Dourado",
      ["#d9b85f"]
    ),

    palette(
      "blue",
      "Azul",
      ["#496e92"]
    ),

    palette(
      "green",
      "Verde",
      ["#53744d"]
    ),

    palette(
      "purple",
      "Roxo",
      ["#735176"]
    )
  ]);


  /* =========================================================
     OLHOS
     ========================================================= */

  const EYE_SHAPES = immutable([

    option(
      "normal",
      "Normal"
    ),

    option(
      "large",
      "Arregalado"
    ),

    option(
      "narrow",
      "Estreito"
    ),

    option(
      "almond",
      "Amendoado"
    ),

    option(
      "round",
      "Redondo"
    ),

    option(
      "sharp",
      "Afiado"
    ),

    option(
      "sleepy",
      "Cansado"
    ),

    option(
      "deep_set",
      "Profundo"
    )
  ]);


  const EYE_COLORS = immutable([

    palette(
      "brown",
      "Castanho",
      ["#5c4030"]
    ),

    palette(
      "dark_brown",
      "Castanho escuro",
      ["#2f211b"]
    ),

    palette(
      "black",
      "Preto",
      ["#11100f"]
    ),

    palette(
      "blue",
      "Azul",
      ["#4d79a5"]
    ),

    palette(
      "green",
      "Verde",
      ["#648c57"]
    ),

    palette(
      "amber",
      "Âmbar",
      ["#b1843a"]
    ),

    palette(
      "gray",
      "Cinza",
      ["#8b918e"]
    ),

    palette(
      "violet",
      "Violeta",
      ["#765b8c"]
    ),

    palette(
      "red",
      "Vermelho",
      ["#9d5149"]
    ),

    palette(
      "gold",
      "Dourado",
      ["#d4b04f"]
    )
  ]);


  /* =========================================================
     ROSTO
     ========================================================= */

  const FACE_SHAPES = immutable([

    option("round", "Redondo"),

    option("oval", "Oval"),

    option("square", "Quadrado"),

    option("long", "Alongado"),

    option("heart", "Coração"),

    option("diamond", "Diamante"),

    option("angular", "Angular")
  ]);


  const NOSE_SHAPES = immutable([

    option("small", "Pequeno"),

    option("straight", "Reto"),

    option("wide", "Largo"),

    option("sharp", "Afiado"),

    option("long", "Longo"),

    option("upturned", "Empinado")
  ]);


  const MOUTH_SHAPES = immutable([

    option("small", "Pequena"),

    option("normal", "Normal"),

    option("full", "Cheia"),

    option("wide", "Larga"),

    option("thin", "Fina")
  ]);


  const EYEBROWS = immutable([

    option("straight", "Reta"),

    option("soft", "Suave"),

    option("thick", "Grossa"),

    option("thin", "Fina"),

    option("arched", "Arqueada"),

    option("sharp", "Afiada")
  ]);


  /* =========================================================
     PELOS FACIAIS
     ========================================================= */

  const FACIAL_HAIR = immutable([

    option("none", "Nenhum"),

    option("stubble", "Barba por fazer"),

    option("short_beard", "Barba curta"),

    option("full_beard", "Barba cheia"),

    option("long_beard", "Barba longa"),

    option("goatee", "Cavanhaque"),

    option("mustache", "Bigode"),

    option("braided_beard", "Barba trançada"),

    option("sideburns", "Costeletas")
  ]);


  /* =========================================================
     ORELHAS
     ========================================================= */

  const EAR_TYPES = immutable([

    option("human", "Humana"),

    option("round", "Arredondada"),

    option("pointed_short", "Pontuda curta"),

    option("pointed_long", "Pontuda longa"),

    option("animal", "Animal"),

    option("feline", "Felina"),

    option("canine", "Canina"),

    option("rabbit", "Coelho"),

    option("fox", "Raposa")
  ]);


  /* =========================================================
     CHIFRES
     ========================================================= */

  const HORN_TYPES = immutable([

    option("none", "Nenhum"),

    option("small", "Pequenos"),

    option("medium", "Médios"),

    option("large", "Grandes"),

    option("curved", "Curvos"),

    option("straight", "Retos"),

    option("ram", "Carneiro"),

    option("demon", "Demoníacos")
  ]);


  /* =========================================================
     ASAS
     ========================================================= */

  const WING_TYPES = immutable([

    option("none", "Nenhuma"),

    option("feather_small", "Asas emplumadas pequenas"),

    option("feather_large", "Asas emplumadas grandes"),

    option("fairy", "Asas feéricas"),

    option("bat", "Asas membranosas"),

    option("bird", "Asas de ave"),

    option("insect", "Asas de inseto"),

    option("magical", "Asas mágicas")
  ]);


  /* =========================================================
     CAUDAS
     ========================================================= */

  const TAIL_TYPES = immutable([

    option("none", "Nenhuma"),

    option("feline", "Felina"),

    option("canine", "Canina"),

    option("fox", "Raposa"),

    option("monkey", "Macaco"),

    option("reptile", "Réptil"),

    option("dragon", "Dragão"),

    option("spiked", "Espinhosa"),

    option("demon", "Demoníaca"),

    option("fish", "Peixe")
  ]);


  /* =========================================================
     MARCAS
     ========================================================= */

  const MARKINGS = immutable([

    option("none", "Nenhuma"),

    option("freckles", "Sardas"),

    option("dots", "Pintas"),

    option("stripes", "Listras"),

    option("face_marks", "Marcas faciais"),

    option("tribal", "Padrão tribal"),

    option("symmetrical", "Padrão simétrico"),

    option("asymmetrical", "Padrão assimétrico"),

    option("animal_pattern", "Padrão animal")
  ]);


  /* =========================================================
     MARCAS DE NASCENÇA
     ========================================================= */

  const BIRTHMARKS = immutable([

    option("none", "Nenhuma"),

    option("spot", "Mancha"),

    option("crescent", "Crescente"),

    option("star", "Estrela"),

    option("leaf", "Folha"),

    option("line", "Marca linear"),

    option("symbol", "Símbolo"),

    option("irregular", "Irregular")
  ]);


  /* =========================================================
     CICATRIZES
     ========================================================= */

  const SCARS = immutable([

    option("none", "Nenhuma"),

    option("eye", "No olho"),

    option("face", "No rosto"),

    option("cheek", "Na bochecha"),

    option("mouth", "Próxima à boca"),

    option("forehead", "Na testa"),

    option("neck", "No pescoço"),

    option("chest", "No peito"),

    option("arm", "No braço"),

    option("hand", "Na mão"),

    option("leg", "Na perna"),

    option("back", "Nas costas"),

    option("multiple", "Múltiplas")
  ]);


  /* =========================================================
     TATUAGENS
     ========================================================= */

  const TATTOOS = immutable([

    option("none", "Nenhuma"),

    option("tribal", "Tribal"),

    option("runes", "Runas"),

    option("magic", "Arcana"),

    option("floral", "Floral"),

    option("animal", "Animal"),

    option("geometric", "Geométrica"),

    option("symbol", "Símbolo"),

    option("religious", "Religiosa"),

    option("custom", "Personalizada")
  ]);


  /* =========================================================
     PIERCINGS
     ========================================================= */

  const PIERCINGS = immutable([

    option("none", "Nenhum"),

    option("ear", "Orelha"),

    option("nose", "Nariz"),

    option("lip", "Lábio"),

    option("eyebrow", "Sobrancelha"),

    option("septum", "Septo"),

    option("multiple", "Múltiplos")
  ]);


  /* =========================================================
     ROUPAS
     ========================================================= */

  const CLOTHING = immutable([

    option("none", "Nenhuma"),

    option("simple", "Roupa simples"),

    option("adventurer", "Aventureiro"),

    option("traveler", "Viajante"),

    option("noble", "Nobre"),

    option("scholar", "Estudioso"),

    option("merchant", "Mercador"),

    option("mage", "Mago"),

    option("cleric", "Sacerdote"),

    option("hunter", "Caçador"),

    option("rogue", "Ladino"),

    option("monk", "Monge"),

    option("military", "Militar"),

    option("tribal", "Tribal"),

    option("royal", "Real")
  ]);


  /* =========================================================
     CASACOS / CAPAS / MANTOS
     ========================================================= */

  const OUTERWEAR = immutable([

    option("none", "Nenhum"),

    option("coat", "Casaco"),

    option("cloak", "Capa"),

    option("hooded_cloak", "Capa com capuz"),

    option("cape_short", "Manto curto"),

    option("cape_long", "Manto longo"),

    option("robe", "Manto de tecido"),

    option("poncho", "Poncho")
  ]);


  /* =========================================================
     ARMADURAS
     ========================================================= */

  const ARMOR = immutable([

    option("none", "Nenhuma"),

    option("leather", "Couro"),

    option("light", "Leve"),

    option("medium", "Média"),

    option("heavy", "Pesada"),

    option("plate", "Placas"),

    option("chain", "Malha"),

    option("fantasy", "Fantasia"),

    option("ceremonial", "Cerimonial"),

    option("tribal", "Tribal")
  ]);


  /* =========================================================
     CHAPÉUS
     ========================================================= */

  const HATS = immutable([

    option("none", "Nenhum"),

    option("wide_brim", "Chapéu de aba larga"),

    option("traveler", "Chapéu de viajante"),

    option("mage", "Chapéu de mago"),

    option("witch", "Chapéu pontudo"),

    option("beret", "Boina"),

    option("cap", "Boné"),

    option("helmet", "Elmo"),

    option("crown", "Coroa"),

    option("circlet", "Diadema")
  ]);


  /* =========================================================
     MÁSCARAS
     ========================================================= */

  const MASKS = immutable([

    option("none", "Nenhuma"),

    option("simple", "Máscara simples"),

    option("half", "Meia máscara"),

    option("full", "Máscara completa"),

    option("cloth", "Máscara de tecido"),

    option("ornate", "Máscara ornamentada"),

    option("animal", "Máscara animal")
  ]);


  /* =========================================================
     ÓCULOS
     ========================================================= */

  const GLASSES = immutable([

    option("none", "Nenhum"),

    option("round", "Redondo"),

    option("square", "Quadrado"),

    option("thin", "Fino"),

    option("goggles", "Óculos de proteção"),

    option("monocle", "Monóculo"),

    option("magical", "Óculos mágicos")
  ]);


  /* =========================================================
     JOIAS
     ========================================================= */

  const JEWELRY = immutable({

    necklaces: immutable([
      option("none", "Nenhum"),
      option("simple", "Simples"),
      option("pendant", "Pingente"),
      option("gem", "Gema"),
      option("amulet", "Amuleto"),
      option("medallion", "Medalhão"),
      option("chain", "Corrente")
    ]),

    earrings: immutable([
      option("none", "Nenhum"),
      option("stud", "Argola pequena"),
      option("hoop", "Argola"),
      option("pendant", "Pingente"),
      option("multiple", "Múltiplos")
    ]),

    bracelets: immutable([
      option("none", "Nenhum"),
      option("simple", "Simples"),
      option("metal", "Metal"),
      option("leather", "Couro"),
      option("magical", "Mágico")
    ]),

    rings: immutable([
      option("none", "Nenhum"),
      option("simple", "Simples"),
      option("gem", "Com gema"),
      option("magic", "Mágico"),
      option("multiple", "Múltiplos")
    ]),

    watches: immutable([
      option("none", "Nenhum"),
      option("pocket", "Relógio de bolso"),
      option("wrist", "Relógio de pulso"),
      option("fantasy", "Relógio fantástico")
    ])
  });


  /* =========================================================
     BOLSAS E EQUIPAMENTOS
     ========================================================= */

  const BAGS = immutable([

    option("none", "Nenhuma"),

    option("small", "Bolsa pequena"),

    option("pouch", "Bolsa lateral"),

    option("backpack", "Mochila"),

    option("large_backpack", "Mochila grande"),

    option("satchel", "Sacola"),

    option("merchant", "Bolsa de mercador")
  ]);


  const QUIVERS = immutable([

    option("none", "Nenhuma"),

    option("simple", "Aljava simples"),

    option("hunter", "Aljava de caçador"),

    option("ornate", "Aljava ornamentada")
  ]);


  /* =========================================================
     ARMAS
     ========================================================= */

  const WEAPONS = immutable([

    option("none", "Nenhuma"),

    option("sword", "Espada"),

    option("short_sword", "Espada curta"),

    option("long_sword", "Espada longa"),

    option("greatsword", "Espadão"),

    option("dagger", "Adaga"),

    option("axe", "Machado"),

    option("great_axe", "Machado grande"),

    option("spear", "Lança"),

    option("staff", "Cajado"),

    option("wand", "Varinha"),

    option("bow", "Arco"),

    option("crossbow", "Besta"),

    option("hammer", "Martelo"),

    option("mace", "Maça"),

    option("shield", "Escudo"),

    option("book", "Livro"),

    option("orb", "Orbe")
  ]);


  /* =========================================================
     PROPS
     ========================================================= */

  const PROPS = immutable([

    option("none", "Nenhum"),

    option("lantern", "Lanterna"),

    option("book", "Livro"),

    option("scroll", "Pergaminho"),

    option("bottle", "Frasco"),

    option("map", "Mapa"),

    option("instrument", "Instrumento"),

    option("compass", "Bússola"),

    option("flower", "Flor"),

    option("food", "Comida")
  ]);


  /* =========================================================
     PALETAS DE MATERIAIS
     ========================================================= */

  const MATERIALS = immutable({

    cloth: immutable([
      "#211d1a",
      "#4d4136",
      "#6d5c4a",
      "#8d775f",
      "#b09a7a",
      "#d1bb96"
    ]),

    leather: immutable([
      "#291e18",
      "#432e22",
      "#5b3d2b",
      "#765238",
      "#926a49"
    ]),

    metal: immutable([
      "#252729",
      "#4a4d50",
      "#6b6f72",
      "#8d9296",
      "#b0b6ba",
      "#d1d4d5"
    ]),

    gold: immutable([
      "#7e5c1f",
      "#a37a2a",
      "#c49b3a",
      "#dfbd5d",
      "#f1d887"
    ]),

    silver: immutable([
      "#74787b",
      "#9da1a3",
      "#c2c6c7",
      "#dde0df"
    ]),

    wood: immutable([
      "#33251b",
      "#4b3425",
      "#624631",
      "#805d40",
      "#a07952"
    ])
  });


  /* =========================================================
     ANIMALHA
     ========================================================= */

  const ANIMALHA_CATEGORIES = immutable([

    {
      id: "voadores",
      name: "Voadores",
      description:
        "Linhagens com características aéreas.",
      icon:
        "wing"
    },

    {
      id: "terrestres",
      name: "Terrestres",
      description:
        "Linhagens terrestres.",
      icon:
        "paw"
    },

    {
      id: "marinhos",
      name: "Marinhos",
      description:
        "Linhagens adaptadas à água.",
      icon:
        "wave"
    },

    {
      id: "reptilianos",
      name: "Reptilianos",
      description:
        "Linhagens de répteis.",
      icon:
        "scale"
    },

    {
      id: "pequenos",
      name: "Pequenos",
      description:
        "Linhagens de pequeno porte.",
      icon:
        "small"
    },

    {
      id: "grandes",
      name: "Grandes",
      description:
        "Linhagens de grande porte.",
      icon:
        "large"
    }
  ]);


  const ANIMALHA_ANIMALS = immutable({

    pantera: {
      id: "pantera",
      name: "Pantera",
      category: "terrestres",

      body: "lean",

      fur: [
        "#171513",
        "#27211c",
        "#3b3028"
      ],

      markings: [
        "spots",
        "none"
      ],

      ears: [
        "feline"
      ],

      tail: [
        "feline"
      ]
    },

    tigre: {
      id: "tigre",
      name: "Tigre",
      category: "terrestres",

      body: "broad",

      fur: [
        "#c7863b",
        "#d6a15d"
      ],

      markings: [
        "stripes"
      ],

      ears: [
        "feline"
      ],

      tail: [
        "feline"
      ]
    },

    leao: {
      id: "leao",
      name: "Leão",
      category: "terrestres",

      body: "broad",

      fur: [
        "#c99552",
        "#dca968"
      ],

      markings: [
        "none"
      ],

      ears: [
        "feline"
      ],

      tail: [
        "feline"
      ]
    },

    gato: {
      id: "gato",
      name: "Gato",
      category: "terrestres",

      body: "slim",

      fur: [
        "#7f7a72",
        "#b3aea3",
        "#403d39"
      ],

      markings: [
        "spots",
        "stripes"
      ],

      ears: [
        "feline"
      ],

      tail: [
        "feline"
      ]
    },

    lobo: {
      id: "lobo",
      name: "Lobo",
      category: "terrestres",

      body: "lean",

      fur: [
        "#6e706d",
        "#8f918b",
        "#454742",
        "#b7b6ae"
      ],

      markings: [
        "none",
        "stripes"
      ],

      ears: [
        "canine"
      ],

      tail: [
        "canine"
      ]
    },

    raposa: {
      id: "raposa",
      name: "Raposa",
      category: "terrestres",

      body: "slim",

      fur: [
        "#ad5f32",
        "#d88843",
        "#6f3923"
      ],

      markings: [
        "none",
        "face_marks"
      ],

      ears: [
        "fox"
      ],

      tail: [
        "fox"
      ]
    },

    falcao: {
      id: "falcao",
      name: "Falcão",
      category: "voadores",

      body: "lean",

      feathers: [
        "#8f8f88",
        "#575a5c",
        "#c7c8c2"
      ],

      wings: [
        "bird"
      ],

      ears: [
        "animal"
      ]
    },

    aguia: {
      id: "aguia",
      name: "Águia",
      category: "voadores",

      body: "broad",

      feathers: [
        "#8a6947",
        "#b2936c",
        "#554334"
      ],

      wings: [
        "bird"
      ],

      ears: [
        "animal"
      ]
    },

    coruja: {
      id: "coruja",
      name: "Coruja",
      category: "voadores",

      body: "slim",

      feathers: [
        "#817667",
        "#a99b88",
        "#575148"
      ],

      wings: [
        "bird"
      ],

      ears: [
        "animal"
      ]
    },

    cobra: {
      id: "cobra",
      name: "Cobra",
      category: "pequenos",

      body: "slim",

      scales: [
        "#687a47",
        "#84965c",
        "#4f5e38"
      ],

      markings: [
        "stripes"
      ],

      tail: [
        "reptile"
      ]
    },

    crocodilo: {
      id: "crocodilo",
      name: "Crocodilo",
      category: "marinhos",

      body: "broad",

      scales: [
        "#536b4a",
        "#70895c",
        "#3b4e38"
      ],

      tail: [
        "reptile"
      ]
    },

    tubarao: {
      id: "tubarao",
      name: "Tubarão",
      category: "marinhos",

      body: "broad",

      skin: [
        "#6f7d84",
        "#85939a",
        "#48535a"
      ]
    },

    urso: {
      id: "urso",
      name: "Urso",
      category: "grandes",

      body: "heavy",

      fur: [
        "#4d392d",
        "#6c4f3c",
        "#8a6b52"
      ],

      ears: [
        "round"
      ]
    },

    rinoceronte: {
      id: "rinoceronte",
      name: "Rinoceronte",
      category: "grandes",

      body: "heavy",

      skin: [
        "#77726b",
        "#928c83",
        "#5d5953"
      ]
    },

    hipopotamo: {
      id: "hipopotamo",
      name: "Hipopótamo",
      category: "marinhos",

      body: "heavy",

      skin: [
        "#807276",
        "#a18f93",
        "#665b61"
      ]
    },

    foca: {
      id: "foca",
      name: "Foca",
      category: "marinhos",

      body: "average",

      skin: [
        "#7f8583",
        "#a7aaa4",
        "#5f6563"
      ]
    }
  });


  /* =========================================================
     REGRAS RACIAIS
     ========================================================= */

  const RACE_RULES = immutable({

    humano: {
      skinPalette: "humana",

      bodyTypes: [
        "slim",
        "lean",
        "average",
        "broad",
        "heavy"
      ],

      ears: [
        "human"
      ],

      horns: [
        "none"
      ],

      wings: [
        "none"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "average"
    },

    elfo: {
      skinPalette: "elfica",

      bodyTypes: [
        "slim",
        "lean",
        "average"
      ],

      ears: [
        "pointed_short",
        "pointed_long"
      ],

      horns: [
        "none"
      ],

      wings: [
        "none"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "slim"
    },

    anao: {
      skinPalette: "ana",

      bodyTypes: [
        "average",
        "broad",
        "heavy"
      ],

      ears: [
        "human",
        "round"
      ],

      horns: [
        "none"
      ],

      wings: [
        "none"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "broad"
    },

    orc: {
      skinPalette: "orc",

      bodyTypes: [
        "average",
        "broad",
        "heavy"
      ],

      ears: [
        "human",
        "round"
      ],

      horns: [
        "none",
        "small"
      ],

      wings: [
        "none"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "broad"
    },

    fada: {
      skinPalette: "fada",

      bodyTypes: [
        "slim",
        "lean"
      ],

      ears: [
        "human",
        "pointed_short"
      ],

      horns: [
        "none"
      ],

      wings: [
        "fairy",
        "insect",
        "magical"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "slim"
    },

    animalha: {
      skinPalette: "animalia",

      bodyTypes: [
        "slim",
        "lean",
        "average",
        "broad",
        "heavy"
      ],

      ears: [
        "animal",
        "feline",
        "canine",
        "rabbit",
        "fox"
      ],

      horns: [
        "none",
        "small",
        "medium"
      ],

      wings: [
        "none",
        "bird"
      ],

      tail: [
        "feline",
        "canine",
        "fox",
        "monkey",
        "reptile",
        "fish"
      ],

      defaultBodyType:
        "average"
    },

    vampiro: {
      skinPalette: "undead",

      bodyTypes: [
        "slim",
        "lean",
        "average"
      ],

      ears: [
        "human"
      ],

      horns: [
        "none"
      ],

      wings: [
        "none",
        "bat"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "slim"
    },

    povo_natureza: {
      skinPalette: "nature",

      bodyTypes: [
        "slim",
        "lean",
        "average"
      ],

      ears: [
        "human",
        "pointed_short"
      ],

      horns: [
        "none",
        "small"
      ],

      wings: [
        "none",
        "magical"
      ],

      tail: [
        "none"
      ],

      defaultBodyType:
        "lean"
    }
  });


  /* =========================================================
     PRESETS
     ========================================================= */

  const PRESETS = immutable({

    aventureiro: {
      bodyType: "average",

      hairStyle: "short",
      hairColor: "brown",

      eyeShape: "normal",
      eyeColor: "brown",

      clothingStyle: "adventurer",

      outerwear:
        "hooded_cloak",

      armor:
        "light",

      hat:
        "none",

      mask:
        "none",

      necklace:
        "simple",

      bags:
        "backpack",

      weapon:
        "sword"
    },

    mago: {
      bodyType: "slim",

      hairStyle: "medium",
      hairColor: "black",

      eyeShape: "large",
      eyeColor: "violet",

      clothingStyle: "mage",

      outerwear:
        "robe",

      armor:
        "none",

      hat:
        "mage",

      mask:
        "none",

      necklace:
        "amulet",

      bags:
        "satchel",

      weapon:
        "staff"
    },

    guerreiro: {
      bodyType: "broad",

      hairStyle: "short",
      hairColor: "black",

      eyeShape: "sharp",
      eyeColor: "brown",

      clothingStyle: "military",

      outerwear:
        "coat",

      armor:
        "heavy",

      hat:
        "none",

      mask:
        "none",

      necklace:
        "none",

      bags:
        "pouch",

      weapon:
        "long_sword"
    },

    ladino: {
      bodyType: "lean",

      hairStyle: "medium",
      hairColor: "dark_brown",

      eyeShape: "narrow",
      eyeColor: "green",

      clothingStyle: "rogue",

      outerwear:
        "hooded_cloak",

      armor:
        "leather",

      hat:
        "none",

      mask:
        "half",

      necklace:
        "none",

      bags:
        "pouch",

      weapon:
        "dagger"
    }
  });


  /* =========================================================
     DEFAULTS
     ========================================================= */

  const DEFAULT_APPEARANCE = immutable({

    height:
      null,

    bodyType:
      "average",

    width:
      1,

    shoulders:
      1,

    torso:
      1,

    arms:
      1,

    legs:
      1,

    head:
      1,

    skin:
      "",

    skinVariant:
      "",

    hair:
      "",

    hairStyle:
      "short",

    hairColor:
      "black",

    eyeShape:
      "normal",

    eyes:
      "",

    eyeColor:
      "brown",

    eyebrows:
      "normal",

    nose:
      "straight",

    mouth:
      "normal",

    facialHair:
      "none",

    facialHairColor:
      "",

    ears:
      "",

    horns:
      "none",

    wings:
      "none",

    tail:
      "none",

    furColor:
      "",

    furPattern:
      "",

    markings:
      "none",

    markingsColor:
      "",

    markingOpacity:
      1,

    markingScale:
      1,

    markingLocation:
      "",

    birthmark:
      "none",

    birthmarkColor:
      "",

    birthmarkOpacity:
      1,

    birthmarkScale:
      1,

    birthmarkLocation:
      "",

    scars:
      "none",

    scarCount:
      1,

    scarSize:
      1,

    scarLocation:
      "",

    tattoos:
      "none",

    tattooColor:
      "",

    tattooOpacity:
      1,

    tattooScale:
      1,

    tattooLocation:
      "",

    piercings:
      "none",

    piercingLocation:
      "",

    piercingMaterial:
      "",

    clothing:
      "",

    clothingStyle:
      "",

    shirt:
      "",

    pants:
      "",

    skirt:
      "",

    dress:
      "",

    coat:
      "",

    cape:
      "",

    robe:
      "",

    tunic:
      "",

    belt:
      "",

    gloves:
      "",

    boots:
      "",

    socks:
      "",

    armor:
      "",

    armorStyle:
      "",

    shoulderArmor:
      "",

    chestArmor:
      "",

    armArmor:
      "",

    legArmor:
      "",

    helmet:
      "",

    hat:
      "none",

    headband:
      "none",

    hood:
      "none",

    mask:
      "none",

    glasses:
      "none",

    necklace:
      "none",

    earrings:
      "none",

    bracelet:
      "none",

    rings:
      "none",

    watch:
      "none",

    bag:
      "none",

    pouch:
      "none",

    backpack:
      "none",

    quiver:
      "none",

    holster:
      "none",

    scabbard:
      "none",

    weapon:
      "none",

    mainHand:
      "none",

    offHand:
      "none",

    secondaryWeapon:
      "none",

    backWeapon:
      "none",

    handItem:
      "none",

    book:
      "none",

    lantern:
      "none",

    bottle:
      "none",

    scroll:
      "none",

    tool:
      "none",

    trinket:
      "none",

    physicalNotes:
      ""
  });


  /* =========================================================
     ALIASES
     ========================================================= */

  const RACE_ALIASES = immutable({
    humano:
      "humano",

    humanoid:
      "humano",

    humanoa:
      "humano",

    elfo:
      "elfo",

    elfa:
      "elfo",

    anao:
      "anao",

    anao_feminino:
      "anao",

    anao_feminino:
      "anao",

    orc:
      "orc",

    orc_feminino:
      "orc",

    fada:
      "fada",

    fada_feminino:
      "fada",

    animalha:
      "animalha",

    animalhas:
      "animalha",

    vampiro:
      "vampiro",

    povo_natureza:
      "povo_natureza"
  });


  /* =========================================================
     UTILITÁRIOS PÚBLICOS
     ========================================================= */

  function normalizeRaceId(
    raceId
  ) {
    const value =
      String(
        raceId ?? ""
      )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /\s+/g,
          "_"
        );

    return (
      RACE_ALIASES[value] ||
      value
    );
  }


  function getRaceRules(
    raceId
  ) {
    const id =
      normalizeRaceId(
        raceId
      );

    return (
      RACE_RULES[id] ||
      null
    );
  }


  function getSkinPaletteForRace(
    raceId
  ) {
    const rules =
      getRaceRules(
        raceId
      );

    if (
      !rules
    ) {
      return (
        SKIN_PALETTES.humana
      );
    }

    return (
      SKIN_PALETTES[
        rules.skinPalette
      ] ||
      SKIN_PALETTES.humana
    );
  }


  function getAnimalhaAnimalsByCategory(
    categoryId
  ) {
    const id =
      String(
        categoryId ?? ""
      )
        .trim()
        .toLowerCase();

    return Object.values(
      ANIMALHA_ANIMALS
    ).filter(
      animal =>
        animal.category ===
        id
    );
  }


  function getDefaultAppearanceForRace(
    raceId
  ) {
    const rules =
      getRaceRules(
        raceId
      );

    const appearance = {
      ...DEFAULT_APPEARANCE
    };

    if (
      rules
    ) {
      appearance.bodyType =
        rules.defaultBodyType;

      appearance.ears =
        rules.ears?.[0] ??
        "";

      appearance.horns =
        rules.horns?.[0] ??
        "none";

      appearance.wings =
        rules.wings?.[0] ??
        "none";

      appearance.tail =
        rules.tail?.[0] ??
        "none";
    }

    return appearance;
  }


  function isOptionAllowed(
    raceId,
    field,
    value
  ) {
    const rules =
      getRaceRules(
        raceId
      );

    if (
      !rules
    ) {
      return true;
    }

    if (
      field ===
      "bodyType"
    ) {
      return rules.bodyTypes?.includes(
        value
      ) ?? true;
    }

    if (
      field ===
      "ears"
    ) {
      return rules.ears?.includes(
        value
      ) ?? true;
    }

    if (
      field ===
      "horns"
    ) {
      return rules.horns?.includes(
        value
      ) ?? true;
    }

    if (
      field ===
      "wings"
    ) {
      return rules.wings?.includes(
        value
      ) ?? true;
    }

    if (
      field ===
      "tail"
    ) {
      return rules.tail?.includes(
        value
      ) ?? true;
    }

    return true;
  }


  /* =========================================================
     CATÁLOGO COMPLETO
     ========================================================= */

  const ASSETS = immutable({

    version:
      VERSION,

    layers:
      LAYERS,

    parts:
      PARTS,

    categories:
      CATEGORIES,

    bodyTypes:
      BODY_TYPES,

    bodyProportions:
      BODY_PROPORTIONS,

    skinPalettes:
      SKIN_PALETTES,

    hairStyles:
      HAIR_STYLES,

    hairColors:
      HAIR_COLORS,

    eyeShapes:
      EYE_SHAPES,

    eyeColors:
      EYE_COLORS,

    faceShapes:
      FACE_SHAPES,

    noseShapes:
      NOSE_SHAPES,

    mouthShapes:
      MOUTH_SHAPES,

    eyebrows:
      EYEBROWS,

    facialHair:
      FACIAL_HAIR,

    earTypes:
      EAR_TYPES,

    hornTypes:
      HORN_TYPES,

    wingTypes:
      WING_TYPES,

    tailTypes:
      TAIL_TYPES,

    markings:
      MARKINGS,

    birthmarks:
      BIRTHMARKS,

    scars:
      SCARS,

    tattoos:
      TATTOOS,

    piercings:
      PIERCINGS,

    clothing:
      CLOTHING,

    outerwear:
      OUTERWEAR,

    armor:
      ARMOR,

    hats:
      HATS,

    masks:
      MASKS,

    glasses:
      GLASSES,

    jewelry:
      JEWELRY,

    bags:
      BAGS,

    quivers:
      QUIVERS,

    weapons:
      WEAPONS,

    props:
      PROPS,

    materials:
      MATERIALS,

    animalhaCategories:
      ANIMALHA_CATEGORIES,

    animalhaAnimals:
      ANIMALHA_ANIMALS,

    raceRules:
      RACE_RULES,

    presets:
      PRESETS,

    defaultAppearance:
      DEFAULT_APPEARANCE
  });


  /* =========================================================
     API
     ========================================================= */

  window.AERIONPersonagemAssets =
    Object.freeze({

      VERSION,

      LAYERS,

      PARTS,

      CATEGORIES,

      BODY_TYPES,

      BODY_PROPORTIONS,

      SKIN_PALETTES,

      HAIR_STYLES,

      HAIR_COLORS,

      EYE_SHAPES,

      EYE_COLORS,

      FACE_SHAPES,

      NOSE_SHAPES,

      MOUTH_SHAPES,

      EYEBROWS,

      FACIAL_HAIR,

      EAR_TYPES,

      HORN_TYPES,

      WING_TYPES,

      TAIL_TYPES,

      MARKINGS,

      BIRTHMARKS,

      SCARS,

      TATTOOS,

      PIERCINGS,

      CLOTHING,

      OUTERWEAR,

      ARMOR,

      HATS,

      MASKS,

      GLASSES,

      JEWELRY,

      BAGS,

      QUIVERS,

      WEAPONS,

      PROPS,

      MATERIALS,

      ANIMALHA_CATEGORIES,

      ANIMALHA_ANIMALS,

      RACE_RULES,

      PRESETS,

      DEFAULT_APPEARANCE,

      ASSETS,

      normalizeRaceId,

      getRaceRules,

      getSkinPaletteForRace,

      getAnimalhaAnimalsByCategory,

      getDefaultAppearanceForRace,

      isOptionAllowed
    });


  /* =========================================================
     COMPATIBILIDADE
     ========================================================= */

  window.AERION_CHARACTER_ASSETS =
    window.AERIONPersonagemAssets;


  /* =========================================================
     READY
     ========================================================= */

  window.dispatchEvent(
    new CustomEvent(
      "aerion:personagem-assets:ready",
      {
        detail: {
          version:
            VERSION
        }
      }
    )
  );


  console.info(
    "[AERION] personagem-assets.js inicializado.",
    {
      version:
        VERSION
    }
  );

})();