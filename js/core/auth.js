/*

* ============================================================
* AERIOM v2
* assets/js/core/auth.js
* Autenticação
* ============================================================
* 
* Responsabilidades:
* 
* - Login por e-mail e senha
* - Cadastro por e-mail e senha
* - Confirmação de senha
* - Login com Discord
* - Recuperação de senha
* - Controle da sessão
* - Redirecionamento após autenticação
* - Logout
* - Estados de loading
* - Mensagens amigáveis de erro
* 
* NÃO é responsabilidade deste arquivo:
* 
* - verificar role de campanha;
* - verificar se usuário pertence a uma campanha;
* - autorizar Mestre/Jogador;
* - proteger dados do banco.
* 
* Essas regras pertencem ao PostgreSQL/RLS.
* ============================================================
  */

import {
getSupabase,
normalizeSupabaseError
} from "./supabase.js";

/* ============================================================
CONFIGURAÇÃO
============================================================ */

const AUTH_CONFIG = Object.freeze({

/*

* Página para onde o usuário vai depois de autenticar.
  */
  authenticatedPage: "./campanhas.html",

/*

* Página utilizada pelo fluxo OAuth do Discord.
* 
* Como o projeto é uma aplicação web tradicional,
* retornamos para o próprio index.html.
  */
  oauthRedirectPath: "./index.html",

/*

* Página usada para recuperação de senha.
* 
* Esta página será criada posteriormente.
  */
  recoveryPage: "./index.html",

/*

* Caminho da página atual.
  */
  loginPage: "./index.html",

/*

* Duração mínima visual do estado de loading.
* 
* Evita que botões "pisquem" em conexões muito rápidas.
  */
  minimumLoadingTime: 250
  });

/* ============================================================
ESTADO
============================================================ */

let authInitialized = false;

let authListener = null;

let isSubmitting = false;

/* ============================================================
HELPERS DOM
============================================================ */

function getElement(id) {
return document.getElementById(id);
}

function getFormValue(form, name) {
const field = form?.elements?.namedItem(name);

if (!field) {
return "";
}

return String(field.value ?? "").trim();
}

/* ============================================================
MENSAGENS
============================================================ */

function clearAuthMessage() {
const message = getElement("auth-message");

if (!message) {
return;
}

message.hidden = true;

message.textContent = "";

delete message.dataset.type;
}

function showAuthMessage(
message,
type = "error"
) {
const element = getElement("auth-message");

if (!element) {
return;
}

element.textContent = message;

element.dataset.type = type;

element.hidden = false;
}

/* ============================================================
ERROS
============================================================ */

