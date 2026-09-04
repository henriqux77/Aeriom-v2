/*
 * ============================================================
 * AERIOM v2
 * js/core/campanha.js
 * Núcleo da mesa virtual
 * ============================================================
 */

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

  CAMPAIGNS_PAGE:
    "./campanhas.html",

  STORAGE_BUCKET:
    "campaign-covers",

  SIGNED_URL_SECONDS:
    3600,

  DEFAULT_THEME:
    "default",

  REALTIME_PREFIX:
    "aeriom-campaign"

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

  memberProfiles:
    new Map(),

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

  eventsBound:
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

  return Array.from(
    document.querySelectorAll(
      selector
    )
  );

}


/* ============================================================
   HELPERS
   ============================================================ */

function text(
  value,
  fallback = ""
) {

  return typeof value ===
    "string"

    ? value.trim()

    : fallback;

}


function array(
  value
) {

  return Array.isArray(
    value
  )
    ? value
    : [];

}


function object(
  value
) {

  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {

    return value;

  }


  return {};

}


function errorInfo(
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

function showLoading() {

  const loading =
    getElement(
      "campaign-loading"
    );

  const workspace =
    getElement(
      "campaign-workspace"
    );

  const error =
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
    error
  ) {

    error.hidden =
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

  const error =
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
    error
  ) {

    error.hidden =
      true;

  }

}


function showError(
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

  const errorBox =
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
    errorBox
  ) {

    errorBox.hidden =
      false;

  }

}


/* ============================================================
   URL
   ============================================================ */

function getCampaignId() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const value =
    text(
      params.get(
        "campaign"
      )
    );


  if (
    !value
  ) {

    return null;

  }


  if (
    value.length >
    100
  ) {

    return null;

  }


  return value;

}


/* ============================================================
   REDIRECT
   ============================================================ */

function redirectLogin() {

  window.location.replace(
    CONFIG.LOGIN_PAGE
  );

}


function redirectCampaigns() {

  window.location.replace(
    CONFIG.CAMPAIGNS_PAGE
  );

}


/* ============================================================
   IDENTIDADE
   ============================================================ */

function getDiscordName(
  user
) {

  const metadata =
    object(
      user?.user_metadata
    );


  const identities =
    array(
      user?.identities
    );


  const discord =
    identities.find(
      identity =>
        text(
          identity?.provider
        ).toLowerCase() ===
        "discord"
    );


  const identityData =
    object(
      discord?.identity_data
    );


  return (

    text(
      metadata.global_name
    ) ||

    text(
      metadata.username
    ) ||

    text(
      metadata.user_name
    ) ||

    text(
      metadata.preferred_username
    ) ||

    text(
      metadata.discord_username
    ) ||

    text(
      identityData.global_name
    ) ||

    text(
      identityData.username
    ) ||

    text(
      identityData.user_name
    ) ||

    text(
      identityData.preferred_username
    ) ||

    ""

  );

}


function getDisplayName(
  user = state.user,
  profile = state.profile
) {

  if (
    !user
  ) {

    return "Aventureiro";

  }


  /*
   * Discord primeiro.
   */

  const discord =
    getDiscordName(
      user
    );


  if (
    discord
  ) {

    return discord;

  }


  const metadata =
    object(
      user.user_metadata
    );


  const authName =

    text(
      metadata.display_name
    ) ||

    text(
      metadata.full_name
    ) ||

    text(
      metadata.name
    );


  if (
    authName
  ) {

    return authName;

  }


  const profileName =
    text(
      profile?.display_name
    );


  if (
    profileName
  ) {

    return profileName;

  }


  /*
   * E-mail somente como último fallback.
   */

  const emailName =
    text(
      user.email
        ?.split(
          "@"
        )[0]
    );


  return (
    emailName ||
    "Aventureiro"
  );

}


/* ============================================================
   AUTH SESSION
   ============================================================ */

