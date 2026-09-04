/*
 * ============================================================
 * AERIOM v2
 * js/core/auth.js
 * Sistema central de autenticação
 * ============================================================
 *
 * Responsabilidades:
 *
 * - Login por e-mail e senha
 * - Cadastro
 * - Confirmação de e-mail
 * - Login via Discord
 * - Recuperação de senha
 * - Atualização de senha
 * - Restauração de sessão
 * - Tratamento de callback OAuth / PKCE
 * - Redirecionamento após autenticação
 * - Logout
 *
 * Segurança:
 *
 * - Supabase Auth é a autoridade de identidade.
 * - PostgreSQL/RLS é a autoridade de autorização.
 * - localStorage NÃO é usado para autorização.
 *
 * ============================================================
 */


/* ============================================================
   IMPORTS
   ============================================================ */

import {
  getSupabase,
  normalizeSupabaseError
} from "./supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const AUTH_CONFIG = Object.freeze({

  authenticatedPage:
    "./campanhas.html",

  loginPage:
    "./index.html",

  /*
   * Página usada pelos fluxos de OAuth e confirmação.
   *
   * Relative URL é resolvida pelo navegador na origem atual.
   * Isso funciona no GitHub Pages tanto em:
   *
   * https://henriqux77.github.io/Aeriom-v2/
   *
   * quanto durante desenvolvimento local.
   */

  callbackPage:
    "./index.html",

  minimumLoadingTime:
    250,

  /*
   * Não fazemos infinitas tentativas de redirecionamento.
   */

  callbackCleanupEnabled:
    true

});


/* ============================================================
   ESTADO
   ============================================================ */

let initialized =
  false;

let authSubscription =
  null;

let submitting =
  false;

let redirecting =
  false;


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
   LOG
   ============================================================ */

function logAuth(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][AUTH]";


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
   MENSAGENS
   ============================================================ */

function clearAuthMessage() {

  const element =
    getElement(
      "auth-message"
    );


  if (!element) {

    return;

  }


  element.hidden =
    true;

  element.textContent =
    "";

  element.removeAttribute(
    "data-type"
  );

}


function showAuthMessage(
  message,
  type = "error"
) {

  const element =
    getElement(
      "auth-message"
    );


  if (!element) {

    return;

  }


  element.textContent =
    String(
      message ?? ""
    );


  element.dataset.type =
    type;


  element.hidden =
    false;

}


/* ============================================================
   ERROS
   ============================================================ */

function translateAuthError(
  error
) {

  const raw =
    String(
      error?.message ??
      ""
    );


  const message =
    raw.toLowerCase();


  if (
    message.includes(
      "invalid login credentials"
    ) ||
    message.includes(
      "invalid credentials"
    )
  ) {

    return (
      "E-mail ou senha incorretos."
    );

  }


  if (
    message.includes(
      "email not confirmed"
    ) ||
    message.includes(
      "email_not_confirmed"
    )
  ) {

    return (
      "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada."
    );

  }


  if (
    message.includes(
      "user already registered"
    ) ||
    message.includes(
      "already registered"
    )
  ) {

    return (
      "Este e-mail já possui uma conta."
    );

  }


  if (
    message.includes(
      "invalid email"
    )
  ) {

    return (
      "Digite um endereço de e-mail válido."
    );

  }


  if (
    message.includes(
      "password"
    ) &&
    (
      message.includes(
        "short"
      ) ||
      message.includes(
        "weak"
      ) ||
      message.includes(
        "least"
      )
    )
  ) {

    return (
      "A senha não atende aos requisitos mínimos de segurança."
    );

  }


  if (
    message.includes(
      "rate limit"
    ) ||
    message.includes(
      "too many requests"
    )
  ) {

    return (
      "Muitas tentativas. Aguarde um pouco e tente novamente."
    );

  }


  if (
    message.includes(
      "redirect"
    )
  ) {

    return (
      "A URL de retorno não está autorizada no Supabase."
    );

  }


  if (
    message.includes(
      "provider"
    ) &&
    message.includes(
      "disabled"
    )
  ) {

    return (
      "O login com esse provedor não está habilitado no Supabase."
    );

  }


  if (
    message.includes(
      "code verifier"
    ) ||
    message.includes(
      "pkce"
    )
  ) {

    return (
      "Não foi possível concluir a autenticação. Tente entrar novamente."
    );

  }


  if (
    message.includes(
      "otp"
    ) &&
    message.includes(
      "expired"
    )
  ) {

    return (
      "O link de confirmação expirou. Solicite um novo e-mail."
    );

  }


  if (
    message.includes(
      "token"
    ) &&
    message.includes(
      "expired"
    )
  ) {

    return (
      "O link de autenticação expirou. Solicite um novo."
    );

  }


  if (
    message.includes(
      "failed to fetch"
    ) ||
    message.includes(
      "network"
    )
  ) {

    return (
      "Não foi possível conectar ao servidor."
    );

  }


  return (
    error?.message ||
    "Não foi possível concluir a autenticação."
  );

}


