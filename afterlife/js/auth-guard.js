import { ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-4';

const path = location.pathname;
const publicPath = path.endsWith('/entrar.html');

function safeReturnTo() {
  const value = `${path}${location.search}${location.hash}`;
  if (!path.includes('/Aeriom-v2/afterlife/')) return '/Aeriom-v2/afterlife/index.html';
  if (path.endsWith('/entrar.html')) return '/Aeriom-v2/afterlife/index.html';
  return value;
}

function portalUrl() {
  const url = new URL('../index.html', location.href);
  url.searchParams.set('afterlife', '1');
  url.searchParams.set('returnTo', safeReturnTo());
  return url.href;
}

if (!publicPath) {
  document.documentElement.dataset.afterlifeAuth = 'pending';
  const style = document.createElement('style');
  style.textContent = 'html[data-afterlife-auth="pending"] body,html[data-afterlife-auth="denied"] body{visibility:hidden!important}';
  document.head.appendChild(style);

  window.__afterlifeAuthReady = ensureAfterlifeSession().then((session) => {
    if (!session?.user) {
      document.documentElement.dataset.afterlifeAuth = 'denied';
      location.replace(portalUrl());
      return null;
    }
    document.documentElement.dataset.afterlifeAuth = 'ok';
    return session;
  }).catch((error) => {
    console.warn('[AFTERLIFE][GUARD]', error?.message || error);
    document.documentElement.dataset.afterlifeAuth = 'denied';
    location.replace(portalUrl());
    return null;
  });
}
