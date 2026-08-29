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
   * Página principal depois do login.
   */

  authenticatedPage:
    "./campanhas.html",


  /*
   * Página de autenticação.
   */

  loginPage:
    "./index.html",


  /*
   * URL que receberá o retorno do OAuth.
   *
   * Como estamos usando GitHub Pages e também podemos
   * testar localmente, montamos a URL dinamicamente.
   */

  oauthRedirectPath:
    "./index.html",


  /*
   * Tempo mínimo visual do estado de loading.
   */

  minimumLoadingTime:
    250

});


/* ============================================================
   ESTADO
   ============================================================ */

let authInitialized =
  false;

let authSubscription =
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


  /*
   * Sempre textContent.
   *
   * Nunca usamos HTML vindo de erro externo.
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
   ERROS DE AUTENTICAÇÃO
   ============================================================ */

function translateAuthError(
  error
) {

  const rawMessage =
    String(
      error?.message ?? ""
    );


  const message =
    rawMessage.toLowerCase();


  /*
   * Credenciais inválidas.
   */

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


  /*
   * E-mail não confirmado.
   */

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


  /*
   * Usuário já cadastrado.
   */

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


  /*
   * E-mail inválido.
   */

  if (
    message.includes(
      "invalid email"
    )
  ) {

    return (
      "Digite um endereço de e-mail válido."
    );
  }


  /*
   * Senha fraca.
   */

  if (
    message.includes(
      "password should be at least"
    ) ||
    message.includes(
      "password is too short"
    ) ||
    message.includes(
      "weak password"
    )
  ) {

    return (
      "A senha não atende aos requisitos mínimos de segurança."
    );
  }


  /*
   * Muitas requisições.
   */

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


  /*
   * Provedor OAuth desativado.
   */

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


  /*
   * Redirect OAuth.
   */

  if (
    message.includes(
      "redirect"
    )
  ) {

    return (
      "A URL de retorno não está autorizada no Supabase."
    );
  }


  /*
   * Falha de rede.
   */

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


  /*
   * Erro genérico.
   */

  return (
    error?.message ||
    "Não foi possível concluir a autenticação."
  );
}


/* ============================================================
   VALIDAÇÃO DE E-MAIL
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
   VALIDAÇÃO DE SENHA
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
   LIMPAR ERROS LOGIN
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
   LIMPAR ERROS CADASTRO
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
   VALIDAR LOGIN
   ============================================================ */