/* ============================================================
   VALIDAÇÃO E-MAIL
   ============================================================ */

function isValidEmail(
  email
) {

  if (
    typeof email !==
    "string"
  ) {

    return false;

  }


  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );

}


/* ============================================================
   VALIDAÇÃO SENHA
   ============================================================ */

function validatePassword(
  password
) {

  if (
    !password
  ) {

    return (
      "Digite uma senha."
    );

  }


  if (
    password.length <
    8
  ) {

    return (
      "A senha precisa ter pelo menos 8 caracteres."
    );

  }


  return null;

}


/* ============================================================
   CAMPOS
   ============================================================ */

function setFieldError(
  inputId,
  errorId,
  message
) {

  const input =
    getElement(
      inputId
    );


  const error =
    getElement(
      errorId
    );


  if (
    input
  ) {

    input.setAttribute(
      "aria-invalid",
      message
        ? "true"
        : "false"
    );

  }


  if (
    error
  ) {

    error.textContent =
      message ||
      "";

  }

}


function clearFieldError(
  inputId,
  errorId
) {

  setFieldError(
    inputId,
    errorId,
    ""
  );

}


/* ============================================================
   FORM HELPERS
   ============================================================ */

function getFormValue(
  form,
  name,
  trim = true
) {

  if (
    !form
  ) {

    return "";

  }


  const field =
    form.elements?.namedItem(
      name
    );


  if (
    !field
  ) {

    return "";

  }


  const value =
    String(
      field.value ??
      ""
    );


  return trim
    ? value.trim()
    : value;

}


/* ============================================================
   LOGIN
   ============================================================ */

function clearLoginErrors() {

  clearFieldError(
    "login-email",
    "login-email-error"
  );


  clearFieldError(
    "login-password",
    "login-password-error"
  );

}


function validateLoginForm() {

  const form =
    getElement(
      "login-form"
    );


  if (
    !form
  ) {

    logAuth(
      "error",
      "login-form não encontrado."
    );


    return false;

  }


  clearLoginErrors();


  let valid =
    true;


  const email =
    getFormValue(
      form,
      "email"
    );


  /*
   * IMPORTANTE:
   *
   * Não usamos trim na senha.
   */

  const password =
    getFormValue(
      form,
      "password",
      false
    );


  if (
    !email
  ) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite seu e-mail."
    );


    valid =
      false;

  } else if (
    !isValidEmail(
      email
    )
  ) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite um e-mail válido."
    );


    valid =
      false;

  }


  if (
    !password
  ) {

    setFieldError(
      "login-password",
      "login-password-error",
      "Digite sua senha."
    );


    valid =
      false;

  }


  return valid;

}


/* ============================================================
   CADASTRO
   ============================================================ */

function clearRegisterErrors() {

  clearFieldError(
    "register-name",
    "register-name-error"
  );


  clearFieldError(
    "register-email",
    "register-email-error"
  );


  clearFieldError(
    "register-password",
    "register-password-error"
  );


  clearFieldError(
    "register-password-confirm",
    "register-password-confirm-error"
  );

}


