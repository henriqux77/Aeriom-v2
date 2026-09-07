import {
  getSupabase,
  normalizeSupabaseError
} from "./supabase.js";

const CONFIG = Object.freeze({
  LOGIN_PAGE: "./index.html",
  CAMPAIGN_PAGE: "./campanha.html",
  JOIN_PAGE: "./entrar.html",
  STORAGE_BUCKET: "campaign-covers",
  AVATAR_BUCKET: "avatars",
  MAX_NAME_LENGTH: 120,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_COVER_SIZE: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]),
  SIGNED_URL_SECONDS: 60 * 60,
  INVITE_DURATION_MINUTES: 5
});

const state = {
  supabase: null,
  user: null,
  profile: null,
  campaigns: [],
  selectedCampaign: null,
  selectedInvite: null,
  isLoading: false,
  isCreating: false,
  isGeneratingInvite: false,
  modal: null,
  inviteTimer: null,
  authSubscription: null,
  coverObjectUrl: null,
  editCoverObjectUrl: null,
  isEditing: false,
  searchQuery: "",
  filter: "all"
};

function $(id) {
  return document.getElementById(id);
}

function log(level, message, details = null) {
  const prefix = "[AERIOM][CAMPAIGNS]";

  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;

  fn(prefix, message, details ?? "");
}

function normalizeError(error, context) {
  try {
    return normalizeSupabaseError(error, context);
  } catch {
    return {
      message:
        error?.message ||
        "Erro desconhecido.",
      code:
        error?.code ||
        null,
      details:
        error?.details ||
        null,
      hint:
        error?.hint ||
        null,
      raw:
        error
    };
  }
}

function showToast(
  message,
  type = "info"
) {
  const region =
    $("aeriom-toast-region");

  if (!region) {
    return;
  }

  const toast =
    document.createElement("div");

  toast.className =
    "aeriom-toast";

  toast.dataset.type =
    type;

  toast.setAttribute(
    "role",
    "status"
  );

  toast.textContent =
    String(
      message ?? ""
    );

  region.appendChild(
    toast
  );

  window.setTimeout(
    () => toast.remove(),
    4000
  );
}

function hideStates() {
  [
    "campaigns-loading",
    "campaigns-empty",
    "campaigns-error",
    "campaigns-list-section"
  ].forEach(
    (id) => {

      const element =
        $(id);

      if (element) {
        element.hidden =
          true;
      }

    }
  );
}

function showLoading() {
  hideStates();

  const element =
    $("campaigns-loading");

  if (element) {
    element.hidden =
      false;
  }
}

function showEmpty() {
  hideStates();

  const element =
    $("campaigns-empty");

  if (element) {
    element.hidden =
      false;
  }
}

function showList() {
  hideStates();

  const element =
    $("campaigns-list-section");

  if (element) {
    element.hidden =
      false;
  }
}

function showError(
  message
) {
  hideStates();

  const messageElement =
    $("campaigns-error-message");

  if (messageElement) {
    messageElement.textContent =
      message ||
      "Não foi possível carregar suas campanhas.";
  }

  const errorElement =
    $("campaigns-error");

  if (errorElement) {
    errorElement.hidden =
      false;
  }
}

function safeString(
  value,
  fallback = ""
) {
  return typeof value === "string"
    ? value
    : fallback;
}

function safeNumber(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeArray(
  value
) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeObject(
  value
) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function parseJSON(
  value,
  fallback = null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value === "object"
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  try {
    return JSON.parse(
      value
    );
  } catch {
    return fallback;
  }
}

function formatDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        day:
          "2-digit",
        month:
          "short",
        year:
          "numeric"
      }
    ).format(
      date
    );
  } catch {
    return "";
  }
}

function isSafeImageUrl(
  value
) {
  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(
        value,
        window.location.href
      );

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function normalizeCampaign(
  row
) {
  if (
    !row ||
    typeof row !== "object"
  ) {
    return null;
  }

  const campaign =
    row.campaigns ||
    row.campaign ||
    row;

  if (
    !campaign?.id
  ) {
    return null;
  }

  return {
    id:
      String(
        campaign.id
      ),

    name:
      safeString(
        campaign.name,
        "Campanha sem nome"
      ),

    description:
      safeString(
        campaign.description
      ),

    coverPath:
      safeString(
        campaign.cover_path
      ),

    coverUrl:
      safeString(
        campaign.cover_url
      ),

    createdBy:
      campaign.created_by
        ? String(
            campaign.created_by
          )
        : null,

    theme:
      safeString(
        campaign.theme,
        "default"
      ),

    backgroundPath:
      safeString(
        campaign.background_path
      ),

    role:
      row.role === "master"
        ? "master"
        : "player",

    createdAt:
      campaign.created_at ||
      null,

    updatedAt:
      campaign.updated_at ||
      null
  };
}

function getUserDisplayName(
  user,
  profile = state.profile
) {
  const metadata =
    normalizeObject(
      user?.user_metadata
    );

  return (
    safeString(
      profile?.display_name
    ) ||

    safeString(
      metadata.display_name
    ) ||

    safeString(
      metadata.full_name
    ) ||

    safeString(
      metadata.name
    ) ||

    safeString(
      user?.email
        ?.split("@")[0]
    ) ||

    "Aventureiro"
  );
}

async function loadProfile() {
  if (
    !state.user
  ) {
    return null;
  }

  try {

    const {
      data,
      error
    } =
      await state.supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_path"
        )
        .eq(
          "id",
          state.user.id
        )
        .maybeSingle();

    if (error) {
      throw normalizeError(
        error,
        {
          file:
            "js/core/campanhas.js",

          function:
            "loadProfile",

          table:
            "profiles",

          operation:
            "select"
        }
      );
    }

    state.profile =
      data || null;

    return state.profile;

  } catch (error) {

    log(
      "warn",
      "Não foi possível carregar o perfil; usando dados do Auth.",
      error
    );

    state.profile =
      null;

    return null;
  }
}