function validateLoginForm() {

  const form =
    getElement(
      "login-form"
    );


  if (!form) {

    console.error(
      "[AERIOM][AUTH] login-form não encontrado."
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


  const password =
    String(
      form.elements?.password?.value ?? ""
    );


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
   VALIDAR CADASTRO
   ============================================================ */

function validateRegisterForm() {

  const form =
    getElement(
      "register-form"
    );


  if (!form) {

    console.error(
      "[AERIOM][AUTH] register-form não encontrado."
    );

    return false;
  }


  clearRegisterErrors();


  let valid =
    true;


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


  const confirmation =
    String(
      form.elements?.passwordConfirm?.value ?? ""
    );


  if (!displayName) {

    setFieldError(
      "register-name",
      "register-name-error",
      "Digite seu nome."
    );


    valid =
      false;

  } else if (
    displayName.length < 2
  ) {

    setFieldError(
      "register-name",
      "register-name-error",
      "O nome precisa ter pelo menos 2 caracteres."
    );


    valid =
      false;
  }


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
   LOADING DOS BOTÕES
   ============================================================ */

function setButtonLoading(
  button,
  loading,
  loadingText
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


  if (label) {

    label.hidden =
      Boolean(
        loading
      );
  }


  if (loadingElement) {

    if (loadingText) {

      loadingElement.textContent =
        loadingText;
    }


    loadingElement.hidden =
      !loading;
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
   PÁGINA DE LOGIN
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
   REDIRECIONAMENTO
   ============================================================ */

function redirectToAuthenticatedPage() {

  window.location.replace(
    AUTH_CONFIG.authenticatedPage
  );
}


/* ============================================================
   URL DE CALLBACK OAUTH
   ============================================================ */

function getOAuthRedirectUrl() {

  const url =
    new URL(
      AUTH_CONFIG.oauthRedirectPath,
      window.location.href
    );


  /*
   * Mantemos somente origem + caminho.
   *
   * Não carregamos parâmetros externos.
   */

  url.search = "";

  url.hash = "";


  return url.href;
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


  const valid =
    validateLoginForm();


  if (!valid) {

    return;
  }


  const form =
    event.currentTarget;


  const email =
    getFormValue(
      form,
      "email"
    );


  /*
   * Não aplicamos trim na senha.
   *
   * Espaços podem fazer parte de uma senha válida.
   */

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


    console.info(
      "[AERIOM][AUTH] Tentando login por e-mail.",
      {
        email
      }
    );


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
        "Login concluído sem uma sessão válida."
      );
    }


    console.info(
      "[AERIOM][AUTH] Login realizado com sucesso."
    );


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


    console.error(
      "[AERIOM][AUTH] Falha no login.",
      normalized
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


  const valid =
    validateRegisterForm();


  if (!valid) {

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
     * Quando a confirmação de e-mail está habilitada,
     * o Supabase cria o usuário mas retorna session = null.
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


    /*
     * Limpa apenas credenciais.
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


    showAuthMessage(
      "Conta criada. Verifique seu e-mail para confirmar sua conta.",
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
            "handleRegister",

          table:
            "auth.users",

          operation:
            "signUp"
        }
      );


    console.error(
      "[AERIOM][AUTH] Falha no cadastro.",
      normalized
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
   LOGIN COM DISCORD
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


    console.info(
      "[AERIOM][AUTH] Iniciando OAuth Discord.",
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


    if (error) {

      throw error;
    }


    /*
     * signInWithOAuth normalmente redireciona
     * automaticamente.
     *
     * Alguns ambientes retornam a URL explicitamente.
     */

    if (
      data?.url
    ) {

      window.location.assign(
        data.url
      );

      return;
    }


    /*
     * Se não houve URL, o SDK pode já ter disparado
     * a navegação.
     */

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


    console.error(
      "[AERIOM][AUTH] Falha no login Discord.",
      normalized
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


    /*
     * O usuário será enviado de volta para a página de login.
     *
     * A etapa de atualização da senha será implementada
     * na página própria de recuperação.
     */

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
     * Não revelamos se a conta existe.
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


    console.error(
      "[AERIOM][AUTH] Falha na recuperação.",
      normalized
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
   BIND DOS EVENTOS
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


  /*
   * Login.
   */

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      handleLogin
    );

  } else {

    console.warn(
      "[AERIOM][AUTH] login-form não encontrado."
    );
  }


  /*
   * Cadastro.
   */

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      handleRegister
    );

  } else {

    console.warn(
      "[AERIOM][AUTH] register-form não encontrado."
    );
  }


  /*
   * Discord.
   */

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


  /*
   * Recuperação.
   */

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


  /*
   * Mostrar cadastro.
   */

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


  /*
   * Voltar para login.
   */

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
     SENHA DE LOGIN
     ---------------------------------------------------------- */

  const loginPasswordToggle =
    getElement(
      "toggle-login-password"
    );


  if (loginPasswordToggle) {

    loginPasswordToggle.addEventListener(
      "click",
      () => {

        togglePasswordVisibility(
          "login-password",
          "toggle-login-password"
        );

      }
    );
  }


  /* ----------------------------------------------------------
     SENHA DE CADASTRO
     ---------------------------------------------------------- */

  const registerPasswordToggle =
    getElement(
      "toggle-register-password"
    );


  if (registerPasswordToggle) {

    registerPasswordToggle.addEventListener(
      "click",
      () => {

        togglePasswordVisibility(
          "register-password",
          "toggle-register-password"
        );

      }
    );
  }


  /* ----------------------------------------------------------
     CONFIRMAÇÃO
     ---------------------------------------------------------- */

  const registerConfirmationToggle =
    getElement(
      "toggle-register-password-confirm"
    );


  if (registerConfirmationToggle) {

    registerConfirmationToggle.addEventListener(
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
     E-MAIL LOGIN
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


  /* ----------------------------------------------------------
     SENHA LOGIN
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     NOME CADASTRO
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     E-MAIL CADASTRO
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     SENHA CADASTRO
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     CONFIRMAÇÃO CADASTRO
     ---------------------------------------------------------- */

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
   LISTENER AUTH
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

        console.info(
          "[AERIOM][AUTH] Evento de autenticação:",
          event
        );


        /*
         * Só redirecionamos automaticamente
         * quando estamos no index.
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


  authSubscription =
    data?.subscription ??
    null;
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


  /*
   * O main.js só chama este método quando a página
   * já está carregada.
   */

  authInitialized =
    true;


  try {

    bindAuthEvents();


    await initializeAuthListener();


    await handleInitialSession();


    console.info(
      "[AERIOM][AUTH] Autenticação inicializada."
    );

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


    console.error(
      "[AERIOM][AUTH] Falha ao inicializar autenticação.",
      normalized
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
    authSubscription &&
    typeof authSubscription.unsubscribe ===
      "function"
  ) {

    authSubscription.unsubscribe();

    authSubscription =
      null;
  }


  authInitialized =
    false;


  isSubmitting =
    false;
}


/* ============================================================
   API PÚBLICA
   ============================================================ */

export {
  showLoginForm,
  showRegisterForm,
  isValidEmail,
  validatePassword
};