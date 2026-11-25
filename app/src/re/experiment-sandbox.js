/* AL-EXP-01 (BL02): the experiment sandbox. Experiments never run in the editor's own emulator. The host builds a second
 * copy of this exact standalone document (its shell, embedded at build time, around its own script text, so the copy
 * is byte-identical to the file) and loads it in an iframe sandboxed with "allow-scripts" only: an opaque origin with
 * no access to the editor's storage, project or emulator. The two talk by postMessage with a per-session nonce; the
 * agent inside answers a fixed set of declarative commands and evaluates nothing it receives. Removing the iframe ends
 * the copy. */
(()=>{
'use strict';
const F=window.Forge,services=F.services,contract=window.ForgeExperimentContract;
const PREFIX='nes-forge-experiment-sandbox:';
const COMMANDS=Object.freeze(['hello','run','cancel','release']);
const inSandbox=typeof window.name==='string'&&window.name.startsWith(PREFIX)&&window.parent!==window;
function fail(message){throw Error('Experiment sandbox: '+message);}

// ---------- the document (host and agent compute it the same way) ----------
function scriptText(){const s=[...document.scripts].filter(x=>!x.src);if(s.length!==1)fail('expected the single inline script of the standalone build');return s[0].textContent;}
// The script element's text already holds whatever the shell files carry after its start tag and before its end tag,
// so the shell is cut at the tags themselves. (The tag text is assembled from pieces: written whole, the end tag would
// end this inline script.)
const START_TAG='<'+'script>',END_TAG='<'+'/script>';
function documentText(){const shell=window.ForgeShellText;if(!shell)fail('this build carries no embedded shell');
  const open=shell.prefix.lastIndexOf(START_TAG),close=shell.suffix.indexOf(END_TAG);if(open<0||close<0)fail('the embedded shell has no script element');
  return shell.prefix.slice(0,open+START_TAG.length)+scriptText()+shell.suffix.slice(close);}
async function digest(text){
  const bytes=new TextEncoder().encode(text);
  try{if(crypto?.subtle)return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}catch(_){}
  return contract.sha256(bytes);
}
let ownDigest=null;const documentSha256=()=>ownDigest||(ownDigest=digest(documentText()));
const yieldTask=()=>new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();resolve();};c.port2.postMessage(0);});

