/*
 * ============================================================
 * AERIOM v2
 * js/campanhas.js
 * ============================================================
 *
 * Página de seleção e criação de campanhas.
 *
 * Responsabilidades:
 *
 * - Obter sessão do usuário.
 * - Carregar campanhas do usuário.
 * - Identificar papel na campanha.
 * - Renderizar campanhas.
 * - Criar campanha.
 * - Adicionar criador como Master.
 * - Abrir campanha.
 * - Logout.
 * - Estados loading / empty / error.
 * - Modal de criação.
 * - Menu mobile.
 *
 * Segurança:
 *
 * O JavaScript NÃO é responsável por autorização.
 * RLS no Supabase é a autoridade real.
 *
 * ============================================================
 */


/* ============================================================
   IMPORTS
   ============================================================ */

import {
  getSupabase,
  normalizeSupabaseError
} from "./core/supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CAMPAIGNS_CONFIG = Object.freeze({

  campaignPage:
    "./campanha.html",

  loginPage:
    "./index.html",

  maxNameLength:
    120,

  maxDescriptionLength:
    1000

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  user:
    null,

  campaigns:
    [],

  isLoading:
    false,

  isCreating:
    false,

  supabase:
    null,

  modalOpen:
    false

};


/* ============================================================
   HELPERS
   ============================================================ */

function getElement(
  id
) {

  return document.getElementById(
    id
  );
}


/* ============================================================
   LOG
   ============================================================ */

function logCampaigns(
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

    return error;
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
    getElement(
      "aeriom-toast-region"
    );


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


  /*
   * Dados externos nunca são inseridos com innerHTML.
   */

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
   ESTADOS DA PÁGINA
   ============================================================ */

function hideAllCampaignStates() {

  const loading =
    getElement(
      "campaigns-loading"
    );


  const empty =
    getElement(
      "campaigns-empty"
    );


  const error =
    getElement(
      "campaigns-error"
    );


  const list =
    getElement(
      "campaigns-list-section"
    );


  if (loading) {

    loading.hidden =
      true;
  }


  if (empty) {

    empty.hidden =
      true;
  }


  if (error) {

    error.hidden =
      true;
  }


  if (list) {

    list.hidden =
      true;
  }
}


function showLoadingState() {

  hideAllCampaignStates();


  const loading =
    getElement(
      "campaigns-loading"
    );


  if (loading) {

    loading.hidden =
      false;
  }
}


function showEmptyState() {

  hideAllCampaignStates();


  const empty =
    getElement(
      "campaigns-empty"
    );


  if (empty) {

    empty.hidden =
      false;
  }
}


function showErrorState(
  message
) {

  hideAllCampaignStates();


  const error =
    getElement(
      "campaigns-error"
    );


  const errorMessage =
    getElement(
      "campaigns-error-message"
    );


  if (errorMessage) {

    errorMessage.textContent =
      message ||
      "Tente novamente em alguns instantes.";
  }


  if (error) {

    error.hidden =
      false;
  }
}


function showListState() {

  hideAllCampaignStates();


  const list =
    getElement(
      "campaigns-list-section"
    );


  if (list) {

    list.hidden =
      false;
  }
}


/* ============================================================
   VALORES SEGUROS
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


function safeRole(
  role
) {

  if (
    role === "master"
  ) {

    return "master";
  }


  return "player";
}


/* ============================================================
   CAMPANHA NORMALIZADA
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
    row.campaign ||
    row.campaigns ||
    row;


  if (
    !campaign ||
    typeof campaign !== "object"
  ) {

    return null;
  }


  if (
    !campaign.id
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
        campaign.description,
        ""
      ),

    coverUrl:
      safeString(
        campaign.cover_url,
        ""
      ),

    createdBy:
      campaign.created_by
        ? String(
            campaign.created_by
          )
        : null,

    role:
      safeRole(
        row.role
      ),

    createdAt:
      campaign.created_at ||
      null,

    updatedAt:
      campaign.updated_at ||
      null

  };
}


/* ============================================================
   FORMATAR DATA
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


/* ============================================================
   URL DE CAPA
   ============================================================ */

function isAllowedImageUrl(
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


    /*
     * Permitimos somente http/https.
     *
     * Evita javascript:, data: e outros esquemas.
     */

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );

  } catch {

    return false;
  }
}