async function loadAuthSession() {

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


  if (
    error
  ) {

    throw errorInfo(
      error,
      {

        file:
          "js/core/campanha.js",

        function:
          "loadAuthSession",

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

    redirectLogin();

    return null;

  }


  state.user =
    session.user;


  await loadProfile();


  return session;

}


/* ============================================================
   PROFILE
   ============================================================ */

async function loadProfile() {

  if (
    !state.supabase ||
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

      throw error;

    }


    state.profile =
      data ||
      null;


    return state.profile;

  } catch (
    error
  ) {

    /*
     * Perfil nunca pode impedir a abertura da campanha.
     */

    log(
      "warn",
      "Perfil não pôde ser carregado.",
      error
    );


    state.profile =
      null;


    return null;

  }

}


/* ============================================================
   STORAGE
   ============================================================ */

function validImageUrl(
  url
) {

  if (
    !url
  ) {

    return false;

  }


  try {

    const parsed =
      new URL(
        url,
        window.location.href
      );


    return (
      parsed.protocol ===
        "https:" ||
      parsed.protocol ===
        "http:"
    );

  } catch {

    return false;

  }

}


async function resolveStorageUrl(
  bucket,
  path
) {

  const cleanPath =
    text(
      path
    );


  if (
    !cleanPath
  ) {

    return null;

  }


  try {

    const {
      data,
      error
    } =
      await state.supabase.storage
        .from(
          bucket
        )
        .createSignedUrl(
          cleanPath,
          CONFIG.SIGNED_URL_SECONDS
        );


    if (
      error
    ) {

      throw error;

    }


    const url =
      text(
        data?.signedUrl
      );


    return validImageUrl(
      url
    )
      ? url
      : null;

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao resolver imagem do Storage.",
      error
    );


    return null;

  }

}


/* ============================================================
   CAMPAIGN
   ============================================================ */

async function loadCampaign() {

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

    throw errorInfo(
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
      "A campanha não foi encontrada."
    );

  }


  state.campaign = {

    id:
      String(
        data.id
      ),

    name:
      text(
        data.name,
        "Campanha"
      ),

    description:
      text(
        data.description
      ),

    coverPath:
      text(
        data.cover_path
      ),

    coverUrl:
      text(
        data.cover_url
      ),

    createdBy:
      data.created_by
        ? String(
            data.created_by
          )
        : null,

    theme:
      text(
        data.theme,
        CONFIG.DEFAULT_THEME
      ),

    backgroundPath:
      text(
        data.background_path
      ),

    createdAt:
      data.created_at ||
      null,

    updatedAt:
      data.updated_at ||
      null

  };


  /*
   * ==========================================================
   * CORREÇÃO DA CAPA
   * ==========================================================
   *
   * No banco normalmente temos cover_path.
   * Esse valor precisa virar uma Signed URL antes de
   * ser colocado no <img>.
   */

  if (
    !state.campaign.coverUrl &&
    state.campaign.coverPath
  ) {

    state.campaign.coverUrl =
      await resolveStorageUrl(
        CONFIG.STORAGE_BUCKET,
        state.campaign.coverPath
      );

  }


  return state.campaign;

}


/* ============================================================
   MEMBERSHIP
   ============================================================ */

