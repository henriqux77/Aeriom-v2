import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AFTERLIFE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const HANDOFF_KEY = 'afterlife_portal_handoff';
const HANDOFF_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const aeriom = createClient(AFTERLIFE_URL, AFTERLIFE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'afterlife-auth' }
});
export const afterlife = aeriom;

const nativeGetSession = aeriom.auth.getSession.bind(aeriom.auth);
const nativeGetUser = aeriom.auth.getUser.bind(aeriom.auth);
let readyPromise;

function readHandoff() {
  try {
    const data = JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null');
    if (!data?.access_token || !data?.refresh_token) return null;
    if (data.created_at && Date.now() - Number(data.created_at) > HANDOFF_MAX_AGE) {
      localStorage.removeItem(HANDOFF_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function saveHandoff(session) {
  if (!session?.access_token || !session?.refresh_token) return;
  localStorage.setItem(HANDOFF_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_id: session.user?.id || null,
    email: session.user?.email || null,
    created_at: Date.now()
  }));
}

async function validatePortalToken(accessToken) {
  if (!accessToken) return null;
  try {
    const response = await fetch(`${PORTAL_URL}/auth/v1/user`, {
      headers: { apikey: PORTAL_KEY, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}

async function refreshPortalToken(refreshToken) {
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${PORTAL_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: PORTAL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token || !payload.refresh_token) return null;
    const session = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
      user: payload.user || null
    };
    saveHandoff(session);
    return session;
  } catch { return null; }
}

async function getPortalAccessToken() {
  const handoff = readHandoff();
  if (!handoff) return null;
  const user = await validatePortalToken(handoff.access_token);
  if (user?.id) return handoff.access_token;
  const refreshed = await refreshPortalToken(handoff.refresh_token);
  if (!refreshed) return null;
  const freshUser = await validatePortalToken(refreshed.access_token);
  return freshUser?.id ? refreshed.access_token : null;
}

async function bootstrapFromPortal() {
  const current = await nativeGetSession();
  if (current.data?.session?.user) return true;

  const portalToken = await getPortalAccessToken();
  if (!portalToken) return false;

  try {
    const response = await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${portalToken}`, apikey: AFTERLIFE_KEY, 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[AFTERLIFE] SSO:', payload.error || `HTTP ${response.status}`);
      return false;
    }

    if (payload.token_hash && payload.email) {
      const { data, error } = await aeriom.auth.verifyOtp({
        email: payload.email,
        token_hash: payload.token_hash,
        type: 'email'
      });
      if (!error && data?.session?.user) {
        localStorage.removeItem(HANDOFF_KEY);
        return true;
      }
      console.warn('[AFTERLIFE] SSO verify:', error || 'sessão não criada');
      return false;
    }

    if (payload.access_token && payload.refresh_token) {
      const { data, error } = await aeriom.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token
      });
      if (!error && data?.session?.user) {
        localStorage.removeItem(HANDOFF_KEY);
        return true;
      }
      console.warn('[AFTERLIFE] SSO session:', error || 'sessão não criada');
    }
    return false;
  } catch (error) {
    console.warn('[AFTERLIFE] SSO bootstrap:', error);
    return false;
  }
}

export async function ensureAfterlifeSession() {
  const current = await nativeGetSession();
  if (current.data?.session?.user) return current.data.session;
  await bootstrapFromPortal();
  return (await nativeGetSession()).data?.session || null;
}

export const afterlifeReady = (readyPromise ||= bootstrapFromPortal().catch((error) => {
  console.warn('[AFTERLIFE] SSO bootstrap:', error);
  return false;
}));

aeriom.auth.getSession = async (...args) => { await afterlifeReady; return nativeGetSession(...args); };
aeriom.auth.getUser = async (...args) => { await afterlifeReady; return nativeGetUser(...args); };
