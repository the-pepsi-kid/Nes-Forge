/* Engine-independent observations of the existing emulator. No project records,
 * CPU bus reads, semantic decoders, memory edits or emu state fields are added.
 * Event timing is instruction-level evidence from Forge's emulator, not an
 * assertion of cycle-exact hardware timing or recovered native game resources.
 */
(()=>{
'use strict';
const services=window.Forge.services;
const LIMITS=Object.freeze({instructions:2000000,events:8192,coverage:4096,watches:8,page:256,snapshotBytes:10240,romBytes:64*1024*1024});
const listeners=new Set(),watchMap=new Map();
let epoch=0,startOperation=0,signature=null,identity=null,identityPending=null,tracing=false,loadDepth=0,internalReset=0,context=null;
let instructionCount=0,eventLog=[],coverageMap=new Map(),memory={A:null,B:null},resourceData=null,traceMode='all';
let message='Runtime observation is off.',startFrame=null,lastFrame=null,stopReason=null,lastNotifyFrame=-1;
function fail(text){throw Error('RE runtime: '+text);}
function integer(value,min,max,name){if(!Number.isSafeInteger(value)||value<min||value>max)fail(name+' must be an integer from '+min+' through '+max+'.');return value;}
function textLabel(value,name,max=80){if(typeof value!=='string'||value.length>max)fail(name+' must be text of at most '+max+' characters.');return value;}
function configuration(value){if(!value||typeof value!=='object'||Array.isArray(value))fail('Options must be an object.');return value;}
function liveSignature(){return emu.loaded?{rom:emu.lastBuiltRom,prg:emu.prgRom,chr:emu.chrRom,mapper:emu.mapper,size:emu.prgSize}:null;}
function sameSignature(a,b){return a===b||!!a&&!!b&&a.rom===b.rom&&a.prg===b.prg&&a.chr===b.chr&&a.mapper===b.mapper&&a.size===b.size;}
function copy(value){return JSON.parse(JSON.stringify(value));}
function safeValue(region,address){const source=region==='ram'?emu.ram:emu.sram;return source&&address<source.length?source[address]:null;}
function canonicalAddress(address){integer(address,0,65535,'Watch address');if(address<0x2000)return {region:'ram',address:address&0x7ff,index:address&0x7ff};if(address>=0x6000&&address<0x8000&&emu.sram)return {region:'sram',address,index:address-0x6000};fail('Watch addresses must be internal RAM ($0000–$1FFF) or available cartridge RAM ($6000–$7FFF).');}
function watchRows(){return Array.from(watchMap.values(),watch=>({...watch,value:safeValue(watch.region,watch.index)}));}
function snapshotInfo(slot){const entry=memory[slot];return entry?{slot,epoch:entry.epoch,frame:entry.frame,cycles:entry.cycles,byteLength:entry.ram.length+entry.sram.length}:null;}
function rawStatus(){return {loaded:!!emu.loaded,epoch,tracing,mode:traceMode,identity:identity?{...identity}:null,identityPending:!!identityPending,instructions:instructionCount,eventCount:eventLog.length,coverageCount:coverageMap.size,watches:watchRows(),snapshots:{A:snapshotInfo('A'),B:snapshotInfo('B')},limits:LIMITS,message,startFrame,lastFrame,stopReason};}
function notify(){const status=rawStatus();for(const fn of listeners)try{fn(status);}catch(error){/* Presentation cannot interrupt CPU execution. */}}
function family(length,storage){return {storage,bytes:new Uint8Array(length),known:new Uint8Array(length),sourceEvent:new Int32Array(length).fill(-1)};}
function blankResources(){return {vram:family(emu.loaded?emu.vram.length:0,'physical-nametable-RAM'),palette:family(emu.loaded?32:0,'physical-palette-RAM'),chrRam:family(emu.loaded&&emu.hasChrRam?emu.chrRam.length:0,'physical-CHR-RAM')};}
function resetEvidence(){traceMode='all';instructionCount=0;eventLog=[];coverageMap=new Map();memory={A:null,B:null};resourceData=blankResources();context=null;startFrame=null;lastFrame=null;stopReason=null;lastNotifyFrame=-1;for(const watch of watchMap.values()){watch.writeCount=0;watch.lastEvent=null;}}
function invalidate(reason,{forgetIdentity=false,forgetWatches=false}={}){epoch++;startOperation++;tracing=false;identityPending=null;if(forgetIdentity)identity=null;if(forgetWatches)watchMap.clear();resetEvidence();message=reason;stopReason=reason;notify();}
function sync(){const now=liveSignature();if(!sameSignature(signature,now)){signature=now;invalidate(now?'Loaded ROM changed; runtime observations cleared.':'ROM unloaded; runtime observations cleared.',{forgetIdentity:true,forgetWatches:true});}return !!now;}
function observerFailure(error){tracing=false;context=null;stopReason='Observation stopped after an instrumentation error.';message=stopReason+' '+String(error?.message||error);try{notify();}catch(ignored){}}
function safely(fn){try{return fn();}catch(error){observerFailure(error);return null;}}
function stop(reason='Trace stopped.'){startOperation++;tracing=false;context=null;stopReason=String(reason);message=stopReason;lastFrame=emu.loaded?emu.frameCount:null;notify();return rawStatus();}
function clear(){sync();invalidate('Runtime observations and RAM snapshots cleared.');return rawStatus();}
function requireLoaded(){sync();if(!emu.loaded||!(emu.lastBuiltRom instanceof Uint8Array))fail('Load a supported ROM in the emulator first.');}
function getROMSnapshot(){requireLoaded();integer(emu.lastBuiltRom.length,16,LIMITS.romBytes,'Loaded ROM length');return {bytes:new Uint8Array(emu.lastBuiltRom),name:String(emu.romName||'Loaded ROM'),epoch};}
async function identify(){
 requireLoaded();if(identity)return {...identity};if(identityPending)return identityPending;
 if(!window.crypto?.subtle?.digest)fail('SHA-256 is unavailable in this browser context.');
 const source=getROMSnapshot(),token=epoch,expected=signature,mapper=emu.mapper;
 const pending=(async()=>{
  const digest=await window.crypto.subtle.digest('SHA-256',source.bytes);
  sync();if(token!==epoch||!sameSignature(expected,signature))fail('ROM or runtime session changed while its identity was being calculated.');
  identity={name:source.name,sha256:Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join(''),byteLength:source.bytes.length,mapper};
  return {...identity};
 })();identityPending=pending;notify();
 try{return await pending;}finally{if(identityPending===pending){identityPending=null;notify();}}
}
async function start(options={}){
 configuration(options);const fromReset=options.fromReset===undefined?false:options.fromReset;if(typeof fromReset!=='boolean')fail('fromReset must be true or false.');
 const mode=options.mode===undefined?'all':options.mode;if(!['all','audio'].includes(mode))fail('Trace mode must be all or audio.');
 requireLoaded();if(services.EmulatorTimeline?.status().busy)fail('Wait for frame navigation to finish before starting a trace.');
 const token=epoch,expected=signature,operation=++startOperation;await identify();sync();if(token!==epoch||operation!==startOperation||!sameSignature(expected,signature))fail('Trace start was canceled or the ROM/runtime session changed before tracing could start.');
 invalidate(fromReset?'Preparing a trace from reset.':'Preparing a trace at the current emulator state.');
 traceMode=mode;tracing=true;startFrame=emu.frameCount;lastFrame=emu.frameCount;stopReason=null;
 if(fromReset){internalReset++;try{emuReset();}finally{internalReset--;}startFrame=emu.frameCount;lastFrame=emu.frameCount;}
 message=traceMode==='audio'?(fromReset?'Audio-focused trace armed from reset.':'Audio-focused trace recording.')+' Run or Step in the emulator. APU writes, RAM watches and code coverage are recorded; PPU writes are excluded.':fromReset?'Trace armed from reset. Press Run or Step in the emulator to observe initialization.':'Trace recording. Run or Step in the emulator to collect evidence.';notify();return rawStatus();
}
function snapshot(slot){requireLoaded();if(services.EmulatorTimeline?.status().busy)fail('Wait for frame navigation to finish before saving a RAM snapshot.');if(slot!=='A'&&slot!=='B')fail('Snapshot slot must be A or B.');const ram=new Uint8Array(emu.ram),sram=emu.sram?new Uint8Array(emu.sram):new Uint8Array(0);if(ram.length+sram.length>LIMITS.snapshotBytes)fail('RAM exceeds the supported snapshot bound.');memory[slot]={slot,epoch,frame:emu.frameCount,cycles:emu.cycles,ram,sram};message='Saved RAM snapshot '+slot+' at frame '+emu.frameCount+'.';notify();return {...snapshotInfo(slot),ram:Array.from(ram),sram:Array.from(sram)};}
function paging(options){const offset=options.offset===undefined?0:integer(options.offset,0,Number.MAX_SAFE_INTEGER,'Page offset'),limit=options.limit===undefined?128:integer(options.limit,1,LIMITS.page,'Page length');return {offset,limit};}
function page(rows,options){const {offset,limit}=paging(options);return {total:rows.length,offset,limit,results:copy(rows.slice(offset,offset+limit)),nextOffset:offset+limit<rows.length?offset+limit:null};}
function compare(options={}){
 configuration(options);sync();const a=memory.A,b=memory.B;if(!a||!b||a.epoch!==epoch||b.epoch!==epoch)fail('Save RAM snapshots A and B in this runtime session first.');
 const mode=options.mode===undefined?'changed':options.mode,region=options.region===undefined?'all':options.region;
 if(!['changed','unchanged','increased','decreased','equal-value'].includes(mode))fail('Unknown memory comparison mode.');if(!['all','ram','sram'].includes(region))fail('Region must be all, ram, or sram.');
 const value=mode==='equal-value'?integer(options.value,0,255,'Comparison byte value'):null,rows=[];
 for(const key of ['ram','sram']){if(region!=='all'&&region!==key)continue;if(a[key].length!==b[key].length)fail('RAM snapshot lengths differ.');for(let i=0;i<a[key].length;i++){const before=a[key][i],after=b[key][i];if(mode==='changed'?before!==after:mode==='unchanged'?before===after:mode==='increased'?after>before:mode==='decreased'?after<before:after===value)rows.push({region:key,address:(key==='sram'?0x6000:0)+i,before,after});}}
 return {...page(rows,options),mode,region,frames:{A:a.frame,B:b.frame},meaning:mode==='equal-value'?'Snapshot B equals the requested byte.':'Unsigned byte comparison between snapshots; wraparound is not inferred.'};
}
function addWatch(options){configuration(options);requireLoaded();const address=canonicalAddress(options.address),label=textLabel(options.label===undefined?'':options.label,'Watch label');if(!watchMap.has(address.address)&&watchMap.size>=LIMITS.watches)fail('At most '+LIMITS.watches+' RAM watches are allowed.');const prior=watchMap.get(address.address);watchMap.set(address.address,{...address,label,writeCount:prior?.writeCount||0,lastEvent:prior?.lastEvent??null});notify();return watchRows().find(row=>row.address===address.address);}
function removeWatch(address){sync();const canonical=canonicalAddress(address);const removed=watchMap.delete(canonical.address);notify();return removed;}
function watches(){sync();return watchRows();}
function romOffset(address){
 if(address<0x8000||!emu.prgRom||!emu.prgSize||!signature?.rom)return null;
 const within=emu.mapper===4?emu.prgPage[(address>>13)&3]+(address&0x1fff):(address>=0xc000?emu.prgBank1:emu.prgBank0)+(address&0x3fff);
 if(!Number.isSafeInteger(within)||within<0)return null;
 const start=16+((signature.rom[6]&4)?512:0),offset=start+(within%emu.prgSize);
 return offset<signature.rom.length?offset:null;
}
function peek(address){if(address<0x2000)return emu.ram[address&0x7ff];if(address>=0x6000&&address<0x8000)return emu.sram?emu.sram[address-0x6000]:null;if(address>=0x8000){const offset=romOffset(address);return offset===null?null:signature.rom[offset];}return null;}
function instructionSource(pc,fileOffset){let sourceLength=0;const bytes=[];if(fileOffset!==null)for(let i=0;i<3&&pc+i<=65535;i++){if(romOffset(pc+i)!==fileOffset+i)break;bytes.push(peek(pc+i));sourceLength++;}return {sourceLength,bytes};}
function origin(){return {pc:context?.pc??null,fileOffset:context?.fileOffset??null,opcode:context?.opcode??null,sourceLength:context?.sourceLength??0,bytes:context?.bytes?context.bytes.slice():[],frame:emu.frameCount,cycles:emu.cycles};}
function appendEvent(fields){if(!tracing)return null;if(eventLog.length>=LIMITS.events){stop('Trace stopped at the '+LIMITS.events+' event limit.');return null;}const event={id:eventLog.length,...origin(),...fields};eventLog.push(event);return event;}
function bounded(){if(!tracing)return;if(eventLog.length>=LIMITS.events)stop('Trace stopped at the '+LIMITS.events+' event limit.');else if(instructionCount>=LIMITS.instructions)stop('Trace stopped at the '+LIMITS.instructions+' instruction limit.');}
function mark(familyName,index,value,event){const target=resourceData[familyName];if(!target||!Number.isSafeInteger(index)||index<0||index>=target.bytes.length)return;target.bytes[index]=value;target.known[index]=1;target.sourceEvent[index]=event.id;}
function recordPPU(address,value){
 address&=0x3fff;value&=255;let storage,physicalAddress,accepted=true,storedValue=value;
 if(address<0x2000){storage='chrRam';accepted=!!emu.hasChrRam;physicalAddress=accepted?(emu.mapper===4?(emu.chrPages?.[address>>10]||0)+(address&1023):(address<4096?emu.chrBank0:emu.chrBank1)+(address&4095))%emu.chrRam.length:null;}
 else if(address<0x3f00){storage='vram';physicalAddress=ppuMirror(address-0x2000);}
 else{storage='palette';physicalAddress=address&31;if((physicalAddress&19)===16)physicalAddress-=16;storedValue=value&63;}
 const event=appendEvent({kind:'ppu',address,value,storage,physicalAddress,storedValue,accepted});if(!event)return;
 if(accepted){mark(storage,physicalAddress,storedValue,event);if(storage==='palette'&&(physicalAddress&3)===0)mark(storage,physicalAddress^16,storedValue,event);}
 bounded();
}
function coverage(options={}){configuration(options);sync();return page(Array.from(coverageMap.values()),options);}
function events(options={}){configuration(options);sync();if(options.kind!==undefined&&!['ppu','apu','watch'].includes(options.kind))fail('Event kind must be ppu, apu, or watch.');return page(options.kind?eventLog.filter(event=>event.kind===options.kind):eventLog,options);}
function resources(){sync();const out={collection:traceMode==='audio'?'excluded-by-audio-focused-trace':'observed-ppu-writes',interpretation:'Observed writes only. known=0 means unknown, including bytes whose stored placeholder is zero. Physical memory is not a native scene/collision/music decoder.',epoch,identity:identity?{...identity}:null};for(const [name,value]of Object.entries(resourceData)){out[name]={storage:value.storage,bytes:Array.from(value.bytes),known:Array.from(value.known),sourceEvent:Array.from(value.sourceEvent,id=>id<0?null:id)};}return out;}
// Derive a bounded audio view from this session's retained observations. No
// separate recorder, ROM scanner, hardware reads or inferred driver boundary.
function audioDriverReport(){
 sync();const apuEvents=eventLog.filter(event=>event.kind==='apu'),writers=new Map(),registers=new Map(),channels=new Map();
 let mappedWrites=0,unmappedWrites=0,unknownOriginWrites=0,shortModeWrites=0,longModeWrites=0,dmcEnableRequests=0,dmcDisableRequests=0;
 const channel=address=>address<=0x4003?'pulse1':address<=0x4007?'pulse2':address===0x4009||address===0x400d?'unused':address<=0x400b?'triangle':address<=0x400f?'noise':address<=0x4013?'dmc':'control';
 const labels={pulse1:'Pulse 1',pulse2:'Pulse 2',triangle:'Triangle',noise:'Noise',dmc:'DMC',control:'APU control',unused:'Unused APU addresses'};
 const bump=(map,key,fields,event)=>{let row=map.get(key);if(!row){row={...fields,count:0,firstFrame:event.frame,lastFrame:event.frame,firstEvent:event.id,lastEvent:event.id};map.set(key,row);}row.count++;row.lastFrame=event.frame;row.lastEvent=event.id;return row;};
 for(const event of apuEvents){
  const name=channel(event.address),reg=bump(registers,event.address,{address:event.address,channel:name,firstValue:event.value,lastValue:event.value},event);reg.lastValue=event.value;
  const ch=bump(channels,name,{id:name,label:labels[name],registers:[]},event);if(!ch.registers.includes(event.address))ch.registers.push(event.address);
  if(event.address===0x400e){if(event.value&0x80)shortModeWrites++;else longModeWrites++;}
  if(event.address===0x4015){if(event.value&0x10)dmcEnableRequests++;else dmcDisableRequests++;}
  if(Number.isInteger(event.fileOffset))mappedWrites++;else unmappedWrites++;
  if(!Number.isInteger(event.pc)){unknownOriginWrites++;continue;}
  const key=JSON.stringify([event.fileOffset,event.pc,event.opcode,event.bytes]),row=bump(writers,key,{pc:event.pc,fileOffset:event.fileOffset,opcode:event.opcode,sourceLength:event.sourceLength,bytes:event.bytes.slice(),source:Number.isInteger(event.fileOffset)?'mapped-rom':'unmapped-cpu',registers:[],channels:[]},event);
  if(!row.registers.includes(event.address))row.registers.push(event.address);if(!row.channels.includes(name))row.channels.push(name);
 }
 const writerRows=Array.from(writers.values());for(const row of writerRows)row.registers.sort((a,b)=>a-b);for(const row of channels.values())row.registers.sort((a,b)=>a-b);
 return copy({format:'NESForgeREInspection',version:2,kind:'audio-driver-observations',modelVersion:'re-audio-survey-1',identity:identity?{...identity}:null,epoch,
  trace:{mode:traceMode,tracing,startFrame,lastFrame,instructions:instructionCount,eventCount:eventLog.length,coverageCount:coverageMap.size,stopReason,limits:LIMITS,ppuWritesCollected:traceMode!=='audio'},
  summary:{apuWrites:apuEvents.length,writerSites:writerRows.length,mappedWrites,unmappedWrites,unknownOriginWrites},writers:writerRows,registers:Array.from(registers.values()).sort((a,b)=>a.address-b.address),channels:Array.from(channels.values()),
  noise:{shortModeWrites,longModeWrites,interpretation:'Observed $400E mode-bit writes only; they do not establish audible noise or recover an instrument.'},
  dmc:{enableRequests:dmcEnableRequests,disableRequests:dmcDisableRequests,interpretation:'Observed $4015 bit-4 requests only; enabling an already active DMC does not restart it. Sample bytes, actual starts, bank mappings and sample counts are not inferred.'},
  events:apuEvents,limitations:['Only APU writes retained in this bounded trace are included. Unvisited audio and a trace with no APU writes remain unknown.','Writer sites are observed CPU instructions, not inferred routine boundaries, song/SFX IDs, a complete audio library or recognized engine families.','Source offsets are observed emulator mappings; CPU addresses alone cannot identify banked ROM code. Unmapped CPU sites and unknown origins remain separate.','Register writes do not establish audible output, note boundaries, instrument definitions or editable music. Expansion audio is not collected by this base-APU observer.','Audio-focused mode excludes PPU write evidence; emulated graphics and audio execution continue unchanged. Existing emulator timing and mapper limitations apply.']});
}
function exportData(){sync();return {format:'NESForgeREInspection',version:2,kind:'runtime-observation',modelVersion:'re-runtime-1',runtimeObservationVersion:1,status:rawStatus(),identity:identity?{...identity}:null,coverage:copy(Array.from(coverageMap.values())),events:copy(eventLog),resources:resources(),snapshots:{A:memory.A?{...snapshotInfo('A'),ram:Array.from(memory.A.ram),sram:Array.from(memory.A.sram)}:null,B:memory.B?{...snapshotInfo('B'),ram:Array.from(memory.B.ram),sram:Array.from(memory.B.sram)}:null},warnings:['Instruction coverage records observed execution only; unvisited code and resources remain unknown.','APU writes are observed sound-chip commands, not recovered music, instruments, or sound-effect definitions.','Resource sourceEvent values identify the write instruction, not necessarily the original ROM data byte or its decoder.','Runtime timing, mapper behavior and raster behavior retain the emulator’s existing limitations.','RAM watches are user labels; gameplay meanings and stage controls are not inferred.']};}
const oldStep=cpuStepRaw;
cpuStepRaw=function(...args){
 if(!tracing)return oldStep.apply(this,args);
 const previous=context;safely(()=>{sync();if(!tracing)return;const pc=emu.PC&65535,fileOffset=romOffset(pc),opcode=peek(pc),key=pc+':'+fileOffset+':'+opcode;let entry=coverageMap.get(key);if(!entry&&coverageMap.size>=LIMITS.coverage){stop('Trace stopped at the '+LIMITS.coverage+' coverage-entry limit.');return;}context={pc,fileOffset,opcode,...instructionSource(pc,fileOffset)};instructionCount++;lastFrame=emu.frameCount;if(entry){entry.count++;entry.lastFrame=emu.frameCount;}else{entry={pc,fileOffset,opcode,sourceLength:context.sourceLength,bytes:context.bytes.slice(),count:1,firstFrame:emu.frameCount,lastFrame:emu.frameCount};coverageMap.set(key,entry);}});
 try{return oldStep.apply(this,args);}finally{context=previous;safely(bounded);}
};
const oldWrite=cpuWrite;
cpuWrite=function(...args){
 if(!tracing)return oldWrite.apply(this,args);
 let observed=null;safely(()=>{sync();if(!tracing)return;const address=args[0]&65535,value=args[1]&255;if(address<=0x4013&&address>=0x4000||address===0x4015||address===0x4017)observed={kind:'apu',address,value};else if(address<0x2000||address>=0x6000&&address<0x8000){const canonical=address<0x2000?address&0x7ff:address,watch=watchMap.get(canonical);if(watch)observed={kind:'watch',address:canonical,busAddress:address,value,before:safeValue(watch.region,watch.index),region:watch.region,label:watch.label};}});
 const result=oldWrite.apply(this,args);
 if(observed&&tracing)safely(()=>{const event=appendEvent(observed);if(event&&observed.kind==='watch'){const watch=watchMap.get(observed.address);if(watch){watch.writeCount++;watch.lastEvent=event.id;}}bounded();});
 return result;
};
const oldPPUWrite=ppuBusWrite;
ppuBusWrite=function(...args){const result=oldPPUWrite.apply(this,args);if(tracing&&traceMode!=='audio')safely(()=>{sync();if(tracing&&traceMode!=='audio')recordPPU(args[0],args[1]);});return result;};
const oldFrame=emuRunFrame;
emuRunFrame=function(...args){const result=oldFrame.apply(this,args);if(tracing)safely(()=>{sync();lastFrame=emu.frameCount;if(lastNotifyFrame!==emu.frameCount){lastNotifyFrame=emu.frameCount;notify();}});return result;};
const oldReset=emuDoReset;
emuDoReset=function(...args){if(loadDepth)safely(sync);else if(!internalReset)safely(()=>invalidate('Emulator reset; runtime observations and RAM snapshots cleared.'));return oldReset.apply(this,args);};
const oldLoad=emuLoadRomData;
emuLoadRomData=function(...args){loadDepth++;try{return oldLoad.apply(this,args);}finally{loadDepth--;safely(sync);}};
const oldTrace=emuTrace;
emuTrace=function(...args){safely(()=>invalidate('CPU trace changed execution; runtime observations and RAM snapshots cleared.'));return oldTrace.apply(this,args);};
const oldCommit=services.ProjectStore.commit;
services.ProjectStore.commit=function(...args){const result=oldCommit.apply(this,args);safely(sync);return result;};
const oldReplace=Forge166.project.replaceProject;
Forge166.project.replaceProject=function(...args){const result=oldReplace.apply(this,args);safely(sync);return result;};
signature=liveSignature();resourceData=blankResources();
let timelineBusy=false;
services.EmulatorTimeline?.subscribe(state=>{if(state.busy&&!timelineBusy)invalidate('Frame navigation invalidated runtime observations and RAM snapshots.');timelineBusy=!!state.busy;});
services.RERuntime=Object.freeze({limits:LIMITS,identify,start,stop,clear,snapshot,compare,addWatch,removeWatch,watches,coverage,events,resources,audioDriverReport,exportData,getROMSnapshot,status(){sync();return rawStatus();},subscribe(fn){if(typeof fn!=='function')return ()=>{};listeners.add(fn);try{fn(rawStatus());}catch(error){}return ()=>listeners.delete(fn);}});
})();
