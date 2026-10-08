/* Explicit native music transcription into canonical Audio. Preview is isolated;
 * only the confirmed, still-current plan changes authoring data in one Undo. */
(()=>{
'use strict';
const services=window.Forge.services,copy=value=>JSON.parse(JSON.stringify(value));
let c=null,staged=null,busy=false,revision=0,operation=0,evidenceReport=null;
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const make=(tag,id,text)=>{const el=document.createElement(tag);if(id)el.id=id;if(text!==undefined)el.textContent=text;return el;};
function message(text,error=false){if(c){c.status.textContent=text;c.status.style.color=error?'var(--err, #ff9898)':'var(--dim)';}}
function enable(){if(!c)return;c.preview.disabled=busy;c.apply.disabled=busy||!staged;c.export.disabled=busy||!evidenceReport;}
function invalidate(){revision++;staged=null;enable();if(!busy)message('Selection changed. Preview the transcription again before importing.');}
function source(){const api=services.RENativeAudioUI;if(!api?.getImportSource)throw Error('Native audio transcription is unavailable in this build.');return api.getImportSource();}
function sourceKey(value){return JSON.stringify([value.token,value.sourceSha256,value.currentSha256,value.songIndex]);}
function projectGuard(){const store=services.ProjectStore;return {epoch:store.state.epoch,snapshot:store.serialize()};}
function checkGuard(item){
 if(item.revision!==revision)throw Error('The transcription options changed. Preview again.');
 if(item.sourceKey!==sourceKey(source()))throw Error('The native ROM copy or subsong changed. Preview again.');
 const store=services.ProjectStore;if(item.project.epoch!==store.state.epoch||item.project.snapshot!==store.serialize())throw Error('The project changed after preview. Preview again before importing.');
}
function settings(native){const text=String(c.rows.value).trim();if(!/^\d+$/.test(text)||Number(text)<1||Number(text)>1024)throw Error('Enter a whole number of native rows from 1 through 1024.');return {songIndex:native.songIndex,region:'NTSC',nativeRows:Number(text),rows:S.audRows,mode:'transcription'};}
function describe(result,item){
 const lines=['Subsong '+item.options.songIndex+' · first '+item.options.nativeRows+' native rows · NTSC','Current ROM SHA-256 '+item.source.currentSha256,'Status: '+result.status];
 if(result.imported){const data=result.imported;lines.push(data.patterns.length+' new editable patterns · '+data.instruments.length+' new instruments · '+data.orderList.length+' music order rows','Tracker tempo '+data.tempo+' · speed '+data.speed+' · '+data.rows+' rows per pattern', 'Excerpt duration: '+data.durationFrames+' NTSC video frames; '+data.paddingFrames+' cut/silent padding frames starting at the final cut. The canonical music order repeats this finite excerpt, including padding, from its start.');}
 for(const [title,key]of [['Warnings','warnings'],['Support and refusals','diagnostics'],['Limits','limitations']]){const values=result[key];if(Array.isArray(values)&&values.length)lines.push(title+':',...values.map(value=>typeof value==='string'?value:(value.code?value.code+': ':'')+(value.message||JSON.stringify(value))));}
 if(result.provenance){const fidelity=result.provenance.fidelity;if(fidelity)lines.push('Pitch mappings changed: '+fidelity.changedPitchMappings+' · largest tuning difference '+Number(fidelity.maxAbsoluteCents).toFixed(3)+' cents.');const evidence=JSON.stringify(result.provenance,null,2);c.evidence.textContent=evidence.length>32768?evidence.slice(0,32768)+'\n[Detailed evidence display truncated at 32 KiB; the summary and all import guards use the complete conversion.]':evidence;}
 lines.push('This is an editable score transcription. Native driver behavior, SFX, gameplay triggers and original engine layout are not imported. Source timing/pitch/envelope differences and any padding are described above. The selected finite excerpt does not recover the whole game or its original song loop.');
 c.summary.textContent=lines.join('\n');
}
async function preview(){
 if(busy)return false;staged=null;evidenceReport=null;const id=++operation;busy=true;enable();c.summary.textContent='';c.evidence.textContent='';
 try{const native=source(),options=settings(native),item={source:native,sourceKey:sourceKey(native),project:projectGuard(),options,revision};message('Previewing the selected native music excerpt…');
 const api=window.FamiTone2AudioImport;if(!api?.preview)throw Error('The native transcription model is unavailable in this build.');
 const result=await api.preview(native.bytes,options);checkGuard(item);if(id!==operation)throw Error('Preview was superseded. Preview again.');
 if(result.sourceSha256!==native.currentSha256)throw Error('Transcription source identity does not match the native ROM copy.');
 describe(result,item);if(result.status!=='ready'||!result.imported){message('This excerpt is not supported for transcription. Read the diagnostics; the project is unchanged.',true);return false;}
 const validated=validateImport(item,result);c.summary.textContent+='\nAudio Runtime data estimate: '+validated.estimatedBytes+' bytes. This does not prove that the complete ROM fits; the build also includes your scenes, gameplay and other data.';staged={...item,result:copy(result)};evidenceReport=reportFor(staged,'preview');message('Preview ready. Read the conversion differences, then choose Transcribe music into AUDIO. Existing patterns, instruments and SFX definitions remain; tempo/speed and the current music order will be replaced. Existing SFX playback timing uses that new tempo/speed.');return true;
 }catch(error){staged=null;message(error.message||String(error),true);return false;}finally{if(id===operation){busy=false;enable();}}
}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(label+' must be an integer from '+min+' through '+max+'.');}
function validateImport(item,result){
 const imported=copy(result.imported),p=JSON.parse(item.project.snapshot),patternOffset=p.patterns.length,instrumentOffset=p.instruments.length;
 if(!Array.isArray(imported.patterns)||!imported.patterns.length||!Array.isArray(imported.instruments)||!Array.isArray(imported.orderList)||!imported.orderList.length)throw Error('Transcription returned incomplete Audio data.');
 if(imported.rows!==p.audRows)throw Error('Transcription pattern size no longer matches the project.');
 integer(imported.rows,16,128,'Pattern rows');integer(imported.tempo,30,300,'Tempo');integer(imported.speed,1,15,'Speed');
 if(patternOffset+imported.patterns.length>256)throw Error('Existing and transcribed patterns exceed 256. Shorten the excerpt or use a project with fewer patterns.');
 if(instrumentOffset+imported.instruments.length>255)throw Error('Existing and transcribed instruments exceed 255.');
 if(imported.orderList.length>255)throw Error('The transcribed music order exceeds 255 entries. Shorten the excerpt.');
 for(const pattern of imported.patterns){if(!Array.isArray(pattern.rows)||pattern.rows.length!==imported.rows)throw Error('Transcription has inconsistent pattern rows.');for(const row of pattern.rows){if(!Array.isArray(row)||row.length!==5)throw Error('Each transcription row requires five canonical channels.');for(const cell of row){integer(cell.note,-2,95,'Note');integer(cell.inst,-1,imported.instruments.length-1,'Instrument reference');integer(cell.vol,-1,15,'Volume');integer(cell.fx,0,255,'Effect');integer(cell.fxp,0,255,'Effect value');if(cell.inst>=0)cell.inst+=instrumentOffset;}}}
 const orderList=imported.orderList.map(row=>{if(!Array.isArray(row)||row.length!==5)throw Error('Transcription order requires five channel references.');return row.map(index=>{integer(index,0,imported.patterns.length-1,'Pattern reference');return index+patternOffset;});});
 const patterns=p.patterns.concat(imported.patterns),instruments=p.instruments.concat(imported.instruments),next={...p,patterns,instruments,orderList,tempo:imported.tempo,speed:imported.speed};
 const prepared=services.ProjectStore.prepareLoad(next);
 if(canonical(prepared.patterns.slice(patternOffset))!==canonical(imported.patterns)||canonical(prepared.instruments.slice(instrumentOffset))!==canonical(imported.instruments))throw Error('The transcription would change during project normalization. Import was refused.');
 const plan=services.AudioCompiler.plan({...next,audioRuntime:{...next.audioRuntime,enabled:true,musicEnabled:true}});
 return {estimatedBytes:plan.estimatedBytes,patterns,instruments,orderList,tempo:imported.tempo,speed:imported.speed,patternOffset,instrumentOffset,patternCount:imported.patterns.length,instrumentCount:imported.instruments.length};
}
async function importMusic(){
 if(busy)return false;if(!staged){message('Preview a supported transcription first.',true);return false;}const item=staged,id=++operation;busy=true;enable();
 try{checkGuard(item);const native=source(),api=window.FamiTone2AudioImport,result=await api.preview(native.bytes,item.options);checkGuard(item);
 if(id!==operation||staged!==item)throw Error('The preview changed. Preview again.');
 if(result.status!=='ready'||JSON.stringify(result)!==JSON.stringify(item.result))throw Error('The transcription changed during revalidation. Preview again before importing.');
 const data=validateImport(item,result);
 if(!confirm('Transcribe subsong '+item.options.songIndex+' into AUDIO and replace the current music order?\n\nThis imports only the selected '+item.options.nativeRows+'-native-row NTSC excerpt. Tuning and native driver behavior can differ; review the displayed conversion evidence. SFX and gameplay triggers are not recovered.\n\nExisting patterns, instruments, SFX definitions and runtime settings remain. Global tempo/speed change to 150/1; this also changes existing SFX playback timing. One Undo restores the previous song. The original ROM and emulator remain unchanged.')){message('Transcription cancelled. The project and history are unchanged.');return false;}
 checkGuard(item); // Dialogs/adapters may allow project or source changes.
 snapshot();S.patterns=data.patterns;S.instruments=data.instruments;S.orderList=data.orderList;S.tempo=data.tempo;S.speed=data.speed;
 // Playback is not started and the emulator is never touched. Stop any tracker
 // preview only after a successful commit so its row cursor cannot run into the
 // newly replaced order. Presentation failures do not undo a committed import.
 staged=null;evidenceReport=reportFor(item,'imported');const issues=[];
 try{notify('nativeAudioTranscription');}catch(error){Forge15.dirty=true;issues.push('change notification: '+(error.message||String(error)));}
 try{aud_stop();aud_currentOrder=0;aud_currentRow=0;aud_selectedInst=data.instrumentCount?data.instrumentOffset:-1;}catch(error){issues.push('tracker playback cleanup: '+(error.message||String(error)));}
 try{render();services.AudioUI?.refresh();}catch(error){issues.push('display refresh: '+(error.message||String(error)));}
 const warning=issues.length?' Audio data was imported, but '+issues.join('; ')+'. Save the project and reopen it.':'';
 message('Transcribed '+data.patternCount+' patterns and '+data.instrumentCount+' instruments into AUDIO. Save Project As preserves the editable score. Undo restores the previous song. Runtime settings are unchanged; enable Compile Audio Runtime when you choose to build.'+warning,!!warning);return {patternOffset:data.patternOffset,instrumentOffset:data.instrumentOffset,patternCount:data.patternCount,instrumentCount:data.instrumentCount};
 }catch(error){staged=null;message(error.message||String(error),true);return false;}finally{if(id===operation){busy=false;enable();}}
}
function reportFor(item,outcome){
 const data=item.result.imported;return copy({format:'NESForgeNativeAudioTranscriptionEvidence',version:1,method:item.result.method,outcome,source:{name:item.source.name,originalSha256:item.source.sourceSha256,currentSha256:item.source.currentSha256},options:item.options,summary:{patterns:data.patterns.length,instruments:data.instruments.length,notes:data.noteCount,tempo:data.tempo,speed:data.speed,durationFrames:data.durationFrames,paddingFrames:data.paddingFrames},warnings:item.result.warnings,limitations:item.result.limitations,provenance:item.result.provenance,notice:'Historical conversion snapshot only. This is not a Forge project, native session, complete game recovery, current-project proof, or audible/hardware equivalence evidence. Complete ROM images and project snapshots are not included.'});
}
async function downloadEvidence(){
 try{if(busy)throw Error('Wait for the transcription operation to finish.');if(!evidenceReport)throw Error('Preview a supported transcription before exporting its evidence.');
 const report=evidenceReport,base=String(report.source.name||'ROM').replace(/\.[^.]*$/,'').replace(/[^a-z0-9._-]/gi,'_').slice(0,80)||'ROM',name=base+'-audio-transcription-evidence.json';
 const bytes=new TextEncoder().encode(JSON.stringify(report,null,2)),saved=await forgeSave.request(bytes,name,'application/json');
 if(report===evidenceReport){if(saved?.status==='cancelled')message('Evidence save cancelled. The transcription and project are unchanged.');else if(saved?.status==='busy')message('Another Save As request is open. Finish it, then export the evidence again.',true);else if(saved?.status==='saved')message('Saved historical transcription evidence: '+name);else if(saved?.status==='download-requested')message('Download requested for historical transcription evidence: '+name);else message('Evidence export was not completed: '+(saved?.error?.message||saved?.message||saved?.status||'unknown save result')+'. The report remains available.',true);}return saved;
 }catch(error){message(error.message||String(error),true);return false;}
}
function mount(){
 if(c)return c.panel;const host=document.getElementById('reNativeAudioPanel');if(!host)return null;
 const panel=make('section','reNativeAudioImportPanel');panel.setAttribute('aria-label','Transcribe native music into editable Audio');panel.appendChild(make('h3',null,'Transcribe native music into AUDIO'));
 panel.appendChild(make('p',null,'First analyze native audio and choose its Native subsong above. Preview a finite NTSC music excerpt, inspect the conversion differences, then explicitly add it to editable AUDIO patterns. This does not reproduce the original sound engine or import native SFX.'));
 const label=make('label',null,'Native rows in excerpt (1–1024)'),rows=make('input','reNativeAudioImportRows');label.htmlFor=rows.id;rows.type='text';rows.inputMode='numeric';rows.autocomplete='off';rows.setAttribute('pattern','[0-9]*');rows.value='64';label.appendChild(rows);panel.appendChild(label);
 const actions=make('div');actions.className='re-analysis-actions';panel.appendChild(actions);const button=(id,text,fn)=>{const el=make('button',id,text);el.type='button';el.addEventListener('click',()=>{void fn();});actions.appendChild(el);return el;};
 const previewButton=button('reNativeAudioImportPreview','Preview import to AUDIO',preview),apply=button('reNativeAudioImportApply','Transcribe music into AUDIO',importMusic),exportButton=button('reNativeAudioImportEvidenceExport','Download transcription evidence',downloadEvidence),summary=make('pre','reNativeAudioImportSummary'),status=make('p','reNativeAudioImportStatus');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(summary,status);const details=make('details');details.appendChild(make('summary',null,'Conversion evidence'));const evidence=make('pre','reNativeAudioImportEvidence');details.appendChild(evidence);panel.appendChild(details);host.appendChild(panel);
 c={panel,rows,preview:previewButton,apply,export:exportButton,summary,status,evidence};rows.addEventListener('input',invalidate);for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>event.stopPropagation?.());enable();message('Analyze native audio above, choose a subsong, then preview its transcription.');return panel;
}
services.RENativeAudioImportUI=Object.freeze({mount,preview,importMusic,downloadEvidence,getState:()=>Object.freeze({busy,staged:!!staged,hasEvidence:!!evidenceReport,evidenceOutcome:evidenceReport?.outcome||null,sourceSha256:staged?.source.currentSha256||null,songIndex:staged?.options.songIndex??null,nativeRows:staged?.options.nativeRows??null})});mount();
})();
