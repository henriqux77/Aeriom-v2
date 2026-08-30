/* =========================================================
   AERION — CRIAÇÃO DE FICHA
   js/core/ficha.js

   VERSÃO CONSOLIDADA
   =========================================================

   Fluxo:
   01 Identidade
   02 Raça
   03 Aparência
   04 Classe
   05 Atributos
   06 Poder
   07 Mana
   08 Perícias
   09 Técnicas
   10 Inventário
   11 Revisão

   Regras importantes:
   - Autosave local.
   - Raça obrigatória.
   - Aparência baseada na raça.
   - Animalha possui subescolha.
   - Modificadores raciais entram diretamente nos atributos.
   - Dados possuem quantidade LIMITADA.
   - Dados podem ser selecionados, arrastados, trocados e devolvidos.
   - O sistema de sacrificar dados NÃO está implementado.
   - Poder principal usa D100 entre Fogo, Ar, Terra e Água.
   - Poderes paralelos são escolhidos separadamente.
   - Mana Azul é a única liberada fora da campanha.
   - Voo é uma característica independente de Animalha.
   - Vida depende de base + Vigor + porte.
   - Deslocamento depende de porte + características de movimento.
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    storageKey: "aerion:ficha:draft:v8",
    lastCharacterKey: "aerion:ficha:last",
    autosaveDelay: 450,
    maxImageSize: 6 * 1024 * 1024
  });

  /* =========================================================
     ETAPAS
     ========================================================= */

  const STEPS = Object.freeze([
    ["identity", "Identidade"],
    ["race", "Raça"],
    ["appearance", "Aparência"],
    ["class", "Classe"],
    ["attributes", "Atributos"],
    ["power", "Poder"],
    ["mana", "Mana"],
    ["skills", "Perícias"],
    ["techniques", "Técnicas"],
    ["inventory", "Inventário"],
    ["review", "Revisão"]
  ]);

  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTES = Object.freeze([
    ["forca", "Força"],
    ["vigor", "Vigor"],
    ["agilidade", "Agilidade"],
    ["precisao", "Precisão"],
    ["intelecto", "Intelecto"],
    ["controle", "Controle"],
    ["presenca", "Presença"],
    ["percepcao", "Percepção"]
  ]);

  /* =========================================================
     DADOS
     ========================================================= */

  const DICE = Object.freeze({
    d4: {
      sides: 4,
      limit: 1
    },

    d6: {
      sides: 6,
      limit: 2
    },

    d8: {
      sides: 8,
      limit: 1
    },

    d10: {
      sides: 10,
      limit: 1
    },

    d12: {
      sides: 12,
      limit: 1
    },

    d20: {
      sides: 20,
      limit: 2
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

  /* =========================================================
     CLASSES
     ========================================================= */

  const CLASSES = Object.freeze({
    guerreiro: {
      name: "Guerreiro",
      role: "Combatente",

      skills: {
        atletismo: 1,
        tatica: 1
      }
    },

    feiticeiro: {
      name: "Feiticeiro",
      role: "Mágico",

      skills: {
        conhecimento: 1,
        controle_mana: 1
      }
    },

    curandeiro: {
      name: "Curandeiro",
      role: "Suporte",

      skills: {
        medicina: 1,
        intuicao: 1
      }
    },

    monge: {
      name: "Monge",
      role: "Marcial",

      skills: {
        atletismo: 1,
        controle_mana: 1
      }
    }
  });

  /* =========================================================
     PERÍCIAS
     ========================================================= */

  const SKILLS = Object.freeze([
    [
      "acrobacia",
      "Acrobacia",
      "Equilíbrio, movimentos rápidos e manobras."
    ],

    [
      "atletismo",
      "Atletismo",
      "Força corporal, corrida, escalada e esforço físico."
    ],

    [
      "furtividade",
      "Furtividade",
      "Mover-se sem ser percebido."
    ],

    [
      "percepcao",
      "Percepção",
      "Perceber detalhes, ameaças e mudanças no ambiente."
    ],

    [
      "investigacao",
      "Investigação",
      "Analisar pistas e descobrir informações."
    ],

    [
      "conhecimento",
      "Conhecimento",
      "Conhecimentos gerais e especializados."
    ],

    [
      "medicina",
      "Medicina",
      "Tratamento, primeiros socorros e diagnóstico."
    ],

    [
      "sobrevivencia",
      "Sobrevivência",
      "Rastreamento, exploração e adaptação ambiental."
    ],

    [
      "persuasao",
      "Persuasão",
      "Convencer e negociar de maneira legítima."
    ],

    [
      "intuicao",
      "Intuição",
      "Perceber intenções e situações suspeitas."
    ],

    [
      "enganacao",
      "Enganação",
      "Blefes, disfarces e manipulação verbal."
    ],

    [
      "tatica",
      "Tática",
      "Planejamento e leitura de situações de combate."
    ],

    [
      "oficio",
      "Ofício / Crafting",
      "Construção, reparo e criação de itens."
    ],

    [
      "controle_mana",
      "Controle de Mana",
      "Domínio e precisão na manipulação de Mana."
    ]
  ]);

  /* =========================================================
     RAÇAS
     ========================================================= */

  const RACES = Object.freeze([
    {
      id: "humano",
      name: "Humano",

      male:
        "https://i.ibb.co/TBNmfF0S/file-000000008b74820ea8b432fcf06ed975.png",

      female:
        "https://i.ibb.co/LdmxJ2h9/file-000000004b94820ead12a26ca92d75b7.png",

      desc:
        "Humanos são conhecidos por sua capacidade de adaptação e aprendizado.",

      profile:
        "Adaptabilidade e aprendizado.",

      mods: {
        intelecto: 1,
        presenca: 1
      },

      feature:
        "Adaptação: pode repetir um teste recém-falhado uma vez por cena.",

      size: "medio",

      height: [150, 200],

      flight: false
    },

    {
      id: "elfo",
      name: "Elfo",

      male:
        "https://i.ibb.co/0y8WXSr8/file-00000000495c820e99fc5de509918d90.png",

      female:
        "https://i.ibb.co/F1DCc3j/file-00000000dcf8820e883635d6ca9de492.png",

      desc:
        "Elfos possuem sentidos aguçados e forte afinidade com Mana.",

      profile:
        "Percepção e afinidade com Mana.",

      mods: {
        percepcao: 1,
        controle: 1,
        vigor: -1
      },

      feature:
        "Percepção Élfica: percebe alterações de Mana e sinais difíceis de notar.",

      size: "medio",

      height: [155, 205],

      flight: false
    },

    {
      id: "anao",
      name: "Anão",

      male:
        "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",

      female:
        "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png",

      desc:
        "Anões possuem constituição robusta e forte tradição de forja.",

      profile:
        "Resistência e força estrutural.",

      mods: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },

      feature:
        "Forja Ancestral.",

      size: "pequeno",

      height: [120, 155],

      flight: false
    },

    {
      id: "orc",
      name: "Orc",

      male:
        "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",

      female:
        "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png",

      desc:
        "Orcs são fisicamente poderosos e naturalmente resistentes.",

      profile:
        "Potência física e resistência.",

      mods: {
        forca: 1,
        vigor: 1,
        presenca: -1
      },

      feature:
        "Fúria de Sangue.",

      size: "grande",

      height: [170, 220],

      flight: false
    },

    {
      id: "centauro",
      name: "Centauro",

      male:
        "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",

      female:
        "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png",

      desc:
        "Centauros unem anatomia humanoide e equina.",

      profile:
        "Velocidade terrestre e potência física.",

      mods: {
        forca: 1,
        agilidade: 1,
        controle: -1
      },

      feature:
        "Galope Ancestral.",

      size: "grande",

      height: [180, 240],

      flight: false,

      movement: {
        groundMultiplier: 2
      }
    },

    {
      id: "vampiro",
      name: "Vampiro",

      male:
        "https://i.ibb.co/PGFcNRXZ/file-0000000019dc820ea49a893a9831ffeb.png",

      female:
        "https://i.ibb.co/Kpx8jh0j/file-000000008cfc820e827a7b8376d3fd55.png",

      desc:
        "Vampiros possuem uma natureza sobrenatural e sentidos aguçados.",

      profile:
        "Mobilidade, percepção e sobrevivência sobrenatural.",

      mods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Regeneração Sanguínea.",

      size: "medio",

      height: [155, 205],

      flight: false
    },

    {
      id: "duende",
      name: "Duende",

      male:
        "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",

      female:
        "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png",

      desc:
        "Duendes possuem forte aptidão para comércio, contratos e astúcia.",

      profile:
        "Intelecto, negociação e precisão.",

      mods: {
        intelecto: 1,
        precisao: 1,
        forca: -1
      },

      feature:
        "Fortuna Mercante.",

      size: "pequeno",

      height: [130, 160],

      flight: false
    },

    {
      id: "fada",
      name: "Fada",

      male:
        "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",

      female:
        "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png",

      desc:
        "Fadas possuem corpos leves e grande afinidade com Mana.",

      profile:
        "Leveza, agilidade e Mana.",

      mods: {
        controle: 1,
        agilidade: 1,
        forca: -1
      },

      feature:
        "Bênção Feérica.",

      size: "pequeno",

      height: [130, 160],

      flight: true,

      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "povo_aquatico",
      name: "Povo Aquático",

      male:
        "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png",

      female:
        "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png",

      desc:
        "O Povo Aquático possui adaptações naturais para ambientes aquáticos.",

      profile:
        "Adaptação à água e percepção ambiental.",

      mods: {
        vigor: 1,
        percepcao: 1,
        forca: -1
      },

      feature:
        "Anfíbio.",

      size: "medio",

      height: [150, 210],

      flight: false,

      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "animalha",
      name: "Animalha",

      male:
        "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",

      female:
        "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea284e54236c00052.png",

      desc:
        "Animalhas possuem traços animais integrados à anatomia humanoide.",

      profile:
        "Instinto, sentidos e adaptação natural.",

      mods: {},

      feature:
        "Instinto Animal.",

      size: "medio",

      height: [140, 210],

      flight: false,

      animalha: true
    },

    {
      id: "povo_natureza",
      name: "Povo da Natureza",

      male:
        "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",

      female:
        "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",

      desc:
        "O Povo da Natureza possui forte ligação com ambientes e criaturas naturais.",

      profile:
        "Percepção ambiental e resistência natural.",

      mods: {
        percepcao: 1,
        vigor: 1,
        precisao: -1
      },

      feature:
        "Vínculo Natural.",

      size: "medio",

      height: [150, 210],

      flight: false
    },

    {
      id: "neraliano",
      name: "Neraliano",

      male:
        "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",

      female:
        "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png",

      desc:
        "Neralianos possuem adaptações relacionadas à água, profundidade e vibrações.",

      profile:
        "Adaptação aquática e leitura de vibrações.",

      mods: {
        vigor: 1,
        percepcao: 1,
        agilidade: -1
      },

      feature:
        "Adaptação Abissal.",

      size: "medio",

      height: [155, 205],

      flight: false,

      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "aureano",
      name: "Aureano",

      male: "",
      female: "",

      desc:
        "Raça associada às grandes altitudes e mobilidade vertical.",

      profile:
        "Mobilidade vertical e percepção espacial.",

      mods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Corpo Celestial.",

      size: "medio",

      height: [170, 230],

      flight: false
    },

    {
      id: "povo_nuvens",
      name: "Povo das Nuvens",

      male: "",
      female: "",

      desc:
        "Raça adaptada a ambientes elevados e grandes altitudes.",

      profile:
        "Leveza e mobilidade em grandes altitudes.",

      mods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      feature:
        "Passo do Céu.",

      size: "medio",

      height: [165, 225],

      flight: false
    },

    {
      id: "colosso",
      name: "Colosso",

      male: "",
      female: "",

      desc:
        "Colossos possuem grande porte e asas colossais.",

      profile:
        "Força e resistência extraordinárias.",

      mods: {
        forca: 2,
        vigor: 1,
        agilidade: -1
      },

      feature:
        "Asas Colossais.",

      size: "colossal",

      height: [250, 400],

      flight: true,

      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "troll",
      name: "Troll",

      male: "",
      female: "",

      desc:
        "Trolls possuem grande resistência física e capacidade regenerativa.",

      profile:
        "Resistência extrema e recuperação.",

      mods: {
        vigor: 2,
        forca: 1,
        agilidade: -1
      },

      feature:
        "Regeneração Brutal.",

      size: "grande",

      height: [220, 320],

      flight: false
    }
  ]);

  /* =========================================================
     ANIMALHAS
     ========================================================= */

  const ANIMALHA_VARIANTS = Object.freeze([
    {
      id: "pantera",
      name: "Pantera",
      category: "Felino",
      profile: "Velocidade, furtividade e percepção.",
      mods: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },
      feature: "Movimento silencioso e reflexos felinos.",
      size: "medio",
      height: [145, 180],
      flight: false
    },

    {
      id: "tigre",
      name: "Tigre",
      category: "Felino",
      profile: "Força explosiva e mobilidade.",
      mods: {
        forca: 1,
        agilidade: 1,
        vigor: -1
      },
      feature: "Salto e ataques físicos rápidos.",
      size: "grande",
      height: [155, 195],
      flight: false
    },

    {
      id: "leao",
      name: "Leão",
      category: "Felino",
      profile: "Força e presença.",
      mods: {
        forca: 1,
        presenca: 1,
        agilidade: -1
      },
      feature: "Presença física e intimidação naturais.",
      size: "grande",
      height: [165, 205],
      flight: false
    },

    {
      id: "gato",
      name: "Gato",
      category: "Felino",
      profile: "Agilidade e percepção.",
      mods: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },
      feature: "Equilíbrio e movimentação precisa.",
      size: "pequeno",
      height: [135, 160],
      flight: false
    },

    {
      id: "lobo",
      name: "Lobo",
      category: "Canídeo",
      profile: "Percepção, resistência e rastreamento.",
      mods: {
        percepcao: 1,
        vigor: 1,
        presenca: -1
      },
      feature: "Sentidos aguçados e excelente rastreamento.",
      size: "medio",
      height: [145, 190],
      flight: false
    },

    {
      id: "raposa",
      name: "Raposa",
      category: "Canídeo",
      profile: "Agilidade, astúcia e percepção.",
      mods: {
        agilidade: 1,
        intelecto: 1,
        forca: -1
      },
      feature: "Astúcia e movimentação silenciosa.",
      size: "pequeno",
      height: [135, 165],
      flight: false
    },

    {
      id: "falcao",
      name: "Falcão",
      category: "Ave",
      profile: "Percepção, precisão e mobilidade aérea.",
      mods: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },
      feature: "Visão extremamente aguçada.",
      size: "pequeno",
      height: [135, 165],
      flight: true,
      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "aguia",
      name: "Águia",
      category: "Ave",
      profile: "Percepção e precisão à distância.",
      mods: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },
      feature: "Percepção de longa distância.",
      size: "medio",
      height: [145, 180],
      flight: true,
      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "coruja",
      name: "Coruja",
      category: "Ave",
      profile: "Percepção noturna e intelecto.",
      mods: {
        percepcao: 1,
        intelecto: 1,
        forca: -1
      },
      feature: "Excelente percepção em baixa iluminação.",
      size: "pequeno",
      height: [135, 165],
      flight: true,
      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "cobra",
      name: "Cobra",
      category: "Réptil",
      profile: "Precisão, percepção e controle corporal.",
      mods: {
        precisao: 1,
        percepcao: 1,
        vigor: -1
      },
      feature: "Percepção de movimento e controle corporal.",
      size: "pequeno",
      height: [135, 165],
      flight: false
    },

    {
      id: "crocodilo",
      name: "Crocodilo",
      category: "Réptil",
      profile: "Força, vigor e adaptação aquática.",
      mods: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },
      feature: "Grande resistência e adaptação aquática.",
      size: "grande",
      height: [180, 250],
      flight: false,
      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "lagarto",
      name: "Lagarto",
      category: "Réptil",
      profile: "Agilidade e percepção.",
      mods: {
        agilidade: 1,
        percepcao: 1,
        presenca: -1
      },
      feature: "Adaptação a superfícies e ambientes variados.",
      size: "medio",
      height: [140, 180],
      flight: false
    },

    {
      id: "urso",
      name: "Urso",
      category: "Grande porte",
      profile: "Força e vigor.",
      mods: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },
      feature: "Grande potência física.",
      size: "grande",
      height: [190, 270],
      flight: false
    },

    {
      id: "rinoceronte",
      name: "Rinoceronte",
      category: "Grande porte",
      profile: "Vigor extremo e resistência.",
      mods: {
        vigor: 2,
        agilidade: -1,
        precisao: -1
      },
      feature: "Resistência física extraordinária.",
      size: "grande",
      height: [200, 280],
      flight: false
    },

    {
      id: "hipopotamo",
      name: "Hipopótamo",
      category: "Grande porte / Aquático",
      profile: "Vigor, força e adaptação aquática.",
      mods: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },
      feature: "Grande resistência e adaptação à água.",
      size: "grande",
      height: [200, 280],
      flight: false,
      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "rato",
      name: "Rato",
      category: "Pequeno porte",
      profile: "Agilidade e percepção.",
      mods: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },
      feature: "Excelente percepção e movimentação.",
      size: "pequeno",
      height: [135, 160],
      flight: false
    },

    {
      id: "tubarao",
      name: "Tubarão",
      category: "Aquático",
      profile: "Vigor e percepção.",
      mods: {
        vigor: 1,
        percepcao: 1,
        presenca: -1
      },
      feature: "Percepção aquática e grande resistência.",
      size: "grande",
      height: [180, 240],
      flight: false,
      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "foca",
      name: "Foca",
      category: "Aquático",
      profile: "Vigor e agilidade na água.",
      mods: {
        vigor: 1,
        agilidade: 1,
        precisao: -1
      },
      feature: "Excelente mobilidade aquática.",
      size: "medio",
      height: [145, 180],
      flight: false,
      movement: {
        aquaticMultiplier: 2
      }
    }
  ]);

  /* =========================================================
     PORTE
     ========================================================= */

  const SIZE_RULES = Object.freeze({
    pequeno: {
      label: "Pequeno",
      hpBonus: 1,
      movement: 0.5
    },

    medio: {
      label: "Médio",
      hpBonus: 3,
      movement: 1
    },

    grande: {
      label: "Grande",
      hpBonus: 5,
      movement: 0.5
    },

    colossal: {
      label: "Colossal",
      hpBonus: 5,
      movement: 0.5
    }
  });

  /* =========================================================
     ESTADO PADRÃO
     ========================================================= */

  function createDefaultState() {
    return {
      name: "",
      age: "",
      gender: "",

      description: "",
      origin: "",

      race: "",
      raceIndex: 0,
      animalha: "",

      height: null,

      appearance: {
        hair: "",
        eyes: "",
        skin: "",
        clothing: "",
        scars: "",
        tattoos: "",
        physicalNotes: ""
      },

      avatar: "",
      avatarName: "",

      class: "",

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

      rolls: {},

      power: "",
      powerRoll: null,
      powerType: "",

      mana: "azul",

      skills: {},

      techniques: [],

      inventory: [],

      step: 0,

      updatedAt: null
    };
  }

  let state = createDefaultState();

  let selectedDie = null;
  let saveTimeout = null;

  /* =========================================================
     UTILIDADES
     ========================================================= */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function slug(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function toast(message, duration = 2200) {
    let element = $("#toast");

    if (!element) {
      element =
        document.createElement("div");

      element.id = "toast";
      element.className = "toast";

      document.body.appendChild(
        element
      );
    }

    element.textContent =
      String(message);

    element.hidden = false;

    clearTimeout(
      element.__aerionTimer
    );

    element.__aerionTimer =
      setTimeout(
        () => {
          element.hidden = true;
        },
        duration
      );
  }

  function updateSaveStatus(
    text
  ) {
    const element =
      $("#saveStatusText");

    if (element) {
      element.textContent =
        text;
    }
  }

  /* =========================================================
     AUTOSAVE
     ========================================================= */

  function save() {
    state.updatedAt =
      new Date().toISOString();

    updateSaveStatus(
      "Salvando..."
    );

    clearTimeout(
      saveTimeout
    );

    saveTimeout =
      setTimeout(
        () => {
          try {
            localStorage.setItem(
              CONFIG.storageKey,
              JSON.stringify(
                state
              )
            );

            updateSaveStatus(
              "Salvo automaticamente"
            );
          } catch (error) {
            console.error(
              "[AERION] Falha ao salvar:",
              error
            );

            updateSaveStatus(
              "Erro ao salvar"
            );
          }
        },
        CONFIG.autosaveDelay
      );
  }

  function forceSave() {
    clearTimeout(
      saveTimeout
    );

    try {
      state.updatedAt =
        new Date().toISOString();

      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(
          state
        )
      );

      updateSaveStatus(
        "Salvo automaticamente"
      );

      return true;
    } catch (error) {
      console.error(
        "[AERION] Falha ao salvar:",
        error
      );

      updateSaveStatus(
        "Erro ao salvar"
      );

      return false;
    }
  }

  function loadDraft() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!raw) {
        return false;
      }

      const saved =
        JSON.parse(raw);

      if (
        !saved ||
        typeof saved !== "object"
      ) {
        return false;
      }

      const defaults =
        createDefaultState();

      state = {
        ...defaults,
        ...saved,

        appearance: {
          ...defaults.appearance,
          ...(saved.appearance || {})
        },

        attributes: {
          ...defaults.attributes,
          ...(saved.attributes || {})
        },

        rolls: {
          ...(saved.rolls || {})
        }
      };

      ensureSkills();

      if (
        !Array.isArray(
          state.techniques
        )
      ) {
        state.techniques = [];
      }

      if (
        !Array.isArray(
          state.inventory
        )
      ) {
        state.inventory = [];
      }

      state.step =
        clamp(
          Number(state.step) || 0,
          0,
          STEPS.length - 1
        );

      return true;
    } catch (error) {
      console.warn(
        "[AERION] Rascunho inválido:",
        error
      );

      return false;
    }
  }

  function clearDraft() {
    clearTimeout(
      saveTimeout
    );

    localStorage.removeItem(
      CONFIG.storageKey
    );
  }

  /* =========================================================
     DADOS — UTILIDADES
     ========================================================= */

  function countAssignedDie(
    die
  ) {
    return Object.values(
      state.attributes
    ).filter(
      value =>
        value === die
    ).length;
  }

  function isDieAvailable(
    die
  ) {
    if (!DICE[die]) {
      return false;
    }

    return (
      countAssignedDie(die) <
      DICE[die].limit
    );
  }

  function getAvailableDice() {
    const result = [];

    Object.entries(
      DICE
    ).forEach(
      ([id, data]) => {
        const remaining =
          data.limit -
          countAssignedDie(id);

        for (
          let i = 0;
          i < remaining;
          i++
        ) {
          result.push(id);
        }
      }
    );

    return result;
  }

  function dieValue(
    die
  ) {
    return DICE[die]?.sides || 0;
  }

  function rollSides(
    sides
  ) {
    return (
      Math.floor(
        Math.random() *
          Number(sides)
      ) + 1
    );
  }

  /* =========================================================
     RAÇA — DADOS EFETIVOS
     ========================================================= */

  function getBaseRace() {
    return (
      RACES.find(
        race =>
          race.id ===
          state.race
      ) ||
      null
    );
  }

  function getAnimalha() {
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
          state.animalha
      ) ||
      null
    );
  }

  function getEffectiveRace() {
    const race =
      getBaseRace();

    if (!race) {
      return null;
    }

    const animal =
      getAnimalha();

    if (!animal) {
      return race;
    }

    return {
      ...race,

      name:
        `${race.name} — ${animal.name}`,

      profile:
        animal.profile,

      feature:
        animal.feature,

      mods: {
        ...(race.mods || {}),
        ...(animal.mods || {})
      },

      size:
        animal.size,

      height:
        animal.height,

      flight:
        Boolean(
          race.flight ||
          animal.flight
        ),

      movement: {
        ...(race.movement || {}),
        ...(animal.movement || {})
      }
    };
  }

  function getRaceModifier(
    attribute
  ) {
    const race =
      getEffectiveRace();

    return (
      Number(
        race?.mods?.[attribute]
      ) || 0
    );
  }

  /* =========================================================
     RAÇA — RENDERIZAÇÃO
     ========================================================= */

  function getRaceImage(
    race
  ) {
    if (!race) {
      return "";
    }

    return (
      state.gender ===
      "feminino"
        ? race.female
        : race.male
    ) || "";
  }

  function renderRace() {
    const race =
      RACES[
        state.raceIndex
      ];

    if (!race) {
      return;
    }

    const image =
      getRaceImage(
        race
      );

    const imageElement =
      $("#raceImage");

    if (imageElement) {
      if (image) {
        imageElement.src =
          image;

        imageElement.alt =
          race.name;

        imageElement.hidden =
          false;
      } else {
        imageElement.removeAttribute(
          "src"
        );

        imageElement.hidden =
          true;
      }
    }

    const nameElement =
      $("#raceName");

    if (nameElement) {
      nameElement.textContent =
        race.name;
    }

    const description =
      $("#raceShortDescription");

    if (description) {
      description.textContent =
        race.desc;
    }

    const genderLabel =
      $("#raceGenderLabel");

    if (genderLabel) {
      genderLabel.textContent =
        state.gender
          ? `${race.name} · ${
              state.gender ===
              "feminino"
                ? "Feminino"
                : "Masculino"
            }`
          : race.name;
    }

    const descriptionTitle =
      $("#raceDescriptionTitle");

    if (descriptionTitle) {
      descriptionTitle.textContent =
        race.name;
    }

    const descriptionText =
      $("#raceDescriptionText");

    if (descriptionText) {
      descriptionText.textContent =
        `${race.desc} Perfil natural: ${race.profile} ${race.feature}`;
    }

    const selectedText =
      $("#raceSelectedText");

    if (selectedText) {
      selectedText.textContent =
        state.race ===
        race.id
          ? "✓ Selecionada"
          : "Selecionar";
    }

    renderRaceDots();
    renderAnimalha();

    updateAppearance();
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
      (
        race,
        index
      ) => {
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

        button.dataset.raceIndex =
          String(index);

        button.setAttribute(
          "aria-label",
          race.name
        );

        container.appendChild(
          button
        );
      }
    );
  }

  function renderAnimalha() {
    const container =
      $(
        "[data-animalha-variants]"
      );

    if (!container) {
      return;
    }

    const active =
      state.race ===
      "animalha";

    container.hidden =
      !active;

    if (!active) {
      container.innerHTML =
        "";

      return;
    }

    container.innerHTML = `
      <div class="section-heading compact">
        <span class="eyebrow">
          ANIMALHA
        </span>

        <h3>
          Escolha sua linhagem
        </h3>

        <p>
          O animal escolhido altera o perfil natural,
          porte, limites físicos e movimentação.
        </p>
      </div>

      <div class="animalha-grid">

        ${ANIMALHA_VARIANTS.map(
          variant => `
            <button
              type="button"
              class="animalha-variant-card ${
                state.animalha ===
                variant.id
                  ? "selected"
                  : ""
              }"
              data-action="select-animalha"
              data-animalha="${escapeHtml(
                variant.id
              )}"
            >

              <strong>
                ${escapeHtml(
                  variant.name
                )}
              </strong>

              <small>
                ${escapeHtml(
                  variant.category
                )}
              </small>

              <span>
                ${escapeHtml(
                  variant.profile
                )}
              </span>

            </button>
          `
        ).join("")}

      </div>
    `;
  }

  function selectRace(
    raceId
  ) {
    const index =
      RACES.findIndex(
        race =>
          race.id ===
          raceId
      );

    if (index < 0) {
      return false;
    }

    state.raceIndex =
      index;

    state.race =
      raceId;

    if (
      raceId !==
      "animalha"
    ) {
      state.animalha =
        "";
    }

    resetDependentAppearance();

    update();

    save();

    toast(
      `${RACES[index].name} selecionada.`
    );

    return true;
  }

  function chooseCurrentRace() {
    const race =
      RACES[
        state.raceIndex
      ];

    if (!race) {
      return false;
    }

    return selectRace(
      race.id
    );
  }

  function changeRace(
    direction
  ) {
    state.raceIndex =
      (
        state.raceIndex +
        direction +
        RACES.length
      ) %
      RACES.length;

    renderRace();

    save();
  }

  function selectAnimalha(
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

    state.animalha =
      variant.id;

    resetDependentAppearance();

    update();

    save();

    toast(
      `Animalha: ${variant.name}`
    );

    return true;
  }

  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function resetDependentAppearance() {
    const race =
      getEffectiveRace();

    if (!race?.height) {
      state.height =
        null;

      return;
    }

    const [
      min,
      max
    ] =
      race.height;

    if (
      !Number.isFinite(
        Number(state.height)
      ) ||
      state.height <
        min ||
      state.height >
        max
    ) {
      state.height =
        Math.round(
          (
            min +
            max
          ) / 2
        );
    }
  }

  function setHeight(
    value
  ) {
    const race =
      getEffectiveRace();

    if (!race?.height) {
      return;
    }

    const [
      min,
      max
    ] =
      race.height;

    state.height =
      clamp(
        Math.round(
          Number(value) ||
          (
            min +
            max
          ) /
            2
        ),
        min,
        max
      );

    state.appearance.heightCm =
      state.height;

    updateAppearance();

    save();
  }

  function updateAppearance() {
    const race =
      getEffectiveRace();

    if (!race?.height) {
      return;
    }

    resetDependentAppearance();

    const [
      min,
      max
    ] =
      race.height;

    const range =
      $("#heightRange");

    if (range) {
      range.min =
        String(min);

      range.max =
        String(max);

      range.value =
        String(
          state.height
        );
    }

    const value =
      $("#appearanceHeightValue");

    if (value) {
      value.textContent =
        `${(
          state.height /
          100
        ).toFixed(2)} m`;
    }

    const limits =
      $("#appearanceHeightLimits");

    if (limits) {
      limits.textContent =
        `${(
          min /
          100
        ).toFixed(2)} m — ${(
          max /
          100
        ).toFixed(2)} m`;
    }

    const minLabel =
      $("#appearanceMinLabel");

    if (minLabel) {
      minLabel.textContent =
        `${min} cm`;
    }

    const maxLabel =
      $("#appearanceMaxLabel");

    if (maxLabel) {
      maxLabel.textContent =
        `${max} cm`;
    }

    const figure =
      $("#appearanceFigure");

    if (figure) {
      const normalized =
        (
          state.height -
          min
        ) /
        Math.max(
          1,
          max -
            min
        );

      figure.style.setProperty(
        "--character-scale",
        String(
          0.82 +
          normalized *
            0.42
        )
      );

      figure.classList.toggle(
        "appearance-figure--female",
        state.gender ===
          "feminino"
      );

      figure.classList.toggle(
        "appearance-figure--male",
        state.gender !==
          "feminino"
      );
    }

    const flight =
      $(
        "[data-flight-status]"
      );

    if (flight) {
      flight.textContent =
        race.flight
          ? "Voo disponível"
          : "Voo indisponível";

      flight.classList.toggle(
        "available",
        Boolean(
          race.flight
        )
      );
    }

    [
      "hair",
      "eyes",
      "skin",
      "clothing",
      "scars",
      "tattoos",
      "physicalNotes"
    ].forEach(
      key => {
        const field =
          $(`#${key}`);

        if (
          field &&
          document.activeElement !==
            field
        ) {
          field.value =
            state.appearance[
              key
            ] || "";
        }
      }
    );

    const animalhaSection =
      $(
        "[data-animalha-editor]"
      );

    if (
      animalhaSection
    ) {
      animalhaSection.hidden =
        state.race !==
        "animalha";
    }

    const animalhaSelect =
      $("#animalhaVariant");

    if (
      animalhaSelect
    ) {
      animalhaSelect.innerHTML = `
        <option value="">
          Escolha a linhagem
        </option>

        ${ANIMALHA_VARIANTS.map(
          variant => `
            <option
              value="${escapeHtml(
                variant.id
              )}"
              ${
                state.animalha ===
                variant.id
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(
                variant.name
              )} — ${escapeHtml(
                variant.category
              )}
            </option>
          `
        ).join("")}
      `;
    }
  }

  /* =========================================================
     CLASSE
     ========================================================= */

  function selectClass(
    classId
  ) {
    if (
      !CLASSES[classId]
    ) {
      return false;
    }

    state.class =
      classId;

    ensureSkills();

    update();

    save();

    toast(
      `${CLASSES[classId].name} selecionada.`
    );

    return true;
  }

  function renderClasses() {
    $$(".class-card")
      .forEach(
        card => {
          const id =
            card.dataset
              .class;

          const active =
            id ===
            state.class;

          card.classList.toggle(
            "selected",
            active
          );

          card.setAttribute(
            "aria-pressed",
            String(active)
          );

          const bonus =
            card.querySelector(
              "[data-class-bonus]"
            );

          if (
            bonus &&
            CLASSES[id]
          ) {
            bonus.textContent =
              Object.entries(
                CLASSES[id].skills
              )
                .map(
                  (
                    [
                      skillId,
                      value
                    ]
                  ) => {
                    const skill =
                      SKILLS.find(
                        item =>
                          item[0] ===
                          skillId
                      );

                    return skill
                      ? `${skill[1]} +${value}`
                      : "";
                  }
                )
                .filter(
                  Boolean
                )
                .join(" • ");
          }
        }
      );

    const selected =
      CLASSES[
        state.class
      ];

    const className =
      $(
        "[data-class-name]"
      );

    if (className) {
      className.textContent =
        selected?.name ||
        "—";
    }

    const classRole =
      $(
        "[data-class-role]"
      );

    if (classRole) {
      classRole.textContent =
        selected?.role ||
        "—";
    }
  }

  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function getAttributeData(
    attribute
  ) {
    const die =
      state.attributes[
        attribute
      ];

    const base =
      dieValue(
        die
      );

    const modifier =
      getRaceModifier(
        attribute
      );

    const result =
      state.rolls[
        attribute
      ];

    return {
      die,
      base,
      modifier,
      total:
        base +
        modifier,
      result
    };
  }

  function assignDie(
    attribute,
    die
  ) {
    if (
      !ATTRIBUTES.some(
        item =>
          item[0] ===
          attribute
      )
    ) {
      return false;
    }

    if (
      !DICE[die]
    ) {
      return false;
    }

    const current =
      state.attributes[
        attribute
      ];

    if (
      current ===
      die
    ) {
      state.attributes[
        attribute
      ] = null;

      delete state.rolls[
        attribute
      ];

      selectedDie =
        null;

      update();

      save();

      toast(
        `${die.toUpperCase()} devolvido.`
      );

      return true;
    }

    if (
      !isDieAvailable(
        die
      )
    ) {
      toast(
        `${die.toUpperCase()} já está em uso.`
      );

      return false;
    }

    /*
     * Se outro atributo já estiver com esse dado,
     * remove de lá antes de colocar aqui.
     */
    const other =
      ATTRIBUTES.find(
        item =>
          state.attributes[
            item[0]
          ] ===
          die
      );

    if (
      other &&
      other[0] !==
        attribute
    ) {
      state.attributes[
        other[0]
      ] = null;

      delete state.rolls[
        other[0]
      ];
    }

    state.attributes[
      attribute
    ] = die;

    delete state.rolls[
      attribute
    ];

    selectedDie =
      null;

    update();

    save();

    toast(
      `${die.toUpperCase()} colocado em ${getAttributeName(
        attribute
      )}.`
    );

    return true;
  }

  function returnDie(
    attribute
  ) {
    if (
      !ATTRIBUTES.some(
        item =>
          item[0] ===
          attribute
      )
    ) {
      return false;
    }

    const die =
      state.attributes[
        attribute
      ];

    state.attributes[
      attribute
    ] = null;

    delete state.rolls[
      attribute
    ];

    selectedDie =
      null;

    update();

    save();

    if (die) {
      toast(
        `${die.toUpperCase()} devolvido aos dados.`
      );
    }

    return true;
  }

  function swapAttributes(
    first,
    second
  ) {
    if (
      first ===
      second
    ) {
      return false;
    }

    if (
      !ATTRIBUTES.some(
        item =>
          item[0] ===
          first
      ) ||
      !ATTRIBUTES.some(
        item =>
          item[0] ===
          second
      )
    ) {
      return false;
    }

    const temp =
      state.attributes[
        first
      ];

    state.attributes[
      first
    ] =
      state.attributes[
        second
      ];

    state.attributes[
      second
    ] = temp;

    const rollTemp =
      state.rolls[
        first
      ];

    if (
      state.rolls[
        second
      ]
    ) {
      state.rolls[
        first
      ] =
        state.rolls[
          second
        ];
    } else {
      delete state.rolls[
        first
      ];
    }

    if (
      rollTemp
    ) {
      state.rolls[
        second
      ] =
        rollTemp;
    } else {
      delete state.rolls[
        second
      ];
    }

    selectedDie =
      null;

    update();

    save();

    return true;
  }

  function rollAttribute(
    attribute
  ) {
    const die =
      state.attributes[
        attribute
      ];

    if (
      !die ||
      !DICE[die]
    ) {
      toast(
        "Coloque um dado nesse atributo primeiro."
      );

      return null;
    }

    const result =
      rollSides(
        DICE[die].sides
      );

    const modifier =
      getRaceModifier(
        attribute
      );

    const total =
      result +
      modifier;

    state.rolls[
      attribute
    ] = {
      die,
      roll:
        result,
      modifier,
      total,
      rolledAt:
        Date.now()
    };

    update();

    save();

    toast(
      `${getAttributeName(
        attribute
      )}: ${total}`
    );

    return total;
  }

  function getAttributeName(
    attribute
  ) {
    return (
      ATTRIBUTES.find(
        item =>
          item[0] ===
          attribute
      )?.[1] ||
      attribute
    );
  }

  function renderDice() {
    const root =
      $("[data-dice-pool]");

    if (!root) {
      return;
    }

    const cards =
      [];

    Object.entries(
      DICE
    ).forEach(
      ([
        id,
        data
      ]) => {
        for (
          let i = 0;
          i < data.limit;
          i++
        ) {
          const assigned =
            countAssignedDie(
              id
            ) >=
            data.limit;

          cards.push(`
            <button
              type="button"
              class="dice-card ${
                assigned
                  ? "assigned"
                  : ""
              } ${
                selectedDie ===
                id
                  ? "dice-selected"
                  : ""
              }"
              data-die="${id}"
              draggable="${
                !assigned
              }"
              aria-disabled="${assigned}"
            >

              <svg
                class="dice-svg"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >

                <polygon
                  points="50,5 90,28 90,72 50,95 10,72 10,28"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="5"
                />

                <line
                  x1="50"
                  y1="15"
                  x2="50"
                  y2="85"
                  stroke="currentColor"
                  stroke-width="2"
                  opacity=".25"
                />

              </svg>

              <span class="dice-label">
                D${data.sides}
              </span>

            </button>
          `);
        }
      }
    );

    root.innerHTML =
      cards.join("");
  }

  function renderAttributeCards() {
    $$(".attribute-card")
      .forEach(
        card => {
          const attribute =
            card.dataset
              .attribute;

          if (
            !attribute
          ) {
            return;
          }

          const data =
            getAttributeData(
              attribute
            );

          card.classList.toggle(
            "has-die",
            Boolean(
              data.die
            )
          );

          card.classList.toggle(
            "has-result",
            Boolean(
              data.result
            )
          );

          const dieElement =
            card.querySelector(
              "[data-attribute-die]"
            );

          if (dieElement) {
            dieElement.innerHTML =
              data.die
                ? `
                  <svg
                    class="dice-svg"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >

                    <polygon
                      points="50,5 90,28 90,72 50,95 10,72 10,28"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="5"
                    />

                  </svg>

                  <span>
                    D${data.base}
                  </span>
                `
                : "Nenhum dado";
          }

          const value =
            card.querySelector(
              "[data-attribute-value]"
            );

          if (value) {
            value.textContent =
              data.die
                ? String(
                    data.total
                  )
                : "—";
          }

          const modifier =
            card.querySelector(
              "[data-attribute-modifier]"
            );

          if (modifier) {
            modifier.textContent =
              data.modifier > 0
                ? `+${data.modifier}`
                : data.modifier < 0
                  ? String(
                      data.modifier
                    )
                  : "0";
          }

          const result =
            card.querySelector(
              "[data-attribute-result]"
            );

          if (result) {
            result.textContent =
              data.result
                ? `${data.result.roll} ${
                    data.result
                      .modifier >=
                    0
                      ? "+"
                      : ""
                  }${
                    data.result.modifier
                  } = ${
                    data.result.total
                  }`
                : "";
          }

          const rollButton =
            card.querySelector(
              '[data-action="roll-attribute"]'
            );

          if (rollButton) {
            rollButton.disabled =
              !data.die;
          }
        }
      );
  }

  /* =========================================================
     GRÁFICO RADIAL
     ========================================================= */

  function renderRadar() {
    const root =
      $(
        "[data-attribute-radar]"
      );

    if (!root) {
      return;
    }

    const center =
      210;

    const radius =
      150;

    const count =
      ATTRIBUTES.length;

    const values =
      ATTRIBUTES.map(
        ([id]) => {
          const data =
            getAttributeData(
              id
            );

          return Math.max(
            0,
            data.total
          );
        }
      );

    const maximum =
      Math.max(
        1,
        ...values
      );

    function point(
      index,
      distance
    ) {
      const angle =
        (
          index *
          360 /
          count
        ) -
        90;

      const rad =
        angle *
        Math.PI /
        180;

      return [
        center +
          Math.cos(rad) *
          distance,

        center +
          Math.sin(rad) *
          distance
      ];
    }

    let grid =
      "";

    for (
      let level = 1;
      level <= 4;
      level++
    ) {
      const points =
        ATTRIBUTES.map(
          (
            _,
            index
          ) =>
            point(
              index,
              radius *
                level /
                4
            ).join(",")
        ).join(" ");

      grid += `
        <polygon
          points="${points}"
          fill="none"
          stroke="currentColor"
          opacity=".15"
        />
      `;
    }

    ATTRIBUTES.forEach(
      (
        _,
        index
      ) => {
        const [
          x,
          y
        ] =
          point(
            index,
            radius
          );

        grid += `
          <line
            x1="${center}"
            y1="${center}"
            x2="${x}"
            y2="${y}"
            stroke="currentColor"
            opacity=".12"
          />
        `;
      }
    );

    const valuePoints =
      values
        .map(
          (
            value,
            index
          ) =>
            point(
              index,
              radius *
                (
                  value /
                  maximum
                )
            ).join(",")
        )
        .join(" ");

    const labels =
      ATTRIBUTES.map(
        (
          [
            id,
            name
          ],
          index
        ) => {
          const [
            x,
            y
          ] =
            point(
              index,
              radius +
                28
            );

          return `
            <text
              x="${x}"
              y="${y}"
              class="radar-label"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              ${escapeHtml(
                name
              )}
            </text>
          `;
        }
      ).join("");

    root.innerHTML = `
      <svg
        class="radar-svg"
        viewBox="0 0 420 420"
        role="img"
        aria-label="Perfil dos atributos"
      >

        <g>
          ${grid}
        </g>

        <polygon
          class="radar-value"
          points="${valuePoints}"
        />

        ${labels}

      </svg>
    `;
  }

  function renderAttributes() {
    renderDice();
    renderAttributeCards();
    renderRadar();
  }

  /* =========================================================
     PODER
     ========================================================= */

  function rollPower() {
    const roll =
      rollSides(
        100
      );

    /*
     * 01–25 = Fogo
     * 26–50 = Ar
     * 51–75 = Terra
     * 76–100 = Água
     */

    const index =
      Math.min(
        3,
        Math.floor(
          (
            roll -
            1
          ) /
            25
        )
      );

    const power =
      PRIMARY_POWERS[
        index
      ];

    state.power =
      power;

    state.powerRoll =
      roll;

    state.powerType =
      "principal";

    update();

    save();

    toast(
      `D100: ${roll} → ${power}`
    );

    return {
      roll,
      power
    };
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

    state.powerRoll =
      null;

    state.powerType =
      "paralelo";

    update();

    save();

    toast(
      `${power} selecionado.`
    );

    return true;
  }

  function renderPower() {
    const current =
      $(
        "[data-power-current]"
      );

    if (current) {
      current.textContent =
        state.power ||
        "Nenhum poder escolhido";
    }

    const result =
      $(
        "[data-power-result]"
      );

    if (result) {
      result.textContent =
        state.powerRoll ??
        "—";
    }

    const note =
      $(
        "[data-power-result-note]"
      );

    if (note) {
      note.textContent =
        state.powerRoll
          ? `D100 ${state.powerRoll} → ${state.power}`
          : "O D100 define apenas os quatro poderes principais.";
    }
  }

  function setPowerMode(
    mode
  ) {
    const rollSection =
      $(
        '[data-power-section="roll"]'
      );

    const manualSection =
      $(
        '[data-power-section="manual"]'
      );

    if (rollSection) {
      rollSection.hidden =
        mode !==
        "roll";
    }

    if (manualSection) {
      manualSection.hidden =
        mode !==
        "manual";
    }
  }

  /* =========================================================
     MANA
     ========================================================= */

  function selectMana(
    mana
  ) {
    /*
     * Fora da campanha só Azul existe.
     * As outras são liberadas pelo Mestre
     * no contexto da campanha.
     */
    if (
      slug(mana) !==
      "azul"
    ) {
      toast(
        "Esta Mana está bloqueada. O Mestre pode liberá-la dentro da campanha."
      );

      return false;
    }

    state.mana =
      "azul";

    update();

    save();

    return true;
  }

  function renderMana() {
    $$(".mana-card")
      .forEach(
        card => {
          const id =
            slug(
              card.dataset
                .mana
            );

          const available =
            id ===
            "azul";

          card.classList.toggle(
            "selected",
            available
          );

          card.classList.toggle(
            "locked",
            !available
          );

          card.setAttribute(
            "aria-disabled",
            String(
              !available
            )
          );

          if (
            !available
          ) {
            card.disabled =
              true;
          }
        }
      );
  }

  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function ensureSkills() {
    if (
      !state.skills ||
      Array.isArray(
        state.skills
      )
    ) {
      state.skills =
        {};
    }

    SKILLS.forEach(
      ([
        id
      ]) => {
        if (
          !state.skills[id] ||
          typeof state.skills[id] !==
            "object"
        ) {
          state.skills[id] = {
            trained: false,
            bonus: 0
          };
        }

        state.skills[id].trained =
          Boolean(
            state.skills[id]
              .trained
          );

        state.skills[id].bonus =
          Number(
            state.skills[id]
              .bonus
          ) || 0;
      }
    );
  }

  function toggleSkill(
    skillId
  ) {
    ensureSkills();

    if (
      !state.skills[
        skillId
      ]
    ) {
      return false;
    }

    state.skills[
      skillId
    ].trained =
      !state.skills[
        skillId
      ].trained;

    renderSkills();

    save();

    return true;
  }

  function setSkillBonus(
    skillId,
    value
  ) {
    ensureSkills();

    if (
      !state.skills[
        skillId
      ]
    ) {
      return false;
    }

    state.skills[
      skillId
    ].bonus =
      clamp(
        Number(
          value
        ) || 0,
        -20,
        20
      );

    renderSkills();

    save();

    return true;
  }

  function getEffectiveSkillBonus(
    skillId
  ) {
    ensureSkills();

    const skill =
      state.skills[
        skillId
      ];

    if (!skill) {
      return 0;
    }

    const classBonus =
      Number(
        CLASSES[
          state.class
        ]?.skills?.[
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

  function renderSkills() {
    ensureSkills();

    const root =
      $("#skillsList");

    if (!root) {
      return;
    }

    root.innerHTML =
      SKILLS.map(
        ([
          id,
          name,
          description
        ]) => {
          const skill =
            state.skills[
              id
            ];

          const classBonus =
            Number(
              CLASSES[
                state.class
              ]?.skills?.[
                id
              ]
            ) || 0;

          const total =
            getEffectiveSkillBonus(
              id
            );

          return `
            <article
              class="skill-card ${
                skill.trained
                  ? "trained"
                  : ""
              }"
              data-skill="${escapeHtml(
                id
              )}"
            >

              <div class="skill-card-main">

                <div>

                  <span class="eyebrow">
                    PERÍCIA
                  </span>

                  <h3>
                    ${escapeHtml(
                      name
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      description
                    )}
                  </p>

                </div>

                <div class="skill-bonus-box">

                  <span>
                    Bônus
                  </span>

                  <strong data-skill-value>
                    ${
                      total >= 0
                        ? `+${total}`
                        : total
                    }
                  </strong>

                  ${
                    classBonus
                      ? `<small data-class-skill-bonus>Classe +${classBonus}</small>`
                      : `<small data-class-skill-bonus></small>`
                  }

                </div>

              </div>

              <div
                class="skill-actions"
              >

                <button
                  type="button"
                  class="button button-secondary"
                  data-action="train-skill"
                  data-skill="${escapeHtml(
                    id
                  )}"
                >
                  ${
                    skill.trained
                      ? "✓ Treinado"
                      : "Treinar"
                  }
                </button>

                <input
                  class="skill-bonus-input"
                  type="number"
                  min="-20"
                  max="20"
                  value="${skill.bonus}"
                  data-skill-bonus="${escapeHtml(
                    id
                  )}"
                  aria-label="Bônus de ${escapeHtml(
                    name
                  )}"
                >

              </div>

            </article>
          `;
        }
      ).join("");
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
      damage: "",
      cost: "",
      test: "",
      limitation: ""
    };
  }

  function addTechnique() {
    state.techniques.push(
      createTechnique()
    );

    renderTechniques();

    save();

    toast(
      "Nova técnica adicionada."
    );
  }

  function updateTechnique(
    id,
    field,
    value
  ) {
    const technique =
      state.techniques.find(
        item =>
          item.id ===
          id
      );

    if (!technique) {
      return false;
    }

    const allowed = [
      "name",
      "description",
      "range",
      "damage",
      "cost",
      "test",
      "limitation"
    ];

    if (
      !allowed.includes(
        field
      )
    ) {
      return false;
    }

    technique[field] =
      value;

    save();

    return true;
  }

  function removeTechnique(
    id
  ) {
    state.techniques =
      state.techniques.filter(
        item =>
          item.id !==
          id
      );

    renderTechniques();

    save();

    toast(
      "Técnica removida."
    );
  }

  function renderTechniques() {
    const root =
      $(
        "[data-techniques-list]"
      );

    if (!root) {
      return;
    }

    if (
      !state.techniques.length
    ) {
      root.innerHTML = `
        <div class="empty-state">
          <span>
            Nenhuma técnica adicionada.
          </span>

          <small>
            Crie sua primeira técnica personalizada.
          </small>
        </div>
      `;

      return;
    }

    root.innerHTML =
      state.techniques
        .map(
          technique => `
            <article
              class="technique-card"
              data-technique-id="${escapeHtml(
                technique.id
              )}"
            >

              <div class="technique-card-header">

                <input
                  type="text"
                  value="${escapeHtml(
                    technique.name
                  )}"
                  placeholder="Nome da técnica"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  data-technique-field="name"
                >

                <button
                  type="button"
                  class="icon-button"
                  data-action="remove-technique"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  aria-label="Remover técnica"
                >
                  ×
                </button>

              </div>

              <textarea
                placeholder="Descrição da técnica"
                data-technique-id="${escapeHtml(
                  technique.id
                )}"
                data-technique-field="description"
              >${escapeHtml(
                technique.description
              )}</textarea>

              <div class="technique-fields">

                <input
                  type="text"
                  value="${escapeHtml(
                    technique.range
                  )}"
                  placeholder="Alcance"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  data-technique-field="range"
                >

                <input
                  type="text"
                  value="${escapeHtml(
                    technique.damage
                  )}"
                  placeholder="Dano / efeito"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  data-technique-field="damage"
                >

              </div>

              <div class="technique-extra-fields">

                <input
                  type="text"
                  value="${escapeHtml(
                    technique.cost
                  )}"
                  placeholder="Custo"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  data-technique-field="cost"
                >

                <input
                  type="text"
                  value="${escapeHtml(
                    technique.test
                  )}"
                  placeholder="Teste"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  data-technique-field="test"
                >

                <textarea
                  rows="2"
                  placeholder="Limitação"
                  data-technique-id="${escapeHtml(
                    technique.id
                  )}"
                  data-technique-field="limitation"
                >${escapeHtml(
                  technique.limitation
                )}</textarea>

              </div>

            </article>
          `
        )
        .join("");
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

  function addInventory() {
    state.inventory.push(
      createInventoryItem()
    );

    renderInventory();

    save();

    toast(
      "Novo item adicionado."
    );
  }

  function removeInventory(
    id
  ) {
    state.inventory =
      state.inventory.filter(
        item =>
          item.id !==
          id
      );

    renderInventory();

    save();

    toast(
      "Item removido."
    );
  }

  function updateInventory(
    id,
    field,
    value
  ) {
    const item =
      state.inventory.find(
        entry =>
          entry.id ===
          id
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
    } else {
      item[field] =
        value;
    }

    save();

    return true;
  }

  function renderInventory() {
    const root =
      $(
        "[data-inventory-list]"
      );

    if (!root) {
      return;
    }

    if (
      !state.inventory.length
    ) {
      root.innerHTML = `
        <div class="empty-state">
          <span>
            Inventário vazio.
          </span>

          <small>
            Adicione equipamentos ou objetos iniciais.
          </small>
        </div>
      `;

      return;
    }

    root.innerHTML =
      state.inventory
        .map(
          item => `
            <article
              class="inventory-item"
              data-inventory-id="${escapeHtml(
                item.id
              )}"
            >

              <input
                type="text"
                value="${escapeHtml(
                  item.name
                )}"
                placeholder="Nome do item"
                data-inventory-id="${escapeHtml(
                  item.id
                )}"
                data-inventory-field="name"
              >

              <input
                type="number"
                min="0"
                value="${Number(
                  item.quantity
                ) || 0}"
                data-inventory-id="${escapeHtml(
                  item.id
                )}"
                data-inventory-field="quantity"
              >

              <input
                type="text"
                value="${escapeHtml(
                  item.description
                )}"
                placeholder="Descrição"
                data-inventory-id="${escapeHtml(
                  item.id
                )}"
                data-inventory-field="description"
              >

              <button
                type="button"
                class="icon-button"
                data-action="remove-inventory"
                data-inventory-id="${escapeHtml(
                  item.id
                )}"
                aria-label="Remover item"
              >
                ×
              </button>

            </article>
          `
        )
        .join("");
  }

  /* =========================================================
     COMBATE
     ========================================================= */

  function calculateHP() {
    const race =
      getEffectiveRace();

    if (!race) {
      return null;
    }

    const size =
      SIZE_RULES[
        race.size
      ] ||
      SIZE_RULES.medio;

    const vigor =
      getAttributeData(
        "vigor"
      ).total;

    if (
      !state.attributes.vigor
    ) {
      return null;
    }

    return (
      10 +
      vigor +
      size.hpBonus
    );
  }

  function calculateMovement() {
    const race =
      getEffectiveRace();

    if (!race) {
      return {
        ground: null,
        air: null,
        aquatic: null,
        canFly: false
      };
    }

    const size =
      SIZE_RULES[
        race.size
      ] ||
      SIZE_RULES.medio;

    let ground =
      9 *
      size.movement;

    if (
      race.movement
        ?.groundMultiplier
    ) {
      ground *=
        Number(
          race.movement
            .groundMultiplier
        ) || 1;
    }

    let air =
      null;

    let aquatic =
      null;

    /*
     * Voo é INDEPENDENTE de Animalha.
     */
    if (
      race.flight
    ) {
      const multiplier =
        Number(
          race.movement
            ?.airMultiplier
        ) || 2;

      air =
        9 *
        multiplier;
    }

    if (
      race.movement
        ?.aquaticMultiplier
    ) {
      aquatic =
        9 *
        Number(
          race.movement
            .aquaticMultiplier
        );
    }

    return {
      ground,
      air,
      aquatic,
      canFly:
        Boolean(
          race.flight
        )
    };
  }

  function renderCombat() {
    const hp =
      calculateHP();

    const movement =
      calculateMovement();

    const hpElement =
      $(
        "[data-combat-hp]"
      );

    if (hpElement) {
      hpElement.textContent =
        hp === null
          ? "—"
          : String(
              hp
            );
    }

    const ground =
      $(
        "[data-combat-movement]"
      );

    if (ground) {
      ground.textContent =
        movement.ground ===
        null
          ? "—"
          : `${movement.ground} m`;
    }

    const air =
      $(
        "[data-combat-air]"
      );

    if (air) {
      air.textContent =
        movement.air ===
        null
          ? "—"
          : `${movement.air} m`;
    }

    const aquatic =
      $(
        "[data-combat-aquatic]"
      );

    if (aquatic) {
      aquatic.textContent =
        movement.aquatic ===
        null
          ? "—"
          : `${movement.aquatic} m`;
    }

    const flight =
      $(
        "[data-combat-flight]"
      );

    if (flight) {
      flight.textContent =
        movement.canFly
          ? "Sim"
          : "Não";
    }
  }

  /* =========================================================
     REVISÃO
     ========================================================= */

  function renderReview() {
    const race =
      getEffectiveRace();

    const selectedClass =
      CLASSES[
        state.class
      ];

    const values = {
      name:
        state.name ||
        "Sem nome",

      gender:
        state.gender ===
        "masculino"
          ? "Masculino"
          : state.gender ===
              "feminino"
            ? "Feminino"
            : "—",

      race:
        race?.name ||
        "—",

      class:
        selectedClass?.name ||
        "—",

      height:
        state.height
          ? `${(
              state.height /
              100
            ).toFixed(2)} m`
          : "—",

      power:
        state.power ||
        "—",

      mana:
        "Mana Azul"
    };

    Object.entries(
      values
    ).forEach(
      ([
        key,
        value
      ]) => {
        $$(
          `[data-review="${key}"]`
        ).forEach(
          element => {
            element.textContent =
              value;
          }
        );
      }
    );

    $$(
      '[data-review="description"]'
    ).forEach(
      element => {
        element.textContent =
          state.description ||
          "Nenhuma descrição.";
      }
    );

    $$(
      '[data-review="appearance"]'
    ).forEach(
      element => {
        const lines =
          [];

        if (
          state.appearance
            .hair
        ) {
          lines.push(
            `Cabelo: ${state.appearance.hair}`
          );
        }

        if (
          state.appearance
            .eyes
        ) {
          lines.push(
            `Olhos: ${state.appearance.eyes}`
          );
        }

        if (
          state.appearance
            .skin
        ) {
          lines.push(
            `Pele: ${state.appearance.skin}`
          );
        }

        if (
          state.appearance
            .clothing
        ) {
          lines.push(
            `Vestimenta: ${state.appearance.clothing}`
          );
        }

        if (
          state.appearance
            .scars
        ) {
          lines.push(
            `Cicatrizes: ${state.appearance.scars}`
          );
        }

        if (
          state.appearance
            .tattoos
        ) {
          lines.push(
            `Tatuagens: ${state.appearance.tattoos}`
          );
        }

        if (
          state.appearance
            .physicalNotes
        ) {
          lines.push(
            state.appearance
              .physicalNotes
          );
        }

        element.textContent =
          lines.length
            ? lines.join(
                " • "
              )
            : "Nenhuma informação.";
      }
    );

    const attributeRoot =
      $(
        "[data-review-attributes]"
      );

    if (
      attributeRoot
    ) {
      attributeRoot.innerHTML =
        ATTRIBUTES.map(
          ([
            id,
            name
          ]) => {
            const data =
              getAttributeData(
                id
              );

            return `
              <div class="review-attribute">

                <span>
                  ${escapeHtml(
                    name
                  )}
                </span>

                <strong>
                  ${
                    data.die
                      ? data.die.toUpperCase()
                      : "—"
                  }
                </strong>

                <small>
                  ${
                    data.modifier > 0
                      ? `+${data.modifier}`
                      : data.modifier < 0
                        ? data.modifier
                        : ""
                  }
                </small>

              </div>
            `;
          }
        ).join("");
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
        state.avatar
      ) {
        reviewAvatar.src =
          state.avatar;

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
  }

  /* =========================================================
     AVATAR
     ========================================================= */

  function readAvatar(
    file
  ) {
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      toast(
        "Selecione uma imagem válida."
      );

      return;
    }

    if (
      file.size >
      CONFIG.maxImageSize
    ) {
      toast(
        "A imagem deve ter no máximo 6 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      event => {
        state.avatar =
          String(
            event.target.result
          );

        state.avatarName =
          file.name;

        updateAvatar();

        save();

        toast(
          "Imagem adicionada."
        );
      };

    reader.onerror =
      () => {
        toast(
          "Não foi possível carregar a imagem."
        );
      };

    reader.readAsDataURL(
      file
    );
  }

  function updateAvatar() {
    const image =
      $("#avatarImage");

    const placeholder =
      $("#avatarPlaceholder");

    const remove =
      $("#removeAvatarButton");

    if (
      image
    ) {
      if (
        state.avatar
      ) {
        image.src =
          state.avatar;

        image.hidden =
          false;
      } else {
        image.removeAttribute(
          "src"
        );

        image.hidden =
          true;
      }
    }

    if (
      placeholder
    ) {
      placeholder.hidden =
        Boolean(
          state.avatar
        );
    }

    if (
      remove
    ) {
      remove.disabled =
        !Boolean(
          state.avatar
        );
    }

    $$(
      "[data-character-avatar]"
    ).forEach(
      element => {
        if (
          state.avatar
        ) {
          element.src =
            state.avatar;

          element.hidden =
            false;
        } else {
          element.removeAttribute(
            "src"
          );

          element.hidden =
            true;
        }
      }
    );
  }

  function removeAvatar() {
    state.avatar =
      "";

    state.avatarName =
      "";

    const input =
      $("#avatarInput");

    if (input) {
      input.value =
        "";
    }

    updateAvatar();

    save();

    toast(
      "Imagem removida."
    );
  }

  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function renderIdentity() {
    const name =
      $("#characterName");

    if (name) {
      name.value =
        state.name;
    }

    const age =
      $("#characterAge");

    if (age) {
      age.value =
        state.age;
    }

    const description =
      $("#characterDescription");

    if (description) {
      description.value =
        state.description;
    }

    const origin =
      $("#characterOrigin");

    if (origin) {
      origin.value =
        state.origin;
    }

    $$(
      'input[name="gender"]'
    ).forEach(
      radio => {
        radio.checked =
          radio.value ===
          state.gender;
      }
    );
  }

  /* =========================================================
     ATRIBUTOS — DRAG & DROP
     ========================================================= */

  function handleDragStart(
    event
  ) {
    const element =
      event.target.closest(
        "[data-die]"
      );

    if (!element) {
      return;
    }

    const die =
      element.dataset.die;

    if (
      !isDieAvailable(
        die
      )
    ) {
      event.preventDefault();

      return;
    }

    selectedDie =
      die;

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      die
    );

    element.classList.add(
      "dragging"
    );
  }

  function handleDragEnd(
    event
  ) {
    const element =
      event.target.closest(
        "[data-die]"
      );

    if (element) {
      element.classList.remove(
        "dragging"
      );
    }

    selectedDie =
      null;

    $$(".drag-over")
      .forEach(
        target =>
          target.classList.remove(
            "drag-over"
          )
      );
  }

  function handleDragOver(
    event
  ) {
    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (!target) {
      return;
    }

    event.preventDefault();

    target.classList.add(
      "drag-over"
    );
  }

  function handleDragLeave(
    event
  ) {
    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (!target) {
      return;
    }

    target.classList.remove(
      "drag-over"
    );
  }

  function handleDrop(
    event
  ) {
    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (!target) {
      return;
    }

    event.preventDefault();

    target.classList.remove(
      "drag-over"
    );

    const attribute =
      target.dataset
        .attributeDrop;

    const die =
      event.dataTransfer.getData(
        "text/plain"
      ) ||
      selectedDie;

    if (
      !die
    ) {
      return;
    }

    assignDie(
      attribute,
      die
    );

    selectedDie =
      null;
  }

  /* =========================================================
     EVENTOS
     ========================================================= */

  function handleClick(
    event
  ) {
    /*
     * Clique em um dado.
     */
    const dice =
      event.target.closest(
        "[data-die]"
      );

    if (
      dice
    ) {
      const die =
        dice.dataset.die;

      if (
        !isDieAvailable(
          die
        )
      ) {
        toast(
          `${die.toUpperCase()} já está em uso.`
        );

        return;
      }

      selectedDie =
        die;

      $$(".dice-selected")
        .forEach(
          element =>
            element.classList.remove(
              "dice-selected"
            )
        );

      dice.classList.add(
        "dice-selected"
      );

      toast(
        `${die.toUpperCase()} selecionado.`
      );

      return;
    }

    /*
     * Clique em atributo com dado selecionado.
     */
    const attribute =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (
      attribute &&
      selectedDie
    ) {
      assignDie(
        attribute.dataset
          .attributeDrop,
        selectedDie
      );

      return;
    }

    /*
     * Ações gerais.
     */
    const action =
      event.target.closest(
        "[data-action]"
      );

    if (!action) {
      return;
    }

    const type =
      action.dataset.action;

    switch (
      type
    ) {
      case "next":
        nextStep();
        break;

      case "previous":
        previousStep();
        break;

      case "go-step":
        goToStep(
          Number(
            action.dataset.step
          )
        );
        break;

      case "race-previous":
        changeRace(
          -1
        );
        break;

      case "race-next":
        changeRace(
          1
        );
        break;

      case "select-race-current":
        chooseCurrentRace();
        break;

      case "go-race-index":
        state.raceIndex =
          Number(
            action.dataset
              .raceIndex
          );

        renderRace();

        save();
        break;

      case "select-race":
        selectRace(
          action.dataset
            .race
        );
        break;

      case "select-animalha":
        selectAnimalha(
          action.dataset
            .animalha
        );
        break;

      case "select-class":
        selectClass(
          action.dataset
            .class
        );
        break;

      case "power-mode":
        setPowerMode(
          action.dataset
            .powerMode
        );
        break;

      case "roll-power":
        rollPower();
        break;

      case "select-parallel-power":
        selectParallelPower(
          action.dataset
            .power
        );
        break;

      case "select-mana":
        selectMana(
          action.dataset
            .mana
        );
        break;

      case "roll-attribute":
        rollAttribute(
          action.dataset
            .attribute
        );
        break;

      case "train-skill":
        toggleSkill(
          action.dataset
            .skill
        );
        break;

      case "add-technique":
        addTechnique();
        break;

      case "remove-technique":
        removeTechnique(
          action.dataset
            .techniqueId
        );
        break;

      case "add-inventory":
        addInventory();
        break;

      case "remove-inventory":
        removeInventory(
          action.dataset
            .inventoryId
        );
        break;

      case "remove-avatar":
        removeAvatar();
        break;

      case "new-draft":
        resetCharacter();
        break;

      case "finish":
        finishCharacter();
        break;

      case "return-die":
        returnDie(
          action.dataset
            .attribute
        );
        break;

      case "remove-die":
        returnDie(
          action.dataset
            .attribute
        );
        break;

      default:
        break;
    }
  }

  function handleInput(
    event
  ) {
    const element =
      event.target;

    if (!element) {
      return;
    }

    /*
     * Identidade.
     */
    switch (
      element.id
    ) {
      case "characterName":
        state.name =
          element.value;

        break;

      case "characterAge":
        state.age =
          element.value;

        break;

      case "characterDescription":
        state.description =
          element.value;

        break;

      case "characterOrigin":
        state.origin =
          element.value;

        break;

      /*
       * Aparência.
       */
      case "hair":
      case "eyes":
      case "skin":
      case "clothing":
      case "scars":
      case "tattoos":
      case "physicalNotes":
        state.appearance[
          element.id
        ] =
          element.value;

        break;

      /*
       * Altura.
       */
      case "heightRange":
        setHeight(
          element.value
        );

        return;

      default:
        break;
    }

    /*
     * Bônus manual de perícia.
     */
    if (
      element.matches(
        "[data-skill-bonus]"
      )
    ) {
      setSkillBonus(
        element.dataset
          .skillBonus,
        element.value
      );

      return;
    }

    /*
     * Técnica.
     */
    if (
      element.matches(
        "[data-technique-id][data-technique-field]"
      )
    ) {
      updateTechnique(
        element.dataset
          .techniqueId,
        element.dataset
          .techniqueField,
        element.value
      );

      return;
    }

    /*
     * Inventário.
     */
    if (
      element.matches(
        "[data-inventory-id][data-inventory-field]"
      )
    ) {
      updateInventory(
        element.dataset
          .inventoryId,
        element.dataset
          .inventoryField,
        element.value
      );

      return;
    }

    updateSaveOnly();
  }

  function handleChange(
    event
  ) {
    const element =
      event.target;

    if (!element) {
      return;
    }

    if (
      element.id ===
      "avatarInput"
    ) {
      readAvatar(
        element.files?.[0]
      );

      return;
    }

    if (
      element.name ===
      "gender"
    ) {
      state.gender =
        element.value;

      renderRace();
      updateAppearance();

      save();

      return;
    }

    if (
      element.id ===
      "animalhaVariant"
    ) {
      selectAnimalha(
        element.value
      );

      return;
    }

    if (
      element.matches(
        "[data-race-select]"
      )
    ) {
      selectRace(
        element.value
      );

      return;
    }

    if (
      element.matches(
        "[data-class-select]"
      )
    ) {
      selectClass(
        element.value
      );

      return;
    }
  }

  function updateSaveOnly() {
    state.updatedAt =
      new Date().toISOString();

    save();
  }

  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function isStepComplete(
    index
  ) {
    switch (
      index
    ) {
      case 0:
        return Boolean(
          state.name.trim()
        ) &&
          Boolean(
            state.gender
          );

      case 1:
        return Boolean(
          state.race
        );

      case 2:
        return Boolean(
          state.race &&
          state.height
        );

      case 3:
        return Boolean(
          state.class
        );

      case 4:
        return ATTRIBUTES.every(
          ([
            id
          ]) =>
            Boolean(
              state.attributes[
                id
              ]
            )
        );

      case 5:
        return Boolean(
          state.power
        );

      case 6:
        return (
          state.mana ===
          "azul"
        );

      case 7:
        return true;

      case 8:
        return true;

      case 9:
        return true;

      case 10:
        return (
          isStepComplete(
            0
          ) &&
          isStepComplete(
            1
          ) &&
          isStepComplete(
            2
          ) &&
          isStepComplete(
            3
          ) &&
          isStepComplete(
            4
          ) &&
          isStepComplete(
            5
          ) &&
          isStepComplete(
            6
          )
        );

      default:
        return false;
    }
  }

  function canEnterStep(
    index
  ) {
    if (
      index <=
      0
    ) {
      return true;
    }

    return isStepComplete(
      index - 1
    );
  }

  function goToStep(
    index
  ) {
    index =
      Number(
        index
      );

    if (
      !Number.isInteger(
        index
      )
    ) {
      return false;
    }

    if (
      index <
      0 ||
      index >=
        STEPS.length
    ) {
      return false;
    }

    if (
      !canEnterStep(
        index
      )
    ) {
      toast(
        `Complete "${STEPS[index - 1]?.[1] || "a etapa anterior"}" primeiro.`
      );

      return false;
    }

    state.step =
      index;

    update();

    save();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    return true;
  }

  function nextStep() {
    const current =
      state.step;

    if (
      !isStepComplete(
        current
      )
    ) {
      toast(
        `Complete "${STEPS[current][1]}" para continuar.`
      );

      return false;
    }

    if (
      current >=
      STEPS.length -
        1
    ) {
      return finishCharacter();
    }

    return goToStep(
      current + 1
    );
  }

  function previousStep() {
    return goToStep(
      state.step - 1
    );
  }

  /* =========================================================
     PROGRESSO
     ========================================================= */

  function calculateProgress() {
    const completed =
      STEPS.filter(
        (
          _,
          index
        ) =>
          isStepComplete(
            index
          )
      ).length;

    return Math.round(
      completed /
        STEPS.length *
        100
    );
  }

  function renderProgress() {
    const progress =
      calculateProgress();

    const bar =
      $("#progressBar");

    if (bar) {
      bar.style.width =
        `${progress}%`;

      bar.setAttribute(
        "aria-valuenow",
        String(
          progress
        )
      );
    }

    const percentage =
      $("#progressPercent");

    if (percentage) {
      percentage.textContent =
        `${progress}%`;
    }

    const title =
      $("#progressTitle");

    if (title) {
      title.textContent =
        STEPS[
          state.step
        ][1];
    }

    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {
          const active =
            index ===
            state.step;

          const complete =
            isStepComplete(
              index
            );

          button.classList.toggle(
            "is-active",
            active
          );

          button.classList.toggle(
            "is-complete",
            complete
          );

          button.disabled =
            !canEnterStep(
              index
            );
        }
      );
  }

  /* =========================================================
     PAINEL ATUAL
     ========================================================= */

  function renderCurrentPanel() {
    const currentId =
      STEPS[
        state.step
      ][0];

    $$(".creation-panel")
      .forEach(
        panel => {
          const active =
            panel.dataset
              .panel ===
            currentId;

          panel.hidden =
            !active;

          panel.classList.toggle(
            "is-active",
            active
          );
        }
      );
  }

  /* =========================================================
     RESET
     ========================================================= */

  function resetCharacter() {
    const confirmed =
      window.confirm(
        "Deseja realmente começar uma nova ficha? O rascunho atual será apagado."
      );

    if (!confirmed) {
      return;
    }

    clearDraft();

    state =
      createDefaultState();

    selectedDie =
      null;

    state.step =
      0;

    ensureSkills();

    update();

    forceSave();

    toast(
      "Nova ficha criada."
    );
  }

  /* =========================================================
     FINALIZAÇÃO
     ========================================================= */

  function validateFinal() {
    for (
      let index = 0;
      index <
      7;
      index++
    ) {
      if (
        !isStepComplete(
          index
        )
      ) {
        state.step =
          index;

        update();

        toast(
          `Complete "${STEPS[index][1]}" antes de finalizar.`
        );

        return false;
      }
    }

    return true;
  }

  function buildCharacterData() {
    const race =
      getEffectiveRace();

    return {
      ...JSON.parse(
        JSON.stringify(
          state
        )
      ),

      raceData:
        race
          ? {
              name:
                race.name,

              profile:
                race.profile,

              feature:
                race.feature,

              modifiers:
                {
                  ...(
                    race.mods ||
                    {}
                  )
                },

              size:
                race.size,

              height:
                [
                  ...(
                    race.height ||
                    []
                  )
                ],

              flight:
                Boolean(
                  race.flight
                ),

              movement:
                calculateMovement()
            }
          : null,

      combat: {
        hp:
          calculateHP(),

        movement:
          calculateMovement()
      },

      skillsEffective:
        SKILLS.reduce(
          (
            result,
            [
              id
            ]
          ) => {
            result[id] =
              getEffectiveSkillBonus(
                id
              );

            return result;
          },
          {}
        ),

      modifiedAttributes:
        ATTRIBUTES.reduce(
          (
            result,
            [
              id
            ]
          ) => {
            result[id] =
              getAttributeData(
                id
              ).total;

            return result;
          },
          {}
        ),

      version:
        8
    };
  }

  function finishCharacter() {
    if (
      !validateFinal()
    ) {
      return false;
    }

    const character =
      buildCharacterData();

    if (
      !forceSave()
    ) {
      return false;
    }

    try {
      localStorage.setItem(
        CONFIG.lastCharacterKey,
        JSON.stringify(
          character
        )
      );
    } catch (
      error
    ) {
      console.warn(
        "[AERION] Não foi possível salvar a última ficha:",
        error
      );
    }

    window.dispatchEvent(
      new CustomEvent(
        "aerion:ficha:complete",
        {
          detail:
            character
        }
      )
    );

    window.AERION_LAST_CHARACTER =
      character;

    toast(
      "Ficha concluída com sucesso!",
      3200
    );

    return true;
  }

  /* =========================================================
     RENDER GERAL
     ========================================================= */

  function update() {
    ensureSkills();

    renderIdentity();
    updateAvatar();

    renderRace();
    updateAppearance();

    renderClasses();

    renderAttributes();

    renderPower();
    renderMana();

    renderSkills();

    renderTechniques();

    renderInventory();

    renderCombat();

    renderReview();

    renderCurrentPanel();
    renderProgress();

    updateNavigation();
  }

  function updateNavigation() {
    const previousButtons =
      $$(
        '[data-action="previous"]'
      );

    previousButtons.forEach(
      button => {
        button.disabled =
          state.step <=
          0;
      }
    );

    const nextButtons =
      $$(
        '[data-action="next"]'
      );

    nextButtons.forEach(
      button => {
        button.textContent =
          state.step >=
          STEPS.length - 1
            ? "Finalizar"
            : "Próximo →";
      }
    );
  }

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init() {
    const loaded =
      loadDraft();

    if (!loaded) {
      state =
        createDefaultState();
    }

    ensureSkills();

    /*
     * Mantém a raça indexada corretamente
     * caso o rascunho tenha vindo de uma versão anterior.
     */
    if (
      state.race
    ) {
      const index =
        RACES.findIndex(
          race =>
            race.id ===
            state.race
        );

      if (
        index >=
        0
      ) {
        state.raceIndex =
          index;
      }
    }

    resetDependentAppearance();

    /*
     * Eventos globais.
     */
    document.addEventListener(
      "click",
      handleClick
    );

    document.addEventListener(
      "input",
      handleInput
    );

    document.addEventListener(
      "change",
      handleChange
    );

    document.addEventListener(
      "dragstart",
      handleDragStart
    );

    document.addEventListener(
      "dragend",
      handleDragEnd
    );

    document.addEventListener(
      "dragover",
      handleDragOver
    );

    document.addEventListener(
      "dragleave",
      handleDragLeave
    );

    document.addEventListener(
      "drop",
      handleDrop
    );

    /*
     * Gênero.
     */
    $(
      'input[name="gender"]'
    );

    /*
     * Salvamento quando a página
     * fica em segundo plano.
     */
    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          forceSave();
        }
      }
    );

    window.addEventListener(
      "beforeunload",
      () => {
        forceSave();
      }
    );

    /*
     * Primeiro render.
     */
    update();

    /*
     * A tela de Poder começa no modo
     * de rolagem.
     */
    setPowerMode(
      "roll"
    );

    updateSaveStatus(
      loaded
        ? "Rascunho recuperado"
        : "Salvo automaticamente"
    );

    /*
     * API pública.
     */
    window.AERIONFicha =
      Object.freeze({
        getState:
          () =>
            JSON.parse(
              JSON.stringify(
                state
              )
            ),

        getCharacter:
          buildCharacterData,

        save:
          forceSave,

        next:
          nextStep,

        previous:
          previousStep,

        goToStep:

          goToStep,

        selectRace:
          selectRace,

        selectAnimalha:
          selectAnimalha,

        selectClass:
          selectClass,

        assignDie:
          assignDie,

        returnDie:
          returnDie,

        swapAttributes:
          swapAttributes,

        rollAttribute:
          rollAttribute,

        rollPower:
          rollPower,

        selectParallelPower:
          selectParallelPower,

        selectMana:
          selectMana,

        addTechnique:
          addTechnique,

        addInventory:
          addInventory,

        finish:
          finishCharacter,

        reset:
          resetCharacter
      });

    window.dispatchEvent(
      new CustomEvent(
        "aerion:ficha:ready"
      )
    );

    console.info(
      "[AERION] ficha.js inicializado com sucesso."
    );
  }

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