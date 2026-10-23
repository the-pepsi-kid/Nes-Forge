/* Bounded native FamiTone2 pulse SFX transcription. Canonical authoring data
 * only: no source execution, ROM edits, project writes or mixer replacement. */
(function(root,factory){
 const common=typeof module!=='undefined'&&module.exports;
 const api=factory(common?require('./famitone2-native.js'):root.FamiTone2Native,common?require('./famitone2-audio-import.js'):root.FamiTone2AudioImport);
 if(common)module.exports=api;
 else{root.FamiTone2SfxImport=api;const forge=root.Forge=root.Forge||{};(forge.services=forge.services||{}).FamiTone2SfxImport=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(NATIVE,AUDIO){
'use strict';
const METHOD='famitone2-canonical-sfx-transcription-1',MAX_SOURCE=41488,MAX_RESULT=256*1024;
const LIMITATIONS=[
 'Editable transcription of one statically discovered single-pulse SFX stream, not lossless native-engine replay. The source ROM is unchanged.',
 'One canonical row is one NTSC video frame at tempo 150 and speed 1. Import requires that existing project timing; applying preserves project-wide tempo, speed and music order.',
 'The final native end command still mixes its retained buffer for that frame. The transcription preserves that frame, then places a cut on the following row. The complete effect and cut must fit one pattern.',
 'Only constant-volume, length-halt pulse controls and proven audible 11-bit timer periods are supported. PAL, other channels, multiple channels and unresolved audible register state are refused.',
 'The native clear routine initializes pulse control to $30 but retains timer RAM. Unknown timers are retained as unknown while muted and must be initialized before an audible frame.',
 'Forge uses its existing nearest-note timer table. Each native and canonical timer difference is reported; strict mode refuses inexact timers.',
 'Each audible frame becomes a canonical note and instrument. Canonical per-row retrigger and pulse high-register writes can change phase from native updates, even when timers match.',
 'This preserves the isolated audible pulse trajectory, not native SFX/music arbitration, zero-volume register-buffer ties, stream priorities, original gameplay triggers or whole-game output equivalence.'
];
function fail(code,message,details){const error=Error(message);error.code=code;error.details=details;throw error;}
function integer(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)fail('OPTIONS',label+' must be an integer from '+min+' through '+max);return value;}
const clone=value=>JSON.parse(JSON.stringify(value)),blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
function preview(input,options={}){
 const out={status:'unsupported',method:METHOD,sourceSha256:null,diagnostics:[],warnings:[],limitations:LIMITATIONS.slice(),imported:null,provenance:null};
 try{
  if(!options||typeof options!=='object'||Array.isArray(options))fail('OPTIONS','Options must be an object');
  for(const key of Object.keys(options))if(!['effectId','region','rows','mode','expectedSourceSha256'].includes(key))fail('OPTIONS','Unknown SFX transcription option: '+key);
  const rows=integer(options.rows??64,16,128,'Canonical pattern rows'),effectId=integer(options.effectId??0,0,63,'Native effect ID'),region=options.region??'NTSC',mode=options.mode??'transcription';
  if(region!=='NTSC')fail('REGION','Only NTSC SFX transcription is supported by the canonical runtime');
  if(!['transcription','strict'].includes(mode))fail('OPTIONS','Mode must be transcription or strict');
  if(input?.byteLength>MAX_SOURCE)fail('SOURCE_BUDGET','Source exceeds the bounded NROM container budget');
  const evidence=NATIVE.decode(input);out.sourceSha256=evidence.source?.sha256??null;
  if(options.expectedSourceSha256!==undefined&&options.expectedSourceSha256!==out.sourceSha256)fail('SOURCE_IDENTITY','The current ROM does not match the expected source SHA-256');
  if(evidence.status!=='decoded')fail('NATIVE_PROFILE','Source must pass the supported native driver and data decode',evidence.diagnostics);
  const effect=evidence.native.sfx.effects.find(item=>item.id===effectId);if(!effect)fail('EFFECT_ID','The requested SFX ID is not in the statically proven inventory');
  const stream=effect.NTSC,registers=stream.registers,channels=new Set();
  for(const register of registers){if([0x4000,0x4002,0x4003].includes(register))channels.add(0);else if([0x4004,0x4006,0x4007].includes(register))channels.add(1);else fail('SFX_CHANNEL','Only pulse register streams can be transcribed',{register});}
  if(channels.size>1)fail('SFX_MULTICHANNEL','A multi-channel native stream cannot become one canonical single-channel SFX');
  if(channels.size!==1)fail('NO_NOTES','The selected native SFX has no supported pulse writes');
  const channel=[...channels][0],base=0x4000+channel*4,durationFrames=stream.endFrame+1;
  if(!Number.isInteger(durationFrames)||durationFrames<1||durationFrames>=rows)fail('DURATION','The complete native effect and following cut need '+(durationFrames+1)+' rows; choose a larger pattern up to 128 rows',{endFrame:stream.endFrame,durationFrames,rows});
  const byFrame=new Map();for(const event of stream.events){const list=byFrame.get(event.frame)||[];list.push(event);byFrame.set(event.frame,list);}
  const pattern={rows:Array.from({length:rows},()=>Array.from({length:5},blank))},instruments=[],instrumentKeys=new Map(),tuning=[],tuningKeys=new Map(),frameStates=[];
  let control=0x30,low=null,high=null,noteCount=0;
  function pitch(period){
   if(tuningKeys.has(period))return tuningKeys.get(period);
   let note=0,canonicalPeriod=AUDIO.timer(0,channel),best=Infinity;
   for(let candidateNote=0;candidateNote<96;candidateNote++){const candidate=AUDIO.timer(candidateNote,channel),distance=Math.abs(1200*Math.log2((period+1)/(candidate+1)));if(distance<best){best=distance;note=candidateNote;canonicalPeriod=candidate;}}
   const cents=1200*Math.log2((period+1)/(canonicalPeriod+1));
   if(mode==='strict'&&period!==canonicalPeriod)fail('TUNING_MISMATCH','Native pulse period '+period+' has no exact canonical note',{channel,period,note,canonicalPeriod,cents});
   const value={channel,period,note,canonicalPeriod,cents};tuningKeys.set(period,value);tuning.push(value);return value;
  }
  function instrument(volume,duty){const key=volume+':'+duty;if(instrumentKeys.has(key))return instrumentKeys.get(key);const index=instruments.length;if(index>=127)fail('INSTRUMENT_BUDGET','SFX needs more than 127 canonical instruments');instruments.push({name:'Native pulse duty '+duty+' volume '+volume,volEnv:[volume],dutyEnv:[duty],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0});instrumentKeys.set(key,index);return index;}
  for(let frame=0;frame<durationFrames;frame++){
   const frameEvents=byFrame.get(frame)||[];
   for(const event of frameEvents){if(event.kind!=='register')continue;
    if(event.register===base){if((event.value&0x30)!==0x30)fail('PULSE_CONTROL','Pulse control must retain constant volume and length halt',{frame,value:event.value,source:event.source});control=event.value;}
    else if(event.register===base+2)low=event.value;
    else if(event.register===base+3){if(event.value>7)fail('TIMER_CONTROL','Pulse high-byte length-counter bits are outside the declared 11-bit timer representation',{frame,value:event.value,source:event.source});high=event.value;}
   }
   const volume=control&15,duty=control>>>6,period=low===null||high===null?null:low+(high<<8),audible=volume>0;
   let mapped=null,note=-2,inst=-1;
   if(audible){if(period===null)fail('UNKNOWN_REGISTER','Native timer low and high bytes must both be initialized before an audible frame',{frame,channel,low,high});if(period<8||period>2047)fail('TIMER_RANGE','Audible pulse timer is outside the proven 8 through 2047 range',{frame,period});mapped=pitch(period);note=mapped.note;inst=instrument(volume,duty);noteCount++;}
   Object.assign(pattern.rows[frame][channel],{note,inst,vol:audible?15:-1});
   frameStates.push({frame,channel,registers:{control,low,high},known:{control:true,low:low!==null,high:high!==null},volume,duty,period,note,inst,canonicalPeriod:mapped?.canonicalPeriod??null,cents:mapped?.cents??null,audible,endFrame:frame===stream.endFrame,sourceEvents:frameEvents.map(event=>clone(event.source))});
  }
  if(!noteCount)fail('NO_NOTES','The selected native effect has no audible frames to transcribe');
  pattern.rows[durationFrames][channel].note=-2;
  const paddingFrames=rows-durationFrames,changed=tuning.filter(item=>item.period!==item.canonicalPeriod),maxCents=changed.reduce((max,item)=>Math.max(max,Math.abs(item.cents)),0);
  out.warnings.push('One canonical row equals one NTSC video frame. Import requires existing tempo 150 and speed 1, and preserves project-wide tempo, speed and music order.');
  out.warnings.push('The effect retains all '+durationFrames+' native frames, including its end-command frame; row '+durationFrames+' cuts the pulse, followed by silent padding.');
  if(changed.length)out.warnings.push(changed.length+' native pitch mapping(s) use a nearby canonical timer; maximum absolute difference '+maxCents.toFixed(3)+' cents.');
  out.warnings.push('This single-channel transcription does not reproduce native SFX/music mixing, gameplay triggers or pulse phase.');
  const imported={format:'famitone2-sfx-transcription',tempo:150,speed:1,rows,patterns:[pattern],instruments,sfx:[{id:'re-sfx-'+out.sourceSha256+'-'+effectId,name:'Native SFX '+effectId+' Pulse '+(channel+1),channel,pattern:0,startRow:0,endRow:durationFrames}],durationFrames,paddingFrames,noteCount};
  const provenance={method:METHOD,source:clone(evidence.source),decoderMethod:evidence.method,effectId,region,mode,channel,driver:clone(evidence.recognition.driver.source),effectSource:clone(effect.source),callEvidence:clone(effect.callEvidence),events:clone(stream.events),frameStates,tuning,sourceStream:{address:stream.address,byteLength:stream.byteLength,registers:registers.slice(),endFrame:stream.endFrame},initialState:{control:0x30,low:null,high:null,reason:'The proven native SFX clear routine mutes pulse control; timer buffer bytes retain unknown prior RAM.'},durationFrames,paddingFrames,terminalCut:{frame:durationFrames,channel,note:-2},fidelity:{timing:'one native update per NTSC frame, including retained end-frame buffer',volume:'constant-volume pulse register nibbles retained per frame',duty:'native duty retained per frame',tuning:changed.length?'nearest-canonical-timer':'matching-effective-timers',changedPitchMappings:changed.length,maxAbsoluteCents:maxCents,phase:'canonical per-row retrigger differs from native register writes',mixing:'native SFX/music arbitration not transcribed',ending:'retained native end frame followed by canonical cut',gameplayTriggers:'not recovered'}};
  if(JSON.stringify({...out,status:'ready',imported,provenance}).length>MAX_RESULT)fail('RESULT_BUDGET','SFX transcription exceeds the bounded result budget');
  out.imported=imported;out.provenance=provenance;out.status='ready';return out;
 }catch(error){out.diagnostics.push({code:error.code||'INTERNAL',message:error.message,...(error.details===undefined?{}:{details:error.details})});return out;}
}
return Object.freeze({method:METHOD,preview,limits:Object.freeze({sourceBytes:MAX_SOURCE,resultBytes:MAX_RESULT,rowsMin:16,rowsMax:128,frames:127,instruments:127,channels:Object.freeze([0,1])})});
});
