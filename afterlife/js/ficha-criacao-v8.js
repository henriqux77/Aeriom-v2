(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const slides = $$('.builder-slide');
  const steps = $$('.builder-step');
  let currentStep = 0;
  let currentClass = 1;
  let objectUrl = null;

  const countries = [
    ['BR','Brasil','🇧🇷'],['JP','Japão','🇯🇵'],['KR','Coreia do Sul','🇰🇷'],['CN','China','🇨🇳'],['US','Estados Unidos','🇺🇸'],
    ['CA','Canadá','🇨🇦'],['MX','México','🇲🇽'],['AR','Argentina','🇦🇷'],['GB','Reino Unido','🇬🇧'],['FR','França','🇫🇷'],
    ['DE','Alemanha','🇩🇪'],['IT','Itália','🇮🇹'],['ES','Espanha','🇪🇸'],['PT','Portugal','🇵🇹'],['IN','Índia','🇮🇳'],
    ['AU','Austrália','🇦🇺'],['ZA','África do Sul','🇿🇦'],['EG','Egito','🇪🇬']
  ];
  const spriteMap = {AU:[0,0],ZA:[0,2],EG:[0,4],DE:[1,0],IT:[1,2],ES:[1,4],PT:[2,0],IN:[2,2],CA:[2,4],MX:[3,0],AR:[3,2],GB:[3,4],FR:[4,0],BR:[4,2],JP:[4,4],KR:[5,0],CN:[5,2],US:[5,4]};
  const genderOffset = {Masculino:0,Feminino:1};
  const attrs = {forca:8,agilidade:8,vigor:8,percepcao:8,mente:8,vontade:8};
  const BASE=8, MAX=15, POINTS=12;

  function getCountry(){ return countries.find(c => c[0] === ($('countryOrigin')?.value || 'BR')) || countries[0]; }
  function getGender(){ return $('characterGender')?.value || 'Masculino'; }
  function spritePos(code, gender){ const base=spriteMap[code] || spriteMap.BR; return `${(base[1]+(genderOffset[gender]||0))*20}% ${base[0]*20}%`; }
  function setSprite(el, code, gender){ if(el) el.style.backgroundPosition=spritePos(code,gender); }

  function formulas(){
    return {
      hp: 10 + (attrs.vigor-8)*2,
      def: 10 + (attrs.agilidade-8) + Math.floor((attrs.percepcao-8)/2),
      stamina: 6 + Math.floor((attrs.vigor-8 + attrs.agilidade-8)/2),
      attack: 5 + (attrs.forca-8),
      focus: 5 + Math.floor((attrs.mente-8 + attrs.vontade-8)/2)
    };
  }

  function updateStatus(){
    const f=formulas();
    [['previewHp',f.hp],['previewDef',f.def],['previewStamina',f.stamina],['liveHpValue',f.hp],['liveDefValue',f.def],['liveStaminaValue',f.stamina],['liveAttackValue',f.attack],['liveFocusValue',f.focus]].forEach(([id,v])=>{if($(id)) $(id).textContent=v;});
    [['liveHpBar',f.hp,10,24],['liveDefBar',f.def,10,20],['liveStaminaBar',f.stamina,6,13],['liveAttackBar',f.attack,5,12],['liveFocusBar',f.focus,5,12]].forEach(([id,v,min,max])=>{if($(id)) $(id).style.width=`${Math.max(5,Math.min(100,(v-min)/(max-min)*100))}%`;});
    if($('previewStaminaCylinder')) $('previewStaminaCylinder').textContent=f.stamina;
    if($('previewStaminaMax')) $('previewStaminaMax').textContent=13;
    const tankFill=Math.max(10,Math.min(100,f.stamina/13*100));
    if($('staminaCylinderCard')) $('staminaCylinderCard').style.setProperty('--stamina-fill',`${tankFill}%`);
  }

  function updatePreview(){
    const [code,name,flag]=getCountry(), gender=getGender();
    const cls=$('classReadout')?.textContent || 'Sobrevivente';
    if($('previewName')) $('previewName').textContent=$('characterName')?.value.trim() || 'Sem nome';
    if($('previewSub')) $('previewSub').textContent=`Humano · ${cls} · ${name}`;
    setSprite($('previewSprite'),code,gender); setSprite($('originCharacterSprite'),code,gender); setSprite($('appearancePresetSprite'),code,gender); setSprite($('finalSprite'),code,gender);
    if($('originGenderLabel')) $('originGenderLabel').textContent=gender.toUpperCase();
    if($('originReferenceCountry')) $('originReferenceCountry').textContent=name;
    if($('finalCountryLine')) $('finalCountryLine').textContent=`${flag} ${name} · ${gender}`;
    if($('appearancePresetTitle')) $('appearancePresetTitle').textContent=`REFERÊNCIA VISUAL · ${name}`;
    if($('appearancePresetText')) $('appearancePresetText').textContent=`Modelo-base ${gender.toLowerCase()} de ${name}, usado apenas como referência.`;
    if($('countryFlag')) $('countryFlag').textContent=flag;
    if($('countryName')) $('countryName').textContent=name;
    if($('countryHint')) $('countryHint').textContent='Referência visual opcional e ajustável.';
    updateHeight();
  }

  function updateHeight(){
    const raw=$('appearanceHeight')?.value || '1,70 m';
    const m=parseFloat(raw.replace(',','.')) || 1.7;
    const scale=Math.max(.88,Math.min(1.12,1+(m-1.7)*.55));
    document.documentElement.style.setProperty('--character-height-scale',scale.toFixed(3));
    if($('heightReadout')) $('heightReadout').textContent=`${m.toFixed(2).replace('.',',')} m`;
  }

  function updateWeight(v){
    if($('appearanceWeight')) $('appearanceWeight').value=v;
    if($('weightReadout')) $('weightReadout').textContent=`${v} kg`;
    if($('weightBar')) $('weightBar').style.width=`${Math.max(0,Math.min(100,(v-45)/75*100))}%`;
    $$('[data-weight]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.weight)===v));
  }

  function renderAttributes(){
    const spent=Object.values(attrs).reduce((s,v)=>s+(v-BASE),0); const left=Math.max(0,POINTS-spent);
    if($('pointsRemaining')) $('pointsRemaining').textContent=left;
    Object.entries(attrs).forEach(([key,v])=>{
      const box=document.querySelector(`[data-attr="${key}"]`); if(!box)return;
      const value=box.querySelector('strong'); if(value)value.textContent=v;
      const fill=box.querySelector('i em'); if(fill)fill.style.width=`${Math.round(v/MAX*100)}%`;
      const minus=box.querySelector(`[data-minus="${key}"]`), plus=box.querySelector(`[data-plus="${key}"]`);
      if(minus)minus.disabled=v<=BASE; if(plus)plus.disabled=v>=MAX || left<=0;
    });
    updateStatus(); renderFinal();
  }

  function changeAttribute(key,delta){
    const spent=Object.values(attrs).reduce((s,v)=>s+(v-BASE),0), left=POINTS-spent;
    if(delta>0 && (left<=0 || attrs[key]>=MAX)) return;
    if(delta<0 && attrs[key]<=BASE) return;
    attrs[key]+=delta; renderAttributes();
  }

  function renderDots(){
    const host=$('carouselDots'); if(!host)return; host.replaceChildren();
    slides.forEach((_,i)=>{const b=document.createElement('button'); b.type='button'; b.className=i===currentStep?'is-active':''; b.setAttribute('aria-label',`Ir para etapa ${i+1}`); b.addEventListener('click',()=>goTo(i)); host.appendChild(b);});
  }

  function goTo(next){
    currentStep=Math.max(0,Math.min(slides.length-1,next));
    slides.forEach((s,i)=>s.classList.toggle('is-active',i===currentStep));
    steps.forEach((s,i)=>{s.classList.toggle('is-active',i===currentStep);s.classList.toggle('is-complete',i<currentStep);});
    if($('progressBar'))$('progressBar').style.width=`${(currentStep+1)/slides.length*100}%`;
    if($('stepCount'))$('stepCount').textContent=`${String(currentStep+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    const labels=['IDENTIDADE','ORIGEM','APARÊNCIA','CLASSE','ATRIBUTOS','CONCEITO','REVISÃO FINAL']; if($('stepStatusLabel'))$('stepStatusLabel').textContent=labels[currentStep];
    if($('prevStep'))$('prevStep').disabled=currentStep===0;
    if($('backStep'))$('backStep').disabled=currentStep===0;
    if($('nextStep'))$('nextStep').disabled=currentStep===slides.length-1;
    if($('nextAction'))$('nextAction').textContent=currentStep===slides.length-1?'FINALIZAR FICHA ✓':'CONTINUAR →';
    renderDots(); renderFinal();
  }

  function selectClass(index){
    const cards=$$('.class-card'); if(!cards.length)return; currentClass=(index+cards.length)%cards.length;
    cards.forEach((card,i)=>{card.classList.toggle('selected',i===currentClass);card.classList.toggle('side',i!==currentClass);});
    const chosen=cards[currentClass];
    if($('classReadout'))$('classReadout').textContent=chosen?.dataset.class || chosen?.querySelector('b')?.textContent || 'Sobrevivente';
    if($('classIndex'))$('classIndex').textContent=`${currentClass+1} / ${cards.length}`;
    updatePreview(); renderFinal();
  }

  function renderFinal(){
    const [code,name,flag]=getCountry(),gender=getGender();
    const set=(id,val)=>{if($(id))$(id).textContent=val;};
    set('finalName',$('characterName')?.value.trim()||'Sem nome'); set('finalNickname',$('characterNickname')?.value.trim()||'—'); set('finalAge',$('characterAge')?.value?`${$('characterAge').value} anos`:'—'); set('finalClass',$('classReadout')?.textContent||'Sobrevivente'); set('finalCountryLine',`${flag} ${name} · ${gender}`);
    set('finalSkin',`Pele: ${$('appearanceSkin')?.value||'Claro'}`); set('finalHair',`Cabelo: ${$('appearanceHair')?.value||'Preto'}`); set('finalEyes',`Olhos: ${$('appearanceEyes')?.value||'Castanhos'}`);
    set('finalAppearanceSummary',`${$('appearanceHeight')?.value||'1,70 m'} · ${$('appearanceWeight')?.value||'70 kg'}`);
    const extras=[($('appearanceScar')?.value||'').trim(),($('appearanceFeatures')?.value||'').trim(),($('appearanceDescription')?.value||'').trim()].filter(Boolean); set('finalAppearanceDetails',extras.join(' · ')||'Sem características adicionais.');
    set('finalPersonality',$('characterPersonality')?.value.trim()||'—'); set('finalObjective',$('characterObjective')?.value.trim()||'—'); set('finalFear',$('characterFear')?.value.trim()||'—'); set('finalHistory',$('characterHistory')?.value.trim()||'—');
    const host=$('finalAttributes'); if(host){host.replaceChildren(); const names={forca:'Força',agilidade:'Agilidade',vigor:'Vigor',percepcao:'Percepção',mente:'Mente',vontade:'Vontade'}; Object.entries(attrs).forEach(([k,v])=>{const s=document.createElement('span');s.innerHTML=`<b>${names[k]}</b><strong>${v}</strong>`;host.appendChild(s);});}
    const f=formulas(); set('finalHp',f.hp);set('finalDef',f.def);set('finalStamina',f.stamina);setSprite($('finalSprite'),code,gender);
  }

  function bind(){
    steps.forEach(step=>step.addEventListener('click',e=>{e.preventDefault();goTo(Number(step.dataset.step)||0);}));
    $('prevStep')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goTo(currentStep-1);});
    $('nextStep')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goTo(currentStep+1);});
    $('backStep')?.addEventListener('click',e=>{e.preventDefault();goTo(currentStep-1);});
    $('nextAction')?.addEventListener('click',e=>{e.preventDefault(); if(currentStep<slides.length-1) goTo(currentStep+1); else alert('A etapa final de persistência da ficha será ligada ao banco quando as regras forem fechadas.');});
    $('cancelBuilder')?.addEventListener('click',e=>{e.preventDefault();history.length>1?history.back():location.href='./index.html';});
    $('countryOrigin')?.addEventListener('change',updatePreview);
    $('characterGender')?.addEventListener('change',updatePreview);
    ['characterName','characterNickname','characterAge','characterPersonality','characterObjective','characterFear','characterHistory','appearanceScar','appearanceFeatures','appearanceDescription'].forEach(id=>$(id)?.addEventListener('input',()=>{updatePreview();renderFinal();}));
    ['appearanceSkin','appearanceHair','appearanceEyes','appearanceEyeShape','appearanceStyle'].forEach(id=>$(id)?.addEventListener('change',renderFinal));
    $('appearanceHeight')?.addEventListener('change',()=>{updateHeight();renderFinal();});
    $$('[data-weight]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();updateWeight(Number(btn.dataset.weight));renderFinal();}));
    $$('[data-plus]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeAttribute(btn.dataset.plus,1);});
    $$('[data-minus]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeAttribute(btn.dataset.minus,-1);});
    $$('[data-class]').forEach((card,i)=>card.addEventListener('click',e=>{e.preventDefault();selectClass(i);}));
    $('[data-class-prev]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectClass(currentClass-1);});
    $('[data-class-next]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectClass(currentClass+1);});
    $('uploadCharacterImage')?.addEventListener('click',()=> $('characterImageFile')?.click());
    $('characterImageFile')?.addEventListener('change',()=>{
      const file=$('characterImageFile')?.files?.[0]; if(!file)return;
      if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size>5*1024*1024){alert('Use JPG, PNG, WEBP ou GIF de até 5 MB.');$('characterImageFile').value='';return;}
      if(objectUrl)URL.revokeObjectURL(objectUrl); objectUrl=URL.createObjectURL(file); const img=$('portraitImg'); if(img){img.src=objectUrl;img.hidden=false;} if($('portraitEmpty'))$('portraitEmpty').hidden=true; if($('removeCharacterImage'))$('removeCharacterImage').hidden=false; if($('appearancePresetSprite'))$('appearancePresetSprite').hidden=true;
    });
    $('removeCharacterImage')?.addEventListener('click',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;if($('portraitImg'))$('portraitImg').hidden=true;if($('portraitImg'))$('portraitImg').removeAttribute('src');if($('portraitEmpty'))$('portraitEmpty').hidden=false;if($('removeCharacterImage'))$('removeCharacterImage').hidden=true;if($('appearancePresetSprite'))$('appearancePresetSprite').hidden=false;});
    $('mobileMenu')?.addEventListener('click',()=> $('sidebar')?.classList.toggle('is-open'));
    document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowRight')goTo(currentStep+1);if(e.key==='ArrowLeft')goTo(currentStep-1);});
  }

  async function loadProfile(){
    try{
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
      const sb=createClient('https://kitlpowgcugvlxwhwhqv.supabase.co','sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data}=await sb.auth.getSession(); const user=data?.session?.user; if(!user)return;
      const fallback=user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Sobrevivente';
      let name=fallback,avatar='';
      const {data:profile}=await sb.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();
      name=profile?.display_name||fallback;
      if(profile?.avatar_path){const {data:s}=await sb.storage.from('avatars').createSignedUrl(profile.avatar_path,3600);avatar=s?.signedUrl||'';}
      if($('profileName'))$('profileName').textContent=name; if($('profileDropdownName'))$('profileDropdownName').textContent=name; if($('profileDropdownEmail'))$('profileDropdownEmail').textContent=user.email||'Conta Afterlife';
      const initial=name.trim().charAt(0).toUpperCase()||'A';
      [$('profileAvatar'),$('profileDropdownAvatar')].forEach(el=>{if(!el)return;el.replaceChildren();if(avatar){const img=document.createElement('img');img.src=avatar;img.alt='';img.referrerPolicy='no-referrer';el.appendChild(img);}else el.textContent=initial;});
    }catch(err){ console.warn('Perfil Afterlife indisponível nesta carga:',err); }
  }

  function setupProfileMenu(){
    const chip=$('profileChip'),drop=$('profileDropdown'),wrap=$('profileWrap'); if(!chip||!drop)return;
    const close=()=>{drop.hidden=true;chip.setAttribute('aria-expanded','false');};
    chip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();drop.hidden=!drop.hidden;chip.setAttribute('aria-expanded',String(!drop.hidden));});
    drop.addEventListener('click',e=>e.stopPropagation()); document.addEventListener('click',e=>{if(!wrap.contains(e.target))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    $('profileSignOut')?.addEventListener('click',async()=>{try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');const sb=createClient('https://kitlpowgcugvlxwhwhqv.supabase.co','sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW');await sb.auth.signOut();}finally{location.replace('../index.html');}});
  }

  function init(){
    const country=$('countryOrigin'); if(country){country.replaceChildren(...countries.map(([code,name])=>{const o=document.createElement('option');o.value=code;o.textContent=name;return o;}));country.value='BR';}
    bind(); setupProfileMenu(); renderAttributes(); updateWeight(70); selectClass(1); updatePreview(); goTo(0); void loadProfile();
  }
  init();
})();
