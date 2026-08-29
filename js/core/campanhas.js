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

  STORAGE_BUCKET:
    "campaigns",

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

  isGeneratingInvite:
    false,

  modal:
    null,

  inviteTimer:
    null,

  coverObjectUrl:
    null

};


/* ============================================================
   HELPER DOM
   ============================================================ */

function $(id) {
  return document.getElementById(id);
}


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

  if (
    level === "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;
  }

  if (
    level === "warn"
  ) {

    console.warn(
      prefix,
      message,
      details ?? ""
    );

    return;
  }

  console.info(
    prefix,
    message,
    details ?? ""
  );

}


/* ============================================================
   NORMALIZAÇÃO DE ERRO
   ============================================================ */

function normalizeError(
  error,
  context
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
    String(message ?? "");

  region.appendChild(
    toast
  );

  window.setTimeout(
    () => {
      toast.remove();
    },
    4000
  );

}


/* ============================================================
   ESTADOS DA PÁGINA
   ============================================================ */

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
        element.hidden = true;
      }

    }
  );

}


function showLoading() {

  hideStates();

  const element =
    $("campaigns-loading");

  if (element) {
    element.hidden = false;
  }

}


function showEmpty() {

  hideStates();

  const element =
    $("campaigns-empty");

  if (element) {
    element.hidden = false;
  }

}


function showList() {

  hideStates();

  const element =
    $("campaigns-list-section");

  if (element) {
    element.hidden = false;
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
      "Não foi possível carregar as campanhas.";

  }

  const errorElement =
    $("campaigns-error");

  if (errorElement) {
    errorElement.hidden = false;
  }

}


/* ============================================================
   STRING / DATA
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
    ).format(date);

  } catch {

    return "";

  }

}


/* ============================================================
   URL DE IMAGEM
   ============================================================ */

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
   CAMPANHA
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


/* ============================================================
   USUÁRIO
   ============================================================ */

