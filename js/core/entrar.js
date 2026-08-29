/*
 * ============================================================
 * AERIOM v2
 * js/core/entrar.js
 * Entrada em campanha por código de convite
 * ============================================================
 *
 * Responsabilidades:
 *
 * - Verificar sessão do usuário.
 * - Ler código recebido pela URL.
 * - Permitir digitação manual do código.
 * - Validar formato do código.
 * - Chamar accept_campaign_invite().
 * - Redirecionar para a campanha após sucesso.
 *
 * NÃO é responsabilidade deste arquivo:
 *
 * - criar campanhas;
 * - administrar campanhas;
 * - autenticação OAuth;
 * - alterar RLS;
 * - acessar service_role;
 * - manipular diretamente tabelas protegidas.
 * ============================================================
 */


const CONFIG = Object.freeze({

  LOGIN_PAGE:
    "./index.html",

  CAMPAIGNS_PAGE:
    "./campanhas.html",

  CAMPAIGN_PAGE:
    "./campanha.html",

  CODE_LENGTH:
    5

});


let supabase =
  null;

let currentUser =
  null;

let isJoining =
  false;


/* ============================================================
   LOG
   ============================================================ */

function log(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][JOIN]";


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

function getElement(
  id
) {

  return document.getElementById(
    id
  );

}


/* ============================================================
   MENSAGEM
   ============================================================ */

function setMessage(
  message,
  type = "info"
) {

  const element =
    getElement(
      "join-message"
    );


  if (!element) {
    return;
  }


  element.textContent =
    message || "";


  element.dataset.type =
    type;

}


/* ============================================================
   BOTÃO
   ============================================================ */

function setLoading(
  loading
) {

  const button =
    getElement(
      "join-submit"
    );


  if (!button) {
    return;
  }


  button.disabled =
    loading;


  button.classList.toggle(
    "is-loading",
    loading
  );

}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function normalizeCode(
  value
) {

  return String(
    value ?? ""
  )
    .trim()
    .toUpperCase()
    .replace(
      /\s+/g,
      ""
    );

}


/* ============================================================
   VALIDAÇÃO
   ============================================================ */

function isValidCode(
  code
) {

  return /^[A-Z0-9]{5}$/.test(
    code
  );

}


/* ============================================================
   URL
   ============================================================ */

function getCodeFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  return normalizeCode(
    params.get(
      "code"
    )
  );

}


/* ============================================================
   REDIRECIONAMENTO
   ============================================================ */

function redirectToCampaign(
  campaignId
) {

  if (!campaignId) {

    window.location.replace(
      CONFIG.CAMPAIGNS_PAGE
    );

    return;
  }


  const url =
    new URL(
      CONFIG.CAMPAIGN_PAGE,
      window.location.href
    );


  url.searchParams.set(
    "campaign",
    String(
      campaignId
    )
  );


  window.location.replace(
    url.href
  );

}


/* ============================================================
   SESSÃO
   ============================================================ */

async function loadSession() {

  if (
    !supabase?.auth
  ) {

    throw new Error(
      "O cliente de autenticação não está disponível."
    );

  }


  const {
    data,
    error
  } =
    await supabase.auth.getSession();


  if (error) {

    throw error;

  }


  const session =
    data?.session;


  if (
    !session?.user
  ) {

    currentUser =
      null;


    window.location.replace(
      CONFIG.LOGIN_PAGE
    );


    return null;

  }


  currentUser =
    session.user;


  return currentUser;

}


/* ============================================================
   ENTRAR NA CAMPANHA
   ============================================================ */

