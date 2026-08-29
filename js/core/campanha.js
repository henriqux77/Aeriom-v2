/*
 * ============================================================
 * AERIOM v2
 * js/core/campanha.js
 * Núcleo da mesa virtual
 * ============================================================
 *
 * Este arquivo é responsável por:
 *
 * - obter o ID da campanha pela URL;
 * - obter a sessão autenticada;
 * - carregar a campanha;
 * - validar a participação do usuário;
 * - descobrir se é Mestre ou Jogador;
 * - carregar membros;
 * - carregar sessão da mesa;
 * - carregar personagens presentes;
 * - renderizar a interface;
 * - controlar abas;
 * - controlar menu mobile;
 * - fornecer contexto para outros módulos;
 * - manter Realtime da campanha;
 *
 * ============================================================
 */

import {
  getSupabase,
  normalizeSupabaseError
} from "./supabase.js";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CAMPAIGN_CONFIG = Object.freeze({

  loginPage:
    "./index.html",

  campaignsPage:
    "./campanhas.html",

  campaignPage:
    "./campanha.html",

  defaultTheme:
    "default",

  maxCampaignIdLength:
    64,

  realtimeChannelPrefix:
    "campaign-core"

});


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

  initialized:
    false,

  initializing:
    false,

  supabase:
    null,

  user:
    null,

  profile:
    null,

  campaignId:
    null,

  campaign:
    null,

  membership:
    null,

  members:
    [],

  session:
    null,

  presentCharacters:
    [],

  activeTab:
    "overview",

  realtimeChannel:
    null,

  realtimeConnected:
    false,

  mobileMenuOpen:
    false,

  uiBound:
    false

};


/* ============================================================
   LOG
   ============================================================ */

function log(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][CAMPAIGN]";


  if (
    level ===
    "error"
  ) {

    console.error(
      prefix,
      message,
      details ?? ""
    );

    return;

  }


  if (
    level ===
    "warn"
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
   DOM
   ============================================================ */

function getElement(
  id
) {

  return document.getElementById(
    id
  );

}


function getElements(
  selector
) {

  if (
    typeof selector !==
    "string"
  ) {

    return [];

  }


  return Array.from(
    document.querySelectorAll(
      selector
    )
  );

}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  return typeof value ===
    "string"

    ? value

    : fallback;

}


function safeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )

    ? number

    : fallback;

}


function normalizeObject(
  value
) {

  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {

    return {};

  }


  return value;

}


function normalizeArray(
  value
) {

  return Array.isArray(
    value
  )

    ? value

    : [];

}


/* ============================================================
   ERRO
   ============================================================ */

function getNormalizedError(
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
   LOADING
   ============================================================ */

function showLoadingState() {

  const loading =
    getElement(
      "campaign-loading"
    );

  const workspace =
    getElement(
      "campaign-workspace"
    );

  const errorState =
    getElement(
      "campaign-error"
    );


  if (
    loading
  ) {

    loading.hidden =
      false;

  }


  if (
    workspace
  ) {

    workspace.hidden =
      true;

  }


  if (
    errorState
  ) {

    errorState.hidden =
      true;

  }

}


function showWorkspace() {

  const loading =
    getElement(
      "campaign-loading"
    );

  const workspace =
    getElement(
      "campaign-workspace"
    );

  const errorState =
    getElement(
      "campaign-error"
    );


  if (
    loading
  ) {

    loading.hidden =
      true;

  }


  if (
    workspace
  ) {

    workspace.hidden =
      false;

  }


  if (
    errorState
  ) {

    errorState.hidden =
      true;

  }

}


/* ============================================================
   ERRO VISUAL
   ============================================================ */

function showErrorState(
  message
) {

  const loading =
    getElement(
      "campaign-loading"
    );

  const workspace =
    getElement(
      "campaign-workspace"
    );

  const errorState =
    getElement(
      "campaign-error"
    );

  const errorMessage =
    getElement(
      "campaign-error-message"
    );


  if (
    loading
  ) {

    loading.hidden =
      true;

  }


  if (
    workspace
  ) {

    workspace.hidden =
      true;

  }


  if (
    errorMessage
  ) {

    errorMessage.textContent =
      message ||
      "Não foi possível abrir a campanha.";

  }


  if (
    errorState
  ) {

    errorState.hidden =
      false;

  }

}


/* ============================================================
   CAMPAIGN ID
   ============================================================ */

function getCampaignIdFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const raw =
    params.get(
      "campaign"
    );


  if (
    !raw
  ) {

    return null;

  }


  const campaignId =
    raw.trim();


  if (
    !campaignId
  ) {

    return null;

  }


  if (
    campaignId.length >
    CAMPAIGN_CONFIG.maxCampaignIdLength
  ) {

    return null;

  }


  return campaignId;

}


/* ============================================================
   REDIRECIONAMENTO
   ============================================================ */

function redirectToLogin() {

  window.location.replace(
    CAMPAIGN_CONFIG.loginPage
  );

}


function redirectToCampaigns() {

  window.location.replace(
    CAMPAIGN_CONFIG.campaignsPage
  );

}


/* ============================================================
   PERFIL
   ============================================================ */

