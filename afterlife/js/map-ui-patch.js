(() => {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const campaignId = qs.get('campaign') || qs.get('id') || qs.get('selected') || sessionStorage.getItem('afterlife_current_campaign_id') || '';
  const back = document.getElementById('mapBackCampaign');
  if (back && campaignId) {
    back.href = `./campanha.html?campaign=${encodeURIComponent(campaignId)}`;
    back.textContent = '← CAMPANHA';
    back.setAttribute('aria-label', 'Voltar para a campanha atual');
  }
})();