function translateAuthError(error) {
const rawMessage = String(
error?.message ?? ""
).toLowerCase();

const code = String(
error?.code ?? ""
).toLowerCase();

/*

* Credenciais.
  */

if (
rawMessage.includes("invalid login credentials") ||
rawMessage.includes("invalid credentials")
) {
return "E-mail ou senha incorretos.";
}

/*

* Conta já existente.
  */

if (
rawMessage.includes("user already registered") ||
rawMessage.includes("already registered")
) {
return "Este e-mail já possui uma conta.";
}

/*

* E-mail inválido.
  */

if (
rawMessage.includes("invalid email") ||
code.includes("email")
) {
return "Digite um endereço de e-mail válido.";
}

/*

* Senha fraca.
  */

if (
rawMessage.includes("password should be at least") ||
rawMessage.includes("weak password") ||
rawMessage.includes("password is too short")
) {
return "A senha precisa atender aos requisitos mínimos de segurança.";
}

/*

* Rate limit.
  */

if (
rawMessage.includes("rate limit") ||
rawMessage.includes("too many requests")
) {
return "Muitas tentativas. Aguarde um pouco e tente novamente.";
}

/*

* OAuth.
  */

if (
rawMessage.includes("provider") &&
rawMessage.includes("disabled")
) {
return "O login com Discord ainda não está habilitado no Supabase.";
}

/*

* Falha de rede.
  */

if (
rawMessage.includes("failed to fetch") ||
rawMessage.includes("network")
) {
return "Não foi possível conectar ao servidor. Verifique sua internet.";
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
VALIDAÇÃO
============================================================ */

function isValidEmail(email) {
if (!email) {
return false;
}

/*

* A validação final continua sendo feita pelo Supabase.
* 
* Esta expressão existe apenas para feedback imediato.
  */
  return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email);
  }

function validatePassword(password) {
if (!password) {
return "Digite uma senha.";
}

if (password.length < 8) {
return "A senha precisa ter pelo menos 8 caracteres.";
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
const input = getElement(inputId);
const error = getElement(errorId);

if (input) {
input.setAttribute(
"aria-invalid",
message ? "true" : "false"
);
}

if (error) {
error.textContent = message || "";
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
VALIDAÇÃO DE LOGIN
============================================================ */

function validateLoginForm() {
const form = getElement("login-form");

if (!form) {
return false;
}

clearLoginErrors();

let valid = true;

const email = getFormValue(
form,
"email"
);

const password = String(
form.elements.password?.value ?? ""
);

if (!email) {
setFieldError(
"login-email",
"login-email-error",
"Digite seu e-mail."
);

valid = false;

} else if (!isValidEmail(email)) {
setFieldError(
"login-email",
"login-email-error",
"Digite um e-mail válido."
);

valid = false;

}

if (!password) {
setFieldError(
"login-password",
"login-password-error",
"Digite sua senha."
);

valid = false;

}

return valid;
}

/* ============================================================
VALIDAÇÃO DE CADASTRO
============================================================ */

function validateRegisterForm() {
const form = getElement("register-form");

if (!form) {
return false;
}

clearRegisterErrors();

let valid = true;

const name = getFormValue(
form,
"displayName"
);

const email = getFormValue(
form,
"email"
);

const password = String(
form.elements.password?.value ?? ""
);

const confirmation = String(
form.elements.passwordConfirm?.value ?? ""
);

/* ---------- Nome ---------- */

if (!name) {
setFieldError(
"register-name",
"register-name-error",
"Digite seu nome."
);

valid = false;

} else if (name.length < 2) {
setFieldError(
"register-name",
"register-name-error",
"O nome precisa ter pelo menos 2 caracteres."
);

valid = false;

}

/* ---------- E-mail ---------- */

if (!email) {
setFieldError(
"register-email",
"register-email-error",
"Digite seu e-mail."
);

valid = false;

} else if (!isValidEmail(email)) {
setFieldError(
"register-email",
"register-email-error",
"Digite um e-mail válido."
);

valid = false;

}

/* ---------- Senha ---------- */

const passwordError =
validatePassword(password);

if (passwordError) {
setFieldError(
"register-password",
"register-password-error",
passwordError
);

valid = false;

}

/* ---------- Confirmação ---------- */

if (!confirmation) {
setFieldError(
"register-password-confirm",
"register-password-confirm-error",
"Confirme sua senha."
);

valid = false;

} else if (password !== confirmation) {
setFieldError(
"register-password-confirm",
"register-password-confirm-error",
"As senhas não coincidem."
);

valid = false;

}

return valid;
}

/* ============================================================
LOADING DOS BOTÕES
============================================================ */

function setButtonLoading(
button,
loading,
loadingText = null
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

button.disabled = loading;

button.classList.toggle(
"is-loading",
loading
);

if (label) {
label.hidden = loading;
}

if (loadingElement) {
if (loadingText) {
loadingElement.textContent =
loadingText;
}

loadingElement.hidden = !loading;

}
}

/* ============================================================
TEMPO MÍNIMO DO LOADING
============================================================ */

async function waitMinimumLoadingTime(
startedAt
) {
const elapsed =
Date.now() - startedAt;

const remaining =
AUTH_CONFIG.minimumLoadingTime -
elapsed;

if (remaining <= 0) {
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
/*

* Não armazenamos autorização em localStorage.
* 
* A sessão é gerenciada pelo Supabase Auth.
  */

window.location.replace(
AUTH_CONFIG.authenticatedPage
);
}

/* ============================================================
VERIFICAR SESSÃO
============================================================ */

async function getCurrentSession() {
const supabase =
await getSupabase();

const {
data,
error
} = await supabase.auth.getSession();

if (error) {
throw error;
}

return data?.session ?? null;
}

/* ============================================================
LOGIN E-MAIL
============================================================ */

async function handleLogin(event) {
event.preventDefault();

if (isSubmitting) {
return;
}

clearAuthMessage();

if (!validateLoginForm()) {
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
form.elements.password?.value ?? ""
);

const button =
getElement("login-submit");

const startedAt =
Date.now();

isSubmitting = true;

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
} = await supabase.auth.signInWithPassword({
  email,
  password
});


if (error) {
  throw error;
}


if (!data?.session) {
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
      file: "auth.js",
      function: "handleLogin",
      table: "auth.users",
      operation: "signInWithPassword"
    }
  );


showAuthMessage(
  translateAuthError(normalized)
);

} finally {

setButtonLoading(
  button,
  false
);

isSubmitting = false;

}
}

/* ============================================================
CADASTRO
============================================================ */

async function handleRegister(event) {
event.preventDefault();

if (isSubmitting) {
return;
}

clearAuthMessage();

if (!validateRegisterForm()) {
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
form.elements.password?.value ?? ""
);

const button =
getElement("register-submit");

const startedAt =
Date.now();

isSubmitting = true;

setButtonLoading(
button,
true,
"Criando conta..."
);

try {

const supabase =
  await getSupabase();


/*
 * O nome é enviado em user_metadata.
 *
 * Isso não substitui uma futura tabela de perfil.
 * O perfil definitivo será tratado pela arquitetura
 * do banco/RLS na próxima etapa.
 */

const {
  data,
  error
} = await supabase.auth.signUp({
  email,
  password,

  options: {
    data: {
      display_name: displayName
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
 * Dependendo da configuração de confirmação de e-mail
 * do projeto Supabase:
 *
 * 1. session existe:
 *    usuário já está autenticado.
 *
 * 2. session não existe:
 *    Supabase está aguardando confirmação.
 */

if (data?.session) {

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
  "Conta criada. Verifique seu e-mail para confirmar a conta antes de entrar.",
  "success"
);


/*
 * Limpamos apenas os campos sensíveis.
 */
if (form.elements.password) {
  form.elements.password.value = "";
}

if (form.elements.passwordConfirm) {
  form.elements.passwordConfirm.value = "";
}

} catch (error) {

const normalized =
  normalizeSupabaseError(
    error,
    {
      file: "auth.js",
      function: "handleRegister",
      table: "auth.users",
      operation: "signUp"
    }
  );


showAuthMessage(
  translateAuthError(normalized)
);

} finally {

setButtonLoading(
  button,
  false
);

isSubmitting = false;

}
}

/* ============================================================
DISCORD
============================================================ */

async function handleDiscordLogin() {
if (isSubmitting) {
return;
}

clearAuthMessage();

const button =
getElement(
"discord-login-button"
);

const startedAt =
Date.now();

isSubmitting = true;

setButtonLoading(
button,
true,
"Conectando..."
);

try {

const supabase =
  await getSupabase();


/*
 * URL absoluta exigida pelo OAuth.
 *
 * Em produção, o domínio precisa estar cadastrado
 * nas Redirect URLs do Supabase.
 */

const redirectTo =
  new URL(
    AUTH_CONFIG.oauthRedirectPath,
    window.location.origin
  ).href;


const {
  data,
  error
} = await supabase.auth.signInWithOAuth({

  provider: "discord",

  options: {
    redirectTo
  }

});


if (error) {
  throw error;
}


/*
 * O Supabase normalmente redirecionará
 * automaticamente o navegador para o Discord.
 *
 * Se isso não acontecer, não fazemos uma
 * navegação inventada.
 */

if (!data?.url) {
  throw new Error(
    "O Supabase não retornou uma URL de autenticação do Discord."
  );
}


await waitMinimumLoadingTime(
  startedAt
);


window.location.assign(
  data.url
);

} catch (error) {

const normalized =
  normalizeSupabaseError(
    error,
    {
      file: "auth.js",
      function: "handleDiscordLogin",
      table: "auth.users",
      operation: "signInWithOAuth"
    }
  );


showAuthMessage(
  translateAuthError(normalized)
);


setButtonLoading(
  button,
  false
);

isSubmitting = false;

}
}

/* ============================================================
RECUPERAÇÃO DE SENHA
============================================================ */

async function handlePasswordRecovery() {

if (isSubmitting) {
return;
}

clearAuthMessage();

const emailInput =
getElement("login-email");

const email =
String(
emailInput?.value ?? ""
).trim();

if (!email) {

setFieldError(
  "login-email",
  "login-email-error",
  "Digite seu e-mail para recuperar a senha."
);

emailInput?.focus();

return;

}

if (!isValidEmail(email)) {

setFieldError(
  "login-email",
  "login-email-error",
  "Digite um e-mail válido."
);

emailInput?.focus();

return;

}

clearFieldError(
"login-email",
"login-email-error"
);

try {

isSubmitting = true;


const supabase =
  await getSupabase();


const redirectTo =
  new URL(
    AUTH_CONFIG.recoveryPage,
    window.location.origin
  ).href;


const {
  error
} = await supabase.auth.resetPasswordForEmail(
  email,
  {
    redirectTo
  }
);


if (error) {
  throw error;
}


showAuthMessage(
  "Se existir uma conta associada a esse e-mail, você receberá as instruções para redefinir sua senha.",
  "success"
);

} catch (error) {

const normalized =
  normalizeSupabaseError(
    error,
    {
      file: "auth.js",
      function: "handlePasswordRecovery",
      table: "auth.users",
      operation: "resetPasswordForEmail"
    }
  );


showAuthMessage(
  translateAuthError(normalized)
);

} finally {

isSubmitting = false;

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
} = await supabase.auth.signOut();

if (error) {

const normalized =
  normalizeSupabaseError(
    error,
    {
      file: "auth.js",
      function: "logout",
      table: "auth.sessions",
      operation: "signOut"
    }
  );

throw normalized;

}

window.location.replace(
AUTH_CONFIG.loginPage
);
}

/* ============================================================
TROCA DE SENHA
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
} = await supabase.auth.updateUser({
password: newPassword
});

if (error) {

const normalized =
  normalizeSupabaseError(
    error,
    {
      file: "auth.js",
      function: "updatePassword",
      table: "auth.users",
      operation: "updateUser"
    }
  );

throw normalized;

}
}

/* ============================================================
TOGGLE SENHA
============================================================ */

function togglePasswordVisibility(
inputId,
buttonId
) {

const input =
getElement(inputId);

const button =
getElement(buttonId);

if (!input || !button) {
return;
}

const showing =
input.type === "text";

input.type =
showing
? "password"
: "text";

button.setAttribute(
"aria-pressed",
String(!showing)
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
TROCA LOGIN / CADASTRO
============================================================ */

function showLoginForm() {

const login =
getElement("login-form");

const register =
getElement("register-form");

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
getElement("auth-title");

const description =
getElement("auth-description");

if (login) {
login.hidden = false;
}

if (register) {
register.hidden = true;
}

if (registerButton) {
registerButton.hidden = false;
}

if (loginButton) {
loginButton.hidden = true;
}

if (discordButton) {
discordButton.hidden = false;
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

function showRegisterForm() {

const login =
getElement("login-form");

const register =
getElement("register-form");

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
getElement("auth-title");

const description =
getElement("auth-description");

if (login) {
login.hidden = true;
}

if (register) {
register.hidden = false;
}

if (registerButton) {
registerButton.hidden = true;
}

if (loginButton) {
loginButton.hidden = false;
}

if (discordButton) {
discordButton.hidden = true;
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
getElement("login-form");

const registerForm =
getElement("register-form");

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

/* ---------- Senhas ---------- */

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

/* ---------- Limpeza de erros ---------- */

const loginEmail =
getElement("login-email");

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
getElement("login-password");

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
getElement("register-name");

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
getElement("register-email");

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
getElement("register-password");

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
SESSÃO
============================================================ */

async function handleInitialSession() {

/*

* Se o usuário voltar do Discord,
* o supabase-js processará a sessão.
  */

const session =
await getCurrentSession();

if (session) {

/*
 * Se já estiver autenticado e abrir index.html,
 * não precisa fazer login novamente.
 */

redirectToAuthenticatedPage();

return;

}
}

/* ============================================================
AUTH STATE LISTENER
============================================================ */

async function initializeAuthListener() {

const supabase =
await getSupabase();

/*

* Evita registrar múltiplos listeners.
  */

if (authListener) {
return;
}

const result =
supabase.auth.onAuthStateChange(
(event, session) => {

    /*
     * Não redirecionamos indiscriminadamente
     * em SIGNED_IN durante qualquer página.
     *
     * Este listener só é usado na página de autenticação.
     */

    if (
      event === "SIGNED_IN" &&
      session
    ) {
      redirectToAuthenticatedPage();
    }

  }
);

authListener =
result?.data?.subscription ?? null;
}

/* ============================================================
INICIALIZAÇÃO
============================================================ */

export async function initializeAuth() {

if (authInitialized) {
return;
}

authInitialized = true;

try {

bindAuthEvents();

await initializeAuthListener();

await handleInitialSession();

} catch (error) {

const normalized =
  normalizeSupabaseError(
    error,
    {
      file: "auth.js",
      function: "initializeAuth",
      table: "auth.sessions",
      operation: "initialize"
    }
  );


showAuthMessage(
  translateAuthError(normalized)
);

}
}

/* ============================================================
DESTROY
============================================================ */

export function destroyAuth() {

if (
authListener &&
typeof authListener.unsubscribe === "function"
) {
authListener.unsubscribe();

authListener = null;

}

authInitialized = false;

isSubmitting = false;
}

/* ============================================================
EXPORTS
============================================================ */

export {
getCurrentSession,
showLoginForm,
showRegisterForm
};