/* NES FORGE MODULE: src/services/recovery-ledger.js
 * Entry: Forge.services.RecoveryLedger, commands recovery.*
 * AL-REC-01: persistent, incremental ROM recovery.
 *
 * The ledger is one record per cartridge (by SHA-256), in its own IndexedDB database, kept apart from investigation
 * jobs: a finished job or run never marks the cartridge as recovered. It holds
 *   - what has been observed (signatures of nametable blocks, CHR tiles or banks, palettes and sprite patterns), so a
 *     later run does not record the same thing again;
 *   - every run: its mode, budget, stop reason and what it added;
 *   - the observations it recorded (library entry ids) and the CHR RAM provenance traced for them;
 *   - starting points for the next run (machine states of distinct game situations, with the input path from
 *     power-on where one is known), stored separately from the ledger record;
 *   - experiments, failed hypotheses, blocking conditions, and recommended next investigations.
 * assess() measures the cartridge against what the library, the translated catalog and the ledger hold, per resource
 * category and evidence level: captured, decoded, editable, independently verified, writable. It never calls a
 * cartridge "reconstructed" because entries exist; categories with no evidence are reported as such.
 *
 * Runs use the experiment sandbox (a separate copy of this build, see experiment-sandbox.js): the user's emulator and
 * project are never touched. Results enter the library through FrameEvidence.registerFrame, Forge's existing
 * validated path for runtime captures. Commercial cartridge data stays in this browser's storage.
 */
(()=>{
'use strict';
const F=window.Forge,services=F.services,C=F.commands;
const DB='nes-forge-recovery',DBV=2,FORMAT='NESForgeRecoveryLedger',VERSION=1;
const MODES=Object.freeze({
  continue:{label:'Continue Recovery',budget:{frames:20000,wallMs:180000,observations:120,cells:400},trace:false},
  missing:{label:'Investigate Missing Resources',budget:{frames:30000,wallMs:300000,observations:150,cells:500,stall:90},trace:false},
  deep:{label:'Deep Recovery',budget:{frames:90000,wallMs:900000,observations:400,cells:900,stall:150},trace:true},
  retry:{label:'Retry Unresolved Resources',budget:{frames:20000,wallMs:180000,observations:120,cells:400,stall:90},trace:true},
});
function fail(m){throw Error('Recovery: '+m);}
const now=()=>Date.now();
// ---------- storage ----------
let dbPromise=null;const memory={ledgers:new Map(),archives:new Map(),displayed:new Map()};
function idb(){if(typeof indexedDB==='undefined')return null;if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,DBV);
  r.onupgradeneeded=()=>{const d=r.result;for(const s of ['ledgers','archives'])if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'sha256'});
    // what a frame displayed when a run saw translated screens in it (nametables, background CHR, palette): graphics evidence
    if(!d.objectStoreNames.contains('displayed'))d.createObjectStore('displayed',{keyPath:'id'});};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}).catch(()=>null);return dbPromise;}
