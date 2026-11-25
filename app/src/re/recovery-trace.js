/* NES FORGE MODULE: src/re/recovery-trace.js
 * Entry: Forge.services.RecoveryTrace
 * AL-REC-01: dynamic CHR RAM recovery. A passive tracer for the emulator of the document it runs in (the experiment
 * sandbox, an Agent Lab worker page, or the editor while the user asks for it). It wraps the emulator's instruction
 * step, CPU read, CPU write and PPU write functions, records only what passes through, and never reads the bus
 * itself. It follows the origin of every byte value the CPU moves (src/re/chr-provenance.js holds the semantics):
 * registers, internal RAM and cartridge RAM carry the origin of the value they hold. For each byte the game writes to
 * CHR RAM it keeps the byte's origin, the routine that wrote it (the file offset of the store instruction), the
 * frame, the write count and how many contents the tile slot held. It also logs upload batches (consecutive $2007
 * pattern writes), mapper register writes (bank changes) and nametable and palette write counts.
 * capture() associates the CHR RAM with what the PPU shows at that moment: nametables, attribute tables, palettes,
 * PPU registers, scroll, and the PRG and CHR bank mapping with cartridge file offsets.
 * Budgets: batch and bank-write logs are capped (and say so); the per-byte tables are fixed size.
 */
