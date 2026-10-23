/* River City Ransom US: original 8000/8003 driver in physical PRG pair 5.
 * Header/command tables are decoded independently; native execution owns time,
 * envelopes and arbitration, including the original generated RAM APU writer.
 * No ROM, music, sample or recovered stream payloads are embedded. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RiverCityAudio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sha256='b95f8def04c0012604b7cc68cf4ed8f49b2dfe4beda6182051de4b2423bea7b1',parts=[{start:0,length:16},{start:0x14010,length:16384},{start:0x1c010,length:16384}];
const hash=b=>(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256(b),need=(x,m)=>{if(!x)throw Error('River City Audio: '+m);};
const audioSha256='46c8ae1dafb75db4eb4c8e1be3edfd1bff40a4fe6038622402b6b088ecbab7ba';
function recognizes(b){return b instanceof Uint8Array&&b.length===262160&&hash(Uint8Array.from(parts.flatMap(p=>Array.from(b.slice(p.start,p.start+p.length)))))===audioSha256;}
const commands=[['pitch',1],['pitch-delta',1],['fraction',1],['fraction-delta',1],['volume',1],['volume-delta',1],['duty-control',1],['gate-scale',1],['gate-limit',1],['tie',0],['articulate',0],['release',0],['tempo',1],['instrument',2],['loop-a',3],['loop-b',3],['jump',2],['call',2],['return',0],['stop',0],['sweep',1],['noop',0],['hold-on',0],['hold-off',0],['transpose',1],['cue-request',1],['repeat-next',1]];
function decode(bytes,expected){
 need(recognizes(bytes)&&hash(bytes)===expected,'Unsupported audio revision.');
 const off=a=>{need(Number.isInteger(a)&&a>=0x8000&&a<0xc000,'Read leaves native audio bank.');return 0x14010+a-0x8000;},b=a=>bytes[off(a)],w=a=>b(a)|(b(a+1)<<8),loc=a=>({bank16KiB:5,cpu:a,fileOffset:off(a)});
 const anchor=(a,v)=>need(v.every((n,i)=>b(a+i)===n),'Driver anchor changed.');anchor(0x8000,[0x4c,0x20,0x80,0x4c,0x46,0x81]);anchor(0x8097,[0xbd,0,0x88]);anchor(0x8129,[0xa9,0,0x8d,0x15,0x40]);
 const streams=[],headers=[],cues=[],instrumentPointers=new Set();
 function walk(start,slot,id){let pc=start,returnTo=null,loops=[0,0],terminal='instruction-limit';const events=[],records=new Map(),seen=new Set();
  const read=()=>{need(pc>=0x89be&&pc<0xb800,'Stream leaves reviewed data.');return b(pc++);};
  for(let step=0;step<8192;step++){
   const key=JSON.stringify([pc,returnTo,loops]);if(seen.has(key)){terminal='structural-cycle';break;}seen.add(key);const address=pc,v=read(),e={source:loc(address),byte:v};if(!records.has(address)){events.push(e);records.set(address,e);}else records.get(address).visits=(records.get(address).visits||1)+1;
   if(v<0x40){e.kind=slot<4?'length-token':'delay-token';continue;}
   if(v<0xc0){e.kind='pitch-or-timer-token';if(slot<4&&(v&128))e.articulation=read();continue;}
   const op=commands[v-0xc0];need(op,'Unknown native command.');e.kind=op[0];e.args=Array.from({length:op[1]},read);const a=e.args;
   if(e.kind==='instrument'&&(slot&3)<2){const ptr=a[0]|a[1]<<8;need(ptr>=0x887e&&ptr<=0x89ba,'Instrument leaves reviewed table.');instrumentPointers.add(ptr);}
   if(v===0xd3){terminal='native-stop';break;}
   if(v===0xd0||v===0xd1){e.target=a[0]|a[1]<<8;if(v===0xd1)returnTo=pc;pc=e.target;}
   if(v===0xd2){need(returnTo!==null,'Return lacks native caller.');pc=returnTo;}
   if(v===0xce||v===0xcf){const slot=v-0xce;if(!loops[slot])loops[slot]=a[0];loops[slot]=(loops[slot]-1)&255;if(loops[slot])pc=a[1]|a[2]<<8;}
  }
  need(terminal!=='instruction-limit','Structural instruction limit reached.');return {id:id+':ch'+slot,cueIds:[id],channel:slot&3,nativeSlot:slot,source:loc(start),events,terminal};
 }
 for(let request=1;request<=63;request++){
  const at=0x8800+(request-1)*2,header=w(at);need(header>=0x89be&&header<0xb800,'Header outside reviewed cue data.');const priority=b(header),music=priority===255,id='request:'+request,entries=[];let p=header+1,terminated=false;
  for(let i=0;i<5;i++){const slot=b(p++);if(slot>=128){terminated=true;break;}need(slot<8&&((slot<4)===music),'Invalid channel routing.');const start=w(p);p+=2;const stream=walk(start,slot,id);streams.push(stream);entries.push({slot,stream:loc(start),streamID:stream.id});}
  need(terminated&&entries.length,'Unterminated native header.');headers.push({id,source:loc(header),table:loc(at),priority,entries});cues.push({id,index:request,label:request===63?'Silence / stop · control':(music?'Music ':'SFX ')+String(request).padStart(2,'0'),kind:request===63?'control':music?'music-request':'effect',bank:5,channels:entries.map(e=>e.slot&3),streamIDs:entries.map(e=>e.streamID),header:loc(header),priority});
 }
 const instruments=[...instrumentPointers].sort((a,b)=>a-b).map((p,id)=>({id,source:loc(p),kind:'native-instrument-control',envelope:loc(w(p)),limitations:['Original envelope execution remains native; editable duty instruments are an adaptation.']}));
 return {format:'NESForgeRiverCityNativeAudio',version:1,cues,headers,streams,instruments,samples:[],driver:{dispatch:loc(0x8000),update:loc(0x8003),table:loc(0x8800),ramApuWriter:0x7f8},summary:{musicRequests:19,uniqueMusicHeaders:new Set(cues.filter(c=>c.kind==='music-request').map(c=>c.header.cpu)).size,effectCues:43,controlCues:1,channelStreams:streams.length,structuralEvents:streams.reduce((n,s)=>n+s.events.length,0),instruments:instruments.length},limitations:['Exact original header, audio PRG pair 5 and fixed PRG pair 7 are required; room tile edits elsewhere retain audio detection.','Music labels are native request indices; request 12 aliases request 2. Human names and gameplay triggers remain unverified.','The structural walker describes bounded parser flow, not timestamps. Tempo, envelopes, repeat-next articulation and cue requests are scheduled by native playback.','Native preview uses a fixed MMC3 PRG pair and cleared RAM, including the original generated RAM APU writer at $07F8; mapper writes remain refused.','No DPCM descriptors are recovered. No native audio writer is installed. Editable scores are finite frame-end adaptations.']};
}
return Object.freeze({sha256,audioSha256,parts,recognizes,decode});
});
