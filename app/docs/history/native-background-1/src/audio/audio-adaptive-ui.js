/* Audio workspace adaptation. Canonical tracker and desktop strokes stay intact. */
(()=>{
'use strict';
const panel=document.getElementById('leftP'),keyboardId='audTrackerKeyboard200';
const style=document.createElement('style');
style.id='audioAdaptiveStyle200';
style.textContent=`
body.forge-audio-workspace{height:var(--audio-viewport-height,100vh);height:var(--audio-viewport-height,100dvh)}
.forge-audio-workspace #leftP{display:block!important;scroll-padding:12px;overscroll-behavior:contain}
.forge-audio-workspace #cv{flex-shrink:0;max-width:none;width:650px;height:auto}
.forge-audio-workspace #sideAudio .env-canvas{touch-action:none;max-width:100%}
@media(max-width:850px){
 .forge-audio-workspace .top{max-height:24%;padding:6px}
 .forge-audio-workspace .main{min-height:0;overflow:auto;overscroll-behavior:contain}
 .forge-audio-workspace #leftP{flex:0 0 auto;width:100%;max-height:max(150px,calc(var(--audio-viewport-height,100dvh) * .52));padding:8px}
 .forge-audio-workspace #rightP{min-width:0}
 .forge-audio-workspace #sideAudio{font-size:13px;line-height:1.5}
 .forge-audio-workspace #sideAudio h2{font-size:14px}
 .forge-audio-workspace #sideAudio .env-canvas{width:min(100%,420px);height:88px}
 .forge-audio-workspace #sideAudio button,.forge-audio-workspace #sideAudio input:not([type=checkbox]),.forge-audio-workspace #sideAudio select{min-height:44px;font-size:16px;max-width:100%}
 .forge-audio-workspace #sideAudio .inst-slot,.forge-audio-workspace #sideAudio .ord-cell{min-height:44px;display:flex;align-items:center}
}
@media(pointer:coarse){.forge-audio-workspace #sideAudio .env-canvas{height:88px}}
`;
document.head.appendChild(style);
let stroke=null,suppressMouseUntil=0,lastSelection='';
function cancelStroke(){
 const old=stroke;stroke=null;
 if(old?.pointerId!=null){try{old.canvas.releasePointerCapture(old.pointerId);}catch(_){}}
}
function validStroke(){
 if(!stroke)return false;
 if(S.tab!=='audio'||S.instruments!==stroke.instruments||S.instruments[aud_selectedInst]!==stroke.instrument||stroke.instrument[stroke.key]!==stroke.envelope){cancelStroke();return false;}
 return true;
}
function point(canvas,event){
 const r=canvas.getBoundingClientRect();
 if(!(r.width>0&&r.height>0)||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return null;
 return {x:(event.clientX-r.left)*canvas.width/r.width,y:(event.clientY-r.top)*canvas.height/r.height};
}
function paint(event){
 if(!validStroke())return;
 const p=point(stroke.canvas,event);if(!p)return;
 const index=Math.max(0,Math.min(stroke.envelope.length-1,Math.floor(p.x/stroke.canvas.width*stroke.envelope.length)));
 const value=Math.max(stroke.lo,Math.min(stroke.hi,Math.round(stroke.hi-p.y/stroke.canvas.height*(stroke.hi-stroke.lo))));
 if(stroke.envelope[index]===value)return;
 if(!stroke.saved){snapshot();stroke.saved=true;}
 stroke.envelope[index]=value;aud_drawEnvelopes();broadcastState('envelope');
}
function begin(canvas,key,lo,hi,event,pointerId){
 if(S.tab!=='audio'||stroke)return;
 const instrument=S.instruments[aud_selectedInst],p=point(canvas,event);
 if(!instrument||!Array.isArray(instrument[key])||!instrument[key].length||!p||p.x<0||p.x>=canvas.width||p.y<0||p.y>canvas.height)return;
 stroke={canvas,key,lo,hi,pointerId,instruments:S.instruments,instrument,envelope:instrument[key],saved:false};
 // Stop typing before painting. Native fields and tracker focus stay separate.
 const active=document.activeElement;if(active?.id===keyboardId)active.blur();
 suppressMouseUntil=Date.now()+800;
 if(event.cancelable!==false)event.preventDefault();
 if(pointerId!=null){try{canvas.setPointerCapture(pointerId);}catch(_){}}
 paint(event);
}
for(const [id,key,lo,hi] of [['envVol','volEnv',0,15],['envArp','arpEnv',-12,12]]){
 const canvas=document.getElementById(id);
 canvas.setAttribute('aria-label',id==='envVol'?'Volume envelope: drag to paint':'Arpeggio envelope: drag to paint');
 // Preserve the original desktop mouse handler, suppressing only touch/pen echoes.
 canvas.addEventListener('mousedown',e=>{if(Date.now()<suppressMouseUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 if(typeof window.PointerEvent==='function'){
  canvas.addEventListener('pointerdown',e=>{if(!['touch','pen'].includes(e.pointerType)||e.button>0)return;if(e.isPrimary===false){cancelStroke();return;}begin(canvas,key,lo,hi,e,e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(stroke?.canvas!==canvas||stroke.pointerId!==e.pointerId)return;if(e.cancelable!==false)e.preventDefault();paint(e);});
  canvas.addEventListener('pointerup',e=>{if(stroke?.canvas!==canvas||stroke.pointerId!==e.pointerId)return;paint(e);suppressMouseUntil=Date.now()+800;cancelStroke();});
  canvas.addEventListener('pointercancel',e=>{if(stroke?.pointerId===e.pointerId)cancelStroke();});
  canvas.addEventListener('lostpointercapture',e=>{if(stroke?.pointerId===e.pointerId)cancelStroke();});
 }else{
  canvas.addEventListener('touchstart',e=>{if(e.touches.length!==1){cancelStroke();return;}const t=e.touches[0];begin(canvas,key,lo,hi,{...t,clientX:t.clientX,clientY:t.clientY,cancelable:e.cancelable,preventDefault:()=>e.preventDefault()},t.identifier);},{passive:false});
  canvas.addEventListener('touchmove',e=>{if(stroke?.canvas!==canvas)return;if(e.touches.length!==1){cancelStroke();return;}const t=Array.from(e.touches).find(t=>t.identifier===stroke.pointerId);if(t){if(e.cancelable!==false)e.preventDefault();paint(t);}},{passive:false});
  canvas.addEventListener('touchend',e=>{if(stroke?.canvas!==canvas)return;const t=Array.from(e.changedTouches||[]).find(t=>t.identifier===stroke.pointerId);if(t){if(e.cancelable!==false)e.preventDefault();paint(t);suppressMouseUntil=Date.now()+800;cancelStroke();}},{passive:false});
  canvas.addEventListener('touchcancel',cancelStroke);
 }
}
if(typeof window.PointerEvent==='function'){
 document.addEventListener('pointerdown',e=>{if(stroke&&e.pointerId!==stroke.pointerId)cancelStroke();},true);
 document.addEventListener('pointerup',e=>{if(stroke?.pointerId===e.pointerId&&e.target!==stroke.canvas)cancelStroke();});
 document.addEventListener('pointercancel',cancelStroke);
}else{
 document.addEventListener('touchstart',e=>{if(stroke&&(e.touches.length!==1||e.target!==stroke.canvas))cancelStroke();},{passive:true,capture:true});
 document.addEventListener('touchend',e=>{if(stroke&&e.target!==stroke.canvas)cancelStroke();});
 document.addEventListener('touchcancel',cancelStroke);
}
function ensureSelectionVisible(){
 if(S.tab!=='audio'||aud_playing)return;
 const r=cv.getBoundingClientRect(),bounds=panel.getBoundingClientRect();
 if(!(r.width>0&&r.height>0&&panel.clientWidth>0&&panel.clientHeight>0))return;
 const x=r.left+aud_selectedChannel*130*r.width/650,y=r.top+(26+aud_currentRow*18)*r.height/cv.height;
 const right=x+130*r.width/650,bottom=y+18*r.height/cv.height,pad=8;
 const left=bounds.left+pad,top=bounds.top+pad,visibleRight=bounds.left+panel.clientWidth-pad,visibleBottom=bounds.top+panel.clientHeight-pad;
 const dx=x<left?x-left:right>visibleRight?right-visibleRight:0;
 const dy=y<top?y-top:bottom>visibleBottom?bottom-visibleBottom:0;
 if(Number.isFinite(dx)&&dx)panel.scrollLeft=(panel.scrollLeft||0)+dx;
 if(Number.isFinite(dy)&&dy)panel.scrollTop=(panel.scrollTop||0)+dy;
}
function refreshLayout(){
 const active=S.tab==='audio';document.body.classList.toggle('forge-audio-workspace',active);
 const height=window.visualViewport?.height||window.innerHeight;
 if(active&&Number.isFinite(height)&&height>0)document.body.style.setProperty('--audio-viewport-height',height+'px');
 else document.body.style.removeProperty('--audio-viewport-height');
 if(active)ensureSelectionVisible();else lastSelection='';
}
const originalRender=renderAudio;renderAudio=function(){const result=originalRender.apply(this,arguments);const selected=aud_currentOrder+':'+aud_currentRow+':'+aud_selectedChannel;if(selected!==lastSelection){lastSelection=selected;ensureSelectionVisible();}return result;};
const originalSwitch=switchTab;switchTab=function(tab){cancelStroke();const result=originalSwitch.apply(this,arguments);refreshLayout();return result;};
window.addEventListener('resize',refreshLayout);
window.visualViewport?.addEventListener('resize',refreshLayout);
window.visualViewport?.addEventListener('scroll',refreshLayout);
document.addEventListener('focusin',e=>{if(e.target?.id===keyboardId)ensureSelectionVisible();});
window.addEventListener('blur',cancelStroke);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelStroke();});
Forge.services.AudioAdaptiveUI=Object.freeze({refreshLayout,ensureSelectionVisible,cancelStroke});
refreshLayout();
})();
