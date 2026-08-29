/*
 * ============================================================
 * AERIOM v2
 * js/core/convite.js
 * Sistema de convites da campanha
 * ============================================================
 */

import {
  getSupabase
} from "./supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CONFIG = Object.freeze({

  JOIN_PAGE:
    "./entrar.html",

  INVITE_MINUTES:
    5,

  QR_SIZE:
    220,

  QR_API:
    "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  initialized:
    false,

  generating:
    false,

  supabase:
    null,

  invite:
    null,

  expiresAt:
    null,

  countdown:
    null

};


/* ============================================================
   LOG
   ============================================================ */

function log(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][INVITE]";


  if (
    level === "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;

  }


  if (
    level === "warn"
  ) {

    console.warn(
      prefix,
      message,
      details ?? ""
    );

    return;

  }


  console.info(
    prefix,
    message,
    details ?? ""
  );

}


/* ============================================================
   DOM
   ============================================================ */

function get(
  id
) {

  return document.getElementById(
    id
  );

}


/* ============================================================
   HELPERS
   ============================================================ */

function clean(
  value,
  fallback = ""
) {

  return typeof value === "string"
    ? value.trim()
    : fallback;

}


/* ============================================================
   CONTEXTO DA CAMPANHA
   ============================================================ */

function getCampaignApi() {

  return window.AERIOM_CAMPAIGN ||
    null;

}


function getCampaignContext() {

  const api =
    getCampaignApi();


  if (
    !api ||
    typeof api.getContext !== "function"
  ) {

    return null;

  }


  try {

    return api.getContext();

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao obter contexto da campanha.",
      error
    );


    return null;

  }

}


function getCampaignId() {

  const context =
    getCampaignContext();


  return (
    clean(
      context?.campaignId
    ) ||

    clean(
      context?.campaign?.id
    )
  );

}


/* ============================================================
   PERMISSÃO
   ============================================================ */

function isMaster() {

  const api =
    getCampaignApi();


  if (
    api &&
    typeof api.isMaster === "function"
  ) {

    try {

      return Boolean(
        api.isMaster()
      );

    } catch {
      // fallback
    }

  }


  const context =
    getCampaignContext();


  return (
    context?.membership?.role ===
    "master"
  );

}


/* ============================================================
   CLIENTE SUPABASE
   ============================================================ */

async function getClient() {

  const context =
    getCampaignContext();


  /*
   * O campanha.js normalmente já fornece o cliente.
   */

  if (
    context?.supabase
  ) {

    state.supabase =
      context.supabase;


    return state.supabase;

  }


  /*
   * IMPORTANTÍSSIMO:
   *
   * getSupabase() é async.
   */

  state.supabase =
    await getSupabase();


  return state.supabase;

}


/* ============================================================
   TOAST
   ============================================================ */

function showToast(
  message,
  type = "info"
) {

  const region =
    get(
      "aeriom-toast-region"
    );


  if (
    region
  ) {

    const toast =
      document.createElement(
        "div"
      );


    toast.className =
      "aeriom-toast";


    toast.dataset.type =
      type;


    toast.setAttribute(
      "role",
      "status"
    );


    toast.textContent =
      message;


    region.appendChild(
      toast
    );


    window.setTimeout(
      () => {

        toast.remove();

      },
      3500
    );


    return;

  }


  log(
    type === "error"
      ? "error"
      : "info",
    message
  );

}


/* ============================================================
   MODAL
   ============================================================ */

function getModal() {

  return get(
    "campaign-invite-modal"
  );

}


function openModal() {

  const modal =
    getModal();


  if (
    !modal
  ) {

    log(
      "error",
      "Modal de convite não encontrado."
    );


    return false;

  }


  modal.hidden =
    false;


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  return true;

}


function closeModal() {

  const modal =
    getModal();


  if (
    !modal
  ) {

    return;

  }


  modal.hidden =
    true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );

}


/* ============================================================
   LIMPAR VISUAL
   ============================================================ */

function stopCountdown() {

  if (
    state.countdown
  ) {

    clearInterval(
      state.countdown
    );


    state.countdown =
      null;

  }

}


function clearInviteDisplay() {

  stopCountdown();


  state.invite =
    null;


  state.expiresAt =
    null;


  const code =
    get(
      "campaign-invite-code"
    );


  const expiration =
    get(
      "campaign-invite-expiration"
    );


  const link =
    get(
      "campaign-invite-link"
    );


  const qr =
    get(
      "campaign-invite-qr"
    );


  if (
    code
  ) {

    code.textContent =
      ".....";

  }


  if (
    expiration
  ) {

    expiration.textContent =
      "Gerando convite...";


    expiration.dataset.expired =
      "false";

  }


  if (
    link
  ) {

    link.value =
      "";

  }


  if (
    qr
  ) {

    qr.replaceChildren();

  }

}


