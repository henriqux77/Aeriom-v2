import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const PORTAL_SUPABASE_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_SUPABASE_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const supabase = createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

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

function rememberPortalIdentity(user) {
  if (!user) return;
  localStorage.setItem('afterlife_portal_handoff', JSON.stringify({
    id: user.id,
    email: user.email || '',
    display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sobrevivente',
    handedAt: Date.now()
  }));
}

function displaySystem(user) {
  rememberPortalIdentity(user);
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

async function enterAfterlife(button) {
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = 'ABRINDO AFTERLIFE…';
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw error || new Error('Sua sessão do portal expirou. Entre novamente.');
    const response = await fetch('https://srmpaiawojkwlppoisns.supabase.co/functions/v1/portal-bridge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.action_link) throw new Error(payload.error || 'Não foi possível iniciar o Afterlife.');
    window.location.href = payload.action_link;
  } catch (error) {
    button.disabled = false;
    button.textContent = oldText;
    showMessage(friendlyError(error));
  }
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
      localStorage.removeItem('afterlife_portal_handoff');
      showView('login');
    }
  });
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
  localStorage.removeItem('afterlife_portal_handoff');
  localStorage.removeItem('afterlife-auth');
  await supabase.auth.signOut();
  showView('login');
});

document.querySelectorAll('.system-enter').forEach((button) => {
  button.addEventListener('click', () => {
    const href = button.dataset.href;
    if (!href) return;
    if (button.closest('.system-card--afterlife')) return enterAfterlife(button);
    window.location.href = href;
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
