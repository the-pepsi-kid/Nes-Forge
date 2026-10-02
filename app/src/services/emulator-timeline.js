/* Opt-in bounded emulator history. Physical state is restored, not screenshots.
 * Stored-byte budget excludes JS object overhead and temporary encode buffers.
 * ROMs, host audio, scheduler generations and live input ownership stay live.
 */
(()=>{
'use strict';
const services=window.Forge.services,MAX_STATES=300,MAX_BYTES=32*1024*1024,PIXELS=256*240;
const excluded=new Set(['prgRom','chrRom','lastBuiltRom','loaded','running','loading','romName','rafId','loadGeneration','frameBuffer','bgFrameBuffer']);
const callbacks=new Set(['onSample','readMemory']);
const constructors={Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array};
const encoder=new TextEncoder(),decoder=new TextDecoder(),listeners=new Set();
let enabled=false,supported=true,busy=false,navigationBlocked=false,history=[],cursor=-1,storedBytes=0,session=0,identity=null,operation=0,loadDepth=0,internalPause=0,internalFrame=0,message='Frame history is off.';
function fail(text){throw Error('Frame history: '+text);}
function keys(object,omit){return Object.keys(object).filter(key=>!omit.has(key));}
function physical(object,omit){const out={};for(const key of Reflect.ownKeys(object)){if(omit.has(key))continue;const descriptor=Object.getOwnPropertyDescriptor(object,key);if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.writable||!descriptor.enumerable)fail('Unsupported physical state property.');out[key]=descriptor.value;}return out;}
function encodeGraph(value){
 const nodes=[],seen=new Map();
 function ref(item){
  if(item===null||typeof item==='string'||typeof item==='boolean')return item;
  if(typeof item==='number'){if(!Number.isFinite(item))fail('Non-finite physical state.');return Object.is(item,-0)?{z:1}:item;}
  if(item===undefined)return {u:1};
  if(typeof item!=='object')fail('Unsupported physical state type '+typeof item+'.');
  if(seen.has(item))return {r:seen.get(item)};
  const index=nodes.length;seen.set(item,index);nodes.push(null);let node;
  if(ArrayBuffer.isView(item)){
   const type=item.constructor.name;if(!Object.hasOwn(constructors,type)||!(item instanceof constructors[type]))fail('Unsupported typed state '+type+'.');
   if(typeof SharedArrayBuffer!=='undefined'&&item.buffer instanceof SharedArrayBuffer)fail('Shared physical memory is unsupported.');
   node={t:'typed',type,length:item.length,bytes:bytesToBase64(new Uint8Array(item.buffer,item.byteOffset,item.byteLength))};
  }else if(item instanceof Map)node={t:'map',entries:Array.from(item,([key,value])=>[ref(key),ref(value)])};
  else if(Array.isArray(item)){
   const own=Reflect.ownKeys(item),normal=own.every(key=>key==='length'||typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<item.length);
   for(const key of own)if(key!=='length'){const d=Object.getOwnPropertyDescriptor(item,key);if(typeof key!=='string'||!Object.hasOwn(d,'value')||!d.enumerable)fail('Unsupported array property.');}
   node=normal?{t:'array',length:item.length,items:Array.from({length:item.length},(_,i)=>Object.hasOwn(item,i)?ref(item[i]):{h:1})}:{t:'array',length:item.length,props:Object.keys(item).map(key=>[key,ref(item[key])])};
  }
  else{
   const proto=Object.getPrototypeOf(item);if(proto!==Object.prototype&&proto!==null)fail('Unsupported state object prototype.');
   node={t:'object',nullPrototype:proto===null,props:Reflect.ownKeys(item).map(key=>{const d=Object.getOwnPropertyDescriptor(item,key);if(typeof key!=='string'||!Object.hasOwn(d,'value')||!d.enumerable)fail('Unsupported nested state property.');return [key,ref(d.value)];})};
  }
  nodes[index]=node;return {r:index};
 }
 const root=ref(value);return encoder.encode(JSON.stringify({version:1,root,nodes}));
}
function decodeGraph(bytes){
 const payload=JSON.parse(decoder.decode(bytes));if(payload.version!==1||!Array.isArray(payload.nodes)||payload.nodes.length>1000000)fail('Unsupported stored snapshot.');
 const objects=payload.nodes.map(node=>{
  if(!node||typeof node!=='object')fail('Invalid stored node.');
  if(node.t==='object')return node.nullPrototype?Object.create(null):{};
  if(node.t==='array'){if(!Number.isInteger(node.length)||node.length<0||node.length>10000000)fail('Invalid array length.');return new Array(node.length);}
  if(node.t==='map')return new Map();
  if(node.t==='typed'){
   const C=constructors[node.type];if(!C||!Number.isInteger(node.length)||node.length<0)fail('Invalid typed snapshot.');
   const raw=base64ToBytes(node.bytes);if(raw.length!==node.length*C.BYTES_PER_ELEMENT)fail('Typed snapshot length differs.');
   return new C(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
  }
  fail('Unsupported stored node type.');
 });
 function value(item){if(item===null||typeof item==='string'||typeof item==='boolean'||typeof item==='number')return item;if(item?.u===1)return undefined;if(item?.z===1)return -0;if(Number.isInteger(item?.r)&&item.r>=0&&item.r<objects.length)return objects[item.r];fail('Invalid stored reference.');}
 payload.nodes.forEach((node,index)=>{
  const target=objects[index];
  if(node.t==='array'&&node.items){if(!Array.isArray(node.items)||node.items.length!==node.length)fail('Invalid stored array.');for(let i=0;i<node.items.length;i++)if(node.items[i]?.h!==1)target[i]=value(node.items[i]);}
  if(node.t==='map'){if(!Array.isArray(node.entries))fail('Invalid map snapshot.');for(const pair of node.entries){if(!Array.isArray(pair)||pair.length!==2)fail('Invalid map entry.');target.set(value(pair[0]),value(pair[1]));}}
  if(node.t==='object'||node.t==='array'&&!node.items){if(!Array.isArray(node.props))fail('Invalid object snapshot.');for(const pair of node.props){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||pair[0]==='length'&&node.t==='array')fail('Invalid object property.');Object.defineProperty(target,pair[0],{value:value(pair[1]),writable:true,enumerable:true,configurable:true});}}
 });
 return value(payload.root);
}
function packFrame(buffer){
 if(!(buffer instanceof Uint8ClampedArray)||buffer.length!==PIXELS*4)fail('Completed framebuffer is missing or unsupported.');
 const words=new Uint32Array(buffer.buffer,buffer.byteOffset,PIXELS),runs=[];
 for(let i=0;i<words.length;){const value=words[i];let end=i+1;while(end<words.length&&words[end]===value)end++;runs.push(end-i,value);i=end;}
 return runs.length<words.length?{mode:'rle',data:Uint32Array.from(runs)}:{mode:'raw',data:new Uint32Array(words)};
}
function unpackFrame(frame){
 if(!frame||!(frame.data instanceof Uint32Array))fail('Invalid stored framebuffer.');
 const words=new Uint32Array(PIXELS);
 if(frame.mode==='raw'){if(frame.data.length!==PIXELS)fail('Invalid raw framebuffer length.');words.set(frame.data);}
 else if(frame.mode==='rle'){
  if(frame.data.length%2)fail('Invalid framebuffer run list.');let at=0;
  for(let i=0;i<frame.data.length;i+=2){const count=frame.data[i];if(!count||at+count>PIXELS)fail('Invalid framebuffer run.');words.fill(frame.data[i+1],at,at+count);at+=count;}
  if(at!==PIXELS)fail('Incomplete stored framebuffer.');
 }else fail('Unsupported framebuffer encoding.');
 return new Uint8ClampedArray(words.buffer);
}
function clear(){history=[];cursor=-1;storedBytes=0;}
function rawStatus(){return Object.freeze({enabled,busy,loaded:!!emu.loaded,supported,oldest:history[0]?.frame??null,current:emu.loaded?emu.frameCount:null,newest:history.at(-1)?.frame??null,storedStates:history.length,storedBytes,maxStates:MAX_STATES,maxBytes:MAX_BYTES,canBack:!!emu.loaded&&enabled&&!busy&&cursor>0,canForward:!!emu.loaded&&!busy,message});}
function notify(){const state=rawStatus();for(const fn of listeners)try{fn(state);}catch(error){/* A presentation subscriber cannot break the emulation boundary. */}}
function currentIdentity(){return emu.loaded?{rom:emu.lastBuiltRom,prg:emu.prgRom,chr:emu.chrRom,mapper:emu.mapper,size:emu.prgSize}:null;}
function sameIdentity(a,b){return a===b||!!a&&!!b&&a.rom===b.rom&&a.prg===b.prg&&a.chr===b.chr&&a.mapper===b.mapper&&a.size===b.size;}
function blockNavigation(value){navigationBlocked=value;services.EmulatorInput?.setBlocked('frame-navigation',value);}
function cancel(reason='Navigation canceled.'){operation++;const wasBusy=busy;busy=false;if(navigationBlocked)blockNavigation(false);if(wasBusy){message=reason;notify();}return true;}
function clearSession(reason,seed=false){cancel(reason);session++;clear();identity=currentIdentity();supported=true;message=reason;if(seed&&enabled&&emu.loaded)record();notify();}
function syncSession(){const now=currentIdentity();if(!sameIdentity(identity,now))clearSession(now?'ROM changed; frame history restarted.':'ROM unloaded; frame history cleared.',!!now);}
function failClosed(error){cancel('Frame history stopped.');clear();enabled=false;supported=false;message=String(error?.message||error);notify();}
function record(){
 if(!enabled||!emu.loaded||loadDepth)return false;
 try{
  const graph=encodeGraph({emu:physical(emu,excluded),apu:physical(apuCore,callbacks)}),frame=packFrame(emu.frameBuffer),background=packFrame(emu.bgFrameBuffer);
  // Numeric record metadata is counted as four Float64 fields. Small JS object
  // headers, listener objects and codec working memory are outside this budget.
  const size=graph.byteLength+frame.data.byteLength+background.data.byteLength+32;
  if(size>MAX_BYTES)fail('One physical snapshot exceeds the 32 MiB stored-byte budget.');
  if(cursor<history.length-1)truncateFuture();
  const entry={session,frame:emu.frameCount,graph,video:frame,background,size};history.push(entry);storedBytes+=size;cursor=history.length-1;
  while(history.length>MAX_STATES||storedBytes>MAX_BYTES){storedBytes-=history.shift().size;cursor--;}
  return true;
 }catch(error){failClosed(error);return false;}
}
function truncateFuture(){while(history.length>cursor+1)storedBytes-=history.pop().size;}
function validateDestination(target,source,omit){
 if(!source||typeof source!=='object'||Array.isArray(source))fail('Invalid restored state root.');
 if(!Object.isExtensible(target))fail('Physical state is not writable.');
 for(const key of keys(target,omit)){const d=Object.getOwnPropertyDescriptor(target,key);if(!d||!Object.hasOwn(d,'value')||!d.writable||!d.configurable)fail('Physical state property is not restorable: '+key+'.');}
 for(const key of Object.keys(source))if(omit.has(key))fail('Stored snapshot contains excluded state.');
}
function prepare(entry){
 if(entry.session!==session)fail('Snapshot belongs to a different ROM session.');
 // Unsupported newer live state must never be silently deleted by an older
 // snapshot; reject the whole restoration before physical mutation.
 encodeGraph({emu:physical(emu,excluded),apu:physical(apuCore,callbacks)});
 const state=decodeGraph(entry.graph);state.emu.frameBuffer=unpackFrame(entry.video);state.emu.bgFrameBuffer=unpackFrame(entry.background);
 if(state.emu.frameCount!==entry.frame||!Number.isInteger(entry.frame)||entry.frame<0||!Number.isFinite(state.emu.cycles)||!Number.isFinite(state.emu.PC))fail('Invalid stored CPU clock or position.');
 for(const [key,length]of[['ram',2048],['palRam',32],['oamMem',256],['apuRegs',32],['chrRam',8192]])if(!(state.emu[key] instanceof Uint8Array)||state.emu[key].length!==length)fail('Invalid restored '+key+'.');
 if(!(state.emu.vram instanceof Uint8Array)||![2048,4096].includes(state.emu.vram.length))fail('Invalid restored PPU memory.');
 if(state.emu.captureTrace&&(!(state.emu.captureTrace.tileMap instanceof Map)||!(state.emu.captureTrace.palMap instanceof Map)))fail('Invalid restored capture maps.');
 if(!Array.isArray(state.apu.pulse)||state.apu.pulse.length!==2||!state.apu.dmc||!state.apu.triangle||!state.apu.noise||!Number.isFinite(state.apu.cycles))fail('Invalid restored APU.');
 const withVideo=new Set([...excluded]);withVideo.delete('frameBuffer');withVideo.delete('bgFrameBuffer');
 validateDestination(emu,state.emu,withVideo);validateDestination(apuCore,state.apu,callbacks);
 return state;
}
function assignState(target,source,omit){for(const key of keys(target,omit))if(!Object.hasOwn(source,key))delete target[key];for(const [key,value]of Object.entries(source))target[key]=value;}
function present(){disasm_output='';disasm_asmText='';renderEmu();updateEmuSidebar();emuUpdatePerformance(true);}
function restore(index){
 const state=prepare(history[index]),withVideo=new Set([...excluded]);withVideo.delete('frameBuffer');withVideo.delete('bgFrameBuffer');
 // No parsing, decoding, validation or user callback occurs between these two
 // assignments. Both complete destinations were checked before mutation.
 assignState(emu,state.emu,withVideo);assignState(apuCore,state.apu,callbacks);cursor=index;apuSilence();present();
}
function pauseForNavigation(){internalPause++;try{emuPause();services.EmulatorInput?.release('frame-navigation');clearEmuKeys();apuSilence();}finally{internalPause--;}}
function setEnabled(value){
 if(typeof value!=='boolean')fail('History enabled must be true or false.');cancel();syncSession();clear();enabled=value;supported=true;message=value?'Frame history recording enabled.':'Frame history is off.';if(value&&emu.loaded)record();notify();return enabled;
}
async function seekRelative(delta){
 if(!Number.isInteger(delta)||delta<-60||delta>60||delta===0)fail('Navigation distance must be a nonzero whole number from -60 through 60.');
 cancel();syncSession();if(!emu.loaded)return false;if(delta<0&&(!enabled||cursor<=0)){message='No earlier recorded frame is available.';notify();return false;}
 const token=++operation,origin=session;busy=true;blockNavigation(true);message='Navigating frames…';notify();pauseForNavigation();
 try{
  if(delta<0){restore(Math.max(0,cursor+delta));message='Restored recorded frame '+emu.frameCount+'.';}
  else{
   let remaining=delta;
   if(enabled&&cursor>=0&&cursor<history.length-1){const available=Math.min(remaining,history.length-1-cursor);restore(cursor+available);remaining-=available;}
   for(let done=0;done<remaining;done++){
    if(token!==operation||origin!==session||!emu.loaded)return false;
    internalFrame++;try{emuRunFrame();}finally{internalFrame--;}
    if(done+1<remaining){present();notify();await new Promise(resolve=>setTimeout(resolve,0));}
   }
   present();message='Paused at frame '+emu.frameCount+'.';
  }
  return true;
 }catch(error){failClosed(error);return false;}
 finally{if(token===operation){busy=false;blockNavigation(false);notify();}}
}
const oldFrame=emuRunFrame;
emuRunFrame=function(...args){
 if(loadDepth)return oldFrame.apply(this,args);
 if(!enabled&&!busy)return oldFrame.apply(this,args);
 syncSession();if(busy&&!internalFrame)cancel('Navigation interrupted by a manual frame.');
 if(enabled&&cursor<history.length-1)truncateFuture();
 try{const before=emu.frameCount,result=oldFrame.apply(this,args);if(emu.loaded&&emu.frameCount!==before){record();if(!busy)notify();}return result;}catch(error){if(enabled)failClosed(error);throw error;}
};
const oldPause=emuPause;
emuPause=function(...args){if(busy&&!internalPause&&!internalFrame)cancel('Navigation paused.');return oldPause.apply(this,args);};
const oldRun=emuToggleRun;
emuToggleRun=function(...args){cancel('Navigation interrupted by Run.');syncSession();if(!emu.running&&enabled&&cursor<history.length-1)truncateFuture();return oldRun.apply(this,args);};
const oldLoad=emuLoadRomData;
emuLoadRomData=function(...args){cancel('ROM loading interrupted navigation.');loadDepth++;let result;try{result=oldLoad.apply(this,args);return result;}finally{loadDepth--;if(result===true)clearSession('ROM loaded; frame history restarted.',true);else syncSession();}};
const oldReset=emuDoReset;
emuDoReset=function(...args){const result=oldReset.apply(this,args);if(!loadDepth)clearSession('Reset; frame history restarted.',true);return result;};
const oldTrace=emuTrace;
emuTrace=function(...args){cancel('CPU trace interrupted navigation.');try{return oldTrace.apply(this,args);}finally{clearSession('CPU trace changed physical state; history resumes after the next frame.',false);}};
const oldCommit=services.ProjectStore.commit;
services.ProjectStore.commit=function(...args){const result=oldCommit.apply(this,args);syncSession();return result;};
const oldReplace=Forge166.project.replaceProject;
Forge166.project.replaceProject=function(...args){const result=oldReplace.apply(this,args);syncSession();return result;};
identity=currentIdentity();
services.EmulatorTimeline=Object.freeze({setEnabled,enableHistory:setEnabled,back:(count=1)=>seekRelative(-count),forward:(count=1)=>seekRelative(count),seekRelative,cancel,status(){syncSession();return rawStatus();},subscribe(fn){if(typeof fn!=='function')return ()=>{};listeners.add(fn);fn(rawStatus());return ()=>listeners.delete(fn);}});
})();
