/* Audio investigation over physical PRG bytes and the existing runtime recorder.
 * Byte patterns, mapping hypotheses and executed observations remain distinct.
 * This service never installs a decoder or changes a project. */
(()=>{
'use strict';
const services=window.Forge.services,ops=FamiTone2DriverProfile.opcodes;
const LIMITS=Object.freeze({sourceBytes:8*1024*1024,scanBytes:1024*1024,writerSites:128,blockBytes:128,blockInstructions:48,decodeWork:262144,frames:120});
const copy=x=>JSON.parse(JSON.stringify(x));
const sha=bytes=>FamiTone2Native.sha256(bytes);
const hashText=text=>sha(Uint8Array.from(text,c=>c.charCodeAt(0)));
const isAPU=a=>a>=0x4000&&a<=0x4013&&a!==0x4009&&a!==0x400d||a===0x4015||a===0x4017;
const store=n=>['STA','STX','STY'].includes(n?.name);
const read=n=>['LDA','LDX','LDY','CMP','CPX','CPY','ADC','SBC','AND','ORA','EOR','BIT'].includes(n.name);
const abort=signal=>{if(signal?.aborted){const e=Error('Audio discovery cancelled.');e.name='AbortError';throw e;}};
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function input(bytes){if(!(bytes instanceof Uint8Array)||bytes.length<16||bytes.length>LIMITS.sourceBytes)throw Error('Audio discovery requires a ROM from 16 bytes through 8 MiB.');return bytes.slice();}
function decode(bytes,offset,end,pc){
 const spec=ops[bytes[offset]];if(!spec||offset+spec[2]>end)return null;
 const [name,mode,length]=spec;
 return {fileOffset:offset,pc,name,mode,length,operand:length>1?bytes[offset+1]+(length===3?bytes[offset+2]*256:0):null,bytes:Array.from(bytes.slice(offset,offset+length))};
}
function signature(nodes){
 const ram=nodes.filter(n=>['b','bx','by','ind'].includes(n.mode)&&n.operand<0x2000).map(n=>n.operand&2047).filter(a=>a>=256);
 const zp=nodes.filter(n=>['z','zx','zy','ix','iy'].includes(n.mode)).map(n=>n.operand).concat(nodes.filter(n=>['b','bx','by'].includes(n.mode)&&n.operand<256).map(n=>n.operand));
 const rb=ram.length?Math.min(...ram):0,zb=zp.length?Math.min(...zp):0;
 const tokens=nodes.map(n=>{
  let value='';if(n.length>1){
   if(['z','zx','zy','ix','iy'].includes(n.mode))value='zp+'+(n.operand-zb);
   else if(n.mode==='r')value='branch:'+(n.operand<128?n.operand:n.operand-256);
   else if(n.mode==='m')value='literal:'+n.operand;
   else if(n.operand<0x2000){const a=n.operand&2047;value=a<256?'zp+'+(a-zb):'ram+'+(a-rb);}
   else if(n.operand>=0x8000)value='prg-relative:'+(n.operand-n.pc);
   else value='fixed:'+n.operand;
  }return n.name+'/'+n.mode+'/'+value;
 });
 const grams=new Set();for(let i=0;i+3<tokens.length;i++)grams.add(hashText(tokens.slice(i,i+4).join('|')));
 return {fingerprint:hashText(tokens.join('\n')),grams:[...grams].sort(),instructions:nodes.length};
}
function compare(a,b){const x=new Set(a.grams),y=new Set(b.grams);let intersection=0;for(const g of x)if(y.has(g))intersection++;const union=x.size+y.size-intersection;return {score:union?intersection/union:0,intersection,union,identicalFingerprint:a.fingerprint===b.fingerprint};}
function block(bytes,anchor,prg,pc,work){
 // Only physical-local linear alignment is established here, never reachability.
 const pageStart=prg.start+Math.floor((anchor-prg.start)/8192)*8192,end=Math.min(prg.endExclusive,pageStart+8192,anchor+LIMITS.blockBytes);
 let chosen=[];
 for(let start=Math.max(pageStart,anchor-48);start<=anchor;start++){
  let p=start,nodes=[],hit=false;
  while(p<end&&nodes.length<LIMITS.blockInstructions){
   if(++work.decoded>LIMITS.decodeWork){work.partial=true;return chosen;}
   const n=decode(bytes,p,end,pc+p-anchor);if(!n)break;
   if(p>anchor&&!hit)break;nodes.push(n);if(p===anchor)hit=true;
   if(['BRK','RTI','RTS','JMP'].includes(n.name))break;p+=n.length;
  }
  if(hit&&nodes.length>chosen.length)chosen=nodes;
 }
 return chosen;
}
function leads(nodes,prg,mapper){
 const ram=[],tables=[],calls=[];
 for(const n of nodes){
  if(n.name==='JSR')calls.push({fileOffset:n.fileOffset,targetCPU:n.operand,status:'static-call-in-aligned-byte-block'});
  if(read(n)&&(['z','zx','zy','ix','iy'].includes(n.mode)||['b','bx','by'].includes(n.mode)&&n.operand<0x2000))ram.push({fileOffset:n.fileOffset,address:['z','zx','zy','ix','iy'].includes(n.mode)?n.operand:n.operand&2047,mode:n.mode,role:'RAM/stream-pointer lead; queue semantics unproven'});
  if(read(n)&&['bx','by'].includes(n.mode)&&n.operand>=0x8000){
   let fileOffset=null;if(mapper===0&&[16384,32768].includes(prg.length))fileOffset=prg.start+(n.operand-0x8000)%prg.length;
   tables.push({fileOffset:n.fileOffset,targetCPU:n.operand,targetFileOffset:fileOffset,mode:n.mode,status:fileOffset===null?'bank mapping unresolved':'header-derived NROM operand location',meaning:'Indexed PRG read; table type, extent and cue count unknown'});
  }
 }
 return {ram,tables,calls};
}
function matches(variants,references=services.AudioDiscoveryReferences?.profiles||[]){
 const ranked=[];for(const profile of references){let best=null;
  for(const ref of profile.blocks)for(const v of variants){const result=compare(v.signature,ref);if(!best||result.score>best.score||result.score===best.score&&result.intersection>best.intersection)best={...result,referenceWriterOffset:ref.writerFileOffset,hypothesizedPC:v.pc};}
  if(best?.intersection)ranked.push({profile:profile.id,label:profile.title,...best});
 }return ranked.sort((a,b)=>b.score-a.score||b.intersection-a.intersection).slice(0,3);
}
function writerContext(bytes,fileOffset,pc){
 const {layout}=services.REAnalysis.inspectContainer(bytes),prg=layout.prg;
 if(!prg||!Number.isInteger(fileOffset)||fileOffset<prg.start||fileOffset+3>prg.endExclusive||!Number.isInteger(pc)||pc<0x8000||pc>0xfffd)throw Error('Writer context needs a physical PRG location and CPU mapping.');
 const nodes=block(bytes,fileOffset,prg,pc,{decoded:0,partial:false});
 return {pc,nodes,signature:signature(nodes)};
}
async function scan(original,options={},controls={}){
 if(Object.keys(options).some(k=>k!=='name'))throw Error('Unknown audio scan option.');abort(controls.signal);
 const bytes=input(original),container=services.REAnalysis.inspectContainer(bytes),source={sha256:sha(bytes),byteLength:bytes.length,name:String(options.name||'ROM').slice(0,512)};
 const report={format:'NESForgeAudioDiscovery',version:1,modelVersion:'audio-discovery-1',status:'unavailable',source,header:container.header,layout:container.layout,limits:LIMITS,candidates:[],comparisons:[],decodeAuthorized:false,limitations:['Static APU-store patterns can occur in data or unreachable code. An aligned block is not a verified routine boundary.','Banked CPU addresses are hypotheses until executed observations establish the mapping.','Four-instruction similarity is uncalibrated ranking evidence, not an engine identity, probability or permission to decode.','Call, RAM and indexed-read leads do not establish queues, pointer-table extents, cue counts or instrument formats.','Only base APU stores are scanned. Indirect stores, self-modifying code and expansion audio can be missed.','Unvisited music/SFX and the full library size remain unknown.']};
 if(container.header.status!=='valid'||container.header.consoleType!==0||!container.layout.prg){report.reason='A valid ordinary NES container with a declared physical PRG region is required.';return report;}
 const prg=container.layout.prg,end=Math.min(prg.endExclusive,prg.start+LIMITS.scanBytes),work={scannedBytes:0,decoded:0,partial:end<prg.endExclusive};
 for(let offset=prg.start;offset+2<end;offset++){
  if((offset&4095)===0){abort(controls.signal);controls.progress?.({scannedBytes:offset-prg.start,totalBytes:end-prg.start});await pause();}
  work.scannedBytes=offset-prg.start+1;const n=decode(bytes,offset,end,0);if(!store(n)||!['b','bx','by'].includes(n.mode)||!isAPU(n.operand))continue;
  if(report.candidates.length===LIMITS.writerSites){work.partial=true;break;}
  const aliases=container.header.mapper===0&&[16384,32768].includes(prg.length)?(prg.length===16384?[0x8000+offset-prg.start,0xc000+offset-prg.start]:[0x8000+offset-prg.start]):[0x8000,0xa000,0xc000,0xe000].map(base=>base+(offset-prg.start)%8192);
  const variants=aliases.map(pc=>{const nodes=block(bytes,offset,prg,pc,work);return {pc,signature:signature(nodes),nodes};});
  const representative=variants[0],ranked=matches(variants),candidate={id:'writer-'+offset,fileOffset:offset,bytes:n.bytes,registerBase:n.operand,mode:n.mode,indexed:n.mode!=='b',evidence:'unexecuted-byte-pattern',mapping:container.header.mapper===0&&[16384,32768].includes(prg.length)?'header-derived NROM canonical mapping':'unresolved banked mapping',possibleCPUAddresses:aliases,blockStart:representative.nodes[0]?.fileOffset??offset,blockEndExclusive:representative.nodes.at(-1)?representative.nodes.at(-1).fileOffset+representative.nodes.at(-1).length:offset+3,block:representative.nodes,variants:variants.map(({pc,signature})=>({pc,signature})),leads:leads(representative.nodes,prg,container.header.mapper),matches:ranked};
  report.candidates.push(candidate);if(work.partial&&work.decoded>LIMITS.decodeWork)break;
 }
 abort(controls.signal);report.status=work.partial?'partial':'scanned';report.work=work;report.scannedRange={start:prg.start,endExclusive:Math.min(end,prg.start+work.scannedBytes+2)};
 report.comparisons=report.candidates.flatMap(c=>c.matches.map(m=>({...m,candidateId:c.id,candidateFileOffset:c.fileOffset}))).sort((a,b)=>b.score-a.score||b.intersection-a.intersection).slice(0,12);
 return report;
}
function observe(report,runtime=services.RERuntime){
 if(!report?.source||!Array.isArray(report.candidates))throw Error('Scan this ROM first.');
 const current=runtime.status(),audio=runtime.audioDriverReport();if(!audio.identity||audio.identity.sha256!==report.source.sha256)throw Error('Runtime observations belong to another ROM or have no verified source identity. Record a new window.');
 const coverage=[];for(let offset=0;;offset+=256){const p=runtime.coverage({offset,limit:256});coverage.push(...p.results);if(p.nextOffset===null)break;if(coverage.length>4096)throw Error('Runtime coverage exceeds its declared bound.');}
 const bytes=runtime.getROMSnapshot().bytes;if(sha(bytes)!==report.source.sha256)throw Error('Loaded ROM changed.');
 const writers=audio.writers.map(w=>{
  const mapped=Number.isInteger(w.fileOffset),prg=report.layout.prg,verified=mapped&&w.fileOffset>=prg.start&&w.fileOffset+w.bytes.length<=prg.endExclusive&&w.bytes.length>0&&w.bytes.every((b,i)=>bytes[w.fileOffset+i]===b);
  const complete=verified&&w.sourceLength>=(ops[w.opcode]?.[2]??4)&&w.pc<=0xfffd;
  const context=complete?writerContext(bytes,w.fileOffset,w.pc):null;
  const candidate=context?{id:'writer-'+w.fileOffset,blockStart:context.nodes[0]?.fileOffset??w.fileOffset,variants:[context],leads:leads(context.nodes,prg,report.header.mapper)}:null;
  const callers=coverage.filter(n=>n.opcode===0x20&&n.bytes.length>=3&&candidate&&((n.bytes[1]|n.bytes[2]<<8)>=w.pc+(candidate.blockStart-w.fileOffset))&&((n.bytes[1]|n.bytes[2]<<8)<=w.pc)).slice(0,64).map(n=>({fileOffset:n.fileOffset,pc:n.pc,targetCPU:n.bytes[1]|n.bytes[2]<<8,count:n.count,meaning:'Executed JSR operand points into this candidate block; target physical bank and call relationship are not established.'}));
  return {...w,evidence:complete?'observed-source-verified':verified?'observed-source-fragment':mapped?'source-mismatch':'observed-unmapped',contextEvidence:'The writer anchor executed; surrounding block alignment and semantic leads remain static',candidateId:candidate?.id||null,callers,matches:candidate?matches(candidate.variants.filter(v=>v.pc===w.pc)):[],leads:candidate?.leads||{ram:[],tables:[],calls:[]}};
 });
 if(runtime.status().epoch!==current.epoch)throw Error('Runtime session changed while observations were being inspected.');
 return {...copy(report),observation:{epoch:current.epoch,identity:audio.identity,trace:audio.trace,summary:audio.summary,writers,registers:audio.registers,channels:audio.channels,noise:audio.noise,dmc:audio.dmc},decodeAuthorized:false};
}
let captureBusy=false;
async function capture(report,options={},controls={}){
 if(captureBusy)throw Error('An audio recording is already running.');
 if(Object.keys(options).some(k=>!['frames','fromReset'].includes(k)))throw Error('Unknown recording option.');
 const frames=options.frames??60,fromReset=options.fromReset??false;if(!Number.isInteger(frames)||frames<1||frames>LIMITS.frames||typeof fromReset!=='boolean')throw Error('Record 1–120 frames and choose whether to reset.');
 abort(controls.signal);if(services.EmulatorTimeline.status().busy)throw Error('Wait for frame navigation to finish.');if(services.RERuntime.status().tracing)throw Error('Stop the existing runtime trace before recording another window.');
 const snapshot=services.RERuntime.getROMSnapshot();if(sha(snapshot.bytes)!==report?.source?.sha256)throw Error('Loaded ROM changed. Scan it again.');
 captureBusy=true;let epoch=null,executed=0;
 try{
  services.EmulatorBridge.pause();abort(controls.signal);
  // A cancelled pending digest must not reset the game when it later resolves.
  await services.RERuntime.identify();abort(controls.signal);
  if(services.RERuntime.status().epoch!==snapshot.epoch)throw Error('Runtime session changed before recording could start.');
  const started=await services.RERuntime.start({mode:'audio',fromReset});epoch=started.epoch;
  for(;executed<frames;){abort(controls.signal);const state=services.RERuntime.status();if(state.epoch!==epoch)throw Error('Runtime session changed during recording.');if(!state.tracing)break;
   const frame=emu.frameCount;services.EmulatorBridge.step();if(emu.frameCount<=frame)throw Error('Emulation stopped before completing a frame. See the emulator diagnostic.');executed++;controls.progress?.({frame:executed,total:frames});await pause();
  }
  if(services.RERuntime.status().epoch!==epoch)throw Error('Runtime session changed during recording.');
  if(services.RERuntime.status().tracing)services.RERuntime.stop('Audio recording finished its '+executed+'-frame window.');
  const result=observe(report);result.observation.recording={requestedFrames:frames,executedFrames:executed,fromReset};return result;
 }finally{if(epoch!==null&&services.RERuntime.status().epoch===epoch&&services.RERuntime.status().tracing)services.RERuntime.stop('Audio recording cancelled or interrupted.');captureBusy=false;}
}
services.AudioDiscovery=Object.freeze({scan,observe,capture,writerContext,signature,compare,limits:LIMITS,version:1});
})();
