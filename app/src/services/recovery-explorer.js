/* NES FORGE MODULE: src/services/recovery-explorer.js
 * Entry: Forge.services.RecoveryExplorer
 * AL-REC-01: incremental, novelty-driven investigation of one cartridge in the emulator of the document it runs in
 * (the experiment sandbox for in-editor recovery, or an Agent Lab worker page). It never runs in the editor's own
 * emulator: run() refuses there unless the caller is the sandbox agent or a worker page (see allowedHere()).
 *
 * Instead of a fixed list of captures it keeps an archive of distinct game states ("cells"): a cell is what is on
 * screen (the visible nametable blocks), the palette and the graphics in use. Each step restores a cell's machine
 * state, plays one input macro from it (walk, run, jump, climb, menus, seeded random input) and samples what changed.
 * Whatever is new becomes an observation, recorded with Forge's own frame evidence (state snapshot, editable scene
 * validated against the rendered frame) and the reason it is new:
 *   layout     nametable 8x8-tile blocks not seen before
 *   graphics   CHR RAM tiles, or CHR ROM 1 KiB banks, not seen before
 *   palette    a palette not seen before
 *   sprites    sprite patterns (tile, table) not drawn before
 * Known signatures (from the recovery ledger) are not new again, and known cells are starting points: continuing an
 * investigation starts from where earlier ones stopped instead of repeating them. Each cell keeps the input path that
 * reached it from power-on, so any observation can be replayed exactly (for CHR RAM provenance tracing).
 * Budgets: frames, wall time, cells, observations and state bytes; the run ends at the first one exhausted, when
 * the caller pauses or cancels (the archive is returned and can be resumed), or when many steps in a row find
 * nothing new ("converged", which is reported as a stop reason, not as complete recovery).
 */
