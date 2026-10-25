/* Shadowgate US native Audio. Tables and structural commands are read from the
 * supplied bank 5. Original routines F416/F526 own scheduling and articulation.
 * No recovered score, instrument bytes or commercial samples are embedded. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShadowgateAudio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sha256='f3eeeefb3a1359cf45ad8a5033525ae4be050b9fb9cbe2105e09637aad00a9be',parts=[{"start": 0, "length": 16}, {"start": 81936, "length": 16384}, {"start": 114704, "length": 16384}],audioSha256='96b042625e9b5c7242756c0ada9330689bd4030082066bf5a316cb495c2e5046';
const hash=b=>(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256(b),need=(x,m)=>{if(!x)throw Error('Shadowgate Audio: '+m);};
function recognizes(b){return b instanceof Uint8Array&&b.length===262160&&hash(Uint8Array.from(parts.flatMap(p=>Array.from(b.slice(p.start,p.start+p.length)))))===audioSha256;}
function decode(bytes,expected){
 need(recognizes(bytes)&&hash(bytes)===expected,'Unsupported audio revision.');
 const off=a=>{need(Number.isInteger(a)&&a>=0x8000&&a<0xc000,'Read leaves native audio pair.');return 0x14010+a-0x8000;},b=a=>bytes[off(a)],w=a=>b(a)|(b(a+1)<<8),loc=a=>({bank16KiB:5,cpu:a,fileOffset:off(a)}),cues=[],headers=[],streams=[],instruments=[],inst=new Map();
 function walk(start,slot,id){let pc=start,terminal='instruction-bound';const stack=[],seen=new Set(),events=[],records=new Map();const read=()=>{need(pc>=0x8046&&pc<0xa000,'Stream leaves reviewed cue data.');return b(pc++);};
  for(let step=0;step<32768;step++){
   const state=JSON.stringify([pc,stack]);if(seen.has(state)){terminal='structural-cycle';break;}seen.add(state);const address=pc,v=read(),e={source:loc(address),byte:v};if(!records.has(address)){events.push(e);records.set(address,e);}else records.get(address).visits=(records.get(address).visits||1)+1;
   if(v===255){e.kind='stop';terminal='native-stop';break;}
   if(v<128){e.kind=v===126?'extend-duration':v===127?'rest':slot%4===3?'noise-token':'pitch-index';continue;}
   if(v<192){e.kind='length-table';e.index=v&31;need(e.index<19,'Duration table leaves reviewed extent.');continue;}
   if(v<207){e.kind='repeat-start';e.count=v&15;need(stack.length<4,'Native repeat stack exceeded.');stack.push({count:0,target:e.count,start:pc});continue;}
   if(v===207){e.kind='repeat-end';const top=stack.at(-1);if(top){top.count=(top.count+1)&255;if(top.count===top.target)stack.pop();else pc=top.start;}while(b(pc)>=0xd0&&b(pc)<0xe0)pc++;continue;}
   if(v<224){e.kind='alternate-ending';e.iteration=(v&15)-1;need(stack.length,'Alternate ending has no repeat.');if(stack.at(-1).count!==e.iteration){let found=false;for(let scan=0;scan<8192;scan++){const next=read();if(next===207||next>=208&&next<224){pc--;found=true;break;}}need(found,'Alternate ending scan exceeded bound.');}continue;}
   e.args=[read(),read()];if(v<=227){e.kind=v===227?'noise-instrument':v===226?'triangle-instrument':'pulse-instrument';e.target=e.args[0]|e.args[1]<<8;need(e.target>=0x8046&&e.target<0xa000,'Instrument leaves reviewed bank.');const key=v+':'+e.target;if(!inst.has(key)){inst.set(key,1);instruments.push({id:key,kind:e.kind,source:loc(e.target),...(v<226?{envelope:loc(e.target+4),envelopeBytes:64}:{}),limitations:['Original instrument execution remains native; no canonical equivalence is implied.']});}}
   else e.kind='ignored-native-command';
  }
  need(terminal!=='instruction-bound','Structural instruction bound reached.');return {id:id+':slot'+slot,cueIds:[id],channel:[0,1,2,3,0,1,2,1,3][slot],nativeSlot:slot,source:loc(start),events,terminal};
 }
 for(let index=0;index<35;index++){
  const header=w(0x8000+index*2),type=b(header),id='request:'+(index+1),entries=[];need(header>=0x8046&&header<0xa000,'Header leaves reviewed bank.');
  if(type>4){headers.push({id,source:loc(header),table:loc(0x8000+index*2),type,status:'unresolved'});cues.push({id,index:index+1,label:'Request '+(index+1)+' · invalid standalone header',kind:'unavailable-request',bank:5,channels:[],streamIDs:[],reason:'This source slot points to a byte outside the driver header dispatch range (0–4). It is not offered for isolated execution.'});continue;}
  const slots=type===2?[4,5,6]:type===3?[7,8]:[0,1,2,3];for(let j=0;j<slots.length;j++){const slot=slots[j],entry=header+1+(type===3?(j?6:2):j*2),start=w(entry);if(!start)continue;const stream=walk(start,slot,id);streams.push(stream);entries.push({slot,channel:stream.channel,stream:loc(start),streamID:stream.id});}
  headers.push({id,source:loc(header),table:loc(0x8000+index*2),type,entries});cues.push({id,index:index+1,label:(type===1?'Music ':'SFX ')+String(index+1).padStart(2,'0'),kind:type===1?'music-request':'effect',headerType:type,bank:5,header:loc(header),channels:entries.map(e=>e.channel),streamIDs:entries.map(e=>e.streamID)});
 }
 return {format:'NESForgeShadowgateNativeAudio',version:1,cues,headers,streams,instruments,samples:[],driver:{initialize:{bank16KiB:7,cpu:0xf3be},dispatch:{bank16KiB:7,cpu:0xf416},update:{bank16KiB:7,cpu:0xf526},table:loc(0x8000)},summary:{musicRequests:cues.filter(c=>c.kind==='music-request').length,uniqueMusicHeaders:new Set(cues.filter(c=>c.kind==='music-request').map(c=>c.header.cpu)).size,effectCues:cues.filter(c=>c.kind==='effect').length,unavailableRequests:cues.filter(c=>c.kind==='unavailable-request').length,channelStreams:streams.length,structuralEvents:streams.reduce((n,s)=>n+s.events.length,0),instruments:instruments.length},limitations:['Exact original header, audio pair 5 and fixed pair 7 are required. Picture edits in pairs 0–1 retain audio detection.','Native labels are request indices; song names and gameplay triggers are not verified. Duplicate native table entries remain visible.','One table slot has no valid standalone header and is explicitly unavailable. It is never executed or replaced with guessed audio.','Structural streams are bounded command-flow evidence, not timed scores. The native driver owns tempo, envelopes, repeats and channel arbitration.','Preview calls the already-banked original routines without mapper access; live MMC3 comparisons verify this fixed mapping.','No DPCM commands or samples are recovered. No native audio writer is installed. Editable excerpts are finite frame-end adaptations.']};
}
return Object.freeze({sha256,audioSha256,parts,recognizes,decode});
});
