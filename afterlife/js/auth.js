import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (id) => document.getElementById(id);
const loginView = $('loginView');
const registerView = $('registerView');
const systemView = $('systemView');
const message = $('authMessage');
const loginForm = $('loginForm');
const registerForm = $('registerForm');
const remember = $('remember');

function showMessage(text, type = 'error') {
  if (!message) return;
  message.textContent = text || '';
  message.dataset.type = type;
  message.hidden = !text;
}

function friendlyError(error) {
  const text = String(error?.message || '').toLowerCase();
  if (text.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (text.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (text.includes('user already registered')) return 'Este e-mail já possui uma conta.';
  if (text.includes('password')) return 'A senha não atende aos requisitos mínimos.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Muitas tentativas. Aguarde um pouco.';
  return error?.message || 'Não foi possível concluir a autenticação.';
}

function setMode(mode) {
  const register = mode === 'register';
  loginView?.classList.toggle('hidden', register);
  registerView?.classList.toggle('hidden', !register);
  showMessage('');
}

function showSystems(user) {
  loginView?.classList.add('hidden');
  registerView?.classList.add('hidden');
  systemView?.classList.add('is-visible');
  const userName = $('systemUserName');
  if (userName) userName.textContent = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Sobrevivente';
  const email = $('systemUserEmail');
  if (email) email.textContent = user?.email || '';
}

async function start() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) showSystems(data.session.user);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) showSystems(session.user);
  });
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');
  const email = $('loginEmail')?.value.trim();
  const password = $('loginPassword')?.value || '';
  if (!email || !password) return showMessage('Preencha e-mail e senha.');
  const button = $('loginSubmit');
  if (button) button.disabled = true;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (button) button.disabled = false;
  if (error) return showMessage(friendlyError(error));
  if (remember?.checked) localStorage.setItem('afterlife_last_email', email);
  showSystems(data.user);
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');
  const name = $('registerName')?.value.trim();
  const email = $('registerEmail')?.value.trim();
  const password = $('registerPassword')?.value || '';
  const confirm = $('registerConfirm')?.value || '';
  if (name.length < 2) return showMessage('Digite seu nome.');
  if (password.length < 8) return showMessage('A senha precisa ter pelo menos 8 caracteres.');
  if (password !== confirm) return showMessage('As senhas não coincidem.');
  const button = $('registerSubmit');
  if (button) button.disabled = true;
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
  if (button) button.disabled = false;
  if (error) return showMessage(friendlyError(error));
  if (data.session?.user) return showSystems(data.user);
  setMode('login');
  showMessage('Conta criada. Verifique seu e-mail para confirmar o acesso.', 'success');
});

$('showRegister')?.addEventListener('click', () => setMode('register'));
$('showLogin')?.addEventListener('click', () => setMode('login'));
$('toggleLoginPassword')?.addEventListener('click', () => {
  const input = $('loginPassword'); if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
});
$('toggleRegisterPassword')?.addEventListener('click', () => {
  const input = $('registerPassword'); if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
});
$('toggleRegisterConfirm')?.addEventListener('click', () => {
  const input = $('registerConfirm'); if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
});
$('forgotPassword')?.addEventListener('click', async () => {
  const email = $('loginEmail')?.value.trim();
  if (!email) return showMessage('Digite seu e-mail para receber o link de recuperação.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
  showMessage(error ? friendlyError(error) : 'Enviamos um link de recuperação para seu e-mail.', error ? 'error' : 'success');
});
$('logoutSystem')?.addEventListener('click', async (event) => {
  event.preventDefault();
  await supabase.auth.signOut();
  systemView?.classList.remove('is-visible');
  loginView?.classList.remove('hidden');
});

$('enterAeriom')?.addEventListener('click', () => {
  window.location.href = '../index.html';
});
$('enterAfterlife')?.addEventListener('click', () => {
  window.location.href = './index.html';
});

const remembered = localStorage.getItem('afterlife_last_email');
if (remembered && $('loginEmail')) $('loginEmail').value = remembered;
start();
