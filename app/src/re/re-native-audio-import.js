/* Shared native music/SFX transcription lifecycle. Converters return detached
 * canonical proposals; ProjectStore alone installs bounded Audio appends. */
(()=>{
'use strict';
const services=window.Forge.services,copy=value=>JSON.parse(JSON.stringify(value)),stages=new WeakSet(),signals=new WeakMap();
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(label+' must be an integer from '+min+' through '+max+'.');}
function checkSignal(signal){if(signal?.aborted){const error=Error('Native Audio import cancelled.');error.name='AbortError';throw error;}}
function sourceKey(value){return JSON.stringify([value.token,value.sourceSha256,value.currentSha256,value.songIndex]);}
function readSource(input){
 const value=typeof input==='function'?input():input;
 if(!value||!(value.bytes instanceof Uint8Array)||typeof value.token!=='string'||value.token.length>512||! /^[0-9a-f]{64}$/.test(value.sourceSha256)||! /^[0-9a-f]{64}$/.test(value.currentSha256)||typeof value.name!=='string'||value.name.length>512||!Number.isSafeInteger(value.songIndex)||value.songIndex<0||value.songIndex>255)throw Error('A current native Audio source and identity are required.');
 return value;
}
function metadata(source){return {token:source.token,sourceSha256:source.sourceSha256,currentSha256:source.currentSha256,songIndex:source.songIndex,name:source.name};}
function converter(kind,profile){if(profile==='native-catalog'){const api=services.NativeAudioRecovery;if(!api?.preview)throw Error('Native catalog conversion is unavailable.');return api;}if(profile!==undefined)throw Error('Unknown native Audio conversion profile.');const api=kind==='music'?window.FamiTone2AudioImport:window.FamiTone2SfxImport;if(!api?.preview)throw Error('The native transcription model is unavailable in this build.');return api;}
function projectGuard(){const store=services.ProjectStore;return {epoch:store.state.epoch,snapshot:store.serialize()};}
function checkGuard(item,currentSource){
 if(currentSource&&item.sourceKey!==sourceKey(readSource(currentSource)))throw Error('The native ROM copy or subsong changed. Preview again.');
 const store=services.ProjectStore;if(item.project.epoch!==store.state.epoch||item.project.snapshot!==store.serialize())throw Error('The project changed after preview. Preview again before importing.');
}
function validateImport(item,result){
 const imported=copy(result.imported),p=JSON.parse(item.project.snapshot),patternOffset=p.patterns.length,instrumentOffset=p.instruments.length,sfxOffset=p.sfx.length,isMusic=item.kind==='music';
 if(!Array.isArray(imported.patterns)||!imported.patterns.length||!Array.isArray(imported.instruments)||(isMusic?(!Array.isArray(imported.orderList)||!imported.orderList.length):(!Array.isArray(imported.sfx)||!imported.sfx.length)))throw Error('Transcription returned incomplete Audio data.');
 if(imported.rows!==p.audRows)throw Error('Transcription pattern size no longer matches the project.');
 integer(imported.rows,16,128,'Pattern rows');integer(imported.tempo,30,300,'Tempo');integer(imported.speed,1,15,'Speed');
 if(patternOffset+imported.patterns.length>256)throw Error('Existing and transcribed patterns exceed 256. Shorten the excerpt or use a project with fewer patterns.');
 if(instrumentOffset+imported.instruments.length>255)throw Error('Existing and transcribed instruments exceed 255.');
 if(isMusic&&imported.orderList.length>255)throw Error('The transcribed music order exceeds 255 entries. Shorten the excerpt.');
 if(!isMusic&&(p.tempo!==150||p.speed!==1||imported.tempo!==150||imported.speed!==1))throw Error('SFX transcription requires project tempo 150 and speed 1; existing music timing cannot be changed by SFX import.');
 for(const pattern of imported.patterns){if(!Array.isArray(pattern.rows)||pattern.rows.length!==imported.rows)throw Error('Transcription has inconsistent pattern rows.');for(const row of pattern.rows){if(!Array.isArray(row)||row.length!==5)throw Error('Each transcription row requires five canonical channels.');for(const cell of row){integer(cell.note,-2,95,'Note');integer(cell.inst,-1,imported.instruments.length-1,'Instrument reference');integer(cell.vol,-1,15,'Volume');integer(cell.fx,0,255,'Effect');integer(cell.fxp,0,255,'Effect value');if(cell.inst>=0)cell.inst+=instrumentOffset;}}}
 const patterns=p.patterns.concat(imported.patterns),instruments=p.instruments.concat(imported.instruments),fields={patterns,instruments};
 if(isMusic){fields.orderList=imported.orderList.map(row=>{if(!Array.isArray(row)||row.length!==5)throw Error('Transcription order requires five channel references.');return row.map(index=>{integer(index,0,imported.patterns.length-1,'Pattern reference');return index+patternOffset;});});fields.tempo=imported.tempo;fields.speed=imported.speed;}
 else{
  if(sfxOffset+imported.sfx.length>255)throw Error('Existing and transcribed SFX exceed 255.');
  const ids=new Set(p.sfx.map(sfx=>sfx.id));for(const sfx of imported.sfx){if(typeof sfx.id!=='string'||!sfx.id.trim()||sfx.id.length>80||typeof sfx.name!=='string'||!sfx.name.trim()||sfx.name.length>80)throw Error('Transcribed SFX require bounded stable IDs and names.');if(ids.has(sfx.id))throw Error('This native SFX is already in the project: '+sfx.id);ids.add(sfx.id);integer(sfx.channel,0,3,'SFX channel');integer(sfx.pattern,0,imported.patterns.length-1,'SFX pattern');integer(sfx.startRow,0,imported.rows-1,'SFX start row');integer(sfx.endRow,sfx.startRow,imported.rows-1,'SFX end row');sfx.pattern+=patternOffset;}
  fields.sfx=p.sfx.concat(imported.sfx);
 }
 const next={...p,...fields},prepared=services.ProjectStore.prepareLoad(next);
 if(canonical(prepared.patterns.slice(patternOffset))!==canonical(imported.patterns)||canonical(prepared.instruments.slice(instrumentOffset))!==canonical(imported.instruments)||!isMusic&&canonical(prepared.sfx.slice(sfxOffset))!==canonical(imported.sfx))throw Error('The transcription would change during project normalization. Import was refused.');
 const plan=services.AudioCompiler.plan({...next,audioRuntime:{...next.audioRuntime,enabled:true,musicEnabled:isMusic?true:next.audioRuntime.musicEnabled}});
 return {estimatedBytes:plan.estimatedBytes,...fields,patternOffset,instrumentOffset,patternCount:imported.patterns.length,instrumentCount:imported.instruments.length,sfxOffset,sfxCount:isMusic?0:imported.sfx.length};
}
async function stage(source,options={},controls={}){
 if(!options||typeof options!=='object'||Array.isArray(options)||!['music','sfx'].includes(options.kind))throw Error('Choose native music or SFX transcription.');
 if(controls.signal!==undefined&&(!controls.signal||typeof controls.signal.aborted!=='boolean'))throw Error('Cancellation signal requires a boolean aborted state.');
 checkSignal(controls.signal);const native=readSource(source),{kind,profile,...settings}=options,item={kind,...(profile===undefined?{}:{profile}),options:copy(settings),source:metadata(native),sourceKey:sourceKey(native),project:projectGuard()};
 const result=await converter(kind,profile).preview(native.bytes.slice(),item.options,{signal:controls.signal});checkSignal(controls.signal);checkGuard(item,source);
 if(result.sourceSha256!==item.source.currentSha256)throw Error('Transcription source identity does not match the native ROM copy.');
 const data=result.status==='ready'&&result.imported?validateImport(item,result):null,value=freeze({...item,result:copy(result),data});
 if(data){stages.add(value);signals.set(value,controls.signal);}return value;
}
async function revalidate(item,currentSource){
 if(!stages.has(item))throw Error('Preview a supported transcription first.');
 const signal=signals.get(item);checkSignal(signal);checkGuard(item,currentSource);const native=readSource(currentSource),result=await converter(item.kind,item.profile).preview(native.bytes.slice(),item.options,{signal});checkSignal(signal);checkGuard(item,currentSource);
 if(result.status!=='ready'||JSON.stringify(result)!==JSON.stringify(item.result))throw Error('The transcription changed during revalidation. Preview again before importing.');
 return freeze(validateImport(item,result));
}
async function commit(item,currentSource){
 const data=await revalidate(item,currentSource);checkSignal(signals.get(item));checkGuard(item,currentSource);
 const fields={patterns:data.patterns,instruments:data.instruments};if(item.kind==='music')Object.assign(fields,{orderList:data.orderList,tempo:data.tempo,speed:data.speed});else fields.sfx=data.sfx;
 const applied=services.ProjectStore.applyAudioImport(fields,{kind:item.kind,expected:item.project,intent:item.kind==='music'?'nativeAudioTranscription':'nativeSfxTranscription'});
 stages.delete(item);signals.delete(item);return freeze({...data,warnings:applied.warnings});
}
services.RENativeAudioImport=Object.freeze({version:1,stage,revalidate,commit});
})();