async function loadProfile() {

  if (
    !state.user ||
    !state.supabase
  ) {

    return null;

  }


  try {

    const {
      data,
      error
    } =
      await state.supabase
        .from(
          "profiles"
        )
        .select(
          `
            id,
            display_name,
            avatar_path,
            created_at,
            updated_at
          `
        )
        .eq(
          "id",
          state.user.id
        )
        .maybeSingle();


    if (
      error
    ) {

      throw getNormalizedError(
        error,
        {

          file:
            "js/core/campanha.js",

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
      data ||
      null;


    return state.profile;

  } catch (
    error
  ) {

    log(
      "warn",
      "Não foi possível carregar o perfil.",
      error
    );


    state.profile =
      null;


    return null;

  }

}


/* ============================================================
   SESSÃO AUTH
   ============================================================ */

async function loadAuthSession() {

  if (
    !state.supabase?.auth
  ) {

    throw new Error(
      "O cliente Supabase/Auth não está disponível."
    );

  }


  const {
    data,
    error
  } =
    await state.supabase.auth
      .getSession();


  if (
    error
  ) {

    throw getNormalizedError(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadAuthSession",

        table:
          "auth",

        operation:
          "getSession"

      }
    );

  }


  const session =
    data?.session ||
    null;


  if (
    !session?.user
  ) {

    redirectToLogin();

    return null;

  }


  state.user =
    session.user;


  await loadProfile();


  return session;

}


/* ============================================================
   CAMPANHA
   ============================================================ */

async function loadCampaign() {

  if (
    !state.supabase
  ) {

    throw new Error(
      "Supabase não inicializado."
    );

  }


  if (
    !state.campaignId
  ) {

    throw new Error(
      "ID da campanha não foi encontrado na URL."
    );

  }


  const {
    data,
    error
  } =
    await state.supabase
      .from(
        "campaigns"
      )
      .select(
        `
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
        `
      )
      .eq(
        "id",
        state.campaignId
      )
      .maybeSingle();


  if (
    error
  ) {

    throw getNormalizedError(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadCampaign",

        table:
          "campaigns",

        operation:
          "select"

      }
    );

  }


  if (
    !data
  ) {

    throw new Error(
      "A campanha solicitada não foi encontrada."
    );

  }


  state.campaign = {

    id:
      String(
        data.id
      ),

    name:
      safeString(
        data.name,
        "Campanha"
      ),

    description:
      safeString(
        data.description
      ),

    coverPath:
      safeString(
        data.cover_path
      ),

    coverUrl:
      safeString(
        data.cover_url
      ),

    createdBy:
      data.created_by
        ? String(
            data.created_by
          )
        : null,

    theme:
      safeString(
        data.theme,
        CAMPAIGN_CONFIG.defaultTheme
      ),

    backgroundPath:
      safeString(
        data.background_path
      ),

    createdAt:
      data.created_at ||
      null,

    updatedAt:
      data.updated_at ||
      null

  };


  return state.campaign;

}


/* ============================================================
   MEMBERSHIP
   ============================================================ */

async function loadMembership() {

  if (
    !state.supabase ||
    !state.user ||
    !state.campaignId
  ) {

    throw new Error(
      "Contexto da membership incompleto."
    );

  }


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
          user_id,
          role,
          created_at,
          updated_at
        `
      )
      .eq(
        "campaign_id",
        state.campaignId
      )
      .eq(
        "user_id",
        state.user.id
      )
      .maybeSingle();


  if (
    error
  ) {

    throw getNormalizedError(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadMembership",

        table:
          "campaign_members",

        operation:
          "select"

      }
    );

  }


  if (
    !data
  ) {

    throw new Error(
      "Você não faz parte desta campanha."
    );

  }


  state.membership = {

    id:
      String(
        data.id
      ),

    campaignId:
      String(
        data.campaign_id
      ),

    userId:
      String(
        data.user_id
      ),

    role:
      data.role ===
        "master"

        ? "master"

        : "player",

    createdAt:
      data.created_at ||
      null,

    updatedAt:
      data.updated_at ||
      null

  };


  return state.membership;

}


/* ============================================================
   MEMBROS
   ============================================================ */

async function loadMembers() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    return [];

  }


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
          user_id,
          role,
          created_at,
          updated_at
        `
      )
      .eq(
        "campaign_id",
        state.campaignId
      )
      .order(
        "created_at",
        {
          ascending:
            true
        }
      );


  if (
    error
  ) {

    throw getNormalizedError(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadMembers",

        table:
          "campaign_members",

        operation:
          "select"

      }
    );

  }


  state.members =
    normalizeArray(
      data
    )
      .map(
        member => ({

          id:
            String(
              member.id
            ),

          campaignId:
            String(
              member.campaign_id
            ),

          userId:
            String(
              member.user_id
            ),

          role:
            member.role ===
              "master"

              ? "master"

              : "player",

          createdAt:
            member.created_at ||
            null,

          updatedAt:
            member.updated_at ||
            null

        })
      );


  return state.members;

}


/* ============================================================
   SESSÃO DA CAMPANHA
   ============================================================ */

async function loadCampaignSession() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    state.session =
      null;

    return null;

  }


  const {
    data,
    error
  } =
    await state.supabase
      .from(
        "campaign_session"
      )
      .select(
        `
          campaign_id,
          timer_label,
          timer_end_time,
          timer_started_by,
          current_scene_id,
          session_status,
          updated_at
        `
      )
      .eq(
        "campaign_id",
        state.campaignId
      )
      .maybeSingle();


  if (
    error
  ) {

    throw getNormalizedError(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadCampaignSession",

        table:
          "campaign_session",

        operation:
          "select"

      }
    );

  }


  state.session =
    data

      ? {

          campaignId:
            String(
              data.campaign_id
            ),

          timerLabel:
            safeString(
              data.timer_label
            ),

          timerEndTime:
            data.timer_end_time ||
            null,

          timerStartedBy:
            data.timer_started_by
              ? String(
                  data.timer_started_by
                )
              : null,

          currentSceneId:
            data.current_scene_id
              ? String(
                  data.current_scene_id
                )
              : null,

          sessionStatus:
            safeString(
              data.session_status,
              "idle"
            ),

          updatedAt:
            data.updated_at ||
            null

        }

      : null;


  return state.session;

}


/* ============================================================
   PERSONAGENS PRESENTES
   ============================================================ */

