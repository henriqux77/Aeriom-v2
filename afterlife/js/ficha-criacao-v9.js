(() => {
  'use strict';
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.defer=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  load('./js/profile-global.js').then(()=>load('https://raw.githubusercontent.com/henriqux77/Aeriom-v2/d1c402af02bb9b3955c5f8974304ee5b10b7b1be/afterlife/js/ficha-criacao-v9.js')).catch(console.error);
})();