function renderUser(
  user
) {

  const metadata =
    user?.user_metadata ||
    {};

  const name =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Aventureiro";

  const email =
    user?.email ||
    "";

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
      email;

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

    /*
     * O filtro usa o usuário autenticado.
     *
     * Mesmo assim, a proteção real continua no RLS.
     */

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
   CARD DE CAMPANHA
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


  /* ----------------------------------------------------------
     CAPA
     ---------------------------------------------------------- */

  const cover =
    document.createElement(
      "div"
    );

  cover.className =
    "campaign-card__cover";


  const imageUrl =
    campaign.coverUrl ||
    "";


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


  /* ----------------------------------------------------------
     CONTEÚDO
     ---------------------------------------------------------- */

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


  /* ----------------------------------------------------------
     FOOTER
     ---------------------------------------------------------- */

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


  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "campaign-card__actions";


  const openButton =
    document.createElement(
      "button"
    );

  openButton.type =
    "button";

  openButton.className =
    "campaign-card__open";

  openButton.textContent =
    "Abrir campanha";

  openButton.addEventListener(
    "click",
    () =>
      openCampaign(
        campaign.id
      )
  );


  actions.appendChild(
    openButton
  );


  /*
   * Convite somente visualmente disponível para Master.
   *
   * A RPC também valida a permissão no banco.
   */

  if (
    campaign.role ===
    "master"
  ) {

    const inviteButton =
      document.createElement(
        "button"
      );

    inviteButton.type =
      "button";

    inviteButton.className =
      "campaign-card__invite";

    inviteButton.textContent =
      "Convidar";

    inviteButton.addEventListener(
      "click",
      async () => {

        state.selectedCampaign =
          campaign;

        await generateInvite(
          campaign.id
        );

      }
    );

    actions.appendChild(
      inviteButton
    );
  }


  footer.append(
    date,
    actions
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
    state.campaigns.length ===
    0
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
   MODAL CRIAÇÃO
   ============================================================ */

function openCreateCampaignModal() {

  const modal =
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


  state.modal =
    "create";


  window.requestAnimationFrame(
    () => {

      $("campaign-name")?.focus();

    }
  );

}


function closeCreateCampaignModal() {

  const modal =
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


  state.modal =
    null;


  const form =
    $("campaign-create-form");

  form?.reset();


  clearCoverPreview();


  [
    "campaign-name-error",
    "campaign-description-error",
    "campaign-cover-error"
  ]
    .forEach(
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

}


/* ============================================================
   CAPA — VALIDAÇÃO
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
   PREVIEW CAPA
   ============================================================ */

function clearCoverPreview() {

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

  placeholder.textContent =
    "✦";

  preview.appendChild(
    placeholder
  );


  if (
    state.coverObjectUrl
  ) {

    URL.revokeObjectURL(
      state.coverObjectUrl
    );

    state.coverObjectUrl =
      null;

  }

}


function previewCover(
  file
) {

  const preview =
    $("campaign-cover-preview");

  if (
    !preview ||
    !file
  ) {

    return;
  }


  clearCoverPreview();


  state.coverObjectUrl =
    URL.createObjectURL(
      file
    );


  const image =
    document.createElement(
      "img"
    );

  image.className =
    "campaign-cover-upload__image";

  image.src =
    state.coverObjectUrl;

  image.alt =
    "Pré-visualização da capa";


  preview.replaceChildren(
    image
  );

}


/* ============================================================
   UPLOAD CAPA
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
    ];


  if (!extension) {

    throw new Error(
      "Formato de imagem não suportado."
    );

  }


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
          "storage.objects",

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

async function createCampaign(
  event
) {

  if (
    event
  ) {

    event.preventDefault();

  }


  if (
    state.isCreating
  ) {

    return;
  }


  if (
    !state.user
  ) {

    showToast(
      "Sua sessão expirou. Entre novamente.",
      "error"
    );

    return;
  }


  const nameInput =
    $("campaign-name");

  const descriptionInput =
    $("campaign-description");

  const coverInput =
    $("campaign-cover");


  const name =
    String(
      nameInput?.value ??
      ""
    ).trim();


  const description =
    String(
      descriptionInput?.value ??
      ""
    ).trim();


  const coverFile =
    coverInput?.files?.[0] ||
    null;


  const nameError =
    $("campaign-name-error");

  const descriptionError =
    $("campaign-description-error");

  const coverError =
    $("campaign-cover-error");


  [
    nameError,
    descriptionError,
    coverError
  ]
    .forEach(
      (element) => {

        if (element) {

          element.textContent =
            "";

        }

      }
    );


  if (!name) {

    if (nameError) {

      nameError.textContent =
        "Digite o nome da campanha.";

    }

    nameInput?.focus();

    return;
  }


  if (
    name.length >
    CONFIG.MAX_NAME_LENGTH
  ) {

    if (nameError) {

      nameError.textContent =
        `O nome pode ter no máximo ${CONFIG.MAX_NAME_LENGTH} caracteres.`;

    }

    return;
  }


  if (
    description.length >
    CONFIG.MAX_DESCRIPTION_LENGTH
  ) {

    if (descriptionError) {

      descriptionError.textContent =
        `A descrição pode ter no máximo ${CONFIG.MAX_DESCRIPTION_LENGTH} caracteres.`;

    }

    return;
  }


  try {

    validateCover(
      coverFile
    );

  } catch (error) {

    if (coverError) {

      coverError.textContent =
        error.message;

    }

    return;
  }


  state.isCreating =
    true;


  setCreateLoading(
    true
  );


  try {

    /*
     * ========================================================
     * CRIAÇÃO TRANSAcional
     * ========================================================
     *
     * O banco recebe apenas:
     *
     * - nome
     * - descrição
     * - cover_path
     *
     * created_by vem de auth.uid().
     */

    const {
      data:
        createdCampaign,
      error
    } =
      await state.supabase.rpc(
        "create_campaign",
        {

          p_name:
            name,

          p_description:
            description ||
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
      Array.isArray(
        createdCampaign
      )
        ? createdCampaign[0]
        : createdCampaign;


    if (
      !campaign?.id
    ) {

      throw new Error(
        "O banco não retornou o ID da campanha criada."
      );

    }


    /*
     * Upload da capa depois da criação,
     * utilizando o ID real da campanha.
     */

    if (
      coverFile
    ) {

      try {

        const coverPath =
          await uploadCover(
            coverFile,
            campaign.id
          );


        const {
          error:
            coverUpdateError
        } =
          await state.supabase

            .from(
              "campaigns"
            )

            .update({

              cover_path:
                coverPath

            })

            .eq(
              "id",
              campaign.id
            );


        if (
          coverUpdateError
        ) {

          throw normalizeError(
            coverUpdateError,
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
          );

        }

      } catch (coverError) {

        /*
         * A campanha já existe.
         *
         * Não apagamos automaticamente porque
         * a criação principal foi bem-sucedida.
         */

        log(
          "error",
          "Campanha criada, mas falha ao enviar a capa.",
          coverError
        );


        showToast(
          "Campanha criada, mas a capa não pôde ser enviada.",
          "error"
        );

      }

    }


    closeCreateCampaignModal();


    await loadCampaigns();


    showToast(
      "Campanha criada com sucesso!",
      "success"
    );


  } catch (error) {

    log(
      "error",
      "Erro ao criar campanha.",
      error
    );


    const message =
      error?.message ||
      "Não foi possível criar a campanha.";


    const formMessage =
      $("campaign-create-message");


    if (formMessage) {

      formMessage.hidden =
        false;

      formMessage.dataset.type =
        "error";

      formMessage.textContent =
        message;

    }


    showToast(
      message,
      "error"
    );

  } finally {

    state.isCreating =
      false;


    setCreateLoading(
      false
    );

  }

}


/* ============================================================
   LOADING CRIAÇÃO
   ============================================================ */

function setCreateLoading(
  loading
) {

  const button =
    $("campaign-create-submit");

  if (!button) {
    return;
  }


  button.disabled =
    Boolean(
      loading
    );


  const label =
    button.querySelector(
      ".button__label"
    );


  const loadingElement =
    button.querySelector(
      ".button__loading"
    );


  if (label) {

    label.hidden =
      Boolean(
        loading
      );

  }


  if (loadingElement) {

    loadingElement.hidden =
      !loading;

  }

}


/* ============================================================
   CONVITE
   ============================================================ */

async function generateInvite(
  campaignId
) {

  if (
    state.isGeneratingInvite
  ) {

    return null;
  }


  if (
    !state.user ||
    !campaignId
  ) {

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
            campaignId,

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
      Array.isArray(data)
        ? data[0]
        : data;


    if (!invite) {

      throw new Error(
        "O banco não retornou o convite."
      );

    }


    state.selectedInvite =
      invite;


    renderInvite(
      invite
    );


    openInviteModal();


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


/* ============================================================
   RENDER INVITE
   ============================================================ */

function renderInvite(
  invite
) {

  if (!invite) {
    return;
  }


  const code =
    invite.invite_code ||
    invite.code ||
    invite.token ||
    "";


  const codeElement =
    $("campaign-invite-code");


  if (codeElement) {

    codeElement.textContent =
      String(
        code
      );

  }


  const expiration =
    $("campaign-invite-expiration");


  if (
    expiration &&
    invite.expires_at
  ) {

    expiration.textContent =
      `Expira em ${formatDate(
        invite.expires_at
      )}`;

  }


  const linkInput =
    $("campaign-invite-link");


  if (
    linkInput &&
    code
  ) {

    const url =
      new URL(
        "./entrar.html",
        window.location.href
      );


    url.searchParams.set(
      "code",
      code
    );


    linkInput.value =
      url.toString();

  }

}


/* ============================================================
   MODAL INVITE
   ============================================================ */

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

}


/* ============================================================
   COPIAR TEXTO
   ============================================================ */

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

    await navigator.clipboard.writeText(
      String(value)
    );


    showToast(
      successMessage,
      "success"
    );


  } catch {

    /*
     * Fallback para navegadores sem Clipboard API.
     */

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


    document.body.appendChild(
      textarea
    );


    textarea.select();


    try {

      document.execCommand(
        "copy"
      );


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


/* ============================================================
   COPIAR CÓDIGO
   ============================================================ */

async function copyInviteCode() {

  const codeElement =
    $("campaign-invite-code");


  const code =
    codeElement
      ?.textContent
      ?.trim();


  await copyText(
    code,
    "Código copiado."
  );

}


/* ============================================================
   COPIAR LINK
   ============================================================ */

async function copyInviteLink() {

  const input =
    $("campaign-invite-link");


  const link =
    input
      ?.value
      ?.trim();


  await copyText(
    link,
    "Link do convite copiado."
  );

}


/* ============================================================
   COMPARTILHAR
   ============================================================ */

async function shareInvite() {

  const link =
    $("campaign-invite-link")
      ?.value
      ?.trim();


  const code =
    $("campaign-invite-code")
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

      await navigator.share({

        title,

        text,

        url:
          link

      });

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


/* ============================================================
   EVENTOS
   ============================================================ */

function bindEvents() {

  $("campaigns-create-button")
    ?.addEventListener(
      "click",
      openCreateCampaignModal
    );


  $("campaigns-empty-create-button")
    ?.addEventListener(
      "click",
      openCreateCampaignModal
    );


  $("campaign-create-close")
    ?.addEventListener(
      "click",
      closeCreateCampaignModal
    );


  $("campaign-create-cancel")
    ?.addEventListener(
      "click",
      closeCreateCampaignModal
    );


  $("campaign-create-form")
    ?.addEventListener(
      "submit",
      createCampaign
    );


  $("campaign-cover")
    ?.addEventListener(
      "change",
      (event) => {

        const file =
          event.currentTarget
            ?.files
            ?.[0] ||
          null;


        const error =
          $("campaign-cover-error");


        if (error) {

          error.textContent =
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

        } catch (validationError) {

          if (error) {

            error.textContent =
              validationError.message;

          }


          event.currentTarget.value =
            "";


          clearCoverPreview();

        }

      }
    );


  $("campaign-invite-close")
    ?.addEventListener(
      "click",
      closeInviteModal
    );


  $("campaign-invite-copy-code")
    ?.addEventListener(
      "click",
      copyInviteCode
    );


  $("campaign-invite-copy-link")
    ?.addEventListener(
      "click",
      copyInviteLink
    );


  $("campaign-invite-link-copy")
    ?.addEventListener(
      "click",
      copyInviteLink
    );


  $("campaign-invite-share")
    ?.addEventListener(
      "click",
      shareInvite
    );


  $("campaigns-retry-button")
    ?.addEventListener(
      "click",
      () => {

        if (
          !state.isLoading
        ) {

          loadCampaigns();

        }

      }
    );


  $("campaigns-join-button")
    ?.addEventListener(
      "click",
      () => {

        window.location.href =
          "./entrar.html";

      }
    );


  $("campaign- create-modal")
    ?.addEventListener(
      "click",
      () => {}
    );


  $("campaign-create-modal")
    ?.addEventListener(
      "click",
      (event) => {

        const target =
          event.target instanceof
          Element
            ? event.target
            : null;


        if (
          target?.dataset.modalClose ===
          "true"
        ) {

          closeCreateCampaignModal();

        }

      }
    );


  $("campaign-invite-modal")
    ?.addEventListener(
      "click",
      (event) => {

        const target =
          event.target instanceof
          Element
            ? event.target
            : null;


        if (
          target?.dataset.inviteModalClose ===
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

        return;
      }


      if (
        state.modal ===
        "invite"
      ) {

        closeInviteModal();

      }

    }
  );


  $("campaigns-mobile-menu-button")
    ?.addEventListener(
      "click",
      () => {

        const sidebar =
          $("campaigns-sidebar");


        const button =
          $("campaigns-mobile-menu-button");


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


  $("campaigns-logout-button")
    ?.addEventListener(
      "click",
      handleLogout
    );


  document
    .querySelectorAll(
      "[data-coming-soon=\"true\"]"
    )
    .forEach(
      (element) => {

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


/* ============================================================
   LOGOUT
   ============================================================ */

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
      await state.supabase.auth.signOut();


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


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function init() {

  log(
    "info",
    "Inicializando página de campanhas..."
  );


  try {

    /*
     * IMPORTANTE:
     *
     * getSupabase() é async.
     */

    state.supabase =
      await getSupabase();


    if (!state.supabase) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    log(
      "info",
      "Cliente Supabase obtido."
    );


    bindEvents();


    const user =
      await loadSession();


    if (!user) {

      return;
    }


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
   API GLOBAL
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

    closeInviteModal

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