async function loadPresentCharacters() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    state.presentCharacters =
      [];

    return [];

  }


  const {
    data,
    error
  } =
    await state.supabase
      .from(
        "campaign_characters"
      )
      .select(
        `
          id,
          campaign_id,
          character_id,
          is_present,
          display_order,
          created_at,
          updated_at,
          characters (
            id,
            user_id,
            campaign_id,
            name,
            age,
            race,
            class,
            power,
            origin,
            racial_ability,
            class_bonus,
            personality,
            backstory,
            hp_current,
            hp_max,
            mana_current,
            mana_max,
            conditions,
            attributes,
            techniques,
            inventory,
            equipment,
            avatar_path,
            created_at,
            updated_at
          )
        `
      )
      .eq(
        "campaign_id",
        state.campaignId
      )
      .eq(
        "is_present",
        true
      )
      .order(
        "display_order",
        {
          ascending:
            true
        }
      );


  if (
    error
  ) {

    throw getNormalizedError(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadPresentCharacters",

        table:
          "campaign_characters",

        operation:
          "select"

      }
    );

  }


  state.presentCharacters =
    normalizeArray(
      data
    )
      .map(
        normalizePresentCharacter
      )
      .filter(
        Boolean
      );


  return state.presentCharacters;

}


function normalizePresentCharacter(
  row
) {

  if (
    !row ||
    !row.character_id
  ) {

    return null;

  }


  const character =
    normalizeObject(
      row.characters
    );


  if (
    !character.id
  ) {

    return null;

  }


  return {

    id:
      String(
        row.id
      ),

    characterId:
      String(
        row.character_id
      ),

    campaignId:
      String(
        row.campaign_id
      ),

    isPresent:
      Boolean(
        row.is_present
      ),

    displayOrder:
      safeNumber(
        row.display_order
      ),

    character: {

      id:
        String(
          character.id
        ),

      userId:
        character.user_id
          ? String(
              character.user_id
            )
          : null,

      campaignId:
        character.campaign_id
          ? String(
              character.campaign_id
            )
          : null,

      name:
        safeString(
          character.name,
          "Personagem"
        ),

      age:
        character.age ===
          null ||
        character.age ===
          undefined

          ? null

          : safeNumber(
              character.age
            ),

      race:
        safeString(
          character.race
        ),

      class:
        safeString(
          character.class
        ),

      power:
        safeString(
          character.power
        ),

      origin:
        safeString(
          character.origin
        ),

      racialAbility:
        safeString(
          character.racial_ability
        ),

      classBonus:
        safeString(
          character.class_bonus
        ),

      personality:
        safeString(
          character.personality
        ),

      backstory:
        safeString(
          character.backstory
        ),

      hpCurrent:
        safeNumber(
          character.hp_current
        ),

      hpMax:
        safeNumber(
          character.hp_max
        ),

      manaCurrent:
        safeNumber(
          character.mana_current
        ),

      manaMax:
        safeNumber(
          character.mana_max
        ),

      conditions:
        normalizeArray(
          character.conditions
        ),

      attributes:
        normalizeObject(
          character.attributes
        ),

      techniques:
        normalizeArray(
          character.techniques
        ),

      inventory:
        normalizeArray(
          character.inventory
        ),

      equipment:
        normalizeArray(
          character.equipment
        ),

      avatarPath:
        safeString(
          character.avatar_path
        ),

      createdAt:
        character.created_at ||
        null,

      updatedAt:
        character.updated_at ||
        null

    }

  };

}


/* ============================================================
   ROLE
   ============================================================ */

function isMaster() {

  return (
    state.membership?.role ===
    "master"
  );

}


function isPlayer() {

  return (
    state.membership?.role ===
    "player"
  );

}


/* ============================================================
   NOME DO USUÁRIO
   ============================================================ */

function getDisplayName() {

  const profile =
    state.profile ||
    {};

  const metadata =
    normalizeObject(
      state.user?.user_metadata
    );


  return (

    safeString(
      profile.display_name
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
      state.user?.email
        ?.split(
          "@"
        )[0]
    ) ||

    "Aventureiro"

  );

}


/* ============================================================
   UI — USUÁRIO
   ============================================================ */

function renderUser() {

  const name =
    getDisplayName();


  const avatar =
    getElement(
      "campaign-user-avatar"
    );

  const nameElement =
    getElement(
      "campaign-user-name"
    );

  const roleElement =
    getElement(
      "campaign-user-role"
    );


  if (
    nameElement
  ) {

    nameElement.textContent =
      name;

  }


  if (
    roleElement
  ) {

    roleElement.textContent =
      isMaster()

        ? "Mestre"

        : "Aventureiro";

  }


  if (
    !avatar
  ) {

    return;

  }


  avatar.replaceChildren();


  const initial =
    document.createElement(
      "span"
    );


  initial.textContent =
    name
      .trim()
      .charAt(
        0
      )
      .toUpperCase() ||
    "?";


  avatar.appendChild(
    initial
  );

}


/* ============================================================
   UI — CAMPANHA
   ============================================================ */

function renderCampaign() {

  if (
    !state.campaign
  ) {

    return;

  }


  const campaign =
    state.campaign;


  const values = [

    [
      "campaign-sidebar-name",
      campaign.name
    ],

    [
      "campaign-mobile-title",
      campaign.name
    ],

    [
      "campaign-topbar-title",
      campaign.name
    ],

    [
      "campaign-overview-title",
      campaign.name
    ],

    [
      "campaign-overview-description",
      campaign.description ||
      "Aventure pela campanha com seu grupo."
    ]

  ];


  values.forEach(
    (
      [
        id,
        value
      ]
    ) => {

      const element =
        getElement(
          id
        );


      if (
        element
      ) {

        element.textContent =
          value;

      }

    }
  );


  const roleBadge =
    getElement(
      "campaign-role-badge"
    );


  if (
    roleBadge
  ) {

    roleBadge.textContent =
      isMaster()
        ? "Mestre"
        : "Aventureiro";

  }


  const sidebarRole =
    getElement(
      "campaign-sidebar-role"
    );


  if (
    sidebarRole
  ) {

    sidebarRole.textContent =
      isMaster()
        ? "Mestre"
        : "Aventureiro";

  }


  const hero =
    getElement(
      "campaign-hero-cover"
    );


  if (
    hero
  ) {

    hero.replaceChildren();


    if (
      campaign.coverUrl
    ) {

      applyHeroImage(
        hero,
        campaign.coverUrl
      );

    }

  }


  applyThemeMetadata();

}


/* ============================================================
   HERO
   ============================================================ */

