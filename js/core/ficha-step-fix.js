/*
 * AERION — correção definitiva da transição Poder -> Perícias
 *
 * IMPORTANTE:
 * Este arquivo deve ser carregado ANTES de regras-raciais.js.
 *
 * Motivo:
 * regras-raciais.js intercepta o clique do botão Próximo em modo capture.
 * Como ele chama goToStep(7,true), o núcleo ficha.js rejeita o salto porque
 * a etapa técnica 6 (Mana) ainda existe no modelo.
 *
 * Este listener entra primeiro, consome esse clique e altera somente o
 * índice técnico da ficha para 7. O restante da criação continua intacto.
 */

(() => {
  "use strict";

  if (window.__AERION_POWER_NEXT_DEFINITIVE_FIX__) return;
  window.__AERION_POWER_NEXT_DEFINITIVE_FIX__ = true;

  function ficha() {
    return window.AERIONFicha || window.AERION_FICHA || null;
  }

  function toast(message, type="warning") {
    window.dispatchEvent(
      new CustomEvent("aerion:toast", {
        detail: { message, type }
      })
    );
  }

  /*
   * CAPTURE = true e carregamento antes de regras-raciais.js.
   * Assim esta função recebe o clique antes do interceptor quebrado.
   */
  document.addEventListener("click", (event) => {
    const target = event.target?.closest('[data-action="next-step"]');
    if (!target) return;

    const api = ficha();
    const state = api?.getState?.();

    if (!api?.setState || !state) return;

    const current = Number(state.currentStep);

    if (current !== 5) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    /*
     * O botão só deve passar se o Poder estiver preenchido.
     * Isso preserva a mesma regra que ficha.js/renderer já usam.
     */
    if (!String(state.primaryPower || "").trim()) {
      toast(
        "Escolha ou sorteie um poder antes de continuar.",
        "warning"
      );
      return;
    }

    const completedSteps = [
      ...(state.completedSteps || [])
    ];

    completedSteps[5] = true;
    completedSteps[6] = true;

    /*
     * Não chamamos goToStep().
     * Ele deliberadamente bloqueia saltos de mais de uma etapa.
     * O índice 6 é uma etapa técnica aposentada visualmente, então
     * a transição deve acontecer diretamente para Perícias (7).
     */
    api.setState({
      ...state,
      currentStep: 7,
      completedSteps
    });

    window.dispatchEvent(
      new CustomEvent("aerion:ficha:update", {
        detail: {
          state: api.getState?.()
        }
      })
    );
  }, true);

  /*
   * O caminho de volta também deve ignorar a etapa técnica 6.
   */
  document.addEventListener("click", (event) => {
    const target = event.target?.closest('[data-action="previous-step"]');
    if (!target) return;

    const api = ficha();
    const state = api?.getState?.();

    if (!api?.setState || !state) return;

    if (Number(state.currentStep) !== 7) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    api.setState({
      ...state,
      currentStep: 5
    });

    window.dispatchEvent(
      new CustomEvent("aerion:ficha:update", {
        detail: {
          state: api.getState?.()
        }
      })
    );
  }, true);

  /*
   * Limpa definitivamente os containers vazios de confirmação.
   * Isso cobre Raça e Classe sem tocar no conteúdo quando houver seleção.
   */
  function collapseEmptyConfirmations() {
    ["raceConfirmation","classConfirmation"].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      if (!element.textContent.trim()) {
        element.hidden = true;
        element.setAttribute("aria-hidden", "true");
        element.style.cssText +=
          ";display:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      collapseEmptyConfirmations,
      { once:true }
    );
  } else {
    collapseEmptyConfirmations();
  }

  const observer = new MutationObserver(() => {
    collapseEmptyConfirmations();
  });

  observer.observe(document.documentElement, {
    subtree:true,
    childList:true,
    characterData:true
  });

  /*
   * Diagnóstico opcional no console:
   * facilita confirmar que o fix foi carregado antes do teste.
   */
  window.dispatchEvent(
    new CustomEvent("aerion:ficha:navigation-fix-ready")
  );
})();