async function resolveSignedUrl(
  bucket,
  path
) {
  if (!path) {
    return null;
  }

  try {

    const {
      data,
      error
    } =
      await state.supabase.storage
        .from(bucket)
        .createSignedUrl(
          path,
          CONFIG.SIGNED_URL_SECONDS
        );

    if (error) {
      throw error;
    }

    return (
      data?.signedUrl ||
      null
    );

  } catch (error) {

    log(
      "warn",
      `Falha ao gerar URL assinada para ${bucket}.`,
      error
    );

    return null;
  }
}

function renderAvatarInitial(
  container,
  name
) {
  container.replaceChildren();

  container.textContent =
    name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "?";
}

async function renderUser(
  user = state.user
) {
  if (!user) {
    return;
  }

  const name =
    getUserDisplayName(
      user
    );

  const email =
    safeString(
      user.email
    );

  const nameElement =
    $("campaigns-user-name");

  const emailElement =
    $("campaigns-user-email");

  const userBadge = $("campaigns-user-badge");
  userBadge?.setAttribute("role","button");
  userBadge?.setAttribute("tabindex","0");
  userBadge?.setAttribute("aria-label","Abrir perfil");
  userBadge?.addEventListener("click",()=>{ window.location.href="./perfil.html"; });
  userBadge?.addEventListener("keydown",(event)=>{ if(event.key==="Enter"||event.key===" "){ event.preventDefault(); window.location.href="./perfil.html"; } });

  const avatarElement =
    $("campaigns-user-avatar");

  if (nameElement) {
    nameElement.textContent =
      name;
  }

  if (emailElement) {
    emailElement.textContent =
      email;
  }

  if (!avatarElement) {
    return;
  }

  const avatarPath =
    safeString(
      state.profile?.avatar_path
    );

  const avatarUrl =
    avatarPath
      ? await resolveSignedUrl(
          CONFIG.AVATAR_BUCKET,
          avatarPath
        )
      : null;

  avatarElement.replaceChildren();

  if (
    avatarUrl &&
    isSafeImageUrl(
      avatarUrl
    )
  ) {

    const image =
      document.createElement(
        "img"
      );

    image.src =
      avatarUrl;

    image.alt =
      "";

    image.loading =
      "eager";

    image.referrerPolicy =
      "no-referrer";

    image.addEventListener(
      "error",
      () => {

        renderAvatarInitial(
          avatarElement,
          name
        );

      },
      {
        once:
          true
      }
    );

    avatarElement.appendChild(
      image
    );

  } else {

    renderAvatarInitial(
      avatarElement,
      name
    );

  }
}

async function loadSession() {

  if (
    !state.supabase?.auth
  ) {
    throw new Error(
      "Cliente Supabase/Auth não está disponível."
    );
  }

  const {
    data,
    error
  } =
    await state.supabase.auth
      .getSession();

  if (error) {

    throw normalizeError(
      error,
      {
        file:
          "js/core/campanhas.js",

        function:
          "loadSession",

        table:
          "auth",

        operation:
          "getSession"
      }
    );

  }

  const session =
    data?.session;

  if (
    !session?.user
  ) {

    window.location.replace(
      CONFIG.LOGIN_PAGE
    );

    return null;
  }

  state.user =
    session.user;

  await loadProfile();

  await renderUser();

  return state.user;
}

async function loadCampaigns() {

  if (
    !state.user ||
    !state.supabase
  ) {
    return;
  }

  if (
    state.isLoading
  ) {
    return;
  }

  state.isLoading =
    true;

  showLoading();

  try {

    const {
      data,
      error
    } =
      await state.supabase
        .from(
          "campaign_members"
        )
        .select(
          `
            id,
            campaign_id,
            role,
            created_at,
            campaigns (
              id,
              name,
              description,
              cover_path,
              cover_url,
              created_by,
              theme,
              background_path,
              created_at,
              updated_at
            )
          `
        )
        .eq(
          "user_id",
          state.user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false
          }
        );

    if (error) {

      throw normalizeError(
        error,
        {
          file:
            "js/core/campanhas.js",

          function:
            "loadCampaigns",

          table:
            "campaign_members",

          operation:
            "select"
        }
      );

    }

    const rows =
      normalizeArray(
        data
      );

    const normalized =
      rows
        .map(
          normalizeCampaign
        )
        .filter(
          Boolean
        );

    const resolved =
      await Promise.all(
        normalized.map(
          async (
            campaign
          ) => {

            if (
              !campaign.coverUrl &&
              campaign.coverPath
            ) {

              campaign.coverUrl =
                await resolveSignedUrl(
                  CONFIG.STORAGE_BUCKET,
                  campaign.coverPath
                );

            }

            return campaign;
          }
        )
      );

    state.campaigns =
      resolved;

    renderCampaigns();

  } catch (error) {

    log(
      "error",
      "Falha ao carregar campanhas.",
      error
    );

    state.campaigns =
      [];

    showError(
      "Não foi possível carregar suas campanhas. Tente novamente."
    );

  } finally {

    state.isLoading =
      false;

  }
}

function appendCoverSymbol(
  container
) {
  const symbol =
    document.createElement(
      "span"
    );

  symbol.className =
    "campaign-card__cover-symbol";

  symbol.setAttribute(
    "aria-hidden",
    "true"
  );

  symbol.textContent =
    "✦";

  container.appendChild(
    symbol
  );
}

