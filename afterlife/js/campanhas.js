import './error-monitor.js?v=20260915-7';
import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=1';
import './afterlife-sidebar.js?v=20260915-7';

(() => {
  'use strict';

  const BUCKET = 'campaign-covers';
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const ALLOWED_TONES = new Set(['Realista', 'Sobrevivência extrema', 'Horror', 'Ação', 'Exploração']);
  const ALLOWED_SCALES = new Set(['world', 'regional', 'city', 'local']);
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let user = null;
  let campaignImageFile = null;
  let submitting = false;

  function setMessage(text = '', type = '') {
    const el = $('campaignMessage');
    if (!el) return;
    el.textContent = text;
    el.dataset.type = type;
    el.classList.toggle('is-visible', Boolean(text));
  }

  function setSubmitState(active) {
    const button = $('campaignForm')?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = active;
    button.textContent = active ? 'CRIANDO…' : 'CRIAR CAMPANHA →';
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
    const form = $('campaignForm');
    if (!panel) return;
    panel.hidden = !show;
    if (show) {
      requestAnimationFrame(() => $('campaignName')?.focus());
    } else {
      form?.reset();
      resetCampaignImage();
      setMessage('');
    }
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
    $('campaignLocationAddress').value = label || '';
    $('campaignLocationTitle').textContent = label || 'Local selecionado no mapa';
    $('campaignLocationDescription').textContent = `${lat.toFixed(5)}°, ${lng.toFixed(5)}° · Local definido no Mapa Mundial.`;
  }

  async function requireUser() {
    if (user?.id) return true;
    const session = await ensureAfterlifeSession();
    user = session?.user || null;
    if (user?.id) return true;
    setMessage('Sua sessão do Afterlife não está ativa. Entre novamente para continuar.', 'error');
    return false;
  }

  async function loadCampaigns() {
    if (!(await requireUser())) return [];
    const { data, error } = await aeriom
      .from('campaigns')
      .select('id,created_by,name,description,country,tone,scale,latitude,longitude,cover_path,created_at,updated_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return Promise.all((data || []).map(async (campaign) => {
      let imageUrl = '';
      if (campaign.cover_path) {
        const { data: signed, error: signedError } = await aeriom.storage.from(BUCKET).createSignedUrl(campaign.cover_path, 3600);
        if (!signedError) imageUrl = signed?.signedUrl || '';
      }
      return { ...campaign, imageUrl };
    }));
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
      const hasCoords = Number.isFinite(Number(campaign.latitude)) && Number.isFinite(Number(campaign.longitude));
      const coords = hasCoords ? `${Number(campaign.latitude).toFixed(3)}, ${Number(campaign.longitude).toFixed(3)}` : '';
      const media = campaign.imageUrl
        ? `<div class="campaign-item__image"><img src="${escapeHtml(campaign.imageUrl)}" alt=""></div>`
        : '<div class="campaign-item__image campaign-item__image--empty">AFTERLIFE</div>';

      const article = document.createElement('article');
      article.className = 'campaign-item';
      article.innerHTML = `${media}
        <div class="campaign-item__content">
          <div>
            <div class="campaign-item__top">
              <h3>${escapeHtml(campaign.name)}</h3>
              <span class="panel-count">${escapeHtml(campaign.tone || 'Realista')}</span>
            </div>
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

  function handleCampaignImage() {
    const input = $('campaignImageFile');
    const file = input?.files?.[0];
    if (!file) return;

    if (!IMAGE_TYPES.has(file.type)) {
      setMessage('Formato não permitido. Use JPG, PNG, WEBP ou GIF.', 'error');
      resetCampaignImage();
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('A imagem precisa ter no máximo 5 MB.', 'error');
      resetCampaignImage();
      return;
    }

    campaignImageFile = file;
    $('campaignImagePreviewImg').src = URL.createObjectURL(file);
    $('campaignImageFileName').textContent = file.name;
    $('campaignImagePreview').hidden = false;
    setMessage('');
  }

  async function uploadCampaignImage(file, campaignId) {
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${user.id}/${campaignId}.${extension}`;
    const { error } = await aeriom.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    });
    if (error) throw error;
    return path;
  }

  async function insertCampaign(row) {
    const { data, error } = await aeriom
      .from('campaigns')
      .insert(row)
      .select('id,created_by,name,description,country,tone,scale,latitude,longitude,cover_path,created_at,updated_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function createCampaign(event) {
    event.preventDefault();
    if (submitting) return;
    setMessage('');

    if (!(await requireUser())) return;

    const name = $('campaignName')?.value.trim() || '';
    const description = $('campaignDescription')?.value.trim() || '';
    const tone = $('campaignTone')?.value || 'Realista';
    const scale = $('campaignScale')?.value || 'world';
    const latitude = Number.parseFloat($('campaignLatitude')?.value || '');
    const longitude = Number.parseFloat($('campaignLongitude')?.value || '');
    const country = ($('campaignLocationName')?.value || '').trim() || 'Local não definido';

    if (name.length < 3 || name.length > 100) return setMessage('O nome precisa ter entre 3 e 100 caracteres.', 'error');
    if (description.length > 600) return setMessage('A descrição pode ter no máximo 600 caracteres.', 'error');
    if (!ALLOWED_TONES.has(tone)) return setMessage('Tom de campanha inválido.', 'error');
    if (!ALLOWED_SCALES.has(scale)) return setMessage('Escala de campanha inválida.', 'error');
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return setMessage('Escolha uma latitude válida no Mapa Mundial.', 'error');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setMessage('Escolha uma longitude válida no Mapa Mundial.', 'error');

    submitting = true;
    setSubmitState(true);
    const campaignId = crypto.randomUUID();
    let coverPath = null;

    try {
      setMessage('Preparando campanha…', 'info');
      if (campaignImageFile) {
        setMessage('Enviando imagem…', 'info');
        coverPath = await uploadCampaignImage(campaignImageFile, campaignId);
      }

      setMessage('Salvando campanha…', 'info');
      const row = await insertCampaign({
        id: campaignId,
        created_by: user.id,
        name,
        description,
        country,
        tone,
        scale,
        latitude,
        longitude,
        cover_path: coverPath,
      });

      setMessage(`Campanha “${row.name}” criada com sucesso.`, 'success');
      toggleCreate(false);
      await refresh();
    } catch (error) {
      if (coverPath) {
        await aeriom.storage.from(BUCKET).remove([coverPath]).catch(() => {});
      }
      console.error('[AFTERLIFE][CAMPAIGNS][CREATE]', error);
      const message = String(error?.message || '').toLowerCase().includes('row-level security')
        ? 'A sessão não foi autorizada pelo servidor. Entre novamente no Afterlife e tente de novo.'
        : (error?.message || 'Não foi possível criar a campanha.');
      setMessage(message, 'error');
    } finally {
      submitting = false;
      setSubmitState(false);
    }
  }

  async function deleteCampaign(id) {
    if (!id || submitting || !(await requireUser())) return;
    if (!confirm('Excluir esta campanha?')) return;

    const { data, error } = await aeriom
      .from('campaigns')
      .select('cover_path')
      .eq('id', id)
      .eq('created_by', user.id)
      .maybeSingle();
    if (error) return setMessage(error.message, 'error');

    const { error: deleteError } = await aeriom
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);
    if (deleteError) return setMessage(deleteError.message, 'error');

    if (data?.cover_path) await aeriom.storage.from(BUCKET).remove([data.cover_path]).catch(() => {});
    await refresh();
  }

  async function refresh() {
    try {
      render(await loadCampaigns());
    } catch (error) {
      console.error('[AFTERLIFE][CAMPAIGNS][LOAD]', error);
      setMessage(error?.message || 'Não foi possível carregar suas campanhas.', 'error');
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

    $('profileLogout')?.addEventListener('click', async () => {
      await aeriom.auth.signOut();
      localStorage.removeItem('afterlife_portal_handoff');
      location.replace('./entrar.html');
    });
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

  async function loadProfile() {
    const fallback = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Sobrevivente';
    $('profileName')?.replaceChildren(document.createTextNode(fallback));
    $('profileMenuName')?.replaceChildren(document.createTextNode(fallback));
    if (!user?.id) return;

    try {
      const { data } = await aeriom.from('profiles').select('display_name,avatar_path').eq('id', user.id).maybeSingle();
      const name = data?.display_name || fallback;
      const boxes = [$('profileAvatar'), $('profileMenuAvatar')].filter(Boolean);
      $('profileName')?.replaceChildren(document.createTextNode(name));
      $('profileMenuName')?.replaceChildren(document.createTextNode(name));
      boxes.forEach((box) => { box.textContent = name.slice(0, 1).toUpperCase(); });
      if (data?.avatar_path) {
        const { data: signed } = await aeriom.storage.from('avatars').createSignedUrl(data.avatar_path, 3600);
        if (signed?.signedUrl) boxes.forEach((box) => box.replaceChildren(Object.assign(document.createElement('img'), { src: signed.signedUrl, alt: '' })));
      }
    } catch (error) {
      console.warn('[AFTERLIFE][CAMPAIGNS][PROFILE]', error);
    }
  }

  async function boot() {
    const session = await ensureAfterlifeSession();
    if (!session?.user) return;
    user = session.user;
    bind();
    bindProfile();
    await loadProfile();
    await refresh();
    const qs = new URLSearchParams(location.search);
    if (qs.get('create') === '1') {
      toggleCreate(true);
      applyLocationFromParams();
    }
  }

  boot().catch((error) => {
    console.error('[AFTERLIFE][CAMPAIGNS]', error);
    setMessage(error?.message || 'Não foi possível inicializar a página.', 'error');
  });
})();
