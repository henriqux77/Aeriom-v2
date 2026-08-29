/*
 * ============================================================
 * AERIOM v2
 * js/core/auth.js
 * Sistema de autenticação
 * ============================================================
 *
 * Responsabilidades:
 *
 * - Login com e-mail e senha.
 * - Cadastro com e-mail e senha.
 * - Confirmação de senha.
 * - Login com Discord.
 * - Recuperação de senha.
 * - Leitura da sessão atual.
 * - Listener de mudanças de autenticação.
 * - Logout.
 * - Redirecionamento após autenticação.
 *
 * NÃO é responsabilidade deste arquivo:
 *
 * - autorizar campanhas;
 * - definir Mestre/Jogador;
 * - proteger dados do banco;
 * - validar permissões de personagens;
 * - controlar RLS.
 *
 * Segurança real:
 * Supabase Auth + PostgreSQL + RLS.
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

  /*
   * Página principal depois da autenticação.
   */

  authenticatedPage:
    "./campanhas.html",


  /*
   * Página que contém o login.
   */

  loginPage:
    "./index.html",


  /*
   * URL de retorno do OAuth.
   *
   * Em produção:
   *
   * https://henriqux77.github.io/Aeriom-v2/index.html
   *
   * Em localhost:
   *
   * http://localhost:3000/index.html
   *
   * Usamos URL relativa + origin para funcionar nos dois.
   */

  oauthRedirectPath:
    "./index.html",


  /*
   * Tempo mínimo visual do loading.
   */

  minimumLoadingTime:
    250

});


/* ============================================================
   ESTADO
   ============================================================ */

let authInitialized =
  false;

let authListener =
  null;

let isSubmitting =
  false;


/* ============================================================
   HELPERS DOM
   ============================================================ */

function getElement(
  id
) {

  return document.getElementById(
    id
  );
}


function getFormValue(
  form,
  name
) {

  if (!form) {
    return "";
  }


  const field =
    form.elements?.namedItem(
      name
    );


  if (!field) {
    return "";
  }


  return String(
    field.value ?? ""
  ).trim();
}


/* ============================================================
   MENSAGENS
   ============================================================ */

function clearAuthMessage() {

  const message =
    getElement(
      "auth-message"
    );


  if (!message) {
    return;
  }


  message.hidden =
    true;


  message.textContent =
    "";


  delete message.dataset.type;
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


  /*
   * textContent é intencional.
   *
   * Nunca usamos innerHTML para mensagens vindas
   * de erros ou serviços externos.
   */

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
   TRADUÇÃO DE ERROS
   ============================================================ */

function translateAuthError(
  error
) {

  const message =
    String(
      error?.message ?? ""
    ).toLowerCase();


  const code =
    String(
      error?.code ?? ""
    ).toLowerCase();


  /* ----------------------------------------------------------
     LOGIN
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     E-MAIL NÃO CONFIRMADO
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     USUÁRIO EXISTENTE
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     E-MAIL INVÁLIDO
     ---------------------------------------------------------- */

  if (
    message.includes(
      "invalid email"
    )
  ) {

    return (
      "Digite um endereço de e-mail válido."
    );
  }


  /* ----------------------------------------------------------
     SENHA FRACA
     ---------------------------------------------------------- */

  if (
    message.includes(
      "password should be at least"
    ) ||
    message.includes(
      "weak password"
    ) ||
    message.includes(
      "password is too short"
    )
  ) {

    return (
      "A senha não atende aos requisitos mínimos de segurança."
    );
  }


  /* ----------------------------------------------------------
     RATE LIMIT
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     OAUTH
     ---------------------------------------------------------- */

  if (
    message.includes(
      "provider"
    ) &&
    message.includes(
      "disabled"
    )
  ) {

    return (
      "O login com Discord não está habilitado no Supabase."
    );
  }


  /* ----------------------------------------------------------
     REDIRECT
     ---------------------------------------------------------- */

  if (
    message.includes(
      "redirect"
    ) &&
    message.includes(
      "not allowed"
    )
  ) {

    return (
      "A URL de retorno não está autorizada no Supabase."
    );
  }


  /* ----------------------------------------------------------
     REDE
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     ERRO GENÉRICO
     ---------------------------------------------------------- */

  if (
    error?.message
  ) {

    return String(
      error.message
    );
  }


  return (
    "Não foi possível concluir a autenticação."
  );
}


/* ============================================================
   VALIDAÇÃO
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


  /*
   * Validação somente para feedback imediato.
   *
   * A validação definitiva continua sendo realizada
   * pelo Supabase Auth.
   */

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}


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
    password.length < 8
  ) {

    return (
      "A senha precisa ter pelo menos 8 caracteres."
    );
  }


  return null;
}