function createCampaignCard(campaign) {
  const article = document.createElement("article");
  article.className = "campaign-card";
  article.dataset.campaignId = campaign.id;

  const cover = document.createElement("div");
  cover.className = "campaign-card__cover";
  if (isSafeImageUrl(campaign.coverUrl)) {
    const image = document.createElement("img");
    image.className = "campaign-card__image";
    image.src = campaign.coverUrl;
    image.alt = `Capa da campanha ${campaign.name}`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      image.remove();
      cover.classList.add("campaign-card__cover--empty");
      appendCoverSymbol(cover);
    }, {once:true});
    cover.appendChild(image);
  } else {
    cover.classList.add("campaign-card__cover--empty");
    appendCoverSymbol(cover);
  }

  const content = document.createElement("div");
  content.className = "campaign-card__content";

  const head = document.createElement("div");
  head.className = "campaign-card__head";

  const role = document.createElement("span");
  role.className = "campaign-card__role";
  role.textContent = campaign.role === "master" ? "Mestre" : "Aventureiro";

  const updated = document.createElement("span");
  updated.className = "campaign-card__updated";
  updated.textContent = campaign.updatedAt
    ? `Atualizada ${formatDate(campaign.updatedAt)}`
    : `Criada ${formatDate(campaign.createdAt)}`;

  head.append(role, updated);

  const title = document.createElement("h3");
  title.className = "campaign-card__title";
  title.textContent = campaign.name;

  const description = document.createElement("p");
  description.className = "campaign-card__description";
  description.textContent = campaign.description || "Sem descrição. Abra a campanha para começar.";

  const footer = document.createElement("div");
  footer.className = "campaign-card__footer";

  const details = document.createElement("div");
  details.className = "campaign-card__details";
  const detail = document.createElement("span");
  detail.textContent = campaign.role === "master" ? "Campanha que você conduz" : "Você participa desta campanha";
  details.appendChild(detail);

  const actions = document.createElement("div");
  actions.className = "campaign-card__actions";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "button button--primary campaign-card__open";
  openButton.textContent = "Abrir";
  openButton.addEventListener("click", () => openCampaign(campaign.id));

  actions.appendChild(openButton);

  if (campaign.role === "master") {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button--secondary campaign-card__edit";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openEditCampaignModal(campaign));
    actions.appendChild(editButton);
  }

  footer.append(details, actions);
  content.append(head, title, description, footer);
  article.append(cover, content);
  return article;
}