function validateRegisterForm() {

  const form =
    getElement(
      "register-form"
    );


  if (
    !form
  ) {

    logAuth(
      "error",
      "register-form não encontrado."
    );


    return false;

  }


  clearRegisterErrors();


  let valid =
    true;


  const name =
    getFormValue(
      form,
      "displayName"
    );


  const email =
    getFormValue(
      form,
      "email"
    );


  const password =
    getFormValue(
      form,
      "password",
      false
    );


  const confirmation =
    getFormValue(
      form,
      "passwordConfirm",
      false
    );


  if (
    !name
  ) {

    setFieldError(
      "register-name",
      "register-name-error",
      "Digite seu nome."
    );


    valid =
      false;

  } else if (
    name.length <
    2
  ) {

    setFieldError(
      "register-name",
      "register-name-error",
      "O nome precisa ter pelo menos 2 caracteres."
    );


    valid =
      false;

  }


  if (
    !email
  ) {

    setFieldError(
      "register-email",
      "register-email-error",
      "Digite seu e-mail."
    );


    valid =
      false;

  } else if (
    !isValidEmail(
      email
    )
  ) {

    setFieldError(
      "register-email",
      "register-email-error",
      "Digite um e-mail válido."
    );


    valid =
      false;

  }


  const passwordError =
    validatePassword(
      password
    );


  if (
    passwordError
  ) {

    setFieldError(
      "register-password",
      "register-password-error",
      passwordError
    );


    valid =
      false;

  }


  if (
    !confirmation
  ) {

    setFieldError(
      "register-password-confirm",
      "register-password-confirm-error",
      "Confirme sua senha."
    );


    valid =
      false;

  } else if (
    password !==
    confirmation
  ) {

    setFieldError(
      "register-password-confirm",
      "register-password-confirm-error",
      "As senhas não coincidem."
    );


    valid =
      false;

  }


  return valid;

}


/* ============================================================
   BOTÕES / LOADING
   ============================================================ */

function setButtonLoading(
  button,
  loading,
  loadingText = ""
) {

  if (
    !button
  ) {

    return;

  }


  button.disabled =
    Boolean(
      loading
    );


  button.classList.toggle(
    "is-loading",
    Boolean(
      loading
    )
  );


  const label =
    button.querySelector(
      ".button__label"
    );


  const loadingElement =
    button.querySelector(
      ".button__loading"
    );


  if (
    label
  ) {

    label.hidden =
      Boolean(
        loading
      );

  }


  if (
    loadingElement
  ) {

    if (
      loadingText
    ) {

      loadingElement.textContent =
        loadingText;

    }


    loadingElement.hidden =
      !loading;

  }

}


/* ============================================================
   WAIT
   ============================================================ */

async function waitMinimumLoadingTime(
  startedAt
) {

  const elapsed =
    Date.now() -
    startedAt;


  const remaining =
    AUTH_CONFIG.minimumLoadingTime -
    elapsed;


  if (
    remaining <=
    0
  ) {

    return;

  }


  await new Promise(
    resolve => {

      window.setTimeout(
        resolve,
        remaining
      );

    }
  );

}


/* ============================================================
   PÁGINA
   ============================================================ */

function isAuthPage() {

  const path =
    window.location.pathname
      .toLowerCase();


  return (
    path.endsWith(
      "/index.html"
    ) ||
    path.endsWith(
      "/"
    )
  );

}


function redirectToCampaigns() {

  if (
    redirecting
  ) {

    return;

  }


  redirecting =
    true;


  window.location.replace(
    AUTH_CONFIG.authenticatedPage
  );

}


/* ============================================================
   CALLBACK
   ============================================================ */

function hasAuthCallbackParams() {

  const search =
    new URLSearchParams(
      window.location.search
    );


  const hash =
    new URLSearchParams(
      window.location.hash
        .replace(
          /^#/,
          ""
        )
    );


  return (
    search.has(
      "code"
    ) ||
    search.has(
      "error"
    ) ||
    search.has(
      "error_code"
    ) ||
    search.has(
      "error_description"
    ) ||
    hash.has(
      "access_token"
    ) ||
    hash.has(
      "refresh_token"
    ) ||
    hash.has(
      "error"
    ) ||
    hash.has(
      "error_description"
    )
  );

}


