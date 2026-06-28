(function(){
if(window.G21AY_SAFE)return;window.G21AY_SAFE=1;
function all(r,s){return Array.prototype.slice.call(r.querySelectorAll(s))}
function one(r,s){return r.querySelector(s)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function init(g){
 if(g.getAttribute('data-ay-safe'))return;g.setAttribute('data-ay-safe','1');
 var thumbs=all(g,'[data-ayrinti-thumb]'),slides=all(g,'[data-ayrinti-slide]'),videos=all(g,'video[data-ayrinti-video]');
 var st={video:null,shell:null,effect:'',raf:0,loop:0,lock:false};
 var loops=Number(g.getAttribute('data-closer-loops')||2),zs=Number(g.getAttribute('data-closer-start')||1.25),ze=Number(g.getAttribute('data-closer-end')||2);
 if(!loops||loops<2)loops=2;
 thumbs.forEach(function(t){
  var label=one(t,'.ayrinti-gallery__effect-label');
  if(label){label.textContent=t.dataset.effect==='zoom'?'CLOSER LOOK':t.dataset.effect==='materials'?'FABRIC DETAIL':'CINEMATIC'}
 });
 function best(v){
  var sources=all(v,'source');
  if(sources.length<2)return;
  sources.sort(function(a,b){return ((+b.dataset.width||0)*(+b.dataset.height||0))-((+a.dataset.width||0)*(+a.dataset.height||0))});
  try{v.insertBefore(sources[0],v.firstChild);v.load()}catch(e){}
 }
 function setStatus(shell,text){
  var b=one(shell,'[data-ayrinti-status]');
  if(!b){b=document.createElement('div');b.className='ayrinti-gallery__status-badge';b.setAttribute('data-ayrinti-status','');shell.appendChild(b)}
  b.textContent=text;
 }
 function loader(shell,on){
  var l=one(shell,'.ayrinti-gallery__loader');
  if(on&&!l){l=document.createElement('span');l.className='ayrinti-gallery__loader';shell.appendChild(l)}
  if(l)l.style.display=on?'block':'none';
 }
 function clear(){
  if(st.raf)cancelAnimationFrame(st.raf);
  videos.forEach(function(v){try{v.pause();v.playbackRate=1}catch(e){}});
  all(g,'[data-ayrinti-video-shell]').forEach(function(s){
   s.classList.remove('effect-cinematic','effect-closer','effect-fabric','is-playing','is-loading-video','is-ended','is-blocked');
   ['--ay-z','--ay-x','--ay-y','--ay-r','--ay-c'].forEach(function(k){s.style.removeProperty(k)});
   loader(s,false);
  });
 }
 function chips(shell){
  var box=one(shell,'[data-material-strip]');if(!box)return;
  box.innerHTML='';
  var src=(g.dataset.materialSource||g.dataset.productTitle||'').toLowerCase();
  var words=['lace','tulle','satin','organza','beading','embroidery','bodice','train'].filter(function(w){return src.indexOf(w)>-1});
  if(!words.length)words=['lace','fabric','detail'];
  var track=document.createElement('div');track.className='ayrinti-material-track';
  words.slice(0,5).forEach(function(w){var c=document.createElement('span');c.className='ayrinti-material-chip';c.textContent=w.toUpperCase();track.appendChild(c)});
  box.appendChild(track);
 }
 function zoom(p){
  var shell=st.shell,half=p<=.5,q=half?p/.5:(p-.5)/.5;
  var a=st.loop?1.42:zs,b=st.loop?ze:1.72,z=a+(b-a)*p;
  var x=half?-5*q:-5+10*q,y=half?2.5-5*q:-2.5+5*q,r=half?-.55*q:-.55+1.1*q,c=1.08+.12*clamp((z-zs)/(ze-zs),0,1);
  shell.style.setProperty('--ay-z',z.toFixed(3));
  shell.style.setProperty('--ay-x',x.toFixed(2)+'%');
  shell.style.setProperty('--ay-y',y.toFixed(2)+'%');
  shell.style.setProperty('--ay-r',r.toFixed(2)+'deg');
  shell.style.setProperty('--ay-c',c.toFixed(3));
 }
 function frame(){
  if(st.effect==='zoom'&&st.video&&st.shell){
   var d=st.video.duration||1,p=clamp(st.video.currentTime/d,0,1);
   zoom(p);st.raf=requestAnimationFrame(frame);
  }
 }
 function play(slide,effect,button){
  var v=one(slide,'video[data-ayrinti-video]'),shell=one(slide,'[data-ayrinti-video-shell]');
  if(!v||!shell)return;
  clear();st.video=v;st.shell=shell;st.effect=effect;st.loop=0;
  best(v);
  shell.classList.add('is-loading-video',effect==='zoom'?'effect-closer':effect==='materials'?'effect-fabric':'effect-cinematic');
  setStatus(shell,effect==='zoom'?'CLOSER LOOK':effect==='materials'?'FABRIC DETAIL':'CINEMATIC');
  loader(shell,true); if(effect==='materials')chips(shell);
  try{v.currentTime=effect==='materials'&&v.duration?v.duration*(Number(button.dataset.startRatio)||.42):0}catch(e){}
  v.muted=true;v.loop=false;v.playsInline=true;v.playbackRate=effect==='slow'?.55:(effect==='materials'?.82:1);
  var p=v.play(); if(p&&p.catch)p.catch(function(){shell.classList.add('is-blocked');loader(shell,false)});
  if(effect==='zoom'){zoom(0);frame()}
 }
 thumbs.forEach(function(btn){
  btn.addEventListener('click',function(ev){
   ev.preventDefault(); if(st.lock)return; st.lock=true; setTimeout(function(){st.lock=false},220);
   var id=btn.dataset.mediaId,effect=btn.dataset.effect||'slow';
   thumbs.forEach(function(x){x.classList.toggle('is-active',x===btn)});
   slides.forEach(function(s){s.classList.toggle('is-active',String(s.dataset.mediaId)===String(id))});
   var slide=slides.find(function(s){return String(s.dataset.mediaId)===String(id)});
   if(slide&&slide.dataset.mediaType==='video')play(slide,effect,btn); else clear();
  },true);
 });
 videos.forEach(function(v){
  v.addEventListener('playing',function(){var s=v.closest('[data-ayrinti-video-shell]');if(s){s.classList.add('is-playing');s.classList.remove('is-loading-video','is-blocked');loader(s,false)}});
  v.addEventListener('waiting',function(){var s=v.closest('[data-ayrinti-video-shell]');if(s)loader(s,true)});
  v.addEventListener('ended',function(){if(v!==st.video)return;if(st.effect==='zoom'&&st.loop+1<loops){st.loop++;try{v.currentTime=0}catch(e){}zoom(0);v.play()}else{if(st.raf)cancelAnimationFrame(st.raf);if(st.shell){st.shell.classList.add('is-ended');loader(st.shell,false)}}});
 });
 var first=one(g,'[data-ayrinti-thumb].is-active')||thumbs[0]; if(first)first.click();
}
function run(){all(document,'ayrinti-video-gallery').forEach(init)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
document.addEventListener('shopify:section:load',function(e){all(e.target,'ayrinti-video-gallery').forEach(init)});
})();