(() => {
  'use strict';

  function normalizeCountry(value) {
    const text = String(value || '').trim();
    if (!text) return 'Local não definido';
    const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
    const last = parts.at(-1) || text;
    return last.slice(0, 120) || 'Local não definido';
  }

  function applyCountryBeforeSubmit() {
    const field = document.getElementById('campaignLocationName');
    if (!field) return;
    field.value = normalizeCountry(field.value);
  }

  document.addEventListener('submit', applyCountryBeforeSubmit, true);
})();