async function joinCampaign(
  code
) {

  if (
    isJoining
  ) {
    return;
  }


  if (
    !supabase
  ) {

    setMessage(
      "O sistema ainda está inicializando. Tente novamente.",
      "error"
    );

    return;

  }


  if (
    !currentUser
  ) {

    window.location.replace(
      CONFIG.LOGIN_PAGE
    );

    return;

  }


  const normalizedCode =
    normalizeCode(
      code
    );


  if (
    !isValidCode(
      normalizedCode
    )
  ) {

    setMessage(
      "Digite um código válido de 5 caracteres.",
      "error"
    );

    getElement(
      "campaign-invite-code-input"
    )?.focus();

    return;

  }


  isJoining =
    true;


  setLoading(
    true
  );


  setMessage(
    ""
  );


  try {

    /*
     * IMPORTANTE:
     *
     * A função SQL é responsável por:
     *
     * - validar o convite;
     * - verificar expiração;
     * - verificar limite de usos;
     * - impedir entrada duplicada;
     * - adicionar o usuário como player.
     *
     * O frontend NÃO acessa service_role.
     */

    const {
      data,
      error
    } =
      await supabase.rpc(
        "accept_campaign_invite",
        {
          p_invite_code:
            normalizedCode
        }
      );


    if (error) {

      log(
        "error",
        "Falha ao aceitar convite.",
        error
      );


      /*
       * O banco pode retornar uma mensagem
       * específica. Usamos ela quando existir.
       */

      throw new Error(
        error.message ||
        "Não foi possível aceitar o convite."
      );

    }


    /*
     * A função pode retornar:
     *
     * {
     *   campaign_id: "..."
     * }
     *
     * ou uma linha dentro de um array.
     */

    let result =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    /*
     * Alguns retornos podem vir como string,
     * dependendo da assinatura da função.
     */

    if (
      typeof result ===
      "string"
    ) {

      result = {
        campaign_id:
          result
      };

    }


    const campaignId =
      result?.campaign_id ||
      result?.id ||
      result?.campaignId ||
      null;


    if (
      !campaignId
    ) {

      /*
       * Mesmo sem campaign_id no retorno,
       * a entrada pode ter sido concluída.
       *
       * Nesse caso voltamos para a lista,
       * onde a campanha será carregada novamente.
       */

      setMessage(
        "Você entrou na campanha com sucesso.",
        "success"
      );


      window.setTimeout(
        () => {

          window.location.replace(
            CONFIG.CAMPAIGNS_PAGE
          );

        },
        500
      );


      return;

    }


    setMessage(
      "Você entrou na campanha com sucesso.",
      "success"
    );


    window.setTimeout(
      () => {

        redirectToCampaign(
          campaignId
        );

      },
      350
    );


  } catch (
    error
  ) {

    log(
      "error",
      "Não foi possível entrar na campanha.",
      error
    );


    const message =
      getFriendlyInviteError(
        error
      );


    setMessage(
      message,
      "error"
    );


  } finally {

    isJoining =
      false;


    setLoading(
      false
    );

  }

}


/* ============================================================
   ERROS AMIGÁVEIS
   ============================================================ */

function getFriendlyInviteError(
  error
) {

  const raw =
    String(
      error?.message ||
      ""
    );


  const normalized =
    raw.toLowerCase();


  /*
   * Convite expirado.
   */

  if (
    normalized.includes(
      "expired"
    ) ||
    normalized.includes(
      "expir"
    ) ||
    normalized.includes(
      "expirado"
    )
  ) {

    return (
      "Esse convite expirou. Peça ao mestre um novo código."
    );

  }


  /*
   * Código inexistente.
   */

  if (
    normalized.includes(
      "invalid"
    ) ||
    normalized.includes(
      "inválido"
    ) ||
    normalized.includes(
      "invalido"
    ) ||
    normalized.includes(
      "not found"
    ) ||
    normalized.includes(
      "não encontrado"
    )
  ) {

    return (
      "Esse código de convite não é válido."
    );

  }


  /*
   * Limite de usos.
   */

  if (
    normalized.includes(
      "max"
    ) ||
    normalized.includes(
      "limit"
    ) ||
    normalized.includes(
      "uso"
    ) ||
    normalized.includes(
      "uses"
    )
  ) {

    return (
      "Esse convite não possui mais usos disponíveis."
    );

  }


  /*
   * Usuário já está na campanha.
   */

  if (
    normalized.includes(
      "already"
    ) ||
    normalized.includes(
      "duplicate"
    ) ||
    normalized.includes(
      "unique"
    ) ||
    normalized.includes(
      "já está"
    ) ||
    normalized.includes(
      "ja esta"
    )
  ) {

    return (
      "Você já faz parte dessa campanha."
    );

  }


  /*
   * Permissão/RLS.
   */

  if (
    normalized.includes(
      "permission"
    ) ||
    normalized.includes(
      "forbidden"
    ) ||
    normalized.includes(
      "row-level security"
    ) ||
    normalized.includes(
      "rls"
    ) ||
    normalized.includes(
      "403"
    )
  ) {

    return (
      "O banco recusou a entrada na campanha. Verifique sua sessão e tente novamente."
    );

  }


  /*
   * Sessão.
   */

  if (
    normalized.includes(
      "jwt"
    ) ||
    normalized.includes(
      "auth"
    ) ||
    normalized.includes(
      "session"
    )
  ) {

    return (
      "Sua sessão não está válida. Entre novamente no AERIOM."
    );

  }


  return (
    raw ||
    "Não foi possível entrar nessa campanha. Verifique o código e tente novamente."
  );

}