function applyHeroImage(
  container,
  url
) {

  try {

    const parsed =
      new URL(
        url,
        window.location.href
      );


    if (
      parsed.protocol !==
        "https:" &&
      parsed.protocol !==
        "http:"
    ) {

      return;

    }


    const image =
      document.createElement(
        "img"
      );


    image.src =
      parsed.href;

    image.alt =
      "";

    image.setAttribute(
      "aria-hidden",
      "true"
    );


    image.addEventListener(
      "error",
      () => {

        image.remove();

      },
      {
        once:
          true
      }
    );


    container.appendChild(
      image
    );

  } catch (
    error
  ) {

    log(
      "warn",
      "URL da capa inválida.",
      error
    );

  }

}


/* ============================================================
   TEMA
   ============================================================ */

function applyThemeMetadata() {

  if (
    !state.campaign
  ) {

    return;

  }


  const theme =
    safeString(
      state.campaign.theme,
      CAMPAIGN_CONFIG.defaultTheme
    );


  document.documentElement.dataset.theme =
    theme;


  const campaignApp =
    getElement(
      "campaign-app"
    );


  if (
    campaignApp
  ) {

    campaignApp.dataset.theme =
      theme;

  }


  window.dispatchEvent(
    new CustomEvent(
      "aeriom:campaigntheme",
      {

        detail:
          Object.freeze({

            campaignId:
              state.campaign.id,

            theme,

            backgroundPath:
              state.campaign.backgroundPath ||
              null

          })

      }
    )
  );

}


/* ============================================================
   UI — MEMBROS
   ============================================================ */

function renderMembers() {

  const container =
    getElement(
      "campaign-members-grid"
    );


  if (
    !container
  ) {

    return;

  }


  container.replaceChildren();


  const members =
    normalizeArray(
      state.members
    );


  const count =
    getElement(
      "campaign-member-count"
    );


  if (
    count
  ) {

    count.textContent =
      members.length === 1

        ? "1 integrante"

        : `${members.length} integrantes`;

  }


  members.forEach(
    member => {

      container.appendChild(
        createMemberCard(
          member
        )
      );

    }
  );

}


function createMemberCard(
  member
) {

  const article =
    document.createElement(
      "article"
    );


  article.className =
    "campaign-member-card";


  article.dataset.memberId =
    member.id;


  article.dataset.userId =
    member.userId;


  const avatar =
    document.createElement(
      "div"
    );


  avatar.className =
    "campaign-member-card__avatar";


  const initial =
    document.createElement(
      "span"
    );


  if (
    state.user &&
    member.userId ===
      state.user.id
  ) {

    initial.textContent =
      getDisplayName()
        .trim()
        .charAt(
          0
        )
        .toUpperCase() ||
      "?";

  }
  else {

    initial.textContent =
      member.role ===
        "master"

        ? "M"

        : "A";

  }


  avatar.appendChild(
    initial
  );


  const info =
    document.createElement(
      "div"
    );


  info.className =
    "campaign-member-card__info";


  const name =
    document.createElement(
      "span"
    );


  name.className =
    "campaign-member-card__name";


  if (
    state.user &&
    member.userId ===
      state.user.id
  ) {

    name.textContent =
      `${getDisplayName()} (você)`;

  }
  else {

    name.textContent =
      member.role ===
        "master"

        ? "Mestre da campanha"

        : "Aventureiro";

  }


  const role =
    document.createElement(
      "span"
    );


  role.className =
    "campaign-member-card__role";


  role.textContent =
    member.role ===
      "master"

      ? "Mestre"

      : "Jogador";


  info.append(
    name,
    role
  );


  article.append(
    avatar,
    info
  );


  return article;

}


/* ============================================================
   UI — PERSONAGENS
   ============================================================ */

function renderPresentCharacters() {

  const container =
    getElement(
      "campaign-character-summary"
    ) ||
    getElement(
      "campaign-character-summary-grid"
    );


  if (
    !container
  ) {

    return;

  }


  container.replaceChildren();


  const characters =
    normalizeArray(
      state.presentCharacters
    );


  if (
    characters.length ===
    0
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "campaign-character-summary__empty";


    const icon =
      document.createElement(
        "span"
      );


    icon.setAttribute(
      "aria-hidden",
      "true"
    );


    icon.textContent =
      "♜";


    const content =
      document.createElement(
        "div"
      );


    const title =
      document.createElement(
        "strong"
      );


    title.textContent =
      "Nenhum personagem presente ainda.";


    const description =
      document.createElement(
        "p"
      );


    description.textContent =
      "Suas fichas poderão ser vinculadas à mesa em uma próxima etapa.";


    content.append(
      title,
      description
    );


    empty.append(
      icon,
      content
    );


    container.appendChild(
      empty
    );


    return;

  }


  characters.forEach(
    entry => {

      container.appendChild(
        createCharacterSummaryCard(
          entry.character
        )
      );

    }
  );

}


function createCharacterSummaryCard(
  character
) {

  const article =
    document.createElement(
      "article"
    );


  article.className =
    "campaign-character-summary__card";


  const name =
    document.createElement(
      "strong"
    );


  name.textContent =
    character.name;


  const meta =
    document.createElement(
      "span"
    );


  const parts = [

    character.race,

    character.class

  ]
    .filter(
      Boolean
    );


  meta.textContent =
    parts.join(
      " • "
    );


  const hp =
    document.createElement(
      "span"
    );


  hp.textContent =
    `PV ${character.hpCurrent}/${character.hpMax}`;


  const mana =
    document.createElement(
      "span"
    );


  mana.textContent =
    `Mana ${character.manaCurrent}/${character.manaMax}`;


  article.append(
    name,
    meta,
    hp,
    mana
  );


  return article;

}


/* ============================================================
   UI — MESTRE
   ============================================================ */

function updateMasterInterface() {

  const masterNavigation =
    getElement(
      "master-navigation"
    );

  const masterCard =
    getElement(
      "campaign-master-card"
    );

  const mapButton =
    getElement(
      "campaign-create-map-button"
    );

  const secretButton =
    getElement(
      "campaign-create-secret-button"
    );


  const role =
    isMaster();


  if (
    masterNavigation
  ) {

    masterNavigation.hidden =
      !role;

  }


  if (
    masterCard
  ) {

    masterCard.hidden =
      !role;

  }


  if (
    mapButton
  ) {

    mapButton.hidden =
      !role;

  }


  if (
    secretButton
  ) {

    secretButton.hidden =
      !role;

  }

}


