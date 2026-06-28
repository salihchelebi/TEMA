window.NIL_FILTER_TAXONOMY = window.NIL_FILTER_TAXONOMY || {
  priceRanges: [
    { label: 'Under $1,000', min: 0, max: 1000 },
    { label: '$1,000 – $1,250', min: 1000, max: 1250 },
    { label: '$1,250 – $1,500', min: 1250, max: 1500 },
    { label: '$1,500 – $2,000', min: 1500, max: 2000 },
    { label: '$2,000 – $2,500', min: 2000, max: 2500 },
    { label: '$2,500+', min: 2500, max: 999999 }
  ],
  groups: [],
  mostUsedTags: []
};
(function(){
  if (window.__G21_COLLECTION_VIDEO_PREVIEW_FORCE_LOADER_V12__) return;
  window.__G21_COLLECTION_VIDEO_PREVIEW_FORCE_LOADER_V12__ = true;
  function load(){
    if (document.getElementById('g21-video-autodetect-force-v12-loader')) return;
    var current = document.currentScript || document.getElementById('nil-filter-taxonomy-script');
    var src = current && current.src ? current.src.replace(/nil-filter-taxonomy\.js.*$/, 'g21-video-autodetect-force-v12.js?v=g21-force-v12-20260622') : '';
    if (!src) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.id = 'g21-video-autodetect-force-v12-loader';
    document.head.appendChild(script);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true }); else load();
})();