/* ============================================================
   MOSTRAR ERRO DO CALLBACK
   ============================================================ */

function handleAuthCallbackError() {

  const search =
    new URLSearchParams(
      window.location.search
    );


  const hash =
    new URLSearchParams(
      window.location.hash
        .replace(
          /^#/,
          ""
        )
    );


  const description =
    search.get(
      "error_description"
    ) ||
    hash.get(
      "error_description"
    );


  const errorCode =
    search.get(
      "error_code"
    ) ||
    hash.get(
      "error_code"
    );


  if (
    !description &&
    !errorCode
  ) {

    return false;

  }


  let message =
    "Não foi possível concluir a autenticação.";


  if (
    errorCode
  ) {

    message =
      `Não foi possível concluir a autenticação (${errorCode}).`;

  }


  if (
    description
  ) {

    try {

      message =
        decodeURIComponent(
          description
        );

    } catch {

      message =
        description;

    }

  }


  showAuthMessage(
    message,
    "error"
  );


  return true;

}


/* ============================================================
   LIMPAR CALLBACK
   ============================================================ */

function cleanAuthCallbackUrl() {

  if (
    !AUTH_CONFIG.callbackCleanupEnabled
  ) {

    return;

  }


  const url =
    new URL(
      window.location.href
    );


  /*
   * Esses parâmetros são usados apenas no retorno
   * do Supabase Auth.
   */

  const keysToDelete = [

    "code",
    "error",
    "error_code",
    "error_description",
    "error_reason",
    "type",
    "state"

  ];


  keysToDelete.forEach(
    key => {

      url.searchParams.delete(
        key
      );

    }
  );


  /*
   * Hash OAuth também não precisa permanecer
   * depois de a sessão ter sido processada.
   */

  url.hash =
    "";


  /*
   * Só muda a URL.
   * Não recarrega a página.
   */

  window.history.replaceState(
    {},
    document.title,
    url.pathname +
    (
      url.search
        ? `?${url.searchParams.toString()}`
        : ""
    )
  );

}


/* ============================================================
   LOGIN E-MAIL
   ============================================================ */

async function handleLogin(
  event
) {

  event.preventDefault();


  if (
    submitting
  ) {

    return;

  }


  clearAuthMessage();


  if (
    !validateLoginForm()
  ) {

    return;

  }


  const form =
    event.currentTarget;


  const email =
    getFormValue(
      form,
      "email"
    );


  const password =
    getFormValue(
      form,
      "password",
      false
    );


  const button =
    getElement(
      "login-submit"
    );


  const startedAt =
    Date.now();


  submitting =
    true;


  setButtonLoading(
    button,
    true,
    "Entrando..."
  );


  try {

    const supabase =
      await getSupabase();


    logAuth(
      "info",
      "Tentando login por e-mail."
    );


    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword({

        email,

        password

      });


    if (
      error
    ) {

      throw error;

    }


    if (
      !data?.session
    ) {

      /*
       * O Supabase normalmente retorna sessão
       * quando a confirmação está completa.
       */

      throw new Error(
        "Login concluído sem uma sessão válida."
      );

    }


    logAuth(
      "info",
      "Login por e-mail realizado."
    );


    await waitMinimumLoadingTime(
      startedAt
    );


    redirectToCampaigns();


  } catch (
    error
  ) {

    const normalized =
      normalizeSupabaseError(
        error,
        {

          file:
            "js/core/auth.js",

          function:
            "handleLogin",

          table:
            "auth",

          operation:
            "signInWithPassword"

        }
      );


    logAuth(
      "error",
      "Falha no login.",
      normalized
    );


    showAuthMessage(
      translateAuthError(
        normalized
      ),
      "error"
    );


  } finally {

    setButtonLoading(
      button,
      false
    );


    submitting =
      false;

  }

}


/* ============================================================
   CADASTRO
   ============================================================ */

