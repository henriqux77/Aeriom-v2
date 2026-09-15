(() => {
  'use strict';
  const KEY_PREFIX = 'afterlife_campaigns_v1_';
  const HANDOFF_KEY = 'afterlife_portal_handoff';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function getCampaigns() {
    try {
      const handoff = JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null');
      const userId = handoff?.user_id || 'anonymous';
      return JSON.parse(localStorage.getItem(KEY_PREFIX + userId) || '[]');
    } catch { return []; }
  }

  function getCampaign() {
    const qs = new URLSearchParams(location.search);
    const id = qs.get('id') || qs.get('campaign') || qs.get('selected');
    const rows = getCampaigns();
    return rows.find(row => String(row.id) === String(id)) || rows[0] || {
      id:'demo', name:'Nova Campanha', description:'Uma campanha pronta para receber a sua história.', tone:'Realista', scale:'world', latitude:null, longitude:null, locationName:'Local inicial não definido', imageData:''
    };
  }

  function applyCampaign(c) {
    $('campaignCrumb').textContent = c.name;
    $('campaignTitle').textContent = c.name;
    $('campaignDescription').textContent = c.description || 'A história da sua campanha começa aqui.';
    $('campaignMaster').textContent = 'Você';
    $('campaignMembersCount').textContent = c.membersCount || 1;
    $('membersPanelCount').textContent = '(' + (c.membersCount || 1) + ')';
    $('campaignScaleLabel').textContent = c.scale === 'local' ? 'Local' : c.scale === 'city' ? 'Cidade' : c.scale === 'regional' ? 'Regional' : 'Mundo aberto';
    $('campaignLocation').textContent = c.locationName || 'Local inicial não definido';
    const coords = Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude)) ? Number(c.latitude).toFixed(5) + '°, ' + Number(c.longitude).toFixed(5) + '°' : 'Escolha um ponto no mapa mundial.';
    $('campaignCoordinates').textContent = coords;
    const hero = $('campaignHeroImage');
    const world = $('worldPreviewImage');
    if (hero) hero.style.backgroundImage = c.imageData ? 'url("' + esc(c.imageData) + '")' : '';
    if (world && c.imageData) world.style.backgroundImage = 'url("' + esc(c.imageData) + '")';
    document.title = 'AFTERLIFE — ' + c.name;
  }

  function bindWheel() {
    const wheel = $('nuclearWheel');
    const center = $('nuclearCenter');
    if (!wheel || !center) return;
    center.addEventListener('click', e => {
      e.stopPropagation();
      wheel.classList.toggle('is-open');
      wheel.setAttribute('aria-expanded', String(wheel.classList.contains('is-open')));
    });
    wheel.querySelectorAll('[data-target]').forEach(btn => btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;
      if (target.startsWith('./') || target.startsWith('../')) location.href = target;
      else { document.querySelector(target)?.scrollIntoView({behavior:'smooth', block:'start'}); wheel.classList.remove('is-open'); }
    }));
    document.addEventListener('click', e => { if (!wheel.contains(e.target)) wheel.classList.remove('is-open'); });
  }

  function bindQuickLinks() {
    document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => document.querySelector(btn.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'})));
    $('inviteMember')?.addEventListener('click', invite);
    $('inviteMemberCard')?.addEventListener('click', invite);
    $('manageCampaign')?.addEventListener('click', () => alert('Gerenciamento da campanha será conectado aos controles do mestre.'));
    $('campaignMenuButton')?.addEventListener('click', () => alert('Opções da campanha.'));
  }

  function invite() {
    const text = 'Convide jogadores pela área de campanha.';
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(location.href).catch(()=>{});
    alert(text + '\nO link desta campanha foi preparado para compartilhamento.');
  }

  function bindCampaignNavigation() {
    document.querySelectorAll('.side-nav__item[href="#"]').forEach(link => link.addEventListener('click', e => e.preventDefault()));
  }

  function boot() {
    const campaign = getCampaign();
    applyCampaign(campaign);
    bindWheel();
    bindQuickLinks();
    bindCampaignNavigation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