async function op(store,mode,fn){const d=await idb();if(!d){return fn(null,memory[store]);}
  return new Promise((resolve,reject)=>{const tx=d.transaction(store,mode),st=tx.objectStore(store);let out;const q=fn(st,null);if(q)q.onsuccess=()=>{out=q.result;};tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
const readLedger=sha=>op('ledgers','readonly',(st,m)=>st?st.get(sha):m.get(sha)||null).then(v=>v||null);
const writeLedger=l=>op('ledgers','readwrite',(st,m)=>st?st.put(l):(m.set(l.sha256,l),null));
const readArchive=sha=>op('archives','readonly',(st,m)=>st?st.get(sha):m.get(sha)||null).then(v=>v||null);
const writeArchive=a=>op('archives','readwrite',(st,m)=>st?st.put(a):(m.set(a.sha256,a),null));
const putDisplayed=d=>op('displayed','readwrite',(st,m)=>st?st.put(d):(m.set(d.id,d),null));
async function displayedFor(sha){const lo=sha+':',hi=sha+':\uffff';
  return (await op('displayed','readonly',(st,m)=>st?st.getAll(IDBKeyRange.bound(lo,hi)):[...m.values()].filter(d=>d.id>=lo&&d.id<=hi)))||[];}
async function hex256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function cartridgeOf(bytes){
  const h=window.InesHeader?.inspect(bytes);
  return {mapper:h?.mapper??((bytes[6]>>4)|(bytes[7]&0xf0)),prgKiB:(h?.prgSize??bytes[4]*16384)/1024,chrKiB:(h?.chrSize??bytes[5]*8192)/1024,chrRam:!(h?h.chrSize:bytes[5]),header:h?.format||'iNES'};
}
function blank(sha,name,bytes){
  return {format:FORMAT,version:VERSION,sha256:sha,name:String(name||'cartridge.nes').slice(0,160),cartridge:cartridgeOf(bytes),created:now(),updated:now(),revision:0,
    known:{blocks:[],tiles:[],banks:[],palettes:[],sprites:[]},observations:[],graphics:{traced:[],writableTiles:0},
    investigations:[],experiments:[],hypotheses:{failed:[]},blockers:[],next:[],sessions:[],state:'not recovered'};
}
async function ledgerFor(bytes,name){const sha=await hex256(bytes);return (await readLedger(sha))||blank(sha,name,bytes);}
async function save(l){l.updated=now();l.revision=(l.revision||0)+1;await writeLedger(l);return l;}
function romBytes(sha){return services.RomImports?.bytes?.(sha)||services.SourceROMs?.get?.(sha)?.bytes||null;}
// ---------- runs ----------
const active=new Map(); // sha -> {mode, controller, intent, progress, started}
const listeners=new Set();const emit=()=>{for(const fn of [...listeners])try{fn(status());}catch(_){}};
function status(){return {running:[...active.entries()].map(([sha,r])=>({sha256:sha,mode:r.mode,label:MODES[r.mode]?.label||r.mode,progress:r.progress,started:r.started,stopping:r.intent||null}))};}
async function run(bytes,name,{mode='continue',budget=null,seed=null,onProgress=null}={}){
  if(!(bytes instanceof Uint8Array))fail('the cartridge bytes are needed (import the ROM first)');
  const m=MODES[mode]||fail('unknown mode '+mode);
  const l=await ledgerFor(bytes,name),sha=l.sha256;if(active.has(sha))fail(l.name+' is already being recovered');
  if(!services.ExperimentSandbox?.available?.())fail('isolation is not available in this document (the sandbox needs the standalone build)');
  const archive=await readArchive(sha),resume=mode!=='retry'||true;
  const controller={aborted:false,listeners:[],addEventListener(t,fn){this.listeners.push(fn);},abort(){if(this.aborted)return;this.aborted=true;for(const fn of this.listeners)fn();}};
  const r={mode,controller,intent:null,progress:null,started:now()};active.set(sha,r);emit();
  const inv={id:'run-'+now().toString(36),mode,label:m.label,started:now(),budget:{...m.budget,...(budget||{})},resumedFrom:archive?.cells?.length||0,state:'running'};
  l.investigations.push(inv);l.state=l.state==='not recovered'?'in progress':l.state;await save(l);
  let session=null,result=null;
  try{
    session=await services.ExperimentSandbox.open();
    const request={romSha:sha,rom:bytes,trace:m.trace&&l.cartridge.chrRam?{maxReplays:mode==='deep'?6:3,maxFrames:60000}:null,
      explore:{budget:inv.budget,seed:seed??((l.revision*2654435761)>>>0)^l.investigations.length,known:l.known,archive:resume&&archive?{cells:archive.cells,steps:archive.steps}:null,capture:true,pixels:true,cadPort:cadPortOf(bytes,name)}};
    result=await session.run(request,{signal:controller,hardCancelMs:60000,onProgress:p=>{r.progress=p;onProgress?.(p);emit();}});
  }finally{session?.close?.('recovery run finished');}
  const out=await absorb(l,inv,result,r.intent);
  // translated layouts (CAD-PORT) pick up the graphics the run captured: their pack is rebuilt and replaces the old one
  try{if(out.registered&&services.CadPortRecovery?.recognize?.(bytes,name)?.recognized){const c=await services.CadPortRecovery.register(bytes,name,{quiet:true});
    out.cadPort={screens:c.screens,withGraphics:c.withGraphics,editable:c.editable,editablePages:c.editablePages,capturedGraphics:c.capturedGraphics,already:!!c.already};
    inv.cadPort=out.cadPort;await save(l);}}catch(e){out.cadPort={error:String(e.message||e)};}
  active.delete(sha);emit();return out;
}
// the translated layouts this cartridge is recognized for, so a run can say which of their screens it saw
function cadPortOf(bytes,name){try{const r=services.CadPortRecovery?.recognize?.(bytes,name);if(!r?.recognized)return null;return {game:r.game,definitions:r.definitions.filter(d=>d.structural!=='contradicted'&&!d.native).map(d=>d.id)};}catch(_){return null;}}
// what a run found goes into the library (through FrameEvidence.registerFrame) and the ledger
async function absorb(l,inv,result,intent){
  inv.ended=now();
  if(!result||result.outcome!=='completed'){inv.state='failed';inv.stopReason=result?.stopReason||'the sandbox returned nothing';l.blockers.push({kind:'run failed',detail:inv.stopReason,at:now()});await save(l);return {ledger:summary(l),run:inv};}
  const x=result.explore,registered=[];
  for(const o of x.observations){
    const rec=o.record;if(!rec||rec.error||!rec.digests){inv.unrecorded=(inv.unrecorded||0)+1;continue;}
    try{const e=await services.FrameEvidence.registerFrame({...rec,label:('recovery '+inv.mode+' · '+o.why.join(', ')).slice(0,110)});
      registered.push({entryId:e.id,frame:o.frame,why:o.why,matched:rec.synchronization?.state==='matched',scene:!!rec.scene,digest:rec.digests.all,run:inv.id,macro:o.macro||null,from:o.from||null,traced:false,...(o.layouts?.length?{layouts:o.layouts}:{})});
      if(o.displayed&&o.layouts?.length)await putDisplayed({id:l.sha256+':'+String(o.displayed.frame).padStart(9,'0')+':'+inv.id,sha256:l.sha256,frame:o.displayed.frame,run:inv.id,entryId:e.id,layouts:o.layouts,nametables:o.displayed.nametables,palette:o.displayed.palette,bgTable:o.displayed.bgTable,chr:o.displayed.chr,chrOffsets:o.displayed.chrOffsets});}
    catch(err){inv.unrecorded=(inv.unrecorded||0)+1;}
  }
  for(const t of x.traces||[]){if(t.error){l.blockers.push({kind:'trace',detail:t.error,at:now()});continue;}
    const o=x.observations[t.observation],reg=registered.find(r=>r.frame===o?.frame);if(reg)reg.traced=true;
    l.graphics.traced.push({run:inv.id,frame:t.frame,entryId:reg?.entryId||null,summary:t.summary,shown:t.shown,used:t.used,writers:t.writers,rows:t.rows,truncated:t.truncated});}
  if(l.graphics.traced.length>24)l.graphics.traced=l.graphics.traced.slice(-24);
  l.graphics.writableTiles=Math.max(0,...l.graphics.traced.map(t=>t.summary?.writable||0));
  l.observations.push(...registered);
  l.known=x.known;
  await writeArchive({sha256:l.sha256,updated:now(),steps:x.archive.steps,cells:x.archive.cells});
  Object.assign(inv,{state:intent==='pause'?'paused':intent==='cancel'?'cancelled':'finished',stopReason:intent?(intent==='pause'?'paused by the user':'cancelled by the user'):x.stopReason,
    frames:x.frames,ms:x.ms,steps:x.steps,cells:x.cells,gained:x.gained,recorded:registered.length,traced:(x.traces||[]).filter(t=>!t.error).length,transitions:x.transitions.length});
  l.transitions=(l.transitions||[]).concat(x.transitions.map(t=>({...t,run:inv.id}))).slice(-4000);
  l.state='in progress';
  await refreshNext(l);await save(l);
  return {ledger:summary(l),run:inv,registered:registered.length};
}
function stop(sha,intent){const r=active.get(sha);if(!r)return false;r.intent=intent;r.controller.abort();emit();return true;}
// ---------- the user's own emulator: its current state, and gameplay ----------
async function current({label='current emulator state'}={}){
  if(typeof emu==='undefined'||!emu.loaded)fail('load the ROM in the emulator first');
  const bytes=emu.lastBuiltRom;const l=await ledgerFor(bytes,emu.romName),E=services.RecoveryExplorer;
  const s=E.sample(),rec=await services.FrameEvidence.capture({label:'recovery: '+label,links:false,scene:true,pixels:true}),e=await services.FrameEvidence.registerFrame(rec);
  const newly={blocks:s.blocks.filter(b=>!l.known.blocks.includes(b)).length,tiles:s.tiles.filter(t=>!l.known.tiles.includes(t)).length,banks:s.banks.filter(b=>!l.known.banks.includes(b)).length,palette:!l.known.palettes.includes(s.pal),sprites:s.sprites.filter(x=>!l.known.sprites.includes(x)).length};
  mergeKnown(l,s);
  l.observations.push({entryId:e.id,frame:rec.frame,why:['captured from the emulator on request'],matched:rec.synchronization?.state==='matched',scene:!!rec.scene,digest:rec.digests.all,run:'user',traced:false});
  // the state becomes a starting point for the next run (no input path: it cannot be traced from power-on)
  const a=(await readArchive(l.sha256))||{sha256:l.sha256,steps:0,cells:[]};
  a.cells.push({key:'user:'+rec.digests.all.slice(0,12),state:services.EmulatorTimeline.machineState(),path:null,parent:null,label:'your emulator, frame '+rec.frame});await writeArchive(a);
  l.investigations.push({id:'user-'+now().toString(36),mode:'current',label:'Investigate Current Emulator State',started:now(),ended:now(),state:'finished',stopReason:'one state captured',recorded:1,newly});
  await refreshNext(l);await save(l);
  return {entryId:e.id,matched:rec.synchronization?.state==='matched',newly,ledger:summary(l)};
}
function mergeKnown(l,s){const add=(k,v)=>{const set=new Set(l.known[k]);for(const x of v)set.add(x);l.known[k]=[...set];};add('blocks',s.blocks);add('tiles',s.tiles);add('banks',s.banks);add('palettes',[s.pal]);add('sprites',s.sprites);}
// gameplay recording: while the user plays, new situations become observations and starting points; inputs from
// power-on (when the recording starts at power-on) make them replayable and traceable
const rec={on:false,sha:null,ledger:null,inputs:[],fromPowerOn:false,startFrame:0,lastSample:0,observations:0,seeds:0,banks:[],queue:Promise.resolve(),prevBanks:null,transitions:0,stats:null};
async function recordGameplay(on){
  if(!on){if(!rec.on)return {recording:false};rec.on=false;await rec.queue;const l=rec.ledger;
    l.sessions.push({at:rec.started,ended:now(),frames:emu.frameCount-rec.startFrame,fromPowerOn:rec.fromPowerOn,observations:rec.observations,seeds:rec.seeds,bankChanges:rec.banks.length,transitions:rec.transitions,inputs:rec.fromPowerOn?rec.inputs.length:0});
    l.investigations.push({id:'play-'+now().toString(36),mode:'gameplay',label:'Record Gameplay for Recovery',started:rec.started,ended:now(),state:'finished',stopReason:'recording stopped by the user',recorded:rec.observations,seeds:rec.seeds});
    await refreshNext(l);await save(l);const out={recording:false,observations:rec.observations,seeds:rec.seeds,bankChanges:rec.banks.length,transitions:rec.transitions,ledger:summary(l)};rec.ledger=null;return out;}
  if(typeof emu==='undefined'||!emu.loaded)fail('load the ROM in the emulator first');
  if(rec.on)return {recording:true};
  rec.ledger=await ledgerFor(emu.lastBuiltRom,emu.romName);Object.assign(rec,{on:true,sha:rec.ledger.sha256,inputs:[],fromPowerOn:emu.frameCount<=2,startFrame:emu.frameCount,lastSample:emu.frameCount,observations:0,seeds:0,banks:[],prevBanks:null,transitions:0,started:now(),prevPal:null});
  return {recording:true,fromPowerOn:rec.fromPowerOn};
}
function onFrame(){
  if(!rec.on||!emu.loaded)return;
  const m=typeof emuReadJoyState==='function'?emuReadJoyState():0;if(rec.fromPowerOn){const last=rec.inputs[rec.inputs.length-1];if(last&&last[0]===m)last[1]++;else rec.inputs.push([m,1]);}
  const b=(emu.mapper===4||emu.mapper===9)&&emu.prgPage?emu.prgPage.join(','):emu.prgBank0+','+emu.prgBank1+','+emu.chrBank0+','+emu.chrBank1;
  if(b!==rec.prevBanks){if(rec.prevBanks!==null&&rec.banks.length<2000)rec.banks.push([emu.frameCount,b]);rec.prevBanks=b;}
  if(emu.frameCount-rec.lastSample<15)return;rec.lastSample=emu.frameCount;
  const s=services.RecoveryExplorer.sample(),l=rec.ledger,why=[];
  const nb=s.blocks.filter(x=>!l.known.blocks.includes(x)).length,nt=s.tiles.filter(x=>!l.known.tiles.includes(x)).length,nk=s.banks.filter(x=>!l.known.banks.includes(x));
  if(nb>=3)why.push('layout ('+nb+' new blocks)');if(nt>=8)why.push('graphics ('+nt+' new tiles)');if(nk.length)why.push('graphics (CHR banks '+nk.join(', ')+')');
  if(!l.known.palettes.includes(s.pal))why.push('palette');const ns=s.sprites.filter(x=>!l.known.sprites.includes(x)).length;if(ns>=4)why.push('sprites ('+ns+' new patterns)');
  if(rec.prevPal&&rec.prevPal!==s.pal&&nb>=8)rec.transitions++;rec.prevPal=s.pal;
  if(!why.length)return;
  mergeKnown(l,s);
  const state=services.EmulatorTimeline.machineState(),path=rec.fromPowerOn?[['input',rec.inputs.map(x=>x.slice()),emu.frameCount]]:null;
  rec.queue=rec.queue.then(async()=>{try{const r=await services.FrameEvidence.capture({label:'gameplay: '+why.join(', '),links:false,scene:true,pixels:true});const e=await services.FrameEvidence.registerFrame(r);
      l.observations.push({entryId:e.id,frame:r.frame,why:['gameplay: '+why.join(', ')],matched:r.synchronization?.state==='matched',scene:!!r.scene,digest:r.digests.all,run:'gameplay',traced:false});rec.observations++;
      const a=(await readArchive(l.sha256))||{sha256:l.sha256,steps:0,cells:[]};if(a.cells.length<1200){a.cells.push({key:'play:'+r.digests.all.slice(0,12),state,path,parent:null,label:'your gameplay, frame '+r.frame});await writeArchive(a);rec.seeds++;}}
    catch(_){/* a failed capture never interrupts play */}});
}
// the emulator's frame loop reports each frame while recording
if(typeof emuRunFrame==='function'){const original=emuRunFrame;emuRunFrame=function(...args){const r=original.apply(this,args);if(rec.on)try{onFrame();}catch(_){}return r;};}
// ---------- assessment ----------
const CATEGORIES=Object.freeze(['CHR graphics','palettes','metatiles','screens','level layouts','world transitions','sprites','metasprites','animations','entities','collision','audio','gameplay logic','native ROM writeback']);
function categoriesOf(e){
  const p=(e.path||'').toLowerCase(),k=e.kind,out=[];
  if(k==='frame')out.push('screens','palettes','CHR graphics','sprites');
  else if(k==='capture')out.push('screens','palettes','CHR graphics');
  else if(k==='map')out.push('level layouts','screens');
  else if(k==='room')out.push('screens');
  else if(k==='collision')out.push('collision');
  else if(k==='pose')out.push('metasprites','sprites');
  else if(k==='animationProject'||/animation/.test(p))out.push('animations');
  else if(k==='audioProject'||k==='audioReport')out.push('audio');
  else if(k==='catalog')out.push('world transitions');
  else if(k==='chr'||/chr|tiles?\b/.test(p))out.push('CHR graphics');
  else if(k==='resource'){out.push('screens');if(/block|metatile|cad-port/.test(p+' '+(e.origin||'')))out.push('metatiles');if(e.preview)out.push('CHR graphics','palettes');}
  else if(k==='project')out.push('screens');
  else if(k==='nativeProject')out.push('native ROM writeback');
  return out;
}
async function assess(sha){
  const l=(await readLedger(sha))||null,L=services.ResourceLibrary;let items=[];try{items=(await L.list({shelf:sha,limit:1e6})).items;}catch(_){items=[];}
  const rows=Object.fromEntries(CATEGORIES.map(c=>[c,{category:c,captured:0,decoded:0,editable:0,verified:0,writable:0,basis:new Set()}]));
  for(const e of items){const cats=categoriesOf(e);if(!cats.length)continue;
    const observed=e.kind==='frame'||e.kind==='capture'||e.origin==='runtime-capture',editable=!!e.loads||!!e.project||(e.kind==='frame'),independent=/independ|fceux|verified in two/i.test(JSON.stringify(e.stages||[])+' '+(e.evidence||''));
    for(const c of cats){const r=rows[c];if(observed)r.captured++;else r.decoded++;if(editable)r.editable++;if(independent)r.verified++;if(e.kind==='nativeProject')r.writable++;r.basis.add(e.kind+(e.origin&&e.origin!=='pack'?' ('+e.origin+')':''));}}
  // CAD-PORT: translated definitions that are independently verified on this revision
  const bytes=romBytes(sha);let cad=null;try{cad=bytes&&services.CadPortRecovery?.recognize?services.CadPortRecovery.recognize(bytes,l?.name||'cartridge.nes'):null;}catch(_){cad=null;}
  if(cad?.recognized){const ver=cad.definitions.filter(d=>/independently verified/.test(d.runtimeStatus||'')).length;if(ver){rows.screens.verified+=ver;rows.metatiles.verified+=ver;rows.screens.basis.add('CAD-PORT definitions observed in two emulators');}}
  // traced CHR RAM: tiles whose native source is known and can be written back
  if(l?.graphics?.writableTiles){rows['CHR graphics'].writable+=l.graphics.writableTiles;rows['native ROM writeback'].writable+=l.graphics.writableTiles;rows['CHR graphics'].basis.add('CHR RAM tiles traced to PRG (direct copies)');}
  // pixel comparison: each runtime capture was rebuilt from its own data and compared with the rendered frame when recorded
  const frames=items.filter(e=>e.kind==='frame');let matched=0,unchecked=0;
  for(const e of frames.slice(0,4000)){let full=null;try{full=await L.entry(e.id);}catch(_){full=null;}if(/0 different pixels/.test(full?.validation?.reason||''))matched++;else unchecked++;}
  const cart=l?.cartridge||(bytes?cartridgeOf(bytes):null);
  const graphics=cart?(cart.chrRam?{source:'CHR RAM',tilesSeen:l?.known.tiles.length||0,traced:l?.graphics.traced.length?l.graphics.traced[l.graphics.traced.length-1].summary:null}
    :{source:'CHR ROM',banks:cart.chrKiB,observed:(l?.known.banks||[]).filter(b=>b<cart.chrKiB).length,unobserved:Math.max(0,cart.chrKiB-new Set((l?.known.banks||[]).filter(b=>b<cart.chrKiB)).size)}):null;
  const table=CATEGORIES.map(c=>{const r=rows[c];return {category:c,captured:r.captured,decoded:r.decoded,editable:r.editable,verified:r.verified,writable:r.writable,basis:[...r.basis].slice(0,6),
    state:r.verified&&r.writable?'verified and writable (some)':r.verified?'verified (some)':r.editable?'editable (some)':r.decoded?'decoded (some)':r.captured?'captured only':'nothing recovered'};});
  return {format:'NESForgeReconstructionReport',version:1,sha256:sha,name:l?.name||null,cartridge:cart,generated:now(),entries:items.length,
    parity:{frames:frames.length,rebuiltWithoutDifference:matched,notRebuilt:unchecked,basis:'each runtime capture is rebuilt from its own nametables, palettes and CHR and compared with the emulator\'s rendered frame pixel for pixel when it is recorded'},
    graphics,table,ledger:l?summary(l):null,
    verdict:'Not reconstructed 1:1: '+table.filter(r=>r.state==='nothing recovered').map(r=>r.category).join(', ')+(table.some(r=>r.state==='nothing recovered')?' have no recovered resources; ':'')+'a category counts as recovered here only with evidence, not because entries exist.'};
}
async function refreshNext(l){
  const next=[],cart=l.cartridge,last=l.investigations.filter(i=>i.mode!=='current'&&i.mode!=='gameplay').slice(-1)[0];
  if(cart.chrRam){const traced=l.graphics.traced.slice(-1)[0];
    if(!traced)next.push({id:'trace-chr',kind:'graphics',reason:'CHR RAM tiles have been captured but not traced to their source; Deep Recovery traces them',mode:'deep'});
    else{const by=traced.summary?.byClass||{},untraced=(by.untraced||0)+(by['untraced (located by content)']||0),derived=(by.compressed||0)+(by.transformed||0)+(by.procedural||0)+(by.assembled||0);
      if(untraced)next.push({id:'trace-untraced',kind:'graphics',reason:untraced+' traced tiles were written before tracing started; replay from power-on reaches them',mode:'deep'});
      if(derived)next.push({id:'decoder-chr',kind:'graphics',reason:derived+' tiles are compressed, transformed or generated: they are editable as captured graphics; writing them back needs the game\'s encoder (not available)',mode:null,blocked:true});}}
  else{const seen=new Set(l.known.banks.filter(b=>b<cart.chrKiB)),miss=cart.chrKiB-seen.size;if(miss>0)next.push({id:'chr-banks',kind:'graphics',reason:miss+' of '+cart.chrKiB+' CHR ROM 1 KiB banks have not been seen in use; Investigate Missing Resources explores further, gameplay recording reaches places exploration does not',mode:'missing'});}
  if(last?.stopReason&&/converged/.test(last.stopReason))next.push({id:'converged',kind:'exploration',reason:'the last run stopped finding new situations ('+last.stopReason+'); record gameplay past that point, or retry with other inputs',mode:'retry'});
  if(last?.stopReason&&/budget/.test(last.stopReason))next.push({id:'budget',kind:'exploration',reason:'the last run used its budget while still finding new resources ('+last.stopReason+'); continue from where it stopped',mode:'continue'});
  next.push({id:'entities',kind:'entities',reason:'entities, collision rules and gameplay logic need the game\'s own data formats; no general recovery exists for them',mode:null,blocked:true});
  l.next=next;l.blockers=(l.blockers||[]).slice(-20);
}
function summary(l){
  const runs=l.investigations.filter(i=>!['current','gameplay'].includes(i.mode));
  return {sha256:l.sha256,name:l.name,cartridge:l.cartridge,state:l.state,updated:l.updated,revision:l.revision,
    known:{blocks:l.known.blocks.length,tiles:l.known.tiles.length,banks:l.known.banks.length,palettes:l.known.palettes.length,sprites:l.known.sprites.length},
    observations:l.observations.length,editable:l.observations.filter(o=>o.scene&&o.matched).length,traced:l.graphics.traced.length,writableTiles:l.graphics.writableTiles,
    runs:runs.length,lastRun:runs.slice(-1)[0]||null,paused:runs.slice(-1)[0]?.state==='paused',sessions:l.sessions.length,next:l.next,blockers:l.blockers.slice(-5),
    note:'A finished run does not mean the cartridge is recovered; see the reconstruction report for what each resource category has.'};
}
async function ledger(sha){const l=await readLedger(sha);return l?summary(l):null;}
// ---------- commands ----------
function pickBytes(a){const sha=a?.sha256||services.RomImports?.last?.()?.sha256||null;const bytes=sha?romBytes(sha):(typeof emu!=='undefined'&&emu.lastBuiltRom)||null;if(!bytes)fail('import the ROM first (Open ROM / project / ZIP, Import ROM, or the emulator\'s Load ROM)');
  return {bytes,name:a?.name||services.RomImports?.list?.().find(r=>r.sha256===sha)?.name||'cartridge.nes'};}
if(C?.register){
  for(const [mode,m] of Object.entries(MODES))
    C.register({name:'recovery.'+mode,group:'recovery',title:m.label,summary:'Runs an incremental recovery ('+m.budget.frames+' frames, '+Math.round(m.budget.wallMs/1000)+' s at most) in the isolated sandbox, starting from where earlier runs stopped, and adds what is new to the library.',
      args:{sha256:{type:'string'},frames:{type:'number'}},run:async a=>{const {bytes,name}=pickBytes(a);return run(bytes,name,{mode,budget:a?.frames?{frames:a.frames}:null});}});
  C.register({name:'recovery.current',group:'recovery',title:'Investigate Current Emulator State',summary:'Captures what the emulator shows now (validated editable scene) into the library, and keeps the state as a starting point for the next run.',needs:'emulator',run:()=>current()});
  C.register({name:'recovery.record',group:'recovery',title:'Record Gameplay for Recovery',summary:'While you play, new layouts, graphics, palettes and sprites are captured into the library and kept as starting points (replayable when recording starts at power-on).',args:{on:{type:'boolean'}},needs:'emulator',run:a=>recordGameplay(a?.on!==false)});
  C.register({name:'recovery.pause',group:'recovery',title:'Pause recovery',summary:'Stops the running recovery at its next sample; Resume continues from the same states.',args:{sha256:{type:'string'}},run:a=>({stopped:stop(a?.sha256||[...active.keys()][0],'pause')})});
  C.register({name:'recovery.cancel',group:'recovery',title:'Cancel recovery',summary:'Stops the running recovery; what it has found is kept.',args:{sha256:{type:'string'}},run:a=>({stopped:stop(a?.sha256||[...active.keys()][0],'cancel')})});
  C.register({name:'recovery.resume',group:'recovery',title:'Resume recovery',summary:'Continues a paused recovery from its saved states.',args:{sha256:{type:'string'}},run:async a=>{const {bytes,name}=pickBytes(a);const l=await ledgerFor(bytes,name),p=l.investigations.filter(i=>i.state==='paused').slice(-1)[0];return run(bytes,name,{mode:p?.mode&&MODES[p.mode]?p.mode:'continue'});}});
  C.register({name:'recovery.ledger',group:'recovery',title:'Recovery ledger',summary:'What is known, observed, traced and unresolved for a cartridge, every run and its stop reason, and the recommended next investigations.',args:{sha256:{type:'string'}},run:async a=>ledger(a?.sha256||(await hex256(pickBytes(a).bytes)))});
  C.register({name:'recovery.report',group:'recovery',title:'Reconstruction report',summary:'Per resource category: captured, decoded, editable, independently verified and writable, with the evidence basis.',args:{sha256:{type:'string'}},run:async a=>assess(a?.sha256||(await hex256(pickBytes(a).bytes)))});
}
services.RecoveryLedger=Object.freeze({MODES,CATEGORIES,run,stop,pause:sha=>stop(sha,'pause'),cancel:sha=>stop(sha,'cancel'),current,recordGameplay,recording:()=>({on:rec.on,sha256:rec.sha,observations:rec.observations,seeds:rec.seeds,fromPowerOn:rec.fromPowerOn}),
  ledger,read:readLedger,archive:readArchive,displayed:displayedFor,assess,status,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},categoriesOf,romBytes,hex256});
})();