/* ============================================================
   CRIAR ELEMENTO DE CAMPANHA
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


  /* ==========================================================
     CAPA
     ========================================================== */

  const cover =
    document.createElement(
      "div"
    );


  cover.className =
    "campaign-card__cover";


  /*
   * Somente URLs http/https.
   */

  if (
    isAllowedImageUrl(
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


    symbol.setAttribute(
      "aria-hidden",
      "true"
    );


    symbol.textContent =
      "✦";


    cover.appendChild(
      symbol
    );
  }


  /* ==========================================================
     CONTEÚDO
     ========================================================== */

  const content =
    document.createElement(
      "div"
    );


  content.className =
    "campaign-card__content";


  /* ---------- role ---------- */

  const role =
    document.createElement(
      "span"
    );


  role.className =
    "campaign-card__role";


  role.dataset.role =
    campaign.role;


  role.textContent =
    campaign.role ===
    "master"
      ? "Mestre"
      : "Aventureiro";


  /* ---------- título ---------- */

  const title =
    document.createElement(
      "h3"
    );


  title.className =
    "campaign-card__title";


  title.textContent =
    campaign.name;


  /* ---------- descrição ---------- */

  const description =
    document.createElement(
      "p"
    );


  description.className =
    "campaign-card__description";


  description.textContent =
    campaign.description ||
    "Uma nova aventura aguarda o grupo.";


  /* ---------- footer ---------- */

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


  const openButton =
    document.createElement(
      "button"
    );


  openButton.type =
    "button";


  openButton.className =
    "campaign-card__open";


  openButton.textContent =
    "Entrar na mesa";


  openButton.dataset.action =
    "open-campaign";


  openButton.dataset.campaignId =
    campaign.id;


  footer.append(
    date,
    openButton
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

  const container =
    getElement(
      "campaigns-list"
    );


  if (!container) {

    throw new Error(
      "Elemento #campaigns-list não encontrado."
    );
  }


  /*
   * Limpeza controlada do container.
   *
   * Não inserimos HTML externo.
   */

  container.replaceChildren();


  if (
    state.campaigns.length ===
    0
  ) {

    showEmptyState();

    return;
  }


  const fragment =
    document.createDocumentFragment();


  for (
    const campaign
    of state.campaigns
  ) {

    const card =
      createCampaignCard(
        campaign
      );


    fragment.appendChild(
      card
    );
  }


  container.appendChild(
    fragment
  );


  showListState();
}


/* ============================================================
   USUÁRIO
   ============================================================ */

function renderUser(
  user
) {

  const nameElement =
    getElement(
      "campaigns-user-name"
    );


  const emailElement =
    getElement(
      "campaigns-user-email"
    );


  const avatarElement =
    getElement(
      "campaigns-user-avatar"
    );


  const metadata =
    user?.user_metadata ||
    {};


  const displayName =
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Aventureiro";


  const email =
    user?.email ||
    "";


  if (nameElement) {

    nameElement.textContent =
      displayName;
  }


  if (emailElement) {

    emailElement.textContent =
      email;
  }


  if (avatarElement) {

    /*
     * Por enquanto usamos inicial.
     *
     * Avatar real será tratado posteriormente
     * com Supabase Storage.
     */

    avatarElement.textContent =
      displayName
        .trim()
        .charAt(0)
        .toUpperCase() ||
      "?";
  }
}


/* ============================================================
   CARREGAR SESSÃO
   ============================================================ */

async function loadCurrentUser() {

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
          "campanhas.js",

        function:
          "loadCurrentUser",

        table:
          "auth.sessions",

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
      CAMPAIGNS_CONFIG.loginPage
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


  showLoadingState();


  try {

    /*
     * A consulta parte de campaign_members.
     *
     * O usuário NÃO envia user_id.
     *
     * O filtro é aplicado usando o UUID da sessão atual.
     *
     * A segurança definitiva continua no RLS.
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
            "campanhas.js",

          function:
            "loadCampaigns",

          table:
            "campaign_members",

          operation:
            "select"

        }
      );
    }


    const normalized =
      Array.isArray(
        data
      )
        ? data
            .map(
              normalizeCampaign
            )
            .filter(
              Boolean
            )
        : [];


    state.campaigns =
      normalized;


    renderCampaigns();

  } catch (error) {

    const normalized =
      normalizeError(
        error,
        {

          file:
            "campanhas.js",

          function:
            "loadCampaigns",

          table:
            "campaign_members",

          operation:
            "select"

        }
      );


    logCampaigns(
      "error",
      "Erro ao carregar campanhas.",
      normalized
    );


    showErrorState(
      "Não foi possível consultar suas campanhas. Verifique sua conexão e tente novamente."
    );

  } finally {

    state.isLoading =
      false;
  }
}


/* ============================================================
   ABRIR CAMPANHA
   ============================================================ */

function openCampaign(
  campaignId
) {

  if (
    !campaignId
  ) {

    return;
  }


  const campaign =
    state.campaigns.find(
      item =>
        item.id ===
        String(
          campaignId
        )
    );


  /*
   * Não abrimos uma campanha que não veio da consulta
   * autorizada do usuário.
   *
   * A autorização real continua sendo RLS na página
   * da própria campanha.
   */

  if (!campaign) {

    showToast(
      "Campanha não encontrada.",
      "error"
    );


    return;
  }


  /*
   * Referência de navegação.
   *
   * Não é mecanismo de autorização.
   */

  try {

    window.localStorage.setItem(
      "aeriom_active_campaign",
      campaign.id
    );

  } catch {

    /*
     * LocalStorage pode estar indisponível.
     * Isso não impede a navegação.
     */

  }


  const params =
    new URLSearchParams();


  params.set(
    "id",
    campaign.id
  );


  window.location.href =
    `${CAMPAIGNS_CONFIG.campaignPage}?${params.toString()}`;
}


/* ============================================================
   MODAL
   ============================================================ */

function openCreateModal() {

  const modal =
    getElement(
      "campaign-create-modal"
    );


  if (!modal) {

    return;
  }


  modal.hidden =
    false;


  state.modalOpen =
    true;


  const nameInput =
    getElement(
      "campaign-name"
    );


  window.requestAnimationFrame(
    () => {

      nameInput?.focus();

    }
  );
}


function closeCreateModal() {

  const modal =
    getElement(
      "campaign-create-modal"
    );


  if (!modal) {

    return;
  }


  modal.hidden =
    true;


  state.modalOpen =
    false;


  clearCreateCampaignForm();
}


/* ============================================================
   LIMPAR FORM
   ============================================================ */

function clearCreateCampaignForm() {

  const form =
    getElement(
      "campaign-create-form"
    );


  const message =
    getElement(
      "campaign-create-message"
    );


  const nameError =
    getElement(
      "campaign-name-error"
    );


  const descriptionError =
    getElement(
      "campaign-description-error"
    );


  if (form) {

    form.reset();
  }


  if (message) {

    message.hidden =
      true;

    message.textContent =
      "";

    message.removeAttribute(
      "data-type"
    );
  }


  if (nameError) {

    nameError.textContent =
      "";
  }


  if (descriptionError) {

    descriptionError.textContent =
      "";
  }
}


/* ============================================================
   MENSAGEM DO MODAL
   ============================================================ */

function showCreateMessage(
  message,
  type = "error"
) {

  const element =
    getElement(
      "campaign-create-message"
    );


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
   VALIDAR CAMPANHA
   ============================================================ */

function validateCampaignForm() {

  const nameInput =
    getElement(
      "campaign-name"
    );


  const descriptionInput =
    getElement(
      "campaign-description"
    );


  const nameError =
    getElement(
      "campaign-name-error"
    );


  const descriptionError =
    getElement(
      "campaign-description-error"
    );


  if (nameError) {

    nameError.textContent =
      "";
  }


  if (descriptionError) {

    descriptionError.textContent =
      "";
  }


  const name =
    String(
      nameInput?.value ?? ""
    ).trim();


  const description =
    String(
      descriptionInput?.value ?? ""
    ).trim();


  let valid =
    true;


  if (!name) {

    if (nameError) {

      nameError.textContent =
        "Digite o nome da campanha.";
    }


    valid =
      false;

  } else if (
    name.length >
    CAMPAIGNS_CONFIG.maxNameLength
  ) {

    if (nameError) {

      nameError.textContent =
        `O nome deve ter no máximo ${CAMPAIGNS_CONFIG.maxNameLength} caracteres.`;
    }


    valid =
      false;
  }


  if (
    description.length >
    CAMPAIGNS_CONFIG.maxDescriptionLength
  ) {

    if (descriptionError) {

      descriptionError.textContent =
        `A descrição deve ter no máximo ${CAMPAIGNS_CONFIG.maxDescriptionLength} caracteres.`;
    }


    valid =
      false;
  }


  return {

    valid,

    name,

    description

  };
}


/* ============================================================
   LOADING DO BOTÃO
   ============================================================ */

function setCreateButtonLoading(
  loading
) {

  const button =
    getElement(
      "campaign-create-submit"
    );


  if (!button) {

    return;
  }


  const label =
    button.querySelector(
      ".button__label"
    );


  const loadingElement =
    button.querySelector(
      ".button__loading"
    );


  button.disabled =
    loading;


  button.classList.toggle(
    "is-loading",
    loading
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


  const validation =
    validateCampaignForm();


  if (
    !validation.valid
  ) {

    return;
  }


  state.isCreating =
    true;


  setCreateButtonLoading(
    true
  );


  try {

    /*
     * ========================================================
     * PASSO 1
     * Criar campanha.
     *
     * created_by vem do usuário autenticado.
     * ========================================================
     */

    const {
      data:
        campaign,
      error:
        campaignError
    } =
      await state.supabase

        .from(
          "campaigns"
        )

        .insert({

          name:
            validation.name,

          description:
            validation.description || null,

          created_by:
            state.user.id

        })

        .select(
          `
          id,
          name,
          description,
          cover_url,
          created_by,
          created_at,
          updated_at
          `
        )

        .single();


    if (
      campaignError
    ) {

      throw normalizeError(
        campaignError,
        {

          file:
            "campanhas.js",

          function:
            "createCampaign",

          table:
            "campaigns",

          operation:
            "insert"

        }
      );
    }


    if (
      !campaign?.id
    ) {

      throw new Error(
        "O Supabase não retornou o ID da campanha criada."
      );
    }


    /*
     * ========================================================
     * PASSO 2
     * Adicionar criador como MASTER.
     *
     * IMPORTANTE:
     *
     * O RLS deve garantir que somente o criador possa
     * executar esta operação.
     *
     * Futuramente podemos mover esta operação para uma
     * função PostgreSQL transacional para que campanha +
     * membro sejam atômicos.
     * ========================================================
     */

    const {
      error:
        memberError
    } =
      await state.supabase

        .from(
          "campaign_members"
        )

        .insert({

          campaign_id:
            campaign.id,

          user_id:
            state.user.id,

          role:
            "master"

        });


    if (
      memberError
    ) {

      /*
       * A campanha já foi criada.
       *
       * Não fingimos que tudo foi concluído.
       *
       * Registramos o erro e informamos claramente.
       */

      const normalized =
        normalizeError(
          memberError,
          {

            file:
              "campanhas.js",

            function:
              "createCampaign",

            table:
              "campaign_members",

            operation:
              "insert"

          }
        );


      logCampaigns(
        "error",
        "Campanha criada, mas falhou ao adicionar o criador como Master.",
        normalized
      );


      throw new Error(
        "A campanha foi criada, mas não conseguimos configurar seu acesso de Mestre. Não tente criar outra ainda."
      );
    }


    /*
     * Atualiza lista.
     */

    showCreateMessage(
      "Campanha criada com sucesso.",
      "success"
    );


    await loadCampaigns();


    window.setTimeout(
      () => {

        closeCreateModal();

      },
      500
    );

  } catch (error) {

    const normalized =
      normalizeError(
        error,
        {

          file:
            "campanhas.js",

          function:
            "createCampaign",

          table:
            "campaigns",

          operation:
            "insert"

        }
      );


    logCampaigns(
      "error",
      "Erro ao criar campanha.",
      normalized
    );


    showCreateMessage(
      normalized?.message ||
      "Não foi possível criar a campanha.",
      "error"
    );

  } finally {

    state.isCreating =
      false;


    setCreateButtonLoading(
      false
    );
  }
}


/* ============================================================
   LOGOUT
   ============================================================ */

async function handleLogout() {

  const button =
    getElement(
      "campaigns-logout-button"
    );


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
            "campanhas.js",

          function:
            "handleLogout",

          table:
            "auth.sessions",

          operation:
            "signOut"

        }
      );
    }


    window.location.replace(
      CAMPAIGNS_CONFIG.loginPage
    );

  } catch (error) {

    logCampaigns(
      "error",
      "Erro ao sair da conta.",
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
    getElement(
      "campaigns-mobile-menu-button"
    );


  const sidebar =
    getElement(
      "campaigns-sidebar"
    );


  if (
    !button ||
    !sidebar
  ) {

    return;
  }


  button.addEventListener(
    "click",
    () => {

      const opened =
        sidebar.classList.toggle(
          "is-open"
        );


      button.setAttribute(
        "aria-expanded",
        String(
          opened
        )
      );

    }
  );
}


/* ============================================================
   FECHAR MENU MOBILE AO NAVEGAR
   ============================================================ */

function closeMobileMenu() {

  const sidebar =
    getElement(
      "campaigns-sidebar"
    );


  const button =
    getElement(
      "campaigns-mobile-menu-button"
    );


  if (sidebar) {

    sidebar.classList.remove(
      "is-open"
    );
  }


  if (button) {

    button.setAttribute(
      "aria-expanded",
      "false"
    );
  }
}


/* ============================================================
   EVENTOS DA LISTA
   ============================================================ */

function setupCampaignListEvents() {

  const list =
    getElement(
      "campaigns-list"
    );


  if (!list) {

    return;
  }


  list.addEventListener(
    "click",
    (event) => {

      const target =
        event.target instanceof
        Element
          ? event.target
          : null;


      const button =
        target?.closest(
          "[data-action=\"open-campaign\"]"
        );


      if (!button) {

        return;
      }


      const campaignId =
        button.dataset.campaignId;


      openCampaign(
        campaignId
      );

    }
  );
}


/* ============================================================
   LINKS EM DESENVOLVIMENTO
   ============================================================ */

function setupComingSoonLinks() {

  const links =
    document.querySelectorAll(
      "[data-coming-soon=\"true\"]"
    );


  links.forEach(
    link => {

      link.addEventListener(
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
   MODAL EVENTS
   ============================================================ */

function setupModalEvents() {

  const createButton =
    getElement(
      "campaigns-create-button"
    );


  const emptyCreateButton =
    getElement(
      "campaigns-empty-create-button"
    );


  const closeButton =
    getElement(
      "campaign-create-close"
    );


  const cancelButton =
    getElement(
      "campaign-create-cancel"
    );


  const modal =
    getElement(
      "campaign-create-modal"
    );


  const form =
    getElement(
      "campaign-create-form"
    );


  if (createButton) {

    createButton.addEventListener(
      "click",
      openCreateModal
    );
  }


  if (emptyCreateButton) {

    emptyCreateButton.addEventListener(
      "click",
      openCreateModal
    );
  }


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      closeCreateModal
    );
  }


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      closeCreateModal
    );
  }


  if (modal) {

    modal.addEventListener(
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


  if (form) {

    form.addEventListener(
      "submit",
      createCampaign
    );
  }
}


/* ============================================================
   TECLA ESC
   ============================================================ */

function setupKeyboardEvents() {

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape" &&
        state.modalOpen
      ) {

        closeCreateModal();

        return;
      }


      if (
        event.key ===
        "Escape"
      ) {

        closeMobileMenu();
      }

    }
  );
}


/* ============================================================
   RETRY
   ============================================================ */

function setupRetry() {

  const button =
    getElement(
      "campaigns-retry-button"
    );


  if (!button) {

    return;
  }


  button.addEventListener(
    "click",
    async () => {

      if (
        state.isLoading
      ) {

        return;
      }


      await loadCampaigns();

    }
  );
}


/* ============================================================
   JOIN CONVITE
   ============================================================ */

function setupJoinButton() {

  const button =
    getElement(
      "campaigns-join-button"
    );


  if (!button) {

    return;
  }


  /*
   * O sistema de convites será implementado na etapa
   * específica de convites.
   *
   * Não inventamos lógica de convite aqui.
   */

  button.addEventListener(
    "click",
    () => {

      showToast(
        "O sistema de convites será habilitado em uma próxima etapa.",
        "info"
      );

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

async function initializeCampaignsPage() {

  logCampaigns(
    "info",
    "Inicializando página de campanhas..."
  );


  /*
   * Supabase.
   */

  try {

    state.supabase =
      await getSupabase();

  } catch (error) {

    logCampaigns(
      "error",
      "Não foi possível obter o cliente Supabase.",
      error
    );


    showErrorState(
      "Não foi possível conectar ao serviço de autenticação."
    );


    return;
  }


  /*
   * Sessão.
   */

  try {

    const user =
      await loadCurrentUser();


    if (!user) {

      return;
    }

  } catch (error) {

    const normalized =
      normalizeError(
        error,
        {

          file:
            "campanhas.js",

          function:
            "initializeCampaignsPage",

          table:
            "auth.sessions",

          operation:
            "getSession"

        }
      );


    logCampaigns(
      "error",
      "Erro ao verificar sessão.",
      normalized
    );


    window.location.replace(
      CAMPAIGNS_CONFIG.loginPage
    );


    return;
  }


  /*
   * Eventos.
   */

  setupMobileMenu();

  setupCampaignListEvents();

  setupComingSoonLinks();

  setupModalEvents();

  setupKeyboardEvents();

  setupRetry();

  setupJoinButton();

  setupResize();


  /*
   * Campanhas.
   */

  await loadCampaigns();


  logCampaigns(
    "info",
    "Página de campanhas inicializada."
  );
}


/* ============================================================
   START
   ============================================================ */

function start() {

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeCampaignsPage,
      {
        once:
          true
      }
    );


    return;
  }


  initializeCampaignsPage();
}


start();