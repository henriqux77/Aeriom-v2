/* =========================================================
   AERION — PERSONAGEM ASSETS
   js/core/personagem-assets.js

   CATÁLOGO COMPLETO DO EDITOR DE PERSONAGEM 2D

   Este arquivo NÃO:
   - controla a ficha;
   - salva personagem;
   - calcula atributos;
   - controla dados;
   - renderiza DOM.

   Este arquivo apenas DEFINE:
   - categorias;
   - peças;
   - paletas;
   - materiais;
   - estilos;
   - restrições raciais;
   - anatomias;
   - presets;
   - camadas;
   - opções de personalização.

   O personagem-render.js será responsável por
   interpretar este catálogo.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     VERSÃO
     ========================================================= */

  const VERSION = 1;


  /* =========================================================
     AUXILIARES
     ========================================================= */

  function option(
    id,
    name,
    extra = {}
  ) {
    return {
      id,
      name,
      enabled: true,
      ...extra
    };
  }

  function palette(
    id,
    name,
    colors,
    extra = {}
  ) {
    return {
      id,
      name,
      colors,
      ...extra
    };
  }


  /* =========================================================
     TIPOS DE CAMADA
     =========================================================

     Quanto maior o zIndex, mais à frente a peça aparece.
     ========================================================= */

  const LAYERS = Object.freeze({

    BACKGROUND: 0,

    SHADOW: 10,

    BACK_HAIR: 20,

    TAIL_BACK: 25,

    WINGS_BACK: 30,

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

  const PARTS = Object.freeze({

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
     MORFOLOGIA
     ========================================================= */

  const BODY_TYPES = Object.freeze([
    option(
      "slim",
      "Delgado",
      {
        description:
          "Estrutura corporal mais estreita."
      }
    ),

    option(
      "lean",
      "Atlético",
      {
        description:
          "Corpo definido e equilibrado."
      }
    ),

    option(
      "average",
      "Médio",
      {
        description:
          "Proporção corporal equilibrada."
      }
    ),

    option(
      "broad",
      "Robusto",
      {
        description:
          "Estrutura corporal mais larga."
      }
    ),

    option(
      "heavy",
      "Pesado",
      {
        description:
          "Estrutura corporal volumosa."
      }
    )
  ]);


  const BODY_PROPORTIONS = Object.freeze({
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
     TOM DE PELE — PALETAS RACIAIS
     ========================================================= */

  const SKIN_PALETTES = Object.freeze({

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
        "#4b6036",
        "#7d8c67"
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
      "Animalia",
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

  const HAIR_STYLES = Object.freeze([

    option(
      "bald",
      "Careca",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "short",
      "Curto",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "short_textured",
      "Curto texturizado",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "medium",
      "Médio",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "long",
      "Longo",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "very_long",
      "Muito longo",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "ponytail",
      "Rabo de cavalo",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "high_ponytail",
      "Rabo de cavalo alto",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "braid",
      "Trança",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "multiple_braids",
      "Tranças múltiplas",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "bun",
      "Coque",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "half_up",
      "Preso parcialmente",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "messy",
      "Desgrenhado",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "mohawk",
      "Moicano",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "undercut",
      "Undercut",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "dreadlocks",
      "Dreadlocks",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "curly",
      "Cacheado",
      {
        layer:
          LAYERS.HAIR
      }
    ),

    option(
      "wavy",
      "Ondulado",
      {
        layer:
          LAYERS.HAIR
      }
    )
  ]);


  const HAIR_COLORS = Object.freeze([
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
     PELOS FACIAIS
     ========================================================= */

  const FACIAL_HAIR = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "stubble",
      "Barba por fazer"
    ),

    option(
      "short_beard",
      "Barba curta"
    ),

    option(
      "full_beard",
      "Barba cheia"
    ),

    option(
      "long_beard",
      "Barba longa"
    ),

    option(
      "goatee",
      "Cavanhaque"
    ),

    option(
      "mustache",
      "Bigode"
    ),

    option(
      "braided_beard",
      "Barba trançada"
    )
  ]);


  /* =========================================================
     OLHOS
     ========================================================= */

  const EYE_SHAPES = Object.freeze([

    option(
      "normal",
      "Normal"
    ),

    option(
      "narrow",
      "Estreito"
    ),

    option(
      "large",
      "Grande"
    ),

    option(
      "round",
      "Arredondado"
    ),

    option(
      "sharp",
      "Afiado"
    ),

    option(
      "hooded",
      "Encapuzado"
    ),

    option(
      "almond",
      "Amendoado"
    )
  ]);


  const EYE_COLORS = Object.freeze([
    palette(
      "brown",
      "Castanho",
      ["#4b3024"]
    ),

    palette(
      "dark_brown",
      "Castanho escuro",
      ["#251913"]
    ),

    palette(
      "black",
      "Preto",
      ["#101010"]
    ),

    palette(
      "blue",
      "Azul",
      ["#6e99bd"]
    ),

    palette(
      "light_blue",
      "Azul claro",
      ["#a9d3e5"]
    ),

    palette(
      "green",
      "Verde",
      ["#6d9669"]
    ),

    palette(
      "gray",
      "Cinza",
      ["#929895"]
    ),

    palette(
      "amber",
      "Âmbar",
      ["#bd8b3f"]
    ),

    palette(
      "red",
      "Vermelho",
      ["#a84f49"]
    ),

    palette(
      "violet",
      "Violeta",
      ["#8664a7"]
    )
  ]);


  /* =========================================================
     SOBRANCELHAS
     ========================================================= */

  const EYEBROWS = Object.freeze([

    option(
      "natural",
      "Natural"
    ),

    option(
      "straight",
      "Reta"
    ),

    option(
      "arched",
      "Arqueada"
    ),

    option(
      "thick",
      "Grossa"
    ),

    option(
      "thin",
      "Fina"
    ),

    option(
      "scarred",
      "Marcada"
    )
  ]);


  /* =========================================================
     NARIZES
     ========================================================= */

  const NOSES = Object.freeze([

    option(
      "small",
      "Pequeno"
    ),

    option(
      "medium",
      "Médio"
    ),

    option(
      "broad",
      "Largo"
    ),

    option(
      "long",
      "Longo"
    ),

    option(
      "sharp",
      "Afiado"
    ),

    option(
      "rounded",
      "Arredondado"
    ),

    option(
      "strong",
      "Marcante"
    )
  ]);


  /* =========================================================
     BOCAS
     ========================================================= */

  const MOUTHS = Object.freeze([

    option(
      "natural",
      "Natural"
    ),

    option(
      "small",
      "Pequena"
    ),

    option(
      "wide",
      "Larga"
    ),

    option(
      "thin",
      "Lábios finos"
    ),

    option(
      "full",
      "Lábios marcados"
    ),

    option(
      "smile",
      "Sorriso"
    ),

    option(
      "serious",
      "Séria"
    )
  ]);


  /* =========================================================
     ORELHAS HUMANAS
     ========================================================= */

  const HUMAN_EARS = Object.freeze([

    option(
      "normal",
      "Normal"
    ),

    option(
      "small",
      "Pequena"
    ),

    option(
      "large",
      "Grande"
    )
  ]);


  /* =========================================================
     ORELHAS ÉLFICAS
     ========================================================= */

  const ELF_EARS = Object.freeze([

    option(
      "short",
      "Élfica curta"
    ),

    option(
      "medium",
      "Élfica média"
    ),

    option(
      "long",
      "Élfica longa"
    ),

    option(
      "very_long",
      "Élfica longa"
    )
  ]);


  /* =========================================================
     CHIFRES
     ========================================================= */

  const HORN_STYLES = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "small",
      "Pequenos"
    ),

    option(
      "curved",
      "Curvos"
    ),

    option(
      "straight",
      "Retos"
    ),

    option(
      "backward",
      "Voltados para trás"
    ),

    option(
      "ram",
      "Carneiro"
    ),

    option(
      "antler",
      "Galhada"
    ),

    option(
      "large",
      "Grandes"
    )
  ]);


  /* =========================================================
     ASAS
     ========================================================= */

  const WING_TYPES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "feather_small",
      "Asas de penas pequenas"
    ),

    option(
      "feather_medium",
      "Asas de penas médias"
    ),

    option(
      "feather_large",
      "Asas de penas grandes"
    ),

    option(
      "fairy",
      "Asas feéricas"
    ),

    option(
      "bat",
      "Asas membranosas"
    ),

    option(
      "insect",
      "Asas de inseto"
    ),

    option(
      "bird",
      "Asas aviárias"
    )
  ]);


  /* =========================================================
     CAUDAS
     ========================================================= */

  const TAIL_TYPES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "feline",
      "Felina"
    ),

    option(
      "canine",
      "Canídea"
    ),

    option(
      "fox",
      "Raposa"
    ),

    option(
      "wolf",
      "Lobo"
    ),

    option(
      "bird",
      "Aviária"
    ),

    option(
      "reptile",
      "Réptil"
    ),

    option(
      "dragon",
      "Dracônica"
    ),

    option(
      "long",
      "Longa"
    ),

    option(
      "thin",
      "Fina"
    ),

    option(
      "thick",
      "Grossa"
    )
  ]);


  /* =========================================================
     PELAGEM
     ========================================================= */

  const FUR_COLORS = Object.freeze([

    palette(
      "black",
      "Preto",
      ["#171614"]
    ),

    palette(
      "white",
      "Branco",
      ["#e1ded5"]
    ),

    palette(
      "gray",
      "Cinza",
      ["#888985"]
    ),

    palette(
      "silver",
      "Prateado",
      ["#a8aaa6"]
    ),

    palette(
      "brown",
      "Marrom",
      ["#76513b"]
    ),

    palette(
      "dark_brown",
      "Marrom escuro",
      ["#4b3328"]
    ),

    palette(
      "red",
      "Avermelhado",
      ["#8f513d"]
    ),

    palette(
      "gold",
      "Dourado",
      ["#b8914b"]
    ),

    palette(
      "cream",
      "Creme",
      ["#d8c5a6"]
    )
  ]);


  /* =========================================================
     PADRÕES ANIMAIS
     ========================================================= */

  const ANIMAL_MARKINGS = Object.freeze([

    option(
      "none",
      "Sem padrão"
    ),

    option(
      "spots",
      "Manchas"
    ),

    option(
      "large_spots",
      "Manchas grandes"
    ),

    option(
      "stripes",
      "Listras"
    ),

    option(
      "thin_stripes",
      "Listras finas"
    ),

    option(
      "tiger",
      "Tigrado"
    ),

    option(
      "leopard",
      "Leopardo"
    ),

    option(
      "rosette",
      "Rosetas"
    ),

    option(
      "gradient",
      "Gradiente"
    ),

    option(
      "countershade",
      "Barriga contrastante"
    ),

    option(
      "mask",
      "Máscara facial"
    ),

    option(
      "chest",
      "Peito contrastante"
    )
  ]);


  /* =========================================================
     MANCHAS CORPORAIS
     ========================================================= */

  const BODY_MARKING_TYPES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "freckles",
      "Sardas"
    ),

    option(
      "face_spots",
      "Manchas faciais"
    ),

    option(
      "body_spots",
      "Manchas corporais"
    ),

    option(
      "shoulder_marks",
      "Marcas nos ombros"
    ),

    option(
      "back_marks",
      "Marcas nas costas"
    ),

    option(
      "arms_marks",
      "Marcas nos braços"
    ),

    option(
      "legs_marks",
      "Marcas nas pernas"
    ),

    option(
      "birthmark",
      "Marca corporal"
    )
  ]);


  /* =========================================================
     MARCAS DE NASCENÇA
     ========================================================= */

  const BIRTHMARKS = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "small_face",
      "Pequena — rosto"
    ),

    option(
      "large_face",
      "Grande — rosto"
    ),

    option(
      "neck",
      "Pescoço"
    ),

    option(
      "shoulder",
      "Ombro"
    ),

    option(
      "chest",
      "Peito"
    ),

    option(
      "back",
      "Costas"
    ),

    option(
      "arm",
      "Braço"
    ),

    option(
      "hand",
      "Mão"
    ),

    option(
      "leg",
      "Perna"
    )
  ]);


  /* =========================================================
     CICATRIZES
     ========================================================= */

  const SCAR_TYPES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "face",
      "Rosto"
    ),

    option(
      "eye",
      "Olho"
    ),

    option(
      "cheek",
      "Bochecha"
    ),

    option(
      "mouth",
      "Próximo à boca"
    ),

    option(
      "neck",
      "Pescoço"
    ),

    option(
      "chest",
      "Peito"
    ),

    option(
      "back",
      "Costas"
    ),

    option(
      "arm",
      "Braço"
    ),

    option(
      "hand",
      "Mão"
    ),

    option(
      "leg",
      "Perna"
    ),

    option(
      "multiple",
      "Múltiplas"
    )
  ]);


  /* =========================================================
     TATUAGENS
     ========================================================= */

  const TATTOO_TYPES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "symbol",
      "Símbolo"
    ),

    option(
      "tribal",
      "Tribal"
    ),

    option(
      "geometric",
      "Geométrica"
    ),

    option(
      "runic",
      "Rúnica"
    ),

    option(
      "religious",
      "Religiosa"
    ),

    option(
      "nature",
      "Natural"
    ),

    option(
      "animal",
      "Animal"
    ),

    option(
      "floral",
      "Floral"
    ),

    option(
      "full_arm",
      "Fechamento de braço"
    ),

    option(
      "full_back",
      "Costas"
    )
  ]);


  const TATTOO_LOCATIONS = Object.freeze([

    option(
      "face",
      "Rosto"
    ),

    option(
      "neck",
      "Pescoço"
    ),

    option(
      "shoulder",
      "Ombro"
    ),

    option(
      "chest",
      "Peito"
    ),

    option(
      "back",
      "Costas"
    ),

    option(
      "arm",
      "Braço"
    ),

    option(
      "forearm",
      "Antebraço"
    ),

    option(
      "hand",
      "Mão"
    ),

    option(
      "leg",
      "Perna"
    ),

    option(
      "calf",
      "Panturrilha"
    )
  ]);


  /* =========================================================
     PIERCINGS
     ========================================================= */

  const PIERCINGS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "ear",
      "Orelha"
    ),

    option(
      "multiple_ear",
      "Múltiplos na orelha"
    ),

    option(
      "nose",
      "Nariz"
    ),

    option(
      "lip",
      "Lábio"
    ),

    option(
      "brow",
      "Sobrancelha"
    ),

    option(
      "septum",
      "Septo"
    ),

    option(
      "face",
      "Facial"
    )
  ]);


  /* =========================================================
     ROUPAS BASE
     ========================================================= */

  const CLOTHING_STYLES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "casual",
      "Casual"
    ),

    option(
      "adventurer",
      "Aventureiro"
    ),

    option(
      "traveler",
      "Viajante"
    ),

    option(
      "merchant",
      "Mercador"
    ),

    option(
      "noble",
      "Nobre"
    ),

    option(
      "scholar",
      "Estudioso"
    ),

    option(
      "priest",
      "Sacerdotal"
    ),

    option(
      "military",
      "Militar"
    ),

    option(
      "warrior",
      "Guerreiro"
    ),

    option(
      "mage",
      "Mago"
    ),

    option(
      "healer",
      "Curandeiro"
    ),

    option(
      "monk",
      "Monge"
    ),

    option(
      "thief",
      "Ladino"
    )
  ]);


  /* =========================================================
     CAMISAS / PARTE SUPERIOR
     ========================================================= */

  const SHIRTS = Object.freeze([

    option(
      "plain",
      "Camisa simples"
    ),

    option(
      "linen",
      "Linho"
    ),

    option(
      "shirt_open",
      "Camisa aberta"
    ),

    option(
      "tunic",
      "Túnica"
    ),

    option(
      "undershirt",
      "Camiseta"
    ),

    option(
      "vest",
      "Colete"
    ),

    option(
      "formal",
      "Formal"
    ),

    option(
      "battle",
      "Combate"
    ),

    option(
      "long_sleeve",
      "Manga longa"
    ),

    option(
      "short_sleeve",
      "Manga curta"
    )
  ]);


  /* =========================================================
     CALÇAS
     ========================================================= */

  const PANTS = Object.freeze([

    option(
      "simple",
      "Simples"
    ),

    option(
      "traveler",
      "Viajante"
    ),

    option(
      "combat",
      "Combate"
    ),

    option(
      "loose",
      "Larga"
    ),

    option(
      "tight",
      "Justa"
    ),

    option(
      "formal",
      "Formal"
    ),

    option(
      "shorts",
      "Curta"
    )
  ]);


  /* =========================================================
     VESTIDOS / SAIAS
     ========================================================= */

  const DRESSES = Object.freeze([

    option(
      "simple",
      "Simples"
    ),

    option(
      "formal",
      "Formal"
    ),

    option(
      "adventurer",
      "Aventureira"
    ),

    option(
      "ceremonial",
      "Cerimonial"
    ),

    option(
      "traveler",
      "Viajante"
    )
  ]);


  /* =========================================================
     CASACOS / MANTOS
     ========================================================= */

  const COATS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "short",
      "Curto"
    ),

    option(
      "long",
      "Longo"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "fur",
      "Peles"
    ),

    option(
      "formal",
      "Formal"
    ),

    option(
      "traveler",
      "Viajante"
    )
  ]);


  const CAPES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "short",
      "Curta"
    ),

    option(
      "long",
      "Longa"
    ),

    option(
      "hooded",
      "Com capuz"
    ),

    option(
      "ceremonial",
      "Cerimonial"
    )
  ]);


  const ROBES = Object.freeze([

    option(
      "simple",
      "Simples"
    ),

    option(
      "mage",
      "Mago"
    ),

    option(
      "priest",
      "Sacerdotal"
    ),

    option(
      "scholar",
      "Estudioso"
    ),

    option(
      "ceremonial",
      "Cerimonial"
    )
  ]);


  /* =========================================================
     CINTOS
     ========================================================= */

  const BELTS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "simple",
      "Simples"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "heavy",
      "Pesado"
    ),

    option(
      "utility",
      "Utilitário"
    ),

    option(
      "ornate",
      "Ornamentado"
    )
  ]);


  /* =========================================================
     LUVAS
     ========================================================= */

  const GLOVES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "cloth",
      "Tecido"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "combat",
      "Combate"
    ),

    option(
      "fingerless",
      "Sem dedos"
    ),

    option(
      "armored",
      "Blindadas"
    )
  ]);


  /* =========================================================
     BOTAS
     ========================================================= */

  const BOOTS = Object.freeze([

    option(
      "barefoot",
      "Descalço"
    ),

    option(
      "simple",
      "Simples"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "traveler",
      "Viajante"
    ),

    option(
      "combat",
      "Combate"
    ),

    option(
      "heavy",
      "Pesadas"
    ),

    option(
      "armored",
      "Blindadas"
    )
  ]);


  /* =========================================================
     ARMADURAS
     ========================================================= */

  const ARMOR_STYLES = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "light",
      "Leve"
    ),

    option(
      "medium",
      "Média"
    ),

    option(
      "heavy",
      "Pesada"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "chainmail",
      "Cota de malha"
    ),

    option(
      "plate",
      "Placas"
    ),

    option(
      "ornate",
      "Ornamentada"
    ),

    option(
      "tribal",
      "Tribal"
    ),

    option(
      "magical",
      "Mística"
    )
  ]);


  /* =========================================================
     CAPACETES
     ========================================================= */

  const HELMETS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "simple",
      "Capacete simples"
    ),

    option(
      "open",
      "Capacete aberto"
    ),

    option(
      "closed",
      "Capacete fechado"
    ),

    option(
      "knight",
      "Cavaleiro"
    ),

    option(
      "horned",
      "Chifrado"
    ),

    option(
      "greathelm",
      "Elmo fechado"
    )
  ]);


  /* =========================================================
     CHAPÉUS
     ========================================================= */

  const HATS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "wide_brim",
      "Aba larga"
    ),

    option(
      "traveler",
      "Viajante"
    ),

    option(
      "witch",
      "Bruxa"
    ),

    option(
      "mage",
      "Mago"
    ),

    option(
      "straw",
      "Palha"
    ),

    option(
      "fedora",
      "Chapéu clássico"
    ),

    option(
      "formal",
      "Formal"
    ),

    option(
      "military",
      "Militar"
    )
  ]);


  /* =========================================================
     CAPUZES
     ========================================================= */

  const HOODS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "simple",
      "Simples"
    ),

    option(
      "cloak",
      "Capuz de manto"
    ),

    option(
      "deep",
      "Capuz profundo"
    ),

    option(
      "traveler",
      "Viajante"
    )
  ]);


  /* =========================================================
     MÁSCARAS
     ========================================================= */

  const MASKS = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "cloth",
      "Tecido"
    ),

    option(
      "half",
      "Meia máscara"
    ),

    option(
      "full",
      "Máscara completa"
    ),

    option(
      "ceremonial",
      "Cerimonial"
    ),

    option(
      "war",
      "Máscara de guerra"
    ),

    option(
      "metal",
      "Metálica"
    ),

    option(
      "ornate",
      "Ornamentada"
    ),

    option(
      "animal",
      "Máscara animal"
    )
  ]);


  /* =========================================================
     ÓCULOS
     ========================================================= */

  const GLASSES = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "round",
      "Redondo"
    ),

    option(
      "square",
      "Quadrado"
    ),

    option(
      "thin",
      "Fino"
    ),

    option(
      "goggles",
      "Óculos de proteção"
    ),

    option(
      "monocle",
      "Monóculo"
    )
  ]);


  /* =========================================================
     COLARES
     ========================================================= */

  const NECKLACES = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "simple",
      "Simples"
    ),

    option(
      "pendant",
      "Pingente"
    ),

    option(
      "amulet",
      "Amuleto"
    ),

    option(
      "chain",
      "Corrente"
    ),

    option(
      "beads",
      "Contas"
    ),

    option(
      "ornate",
      "Ornamentado"
    )
  ]);


  /* =========================================================
     BRINCOS
     ========================================================= */

  const EARRINGS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "stud",
      "Ponto"
    ),

    option(
      "small_ring",
      "Argola pequena"
    ),

    option(
      "large_ring",
      "Argola grande"
    ),

    option(
      "ornate",
      "Ornamentado"
    )
  ]);


  /* =========================================================
     BRACELETES
     ========================================================= */

  const BRACELETS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "metal",
      "Metal"
    ),

    option(
      "beads",
      "Contas"
    ),

    option(
      "ornate",
      "Ornamentado"
    )
  ]);


  /* =========================================================
     ANÉIS
     ========================================================= */

  const RINGS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "simple",
      "Simples"
    ),

    option(
      "gem",
      "Com gema"
    ),

    option(
      "ornate",
      "Ornamentado"
    ),

    option(
      "signet",
      "Sinete"
    ),

    option(
      "magical",
      "Místico"
    )
  ]);


  /* =========================================================
     BOLSAS
     ========================================================= */

  const BAGS = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "small",
      "Pequena"
    ),

    option(
      "medium",
      "Média"
    ),

    option(
      "large",
      "Grande"
    ),

    option(
      "utility",
      "Utilitária"
    )
  ]);


  /* =========================================================
     MOCHILAS
     ========================================================= */

  const BACKPACKS = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "traveler",
      "Viajante"
    ),

    option(
      "adventurer",
      "Aventureiro"
    ),

    option(
      "large",
      "Grande"
    ),

    option(
      "framed",
      "Estruturada"
    )
  ]);


  /* =========================================================
     ALJAVAS
     ========================================================= */

  const QUIVERS = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "back",
      "Costas"
    ),

    option(
      "hip",
      "Quadril"
    ),

    option(
      "large",
      "Grande"
    )
  ]);


  /* =========================================================
     ARMAS
     ========================================================= */

  const WEAPONS = Object.freeze([

    option(
      "none",
      "Nenhuma"
    ),

    option(
      "sword",
      "Espada"
    ),

    option(
      "short_sword",
      "Espada curta"
    ),

    option(
      "great_sword",
      "Espada grande"
    ),

    option(
      "dagger",
      "Adaga"
    ),

    option(
      "spear",
      "Lança"
    ),

    option(
      "halberd",
      "Alabarda"
    ),

    option(
      "axe",
      "Machado"
    ),

    option(
      "great_axe",
      "Machado grande"
    ),

    option(
      "mace",
      "Maça"
    ),

    option(
      "hammer",
      "Martelo"
    ),

    option(
      "staff",
      "Cajado"
    ),

    option(
      "wand",
      "Varinha"
    ),

    option(
      "bow",
      "Arco"
    ),

    option(
      "crossbow",
      "Besta"
    ),

    option(
      "shield",
      "Escudo"
    )
  ]);


  /* =========================================================
     OBJETOS DE MÃO
     ========================================================= */

  const HAND_ITEMS = Object.freeze([

    option(
      "none",
      "Nenhum"
    ),

    option(
      "book",
      "Livro"
    ),

    option(
      "lantern",
      "Lanterna"
    ),

    option(
      "bottle",
      "Frasco"
    ),

    option(
      "cup",
      "Copo"
    ),

    option(
      "tool",
      "Ferramenta"
    ),

    option(
      "scroll",
      "Pergaminho"
    ),

    option(
      "small_pouch",
      "Pequena bolsa"
    )
  ]);


  /* =========================================================
     ARQUÉTIPOS RACIAIS
     =========================================================

     Aqui estão as REGRAS VISUAIS.

     "allowed" define opções possíveis.
     "hidden" remove categorias.
     "required" obriga determinada característica.
     ========================================================= */

  const RACE_RULES = Object.freeze({

    humano: {

      bodyTypes:
        [
          "slim",
          "lean",
          "average",
          "broad",
          "heavy"
        ],

      skinPalette:
        "humana",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "human",

      horns:
        false,

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    elfo: {

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      skinPalette:
        "elfica",

      hair:
        "normal",

      facialHair:
        "limited",

      ears:
        "elf",

      horns:
        false,

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    anao: {

      bodyTypes:
        [
          "average",
          "broad",
          "heavy"
        ],

      skinPalette:
        "ana",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "human",

      horns:
        false,

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    orc: {

      bodyTypes:
        [
          "broad",
          "heavy",
          "average"
        ],

      skinPalette:
        "orc",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "orc",

      horns:
        false,

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    fada: {

      bodyTypes:
        [
          "slim",
          "lean"
        ],

      skinPalette:
        "fada",

      hair:
        "normal",

      facialHair:
        false,

      ears:
        "normal",

      horns:
        false,

      wings:
        "required",

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    animalha: {

      bodyTypes:
        [
          "slim",
          "lean",
          "average",
          "broad",
          "heavy"
        ],

      skinPalette:
        "animalia",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "animal",

      horns:
        "animal-dependent",

      wings:
        "animal-dependent",

      tail:
        "animal-dependent",

      animalFeatures:
        true,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true,

      fur:
        true
    },


    vampiro: {

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      skinPalette:
        "undead",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "human",

      horns:
        false,

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    centauro: {

      bodyTypes:
        [
          "broad",
          "heavy",
          "average"
        ],

      skinPalette:
        "humana",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "human",

      horns:
        false,

      wings:
        false,

      tail:
        "required",

      animalFeatures:
        true,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    duende: {

      bodyTypes:
        [
          "slim",
          "lean"
        ],

      skinPalette:
        "humana",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "human",

      horns:
        false,

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    "povo_aquatico": {

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      skinPalette:
        "nature",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "aquatic",

      horns:
        false,

      wings:
        false,

      tail:
        "optional",

      animalFeatures:
        true,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    "povo_natureza": {

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      skinPalette:
        "nature",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "normal",

      horns:
        "optional",

      wings:
        "optional",

      tail:
        "optional",

      animalFeatures:
        true,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    neraliano: {

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      skinPalette:
        "nature",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "aquatic",

      horns:
        false,

      wings:
        false,

      tail:
        "optional",

      animalFeatures:
        true,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    aureano: {

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      skinPalette:
        "humana",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "normal",

      horns:
        false,

      wings:
        "optional",

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    "povo_nuvens": {

      bodyTypes:
        [
          "slim",
          "lean"
        ],

      skinPalette:
        "fada",

      hair:
        "normal",

      facialHair:
        false,

      ears:
        "normal",

      horns:
        false,

      wings:
        "optional",

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    colosso: {

      bodyTypes:
        [
          "broad",
          "heavy"
        ],

      skinPalette:
        "humana",

      hair:
        "normal",

      facialHair:
        true,

      ears:
        "normal",

      horns:
        "optional",

      wings:
        "required",

      tail:
        "optional",

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    },


    troll: {

      bodyTypes:
        [
          "broad",
          "heavy"
        ],

      skinPalette:
        "nature",

      hair:
        "limited",

      facialHair:
        true,

      ears:
        "orc",

      horns:
        "optional",

      wings:
        false,

      tail:
        false,

      animalFeatures:
        false,

      markings:
        true,

      birthmarks:
        true,

      scars:
        true,

      tattoos:
        true,

      piercings:
        true
    }
  });


  /* =========================================================
     RESTRIÇÕES DE COR DE PELE
     ========================================================= */

  const SKIN_RESTRICTIONS = Object.freeze({

    humano: [
      "humana"
    ],

    elfo: [
      "elfica"
    ],

    anao: [
      "ana"
    ],

    orc: [
      "orc"
    ],

    fada: [
      "fada"
    ],

    animalha: [
      "animalia"
    ],

    vampiro: [
      "undead"
    ],

    centauro: [
      "humana"
    ],

    duende: [
      "humana"
    ],

    "povo_aquatico": [
      "nature"
    ],

    "povo_natureza": [
      "nature",
      "humana"
    ],

    neraliano: [
      "nature"
    ],

    aureano: [
      "humana"
    ],

    "povo_nuvens": [
      "fada"
    ],

    colosso: [
      "humana"
    ],

    troll: [
      "nature"
    ]
  });


  /* =========================================================
     ANIMALHA — CATEGORIAS
     ========================================================= */

  const ANIMALHA_CATEGORIES = Object.freeze({

    voadores: {

      id:
        "voadores",

      name:
        "Voadores",

      description:
        "Animalias adaptados à movimentação aérea.",

      bodyTypes:
        [
          "slim",
          "lean",
          "average"
        ],

      movement:
        "air",

      animals:
        [
          "falcao",
          "aguia",
          "coruja"
        ]
    },


    terrestres: {

      id:
        "terrestres",

      name:
        "Terrestres",

      description:
        "Animalias predominantemente terrestres.",

      bodyTypes:
        [
          "slim",
          "lean",
          "average",
          "broad",
          "heavy"
        ],

      movement:
        "ground",

      animals:
        [
          "pantera",
          "tigre",
          "leao",
          "gato",
          "lobo",
          "raposa",
          "urso",
          "rinoceronte",
          "rato"
        ]
    },


    marinhos: {

      id:
        "marinhos",

      name:
        "Marinhos",

      description:
        "Animalias adaptados a ambientes aquáticos.",

      bodyTypes:
        [
          "lean",
          "average",
          "broad",
          "heavy"
        ],

      movement:
        "aquatic",

      animals:
        [
          "tubarao",
          "foca",
          "crocodilo",
          "hipopotamo"
        ]
    },


    pequenos: {

      id:
        "pequenos",

      name:
        "Pequeno porte",

      description:
        "Animalias de menor estrutura corporal.",

      bodyTypes:
        [
          "slim",
          "lean"
        ],

      movement:
        "special",

      animals:
        [
          "gato",
          "raposa",
          "rato",
          "coruja",
          "cobra"
        ]
    },


    grandes: {

      id:
        "grandes",

      name:
        "Grande porte",

      description:
        "Animalias de grande estrutura corporal.",

      bodyTypes:
        [
          "broad",
          "heavy"
        ],

      movement:
        "ground",

      animals:
        [
          "tigre",
          "leao",
          "urso",
          "rinoceronte",
          "hipopotamo"
        ]
    }
  });


  /* =========================================================
     ANIMALHA — ANIMAIS
     ========================================================= */

  const ANIMALHA_ANIMALS = Object.freeze({

    pantera: {

      id:
        "pantera",

      name:
        "Pantera",

      category:
        "terrestres",

      body:
        "lean",

      fur:
        [
          "#171614",
          "#24211e",
          "#322b26"
        ],

      markings:
        [
          "none",
          "spots"
        ],

      ears:
        "feline",

      tail:
        "feline",

      eyes:
        [
          "amber",
          "green"
        ],

      modifiers:
        {
          agilidade: 1,
          percepcao: 1
        }
    },


    tigre: {

      id:
        "tigre",

      name:
        "Tigre",

      category:
        "terrestres",

      body:
        "broad",

      fur:
        [
          "#c89455",
          "#d5a96d"
        ],

      markings:
        [
          "stripes",
          "tiger"
        ],

      ears:
        "feline",

      tail:
        "feline",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          forca: 1,
          agilidade: 1
        }
    },


    leao: {

      id:
        "leao",

      name:
        "Leão",

      category:
        "terrestres",

      body:
        "heavy",

      fur:
        [
          "#b98c57",
          "#cba66d"
        ],

      markings:
        [
          "none"
        ],

      ears:
        "feline",

      tail:
        "feline",

      mane:
        true,

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          forca: 1,
          presenca: 1
        }
    },


    gato: {

      id:
        "gato",

      name:
        "Gato",

      category:
        "terrestres",

      body:
        "slim",

      fur:
        [
          "#8e8174",
          "#b3a89c",
          "#5d5853",
          "#d1c4af"
        ],

      markings:
        [
          "spots",
          "stripes",
          "none"
        ],

      ears:
        "feline",

      tail:
        "feline",

      eyes:
        [
          "green",
          "blue",
          "amber"
        ],

      modifiers:
        {
          agilidade: 1,
          percepcao: 1
        }
    },


    lobo: {

      id:
        "lobo",

      name:
        "Lobo",

      category:
        "terrestres",

      body:
        "average",

      fur:
        [
          "#6f706e",
          "#555754",
          "#8f918b",
          "#ddd9d0"
        ],

      markings:
        [
          "countershade"
        ],

      ears:
        "canine",

      tail:
        "wolf",

      eyes:
        [
          "amber",
          "brown"
        ],

      modifiers:
        {
          percepcao: 1,
          vigor: 1
        }
    },


    raposa: {

      id:
        "raposa",

      name:
        "Raposa",

      category:
        "terrestres",

      body:
        "slim",

      fur:
        [
          "#b6653e",
          "#d07b4e"
        ],

      markings:
        [
          "countershade"
        ],

      ears:
        "canine",

      tail:
        "fox",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          agilidade: 1,
          intelecto: 1
        }
    },


    falcao: {

      id:
        "falcao",

      name:
        "Falcão",

      category:
        "voadores",

      body:
        "slim",

      feathers:
        [
          "#736e65",
          "#90897e",
          "#b6b0a4"
        ],

      markings:
        [
          "countershade"
        ],

      ears:
        "bird",

      wings:
        "bird",

      tail:
        "bird",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          percepcao: 1,
          precisao: 1
        }
    },


    aguia: {

      id:
        "aguia",

      name:
        "Águia",

      category:
        "voadores",

      body:
        "average",

      feathers:
        [
          "#6b6257",
          "#9d978d",
          "#d6d0c3"
        ],

      markings:
        [
          "countershade"
        ],

      ears:
        "bird",

      wings:
        "bird",

      tail:
        "bird",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          percepcao: 1,
          precisao: 1
        }
    },


    coruja: {

      id:
        "coruja",

      name:
        "Coruja",

      category:
        "voadores",

      body:
        "slim",

      feathers:
        [
          "#6e665d",
          "#857d71",
          "#c2b9aa"
        ],

      markings:
        [
          "spots"
        ],

      ears:
        "bird",

      wings:
        "bird",

      tail:
        "bird",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          percepcao: 1,
          intelecto: 1
        }
    },


    cobra: {

      id:
        "cobra",

      name:
        "Cobra",

      category:
        "pequenos",

      body:
        "slim",

      scales:
        [
          "#5f704f",
          "#8a9a63",
          "#9b7650"
        ],

      markings:
        [
          "stripes",
          "spots"
        ],

      tail:
        "reptile",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          precisao: 1,
          percepcao: 1
        }
    },


    crocodilo: {

      id:
        "crocodilo",

      name:
        "Crocodilo",

      category:
        "marinhos",

      body:
        "heavy",

      scales:
        [
          "#536342",
          "#65754d",
          "#3f4e37"
        ],

      markings:
        [
          "spots"
        ],

      tail:
        "reptile",

      eyes:
        [
          "amber"
        ],

      modifiers:
        {
          forca: 1,
          vigor: 1
        }
    },


    urso: {

      id:
        "urso",

      name:
        "Urso",

      category:
        "grandes",

      body:
        "heavy",

      fur:
        [
          "#4d3528",
          "#76503a",
          "#96705a"
        ],

      markings:
        [
          "none"
        ],

      ears:
        "animal",

      tail:
        "small",

      eyes:
        [
          "brown"
        ],

      modifiers:
        {
          forca: 1,
          vigor: 1
        }
    },


    rinoceronte: {

      id:
        "rinoceronte",

      name:
        "Rinoceronte",

      category:
        "grandes",

      body:
        "heavy",

      skin:
        [
          "#686760",
          "#7c7b72",
          "#565650"
        ],

      markings:
        [
          "none"
        ],

      ears:
        "animal",

      horns:
        "large",

      eyes:
        [
          "dark_brown"
        ],

      modifiers:
        {
          vigor: 2
        }
    },


    hipopotamo: {

      id:
        "hipopotamo",

      name:
        "Hipopótamo",

      category:
        "marinhos",

      body:
        "heavy",

      skin:
        [
          "#756f6d",
          "#8d8582",
          "#5d5754"
        ],

      markings:
        [
          "none"
        ],

      ears:
        "animal",

      tail:
        "small",

      eyes:
        [
          "dark_brown"
        ],

      modifiers:
        {
          vigor: 1,
          forca: 1
        }
    },


    rato: {

      id:
        "rato",

      name:
        "Rato",

      category:
        "pequenos",

      body:
        "slim",

      fur:
        [
          "#82776e",
          "#a49386",
          "#615b56"
        ],

      markings:
        [
          "none"
        ],

      ears:
        "large",

      tail:
        "long",

      eyes:
        [
          "dark_brown"
        ],

      modifiers:
        {
          agilidade: 1,
          percepcao: 1
        }
    },


    tubarao: {

      id:
        "tubarao",

      name:
        "Tubarão",

      category:
        "marinhos",

      body:
        "broad",

      skin:
        [
          "#66727a",
          "#879299",
          "#515d64"
        ],

      markings:
        [
          "countershade"
        ],

      tail:
        "reptile",

      eyes:
        [
          "gray"
        ],

      modifiers:
        {
          vigor: 1,
          percepcao: 1
        }
    },


    foca: {

      id:
        "foca",

      name:
        "Foca",

      category:
        "marinhos",

      body:
        "average",

      fur:
        [
          "#777d7f",
          "#9a9fa0",
          "#565c5f"
        ],

      markings:
        [
          "spots"
        ],

      ears:
        "small",

      eyes:
        [
          "dark_brown"
        ],

      modifiers:
        {
          vigor: 1,
          agilidade: 1
        }
    }
  });


  /* =========================================================
     SISTEMA DE COR / TINTA
     ========================================================= */

  const COLOR_CHANNELS = Object.freeze({

    skin:
      "skin",

    hair:
      "hair",

    eyes:
      "eyes",

    fur:
      "fur",

    feathers:
      "feathers",

    scales:
      "scales",

    clothes:
      "clothes",

    armor:
      "armor",

    accessory:
      "accessory",

    markings:
      "markings",

    tattoo:
      "tattoo"
  });


  /* =========================================================
     MATERIAIS
     ========================================================= */

  const MATERIALS = Object.freeze([

    option(
      "cloth",
      "Tecido"
    ),

    option(
      "leather",
      "Couro"
    ),

    option(
      "metal",
      "Metal"
    ),

    option(
      "iron",
      "Ferro"
    ),

    option(
      "steel",
      "Aço"
    ),

    option(
      "silver",
      "Prata"
    ),

    option(
      "gold",
      "Ouro"
    ),

    option(
      "wood",
      "Madeira"
    ),

    option(
      "stone",
      "Pedra"
    ),

    option(
      "crystal",
      "Cristal"
    ),

    option(
      "bone",
      "Osso"
    ),

    option(
      "fur",
      "Pele / Pelagem"
    )
  ]);


  /* =========================================================
     PRESETS DE PERSONALIDADE VISUAL
     ========================================================= */

  const VISUAL_PRESETS = Object.freeze({

    adventurer: {

      name:
        "Aventureiro",

      values: {

        bodyType:
          "average",

        hairStyle:
          "medium",

        clothing:
          "adventurer",

        shirt:
          "plain",

        pants:
          "traveler",

        belt:
          "leather",

        gloves:
          "leather",

        boots:
          "traveler"
      }
    },


    warrior: {

      name:
        "Guerreiro",

      values: {

        bodyType:
          "broad",

        hairStyle:
          "short",

        clothing:
          "warrior",

        armor:
          "light",

        belt:
          "heavy",

        gloves:
          "combat",

        boots:
          "combat"
      }
    },


    mage: {

      name:
        "Mago",

      values: {

        bodyType:
          "slim",

        hairStyle:
          "medium",

        clothing:
          "mage",

        robe:
          "mage",

        cloak:
          "hooded",

        staff:
          "staff"
      }
    },


    healer: {

      name:
        "Curandeiro",

      values: {

        bodyType:
          "average",

        hairStyle:
          "long",

        clothing:
          "healer",

        robe:
          "priest",

        necklace:
          "amulet"
      }
    },


    monk: {

      name:
        "Monge",

      values: {

        bodyType:
          "lean",

        hairStyle:
          "short",

        clothing:
          "monk",

        shirt:
          "tunic",

        gloves:
          "cloth",

        boots:
          "simple"
      }
    },


    traveler: {

      name:
        "Viajante",

      values: {

        bodyType:
          "lean",

        hairStyle:
          "messy",

        clothing:
          "traveler",

        coat:
          "traveler",

        cape:
          "short",

        backpack:
          "traveler"
      }
    }
  });


  /* =========================================================
     ESTRUTURA COMPLETA DE PERSONALIZAÇÃO
     ========================================================= */

  const CUSTOMIZATION = Object.freeze({

    identity: {

      enabled:
        true,

      fields: [

        "gender",

        "name"
      ]
    },


    body: {

      enabled:
        true,

      fields: [

        "bodyType",

        "height",

        "width",

        "shoulders",

        "torso",

        "arms",

        "legs",

        "head"
      ]
    },


    face: {

      enabled:
        true,

      fields: [

        "headShape",

        "eyes",

        "eyeColor",

        "eyebrows",

        "nose",

        "mouth"
      ]
    },


    skin: {

      enabled:
        true,

      fields: [

        "palette",

        "variant"
      ]
    },


    hair: {

      enabled:
        true,

      fields: [

        "style",

        "color"
      ]
    },


    facialHair: {

      enabled:
        true,

      fields: [

        "style",

        "color"
      ]
    },


    racialFeatures: {

      enabled:
        true,

      fields: [

        "ears",

        "horns",

        "wings",

        "tail",

        "fur",

        "feathers",

        "scales"
      ]
    },


    markings: {

      enabled:
        true,

      fields: [

        "type",

        "color",

        "opacity",

        "scale",

        "location"
      ]
    },


    birthmark: {

      enabled:
        true,

      fields: [

        "type",

        "location",

        "color",

        "opacity",

        "scale"
      ]
    },


    scars: {

      enabled:
        true,

      fields: [

        "type",

        "location",

        "count",

        "size"
      ]
    },


    tattoos: {

      enabled:
        true,

      fields: [

        "type",

        "location",

        "color",

        "opacity",

        "scale"
      ]
    },


    piercings: {

      enabled:
        true,

      fields: [

        "type",

        "location",

        "material"
      ]
    },


    clothing: {

      enabled:
        true,

      fields: [

        "style",

        "shirt",

        "pants",

        "dress",

        "coat",

        "cape",

        "robe",

        "belt",

        "gloves",

        "boots"
      ]
    },


    armor: {

      enabled:
        true,

      fields: [

        "style",

        "helmet",

        "shoulders",

        "chest",

        "arms",

        "legs"
      ]
    },


    headwear: {

      enabled:
        true,

      fields: [

        "hat",

        "headband",

        "hood",

        "helmet",

        "mask",

        "glasses"
      ]
    },


    jewelry: {

      enabled:
        true,

      fields: [

        "necklace",

        "earrings",

        "bracelets",

        "rings",

        "watch"
      ]
    },


    equipment: {

      enabled:
        true,

      fields: [

        "bag",

        "pouch",

        "backpack",

        "quiver",

        "holster",

        "scabbard"
      ]
    },


    weapons: {

      enabled:
        true,

      fields: [

        "mainHand",

        "offHand",

        "backWeapon",

        "secondaryWeapon"
      ]
    },


    props: {

      enabled:
        true,

      fields: [

        "book",

        "lantern",

        "bottle",

        "scroll",

        "tool",

        "trinket"
      ]
    }
  });


  /* =========================================================
     ASSETS REAIS
     =========================================================

     No momento deixamos o catálogo preparado.

     Quando começarmos a colocar as ilustrações definitivas,
     cada item poderá receber algo como:

       src:
       thumbnail:
       mask:
       tintable:
       palette:
       anchor:
       zIndex:

     ========================================================= */

  const ASSET_MANIFEST = Object.freeze({

    bodies: {},

    heads: {},

    faces: {},

    eyes: {},

    hair: {},

    facialHair: {},

    ears: {},

    horns: {},

    wings: {},

    tails: {},

    skins: {},

    markings: {},

    birthmarks: {},

    scars: {},

    tattoos: {},

    piercings: {},

    shirts: {},

    pants: {},

    dresses: {},

    coats: {},

    capes: {},

    robes: {},

    belts: {},

    gloves: {},

    boots: {},

    armor: {},

    helmets: {},

    hats: {},

    headbands: {},

    hoods: {},

    masks: {},

    glasses: {},

    necklaces: {},

    earrings: {},

    bracelets: {},

    rings: {},

    watches: {},

    bags: {},

    pouches: {},

    backpacks: {},

    quivers: {},

    holsters: {},

    scabbards: {},

    weapons: {},

    props: {}
  });


  /* =========================================================
     ESTRUTURA DE CAMADAS
     ========================================================= */

  const DEFAULT_LAYER_ORDER = Object.freeze([

    {
      id:
        "background",

      zIndex:
        LAYERS.BACKGROUND
    },

    {
      id:
        "shadow",

      zIndex:
        LAYERS.SHADOW
    },

    {
      id:
        "back_hair",

      zIndex:
        LAYERS.BACK_HAIR
    },

    {
      id:
        "tail_back",

      zIndex:
        LAYERS.TAIL_BACK
    },

    {
      id:
        "wings_back",

      zIndex:
        LAYERS.WINGS_BACK
    },

    {
      id:
        "body",

      zIndex:
        LAYERS.BODY
    },

    {
      id:
        "body_markings",

      zIndex:
        LAYERS.BODY_MARKINGS
    },

    {
      id:
        "clothing_under",

      zIndex:
        LAYERS.CLOTHING_UNDER
    },

    {
      id:
        "clothing_main",

      zIndex:
        LAYERS.CLOTHING_MAIN
    },

    {
      id:
        "clothing_upper",

      zIndex:
        LAYERS.CLOTHING_UPPER
    },

    {
      id:
        "armor",

      zIndex:
        LAYERS.ARMOR
    },

    {
      id:
        "wings_front",

      zIndex:
        LAYERS.WINGS_FRONT
    },

    {
      id:
        "face",

      zIndex:
        LAYERS.FACE
    },

    {
      id:
        "ears",

      zIndex:
        LAYERS.EARS
    },

    {
      id:
        "horns",

      zIndex:
        LAYERS.HORNS
    },

    {
      id:
        "hair",

      zIndex:
        LAYERS.HAIR
    },

    {
      id:
        "facial_features",

      zIndex:
        LAYERS.FACIAL_FEATURES
    },

    {
      id:
        "face_markings",

      zIndex:
        LAYERS.FACE_MARKINGS
    },

    {
      id:
        "headwear",

      zIndex:
        LAYERS.HEADWEAR
    },

    {
      id:
        "mask",

      zIndex:
        LAYERS.MASK
    },

    {
      id:
        "jewelry",

      zIndex:
        LAYERS.JEWELRY
    },

    {
      id:
        "accessories",

      zIndex:
        LAYERS.ACCESSORY
    },

    {
      id:
        "weapons",

      zIndex:
        LAYERS.WEAPON
    },

    {
      id:
        "effects",

      zIndex:
        LAYERS.EFFECT
    }
  ]);


  /* =========================================================
     CONFIGURAÇÃO DO EDITOR
     ========================================================= */

  const EDITOR = Object.freeze({

    version:
      VERSION,

    allowLivePreview:
      true,

    allowCustomColors:
      false,

    allowLayerReorder:
      false,

    useRaceRestrictions:
      true,

    useAnimalhaRestrictions:
      true,

    preserveEquipment:
      true,

    preserveAccessories:
      true,

    defaultPreset:
      "adventurer"
  });


  /* =========================================================
     API
     ========================================================= */

  const API = {

    version:
      VERSION,

    editor:
      EDITOR,

    layers:
      LAYERS,

    parts:
      PARTS,

    bodyTypes:
      BODY_TYPES,

    bodyProportions:
      BODY_PROPORTIONS,

    skinPalettes:
      SKIN_PALETTES,

    skinRestrictions:
      SKIN_RESTRICTIONS,

    hairStyles:
      HAIR_STYLES,

    hairColors:
      HAIR_COLORS,

    facialHair:
      FACIAL_HAIR,

    eyeShapes:
      EYE_SHAPES,

    eyeColors:
      EYE_COLORS,

    eyebrows:
      EYEBROWS,

    noses:
      NOSES,

    mouths:
      MOUTHS,

    humanEars:
      HUMAN_EARS,

    elfEars:
      ELF_EARS,

    hornStyles:
      HORN_STYLES,

    wingTypes:
      WING_TYPES,

    tailTypes:
      TAIL_TYPES,

    furColors:
      FUR_COLORS,

    animalMarkings:
      ANIMAL_MARKINGS,

    bodyMarkings:
      BODY_MARKING_TYPES,

    birthmarks:
      BIRTHMARKS,

    scars:
      SCAR_TYPES,

    tattoos:
      TATTOO_TYPES,

    tattooLocations:
      TATTOO_LOCATIONS,

    piercings:
      PIERCINGS,

    clothingStyles:
      CLOTHING_STYLES,

    shirts:
      SHIRTS,

    pants:
      PANTS,

    dresses:
      DRESSES,

    coats:
      COATS,

    capes:
      CAPES,

    robes:
      ROBES,

    belts:
      BELTS,

    gloves:
      GLOVES,

    boots:
      BOOTS,

    armorStyles:
      ARMOR_STYLES,

    helmets:
      HELMETS,

    hats:
      HATS,

    hoods:
      HOODS,

    masks:
      MASKS,

    glasses:
      GLASSES,

    necklaces:
      NECKLACES,

    earrings:
      EARRINGS,

    bracelets:
      BRACELETS,

    rings:
      RINGS,

    bags:
      BAGS,

    backpacks:
      BACKPACKS,

    quivers:
      QUIVERS,

    weapons:
      WEAPONS,

    handItems:
      HAND_ITEMS,

    materials:
      MATERIALS,

    colorChannels:
      COLOR_CHANNELS,

    raceRules:
      RACE_RULES,

    animalhaCategories:
      ANIMALHA_CATEGORIES,

    animalhaAnimals:
      ANIMALHA_ANIMALS,

    customization:
      CUSTOMIZATION,

    presets:
      VISUAL_PRESETS,

    assets:
      ASSET_MANIFEST,

    layerOrder:
      DEFAULT_LAYER_ORDER
  };


  /* =========================================================
     EXPOSIÇÃO GLOBAL
     ========================================================= */

  window.AERIONPersonagemAssets =
    Object.freeze(
      API
    );


  /* =========================================================
     READY
     ========================================================= */

  function announceReady() {
    window.dispatchEvent(
      new CustomEvent(
        "aerion:personagem-assets:ready"
      )
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      announceReady,
      {
        once:
          true
      }
    );
  } else {
    announceReady();
  }


  console.info(
    "[AERION] personagem-assets.js carregado — catálogo de personalização disponível."
  );

})();