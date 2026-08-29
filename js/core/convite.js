/*
 * ============================================================
 * AERIOM v2
 * js/core/convite.js
 * Sistema de convites + QR Code
 * ============================================================
 *
 * Responsabilidades:
 *
 * - gerar convite da campanha;
 * - abrir/fechar modal;
 * - mostrar código;
 * - mostrar validade;
 * - gerar link;
 * - gerar QR Code;
 * - copiar código;
 * - copiar link;
 * - compartilhar;
 * - contador de expiração;
 * - integração com campanha.js;
 *
 * Não altera:
 *
 * - autenticação;
 * - RLS;
 * - campanhas;
 * - dados;
 * - combate;
 *
 * ============================================================
 */


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const INVITE_CONFIG = Object.freeze({

  JOIN_PAGE:
    "./entrar.html",

  INVITE_DURATION_MS:
    5 * 60 * 1000,

  QR_LIBRARY_URL:
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",

  QR_SIZE:
    220,

  QR_CORRECTION:
    "H",

  MAX_CODE_LENGTH:
    20

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  initialized:
    false,

  opening:
    false,

  generating:
    false,

  supabase:
    null,

  user:
    null,

  campaign:
    null,

  membership:
    null,

  invite:
    null,

  expiresAt:
    null,

  timer:
    null,

  qrLibraryLoading:
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

function $(
  id
) {

  return document.getElementById(
    id
  );

}


/* ============================================================
   HELPERS
   ============================================================ */

function string(
  value,
  fallback = ""
) {

  if (
    typeof value !==
    "string"
  ) {

    return fallback;

  }


  return value.trim();

}


function safeArray(
  value
) {

  return Array.isArray(
    value
  )
    ? value
    : [];

}


function object(
  value
) {

  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {

    return value;

  }


  return {};

}


/* ============================================================
   TOAST
   ============================================================ */

function showToast(
  message,
  type = "info"
) {

  const region =
    $("aeriom-toast-region");


  if (
    !region
  ) {

    return;

  }


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
    String(
      message
    );


  region.appendChild(
    toast
  );


  window.setTimeout(
    () => {

      toast.remove();

    },
    3500
  );

}


/* ============================================================
   CONTEXTO DA CAMPANHA
   ============================================================ */

function readCampaignContext() {

  const api =
    window.AERIOM_CAMPAIGN;


  if (
    !api ||
    typeof api.getContext !==
      "function"
  ) {

    return false;

  }


  const context =
    api.getContext();


  if (
    !context
  ) {

    return false;

  }


  state.supabase =
    context.supabase ||
    null;


  state.user =
    context.user ||
    null;


  state.campaign =
    context.campaign ||
    null;


  state.membership =
    context.membership ||
    null;


  return Boolean(
    state.supabase &&
    state.user &&
    context.campaignId
  );

}


function getCampaignId() {

  const context =
    window.AERIOM_CAMPAIGN
      ?.getContext?.();


  return (
    string(
      context?.campaignId
    ) ||
    string(
      state.campaign?.id
    ) ||
    null
  );

}


function isMaster() {

  return (
    state.membership?.role ===
    "master"
  );

}


/* ============================================================
   MODAL
   ============================================================ */

function getModal() {

  return $(
    "campaign-invite-modal"
  );

}


function openModal() {

  const modal =
    getModal();


  if (
    !modal
  ) {

    showToast(
      "A janela de convite não foi encontrada.",
      "error"
    );


    log(
      "error",
      "Modal de convite ausente."
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
   LIMPAR ESTADO DO CONVITE
   ============================================================ */

function clearInviteState() {

  if (
    state.timer
  ) {

    window.clearInterval(
      state.timer
    );

    state.timer =
      null;

  }


  state.invite =
    null;


  state.expiresAt =
    null;


  const code =
    $(
      "campaign-invite-code"
    );


  const expiration =
    $(
      "campaign-invite-expiration"
    );


  const link =
    $(
      "campaign-invite-link"
    );


  const qr =
    $(
      "campaign-invite-qr"
    );


  if (
    code
  ) {

    code.textContent =
      "-----";

  }


  if (
    expiration
  ) {

    expiration.textContent =
      "";

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
   FORMATA TEMPO
   ============================================================ */

function formatRemainingTime(
  milliseconds
) {

  const totalSeconds =
    Math.max(
      0,
      Math.ceil(
        milliseconds /
        1000
      )
    );


  const minutes =
    Math.floor(
      totalSeconds /
      60
    );


  const seconds =
    totalSeconds %
    60;


  return (
    `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds
    ).padStart(
      2,
      "0"
    )}`
  );

}


/* ============================================================
   CONTADOR
   ============================================================ */

function stopCountdown() {

  if (
    state.timer
  ) {

    window.clearInterval(
      state.timer
    );

    state.timer =
      null;

  }

}


function startCountdown(
  expiresAt
) {

  stopCountdown();


  state.expiresAt =
    expiresAt;


  const expiration =
    $(
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
            "Este convite expirou.";

          expiration.dataset.expired =
            "true";

        }


        disableInviteActions(
          true
        );


        return;

      }


      if (
        expiration
      ) {

        expiration.textContent =
          `Válido por ${formatRemainingTime(
            remaining
          )}`;

        expiration.dataset.expired =
          "false";

      }

    };


  update();


  state.timer =
    window.setInterval(
      update,
      1000
    );

}


/* ============================================================
   BOTÕES
   ============================================================ */

function disableInviteActions(
  disabled
) {

  [
    "campaign-invite-copy-code",
    "campaign-invite-copy-link",
    "campaign-invite-share"
  ]
    .forEach(
      id => {

        const button =
          $(id);


        if (
          button
        ) {

          button.disabled =
            Boolean(
              disabled
            );

        }

      }
    );

}


/* ============================================================
   RPC
   ============================================================ */

async function generateInvite() {

  if (
    state.generating
  ) {

    return null;

  }


  if (
    !readCampaignContext()
  ) {

    throw new Error(
      "A sessão da campanha ainda não está disponível."
    );

  }


  if (
    !isMaster()
  ) {

    throw new Error(
      "Somente o Mestre pode gerar convites."
    );

  }


  const campaignId =
    getCampaignId();


  if (
    !campaignId
  ) {

    throw new Error(
      "ID da campanha não encontrado."
    );

  }


  state.generating =
    true;


  disableInviteActions(
    true
  );


  try {

    const {
      data,
      error
    } =
      await state.supabase.rpc(
        "generate_campaign_invite",
        {
          p_campaign_id:
            campaignId
        }
      );


    if (
      error
    ) {

      throw error;

    }


    const result =
      normalizeInviteResult(
        data
      );


    if (
      !result
    ) {

      throw new Error(
        "O banco não retornou um convite válido."
      );

    }


    state.invite =
      result;


    /*
     * O banco é a fonte da verdade da validade.
     * Se ele retornar expires_at, usamos esse valor.
     * Caso contrário, usamos os 5 minutos definidos
     * pela regra do produto.
     */

    const expiresAt =
      result.expiresAt
        ? new Date(
            result.expiresAt
          ).getTime()

        : Date.now() +
          INVITE_CONFIG.INVITE_DURATION_MS;


    state.expiresAt =
      expiresAt;


    await renderInvite();


    startCountdown(
      expiresAt
    );


    disableInviteActions(
      false
    );


    log(
      "info",
      "Convite gerado com sucesso.",
      {
        campaignId,
        expiresAt
      }
    );


    return result;

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao gerar convite.",
      error
    );


    showToast(
      getInviteErrorMessage(
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
   NORMALIZA RESULTADO RPC
   ============================================================ */

function normalizeInviteResult(
  value
) {

  /*
   * Supabase pode retornar:
   *
   * objeto
   * array com um objeto
   * ou estrutura embrulhada.
   */

  let data =
    value;


  if (
    Array.isArray(
      data
    )
  ) {

    data =
      data[0] ||
      null;

  }


  data =
    object(
      data
    );


  /*
   * Aceita nomes comuns para manter compatibilidade
   * com pequenas diferenças entre versões da função.
   */

  const code =
    string(
      data.code
    ) ||

    string(
      data.invite_code
    ) ||

    string(
      data.inviteCode
    ) ||

    string(
      data.token
    );


  const expiresAt =
    string(
      data.expires_at
    ) ||

    string(
      data.expiresAt
    ) ||

    string(
      data.expiration
    );


  if (
    !code
  ) {

    return null;

  }


  return {

    code:
      code.slice(
        0,
        INVITE_CONFIG.MAX_CODE_LENGTH
      ),

    expiresAt:
      expiresAt ||
      null

  };

}


/* ============================================================
   LINK
   ============================================================ */

function buildInviteLink(
  code
) {

  const cleanCode =
    string(
      code
    );


  if (
    !cleanCode
  ) {

    return "";

  }


  /*
   * URL absoluta baseada no local atual do site.
   *
   * Funciona tanto no GitHub Pages quanto no ambiente
   * de desenvolvimento.
   */

  const url =
    new URL(
      INVITE_CONFIG.JOIN_PAGE,
      window.location.href
    );


  /*
   * O entrar.html receberá o código pela URL.
   */

  url.searchParams.set(
    "code",
    cleanCode
  );


  return url.href;

}


/* ============================================================
   QR CODE
   ============================================================ */

function loadQRCodeLibrary() {

  if (
    typeof window.QRCode ===
    "function"
  ) {

    return Promise.resolve(
      window.QRCode
    );

  }


  if (
    state.qrLibraryLoading
  ) {

    return state.qrLibraryLoading;

  }


  state.qrLibraryLoading =
    new Promise(
      (
        resolve,
        reject
      ) => {

        const existing =
          document.querySelector(
            "script[data-aeriom-qrcode]"
          );


        if (
          existing
        ) {

          existing.addEventListener(
            "load",
            () => {

              if (
                typeof window.QRCode ===
                  "function"
              ) {

                resolve(
                  window.QRCode
                );

              } else {

                reject(
                  new Error(
                    "Biblioteca de QR Code não carregou."
                  )
                );

              }

            },
            {
              once:
                true
            }
          );


          existing.addEventListener(
            "error",
            () => {

              reject(
                new Error(
                  "Não foi possível carregar a biblioteca de QR Code."
                )
              );

            },
            {
              once:
                true
            }
          );


          return;

        }


        const script =
          document.createElement(
            "script"
          );


        script.src =
          INVITE_CONFIG.QR_LIBRARY_URL;


        script.async =
          true;


        script.dataset.aeriomQrcode =
          "true";


        script.addEventListener(
          "load",
          () => {

            if (
              typeof window.QRCode ===
                "function"
            ) {

              resolve(
                window.QRCode
              );

            } else {

              reject(
                new Error(
                  "QRCode não ficou disponível depois do carregamento."
                )
              );

            }

          },
          {
            once:
              true
          }
        );


        script.addEventListener(
          "error",
          () => {

            reject(
              new Error(
                "Falha ao carregar biblioteca de QR Code."
              )
            );

          },
          {
            once:
              true
          }
        );


        document.head.appendChild(
          script
        );

      }
    )
      .finally(
        () => {

          state.qrLibraryLoading =
            null;

        }
      );


  return state.qrLibraryLoading;

}


async function renderQRCode(
  link
) {

  const container =
    $(
      "campaign-invite-qr"
    );


  if (
    !container
  ) {

    return;

  }


  container.replaceChildren();


  if (
    !link
  ) {

    return;

  }


  try {

    const QRCode =
      await loadQRCodeLibrary();


    container.replaceChildren();


    new QRCode(
      container,
      {
        text:
          link,

        width:
          INVITE_CONFIG.QR_SIZE,

        height:
          INVITE_CONFIG.QR_SIZE,

        colorDark:
          "#111111",

        colorLight:
          "#ffffff",

        correctLevel:
          QRCode.CorrectLevel.H

      }
    );


  } catch (
    error
  ) {

    log(
      "warn",
      "QR Code não pôde ser gerado.",
      error
    );


    /*
     * Fallback visual.
     */

    const fallback =
      document.createElement(
        "div"
      );


    fallback.className =
      "campaign-invite__qr-error";


    fallback.textContent =
      "QR Code indisponível. Use o link abaixo.";


    container.appendChild(
      fallback
    );

  }

}


/* ============================================================
   RENDER CONVITE
   ============================================================ */

async function renderInvite() {

  const invite =
    state.invite;


  if (
    !invite
  ) {

    return;

  }


  const code =
    $(
      "campaign-invite-code"
    );


  const linkInput =
    $(
      "campaign-invite-link"
    );


  if (
    code
  ) {

    code.textContent =
      invite.code;

  }


  const link =
    buildInviteLink(
      invite.code
    );


  if (
    linkInput
  ) {

    linkInput.value =
      link;

  }


  const expiration =
    $(
      "campaign-invite-expiration"
    );


  if (
    expiration
  ) {

    expiration.textContent =
      "Gerando validade...";

  }


  disableInviteActions(
    false
  );


  await renderQRCode(
    link
  );

}


/* ============================================================
   ABRIR CONVITE
   ============================================================ */

async function openInvite() {

  if (
    state.opening
  ) {

    return;

  }


  state.opening =
    true;


  try {

    if (
      !readCampaignContext()
    ) {

      showToast(
        "A mesa ainda está carregando.",
        "error"
      );


      return;

    }


    if (
      !isMaster()
    ) {

      showToast(
        "Somente o Mestre pode convidar jogadores.",
        "error"
      );


      return;

    }


    if (
      !openModal()
    ) {

      return;

    }


    /*
     * Cada abertura gera um convite novo.
     */

    clearInviteState();


    await generateInvite();

  } finally {

    state.opening =
      false;

  }

}


/* ============================================================
   COPIAR
   ============================================================ */

async function copyText(
  value,
  successMessage
) {

  const textValue =
    string(
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

      /*
       * Fallback para navegadores mais antigos.
       */

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        textValue;


      textarea.style.position =
        "fixed";


      textarea.style.opacity =
        "0";


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
          "Não foi possível copiar."
        );

      }

    }


    showToast(
      successMessage ||
      "Copiado!",
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
      "Não foi possível copiar automaticamente.",
      "error"
    );


    return false;

  }

}


function copyCode() {

  const code =
    state.invite?.code ||
    $(
      "campaign-invite-code"
    )?.textContent;


  return copyText(
    code,
    "Código copiado!"
  );

}


function copyLink() {

  const input =
    $(
      "campaign-invite-link"
    );


  return copyText(
    input?.value,
    "Link copiado!"
  );

}


/* ============================================================
   COMPARTILHAR
   ============================================================ */

async function shareInvite() {

  const code =
    state.invite?.code;


  const link =
    buildInviteLink(
      code
    );


  if (
    !link
  ) {

    showToast(
      "Gere um convite primeiro.",
      "error"
    );


    return false;

  }


  const campaignName =
    string(
      state.campaign?.name,
      "campanha"
    );


  const shareData = {

    title:
      `Convite para ${campaignName}`,

    text:
      `Você foi convidado para participar da campanha ${campaignName} no AERIOM. Código: ${code}`,

    url:
      link

  };


  try {

    if (
      typeof navigator.share ===
      "function"
    ) {

      await navigator.share(
        shareData
      );


      return true;

    }


    return copyLink();

  } catch (
    error
  ) {

    /*
     * Cancelamento manual do compartilhamento
     * não deve ser tratado como erro grave.
     */

    if (
      error?.name ===
      "AbortError"
    ) {

      return false;

    }


    log(
      "warn",
      "Falha ao compartilhar convite.",
      error
    );


    return copyLink();

  }

}


/* ============================================================
   REGENERAR
   ============================================================ */

async function regenerateInvite() {

  clearInviteState();


  await generateInvite();

}


/* ============================================================
   FECHAMENTO
   ============================================================ */

function bindCloseEvents() {

  const closeButton =
    $(
      "campaign-invite-close"
    );


  if (
    closeButton
  ) {

    closeButton.addEventListener(
      "click",
      closeModal
    );

  }


  document
    .querySelectorAll(
      "[data-campaign-modal-close]"
    )
    .forEach(
      backdrop => {

        backdrop.addEventListener(
          "click",
          closeModal
        );

      }
    );

}


/* ============================================================
   BOTÃO DE ABRIR
   ============================================================ */

function bindOpenEvents() {

  const sidebarButton =
    $(
      "campaign-invite-sidebar-button"
    );


  if (
    sidebarButton
  ) {

    sidebarButton.addEventListener(
      "click",
      event => {

        event.preventDefault();


        openInvite();

      }
    );

  }


  const mobileButton =
    $(
      "campaign-mobile-invite-button"
    );


  if (
    mobileButton
  ) {

    mobileButton.addEventListener(
      "click",
      event => {

        event.preventDefault();


        openInvite();

      }
    );

  }

}


/* ============================================================
   AÇÕES
   ============================================================ */

function bindActionEvents() {

  $(
    "campaign-invite-copy-code"
  )
    ?.addEventListener(
      "click",
      copyCode
    );


  $(
    "campaign-invite-copy-link"
  )
    ?.addEventListener(
      "click",
      copyLink
    );


  $(
    "campaign-invite-share"
  )
    ?.addEventListener(
      "click",
      shareInvite
    );

}


/* ============================================================
   EVENTO DA CAMPANHA
   ============================================================ */

function bindCampaignEvent() {

  window.addEventListener(
    "aeriom:campaigninvite",
    () => {

      openInvite();

    }
  );


  /*
   * Quando a campanha fica pronta, atualizamos o contexto.
   */

  window.addEventListener(
    "aeriom:campaignready",
    () => {

      readCampaignContext();

    }
  );

}


/* ============================================================
   TECLADO
   ============================================================ */

function bindKeyboard() {

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
   START
   ============================================================ */

function start() {

  if (
    state.bound
  ) {

    return;

  }


  state.bound =
    true;


  bindOpenEvents();

  bindCloseEvents();

  bindActionEvents();

  bindCampaignEvent();

  bindKeyboard();

  readCampaignContext();


  exposeApi();


  log(
    "info",
    "Sistema de convites inicializado."
  );

}


/* ============================================================
   API GLOBAL
   ============================================================ */

function exposeApi() {

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

      getInvite:
        () =>
          state.invite,

      getLink:
        () =>
          buildInviteLink(
            state.invite?.code
          )

    });

}


/* ============================================================
   DESTROY
   ============================================================ */

function destroy() {

  stopCountdown();


  closeModal();


  state.initialized =
    false;

  state.opening =
    false;

  state.generating =
    false;

  state.supabase =
    null;

  state.user =
    null;

  state.campaign =
    null;

  state.membership =
    null;

  state.invite =
    null;

  state.expiresAt =
    null;

}


/* ============================================================
   AUTO START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    start,
    {
      once:
        true
    }
  );

} else {

  start();

}


/* ============================================================
   PAGE LIFECYCLE
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