// =====================================================================================================================
// Host side: the editor
// =====================================================================================================================
const sessions=new Set();
function available(){try{return !inSandbox&&!!window.ForgeShellText&&!!document.body&&typeof MessageChannel!=='undefined'&&scriptText().length>0;}catch(_){return false;}}
async function open({bootMs=60000}={}){
  if(inSandbox)fail('a sandbox does not open sandboxes');if(!available())fail('isolation is not available in this document');
  const nonce=contract.sha256(crypto.getRandomValues(new Uint8Array(32))).slice(0,32),text=documentText(),expected=await documentSha256();
  const frame=document.createElement('iframe');
  frame.setAttribute('sandbox','allow-scripts');frame.name=PREFIX+nonce;frame.title='Experiment sandbox (isolated copy of NES Forge)';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;left:-10000px;top:0;width:256px;height:240px;border:0;opacity:0;pointer-events:none';
  const pending=new Map();let closed=false,ready=null,nextRun=1;const opened=performance.now();
  const session={nonce,identity:null,opened,closed:()=>closed,stats:{runs:0,cancelled:0,hardCancels:0,bootMs:null}};
  const onMessage=event=>{
    if(event.source!==frame.contentWindow||!event.data||event.data.nonce!==nonce)return;const m=event.data;
    if(m.type==='ready'&&ready){ready(m);ready=null;return;}
    const p=pending.get(m.runId);if(!p)return;
    if(m.type==='progress'){p.onProgress?.(m);return;}
    if(m.type==='result'){pending.delete(m.runId);p.resolve(m);}
  };
  window.addEventListener('message',onMessage);
  session.close=reason=>{if(closed)return;closed=true;window.removeEventListener('message',onMessage);frame.remove();sessions.delete(session);
    for(const [,p] of pending)p.resolve({type:'result',outcome:'cancelled',stopReason:reason||'the sandbox was closed',runId:p.runId});pending.clear();};
  session.post=(message,transfer)=>{if(closed)fail('the sandbox is closed');frame.contentWindow.postMessage({...message,nonce},'*',transfer||[]);};
  // run(request): resolves with the agent's result. signal: {aborted, addEventListener('abort')}; soft cancel first, then
  // the iframe is removed if the agent does not stop within hardCancelMs.
  session.run=(request,{onProgress,signal,hardCancelMs=3000}={})=>new Promise(resolve=>{
    const runId=nextRun++,entry={runId,resolve,onProgress};pending.set(runId,entry);session.stats.runs++;
    const abort=()=>{if(!pending.has(runId))return;session.stats.cancelled++;entry.cancelRequested=performance.now();try{session.post({type:'cancel',runId});}catch(_){}
      setTimeout(()=>{if(pending.has(runId)){session.stats.hardCancels++;session.close('cancelled: the sandbox did not stop in time and was removed');}},hardCancelMs);};
    if(signal){if(signal.aborted){queueMicrotask(abort);}else signal.addEventListener?.('abort',abort,{once:true});}
    session.post({type:'run',runId,request},request.rom?[]:[]);
  });
  session.release=labels=>{try{session.post({type:'release',labels});}catch(_){}};
  const greeting=new Promise((resolve,reject)=>{ready=resolve;setTimeout(()=>reject(Error('Experiment sandbox: it did not start within '+bootMs+' ms')),bootMs);});
  frame.srcdoc=text;document.body.appendChild(frame);sessions.add(session);
  let hello;try{hello=await greeting;}catch(error){session.close('did not start');throw error;}
  session.stats.bootMs=Math.round(performance.now()-opened);
  if(hello.identity.documentSha256!==expected){session.close('identity mismatch');fail('the sandbox is not this build (document '+hello.identity.documentSha256+', expected '+expected+')');}
  session.identity={...hello.identity,sameDocumentAsEditor:true};session.errors=()=>hello.errors;
  return session;
}