async function handleRegister(
  event
) {

  event.preventDefault();


  if (
    submitting
  ) {

    return;

  }


  clearAuthMessage();


  if (
    !validateRegisterForm()
  ) {

    return;

  }


  const form =
    event.currentTarget;


  const displayName =
    getFormValue(
      form,
      "displayName"
    );


  const email =
    getFormValue(
      form,
      "email"
    );


  const password =
    getFormValue(
      form,
      "password",
      false
    );


  const button =
    getElement(
      "register-submit"
    );


  const startedAt =
    Date.now();


  submitting =
    true;


  setButtonLoading(
    button,
    true,
    "Criando conta..."
  );


  try {

    const supabase =
      await getSupabase();


    const callbackUrl =
      getCallbackUrl();


    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email,

        password,

        options: {

          emailRedirectTo:
            callbackUrl,

          data: {

            display_name:
              displayName

          }

        }

      });


    if (
      error
    ) {

      throw error;

    }


    await waitMinimumLoadingTime(
      startedAt
    );


    /*
     * Caso o projeto esteja configurado para confirmar
     * o e-mail antes do login.
     */

    if (
      !data?.session
    ) {

      showAuthMessage(
        "Conta criada. Enviamos um link para seu e-mail. Confirme a conta para entrar no AERIOM.",
        "success"
      );


      form.elements.password.value =
        "";


      form.elements.passwordConfirm.value =
        "";


      return;

    }


    showAuthMessage(
      "Conta criada com sucesso. Entrando...",
      "success"
    );


    redirectToCampaigns();


  } catch (
    error
  ) {

    const normalized =
      normalizeSupabaseError(
        error,
        {

          file:
            "js/core/auth.js",

          function:
            "handleRegister",

          table:
            "auth",

          operation:
            "signUp"

        }
      );


    logAuth(
      "error",
      "Falha no cadastro.",
      normalized
    );


    showAuthMessage(
      translateAuthError(
        normalized
      ),
      "error"
    );


  } finally {

    setButtonLoading(
      button,
      false
    );


    submitting =
      false;

  }

}


/* ============================================================
   CALLBACK URL
   ============================================================ */

function getCallbackUrl() {

  const url =
    new URL(
      AUTH_CONFIG.callbackPage,
      window.location.href
    );


  /*
   * Não levamos query/hash para o callback.
   */

  url.search =
    "";

  url.hash =
    "";


  return url.href;

}


/* ============================================================
   DISCORD
   ============================================================ */

async function handleDiscordLogin() {

  if (
    submitting
  ) {

    return;

  }


  clearAuthMessage();


  const button =
    getElement(
      "discord-login-button"
    );


  submitting =
    true;


  setButtonLoading(
    button,
    true,
    "Conectando..."
  );


  try {

    const supabase =
      await getSupabase();


    const redirectTo =
      getCallbackUrl();


    logAuth(
      "info",
      "Iniciando login Discord.",
      {
        redirectTo
      }
    );


    const {
      data,
      error
    } =
      await supabase.auth.signInWithOAuth({

        provider:
          "discord",

        options: {

          redirectTo

        }

      });


    if (
      error
    ) {

      throw error;

    }


    /*
     * Em geral o Supabase já redireciona o navegador.
     *
     * Caso o SDK devolva explicitamente a URL,
     * fazemos a navegação.
     */

    if (
      data?.url
    ) {

      window.location.assign(
        data.url
      );

      return;

    }


  } catch (
    error
  ) {

    const normalized =
      normalizeSupabaseError(
        error,
        {

          file:
            "js/core/auth.js",

          function:
            "handleDiscordLogin",

          table:
            "auth",

          operation:
            "signInWithOAuth"

        }
      );


    logAuth(
      "error",
      "Falha no login Discord.",
      normalized
    );


    showAuthMessage(
      translateAuthError(
        normalized
      ),
      "error"
    );


    setButtonLoading(
      button,
      false
    );


    submitting =
      false;

  }

}


/* ============================================================
   RECUPERAÇÃO DE SENHA
   ============================================================ */

