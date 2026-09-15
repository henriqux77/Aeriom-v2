import './error-monitor.js?v=20260915-8';
import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=1';
import './afterlife-sidebar.js?v=20260915-8';

(() => {
  'use strict';

  const BUCKET = 'campaign-covers';
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const ALLOWED_TONES = new Set(['Realista', 'Sobrevivência extrema', 'Horror', 'Ação', 'Exploração']);
  const ALLOWED_SCALES = new Set(['world', 'regional', 'city', 'local']);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  function resetImage() {
    campaignImageFile = null;
    if ($('campaignImageFile')) $('campaignImageFile').value = '';
    if ($('campaignImagePreview')) $('campaignImagePreview').hidden = true;
    $('campaignImagePreviewImg')?.removeAttribute('src');
    if ($('campaignImageFileName')) $('campaignImageFileName').textContent = 'Imagem selecionada';
  }

  function toggleCreate(show) {
    const panel = $('createPanel');
    const form = $('campaignForm');
    if (!panel) return;
    panel.hidden = !show;
    if (show) requestAnimationFrame(() => $('campaignName')?.focus());
    else {
      form?.reset();
      resetImage();
      setMessage('');
    }
  }

  function applyLocationFromParams() {
    const qs = new URLSearchParams(location.search);
    const lat = Number(qs.get('lat'));
    const lng = Number(qs.get('lng'));
    const label = qs.get('label') || qs.get('name') || '';
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if ($('campaignLatitude')) $('campaignLatitude').value = lat.toFixed(6);
    if ($('campaignLongitude')) $('campaignLongitude').value = lng.toFixed(6);
    if ($('campaignLocationName')) $('campaignLocationName').value = label || 'Local selecionado no mapa';
    if ($('campaignLocationAddress')) $('campaignLocationAddress').value = label || '';
    if ($('campaignLocationTitle')) $('campaignLocationTitle').textContent = label || 'Local selecionado no mapa';
    if ($('campaignLocationDescription')) $('campaignLocationDescription').textContent = `${lat.toFixed(5)}°, ${lng.toFixed(5)}° · Local definido no Mapa Mundial.`;
  }

  async function requireUser() {
    const session = await ensureAfterlifeSession();
    user = session?.user || user;
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
        ? `<div class="campaign-item__image"><img src="${esc(campaign.imageUrl)}" alt=""></div>`
        : '<div class="campaign-item__image campaign-item__image--empty">AFTERLIFE</div>';
      const article = document.createElement('article');
      article.className = 'campaign-item';
      article.innerHTML = `${media}
        <div class="campaign-item__content">
          <div>
            <div class="campaign-item__top">
              <h3>${esc(campaign.name)}</h3>
              <span class="panel-count">${esc(campaign.tone || 'Realista')}</span>
            </div>
            <p>${esc(campaign.description || 'Sem descrição.')}</p>
            <div class="campaign-item__meta">
              <span>🌎 ${esc(campaign.country || 'Local definido no mapa')}</span>
              ${coords ? `<span>⌖ ${coords}</span>` : ''}
              <span>👤 1 Mestre</span>
            </div>
          </div>
          <div class="campaign-item__actions">
            <button class="btn btn--primary" data-open="${esc(campaign.id)}">ABRIR →</button>
            <button class="btn btn--ghost" data-delete="${esc(campaign.id)}">EXCLUIR</button>
          </div>
        </div>`;
      list.appendChild(article);
    });
  }

  function handleCampaignImage() {
    const file = $('campaignImageFile')?.files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      setMessage('Formato não permitido. Use JPG, PNG, WEBP ou GIF.', 'error');
      resetImage();
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('A imagem precisa ter no máximo 5 MB.', 'error');
      resetImage();
      return;
    }
    campaignImageFile = file;
    if ($('campaignImagePreviewImg')) $('campaignImagePreviewImg').src = URL.createObjectURL(file);
    if ($('campaignImageFileName')) $('campaignImageFileName').textContent = file.name;
    if ($('campaignImagePreview')) $('campaignImagePreview').hidden = false;
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

  async function createCampaignViaRpc(payload) {
    const { data, error } = await aeriom.rpc('create_campaign', payload);
    if (error) throw error;
    if (!data) throw new Error('O servidor não retornou a campanha criada.');
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
      if (campaignImageFile) {
        setMessage('Enviando imagem…', 'info');
        coverPath = await uploadCampaignImage(campaignImageFile, campaignId);
      }

      setMessage('Criando campanha no servidor…', 'info');
      const row = await createCampaignViaRpc({
        p_id: campaignId,
        p_name: name,
        p_description: description,
        p_country: country,
        p_tone: tone,
        p_scale: scale,
        p_latitude: latitude,
        p_longitude: longitude,
        p_cover_path: coverPath,
      });

      setMessage(`Campanha “${row.name}” criada com sucesso.`, 'success');
      toggleCreate(false);
      await refresh();
    } catch (error) {
      if (coverPath) await aeriom.storage.from(BUCKET).remove([coverPath]).catch(() => {});
      console.error('[AFTERLIFE][CAMPAIGNS][CREATE]', error);
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('not_authenticated') || error?.code === '42501') {
        setMessage('A sessão do Afterlife expirou. Entre novamente para continuar.', 'error');
      } else if (message.includes('function') && message.includes('does not exist')) {
        setMessage('O servidor ainda não está com o RPC de campanhas atualizado.', 'error');
      } else {
        setMessage(error?.message || 'Não foi possível criar a campanha.', 'error');
      }
    } finally {
      submitting = false;
      setSubmitState(false);
    }
  }

  async function deleteCampaign(id) {
    if (!id || submitting || !(await requireUser())) return;
    if (!confirm('Excluir esta campanha?')) return;

    const { data, error } = await aeriom.from('campaigns').select('cover_path').eq('id', id).eq('created_by', user.id).maybeSingle();
    if (error) return setMessage(error.message, 'error');

    const { error: deleteError } = await aeriom.from('campaigns').delete().eq('id', id).eq('created_by', user.id);
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
    $('campaignImageRemove')?.addEventListener('click', resetImage);
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
    console.error('[AFTERLIFE][CAMPAIGNS][BOOT]', error);
    setMessage(error?.message || 'Não foi possível iniciar a área de campanhas.', 'error');
  });
})();
