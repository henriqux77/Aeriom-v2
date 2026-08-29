/*
 * ============================================================
 * AERIOM v2
 * js/core/convite.js
 * Convites da campanha
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

  QR_API:
    "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=",

  QR_SIZE:
    220

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

  timer:
    null,

  bound:
    false

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
   HELPERS
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
   TOAST
   ============================================================ */

function showToast(
  message,
  type = "info"
) {

  /*
   * Primeiro tenta a região global existente.
   */

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


  /*
   * Fallback: feedback pelo console + alert apenas
   * quando não existe nenhuma região de toast.
   */

  if (
    type ===
    "error"
  ) {

    console.error(
      "[AERIOM][INVITE]",
      message
    );

  }


}


/* ============================================================
   CONTEXTO DA CAMPANHA
   ============================================================ */

function getCampaignContext() {

  const api =
    window.AERIOM_CAMPAIGN;


  if (
    !api ||
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
      "Não foi possível obter o contexto da campanha.",
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
   ROLE
   ============================================================ */

function isMaster() {

  const api =
    window.AERIOM_CAMPAIGN;


  if (
    api &&
    typeof api.isMaster ===
      "function"
  ) {

    try {

      return Boolean(
        api.isMaster()
      );

    } catch {

      // usa fallback

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

  /*
   * Primeiro aproveitamos o cliente já criado pelo
   * campanha.js, caso exista.
   */

  const context =
    getCampaignContext();


  if (
    context?.supabase
  ) {

    state.supabase =
      context.supabase;


    return state.supabase;

  }


  /*
   * IMPORTANTE:
   *
   * getSupabase() é async no projeto AERIOM.
   *
   * Portanto precisamos usar await.
   */

  state.supabase =
    await getSupabase();


  return state.supabase;

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
      "campaign-invite-modal não encontrado."
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
   LIMPAR
   ============================================================ */

function stopTimer() {

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


function clearInviteDisplay() {

  stopTimer();


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
   NORMALIZAR RPC
   ============================================================ */

function normalizeInvite(
  data
) {

  /*
   * PostgREST pode devolver uma linha como objeto
   * ou como array.
   */

  let row =
    data;


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
    typeof row !==
      "object"
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
    ) ||

    clean(
      row.token
    );


  const expiresAt =
    clean(
      row.expires_at
    ) ||

    clean(
      row.expiresAt
    );


  const inviteId =
    clean(
      row.invite_id
    ) ||

    clean(
      row.id
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
      Number(
        row.max_uses ||
        1
      )

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


    log(
      "error",
      "Campaign ID ausente."
    );


    return null;

  }


  state.generating =
    true;


  clearInviteDisplay();


  try {

    const supabase =
      await getClient();


    if (
      !supabase ||
      !supabase.rpc
    ) {

      throw new Error(
        "Cliente Supabase não está disponível."
      );

    }


    log(
      "info",
      "Gerando convite...",
      {
        campaignId
      }
    );


    /*
     * Passamos p_max_uses explicitamente.
     *
     * Isso deixa a chamada independente do DEFAULT
     * da função PostgreSQL.
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
      normalizeInvite(
        data
      );


    if (
      !invite
    ) {

      log(
        "error",
        "RPC retornou dados inesperados.",
        data
      );


      throw new Error(
        "O banco não retornou um código de convite válido."
      );

    }


    state.invite =
      invite;


    let expiresAt;


    if (
      invite.expiresAt
    ) {

      expiresAt =
        new Date(
          invite.expiresAt
        ).getTime();

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


    showToast(
      "Convite gerado com sucesso!",
      "success"
    );


    log(
      "info",
      "Convite gerado.",
      {

        inviteId:
          invite.inviteId,

        code:
          invite.code,

        expiresAt

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


    showToast(
      getFriendlyError(
        error
      ),
      "error"
    );


    renderGenerationError(
      error
    );


    return null;

  } finally {

    state.generating =
      false;

  }

}


/* ============================================================
   ERRO AMIGÁVEL
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
    code ===
    "42501"
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
      "Sua sessão expirou. Entre novamente no AERIOM."
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
      "Não foi possível criar o link do convite.",
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


  /*
   * Usa um endpoint simples de QR.
   *
   * O conteúdo do QR é apenas o link do convite.
   */

  const image =
    document.createElement(
      "img"
    );


  image.width =
    CONFIG.QR_SIZE;


  image.height =
    CONFIG.QR_SIZE;


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
        "QR Code indisponível. Use o código ou o link.";


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


  if (
    code
  ) {

    code.textContent =
      state.invite?.code ||
      "-----";

  }


  const inviteLink =
    getInviteLink();


  if (
    link
  ) {

    link.value =
      inviteLink;

  }


  if (
    expiration
  ) {

    expiration.textContent =
      "Válido por 05:00";

  }


  renderQRCode();

}


/* ============================================================
   ERRO DE GERAÇÃO
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

  stopTimer();


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

        stopTimer();


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


      const seconds =
        Math.ceil(
          remaining /
          1000
        );


      const minutes =
        Math.floor(
          seconds /
          60
        );


      const rest =
        seconds %
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
            rest
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

async function copyText(
  value,
  message
) {

  const valueToCopy =
    clean(
      value
    );


  if (
    !valueToCopy
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
        valueToCopy
      );

    } else {

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        valueToCopy;


      textarea.style.position =
        "fixed";


      textarea.style.left =
        "-9999px";


      document.body.appendChild(
        textarea
      );


      textarea.focus();


      textarea.select();


      const copied =
        document.execCommand(
          "copy"
        );


      textarea.remove();


      if (
        !copied
      ) {

        throw new Error(
          "Falha ao copiar."
        );

      }

    }


    showToast(
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


    showToast(
      "Não foi possível copiar.",
      "error"
    );


    return false;

  }

}


function copyCode() {

  return copyText(
    state.invite?.code,
    "Código copiado!"
  );

}


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

    showToast(
      "Gere um convite primeiro.",
      "error"
    );


    return false;

  }


  const context =
    getCampaignContext();


  const campaignName =
    clean(
      context?.campaign?.name
    ) ||
    "campanha AERION";


  const data = {

    title:
      `Convite — ${campaignName}`,

    text:
      `Você foi convidado para a campanha "${campaignName}" no AERION. Código: ${code}`,

    url:
      link

  };


  if (
    typeof navigator.share ===
    "function"
  ) {

    try {

      await navigator.share(
        data
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
        "Compartilhamento falhou.",
        error
      );

    }

  }


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
   REABRIR / GERAR NOVO
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

  if (
    state.bound
  ) {

    return;

  }


  state.bound =
    true;


  /*
   * Fechar.
   */

  get(
    "campaign-invite-close"
  )
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        closeModal();

      }
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
   * Botão da sidebar.
   *
   * IMPORTANTE:
   * campanha.js já dispara esse evento.
   */

  window.addEventListener(
    "aeriom:campaigninvite",
    () => {

      openInvite();

    }
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

  stopTimer();


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


  state.bound =
    false;


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