(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const campaignId = qs.get('campaign') || qs.get('id') || qs.get('selected') || sessionStorage.getItem('afterlife_current_campaign_id') || '';
  if (!campaignId) return;

  document.querySelectorAll('.nuclear-item[data-target^="./personagens.html"]').forEach((button) => {
    const target = String(button.dataset.target || './personagens.html');
    const hashIndex = target.indexOf('#');
    const hash = hashIndex >= 0 ? target.slice(hashIndex) : '';
    button.dataset.target = `./personagens.html?campaign=${encodeURIComponent(campaignId)}${hash}`;
  });
})();
