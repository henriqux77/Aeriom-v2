import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeLocationAreasBooted) return;
  window.__afterlifeLocationAreasBooted = true;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseJson = (value, fallback) => { try { const parsed = JSON.parse(value); return parsed; } catch { return fallback; } };
  const dangerLabel = (v) => ({unknown:'Não definido',low:'Baixo',medium:'Médio',high:'Alto',critical:'Crítico'}[v] || v || 'Não definido');
  const resultLabel = (v) => ({critical:'CRÍTICO',great_success:'GRANDE SUCESSO',success:'SUCESSO',failure:'FALHA',critical_failure:'FALHA CRÍTICA'}[v] || v || '—');
  const resultTone = (v) => ({critical:'critical',great_success:'great',success:'success',failure:'failure',critical_failure:'critical-failure'}[v] || 'failure');

  let campaign = null;
  let role = 'player';
  let currentLocation = null;
  let currentAreas = [];
  let currentModal = null;
  let channel = null;
  let observer = null;
  let busy = false;

  function injectStyle() {
    if (document.getElementById('afterlife-location-areas-style')) return;
    const link = document.createElement('link');
    link.id = 'afterlife-location-areas-style';
    link.rel = 'stylesheet';
    link.href = './css/mapa-location-areas.css?v=20260917-1';
    document.head.appendChild(link);
  }

  function getLocationFromCache() {
    const cache = Array.isArray(window.__afterlifeWorldLocationsCache) ? window.__afterlifeWorldLocationsCache : [];
    const title = $('afterlifeLocationTitle')?.textContent?.trim();
    if (!title) return currentLocation || null;
    return cache.find((x) => x.name === title) || currentLocation || null;
  }

  async function loadAreas(location) {
    if (!location?.id) return [];
    const session = await ensureAfterlifeSession();
    if (!session?.user) return [];
    const { data, error } = await aeriom.rpc('list_campaign_location_areas', { p_location_id: location.id });
    if (error) throw error;
    currentAreas = Array.isArray(data) ? data : [];
    return currentAreas;
  }

  function areaPublicCard(area) {
    const card = document.createElement('article');
    card.className = 'afterlife-area-card';
    const investigated = area?.state?.investigated === true;
    card.innerHTML = `<div class="afterlife-area-card__icon">◈</div><div class="afterlife-area-card__copy"><strong>${esc(area.name)}</strong><span>${esc(area.category || 'Área')}${investigated ? ' · investigada' : ''}</span><p>${esc(area.description || 'Esta área ainda não possui uma descrição pública.')}</p></div><button type="button" class="afterlife-area-card__open">ABRIR</button>`;
    card.querySelector('button').addEventListener('click', () => openAreaDetail(area, false));
    return card;
  }

  function areaMasterRow(area) {
    const row = document.createElement('div');
    row.className = 'afterlife-area-master-row';
    row.innerHTML = `<div><strong>${esc(area.name)}</strong><span>${esc(area.category || 'Área')} · perigo ${esc(dangerLabel(area.danger))}${area.difficulty != null ? ` · CD ${Number(area.difficulty)}` : ''}${area?.state?.investigated ? ' · investigada' : ''}</span></div><div class="afterlife-area-master-actions"><button type="button" data-action="edit">EDITAR</button><button type="button" data-action="delete">EXCLUIR</button></div>`;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openAreaForm(area));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteArea(area));
    return row;
  }

  function ensureAreaSection() {
    const body = document.querySelector('.afterlife-location-body');
    if (!body) return null;
    let section = document.getElementById('afterlifeLocationAreas');
    if (!section) {
      section = document.createElement('section');
      section.id = 'afterlifeLocationAreas';
      section.className = 'afterlife-location-areas';
      body.insertBefore(section, $('afterlifeLocationActions') || null);
    }
    return section;
  }

  function renderAreas(location) {
    const section = ensureAreaSection();
    if (!section) return;
    section.replaceChildren();
    const head = document.createElement('div');
    head.className = 'afterlife-location-areas__head';
    head.innerHTML = `<div><span class="afterlife-location-areas__eyebrow">INTERIOR DO LOCAL</span><strong>ÁREAS E AMBIENTES</strong><small>${role === 'master' ? 'Configure as áreas que existem dentro deste local.' : 'Você entrou na ficha do local. Cada ambiente pode guardar uma descoberta diferente.'}</small></div>`;
    section.appendChild(head);

    if (role === 'master') {
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'afterlife-area-add'; add.textContent = '+ NOVA ÁREA';
      add.addEventListener('click', () => openAreaForm(null));
      head.appendChild(add);
      if (!currentAreas.length) {
        const empty = document.createElement('div'); empty.className = 'afterlife-area-empty'; empty.textContent = 'Nenhuma área cadastrada. Crie os ambientes internos deste local.'; section.appendChild(empty); return;
      }
      const list = document.createElement('div'); list.className = 'afterlife-area-master-list'; currentAreas.forEach((a) => list.appendChild(areaMasterRow(a))); section.appendChild(list);
      return;
    }

    if (!currentAreas.length) {
      const empty = document.createElement('div'); empty.className = 'afterlife-area-empty'; empty.innerHTML = '<strong>Nenhuma área conhecida</strong><span>O Mestre ainda não configurou os ambientes deste local.</span>'; section.appendChild(empty); return;
    }
    const list = document.createElement('div'); list.className = 'afterlife-area-list'; currentAreas.forEach((a) => list.appendChild(areaPublicCard(a))); section.appendChild(list);
  }

  function renderTestBlock(result) {
    const tone = resultTone(result?.result);
    const lootText = Array.isArray(result?.revealed_creatures) && result.revealed_creatures.length
      ? result.revealed_creatures.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(', ')
      : '';
    const secretText = Array.isArray(result?.revealed_secrets) && result.revealed_secrets.length
      ? result.revealed_secrets.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(', ')
      : '';
    return `<div class="afterlife-area-test-result afterlife-area-test-result--${tone}"><div class="afterlife-area-test-result__top"><span>AUTOTESTE · ${esc(result.action)}</span><strong>${esc(resultLabel(result.result))}</strong></div><div class="afterlife-area-test-result__roll"><div><span>TESTE</span><strong>${esc(result.skill_label || 'Investigação')}</strong><small>${esc(result.attribute_label || 'Intelecto')} · ${esc(result.die || 'D8')}</small></div><div class="afterlife-area-test-result__score"><b>${Number(result.total ?? 0)}</b><span>/ CD ${Number(result.difficulty ?? 0)}</span></div></div><p>${esc(result.consequence || result.discovery_text || 'Resultado concluído.')}</p>${result.discovery_text ? `<div class="afterlife-area-test-result__discovery"><span>DESCOBERTA</span><strong>${esc(result.discovery_text)}</strong></div>` : ''}${result.revealed_information ? `<div class="afterlife-area-test-result__reveal"><span>INFORMAÇÃO</span><p>${esc(result.revealed_information)}</p></div>` : ''}${result.revealed_event && Object.keys(result.revealed_event || {}).length ? `<div class="afterlife-area-test-result__reveal"><span>EVENTO</span><pre>${esc(JSON.stringify(result.revealed_event, null, 2))}</pre></div>` : ''}${lootText ? `<div class="afterlife-area-test-result__reveal"><span>CRIATURAS</span><p>${esc(lootText)}</p></div>` : ''}${secretText ? `<div class="afterlife-area-test-result__reveal"><span>SEGREDOS</span><p>${esc(secretText)}</p></div>` : ''}${Number(result.noise_delta || 0) ? `<small class="afterlife-area-test-result__noise">RUÍDO +${Number(result.noise_delta)}</small>` : ''}</div>`;
  }

  async function runAreaAction(area, action = 'investigate', detailBody) {
    if (busy || !area?.id) return;
    const button = detailBody?.querySelector('[data-area-test]');
    if (button) { button.disabled = true; button.textContent = 'REALIZANDO TESTE…'; }
    busy = true;
    try {
      const session = await ensureAfterlifeSession();
      if (!session?.user) throw new Error('Sessão necessária.');
      const { data, error } = await aeriom.rpc('resolve_location_area_action', { p_area_id: area.id, p_action_key: action });
      if (error) throw error;
      area.state = { ...(area.state || {}), investigated: true };
      const resultHost = detailBody?.querySelector('[data-area-test-result]');
      if (resultHost) resultHost.innerHTML = renderTestBlock(data || {});
      const actionHost = detailBody?.querySelector('[data-area-test-actions]');
      if (actionHost) actionHost.innerHTML = '<span class="afterlife-area-test-done">TESTE REGISTRADO NESTE ESTADO</span>';
      await refresh();
    } catch (error) {
      const msg = error?.message || 'Não foi possível realizar o teste.';
      const resultHost = detailBody?.querySelector('[data-area-test-result]');
      if (resultHost) resultHost.innerHTML = `<div class="afterlife-area-test-error">${esc(msg)}</div>`;
      if (button) { button.disabled = false; button.textContent = 'INVESTIGAR ÁREA'; }
    } finally { busy = false; }
  }

  function openAreaDetail(area, masterView) {
    const layer = document.createElement('div');
    layer.className = 'afterlife-area-detail';
    const publicMode = !masterView;
    layer.innerHTML = `<div class="afterlife-area-detail__card"><header><div><span>${esc(area.category || 'ÁREA')}</span><h3>${esc(area.name)}</h3></div><button type="button" aria-label="Fechar">×</button></header><div class="afterlife-area-detail__body"><div class="afterlife-area-detail__description"><strong>DESCRIÇÃO</strong><p>${esc(area.description || 'Nenhuma descrição registrada.')}</p></div>${publicMode ? `<div class="afterlife-area-investigation"><div class="afterlife-area-investigation__head"><div><span>INVESTIGAÇÃO AUTOMÁTICA</span><strong>O que há neste ambiente?</strong><small>O sistema usa a ficha do personagem e faz o teste automaticamente.</small></div><button type="button" data-area-test>INVESTIGAR ÁREA</button></div><div data-area-test-result></div><div data-area-test-actions></div></div>` : `<div class="afterlife-area-detail__grid"><div><span>PERIGO</span><strong>${esc(dangerLabel(area.danger))}</strong></div><div><span>DIFICULDADE</span><strong>${area.difficulty == null ? '—' : `CD ${Number(area.difficulty)}`}</strong></div><div><span>CRIATURAS</span><strong>${Array.isArray(area.creatures) ? area.creatures.length : 0}</strong></div><div><span>SEGREDOS</span><strong>${Array.isArray(area.secrets) ? area.secrets.length : 0}</strong></div></div><div class="afterlife-area-master-info"><strong>INFORMAÇÕES INTERNAS</strong><p>${esc(area.information || '—')}</p><strong>EVENTO</strong><pre>${esc(JSON.stringify(area.event || {}, null, 2))}</pre><strong>LOOT</strong><pre>${esc(JSON.stringify(area.loot_profile || {}, null, 2))}</pre></div>`}</div></div>`;
    layer.addEventListener('click', (e) => { if (e.target === layer || e.target.closest('header button')) layer.remove(); });
    document.body.appendChild(layer);
    const actionButton = layer.querySelector('[data-area-test]');
    if (actionButton) actionButton.addEventListener('click', () => runAreaAction(area, 'investigate', layer.querySelector('.afterlife-area-detail__body')));
  }

  function openAreaForm(area) {
    if (!currentLocation?.id || role !== 'master') return;
    const edit = Boolean(area);
    const wrap = document.createElement('div');
    wrap.className = 'afterlife-area-detail';
    wrap.innerHTML = `<div class="afterlife-area-detail__card afterlife-area-form"><header><div><span>${edit ? 'EDITAR ÁREA' : 'NOVA ÁREA'}</span><h3>${edit ? esc(area.name) : 'Nova área interna'}</h3></div><button type="button">×</button></header><div class="afterlife-area-form__body"><label>Nome<input id="areaName" maxlength="100" value="${esc(area?.name || '')}" placeholder="Ex.: Recepção"></label><label>Categoria<input id="areaCategory" maxlength="50" value="${esc(area?.category || 'área')}" placeholder="Ex.: recepção"></label><label>Descrição pública<textarea id="areaDescription" maxlength="500" placeholder="O que o grupo pode saber ao entrar?">${esc(area?.description || '')}</textarea></label><div class="afterlife-area-form__two"><label>Perigo<select id="areaDanger"><option value="unknown">Não definido</option><option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option></select></label><label>Dificuldade<input id="areaDifficulty" type="number" min="0" max="30" value="${area?.difficulty ?? ''}" placeholder="CD"></label></div><label>Informação interna<textarea id="areaInformation" maxlength="1200" placeholder="Pistas e informações que o Mestre pode liberar depois.">${esc(area?.information || '')}</textarea></label><label>Evento (JSON)<textarea id="areaEvent" class="mono" placeholder='{"type":"event"}'>${esc(JSON.stringify(area?.event || {}, null, 2))}</textarea></label><label>Perfil de loot (JSON)<textarea id="areaLoot" class="mono" placeholder='{"categories":["medical"]}'>${esc(JSON.stringify(area?.loot_profile || {}, null, 2))}</textarea></label><label>Criaturas (JSON)<textarea id="areaCreatures" class="mono" placeholder='["zombie"]'>${esc(JSON.stringify(area?.creatures || [], null, 2))}</textarea></label><label>Segredos (JSON)<textarea id="areaSecrets" class="mono" placeholder='["porta selada"]'>${esc(JSON.stringify(area?.secrets || [], null, 2))}</textarea></label><div class="afterlife-area-form__actions"><button type="button" class="secondary" id="areaCancel">CANCELAR</button><button type="button" class="primary" id="areaSave">SALVAR ÁREA</button></div></div></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#areaDanger').value = area?.danger || 'unknown';
    wrap.querySelector('header button').onclick = () => wrap.remove();
    wrap.querySelector('#areaCancel').onclick = () => wrap.remove();
    wrap.querySelector('#areaSave').onclick = async () => {
      if (busy) return;
      const name = wrap.querySelector('#areaName').value.trim();
      if (!name) { alert('Digite o nome da área.'); return; }
      const parse = (selector, fallback) => parseJson(wrap.querySelector(selector).value, fallback);
      busy = true;
      try {
        const payload = {
          p_location_id: currentLocation.id,
          p_name: name,
          p_category: wrap.querySelector('#areaCategory').value.trim() || 'área',
          p_description: wrap.querySelector('#areaDescription').value.trim() || null,
          p_difficulty: wrap.querySelector('#areaDifficulty').value === '' ? null : Number(wrap.querySelector('#areaDifficulty').value),
          p_danger: wrap.querySelector('#areaDanger').value,
          p_information: wrap.querySelector('#areaInformation').value.trim() || null,
          p_event: parse('#areaEvent', {}), p_loot_profile: parse('#areaLoot', {}),
          p_creatures: parse('#areaCreatures', []), p_secrets: parse('#areaSecrets', [])
        };
        const result = edit ? await aeriom.rpc('update_campaign_location_area', { ...payload, p_id: area.id, p_state: null }) : await aeriom.rpc('create_campaign_location_area', payload);
        if (result.error) throw result.error;
        wrap.remove();
        await refresh();
      } catch (error) { alert(error?.message || 'Não foi possível salvar a área.'); }
      finally { busy = false; }
    };
  }

  async function deleteArea(area) {
    if (busy || !confirm(`Excluir a área “${area.name}”?`)) return;
    busy = true;
    try {
      const { error } = await aeriom.rpc('delete_campaign_location_area', { p_id: area.id });
      if (error) throw error;
      await refresh();
    } catch (error) { alert(error?.message || 'Não foi possível excluir a área.'); }
    finally { busy = false; }
  }

  async function refresh() {
    currentLocation = getLocationFromCache();
    if (!currentLocation?.id) return;
    await loadAreas(currentLocation);
    renderAreas(currentLocation);
  }

  function observeModal() {
    const modal = $('afterlifeLocationModal');
    if (!modal || observer) return;
    observer = new MutationObserver(() => {
      if (!modal.classList.contains('is-open')) return;
      const loc = getLocationFromCache();
      if (!loc?.id) return;
      if (currentModal !== loc.id) { currentModal = loc.id; refresh().catch((e) => console.warn('[AFTERLIFE][AREAS]', e)); }
      else if (!document.getElementById('afterlifeLocationAreas')) refresh().catch(() => {});
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    if (modal.classList.contains('is-open')) refresh().catch(() => {});
  }

  function subscribeRealtime() {
    if (!campaign?.id || !aeriom?.channel) return;
    if (channel) { try { aeriom.removeChannel(channel); } catch {} }
    channel = aeriom.channel(`afterlife-location-areas:${campaign.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'campaign_location_areas', filter:`campaign_id=eq.${campaign.id}` }, (payload) => {
        const next = payload.new || payload.old;
        if (!currentLocation?.id || next?.location_id !== currentLocation.id) return;
        refresh().catch((e) => console.warn('[AFTERLIFE][AREAS][REALTIME]', e));
      }).subscribe();
  }

  function boot(detail) {
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    injectStyle();
    setTimeout(() => { observeModal(); subscribeRealtime(); }, 0);
  }

  window.addEventListener('afterlife:map-ready', (e) => boot(e.detail), { once: true });
  if (window.__afterlifeCampaignMap?.map) boot(window.__afterlifeCampaignMap);
})();
