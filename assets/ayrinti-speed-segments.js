/* GELINLIK21 ayrinti-speed-segments.js V1
   Segment speed rule for every product video:
   x1 0-5% slow 2x = playbackRate 0.5
   x2 5-35% normal = playbackRate 1
   x3 35-60% slow 2x = playbackRate 0.5
   x4 60-90% normal = playbackRate 1
   x5 90-100% slow 2x = playbackRate 0.5
*/
(function(){
  'use strict';
  if(window.__G21_VIDEO_SPEED_SEGMENTS_V1__) return;
  window.__G21_VIDEO_SPEED_SEGMENTS_V1__ = true;

  var SLOW_RATE = 0.5;
  var NORMAL_RATE = 1;

  function isTargetVideo(video){
    if(!video || video.nodeName !== 'VIDEO') return false;
    if(video.hasAttribute('data-g21-ignore-speed-segments')) return false;
    if(video.hasAttribute('data-ayrinti-video')) return true;
    if(video.classList && video.classList.contains('ayrinti-gallery__video')) return true;
    if(document.body && document.body.classList.contains('nil-template-product')) return true;
    return false;
  }

  function getRate(video){
    var d = Number(video.duration || 0);
    var t = Number(video.currentTime || 0);
    if(!isFinite(d) || d <= 0 || !isFinite(t)) return SLOW_RATE;
    var p = t / d;
    if(p < 0.05) return SLOW_RATE;
    if(p < 0.35) return NORMAL_RATE;
    if(p < 0.60) return SLOW_RATE;
    if(p < 0.90) return NORMAL_RATE;
    return SLOW_RATE;
  }

  function applyRate(video){
    if(!isTargetVideo(video)) return;
    var rate = getRate(video);
    if(Math.abs((video.playbackRate || 1) - rate) > 0.02){
      try{ video.playbackRate = rate; }catch(e){}
    }
    video.dataset.g21SpeedSegmentRate = String(rate);
  }

  function attach(video){
    if(!isTargetVideo(video) || video.dataset.g21SpeedSegmentsReady === 'true') return;
    video.dataset.g21SpeedSegmentsReady = 'true';
    video.removeAttribute('data-ay-fixed-rate');
    ['loadedmetadata','durationchange','play','playing','seeking','seeked','timeupdate','ratechange'].forEach(function(ev){
      video.addEventListener(ev, function(){ applyRate(video); }, {passive:true});
    });
    var tick = null;
    video.addEventListener('playing', function(){
      clearInterval(tick);
      tick = setInterval(function(){
        if(video.paused || video.ended){ clearInterval(tick); tick = null; return; }
        applyRate(video);
      }, 140);
    }, {passive:true});
    video.addEventListener('pause', function(){ clearInterval(tick); tick = null; }, {passive:true});
    video.addEventListener('ended', function(){ clearInterval(tick); tick = null; }, {passive:true});
    applyRate(video);
  }

  function scan(root){
    var scope = root && root.querySelectorAll ? root : document;
    if(scope.nodeName === 'VIDEO') attach(scope);
    (scope.querySelectorAll ? scope.querySelectorAll('video') : []).forEach(attach);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ scan(document); });
  else scan(document);

  document.addEventListener('shopify:section:load', function(e){ scan(e.target); });
  document.addEventListener('shopify:block:select', function(e){ scan(e.target); });

  if(window.MutationObserver){
    new MutationObserver(function(list){
      list.forEach(function(m){
        m.addedNodes && m.addedNodes.forEach(function(n){
          if(n.nodeType === 1) scan(n);
        });
      });
    }).observe(document.documentElement, {childList:true, subtree:true});
  }

  setTimeout(function(){ scan(document); }, 300);
  setTimeout(function(){ scan(document); }, 1200);
})();