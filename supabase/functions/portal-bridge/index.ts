import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://henriqux77.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const PORTAL_URL = "https://kitlpowgcugvlxwhwhqv.supabase.co";
const PORTAL_KEY = "sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW";
const AFTERLIFE_URL = "https://srmpaiawojkwlppoisns.supabase.co";
const AFTERLIFE_KEY = "sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

async function findTargetUser(admin: ReturnType<typeof createClient>, portalUserId: string, email: string) {
  const { data: mappedProfile, error: profileLookupError } = await admin.from("profiles").select("id,portal_user_id").eq("portal_user_id", portalUserId).maybeSingle();
  if (profileLookupError) throw profileLookupError;
  if (mappedProfile?.id) {
    const { data: mappedAuthUser, error } = await admin.auth.admin.getUserById(mappedProfile.id);
    if (!error && mappedAuthUser?.user) return mappedAuthUser.user;
  }
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const target = data.users.find((u) => String(u.email || "").trim().toLowerCase() === email);
    if (target) return target;
    if (data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Sessão do portal ausente." }, 401);
    const portalResponse = await fetch(PORTAL_URL + "/auth/v1/user", {
      headers: { apikey: PORTAL_KEY, Authorization: "Bearer " + token }, cache: "no-store"
    });
    if (!portalResponse.ok) return json({ error: "Sessão do portal inválida ou expirada." }, 401);
    const portalUser = await portalResponse.json();
    const portalUserId = String(portalUser?.id || "").trim();
    const email = String(portalUser?.email || "").trim().toLowerCase();
    if (!portalUserId) return json({ error: "Identidade do portal ausente." }, 400);
    if (!email) return json({ error: "A conta do portal não possui e-mail." }, 400);
    const displayName = String(portalUser?.user_metadata?.display_name || portalUser?.user_metadata?.full_name || email.split("@")[0] || "Sobrevivente").slice(0, 120);
    const admin = createClient(AFTERLIFE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const authClient = createClient(AFTERLIFE_URL, AFTERLIFE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    let target = await findTargetUser(admin, portalUserId, email);
    if (!target) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { portal_user_id: portalUserId, display_name: displayName, linked_from: "aeriom-portal" } });
      if (createError) {
        target = await findTargetUser(admin, portalUserId, email);
        if (!target) return json({ error: createError.message }, 500);
      } else target = created.user;
    }
    if (!target?.id) return json({ error: "Não foi possível preparar a conta Afterlife." }, 500);
    const mergedMetadata = { ...(target.user_metadata || {}), portal_user_id: portalUserId, display_name: displayName, linked_from: "aeriom-portal" };
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(target.id, { email_confirm: true, user_metadata: mergedMetadata });
    if (updateError) return json({ error: updateError.message }, 500);
    target = updated.user || target;
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError) return json({ error: linkError.message }, 500);
    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) return json({ error: "Não foi possível gerar o token de acesso Afterlife." }, 500);
    let session = null; let verifyError = null;
    for (const type of ["magiclink", "email"] as const) {
      const result = await authClient.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!result.error && result.data?.session?.access_token && result.data?.session?.refresh_token) { session = result.data.session; verifyError = null; break; }
      verifyError = result.error;
    }
    if (!session) return json({ error: verifyError?.message || "Não foi possível converter o token em sessão Afterlife." }, 500);
    const { error: profileError } = await admin.from("profiles").upsert({ id: target.id, display_name: displayName, portal_user_id: portalUserId, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (profileError) console.warn("[portal-bridge] profile sync", profileError.message);
    return json({ access_token: session.access_token, refresh_token: session.refresh_token, expires_at: session.expires_at, email, user_id: target.id, portal_user_id: portalUserId, display_name: displayName });
  } catch (error) {
    console.error("[portal-bridge]", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível iniciar o Afterlife." }, 500);
  }
});