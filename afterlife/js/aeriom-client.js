import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const AFTERLIFE_URL='https://srmpaiawojkwlppoisns.supabase.co';
const AFTERLIFE_KEY='sb_publishable_m3bleT4vqCFGeFOgnEfeZg_VpCxprmm';
const PORTAL_URL='https://kitlpowgcugvlxwhwhqv.supabase.co';
const PORTAL_KEY='sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
const HANDOFF_KEY='afterlife_portal_handoff';
export const aeriom=createClient(AFTERLIFE_URL,AFTERLIFE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'afterlife-auth'}});
export const afterlife=aeriom;
const nativeGetSession=aeriom.auth.getSession.bind(aeriom.auth),nativeGetUser=aeriom.auth.getUser.bind(aeriom.auth);
let readyPromise;
function handoff(){try{const d=JSON.parse(localStorage.getItem(HANDOFF_KEY)||'null');return d?.access_token&&d?.refresh_token?d:null;}catch{return null;}}
function saveHandoff(s){if(!s?.access_token||!s?.refresh_token)return;localStorage.setItem(HANDOFF_KEY,JSON.stringify({...s,user_id:s.user?.id||null,email:s.user?.email||null,created_at:Date.now()}));}
async function checkPortalUser(token){if(!token)return null;try{const r=await fetch(`${PORTAL_URL}/auth/v1/user`,{headers:{apikey:PORTAL_KEY,Authorization:`Bearer ${token}`},cache:'no-store'});if(!r.ok)return null;return await r.json();}catch{return null;}}
async function refreshPortal(rt){if(!rt)return null;try{const r=await fetch(`${PORTAL_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:PORTAL_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rt}),cache:'no-store'});const p=await r.json().catch(()=>({}));if(!r.ok||!p.access_token||!p.refresh_token)return null;const s={access_token:p.access_token,refresh_token:p.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(p.expires_in||3600),user:p.user||null};saveHandoff(s);return s;}catch{return null;}}
async function getPortalToken(){const h=handoff();if(!h)return null;const valid=await checkPortalUser(h.access_token);if(valid?.id)return h.access_token;const refreshed=await refreshPortal(h.refresh_token);if(!refreshed)return null;const fresh=await checkPortalUser(refreshed.access_token);return fresh?.id?refreshed.access_token:null;}
async function bootstrapFromPortal(){const current=await nativeGetSession();if(current.data?.session?.user)return true;const portalToken=await getPortalToken();if(!portalToken)return false;try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);const response=await fetch(`${AFTERLIFE_URL}/functions/v1/portal-bridge`,{method:'POST',headers:{Authorization:`Bearer ${portalToken}`,apikey:AFTERLIFE_KEY,'Content-Type':'application/json'},body:'{}',signal:controller.signal,cache:'no-store'});clearTimeout(timer);const payload=await response.json().catch(()=>({}));if(!response.ok){console.warn('[AFTERLIFE] SSO:',payload.error||`HTTP ${response.status}`);return false;}if(payload.access_token&&payload.refresh_token){const {data,error}=await aeriom.auth.setSession({access_token:payload.access_token,refresh_token:payload.refresh_token});if(!error&&data?.session?.user){localStorage.removeItem(HANDOFF_KEY);return true;}console.warn('[AFTERLIFE] SSO session:',error||'sessão não criada');}return false;}catch(error){console.warn('[AFTERLIFE] SSO bootstrap:',error);return false;}}
export async function ensureAfterlifeSession(){const current=await nativeGetSession();if(current.data?.session?.user)return current.data.session;await bootstrapFromPortal();return (await nativeGetSession()).data?.session||null;}
export const afterlifeReady=(readyPromise||=bootstrapFromPortal().catch(()=>false));
aeriom.auth.getSession=async(...args)=>{await afterlifeReady;return nativeGetSession(...args)};
aeriom.auth.getUser=async(...args)=>{await afterlifeReady;return nativeGetUser(...args)};