/* ============================================================
   RPC
   ============================================================ */

function normalizeInviteResponse(
  data
) {

  let row =
    data;


  /*
   * TABLE retorna normalmente um array.
   */

  if (
    Array.isArray(
      row
    )
  ) {

    row =
      row[0] ||
      null;

  }


  if (
    !row ||
    typeof row !== "object"
  ) {

    return null;

  }


  const code =
    clean(
      row.invite_code
    ) ||

    clean(
      row.code
    ) ||

    clean(
      row.inviteCode
    );


  const inviteId =
    clean(
      row.invite_id
    ) ||

    clean(
      row.id
    );


  const expiresAt =
    clean(
      row.expires_at
    ) ||

    clean(
      row.expiresAt
    );


  const maxUses =
    Number(
      row.max_uses
    );


  if (
    !code
  ) {

    return null;

  }


  return {

    inviteId:
      inviteId ||
      null,

    code,

    expiresAt:
      expiresAt ||
      null,

    maxUses:
      Number.isFinite(
        maxUses
      )
        ? maxUses
        : 1

  };

}


/* ============================================================
   GERAR CONVITE
   ============================================================ */

async function generateInvite() {

  if (
    state.generating
  ) {

    return null;

  }


  if (
    !isMaster()
  ) {

    showToast(
      "Somente o Mestre pode gerar convites.",
      "error"
    );


    return null;

  }


  const campaignId =
    getCampaignId();


  if (
    !campaignId
  ) {

    showToast(
      "A campanha ainda não foi carregada.",
      "error"
    );


    return null;

  }


  state.generating =
    true;


  try {

    const supabase =
      await getClient();


    if (
      !supabase ||
      typeof supabase.rpc !==
        "function"
    ) {

      throw new Error(
        "Cliente Supabase não está disponível."
      );

    }


    log(
      "info",
      "Solicitando novo convite.",
      {
        campaignId
      }
    );


    /*
     * Função real existente no Supabase:
     *
     * generate_campaign_invite(
     *   uuid,
     *   integer
     * )
     *
     * O banco gera:
     *
     * - 5 caracteres;
     * - SHA-256;
     * - 5 minutos;
     * - limite de uso.
     */

    const {
      data,
      error
    } =
      await supabase.rpc(
        "generate_campaign_invite",
        {

          p_campaign_id:
            campaignId,

          p_max_uses:
            1

        }
      );


    if (
      error
    ) {

      throw error;

    }


    const invite =
      normalizeInviteResponse(
        data
      );


    if (
      !invite
    ) {

      throw new Error(
        "O Supabase não retornou um convite válido."
      );

    }


    state.invite =
      invite;


    /*
     * O banco é a fonte principal da validade.
     */

    const databaseExpiration =
      invite.expiresAt
        ? new Date(
            invite.expiresAt
          ).getTime()

        : NaN;


    state.expiresAt =
      Number.isFinite(
        databaseExpiration
      )

        ? databaseExpiration

        : (
            Date.now() +
            (
              CONFIG.INVITE_MINUTES *
              60 *
              1000
            )
          );


    renderInvite();


    startCountdown();


    showToast(
      "Convite gerado com sucesso!",
      "success"
    );


    log(
      "info",
      "Convite criado.",
      {

        inviteId:
          invite.inviteId,

        code:
          invite.code,

        expiresAt:
          state.expiresAt

      }
    );


    return invite;

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao gerar convite.",
      error
    );


    renderGenerationError(
      error
    );


    showToast(
      getFriendlyError(
        error
      ),
      "error"
    );


    return null;

  } finally {

    state.generating =
      false;

  }

}


/* ============================================================
   ERROS
   ============================================================ */

function getFriendlyError(
  error
) {

  const code =
    clean(
      error?.code
    );


  const message =
    clean(
      error?.message
    );


  if (
    code === "42501"
  ) {

    return (
      "Somente o Mestre da campanha pode gerar convites."
    );

  }


  if (
    message.includes(
      "master_required"
    )
  ) {

    return (
      "Somente o Mestre da campanha pode gerar convites."
    );

  }


  if (
    message.includes(
      "not_authenticated"
    )
  ) {

    return (
      "Sua sessão expirou. Faça login novamente."
    );

  }


  if (
    message.includes(
      "invite_generation_failed"
    )
  ) {

    return (
      "Não foi possível gerar um convite agora. Tente novamente."
    );

  }


  return (
    message ||
    "Não foi possível gerar o convite."
  );

}


/* ============================================================
   LINK
   ============================================================ */