// =====================================================================================================================
// Agent side: inside the sandbox
// =====================================================================================================================
const BUTTON_BITS=Object.freeze(Object.fromEntries(contract.BUTTONS.map((b,i)=>[b,1<<i])));
let agentMask=null,cancelled=new Set(),busy=false,romSha=null;const checkpoints=new Map(),errors=[];
function snapshotChannel(name){
  if(name==='cpu')return Uint8Array.from([emu.A,emu.X,emu.Y,emu.SP,emu.PC&255,emu.PC>>8,(emu.C)|(emu.Z<<1)|(emu.I<<2)|(emu.D<<3)|32|(emu.V<<6)|(emu.N<<7)]);
  if(name==='ram')return new Uint8Array(emu.ram);
  if(name==='nametables')return new Uint8Array(emu.vram);
  if(name==='palette')return new Uint8Array(emu.palRam);
  if(name==='oam')return new Uint8Array(emu.oamMem);
  if(name==='chr')return emu.hasChrRam?new Uint8Array(emu.chrRam):new Uint8Array(0);
  if(name==='pixels')return new Uint8Array(emu.frameBuffer.buffer.slice(emu.frameBuffer.byteOffset,emu.frameBuffer.byteOffset+emu.frameBuffer.byteLength));
  fail('unknown channel '+name);
}
function fnv(arrays){let h=0x811c9dc5;for(const a of arrays)for(let i=0;i<a.length;i++){h^=a[i];h=Math.imul(h,0x01000193);}return h>>>0;}
function masksOf(steps){const out=[];for(const s of steps){const m=s.buttons.reduce((v,b)=>v|BUTTON_BITS[b],0);for(let i=0;i<s.frames;i++)out.push(m);}return out;}
// AL-EXP-02: the picture as NES colour indices. The renderer writes RGB through its palette table (NP); each RGB maps
// back to the lowest index that draws it, and colourClass names, per index, that lowest index (colours the table draws
// identically share a class).
let rgbIndex=null,colourClass=null;
function colourTables(){if(rgbIndex)return;rgbIndex=new Map();colourClass=new Uint8Array(64);for(let i=0;i<64;i++){const c=NP[i]||NP[15],k=(c[0]<<16)|(c[1]<<8)|c[2];if(!rgbIndex.has(k))rgbIndex.set(k,i);colourClass[i]=rgbIndex.get(k);}}
function pixelIndices(){colourTables();const fb=emu.frameBuffer,out=new Uint8Array(256*240);for(let i=0;i<out.length;i++){const o=i*4,v=rgbIndex.get((fb[o]<<16)|(fb[o+1]<<8)|fb[o+2]);out[i]=v===undefined?255:v;}return out;}
function nmiTargetOf(bytes){const layout=contract.romLayout(bytes);return bytes[layout.vectors.start]|(bytes[layout.vectors.start+1]<<8);}
// AL-EXP-02 synchronization: NMI-handler entries (the k-th time the CPU is about to execute the instruction at the
// cartridge's NMI vector target), $4016 latches (strobe falling edges, with the mask latched), RAM bytes written since
// power-on, and a per-frame digest of the executed PC sequence (the program's path). Wraps the emulator's own CPU-step
// and CPU-write functions in this sandbox copy only, and only records; installed before the bus observer, removed after it.
function installSync({nmiTarget,onNmi=null,latchMask=null}){
  const prev={step:cpuStepRaw,write:cpuWrite},state={nmis:0,nmiFrames:[],latches:[],written:new Uint8Array(0x800),path:0x811c9dc5,frameLatches:0,multiLatchFrames:0};
  cpuStepRaw=function(...args){const pc=emu.PC&0xffff;state.path=Math.imul(state.path^pc,0x01000193);if(pc===nmiTarget){state.nmis++;state.nmiFrames.push(emu.frameCount);if(onNmi)onNmi(state.nmis);}return prev.step.apply(this,args);};
  cpuWrite=function(a,v,...rest){a&=0xffff;if(a<0x2000)state.written[a&0x7ff]=1;
    if(a===0x4016&&!(v&1)&&emu.joyStrobe){if(latchMask)agentMask=latchMask(state.latches.length);state.latches.push([emu.frameCount,agentMask??0]);state.frameLatches++;}
    return prev.write.call(this,a,v,...rest);};
  return {state,endFrame(){const h=state.path>>>0;state.path=0x811c9dc5;if(state.frameLatches>1)state.multiLatchFrames++;state.frameLatches=0;return h;},uninstall(){cpuStepRaw=prev.step;cpuWrite=prev.write;}};
}
function syncCapture(sync,label,channels,observer){
  const c={label,nmi:sync.state.nmis,frame:emu.frameCount,latches:sync.state.latches.length,line:emu._ppuFrameLine};
  if(channels.includes('cpu'))c.cpu={a:emu.A,x:emu.X,y:emu.Y,s:emu.SP,p:cpuGetP(),pc:emu.PC&0xffff};
  if(channels.includes('ram')){c.ram=new Uint8Array(emu.ram);c.written=new Uint8Array(sync.state.written);}
  if(channels.includes('nametables'))c.ciram=new Uint8Array(emu.vram.subarray(0,0x800));
  if(channels.includes('palette')){c.palette=new Uint8Array(32);for(let i=0;i<32;i++)c.palette[i]=ppuBusRead(0x3f00+i);}
  if(channels.includes('chr'))c.chr=emu.hasChrRam?new Uint8Array(emu.chrRam):new Uint8Array(emu.chrRom||0);
  if(channels.includes('pixels')){c.pixels=pixelIndices();c.colourClass=new Uint8Array(colourClass);}
  if(channels.includes('reads')&&observer){c.reads=observer.events.filter(e=>e[1]===0).map(e=>[e[2],e[4]]);c.readsComplete=!observer.summary().truncated;}
  c.mirroring=emu.mirroring;return c;
}
// A verification job: from power-on, the joypad latches job.latches[i] at the i-th $4016 strobe (job.defaultMask after
// the list), and the state is captured when the CPU enters the NMI handler for the k-th time, for each checkpoint k.
// Engine-neutral by design: the independent emulator runs the same job (tools/agent-lab/independent).
async function runJob(runId,request,report){
  const t0=performance.now(),job=request.job,result={type:'result',runId,job:{captures:[],frames:0,nmis:0,latches:0,multiLatchFrames:0,stopReason:null}};
  let sync=null,observer=null;
  try{
    const bytes=request.rom instanceof Uint8Array?request.rom:fail('a job needs cartridge bytes');
    if(contract.sha256(bytes)!==request.romSha)fail('the cartridge bytes do not match their SHA-256');
    const layout=contract.romLayout(bytes);if(layout.mapper!==0)return {...result,outcome:'unsupported',stopReason:'mapper '+layout.mapper+' is not supported in this slice (NROM only)'};
    for(const ck of checkpoints.values())ck.handle.release();checkpoints.clear();
    if(!emuLoadRomData(bytes,'experiment',0))return {...result,outcome:'crash',stopReason:'the emulator refused to load the cartridge'};
    romSha=request.romSha;
    const pending=new Map(job.checkpoints.map(c=>[c.nmi,c.label])),channels=job.channels;
    agentMask=job.latches[0]??job.defaultMask;
    sync=installSync({nmiTarget:nmiTargetOf(bytes),latchMask:i=>job.latches[i]??job.defaultMask,onNmi:k=>{const label=pending.get(k);if(label!==undefined){result.job.captures.push(syncCapture(sync,label,channels,observer));pending.delete(k);}}});
    if(job.trace)observer=services.BusObserver.install({prgStart:layout.prgStart,prgBytes:layout.prgBytes,prgReads:true,ppuWrites:false,watchRam:[],maxEvents:job.maxEvents||100000});
    let chunkStart=performance.now();
    for(let f=0;f<job.maxFrames&&pending.size;f++){
      agentMask=job.latches[sync.state.latches.length]??job.defaultMask;
      emuRunFrame();sync.endFrame();if(observer)observer.endFrame();result.job.frames++;
      if(performance.now()-t0>(request.budgets?.wallMs||60000)){result.job.stopReason='the job exceeded its wall-clock budget at frame '+(f+1);break;}
      if(performance.now()-chunkStart>(request.chunkMs||16)){const held=agentMask;agentMask=null;await yieldTask();agentMask=held;chunkStart=performance.now();report({type:'progress',runId,frame:f+1,total:job.maxFrames});
        if(cancelled.has(runId)){result.job.stopReason='cancelled at frame '+(f+1);result.outcomeHint='cancelled';break;}}
    }
    if(pending.size&&!result.job.stopReason)result.job.stopReason='checkpoints not reached within '+job.maxFrames+' frames: '+[...pending.values()].join(', ');
    Object.assign(result.job,{nmis:sync.state.nmis,latches:sync.state.latches.length,multiLatchFrames:sync.state.multiLatchFrames,missing:[...pending.values()]});
  }catch(error){result.outcomeHint='crash';result.stopReason=String(error?.message||error);}
  finally{agentMask=null;if(observer)observer.uninstall();if(sync)sync.uninstall();cancelled.delete(runId);}
  result.wallMs=Math.round(performance.now()-t0);return result;
}
// One trial, from a cold load or from a checkpoint of the ROM loaded now. Deterministic for equal requests.
async function runTrial(runId,request,report){
  const t0=performance.now();let observer=null,sync=null,stop=null,outcomeHint=null;
  const result={type:'result',runId,captures:[],frameDigests:[],checkpointsSaved:[],trace:null,framesRun:0,startFrame:0,sync:null};
  try{
    const steps=contract.validateSteps(request.steps,'request.steps').steps,masks=masksOf(steps),total=masks.length;
    if(total>request.budgets.frames)fail('the input runs more frames than the budget');
    if(request.restore){
      const ck=checkpoints.get(request.restore.label);
      if(!ck)return {...result,outcome:'invalid',stopReason:'checkpoint "'+request.restore.label+'" is not available in this sandbox session'};
      if(ck.romSha!==request.restore.romSha||ck.romSha!==romSha)return {...result,outcome:'invalid',stopReason:'checkpoint "'+request.restore.label+'" belongs to another cartridge ('+ck.romSha.slice(0,12)+'…); it is not restored onto '+String(request.restore.romSha).slice(0,12)+'…'};
      ck.handle.restore();result.startFrame=ck.frame;result.checkpoint={label:ck.label,frame:ck.frame,stateDigest:ck.stateDigest};
    }else{
      const bytes=request.rom instanceof Uint8Array?request.rom:fail('a cold run needs cartridge bytes');
      const sha=contract.sha256(bytes);if(sha!==request.romSha)fail('the cartridge bytes do not match their SHA-256');
      const layout=contract.romLayout(bytes);if(layout.mapper!==0)return {...result,outcome:'unsupported',stopReason:'mapper '+layout.mapper+' is not supported by the sandbox in this slice (NROM only)'};
      for(const ck of checkpoints.values())ck.handle.release();checkpoints.clear();
      if(!emuLoadRomData(bytes,'experiment',0))return {...result,outcome:'crash',stopReason:'the emulator refused to load the cartridge'};
      romSha=sha;
    }
    const layout=contract.romLayout(emu.lastBuiltRom);
    // NMI-synchronized snapshots during this run: at the NMI-handler entry inside the frame that ends at a capture frame
    const syncAt=new Map((request.syncCaptures?.captures||[]).map(c=>[c.frame-1,c.label])),syncChannels=request.syncCaptures?.channels||[];result.syncCaptures=[];
    sync=installSync({nmiTarget:nmiTargetOf(emu.lastBuiltRom),onNmi:()=>{const label=syncAt.get(emu.frameCount);if(label!==undefined&&!result.syncCaptures.some(x=>x.label===label))result.syncCaptures.push(syncCapture(sync,label,syncChannels,observer));}});const pathDigests=[];
    if(request.trace)observer=services.BusObserver.install({prgStart:layout.prgStart,prgBytes:layout.prgBytes,prgReads:request.trace.prgReads,ppuWrites:request.trace.ppuWrites,watchRam:request.trace.watchRam||[],maxEvents:request.trace.maxEvents});
    const captureAt=new Map(request.captures.map(c=>[c.frame,c])),saveAt=new Map((request.save||[]).map(c=>[c.frame,c])),channels=request.channels,payloads=new Set(request.payloads||[]);
    let chunkStart=performance.now(),stuck=0;
    agentMask=0;
    for(let f=result.startFrame;f<total;f++){
      if(saveAt.has(f)){const c=saveAt.get(f),handle=services.EmulatorTimeline.saveOwnedCheckpoint('experiment '+c.label);checkpoints.set(c.label,{label:c.label,frame:f,romSha,handle,stateDigest:contract.sha256(Uint8Array.from([...snapshotChannel('cpu'),...snapshotChannel('ram'),...snapshotChannel('nametables'),...snapshotChannel('palette'),...snapshotChannel('oam')]))});result.checkpointsSaved.push({label:c.label,frame:f});}
      agentMask=masks[f];emuRunFrame();result.framesRun++;pathDigests.push(sync.endFrame());
      if(observer){observer.endFrame();const fr=observer.frames[observer.frames.length-1];stuck=fr[1]>=0&&fr[2]-fr[1]<=4&&fr[3]===0?stuck+1:0;
        if(stuck>=request.hangFrames){stop='timeout';result.stopReason='the program is stuck: the CPU stayed within $'+fr[1].toString(16)+'–$'+fr[2].toString(16)+' with no interrupt for '+stuck+' frames';break;}}
      if(request.frameDigests)result.frameDigests.push(fnv([emu.ram,emu.vram,emu.palRam,emu.oamMem]));
      const cap=captureAt.get(f+1);
      if(cap){const row={label:cap.label,frame:f+1,digests:{},payloads:{},ppu:{ctrl:emu.ppuCtrl,mask:emu.ppuMask,mirroring:emu.mirroring,scrollX:((emu.tAddr&31)<<3)|(emu.fineX&7),scrollY:((emu.tAddr>>5)&31)*8+((emu.tAddr>>12)&7),backgroundEnabled:!!(emu.ppuMask&8)}};
        for(const ch of channels){const bytes=snapshotChannel(ch);row.digests[ch]=contract.sha256(bytes);if(payloads.has(ch))row.payloads[ch]=bytes;}
        result.captures.push(row);}
      if(performance.now()-t0>request.budgets.wallMs){stop='timeout';result.stopReason='the trial exceeded its '+request.budgets.wallMs+' ms wall-clock budget at frame '+(f+1);break;}
      if(performance.now()-chunkStart>(request.chunkMs||16)){agentMask=null;await yieldTask();agentMask=masks[f];chunkStart=performance.now();report({type:'progress',runId,frame:f+1,total});
        if(cancelled.has(runId)){stop='cancelled';result.stopReason='cancelled at frame '+(f+1);break;}}
    }
    result.outcomeHint=stop;
    result.sync={nmiFrames:sync.state.nmiFrames,latches:sync.state.latches,pathDigests,multiLatchFrames:sync.state.multiLatchFrames,nmiTarget:nmiTargetOf(emu.lastBuiltRom)};
  }catch(error){result.outcomeHint='crash';result.stopReason=String(error?.message||error);}
  finally{agentMask=null;if(observer){result.trace={...observer.summary(),roles:observer.roles,events:observer.events,frames:observer.frames};observer.uninstall();}if(sync)sync.uninstall();cancelled.delete(runId);}
  result.wallMs=Math.round(performance.now()-t0);result.endFrame=emu.frameCount;
  try{result.memory=performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize}:null;}catch(_){result.memory=null;}
  return result;
}
// AL-REC-01: an incremental recovery run (src/services/recovery-explorer.js) on a locally supplied cartridge. Any
// mapper the emulator itself loads; the cartridge is checked against its SHA-256 and never changed; results go back to
// the editor only. A soft cancel stops the run at its next sample and still returns what it found.
async function runExplore(runId,request,report){
  const t0=performance.now();
  try{
    const bytes=request.rom instanceof Uint8Array?request.rom:fail('a recovery run needs the cartridge');
    if(contract.sha256(bytes)!==request.romSha)fail('the cartridge bytes do not match their SHA-256');
    if(!services.RecoveryExplorer)fail('this build has no recovery explorer');
    for(const ck of checkpoints.values())ck.handle.release();checkpoints.clear();romSha=request.romSha;
    let last=0;
    const result=await services.RecoveryExplorer.run({...(request.explore||{}),rom:bytes,
      onProgress:p=>{if(performance.now()-last>250){last=performance.now();report({type:'progress',runId,...p});}},
      shouldStop:()=>cancelled.has(runId)?'stopped on request':null});
    if(request.trace&&services.RecoveryTrace&&result.observations.length&&emu.hasChrRam)result.traces=await traceObservations(bytes,result,request.trace,runId);
    return {type:'result',runId,outcome:'completed',explore:result,wallMs:Math.round(performance.now()-t0)};
  }catch(error){return {type:'result',runId,outcome:'crash',stopReason:String(error?.message||error),wallMs:Math.round(performance.now()-t0)};}
  finally{cancelled.delete(runId);}
}
// replays the input paths that reached graphics observations from power-on with the CHR tracer on, and classifies the
// CHR RAM at each of those frames (deepest paths first, so one replay covers the observations along it)
async function traceObservations(bytes,result,{maxReplays=4,maxFrames=30000}={},runId){
  const E=services.RecoveryExplorer,T=services.RecoveryTrace,out=[],wanted=result.observations.filter(o=>o.path&&o.why.some(w=>/graphics|layout/.test(w))&&o.record?.scene);
  const key=p=>JSON.stringify(p),covered=new Set(),paths=[];
  for(const o of [...wanted].sort((a,b)=>b.frame-a.frame)){if(covered.has(o.index))continue;const p=o.path;paths.push({path:p,frame:o.frame});
    for(const x of wanted)if(x.frame<=o.frame&&key(x.path)===key(p.slice(0,x.path.length)))covered.add(x.index);if(paths.length>=maxReplays)break;}
  for(const {path} of paths){
    if(cancelled.has(runId))break;
    const at=new Map(wanted.filter(x=>key(x.path)===key(path.slice(0,x.path.length))).map(x=>[x.frame,x]));let tracer=null,total=0;
    if(!emuLoadRomData(bytes,'recovery trace',0))break;
    tracer=T.install();
    try{await E.replay(bytes,path,{loaded:true,onFrame:()=>{tracer.endFrame();total++;const o=at.get(emu.frameCount);if(o&&!out.some(r=>r.observation===o.index)){const cap=tracer.capture(),an=T.analyze(cap,bytes);
      out.push({observation:o.index,frame:emu.frameCount,summary:an.summary,shown:an.shown,used:an.used,rows:an.rows.filter(r=>r.class!=='uniform').map(r=>({tile:r.tile,class:r.class,detail:r.detail,offsets:r.offsets||null,writable:!!r.writable,rewritten:!!r.rewritten,background:!!r.background,sprite:!!r.sprite,located:r.located||null,transform:r.transform||null})),
        writers:cap.writers.slice(0,16),batches:cap.batchesTotal,bankWrites:cap.bankWritesTotal,counts:cap.counts,truncated:cap.truncated});}if(total>maxFrames)throw Error('trace frame budget');}});}
    catch(e){out.push({error:String(e.message||e),path:path.length});}
    finally{tracer?.uninstall();}
  }
  return out;
}
function agent(){
  const nonce=window.name.slice(PREFIX.length);
  window.addEventListener('error',e=>{if(errors.length<20)errors.push(String(e.message||e.error||'error'));});
  window.addEventListener('unhandledrejection',e=>{if(errors.length<20)errors.push('unhandled: '+String(e.reason?.message||e.reason));});
  // the joypad reads the trial's input, nothing else, while a trial runs (outermost wrapper, like the frame-history scripts)
  const prevJoy=emuReadJoyState;emuReadJoyState=function(...args){return agentMask!==null?agentMask:prevJoy.apply(this,args);};
  services.EmulatorTimeline?.setEnabled?.(false);
  const send=m=>window.parent.postMessage({...m,nonce},'*');
  window.addEventListener('message',async event=>{
    if(event.source!==window.parent||!event.data||event.data.nonce!==nonce||!COMMANDS.includes(event.data.type))return;
    const m=event.data;
    if(m.type==='cancel'){cancelled.add(m.runId);return;}
    if(m.type==='release'){for(const l of m.labels||[]){checkpoints.get(l)?.handle.release();checkpoints.delete(l);}return;}
    if(m.type==='run'){if(busy){send({type:'result',runId:m.runId,outcome:'invalid',stopReason:'the sandbox is already running a trial'});return;}
      busy=true;try{send(await (m.request?.explore?runExplore:m.request?.job?runJob:runTrial)(m.runId,m.request,send));}finally{busy=false;}}
  });
  documentSha256().then(sha=>send({type:'ready',identity:{documentSha256:sha,engine:'NES Forge emulator, same build as the editor',mappers:[0],channels:contract.CHANNELS,jobs:true},errors:errors.slice()}));
}
services.ExperimentSandboxAgent=Object.freeze({inSandbox:()=>inSandbox});
services.ExperimentSandbox=Object.freeze({PREFIX,available,open,documentText,documentSha256,closeAll:()=>{for(const s of [...sessions])s.close('closed');},sessions:()=>sessions.size});
if(inSandbox)agent();
})();
