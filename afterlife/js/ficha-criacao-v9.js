(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const slides = $$('.builder-slide');
  const steps = $$('.builder-step');
  const labels = ['IDENTIDADE','ORIGEM','APARÊNCIA','CLASSE','ATRIBUTOS','CONCEITO','REVISÃO FINAL'];
  let currentStep = 0;
  let currentClass = 1;
  let objectUrl = null;

  const attrs = { forca:8, agilidade:8, vigor:8, percepcao:8, mente:8, vontade:8 };
  const BASE = 8, MAX = 15, POINTS = 12;
  const countries = [
    ['BR','Brasil','🇧🇷'],['JP','Japão','🇯🇵'],['KR','Coreia do Sul','🇰🇷'],['CN','China','🇨🇳'],['US','Estados Unidos','🇺🇸'],
    ['CA','Canadá','🇨🇦'],['MX','México','🇲🇽'],['AR','Argentina','🇦🇷'],['GB','Reino Unido','🇬🇧'],['FR','França','🇫🇷'],
    ['DE','Alemanha','🇩🇪'],['IT','Itália','🇮🇹'],['ES','Espanha','🇪🇸'],['PT','Portugal','🇵🇹'],['IN','Índia','🇮🇳'],
    ['AU','Austrália','🇦🇺'],['ZA','África do Sul','🇿🇦'],['EG','Egito','🇪🇬']
  ];
  const sprite = { AU:[0,0], ZA:[0,2], EG:[0,4], DE:[1,0], IT:[1,2], ES:[1,4], PT:[2,0], IN:[2,2], CA:[2,4], MX:[3,0], AR:[3,2], GB:[3,4], FR:[4,0], BR:[4,2], JP:[4,4], KR:[5,0], CN:[5,2], US:[5,4] };

  const textValue = (id, fallback='') => { const e=$(id); return e && String(e.value || '').trim() ? String(e.value).trim() : fallback; };
  const setText = (id, value) => { const e=$(id); if(e) e.textContent = value; };
  const getCountry = () => countries.find(c => c[0] === ($('countryOrigin')?.value || 'BR')) || countries[0];
  const getGender = () => $('characterGender')?.value || 'Masculino';
  const spritePosition = (code, gender) => { const base=sprite[code] || sprite.BR; const col=base[1] + (gender==='Feminino' ? 1 : 0); return `${col*20}% ${base[0]*20}%`; };
  const setSprite = (id, code, gender) => { const e=$(id); if(e) e.style.backgroundPosition = spritePosition(code, gender); };

  const formulas = () => ({
    hp: 10 + (attrs.vigor-8)*2,
    def: 10 + (attrs.agilidade-8) + Math.floor((attrs.percepcao-8)/2),
    stamina: 6 + Math.floor((attrs.vigor-8 + attrs.agilidade-8)/2),
    attack: 5 + (attrs.forca-8),
    focus: 5 + Math.floor((attrs.mente-8 + attrs.vontade-8)/2)
  });

  function updateStatus(){
    const f=formulas();
    [['previewHp',f.hp],['previewDef',f.def],['previewStaminaCylinder',f.stamina],['previewStaminaMax',13],['liveHpValue',f.hp],['liveDefValue',f.def],['liveStaminaValue',f.stamina],['liveAttackValue',f.attack],['liveFocusValue',f.focus],['finalHp',f.hp],['finalDef',f.def],['finalStamina',f.stamina]].forEach(([id,v])=>setText(id,v));
    [['liveHpBar',f.hp,10,24],['liveDefBar',f.def,10,20],['liveStaminaBar',f.stamina,6,13],['liveAttackBar',f.attack,5,12],['liveFocusBar',f.focus,5,12]].forEach(([id,v,min,max])=>{const e=$(id);if(!e)return;const pct=Math.max(5,Math.min(100,((v-min)/(max-min))*100));e.style.width=pct+'%';});
    const card=$('staminaCylinderCard');
    if(card){ const pct=Math.max(10,Math.min(100,f.stamina/13*100)); card.style.setProperty('--stamina-fill',pct+'%'); card.style.setProperty('--stamina-glow',Math.max(.12,pct/300)); }
  }

  function updateHeight(){
    const raw=$('appearanceHeight')?.value || '1,70 m';
    const m=parseFloat(String(raw).replace(',','.')) || 1.7;
    document.documentElement.style.setProperty('--character-height-scale',Math.max(.88,Math.min(1.12,1+(m-1.7)*.55)).toFixed(3));
    setText('heightReadout',m.toFixed(2).replace('.',',')+' m');
  }

  function populateCountries(){
    const select=$('countryOrigin'); if(!select)return;
    select.replaceChildren();
    countries.forEach(c=>{const o=document.createElement('option');o.value=c[0];o.textContent=c[1];select.appendChild(o);});
    select.value='BR';
  }

  function updateWeight(v){
    const value=Number(v)||70;
    if($('appearanceWeight')) $('appearanceWeight').value=value;
    setText('weightReadout',value+' kg');
    if($('weightBar')) $('weightBar').style.width=Math.max(0,Math.min(100,((value-45)/75)*100))+'%';
    $$('[data-weight]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.weight)===value));
    renderReview();
  }

  function updatePreview(){
    const [code,name,flag]=getCountry(), gender=getGender();
    setText('originGenderLabel',gender.toUpperCase()); setText('originReferenceCountry',name); setText('countryFlag',flag); setText('countryName',name); setText('countryHint','Referência visual opcional e ajustável.');
    setText('finalCountryLine',flag+' '+name+' · '+gender); setText('appearancePresetTitle','REFERÊNCIA VISUAL · '+name); setText('appearancePresetText','Modelo-base '+gender.toLowerCase()+' de '+name+', usado apenas como referência.');
    setSprite('previewSprite',code,gender); setSprite('originCharacterSprite',code,gender); setSprite('appearancePresetSprite',code,gender); setSprite('finalSprite',code,gender);
    updateHeight(); updateStatus(); renderReview();
  }

  function renderAttributes(){
    const used=Object.keys(attrs).reduce((s,k)=>s+(attrs[k]-BASE),0), left=Math.max(0,POINTS-used);
    setText('pointsRemaining',left);
    Object.keys(attrs).forEach(k=>{
      const box=document.querySelector(`[data-attr="${k}"]`); if(!box)return;
      const value=box.querySelector('strong'), fill=box.querySelector('i em'), minus=box.querySelector(`[data-minus="${k}"]`), plus=box.querySelector(`[data-plus="${k}"]`);
      if(value)value.textContent=attrs[k]; if(fill)fill.style.width=Math.round(attrs[k]/MAX*100)+'%';
      if(minus)minus.disabled=attrs[k]<=BASE; if(plus)plus.disabled=attrs[k]>=MAX||left<=0;
    });
    updateStatus(); renderReview();
  }

  function changeAttr(key,delta){
    if(!Object.prototype.hasOwnProperty.call(attrs,key))return;
    const used=Object.keys(attrs).reduce((s,k)=>s+(attrs[k]-BASE),0),left=POINTS-used;
    if(delta>0&&(left<=0||attrs[key]>=MAX))return; if(delta<0&&attrs[key]<=BASE)return;
    attrs[key]+=delta; renderAttributes();
  }

  function selectClass(index){
    const cards=$$('.class-card'); if(!cards.length)return;
    currentClass=((Number(index)||0)%cards.length+cards.length)%cards.length;
    cards.forEach((c,i)=>{c.classList.toggle('selected',i===currentClass);c.classList.toggle('side',i!==currentClass);});
    setText('classReadout',cards[currentClass].dataset.class||cards[currentClass].querySelector('b')?.textContent||'Sobrevivente');
    setText('classIndex',String(currentClass+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0'));
    updatePreview();
  }

  function renderReview(){
    const [code,name,flag]=getCountry(),gender=getGender();
    setText('finalName',textValue('characterName','Sem nome')); setText('finalNickname',textValue('characterNickname','—')); const age=textValue('characterAge',''); setText('finalAge',age?age+' anos':'—'); setText('finalClass',textValue('classReadout','Sobrevivente')); setText('finalCountryLine',flag+' '+name+' · '+gender);
    setText('finalSkin','Pele: '+textValue('appearanceSkin','Claro')); setText('finalHair','Cabelo: '+textValue('appearanceHair','Preto')); setText('finalEyes','Olhos: '+textValue('appearanceEyes','Castanhos')); setText('finalAppearanceSummary',textValue('appearanceHeight','1,70 m')+' · '+textValue('appearanceWeight','70')+' kg');
    const extra=[textValue('appearanceScar',''),textValue('appearanceFeatures',''),textValue('appearanceDescription','')].filter(Boolean); setText('finalAppearanceDetails',extra.length?extra.join(' · '):'Sem características adicionais.');
    setText('finalPersonality',textValue('characterPersonality','—')); setText('finalObjective',textValue('characterObjective','—')); setText('finalFear',textValue('characterFear','—')); setText('finalHistory',textValue('characterHistory','—'));
    const host=$('finalAttributes'); if(host){host.replaceChildren(); const names={forca:'Força',agilidade:'Agilidade',vigor:'Vigor',percepcao:'Percepção',mente:'Mente',vontade:'Vontade'}; Object.keys(attrs).forEach(k=>{const e=document.createElement('span');e.innerHTML='<b>'+names[k]+'</b><strong>'+attrs[k]+'</strong>';host.appendChild(e);});}
    setSprite('finalSprite',code,gender);
  }

  function renderDots(){
    const host=$('carouselDots'); if(!host)return; host.replaceChildren();
    slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className=i===currentStep?'is-active':'';b.dataset.dotStep=i;b.setAttribute('aria-label','Ir para etapa '+(i+1));host.appendChild(b);});
  }

  function goTo(target){
    if(!slides.length)return;
    const n=Number(target); currentStep=Math.max(0,Math.min(slides.length-1,Number.isFinite(n)?n:0));
    slides.forEach((s,i)=>{s.classList.toggle('is-active',i===currentStep);s.setAttribute('aria-hidden',i===currentStep?'false':'true');});
    steps.forEach((s,i)=>{s.classList.toggle('is-active',i===currentStep);s.classList.toggle('is-complete',i<currentStep);});
    setText('stepCount',String(currentStep+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0')); setText('stepStatusLabel',labels[currentStep]);
    if($('progressBar'))$('progressBar').style.width=((currentStep+1)/slides.length*100)+'%';
    if($('prevStep'))$('prevStep').disabled=currentStep===0; if($('backStep'))$('backStep').disabled=currentStep===0; if($('nextStep'))$('nextStep').disabled=currentStep===slides.length-1;
    setText('nextAction',currentStep===slides.length-1?'FINALIZAR FICHA ✓':'CONTINUAR →'); renderDots();
    const active=slides[currentStep]; if(active){active.classList.remove('afterlife-step-enter');void active.offsetWidth;active.classList.add('afterlife-step-enter');}
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function bindProfile(){
    const wrap=$('profileWrap'),chip=$('profileChip'),drop=$('profileDropdown'); if(!wrap||!chip||!drop)return;
    const close=()=>{drop.hidden=true;chip.setAttribute('aria-expanded','false');};
    chip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=drop.hidden;drop.hidden=!open;chip.setAttribute('aria-expanded',String(open));});
    drop.addEventListener('click',e=>e.stopPropagation()); document.addEventListener('click',e=>{if(!wrap.contains(e.target))close();}); document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    $('profileSignOut')?.addEventListener('click',async e=>{e.preventDefault();try{const mod=await import('https://esm.sh/@supabase/supabase-js@2');const sb=mod.createClient('https://kitlpowgcugvlxwhwhqv.supabase.co','sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW');await sb.auth.signOut();}catch(_){}location.href='../index.html';});
  }

  async function loadProfile(){
    try{
      const sb=window.__afterlifeAeriom || (await import('https://esm.sh/@supabase/supabase-js@2')).createClient('https://kitlpowgcugvlxwhwhqv.supabase.co','sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      window.__afterlifeAeriom=sb;
      const result=await sb.auth.getSession(),user=result?.data?.session?.user;
      if(!user)return;
      let name=user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Sobrevivente',url='';
      const profile=await sb.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();
      if(profile.data?.display_name)name=profile.data.display_name;
      if(profile.data?.avatar_path){const signed=await sb.storage.from('avatars').createSignedUrl(profile.data.avatar_path,3600);url=signed.data?.signedUrl||'';}
      setText('profileName',name); setText('profileDropdownName',name); setText('profileDropdownEmail',user.email||'Conta Afterlife');
      const initial=(name.trim().charAt(0)||'A').toUpperCase();
      [['profileAvatar',url],['profileDropdownAvatar',url]].forEach(([id,src])=>{const box=$(id);if(!box)return;box.replaceChildren();if(!src){box.textContent=initial;return;}const img=document.createElement('img');img.src=src;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{box.replaceChildren();box.textContent=initial;};box.appendChild(img);});
    }catch(error){console.warn('[AFTERLIFE] perfil:',error);}
  }

  function bind(){
    bindProfile();
    steps.forEach(s=>s.addEventListener('click',e=>{e.preventDefault();goTo(s.dataset.step);}));
    $('prevStep')?.addEventListener('click',e=>{e.preventDefault();goTo(currentStep-1);});
    $('nextStep')?.addEventListener('click',e=>{e.preventDefault();goTo(currentStep+1);});
    $('backStep')?.addEventListener('click',e=>{e.preventDefault();goTo(currentStep-1);});
    $('nextAction')?.addEventListener('click',e=>{e.preventDefault();if(currentStep<slides.length-1)goTo(currentStep+1);});
    $('cancelBuilder')?.addEventListener('click',e=>{e.preventDefault();location.href='./index.html';});
    $('carouselDots')?.addEventListener('click',e=>{const b=e.target.closest('[data-dot-step]');if(b)goTo(b.dataset.dotStep);});
    $('countryOrigin')?.addEventListener('change',updatePreview); $('characterGender')?.addEventListener('change',updatePreview); $('appearanceHeight')?.addEventListener('change',updatePreview);
    ['characterName','characterNickname','characterAge','characterPersonality','characterObjective','characterFear','characterHistory','appearanceSkin','appearanceHair','appearanceEyes','appearanceEyeShape','appearanceStyle','appearanceScar','appearanceFeatures','appearanceDescription'].forEach(id=>$(id)?.addEventListener('input',()=>{updatePreview();}));
    $$('[data-weight]').forEach(b=>b.addEventListener('click',()=>updateWeight(b.dataset.weight)));
    $$('[data-plus]').forEach(b=>b.addEventListener('click',()=>changeAttr(b.dataset.plus,1))); $$('[data-minus]').forEach(b=>b.addEventListener('click',()=>changeAttr(b.dataset.minus,-1)));
    $$('[data-class]').forEach((c,i)=>c.addEventListener('click',()=>selectClass(i))); $('[data-class-prev]')?.addEventListener('click',()=>selectClass(currentClass-1)); $('[data-class-next]')?.addEventListener('click',()=>selectClass(currentClass+1));
    $('uploadCharacterImage')?.addEventListener('click',()=>$('characterImageFile')?.click());
    $('characterImageFile')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){e.target.value='';return;}if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);const img=$('portraitImg');if(img){img.src=objectUrl;img.hidden=false;} $('portraitEmpty')?.setAttribute('hidden','true'); $('removeCharacterImage')?.removeAttribute('hidden');});
    $('removeCharacterImage')?.addEventListener('click',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;const input=$('characterImageFile'),img=$('portraitImg');if(input)input.value='';if(img){img.removeAttribute('src');img.hidden=true;}$('portraitEmpty')?.removeAttribute('hidden');$('removeCharacterImage')?.setAttribute('hidden','true');});
    $('mobileMenu')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('is-open'));
    window.addEventListener('keydown',e=>{if(e.key==='ArrowRight'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))goTo(currentStep+1);if(e.key==='ArrowLeft'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))goTo(currentStep-1);});
  }

  function boot(){
    populateCountries(); bind(); renderAttributes(); selectClass(currentClass); updatePreview(); goTo(0); loadProfile();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
