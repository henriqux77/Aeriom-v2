(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const slides = [...document.querySelectorAll('.builder-slide')];
  const steps = [...document.querySelectorAll('.builder-step')];
  const track = $('carouselTrack');
  const dots = $('carouselDots');
  let index = 0;
  let classIndex = 1;
  let previewObjectUrl = null;
  let touchX = null;

  const countries = [
    ['BR','Brasil','🇧🇷'],['JP','Japão','🇯🇵'],['KR','Coreia do Sul','🇰🇷'],['CN','China','🇨🇳'],['US','Estados Unidos','🇺🇸'],
    ['CA','Canadá','🇨🇦'],['MX','México','🇲🇽'],['AR','Argentina','🇦🇷'],['GB','Reino Unido','🇬🇧'],['FR','França','🇫🇷'],
    ['DE','Alemanha','🇩🇪'],['IT','Itália','🇮🇹'],['ES','Espanha','🇪🇸'],['PT','Portugal','🇵🇹'],['IN','Índia','🇮🇳'],
    ['AU','Austrália','🇦🇺'],['ZA','África do Sul','🇿🇦'],['EG','Egito','🇪🇬']
  ];
  const spriteMap = {AU:[0,0],ZA:[0,2],EG:[0,4],DE:[1,0],IT:[1,2],ES:[1,4],PT:[2,0],IN:[2,2],CA:[2,4],MX:[3,0],AR:[3,2],GB:[3,4],FR:[4,0],BR:[4,2],JP:[4,4],KR:[5,0],CN:[5,2],US:[5,4]};
  const genderOffset = {Masculino:0,Feminino:1};
  const attrs = {forca:8,agilidade:8,vigor:8,percepcao:8,mente:8,vontade:8};
  const BASE = 8, MAX = 15, POINTS = 12;

  const style = document.createElement('style');
  style.id = 'afterlife-ficha-runtime-fix';
  style.textContent = `
    .character-builder .carousel-footer{position:relative;z-index:5!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;margin-top:12px!important;padding:8px 2px 2px!important;min-height:54px!important}
    .character-builder .carousel-dots{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-width:120px!important;min-height:18px!important;margin:0!important;overflow:visible!important}
    .character-builder .carousel-dots button{appearance:none!important;width:9px!important;height:9px!important;min-width:9px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#33423a!important;box-shadow:none!important;transition:all .28s ease!important;cursor:pointer!important}
    .character-builder .carousel-dots button.is-active{width:30px!important;height:8px!important;border-radius:999px!important;background:#39f58a!important;box-shadow:0 0 14px rgba(57,245,138,.3)!important}
    .character-builder .footer-actions{display:grid!important;grid-template-columns:minmax(110px,1fr) minmax(110px,1fr) minmax(150px,1.25fr)!important;gap:8px!important;align-items:stretch!important}
    .character-builder .footer-actions .btn{appearance:none!important;-webkit-appearance:none!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;height:44px!important;text-decoration:none!important;border-radius:9px!important;font:800 11px/1 Inter,system-ui,sans-serif!important}
    .character-builder .footer-actions a.btn{color:#e6eee9!important;text-decoration:none!important}
    .character-builder .stamina-valve::before{display:none!important}
    .character-builder .preview-mini-stats>div:nth-child(1)::before{content:'♥'!important}
    .character-builder .preview-mini-stats>div:nth-child(2)::before{content:'◈'!important}
    .character-builder .afterlife-profile-dropdown[hidden]{display:none!important}
    .character-builder .afterlife-profile-dropdown{max-width:calc(100vw - 24px)!important;overflow:hidden!important}
    .character-builder .appearance-country-note{min-width:0!important;overflow:hidden!important}
    .character-builder .appearance-country-note b,.character-builder .appearance-country-note small{overflow:hidden!important;text-overflow:ellipsis!important}
    .character-builder .free-appearance-panel input,.character-builder .free-appearance-panel textarea{appearance:none!important;-webkit-appearance:none!important;display:block!important;width:100%!important;box-sizing:border-box!important;background:#050c08!important;color:#edf5f0!important;border:1px solid rgba(127,160,145,.2)!important;border-radius:10px!important;padding:12px 13px!important;font:500 11px/1.5 Inter,system-ui,sans-serif!important;outline:none!important}
    .character-builder .free-appearance-panel input:focus,.character-builder .free-appearance-panel textarea:focus{border-color:rgba(57,245,138,.48)!important;box-shadow:0 0 0 3px rgba(57,245,138,.07)!important}
    .character-builder .class-card{transition:transform .42s cubic-bezier(.22,.78,.2,1),opacity .34s ease,filter .42s ease,border-color .35s ease,box-shadow .42s ease!important}
    .character-builder .class-card.selected{animation:afterlifeClassSwap .44s cubic-bezier(.22,.78,.2,1)!important}
    @keyframes afterlifeClassSwap{from{opacity:.55;filter:blur(1px);transform:scale(.97) translateY(8px)}to{opacity:1;filter:none;transform:scale(1.06)}}
    .character-builder .stamina-cylinder{filter:drop-shadow(0 11px 18px rgba(0,0,0,.42))!important}
    .character-builder .stamina-body{background:linear-gradient(90deg,#101915,#39483f 16%,#151f1a 31%,#2a372f 55%,#0e1712 79%,#2b3830)!important}
    .character-builder .preview-mini-stats>div{overflow:hidden!important}
    .character-builder .carousel-footer .footer-actions{position:relative!important}
    @media(max-width:720px){.character-builder .carousel-footer{flex-direction:column!important;align-items:stretch!important}.character-builder .carousel-dots{order:0}.character-builder .footer-actions{width:100%!important;grid-template-columns:1fr 1fr!important}.character-builder .footer-actions .btn:last-child{grid-column:1/-1}.character-builder .carousel-footer{gap:7px!important;padding-top:5px!important}}
    @media(max-width:420px){.character-builder .carousel-dots{gap:6px!important}.character-builder .carousel-dots button.is-active{width:25px!important}}
  `;
  document.head.appendChild(style);

  function countryInfo(){return countries.find(x=>x[0]===($('countryOrigin')?.value||'BR'))||countries[0]}
  function gender(){return $('characterGender')?.value||'Masculino'}
  function spritePosition(code,g){const b=spriteMap[code]||spriteMap.BR;return {x:(b[1]+genderOffset[g])*20,y:b[0]*20}}
  function setSprite(el,code,g){if(!el)return;const p=spritePosition(code,g);el.style.backgroundPosition=`${p.x}% ${p.y}%`}

  function updatePreview(){
    const [code,name,flag]=countryInfo(); const g=gender();
    const cls=$('classReadout')?.textContent||'Sobrevivente';
    if($('previewName')) $('previewName').textContent=$('characterName')?.value.trim()||'Sem nome';
    if($('previewSub')) $('previewSub').textContent=`Humano · ${cls} · ${name}`;
    setSprite($('previewSprite'),code,g); setSprite($('originCharacterSprite'),code,g); setSprite($('appearancePresetSprite'),code,g); setSprite($('finalSprite'),code,g);
    if($('originGenderLabel')) $('originGenderLabel').textContent=g.toUpperCase();
    if($('originReferenceCountry')) $('originReferenceCountry').textContent=name;
    if($('finalCountryLine')) $('finalCountryLine').textContent=`${flag} ${name} · ${g}`;
    if($('appearancePresetTitle')) $('appearancePresetTitle').textContent=`Preset visual · ${name}`;
    if($('appearancePresetText')) $('appearancePresetText').textContent=`Modelo-base de referência · ${g.toLowerCase()} · carregado para ${name}.`;
  }

  function formulas(){return {hp:10+(attrs.vigor-8)*2,def:10+(attrs.agilidade-8)+Math.floor((attrs.percepcao-8)/2),stamina:6+Math.floor((attrs.vigor-8+attrs.agilidade-8)/2),attack:5+(attrs.forca-8),focus:5+Math.floor((attrs.mente-8+attrs.vontade-8)/2)}}
  function bar(id,v,min,max){const pct=Math.max(5,Math.min(100,(v-min)/(max-min)*100));if($(id+'Value'))$(id+'Value').textContent=v;if($(id+'Bar'))$(id+'Bar').style.width=pct+'%'}
  function updateLive(){const f=formulas();bar('liveHp',f.hp,10,24);bar('liveDef',f.def,10,20);bar('liveStamina',f.stamina,6,13);bar('liveAttack',f.attack,5,12);bar('liveFocus',f.focus,5,12);if($('previewHp'))$('previewHp').textContent=f.hp;if($('previewDef'))$('previewDef').textContent=f.def;if($('previewStamina'))$('previewStamina').textContent=f.stamina;if($('previewStaminaCylinder'))$('previewStaminaCylinder').textContent=f.stamina;if($('previewStaminaMax'))$('previewStaminaMax').textContent=13;if($('finalHp'))$('finalHp').textContent=f.hp;if($('finalDef'))$('finalDef').textContent=f.def;if($('finalStamina'))$('finalStamina').textContent=f.stamina}

  function updateHeight(){const m=parseFloat(($('appearanceHeight')?.value||'1,70').replace(',','.'))||1.7;const scale=Math.max(.88,Math.min(1.12,1+(m-1.7)*.55));document.documentElement.style.setProperty('--character-height-scale',scale.toFixed(3));if($('heightReadout'))$('heightReadout').textContent=m.toFixed(2).replace('.',',')+' m';renderFinalReview()}
  function updateWeight(v){if($('appearanceWeight'))$('appearanceWeight').value=v;if($('weightReadout'))$('weightReadout').textContent=v+' kg';if($('weightBar'))$('weightBar').style.width=Math.max(0,Math.min(100,(v-45)/75*100))+'%';document.querySelectorAll('[data-weight]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.weight)===v));renderFinalReview()}

  function renderAttrs(){const spent=Object.values(attrs).reduce((s,v)=>s+(v-BASE),0);const left=Math.max(0,POINTS-spent);if($('pointsRemaining'))$('pointsRemaining').textContent=left;Object.entries(attrs).forEach(([k,v])=>{const box=document.querySelector(`[data-attr="${k}"]`);if(!box)return;box.querySelector('strong')?.replaceChildren(document.createTextNode(v));const em=box.querySelector('i em');if(em)em.style.width=Math.round(v/MAX*100)+'%';const minus=box.querySelector(`[data-minus="${k}"]`),plus=box.querySelector(`[data-plus="${k}"]`);if(minus)minus.disabled=v<=BASE;if(plus)plus.disabled=v>=MAX||left<=0});updateLive();renderFinalReview()}
  function changeAttr(k,d){const spent=Object.values(attrs).reduce((s,v)=>s+(v-BASE),0);const left=POINTS-spent;if(d>0&&(attrs[k]>=MAX||left<=0))return;if(d<0&&attrs[k]<=BASE)return;attrs[k]+=d;renderAttrs()}

  function renderDots(){if(!dots)return;dots.replaceChildren();slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.className=i===index?'is-active':'';b.setAttribute('aria-label',`Etapa ${i+1}`);b.addEventListener('click',()=>goTo(i));dots.appendChild(b)})}
  function updateStepStatus(){const labels=['IDENTIDADE','ORIGEM','APARÊNCIA','CLASSE','ATRIBUTOS','CONCEITO','REVISÃO FINAL'];if($('stepStatusLabel'))$('stepStatusLabel').textContent=labels[index]||''}
  function goTo(next){index=Math.max(0,Math.min(slides.length-1,next));slides.forEach((s,i)=>s.classList.toggle('is-active',i===index));steps.forEach((s,i)=>{s.classList.toggle('is-active',i===index);s.classList.toggle('is-complete',i<index)});if($('stepCount'))$('stepCount').textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;if($('progressBar'))$('progressBar').style.width=((index+1)/slides.length*100)+'%';if($('prevStep'))$('prevStep').disabled=index===0;if($('backStep'))$('backStep').disabled=index===0;if($('nextStep'))$('nextStep').disabled=index===slides.length-1;if($('nextAction'))$('nextAction').textContent=index===slides.length-1?'FINALIZAR FICHA ✓':'CONTINUAR →';updateStepStatus();renderDots();renderFinalReview();track?.focus({preventScroll:true})}

  function populateCountries(){const s=$('countryOrigin');if(!s)return;s.replaceChildren();countries.forEach(([code,name])=>{const o=document.createElement('option');o.value=code;o.textContent=name;s.appendChild(o)});s.value='BR';updateCountry()}
  function updateCountry(){const [code,name,flag]=countryInfo();if($('countryFlag'))$('countryFlag').textContent=flag;if($('countryName'))$('countryName').textContent=name;if($('countryHint'))$('countryHint').textContent='Referência visual opcional e ajustável.';updatePreview();renderFinalReview()}

  function selectClass(card){const cards=[...document.querySelectorAll('.class-card')];const i=cards.indexOf(card);if(i<0)return;cards.forEach((c,n)=>{c.classList.toggle('selected',n===i);c.classList.toggle('side',n!==i)});classIndex=i;if($('classReadout'))$('classReadout').textContent=card.dataset.class||card.querySelector('b')?.textContent||'Sobrevivente';if($('classIndex'))$('classIndex').textContent=`${i+1} / ${cards.length}`;updatePreview();renderFinalReview()}
  function moveClass(d){const cards=[...document.querySelectorAll('.class-card')];if(!cards.length)return;const current=cards.findIndex(c=>c.classList.contains('selected'));const i=(current<0?classIndex:current);selectClass(cards[(i+d+cards.length)%cards.length])}

  function renderFinalReview(){
    const [code,name,flag]=countryInfo();const g=gender();const f=formulas();
    $('finalName')&&($('finalName').textContent=$('characterName')?.value.trim()||'Sem nome');
    $('finalNickname')&&($('finalNickname').textContent=$('characterNickname')?.value.trim()||'—');
    $('finalAge')&&($('finalAge').textContent=$('characterAge')?.value?$('characterAge').value+' anos':'—');
    $('finalClass')&&($('finalClass').textContent=$('classReadout')?.textContent||'Sobrevivente');
    $('finalCountryLine')&&($('finalCountryLine').textContent=`${flag} ${name} · ${g}`);
    $('finalSkin')&&($('finalSkin').textContent='Pele: '+($('appearanceSkin')?.value||'Claro'));
    $('finalHair')&&($('finalHair').textContent='Cabelo: '+($('appearanceHair')?.value||'Preto'));
    $('finalEyes')&&($('finalEyes').textContent='Olhos: '+($('appearanceEyes')?.value||'Castanhos'));
    $('finalAppearanceSummary')&&($('finalAppearanceSummary').textContent=`${$('appearanceHeight')?.value||'1,70 m'} · ${$('appearanceWeight')?.value||'70 kg'}`);
    $('finalAppearanceDetails')&&($('finalAppearanceDetails').textContent=[($('appearanceScar')?.value||'').trim()?`Marca: ${$('appearanceScar').value.trim()}`:'',($('appearanceFeatures')?.value||'').trim(),($('appearanceDescription')?.value||'').trim()].filter(Boolean).join(' · ')||'Sem características adicionais.');
    $('finalPersonality')&&($('finalPersonality').textContent=$('characterPersonality')?.value.trim()||'—');$('finalObjective')&&($('finalObjective').textContent=$('characterObjective')?.value.trim()||'—');$('finalFear')&&($('finalFear').textContent=$('characterFear')?.value.trim()||'—');$('finalHistory')&&($('finalHistory').textContent=$('characterHistory')?.value.trim()||'—');
    $('finalHp')&&($('finalHp').textContent=f.hp);$('finalDef')&&($('finalDef').textContent=f.def);$('finalStamina')&&($('finalStamina').textContent=f.stamina);
    const root=$('finalAttributes');if(root){root.replaceChildren();const names={forca:'Força',agilidade:'Agilidade',vigor:'Vigor',percepcao:'Percepção',mente:'Mente',vontade:'Vontade'};Object.entries(attrs).forEach(([k,v])=>{const el=document.createElement('span');const b=document.createElement('b');b.textContent=names[k];const st=document.createElement('strong');st.textContent=v;el.append(b,st);root.appendChild(el)})}
    setSprite($('finalSprite'),code,g);
  }

  function setupProfile(){const chip=$('profileChip'),drop=$('profileDropdown'),wrap=$('profileWrap');if(!chip||!drop)return;const close=()=>{drop.hidden=true;chip.setAttribute('aria-expanded','false')};chip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();drop.hidden=!drop.hidden;chip.setAttribute('aria-expanded',String(!drop.hidden))});drop.addEventListener('click',e=>e.stopPropagation());document.addEventListener('click',e=>{if(!wrap?.contains(e.target))close()},{passive:true});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});$('profileSignOut')?.addEventListener('click',async()=>{try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');const s=createClient('https://kitlpowgcugvlxwhwhqv.supabase.co','sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});await s.auth.signOut()}finally{location.replace('../index.html')}})}

  async function loadProfile(){try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');const sb=createClient('https://kitlpowgcugvlxwhwhqv.supabase.co','sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data}=await sb.auth.getSession();const user=data?.session?.user;if(!user)return;const fallback=user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Sobrevivente';let name=fallback,avatar='';try{const {data:p}=await sb.from('profiles').select('display_name,avatar_path').eq('id',user.id).maybeSingle();name=p?.display_name||fallback;if(p?.avatar_path){const {data:u}=await sb.storage.from('avatars').createSignedUrl(p.avatar_path,3600);avatar=u?.signedUrl||''}}catch(_){}if($('profileName'))$('profileName').textContent=name;if($('profileDropdownName'))$('profileDropdownName').textContent=name;if($('profileDropdownEmail'))$('profileDropdownEmail').textContent=user.email||'Conta Afterlife';document.querySelectorAll('#profileAvatar,#profileDropdownAvatar').forEach(el=>{el.replaceChildren();if(avatar){const img=document.createElement('img');img.src=avatar;img.alt='';img.referrerPolicy='no-referrer';el.appendChild(img)}else el.textContent=name.charAt(0).toUpperCase()});}catch(_){}}

  function bind(){
    $('prevStep')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goTo(index-1)});
    $('nextStep')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goTo(index+1)});
    $('backStep')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goTo(index-1)});
    $('nextAction')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(index<slides.length-1)goTo(index+1);else alert('Ficha pronta para finalização.')});
    $('countryOrigin')?.addEventListener('change',updateCountry);$('characterGender')?.addEventListener('change',()=>{updatePreview();renderFinalReview()});
    $('appearanceHeight')?.addEventListener('change',updateHeight);
    document.querySelectorAll('[data-weight]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();updateWeight(Number(b.dataset.weight))}));
    document.querySelectorAll('[data-plus],[data-minus]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();changeAttr(b.dataset.plus||b.dataset.minus,b.dataset.plus?1:-1)}));
    document.querySelectorAll('.class-card').forEach(c=>c.addEventListener('click',()=>selectClass(c)));
    document.querySelector('[data-class-prev]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();moveClass(-1)});document.querySelector('[data-class-next]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();moveClass(1)});
    ['characterName','characterNickname','characterAge','characterPersonality','characterObjective','characterFear','characterHistory','appearanceScar','appearanceFeatures','appearanceDescription'].forEach(id=>$(id)?.addEventListener('input',()=>{updatePreview();renderFinalReview()}));
    ['appearanceSkin','appearanceHair','appearanceEyes','appearanceEyeShape','appearanceStyle'].forEach(id=>$(id)?.addEventListener('change',renderFinalReview));
    $('uploadCharacterImage')?.addEventListener('click',()=>$('characterImageFile')?.click());
    $('characterImageFile')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return; if(file.size>5*1024*1024){alert('A imagem precisa ter no máximo 5 MB.');e.target.value='';return}if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=URL.createObjectURL(file);if($('portraitImg')){$('portraitImg').src=previewObjectUrl;$('portraitImg').hidden=false}if($('portraitEmpty'))$('portraitEmpty').hidden=true;if($('appearancePresetSprite'))$('appearancePresetSprite').hidden=true;if($('removeCharacterImage'))$('removeCharacterImage').hidden=false});
    $('removeCharacterImage')?.addEventListener('click',()=>{if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null;if($('portraitImg')){$('portraitImg').removeAttribute('src');$('portraitImg').hidden=true}if($('appearancePresetSprite'))$('appearancePresetSprite').hidden=false;if($('portraitEmpty'))$('portraitEmpty').hidden=true;if($('removeCharacterImage'))$('removeCharacterImage').hidden=true;if($('characterImageFile'))$('characterImageFile').value=''});
    steps.forEach(s=>s.addEventListener('click',()=>goTo(Number(s.dataset.step))));
    track?.addEventListener('touchstart',e=>{if(e.touches.length===1)touchX=e.touches[0].clientX},{passive:true});
    track?.addEventListener('touchend',e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(dx)>55)goTo(index+(dx<0?1:-1))},{passive:true});
    document.addEventListener('keydown',e=>{const tag=e.target?.tagName?.toLowerCase();if(['input','textarea','select','button'].includes(tag))return;if(e.key==='ArrowLeft')goTo(index-1);if(e.key==='ArrowRight')goTo(index+1)});
    setupProfile();
  }

  populateCountries();renderAttrs();updateWeight(70);updateHeight();selectClass(document.querySelector('.class-card.selected')||document.querySelector('.class-card'));bind();goTo(0);void loadProfile();
})();
