/*
 * ============================================================
 * AERIOM v2
 * js/core/supabase.js
 * Cliente central do Supabase
 * ============================================================
 *
 * Responsabilidades:
 *
 * - Carregar o Supabase JS pela CDN oficial.
 * - Criar uma única instância do cliente.
 * - Controlar a inicialização.
 * - Validar a configuração pública.
 * - Expor helpers de erro/operação.
 *
 * NÃO é responsabilidade deste arquivo:
 *
 * - autenticação;
 * - autorização;
 * - RLS;
 * - campanhas;
 * - fichas;
 * - DOM;
 * - Realtime específico de módulos.
 *
 * A segurança real permanece no Supabase/PostgreSQL.
 * ============================================================
 */


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const SUPABASE_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


const AERIOM_SUPABASE_CONFIG =
  Object.freeze({

    url:
      "https://kitlpowgcugvlxwhwhqv.supabase.co",

    /*
     * Chave pública do projeto.
     *
     * Pode ficar no frontend porque é uma publishable key.
     *
     * NUNCA usar aqui:
     *
     * - service_role
     * - secret key
     * - outras chaves privadas
     */

    publishableKey:
      "sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW"

  });


/* ============================================================
   ESTADO INTERNO
   ============================================================ */

let supabaseClient =
  null;


let supabaseInitializationPromise =
  null;


/* ============================================================
   LOG
   ============================================================ */

function logSupabase(
  level,
  message,
  details = null
) {

  const prefix =
    "[AERIOM][SUPABASE]";


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
   VALIDAR CONFIGURAÇÃO
   ============================================================ */

function validateConfig() {

  const {
    url,
    publishableKey
  } =
    AERIOM_SUPABASE_CONFIG;


  if (
    typeof url !== "string" ||
    !url.trim()
  ) {

    throw new Error(
      "SUPABASE_URL não foi configurada."
    );

  }


  if (
    typeof publishableKey !== "string" ||
    !publishableKey.trim()
  ) {

    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY não foi configurada."
    );

  }


  let parsedUrl;


  try {

    parsedUrl =
      new URL(
        url
      );

  } catch {

    throw new Error(
      "SUPABASE_URL não é uma URL válida."
    );

  }


  if (
    parsedUrl.protocol !==
    "https:"
  ) {

    throw new Error(
      "SUPABASE_URL deve utilizar HTTPS."
    );

  }


  /*
   * Validação simples da chave pública.
   *
   * Aceitamos também JWT legado durante eventual migração.
   */

  const validPublishableFormat =
    publishableKey.startsWith(
      "sb_publishable_"
    );


  const validLegacyFormat =
    publishableKey.startsWith(
      "eyJ"
    );


  if (
    !validPublishableFormat &&
    !validLegacyFormat
  ) {

    logSupabase(
      "warn",
      "A chave configurada não corresponde ao formato esperado de uma chave pública do Supabase."
    );

  }

}


/* ============================================================
   CARREGAR BIBLIOTECA
   ============================================================ */

async function loadSupabaseLibrary() {

  /*
   * Se já estamos carregando, reaproveitamos a mesma Promise.
   */

  if (
    supabaseInitializationPromise
  ) {

    return supabaseInitializationPromise;

  }


  supabaseInitializationPromise =
    import(
      SUPABASE_CDN_URL
    )
      .then(
        (module) => {

          if (
            !module ||
            typeof module.createClient !==
              "function"
          ) {

            throw new Error(
              "O Supabase JS foi carregado, mas createClient não está disponível."
            );

          }


          return module;

        }
      )
      .catch(
        (error) => {

          /*
           * Permite tentar novamente posteriormente
           * caso a CDN falhe temporariamente.
           */

          supabaseInitializationPromise =
            null;


          logSupabase(
            "error",
            "Falha ao carregar o Supabase JS pela CDN.",
            error
          );


          throw error;

        }
      );


  return supabaseInitializationPromise;

}


/* ============================================================
   INITIALIZE
   ============================================================ */

