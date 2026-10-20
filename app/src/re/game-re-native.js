/* Revision-bound native resource catalogs. All game payload is read from the
 * selected private input. Reference labels are annotations, never substitutes
 * for measured behavior. Native execution uses a separate bounded CPU/bus. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameRENative=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const dependency=(name,file)=>root[name]||(typeof require==='function'?require(file):null);
const spatial=()=>dependency('SpatialNative','./spatial-native.js');
const index=()=>dependency('GameREIndex','./game-re-index.js');
const cpuCore=()=>dependency('Forge6502Core','../services/cpu6502-core.js');
const hash=b=>dependency('FamiTone2Native','./famitone2-native.js').sha256(b);
const fail=message=>{throw Error('Native game RE: '+message);};
const need=(condition,message)=>{if(!condition)fail(message);};
const signed=n=>n>127?n-256:n;
const clone=o=>JSON.parse(JSON.stringify(o));
const profiles=spatial().profiles.filter(p=>['ninja-gaiden-us','zelda2-us'].includes(p.id));

function sourceReader(bytes){
 function loc(bank,cpu,length=1){
  const base=bank===7?0xc000:0x8000;
  need(Number.isInteger(bank)&&bank>=0&&bank<8&&Number.isInteger(cpu)&&Number.isInteger(length)&&length>=0&&cpu>=base&&cpu+length<=base+16384,'physical source range is outside its PRG bank');
  return {bank16KiB:bank,cpu,fileOffset:16+bank*16384+cpu-base,length};
 }
 const at=(bank,cpu)=>bytes[loc(bank,cpu).fileOffset];
 const word=(bank,cpu)=>at(bank,cpu)|(at(bank,cpu+1)<<8);
 const span=(bank,cpu,n)=>{const p=loc(bank,cpu,n);return Array.from(bytes.slice(p.fileOffset,p.fileOffset+n));};
 return {loc,at,word,span};
}
function inputSnapshot(input,name){
 need(input instanceof Uint8Array&&input.length===262160,'choose one of the two investigated 262,160-byte iNES revisions');
 need(input[0]===78&&input[1]===69&&input[2]===83&&input[3]===26,'not an iNES source');
 const bytes=Uint8Array.from(input),sha256=hash(bytes),profile=profiles.find(p=>p.sha256===sha256)||(root.NativeEngineFormat?.recognizes(bytes)?profiles.find(p=>p.id==='zelda2-us'):null);
 return {bytes,profile,source:{name:String(name||'ROM').slice(0,160),sha256,byteLength:bytes.length}};
}
function symbolAt(profile,bank,cpu){return index()[profile].symbols.find(s=>s[0]===bank&&s[1]===cpu)?.[2]||null;}
function sourceSymbol(profile,name){const s=index()[profile].symbols.find(s=>s[2]===name);need(s,'missing source annotation '+name);return s;}
function graphicsBanks(bytes){
 const start=16+8*16384;
 return Array.from({length:32},(_,bank)=>({id:'chr:'+bank,bank4KiB:bank,tiles:256,fileOffset:start+bank*4096,length:4096,meaning:'Physical CHR ROM patterns. Scene and sprite bindings are stated separately.'}));
}
function ninjaPalette(r,area,room){
 const bg=r.at(0,0xb200+(r.at(0,0xac90+room)>>4));
 const bgSets=[0,r.at(0,0xaf42+area),r.at(0,0xaf58+area),r.at(0,0xbfe0+area)];
 const spriteSets=[0,1,r.at(0,0xacc0+room),r.at(0,0xacf0+room)];
 const palette=(base,ids)=>ids.map(id=>[bg,...r.span(0,base+id*3,3)]);
 return {background:palette(0xb000,bgSets),sprites:palette(0xb100,spriteSets),backdrop:bg,backgroundSets:bgSets,spriteSets,
  sources:[r.loc(0,0xaf42+area),r.loc(0,0xaf58+area),r.loc(0,0xbfe0+area),r.loc(0,0xacc0+room),r.loc(0,0xacf0+room),r.loc(0,0xb200+(r.at(0,0xac90+room)>>4))],
  context:'Initial native area/room palettes from load_area_colors. Fades and runtime overrides are not applied.'};
}
function ninjaPose(r,pose,player){
 const base=player?0x8400:0x8000,table=base+pose*2,ptr=r.word(2,table);
 if(ptr===0xffff)return null;
  // Player attributes: $8500; enemy attributes: $8200.
 const colors=r.word(2,(player?0x8500:0x8200)+pose*2);
 need(ptr>=0x8900&&ptr<0xc000&&colors>=0x8900&&colors<0xc000,'pose pointer outside native sprite payload');
 const count=r.at(2,ptr);need(count<=64,'native sprite piece bound');
 const pieces=Array.from({length:count},(_,i)=>({tile:r.at(2,ptr+1+i*3),x:signed(r.at(2,ptr+2+i*3)),y:signed(r.at(2,ptr+3+i*3)),attributes:r.at(2,colors+i),source:r.loc(2,ptr+1+i*3,3),attributeSource:r.loc(2,colors+i)}));
 return {id:(player?'ryu:':'enemy:')+pose,selector:pose,owner:player?'player':'enemy',label:symbolAt('ninja-gaiden-us',2,ptr)||'Pose '+pose,pieces,pointerSource:r.loc(2,table,2),source:r.loc(2,ptr,1+count*3),attributesSource:r.loc(2,colors,count),
  extent:player?null:{horizontalCode:r.at(0,0xb300+pose),verticalCode:r.at(0,0xb400+pose),source:r.loc(0,0xb300+pose),verticalSource:r.loc(0,0xb400+pose)},
  limits:['Initial native piece attributes only. Additional color variants and runtime facing flags can change attributes.','Native pose extents are retained as codes, not promoted to complete combat hitboxes.']};
}
function ninjaCatalog(r,bytes){
 const baseline=spatial().inspect(bytes,'Ninja Gaiden'),scenes=[];
 for(const map of baseline.maps){
  const {area,room}=map.context,gfx=r.at(0,0xaf00+area),enemyCount=r.at(0,0xae40+room),lanternCount=r.at(0,0xae10+room);
  const enemyPtrs=[0x87c0,0x8820,0x8880].map(p=>r.word(2,p+room*2));
  const lanternPtrs=[0x8700,0x8760].map(p=>r.word(2,p+room*2));
  // $80 is a disabled-list marker, not 128 spawn records.
  const enemies=enemyCount&128?[]:Array.from({length:enemyCount},(_,i)=>{
   const column=r.at(2,enemyPtrs[0]+i),position=r.at(2,enemyPtrs[1]+i),type=r.at(2,enemyPtrs[2]+i);
   return {id:i,type,x:column*16,spawnScreenX:(position&15)*16,y:position&240,spawnColumn:column,entryXNibble:position&15,
    positionMeaning:'Column trigger and screen-edge X nibble. Spawn facing/scroll direction can mirror the screen-space X.',
    sources:enemyPtrs.map(p=>r.loc(2,p+i)),actor:'ng-actor:'+type};
  });
  const lanterns=lanternCount&128?[]:Array.from({length:lanternCount},(_,i)=>{
   const column=r.at(2,lanternPtrs[0]+i),v=r.at(2,lanternPtrs[1]+i);
   return {id:i,spawnColumn:column,x:column*16,y:v&240,pickupCode:v&15,raw:v,sources:lanternPtrs.map(p=>r.loc(2,p+i)),limits:['Screen-edge spawning and pickup state are not a static world-space entity simulation.']};
  });
  scenes.push({id:map.id,label:map.label,group:map.group,area,room,width:map.width,height:map.height,cellPixels:16,originY:64,source:map.source,
   selector:map.context.selector,graphicsSelector:gfx,backgroundChrBank4KiB:r.at(0,0xaf16+area)>>3,spriteChrBank4KiB:r.at(0,0xac90+room)&15,
   palettes:ninjaPalette(r,area,room),enemyCountCode:enemyCount,lanternCountCode:lanternCount,enemies,lanterns,
   entrance:{forward:{x:r.at(0,0xad50+room),y:r.at(0,0xad80+room),source:r.loc(0,0xad50+room),ySource:r.loc(0,0xad80+room)},backward:{x:r.at(0,0xadb0+room),y:r.at(0,0xade0+room),source:r.loc(0,0xadb0+room),ySource:r.loc(0,0xade0+room)},fromRight:map.context.entranceFromRight},
   areaStartCue:r.at(0,0xafc6+area),timeCode:r.at(0,0xafb0+area),
   limits:['Native enemy records are spawn triggers. World-space placement and reachability require scroll-direction context.','The source entrance bytes do not establish every exit or checkpoint condition.']});
 }
 const poses=[];for(const player of [true,false])for(let i=0;i<(player?128:256);i++){const pose=ninjaPose(r,i,player);if(pose)poses.push(pose);}
 const animations=[],scriptSlots=[];
 for(let id=0;id<128;id++){
  const pointer=r.word(2,0x8600+id*2),slot={selector:id,pointer,pointerSource:r.loc(2,0x8600+id*2,2),status:pointer===0xffff?'unassigned':'empty-stream'};scriptSlots.push(slot);if(pointer===0xffff)continue;
  const frames=[];let p=pointer,end=null;
  for(let count=0;count<128;count++){
   const duration=r.at(2,p);if(duration===0||duration===255){end=duration===255?'player-restart-marker':id<13?'player-return-to-idle':'nonplayer-restart';break;}
   frames.push({duration,updateTicks:duration+(id<13?0:1),pose:r.at(2,p+1),source:r.loc(2,p,2)});p+=2;
  }
  need(end,'animation termination/command bound at selector '+id);
  if(!frames.length)continue;slot.status='decoded-nonempty';
  animations.push({id:'ng-script:'+id,selector:id,label:symbolAt('ninja-gaiden-us',2,pointer)||'Script '+id,owner:id<13?'player':id<17?'projectile':'enemy',source:r.loc(2,pointer,p-pointer+1),pointerSource:r.loc(2,0x8600+id*2,2),frames,end,ticks:frames.reduce((n,f)=>n+f.updateTicks,0),limits:['Script ticks are native animation updates; state logic can interrupt or withhold them.']});
 }
 const actors=[];
 for(let type=0;type<44;type++){
  const pointer=r.word(7,0xc195+type*2),states=[];
  if(pointer!==0xffff){const first=r.word(7,pointer),count=(first-pointer)/2;if(Number.isInteger(count)&&count>0&&count<=32)for(let state=0;state<count;state++){const cpu=r.word(7,pointer+state*2);states.push({state,entry:cpu,label:symbolAt('ninja-gaiden-us',7,cpu),pointerSource:r.loc(7,pointer+state*2,2),source:cpu>=0xc000?r.loc(7,cpu):null});}}
  actors.push({id:'ng-actor:'+type,selector:type,label:pointer===0xffff?'Unused actor selector '+type:symbolAt('ninja-gaiden-us',7,pointer)||'Actor '+type,
   dispatch:pointer===0xffff?null:r.loc(7,pointer),states,healthCode:r.at(0,0xb530+type),damageCode:r.at(0,0xb560+type),scoreCode:r.at(0,0xb500+type),
   parameterSources:[r.loc(0,0xb530+type),r.loc(0,0xb560+type),r.loc(0,0xb500+type)],pointerSource:r.loc(7,0xc195+type*2,2),
   limits:['Raw native parameter codes. In particular a health code of zero does not mean the actor has zero effective hit points.','Dispatch/state entry addresses expose the original implementation; they are not a translated AI or complete state-transition model.']});
 }
 return {scenes,actors,poses,animations,scriptSlots,locations:[],limits:['Ninja scene art, initial palettes, spawns, entrances, actor parameter/dispatch tables and shared sprite scripts are decoded.','Enemy AI, player physics, full transition conditions, combat damage/hitbox semantics and cutscene/text reconstruction remain incomplete.']};
}

const zeldaSets=Object.freeze([
 {id:'west',label:'West Hyrule',bank:1,world:0,region:0,table:0x8523},
 {id:'death-mountain',label:'Death Mountain',bank:1,world:0,region:1,table:0xa000},
 {id:'east',label:'East Hyrule',bank:2,world:0,region:2,table:0x8523},
 {id:'maze',label:'Maze Island',bank:2,world:0,region:1,alternate:1,table:0xa000},
 {id:'towns-west',label:'West towns',bank:3,world:1,region:0,table:0x8523},
 {id:'towns-east',label:'East towns',bank:3,world:2,region:2,table:0x8523},
 {id:'palace-a',label:'Palaces type A',bank:4,world:3,region:0,table:0x8523},
 {id:'palace-b',label:'Palaces type B',bank:4,world:4,region:0,table:0xa000},
 {id:'great-palace',label:'Great Palace',bank:5,world:5,region:2,palace:2,table:0x8523}
].map(Object.freeze));
function zeldaCommands(r,bank,start,length){
 const commands=[];let p=start+4;
 while(p<start+length){
  need(p+1<start+length,'truncated side-view object command at '+bank+':'+start.toString(16)+' length '+length+' offset '+(p-start));
  const position=r.at(bank,p),object=r.at(bank,p+1),n=(position>>4)!==13&&object===15?3:2;
  need(p+n<=start+length,'truncated collectible command');
  commands.push({id:commands.length,positionCode:position,objectCode:object,extra:n===3?r.at(bank,p+2):null,kind:(position>>4)===13?'floor-ceiling-change':(position>>4)===14?'position-skip':n===3?'collectible':'construction-command',source:r.loc(bank,p,n)});p+=n;
 }
 return commands;
}
function zeldaCatalog(r){
 const scenes=[],actors=[],locations=[];
 const areaSource=sourceSymbol('zelda2-us','bank7_Pointer_table_for_Key_Areas_Data')[1];
 for(const set of zeldaSets){
  const secondary=set.table===0xa000,enemyTable=secondary?0xa07e:0x85a1,connections=secondary?0xa1f8:0x871b;
  for(let slot=0;slot<63;slot++){
   const pointer=r.word(set.bank,set.table+slot*2),source=r.loc(set.bank,pointer),header=r.span(set.bank,pointer,4),length=header[0],valid=length>=4&&pointer+length<=0xc000;
   let commands=[];if(valid)commands=zeldaCommands(r,set.bank,pointer,length);
   const enemyRam=r.word(set.bank,enemyTable+slot*2),enemyCPU=enemyRam-0x7000+0x88a0;
   const enemies=[];let enemyLength=null;
   if(enemyRam>=0x7000&&enemyRam<0x7400){
    enemyLength=r.at(set.bank,enemyCPU);need(enemyCPU+enemyLength<=0x8ca0,'enemy copied-data range');
    for(let p=1;p+1<enemyLength;p+=2){const a=r.at(set.bank,enemyCPU+p),b=r.at(set.bank,enemyCPU+p+1),page=b>>6,kind=b&63;enemies.push({id:enemies.length,selector:kind,x:page*256+(a&15)*16,y:r.at(7,0xd5fb+((a>>4)&7)),page,raw:[a,b],usedFlag:!!(a&128),source:r.loc(set.bank,enemyCPU+p,2),copiedRAM:enemyRam+p,actor:'z2-actor:'+set.id+':'+kind});}
   }
   const links=Array.from({length:4},(_,page)=>{const raw=r.at(set.bank,connections+slot*4+page);return {page,raw,targetScene:raw>>2,entryCode:raw&3,kind:(raw>>2)===63?'return-to-overworld':'scene-reference',target:(raw>>2)===63?null:'z2-scene:'+set.id+':'+(raw>>2),source:r.loc(set.bank,connections+slot*4+page)};});
   scenes.push({id:'z2-scene:'+set.id+':'+slot,label:set.label+' · slot '+slot,group:set.label,set:set.id,bank:set.bank,world:set.world,region:set.region,alternate:set.alternate||0,palace:set.palace||0,slot,source:r.loc(set.bank,pointer,valid?length:4),pointerSource:r.loc(set.bank,set.table+slot*2,2),
    status:valid?'native-command-stream':'unavailable-slot',aliasKey:set.bank+':'+pointer+':'+set.world,
    header:{raw:header,length,screensWide:((header[1]>>5)&3)+1,objectSet:header[1]>>7,layers:(header[1]>>2)&7,initialFloorCeiling:header[2]&15,groundType:(header[2]>>4)&7,noCeiling:!!(header[2]&128),backgroundMap:header[3]&7,backgroundPalette:(header[3]>>3)&7,spritePalette:header[3]>>6},
    width:(((header[1]>>5)&3)+1)*16,height:13,cellPixels:16,originY:32,commands,enemies,enemyLength,enemyPointerSource:r.loc(set.bank,enemyTable+slot*2,2),enemySource:enemyLength!==null?r.loc(set.bank,enemyCPU,Math.max(1,enemyLength)):null,connections:links,
    limits:[valid?'Native command stream; geometry is constructed lazily by original routines.':'Header is too short to be a normal scene. No geometry or playable room is claimed.','Table slots can alias the same stream. Presence does not establish reachability.','Connection entries are indexed by native source-page/context. They are not assumed to mean left/down/up/right.','Stateful objects, collected items, keys, spells and quest progress can alter the result.']});
  }
  const base=set.world===4?0xa900:0x9400;
  for(let type=0;type<36;type++){
   const init=r.word(set.bank,base+0x45+type*2),step=r.word(set.bank,base+0x8d+type*2);
   const target=cpu=>cpu>=0x8000?{...r.loc(cpu>=0xc000?7:set.bank,cpu),label:symbolAt('zelda2-us',cpu>=0xc000?7:set.bank,cpu)}:null;
   actors.push({id:'z2-actor:'+set.id+':'+type,selector:type,group:set.label,label:'Type '+type+' · '+(target(step)?.label||'native dispatch'),
    healthCode:r.at(set.bank,base+0x21+type),attributes:r.at(set.bank,base+0xd5+type),damageVulnerabilityCode:r.at(set.bank,base+0xf9+type),experienceCode:r.at(set.bank,base+0x11d+type),
    initialize:target(init),update:target(step),parameterSources:[r.loc(set.bank,base+0x21+type),r.loc(set.bank,base+0xd5+type),r.loc(set.bank,base+0xf9+type),r.loc(set.bank,base+0x11d+type)],dispatchSources:[r.loc(set.bank,base+0x45+type*2,2),r.loc(set.bank,base+0x8d+type*2,2)],
    limits:['Contextual native table entries copied to $6D00. Codes are not normalized health/damage values or translated AI.']});
  }
  if(set.world===0){
   const areaBase=r.word(7,areaSource+(secondary?2:0));
   for(let i=0;i<63;i++)locations.push({id:set.id+':location:'+i,group:set.label,slot:i,raw:Array.from({length:4},(_,c)=>r.at(set.bank,areaBase+c*63+i)),sources:Array.from({length:4},(_,c)=>r.loc(set.bank,areaBase+c*63+i)),limits:['Four native location columns retained. Flags and cross-world destinations require context; raw coordinates are not silently projected onto the terrain view.']});
  }
 }
 return {scenes,actors,locations,poses:[],animations:[],limits:['All nine native world/table contexts are cataloged, including separate west/east town construction contexts. Duplicate pointers and unavailable slots remain explicit.','Side-view tile-code geometry and Link display poses are built by original 6502 routines with a bounded isolated bus. This is not a translated gameplay engine.','Complete animation timing/state bindings, enemy poses, collision response, player physics, combat, dialogue and quest state remain incomplete.']};
}

function inspect(input,name='ROM'){
 // Unknown revisions have the same safe inspection result as other RE tools.
 if(!(input instanceof Uint8Array)||input.length<16||input.length>64*1024*1024)fail('choose a bounded ROM byte buffer');
 const sha256=hash(input),profile=profiles.find(p=>p.sha256===sha256)||(root.NativeEngineFormat?.recognizes(input)?profiles.find(p=>p.id==='zelda2-us'):null),source={name:String(name).slice(0,160),sha256,byteLength:input.length};
 if(!profile)return {format:'NESForgeNativeGameEvidence',version:1,status:'unknown',source,profile:null,scenes:[],actors:[],poses:[],animations:[],locations:[],graphics:[],symbols:[],ram:[],limits:['No verified native game catalog for this exact revision. No scene, object or behavior was guessed.']};
 const bytes=Uint8Array.from(input),r=sourceReader(bytes),data=profile.id==='ninja-gaiden-us'?ninjaCatalog(r,bytes):zeldaCatalog(r);
 if(profile.id==='zelda2-us')data.poses=zeldaPlayerPoses(bytes);
 return {format:'NESForgeNativeGameEvidence',version:1,status:'supported',source,profile:{...profile},...data,graphics:graphicsBanks(bytes),symbols:clone(index()[profile.id].symbols),ram:clone(index()[profile.id].ram),reference:index()[profile.id].reference,
  evidencePolicy:'Native tables and executed routines are distinct from source labels and unknown behavior. Source labels are research annotations, not semantic certification.',
  limits:[...data.limits,'Read-only source investigation. No project, live emulator, compiler or ROM is modified; no full-game reconstruction claim.']};
}

function nativeMachine(bytes,bank){
 const ram=new Uint8Array(32768),s={A:0,X:0,Y:0,PC:0,SP:253,C:0,Z:0,I:1,D:0,V:0,N:0,cycles:0};
 let shift=0,bits=0,instructions=0,currentPC=0,activeBank=bank;const cells=Array(832).fill(null),oamWriters=Array(256).fill(null),coverage=new Set();
 const r=sourceReader(bytes);
 function read(a){a&=65535;if(a<0x2000)return ram[a&2047];if(a<0x6000)fail('native decoder attempted unmapped I/O read');if(a<0x8000)return ram[a];return bytes[16+(a<0xc000?activeBank:7)*16384+(a&16383)];}
 function write(a,v){a&=65535;v&=255;
  if(a<0x2000){ram[a&2047]=v;if(a>=0x200&&a<0x300)oamWriters[a-0x200]=r.loc(currentPC>=0xc000?7:activeBank,currentPC);return;}
  if(a<0x6000)fail('native decoder attempted I/O write');
  if(a<0x8000){ram[a]=v;if(a>=0x6000&&a<0x6340){const ptr=ram[0xd4]|ram[0xd5]<<8,offset=ram[0x72f];cells[a-0x6000]={writer:r.loc(currentPC>=0xc000?7:activeBank,currentPC),nativeRAM:a,commandPointer:ptr,commandOffset:offset,commandSource:ptr>=0x8000&&ptr+offset<0xc000?r.loc(activeBank,ptr+offset):null};}return;}
  if(v&128){shift=bits=0;return;}
  shift|=(v&1)<<bits++;
  if(bits===5){if(a>=0xe000)activeBank=shift&7;shift=bits=0;}
 }
 const cpu=cpuCore().create(s,read,write);
 function run(pc,stop,limit=250000){
  s.PC=pc;s.SP=253;ram[0x1fe]=0xfe;ram[0x1ff]=0x5f;
  const begin=instructions;
  while(instructions-begin<limit){if(s.PC===stop)return instructions-begin;currentPC=s.PC;coverage.add((currentPC>=0xc000?7:activeBank)*65536+currentPC);cpu.step();instructions++;}
  fail('native construction instruction bound exceeded');
 }
 return {ram,s,cells,oamWriters,coverage,run,get instructions(){return instructions;}};
}
function zeldaPlayerPoses(bytes){
 const poses=[];
 for(const facing of [1,2])for(let selector=0;selector<15;selector++){
  const m=nativeMachine(bytes,1),ram=m.ram;m.run(0xcd40,0x5fff);
  ram.fill(248,0x200,0x300);ram[0x29]=100;ram[0x4d]=100;ram[0x19]=1;ram[0xcc]=100;ram[0x9f]=facing;ram[0x80]=selector;
  m.run(0xebf0,0x5fff,20000);
  const pieces=[];for(let slot=0;slot<64;slot++){const a=0x200+slot*4;if(ram[a]>=240)continue;pieces.push({x:ram[a+3]-100,y:ram[a]-100,tile:ram[a+1],attributes:ram[a+2],nativeOAMSlot:slot,nativeOAMAddress:a,source:m.oamWriters[slot*4],attributeSource:m.oamWriters[slot*4+2]});}
  poses.push({id:'z2-link:'+selector+':'+facing,selector,owner:'player',facing,label:'Link pose '+selector+' · '+(facing===1?'right':'left'),pieces,
   source:sourceReader(bytes).loc(7,0xebf0),spriteMode:16,evidence:'executed-original-display',
   limits:['Original display output for the stated pose selector, facing, zeroed state and fixed position.','Pose timing, action transitions, equipment, damage flashing and additional actor display modes are not reconstructed.']});
 }
 return poses;
}
function ninjaScene(bytes,scene){
 const r=sourceReader(bytes),baseline=spatial().inspect(bytes,'Ninja Gaiden').maps.find(m=>m.id===scene.id);need(baseline,'unknown room');
 const blockBase=0xa000+scene.selector*1024,tileBase=0x8000+(scene.graphicsSelector&28)*256,attrBase=0xb000+scene.selector*256;
 const width=baseline.width*2,height=24,tiles=Array(width*height),palettes=Array(width*height),tileSources=Array(width*height);
 for(let by=0;by<6;by++)for(let bx=0;bx<baseline.blocks.width;bx++){
  const block=baseline.blocks.values[by*baseline.blocks.width+bx],attribute=r.at(1,attrBase+block);
  for(let qy=0;qy<2;qy++)for(let qx=0;qx<2;qx++){
   const q=blockBase+block*4+qx*2+qy,quad=r.at(1,q),pal=(attribute>>((qy*2+qx)*2))&3;
   for(let ty=0;ty<2;ty++)for(let tx=0;tx<2;tx++){
    const p=tileBase+quad*4+tx*2+ty,i=(by*4+qy*2+ty)*width+bx*4+qx*2+tx;
    tiles[i]=r.at(1,p);palettes[i]=pal;tileSources[i]={tile:r.loc(1,p),quad:r.loc(1,q),attribute:r.loc(1,attrBase+block),block:baseline.source};
   }
  }
 }
 return {format:'NESForgeNativeSceneEvidence',version:1,source:scene.source,scene:clone(scene),width:baseline.width,height:12,cellPixels:16,originY:64,cells:baseline.cells,cellSources:baseline.cellSources,behaviorFlags:baseline.behaviorFlags,classes:baseline.classes,
  graphics:{width,height,tiles,paletteIds:palettes,tileSources,palettes:scene.palettes.background,chrBank4KiB:scene.backgroundChrBank4KiB},
  evidence:'decoded-native-tables',limits:[...scene.limits,'Original initial background graphics only. Animated CHR changes, fades, raster status bar and actors are separate resources.']};
}
function zeldaScene(bytes,scene){
 need(scene.status==='native-command-stream','selected slot has no normal native scene header');
 const r=sourceReader(bytes),m=nativeMachine(bytes,scene.bank),ram=m.ram,ptr=scene.source.cpu;
 ram[0x707]=scene.world;ram[0x706]=scene.region;ram[0x70a]=scene.alternate;ram[0x56c]=scene.palace;
 // Original bank selection / copies / palette variant setup. This invokes
 // unmodified native code rather than substituting authored palette colors.
 const preparationInstructions=m.run(0xcd40,0x5fff);
 ram[0xd4]=ptr&255;ram[0xd5]=ptr>>8;ram[0x561]=scene.slot;
 // Original fill, optional background template, floor/ceiling, layers and all
 // object constructors. Stop before unrelated live-game entry/PPU state.
 const constructionInstructions=m.run(0xc568,0xc5fc);
 const cells=[],cellSources=[];
 for(let y=0;y<13;y++)for(let x=0;x<scene.width;x++){
  const i=(x>>4)*208+y*16+(x&15);cells.push(ram[0x6000+i]);cellSources.push(m.cells[i]);
 }
 m.run(0xd05b,0x5fff);
 const nativePalette=Array.from(ram.slice(0x305,0x325)),palettes=Array.from({length:4},(_,i)=>[nativePalette[0],...nativePalette.slice(i*4+1,i*4+4)]);
 const width=scene.width*2,height=26,tiles=Array(width*height),paletteIds=Array(width*height),tileSources=Array(width*height);
 for(let y=0;y<13;y++)for(let x=0;x<scene.width;x++){
  const cell=cells[y*scene.width+x],group=cell>>6,base=r.word(scene.bank,0x8500+group*2),quad=base+(cell&63)*4;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
   const a=quad+dx*2+dy,bank=a>=0xc000?7:scene.bank,i=(y*2+dy)*width+x*2+dx;
   tiles[i]=r.at(bank,a);paletteIds[i]=group;tileSources[i]={tile:r.loc(bank,a),pointer:r.loc(scene.bank,0x8500+group*2,2),nativeCell:y*scene.width+x};
  }
 }
 return {format:'NESForgeNativeSceneEvidence',version:1,source:scene.source,scene:clone(scene),width:scene.width,height:13,cellPixels:16,originY:32,cells,cellSources,
  classes:[],graphics:{width,height,tiles,paletteIds,tileSources,palettes,chrBank4KiB:ram[0x76e]+1,nativePalette,context:{region:scene.region,world:scene.world,palaceCode:scene.palace,candle:false},limits:['Initial native palette and CHR context. Cave darkness is retained with Candle unset; palace tables use the stated palette variant, not a claim that every slot belongs to that palace.']},
  evidence:'executed-original-construction',execution:{entry:r.loc(7,0xc568),stopCPU:0xc5fc,instructions:m.instructions,preparationInstructions,constructionInstructions,uniqueInstructions:m.coverage.size,initialState:'Fresh zeroed isolated RAM, selected region/world/scene, native table/palette preparation, no collected-item or quest flags; Candle unset.',outputRAM:{start:0x6000,length:832}},
  limits:[...scene.limits,'Original initial art is reconstructed from native tile-code groups, TSA pointers, palette preparation and CHR context; runtime animation and changes are not applied.','Tile code geometry is not a recovered solid/empty grid or full collision response.','The last native writer and current object pointer/offset are evidence breadcrumbs, not a claim of complete data-flow provenance.']};
}
function decodeScene(input,id){
 const snapshot=inputSnapshot(input,'ROM');need(snapshot.profile,'unknown exact source revision');
 const catalog=inspect(snapshot.bytes),scene=catalog.scenes.find(s=>s.id===id);need(scene,'scene selector does not belong to this source');
 return snapshot.profile.id==='ninja-gaiden-us'?ninjaScene(snapshot.bytes,scene):zeldaScene(snapshot.bytes,scene);
}
function chrTile(input,bank,tile){
 const snapshot=inputSnapshot(input,'ROM');need(snapshot.profile,'unknown exact source revision');
 need(Number.isInteger(bank)&&bank>=0&&bank<32&&Number.isInteger(tile)&&tile>=0&&tile<256,'physical CHR tile selector out of range');
 const fileOffset=16+8*16384+bank*4096+tile*16;
 return {fileOffset,bank4KiB:bank,tile,bytes:Array.from(snapshot.bytes.slice(fileOffset,fileOffset+16))};
}
function rasterize(input,decoded){
 const snapshot=inputSnapshot(input,'ROM');need(snapshot.profile&&decoded?.scene,'source-scoped scene required');
 const native=decodeScene(snapshot.bytes,decoded.scene.id),g=native.graphics;need(g,'this source has no verified original-art renderer');
 const width=g.width*8,height=g.height*8,colors=new Uint8Array(width*height),chrStart=16+8*16384+g.chrBank4KiB*4096;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y>>3)*g.width+(x>>3),tile=g.tiles[i],a=chrStart+tile*16+(y&7),bit=7-(x&7),pixel=((snapshot.bytes[a]>>bit)&1)|(((snapshot.bytes[a+8]>>bit)&1)<<1);
  colors[y*width+x]=g.palettes[g.paletteIds[i]][pixel];
 }
 return {width,height,colors};
}
function open(input,name='ROM'){
 need(input instanceof Uint8Array&&input.length>=16&&input.length<=64*1024*1024,'choose a bounded ROM byte buffer');
 const bytes=Uint8Array.from(input),report=inspect(bytes,name),cache=new Map();
 function scene(id){
  need(report.status==='supported','unknown exact source revision');
  const item=report.scenes.find(s=>s.id===id);need(item,'scene selector does not belong to this source');
  if(!cache.has(id)){
   const decoded=report.profile.id==='ninja-gaiden-us'?ninjaScene(bytes,item):zeldaScene(bytes,item);
   if(cache.size>=4)cache.delete(cache.keys().next().value);
   cache.set(id,decoded);
  }
  return clone({...cache.get(id),identity:report.source,profile:report.profile});
 }
 function chrBank(bank){
  need(report.status==='supported'&&Number.isInteger(bank)&&bank>=0&&bank<32,'physical CHR bank selector out of range or source unsupported');
  const fileOffset=16+8*16384+bank*4096;
  return {bank4KiB:bank,fileOffset,bytes:Array.from(bytes.slice(fileOffset,fileOffset+4096))};
 }
 function raster(id){
  const g=scene(id).graphics;need(g,'this scene has no verified original-art renderer');
  const bank=chrBank(g.chrBank4KiB).bytes,width=g.width*8,height=g.height*8,colors=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y>>3)*g.width+(x>>3),a=g.tiles[i]*16+(y&7),bit=7-(x&7),ci=((bank[a]>>bit)&1)|(((bank[a+8]>>bit)&1)<<1);
   colors[y*width+x]=g.palettes[g.paletteIds[i]][ci];
  }
  return {width,height,colors};
 }
 function readPrg(bank,cpu,length=64){
  need(report.status==='supported'&&Number.isInteger(length)&&length>0&&length<=1024,'bounded source-scoped PRG read required');
  const r=sourceReader(bytes),source=r.loc(bank,cpu,length);return {source,bytes:r.span(bank,cpu,length)};
 }
 return Object.freeze({catalog:()=>clone(report),scene,chrBank,raster,readPrg});
}
return Object.freeze({profiles:Object.freeze(profiles),inspect,open,decodeScene,chrTile,rasterize,limits:Object.freeze({inputBytes:64*1024*1024,constructionInstructions:250000,animationCommands:128})});
});
