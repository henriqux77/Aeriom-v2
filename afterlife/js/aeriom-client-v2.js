import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AFTERLIFE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const HANDOFF_KEY = 'afterlife_portal_handoff';
const PORTAL_STORAGE_KEY = 'sb-kitlpowgcugvlxwhwhqv-auth-token';

export const aeriom = createClient(AFTERLIFE_URL, AFTERLIFE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'afterlife-auth',
  },
});
export const afterlife = aeriom;

let ensurePromise = null;

function parse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function portalCandidates() {
  return [
    parse(localStorage.getItem(PORTAL_STORAGE_KEY)),
    parse(localStorage.getItem(HANDOFF_KEY)),
  ].filter((value) => value?.access_token && value?.refresh_token);
}

async function validatePortal(accessToken) {
  try {
    const response = await fetch(`${PORTAL_URL}/auth/v1/user`, {
      headers: { apikey: PORTAL_KEY, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}

async function refreshPortal(refreshToken) {
  try {
    const response = await fetch(`${PORTAL_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: PORTAL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    if (!payload?.access_token || !payload?.refresh_token) return null;
    localStorage.setItem(HANDOFF_KEY, JSON.stringify({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600),
      email: payload.user?.email || null,
      user_id: payload.user?.id || null,
      created_at: Date.now(),
    }));
    return payload;
  } catch { return null; }
}

async function getPortalAccess() {
  for (const candidate of portalCandidates()) {
    const user = await validatePortal(candidate.access_token);
    if (user?.id) return { token: candidate.access_token, user };

    const refreshed = await refreshPortal(candidate.refresh_token);
    if (!refreshed) continue;
    const refreshedUser = await validatePortal(refreshed.access_token);
    if (refreshedUser?.id) return { token: refreshed.access_token, user: refreshedUser };
  }
  return null;
}

async function bridge() {
  const portal = await getPortalAccess();
  if (!portal) return null;

  const response = await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${portal.token}`,
      apikey: AFTERLIFE_KEY,
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `portal-bridge HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function establish() {
  const current = await aeriom.auth.getSession();
  if (current.data?.session?.user) return current.data.session;

  const payload = await bridge();
  if (!payload) return null;

  if (payload.token_hash && payload.email) {
    const result = await aeriom.auth.verifyOtp({
      email: payload.email,
      token_hash: payload.token_hash,
      type: 'magiclink',
    });
    if (result.error) throw result.error;
    if (result.data?.session?.user) {
      localStorage.removeItem(HANDOFF_KEY);
      return result.data.session;
    }
  }

  if (payload.access_token && payload.refresh_token) {
    const result = await aeriom.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    if (result.error) throw result.error;
    if (result.data?.session?.user) {
      localStorage.removeItem(HANDOFF_KEY);
      return result.data.session;
    }
  }

  return null;
}

export async function ensureAfterlifeSession() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = establish()
    .catch((error) => {
      console.warn('[AFTERLIFE][AUTH]', error?.message || error);
      return null;
    })
    .finally(() => { ensurePromise = null; });
  return ensurePromise;
}

export const afterlifeReady = ensureAfterlifeSession();