(()=>{
'use strict';
const services=window.Forge.services,P=window.ForgeChrProvenance,O=P.ORIGIN,K=P.K,SEM=P.SEM,MN=P.MN;
let active=null;
function fail(m){throw Error('Recovery trace: '+m);}
function fnv(bytes,from,to){let h=0x811c9dc5;for(let i=from;i<to;i++)h=Math.imul(h^bytes[i],0x01000193);return h>>>0;}
function install({maxBatches=8192,maxBankWrites=8192,maxVersions=16}={}){
  if(active)fail('already installed');
  if(services.BusObserver?.active?.())fail('an experiment bus observer is installed; trace after it finishes');
  if(typeof emu==='undefined'||!emu.loaded||!emu.lastBuiltRom)fail('no cartridge is loaded');
  const rom=emu.lastBuiltRom,head=16+((rom[6]&4)?512:0),n=emu.hasChrRam?emu.chrRam.length:0,LEN=services.BusObserver.LEN;
  const origin=new Int32Array(n).fill(O.UNKNOWN),src=new Int32Array(n).fill(-1),writes=new Uint32Array(n),lastFrame=new Int32Array(n).fill(-1),writer=new Int32Array(n).fill(-1);
  const tiles=n>>4,versions=new Uint8Array(tiles),hashes=new Array(tiles).fill(null),uploadFrames=new Uint16Array(tiles),lastUpload=new Int32Array(tiles).fill(-1),dirty=new Uint8Array(tiles),dirtyList=[];
  const ramO=new Int32Array(0x800).fill(O.UNKNOWN),ramS=new Int32Array(0x800).fill(-1),sramO=new Int32Array(0x2000).fill(O.UNKNOWN),sramS=new Int32Array(0x2000).fill(-1);
  // registers A, X, Y and the carry flag carry the origin of their value (bit-stream decoders move data through the carry)
  const regO=new Int32Array(4).fill(O.UNKNOWN),regS=new Int32Array(4).fill(-1),CY=3;
  const st={op:-1,pc:-1,pcFile:-1,fetch:false,remaining:0,next:0,lastO:O.UNKNOWN,lastS:-1,lastV:0,pend:false,pendO:O.COMPUTED,pendS:-1,flagsO:-1};
  // PRG bytes the code tests (compares, bit-tests, or branches on as zero or sign): a byte that is copied to CHR and
  // also tested is data the decoder interprets (an escape-coded stream), so an edit must keep what is tested
  const tested=new Map(),testBudget=65536;
  const test=(o,cond)=>{if(o<0)return;let set=tested.get(o);if(!set){if(tested.size>=testBudget)return;tested.set(o,set=new Set());}if(set.size<6)set.add(cond);};
  const writers=new Map(),batches=[],bankWrites=[],counts={patternWrites:0,nametableWrites:0,paletteWrites:0,droppedBatches:0,droppedBankWrites:0,frames:0,instructions:0};
  const startFrame=emu.frameCount;let cur=null,c0=0,c1=-1,settling=[];
  const prgFile=a=>{const off=(emu.mapper===4||emu.mapper===9)&&emu.prgPage?emu.prgPage[(a>>13)&3]+(a&0x1fff):(a>=0xc000?emu.prgBank1:emu.prgBank0)+(a&0x3fff);return head+(off%emu.prgSize);};
  const comb=(a,as,b,bs)=>{if(a>=0){c0=O.DERIVED;c1=a;return;}if(b>=0){c0=O.DERIVED;c1=b;return;}if(a===O.DERIVED){c0=O.DERIVED;c1=as;return;}if(b===O.DERIVED){c0=O.DERIVED;c1=bs;return;}
    c0=a===O.VRAM||b===O.VRAM?O.VRAM:a===O.UNKNOWN||b===O.UNKNOWN?O.UNKNOWN:O.COMPUTED;c1=-1;};
  const setC=(o,s)=>{regO[CY]=o;regS[CY]=s;};
  function apply(){const op=st.op;if(op<0)return;const s=SEM[op],k=s[0],r=s[1],mn=MN[op],acc=(op&0x1f)===0x0a;
    // flags: which PRG byte the zero and sign flags currently reflect (loads, transfers, arithmetic)
    if(mn==='BEQ'||mn==='BNE'){test(st.flagsO,'zero');return;}
    if(mn==='BMI'||mn==='BPL'){test(st.flagsO,'sign');return;}
    if(mn==='CMP'||mn==='CPX'||mn==='CPY'){const reg=mn==='CMP'?0:mn==='CPX'?1:2;test(regO[reg],'=$'+st.lastV.toString(16).padStart(2,'0'));if(st.lastO>=0)test(st.lastO,'compared');st.flagsO=-1;}
    else if(mn==='BIT'){test(st.lastO,'bit');st.flagsO=-1;}
    switch(mn){
      case 'ADC':case 'SBC':{st.flagsO=-1;const ao=regO[0],as=regS[0];comb(ao,as,st.lastO,st.lastS);const o=c0,os=c1;comb(o,os,regO[CY],regS[CY]);regO[0]=c0;regS[0]=c1;setC(o,os);return;}
      case 'CMP':comb(regO[0],regS[0],st.lastO,st.lastS);setC(c0,c1);return;
      case 'CPX':comb(regO[1],regS[1],st.lastO,st.lastS);setC(c0,c1);return;
      case 'CPY':comb(regO[2],regS[2],st.lastO,st.lastS);setC(c0,c1);return;
      case 'CLC':case 'SEC':setC(O.COMPUTED,-1);return;
      case 'PLP':case 'RTI':setC(O.COMPUTED,-1);st.flagsO=-1;return;
      case 'ASL':case 'LSR':st.flagsO=-1;if(acc){const o=regO[0],os=regS[0];comb(o,os,O.COMPUTED,-1);regO[0]=c0;regS[0]=c1;setC(o,os);}else setC(st.lastO,st.lastS);return;
      case 'ROL':case 'ROR':st.flagsO=-1;if(acc){const o=regO[0],os=regS[0];comb(o,os,regO[CY],regS[CY]);regO[0]=c0;regS[0]=c1;setC(o,os);}else setC(st.lastO,st.lastS);return;
    }
    if(k===K.LOAD||k===K.PULL){regO[r]=st.lastO;regS[r]=st.lastS;st.flagsO=st.lastO;}
    else if(k===K.MOVE){regO[r]=regO[s[2]];regS[r]=regS[s[2]];st.flagsO=regO[r];}
    else if(k===K.ALU){comb(regO[0],regS[0],st.lastO,st.lastS);regO[0]=c0;regS[0]=c1;st.flagsO=-1;}
    else if(k===K.RMW){st.flagsO=-1;}
    else if(k===K.STEP){st.flagsO=-1;if(s[2]<0){regO[r]=O.COMPUTED;regS[r]=-1;}else{comb(regO[r],regS[r],O.COMPUTED,-1);regO[r]=c0;regS[r]=c1;}}
    else if(k===K.UNOFFICIAL){st.flagsO=-1;comb(st.lastO,st.lastS,regO[0],regS[0]);regO[0]=regO[1]=c0;regS[0]=regS[1]=c1;}}
  const prev={step:cpuStepRaw,read:cpuRead,write:cpuWrite,ppu:ppuBusWrite};
  cpuStepRaw=function(...args){
    // the writer of a value: its instruction's cartridge file offset, or -1-address for code running in RAM
    const pc=emu.PC&0xffff;st.pc=pc;st.pcFile=pc>=0x8000?prgFile(pc):-1-pc;st.fetch=true;st.remaining=0;st.op=-1;st.lastO=O.UNKNOWN;st.lastS=-1;counts.instructions++;
    try{return prev.step.apply(this,args);}finally{apply();st.fetch=false;st.op=-1;st.pc=-1;}
  };
  cpuRead=function(a,...rest){
    const v=prev.read.call(this,a,...rest);a&=0xffff;
    // instruction fetches at any address (some games run their upload routines from RAM); an operand byte in RAM carries
    // the origin of whatever was written there (self-modifying code patches operands)
    if(st.fetch&&a===st.pc){st.op=v;st.fetch=false;st.remaining=LEN[v]-1;st.next=(a+1)&0xffff;return v;}
    st.lastV=v;
    if(st.remaining>0&&a===st.next){st.remaining--;st.next=(a+1)&0xffff;
      if(a>=0x8000){st.lastO=O.IMMEDIATE;st.lastS=-1;}else if(a<0x2000){st.lastO=ramO[a&0x7ff];st.lastS=ramS[a&0x7ff];}else if(a>=0x6000){st.lastO=sramO[a-0x6000];st.lastS=sramS[a-0x6000];}else{st.lastO=O.IO;st.lastS=-1;}
      return v;}
    if(a>=0x8000){st.lastO=prgFile(a);st.lastS=-1;}
    else if(a<0x2000){const i=a&0x7ff;st.lastO=ramO[i];st.lastS=ramS[i];}
    else if(a>=0x6000){const i=a-0x6000;st.lastO=sramO[i];st.lastS=sramS[i];}
    else if(a<0x4000&&(a&7)===7){st.lastO=O.VRAM;st.lastS=-1;}
    else{st.lastO=O.IO;st.lastS=-1;}
    return v;
  };
  cpuWrite=function(a,v,...rest){
    a&=0xffff;let o=O.COMPUTED,s=-1;const op=st.op;
    if(op>=0){const sem=SEM[op],k=sem[0];
      if(k===K.STORE||k===K.PUSH){o=regO[sem[1]];s=regS[sem[1]];}
      else if(k===K.RMW||k===K.UNOFFICIAL){const mn=MN[op];comb(st.lastO,st.lastS,mn==='ROL'||mn==='ROR'?regO[CY]:O.COMPUTED,mn==='ROL'||mn==='ROR'?regS[CY]:-1);o=c0;s=c1;}}
    if(a<0x2000){const i=a&0x7ff;ramO[i]=o;ramS[i]=s;}
    else if(a<0x4000){if((a&7)===7){st.pend=true;st.pendO=o;st.pendS=s;}}
    else if(a>=0x6000&&a<0x8000){const i=a-0x6000;sramO[i]=o;sramS[i]=s;}
    else if(a>=0x8000){if(bankWrites.length<maxBankWrites)bankWrites.push([emu.frameCount,a,v&255,st.pcFile]);else counts.droppedBankWrites++;}
    try{return prev.write.call(this,a,v,...rest);}finally{st.pend=false;}
  };
  ppuBusWrite=function(a,v,...rest){
    const x=a&0x3fff;
    if(x<0x2000){
      if(n){counts.patternWrites++;
        const off=(emu.mapper===4?(emu.chrPages?.[x>>10]||0)+(x&1023):(x<4096?emu.chrBank0:emu.chrBank1)+(x&4095))%n;
        const o=st.pend?st.pendO:O.UNKNOWN,s=st.pend?st.pendS:-1,w=st.pcFile,f=emu.frameCount;
        origin[off]=o;src[off]=s;writes[off]++;lastFrame[off]=f;writer[off]=w;
        const t=off>>4;if(!dirty[t]){dirty[t]=1;dirtyList.push(t);}if(lastUpload[t]!==f){lastUpload[t]=f;if(uploadFrames[t]<65535)uploadFrames[t]++;}
        let row=writers.get(w);if(!row)writers.set(w,row=[0,0,0,0,0,0]);row[0]++;row[o>=0?1:o===O.DERIVED?2:o===O.VRAM?4:o===O.UNKNOWN?5:3]++;
        if(cur&&cur[0]===f&&off===cur[2]){cur[2]++;cur[3]++;}
        else if(batches.length<maxBatches){cur=[f,off,off+1,1,w,o];batches.push(cur);}else{cur=null;counts.droppedBatches++;}}
    }else if(x<0x3f00)counts.nametableWrites++;else counts.paletteWrites++;
    return prev.ppu.call(this,a,v,...rest);
  };
  const tracer={
    startFrame,
    // after each emulated frame: how many contents each tile slot written in that frame has held
    // a tile's content counts as a version once a whole frame has passed without writes to it (an upload spread over
    // several frames is one version, not one per frame)
    endFrame(){counts.frames++;const ram=emu.chrRam;
      for(const t of settling){if(dirty[t])continue;const h=fnv(ram,t*16,t*16+16);let set=hashes[t];if(!set)set=hashes[t]=new Set();if(!set.has(h)&&set.size<maxVersions){set.add(h);versions[t]=set.size;}}
      settling=dirtyList.slice();for(const t of dirtyList)dirty[t]=0;dirtyList.length=0;},
    // the trace tables, and what the PPU shows now, copied
    capture(){
      const chr=emu.hasChrRam?emu.chrRam.slice():null;
      for(const t of [...settling,...dirtyList]){const h=fnv(emu.chrRam,t*16,t*16+16);let set=hashes[t];if(!set)set=hashes[t]=new Set();if(!set.has(h)&&set.size<maxVersions){set.add(h);versions[t]=set.size;}}
      return {format:'NESForgeChrTrace',version:1,frame:emu.frameCount,startFrame,mapper:emu.mapper,chrRam:!!n,
        chr,trace:n?{origin:origin.slice(),src:src.slice(),writes:writes.slice(),lastFrame:lastFrame.slice(),writer:writer.slice(),versions:versions.slice(),uploadFrames:uploadFrames.slice()}:null,
        ppu:{ctrl:emu.ppuCtrl,mask:emu.ppuMask,mirroring:emu.mirroring,vAddr:emu.vAddr,tAddr:emu.tAddr,fineX:emu.fineX,scrollX:((emu.tAddr&31)<<3)|(emu.fineX&7),scrollY:((emu.tAddr>>5)&31)*8+((emu.tAddr>>12)&7),
          backgroundTable:emu.ppuCtrl&16?0x1000:0,spriteTable:emu.ppuCtrl&8?0x1000:0,tallSprites:!!(emu.ppuCtrl&32)},
        vram:emu.vram.slice(),palette:Array.from(emu.palRam),oam:emu.oamMem?Array.from(emu.oamMem):[],
        banks:{prg:[0x8000,0xa000,0xc000,0xe000].map(a=>prgFile(a)),chr:emu.mapper===4?Array.from(emu.chrPages||[]):[emu.chrBank0,emu.chrBank1]},
        writers:[...writers.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,48).map(([pc,r])=>({...(pc>=0?{fileOffset:pc}:{ramAddress:-1-pc}),writes:r[0],copied:r[1],derived:r[2],generated:r[3],vram:r[4],untraced:r[5]})),
        batches:batches.slice(-512).map(b=>({frame:b[0],chrOffset:b[1],bytes:b[3],...(b[4]>=0?{writerFileOffset:b[4]}:{writerRamAddress:-1-b[4]}),firstOrigin:b[5]})),batchesTotal:batches.length,
        bankWrites:bankWrites.slice(-256).map(b=>({frame:b[0],address:b[1],value:b[2],writerFileOffset:b[3]})),bankWritesTotal:bankWrites.length,
        tested:[...tested.entries()].map(([o,set])=>[o,...set]),
        counts:{...counts},truncated:counts.droppedBatches>0||counts.droppedBankWrites>0};
    },
    uninstall(){if(active!==tracer)return;cpuStepRaw=prev.step;cpuRead=prev.read;cpuWrite=prev.write;ppuBusWrite=prev.ppu;active=null;},
  };
  active=tracer;return tracer;
}
// the classification of a captured CHR RAM, with the tiles the background and sprites use marked
function analyze(cap,rom){
  if(!cap?.chr||!cap.trace)return {rows:[],summary:null,reason:'the cartridge has CHR ROM; its graphics are located by bank, not traced'};
  const head=16+((rom[6]&4)?512:0),rows=P.classify({chr:cap.chr,trace:cap.trace,rom,prgStart:head,prgBytes:rom[4]*16384,tested:cap.tested?new Map(cap.tested.map(([o,...c])=>[o,c])):null});
  const used=usedTiles(cap),byTile=new Map(rows.map(r=>[r.tile,r]));
  for(const t of used.background)if(byTile.has(t))byTile.get(t).background=true;
  for(const t of used.sprites)if(byTile.has(t))byTile.get(t).sprite=true;
  const shown=rows.filter(r=>r.background||r.sprite);
  return {rows,summary:P.summarize(rows),shown:P.summarize(shown),used:{background:used.background.size,sprites:used.sprites.size}};
}
// CHR RAM tile slots (0..511) the visible nametable and the sprites refer to
function usedTiles(cap){
  const bg=new Set(),sp=new Set(),base=cap.ppu.backgroundTable>>4;
  // referenced by the nametables (whether or not rendering is on at the moment of capture)
  for(let i=0;i<cap.vram.length;i++){if((i&0x3ff)<960)bg.add(base+cap.vram[i]);}
  if(cap.ppu.mask&16)for(let i=0;i+3<cap.oam.length;i+=4){if(cap.oam[i]>=0xef)continue;const t=cap.oam[i+1];if(cap.ppu.tallSprites){const b=(t&1)?256:0;sp.add(b+(t&0xfe));sp.add(b+(t&0xfe)+1);}else sp.add((cap.ppu.spriteTable>>4)+t);}
  return {background:bg,sprites:sp};
}
services.RecoveryTrace=Object.freeze({install,analyze,usedTiles,active:()=>!!active});
})();