/* ============================================================
   ERROS DOS CAMPOS
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


  if (input) {

    input.setAttribute(
      "aria-invalid",
      message
        ? "true"
        : "false"
    );
  }


  if (error) {

    /*
     * textContent evita XSS.
     */

    error.textContent =
      message || "";
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
   LIMPAR ERROS DE LOGIN
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


/* ============================================================
   LIMPAR ERROS DE CADASTRO
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


/* ============================================================
   VALIDAÇÃO LOGIN
   ============================================================ */

function validateLoginForm() {

  const form =
    getElement(
      "login-form"
    );


  if (!form) {
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


  const password =
    String(
      form.elements?.password?.value ?? ""
    );


  /* ---------- E-mail ---------- */

  if (!email) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite seu e-mail."
    );


    valid =
      false;

  } else if (
    !isValidEmail(email)
  ) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite um e-mail válido."
    );


    valid =
      false;
  }


  /* ---------- Senha ---------- */

  if (!password) {

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
   VALIDAÇÃO CADASTRO
   ============================================================ */

function validateRegisterForm() {

  const form =
    getElement(
      "register-form"
    );


  if (!form) {
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
    String(
      form.elements?.password?.value ?? ""
    );


  const confirmation =
    String(
      form.elements?.passwordConfirm?.value ?? ""
    );


  /* ---------- Nome ---------- */

  if (!name) {

    setFieldError(
      "register-name",
      "register-name-error",
      "Digite seu nome."
    );


    valid =
      false;

  } else if (
    name.length < 2
  ) {

    setFieldError(
      "register-name",
      "register-name-error",
      "O nome precisa ter pelo menos 2 caracteres."
    );


    valid =
      false;
  }


  /* ---------- E-mail ---------- */

  if (!email) {

    setFieldError(
      "register-email",
      "register-email-error",
      "Digite seu e-mail."
    );


    valid =
      false;

  } else if (
    !isValidEmail(email)
  ) {

    setFieldError(
      "register-email",
      "register-email-error",
      "Digite um e-mail válido."
    );


    valid =
      false;
  }


  /* ---------- Senha ---------- */

  const passwordError =
    validatePassword(
      password
    );


  if (passwordError) {

    setFieldError(
      "register-password",
      "register-password-error",
      passwordError
    );


    valid =
      false;
  }


  /* ---------- Confirmação ---------- */

  if (!confirmation) {

    setFieldError(
      "register-password-confirm",
      "register-password-confirm-error",
      "Confirme sua senha."
    );


    valid =
      false;

  } else if (
    password !== confirmation
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
   LOADING
   ============================================================ */

function setButtonLoading(
  button,
  loading,
  loadingText = "Carregando..."
) {

  if (!button) {
    return;
  }


  const label =
    button.querySelector(
      ".button__label"
    );


  const loadingElement =
    button.querySelector(
      ".button__loading"
    );


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


  if (loadingElement) {

    loadingElement.textContent =
      loadingText;


    loadingElement.hidden =
      !loading;
  }


  if (label) {

    label.hidden =
      Boolean(
        loading
      );
  }
}


/* ============================================================
   LOADING MÍNIMO
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
    remaining <= 0
  ) {

    return;
  }


  await new Promise(
    (resolve) => {

      window.setTimeout(
        resolve,
        remaining
      );

    }
  );
}


/* ============================================================
   REDIRECIONAMENTO
   ============================================================ */

function redirectToAuthenticatedPage() {

  window.location.replace(
    AUTH_CONFIG.authenticatedPage
  );
}


/* ============================================================
   URL DE CALLBACK
   ============================================================ */

function getOAuthRedirectUrl() {

  return new URL(
    AUTH_CONFIG.oauthRedirectPath,
    window.location.href
  ).href;
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


  if (error) {

    throw error;
  }


  return (
    data?.session ??
    null
  );
}


/* ============================================================
   LOGIN COM E-MAIL
   ============================================================ */

async function handleLogin(
  event
) {

  event.preventDefault();


  if (
    isSubmitting
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
    String(
      form.elements?.password?.value ?? ""
    );


  const button =
    getElement(
      "login-submit"
    );


  const startedAt =
    Date.now();


  isSubmitting =
    true;


  setButtonLoading(
    button,
    true,
    "Entrando..."
  );


  try {

    const supabase =
      await getSupabase();


    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword({

        email,

        password

      });


    if (error) {

      throw error;
    }


    if (
      !data?.session
    ) {

      throw new Error(
        "A autenticação foi concluída, mas nenhuma sessão foi criada."
      );
    }


    await waitMinimumLoadingTime(
      startedAt
    );


    redirectToAuthenticatedPage();

  } catch (error) {

    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "handleLogin",

          table:
            "auth.users",

          operation:
            "signInWithPassword"
        }
      );


    showAuthMessage(
      translateAuthError(
        normalized
      )
    );

  } finally {

    setButtonLoading(
      button,
      false
    );


    isSubmitting =
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
    isSubmitting
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
    String(
      form.elements?.password?.value ?? ""
    );


  const button =
    getElement(
      "register-submit"
    );


  const startedAt =
    Date.now();


  isSubmitting =
    true;


  setButtonLoading(
    button,
    true,
    "Criando conta..."
  );


  try {

    const supabase =
      await getSupabase();


    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email,

        password,

        options: {

          data: {

            display_name:
              displayName

          }

        }

      });


    if (error) {

      throw error;
    }


    await waitMinimumLoadingTime(
      startedAt
    );


    /*
     * Se o projeto exigir confirmação de e-mail,
     * a sessão será nula neste momento.
     */

    if (
      data?.session
    ) {

      showAuthMessage(
        "Conta criada com sucesso. Entrando...",
        "success"
      );


      window.setTimeout(
        redirectToAuthenticatedPage,
        400
      );


      return;
    }


    showAuthMessage(
      "Conta criada. Verifique seu e-mail para confirmar sua conta.",
      "success"
    );


    /*
     * Limpamos as credenciais da memória do formulário.
     */

    if (
      form.elements?.password
    ) {

      form.elements.password.value =
        "";
    }


    if (
      form.elements?.passwordConfirm
    ) {

      form.elements.passwordConfirm.value =
        "";
    }

  } catch (error) {

    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "handleRegister",

          table:
            "auth.users",

          operation:
            "signUp"
        }
      );


    showAuthMessage(
      translateAuthError(
        normalized
      )
    );

  } finally {

    setButtonLoading(
      button,
      false
    );


    isSubmitting =
      false;
  }
}


