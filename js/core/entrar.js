import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const CONFIG = Object.freeze({ LOGIN_PAGE:"./index.html", CAMPAIGNS_PAGE:"./campanhas.html", CAMPAIGN_PAGE:"./campanha.html", CODE_LENGTH:5 });
  let supabase = null;
  let currentUser = null;
  let isJoining = false;
  let autoVerifyTimer = null;

  const $ = id => document.getElementById(id);
  const normalizeCode = value => String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const validCode = code => /^[A-Z0-9]{5}$/.test(code);

  function setMessage(message,type="info") { const el=$("join-message"); if(!el)return; el.textContent=message||""; el.dataset.type=type; }
  function setLoading(loading){ const b=$("join-submit"); if(!b)return; b.disabled=loading; b.classList.toggle("is-loading",loading); }
  function friendlyError(error){
    const raw=String(error?.message||""); const n=raw.toLowerCase();
    if(n.includes("expired")||n.includes("expir"))return "Esse convite expirou. Peça ao mestre um novo código.";
    if(n.includes("invalid")||n.includes("inválido")||n.includes("invalido")||n.includes("not found")||n.includes("não encontrado"))return "Esse código de convite não é válido.";
    if(n.includes("max")||n.includes("limit")||n.includes("uso")||n.includes("uses"))return "Esse convite não possui mais usos disponíveis.";
    if(n.includes("already")||n.includes("duplicate")||n.includes("unique")||n.includes("já está")||n.includes("ja esta"))return "Você já faz parte dessa campanha.";
    if(n.includes("permission")||n.includes("forbidden")||n.includes("row-level security")||n.includes("rls")||n.includes("403"))return "O banco recusou a entrada na campanha. Verifique sua sessão e tente novamente.";
    if(n.includes("jwt")||n.includes("auth")||n.includes("session"))return "Sua sessão não está válida. Entre novamente no AERIOM.";
    return raw || "Não foi possível entrar nessa campanha. Verifique o código e tente novamente.";
  }

  function installOtpUI(){
    if(document.getElementById("aeriom-otp-style"))return;
    const style=document.createElement("style"); style.id="aeriom-otp-style";
    style.textContent=`
      .aeriom-otp-shell{position:relative;margin:10px 0 16px;padding:24px 18px 20px;border:1px solid rgba(216,182,95,.14);border-radius:22px;background:radial-gradient(circle at 50% -30%,rgba(216,182,95,.09),transparent 48%),linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.008));overflow:hidden;isolation:isolate}
      .aeriom-otp-orbit{position:absolute;left:50%;top:18px;width:150px;height:150px;transform:translateX(-50%);border:1px solid rgba(216,182,95,.08);border-radius:50%;opacity:.36;pointer-events:none;animation:aeriom-orbit 8s linear infinite}
      .aeriom-otp-orbit:before,.aeriom-otp-orbit:after{content:"";position:absolute;inset:19px;border:1px dashed rgba(216,182,95,.10);border-radius:50%}
      .aeriom-otp-orbit:after{inset:48px;border-style:solid;border-color:rgba(255,255,255,.06)}
      .aeriom-otp-core{position:absolute;left:50%;top:93px;width:9px;height:9px;transform:translate(-50%,-50%);border-radius:50%;background:#e8c875;box-shadow:0 0 0 6px rgba(232,200,117,.07),0 0 20px rgba(232,200,117,.42);opacity:.85;pointer-events:none}
      .aeriom-otp-title{position:relative;z-index:1;text-align:center;margin:0 0 4px;color:#ece7dc;font:600 18px Cinzel,Georgia,serif}
      .aeriom-otp-subtitle{position:relative;z-index:1;margin:0 auto 18px;max-width:360px;text-align:center;color:rgba(255,255,255,.42);font-size:9px;line-height:1.5}
      .aeriom-otp-slots{position:relative;z-index:2;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;max-width:360px;margin:0 auto 13px}
      .aeriom-otp-slot{height:54px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.018);color:#eee;font:700 20px Inter,system-ui,sans-serif;transition:border-color .18s ease,box-shadow .22s ease,transform .3s cubic-bezier(.18,1.2,.32,1),background .2s ease}
      .aeriom-otp-slot.is-filled{border-color:rgba(216,182,95,.34);background:rgba(216,182,95,.05);box-shadow:0 0 18px rgba(216,182,95,.08);transform:translateY(-1px)}
      .aeriom-otp-slot.is-pulse{animation:aeriom-otp-pulse .42s ease}
      .aeriom-otp-shell.is-verifying .aeriom-otp-orbit{opacity:.9;animation-duration:2.2s}
      .aeriom-otp-shell.is-verifying .aeriom-otp-core{animation:aeriom-core-pulse .8s ease-in-out infinite}
      .aeriom-otp-status{position:relative;z-index:2;min-height:20px;text-align:center;color:rgba(255,255,255,.42);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .aeriom-otp-shell.is-success{border-color:rgba(145,191,124,.28);box-shadow:0 0 30px rgba(145,191,124,.08)}
      .aeriom-otp-shell.is-error{animation:aeriom-otp-shake .35s ease;border-color:rgba(200,121,121,.28)}
      @keyframes aeriom-orbit{to{transform:translateX(-50%) rotate(360deg)}}
      @keyframes aeriom-otp-pulse{50%{transform:translateY(-2px) scale(1.035);box-shadow:0 0 24px rgba(216,182,95,.18)}}
      @keyframes aeriom-core-pulse{50%{box-shadow:0 0 0 10px rgba(232,200,117,.05),0 0 28px rgba(232,200,117,.65)}}
      @keyframes aeriom-otp-shake{25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}
      @media(max-width:520px){.aeriom-otp-shell{padding-inline:12px}.aeriom-otp-slots{gap:6px}.aeriom-otp-slot{height:50px;font-size:18px}}
    `; document.head.appendChild(style);

    const input=$("campaign-invite-code-input");
    const inputGroup=input?.parentElement;
    const parent=inputGroup?.parentElement;
    if(!input||!inputGroup||!parent)return;
    if(document.getElementById("aeriom-otp-shell"))return;

    const shell=document.createElement("section");
    shell.id="aeriom-otp-shell";
    shell.className="aeriom-otp-shell";
    shell.setAttribute("aria-label","Verificação do convite");
    shell.innerHTML=`<div class="aeriom-otp-orbit"></div><div class="aeriom-otp-core"></div><h3 class="aeriom-otp-title">Verifique o convite</h3><p class="aeriom-otp-subtitle">Digite o código de 5 caracteres ou abra o link do mestre. O AERIOM confirma o acesso antes de entrar na mesa.</p><div class="aeriom-otp-slots" aria-hidden="true">${Array.from({length:5},()=>'<div class="aeriom-otp-slot"></div>').join("")}</div><div class="aeriom-otp-status" id="aeriom-otp-status">Aguardando código</div></section>`;

    /* O input não é filho direto do form. O bloco do campo é o nó correto para a inserção. */
    parent.insertBefore(shell,inputGroup);
  }

  function slots(){ return [...document.querySelectorAll("#aeriom-otp-shell .aeriom-otp-slot")]; }
  function animateCode(code){
    const shell=$("aeriom-otp-shell"); const status=$("aeriom-otp-status"); const list=slots(); if(!shell||!status)return;
    shell.classList.remove("is-error","is-success","is-verifying"); status.textContent=code.length===CONFIG.CODE_LENGTH?"Código completo":"Aguardando código";
    list.forEach((slot,i)=>{slot.textContent=code[i]||"";slot.classList.toggle("is-filled",!!code[i]);slot.classList.remove("is-pulse"); if(code[i])requestAnimationFrame(()=>slot.classList.add("is-pulse"));});
  }
  function startVerifying(){ const shell=$("aeriom-otp-shell");const status=$("aeriom-otp-status");if(!shell||!status)return;shell.classList.add("is-verifying");status.textContent="Verificando convite…"; }
  function finishVerify(ok){ const shell=$("aeriom-otp-shell");const status=$("aeriom-otp-status");if(!shell||!status)return;shell.classList.remove("is-verifying");shell.classList.toggle("is-success",ok);shell.classList.toggle("is-error",!ok);status.textContent=ok?"Convite confirmado":"Código recusado"; }

  function extractCode(value){
    const raw=String(value??"").trim();
    try{
      const url=new URL(raw,window.location.origin);
      const c=url.searchParams.get("code")||url.searchParams.get("invite")||url.searchParams.get("invite_code");
      if(c)return normalizeCode(c).replace(/[^A-Z0-9]/g,"").slice(0,CONFIG.CODE_LENGTH);
      if(url.hash){const h=new URLSearchParams(url.hash.replace(/^#/ ,""));const c2=h.get("code");if(c2)return normalizeCode(c2).replace(/[^A-Z0-9]/g,"").slice(0,CONFIG.CODE_LENGTH);}
    }catch{}
    return normalizeCode(raw).replace(/[^A-Z0-9]/g,"").slice(0,CONFIG.CODE_LENGTH);
  }
  function codeFromUrl(){ const p=new URLSearchParams(location.search);return normalizeCode(p.get("code")||p.get("invite")||p.get("invite_code")||"").replace(/[^A-Z0-9]/g,"").slice(0,CONFIG.CODE_LENGTH); }

  async function loadSession(){
    if(!supabase?.auth)throw new Error("O cliente de autenticação não está disponível.");
    const {data,error}=await supabase.auth.getSession();if(error)throw error;
    if(!data?.session?.user){window.location.replace(CONFIG.LOGIN_PAGE);return null;}
    currentUser=data.session.user;return currentUser;
  }

  function redirectToCampaign(campaignId){
    if(!campaignId){window.location.replace(CONFIG.CAMPAIGNS_PAGE);return;}
    const url=new URL(CONFIG.CAMPAIGN_PAGE,location.href);url.searchParams.set("campaign",String(campaignId));window.location.replace(url.href);
  }

  async function joinCampaign(code){
    if(isJoining)return;
    const normalized=normalizeCode(code);
    if(!validCode(normalized)){setMessage("Digite um código válido de 5 caracteres.","error");$("campaign-invite-code-input")?.focus();return;}
    if(!supabase){setMessage("O sistema ainda está inicializando. Tente novamente.","error");return;}
    if(!currentUser){window.location.replace(CONFIG.LOGIN_PAGE);return;}
    isJoining=true;setLoading(true);startVerifying();setMessage("");
    try{
      const {data,error}=await supabase.rpc("accept_campaign_invite",{p_invite_code:normalized});
      if(error)throw error;
      let result=Array.isArray(data)?data[0]:data;if(typeof result==="string")result={campaign_id:result};
      const campaignId=result?.campaign_id||result?.id||result?.campaignId||null;
      finishVerify(true);setMessage("Você entrou na campanha com sucesso.","success");
      window.setTimeout(()=>redirectToCampaign(campaignId),420);
    }catch(error){
      console.error("[AERIOM][JOIN]",error);finishVerify(false);setMessage(friendlyError(error),"error");
    }finally{isJoining=false;setLoading(false);}
  }

  function bindCodeInput(){
    const input=$("campaign-invite-code-input");if(!input)return;
    input.addEventListener("input",()=>{const code=extractCode(input.value);input.value=code;animateCode(code);clearTimeout(autoVerifyTimer);if(validCode(code))autoVerifyTimer=setTimeout(()=>{startVerifying();void joinCampaign(code)},420);});
    input.addEventListener("paste",event=>{const text=event.clipboardData?.getData("text")||"";const code=extractCode(text);if(code!==text.trim()){event.preventDefault();input.value=code;animateCode(code);if(validCode(code)){clearTimeout(autoVerifyTimer);autoVerifyTimer=setTimeout(()=>{startVerifying();void joinCampaign(code)},420);}}});
  }
  function bindForm(){ const form=$("join-campaign-form");if(!form)throw new Error("Formulário de entrada na campanha não encontrado.");form.addEventListener("submit",e=>{e.preventDefault();void joinCampaign($("campaign-invite-code-input")?.value||"")}); }
  function applyUrlCode(){ const code=codeFromUrl();if(!code)return;const input=$("campaign-invite-code-input");if(!input)return;input.value=code;animateCode(code);if(validCode(code)){clearTimeout(autoVerifyTimer);autoVerifyTimer=setTimeout(()=>void joinCampaign(code),650);} }
  function bindAuthListener(){supabase?.auth?.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"||!session?.user){window.location.replace(CONFIG.LOGIN_PAGE);return;}currentUser=session.user;});}

  async function init(){
    try{
      installOtpUI();
      supabase=await getSupabase();
      await loadSession();
      bindAuthListener();bindCodeInput();bindForm();applyUrlCode();
      const input=$("campaign-invite-code-input");input?.focus();
    }catch(error){console.error("[AERIOM][JOIN INIT]",error);setMessage(error?.message||"Não foi possível inicializar a entrada da campanha.","error");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else void init();
})();