export async function initializeSupabase() {

  if (
    supabaseClient
  ) {

    return supabaseClient;

  }


  validateConfig();


  /*
   * Evita duas inicializações simultâneas.
   */

  if (
    supabaseInitializationPromise
  ) {

    const module =
      await supabaseInitializationPromise;


    /*
     * Se a Promise existente for a da biblioteca,
     * o cliente pode ainda não existir.
     */

    if (
      supabaseClient
    ) {

      return supabaseClient;

    }


    if (
      module?.createClient
    ) {

      supabaseClient =
        createSupabaseClient(
          module.createClient
        );


      return supabaseClient;

    }

  }


  try {

    const module =
      await loadSupabaseLibrary();


    supabaseClient =
      createSupabaseClient(
        module.createClient
      );


    logSupabase(
      "info",
      "Cliente Supabase inicializado."
    );


    return supabaseClient;

  } catch (
    error
  ) {

    supabaseClient =
      null;


    /*
     * Não mascaramos o erro.
     */

    logSupabase(
      "error",
      "Não foi possível inicializar o cliente Supabase.",
      error
    );


    throw error;

  }

}


/* ============================================================
   CRIAR CLIENTE
   ============================================================ */

function createSupabaseClient(
  createClient
) {

  if (
    typeof createClient !==
    "function"
  ) {

    throw new Error(
      "createClient do Supabase não está disponível."
    );

  }


  const client =
    createClient(
      AERIOM_SUPABASE_CONFIG.url,
      AERIOM_SUPABASE_CONFIG.publishableKey,
      {

        auth: {

          /*
           * Sessão persistente do navegador.
           *
           * Isso não é autorização.
           * Autorização continua no JWT + RLS.
           */

          autoRefreshToken:
            true,

          persistSession:
            true,

          detectSessionInUrl:
            true

        },


        global: {

          headers: {

            "x-application-name":
              "aeriom-v2"

          }

        }

      }
    );


  if (
    !client
  ) {

    throw new Error(
      "createClient não retornou uma instância válida."
    );

  }


  if (
    !client.auth
  ) {

    throw new Error(
      "O cliente Supabase não possui o módulo Auth."
    );

  }


  return client;

}


/* ============================================================
   GETTER
   ============================================================ */

export async function getSupabase() {

  if (
    supabaseClient
  ) {

    return supabaseClient;

  }


  await initializeSupabase();


  if (
    !supabaseClient
  ) {

    throw new Error(
      "Cliente Supabase não disponível após a inicialização."
    );

  }


  return supabaseClient;

}


/* ============================================================
   ESTADO
   ============================================================ */

export function isSupabaseInitialized() {

  return Boolean(
    supabaseClient
  );

}


/* ============================================================
   NORMALIZAR ERRO
   ============================================================ */

export function normalizeSupabaseError(
  error,
  context = {}
) {

  const normalized = {

    file:
      context.file ??
      "desconhecido",

    function:
      context.function ??
      "desconhecida",

    table:
      context.table ??
      "desconhecida",

    operation:
      context.operation ??
      "desconhecida",

    code:
      error?.code ??
      null,

    message:
      error?.message ??
      "Erro desconhecido do Supabase.",

    details:
      error?.details ??
      null,

    hint:
      error?.hint ??
      null,

    status:
      error?.status ??
      null,

    raw:
      error ??
      null

  };


  logSupabase(
    "error",
    "Operação Supabase falhou.",
    normalized
  );


  return normalized;

}


/* ============================================================
   EXECUTAR OPERAÇÃO
   ============================================================ */

export async function runSupabaseOperation(
  operationPromise,
  context = {}
) {

  try {

    const result =
      await operationPromise;


    if (
      result?.error
    ) {

      throw result.error;

    }


    return result;

  } catch (
    error
  ) {

    throw normalizeSupabaseError(
      error,
      context
    );

  }

}


/* ============================================================
   CONFIGURAÇÃO PÚBLICA
   ============================================================ */

export const supabaseConfig =
  Object.freeze({

    url:
      AERIOM_SUPABASE_CONFIG.url

  });


/* ============================================================
   API GLOBAL DE COMPATIBILIDADE
   ============================================================ */

globalThis.AERIOM_SUPABASE =
  Object.freeze({

    getClient:
      getSupabase,

    initialize:
      initializeSupabase,

    isInitialized:
      isSupabaseInitialized

  });