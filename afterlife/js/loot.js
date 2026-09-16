import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeLootBooted) return;
  window.__afterlifeLootBooted = true;

  const $ = (id) => document.getElementById(id);
  let campaign = null;
  let role = 'player';
  let currentLocationId = null;
  let currentLocation = null;
  let busy = false;

  const ICONS = {
    Alimento:'🥫', Água:'💧', Médico:'🩹', Combustível:'⛽', Peças:'⚙️', Oficina:'🔧',
    Equipamento:'🎒', Munição:'🧨', Proteção:'🛡️', Material:'♻️', Suprimento:'📦', Ferramenta:'🔧', Peça:'⚙️'
  };
  const ACTIONS = [
    { key:'search', icon:'🔎', label:'VASCULHAR', hint:'Procurar recursos, objetos e pistas.' },
    { key:'observe', icon:'👁️', label:'OBSERVAR', hint:'Perceber ameaças, rastros e alterações.' },
    { key:'investigate', icon:'🧠', label:'INVESTIGAR', hint:'Analisar detalhes e evidências do local.' }
  ];

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const resultLabel = (v) => ({critical:'CRÍTICO',great_success:'SUCESSO ELEVADO',success:'SUCESSO',failure:'FALHA',critical_failure:'FALHA CRÍTICA'}[v] || v || '—');
  const rarityLabel = (v) => ({comum:'Comum',incomum:'Incomum',raro:'Raro'}[v] || v || 'Comum');
  const actionLabel = (v) => ({search:'Vasculhar',observe:'Observar',investigate:'Investigar',track:'Rastrear'}[v] || v);

  function boot(detail) {
    campaign = detail?.campaign || window.__afterlifeCampaignMap?.campaign || null;
    role = detail?.role || window.__afterlifeCampaignMap?.role || 'player';
    setTimeout(() => bindLocationObserver(), 0);
  }

  function bindLocationObserver() {
    const modal = $('afterlifeLocationModal');
    if (!modal || modal.dataset.lootObserver) return;
    modal.dataset.lootObserver = '1';
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('is-open')) return;
      syncCurrentLocation().catch((e) => console.warn('[AFTERLIFE][LOOT]', e));
    });
    observer.observe(modal, { attributes:true, attributeFilter:['class'], childList:true, subtree:true });
    syncCurrentLocation().catch(()=>{});
  }

  function findCurrentLocation() {
    const title = $('afterlifeLocationTitle')?.textContent?.trim();
    const cache = Array.isArray(window.__afterlifeWorldLocationsCache) ? window.__afterlifeWorldLocationsCache : [];
    if (!title) return null;
    return cache.find(x => x.name === title) || currentLocation || null;
  }

  async function syncCurrentLocation() {
    const modal = $('afterlifeLocationModal');
    if (!modal?.classList.contains('is-open') || role !== 'player') return;
    const found = findCurrentLocation();
    if (!found || !found.id) return;
    const changed = currentLocationId !== found.id;
    currentLocationId = found.id;
    currentLocation = found;
    await ensureLootUI();
    if (changed) renderActionBox(null);
  }

  async function ensureLootUI() {
    const body = $('afterlifeLocationBody') || document.querySelector('.afterlife-location-body');
    const note = $('afterlifeLocationNote');
    if (!body || role !== 'player') return;
    let box = $('afterlifeLootBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'afterlifeLootBox';
      box.className = 'afterlife-loot';
      box.innerHTML = `
        <div class="afterlife-loot__head">
          <div><div class="afterlife-loot__eyebrow">MOTOR DE EXPLORAÇÃO</div><div class="afterlife-loot__hint">Você declara a intenção. O sistema escolhe perícia, atributo, dado, dificuldade e consequência automaticamente.</div></div>
          <span class="afterlife-loot__scan" id="afterlifeLootScan">PRONTO</span>
        </div>
        <div class="afterlife-exploration-actions" id="afterlifeExplorationActions"></div>
        <div class="afterlife-test-result" id="afterlifeTestResult" hidden></div>
        <div class="afterlife-loot__divider"><span>SAQUE REVELADO</span></div>
        <div id="afterlifeLootItems" class="afterlife-loot__items"></div>`;
      (note || body).after(box);
      renderActionButtons();
    } else {
      renderActionButtons();
    }
  }

  function renderActionButtons() {
    const root = $('afterlifeExplorationActions');
    if (!root) return;
    root.replaceChildren();
    ACTIONS.forEach((action) => {
      const button = document.createElement('button');
      button.type='button';
      button.className='exploration-action';
      button.dataset.action=action.key;
      button.innerHTML=`<span class="exploration-action__icon">${action.icon}</span><span class="exploration-action__copy"><strong>${action.label}</strong><small>${action.hint}</small></span>`;
      button.addEventListener('click',()=>resolveAction(action.key));
      root.appendChild(button);
    });
  }

  function setButtonsDisabled(disabled, activeKey='') {
    document.querySelectorAll('.exploration-action').forEach((button)=>{
      button.disabled=disabled;
      button.classList.toggle('is-active', button.dataset.action===activeKey && disabled);
    });
  }

  function renderActionBox(test) {
    const result = $('afterlifeTestResult');
    const scan = $('afterlifeLootScan');
    if (!result) return;
    result.hidden = !test;
    if (!test) {
      result.replaceChildren();
      renderLoot([], 'PRONTO');
      return;
    }
    const resultClass = test.result==='critical' ? 'is-critical' : (test.result==='critical_failure' ? 'is-danger' : test.result==='failure' ? 'is-fail' : 'is-success');
    result.className=`afterlife-test-result ${resultClass}`;
    const calc=`${test.die} + ${Number(test.training_bonus)||0} + ${Number(test.modifier)||0}`;
    result.innerHTML=`<div class="afterlife-test-result__top"><div><span>${esc(actionLabel(test.action))} · ${esc(test.skill_label)}</span><strong>${esc(resultLabel(test.result))}</strong></div><div class="afterlife-test-total"><b>${Number(test.total)||0}</b><small>CD ${Number(test.difficulty)||0}</small></div></div><div class="afterlife-test-result__calc">🎲 ${esc(calc)} → natural <b>${Number(test.natural_roll)||0}</b> · ${esc(test.attribute_label)} ${esc(test.die)}</div><p>${esc(test.consequence||'')}</p>${Number(test.noise_delta)>0?`<small class="afterlife-test-noise">🔊 Ruído +${Number(test.noise_delta)} · nível atual ${Number(test.noise_level)||0}/5</small>`:''}`;
    if (scan) scan.textContent = resultLabel(test.result);
    renderLoot(Array.isArray(test.loot)?test.loot:[], test.loot?.length ? `${test.loot.length} achado(s)` : 'SEM SAQUE');
  }

  async function resolveAction(actionKey) {
    if (busy || !currentLocationId) return;
    busy=true;
    setButtonsDisabled(true, actionKey);
    const result = $('afterlifeTestResult');
    const scan = $('afterlifeLootScan');
    if (scan) scan.textContent='ROLANDO…';
    if (result) { result.hidden=false; result.className='afterlife-test-result is-pending'; result.innerHTML='<div class="afterlife-test-pending">🎲 O sistema está calculando sua ação…</div>'; }
    try {
      await ensureAfterlifeSession();
      const {data,error}=await aeriom.rpc('resolve_location_action',{p_location_id:currentLocationId,p_action_key:actionKey});
      if(error) throw error;
      renderActionBox(data||null);
    } catch(e) {
      const message=e?.message||'Não foi possível executar esta ação.';
      if (result) { result.hidden=false; result.className='afterlife-test-result is-blocked'; result.innerHTML=`<strong>⏳ AÇÃO NÃO DISPONÍVEL</strong><p>${esc(message)}</p>`; }
      if (scan) scan.textContent='AGUARDANDO';
    } finally {
      busy=false;
      setButtonsDisabled(false);
    }
  }

  function renderLoot(items, statusText) {
    const list = $('afterlifeLootItems');
    if (!list) return;
    list.replaceChildren();
    if (!items?.length) {
      const empty=document.createElement('div'); empty.className='loot-empty'; empty.textContent='Nenhum recurso foi revelado nesta ação.'; list.appendChild(empty); return;
    }
    items.forEach((item, i) => {
      const row=document.createElement('div'); row.className=`loot-item loot-reveal ${item.rarity==='raro'?'loot-item--rare':''}`; row.style.animationDelay=`${i*55}ms`;
      const icon=ICONS[item.item_category]||'📦';
      row.innerHTML=`<div class="loot-item__icon">${icon}</div><div class="loot-item__body"><strong>${esc(item.item_name)}</strong><small>${esc(item.item_category)} · ${esc(rarityLabel(item.rarity))}</small></div><span class="loot-item__qty">×${Number(item.quantity)||1}</span><button class="loot-item__claim" data-loot-id="${esc(item.id)}" ${item.claimed_at?'disabled':''}>${item.claimed_at?'COLETADO':'COLETAR'}</button>`;
      row.querySelector('.loot-item__claim').addEventListener('click', () => claimLoot(item, row));
      list.appendChild(row);
    });
  }

  async function claimLoot(item,row) {
    if(busy || !item?.id) return;
    const button=row.querySelector('.loot-item__claim');
    if(button){button.disabled=true;button.textContent='…';}
    busy=true;
    try {
      await ensureAfterlifeSession();
      const {data,error}=await aeriom.rpc('claim_location_loot',{p_loot_id:item.id});
      if(error) throw error;
      item.claimed_at=data?.claimed_at||new Date().toISOString();
      if(button){button.textContent='COLETADO';button.disabled=true;}
      const scan=$('afterlifeLootScan'); if(scan)scan.textContent=`${item.item_name} → INVENTÁRIO`;
    } catch(e) {
      if(button){button.disabled=false;button.textContent='COLETAR';}
      alert(e?.message||'Não foi possível coletar o item.');
    } finally { busy=false; }
  }

  window.addEventListener('afterlife:map-ready',(event)=>{boot(event.detail);setTimeout(bindLocationObserver,250);});
  if(window.__afterlifeCampaignMap?.map){boot(window.__afterlifeCampaignMap);setTimeout(bindLocationObserver,250);}
})();