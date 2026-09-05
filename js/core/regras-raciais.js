/*
 * AERION — regras raciais + correções de UI da criação da ficha
 * v0.3
 *
 * Este arquivo NÃO substitui o núcleo da ficha.
 * Ele:
 * - calcula HP/Defesa/Movimento racial;
 * - mostra um HUD compacto durante a criação;
 * - exibe bônus raciais de atributo/perícia;
 * - corrige o campo vazio abaixo de Raça;
 * - reúne Mana com Poder;
 * - restaura o sorteio D100 e poderes incomuns;
 * - adiciona poder personalizado;
 * - transforma a interface em 10 etapas visuais;
 * - envia fichas antigas abertas sem query para Minhas Fichas.
 */

(() => {
  "use strict";

  const R = {
    humano:{hp:0,def:0,movement:9,mods:{presenca:1},size:"Médio",res:[],senses:["Sentidos humanos normais"],abilities:["Adaptação"]},
    elfo:{hp:0,def:1,movement:10,mods:{agilidade:1,percepcao:1},size:"Médio",res:["Efeitos mentais sobrenaturais leves"],senses:["Visão na penumbra","Percepção de Mana"],abilities:["Percepção Élfica"]},
    anao:{hp:3,def:2,movement:7,mods:{vigor:1},size:"Pequeno",res:["Empurrões","Quedas"],senses:["Visão subterrânea"],abilities:["Forja Ancestral"]},
    orc:{hp:4,def:1,movement:9,mods:{forca:1,vigor:1},size:"Grande",res:["Dano físico"],senses:["Olfato aguçado"],abilities:["Fúria de Sangue"]},
    centauro:{hp:3,def:1,movement:13,mods:{forca:1,agilidade:1},size:"Grande",res:["Impacto de quedas"],senses:["Percepção de distância"],abilities:["Galope Ancestral"]},
    vampiro:{hp:1,def:2,movement:10,mods:{agilidade:1,presenca:1},size:"Médio",res:["Dano físico comum"],senses:["Visão noturna","Audição aguçada"],abilities:["Regeneração Sanguínea"]},
    duende:{hp:-1,def:-1,movement:8,mods:{agilidade:1,intelecto:1},size:"Pequeno",res:[],senses:["Percepção de detalhes"],abilities:["Fortuna Mercante"]},
    fada:{hp:-2,def:0,movement:9,mods:{agilidade:1,controle:1},size:"Pequeno",res:["Efeitos mágicos leves"],senses:["Sentidos feéricos"],abilities:["Bênção Feérica"]},
    povo_aquatico:{hp:2,def:0,movement:8,water:10,mods:{vigor:1,percepcao:1},size:"Médio",res:["Pressão aquática"],senses:["Respiração aquática"],abilities:["Anfíbio"]},
    povo_nuvens:{hp:0,def:0,movement:10,mods:{agilidade:1,percepcao:1},size:"Médio",res:["Altitude"],senses:["Percepção de vento e altitude"],abilities:["Passo do Céu"]},
    povo_natureza:{hp:1,def:0,movement:9,mods:{vigor:1},size:"Médio",res:["Toxinas naturais"],senses:["Percepção ambiental"],abilities:["Vínculo Natural"]},
    neraliano:{hp:2,def:1,movement:8,water:10,mods:{vigor:1,controle:1},size:"Médio",res:["Pressão","Frio aquático"],senses:["Respiração aquática","Vibrações na água"],abilities:["Adaptação Abissal"]},
    aureano:{hp:1,def:1,movement:10,mods:{presenca:1,agilidade:1},size:"Médio",res:["Baixa pressão"],senses:["Visão de longa distância"],abilities:["Corpo Celestial"]},
    colosso:{hp:7,def:3,movement:8,mods:{forca:2,vigor:1},size:"Colossal",res:["Físico excepcional","Impacto"],senses:["Grande alcance visual"],abilities:["Asas Colossais"]},
    troll:{hp:6,def:3,movement:8,mods:{forca:2,vigor:1},size:"Grande",res:["Dano físico","Impacto"],senses:["Olfato aguçado"],abilities:["Regeneração Brutal"]},
    animalha:{hp:0,def:0,movement:9,mods:{},size:"Variável",res:[],senses:["Sentidos animais"],abilities:[]}
  };

  const A = {
    gato:{hp:0,def:1,movement:10,mods:{agilidade:1},profile:"Reflexos felinos",senses:["Audição aguçada","Visão noturna"],abilities:["Reflexos Felinos"]},
    pantera:{hp:0,def:1,movement:11,mods:{agilidade:1},profile:"Predador furtivo",senses:["Visão noturna","Audição aguçada"],abilities:["Passos Silenciosos"]},
    tigre:{hp:1,def:1,movement:10,mods:{forca:1},profile:"Predador poderoso",senses:["Olfato aguçado"],abilities:["Predador"]},
    leao:{hp:1,def:1,movement:10,mods:{presenca:1},profile:"Predador dominante",senses:["Olfato aguçado"],abilities:["Presença Dominante"]},
    lobo:{hp:1,def:0,movement:10,mods:{percepcao:1},profile:"Caçador de matilha",senses:["Olfato aguçado","Audição aguçada"],abilities:["Rastreio"]},
    raposa:{hp:0,def:1,movement:9,mods:{intelecto:1},profile:"Astuta",senses:["Audição aguçada"],abilities:["Astúcia"]},
    urso:{hp:2,def:1,movement:8,mods:{vigor:1},profile:"Robusto",senses:["Olfato aguçado"],abilities:["Força Ursina"]},
    falcao:{hp:-1,def:1,movement:12,mods:{percepcao:1},profile:"Caçador aéreo",senses:["Visão de longa distância"],abilities:["Voo"]},
    aguia:{hp:-1,def:1,movement:12,mods:{percepcao:1},profile:"Predador aéreo",senses:["Visão de longa distância"],abilities:["Voo Ágil"]},
    coruja:{hp:-1,def:1,movement:11,mods:{percepcao:1},profile:"Caçador noturno",senses:["Visão noturna","Audição aguçada"],abilities:["Olhar Noturno"]},
    cobra:{hp:0,def:0,movement:8,mods:{precisao:1},profile:"Predador sinuoso",senses:["Percepção térmica","Vibrações"],abilities:["Sentido Térmico"]},
    crocodilo:{hp:2,def:2,movement:7,water:10,mods:{vigor:1},profile:"Caçador anfíbio",senses:["Vibrações na água"],abilities:["Couro Resistente"]},
    tubarao:{hp:2,def:1,movement:7,water:12,mods:{percepcao:1},profile:"Predador aquático",senses:["Percepção de sangue na água","Vibrações"],abilities:["Caça Aquática"]},
    foca:{hp:1,def:1,movement:8,water:11,mods:{vigor:1},profile:"Nadador resistente",senses:["Audição aguçada na água"],abilities:["Adaptação ao Frio"]}
  };

  const skillToAttribute = {
    acrobacia:"agilidade",
    atletismo:"forca",
    furtividade:"agilidade",
    percepcao:"percepcao",
    investigacao:"intelecto",
    conhecimento:"intelecto",
    medicina:"intelecto",
    sobrevivencia:"percepcao",
    persuasao:"presenca",
    intuicao:"percepcao",
    enganacao:"presenca",
    tatica:"intelecto",
    oficio:"intelecto",
    controle_mana:"controle"
  };

  const normalize = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g,"_");

  const num = (v, fallback=0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  function getRules(snapshot) {
    const base = R[normalize(snapshot?.race)] || R.humano;
    const lineage =
      normalize(snapshot?.race) === "animalha"
        ? (A[normalize(
            typeof snapshot?.animalha === "string"
              ? snapshot.animalha
              : snapshot?.animalha?.animal ||
                snapshot?.animalha?.variation ||
                snapshot?.animalhaAnimal
          )] || {})
        : {};

    return {
      hp: Math.max(1,10+num(base.hp)+num(lineage.hp)),
      defense: Math.max(1,10+num(base.def)+num(lineage.def)),
      movement: lineage.movement ?? base.movement ?? 9,
      waterMovement: lineage.water ?? base.water ?? null,
      mods: {...(base.mods||{}),...(lineage.mods||{})},
      size: base.size || "Médio",
      profile: lineage.profile || "",
      res:[...new Set([...(base.res||[]),...(lineage.res||[])])],
      senses:[...new Set([...(base.senses||[]),...(lineage.senses||[])])],
      abilities:[...(base.abilities||[]),...(lineage.abilities||[])]
    };
  }

  function ficha() {
    return window.AERIONFicha || window.AERION_FICHA || null;
  }

  function applyDerived() {
    const api = ficha();
    if (!api?.getState || !api?.setState) return;

    const state = api.getState();
    const derived = getRules(state);

    api.setState({
      hp:{
        current:Math.min(
          Math.max(1,num(state.hp?.current,derived.hp)),
          derived.hp
        ),
        max:derived.hp
      },
      defense:derived.defense,
      movement:derived.movement,
      derivedStats:{
        ...derived,
        racialModifiers:derived.mods,
        racialAbility:derived.abilities.join(" · ")
      }
    });

    renderBonuses();
  }


  function renderHUD() {
    // HP/Defesa/Movimento não ficam expostos no topo de cada etapa.
    document.getElementById("aerion-derived-hud")?.remove();
  }

  function renderBonuses() {
    const api = ficha();
    if (!api?.getState) return;

    const s = api.getState();
    const d = getRules(s);
    const mods = d.mods || {};

    document.querySelectorAll("[data-attribute-card]").forEach(card => {
      const id = normalize(
        card.dataset.attributeCard ||
        card.dataset.attribute ||
        card.dataset.attributeId
      );
      const value = num(mods[id],0);
      let badge = card.querySelector(".racial-bonus-badge");

      if (!value) {
        badge?.remove();
        return;
      }

      if (!badge) {
        badge = document.createElement("span");
        badge.className = "racial-bonus-badge";
        const header = card.querySelector(".attribute-card-header") || card;
        header.appendChild(badge);
      }

      badge.textContent = `${value > 0 ? "+" : ""}${value} raça`;
    });

    document.querySelectorAll(".skill-card").forEach(card => {
      const id = normalize(card.dataset.skillId || card.dataset.skill);
      const attr = skillToAttribute[id];
      const value = num(mods[attr],0);
      let badge = card.querySelector(".racial-bonus-badge");

      if (!value) {
        badge?.remove();
        card.classList.remove("has-racial-bonus");
        return;
      }

      if (!badge) {
        badge = document.createElement("span");
        badge.className = "racial-bonus-badge";
        const name = card.querySelector("[data-skill-name]") || card.firstElementChild || card;
        name.parentNode.appendChild(badge);
      }

      badge.textContent = `${value > 0 ? "+" : ""}${value} raça`;
      card.classList.add("has-racial-bonus");
    });
  }

  function fixRaceConfirmation() {
    const box = document.getElementById("raceConfirmation");
    if (!box) return;

    if (!box.textContent.trim()) {
      box.hidden = true;
      box.setAttribute("aria-hidden","true");
    } else {
      box.hidden = false;
      box.removeAttribute("aria-hidden");
    }
  }

  function ensureFixStyles() {
    if (document.getElementById("aerion-ficha-fix-css")) return;

    const style = document.createElement("style");
    style.id = "aerion-ficha-fix-css";
    style.textContent = `
      #raceConfirmation:empty {
        display:none !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        height:0 !important;
        min-height:0 !important;
      }

      .aerion-ficha-finalize {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        margin-top:16px;
        padding:14px;
        border:1px solid rgba(216,180,90,.18);
        border-radius:14px;
        background:rgba(216,180,90,.035);
      }

      .aerion-finalize-copy {
        min-width:0;
        display:grid;
        gap:4px;
      }

      .aerion-finalize-copy strong {
        color:var(--text);
        font-size:14px;
      }

      .aerion-finalize-copy small {
        color:var(--muted);
        font-size:8px;
        line-height:1.5;
      }

      @media(max-width:699px){
        .aerion-ficha-finalize{
          align-items:stretch;
          flex-direction:column;
        }

        .aerion-ficha-finalize .button{
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureFinalizeButton() {
    const review = document.querySelector('[data-panel="review"]');
    if (!review) return;

    if (
      document.getElementById("aerion-finalize-button") ||
      document.getElementById("aerion-finalize-ficha-button")
    ) {
      return;
    }

    const box = document.createElement("div");
    box.className = "aerion-ficha-finalize";
    box.id = "aerion-finalize-box";
    box.innerHTML = `
      <div class="aerion-finalize-copy">
        <span class="eyebrow">ÚLTIMO PASSO</span>
        <strong>Salvar ficha</strong>
        <small>Revise tudo e salve o personagem como uma ficha pronta.</small>
      </div>

      <button
        type="button"
        class="button button-primary"
        id="aerion-finalize-button"
      >
        Salvar e finalizar
      </button>
    `;

    review.appendChild(box);

    document
      .getElementById("aerion-finalize-button")
      ?.addEventListener("click", () => {
        const api =
          window.AERIONFicha ||
          window.AERION_FICHA;

        const snapshot = api?.getState?.();
        if (!snapshot) return;

        const required = [0,1,2,3,4,5];
        const ok = required.every(
          (index) => snapshot.completedSteps?.[index] === true
        );

        if (!ok) {
          window.dispatchEvent(new CustomEvent("aerion:toast", {
            detail: {
              message: "Complete as etapas obrigatórias antes de finalizar.",
              type: "warning"
            }
          }));
          return;
        }

        /*
         * A API save() grava localmente e dispara "aerion:save".
         * O módulo de biblioteca já escuta esse evento e envia ao Supabase.
         */
        api.save?.();

        window.dispatchEvent(new CustomEvent("aerion:toast", {
          detail: {
            message: "Ficha salva e finalizada.",
            type: "success"
          }
        }));
      });
  }

  function fixPowerUI() {
    const panel = document.querySelector('[data-panel="power"]');
    if (!panel) return;

    const powerPanel = panel.querySelector(".power-panel");
    if (!powerPanel) return;

    if (!document.getElementById("aerion-power-tools")) {
      const wrap = document.createElement("div");
      wrap.id = "aerion-power-tools";
      wrap.innerHTML = `
        <article class="power-roll-card">
          <div class="power-roll-heading">
            <div>
              <span class="eyebrow">DESTINO ELEMENTAL</span>
              <h3>Girar D100</h3>
              <p>O resultado é dividido em quatro faixas iguais.</p>
            </div>
            <strong class="power-roll-result" data-power-roll-result>—</strong>
          </div>
          <button type="button" class="button button-primary power-roll-button" data-action="roll-power">
            Girar D100
          </button>
          <p class="power-help">01–25 Fogo · 26–50 Ar · 51–75 Terra · 76–100 Água.</p>
        </article>

        <article class="power-uncommon-card">
          <span class="eyebrow">PODER INCOMUM</span>
          <p class="power-help">O jogador pode escolher um poder incomum em vez do sorteio elemental.</p>
          <div class="power-choice-grid">
            <button type="button" class="power-choice" data-action="select-uncommon-power" data-power="Gelo">Gelo</button>
            <button type="button" class="power-choice" data-action="select-uncommon-power" data-power="Magnetismo">Magnetismo</button>
            <button type="button" class="power-choice" data-action="select-uncommon-power" data-power="Vegetação">Vegetação</button>
            <button type="button" class="power-choice" data-action="select-uncommon-power" data-power="Tecnologia">Tecnologia</button>
            <button type="button" class="power-choice" data-action="select-uncommon-power" data-power="Gravidade">Gravidade</button>
          </div>
        </article>

        <article class="power-custom-card">
          <span class="eyebrow">OUTRO PODER</span>
          <p class="power-help">Não quer nenhum dos anteriores? Crie um poder próprio.</p>
          <label class="field">
            <span class="field-label">Nome do poder personalizado</span>
            <input type="text" maxlength="120" data-power="customPower" placeholder="Ex.: Manipulação de sombra">
          </label>
          <label class="field">
            <span class="field-label">Descrição do poder</span>
            <textarea maxlength="1200" rows="4" data-power="customDescription" placeholder="Descreva como o poder funciona..."></textarea>
          </label>
        </article>
      `;

      powerPanel.insertBefore(wrap,powerPanel.firstChild);
    }

    if (!document.getElementById("aerion-mana-inline")) {
      const manaPanel = document.querySelector('[data-panel="mana"] .mana-panel');
      if (manaPanel) {
        const box = document.createElement("article");
        box.id = "aerion-mana-inline";
        box.className = "mana-inline-card";
        box.innerHTML = `
          <div class="power-roll-heading">
            <div>
              <span class="eyebrow">RESERVA</span>
              <h3>Mana</h3>
              <p>Configure a reserva usada pelo personagem.</p>
            </div>
          </div>
        `;

        while (manaPanel.firstChild) {
          box.appendChild(manaPanel.firstChild);
        }

        powerPanel.appendChild(box);
      }
    }

    const manaSection =
      document.querySelector('[data-panel="mana"]');

    if (manaSection) {
      manaSection.hidden = true;
      manaSection.setAttribute("aria-hidden","true");
    }
  }


  function interceptRetiredManaNavigation() {
    if (window.__AERION_RETIRED_MANA_NAV) return;
    window.__AERION_RETIRED_MANA_NAV = true;

    document.addEventListener("click", (event) => {
      const target = event.target?.closest("[data-action]");
      if (!target) return;

      const action = target.dataset.action;
      const api = window.AERIONFicha || window.AERION_FICHA;
      const current = Number(api?.getState?.()?.currentStep);

      if (!api?.goToStep || !Number.isFinite(current)) return;

      if (action === "next-step" && current === 5) {
        event.preventDefault();
        event.stopImmediatePropagation();

        /*
         * O núcleo ainda possui o índice técnico 6 para Mana.
         * Fazemos o avanço interno e imediatamente saltamos para Perícias.
         * O painel Mana está oculto e não aparece para o usuário.
         */
        api.goToStep(6, false);
        api.goToStep(7, false);

        refresh();
        return;
      }

      if (action === "previous-step" && current === 7) {
        event.preventDefault();
        event.stopImmediatePropagation();

        api.goToStep(5, false);
        refresh();
      }
    }, true);
  }


  function fixSteps() {
    const stepButtons =
      [...document.querySelectorAll("#creationSteps .creation-step")];

    const map = [
      {core:0,display:1,name:"Identidade"},
      {core:1,display:2,name:"Raça"},
      {core:2,display:3,name:"Aparência"},
      {core:3,display:4,name:"Classe"},
      {core:4,display:5,name:"Atributos"},
      {core:5,display:6,name:"Poder & Mana"},
      {core:7,display:7,name:"Perícias"},
      {core:8,display:8,name:"Técnicas"},
      {core:9,display:9,name:"Inventário"},
      {core:10,display:10,name:"Revisão"}
    ];

    stepButtons.forEach(btn => {
      const core = num(btn.dataset.step,-1);
      const visible = map.find(x => x.core === core);

      if (!visible) {
        btn.hidden = true;
        btn.disabled = true;
        return;
      }

      btn.hidden = false;
      btn.querySelector("span")?.replaceChildren(
        document.createTextNode(String(visible.display).padStart(2,"0"))
      );
      btn.querySelector("b")?.replaceChildren(
        document.createTextNode(visible.name)
      );
    });

    const total =
      document.querySelector("[data-total-steps]");
    if (total) total.textContent = "10";

    const current =
      ficha()?.getState?.()?.currentStep ?? 0;

    const visibleCurrent =
      map.find(x => x.core === current)?.display ?? 1;

    const currentEl =
      document.querySelector("[data-current-step]");
    if (currentEl) currentEl.textContent = String(visibleCurrent);

    const title =
      document.querySelector("[data-current-step-title]");
    if (title) {
      title.textContent =
        map.find(x => x.core === current)?.name || "Identidade";
    }

    const percent =
      document.getElementById("progressPercent");
    const bar =
      document.getElementById("progressBar");

    const p =
      Math.round(((visibleCurrent-1)/(10-1))*100);

    if (percent) percent.textContent = `${Math.max(0,p)}%`;
    if (bar) bar.style.width = `${Math.max(0,p)}%`;

    const track =
      document.querySelector(".progress-track");
    track?.setAttribute("aria-valuenow",String(Math.max(0,p)));
  }

  function interceptNavigation() {
    if (window.__AERION_10STEP_NAV) return;
    window.__AERION_10STEP_NAV = true;

    document.addEventListener("click",(event) => {
      const target = event.target?.closest("[data-action]");
      if (!target) return;

      const action = target.dataset.action;
      const api = ficha();
      const core = num(api?.getState?.()?.currentStep,0);

      if (action === "next-step" && core === 5) {
        event.preventDefault();
        event.stopImmediatePropagation();
        api?.goToStep?.(7,true);
      } else if (action === "previous-step" && core === 7) {
        event.preventDefault();
        event.stopImmediatePropagation();
        api?.goToStep?.(5,false);
      }
    },true);
  }

  function installCustomPower() {
    if (window.__AERION_CUSTOM_POWER) return;
    window.__AERION_CUSTOM_POWER = true;

    document.addEventListener("input",(event) => {
      const el = event.target;
      const key = el?.dataset?.power;

      if (key !== "customPower" && key !== "customDescription") return;

      const api = ficha();
      if (!api?.getState || !api?.setState) return;

      const state = api.getState();

      if (key === "customPower") {
        api.setPower(
          "primaryPower",
          el.value
        );
        api.setState({
          powerMode:"custom"
        });
      } else {
        api.setState({
          customPowerDescription:el.value,
          powerMode:"custom",
          primaryPower:state.primaryPower || "Personalizado"
        });
      }

      renderBonuses();

    });
  }

  function refresh() {
    fixRaceConfirmation();
    fixPowerUI();
    fixSteps();

    renderBonuses();
  }

  function handleRaceChange() {
    setTimeout(() => {
      applyDerived();
      refresh();
    },0);
  }

  function start() {
    /*
     * Importante: o editor é acessado com ?new=1 ou ?id=...
     * Sem isso, a página virou apenas um endereço legado.
     */
    const p = new URLSearchParams(window.location.search);

    if (!p.get("new") && !p.get("id")) {
      window.location.replace("./minhas-fichas.html");
      return;
    }

    interceptNavigation();
    installCustomPower();

    refresh();
    setTimeout(refresh,150);
    setTimeout(refresh,700);

    window.addEventListener("aerion:race:selected",handleRaceChange);
    window.addEventListener("aerion:animalha:selected",handleRaceChange);
    window.addEventListener("aerion:animalha:category",() => {
      setTimeout(refresh,0);
    });

    window.addEventListener("aerion:ficha:update",() => {
      setTimeout(refresh,0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",start,{once:true});
  } else {
    start();
  }

  window.AERIOM_RACIAL_RULES = Object.freeze({
    version:"0.3",
    calculate:getRules,
    races:R,
    animalha:A
  });
})();