/* ============================================================
   UI — SESSÃO
   ============================================================ */

function updateSessionUi() {

  const session =
    state.session;


  const statusElement =
    getElement(
      "campaign-session-status"
    );


  if (
    statusElement
  ) {

    statusElement.textContent =
      session?.sessionStatus ||
      "idle";

  }


  const timerLabel =
    getElement(
      "campaign-timer-label"
    );


  if (
    timerLabel
  ) {

    timerLabel.textContent =
      session?.timerLabel ||
      "";

  }


  const scene =
    getElement(
      "campaign-current-scene"
    );


  if (
    scene
  ) {

    scene.textContent =
      session?.currentSceneId ||
      "Nenhuma cena ativa";

  }

}


/* ============================================================
   REALTIME UI
   ============================================================ */

function updateSessionConnectionUi() {

  const text =
    getElement(
      "campaign-session-status-text"
    );


  const dot =
    document.querySelector(
      ".campaign-session-status__dot"
    );


  if (
    state.realtimeConnected
  ) {

    if (
      text
    ) {

      text.textContent =
        "Mesa conectada";

    }


    if (
      dot
    ) {

      dot.dataset.status =
        "connected";

    }

  }
  else {

    if (
      text
    ) {

      text.textContent =
        "Reconectando mesa...";

    }


    if (
      dot
    ) {

      dot.dataset.status =
        "disconnected";

    }

  }

}


/* ============================================================
   ABAS
   ============================================================ */

function isValidTab(
  tab
) {

  const validTabs = [

    "overview",

    "dice",

    "combat",

    "mural",

    "timeline",

    "kitchen",

    "maps",

    "secrets",

    "theme"

  ];


  if (
    !validTabs.includes(
      tab
    )
  ) {

    return false;

  }


  if (
    (
      tab ===
        "secrets" ||
      tab ===
        "theme"
    ) &&
    !isMaster()
  ) {

    return false;

  }


  return true;

}


function showTab(
  tab
) {

  if (
    !isValidTab(
      tab
    )
  ) {

    return;

  }


  state.activeTab =
    tab;


  getElements(
    "[data-campaign-panel]"
  )
    .forEach(
      panel => {

        const panelTab =
          panel.dataset.campaignPanel;


        const active =
          panelTab ===
          tab;


        panel.hidden =
          !active;


        panel.classList.toggle(
          "is-active",
          active
        );

      }
    );


  getElements(
    "[data-campaign-tab]"
  )
    .forEach(
      button => {

        const buttonTab =
          button.dataset.campaignTab;


        const active =
          buttonTab ===
          tab;


        button.classList.toggle(
          "is-active",
          active
        );


        if (
          active
        ) {

          button.setAttribute(
            "aria-current",
            "page"
          );

        }
        else {

          button.removeAttribute(
            "aria-current"
          );

        }

      }
    );


  closeMobileMenus();


  window.dispatchEvent(
    new CustomEvent(
      "aeriom:campaigntabchange",
      {

        detail:
          Object.freeze({

            campaignId:
              state.campaignId,

            tab

          })

      }
    )
  );

}


/* ============================================================
   MENU MOBILE
   ============================================================ */

function toggleMobileSidebar() {

  const sidebar =
    getElement(
      "campaign-sidebar"
    );

  const button =
    getElement(
      "campaign-mobile-menu-button"
    );


  if (
    !sidebar
  ) {

    return;

  }


  state.mobileMenuOpen =
    !state.mobileMenuOpen;


  sidebar.classList.toggle(
    "is-open",
    state.mobileMenuOpen
  );


  if (
    button
  ) {

    button.setAttribute(
      "aria-expanded",
      String(
        state.mobileMenuOpen
      )
    );

  }

}


function toggleMobileActions() {

  const actions =
    getElement(
      "campaign-mobile-actions"
    );

  const button =
    getElement(
      "campaign-mobile-actions-button"
    );


  if (
    !actions
  ) {

    return;

  }


  const open =
    !actions.classList.contains(
      "is-open"
    );


  actions.classList.toggle(
    "is-open",
    open
  );


  actions.hidden =
    !open;


  if (
    button
  ) {

    button.setAttribute(
      "aria-expanded",
      String(
        open
      )
    );

  }

}


