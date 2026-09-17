(() => {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const picker = qs.get('select') === '1';

  if (picker) {
    location.replace('./campanha-local.html?return=create');
    return;
  }

  import('./mapa-foundation.js?v=20260916-2')
    .then(() => import('./mapa-location-areas.js?v=20260917-2'))
    .catch((error) => {
      console.error('[AFTERLIFE][MAP][BOOTSTRAP]', error);
      const status = document.getElementById('mapStatus');
      if (status) {
        status.textContent = error?.message || 'Não foi possível carregar o mapa.';
        status.dataset.type = 'error';
      }
    });
})();
