import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeAreaContentBooted) return;
  window.__afterlifeAreaContentBooted = true;

  const $ = (s, root = document) => root.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const labels = { critical:'CRÍTICO', great_success:'GRANDE SUCESSO', success:'SUCESSO', failure:'FALHA', critical_failure:'FALHA CRÍTICA' };
  const tone = v => ({critical:'critical',great_success:'great',success:'success',failure:'failure',critical_failure:'critical-failure'}[v] || 'failure');

  let busy = false;

  function injectStyle(){
    if (document.getElementById('afterlife-area-content-style')) return;
    const link = document.createElement('link');
    link.id = 'afterlife-area-content-style'; link.rel = 'stylesheet';
    link.href = './css/mapa-area-content.css?v=20260917-1';
    document.head.appendChild(link);
  }

  function locationFromCache(){
    const title = document.getElementById('afterlifeLocationTitle')?.textContent?.trim();
    const cache = Array.isArray(window.__afterlifeWorldLocationsCache) ? window.__afterlifeWorldLocationsCache : [];
    return cache.find(x => x.name === title) || null;
  }

  async function findArea(){
    const loc = locationFromCache();
    if (!loc?.id) return null;
    const session = await ensureAfterlifeSession();
    if (!session?.user) return null;
    const { data, error } = await aeriom.rpc('list_campaign_location_areas', { p_location_id: loc.id });
    if (error) throw error;
    const title = $('.afterlife-area-detail__card h3')?.textContent?.trim();
    return (Array.isArray(data) ? data : []).find(a => a.name === title) || null;
  }

  function lootMarkup(items){
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return '<div class="afterlife-area-loot-empty">Nenhum saque foi encontrado nesta investigação.</div>';
    return `<div class="afterlife-area-loot-list">${list.map(item => `<article class="afterlife-area-loot-item"><div><strong>${esc(item.item_name)}</strong><span>${esc(item.item_category || 'Suprimento')} · ${esc(item.rarity || 'comum')} · x${Number(item.quantity || 1)}</span></div><button type="button" data-claim-loot="${esc(item.id)}">COLETAR</button></article>`).join('')}</div>`;
  }

  function renderResult(body, result){
    const old = body.querySelector('[data-area-content-result]');
    const box = old || document.createElement('div');
    box.dataset.areaContentResult = '';
    box.className = `afterlife-area-content-result afterlife-area-content-result--${tone(result?.result)}`;
    const creatures = Array.isArray(result?.revealed_creatures) ? result.revealed_creatures : [];
    const secrets = Array.isArray(result?.revealed_secrets) ? result.revealed_secrets : [];
    const event = result?.revealed_event && Object.keys(result.revealed_event).length ? `<pre>${esc(JSON.stringify(result.revealed_event,null,2))}</pre>` : '<p>Nenhum evento configurado para esta revelação.</p>';
    box.innerHTML = `<div class="afterlife-area-content-result__head"><span>CONTEÚDO DA ÁREA</span><strong>${esc(labels[result?.result] || result?.result || 'RESULTADO')}</strong></div>${result?.revealed_information ? `<div class="afterlife-area-content-block"><span>INFORMAÇÃO</span><p>${esc(result.revealed_information)}</p></div>` : ''}${creatures.length ? `<div class="afterlife-area-content-block"><span>CRIATURAS REVELADAS</span><div class="afterlife-area-chip-list">${creatures.map(x => `<span>${esc(typeof x === 'string' ? x : JSON.stringify(x))}</span>`).join('')}</div></div>` : ''}${event ? `<div class="afterlife-area-content-block"><span>EVENTO</span>${event}</div>` : ''}${secrets.length ? `<div class="afterlife-area-content-block"><span>SEGREDOS</span><div class="afterlife-area-secret-list">${secrets.map(x => `<div>◆ ${esc(typeof x === 'string' ? x : JSON.stringify(x))}</div>`).join('')}</div></div>` : ''}${Array.isArray(result?.loot) ? `<div class="afterlife-area-content-block"><span>SAQUE ENCONTRADO</span>${lootMarkup(result.loot)}</div>` : ''}${Number(result?.noise_delta || 0) ? `<small class="afterlife-area-content-noise">RUÍDO +${Number(result.noise_delta)}</small>` : ''}`;
    if (!old) body.appendChild(box);
    box.querySelectorAll('[data-claim-loot]').forEach(btn => btn.addEventListener('click', () => claimLoot(btn, body)));
    return box;
  }

  async function claimLoot(button, body){
    const id = button?.dataset?.claimLoot;
    if (!id || busy) return;
    busy = true; button.disabled = true; button.textContent = 'COLETANDO…';
    try {
      const { error } = await aeriom.rpc('claim_area_loot', { p_loot_id: id });
      if (error) throw error;
      const item = button.closest('.afterlife-area-loot-item');
      if (item) { item.classList.add('is-claimed'); item.querySelector('button').textContent = 'COLETADO'; }
      const status = document.createElement('div'); status.className = 'afterlife-area-loot-success'; status.textContent = 'Item adicionado ao inventário.'; body.appendChild(status);
    } catch (e) {
      button.disabled = false; button.textContent = 'COLETAR';
      alert(e?.message || 'Não foi possível coletar o saque.');
    } finally { busy = false; }
  }

  async function investigateFromP56(){
    const button = document.activeElement?.closest?.('[data-area-test]');
    const detail = button?.closest('.afterlife-area-detail__card');
    const body = detail?.querySelector('.afterlife-area-detail__body');
    if (!detail || !body || busy) return;
    const area = await findArea();
    if (!area?.id) throw new Error('Área atual não encontrada.');
    const session = await ensureAfterlifeSession();
    if (!session?.user) throw new Error('Sessão necessária.');
    const { data, error } = await aeriom.rpc('resolve_location_area_action', { p_area_id: area.id, p_action_key:'investigate' });
    if (error) throw error;
    renderResult(body, data || {});
    const actionHost = body.querySelector('[data-area-test-actions]');
    if (actionHost) actionHost.innerHTML = '<span class="afterlife-area-test-done">TESTE REGISTRADO NESTE ESTADO</span>';
  }

  function intercept(){
    document.addEventListener('click', async (event) => {
      const target = event.target?.closest?.('[data-area-test]');
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (busy) return;
      busy = true;
      target.disabled = true; target.textContent = 'REALIZANDO TESTE…';
      try { await investigateFromP56(); }
      catch (e) { alert(e?.message || 'Não foi possível realizar o teste.'); target.disabled = false; target.textContent = 'INVESTIGAR ÁREA'; }
      finally { busy = false; }
    }, true);
  }

  injectStyle();
  intercept();
})();
