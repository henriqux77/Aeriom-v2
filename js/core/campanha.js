/*
 * ============================================================
 * AERIOM v2
 * js/core/campanha.js
 * Núcleo da mesa virtual
 * ============================================================
 *
 * Responsabilidades:
 *
 * - restaurar sessão;
 * - carregar campanha;
 * - carregar membership;
 * - carregar membros;
 * - carregar personagens presentes;
 * - resolver capa pelo Supabase Storage;
 * - identificar corretamente o usuário;
 * - priorizar identidade do Discord;
 * - renderizar a mesa;
 * - controlar abas;
 * - controlar menu mobile;
 * - aplicar tema;
 * - fornecer contexto global;
 * - preparar Realtime.
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

const CONFIG = Object.freeze({

  LOGIN_PAGE:
    "./index.html",

  CAMPAIGNS_PAGE:
    "./campanhas.html",

  CAMPAIGN_PAGE:
    "./campanha.html",

  STORAGE_BUCKET:
    "campaign-covers",

  AVATAR_BUCKET:
    "avatars",

  DEFAULT_THEME:
    "default",

  MAX_CAMPAIGN_ID_LENGTH:
    100,

  SIGNED_URL_SECONDS:
    60 * 60,

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

  presentCharacters:
    [],

  session:
    null,

  activeTab:
    "overview",

  realtimeChannel:
    null,

  realtimeConnected:
    false,

  mobileMenuOpen:
    false,

  bound:
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
    typeof selector !== "string"
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
   HELPERS
   ============================================================ */

function safeString(
  value,
  fallback = ""
) {

  if (
    typeof value === "string"
  ) {

    return value.trim();

  }

  return fallback;

}


function safeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
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

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {

    return {};

  }

  return value;

}


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

  const error =
    getElement(
      "campaign-error"
    );

  if (loading) {

    loading.hidden =
      false;

  }

  if (workspace) {

    workspace.hidden =
      true;

  }

  if (error) {

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

  if (loading) {

    loading.hidden =
      true;

  }

  if (workspace) {

    workspace.hidden =
      false;

  }

  if (error) {

    error.hidden =
      true;

  }

}


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

  const error =
    getElement(
      "campaign-error"
    );

  const errorMessage =
    getElement(
      "campaign-error-message"
    );

  if (loading) {

    loading.hidden =
      true;

  }

  if (workspace) {

    workspace.hidden =
      true;

  }

  if (errorMessage) {

    errorMessage.textContent =
      safeString(
        message,
        "Não foi possível abrir a campanha."
      );

  }

  if (error) {

    error.hidden =
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

  if (!raw) {

    return null;

  }

  const value =
    raw.trim();

  if (!value) {

    return null;

  }

  if (
    value.length >
    CONFIG.MAX_CAMPAIGN_ID_LENGTH
  ) {

    return null;

  }

  return value;

}


/* ============================================================
   REDIRECIONAMENTO
   ============================================================ */

function redirectToLogin() {

  window.location.replace(
    CONFIG.LOGIN_PAGE
  );

}


function redirectToCampaigns() {

  window.location.replace(
    CONFIG.CAMPAIGNS_PAGE
  );

}


/* ============================================================
   IDENTIDADE
   ============================================================ */

/*
 * O Discord pode entregar diferentes campos dependendo
 * da versão/configuração do provider.
 *
 * Procuramos todos os campos comuns antes de tocar no e-mail.
 */

function getDiscordDisplayName(
  user
) {

  const metadata =
    normalizeObject(
      user?.user_metadata
    );

  const identities =
    normalizeArray(
      user?.identities
    );

  const discordIdentity =
    identities.find(
      identity =>
        String(
          identity?.provider || ""
        ).toLowerCase() === "discord"
    );

  const identityData =
    normalizeObject(
      discordIdentity?.identity_data
    );

  const discordName =
    safeString(
      metadata.global_name
    ) ||

    safeString(
      metadata.username
    ) ||

    safeString(
      metadata.user_name
    ) ||

    safeString(
      metadata.preferred_username
    ) ||

    safeString(
      metadata.discord_username
    ) ||

    safeString(
      identityData.global_name
    ) ||

    safeString(
      identityData.username
    ) ||

    safeString(
      identityData.user_name
    ) ||

    safeString(
      identityData.preferred_username
    );

  return discordName;

}


