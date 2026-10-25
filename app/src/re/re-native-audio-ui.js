/* Explicit native-driver editing. This isolated session never imports canonical
 * Audio, replaces the editor project, or loads/changes the active emulator. */
(()=>{
'use strict';
const services=window.Forge.services,MAX_ROM=41488,PAGE=100,MAX_HISTORY=32,MAX_HISTORY_BYTES=2*1024*1024;
let c=null,source=null,sourceGeneration=-1,generation=0,busy=false,resultStatus='idle',original=null,history=[],cursor=-1,songIndex=0,channelIndex=0,page=0,eventIndex=-1,editRevision=0;
const make=(tag,id,text)=>{const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;return el;};
const model=()=>{if(!window.FamiTone2Native)throw Error('The native audio decoder is unavailable in this build.');return window.FamiTone2Native;};
const current=()=>history[cursor]||null;
const hx=n=>'$'+Number(n).toString(16).toUpperCase().padStart(6,'0');
function message(text,error=false){c.status.textContent=text;c.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}
function matchesSource(){return !!source&&source===services.REAnalysisUI.currentAnalysis()&&sourceGeneration===services.REAnalysisUI.getState().generation;}
function requireSource(){if(!matchesSource())throw Error('The inspected ROM or file selection changed. Open the intended ROM for analysis, then analyze native audio again.');}
function requireSession(){requireSource();if(!current())throw Error('Analyze a supported native audio profile first.');return current();}
function selectedChannel(){return current()?.evidence.native?.music.songs[songIndex]?.channels[channelIndex]||null;}
function editable(event){return channelIndex!==4&&!!event&&event.source?.length===1&&(event.kind==='instrument'||['note','cut'].includes(event.kind));}
function options(){return (selectedChannel()?.events||[]).map((event,index)=>({event,index})).filter(item=>editable(item.event));}
function chosen(){const event=selectedChannel()?.events[eventIndex];return editable(event)?event:null;}
function enable(){
 if(!c)return;const active=!!current()&&!busy;c.analyze.disabled=busy;
 for(const el of [c.song,c.channel,c.command,c.note,c.instrument])el.disabled=!active;
 c.apply.disabled=!active||!chosen();c.undo.disabled=!active||cursor<=0;c.redo.disabled=!active||cursor>=history.length-1;
 c.rom.disabled=!active;c.report.disabled=busy||!source||resultStatus==='idle';
 const entries=options();c.previous.disabled=!active||page===0;c.next.disabled=!active||(page+1)*PAGE>=entries.length;
}
function selectEvent(value){
 const index=Number(value);eventIndex=Number.isInteger(index)?index:-1;const event=chosen();
 c.command.value=event?String(eventIndex):'';c.noteWrap.hidden=event?.kind==='instrument';c.instrumentWrap.hidden=event?.kind!=='instrument';
 if(event){c.note.value=String(event.noteCode??0);c.note.max=String(channelIndex===3?16:60);c.instrument.value=String(event.instrumentId??0);const source=event.source;
 c.commandInfo.textContent='Native '+event.kind+' command · logical row '+event.row+' · file '+hx(source.fileOffset)+' · CPU '+hx(source.address)+' · current command byte '+hx(source.bytes[0])+'. '+(event.kind==='instrument'?'Choose an already decoded instrument.':channelIndex===3?'Noise codes 0–16; 0 cuts the channel.':'Native note codes 0–60; 0 cuts the channel. These are driver codes, not MIDI notes.')+(event.emptyFollowingRow?' The encoded following empty row is preserved.':'')+' Shared stream bytes may affect several song/channel events; their uses are reported after editing.';
 }else{c.commandInfo.textContent='This channel has no supported one-byte native note or instrument commands. DPCM and control-flow edits are unavailable.';}
 enable();return !!event;
}
function renderCommands(){
 const entries=options();page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(entries.length/PAGE)-1)));const shown=entries.slice(page*PAGE,(page+1)*PAGE);c.command.replaceChildren();
 for(const {event,index}of shown){const el=make('option',null,'Row '+event.row+' · '+event.kind+' '+(event.kind==='instrument'?event.instrumentId:event.noteCode)+' · '+hx(event.source.fileOffset));el.value=String(index);c.command.appendChild(el);}
 c.page.textContent=entries.length?(page*PAGE+1)+'–'+(page*PAGE+shown.length)+' of '+entries.length+' editable commands':'No editable commands';
 const pick=shown.some(item=>item.index===eventIndex)?eventIndex:shown[0]?.index??-1;selectEvent(pick);
}
function renderChannel(){
 const ch=selectedChannel(),song=current()?.evidence.native.music.songs[songIndex];
 c.channelInfo.textContent=ch?'Subsong header file '+hx(song.source.fileOffset)+' · channel stream CPU '+hx(ch.address)+' · Channel '+ch.channel+' · '+ch.events.length+' decoded command events · '+ch.logicalRows+' logical rows · loop '+JSON.stringify(ch.loop)+'. Song tempo accumulator steps: NTSC '+song.tempoSteps.NTSC+', PAL '+song.tempoSteps.PAL+'; initial speed '+song.initialSpeed+'. Logical rows are not fixed video frames.':'';
 renderCommands();
}
function renderSong(){
 const song=current()?.evidence.native.music.songs[songIndex];c.channel.replaceChildren();for(const [i,ch]of (song?.channels||[]).entries()){const el=make('option',null,ch.channel);el.value=String(i);c.channel.appendChild(el);}channelIndex=Math.min(channelIndex,Math.max(0,(song?.channels.length||1)-1));c.channel.value=String(channelIndex);renderChannel();
}
function describe(evidence){
 const identity=source?.report.identity,name=identity?.name||'ROM';
 const lines=[name,'Source SHA-256 '+(original?.sha256||identity?.sha256||'unknown'),'Status: '+evidence.status];
 if(evidence.source)lines.push('Current SHA-256 '+evidence.source.sha256);
 if(evidence.status==='decoded'){
 const native=evidence.native,driver=evidence.recognition.driver;lines.push('Supported linked profile: '+driver.variant,'Initialization region: '+driver.region,'Music: '+native.music.songs.length+' header subsongs; '+native.music.instruments.length+' referenced instruments; '+native.music.envelopes.length+' decoded envelopes.','SFX: '+native.sfx.effects.length+' statically referenced IDs. '+native.sfx.inventory+'.');
 if(native.sfx.effects.length)lines.push('Known SFX IDs: '+native.sfx.effects.map(effect=>effect.id).join(', '));
 lines.push('Native engine editing only. Canonical Audio import: '+native.conversion.status+'. No playback, audible fidelity or complete SFX inventory is claimed by this inspection.');
 }
 c.summary.textContent=lines.join('\n');
 c.details.textContent=[...(evidence.diagnostics||[]).map(d=>d.code+': '+d.message),...(evidence.limitations||[])].join('\n');
}
function render(){
 const item=current();if(!item){c.editor.hidden=true;enable();return;}c.editor.hidden=false;describe(item.evidence);
 c.song.replaceChildren();for(const [i,song]of item.evidence.native.music.songs.entries()){const el=make('option',null,'Subsong '+song.id);el.value=String(i);c.song.appendChild(el);}songIndex=Math.min(songIndex,item.evidence.native.music.songs.length-1);c.song.value=String(songIndex);
 c.instrument.replaceChildren();for(const instrument of item.evidence.native.music.instruments){const el=make('option',null,'Instrument '+instrument.id+' · duty '+instrument.duty);el.value=String(instrument.id);c.instrument.appendChild(el);}c.instrumentInfo.textContent=item.evidence.native.music.instruments.map(i=>'Instrument '+i.id+' · record '+hx(i.source.fileOffset)+' · duty '+i.duty+' · envelope CPU pointers '+Object.entries(i.envelopes).map(([name,address])=>name+' '+hx(address)).join(', ')).join('\n');
 c.sfxInfo.textContent=item.evidence.native.sfx.inventory+'.\n'+item.evidence.native.sfx.effects.map(effect=>'SFX '+effect.id+' · pointer table file '+hx(effect.source.fileOffset)+'\n'+['NTSC','PAL'].map(region=>{const stream=effect[region];return region+' · stream CPU '+hx(stream.address)+' · '+stream.byteLength+' native bytes · '+stream.events.length+' events · end at frame '+stream.endFrame+' · register targets '+stream.registers.map(hx).join(', ');}).join('\n')).join('\n')+'\nUnresolved call sites: '+(item.evidence.native.sfx.unresolvedCallSites?.length||0)+'. Unknown dynamically supplied IDs are not recovered.';
 renderSong();enable();
}
function clear(){source=null;sourceGeneration=-1;original=null;history=[];cursor=-1;songIndex=channelIndex=page=0;eventIndex=-1;resultStatus='idle';c.editor.hidden=true;c.summary.textContent='';c.details.textContent='';}
async function analyze(){
 if(busy)return false;const inspected=services.REAnalysisUI.currentAnalysis();if(!inspected){message('Open a ROM in General ROM Analysis first.',true);return false;}
 const token=++generation;clear();source=inspected;sourceGeneration=services.REAnalysisUI.getState().generation;busy=true;enable();message('Inspecting the supported native FamiTone2 driver profile…');
 try{
 const size=inspected.report.identity.byteLength;if(size>MAX_ROM){resultStatus='unknown';c.summary.textContent=inspected.report.identity.name+'\nSource SHA-256 '+inspected.report.identity.sha256+'\nStatus: unknown';c.details.textContent='This native NROM profile accepts at most '+MAX_ROM+' bytes (32 KiB PRG, 8 KiB CHR and an optional trainer). General inspection remains available.';message('Outside this native audio profile. No project or emulator change.');return false;}
 const bytes=Uint8Array.from(inspected.read(0,size).bytes),evidence=await model().decode(bytes);
 if(token!==generation||!matchesSource())throw Error('The inspected source changed while native analysis was running. Analyze the current ROM again.');
 if(evidence.source?.sha256&&evidence.source.sha256!==inspected.report.identity.sha256)throw Error('Native analysis source identity does not match the inspected ROM.');
 resultStatus=evidence.status;original={bytes:bytes.slice(),sha256:inspected.report.identity.sha256,name:inspected.report.identity.name,evidence:evidence.status==='decoded'?null:evidence};describe(evidence);
 if(evidence.status!=='decoded'){message((evidence.status==='unknown'?'No supported profile found.':evidence.status==='ambiguous'?'Ambiguous native profile; no editable copy selected.':'Native data rejected by the profile.')+' See the diagnostics. The project and emulator are unchanged.',evidence.status!=='unknown');return false;}
 history=[{bytes:bytes.slice(),sha256:evidence.source.sha256,evidence}];cursor=0;render();message('Native audio decoded into an isolated copy. Select a command to edit. Export the modified ROM before starting another analysis.');return true;
 }catch(error){if(token===generation){resultStatus='invalid';history=[];cursor=-1;message(error.message||String(error),true);}return false;}
 finally{if(token===generation){busy=false;enable();}}
}
async function applyEdit(){
 if(busy)return false;let item,event,edit,token,revision;
 try{item=requireSession();event=chosen();if(!event)throw Error('Choose an editable native command.');const raw=String(event.kind==='instrument'?c.instrument.value:c.note.value).trim();if(!/^\d+$/.test(raw))throw Error('Enter a whole-number native code.');const value=Number(raw),key=event.kind==='instrument'?'instrumentId':'noteCode';if(value===event[key]){message('This command already has that value.');return false;}edit={song:songIndex,channel:channelIndex,event:eventIndex,[key]:value};token=++generation;revision=editRevision;busy=true;enable();message('Rebuilding the native ROM copy and checking its structure…');
 const patched=await model().patch(item.bytes,item.evidence,[edit]);
 if(token!==generation||revision!==editRevision||item!==current()||!matchesSource())throw Error('Source or selection changed during the native edit. The previous copy is preserved.');
 if(patched.evidence?.status!=='decoded'||patched.sourceSha256!==item.evidence.source.sha256||patched.rebuiltSha256!==patched.evidence.source.sha256)throw Error('Native rebuild returned an inconsistent source identity.');
 delete item.evidence;history=history.slice(0,cursor+1);history.push({bytes:new Uint8Array(patched.rom),sha256:patched.rebuiltSha256,evidence:patched.evidence});cursor++;
 while(history.length>MAX_HISTORY||history.reduce((n,v)=>n+v.bytes.length,0)>MAX_HISTORY_BYTES){history.shift();cursor--;}
 render();const affected=patched.changes.flatMap(change=>change.affected||[]);message('Edited the native copy at '+patched.changes.map(change=>hx(change.fileOffset)).join(', ')+'. '+affected.length+' song/channel event use(s) share the edited byte: '+affected.slice(0,12).map(use=>'song '+use.song+' / channel '+use.channel+' / event '+use.event).join('; ')+(affected.length>12?' …':'')+'. The original ROM, project and emulator are unchanged.');return true;
 }catch(error){message(error.message||String(error),true);return false;}
 finally{if(token!==undefined&&token===generation){busy=false;enable();}}
}
async function moveHistory(delta){
 let token;try{if(busy)return false;const previous=requireSession(),next=cursor+delta;if(next<0||next>=history.length)return false;const target=history[next],revision=editRevision;token=++generation;busy=true;enable();
 const evidence=await model().decode(target.bytes);
 if(token!==generation||previous!==current()||revision!==editRevision||!matchesSource())throw Error('Source or selection changed while restoring native history. The current copy is preserved.');
 if(evidence.status!=='decoded'||evidence.source.sha256!==target.sha256)throw Error('Native history copy failed source revalidation.');
 delete previous.evidence;target.evidence=evidence;cursor=next;editRevision++;render();message(delta<0?'Undid one native-copy edit. The Forge project history is unchanged.':'Redid one native-copy edit. The Forge project history is unchanged.');return true;
 }catch(error){message(error.message||String(error),true);return false;}finally{if(token!==undefined&&token===generation){busy=false;enable();}}
}
function sessionReport(){
 requireSource();if(!original)return {format:'NESForgeNativeAudioSession',version:1,status:resultStatus,source:source.report.identity,diagnostics:[c.details.textContent]};
 const item=current(),bytes=item?.bytes||original.bytes,changes=[];for(let i=0;i<bytes.length;i++)if(bytes[i]!==original.bytes[i])changes.push({fileOffset:i,before:original.bytes[i],after:bytes[i]});
 return {format:'NESForgeNativeAudioSession',version:1,source:{name:original.name,sha256:original.sha256,byteLength:original.bytes.length},currentSha256:item?.evidence.source.sha256||original.sha256,changes,nativeEvidence:item?.evidence||original.evidence,editing:{method:'same-layout native command-byte edits',canonicalAudioImported:false,projectChanged:false,emulatorChanged:false,undoSteps:Math.max(0,cursor),redoSteps:Math.max(0,history.length-cursor-1),historyLimit:MAX_HISTORY,originalPreserved:true}};
}
async function download(kind){
 try{if(busy)throw Error('Wait for the native operation to finish.');requireSource();const token=generation,base=String(original?.name||source.report.identity.name||'ROM').replace(/\.[^.]*$/,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,80)||'ROM';let bytes,name,mime;
 if(kind==='rom'){const item=requireSession();bytes=item.bytes.slice();name=base+'-native-audio.nes';mime='application/octet-stream';}else{bytes=new TextEncoder().encode(JSON.stringify(sessionReport(),null,2));name=base+'-native-audio-evidence.json';mime='application/json';}
 const saved=await forgeSave.request(bytes,name,mime);if(token===generation&&matchesSource()){if(saved?.status==='cancelled')message('Save cancelled. Your native edit session is still available.');else if(saved?.status==='busy')message('Another Save As request is still open. Finish it, then export again.',true);else if(saved?.status==='saved')message('Saved '+name);else if(saved?.status==='download-requested')message('Download requested: '+name);else message('Export was not completed: '+(saved?.error?.message||saved?.message||saved?.status||'unknown save result')+'. Your native edit session is still available.',true);}return saved;
 }catch(error){message(error.message||String(error),true);return false;}
}
function getState(){return Object.freeze({busy,status:resultStatus,hasSession:!!current(),sourceSha256:original?.sha256||null,currentSha256:current()?.evidence.source.sha256||null,historyLength:history.length,cursor,sourceCurrent:matchesSource(),songIndex,channelIndex,eventIndex,page});}
// Detached source for the separate, explicit tracker-transcription preview.
// The consumer must revalidate this token before changing the editor project.
function getImportSource(){
 if(busy)throw Error('Wait for the native operation to finish.');
 const item=requireSession();
 return Object.freeze({bytes:item.bytes.slice(),sourceSha256:original.sha256,currentSha256:item.sha256,token:[generation,editRevision,cursor,songIndex,sourceGeneration].join(':'),songIndex,name:original.name});
}
function mount(){
 if(c)return c.panel;const host=document.getElementById('reAnalysisWorkspace');if(!host)return null;
 const style=make('style');style.textContent='#reNativeAudioPanel{border-top:1px solid #58627e;padding-top:10px;margin-top:14px}#reNativeAudioPanel button,#reNativeAudioPanel input,#reNativeAudioPanel select{min-height:44px;font:inherit;max-width:100%;box-sizing:border-box}#reNativeAudioPanel [hidden]{display:none!important}#reNativeAudioPanel pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}#reNativeAudioPanel label{min-width:0}#reNativeAudioPanel .native-audio-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}#reNativeAudioPanel select,#reNativeAudioPanel input{width:100%}';document.head.appendChild(style);
 const panel=make('section','reNativeAudioPanel');panel.setAttribute('aria-label','Native audio analysis and copy editing');panel.appendChild(make('h3',null,'Native audio · FamiTone2 profile'));
 panel.appendChild(make('p',null,'Analyze the currently inspected ROM for one supported linked FamiTone2 v1.11 profile. Edit supported native command bytes on a copy and export that ROM. Canonical Audio import remains separate. Starting another analysis clears this native edit session; export first.'));
 const actions=make('div');actions.className='re-analysis-actions';panel.appendChild(actions);const button=(parent,id,label,fn)=>{const el=make('button',id,label);el.type='button';el.addEventListener('click',fn);parent.appendChild(el);return el;};
 const analyzeButton=button(actions,'reNativeAudioAnalyze','Analyze current ROM',()=>{void analyze();}),summary=make('pre','reNativeAudioSummary'),status=make('p','reNativeAudioStatus');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(summary,status);
 const limits=make('details');limits.appendChild(make('summary',null,'Profile limits and diagnostics'));const details=make('pre','reNativeAudioDetails');limits.appendChild(details);panel.appendChild(limits);
 const editor=make('div','reNativeAudioEditor');editor.hidden=true;panel.appendChild(editor);const fields=make('div');fields.className='native-audio-fields';editor.appendChild(fields);
 const field=(parent,id,title,tag='select')=>{const wrap=make('label',null,title),el=make(tag,id);wrap.htmlFor=id;wrap.appendChild(el);parent.appendChild(wrap);return {wrap,el};};
 const song=field(fields,'reNativeAudioSong','Native subsong').el,channel=field(fields,'reNativeAudioChannel','Channel').el,channelInfo=make('p','reNativeAudioChannelInfo');editor.appendChild(channelInfo);
 const command=field(editor,'reNativeAudioCommand','Editable native command').el,paging=make('div');paging.className='re-analysis-actions';editor.appendChild(paging);
 const previous=button(paging,'reNativeAudioPrevious','Previous 100 commands',()=>{if(!busy&&page>0){page--;editRevision++;renderCommands();}}),next=button(paging,'reNativeAudioNext','Next 100 commands',()=>{if(!busy&&(page+1)*PAGE<options().length){page++;editRevision++;renderCommands();}}),pageText=make('span','reNativeAudioPage');paging.appendChild(pageText);
 const commandInfo=make('p','reNativeAudioCommandInfo');editor.appendChild(commandInfo);const editFields=make('div');editFields.className='native-audio-fields';editor.appendChild(editFields);const noteField=field(editFields,'reNativeAudioNote','Native note code · 0 cuts','input');noteField.el.type='text';noteField.el.inputMode='numeric';noteField.el.setAttribute('pattern','[0-9]*');noteField.el.autocomplete='off';const instrumentField=field(editFields,'reNativeAudioInstrument','Decoded instrument');
 const changes=make('div');changes.className='re-analysis-actions';editor.appendChild(changes);const apply=button(changes,'reNativeAudioApply','Apply native edit',()=>{void applyEdit();}),undo=button(changes,'reNativeAudioUndo','Undo native edit',()=>moveHistory(-1)),redo=button(changes,'reNativeAudioRedo','Redo native edit',()=>moveHistory(1));
 const instruments=make('details');instruments.appendChild(make('summary',null,'Referenced instrument evidence'));const instrumentInfo=make('pre','reNativeAudioInstrumentInfo');instruments.appendChild(instrumentInfo);editor.appendChild(instruments);const sfx=make('details');sfx.appendChild(make('summary',null,'Known SFX evidence · partial inventory'));const sfxInfo=make('pre','reNativeAudioSfxInfo');sfx.appendChild(sfxInfo);editor.appendChild(sfx);
 const exports=make('div');exports.className='re-analysis-actions';panel.appendChild(exports);const rom=button(exports,'reNativeAudioDownloadRom','Download native ROM copy',()=>{void download('rom');}),report=button(exports,'reNativeAudioDownloadReport','Download native evidence',()=>{void download('report');});
 c={panel,analyze:analyzeButton,summary,status,details,editor,song,channel,channelInfo,command,commandInfo,note:noteField.el,noteWrap:noteField.wrap,instrument:instrumentField.el,instrumentWrap:instrumentField.wrap,instrumentInfo,sfxInfo,previous,next,page:pageText,apply,undo,redo,rom,report};
 song.addEventListener('change',()=>{songIndex=Number(song.value);channelIndex=page=0;eventIndex=-1;editRevision++;renderSong();});channel.addEventListener('change',()=>{channelIndex=Number(channel.value);page=0;eventIndex=-1;editRevision++;renderChannel();});command.addEventListener('change',()=>{editRevision++;selectEvent(command.value);});for(const el of [c.note,c.instrument])el.addEventListener('input',()=>{editRevision++;});
 for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>event.stopPropagation?.());host.appendChild(panel);enable();message('Open a ROM for general analysis, then choose Analyze current ROM.');return panel;
}
services.RENativeAudioUI=Object.freeze({mount,analyze,applyEdit,undo:()=>moveHistory(-1),redo:()=>moveHistory(1),downloadRom:()=>download('rom'),downloadReport:()=>download('report'),getState,getImportSource});mount();
})();
