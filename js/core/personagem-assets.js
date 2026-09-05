/* =========================================================
   AERION — PERSONAGEM ASSETS
   js/core/personagem-assets.js

   CATÁLOGO DO EDITOR DE PERSONAGEM

   RESPONSÁVEL POR:
   - raças;
   - imagens das raças;
   - limites de altura;
   - categorias de Animalha;
   - variações de Animalha.

   NÃO RESPONSÁVEL POR:
   - estado da ficha;
   - navegação;
   - atributos;
   - dados;
   - rolagens;
   - persistência;
   - DOM;
   - SVG;
   - montagem de personagem por camadas.

   O personagem-render.js usa este catálogo
   para exibir a imagem da raça selecionada.

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     VERSÃO
     ========================================================= */

  const VERSION = 4;


  /* =========================================================
     UTILITÁRIO
     ========================================================= */

  function normalizeId(value) {
    return String(
      value ?? ""
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
  }


  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }


  /* =========================================================
     RAÇAS
     ========================================================= */

  const RACES = [
    {
      id: "humano",

      name: "Humano",

      description:
        "Versátil e equilibrado, com ampla capacidade de adaptação.",

      profile:
        "Equilibrado",

      feature:
        "Versatilidade",

      height: {
        min: 150,
        max: 200
      },

      images: {
        default:
          "https://i.ibb.co/CsQZXrJ4/file-00000000a044820e93e20f441ff9aa42.png",
        masculino:
          "https://i.ibb.co/TBNmfF0S/file-000000008b74820ea8b432fcf06ed975.png",

        feminino:
          "https://i.ibb.co/LdmxJ2h9/file-000000004b94820ead12a26ca92d75b7.png"
      }
    },


    {
      id: "elfo",

      name: "Elfo",

      description:
        "Povo ágil e perceptivo, ligado à natureza e à magia.",

      profile:
        "Ágil e perceptivo",

      feature:
        "Percepção elevada",

      height: {
        min: 155,
        max: 205
      },

      images: {
        default:
          "https://i.ibb.co/N6D4hdyD/file-000000004494820e92419468e53b58ad.png",
        masculino:
          "https://i.ibb.co/0y8WXSr8/file-00000000495c820e99fc5de509918d90.png",

        feminino:
          "https://i.ibb.co/F1DCc3j/file-00000000dcf8820e883635d6ca9de492.png"
      }
    },


    {
      id: "anao",

      name: "Anão",

      description:
        "Povo compacto e resistente, conhecido por sua robustez.",

      profile:
        "Robusto",

      feature:
        "Resistência",

      height: {
        min: 125,
        max: 155
      },

      images: {
        default:
          "https://i.ibb.co/xq1F8q9C/file-0000000000ec820e8d67352e841e84ea.png",
        masculino:
          "https://i.ibb.co/CySRyjQ/file-000000001824820e952c5a665ae3496f.png",

        feminino:
          "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png"
      }
    },


    {
      id: "orc",

      name: "Orc",

      description:
        "Povo de estrutura poderosa e presença marcante.",

      profile:
        "Forte e robusto",

      feature:
        "Potência física",

      height: {
        min: 175,
        max: 225
      },

      images: {
        default:
          "https://i.ibb.co/xqXqbwFs/file-000000005578820e9d26432eec240610.png",
        masculino:
          "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",

        feminino:
          "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png"
      }
    },


    {
      id: "centauro",

      name: "Centauro",

      description:
        "Povo de anatomia híbrida e grande capacidade física.",

      profile:
        "Potente e resistente",

      feature:
        "Anatomia híbrida",

      height: {
        min: 180,
        max: 230
      },

      images: {
        default:
          "https://i.ibb.co/Xxk02q3j/file-0000000001c0820e8c250521f3ebaa36.png",
        masculino:
          "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",

        feminino:
          "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png"
      }
    },


    {
      id: "vampiro",

      name: "Vampiro",

      description:
        "Ser sobrenatural com grande afinidade com forças vitais.",

      profile:
        "Sobrenatural",

      feature:
        "Natureza vampírica",

      height: {
        min: 150,
        max: 200
      },

      images: {
        default:
          "https://i.ibb.co/Nd3bxJ4D/file-000000000240820e918b34cb14d7341c.png",
        masculino:
          "https://i.ibb.co/PGFcNRXZ/file-0000000019dc820ea49a893a9831ffeb.png",

        feminino:
          "https://i.ibb.co/Kpx8jh0j/file-000000008cfc820e827a7b8376d3fd55.png"
      }
    },


    {
      id: "duende",

      name: "Duende",

      description:
        "Pequeno povo conhecido por sua astúcia e adaptação.",

      profile:
        "Ágil e astuto",

      feature:
        "Pequeno porte",

      height: {
        min: 100,
        max: 145
      },

      images: {
        default:
          "https://i.ibb.co/dJGGF020/file-00000000b558820eb554e4ed4e4c1d8e.png",
        masculino:
          "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",

        feminino:
          "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png"
      }
    },


    {
      id: "fada",

      name: "Fada",

      description:
        "Ser feérico associado à magia e às forças sobrenaturais.",

      profile:
        "Leve e ágil",

      feature:
        "Afinidade feérica",

      height: {
        min: 90,
        max: 140
      },

      images: {
        default:
          "https://i.ibb.co/1Ydtj7kR/file-00000000a078820ea7f4378c17213990.png",
        masculino:
          "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",

        feminino:
          "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png"
      }
    },


    {
      id: "povo_aquatico",

      name: "Povo Aquático",

      description:
        "Povo adaptado a ambientes aquáticos.",

      profile:
        "Adaptado à água",

      feature:
        "Adaptação aquática",

      height: {
        min: 145,
        max: 205
      },

      images: {
        default:
          "https://i.ibb.co/21YMb2Ck/file-000000005990820e8e187f0c1f1d3ea0.png",
        masculino:
          "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png",

        feminino:
          "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png"
      }
    },


    {
      id: "povo_nuvens",

      name: "Povo das Nuvens",

      description:
        "Povo associado aos céus e às regiões elevadas.",

      profile:
        "Leve",

      feature:
        "Afinidade aérea",

      height: {
        min: 145,
        max: 200
      },

      images: {
        default:
          "https://i.ibb.co/ZRYMgWT0/file-000000003d40820ebd6f5085181f81a1.png",
        masculino:
          "https://i.ibb.co/4gMPMqkp/file-00000000e4b0820eab531990258bbb09.png",

        feminino:
          "https://i.ibb.co/7d0b1Z65/file-000000001b7c820e8a317d79973c8733.png"
      },

      legacy: true
    },


    {
      id: "animalha",

      name: "Animalha",

      description:
        "Humanoide de linhagem animal com características próprias.",

      profile:
        "Definido pela linhagem animal",

      feature:
        "Características animais",

      height: {
        min: 140,
        max: 220
      },

      images: {
        masculino:
          "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",

        feminino:
          "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea284e54236c00052.png"
      },

      lineage:
        "animalha"
    },


    {
      id: "povo_natureza",

      name: "Povo da Natureza",

      description:
        "Povo ligado à natureza e às suas forças.",

      profile:
        "Ligado à natureza",

      feature:
        "Afinidade natural",

      height: {
        min: 140,
        max: 205
      },

      images: {
        default:
          "https://i.ibb.co/jPZB1nFj/file-00000000c328820e829c7cb243630284.png",
        masculino:
          "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",

        feminino:
          "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png"
      }
    },


    {
      id: "neraliano",

      name: "Neraliano",

      description:
        "Povo adaptado a ambientes aquáticos e costeiros.",

      profile:
        "Adaptável",

      feature:
        "Afinidade aquática",

      height: {
        min: 145,
        max: 205
      },

      images: {
        default:
          "https://i.ibb.co/GQ7kbMGW/file-00000000d2f0820e811464dec04fd349.png",
        masculino:
          "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png",

        feminino:
          "https://i.ibb.co/k2ND7Tbp/file-000000003cb0820e842b5d0997ee34f5.png"
      }
    },


    {
      id: "aureano",

      name: "Aureano",

      description:
        "Povo de forte presença e características singulares.",

      profile:
        "Equilibrado",

      feature:
        "Características especiais",

      height: {
        min: 150,
        max: 205
      },

      images: {
        default:
          "https://i.ibb.co/W47hKBR2/file-000000000d84820eb2dee739ed2732a8.png",
        masculino: "",
        feminino: ""
      },

      imagesPending: true
    },


    /* =====================================================
       COLOSSO
       =====================================================

       A entrada foi restaurada para não perder
       a raça do catálogo.

       Os arquivos de imagem originais não estão
       mais presentes no catálogo atual do GitHub,
       portanto NÃO foi inventada uma URL.
       ===================================================== */

    {
      id: "colosso",

      name: "Colosso",

      description:
        "Raça de porte colossal e presença física dominante.",

      profile:
        "Colossal",

      feature:
        "Grande porte",

      height: {
        min: 220,
        max: 320
      },

      images: {
        default:
          "https://i.ibb.co/rGKgrxqj/file-000000008d3c820eb66807cb6d182dd1.png",
        masculino: "https://i.ibb.co/nsfrDpmy/file-000000003eb4820ebb3f101b2dc9f0f3.png",
        feminino: "https://i.ibb.co/BVqsDV4Y/file-00000000639c820e85562494fed2f3d6.png"
      },

      imagesPending: true
    },


    /* =====================================================
       TROLL
       ===================================================== */

    {
      id: "troll",

      name: "Troll",

      description:
        "Raça robusta de grande porte e extraordinária resistência.",

      profile:
        "Resistente",

      feature:
        "Regeneração e robustez",

      height: {
        min: 200,
        max: 280
      },

      images: {
        default:
          "https://i.ibb.co/3yVxP0yH/file-00000000ba5c820e8b50474e9ee8e38b.png",
        masculino: "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",
        feminino: "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png"
      },

      imagesPending: true
    }

  ];


  /* =========================================================
     CATEGORIAS DE ANIMALHA
     ========================================================= */

  const ANIMALHA_CATEGORIES = [
    {
      id: "voadores",

      name: "Voadores",

      description:
        "Linhagens com características aéreas.",

      icon: "◇"
    },

    {
      id: "terrestres",

      name: "Terrestres",

      description:
        "Linhagens adaptadas ao ambiente terrestre.",

      icon: "◇"
    },

    {
      id: "marinhos",

      name: "Marinhos",

      description:
        "Linhagens adaptadas ao ambiente aquático.",

      icon: "◇"
    },

    {
      id: "reptilianos",

      name: "Reptilianos",

      description:
        "Linhagens de origem reptiliana.",

      icon: "◇"
    },

    {
      id: "pequenos",

      name: "Pequenos",

      description:
        "Linhagens de pequeno porte.",

      icon: "◇"
    },

    {
      id: "grandes",

      name: "Grandes",

      description:
        "Linhagens de grande porte.",

      icon: "◇"
    }
  ];


  /* =========================================================
     VARIAÇÕES DE ANIMALHA
     ========================================================= */

  const ANIMALHA_ANIMALS = {

    gato: {
      id: "gato",
      name: "Gato",
      category: "terrestres",
      lineage: "felino"
    },

    pantera: {
      id: "pantera",
      name: "Pantera",
      category: "terrestres",
      lineage: "felino"
    },

    tigre: {
      id: "tigre",
      name: "Tigre",
      category: "terrestres",
      lineage: "felino"
    },

    leao: {
      id: "leao",
      name: "Leão",
      category: "terrestres",
      lineage: "felino"
    },

    lobo: {
      id: "lobo",
      name: "Lobo",
      category: "terrestres",
      lineage: "canino"
    },

    raposa: {
      id: "raposa",
      name: "Raposa",
      category: "terrestres",
      lineage: "canino"
    },

    urso: {
      id: "urso",
      name: "Urso",
      category: "grandes",
      lineage: "ursino"
    },

    falcao: {
      id: "falcao",
      name: "Falcão",
      category: "voadores",
      lineage: "ave"
    },

    aguia: {
      id: "aguia",
      name: "Águia",
      category: "voadores",
      lineage: "ave"
    },

    coruja: {
      id: "coruja",
      name: "Coruja",
      category: "voadores",
      lineage: "ave"
    },

    cobra: {
      id: "cobra",
      name: "Cobra",
      category: "reptilianos",
      lineage: "reptil"
    },

    crocodilo: {
      id: "crocodilo",
      name: "Crocodilo",
      category: "marinhos",
      lineage: "reptil"
    },

    tubarao: {
      id: "tubarao",
      name: "Tubarão",
      category: "marinhos",
      lineage: "aquatico"
    },

    foca: {
      id: "foca",
      name: "Foca",
      category: "marinhos",
      lineage: "aquatico"
    }
  };


  /* =========================================================
     BUSCAR RAÇA
     ========================================================= */

  function getRace(
    raceId
  ) {
    const id =
      normalizeId(
        raceId
      );

    return (
      RACES.find(
        race =>
          normalizeId(
            race.id
          ) === id
      ) ||
      null
    );
  }


  /* =========================================================
     BUSCAR IMAGEM DA RAÇA
     ========================================================= */

  function getRaceImage(
    raceId,
    gender
  ) {
    const race =
      getRace(
        raceId
      );

    if (!race) {
      return "";
    }


    const normalizedGender =
      normalizeId(
        gender
      );

    const genderKey =
      (
        normalizedGender ===
          "feminino" ||
        normalizedGender ===
          "feminina" ||
        normalizedGender ===
          "female" ||
        normalizedGender ===
          "f"
      )
        ? "feminino"
        : "masculino";


    /*
     * Primeiro gênero solicitado.
     */
    const selected =
      race.images?.[
        genderKey
      ];

    if (selected) {
      return selected;
    }


    /*
     * Depois tenta o outro gênero.
     */
    const fallback =
      genderKey ===
        "feminino"
        ? race.images?.masculino
        : race.images?.feminino;

    return (
      fallback ||
      ""
    );
  }


  /* =========================================================
     ALTURA DA RAÇA
     ========================================================= */

  function getRaceHeight(
    raceId
  ) {
    const race =
      getRace(
        raceId
      );

    if (!race) {
      return {
        min: 150,
        max: 200
      };
    }

    return {
      min:
        Number(
          race.height?.min
        ) || 150,

      max:
        Number(
          race.height?.max
        ) || 200
    };
  }


  /* =========================================================
     CATEGORIA ANIMALHA
     ========================================================= */

  function getAnimalhaCategory(
    categoryId
  ) {
    const id =
      normalizeId(
        categoryId
      );

    return (
      ANIMALHA_CATEGORIES.find(
        category =>
          normalizeId(
            category.id
          ) === id
      ) ||
      null
    );
  }


  /* =========================================================
     ANIMALHAS DE UMA CATEGORIA
     ========================================================= */

  function getAnimalhaAnimals(
    categoryId = ""
  ) {
    const id =
      normalizeId(
        categoryId
      );

    const all =
      Object.values(
        ANIMALHA_ANIMALS
      );


    if (!id) {
      return clone(
        all
      );
    }


    return clone(
      all.filter(
        animal =>
          normalizeId(
            animal.category
          ) === id
      )
    );
  }


  /* =========================================================
     BUSCAR ANIMALHA
     ========================================================= */

  function getAnimalha(
    animalId
  ) {
    const id =
      normalizeId(
        animalId
      );

    return (
      ANIMALHA_ANIMALS[id] ||
      null
    );
  }


  /* =========================================================
     VERIFICAR RAÇA
     ========================================================= */

  function hasRace(
    raceId
  ) {
    return Boolean(
      getRace(
        raceId
      )
    );
  }


  /* =========================================================
     VERIFICAR ANIMALHA
     ========================================================= */

  function hasAnimalha(
    animalId
  ) {
    return Boolean(
      getAnimalha(
        animalId
      )
    );
  }


  /* =========================================================
     API
     ========================================================= */

  const API = Object.freeze({

    version:
      VERSION,

    races:
      RACES,

    animalhaCategories:
      ANIMALHA_CATEGORIES,

    animalhaAnimals:
      ANIMALHA_ANIMALS,

    getRace,

    getRaceImage,

    getRaceHeight,

    getAnimalhaCategory,

    getAnimalhaAnimals,

    getAnimalha,

    hasRace,

    hasAnimalha
  });


  /* =========================================================
     EXPORTAÇÃO
     ========================================================= */

  window.AERIONPersonagemAssets =
    API;

  window.AERION_CHARACTER_ASSETS =
    API;

  /*
   * Compatibilidade.
   */
  window.AERION_RACES =
    RACES;


  /* =========================================================
     EVENTO
     ========================================================= */

  window.dispatchEvent(
    new CustomEvent(
      "aerion:personagem-assets:ready",
      {
        detail: {
          version:
            API.version,

          raceCount:
            RACES.length,

          animalhaCategoryCount:
            ANIMALHA_CATEGORIES.length,

          animalhaCount:
            Object.keys(
              ANIMALHA_ANIMALS
            ).length
        }
      }
    )
  );


  /* =========================================================
     LOG
     ========================================================= */

  console.info(
    "[AERION][ASSETS] Catálogo carregado.",
    {
      version:
        API.version,

      races:
        RACES.length,

      animalhaCategories:
        ANIMALHA_CATEGORIES.length,

      animalhaAnimals:
        Object.keys(
          ANIMALHA_ANIMALS
        ).length
    }
  );

})();
