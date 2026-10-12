/* Trusted adapters for the existing recovery implementations. Discovery never
 * imports assets or runs a ROM. Native edits return a separate byte copy. */
(()=>{
'use strict';
const services=window.Forge.services,methods=services.REMethods;
const ID='nes.famitone2-native.v1',MAX_SOURCE=41488,MAX_DATA=2*1024*1024-65536,DECODE_WORK=131072;
const limitations=Object.freeze([
 'One linked FamiTone2 v1.11 NROM driver configuration is recognized by instruction structure and reachable initialization, without filename or ROM-hash allowlists.',
 'Native recognition does not establish that a selected song is representable by the AUDIO tracker. Conversion performs its own explicit representability check.',
 'Native patching supports existing one-byte note/cut or instrument commands only. It returns a ROM copy and cannot insert data or change the original engine layout.',
 'Canonical music transcription is a finite NTSC excerpt with declared tuning and playback differences. Explicit SFX conversion supports bounded single-pulse effects with separate timing and mixing limits; multichannel SFX, DPCM, game triggers and lossless inverse conversion are not supported.',
 'Inspection, copied-ROM patching and conversion previews do not change the active project, its history, or the emulator. Imports remain explicit authoring actions.',
 'Sources are limited to 41,488 bytes, native decoding to its existing 16,384-event budget, and shared results to 2 MiB. Larger or unsupported sources remain open for general inspection.'
]);
const clone=value=>JSON.parse(JSON.stringify(value));
function fail(message){throw Error('Recovery profile: '+message);}
function diagnostic(status,reason,code){return {status,reason,evidence:[],data:{nativeStatus:status,diagnostics:[{code,message:reason}]}};}
function optionsObject(options,allowed){if(!options||typeof options!=='object'||Array.isArray(options))fail('Options must be an object.');for(const key of Object.keys(options))if(!allowed.includes(key))fail('Unknown option: '+key);}
function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)fail(label+' must be an integer from '+min+' to '+max+'.');return v;}
function nativeApi(){if(!window.FamiTone2Native?.decode||!window.FamiTone2Native?.patch)fail('The native Audio model is unavailable.');return window.FamiTone2Native;}
function bytes(analysis,context){
 const source=analysis.report.identity;
 if(source.byteLength>MAX_SOURCE)fail('Source exceeds the 41,488-byte native profile bound.');
 const read=context.read(0,source.byteLength),value=new Uint8Array(read.bytes);
 if(value.length!==source.byteLength||nativeApi().sha256(value)!==source.sha256)fail('The inspected source bytes do not match their physical SHA-256 identity.');
 return value;
}
function decode(value,context){context.consume(DECODE_WORK);context.throwIfAborted();const result=nativeApi().decode(value);context.throwIfAborted();return result;}
function classify(result){if(result.status==='decoded')return 'supported';if(result.status==='ambiguous'||result.status==='invalid')return result.status;return result.diagnostics?.some(d=>/^UNSUPPORTED_/.test(d.code))?'unsupported':'unknown';}
function reason(result){return (result.diagnostics||[]).map(d=>d.message).join(' ').slice(0,1900)||'Native profile did not establish supported driver and data structures.';}
function ranges(spans){
 const unique=new Map();for(const s of spans.filter(Boolean)){if(Number.isSafeInteger(s.fileOffset)&&Number.isSafeInteger(s.length)&&s.length>0)unique.set(s.fileOffset+':'+s.length,{start:s.fileOffset,length:s.length});}
 const sorted=[...unique.values()].sort((a,b)=>a.start-b.start||a.length-b.length),out=[];
 for(const span of sorted){const last=out[out.length-1];if(last&&span.start<=last.start+last.length)last.length=Math.max(last.start+last.length,span.start+span.length)-last.start;else out.push({...span});}
 if(out.length>1024)fail('Evidence exceeds the physical range bound.');return out;
}
function decodedEvidence(result,extra=[]){return [{status:'decoded',claim:'The linked driver and native music header pass the existing FamiTone2 decoder. The listed ranges support this inventory and the selected command page.',sourceSha256:result.source.sha256,ranges:ranges([result.recognition.driver.source,result.native.music.source,...extra])}];}
function summary(result,options={}){
 const music=result.native.music,song=integer(options.songIndex??0,0,music.songs.length-1,'Subsong'),channel=integer(options.channel??0,0,4,'Channel'),events=music.songs[song].channels[channel].events;
 const offset=integer(options.eventOffset??0,0,events.length,'Command offset'),limit=integer(options.eventLimit??100,1,100,'Command page length'),page=events.slice(offset,offset+limit);
 return {nativeStatus:'decoded',decoderMethod:result.method,source:clone(result.source),recognition:clone(result.recognition),songs:music.songs.map(s=>({id:s.id,source:clone(s.source),tempoSteps:clone(s.tempoSteps),initialSpeed:s.initialSpeed,initialAccumulator:s.initialAccumulator,channels:s.channels.map(c=>({index:c.index,channel:c.channel,address:c.address,eventCount:c.events.length,loop:clone(c.loop)}))})),instrumentCount:music.instruments.length,envelopeCount:music.envelopes.length,sfx:{inventory:result.native.sfx.inventory,effects:result.native.sfx.effects.map(e=>({id:e.id,source:clone(e.source),NTSC:{address:e.NTSC.address,byteLength:e.NTSC.byteLength,endFrame:e.NTSC.endFrame,registers:clone(e.NTSC.registers)},PAL:{address:e.PAL.address,byteLength:e.PAL.byteLength,endFrame:e.PAL.endFrame,registers:clone(e.PAL.registers)}}))},commands:{songIndex:song,channel,offset,limit,total:events.length,nextOffset:offset+limit<events.length?offset+limit:null,events:clone(page)},conversion:{status:'not-checked',reason:'Choose an explicit canonical transcription preview; native recognition alone does not establish representability.'},limitations:clone(result.limitations)};
}
function bounded(result){if(JSON.stringify(result).length>MAX_DATA)return diagnostic('unsupported','The requested operation exceeds the shared 2 MiB result bound. Choose a shorter transcription excerpt or smaller command page.','OUTPUT_LIMIT');return result;}
function unsupported(result){return {status:classify(result),reason:reason(result),evidence:[],data:{nativeStatus:result.status,diagnostics:clone(result.diagnostics||[]),recognition:result.recognition?clone(result.recognition):null}};}
function expected(options,analysis){if(options.expectedSourceSha256!==undefined&&options.expectedSourceSha256!==analysis.report.identity.sha256)fail('The inspected ROM changed; its SHA-256 no longer matches the expected source.');}
function inspect(analysis,options,context){
 optionsObject(options,['songIndex','channel','eventOffset','eventLimit','expectedSourceSha256']);expected(options,analysis);
 const result=decode(bytes(analysis,context),context);if(result.status!=='decoded')return unsupported(result);
 const data=summary(result,options);return bounded({status:'supported',reason:'Native music, referenced instruments and statically proven SFX are decoded; no authoring or emulator state changed.',evidence:decodedEvidence(result,data.commands.events.map(e=>e.source)),data});
}
function patch(analysis,options,context){
 optionsObject(options,['edits','expectedSourceSha256']);expected(options,analysis);
 if(!Array.isArray(options.edits)||!options.edits.length||options.edits.length>256)fail('Provide 1–256 explicit native edits.');
 const value=bytes(analysis,context),result=decode(value,context);if(result.status!=='decoded')return unsupported(result);
 // patch() independently decodes its input and copied output; retain those guards.
 context.consume(DECODE_WORK*2);context.throwIfAborted();const rebuilt=nativeApi().patch(value,result,options.edits);context.throwIfAborted();
 const inputSource=clone(analysis.report.identity),outputSource={...inputSource,sha256:rebuilt.rebuiltSha256,byteLength:rebuilt.rom.length};
 return bounded({status:'supported',reason:'A copied ROM contains the validated native command edits; the original inspection, project and emulator are unchanged.',evidence:[...decodedEvidence(result),{status:'decoded',claim:'These original source bytes identify the explicitly requested native command edits. The separate output identity identifies the redecoded ROM copy.',sourceSha256:inputSource.sha256,ranges:ranges(rebuilt.changes.map(c=>({fileOffset:c.fileOffset,length:1})))}],data:{nativeStatus:'decoded',inputSource,outputSource,rom:Array.from(rebuilt.rom),changes:clone(rebuilt.changes),method:rebuilt.method,outputNative:summary(rebuilt.evidence),originalUnchanged:true}});
}
function convertSfx(analysis,options,context){
 optionsObject(options,['resourceKind','effectId','region','rows','mode','expectedSourceSha256']);expected(options,analysis);
 if(!window.FamiTone2SfxImport?.preview)fail('The canonical SFX transcription model is unavailable.');
 const value=bytes(analysis,context);context.consume(DECODE_WORK+16384+8192);context.throwIfAborted();
 const {resourceKind,...conversionOptions}=options;
 const converted=window.FamiTone2SfxImport.preview(value,{...conversionOptions,expectedSourceSha256:analysis.report.identity.sha256});context.throwIfAborted();
 if(converted.status!=='ready')return {status:'unsupported',reason:reason(converted),evidence:[],data:{conversion:clone(converted),sourceUnchanged:true}};
 const p=converted.provenance;
 return bounded({status:'supported',reason:'The selected single-pulse effect is ready as an editable canonical SFX preview with declared timing, tuning and mixing differences. It has not been imported.',evidence:[{status:'converted',claim:'A finite native register stream was transcribed into an ordinary pattern-backed SFX. Listed ranges identify the driver, effect pointer and stream commands. Native mixing and pulse phase are not reproduced.',sourceSha256:analysis.report.identity.sha256,ranges:ranges([p.driver,p.effectSource,...p.events.map(e=>e.source)])}],data:{conversion:clone(converted),inputSource:clone(analysis.report.identity),sourceUnchanged:true,canonicalCommit:false,inverseSupported:false}});
}
function convert(analysis,options,context){
 if(options?.resourceKind!==undefined){
  if(options.resourceKind==='sfx')return convertSfx(analysis,options,context);
  if(options.resourceKind!=='music')fail('Resource kind must be music or sfx.');
  const {resourceKind,...musicOptions}=options;options=musicOptions;
 }
 optionsObject(options,['songIndex','region','nativeRows','rows','mode','expectedSourceSha256']);expected(options,analysis);
 if(!window.FamiTone2AudioImport?.preview)fail('The canonical Audio transcription model is unavailable.');
 const value=bytes(analysis,context);context.consume(DECODE_WORK+16384+8192);context.throwIfAborted();
 const converted=window.FamiTone2AudioImport.preview(value,{nativeRows:64,...options,expectedSourceSha256:analysis.report.identity.sha256});context.throwIfAborted();
 if(converted.status!=='ready')return {status:'unsupported',reason:reason(converted),evidence:[],data:{conversion:clone(converted),sourceUnchanged:true}};
 const p=converted.provenance;
 return bounded({status:'supported',reason:'The finite music excerpt is ready as an editable canonical AUDIO preview with the listed fidelity differences. It has not been imported.',evidence:[{status:'converted',claim:'A finite canonical AUDIO excerpt was transcribed. Listed ranges include the driver, song header and first 100 event sources; complete event provenance is in the preview data. This is not a lossless native-engine inverse.',sourceSha256:analysis.report.identity.sha256,ranges:ranges([p.driver,p.songSource,...p.events.slice(0,100).map(e=>e.source)])}],data:{conversion:clone(converted),inputSource:clone(analysis.report.identity),sourceUnchanged:true,canonicalCommit:false,inverseSupported:false}});
}
methods.registerProfile({id:ID,version:1,contractVersion:2,name:'FamiTone2 native music and canonical transcription',domains:['audio'],limitations,limits:{maxSourceBytes:MAX_SOURCE,maxWork:1048576},operations:{inspect:{label:'Inspect native Audio',effect:'read-only'},patch:{label:'Patch native commands in a ROM copy',effect:'native-copy'},convert:{label:'Preview editable AUDIO transcription',effect:'preview',fidelity:'lossy'}},probe(analysis,context){
 const result=decode(bytes(analysis,context),context);if(result.status!=='decoded')return unsupported(result);
 return {status:'supported',reason:'Linked FamiTone2 driver and native data decoded. Canonical transcription still requires its own song and fidelity check.',evidence:decodedEvidence(result),data:{nativeStatus:'decoded',songs:result.native.music.songs.length,canonicalConversion:'not-checked'}};
},handlers:{inspect,patch,convert}});
services.RERecoveryProfiles=Object.freeze({version:1,nativeAudioId:ID,physicalChrId:'nes.physical-chr.v1',limits:Object.freeze({nativeSourceBytes:MAX_SOURCE,resultBytes:2*1024*1024,commandPage:100})});
})();
