/* Native FamiTone2 evidence decoder. Research API; no canonical Forge conversion. */
(function(root,factory){if(typeof module!=="undefined"&&module.exports)module.exports=factory(require('./famitone2-driver-profile.js'));else root.FamiTone2Native=factory(root.FamiTone2DriverProfile);})(typeof globalThis!=="undefined"?globalThis:this,function(PROFILE){
'use strict';
const VERSION='famitone2-native-nrom-1';
const REGISTERS=[0x4000,0x4002,0x4003,0x4004,0x4006,0x4007,0x4008,0x400a,0x400b,0x400c,0x400e];
const CHANNELS=['pulse1','pulse2','triangle','noise','dpcm'];
function fail(code,message,details){const e=new Error(message);e.code=code;e.details=details;throw e;}
function hash(data){ // SHA-256, synchronous and independent of Node/browser APIs.
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Int32Array(64);const p=new Uint8Array(Math.ceil((data.length+9)/64)*64);p.set(data);p[data.length]=128;let bits=data.length*8;for(let i=0;i<8;i++){p[p.length-1-i]=bits%256;bits=Math.floor(bits/256);}const r=(x,n)=>(x>>>n)|(x<<(32-n));for(let at=0;at<p.length;at+=64){for(let i=0;i<16;i++)w[i]=(p[at+i*4]<<24)|(p[at+i*4+1]<<16)|(p[at+i*4+2]<<8)|p[at+i*4+3];for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))|0;}let[a,b,c,d,e,f,g,z]=h;for(let i=0;i<64;i++){let t1=(z+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])|0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))|0;z=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}[a,b,c,d,e,f,g,z].forEach((v,i)=>h[i]=(h[i]+v)|0);}return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
function asBytes(input){if(input instanceof Uint8Array)return input;if(input instanceof ArrayBuffer)return new Uint8Array(input);fail('INPUT','Expected Uint8Array or ArrayBuffer');}
function mapping(bytes){
 if(bytes.length<16||bytes[0]!==78||bytes[1]!==69||bytes[2]!==83||bytes[3]!==26)fail('CONTAINER','An iNES ROM is required');
 if((bytes[7]&12)===8)fail('UNSUPPORTED_CONTAINER','NES 2.0 is outside this profile');
 const mapper=(bytes[6]>>>4)|(bytes[7]&240);if(mapper!==0)fail('UNSUPPORTED_MAPPER','Only statically mapped NROM is supported');
 if(![1,2].includes(bytes[4]))fail('UNSUPPORTED_PRG','NROM requires one or two 16 KiB PRG banks');
 if(bytes[7]&3)fail('UNSUPPORTED_SYSTEM','VS/PlayChoice containers are outside this profile');
 const start=16+((bytes[6]&4)?512:0),size=bytes[4]*16384,required=start+size+bytes[5]*8192;
 if(bytes.length<required)fail('TRUNCATED','ROM shorter than declared PRG/CHR/trainer layout');
 if(bytes[5]>1||bytes.length!==required)fail('UNSUPPORTED_LAYOUT','Profile requires CHR RAM or one 8 KiB CHR bank and exact declared container length');
 const offset=(address,length=1)=>{if(!Number.isInteger(address)||!Number.isInteger(length)||length<1||address<0x8000||address+length>0x10000)fail('POINTER','Address is outside mapped PRG',{address,length});const o=(address-0x8000)%size;if(o+length>size)fail('POINTER_WRAP','Span crosses a PRG mirror boundary',{address,length});return start+o;};
 return{start,size,mapper,trainerBytes:start-16,canonicalBase:size===16384?0xc000:0x8000,offset,canonical:a=>(size===16384?0xc000:0x8000)+(offset(a)-start),read:a=>bytes[offset(a)],word:a=>{const o=offset(a,2);return bytes[o]|(bytes[o+1]<<8);}};
}
function reachable(m){
 const seen=new Map(),queue=[m.word(0xfffa),m.word(0xfffc),m.word(0xfffe)],unsupported=[],entries=new Set(queue.filter(a=>a>=0x8000).map(a=>m.canonical(a)));const entry=a=>{if(a>=0x8000&&a<=0xffff)entries.add(m.canonical(a));};
 while(queue.length){let pc=queue.pop();for(let count=0;count<32768;count++){
  if(pc<0x8000||pc>0xffff)break;pc=m.canonical(pc);if(seen.has(pc))break;
  const opcode=m.read(pc),spec=PROFILE.opcodes[opcode];if(!spec){unsupported.push({address:pc,opcode});break;}let operand=0;try{m.offset(pc,spec[2]);if(spec[2]>1)operand=m.read(pc+1);if(spec[2]===3)operand|=m.read(pc+2)<<8;}catch(_){break;}
  const node={address:pc,opcode,name:spec[0],mode:spec[1],length:spec[2],operand};seen.set(pc,node);const next=pc+spec[2];
  if(spec[1]==='r'){const target=next+((operand&128)?operand-256:operand);entry(target);entry(next);queue.push(target);pc=next;continue;}
  if(opcode===0x20){entry(operand);queue.push(operand);pc=next;continue;}
  if(opcode===0x4c){entry(operand);pc=operand;continue;}
  if([0x00,0x40,0x60,0x6c].includes(opcode))break;pc=next;
 }}return{nodes:seen,unsupported,entries};
}
function findDrivers(m){
 const out=[];for(let base=m.canonicalBase;base+PROFILE.driverLength<=0x10000;base++){
  if(m.read(base)!==0x8e)continue;let ram,zp,ok=true;
  for(const [off,op,n,kind,value] of PROFILE.entries){if(m.read(base+off)!==op){ok=false;break;}let actual=n===1?0:n===2?m.read(base+off+1):m.word(base+off+1),expected=value;
   if(kind==='ram'){if(ram===undefined)ram=actual-value;expected=ram+value;if(ram<0x100||ram>0x700||(ram&255)!==0){ok=false;break;}}
   else if(kind==='zp'){if(zp===undefined)zp=actual-value;expected=zp+value;if(zp<0||zp>253){ok=false;break;}}
   else if(kind==='driver'){expected=base+value;if(actual>=0x8000)actual=m.canonical(actual);}
   else if(kind==='driverLow')expected=(base+value)&255;
   else if(kind==='driverHigh'){expected=(base+value)>>8;if(m.size===16384&&actual===expected-64)actual=expected;}
   if(actual!==expected){ok=false;break;}
  }
  if(ok&&[0xc0,0,0].every((v,i)=>m.read(base+PROFILE.symbols._ft2dummyenvelope+i)===v))out.push({base,ramBase:ram,zeroPageBase:zp,variant:PROFILE.variant,symbols:Object.fromEntries(Object.entries(PROFILE.symbols).map(([k,v])=>[k,base+v]))});
 }return out;
}
function callsTo(m,graph,target){
 const calls=[];for(const node of graph.nodes.values()){if(node.opcode!==0x20||node.operand<0x8000||m.canonical(node.operand)!==target)continue;
  // Straight-line immediate argument proof only. Branches, calls and uncertain writes cut the proof.
  const predecessors=[];let pc=node.address;for(let i=0;i<12;i++){if(graph.entries.has(pc))break;const prev=[1,2,3].map(n=>graph.nodes.get(pc-n)).filter(x=>x&&x.address+x.length===pc);if(prev.length!==1)break;const p=prev[0];if(['JSR','JMP','RTS','RTI','BRK'].includes(p.name)||p.mode==='r')break;predecessors.unshift(p);pc=p.address;}
  let A=null,X=null,Y=null;for(const p of predecessors){if(p.name==='LDA')A=p.mode==='m'?p.operand:null;else if(p.name==='LDX')X=p.mode==='m'?p.operand:null;else if(p.name==='LDY')Y=p.mode==='m'?p.operand:null;else if(['ADC','SBC','AND','ORA','EOR','PLA','TXA','TYA'].includes(p.name)||(['ASL','LSR','ROL','ROR'].includes(p.name)&&p.mode==='a'))A=null;else if(['TAX','TSX','INX','DEX'].includes(p.name))X=null;else if(['TAY','INY','DEY'].includes(p.name))Y=null;}
  calls.push({address:node.address,A,X,Y,argumentStart:pc});
 }return calls;
}
function context(bytes,m,driver,graph){
 const claims=new Map(),boundaries=new Map();for(let i=0;i<PROFILE.driverLength;i++)claims.set(m.offset(driver.base+i),'driver');for(const n of graph.nodes.values())for(let i=0;i<n.length;i++)if(!claims.has(m.offset(n.address+i)))claims.set(m.offset(n.address+i),'code');
 function span(address,length,role){const offset=m.offset(address,length);if(['channel','envelope','sfx'].includes(role)){for(let i=0;i<length;i++){const prior=boundaries.get(offset+i);if(prior&&(prior.start!==offset||prior.length!==length))fail('MISALIGNED_TARGET','Native stream enters or overlaps an operand',{address,role});}for(let i=0;i<length;i++)boundaries.set(offset+i,{start:offset,length});}const raw=Array.from(bytes.subarray(offset,offset+length));for(let i=0;i<length;i++){const existing=claims.get(offset+i);if(existing&&existing!==role){if(role==='envelope'&&address===driver.symbols._ft2dummyenvelope&&length<=3)continue;fail('OVERLAP','Native data overlaps another proven byte role',{address:address+i,role,existing});}claims.set(offset+i,role);}return{address,fileOffset:offset,length,bytes:raw};}
 let work=0;function take(){if(++work>16384)fail('GLOBAL_BUDGET','Native decode exceeds the global 16,384-event work/output budget');}return{bytes,m,driver,span,claims,take};
}
function channel(ctx,address,index,limits){
 let pc=address,row=0,instrument=0,ref=0,ret=0,lastSpeed=6;const events=[],seen=new Map();let loop=null;
 for(let n=0;n<limits.events;n++){ctx.take();
  const key=[ctx.m.canonical(pc),ref,ref?ret:0,instrument,lastSpeed].join(':');if(seen.has(key)){loop={startRow:seen.get(key),endRow:row,rows:row-seen.get(key),address:pc};if(!loop.rows)fail('NONPRODUCTIVE_LOOP','Channel cycle consumes no rows');break;}seen.set(key,row);
  const b=ctx.m.read(pc),length=b===0xfb?2:b===0xfd?3:b===0xff?4:1,source=ctx.span(pc,length,'channel'),ev={row,source};pc+=length;let parsed=false;
  if(b<128){ev.kind=b>>1?'note':'cut';ev.noteCode=b>>1;ev.instrumentId=instrument;ev.emptyFollowingRow=!!(b&1);ev.durationRows=1+(b&1);row+=ev.durationRows;parsed=true;}
  else if(!(b&1)){instrument=(b&127)>>1;ev.kind='instrument';ev.instrumentId=instrument;}
  else if(b<0xfb){ev.kind='empty';ev.durationRows=1+((b&127)>>1);row+=ev.durationRows;parsed=true;}
  else if(b===0xfb){ev.kind='speed';ev.speed=source.bytes[1];lastSpeed=ev.speed;ev.stopsOrPauses=ev.speed===0||!!(ev.speed&128);}
  else if(b===0xfd){ev.kind='jump';ev.target=source.bytes[1]|source.bytes[2]<<8;ctx.m.offset(ev.target);pc=ev.target;}
  else {if(ref)fail('NESTED_REFERENCE','Nested native references overwrite the return slot; outside safe profile');ref=source.bytes[1];if(!ref)fail('ZERO_REFERENCE','Zero-length reference has no bounded return');ret=pc;ev.kind='reference';ev.eventCount=ref;ev.target=source.bytes[2]|source.bytes[3]<<8;ctx.m.offset(ev.target);pc=ev.target;}
  events.push(ev);if(parsed&&ref){ref--;if(!ref){events.push({kind:'referenceReturn',row,target:ret,source:null});pc=ret;}}
  if(row>limits.rows)fail('ROW_LIMIT','Channel expanded row budget exceeded');
 }
 if(!loop)fail('EVENT_LIMIT','No bounded channel loop found within instruction budget');
 return{channel:CHANNELS[index],index,address,events,loop,logicalRows:row,timeline:'logical rows, before global frame scheduling'};
}
function envelope(ctx,address){
 const events=[],seen=new Map(),starts=new Set();let offset=0,frame=0,value=null,loop;
 for(let n=0;n<512;n++){ctx.take();
  const state=offset+':'+value;if(seen.has(state)){loop={offset,startFrame:seen.get(state),endFrame:frame,frames:frame-seen.get(state)};if(!loop.frames)fail('NONPRODUCTIVE_ENVELOPE','Envelope loop emits no frames');break;}seen.set(state,frame);
  if(offset<0||offset>255)fail('ENVELOPE_WINDOW','Envelope exceeds its 8-bit index window');const b=ctx.m.read(address+offset),length=b===0?2:1;if(offset+length>256)fail('ENVELOPE_WINDOW','Envelope operand wraps its 8-bit index');const source=ctx.span(address+offset,length,'envelope');starts.add(offset);const ev={offset,frame,source};
  if(b>=128){value=b-192;ev.kind='value';ev.value=value;ev.durationFrames=1;frame++;offset++;}
  else if(b){if(value===null)fail('INHERITED_ENVELOPE','Leading envelope hold depends on inherited native state');ev.kind='hold';ev.value=value;ev.durationFrames=b;frame+=b;offset++;}
  else{ev.kind='jump';ev.targetOffset=source.bytes[1];offset=ev.targetOffset;}
  events.push(ev);
 }
 if(!loop)fail('ENVELOPE_LIMIT','No bounded envelope loop');for(const e of events)if(e.kind==='jump'&&!starts.has(e.targetOffset))fail('MISALIGNED_ENVELOPE','Envelope loop enters operand data');
 return{address,events,loop,clock:'one update per active video frame',signedRange:[-64,63]};
}
function sfxStream(ctx,address,region){
 let off=0,frame=0;const events=[],used=new Set();for(let n=0;n<256;n++){ctx.take();
  if(off>=256)fail('SFX_WINDOW','SFX stream did not terminate within its 8-bit index window');const b=ctx.m.read(address+off),length=b>=128?2:1;if(off+length>256)fail('SFX_WINDOW','SFX operand wraps its 8-bit index');const source=ctx.span(address+off,length,'sfx'),ev={frame,source};off+=length;
  if(b===0){ev.kind='end';ev.mixesRetainedBufferThisFrame=true;events.push(ev);return{address,region,events,byteLength:off,endFrame:frame,registers:[...used],clock:'video frames',mixing:'louder-or-equal pulse/noise; nonzero triangle; later streams win ties'};}
  if(b<128){ev.kind='delay';ev.frames=b;frame+=b;}else{if(b>0x8a)fail('SFX_REGISTER','SFX opcode exceeds the 11-register output buffer');ev.kind='register';ev.register=REGISTERS[b-128];ev.value=source.bytes[1];used.add(ev.register);}events.push(ev);
 }fail('SFX_WINDOW','SFX stream did not terminate within its 8-bit index window');
}
const BASE_LIMITATIONS=[
 'This profile recognizes one linked FamiTone2 v1.11 instruction variant, not every FamiTone port or ROM engine.',
 'Native evidence only: no automatic conversion into canonical Forge Audio patterns.',
 'Music rows use a fixed-point video-frame accumulator; envelopes update every active video frame.',
 'Pulse and triangle share native timer values but produce different pitches; native timers may differ from Forge tuning.',
 'Speed commands are global and channels execute pulse1, pulse2, triangle, noise, DPCM order.',
 'DPCM recovery is unsupported: this port and its converter disagree on sample-entry stride.',
 'SFX are register-buffer updates with native arbitration, not single-channel Forge pattern effects.',
 'Static call discovery cannot prove all runtime call IDs or dynamically supplied pointers; inventories are explicitly partial.'
];
function decode(input,options={}){
 let bytes,m;const result={status:'unknown',method:VERSION,native:null,diagnostics:[],limitations:[...BASE_LIMITATIONS]};try{
  bytes=asBytes(input);m=mapping(bytes);result.source={sha256:hash(bytes),byteLength:bytes.length,container:'iNES',mapper:0,prgBytes:m.size,trainerBytes:m.trainerBytes};
  const graph=reachable(m),drivers=findDrivers(m);result.recognition={matchedDriverStructures:drivers.length,reachableInstructions:graph.nodes.size,unexploredIllegalOpcodes:graph.unsupported,method:'606 linked 6502 instructions, relocatable RAM/zero-page/code references; reachable immediate initialization call proof'};
  const candidates=[];for(const driver of drivers){if(!graph.nodes.has(driver.base))continue;for(const call of callsTo(m,graph,driver.base)){if(call.X===null||call.Y===null||call.A===null)continue;candidates.push({driver,call,musicAddress:call.X|(call.Y<<8),region:call.A?'NTSC':'PAL'});}}
  const unique=[...new Map(candidates.map(c=>[[c.driver.base,c.musicAddress,c.region].join(':'),c])).values()];result.recognition.initializations=unique.map(c=>({driverAddress:c.driver.base,musicAddress:c.musicAddress,region:c.region,call:c.call}));
  if(!unique.length){result.diagnostics.push({code:'NO_PROFILE',message:'No supported linked driver with a statically proven reachable initialization was found'});return result;}
  if(unique.length!==1){result.status='ambiguous';result.diagnostics.push({code:'MULTIPLE_INITIALIZATIONS',message:'Multiple native driver/music initializations require explicit selection; none selected automatically'});return result;}
  const {driver,call,musicAddress,region}=unique[0],ctx=context(bytes,m,driver,graph),limits={events:8192,rows:65536};
  const count=m.read(musicAddress);if(count<1||count>17)fail('SONG_COUNT','Native 8-bit header supports 1–17 subsongs');const header=ctx.span(musicAddress,5+count*14,'header'),instrumentAddress=m.word(musicAddress+1),sampleBase=m.word(musicAddress+3);m.offset(instrumentAddress);m.offset(sampleBase);
  const music={address:musicAddress,source:header,songCount:count,instrumentAddress,sampleBase,sampleRecovery:'unsupported',songs:[],instruments:[],envelopes:[],inventory:'all header subsongs; referenced instruments only'};const ids=new Set([0]);
  for(let i=0;i<count;i++){const p=musicAddress+5+i*14,song={id:i,source:{address:p,fileOffset:m.offset(p,14),length:14,bytes:header.bytes.slice(5+i*14,19+i*14)},tempoSteps:{PAL:m.word(p+10),NTSC:m.word(p+12)},initialSpeed:6,initialAccumulator:1536,channels:[]};if(!song.tempoSteps.PAL||!song.tempoSteps.NTSC)fail('TEMPO','Zero native tempo step is outside the progressing-song profile');for(let c=0;c<5;c++){const ch=channel(ctx,m.word(p+c*2),c,limits);song.channels.push(ch);for(const e of ch.events)if(e.instrumentId!==undefined&&c<4)ids.add(e.instrumentId);}music.songs.push(song);}
  const envelopes=new Map();for(const id of [...ids].sort((a,b)=>a-b)){const p=instrumentAddress+id*8,source=ctx.span(p,8,'instrument'),record={id,address:p,source,dutyControl:source.bytes[0],duty:source.bytes[0]>>>6,padding:source.bytes[7],envelopes:{}};for(const [i,name] of ['volume','arpeggio','pitch'].entries()){const ptr=source.bytes[1+i*2]|source.bytes[2+i*2]<<8;record.envelopes[name]=ptr;if(!envelopes.has(ptr))envelopes.set(ptr,envelope(ctx,ptr));}music.instruments.push(record);}music.envelopes=[...envelopes.values()];
  const sfxCalls=callsTo(m,graph,driver.symbols.famitonesfxinit).filter(c=>c.X!==null&&c.Y!==null),sfxTables=[...new Set(sfxCalls.map(c=>c.X|(c.Y<<8)))];if(sfxTables.length>1)fail('AMBIGUOUS_SFX_TABLE','Multiple statically proven SFX tables; selection required');const sfx={inventory:'statically referenced IDs only; not a complete count',tableAddress:sfxTables[0]??null,initializationCalls:sfxCalls,effects:[]};
  const playCalls=callsTo(m,graph,driver.symbols.famitonesfxplay),sfxIds=[...new Set(playCalls.filter(c=>c.A!==null).map(c=>c.A))].sort((a,b)=>a-b);sfx.unresolvedCallSites=playCalls.filter(c=>c.A===null);
  if(sfx.tableAddress!==null)for(const id of sfxIds){if(id>63)fail('SFX_ID','SFX ID wraps the 8-bit table index');const source=ctx.span(sfx.tableAddress+id*4,4,'sfxTable'),ntsc=source.bytes[0]|source.bytes[1]<<8,pal=source.bytes[2]|source.bytes[3]<<8;sfx.effects.push({id,source,callEvidence:playCalls.filter(c=>c.A===id),NTSC:sfxStream(ctx,ntsc,'NTSC'),PAL:sfxStream(ctx,pal,'PAL')});}
  const tableLow=driver.symbols._ft2notetablelsb,tableHigh=driver.symbols._ft2notetablemsb,timers={PAL:[],NTSC:[]};for(const [r,off] of [['PAL',0],['NTSC',64]])for(let i=0;i<64;i++)timers[r].push(m.read(tableLow+off+i)|(m.read(tableHigh+off+i)<<8));
  result.status='decoded';result.recognition.driver={...driver,source:{address:driver.base,fileOffset:m.offset(driver.base,PROFILE.driverLength),length:PROFILE.driverLength},initializationCall:call,region};result.native={music,sfx,timerTables:timers,timerTableSources:{low:{address:tableLow,fileOffset:m.offset(tableLow,128),length:128,bytes:Array.from(bytes.subarray(m.offset(tableLow),m.offset(tableLow)+128))},high:{address:tableHigh,fileOffset:m.offset(tableHigh,128),length:128,bytes:Array.from(bytes.subarray(m.offset(tableHigh),m.offset(tableHigh)+128))}},conversion:{status:'not-converted',canonicalImportAllowed:false,reason:'Native timing, envelopes, tuning, effects and mixing require separate representability checks'}};
  return result;
 }catch(e){result.status=['UNSUPPORTED_CONTAINER','UNSUPPORTED_MAPPER','UNSUPPORTED_PRG','UNSUPPORTED_SYSTEM','UNSUPPORTED_LAYOUT'].includes(e.code)?'unknown':e.code==='AMBIGUOUS_SFX_TABLE'?'ambiguous':'invalid';result.diagnostics.push({code:e.code||'INTERNAL',message:e.message,details:e.details});return result;}
}
function patch(input,evidence,edits){
 const bytes=asBytes(input);if(!evidence||evidence.status!=='decoded'||evidence.method!==VERSION||!evidence.source||hash(bytes)!==evidence.source.sha256)fail('IDENTITY','Patch requires matching successfully decoded source identity');
 const verified=decode(bytes);if(verified.status!=='decoded')fail('REVALIDATE','Current source cannot be independently revalidated');if(!Array.isArray(edits)||!edits.length||edits.length>256)fail('EDITS','Provide 1–256 bounded semantic edits');
 const output=new Uint8Array(bytes),changes=[],used=new Set();for(const edit of edits){if(!edit||!Number.isInteger(edit.song)||!Number.isInteger(edit.channel)||!Number.isInteger(edit.event))fail('EDIT_TARGET','Use integer song, channel and event indexes');const song=verified.native.music.songs[edit.song],ch=song&&song.channels[edit.channel],event=ch&&ch.events[edit.event];if(!event||!event.source||event.source.length!==1)fail('EDIT_TARGET','Only exact one-byte native note or instrument commands may be patched');const keys=Object.keys(edit);if(keys.some(k=>!['song','channel','event','noteCode','instrumentId'].includes(k)))fail('EDIT_FIELDS','Unknown or unsupported edit field');let value;
  if(edit.noteCode!==undefined){if(edit.instrumentId!==undefined||!['note','cut'].includes(event.kind)||!Number.isInteger(edit.noteCode)||edit.noteCode<0||edit.noteCode>(edit.channel===3?16:60)||edit.channel===4)fail('NOTE_EDIT','Only bounded pulse/triangle/noise note or cut edits are supported; DPCM/control bytes are excluded');value=(edit.noteCode<<1)|(event.source.bytes[0]&1);}
  else if(edit.instrumentId!==undefined){if(event.kind!=='instrument'||!verified.native.music.instruments.some(i=>i.id===edit.instrumentId))fail('INSTRUMENT_EDIT','Instrument command may select only an already decoded instrument');value=0x80|(edit.instrumentId<<1);}
  else fail('EDIT_FIELDS','Provide noteCode or instrumentId');const offset=event.source.fileOffset;if(used.has(offset))fail('ALIASED_EDIT','Multiple requested edits share the same native byte; submit one explicit shared edit');used.add(offset);if(bytes[offset]!==event.source.bytes[0])fail('ORIGINAL_BYTE','Original byte does not match verified evidence');const affected=[];for(const s of verified.native.music.songs)for(const c of s.channels)for(let i=0;i<c.events.length;i++)if(c.events[i].source?.fileOffset===offset)affected.push({song:s.id,channel:c.index,event:i});if(affected.some(a=>a.channel===4))fail('DPCM_ALIAS','Edited byte is also executed by the unsupported DPCM channel');if(edit.noteCode!==undefined&&edit.noteCode>16&&affected.some(a=>a.channel===3))fail('NOISE_ALIAS','Edited byte is shared by noise; its note range is 0–16');output[offset]=value;changes.push({fileOffset:offset,address:event.source.address,before:bytes[offset],after:value,affected});
 }
 const decoded=decode(output);if(decoded.status!=='decoded')fail('PATCH_INVALID','Patched native structure failed revalidation',decoded.diagnostics);return{rom:output,sourceSha256:verified.source.sha256,rebuiltSha256:decoded.source.sha256,changes,evidence:decoded,method:'same-layout native command-byte patch; original external driver unchanged'};
}
return{method:VERSION,decode,patch,sha256:input=>hash(asBytes(input)),registerOrder:REGISTERS.slice()};
});
