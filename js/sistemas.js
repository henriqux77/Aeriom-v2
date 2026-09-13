import { getSupabase } from './core/supabase.js';

const $ = (id) => document.getElementById(id);

async function init() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    window.location.replace('./index.html');
    return;
  }

  const user = data.session.user;
  const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Sobrevivente';
  const identity = $('identityLine');
  if (identity) identity.textContent = `${name} • ${user.email || 'conta autenticada'}`;

  $('aeriomCard')?.addEventListener('click', () => {
    window.location.href = './campanhas.html';
  });

  $('afterlifeCard')?.addEventListener('click', () => {
    window.location.href = './afterlife/entrar.html';
  });

  $('logoutButton')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.replace('./index.html');
  });
}

init().catch((error) => {
  console.error('[AERIOM][SYSTEMS]', error);
  window.location.replace('./index.html');
});
