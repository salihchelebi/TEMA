(function(){
  function ready(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn)}
  const KEY='nilLangSuggestionChoiceV2';
  const arabic=['SA','AE','QA','KW','BH','OM','JO','LB','IQ','SY','PS','YE','EG','LY','TN','DZ','MA','SD','MR','SO','DJ','KM'];
  function cookie(name){return document.cookie.split('; ').find(row=>row.startsWith(name+'='))?.split('=')[1]||'';}
  function remember(value){
    try{localStorage.setItem(KEY,value||'dismissed');}catch(e){}
    document.cookie=KEY+'='+encodeURIComponent(value||'dismissed')+'; path=/; max-age=31536000; SameSite=Lax';
  }
  function remembered(){try{if(localStorage.getItem(KEY))return true;}catch(e){} return !!cookie(KEY);}
  function target(country,langs){
    country=(country||'').toUpperCase();
    const langStr=(langs||[]).join(',').toLowerCase();
    const tz=(Intl.DateTimeFormat().resolvedOptions().timeZone||'').toLowerCase();
    if(country==='TR'||country==='AZ'||langStr.includes('tr')||tz.includes('istanbul')||tz.includes('baku'))return'tr';
    if(country==='FR'||langStr.includes('fr')||tz.includes('paris'))return'fr';
    if(country==='NL'||langStr.includes('nl')||tz.includes('amsterdam'))return'nl';
    if(arabic.includes(country)||langStr.includes('ar')||/riyadh|dubai|qatar|kuwait|bahrain|muscat|amman|beirut|baghdad|damascus|gaza|aden|cairo|tripoli|tunis|algiers|casablanca|khartoum/.test(tz))return'ar';
    return'en';
  }
  const copy={tr:['Türkçe önerisi','Bölgeniz için Türkçe mağaza deneyimini açabilirsiniz.','Türkçeye geç'],fr:['Suggestion français','Vous pouvez afficher la boutique en français.','Passer au français'],nl:['Nederlandse taalsuggestie','U kunt de winkel in het Nederlands bekijken.','Nederlands kiezen'],ar:['اقتراح اللغة العربية','يمكنك عرض المتجر باللغة العربية.','التبديل إلى العربية'],en:['English suggestion','English is recommended for your region.','Use English']};
  ready(()=>{
    const box=document.querySelector('[data-nil-language-suggestion]');
    if(!box||remembered())return;
    const current=(box.dataset.currentLanguage||document.documentElement.lang||'').toLowerCase().slice(0,2);
    const lang=target(box.dataset.country,navigator.languages||[navigator.language]);
    if(!lang||lang===current){remember('current:'+current);return;}
    const c=copy[lang]||copy.en;
    box.querySelector('[data-nil-lang-title]').textContent=c[0];
    box.querySelector('[data-nil-lang-copy]').textContent=c[1];
    box.querySelector('[data-nil-lang-accept]').textContent=c[2];
    box.querySelector('[data-nil-language-code]').value=lang;
    const form=box.querySelector('form');
    if(form)form.addEventListener('submit',()=>remember('accepted:'+lang),{once:true});
    box.classList.add('is-visible');
    box.querySelector('[data-nil-lang-dismiss]')?.addEventListener('click',()=>{remember('dismissed:'+lang);box.classList.remove('is-visible')},{once:true});
  });
})();
