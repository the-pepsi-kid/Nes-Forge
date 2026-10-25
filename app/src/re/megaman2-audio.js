/* Mega Man 2 US audio structure. Exact revision only; current source bytes are
 * parsed, never an embedded catalog. Structural traversal is not a timed score.
 * The native driver remains responsible for scheduling and channel arbitration. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MegaMan2Audio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SHA='49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf',BANK=12,TABLE=0x8a50,END=0x8ad6,MAX=16384;
const music=[['duration-scale',1,0x87d7],['signed-pitch-delta',1,0x87e1],['duty-bits',1,0x87eb],['volume-control',1,0x87fb],['counted-branch',3,0x8815],['pitch-table-offset',1,0x885d],['dotted-note',1,0x887a],['volume-envelope',2,0x888d],['modulation-preset',1,0x88c7],['stop-stream',0,0x8917]];
const effect=[['delay-updates',1,0x85d3],['signed-pitch-delta',1,0x85db],['duty-bits',1,0x85e5],['volume-control',1,0x85f5],['counted-branch',3,0x860f],['modulation-parameters',4,0x8640],['stop-effect',0,0x8656]];
const need=(ok,message)=>{if(!ok)throw Error('Mega Man 2 audio: '+message);},hx=(n,w=4)=>'$'+n.toString(16).toUpperCase().padStart(w,'0');
function decode(rom,sourceSha256){
 const digest=(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256;
 need(rom instanceof Uint8Array&&rom.length===262160,'choose the investigated ROM revision.');need(sourceSha256===SHA&&digest(rom)===SHA,'source revision does not match.');
 const off=a=>{need(Number.isInteger(a)&&a>=0x8000&&a<0xc000,'read leaves physical bank 12 at '+hx(a));return 16+BANK*16384+a-0x8000;},b=a=>rom[off(a)],word=a=>b(a)|(b(a+1)<<8),loc=a=>({bank16KiB:BANK,cpu:a,cpuHex:hx(a),fileOffset:off(a),fileHex:hx(off(a),6)});
 const guard=(a,bytes)=>need(bytes.every((v,i)=>b(a+i)===v),'semantic anchor differs at '+hx(a));
 guard(0x802f,[0x0a,0xaa,0xbd,0x50,0x8a,0x85,0xe2,0xbd,0x51,0x8a]);guard(0x8000,[0x4c,0x35,0x82]);
 guard(0x86a0,[0xa0,0x00,0xb1,0xf0]);guard(0x8935,[0xa0,0x00,0xb1,0xec]);guard(0x88fd,[0xa1,0xf4,0x91,0xec]);
 for(const [table,ops]of [[0x87c3,music],[0x85c5,effect]])ops.forEach((op,i)=>need(word(table+i*2)===op[2],'command handler table differs.'));
 const streams=[],byRoot=new Map();
 function walk(start,mode,channel){
  const key=[start,mode,channel].join(':');if(byRoot.has(key))return byRoot.get(key);
  const stream={id:key,channel,mode,source:loc(start),events:[],edges:[],stopReason:'instruction-bound',modulationPresetIDs:[]},seen=new Map();let pc=start,loop=0,pitchTable=null;
  byRoot.set(key,stream);streams.push(stream);
  for(let step=0;step<MAX;step++){
   need(pc>=END&&pc<0xc000,'stream target is outside the identified data region.');
   const state=[pc,loop,pitchTable].join(':');if(seen.has(state)){stream.stopReason='structural-cycle';stream.cycle={event:seen.get(state),target:loc(pc),scope:'Repeated parser control state; acoustic loop length is not inferred.'};break;}seen.set(state,stream.events.length);
   const address=pc,v=b(pc++);let descriptor,size=0,kind;
   if(mode==='effect'){
    if(v>=128){kind=(v&15)===15?'reset-articulation':'timer-period';size=1;}
    else descriptor=effect[v];
   }else if(v<16)descriptor=music[v];
   else kind=v<32?'note-zero-duration':v<48?'hold-next-onsets':v<64?'extra-half-step':'note';
   if(descriptor){[kind,size]=descriptor;}
   need(kind!==undefined,'unsupported '+mode+' command '+hx(v,2)+' at '+hx(address));
   const args=Array.from({length:size},(_,i)=>b(pc+i)),event={...loc(address),byte:v,kind,byteLength:size+1,args};pc+=size;
   if(descriptor)event.handler=loc(descriptor[2]);
   if(kind==='pitch-table-offset')pitchTable=0x8985+args[0]*2;
   if(kind==='modulation-preset')stream.modulationPresetIDs.push(args[0]);
   if(kind==='note'||kind==='note-zero-duration'||kind==='dotted-note'){
    const token=kind==='dotted-note'?args[0]:v,index=token&31,table=kind==='dotted-note'?0x897d:0x8975;
    event.nativeNoteIndex=index;event.durationFactor=b(table+((token>>5)&7));event.durationTable=loc(table+((token>>5)&7));
    event.timing='Native duration scale, extra half-steps, hold prefixes and update state still apply. This is not a timestamp.';
    if(!index)event.noteMeaning='rest';else if(channel==='noise')event.noteMeaning='noise period / mode bits';
    else if(pitchTable!==null){event.periodTable=loc(pitchTable+index*2);event.period=word(pitchTable+index*2);}else event.noteMeaning='pitch table not yet established';
   }
   if(kind==='timer-period')event.period=((v&7)<<8)|args[0];
   if(kind==='hold-next-onsets')event.count=v&7;
   stream.events.push(event);
   if(kind==='stop-stream'||kind==='stop-effect'){stream.stopReason='native-stop';break;}
   if(kind==='counted-branch'){
    const count=args[0],target=args[1]|(args[2]<<8);event.count=count;event.target=loc(target);event.counterBefore=loop;
    const take=count===0||loop!==count;if(take){if(count)loop=(loop+1)&(mode==='effect'?255:127);pc=target;}else loop=0;
    stream.edges.push({from:loc(address),to:loc(pc),kind:take?'branch-taken':'branch-exhausted'});
   }
  }
  need(stream.stopReason!=='instruction-bound','structural instruction bound exceeded.');stream.modulationPresetIDs=[...new Set(stream.modulationPresetIDs)].sort((a,b)=>a-b);return stream;
 }
 const headers=[],cues=[],channels=['pulse1','pulse2','triangle','noise'];
 for(let id=0;id<(END-TABLE)/2;id++){
  const pointer=word(TABLE+id*2);need(pointer>=END&&pointer<0xc000,'cue pointer leaves the audio data region.');
  const priority=b(pointer),isMusic=!!(priority&15),header={id,source:loc(pointer),tableSource:loc(TABLE+id*2),priority,mode:isMusic?'music':'effect'};
  if(isMusic){
   need(priority===15,'unexpected music header priority.');header.channels=channels.map((channel,i)=>{const start=word(pointer+1+i*2);return {channel,pointerSource:loc(pointer+1+i*2),stream:start?loc(start):null,streamID:start?walk(start,'music',channel).id:null};});header.modulationTable=loc(word(pointer+9));
  }else{
   header.channelMask=b(pointer+1)&15;need(header.channelMask!==0,'empty effect routing.');header.channels=channels.filter((_,i)=>header.channelMask&(1<<i));header.stream=loc(pointer+2);header.streamID=walk(pointer+2,'effect','shared-effect').id;
  }
  headers.push(header);cues.push({id:String(id),label:(isMusic?'Music ':'Effect ')+hx(id,2),kind:isMusic?'music-request':'effect',source:header.source,headerID:id,priority,channels:isMusic?header.channels:header.channels.map(channel=>({channel})),streamIDs:isMusic?header.channels.map(c=>c.streamID).filter(Boolean):[header.streamID]});
 }
 need(Math.min(...headers.map(h=>h.source.cpu))===END,'cue table boundary differs.');
 for(const cue of cues){cue.aliases=headers.filter(h=>h.id!==Number(cue.id)&&h.source.cpu===cue.source.cpu).map(h=>String(h.id));if(cue.aliases.length)cue.label+=' · aliases '+cue.aliases.map(id=>hx(Number(id),2)).join(', ');}
 const instruments=[];
 for(const header of headers.filter(h=>h.mode==='music')){
  const ids=[...new Set(header.channels.flatMap(c=>c.streamID?byRoot.get(c.streamID).modulationPresetIDs:[]))];
  for(const id of ids){const address=header.modulationTable.cpu+id*4;let record=instruments.find(x=>x.source.cpu===address);if(!record){record={id:'modulation:'+hx(address),source:loc(address),parameters:Array.from({length:4},(_,i)=>b(address+i)),meaning:['pitch-step delay / phase flag','pitch depth / turn count','amplitude-step delay / reset flag','signed amplitude step'],cueIDs:[],nativeIndices:[]};instruments.push(record);}record.cueIDs.push(String(header.id));record.nativeIndices.push(id);}
 }
 for(const i of instruments){i.cueIDs=[...new Set(i.cueIDs)];i.nativeIndices=[...new Set(i.nativeIndices)];}
 const limitations=['This exact Mega Man 2 US revision only; recognition of another revision or a related engine is not authorized by code similarity.','67 selectors contain 33 music selectors (24 distinct headers, including short jingles) and 34 effects. Aliases are preserved; these are not 67 distinct songs.','Command streams are structural traversals through native stops or repeated control states, not fully timed scores or complete gameplay trigger coverage.','Modulation presets are source parameters, not reconstructed original tracker instruments. Duty, volume, pitch and effect modulation can also be encoded inline.','The decoded driver routes four base APU voices. No DPCM descriptors were found in this cue format; this does not classify every dormant ROM byte.','Special selectors $FC–$FF control update speed, fading and stopping; they are documented as controls and are not playable cue entries.'];
 return {format:'NESForgeMegaMan2NativeCatalog',version:1,source:{sha256:sourceSha256,byteLength:rom.length},driver:{bank16KiB:BANK,fixedBank16KiB:15,dispatch:loc(0x8003),update:loc(0x8000),table:loc(TABLE),tableEnd:loc(END),boundaryEvidence:'67 contiguous 16-bit pointers; the first referenced header starts exactly at $8AD6. Native dispatch has no general bounds check.',queue:{enqueue:{bank16KiB:15,cpu:0xc051,fileOffset:0x3c061},bufferCPU:0x580,countCPU:0x66,capacity:16,order:'Last queued selector is dispatched first after the current update.',consumer:{bank16KiB:15,cpu:0xc03a,fileOffset:0x3c04a}},controls:[{id:252,meaning:'set update repetition to Y+1'},{id:253,meaning:'configure fade with Y'},{id:254,meaning:'stop effects / release overridden voices'},{id:255,meaning:'stop music'}]},headers,cues,streams,instruments,samples:[],opcodes:{music:music.map(([kind,argumentsCount,handler],opcode)=>({opcode,kind,argumentsCount,handler:loc(handler)})),effect:effect.map(([kind,argumentsCount,handler],opcode)=>({opcode,kind,argumentsCount,handler:loc(handler)}))},summary:{cueSelectors:cues.length,musicSelectors:cues.filter(c=>c.kind==='music-request').length,uniqueMusicHeaders:new Set(headers.filter(h=>h.mode==='music').map(h=>h.source.cpu)).size,effectSelectors:cues.filter(c=>c.kind==='effect').length,uniqueCueHeaders:new Set(headers.map(h=>h.source.cpu)).size,sourceStreams:streams.length,structuralCommands:streams.reduce((n,s)=>n+s.events.length,0),nativeStops:streams.filter(s=>s.stopReason==='native-stop').length,structuralCycles:streams.filter(s=>s.stopReason==='structural-cycle').length,modulationPresets:instruments.length,dpcmDescriptors:0},limitations};
}
return Object.freeze({decode,sha256:SHA,limits:Object.freeze({streamInstructions:MAX}),version:1});
});
