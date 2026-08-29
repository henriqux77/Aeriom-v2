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
     * Publishable Key.
     *
     * Esta chave pode permanecer no frontend.
     *
     * NUNCA colocar aqui:
     *
     * - service_role
     * - secret key
     * - qualquer credencial privada
     */

    publishableKey:
      "sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW"

  });


/* ============================================================
   ESTADO INTERNO
   ============================================================ */

let supabaseClient =
  null;


/*
 * Promise exclusiva para carregar a biblioteca.
 *
 * Ela NÃO representa o cliente.
 */

let supabaseLibraryPromise =
  null;


/*
 * Promise exclusiva para inicializar o cliente.
 *
 * Isso impede duas chamadas simultâneas de criarem
 * duas instâncias diferentes.
 */

let supabaseClientPromise =
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
   CONFIGURAÇÃO
   ============================================================ */

function validateConfig() {

  const {
    url,
    publishableKey
  } =
    AERIOM_SUPABASE_CONFIG;


  if (
    typeof url !==
      "string" ||
    !url.trim()
  ) {

    throw new Error(
      "SUPABASE_URL não foi configurada."
    );

  }


  if (
    typeof publishableKey !==
      "string" ||
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
   * Aceitamos:
   *
   * sb_publishable_...
   *
   * e JWT legado iniciando com eyJ.
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
      "A chave configurada não corresponde claramente ao formato esperado de uma chave pública."
    );

  }

}


/* ============================================================
   CARREGAR BIBLIOTECA
   ============================================================ */

async function loadSupabaseLibrary() {

  /*
   * Se a biblioteca já está sendo carregada,
   * reutilizamos a mesma Promise.
   */

  if (
    supabaseLibraryPromise
  ) {

    return supabaseLibraryPromise;

  }


  supabaseLibraryPromise =
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
           * Permite nova tentativa caso a CDN falhe.
           */

          supabaseLibraryPromise =
            null;


          logSupabase(
            "error",
            "Falha ao carregar o Supabase JS pela CDN.",
            error
          );


          throw error;

        }
      );


  return supabaseLibraryPromise;

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
           * Necessário para:
           *
           * - sessão persistente;
           * - renovação automática;
           * - processamento de callback OAuth/e-mail.
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
   INICIALIZAÇÃO
   ============================================================ */

export async function initializeSupabase() {

  /*
   * Já inicializado.
   */

  if (
    supabaseClient
  ) {

    return supabaseClient;

  }


  /*
   * Já existe uma inicialização em andamento.
   *
   * Todas as chamadas passam a aguardar a mesma Promise.
   */

  if (
    supabaseClientPromise
  ) {

    return supabaseClientPromise;

  }


  validateConfig();


  supabaseClientPromise =
    (async () => {

      try {

        const module =
          await loadSupabaseLibrary();


        const client =
          createSupabaseClient(
            module.createClient
          );


        supabaseClient =
          client;


        logSupabase(
          "info",
          "Cliente Supabase inicializado com sucesso."
        );


        return client;

      } catch (
        error
      ) {

        /*
         * Limpa somente a Promise do cliente.
         *
         * A Promise da biblioteca poderá continuar existente
         * caso o carregamento tenha sido concluído.
         */

        supabaseClientPromise =
          null;


        supabaseClient =
          null;


        logSupabase(
          "error",
          "Não foi possível inicializar o cliente Supabase.",
          error
        );


        throw error;

      }

    })();


  return supabaseClientPromise;

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


  const client =
    await initializeSupabase();


  if (
    !client
  ) {

    throw new Error(
      "Cliente Supabase não disponível após a inicialização."
    );

  }


  return client;

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


/* ============================================================
   DIAGNÓSTICO
   ============================================================ */

export function getSupabaseDiagnostic() {

  return Object.freeze({

    initialized:
      Boolean(
        supabaseClient
      ),

    libraryLoading:
      Boolean(
        supabaseLibraryPromise
      ),

    clientInitializing:
      Boolean(
        supabaseClientPromise
      ),

    hasAuth:
      Boolean(
        supabaseClient?.auth
      ),

    url:
      AERIOM_SUPABASE_CONFIG.url

  });

}