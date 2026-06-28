(() => {
  'use strict';
  if (window.__nilColorSwatchesV2) return;
  window.__nilColorSwatchesV2 = true;

  const CDN = 'https://cdn.shopify.com/s/files/1/1005/2278/7104/files/';
  const DATA = [
    ['Ivory','color-renk-ivory-fildisi.png',['Fildisi','Fildişi']],
    ['White','color-renk-white-beyaz.png',['Beyaz']],
    ['Champagne','color-renk-champagne-sampanya.png',['Sampanya','Şampanya']],
    ['Off-White','color-renk-off-white-kirik-beyaz.png',['Off White','Kirik Beyaz','Kırık Beyaz']],
    ['Soft Ivory','color-renk-soft-ivory-yumusak-fildisi.png',['Yumusak Fildisi','Yumuşak Fildişi']],
    ['Burgundy','color-renk-burgundy-bordo.png',['Bordo']],
    ['Black','color-renk-black-siyah.png',['Siyah']],
    ['Emerald Green','color-renk-emerald-green-zumrut-yesili.png',['Emerald','Zumrut Yesili','Zümrüt Yeşili']],
    ['Teal Turquoise','color-renk-teal-turquoise-petrol-turkuaz.png',['Teal','Turquoise','Petrol Turkuaz']],
    ['Deep Purple','color-renk-deep-purple-koyu-mor.png',['Purple','Koyu Mor']],
    ['Silver Gray','color-renk-silver-gray-gumus-gri.png',['Silver Grey','Silver','Gumus Gri','Gümüş Gri']],
    ['Soft Champagne','color-renk-soft-champagne-yumusak-sampanya.png',['Soft-Champagne','Yumusak Sampanya','Yumuşak Şampanya']],
    ['Crimson Red','color-renk-crimson-red-kirmizi.png',['Crimson','Red','Kirmizi','Kırmızı']],
    ['Dusty Rose','color-renk-dusty-rose-gul-kurusu.png',['Gul Kurusu','Gül Kurusu']],
    ['Navy Blue','color-renk-navy-blue-lacivert.png',['Navy','Lacivert']],
    ['Gold Champagne','color-renk-gold-champagne-altin-sampanya.png',['Gold','Altin Sampanya','Altın Şampanya']],
    ['Royal Blue','color-renk-royal-blue-kraliyet-mavisi.png',['Royal','Kraliyet Mavisi']],
    ['Pearl Pink','color-renk-pearl-pink-inci-pembe.png',['Inci Pembe','İnci Pembe']],
    ['Sage Green','color-renk-sage-green-ada-cayi-yesili.png',['Sage','Ada Cayi Yesili','Ada Çayı Yeşili']],
    ['Mocha','color-renk-mocha-moka.png',['Moka']],
    ['Nude','color-renk-soft-ivory-yumusak-fildisi.png',['Soft Nude','Beige','Bej']],
    ['Blush Pink','color-renk-pearl-pink-inci-pembe.png',['Blush','Pudra Pembe']],
    ['Soft Gold','color-renk-gold-champagne-altin-sampanya.png',['Gold','Altın','Altin']]
  ];
  const map = new Map();
  function norm(v){return String(v||'').replace(/İ/g,'I').replace(/ı/g,'i').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function add(name,item){const k=norm(name); if(k) map.set(k,item);}
  DATA.forEach(([label,file,aliases])=>{const item={label,url:CDN+file}; [label,file.replace(/\.png.*/,''),...(aliases||[])].forEach(n=>{add(n,item);add('color '+n,item);add('renk '+n,item);});});
  const keys=[...map.keys()].sort((a,b)=>b.length-a.length);
  function lookup(v){let k=norm(v); if(!k) return null; if(map.has(k)) return map.get(k); k=k.replace(/^color-renk-/,'').replace(/^color-/,'').replace(/^renk-/,''); if(map.has(k)) return map.get(k); for(const a of keys){ if(k===a||k.includes('-'+a+'-')||k.startsWith(a+'-')||k.endsWith('-'+a)) return map.get(a);} return null;}
  function inputOf(el){return el?.matches?.('input')?el:el?.querySelector?.('input[type="radio"],input[type="checkbox"]')||(el?.htmlFor?document.getElementById(el.htmlFor):null);}
  function textOf(el){const i=inputOf(el), r=el.closest?.('.variant-option,fieldset,.product-form__input,[data-option-name]'), t=el.querySelector?.('.variant-option__button-label__text,.nil-v77-swatch-label,[data-option-value]'); return [el.dataset?.optionValue,el.getAttribute?.('data-option-value'),el.getAttribute?.('data-value'),el.getAttribute?.('aria-label'),el.getAttribute?.('title'),i?.value,i?.getAttribute?.('aria-label'),i?.dataset?.optionValue,t?.textContent,el.textContent,r?.getAttribute?.('data-option-value')].filter(Boolean).map(x=>String(x).replace(/ - sold out/i,'').trim()).filter(Boolean);}
  function isColor(el){const r=el.closest?.('.variant-option,fieldset,.product-form__input,[data-option-name]'); const txt=[r?.getAttribute?.('data-option-name'),r?.querySelector?.('legend')?.textContent,r?.querySelector?.('.form__label')?.textContent,r?.className].filter(Boolean).join(' '); const n=norm(txt); return n.includes('color')||n.includes('colour')||n.includes('renk')||r?.classList?.contains('nil-v77-option--color');}
  function find(el){for(const c of textOf(el)){const m=lookup(c); if(m) return m;} return isColor(el)?null:null;}
  function dot(el){let d=el.querySelector?.(':scope > .nil-color-swatch-dot'); if(!d){d=document.createElement('span'); d.className='nil-color-swatch-dot'; d.setAttribute('aria-hidden','true'); el.appendChild(d);} return d;}
  function decorate(el){if(!(el instanceof HTMLElement)) return; const sw=find(el); if(!sw) return; el.dataset.nilColorSwatchDecorated='true'; el.classList.add('nil-color-image-swatch'); el.style.setProperty('--nil-color-image',`url("${sw.url}")`); el.title=sw.label; if(!el.getAttribute('aria-label')) el.setAttribute('aria-label',sw.label); const r=el.closest('.variant-option,fieldset,.product-form__input'); if(r){r.classList.add('nil-color-swatch-root'); r.dataset.nilMobileOptionName='Color';} const s=el.querySelector('.swatch'); if(s){s.classList.remove('swatch--unavailable'); s.style.setProperty('--swatch-background',`url("${sw.url}")`); s.style.backgroundImage=`url("${sw.url}")`; s.style.backgroundSize='cover'; s.style.backgroundPosition='center';} dot(el);}
  function updateState(root=document){root.querySelectorAll?.('.nil-color-image-swatch').forEach(el=>{const i=inputOf(el); const sel=!!i?.checked||el.getAttribute('aria-checked')==='true'||el.getAttribute('aria-pressed')==='true'; const off=!!i?.disabled||i?.getAttribute('aria-disabled')==='true'||i?.dataset?.optionAvailable==='false'||el.getAttribute('aria-disabled')==='true'; el.classList.toggle('nil-swatch-selected',sel); el.classList.toggle('nil-swatch-unavailable',off);}); updateMobileButtons(root);}
  function decorateAll(root=document){const scope=root instanceof Element||root instanceof Document?root:document; scope.querySelectorAll?.('.variant-option__button-label,.product-form__input label,label[for],button[data-option-value],button[aria-pressed],[role="radio"]')?.forEach(decorate); updateState(scope); buildMobileDrawers(scope);}
  function optName(fs){const txt=[fs.dataset?.nilMobileOptionName,fs.querySelector?.('legend .nil-v77-legend-title')?.textContent,fs.querySelector?.('legend')?.textContent,fs.querySelector?.('label')?.textContent,fs.getAttribute?.('data-option-name'),fs.className].filter(Boolean).join(' '); const n=norm(txt); if(n.includes('color')||n.includes('renk')||fs.classList?.contains('nil-v77-option--color')) return 'Color'; if(n.includes('size')||n.includes('beden')||fs.classList?.contains('nil-v77-option--size')) return 'Size'; if(n.includes('veil')||n.includes('duvak')||n.includes('feature')||n.includes('ozellik')||fs.classList?.contains('nil-v77-option--veil')) return 'Dress Features'; return '';}
  function selectedText(fs){const c=fs.querySelector('input:checked'); if(c) return c.value||c.getAttribute('aria-label')||'Select'; const s=fs.querySelector('select'); if(s) return s.options[s.selectedIndex]?.textContent?.trim()||'Select'; return 'Select';}
  function buildMobileDrawers(root=document){document.querySelectorAll('variant-picker').forEach(vp=>{if(vp.dataset.nilMobileDrawerReady==='true') return; vp.dataset.nilMobileDrawerReady='true'; [...vp.querySelectorAll('fieldset.variant-option,.variant-option--dropdowns')].forEach((fs,idx)=>{const name=optName(fs); if(!name) return; fs.classList.add('nil-mobile-variant-source'); const btn=document.createElement('button'); btn.type='button'; btn.className='nil-mobile-variant-trigger'; btn.dataset.nilMobileIndex=String(idx); btn.innerHTML=`<span class="nil-mobile-variant-trigger__name">${name}</span><strong>${selectedText(fs)}</strong>`; fs.before(btn); btn.addEventListener('click',()=>openDrawer(fs,name,btn));});});}
  function openDrawer(fs,name,btn){closeDrawer(); const back=document.createElement('div'); back.className='nil-variant-drawer-backdrop is-open'; const sheet=document.createElement('div'); sheet.className='nil-variant-drawer-sheet'; sheet.innerHTML=`<div class="nil-variant-drawer-head"><strong>${name}</strong><button type="button" aria-label="Close">×</button></div><div class="nil-variant-drawer-list"></div>`; const list=sheet.querySelector('.nil-variant-drawer-list'); const labels=[...fs.querySelectorAll('label')]; const select=fs.querySelector('select'); if(select){[...select.options].forEach(o=>{const b=document.createElement('button'); b.type='button'; b.className='nil-variant-drawer-option'; b.textContent=o.textContent.trim(); if(o.selected)b.classList.add('is-selected'); b.onclick=()=>{select.value=o.value; o.selected=true; select.dispatchEvent(new Event('change',{bubbles:true})); closeDrawer();}; list.appendChild(b);});} else {labels.forEach(l=>{const i=inputOf(l); if(!i)return; const b=document.createElement('button'); b.type='button'; b.className='nil-variant-drawer-option'; b.innerHTML=l.innerHTML; b.querySelectorAll('input').forEach(x=>x.remove()); if(i.checked)b.classList.add('is-selected'); b.onclick=()=>{i.click(); i.dispatchEvent(new Event('change',{bubbles:true})); closeDrawer();}; list.appendChild(b);});} sheet.querySelector('button[aria-label="Close"]').onclick=closeDrawer; back.onclick=e=>{if(e.target===back)closeDrawer();}; back.appendChild(sheet); document.body.appendChild(back); document.body.classList.add('nil-variant-drawer-open');}
  function closeDrawer(){document.querySelectorAll('.nil-variant-drawer-backdrop').forEach(x=>x.remove()); document.body.classList.remove('nil-variant-drawer-open');}
  function updateMobileButtons(root=document){document.querySelectorAll('variant-picker').forEach(vp=>{[...vp.querySelectorAll('.nil-mobile-variant-source')].forEach(fs=>{const btn=fs.previousElementSibling?.classList?.contains('nil-mobile-variant-trigger')?fs.previousElementSibling:null; if(btn) btn.querySelector('strong').textContent=selectedText(fs);});});}
  let raf=0; function schedule(root=document){cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>decorateAll(root));}
  document.addEventListener('change',()=>setTimeout(()=>updateState(document),0),true); document.addEventListener('click',e=>{if(e.target.closest?.('.nil-color-image-swatch,variant-picker')) setTimeout(()=>updateState(document),0);},true);
  document.addEventListener('shopify:section:load',e=>schedule(e.target)); document.addEventListener('shopify:block:select',e=>schedule(e.target));
  const mo=new MutationObserver(()=>schedule(document)); function init(){decorateAll(document); mo.observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();