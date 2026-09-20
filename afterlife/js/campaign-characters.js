import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260920-map41';

(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let session=null,campaignId='',role='player',characters=[],busy=false;
  const qs=new URLSearchParams(location.search);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const initials=v=>String(v||'S').trim().charAt(0).toUpperCase()||'S';
  function cid(){return qs.get('campaign')||qs.get('id')||sessionStorage.getItem('afterlife_current_campaign_id')||'';}
  function openModal(title,body){
    const root=document.createElement('div');root.className='campaign-character-modal-backdrop';root.innerHTML='<section class="campaign-character-modal" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header><div><span class="campaign-section-kicker">AFTERLIFE · FICHA</span><h3>'+esc(title)+'</h3></div><button type="button" class="campaign-character-modal-close" data-close>×</button></header><div class="campaign-character-modal-body">'+body+'</div></section>';document.body.appendChild(root);root.addEventListener('click',e=>{if(e.target===root||e.target.closest('[data-close]'))root.remove()});return root;
  }
  function render(){
    const host=$('campaignCharacterSummary'),count=$('campaignCharactersCount'),button=$('addCampaignCharacter');if(!host)return;
    count && (count.textContent=characters.length+' '+(characters.length===1?'na campanha':'na campanha'));
    button && (button.hidden=!!characters.find(c=>String(c.user_id)===String(session.user.id)));
    host.innerHTML=characters.length?'<div class="campaign-character-grid">'+characters.map(c=>{
      const own=String(c.user_id)===String(session.user.id),img='';
      return '<article class="campaign-character-card '+(own?'is-own':'')+'"><div class="campaign-character-card__avatar">'+(img?'<img src="'+esc(img)+'" alt="">':esc(initials(c.name)))+'</div><div class="campaign-character-card__info"><span class="campaign-character-card__eyebrow">'+(own?'SEU SOBREVIVENTE':'SOBREVIVENTE')+'</span><h3>'+esc(c.name)+'</h3><div class="campaign-character-card__meta">'+esc([c.race,c.class,c.power].filter(Boolean).join(' · ')||'Sobrevivente')+'</div><div class="campaign-character-card__owner">Jogador: '+esc(c.owner_name||'Sobrevivente')+'</div><div class="campaign-character-card__stats"><span><b>HP</b><strong>'+n(c.hp_current)+'/'+n(c.hp_max)+'</strong></span><span><b>MANA</b><strong>'+n(c.mana_current)+'/'+n(c.mana_max)+'</strong></span><span><b>DEF</b><strong>'+n(c.defense,10)+'</strong></span></div><div class="campaign-character-card__actions"><button type="button" data-view-character="'+esc(c.character_id)+'">VER FICHA</button></div></div></article>';
    }).join('')+'</div>':'<div class="campaign-character-empty"><div><strong>Nenhuma ficha na mesa ainda.</strong><br>Adicione sua ficha concluída para entrar na campanha.</div></div>';
    host.querySelectorAll('[data-view-character]').forEach(b=>b.onclick=()=>viewCharacter(b.dataset.viewCharacter));
  }
  async function load(){
    const r=await aeriom.rpc('list_campaign_visible_characters',{p_campaign_id:campaignId});if(r.error)throw r.error;characters=Array.isArray(r.data)?r.data:[];render();
  }
  async function available(){
    const r=await aeriom.from('characters').select('id,name,race,class,power,hp_current,hp_max,status,campaign_id,updated_at').eq('user_id',session.user.id).eq('status','completed').is('campaign_id',null).order('updated_at',{ascending:false});if(r.error)throw r.error;return Array.isArray(r.data)?r.data:[];
  }
  async function addCharacter(id){
    if(busy)return;busy=true;
    try{const r=await aeriom.rpc('add_campaign_character',{p_campaign_id:campaignId,p_character_id:id});if(r.error)throw r.error;document.querySelector('.campaign-character-modal-backdrop')?.remove();await load();window.dispatchEvent(new CustomEvent('afterlife:campaign-character-added',{detail:{characterId:id,campaignId}}));}
    finally{busy=false}
  }
  async function openPicker(){
    const list=await available();
    const body=list.length?'<div class="campaign-character-picker">'+list.map(c=>'<button type="button" data-add-character="'+esc(c.id)+'"><span class="campaign-character-picker__avatar">'+esc(initials(c.name))+'</span><span><strong>'+esc(c.name)+'</strong><small>'+esc([c.race,c.class,c.power].filter(Boolean).join(' · ')||'Sobrevivente')+'</small></span><b>ADICIONAR</b></button>').join('')+'</div>':'<div class="campaign-character-empty"><strong>Nenhuma ficha disponível.</strong><br>Finalize uma ficha em Personagens antes de adicioná-la.</div><div style="margin-top:10px;text-align:center"><a class="campaign-character-add-button" href="./ficha-criacao.html?new=1">CRIAR NOVA FICHA</a></div>';
    const root=openModal('Adicionar minha ficha',body);root.querySelectorAll('[data-add-character]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.querySelector('b').textContent='ADICIONANDO…';try{await addCharacter(b.dataset.addCharacter)}catch(e){b.disabled=false;b.querySelector('b').textContent='ADICIONAR';alert(e?.message||'Não foi possível adicionar a ficha.')}});
  }
  async function viewCharacter(id){
    const c=characters.find(x=>String(x.character_id)===String(id));if(!c)return;
    openModal(c.name,'<div class="campaign-character-detail"><div class="campaign-character-detail__portrait">'+esc(initials(c.name))+'</div><div><div class="campaign-character-card__meta">'+esc([c.race,c.class,c.power].filter(Boolean).join(' · ')||'Sobrevivente')+'</div><p style="color:#758279;font-size:9px;line-height:1.5;margin:10px 0">Jogador: '+esc(c.owner_name||'Sobrevivente')+'</p><div class="campaign-character-detail__stats"><div><span>HP</span><b>'+n(c.hp_current)+' / '+n(c.hp_max)+'</b></div><div><span>MANA</span><b>'+n(c.mana_current)+' / '+n(c.mana_max)+'</b></div><div><span>DEFESA</span><b>'+n(c.defense,10)+'</b></div><div><span>MOVIMENTO</span><b>'+n(c.movement,9)+'</b></div><div><span>XP</span><b>'+n(c.xp_total)+'</b></div><div><span>STATUS</span><b>'+esc(c.status||'completed')+'</b></div></div></div></div>');
  }
  function bind(){ $('addCampaignCharacter')?.addEventListener('click',()=>openPicker().catch(e=>alert(e?.message||'Não foi possível carregar suas fichas.'))); }
  async function boot(){
    session=await ensureAfterlifeSession();if(!session?.user)return;campaignId=cid();if(!campaignId)return;
    const me=await aeriom.rpc('list_campaign_members',{p_campaign_id:campaignId});if(me.error)throw me.error;const rows=Array.isArray(me.data)?me.data:me.data?[me.data]:[];const mine=rows.find(x=>String(x.user_id)===String(session.user.id));if(!mine)throw new Error('Você não participa desta campanha.');role=mine.role||'player';bind();await load();
    let timer=setInterval(()=>load().catch(e=>console.warn('[AFTERLIFE][CAMPAIGN-CHARACTERS]',e)),30000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
  boot().catch(e=>{console.error('[AFTERLIFE][CAMPAIGN-CHARACTERS]',e);const host=$('campaignCharacterSummary');if(host)host.innerHTML='<div class="campaign-character-empty">Não foi possível carregar as fichas desta campanha.</div>';});
})();
