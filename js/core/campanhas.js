import {
  getSupabase,
  normalizeSupabaseError
} from "./supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CONFIG = Object.freeze({

  LOGIN_PAGE:
    "./index.html",

  CAMPAIGN_PAGE:
    "./campanha.html",

  MAX_NAME_LENGTH:
    120,

  MAX_DESCRIPTION_LENGTH:
    1000,

  MAX_COVER_SIZE:
    5 * 1024 * 1024,

  ALLOWED_IMAGE_TYPES:
    Object.freeze([
      "image/jpeg",
      "image/png",
      "image/webp"
    ]),

  STORAGE_BUCKET:
    "campaigns",

  INVITE_LENGTH:
    5,

  INVITE_DURATION_MINUTES:
    5

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  supabase:
    null,

  user:
    null,

  campaigns:
    [],

  selectedCampaign:
    null,

  selectedInvite:
    null,

  isLoading:
    false,

  isCreating:
    false,

  inviteTimer:
    null,

  coverObjectUrl:
    null

};


/* ============================================================
   DOM
   ============================================================ */

const $ = (id) =>
  document.getElementById(id);


/* ============================================================
   LOG
   ============================================================ */

function log(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][CAMPAIGNS]";

  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;

  fn(
    prefix,
    message,
    details ?? ""
  );

}


/* ============================================================
   ERROS
   ============================================================ */

function normalizeError(
  error,
  context = {}
) {

  try {

    return normalizeSupabaseError(
      error,
      context
    );

  } catch {

    return {

      message:
        error?.message ||
        "Erro desconhecido.",

      original:
        error

    };

  }

}


/* ============================================================
   TOAST
   ============================================================ */

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
    document.createElement(
      "div"
    );

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


/* ============================================================
   ESTADOS DA PÁGINA
   ============================================================ */

function setHidden(
  id,
  hidden
) {

  const element =
    $(id);

  if (element) {

    element.hidden =
      hidden;
  }

}


function hideStates() {

  [
    "campaigns-loading",
    "campaigns-empty",
    "campaigns-error",
    "campaigns-list-section"
  ].forEach(
    (id) =>
      setHidden(
        id,
        true
      )
  );

}


function showLoading() {

  hideStates();

  setHidden(
    "campaigns-loading",
    false
  );

}


function showEmpty() {

  hideStates();

  setHidden(
    "campaigns-empty",
    false
  );

}


function showList() {

  hideStates();

  setHidden(
    "campaigns-list-section",
    false
  );

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
      "Não foi possível carregar as campanhas.";
  }

  setHidden(
    "campaigns-error",
    false
  );

}


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  return typeof value === "string"
    ? value
    : fallback;

}


