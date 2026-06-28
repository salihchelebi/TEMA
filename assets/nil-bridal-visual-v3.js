// NIL LUXURY VISUAL V3 START
(function(){
  const WA='905334619373';
  const waBase='https://wa.me/'+WA;
  function msg(text){ return waBase+'?text='+encodeURIComponent(text); }
  function ensureHeaderCTA(){
    if(document.querySelector('.nil-header-wa')) return;
    const header=document.querySelector('header-component, #header-component, header');
    if(!header) return;
    const a=document.createElement('a');
    a.className='nil-header-wa';
    a.href=msg('Hello, I would like a WhatsApp consultation for NIL Wedding Dress.');
    a.target='_blank'; a.rel='noopener';
    a.innerHTML='☏ WhatsApp Consultation';
    const target=header.querySelector('.header__actions, nav, .header__row') || header;
    target.appendChild(a);
  }
  function wireTracking(){
    document.addEventListener('click',function(e){
      const a=e.target.closest('a'); if(!a) return;
      if(a.href && a.href.includes('wa.me')) {
        window.dataLayer=window.dataLayer||[];
        window.dataLayer.push({event:'nil_whatsapp_click', link_text:(a.textContent||'').trim(), page_type:document.body.dataset.nilPage||''});
      }
      if(a.classList.contains('nil-card-whatsapp')){
        window.dataLayer=window.dataLayer||[];
        window.dataLayer.push({event:'nil_product_card_inquiry'});
      }
    });
  }
  document.addEventListener('DOMContentLoaded',function(){ ensureHeaderCTA(); wireTracking(); });
})();
// NIL LUXURY VISUAL V3 END
