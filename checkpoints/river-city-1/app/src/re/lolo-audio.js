/* Adventures of Lolo US: independent interpretation of the supplied native
 * DD05/DD4B/DE35/DE74 driver and FE95/FEA9 dispatch tables. No source music,
 * samples or recovered catalog payloads are embedded. Native execution owns
 * timing, envelope updates and SFX arbitration; this walker is structural. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LoloAudio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sha256='914c676959612fc6738a297b6b799dff848e43de4e9bd3c9f3c6783efd059e01';
const limits=Object.freeze({streamInstructions:8192,stackDepth:5});
const need=(ok,m)=>{if(!ok)throw Error('Lolo Audio: '+m);};
function walk(read,start,channel){
 let pc=start,base=39,tempo=0,steps=0,terminal='instruction-bound';const events=[],stack=[],seen=new Set();
 const byte=a=>{need(Number.isInteger(a)&&a>=0xe639&&a<0xfda7,'Stream leaves reviewed audio data.');const value=read(a);need(Number.isInteger(value)&&value>=0&&value<=255,'Truncated native stream.');return value;};
 const take=()=>byte(pc++),word=()=>{const lo=take();return lo|(take()<<8);};
 while(steps++<limits.streamInstructions){
  const state=JSON.stringify([pc,base,tempo,stack]);if(seen.has(state)){terminal='structural-cycle';break;}seen.add(state);
  const cpu=pc,v=take(),event={cpu,byte:v};events.push(event);
  if(v<0xe0){event.kind=channel===3?'noise-or-dpcm-token':(v&31)===16?'rest':'relative-note';event.durationIndex=v>>5;event.durationTable=0xfe47+tempo*6+(v>>5);event.nativePitchIndex=(base+((v&16)?(v&31)-32:v&31))&255;
   if((v&0xe0)===0xc0){event.explicitDuration=take();delete event.durationIndex;delete event.durationTable;}
   continue;
  }
  if(v===0xff){event.kind='stop';terminal='native-stop';break;}
  if(v===0xf8){event.kind='jump';event.target=word();pc=event.target;continue;}
  if(v===0xfa){event.kind='call';event.target=word();need(stack.length<limits.stackDepth,'Call/repeat stack exceeds the native allocation.');stack.push({kind:'call',returnTo:pc});pc=event.target;continue;}
  if(v===0xfb){event.kind='return';const top=stack.pop();need(top?.kind==='call','Unbalanced native return.');pc=top.returnTo;continue;}
  if(v===0xfc){event.kind='repeat-start';event.count=take();need(stack.length<limits.stackDepth,'Call/repeat stack exceeds the native allocation.');stack.push({kind:'repeat',count:event.count,start:pc});continue;}
  if(v===0xfd){event.kind='repeat-end';const top=stack.at(-1);need(top?.kind==='repeat','Unbalanced native repeat.');top.count=(top.count-1)&255;if(top.count)pc=top.start;else stack.pop();continue;}
  const commands={0xe0:['dpcm-sample',2],0xe1:['global-control',1],0xe2:['direct-timer',2],0xe3:['timer-delta',1],0xf0:['attenuation',1],0xf1:['attenuation-delta',1],0xf2:['duration-table',1],0xf3:['wait-updates',1],0xf4:['gate-fraction',1],0xf5:['pitch-base',1],0xf6:['envelope',1],0xf7:['pitch-table',1]},command=commands[v];
  need(command,'Unsupported structural opcode at $'+cpu.toString(16));event.kind=command[0];event.args=Array.from({length:command[1]},take);
  if(v===0xf5)base=event.args[0];if(v===0xf2){tempo=event.args[0];need(tempo<13,'Duration table index outside reviewed data.');}
 }
 need(terminal!=='instruction-bound','Structural instruction bound reached.');return {sourceCpu:start,channel,events,terminal,instructions:steps};
}
const hash=(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256;
// Every code, music, instrument and sample byte is in this immutable PRG prefix.
// CHR-backed room edits cannot affect the driver; source identity remains the
// current complete-ROM hash rather than being relabelled as the original ROM.
function recognizes(bytes){return bytes instanceof Uint8Array&&bytes.length===65552&&hash(bytes.subarray(0,0x8010))==='bb8cb16959d6ec38a51f99a12349b2fa7137cd7e69fa9d75c45af343d40e3099';}
function decode(bytes,expectedSha256){
 need(recognizes(bytes)&&expectedSha256===hash(bytes),'Unsupported source revision.');
 need(bytes[4]===2&&bytes[5]===4&&((bytes[6]>>4)|(bytes[7]&240))===1&&!(bytes[6]&4)&&!(bytes[7]&12),'Unsupported source header.');
 const off=cpu=>{need(Number.isInteger(cpu)&&cpu>=0xc000&&cpu<=0xffff,'Read outside fixed PRG bank.');return 16+16384+cpu-0xc000;},b=cpu=>bytes[off(cpu)],word=cpu=>b(cpu)|(b(cpu+1)<<8),loc=cpu=>({bank16KiB:1,cpu,fileOffset:off(cpu)});
 const anchor=(cpu,data)=>need(data.every((v,i)=>b(cpu+i)===v),'Native driver anchor differs.');
 anchor(0xdd05,[0xa2,0,0x8e,0x11,0x40]);anchor(0xde35,[0x85,0x89,0x48,0xa2,4]);anchor(0xde74,[0xa9,0xc0,0x8d,0x17,0x40]);anchor(0xdd86,[0xbd,0xa9,0xfe]);anchor(0xde52,[0xbd,0x95,0xfe]);
 const cues=[],headers=[],streams=[],instruments=[],envelopes=new Set();
 for(const [family,table,count,dispatch]of [['music',0xfe95,10,0xde35],['sfx',0xfea9,24,0xdd4b]])for(let index=0;index<count;index++){
  const cpu=word(table+index*2);need(cpu>=0xe533&&cpu<0xe639,'Header outside reviewed table region.');const channels=b(cpu);need(channels>=1&&channels<=4&&cpu+1+channels*3<=0xe639,'Invalid channel header.');
  const id=family+':'+index,entries=[];
  for(let i=0;i<channels;i++){
   const entry=cpu+1+i*3,start=word(entry),register=b(entry+2);need([0,4,8,12].includes(register),'FDS or unknown channel is not a NES cue.');const channel=register>>2,stream=walk(b,start,channel),streamId=id+':ch'+channel;
   for(const e of stream.events){e.source=loc(e.cpu);if(e.kind==='envelope')envelopes.add(e.args[0]);if(e.durationTable)need(e.durationTable>=0xfe47&&e.durationTable<0xfe95,'Duration lookup leaves reviewed tables.');}
   streams.push({id:streamId,cueIds:[id],...stream,source:loc(start)});entries.push({channel,source:loc(entry),stream:loc(start),streamID:streamId});
  }
  const header={id,source:loc(cpu),table:loc(table+index*2),entries};headers.push(header);
  cues.push({id,label:(family==='music'?'Music ':'SFX ')+String(index+1).padStart(2,'0'),kind:family==='music'?'music-request':'effect',index,bank:0,dispatch:loc(dispatch),header:header.source,channels:entries.map(e=>e.channel),streamIDs:entries.map(e=>e.streamID),...(family==='sfx'?{channelMask:b(0xfed9+index),priority:b(0xfef1+index)}:{})});
 }
 for(const index of [...envelopes].sort((a,b)=>a-b)){need(index<40,'Envelope index outside reviewed pointer table.');const table=0xfda7+index*4,start=word(table);need(start>=0xfc91&&start<0xfda7,'Envelope outside reviewed data.');instruments.push({id:index,source:loc(start),table:loc(table),release:loc(word(table+2)),kind:'native-envelope-program',limitations:['Native execution owns envelope articulation; no canonical instrument equivalence is implied.']});}
 return {format:'NESForgeLoloNativeAudio',version:1,cues,headers,streams,instruments,samples:[],driver:{initialize:loc(0xdd05),update:loc(0xde74),music:loc(0xde35),sfx:loc(0xdd4b)},summary:{musicCues:10,effectCues:24,channelStreams:streams.length,structuralEvents:streams.reduce((n,s)=>n+s.events.length,0),envelopePrograms:instruments.length},limitations:['The supplied US header and complete PRG must match exactly; CHR-only derivatives can retain this driver. Revised or audio-modified PRG is refused.','Music and SFX labels are native table indices; human song names and gameplay triggers have not been verified.','Static streams describe bounded command flow, not a timed score. Native preview executes original scheduling and channel arbitration.','This MMC1 cartridge has no FDS sound hardware. Inherited writes to unused FDS registers are ignored and counted; no expansion audio is synthesized.','No DPCM commands occur in the decoded cue streams. No native audio writer is installed. Editable conversion is a finite frame-sampled adaptation.']};
}
return Object.freeze({sha256,recognizes,decode,walk,limits});
});