/* ============================================================
   FORMATAÇÃO DO INPUT
   ============================================================ */

function bindCodeInput() {

  const input =
    getElement(
      "campaign-invite-code-input"
    );


  if (!input) {
    return;
  }


  input.addEventListener(
    "input",
    () => {

      const normalized =
        normalizeCode(
          input.value
        );


      /*
       * Mantém somente letras e números.
       */

      input.value =
        normalized
          .replace(
            /[^A-Z0-9]/g,
            ""
          )
          .slice(
            0,
            CONFIG.CODE_LENGTH
          );

    }
  );

}


/* ============================================================
   FORM
   ============================================================ */

function bindForm() {

  const form =
    getElement(
      "join-campaign-form"
    );


  if (!form) {

    throw new Error(
      "Formulário de entrada na campanha não encontrado."
    );

  }


  form.addEventListener(
    "submit",
    async (
      event
    ) => {

      event.preventDefault();


      const input =
        getElement(
          "campaign-invite-code-input"
        );


      const code =
        input?.value ||
        "";


      await joinCampaign(
        code
      );

    }
  );

}


/* ============================================================
   AUTOPREENCHIMENTO
   ============================================================ */

function applyUrlCode() {

  const code =
    getCodeFromUrl();


  const input =
    getElement(
      "campaign-invite-code-input"
    );


  if (
    !input ||
    !code
  ) {
    return;
  }


  input.value =
    code;

}


/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */

function bindAuthListener() {

  if (
    !supabase?.auth
  ) {
    return;
  }


  supabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      if (
        event ===
          "SIGNED_OUT" ||
        !session?.user
      ) {

        window.location.replace(
          CONFIG.LOGIN_PAGE
        );

        return;
      }


      currentUser =
        session.user;

    }
  );

}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function init() {

  try {

    /*
     * O arquivo supabase.js é o único responsável
     * por criar/carregar o cliente.
     */

    const module =
      await import(
        "./supabase.js"
      );


    if (
      typeof module.getSupabase !==
      "function"
    ) {

      throw new Error(
        "getSupabase() não está disponível em supabase.js."
      );

    }


    supabase =
      await module.getSupabase();


    if (
      !supabase
    ) {

      throw new Error(
        "O cliente Supabase não foi inicializado."
      );

    }


    bindForm();

    bindCodeInput();

    applyUrlCode();

    bindAuthListener();


    const user =
      await loadSession();


    if (!user) {
      return;
    }


    const input =
      getElement(
        "campaign-invite-code-input"
      );


    /*
     * Se o código veio pela URL,
     * colocamos o foco no botão para facilitar
     * a confirmação.
     */

    if (
      input?.value
    ) {

      getElement(
        "join-submit"
      )?.focus();

    } else {

      input?.focus();

    }


    log(
      "info",
      "Página de entrada em campanha inicializada."
    );


  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao inicializar página de entrada.",
      error
    );


    setMessage(
      error?.message ||
      "Não foi possível inicializar esta página.",
      "error"
    );

  }

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