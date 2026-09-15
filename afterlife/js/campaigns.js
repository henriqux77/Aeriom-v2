import './error-monitor.js?v=20260915-1';
import { aeriom, ensureAfterlifeSession } from './aeriom-client.js?v=20260915-1';
import './afterlife-sidebar.js?v=20260915-1';

(() => {
  'use strict';

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const BUCKET = 'campaign-covers';
  const $ = (id) => document.getElementById(id);
  let user = null;
  let campaignImageFile = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[c]));

  function setMessage(text = '') {
    const el = $('campaignMessage');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-visible', Boolean(text));
  }

  function resetCampaignImage() {
    campaignImageFile = null;
    const input = $('campaignImageFile');
    const preview = $('campaignImagePreview');
    const img = $('campaignImagePreviewImg');
    const name = $('campaignImageFileName');
    if (input) input.value = '';
    if (preview) preview.hidden = true;
    if (img) img.removeAttribute('src');
    if (name) name.textContent = 'Imagem selecionada';
  }

  function toggleCreate(show) {
    const panel = $('createPanel');
    if (!panel) return;
    panel.hidden = !show;
    if (show) requestAnimationFrame(() => $('campaignName')?.focus());
    else {
      setMessage('');
      $('campaignForm')?.reset();
      resetCampaignImage();
    }
  }

  async function loadCampaigns() {
    if (!user?.id) return [];
    const { data, error } = await aeriom
      .from('campaigns')
      .select('id,created_by,name,description,country,tone,scale,latitude,longitude,cover_path,created_at,updated_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const enriched = await Promise.all(rows.map(async (campaign) => {
      let coverUrl = '';
      if (campaign.cover_path) {
        const { data: urlData } = aeriom.storage.from(BUCKET).getPublicUrl(campaign.cover_path);
        coverUrl = urlData?.publicUrl || '';
      }
      return { ...campaign, imageUrl: coverUrl, locationName: campaign.country || 'Local inicial não definido' };
    }));
    return enriched;
  }

  function render(rows) {
    const list = $('campaignList');
    const empty = $('campaignEmpty');
    const count = $('campaignCount');
    if (!list || !empty || !count) return;
    count.textContent = `${rows.length} ${rows.length === 1 ? 'campanha' : 'campanhas'}`;
    list.replaceChildren();
    empty.style.display = rows.length ? 'none' : 'block';

    rows.forEach((campaign) => {
      const coords = Number.isFinite(Number(campaign.latitude)) && Number.isFinite(Number(campaign.longitude))
        ? `${Number(campaign.latitude).toFixed(3)}, ${Number(campaign.longitude).toFixed(3)}` : '';
      const media = campaign.imageUrl
        ? `<div class="campaign-item__image"><img src="${escapeHtml(campaign.imageUrl)}" alt=""></div>`
        : '<div class="campaign-item__image campaign-item__image--empty">AFTERLIFE</div>';
      const article = document.createElement('article');
      article.className = 'campaign-item';
      article.innerHTML = `${media}
        <div class="campaign-item__content">
          <div>
            <div class="campaign-item__top"><h3>${escapeHtml(campaign.name)}</h3><span class="panel-count">${escapeHtml(campaign.tone || 'Realista')}</span></div>
            <p>${escapeHtml(campaign.description || 'Sem descrição.')}</p>
            <div class="campaign-item__meta">
              <span>🌎 ${escapeHtml(campaign.country || 'Local definido no mapa')}</span>
              ${coords ? `<span>⌖ ${coords}</span>` : ''}
              <span>👤 1 Mestre</span>
            </div>
          </div>
          <div class="campaign-item__actions">
            <button class="btn btn--primary" data-open="${escapeHtml(campaign.id)}">ABRIR →</button>
            <button class="btn btn--ghost" data-delete="${escapeHtml(campaign.id)}">EXCLUIR</button>
          </div>
        </div>`;
      list.appendChild(article);
    });
  }

  function applyLocationFromParams() {
    const qs = new URLSearchParams(location.search);
    const lat = Number(qs.get('lat'));
    const lng = Number(qs.get('lng'));
    const label = qs.get('label') || qs.get('name') || '';
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    $('campaignLatitude').value = lat.toFixed(6);
    $('campaignLongitude').value = lng.toFixed(6);
    $('campaignLocationName').value = label || 'Local selecionado no mapa';
    $('campaignLocationTitle').textContent = label || 'Local selecionado no mapa';
    $('campaignLocationDescription').textContent = `${lat.toFixed(5)}°, ${lng.toFixed(5)}° · Você pode alterar a localização pelo Mapa Mundial.`;
  }

  function countryFromSelection() {
    return ($('campaignLocationName')?.value || '').trim() || 'Local não definido';
  }

  async function handleCampaignImage() {
    const file = $('campaignImageFile')?.files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      setMessage('Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF.');
      $('campaignImageFile').value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('A imagem precisa ter no máximo 5 MB.');
      $('campaignImageFile').value = '';
      return;
    }
    campaignImageFile = file;
    $('campaignImagePreviewImg').src = URL.createObjectURL(file);
    $('campaignImageFileName').textContent = file.name;
    $('campaignImagePreview').hidden = false;
    setMessage('');
  }

  async function uploadCampaignImage(file, campaignId) {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${user.id}/${campaignId}.${ext}`;
    const { error } = await aeriom.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (error) throw error;
    return path;
  }

  async function createCampaign(event) {
    event.preventDefault();
    setMessage('');
    if (!user?.id) {
      setMessage('Sua sessão ainda não foi carregada. Recarregue a página e tente novamente.');
      return;
    }

    const name = $('campaignName')?.value.trim() || '';
    const description = $('campaignDescription')?.value.trim() || '';
    const tone = $('campaignTone')?.value || 'Realista';
    const scale = $('campaignScale')?.value || 'world';
    const latitude = Number.parseFloat($('campaignLatitude')?.value || '');
    const longitude = Number.parseFloat($('campaignLongitude')?.value || '');
    const country = countryFromSelection();

    if (name.length < 3) return setMessage('Dê um nome com pelo menos 3 caracteres.');
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return setMessage('Abra o Mapa Mundial e escolha o local inicial da campanha.');

    const campaignId = crypto.randomUUID();
    let coverPath = null;

    try {
      setMessage('Criando campanha…');
      if (campaignImageFile) {
        coverPath = await uploadCampaignImage(campaignImageFile, campaignId);
      }

      const { error } = await aeriom.from('campaigns').insert({
        id: campaignId,
        created_by: user.id,
        name,
        description,
        country,
        tone,
        scale,
        latitude,
        longitude,
        cover_path: coverPath
      });
      if (error) throw error;

      toggleCreate(false);
      await refresh();
    } catch (error) {
      if (coverPath) await aeriom.storage.from(BUCKET).remove([coverPath]).catch(() => {});
      console.error('[AFTERLIFE][CAMPAIGNS][CREATE]', error);
      setMessage(error?.message || 'Não foi possível criar a campanha.');
    }
  }

  async function deleteCampaign(id) {
    if (!user?.id || !id) return;
    if (!confirm('Excluir esta campanha?')) return;
    const { data, error } = await aeriom.from('campaigns').select('cover_path').eq('id', id).eq('created_by', user.id).maybeSingle();
    if (error) return setMessage(error.message);
    const { error: deleteError } = await aeriom.from('campaigns').delete().eq('id', id).eq('created_by', user.id);
    if (deleteError) return setMessage(deleteError.message);
    if (data?.cover_path) await aeriom.storage.from(BUCKET).remove([data.cover_path]).catch(() => {});
    await refresh();
  }

  async function refresh() {
    try {
      const rows = await loadCampaigns();
      render(rows);
    } catch (error) {
      console.error('[AFTERLIFE][CAMPAIGNS][LOAD]', error);
      setMessage(error?.message || 'Não foi possível carregar suas campanhas.');
    }
  }

  async function loadProfile() {
    const fallback = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Sobrevivente';
    $('profileName')?.replaceChildren(document.createTextNode(fallback));
    $('profileMenuName')?.replaceChildren(document.createTextNode(fallback));
    if (!user) return;
    try {
      const { data } = await aeriom.from('profiles').select('display_name,avatar_path').eq('id', user.id).maybeSingle();
      const name = data?.display_name || fallback;
      $('profileName')?.replaceChildren(document.createTextNode(name));
      $('profileMenuName')?.replaceChildren(document.createTextNode(name));
      const avatarBoxes = [$('profileAvatar'), $('profileMenuAvatar')].filter(Boolean);
      avatarBoxes.forEach((box) => { box.textContent = name.slice(0, 1).toUpperCase(); });
      if (data?.avatar_path) {
        const { data: signed } = await aeriom.storage.from('avatars').createSignedUrl(data.avatar_path, 3600);
        if (signed?.signedUrl) avatarBoxes.forEach((box) => { box.replaceChildren(Object.assign(document.createElement('img'), { src: signed.signedUrl, alt: '' })); });
      }
    } catch (error) {
      console.warn('[AFTERLIFE][CAMPAIGNS][PROFILE]', error);
    }
  }

  function bindProfile() {
    const chip = $('profileChip');
    const menu = $('profileMenu');
    if (!chip || !menu || chip.dataset.bound === '1') return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      menu.setAttribute('aria-hidden', String(!open));
    });
    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !chip.contains(event.target)) menu.hidden = true;
    });
    $('profileLogout')?.addEventListener('click', async () => { await aeriom.auth.signOut(); location.replace('../index.html'); });
  }

  function bind() {
    $('openCreate')?.addEventListener('click', () => toggleCreate(true));
    $('emptyCreate')?.addEventListener('click', () => toggleCreate(true));
    $('closeCreate')?.addEventListener('click', () => toggleCreate(false));
    $('cancelCreate')?.addEventListener('click', () => toggleCreate(false));
    $('campaignImageButton')?.addEventListener('click', () => $('campaignImageFile')?.click());
    $('campaignImageFile')?.addEventListener('change', handleCampaignImage);
    $('campaignImageRemove')?.addEventListener('click', resetCampaignImage);
    $('campaignForm')?.addEventListener('submit', createCampaign);
    $('campaignList')?.addEventListener('click', (event) => {
      const open = event.target.closest('[data-open]');
      const del = event.target.closest('[data-delete]');
      if (open) location.href = `./campanha.html?campaign=${encodeURIComponent(open.dataset.open)}`;
      if (del) deleteCampaign(del.dataset.delete);
    });
  }

  async function boot() {
    try { await ensureAfterlifeSession(); } catch (error) { console.warn('[AFTERLIFE][CAMPAIGNS][SESSION]', error); }
    const { data } = await aeriom.auth.getSession();
    user = data?.session?.user || null;
    bind();
    bindProfile();
    await loadProfile();
    await refresh();
    const qs = new URLSearchParams(location.search);
    if (qs.get('create') === '1') { toggleCreate(true); applyLocationFromParams(); }
  }

  boot().catch((error) => {
    console.error('[AFTERLIFE][CAMPAIGNS]', error);
    setMessage('Não foi possível inicializar esta página.');
  });
})();
