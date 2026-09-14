import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AFTERLIFE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const AFTERLIFE_ENTRY = 'https://henriqux77.github.io/Aeriom-v2/afterlife/index.html';

const afterlifeClient = window.__afterlifeSupabaseClient || createClient(AFTERLIFE_URL, AFTERLIFE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'afterlife-auth'
  }
});

window.__afterlifeSupabaseClient = afterlifeClient;

export const aeriom = afterlifeClient;
export const afterlife = afterlifeClient;

async function bootstrapFromPortal() {
  if (window.__afterlifeBootstrapStarted) return window.__afterlifeBootstrapStarted;

  window.__afterlifeBootstrapStarted = (async () => {
    try {
      const { data } = await afterlifeClient.auth.getSession();
      if (data?.session?.user) return true;

      const portal = createClient(PORTAL_URL, PORTAL_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      const { data: portalSession } = await portal.auth.getSession();
      const token = portalSession?.session?.access_token;
      if (!token) return false;

      const response = await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: AFTERLIFE_KEY,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.action_link) {
        console.warn('[AFTERLIFE] portal bridge:', payload.error || response.status);
        return false;
      }

      const action = new URL(payload.action_link);
      action.searchParams.set('redirect_to', AFTERLIFE_ENTRY);
      window.location.replace(action.toString());
      return false;
    } catch (error) {
      console.warn('[AFTERLIFE] falha ao restaurar sessão:', error);
      return false;
    }
  })();

  return window.__afterlifeBootstrapStarted;
}

export const afterlifeReady = bootstrapFromPortal();
void afterlifeReady;
