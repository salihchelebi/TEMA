// NIL COMMAND 26 START - filters, sorting labels, price slider, accessibility, WhatsApp, root redirect helper
(function(){
  const WA='905334619373';
  const labelMap={
    'stok durumu':'Availability','stok':'Availability','fiyat':'Price','style':'Style','stil':'Style','kumaş':'Fabric','kumas':'Fabric','yaka':'Neckline','kol':'Sleeves','kollar':'Sleeves','straps sleeves':'Straps / Sleeves','askılar':'Straps','askilar':'Straps','kuyruk':'Train','süsleme':'Embellishment','susleme':'Embellishment','renk':'Color','beden':'Size','tesettür':'Modesty','tesettur':'Modesty','özellikler':'Features','ozellikler':'Features','marka':'Brand','uzunluk':'Length','silüet':'Silhouette','siluet':'Silhouette','durum':'Occasion','trendler':'Trends'
  };
  const sortMap={'manual':'Featured','relevance':'Relevant','best-selling':'Best Seller','title-ascending':'A–Z','title-descending':'Z–A','price-ascending':'Price ↑','price-descending':'Price ↓','created-ascending':'Oldest','created-descending':'Newest'};
  function normalizeLabels(){
    document.querySelectorAll('.facets__label').forEach(el=>{
      const raw=(el.textContent||'').trim();
      const key=raw.toLocaleLowerCase('tr-TR');
      if(labelMap[key]) el.textContent=labelMap[key];
    });
    document.querySelectorAll('.facets-toggle__button').forEach(btn=>{
      if(!btn.getAttribute('aria-label')) btn.setAttribute('aria-label','Open bridal selection filters');
      btn.childNodes.forEach(n=>{ if(n.nodeType===3 && n.textContent.trim()) n.textContent=' Bridal Filters '; });
    });
    document.querySelectorAll('select[name="sort_by"] option').forEach(opt=>{ if(sortMap[opt.value]) opt.textContent=sortMap[opt.value]; });
    document.querySelectorAll('.sorting-filter__input').forEach(input=>{
      const label=input.closest('.sorting-filter__option')?.querySelector('.sorting-filter__label');
      if(label && sortMap[input.value]) label.textContent=sortMap[input.value];
    });
  }
  function makeImagesAccessible(){
    document.querySelectorAll('.nil-v4-card').forEach(card=>{
      const title=(card.querySelector('.nil-card-title-copy a')?.textContent||card.querySelector('[role="heading"]')?.textContent||'NIL Wedding Dress bridal gown').trim();
      card.querySelectorAll('img').forEach(img=>{
        img.loading=img.loading||'lazy';
        img.decoding='async';
        if(!img.alt || img.alt.trim()==='') img.alt=title;
      });
    });
    document.querySelectorAll('.nil-scc-thumb img').forEach(img=>{ img.loading='lazy'; img.decoding='async'; });
  }
  function measurementUnit(){
    document.addEventListener('change',e=>{
      if(!e.target.matches('.nil-v5-unit-toggle input')) return;
      const panel=e.target.closest('.nil-v4-measure');
      if(panel){
        panel.dataset.unit=e.target.value;
        panel.querySelectorAll('.nil-v4-measure__grid label').forEach(label=>{
          label.childNodes.forEach(node=>{ if(node.nodeType===3 && /\((cm|inch)\)/i.test(node.textContent)) node.textContent=node.textContent.replace(/\((cm|inch)\)/i,'('+e.target.value+')'); });
        });
      }
    });
  }
  function cookieBanner(){
    const banner=document.querySelector('.nil-cookie-banner');
    if(!banner) return;
    const key='nil_cookie_ok_v1';
    if(localStorage.getItem(key)!=='yes') banner.hidden=false;
    banner.querySelector('[data-nil-cookie-accept]')?.addEventListener('click',()=>{localStorage.setItem(key,'yes'); banner.hidden=true;});
  }
  function enrichWhatsAppLinks(){
    document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
    document.querySelectorAll('.nil-card-whatsapp').forEach(a=>{
      if(!/text=/.test(a.href)) return;
      a.setAttribute('aria-label', a.getAttribute('aria-label') || 'Ask about this wedding dress on WhatsApp');
    });
  }
  function activeFilterSummary(){
    document.querySelectorAll('.facets__form').forEach(form=>{
      let summary=form.querySelector('.nil-active-filter-summary');
      const guide=form.querySelector('.nil-v4-filter-guide');
      if(!guide) return;
      if(!summary){ summary=document.createElement('div'); summary.className='nil-active-filter-summary'; guide.insertAdjacentElement('afterend',summary); }
      summary.innerHTML='';
      form.querySelectorAll('input[type="checkbox"]:checked,input[type="radio"]:checked').forEach(input=>{
        const label=(input.getAttribute('data-label')||input.getAttribute('aria-label')||form.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent||'Selected').trim();
        if(label && !/cm|inch/i.test(label)){ const chip=document.createElement('span'); chip.textContent=label; summary.appendChild(chip); }
      });
    });
  }
  function buildPriceSliders(){ return; /* NIL V6 uses premium price ranges */
    document.querySelectorAll('.price-facet').forEach(facet=>{
      if(facet.querySelector('.nil-price-range-slider')) return;
      const inputs=[...facet.querySelectorAll('input.price-facet__input')];
      if(inputs.length<2) return;
      const minInput=inputs[0], maxInput=inputs[1];
      const parse=v=>Number(String(v||'').replace(/[^0-9.]/g,''))||0;
      const max=parse(maxInput.dataset.max||maxInput.placeholder||1900)||1900;
      const min=0;
      const wrap=document.createElement('div');
      wrap.className='nil-price-range-slider';
      const rMin=document.createElement('input'); rMin.type='range'; rMin.min=min; rMin.max=max; rMin.step='10'; rMin.value=parse(minInput.value)||min; rMin.setAttribute('aria-label','Minimum price');
      const rMax=document.createElement('input'); rMax.type='range'; rMax.min=min; rMax.max=max; rMax.step='10'; rMax.value=parse(maxInput.value)||max; rMax.setAttribute('aria-label','Maximum price');
      const values=document.createElement('div'); values.className='nil-price-range-slider__values';
      function sync(source){
        let lo=Number(rMin.value), hi=Number(rMax.value); if(lo>hi){ if(source===rMin) rMax.value=lo; else rMin.value=hi; lo=Number(rMin.value); hi=Number(rMax.value); }
        minInput.value=lo>0?lo:''; maxInput.value=hi<max?hi:''; values.innerHTML=`<span>$${lo}</span><span>$${hi}</span>`;
      }
      [rMin,rMax].forEach(r=>r.addEventListener('input',()=>sync(r)));
      [rMin,rMax].forEach(r=>r.addEventListener('change',()=>{sync(r); maxInput.dispatchEvent(new Event('change',{bubbles:true}));}));
      wrap.append(rMin,rMax,values); facet.prepend(wrap); sync();
    });
  }
  function noOverflowGuard(){ return; }
  function addWishlistButtons(){
    document.querySelectorAll('.nil-v4-card .product-grid__card').forEach(card=>{
      if(card.querySelector('.nil-wishlist-button')) return;
      const btn=document.createElement('a'); btn.className='nil-wishlist-button'; btn.href='#'; btn.setAttribute('aria-label','Save this wedding dress'); btn.setAttribute('aria-pressed','false'); btn.textContent='♡';
      btn.addEventListener('click',e=>{e.preventDefault(); const active=btn.getAttribute('aria-pressed')!=='true'; btn.setAttribute('aria-pressed',active?'true':'false'); btn.classList.toggle('is-active',active); btn.textContent=active?'♥':'♡';});
      card.appendChild(btn);
    });
  }
  function run(){ normalizeLabels(); makeImagesAccessible(); buildPriceSliders(); activeFilterSummary(); enrichWhatsAppLinks(); addWishlistButtons(); setTimeout(noOverflowGuard,400); }
  document.addEventListener('DOMContentLoaded',()=>{run(); measurementUnit(); cookieBanner();});
  document.addEventListener('change',e=>{ if(e.target.closest('.facets__form')) setTimeout(activeFilterSummary,50); });
  document.addEventListener('shopify:section:load',run);
})();
// NIL COMMAND 26 END

(function nil100SortChipFix(){
  document.addEventListener('change',function(e){
    const input=e.target.closest('.nil-sort-chipbar__input');
    if(!input) return;
    const url=new URL(window.location.href); url.searchParams.set('sort_by', input.value); window.location.href=url.toString();
  });
})();
