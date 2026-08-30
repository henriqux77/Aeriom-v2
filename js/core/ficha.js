/* =========================================================
   AERION — CRIAÇÃO DE FICHA
   js/core/ficha.js

   VERSÃO CORRIGIDA
   - 11 etapas, incluindo APARÊNCIA
   - Identidade
   - Raças
   - Aparência 2D
   - Classes
   - Atributos
   - Poder / D100
   - Mana
   - Perícias
   - Técnicas
   - Inventário
   - Revisão
   - Autosave local
   - Dados limitados
   - Clique para selecionar dado
   - Drag & Drop
   - Troca de dados
   - Devolução de dados
   - Gráfico radial de 8 eixos
   - Modificadores raciais
   - Porte / altura
   - Deslocamento
   - Voo independente de Animalha

   IMPORTANTE
   - A etapa de APARÊNCIA é criada automaticamente caso
     o HTML ainda não possua os controles específicos.
   - Os valores raciais abaixo continuam como PROPOSTAS
     mecânicas até aprovação final dos desenvolvedores.
   - O sistema de sacrificar dados NÃO está implementado.
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */

  const CONFIG = Object.freeze({
    draftKey: "aerion:ficha:draft:v6",
    autosaveDelay: 700,
    maxAvatarSize: 6 * 1024 * 1024
  });

  /* =========================================================
     ETAPAS
  ========================================================= */

  const STEPS = Object.freeze([
    { id: "identity", title: "Identidade" },
    { id: "race", title: "Raça" },
    { id: "appearance", title: "Aparência" },
    { id: "class", title: "Classe" },
    { id: "attributes", title: "Atributos" },
    { id: "power", title: "Poder" },
    { id: "mana", title: "Mana" },
    { id: "skills", title: "Perícias" },
    { id: "techniques", title: "Técnicas" },
    { id: "inventory", title: "Inventário" },
    { id: "review", title: "Revisão" }
  ]);

  /* =========================================================
     ATRIBUTOS
  ========================================================= */

  const ATTRIBUTE_ORDER = Object.freeze([
    "forca",
    "vigor",
    "agilidade",
    "precisao",
    "intelecto",
    "controle",
    "presenca",
    "percepcao"
  ]);

  const ATTRIBUTE_NAMES = Object.freeze({
    forca: "Força",
    vigor: "Vigor",
    agilidade: "Agilidade",
    precisao: "Precisão",
    intelecto: "Intelecto",
    controle: "Controle",
    presenca: "Presença",
    percepcao: "Percepção"
  });

  /* =========================================================
     PISCINA DE DADOS
  ========================================================= */

  const DICE_LIMITS = Object.freeze({
    d4: 1,
    d6: 2,
    d8: 1,
    d10: 1,
    d12: 1,
    d20: 2
  });

  const DICE_VALUES = Object.freeze({
    d4: 4,
    d6: 6,
    d8: 8,
    d10: 10,
    d12: 12,
    d20: 20
  });

  /* =========================================================
     COMBATE — BASE
  ========================================================= */

  const COMBAT_BASE = Object.freeze({
    hp: 10,
    movement: 9
  });

  const SIZE_DATA = Object.freeze({
    pequeno: {
      label: "Pequeno",
      lifeBonus: 1,
      movementMultiplier: 0.5
    },

    medio: {
      label: "Médio",
      lifeBonus: 3,
      movementMultiplier: 1
    },

    grande: {
      label: "Grande",
      lifeBonus: 5,
      movementMultiplier: 0.5
    },

    colossal: {
      label: "Colossal",
      lifeBonus: 5,
      movementMultiplier: 0.5
    }
  });

  /* =========================================================
     PODERES
  ========================================================= */

  const PRIMARY_POWERS = Object.freeze([
    "Fogo",
    "Ar",
    "Terra",
    "Água"
  ]);

  const PARALLEL_POWERS = Object.freeze([
    "Gelo",
    "Magnetismo",
    "Vegetação",
    "Tecnologia",
    "Gravidade",
    "Som"
  ]);

  const ALL_POWERS = Object.freeze([
    ...PRIMARY_POWERS,
    ...PARALLEL_POWERS
  ]);

  /* =========================================================
     PERÍCIAS
  ========================================================= */

  const SKILLS = Object.freeze([
    {
      id: "acrobacia",
      name: "Acrobacia",
      description: "Equilíbrio, movimentos rápidos e manobras."
    },

    {
      id: "atletismo",
      name: "Atletismo",
      description: "Força corporal, corrida, escalada e esforço físico."
    },

    {
      id: "furtividade",
      name: "Furtividade",
      description: "Mover-se sem ser percebido."
    },

    {
      id: "percepcao",
      name: "Percepção",
      description: "Perceber detalhes, ameaças e mudanças no ambiente."
    },

    {
      id: "investigacao",
      name: "Investigação",
      description: "Analisar pistas e descobrir informações."
    },

    {
      id: "conhecimento",
      name: "Conhecimento",
      description: "Conhecimentos gerais e especializados."
    },

    {
      id: "medicina",
      name: "Medicina",
      description: "Tratamento, primeiros socorros e diagnóstico."
    },

    {
      id: "sobrevivencia",
      name: "Sobrevivência",
      description: "Rastreamento, exploração e adaptação ambiental."
    },

    {
      id: "persuasao",
      name: "Persuasão",
      description: "Convencer e negociar de maneira legítima."
    },

    {
      id: "intuicao",
      name: "Intuição",
      description: "Perceber intenções e situações suspeitas."
    },

    {
      id: "enganacao",
      name: "Enganação",
      description: "Blefes, disfarces e manipulação verbal."
    },

    {
      id: "tatica",
      name: "Tática",
      description: "Planejamento e leitura de situações de combate."
    },

    {
      id: "oficio",
      name: "Ofício / Crafting",
      description: "Construção, reparo e criação de itens."
    },

    {
      id: "controle_mana",
      name: "Controle de Mana",
      description: "Domínio e precisão na manipulação de Mana."
    }
  ]);

  /* =========================================================
     CLASSES
  ========================================================= */

  const CLASSES = Object.freeze([
    {
      id: "guerreiro",
      name: "Guerreiro",
      role: "Combatente",
      skillModifiers: {
        atletismo: 1,
        tatica: 1
      }
    },

    {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",
      skillModifiers: {
        conhecimento: 1,
        controle_mana: 1
      }
    },

    {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",
      skillModifiers: {
        medicina: 1,
        intuicao: 1
      }
    },

    {
      id: "monge",
      name: "Monge",
      role: "Marcial",
      skillModifiers: {
        atletismo: 1,
        controle_mana: 1
      }
    }
  ]);

  /* =========================================================
     RAÇAS BASE
  ========================================================= */

  const RACES = Object.freeze([
    {
      id: "humano",
      name: "Humano",

      maleImage:
        "https://i.ibb.co/TBNmfF0S/file-000000008b74820ea8b432fcf06ed975.png",

      femaleImage:
        "https://i.ibb.co/LdmxJ2h9/file-000000004b94820ead12a26ca92d75b7.png",

      description:
        "Humanos são conhecidos por sua capacidade de adaptação e aprendizado.",

      profile:
        "Adaptabilidade e aprendizado.",

      attrMods: {
        intelecto: 1,
        presenca: 1
      },

      feature:
        "Adaptação: pode repetir um teste recém-falhado uma vez por cena.",

      size: "medio",

      height: {
        min: 150,
        max: 200
      },

      movement: {},

      flight: false
    },

    {
      id: "elfo",
      name: "Elfo",

      maleImage:
        "https://i.ibb.co/0y8WXSr8/file-00000000495c820e99fc5de509918d90.png",

      femaleImage:
        "https://i.ibb.co/F1DCc3j/file-00000000dcf8820e883635d6ca9de492.png",

      description:
        "Elfos possuem sentidos aguçados e forte afinidade com Mana.",

      profile:
        "Percepção e afinidade com Mana.",

      attrMods: {
        percepcao: 1,
        controle: 1,
        vigor: -1
      },

      feature:
        "Percepção Élfica: percebe alterações de Mana e sinais difíceis de notar.",

      size: "medio",

      height: {
        min: 155,
        max: 205
      },

      movement: {},

      flight: false
    },

    {
      id: "anao",
      name: "Anão",

      maleImage:
        "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",

      femaleImage:
        "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png",

      description:
        "Anões possuem constituição robusta e forte tradição de forja.",

      profile:
        "Resistência e força estrutural.",

      attrMods: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },

      feature:
        "Forja Ancestral: facilidade temática com materiais e estruturas.",

      size: "pequeno",

      height: {
        min: 120,
        max: 155
      },

      movement: {},

      flight: false
    },

    {
      id: "orc",
      name: "Orc",

      maleImage:
        "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",

      femaleImage:
        "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png",

      description:
        "Orcs são fisicamente poderosos e naturalmente resistentes.",

      profile:
        "Potência física e resistência.",

      attrMods: {
        forca: 1,
        vigor: 1,
        presenca: -1
      },

      feature:
        "Fúria de Sangue: resposta física intensa em situações extremas.",

      size: "grande",

      height: {
        min: 170,
        max: 220
      },

      movement: {},

      flight: false
    },

    {
      id: "centauro",
      name: "Centauro",

      maleImage:
        "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",

      femaleImage:
        "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png",

      description:
        "Centauros unem anatomia humanoide e equina.",

      profile:
        "Velocidade terrestre e potência física.",

      attrMods: {
        forca: 1,
        agilidade: 1,
        controle: -1
      },

      feature:
        "Galope Ancestral: deslocamento terrestre excepcional.",

      size: "grande",

      height: {
        min: 180,
        max: 240
      },

      movement: {
        groundMultiplier: 2
      },

      flight: false
    },

    {
      id: "vampiro",
      name: "Vampiro",

      maleImage:
        "https://i.ibb.co/PGFcNRXZ/file-0000000019dc820ea49a893a9831ffeb.png",

      femaleImage:
        "https://i.ibb.co/Kpx8jh0j/file-000000008cfc820e827a7b8376d3fd55.png",

      description:
        "Vampiros possuem uma natureza sobrenatural e sentidos aguçados.",

      profile:
        "Mobilidade, percepção e sobrevivência sobrenatural.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Regeneração Sanguínea: recuperação sobrenatural sujeita às regras da campanha.",

      size: "medio",

      height: {
        min: 155,
        max: 205
      },

      movement: {},

      flight: false
    },

    {
      id: "duende",
      name: "Duende",

      maleImage:
        "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",

      femaleImage:
        "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png",

      description:
        "Duendes possuem forte aptidão para comércio, contratos e astúcia.",

      profile:
        "Intelecto, negociação e precisão.",

      attrMods: {
        intelecto: 1,
        precisao: 1,
        forca: -1
      },

      feature:
        "Fortuna Mercante: maior facilidade para identificar fraude e preço injusto.",

      size: "pequeno",

      height: {
        min: 130,
        max: 160
      },

      movement: {},

      flight: false
    },

    {
      id: "fada",
      name: "Fada",

      maleImage:
        "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",

      femaleImage:
        "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png",

      description:
        "Fadas possuem corpos leves e grande afinidade com Mana.",

      profile:
        "Leveza, Agilidade e Mana.",

      attrMods: {
        controle: 1,
        agilidade: 1,
        forca: -1
      },

      feature:
        "Bênção Feérica: característica feérica de suporte e proteção.",

      size: "pequeno",

      height: {
        min: 130,
        max: 160
      },

      movement: {
        airMultiplier: 2
      },

      flight: true
    },

    {
      id: "povo_aquatico",
      name: "Povo Aquático",

      maleImage:
        "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png",

      femaleImage:
        "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png",

      description:
        "O Povo Aquático possui adaptações naturais para ambientes aquáticos.",

      profile:
        "Adaptação à água e percepção ambiental.",

      attrMods: {
        vigor: 1,
        percepcao: 1,
        forca: -1
      },

      feature:
        "Anfíbio: adaptação natural para respirar e agir em ambientes aquáticos.",

      size: "medio",

      height: {
        min: 150,
        max: 210
      },

      movement: {
        aquaticMultiplier: 2
      },

      flight: false
    },

    {
      id: "animalha",
      name: "Animalha",

      maleImage:
        "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",

      femaleImage:
        "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea284e54236c00052.png",

      description:
        "Animalhas possuem traços animais integrados à anatomia humanoide e escolhem uma linhagem animal.",

      profile:
        "Instinto, sentidos e adaptação natural.",

      attrMods: {},

      feature:
        "Instinto Animal: sentidos e capacidades naturais dependem da linhagem escolhida.",

      size: "medio",

      height: {
        min: 140,
        max: 210
      },

      movement: {},

      flight: false,

      animalha: true
    },

    {
      id: "povo_natureza",
      name: "Povo da Natureza",

      maleImage:
        "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",

      femaleImage:
        "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",

      description:
        "O Povo da Natureza possui forte ligação com ambientes e criaturas naturais.",

      profile:
        "Percepção ambiental e resistência natural.",

      attrMods: {
        percepcao: 1,
        vigor: 1,
        precisao: -1
      },

      feature:
        "Vínculo Natural: sintonia com ambientes e criaturas naturais.",

      size: "medio",

      height: {
        min: 150,
        max: 210
      },

      movement: {},

      flight: false
    },

    {
      id: "neraliano",
      name: "Neraliano",

      maleImage:
        "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",

      femaleImage:
        "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png",

      description:
        "Neralianos possuem adaptações relacionadas à água, profundidade e vibrações.",

      profile:
        "Adaptação aquática e leitura de vibrações.",

      attrMods: {
        vigor: 1,
        percepcao: 1,
        agilidade: -1
      },

      feature:
        "Adaptação Abissal: excelente adaptação à água, profundidade e vibrações.",

      size: "medio",

      height: {
        min: 155,
        max: 205
      },

      movement: {
        aquaticMultiplier: 2
      },

      flight: false
    },

    {
      id: "aureano",
      name: "Aureano",

      maleImage: "",
      femaleImage: "",

      description:
        "Raça associada às grandes altitudes e mobilidade vertical.",

      profile:
        "Mobilidade vertical e percepção espacial.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Corpo Celestial: adaptação a altitude, saltos e movimento vertical.",

      size: "medio",

      height: {
        min: 170,
        max: 230
      },

      movement: {},

      flight: false
    },

    {
      id: "povo_nuvens",
      name: "Povo das Nuvens",

      maleImage: "",
      femaleImage: "",

      description:
        "Raça adaptada a ambientes elevados e movimentação em grandes altitudes.",

      profile:
        "Leveza e mobilidade em grandes altitudes.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Passo do Céu: saltos e movimentação excepcionais em grandes altitudes.",

      size: "medio",

      height: {
        min: 165,
        max: 225
      },

      movement: {},

      flight: false
    },

    {
      id: "colosso",
      name: "Colosso",

      maleImage: "",
      femaleImage: "",

      description:
        "Colossos possuem corpos de grande porte e asas colossais.",

      profile:
        "Força e resistência extraordinárias.",

      attrMods: {
        forca: 2,
        vigor: 1,
        agilidade: -1
      },

      feature:
        "Asas Colossais: podem proteger, atacar e sustentar movimento aéreo conforme as regras.",

      size: "colossal",

      height: {
        min: 250,
        max: 400
      },

      movement: {
        airMultiplier: 2
      },

      flight: true
    },

    {
      id: "troll",
      name: "Troll",

      maleImage: "",
      femaleImage: "",

      description:
        "Trolls possuem grande resistência física e capacidade regenerativa.",

      profile:
        "Resistência extrema e recuperação.",

      attrMods: {
        vigor: 2,
        forca: 1,
        agilidade: -1
      },

      feature:
        "Regeneração Brutal: recuperação física excepcional.",

      size: "grande",

      height: {
        min: 220,
        max: 320
      },

      movement: {},

      flight: false
    }
  ]);

  /* =========================================================
     ANIMALHAS — SUBESCOLHAS
  ========================================================= */

  const ANIMALHA_VARIANTS = Object.freeze([
    {
      id: "pantera",
      name: "Pantera",
      category: "Felino",
      profile: "Velocidade, furtividade e percepção.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },
      feature: "Movimento silencioso e reflexos felinos.",
      size: "medio",
      height: {
        min: 145,
        max: 180
      },
      movement: {},
      flight: false
    },

    {
      id: "tigre",
      name: "Tigre",
      category: "Felino",
      profile: "Força explosiva e mobilidade.",
      attrMods: {
        forca: 1,
        agilidade: 1,
        vigor: -1
      },
      feature: "Salto e ataques físicos rápidos.",
      size: "grande",
      height: {
        min: 155,
        max: 195
      },
      movement: {},
      flight: false
    },

    {
      id: "leao",
      name: "Leão",
      category: "Felino",
      profile: "Força e presença.",
      attrMods: {
        forca: 1,
        presenca: 1,
        agilidade: -1
      },
      feature: "Presença física e intimidação naturais.",
      size: "grande",
      height: {
        min: 165,
        max: 205
      },
      movement: {},
      flight: false
    },

    {
      id: "gato",
      name: "Gato",
      category: "Felino",
      profile: "Agilidade e percepção.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },
      feature: "Equilíbrio e movimentação precisa.",
      size: "pequeno",
      height: {
        min: 135,
        max: 160
      },
      movement: {},
      flight: false
    },

    {
      id: "lobo",
      name: "Lobo",
      category: "Canídeo",
      profile: "Percepção, resistência e rastreamento.",
      attrMods: {
        percepcao: 1,
        vigor: 1,
        presenca: -1
      },
      feature: "Sentidos aguçados e excelente rastreamento.",
      size: "medio",
      height: {
        min: 145,
        max: 190
      },
      movement: {},
      flight: false
    },

    {
      id: "raposa",
      name: "Raposa",
      category: "Canídeo",
      profile: "Agilidade, astúcia e percepção.",
      attrMods: {
        agilidade: 1,
        intelecto: 1,
        forca: -1
      },
      feature: "Astúcia e movimentação silenciosa.",
      size: "pequeno",
      height: {
        min: 135,
        max: 165
      },
      movement: {},
      flight: false
    },

    {
      id: "falcao",
      name: "Falcão",
      category: "Ave",
      profile: "Percepção, precisão e mobilidade aérea.",
      attrMods: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },
      feature: "Visão extremamente aguçada.",
      size: "pequeno",
      height: {
        min: 135,
        max: 165
      },
      movement: {
        airMultiplier: 2
      },
      flight: true
    },

    {
      id: "aguia",
      name: "Águia",
      category: "Ave",
      profile: "Percepção e precisão à distância.",
      attrMods: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },
      feature: "Percepção de longa distância.",
      size: "medio",
      height: {
        min: 145,
        max: 180
      },
      movement: {
        airMultiplier: 2
      },
      flight: true
    },

    {
      id: "coruja",
      name: "Coruja",
      category: "Ave",
      profile: "Percepção noturna e intelecto.",
      attrMods: {
        percepcao: 1,
        intelecto: 1,
        forca: -1
      },
      feature: "Excelente percepção em baixa iluminação.",
      size: "pequeno",
      height: {
        min: 135,
        max: 165
      },
      movement: {
        airMultiplier: 2
      },
      flight: true
    },

    {
      id: "cobra",
      name: "Cobra",
      category: "Réptil",
      profile: "Precisão, percepção e controle corporal.",
      attrMods: {
        precisao: 1,
        percepcao: 1,
        vigor: -1
      },
      feature: "Percepção de movimento e controle corporal.",
      size: "pequeno",
      height: {
        min: 135,
        max: 165
      },
      movement: {},
      flight: false
    },

    {
      id: "crocodilo",
      name: "Crocodilo",
      category: "Réptil",
      profile: "Força, vigor e adaptação aquática.",
      attrMods: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },
      feature: "Grande resistência e adaptação aquática.",
      size: "grande",
      height: {
        min: 180,
        max: 250
      },
      movement: {
        aquaticMultiplier: 2
      },
      flight: false
    },

    {
      id: "lagarto",
      name: "Lagarto",
      category: "Réptil",
      profile: "Agilidade e percepção.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        presenca: -1
      },
      feature: "Excelente adaptação a superfícies e ambientes variados.",
      size: "medio",
      height: {
        min: 140,
        max: 180
      },
      movement: {},
      flight: false
    },

    {
      id: "urso",
      name: "Urso",
      category: "Grande porte",
      profile: "Força e Vigor.",
      attrMods: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },
      feature: "Grande potência física.",
      size: "grande",
      height: {
        min: 190,
        max: 270
      },
      movement: {},
      flight: false
    },

    {
      id: "rinoceronte",
      name: "Rinoceronte",
      category: "Grande porte",
      profile: "Vigor extremo e resistência.",
      attrMods: {
        vigor: 2,
        agilidade: -1,
        precisao: -1
      },
      feature: "Resistência física extraordinária.",
      size: "grande",
      height: {
        min: 200,
        max: 280
      },
      movement: {},
      flight: false
    },

    {
      id: "hipopotamo",
      name: "Hipopótamo",
      category: "Grande porte / Aquático",
      profile: "Vigor, força e adaptação aquática.",
      attrMods: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },
      feature: "Grande resistência e excelente adaptação à água.",
      size: "grande",
      height: {
        min: 200,
        max: 280
      },
      movement: {
        aquaticMultiplier: 2
      },
      flight: false
    },

    {
      id: "rato",
      name: "Rato",
      category: "Pequeno porte",
      profile: "Agilidade e percepção.",
      attrMods: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },
      feature: "Excelente percepção e movimentação em espaços reduzidos.",
      size: "pequeno",
      height: {
        min: 135,
        max: 160
      },
      movement: {},
      flight: false
    },

    {
      id: "tubarao",
      name: "Tubarão",
      category: "Aquático",
      profile: "Vigor e percepção.",
      attrMods: {
        vigor: 1,
        percepcao: 1,
        presenca: -1
      },
      feature: "Percepção aquática e grande resistência.",
      size: "grande",
      height: {
        min: 180,
        max: 240
      },
      movement: {
        aquaticMultiplier: 2
      },
      flight: false
    },

    {
      id: "foca",
      name: "Foca",
      category: "Aquático",
      profile: "Vigor e agilidade na água.",
      attrMods: {
        vigor: 1,
        agilidade: 1,
        precisao: -1
      },
      feature: "Excelente mobilidade aquática.",
      size: "medio",
      height: {
        min: 145,
        max: 180
      },
      movement: {
        aquaticMultiplier: 2
      },
      flight: false
    }
  ]);

  /* =========================================================
     ESTADO
  ========================================================= */

  function createDefaultState() {
    return {
      id: null,

      name: "",
      age: "",
      gender: "",

      description: "",
      appearance: {
        heightCm: null,
        sizeCategory: null,
        hair: "",
        eyes: "",
        skin: "",
        clothing: "",
        scars: "",
        tattoos: "",
        physicalNotes: ""
      },

      avatarDataUrl: "",
      avatarFileName: "",

      race: "",
      raceIndex: 0,

      animalhaVariant: "",

      class: "",
      classBonus: "",

      attributes: {
        forca: null,
        vigor: null,
        agilidade: null,
        precisao: null,
        intelecto: null,
        controle: null,
        presenca: null,
        percepcao: null
      },

      power: "",
      powerRoll: null,
      powerType: "",

      mana: "azul",

      skills: [],

      techniques: [],

      inventory: [],

      currentStep: 0,

      updatedAt: null
    };
  }

  let state = createDefaultState();

  let selectedDice = null;

  let saveTimer = null;

  let toastTimer = null;

  let initialized = false;

  /* =========================================================
     DOM
  ========================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(
      root.querySelectorAll(selector)
    );

  /* =========================================================
     UTILIDADES
  ========================================================= */

  function safeText(value) {
    return value === null ||
      value === undefined
      ? ""
      : String(value);
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function formatHeight(cm) {
    const value = Number(cm);

    if (!Number.isFinite(value)) {
      return "—";
    }

    return `${(value / 100).toFixed(2)} m`;
  }

  function showToast(
    message,
    duration = 2400
  ) {
    const toast = $("#toast");

    if (!toast) {
      return;
    }

    toast.textContent =
      safeText(message);

    toast.hidden = false;

    clearTimeout(toastTimer);

    toastTimer =
      window.setTimeout(
        () => {
          toast.hidden = true;
        },
        duration
      );
  }

  function setSaveStatus(
    type,
    text
  ) {
    const textEl =
      $("#saveStatusText");

    const dot =
      $(".save-dot");

    if (textEl) {
      textEl.textContent = text;
    }

    if (!dot) {
      return;
    }

    if (type === "error") {
      dot.style.background =
        "var(--danger)";

      dot.style.boxShadow =
        "0 0 12px rgba(197,108,99,.4)";

      return;
    }

    if (type === "saved") {
      dot.style.background =
        "var(--success)";

      dot.style.boxShadow =
        "0 0 12px rgba(131,173,121,.4)";

      return;
    }

    dot.style.background =
      "var(--gold)";

    dot.style.boxShadow =
      "0 0 12px rgba(216,180,90,.4)";
  }

  function normalizeDie(
    value
  ) {
    const raw =
      safeText(value)
        .trim()
        .toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(
        DICE_LIMITS,
        raw
      )
    ) {
      return raw;
    }

    const match =
      raw.match(
        /^d(4|6|8|10|12|20)$/
      );

    return match
      ? `d${match[1]}`
      : null;
  }

  /* =========================================================
     RAÇA ATUAL
  ========================================================= */

  function getCurrentRace() {
    return (
      RACES[state.raceIndex] ||
      RACES[0]
    );
  }

  function getSelectedRace() {
    return (
      RACES.find(
        race =>
          race.id ===
          state.race
      ) ||
      null
    );
  }

  function getAnimalhaVariant() {
    if (
      state.race !==
      "animalha"
    ) {
      return null;
    }

    return (
      ANIMALHA_VARIANTS.find(
        variant =>
          variant.id ===
          state.animalhaVariant
      ) ||
      null
    );
  }

  function getEffectiveRaceData() {
    const race =
      getSelectedRace();

    if (!race) {
      return null;
    }

    const animalha =
      getAnimalhaVariant();

    if (!animalha) {
      return race;
    }

    return {
      ...race,

      name:
        `${race.name} — ${animalha.name}`,

      profile:
        animalha.profile,

      feature:
        animalha.feature,

      size:
        animalha.size,

      height:
        animalha.height,

      attrMods:
        {
          ...(race.attrMods || {}),
          ...(animalha.attrMods || {})
        },

      movement:
        {
          ...(race.movement || {}),
          ...(animalha.movement || {})
        },

      flight:
        Boolean(
          race.flight ||
          animalha.flight
        )
    };
  }

  /* =========================================================
     IDENTIDADE
  ========================================================= */

  function bindIdentity() {
    const name =
      $("#characterName");

    const age =
      $("#characterAge");

    const description =
      $("#characterDescription");

    if (name) {
      name.addEventListener(
        "input",
        event => {
          state.name =
            safeText(
              event.target.value
            );

          $("#nameError")?.setAttribute(
            "hidden",
            ""
          );

          updateProgress();
          updateReview();
          scheduleAutosave();
        }
      );
    }

    if (age) {
      age.addEventListener(
        "input",
        event => {
          state.age =
            safeText(
              event.target.value
            );

          updateReview();
          scheduleAutosave();
        }
      );
    }

    if (description) {
      description.addEventListener(
        "input",
        event => {
          state.description =
            safeText(
              event.target.value
            );

          scheduleAutosave();
        }
      );
    }

    $$(
      'input[name="gender"]'
    ).forEach(
      radio => {
        radio.addEventListener(
          "change",
          () => {
            state.gender =
              radio.value;

            renderRace();
            updateAppearanceEditor();
            updateReview();
            scheduleAutosave();
          }
        );
      }
    );

    $("#avatarInput")
      ?.addEventListener(
        "change",
        handleAvatarUpload
      );

    $("#removeAvatarButton")
      ?.addEventListener(
        "click",
        removeAvatar
      );
  }

  function handleAvatarUpload(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif"
    ];

    if (
      !allowed.includes(
        file.type
      )
    ) {
      showToast(
        "Formato de imagem não suportado."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      CONFIG.maxAvatarSize
    ) {
      showToast(
        "A imagem deve ter no máximo 6 MB."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      () => {
        state.avatarDataUrl =
          safeText(
            reader.result
          );

        state.avatarFileName =
          file.name;

        renderAvatar();
        scheduleAutosave();
      };

    reader.onerror =
      () => {
        showToast(
          "Não foi possível carregar a imagem."
        );
      };

    reader.readAsDataURL(
      file
    );
  }

  function renderAvatar() {
    const image =
      $("#avatarImage");

    const placeholder =
      $("#avatarPlaceholder");

    const remove =
      $("#removeAvatarButton");

    if (
      !image ||
      !placeholder
    ) {
      return;
    }

    if (
      state.avatarDataUrl
    ) {
      image.src =
        state.avatarDataUrl;

      image.hidden =
        false;

      placeholder.hidden =
        true;

      if (remove) {
        remove.disabled =
          false;
      }
    } else {
      image.hidden =
        true;

      image.removeAttribute(
        "src"
      );

      placeholder.hidden =
        false;

      if (remove) {
        remove.disabled =
          true;
      }
    }
  }

  function removeAvatar() {
    state.avatarDataUrl = "";
    state.avatarFileName = "";

    const input =
      $("#avatarInput");

    if (input) {
      input.value = "";
    }

    renderAvatar();
    scheduleAutosave();
  }

  /* =========================================================
     RAÇA
  ========================================================= */

  function getRaceImage(
    race
  ) {
    if (!race) {
      return "";
    }

    if (
      state.gender ===
      "feminino"
    ) {
      return (
        race.femaleImage ||
        race.maleImage ||
        ""
      );
    }

    return (
      race.maleImage ||
      race.femaleImage ||
      ""
    );
  }

  function renderRaceDots() {
    const container =
      $("#raceDots");

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    RACES.forEach(
      (race, index) => {
        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          index ===
          state.raceIndex
            ? "is-active"
            : "";

        button.setAttribute(
          "aria-label",
          race.name
        );

        button.addEventListener(
          "click",
          event => {
            event.stopPropagation();

            state.raceIndex =
              index;

            renderRace();

            scheduleAutosave();
          }
        );

        container.appendChild(
          button
        );
      }
    );
  }

  function renderRace() {
    const race =
      getCurrentRace();

    if (!race) {
      return;
    }

    const image =
      $("#raceImage");

    const name =
      $("#raceName");

    const description =
      $("#raceShortDescription");

    const selected =
      $("#raceSelectedText");

    const gender =
      $("#raceGenderLabel");

    if (image) {
      const src =
        getRaceImage(
          race
        );

      if (src) {
        image.src = src;
        image.hidden = false;
      } else {
        image.removeAttribute(
          "src"
        );

        image.hidden = true;
      }

      image.alt =
        `${race.name} — personagem`;
    }

    if (name) {
      name.textContent =
        race.name;
    }

    if (description) {
      description.textContent =
        race.description;
    }

    if (gender) {
      gender.textContent =
        state.gender
          ? `${race.name} · ${state.gender}`
          : race.name;
    }

    if (selected) {
      selected.textContent =
        state.race ===
        race.id
          ? "✓ Selecionada"
          : "Selecionar raça";
    }

    const title =
      $("#raceDescriptionTitle");

    if (title) {
      title.textContent =
        race.name;
    }

    const text =
      $("#raceDescriptionText");

    if (text) {
      text.textContent =
        `${race.description} Perfil natural: ${race.profile} ${race.feature}`;
    }

    renderRaceDots();

    updateAppearanceEditor();
  }

  function selectCurrentRace() {
    const race =
      getCurrentRace();

    if (!race) {
      return false;
    }

    state.race =
      race.id;

    state.raceIndex =
      RACES.findIndex(
        item =>
          item.id ===
          race.id
      );

    if (
      race.id !==
      "animalha"
    ) {
      state.animalhaVariant =
        "";
    }

    if (
      race.height &&
      !state.appearance.heightCm
    ) {
      state.appearance.heightCm =
        Math.round(
          (
            race.height.min +
            race.height.max
          ) / 2
        );
    }

    if (
      race.size
    ) {
      state.appearance.sizeCategory =
        race.size;
    }

    renderRace();
    updateAppearanceEditor();
    updateProgress();
    updateReview();
    scheduleAutosave();

    showToast(
      `${race.name} selecionada.`
    );

    return true;
  }

  function bindRace() {
    $("#racePrevious")
      ?.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          state.raceIndex =
            (
              state.raceIndex -
              1 +
              RACES.length
            ) %
            RACES.length;

          renderRace();
          scheduleAutosave();
        }
      );

    $("#raceNext")
      ?.addEventListener(
        "click",
        event => {
          event.stopPropagation();

          state.raceIndex =
            (
              state.raceIndex +
              1
            ) %
            RACES.length;

          renderRace();
          scheduleAutosave();
        }
      );

    $("#raceCard")
      ?.addEventListener(
        "click",
        event => {
          if (
            event.target.closest(
              ".race-select-indicator"
            )
          ) {
            selectCurrentRace();
            return;
          }

          const description =
            $("#raceDescription");

          if (description) {
            description.hidden =
              !description.hidden;
          }
        }
      );

    $("#raceSelectedText")
      ?.addEventListener(
        "click",
        event => {
          event.stopPropagation();
          selectCurrentRace();
        }
      );
  }

  /* =========================================================
     APARÊNCIA
  ========================================================= */

  function ensureAppearancePanel() {
    const panel =
      $(
        '.creation-panel[data-panel="appearance"]'
      );

    if (!panel) {
      return;
    }

    if (
      panel.querySelector(
        "#appearanceEditor"
      )
    ) {
      return;
    }

    const heading =
      panel.querySelector(
        ".section-heading"
      );

    const editor =
      document.createElement(
        "div"
      );

    editor.id =
      "appearanceEditor";

    editor.className =
      "appearance-editor";

    editor.innerHTML =
      `
      <div class="appearance-stage">
        <div class="appearance-ruler">
          <span class="ruler-label ruler-top">MAX</span>
          <div class="ruler-line"></div>
          <span class="ruler-label ruler-bottom">MIN</span>
        </div>

        <div class="appearance-figure-area">
          <div
            id="appearanceFigure"
            class="appearance-figure appearance-figure--neutral"
            aria-hidden="true"
          >
            <div class="appearance-figure__head"></div>
            <div class="appearance-figure__body"></div>
            <div class="appearance-figure__left-arm"></div>
            <div class="appearance-figure__right-arm"></div>
            <div class="appearance-figure__left-leg"></div>
            <div class="appearance-figure__right-leg"></div>
          </div>
        </div>

        <div class="appearance-height-readout">
          <span class="eyebrow">
            ALTURA
          </span>

          <strong id="appearanceHeightValue">
            —
          </strong>

          <small id="appearanceHeightLimits">
            Selecione uma raça.
          </small>
        </div>
      </div>

      <div class="appearance-controls">

        <div class="appearance-control-card">
          <span class="field-label">
            Altura
          </span>

          <input
            id="appearanceHeight"
            type="range"
            min="100"
            max="300"
            step="1"
            value="170"
          >

          <div class="appearance-range-labels">
            <span id="appearanceMinLabel">—</span>
            <span id="appearanceMaxLabel">—</span>
          </div>
        </div>

        <div
          id="animalhaAppearance"
          class="appearance-control-card"
          hidden
        >
          <span class="field-label">
            Linhagem Animalha
          </span>

          <select
            id="animalhaVariant"
          >
            <option value="">
              Escolha a linhagem
            </option>
          </select>

          <small class="field-hint">
            A linhagem altera o perfil natural,
            porte, limites físicos e movimentação.
          </small>
        </div>

        <div class="appearance-control-card">
          <label class="field">
            <span class="field-label">
              Cabelo
            </span>

            <input
              id="appearanceHair"
              type="text"
              maxlength="200"
              placeholder="Cor, corte, comprimento..."
            >
          </label>

          <label class="field">
            <span class="field-label">
              Olhos
            </span>

            <input
              id="appearanceEyes"
              type="text"
              maxlength="200"
              placeholder="Cor, formato..."
            >
          </label>

          <label class="field">
            <span class="field-label">
              Pele
            </span>

            <input
              id="appearanceSkin"
              type="text"
              maxlength="200"
              placeholder="Cor, textura..."
            >
          </label>

          <label class="field">
            <span class="field-label">
              Vestimenta
            </span>

            <textarea
              id="appearanceClothing"
              rows="3"
              maxlength="600"
              placeholder="Roupa, materiais, acessórios..."
            ></textarea>
          </label>

          <label class="field">
            <span class="field-label">
              Cicatrizes
            </span>

            <textarea
              id="appearanceScars"
              rows="2"
              maxlength="400"
              placeholder="Cicatrizes e marcas..."
            ></textarea>
          </label>

          <label class="field">
            <span class="field-label">
              Tatuagens
            </span>

            <textarea
              id="appearanceTattoos"
              rows="2"
              maxlength="400"
              placeholder="Tatuagens e símbolos..."
            ></textarea>
          </label>

          <label class="field">
            <span class="field-label">
              Características físicas
            </span>

            <textarea
              id="appearancePhysicalNotes"
              rows="3"
              maxlength="600"
              placeholder="Orelhas, cauda, chifres, asas, marcas naturais..."
            ></textarea>
          </label>
        </div>

      </div>
      `;

    if (heading) {
      heading.after(editor);
    } else {
      panel.appendChild(
        editor
      );
    }
  }

  function populateAnimalhaVariants() {
    const select =
      $("#animalhaVariant");

    if (!select) {
      return;
    }

    const current =
      state.animalhaVariant;

    select.innerHTML =
      "";

    const first =
      document.createElement(
        "option"
      );

    first.value =
      "";

    first.textContent =
      "Escolha a linhagem";

    select.appendChild(
      first
    );

    ANIMALHA_VARIANTS.forEach(
      variant => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          variant.id;

        option.textContent =
          `${variant.name} — ${variant.category}`;

        option.selected =
          variant.id ===
          current;

        select.appendChild(
          option
        );
      }
    );
  }

  function setupAppearanceEditor() {
    ensureAppearancePanel();

    populateAnimalhaVariants();

    const height =
      $("#appearanceHeight");

    if (height) {
      height.addEventListener(
        "input",
        event => {
          const race =
            getEffectiveRaceData();

          if (!race?.height) {
            return;
          }

          state.appearance.heightCm =
            clamp(
              Number(
                event.target.value
              ),
              race.height.min,
              race.height.max
            );

          renderAppearanceFigure();
          scheduleAutosave();
        }
      );
    }

    $("#animalhaVariant")
      ?.addEventListener(
        "change",
        event => {
          state.animalhaVariant =
            safeText(
              event.target.value
            );

          const variant =
            getAnimalhaVariant();

          if (variant) {
            state.appearance.sizeCategory =
              variant.size;

            state.appearance.heightCm =
              Math.round(
                (
                  variant.height.min +
                  variant.height.max
                ) / 2
              );
          }

          updateAppearanceEditor();
          updateProgress();
          updateReview();
          scheduleAutosave();
        }
      );

    const textFields = [
      [
        "#appearanceHair",
        "hair"
      ],

      [
        "#appearanceEyes",
        "eyes"
      ],

      [
        "#appearanceSkin",
        "skin"
      ],

      [
        "#appearanceClothing",
        "clothing"
      ],

      [
        "#appearanceScars",
        "scars"
      ],

      [
        "#appearanceTattoos",
        "tattoos"
      ],

      [
        "#appearancePhysicalNotes",
        "physicalNotes"
      ]
    ];

    textFields.forEach(
      ([selector, key]) => {
        $(selector)
          ?.addEventListener(
            "input",
            event => {
              state.appearance[key] =
                event.target.value;

              scheduleAutosave();
            }
          );
      }
    );

    updateAppearanceEditor();
  }

  function updateAppearanceEditor() {
    ensureAppearancePanel();

    const race =
      getEffectiveRaceData();

    const animalSection =
      $("#animalhaAppearance");

    if (animalSection) {
      animalSection.hidden =
        state.race !==
        "animalha";
    }

    populateAnimalhaVariants();

    const heightInput =
      $("#appearanceHeight");

    if (
      !race?.height ||
      !heightInput
    ) {
      return;
    }

    const min =
      Number(
        race.height.min
      );

    const max =
      Number(
        race.height.max
      );

    let current =
      Number(
        state.appearance.heightCm
      );

    if (
      !Number.isFinite(
        current
      ) ||
      current < min ||
      current > max
    ) {
      current =
        Math.round(
          (
            min +
            max
          ) / 2
        );

      state.appearance.heightCm =
        current;
    }

    heightInput.min =
      String(min);

    heightInput.max =
      String(max);

    heightInput.value =
      String(current);

    const minLabel =
      $("#appearanceMinLabel");

    const maxLabel =
      $("#appearanceMaxLabel");

    const heightValue =
      $("#appearanceHeightValue");

    const limits =
      $("#appearanceHeightLimits");

    if (minLabel) {
      minLabel.textContent =
        formatHeight(min);
    }

    if (maxLabel) {
      maxLabel.textContent =
        formatHeight(max);
    }

    if (heightValue) {
      heightValue.textContent =
        formatHeight(current);
    }

    if (limits) {
      limits.textContent =
        `${formatHeight(min)} — ${formatHeight(max)}`;
    }

    syncAppearanceFields();

    renderAppearanceFigure();
  }

  function syncAppearanceFields() {
    const map = [
      [
        "#appearanceHair",
        "hair"
      ],

      [
        "#appearanceEyes",
        "eyes"
      ],

      [
        "#appearanceSkin",
        "skin"
      ],

      [
        "#appearanceClothing",
        "clothing"
      ],

      [
        "#appearanceScars",
        "scars"
      ],

      [
        "#appearanceTattoos",
        "tattoos"
      ],

      [
        "#appearancePhysicalNotes",
        "physicalNotes"
      ]
    ];

    map.forEach(
      ([selector, key]) => {
        const field =
          $(selector);

        if (
          field &&
          document.activeElement !==
            field
        ) {
          field.value =
            safeText(
              state.appearance[
                key
              ]
            );
        }
      }
    );
  }

  function renderAppearanceFigure() {
    const figure =
      $("#appearanceFigure");

    const race =
      getEffectiveRaceData();

    if (
      !figure ||
      !race?.height
    ) {
      return;
    }

    const min =
      race.height.min;

    const max =
      race.height.max;

    const value =
      clamp(
        Number(
          state.appearance.heightCm
        ) || min,
        min,
        max
      );

    const normalized =
      (
        value - min
      ) /
      Math.max(
        1,
        max - min
      );

    const scale =
      0.82 +
      normalized * 0.42;

    figure.style.setProperty(
      "--character-scale",
      String(scale)
    );

    const genderClass =
      state.gender ===
      "feminino"
        ? "appearance-figure--female"
        : "appearance-figure--male";

    figure.classList.remove(
      "appearance-figure--male",
      "appearance-figure--female"
    );

    figure.classList.add(
      genderClass
    );
  }

  /* =========================================================
     CLASSES
  ========================================================= */

  function bindClasses() {
    document.addEventListener(
      "click",
      event => {
        const card =
          event.target.closest(
            ".class-card[data-class]"
          );

        if (!card) {
          return;
        }

        selectClass(
          card.dataset.class
        );
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        const card =
          event.target.closest(
            ".class-card[data-class]"
          );

        if (!card) {
          return;
        }

        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        event.preventDefault();

        selectClass(
          card.dataset.class
        );
      }
    );
  }

  function selectClass(
    classId
  ) {
    const data =
      CLASSES.find(
        item =>
          item.id ===
          classId
      );

    if (!data) {
      return false;
    }

    state.class =
      data.id;

    state.classBonus =
      JSON.stringify(
        data.skillModifiers
      );

    renderClasses();

    updateProgress();
    updateReview();
    scheduleAutosave();

    showToast(
      `${data.name} selecionada.`
    );

    return true;
  }

  function renderClasses() {
    $$( ".class-card[data-class]" )
      .forEach(
        card => {
          const id =
            card.dataset.class;

          const selected =
            id ===
            state.class;

          card.classList.toggle(
            "is-selected",
            selected
          );

          card.setAttribute(
            "aria-pressed",
            String(
              selected
            )
          );

          const indicator =
            card.querySelector(
              ".class-selection span"
            );

          if (indicator) {
            indicator.textContent =
              selected
                ? "✓ Selecionada"
                : "Selecionar";
          }
        }
      );
  }

  /* =========================================================
     ATRIBUTOS — CÁLCULO DOS DADOS
  ========================================================= */

  function getDiceUsage() {
    const usage = {
      d4: 0,
      d6: 0,
      d8: 0,
      d10: 0,
      d12: 0,
      d20: 0
    };

    Object.values(
      state.attributes
    ).forEach(
      die => {
        const normalized =
          normalizeDie(
            die
          );

        if (
          normalized &&
          Object.prototype.hasOwnProperty.call(
            usage,
            normalized
          )
        ) {
          usage[
            normalized
          ]++;
        }
      }
    );

    return usage;
  }

  function getRemainingDice(
    die
  ) {
    const normalized =
      normalizeDie(
        die
      );

    if (!normalized) {
      return 0;
    }

    const usage =
      getDiceUsage();

    return Math.max(
      0,
      DICE_LIMITS[
        normalized
      ] -
      (
        usage[
          normalized
        ] || 0
      )
    );
  }

  function createDicePoolCards() {
    const container =
      $("#attributeDice");

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    Object.entries(
      DICE_LIMITS
    ).forEach(
      ([die, count]) => {
        for (
          let i = 0;
          i < count;
          i++
        ) {
          const button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "dice-card";

          button.dataset.die =
            die;

          button.draggable =
            true;

          button.setAttribute(
            "aria-label",
            `Dado ${die.toUpperCase()}`
          );

          button.innerHTML =
            `
            <span class="die-icon">
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <polygon
                  points="50,7 91,30 91,70 50,93 9,70 9,30"
                ></polygon>
              </svg>

              <span class="die-label">
                ${die.toUpperCase()}
              </span>
            </span>
            `;

          container.appendChild(
            button
          );
        }
      }
    );

    bindDicePoolDrag();
  }

  function bindDicePoolDrag() {
    $$("#attributeDice .dice-card")
      .forEach(
        card => {
          card.addEventListener(
            "dragstart",
            event => {
              const die =
                normalizeDie(
                  card.dataset.die
                );

              if (
                !die ||
                getRemainingDice(
                  die
                ) <= 0
              ) {
                event.preventDefault();
                return;
              }

              event.dataTransfer.effectAllowed =
                "copy";

              event.dataTransfer.setData(
                "text/plain",
                die
              );

              event.dataTransfer.setData(
                "application/x-aerion-source",
                "pool"
              );

              card.classList.add(
                "is-dragging"
              );
            }
          );

          card.addEventListener(
            "dragend",
            () => {
              card.classList.remove(
                "is-dragging"
              );
            }
          );
        }
      );
  }

  function selectDice(
    die
  ) {
    const normalized =
      normalizeDie(
        die
      );

    if (!normalized) {
      return false;
    }

    if (
      getRemainingDice(
        normalized
      ) <= 0
    ) {
      selectedDice =
        null;

      renderAttributes();

      showToast(
        `${normalized.toUpperCase()} já está em uso.`
      );

      return false;
    }

    selectedDice =
      normalized;

    renderAttributes();

    showToast(
      `${normalized.toUpperCase()} selecionado.`
    );

    return true;
  }

  function assignDice(
    attribute,
    die
  ) {
    const normalized =
      normalizeDie(
        die
      );

    if (
      !ATTRIBUTE_ORDER.includes(
        attribute
      )
    ) {
      return false;
    }

    if (!normalized) {
      return false;
    }

    const current =
      state.attributes[
        attribute
      ];

    if (
      current ===
      normalized
    ) {
      return clearAttribute(
        attribute
      );
    }

    state.attributes[
      attribute
    ] = null;

    if (
      getRemainingDice(
        normalized
      ) <= 0
    ) {
      state.attributes[
        attribute
      ] =
        current;

      selectedDice =
        null;

      renderAttributes();

      showToast(
        `${normalized.toUpperCase()} não está disponível.`
      );

      return false;
    }

    state.attributes[
      attribute
    ] =
      normalized;

    selectedDice =
      null;

    renderAttributes();
    scheduleAutosave();

    showToast(
      `${normalized.toUpperCase()} colocado em ${ATTRIBUTE_NAMES[attribute]}.`
    );

    return true;
  }

  function clearAttribute(
    attribute
  ) {
    if (
      !ATTRIBUTE_ORDER.includes(
        attribute
      )
    ) {
      return false;
    }

    const old =
      state.attributes[
        attribute
      ];

    if (!old) {
      return false;
    }

    state.attributes[
      attribute
    ] = null;

    selectedDice =
      null;

    renderAttributes();
    scheduleAutosave();

    showToast(
      `${old.toUpperCase()} devolvido aos dados.`
    );

    return true;
  }

  function swapAttributes(
    source,
    target
  ) {
    if (
      !ATTRIBUTE_ORDER.includes(
        source
      ) ||
      !ATTRIBUTE_ORDER.includes(
        target
      ) ||
      source === target
    ) {
      return false;
    }

    const a =
      state.attributes[
        source
      ];

    const b =
      state.attributes[
        target
      ];

    state.attributes[
      source
    ] =
      b || null;

    state.attributes[
      target
    ] =
      a || null;

    selectedDice =
      null;

    renderAttributes();
    scheduleAutosave();

    return true;
  }

  function renderAttributeSlots() {
    $$( ".attribute-slot" )
      .forEach(
        slot => {
          const attribute =
            slot.dataset.attributeSlot ||
            slot.dataset.attribute;

          if (
            !ATTRIBUTE_ORDER.includes(
              attribute
            )
          ) {
            return;
          }

          slot.dataset.attribute =
            attribute;

          const die =
            state.attributes[
              attribute
            ];

          const existing =
            slot.querySelector(
              ".attribute-die-value"
            );

          if (existing) {
            existing.textContent =
              die
                ? die.toUpperCase()
                : "D?";
          } else {
            slot.textContent =
              die
                ? die.toUpperCase()
                : "Selecionar dado";
          }

          slot.classList.toggle(
            "is-filled",
            Boolean(
              die
            )
          );

          slot.draggable =
            Boolean(
              die
            );
        }
      );
  }

  function renderAttributes() {
    createDicePoolCards();
    updateDiceVisualState();
    renderAttributeSlots();
    bindAttributeDropZones();
    renderAttributeChart();
    updateAttributeCountUI();
    updateCombatPreview();
    updateProgress();
  }

  function updateDiceVisualState() {
    const usage =
      getDiceUsage();

    $$("#attributeDice .dice-card")
      .forEach(
        card => {
          const die =
            normalizeDie(
              card.dataset.die
            );

          if (!die) {
            return;
          }

          const exhausted =
            getRemainingDice(
              die
            ) <= 0;

          card.classList.toggle(
            "is-selected",
            selectedDice ===
            die
          );

          card.classList.toggle(
            "is-exhausted",
            exhausted
          );

          card.setAttribute(
            "aria-disabled",
            String(
              exhausted
            )
          );
        }
      );
  }

  function bindAttributeDropZones() {
    $$( ".attribute-slot" )
      .forEach(
        slot => {
          const attribute =
            slot.dataset.attributeSlot ||
            slot.dataset.attribute;

          if (
            !ATTRIBUTE_ORDER.includes(
              attribute
            )
          ) {
            return;
          }

          if (
            slot.dataset.aerionBound ===
            "1"
          ) {
            return;
          }

          slot.dataset.aerionBound =
            "1";

          slot.addEventListener(
            "dragover",
            event => {
              event.preventDefault();

              slot.classList.add(
                "is-drag-over"
              );
            }
          );

          slot.addEventListener(
            "dragleave",
            () => {
              slot.classList.remove(
                "is-drag-over"
              );
            }
          );

          slot.addEventListener(
            "drop",
            event => {
              event.preventDefault();

              slot.classList.remove(
                "is-drag-over"
              );

              const die =
                normalizeDie(
                  event.dataTransfer.getData(
                    "text/plain"
                  )
                );

              const source =
                event.dataTransfer.getData(
                  "application/x-aerion-source"
                );

              if (!die) {
                return;
              }

              if (
                source &&
                source !==
                  "pool" &&
                ATTRIBUTE_ORDER.includes(
                  source
                )
              ) {
                swapAttributes(
                  source,
                  attribute
                );

                return;
              }

              assignDice(
                attribute,
                die
              );
            }
          );

          slot.addEventListener(
            "dragstart",
            event => {
              const die =
                state.attributes[
                  attribute
                ];

              if (!die) {
                event.preventDefault();
                return;
              }

              event.dataTransfer.effectAllowed =
                "move";

              event.dataTransfer.setData(
                "text/plain",
                die
              );

              event.dataTransfer.setData(
                "application/x-aerion-source",
                attribute
              );

              slot.classList.add(
                "is-dragging"
              );
            }
          );

          slot.addEventListener(
            "dragend",
            () => {
              slot.classList.remove(
                "is-dragging"
              );
            }
          );
        }
      );
  }

  function bindAttributeClicks() {
    document.addEventListener(
      "click",
      event => {
        const dice =
          event.target.closest(
            ".dice-card[data-die]"
          );

        if (dice) {
          selectDice(
            dice.dataset.die
          );

          return;
        }

        const slot =
          event.target.closest(
            ".attribute-slot"
          );

        if (!slot) {
          return;
        }

        const attribute =
          slot.dataset.attributeSlot ||
          slot.dataset.attribute;

        if (
          selectedDice
        ) {
          assignDice(
            attribute,
            selectedDice
          );

          return;
        }

        if (
          state.attributes[
            attribute
          ]
        ) {
          clearAttribute(
            attribute
          );
        }
      }
    );
  }

  /* =========================================================
     GRÁFICO RADIAL
  ========================================================= */

  function chartValue(
    die
  ) {
    const normalized =
      normalizeDie(
        die
      );

    if (!normalized) {
      return 0.08;
    }

    const value =
      DICE_VALUES[
        normalized
      ];

    return clamp(
      value / 20,
      0.08,
      1
    );
  }

  function createSvgElement(
    name,
    attrs = {}
  ) {
    const element =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        name
      );

    Object.entries(
      attrs
    ).forEach(
      ([key, value]) => {
        element.setAttribute(
          key,
          String(value)
        );
      }
    );

    return element;
  }

  function renderAttributeChart() {
    let container =
      $("#attributeChart");

    if (!container) {
      return;
    }

    let svg =
      container.tagName
        .toLowerCase() ===
      "svg"
        ? container
        : container.querySelector(
            "svg"
          );

    if (!svg) {
      svg =
        createSvgElement(
          "svg"
        );

      container.innerHTML =
        "";

      container.appendChild(
        svg
      );
    }

    const size =
      360;

    const center =
      180;

    const radius =
      112;

    const count =
      ATTRIBUTE_ORDER.length;

    svg.setAttribute(
      "viewBox",
      `0 0 ${size} ${size}`
    );

    svg.setAttribute(
      "role",
      "img"
    );

    svg.setAttribute(
      "aria-label",
      "Gráfico radial dos atributos"
    );

    svg.innerHTML =
      "";

    [
      0.25,
      0.5,
      0.75,
      1
    ].forEach(
      scale => {
        const points =
          ATTRIBUTE_ORDER
            .map(
              (_, index) => {
                const angle =
                  -Math.PI / 2 +
                  index *
                    (
                      Math.PI *
                      2 /
                      count
                    );

                const x =
                  center +
                  Math.cos(
                    angle
                  ) *
                  radius *
                  scale;

                const y =
                  center +
                  Math.sin(
                    angle
                  ) *
                  radius *
                  scale;

                return `${x},${y}`;
              }
            )
            .join(" ");

        svg.appendChild(
          createSvgElement(
            "polygon",
            {
              points,
              class:
                "attribute-chart-ring"
            }
          )
        );
      }
    );

    ATTRIBUTE_ORDER.forEach(
      (_, index) => {
        const angle =
          -Math.PI / 2 +
          index *
            (
              Math.PI *
              2 /
              count
            );

        const x =
          center +
          Math.cos(
            angle
          ) *
          radius;

        const y =
          center +
          Math.sin(
            angle
          ) *
          radius;

        svg.appendChild(
          createSvgElement(
            "line",
            {
              x1: center,
              y1: center,
              x2: x,
              y2: y,
              class:
                "attribute-chart-axis"
            }
          )
        );
      }
    );

    const points =
      ATTRIBUTE_ORDER.map(
        (
          attribute,
          index
        ) => {
          const value =
            chartValue(
              state.attributes[
                attribute
              ]
            );

          const angle =
            -Math.PI / 2 +
            index *
              (
                Math.PI *
                2 /
                count
              );

          return {
            attribute,

            x:
              center +
              Math.cos(
                angle
              ) *
              radius *
              value,

            y:
              center +
              Math.sin(
                angle
              ) *
              radius *
              value
          };
        }
      );

    svg.appendChild(
      createSvgElement(
        "polygon",
        {
          points:
            points
              .map(
                point =>
                  `${point.x},${point.y}`
              )
              .join(" "),

          class:
            "attribute-chart-area"
        }
      )
    );

    points.forEach(
      point => {
        svg.appendChild(
          createSvgElement(
            "circle",
            {
              cx: point.x,
              cy: point.y,
              r: 5,
              class:
                "attribute-chart-point"
            }
          )
        );
      }
    );

    points.forEach(
      (
        point,
        index
      ) => {
        const angle =
          -Math.PI / 2 +
          index *
            (
              Math.PI *
              2 /
              count
            );

        const labelRadius =
          radius + 30;

        const x =
          center +
          Math.cos(
            angle
          ) *
          labelRadius;

        const y =
          center +
          Math.sin(
            angle
          ) *
          labelRadius;

        let anchor =
          "middle";

        if (
          x <
          center - 10
        ) {
          anchor =
            "end";
        } else if (
          x >
          center + 10
        ) {
          anchor =
            "start";
        }

        const text =
          createSvgElement(
            "text",
            {
              x,
              y,
              "text-anchor":
                anchor,
              "dominant-baseline":
                "middle",
              class:
                "attribute-chart-label"
            }
          );

        text.textContent =
          ATTRIBUTE_NAMES[
            point.attribute
          ];

        svg.appendChild(
          text
        );
      }
    );

    svg.appendChild(
      createSvgElement(
        "circle",
        {
          cx: center,
          cy: center,
          r: 3,
          class:
            "attribute-chart-center"
        }
      )
    );
  }

  function updateAttributeCountUI() {
    const element =
      $("#attributeCount");

    if (element) {
      element.textContent =
        `${Object.values(state.attributes).filter(Boolean).length}/8`;
    }
  }

  /* =========================================================
     PODER — D100
  ========================================================= */

  function renderPowerInterface() {
    const panel =
      $(
        '.creation-panel[data-panel="power"]'
      );

    if (!panel) {
      return;
    }

    let system =
      panel.querySelector(
        ".power-system"
      );

    if (!system) {
      system =
        document.createElement(
          "div"
        );

      system.className =
        "power-system";

      system.innerHTML =
        `
        <div class="power-mode-buttons">

          <button
            type="button"
            class="button button-secondary"
            data-power-mode="roll"
          >
            Girar D100
          </button>

          <button
            type="button"
            class="button button-secondary"
            data-power-mode="manual"
          >
            Escolher poder
          </button>

        </div>

        <div
          class="power-section"
          data-power-section="roll"
          hidden
        >
          <div class="power-roll-result">
            <span class="eyebrow">
              RESULTADO
            </span>

            <strong data-power-result>
              —
            </strong>

            <p data-power-result-note>
              O D100 define apenas os quatro poderes principais.
            </p>
          </div>

          <button
            type="button"
            class="button button-primary"
            data-roll-power
          >
            Girar D100
          </button>
        </div>

        <div
          class="power-section"
          data-power-section="manual"
          hidden
        >
          <span class="field-label">
            Poder específico / paralelo
          </span>

          <div
            class="power-options"
            data-power-options
          ></div>
        </div>

        <div class="power-selected">
          <span class="eyebrow">
            PODER ESCOLHIDO
          </span>

          <strong data-power-current>
            Nenhum poder escolhido
          </strong>
        </div>
        `;

      panel.appendChild(
        system
      );
    }

    const options =
      panel.querySelector(
        "[data-power-options]"
      );

    if (options) {
      options.innerHTML =
        "";

      PARALLEL_POWERS.forEach(
        power => {
          const button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "button button-secondary";

          button.dataset.powerValue =
            power;

          button.textContent =
            power;

          options.appendChild(
            button
          );
        }
      );
    }
  }

  function bindPower() {
    renderPowerInterface();

    document.addEventListener(
      "click",
      event => {
        const mode =
          event.target.closest(
            "[data-power-mode]"
          );

        if (mode) {
          const selectedMode =
            mode.dataset.powerMode;

          $$( "[data-power-section]" )
            .forEach(
              section => {
                section.hidden =
                  section.dataset.powerSection !==
                  selectedMode;
              }
            );

          return;
        }

        const powerButton =
          event.target.closest(
            "[data-power-value]"
          );

        if (powerButton) {
          choosePower(
            powerButton.dataset.powerValue,
            null,
            "parallel"
          );

          return;
        }

        const rollButton =
          event.target.closest(
            "[data-roll-power]"
          );

        if (rollButton) {
          rollPowerD100();
        }
      }
    );
  }

  function choosePower(
    power,
    roll = null,
    powerType = "manual"
  ) {
    if (
      !ALL_POWERS.includes(
        power
      )
    ) {
      return false;
    }

    state.power =
      power;

    state.powerRoll =
      roll;

    state.powerType =
      powerType;

    renderPower();

    updateProgress();
    updateReview();
    scheduleAutosave();

    return true;
  }

  function rollPowerD100() {
    const roll =
      Math.floor(
        Math.random() *
        100
      ) + 1;

    const index =
      (roll - 1) %
      PRIMARY_POWERS.length;

    const power =
      PRIMARY_POWERS[index];

    choosePower(
      power,
      roll,
      "primary"
    );

    showToast(
      `D100: ${roll} → ${power}`
    );

    return {
      roll,
      power
    };
  }

  function renderPower() {
    renderPowerInterface();

    const current =
      $(
        "[data-power-current]"
      );

    const result =
      $(
        "[data-power-result]"
      );

    const note =
      $(
        "[data-power-result-note]"
      );

    if (current) {
      current.textContent =
        state.power ||
        "Nenhum poder escolhido";
    }

    if (result) {
      result.textContent =
        state.powerRoll
          ? String(
              state.powerRoll
            )
          : "—";
    }

    if (note) {
      note.textContent =
        state.powerRoll
          ? `D100 ${state.powerRoll} → ${state.power}`
          : "O D100 define apenas os quatro poderes principais.";
    }
  }

  /* =========================================================
     MANA
  ========================================================= */

  function bindMana() {
    document.addEventListener(
      "click",
      event => {
        const card =
          event.target.closest(
            ".mana-card[data-mana]"
          );

        if (!card) {
          return;
        }

        if (
          card.dataset.mana !==
          "azul"
        ) {
          return;
        }

        state.mana =
          "azul";

        renderMana();
        scheduleAutosave();
      }
    );
  }

  function renderMana() {
    state.mana =
      "azul";

    $$( ".mana-card[data-mana]" )
      .forEach(
        card => {
          const blue =
            card.dataset.mana ===
            "azul";

          card.classList.toggle(
            "is-selected",
            blue
          );

          if (!blue) {
            card.disabled =
              true;
          }
        }
      );

    updateProgress();
  }

  /* =========================================================
     PERÍCIAS
  ========================================================= */

  function getClassSkillModifiers() {
    const classData =
      CLASSES.find(
        item =>
          item.id ===
          state.class
      );

    return (
      classData?.skillModifiers ||
      {}
    );
  }

  function renderSkills() {
    const list =
      $("#skillsList");

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    const modifiers =
      getClassSkillModifiers();

    SKILLS.forEach(
      skill => {
        const row =
          document.createElement(
            "article"
          );

        row.className =
          "skill-card";

        const trained =
          state.skills.includes(
            skill.id
          );

        const modifier =
          Number(
            modifiers[
              skill.id
            ] || 0
          );

        row.innerHTML =
          `
          <div class="skill-card__main">

            <div>
              <span class="eyebrow">
                PERÍCIA
              </span>

              <h3>
                ${skill.name}
              </h3>

              <p>
                ${skill.description}
              </p>
            </div>

            <div class="skill-card__bonus">
              <span>
                Bônus
              </span>

              <strong>
                ${modifier >= 0 ? "+" : ""}${modifier}
              </strong>
            </div>

          </div>

          <button
            type="button"
            class="button button-secondary"
            data-skill-toggle="${skill.id}"
          >
            ${
              trained
                ? "✓ Treinado"
                : "Treinar"
            }
          </button>
          `;

        list.appendChild(
          row
        );
      }
    );
  }

  function bindSkills() {
    document.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-skill-toggle]"
          );

        if (!button) {
          return;
        }

        const id =
          button.dataset.skillToggle;

        const index =
          state.skills.indexOf(
            id
          );

        if (
          index >= 0
        ) {
          state.skills.splice(
            index,
            1
          );
        } else {
          state.skills.push(
            id
          );
        }

        renderSkills();
        updateProgress();
        scheduleAutosave();
      }
    );
  }

  /* =========================================================
     TÉCNICAS
  ========================================================= */

  function renderTechniques() {
    const list =
      $("#techniquesList");

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    state.techniques.forEach(
      (
        technique,
        index
      ) => {
        const card =
          document.createElement(
            "article"
          );

        card.className =
          "technique-card empty-module";

        card.innerHTML =
          `
          <div
            style="
              display:grid;
              gap:12px;
              text-align:left;
            "
          >

            <span class="eyebrow">
              TÉCNICA ${index + 1}
            </span>

            <label class="field">
              <span class="field-label">
                Nome
              </span>

              <input
                type="text"
                data-technique-field="name"
                maxlength="100"
                value="${escapeAttribute(technique.name)}"
                placeholder="Nome da técnica"
              >
            </label>

            <label class="field">
              <span class="field-label">
                Descrição
              </span>

              <textarea
                data-technique-field="description"
                rows="4"
                maxlength="1000"
                placeholder="Descrição"
              >${escapeHtml(technique.description)}</textarea>
            </label>

            <div
              style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
              "
            >

              <label class="field">
                <span class="field-label">
                  Alcance
                </span>

                <input
                  type="text"
                  data-technique-field="range"
                  maxlength="100"
                  value="${escapeAttribute(technique.range)}"
                >
              </label>

              <label class="field">
                <span class="field-label">
                  Dano / Efeito
                </span>

                <input
                  type="text"
                  data-technique-field="damage"
                  maxlength="150"
                  value="${escapeAttribute(technique.damage)}"
                >
              </label>

            </div>

            <label class="field">
              <span class="field-label">
                Custo
              </span>

              <input
                type="text"
                data-technique-field="cost"
                maxlength="100"
                value="${escapeAttribute(technique.cost)}"
              >
            </label>

            <label class="field">
              <span class="field-label">
                Teste
              </span>

              <input
                type="text"
                data-technique-field="test"
                maxlength="100"
                value="${escapeAttribute(technique.test)}"
              >
            </label>

            <label class="field">
              <span class="field-label">
                Limitação
              </span>

              <textarea
                data-technique-field="limitation"
                rows="3"
                maxlength="500"
              >${escapeHtml(technique.limitation)}</textarea>
            </label>

            <button
              type="button"
              class="button button-ghost"
              data-remove-technique="${index}"
            >
              Remover técnica
            </button>

          </div>
          `;

        list.appendChild(
          card
        );

        $$(
          "[data-technique-field]",
          card
        ).forEach(
          field => {
            const key =
              field.dataset.techniqueField;

            field.addEventListener(
              "input",
              () => {
                if (
                  !state.techniques[
                    index
                  ]
                ) {
                  return;
                }

                state.techniques[
                  index
                ][key] =
                  field.value;

                scheduleAutosave();
              }
            );
          }
        );
      }
    );
  }

  function bindTechniques() {
    $("#addTechniqueButton")
      ?.addEventListener(
        "click",
        () => {
          state.techniques.push({
            name: "",
            description: "",
            range: "",
            damage: "",
            cost: "",
            test: "",
            limitation: ""
          });

          renderTechniques();
          scheduleAutosave();

          $$(
            '[data-technique-field="name"]'
          ).at(-1)?.focus();
        }
      );

    document.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-remove-technique]"
          );

        if (!button) {
          return;
        }

        const index =
          Number(
            button.dataset.removeTechnique
          );

        if (
          !Number.isInteger(
            index
          )
        ) {
          return;
        }

        state.techniques.splice(
          index,
          1
        );

        renderTechniques();
        updateProgress();
        scheduleAutosave();
      }
    );
  }

  /* =========================================================
     INVENTÁRIO
  ========================================================= */

  function renderInventory() {
    const list =
      $("#inventoryList");

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    state.inventory.forEach(
      (
        item,
        index
      ) => {
        const card =
          document.createElement(
            "article"
          );

        card.className =
          "inventory-card empty-module";

        card.innerHTML =
          `
          <div
            style="
              display:grid;
              gap:12px;
              text-align:left;
            "
          >

            <span class="eyebrow">
              ITEM ${index + 1}
            </span>

            <label class="field">
              <span class="field-label">
                Item
              </span>

              <input
                type="text"
                data-inventory-field="name"
                maxlength="150"
                value="${escapeAttribute(item.name)}"
                placeholder="Nome do item"
              >
            </label>

            <label class="field">
              <span class="field-label">
                Descrição
              </span>

              <textarea
                data-inventory-field="description"
                rows="3"
                maxlength="600"
                placeholder="Descrição"
              >${escapeHtml(item.description)}</textarea>
            </label>

            <button
              type="button"
              class="button button-ghost"
              data-remove-inventory="${index}"
            >
              Remover item
            </button>

          </div>
          `;

        list.appendChild(
          card
        );

        $$(
          "[data-inventory-field]",
          card
        ).forEach(
          field => {
            const key =
              field.dataset.inventoryField;

            field.addEventListener(
              "input",
              () => {
                if (
                  !state.inventory[
                    index
                  ]
                ) {
                  return;
                }

                state.inventory[
                  index
                ][key] =
                  field.value;

                scheduleAutosave();
              }
            );
          }
        );
      }
    );
  }

  function bindInventory() {
    $("#addInventoryButton")
      ?.addEventListener(
        "click",
        () => {
          state.inventory.push({
            name: "",
            description: ""
          });

          renderInventory();
          scheduleAutosave();

          $$(
            '[data-inventory-field="name"]'
          ).at(-1)?.focus();
        }
      );

    document.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-remove-inventory]"
          );

        if (!button) {
          return;
        }

        const index =
          Number(
            button.dataset.removeInventory
          );

        if (
          !Number.isInteger(
            index
          )
        ) {
          return;
        }

        state.inventory.splice(
          index,
          1
        );

        renderInventory();
        updateProgress();
        scheduleAutosave();
      }
    );
  }

  /* =========================================================
     COMBATE — CÁLCULOS
  ========================================================= */

  function getAttributeModifier(
    attribute
  ) {
    const race =
      getEffectiveRaceData();

    return Number(
      race?.attrMods?.[
        attribute
      ] || 0
    );
  }

  function getAttributeBaseValue(
    attribute
  ) {
    const die =
      state.attributes[
        attribute
      ];

    if (!die) {
      return null;
    }

    return DICE_VALUES[
      die
    ] || null;
  }

  function getAttributeFinalValue(
    attribute
  ) {
    const base =
      getAttributeBaseValue(
        attribute
      );

    if (
      base === null
    ) {
      return null;
    }

    return (
      base +
      getAttributeModifier(
        attribute
      )
    );
  }

  function calculateMaxHp() {
    const race =
      getEffectiveRaceData();

    if (!race) {
      return null;
    }

    const vigor =
      getAttributeFinalValue(
        "vigor"
      );

    if (
      vigor === null
    ) {
      return null;
    }

    const size =
      SIZE_DATA[
        race.size
      ] ||
      SIZE_DATA.medio;

    return (
      COMBAT_BASE.hp +
      vigor +
      size.lifeBonus
    );
  }

  function calculateMovement() {
    const race =
      getEffectiveRaceData();

    if (!race) {
      return {
        value: null,
        ground: null,
        air: null,
        aquatic: null
      };
    }

    const size =
      SIZE_DATA[
        race.size
      ] ||
      SIZE_DATA.medio;

    let ground =
      COMBAT_BASE.movement *
      size.movementMultiplier;

    let air =
      null;

    let aquatic =
      null;

    /*
     * VOO é independente de Animalha.
     * Pode vir da raça ou da variante.
     */
    if (
      race.flight
    ) {
      air =
        ground *
        Number(
          race.movement
            ?.airMultiplier ||
          2
        );
    }

    if (
      race.movement
        ?.groundMultiplier
    ) {
      ground *=
        Number(
          race.movement
            .groundMultiplier
        );
    }

    if (
      race.movement
        ?.aquaticMultiplier
    ) {
      aquatic =
        ground *
        Number(
          race.movement
            .aquaticMultiplier
        );
    }

    return {
      value: ground,
      ground,
      air,
      aquatic
    };
  }

  function updateCombatPreview() {
    const hp =
      calculateMaxHp();

    const movement =
      calculateMovement();

    const hpElement =
      $("#calculatedHp");

    if (hpElement) {
      hpElement.textContent =
        hp === null
          ? "—"
          : String(
              hp
            );
    }

    const movementElement =
      $("#calculatedMovement");

    if (movementElement) {
      movementElement.textContent =
        movement.ground ===
        null
          ? "—"
          : `${movement.ground} m`;
    }

    const airElement =
      $("#calculatedAirMovement");

    if (airElement) {
      airElement.textContent =
        movement.air ===
        null
          ? "—"
          : `${movement.air} m`;
    }

    const aquaticElement =
      $("#calculatedAquaticMovement");

    if (aquaticElement) {
      aquaticElement.textContent =
        movement.aquatic ===
        null
          ? "—"
          : `${movement.aquatic} m`;
    }
  }

  /* =========================================================
     REVISÃO
  ========================================================= */

  function getRaceDisplayName() {
    const race =
      getSelectedRace();

    if (!race) {
      return "—";
    }

    const animalha =
      getAnimalhaVariant();

    return animalha
      ? `${race.name} — ${animalha.name}`
      : race.name;
  }

  function getClassDisplayName() {
    return (
      CLASSES.find(
        item =>
          item.id ===
          state.class
      )?.name ||
      "—"
    );
  }

  function updateReview() {
    const name =
      $("#reviewName");

    const identity =
      $("#reviewIdentity");

    const race =
      $("#reviewRace");

    const classEl =
      $("#reviewClass");

    const gender =
      $("#reviewGender");

    const mana =
      $("#reviewMana");

    if (name) {
      name.textContent =
        state.name.trim() ||
        "Sem nome";
    }

    if (identity) {
      const parts =
        [];

      if (state.age) {
        parts.push(
          `${state.age} anos`
        );
      }

      if (state.gender) {
        parts.push(
          state.gender ===
            "masculino"
            ? "Masculino"
            : "Feminino"
        );
      }

      identity.textContent =
        parts.length
          ? parts.join(" · ")
          : "Identidade ainda não definida.";
    }

    if (race) {
      race.textContent =
        getRaceDisplayName();
    }

    if (classEl) {
      classEl.textContent =
        getClassDisplayName();
    }

    if (gender) {
      gender.textContent =
        state.gender ===
          "masculino"
          ? "Masculino"
          : state.gender ===
              "feminino"
            ? "Feminino"
            : "—";
    }

    if (mana) {
      mana.textContent =
        "Mana Azul";
    }

    const reviewAvatar =
      $("#reviewAvatar");

    const fallback =
      $("#reviewAvatarFallback");

    if (
      reviewAvatar &&
      fallback
    ) {
      if (
        state.avatarDataUrl
      ) {
        reviewAvatar.src =
          state.avatarDataUrl;

        reviewAvatar.hidden =
          false;

        fallback.hidden =
          true;
      } else {
        reviewAvatar.hidden =
          true;

        fallback.hidden =
          false;
      }
    }

    updateCombatPreview();
  }

  /* =========================================================
     PROGRESSO
  ========================================================= */

  function isIdentityComplete() {
    return Boolean(
      state.name.trim()
    );
  }

  function isRaceComplete() {
    return Boolean(
      state.race
    );
  }

  function isAppearanceComplete() {
    return Boolean(
      state.race &&
      state.appearance.heightCm
    );
  }

  function isClassComplete() {
    return Boolean(
      state.class
    );
  }

  function areAttributesComplete() {
    return (
      Object.values(
        state.attributes
      ).filter(Boolean)
        .length ===
      ATTRIBUTE_ORDER.length
    );
  }

  function isPowerComplete() {
    return Boolean(
      state.power.trim()
    );
  }

  function isManaComplete() {
    return (
      state.mana ===
      "azul"
    );
  }

  function canEnterStep(
    index
  ) {
    if (
      index <= 0
    ) {
      return true;
    }

    if (
      index >= 1 &&
      !isIdentityComplete()
    ) {
      return false;
    }

    if (
      index >= 2 &&
      !isRaceComplete()
    ) {
      return false;
    }

    if (
      index >= 3 &&
      !isAppearanceComplete()
    ) {
      return false;
    }

    if (
      index >= 4 &&
      !isClassComplete()
    ) {
      return false;
    }

    if (
      index >= 5 &&
      !areAttributesComplete()
    ) {
      return false;
    }

    if (
      index >= 6 &&
      !isPowerComplete()
    ) {
      return false;
    }

    return true;
  }

  function isStepComplete(
    index
  ) {
    const id =
      STEPS[index]?.id;

    switch (id) {
      case "identity":
        return isIdentityComplete();

      case "race":
        return isRaceComplete();

      case "appearance":
        return isAppearanceComplete();

      case "class":
        return isClassComplete();

      case "attributes":
        return areAttributesComplete();

      case "power":
        return isPowerComplete();

      case "mana":
        return isManaComplete();

      case "skills":
        return state.skills.length > 0;

      case "techniques":
        return state.techniques.length > 0;

      case "inventory":
        return state.inventory.length > 0;

      case "review":
        return (
          isIdentityComplete() &&
          isRaceComplete() &&
          isAppearanceComplete() &&
          isClassComplete() &&
          areAttributesComplete() &&
          isPowerComplete() &&
          isManaComplete()
        );

      default:
        return false;
    }
  }

  function getProgressPercent() {
    const completed =
      STEPS.filter(
        (_, index) =>
          isStepComplete(
            index
          )
      ).length;

    return Math.round(
      (
        completed /
        STEPS.length
      ) * 100
    );
  }

  function updateProgress() {
    const current =
      state.currentStep;

    const percent =
      getProgressPercent();

    const fill =
      $("#progressFill");

    const percentEl =
      $("#progressPercent");

    const title =
      $("#progressTitle");

    const counter =
      $("#stepCounter");

    if (fill) {
      fill.style.width =
        `${percent}%`;
    }

    if (percentEl) {
      percentEl.textContent =
        `${percent}%`;
    }

    if (title) {
      title.textContent =
        STEPS[current]?.title ||
        "Identidade";
    }

    if (counter) {
      counter.textContent =
        `${current + 1} de ${STEPS.length}`;
    }

    $$( ".creation-step" )
      .forEach(
        (
          button,
          index
        ) => {
          button.classList.toggle(
            "is-active",
            index ===
            current
          );

          button.classList.toggle(
            "is-complete",
            index <
              current &&
            isStepComplete(
              index
            )
          );

          button.disabled =
            index >
              current &&
            !canEnterStep(
              index
            );
        }
      );

    const previous =
      $("#previousStepButton");

    if (previous) {
      previous.disabled =
        current === 0;
    }

    const next =
      $("#nextStepButton");

    if (next) {
      next.textContent =
        current ===
          STEPS.length - 1
          ? "Finalizar →"
          : "Próximo →";
    }
  }

  /* =========================================================
     VALIDAÇÃO
  ========================================================= */

  function validateBeforeNext() {
    if (
      !isIdentityComplete()
    ) {
      showToast(
        "Digite o nome do aventureiro."
      );

      goToStep(0);

      $("#characterName")
        ?.focus();

      return false;
    }

    if (
      !isRaceComplete()
    ) {
      showToast(
        "Escolha uma raça."
      );

      goToStep(1);

      return false;
    }

    if (
      !isAppearanceComplete()
    ) {
      showToast(
        "Defina a altura do personagem."
      );

      goToStep(2);

      return false;
    }

    if (
      !isClassComplete()
    ) {
      showToast(
        "Escolha uma classe."
      );

      goToStep(3);

      return false;
    }

    if (
      !areAttributesComplete()
    ) {
      showToast(
        "Complete os 8 atributos."
      );

      goToStep(4);

      return false;
    }

    if (
      !isPowerComplete()
    ) {
      showToast(
        "Defina o poder."
      );

      goToStep(5);

      return false;
    }

    return true;
  }

  /* =========================================================
     NAVEGAÇÃO
  ========================================================= */

  function goToStep(
    target
  ) {
    const index =
      clamp(
        Number(
          target
        ) || 0,
        0,
        STEPS.length - 1
      );

    if (
      index >
        state.currentStep &&
      !canEnterStep(
        index
      )
    ) {
      validateBeforeNext();
      return false;
    }

    state.currentStep =
      index;

    $$( ".creation-panel" )
      .forEach(
        panel => {
          const active =
            panel.dataset.panel ===
            STEPS[index].id;

          panel.hidden =
            !active;

          panel.classList.toggle(
            "is-active",
            active
          );
        }
      );

    updateProgress();

    switch (
      STEPS[index].id
    ) {
      case "identity":
        renderAvatar();
        break;

      case "race":
        renderRace();
        break;

      case "appearance":
        updateAppearanceEditor();
        break;

      case "class":
        renderClasses();
        break;

      case "attributes":
        renderAttributes();
        break;

      case "power":
        renderPower();
        break;

      case "mana":
        renderMana();
        break;

      case "skills":
        renderSkills();
        break;

      case "techniques":
        renderTechniques();
        break;

      case "inventory":
        renderInventory();
        break;

      case "review":
        updateReview();
        break;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    scheduleAutosave();

    return true;
  }

  function bindNavigation() {
    $("#previousStepButton")
      ?.addEventListener(
        "click",
        () => {
          goToStep(
            state.currentStep -
            1
          );
        }
      );

    $("#nextStepButton")
      ?.addEventListener(
        "click",
        () => {
          if (
            state.currentStep ===
            STEPS.length - 1
          ) {
            finishCharacter();
            return;
          }

          if (
            !validateBeforeNext()
          ) {
            return;
          }

          goToStep(
            state.currentStep +
            1
          );
        }
      );

    $$( ".creation-step" )
      .forEach(
        (
          button,
          index
        ) => {
          button.addEventListener(
            "click",
            () => {
              if (
                button.disabled
              ) {
                return;
              }

              goToStep(
                index
              );
            }
          );
        }
      );
  }

  /* =========================================================
     AUTOSAVE
  ========================================================= */

  function serializeState() {
    return {
      ...state,

      attributes: {
        ...state.attributes
      },

      appearance: {
        ...state.appearance
      },

      skills: [
        ...state.skills
      ],

      techniques:
        state.techniques.map(
          technique => ({
            ...technique
          })
        ),

      inventory:
        state.inventory.map(
          item => ({
            ...item
          })
        ),

      /*
       * Imagem em base64 pode deixar
       * o draft pesado demais.
       */
      avatarDataUrl:
        state.avatarDataUrl &&
        state.avatarDataUrl.length <=
          2_000_000
          ? state.avatarDataUrl
          : ""
    };
  }

  function saveLocalDraft() {
    try {
      const data =
        serializeState();

      data.updatedAt =
        new Date().toISOString();

      localStorage.setItem(
        CONFIG.draftKey,
        JSON.stringify(
          data
        )
      );

      state.updatedAt =
        data.updatedAt;

      setSaveStatus(
        "saved",
        "Salvo automaticamente"
      );

      return true;
    } catch (
      error
    ) {
      console.error(
        "[AERION][FICHA] Erro ao salvar:",
        error
      );

      setSaveStatus(
        "error",
        "Erro ao salvar"
      );

      return false;
    }
  }

  function loadLocalDraft() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.draftKey
        );

      if (!raw) {
        return false;
      }

      const parsed =
        JSON.parse(
          raw
        );

      state =
        normalizeState(
          parsed
        );

      return true;
    } catch (
      error
    ) {
      console.warn(
        "[AERION][FICHA] Rascunho inválido:",
        error
      );

      localStorage.removeItem(
        CONFIG.draftKey
      );

      return false;
    }
  }

  function scheduleAutosave() {
    setSaveStatus(
      "saving",
      "Salvando..."
    );

    clearTimeout(
      saveTimer
    );

    saveTimer =
      window.setTimeout(
        saveLocalDraft,
        CONFIG.autosaveDelay
      );
  }

  function normalizeState(
    raw
  ) {
    const base =
      createDefaultState();

    if (
      !raw ||
      typeof raw !==
        "object"
    ) {
      return base;
    }

    const merged =
      {
        ...base,
        ...raw,

        appearance: {
          ...base.appearance,
          ...(raw.appearance || {})
        },

        attributes:
          normalizeAttributes(
            raw.attributes
          ),

        skills:
          Array.isArray(
            raw.skills
          )
            ? raw.skills
            : [],

        techniques:
          Array.isArray(
            raw.techniques
          )
            ? raw.techniques
            : [],

        inventory:
          Array.isArray(
            raw.inventory
          )
            ? raw.inventory
            : []
      };

    merged.currentStep =
      clamp(
        Number(
          merged.currentStep
        ) || 0,
        0,
        STEPS.length - 1
      );

    merged.raceIndex =
      clamp(
        Number(
          merged.raceIndex
        ) || 0,
        0,
        RACES.length - 1
      );

    if (
      !RACES.some(
        race =>
          race.id ===
          merged.race
      )
    ) {
      merged.race =
        "";
    }

    if (
      !CLASSES.some(
        item =>
          item.id ===
          merged.class
      )
    ) {
      merged.class =
        "";
    }

    if (
      ![
        "masculino",
        "feminino"
      ].includes(
        merged.gender
      )
    ) {
      merged.gender =
        "";
    }

    merged.mana =
      "azul";

    return merged;
  }

  function normalizeAttributes(
    raw
  ) {
    const result = {
      forca: null,
      vigor: null,
      agilidade: null,
      precisao: null,
      intelecto: null,
      controle: null,
      presenca: null,
      percepcao: null
    };

    if (
      !raw ||
      typeof raw !==
        "object"
    ) {
      return result;
    }

    const usage = {
      d4: 0,
      d6: 0,
      d8: 0,
      d10: 0,
      d12: 0,
      d20: 0
    };

    ATTRIBUTE_ORDER.forEach(
      attribute => {
        const die =
          normalizeDie(
            raw[
              attribute
            ]
          );

        if (!die) {
          return;
        }

        if (
          usage[
            die
          ] >=
          DICE_LIMITS[
            die
          ]
        ) {
          return;
        }

        result[
          attribute
        ] =
          die;

        usage[
          die
        ]++;
      }
    );

    return result;
  }

  /* =========================================================
     FINALIZAÇÃO
  ========================================================= */

  function validateFinal() {
    if (
      !isIdentityComplete()
    ) {
      goToStep(0);
      showToast(
        "Falta o nome."
      );
      return false;
    }

    if (
      !isRaceComplete()
    ) {
      goToStep(1);
      showToast(
        "Falta a raça."
      );
      return false;
    }

    if (
      !isAppearanceComplete()
    ) {
      goToStep(2);
      showToast(
        "Falta definir a aparência."
      );
      return false;
    }

    if (
      !isClassComplete()
    ) {
      goToStep(3);
      showToast(
        "Falta a classe."
      );
      return false;
    }

    if (
      !areAttributesComplete()
    ) {
      goToStep(4);
      showToast(
        "Os 8 atributos precisam ser definidos."
      );
      return false;
    }

    if (
      !isPowerComplete()
    ) {
      goToStep(5);
      showToast(
        "Falta o poder."
      );
      return false;
    }

    if (
      !isManaComplete()
    ) {
      goToStep(6);
      showToast(
        "A Mana precisa estar definida."
      );
      return false;
    }

    return true;
  }

  function finishCharacter() {
    if (
      !validateFinal()
    ) {
      return;
    }

    if (
      !saveLocalDraft()
    ) {
      showToast(
        "Não foi possível salvar a ficha."
      );

      return;
    }

    showToast(
      "Ficha concluída e salva neste dispositivo.",
      3200
    );

    /*
     * O vínculo definitivo com Supabase entra
     * na camada de persistência final.
     *
     * A estrutura do banco já possui:
     * - characters
     * - campaign_characters
     * - campaign_character_settings
     *
     * A ficha-base e a cópia específica de campanha
     * devem continuar separadas.
     */
  }

  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeHtml(
    value
  ) {
    return safeText(
      value
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  function escapeAttribute(
    value
  ) {
    return escapeHtml(
      value
    );
  }

  /* =========================================================
     EVENTOS GERAIS
  ========================================================= */

  function bindGeneralEvents() {
    window.addEventListener(
      "beforeunload",
      () => {
        saveLocalDraft();
      }
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          saveLocalDraft();
        }
      }
    );
  }

  /* =========================================================
     INICIALIZAÇÃO
  ========================================================= */

  function init() {
    if (
      initialized
    ) {
      return;
    }

    initialized =
      true;

    const restored =
      loadLocalDraft();

    bindIdentity();
    bindRace();
    bindClasses();

    bindAttributeClicks();

    bindPower();
    bindMana();

    bindSkills();
    bindTechniques();
    bindInventory();

    bindNavigation();
    bindGeneralEvents();

    setupAppearanceEditor();

    hydrateInterface();

    if (
      !canEnterStep(
        state.currentStep
      )
    ) {
      state.currentStep =
        0;
    }

    goToStep(
      state.currentStep
    );

    updateProgress();
    updateReview();

    if (restored) {
      showToast(
        "Rascunho anterior restaurado.",
        1800
      );
    }

    console.info(
      "[AERION][FICHA] Inicializado.",
      {
        steps:
          STEPS.length,

        races:
          RACES.length,

        animalhaVariants:
          ANIMALHA_VARIANTS.length,

        classes:
          CLASSES.length,

        attributes:
          ATTRIBUTE_ORDER.length,

        dice:
          DICE_LIMITS,

        flightIndependent:
          true
      }
    );
  }

  function hydrateInterface() {
    const name =
      $("#characterName");

    const age =
      $("#characterAge");

    const description =
      $("#characterDescription");

    if (name) {
      name.value =
        state.name;
    }

    if (age) {
      age.value =
        state.age;
    }

    if (description) {
      description.value =
        state.description;
    }

    $$( 'input[name="gender"]' )
      .forEach(
        radio => {
          radio.checked =
            radio.value ===
            state.gender;
        }
      );

    renderAvatar();

    renderRace();

    renderClasses();

    renderAttributes();

    renderPower();

    renderMana();

    renderSkills();

    renderTechniques();

    renderInventory();

    updateAppearanceEditor();

    updateReview();

    updateCombatPreview();
  }

  /* =========================================================
     API PÚBLICA
  ========================================================= */

  window.AERIONFicha =
    Object.freeze({

      getState() {
        try {
          return structuredClone(
            state
          );
        } catch {
          return JSON.parse(
            JSON.stringify(
              state
            )
          );
        }
      },

      saveDraft:
        saveLocalDraft,

      goToStep,

      selectRace:
        selectCurrentRace,

      selectClass,

      selectDice,

      assignDice,

      clearAttribute,

      swapAttributes,

      getDiceUsage:
        () => ({
          ...getDiceUsage()
        }),

      getRemainingDice,

      rollPowerD100,

      selectPower:
        choosePower,

      calculateMaxHp,

      calculateMovement,

      getEffectiveRaceData
    });

  /* =========================================================
     START
  ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})();