/* ============================================================
   DISCORD
   ============================================================ */

async function handleDiscordLogin() {

  if (
    isSubmitting
  ) {

    return;
  }


  clearAuthMessage();


  const button =
    getElement(
      "discord-login-button"
    );


  isSubmitting =
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
      getOAuthRedirectUrl();


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


    if (error) {

      throw error;
    }


    /*
     * O supabase-js pode realizar o redirecionamento
     * automaticamente.
     *
     * Caso a URL seja retornada e o navegador ainda
     * não tenha navegado, usamos ela.
     */

    if (
      data?.url
    ) {

      window.location.assign(
        data.url
      );

      return;
    }


    throw new Error(
      "O Supabase não retornou a URL de autenticação do Discord."
    );

  } catch (error) {

    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "handleDiscordLogin",

          table:
            "auth.users",

          operation:
            "signInWithOAuth"
        }
      );


    showAuthMessage(
      translateAuthError(
        normalized
      )
    );


    setButtonLoading(
      button,
      false
    );


    isSubmitting =
      false;
  }
}


/* ============================================================
   RECUPERAÇÃO DE SENHA
   ============================================================ */

async function handlePasswordRecovery() {

  if (
    isSubmitting
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
      input?.value ?? ""
    ).trim();


  if (!email) {

    setFieldError(
      "login-email",
      "login-email-error",
      "Digite seu e-mail para recuperar a senha."
    );


    input?.focus();

    return;
  }


  if (
    !isValidEmail(email)
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


  isSubmitting =
    true;


  try {

    const supabase =
      await getSupabase();


    const redirectTo =
      getOAuthRedirectUrl();


    const {
      error
    } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo
        }
      );


    if (error) {

      throw error;
    }


    /*
     * Mensagem propositalmente neutra.
     *
     * Não revelamos se um e-mail existe ou não
     * no sistema.
     */

    showAuthMessage(
      "Se existir uma conta associada a esse e-mail, você receberá as instruções para redefinir sua senha.",
      "success"
    );

  } catch (error) {

    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "handlePasswordRecovery",

          table:
            "auth.users",

          operation:
            "resetPasswordForEmail"
        }
      );


    showAuthMessage(
      translateAuthError(
        normalized
      )
    );

  } finally {

    isSubmitting =
      false;
  }
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


  if (error) {

    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "logout",

          table:
            "auth.sessions",

          operation:
            "signOut"
        }
      );


    throw normalized;
  }


  window.location.replace(
    AUTH_CONFIG.loginPage
  );
}


