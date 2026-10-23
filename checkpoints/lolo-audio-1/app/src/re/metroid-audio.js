/* Metroid US music/SFX catalog. Independent interpretation of the native
 * B3B4 update, BBFA/BD31 headers and BADC/BB1C stream interpreter documented
 * in nmikstas/metroid-disassembly, revision 4270d57. No ROM/music payloads.
 * Physical bank is part of cue identity; placeholder RAM pointers are refused. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MetroidAudio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sha256='c5eea06e1e1128b576bd789f1a4f63bb154d6d31579c2f319382fb77a72d34a6';
const limits=Object.freeze({streamInstructions:4096,streamEvents:1024,streamFrames:65536});
const fail=m=>{throw Error('Metroid Audio: '+m);};
const hash=bytes=>(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256(bytes);
const at=(bank,cpu)=>({bank16KiB:bank,cpu,fileOffset:16+bank*16384+cpu-0x8000});
const songs=Object.freeze([
 [0,5,'Ridley area'],[1,3,'Tourian'],[2,1,'Item room'],[3,4,'Kraid area'],
 [4,2,'Norfair'],[5,3,'Escape'],[6,3,'Mother Brain'],[7,1,'Brinstar'],
 [8,1,'Fade in'],[9,1,'Power up'],[10,0,'Ending'],[11,0,'Title / intro']
].map(Object.freeze));
function decode(bytes,expectedSha256){
 if(!(bytes instanceof Uint8Array)||bytes.length!==131088||expectedSha256!==sha256||hash(bytes)!==sha256)fail('Unsupported source revision.');
 if(bytes[4]!==8||bytes[5]!==0||((bytes[6]>>4)|(bytes[7]&240))!==1||(bytes[6]&4)||(bytes[7]&12))fail('Unsupported source header.');
 function b(bank,cpu){if(!Number.isInteger(bank)||bank<0||bank>5||!Number.isInteger(cpu)||cpu<0x8000||cpu>=0xc000)fail('Read outside reviewed music bank.');return bytes[at(bank,cpu).fileOffset];}
 const word=(bank,cpu)=>b(bank,cpu)|(b(bank,cpu+1)<<8);
 function anchor(bank,cpu,data){if(data.some((v,i)=>b(bank,cpu+i)!==v))fail('Driver anchor differs at '+cpu.toString(16));}
 for(let bank=0;bank<=5;bank++){
  anchor(bank,0xb3b4,[0xa9,0xc0,0x8d,0x17,0x40,0xad,0x80,0x06]);
  anchor(bank,0xbf26,[0xb9,0xfa,0xbb,0xa8,0xa2,0]);
  anchor(bank,0xbb2b,[0xb9,0xf7,0xbe]);
 }
 const cues=[],streams=[],headers=[],instruments=[],drivers=[],effects=[];
 function walk(bank,pointer,channel,header,cueId,frameLimit=limits.streamFrames){
  if(pointer<(bank===0?0xac00:0xb000)||pointer>=0xb200&&pointer<0xbdcd||pointer>=0xbef7)fail('Music stream points outside reviewed data.');
  let index=0,frames=0,duration=0,repeat=0,loop=0,terminal='work-limit',steps=0;
  const seen=new Set(),events=[];
  const read=()=>{const address=pointer+index;index=(index+1)&255;return {value:b(bank,address),source:at(bank,address)};};
  while(steps++<limits.streamInstructions&&events.length<limits.streamEvents&&frames<Math.min(frameLimit,limits.streamFrames)){
   const state=[index,duration,repeat,loop].join(':');if(seen.has(state)){terminal='repeated-parser-state';break;}seen.add(state);
   const op=read(),value=op.value;
   if(value===0){terminal='end';events.push({kind:'end',frame:frames,source:op.source});break;}
   if(value===255){if(repeat){repeat--;index=loop;}events.push({kind:'loop-end',remaining:repeat,frame:frames,source:op.source});continue;}
   if((value&192)===192){repeat=((value&63)-1)&255;loop=index;events.push({kind:'loop-start',repeatCount:value&63,frame:frames,source:op.source});continue;}
   let note=op;
   if((value&176)===176){const lengthIndex=header.lengthTableOffset+(value&15);if(lengthIndex>=34)fail('Note duration outside native length tables.');duration=b(bank,0xbef7+lengthIndex);if(!duration)fail('Zero duration is not a supported static score.');events.push({kind:'duration',frames:duration,frame:frames,source:op.source});note=read();if(!note.value||(note.value&192)===192||(note.value&176)===176)fail('Invalid note after length command.');}
   if(!duration)fail('Stream lacks an initial note duration.');
   if(channel===3){if(![1,4,7,10].includes(note.value)){terminal='outside-note-table';break;}events.push({kind:'drum',drum:(note.value-1)/3,frame:frames,frames:duration,source:note.source,registers:at(bank,0xb200+note.value)});}
   else{if(note.value&1||note.value>=128){terminal='outside-note-table';break;}const high=b(bank,0xbe77+note.value),low=b(bank,0xbe78+note.value);events.push({kind:low?'note':'rest',frame:frames,frames:duration,period:low?((high&7)<<8)|low:null,source:note.source,noteTable:at(bank,0xbe77+note.value)});}
   frames+=duration;
  }
  if(frames>=frameLimit)terminal='shared-music-end';
  return {id:cueId+':ch'+channel,cueIds:[cueId],channel,source:at(bank,pointer),frames,terminal,instructions:steps,events};
 }
 for(const [index,bank,name]of songs){
  const headerCpu=0xbd31+b(bank,0xbbfa+index),pointers=Array.from({length:4},(_,i)=>word(bank,headerCpu+5+i*2));
  if(pointers.some(p=>p&&p<0x8000))fail('Placeholder music request has no physical ROM stream.');
  const id='music:'+index,header={id,index,bank,source:at(bank,headerCpu),lengthTableOffset:b(bank,headerCpu),repeat:b(bank,headerCpu+1)!==0,triangleControl:b(bank,headerCpu+2),volumeControls:[b(bank,headerCpu+3),b(bank,headerCpu+4)],pointers};
  if(![0,11,23].includes(header.lengthTableOffset)||header.volumeControls.some(v=>v>5))fail('Invalid music header controls.');
  let channelStreams=pointers.flatMap((p,ch)=>p?[walk(bank,p,ch,header,id)]:[]);
  const ends=channelStreams.filter(s=>s.terminal==='end').map(s=>s.frames),endFrame=ends.length?Math.min(...ends):null;
  if(endFrame!==null)channelStreams=pointers.flatMap((p,ch)=>p?[walk(bank,p,ch,header,id,endFrame)]:[]);
  if(channelStreams.some(s=>s.terminal==='outside-note-table'))fail('Music channel leaves its note table before shared termination.');
  header.endFrame=endFrame;streams.push(...channelStreams);headers.push(header);
  cues.push({id,label:name+' · music',kind:'music-request',bank,musicIndex:index,requestRegister:index<8?0x685:0x684,requestMask:index<8?0x80>>index:0x80>>(index-8),channels:channelStreams.map(s=>s.channel),streamIDs:channelStreams.map(s=>s.id),header:header.source,repeat:header.repeat});
 }
 const groups=[
  [0x680,0xb2bb,[null,'Screw attack','Missile launch','Bomb explosion','Samus walk','Spit flame',null,null]],
  [0x681,0xb2db,['Missile pickup','Energy pickup','Metal','Beam shot','Enemy regeneration','Enemy hit','Jump','Wave beam']],
  [0x683,0xb2fb,['Samus death','Door','Metroid hit','Statue raise','Low energy beep','Large enemy hit','Morph ball','Bomb launch']],
  [0x684,0xbc06,[null,null,null,null,null,'Samus hit','Boss hit','Incorrect password']]
 ];
 for(const [requestRegister,table,names]of groups)for(let bit=0;bit<8;bit++){
  if(!names[bit])continue;
  const mask=0x80>>bit,id='sfx:'+requestRegister.toString(16)+':'+mask,entry=word(1,table+bit*2),kind='effect';
  if(entry<0xb31b||entry>=0xbcaf)fail('SFX handler outside reviewed driver.');
  const cue={id,label:names[bit]+(kind==='control'?' · control':' · SFX'),kind,bank:1,requestRegister,requestMask:mask,table:at(1,table+bit*2),entry:at(1,entry)};cues.push(cue);effects.push(cue);
 }
 const reset={id:'control:reset',label:'Silence / reset · control',kind:'control',bank:1,requestRegister:0x680,requestMask:1,entry:at(1,0xb3eb)};cues.push(reset);effects.push(reset);
 for(let i=0;i<5;i++){
  const pointer=word(1,0xbcb0+i*2),entries=[];let terminal=null;
  for(let n=0;n<64;n++){if(pointer+n<0xbcba||pointer+n>=0xbd31)fail('Envelope outside reviewed table.');const value=b(1,pointer+n);entries.push({index:n,value,source:at(1,pointer+n)});if(value===255||value===240){terminal=value===255?'restore-original-volume':'silence';break;}if(value>15)fail('Invalid envelope volume.');}
  if(!terminal)fail('Unterminated volume envelope.');instruments.push({id:i+1,source:at(1,pointer),terminal,entries});
 }
 for(let bank=0;bank<=5;bank++)drivers.push({bank,update:at(bank,0xb3b4),initialize:at(bank,0xb404),headerIndex:at(bank,0xbbfa),headers:at(bank,0xbd31)});
 return {format:'NESForgeMetroidNativeAudio',version:1,cues,streams,headers,effects,instruments,samples:[],drivers,summary:{musicCues:12,effectCues:effects.filter(c=>c.kind==='effect').length,controlCues:effects.filter(c=>c.kind==='control').length,channelStreams:streams.length,decodedEvents:streams.reduce((n,s)=>n+s.events.length,0),volumeEnvelopes:instruments.length,physicalMusicBanks:6},limitations:['Exact supplied US revision only; other revisions and audio-modified ROMs are not recognized.','Music names and request routing follow the reviewed driver tables. A selected cue runs in its declared physical bank with cleared driver RAM, startup random seeds $11/$FF and one native RNG update per frame; this is a deterministic audition context, not recorded gameplay randomness.','Static channel streams are bounded independently. Native playback owns whole-cue termination, music repetition and SFX arbitration.','Procedural SFX are catalogued by request/handler; their notes come from bounded native execution.','No native audio writer is installed. Editable score import is a finite frame-sampled adaptation using the existing Forge engine.']};
}
return Object.freeze({sha256,decode,limits});
});
