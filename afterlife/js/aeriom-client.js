import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AFTERLIFE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';

export const aeriom = createClient(AFTERLIFE_URL, AFTERLIFE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'afterlife-auth'
  }
});

export const afterlife = aeriom;

const nativeGetSession = aeriom.auth.getSession.bind(aeriom.auth);
const nativeGetUser = aeriom.auth.getUser.bind(aeriom.auth);

let readyPromise;

async function bootstrapFromPortal() {
  const current = await nativeGetSession();
  if (current.data?.session?.user) return true;

  const portal = createClient(PORTAL_URL, PORTAL_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data: portalData } = await portal.auth.getSession();
  const portalToken = portalData?.session?.access_token;
  if (!portalToken) return false;

  const response = await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${portalToken}`,
      apikey: AFTERLIFE_KEY,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token_hash || !payload.email) {
    console.warn('[AFTERLIFE] SSO:', payload.error || `HTTP ${response.status}`);
    return false;
  }

  // portal-bridge generates a magiclink token. It must be verified as
  // "magiclink", not "email", otherwise Supabase rejects the token and
  // the Afterlife client remains without an authenticated session.
  const { data, error } = await aeriom.auth.verifyOtp({
    email: payload.email,
    token_hash: payload.token_hash,
    type: 'magiclink'
  });
  if (error || !data?.session?.user) {
    console.warn('[AFTERLIFE] SSO verify:', error || 'sessão não criada');
    return false;
  }
  return true;
}

export const afterlifeReady = (readyPromise ||= bootstrapFromPortal().catch((error) => {
  console.warn('[AFTERLIFE] SSO bootstrap:', error);
  return false;
}));

aeriom.auth.getSession = async (...args) => {
  await afterlifeReady;
  return nativeGetSession(...args);
};

aeriom.auth.getUser = async (...args) => {
  await afterlifeReady;
  return nativeGetUser(...args);
};