/* ============================================================
   ATUALIZAR SENHA
   ============================================================ */

export async function updatePassword(
  newPassword
) {

  const passwordError =
    validatePassword(
      newPassword
    );


  if (passwordError) {

    throw new Error(
      passwordError
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


  if (error) {

    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "updatePassword",

          table:
            "auth.users",

          operation:
            "updateUser"
        }
      );


    throw normalized;
  }
}


/* ============================================================
   VISIBILIDADE DE SENHA
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


  const showing =
    input.type ===
    "text";


  input.type =
    showing
      ? "password"
      : "text";


  button.setAttribute(
    "aria-pressed",
    String(
      !showing
    )
  );


  button.setAttribute(
    "aria-label",
    showing
      ? "Mostrar senha"
      : "Ocultar senha"
  );


  /*
   * O texto é controlado pelo código.
   */

  button.textContent =
    showing
      ? "Mostrar"
      : "Ocultar";
}


/* ============================================================
   TROCAR PARA LOGIN
   ============================================================ */

function showLoginForm() {

  const login =
    getElement(
      "login-form"
    );


  const register =
    getElement(
      "register-form"
    );


  const registerButton =
    getElement(
      "show-register-button"
    );


  const loginButton =
    getElement(
      "show-login-button"
    );


  const discordButton =
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


  if (login) {

    login.hidden =
      false;
  }


  if (register) {

    register.hidden =
      true;
  }


  if (registerButton) {

    registerButton.hidden =
      false;
  }


  if (loginButton) {

    loginButton.hidden =
      true;
  }


  if (discordButton) {

    discordButton.hidden =
      false;
  }


  if (title) {

    title.textContent =
      "Entre na mesa";
  }


  if (description) {

    description.textContent =
      "Acesse sua conta para continuar sua campanha.";
  }


  clearAuthMessage();

  clearLoginErrors();

  clearRegisterErrors();
}


/* ============================================================
   TROCAR PARA CADASTRO
   ============================================================ */

function showRegisterForm() {

  const login =
    getElement(
      "login-form"
    );


  const register =
    getElement(
      "register-form"
    );


  const registerButton =
    getElement(
      "show-register-button"
    );


  const loginButton =
    getElement(
      "show-login-button"
    );


  const discordButton =
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


  if (login) {

    login.hidden =
      true;
  }


  if (register) {

    register.hidden =
      false;
  }


  if (registerButton) {

    registerButton.hidden =
      true;
  }


  if (loginButton) {

    loginButton.hidden =
      false;
  }


  if (discordButton) {

    discordButton.hidden =
      true;
  }


  if (title) {

    title.textContent =
      "Criar sua conta";
  }


  if (description) {

    description.textContent =
      "Prepare seu personagem e entre para a aventura.";
  }


  clearAuthMessage();

  clearLoginErrors();

  clearRegisterErrors();
}


/* ============================================================
   EVENTOS
   ============================================================ */

