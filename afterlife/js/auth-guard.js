import { ensureAfterlifeSession } from './aeriom-client-v2.js?v=1';

const path = location.pathname;
const publicPath = path.endsWith('/entrar.html');

function loginUrl() {
  const base = `${location.origin}${path.substring(0, path.lastIndexOf('/') + 1)}`;
  const url = new URL('./entrar.html', base);
  url.searchParams.set('returnTo', `${location.pathname}${location.search}${location.hash}`);
  return url.href;
}

if (!publicPath) {
  document.documentElement.dataset.afterlifeAuth = 'pending';
  window.__afterlifeAuthReady = ensureAfterlifeSession().then((session) => {
    if (!session?.user) {
      document.documentElement.dataset.afterlifeAuth = 'denied';
      location.replace(loginUrl());
      return null;
    }
    document.documentElement.dataset.afterlifeAuth = 'ok';
    return session;
  });
}