async function handlePasswordRecovery() {

  if (
    submitting
  ) {

    return;

  }


  clearAuthMessage();


  const input =
    getElement(
      "login-email"
    );


  const email =
    String(
      input?.value ??
      ""
    ).trim();


  if (
    !email
  ) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite seu e-mail para recuperar a senha."
    );


    input?.focus();


    return;

  }


  if (
    !isValidEmail(
      email
    )
  ) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite um e-mail válido."
    );


    input?.focus();


    return;

  }


  clearFieldError(
    "login-email",
    "login-email-error"
  );


  submitting =
    true;


  try {

    const supabase =
      await getSupabase();


    const {
      error
    } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {

          redirectTo:
            getCallbackUrl()

        }
      );


    if (
      error
    ) {

      throw error;

    }


    /*
     * Mensagem neutra.
     *
     * Não revelamos se o e-mail existe.
     */

    showAuthMessage(
      "Se existir uma conta associada a esse e-mail, enviaremos as instruções para redefinir sua senha.",
      "success"
    );


  } catch (
    error
  ) {

    const normalized =
      normalizeSupabaseError(
        error,
        {

          file:
            "js/core/auth.js",

          function:
            "handlePasswordRecovery",

          table:
            "auth",

          operation:
            "resetPasswordForEmail"

        }
      );


    logAuth(
      "error",
      "Falha na recuperação de senha.",
      normalized
    );


    showAuthMessage(
      translateAuthError(
        normalized
      ),
      "error"
    );


  } finally {

    submitting =
      false;

  }

}


/* ============================================================
   ATUALIZAR SENHA
   ============================================================ */

export async function updatePassword(
  newPassword
) {

  const validation =
    validatePassword(
      newPassword
    );


  if (
    validation
  ) {

    throw new Error(
      validation
    );

  }


  const supabase =
    await getSupabase();


  const {
    error
  } =
    await supabase.auth.updateUser({

      password:
        newPassword

    });


  if (
    error
  ) {

    throw normalizeSupabaseError(
      error,
      {

        file:
          "js/core/auth.js",

        function:
          "updatePassword",

        table:
          "auth",

        operation:
          "updateUser"

      }
    );

  }

}


/* ============================================================
   SESSÃO ATUAL
   ============================================================ */

export async function getCurrentSession() {

  const supabase =
    await getSupabase();


  const {
    data,
    error
  } =
    await supabase.auth.getSession();


  if (
    error
  ) {

    throw normalizeSupabaseError(
      error,
      {

        file:
          "js/core/auth.js",

        function:
          "getCurrentSession",

        table:
          "auth",

        operation:
          "getSession"

      }
    );

  }


  return (
    data?.session ||
    null
  );

}


/* ============================================================
   USUÁRIO ATUAL
   ============================================================ */

export async function getCurrentUser() {

  const supabase =
    await getSupabase();


  const {
    data,
    error
  } =
    await supabase.auth.getUser();


  if (
    error
  ) {

    throw normalizeSupabaseError(
      error,
      {

        file:
          "js/core/auth.js",

        function:
          "getCurrentUser",

        table:
          "auth",

        operation:
          "getUser"

      }
    );

  }


  return (
    data?.user ||
    null
  );

}


/* ============================================================
   LOGOUT
   ============================================================ */

export async function logout() {

  const supabase =
    await getSupabase();


  const {
    error
  } =
    await supabase.auth.signOut();


  if (
    error
  ) {

    throw normalizeSupabaseError(
      error,
      {

        file:
          "js/core/auth.js",

        function:
          "logout",

        table:
          "auth",

        operation:
          "signOut"

      }
    );

  }


  window.location.replace(
    AUTH_CONFIG.loginPage
  );

}


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

