/* GELINLIK21 ayrinti-closer-zoom.js V6
   Closer Look:
   - click starts instantly at 1.25x
   - linear/natural zoom 1.25x -> 2x
   - first 50%: left pan + bottom-to-top pan + left tilt
   - second 50%: right pan + top-to-bottom pan + right tilt
   - contrast coefficient increased by 25%
   - temperature/warmth reduced 75%+ by lowering saturation, brightness and light overlays
*/
(function(){
  'use strict';
  if(window.__G21_CLOSER_ZOOM_V6__) return;
  window.__G21_CLOSER_ZOOM_V6__ = true;

  var MIN = 1.25;
  var MAX = 2.0;
  var RANGE = MAX - MIN;
  var resetTimers = [];

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function shellOf(video){ return video && video.closest ? video.closest('.ayrinti-gallery__video-shell') : null; }
  function isCloser(video){ var sh = shellOf(video); return !!(sh && sh.classList.contains('effect-closer')); }
  function progress(video){
    var d = Number(video.duration || 0);
    var t = Number(video.currentTime || 0);
    if(!isFinite(d) || d <= 0 || !isFinite(t)) return 0;
    return clamp(t / d, 0, 1);
  }
  function loopIndex(video){
    var n = Number(video.dataset.loops || video.dataset.ayCloserLoop || 0);
    if(!isFinite(n) || n < 0) n = 0;
    return Math.floor(n);
  }
  function direction(video){ return loopIndex(video) % 2 === 0 ? 'in' : 'out'; }
  function zoomProgress(video){
    var p = progress(video);
    return direction(video) === 'in' ? p : (1 - p);
  }
  function scaleFor(video){ return MIN + RANGE * zoomProgress(video); }
  function linearZoomRatio(video){ return clamp((scaleFor(video) - MIN) / RANGE, 0, 1); }
  function panTiltFor(video){
    var p = progress(video);
    if(p <= 0.5){
      var a = p / 0.5;
      return {
        x: -5.8 * a,
        y: 2.6 + (-5.0 * a),
        tilt: -0.62 * a
      };
    }
    var b = (p - 0.5) / 0.5;
    return {
      x: -5.8 + (11.6 * b),
      y: -2.4 + (5.0 * b),
      tilt: -0.62 + (1.24 * b)
    };
  }
  function effectsFor(video){
    var q = linearZoomRatio(video);
    var sharpPower = 1 + (9 * q);
    var gain = sharpPower - 1;
    return {
      power: sharpPower,
      contrast: 1 + (0.15625 * gain),
      saturate: 1 + (0.01125 * gain),
      brightness: 1 + (0.002 * gain),
      clarityOpacity: 0.00 + (0.075 * q),
      clarityLight: 0.00 + (0.035 * q),
      clarityDark: 0.00 + (0.030 * q),
      acutanceSize: 0.00 + (0.72 * q),
      acutanceAlpha: 0.00 + (0.28 * q),
      edgeOpacity: 0.00 + (0.060 * q),
      edgeLight: 0.00 + (0.030 * q),
      edgeDark: 0.00 + (0.0275 * q)
    };
  }
  function clearVars(sh){
    ['--ay-closer-scale','--ay-closer-pan-x','--ay-closer-pan-y','--ay-closer-tilt','--ay-closer-contrast','--ay-closer-saturate','--ay-closer-brightness','--ay-closer-clarity-opacity','--ay-closer-clarity-light','--ay-closer-clarity-dark','--ay-closer-acutance-size','--ay-closer-acutance-alpha','--ay-closer-edge-opacity','--ay-closer-edge-light','--ay-closer-edge-dark'].forEach(function(v){sh.style.removeProperty(v)});
    sh.removeAttribute('data-closer-dir');
  }
  function apply(video){
    var sh = shellOf(video);
    if(!sh) return;
    if(!isCloser(video)){
      clearVars(sh);
      video.dataset.ayCloserStarted = 'false';
      return;
    }
    var z = clamp(scaleFor(video), MIN, MAX);
    var motion = panTiltFor(video);
    var fx = effectsFor(video);
    sh.dataset.closerDir = direction(video);
    sh.style.setProperty('--ay-closer-scale', z.toFixed(4));
    sh.style.setProperty('--ay-closer-pan-x', motion.x.toFixed(3) + '%');
    sh.style.setProperty('--ay-closer-pan-y', motion.y.toFixed(3) + '%');
    sh.style.setProperty('--ay-closer-tilt', motion.tilt.toFixed(3) + 'deg');
    sh.style.setProperty('--ay-closer-contrast', fx.contrast.toFixed(4));
    sh.style.setProperty('--ay-closer-saturate', fx.saturate.toFixed(4));
    sh.style.setProperty('--ay-closer-brightness', fx.brightness.toFixed(4));
    sh.style.setProperty('--ay-closer-clarity-opacity', fx.clarityOpacity.toFixed(4));
    sh.style.setProperty('--ay-closer-clarity-light', fx.clarityLight.toFixed(4));
    sh.style.setProperty('--ay-closer-clarity-dark', fx.clarityDark.toFixed(4));
    sh.style.setProperty('--ay-closer-acutance-size', fx.acutanceSize.toFixed(3) + 'px');
    sh.style.setProperty('--ay-closer-acutance-alpha', fx.acutanceAlpha.toFixed(4));
    sh.style.setProperty('--ay-closer-edge-opacity', fx.edgeOpacity.toFixed(4));
    sh.style.setProperty('--ay-closer-edge-light', fx.edgeLight.toFixed(4));
    sh.style.setProperty('--ay-closer-edge-dark', fx.edgeDark.toFixed(4));
    video.dataset.ayCloserZoom = z.toFixed(4);
    video.dataset.ayCloserSharpPower = fx.power.toFixed(4);
  }
  function resetToStart(video){
    if(!video || !isCloser(video)) return;
    try{ video.currentTime = 0; }catch(e){}
    video.dataset.loops = '0';
    video.dataset.ayCloserLoop = '0';
    video.dataset.ayCloserStarted = 'true';
    apply(video);
  }
  function resetActiveCloserVideos(){ document.querySelectorAll('.ayrinti-gallery__video-shell.effect-closer video').forEach(resetToStart); }
  function scheduleReset(){ resetTimers.forEach(clearTimeout); resetTimers = [20,70,150,300,650,1100].map(function(ms){ return setTimeout(resetActiveCloserVideos, ms); }); }
  function attach(video){
    if(!video || video.dataset.ayCloserV6Ready === 'true') return;
    video.dataset.ayCloserV6Ready = 'true';
    video.dataset.ayCloserNaturalReady = 'true';
    video.dataset.ayCloserSharpReady = 'true';
    video.dataset.ayCloserZoomReady = 'true';
    ['playing','timeupdate','seeking','seeked','ratechange','loadedmetadata','durationchange'].forEach(function(ev){
      video.addEventListener(ev,function(){ if(isCloser(video) && ev === 'playing' && video.dataset.ayCloserStarted !== 'true') resetToStart(video); apply(video); },{passive:true});
    });
    video.addEventListener('ended', function(){ setTimeout(function(){ apply(video); }, 30); }, {passive:true});
    setInterval(function(){ if(video.isConnected) apply(video); }, 70);
  }
  function scan(root){
    var scope = root && root.querySelectorAll ? root : document;
    if(scope.nodeName === 'VIDEO') attach(scope);
    (scope.querySelectorAll ? scope.querySelectorAll('video') : []).forEach(attach);
  }
  document.addEventListener('click', function(e){
    var thumb = e.target.closest && e.target.closest('[data-ayrinti-thumb][data-effect="zoom"], [data-effect="zoom"]');
    if(!thumb) return;
    document.querySelectorAll('video').forEach(function(v){ v.dataset.ayCloserStarted = 'false'; });
    scheduleReset();
  }, true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ scan(document); }); else scan(document);
  document.addEventListener('shopify:section:load', function(e){ scan(e.target); });
  if(window.MutationObserver){
    new MutationObserver(function(list){
      list.forEach(function(m){
        m.addedNodes && m.addedNodes.forEach(function(n){ if(n.nodeType === 1) scan(n); });
        if(m.type === 'attributes' && m.target && m.target.matches && m.target.matches('.ayrinti-gallery__video-shell')){
          var v = m.target.querySelector('video');
          if(v){ if(m.target.classList.contains('effect-closer') && v.dataset.ayCloserStarted !== 'true') scheduleReset(); apply(v); }
        }
      });
    }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
  }
  setTimeout(function(){ scan(document); }, 300);
  setTimeout(function(){ scan(document); }, 1200);
})();