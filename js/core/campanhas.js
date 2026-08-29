/*
 * ============================================================
 * AERIOM
 * js/campanhas.js
 * ============================================================
 *
 * Responsável pela página campanhas.html
 *
 * Funções:
 * - sessão
 * - perfil do usuário
 * - carregamento de campanhas
 * - criação de campanha
 * - upload de capa
 * - geração de convite
 * - código de convite
 * - QR Code
 * - compartilhamento
 * - logout
 * - menu mobile
 * - estados loading / empty / error
 *
 * Segurança:
 * - Não usa localStorage para autorização.
 * - Não confia em role enviada pelo cliente.
 * - Não insere HTML vindo do banco.
 * - Criação utiliza função PostgreSQL transacional.
 * - RLS continua sendo a autoridade real.
 *
 * ============================================================
 */

import {
  getSupabase,
  normalizeSupabaseError
} from "./core/supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CONFIG = Object.freeze({

  LOGIN_PAGE:
    "./index.html",

  CAMPAIGN_PAGE:
    "./campanha.html",

  INVITE_LENGTH:
    5,

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

  INVITE_DURATION_SECONDS:
    5 * 60

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

  modalOpen:
    null,

  inviteTimer:
    null,

  coverObjectUrl:
    null

};


/* ============================================================
   DOM
   ============================================================ */

const $ = (
  id
) => document.getElementById(id);


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
   ERRO
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
    () => {

      toast.remove();

    },
    4000
  );
}


/* ============================================================
   ESTADOS
   ============================================================ */

