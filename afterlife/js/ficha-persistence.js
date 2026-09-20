import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260920-2';

(() => {
  'use strict';
  if(!document.body.classList.contains('character-builder')) return;

  let user=null;
  let draftId='';
  let timer=null;
  let saving=false;
  let booted=false;
  const keyPrefix='afterlife_ficha_draft_';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function getInput(id, fallback=''){return $(id)?.value?.trim()||fallback;}
  function setInput(id,value){const e=$(id);if(!e||value==null)return;e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}))}
  function setStatus(text,type=''){
    let host=$('afterlifeSaveStatus');
    if(!host){
      host=document.createElement('div');host.id='afterlifeSaveStatus';host.className='afterlife-save-status';
      const head=document.querySelector('.builder-title-row');head?.appendChild(host);
    }
    host.textContent=text;host.dataset.type=type;
  }

  function className(){return getInput('classReadout','Sobrevivente');}
  function countryName(){return $('countryName')?.textContent?.trim()||'Brasil';}
  function countryCode(){return $('countryOrigin')?.value||'BR';}
  function currentAttributes(){
    const result={};
    document.querySelectorAll('[data-attr]').forEach(el=>{
      const key=el.dataset.attr;const value=Number(el.querySelector('strong')?.textContent);
      if(key&&Number.isFinite(value))result[key]=value;
    });
    return result;
  }
  function snapshot(){
    return {
      name:getInput('characterName'),
      nickname:getInput('characterNickname'),
      gender:getInput('characterGender','Masculino'),
      age:getInput('characterAge'),
      origin:countryCode(),
      origin_name:countryName(),
      skin:getInput('appearanceSkin','Claro'),
      hair:getInput('appearanceHair','Preto'),
      eyes:getInput('appearanceEyes','Castanhos'),
      eye_shape:getInput('appearanceEyeShape','Natural'),
      style:getInput('appearanceStyle','Sobrevivente'),
      height:getInput('appearanceHeight','1,70 m'),
      weight:getInput('appearanceWeight','70'),
      scar:getInput('appearanceScar'),
      features:getInput('appearanceFeatures'),
      appearance:getInput('appearanceDescription'),
      class:className(),
      attributes:currentAttributes(),
      personality:getInput('characterPersonality'),
      objective:getInput('characterObjective'),
      fear:getInput('characterFear'),
      history:getInput('characterHistory'),
      image_prompt:getInput('characterImagePrompt')
    };
  }

  function formulas(a){
    const n=k=>Number(a[k]??8);
    return {
      hp:10+(n('vigor')-8)*2,
      defense:10+(n('agilidade')-8)+Math.floor((n('percepcao')-8)/2),
      movement:9
    };
  }

  function ensureStatusUI(){
    if($('afterlifeSaveStatus'))return;
    const head=document.querySelector('.builder-title-row');
    if(!head)return;
    const node=document.createElement('div');
    node.id='afterlifeSaveStatus';node.className='afterlife-save-status';node.textContent='RASCUNHO';
    head.appendChild(node);
  }

  async function ensureDraft(){
    const session=await ensureAfterlifeSession();
    if(!session?.user) throw new Error('Sessão Afterlife não encontrada.');
    user=session.user;
    ensureStatusUI();

    const q=new URLSearchParams(location.search);
    const requested=q.get('character');
    const stored=localStorage.getItem(keyPrefix+user.id);
    draftId=requested||stored||crypto.randomUUID();

    let existing=null;
    const found=await aeriom.from('characters').select('id,status,creation_state,avatar_path').eq('id',draftId).eq('user_id',user.id).maybeSingle();
    if(found.error)throw found.error;existing=found.data;

    if(!existing){
      const s=snapshot();
      const r=await aeriom.rpc('save_afterlife_character_draft',{p_character_id:draftId,p_data:s});
      if(r.error)throw r.error;
      existing=r.data;
    }

    localStorage.setItem(keyPrefix+user.id,draftId);
    if(existing?.creation_state && typeof existing.creation_state==='object' && Object.keys(existing.creation_state).length){
      restore(existing.creation_state);
    }
    setStatus(existing?.status==='completed'?'FICHA FINALIZADA':'RASCUNHO SALVO','ok');
    booted=true;
  }

  function restore(s){
    const map={
      name:'characterName',nickname:'characterNickname',gender:'characterGender',age:'characterAge',
      skin:'appearanceSkin',hair:'appearanceHair',eyes:'appearanceEyes',eye_shape:'appearanceEyeShape',
      style:'appearanceStyle',height:'appearanceHeight',weight:'appearanceWeight',scar:'appearanceScar',
      features:'appearanceFeatures',appearance:'appearanceDescription',image_prompt:'characterImagePrompt',personality:'characterPersonality',
      objective:'characterObjective',fear:'characterFear',history:'characterHistory'
    };
    Object.entries(map).forEach(([k,id])=>{if(s[k]!=null)setInput(id,s[k])});
    if(s.origin && $('countryOrigin')){ $('countryOrigin').value=s.origin; $('countryOrigin').dispatchEvent(new Event('change',{bubbles:true})); }
    if(s.class){
      const card=[...document.querySelectorAll('.class-card')].find(x=>(x.dataset.class||'')===s.class);
      if(card)card.click();
    }
    if(s.attributes && typeof s.attributes==='object'){
      Object.entries(s.attributes).forEach(([k,v])=>{
        const plus=document.querySelector('[data-plus="'+CSS.escape(k)+'"]');
        if(!plus)return;
        for(let i=8;i<Number(v);i++)plus.click();
      });
    }
  }

  async function saveDraft(force=false){
    if(!booted||saving)return;
    clearTimeout(timer);
    if(!force){timer=setTimeout(()=>saveDraft(true),900);return;}
    saving=true;setStatus('SALVANDO…');
    try{
      const s=snapshot(),f=formulas(s.attributes);
      const payload={
        name:s.name||null,age:Number(s.age)||null,gender:s.gender||null,race:'Humano',
        origin:s.origin_name||s.origin||null,class:s.class||null,
        hp_current:f.hp,hp_max:f.hp,defense:f.defense,movement:f.movement,
        attributes:s.attributes,creation_state:s,status:'draft',updated_at:new Date().toISOString()
      };
      const r=await aeriom.rpc('save_afterlife_character_draft',{p_character_id:draftId,p_data:s});
      if(r.error)throw r.error;
      setStatus('SALVO AGORA','ok');
    }catch(error){
      console.warn('[AFTERLIFE][FICHA][AUTOSAVE]',error);
      setStatus('ERRO AO SALVAR','error');
    }finally{saving=false}
  }

  async function finalize(){
    if(saving)return;
    const s=snapshot();
    if(s.name.length<2)return setStatus('DÊ UM NOME AO SOBREVIVENTE','error');
    if(s.name.length>60)return setStatus('NOME MUITO LONGO','error');
    const age=Number(s.age);if(s.age && (!Number.isFinite(age)||age<1||age>999))return setStatus('IDADE INVÁLIDA','error');
    if(!s.class)return setStatus('ESCOLHA UMA CLASSE','error');

    saving=true;setStatus('FINALIZANDO…');
    try{
      const r=await aeriom.rpc('finalize_afterlife_character',{p_character_id:draftId,p_data:s});
      if(r.error)throw r.error;
      localStorage.removeItem(keyPrefix+user.id);
      setStatus('FICHA FINALIZADA','ok');
      setTimeout(()=>location.replace('./personagens.html'),450);
    }catch(error){
      console.error('[AFTERLIFE][FICHA][FINALIZE]',error);
      setStatus(error?.message||'ERRO AO FINALIZAR','error');
    }finally{saving=false}
  }

  function bind(){
    ensureStatusUI();
    const ids=['characterName','characterNickname','characterGender','characterAge','countryOrigin','appearanceSkin','appearanceHair','appearanceEyes','appearanceEyeShape','appearanceStyle','appearanceHeight','appearanceWeight','appearanceScar','appearanceFeatures','appearanceDescription','characterPersonality','characterObjective','characterFear','characterHistory','appearanceStyle'];
    ids.forEach(id=>$(id)?.addEventListener('input',()=>saveDraft(false)));
    ids.forEach(id=>$(id)?.addEventListener('change',()=>saveDraft(false)));

    document.querySelectorAll('[data-plus],[data-minus],[data-class-prev],[data-class-next],.class-card,[data-weight]').forEach(el=>el.addEventListener('click',()=>saveDraft(false)));

    const next=$('nextAction');
    next?.addEventListener('click',e=>{
      const active=document.querySelector('.builder-slide.is-active');
      const last=active?.dataset.slide==='6';
      if(!last)return;
      e.preventDefault();e.stopImmediatePropagation();finalize();
    },true);

    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft(true)});
    window.addEventListener('pagehide',()=>{try{saveDraft(true)}catch{}},{once:true});
  }

  ensureDraft().then(()=>bind()).catch(error=>{
    console.error('[AFTERLIFE][FICHA][PERSISTENCE]',error);
    setStatus(error?.message||'NÃO FOI POSSÍVEL INICIAR O RASCUNHO','error');
  });
})();
