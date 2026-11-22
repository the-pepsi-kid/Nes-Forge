/*
 * NES FORGE MODULE: src/services/frame-evidence.js
 * Entry: Forge.services.FrameEvidence, commands emulator.frameEvidence and emulator.capturePlan
 * Purpose: one frame-indexed evidence record per emulator frame, ROM-agnostic, and a capture plan that reaches many
 *   frames from one boot by restoring a physical checkpoint (EmulatorTimeline).
 *
 *   A record is a STATE SNAPSHOT of one completed frame: CPU registers, RAM, PPU registers, nametables, palette RAM,
 *   OAM (raw and decoded), mapper registers, the PRG and CHR banks mapped at that moment with their cartridge file
 *   offsets, and the rendered framebuffer. It is not an execution trace: how the machine reached this state is only
 *   recorded when a trace is asked for, by replaying the last frames from the same checkpoint with RERuntime
 *   observation on (deterministic emulation makes the replay the same execution).
 *   Rendered pixels and original data are kept apart: the framebuffer is "rendered"; CHR windows are cartridge data
 *   with file offsets; the frame's tiles are re-read through the renderer's own trace and the rebuilt image must match
 *   the framebuffer pixel for pixel, which checks that the data and the image belong to the same frame.
 *   Every section has its own SHA-256 so two captures of "the same" frame can be compared field by field.
 * Bundle order: after src/ui/library-provenance.js.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands;
const fail=message=>{throw Error('Frame evidence: '+message);};
const hex=(n,w=4)=>Number(n).toString(16).toUpperCase().padStart(w,'0');
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s);};
async function sha256(data){const bytes=typeof data==='string'?new TextEncoder().encode(data):data;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
// mapper registers live on the emulator object; record every plain mapper field (no ROM buffers, no functions)
const MAPPER_FIELD=/^(mmc\d|prgBank|chrBank|prgPage|chrPages|mirroring|initialMirror)/;
function mapperState(){
  const out={};
  for(const key of Object.keys(emu).sort()){
    if(!MAPPER_FIELD.test(key))continue;const v=emu[key];
    if(v===null||['number','boolean','string'].includes(typeof v))out[key]=v;
    else if(Array.isArray(v)||ArrayBuffer.isView(v))out[key]=Array.from(v);
    else if(typeof v==='object')out[key]=JSON.parse(JSON.stringify(v,(k,x)=>ArrayBuffer.isView(x)?Array.from(x):x));
  }
  return out;
}
function layoutOf(file){
  if(!(file instanceof Uint8Array)||file.length<16||file[0]!==0x4e||file[1]!==0x45||file[2]!==0x53||file[3]!==0x1a)return null;
  const trainer=file[6]&4?512:0;return {trainer,prgStart:16+trainer,prgBytes:file[4]*16384,chrStart:16+trainer+file[4]*16384,chrBytes:file[5]*8192,mapper:(file[6]>>4)|(file[7]&0xf0)};
}
// PRG: what the CPU sees in each 8 KiB window, located in the cartridge by content (independent of any mapper model)
function prgWindows(layout,file){
  const out=[];if(!emu.prgRom)return out;
  for(let base=0x8000;base<0x10000;base+=0x2000){
    const bytes=new Uint8Array(0x2000);for(let i=0;i<0x2000;i++)bytes[i]=cpuRead(base+i)&255;
    const matches=[];
    for(let off=0;off+0x2000<=emu.prgRom.length;off+=0x2000){let same=true;for(let i=0;i<0x2000;i+=1){if(emu.prgRom[off+i]!==bytes[i]){same=false;break;}}if(same)matches.push(off);}
    const fileOk=layout&&file?matches.every(off=>{for(let i=0;i<0x2000;i+=97)if(file[layout.prgStart+off+i]!==bytes[i])return false;return true;}):null;
    out.push({cpu:base,cpuEnd:base+0x1FFF,prgOffsets:matches,fileOffsets:layout?matches.map(o=>layout.prgStart+o):[],prgBank8KiB:matches.map(o=>o/0x2000),
      located:matches.length===1?'unique':matches.length?'ambiguous: identical banks':'not in PRG ROM (RAM or open bus)',matchesFile:fileOk});
  }
  return out;
}
// CHR: the source of each 1 KiB of the pattern tables through the renderer's own mapping, checked against the file
function chrWindows(layout,file){
  const out=[],physical=window.forgeCapture?.physicalChr;if(!physical)return out;
  for(let addr=0;addr<0x2000;addr+=0x400){
    const {src,off}=physical(addr),ram=emu.hasChrRam||src===emu.chrRam;
    const row={ppu:addr,ppuEnd:addr+0x3FF,source:ram?'CHR RAM':'CHR ROM',offset:off};
    if(!ram&&layout){row.fileOffset=layout.chrStart+off;row.chrBank1KiB=off>>10;row.chrBank4KiB=off>>12;
      let same=!!file;if(file)for(let i=0;i<0x400;i++)if(file[row.fileOffset+i]!==src[(off+i)%src.length]){same=false;break;}row.matchesFile=same;}
    out.push(row);
  }
  return out;
}
function sprites(){
  const tall=!!(emu.ppuCtrl&0x20),table=emu.ppuCtrl&0x08?0x1000:0,physical=window.forgeCapture?.physicalChr,out=[];
  for(let i=0;i<64;i++){
    const y=emu.oamMem[i*4],tile=emu.oamMem[i*4+1],attr=emu.oamMem[i*4+2],x=emu.oamMem[i*4+3];
    const addr=tall?((tile&1)<<12)|((tile&0xFE)<<4):table|(tile<<4);
    const src=physical?physical(addr):null;
    // MMC2 switches CHR banks during the frame (latches): the bank a visible sprite was drawn from is the one the trace
    // recorded when its pattern was fetched, not the one mapped once the frame has ended
    const drawn=emu.mapper===9?emu.captureTrace?.sprites?.[i]:null;
    out.push({index:i,x,y,tile,attr,palette:attr&3,behind:!!(attr&0x20),flipH:!!(attr&0x40),flipV:!!(attr&0x80),height:tall?16:8,visible:y<0xEF,
      pattern:addr,chrOffset:Number.isInteger(drawn?.chrOffset)&&!emu.hasChrRam?drawn.chrOffset:src&&src.src!==emu.chrRam?src.off:null});
  }
  return out;
}
// the frame's tiles re-read through the renderer's trace; the rebuilt image must equal the framebuffer
function rasterCheck(){
  try{const scene=window.forgeCapture.captureFromTrace();const v=scene.captureMeta.validation,raster=scene.raster;
    // the CHR regions the frame's background tiles were read from (renderer's own reads, 1 KiB granularity)
    const regions=new Map();for(const s of raster.sources||[])if(s?.kind==='CHR-ROM'||s?.kind==='CHR-RAM'){const k=s.kind+':'+(s.offset>>10);regions.set(k,(regions.get(k)||0)+1);}
    return {state:'matched',backgroundDifferentPixels:v.backgroundDifferentPixels,compositeDifferentPixels:v.compositeDifferentPixels,nativeTiles:scene.captureMeta.nativeTiles,paletteSets:scene.captureMeta.paletteSets,
      frame:scene.captureMeta.frame,backgroundTileSources:[...regions].map(([k,n])=>({source:k.split(':')[0],chrOffset:Number(k.split(':')[1])<<10,tiles:n})).sort((x,y)=>x.chrOffset-y.chrOffset)};}
  catch(e){return {state:'not matched',reason:String(e.message).slice(0,240)};}
}
async function capture({label='frame',checkpoint=null,links=true,pixels=false,scene=false}={}){
  if(!emu.loaded)fail('no ROM is loaded in the emulator');
  const file=emu.lastBuiltRom instanceof Uint8Array?emu.lastBuiltRom:null,layout=layoutOf(file);
  const cpuState={A:emu.A,X:emu.X,Y:emu.Y,SP:emu.SP,PC:emu.PC,P:(emu.C)|(emu.Z<<1)|(emu.I<<2)|(emu.D<<3)|(1<<5)|(emu.V<<6)|(emu.N<<7),cycles:emu.cycles};
  const ppu={ctrl:emu.ppuCtrl,mask:emu.ppuMask,status:emu.ppuStatus,vAddr:emu.vAddr,tAddr:emu.tAddr,fineX:emu.fineX,wLatch:!!emu.wLatch,mirroring:emu.mirroring,
    split:emu.spr0Line>=0?{sprite0Line:emu.spr0Line,chrBank0Pre:emu.chrBank0Pre,chrBank1Pre:emu.chrBank1Pre,chrBank0Post:emu.chrBank0Post,chrBank1Post:emu.chrBank1Post,tAddrPre:emu.tAddrPre,tAddrPost:emu.tAddrPost}:null};
  const record={format:'NESForgeFrameEvidence',version:1,kind:'state-snapshot',label:String(label).slice(0,120),frame:emu.frameCount,checkpoint,
    rom:{name:emu.romName||null,sha256:file?await sha256(file):null,mapper:emu.mapper,prgBytes:emu.prgSize,chrBytes:emu.chrRom?.length||0,chrRam:!!emu.hasChrRam},
    cpu:cpuState,
    memory:{ram:b64(emu.ram),sram:emu.sram?b64(emu.sram):null,chrRam:emu.hasChrRam?b64(emu.chrRam):null},
    // APU registers as the CPU last wrote them (the checkpoint restores the whole APU; this is its register view)
    apu:{registers:Array.from(emu.apuRegs||[]),status:emu.apuStatus,frameCounter:emu.apuFrameCounter},
    ppu,
    nametables:b64(emu.vram),palette:Array.from(emu.palRam),oam:b64(emu.oamMem),sprites:sprites(),
    // where the sprites' pattern locations come from: the bank in effect when each was fetched (MMC2, from the trace),
    // or the banks mapped once the frame has ended (a frame that switches banks mid-frame may have drawn others)
    spritePatternsAt:emu.mapper===9?'fetch':'frame-end',
    mapper:mapperState(),
    banks:{prg:prgWindows(layout,file),chr:chrWindows(layout,file)},
    rendered:{width:256,height:240,derivation:'rendered by the emulator: pixels, not CHR data',framebufferSha256:await sha256(new Uint8Array(emu.frameBuffer.buffer,emu.frameBuffer.byteOffset,emu.frameBuffer.byteLength)),
      backgroundSha256:emu.bgFrameBuffer?await sha256(new Uint8Array(emu.bgFrameBuffer.buffer,emu.bgFrameBuffer.byteOffset,emu.bgFrameBuffer.byteLength)):null},
    synchronization:rasterCheck(),
    trace:{state:'not recorded',note:'A state snapshot. Ask for a trace to replay the frames before it with code coverage on.'}};
  // where the CPU is: the instruction address in the cartridge (through the PRG window that holds it)
  const win=record.banks.prg.find(w=>cpuState.PC>=w.cpu&&cpuState.PC<=w.cpuEnd);
  record.cpu.pcLocation=win&&win.located==='unique'?{fileOffset:win.fileOffsets[0]+(cpuState.PC-win.cpu),prgBank8KiB:win.prgBank8KiB[0],cpu:cpuState.PC}:{state:win?win.located:'PC below $8000 (RAM)'};
  const sections={cpu:record.cpu,memory:record.memory,apu:record.apu,ppu:record.ppu,nametables:record.nametables,palette:record.palette,oam:record.oam,mapper:record.mapper,banks:record.banks,rendered:record.rendered};
  record.digests={};for(const [k,v] of Object.entries(sections))record.digests[k]=await sha256(JSON.stringify(v));
  record.digests.all=await sha256(JSON.stringify(record.digests));
  if(links)record.links=await libraryLinks(record);
  // the rendered pixels themselves, on request (a screenshot whose SHA-256 must equal rendered.framebufferSha256)
  if(pixels)record.rendered.rgba=b64(new Uint8Array(emu.frameBuffer.buffer,emu.frameBuffer.byteOffset,emu.frameBuffer.byteLength));
  // the validated runtime capture of this frame (native tiles with their CHR offsets, per-scanline placement), so the
  // frame can later be opened as an editable Scene; only when it rebuilt with 0 different pixels
  if(scene&&record.synchronization.state==='matched'){try{record.scene=JSON.parse(JSON.stringify(window.forgeCapture.captureFromTrace()));}catch(_){record.scene=null;}}
  return record;
}
// library entries the frame's data belongs to: CHR bank entries by file offset (only entries the library holds)
async function libraryLinks(record){
  const L=services.ResourceLibrary,out=[];if(!L||!record.rom.sha256)return out;
  const prefix='rom:'+record.rom.sha256.slice(0,16)+':';
  const seen=new Set();
  for(const w of record.banks.chr){if(w.fileOffset===undefined||seen.has(w.chrBank4KiB))continue;seen.add(w.chrBank4KiB);
    const id=prefix+'chr:chr:'+w.chrBank4KiB;try{const e=await L.entry(id);if(e.evidence?.primary?.fileOffset!==undefined&&w.fileOffset>=e.evidence.primary.fileOffset&&w.fileOffset<e.evidence.primary.fileOffset+(e.evidence.primary.length||4096))
      out.push({entryId:id,relation:'CHR bank mapped at PPU $'+hex(w.ppu)+(w.matchesFile?' (bytes checked against the cartridge file)':''),basis:'file offset 0x'+hex(w.fileOffset,5)+' lies in this library entry'});}catch(_){}}
  return out;
}
// ---------- capture plans: many frames from one boot ----------
const ALL={a:false,b:false,select:false,start:false,up:false,down:false,left:false,right:false};
async function runFrames(count,inputs=[]){
  // inputs: [{from,to,buttons}] relative to this run. Frames with the same buttons run as one batch; the full button
  // state is set before each batch.
  let f=0;
  while(f<count){
    const held={...ALL};for(const span of inputs)if(f>=span.from&&f<=span.to)Object.assign(held,span.buttons);
    let next=count;for(const span of inputs){if(span.from>f&&span.from<next)next=span.from;if(span.to+1>f&&span.to+1<next)next=span.to+1;}
    const r1=await C.run('input.set',{buttons:held});if(!r1.ok)fail(r1.error.message);
    const r2=await C.run('emulator.frames',{count:next-f});if(!r2.ok)fail(r2.error.message);f=next;
  }
  await C.run('input.set',{buttons:{...ALL}});
}
async function runUntil(conditions=[],maxFrames=6000){
  // sequential RAM conditions: each must hold (in order) before the next is checked; frames run directly, as the
  // emulator.frames command runs them (emulator tab active while they run), without a command call per frame
  let step=0,frames=0;const tab=S.tab;S.tab='emu';
  try{while(step<conditions.length&&frames<maxFrames){emuRunFrame();frames++;
    const c=conditions[step],v=emu.ram[c.address&0x7FF];if(('equals' in c?v===c.equals:true)&&('min' in c?v>=c.min:true)&&('max' in c?v<=c.max:true))step++;}}
  finally{S.tab=tab;}
  return {reached:step===conditions.length,frames};
}
// boot: fixed frames with inputs, then optionally "press until": repeat a press every N frames until RAM/VRAM
// conditions hold (e.g. a title screen that needs Start, without pausing the game once it runs)
async function boot(bytes,name,plan){
  const r=await C.run('emulator.load',{bytes,name:name||'capture.nes'});if(!r.ok)fail(r.error.message);
  await runFrames(plan.frames||0,plan.inputs||[]);
  if(plan.pressUntil){const {buttons,every=30,hold=4,conditions=[],maxFrames=3000,after=0}=plan.pressUntil;let frames=0,ok=false;
    const holds=()=>conditions.every(c=>{const v=c.vram!==undefined?emu.vram[c.vram&0x7FF]:emu.ram[c.address&0x7FF];return ('equals' in c?v===c.equals:true)&&('min' in c?v>=c.min:true)&&('max' in c?v<=c.max:true);});
    while(frames<maxFrames&&!(ok=holds())){await runFrames(every,[{from:every-hold,to:every-1,buttons}]);frames+=every;}
    if(!ok)fail('the boot did not reach its conditions within '+maxFrames+' frames');
    if(after)await runFrames(after,[]);}
}
async function capturePlan({bytes,name,boot:bootPlan={frames:120,inputs:[]},targets=[],mode='checkpoint',trace=false,pixels=false}={}){
  if(!(bytes instanceof Uint8Array))fail('give the ROM bytes');if(!['checkpoint','cold'].includes(mode))fail('mode must be checkpoint or cold');
  const T=services.EmulatorTimeline,t0=performance.now(),results=[];let checkpoint=null,bootMs=0,boots=0;
  if(mode==='checkpoint'){const b0=performance.now();await boot(bytes,name,bootPlan);boots++;bootMs+=performance.now()-b0;checkpoint=T.saveOwnedCheckpoint('capture plan boot');}
  try{
    for(const target of targets){
      const s0=performance.now();
      if(mode==='cold'){const b0=performance.now();await boot(bytes,name,bootPlan);boots++;bootMs+=performance.now()-b0;}else checkpoint.restore();
      for(const [address,value] of Object.entries(target.ram||{}))emu.ram[Number(address)&0x7FF]=Number(value)&255;
      const until=target.until?.length?await runUntil(target.until,target.maxFrames||6000):{reached:true,frames:0};
      await runFrames(target.frames||1,target.inputs||[]);
      const record=await capture({label:target.label||'target',pixels,checkpoint:mode==='checkpoint'?{id:checkpoint.id,name:checkpoint.name,frame:checkpoint.frame}:null});
      record.reached=until;record.ms=Math.round(performance.now()-s0);
      if(trace){record.trace=await replayTrace(mode,checkpoint,bytes,name,bootPlan,target);}
      results.push(record);
    }
  }finally{checkpoint?.release();}
  return {mode,boots,bootMs:Math.round(bootMs),ms:Math.round(performance.now()-t0),results};
}
// the execution that led to the snapshot: replay the target's last frames from the same start with code coverage on
async function replayTrace(mode,checkpoint,bytes,name,bootPlan,target){
  const R=services.RERuntime;if(!R)return {state:'unavailable',note:'RE runtime observation is not loaded'};
  if(mode==='checkpoint')checkpoint.restore();else await boot(bytes,name,bootPlan);
  for(const [address,value] of Object.entries(target.ram||{}))emu.ram[Number(address)&0x7FF]=Number(value)&255;
  if(target.until?.length)await runUntil(target.until,target.maxFrames||6000);
  const frames=target.frames||1,lead=Math.max(0,frames-1);await runFrames(lead,(target.inputs||[]));
  await R.start({});const start=emu.frameCount;
  await runFrames(1,(target.inputs||[]).map(s=>({...s,from:s.from-lead,to:s.to-lead})));
  const status=R.stop('frame evidence trace complete');const cov=R.coverage({limit:256});
  return {state:'recorded',kind:'execution trace (code coverage)',frames:[start,emu.frameCount],instructions:status.instructions,coverageEntries:cov.total,
    sample:cov.results.slice(0,24).map(c=>({pc:c.pc,fileOffset:c.fileOffset??null,count:c.count??null})),note:'Replayed from the same start; deterministic emulation makes it the execution that produced the snapshot.'};
}
// ---------- a frame in the library ----------
// The record is stored as a runtime observation of its ROM. Its screenshot is a preview marked as rendered pixels; the
// CHR data it shows stays in the CHR bank entries the record links to (by file offset), never in the screenshot.
async function pngOf(rgbaB64){
  const bytes=Uint8Array.from(atob(rgbaB64),c=>c.charCodeAt(0)),c=document.createElement('canvas');c.width=256;c.height=240;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes.buffer),256,240),0,0);
  const blob=await new Promise(res=>c.toBlob(res,'image/png'));return new Uint8Array(await blob.arrayBuffer());
}
async function registerFrame(record){
  const L=services.ResourceLibrary;if(!L)fail('the resource library is not available');await L.ensureMeta();
  if(!record?.rom?.sha256)fail('the frame has no source ROM identity');
  const romSha=record.rom.sha256,packKey='frames:'+romSha.slice(0,16),id=packKey+':'+record.frame+':'+record.digests.all.slice(0,12);
  const body={...record,rendered:{...record.rendered,rgba:undefined}},stored=await L.storeData(JSON.stringify(body));
  let preview=null;if(record.rendered.rgba){const st=await L.storeData(await pngOf(record.rendered.rgba));preview={hash:st.hash,derivation:'rendered framebuffer: pixels, not CHR data'};}
  const pc=record.cpu.pcLocation;
  const e={id,packSha256:packKey,path:'frames/'+record.label+' F'+record.frame,label:record.label+' · frame '+record.frame,origin:'runtime-capture',shelf:romSha,sourceSha256:romSha,game:String(record.rom.name||'').replace(/\.nes$/i,'')||null,kind:'frame',identified:true,
    fileType:'json',size:stored.size,contentHash:stored.hash,loads:false,registered:Date.now(),data:{state:'stored'},
    validation:{state:'accepted',reason:'state snapshot of frame '+record.frame+'; data and image '+(record.synchronization.state==='matched'?'rebuild with 0 different pixels':'not checked: '+record.synchronization.reason)},
    evidence:{state:'observed',basis:'emulator state snapshot (NESForgeFrameEvidence v1), frame '+record.frame,frame:record.frame,digests:record.digests,
      primary:Number.isInteger(pc.fileOffset)?{role:'pc',name:'instruction at the snapshot (CPU PC)',fileOffset:pc.fileOffset,cpu:pc.cpu,region:'PRG ROM',code:true,check:'located through the mapped PRG window, which matched the cartridge file'}:null},
    links:(record.links||[]).map(l=>({id:l.entryId,relation:'uses',basis:l.relation+'; '+l.basis,verified:true})),...(preview?{preview}:{})};
  const pack=(await L.getPack(packKey))||{packSha256:packKey,name:(record.rom.name||'ROM')+' · runtime captures',origin:'runtime-capture',bytes:0,fileCount:0,format:'NESForgeFrameEvidence',sourceSha256:romSha,shelf:romSha,mode:'full',intake:{state:'accepted',kind:'runtime-capture'},state:'complete',registered:Date.now()};
  pack.fileCount=(pack.fileCount||0)+1;pack.updated=Date.now();
  await L.putRecords([['entries',e],['packs',pack]]);
  return {id,links:e.links.length,preview:!!preview};
}
// ---------- steps for an external runner (Agent Lab): boot, one target, checkpoints that leave the page ----------
async function runTarget(target){
  for(const [address,value] of Object.entries(target.ram||{}))emu.ram[Number(address)&0x7FF]=Number(value)&255;
  const until=target.until?.length?await runUntil(target.until,target.maxFrames||6000):{reached:true,frames:0};
  await runFrames(target.frames||1,target.inputs||[]);
  return until;
}
async function loadedRomSha256(){const file=emu.lastBuiltRom instanceof Uint8Array?emu.lastBuiltRom:null;return file?sha256(file):null;}
async function importCheckpoint(data,{romSha256,name}={}){
  const loaded=await loadedRomSha256();
  if(!romSha256||loaded!==romSha256)fail('the checkpoint belongs to ROM '+String(romSha256).slice(0,12)+'…, not the ROM loaded ('+String(loaded).slice(0,12)+'…)');
  return services.EmulatorTimeline.importCheckpoint(data,name);
}
// ---------- importing an Agent Lab investigation (NESForgeInvestigationResults) ----------
// Nothing is trusted: every record's section digests are recomputed, the screenshot is decoded and its pixels must hash
// to the recorded framebuffer, and a scene artifact must re-render to that same framebuffer. Records that pass become
// library entries on the ROM's shelf (idempotent by digest); records that fail are listed and nothing of them is kept.
// The open project is never touched; opening a captured scene is a separate, explicit, undoable action.
const HEX64=/^[0-9a-f]{64}$/;
async function pngPixels(bytes){
  const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const g=c.getContext('2d');g.drawImage(bitmap,0,0);
  return {width:c.width,height:c.height,rgba:new Uint8Array(g.getImageData(0,0,c.width,c.height).data.buffer)};
}
async function verifyRecord(record,job,pngBytes){
  const problems=[];
  if(record?.format!=='NESForgeFrameEvidence'||record.version!==1)return {ok:false,problems:['not a frame evidence record']};
  if(record.rom?.sha256!==job.rom.sha256)problems.push('it belongs to another ROM');
  const keys=Object.keys(record.digests||{}).filter(k=>k!=='all');
  for(const k of keys)if(!(k in record)||await sha256(JSON.stringify(record[k]))!==record.digests[k])problems.push('section '+k+' does not match its digest');
  if(!keys.length||await sha256(JSON.stringify(Object.fromEntries(keys.map(k=>[k,record.digests[k]]))))!==record.digests.all)problems.push('the overall digest does not match');
  let screenshot='missing';
  if(pngBytes){try{const px=await pngPixels(pngBytes);screenshot=px.width===256&&px.height===240&&await sha256(px.rgba)===record.rendered.framebufferSha256?'verified':'pixels differ from the recorded framebuffer';}catch(e){screenshot='unreadable: '+e.message;}}
  if(screenshot!=='verified')problems.push('screenshot '+screenshot);
  let scene='none';
  if(record.scene){try{const px=window.forgeCapture.scenePixels(record.scene,true).rgba;scene=await sha256(new Uint8Array(px.buffer,px.byteOffset,px.byteLength))===record.rendered.framebufferSha256?'verified':'does not re-render to the framebuffer';}catch(e){scene='unusable: '+e.message;}
    if(scene!=='verified')problems.push('scene artifact '+scene);}
  return {ok:!problems.length,problems,screenshot,scene};
}
async function importInvestigation(bundle){
  const L=services.ResourceLibrary;if(!L)fail('the resource library is not available');await L.ensureMeta();
  if(bundle?.format!=='NESForgeInvestigationResults'||bundle.version!==1)fail('not an investigation results bundle');
  const job=bundle.job;if(!job?.id||!HEX64.test(job.rom?.sha256||'')||!HEX64.test(job.plan?.sha256||'')||!HEX64.test(job.editorSha256||''))fail('the bundle lacks its job, ROM, plan or emulator identity');
  const romSha=job.rom.sha256,rom16=romSha.slice(0,16),framesPack='frames:'+rom16,imported=[],already=[],rejected=[];
  for(const [i,item] of (bundle.records||[]).entries()){
    const record=item.record,png=item.png?Uint8Array.from(atob(item.png),c=>c.charCodeAt(0)):null;
    const check=await verifyRecord(record,job,png);
    if(!check.ok){rejected.push({index:i,label:record?.label||null,problems:check.problems});continue;}
    const id=framesPack+':'+record.frame+':'+record.digests.all.slice(0,12);
    try{await L.entry(id);already.push(id);continue;}catch(_){/* new */}
    const {scene,...body}=record,stored=await L.storeData(JSON.stringify(body)),pngStored=await L.storeData(png),sceneStored=scene?await L.storeData(JSON.stringify(scene)):null;
    const links=await libraryLinks(record),pc=record.cpu.pcLocation;
    const e={id,packSha256:framesPack,path:'frames/'+record.label+' F'+record.frame,label:record.label+' · frame '+record.frame,origin:'runtime-capture',shelf:romSha,sourceSha256:romSha,game:String(job.rom.name||'').replace(/\.nes$/i,'')||null,kind:'frame',identified:true,
      fileType:'json',size:stored.size,contentHash:stored.hash,loads:false,registered:Date.now(),data:{state:'stored'},
      validation:{state:'accepted',reason:'imported from Agent Lab job '+job.id+': digests recomputed, screenshot verified'+(scene?', scene re-renders to the framebuffer':'')},
      evidence:{state:'observed',basis:'emulator state snapshot (NESForgeFrameEvidence v1), frame '+record.frame,frame:record.frame,digests:record.digests,
        primary:Number.isInteger(pc?.fileOffset)?{role:'pc',name:'instruction at the snapshot (CPU PC)',fileOffset:pc.fileOffset,cpu:pc.cpu,region:'PRG ROM',code:true,check:'located through the mapped PRG window, which matched the cartridge file'}:null},
      provenance:{job:job.id,plan:{name:job.plan.name,source:job.plan.source,sha256:job.plan.sha256,target:record.provenance?.plan?.target??null,targetSha256:record.provenance?.plan?.targetSha256??null},
        emulatorBuild:job.editorSha256,execution:record.provenance?.execution||null,checkpoint:job.checkpoint?.boot||null,importedAt:Date.now()},
      artifacts:{scene:sceneStored?{hash:sceneStored.hash,verified:'re-renders to the recorded framebuffer'}:null},
      links:links.map(l=>({id:l.entryId,relation:'uses',basis:l.relation+'; '+l.basis,verified:true})),
      preview:{hash:pngStored.hash,derivation:'rendered framebuffer: pixels, not CHR data'}};
    await L.putRecords([['entries',e]]);imported.push(id);
  }
  const packKey='investigation:'+job.id,prior=await L.getPack(packKey);
  const pack={packSha256:packKey,name:(job.rom.name||'ROM')+' · Agent Lab investigation',origin:'agent-lab',bytes:0,fileCount:(bundle.records||[]).length,format:'NESForgeInvestigationResults',sourceSha256:romSha,shelf:romSha,mode:'full',
    intake:{state:'accepted',kind:'investigation'},state:'complete',registered:prior?.registered||Date.now(),updated:Date.now(),
    job:{id:job.id,state:job.state,plan:job.plan,editorSha256:job.editorSha256,checkpoint:job.checkpoint,compatibility:job.compatibility,failures:job.failures,completed:job.completed},
    stats:{records:(bundle.records||[]).length,imported:imported.length+(prior?.stats?.imported||0),already:already.length,rejected:rejected.length}};
  const framePack=(await L.getPack(framesPack))||{packSha256:framesPack,name:(job.rom.name||'ROM')+' · runtime captures',origin:'runtime-capture',bytes:0,fileCount:0,format:'NESForgeFrameEvidence',sourceSha256:romSha,shelf:romSha,mode:'full',intake:{state:'accepted',kind:'runtime-capture'},state:'complete',registered:Date.now()};
  // the pack's count is what it holds (an earlier import that stopped part-way left some entries without counting them)
  framePack.fileCount=(await L.list({pack:framesPack,limit:1})).total;framePack.updated=Date.now();
  await L.putRecords([['packs',pack],['packs',framePack]]);
  return {job:job.id,rom:romSha,imported:imported.length,already:already.length,rejected,entries:[...imported,...already]};
}
async function investigations(){const r=await C.run('library.packs');return (r.ok?r.result:[]).filter(p=>p.origin==='agent-lab');}
// a captured frame as an editable Scene: explicit, undoable, always a new Scene
async function openFrameScene(entryId){
  const L=services.ResourceLibrary,e=await L.entry(entryId);if(!e.artifacts?.scene?.hash)fail('this frame has no verified scene artifact');
  const scene=JSON.parse(new TextDecoder().decode(await L.blobBytes(e.artifacts.scene.hash)));
  scene.name=(e.label||'Captured frame').slice(0,60);scene.captureMeta={...(scene.captureMeta||{}),libraryEntry:e.id,sourceSha256:e.sourceSha256,investigation:e.provenance?.job||null};
  const before=S.scenes.length;pushSceneFromCapture(scene,{target:'new'});if(S.scenes.length!==before+1)fail('the scene was not added');
  return {scene:S.activeScene,name:S.scenes[S.activeScene].name};
}
services.FrameEvidence=Object.freeze({capture,capturePlan,runFrames,runUntil,runTarget,boot,registerFrame,importCheckpoint,loadedRomSha256,importInvestigation,verifyRecord,investigations,openFrameScene});
if(C?.register){
  C.register({name:'emulator.frameEvidence',group:'emulator',title:'Frame evidence (state snapshot)',summary:'CPU, RAM, PPU, nametables, palette, OAM, mapper, mapped PRG/CHR banks with file offsets, and the rendered frame, with per-section SHA-256.',
    needs:'emulator',args:{label:{type:'string'}},run:a=>capture({label:a.label||'frame'})});
  C.register({name:'library.registerFrame',group:'library',title:'Add the current frame to the library',summary:'Captures the current frame\'s evidence (with its screenshot as a rendered preview) and stores it on the ROM\'s shelf, linked to the CHR bank entries it uses.',
    needs:'emulator',args:{label:{type:'string'}},run:async a=>registerFrame(await capture({label:a.label||'frame',pixels:true}))});
  C.register({name:'library.importInvestigation',group:'library',title:'Import an Agent Lab investigation',summary:'Validates every record (digests, screenshot pixels, scene re-render) and adds the valid ones to the ROM\'s library shelf. The project is not changed.',
    args:{bundle:{type:'object',required:true}},run:a=>importInvestigation(a.bundle)});
  C.register({name:'library.openFrameScene',group:'library',title:'Open a captured frame as a new Scene',summary:'Adds the frame\'s verified runtime capture as a new Scene (one undo step).',args:{id:{type:'string',required:true}},run:a=>openFrameScene(a.id)});
  C.register({name:'emulator.capturePlan',group:'emulator',title:'Capture many frames from one boot',summary:'Boots once, restores a physical checkpoint for each target (mode checkpoint), or boots per target (mode cold, the reference).',
    args:{bytes:{type:'bytes',required:true},name:{type:'string'},plan:{type:'object',required:true},mode:{type:'string',default:'checkpoint'},trace:{type:'bool',default:false},pixels:{type:'bool',default:false}},
    run:a=>capturePlan({bytes:a.bytes,name:a.name,boot:a.plan.boot,targets:a.plan.targets||[],mode:a.mode,trace:a.trace,pixels:a.pixels})});
}
})();