async function loadMembership() {

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

    throw errorInfo(
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
      text(
        data.role
      ).toLowerCase() ===
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
   MEMBERS
   ============================================================ */

async function loadMembers() {

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

    throw errorInfo(
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
    array(
      data
    ).map(
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
          text(
            member.role
          ).toLowerCase() ===
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


  /*
   * Tentamos carregar os perfis dos membros.
   *
   * Se o RLS não permitir, não quebramos a mesa.
   */

  state.memberProfiles.clear();


  const ids =
    state.members
      .map(
        member =>
          member.userId
      )
      .filter(
        Boolean
      );


  if (
    !ids.length
  ) {

    return state.members;

  }


  try {

    const {
      data:
        profiles,
      error:
        profileError
    } =
      await state.supabase
        .from(
          "profiles"
        )
        .select(
          `
            id,
            display_name,
            avatar_path
          `
        )
        .in(
          "id",
          ids
        );


    if (
      profileError
    ) {

      log(
        "warn",
        "Perfis dos membros não puderam ser carregados.",
        profileError
      );

    } else {

      array(
        profiles
      )
        .forEach(
          profile => {

            if (
              profile?.id
            ) {

              state.memberProfiles.set(
                String(
                  profile.id
                ),
                profile
              );

            }

          }
        );

    }

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao consultar perfis dos membros.",
      error
    );

  }


  return state.members;

}


/* ============================================================
   CAMPAIGN SESSION
   ============================================================ */

async function loadCampaignSession() {

  try {

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

      throw error;

    }


    state.session =
      data
        ? {

            campaignId:
              String(
                data.campaign_id
              ),

            timerLabel:
              text(
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
              text(
                data.session_status,
                "idle"
              ),

            updatedAt:
              data.updated_at ||
              null

          }

        : null;


  } catch (
    error
  ) {

    /*
     * Session é complementar.
     */

    log(
      "warn",
      "Não foi possível carregar a sessão da mesa.",
      error
    );


    state.session =
      null;

  }


  return state.session;

}


/* ============================================================
   CHARACTERS
   ============================================================ */

async function loadCharacters() {

  state.presentCharacters =
    [];


  try {

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
            characters (
              id,
              user_id,
              campaign_id,
              name,
              race,
              class,
              hp_current,
              hp_max,
              mana_current,
              mana_max,
              avatar_path
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

      throw error;

    }


    state.presentCharacters =
      array(
        data
      )
        .map(
          row => {

            const character =
              object(
                row.characters
              );


            if (
              !row?.character_id ||
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
                Number(
                  row.display_order ||
                  0
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
                  text(
                    character.name,
                    "Personagem"
                  ),

                race:
                  text(
                    character.race
                  ),

                class:
                  text(
                    character.class
                  ),

                hpCurrent:
                  Number(
                    character.hp_current ||
                    0
                  ),

                hpMax:
                  Number(
                    character.hp_max ||
                    0
                  ),

                manaCurrent:
                  Number(
                    character.mana_current ||
                    0
                  ),

                manaMax:
                  Number(
                    character.mana_max ||
                    0
                  ),

                avatarPath:
                  text(
                    character.avatar_path
                  )

              }

            };

          }
        )
        .filter(
          Boolean
        );

  } catch (
    error
  ) {

    log(
      "warn",
      "Personagens presentes não puderam ser carregados.",
      error
    );

    state.presentCharacters =
      [];

  }


  return state.presentCharacters;

}


/* ============================================================
   UI — USER
   ============================================================ */

function renderUser() {

  const name =
    getDisplayName();


  const nameElement =
    getElement(
      "campaign-user-name"
    );

  const roleElement =
    getElement(
      "campaign-user-role"
    );

  const avatar =
    getElement(
      "campaign-user-avatar"
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
    avatar
  ) {

    avatar.replaceChildren();


    const initial =
      document.createElement(
        "span"
      );


    initial.textContent =
      name
        .charAt(
          0
        )
        .toUpperCase() ||
      "?";


    avatar.appendChild(
      initial
    );

  }

}


/* ============================================================
   UI — CAMPAIGN
   ============================================================ */

function renderCampaign() {

  const campaign =
    state.campaign;


  if (
    !campaign
  ) {

    return;

  }


  const fields = [

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
    ],

    [
      "campaign-role-badge",
      isMaster()
        ? "Mestre"
        : "Aventureiro"
    ],

    [
      "campaign-sidebar-role",
      isMaster()
        ? "Mestre"
        : "Aventureiro"
    ]

  ];


  fields.forEach(
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


  /*
   * HERO
   */

  const hero =
    getElement(
      "campaign-hero-cover"
    );


  if (
    hero
  ) {

    hero.replaceChildren();


    if (
      validImageUrl(
        campaign.coverUrl
      )
    ) {

      const image =
        document.createElement(
          "img"
        );


      image.src =
        campaign.coverUrl;

      image.alt =
        `Capa da campanha ${campaign.name}`;

      image.loading =
        "eager";

      image.decoding =
        "async";


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


      hero.appendChild(
        image
      );

    }

  }


  /*
   * SIDEBAR COVER
   */

  const sidebarCover =
    getElement(
      "campaign-sidebar-cover"
    );


  if (
    sidebarCover
  ) {

    sidebarCover.replaceChildren();


    if (
      validImageUrl(
        campaign.coverUrl
      )
    ) {

      const image =
        document.createElement(
          "img"
        );


      image.src =
        campaign.coverUrl;

      image.alt =
        "";

      image.loading =
        "lazy";


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


      sidebarCover.appendChild(
        image
      );

    } else {

      sidebarCover.textContent =
        "✦";

    }

  }


  applyTheme();

}


/* ============================================================
   UI — MEMBERS
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


  const count =
    getElement(
      "campaign-member-count"
    );


  if (
    count
  ) {

    const total =
      state.members.length;


    count.textContent =
      total === 1
        ? "1 integrante"
        : `${total} integrantes`;

  }


  state.members
    .forEach(
      member => {

        container.appendChild(
          createMemberCard(
            member
          )
        );

      }
    );

}


/* ============================================================
   MEMBER CARD
   ============================================================ */

function createMemberCard(
  member
) {

  const article =
    document.createElement(
      "article"
    );


  article.className =
    "campaign-member-card";


  const profile =
    state.memberProfiles.get(
      member.userId
    ) || null;


  const isCurrentUser =
    Boolean(
      state.user &&
      member.userId ===
        state.user.id
    );


  const name =
    isCurrentUser

      ? getDisplayName()

      : (
          text(
            profile?.display_name
          ) ||

          (
            member.role ===
              "master"

              ? "Mestre da campanha"

              : "Aventureiro"
          )
        );


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


  initial.textContent =
    name
      .charAt(
        0
      )
      .toUpperCase() ||
    "?";


  avatar.appendChild(
    initial
  );


  if (
    member.userId ===
      state.user?.id
  ) {

    const online =
      document.createElement(
        "span"
      );


    online.className =
      "campaign-member-card__online";


    online.setAttribute(
      "aria-hidden",
      "true"
    );


    avatar.appendChild(
      online
    );

  }


  const info =
    document.createElement(
      "div"
    );


  info.className =
    "campaign-member-card__info";


  const nameElement =
    document.createElement(
      "span"
    );


  nameElement.className =
    "campaign-member-card__name";


  nameElement.textContent =
    isCurrentUser
      ? `${name} (você)`
      : name;


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
    nameElement,
    role
  );


  article.append(
    avatar,
    info
  );


  return article;

}


/* ============================================================
   UI — CHARACTERS
   ============================================================ */

function renderCharacters() {

  const container =
    getElement(
      "campaign-character-summary"
    );


  if (
    !container
  ) {

    return;

  }


  if (
    !state.presentCharacters.length
  ) {

    return;

  }


  container.replaceChildren();


  state.presentCharacters
    .forEach(
      entry => {

        const character =
          entry.character;


        const card =
          document.createElement(
            "article"
          );


        card.className =
          "campaign-character-card";


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


        card.append(
          name,
          meta
        );


        container.appendChild(
          card
        );

      }
    );

}


/* ============================================================
   MASTER UI
   ============================================================ */

function renderMasterInterface() {

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


  const master =
    isMaster();


  if (
    masterNavigation
  ) {

    masterNavigation.hidden =
      !master;

  }


  if (
    masterCard
  ) {

    masterCard.hidden =
      !master;

  }


  if (
    mapButton
  ) {

    mapButton.hidden =
      !master;

  }


  if (
    secretButton
  ) {

    secretButton.hidden =
      !master;

  }

}


/* ============================================================
   TEMA
   ============================================================ */

function applyTheme() {

  const theme =
    text(
      state.campaign?.theme,
      CONFIG.DEFAULT_THEME
    );


  document.documentElement.dataset.theme =
    theme;


  const app =
    getElement(
      "campaign-app"
    );


  if (
    app
  ) {

    app.dataset.theme =
      theme;

  }


  window.dispatchEvent(
    new CustomEvent(
      "aeriom:campaigntheme",
      {

        detail:
          Object.freeze({

            campaignId:
              state.campaignId,

            theme,

            backgroundPath:
              state.campaign?.backgroundPath ||
              null

          })

      }
    )
  );

}


/* ============================================================
   SESSION UI
   ============================================================ */

function renderSession() {

  const textElement =
    getElement(
      "campaign-session-status-text"
    );


  if (
    !textElement
  ) {

    return;

  }


  if (
    state.realtimeConnected
  ) {

    textElement.textContent =
      "Mesa conectada";

    return;

  }


  textElement.textContent =
    "Mesa pronta";

}


/* ============================================================
   TABS
   ============================================================ */

function validTab(
  tab
) {

  const valid = [

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
    !valid.includes(
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


function setActiveTab(
  tab
) {

  const next =
    text(
      tab,
      "overview"
    );


  if (
    !validTab(
      next
    )
  ) {

    return;

  }


  state.activeTab =
    next;


  getElements(
    "[data-campaign-panel]"
  )
    .forEach(
      panel => {

        const active =
          panel.dataset.campaignPanel ===
          next;


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

        const active =
          button.dataset.campaignTab ===
          next;


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

        } else {

          button.removeAttribute(
            "aria-current"
          );

        }

      }
    );


  closeMobileMenu();


  window.dispatchEvent(
    new CustomEvent(
      "aeriom:campaigntabchange",
      {

        detail:
          Object.freeze({

            campaignId:
              state.campaignId,

            tab:
              next

          })

      }
    )
  );

}


/* ============================================================
   MOBILE
   ============================================================ */

function toggleMobileMenu() {

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


  /*
   * Suportamos os dois nomes de classe para manter
   * compatibilidade com versões anteriores do CSS.
   */

  sidebar.classList.toggle(
    "is-open",
    state.mobileMenuOpen
  );

  sidebar.classList.toggle(
    "is-mobile-open",
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


function closeMobileMenu() {

  const sidebar =
    getElement(
      "campaign-sidebar"
    );

  const button =
    getElement(
      "campaign-mobile-menu-button"
    );


  state.mobileMenuOpen =
    false;


  if (
    sidebar
  ) {

    sidebar.classList.remove(
      "is-open"
    );

    sidebar.classList.remove(
      "is-mobile-open"
    );

  }


  if (
    button
  ) {

    button.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


/* ============================================================
   ACTIONS
   ============================================================ */

async function handleCampaignAction(
  action,
  button
) {
  if (action === "roll") {
    setActiveTab("dice");

    const dice =
      window.AERIOM_DICE;

    if (
      dice &&
      typeof dice.roll === "function"
    ) {
      try {
        await dice.roll();
      } catch (error) {
        log(
          "warn",
          "Falha na rolagem rápida.",
          error
        );
      }
    }

    return;
  }

  if (action === "request-test") {
    setActiveTab("dice");

    const dice =
      window.AERIOM_DICE;

    const selectedCharacterId =
      dice &&
      typeof dice.getSelectedCharacterId === "function"
        ? dice.getSelectedCharacterId()
        : null;

    if (!selectedCharacterId) {
      showToast(
        "Selecione primeiro o personagem que receberá o teste.",
        "warn"
      );
    }

    return;
  }

  log(
    "warn",
    `Ação desconhecida: ${action}`,
    button
  );
}


/* ============================================================
   BUTTONS
   ============================================================ */

function bindButtons() {

  if (
    state.eventsBound
  ) {

    return;

  }


  state.eventsBound =
    true;


  getElements(
    "[data-campaign-tab]"
  )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          event => {

            event.preventDefault();


            setActiveTab(
              button.dataset.campaignTab
            );

          }
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
          event => {
            event.preventDefault();

            handleCampaignAction(
              button.dataset.campaignAction,
              button
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
      event => {

        event.preventDefault();

        toggleMobileMenu();

      }
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
    "campaign-invite-sidebar-button"
  )
    ?.addEventListener(
      "click",
      () => {

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
    );


  getElement(
    "campaign-mobile-invite-button"
  )
    ?.addEventListener(
      "click",
      () => {

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
    );


  document.addEventListener(
    "keydown",
    event => {

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
   LOGOUT
   ============================================================ */

async function logout() {

  try {

    if (
      state.supabase?.auth
    ) {

      await state.supabase.auth
        .signOut();

    }

  } catch (
    error
  ) {

    log(
      "warn",
      "Falha ao encerrar sessão.",
      error
    );

  } finally {

    redirectLogin();

  }

}


/* ============================================================
   REALTIME
   ============================================================ */

function removeRealtime() {

  if (
    state.realtimeChannel &&
    state.supabase
  ) {

    try {

      state.supabase.removeChannel(
        state.realtimeChannel
      );

    } catch (
      error
    ) {

      log(
        "warn",
        "Falha ao remover Realtime.",
        error
      );

    }

  }


  state.realtimeChannel =
    null;

  state.realtimeConnected =
    false;

}


function setupRealtime() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    return;

  }


  removeRealtime();


  try {

    const channel =
      state.supabase.channel(
        `${CONFIG.REALTIME_PREFIX}:${state.campaignId}`
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
      async () => {

        try {

          await loadCampaign();

          renderCampaign();

        } catch (
          error
        ) {

          log(
            "warn",
            "Falha ao atualizar campanha em tempo real.",
            error
          );

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
          "campaign_members",

        filter:
          `campaign_id=eq.${state.campaignId}`

      },
      async () => {

        try {

          await loadMembers();

          renderMembers();

          renderMasterInterface();

        } catch (
          error
        ) {

          log(
            "warn",
            "Falha ao atualizar membros.",
            error
          );

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
          "campaign_session",

        filter:
          `campaign_id=eq.${state.campaignId}`

      },
      async () => {

        await loadCampaignSession();

        renderSession();

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
          "campaign_characters",

        filter:
          `campaign_id=eq.${state.campaignId}`

      },
      async () => {

        await loadCharacters();

        renderCharacters();

        dispatchCampaignEvent(
          "characterschange",
          {
            characters:
              state.presentCharacters
          }
        );

      }
    );


    state.realtimeChannel =
      channel;


    channel.subscribe(
      status => {

        state.realtimeConnected =
          status ===
          "SUBSCRIBED";


        renderSession();


        log(
          "info",
          `Realtime: ${status}`
        );

      }
    );

  } catch (
    error
  ) {

    log(
      "warn",
      "Não foi possível iniciar Realtime.",
      error
    );

  }

}


/* ============================================================
   EVENTS
   ============================================================ */

function dispatchCampaignEvent(
  name,
  detail
) {

  window.dispatchEvent(
    new CustomEvent(
      `aeriom:campaign:${name}`,
      {

        detail:
          Object.freeze({
            campaignId:
              state.campaignId,

            ...detail

          })

      }
    )
  );

}


/* ============================================================
   PUBLIC CONTEXT
   ============================================================ */

function getContext() {

  return {

    supabase:
      state.supabase,

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
      state.realtimeConnected

  };

}


/* ============================================================
   GLOBAL API
   ============================================================ */

function exposeApi() {

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

      getMembers:
        () =>
          state.members,

      getSession:
        () =>
          state.session,

      getPresentCharacters:
        () =>
          state.presentCharacters,

      isMaster,

      isPlayer,

      showTab:
        setActiveTab,

      refresh:
        () =>
          initializeCampaign(
            true
          ),

      logout

    });

}


/* ============================================================
   AUTH CHANGE
   ============================================================ */

function bindAuthChange() {

  if (
    !state.supabase?.auth
  ) {

    return;

  }


  state.supabase.auth.onAuthStateChange(
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

            removeRealtime();

            redirectLogin();

            return;

          }


          if (
            state.user?.id !==
            session.user.id
          ) {

            state.user =
              session.user;


            await loadProfile();


            renderUser();

          }

        },
        0
      );

    }
  );

}


/* ============================================================
   MAIN INITIALIZER
   ============================================================ */

async function initializeCampaign(
  force = false
) {

  if (
    state.initializing
  ) {

    return null;

  }


  if (
    state.initialized &&
    !force
  ) {

    return getContext();

  }


  state.initializing =
    true;


  showLoading();


  try {

    /*
     * ========================================================
     * CORREÇÃO CRÍTICA
     * ========================================================
     *
     * getSupabase() é async.
     *
     * NÃO:
     *
     * state.supabase = getSupabase();
     *
     * SIM:
     *
     * state.supabase = await getSupabase();
     */

    state.supabase =
      await getSupabase();


    if (
      !state.supabase
    ) {

      throw new Error(
        "Não foi possível inicializar o cliente Supabase."
      );

    }


    /*
     * CAMPAIGN ID
     */

    state.campaignId =
      getCampaignId();


    if (
      !state.campaignId
    ) {

      throw new Error(
        "Nenhuma campanha foi especificada."
      );

    }


    /*
     * AUTH
     */

    const session =
      await loadAuthSession();


    if (
      !session
    ) {

      return null;

    }


    /*
     * CAMPANHA
     */

    await loadCampaign();


    /*
     * MEMBERSHIP
     */

    await loadMembership();


    /*
     * DADOS COMPLEMENTARES
     */

    await Promise.all([

      loadMembers(),

      loadCampaignSession(),

      loadCharacters()

    ]);


    /*
     * UI
     */

    renderUser();

    renderCampaign();

    renderMembers();

    renderCharacters();

    renderMasterInterface();

    renderSession();


    /*
     * EVENTOS
     */

    bindButtons();

    bindAuthChange();


    /*
     * API
     */

    exposeApi();


    /*
     * REALTIME
     */

    setupRealtime();


    /*
     * ABA INICIAL
     */

    setActiveTab(
      "overview"
    );


    /*
     * FINALMENTE MOSTRA A MESA
     */

    state.initialized =
      true;


    showWorkspace();


    dispatchCampaignEvent(
      "ready",
      getContext()
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
          state.membership?.role,

        user:
          getDisplayName(),

        cover:
          Boolean(
            state.campaign?.coverUrl
          )

      }
    );


    return getContext();

  } catch (
    error
  ) {

    const normalized =
      errorInfo(
        error,
        {

          file:
            "js/core/campanha.js",

          function:
            "initializeCampaign",

          campaignId:
            state.campaignId

        }
      );


    log(
      "error",
      "Falha ao inicializar campanha.",
      normalized
    );


    showError(
      normalized.message ||
      "Não foi possível abrir a campanha."
    );


    dispatchCampaignEvent(
      "error",
      {
        error:
          normalized
      }
    );


    return null;

  } finally {

    state.initializing =
      false;

  }

}


/* ============================================================
   DESTROY
   ============================================================ */

function destroyCampaign() {

  removeRealtime();


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

  state.campaignId =
    null;

  state.campaign =
    null;

  state.membership =
    null;

  state.members =
    [];

  state.memberProfiles.clear();

  state.session =
    null;

  state.presentCharacters =
    [];

}


/* ============================================================
   START
   ============================================================ */

function start() {

  /*
   * A página precisa possuir a estrutura da campanha.
   */

  if (
    !getElement(
      "campaign-app"
    )
  ) {

    return;

  }


  bindButtons();


  initializeCampaign();

}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    start,
    {
      once:
        true
    }
  );

} else {

  start();

}


/* ============================================================
   PAGE LIFECYCLE
   ============================================================ */

window.addEventListener(
  "pagehide",
  destroyCampaign,
  {
    once:
      true
  }
);


/* ============================================================
   EXPORTS
   ============================================================ */

export {

  initializeCampaign,

  destroyCampaign,

  getContext,

  isMaster,

  isPlayer,

  setActiveTab,

  getCampaignId

};