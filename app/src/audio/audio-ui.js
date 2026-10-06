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


/* Native tracker entry: touch/soft-keyboard authoring uses the existing cells. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const cellIds=['audCellOrder','audCellChannel','audCellRow','audCellNote','audCellOctave','audCellInstrument','audCellVolume','audCellApply','audCellClear','audCellCut'];
const envIds=['audEnvKind','audEnvStep','audEnvValue','audEnvApply'];
let shown=null,instrumentOptions='',shownEnvelope=null;
function integer(value,lo,hi,label){const text=String(value).trim();if(!/^-?\d+$/.test(text))throw new Error(label+' must be a whole number.');const n=Number(text);if(!Number.isSafeInteger(n)||n<lo||n>hi)throw new Error(label+' must be '+lo+'–'+hi+'.');return n;}
function selectedCell(){const order=S.orderList[aud_currentOrder],pattern=order?.[aud_selectedChannel],cell=S.patterns[pattern]?.rows[aud_currentRow]?.[aud_selectedChannel];return cell?{order:aud_currentOrder,channel:aud_selectedChannel,row:aud_currentRow,pattern,cell}:null;}
function address(a){return a&&[a.order,a.channel,a.row,a.pattern].join(':');}
function message(text,envelope=false){const el=$(envelope?'audEnvStatus':'audCellStatus');if(el)el.textContent=text;return false;}
function writable(envelope=false){if(S.tab!=='audio')return false;if(aud_playing)return message('Stop audio preview before editing.',envelope);return true;}
function refresh(){
 if(!$('audCellNote'))return;
 const selected=selectedCell(),signature=JSON.stringify(S.instruments.map(x=>x.name));
 if(signature!==instrumentOptions){const field=$('audCellInstrument'),value=field.value;field.innerHTML='<option value="-1">Previous / default</option>'+S.instruments.map((inst,i)=>'<option value="'+i+'">'+i.toString(16).padStart(2,'0')+' '+esc(inst.name)+'</option>').join('');field.value=value||'-1';instrumentOptions=signature;}
 const changed=!shown||address(shown)!==address(selected)||shown.cell!==selected?.cell||shown.json!==JSON.stringify(selected?.cell);
 if(changed){
  shown=selected?{...selected,json:JSON.stringify(selected.cell)}:null;
  $('audCellOrder').value=aud_currentOrder;$('audCellChannel').value=aud_selectedChannel;$('audCellRow').value=aud_currentRow;
  const cell=selected?.cell,note=cell?.note??-1;
  $('audCellNote').value=note===-2?'cut':note<0?'blank':note%12;
  $('audCellOctave').value=note>=0?Math.floor(note/12):3;
  $('audCellInstrument').value=cell?.inst??-1;
  $('audCellVolume').value=(cell?.vol??-1)<0?'':cell.vol;
 }
 $('audCellOrder').max=Math.max(0,S.orderList.length-1);$('audCellRow').max=Math.max(0,S.audRows-1);
 $('audCellLocation').textContent=selected?'Order '+selected.order+' · pattern '+selected.pattern+' · row '+selected.row+' · '+['Pulse 1','Pulse 2','Triangle','Noise','DPCM'][selected.channel]:'Select a tracker cell.';
 for(const id of cellIds)$(id).disabled=aud_playing||(!['audCellOrder','audCellChannel','audCellRow'].includes(id)&&(!selected||selected.channel===4));
 if(aud_playing)message('Stop audio preview before editing.');else if(!selected)message('Select a tracker cell.');else if(selected.channel===4)message('DPCM sample playback is not implemented.');else if(changed)message('Choose a note and instrument, then Apply. Blank volume keeps the previous volume.');
 refreshEnvelope();
}
function selectCell(){
 if(!writable())return false;
 try{const order=integer($('audCellOrder').value,0,S.orderList.length-1,'Order'),channel=integer($('audCellChannel').value,0,4,'Channel'),row=integer($('audCellRow').value,0,S.audRows-1,'Row');if(!S.patterns[S.orderList[order]?.[channel]]?.rows[row]?.[channel])throw new Error('That tracker cell is unavailable.');aud_currentOrder=order;aud_selectedChannel=channel;aud_currentRow=row;shown=null;render();refresh();return true;}catch(error){return message(error.message);}
}
function preview(note,inst,ch,volume){
 if(note<0){aud_cutNote(ch);return;}
 try{aud_init();aud_ctx.resume().catch(reportError);if(volume>=0)aud_volumes[ch]=volume/15;aud_triggerNote(ch,note,inst>=0?inst:aud_activeInst[ch]>=0?aud_activeInst[ch]:0);clearTimeout(previewTimeout);previewTimeout=setTimeout(()=>aud_cutNote(ch),250);}catch(error){reportError(error);}
}
function commitCell(next,reason){
 const selected=selectedCell();
 try{const order=integer($('audCellOrder').value,0,S.orderList.length-1,'Order'),channel=integer($('audCellChannel').value,0,4,'Channel'),row=integer($('audCellRow').value,0,S.audRows-1,'Row');if(!selected||order!==selected.order||channel!==selected.channel||row!==selected.row)throw new Error('Select the order, channel and row before applying.');}catch(error){return message(error.message);}
 if(!selected||!shown||address(selected)!==address(shown)||selected.cell!==shown.cell||JSON.stringify(selected.cell)!==shown.json)return message('The selected cell changed. Select it again before applying.');
 if(selected.channel===4)return message('DPCM sample playback is not implemented.');
 if(next.note>=0&&!S.instruments.length)return message('Add an instrument first.');
 const value={...selected.cell,...next};
 if(JSON.stringify(value)===JSON.stringify(selected.cell)){message('Cell is unchanged.');return true;}
 snapshot();S.patterns[selected.pattern].rows[selected.row][selected.channel]=value;notify(reason);refresh();preview(value.note,value.inst,selected.channel,value.vol);message('Saved to order '+selected.order+', row '+selected.row+'.');return true;
}
function apply(){
 if(!writable())return false;
 try{const pitch=$('audCellNote').value,note=pitch==='blank'?-1:pitch==='cut'?-2:integer(pitch,0,11,'Note')+12*integer($('audCellOctave').value,0,7,'Octave'),inst=integer($('audCellInstrument').value,-1,S.instruments.length-1,'Instrument'),volume=$('audCellVolume').value.trim(),vol=volume===''?-1:integer(volume,0,15,'Volume');return commitCell({note,inst,vol},'audioCell');}catch(error){return message(error.message);}
}
function clear(){return writable()&&commitCell({note:-1,inst:-1},'audioNote');}
function cut(){return writable()&&commitCell({note:-2,inst:-1},'audioNote');}
function refreshEnvelope(force=false){
 const inst=S.instruments[aud_selectedInst],kind=$('audEnvKind').value==='arpEnv'?'arpEnv':'volEnv',env=inst?.[kind],changed=shownEnvelope?.inst!==inst||shownEnvelope?.kind!==kind,playChanged=shownEnvelope?.playing!==aud_playing;
 const step=changed?0:Math.max(0,Math.min((env?.length||1)-1,force?Number($('audEnvStep').value)||0:shownEnvelope.step));
 for(const id of envIds)$(id).disabled=aud_playing||!env?.length;
 $('audEnvStep').max=Math.max(0,(env?.length||1)-1);$('audEnvValue').min=kind==='volEnv'?0:-12;$('audEnvValue').max=kind==='volEnv'?15:12;
 if(force||changed||shownEnvelope?.step!==step||shownEnvelope?.value!==env?.[step]){$('audEnvStep').value=step;$('audEnvValue').value=env?.[step]??0;shownEnvelope={inst,kind,step,value:env?.[step]};message(aud_playing?'Stop audio preview before editing.':env?.length?'Step '+step+' of '+env.length+' values (counting from 0).':'Add and select an instrument first.',true);}
 if(playChanged)message(aud_playing?'Stop audio preview before editing.':env?.length?'Step '+step+' of '+env.length+' values (counting from 0).':'Add and select an instrument first.',true);
 shownEnvelope.playing=aud_playing;
}
function selectEnvelope(){
 if(!writable(true))return false;
 try{const kind=$('audEnvKind').value;if(!['volEnv','arpEnv'].includes(kind))throw new Error('Choose Volume or Arpeggio.');const inst=S.instruments[aud_selectedInst],env=inst?.[kind];if(!env?.length)throw new Error('Add and select an instrument first.');if(shownEnvelope?.kind!==kind)$('audEnvStep').value=0;integer($('audEnvStep').value,0,env.length-1,'Envelope step');refreshEnvelope(true);return true;}catch(error){return message(error.message,true);}
}
function updateEnvelope(){
 if(!writable(true))return false;
 try{const kind=$('audEnvKind').value;if(!['volEnv','arpEnv'].includes(kind))throw new Error('Choose Volume or Arpeggio.');const inst=S.instruments[aud_selectedInst],env=inst?.[kind];if(!env?.length)throw new Error('Add and select an instrument first.');const step=integer($('audEnvStep').value,0,env.length-1,'Envelope step'),value=integer($('audEnvValue').value,kind==='volEnv'?0:-12,kind==='volEnv'?15:12,'Envelope value');if(shownEnvelope?.inst!==inst||shownEnvelope?.kind!==kind||shownEnvelope?.step!==step)throw new Error('Select the envelope step before applying.');if(shownEnvelope.value!==env[step])throw new Error('The envelope value changed. Select the step again before applying.');if(env[step]===value)return message('Envelope value is unchanged.',true);snapshot();env[step]=value;notify('envelope');refreshEnvelope(true);message('Saved '+(kind==='volEnv'?'volume':'arpeggio')+' step '+step+'.',true);return true;}catch(error){return message(error.message,true);}
}
const oldDrawEnvelopes=aud_drawEnvelopes;aud_drawEnvelopes=function(){oldDrawEnvelopes();refreshEnvelope();};
const oldSidebar=aud_updateSidebar;aud_updateSidebar=function(){oldSidebar();refresh();};
const oldPlay=aud_play;aud_play=function(){oldPlay();refresh();};
const oldStop=aud_stop;aud_stop=function(){oldStop();shown=null;refresh();};
window.audio20_selectCell=selectCell;window.audio20_applyCell=apply;window.audio20_clearCell=clear;window.audio20_cutCell=cut;window.audio20_selectEnvelope=selectEnvelope;window.audio20_updateEnvelope=updateEnvelope;
Forge.services.AudioNoteEntry=Object.freeze({refresh,apply,selectCell,clear,cut,updateEnvelope,selectEnvelope});
for(const id of ['audCellEditor','audEnvelopeEditor'])$(id)?.addEventListener('keydown',event=>{if(event.target?.closest?.('button')&&!event.ctrlKey&&!event.metaKey)event.stopPropagation();});
refresh();
})();
