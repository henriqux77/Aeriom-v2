import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AERIOM_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const AERIOM_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';

export const aeriom = window.__afterlifeAeriom || createClient(AERIOM_URL, AERIOM_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

window.__afterlifeAeriom = aeriom;
