// NIL PERFECT 50 — behavior enhancements for premium bridal filtering and conversion
(function(){
  const WA='905334619373';
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const isProduct=()=>document.body.dataset.nilPage==='product'||document.body.classList.contains('nil-template-product');
  const isCollection=()=>document.body.dataset.nilPage==='collection'||document.body.classList.contains('nil-template-collection');
  const text=(el)=>String(el?.textContent||'').trim();
  const enc=(s)=>encodeURIComponent(String(s||''));

  function installProgress(){
    if($('.nil-scroll-progress')) return;
    const bar=document.createElement('div');bar.className='nil-scroll-progress';document.body.appendChild(bar);
    const top=document.createElement('a');top.href='#MainContent';top.className='nil-back-to-top';top.setAttribute('aria-label','Back to top');top.textContent='↑';document.body.appendChild(top);
    const update=()=>{const h=document.documentElement.scrollHeight-innerHeight;const p=h>0?Math.min(1,scrollY/h):0;bar.style.width=(p*100)+'%';top.classList.toggle('is-visible',scrollY>620);};
    addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
  }

  function collectionHeaderEnhance(){ return; }
  function filterSearch(form,q){
    q=String(q||'').toLowerCase().trim();let visible=0;
    $$('.facets__inputs-list-item',form).forEach(li=>{const ok=!q||text(li).toLowerCase().includes(q);li.classList.toggle('is-hidden-by-filter-search',!ok);if(ok)visible++;});
    const note=$('.nil-filter-empty-note',form); if(note) note.classList.toggle('is-visible',q&&visible===0);
  }
  function openFilterByKeyword(form,key){
    const candidates=$$('details.facets__panel',form);
    const found=candidates.find(d=>text($('summary',d)).toLowerCase().includes(key));
    if(found){found.open=true;found.scrollIntoView({behavior:'smooth',block:'center'});}
  }
  function updateFilterCounts(){
    $$('.facets__form').forEach(form=>{const n=$$('input[type="checkbox"]:checked,input[type="radio"]:checked',form).filter(i=>!/(cm|inch)/i.test(i.value)).length;const c=$('[data-count]',form);if(c)c.textContent=n+' selected';});
  }
  function normalizeSortNames(){
    const map={'manual':'Featured','relevance':'Relevant','best-selling':'Best Seller','title-ascending':'A–Z','title-descending':'Z–A','price-ascending':'Price ↑','price-descending':'Price ↓','created-ascending':'Oldest','created-descending':'Newest'};
    $$('option[value],.sorting-filter__input').forEach(el=>{const v=el.value;if(!map[v])return;if(el.tagName==='OPTION')el.textContent=map[v];else{const lab=el.closest('.sorting-filter__option')?.querySelector('.sorting-filter__label');if(lab)lab.textContent=map[v];}});
  }

  function enhanceCards(){
    $$('.nil-v4-card').forEach(card=>{
      const title=(card.dataset.nilProductTitle||text($('.nil-card-title-copy a',card))||text(card)).trim();
      const url=card.dataset.nilProductUrl||$('.product-card__link',card)?.href||$('.nil-card-title-copy a',card)?.href||location.href;
      const inner=$('.product-grid__card',card); if(!inner) return;
      if(!$('.nil-card-microtags',inner)){
        const tags=[]; const lower=title.toLowerCase();
        if(/princess|ball/.test(lower)) tags.push('Princess'); if(/mermaid|trumpet/.test(lower)) tags.push('Mermaid'); if(/modest|hijab/.test(lower)) tags.push('Modest'); if(/lace/.test(lower)) tags.push('Lace'); if(/long.?sleeve/.test(lower)) tags.push('Long sleeve'); if(/sweetheart/.test(lower)) tags.push('Sweetheart'); if(/ivory/.test(lower)) tags.push('Ivory');
        const wrap=document.createElement('div');wrap.className='nil-card-microtags';wrap.innerHTML=(tags.slice(0,4).length?tags.slice(0,4):['Couture','Custom','Bridal']).map(t=>`<span>${t}</span>`).join('');
        $('.nil-card-title-copy',inner)?.appendChild(wrap);
      }
      if(!$('.nil-card-proof',inner)){
        const proof=document.createElement('div');proof.className='nil-card-proof';proof.innerHTML='<span>Custom size</span><span>6–8 weeks</span><span>Stylist help</span>';
        $('.nil-v4-card-extra',inner)?.appendChild(proof);
      }
      if(!$('.nil-card-stock-dot',inner)){const stock=document.createElement('span');stock.className='nil-card-stock-dot';stock.textContent='Made to order';inner.appendChild(stock);}
      const wa=$('.nil-card-whatsapp',inner); if(wa){wa.href=`https://wa.me/${WA}?text=${enc('Hello, I want information about this NIL Wedding Dress model: '+title+' '+url)}`;wa.target='_blank';wa.rel='noopener noreferrer';}
      $$('img',card).forEach(img=>{img.loading='lazy';img.decoding='async';if(!img.alt)img.alt=title+' luxury wedding dress';});
      $('.product-card__link',card)?.addEventListener('click',()=>storeViewed(title,url,card.dataset.nilProductPrice));
      $('.nil-card-title-copy a',card)?.addEventListener('click',()=>storeViewed(title,url,card.dataset.nilProductPrice));
    });
  }
  function storeViewed(title,url,price){try{let arr=JSON.parse(localStorage.getItem('nil_recently_viewed')||'[]');arr=arr.filter(x=>x.url!==url);arr.unshift({title,url,price,ts:Date.now()});localStorage.setItem('nil_recently_viewed',JSON.stringify(arr.slice(0,6)));}catch(e){}}

  function productPageEnhance(){
    if(!isProduct()) return;
    const title=text($('h1'))||document.title.replace(/–.*$/,'').trim();
    const price=text($('[class*="price"]'))||'';
    const info=$('.product-information__details')||$('.product-information')||$('#MainContent');
    if(info&&!$('.nil-v6-product-command',info)) info.insertAdjacentHTML('afterbegin',`<div class="nil-v6-product-command"><b>Private bridal consultation</b><span>${title} için özel ölçü, kumaş, renk ve teslimat desteği WhatsApp üzerinden netleştirilebilir.</span></div>`);
    // Product FAQ is now rendered as an editor-managed block in product.json; do not inject hardcoded FAQ here.
    createMobileCTA(title);
    measurementValidation();
    setDateMin();
    renderRecentlyViewed();
    storeViewed(title,location.href,price);
  }
  function createMobileCTA(title){
    if($('.nil-mobile-sticky-cta')) return;
    const bar=document.createElement('div');bar.className='nil-mobile-sticky-cta';
    bar.innerHTML=`<a href="https://wa.me/${WA}?text=${enc('Hello, I want information about '+title+' '+location.href)}" target="_blank" rel="noopener noreferrer">WhatsApp</a><button type="button">Add to cart</button>`;
    bar.querySelector('button').addEventListener('click',()=>{const btn=$('button[name="add"], product-form button[type="submit"], form[action*="/cart/add"] button[type="submit"]'); if(btn) btn.click(); else location.hash='MainContent';});
    document.body.appendChild(bar);
  }
  function measurementValidation(){
    $$('.nil-v4-measure input, input[name*="properties"]').forEach(inp=>{
      const label=(inp.name||inp.id||inp.placeholder||'').toLowerCase();
      if(/date/.test(label)) return;
      if(/bust|waist|hips|height|shoulder|arm|length|heel|cm|inch/.test(label)){
        inp.inputMode='decimal';
        inp.addEventListener('blur',()=>{const v=parseFloat(String(inp.value).replace(',','.'));const bad=inp.value && (!isFinite(v)||v<0||v>260);inp.classList.toggle('is-invalid',bad);let err=inp.nextElementSibling?.classList?.contains('nil-form-error')?inp.nextElementSibling:null;if(bad&&!err){err=document.createElement('div');err.className='nil-form-error';err.textContent='Please enter a realistic measurement.';inp.insertAdjacentElement('afterend',err);} if(!bad&&err)err.remove();});
      }
    });
  }
  function setDateMin(){const today=new Date().toISOString().slice(0,10);$$('input[type="date"], input[name*="Wedding"], input[placeholder*="mm/dd"]').forEach(i=>{try{i.type='date';i.min=today;}catch(e){}});}
  function renderRecentlyViewed(){
    if($('.nil-recently-viewed')) return;
    let arr=[];try{arr=JSON.parse(localStorage.getItem('nil_recently_viewed')||'[]').filter(x=>x.url&&x.url!==location.href).slice(0,4);}catch(e){}
    if(!arr.length) return;
    const box=document.createElement('section');box.className='nil-recently-viewed';box.innerHTML='<h2>Recently viewed</h2><div class="nil-recently-viewed__rail">'+arr.map(x=>`<a href="${x.url}">${x.title}<span>${x.price||'Custom bridal gown'}</span></a>`).join('')+'</div>';
    $('#MainContent')?.appendChild(box);
  }

  function cartEnhance(){
    if(!/cart/.test(location.pathname)&&!document.body.classList.contains('nil-template-cart')) return;
    const sum=$('.cart-page__summary, .cart__summary, cart-summary');
    if(sum&&!$('.nil-cart-checklist',sum)) sum.insertAdjacentHTML('afterbegin','<div class="nil-cart-checklist"><span>Confirm size and wedding date before checkout</span><span>Use WhatsApp for customization support</span><span>Production and delivery timing will be confirmed</span></div>');
  }
  function emptyStateUpgrade(){
    const grid=$('.product-grid'); if(!grid) return;
    const items=$$('.product-grid__item',grid).length;
    if(items===0 && !$('.nil-empty-upgrade')) grid.insertAdjacentHTML('afterend','<div class="nil-empty-upgrade"><h2>No dresses matched these filters</h2><p>Try removing one filter or ask our bridal stylist for a private recommendation.</p><a href="/collections">Clear filters</a></div>');
  }
  function drawerEscClose(){
    document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;$$('dialog[open],details[open].facets__panel').forEach(el=>{if(el.tagName==='DIALOG')el.close();else el.open=false;});});
  }
  function loadingFeedback(){
    document.addEventListener('change',e=>{if(e.target.closest('.facets__form,.sorting-filter')){const grid=$('.product-grid');grid?.classList.add('nil-load-skeleton');setTimeout(()=>grid?.classList.remove('nil-load-skeleton'),900);}});
  }
  function safeZoneAudit(){ return; }


  function nil100Hardening(){
    // Remove old duplicate collection quick tabs if cached script/theme settings still output them.
    $$('.nil-collection-quick-tabs').forEach(el=>el.remove());

    // Enforce concise sort labels and remove old dropdown panels if any remain from cache.
    const sortMap={'manual':'Featured','relevance':'Relevant','best-selling':'Best Seller','title-ascending':'A–Z','title-descending':'Z–A','price-ascending':'Price ↑','price-descending':'Price ↓','created-ascending':'Oldest','created-descending':'Newest'};
    $$('select[name="sort_by"] option,.sorting-filter__input,.nil-sort-chipbar__input').forEach(el=>{
      const v=el.value;
      if(!sortMap[v]) return;
      if(el.tagName==='OPTION') el.textContent=sortMap[v];
      const label=el.closest('.sorting-filter__option')?.querySelector('.sorting-filter__label') || document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if(label) label.textContent=sortMap[v];
    });

    // Add alt text to product page images for accessibility and Shopify media consistency.
    if(isProduct()){
      const title=text($('h1'))||'NIL Wedding Dress bridal gown';
      $$('img').forEach((img,i)=>{
        if(!img.alt || !img.alt.trim()) img.alt = i===0 ? `${title} front view` : `${title} detail view ${i+1}`;
        img.loading = img.loading || 'lazy';
        img.decoding = 'async';
      });
    }
  }


  function nilFinalUxHardening(){
    document.querySelectorAll('img').forEach(img=>{ if(!img.alt || !img.alt.trim()){ const card=img.closest('.product-card,.nil-v4-card,[class*="product"],a'); const txt=(card?.textContent||document.title||'NIL Wedding Dress').trim().replace(/\s+/g,' ').slice(0,140); img.alt=txt||'NIL Wedding Dress'; } img.loading=img.loading||'lazy'; img.decoding='async'; });
    document.querySelectorAll('.nil-wishlist-button').forEach(btn=>{ btn.setAttribute('role','button'); if(!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed','false'); if(!btn.getAttribute('aria-label')) btn.setAttribute('aria-label','Save this wedding dress'); btn.addEventListener('click',()=>{ const on=btn.getAttribute('aria-pressed')==='true'; btn.setAttribute('aria-pressed', String(!on)); }, {passive:true}); });
    document.querySelectorAll('button, a').forEach(el=>{ const cls=el.className||''; if(/remove|delete|trash/i.test(cls) && !el.getAttribute('aria-label')) el.setAttribute('aria-label','Remove from cart'); });
    const banner=document.querySelector('.nil-cookie-banner'); if(banner){ const key='nil_cookie_ok_v1'; if(localStorage.getItem(key)==='yes') banner.hidden=true; banner.querySelector('[data-nil-cookie-accept],button')?.addEventListener('click',()=>{localStorage.setItem(key,'yes'); banner.hidden=true; banner.classList.add('is-hidden');}); }
    if(isProduct()) createMobileCTA((document.querySelector('h1')?.textContent||document.title).trim());
  }

  function run(){installProgress();/* NIL V6 premium controls own filters */normalizeSortNames();enhanceCards();productPageEnhance();cartEnhance();emptyStateUpgrade();safeZoneAudit();nil100Hardening();nilFinalUxHardening();}
  document.addEventListener('DOMContentLoaded',()=>{run();drawerEscClose();loadingFeedback();});
  document.addEventListener('change',e=>{if(e.target.closest('.facets__form')) setTimeout(()=>{updateFilterCounts();enhanceCards();emptyStateUpgrade();},80);});
  document.addEventListener('shopify:section:load',run);
  window.addEventListener('resize',()=>setTimeout(safeZoneAudit,150));
})();
