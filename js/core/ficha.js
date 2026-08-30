/* =========================================================
   AERION — FICHA
   js/core/ficha.js

   NÚCLEO DA CRIAÇÃO DE FICHA

   Responsável por:
   - Estado
   - Regras
   - Navegação
   - Validação
   - Raça
   - Animalha
   - Aparência
   - Classe
   - Atributos
   - SISTEMA INDIVIDUAL DOS DADOS
   - Poder
   - Mana
   - Perícias
   - Técnicas
   - Inventário
   - Combate
   - Autosave
   - Finalização

   Renderização:
   js/core/ficha-render.js

   IMPORTANTE:
   Os dados da criação de ficha ficam inteiramente
   controlados aqui. Cada dado possui identidade própria.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     CONFIGURAÇÃO
     ========================================================= */

  const CONFIG = Object.freeze({
    storageKey:
      "aerion:ficha:draft:v11",

    lastCharacterKey:
      "aerion:ficha:last:v11",

    autosaveDelay:
      450,

    maxImageSize:
      6 * 1024 * 1024
  });


  /* =========================================================
     ETAPAS
     ========================================================= */

  const STEPS = Object.freeze([
    {
      id: "identity",
      name: "Identidade"
    },

    {
      id: "race",
      name: "Raça"
    },

    {
      id: "appearance",
      name: "Aparência"
    },

    {
      id: "class",
      name: "Classe"
    },

    {
      id: "attributes",
      name: "Atributos"
    },

    {
      id: "power",
      name: "Poder"
    },

    {
      id: "mana",
      name: "Mana"
    },

    {
      id: "skills",
      name: "Perícias"
    },

    {
      id: "techniques",
      name: "Técnicas"
    },

    {
      id: "inventory",
      name: "Inventário"
    },

    {
      id: "review",
      name: "Revisão"
    }
  ]);


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTES = Object.freeze([
    {
      id: "forca",
      name: "Força"
    },

    {
      id: "vigor",
      name: "Vigor"
    },

    {
      id: "agilidade",
      name: "Agilidade"
    },

    {
      id: "precisao",
      name: "Precisão"
    },

    {
      id: "intelecto",
      name: "Intelecto"
    },

    {
      id: "controle",
      name: "Controle"
    },

    {
      id: "presenca",
      name: "Presença"
    },

    {
      id: "percepcao",
      name: "Percepção"
    }
  ]);


  /* =========================================================
     DADOS DA CRIAÇÃO DE FICHA
     
     CADA DADO É INDIVIDUAL.

     NÃO EXISTE:
       d20 = "dois dados iguais"

     EXISTE:
       d20-1
       d20-2

     Isso permite:
       - selecionar só um D20
       - usar o outro separadamente
       - devolver apenas um
       - arrastar um sem afetar o outro
       - trocar posições sem conflito
     ========================================================= */

  const DICE = Object.freeze([
    {
      id: "d4-1",
      type: "d4",
      sides: 4
    },

    {
      id: "d6-1",
      type: "d6",
      sides: 6
    },

    {
      id: "d6-2",
      type: "d6",
      sides: 6
    },

    {
      id: "d8-1",
      type: "d8",
      sides: 8
    },

    {
      id: "d10-1",
      type: "d10",
      sides: 10
    },

    {
      id: "d12-1",
      type: "d12",
      sides: 12
    },

    {
      id: "d20-1",
      type: "d20",
      sides: 20
    },

    {
      id: "d20-2",
      type: "d20",
      sides: 20
    }
  ]);


  /* =========================================================
     MAPAS AUXILIARES DOS DADOS
     ========================================================= */

  const DICE_BY_ID = Object.freeze(
    Object.fromEntries(
      DICE.map(
        die => [
          die.id,
          die
        ]
      )
    )
  );


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
      id: "guerreiro",
      name: "Guerreiro",
      role: "Combatente",

      skillBonuses: {
        atletismo: 1,
        tatica: 1
      }
    },

    feiticeiro: {
      id: "feiticeiro",
      name: "Feiticeiro",
      role: "Mágico",

      skillBonuses: {
        conhecimento: 1,
        controle_mana: 1
      }
    },

    curandeiro: {
      id: "curandeiro",
      name: "Curandeiro",
      role: "Suporte",

      skillBonuses: {
        medicina: 1,
        intuicao: 1
      }
    },

    monge: {
      id: "monge",
      name: "Monge",
      role: "Marcial",

      skillBonuses: {
        atletismo: 1,
        controle_mana: 1
      }
    }
  });


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  const SKILLS = Object.freeze({
    acrobacia: {
      id: "acrobacia",
      name: "Acrobacia",
      description:
        "Equilíbrio, movimentos rápidos e manobras."
    },

    atletismo: {
      id: "atletismo",
      name: "Atletismo",
      description:
        "Força corporal, corrida, escalada e esforço físico."
    },

    furtividade: {
      id: "furtividade",
      name: "Furtividade",
      description:
        "Mover-se sem ser percebido."
    },

    percepcao: {
      id: "percepcao",
      name: "Percepção",
      description:
        "Perceber detalhes, ameaças e mudanças no ambiente."
    },

    investigacao: {
      id: "investigacao",
      name: "Investigação",
      description:
        "Analisar pistas e descobrir informações."
    },

    conhecimento: {
      id: "conhecimento",
      name: "Conhecimento",
      description:
        "Conhecimentos gerais e especializados."
    },

    medicina: {
      id: "medicina",
      name: "Medicina",
      description:
        "Tratamento, primeiros socorros e diagnóstico."
    },

    sobrevivencia: {
      id: "sobrevivencia",
      name: "Sobrevivência",
      description:
        "Rastreamento, exploração e adaptação ambiental."
    },

    persuasao: {
      id: "persuasao",
      name: "Persuasão",
      description:
        "Convencer e negociar de maneira legítima."
    },

    intuicao: {
      id: "intuicao",
      name: "Intuição",
      description:
        "Perceber intenções e situações suspeitas."
    },

    enganacao: {
      id: "enganacao",
      name: "Enganação",
      description:
        "Blefes, disfarces e manipulação verbal."
    },

    tatica: {
      id: "tatica",
      name: "Tática",
      description:
        "Planejamento e leitura de situações de combate."
    },

    oficio: {
      id: "oficio",
      name: "Ofício / Crafting",
      description:
        "Construção, reparo e criação de itens."
    },

    controle_mana: {
      id: "controle_mana",
      name: "Controle de Mana",
      description:
        "Domínio e precisão na manipulação de Mana."
    }
  });


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

      description:
        "Humanos são conhecidos por sua capacidade de adaptação e aprendizado.",

      profile:
        "Adaptabilidade e aprendizado.",

      feature:
        "Adaptação.",

      modifiers: {
        intelecto: 1,
        presenca: 1
      },

      size: "medio",

      height: {
        min: 150,
        max: 200
      },

      flight: false,

      movement: {}
    },

    {
      id: "elfo",
      name: "Elfo",

      male:
        "https://i.ibb.co/0y8WXSr8/file-00000000495c820e99fc5de509918d90.png",

      female:
        "https://i.ibb.co/F1DCc3j/file-00000000dcf8820e883635d6ca9de492.png",

      description:
        "Elfos possuem sentidos aguçados e forte afinidade com Mana.",

      profile:
        "Percepção e afinidade com Mana.",

      feature:
        "Percepção Élfica.",

      modifiers: {
        percepcao: 1,
        controle: 1,
        vigor: -1
      },

      size: "medio",

      height: {
        min: 155,
        max: 205
      },

      flight: false,

      movement: {}
    },

    {
      id: "anao",
      name: "Anão",

      male:
        "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",

      female:
        "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png",

      description:
        "Anões possuem constituição robusta e forte tradição de forja.",

      profile:
        "Resistência e força estrutural.",

      feature:
        "Forja Ancestral.",

      modifiers: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },

      size: "pequeno",

      height: {
        min: 120,
        max: 155
      },

      flight: false,

      movement: {}
    },

    {
      id: "orc",
      name: "Orc",

      male:
        "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",

      female:
        "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png",

      description:
        "Orcs são fisicamente poderosos e naturalmente resistentes.",

      profile:
        "Potência física e resistência.",

      feature:
        "Fúria de Sangue.",

      modifiers: {
        forca: 1,
        vigor: 1,
        presenca: -1
      },

      size: "grande",

      height: {
        min: 170,
        max: 220
      },

      flight: false,

      movement: {}
    },

    {
      id: "centauro",
      name: "Centauro",

      male:
        "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",

      female:
        "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png",

      description:
        "Centauros unem anatomia humanoide e equina.",

      profile:
        "Velocidade terrestre e potência física.",

      feature:
        "Galope Ancestral.",

      modifiers: {
        forca: 1,
        agilidade: 1,
        controle: -1
      },

      size: "grande",

      height: {
        min: 180,
        max: 240
      },

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

      description:
        "Vampiros possuem uma natureza sobrenatural e sentidos aguçados.",

      profile:
        "Mobilidade e percepção sobrenatural.",

      feature:
        "Regeneração Sanguínea.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      size: "medio",

      height: {
        min: 155,
        max: 205
      },

      flight: false,

      movement: {}
    },

    {
      id: "duende",
      name: "Duende",

      male:
        "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",

      female:
        "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png",

      description:
        "Duendes possuem forte aptidão para comércio, contratos e astúcia.",

      profile:
        "Intelecto, negociação e precisão.",

      feature:
        "Fortuna Mercante.",

      modifiers: {
        intelecto: 1,
        precisao: 1,
        forca: -1
      },

      size: "pequeno",

      height: {
        min: 130,
        max: 160
      },

      flight: false,

      movement: {}
    },

    {
      id: "fada",
      name: "Fada",

      male:
        "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",

      female:
        "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png",

      description:
        "Fadas possuem corpos leves e grande afinidade com Mana.",

      profile:
        "Leveza, agilidade e Mana.",

      feature:
        "Bênção Feérica.",

      modifiers: {
        controle: 1,
        agilidade: 1,
        forca: -1
      },

      size: "pequeno",

      height: {
        min: 130,
        max: 160
      },

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

      description:
        "O Povo Aquático possui adaptações naturais para ambientes aquáticos.",

      profile:
        "Adaptação à água e percepção ambiental.",

      feature:
        "Anfíbio.",

      modifiers: {
        vigor: 1,
        percepcao: 1,
        forca: -1
      },

      size: "medio",

      height: {
        min: 150,
        max: 210
      },

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

      description:
        "Animalhas possuem traços animais integrados à anatomia humanoide.",

      profile:
        "Instinto, sentidos e adaptação natural.",

      feature:
        "Instinto Animal.",

      modifiers: {},

      size: "medio",

      height: {
        min: 140,
        max: 210
      },

      flight: false,

      movement: {}
    },

    {
      id: "povo_natureza",
      name: "Povo da Natureza",

      male:
        "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",

      female:
        "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",

      description:
        "O Povo da Natureza possui forte ligação com ambientes e criaturas naturais.",

      profile:
        "Percepção ambiental e resistência natural.",

      feature:
        "Vínculo Natural.",

      modifiers: {
        percepcao: 1,
        vigor: 1,
        precisao: -1
      },

      size: "medio",

      height: {
        min: 150,
        max: 210
      },

      flight: false,

      movement: {}
    },

    {
      id: "neraliano",
      name: "Neraliano",

      male:
        "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",

      female:
        "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png",

      description:
        "Neralianos possuem adaptações relacionadas à água, profundidade e vibrações.",

      profile:
        "Adaptação aquática e leitura de vibrações.",

      feature:
        "Adaptação Abissal.",

      modifiers: {
        vigor: 1,
        percepcao: 1,
        agilidade: -1
      },

      size: "medio",

      height: {
        min: 155,
        max: 205
      },

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

      description:
        "Raça associada às grandes altitudes e mobilidade vertical.",

      profile:
        "Mobilidade vertical e percepção espacial.",

      feature:
        "Corpo Celestial.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      size: "medio",

      height: {
        min: 170,
        max: 230
      },

      flight: false,

      movement: {}
    },

    {
      id: "povo_nuvens",
      name: "Povo das Nuvens",

      male: "",
      female: "",

      description:
        "Raça adaptada a ambientes elevados e grandes altitudes.",

      profile:
        "Leveza e mobilidade em grandes altitudes.",

      feature:
        "Passo do Céu.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      size: "medio",

      height: {
        min: 165,
        max: 225
      },

      flight: false,

      movement: {}
    },

    {
      id: "colosso",
      name: "Colosso",

      male: "",
      female: "",

      description:
        "Colossos possuem grande porte e asas colossais.",

      profile:
        "Força e resistência extraordinárias.",

      feature:
        "Asas Colossais.",

      modifiers: {
        forca: 2,
        vigor: 1,
        agilidade: -1
      },

      size: "colossal",

      height: {
        min: 250,
        max: 400
      },

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

      description:
        "Trolls possuem grande resistência física e capacidade regenerativa.",

      profile:
        "Resistência extrema e recuperação.",

      feature:
        "Regeneração Brutal.",

      modifiers: {
        vigor: 2,
        forca: 1,
        agilidade: -1
      },

      size: "grande",

      height: {
        min: 220,
        max: 320
      },

      flight: false,

      movement: {}
    }
  ]);


  /* =========================================================
     ANIMALHA
     ========================================================= */

  const ANIMALHA_VARIANTS = Object.freeze([
    {
      id: "pantera",
      name: "Pantera",
      category: "Felino",

      profile:
        "Velocidade, furtividade e percepção.",

      feature:
        "Movimento silencioso e reflexos felinos.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        vigor: -1
      },

      size: "medio",

      height: {
        min: 145,
        max: 180
      },

      flight: false,

      movement: {}
    },

    {
      id: "tigre",
      name: "Tigre",
      category: "Felino",

      profile:
        "Força explosiva e mobilidade.",

      feature:
        "Salto e ataques físicos rápidos.",

      modifiers: {
        forca: 1,
        agilidade: 1,
        vigor: -1
      },

      size: "grande",

      height: {
        min: 155,
        max: 195
      },

      flight: false,

      movement: {}
    },

    {
      id: "leao",
      name: "Leão",
      category: "Felino",

      profile:
        "Força e presença.",

      feature:
        "Presença física natural.",

      modifiers: {
        forca: 1,
        presenca: 1,
        agilidade: -1
      },

      size: "grande",

      height: {
        min: 165,
        max: 205
      },

      flight: false,

      movement: {}
    },

    {
      id: "gato",
      name: "Gato",
      category: "Felino",

      profile:
        "Agilidade e percepção.",

      feature:
        "Equilíbrio e movimentação precisa.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },

      size: "pequeno",

      height: {
        min: 135,
        max: 160
      },

      flight: false,

      movement: {}
    },

    {
      id: "lobo",
      name: "Lobo",
      category: "Canídeo",

      profile:
        "Percepção, resistência e rastreamento.",

      feature:
        "Sentidos aguçados e rastreamento.",

      modifiers: {
        percepcao: 1,
        vigor: 1,
        presenca: -1
      },

      size: "medio",

      height: {
        min: 145,
        max: 190
      },

      flight: false,

      movement: {}
    },

    {
      id: "raposa",
      name: "Raposa",
      category: "Canídeo",

      profile:
        "Agilidade, astúcia e percepção.",

      feature:
        "Astúcia e movimentação silenciosa.",

      modifiers: {
        agilidade: 1,
        intelecto: 1,
        forca: -1
      },

      size: "pequeno",

      height: {
        min: 135,
        max: 165
      },

      flight: false,

      movement: {}
    },

    {
      id: "falcao",
      name: "Falcão",
      category: "Ave",

      profile:
        "Percepção, precisão e mobilidade aérea.",

      feature:
        "Visão extremamente aguçada.",

      modifiers: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },

      size: "pequeno",

      height: {
        min: 135,
        max: 165
      },

      flight: true,

      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "aguia",
      name: "Águia",
      category: "Ave",

      profile:
        "Percepção e precisão à distância.",

      feature:
        "Percepção de longa distância.",

      modifiers: {
        percepcao: 1,
        precisao: 1,
        vigor: -1
      },

      size: "medio",

      height: {
        min: 145,
        max: 180
      },

      flight: true,

      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "coruja",
      name: "Coruja",
      category: "Ave",

      profile:
        "Percepção noturna e intelecto.",

      feature:
        "Excelente percepção em baixa iluminação.",

      modifiers: {
        percepcao: 1,
        intelecto: 1,
        forca: -1
      },

      size: "pequeno",

      height: {
        min: 135,
        max: 165
      },

      flight: true,

      movement: {
        airMultiplier: 2
      }
    },

    {
      id: "cobra",
      name: "Cobra",
      category: "Réptil",

      profile:
        "Precisão, percepção e controle corporal.",

      feature:
        "Percepção de movimento.",

      modifiers: {
        precisao: 1,
        percepcao: 1,
        vigor: -1
      },

      size: "pequeno",

      height: {
        min: 135,
        max: 165
      },

      flight: false,

      movement: {}
    },

    {
      id: "crocodilo",
      name: "Crocodilo",
      category: "Réptil",

      profile:
        "Força, vigor e adaptação aquática.",

      feature:
        "Grande resistência e adaptação aquática.",

      modifiers: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },

      size: "grande",

      height: {
        min: 180,
        max: 250
      },

      flight: false,

      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "lagarto",
      name: "Lagarto",
      category: "Réptil",

      profile:
        "Agilidade e percepção.",

      feature:
        "Adaptação a superfícies e ambientes variados.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        presenca: -1
      },

      size: "medio",

      height: {
        min: 140,
        max: 180
      },

      flight: false,

      movement: {}
    },

    {
      id: "urso",
      name: "Urso",
      category: "Grande porte",

      profile:
        "Força e vigor.",

      feature:
        "Grande potência física.",

      modifiers: {
        forca: 1,
        vigor: 1,
        agilidade: -1
      },

      size: "grande",

      height: {
        min: 190,
        max: 270
      },

      flight: false,

      movement: {}
    },

    {
      id: "rinoceronte",
      name: "Rinoceronte",
      category: "Grande porte",

      profile:
        "Vigor extremo e resistência.",

      feature:
        "Resistência física extraordinária.",

      modifiers: {
        vigor: 2,
        agilidade: -1,
        precisao: -1
      },

      size: "grande",

      height: {
        min: 200,
        max: 280
      },

      flight: false,

      movement: {}
    },

    {
      id: "hipopotamo",
      name: "Hipopótamo",
      category: "Grande porte / Aquático",

      profile:
        "Vigor, força e adaptação aquática.",

      feature:
        "Grande resistência e adaptação à água.",

      modifiers: {
        vigor: 1,
        forca: 1,
        agilidade: -1
      },

      size: "grande",

      height: {
        min: 200,
        max: 280
      },

      flight: false,

      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "rato",
      name: "Rato",
      category: "Pequeno porte",

      profile:
        "Agilidade e percepção.",

      feature:
        "Movimentação em espaços reduzidos.",

      modifiers: {
        agilidade: 1,
        percepcao: 1,
        forca: -1
      },

      size: "pequeno",

      height: {
        min: 135,
        max: 160
      },

      flight: false,

      movement: {}
    },

    {
      id: "tubarao",
      name: "Tubarão",
      category: "Aquático",

      profile:
        "Vigor e percepção.",

      feature:
        "Percepção aquática e resistência.",

      modifiers: {
        vigor: 1,
        percepcao: 1,
        presenca: -1
      },

      size: "grande",

      height: {
        min: 180,
        max: 240
      },

      flight: false,

      movement: {
        aquaticMultiplier: 2
      }
    },

    {
      id: "foca",
      name: "Foca",
      category: "Aquático",

      profile:
        "Vigor e agilidade na água.",

      feature:
        "Excelente mobilidade aquática.",

      modifiers: {
        vigor: 1,
        agilidade: 1,
        precisao: -1
      },

      size: "medio",

      height: {
        min: 145,
        max: 180
      },

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
      hpBonus: 1,
      movementMultiplier: 0.5
    },

    medio: {
      hpBonus: 3,
      movementMultiplier: 1
    },

    grande: {
      hpBonus: 5,
      movementMultiplier: 0.5
    },

    colossal: {
      hpBonus: 5,
      movementMultiplier: 0.5
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

      appearance: {
        height: null,

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

      /*
       * Aqui ficam os IDs INDIVIDUAIS dos dados.
       *
       * Exemplo:
       *
       * forca: "d20-1"
       * vigor: "d20-2"
       *
       * Nunca:
       *
       * forca: "d20"
       * vigor: "d20"
       */

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


  let state =
    createDefaultState();

  let selectedDie =
    null;

  let autosaveTimer =
    null;


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function render() {
    if (
      window.AERIONFichaRender &&
      typeof
        window.AERIONFichaRender
          .render ===
        "function"
    ) {
      window.AERIONFichaRender.render(
        getPublicState()
      );
    }
  }

  function toast(message) {
    if (
      window.AERIONFichaRender &&
      typeof
        window.AERIONFichaRender
          .toast ===
        "function"
    ) {
      window.AERIONFichaRender.toast(
        message
      );

      return;
    }

    console.info(
      "[AERION]",
      message
    );
  }


  /* =========================================================
     AUTOSAVE
     ========================================================= */

  function save() {
    clearTimeout(
      autosaveTimer
    );

    state.updatedAt =
      new Date().toISOString();

    autosaveTimer =
      setTimeout(
        () => {
          try {
            localStorage.setItem(
              CONFIG.storageKey,

              JSON.stringify(
                state
              )
            );

            document.dispatchEvent(
              new CustomEvent(
                "aerion:ficha:saved"
              )
            );
          } catch (
            error
          ) {
            console.error(
              "[AERION] Falha ao salvar:",
              error
            );
          }
        },

        CONFIG.autosaveDelay
      );
  }

  function forceSave() {
    clearTimeout(
      autosaveTimer
    );

    state.updatedAt =
      new Date().toISOString();

    try {
      localStorage.setItem(
        CONFIG.storageKey,

        JSON.stringify(
          state
        )
      );

      return true;
    } catch (
      error
    ) {
      console.error(
        "[AERION] Falha ao salvar:",
        error
      );

      return false;
    }
  }


  /* =========================================================
     CARREGAMENTO
     ========================================================= */

  function load() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (
        !raw
      ) {
        return false;
      }

      const saved =
        JSON.parse(
          raw
        );

      if (
        !saved ||
        typeof saved !==
          "object"
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
          ...(saved.appearance ||
            {})
        },

        attributes: {
          ...defaults.attributes,
          ...(saved.attributes ||
            {})
        },

        rolls: {
          ...(saved.rolls ||
            {})
        },

        skills: {
          ...(saved.skills ||
            {})
        },

        techniques:
          Array.isArray(
            saved.techniques
          )
            ? saved.techniques
            : [],

        inventory:
          Array.isArray(
            saved.inventory
          )
            ? saved.inventory
            : []
      };

      state.step =
        Math.max(
          0,
          Math.min(
            STEPS.length - 1,

            Number(
              state.step
            ) || 0
          )
        );

      sanitizeState();

      return true;
    } catch (
      error
    ) {
      console.warn(
        "[AERION] Rascunho inválido:",
        error
      );

      state =
        createDefaultState();

      return false;
    }
  }


  /* =========================================================
     SANITIZAÇÃO
     ========================================================= */

  function sanitizeState() {
    ensureRaceIndex();

    ensureAttributes();

    ensureSkills();

    ensureTechniques();

    ensureInventory();

    validatePower();

    validateMana();

    resetAppearanceHeight();
  }


  /* =========================================================
     ESTADO PÚBLICO
     ========================================================= */

  function getPublicState() {
    return clone({
      ...state,

      selectedDie,

      dice:
        getDiceState(),

      previewRace:
        getPreviewRace(),

      raceData:
        getEffectiveRace(),

      effectiveAttributes:
        getEffectiveAttributes(),

      effectiveSkills:
        getEffectiveSkills(),

      combat:
        getCombatData(),

      progress:
        getProgress(),

      steps:
        STEPS
    });
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function ensureRaceIndex() {
    if (
      !state.race
    ) {
      state.raceIndex =
        Math.max(
          0,
          Math.min(
            RACES.length - 1,

            Number(
              state.raceIndex
            ) || 0
          )
        );

      return;
    }

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

      return;
    }

    state.race =
      "";

    state.raceIndex =
      0;

    state.animalha =
      "";
  }

  function getRace() {
    return (
      RACES.find(
        race =>
          race.id ===
          state.race
      ) ||
      null
    );
  }

  function getPreviewRace() {
    return (
      RACES[
        state.raceIndex
      ] ||
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
      getRace();

    if (
      !race
    ) {
      return null;
    }

    if (
      race.id !==
      "animalha"
    ) {
      return race;
    }

    const animal =
      getAnimalha();

    if (
      !animal
    ) {
      return race;
    }

    return {
      ...race,

      id:
        `${race.id}:${animal.id}`,

      name:
        `${race.name} — ${animal.name}`,

      profile:
        animal.profile,

      feature:
        animal.feature,

      modifiers: {
        ...(race.modifiers ||
          {}),

        ...(animal.modifiers ||
          {})
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
        ...(race.movement ||
          {}),

        ...(animal.movement ||
          {})
      }
    };
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

    if (
      index <
      0
    ) {
      return false;
    }

    state.race =
      raceId;

    state.raceIndex =
      index;

    state.animalha =
      "";

    resetAppearanceHeight();

    save();
    render();

    toast(
      `${RACES[index].name} selecionada.`
    );

    return true;
  }

  function selectCurrentRace() {
    const race =
      getPreviewRace();

    if (
      !race
    ) {
      return false;
    }

    return selectRace(
      race.id
    );
  }

  function setRaceIndex(
    index
  ) {
    index =
      Number(index);

    if (
      !Number.isInteger(
        index
      )
    ) {
      return false;
    }

    if (
      index < 0 ||
      index >=
        RACES.length
    ) {
      return false;
    }

    state.raceIndex =
      index;

    render();

    return true;
  }

  function nextRace() {
    if (
      !RACES.length
    ) {
      return false;
    }

    state.raceIndex =
      (
        state.raceIndex +
        1
      ) %
      RACES.length;

    render();

    return true;
  }

  function previousRace() {
    if (
      !RACES.length
    ) {
      return false;
    }

    state.raceIndex =
      (
        state.raceIndex -
        1 +
        RACES.length
      ) %
      RACES.length;

    render();

    return true;
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function selectAnimalha(
    id
  ) {
    if (
      state.race !==
      "animalha"
    ) {
      return false;
    }

    const exists =
      ANIMALHA_VARIANTS.some(
        variant =>
          variant.id ===
          id
      );

    if (
      !exists
    ) {
      return false;
    }

    state.animalha =
      id;

    resetAppearanceHeight();

    save();
    render();

    return true;
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function resetAppearanceHeight() {
    const race =
      getEffectiveRace();

    if (
      !race?.height
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

    if (
      !Number.isFinite(
        min
      ) ||
      !Number.isFinite(
        max
      ) ||
      max < min
    ) {
      return;
    }

    const current =
      Number(
        state.appearance
          .height
      );

    if (
      !Number.isFinite(
        current
      ) ||
      current < min ||
      current > max
    ) {
      state.appearance.height =
        Math.round(
          (
            min +
            max
          ) /
            2
        );
    }
  }

  function setHeight(
    value
  ) {
    const race =
      getEffectiveRace();

    if (
      !race?.height
    ) {
      return false;
    }

    const min =
      Number(
        race.height.min
      );

    const max =
      Number(
        race.height.max
      );

    const numericValue =
      Number(
        value
      );

    const safeValue =
      Number.isFinite(
        numericValue
      )
        ? numericValue
        : min;

    state.appearance.height =
      Math.max(
        min,

        Math.min(
          max,

          Math.round(
            safeValue
          )
        )
      );

    save();
    render();

    return true;
  }

  function setAppearanceField(
    field,
    value
  ) {
    if (
      field ===
      "height"
    ) {
      return setHeight(
        value
      );
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        state.appearance,
        field
      )
    ) {
      return false;
    }

    state.appearance[
      field
    ] =
      String(
        value ?? ""
      );

    save();

    return true;
  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function selectClass(
    classId
  ) {
    if (
      !CLASSES[
        classId
      ]
    ) {
      return false;
    }

    state.class =
      classId;

    ensureSkills();

    save();
    render();

    toast(
      `${CLASSES[classId].name} selecionado.`
    );

    return true;
  }


  /* =========================================================
     DADOS — ESTADO
     ========================================================= */

  function ensureAttributes() {
    if (
      !state.attributes ||
      typeof state.attributes !==
        "object" ||
      Array.isArray(
        state.attributes
      )
    ) {
      state.attributes =
        {};
    }

    ATTRIBUTES.forEach(
      attribute => {
        const dieId =
          state.attributes[
            attribute.id
          ];

        /*
         * Somente IDs reais de dados são aceitos.
         */
        if (
          dieId !== null &&
          !DICE_BY_ID[
            dieId
          ]
        ) {
          state.attributes[
            attribute.id
          ] =
            null;
        }
      }
    );

    /*
     * Corrige duplicação de um mesmo
     * dado individual no estado.
     */
    const used =
      new Set();

    ATTRIBUTES.forEach(
      attribute => {
        const id =
          state.attributes[
            attribute.id
          ];

        if (
          !id
        ) {
          return;
        }

        if (
          used.has(
            id
          )
        ) {
          state.attributes[
            attribute.id
          ] =
            null;

          return;
        }

        used.add(
          id
        );
      }
    );

    if (
      !state.rolls ||
      typeof state.rolls !==
        "object" ||
      Array.isArray(
        state.rolls
      )
    ) {
      state.rolls =
        {};
    }
  }


  /* =========================================================
     DADOS — CONSULTAS
     ========================================================= */

  function getAssignedAttributeForDie(
    dieId
  ) {
    const entry =
      ATTRIBUTES.find(
        attribute =>
          state.attributes[
            attribute.id
          ] ===
          dieId
      );

    return (
      entry?.id ||
      null
    );
  }

  function isDieAssigned(
    dieId
  ) {
    return Boolean(
      getAssignedAttributeForDie(
        dieId
      )
    );
  }

  function isDieAvailable(
    dieId
  ) {
    return (
      Boolean(
        DICE_BY_ID[
          dieId
        ]
      ) &&
      !isDieAssigned(
        dieId
      )
    );
  }

  function getDiceState() {
    return DICE.map(
      die => {
        const assignedTo =
          getAssignedAttributeForDie(
            die.id
          );

        return {
          ...die,

          available:
            !assignedTo,

          assigned:
            Boolean(
              assignedTo
            ),

          assignedTo:
            assignedTo
        };
      }
    );
  }


  /* =========================================================
     DADOS — SELEÇÃO
     ========================================================= */

  function selectDie(
    dieId
  ) {
    if (
      !DICE_BY_ID[
        dieId
      ]
    ) {
      return false;
    }

    /*
     * Um dado já usado não pode ser selecionado.
     */
    if (
      !isDieAvailable(
        dieId
      )
    ) {
      toast(
        "Esse dado já está atribuído a um atributo."
      );

      return false;
    }

    selectedDie =
      dieId;

    render();

    return true;
  }

  function clearDieSelection() {
    selectedDie =
      null;

    render();
  }


  /* =========================================================
     DADOS — ATRIBUIÇÃO
     ========================================================= */

  function assignDie(
    attribute,
    dieId
  ) {
    if (
      !ATTRIBUTES.some(
        item =>
          item.id ===
          attribute
      )
    ) {
      return false;
    }

    if (
      !DICE_BY_ID[
        dieId
      ]
    ) {
      return false;
    }

    /*
     * Clicar no mesmo dado que já está
     * naquele atributo = devolver.
     */
    if (
      state.attributes[
        attribute
      ] ===
      dieId
    ) {
      return returnDie(
        attribute
      );
    }

    /*
     * Se o dado já estiver em qualquer
     * outro atributo, NÃO REMOVE.
     *
     * Esse é o comportamento fundamental
     * da nova arquitetura.
     */
    const currentOwner =
      getAssignedAttributeForDie(
        dieId
      );

    if (
      currentOwner
    ) {
      toast(
        `${formatDieName(
          dieId
        )} já está em ${getAttributeName(
          currentOwner
        )}.`
      );

      return false;
    }

    /*
     * O atributo pode estar ocupado por
     * OUTRO dado. Nesse caso NÃO sobrescreve.
     *
     * Isso evita troca acidental.
     */
    const currentDie =
      state.attributes[
        attribute
      ];

    if (
      currentDie
    ) {
      toast(
        `${getAttributeName(
          attribute
        )} já possui ${formatDieName(
          currentDie
        )}.`
      );

      return false;
    }

    /*
     * Agora sim:
     *
     * dado livre
     * +
     * atributo livre
     *
     * = atribuição.
     */
    state.attributes[
      attribute
    ] =
      dieId;

    delete state.rolls[
      attribute
    ];

    selectedDie =
      null;

    save();
    render();

    return true;
  }


  /* =========================================================
     DADOS — ATRIBUIÇÃO POR SELEÇÃO
     ========================================================= */

  function assignSelectedDie(
    attribute
  ) {
    if (
      !selectedDie
    ) {
      toast(
        "Selecione um dado primeiro."
      );

      return false;
    }

    return assignDie(
      attribute,
      selectedDie
    );
  }


  /* =========================================================
     DADOS — DEVOLVER
     ========================================================= */

  function returnDie(
    attribute
  ) {
    if (
      !ATTRIBUTES.some(
        item =>
          item.id ===
          attribute
      )
    ) {
      return false;
    }

    const dieId =
      state.attributes[
        attribute
      ];

    if (
      !dieId
    ) {
      return false;
    }

    state.attributes[
      attribute
    ] =
      null;

    delete state.rolls[
      attribute
    ];

    /*
     * Se o usuário estava com esse
     * mesmo dado selecionado, limpa.
     */
    if (
      selectedDie ===
      dieId
    ) {
      selectedDie =
        null;
    }

    save();
    render();

    toast(
      `${formatDieName(
        dieId
      )} devolvido à piscina.`
    );

    return true;
  }


  /* =========================================================
     DADOS — TROCA DE ATRIBUTOS
     ========================================================= */

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
          item.id ===
          first
      ) ||
      !ATTRIBUTES.some(
        item =>
          item.id ===
          second
      )
    ) {
      return false;
    }

    const firstDie =
      state.attributes[
        first
      ];

    const secondDie =
      state.attributes[
        second
      ];

    /*
     * Como os IDs são individuais,
     * a troca é segura.
     */
    state.attributes[
      first
    ] =
      secondDie ||
      null;

    state.attributes[
      second
    ] =
      firstDie ||
      null;

    const firstRoll =
      state.rolls[
        first
      ];

    const secondRoll =
      state.rolls[
        second
      ];

    if (
      secondRoll
    ) {
      state.rolls[
        first
      ] =
        secondRoll;
    } else {
      delete state.rolls[
        first
      ];
    }

    if (
      firstRoll
    ) {
      state.rolls[
        second
      ] =
        firstRoll;
    } else {
      delete state.rolls[
        second
      ];
    }

    selectedDie =
      null;

    save();
    render();

    return true;
  }


  /* =========================================================
     DADOS — FORMATAÇÃO
     ========================================================= */

  function formatDieName(
    dieId
  ) {
    const die =
      DICE_BY_ID[
        dieId
      ];

    if (
      !die
    ) {
      return "Dado";
    }

    return `D${die.sides}`;
  }


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  function getRaceModifier(
    attribute
  ) {
    return (
      Number(
        getEffectiveRace()
          ?.modifiers?.[
          attribute
        ]
      ) || 0
    );
  }

  function getAttributeName(
    id
  ) {
    return (
      ATTRIBUTES.find(
        attribute =>
          attribute.id ===
          id
      )?.name ||
      id
    );
  }

  function getAttribute(
    attribute
  ) {
    const dieId =
      state.attributes[
        attribute
      ];

    const die =
      dieId
        ? DICE_BY_ID[
            dieId
          ]
        : null;

    const roll =
      state.rolls[
        attribute
      ];

    const modifier =
      getRaceModifier(
        attribute
      );

    const sides =
      die?.sides ||
      0;

    return {
      id:
        attribute,

      name:
        getAttributeName(
          attribute
        ),

      die:
        dieId,

      dieId:
        dieId,

      type:
        die?.type ||
        null,

      sides,

      racialModifier:
        modifier,

      rolled:
        Boolean(
          roll
        ),

      roll:
        roll?.value ??
        null,

      total:
        roll?.total ??
        (
          dieId
            ? sides +
              modifier
            : null
        )
    };
  }

  function getEffectiveAttributes() {
    const result =
      {};

    ATTRIBUTES.forEach(
      attribute => {
        result[
          attribute.id
        ] =
          getAttribute(
            attribute.id
          );
      }
    );

    return result;
  }


  /* =========================================================
     ROLAGEM DE ATRIBUTO
     ========================================================= */

  function rollAttribute(
    attribute
  ) {
    const dieId =
      state.attributes[
        attribute
      ];

    const die =
      dieId
        ? DICE_BY_ID[
            dieId
          ]
        : null;

    if (
      !die
    ) {
      toast(
        "Coloque um dado nesse atributo primeiro."
      );

      return null;
    }

    const roll =
      Math.floor(
        Math.random() *
          die.sides
      ) +
      1;

    const modifier =
      getRaceModifier(
        attribute
      );

    const total =
      roll +
      modifier;

    state.rolls[
      attribute
    ] = {
      dieId,

      dieType:
        die.type,

      sides:
        die.sides,

      value:
        roll,

      modifier,

      total,

      timestamp:
        Date.now()
    };

    save();
    render();

    toast(
      `${getAttributeName(
        attribute
      )}: ${total}`
    );

    return total;
  }


  /* =========================================================
     PODER
     ========================================================= */

  function validatePower() {
    if (
      state.powerType ===
      "principal"
    ) {
      if (
        !PRIMARY_POWERS.includes(
          state.power
        )
      ) {
        state.power =
          "";

        state.powerRoll =
          null;

        state.powerType =
          "";
      }

      return;
    }

    if (
      state.powerType ===
      "paralelo"
    ) {
      if (
        !PARALLEL_POWERS.includes(
          state.power
        )
      ) {
        state.power =
          "";

        state.powerRoll =
          null;

        state.powerType =
          "";
      }

      return;
    }

    if (
      PRIMARY_POWERS.includes(
        state.power
      )
    ) {
      state.powerType =
        "principal";

      return;
    }

    if (
      PARALLEL_POWERS.includes(
        state.power
      )
    ) {
      state.powerType =
        "paralelo";

      state.powerRoll =
        null;

      return;
    }

    state.power =
      "";

    state.powerRoll =
      null;

    state.powerType =
      "";
  }

  function rollPower() {
    const roll =
      Math.floor(
        Math.random() *
          100
      ) +
      1;

    const index =
      Math.min(
        PRIMARY_POWERS.length -
          1,

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

    save();
    render();

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

    save();
    render();

    toast(
      `${power} selecionado.`
    );

    return true;
  }


  /* =========================================================
     MANA
     ========================================================= */

  function validateMana() {
    if (
      String(
        state.mana ||
          ""
      ).toLowerCase() !==
      "azul"
    ) {
      state.mana =
        "azul";
    }
  }

  function selectMana(
    mana
  ) {
    mana =
      String(
        mana ??
          ""
      ).toLowerCase();

    if (
      mana !==
      "azul"
    ) {
      toast(
        "Esta Mana está bloqueada. O Mestre pode liberá-la durante a campanha."
      );

      return false;
    }

    state.mana =
      "azul";

    save();
    render();

    return true;
  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function ensureSkills() {
    if (
      !state.skills ||
      typeof state.skills !==
        "object" ||
      Array.isArray(
        state.skills
      )
    ) {
      state.skills =
        {};
    }

    Object.keys(
      SKILLS
    ).forEach(
      skillId => {
        const current =
          state.skills[
            skillId
          ];

        if (
          !current ||
          typeof current !==
            "object"
        ) {
          state.skills[
            skillId
          ] = {
            trained:
              false,

            bonus:
              0
          };

          return;
        }

        state.skills[
          skillId
        ].trained =
          Boolean(
            current.trained
          );

        state.skills[
          skillId
        ].bonus =
          Number(
            current.bonus
          ) || 0;
      }
    );
  }

  function trainSkill(
    skillId
  ) {
    ensureSkills();

    if (
      !SKILLS[
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

    save();
    render();

    return true;
  }

  function setSkillBonus(
    skillId,
    value
  ) {
    ensureSkills();

    if (
      !SKILLS[
        skillId
      ]
    ) {
      return false;
    }

    state.skills[
      skillId
    ].bonus =
      Math.max(
        -20,

        Math.min(
          20,

          Number(
            value
          ) || 0
        )
      );

    save();
    render();

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

    if (
      !skill
    ) {
      return 0;
    }

    const training =
      skill.trained
        ? 5
        : 0;

    const manual =
      Number(
        skill.bonus
      ) || 0;

    const classBonus =
      Number(
        CLASSES[
          state.class
        ]?.skillBonuses?.[
          skillId
        ]
      ) || 0;

    return (
      training +
      manual +
      classBonus
    );
  }

  function getEffectiveSkills() {
    ensureSkills();

    const result =
      {};

    Object.keys(
      SKILLS
    ).forEach(
      skillId => {
        result[
          skillId
        ] = {
          id:
            skillId,

          trained:
            Boolean(
              state.skills[
                skillId
              ].trained
            ),

          bonus:
            Number(
              state.skills[
                skillId
              ].bonus
            ) || 0,

          effectiveBonus:
            getEffectiveSkillBonus(
              skillId
            )
        };
      }
    );

    return result;
  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function ensureTechniques() {
    if (
      !Array.isArray(
        state.techniques
      )
    ) {
      state.techniques =
        [];
    }
  }

  function createTechnique() {
    return {
      id:
        `tech-${Date.now()}-${Math.random()
          .toString(
            36
          )
          .slice(
            2
          )}`,

      name: "",

      description: "",

      range: "",

      damage: "",

      cost: "",

      test: "",

      limitation: ""
    };
  }

  function addTechnique(
    data = {}
  ) {
    ensureTechniques();

    const technique = {
      ...createTechnique(),
      ...data
    };

    state.techniques.push(
      technique
    );

    save();
    render();

    return technique;
  }

  function updateTechnique(
    id,
    field,
    value
  ) {
    ensureTechniques();

    const technique =
      state.techniques.find(
        item =>
          item.id ===
          id
      );

    if (
      !technique
    ) {
      return false;
    }

    const allowedFields = [
      "name",
      "description",
      "range",
      "damage",
      "cost",
      "test",
      "limitation"
    ];

    if (
      !allowedFields.includes(
        field
      )
    ) {
      return false;
    }

    technique[
      field
    ] =
      String(
        value ??
          ""
      );

    save();

    return true;
  }

  function removeTechnique(
    id
  ) {
    ensureTechniques();

    state.techniques =
      state.techniques.filter(
        technique =>
          technique.id !==
          id
      );

    save();
    render();

    return true;
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function ensureInventory() {
    if (
      !Array.isArray(
        state.inventory
      )
    ) {
      state.inventory =
        [];
    }
  }

  function createInventoryItem() {
    return {
      id:
        `item-${Date.now()}-${Math.random()
          .toString(
            36
          )
          .slice(
            2
          )}`,

      name: "",

      quantity: 1,

      description: ""
    };
  }

  function addInventoryItem(
    data = {}
  ) {
    ensureInventory();

    const item = {
      ...createInventoryItem(),
      ...data
    };

    item.name =
      String(
        item.name ??
          ""
      );

    item.quantity =
      Math.max(
        0,

        Number(
          item.quantity
        ) || 1
      );

    item.description =
      String(
        item.description ??
          ""
      );

    state.inventory.push(
      item
    );

    save();
    render();

    return item;
  }

  function updateInventoryItem(
    id,
    field,
    value
  ) {
    ensureInventory();

    const item =
      state.inventory.find(
        entry =>
          entry.id ===
          id
      );

    if (
      !item
    ) {
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
      field ===
        "name" ||
      field ===
        "description"
    ) {
      item[
        field
      ] =
        String(
          value ??
            ""
        );
    } else {
      return false;
    }

    save();

    return true;
  }

  function removeInventoryItem(
    id
  ) {
    ensureInventory();

    state.inventory =
      state.inventory.filter(
        item =>
          item.id !==
          id
      );

    save();
    render();

    return true;
  }


  /* =========================================================
     COMBATE
     ========================================================= */

  function calculateHP() {
    const race =
      getEffectiveRace();

    const vigor =
      getAttribute(
        "vigor"
      );

    if (
      !race ||
      !vigor.die
    ) {
      return null;
    }

    const size =
      SIZE_RULES[
        race.size
      ] ||
      SIZE_RULES.medio;

    return (
      10 +

      Number(
        vigor.total ||
          0
      ) +

      Number(
        size.hpBonus ||
          0
      )
    );
  }

  function getCombatData() {
    const race =
      getEffectiveRace();

    if (
      !race
    ) {
      return {
        hp: null,

        movement:
          null,

        air:
          null,

        aquatic:
          null,

        canFly:
          false
      };
    }

    const size =
      SIZE_RULES[
        race.size
      ] ||
      SIZE_RULES.medio;

    let movement =
      9 *
      Number(
        size.movementMultiplier
      );

    if (
      race.movement
        ?.groundMultiplier
    ) {
      movement *=
        Number(
          race.movement
            .groundMultiplier
        ) || 1;
    }

    let air =
      null;

    if (
      race.flight
    ) {
      air =
        9 *
        (
          Number(
            race.movement
              ?.airMultiplier
          ) || 2
        );
    }

    let aquatic =
      null;

    if (
      race.movement
        ?.aquaticMultiplier
    ) {
      aquatic =
        9 *
        (
          Number(
            race.movement
              .aquaticMultiplier
          ) || 1
        );
    }

    return {
      hp:
        calculateHP(),

      movement,

      air,

      aquatic,

      canFly:
        Boolean(
          race.flight
        )
    };
  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function isStepComplete(
    index
  ) {
    switch (
      index
    ) {
      case 0:
        return (
          Boolean(
            String(
              state.name ||
                ""
            ).trim()
          ) &&
          Boolean(
            state.gender
          )
        );

      case 1:
        return Boolean(
          state.race
        );

      case 2:
        return Boolean(
          state.appearance
            ?.height
        );

      case 3:
        return Boolean(
          state.class
        );

      case 4:
        return ATTRIBUTES.every(
          attribute =>
            Boolean(
              state.attributes[
                attribute.id
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

      /*
       * Essas etapas podem ficar opcionais
       * durante a criação.
       */
      case 7:
      case 8:
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
      index -
        1
    );
  }

  function getProgress() {
    let completed =
      0;

    for (
      let index = 0;
      index <
      STEPS.length;
      index++
    ) {
      if (
        isStepComplete(
          index
        )
      ) {
        completed++;
      }
    }

    return {
      completed,

      total:
        STEPS.length,

      percent:
        Math.round(
          (
            completed /
            STEPS.length
          ) *
            100
        )
    };
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

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
      ) ||
      index < 0 ||
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
        `Complete "${STEPS[index - 1]?.name || "a etapa anterior"}" primeiro.`
      );

      return false;
    }

    state.step =
      index;

    save();
    render();

    window.scrollTo({
      top: 0,

      behavior:
        "smooth"
    });

    return true;
  }

  function nextStep() {
    const current =
      Number(
        state.step
      ) || 0;

    if (
      !isStepComplete(
        current
      )
    ) {
      toast(
        `Complete "${STEPS[current].name}" para continuar.`
      );

      return false;
    }

    if (
      current >=
      STEPS.length -
        1
    ) {
      return finish();
    }

    state.step =
      current +
      1;

    save();
    render();

    window.scrollTo({
      top: 0,

      behavior:
        "smooth"
    });

    return true;
  }

  function previousStep() {
    if (
      state.step <=
      0
    ) {
      return false;
    }

    state.step -=
      1;

    save();
    render();

    window.scrollTo({
      top: 0,

      behavior:
        "smooth"
    });

    return true;
  }


  /* =========================================================
     IDENTIDADE
     ========================================================= */

  function setName(
    value
  ) {
    state.name =
      String(
        value ??
          ""
      );

    save();
    render();
  }

  function setAge(
    value
  ) {
    state.age =
      String(
        value ??
          ""
      );

    save();
  }

  function setGender(
    value
  ) {
    if (
      value !==
        "masculino" &&
      value !==
        "feminino"
    ) {
      return false;
    }

    state.gender =
      value;

    save();
    render();

    return true;
  }

  function setDescription(
    value
  ) {
    state.description =
      String(
        value ??
          ""
      );

    save();
  }

  function setOrigin(
    value
  ) {
    state.origin =
      String(
        value ??
          ""
      );

    save();
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function setAvatar(
    file
  ) {
    if (
      !file
    ) {
      return false;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      toast(
        "Escolha uma imagem válida."
      );

      return false;
    }

    if (
      file.size >
      CONFIG.maxImageSize
    ) {
      toast(
        "A imagem deve ter no máximo 6 MB."
      );

      return false;
    }

    const reader =
      new FileReader();

    reader.onload =
      event => {
        state.avatar =
          String(
            event.target
              ?.result ||
              ""
          );

        state.avatarName =
          file.name ||
          "";

        save();
        render();

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

    return true;
  }

  function removeAvatar() {
    state.avatar =
      "";

    state.avatarName =
      "";

    save();
    render();

    return true;
  }


  /* =========================================================
     RESET
     ========================================================= */

  function reset() {
    const confirmed =
      window.confirm(
        "Deseja realmente começar uma nova ficha? O rascunho atual será apagado."
      );

    if (
      !confirmed
    ) {
      return false;
    }

    localStorage.removeItem(
      CONFIG.storageKey
    );

    state =
      createDefaultState();

    selectedDie =
      null;

    ensureSkills();

    forceSave();
    render();

    toast(
      "Nova ficha criada."
    );

    return true;
  }


  /* =========================================================
     FINALIZAÇÃO
     ========================================================= */

  function validateBeforeFinish() {
    for (
      let index = 0;
      index <=
      6;
      index++
    ) {
      if (
        !isStepComplete(
          index
        )
      ) {
        state.step =
          index;

        save();
        render();

        toast(
          `Complete "${STEPS[index].name}" antes de finalizar.`
        );

        return false;
      }
    }

    return true;
  }

  function buildCharacter() {
    return {
      ...clone(
        state
      ),

      dice:
        getDiceState(),

      raceData:
        clone(
          getEffectiveRace()
        ),

      effectiveAttributes:
        getEffectiveAttributes(),

      effectiveSkills:
        getEffectiveSkills(),

      combat:
        getCombatData(),

      version:
        11,

      exportedAt:
        new Date().toISOString()
    };
  }

  function finish() {
    if (
      !validateBeforeFinish()
    ) {
      return false;
    }

    const character =
      buildCharacter();

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
        "[AERION] Não foi possível salvar a ficha final:",
        error
      );
    }

    window.AERION_LAST_CHARACTER =
      character;

    window.dispatchEvent(
      new CustomEvent(
        "aerion:ficha:complete",
        {
          detail:
            character
        }
      )
    );

    forceSave();

    toast(
      "Ficha concluída com sucesso!",
      3200
    );

    return true;
  }


  /* =========================================================
     CLICK
     ========================================================= */

  function onClick(
    event
  ) {
    const target =
      event.target;

    if (
      !target
    ) {
      return;
    }


    /* -------------------------------------------------------
       DEVOLVER DADO CLICANDO NO DADO DO ATRIBUTO
       ------------------------------------------------------- */

    const attributeDie =
      target.closest(
        "[data-attribute-die]"
      );

    if (
      attributeDie
    ) {
      const card =
        attributeDie.closest(
          "[data-attribute]"
        ) ||
        attributeDie.closest(
          ".attribute-card"
        );

      const attribute =
        attributeDie.dataset
          .attribute ||

        card?.dataset
          ?.attribute;

      if (
        attribute
      ) {
        returnDie(
          attribute
        );

        return;
      }
    }


    /* -------------------------------------------------------
       DADO DA PISCINA
       ------------------------------------------------------- */

    const die =
      target.closest(
        "[data-die]"
      );

    if (
      die &&
      !attributeDie
    ) {
      const dieId =
        die.dataset.die;

      /*
       * Só seleciona dados livres.
       */
      selectDie(
        dieId
      );

      return;
    }


    /* -------------------------------------------------------
       AÇÃO GERAL
       ------------------------------------------------------- */

    const action =
      target.closest(
        "[data-action]"
      );

    if (
      !action
    ) {
      return;
    }

    switch (
      action.dataset
        .action
    ) {
      case "next":
        nextStep();
        break;

      case "previous":
        previousStep();
        break;

      case "go-step":
        goToStep(
          action.dataset.step
        );
        break;

      case "go-race-index":
        setRaceIndex(
          action.dataset
            .raceIndex
        );
        break;

      case "race-previous":
        previousRace();
        break;

      case "race-next":
        nextRace();
        break;

      case "select-race-current":
        selectCurrentRace();
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

      case "clear-die-selection":
        clearDieSelection();
        break;

      case "power-mode":
        window.AERIONFichaRender?.setPowerMode?.(
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

      case "return-die":
      case "remove-die":
        returnDie(
          action.dataset
            .attribute
        );
        break;

      case "train-skill":
        trainSkill(
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
        addInventoryItem();
        break;

      case "remove-inventory":
        removeInventoryItem(
          action.dataset
            .inventoryId
        );
        break;

      case "remove-avatar":
        removeAvatar();
        break;

      case "new-draft":
        reset();
        break;

      case "finish":
        finish();
        break;
    }
  }


  /* =========================================================
     INPUT
     ========================================================= */

  function onInput(
    event
  ) {
    const element =
      event.target;

    if (
      !element
    ) {
      return;
    }

    switch (
      element.id
    ) {
      case "characterName":
        state.name =
          element.value;

        save();
        render();

        return;

      case "characterAge":
        state.age =
          element.value;

        save();

        return;

      case "characterDescription":
        state.description =
          element.value;

        save();

        return;

      case "characterOrigin":
        state.origin =
          element.value;

        save();

        return;

      case "heightRange":
        setHeight(
          element.value
        );

        return;

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

        save();

        return;

      default:
        break;
    }

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

    if (
      element.matches(
        "[data-inventory-id][data-inventory-field]"
      )
    ) {
      updateInventoryItem(
        element.dataset
          .inventoryId,

        element.dataset
          .inventoryField,

        element.value
      );

      return;
    }
  }


  /* =========================================================
     CHANGE
     ========================================================= */

  function onChange(
    event
  ) {
    const element =
      event.target;

    if (
      !element
    ) {
      return;
    }

    if (
      element.id ===
      "avatarInput"
    ) {
      setAvatar(
        element.files?.[0]
      );

      return;
    }

    if (
      element.name ===
      "gender"
    ) {
      setGender(
        element.value
      );

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
  }


  /* =========================================================
     DRAG START
     ========================================================= */

  function onDragStart(
    event
  ) {
    const element =
      event.target.closest(
        "[data-die]"
      );

    if (
      !element
    ) {
      return;
    }

    /*
     * Dado de atributo não participa
     * da seleção da piscina.
     */
    if (
      element.closest(
        "[data-attribute-die]"
      )
    ) {
      return;
    }

    const dieId =
      element.dataset.die;

    if (
      !isDieAvailable(
        dieId
      )
    ) {
      event.preventDefault();

      return;
    }

    selectedDie =
      dieId;

    element.classList.add(
      "is-dragging"
    );

    if (
      event.dataTransfer
    ) {
      event.dataTransfer.effectAllowed =
        "move";

      event.dataTransfer.setData(
        "text/plain",
        dieId
      );
    }
  }


  /* =========================================================
     DRAG END
     ========================================================= */

  function onDragEnd(
    event
  ) {
    const element =
      event.target.closest(
        "[data-die]"
      );

    if (
      element
    ) {
      element.classList.remove(
        "is-dragging"
      );
    }
  }


  /* =========================================================
     DRAG OVER
     ========================================================= */

  function onDragOver(
    event
  ) {
    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (
      !target
    ) {
      return;
    }

    event.preventDefault();

    target.classList.add(
      "drag-over"
    );

    if (
      event.dataTransfer
    ) {
      event.dataTransfer.dropEffect =
        "move";
    }
  }


  /* =========================================================
     DRAG LEAVE
     ========================================================= */

  function onDragLeave(
    event
  ) {
    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (
      !target
    ) {
      return;
    }

    if (
      target.contains(
        event.relatedTarget
      )
    ) {
      return;
    }

    target.classList.remove(
      "drag-over"
    );
  }


  /* =========================================================
     DROP
     ========================================================= */

  function onDrop(
    event
  ) {
    const target =
      event.target.closest(
        "[data-attribute-drop]"
      );

    if (
      !target
    ) {
      return;
    }

    event.preventDefault();

    target.classList.remove(
      "drag-over"
    );

    const dieId =
      String(
        event.dataTransfer?.getData(
          "text/plain"
        ) ||
          selectedDie ||
          ""
      );

    if (
      !dieId
    ) {
      return;
    }

    assignDie(
      target.dataset
        .attributeDrop,

      dieId
    );
  }


  /* =========================================================
     SALVAMENTO DO CICLO DE VIDA
     ========================================================= */

  function installLifecycleSaving() {
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
      forceSave
    );
  }


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init() {
    const recovered =
      load();

    ensureAttributes();
    ensureSkills();
    ensureTechniques();
    ensureInventory();

    ensureRaceIndex();

    resetAppearanceHeight();

    validatePower();
    validateMana();

    document.addEventListener(
      "click",
      onClick
    );

    document.addEventListener(
      "input",
      onInput
    );

    document.addEventListener(
      "change",
      onChange
    );

    document.addEventListener(
      "dragstart",
      onDragStart
    );

    document.addEventListener(
      "dragend",
      onDragEnd
    );

    document.addEventListener(
      "dragover",
      onDragOver
    );

    document.addEventListener(
      "dragleave",
      onDragLeave
    );

    document.addEventListener(
      "drop",
      onDrop
    );

    installLifecycleSaving();

    render();


    /* =======================================================
       API GLOBAL
       ======================================================= */

    window.AERIONFicha =
      Object.freeze({
        /* ---------------------------------------------------
           CONSTANTES
           --------------------------------------------------- */

        constants: {
          CONFIG,

          STEPS,

          ATTRIBUTES,

          DICE,

          DICE_BY_ID,

          PRIMARY_POWERS,

          PARALLEL_POWERS,

          CLASSES,

          SKILLS,

          RACES,

          ANIMALHA_VARIANTS,

          SIZE_RULES
        },


        /* ---------------------------------------------------
           ESTADO
           --------------------------------------------------- */

        getState:
          getPublicState,

        getCharacter:
          buildCharacter,


        /* ---------------------------------------------------
           SALVAMENTO
           --------------------------------------------------- */

        save:
          forceSave,


        /* ---------------------------------------------------
           RESET / FINALIZAÇÃO
           --------------------------------------------------- */

        reset,

        finish,


        /* ---------------------------------------------------
           NAVEGAÇÃO
           --------------------------------------------------- */

        next:
          nextStep,

        previous:
          previousStep,

        goToStep,


        /* ---------------------------------------------------
           RAÇA
           --------------------------------------------------- */

        selectRace,

        selectCurrentRace,

        nextRace,

        previousRace,

        setRaceIndex,

        selectAnimalha,


        /* ---------------------------------------------------
           APARÊNCIA
           --------------------------------------------------- */

        setHeight,

        setAppearanceField,


        /* ---------------------------------------------------
           CLASSE
           --------------------------------------------------- */

        selectClass,


        /* ---------------------------------------------------
           DADOS
           --------------------------------------------------- */

        selectDie,

        clearDieSelection,

        assignDie,

        assignSelectedDie,

        returnDie,

        swapAttributes,

        isDieAvailable,

        isDieAssigned,

        getDiceState,

        getAssignedAttributeForDie,

        getAttribute,

        getEffectiveAttributes,

        rollAttribute,


        /* ---------------------------------------------------
           PODER
           --------------------------------------------------- */

        rollPower,

        selectParallelPower,


        /* ---------------------------------------------------
           MANA
           --------------------------------------------------- */

        selectMana,


        /* ---------------------------------------------------
           PERÍCIAS
           --------------------------------------------------- */

        trainSkill,

        setSkillBonus,

        getEffectiveSkillBonus,

        getEffectiveSkills,


        /* ---------------------------------------------------
           TÉCNICAS
           --------------------------------------------------- */

        addTechnique,

        updateTechnique,

        removeTechnique,


        /* ---------------------------------------------------
           INVENTÁRIO
           --------------------------------------------------- */

        addInventoryItem,

        updateInventoryItem,

        removeInventoryItem,


        /* ---------------------------------------------------
           IDENTIDADE
           --------------------------------------------------- */

        setName,

        setAge,

        setGender,

        setDescription,

        setOrigin,


        /* ---------------------------------------------------
           AVATAR
           --------------------------------------------------- */

        setAvatar,

        removeAvatar
      });


    window.dispatchEvent(
      new CustomEvent(
        "aerion:ficha:ready"
      )
    );


    console.info(
      "[AERION] ficha.js inicializado.",
      recovered
        ? "Rascunho recuperado."
        : "Novo rascunho."
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