/*

* ============================================================
* AERIOM v2
* assets/js/core/supabase.js
* Cliente central do Supabase
* ============================================================
* 
* Responsabilidades:
* - Carregar o cliente oficial do Supabase via CDN.
* - Criar uma única instância do cliente no navegador.
* - Expor o cliente para os demais módulos.
* - Validar configuração antes de inicializar.
* 
* Não colocar neste arquivo:
* - regras de autenticação;
* - regras de campanha;
* - RLS;
* - lógica de páginas;
* - manipulação de DOM.
* 
* A segurança real continua no Supabase/RLS.
* ============================================================
  */

const SUPABASE_CDN_URL =
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/*

* IMPORTANTE:
* 
* Como estamos usando uma aplicação HTML/CSS/JS tradicional,
* não existe build system para injetar variáveis de ambiente.
* 
* Por isso deixamos a configuração em um objeto separado.
* 
* Antes de publicar o projeto, substitua os valores abaixo
* pelos dados públicos do seu projeto Supabase.
* 
* NUNCA coloque aqui:
* - service_role;
* - secret key;
* - qualquer chave privada.
* 
* Use somente a Publishable Key do projeto.
  */

const AERIOM_SUPABASE_CONFIG = Object.freeze({
url: "https://kitlpowgcugvlxwhwhqv.supabase.co",

/*

* Coloque aqui sua chave pública do Supabase.
* 
* Formato atual recomendado:
* sb_publishable_...
* 
* A chave publishable pode ficar no frontend.
  */
  publishableKey: "sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW",
  });

/* ============================================================
Estado interno
============================================================ */

let supabaseClient = null;
let supabaseLibraryPromise = null;

/* ============================================================
Logging
============================================================ */

function logSupabase(level, message, details = null) {
const prefix = "[AERIOM][SUPABASE]";

if (level === "error") {
console.error(prefix, message, details ?? "");
return;
}

if (level === "warn") {
console.warn(prefix, message, details ?? "");
return;
}

console.info(prefix, message, details ?? "");
}

/* ============================================================
Validação da configuração
============================================================ */

function validateConfig() {
const { url, publishableKey } = AERIOM_SUPABASE_CONFIG;

if (!url) {
throw new Error(
"SUPABASE_URL não foi configurada."
);
}

if (!publishableKey) {
throw new Error(
"SUPABASE_PUBLISHABLE_KEY não foi configurada."
);
}

try {
new URL(url);
} catch {
throw new Error(
"SUPABASE_URL não é uma URL válida."
);
}

if (
!publishableKey.startsWith("sb_publishable_") &&
!publishableKey.startsWith("eyJ")
) {
logSupabase(
"warn",
"A chave configurada não corresponde claramente ao formato publishable atual. Verifique a configuração."
);
}
}

/* ============================================================
Carregamento da biblioteca
============================================================ */

async function loadSupabaseLibrary() {
if (globalThis.supabase) {
return globalThis.supabase;
}

if (supabaseLibraryPromise) {
return supabaseLibraryPromise;
}

supabaseLibraryPromise = import(SUPABASE_CDN_URL)
.then((module) => {
if (!module?.createClient) {
throw new Error(
"A biblioteca do Supabase foi carregada, mas createClient não está disponível."
);
}

  return module;
})
.catch((error) => {
  supabaseLibraryPromise = null;

  logSupabase(
    "error",
    "Falha ao carregar o Supabase JS pela CDN.",
    error
  );

  throw error;
});

return supabaseLibraryPromise;
}

/* ============================================================
Inicialização
============================================================ */

export async function initializeSupabase() {
if (supabaseClient) {
return supabaseClient;
}

validateConfig();

try {
const { createClient } = await loadSupabaseLibrary();

supabaseClient = createClient(
  AERIOM_SUPABASE_CONFIG.url,
  AERIOM_SUPABASE_CONFIG.publishableKey,
  {
    auth: {
      /*
       * O próprio supabase-js gerencia a sessão do navegador.
       *
       * Isso NÃO representa autorização.
       * As permissões reais vêm do JWT + RLS.
       */
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },

    global: {
      headers: {
        "x-application-name": "aeriom-v2",
      },
    },
  }
);

logSupabase(
  "info",
  "Cliente Supabase inicializado."
);

return supabaseClient;

} catch (error) {
supabaseClient = null;

logSupabase(
  "error",
  "Não foi possível inicializar o cliente Supabase.",
  error
);

throw error;

}
}

/* ============================================================
Getter
============================================================ */

/**

* Retorna o cliente inicializado.
* 
* Em módulos que precisam obrigatoriamente do Supabase,
* prefira:
* 
* const supabase = await getSupabase();
* 
* Isso evita usar uma instância inexistente antes da inicialização.
  */
  export async function getSupabase() {
  if (!supabaseClient) {
  await initializeSupabase();
  }

return supabaseClient;
}

/* ============================================================
Estado
============================================================ */

/**

* Permite verificar se o cliente já foi inicializado.
  */
  export function isSupabaseInitialized() {
  return Boolean(supabaseClient);
  }

/* ============================================================
Tratamento padronizado de erros
============================================================ */

/**

* Converte um erro do Supabase em uma estrutura consistente

* para os demais módulos.
  */
  export function normalizeSupabaseError(
  error,
  context = {}
  ) {
  const normalized = {
  file: context.file ?? "desconhecido",
  function: context.function ?? "desconhecida",
  table: context.table ?? "desconhecida",
  operation: context.operation ?? "desconhecida",
  
  code: error?.code ?? null,
  message:
  error?.message ??
  "Erro desconhecido do Supabase.",
  
  details: error?.details ?? null,
  hint: error?.hint ?? null,
  
  raw: error ?? null,
  };

logSupabase(
"error",
"Operação Supabase falhou.",
normalized
);

return normalized;
}

/* ============================================================
Helper para operações
============================================================ */

/**

* Executa uma operação Supabase garantindo:

* 

* const { data, error } = ...

* 

* if (error) throw error;

* 

* Também centraliza a identificação do local do erro.
  */
  export async function runSupabaseOperation(
  operationPromise,
  context = {}
  ) {
  try {
  const result = await operationPromise;
  
  if (result?.error) {
  throw result.error;
  }
  
  return result;
  } catch (error) {
  const normalized = normalizeSupabaseError(
  error,
  context
  );
  
  throw normalized;
  }
  }

/* ============================================================
Export da configuração somente leitura
============================================================ */

/**

* Exportamos somente valores públicos da configuração.
* 
* Não existe aqui qualquer segredo.
  */
  export const supabaseConfig = Object.freeze({
  url: AERIOM_SUPABASE_CONFIG.url,
  });

/* ============================================================
Compatibilidade opcional com código legado

* 
* Nenhum módulo novo deve depender de window.supabase.
* 
* Entretanto, durante a migração e depuração,
* disponibilizamos somente uma função controlada.
  */

globalThis.AERIOM_SUPABASE = Object.freeze({
getClient: getSupabase,
initialize: initializeSupabase,
isInitialized: isSupabaseInitialized,
});

/* ============================================================
NOTA SOBRE SEGURANÇA

* 
* Este arquivo não decide:
* 
* - quem é Mestre;
* - quem é Jogador;
* - quem pertence à campanha;
* - quem pode alterar uma ficha;
* - quem pode ver segredos.
* 
* Isso será decidido pelo PostgreSQL/RLS.
* 
* O cliente simplesmente envia a requisição autenticada.
* ============================================================ */