function togglePasswordVisibility(
  inputId,
  buttonId
) {

  const input =
    getElement(
      inputId
    );


  const button =
    getElement(
      buttonId
    );


  if (
    !input ||
    !button
  ) {

    return;

  }


  const visible =
    input.type ===
    "text";


  input.type =
    visible
      ? "password"
      : "text";


  button.setAttribute(
    "aria-pressed",
    String(
      !visible
    )
  );


  button.setAttribute(
    "aria-label",
    visible
      ? "Mostrar senha"
      : "Ocultar senha"
  );


  button.textContent =
    visible
      ? "Mostrar"
      : "Ocultar";

}


/* ============================================================
   FORMULÁRIOS
   ============================================================ */

export function showLoginForm() {

  const login =
    getElement(
      "login-form"
    );


  const register =
    getElement(
      "register-form"
    );


  const showRegister =
    getElement(
      "show-register-button"
    );


  const showLogin =
    getElement(
      "show-login-button"
    );


  const discord =
    getElement(
      "discord-login-button"
    );


  const title =
    getElement(
      "auth-title"
    );


  const description =
    getElement(
      "auth-description"
    );


  if (
    login
  ) {

    login.hidden =
      false;

  }


  if (
    register
  ) {

    register.hidden =
      true;

  }


  if (
    showRegister
  ) {

    showRegister.hidden =
      false;

  }


  if (
    showLogin
  ) {

    showLogin.hidden =
      true;

  }


  if (
    discord
  ) {

    discord.hidden =
      false;

  }


  if (
    title
  ) {

    title.textContent =
      "Entre na mesa";

  }


  if (
    description
  ) {

    description.textContent =
      "Acesse sua conta para continuar sua campanha.";

  }


  clearAuthMessage();
  clearLoginErrors();
  clearRegisterErrors();

}


export function showRegisterForm() {

  const login =
    getElement(
      "login-form"
    );


  const register =
    getElement(
      "register-form"
    );


  const showRegister =
    getElement(
      "show-register-button"
    );


  const showLogin =
    getElement(
      "show-login-button"
    );


  const discord =
    getElement(
      "discord-login-button"
    );


  const title =
    getElement(
      "auth-title"
    );


  const description =
    getElement(
      "auth-description"
    );


  if (
    login
  ) {

    login.hidden =
      true;

  }


  if (
    register
  ) {

    register.hidden =
      false;

  }


  if (
    showRegister
  ) {

    showRegister.hidden =
      true;

  }


  if (
    showLogin
  ) {

    showLogin.hidden =
      false;

  }


  if (
    discord
  ) {

    discord.hidden =
      true;

  }


  if (
    title
  ) {

    title.textContent =
      "Criar sua conta";

  }


  if (
    description
  ) {

    description.textContent =
      "Prepare seu personagem e entre para a aventura.";

  }


  clearAuthMessage();
  clearLoginErrors();
  clearRegisterErrors();

}


/* ============================================================
   BIND EVENTS
   ============================================================ */

function bindEvents() {

  const loginForm =
    getElement(
      "login-form"
    );


  const registerForm =
    getElement(
      "register-form"
    );


  loginForm?.addEventListener(
    "submit",
    handleLogin
  );


  registerForm?.addEventListener(
    "submit",
    handleRegister
  );


  getElement(
    "discord-login-button"
  )?.addEventListener(
    "click",
    handleDiscordLogin
  );


  getElement(
    "forgot-password-button"
  )?.addEventListener(
    "click",
    handlePasswordRecovery
  );


  getElement(
    "show-register-button"
  )?.addEventListener(
    "click",
    showRegisterForm
  );


  getElement(
    "show-login-button"
  )?.addEventListener(
    "click",
    showLoginForm
  );


  getElement(
    "toggle-login-password"
  )?.addEventListener(
    "click",
    () => {

      togglePasswordVisibility(
        "login-password",
        "toggle-login-password"
      );

    }
  );


  getElement(
    "toggle-register-password"
  )?.addEventListener(
    "click",
    () => {

      togglePasswordVisibility(
        "register-password",
        "toggle-register-password"
      );

    }
  );


  getElement(
    "toggle-register-password-confirm"
  )?.addEventListener(
    "click",
    () => {

      togglePasswordVisibility(
        "register-password-confirm",
        "toggle-register-password-confirm"
      );

    }
  );


  getElement(
    "login-email"
  )?.addEventListener(
    "input",
    () => {

      clearFieldError(
        "login-email",
        "login-email-error"
      );

    }
  );


  getElement(
    "login-password"
  )?.addEventListener(
    "input",
    () => {

      clearFieldError(
        "login-password",
        "login-password-error"
      );

    }
  );


  getElement(
    "register-name"
  )?.addEventListener(
    "input",
    () => {

      clearFieldError(
        "register-name",
        "register-name-error"
      );

    }
  );


  getElement(
    "register-email"
  )?.addEventListener(
    "input",
    () => {

      clearFieldError(
        "register-email",
        "register-email-error"
      );

    }
  );


  getElement(
    "register-password"
  )?.addEventListener(
    "input",
    () => {

      clearFieldError(
        "register-password",
        "register-password-error"
      );

    }
  );


  getElement(
    "register-password-confirm"
  )?.addEventListener(
    "input",
    () => {

      clearFieldError(
        "register-password-confirm",
        "register-password-confirm-error"
      );

    }
  );

}