function bindAuthEvents() {

  const loginForm =
    getElement(
      "login-form"
    );


  const registerForm =
    getElement(
      "register-form"
    );


  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }


  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      handleRegister
    );
  }


  const discordButton =
    getElement(
      "discord-login-button"
    );


  if (discordButton) {

    discordButton.addEventListener(
      "click",
      handleDiscordLogin
    );
  }


  const forgotButton =
    getElement(
      "forgot-password-button"
    );


  if (forgotButton) {

    forgotButton.addEventListener(
      "click",
      handlePasswordRecovery
    );
  }


  const registerButton =
    getElement(
      "show-register-button"
    );


  if (registerButton) {

    registerButton.addEventListener(
      "click",
      showRegisterForm
    );
  }


  const loginButton =
    getElement(
      "show-login-button"
    );


  if (loginButton) {

    loginButton.addEventListener(
      "click",
      showLoginForm
    );
  }


  /* ----------------------------------------------------------
     SENHAS
     ---------------------------------------------------------- */

  const loginToggle =
    getElement(
      "toggle-login-password"
    );


  if (loginToggle) {

    loginToggle.addEventListener(
      "click",
      () => {

        togglePasswordVisibility(
          "login-password",
          "toggle-login-password"
        );

      }
    );
  }


  const registerToggle =
    getElement(
      "toggle-register-password"
    );


  if (registerToggle) {

    registerToggle.addEventListener(
      "click",
      () => {

        togglePasswordVisibility(
          "register-password",
          "toggle-register-password"
        );

      }
    );
  }


  const confirmationToggle =
    getElement(
      "toggle-register-password-confirm"
    );


  if (confirmationToggle) {

    confirmationToggle.addEventListener(
      "click",
      () => {

        togglePasswordVisibility(
          "register-password-confirm",
          "toggle-register-password-confirm"
        );

      }
    );
  }


  /* ----------------------------------------------------------
     LIMPAR ERROS
     ---------------------------------------------------------- */

  const loginEmail =
    getElement(
      "login-email"
    );


  if (loginEmail) {

    loginEmail.addEventListener(
      "input",
      () => {

        clearFieldError(
          "login-email",
          "login-email-error"
        );

      }
    );
  }


  const loginPassword =
    getElement(
      "login-password"
    );


  if (loginPassword) {

    loginPassword.addEventListener(
      "input",
      () => {

        clearFieldError(
          "login-password",
          "login-password-error"
        );

      }
    );
  }


  const registerName =
    getElement(
      "register-name"
    );


  if (registerName) {

    registerName.addEventListener(
      "input",
      () => {

        clearFieldError(
          "register-name",
          "register-name-error"
        );

      }
    );
  }


  const registerEmail =
    getElement(
      "register-email"
    );


  if (registerEmail) {

    registerEmail.addEventListener(
      "input",
      () => {

        clearFieldError(
          "register-email",
          "register-email-error"
        );

      }
    );
  }


  const registerPassword =
    getElement(
      "register-password"
    );


  if (registerPassword) {

    registerPassword.addEventListener(
      "input",
      () => {

        clearFieldError(
          "register-password",
          "register-password-error"
        );

      }
    );
  }


  const registerConfirmation =
    getElement(
      "register-password-confirm"
    );


  if (registerConfirmation) {

    registerConfirmation.addEventListener(
      "input",
      () => {

        clearFieldError(
          "register-password-confirm",
          "register-password-confirm-error"
        );

      }
    );
  }
}


/* ============================================================
   AUTH STATE
   ============================================================ */

async function initializeAuthListener() {

  const supabase =
    await getSupabase();


  /*
   * Impede listeners duplicados.
   */

  if (
    authListener
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

        /*
         * Só redirecionamos automaticamente quando
         * existe uma sessão válida e estamos na tela
         * de autenticação.
         */

        if (
          event ===
          "SIGNED_IN" &&
          session &&
          isAuthenticationPage()
        ) {

          redirectToAuthenticatedPage();
        }

      }
    );


  authListener =
    data?.subscription ??
    null;
}


/* ============================================================
   VERIFICAR PÁGINA ATUAL
   ============================================================ */

function isAuthenticationPage() {

  const pathname =
    window.location.pathname
      .toLowerCase();


  return (
    pathname.endsWith(
      "/index.html"
    ) ||
    pathname.endsWith(
      "/"
    )
  );
}


/* ============================================================
   SESSÃO INICIAL
   ============================================================ */

async function handleInitialSession() {

  const session =
    await getCurrentSession();


  if (
    session &&
    isAuthenticationPage()
  ) {

    redirectToAuthenticatedPage();
  }
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

export async function initializeAuth() {

  if (
    authInitialized
  ) {

    return;
  }


  authInitialized =
    true;


  try {

    bindAuthEvents();


    await initializeAuthListener();


    await handleInitialSession();

  } catch (error) {

    authInitialized =
      false;


    const normalized =
      normalizeSupabaseError(
        error,
        {
          file:
            "auth.js",

          function:
            "initializeAuth",

          table:
            "auth.sessions",

          operation:
            "initialize"
        }
      );


    showAuthMessage(
      translateAuthError(
        normalized
      )
    );
  }
}


/* ============================================================
   DESTROY
   ============================================================ */

export function destroyAuth() {

  if (
    authListener &&
    typeof authListener.unsubscribe ===
      "function"
  ) {

    authListener.unsubscribe();

    authListener =
      null;
  }


  authInitialized =
    false;


  isSubmitting =
    false;
}


/* ============================================================
   EXPORTS
   ============================================================ */

export {
  showLoginForm,
  showRegisterForm,
  isValidEmail,
  validatePassword
};