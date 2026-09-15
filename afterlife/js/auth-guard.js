import { ensureAfterlifeSession } from './aeriom-client.js?v=20260915-7';

const PUBLIC_PATHS = new Set(['/Aeriom-v2/afterlife/entrar.html']);
const path = location.pathname;

function isPublicPath() {
  return PUBLIC_PATHS.has(path) || path.endsWith('/entrar.html');
}

function loginUrl() {
  const url = new URL('./entrar.html', `${location.origin}${path.substring(0, path.lastIndexOf('/') + 1)}`);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  url.searchParams.set('returnTo', returnTo);
  return url.href;
}

if (!isPublicPath()) {
  document.documentElement.dataset.afterlifeAuth = 'pending';
  window.__afterlifeAuthReady = ensureAfterlifeSession({ redirect: false }).then((session) => {
    if (!session?.user) {
      document.documentElement.dataset.afterlifeAuth = 'denied';
      location.replace(loginUrl());
      return null;
    }
    document.documentElement.dataset.afterlifeAuth = 'ok';
    return session;
  }).catch(() => {
    document.documentElement.dataset.afterlifeAuth = 'denied';
    location.replace(loginUrl());
    return null;
  });
}
