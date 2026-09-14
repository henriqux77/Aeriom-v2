import { aeriom, afterlifeReady } from './aeriom-client.js?v=20260914-30';

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const grid = $('charactersGrid');
  const count = $('charactersCount');
  const status = $('charactersStatus');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  })[c]);
  const number = (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };

  async function imageUrl(row) {
    const state = row?.creation_state && typeof row.creation_state === 'object' ? row.creation_state : {};
    const path = String(row?.avatar_path || state.avatar || '').trim();
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const { data } = await aeriom.storage.from('avatars').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }

  async function card(row) {
    const name = String(row?.name || 'Sobrevivente sem nome').trim() || 'Sobrevivente sem nome';
    const race = row?.race || 'Humano', cls = row?.class || 'Sobrevivente', origin = row?.origin || row?.region || 'Origem não definida';
    const image = await imageUrl(row), ready = row?.status === 'completed';
    const article = document.createElement('article'); article.className = 'character-card';
    article.innerHTML = `<div class="character-art">${image ? `<img src="${esc(image)}" alt="Retrato de ${esc(name)}" loading="lazy">` : `<span class="character-fallback">${esc(name.charAt(0).toUpperCase())}</span>`}</div><div class="character-body"><span class="character-status"><i></i>${ready ? 'FICHA PRONTA' : 'EM CONSTRUÇÃO'}</span><h2 class="character-title">${esc(name)}</h2><div class="character-meta">${esc(race)} · ${esc(cls)} · ${esc(origin)}</div><div class="character-stats"><span class="character-stat">HP ${number(row?.hp_current, 10)} / ${number(row?.hp_max, 10)}</span><span class="character-stat">DEF ${number(row?.defense, 10)}</span><span class="character-stat">XP ${number(row?.xp_total, 0)}</span></div></div>`;
    const img = article.querySelector('img');
    img?.addEventListener('error', () => { img.remove(); const fallback = document.createElement('span'); fallback.className='character-fallback'; fallback.textContent=name.charAt(0).toUpperCase(); article.querySelector('.character-art')?.appendChild(fallback); });
    return article;
  }

  async function load() {
    await afterlifeReady;
    status.textContent='CARREGANDO';
    grid.innerHTML='<div class="characters-loading">Carregando seus sobreviventes…</div>';
    const { data: sessionData, error: sessionError } = await aeriom.auth.getSession();
    if(sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if(!user){
      count.textContent='0 sobreviventes';
      grid.innerHTML='<div class="characters-empty"><strong>Seus sobreviventes aparecerão aqui.</strong>Você pode abrir o criador e montar uma nova ficha mesmo enquanto a sessão compartilhada é restaurada.<br><a href="./ficha-criacao.html?new=1">Criar novo sobrevivente →</a></div>';
      status.textContent='PRONTO PARA CRIAR';
      return;
    }
    const {data,error}=await aeriom.from('characters').select('id,name,age,race,class,origin,region,status,hp_current,hp_max,defense,avatar_path,creation_state,xp_total,updated_at,campaign_id').eq('user_id',user.id).is('campaign_id',null).neq('status','archived').order('updated_at',{ascending:false});
    if(error)throw error;
    const rows=data||[]; count.textContent=`${rows.length} ${rows.length===1?'sobrevivente':'sobreviventes'}`; grid.replaceChildren();
    if(!rows.length){grid.innerHTML='<div class="characters-empty"><strong>Você ainda não criou nenhum sobrevivente.</strong>Comece sua primeira história criando uma ficha.<br><a href="./ficha-criacao.html?new=1">Criar novo sobrevivente →</a></div>';status.textContent='VAZIO';return;}
    const cards=await Promise.all(rows.map(card)); cards.forEach((item)=>grid.appendChild(item)); status.textContent='ATUALIZADO';
  }
  async function init(){try{await load()}catch(error){console.error('[AFTERLIFE][PERSONAGENS]',error);status.textContent='ERRO';grid.innerHTML=`<div class="characters-error">Não foi possível carregar seus sobreviventes agora.<br><small>${esc(error?.message||'Erro desconhecido')}</small><br><a href="./ficha-criacao.html?new=1">Abrir criador de ficha →</a></div>`}}
  init();
})();
