/* =========================================================
   AERION — PERSONAGEM ASSETS
   Catálogo oficial de raças e linhagens Animalha do editor.
   ========================================================= */

(() => {
  "use strict";

  const VERSION = 8;

  function normalizeId(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* =========================================================
     RAÇAS
     ---------------------------------------------------------
     Os 20 primeiros links recebidos neste lote foram organizados
     como 10 pares: masculino + feminino.
     As cinco raças restantes mantêm suas imagens-base anteriores
     até que seus novos pares sejam fornecidos.
     ========================================================= */

  const RACES = [
    {
      images: {
        default: "https://i.ibb.co/2Yp1J01b/file-00000000510c820eb14e273763781ffd.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/t5M1BgJ/file-000000007c58820e8a4c084fb8542cae.png"
      }      }
    },
    {
      images: {
        default: "https://i.ibb.co/chRQM94X/file-00000000e93c820e9e75478047b40f16.png"
      }le-000000001824820e952c5a665ae3496f.png",
        feminino: "https://i.ibb.co/hJh4XYXM/file-00000000a4fc820e9bd0551b2472e125.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/7xwq3YW4/file-0000000004cc820ea14f552665c417de.png"
      }     feature: "Potência física",
      height: { min: 175, max: 225 },
      lifespan: { min: 14, max: 75 },
      images: {
        default: "https://i.ibb.co/xqXqbwFs/file-000000005578820e9d26432eec240610.png",
        masculino: "https://i.ibb.co/ch4shzym/file-00000000e724820ebbe72fa63e4e81e3.png",
        feminino: "https://i.ibb.co/ksjBsffv/file-00000000decc820e9cd0c4ace952b82c.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/zhG5JGyp/file-000000008c0c820e8ad3b4bddcf5764c.png"
      }      id: "centauro",
      name: "Centauro",
      description: "Povo de anatomia híbrida e grande capacidade física.",
      profile: "Potente e resistente",
      feature: "Anatomia híbrida",
      height: { min: 180, max: 230 },
      lifespan: { min: 16, max: 100 },
      images: {
        default: "https://i.ibb.co/Xxk02q3j/file-0000000001c0820e8c250521f3ebaa36.png",
        masculino: "https://i.ibb.co/5WckT8kZ/file-000000007e1c820ebec26e736b57ba50.png",
        feminino: "https://i.ibb.co/hFCDFvN2/file-00000000e5c8820ebb67aa67f2d7a1b8.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/60Fnbymf/file-0000000061b0820e8d6f930def5eedb9.png"
      }      id: "vampiro",
      name: "Vampiro",
      description: "Ser sobrenatural com grande afinidade com forças vitais.",
      profile: "Sobrenatural",
      feature: "Natureza vampírica",
      height: { min: 150, max: 200 },
      lifespan: { min: 18, max: 500 },
      images: {
        default: "https://i.ibb.co/Nd3bxJ4D/file-000000000240820e918b34cb14d7341c.png",
        masculino: "https://i.ibb.co/PGFcNRXZ/file-0000000019dc820ea49a893a9831ffeb.png",
        feminino: "https://i.ibb.co/Kpx8jh0j/file-000000008cfc820e827a7b8376d3fd55.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/MXFmZPV/file-000000009fc8820eb5e47afc003f8d8a.png"
      }      id: "duende",
      name: "Duende",
      description: "Pequeno povo conhecido por sua astúcia e adaptação.",
      profile: "Ágil e astuto",
      feature: "Pequeno porte",
      height: { min: 100, max: 145 },
      lifespan: { min: 12, max: 120 },
      images: {
        default: "https://i.ibb.co/dJGGF020/file-00000000b558820eb554e4ed4e4c1d8e.png",
        masculino: "https://i.ibb.co/0pCbh0Dq/file-00000000d1ec820eb0c562669244c953.png",
        feminino: "https://i.ibb.co/G3dGmfBg/file-000000001ce8820ea3db1f6c8da1c8dd.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/HpGV9WV1/file-000000008aa8820ebf6e6b32135dc292.png"
      }      id: "fada",
      name: "Fada",
      description: "Ser feérico associado à magia e às forças sobrenaturais.",
      profile: "Leve e ágil",
      feature: "Afinidade feérica",
      height: { min: 90, max: 140 },
      lifespan: { min: 10, max: 300 },
      images: {
        default: "https://i.ibb.co/1Ydtj7kR/file-00000000a078820ea7f4378c17213990.png",
        masculino: "https://i.ibb.co/BVqsDV4Y/file-00000000639c820e85562494fed2f3d6.png",
        feminino: "https://i.ibb.co/nsfrDpmy/file-000000003eb4820ebb3f101b2dc9f0f3.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/gb1dwyq2/file-00000000a8f8820ea79c8c2115362a81.png"
      }      id: "povo_aquatico",
      name: "Povo Aquático",
      description: "Povo adaptado a ambientes aquáticos.",
      profile: "Adaptado à água",
      feature: "Adaptação aquática",
      height: { min: 145, max: 205 },
      lifespan: { min: 16, max: 120 },
      images: {
        default: "https://i.ibb.co/21YMb2Ck/file-000000005990820e8e187f0c1f1d3ea0.png",
        masculino: "https://i.ibb.co/kVKz2xjq/file-000000008c00820ebf7da3010a79bf7c.png",
        feminino: "https://i.ibb.co/jPysnZz1/file-00000000f014820e954413d3d309ae96.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/M51Tm6cw/file-0000000092dc820ea8776498f264996b.png"
      }      id: "povo_nuvens",
      name: "Povo das Nuvens",
      description: "Povo associado aos céus e às regiões elevadas.",
      profile: "Leve",
      feature: "Afinidade aérea",
      height: { min: 145, max: 200 },
      lifespan: { min: 16, max: 150 },
      images: {
        default: "https://i.ibb.co/ZRYMgWT0/file-000000003d40820ebd6f5085181f81a1.png",
        masculino: "https://i.ibb.co/SDQqHjSj/file-00000000779c820ea18c5cf3ce6529b7.png",
        feminino: "https://i.ibb.co/nsCyckYB/file-0000000089f0820e89d6953c4857240c.png"
      }
    },
    {
      images: {
        default: "https://i.ibb.co/v6JTzHG3/file-00000000f5d4820eb5b794068352ae82.png"
      }    {
      id: "animalha",
      name: "Animalha",
      description: "Humanoide de linhagem animal com características físicas próprias.",
      profile: "Definido pela linhagem animal",
      feature: "Características animais",
      height: { min: 140, max: 220 },
      lifespan: { min: 1, max: 100 },
      images: {},
      lineage: "animalha"
    },

      id: "povo_natureza",
      name: "Povo da Natureza",
      description: "Povo ligado à natureza e às suas forças.",
      profile: "Ligado à natureza",
      feature: "Afinidade natural",
      height: { min: 140, max: 205 },
      lifespan: { min: 15, max: 180 },
      images: {
        default: "https://i.ibb.co/jPZB1nFj/file-00000000c328820e829c7cb243630284.png"
      },
      imagesPending: true
    },
    {
      images: {
        default: "https://i.ibb.co/jPL8rwx4/file-000000005ebc820e97f528c06b313de7.png"
      }      id: "neraliano",
      name: "Neraliano",
      description: "Povo adaptado a ambientes aquáticos e costeiros.",
      profile: "Adaptável",
      feature: "Afinidade aquática",
      height: { min: 145, max: 205 },
      lifespan: { min: 16, max: 130 },
      images: {
        default: "https://i.ibb.co/GQ7kbMGW/file-00000000d2f0820e811464dec04fd349.png"
      },
      imagesPending: true
    },
    {
      id: "aureano",
      name: "Aureano",
      description: "Povo de forte presença e características singulares.",
      profile: "Equilibrado",
      feature: "Características especiais",
      height: { min: 150, max: 205 },
      lifespan: { min: 18, max: 220 },
      images: {},
      imagesPending: true
    },
    {
      images: {
        default: "https://i.ibb.co/RGDpDKGK/file-00000000a700820e959a65d93cf8831e.png"
      }      id: "colosso",
      name: "Colosso",
      description: "Raça de porte colossal e presença física dominante.",
      profile: "Colossal",
      feature: "Grande porte",
      height: { min: 220, max: 320 },
      lifespan: { min: 20, max: 180 },
      images: {
        default: "https://i.ibb.co/rGKgrxqj/file-000000008d3c820eb66807cb6d182dd1.png"
      },
      imagesPending: true
    },
    {
      images: {
        default: "https://i.ibb.co/WW7dJLzV/file-00000000039c820eac63bd8ff75f96db.png"
      }      id: "troll",
      name: "Troll",
      description: "Raça robusta de grande porte e extraordinária resistência.",
      profile: "Resistente",
      feature: "Regeneração e robustez",
      height: { min: 200, max: 280 },
      lifespan: { min: 15, max: 120 },
      images: {
        default: "https://i.ibb.co/3yVxP0yH/file-00000000ba5c820e8b50474e9ee8e38b.png"
      },
      imagesPending: true
    }
  ];

  /* =========================================================
     ANIMALHA
     ---------------------------------------------------------
     As oito imagens finais do lote foram separadas das raças
     normais. Somente FEMININO foi recebido neste lote.
     A ordem recebida foi aplicada às oito primeiras linhagens:
     Gato, Pantera, Tigre, Leão, Lobo, Raposa, Urso, Falcão.
     ========================================================= */

  const ANIMALHA_CATEGORIES = [
    { id: "voadores", name: "Voadores", description: "Linhagens com características aéreas.", icon: "◇" },
    { id: "terrestres", name: "Terrestres", description: "Linhagens adaptadas ao ambiente terrestre.", icon: "◇" },
    { id: "marinhos", name: "Marinhos", description: "Linhagens adaptadas ao ambiente aquático.", icon: "◇" },
    { id: "reptilianos", name: "Reptilianos", description: "Linhagens de origem reptiliana.", icon: "◇" },
    { id: "pequenos", name: "Pequenos", description: "Linhagens de pequeno porte.", icon: "◇" },
    { id: "grandes", name: "Grandes", description: "Linhagens de grande porte.", icon: "◇" }
  ];

  const ANIMALHA_ANIMALS = {
    gato: { id: "gato", name: "Gato", category: "terrestres", lineage: "felino", lifespan: { min: 15, max: 22 } },
    pantera: { id: "pantera", name: "Pantera", category: "terrestres", lineage: "felino", lifespan: { min: 12, max: 18 } },
    tigre: { id: "tigre", name: "Tigre", category: "terrestres", lineage: "felino", lifespan: { min: 10, max: 18 } },
    leao: { id: "leao", name: "Leão", category: "terrestres", lineage: "felino", lifespan: { min: 15, max: 22 } },
    lobo: { id: "lobo", name: "Lobo", category: "terrestres", lineage: "canino", lifespan: { min: 8, max: 15 } },
    raposa: { id: "raposa", name: "Raposa", category: "terrestres", lineage: "canino", lifespan: { min: 8, max: 14 } },
    urso: { id: "urso", name: "Urso", category: "grandes", lineage: "ursino", lifespan: { min: 20, max: 35 } },
    falcao: { id: "falcao", name: "Falcão", category: "voadores", lineage: "ave", lifespan: { min: 12, max: 25 } },
    aguia: { id: "aguia", name: "Águia", category: "voadores", lineage: "ave", lifespan: { min: 20, max: 35 } },
    coruja: { id: "coruja", name: "Coruja", category: "voadores", lineage: "ave", lifespan: { min: 10, max: 25 } },
    cobra: { id: "cobra", name: "Cobra", category: "reptilianos", lineage: "reptil", lifespan: { min: 10, max: 30 } },
    crocodilo: { id: "crocodilo", name: "Crocodilo", category: "marinhos", lineage: "reptil", lifespan: { min: 50, max: 80 } },
    tubarao: { id: "tubarao", name: "Tubarão", category: "marinhos", lineage: "aquatico", lifespan: { min: 20, max: 70 } }
  };

  const ANIMALHA_IMAGES = {
    masculino: {},
    feminino: {
      gato: "https://i.ibb.co/7d0b1Z65/file-000000001b7c820e8a317d79973c8733.png",
      pantera: "https://i.ibb.co/4gMPMqkp/file-00000000e4b0820eab531990258bbb09.png",
      tigre: "https://i.ibb.co/zW6JnjPb/file-000000007a70820ea18c5cf3ce6529b7.png",
      leao: "https://i.ibb.co/fVfFL5ds/file-00000000b344820e9e39f31e92678a13.png",
      lobo: "https://i.ibb.co/23GdF2Py/file-000000001e48820ebbfa246147f05c6f.png",
      raposa: "https://i.ibb.co/gFFk7Kyv/file-00000000a170820eaf15f8650242c3c9.png",
      urso: "https://i.ibb.co/JjycKsGL/file-000000000d84820eb2dee739ed2732a8.png",
      falcao: "https://i.ibb.co/CpkBqzkC/file-00000000dee8820eb4f157009c1ceb5b.png"
    }
  };

  function getRace(raceId) {
    const id = normalizeId(raceId);
    return RACES.find((race) => normalizeId(race.id) === id) || null;
  }

  function getAnimalha(animalId) {
    const id = normalizeId(animalId);
    return ANIMALHA_ANIMALS[id] || null;
  }

  function getRaceImage(raceId, gender) {
    const race = getRace(raceId);
    if (!race) return "";

    if (race.id === "animalha") return "";

    const genderKey =
      ["feminino", "feminina", "female", "f"].includes(normalizeId(gender))
        ? "feminino"
        : "masculino";

    return race.images?.[genderKey] || race.images?.default || "";
  }

  function getAnimalhaImage(animalId, gender) {
    const animal = getAnimalha(animalId);
    if (!animal) return "";

    const genderKey =
      normalizeId(gender) === "feminino"
        ? "feminino"
        : "masculino";

    return ANIMALHA_IMAGES?.[genderKey]?.[animal.id] || "";
  }

  function getRaceHeight(raceId) {
    const race = getRace(raceId);
    if (!race) return { min: 150, max: 200 };
    return {
      min: Number(race.height?.min) || 150,
      max: Number(race.height?.max) || 200
    };
  }

  function getAgeRange(raceId, animalhaId = "") {
    const race = getRace(raceId);

    if (race?.id === "animalha") {
      const animal = getAnimalha(animalhaId);
      if (animal?.lifespan) {
        return {
          min: Number(animal.lifespan.min) || 1,
          max: Number(animal.lifespan.max) || 100
        };
      }
    }

    if (race?.lifespan) {
      return {
        min: Number(race.lifespan.min) || 1,
        max: Number(race.lifespan.max) || 100
      };
    }

    return { min: 1, max: 100 };
  }

  function getAnimalhaCategory(categoryId) {
    const id = normalizeId(categoryId);
    return ANIMALHA_CATEGORIES.find(
      (category) => normalizeId(category.id) === id
    ) || null;
  }

  function getAnimalhaAnimals(categoryId = "") {
    const id = normalizeId(categoryId);
    const all = Object.values(ANIMALHA_ANIMALS);

    if (!id) return clone(all);

    return clone(
      all.filter(
        (animal) => normalizeId(animal.category) === id
      )
    );
  }

  const API = Object.freeze({
    version: VERSION,
    races: RACES,
    animalhaCategories: ANIMALHA_CATEGORIES,
    animalhaAnimals: ANIMALHA_ANIMALS,
    ANIMALHA_IMAGES,
    getRace,
    getRaceImage,
    getAnimalhaImage,
    getRaceHeight,
    getAgeRange,
    getAnimalhaCategory,
    getAnimalhaAnimals,
    getAnimalha,
    hasRace: (raceId) => Boolean(getRace(raceId)),
    hasAnimalha: (animalId) => Boolean(getAnimalha(animalId))
  });

  window.AERIONPersonagemAssets = API;
  window.AERION_CHARACTER_ASSETS = API;
  window.AERION_RACES = RACES;

  window.dispatchEvent(
    new CustomEvent("aerion:personagem-assets:ready", {
      detail: {
        version: API.version,
        raceCount: RACES.length,
        animalhaCategoryCount: ANIMALHA_CATEGORIES.length,
        animalhaCount: Object.keys(ANIMALHA_ANIMALS).length
      }
    })
  );

  console.info("[AERION][ASSETS] Catálogo carregado.", {
    version: API.version,
    races: RACES.length,
    animalhaCategories: ANIMALHA_CATEGORIES.length,
    animalhaAnimals: Object.keys(ANIMALHA_ANIMALS).length
  });
})();