/* Native byte parsers ported from the reviewed private catalog studies. No
 * recovered catalog or commercial ROM/sample payload is embedded in Forge.
 * Known-revision identity gates are explicit; each decoder re-reads source bytes. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.NativeAudioCatalog=api;root.Forge.services.NativeAudioCatalog=api;}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const assert=(test,message='Native data validation failed')=>{if(!test)throw Error(message);};
assert.equal=(a,b,m)=>assert(a===b,m);assert.deepEqual=(a,b,m)=>assert(JSON.stringify(a)===JSON.stringify(b),m);
const copy=x=>JSON.parse(JSON.stringify(x));
const sha=b=>(typeof FamiTone2Native!=='undefined'?FamiTone2Native:require('./famitone2-native.js')).sha256(b);
const profiles=Object.freeze([
{id:'zelda2-us-1',title:'Zelda II — The Adventure of Link',sha256:'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c',bank:6},
{id:'ninja-gaiden-us-1',title:'Ninja Gaiden',sha256:'07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e',bank:3},
{id:'castlevania2-us-1',title:"Castlevania II — Simon's Quest",sha256:'f045d72683d3156555eccbb56090888f03a15e5b25e59db49dca7a87330472d3',bank:0},
{id:'megaman2-us-1',title:'Mega Man 2',sha256:'49136b412ff61beac6e40d0bbcd8691a39a50cd2744fdcdde3401eed53d71edf',bank:12,fixedBank:15}]);
function input(bytes){assert(bytes instanceof Uint8Array,'Choose a NES ROM.');assert(bytes.length>=16&&bytes.length<=64*1024*1024,'ROM size is outside the supported bound.');return bytes;}
async function identify(bytes){input(bytes);const sha256=sha(bytes);return {source:{sha256,byteLength:bytes.length},profile:profiles.find(p=>p.sha256===sha256)||null};}
function zelda(rom,sourceSha256){
const hx=(v,n=4)=>'$'+v.toString(16).toUpperCase().padStart(n,'0');
const loc=a=>({bank16KiB:6,cpu:a,cpuHex:hx(a),fileOffset:0x18010+a-0x8000,fileHex:hx(0x18010+a-0x8000,6)});
function b(a){assert(Number.isInteger(a)&&a>=0x8000&&a<0xc000,'Bank-6 read outside mapped window '+hx(a));return rom[0x18010+a-0x8000];}
const word=a=>b(a)|(b(a+1)<<8),issues=[];
function guard(a,expected){assert.deepEqual(Array.from({length:expected.length},(_,i)=>b(a+i)),expected,'Native semantic anchor '+hx(a));}
// Anchors establish the actual instruction forms used by this decoder.
guard(0x8394,[0xb1,0xe0,0xf0,0xac,0x30,0xf0]);guard(0x8156,[0xb9,0x84,0x80]);
guard(0x906f,[0xaa,0x6a,0x8a,0x2a,0x2a,0x2a,0x29,0x07,0x18,0x65,0xe5]);
guard(0x9c9c,[0xb1,0xe0,0xf0,0x9d]);guard(0x9cab,[0x8a,0x29,0x3e]);
const families=[{id:'title',base:0x84da,headerLength:8,kind:'title',context:'Title/credits mode, entry $8000'},
 {id:'game-context-0',base:0xa000,headerLength:6,kind:'game',contextSelector:[0]},
 {id:'game-context-1-2',base:0xa3ca,headerLength:6,kind:'game',contextSelector:[1,2]},
 {id:'game-context-3-4',base:0xa62f,headerLength:6,kind:'game',contextSelector:[3,4]},
 {id:'game-context-other',base:0xa936,headerLength:6,kind:'game',contextSelector:'Other $0707 values; termination additionally distinguishes 5'}];
const headers=new Map(),cues=[];
for(const family of families){
 for(let bit=0;bit<8;bit++){
  const start=b(family.base+bit),orders=[];let complete=false;
  for(let index=0;index<256;index++){
   const offset=(start+index)&255,headerOffset=b(family.base+offset);
   if(headerOffset===0){complete=true;break;}
   const cpu=family.base+headerOffset,key=family.id+':'+cpu;
   if(!headers.has(key)){
    const stream=word(cpu+1),h={id:key,family:family.id,kind:family.kind,source:loc(cpu),tempoOffset:b(cpu),stream:loc(stream),triangleOffset:b(cpu+3),pulse1Offset:b(cpu+4),noiseOffset:b(cpu+5)};
    if(family.kind==='title'){h.primaryEnvelopeOffset=b(cpu+6);h.secondaryEnvelopeOffset=b(cpu+7);}
    assert(stream>=family.base&&stream<0xb000,'Stream must be inside audio data region');headers.set(key,h);
   }
   orders.push({index,source:loc(family.base+offset),header:key});
  }
  assert(complete,'Order table exceeded bounded 256-byte index');
  cues.push({id:family.id+':'+hx(1<<bit,2),family:family.id,requestMask:1<<bit,requestRegister:family.kind==='title'?0xea:0xeb,indexTableSource:loc(family.base+bit),orderStart:start,orders,terminal:'zero-order-entry',classification:orders.length?'sequence':'empty-request-slot'});
 }
}
function event(h,pointer,channel,tick,duration){
 const a=h.stream.cpu+pointer,v=b(a);let index,period=null,durationIndex=null;
 if(h.kind==='title'){
  assert(v<128&&v!==0,'Expected nonzero note command');index=v===2?2:v+4;
  assert(index<=0x7e&&!(index&1),'Unsupported title note index');
 }else{index=v&0x3e;durationIndex=((v&1)<<2)|(v>>6);duration=b(0x914d+h.tempoOffset+durationIndex);}
 assert(duration>=1&&duration<=255,'Invalid/unknown duration');
 if(channel==='noise'){
  if(h.kind==='title')return {tick,duration,source:loc(a),byte:v,kind:'noise-register-tuple',tuple:[b(0x805d+v),b(0x805e+v),b(0x805f+v)]};
  return {tick,duration,source:loc(a),byte:v,durationIndex,kind:index?'noise-hit':'noise-silence',tuple:index?[0x17,0x0a,0x38]:[0x10,0x0a,0x38]};
 }
 const table=h.kind==='title'?0x808f:0x918f,low=b(table+1+index);period=(b(table+index)&7)<<8|low;
 return {tick,duration,source:loc(a),byte:v,durationIndex,nativeIndex:index,kind:low?'note':'rest-no-timer-write',period:low?period:null};
}
function decodePrimary(h){
 let p=0,tick=0,duration=null;const events=[],commands=[];
 for(let n=0;n<512;n++){
  assert(p<256,'Primary offset would wrap');const a=h.stream.cpu+p,v=b(a);
  if(v===0)return {events,durationTicks:tick,termination:loc(a),commands};
  if(h.kind==='title'&&(v&128)){duration=b(0x8084+h.tempoOffset+(v&15));commands.push({source:loc(a),byte:v,kind:'set-duration',duration});p++;continue;}
  const e=event(h,p,'pulse2',tick,duration);events.push(e);tick+=e.duration;p++;
 }
 throw Error('Primary command bound exceeded');
}
function decodeOther(h,channel,offset,sectionTicks){
 if(!offset)return {status:channel==='pulse1'&&h.kind==='title'?'absent-independent-stream':'absent',events:[]};
 let p=offset,tick=0,duration=null;const events=[],commands=[];let loops=0;
 for(let n=0;n<2048&&tick<sectionTicks;n++){
  assert(p<256,'Channel offset would wrap');const a=h.stream.cpu+p,v=b(a);
  if(channel==='noise'&&v===0){p=offset;loops++;assert(loops<256,'Noise loop bound');continue;}
  if(h.kind==='title'&&(v&128)){duration=b(0x8084+h.tempoOffset+(v&15));commands.push({source:loc(a),byte:v,kind:'set-duration',duration});p++;continue;}
  const e=event(h,p,channel,tick,duration);events.push(e);tick+=e.duration;p++;
 }
 assert(tick>=sectionTicks,'Secondary decoder did not reach primary section boundary');
 return {status:'decoded-to-primary-boundary',events,commands,loopCount:loops,coveredTicks:tick,tailClippedByPrimary:tick-sectionTicks};
}
for(const h of headers.values()){
 try{
  const p=decodePrimary(h);h.durationTicks=p.durationTicks;h.channels={pulse2:{status:'decoded',...p}};
  for(const [ch,off]of [['pulse1',h.pulse1Offset],['triangle',h.triangleOffset],['noise',h.noiseOffset]])h.channels[ch]=decodeOther(h,ch,off,p.durationTicks);
  h.status='decoded';
 }catch(e){h.status='blocked';h.reason=e.message;issues.push({header:h.id,error:e.message});}
}
const envelopes=[{id:'title-normal-duty2',source:loc(0x8017),bytes:Array.from({length:24},(_,i)=>b(0x8017+i)),policy:'Counter starts $5F; index counter>>2; decrements once per update; level holds at table index zero.'},
 {id:'title-normal-duty1',source:loc(0x802f),bytes:Array.from({length:24},(_,i)=>b(0x802f+i)),policy:'Alternative offset $18; no recovered header in this catalog selects it.'},
 {id:'title-fade-in',source:loc(0x8047),bytes:Array.from({length:24},(_,i)=>b(0x8047+i)),policy:'Request bit0 initializes primary/echo levels $20; each onset adds2 until $5F; envelope counter>>2. Echo delayed8 updates while enabled.'},
 {id:'game-pulse',source:loc(0x9135),bytes:Array.from({length:24},(_,i)=>b(0x9135+i)),policy:'Both pulse voices reset envelope count to $18 when music request bit2 set, else $2F; index counter>>1 and decrement; SFX can suppress/reset music envelope.'}];
const sfx=[
 {driver:'title',requestRegister:0xeb,entry:0x821b,slots:[[1,0x819c,'two-pulse stepped tones'],[2,0x81c9,'two-pulse timer pair'],[4,0x81d6,'two-pulse timer pair'],[8,0x823c,'two-pulse sweep/envelope table']]},
 {driver:'game',requestRegister:0xe9,entry:0x920b,slots:[[1,0x9221,'DPCM one-shot gate'],[2,0x9230,'DPCM staged sequence']]},
 {driver:'game',requestRegister:0xef,entry:0x92f4,slots:[[1,0x929c,'stop/reset channel groups'],[2,0x92be,'pulse1 stepped notes'],[4,0x9334,'pulse1 envelope/pitch table'],[8,0x9334,'pulse1 alternate envelope/pitch table'],[16,0x92de,'pulse1 timer effect'],[32,0x937a,'pulse1 low timer effect'],[64,0x93ae,'pulse1 timed tone']]},
 {driver:'game',requestRegister:0xee,entry:0x9408,slots:[[1,0x93e5,'pulse2 stepped tone'],[2,0x942b,'dual-pulse sweep'],[4,0x9490,'pulse2 sweep'],[8,0x94ed,'pulse2 three notes'],[16,0x952b,'pulse2 swept tone'],[32,0x954c,'pulse2 alternating pitch']]},
 {driver:'game',requestRegister:0xed,entry:0x95a7,slots:[[2,0x956c,'triangle/noise hit'],[4,0x95e6,'noise envelope table'],[16,0x95e6,'alternate noise envelope table'],[32,0x9604,'noise pitch offset table'],[64,0x9597,'fixed noise hit'],[128,0x9604,'noise envelope table']]},
 {driver:'game',requestRegister:0xec,entry:0x990b,slots:[[1,0x9834,'pulse1 multi-stage sweep'],[2,0x98c8,'pulse1 envelope/table'],[4,0x99a2,'pulse1 multi-stage sweep'],[8,0x9a20,'pulse1 timed note sequence'],[16,0x9a48,'pulse1 timed note sequence'],[32,0x9a70,'pulse1 timed note sequence'],[64,0x9a98,'pulse1 computed sweep'],[128,0x9ad1,'noise multi-stage envelope'],[192,0x97e0,'special combined-mask pulse1 note sequence'],[96,0x9817,'special combined-mask noise envelope']]}
].map(x=>({...x,entry:loc(x.entry),slots:x.slots.map(([mask,entry,method])=>({mask,entry:loc(entry),method,evidence:'native static control flow; no semantic gameplay name asserted'}))}));
const sfxTables={
 'title:235:8':[0x8074],
 'game:239:4':[0x90f8,0x90fe],'game:239:8':[0x9104],
 'game:237:4':[0x912c],'game:237:16':[0x9123],'game:237:32':[0x90e8],'game:237:128':[0x90e8],
 'game:236:1':[0x9726,0x9736,0x96dd,0x970d,0x96d5,0x96d9],
 'game:236:2':[0x96a6,0x96b6],
 'game:236:4':[0x976c,0x975c,0x9749,0x9755,0x9745,0x977b],
 'game:236:8':[0x9644,0x964b,0x9670],
 'game:236:16':[0x9652,0x9658,0x9670],
 'game:236:32':[0x965e,0x9667,0x9670],
 'game:236:128':[0x978e,0x9780],
 'game:236:192':[0x963a,0x963f,0x9670],
 'game:236:96':[0x969f]
};
const sfxDurations={
 'title:235:1':12,'title:235:2':6,'title:235:4':6,'title:235:8':31,
 'game:233:1':192,'game:233:2':192,
 'game:239:2':24,'game:239:4':20,'game:239:8':59,'game:239:16':2,'game:239:32':12,'game:239:64':48,
 'game:238:1':121,'game:238:2':80,'game:238:4':36,'game:238:8':12,'game:238:16':16,'game:238:32':3,
 'game:237:2':6,'game:237:4':16,'game:237:16':16,'game:237:32':15,'game:237:128':15,
 'game:236:1':192,'game:236:2':31,'game:236:4':96,'game:236:8':127,'game:236:16':127,'game:236:32':159,'game:236:64':96,'game:236:128':107,'game:236:192':127,'game:236:96':6
};
for(const group of sfx)for(const slot of group.slots){const key=group.driver+':'+group.requestRegister+':'+slot.mask;slot.tableReferences=(sfxTables[key]||[]).map(loc);slot.initialLifetimeCounter=sfxDurations[key]??null;slot.counterMeaning='Native initial countdown, not an acoustic sample duration. Reset/one-shot cases can have no lifetime counter.';}
const dpcm=[];for(const y of [1,2,4,5,6,7]){const table=0x917b+y*2,startRegister=b(table),lengthRegister=b(table+1),cpu=0xc000+startRegister*64,bytes=lengthRegister*16+1;dpcm.push({selector:y,source:loc(table),startRegister,lengthRegister,cpu,fileOffset:16+7*16384+(cpu-0xc000),byteLength:bytes,rateRegister:0x0f,role:y===1?'request1 direct':y===2?'request2 initial':'request2 staged selector'});}
for(const cue of cues){cue.sameOrderSequenceAs=cues.filter(other=>other.id!==cue.id&&other.family===cue.family&&cue.orders.length&&other.orders.map(o=>o.header).join('|')===cue.orders.map(o=>o.header).join('|')).map(x=>x.id);}
const summary={completeSongCount:null,musicRequestSlots:cues.length,nonemptyMusicRequestSlots:cues.filter(x=>x.orders.length).length,uniqueHeaders:headers.size,decodedHeaders:[...headers.values()].filter(h=>h.status==='decoded').length,orders:cues.reduce((n,c)=>n+c.orders.length,0),decodedChannelEvents:[...headers.values()].reduce((n,h)=>n+Object.values(h.channels||{}).reduce((s,c)=>s+c.events.length,0),0),sfxDispatchGroups:sfx.length,sfxDispatchCases:sfx.reduce((n,x)=>n+x.slots.length,0),dpcmDescriptors:dpcm.length,structuralIssues:issues.length,perFamily:families.map(f=>({family:f.id,requestSlots:8,nonemptySlots:cues.filter(c=>c.family===f.id&&c.orders.length).length,uniqueSections:[...headers.values()].filter(h=>h.family===f.id).length}))};
const queueStateMachine={title:{entry:loc(0x8000),requestRegisters:{music:0xea,sfx:0xeb},activeState:{music:0xe8,sfx:0xe9},requestConsumption:'Clear $EA and $EB at end of update.',musicPriority:'Lowest set request bit selects one of eight order starts; request bit0 additionally enables delayed echo.',endOfOrders:'If active mask has any low-five bit: 1→2→4→8→16→2 (comparison against exact masks); otherwise stop.',sectionAdvance:'Primary Pulse2 zero byte advances to next order immediately in the same update; all channel cursors/countdowns reset.'},game:{entry:loc(0x9000),muteRegister:0xea,requestRegisters:{dpcm:0xe9,music:0xeb,extendedSfx:0xec,noiseSfx:0xed,pulse2Sfx:0xee,pulse1Sfx:0xef},requestConsumption:'$E9 and $EB–$EF cleared after ordinary update. Nonzero $EA disables $4015 and returns early.',activeState:{music:0x7fb,dpcm:0x7fa,pulse1Sfx:0x7ff,pulse2Sfx:0x7fe,noiseSfx:0x7fd,extendedSfx:0x7e1},musicPriority:'Lowest set request bit selects order slot. Context $0707 selects one of four tables. Mask $10 saves prior low-nibble music to $07DB before replacement.',endOfOrders:'Stop unless active & ($5F when context=5, else $1F). If active bit0 then request2; otherwise reuse active & $4E when nonzero, else resume $07DB.',sectionAdvance:'Pulse2 zero advances to next header; all four countdowns start at1; primary offset becomes0.',channelArbitration:'Active $07FE suppresses Pulse2 music; $07FF or $07DF suppress Pulse1; $07FD bits1/3 suppress triangle writes; $07FD or $07E0 suppress noise. Music parser continues while these writes are suppressed.'}};
const report={format:'NESForgePrivateZelda2NativeCatalog',version:1,source:{sha256:sourceSha256,byteLength:rom.length,mapper:1},method:'Direct ROM-byte decoding anchored to reviewed native code. Exact-revision guard, strict per-bank and 8-bit pointer bounds. No APU-to-note inference. No source ROM copying.',summary,drivers:[{entry:loc(0x8000),name:'title mode',fixedBankCall:{bank16KiB:7,cpu:0xc037,fileOffset:0x1c047}},{entry:loc(0x9000),name:'game mode',fixedBankCall:{bank16KiB:7,cpu:0xc06a,fileOffset:0x1c07a}}],families,cues,headers:[...headers.values()],envelopes,sfx,dpcm,queueStateMachine,issues,limitations:['Exact-revision decoder; other revisions and driver-family recognition remain unsupported.','Request masks are native selector identities, not verified human song/SFX titles. Empty request slots are retained and distinguished from songs.','One header is a section, not necessarily a song; duplicate order references remain aliases.','Primary Pulse2 owns section advancement. Secondary events are bounded to that duration; final duration can be clipped.','Title echo, envelope/sweep, triangle gate and SFX interference require runtime scheduling; event catalog alone is not acoustic equivalence.','DPCM descriptors are addresses/lengths only; no sample payload extracted.','Native code contains priority/suppression and special combined request masks; all arbitrary mask combinations are not separately characterized.']};

return report;
}
function ninja(rom,sourceSha256,selection=null){
const offset=a=>{assert(a>=0x8000&&a<0xc000,'Expected bank-3 CPU address '+a.toString(16));return 0xc010+a-0x8000;};
const r=a=>rom[offset(a)],w=a=>r(a)|(r(a+1)<<8),hex=(a,n=4)=>'$'+a.toString(16).toUpperCase().padStart(n,'0');

// These operands anchor the manually reviewed table relationships. They do not
// purport to recognize other revisions/titles or relocated implementations.
for(const [a,bytes] of [[0x824e,[0xb9,0x7d,0x87]],[0x8253,[0xb9,0x7e,0x87]],[0x837e,[0xbd,0x8b,0x83]],[0x8383,[0xbd,0x8c,0x83]],[0x83d2,[0xbd,0xb1,0x85]],[0x82e5,[0xbd,0x86,0x85]]])assert.deepEqual(Array.from(rom.subarray(offset(a),offset(a)+bytes.length)),bytes);
const tableStart=0x877d,tableEnd=0x8827,entryCount=(tableEnd-tableStart)/2;
const slotNames=['pulse1','pulse2','triangle','noise'];
const descriptors={
  0xe0:['envelope-select',1,0x83cb],0xe2:['duty-control',1,0x84c3],0xe3:['attenuation-control',1,0x83e6],
  0xe4:['hardware-sweep-write',1,0x8499],0xe5:['unsigned-timer-offset',1,0x84f2],
  0xe8:['jump',2,0x83fa],0xe9:['call',2,0x8407],0xea:['return',0,0x8431],
  0xeb:['repeat-begin',1,0x8448],0xec:['repeat-end',0,0x8471],
  0xed:['vibrato-enable',0,0x8500],0xef:['vibrato-disable',0,0x850d],
  0xf0:['skip-three-bytes',3,0x856a],0xf8:['dmc-permission-enable',0,0x8516],0xf9:['dmc-disable',0,0x851c],
  0xfa:['dmc-if-idle',3,0x8525],0xfb:['dmc-retrigger',3,0x8535],0xfe:['fade-step-delay',1,0x8557],0xff:['stop-stream',0,0x84d7]
};
const opcodes=Array.from({length:32},(_,i)=>{const opcode=0xe0+i,[name,argumentsCount,handler]=descriptors[opcode]||['skip-one-byte',1,0x8568];assert.equal(w(0x838b+i*2),handler);return {opcode,name,argumentsCount,handlerCPU:handler,handlerFileOffset:offset(handler)};});
const envelopes=Array.from({length:(0x85df-0x85b1)/2},(_,id)=>{
  const p=w(0x85b1+id*2);assert(p>=0x85df&&p<0x877d);const stages=[];let terminated=false;
  for(let q=p;q+1<0x877d&&stages.length<128;q+=2){const stage={cpu:q,fileOffset:offset(q),delayByte:r(q),levelByte:r(q+1)};stages.push(stage);if(stage.delayByte===255){terminated=true;break;}}
  assert(terminated,'No long-delay marker for envelope '+id);
  return {id,pointerTableCPU:0x85b1+id*2,cpu:p,fileOffset:offset(p),stages,stopReason:'first-255-frame-delay-marker',warning:'$FF is an ordinary 255-update delay, not a native terminator. A sufficiently long note can read beyond it. This preview is bounded at that marker.'};
});
const headers=Array.from({length:entryCount},(_,i)=>{
  const id=i+1,p=w(tableStart+i*2);assert(p>=tableEnd&&p<0xc000);let q=p;const channels=[];
  while(r(q)<128){assert(channels.length<8,'Header too long');const slot=r(q),cpu=w(q+1);assert(slot<8);assert(cpu>=tableEnd&&cpu<0xc000);assert(!channels.some(x=>x.slot===slot));channels.push({slot,channel:slotNames[slot&3],priority:slot<4?'high':'low',streamCPU:cpu,streamFileOffset:offset(cpu)});q+=3;}
  assert.equal(r(q),255);
  return {id,tableCPU:tableStart+i*2,tableFileOffset:offset(tableStart+i*2),headerCPU:p,headerFileOffset:offset(p),headerBytes:q-p+1,channels,dispatchBehavior:id===0x25?'special-global-fade-bypasses-header':'load-header',aliasCommandIDs:[]};
});
assert.equal(Math.min(...headers.map(h=>h.headerCPU)),tableEnd);
for(const h of headers)h.aliasCommandIDs=headers.filter(x=>x.headerCPU===h.headerCPU&&x.id!==h.id).map(x=>x.id);
const uniqueRoots=new Map();for(const h of headers)if(h.id!==0x25)for(const ch of h.channels){const key=[ch.streamCPU,ch.slot].join(':');if(!uniqueRoots.has(key))uniqueRoots.set(key,{...ch,commandIDs:[]});uniqueRoots.get(key).commandIDs.push(h.id);}
const maxInstructions=100000,maxUpdates=1000000;
function decode(root){
  let pc=root.streamCPU,tick=0,duration=null,envelope=null,dutyControl=0,attenuation=0,timerOffset=0,vibrato=false,fadeDelay=0,stack=[];
  const events=[],seen=new Map(),warnings=[],sampleUses=[];let stopReason='instruction-budget',cycle=null;
  for(let n=0;n<maxInstructions;n++){
    if(pc<tableEnd||pc>=0xc000){stopReason='address-outside-bank-data';warnings.push({pc});break;}
    const state=JSON.stringify([pc,duration,envelope,dutyControl,attenuation,timerOffset,vibrato,fadeDelay,stack]);
    if(seen.has(state)){const prior=seen.get(state);cycle={fromEvent:prior.event,toEvent:events.length,firstTick:prior.tick,repeatTick:tick,updatePeriod:tick===null||prior.tick===null?null:tick-prior.tick};stopReason='repeated-parser-state';break;}
    seen.set(state,{event:events.length,tick});
    const address=pc,byte=r(pc++),event={index:events.length,cpu:address,fileOffset:offset(address),byte,tick,slot:root.slot};events.push(event);
    if(byte<128){
      const noise=(root.slot&3)===3,isRest=noise?byte===0x10:(byte&15)===12;
      event.kind=isRest?'rest':noise?'noise-period':'pitched-note';event.durationUpdates=duration===null?null:(duration||256);event.envelopeID=envelope;event.dutyControl=dutyControl;event.attenuation=attenuation;event.timerOffset=timerOffset;event.vibrato=vibrato;event.fadeDelay=fadeDelay;
      if(!isRest){if(noise){event.rawTimer=byte;event.periodWithOffset=(byte+timerOffset)&65535;}else{const noteIndex=byte&15,octaveShift=byte>>>4;event.noteIndex=noteIndex;event.octaveShift=octaveShift;if(noteIndex>=12){warnings.push({cpu:address,kind:'pitched-index-outside-12-note-table',noteIndex});stopReason='unsupported-pitched-index';break;}event.basePeriod=w(0x856e+noteIndex*2)>>>octaveShift;event.periodWithOffset=event.basePeriod+timerOffset;}}
      if(envelope===null&&!isRest)warnings.push({cpu:address,kind:'inherited-envelope-selection-on-sounding-event'});
      if(duration===null){warnings.push({cpu:address,kind:'inherited-duration'});tick=null;}else if(tick!==null)tick+=duration||256;
      if(tick!==null&&tick>maxUpdates){stopReason='update-budget';break;}continue;
    }
    if(byte<0xb0){event.kind='duration';event.durationTableIndex=byte&63;event.durationTableCPU=0x8586+(byte&63);event.durationByte=r(event.durationTableCPU);duration=event.durationByte;if(event.durationTableCPU>=0x85b1)warnings.push({cpu:address,kind:'duration-index-reads-envelope-table'});continue;}
    if(byte<0xe0){event.kind='skip-one-byte';event.args=[r(pc++)];continue;}
    const op=opcodes[byte-0xe0];event.kind=op.name;event.handlerCPU=op.handlerCPU;event.args=Array.from({length:op.argumentsCount},()=>r(pc++));
    const a=event.args[0],target=event.args[0]|event.args[1]<<8;
    if(byte===0xe0){assert(a<envelopes.length,'Envelope ID out of reviewed table');envelope=a;}
    if(byte===0xe2)dutyControl=(dutyControl&0x3f)|a;
    if(byte===0xe3)attenuation=a;
    if(byte===0xe5)timerOffset=a;
    if(byte===0xed)vibrato=true;if(byte===0xef)vibrato=false;if(byte===0xfe)fadeDelay=a;
    if(byte===0xe8){event.targetCPU=target;pc=target;}
    if(byte===0xe9){event.targetCPU=target;stack.push({kind:'call',returnCPU:pc});pc=target;}
    if(byte===0xea){const frame=stack.pop();if(!frame||frame.kind!=='call'){stopReason='unmatched-return';break;}event.targetCPU=frame.returnCPU;pc=frame.returnCPU;}
    if(byte===0xeb){stack.push({kind:'repeat',bodyCPU:pc,remaining:a||256});event.repeatCount=a||256;}
    if(byte===0xec){const frame=stack.at(-1);if(!frame||frame.kind!=='repeat'){stopReason='unmatched-repeat';break;}frame.remaining--;if(frame.remaining){pc=frame.bodyCPU;event.targetCPU=pc;}else stack.pop();}
    if(stack.reduce((sum,s)=>sum+(s.kind==='call'?2:3),0)>6){stopReason='channel-stack-overflow';break;}
    if(byte===0xfa||byte===0xfb){const [control,startRegister,lengthRegister]=event.args,cpu=0xc000+64*startRegister,length=16*lengthRegister+1;assert(cpu+length<=0x10000,'Sample wraps outside reviewed fixed bank');const use={instructionCPU:address,parameterCPU:address+1,slot:root.slot,tick,operation:op.name,control,startRegister,lengthRegister,sampleCPU:cpu,sampleFileOffset:0x1c010+cpu-0xc000,sampleBytes:length,rateIndex:control&15,loop:!!(control&64),irq:!!(control&128)};sampleUses.push(use);event.sample=use;}
    if(byte===0xff){stopReason='stop-stream';break;}
  }
  return {...root,events,cycle,stopReason,parserInstructions:events.length,elapsedUpdates:tick,notes:events.filter(e=>e.kind==='pitched-note'||e.kind==='noise-period').length,rests:events.filter(e=>e.kind==='rest').length,envelopeIDs:[...new Set(events.filter(e=>e.kind==='envelope-select').map(e=>e.args[0]))].sort((a,b)=>a-b),warnings,sampleUses};
}
const streams=[...uniqueRoots.values()].map(decode);
const dmc=new Map();for(const stream of streams)for(const use of stream.sampleUses){const key=[use.control,use.startRegister,use.lengthRegister].join(':');if(!dmc.has(key))dmc.set(key,{...use,commandIDs:[],instructionCPUs:[],operations:[]});dmc.get(key).commandIDs.push(...stream.commandIDs);dmc.get(key).instructionCPUs.push(use.instructionCPU);dmc.get(key).operations.push(use.operation);}
for(const d of dmc.values()){d.commandIDs=[...new Set(d.commandIDs)].sort((a,b)=>a-b);d.instructionCPUs=[...new Set(d.instructionCPUs)].sort((a,b)=>a-b);d.operations=[...new Set(d.operations)].sort();delete d.tick;delete d.slot;delete d.instructionCPU;delete d.parameterCPU;delete d.operation;}
const stopReasons=Object.fromEntries([...new Set(streams.map(s=>s.stopReason))].map(reason=>[reason,streams.filter(s=>s.stopReason===reason).length]));
const allEvents=streams.flatMap(s=>s.events),usedEnvelopeIDs=[...new Set(streams.flatMap(s=>s.envelopeIDs))].sort((a,b)=>a-b);
const summary={commandTableEntries:headers.length,uniqueHeaderPointers:new Set(headers.map(h=>h.headerCPU)).size,specialQueueCommands:1,uniqueStreamPointers:new Set(streams.map(s=>s.streamCPU)).size,rootStreamSlotPairs:streams.length,uniqueNativeTokenAddresses:new Set(allEvents.map(e=>e.cpu)).size,decodedStreamInstructions:allEvents.length,stopReasons,structuralWarnings:streams.flatMap(s=>s.warnings).length,envelopeTableEntries:envelopes.length,referencedEnvelopeIDs:usedEnvelopeIDs,dmcParameterTuples:dmc.size,uniqueDmcSpans:new Set([...dmc.values()].map(d=>[d.sampleFileOffset,d.sampleBytes].join(':'))).size,opcodesUsed:[...new Set(allEvents.filter(e=>e.byte>=0xe0).map(e=>e.byte))].sort((a,b)=>a-b)};
const catalog={format:'NinjaGaidenPrivateNativeAudioCatalog1',input:{sha256:sourceSha256,mapper:1,prgBank16k:3,prgBankFileOffset:0xc010},method:'ROM-byte native parser model derived from bank-3 executed driver and static handler instructions; no APU transcription, memory patch, or presumed title/song naming.',bounds:{commandTableStart:tableStart,commandTableEndExclusive:tableEnd,commandTableBoundaryEvidence:'85 contiguous 16-bit pointers; first referenced header begins exactly at $8827. Driver has no explicit count/range check, so this is a structural extent, not an assertion all queue values are valid.',maxInstructions,maxUpdates,stackBytes:6},summary,headers,opcodes,envelopes,streams,dmc:[...dmc.values()],limits:['This ROM revision only; hash guard is not engine-family recognition.','No names, music/SFX semantic classes, gameplay trigger completion, canonical project import, listening proof, sample binary export, or other revision support.','Parser timelines count driver invocations, not exact video frames; instructions can straddle video-frame boundaries.','DMC entries are encoded requests; conditional busy/suppression and cross-stream competition need whole-engine replay.','Envelopes preview through first $FF delay; that marker is not a native end command.','No whole-song APU/waveform equivalence; vibrato, fade, sweep and channel arbitration are cataloged but not fully synthesized here.','Repeated parser-state closure bounds cyclic streams; no claim that all dormant/unreferenced ROM bytes belong to audio.']};

return {...catalog,streams:catalog.streams.map(s=>selection!==null&&s.commandIDs.includes(selection)?s:{...s,eventCount:s.events.length,events:undefined})};
}
function castlevania(rom,sourceSha256){
const hx=(n,k=4)=>'$'+n.toString(16).toUpperCase().padStart(k,'0');
const off=a=>a<0xc000?a-0x8000+16:a-0xc000+7*0x4000+16;
const b=a=>{if(a<0x8000||a>0xffff)throw Error('Out of PRG '+hx(a));return rom[off(a)]};
const w=a=>b(a)|(b(a+1)<<8),where=a=>({cpuAddress:hx(a),fileOffset:hx(off(a),5),bank16K:a<0xc000?0:7});
const slotNames=['pulse1_music','pulse2','triangle','pulse1_effect_override','noise_effect','percussion_cue_sequencer'];
const records=Array.from({length:0x61},(_,id)=>{let a=0x8137+id*3,v=b(a),ptr=w(a+1);return {id,idHex:hx(id,2),...where(a),slot:v&31,slotName:slotNames[v&31]||'special',recordSpan:(v>>6)+1,stream:where(ptr),route:id===0?'stop_all':id>=0x5d&&id<=0x5f?'dpcm_setup':'stream'};});
const musicHeads=records.filter(r=>r.id>=0x39&&r.id<=0x5c&&r.recordSpan===4).map(r=>r.id);
const parentById={};for(const r of records.filter(r=>r.route==='stream'&&r.recordSpan>1)){for(let i=1;i<r.recordSpan;i++)(parentById[r.id+i]??=[]).push(r.id);}
for(const r of records)r.continuationOf=parentById[r.id]||[];
const stats={};
function decodeStream(start,slot){
  const sfx=slot===4||((b(start)&0xf0)===0);const queue=[{pc:start,loop:null,ret:null}],seen=new Set(),events=[],edges=[],unknown=[];
  while(queue.length){let {pc,loop,ret}=queue.pop();for(let n=0;n<8192;n++){
    const key=[pc,loop,ret].join(':');if(seen.has(key)){edges.push({from:hx(pc),kind:'previously_seen_state'});break;}seen.add(key);
    if(pc<0x8000||pc>=0xaace){unknown.push({at:hx(pc),reason:'outside bounded identified audio-data region; target is not validated'});break;}
    let op=b(pc),size=1,kind,extra={};
    if(op>=0xfb){
      if(op===0xfb||op===0xfc){kind='loop_anchor';loop=pc+1;}
      if(op===0xfd){kind='call';size=3;let target=w(pc+1);if(ret!==null){unknown.push({at:hx(pc),reason:'nested call overwrites one native return slot'});break;}events.push({...where(pc),kind,target:where(target)});edges.push({from:hx(pc),to:hx(target),kind});ret=pc+3;pc=target;continue;}
      if(op===0xfe){size=2;if(b(pc+1)===0xff){kind='jump';size=4;let target=w(pc+2);events.push({...where(pc),kind,target:where(target)});edges.push({from:hx(pc),to:hx(target),kind});pc=target;continue;}kind='repeat';extra.count=b(pc+1);if(loop===null)unknown.push({at:hx(pc),reason:'repeat has no known anchor'});else{edges.push({from:hx(pc),to:hx(loop),kind});queue.push({pc:loop,loop,ret});}}
      if(op===0xff){kind=ret===null?'end':'return';events.push({...where(pc),kind});if(ret===null)break;pc=ret;ret=null;continue;}
    }else if(sfx){
      if((op&0xf0)===0){if(slot===4){kind=op?'set_effect_duration':'effect_event_with_zero_prefix';size=op?1:2;}else if(slot===2){kind=op?'set_effect_duration_and_sweep':'effect_event_with_zero_prefix';size=op?2:3;}else{kind=op?'set_effect_duration_control_sweep':'effect_event_with_zero_prefix';size=3;}}
      else {kind=slot===4?'noise_effect_event':'pitched_effect_timer_event';size=slot===4?1:2;}
    }else if(op<0xd0){kind=slot===5?'percussion_dispatch':(op>>4)===12?'rest':'note';extra.durationMultiplier=(op&15)+1;if(slot===5){const k=op>>4;extra.cueIds=k===12?[]:k===10?[3,b(0x9a47+k)]:[b(0x9a47+k)];}else extra.pitchClass=op>>4;}
    else if(op<0xe0){kind='duration_and_instrument';size=slot===5?1:slot===2?2:4;extra.baseDuration=op&15;if(slot!==5&&slot!==2)extra.envelopeIndex=(b(pc+2)&0x80)?null:b(pc+2);}
    else if(op<0xe6){kind='octave';extra.value=op&15;}
    else if(op<0xec){const kinds=['duration','volume_envelope','gate_release','control_mode','transpose','pitch_effect'];kind=kinds[op-0xe6];size=op===0xeb?3:2;if(op===0xe7)extra.envelopeIndex=(b(pc+1)&0x80)?null:b(pc+1);if(op===0xeb)extra.pitchEnvelopeIndex=b(pc+2);}
    else if(op<0xf0){kind='combined_instrument_pitch_setup';size=4+(slot===5?1:slot===2?2:4);extra.pitchEnvelopeIndex=b(pc+3);if(slot!==5&&slot!==2)extra.envelopeIndex=(b(pc+6)&0x80)?null:b(pc+6);}
    else {kind='volume_attenuation';extra.value=op&15;}
    events.push({...where(pc),kind,byteLength:size,...extra});pc+=size;
  }}
  return {start:where(start),slot,mode:sfx?'effect_timer':'score',structuralStateCount:seen.size,events,edges,unknown};
}
const streams=records.filter(r=>r.route==='stream').map(r=>({recordId:r.id,...decodeStream(parseInt(r.stream.cpuAddress.slice(1),16),r.slot)}));
const envelopeTables=[{name:'volume',address:0x8b3a,count:48,reader:0x9ccd},{name:'pitch',address:0x8cd0,count:32,reader:0x9c6f}].map(t=>({...t,address:hx(t.address),reader:where(t.reader),boundaryEvidence:'Pointer table ends exactly at first referenced stream; count is structural, no native index range check.',entries:Array.from({length:t.count},(_,index)=>({index,target:where(w(t.address+index*2))}))}));
for(const t of envelopeTables){const targets=t.entries.map(e=>e.target.cpuAddress);for(const e of t.entries)e.aliases=t.entries.filter(x=>x.index!==e.index&&x.target.cpuAddress===e.target.cpuAddress).map(x=>x.index);t.uniqueTargets=new Set(targets).size;}
const samples=records.filter(r=>r.route==='dpcm_setup').map(r=>{let a=0xfbc4+(r.id-0x5d)*4,control=b(a),start=0xc000+b(a+2)*64,length=b(a+3)*16+1;return {cueId:r.id,configuration:where(a),control,initialDac:b(a+1),rateIndex:control&15,loop:!!(control&64),sampleStart:where(start),lengthBytes:length,sampleEnd:where(start+length-1),sampleSha256:sha(rom.subarray(off(start),off(start)+length)),payloadExported:false};});
const structural={rom:{sha256:sourceSha256,size:rom.length},scope:'Exact-ROM structural catalog, not generic recognition or editable import. Private addresses and summaries only; original ROM/sample payloads excluded.',driver:{dispatch:where(0xa29b),update:where(0x967d),table:where(0x8137),recordStride:3,stopIds:[0,0x61],supportedCatalogIds:[1,0x60],higherIds:'Not range-checked by native code; not cataloged as valid cues.',percussionMap:Array.from({length:12},(_,n)=>({noteNibble:n,cueIds:n===10?[3,b(0x9a47+n)]:[b(0x9a47+n)]}))},records,groups:records.filter(r=>r.route==='stream'&&r.continuationOf.length===0).map(r=>({id:r.id,classification:musicHeads.includes(r.id)?'four_channel_music_candidate':'effect_candidate',recordIds:Array.from({length:r.recordSpan},(_,i)=>r.id+i)})),streams,envelopeTables,samples};

return structural;
}
const hx=n=>'$'+n.toString(16).toUpperCase().padStart(2,'0');
function build(bytes,identity,selection=null){
 const {profile,source}=identity;assert(profile,'This ROM revision has no installed native audio decoder.');assert(bytes.length===262160&&bytes[0]===78&&bytes[1]===69&&bytes[2]===83&&bytes[3]===26&&bytes[4]===(profile.id==='megaman2-us-1'?16:8)&&bytes[5]===(profile.id==='megaman2-us-1'?0:16)&&((bytes[6]>>4)|(bytes[7]&240))===1&&!(bytes[6]&4),'Known revision header layout differs.');
 const native=profile.id==='megaman2-us-1'?(typeof MegaMan2Audio!=='undefined'?MegaMan2Audio:require('./megaman2-audio.js')).decode(bytes,source.sha256):profile.id==='zelda2-us-1'?zelda(bytes,source.sha256):profile.id==='ninja-gaiden-us-1'?ninja(bytes,source.sha256,selection):castlevania(bytes,source.sha256);
 let cues,instruments,samples,summary,limitations;
 if(profile.id==='megaman2-us-1'){({cues,instruments,samples,summary,limitations}=native);
 }else if(profile.id==='zelda2-us-1'){
 cues=native.cues.map(c=>({id:c.id,label:c.family+' · request '+hx(c.requestMask)+(c.orders.length?'':' · empty slot'),kind:c.orders.length?'music-request':'empty-request',family:c.family,requestMask:c.requestMask,requestRegister:c.requestRegister,orders:c.orders,aliases:c.sameOrderSequenceAs}));
 for(const g of native.sfx)for(const s of g.slots)cues.push({id:g.driver+':sfx:'+g.requestRegister+':'+s.mask,label:g.driver+' · SFX '+hx(g.requestRegister)+' / '+hx(s.mask),kind:'effect',driver:g.driver,requestRegister:g.requestRegister,requestMask:s.mask,...s});
 instruments=native.envelopes;samples=native.dpcm;summary=native.summary;limitations=native.limitations;
 }else if(profile.id==='ninja-gaiden-us-1'){
 cues=native.headers.map(c=>({...c,id:String(c.id),label:'Command '+hx(c.id)+(c.id===0x25?' · global fade':''),kind:c.id===0x25?'control':'command'}));instruments=native.envelopes;samples=native.dmc;summary=native.summary;limitations=native.limits;
 }else{
 cues=native.groups.map(g=>({...g,id:String(g.id),label:'Cue '+hx(g.id)+' · '+g.classification.replaceAll('_',' '),kind:g.classification==='four_channel_music_candidate'?'music-candidate':'effect-candidate',channels:g.recordIds.map(id=>native.records[id])}));
 for(const s of native.samples)cues.push({id:String(s.cueId),label:'DPCM cue '+hx(s.cueId),kind:'dpcm',...s});
 instruments=native.envelopeTables;samples=native.samples;summary={musicGroupCandidates:native.groups.filter(g=>g.classification==='four_channel_music_candidate').length,effectGroupCandidates:native.groups.filter(g=>g.classification==='effect_candidate').length,channelRecords:native.streams.length,structuralCommands:native.streams.reduce((n,s)=>n+s.events.length,0),unknowns:native.streams.flatMap(s=>s.unknown),volumeEnvelopePointers:48,pitchEnvelopePointers:32,dpcmConfigurations:samples.length};limitations=['Native command structure is decoded; this static walker is not a timed score decoder.','One effect edge leaves the bounded audio-data region and remains unknown.','Music/effect groups are structural candidates; human names and all gameplay triggers remain unknown.'];
 }
 return {format:'NESForgeNativeAudioCatalog',version:1,status:'decoded',source:copy(source),profile:copy(profile),summary,cues,instruments,samples,native,limitations:[...limitations,'Known revision only. Cue IDs and aliases are native identities, not verified song names.','Catalog evidence is separate from an editable project. Controlled native playback and canonical transcription disclose their own limits.']};
}
async function inspect(bytes){bytes=input(bytes).slice();const identity=await identify(bytes);if(!identity.profile)return {format:'NESForgeNativeAudioCatalog',version:1,status:'unknown',...identity,cues:[],instruments:[],samples:[],limitations:['No installed native catalog matches this revision. No claim that audio is absent. Existing FamiTone2 and runtime investigation remain available.']};return build(bytes,identity);}
async function selection(bytes,id){bytes=input(bytes).slice();const identity=await identify(bytes),catalog=build(bytes,identity,identity.profile?.id==='ninja-gaiden-us-1'?Number(id):null),cue=catalog.cues.find(c=>c.id===String(id));assert(cue,'Select a catalog cue.');let streams;if(identity.profile.id==='megaman2-us-1')streams=catalog.native.streams.filter(s=>cue.streamIDs.includes(s.id));else if(identity.profile.id==='zelda2-us-1')streams=(cue.orders||[]).map(o=>catalog.native.headers.find(h=>h.id===o.header));else if(identity.profile.id==='ninja-gaiden-us-1')streams=catalog.native.streams.filter(s=>s.commandIDs.includes(Number(id)));else streams=catalog.native.streams.filter(s=>cue.recordIds?.includes(s.recordId));return {source:catalog.source,profile:catalog.profile,cue,streams,instruments:catalog.instruments,samples:catalog.samples,limitations:catalog.limitations};}
return Object.freeze({version:1,profiles,identify,inspect,selection});
});
