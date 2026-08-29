/*
 * ============================================================
 * AERIOM v2
 * js/core/convite.js
 * Convites da campanha
 * ============================================================
 */

import { getSupabase } from "./supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CONFIG = Object.freeze({

  JOIN_PAGE:
    "./entrar.html",

  INVITE_MINUTES:
    5,

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

  timer:
    null,

  expiresAt:
    null,

  invite:
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
    level ===
    "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;

  }


  if (
    level ===
    "warn"
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
   TEXTO
   ============================================================ */

function clean(
  value
) {

  if (
    typeof value !==
    "string"
  ) {

    return "";

  }


  return value.trim();

}


/* ============================================================
   CONTEXTO
   ============================================================ */

function getCampaignContext() {

  const api =
    window.AERIOM_CAMPAIGN;


  if (
    !api
  ) {

    return null;

  }


  if (
    typeof api.getContext !==
    "function"
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


/* ============================================================
   SUPABASE
   ============================================================ */

function getClient() {

  const context =
    getCampaignContext();


  if (
    context?.supabase
  ) {

    return context.supabase;

  }


  try {

    return getSupabase();

  } catch (
    error
  ) {

    log(
      "error",
      "Não foi possível obter o cliente Supabase.",
      error
    );


    return null;

  }

}


/* ============================================================
   CAMPANHA
   ============================================================ */

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

  const context =
    getCampaignContext();


  /*
   * O campanha.js já determina a função do usuário.
   */

  if (
    typeof window
      .AERIOM_CAMPAIGN
      ?.isMaster ===
    "function"
  ) {

    try {

      return Boolean(
        window.AERIOM_CAMPAIGN
          .isMaster()
      );

    } catch {

      // fallback abaixo

    }

  }


  return (
    context?.membership?.role ===
    "master"
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
      "Modal campaign-invite-modal não encontrado."
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
   TOAST
   ============================================================ */

function toast(
  message,
  type = "info"
) {

  const region =
    get(
      "aeriom-toast-region"
    );


  if (
    !region
  ) {

    return;

  }


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "aeriom-toast";


  element.dataset.type =
    type;


  element.setAttribute(
    "role",
    "status"
  );


  element.textContent =
    message;


  region.appendChild(
    element
  );


  window.setTimeout(
    () => {

      element.remove();

    },
    3000
  );

}


/* ============================================================
   RESULTADO RPC
   ============================================================ */

function normalizeResult(
  data
) {

  let result =
    data;


  if (
    Array.isArray(
      result
    )
  ) {

    result =
      result[0];

  }


  if (
    !result ||
    typeof result !==
      "object"
  ) {

    return null;

  }


  const code =
    clean(
      result.code
    ) ||

    clean(
      result.invite_code
    ) ||

    clean(
      result.inviteCode
    ) ||

    clean(
      result.token
    );


  const expiresAt =
    clean(
      result.expires_at
    ) ||

    clean(
      result.expiresAt
    );


  if (
    !code
  ) {

    return null;

  }


  return {

    code,

    expiresAt:
      expiresAt || null

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


  const context =
    getCampaignContext();


  const supabase =
    getClient();


  const campaignId =
    getCampaignId();


  if (
    !supabase
  ) {

    toast(
      "Supabase ainda não está disponível.",
      "error"
    );


    return null;

  }


  if (
    !campaignId
  ) {

    toast(
      "A campanha ainda não foi carregada.",
      "error"
    );


    log(
      "error",
      "campaignId ausente."
    );


    return null;

  }


  if (
    !isMaster()
  ) {

    toast(
      "Somente o Mestre pode gerar convites.",
      "error"
    );


    return null;

  }


  state.generating =
    true;


  try {

    log(
      "info",
      "Gerando convite...",
      {
        campaignId
      }
    );


    const response =
      await supabase.rpc(
        "generate_campaign_invite",
        {
          p_campaign_id:
            campaignId
        }
      );


    if (
      response.error
    ) {

      throw response.error;

    }


    const invite =
      normalizeResult(
        response.data
      );


    if (
      !invite
    ) {

      throw new Error(
        "A função do Supabase não retornou código de convite."
      );

    }


    state.invite =
      invite;


    /*
     * O banco continua sendo a fonte principal.
     * Caso não envie expires_at, usamos exatamente 5 minutos.
     */

    let expiresAt;


    if (
      invite.expiresAt
    ) {

      expiresAt =
        new Date(
          invite.expiresAt
        ).getTime();

    } else {

      expiresAt =
        Date.now() +
        (
          CONFIG.INVITE_MINUTES *
          60 *
          1000
        );

    }


    if (
      !Number.isFinite(
        expiresAt
      )
    ) {

      expiresAt =
        Date.now() +
        (
          CONFIG.INVITE_MINUTES *
          60 *
          1000
        );

    }


    state.expiresAt =
      expiresAt;


    renderInvite();


    startCountdown();


    toast(
      "Convite gerado!",
      "success"
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


    toast(
      getErrorMessage(
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
   MENSAGEM DE ERRO
   ============================================================ */

function getErrorMessage(
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
    code ===
    "42501"
  ) {

    return (
      "O banco recusou a geração do convite. Verifique a permissão do Mestre."
    );

  }


  if (
    message
  ) {

    return message;

  }


  return (
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


  /*
   * O QR Code é criado como imagem.
   *
   * encodeURIComponent evita quebrar a URL quando ela
   * contém ?code=...
   */

  const image =
    document.createElement(
      "img"
    );


  image.width =
    220;


  image.height =
    220;


  image.alt =
    "QR Code do convite";


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
          "p"
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


  const expiration =
    get(
      "campaign-invite-expiration"
    );


  const linkInput =
    get(
      "campaign-invite-link"
    );


  const code =
    clean(
      state.invite?.code
    );


  if (
    codeElement
  ) {

    codeElement.textContent =
      code ||
      "-----";

  }


  const link =
    getInviteLink();


  if (
    linkInput
  ) {

    linkInput.value =
      link;

  }


  if (
    expiration
  ) {

    expiration.textContent =
      "Gerando validade...";

  }


  renderQRCode();

}


/* ============================================================
   CONTADOR
   ============================================================ */

function stopCountdown() {

  if (
    state.timer
  ) {

    clearInterval(
      state.timer
    );


    state.timer =
      null;

  }

}


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


  state.timer =
    setInterval(
      update,
      1000
    );

}


/* ============================================================
   COPIAR
   ============================================================ */

async function copy(
  value,
  message
) {

  const text =
    clean(
      value
    );


  if (
    !text
  ) {

    toast(
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
        text
      );

    } else {

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        text;


      textarea.style.position =
        "fixed";


      textarea.style.left =
        "-9999px";


      document.body.appendChild(
        textarea
      );


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
          "Falha ao copiar."
        );

      }

    }


    toast(
      message,
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


    toast(
      "Não foi possível copiar.",
      "error"
    );


    return false;

  }

}


function copyCode() {

  return copy(
    state.invite?.code,
    "Código copiado!"
  );

}


function copyLink() {

  return copy(
    getInviteLink(),
    "Link copiado!"
  );

}


/* ============================================================
   COMPARTILHAR
   ============================================================ */

async function shareInvite() {

  const link =
    getInviteLink();


  const code =
    clean(
      state.invite?.code
    );


  if (
    !link ||
    !code
  ) {

    toast(
      "Gere um convite primeiro.",
      "error"
    );


    return false;

  }


  const campaign =
    getCampaignContext()
      ?.campaign;


  const name =
    clean(
      campaign?.name
    ) ||
    "minha campanha";


  if (
    typeof navigator.share ===
    "function"
  ) {

    try {

      await navigator.share({

        title:
          `Convite — ${name}`,

        text:
          `Entre na campanha "${name}" usando o código ${code}.`,

        url:
          link

      });


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
        "Compartilhamento cancelado ou indisponível.",
        error
      );

    }

  }


  return copyLink();

}


/* ============================================================
   EVENTO DO CAMPANHA.JS
   ============================================================ */

function handleCampaignInvite(
  event
) {

  log(
    "info",
    "Evento de convite recebido.",
    event?.detail || null
  );


  /*
   * Não dependemos do detail para obter o Supabase.
   * Pegamos tudo novamente pelo AERIOM_CAMPAIGN.
   */

  openInvite();

}


/* ============================================================
   ABRIR
   ============================================================ */

async function openInvite() {

  if (
    !openModal()
  ) {

    return;

  }


  /*
   * Não bloqueamos a abertura do modal enquanto o contexto
   * ainda está sendo resolvido.
   */

  const code =
    get(
      "campaign-invite-code"
    );


  if (
    code
  ) {

    code.textContent =
      ".....";

  }


  const expiration =
    get(
      "campaign-invite-expiration"
    );


  if (
    expiration
  ) {

    expiration.textContent =
      "Gerando convite...";

  }


  await generateInvite();

}


/* ============================================================
   EVENTOS
   ============================================================ */

function bindEvents() {

  /*
   * Botão de fechar.
   */

  get(
    "campaign-invite-close"
  )
    ?.addEventListener(
      "click",
      closeModal
    );


  /*
   * Fundo.
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
   * Este é o ponto mais importante:
   *
   * campanha.js já dispara:
   *
   * aeriom:campaigninvite
   *
   * Então o convite.js escuta esse evento.
   */

  window.addEventListener(
    "aeriom:campaigninvite",
    handleCampaignInvite
  );


  /*
   * ESC.
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
   API
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
   EXPORTS
   ============================================================ */

export {

  openInvite,

  closeModal,

  generateInvite,

  copyCode,

  copyLink,

  shareInvite

};