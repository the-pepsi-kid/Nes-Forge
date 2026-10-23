/* Native catalog playback and finite editable transcriptions. Playback executes
 * the reviewed driver in an isolated machine; canonical conversion is explicitly
 * a frame-sampled adaptation, never an original-engine or whole-game import. */
(()=>{
'use strict';
const services=window.Forge.services,MAX_FRAMES=1024;
const limits=['Controlled native cue playback starts from cleared driver RAM, the declared fixed PRG banks and one update per 29,780 NTSC CPU cycles. It is not a natural gameplay recording.','Native preview uses Forge’s existing APU model, including its approximate DMC bus timing. Hardware/listening equivalence is not established.','Editable conversion samples channel state at the end of each native update window. Sub-frame changes, oscillator phase, retriggers, original command flow and original instruments are not preserved.','Tonal periods use the nearest canonical pitch. Volume and duty become editable rows and simple duty instruments; the source envelopes remain in the catalog.','DPCM has no canonical Audio sample model and is omitted from the editable score. Short-mode noise is also omitted. Native playback retains both.','The chosen finite window is cut and padded with silence. The canonical music order repeats that excerpt, not the recovered native loop. Gameplay calls, collision/scenes and triggers are not imported.'];
function integer(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)throw Error(label+' must be an integer from '+min+' through '+max+'.');return n;}
function aborted(signal){if(signal?.aborted){const e=Error('Native Audio operation cancelled.');e.name='AbortError';throw e;}}
async function run(input,options={},controls={}){
 if(!options||typeof options!=='object'||Object.keys(options).some(k=>!['cueId','frames','samples'].includes(k)))throw Error('Choose a cue and a bounded native window.');
 const bytes=input.slice(),frames=integer(options.frames??256,1,MAX_FRAMES,'Native updates');aborted(controls.signal);
 const identity=await services.NativeAudioCatalog.identify(bytes);aborted(controls.signal);if(!identity.profile)throw Error('No installed decoder supports this ROM revision.');
 const catalog=await services.NativeAudioCatalog.inspect(bytes),cue=catalog.cues.find(c=>String(c.id)===String(options.cueId));if(!cue)throw Error('Select a cue from the decoded catalog.');if(['empty-request','control'].includes(cue.kind))throw Error('This is an empty request or control command, not a standalone sound. Inspect its native data instead.');
 const samples=[],machine=services.NativeAudioMachine.create(bytes,cue.bank??identity.profile.bank,{ignoreFdsWrites:identity.profile.id==='lolo-us-1',onSample:options.samples===false?()=>{}:s=>samples.push(s)}),ram=machine.ram;let update,beforeUpdate=null;
 machine.write(0x4015,15);machine.write(0x4017,0xc0);
 if(identity.profile.id==='zelda2-us-1'){
  update=cue.family==='title'||cue.driver==='title'?0x8000:0x9000;
  if(cue.family){ram[0x707]=({'game-context-0':0,'game-context-1-2':1,'game-context-3-4':3,'game-context-other':5})[cue.family]??0;}
  ram[cue.requestRegister]=cue.requestMask;
 }else if(identity.profile.id==='lolo-us-1'){update=0xde74;machine.call(0xdd05);machine.call(cue.kind==='music-request'?0xde35:0xdd4b,cue.index);
 }else if(identity.profile.id==='metroid-us-1'){update=0xb3b4;machine.call(0xb404);ram[0x2e]=0x11;ram[0x2f]=0xff;beforeUpdate=()=>machine.call(0xc000);ram[cue.requestRegister]=cue.requestMask;}else if(identity.profile.id==='ninja-gaiden-us-1'){update=0x8000;ram[0x600]=Number(cue.id);}
 else if(identity.profile.id==='megaman2-us-1'){update=0x8000;machine.call(0x8003,Number(cue.id));}
 else{update=0x967d;machine.call(0xa2af,0);machine.call(0xa29b,Number(cue.id));}
 const schedule=[];
 for(let frame=0;frame<frames;frame++){
  aborted(controls.signal);machine.setFrame(frame);const before=machine.apu.cycles;beforeUpdate?.();machine.call(update);const elapsed=machine.apu.cycles-before;if(elapsed>29780)throw Error('Native call exceeded its update window.');machine.clock(29780-elapsed);
  schedule.push({frame,channels:machine.channels(),dmc:{remaining:machine.apu.dmc.remaining,level:machine.apu.dmc.level,address:machine.apu.dmc.address}});
  if((frame&15)===15){controls.progress?.({frame:frame+1,total:frames});await new Promise(resolve=>setTimeout(resolve,0));aborted(controls.signal);}
 }
 const stats=machine.stats();return {format:'NESForgeNativeAudioPlayback',version:1,source:identity.source,profile:identity.profile,cue,physicalBank:cue.bank??identity.profile.bank,frames,sampleRate:48000,clock:29780,schedule,writes:machine.writes,stats,limitations:[...limits,...(['metroid-us-1','lolo-us-1'].includes(identity.profile.id)?catalog.native.limitations:[])],samples:Float32Array.from(samples)};
}
function transcribe(trace,options={}){
 const rows=integer(options.rows??64,16,128,'Pattern rows'),kind=options.resourceKind??'music';if(!['music','sfx'].includes(kind))throw Error('Choose music or a single-channel SFX transcription.');
 const blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0}),count=Math.ceil((trace.frames+1)/rows),patterns=Array.from({length:count},()=>({rows:Array.from({length:rows},()=>Array.from({length:5},blank))})),instruments=[],instrumentMap=new Map(),pitchMap=new Map(),prior=Array(4).fill(null),active=new Set();let notes=0,shortNoiseFrames=0,dmcFrames=0;
 function timer(n,ch){return Math.max(ch===2?2:8,Math.min(2047,Math.round(1789773/((ch===2?32:16)*440*Math.pow(2,(n-57)/12))-1)));}
 function pitch(period,ch){const key=ch+':'+period;if(pitchMap.has(key))return pitchMap.get(key);let best=Infinity,value;for(let n=0;n<96;n++){const target=timer(n,ch),cents=1200*Math.log2((period+1)/(target+1));if(Math.abs(cents)<best){best=Math.abs(cents);value={channel:ch,nativePeriod:period,note:n,canonicalPeriod:target,cents};}}pitchMap.set(key,value);return value;}
 function instrument(ch,duty){const key=ch+':'+duty;if(instrumentMap.has(key))return instrumentMap.get(key);const i=instruments.length;instruments.push({name:['Native Pulse 1','Native Pulse 2','Native Triangle','Native Noise'][ch]+' duty '+duty,volEnv:[15],dutyEnv:[duty],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0});instrumentMap.set(key,i);return i;}
 for(const frame of trace.schedule){if(frame.dmc.remaining||frame.dmc.level)dmcFrames++;for(const ch of frame.channels){const c=ch.channel,cell=patterns[Math.floor(frame.frame/rows)].rows[frame.frame%rows][c];let sounding=ch.volume>0;if(c===3&&ch.short&&sounding){shortNoiseFrames++;sounding=false;}
  if(!sounding){if(prior[c])cell.note=-2;prior[c]=null;continue;}
  const note=c===3?(15-ch.periodIndex)*6:pitch(ch.period,c).note,inst=instrument(c,ch.duty);active.add(c);if(!prior[c]||prior[c].note!==note||prior[c].inst!==inst){cell.note=note;cell.inst=inst;notes++;}cell.vol=ch.volume;prior[c]={note,inst};
 }}
 if(!notes)throw Error('No representable sounding channels occurred in this window. Native playback and catalog data remain available.');
 for(let c=0;c<4;c++)patterns[Math.floor(trace.frames/rows)].rows[trace.frames%rows][c].note=-2;
 const tuning=[...pitchMap.values()],maxCents=tuning.reduce((n,t)=>Math.max(n,Math.abs(t.cents)),0),warnings=['This imports a frame-sampled editable adaptation. Review the source and conversion limits.',kind==='music'?'Tempo changes to 150 / speed 1: one canonical row per native update window. Existing SFX playback timing follows this global tempo.':'SFX import requires the existing project at tempo 150 / speed 1 and preserves its music order and timing.','DPCM is retained in native playback/catalog only, not the editable score.'];if(shortNoiseFrames)warnings.push(shortNoiseFrames+' short-mode noise frame(s) are omitted.');
 const imported={rows,tempo:150,speed:1,patterns,instruments,orderList:patterns.map((_,i)=>[i,i,i,i,i]),noteCount:notes,durationFrames:trace.frames,paddingFrames:count*rows-trace.frames};
 if(kind==='sfx'){if(active.size!==1||count!==1||trace.frames>=rows)throw Error('SFX import requires one representable channel and a window shorter than one pattern. Reduce updates or import as a music excerpt.');const channel=[...active][0];imported.sfx=[{id:('native-'+trace.profile.id+'-'+trace.cue.id).replace(/[^a-z0-9-]/gi,'-').slice(0,80),name:(trace.profile.title+' '+trace.cue.label).slice(0,80),channel,pattern:0,startRow:0,endRow:trace.frames}];}
 return {status:'ready',method:'native-driver-frame-transcription-1',sourceSha256:trace.source.sha256,imported,warnings,limitations:limits.slice(),diagnostics:[],provenance:{profile:trace.profile,cue:trace.cue.id,frames:trace.frames,clock:trace.clock,kind,nativeWrites:trace.writes.length,cpu:trace.stats,tuning,maxAbsoluteCents:maxCents,shortNoiseFrames,dmcFrames,fidelity:'Frame-end APU-state adaptation; original driver structure and sub-frame articulation are not preserved.',schedule:trace.schedule,writes:trace.writes}};
}
async function preview(input,options={},controls={}){
 try{if(!options||typeof options!=='object'||Object.keys(options).some(k=>!['cueId','frames','rows','resourceKind'].includes(k)))throw Error('Unknown native conversion option.');const trace=await run(input,{cueId:options.cueId,frames:options.frames,samples:false},controls);return transcribe(trace,options);}catch(e){return {status:'unsupported',method:'native-driver-frame-transcription-1',sourceSha256:(await services.NativeAudioCatalog.identify(input)).source.sha256,imported:null,warnings:[],limitations:limits.slice(),diagnostics:[{code:'NATIVE_CONVERSION',message:e.message}]};}
}
services.NativeAudioRecovery=Object.freeze({run,preview,transcribe,limits:Object.freeze({frames:MAX_FRAMES}),version:1});
})();