function closeMobileMenus() {

  const sidebar =
    getElement(
      "campaign-sidebar"
    );

  const actions =
    getElement(
      "campaign-mobile-actions"
    );

  const sidebarButton =
    getElement(
      "campaign-mobile-menu-button"
    );

  const actionsButton =
    getElement(
      "campaign-mobile-actions-button"
    );


  state.mobileMenuOpen =
    false;


  if (
    sidebar
  ) {

    sidebar.classList.remove(
      "is-open"
    );

  }


  if (
    actions
  ) {

    actions.classList.remove(
      "is-open"
    );

    actions.hidden =
      true;

  }


  if (
    sidebarButton
  ) {

    sidebarButton.setAttribute(
      "aria-expanded",
      "false"
    );

  }


  if (
    actionsButton
  ) {

    actionsButton.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


/* ============================================================
   CONVITE
   ============================================================ */

function openInviteModal() {

  window.dispatchEvent(
    new CustomEvent(
      "aeriom:campaigninvite",
      {

        detail:
          Object.freeze({

            campaignId:
              state.campaignId,

            campaign:
              state.campaign

          })

      }
    )
  );

}


/* ============================================================
   AÇÕES DO MESTRE
   ============================================================ */

function dispatchMasterAction(
  action
) {

  if (
    !isMaster()
  ) {

    return;

  }


  window.dispatchEvent(
    new CustomEvent(
      "aeriom:masteraction",
      {

        detail:
          Object.freeze({

            action,

            campaignId:
              state.campaignId,

            user:
              state.user,

            membership:
              state.membership

          })

      }
    )
  );

}


/* ============================================================
   CONTEXTO PÚBLICO
   ============================================================ */

function getContext() {

  return Object.freeze({

    campaignId:
      state.campaignId,

    campaign:
      state.campaign,

    user:
      state.user,

    profile:
      state.profile,

    membership:
      state.membership,

    members:
      state.members,

    session:
      state.session,

    presentCharacters:
      state.presentCharacters,

    activeTab:
      state.activeTab,

    realtimeConnected:
      state.realtimeConnected,

    isMaster:
      isMaster(),

    isPlayer:
      isPlayer()

  });

}


/* ============================================================
   API GLOBAL DA CAMPANHA
   ============================================================ */

function exposeCampaignApi() {

  window.AERIOM_CAMPAIGN =
    Object.freeze({

      getContext,

      getCampaign:
        () =>
          state.campaign,

      getCampaignId:
        () =>
          state.campaignId,

      getUser:
        () =>
          state.user,

      getMembership:
        () =>
          state.membership,

      getSession:
        () =>
          state.session,

      getMembers:
        () =>
          state.members,

      getPresentCharacters:
        () =>
          state.presentCharacters,

      isMaster,

      isPlayer,

      showTab,

      refresh:
        () =>
          initializeCampaign(
            true
          )

    });

}


/* ============================================================
   EVENTOS DA UI
   ============================================================ */

function bindUiEvents() {

  if (
    state.uiBound
  ) {

    return;

  }


  state.uiBound =
    true;


  getElements(
    "[data-campaign-tab]"
  )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            showTab(
              button.dataset.campaignTab
            );

          }
        );

      }
    );


  getElement(
    "campaign-mobile-menu-button"
  )
    ?.addEventListener(
      "click",
      toggleMobileSidebar
    );


  getElement(
    "campaign-mobile-actions-button"
  )
    ?.addEventListener(
      "click",
      toggleMobileActions
    );


  getElement(
    "campaign-invite-sidebar-button"
  )
    ?.addEventListener(
      "click",
      openInviteModal
    );


  getElement(
    "campaign-mobile-invite-button"
  )
    ?.addEventListener(
      "click",
      openInviteModal
    );


  getElement(
    "campaign-logout-button"
  )
    ?.addEventListener(
      "click",
      logout
    );


  getElement(
    "campaign-mobile-logout-button"
  )
    ?.addEventListener(
      "click",
      logout
    );


  getElement(
    "campaign-retry-button"
  )
    ?.addEventListener(
      "click",
      () => {

        initializeCampaign(
          true
        );

      }
    );


  getElement(
    "campaign-create-note-button"
  )
    ?.addEventListener(
      "click",
      () => {

        dispatchMasterAction(
          "create-note"
        );

      }
    );


  getElement(
    "campaign-create-map-button"
  )
    ?.addEventListener(
      "click",
      () => {

        dispatchMasterAction(
          "create-map"
        );

      }
    );


  getElement(
    "campaign-create-secret-button"
  )
    ?.addEventListener(
      "click",
      () => {

        dispatchMasterAction(
          "create-secret"
        );

      }
    );


  getElements(
    "[data-campaign-action]"
  )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            dispatchMasterAction(
              button.dataset.campaignAction
            );

          }
        );

      }
    );


  document.addEventListener(
    "keydown",
    handleKeyboardNavigation
  );


  document.addEventListener(
    "click",
    handleOutsideMobileMenu
  );

}


/* ============================================================
   TECLADO
   ============================================================ */

function handleKeyboardNavigation(
  event
) {

  if (
    event.key ===
      "Escape"
  ) {

    closeMobileMenus();

  }

}


/* ============================================================
   CLIQUE FORA
   ============================================================ */

function handleOutsideMobileMenu(
  event
) {

  const target =
    event.target;


  if (
    !(target instanceof Node)
  ) {

    return;

  }


  const sidebar =
    getElement(
      "campaign-sidebar"
    );

  const menuButton =
    getElement(
      "campaign-mobile-menu-button"
    );


  if (
    state.mobileMenuOpen &&
    sidebar &&
    !sidebar.contains(
      target
    ) &&
    !menuButton?.contains(
      target
    )
  ) {

    closeMobileMenus();

  }

}


/* ============================================================
   LOGOUT
   ============================================================ */

async function logout() {

  if (
    !state.supabase?.auth
  ) {

    redirectToLogin();

    return;

  }


  try {

    removeRealtimeChannel();


    const {
      error
    } =
      await state.supabase.auth
        .signOut();


    if (
      error
    ) {

      throw getNormalizedError(
        error,
        {

          file:
            "js/core/campanha.js",

          function:
            "logout",

          table:
            "auth",

          operation:
            "signOut"

        }
      );

    }


    redirectToLogin();

  } catch (
    error
  ) {

    log(
      "error",
      "Falha ao sair da conta.",
      error
    );


    redirectToLogin();

  }

}


/* ============================================================
   REALTIME
   ============================================================ */

function getRealtimeChannelName() {

  return [

    CAMPAIGN_CONFIG.realtimeChannelPrefix,

    state.campaignId

  ]
    .join(
      "-"
    );

}


function removeRealtimeChannel() {

  const channel =
    state.realtimeChannel;


  if (
    !channel ||
    !state.supabase
  ) {

    state.realtimeChannel =
      null;

    state.realtimeConnected =
      false;

    updateSessionConnectionUi();

    return;

  }


  try {

    state.supabase
      .removeChannel(
        channel
      );

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao remover canal Realtime.",
      error
    );

  }


  state.realtimeChannel =
    null;

  state.realtimeConnected =
    false;


  updateSessionConnectionUi();

}


