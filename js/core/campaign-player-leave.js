import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  if (window.__AERIOM_PLAYER_LEAVE_BOOT__) return;
  window.__AERIOM_PLAYER_LEAVE_BOOT__ = true;

  const BUTTON_ID = "aeriom-player-leave-button";
  const CAMPAIGN_PARAM = "campaign";

  const $ = (selector, root = document) => root.querySelector(selector);

  function campaignId() {
    return new URLSearchParams(window.location.search).get(CAMPAIGN_PARAM)?.trim() || null;
  }

  function normalize(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function cleanupEscapedText() {
    if (!document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const remove = [];

    while (walker.nextNode()) {
      const value = walker.currentNode.nodeValue?.trim();
      if (value === "\\n" || value === "/n") remove.push(walker.currentNode);
    }

    remove.forEach(node => node.remove());
  }

  function scheduleCleanup() {
    [0, 120, 400, 900].forEach(delay => {
      window.setTimeout(cleanupEscapedText, delay);
    });
  }

  function currentContext() {
    try {
      return window.AERIOM_CAMPAIGN?.getContext?.() || {};
    } catch {
      return {};
    }
  }

  async function resolvePlayerRole(sb, cid) {
    const ctx = currentContext();
    const contextRole = normalize(ctx?.membership?.role || ctx?.role).toLowerCase();
    if (contextRole) return contextRole;

    const user = ctx?.user || (await sb.auth.getUser())?.data?.user;
    if (!user?.id) return null;

    const { data, error } = await sb
      .from("campaign_members")
      .select("role")
      .eq("campaign_id", cid)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return normalize(data?.role).toLowerCase() || null;
  }

  function clearCampaignStorage(cid) {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const keys = [];

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;

        if (key === "aeriom-current-campaign" || key.includes(cid)) {
          keys.push(key);
        }
      }

      keys.forEach(key => storage.removeItem(key));
    }
  }

  function findCampaignSidebar() {
    const candidates = Array.from(
      document.querySelectorAll("aside, nav, .campaign-sidebar, .campaign-side-nav, .sidebar")
    );

    return candidates
      .filter(element => element.id !== "aeriom-liquid-mobile-dock")
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0] || null;
  }

  function findCampaignsBackLink() {
    return Array.from(document.querySelectorAll("a, button"))
      .find(element => normalize(element.textContent).toLowerCase().includes("voltar para campanhas"));
  }

  function addStyles() {
    if ($("#aeriom-player-leave-style")) return;

    const style = document.createElement("style");
    style.id = "aeriom-player-leave-style";
    style.textContent = `
      #${BUTTON_ID} {
        width:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
        min-height:44px;
        margin-top:10px;
        padding:0 14px;
        border:1px solid rgba(150,90,90,.22);
        border-radius:12px;
        background:rgba(150,60,60,.05);
        color:rgba(220,170,170,.86);
        font:600 11px/1 Inter,system-ui,sans-serif;
        letter-spacing:.02em;
        cursor:pointer;
        transition:transform .18s ease,border-color .18s ease,background .18s ease,color .18s ease;
      }
      #${BUTTON_ID}:hover {
        transform:translateY(-1px);
        border-color:rgba(190,105,105,.44);
        background:rgba(170,65,65,.11);
        color:#f0caca;
      }
      #${BUTTON_ID}:disabled { opacity:.55; cursor:wait; transform:none; }
      #${BUTTON_ID} span:first-child { font-size:15px; }
    `;
    document.head.appendChild(style);
  }

  async function leaveCampaign(button, cid) {
    const confirmed = window.confirm(
      "Sair desta campanha? Seus personagens e os dados vinculados a esta campanha serão removidos. Sua conta do AERIOM continuará conectada."
    );
    if (!confirmed) return;

    button.disabled = true;
    button.classList.add("is-busy");
    button.querySelector(".campaign-player-leave__text").textContent = "Saindo…";

    try {
      const sb = await getSupabase();
      const { error } = await sb.rpc("leave_campaign", { p_campaign_id: cid });
      if (error) throw error;

      clearCampaignStorage(cid);
      window.location.replace("./campanhas.html");
    } catch (error) {
      console.error("[AERIOM][CAMPAIGN LEAVE]", error);
      button.disabled = false;
      button.classList.remove("is-busy");
      button.querySelector(".campaign-player-leave__text").textContent = "Sair da campanha";
      window.dispatchEvent(new CustomEvent("aerion:toast", {
        detail: {
          message: error?.message || "Não foi possível sair da campanha.",
          type: "error"
        }
      }));
    }
  }

  async function mount() {
    const cid = campaignId();
    if (!cid || $(`#${BUTTON_ID}`)) return;

    const sb = await getSupabase();
    const role = await resolvePlayerRole(sb, cid);
    if (role !== "player") return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = BUTTON_ID;
    button.className = "campaign-player-leave";
    button.title = "Sair da campanha";
    button.innerHTML = '<span aria-hidden="true">↪</span><span class="campaign-player-leave__text">Sair da campanha</span>';
    button.addEventListener("click", () => void leaveCampaign(button, cid));

    const back = findCampaignsBackLink();
    if (back?.parentElement) {
      back.parentElement.insertBefore(button, back);
      return;
    }

    const sidebar = findCampaignSidebar();
    if (sidebar) {
      sidebar.appendChild(button);
      return;
    }

    button.style.position = "fixed";
    button.style.left = "16px";
    button.style.bottom = "110px";
    button.style.width = "min(260px, calc(100vw - 32px))";
    button.style.zIndex = "80";
    document.body.appendChild(button);
  }

  async function start() {
    scheduleCleanup();
    addStyles();
    try {
      await mount();
    } catch (error) {
      console.warn("[AERIOM][CAMPAIGN LEAVE]", error);
    }
  }

  const run = () => window.setTimeout(() => void start(), 120);

  window.addEventListener("aeriom:campaign:ready", run);
  window.addEventListener("aeriom:campaigntabchange", run);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    run();
  }
})();
