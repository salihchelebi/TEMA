/* NIL ISTANBUL PERFECT THEME — UX helpers + smart product navigation V3 */
(function(){
  function hardenExternalLinks(){document.querySelectorAll('a[target="_blank"]').forEach(function(a){var rel=(a.getAttribute('rel')||'').split(/\s+/);['noopener','noreferrer'].forEach(function(x){if(rel.indexOf(x)<0)rel.push(x)});a.setAttribute('rel',rel.join(' ').trim())})}
  function optimizeImages(){document.querySelectorAll('img').forEach(function(img){if(!img.hasAttribute('loading'))img.setAttribute('loading','lazy');if(!img.hasAttribute('decoding'))img.setAttribute('decoding','async');if(!img.getAttribute('alt'))img.setAttribute('alt',document.title||'NIL Wedding Dress')})}
  function protectOverflow(){document.documentElement.style.overflowX='hidden';document.body.style.overflowX='hidden'}

  function nilSmartProductNavigation(){
    var path=location.pathname.replace(/\/$/,'');
    var match=path.match(/\/products\/([^/?#]+)/);
    var isProduct=!!match;
    var currentHandle=isProduct?decodeURIComponent(match[1]):'';
    var family=/^g21-\d+/i.test(currentHandle)?'g21':(/nil-ns|engagement|nisan|nişan/i.test(currentHandle+' '+document.title)?'ns':'all');
    var collection={g21:{title:'Wedding Dresses',url:'/collections/wedding-dresses'},ns:{title:'Engagement Dresses',url:'/collections/engagement-dresses'},all:{title:'All Dresses',url:'/collections/all'}}[family];
    var state={resolved:false,loading:false,prev:null,next:null};

    function injectStyle(){
      if(document.getElementById('nil-smart-nav-v3-style'))return;
      var s=document.createElement('style');
      s.id='nil-smart-nav-v3-style';
      s.textContent='.nil-product-editable-top__collection{min-height:54px;display:flex!important;flex-direction:column;align-items:center;justify-content:center;padding:8px 18px;border:1px solid rgba(184,132,57,.35);border-radius:12px;background:linear-gradient(135deg,rgba(255,250,241,.92),rgba(255,255,255,.72));text-decoration:none!important;color:#2a241c!important;text-align:center;box-shadow:0 8px 18px rgba(89,60,24,.06)}.nil-product-editable-top__collection span{font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#9b6a2d}.nil-product-editable-top__collection strong{font-size:13px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.nil-product-editable-top__nav{grid-template-columns:minmax(180px,290px) minmax(180px,1fr) minmax(180px,290px)!important}.nil-product-editable-top__divider{display:none!important}.nil-product-editable-top__nav-btn.is-disabled,.nil-product-editable-top__nav-btn.is-resolving{opacity:.48!important;filter:grayscale(1)!important}.nil-product-editable-top__nav-btn.is-resolving strong:after{content:" • Loading";font-size:10px;letter-spacing:.04em}@media(max-width:749px){.nil-product-editable-top__nav{grid-template-columns:1fr 1fr!important}.nil-product-editable-top__collection{grid-column:1/-1;order:-1;min-height:48px}.nil-product-editable-top__collection strong{font-size:12px}}';
      document.head.appendChild(s);
    }
    function badHref(h){h=String(h||'');return !h||h==='#'||h.indexOf('/search?q=G21-')>=0||h.indexOf('/search?')>=0||h.indexOf('G21-000')>=0;}
    function btns(){return Array.prototype.slice.call(document.querySelectorAll('[data-nil-prev-product],[data-nil-next-product],.nil-product-editable-top__nav-btn--prev,.nil-product-editable-top__nav-btn--next'));}
    function sanitize(){
      injectStyle();
      btns().forEach(function(btn){
        if(badHref(btn.getAttribute('href'))){btn.setAttribute('href','#');btn.classList.add('is-resolving');btn.setAttribute('aria-disabled','true');btn.dataset.resolved='false'}
      });
      document.querySelectorAll('.nil-product-editable-top__nav').forEach(function(nav){
        var center=nav.querySelector('.nil-product-editable-top__collection');
        if(!center){center=document.createElement('a');center.className='nil-product-editable-top__collection';var divider=nav.querySelector('.nil-product-editable-top__divider');if(divider)divider.replaceWith(center);else nav.insertBefore(center,nav.children[1]||null)}
        center.href=collection.url;center.innerHTML='<span>Collection</span><strong>'+collection.title+'</strong>';
      });
    }
    function setButton(sel,p){
      document.querySelectorAll(sel).forEach(function(btn){
        btn.classList.remove('is-resolving');
        if(p&&p.handle){btn.href='/products/'+p.handle;btn.classList.remove('is-disabled');btn.removeAttribute('aria-disabled');btn.dataset.resolved='true'}
        else{btn.href='#';btn.classList.add('is-disabled');btn.setAttribute('aria-disabled','true');btn.dataset.resolved='false'}
      });
    }
    function numberOf(h){var m=String(h||'').match(/(?:g21|nil-ns)[-\s]?(\d+)/i);return m?parseInt(m[1],10):999999;}
    function good(p){if(!p||!p.handle)return false;if(family==='g21')return /^g21-\d+/i.test(p.handle);if(family==='ns')return /nil-ns|engagement|nisan|nişan/i.test(p.handle+' '+(p.title||''));return true;}
    function cacheKey(){return 'nilSmartNavV3:'+family;}
    function readCache(){try{var raw=sessionStorage.getItem(cacheKey());if(!raw)return null;var obj=JSON.parse(raw);if(!obj||Date.now()-obj.t>300000)return null;return obj.items||null}catch(e){return null}}
    function writeCache(items){try{sessionStorage.setItem(cacheKey(),JSON.stringify({t:Date.now(),items:items}))}catch(e){}}
    async function fetchAll(){
      var c=readCache();if(c&&c.length)return c;
      var out=[];
      for(var page=1;page<=10;page++){
        var r=await fetch('/collections/all/products.json?limit=250&page='+page,{credentials:'same-origin',cache:'force-cache'});
        if(!r.ok)break;
        var data=await r.json();var arr=(data&&data.products)||[];out=out.concat(arr);if(arr.length<250)break;
      }
      out=out.filter(good).sort(function(a,b){return numberOf(a.handle)-numberOf(b.handle)}).map(function(p){return{handle:p.handle,title:p.title}});
      writeCache(out);return out;
    }
    function resolve(){
      if(!isProduct||state.loading)return;
      state.loading=true;sanitize();
      fetchAll().then(function(list){
        var i=list.findIndex(function(p){return p.handle===currentHandle});
        state.prev=i>0?list[i-1]:null;state.next=i>=0?list[i+1]:null;state.resolved=true;
        setButton('[data-nil-prev-product],.nil-product-editable-top__nav-btn--prev',state.prev);
        setButton('[data-nil-next-product],.nil-product-editable-top__nav-btn--next',state.next);
      }).catch(function(){state.resolved=true;setButton('[data-nil-prev-product],.nil-product-editable-top__nav-btn--prev',null);setButton('[data-nil-next-product],.nil-product-editable-top__nav-btn--next',null)});
    }
    function clickBlocker(e){
      var btn=e.target.closest&&e.target.closest('[data-nil-prev-product],[data-nil-next-product],.nil-product-editable-top__nav-btn--prev,.nil-product-editable-top__nav-btn--next');
      if(!btn)return;
      var href=btn.getAttribute('href')||'';
      if(btn.dataset.resolved!=='true'||badHref(href)||btn.classList.contains('is-disabled')||btn.classList.contains('is-resolving')){
        e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();sanitize();resolve();return false;
      }
    }
    ['click','auxclick'].forEach(function(ev){document.addEventListener(ev,clickBlocker,true)});
    document.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;clickBlocker(e)},true);
    sanitize();resolve();setTimeout(sanitize,100);setTimeout(resolve,500);setTimeout(resolve,1400);document.addEventListener('shopify:section:load',function(){sanitize();resolve()});
  }

  function init(){hardenExternalLinks();optimizeImages();protectOverflow();nilSmartProductNavigation()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();document.addEventListener('shopify:section:load',init);
})();