function formatDate(
  value
) {

  if (!value) {

    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";
  }

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


/* ============================================================
   NORMALIZAÇÃO DE CAMPANHA
   ============================================================ */

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

  if (!campaign?.id) {

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


/* ============================================================
   USUÁRIO
   ============================================================ */

function renderUser(
  user
) {

  const name =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Aventureiro";

  const nameElement =
    $("campaigns-user-name");

  const emailElement =
    $("campaigns-user-email");

  const avatarElement =
    $("campaigns-user-avatar");

  if (nameElement) {

    nameElement.textContent =
      name;
  }

  if (emailElement) {

    emailElement.textContent =
      user?.email || "";
  }

  if (avatarElement) {

    avatarElement.textContent =
      name
        .trim()
        .charAt(0)
        .toUpperCase() ||
      "?";
  }

}


/* ============================================================
   SESSÃO
   ============================================================ */

async function loadSession() {

  const {
    data,
    error
  } =
    await state.supabase.auth.getSession();

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

  if (!session?.user) {

    window.location.replace(
      CONFIG.LOGIN_PAGE
    );

    return null;
  }

  state.user =
    session.user;

  renderUser(
    state.user
  );

  return state.user;

}


/* ============================================================
   CARREGAR CAMPANHAS
   ============================================================ */

async function loadCampaigns() {

  if (!state.user) {

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

    state.campaigns =
      Array.isArray(data)
        ? data
            .map(
              normalizeCampaign
            )
            .filter(
              Boolean
            )
        : [];

    renderCampaigns();

  } catch (error) {

    log(
      "error",
      "Falha ao carregar campanhas.",
      error
    );

    showError(
      "Não foi possível carregar suas campanhas. Tente novamente."
    );

  } finally {

    state.isLoading =
      false;

  }

}


/* ============================================================
   CARD
   ============================================================ */

function createCampaignCard(
  campaign
) {

  const article =
    document.createElement(
      "article"
    );

  article.className =
    "campaign-card";

  article.dataset.campaignId =
    campaign.id;


  /* CAPA */

  const cover =
    document.createElement(
      "div"
    );

  cover.className =
    "campaign-card__cover";


  const imageUrl =
    campaign.coverUrl || "";


  if (
    isSafeImageUrl(
      imageUrl
    )
  ) {

    const image =
      document.createElement(
        "img"
      );

    image.className =
      "campaign-card__image";

    image.src =
      imageUrl;

    image.alt =
      `Capa da campanha ${campaign.name}`;

    image.loading =
      "lazy";

    image.referrerPolicy =
      "no-referrer";

    image.addEventListener(
      "error",
      () => {

        image.remove();

        cover.classList.add(
          "campaign-card__cover--empty"
        );

      },
      {
        once:
          true
      }
    );

    cover.appendChild(
      image
    );

  } else {

    cover.classList.add(
      "campaign-card__cover--empty"
    );

    const symbol =
      document.createElement(
        "span"
      );

    symbol.className =
      "campaign-card__cover-symbol";

    symbol.textContent =
      "✦";

    symbol.setAttribute(
      "aria-hidden",
      "true"
    );

    cover.appendChild(
      symbol
    );

  }


  /* CONTEÚDO */

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "campaign-card__content";


  const role =
    document.createElement(
      "span"
    );

  role.className =
    "campaign-card__role";

  role.dataset.role =
    campaign.role;

  role.textContent =
    campaign.role === "master"
      ? "Mestre"
      : "Aventureiro";


  const title =
    document.createElement(
      "h3"
    );

  title.className =
    "campaign-card__title";

  title.textContent =
    campaign.name;


  const description =
    document.createElement(
      "p"
    );

  description.className =
    "campaign-card__description";

  description.textContent =
    campaign.description ||
    "Uma nova aventura aguarda o grupo.";


  /* RODAPÉ */

  const footer =
    document.createElement(
      "div"
    );

  footer.className =
    "campaign-card__footer";


  const date =
    document.createElement(
      "span"
    );

  date.className =
    "campaign-card__date";

  date.textContent =
    campaign.updatedAt
      ? `Atualizada em ${formatDate(
          campaign.updatedAt
        )}`
      : "Nova campanha";


  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "campaign-card__open";

  button.textContent =
    "Abrir campanha";

  button.addEventListener(
    "click",
    () =>
      openCampaign(
        campaign.id
      )
  );


  footer.append(
    date,
    button
  );

  content.append(
    role,
    title,
    description,
    footer
  );

  article.append(
    cover,
    content
  );

  return article;

}


/* ============================================================
   RENDER
   ============================================================ */

function renderCampaigns() {

  const list =
    $("campaigns-list");

  if (!list) {

    log(
      "warn",
      "Elemento #campaigns-list não encontrado."
    );

    return;
  }

  list.replaceChildren();

  if (
    !state.campaigns.length
  ) {

    showEmpty();

    return;
  }

  const fragment =
    document.createDocumentFragment();

  state.campaigns.forEach(
    (campaign) => {

      fragment.appendChild(
        createCampaignCard(
          campaign
        )
      );

    }
  );

  list.appendChild(
    fragment
  );

  showList();

}


/* ============================================================
   ABRIR CAMPANHA
   ============================================================ */

function openCampaign(
  campaignId
) {

  const campaign =
    state.campaigns.find(
      (item) =>
        item.id ===
        campaignId
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
   * Isto é somente uma referência
   * de navegação.
   *
   * NÃO é utilizado para autorização.
   */

  try {

    localStorage.setItem(
      "aeriom_active_campaign",
      campaign.id
    );

  } catch {

    /*
     * LocalStorage não é obrigatório.
     */

  }


  const url =
    new URL(
      CONFIG.CAMPAIGN_PAGE,
      window.location.href
    );

  url.searchParams.set(
    "campaign",
    campaign.id
  );

  window.location.href =
    url.toString();

}


/* ============================================================
   VALIDAÇÃO
   ============================================================ */

function validateCampaignForm(
  name,
  description
) {

  const cleanName =
    String(
      name || ""
    ).trim();

  const cleanDescription =
    String(
      description || ""
    ).trim();


  if (!cleanName) {

    throw new Error(
      "Informe o nome da campanha."
    );

  }


  if (
    cleanName.length >
    CONFIG.MAX_NAME_LENGTH
  ) {

    throw new Error(
      `O nome pode ter no máximo ${CONFIG.MAX_NAME_LENGTH} caracteres.`
    );

  }


  if (
    cleanDescription.length >
    CONFIG.MAX_DESCRIPTION_LENGTH
  ) {

    throw new Error(
      `A descrição pode ter no máximo ${CONFIG.MAX_DESCRIPTION_LENGTH} caracteres.`
    );

  }


  return {

    name:
      cleanName,

    description:
      cleanDescription ||
      null

  };

}


/* ============================================================
   VALIDAR CAPA
   ============================================================ */

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
      "A capa deve ter no máximo 5 MB."
    );

  }

}