function getFilteredCampaigns() {
  const query = state.searchQuery.trim().toLowerCase();
  let list = [...state.campaigns];

  if (state.filter === "master") list = list.filter((campaign) => campaign.role === "master");
  if (state.filter === "player") list = list.filter((campaign) => campaign.role === "player");

  if (state.filter === "recent") {
    list.sort((a,b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    list = list.slice(0, 5);
  }

  if (!query) return list;

  return list.filter((campaign) =>
    [campaign.name, campaign.description, campaign.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function renderCampaigns() {
  const list = $("campaigns-list");
  const count = $("campaigns-count");
  const clear = $("campaigns-clear-search");
  if (!list) return;

  const filtered = getFilteredCampaigns();
  list.replaceChildren();

  if (count) {
    count.textContent = filtered.length === 1 ? "1 campanha" : `${filtered.length} campanhas`;
  }
  if (clear) clear.hidden = !state.searchQuery;

  if (!state.campaigns.length) {
    showEmpty();
    return;
  }

  if (!filtered.length) {
    list.innerHTML = `
      <div class="campaigns-state campaigns-state--empty campaigns-state--inline">
        <div class="campaigns-state__ornament" aria-hidden="true">⌕</div>
        <p class="campaigns-state__eyebrow">Busca</p>
        <h3>Nenhuma campanha encontrada.</h3>
        <p>Tente outro nome ou trecho da descrição.</p>
      </div>
    `;
    showList();
    return;
  }

  filtered.forEach((campaign) => list.appendChild(createCampaignCard(campaign)));
  showList();
}

function openCampaign(
  campaignId
) {

  const id =
    safeString(
      campaignId
    );

  if (!id) {
    return;
  }

  const campaign =
    state.campaigns.find(
      (
        item
      ) =>
        item.id === id
    );

  if (!campaign) {

    showToast(
      "Campanha não encontrada.",
      "error"
    );

    return;
  }

  state.selectedCampaign =
    campaign;

  /*
   * A autorização real continua no Supabase.
   *
   * Este redirecionamento apenas transporta o ID.
   */

  const url =
    new URL(
      CONFIG.CAMPAIGN_PAGE,
      window.location.href
    );

  url.searchParams.set(
    "campaign",
    id
  );

  window.location.assign(
    url.href
  );
}


function clearEditCoverPreview() {
  if (state.editCoverObjectUrl) {
    URL.revokeObjectURL(state.editCoverObjectUrl);
    state.editCoverObjectUrl = null;
  }
  const preview = $("campaign-edit-cover-preview");
  if (!preview) return;
  preview.replaceChildren();
  const placeholder = document.createElement("span");
  placeholder.className = "campaign-cover-upload__placeholder";
  placeholder.setAttribute("aria-hidden","true");
  placeholder.textContent = "✦";
  preview.appendChild(placeholder);
}

function previewEditCover(file) {
  clearEditCoverPreview();
  const preview = $("campaign-edit-cover-preview");
  if (!preview || !file) return;
  state.editCoverObjectUrl = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.src = state.editCoverObjectUrl;
  image.alt = "";
  image.setAttribute("aria-hidden","true");
  preview.replaceChildren(image);
}

async function openEditCampaignModal(campaign) {
  if (!campaign || campaign.role !== "master") {
    showToast("Somente o Mestre pode editar esta campanha.", "error");
    return;
  }
  state.selectedCampaign = campaign;
  const modal = $("campaign-edit-modal");
  const name = $("campaign-edit-name");
  const description = $("campaign-edit-description");
  const errorMessage = $("campaign-edit-message");
  if (!modal || !name || !description) return;

  name.value = campaign.name || "";
  description.value = campaign.description || "";
  ["campaign-edit-name-error","campaign-edit-description-error","campaign-edit-cover-error"].forEach(id => { const e=$(id); if(e)e.textContent=""; });
  if(errorMessage){errorMessage.hidden=true;errorMessage.textContent="";}
  clearEditCoverPreview();

  if (campaign.coverUrl) {
    const image = document.createElement("img");
    image.src = campaign.coverUrl;
    image.alt = "";
    image.loading = "eager";
    image.addEventListener("error", clearEditCoverPreview, {once:true});
    $("campaign-edit-cover-preview")?.replaceChildren(image);
  } else {
    const resolved = campaign.coverPath ? await resolveSignedUrl(CONFIG.STORAGE_BUCKET,campaign.coverPath) : null;
    if (resolved) {
      const image=document.createElement("img");
      image.src=resolved;
      image.alt="";
      image.loading="eager";
      $("campaign-edit-cover-preview")?.replaceChildren(image);
    }
  }

  modal.hidden = false;
  modal.setAttribute("aria-hidden","false");
  state.modal = "edit";
  window.setTimeout(() => name.focus(), 0);
}

function closeEditCampaignModal() {
  const modal = $("campaign-edit-modal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden","true");
  }
  clearEditCoverPreview();
  state.modal = null;
  state.selectedCampaign = null;
}

function setEditButtonLoading(loading) {
  const button=$("campaign-edit-submit");
  if(!button)return;
  button.disabled=loading;
  button.querySelector(".button__label")?.toggleAttribute("hidden",loading);
  button.querySelector(".button__loading")?.toggleAttribute("hidden",!loading);
}

function getEditValues() {
  return {
    name: safeString($("campaign-edit-name")?.value).trim(),
    description: safeString($("campaign-edit-description")?.value).trim(),
    cover: $("campaign-edit-cover")?.files?.[0] || null
  };
}

function validateEditValues(values) {
  let valid=true;
  const ne=$("campaign-edit-name-error"), de=$("campaign-edit-description-error"), ce=$("campaign-edit-cover-error");
  [ne,de,ce].forEach(e=>{if(e)e.textContent="";});
  if(values.name.length<1||values.name.length>CONFIG.MAX_NAME_LENGTH){valid=false;if(ne)ne.textContent=`O nome deve possuir entre 1 e ${CONFIG.MAX_NAME_LENGTH} caracteres.`;}
  if(values.description.length>CONFIG.MAX_DESCRIPTION_LENGTH){valid=false;if(de)de.textContent=`A descrição pode possuir no máximo ${CONFIG.MAX_DESCRIPTION_LENGTH} caracteres.`;}
  if(values.cover){try{validateCover(values.cover);}catch(error){valid=false;if(ce)ce.textContent=error.message;}}
  return valid;
}

async function saveCampaignEdits(event) {
  event?.preventDefault?.();
  if(state.isEditing)return;
  const campaign=state.selectedCampaign;
  if(!campaign||campaign.role!=="master"){showToast("Somente o Mestre pode editar esta campanha.","error");return;}
  const values=getEditValues();
  if(!validateEditValues(values))return;
  state.isEditing=true;
  setEditButtonLoading(true);
  try{
    const payload={name:values.name,description:values.description||null,updated_at:new Date().toISOString()};
    const {data,error}=await state.supabase.from("campaigns").update(payload).eq("id",campaign.id).select("id,name,description,cover_path,cover_url,created_by,theme,background_path,created_at,updated_at").maybeSingle();
    if(error)throw normalizeError(error,{file:"js/core/campanhas.js",function:"saveCampaignEdits",table:"campaigns",operation:"update"});
    let updated=data||{};
    if(values.cover){
      const path=await uploadCampaignCover(campaign.id,values.cover);
      await updateCampaignCoverPath(campaign.id,path);
      updated={...updated,cover_path:path,cover_url:null};
    }
    const index=state.campaigns.findIndex(item=>item.id===campaign.id);
    const merged={...campaign,...updated,role:"master",coverPath:updated.cover_path||campaign.coverPath||"",coverUrl:updated.cover_url||"",name:updated.name||values.name,description:updated.description||values.description,updatedAt:updated.updated_at||new Date().toISOString()};
    if(index>=0)state.campaigns.splice(index,1,merged);
    closeEditCampaignModal();
    renderCampaigns();
    showToast("Campanha atualizada com sucesso.","success");
  }catch(error){
    log("error","Erro ao editar campanha.",error);
    const msg=error?.message||"Não foi possível salvar as alterações.";
    const el=$("campaign-edit-message"); if(el){el.hidden=false;el.dataset.type="error";el.textContent=msg;}
    showToast(msg,"error");
  }finally{state.isEditing=false;setEditButtonLoading(false);}
}

function openCreateCampaignModal() {

  const modal =
    $("campaign-create-modal");

  if (!modal) {
    return;
  }

  clearCreateForm();

  modal.hidden =
    false;

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  state.modal =
    "create";

  window.setTimeout(
    () =>
      $("campaign-name")?.focus(),
    0
  );
}

function closeCreateCampaignModal() {

  const modal =
    $("campaign-create-modal");

  if (modal) {

    modal.hidden =
      true;

    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  state.modal =
    null;

  clearCoverPreview();
}

function clearCreateForm() {

  const form =
    $("campaign-create-form");

  if (form) {
    form.reset();
  }

  [
    "campaign-name-error",
    "campaign-description-error",
    "campaign-cover-error"
  ].forEach(
    (id) => {

      const element =
        $(id);

      if (element) {
        element.textContent =
          "";
      }

    }
  );

  const message =
    $("campaign-create-message");

  if (message) {

    message.hidden =
      true;

    message.textContent =
      "";
  }

  clearCoverPreview();
}

function setCreateMessage(
  message,
  type = "error"
) {

  const element =
    $("campaign-create-message");

  if (!element) {
    return;
  }

  element.textContent =
    String(
      message ?? ""
    );

  element.dataset.type =
    type;

  element.hidden =
    !message;
}

function validateCover(
  file
) {

  if (!file) {
    return;
  }

  if (
    !CONFIG.ALLOWED_IMAGE_TYPES.includes(
      file.type
    )
  ) {

    throw new Error(
      "A capa precisa ser JPG, PNG ou WebP."
    );
  }

  if (
    file.size >
    CONFIG.MAX_COVER_SIZE
  ) {

    throw new Error(
      "A capa não pode ultrapassar 5 MB."
    );
  }
}

function clearCoverPreview() {

  if (state.editCoverObjectUrl) {
    URL.revokeObjectURL(state.editCoverObjectUrl);
    state.editCoverObjectUrl = null;
  }

  if (
    state.coverObjectUrl
  )

    URL.revokeObjectURL(
      state.coverObjectUrl
    );

    state.coverObjectUrl =
      null;
  }

  const preview =
    $("campaign-cover-preview");

  if (!preview) {
    return;
  }

  preview.replaceChildren();

  const placeholder =
    document.createElement(
      "span"
    );

  placeholder.className =
    "campaign-cover-upload__placeholder";

  placeholder.setAttribute(
    "aria-hidden",
    "true"
  );

  placeholder.textContent =
    "✦";

  preview.appendChild(
    placeholder
  );
}

function previewCover(
  file
) {

  clearCoverPreview();

  const preview =
    $("campaign-cover-preview");

  if (!preview) {
    return;
  }

  state.coverObjectUrl =
    URL.createObjectURL(
      file
    );

  const image =
    document.createElement(
      "img"
    );

  image.src =
    state.coverObjectUrl;

  image.alt =
    "";

  image.setAttribute(
    "aria-hidden",
    "true"
  );

  preview.replaceChildren(
    image
  );
}

function setCreateButtonLoading(
  loading
) {

  const button =
    $("campaign-create-submit");

  if (!button) {
    return;
  }

  button.disabled =
    loading;

  const label =
    button.querySelector(
      ".button__label"
    );

  const loadingLabel =
    button.querySelector(
      ".button__loading"
    );

  if (label) {
    label.hidden =
      loading;
  }

  if (loadingLabel) {
    loadingLabel.hidden =
      !loading;
  }
}

function getCreateFormValues() {

  const nameInput =
    $("campaign-name");

  const descriptionInput =
    $("campaign-description");

  const coverInput =
    $("campaign-cover");

  const name =
    safeString(
      nameInput?.value
    ).trim();

  const description =
    safeString(
      descriptionInput?.value
    ).trim();

  const cover =
    coverInput?.files?.[0] ||
    null;

  return {
    name,
    description,
    cover
  };
}

function validateCreateForm(
  values
) {

  let valid =
    true;

  const nameError =
    $("campaign-name-error");

  const descriptionError =
    $("campaign-description-error");

  const coverError =
    $("campaign-cover-error");


  if (nameError) {
    nameError.textContent =
      "";
  }

  if (descriptionError) {
    descriptionError.textContent =
      "";
  }

  if (coverError) {
    coverError.textContent =
      "";
  }


  if (
    values.name.length < 1 ||
    values.name.length >
      CONFIG.MAX_NAME_LENGTH
  ) {

    valid =
      false;

    if (nameError) {

      nameError.textContent =
        `O nome deve possuir entre 1 e ${CONFIG.MAX_NAME_LENGTH} caracteres.`;
    }
  }


  if (
    values.description.length >
    CONFIG.MAX_DESCRIPTION_LENGTH
  ) {

    valid =
      false;

    if (descriptionError) {

      descriptionError.textContent =
        `A descrição pode possuir no máximo ${CONFIG.MAX_DESCRIPTION_LENGTH} caracteres.`;
    }
  }


  if (values.cover) {

    try {

      validateCover(
        values.cover
      );

    } catch (
      error
    ) {

      valid =
        false;

      if (coverError) {

        coverError.textContent =
          error.message;
      }
    }
  }


  return valid;
}

function getCampaignCoverPath(
  campaignId,
  file
) {

  const extensionMap =
    Object.freeze({

      "image/jpeg":
        "jpg",

      "image/png":
        "png",

      "image/webp":
        "webp"

    });

  const extension =
    extensionMap[
      file.type
    ] ||
    "bin";

  return `${campaignId}/cover.${extension}`;
}

async function uploadCampaignCover(
  campaignId,
  file
) {

  if (!file) {
    return null;
  }

  validateCover(
    file
  );

  const path =
    getCampaignCoverPath(
      campaignId,
      file
    );

  const {
    error
  } =
    await state.supabase.storage
      .from(
        CONFIG.STORAGE_BUCKET
      )
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",

          contentType:
            file.type,

          upsert:
            true
        }
      );

  if (error) {

    throw normalizeError(
      error,
      {
        file:
          "js/core/campanhas.js",

        function:
          "uploadCampaignCover",

        table:
          "storage.objects",

        operation:
          "upload"
      }
    );
  }

  return path;
}

async function updateCampaignCoverPath(
  campaignId,
  coverPath
) {

  const {
    error
  } =
    await state.supabase
      .from(
        "campaigns"
      )
      .update({
        cover_path:
          coverPath,

        cover_url:
          null,

        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        campaignId
      );

  if (error) {

    throw normalizeError(
      error,
      {
        file:
          "js/core/campanhas.js",

        function:
          "updateCampaignCoverPath",

        table:
          "campaigns",

        operation:
          "update"
      }
    );
  }
}

async function createCampaign(
  event
) {

  event?.preventDefault?.();

  if (
    state.isCreating
  ) {
    return null;
  }

  if (
    !state.supabase
  ) {

    showToast(
      "O Supabase ainda não está disponível.",
      "error"
    );

    return null;
  }

  if (
    !state.user
  ) {

    showToast(
      "Sua sessão expirou. Entre novamente.",
      "error"
    );

    window.location.replace(
      CONFIG.LOGIN_PAGE
    );

    return null;
  }


  const values =
    getCreateFormValues();

  if (
    !validateCreateForm(
      values
    )
  ) {
    return null;
  }


  state.isCreating =
    true;

  setCreateButtonLoading(
    true
  );

  setCreateMessage(
    ""
  );


  try {

    /*
     * O user_id NÃO é enviado pelo frontend.
     *
     * A função SQL usa auth.uid().
     */

    const {
      data,
      error
    } =
      await state.supabase.rpc(
        "create_campaign",
        {
          p_name:
            values.name,

          p_description:
            values.description ||
            null,

          p_cover_path:
            null
        }
      );

    if (error) {

      throw normalizeError(
        error,
        {
          file:
            "js/core/campanhas.js",

          function:
            "createCampaign",

          table:
            "campaigns",

          operation:
            "rpc:create_campaign"
        }
      );
    }


    const campaign =
      Array.isArray(data)
        ? data[0]
        : data;


    if (
      !campaign?.id
    ) {

      throw new Error(
        "O Supabase não retornou a campanha criada."
      );
    }


    const campaignId =
      String(
        campaign.id
      );


    /*
     * A campanha já foi criada pelo RPC.
     *
     * Agora, opcionalmente, enviamos a capa.
     */

    if (
      values.cover
    ) {

      const coverPath =
        await uploadCampaignCover(
          campaignId,
          values.cover
        );


      await updateCampaignCoverPath(
        campaignId,
        coverPath
      );
    }


    closeCreateCampaignModal();

    showToast(
      "Campanha criada com sucesso.",
      "success"
    );


    await loadCampaigns();


    const createdCampaign =
      state.campaigns.find(
        (
          item
        ) =>
          item.id ===
          campaignId
      );


    if (
      createdCampaign
    ) {

      state.selectedCampaign =
        createdCampaign;

      await generateInvite(
        campaignId,
        {
          openModal:
            true
        }
      );

    } else {

      showToast(
        "A campanha foi criada, mas não apareceu na lista imediatamente.",
        "warn"
      );
    }


    return campaign;


  } catch (error) {

    log(
      "error",
      "Erro ao criar campanha.",
      error
    );


    const message =
      error?.message ||
      "Não foi possível criar a campanha.";


    setCreateMessage(
      message,
      "error"
    );

    showToast(
      message,
      "error"
    );


    return null;


  } finally {

    state.isCreating =
      false;

    setCreateButtonLoading(
      false
    );

  }
}

async function generateInvite(
  campaignId,
  options = {}
) {

  const {
    openModal =
      true
  } =
    options;


  if (
    state.isGeneratingInvite
  ) {
    return null;
  }

  if (
    !state.user ||
    !state.supabase
  ) {

    showToast(
      "Sessão indisponível.",
      "error"
    );

    return null;
  }


  const id =
    safeString(
      campaignId
    );

  if (!id) {
    return null;
  }


  state.isGeneratingInvite =
    true;


  try {

    const {
      data,
      error
    } =
      await state.supabase.rpc(
        "generate_campaign_invite",
        {
          p_campaign_id:
            id,

          p_max_uses:
            10
        }
      );


    if (error) {

      throw normalizeError(
        error,
        {
          file:
            "js/core/campanhas.js",

          function:
            "generateInvite",

          table:
            "campaign_invites",

          operation:
            "rpc:generate_campaign_invite"
        }
      );
    }


    const invite =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    if (
      !invite?.invite_code
    ) {

      throw new Error(
        "O banco não retornou o código do convite."
      );
    }


    state.selectedCampaign =
      state.campaigns.find(
        (
          campaign
        ) =>
          campaign.id === id
      ) ||
      state.selectedCampaign;


    state.selectedInvite =
      invite;


    renderInvite(
      invite
    );


    if (
      openModal
    ) {

      openInviteModal();

    }


    return invite;


  } catch (error) {

    log(
      "error",
      "Erro ao gerar convite.",
      error
    );


    showToast(
      error?.message ||
      "Não foi possível gerar o convite.",
      "error"
    );


    return null;


  } finally {

    state.isGeneratingInvite =
      false;

  }
}

function stopInviteTimer() {

  if (
    state.inviteTimer
  ) {

    window.clearInterval(
      state.inviteTimer
    );

    state.inviteTimer =
      null;
  }
}

function renderInvite(
  invite
) {

  if (!invite) {
    return;
  }


  stopInviteTimer();


  const code =
    safeString(
      invite.invite_code ||
      invite.code ||
      invite.token
    );


  const codeElement =
    $("campaign-invite-code");


  if (codeElement) {

    codeElement.textContent =
      code ||
      "-----";
  }


  const campaignName =
    $("campaign-invite-campaign-name");


  if (campaignName) {

    campaignName.textContent =
      state.selectedCampaign?.name ||
      "";
  }


  const linkInput =
    $("campaign-invite-link");


  if (
    linkInput &&
    code
  ) {

    const url =
      new URL(
        CONFIG.JOIN_PAGE,
        window.location.href
      );


    url.searchParams.set(
      "code",
      code
    );


    linkInput.value =
      url.toString();
  }


  const expiresAt =
    invite.expires_at
      ? new Date(
          invite.expires_at
        ).getTime()
      : NaN;


  const expiration =
    $("campaign-invite-expiration");


  const updateExpiration =
    () => {

      if (!expiration) {
        return;
      }


      const remaining =
        expiresAt -
        Date.now();


      if (
        !Number.isFinite(
          remaining
        ) ||
        remaining <= 0
      ) {

        expiration.textContent =
          "Convite expirado.";

        stopInviteTimer();

        return;
      }


      const totalSeconds =
        Math.ceil(
          remaining /
          1000
        );


      const minutes =
        Math.floor(
          totalSeconds /
          60
        );


      const seconds =
        totalSeconds %
        60;


      expiration.textContent =
        `Expira em ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };


  updateExpiration();


  if (
    Number.isFinite(
      expiresAt
    )
  ) {

    state.inviteTimer =
      window.setInterval(
        updateExpiration,
        1000
      );
  }


  renderInviteQr(
    linkInput?.value ||
    ""
  );
}

function renderInviteQr(
  value
) {

  const container =
    $("campaign-invite-qr");

  if (!container) {
    return;
  }


  container.replaceChildren();


  /*
   * O QR visual definitivo será conectado ao módulo
   * de QR Code sem inserir HTML externo.
   *
   * Por enquanto mantemos um estado visual seguro.
   */

  const placeholder =
    document.createElement(
      "div"
    );

  placeholder.className =
    "campaign-invite__qr-placeholder";

  placeholder.textContent =
    value
      ? "QR"
      : "QR";


  container.appendChild(
    placeholder
  );
}

function openInviteModal() {

  const modal =
    $("campaign-invite-modal");

  if (!modal) {
    return;
  }


  modal.hidden =
    false;


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  state.modal =
    "invite";
}

function closeInviteModal() {

  const modal =
    $("campaign-invite-modal");


  if (modal) {

    modal.hidden =
      true;

    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  state.modal =
    null;

  state.selectedInvite =
    null;

  stopInviteTimer();
}

async function copyText(
  value,
  successMessage
) {

  if (!value) {

    showToast(
      "Não há conteúdo para copiar.",
      "error"
    );

    return;
  }


  try {

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText ===
        "function"
    ) {

      await navigator.clipboard.writeText(
        String(value)
      );

    } else {

      throw new Error(
        "Clipboard API indisponível."
      );

    }


    showToast(
      successMessage,
      "success"
    );


  } catch {

    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      String(value);

    textarea.setAttribute(
      "readonly",
      ""
    );

    textarea.style.position =
      "fixed";

    textarea.style.opacity =
      "0";

    textarea.style.pointerEvents =
      "none";


    document.body.appendChild(
      textarea
    );


    textarea.select();


    try {

      const copied =
        document.execCommand(
          "copy"
        );


      if (!copied) {
        throw new Error(
          "Falha ao copiar."
        );
      }


      showToast(
        successMessage,
        "success"
      );


    } catch {

      showToast(
        "Não foi possível copiar automaticamente.",
        "error"
      );


    } finally {

      textarea.remove();

    }
  }
}

async function copyInviteCode() {

  await copyText(
    $(
      "campaign-invite-code"
    )
      ?.textContent
      ?.trim(),

    "Código copiado."
  );
}

async function copyInviteLink() {

  await copyText(
    $(
      "campaign-invite-link"
    )
      ?.value
      ?.trim(),

    "Link do convite copiado."
  );
}

async function shareInvite() {

  const link =
    $(
      "campaign-invite-link"
    )
      ?.value
      ?.trim();


  const code =
    $(
      "campaign-invite-code"
    )
      ?.textContent
      ?.trim();


  if (!link) {

    showToast(
      "Convite indisponível.",
      "error"
    );

    return;
  }


  const title =
    state.selectedCampaign?.name
      ? `Convite para ${state.selectedCampaign.name}`
      : "Convite AERIOM";


  const text =
    code
      ? `Entre na minha campanha AERIOM usando o código ${code}.`
      : "Você foi convidado para uma campanha no AERIOM.";


  try {

    if (
      typeof navigator.share ===
      "function"
    ) {

      await navigator.share(
        {
          title,
          text,
          url:
            link
        }
      );

      return;
    }


    await copyInviteLink();


  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }


    log(
      "warn",
      "Falha ao compartilhar convite.",
      error
    );


    await copyInviteLink();

  }
}

async function handleLogout() {

  const button =
    $("campaigns-logout-button");


  if (button) {
    button.disabled =
      true;
  }


  try {

    const {
      error
    } =
      await state.supabase.auth
        .signOut();


    if (error) {

      throw normalizeError(
        error,
        {
          file:
            "js/core/campanhas.js",

          function:
            "handleLogout",

          table:
            "auth",

          operation:
            "signOut"
        }
      );
    }


    window.location.replace(
      CONFIG.LOGIN_PAGE
    );


  } catch (error) {

    log(
      "error",
      "Erro ao sair.",
      error
    );


    showToast(
      "Não foi possível sair agora.",
      "error"
    );


    if (button) {
      button.disabled =
        false;
    }
  }
}

function bindEvents() {

  document.querySelectorAll("[data-campaign-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.campaignFilter || "all";
      document.querySelectorAll("[data-campaign-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderCampaigns();
    });
  });

  const searchInput = $("campaigns-search");
  const clearSearch = $("campaigns-clear-search");

  searchInput?.addEventListener("input", () => {
    state.searchQuery = String(searchInput.value || "").slice(0, 120);
    renderCampaigns();
  });

  clearSearch?.addEventListener("click", () => {
    state.searchQuery = "";
    if (searchInput) searchInput.value = "";
    renderCampaigns();
    searchInput?.focus();
  });

  $(
    "campaigns-create-button"
  )?.addEventListener(
    "click",
    openCreateCampaignModal
  );


  $(
    "campaigns-empty-create-button"
  )?.addEventListener(
    "click",
    openCreateCampaignModal
  );


  $(
    "campaign-create-close"
  )?.addEventListener(
    "click",
    closeCreateCampaignModal
  );


  $(
    "campaign-create-cancel"
  )?.addEventListener(
    "click",
    closeCreateCampaignModal
  );


  $(
    "campaign-create-form"
  )?.addEventListener(
    "submit",
    createCampaign
  );


  $(
    "campaign-cover"
  )?.addEventListener(
    "change",
    (event) => {

      const file =
        event.currentTarget
          ?.files?.[0] ||
        null;


      const errorElement =
        $(
          "campaign-cover-error"
        );


      if (errorElement) {
        errorElement.textContent =
          "";
      }


      if (!file) {

        clearCoverPreview();

        return;
      }


      try {

        validateCover(
          file
        );

        previewCover(
          file
        );

      } catch (error) {

        if (errorElement) {

          errorElement.textContent =
            error.message;
        }


        event.currentTarget.value =
          "";


        clearCoverPreview();

      }
    }
  );


  $(
    "campaign-invite-close"
  )?.addEventListener(
    "click",
    closeInviteModal
  );


  $(
    "campaign-invite-copy-code"
  )?.addEventListener(
    "click",
    copyInviteCode
  );


  $(
    "campaign-invite-copy-link"
  )?.addEventListener(
    "click",
    copyInviteLink
  );


  $(
    "campaign-invite-link-copy"
  )?.addEventListener(
    "click",
    copyInviteLink
  );


  $(
    "campaign-invite-share"
  )?.addEventListener(
    "click",
    shareInvite
  );


  $(
    "campaigns-retry-button"
  )?.addEventListener(
    "click",
    () => {

      if (
        !state.isLoading
      ) {

        loadCampaigns();

      }

    }
  );


  $(
    "campaigns-join-button"
  )?.addEventListener(
    "click",
    () => {

      window.location.href =
        CONFIG.JOIN_PAGE;

    }
  );


  $(
    "campaign-create-modal"
  )?.addEventListener(
    "click",
    (event) => {

      if (
        event.target instanceof
        Element &&
        event.target.dataset
          .modalClose ===
          "true"
      ) {

        closeCreateCampaignModal();

      }

    }
  );


  $(
    "campaign-invite-modal"
  )?.addEventListener(
    "click",
    (event) => {

      if (
        event.target instanceof
        Element &&
        event.target.dataset
          .inviteModalClose ===
          "true"
      ) {

        closeInviteModal();

      }

    }
  );


  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key !==
        "Escape"
      ) {
        return;
      }


      if (
        state.modal ===
        "create"
      ) {

        closeCreateCampaignModal();

      } else if (
        state.modal ===
        "edit"
      ) {

        closeEditCampaignModal();

      } else if (
        state.modal ===
        "invite"
      ) {

        closeInviteModal();

      }

    }
  );



function closeCampaignsMobileMenu() {
  const sidebar = $("campaigns-sidebar");
  const button = $("campaigns-mobile-menu-button");
  const backdrop = $("campaigns-mobile-menu-backdrop");
  sidebar?.classList.remove("is-open");
  backdrop?.classList.remove("is-open");
  button?.setAttribute("aria-expanded","false");
}

  $(
    "campaigns-mobile-menu-button"
  )?.addEventListener(
    "click",
    () => {

      const sidebar =
        $(
          "campaigns-sidebar"
        );

      const button =
        $(
          "campaigns-mobile-menu-button"
        );


      if (
        !sidebar ||
        !button
      ) {
        return;
      }


      const open =
        sidebar.classList.toggle(
          "is-open"
        );


      button.setAttribute(
        "aria-expanded",
        String(open)
      );

    }
  );


  $("campaigns-mobile-menu-backdrop")?.addEventListener("click", closeCampaignsMobileMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCampaignsMobileMenu();
  });

  $(
    "campaigns-logout-button"
  )?.addEventListener(
    "click",
    handleLogout
  );


  document
    .querySelectorAll(
      '[data-coming-soon="true"]'
    )
    .forEach(
      (
        element
      ) => {

        element.addEventListener(
          "click",
          (event) => {

            event.preventDefault();


            showToast(
              "Essa área será liberada em uma próxima etapa do AERIOM.",
              "info"
            );

          }
        );

      }
    );
}

function bindAuthListener() {

  if (
    !state.supabase?.auth ||
    state.authSubscription
  ) {
    return;
  }


  const {
    data
  } =
    state.supabase.auth
      .onAuthStateChange(
        (
          event,
          session
        ) => {

          window.setTimeout(
            async () => {

              if (
                event ===
                  "SIGNED_OUT" ||
                !session?.user
              ) {

                window.location.replace(
                  CONFIG.LOGIN_PAGE
                );

                return;
              }


              if (
                session.user.id !==
                state.user?.id
              ) {

                state.user =
                  session.user;


                await loadProfile();


                await renderUser();


                await loadCampaigns();

              }

            },
            0
          );

        }
      );


  state.authSubscription =
    data?.subscription ||
    null;
}

function cleanup() {

  stopInviteTimer();

  if (
    state.coverObjectUrl
  ) {

    URL.revokeObjectURL(
      state.coverObjectUrl
    );

    state.coverObjectUrl =
      null;
  }


  if (
    state.authSubscription
  ) {

    state.authSubscription.unsubscribe();

    state.authSubscription =
      null;
  }
}

async function init() {

  showLoading();


  try {

    /*
     * PRIMEIRO:
     * obter o cliente real do Supabase.
     */

    state.supabase =
      await getSupabase();


    if (
      !state.supabase
    ) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    /*
     * SEGUNDO:
     * registrar interface.
     */

    bindEvents();


    /*
     * TERCEIRO:
     * registrar Auth.
     */

    bindAuthListener();


    /*
     * QUARTO:
     * carregar sessão.
     */

    const user =
      await loadSession();


    if (!user) {
      return;
    }


    /*
     * QUINTO:
     * carregar campanhas.
     */

    await loadCampaigns();


    log(
      "info",
      "Página de campanhas inicializada com sucesso."
    );


  } catch (error) {

    log(
      "error",
      "Falha ao inicializar página de campanhas.",
      error
    );


    showError(
      error?.message ||
      "Não foi possível inicializar a página."
    );
  }
}


/* ============================================================
   API PÚBLICA
   ============================================================ */

window.AeriomCampaigns =
  Object.freeze({

    loadCampaigns,

    createCampaign,

    openCampaign,

    generateInvite,

    openCreateCampaignModal,

    closeCreateCampaignModal,

    openInviteModal,

    closeInviteModal,

    getState:
      () =>
        Object.freeze({
          user:
            state.user,

          profile:
            state.profile,

          campaigns:
            [...state.campaigns],

          selectedCampaign:
            state.selectedCampaign
        })

  });


/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    {
      once:
        true
    }
  );

} else {

  init();

}


/* ============================================================
   PAGE LIFECYCLE
   ============================================================ */

window.addEventListener(
  "pagehide",
  cleanup,
  {
    once:
      true
  }
);