function getUserDisplayName(
  user = state.user,
  profile = state.profile
) {

  if (!user) {

    return "Aventureiro";

  }

  /*
   * PRIMEIRO:
   * Discord.
   *
   * Isso impede que o e-mail vire o nome visual.
   */

  const discordName =
    getDiscordDisplayName(
      user
    );

  if (discordName) {

    return discordName;

  }


  const metadata =
    normalizeObject(
      user.user_metadata
    );


  /*
   * SEGUNDO:
   * nome configurado no Auth.
   */

  const authName =
    safeString(
      metadata.display_name
    ) ||

    safeString(
      metadata.full_name
    ) ||

    safeString(
      metadata.name
    );

  if (authName) {

    return authName;

  }


  /*
   * TERCEIRO:
   * perfil AERIOM.
   */

  const profileName =
    safeString(
      profile?.display_name
    );

  if (profileName) {

    return profileName;

  }


  /*
   * QUARTO:
   * somente agora usamos o prefixo do e-mail
   * como último recurso.
   */

  const emailPrefix =
    safeString(
      user.email
        ?.split("@")[0]
    );

  if (emailPrefix) {

    return emailPrefix;

  }

  return "Aventureiro";

}


/* ============================================================
   PERFIL
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

    if (error) {

      throw normalizeError(
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
      data || null;

    return state.profile;

  } catch (error) {

    /*
     * Perfil não pode impedir a mesa de abrir.
     */

    log(
      "warn",
      "Perfil não pôde ser carregado; usando dados do Auth.",
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

function isSafeImageUrl(
  value
) {

  if (
    typeof value !== "string" ||
    !value.trim()
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


async function resolveStorageUrl(
  bucket,
  path
) {

  const cleanPath =
    safeString(
      path
    );

  if (
    !cleanPath ||
    !state.supabase
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

    if (error) {

      throw error;

    }

    const url =
      safeString(
        data?.signedUrl
      );

    return (
      isSafeImageUrl(url)
        ? url
        : null
    );

  } catch (error) {

    log(
      "warn",
      `Não foi possível resolver Storage: ${bucket}`,
      error
    );

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

  if (error) {

    throw normalizeError(
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

  if (!data) {

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
        CONFIG.DEFAULT_THEME
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


  /*
   * CORREÇÃO PRINCIPAL DA CAPA:
   *
   * Se cover_url não existir, resolve cover_path
   * diretamente no bucket campaign-covers.
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

  if (error) {

    throw normalizeError(
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

  if (!data) {

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
      String(
        data.role || ""
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
   MEMBROS
   ============================================================ */

async function loadMembers() {

  if (
    !state.supabase ||
    !state.campaignId
  ) {

    state.members =
      [];

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

  if (error) {

    throw normalizeError(
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
          String(
            member.role || ""
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
   * Busca os perfis dos membros.
   *
   * Isso permite mostrar o nome real em vez de
   * "Aventureiro".
   */

  const userIds =
    state.members
      .map(
        member =>
          member.userId
      )
      .filter(
        Boolean
      );

  if (
    userIds.length
  ) {

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
            userIds
          );

      if (
        profileError
      ) {

        log(
          "warn",
          "Não foi possível carregar os perfis dos membros.",
          profileError
        );

      } else {

        normalizeArray(
          profiles
        ).forEach(
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

    } catch (error) {

      log(
        "warn",
        "Falha ao carregar perfis dos membros.",
        error
      );

    }

  }

  return state.members;

}


/* ============================================================
   SESSÃO DA MESA
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

  if (error) {

    /*
     * A sessão da mesa é um recurso complementar.
     *
     * Não impedimos a campanha de abrir por causa dela.
     */

    log(
      "warn",
      "Sessão da mesa não pôde ser carregada.",
      normalizeError(
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
      )
    );

    state.session =
      null;

    return null;

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
   PERSONAGENS
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

    if (error) {

      throw error;

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

  } catch (error) {

    /*
     * Personagem não pode impedir a mesa de abrir.
     */

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
        character.age == null
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
   UI — USUÁRIO
   ============================================================ */

function renderUser() {

  const name =
    getUserDisplayName(
      state.user,
      state.profile
    );

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

  if (nameElement) {

    nameElement.textContent =
      name;

  }

  if (roleElement) {

    roleElement.textContent =
      isMaster()
        ? "Mestre"
        : "Aventureiro";

  }

  if (!avatar) {

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
      .charAt(0)
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

      if (element) {

        element.textContent =
          value;

      }

    }
  );


  const roleBadge =
    getElement(
      "campaign-role-badge"
    );

  if (roleBadge) {

    roleBadge.textContent =
      isMaster()
        ? "Mestre"
        : "Aventureiro";

  }


  const sidebarRole =
    getElement(
      "campaign-sidebar-role"
    );

  if (sidebarRole) {

    sidebarRole.textContent =
      isMaster()
        ? "Mestre"
        : "Aventureiro";

  }


  /*
   * ==========================================================
   * CAPA PRINCIPAL
   * ==========================================================
   */

  const hero =
    getElement(
      "campaign-hero-cover"
    );

  if (hero) {

    hero.replaceChildren();

    if (
      isSafeImageUrl(
        campaign.coverUrl
      )
    ) {

      applyImage(
        hero,
        campaign.coverUrl,
        `Capa da campanha ${campaign.name}`
      );

    }

  }


  /*
   * ==========================================================
   * CAPA DA SIDEBAR
   * ==========================================================
   */

  const sidebarCover =
    getElement(
      "campaign-sidebar-cover"
    );

  if (sidebarCover) {

    sidebarCover.replaceChildren();

    if (
      isSafeImageUrl(
        campaign.coverUrl
      )
    ) {

      applyImage(
        sidebarCover,
        campaign.coverUrl,
        `Capa da campanha ${campaign.name}`
      );

    } else {

      sidebarCover.textContent =
        "✦";

    }

  }


  applyTheme();

}


/* ============================================================
   IMAGEM
   ============================================================ */

function applyImage(
  container,
  url,
  alt = ""
) {

  if (
    !container ||
    !isSafeImageUrl(url)
  ) {

    return;

  }

  const image =
    document.createElement(
      "img"
    );

  image.src =
    url;

  image.alt =
    alt;

  image.loading =
    "eager";

  image.decoding =
    "async";

  image.referrerPolicy =
    "no-referrer";

  image.addEventListener(
    "error",
    () => {

      image.remove();

      if (
        !container.children.length
      ) {

        container.textContent =
          "✦";

      }

    },
    {
      once:
        true
    }
  );

  container.appendChild(
    image
  );

}


/* ============================================================
   TEMA
   ============================================================ */

function applyTheme() {

  if (
    !state.campaign
  ) {

    return;

  }

  const theme =
    safeString(
      state.campaign.theme,
      CONFIG.DEFAULT_THEME
    );

  document.documentElement.dataset.theme =
    theme;

  const app =
    getElement(
      "campaign-app"
    );

  if (app) {

    app.dataset.theme =
      theme;

  }

  /*
   * O background_path fica disponível para o CSS/tema.
   */

  if (
    state.campaign.backgroundPath
  ) {

    document.documentElement.dataset.backgroundPath =
      state.campaign.backgroundPath;

  } else {

    document.documentElement.removeAttribute(
      "data-background-path"
    );

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

  if (!container) {

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

  if (count) {

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


  const profile =
    state.memberProfiles.get(
      member.userId
    ) || null;


  let name;

  /*
   * Para o usuário atual, usamos o Discord/Auth.
   */

  if (
    state.user &&
    member.userId ===
      state.user.id
  ) {

    name =
      getUserDisplayName(
        state.user,
        state.profile
      );

  } else {

    /*
     * Para outros membros, usamos profiles.
     */

    name =
      safeString(
        profile?.display_name
      ) ||

      (
        member.role === "master"
          ? "Mestre da campanha"
          : "Aventureiro"
      );

  }


  const avatarInitial =
    document.createElement(
      "span"
    );

  avatarInitial.textContent =
    name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "?";

  avatar.appendChild(
    avatarInitial
  );


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
    state.user &&
    member.userId ===
      state.user.id

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
   PERSONAGENS — UI
   ============================================================ */

function renderPresentCharacters() {

  const container =
    getElement(
      "campaign-character-summary"
    ) ||
    getElement(
      "campaign-character-summary-grid"
    );

  if (!container) {

    return;

  }

  if (
    !state.presentCharacters.length
  ) {

    return;

  }

  container.replaceChildren();

  state.presentCharacters.forEach(
    entry => {

      const character =
        entry?.character;

      if (!character) {

        return;

      }

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

      card.appendChild(
        name
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

  if (isMaster()) {

    if (masterNavigation) {

      masterNavigation.hidden =
        false;

    }

    if (masterCard) {

      masterCard.hidden =
        false;

    }

  } else {

    if (masterNavigation) {

      masterNavigation.hidden =
        true;

    }

    if (masterCard) {

      masterCard.hidden =
        true;

    }

  }

}


/* ============================================================
   ABAS
   ============================================================ */

function setActiveTab(
  tab
) {

  const requested =
    safeString(
      tab,
      "overview"
    );

  const button =
    getElements(
      "[data-campaign-tab]"
    ).find(
      element =>
        element.dataset.campaignTab ===
        requested
    );

  /*
   * Tabs exclusivas do mestre não podem ser abertas
   * por jogador.
   */

  if (
    (
      requested === "secrets" ||
      requested === "theme"
    ) &&
    !isMaster()
  ) {

    return;

  }

  if (!button) {

    return;

  }

  state.activeTab =
    requested;


  getElements(
    "[data-campaign-tab]"
  ).forEach(
    element => {

      const active =
        element.dataset.campaignTab ===
        requested;

      element.classList.toggle(
        "is-active",
        active
      );

      if (active) {

        element.setAttribute(
          "aria-current",
          "page"
        );

      } else {

        element.removeAttribute(
          "aria-current"
        );

      }

    }
  );


  getElements(
    "[data-campaign-panel]"
  ).forEach(
    panel => {

      const active =
        panel.dataset.campaignPanel ===
        requested;

      panel.hidden =
        !active;

      panel.classList.toggle(
        "is-active",
        active
      );

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
              requested
          })
      }
    )
  );

}


function bindTabs() {

  getElements(
    "[data-campaign-tab]"
  ).forEach(
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

}


/* ============================================================
   MOBILE MENU
   ============================================================ */

function openMobileMenu() {

  const sidebar =
    getElement(
      "campaign-sidebar"
    );

  const button =
    getElement(
      "campaign-mobile-menu-button"
    );

  if (!sidebar) {

    return;

  }

  state.mobileMenuOpen =
    true;

  sidebar.classList.add(
    "is-mobile-open"
  );

  if (button) {

    button.setAttribute(
      "aria-expanded",
      "true"
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

  if (sidebar) {

    sidebar.classList.remove(
      "is-mobile-open"
    );

  }

  if (button) {

    button.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


function toggleMobileMenu() {

  if (
    state.mobileMenuOpen
  ) {

    closeMobileMenu();

  } else {

    openMobileMenu();

  }

}


function bindMobileMenu() {

  const button =
    getElement(
      "campaign-mobile-menu-button"
    );

  if (button) {

    button.addEventListener(
      "click",
      event => {

        event.preventDefault();

        event.stopPropagation();

        toggleMobileMenu();

      }
    );

  }

  const actionsButton =
    getElement(
      "campaign-mobile-actions-button"
    );

  if (actionsButton) {

    actionsButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        /*
         * O menu de ações será conectado nos próximos módulos.
         */

        window.dispatchEvent(
          new CustomEvent(
            "aeriom:campaignactions",
            {
              detail: {
                campaignId:
                  state.campaignId
              }
            }
          )
        );

      }
    );

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

    const {
      error
    } =
      await state.supabase.auth
        .signOut();

    if (error) {

      throw error;

    }

  } catch (error) {

    log(
      "error",
      "Erro ao sair da conta.",
      error
    );

  } finally {

    redirectToLogin();

  }

}


function bindLogout() {

  const button =
    getElement(
      "campaign-logout-button"
    );

  if (!button) {

    return;

  }

  button.addEventListener(
    "click",
    event => {

      event.preventDefault();

      logout();

    }
  );

}


/* ============================================================
   CONVITE
   ============================================================ */

function bindInviteButton() {

  const button =
    getElement(
      "campaign-invite-sidebar-button"
    );

  if (!button) {

    return;

  }

  button.addEventListener(
    "click",
    event => {

      event.preventDefault();

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

}


/* ============================================================
   RETRY
   ============================================================ */

function bindRetry() {

  const button =
    getElement(
      "campaign-retry-button"
    );

  if (!button) {

    return;

  }

  button.addEventListener(
    "click",
    () => {

      initializeCampaign(
        true
      );

    }
  );

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

    } catch (error) {

      log(
        "warn",
        "Não foi possível remover o canal Realtime.",
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

  const channelName =
    `${CONFIG.REALTIME_PREFIX}:${state.campaignId}`;

  try {

    const channel =
      state.supabase.channel(
        channelName
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
      () => {

        loadCampaignSession()
          .then(
            () => {

              renderSessionStatus();

            }
          )
          .catch(
            error => {

              log(
                "warn",
                "Falha ao atualizar sessão em tempo real.",
                error
              );

            }
          );

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
      () => {

        Promise.all([
          loadMembers(),
          loadPresentCharacters()
        ])
          .then(
            () => {

              renderMembers();
              renderPresentCharacters();

            }
          )
          .catch(
            error => {

              log(
                "warn",
                "Falha ao atualizar dados da campanha.",
                error
              );

            }
          );

      }
    );

    channel.subscribe(
      status => {

        state.realtimeConnected =
          status === "SUBSCRIBED";

        renderSessionStatus();

      }
    );

    state.realtimeChannel =
      channel;

  } catch (error) {

    log(
      "warn",
      "Não foi possível iniciar o Realtime.",
      error
    );

  }

}


/* ============================================================
   STATUS DA SESSÃO
   ============================================================ */

function renderSessionStatus() {

  const element =
    getElement(
      "campaign-session-status-text"
    );

  const indicator =
    getElement(
      "campaign-live-indicator"
    );

  if (element) {

    element.textContent =
      state.realtimeConnected
        ? "Mesa conectada"
        : "Mesa pronta";

  }

  if (indicator) {

    indicator.dataset.connected =
      state.realtimeConnected
        ? "true"
        : "false";

  }

}


/* ============================================================
   CONTEXTO PÚBLICO
   ============================================================ */

function getCampaignContext() {

  return {

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

    isMaster:
      isMaster(),

    isPlayer:
      isPlayer(),

    activeTab:
      state.activeTab

  };

}


function exposeGlobalContext() {

  window.AERIOM =
    window.AERIOM ||
    {};

  window.AERIOM.campaign =
    Object.freeze({
      getContext:
        getCampaignContext,

      getState:
        getCampaignContext,

      isMaster,

      isPlayer,

      setActiveTab

    });

}


/* ============================================================
   EVENTOS
   ============================================================ */

function bindGlobalEvents() {

  if (state.bound) {

    return;

  }

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

  state.bound =
    true;

}


/* ============================================================
   RENDER FINAL
   ============================================================ */

function renderAll() {

  renderUser();

  renderCampaign();

  renderMembers();

  renderPresentCharacters();

  renderMasterInterface();

  renderSessionStatus();

  setActiveTab(
    state.activeTab
  );

}


/* ============================================================
   INICIALIZAÇÃO
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

    state.supabase =
      getSupabase();

    if (
      !state.supabase
    ) {

      throw new Error(
        "Cliente Supabase não disponível."
      );

    }


    state.campaignId =
      getCampaignIdFromUrl();

    if (
      !state.campaignId
    ) {

      throw new Error(
        "ID da campanha ausente na URL."
      );

    }


    /*
     * 1 — AUTENTICAÇÃO
     */

    const session =
      await loadAuthSession();

    if (!session) {

      return;

    }


    /*
     * 2 — CAMPANHA
     */

    await loadCampaign();


    /*
     * 3 — MEMBERSHIP
     *
     * Isto confirma que o usuário realmente pertence
     * à campanha.
     */

    await loadMembership();


    /*
     * 4 — DADOS COMPLEMENTARES
     *
     * Falhas nesses módulos não derrubam a campanha.
     */

    await Promise.all([
      loadMembers(),
      loadCampaignSession(),
      loadPresentCharacters()
    ]);


    /*
     * 5 — INTERFACE
     */

    renderAll();


    /*
     * 6 — REALTIME
     */

    setupRealtime();


    /*
     * 7 — EXPOR CONTEXTO
     */

    exposeGlobalContext();


    state.initialized =
      true;


    /*
     * 8 — MOSTRAR MESA
     */

    showWorkspace();


    window.dispatchEvent(
      new CustomEvent(
        "aeriom:campaignready",
        {
          detail:
            Object.freeze(
              getCampaignContext()
            )
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
          state.membership?.role,

        cover:
          Boolean(
            state.campaign?.coverUrl
          ),

        user:
          getUserDisplayName(
            state.user,
            state.profile
          )
      }
    );

  } catch (error) {

    const normalized =
      normalizeError(
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

    showErrorState(
      normalized.message ||
      "Não foi possível abrir a campanha."
    );

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

  state.presentCharacters =
    [];

  state.session =
    null;

}


/* ============================================================
   BIND UI
   ============================================================ */

function bindUI() {

  bindTabs();

  bindMobileMenu();

  bindLogout();

  bindInviteButton();

  bindRetry();

  bindGlobalEvents();

}


/* ============================================================
   START
   ============================================================ */

function start() {

  if (
    !document.body
  ) {

    return;

  }

  bindUI();

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
   API
   ============================================================ */

export {

  initializeCampaign,

  destroyCampaign,

  getCampaignContext,

  isMaster,

  isPlayer,

  setActiveTab,

  loadCampaign,

  loadMembers,

  loadPresentCharacters

};