/* ============================================================
   FORMULÁRIO
   ============================================================ */

function getFormValues() {

  const nameInput =
    $("campaign-name") ||
    $("create-campaign-name") ||
    $("campaignName");


  const descriptionInput =
    $("campaign-description") ||
    $("create-campaign-description") ||
    $("campaignDescription");


  const coverInput =
    $("campaign-cover") ||
    $("campaign-cover-input") ||
    $("create-campaign-cover");


  return {

    name:
      nameInput?.value ||
      "",

    description:
      descriptionInput?.value ||
      "",

    coverFile:
      coverInput?.files?.[0] ||
      null

  };

}


/* ============================================================
   STORAGE
   ============================================================ */

async function uploadCover(
  file,
  campaignId
) {

  if (!file) {

    return null;
  }

  validateCover(
    file
  );


  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() ||
    "bin";


  const path =
    `${state.user.id}/${campaignId}/cover.${extension}`;


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

          upsert:
            true,

          contentType:
            file.type,

          cacheControl:
            "3600"

        }
      );


  if (error) {

    throw normalizeError(
      error,
      {

        file:
          "js/core/campanhas.js",

        function:
          "uploadCover",

        table:
          "storage",

        operation:
          "upload"

      }
    );

  }


  return path;

}


/* ============================================================
   CRIAR CAMPANHA
   ============================================================ */

