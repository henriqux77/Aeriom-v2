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
    Equipamento:'🎒', Munição:'🧨', Proteção:'🛡️', Material:'♻️', Suprimento:'📦'
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
    const address = $('afterlifeLocationAddress')?.textContent?.trim();
    const cache = Array.isArray(window.__afterlifeWorldLocationsCache) ? window.__afterlifeWorldLocationsCache : [];
    if (!title) return null;
    let match = cache.find(x => x.name === title);
    if (!match && address) match = cache.find(x => x.name === title || address.includes(Number(x.latitude).toFixed(5)));
    return match || null;
  }

  async function syncCurrentLocation() {
    const modal = $('afterlifeLocationModal');
    if (!modal?.classList.contains('is-open')) return;
    const found = findCurrentLocation();
    if (!found || !found.id) return;
    if (currentLocationId === found.id && $('afterlifeLootBox')) return;
    currentLocationId = found.id;
    currentLocation = found;
    await ensureLootUI();
    renderLoot([], 'Nenhum saque preparado.');
  }

  async function ensureLootUI() {
    const body = $('afterlifeLocationBody') || document.querySelector('.afterlife-location-body');
    const note = $('afterlifeLocationNote');
    if (!body) return;
    let box = $('afterlifeLootBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'afterlifeLootBox';
      box.className = 'afterlife-loot';
      box.innerHTML = `<div class="afterlife-loot__head"><div><div class="afterlife-loot__eyebrow">SAQUE INTELIGENTE</div><div class="afterlife-loot__hint">Os itens são influenciados pelo tipo, estado e perigo deste local.</div></div><span class="afterlife-loot__scan" id="afterlifeLootScan">—</span></div><div id="afterlifeLootItems" class="afterlife-loot__items"></div><button class="loot-action" id="afterlifeLootGenerate" type="button">VASculhar o local</button></section>`;
      (note || body).after(box);
      $('afterlifeLootGenerate').addEventListener('click', generateLoot);
    }
    box.hidden = role !== 'player';
  }

  function rarityLabel(v) { return ({comum:'Comum',incomum:'Incomum',raro:'Raro'}[v] || v || 'Comum'); }

  function renderLoot(items, statusText) {
    const list = $('afterlifeLootItems');
    const scan = $('afterlifeLootScan');
    const button = $('afterlifeLootGenerate');
    if (!list) return;
    if (scan) scan.textContent = statusText || 'Pronto';
    list.replaceChildren();
    if (!items?.length) {
      const empty = document.createElement('div'); empty.className='loot-empty'; empty.textContent='Ainda não há itens revelados. Vasculhe o local para descobrir o que restou.'; list.appendChild(empty); return;
    }
    items.forEach((item, i) => {
      const row=document.createElement('div'); row.className=`loot-item loot-reveal ${item.rarity==='raro'?'loot-item--rare':''}`; row.style.animationDelay=`${i*55}ms`;
      const icon=ICONS[item.item_category]||'📦';
      row.innerHTML=`<div class="loot-item__icon">${icon}</div><div class="loot-item__body"><strong>${esc(item.item_name)}</strong><small>${esc(item.item_category)} · ${esc(rarityLabel(item.rarity))}</small></div><span class="loot-item__qty">×${Number(item.quantity)||1}</span><button class="loot-item__claim" data-loot-id="${esc(item.id)}" ${item.claimed_at?'disabled':''}>${item.claimed_at?'COLETADO':'COLETAR'}</button>`;
      row.querySelector('.loot-item__claim').addEventListener('click', () => claimLoot(item, row));
      list.appendChild(row);
    });
    if (button) button.textContent='VASCULHAR NOVAMENTE';
  }

  async function generateLoot() {
    if (busy || !currentLocationId) return;
    busy=true;
    const button=$('afterlifeLootGenerate'); if(button){button.disabled=true;button.textContent='VASCULHANDO…';}
    try {
      await ensureAfterlifeSession();
      const {data,error}=await aeriom.rpc('generate_location_loot',{p_location_id:currentLocationId});
      if(error) throw error;
      const items=Array.isArray(data)?data:[];
      renderLoot(items, `${items.length} achado(s)`);
    } catch(e) { renderLoot([], e?.message || 'Não foi possível vasculhar este local.'); }
    finally { busy=false; if(button)button.disabled=false; }
  }

  async function claimLoot(item,row) {
    if(busy || !item?.id) return;
    const button=row.querySelector('.loot-item__claim'); if(button) {button.disabled=true;button.textContent='…';}
    busy=true;
    try {
      await ensureAfterlifeSession();
      const {data,error}=await aeriom.rpc('claim_location_loot',{p_loot_id:item.id});
      if(error) throw error;
      item.claimed_at=data?.claimed_at || new Date().toISOString();
      if(button){button.textContent='COLETADO';button.disabled=true;}
      row.classList.add('loot-reveal');
      const scan=$('afterlifeLootScan'); if(scan)scan.textContent=`${item.item_name} adicionado ao inventário`;
    } catch(e) {
      if(button){button.disabled=false;button.textContent='COLETAR';}
      alert(e?.message || 'Não foi possível coletar o item.');
    } finally { busy=false; }
  }

  window.addEventListener('afterlife:map-ready', (event)=>{boot(event.detail);setTimeout(bindLocationObserver,250);});
  if (window.__afterlifeCampaignMap?.map) { boot(window.__afterlifeCampaignMap); setTimeout(bindLocationObserver,250); }
})();