function getInviteLink() {

  const code =
    clean(
      state.invite?.code
    );


  if (
    !code
  ) {

    return "";

  }


  try {

    const url =
      new URL(
        CONFIG.JOIN_PAGE,
        window.location.href
      );


    url.searchParams.set(
      "code",
      code
    );


    return url.href;

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao criar link do convite.",
      error
    );


    return "";

  }

}


/* ============================================================
   QR CODE
   ============================================================ */

function renderQRCode() {

  const container =
    get(
      "campaign-invite-qr"
    );


  if (
    !container
  ) {

    return;

  }


  container.replaceChildren();


  const link =
    getInviteLink();


  if (
    !link
  ) {

    return;

  }


  const image =
    document.createElement(
      "img"
    );


  image.width =
    CONFIG.QR_SIZE;


  image.height =
    CONFIG.QR_SIZE;


  image.alt =
    "QR Code do convite da campanha";


  image.loading =
    "eager";


  image.decoding =
    "async";


  image.src =
    CONFIG.QR_API +
    encodeURIComponent(
      link
    );


  image.addEventListener(
    "error",
    () => {

      container.replaceChildren();


      const fallback =
        document.createElement(
          "div"
        );


      fallback.className =
        "campaign-invite__qr-error";


      fallback.textContent =
        "Não foi possível carregar o QR Code. Use o código ou o link.";

      container.appendChild(
        fallback
      );

    },
    {
      once:
        true
    }
  );


  container.appendChild(
    image
  );

}


/* ============================================================
   RENDER
   ============================================================ */

function renderInvite() {

  const codeElement =
    get(
      "campaign-invite-code"
    );


  const expirationElement =
    get(
      "campaign-invite-expiration"
    );


  const linkElement =
    get(
      "campaign-invite-link"
    );


  if (
    codeElement
  ) {

    codeElement.textContent =
      state.invite?.code ||
      "-----";

  }


  const link =
    getInviteLink();


  if (
    linkElement
  ) {

    linkElement.value =
      link;

  }


  if (
    expirationElement
  ) {

    expirationElement.textContent =
      "Válido por 05:00";


    expirationElement.dataset.expired =
      "false";

  }


  renderQRCode();

}


/* ============================================================
   ERRO VISUAL
   ============================================================ */

function renderGenerationError(
  error
) {

  const code =
    get(
      "campaign-invite-code"
    );


  const expiration =
    get(
      "campaign-invite-expiration"
    );


  const link =
    get(
      "campaign-invite-link"
    );


  const qr =
    get(
      "campaign-invite-qr"
    );


  if (
    code
  ) {

    code.textContent =
      "ERRO";

  }


  if (
    expiration
  ) {

    expiration.textContent =
      getFriendlyError(
        error
      );


    expiration.dataset.expired =
      "true";

  }


  if (
    link
  ) {

    link.value =
      "";

  }


  if (
    qr
  ) {

    qr.replaceChildren();

  }

}


/* ============================================================
   CONTADOR
   ============================================================ */

function startCountdown() {

  stopCountdown();


  const expiration =
    get(
      "campaign-invite-expiration"
    );


  const update =
    () => {

      if (
        !state.expiresAt
      ) {

        return;

      }


      const remaining =
        state.expiresAt -
        Date.now();


      if (
        remaining <=
        0
      ) {

        stopCountdown();


        if (
          expiration
        ) {

          expiration.textContent =
            "Convite expirado.";


          expiration.dataset.expired =
            "true";

        }


        return;

      }


      const totalSeconds =
        Math.ceil(
          remaining /
          1000
        );


      const minutes =
        Math.floor(
          totalSeconds /
          60
        );


      const seconds =
        totalSeconds %
        60;


      if (
        expiration
      ) {

        expiration.textContent =
          `Válido por ${String(
            minutes
          ).padStart(
            2,
            "0"
          )}:${String(
            seconds
          ).padStart(
            2,
            "0"
          )}`;


        expiration.dataset.expired =
          "false";

      }

    };


  update();


  state.countdown =
    setInterval(
      update,
      1000
    );

}


/* ============================================================
   COPIAR
   ============================================================ */

async function copyText(
  value,
  successMessage
) {

  const textValue =
    clean(
      value
    );


  if (
    !textValue
  ) {

    showToast(
      "Nada para copiar.",
      "error"
    );


    return false;

  }


  try {

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText ===
        "function"
    ) {

      await navigator.clipboard.writeText(
        textValue
      );

    } else {

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        textValue;


      textarea.style.position =
        "fixed";


      textarea.style.left =
        "-9999px";


      document.body.appendChild(
        textarea
      );


      textarea.focus();


      textarea.select();


      const success =
        document.execCommand(
          "copy"
        );


      textarea.remove();


      if (
        !success
      ) {

        throw new Error(
          "Não foi possível copiar."
        );

      }

    }


    showToast(
      successMessage,
      "success"
    );


    return true;

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao copiar.",
      error
    );


    showToast(
      "Não foi possível copiar.",
      "error"
    );


    return false;

  }

}


