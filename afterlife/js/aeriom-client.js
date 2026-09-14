import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const AFTERLIFE_URL = 'https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY = 'sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const HANDOFF_KEY = 'afterlife_portal_handoff';
const HANDOFF_MAX_AGE = 5 * 60 * 1000;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readPortalHandoff() {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.access_token || !data?.refresh_token) return null;
    if (data.created_at && Date.now() - Number(data.created_at) > HANDOFF_MAX_AGE) {
      localStorage.removeItem(HANDOFF_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function getPortalSession(portal) {
  const handoff = readPortalHandoff();
  if (handoff) {
    const restored = await portal.auth.setSession({
      access_token: handoff.access_token,
      refresh_token: handoff.refresh_token
    });
    if (!restored.error && restored.data?.session) return restored.data.session;
  }

  // O portal pode ainda estar finalizando a restauração da sessão no navegador.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await portal.auth.getSession();
    if (!error && data?.session) return data.session;
    if (attempt < 3) await sleep(350);
  }
  return null;
}

async function bootstrapFromPortal() {
  const current = await nativeGetSession();
  if (current.data?.session?.user) return true;

  const portal = createClient(PORTAL_URL, PORTAL_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const portalSession = await getPortalSession(portal);
  const portalToken = portalSession?.access_token;
  if (!portalToken) {
    console.warn('[AFTERLIFE] Sessão do portal não disponível para SSO.');
    return false;
  }

  let response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    response = await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${portalToken}`,
        apikey: AFTERLIFE_KEY,
        'Content-Type': 'application/json'
      },
      body: '{}',
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch (error) {
    console.warn('[AFTERLIFE] Falha ao contactar a ponte SSO:', error);
    return false;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token_hash || !payload.email) {
    console.warn('[AFTERLIFE] SSO:', payload.error || `HTTP ${response.status}`);
    return false;
  }

  const { data, error } = await aeriom.auth.verifyOtp({
    email: payload.email,
    token_hash: payload.token_hash,
    type: 'email'
  });
  if (error || !data?.session?.user) {
    console.warn('[AFTERLIFE] SSO verify:', error || 'sessão não criada');
    return false;
  }

  localStorage.removeItem(HANDOFF_KEY);
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
