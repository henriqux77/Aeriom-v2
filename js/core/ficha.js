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
      description:
        "Equilíbrio, movimentos rápidos e manobras."
    },

    {
      id: "atletismo",
      name: "Atletismo",
      description:
        "Força corporal, corrida, escalada e esforço físico."
    },

    {
      id: "furtividade",
      name: "Furtividade",
      description:
        "Mover-se sem ser percebido."
    },

    {
      id: "percepcao",
      name: "Percepção",
      description:
        "Perceber detalhes, ameaças e mudanças no ambiente."
    },

    {
      id: "investigacao",
      name: "Investigação",
      description:
        "Analisar pistas e descobrir informações."
    },

    {
      id: "conhecimento",
      name: "Conhecimento",
      description:
        "Conhecimentos gerais e especializados."
    },

    {
      id: "medicina",
      name: "Medicina",
      description:
        "Tratamento, primeiros socorros e diagnóstico."
    },

    {
      id: "sobrevivencia",
      name: "Sobrevivência",
      description:
        "Rastreamento, exploração e adaptação ambiental."
    },

    {
      id: "persuasao",
      name: "Persuasão",
      description:
        "Convencer e negociar de maneira legítima."
    },

    {
      id: "intuicao",
      name: "Intuição",
      description:
        "Perceber intenções e situações suspeitas."
    },

    {
      id: "enganacao",
      name: "Enganação",
      description:
        "Blefes, disfarces e manipulação verbal."
    },

    {
      id: "tatica",
      name: "Tática",
      description:
        "Planejamento e leitura de situações de combate."
    },

    {
      id: "oficio",
      name: "Ofício / Crafting",
      description:
        "Construção, reparo e criação de itens."
    },

    {
      id: "controle_mana",
      name: "Controle de Mana",
      description:
        "Domínio e precisão na manipulação de Mana."
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
      profile:
        "Velocidade, furtividade e percepção.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Movimento silencioso e reflexos felinos.",

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
      profile:
        "Força explosiva e mobilidade.",

      attrMods: {
        forca: 1,
        agilidade: 1,
        vigor: -1
      },

      feature:
        "Salto e ataques físicos rápidos.",

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
      profile:
        "Força e presença.",

      attrMods: {
        forca: 1,
        presenca: 1,
        agilidade: -1
      },

      feature:
        "Presença física e intimidação naturais.",

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
      profile:
        "Agilidade e percepção.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },

      feature:
        "Equilíbrio e movimentação precisa.",

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
      profile:
        "Percepção, resistência e rastreamento.",

      attrMods: {
        percepcao: 1,
        vigor: 1,
        presenca: -1
      },

      feature:
        "Sentidos aguçados e excelente rastreamento.",

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
      profile:
        "Agilidade, astúcia e percepção.",

      attrMods: {
        agilidade: 1,
        intelecto: 1,
        forca: -1
      },

      feature:
        "Astúcia e movimentação silenciosa.",

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
      profile:
        "Percepção, precisão e mobilidade aérea.",

      attrMods: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },

      feature:
        "Visão extremamente aguçada.",

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
      profile:
        "Percepção e precisão à distância.",

      attrMods: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },

      feature:
        "Percepção de longa distância.",

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
      profile:
        "Percepção noturna e intelecto.",

      attrMods: {
        percepcao: 1,
        intelecto: 1,
        forca: -1
      },

      feature:
        "Excelente percepção em baixa iluminação.",

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
      profile:
        "Precisão, percepção e controle corporal.",

      attrMods: {
        precisao: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Percepção de movimento e controle corporal.",

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
      profile:
        "Força, vigor e adaptação aquática.",

      attrMods: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },

      feature:
        "Grande resistência e adaptação aquática.",

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
      profile:
        "Agilidade e percepção.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        presenca: -1
      },

      feature:
        "Excelente adaptação a superfícies e ambientes variados.",

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
      profile:
        "Força e Vigor.",

      attrMods: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },

      feature:
        "Grande potência física.",

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
      profile:
        "Vigor extremo e resistência.",

      attrMods: {
        vigor: 2,
        agilidade: -1,
        precisao: -1
      },

      feature:
        "Resistência física extraordinária.",

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
      profile:
        "Vigor, força e adaptação aquática.",

      attrMods: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },

      feature:
        "Grande resistência e excelente adaptação à água.",

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
      profile:
        "Agilidade e percepção.",

      attrMods: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },

      feature:
        "Excelente percepção e movimentação em espaços reduzidos.",

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
      profile:
        "Vigor e percepção.",

      attrMods: {
        vigor: 1,
        percepcao: 1,
        presenca: -1
      },

      feature:
        "Percepção aquática e grande resistência.",

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
      profile:
        "Vigor e agilidade na água.",

      attrMods: {
        vigor: 1,
        agilidade: 1,
        precisao: -1
      },

      feature:
        "Excelente mobilidade aquática.",

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

  let state =
    createDefaultState();

  let selectedDice =
    null;

  let saveTimer =
    null;

  let toastTimer =
    null;

  let initialized =
    false;

  /* =========================================================
     DOM
  ========================================================= */

  const $ = (
    selector,
    root = document
  ) =>
    root.querySelector(
      selector
    );

  const $$ = (
    selector,
    root = document
  ) =>
    Array.from(
      root.querySelectorAll(
        selector
      )
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

  function clamp(
    value,
    min,
    max
  ) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  function formatHeight(
    cm
  ) {
    const value =
      Number(cm);

    if (
      !Number.isFinite(
        value
      )
    ) {
      return "—";
    }

    return `${(
      value / 100
    ).toFixed(2)} m`;
  }

  function showToast(
    message,
    duration = 2400
  ) {
    const toast =
      $("#toast");

    if (!toast) {
      return;
    }

    toast.textContent =
      safeText(
        message
      );

    toast.hidden =
      false;

    clearTimeout(
      toastTimer
    );

    toastTimer =
      window.setTimeout(
        () => {
          toast.hidden =
            true;
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
      textEl.textContent =
        text;
    }

    if (!dot) {
      return;
    }

    if (
      type ===
      "error"
    ) {
      dot.style.background =
        "var(--danger)";

      dot.style.boxShadow =
        "0 0 12px rgba(197,108,99,.4)";

      return;
    }

    if (
      type ===
      "saved"
    ) {
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
      safeText(
        value
      )
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
      RACES[
        state.raceIndex
      ] ||
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
          ...(race.attrMods ||
            {}),

          ...(animalha.attrMods ||
            {})
        },

      movement:
        {
          ...(race.movement ||
            {}),

          ...(animalha.movement ||
            {})
        },

      flight:
        Boolean(
          race.flight ||
          animalha.flight
        )
    };
  }  /* =========================================================
     MODIFICADORES RACIAIS
  ========================================================= */

  function getRaceAttributeModifiers() {
    const race =
      getEffectiveRaceData();

    if (!race) {
      return {};
    }

    return {
      ...(race.attrMods || {})
    };
  }

  function getClassSkillModifiers() {
    const selectedClass =
      CLASSES.find(
        item =>
          item.id ===
          state.class
      );

    if (!selectedClass) {
      return {};
    }

    return {
      ...(selectedClass.skillModifiers ||
        {})
    };
  }

  function getAttributeValue(
    attribute
  ) {
    const value =
      Number(
        state.attributes[
          attribute
        ]
      );

    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }

  function getModifiedAttribute(
    attribute
  ) {
    const base =
      getAttributeValue(
        attribute
      );

    const modifier =
      Number(
        getRaceAttributeModifiers()[
          attribute
        ]
      ) || 0;

    return (
      base +
      modifier
    );
  }

  function getAllModifiedAttributes() {
    const result = {};

    ATTRIBUTE_ORDER.forEach(
      attribute => {
        result[attribute] =
          getModifiedAttribute(
            attribute
          );
      }
    );

    return result;
  }

  /* =========================================================
     ALTURA / PORTE
  ========================================================= */

  function getHeightLimits() {
    const race =
      getEffectiveRaceData();

    if (
      !race ||
      !race.height
    ) {
      return {
        min: 150,
        max: 200
      };
    }

    return {
      min:
        Number(
          race.height.min
        ) || 150,

      max:
        Number(
          race.height.max
        ) || 200
    };
  }

  function getDefaultHeight() {
    const limits =
      getHeightLimits();

    return Math.round(
      (
        limits.min +
        limits.max
      ) / 2
    );
  }

  function ensureValidHeight() {
    const limits =
      getHeightLimits();

    let height =
      Number(
        state.appearance
          .heightCm
      );

    if (
      !Number.isFinite(
        height
      )
    ) {
      height =
        getDefaultHeight();
    }

    state.appearance.heightCm =
      clamp(
        Math.round(
          height
        ),
        limits.min,
        limits.max
      );
  }

  /* =========================================================
     MOVIMENTO / VOO
  ========================================================= */

  function canFly() {
    const race =
      getEffectiveRaceData();

    if (!race) {
      return false;
    }

    /*
     * Voo NÃO pertence exclusivamente
     * às Animalhas.
     *
     * Qualquer raça ou variante que possua
     * flight: true poderá utilizar o sistema.
     */
    return Boolean(
      race.flight
    );
  }

  function getMovementData() {
    const race =
      getEffectiveRaceData();

    if (!race) {
      return {
        base: COMBAT_BASE.movement,
        ground: COMBAT_BASE.movement,
        air: null,
        aquatic: null,
        canFly: false
      };
    }

    const movement =
      race.movement ||
      {};

    const base =
      COMBAT_BASE.movement;

    const groundMultiplier =
      Number(
        movement.groundMultiplier
      ) || 1;

    const airMultiplier =
      Number(
        movement.airMultiplier
      ) || 1;

    const aquaticMultiplier =
      Number(
        movement.aquaticMultiplier
      ) || 1;

    return {
      base,

      ground:
        base *
        groundMultiplier,

      air:
        canFly()
          ? base *
            airMultiplier
          : null,

      aquatic:
        base *
        aquaticMultiplier,

      canFly:
        canFly()
    };
  }

  /* =========================================================
     VIDA
  ========================================================= */

  function calculateBaseLife() {
    const race =
      getEffectiveRaceData();

    if (!race) {
      return COMBAT_BASE.hp;
    }

    const size =
      SIZE_DATA[
        race.size
      ] ||
      SIZE_DATA.medio;

    const vigor =
      getModifiedAttribute(
        "vigor"
      );

    /*
     * O Vigor ainda é um dado.
     *
     * Portanto, esta função NÃO rola
     * automaticamente o dado.
     *
     * Ela apenas prepara a parte fixa.
     */
    return Math.max(
      1,
      COMBAT_BASE.hp +
      size.lifeBonus +
      vigor
    );
  }

  /* =========================================================
     DADOS — PISCINA
  ========================================================= */

  function createDicePool() {
    const pool = [];

    Object.entries(
      DICE_LIMITS
    ).forEach(
      ([die, quantity]) => {
        for (
          let i = 0;
          i < quantity;
          i++
        ) {
          pool.push({
            id:
              `${die}-${i}-${Math.random()
                .toString(36)
                .slice(2)}`,

            die,

            sides:
              DICE_VALUES[
                die
              ],

            assignedTo:
              null
          });
        }
      }
    );

    return pool;
  }

  function getDicePool() {
    if (
      !Array.isArray(
        state.dicePool
      )
    ) {
      state.dicePool =
        createDicePool();
    }

    return state.dicePool;
  }

  function getAvailableDice() {
    return getDicePool()
      .filter(
        die =>
          !die.assignedTo
      );
  }

  function getAssignedDice() {
    return getDicePool()
      .filter(
        die =>
          Boolean(
            die.assignedTo
          )
      );
  }

  function countDiceType(
    dieType
  ) {
    return getDicePool()
      .filter(
        die =>
          die.die ===
          dieType
      )
      .length;
  }

  function countAssignedDiceType(
    dieType
  ) {
    return getDicePool()
      .filter(
        die =>
          die.die ===
            dieType &&
          Boolean(
            die.assignedTo
          )
      )
      .length;
  }

  /* =========================================================
     DADOS — VALIDAÇÃO
  ========================================================= */

  function canAssignDie(
    dieType
  ) {
    const normalized =
      normalizeDie(
        dieType
      );

    if (!normalized) {
      return false;
    }

    const limit =
      DICE_LIMITS[
        normalized
      ];

    const used =
      countAssignedDiceType(
        normalized
      );

    return used <
      limit;
  }

  function findAvailableDie(
    dieType
  ) {
    const normalized =
      normalizeDie(
        dieType
      );

    if (!normalized) {
      return null;
    }

    return (
      getAvailableDice()
        .find(
          die =>
            die.die ===
            normalized
        ) ||
      null
    );
  }

  /* =========================================================
     DADOS — ATRIBUTOS
  ========================================================= */

  function assignDieToAttribute(
    dieId,
    attribute
  ) {
    if (
      !ATTRIBUTE_ORDER.includes(
        attribute
      )
    ) {
      return false;
    }

    const die =
      getDicePool()
        .find(
          item =>
            item.id ===
            dieId
        );

    if (!die) {
      return false;
    }

    /*
     * O dado já pertence ao atributo.
     */
    if (
      die.assignedTo ===
      attribute
    ) {
      return true;
    }

    /*
     * Se o dado estiver em outro atributo,
     * primeiro devolvemos a associação.
     */
    if (
      die.assignedTo
    ) {
      die.assignedTo =
        null;
    }

    /*
     * Só é permitido colocar a quantidade
     * definida pelas regras na piscina.
     *
     * Não existe dado infinito.
     */
    if (
      !canAssignDie(
        die.die
      )
    ) {
      return false;
    }

    die.assignedTo =
      attribute;

    state.attributes[
      attribute
    ] = die.die;

    saveDraft();

    renderAll();

    return true;
  }

  function removeDieFromAttribute(
    attribute
  ) {
    if (
      !ATTRIBUTE_ORDER.includes(
        attribute
      )
    ) {
      return false;
    }

    const assigned =
      getDicePool()
        .filter(
          die =>
            die.assignedTo ===
            attribute
        );

    assigned.forEach(
      die => {
        die.assignedTo =
          null;
      }
    );

    state.attributes[
      attribute
    ] = null;

    saveDraft();

    renderAll();

    return true;
  }

  function moveDie(
    dieId,
    targetAttribute
  ) {
    return assignDieToAttribute(
      dieId,
      targetAttribute
    );
  }

  function returnDie(
    dieId
  ) {
    const die =
      getDicePool()
        .find(
          item =>
            item.id ===
            dieId
        );

    if (!die) {
      return false;
    }

    const previous =
      die.assignedTo;

    die.assignedTo =
      null;

    if (
      previous &&
      state.attributes[
        previous
      ] === die.die
    ) {
      state.attributes[
        previous
      ] = null;
    }

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     DADOS — TROCA DE ORDEM
  ========================================================= */

  function swapAttributeDice(
    firstAttribute,
    secondAttribute
  ) {
    if (
      !ATTRIBUTE_ORDER.includes(
        firstAttribute
      ) ||
      !ATTRIBUTE_ORDER.includes(
        secondAttribute
      )
    ) {
      return false;
    }

    const firstDice =
      getDicePool()
        .filter(
          die =>
            die.assignedTo ===
            firstAttribute
        );

    const secondDice =
      getDicePool()
        .filter(
          die =>
            die.assignedTo ===
            secondAttribute
        );

    firstDice.forEach(
      die => {
        die.assignedTo =
          secondAttribute;
      }
    );

    secondDice.forEach(
      die => {
        die.assignedTo =
          firstAttribute;
      }
    );

    const firstValue =
      state.attributes[
        firstAttribute
      ];

    state.attributes[
      firstAttribute
    ] =
      state.attributes[
        secondAttribute
      ];

    state.attributes[
      secondAttribute
    ] =
      firstValue;

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     ROLAGEM DE DADO
  ========================================================= */

  function rollDie(
    dieType
  ) {
    const normalized =
      normalizeDie(
        dieType
      );

    if (!normalized) {
      return null;
    }

    const sides =
      DICE_VALUES[
        normalized
      ];

    return (
      Math.floor(
        Math.random() *
          sides
      ) + 1
    );
  }

  function rollAssignedAttribute(
    attribute
  ) {
    const die =
      getDicePool()
        .find(
          item =>
            item.assignedTo ===
            attribute
        );

    if (!die) {
      showToast(
        "Nenhum dado foi colocado neste atributo."
      );

      return null;
    }

    const result =
      rollDie(
        die.die
      );

    const racialModifier =
      Number(
        getRaceAttributeModifiers()[
          attribute
        ]
      ) || 0;

    const total =
      result +
      racialModifier;

    state.rollResults =
      state.rollResults ||
      {};

    state.rollResults[
      attribute
    ] = {
      die:
        die.die,

      result,

      racialModifier,

      total,

      rolledAt:
        Date.now()
    };

    saveDraft();

    renderAll();

    showToast(
      `${ATTRIBUTE_NAMES[attribute]}: ${total}`
    );

    return total;
  }

  function rollAllAttributes() {
    ATTRIBUTE_ORDER.forEach(
      attribute => {
        const die =
          getDicePool()
            .find(
              item =>
                item.assignedTo ===
                attribute
            );

        if (die) {
          rollAssignedAttribute(
            attribute
          );
        }
      }
    );
  }

  /* =========================================================
     PODER — D100
  ========================================================= */

  function rollD100() {
    return (
      Math.floor(
        Math.random() *
          100
      ) + 1
    );
  }

  function resolvePrimaryPower(
    roll
  ) {
    const value =
      clamp(
        Number(roll) || 1,
        1,
        100
      );

    const index =
      Math.min(
        PRIMARY_POWERS.length - 1,
        Math.floor(
          (
            value - 1
          ) /
            (
              100 /
              PRIMARY_POWERS.length
            )
        )
      );

    return {
      roll: value,

      power:
        PRIMARY_POWERS[
          index
        ]
    };
  }

  function rollPrimaryPower() {
    const result =
      resolvePrimaryPower(
        rollD100()
      );

    state.powerRoll =
      result.roll;

    state.power =
      result.power;

    state.powerType =
      "principal";

    saveDraft();

    renderAll();

    showToast(
      `D100: ${result.roll} — ${result.power}`
    );

    return result;
  }

  function selectParallelPower(
    power
  ) {
    if (
      !PARALLEL_POWERS.includes(
        power
      )
    ) {
      return false;
    }

    state.power =
      power;

    state.powerType =
      "paralelo";

    state.powerRoll =
      null;

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     MANA
  ========================================================= */

  const MANA_COLORS =
    Object.freeze([
      "azul",
      "branca",
      "dourada",
      "negra"
    ]);

  function selectMana(
    mana
  ) {
    const value =
      safeText(
        mana
      )
        .trim()
        .toLowerCase();

    /*
     * Fora da campanha,
     * somente Azul é liberada.
     */
    if (
      value !==
      "azul"
    ) {
      showToast(
        "Esta Mana está bloqueada. O Mestre pode liberá-la dentro de uma campanha."
      );

      return false;
    }

    state.mana =
      "azul";

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     PERÍCIAS
  ========================================================= */

  function createDefaultSkills() {
    return SKILLS.map(
      skill => ({
        id:
          skill.id,

        name:
          skill.name,

        bonus:
          0,

        trained:
          false
      })
    );
  }

  function ensureSkills() {
    if (
      !Array.isArray(
        state.skills
      ) ||
      !state.skills.length
    ) {
      state.skills =
        createDefaultSkills();

      return;
    }

    const existing =
      new Map(
        state.skills.map(
          skill => [
            skill.id,
            skill
          ]
        )
      );

    state.skills =
      SKILLS.map(
        skill => {
          const old =
            existing.get(
              skill.id
            );

          return {
            id:
              skill.id,

            name:
              skill.name,

            bonus:
              Number(
                old?.bonus
              ) || 0,

            trained:
              Boolean(
                old?.trained
              )
          };
        }
      );
  }

  function getSkill(
    skillId
  ) {
    ensureSkills();

    return (
      state.skills.find(
        skill =>
          skill.id ===
          skillId
      ) ||
      null
    );
  }

  function getEffectiveSkillBonus(
    skillId
  ) {
    const skill =
      getSkill(
        skillId
      );

    if (!skill) {
      return 0;
    }

    const classModifiers =
      getClassSkillModifiers();

    const classBonus =
      Number(
        classModifiers[
          skillId
        ]
      ) || 0;

    return (
      Number(
        skill.bonus
      ) || 0
    ) +
      (
        skill.trained
          ? 5
          : 0
      ) +
      classBonus;
  }

  function setSkillBonus(
    skillId,
    bonus
  ) {
    const skill =
      getSkill(
        skillId
      );

    if (!skill) {
      return false;
    }

    skill.bonus =
      clamp(
        Number(
          bonus
        ) || 0,
        -20,
        20
      );

    saveDraft();

    renderAll();

    return true;
  }

  function toggleSkillTraining(
    skillId
  ) {
    const skill =
      getSkill(
        skillId
      );

    if (!skill) {
      return false;
    }

    skill.trained =
      !skill.trained;

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     TÉCNICAS
  ========================================================= */

  function createTechnique() {
    return {
      id:
        `tech-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      name: "",
      description: "",
      range: "",
      damage: ""
    };
  }

  function addTechnique(
    data = {}
  ) {
    if (
      !Array.isArray(
        state.techniques
      )
    ) {
      state.techniques =
        [];
    }

    state.techniques.push({
      ...createTechnique(),
      ...data
    });

    saveDraft();

    renderAll();

    return state.techniques[
      state.techniques.length -
        1
    ];
  }

  function updateTechnique(
    techniqueId,
    field,
    value
  ) {
    const technique =
      state.techniques.find(
        item =>
          item.id ===
          techniqueId
      );

    if (!technique) {
      return false;
    }

    const allowed =
      [
        "name",
        "description",
        "range",
        "damage"
      ];

    if (
      !allowed.includes(
        field
      )
    ) {
      return false;
    }

    technique[
      field
    ] =
      safeText(
        value
      );

    saveDraft();

    return true;
  }

  function removeTechnique(
    techniqueId
  ) {
    state.techniques =
      state.techniques.filter(
        technique =>
          technique.id !==
          techniqueId
      );

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     INVENTÁRIO
  ========================================================= */

  function createInventoryItem() {
    return {
      id:
        `item-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      name: "",
      quantity: 1,
      description: ""
    };
  }

  function addInventoryItem(
    data = {}
  ) {
    if (
      !Array.isArray(
        state.inventory
      )
    ) {
      state.inventory =
        [];
    }

    const item = {
      ...createInventoryItem(),
      ...data
    };

    state.inventory.push(
      item
    );

    saveDraft();

    renderAll();

    return item;
  }

  function updateInventoryItem(
    itemId,
    field,
    value
  ) {
    const item =
      state.inventory.find(
        entry =>
          entry.id ===
          itemId
      );

    if (!item) {
      return false;
    }

    if (
      field ===
      "quantity"
    ) {
      item.quantity =
        Math.max(
          0,
          Number(
            value
          ) || 0
        );
    } else if (
      [
        "name",
        "description"
      ].includes(
        field
      )
    ) {
      item[field] =
        safeText(
          value
        );
    } else {
      return false;
    }

    saveDraft();

    return true;
  }

  function removeInventoryItem(
    itemId
  ) {
    state.inventory =
      state.inventory.filter(
        item =>
          item.id !==
          itemId
      );

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     IDENTIDADE
  ========================================================= */

  function updateIdentity(
    field,
    value
  ) {
    const allowed =
      [
        "name",
        "age",
        "gender",
        "description"
      ];

    if (
      !allowed.includes(
        field
      )
    ) {
      return false;
    }

    state[field] =
      safeText(
        value
      );

    saveDraft();

    return true;
  }

  /* =========================================================
     APARÊNCIA
  ========================================================= */

  function updateAppearance(
    field,
    value
  ) {
    const allowed =
      [
        "heightCm",
        "sizeCategory",
        "hair",
        "eyes",
        "skin",
        "clothing",
        "scars",
        "tattoos",
        "physicalNotes"
      ];

    if (
      !allowed.includes(
        field
      )
    ) {
      return false;
    }

    if (
      field ===
      "heightCm"
    ) {
      state.appearance[
        field
      ] =
        Number(
          value
        ) || null;

      ensureValidHeight();
    } else {
      state.appearance[
        field
      ] =
        safeText(
          value
        );
    }

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     RAÇA
  ========================================================= */

  function selectRace(
    raceId
  ) {
    const race =
      RACES.find(
        item =>
          item.id ===
          raceId
      );

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

    /*
     * Ao trocar de raça, a variante
     * Animalha anterior deixa de existir.
     */
    if (
      race.id !==
      "animalha"
    ) {
      state.animalhaVariant =
        "";
    }

    ensureValidHeight();

    saveDraft();

    renderAll();

    return true;
  }

  function selectAnimalhaVariant(
    variantId
  ) {
    if (
      state.race !==
      "animalha"
    ) {
      return false;
    }

    const variant =
      ANIMALHA_VARIANTS.find(
        item =>
          item.id ===
          variantId
      );

    if (!variant) {
      return false;
    }

    state.animalhaVariant =
      variant.id;

    ensureValidHeight();

    saveDraft();

    renderAll();

    return true;
  }

  /* =========================================================
     CLASSE
  ========================================================= */

  function selectClass(
    classId
  ) {
    const selected =
      CLASSES.find(
        item =>
          item.id ===
          classId
      );

    if (!selected) {
      return false;
    }

    state.class =
      selected.id;

    state.classBonus =
      selected.role;

    ensureSkills();

    saveDraft();

    renderAll();

    return true;
  }