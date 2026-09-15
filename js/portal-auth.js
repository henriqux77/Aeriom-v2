import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const PORTAL_SUPABASE_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_SUPABASE_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const AFTERLIFE_ENTRY = 'https://henriqux77.github.io/Aeriom-v2/afterlife/index.html';
const AFTERLIFE_ROOT = '/Aeriom-v2/afterlife/';
const HANDOFF_KEY = 'afterlife_portal_handoff';
const VERIFYING_KEY = '__AFTERLIFE_VERIFYING_MAGIC_LINK__';
const supabase = createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const HOTFIX_CSS = './css/portal-hotfix.css?v=20260914-6';
if (!document.querySelector('link[data-portal-hotfix="1"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = HOTFIX_CSS;
  link.dataset.portalHotfix = '1';
  document.head.appendChild(link);
}

const $ = (id) => document.getElementById(id);
const loginView = $('loginView');
const registerView = $('registerView');
const systemView = $('systemView');
const message = $('authMessage');

function showMessage(text = '', type = 'error') {
  if (!message) return;
  message.textContent = text;
  message.className = `message ${text ? 'is-visible' : ''} ${type}`;
}

function showView(view) {
  loginView?.classList.toggle('view-hidden', view !== 'login');
  registerView?.classList.toggle('view-hidden', view !== 'register');
  systemView?.classList.toggle('is-visible', view === 'system');
}

function friendlyError(error) {
  const text = String(error?.message || '').toLowerCase();
  if (text.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (text.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (text.includes('user already registered')) return 'Este e-mail já possui uma conta.';
  if (text.includes('provider') && text.includes('disabled')) return 'Este método de login ainda não está habilitado no Supabase.';
  if (text.includes('redirect')) return 'A URL de retorno não está autorizada no Supabase.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Muitas tentativas. Aguarde um pouco.';
  if (text.includes('password')) return 'A senha não atende aos requisitos mínimos.';
  return error?.message || 'Não foi possível concluir a autenticação.';
}

function getReturnTo() {
  const raw = new URLSearchParams(location.search).get('returnTo');
  if (!raw) return AFTERLIFE_ENTRY;
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return AFTERLIFE_ENTRY;
    if (!url.pathname.startsWith(AFTERLIFE_ROOT)) return AFTERLIFE_ENTRY;
    if (url.pathname.endsWith('/entrar.html')) return AFTERLIFE_ENTRY;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return AFTERLIFE_ENTRY;
  }
}

function writeAfterlifeHandoff(session, returnTo = AFTERLIFE_ENTRY) {
  if (!session?.access_token) return;
  localStorage.setItem(HANDOFF_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    email: session.user?.email || null,
    user_id: session.user?.id || null,
    return_to: returnTo,
    created_at: Date.now()
  }));
}

async function enterAfterlife(button) {
  if (button?.disabled) return;
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'ABRINDO AFTERLIFE…';
  }
  showMessage('Abrindo o Afterlife…', 'success');

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = 'ENTRAR →';
    }
    showMessage(friendlyError(error || new Error('Sessão do portal não encontrada.')));
    return;
  }

  sessionStorage.removeItem(VERIFYING_KEY);
  const returnTo = getReturnTo();
  writeAfterlifeHandoff(data.session, returnTo);
  const target = new URL(returnTo, location.origin);
  window.location.assign(target.href);
}

async function init() {
  const { data, error } = await supabase.auth.getSession();
  if (error) showMessage(friendlyError(error));
  if (data.session?.user) displaySystem(data.session.user);
  const remembered = localStorage.getItem('aeriom_portal_email');
  if (remembered && $('loginEmail')) $('loginEmail').value = remembered;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) displaySystem(session.user);
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem(HANDOFF_KEY);
      sessionStorage.removeItem(VERIFYING_KEY);
      showView('login');
    }
  });

  const qs = new URLSearchParams(location.search);
  if (qs.get('afterlife') === '1' && data.session?.user) {
    const button = document.querySelector('.system-card--afterlife .system-enter');
    await enterAfterlife(button || { disabled: false });
  }
}

function displaySystem(user) {
  showView('system');
  $('systemUserName') && ($('systemUserName').textContent = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Sobrevivente');
  $('systemUserEmail') && ($('systemUserEmail').textContent = user?.email || '');
}

async function oauth(provider) {
  showMessage();
  const button = $('discordLogin');
  if (button) button.disabled = true;
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}${window.location.pathname}` } });
  if (error) {
    if (button) button.disabled = false;
    showMessage(friendlyError(error));
  }
}

$('loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage();
  const email = $('loginEmail')?.value.trim();
  const password = $('loginPassword')?.value || '';
  if (!email || !password) return showMessage('Preencha e-mail e senha.');
  const button = $('loginSubmit');
  if (button) button.disabled = true;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (button) button.disabled = false;
  if (error) return showMessage(friendlyError(error));
  if ($('remember')?.checked) localStorage.setItem('aeriom_portal_email', email);
  displaySystem(data.user);
  const qs = new URLSearchParams(location.search);
  if (qs.get('afterlife') === '1') await enterAfterlife(document.querySelector('.system-card--afterlife .system-enter') || { disabled: false });
});

$('registerForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage();
  const name = $('registerName')?.value.trim();
  const email = $('registerEmail')?.value.trim();
  const password = $('registerPassword')?.value || '';
  const confirm = $('registerConfirm')?.value || '';
  if (!name || name.length < 2) return showMessage('Digite seu nome.');
  if (!email) return showMessage('Digite seu e-mail.');
  if (password.length < 8) return showMessage('A senha precisa ter pelo menos 8 caracteres.');
  if (password !== confirm) return showMessage('As senhas não coincidem.');
  const button = $('registerSubmit');
  if (button) button.disabled = true;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
  if (button) button.disabled = false;
  if (error) return showMessage(friendlyError(error));
  if (data.session?.user) return displaySystem(data.user);
  showView('login');
  showMessage('Conta criada. Verifique seu e-mail para confirmar o acesso.', 'success');
});

$('showRegister')?.addEventListener('click', () => { showView('register'); showMessage(); });
$('showLogin')?.addEventListener('click', () => { showView('login'); showMessage(); });

[['toggleLoginPassword','loginPassword'],['toggleRegisterPassword','registerPassword'],['toggleRegisterConfirm','registerConfirm']].forEach(([buttonId, inputId]) => {
  $(buttonId)?.addEventListener('click', () => {
    const input = $(inputId); if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

$('forgotPassword')?.addEventListener('click', async () => {
  const email = $('loginEmail')?.value.trim();
  if (!email) return showMessage('Digite seu e-mail para receber o link de recuperação.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}` });
  showMessage(error ? friendlyError(error) : 'Enviamos um link de recuperação para seu e-mail.', error ? 'error' : 'success');
});

$('discordLogin')?.addEventListener('click', () => oauth('discord'));
$('logoutSystem')?.addEventListener('click', async (event) => {
  event.preventDefault();
  localStorage.removeItem(HANDOFF_KEY);
  sessionStorage.removeItem(VERIFYING_KEY);
  localStorage.removeItem('afterlife-auth');
  await supabase.auth.signOut();
  showView('login');
});

document.querySelectorAll('.system-enter').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.closest('.system-card--afterlife')) return enterAfterlife(button);
    const href = button.dataset.href;
    if (href) window.location.href = href;
  });
});

document.querySelectorAll('.card-info').forEach((button) => {
  button.addEventListener('click', () => {
    const target = $(button.dataset.target); if (!target) return;
    const open = target.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'OCULTAR' : 'CONHECER';
  });
});

init().catch((error) => showMessage(friendlyError(error)));