function subscribeRealtime() {

  if (
    !state.supabase ||
    !state.campaignId ||
    !state.user
  ) {

    return;

  }


  removeRealtimeChannel();


  const channelName =
    getRealtimeChannelName();


  const presenceKey =
    state.user.id ||
    (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"

        ? crypto.randomUUID()

        : String(
            Date.now()
          )
    );


  const channel =
    state.supabase.channel(
      channelName,
      {

        config: {

          broadcast: {

            self:
              false

          },

          presence: {

            key:
              presenceKey

          }

        }

      }
    );


  channel.on(
    "postgres_changes",
    {

      event:
        "*",

      schema:
        "public",

      table:
        "campaigns",

      filter:
        `id=eq.${state.campaignId}`

    },
    handleCampaignRealtimeChange
  );


  channel.on(
    "postgres_changes",
    {

      event:
        "*",

      schema:
        "public",

      table:
        "campaign_members",

      filter:
        `campaign_id=eq.${state.campaignId}`

    },
    handleMembersRealtimeChange
  );


  channel.on(
    "postgres_changes",
    {

      event:
        "*",

      schema:
        "public",

      table:
        "campaign_session",

      filter:
        `campaign_id=eq.${state.campaignId}`

    },
    handleSessionRealtimeChange
  );


  channel.on(
    "postgres_changes",
    {

      event:
        "*",

      schema:
        "public",

      table:
        "campaign_characters",

      filter:
        `campaign_id=eq.${state.campaignId}`

    },
    handleCharactersRealtimeChange
  );


  channel.on(
    "presence",
    {
      event:
        "sync"
    },
    handlePresenceSync
  );


  channel.on(
    "presence",
    {
      event:
        "join"
    },
    handlePresenceChange
  );


  channel.on(
    "presence",
    {
      event:
        "leave"
    },
    handlePresenceChange
  );


  state.realtimeChannel =
    channel;


  channel.subscribe(
    async status => {

      log(
        "info",
        `Realtime da campanha: ${status}`
      );


      if (
        status ===
        "SUBSCRIBED"
      ) {

        state.realtimeConnected =
          true;


        try {

          await channel.track({

            user_id:
              state.user.id,

            role:
              state.membership?.role ||
              null,

            online_at:
              new Date().toISOString()

          });

        } catch (
          error
        ) {

          log(
            "warn",
            "Não foi possível registrar presença.",
            error
          );

        }


        updateSessionConnectionUi();

        return;

      }


      if (
        status ===
          "CHANNEL_ERROR" ||
        status ===
          "TIMED_OUT" ||
        status ===
          "CLOSED"
      ) {

        state.realtimeConnected =
          false;


        updateSessionConnectionUi();

      }

    }
  );

}


/* ============================================================
   REALTIME — CAMPANHA
   ============================================================ */

function handleCampaignRealtimeChange(
  payload
) {

  log(
    "info",
    "Campanha atualizada em tempo real.",
    payload
  );


  refreshCampaignFromRealtime(
    payload
  );

}


async function refreshCampaignFromRealtime(
  payload
) {

  if (
    payload?.eventType ===
    "DELETE"
  ) {

    showErrorState(
      "Esta campanha não está mais disponível."
    );

    return;

  }


  const row =
    payload?.new;


  if (
    row
  ) {

    state.campaign = {

      ...state.campaign,

      name:
        row.name ??
        state.campaign.name,

      description:
        row.description ??
        state.campaign.description,

      coverPath:
        row.cover_path ??
        state.campaign.coverPath,

      coverUrl:
        row.cover_url ??
        state.campaign.coverUrl,

      createdBy:
        row.created_by ??
        state.campaign.createdBy,

      theme:
        row.theme ??
        state.campaign.theme,

      backgroundPath:
        row.background_path ??
        state.campaign.backgroundPath,

      updatedAt:
        row.updated_at ??
        state.campaign.updatedAt

    };


    renderCampaign();

    return;

  }


  try {

    await loadCampaign();

    renderCampaign();

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao atualizar campanha.",
      error
    );

  }

}


/* ============================================================
   REALTIME — MEMBROS
   ============================================================ */

async function handleMembersRealtimeChange(
  payload
) {

  log(
    "info",
    "Membros da campanha alterados.",
    payload
  );


  try {

    await loadMembership();

    await loadMembers();

    renderMembers();

    renderCampaign();

    renderUser();

    updateMasterInterface();

  } catch (
    error
  ) {

    const message =
      String(
        error?.message ||
        ""
      )
        .toLowerCase();


    if (
      message.includes(
        "não faz parte"
      )
    ) {

      showErrorState(
        "Seu acesso a esta campanha foi removido."
      );


      removeRealtimeChannel();

      return;

    }


    log(
      "warn",
      "Falha ao atualizar membros.",
      error
    );

  }

}


/* ============================================================
   REALTIME — SESSÃO
   ============================================================ */

async function handleSessionRealtimeChange(
  payload
) {

  log(
    "info",
    "Sessão da campanha alterada.",
    payload
  );


  try {

    await loadCampaignSession();

    updateSessionUi();


    window.dispatchEvent(
      new CustomEvent(
        "aeriom:campaignsessionchange",
        {

          detail:
            Object.freeze({

              campaignId:
                state.campaignId,

              session:
                state.session

            })

        }
      )
    );

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao atualizar sessão.",
      error
    );

  }

}


/* ============================================================
   REALTIME — PERSONAGENS
   ============================================================ */

async function handleCharactersRealtimeChange(
  payload
) {

  log(
    "info",
    "Personagens da campanha alterados.",
    payload
  );


  try {

    await loadPresentCharacters();

    renderPresentCharacters();


    window.dispatchEvent(
      new CustomEvent(
        "aeriom:campaigncharacterschange",
        {

          detail:
            Object.freeze({

              campaignId:
                state.campaignId,

              characters:
                state.presentCharacters

            })

        }
      )
    );

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao atualizar personagens.",
      error
    );

  }

}


/* ============================================================
   REALTIME — PRESENÇA
   ============================================================ */

function handlePresenceSync() {

  updatePresenceUi();

}


function handlePresenceChange() {

  updatePresenceUi();

}


function updatePresenceUi() {

  updateSessionConnectionUi();

}


/* ============================================================
   INICIALIZAÇÃO DA CAMPANHA
   ============================================================ */