/* ============================================================
   AUTH STATE CHANGE
   ============================================================ */

async function initializeAuthListener() {

  const supabase =
    await getSupabase();


  if (
    authSubscription
  ) {

    return;

  }


  const {
    data
  } =
    supabase.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        logAuth(
          "info",
          `Evento de autenticação: ${event}`
        );


        /*
         * Apenas o index redireciona depois de autenticar.
         */

        if (
          event ===
          "SIGNED_IN" &&
          session?.user &&
          isAuthPage()
        ) {

          redirectToCampaigns();

        }

      }
    );


  authSubscription =
    data?.subscription ||
    null;

}


/* ============================================================
   PROCESSAR CALLBACK / SESSÃO INICIAL
   ============================================================ */

async function handleInitialAuthState() {

  /*
   * Primeiro mostramos um erro explícito caso o Supabase
   * tenha devolvido um erro no callback.
   */

  const callbackHadError =
    handleAuthCallbackError();


  if (
    callbackHadError
  ) {

    cleanAuthCallbackUrl();

    return;

  }


  /*
   * O supabase-js configurado com detectSessionInUrl:true
   * processa o callback.
   *
   * Depois consultamos getSession para saber o resultado.
   */

  const session =
    await getCurrentSession();


  if (
    session?.user &&
    isAuthPage()
  ) {

    cleanAuthCallbackUrl();

    redirectToCampaigns();

    return;

  }


  /*
   * Mesmo quando não existe sessão,
   * podemos limpar parâmetros de callback.
   */

  if (
    hasAuthCallbackParams()
  ) {

    cleanAuthCallbackUrl();

  }

}


/* ============================================================
   INITIALIZE
   ============================================================ */

export async function initializeAuth() {

  if (
    initialized
  ) {

    return;

  }


  try {

    /*
     * Garante primeiro que o Supabase está disponível.
     */

    await getSupabase();


    bindEvents();


    await initializeAuthListener();


    await handleInitialAuthState();


    initialized =
      true;


    logAuth(
      "info",
      "Autenticação inicializada."
    );


  } catch (
    error
  ) {

    initialized =
      false;


    const normalized =
      normalizeSupabaseError(
        error,
        {

          file:
            "js/core/auth.js",

          function:
            "initializeAuth",

          table:
            "auth",

          operation:
            "initialize"

        }
      );


    logAuth(
      "error",
      "Falha ao inicializar autenticação.",
      normalized
    );


    showAuthMessage(
      translateAuthError(
        normalized
      ),
      "error"
    );

  }

}


/* ============================================================
   DESTROY
   ============================================================ */

export function destroyAuth() {

  if (
    authSubscription &&
    typeof authSubscription.unsubscribe ===
      "function"
  ) {

    authSubscription.unsubscribe();

  }


  authSubscription =
    null;


  initialized =
    false;


  submitting =
    false;


  redirecting =
    false;

}


/* ============================================================
   API PÚBLICA
   ============================================================ */

export {

  isValidEmail,

  validatePassword

};
