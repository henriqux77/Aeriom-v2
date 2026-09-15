(() => {
  'use strict';
  function boot() {
    const list = document.getElementById('campaignList');
    if (!list || list.dataset.campaignDetailFix === '1') return;
    list.dataset.campaignDetailFix = '1';
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open]');
      if (!button || !list.contains(button)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = button.dataset.open;
      if (id) window.location.href = './campanha.html?id=' + encodeURIComponent(id);
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
