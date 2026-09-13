import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

const BUCKET = "avatars";
const MENU_ID = "aeriom-profile-menu";

const $ = (id) => document.getElementById(id);

function initial(name) {
  return String(name || "Aventureiro").trim().charAt(0).toUpperCase() || "?";
}

function safe(value) {
  return typeof value === "string" ? value : "";
}

async function avatarUrl(supabase, path) {
  if (!path) return "";
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicData?.publicUrl || "";
  } catch {
    return "";
  }
}

async function loadProfile(supabase, user) {
  const fallback = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Aventureiro";
  try {
    const { data } = await supabase.from("profiles").select("display_name,avatar_path").eq("id", user.id).maybeSingle();
    const name = data?.display_name || fallback;
    const path = data?.avatar_path || "";
    return { name, email: safe(user.email), avatarUrl: await avatarUrl(supabase, path) };
  } catch {
    return { name: fallback, email: safe(user.email), avatarUrl: "" };
  }
}

function makeAvatar(profile) {
  const avatar = document.createElement("span");
  avatar.className = "aeriom-profile-avatar";
  if (profile.avatarUrl) {
    const img = document.createElement("img");
    img.src = profile.avatarUrl;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => { avatar.textContent = initial(profile.name); };
    avatar.appendChild(img);
  } else {
    avatar.textContent = initial(profile.name);
  }
  return avatar;
}

async function boot() {
  const badge = $("campaigns-user-badge");
  if (!badge || document.getElementById(MENU_ID)) return;

  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await getSupabase();
  const profile = await loadProfile(supabase, user);

  const name = $("campaigns-user-name");
  const email = $("campaigns-user-email");
  const avatarTarget = $("campaigns-user-avatar");
  if (name) name.textContent = profile.name;
  if (email) email.textContent = profile.email;
  if (avatarTarget) {
    avatarTarget.replaceChildren();
    if (profile.avatarUrl) {
      const img = document.createElement("img");
      img.src = profile.avatarUrl;
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => { avatarTarget.textContent = initial(profile.name); };
      avatarTarget.appendChild(img);
    } else avatarTarget.textContent = initial(profile.name);
  }

  const wrap = document.createElement("div");
  wrap.className = "aeriom-profile-wrap";
  badge.parentNode.insertBefore(wrap, badge);
  wrap.appendChild(badge);

  const menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.className = "aeriom-profile-menu";
  menu.setAttribute("role", "menu");
  menu.appendChild((() => {
    const head = document.createElement("div");
    head.className = "aeriom-profile-head";
    const avatar = makeAvatar(profile);
    const copy = document.createElement("div");
    copy.className = "aeriom-profile-copy";
    const n = document.createElement("strong"); n.textContent = profile.name;
    const e = document.createElement("small"); e.textContent = profile.email;
    const b = document.createElement("span"); b.className = "aeriom-profile-badge"; b.innerHTML = "<i></i> Conta compartilhada";
    copy.append(n, e, b); head.append(avatar, copy); return head;
  })());

  const actions = document.createElement("div");
  actions.className = "aeriom-profile-actions";
  actions.innerHTML = '<a href="./perfil.html" role="menuitem">Editar perfil</a><a href="./index.html" role="menuitem">Trocar sistema</a><button type="button" class="danger" data-aeriom-logout>Sair da conta</button>';
  menu.appendChild(actions);
  wrap.appendChild(menu);

  badge.setAttribute("role", "button");
  badge.setAttribute("tabindex", "0");
  badge.setAttribute("aria-haspopup", "true");
  badge.setAttribute("aria-expanded", "false");
  badge.setAttribute("aria-label", "Abrir perfil");
  badge.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const open = wrap.classList.toggle("is-open");
    badge.setAttribute("aria-expanded", String(open));
  };
  badge.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); badge.click(); }
  };

  const close = () => { wrap.classList.remove("is-open"); badge.setAttribute("aria-expanded", "false"); };
  document.addEventListener("click", close, { passive: true });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  menu.addEventListener("click", (event) => event.stopPropagation());

  actions.querySelector("[data-aeriom-logout]")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.replace("./index.html");
  });
}

boot();