/* ============================================================
   COPIAR CÓDIGO
   ============================================================ */

function copyCode() {

  return copyText(
    state.invite?.code,
    "Código copiado!"
  );

}


/* ============================================================
   COPIAR LINK
   ============================================================ */

function copyLink() {

  return copyText(
    getInviteLink(),
    "Link copiado!"
  );

}


/* ============================================================
   COMPARTILHAR
   ============================================================ */

async function shareInvite() {

  const code =
    clean(
      state.invite?.code
    );


  const link =
    getInviteLink();


  if (
    !code ||
    !link
  ) {

    showToast(
      "Gere um convite primeiro.",
      "error"
    );


    return false;

  }


  const campaign =
    getCampaignContext()
      ?.campaign;


  const campaignName =
    clean(
      campaign?.name
    ) ||
    "campanha AERION";


  const shareData = {

    title:
      `Convite — ${campaignName}`,

    text:
      `Você foi convidado para participar da campanha "${campaignName}" no AERION. Código: ${code}`,

    url:
      link

  };


  /*
   * No celular, isso abre o menu nativo:
   *
   * WhatsApp
   * Discord
   * Telegram
   * etc.
   */

  if (
    typeof navigator.share ===
    "function"
  ) {

    try {

      await navigator.share(
        shareData
      );


      return true;

    } catch (
      error
    ) {

      if (
        error?.name ===
        "AbortError"
      ) {

        return false;

      }


      log(
        "warn",
        "Compartilhamento não concluído.",
        error
      );

    }

  }


  /*
   * Fallback.
   */

  return copyLink();

}


/* ============================================================
   ABRIR CONVITE
   ============================================================ */

async function openInvite() {

  if (
    !openModal()
  ) {

    return;

  }


  clearInviteDisplay();


  await generateInvite();

}


/* ============================================================
   REGENERAR
   ============================================================ */

async function regenerateInvite() {

  if (
    !openModal()
  ) {

    return;

  }


  clearInviteDisplay();


  await generateInvite();

}


/* ============================================================
   EVENTOS
   ============================================================ */

function bindEvents() {

  /*
   * Fechar.
   */

  get(
    "campaign-invite-close"
  )
    ?.addEventListener(
      "click",
      closeModal
    );


  /*
   * Fundo do modal.
   */

  document
    .querySelectorAll(
      "[data-campaign-modal-close]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          closeModal
        );

      }
    );


  /*
   * Copiar código.
   */

  get(
    "campaign-invite-copy-code"
  )
    ?.addEventListener(
      "click",
      copyCode
    );


  /*
   * Copiar link.
   */

  get(
    "campaign-invite-copy-link"
  )
    ?.addEventListener(
      "click",
      copyLink
    );


  /*
   * Compartilhar.
   */

  get(
    "campaign-invite-share"
  )
    ?.addEventListener(
      "click",
      shareInvite
    );


  /*
   * Evento disparado pelo campanha.js.
   */

  window.addEventListener(
    "aeriom:campaigninvite",
    openInvite
  );


  /*
   * Escape.
   */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !==
        "Escape"
      ) {

        return;

      }


      const modal =
        getModal();


      if (
        modal &&
        !modal.hidden
      ) {

        closeModal();

      }

    }
  );

}


/* ============================================================
   API GLOBAL
   ============================================================ */

function exposeAPI() {

  window.AERIOM_INVITE =
    Object.freeze({

      open:
        openInvite,

      close:
        closeModal,

      generate:
        generateInvite,

      regenerate:
        regenerateInvite,

      copyCode,

      copyLink,

      share:
        shareInvite,

      getCode:
        () =>
          state.invite?.code ||
          null,

      getLink:
        getInviteLink

    });

}


/* ============================================================
   DESTROY
   ============================================================ */

function destroy() {

  stopCountdown();


  state.initialized =
    false;

  state.generating =
    false;

  state.supabase =
    null;

  state.invite =
    null;

  state.expiresAt =
    null;

}


/* ============================================================
   INIT
   ============================================================ */

function init() {

  if (
    state.initialized
  ) {

    return;

  }


  state.initialized =
    true;


  bindEvents();

  exposeAPI();


  log(
    "info",
    "Sistema de convites inicializado."
  );

}


/* ============================================================
   START
   ============================================================ */

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


/* ============================================================
   LIFECYCLE
   ============================================================ */

window.addEventListener(
  "pagehide",
  destroy,
  {
    once:
      true
  }
);


/* ============================================================
   EXPORTS
   ============================================================ */

export {

  openInvite,

  closeModal,

  generateInvite,

  regenerateInvite,

  copyCode,

  copyLink,

  shareInvite

};