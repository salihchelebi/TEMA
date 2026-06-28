// NIL LUXURY V4 START — visible CTA, mobile helpers and tracking
(function(){
  const WA='905334619373';
  const waBase='https://wa.me/'+WA;
  const encode=(s)=>encodeURIComponent(s);
  function wa(text){return waBase+'?text='+encode(text);}
  function ensureHeaderCTA(){
    if(document.querySelector('.nil-header-wa')) return;
    const header=document.querySelector('header-component,#header-component,header');
    if(!header) return;
    const a=document.createElement('a');
    a.className='nil-header-wa';
    a.href=wa('Hello, I would like a WhatsApp consultation for NIL Wedding Dress.');
    a.target='_blank'; a.rel='noopener';
    a.textContent='☏ WhatsApp Consultation';
    const target=header.querySelector('.header__actions,.header-actions,nav,.header__row') || header;
    target.appendChild(a);
  }
  function markLoaded(){document.documentElement.classList.add('nil-v4-loaded');}
  function wireMeasurement(){
    document.addEventListener('input',function(e){
      if(e.target.closest('.nil-v4-measure__grid')){
        e.target.toggleAttribute('data-filled', !!e.target.value.trim());
      }
    });
  }
  function track(){
    document.addEventListener('click',function(e){
      const a=e.target.closest('a'); if(!a) return;
      window.dataLayer=window.dataLayer||[];
      if(a.href && a.href.includes('wa.me')) window.dataLayer.push({event:'nil_whatsapp_click_v4',text:(a.textContent||'').trim(),page:document.body.dataset.nilPage||''});
      if(a.classList.contains('nil-card-whatsapp')) window.dataLayer.push({event:'nil_product_card_whatsapp_v4'});
      if(a.classList.contains('nil-v4-custom')) window.dataLayer.push({event:'nil_custom_order_click_v4'});
    });
  }
  document.addEventListener('DOMContentLoaded',function(){markLoaded();ensureHeaderCTA();wireMeasurement();track();});
})();
// NIL LUXURY V4 END