(()=>{
'use strict';
const services=window.Forge.services;
const BTN=Object.freeze({A:1,B:2,Select:4,Start:8,Up:16,Down:32,Left:64,Right:128});
// input macros: name, frames, mask for frame f (r: a seeded random source for this application)
const MACROS=Object.freeze([
  ['walk right',150,f=>BTN.Right|((f%48)<6?BTN.A:0)],
  ['run right',150,f=>BTN.Right|BTN.B|((f%36)<8?BTN.A:0)],
  ['jump right',120,f=>BTN.Right|((f%24)<14?BTN.A:0)],
  ['walk left',120,f=>BTN.Left|((f%48)<6?BTN.A:0)],
  ['climb up',90,f=>BTN.Up|((f%40)<5?BTN.A:0)],
  ['go down',90,f=>BTN.Down|((f%40)<5?BTN.B:0)],
  ['attack',60,f=>(f%12)<4?BTN.B:(f%12)<8?BTN.A:0],
  ['start',60,f=>f<5?BTN.Start:0],
  ['select, start',80,f=>f<5?BTN.Select:f>=30&&f<35?BTN.Start:0],
  ['menu: down, confirm',60,f=>f<5?BTN.Down:f>=20&&f<25?BTN.A:f>=40&&f<45?BTN.Start:0],
  ['wait',120,()=>0],
  ['random',150,(f,r)=>r(f)],
]);
// power-on input scripts, played from reset on a cartridge's first run (about 12,500 frames together); steps are
// [mask, frames] (the CAD-PORT observation script format)
const WALK=[].concat(...Array.from({length:12},(_,i)=>[[BTN.Right,50],[BTN.Right|(i&1?BTN.B:BTN.A),8]]));
const BOOTS=Object.freeze([
  {label:'two Starts',steps:[[0,120],[BTN.Start,5],[0,115],[BTN.Start,5],[0,115],...WALK]},
  {label:'three Starts',steps:[[0,180],[BTN.Start,6],[0,120],[BTN.Start,6],[0,180],[BTN.Start,6],[0,300],...WALK]},
  {label:'late Start (long intro)',steps:[[0,1400],[BTN.Start,6],[0,400],[BTN.Start,6],[0,300],[BTN.A,6],[0,200],...WALK]},
  {label:'Start, then A to confirm',steps:[[0,200],[BTN.Start,6],[0,90],[BTN.A,6],[0,90],[BTN.Start,6],[0,240],...WALK]},
  {label:'five Starts, then a long walk right',steps:[[0,180],[BTN.Start,6],[0,120],[BTN.Start,6],[0,180],[BTN.Start,6],[0,240],[BTN.Start,6],[0,240],...[].concat(...Array.from({length:40},(_,i)=>[[BTN.Right,50],[BTN.Right|(i&1?BTN.B:BTN.A),8]]))]},
  {label:'attract mode (no input)',steps:[[0,2400]]},
]);
const framesOf=steps=>steps.reduce((n,s)=>n+s[1],0);
const scriptMask=(steps,f)=>{let at=0;for(const [m,n] of steps){if(f<at+n)return m;at+=n;}return 0;};
// load a cartridge for a run: the page's own emulation loop is stopped, so only the run advances frames (otherwise
// the loop would add frames between the run's own and input paths would not replay)
function load(rom,label){if(!emuLoadRomData(rom,label,0))fail('the emulator refused the cartridge');hold();}
function hold(){try{if(typeof emuPause==='function')emuPause();}catch(_){}if(emu.rafId){try{cancelAnimationFrame(emu.rafId);}catch(_){}emu.rafId=null;}emu.running=false;}
function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function fnv(bytes,from=0,to=bytes.length,h=0x811c9dc5){for(let i=from;i<to;i++)h=Math.imul(h^bytes[i],0x01000193);return h>>>0;}
const hex=v=>(v>>>0).toString(16).padStart(8,'0');
function fail(m){throw Error('Recovery explorer: '+m);}
// where a run may drive the emulator: a sandboxed copy of the editor, or a worker page that declared itself
function allowedHere(){return !!(services.ExperimentSandboxAgent?.inSandbox?.()||window.__forgeAgentLabPage===true);}
// ---------- what the machine shows now ----------
function sample(){
  const vram=emu.vram,nts=vram.length>=4096?4:2,blocks=[];
  for(let n=0;n<nts;n++){const base=n*1024;
    for(let by=0;by<4;by++)for(let bx=0;bx<4;bx++){let h=0x811c9dc5;const rows=by===3?6:8;
      for(let y=0;y<rows;y++){const r=base+(by*8+y)*32+bx*8;for(let x=0;x<8;x++)h=Math.imul(h^vram[r+x],0x01000193);}
      // the block's attribute bytes too (its palettes)
      const a=base+960+by*16+bx*2;h=Math.imul(h^vram[a],0x01000193);h=Math.imul(h^vram[a+1],0x01000193);h=Math.imul(h^(vram[a+8]||0),0x01000193);
      blocks.push(hex(h)+'.'+(by*8+bx));}}
  const pal=hex(fnv(emu.palRam)),tiles=[],banks=[];
  if(emu.hasChrRam){const c=emu.chrRam;for(let t=0;t+16<=c.length;t+=16){let u=true;for(let i=1;i<16;i++)if(c[t+i]!==c[t]){u=false;break;}if(!u)tiles.push(hex(fnv(c,t,t+16)));}}
  else{if(emu.mapper===4&&emu.chrPages)for(const p of emu.chrPages)banks.push(p>>10);else{for(let k=0;k<4;k++){banks.push((emu.chrBank0>>10)+k);banks.push((emu.chrBank1>>10)+k);}
    for(const f of ['chrBank0Pre','chrBank1Pre','chrBank0Post','chrBank1Post'])if(Number.isInteger(emu[f]))for(let k=0;k<4;k++)banks.push((emu[f]>>10)+k);}}
  const sprites=[];const oam=emu.oamMem||[];const tall=!!(emu.ppuCtrl&32),table=emu.ppuCtrl&8?1:0;
  if(emu.ppuMask&16)for(let i=0;i+3<oam.length;i+=4){if(oam[i]>=0xef)continue;sprites.push(tall?(oam[i+1]&1)+':'+(oam[i+1]&0xfe):table+':'+oam[i+1]);}
  const ctrl=emu.ppuCtrl,sx=((emu.tAddr&31)<<3)|(emu.fineX&7),ntSel=ctrl&3;
  // the nametable the frame starts in and, when scrolled, its horizontal neighbour (through the cartridge's mirroring)
  const phys=n=>(ppuMirror(n*0x400)>>10)%nts,visible=blocks.slice(phys(ntSel)*16,phys(ntSel)*16+16);if(sx&255)visible.push(...blocks.slice(phys(ntSel^1)*16,phys(ntSel^1)*16+16));
  // a coarse picture of the background (8 x 6 blocks, four brightness levels): what a player would call "a different place"
  const fb=emu.bgFrameBuffer||emu.frameBuffer,grid=new Uint8Array(48);if(fb)for(let by=0;by<6;by++)for(let bx=0;bx<8;bx++){let sum=0;for(let y=0;y<3;y++)for(let x=0;x<3;x++){const i=((by*40+6+y*13)*256+bx*32+5+x*11)*4;sum+=fb[i]*2+fb[i+1]*5+fb[i+2];}grid[by*8+bx]=Math.min(3,Math.floor(sum/9/8/64));}
  return {blocks,pal,tiles,banks:[...new Set(banks)].sort((a,b)=>a-b),sprites:[...new Set(sprites)],cell:hex(fnv(grid,0,48,fnv(new TextEncoder().encode(pal+'|'+(emu.hasChrRam?tiles.length>>4:banks.join('.')))))),visible:hex(fnv(new TextEncoder().encode(visible.join(',')))),scroll:{x:sx+((ctrl&1)<<8),y:((emu.tAddr>>5)&31)*8+((emu.tAddr>>12)&7)+((ctrl&2)?240:0)}};
}
// ---------- one run ----------
// opts: {rom, budget:{frames,wallMs,cells,observations,stateBytes}, seed, known:{blocks,tiles,banks,palettes,sprites},
//        archive (resume), seeds:[{state,path,label}], boot:{frames,inputs}, onProgress, shouldStop, capture:true}
async function run(opts={}){
  if(!allowedHere())fail('runs only in an isolated copy of the editor (the experiment sandbox or an Agent Lab page), never in the editor\'s own emulator');
  const T=services.EmulatorTimeline;if(!T?.machineState)fail('the machine-state functions are not available');
  const budget={frames:20000,wallMs:180000,cells:400,observations:150,stateBytes:48*1024*1024,stall:60,...(opts.budget||{})};
  const t0=performance.now(),random=rng(opts.seed||0x5eed),known={blocks:new Set(opts.known?.blocks||[]),tiles:new Set(opts.known?.tiles||[]),banks:new Set((opts.known?.banks||[]).map(Number)),palettes:new Set(opts.known?.palettes||[]),sprites:new Set(opts.known?.sprites||[])};
  const before={blocks:known.blocks.size,tiles:known.tiles.size,banks:known.banks.size,palettes:known.palettes.size,sprites:known.sprites.size};
  let mask=0,frames=0,stateBytes=0,steps=0,stall=0,stopReason=null,prevStepOuter=null;const seenScreens=new Set(opts.known?.screens||[]);
  const prevJoy=emuReadJoyState;emuReadJoyState=function(){return mask;};
  const cells=new Map(),observations=[],transitions=[];
  const sizeOf=s=>{let n=0;const walk=v=>{if(v&&typeof v==='object'){if(ArrayBuffer.isView(v))n+=v.byteLength;else for(const x of Object.values(v))walk(x);}else n+=8;};walk(s.emu);return n+4096;};
  const addCell=(key,state,path,parent,label)=>{if(cells.has(key))return cells.get(key);const c={key,state,path,parent,label,visits:0,found:0,born:steps};stateBytes+=sizeOf(state);cells.set(key,c);return c;};
  const step=async(n,maskOf)=>{for(let f=0;f<n;f++){mask=maskOf(f);emuRunFrame();frames++;if((f&15)===15&&performance.now()-chunk>12){mask=0;await new Promise(r=>setTimeout(r,0));chunk=performance.now();}}mask=0;};
  let chunk=performance.now();
  try{
    // translated layouts (CAD-PORT) of this game: each observation says which of their screens it shows
    const cadPort=[];if(opts.cadPort?.game&&window.CadPortCatalog&&window.CadPortDecoders){const D=window.CadPortDecoders,g=window.CadPortCatalog.games.find(x=>x.folder===opts.cadPort.game);
      for(const id of opts.cadPort.definitions||[]){const def=g?.definitions.find(x=>x.id===id);if(!def)continue;try{const x=D.decodeAll(opts.rom||emu.lastBuiltRom,def);cadPort.push({id,projections:x.screens.map(sc=>D.project(x,def,sc))});}catch(_){}}}
    // what the frame displayed: the nametables, background CHR and palette at the entry of the game's NMI handler (by
    // the end of the emulated frame the handler has often started writing the next frame's data)
    let displayed=null,nmiTarget=-1;const vectorOf=()=>{try{return cpuRead(0xfffa)|(cpuRead(0xfffb)<<8);}catch(_){return -1;}};
    const snapDisplayed=()=>{const nt=new Uint8Array(4096);for(let a=0;a<4096;a++)nt[a]=emu.vram[ppuMirror(a)%emu.vram.length];const bg=emu.ppuCtrl&16?4096:0;
      displayed={frame:emu.frameCount,nametables:nt,palette:Array.from(emu.palRam.subarray(0,16)),bgTable:bg,chr:emu.hasChrRam?emu.chrRam.slice(bg,bg+4096):null,chrOffsets:emu.hasChrRam?null:[0,1,2,3].map(k=>{const a=bg+k*1024;return emu.mapper===4?(emu.chrPages?.[a>>10]||0):(a<4096?emu.chrBank0:emu.chrBank1)+(a&4095);})};};
    const prevStep=cadPort.length?cpuStepRaw:null;prevStepOuter=prevStep;
    if(prevStep)cpuStepRaw=function(...args){if((emu.PC&0xffff)===nmiTarget)snapDisplayed();return prevStep.apply(this,args);};
    const logicalNametables=()=>displayed?displayed.nametables:(()=>{const nt=new Uint8Array(4096);for(let a=0;a<4096;a++)nt[a]=emu.vram[ppuMirror(a)%emu.vram.length];return nt;})();
    const matchLayouts=()=>{if(!cadPort.length)return null;nmiTarget=vectorOf();const nt=logicalNametables(),out=[];for(const c of cadPort){let m=[];try{m=window.CadPortDecoders.observeScreens(nt,c.projections);}catch(_){m=[];}for(const h of m)out.push({definition:c.id,screen:h.screen,matched:h.matched,compared:h.compared});}return out;};
    const observe=async(why,cell,s,macro)=>{
      if(observations.length>=budget.observations)return null;
      let record=null;
      if(opts.capture!==false&&services.FrameEvidence?.capture){try{record=await services.FrameEvidence.capture({label:'recovery: '+why.join(', '),links:false,scene:true,pixels:!!opts.pixels});}catch(e){record={error:String(e.message||e)};}}
      const layouts=s.layouts||matchLayouts(),o={index:observations.length,frame:emu.frameCount,why,cell:cell.key,from:cell.label,macro,path:cell.path,scroll:s.scroll,palette:s.pal,banks:s.banks,newTiles:s.newTiles,record,layouts,
        ...(layouts?.length&&displayed?{displayed:{frame:displayed.frame,nametables:displayed.nametables,palette:displayed.palette,bgTable:displayed.bgTable,chr:displayed.chr,chrOffsets:displayed.chrOffsets}}:{})};
      observations.push(o);return o;
    };
    // the cold or resumed starting point itself is an observation if it shows anything new
    const evaluate=s=>{const why=[];
      const nb=s.blocks.filter(b=>!known.blocks.has(b));if(nb.length>=3)why.push('layout ('+nb.length+' new blocks)');
      const nt=s.tiles.filter(t=>!known.tiles.has(t));s.newTiles=nt.length;if(nt.length>=8)why.push('graphics ('+nt.length+' new tiles)');
      const nk=s.banks.filter(b=>!known.banks.has(b));if(nk.length)why.push('graphics (CHR banks '+nk.join(', ')+')');
      if(!known.palettes.has(s.pal))why.push('palette');
      const ns=s.sprites.filter(x=>!known.sprites.has(x));if(ns.length>=4)why.push('sprites ('+ns.length+' new patterns)');
      if(cadPort.length){s.layouts=matchLayouts();const fresh=(s.layouts||[]).filter(m=>!seenScreens.has(m.definition+'#'+m.screen));if(fresh.length)why.push('translated screen'+(fresh.length===1?'':'s')+' seen ('+fresh.map(m=>m.definition.split('/').pop()+' #'+m.screen).join(', ')+')');s.freshScreens=fresh;}
      return {why,commit(){for(const m of s.freshScreens||[])seenScreens.add(m.definition+'#'+m.screen);for(const b of s.blocks)known.blocks.add(b);for(const t of s.tiles)known.tiles.add(t);for(const b of s.banks)known.banks.add(b);known.palettes.add(s.pal);for(const x of s.sprites)known.sprites.add(x);}};};
    // the starting points: a resumed archive, the ledger's seeds, or a cold boot
    if(opts.archive?.cells?.length){for(const c of opts.archive.cells)addCell(c.key,c.state,c.path,c.parent,c.label);steps=opts.archive.steps||0;}
    for(const s of opts.seeds||[])addCell('seed:'+s.label,s.state,s.path||null,null,s.label);
    const scripted=[];
    if(!cells.size){
      if(!(opts.rom instanceof Uint8Array))fail('a first run needs the cartridge');
      const boots=(opts.boots||BOOTS.map((_,i)=>i)).map(b=>typeof b==='number'?{index:b,...BOOTS[b]}:{index:-1,...b});
      for(const boot of boots){
        load(opts.rom,'recovery');
        const total=framesOf(boot.steps);let prevCell=null;
        for(let f=0;f<total;f+=30){const n=Math.min(30,total-f);await step(n,x=>scriptMask(boot.steps,f+x));
          const seg=boot.index>=0?['script',boot.index,f+n]:['input',boot.steps,f+n],s=sample();
          if(f+n>=120&&!cells.has(s.cell)&&cells.size<budget.cells){const c=addCell(s.cell,T.machineState(),[seg],prevCell,boot.label+' · frame '+(f+n));transitions.push({from:prevCell,to:c.key,macro:boot.label,scroll:s.scroll});prevCell=c.key;}
          scripted.push({s,cell:cells.get(s.cell)||{key:'script',label:boot.label,path:[seg]},boot:boot.label,path:[seg]});
          const e=evaluate(s);if(e.why.length){const o=await observe(e.why,cells.get(s.cell)||{key:s.cell,label:boot.label},s,boot.label);if(o)o.path=[seg];}e.commit();
          if(frames>=budget.frames||performance.now()-t0>=budget.wallMs)break;}
      }
    }else if(opts.rom instanceof Uint8Array&&!emu.loaded){load(opts.rom,'recovery');}
    hold();
    if(!cells.size)fail('no starting state: the boot scripts reached nothing within the budget');
    if(!scripted.length){const first=[...cells.values()][0];T.applyMachineState(first.state);const s=sample(),e=evaluate(s);if(e.why.length)await observe(e.why,first,s,null);e.commit();}
    while(true){
      if(opts.shouldStop?.()){stopReason=opts.shouldStop();break;}
      if(frames>=budget.frames){stopReason='frame budget ('+budget.frames+' frames) exhausted';break;}
      if(performance.now()-t0>=budget.wallMs){stopReason='time budget ('+Math.round(budget.wallMs/1000)+' s) exhausted';break;}
      if(observations.length>=budget.observations){stopReason='observation budget ('+budget.observations+') reached';break;}
      if(stall>=budget.stall){stopReason='converged: '+stall+' steps in a row found nothing new from '+cells.size+' states (not a proof that nothing is left)';break;}
      // choose a cell: rarely visited and recently productive cells first
      const list=[...cells.values()];let total=0;const w=list.map(c=>{const v=(1/Math.sqrt(c.visits+1))*(1+c.found)*(c.born>steps-50?1.5:1);total+=v;return v;});
      let pick=random()*total,cell=list[0];for(let i=0;i<list.length;i++){pick-=w[i];if(pick<=0){cell=list[i];break;}}
      cell.visits++;steps++;T.applyMachineState(cell.state);
      const mi=Math.floor(random()*MACROS.length),[name,len,fn]=MACROS[mi],seed=Math.floor(random()*2**31),r=rng(seed);let held=0,until=0;
      const maskOf=name==='random'?f=>{if(f>=until){held=Math.floor(r()*256)&~(BTN.Select);if((held&48)===48)held&=~32;if((held&192)===192)held&=~64;until=f+8+Math.floor(r()*16);}return held;}:fn;
      let found=false,last=cell,lastScroll=null;
      for(let seg=0;seg<len;seg+=30){
        await step(Math.min(30,len-seg),f=>maskOf(f+seg));
        const s=sample(),e=evaluate(s),path=[...(cell.path||[]),[mi,seed,seg+Math.min(30,len-seg)]];
        if(!cells.has(s.cell)&&cells.size<budget.cells&&stateBytes<budget.stateBytes){const c=addCell(s.cell,T.machineState(),cell.path?path:null,cell.key,name+' from '+cell.label);transitions.push({from:last.key,to:c.key,macro:name,scroll:s.scroll,fromScroll:lastScroll});last=c;}
        if(e.why.length){const o=await observe(e.why,cells.get(s.cell)||cell,s,name);e.commit();found=true;if(o)o.path=cell.path?path:null;}
        lastScroll=s.scroll;
      }
      if(found){cell.found++;stall=0;}else stall++;
      if(cells.size>=budget.cells&&stateBytes>=budget.stateBytes){stopReason='state budget reached';break;}
      opts.onProgress?.({steps,frames,cells:cells.size,observations:observations.length,ms:Math.round(performance.now()-t0)});
    }
  }finally{emuReadJoyState=prevJoy;mask=0;if(prevStepOuter)cpuStepRaw=prevStepOuter;}
  const gained={blocks:known.blocks.size-before.blocks,tiles:known.tiles.size-before.tiles,banks:known.banks.size-before.banks,palettes:known.palettes.size-before.palettes,sprites:known.sprites.size-before.sprites};
  return {format:'NESForgeRecoveryRun',version:1,stopReason,steps,frames,ms:Math.round(performance.now()-t0),budget,cells:cells.size,stateBytes,gained,observations,transitions:transitions.slice(-2000),
    known:{blocks:[...known.blocks],tiles:[...known.tiles],banks:[...known.banks],palettes:[...known.palettes],sprites:[...known.sprites],screens:[...seenScreens]},
    archive:{steps,cells:[...cells.values()].map(c=>({key:c.key,state:c.state,path:c.path,parent:c.parent,label:c.label}))}};
}
// ---------- exact replay of an input path from power-on (for tracing) ----------
// path: [['script', bootIndex, frames] or ['input', steps, frames], then [macroIndex, seed, framesPlayed], ...]
async function replay(rom,path,{onFrame=null,loaded=false}={}){
  if(!allowedHere())fail('replays run only in an isolated copy of the editor');
  if(!loaded)load(rom,'recovery replay');else hold();
  let mask=0;const prevJoy=emuReadJoyState;emuReadJoyState=function(){return mask;};let chunk=performance.now();
  const play=async(n,maskOf)=>{for(let f=0;f<n;f++){mask=maskOf(f);emuRunFrame();onFrame?.();if((f&15)===15&&performance.now()-chunk>12){mask=0;await new Promise(r=>setTimeout(r,0));chunk=performance.now();}}mask=0;};
  try{
    for(const seg of path){
      if(seg[0]==='script'){const steps=BOOTS[seg[1]].steps;await play(seg[2],f=>scriptMask(steps,f));continue;}
      if(seg[0]==='input'){const steps=seg[1];await play(seg[2],f=>scriptMask(steps,f));continue;}
      const [mi,seed,count]=seg,[name,,fn]=MACROS[mi],r=rng(seed);let held=0,until=0;
      const maskOf=name==='random'?f=>{if(f>=until){held=Math.floor(r()*256)&~(BTN.Select);if((held&48)===48)held&=~32;if((held&192)===192)held&=~64;until=f+8+Math.floor(r()*16);}return held;}:fn;
      await play(count,maskOf);
    }
  }finally{emuReadJoyState=prevJoy;}
  return emu.frameCount;
}
services.RecoveryExplorer=Object.freeze({BTN,MACROS:MACROS.map(m=>m[0]),BOOTS:BOOTS.map(b=>b.label),run,replay,sample,allowedHere});
})();
