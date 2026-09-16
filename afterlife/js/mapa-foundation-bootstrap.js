(() => {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const picker = qs.get('select') === '1';

  const load = async () => {
    if (picker) {
      await import('./mapa-selector.js?v=20260916-1');
      return;
    }
    await import('./mapa-foundation.js?v=20260915-6');
  };

  load().catch((error) => {
    console.error('[AFTERLIFE][MAP][BOOTSTRAP]', error);
    const status = document.getElementById('mapStatus');
    if (status) {
      status.textContent = error?.message || 'Não foi possível carregar o mapa.';
      status.dataset.type = 'error';
    }
  });
})();
