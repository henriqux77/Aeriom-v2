import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AFTERLIFE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';

const afterlifeClient = window.__afterlifeSupabaseClient || createClient(AFTERLIFE_URL, AFTERLIFE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'afterlife-auth'
  }
});

window.__afterlifeSupabaseClient = afterlifeClient;

// Mantém o nome de exportação usado pelos arquivos antigos do Afterlife,
// mas nunca reutiliza o cliente global do Aeriom.
export const aeriom = afterlifeClient;
export const afterlife = afterlifeClient;