async function createCampaign() {

  if (
    state.isCreating ||
    !state.user
  ) {

    return;
  }


  state.isCreating =
    true;


  const button =
    $("create-campaign-submit") ||
    $("create-campaign-button") ||
    $("campaign-create-submit");


  if (button) {

    button.disabled =
      true;
  }


  try {

    const values =
      getFormValues();


    const validated =
      validateCampaignForm(
        values.name,
        values.description
      );


    validateCover(
      values.coverFile
    );


    /*
     * Primeiro criamos a campanha
     * através da RPC segura.
     *
     * O banco usa auth.uid().
     *
     * Não enviamos created_by.
     */

    const {
      data,
      error
    } =
      await state.supabase.rpc(
        "create_campaign",
        {

          p_name:
            validated.name,

          p_description:
            validated.description,

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


    if (!campaign?.id) {

      throw new Error(
        "O banco criou a campanha, mas não retornou o identificador."
      );

    }


    /*
     * A capa é opcional.
     */

    if (
      values.coverFile
    ) {

      const coverPath =
        await uploadCover(
          values.coverFile,
          campaign.id
        );


      const {
        error:
          updateError
      } =
        await state.supabase

          .from(
            "campaigns"
          )

          .update(
            {

              cover_path:
                coverPath,

              cover_url:
                null

            }
          )

          .eq(
            "id",
            campaign.id
          );


      if (updateError) {

        log(
          "error",
          "Campanha criada, mas a capa não pôde ser associada.",
          normalizeError(
            updateError,
            {

              file:
                "js/core/campanhas.js",

              function:
                "createCampaign",

              table:
                "campaigns",

              operation:
                "update:cover_path"

            }
          )
        );


        showToast(
          "Campanha criada, mas a capa não foi aplicada.",
          "warning"
        );

      }

    }


    showToast(
      "Campanha criada com sucesso!",
      "success"
    );


    closeCreateCampaignModal();


    await loadCampaigns();


    const created =
      state.campaigns.find(
        (item) =>
          item.id ===
          String(
            campaign.id
          )
      );


    if (created) {

      openCampaign(
        created.id
      );

    }


  } catch (error) {

    log(
      "error",
      "Erro ao criar campanha.",
      error
    );


    showToast(
      error?.message ||
      "Não foi possível criar a campanha.",
      "error"
    );


  } finally {

    state.isCreating =
      false;


    if (button) {

      button.disabled =
        false;
    }

  }

}


/* ============================================================
   MODAL DE CRIAÇÃO
   ============================================================ */

function openCreateCampaignModal() {

  const modal =
    $("create-campaign-modal") ||
    $("campaign-create-modal");


  if (!modal) {

    return;
  }


  modal.hidden =
    false;


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  const first =
    modal.querySelector(
      "input, textarea, button"
    );


  first?.focus();

}


function closeCreateCampaignModal() {

  const modal =
    $("create-campaign-modal") ||
    $("campaign-create-modal");


  if (!modal) {

    return;
  }


  modal.hidden =
    true;


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  const form =
    modal.querySelector(
      "form"
    );


  form?.reset();

}


/* ============================================================
   CONVITE
   ============================================================ */

async function generateInvite(
  campaignId
) {

  if (
    !state.user ||
    !campaignId
  ) {

    return null;
  }


  try {

    const {
      data,
      error
    } =
      await state.supabase.rpc(
        "generate_campaign_invite",
        {

          p_campaign_id:
            campaignId,

          p_expires_in_minutes:
            CONFIG.INVITE_DURATION_MINUTES

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
      Array.isArray(data)
        ? data[0]
        : data;


    state.selectedInvite =
      invite ||
      null;


    renderInvite(
      invite
    );


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

  }

}


/* ============================================================
   RENDER CONVITE
   ============================================================ */

function renderInvite(
  invite
) {

  if (!invite) {

    return;
  }


  const code =
    invite.code ||
    invite.token ||
    invite.invite_code ||
    "";


  const codeElement =
    $("campaign-invite-code") ||
    $("invite-code");


  if (codeElement) {

    codeElement.textContent =
      String(
        code
      );

  }


  const expiresElement =
    $("campaign-invite-expires") ||
    $("invite-expires");


  if (
    expiresElement &&
    invite.expires_at
  ) {

    expiresElement.textContent =
      `Válido até ${formatDate(
        invite.expires_at
      )}`;

  }

}


/* ============================================================
   COPIAR CONVITE
   ============================================================ */

async function copyInviteCode() {

  const code =
    state.selectedInvite?.code ||
    state.selectedInvite?.token ||
    state.selectedInvite?.invite_code;


  if (!code) {

    return;
  }


  try {

    await navigator.clipboard.writeText(
      String(
        code
      )
    );


    showToast(
      "Código copiado.",
      "success"
    );


  } catch {

    showToast(
      "Não foi possível copiar automaticamente.",
      "error"
    );

  }

}


/* ============================================================
   EVENTOS
   ============================================================ */

function bindEvents() {

  [
    "create-campaign-button",
    "create-campaign",
    "empty-create-campaign"
  ].forEach(
    (id) => {

      $(id)?.addEventListener(
        "click",
        openCreateCampaignModal
      );

    }
  );


  [
    "create-campaign-close",
    "create-campaign-cancel",
    "campaign-create-cancel"
  ].forEach(
    (id) => {

      $(id)?.addEventListener(
        "click",
        closeCreateCampaignModal
      );

    }
  );


  [
    "create-campaign-submit",
    "create-campaign-button-submit",
    "campaign-create-submit"
  ].forEach(
    (id) => {

      $(id)?.addEventListener(
        "click",
        createCampaign
      );

    }
  );


  [
    "campaign-invite-copy",
    "invite-copy"
  ].forEach(
    (id) => {

      $(id)?.addEventListener(
        "click",
        copyInviteCode
      );

    }
  );


  $("campaigns-retry")
    ?.addEventListener(
      "click",
      loadCampaigns
    );


  const form =
    $("create-campaign-form") ||
    $("campaign-create-form");


  form?.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      createCampaign();

    }
  );


  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape"
      ) {

        closeCreateCampaignModal();

      }

    }
  );

}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function init() {

  try {

    state.supabase =
      getSupabase();


    if (!state.supabase) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    bindEvents();


    const user =
      await loadSession();


    if (!user) {

      return;
    }


    await loadCampaigns();


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

    openCreateCampaignModal,

    closeCreateCampaignModal,

    generateInvite,

    openCampaign

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