function hideStates() {

  const elements = [

    $("campaigns-loading"),
    $("campaigns-empty"),
    $("campaigns-error"),
    $("campaigns-list-section")

  ];


  elements.forEach(
    element => {

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


  const element =
    $("campaigns-error");


  const messageElement =
    $("campaigns-error-message");


  if (messageElement) {

    messageElement.textContent =
      message ||
      "Não foi possível carregar as campanhas.";
  }


  if (element) {

    element.hidden =
      false;
  }
}


/* ============================================================
   STRING
   ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  if (
    typeof value !==
    "string"
  ) {

    return fallback;
  }


  return value;
}


/* ============================================================
   DATA
   ============================================================ */

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


/* ============================================================
   URL DE IMAGEM
   ============================================================ */

function isSafeImageUrl(
  value
) {

  if (
    !value
  ) {

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
   NORMALIZAR CAMPANHA
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
   RENDERIZAR USUÁRIO
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
          "js/campanhas.js",

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

  if (
    !state.user
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
            "js/campanhas.js",

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


  if (
    isSafeImageUrl(
      campaign.coverUrl
    )
  ) {

    const image =
      document.createElement(
        "img"
      );


    image.className =
      "campaign-card__image";


    image.src =
      campaign.coverUrl;


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
      ? `Atualizada em ${formatDate(campaign.updatedAt)}`
      : "";


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


  openButton.dataset.action =
    "open-campaign";


  openButton.dataset.campaignId =
    campaign.id;


  openButton.textContent =
    "Entrar na mesa";


  actions.appendChild(
    openButton
  );


  /*
   * Somente o Mestre recebe o botão de convite.
   *
   * Isso é apenas UX.
   * A segurança do convite será reforçada no PostgreSQL.
   */

  if (
    campaign.role === "master"
  ) {

    const inviteButton =
      document.createElement(
        "button"
      );


    inviteButton.type =
      "button";


    inviteButton.className =
      "campaign-card__invite";


    inviteButton.dataset.action =
      "create-invite";


    inviteButton.dataset.campaignId =
      campaign.id;


    inviteButton.textContent =
      "Convidar";


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
   RENDERIZAR CAMPANHAS
   ============================================================ */

function renderCampaigns() {

  const container =
    $("campaigns-list");


  if (!container) {

    throw new Error(
      "Elemento #campaigns-list não existe no HTML."
    );
  }


  container.replaceChildren();


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
    campaign => {

      fragment.appendChild(
        createCampaignCard(
          campaign
        )
      );

    }
  );


  container.appendChild(
    fragment
  );


  showList();
}


/* ============================================================
   VALIDAR CAPA
   ============================================================ */

function validateCover(
  file
) {

  if (!file) {

    return {

      valid:
        true,

      file:
        null

    };
  }


  if (
    !CONFIG.ALLOWED_IMAGE_TYPES.includes(
      file.type
    )
  ) {

    return {

      valid:
        false,

      message:
        "Formato inválido. Use JPG, PNG ou WebP."

    };
  }


  if (
    file.size >
    CONFIG.MAX_COVER_SIZE
  ) {

    return {

      valid:
        false,

      message:
        "A imagem deve ter no máximo 5 MB."

    };
  }


  return {

    valid:
      true,

    file

  };
}


/* ============================================================
   PREVIEW DA CAPA
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


  image.src =
    state.coverObjectUrl;


  image.alt =
    "Pré-visualização da capa";


  image.className =
    "campaign-cover-upload__image";


  preview.replaceChildren(
    image
  );
}


/* ============================================================
   UPLOAD DA CAPA
   ============================================================ */

async function uploadCampaignCover(
  file,
  campaignId
) {

  if (!file) {

    return null;
  }


  const validation =
    validateCover(
      file
    );


  if (
    !validation.valid
  ) {

    throw new Error(
      validation.message
    );
  }


  /*
   * Extensão derivada do MIME.
   * Não confiamos diretamente no nome do arquivo.
   */

  const extensionMap = {

    "image/jpeg":
      "jpg",

    "image/png":
      "png",

    "image/webp":
      "webp"

  };


  const extension =
    extensionMap[
      file.type
    ];


  if (!extension) {

    throw new Error(
      "Tipo de imagem não suportado."
    );
  }


  /*
   * Caminho determinístico.
   *
   * O bucket deve possuir RLS/Storage Policies
   * compatíveis com a campanha.
   */

  const path =
    `${state.user.id}/campaigns/${campaignId}/cover.${extension}`;


  const {
    error
  } =
    await state.supabase.storage

      .from(
        "campaigns"
      )

      .upload(
        path,
        file,
        {

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
          "js/campanhas.js",

        function:
          "uploadCampaignCover",

        table:
          "storage.objects",

        operation:
          "upload"

      }
    );
  }


  /*
   * A URL será usada conforme a configuração do bucket.
   *
   * Se o bucket for privado, futuramente devemos trocar
   * isso por signed URLs.
   */

  const {
    data:
      publicData
  } =
    state.supabase.storage

      .from(
        "campaigns"
      )

      .getPublicUrl(
        path
      );


  return publicData?.publicUrl ||
    null;
}


/* ============================================================
   ATUALIZAR URL DA CAPA
   ============================================================ */

async function updateCampaignCover(
  campaignId,
  coverUrl
) {

  if (
    !campaignId ||
    !coverUrl
  ) {

    return;
  }


  const {
    error
  } =
    await state.supabase

      .from(
        "campaigns"
      )

      .update({

        cover_url:
          coverUrl

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
          "js/campanhas.js",

        function:
          "updateCampaignCover",

        table:
          "campaigns",

        operation:
          "update"

      }
    );
  }
}


/* ============================================================
   CRIAR CAMPANHA
   ============================================================ */

async function createCampaign(
  event
) {

  event.preventDefault();


  if (
    state.isCreating
  ) {

    return;
  }


  if (
    !state.user
  ) {

    showCreateMessage(
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


  const file =
    coverInput?.files?.[0] ||
    null;


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
        `O nome deve ter no máximo ${CONFIG.MAX_NAME_LENGTH} caracteres.`;
    }


    return;
  }


  if (
    description.length >
    CONFIG.MAX_DESCRIPTION_LENGTH
  ) {

    if (descriptionError) {

      descriptionError.textContent =
        `A descrição deve ter no máximo ${CONFIG.MAX_DESCRIPTION_LENGTH} caracteres.`;
    }


    return;
  }


  const coverValidation =
    validateCover(
      file
    );


  if (
    !coverValidation.valid
  ) {

    if (coverError) {

      coverError.textContent =
        coverValidation.message;
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
     * create_campaign cria:
     *
     * 1. campaigns
     * 2. campaign_members
     * 3. campaign_session
     *
     * no PostgreSQL.
     *
     * O frontend não controla o role.
     */

    const {
      data:
        campaign,
      error
    } =
      await state.supabase.rpc(
        "create_campaign",
        {

          p_name:
            name,

          p_description:
            description ||
            null

        }
      );


    if (error) {

      throw normalizeError(
        error,
        {

          file:
            "js/campanhas.js",

          function:
            "createCampaign",

          table:
            "campaigns",

          operation:
            "rpc:create_campaign"

        }
      );
    }


    /*
     * Algumas funções RPC retornam diretamente um objeto,
     * outras podem retornar uma linha.
     */

    const createdCampaign =
      Array.isArray(campaign)
        ? campaign[0]
        : campaign;


    const campaignId =
      createdCampaign?.id;


    if (!campaignId) {

      throw new Error(
        "A campanha foi criada, mas o banco não retornou seu ID."
      );
    }


    /*
     * Upload da capa acontece depois da criação,
     * pois precisamos do ID da campanha para o caminho.
     */

    if (file) {

      try {

        const coverUrl =
          await uploadCampaignCover(
            file,
            campaignId
          );


        if (coverUrl) {

          await updateCampaignCover(
            campaignId,
            coverUrl
          );
        }

      } catch (uploadError) {

        /*
         * A campanha já existe.
         *
         * Não apagamos automaticamente a campanha.
         * Informamos claramente que apenas a capa falhou.
         */

        log(
          "error",
          "Campanha criada, mas o upload da capa falhou.",
          uploadError
        );


        showCreateMessage(
          "Campanha criada, mas não foi possível enviar a capa.",
          "error"
        );


        await loadCampaigns();


        return;
      }
    }


    /*
     * Atualiza lista.
     */

    await loadCampaigns();


    showCreateMessage(
      "Campanha criada com sucesso.",
      "success"
    );


    showToast(
      "Campanha criada com sucesso.",
      "success"
    );


    /*
     * Fecha modal depois de uma pequena pausa
     * para permitir que a mensagem seja percebida.
     */

    window.setTimeout(
      () => {

        closeCreateModal();

      },
      500
    );

  } catch (error) {

    log(
      "error",
      "Erro ao criar campanha.",
      error
    );


    showCreateMessage(
      error?.message ||
      "Não foi possível criar a campanha.",
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
   LOADING DO FORM
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
    loading;


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
      loading;
  }


  if (loadingElement) {

    loadingElement.hidden =
      !loading;
  }
}


/* ============================================================
   MENSAGEM DE CRIAÇÃO
   ============================================================ */

function showCreateMessage(
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
    false;
}


/* ============================================================
   MODAL CRIAÇÃO
   ============================================================ */

function openCreateModal() {

  const modal =
    $("campaign-create-modal");


  if (!modal) {

    return;
  }


  modal.hidden =
    false;


  state.modalOpen =
    "create";


  window.requestAnimationFrame(
    () => {

      $("campaign-name")?.focus();

    }
  );
}


function closeCreateModal() {

  const modal =
    $("campaign-create-modal");


  if (modal) {

    modal.hidden =
      true;
  }


  state.modalOpen =
    null;


  const form =
    $("campaign-create-form");


  if (form) {

    form.reset();
  }


  clearCoverPreview();


  [
    "campaign-name-error",
    "campaign-description-error",
    "campaign-cover-error"
  ]
    .forEach(
      id => {

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


  setCreateLoading(
    false
  );
}


/* ============================================================
   CONVITE
   ============================================================ */

async function generateInvite(
  campaign
) {

  if (
    state.isGeneratingInvite
  ) {

    return;
  }


  if (
    !campaign?.id
  ) {

    return;
  }


  /*
   * Só permitimos abrir a interface de convite para
   * campanhas que o estado atual identifica como Master.
   *
   * O banco ainda deve reforçar isso.
   */

  if (
    campaign.role !==
    "master"
  ) {

    showToast(
      "Você não possui permissão de Mestre nesta campanha.",
      "error"
    );


    return;
  }


  state.isGeneratingInvite =
    true;


  try {

    /*
     * A função PostgreSQL é responsável por:
     *
     * - gerar código;
     * - armazenar hash;
     * - expiração;
     * - limite de uso;
     * - impedir colisões.
     */

    const {
      data,
      error
    } =
      await state.supabase.rpc(
        "generate_campaign_invite",
        {

          p_campaign_id:
            campaign.id,

          p_minutes:
            5,

          p_max_uses:
            10

        }
      );


    if (error) {

      throw normalizeError(
        error,
        {

          file:
            "js/campanhas.js",

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


    if (
      !invite
    ) {

      throw new Error(
        "O banco não retornou os dados do convite."
      );
    }


    state.selectedCampaign =
      campaign;


    state.selectedInvite =
      invite;


    renderInvite(
      campaign,
      invite
    );


    openInviteModal();

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

  } finally {

    state.isGeneratingInvite =
      false;
  }
}


/* ============================================================
   RENDER INVITE
   ============================================================ */

function renderInvite(
  campaign,
  invite
) {

  const campaignName =
    $("campaign-invite-campaign-name");


  const codeElement =
    $("campaign-invite-code");


  const linkElement =
    $("campaign-invite-link");


  const messageElement =
    $("campaign-invite-message");


  if (campaignName) {

    campaignName.textContent =
      campaign.name;
  }


  /*
   * O RPC deve retornar o código somente neste momento.
   *
   * Não buscamos novamente o código do banco.
   */

  const code =
    safeString(
      invite.code ||
      invite.invite_code ||
      invite.token
    );


  if (codeElement) {

    codeElement.textContent =
      code ||
      "-----";
  }


  const inviteLink =
    buildInviteLink(
      code
    );


  if (linkElement) {

    linkElement.value =
      inviteLink;
  }


  if (messageElement) {

    messageElement.hidden =
      true;

    messageElement.textContent =
      "";
  }


  renderQRCode(
    inviteLink
  );


  startInviteCountdown(
    invite.expires_at
  );
}


/* ============================================================
   LINK DO CONVITE
   ============================================================ */

function buildInviteLink(
  code
) {

  if (!code) {

    return "";
  }


  const url =
    new URL(
      "./entrar.html",
      window.location.href
    );


  url.searchParams.set(
    "code",
    code
  );


  return url.href;
}


/* ============================================================
   QR CODE
   ============================================================ */

function renderQRCode(
  value
) {

  const container =
    $("campaign-invite-qr");


  if (!container) {

    return;
  }


  container.replaceChildren();


  if (!value) {

    const placeholder =
      document.createElement(
        "div"
      );


    placeholder.className =
      "campaign-invite__qr-placeholder";


    placeholder.textContent =
      "QR";


    container.appendChild(
      placeholder
    );


    return;
  }


  /*
   * A geração visual do QR depende de uma biblioteca.
   *
   * Como estamos usando HTML/JS vanilla e não queremos
   * adicionar dependências sem necessidade, criamos aqui
   * um placeholder controlado.
   *
   * Na próxima etapa podemos conectar uma biblioteca QR
   * apropriada via CDN.
   */

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "campaign-invite__qr-code";


  const text =
    document.createElement(
      "span"
    );


  text.textContent =
    "QR";


  wrapper.appendChild(
    text
  );


  container.appendChild(
    wrapper
  );


  /*
   * Guarda o valor no DOM sem colocá-lo como HTML.
   */

  container.dataset.qrValue =
    value;
}


/* ============================================================
   CONTADOR DO CONVITE
   ============================================================ */

function stopInviteCountdown() {

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


function startInviteCountdown(
  expiresAt
) {

  stopInviteCountdown();


  const element =
    $("campaign-invite-expiration");


  if (!element) {

    return;
  }


  const update =
    () => {

      const end =
        new Date(
          expiresAt
        ).getTime();


      const remaining =
        end -
        Date.now();


      if (
        !Number.isFinite(
          remaining
        ) ||
        remaining <= 0
      ) {

        element.textContent =
          "Convite expirado";


        element.dataset.expired =
          "true";


        stopInviteCountdown();


        return;
      }


      const totalSeconds =
        Math.floor(
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


      element.dataset.expired =
        "false";


      element.textContent =
        `Expira em ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };


  update();


  state.inviteTimer =
    window.setInterval(
      update,
      1000
    );
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


  state.modalOpen =
    "invite";
}


function closeInviteModal() {

  const modal =
    $("campaign-invite-modal");


  if (modal) {

    modal.hidden =
      true;
  }


  stopInviteCountdown();


  state.modalOpen =
    null;


  state.selectedInvite =
    null;


  state.selectedCampaign =
    null;
}


/* ============================================================
   COPIAR
   ============================================================ */

async function copyText(
  text,
  successMessage
) {

  if (!text) {

    showToast(
      "Não há conteúdo para copiar.",
      "error"
    );


    return;
  }


  try {

    await navigator.clipboard.writeText(
      text
    );


    showToast(
      successMessage,
      "success"
    );

  } catch (error) {

    log(
      "warn",
      "Clipboard API indisponível.",
      error
    );


    /*
     * Fallback simples.
     */

    const textarea =
      document.createElement(
        "textarea"
      );


    textarea.value =
      text;


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

  const element =
    $("campaign-invite-code");


  const code =
    element?.textContent?.trim();


  if (
    !code ||
    code === "-----"
  ) {

    return;
  }


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
    input?.value?.trim();


  await copyText(
    link,
    "Convite copiado."
  );
}


/* ============================================================
   COMPARTILHAR
   ============================================================ */

async function shareInvite() {

  const campaign =
    state.selectedCampaign;


  const input =
    $("campaign-invite-link");


  const link =
    input?.value?.trim();


  const code =
    $("campaign-invite-code")
      ?.textContent
      ?.trim();


  if (!link) {

    return;
  }


  const shareData = {

    title:
      campaign
        ? `Convite para ${campaign.name}`
        : "Convite AERIOM",

    text:
      code
        ? `Entre na minha campanha AERIOM usando o código ${code}.`
        : "Você foi convidado para uma campanha no AERIOM.",

    url:
      link

  };


  try {

    if (
      navigator.share
    ) {

      await navigator.share(
        shareData
      );


      return;
    }


    await copyText(
      link,
      "Link copiado. Agora você pode enviar pelo WhatsApp ou Discord."
    );

  } catch (error) {

    /*
     * Cancelamento pelo usuário não deve virar erro visual.
     */

    if (
      error?.name ===
      "AbortError"
    ) {

      return;
    }


    log(
      "warn",
      "Falha no compartilhamento.",
      error
    );


    await copyText(
      link,
      "Link copiado."
    );
  }
}


/* ============================================================
   ABRIR CAMPANHA
   ============================================================ */

function openCampaign(
  campaignId
) {

  const campaign =
    state.campaigns.find(
      item =>
        item.id ===
        String(
          campaignId
        )
    );


  if (!campaign) {

    showToast(
      "Campanha não encontrada.",
      "error"
    );


    return;
  }


  /*
   * LocalStorage serve apenas como conveniência de navegação.
   * Não é autorização.
   */

  try {

    localStorage.setItem(
      "aeriom_active_campaign",
      campaign.id
    );

  } catch {

    /*
     * Não impede navegação.
     */
  }


  const url =
    new URL(
      CONFIG.CAMPAIGN_PAGE,
      window.location.href
    );


  url.searchParams.set(
    "id",
    campaign.id
  );


  window.location.href =
    url.href;
}


/* ============================================================
   LOGOUT
   ============================================================ */

async function logout() {

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
            "js/campanhas.js",

          function:
            "logout",

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
      "Falha ao sair.",
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
   MENU MOBILE
   ============================================================ */

function setupMobileMenu() {

  const button =
    $("campaigns-mobile-menu-button");


  const sidebar =
    $("campaigns-sidebar");


  if (
    !button ||
    !sidebar
  ) {

    return;
  }


  button.addEventListener(
    "click",
    () => {

      const isOpen =
        sidebar.classList.toggle(
          "is-open"
        );


      button.setAttribute(
        "aria-expanded",
        String(
          isOpen
        )
      );

    }
  );
}


/* ============================================================
   FECHAR MENU
   ============================================================ */

function closeMobileMenu() {

  const sidebar =
    $("campaigns-sidebar");


  const button =
    $("campaigns-mobile-menu-button");


  sidebar?.classList.remove(
    "is-open"
  );


  button?.setAttribute(
    "aria-expanded",
    "false"
  );
}


/* ============================================================
   EVENTOS DA LISTA
   ============================================================ */

function setupCampaignList() {

  const list =
    $("campaigns-list");


  if (!list) {

    return;
  }


  list.addEventListener(
    "click",
    event => {

      const target =
        event.target instanceof
        Element
          ? event.target
          : null;


      const actionElement =
        target?.closest(
          "[data-action]"
        );


      if (!actionElement) {

        return;
      }


      const action =
        actionElement.dataset.action;


      const campaignId =
        actionElement.dataset.campaignId;


      if (
        action ===
        "open-campaign"
      ) {

        openCampaign(
          campaignId
        );


        return;
      }


      if (
        action ===
        "create-invite"
      ) {

        const campaign =
          state.campaigns.find(
            item =>
              item.id ===
              String(
                campaignId
              )
          );


        if (campaign) {

          generateInvite(
            campaign
          );
        }

      }

    }
  );
}


/* ============================================================
   EVENTOS DO MODAL DE CRIAÇÃO
   ============================================================ */

function setupCreateModal() {

  $("campaigns-create-button")
    ?.addEventListener(
      "click",
      openCreateModal
    );


  $("campaigns-empty-create-button")
    ?.addEventListener(
      "click",
      openCreateModal
    );


  $("campaign-create-close")
    ?.addEventListener(
      "click",
      closeCreateModal
    );


  $("campaign-create-cancel")
    ?.addEventListener(
      "click",
      closeCreateModal
    );


  $("campaign-create-form")
    ?.addEventListener(
      "submit",
      createCampaign
    );


  $("campaign-cover")
    ?.addEventListener(
      "change",
      event => {

        const input =
          event.currentTarget;


        const file =
          input?.files?.[0];


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


        const validation =
          validateCover(
            file
          );


        if (
          !validation.valid
        ) {

          if (error) {

            error.textContent =
              validation.message;
          }


          input.value =
            "";


          clearCoverPreview();


          return;
        }


        previewCover(
          file
        );

      }
    );


  $("campaign-create-modal")
    ?.addEventListener(
      "click",
      event => {

        const target =
          event.target instanceof
          Element
            ? event.target
            : null;


        if (
          target?.dataset.modalClose ===
          "true"
        ) {

          closeCreateModal();
        }

      }
    );
}


/* ============================================================
   EVENTOS DO MODAL DE CONVITE
   ============================================================ */

function setupInviteModal() {

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


  $("campaign-invite-modal")
    ?.addEventListener(
      "click",
      event => {

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
}


/* ============================================================
   RETRY
   ============================================================ */

function setupRetry() {

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
}


/* ============================================================
   JOIN
   ============================================================ */

function setupJoinButton() {

  $("campaigns-join-button")
    ?.addEventListener(
      "click",
      () => {

        /*
         * A página entrar.html será criada quando
         * implementarmos definitivamente o fluxo de convite.
         */

        window.location.href =
          "./entrar.html";

      }
    );
}


/* ============================================================
   LINKS FUTUROS
   ============================================================ */

function setupComingSoon() {

  document
    .querySelectorAll(
      "[data-coming-soon=\"true\"]"
    )
    .forEach(
      element => {

        element.addEventListener(
          "click",
          event => {

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
   TECLADO
   ============================================================ */

function setupKeyboard() {

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key !==
        "Escape"
      ) {

        return;
      }


      if (
        state.modalOpen ===
        "create"
      ) {

        closeCreateModal();


        return;
      }


      if (
        state.modalOpen ===
        "invite"
      ) {

        closeInviteModal();


        return;
      }


      closeMobileMenu();

    }
  );
}


/* ============================================================
   RESIZE
   ============================================================ */

function setupResize() {

  window.addEventListener(
    "resize",
    () => {

      if (
        window.innerWidth >
        900
      ) {

        closeMobileMenu();
      }

    }
  );
}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function initialize() {

  log(
    "info",
    "Inicializando campanhas..."
  );


  /*
   * Supabase.
   */

  try {

    state.supabase =
      await getSupabase();

  } catch (error) {

    log(
      "error",
      "Não foi possível inicializar o Supabase.",
      error
    );


    showError(
      "Não foi possível conectar ao AERIOM."
    );


    return;
  }


  /*
   * Sessão.
   */

  try {

    const user =
      await loadSession();


    if (!user) {

      return;
    }

  } catch (error) {

    log(
      "error",
      "Falha ao verificar sessão.",
      error
    );


    window.location.replace(
      CONFIG.LOGIN_PAGE
    );


    return;
  }


  /*
   * Eventos.
   */

  setupMobileMenu();

  setupCampaignList();

  setupCreateModal();

  setupInviteModal();

  setupRetry();

  setupJoinButton();

  setupComingSoon();

  setupKeyboard();

  setupResize();


  /*
   * Campanhas.
   */

  await loadCampaigns();


  log(
    "info",
    "Página de campanhas pronta."
  );
}


/* ============================================================
   START
   ============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    {
      once:
        true
    }
  );

} else {

  initialize();

}