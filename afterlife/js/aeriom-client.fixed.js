import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const AFTERLIFE_URL='https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY='sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL='https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY='sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const HANDOFF_KEY='afterlife_portal_handoff';
export const aeriom=createClient(AFTERLIFE_URL,AFTERLIFE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'afterlife-auth'}});
export const afterlife=aeriom;
const nativeGetSession=aeriom.auth.getSession.bind(aeriom.auth), nativeGetUser=aeriom.auth.getUser.bind(aeriom.auth);
let readyPromise;
function handoff(){try{const d=JSON.parse(localStorage.getItem(HANDOFF_KEY)||'null');return d?.access_token&&d?.refresh_token?d:null;}catch{return null;}}
function save(s){if(!s?.access_token||!s?.refresh_token)return;localStorage.setItem(HANDOFF_KEY,JSON.stringify({...s,user_id:s.user?.id||null,email:s.user?.email||null,created_at:Date.now()}));}
async function check(token){if(!token)return null;try{const r=await fetch(`${PORTAL_URL}/auth/v1/user`,{headers:{apikey:PORTAL_KEY,Authorization:`Bearer ${token}`},cache:'no-store'});return r.ok?r.json():null;}catch{return null;}}
async function refresh(rt){try{const r=await fetch(`${PORTAL_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:PORTAL_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rt}),cache:'no-store'});const p=await r.json().catch(()=>({}));if(!r.ok||!p.access_token||!p.refresh_token)return null;const s={access_token:p.access_token,refresh_token:p.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(p.expires_in||3600),user:p.user||null};save(s);return s;}catch{return null;}}
async function portalToken(){const h=handoff();if(!h)return null;const user=await check(h.access_token);if(user?.id)return h.access_token;const s=await refresh(h.refresh_token);if(!s)return null;const fresh=await check(s.access_token);return fresh?.id?s.access_token:null;}
async function bootstrap(){const cur=await nativeGetSession();if(cur.data?.session?.user)return true;const token=await portalToken();if(!token)return false;try{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),12000);const r=await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:AFTERLIFE_KEY,'Content-Type':'application/json'},body:'{}',signal:ctl.signal,cache:'no-store'});clearTimeout(t);const p=await r.json().catch(()=>({}));if(!r.ok){console.warn('[AFTERLIFE] SSO:',p.error||`HTTP ${r.status}`);return false;}if(p.access_token&&p.refresh_token){const {data,error}=await aeriom.auth.setSession({access_token:p.access_token,refresh_token:p.refresh_token});if(!error&&data?.session?.user){localStorage.removeItem(HANDOFF_KEY);return true;}console.warn('[AFTERLIFE] SSO session:',error||'sessão não criada');}return false;}catch(e){console.warn('[AFTERLIFE] SSO bootstrap:',e);return false;}}
export async function ensureAfterlifeSession(){const c=await nativeGetSession();if(c.data?.session?.user)return c.data.session;await bootstrap();return (await nativeGetSession()).data?.session||null;}
export const afterlifeReady=(readyPromise||=bootstrap().catch(()=>false));
aeriom.auth.getSession=async(...args)=>{await afterlifeReady;return nativeGetSession(...args)};
aeriom.auth.getUser=async(...args)=>{await afterlifeReady;return nativeGetUser(...args)};
