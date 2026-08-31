/* =========================================================
   AERION — FICHA RENDER
   js/core/ficha-render.js

   RESPONSABILIDADE:
   - Renderização visual da ficha
   - Raças
   - Animalha
   - Aparência
   - Classes
   - Atributos
   - Poder
   - Mana
   - Perícias
   - Técnicas
   - Inventário
   - Revisão
   - Navegação
   - Estados visuais

   NÃO RESPONSÁVEL POR:
   - Regras dos dados
   - Seleção de dados
   - Distribuição dos dados
   - Rolagem dos dados
   - IDs dos dados
   - Validação dos dados

   ========================================================= */

(() => {
  "use strict";


  /* =========================================================
     ESTADO
     ========================================================= */

  let lastState = null;


  /* =========================================================
     DOM
     ========================================================= */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(
      root.querySelectorAll(selector)
    );
  }


  /* =========================================================
     UTILITÁRIOS
     ========================================================= */

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }


  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }


  function formatHeight(cm) {
    const value = Number(cm);

    if (!Number.isFinite(value)) {
      return "—";
    }

    return `${(value / 100).toFixed(2)} m`;
  }


  function formatSigned(value) {
    const number =
      Number(value) || 0;

    if (number > 0) {
      return `+${number}`;
    }

    return String(number);
  }


  function getCore() {
    return window.AERIONFicha || null;
  }


  function getConstants(name) {
    return (
      getCore()?.constants?.[name] ||
      []
    );
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function toast(
    message,
    duration = 2200
  ) {
    let element =
      $("#toast");

    if (!element) {
      element =
        document.createElement(
          "div"
        );

      element.id =
        "toast";

      element.className =
        "toast";

      document.body.appendChild(
        element
      );
    }

    element.textContent =
      String(message);

    element.hidden =
      false;

    clearTimeout(
      element.__aerionTimer
    );

    element.__aerionTimer =
      setTimeout(() => {
        element.hidden =
          true;
      }, duration);
  }


  /* =========================================================
     AVISO ACESSÍVEL
     ========================================================= */

  function announce(message) {
    let live =
      $("#aerionLiveRegion");

    if (!live) {
      live =
        document.createElement(
          "div"
        );

      live.id =
        "aerionLiveRegion";

      live.className =
        "visually-hidden";

      live.setAttribute(
        "aria-live",
        "polite"
      );

      live.setAttribute(
        "aria-atomic",
        "true"
      );

      document.body.appendChild(
        live
      );
    }

    live.textContent =
      String(message);
  }


  /* =========================================================
     CATÁLOGO DE RAÇAS
     
     O ficha.js procura RACES dentro deste módulo.
     
     Caso no futuro o projeto tenha um arquivo próprio
     de dados de raça, ele poderá substituir este catálogo
     automaticamente através de window.AERION_RACES.
     ========================================================= */

  const FALLBACK_RACES = [

    {
      id:
        "humano",

      name:
        "Humano",

      description:
        "Versátil e equilibrado, com ampla capacidade de adaptação.",

      profile:
        "Equilibrado",

      feature:
        "Versatilidade",

      size:
        "medio",

      height:
        {
          min:
            150,

          max:
            200
        },

      flight:
        false,

      modifiers:
        {}
    },


    {
      id:
        "elfo",

      name:
        "Elfo",

      description:
        "Povo ágil e perceptivo, ligado à natureza e à magia.",

      profile:
        "Ágil e perceptivo",

      feature:
        "Percepção elevada",

      size:
        "medio",

      height:
        {
          min:
            155,

          max:
            205
        },

      flight:
        false,

      modifiers:
        {
          percepcao:
            1,

          agilidade:
            1
        }
    },


    {
      id:
        "anao",

      name:
        "Anão",

      description:
        "Povo compacto e resistente, conhecido por sua robustez.",

      profile:
        "Robusto",

      feature:
        "Resistência",

      size:
        "pequeno",

      height:
        {
          min:
            125,

          max:
            155
        },

      flight:
        false,

      modifiers:
        {
          vigor:
            1
        }
    },


    {
      id:
        "orc",

      name:
        "Orc",

      description:
        "Corpo poderoso e presença marcante.",

      profile:
        "Forte e robusto",

      feature:
        "Potência física",

      size:
        "grande",

      height:
        {
          min:
            175,

          max:
            225
        },

      flight:
        false,

      modifiers:
        {
          forca:
            1,

          vigor:
            1
        }
    },


    {
      id:
        "fada",

      name:
        "Fada",

      description:
        "Ser feérico capaz de manipular forças sobrenaturais.",

      profile:
        "Leve e ágil",

      feature:
        "Asas feéricas",

      size:
        "pequeno",

      height:
        {
          min:
            90,

          max:
            140
        },

      flight:
        true,

      modifiers:
        {
          agilidade:
            1,

          controle:
            1
        }
    },


    {
      id:
        "animalha",

      name:
        "Animalha",

      description:
        "Humanoides com características animais integradas à anatomia.",

      profile:
        "Definido pela linhagem animal",

      feature:
        "Características animais",

      size:
        "medio",

      height:
        {
          min:
            140,

          max:
            220
        },

      flight:
        false,

      modifiers:
        {}
    },


    {
      id:
        "vampiro",

      name:
        "Vampiro",

      description:
        "Ser sobrenatural com grande afinidade com forças vitais.",

      profile:
        "Sobrenatural",

      feature:
        "Natureza vampírica",

      size:
        "medio",

      height:
        {
          min:
            150,

          max:
            200
        },

      flight:
        false,

      modifiers:
        {
          percepcao:
            1,

          presenca:
            1
        }
    },


    {
      id:
        "centauro",

      name:
        "Centauro",

      description:
        "Humanoide de anatomia híbrida e grande capacidade física.",

      profile:
        "Potente e resistente",

      feature:
        "Anatomia híbrida",

      size:
        "grande",

      height:
        {
          min:
            180,

          max:
            230
        },

      flight:
        false,

      modifiers:
        {
          forca:
            1,

          vigor:
            1
        }
    },


    {
      id:
        "duende",

      name:
        "Duende",

      description:
        "Pequeno povo conhecido por sua astúcia e adaptação.",

      profile:
        "Ágil e astuto",

      feature:
        "Pequeno porte",

      size:
        "pequeno",

      height:
        {
          min:
            100,

          max:
            145
        },

      flight:
        false,

      modifiers:
        {
          agilidade:
            1
        }
    },


    {
      id:
        "povo_aquatico",

      name:
        "Povo Aquático",

      description:
        "Povo adaptado a ambientes aquáticos.",

      profile:
        "Adaptado à água",

      feature:
        "Adaptação aquática",

      size:
        "medio",

      height:
        {
          min:
            145,

          max:
            205
        },

      flight:
        false,

      modifiers:
        {
          vigor:
            1
        }
    },


    {
      id:
        "povo_natureza",

      name:
        "Povo da Natureza",

      description:
        "Seres ligados às forças naturais do mundo.",

      profile:
        "Ligado à natureza",

      feature:
        "Afinidade natural",

      size:
        "medio",

      height:
        {
          min:
            140,

          max:
            205
        },

      flight:
        false,

      modifiers:
        {
          controle:
            1
        }
    },


    {
      id:
        "neraliano",

      name:
        "Neraliano",

      description:
        "Povo adaptado a ambientes aquáticos e costeiros.",

      profile:
        "Adaptável",

      feature:
        "Afinidade aquática",

      size:
        "medio",

      height:
        {
          min:
            145,

          max:
            205
        },

      flight:
        false,

      modifiers:
        {
          vigor:
            1,

          percepcao:
            1
        }
    },


    {
      id:
        "aureano",

      name:
        "Aureano",

      description:
        "Povo de forte presença e características singulares.",

      profile:
        "Equilibrado",

      feature:
        "Afinidade especial",

      size:
        "medio",

      height:
        {
          min:
            150,

          max:
            205
        },

      flight:
        false,

      modifiers:
        {
          presenca:
            1
        }
    },


    {
      id:
        "povo_nuvens",

      name:
        "Povo das Nuvens",

      description:
        "Povo leve associado aos céus e às regiões elevadas.",

      profile:
        "Leve",

      feature:
        "Afinidade aérea",

      size:
        "medio",

      height:
        {
          min:
            145,

          max:
            200
        },

      flight:
        true,

      modifiers:
        {
          agilidade:
            1
        }
    },


    {
      id:
        "colosso",

      name:
        "Colosso",

      description:
        "Ser de proporções extraordinárias e grande presença física.",

      profile:
        "Gigantesco",

      feature:
        "Grande porte",

      size:
        "colossal",

      height:
        {
          min:
            250,

          max:
            400
        },

      flight:
        true,

      modifiers:
        {
          vigor:
            2,

          forca:
            1
        }
    },


    {
      id:
        "troll",

      name:
        "Troll",

      description:
        "Criatura de grande resistência e estrutura corporal robusta.",

      profile:
        "Muito resistente",

      feature:
        "Resistência natural",

      size:
        "grande",

      height:
        {
          min:
            190,

          max:
            270
        },

      flight:
        false,

      modifiers:
        {
          vigor:
            2
        }
    }
  ];


  /*
   * Se uma versão futura do projeto disponibilizar
   * window.AERION_RACES, utilizaremos esse catálogo.
   */

  function getRaceCatalog() {

    if (
      Array.isArray(
        window.AERION_RACES
      ) &&
      window.AERION_RACES.length
    ) {
      return window.AERION_RACES;
    }

    return FALLBACK_RACES;
  }


  const RACES =
    getRaceCatalog();


  /* =========================================================
     ANIMALHA
     ========================================================= */

  const ANIMALHA_VARIANTS = [

    {
      id:
        "pantera",

      name:
        "Pantera",

      category:
        "Terrestres",

      profile:
        "Velocidade, furtividade e percepção.",

      modifiers:
        {
          agilidade:
            1,

          percepcao:
            1
        },

      size:
        "medio",

      height:
        {
          min:
            150,

          max:
            200
        }
    },


    {
      id:
        "tigre",

      name:
        "Tigre",

      category:
        "Terrestres",

      profile:
        "Força explosiva e mobilidade.",

      modifiers:
        {
          forca:
            1,

          agilidade:
            1
        },

      size:
        "grande",

      height:
        {
          min:
            165,

          max:
            220
        }
    },


    {
      id:
        "leao",

      name:
        "Leão",

      category:
        "Terrestres",

      profile:
        "Força e presença.",

      modifiers:
        {
          forca:
            1,

          presenca:
            1
        },

      size:
        "grande",

      height:
        {
          min:
            170,

          max:
            225
        }
    },


    {
      id:
        "gato",

      name:
        "Gato",

      category:
        "Terrestres",

      profile:
        "Agilidade e percepção.",

      modifiers:
        {
          agilidade:
            1,

          percepcao:
            1
        },

      size:
        "pequeno",

      height:
        {
          min:
            135,

          max:
            180
        }
    },


    {
      id:
        "lobo",

      name:
        "Lobo",

      category:
        "Terrestres",

      profile:
        "Percepção, resistência e rastreamento.",

      modifiers:
        {
          percepcao:
            1,

          vigor:
            1
        },

      size:
        "medio",

      height:
        {
          min:
            150,

          max:
            205
        }
    },


    {
      id:
        "raposa",

      name:
        "Raposa",

      category:
        "Terrestres",

      profile:
        "Agilidade, astúcia e percepção.",

      modifiers:
        {
          agilidade:
            1,

          intelecto:
            1
        },

      size:
        "pequeno",

      height:
        {
          min:
            125,

          max:
            175
        }
    },


    {
      id:
        "falcao",

      name:
        "Falcão",

      category:
        "Voadores",

      profile:
        "Percepção e precisão.",

      modifiers:
        {
          percepcao:
            1,

          precisao:
            1
        },

      size:
        "medio",

      height:
        {
          min:
            145,

          max:
            195
        },

      flight:
        true
    },


    {
      id:
        "aguia",

      name:
        "Águia",

      category:
        "Voadores",

      profile:
        "Percepção aguçada e precisão.",

      modifiers:
        {
          percepcao:
            1,

          precisao:
            1
        },

      size:
        "medio",

      height:
        {
          min:
            150,

          max:
            210
        },

      flight:
        true
    },


    {
      id:
        "coruja",

      name:
        "Coruja",

      category:
        "Voadores",

      profile:
        "Percepção e intelecto.",

      modifiers:
        {
          percepcao:
            1,

          intelecto:
            1
        },

      size:
        "pequeno",

      height:
        {
          min:
            120,

          max:
            175
        },

      flight:
        true
    },


    {
      id:
        "cobra",

      name:
        "Cobra",

      category:
        "Pequenos",

      profile:
        "Precisão e percepção.",

      modifiers:
        {
          precisao:
            1,

          percepcao:
            1
        },

      size:
        "pequeno",

      height:
        {
          min:
            120,

          max:
            170
        }
    },


    {
      id:
        "urso",

      name:
        "Urso",

      category:
        "Grandes",

      profile:
        "Força e vigor.",

      modifiers:
        {
          forca:
            1,

          vigor:
            1
        },

      size:
        "grande",

      height:
        {
          min:
            175,

          max:
            240
        }
    },


    {
      id:
        "rinoceronte",

      name:
        "Rinoceronte",

      category:
        "Grandes",

      profile:
        "Resistência e potência.",

      modifiers:
        {
          vigor:
            2
        },

      size:
        "grande",

      height:
        {
          min:
            185,

          max:
            250
        }
    },


    {
      id:
        "hipopotamo",

      name:
        "Hipopótamo",

      category:
        "Marinhos",

      profile:
        "Vigor e força.",

      modifiers:
        {
          vigor:
            1,

          forca:
            1
        },

      size:
        "grande",

      height:
        {
          min:
            180,

          max:
            240
        }
    },


    {
      id:
        "crocodilo",

      name:
        "Crocodilo",

      category:
        "Marinhos",

      profile:
        "Força e resistência.",

      modifiers:
        {
          forca:
            1,

          vigor:
            1
        },

      size:
        "grande",

      height:
        {
          min:
            175,

          max:
            240
        }
    },


    {
      id:
        "tubarao",

      name:
        "Tubarão",

      category:
        "Marinhos",

      profile:
        "Vigor e percepção.",

      modifiers:
        {
          vigor:
            1,

          percepcao:
            1
        },

      size:
        "grande",

      height:
        {
          min:
            170,

          max:
            235
        }
    },


    {
      id:
        "foca",

      name:
        "Foca",

      category:
        "Marinhos",

      profile:
        "Vigor e adaptação.",

      modifiers:
        {
          vigor:
            1,

          agilidade:
            1
        },

      size:
        "medio",

      height:
        {
          min:
            145,

          max:
            195
        }
    }
  ];


  /* =========================================================
     CLASSES
     ========================================================= */

  const CLASSES = {

    guerreiro: {

      id:
        "guerreiro",

      name:
        "Guerreiro",

      role:
        "Combatente",

      skillBonuses:
        {
          atletismo:
            1,

          tatica:
            1
        }
    },


    feiticeiro: {

      id:
        "feiticeiro",

      name:
        "Feiticeiro",

      role:
        "Mágico",

      skillBonuses:
        {
          conhecimento:
            1,

          controle_mana:
            1
        }
    },


    curandeiro: {

      id:
        "curandeiro",

      name:
        "Curandeiro",

      role:
        "Suporte",

      skillBonuses:
        {
          medicina:
            1,

          intuicao:
            1
        }
    },


    monge: {

      id:
        "monge",

      name:
        "Monge",

      role:
        "Marcial",

      skillBonuses:
        {
          atletismo:
            1,

          controle_mana:
            1
        }
    }
  };


  /* =========================================================
     ATRIBUTOS
     ========================================================= */

  const ATTRIBUTES = [

    {
      id:
        "forca",

      name:
        "Força"
    },

    {
      id:
        "vigor",

      name:
        "Vigor"
    },

    {
      id:
        "agilidade",

      name:
        "Agilidade"
    },

    {
      id:
        "precisao",

      name:
        "Precisão"
    },

    {
      id:
        "intelecto",

      name:
        "Intelecto"
    },

    {
      id:
        "controle",

      name:
        "Controle"
    },

    {
      id:
        "presenca",

      name:
        "Presença"
    },

    {
      id:
        "percepcao",

      name:
        "Percepção"
    }
  ];


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  const SKILLS = {

    acrobacia: {
      id:
        "acrobacia",

      name:
        "Acrobacia",

      description:
        "Equilíbrio e movimentos rápidos."
    },

    atletismo: {
      id:
        "atletismo",

      name:
        "Atletismo",

      description:
        "Esforço físico, corrida e escalada."
    },

    furtividade: {
      id:
        "furtividade",

      name:
        "Furtividade",

      description:
        "Mover-se sem chamar atenção."
    },

    percepcao: {
      id:
        "percepcao",

      name:
        "Percepção",

      description:
        "Perceber detalhes, ameaças e mudanças."
    },

    investigacao: {
      id:
        "investigacao",

      name:
        "Investigação",

      description:
        "Analisar pistas e informações."
    },

    conhecimento: {
      id:
        "conhecimento",

      name:
        "Conhecimento",

      description:
        "Conhecimentos gerais e especializados."
    },

    medicina: {
      id:
        "medicina",

      name:
        "Medicina",

      description:
        "Tratamento e primeiros socorros."
    },

    sobrevivencia: {
      id:
        "sobrevivencia",

      name:
        "Sobrevivência",

      description:
        "Exploração, rastreamento e adaptação."
    },

    persuasao: {
      id:
        "persuasao",

      name:
        "Persuasão",

      description:
        "Convencer e negociar."
    },

    intuicao: {
      id:
        "intuicao",

      name:
        "Intuição",

      description:
        "Perceber intenções."
    },

    enganacao: {
      id:
        "enganacao",

      name:
        "Enganação",

      description:
        "Blefes e disfarces."
    },

    tatica: {
      id:
        "tatica",

      name:
        "Tática",

      description:
        "Planejamento e leitura de combate."
    },

    oficio: {
      id:
        "oficio",

      name:
        "Ofício",

      description:
        "Construção e reparo."
    },

    controle_mana: {
      id:
        "controle_mana",

      name:
        "Controle de Mana",

      description:
        "Precisão na manipulação de Mana."
    }
  };


  /* =========================================================
     PODERES
     ========================================================= */

  const PRIMARY_POWERS = [
    "Fogo",
    "Ar",
    "Terra",
    "Água"
  ];


  const PARALLEL_POWERS = [
    "Gelo",
    "Magnetismo",
    "Vegetação",
    "Tecnologia",
    "Gravidade",
    "Som"
  ];


  /* =========================================================
     RESOLUÇÃO DA RAÇA ATUAL
     ========================================================= */

  function getSelectedRace() {

    if (
      !lastState
    ) {
      return null;
    }

    const index =
      Number(
        lastState.raceIndex
      ) || 0;


    return (
      RACES[index] ||
      RACES.find(
        race =>
          race.id ===
          lastState.race
      ) ||
      null
    );
  }


  function getEffectiveRace() {

    const selected =
      getSelectedRace();


    if (
      !selected
    ) {
      return null;
    }


    if (
      selected.id !==
      "animalha"
    ) {
      return selected;
    }


    const animal =
      ANIMALHA_VARIANTS.find(
        variant =>
          variant.id ===
          lastState.animalha
      );


    if (
      !animal
    ) {
      return selected;
    }


    return {

      ...selected,

      id:
        `animalha:${animal.id}`,

      name:
        `Animalha — ${animal.name}`,

      profile:
        animal.profile ||
        selected.profile,

      size:
        animal.size ||
        selected.size,

      height:
        animal.height ||
        selected.height,

      flight:
        Boolean(
          animal.flight ||
          selected.flight
        ),

      modifiers: {

        ...(selected.modifiers ||
          {}),

        ...(animal.modifiers ||
          {})
      }
    };
  }


  /* =========================================================
     IMAGENS
     ========================================================= */

  function makeFallbackImage(
    name
  ) {

    const safe =
      escapeHtml(
        name
      );


    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="720"
        height="720"
        viewBox="0 0 720 720"
      >

        <defs>

          <radialGradient
            id="g"
            cx="50%"
            cy="35%"
          >

            <stop
              offset="0%"
              stop-color="#302b25"
            />

            <stop
              offset="100%"
              stop-color="#0d0c0b"
            />

          </radialGradient>

        </defs>


        <rect
          width="720"
          height="720"
          fill="url(#g)"
        />


        <circle
          cx="360"
          cy="245"
          r="85"
          fill="#948a7d"
        />


        <path
          d="
            M245 350
            Q360 295 475 350
            L510 565
            Q360 620 210 565
            Z
          "
          fill="#49443d"
        />


        <path
          d="
            M245 395
            Q175 450 190 535
          "
          fill="none"
          stroke="#a99c8d"
          stroke-width="34"
          stroke-linecap="round"
        />


        <path
          d="
            M475 395
            Q545 450 530 535
          "
          fill="none"
          stroke="#a99c8d"
          stroke-width="34"
          stroke-linecap="round"
        />


        <path
          d="
            M315 545
            L300 660
          "
          stroke="#38342f"
          stroke-width="46"
          stroke-linecap="round"
        />


        <path
          d="
            M405 545
            L420 660
          "
          stroke="#38342f"
          stroke-width="46"
          stroke-linecap="round"
        />


        <text
          x="360"
          y="695"
          text-anchor="middle"
          fill="#d8b45a"
          font-family="Georgia,serif"
          font-size="24"
        >
          ${safe}
        </text>

      </svg>
    `;


    return (
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(
        svg
      )
    );
  }


  function resolveRaceImage(
    race
  ) {

    if (
      !race
    ) {
      return "";
    }


    const gender =
      lastState?.gender;


    if (
      race.images
    ) {

      if (
        gender ===
          "feminino" &&
        race.images.female
      ) {
        return race.images.female;
      }


      if (
        gender ===
          "masculino" &&
        race.images.male
      ) {
        return race.images.male;
      }
    }


    if (
      gender ===
        "feminino" &&
      race.female
    ) {
      return race.female;
    }


    if (
      gender ===
        "masculino" &&
      race.male
    ) {
      return race.male;
    }


    if (
      gender ===
        "feminino" &&
      race.imageFemale
    ) {
      return race.imageFemale;
    }


    if (
      gender ===
        "masculino" &&
      race.imageMale
    ) {
      return race.imageMale;
    }


    if (
      race.image
    ) {

      if (
        typeof race.image ===
        "string"
      ) {
        return race.image;
      }


      if (
        gender ===
          "feminino" &&
        race.image.female
      ) {
        return race.image.female;
      }


      if (
        gender ===
          "masculino" &&
        race.image.male
      ) {
        return race.image.male;
      }
    }


    return makeFallbackImage(
      race.name
    );
  }


  function updateImageSource(
    image,
    source,
    alt
  ) {

    if (
      !image
    ) {
      return;
    }


    const wrapper =
      image.closest(
        ".race-image-wrap"
      );


    if (
      source
    ) {

      image.hidden =
        false;

      image.alt =
        alt ||
        "";


      if (
        image.dataset.src ===
        source &&
        image.complete
      ) {
        return;
      }


      image.dataset.src =
        source;


      image.classList.remove(
        "image-error",
        "image-loaded"
      );

      image.classList.add(
        "image-loading"
      );


      if (
        wrapper
      ) {
        wrapper.classList.add(
          "is-loading"
        );

        wrapper.classList.remove(
          "is-error"
        );
      }


      image.onload =
        () => {

          image.classList.remove(
            "image-loading"
          );

          image.classList.add(
            "image-loaded"
          );


          if (
            wrapper
          ) {
            wrapper.classList.remove(
              "is-loading",
              "is-error"
            );
          }
        };


      image.onerror =
        () => {

          /*
           * Primeira tentativa falhou.
           * Usamos uma imagem SVG local em
           * vez de deixar o ícone quebrado.
           */

          const fallback =
            makeFallbackImage(
              alt
            );


          if (
            image.dataset.fallbackApplied !==
            source
          ) {

            image.dataset.fallbackApplied =
              source;


            image.dataset.src =
              fallback;

            image.src =
              fallback;


            return;
          }


          image.classList.remove(
            "image-loading"
          );

          image.classList.add(
            "image-error"
          );


          if (
            wrapper
          ) {
            wrapper.classList.remove(
              "is-loading"
            );

            wrapper.classList.add(
              "is-error"
            );
          }
        };


      image.src =
        source;

      return;
    }


    image.hidden =
      true;
  }


  /* =========================================================
     PROGRESSO
     ========================================================= */

  function isStepComplete(
    index
  ) {

    if (
      !lastState
    ) {
      return false;
    }


    switch (
      index
    ) {

      case 0:

        return Boolean(
          String(
            lastState.name ||
              ""
          ).trim()
        ) &&
          Boolean(
            lastState.gender
          );


      case 1:

        return Boolean(
          lastState.race
        );


      case 2:

        return Boolean(
          lastState.appearance
            ?.height
        );


      case 3:

        return Boolean(
          lastState.class
        );


      case 4:

        return Boolean(
          lastState.effectiveAttributes
        ) &&
          Object.values(
            lastState.effectiveAttributes
          ).every(
            value =>
              Boolean(
                value?.dieId ||
                value?.die
              )
          );


      case 5:

        return Boolean(
          lastState.power
        );


      case 6:

        return (
          lastState.mana ===
          "azul"
        );


      case 10:

        return (
          isStepComplete(0) &&
          isStepComplete(1) &&
          isStepComplete(2) &&
          isStepComplete(3) &&
          isStepComplete(4) &&
          isStepComplete(5) &&
          isStepComplete(6)
        );


      default:

        return false;
    }
  }


  function isStepUnlocked(
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


  function renderProgress() {

    const current =
      Number(
        lastState?.step
      ) || 0;


    const percent =
      Number(
        lastState?.progress
          ?.percent
      ) || 0;


    const bar =
      $(
        "#progressBar"
      );


    if (
      bar
    ) {

      bar.style.width =
        `${Math.max(
          0,
          Math.min(
            100,
            percent
          )
        )}%`;


      bar.setAttribute(
        "aria-valuenow",
        String(
          percent
        )
      );
    }


    const percentEl =
      $(
        "#progressPercent"
      );


    if (
      percentEl
    ) {
      percentEl.textContent =
        `${Math.round(
          percent
        )}%`;
    }


    const title =
      lastState?.steps?.[
        current
      ]?.name ||
      "Identidade";


    const titleEl =
      $(
        "#progressTitle"
      );


    if (
      titleEl
    ) {
      titleEl.textContent =
        title;
    }


    $$(".creation-step")
      .forEach(
        (
          button,
          index
        ) => {

          const active =
            index ===
            current;


          const complete =
            isStepComplete(
              index
            );


          const unlocked =
            isStepUnlocked(
              index
            );


          button.classList.toggle(
            "active",
            active
          );

          button.classList.toggle(
            "is-active",
            active
          );

          button.classList.toggle(
            "complete",
            complete
          );

          button.classList.toggle(
            "is-complete",
            complete
          );

          button.classList.toggle(
            "locked",
            !unlocked
          );


          button.disabled =
            !unlocked;


          if (
            active
          ) {
            button.setAttribute(
              "aria-current",
              "step"
            );
          } else {
            button.removeAttribute(
              "aria-current"
            );
          }
        }
      );
  }


  /* =========================================================
     PAINÉIS
     ========================================================= */

  function renderPanels() {

    const current =
      Number(
        lastState?.step
      ) || 0;


    (
      lastState?.steps ||
      []
    ).forEach(
      (
        step,
        index
      ) => {

        const panel =
          $(
            `.creation-panel[data-panel="${step.id}"]`
          );


        if (
          !panel
        ) {
          return;
        }


        const active =
          index ===
          current;


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
     IDENTIDADE
     ========================================================= */

  function renderIdentity() {

    setInput(
      "#characterName",
      lastState?.name
    );


    setInput(
      "#characterAge",
      lastState?.age
    );


    setInput(
      "#characterDescription",
      lastState?.description
    );


    setInput(
      "#characterOrigin",
      lastState?.origin
    );


    $$( 
      'input[name="gender"]'
    ).forEach(
      radio => {

        radio.checked =
          radio.value ===
          lastState?.gender;
      }
    );
  }


  function setInput(
    selector,
    value
  ) {

    const element =
      $(selector);


    if (
      !element
    ) {
      return;
    }


    if (
      document.activeElement ===
      element
    ) {
      return;
    }


    element.value =
      value ??
      "";
  }


  /* =========================================================
     AVATAR
     ========================================================= */

  function renderAvatar() {

    const avatar =
      lastState?.avatar ||
      "";


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
        avatar
      ) {

        image.src =
          avatar;

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
          avatar
        );
    }


    if (
      remove
    ) {

      remove.disabled =
        !Boolean(
          avatar
        );
    }
  }


  /* =========================================================
     RAÇA
     ========================================================= */

  function renderRace() {

    const race =
      getSelectedRace();


    if (
      !race
    ) {
      return;
    }


    const image =
      $("#raceImage");


    const source =
      resolveRaceImage(
        race
      );


    updateImageSource(
      image,
      source,
      race.name
    );


    const name =
      $("#raceName");


    if (
      name
    ) {
      name.textContent =
        race.name;
    }


    const description =
      $("#raceShortDescription");


    if (
      description
    ) {
      description.textContent =
        race.description ||
        "";
    }


    const profile =
      $(
        "[data-race-profile]"
      );


    if (
      profile
    ) {
      profile.textContent =
        race.profile ||
        "—";
    }


    const feature =
      $(
        "[data-race-feature]"
      );


    if (
      feature
    ) {
      feature.textContent =
        race.feature ||
        "—";
    }


    const selected =
      $(
        "#raceSelectedText"
      );


    if (
      selected
    ) {

      selected.textContent =
        lastState?.race ===
        race.id
          ? "✓ Selecionada"
          : "Selecionar";
    }


    const selectedButton =
      $(
        '[data-action="select-race-current"]'
      );


    if (
      selectedButton
    ) {

      const isSelected =
        lastState?.race ===
        race.id;


      selectedButton.classList.toggle(
        "selected",
        isSelected
      );


      selectedButton.classList.toggle(
        "active",
        isSelected
      );


      selectedButton.setAttribute(
        "aria-pressed",
        String(
          isSelected
        )
      );
    }


    renderRaceDots();


    renderRaceDescription(
      race
    );
  }


  function renderRaceDots() {

    const root =
      $("#raceDots");


    if (
      !root
    ) {
      return;
    }


    root.innerHTML =
      "";


    const current =
      Number(
        lastState?.raceIndex
      ) || 0;


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


        button.dataset.action =
          "go-race-index";


        button.dataset.raceIndex =
          String(
            index
          );


        button.className =
          "race-dot";


        button.classList.toggle(
          "is-active",
          index ===
          current
        );


        button.classList.toggle(
          "active",
          index ===
          current
        );


        button.setAttribute(
          "aria-label",
          race.name
        );


        button.title =
          race.name;


        root.appendChild(
          button
        );
      }
    );
  }


  function renderRaceDescription(
    race
  ) {

    const container =
      $("#raceDescription");


    if (
      !container
    ) {
      return;
    }


    const title =
      $("#raceDescriptionTitle");


    const text =
      $("#raceDescriptionText");


    if (
      title
    ) {
      title.textContent =
        race.name;
    }


    if (
      text
    ) {

      const parts =
        [];


      if (
        race.description
      ) {
        parts.push(
          race.description
        );
      }


      if (
        race.profile
      ) {
        parts.push(
          `Perfil natural: ${race.profile}`
        );
      }


      if (
        race.feature
      ) {
        parts.push(
          `Característica: ${race.feature}`
        );
      }


      if (
        race.height
      ) {

        parts.push(
          `Altura: ${formatHeight(
            race.height.min
          )} — ${formatHeight(
            race.height.max
          )}`
        );
      }


      text.textContent =
        parts.join(
          " "
        );
    }
  }


  /* =========================================================
     ANIMALHA
     ========================================================= */

  function renderAnimalha() {

    const container =
      $(
        "[data-animalha-variants]"
      );


    if (
      !container
    ) {
      return;
    }


    if (
      lastState?.race !==
      "animalha"
    ) {

      container.hidden =
        true;

      return;
    }


    container.hidden =
      false;


    renderAnimalhaCategories();


    renderAnimalhaAnimals();
  }


  function groupAnimalhaByCategory() {

    const groups =
      {};


    ANIMALHA_VARIANTS.forEach(
      variant => {

        const key =
          normalize(
            variant.category
          );


        if (
          !groups[key]
        ) {
          groups[key] =
            {
              id:
                key,

              name:
                variant.category,

              items:
                []
            };
        }


        groups[key].items.push(
          variant
        );
      }
    );


    return Object.values(
      groups
    );
  }


  function renderAnimalhaCategories() {

    const root =
      $(
        "[data-animalha-categories]"
      );


    if (
      !root
    ) {
      return;
    }


    root.innerHTML =
      "";


    groupAnimalhaByCategory()
      .forEach(
        category => {

          const button =
            document.createElement(
              "button"
            );


          button.type =
            "button";


          button.className =
            "animalha-category-card";


          button.dataset.action =
            "select-animalha-category";


          button.dataset.animalhaCategory =
            category.id;


          button.innerHTML = `
            <span
              class="animalha-category-icon"
              aria-hidden="true"
            >
              ${getAnimalIcon(
                category.name
              )}
            </span>

            <strong>
              ${escapeHtml(
                category.name
              )}
            </strong>

            <small>
              ${category.items.length}
              linhagem${category.items.length === 1 ? "" : "s"}
            </small>
          `;


          root.appendChild(
            button
          );
        }
      );
  }


  function getAnimalIcon(
    category
  ) {

    const value =
      normalize(
        category
      );


    if (
      value.includes(
        "voador"
      )
    ) {
      return "◇";
    }


    if (
      value.includes(
        "marinho"
      )
    ) {
      return "≈";
    }


    if (
      value.includes(
        "pequeno"
      )
    ) {
      return "•";
    }


    if (
      value.includes(
        "grande"
      )
    ) {
      return "◆";
    }


    return "✦";
  }


  function renderAnimalhaAnimals() {

    const root =
      $(
        "[data-animalha-grid]"
      );


    if (
      !root
    ) {
      return;
    }


    const selected =
      lastState?.animalha ||
      "";


    root.innerHTML =
      "";


    ANIMALHA_VARIANTS.forEach(
      variant => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "animalha-variant-card";


        button.classList.toggle(
          "selected",
          selected ===
          variant.id
        );


        button.dataset.action =
          "select-animalha";


        button.dataset.animalha =
          variant.id;


        button.innerHTML = `
          <span
            class="animalha-variant-icon"
            aria-hidden="true"
          >
            ${getAnimalIcon(
              variant.category
            )}
          </span>

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
        `;


        root.appendChild(
          button
        );
      }
    );
  }


  /* =========================================================
     APARÊNCIA
     ========================================================= */

  function renderAppearance() {

    const appearance =
      lastState?.appearance ||
      {};


    const race =
      getEffectiveRace();


    const min =
      Number(
        race?.height?.min
      ) || 140;


    const max =
      Number(
        race?.height?.max
      ) || 200;


    let current =
      Number(
        appearance.height
      );


    if (
      !Number.isFinite(
        current
      )
    ) {
      current =
        Math.round(
          (
            min +
            max
          ) /
          2
        );
    }


    current =
      Math.max(
        min,
        Math.min(
          max,
          current
        )
      );


    const range =
      $("#heightRange");


    if (
      range
    ) {

      range.min =
        String(
          min
        );

      range.max =
        String(
          max
        );

      range.value =
        String(
          current
        );
    }


    const value =
      $("#appearanceHeightValue");


    if (
      value
    ) {
      value.textContent =
        formatHeight(
          current
        );
    }


    const limits =
      $("#appearanceHeightLimits");


    if (
      limits
    ) {

      limits.textContent =
        `${formatHeight(
          min
        )} — ${formatHeight(
          max
        )}`;
    }


    const minLabel =
      $("#appearanceMinLabel");


    if (
      minLabel
    ) {
      minLabel.textContent =
        `${min} cm`;
    }


    const maxLabel =
      $("#appearanceMaxLabel");


    if (
      maxLabel
    ) {
      maxLabel.textContent =
        `${max} cm`;
    }


    const flight =
      $(
        "[data-flight-status]"
      );


    if (
      flight
    ) {

      const canFly =
        Boolean(
          race?.flight
        );


      flight.textContent =
        canFly
          ? "Voo disponível"
          : "Voo indisponível";


      flight.classList.toggle(
        "available",
        canFly
      );
    }


    setInput(
      "#hair",
      appearance.hair
    );


    setInput(
      "#eyes",
      appearance.eyes
    );


    setInput(
      "#skin",
      appearance.skin
    );


    setInput(
      "#clothing",
      appearance.clothing
    );


    setInput(
      "#scars",
      appearance.scars
    );


    setInput(
      "#tattoos",
      appearance.tattoos
    );


    setInput(
      "#physicalNotes",
      appearance.physicalNotes
    );
  }


  /* =========================================================
     CLASSE
     ========================================================= */

  function renderClasses() {

    $$(".class-card")
      .forEach(
        card => {

          const id =
            card.dataset.class;


          const data =
            CLASSES[id];


          const selected =
            id ===
            lastState?.class;


          card.classList.toggle(
            "selected",
            selected
          );


          card.classList.toggle(
            "active",
            selected
          );


          card.setAttribute(
            "aria-pressed",
            String(
              selected
            )
          );


          if (
            !data
          ) {
            return;
          }


          const bonus =
            card.querySelector(
              "[data-class-bonus]"
            );


          if (
            bonus
          ) {

            const values =
              Object.entries(
                data.skillBonuses ||
                {}
              )
                .map(
                  ([
                    skillId,
                    amount
                  ]) => {

                    const skill =
                      SKILLS[
                        skillId
                      ];


                    return skill
                      ? `${skill.name} +${amount}`
                      : "";
                  }
                )
                .filter(
                  Boolean
                );


            bonus.textContent =
              values.join(
                " • "
              );
          }
        }
      );
  }


  /* =========================================================
     DADOS
     ========================================================= */

  function renderAttributes() {

    renderDice();

    renderAttributeCards();

    renderRadar();
  }


  function renderDice() {

    const root =
      $(
        "[data-dice-pool]"
      );


    if (
      !root
    ) {
      return;
    }


    const dice =
      Array.isArray(
        lastState?.dice
      )
        ? lastState.dice
        : [];


    root.innerHTML =
      "";


    dice.forEach(
      die => {

        if (
          die.assigned
        ) {
          return;
        }


        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "dice-card";


        button.dataset.die =
          die.id;


        button.dataset.dieType =
          die.type ||
          "";


        button.dataset.dieSides =
          String(
            die.sides ||
            ""
          );


        button.draggable =
          true;


        button.classList.toggle(
          "dice-selected",
          lastState?.selectedDie ===
          die.id
        );


        button.setAttribute(
          "aria-label",
          `D${die.sides}`
        );


        button.innerHTML = `
          <span
            class="dice-icon"
            aria-hidden="true"
          >

            <svg
              class="dice-svg"
              viewBox="0 0 100 100"
            >

              <polygon
                points="
                  50,5
                  90,28
                  90,72
                  50,95
                  10,72
                  10,28
                "
                fill="none"
                stroke="currentColor"
                stroke-width="5"
                stroke-linejoin="round"
              />

            </svg>

            <span>
              D${die.sides}
            </span>

          </span>
        `;


        root.appendChild(
          button
        );
      }
    );


    if (
      !root.children.length
    ) {

      const empty =
        document.createElement(
          "div"
        );


      empty.className =
        "dice-pool-empty";


      empty.textContent =
        "Todos os dados estão atribuídos.";


      root.appendChild(
        empty
      );
    }
  }


  function renderAttributeCards() {

    const attributes =
      lastState?.effectiveAttributes ||
      {};


    $$(".attribute-card")
      .forEach(
        card => {

          const id =
            card.dataset.attribute;


          const data =
            attributes[id];


          if (
            !data
          ) {
            return;
          }


          const dieId =
            data.dieId ||
            data.die ||
            null;


          const sides =
            Number(
              data.sides
            ) || 0;


          card.classList.toggle(
            "has-die",
            Boolean(
              dieId
            )
          );


          card.classList.toggle(
            "has-result",
            Boolean(
              data.rolled
            )
          );


          const dieSlot =
            card.querySelector(
              "[data-attribute-die]"
            );


          if (
            dieSlot
          ) {

            dieSlot.dataset.die =
              dieId ||
              "";


            dieSlot.dataset.attribute =
              id;


            if (
              dieId
            ) {

              dieSlot.innerHTML = `
                <button
                  type="button"
                  class="attribute-die-button"
                  data-action="return-die"
                  data-attribute="${escapeHtml(
                    id
                  )}"
                  title="Devolver D${sides}"
                  aria-label="Devolver D${sides}"
                >

                  <span
                    class="attribute-die-icon"
                    aria-hidden="true"
                  >

                    <svg
                      viewBox="0 0 100 100"
                      class="dice-svg"
                    >

                      <polygon
                        points="
                          50,5
                          90,28
                          90,72
                          50,95
                          10,72
                          10,28
                        "
                        fill="none"
                        stroke="currentColor"
                        stroke-width="5"
                        stroke-linejoin="round"
                      />

                    </svg>

                    <span>
                      D${sides}
                    </span>

                  </span>

                </button>
              `;

            } else {

              dieSlot.innerHTML = `
                <span
                  class="attribute-empty-die"
                >
                  Colocar dado
                </span>
              `;
            }
          }


          const value =
            card.querySelector(
              "[data-attribute-value]"
            );


          if (
            value
          ) {
            value.textContent =
              data.total ??
              "—";
          }


          const modifier =
            card.querySelector(
              "[data-attribute-modifier]"
            );


          if (
            modifier
          ) {

            const amount =
              Number(
                data.racialModifier
              ) || 0;


            modifier.textContent =
              formatSigned(
                amount
              );


            modifier.classList.toggle(
              "positive",
              amount >
              0
            );


            modifier.classList.toggle(
              "negative",
              amount <
              0
            );
          }


          const result =
            card.querySelector(
              "[data-attribute-result]"
            );


          if (
            result
          ) {

            result.textContent =
              data.rolled
                ? `${data.roll} ${formatSigned(
                    data.racialModifier
                  )} = ${data.total}`
                : "";
          }


          const rollButton =
            card.querySelector(
              '[data-action="roll-attribute"]'
            );


          if (
            rollButton
          ) {
            rollButton.disabled =
              !dieId;
          }
        }
      );
  }


  function renderRadar() {

    const root =
      $(
        "[data-attribute-radar]"
      );


    if (
      !root
    ) {
      return;
    }


    const attributes =
      lastState?.effectiveAttributes ||
      {};


    const values =
      ATTRIBUTES.map(
        attribute =>
          Math.max(
            0,
            Number(
              attributes[
                attribute.id
              ]?.total
            ) || 0
          )
      );


    const maximum =
      Math.max(
        1,
        ...values
      );


    const center =
      210;


    const radius =
      150;


    const count =
      ATTRIBUTES.length;


    function point(
      index,
      distance
    ) {

      const angle =
        (
          360 /
          count
        ) *
        index -
        90;


      const radians =
        angle *
        Math.PI /
        180;


      return [

        center +
          Math.cos(
            radians
          ) *
          distance,

        center +
          Math.sin(
            radians
          ) *
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

      const polygon =
        ATTRIBUTES
          .map(
            (
              _,
              index
            ) =>
              point(
                index,
                radius *
                (
                  level /
                  4
                )
              ).join(",")
          )
          .join(" ");


      grid += `
        <polygon
          points="${polygon}"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          opacity=".16"
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
            stroke-width="1"
            opacity=".13"
          />
        `;
      }
    );


    const polygon =
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
      ATTRIBUTES
        .map(
          (
            attribute,
            index
          ) => {

            const [
              x,
              y
            ] =
              point(
                index,
                radius +
                30
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
                  attribute.name
                )}
              </text>
            `;
          }
        )
        .join("");


    root.innerHTML = `
      <svg
        class="radar-svg"
        viewBox="0 0 420 420"
        role="img"
        aria-label="Perfil dos atributos"
      >

        ${grid}

        <polygon
          class="radar-value"
          points="${polygon}"
        />

        ${labels}

      </svg>
    `;
  }


  /* =========================================================
     PODER
     ========================================================= */

  function renderPower() {

    const current =
      $(
        "[data-power-current]"
      );


    if (
      current
    ) {
      current.textContent =
        lastState?.power ||
        "Nenhum poder escolhido";
    }


    const result =
      $(
        "[data-power-result]"
      );


    if (
      result
    ) {
      result.textContent =
        lastState?.powerRoll ??
        "—";
    }


    const note =
      $(
        "[data-power-result-note]"
      );


    if (
      note
    ) {

      if (
        lastState?.powerRoll
      ) {

        note.textContent =
          `D100 ${lastState.powerRoll} → ${lastState.power}`;

      } else if (
        lastState?.power
      ) {

        note.textContent =
          "Poder selecionado.";

      } else {

        note.textContent =
          "O D100 define um dos quatro poderes principais.";
      }
    }


    $$( 
      '[data-action="select-parallel-power"]'
    ).forEach(
      button => {

        const selected =
          button.dataset.power ===
          lastState?.power;


        button.classList.toggle(
          "selected",
          selected
        );


        button.classList.toggle(
          "active",
          selected
        );


        button.setAttribute(
          "aria-pressed",
          String(
            selected
          )
        );
      }
    );
  }


  function setPowerMode(
    mode
  ) {

    const roll =
      $(
        '[data-power-section="roll"]'
      );


    const manual =
      $(
        '[data-power-section="manual"]'
      );


    if (
      roll
    ) {
      roll.hidden =
        mode !==
        "roll";
    }


    if (
      manual
    ) {
      manual.hidden =
        mode !==
        "manual";
    }
  }


  /* =========================================================
     MANA
     ========================================================= */

  function renderMana() {

    $$(".mana-card")
      .forEach(
        card => {

          const mana =
            normalize(
              card.dataset.mana
            );


          const selected =
            lastState?.mana ===
            mana;


          const available =
            mana ===
            "azul";


          card.classList.toggle(
            "selected",
            selected
          );


          card.classList.toggle(
            "is-selected",
            selected
          );


          card.classList.toggle(
            "locked",
            !available
          );


          card.disabled =
            !available;

        }
      );
  }


  /* =========================================================
     PERÍCIAS
     ========================================================= */

  function renderSkills() {

    const root =
      $("#skillsList");


    if (
      !root
    ) {
      return;
    }


    const values =
      lastState?.effectiveSkills ||
      {};


    root.innerHTML =
      "";


    Object.entries(
      SKILLS
    ).forEach(
      ([
        id,
        skill
      ]) => {

        const data =
          values[id] ||
          {
            trained:
              false,

            bonus:
              0,

            effectiveBonus:
              0
          };


        const article =
          document.createElement(
            "article"
          );


        article.className =
          "skill-card";


        article.dataset.skill =
          id;


        article.innerHTML = `
          <div
            class="skill-card-main"
          >

            <div>

              <span class="eyebrow">
                PERÍCIA
              </span>

              <h3>
                ${escapeHtml(
                  skill.name
                )}
              </h3>

              <p>
                ${escapeHtml(
                  skill.description
                )}
              </p>

            </div>


            <div
              class="skill-bonus-box"
            >

              <span>
                Bônus
              </span>

              <strong>
                ${formatSigned(
                  data.effectiveBonus
                )}
              </strong>

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
                data.trained
                  ? "✓ Treinado"
                  : "Treinar"
              }
            </button>


            <input
              class="skill-bonus-input"
              type="number"
              min="-20"
              max="20"
              value="${Number(
                data.bonus
              ) || 0}"
              data-skill-bonus="${escapeHtml(
                id
              )}"
              aria-label="Bônus de ${escapeHtml(
                skill.name
              )}"
            />

          </div>
        `;


        root.appendChild(
          article
        );
      }
    );
  }


  /* =========================================================
     TÉCNICAS
     ========================================================= */

  function renderTechniques() {

    const root =
      $(
        "[data-techniques-list]"
      );


    if (
      !root
    ) {
      return;
    }


    const techniques =
      Array.isArray(
        lastState?.techniques
      )
        ? lastState.techniques
        : [];


    root.innerHTML =
      "";


    if (
      !techniques.length
    ) {

      root.innerHTML = `
        <div
          class="empty-state"
        >
          <span>
            Nenhuma técnica adicionada.
          </span>

          <small>
            Adicione uma técnica para começar.
          </small>
        </div>
      `;


      return;
    }


    techniques.forEach(
      technique => {

        const article =
          document.createElement(
            "article"
          );


        article.className =
          "technique-card";


        article.innerHTML = `

          <div
            class="technique-card-header"
          >

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
            />


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
            placeholder="Descrição"
            data-technique-id="${escapeHtml(
              technique.id
            )}"
            data-technique-field="description"
          >${escapeHtml(
            technique.description
          )}</textarea>


          <div
            class="technique-fields"
          >

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
            />


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
            />

          </div>


          <div
            class="technique-extra-fields"
          >

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
            />


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
            />


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
        `;


        root.appendChild(
          article
        );
      }
    );
  }


  /* =========================================================
     INVENTÁRIO
     ========================================================= */

  function renderInventory() {

    const root =
      $(
        "[data-inventory-list]"
      );


    if (
      !root
    ) {
      return;
    }


    const inventory =
      Array.isArray(
        lastState?.inventory
      )
        ? lastState.inventory
        : [];


    root.innerHTML =
      "";


    if (
      !inventory.length
    ) {

      root.innerHTML = `
        <div
          class="empty-state"
        >
          <span>
            Inventário vazio.
          </span>

          <small>
            Adicione equipamentos ou objetos.
          </small>
        </div>
      `;


      return;
    }


    inventory.forEach(
      item => {

        const article =
          document.createElement(
            "article"
          );


        article.className =
          "inventory-item";


        article.innerHTML = `

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
          />


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
            aria-label="Quantidade"
          />


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
          />


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
        `;


        root.appendChild(
          article
        );
      }
    );
  }


  /* =========================================================
     COMBATE
     ========================================================= */

  function renderCombat() {

    const combat =
      lastState?.combat ||
      {};


    const hp =
      $(
        "[data-combat-hp]"
      );


    if (
      hp
    ) {
      hp.textContent =
        combat.hp ??
        "—";
    }


    const movement =
      $(
        "[data-combat-movement]"
      );


    if (
      movement
    ) {

      movement.textContent =
        combat.movement ==
        null
          ? "—"
          : `${combat.movement} m`;
    }


    const air =
      $(
        "[data-combat-air]"
      );


    if (
      air
    ) {

      air.textContent =
        combat.air ==
        null
          ? "—"
          : `${combat.air} m`;
    }


    const aquatic =
      $(
        "[data-combat-aquatic]"
      );


    if (
      aquatic
    ) {

      aquatic.textContent =
        combat.aquatic ==
        null
          ? "—"
          : `${combat.aquatic} m`;
    }


    const flight =
      $(
        "[data-combat-flight]"
      );


    if (
      flight
    ) {

      flight.textContent =
        combat.canFly
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


    const classData =
      CLASSES[
        lastState?.class
      ];


    const values = {

      name:
        lastState?.name ||
        "Sem nome",

      gender:
        lastState?.gender ===
        "masculino"
          ? "Masculino"
          : lastState?.gender ===
              "feminino"
            ? "Feminino"
            : "—",

      race:
        race?.name ||
        "—",

      class:
        classData?.name ||
        "—",

      height:
        formatHeight(
          lastState?.appearance
            ?.height
        ),

      power:
        lastState?.power ||
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
          lastState?.description ||
          "Nenhuma descrição.";
      }
    );


    $$( 
      '[data-review="appearance"]'
    ).forEach(
      element => {

        const appearance =
          lastState?.appearance ||
          {};


        const lines =
          [];


        if (
          appearance.hairStyle ||
          appearance.hair
        ) {

          lines.push(
            `Cabelo: ${
              appearance.hairStyle ||
              appearance.hair
            }`
          );
        }


        if (
          appearance.eyeShape ||
          appearance.eyes
        ) {

          lines.push(
            `Olhos: ${
              appearance.eyeShape ||
              appearance.eyes
            }`
          );
        }


        if (
          appearance.skinVariant ||
          appearance.skin
        ) {

          lines.push(
            `Pele: ${
              appearance.skinVariant ||
              appearance.skin
            }`
          );
        }


        if (
          appearance.clothingStyle ||
          appearance.clothing
        ) {

          lines.push(
            `Vestimenta: ${
              appearance.clothingStyle ||
              appearance.clothing
            }`
          );
        }


        if (
          appearance.scars
        ) {

          lines.push(
            `Cicatrizes: ${
              appearance.scars
            }`
          );
        }


        if (
          appearance.tattoos
        ) {

          lines.push(
            `Tatuagens: ${
              appearance.tattoos
            }`
          );
        }


        if (
          appearance.physicalNotes
        ) {

          lines.push(
            appearance.physicalNotes
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
      !attributeRoot
    ) {
      return;
    }


    const attributes =
      lastState?.effectiveAttributes ||
      {};


    attributeRoot.innerHTML =
      ATTRIBUTES
        .map(
          attribute => {

            const data =
              attributes[
                attribute.id
              ];


            return `
              <div
                class="review-attribute"
              >

                <span>
                  ${escapeHtml(
                    attribute.name
                  )}
                </span>


                <strong>
                  ${
                    data?.sides
                      ? `D${data.sides}`
                      : "—"
                  }
                </strong>


                <small>
                  ${
                    data
                      ? formatSigned(
                          data.racialModifier
                        )
                      : ""
                  }
                </small>

              </div>
            `;
          }
        )
        .join("");
  }


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  function renderNavigation() {

    const current =
      Number(
        lastState?.step
      ) || 0;


    const currentElement =
      $("#stepCurrent");


    if (
      currentElement
    ) {

      currentElement.textContent =
        String(
          current +
          1
        );
    }


    $$( 
      '[data-action="previous"]'
    ).forEach(
      button => {

        button.disabled =
          current <=
          0;
      }
    );


    $$( 
      '[data-action="next"]'
    ).forEach(
      button => {

        button.textContent =
          current >=
          10
            ? "Finalizar"
            : "Próximo →";
      }
    );
  }


  /* =========================================================
     ESTADO VISUAL DAS IMAGENS
     ========================================================= */

  function initializeImageLoading() {

    $$( 
      "img"
    ).forEach(
      image => {

        if (
          image.dataset
            .aerionImageBound ===
          "true"
        ) {
          return;
        }


        image.dataset
          .aerionImageBound =
          "true";


        image.addEventListener(
          "load",
          () => {

            image.classList.remove(
              "image-loading",
              "image-error"
            );

            image.classList.add(
              "image-loaded"
            );


            const wrapper =
              image.closest(
                ".race-image-wrap"
              );


            wrapper?.classList.remove(
              "is-loading",
              "is-error"
            );
          }
        );


        image.addEventListener(
          "error",
          () => {

            image.classList.remove(
              "image-loading"
            );

            image.classList.add(
              "image-error"
            );
          }
        );
      }
    );
  }


  /* =========================================================
     LIGAÇÕES
     ========================================================= */

  function initializeVisualBindings() {

    initializeImageLoading();
  }


  /* =========================================================
     RENDER PRINCIPAL
     ========================================================= */

  function render(
    state
  ) {

    if (
      !state
    ) {
      return;
    }


    lastState =
      state;


    renderProgress();

    renderPanels();

    renderIdentity();

    renderAvatar();

    renderRace();

    renderAnimalha();

    renderAppearance();

    renderClasses();

    renderAttributes();

    renderPower();

    renderMana();

    renderSkills();

    renderTechniques();

    renderInventory();

    renderCombat();

    renderReview();

    renderNavigation();

    initializeVisualBindings();
  }


  /* =========================================================
     API
     ========================================================= */

  window.AERIONFichaRender =
    Object.freeze({

      /*
       * Catálogos utilizados pelo ficha.js.
       */

      RACES,

      ANIMALHA_VARIANTS,

      CLASSES,

      SKILLS,

      ATTRIBUTES,

      PRIMARY_POWERS,

      PARALLEL_POWERS,


      /*
       * Renderização.
       */

      render,

      toast,

      announce,

      setPowerMode,

      renderProgress,

      renderPanels,

      renderIdentity,

      renderAvatar,

      renderRace,

      renderAnimalha,

      renderAppearance,

      renderClasses,

      renderAttributes,

      renderDice,

      renderAttributeCards,

      renderRadar,

      renderPower,

      renderMana,

      renderSkills,

      renderTechniques,

      renderInventory,

      renderCombat,

      renderReview,

      renderNavigation,

      initializeVisualBindings
    });


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

    initializeVisualBindings();


    /*
     * O evento permite que outros módulos saibam
     * que o renderizador está disponível.
     */

    window.dispatchEvent(
      new CustomEvent(
        "aerion:ficha-render:ready"
      )
    );


    console.info(
      "[AERION] ficha-render.js inicializado."
    );
  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:
          true
      }
    );

  } else {

    init();
  }

})();