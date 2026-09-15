import './error-monitor.js?v=20260915-2';
import { aeriom, ensureAfterlifeSession } from './aeriom-client.js?v=20260915-2';
import './afterlife-sidebar.js?v=20260915-2';
import './shared-profile.js?v=20260915-2';

(() => {
  'use strict';

  const BUCKET = 'campaign-covers';
  const $ = (id) => document.getElementById(id);

  const escapeCssUrl = (url) => String(url || '').replace(/(["\\)])/g, '\\$1');

  async function loadCampaign() {
    await ensureAfterlifeSession();
    const { data: sessionData } = await aeriom.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      const portal = new URL('../index.html', location.href);
      location.replace(`${portal.pathname}?return=afterlife`);
      throw new Error('Sessão Afterlife não encontrada.');
    }

    const qs = new URLSearchParams(location.search);
    const id = qs.get('campaign') || qs.get('id') || qs.get('selected');
    if (!id) {
      location.replace('./campanhas.html');
      throw new Error('ID da campanha não informado.');
    }

    const { data, error } = await aeriom
      .from('campaigns')
      .select('id,created_by,name,description,country,tone,scale,latitude,longitude,cover_path,created_at,updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      location.replace('./campanhas.html');
      throw new Error('Campanha não encontrada ou sem permissão.');
    }

    let coverUrl = '';
    if (data.cover_path) {
      const { data: publicData } = aeriom.storage.from(BUCKET).getPublicUrl(data.cover_path);
      coverUrl = publicData?.publicUrl || '';
    }

    return { ...data, imageUrl: coverUrl, isOwner: data.created_by === user.id };
  }

  function applyCampaign(campaign) {
    $('campaignCrumb') && ($('campaignCrumb').textContent = campaign.name);
    $('campaignTitle') && ($('campaignTitle').textContent = campaign.name);
    $('campaignDescription') && ($('campaignDescription').textContent = campaign.description || '');
    $('campaignMaster') && ($('campaignMaster').textContent = campaign.isOwner ? 'Você' : 'Mestre');
    $('campaignMembersCount') && ($('campaignMembersCount').textContent = '1');
    $('membersPanelCount') && ($('membersPanelCount').textContent = '(1)');

    const scaleLabel = campaign.scale === 'local' ? 'Local' : campaign.scale === 'city' ? 'Cidade' : campaign.scale === 'regional' ? 'Regional' : 'Mundo aberto';
    $('campaignScaleLabel') && ($('campaignScaleLabel').textContent = scaleLabel);
    $('campaignLocation') && ($('campaignLocation').textContent = campaign.country || 'Local inicial');

    const coords = Number.isFinite(Number(campaign.latitude)) && Number.isFinite(Number(campaign.longitude))
      ? `${Number(campaign.latitude).toFixed(5)}°, ${Number(campaign.longitude).toFixed(5)}°`
      : 'Local não definido.';
    $('campaignCoordinates') && ($('campaignCoordinates').textContent = coords);

    if (campaign.imageUrl) {
      const hero = $('campaignHeroImage');
      const world = $('worldPreviewImage');
      if (hero) hero.style.backgroundImage = `url("${escapeCssUrl(campaign.imageUrl)}")`;
      if (world) world.style.backgroundImage = `url("${escapeCssUrl(campaign.imageUrl)}")`;
    }

    document.title = `AFTERLIFE — ${campaign.name}`;
  }

  function bindWheel() {
    const wheel = $('nuclearWheel');
    const center = $('nuclearCenter');
    if (!wheel || !center || wheel.dataset.bound === '1') return;
    wheel.dataset.bound = '1';
    center.addEventListener('click', (event) => {
      event.stopPropagation();
      wheel.classList.toggle('is-open');
      wheel.setAttribute('aria-expanded', String(wheel.classList.contains('is-open')));
    });
    wheel.querySelectorAll('[data-target]').forEach((btn) => btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;
      if (target.startsWith('./') || target.startsWith('../')) {
        location.href = target;
      } else {
        document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        wheel.classList.remove('is-open');
      }
    }));
    document.addEventListener('click', (event) => {
      if (!wheel.contains(event.target)) {
        wheel.classList.remove('is-open');
        wheel.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function bindQuickLinks() {
    document.querySelectorAll('[data-jump]').forEach((btn) => btn.addEventListener('click', () => {
      document.querySelector(btn.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $('inviteMember')?.addEventListener('click', () => navigator.clipboard?.writeText(location.href));
    $('inviteMemberCard')?.addEventListener('click', () => navigator.clipboard?.writeText(location.href));
    $('manageCampaign')?.addEventListener('click', () => {
      if (typeof window.openCampaignManager === 'function') window.openCampaignManager();
      else alert('Controles da campanha em preparação.');
    });
    $('campaignMenuButton')?.addEventListener('click', () => {
      document.querySelector('.campaign-actions-menu')?.classList.toggle('is-open');
    });
  }

  function bindCampaignNavigation() {
    document.querySelectorAll('.side-nav__item[href="#"]').forEach((link) => link.addEventListener('click', (event) => event.preventDefault()));
  }

  async function boot() {
    try {
      const campaign = await loadCampaign();
      applyCampaign(campaign);
      bindWheel();
      bindQuickLinks();
      bindCampaignNavigation();
    } catch (error) {
      console.error('[AFTERLIFE][CAMPAIGN]', error);
      const message = $('campaignMessage');
      if (message) {
        message.textContent = error?.message || 'Não foi possível carregar a campanha.';
        message.hidden = false;
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
