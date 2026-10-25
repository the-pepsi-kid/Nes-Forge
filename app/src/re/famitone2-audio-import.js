/* Bounded FamiTone2 music transcription into canonical Forge Audio authoring data.
 * Re-decodes bytes on every request. No project writes, emulation, or ROM edits.
 */
(function(root,factory){
 const api=factory(typeof module!=='undefined'&&module.exports?require('./famitone2-native.js'):root.FamiTone2Native);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else {root.FamiTone2AudioImport=api;const f=root.Forge=root.Forge||{};(f.services=f.services||{}).FamiTone2AudioImport=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(NATIVE){
'use strict';
const METHOD='famitone2-canonical-transcription-1',MAX_NATIVE_ROWS=1024,MAX_FRAMES=16384;
const LIMITATIONS=[
 'Editable music score transcription, not lossless native-engine replay. The source ROM is unchanged.',
 'Only the selected subsong and finite logical-row window are transcribed. Native loops/references become timed notes; the excerpt is cut at its end, padded with silence, and Forge repeats the resulting whole order.',
 'Music timing is relative to the first native driver update after MusicPlay, at one driver update per NTSC video frame. Runtime game pauses, subsong changes and SFX calls are excluded.',
 'Forge uses its own equal-tempered timer tables. Nearest pitches and each native/canonical timer difference are reported; pitch envelopes and unrepresentable data are refused.',
 'Forge writes pulse high timer registers on every tick; the native driver writes them only when their high value changes. Pulse phase and retrigger behavior can differ.',
 'Forge uses its own triangle linear counter (0xff when audible); the native driver uses 0x80 OR native volume. Triangle gating is transcribed but linear-counter modulation and waveform behavior can differ.',
 'Native SFX register streams, mixing/arbitration, DPCM, gameplay triggers and song switching are not imported. Existing project SFX definitions remain separate; project-wide tempo/speed affect their playback after applying a transcription.',
 'PAL import is refused because the canonical generated Audio runtime currently uses NTSC tuning and timing.'
];
function fail(code,message,details){const e=Error(message);e.code=code;e.details=details;throw e;}
function integer(n,min,max,label){if(!Number.isInteger(n)||n<min||n>max)fail('OPTIONS',label+' must be an integer from '+min+' through '+max);return n;}
function timer(note,channel){return Math.max(channel===2?2:8,Math.min(2047,Math.round(1789773/((channel===2?32:16)*440*Math.pow(2,(note-57)/12))-1)));}
const blank=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
function expandEnvelope(envelope,label,min,max){
 if(!envelope)fail('ENVELOPE','Missing '+label+' envelope');
 const end=envelope.loop.endFrame,start=envelope.loop.startFrame;
 if(end>255||start<0||start>=end)fail('ENVELOPE_BUDGET',label+' requires '+end+' frame steps; canonical maximum is 255');
 const values=Array(end).fill(null);
 for(const event of envelope.events){if(event.kind!=='value'&&event.kind!=='hold')continue;
  if(!Number.isInteger(event.value)||event.value<min||event.value>max)fail('ENVELOPE_RANGE',label+' value '+event.value+' is outside '+min+' through '+max);
  for(let i=event.frame;i<Math.min(end,event.frame+event.durationFrames);i++)values[i]=event.value;
 }
 if(values.some(v=>v===null))fail('ENVELOPE_GAP',label+' envelope has an unresolved frame');
 return {values,loop:start,sourceAddress:envelope.address};
}
function preview(input,options={}){
 const out={status:'unsupported',method:METHOD,sourceSha256:null,diagnostics:[],warnings:[],limitations:LIMITATIONS.slice(),imported:null,provenance:null};
 try{
  if(!options||typeof options!=='object'||Array.isArray(options))fail('OPTIONS','Options must be an object');
  for(const key of Object.keys(options))if(!['songIndex','region','nativeRows','rows','mode','expectedSourceSha256'].includes(key))fail('OPTIONS','Unknown transcription option: '+key);
  const rows=integer(options.rows??64,16,128,'Canonical pattern rows'),mode=options.mode??'transcription';
  if(!['transcription','strict'].includes(mode))fail('OPTIONS','Mode must be transcription or strict');
  const region=options.region??'NTSC';if(region!=='NTSC')fail('REGION','Only NTSC transcription is currently representable by the canonical runtime');
  const evidence=NATIVE.decode(input);out.sourceSha256=evidence.source?.sha256??null;
  if(options.expectedSourceSha256!==undefined&&options.expectedSourceSha256!==out.sourceSha256)fail('SOURCE_IDENTITY','The current ROM does not match the expected source SHA-256');
  if(evidence.status!=='decoded')fail('NATIVE_PROFILE','Source must pass the supported native driver/data decode',evidence.diagnostics);
  const music=evidence.native.music,songIndex=integer(options.songIndex??0,0,music.songs.length-1,'Subsong'),song=music.songs[songIndex];
  const nativeRows=integer(options.nativeRows??Math.max(...song.channels.map(c=>c.loop.endRow)),1,MAX_NATIVE_ROWS,'Native row window');
  const instrumentsById=new Map(music.instruments.map(i=>[i.id,i])),envelopesByAddress=new Map(music.envelopes.map(e=>[e.address,e]));
  const nativeInstruments=new Map(),canonicalInstruments=[],canonicalInstrumentKeys=new Map(),variantCache=new Map(),tuning=[],tuningCache=new Map(),events=[],frameSchedule=[];
  const usedNativeInstruments=new Set();
  function nativeInstrument(id,channel){
   const key=id+':'+channel;if(nativeInstruments.has(key))return nativeInstruments.get(key);
   const i=instrumentsById.get(id);if(!i)fail('INSTRUMENT','Missing native instrument '+id);
   if(channel<2&&(i.dutyControl&63)!==0x30)fail('PULSE_CONTROL','Native pulse instrument '+id+' uses unsupported control bits');
   if(channel===3&&(i.duty&1))fail('NOISE_MODE','Native short-mode noise cannot be represented by canonical Audio');
   const volume=expandEnvelope(envelopesByAddress.get(i.envelopes.volume),'Volume instrument '+id,0,15);
   const arp=expandEnvelope(envelopesByAddress.get(i.envelopes.arpeggio),'Arpeggio instrument '+id,-64,63);
   if(channel!==3){const pitch=expandEnvelope(envelopesByAddress.get(i.envelopes.pitch),'Pitch instrument '+id,-64,63);if(pitch.values.some(v=>v!==0))fail('PITCH_ENVELOPE','Nonzero native pitch envelopes require a future timer-aware conversion');}
   const data={native:i,volume,arp};nativeInstruments.set(key,data);usedNativeInstruments.add(id);return data;
  }
  function mapPitch(noteCode,arp,channel){
   const key=[channel,noteCode,arp].join(':');if(tuningCache.has(key))return tuningCache.get(key);
   if(tuningCache.size>=8192)fail('TUNING_BUDGET','Transcription exceeds 8,192 distinct pitch mappings');
   let period,note,canonicalPeriod,cents=0;
   if(channel===3){period=15-((noteCode+arp)&15);note=(15-period)*6;canonicalPeriod=period;}
   else{
    const nativeIndex=noteCode+arp;if(nativeIndex<1||nativeIndex>60)fail('NOTE_RANGE','Native note plus arpeggio leaves the proven timer range 1–60',{noteCode,arp,channel});
    // Native ADC note + signed arpeggio leaves carry set for a valid negative
    // offset. ORA/LDA/TAY preserve it into the low timer ADC even at pitch zero.
    period=evidence.native.timerTables.NTSC[nativeIndex]+(arp<0?1:0);
    if(period<(channel===2?2:8)||period>2047)fail('TIMER_RANGE','Native period lies outside canonical channel timer bounds',{period,channel,nativeIndex});
    let best=Infinity;for(let n=0;n<96;n++){const candidate=timer(n,channel),distance=Math.abs(1200*Math.log2((period+1)/(candidate+1)));if(distance<best){best=distance;note=n;canonicalPeriod=candidate;}}
    cents=1200*Math.log2((period+1)/(canonicalPeriod+1));
    if(mode==='strict'&&period!==canonicalPeriod)fail('TUNING_MISMATCH','Native period '+period+' has no exact canonical pitch on channel '+channel,{noteCode,arp,period,note,canonicalPeriod,cents});
   }
   const mapping={channel,nativeNoteCode:noteCode,arp,period,note,canonicalPeriod,cents};tuningCache.set(key,mapping);tuning.push(mapping);return mapping;
  }
  function instrumentFor(event,channel){
   const variantKey=[channel,event.instrumentId,event.noteCode].join(':');if(variantCache.has(variantKey))return variantCache.get(variantKey);
   const i=nativeInstrument(event.instrumentId,channel),base=mapPitch(event.noteCode,0,channel),mappedArp=i.arp.values.map(v=>mapPitch(event.noteCode,v,channel).note-base.note);
   if(mappedArp.some(v=>v< -24||v>24))fail('ARPEGGIO_RANGE','Transcribed arpeggio requires an offset outside canonical -24 through 24');
   const value={name:'Native '+event.instrumentId+' '+['Pulse 1','Pulse 2','Triangle','Noise'][channel]+' N'+event.noteCode,volEnv:i.volume.values.slice(),dutyEnv:[i.native.duty],arpEnv:mappedArp,pitchEnv:[0],loopVol:i.volume.loop,loopArp:i.arp.loop};
   const key=JSON.stringify([value.volEnv,value.dutyEnv,value.arpEnv,value.loopVol,value.loopArp]);let index=canonicalInstrumentKeys.get(key);
   if(index===undefined){index=canonicalInstruments.length;if(index>=255)fail('INSTRUMENT_BUDGET','Transcription needs more than 255 canonical instruments');canonicalInstrumentKeys.set(key,index);canonicalInstruments.push(value);}
   const result={index,note:base.note};variantCache.set(variantKey,result);return result;
  }
  // Decoder loop state includes source pointer, reference return, instrument and
  // channel speed. Only semantic row commands are replayed; command order stays
  // channel 0..4, so global speed writes retain native precedence.
  const channels=song.channels.map(ch=>{const byRow=new Map();for(const event of ch.events){if(!['speed','note','cut'].includes(event.kind))continue;const list=byRow.get(event.row)||[];list.push(event);byRow.set(event.row,list);}return{...ch,byRow};});
  let accumulator=song.initialAccumulator,speed=song.initialSpeed,logicalRow=0,frame=0,noteCount=0;
  for(;frame<MAX_FRAMES;frame++){
   accumulator=(accumulator+song.tempoSteps.NTSC)&65535;
   if((accumulator>>>8)>=speed){
    accumulator=(accumulator-speed*256)&65535;
    if(logicalRow===nativeRows)break;
    const schedule={frame,logicalRow,speedBefore:speed,speed};
    for(const ch of channels){
     const loop=ch.loop,localRow=logicalRow<loop.endRow?logicalRow:loop.startRow+(logicalRow-loop.endRow)%loop.rows;
     for(const event of ch.byRow.get(localRow)||[]){
      if(event.kind==='speed'){if(event.speed===0||(event.speed&128))fail('PAUSED_SPEED','Native pause/stop speed commands cannot be transcribed as a progressing music window');speed=event.speed;continue;}
      if(ch.index===4)fail('DPCM','A DPCM note/cut is present in the selected window; no canonical sample model exists');
      let note=-2,inst=-1;if(event.kind==='note'){if(event.noteCode>60&&ch.index!==3)fail('NOTE_RANGE','Native tonal note is outside the proven 1–60 timer range');const target=instrumentFor(event,ch.index);note=target.note;inst=target.index;noteCount++;}
      events.push({frame,logicalRow,channel:ch.index,note,inst,vol:note>=0?15:-1,nativeNoteCode:event.noteCode,nativeInstrumentId:event.instrumentId,source:{...event.source,bytes:event.source.bytes.slice()}});
     }
    }
    schedule.speed=speed;frameSchedule.push(schedule);logicalRow++;
   }
  }
  if(logicalRow<nativeRows||frame>=MAX_FRAMES)fail('FRAME_BUDGET','The requested native window exceeds '+MAX_FRAMES+' video frames; choose fewer native rows');
  if(!noteCount)fail('NO_NOTES','The selected window contains no playable music notes');
  const durationFrames=frame,patternCount=Math.ceil((durationFrames+1)/rows);
  if(patternCount>255)fail('PATTERN_BUDGET','The requested window needs '+patternCount+' patterns; maximum 255 before existing project data');
  const patterns=Array.from({length:patternCount},()=>({rows:Array.from({length:rows},()=>Array.from({length:5},blank))}));
  for(const event of events)Object.assign(patterns[Math.floor(event.frame/rows)].rows[event.frame%rows][event.channel],{note:event.note,inst:event.inst,vol:event.vol});
  for(let c=0;c<4;c++)patterns[Math.floor(durationFrames/rows)].rows[durationFrames%rows][c].note=-2;
  const paddingFrames=patternCount*rows-durationFrames;
  const altered=tuning.filter(t=>t.period!==t.canonicalPeriod),maxCents=altered.reduce((v,t)=>Math.max(v,Math.abs(t.cents)),0);
  out.warnings.push('One canonical row equals one NTSC video frame (tempo 150, speed 1); project-wide tempo and speed will change when applied.');
  out.warnings.push('The excerpt contains '+nativeRows+' native rows / '+durationFrames+' video frames, followed by '+paddingFrames+' cut/silent frames before the canonical order repeats.');
  if(altered.length)out.warnings.push(altered.length+' native pitch mapping(s) use a nearby canonical timer; maximum absolute difference '+maxCents.toFixed(3)+' cents.');
  out.warnings.push('Native SFX and game calls are excluded; this is a music-only transcription.');
  out.imported={format:'famitone2-transcription',tempo:150,speed:1,rows,patterns,instruments:canonicalInstruments,orderList:patterns.map((_,i)=>[i,i,i,i,i]),noteCount,durationFrames,paddingFrames,warnings:out.warnings.slice()};
  out.provenance={method:METHOD,source:{...evidence.source},decoderMethod:evidence.method,songIndex,region,mode,nativeRows,durationFrames,paddingFrames,clock:'one native update and one canonical tick per NTSC video frame; first update is frame 0',nativeTempoStep:song.tempoSteps.NTSC,initialAccumulator:song.initialAccumulator,initialSpeed:song.initialSpeed,driver:evidence.recognition.driver.source,songSource:song.source,loops:song.channels.map(c=>({channel:c.index,...c.loop})),nativeInstruments:[...usedNativeInstruments].map(id=>instrumentsById.get(id)),events,frameSchedule,tuning,fidelity:{timing:'native note/cut and global speed schedule flattened without time quantization',volume:'native volume envelopes expanded per video frame',tuning:altered.length?'nearest-canonical-timer':'matching-effective-timers',changedPitchMappings:altered.length,maxAbsoluteCents:maxCents,phase:'native pulse high-register write suppression is not reproduced',triangle:'nonzero gate preserved; native linear-counter values are not reproduced',nativeSfx:'excluded',window:'finite excerpt plus final cut and silent padding; canonical order repeats'}};
  out.status='ready';return out;
 }catch(e){out.diagnostics.push({code:e.code||'INTERNAL',message:e.message,...(e.details===undefined?{}:{details:e.details})});return out;}
}
return Object.freeze({method:METHOD,preview,limits:Object.freeze({nativeRows:MAX_NATIVE_ROWS,frames:MAX_FRAMES,instrumentFrames:255,patterns:255,instruments:255}),timer});
});
