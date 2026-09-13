import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  if (!location.pathname.endsWith("/campanha.html")) return;
  if (window.__aeriomCampaignProfileBooted) return;
  window.__aeriomCampaignProfileBooted = true;

  const $ = (selector) => document.querySelector(selector);
  const initial = (name) => String(name || "Aventureiro").trim().charAt(0).toUpperCase() || "A";

  function injectStyle() {
    if ($("#aeriom-campaign-profile-style")) return;
    const style = document.createElement("style");
    style.id = "aeriom-campaign-profile-style";
    style.textContent = `
      .aeriom-campaign-profile-wrap{position:relative;display:inline-flex;align-items:center;z-index:120}
      .aeriom-campaign-profile-trigger{display:inline-flex;align-items:center;gap:9px;min-height:40px;padding:5px 8px;border:1px solid rgba(190,177,151,.13);border-radius:10px;background:rgba(255,255,255,.018);color:#e3ddd2;cursor:pointer;font:600 11px Inter,system-ui,sans-serif}
      .aeriom-campaign-profile-trigger:hover{background:rgba(200,166,107,.055);border-color:rgba(183,150,91,.22)}
      .aeriom-campaign-profile-avatar{width:30px;height:30px;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 50% 25%,#6e6659,#191713 65%,#0a0907);border:1px solid rgba(220,202,165,.24);color:#f3eee3;font-weight:800}
      .aeriom-campaign-profile-avatar img{width:100%;height:100%;display:block;object-fit:cover}
      .aeriom-campaign-profile-copy{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
      .aeriom-campaign-profile-copy strong{max-width:130px;color:#f4f0e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-campaign-profile-copy small{margin-top:2px;color:#958d80;font-size:9px}
      .aeriom-campaign-profile-caret{color:#958d80;font-size:14px}
      .aeriom-campaign-profile-menu{position:absolute;right:0;top:calc(100% + 10px);width:300px;padding:10px;border:1px solid rgba(183,150,91,.22);border-radius:14px;background:rgba(12,10,8,.985);box-shadow:0 24px 70px rgba(0,0,0,.58);backdrop-filter:blur(18px);opacity:0;transform:translateY(-6px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}
      .aeriom-campaign-profile-wrap.is-open .aeriom-campaign-profile-menu{opacity:1;transform:none;pointer-events:auto}
      .aeriom-campaign-profile-head{display:flex;align-items:center;gap:11px;padding:9px 9px 13px;border-bottom:1px solid rgba(190,177,151,.13)}
      .aeriom-campaign-profile-large{width:48px;height:48px;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 50% 25%,#6e6659,#191713 65%,#0a0907);border:1px solid rgba(220,202,165,.24);color:#f3eee3;font-weight:800}
      .aeriom-campaign-profile-large img{width:100%;height:100%;display:block;object-fit:cover}
      .aeriom-campaign-profile-info{min-width:0;display:flex;flex-direction:column}
      .aeriom-campaign-profile-info strong{font-size:13px;color:#f4f0e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-campaign-profile-info small{margin-top:3px;color:#958d80;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .aeriom-campaign-profile-badge{display:inline-flex;align-items:center;gap:5px;margin-top:4px;color:#d7b77d;font-size:9px}
      .aeriom-campaign-profile-badge i{width:6px;height:6px;border-radius:50%;background:#d7b77d;box-shadow:0 0 9px rgba(215,183,125,.5)}
      .aeriom-campaign-profile-actions{display:grid;gap:4px;padding-top:8px}
      .aeriom-campaign-profile-actions a,.aeriom-campaign-profile-actions button{width:100%;padding:10px 9px;border:0;border-radius:9px;background:transparent;color:#e3ddd2;text-align:left;text-decoration:none;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}
      .aeriom-campaign-profile-actions a:hover,.aeriom-campaign-profile-actions button:hover{background:rgba(200,166,107,.07);color:#fff}
      .aeriom-campaign-profile-actions .danger{color:#e9aaa4}
      .aeriom-campaign-profile-actions .danger:hover{background:rgba(198,70,62,.08)}
      @media(max-width:700px){.aeriom-campaign-profile-menu{right:-4px;width:min(300px,calc(100vw - 28px))}.aeriom-campaign-profile-copy strong{max-width:92px}}
    `;
    document.head.appendChild(style);
  }

  function setAvatar(box, url, name) {
    if (!box) return;
    box.replaceChildren();
    if (!url) { box.textContent = initial(name); return; }
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => { box.replaceChildren(); box.textContent = initial(name); };
    box.appendChild(img);
  }

  async function loadProfile() {
    const sb = await getSupabase();
    const { data: auth } = await sb.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    let name = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Aventureiro";
    const { data } = await sb.from("profiles").select("display_name,avatar_path").eq("id", user.id).maybeSingle();
    if (data?.display_name) name = data.display_name;

    let avatarUrl = "";
    if (data?.avatar_path) {
      const signed = await sb.storage.from("avatars").createSignedUrl(data.avatar_path, 3600);
      avatarUrl = signed.data?.signedUrl || "";
    }

    setAvatar($("#aeriomCampaignProfileAvatar"), avatarUrl, name);
    setAvatar($("#aeriomCampaignProfileLarge"), avatarUrl, name);
    const nameA = $("#aeriomCampaignProfileName");
    const emailA = $("#aeriomCampaignProfileEmail");
    if (nameA) nameA.textContent = name;
    if (emailA) emailA.textContent = user.email || "Conta AERIOM";
  }

  function boot() {
    const target = $(".campaign-topbar__right");
    if (!target || $("#aeriomCampaignProfile")) return;
    injectStyle();

    const wrap = document.createElement("div");
    wrap.id = "aeriomCampaignProfile";
    wrap.className = "aeriom-campaign-profile-wrap";
    wrap.innerHTML = `
      <button type="button" class="aeriom-campaign-profile-trigger" id="aeriomCampaignProfileTrigger" aria-expanded="false" aria-label="Abrir perfil">
        <span class="aeriom-campaign-profile-avatar" id="aeriomCampaignProfileAvatar">A</span>
        <span class="aeriom-campaign-profile-copy"><strong id="aeriomCampaignProfileTriggerName">Aventureiro</strong><small>Online</small></span>
        <span class="aeriom-campaign-profile-caret">⌄</span>
      </button>
      <div class="aeriom-campaign-profile-menu" id="aeriomCampaignProfileMenu">
        <div class="aeriom-campaign-profile-head">
          <span class="aeriom-campaign-profile-large" id="aeriomCampaignProfileLarge">A</span>
          <div class="aeriom-campaign-profile-info">
            <strong id="aeriomCampaignProfileName">Aventureiro</strong>
            <small id="aeriomCampaignProfileEmail">Conta AERIOM</small>
            <span class="aeriom-campaign-profile-badge"><i></i> Conta compartilhada</span>
          </div>
        </div>
        <div class="aeriom-campaign-profile-actions">
          <a href="./index.html">Trocar sistema</a>
          <button type="button" class="danger" id="aeriomCampaignProfileLogout">Sair da conta</button>
        </div>
      </div>`;

    target.appendChild(wrap);

    const trigger = $("#aeriomCampaignProfileTrigger");
    const menu = $("#aeriomCampaignProfileMenu");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = wrap.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target)) {
        wrap.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        wrap.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    $("#aeriomCampaignProfileLogout")?.addEventListener("click", async () => {
      try {
        const sb = await getSupabase();
        await sb.auth.signOut();
      } finally {
        location.replace("./index.html");
      }
    });

    loadProfile().catch((error) => console.warn("[AERIOM] perfil da mesa:", error));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
