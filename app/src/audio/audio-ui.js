/* NES Forge 1.8 — Audio Runtime and pattern-backed SFX controls. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),cl=(v,a,b,d=a)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Math.trunc(Number(v)))):d;
let selected=0;
const uid=()=>{let id;do{id='sfx-'+Math.random().toString(36).slice(2,10);}while((S.sfx||[]).some(x=>x.id===id));return id;};
function normalize(item={}){return {id:String(item.id||uid()),name:String(item.name||'Sound Effect').slice(0,80),channel:cl(item.channel,0,3,0),pattern:cl(item.pattern,0,255,0),startRow:cl(item.startRow,0,127,0),endRow:cl(item.endRow,0,127,15)};}
function runtime(){S.audioRuntime=Forge.services.AudioConfig.normalize(S.audioRuntime);return S.audioRuntime;}
function updateRuntime(){snapshot();const r=runtime();r.enabled=!!$('audRuntimeEnabled180').checked;r.musicEnabled=!!$('audMusicEnabled180').checked;notify('audioRuntime');refresh();}
function addSfx(){snapshot();S.sfx=S.sfx||[];S.sfx.push(normalize({name:'SFX '+(S.sfx.length+1),endRow:Math.min(S.audRows-1,15)}));selected=S.sfx.length-1;notify('audioSfxAdd');refresh();}
function updateSfx(){const item=S.sfx?.[selected];if(!item)return;snapshot();const next=normalize({id:item.id,name:$('audSfxName180').value,channel:$('audSfxChannel180').value,pattern:$('audSfxPattern180').value,startRow:$('audSfxStart180').value,endRow:$('audSfxEnd180').value});if(next.endRow<next.startRow)next.endRow=next.startRow;Object.assign(item,next);notify('audioSfxEdit');refresh();}
function deleteSfx(){if(!S.sfx?.[selected])return;snapshot();S.sfx.splice(selected,1);selected=Math.max(0,Math.min(selected,S.sfx.length-1));notify('audioSfxDelete');refresh();}
function selectSfx(index){if(!S.sfx?.[index])return;selected=index;refresh();}
function refresh(){
 const r=runtime(),enabled=$('audRuntimeEnabled180'),music=$('audMusicEnabled180');if(!enabled||!music)return;
 enabled.checked=r.enabled;music.checked=r.musicEnabled;music.disabled=!r.enabled;
 $('audRuntimeStatus180').textContent=r.enabled?(r.musicEnabled?'Generated runtimes autoplay music and execute linked sound events.':'Generated runtimes execute linked sound events; background music is off.'):'Disabled; tracker data stays authoring-only.';
 S.sfx=S.sfx||[];selected=Math.max(0,Math.min(selected,S.sfx.length-1));$('audSfxCount180').textContent=S.sfx.length;
 $('audSfxList180').innerHTML=S.sfx.map((s,i)=>'<div class="inst-slot'+(i===selected?' sel':'')+'" onclick="audio18_selectSfx('+i+')">'+esc(s.name)+' <small>'+esc(s.id)+'</small></div>').join('')||'<p>No SFX definitions.</p>';
 const item=S.sfx[selected],editor=$('audSfxEditor180');editor.style.display=item?'block':'none';if(!item)return;
 for(const [id,value]of [['audSfxName180',item.name],['audSfxId180',item.id],['audSfxChannel180',item.channel],['audSfxPattern180',item.pattern],['audSfxStart180',item.startRow],['audSfxEnd180',item.endRow]])if(document.activeElement!==$(id))$(id).value=value;
}
// The tracker keeps its existing PC key map. A real text input receives native
// mobile keyboard edits; it never becomes a second editor or a saved field.
const keyboard=document.createElement('input');keyboard.id='audTrackerKeyboard200';keyboard.type='text';keyboard.tabIndex=-1;
keyboard.setAttribute('aria-label','Audio tracker keyboard: use the PC piano keys Z to M and Q to U');keyboard.setAttribute('inputmode','text');keyboard.setAttribute('enterkeyhint','done');keyboard.setAttribute('autocomplete','off');keyboard.setAttribute('autocorrect','off');keyboard.setAttribute('autocapitalize','off');keyboard.setAttribute('spellcheck','false');keyboard.spellcheck=false;
keyboard.style.cssText='position:fixed;width:1px;height:1px;padding:0;border:0;opacity:.01;font-size:16px;pointer-events:none;z-index:1';document.body.appendChild(keyboard);
const seed='\u200b',noteKeys={z:0,s:1,x:2,d:3,c:4,v:5,g:6,b:7,h:8,n:9,j:10,m:11,q:12,'2':13,w:14,'3':15,e:16,r:17,'5':18,t:19,'6':20,y:21,'7':22,u:23};
let keyboardSession=null,composing=false,compositionTarget=null,compositionText='',completedComposition=null,preventedInput=null,gesture=null,suppressMouseUntil=0;
let echoGeneration=0,preventGeneration=0;
function textValue(value){return String(value??'').split(seed).join('');}
function resetKeyboard(){keyboard.value=seed;try{keyboard.setSelectionRange(1,1);}catch(_){}}
function clearComposition(){composing=false;compositionTarget=null;compositionText='';completedComposition=null;echoGeneration++;}
function releaseKeyboard(){keyboardSession=null;clearComposition();preventedInput=null;preventGeneration++;if(document.activeElement===keyboard)keyboard.blur();resetKeyboard();}
function activeKeyboard(){if(!keyboardSession)return false;if(S.tab!=='audio'||keyboardSession.patterns!==S.patterns||document.activeElement!==keyboard){releaseKeyboard();return false;}return true;}
function target(){return {patterns:S.patterns,order:aud_currentOrder,row:aud_currentRow,channel:aud_selectedChannel};}
function sameTarget(t){return !!t&&t.patterns===S.patterns&&t.order===aud_currentOrder&&t.row===aud_currentRow&&t.channel===aud_selectedChannel;}
function enterText(value){const text=textValue(value);if(text.length!==1)return;const key=text.toLowerCase();if(Object.hasOwn(noteKeys,key))aud_enterNote(36+noteKeys[key]);else if(text===' ')aud_playing?aud_stop():aud_play();}
function rememberPrevented(type){const generation=++preventGeneration;preventedInput=type;setTimeout(()=>{if(generation===preventGeneration)preventedInput=null;},0);}
function consumePrevented(type){if(preventedInput!==type)return false;preventedInput=null;preventGeneration++;resetKeyboard();return true;}
function finishComposition(value){const text=textValue(value),valid=activeKeyboard()&&sameTarget(compositionTarget);composing=false;compositionTarget=null;compositionText='';if(valid)enterText(text);completedComposition={text,task:true};const generation=++echoGeneration;setTimeout(()=>{if(generation===echoGeneration&&completedComposition)completedComposition.task=false;},0);resetKeyboard();}
function clearEcho(){completedComposition=null;echoGeneration++;}
function editAction(type){if(type==='deleteContentBackward'){aud_enterNote(-2);return true;}if(type==='deleteContentForward'){aud_enterNote(-1);return true;}if(type==='historyUndo'){undo();return true;}if(type==='historyRedo'){redo();return true;}return false;}
function isEditAction(type){return ['deleteContentBackward','deleteContentForward','historyUndo','historyRedo'].includes(type);}
function allowedInsert(type){return !type||['insertText','insertCompositionText','insertFromComposition'].includes(type);}
function gridPoint(event){if(S.tab!=='audio')return null;const rect=cv.getBoundingClientRect();if(!(rect.width>0&&rect.height>0)||event.clientX<rect.left||event.clientX>=rect.left+rect.width||event.clientY<rect.top||event.clientY>=rect.top+rect.height)return null;const p=canvasPoint(cv,event);if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>=650||p.y<26||p.y>=26+S.audRows*18)return null;return {channel:Math.floor(p.x/130),row:Math.floor((p.y-26)/18)};}
function beginTap(event,id){if(!gridPoint(event))return;gesture={id,x:event.clientX,y:event.clientY,cancelled:false,patterns:S.patterns};}
function moveTap(event,id){if(gesture?.id===id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.cancelled=true;}
function endTap(event,id){if(!gesture||gesture.id!==id)return;const tap=gesture;gesture=null;const cell=gridPoint(event);if(tap.cancelled||tap.patterns!==S.patterns||!cell||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>10)return;
 // Keep the trusted tap and focus in the same call stack. Cancelled scroll or
 // multi-touch gestures leave the old keyboard session alone.
 releaseKeyboard();aud_selectedChannel=cell.channel;aud_currentRow=cell.row;render();keyboardSession={patterns:S.patterns};resetKeyboard();keyboard.style.left=Math.max(0,event.clientX)+'px';keyboard.style.top=Math.max(0,event.clientY)+'px';suppressMouseUntil=Date.now()+800;
 if(event.cancelable!==false)event.preventDefault();keyboard.focus({preventScroll:true});
}
if(typeof window.PointerEvent==='function'){
 cv.addEventListener('pointerdown',e=>{if(!['touch','pen'].includes(e.pointerType))return;if(gesture||e.isPrimary===false){if(gesture)gesture.cancelled=true;return;}beginTap(e,e.pointerId);});
 cv.addEventListener('pointermove',e=>moveTap(e,e.pointerId));
 cv.addEventListener('pointerup',e=>endTap(e,e.pointerId));
 cv.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId)gesture=null;});
 document.addEventListener('pointerdown',e=>{if(gesture&&['touch','pen'].includes(e.pointerType)&&e.pointerId!==gesture.id)gesture.cancelled=true;},true);
 document.addEventListener('pointerup',e=>{if(e.target!==cv&&gesture?.id===e.pointerId)gesture=null;});
 document.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId)gesture=null;});
 document.addEventListener('pointerdown',e=>{if(e.target!==cv&&e.target!==keyboard)releaseKeyboard();},true);
}else{
 cv.addEventListener('touchstart',e=>{if(e.touches.length!==1){if(gesture)gesture.cancelled=true;return;}const t=e.touches[0];beginTap(t,t.identifier);},{passive:true});
 cv.addEventListener('touchmove',e=>{if(e.touches.length!==1){if(gesture)gesture.cancelled=true;return;}const t=e.touches[0];moveTap(t,t.identifier);},{passive:true});
 cv.addEventListener('touchend',e=>{const t=Array.from(e.changedTouches||[]).find(t=>t.identifier===gesture?.id);if(t)endTap({clientX:t.clientX,clientY:t.clientY,cancelable:e.cancelable,preventDefault:()=>e.preventDefault()},t.identifier);},{passive:false});
 cv.addEventListener('touchcancel',()=>{gesture=null;});
 document.addEventListener('touchstart',e=>{if(gesture&&e.touches.length!==1)gesture.cancelled=true;},{passive:true,capture:true});
 document.addEventListener('touchend',e=>{if(e.target!==cv&&Array.from(e.changedTouches||[]).some(t=>t.identifier===gesture?.id))gesture=null;});
 document.addEventListener('touchcancel',()=>{gesture=null;});
 document.addEventListener('touchstart',e=>{if(e.target!==cv&&e.target!==keyboard)releaseKeyboard();},{passive:true,capture:true});
 document.addEventListener('mousedown',e=>{if(e.target!==cv&&e.target!==keyboard)releaseKeyboard();},true);
}
// The original mouse handler focuses the canvas. Suppress only the compatibility
// mouse event immediately following a successful touch/pen tap.
cv.addEventListener('mousedown',e=>{if(S.tab==='audio'&&Date.now()<suppressMouseUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
keyboard.addEventListener('keydown',e=>{if(!activeKeyboard())return;e.stopPropagation();const key=String(e.key||'').toLowerCase();
 if(e.key==='Escape'){e.preventDefault();releaseKeyboard();return;}
 if(e.key==='Enter'){e.preventDefault();if(composing)finishComposition(compositionText||textValue(keyboard.value));releaseKeyboard();return;}
 if(e.isComposing||e.keyCode===229||e.key==='Unidentified'){clearEcho();return;}
 if(e.ctrlKey||e.metaKey){e.preventDefault();clearComposition();if(key==='z')e.shiftKey?redo():undo();else if(key==='y')redo();else if(key==='s')project_export();resetKeyboard();return;}
 if(e.altKey){e.preventDefault();return;}
 if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();clearComposition();const type=e.key==='Backspace'?'deleteContentBackward':'deleteContentForward';editAction(type);rememberPrevented(type);resetKeyboard();return;}
 if(e.key.startsWith('Arrow')){e.preventDefault();clearComposition();if(e.key==='ArrowUp')aud_currentRow=Math.max(0,aud_currentRow-1);if(e.key==='ArrowDown')aud_currentRow=Math.min(S.audRows-1,aud_currentRow+1);if(e.key==='ArrowLeft')aud_selectedChannel=Math.max(0,aud_selectedChannel-1);if(e.key==='ArrowRight')aud_selectedChannel=Math.min(4,aud_selectedChannel+1);render();resetKeyboard();return;}
 clearEcho();if(e.repeat)e.preventDefault();
});
keyboard.addEventListener('beforeinput',e=>{if(!activeKeyboard())return;e.stopPropagation();const type=e.inputType||'';
 if(type==='insertLineBreak'||type==='insertParagraph'){if(e.cancelable)e.preventDefault();if(composing)finishComposition(compositionText||textValue(keyboard.value));releaseKeyboard();return;}
 if(e.isComposing||composing)return;
 if(isEditAction(type)){clearEcho();if(preventedInput===type){if(e.cancelable)e.preventDefault();resetKeyboard();return;}if(e.cancelable){e.preventDefault();editAction(type);rememberPrevented(type);resetKeyboard();}return;}
 if(!allowedInsert(type)){if(e.cancelable)e.preventDefault();clearEcho();resetKeyboard();return;}
 // A new ordinary edit is intentional even if it repeats the previous note.
 if(type==='insertText'&&!(completedComposition?.task&&(e.data==null||textValue(e.data)===completedComposition.text)))clearEcho();
});
keyboard.addEventListener('input',e=>{if(!activeKeyboard()){resetKeyboard();return;}e.stopPropagation();const type=e.inputType||'',text=textValue(e.data==null?keyboard.value:e.data);
 if(type==='insertLineBreak'||type==='insertParagraph'){if(composing)finishComposition(compositionText||textValue(keyboard.value));releaseKeyboard();return;}
 if(composing||e.isComposing){if(composing)compositionText=text;return;}
 if(consumePrevented(type))return;
 if(completedComposition&&text===completedComposition.text&&(completedComposition.task||['insertCompositionText','insertFromComposition'].includes(type))){resetKeyboard();return;}
 clearEcho();if(isEditAction(type)){editAction(type);resetKeyboard();return;}if(allowedInsert(type))enterText(text);resetKeyboard();
});
keyboard.addEventListener('compositionstart',e=>{if(!activeKeyboard())return;e.stopPropagation();clearEcho();composing=true;compositionTarget=target();compositionText='';});
keyboard.addEventListener('compositionupdate',e=>{if(!activeKeyboard()||!composing)return;e.stopPropagation();compositionText=textValue(e.data);});
keyboard.addEventListener('compositionend',e=>{if(!activeKeyboard()||!composing)return;e.stopPropagation();finishComposition(e.data==null?compositionText:e.data);});
keyboard.addEventListener('paste',e=>{if(activeKeyboard()){e.preventDefault();e.stopPropagation();clearComposition();resetKeyboard();}});
keyboard.addEventListener('drop',e=>{if(activeKeyboard()){e.preventDefault();e.stopPropagation();clearComposition();resetKeyboard();}});
keyboard.addEventListener('cut',e=>{if(activeKeyboard()){e.preventDefault();e.stopPropagation();clearComposition();resetKeyboard();}});
keyboard.addEventListener('blur',releaseKeyboard);
window.addEventListener('blur',()=>{gesture=null;releaseKeyboard();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){gesture=null;releaseKeyboard();}});
const oldSwitchTab=switchTab;switchTab=function(tab){if(tab!=='audio'){gesture=null;releaseKeyboard();}return oldSwitchTab.apply(this,arguments);};
const old=aud_updateSidebar;aud_updateSidebar=function(){if(keyboardSession)activeKeyboard();old();refresh();};
window.audio18_updateRuntime=updateRuntime;window.audio18_addSfx=addSfx;window.audio18_updateSfx=updateSfx;window.audio18_deleteSfx=deleteSfx;window.audio18_selectSfx=selectSfx;
Forge.services.AudioUI=Object.freeze({refresh,normalize});
})();