async function initializeCampaign(
  force = false
) {

  if (
    state.initializing
  ) {

    return;

  }


  if (
    state.initialized &&
    !force
  ) {

    return;

  }


  state.initializing =
    true;


  showLoadingState();


  try {

    /*
     * --------------------------------------------------------
     * 1. ID DA CAMPANHA
     * --------------------------------------------------------
     */

    state.campaignId =
      getCampaignIdFromUrl();


    if (
      !state.campaignId
    ) {

      throw new Error(
        "Nenhuma campanha foi especificada na URL."
      );

    }


    /*
     * --------------------------------------------------------
     * 2. SUPABASE
     * --------------------------------------------------------
     */

    state.supabase =
      await getSupabase();


    if (
      !state.supabase
    ) {

      throw new Error(
        "Não foi possível obter o cliente Supabase."
      );

    }


    /*
     * --------------------------------------------------------
     * 3. SESSÃO AUTH
     * --------------------------------------------------------
     */

    const session =
      await loadAuthSession();


    if (
      !session
    ) {

      return;

    }


    /*
     * --------------------------------------------------------
     * 4. CAMPANHA
     * --------------------------------------------------------
     */

    await loadCampaign();


    /*
     * --------------------------------------------------------
     * 5. MEMBERSHIP
     * --------------------------------------------------------
     */

    await loadMembership();


    /*
     * --------------------------------------------------------
     * 6. MEMBROS
     * --------------------------------------------------------
     */

    await loadMembers();


    /*
     * --------------------------------------------------------
     * 7. SESSÃO DA MESA
     * --------------------------------------------------------
     */

    await loadCampaignSession();


    /*
     * --------------------------------------------------------
     * 8. PERSONAGENS PRESENTES
     * --------------------------------------------------------
     */

    await loadPresentCharacters();


    /*
     * --------------------------------------------------------
     * 9. RENDERIZAÇÃO
     * --------------------------------------------------------
     */

    renderUser();

    renderCampaign();

    renderMembers();

    renderPresentCharacters();

    updateMasterInterface();

    updateSessionUi();

    updateSessionConnectionUi();


    /*
     * --------------------------------------------------------
     * 10. EVENTOS UI
     * --------------------------------------------------------
     */

    bindUiEvents();


    /*
     * --------------------------------------------------------
     * 11. ABA INICIAL
     * --------------------------------------------------------
     */

    showTab(
      state.activeTab
    );


    /*
     * --------------------------------------------------------
     * 12. API PARA OUTROS MÓDULOS
     * --------------------------------------------------------
     */

    exposeCampaignApi();


    /*
     * --------------------------------------------------------
     * 13. REALTIME
     * --------------------------------------------------------
     */

    subscribeRealtime();


    /*
     * --------------------------------------------------------
     * 14. PRONTO
     * --------------------------------------------------------
     */

    state.initialized =
      true;

    state.initializing =
      false;


    showWorkspace();


    window.dispatchEvent(
      new CustomEvent(
        "aeriom:campaignready",
        {

          detail:
            getContext()

        }
      )
    );


    window.dispatchEvent(
      new CustomEvent(
        "aeriom:ready",
        {

          detail:
            Object.freeze({

              page:
                "campaign",

              campaignId:
                state.campaignId

            })

        }
      )
    );


    log(
      "info",
      "Mesa carregada com sucesso.",
      {

        campaignId:
          state.campaignId,

        campaign:
          state.campaign?.name,

        role:
          state.membership?.role

      }
    );

  } catch (
    error
  ) {

    state.initialized =
      false;

    state.initializing =
      false;


    const normalized =
      getNormalizedError(
        error,
        {

          file:
            "js/core/campanha.js",

          function:
            "initializeCampaign",

          table:
            "campaigns",

          operation:
            "initialize"

        }
      );


    log(
      "error",
      "Falha ao inicializar a mesa.",
      normalized
    );


    showErrorState(
      normalized.message ||
      "Não foi possível carregar a mesa."
    );


    window.dispatchEvent(
      new CustomEvent(
        "aeriom:campaignerror",
        {

          detail:
            Object.freeze(
              normalized
            )

        }
      )
    );

  } finally {

    state.initializing =
      false;

  }

}


/* ============================================================
   DESTRUIÇÃO
   ============================================================ */

function destroyCampaign() {

  removeRealtimeChannel();


  state.initialized =
    false;

  state.initializing =
    false;

  state.supabase =
    null;

  state.user =
    null;

  state.profile =
    null;

  state.campaign =
    null;

  state.membership =
    null;

  state.members =
    [];

  state.session =
    null;

  state.presentCharacters =
    [];

}


/* ============================================================
   API GLOBAL
   ============================================================ */

window.AERIOM_CAMPAIGN =
  Object.freeze({

    getContext,

    getCampaign:
      () =>
        state.campaign,

    getCampaignId:
      () =>
        state.campaignId,

    getUser:
      () =>
        state.user,

    getMembership:
      () =>
        state.membership,

    getSession:
      () =>
        state.session,

    getMembers:
      () =>
        state.members,

    getPresentCharacters:
      () =>
        state.presentCharacters,

    isMaster,

    isPlayer,

    showTab,

    refresh:
      () =>
        initializeCampaign(
          true
        ),

    destroy:
      destroyCampaign

  });


/* ============================================================
   INICIALIZAÇÃO AUTOMÁTICA
   ============================================================ */

function startCampaignModule() {

  /*
   * Só inicia quando estamos realmente na página
   * da campanha.
   */

  const isCampaignPage =
    Boolean(
      getElement(
        "campaign-app"
      ) ||
      getElement(
        "campaign-loading"
      ) ||
      getElement(
        "campaign-workspace"
      )
    );


  if (
    !isCampaignPage
  ) {

    return;

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      () => {

        initializeCampaign();

      },
      {
        once:
          true
      }
    );


    return;

  }


  initializeCampaign();

}


startCampaignModule();


/* ============================================================
   EXPORTS
   ============================================================ */

export {

  initializeCampaign,

  getContext,

  getCampaignIdFromUrl,

  isMaster,

  isPlayer,

  showTab,

  destroyCampaign

};