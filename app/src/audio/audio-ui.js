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
const old=aud_updateSidebar;aud_updateSidebar=function(){old();refresh();};
window.audio18_updateRuntime=updateRuntime;window.audio18_addSfx=addSfx;window.audio18_updateSfx=updateSfx;window.audio18_deleteSfx=deleteSfx;window.audio18_selectSfx=selectSfx;
Forge.services.AudioUI=Object.freeze({refresh,normalize});
})();
