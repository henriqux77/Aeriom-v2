import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';

  const BUCKET = 'campaign-covers';
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const TONES = ['Realista', 'Sobrevivência extrema', 'Horror', 'Ação', 'Exploração'];
  const SCALES = [['world', 'Mundo aberto'], ['regional', 'Regional'], ['city', 'Cidade'], ['local', 'Local']];

  const state = { user: null, campaign: null, imageFile: null, imagePreviewUrl: '', removeCover: false, saving: false };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[c]);

  function campaignId() {
    const qs = new URLSearchParams(location.search);
    return qs.get('campaign') || qs.get('id') || sessionStorage.getItem('afterlife_current_campaign_id') || '';
  }

  function revokePreview() {
    if (state.imagePreviewUrl) URL.revokeObjectURL(state.imagePreviewUrl);
    state.imagePreviewUrl = '';
  }

  function toast(message, type) {
    if (typeof window.afterlifeToast === 'function') return window.afterlifeToast(message, type);
    const node = document.createElement('div');
    node.className = 'afterlife-manager-toast';
    node.dataset.type = type || 'info';
    node.textContent = message;
    document.body.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    setTimeout(() => { node.classList.remove('is-visible'); setTimeout(() => node.remove(), 220); }, 2800);
  }

  function close() {
    document.body.classList.remove('afterlife-manager-lock');
    document.getElementById('campaignManagerRoot')?.remove();
    revokePreview();
    state.imageFile = null;
    state.removeCover = false;
  }

  function message(text, type) {
    const el = document.getElementById('campaignManagerMessage');
    if (!el) return;
    el.textContent = text || '';
    el.dataset.type = type || '';
    el.classList.toggle('is-visible', Boolean(text));
  }

  function setSaving(active) {
    state.saving = active;
    const button = document.getElementById('campaignManagerSave');
    if (!button) return;
    button.disabled = active;
    button.textContent = active ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES';
  }

  function markup(campaign) {
    const toneOptions = TONES.map((t) => '<option value="' + esc(t) + '"' + (campaign.tone === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
    const scaleOptions = SCALES.map((s) => '<option value="' + esc(s[0]) + '"' + (campaign.scale === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('');
    const preview = campaign.imageUrl
      ? '<img id="campaignManagerCoverPreview" src="' + esc(campaign.imageUrl) + '" alt="">'
      : '<div class="campaign-manager-cover-empty" id="campaignManagerCoverPreview">SEM CAPA</div>';

    return [
      '<div class="campaign-manager-backdrop" data-manager-close></div>',
      '<section class="campaign-manager-modal" role="dialog" aria-modal="true" aria-labelledby="campaignManagerTitle">',
        '<header class="campaign-manager-head"><div><span class="campaign-manager-eyebrow">MESTRE · CAMPANHA</span><h2 id="campaignManagerTitle">Gerenciar campanha</h2><p>Edite as informações do mundo sem sair da mesa.</p></div><button class="campaign-manager-close" type="button" aria-label="Fechar" data-manager-close>×</button></header>',
        '<form id="campaignManagerForm" class="campaign-manager-form">',
          '<div class="campaign-manager-grid campaign-manager-grid--wide">',
            '<label><span>NOME</span><input id="managerCampaignName" maxlength="100" minlength="3" value="' + esc(campaign.name) + '" required></label>',
            '<label><span>LOCAL / REGIÃO</span><input id="managerCampaignCountry" maxlength="160" value="' + esc(campaign.country || '') + '" placeholder="Ex.: São Paulo, Brasil"></label>',
          '</div>',
          '<label><span>DESCRIÇÃO</span><textarea id="managerCampaignDescription" maxlength="600" rows="4" placeholder="Descreva o estado atual da campanha...">' + esc(campaign.description || '') + '</textarea></label>',
          '<div class="campaign-manager-grid">',
            '<label><span>TOM</span><select id="managerCampaignTone">' + toneOptions + '</select></label>',
            '<label><span>ESCALA</span><select id="managerCampaignScale">' + scaleOptions + '</select></label>',
          '</div>',
          '<div class="campaign-manager-section"><div class="campaign-manager-section-head"><div><strong>LOCALIZAÇÃO INICIAL</strong><small>Usada pelo botão de centralizar no mapa.</small></div></div>',
            '<div class="campaign-manager-grid"><label><span>LATITUDE</span><input id="managerCampaignLatitude" inputmode="decimal" value="' + esc(campaign.latitude ?? '') + '" placeholder="-23.5505"></label>',
            '<label><span>LONGITUDE</span><input id="managerCampaignLongitude" inputmode="decimal" value="' + esc(campaign.longitude ?? '') + '" placeholder="-46.6333"></label></div></div>',
          '<div class="campaign-manager-section"><div class="campaign-manager-section-head"><div><strong>CAPA DA CAMPANHA</strong><small>JPG, PNG, WEBP ou GIF · máximo 5 MB.</small></div><span id="campaignManagerFileName" class="campaign-manager-file-name">Manter capa atual</span></div>',
            '<div class="campaign-manager-cover"><div class="campaign-manager-cover-preview" id="campaignManagerCoverWrap">' + preview + '</div>',
            '<div class="campaign-manager-cover-actions"><button type="button" class="campaign-manager-secondary" id="campaignManagerChooseCover">TROCAR CAPA</button><button type="button" class="campaign-manager-secondary is-danger" id="campaignManagerClearCover">REMOVER CAPA</button><input id="campaignManagerCoverInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></div></div></div>',
          '<div class="campaign-manager-message" id="campaignManagerMessage" role="status" aria-live="polite"></div>',
          '<footer class="campaign-manager-actions"><button type="button" class="campaign-manager-secondary" data-manager-close>CANCELAR</button><button type="submit" class="campaign-manager-primary" id="campaignManagerSave">SALVAR ALTERAÇÕES</button></footer>',
        '</form>',
      '</section>'
    ].join('');
  }

  function validate() {
    const name = document.getElementById('managerCampaignName')?.value.trim() || '';
    const description = document.getElementById('managerCampaignDescription')?.value.trim() || '';
    const country = document.getElementById('managerCampaignCountry')?.value.trim() || 'Local não definido';
    const tone = document.getElementById('managerCampaignTone')?.value || 'Realista';
    const scale = document.getElementById('managerCampaignScale')?.value || 'world';
    const latRaw = document.getElementById('managerCampaignLatitude')?.value.trim() || '';
    const lngRaw = document.getElementById('managerCampaignLongitude')?.value.trim() || '';
    const latitude = latRaw === '' ? null : Number.parseFloat(latRaw.replace(',', '.'));
    const longitude = lngRaw === '' ? null : Number.parseFloat(lngRaw.replace(',', '.'));

    if (name.length < 3 || name.length > 100) throw new Error('O nome precisa ter entre 3 e 100 caracteres.');
    if (description.length > 600) throw new Error('A descrição pode ter no máximo 600 caracteres.');
    if (!TONES.includes(tone)) throw new Error('Tom de campanha inválido.');
    if (!SCALES.some((s) => s[0] === scale)) throw new Error('Escala de campanha inválida.');

    const latOk = latitude === null || (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90);
    const lngOk = longitude === null || (Number.isFinite(longitude) && longitude >= -180 && longitude <= 180);
    if (!latOk || !lngOk) throw new Error('Latitude ou longitude inválida.');
    if ((latitude === null) !== (longitude === null)) throw new Error('Informe latitude e longitude juntas, ou deixe as duas vazias.');

    return { name, description, country, tone, scale, latitude, longitude };
  }

  async function load() {
    const session = await ensureAfterlifeSession();
    if (!session?.user) throw new Error('Sessão Afterlife não encontrada.');
    state.user = session.user;

    const id = campaignId();
    if (!id) throw new Error('Campanha não definida.');

    const result = await aeriom.from('campaigns')
      .select('id,created_by,name,description,country,tone,scale,latitude,longitude,cover_path')
      .eq('id', id)
      .eq('created_by', state.user.id)
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) throw new Error('Apenas o Mestre/criador pode gerenciar esta campanha.');

    let imageUrl = '';
    if (result.data.cover_path) {
      const signed = await aeriom.storage.from(BUCKET).createSignedUrl(result.data.cover_path, 3600);
      imageUrl = signed?.data?.signedUrl || '';
    }

    state.campaign = { ...result.data, imageUrl };
    return state.campaign;
  }

  async function uploadCover(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = state.user.id + '/' + state.campaign.id + '-cover-' + Date.now() + '.' + ext;
    const result = await aeriom.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
    if (result.error) throw result.error;
    return path;
  }

  async function save(event) {
    event.preventDefault();
    if (state.saving) return;

    let newCoverPath = null;
    try {
      message('');
      const values = validate();
      setSaving(true);
      const previousCoverPath = state.campaign.cover_path || null;
      let coverPath = state.removeCover ? null : previousCoverPath;
      if (state.imageFile) {
        message('Enviando nova capa…', 'info');
        newCoverPath = await uploadCover(state.imageFile);
        coverPath = newCoverPath;
      }

      message('Salvando campanha…', 'info');
      const result = await aeriom.from('campaigns').update({
        name: values.name,
        description: values.description,
        country: values.country,
        tone: values.tone,
        scale: values.scale,
        latitude: values.latitude,
        longitude: values.longitude,
        cover_path: coverPath,
        updated_at: new Date().toISOString()
      }).eq('id', state.campaign.id).eq('created_by', state.user.id)
        .select('id,created_by,name,description,country,tone,scale,latitude,longitude,cover_path,updated_at')
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) throw new Error('Nenhuma alteração foi salva. Verifique sua permissão na campanha.');

      if (previousCoverPath && previousCoverPath !== coverPath) {
        await aeriom.storage.from(BUCKET).remove([previousCoverPath]).catch((error) => {
          console.warn('[AFTERLIFE][CAMPAIGN-MANAGER] Não foi possível remover a capa anterior.', error);
        });
      }

      message('Campanha atualizada.', 'success');
      window.dispatchEvent(new CustomEvent('afterlife:campaign-updated', { detail: result.data }));
      setTimeout(close, 360);
    } catch (error) {
      if (typeof newCoverPath === 'string' && newCoverPath) {
        await aeriom.storage.from(BUCKET).remove([newCoverPath]).catch((cleanupError) => console.warn('[AFTERLIFE][CAMPAIGN-MANAGER][COVER-CLEANUP]', cleanupError));
      }
      console.error('[AFTERLIFE][CAMPAIGN-MANAGER]', error);
      message(error?.message || 'Não foi possível salvar as alterações.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function chooseCover(file) {
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) return message('Formato não permitido. Use JPG, PNG, WEBP ou GIF.', 'error');
    if (file.size > MAX_IMAGE_SIZE) return message('A imagem precisa ter no máximo 5 MB.', 'error');
    revokePreview();
    state.imageFile = file;
    state.removeCover = false;
    state.imagePreviewUrl = URL.createObjectURL(file);
    const wrap = document.getElementById('campaignManagerCoverWrap');
    if (wrap) wrap.innerHTML = '<img id="campaignManagerCoverPreview" src="' + esc(state.imagePreviewUrl) + '" alt="">';
    const label = document.getElementById('campaignManagerFileName');
    if (label) label.textContent = file.name;
    message('');
  }

  function clearCover() {
    state.imageFile = null;
    state.removeCover = true;
    revokePreview();
    const wrap = document.getElementById('campaignManagerCoverWrap');
    if (wrap) wrap.innerHTML = '<div class="campaign-manager-cover-empty" id="campaignManagerCoverPreview">A CAPA SERÁ REMOVIDA</div>';
    const label = document.getElementById('campaignManagerFileName');
    if (label) label.textContent = 'Remover capa atual';
    const input = document.getElementById('campaignManagerCoverInput');
    if (input) input.value = '';
    message('');
  }

  function bind(root) {
    root.querySelectorAll('[data-manager-close]').forEach((button) => button.addEventListener('click', close));
    root.querySelector('#campaignManagerForm')?.addEventListener('submit', save);
    root.querySelector('#campaignManagerChooseCover')?.addEventListener('click', () => root.querySelector('#campaignManagerCoverInput')?.click());
    root.querySelector('#campaignManagerCoverInput')?.addEventListener('change', (e) => chooseCover(e.target.files?.[0]));
    root.querySelector('#campaignManagerClearCover')?.addEventListener('click', clearCover);
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
    requestAnimationFrame(() => root.querySelector('#managerCampaignName')?.focus());
  }

  async function open() {
    if (document.getElementById('campaignManagerRoot')) return;
    try {
      const campaign = await load();
      const root = document.createElement('div');
      root.id = 'campaignManagerRoot';
      root.className = 'campaign-manager-root';
      root.innerHTML = markup(campaign);
      document.body.appendChild(root);
      document.body.classList.add('afterlife-manager-lock');
      bind(root);
    } catch (error) {
      console.error('[AFTERLIFE][CAMPAIGN-MANAGER][OPEN]', error);
      toast(error?.message || 'Não foi possível abrir o gerenciador.', 'error');
    }
  }

  window.openCampaignManager = open;
  window.closeCampaignManager = close;
  window.addEventListener('pagehide', close, { once: true });
})();
