const emu={
  loaded:false, running:false, frameCount:0, cyclesPerFrame:29780,
  // ROM data
  prgRom:null, chrRom:null, chrRam:new Uint8Array(8192), hasChrRam:false,
  prgSize:0, prgMask:0, mapper:0,
  mirroring:0,
  // MMC1 state
  mmc1Shift:0x10, mmc1Ctrl:0x0C, mmc1Chr0:0, mmc1Chr1:0, mmc1Prg:0,
  // MMC3 state
  mmc3BankSel:0, mmc3Banks:[0,0,0,0,0,0,0,0], mmc3Mirror:0,
  mmc3IrqLatch:0, mmc3IrqCounter:0, mmc3IrqEnabled:false, mmc3IrqReload:false,
  mmc3PrgMode:0, mmc3ChrMode:0,
  // 8KB PRG page offsets for MMC3 ($8000,$A000,$C000,$E000)
  prgPage:[0,0,0,0],
  // PRG/CHR bank pointers (byte offsets into ROM)
  prgBank0:0, prgBank1:0, chrBank0:0, chrBank1:0,
  // Split-rendering: CHR banks before/after sprite 0 hit
  chrBank0Pre:0, chrBank1Pre:0, chrBank0Post:0, chrBank1Post:0, spr0Line:-1,
  // Scroll state before/after sprite-0 hit
  tAddrPre:0, fineXPre:0, tAddrPost:0, fineXPost:0,
  // CPU registers
  A:0, X:0, Y:0, SP:0xFD, PC:0, C:0, Z:0, I:1, D:0, V:0, N:0,
  cycles:0, opsMissed:0,
  // Memory
  ram:new Uint8Array(2048),
  // PPU
  vram:new Uint8Array(2048), palRam:new Uint8Array(32), oamMem:new Uint8Array(256),
  ppuCtrl:0, ppuMask:0, ppuStatus:0x80, oamAddr:0,
  vAddr:0, tAddr:0, wLatch:false, ppuBuf:0, fineX:0,
  // Input
  joyState:0, joyShift:0, joyStrobe:false,
  // APU state
  apuRegs:new Uint8Array(32), apuStatus:0, apuFrameCounter:0,
  irqPending:false,
  sram:null, // 8KB SRAM ($6000-$7FFF)
  // Animation frame ID
  rafId:null
};

// ── Key state for controller ──
const emuKeys={};


function emuReadJoyState(){if(S.tab!=='emu')return 0;let value=0;[['KeyZ','KeyA'],['KeyX','KeyS'],['ShiftLeft','ShiftRight'],['Enter'],['ArrowUp'],['ArrowDown'],['ArrowLeft'],['ArrowRight']].forEach((keys,i)=>{if(keys.some(k=>emuKeys[k]))value|=1<<i;});return value;}

// ── PPU nametable mirroring ──
function ppuMirror(a){a&=0xFFF;return emu.mirroring===4?a:emu.mirroring===0?((a>>1)&0x400)|(a&0x3FF):emu.mirroring===1?a&0x7FF:emu.mirroring===3?0x400|(a&0x3FF):a&0x3FF;}

// ── PPU read/write (with CHR-RAM and bank switching support) ──
function ppuBusRead(a){a&=0x3FFF;if(a<0x2000){const source=emu.hasChrRam?emu.chrRam:emu.chrRom;if(!source?.length)return 0;let offset;if(emu.mapper===4)offset=(emu.chrPages?.[a>>10]||0)+(a&1023);else offset=(a<4096?emu.chrBank0:emu.chrBank1)+(a&4095);return source[offset%source.length]||0;}if(a<0x3F00)return emu.vram[ppuMirror(a-0x2000)]||0;let p=a&31;if((p&19)===16)p-=16;return emu.palRam[p]&63;}
function ppuBusWrite(a,v){a&=0x3FFF;v&=255;if(a<8192){if(emu.hasChrRam){const off=emu.mapper===4?(emu.chrPages?.[a>>10]||0)+(a&1023):(a<4096?emu.chrBank0:emu.chrBank1)+(a&4095);emu.chrRam[off%emu.chrRam.length]=v;}return;}if(a<0x3F00){emu.vram[ppuMirror(a-0x2000)]=v;return;}let p=a&31;if((p&19)===16)p-=16;emu.palRam[p]=v&63;if((p&3)===0)emu.palRam[p^16]=v&63;}

// ── CPU memory bus ──
function cpuRead(a){
  a&=0xFFFF;
  if(a<0x2000) return emu.ram[a&0x7FF];
  if(a<0x4000){
    switch(a&7){
      case 2:{ // PPUSTATUS
        const v=emu.ppuStatus;
        emu.ppuStatus&=0x7F; // clear vblank
        emu.wLatch=false;
        return v;
      }
      case 4: return emu.oamMem[emu.oamAddr];
      case 7:{
        let v=emu.ppuBuf;
        const addr=emu.vAddr&0x3FFF;
        emu.ppuBuf=ppuBusRead(addr);
        if(addr>=0x3F00){v=ppuBusRead(addr);emu.ppuBuf=ppuBusRead(addr-0x1000);} // palette bypass; underlying NT refills buffer
        emu.vAddr=(emu.vAddr+((emu.ppuCtrl&4)?32:1))&0x7FFF;
        return v;
      }
    }
    return 0;
  }
  if(a===0x4016){
    if(emu.joyStrobe) return emuReadJoyState()&1;
    const v=(emu.joyShift&1)|0x40;
    emu.joyShift=(emu.joyShift>>>1)|0x80;
    return v;
  }
  if(a===0x4017) return 0x40; // Controller 2 (not connected, open bus)
  if(a===0x4015) return apuCore.readStatus(); // length counters + frame/DMC IRQ flags
  if(a>=0x4000&&a<0x4020) return 0; // APU/IO registers
  if(a>=0x6000&&a<0x8000) return emu.sram?emu.sram[a&0x1FFF]:0; // SRAM/WRAM
  if(a>=0x8000){
    if(emu.mapper===4){
      // MMC3: 4 × 8KB pages
      const page=(a>>13)&3; // 0=$8000,1=$A000,2=$C000,3=$E000
      return emu.prgRom[(emu.prgPage[page]+(a&0x1FFF))%emu.prgSize];
    }
    if(a>=0xC000) return emu.prgRom[(emu.prgBank1+(a&0x3FFF))%emu.prgSize];
    return emu.prgRom[(emu.prgBank0+(a&0x3FFF))%emu.prgSize];
  }
  return 0;
}
function cpuWrite(a,v){
  a&=0xFFFF;v&=0xFF;
  if(a<0x2000){emu.ram[a&0x7FF]=v;return}
  if(a<0x4000){
    switch(a&7){
      case 0:emu.ppuCtrl=v;emu.tAddr=(emu.tAddr&0x73FF)|((v&3)<<10);break;
      case 1:emu.ppuMask=v;break;
      case 3:emu.oamAddr=v;break;
      case 4:emu.oamMem[emu.oamAddr++]=v;emu.oamAddr&=0xFF;break;
      case 5:
        if(!emu.wLatch){emu.fineX=v&7;emu.tAddr=(emu.tAddr&0x7FE0)|(v>>3)}
        else{emu.tAddr=(emu.tAddr&0x0C1F)|((v&7)<<12)|((v>>3)<<5)}
        emu.wLatch=!emu.wLatch;break;
      case 6:
        if(!emu.wLatch){emu.tAddr=(emu.tAddr&0x00FF)|((v&0x3F)<<8)}
        else{emu.tAddr=(emu.tAddr&0xFF00)|v;emu.vAddr=emu.tAddr;
          // A visible $2006 second write reloads vertical position immediately.
          // Keep the scanline renderer and its capture trace on the same view.
          if(emu._ppuFrameLine>=0&&emu._ppuFrameLine<240&&(emu.ppuMask&24)){
            emu._rasterYBase=((emu.vAddr>>5)&31)*8+((emu.vAddr>>12)&7)-emu._ppuFrameLine;
            emu._rasterNTY=(emu.vAddr>>11)&1;
          }
        }
        emu.wLatch=!emu.wLatch;break;
      case 7:
        ppuBusWrite(emu.vAddr,v);
        emu.vAddr=(emu.vAddr+((emu.ppuCtrl&4)?32:1))&0x7FFF;break;
    }
    return;
  }
  if(a===0x4014){// OAM DMA
    const base=v<<8;
    for(let i=0;i<256;i++) emu.oamMem[(emu.oamAddr+i)&0xFF]=cpuRead(base+i);
    emu.cycles+=513+(emu.cycles&1);return;
  }
  if(a===0x4016){
    if(v&1){emu.joyStrobe=true}
    else{if(emu.joyStrobe){emu.joyShift=emuReadJoyState()}emu.joyStrobe=false}
  }
  // APU register writes
  if(a>=0x4000&&a<=0x4013){emu.apuRegs[a-0x4000]=v;apuWrite(a,v);return}
  if(a===0x4015){emu.apuStatus=v;apuWrite(a,v);return}
  if(a===0x4017){emu.apuFrameCounter=v;apuWrite(a,v);return}
  // SRAM ($6000-$7FFF)
  if(a>=0x6000&&a<0x8000){if(emu.sram)emu.sram[a&0x1FFF]=v;return}
  // Mapper writes ($8000+)
  if(a>=0x8000) mapperWrite(a,v);
}

function mapperWrite(a,v){
  if(emu.mapper===1) mmc1Write(a,v);
  else if(emu.mapper===2) uxromWrite(a,v);
  else if(emu.mapper===3) cnromWrite(a,v);
  else if(emu.mapper===4) mmc3Write(a,v);
  else if(emu.mapper===7) axromWrite(a,v);
  else if(emu.mapper===66) gxromWrite(a,v);
  else if(emu.mapper===11) colorDreamsWrite(a,v);
}

// ── MMC1 (Mapper 1) ──
function mmc1Write(a,v){
  if(v&0x80){
    // Reset shift register
    emu.mmc1Shift=0x10;
    emu.mmc1Ctrl|=0x0C; // set PRG mode 3
    mmc1UpdateBanks();
    return;
  }
  // Serial port: shift in bit 0
  const complete=emu.mmc1Shift&1; // bit will shift out = register full after this write
  emu.mmc1Shift=(emu.mmc1Shift>>1)|((v&1)<<4);
  if(complete){
    const reg=(a>>13)&3; // 0=$8000 1=$A000 2=$C000 3=$E000
    const val=emu.mmc1Shift;
    switch(reg){
      case 0:emu.mmc1Ctrl=val;break; // Control
      case 1:emu.mmc1Chr0=val;break; // CHR bank 0
      case 2:emu.mmc1Chr1=val;break; // CHR bank 1
      case 3:emu.mmc1Prg=val&0x0F;break; // PRG bank (bits 0-3)
    }
    emu.mmc1Shift=0x10;
    mmc1UpdateBanks();
  }
}

function mmc1UpdateBanks(){
  const ctrl=emu.mmc1Ctrl;
  // Mirroring: bits 0-1
  const mir=ctrl&3;
  if(mir===0) emu.mirroring=2; // one-screen lower
  else if(mir===1) emu.mirroring=3; // one-screen upper
  else if(mir===2) emu.mirroring=1; // vertical
  else emu.mirroring=0; // horizontal

  // PRG mode: bits 2-3
  const prgMode=(ctrl>>2)&3;
  const prgBanks=emu.prgSize/16384;
  const lastBank=(prgBanks-1)*16384;
  switch(prgMode){
    case 0:case 1: // 32KB mode: bank = PRG register with bit 0 cleared
      emu.prgBank0=(emu.mmc1Prg&0x0E)*16384;
      emu.prgBank1=emu.prgBank0+16384;
      break;
    case 2: // Fix first bank at $8000, switch $C000
      emu.prgBank0=0;
      emu.prgBank1=emu.mmc1Prg*16384;
      break;
    case 3: // Switch $8000, fix last bank at $C000
      emu.prgBank0=emu.mmc1Prg*16384;
      emu.prgBank1=lastBank;
      break;
  }
  // Clamp to ROM size
  emu.prgBank0%=emu.prgSize;
  emu.prgBank1%=emu.prgSize;

  // CHR mode: bit 4
  if(emu.chrRom||emu.hasChrRam){
    const chrSize=emu.hasChrRam?emu.chrRam.length:emu.chrRom.length;
    if(ctrl&0x10){
      // 4KB mode
      emu.chrBank0=(emu.mmc1Chr0*4096)%chrSize;
      emu.chrBank1=(emu.mmc1Chr1*4096)%chrSize;
    } else {
      // 8KB mode (bit 0 of chr0 ignored)
      emu.chrBank0=((emu.mmc1Chr0&0x1E)*4096)%chrSize;
      emu.chrBank1=emu.chrBank0+4096;
      if(emu.chrBank1>=chrSize) emu.chrBank1=0;
    }
  }
}

// ── UxROM (Mapper 2) ──
function uxromWrite(a,v){
  emu.prgBank0=(v*16384)%emu.prgSize;
  // prgBank1 stays fixed at last bank (set during ROM load)
}

// ── 6502 CPU ──
function cpuRead16(a){return cpuRead(a)|(cpuRead((a+1)&0xFFFF)<<8)}
function cpuRead16Bug(a){return cpuRead(a)|(cpuRead((a&0xFF00)|((a+1)&0xFF))<<8)} // page wrap bug
function cpuPush(v){cpuWrite(0x100|emu.SP,v);emu.SP=(emu.SP-1)&0xFF}
function cpuPull(){emu.SP=(emu.SP+1)&0xFF;return cpuRead(0x100|emu.SP)}
function cpuGetP(){return(emu.C)|(emu.Z<<1)|(emu.I<<2)|(emu.D<<3)|(1<<5)|(emu.V<<6)|(emu.N<<7)}
function cpuSetP(v){emu.C=v&1;emu.Z=(v>>1)&1;emu.I=(v>>2)&1;emu.D=(v>>3)&1;emu.V=(v>>6)&1;emu.N=(v>>7)&1}
function setNZ(v){emu.N=(v>>7)&1;emu.Z=v===0?1:0}

function cpuNmi(){cpuPush((emu.PC>>8)&0xFF);cpuPush(emu.PC&0xFF);cpuPush(cpuGetP()&~0x10);emu.I=1;emu.PC=cpuRead16(0xFFFA);emu.cycles+=7;apuClock(7)}

function cpuStep(){
  const before=emu.cycles;cpuStepRaw();const elapsed=emu.cycles-before;
  if(!Number.isFinite(elapsed)||elapsed<=0||elapsed>2048)throw Error('CPU cycle progression is invalid');
  apuClock(elapsed);emu.PC&=65535;
}
const emuCPUCore=Forge6502Core.create(emu,a=>cpuRead(a),(a,v)=>cpuWrite(a,v));
function cpuStepRaw(){return emuCPUCore.step();}

// ── Frame runner ──
function emuRunFrame(){if(!emu.loaded)return;const deadline=performance.now()+200;const start=emu._nextFrameCycle??emu.cycles;if(!Number.isFinite(start)||!Number.isFinite(emu.cycles))throw Error("Invalid CPU clock");emu.ppuStatus&=0x1F;emu.spr0Line=-1;emu.tAddrPre=emu.tAddr;emu.fineXPre=emu.fineX;emu.chrBank0Pre=emu.chrBank0;emu.chrBank1Pre=emu.chrBank1;const scrollY=((emu.tAddr>>5)&31)*8+((emu.tAddr>>12)&7),ntY=(emu.tAddr>>11)&1;emu._rasterYBase=scrollY;emu._rasterNTY=ntY;
  const stepTo=target=>{let steps=0;while(emu.cycles<target){if((emu.irqPending||apuCore.irq)&&!emu.I){cpuPush(emu.PC>>8);cpuPush(emu.PC&255);cpuPush(cpuGetP()&~16);emu.I=1;emu.PC=cpuRead16(0xFFFE);emu.cycles+=7;apuClock(7);}cpuStep();emu.PC&=65535;if(++steps>20000)throw new Error('CPU did not advance safely');}};
  try{for(let line=0;line<262;line++){if((line&15)===0&&performance.now()>deadline)throw Error("Frame exceeded 200 ms safety budget; paused to protect the page");const lineStart=start+line*341/3;emu._ppuFrameLine=line;if(line<240){const hit=renderEmuLine(line,emu._rasterYBase,emu._rasterNTY);if(hit>=0&&!(emu.ppuStatus&64)){stepTo(lineStart+hit/3);emu.ppuStatus|=64;emu.spr0Line=line;}stepTo(start+(line+1)*341/3);if(emu.mapper===4)mmc3ScanlineTick();}else {if(line===241){emu.ppuStatus|=128;if(emu.ppuCtrl&128)cpuNmi();}stepTo(start+(line+1)*341/3);}}
  }finally{emu._ppuFrameLine=-1;}emu._nextFrameCycle=start+262*341/3;emu.tAddrPost=emu.tAddr;emu.fineXPost=emu.fineX;emu.chrBank0Post=emu.chrBank0;emu.chrBank1Post=emu.chrBank1;emu.frameCount++;
}

// ── Reset ──
function emuDoReset(){emu._ppuFrameLine=-1;emu.A=emu.X=emu.Y=0;emu.SP=0xFD;emu.C=emu.Z=emu.D=emu.V=emu.N=0;emu.I=1;emu.cycles=0;emu.frameCount=0;emu._nextFrameCycle=0;emu.ram.fill(0);emu.vram.fill(0);emu.palRam.fill(0);emu.oamMem.fill(255);if(emu.hasChrRam)emu.chrRam.fill(0);emu.mirroring=emu.initialMirror??1;emu.prgBank0=0;emu.prgBank1=Math.max(0,emu.prgSize-16384);emu.chrBank0=0;emu.chrBank1=4096;emu.chrPages=Array.from({length:8},(_,i)=>i*1024);if(emu.mapper===1){emu.mmc1Shift=0x10;emu.mmc1Ctrl=0x0C;emu.mmc1Chr0=emu.mmc1Chr1=emu.mmc1Prg=0;mmc1UpdateBanks();}if(emu.mapper===4){emu.mmc3Banks.fill(0);emu.mmc3BankSel=emu.mmc3PrgMode=emu.mmc3ChrMode=emu.mmc3IrqLatch=emu.mmc3IrqCounter=0;emu.mmc3IrqEnabled=emu.mmc3IrqReload=false;mmc3UpdateBanks();}if([7,11,66].includes(emu.mapper)){emu.prgBank1=16384%emu.prgSize;if(emu.mapper===7)emu.mirroring=2;}emu.irqPending=false;emu.apuRegs.fill(0);emu.apuStatus=emu.apuFrameCounter=0;emu.ppuCtrl=emu.ppuMask=emu.oamAddr=0;emu.ppuStatus=0;emu.vAddr=emu.tAddr=emu.ppuBuf=emu.fineX=0;emu.wLatch=false;emu.joyShift=emu.joyState=0;emu.joyStrobe=false;emu.spr0Line=-1;emu.tAddrPre=emu.tAddrPost=emu.fineXPre=emu.fineXPost=0;emu.chrBank0Pre=emu.chrBank0Post=emu.chrBank0;emu.chrBank1Pre=emu.chrBank1Post=emu.chrBank1;emu.PC=cpuRead16(0xFFFC);apuSilence();apuReset();emu.opsMissed=0;emuPerf.fps=emuPerf.frameMs=emuPerf.maxFrameMs=emuPerf.dropped=emuPerf.backlogMs=emuPerf.budgetYields=0;if(emu.frameBuffer)emu.frameBuffer.fill(0);if(emu.bgFrameBuffer)emu.bgFrameBuffer.fill(0);}

// ── Load ROM into emulator ──
async function emuLoadRom(e){
  const f=e.target.files[0];e.target.value='';if(!f)return;
  emuPause();const readToken=emu.loadGeneration;
  try{
    const bytes=new Uint8Array(await f.arrayBuffer());if(readToken!==emu.loadGeneration)return;
    if(!emuLoadRomData(bytes,f.name,0))return;switchTab('emu');
    const token=emu.loadGeneration;emu.loading=true;emuLog('Initializing 30 frames; Run, Pause or Reset can interrupt this.');
    for(let i=0;i<30;i++){
      if(token!==emu.loadGeneration||emu.running)return;
      emuRunFrame();if((i&1)===1){renderEmu();emuUpdatePerformance(true);await new Promise(r=>setTimeout(r,0));}
    }
    if(token===emu.loadGeneration){emu.loading=false;renderEmu();emuUpdatePerformance(true);emuLog('Ready at frame '+emu.frameCount+'. Press Run to play.');}
  }catch(err){emuPause();reportError(err);}
}

// ── Run/pause ──
// Frame timestamps are not interchangeable with performance.now(). A negative
// frame count made v1.4's `while(frames--)` run forever. Anchor to the first RAF,
// reject invalid clocks and use a bounded, positively-tested loop instead.
const EMU_FRAME_MS=1000/60.0988;
const EMU_MAX_PENDING_FRAMES=4,EMU_MAX_SLICE_MS=40;
let emuLastFrameTime=null,emuAccumulator=0,emuRunGeneration=0;
const emuPerf={fps:0,frameMs:0,maxFrameMs:0,dropped:0,backlogMs:0,budgetYields:0,frames:0,since:0,lastHUD:0};
function emuToggleRun(){
  if(!emu.loaded)return;
  if(emu.running){emuPause();return;}
  emu.loadGeneration=(emu.loadGeneration||0)+1;emu.loading=false;
  emu.running=true;emuLastFrameTime=null;emuAccumulator=0;
  emuPerf.frames=0;emuPerf.backlogMs=0;emuPerf.since=performance.now();emuPerf.lastHUD=0;
  const generation=++emuRunGeneration;
  document.getElementById('emuRunBtn').textContent='⏸ Pause';apuStart();
  emu.rafId=requestAnimationFrame(t=>emuLoop(t,generation));
  emuLog('Running '+(emu.romName||'ROM')+'. Click Pause to stop.');
}
function emuLoop(now,generation=emuRunGeneration){
  if(!emu.running||generation!==emuRunGeneration)return;
  emu.rafId=null;
  try{
    if(!Number.isFinite(now))throw Error('Invalid animation timestamp');
    if(emuLastFrameTime===null){emuLastFrameTime=now;}
    else if(now>=emuLastFrameTime){
      const elapsed=now-emuLastFrameTime;emuLastFrameTime=now;
      if(!Number.isFinite(elapsed))throw Error('Invalid animation timestamp delta');
      // Keep the former 250 ms elapsed safety cap, accounting for discarded
      // whole frames and carrying the fraction so clock phase stays consistent.
      const acceptedElapsed=Math.min(250,elapsed),stalledMs=elapsed-acceptedElapsed;
      emuPerf.dropped+=Math.floor(stalledMs/EMU_FRAME_MS);
      emuAccumulator+=acceptedElapsed+stalledMs%EMU_FRAME_MS;
      // A 30 Hz callback may owe two or occasionally three NES frames. Keep
      // unfinished work for the next callback instead of silently halving speed.
      // Long stalls retain at most four whole frames plus the fractional phase;
      // every discarded frame is reported rather than growing a catch-up spiral.
      const excess=Math.max(0,Math.floor(emuAccumulator/EMU_FRAME_MS)-EMU_MAX_PENDING_FRAMES);
      if(excess){emuPerf.dropped+=excess;emuAccumulator-=excess*EMU_FRAME_MS;}
      const sliceBudget=Math.min(EMU_MAX_SLICE_MS,Math.max(EMU_FRAME_MS,acceptedElapsed));
      const sliceStart=performance.now();let completed=0;
      for(let i=0;i<EMU_MAX_PENDING_FRAMES&&emuAccumulator>=EMU_FRAME_MS;i++){
        const start=performance.now();emuRunFrame();const cost=performance.now()-start;
        emuPerf.frameMs=cost;emuPerf.maxFrameMs=Math.max(emuPerf.maxFrameMs,cost);emuPerf.frames++;
        emuAccumulator-=EMU_FRAME_MS;completed++;apuFlush();
        // Yield only between complete CPU/APU/PPU frames. The frame runner's
        // own safety deadline still applies if one frame exceeds this budget.
        if(performance.now()-sliceStart>=sliceBudget){
          if(emuAccumulator>=EMU_FRAME_MS)emuPerf.budgetYields++;
          break;
        }
      }
      emuPerf.backlogMs=emuAccumulator;
      if(completed&&S.tab==='emu')renderEmu();
    }
    // Earlier timestamps do no work and do not move our clock backwards.
    emuUpdatePerformance();
    if(emu.running&&generation===emuRunGeneration)emu.rafId=requestAnimationFrame(t=>emuLoop(t,generation));
  }catch(e){emuPause();emuLog('Stopped safely: '+e.message);reportError(e);}
}
function emuUpdatePerformance(force=false){
  emuPerf.backlogMs=emuAccumulator;
  const el=document.getElementById('emuPerformance');if(!el)return;const now=performance.now();
  if(!force&&now-emuPerf.lastHUD<250)return;emuPerf.lastHUD=now;
  if(emu.running&&now-emuPerf.since>=1000){emuPerf.fps=emuPerf.frames*1000/(now-emuPerf.since);emuPerf.since=now;emuPerf.frames=0;}
  const queue=apuCtx?Math.max(0,apuNextTime-apuCtx.currentTime)*1000:0;
  el.textContent=(emu.loading?'Initializing':emu.running?'Running':'Paused')+' · '+(emu.running?emuPerf.fps.toFixed(1)+' fps · ':'')+'F'+emu.frameCount+
    ' · frame '+emuPerf.frameMs.toFixed(1)+' ms · audio '+(apuMuted?'muted':apuCtx?.state==='running'?Math.round(queue)+' ms buffered':'off')+
    ' · resyncs '+apuStats.resyncs+' · gaps '+apuStats.underruns;
  el.title='Emulation FPS, frame processing time and bounded audio queue. Low FPS or repeated audio gaps indicate the device cannot keep pace.';
}
function emuStep(){if(!emu.loaded)return;emuPause();try{emuRunFrame();renderEmu();emuLog('Frame '+emu.frameCount);emuUpdatePerformance(true);}catch(e){reportError(e);}}
function emuReset(){if(!emu.loaded)return;emuPause();clearEmuKeys();try{emuDoReset();renderEmu();emuLog('Reset and paused. Press Run to start.');emuUpdatePerformance(true);}catch(e){reportError(e);}}


// ── Capture PPU state as a scene ──

// ── Render emulator view ──
// ── Read CHR byte from ROM or RAM ──
function emuChrByte(addr){return ppuBusRead(addr&8191);}

function renderEmu(){const c=document.getElementById('emuCanvas'),x=c.getContext('2d');if(!emu.loaded||!emu.frameBuffer){x.fillStyle='#111';x.fillRect(0,0,256,240);x.fillStyle='#aaa';x.font='12px monospace';x.textAlign='center';x.fillText('Load a ROM or Build & Run',128,120);x.textAlign='start';return;}x.putImageData(new ImageData(emu.frameBuffer,256,240),0,0);const hex=(v,n=2)=>(v||0).toString(16).toUpperCase().padStart(n,'0');for(const [id,value]of Object.entries({rA:hex(emu.A),rX:hex(emu.X),rY:hex(emu.Y),rSP:hex(emu.SP),rPC:hex(emu.PC,4),rP:hex(cpuGetP()),rCyc:emu.cycles,rFrm:emu.frameCount})){document.getElementById(id).textContent=value;}updateEmuSidebar();}

function emuLog(msg){const el=document.getElementById('emuLog');if(el){const lines=(el.textContent+'\n'+msg).split('\n');el.textContent=lines.slice(-200).join('\n');el.scrollTop=el.scrollHeight;}}

function emuTrace(){
  if(!emu.loaded)return;
  emuPause();
  const el=document.getElementById('emuLog');
  emuLog('── TRACE: 20 instructions from PC=$'+emu.PC.toString(16).toUpperCase().padStart(4,'0')+' ──');
  for(let i=0;i<20;i++){
    const pc=emu.PC;
    const op=cpuRead(pc);
    const b1=cpuRead((pc+1)&0xFFFF);
    const b2=cpuRead((pc+2)&0xFFFF);
    const before='$'+pc.toString(16).toUpperCase().padStart(4,'0')+': '+
      op.toString(16).toUpperCase().padStart(2,'0')+' '+
      b1.toString(16).toUpperCase().padStart(2,'0')+' '+
      b2.toString(16).toUpperCase().padStart(2,'0')+
      '  A=$'+emu.A.toString(16).toUpperCase().padStart(2,'0')+
      ' X=$'+emu.X.toString(16).toUpperCase().padStart(2,'0')+
      ' Y=$'+emu.Y.toString(16).toUpperCase().padStart(2,'0')+
      ' SP=$'+emu.SP.toString(16).toUpperCase().padStart(2,'0')+
      ' P='+cpuGetP().toString(2).padStart(8,'0');
    emuLog(before);
    cpuStep();
  }
  emuLog('── After trace: PC=$'+emu.PC.toString(16).toUpperCase().padStart(4,'0')+
    ' NT='+Array.from(emu.vram.slice(0,960)).filter(v=>v!==0).length+
    ' PAL='+Array.from(emu.palRam).filter(v=>v!==0).length+' ──');
  renderEmu();
}


// ═══════════════════════════════════════════════
// NES FORGE: APU AUDIO ENGINE
// ═══════════════════════════════════════════════
// NES Forge 1.4.1: CPU-clocked sound. The old wall-clock oscillator approximation
// has been removed. Register writes are instruction-granular, not bus-cycle exact.
// Hardware reference: https://www.nesdev.org/wiki/APU and linked channel pages.
const APU_NTSC_CPU=1789773;
const APU_SAMPLE_RATE=48000;
const APU_LENGTH=[10,254,20,2,40,4,80,6,160,8,60,10,14,12,26,14,12,16,24,18,48,20,96,22,192,24,72,26,16,28,32,30];
const APU_NOISE_PERIOD=[4,8,16,32,64,96,128,160,202,254,380,508,762,1016,2034,4068];
const APU_DMC_PERIOD=[428,380,340,320,286,254,226,214,190,160,142,128,106,84,72,54];
const APU_DUTY=[[0,1,0,0,0,0,0,0],[0,1,1,0,0,0,0,0],[0,1,1,1,1,0,0,0],[1,0,0,1,1,1,1,1]];
const APU_TRIANGLE=Array.from({length:32},(_,i)=>i<16?15-i:i-16);
const APU_PULSE_MIX=Float64Array.from({length:31},(_,n)=>n?95.88/(8128/n+100):0);
const APU_TND_MIX=Float64Array.from({length:32768},(_,i)=>{const n=(i>>11)/8227+((i>>7)&15)/12241+(i&127)/22638;return n?159.79/(1/n+100):0;});
class ForgeAPU{
  constructor(onSample=()=>{},readMemory=()=>0){this.onSample=onSample;this.readMemory=readMemory;this.reset();}
  reset(){
    const pulse=()=>({enabled:false,ctrl:0,length:0,period:0,timer:2,phase:0,env:0,envTimer:0,envStart:false,sweep:0,sweepTimer:0,sweepReload:false});
    this.pulse=[pulse(),pulse()];this.triangle={enabled:false,ctrl:0,length:0,period:0,timer:1,phase:15,linear:0,reload:false};
    this.noise={enabled:false,ctrl:0,length:0,period:4,timer:4,shift:1,short:false,env:0,envTimer:0,envStart:false};
    this.dmc={ctrl:0,level:0,start:0xC000,sampleLength:1,address:0xC000,remaining:0,buffer:-1,shift:0,bits:8,silent:true,timer:428,period:428,irq:false};
    this.cycles=0;this.frameCycle=0;this.fiveStep=false;this.irqInhibit=false;this.frameIRQ=false;this.frameResetDelay=0;this.pendingMode=false;
    this.samplePhase=0;this.sampleSum=0;this.sampleTicks=0;this.samples=0;this.lastInput=0;this.hp90=0;this.lastHP90=0;this.hp440=0;this.lp=0;
    this.h90=Math.exp(-2*Math.PI*90/APU_SAMPLE_RATE);this.h440=Math.exp(-2*Math.PI*440/APU_SAMPLE_RATE);this.l14=1-Math.exp(-2*Math.PI*14000/APU_SAMPLE_RATE);
  }
  get irq(){return this.frameIRQ||this.dmc.irq;}
  sweepTarget(ch,index){const delta=ch.period>>(ch.sweep&7);return ch.sweep&8?ch.period-delta-(index===0?1:0):ch.period+delta;}
  pulseOutput(ch,index){
    if(!ch.enabled||!ch.length||ch.period<8||this.sweepTarget(ch,index)>2047)return 0;
    return APU_DUTY[ch.ctrl>>6][ch.phase]?(ch.ctrl&16?ch.ctrl&15:ch.env):0;
  }
  envelope(ch){
    if(ch.envStart){ch.envStart=false;ch.env=15;ch.envTimer=ch.ctrl&15;}
    else if(ch.envTimer>0)ch.envTimer--;
    else{ch.envTimer=ch.ctrl&15;if(ch.env>0)ch.env--;else if(ch.ctrl&32)ch.env=15;}
  }
  quarter(){
    this.envelope(this.pulse[0]);this.envelope(this.pulse[1]);this.envelope(this.noise);
    const t=this.triangle;if(t.reload)t.linear=t.ctrl&127;else if(t.linear)t.linear--;if(!(t.ctrl&128))t.reload=false;
  }
  half(){
    for(let i=0;i<2;i++){
      const p=this.pulse[i];if(p.length&&!(p.ctrl&32))p.length--;
      const target=this.sweepTarget(p,i);
      if(!p.sweepTimer&&(p.sweep&128)&&(p.sweep&7)&&p.period>=8&&target>=0&&target<=2047)p.period=target;
      if(!p.sweepTimer||p.sweepReload){p.sweepTimer=(p.sweep>>4)&7;p.sweepReload=false;}else p.sweepTimer--;
    }
    const t=this.triangle,n=this.noise;if(t.length&&!(t.ctrl&128))t.length--;if(n.length&&!(n.ctrl&32))n.length--;
  }
  write(address,value){
    const v=value&255,d=this.dmc;
    if(address>=0x4000&&address<=0x4007){
      const p=this.pulse[(address>>2)&1];
      switch(address&3){
        case 0:p.ctrl=v;break;
        case 1:p.sweep=v;p.sweepReload=true;break;
        case 2:p.period=(p.period&0x700)|v;break;
        case 3:p.period=(p.period&255)|((v&7)<<8);if(p.enabled)p.length=APU_LENGTH[v>>3];p.phase=0;p.envStart=true;break;
      }return;
    }
    const t=this.triangle,n=this.noise;
    switch(address){
      case 0x4008:t.ctrl=v;break;
      case 0x400A:t.period=(t.period&0x700)|v;break;
      case 0x400B:t.period=(t.period&255)|((v&7)<<8);if(t.enabled)t.length=APU_LENGTH[v>>3];t.reload=true;break;
      case 0x400C:n.ctrl=v;break;
      case 0x400E:n.period=APU_NOISE_PERIOD[v&15];n.short=!!(v&128);break;
      case 0x400F:if(n.enabled)n.length=APU_LENGTH[v>>3];n.envStart=true;break;
      case 0x4010:d.ctrl=v;d.period=APU_DMC_PERIOD[v&15];if(!(v&128))d.irq=false;break;
      case 0x4011:d.level=v&127;break;
      case 0x4012:d.start=0xC000+(v<<6);break;
      case 0x4013:d.sampleLength=(v<<4)+1;break;
      case 0x4015:
        [this.pulse[0],this.pulse[1],t,n].forEach((ch,i)=>{ch.enabled=!!(v&(1<<i));if(!ch.enabled)ch.length=0;});
        if(!(v&16))d.remaining=0;else if(!d.remaining){d.address=d.start;d.remaining=d.sampleLength;}
        d.irq=false;break;
      case 0x4017:
        this.irqInhibit=!!(v&64);if(this.irqInhibit)this.frameIRQ=false;
        this.pendingMode=!!(v&128);this.frameResetDelay=(this.cycles&1)?3:4;break;
    }
  }
  readStatus(){
    const channels=[this.pulse[0],this.pulse[1],this.triangle,this.noise];let v=0;
    for(let i=0;i<4;i++)if(channels[i].length)v|=1<<i;
    if(this.dmc.remaining)v|=16;if(this.frameIRQ)v|=64;if(this.dmc.irq)v|=128;
    this.frameIRQ=false;return v;
  }
  // Returns DMC stolen CPU cycles; their exact bus alignment remains approximate.
  clock(cycles){
    if(!Number.isInteger(cycles)||cycles<0||cycles>2000000)throw Error('Invalid APU cycle budget');
    let remaining=cycles,stolen=0;const p0=this.pulse[0],p1=this.pulse[1],t=this.triangle,n=this.noise,d=this.dmc;
    while(remaining>0){
      remaining--;this.cycles++;this.frameCycle++;
      if(this.frameResetDelay&&!--this.frameResetDelay){this.fiveStep=this.pendingMode;this.frameCycle=0;if(this.fiveStep){this.quarter();this.half();}}
      const f=this.frameCycle;
      if(f===7457||f===22371)this.quarter();
      else if(f===14913){this.quarter();this.half();}
      if(!this.fiveStep){
        if(f>=29828&&f<=29830&&!this.irqInhibit)this.frameIRQ=true;
        if(f===29829){this.quarter();this.half();}if(f>=29830)this.frameCycle=0;
      }else{if(f===37281){this.quarter();this.half();}if(f>=37282)this.frameCycle=0;}
      if(--p0.timer<=0){p0.timer=2*(p0.period+1);p0.phase=(p0.phase+1)&7;}
      if(--p1.timer<=0){p1.timer=2*(p1.period+1);p1.phase=(p1.phase+1)&7;}
      if(--t.timer<=0){t.timer=t.period+1;if(t.length&&t.linear&&t.period>=2)t.phase=(t.phase+1)&31;}
      if(--n.timer<=0){n.timer=n.period;const feedback=(n.shift^(n.shift>>(n.short?6:1)))&1;n.shift=(n.shift>>1)|(feedback<<14);}
      if(d.buffer<0&&d.remaining>0){
        d.buffer=this.readMemory(d.address)&255;d.address=d.address===65535?0x8000:d.address+1;d.remaining--;
        remaining+=4;stolen+=4;
        if(!d.remaining){if(d.ctrl&64){d.address=d.start;d.remaining=d.sampleLength;}else if(d.ctrl&128)d.irq=true;}
      }
      if(--d.timer<=0){
        d.timer=d.period;
        if(!d.silent){if(d.shift&1){if(d.level<=125)d.level+=2;}else if(d.level>=2)d.level-=2;}
        d.shift>>=1;if(!--d.bits){d.bits=8;d.silent=d.buffer<0;if(!d.silent){d.shift=d.buffer;d.buffer=-1;}}
      }
      const pulse=this.pulseOutput(p0,0)+this.pulseOutput(p1,1);
      const noise=n.enabled&&n.length&&!(n.shift&1)?(n.ctrl&16?n.ctrl&15:n.env):0;
      const tri=APU_TRIANGLE[t.phase];
      this.sampleSum+=APU_PULSE_MIX[pulse]+APU_TND_MIX[(tri<<11)|(noise<<7)|d.level];this.sampleTicks++;
      this.samplePhase+=APU_SAMPLE_RATE;
      if(this.samplePhase>=APU_NTSC_CPU){
        this.samplePhase-=APU_NTSC_CPU;
        const input=this.sampleSum/this.sampleTicks;this.sampleSum=0;this.sampleTicks=0;
        this.hp90=this.h90*(this.hp90+input-this.lastInput);this.lastInput=input;
        this.hp440=this.h440*(this.hp440+this.hp90-this.lastHP90);this.lastHP90=this.hp90;
        this.lp+=this.l14*(this.hp440-this.lp);this.samples++;this.onSample(this.lp);
      }
    }
    return stolen;
  }
}
let apuCtx=null,apuMaster=null,apuMuted=false,apuVolume=0.65;
let apuBuffer=new Float32Array(4096),apuBufferUsed=0,apuNextTime=0;
const apuSources=new Set();
const apuStats={scheduled:0,underruns:0,resyncs:0,maxQueueMs:0,lastPeak:0};
const apuCore=new ForgeAPU(apuReceiveSample,a=>cpuRead(a));
function apuClock(cycles){emu.cycles+=apuCore.clock(cycles);}
function apuReset(){apuCore.reset();apuBufferUsed=0;apuStats.scheduled=apuStats.underruns=apuStats.resyncs=0;apuStats.maxQueueMs=apuStats.lastPeak=0;}
function apuWrite(a,v){apuCore.write(a,v);}
function apuReceiveSample(sample){
  if(!emu.running||!apuCtx||apuCtx.state!=='running')return;
  if(apuBufferUsed>=apuBuffer.length){apuBufferUsed=0;apuStats.resyncs++;} // Never grow an unbounded queue.
  apuBuffer[apuBufferUsed++]=sample;
}
function apuInit(){
  if(apuCtx)return true;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio is unavailable');
    apuCtx=new AC({latencyHint:'interactive'});apuMaster=apuCtx.createGain();apuMaster.gain.value=apuMuted?0:apuVolume;apuMaster.connect(apuCtx.destination);
    apuCtx.onstatechange=()=>{if(apuCtx.state!=='running')apuSilence();};return true;
  }catch(e){apuCtx=null;emuLog('Audio unavailable: '+e.message+'. Video can still run.');return false;}
}
function apuStart(){
  if(!apuInit())return;
  apuSilence();apuMaster.gain.value=apuMuted?0:apuVolume;
  if(apuCtx.state==='suspended')apuCtx.resume().catch(e=>emuLog('Audio blocked: '+e.message+' — click Audio to retry.'));
}
function apuFlush(){
  const count=apuBufferUsed;apuBufferUsed=0;
  if(!count||!apuCtx||apuCtx.state!=='running'||!emu.running)return;
  const now=apuCtx.currentTime,duration=count/APU_SAMPLE_RATE;
  if(!apuNextTime)apuNextTime=now+0.045;
  else if(apuNextTime<now+0.004){apuStats.underruns++;apuNextTime=now+0.045;}
  if(apuNextTime-now>0.120||apuSources.size>=12){apuSilence();apuStats.resyncs++;apuNextTime=now+0.045;}
  const buffer=apuCtx.createBuffer(1,count,APU_SAMPLE_RATE);buffer.getChannelData(0).set(apuBuffer.subarray(0,count));
  let peak=0;for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(apuBuffer[i]));apuStats.lastPeak=peak;
  const source=apuCtx.createBufferSource();source.buffer=buffer;source.connect(apuMaster);apuSources.add(source);
  source.onended=()=>{source.disconnect();apuSources.delete(source);};source.start(apuNextTime);
  apuNextTime+=duration;apuStats.scheduled++;apuStats.maxQueueMs=Math.max(apuStats.maxQueueMs,(apuNextTime-now)*1000);
}
function apuSilence(){
  for(const source of apuSources){try{source.stop();source.disconnect();}catch(e){/* already finished */}}
  apuSources.clear();apuBufferUsed=0;apuNextTime=0;
}
function emuToggleMute(){
  // On a browser-blocked context, the first click retries audio instead of muting.
  if(emu.running&&(!apuCtx||apuCtx.state!=='running')){apuStart();return;}
  apuMuted=!apuMuted;if(apuMaster)apuMaster.gain.setValueAtTime(apuMuted?0:apuVolume,apuCtx.currentTime);
  const b=document.getElementById('emuMuteBtn');b.textContent=apuMuted?'🔇 Muted':'🔊 Audio';b.style.color=apuMuted?'var(--dim)':'#d4d47a';
}


// ═══════════════════════════════════════════════
// NES FORGE: ADDITIONS TO v9.1 EMULATOR
// ═══════════════════════════════════════════════

// CNROM mapper (mapper 3)
function cnromWrite(a,v){if(emu.chrRom){const chrSize=emu.chrRom.length;emu.chrBank0=(v*8192)%chrSize;emu.chrBank1=(v*8192+4096)%chrSize}}

// ── MMC3 (Mapper 4) — used by SMB3, Kirby, Mega Man 3-6, Batman ──
function mmc3Write(a,v){
  switch(a&0xE001){
    case 0x8000:emu.mmc3BankSel=v&7;emu.mmc3PrgMode=(v>>6)&1;emu.mmc3ChrMode=(v>>7)&1;mmc3UpdateBanks();break;
    case 0x8001:emu.mmc3Banks[emu.mmc3BankSel]=v;mmc3UpdateBanks();break;
    case 0xA000:if(emu.initialMirror!==4){emu.mirroring=(v&1)?0:1}break; // H/V mirror (not for 4-screen)
    case 0xA001:break; // PRG RAM protect (ignored)
    case 0xC000:emu.mmc3IrqLatch=v;break;
    case 0xC001:emu.mmc3IrqReload=true;break;
    case 0xE000:emu.mmc3IrqEnabled=false;emu.irqPending=false;break; // IRQ disable + acknowledge
    case 0xE001:emu.mmc3IrqEnabled=true;break;
  }
}
function mmc3UpdateBanks(){const B=emu.mmc3Banks,np=emu.prgSize/8192,nc=(emu.chrRom?.length||emu.chrRam.length)/1024;const b6=(B[6]&63)%np*8192,b7=(B[7]&63)%np*8192,penultimate=(np-2)*8192,last=(np-1)*8192;emu.prgPage=emu.mmc3PrgMode?[penultimate,b7,b6,last]:[b6,b7,penultimate,last];const first=[B[0]&254,B[0]|1,B[1]&254,B[1]|1],second=[B[2],B[3],B[4],B[5]];emu.chrPages=(emu.mmc3ChrMode?[...second,...first]:[...first,...second]).map(b=>(b%nc)*1024);emu.chrBank0=emu.chrPages[0];emu.chrBank1=emu.chrPages[4];emu.prgBank0=emu.prgPage[0];emu.prgBank1=emu.prgPage[2];}
function mmc3ScanlineTick(){
  if(!(emu.ppuMask&0x18))return; // rendering off
  if(emu.mmc3IrqReload||emu.mmc3IrqCounter===0){
    emu.mmc3IrqCounter=emu.mmc3IrqLatch;
    emu.mmc3IrqReload=false;
  }else{
    emu.mmc3IrqCounter--;
  }
  if(emu.mmc3IrqCounter===0&&emu.mmc3IrqEnabled){
    emu.irqPending=true;
  }
}

// ── AxROM (Mapper 7) — Battletoads, Marble Madness ──
function axromWrite(a,v){
  emu.prgBank0=((v&7)*32768)%emu.prgSize;
  emu.prgBank1=emu.prgBank0+16384;
  emu.mirroring=(v&0x10)?3:2; // one-screen upper/lower
}

// ── GxROM (Mapper 66) ──
function gxromWrite(a,v){
  // PRG: bits 4-5 select 32KB bank
  const prgBank=(v>>4)&3;
  emu.prgBank0=(prgBank*32768)%emu.prgSize;
  emu.prgBank1=emu.prgBank0+16384;
  // CHR: bits 0-1 select 8KB bank
  if(emu.chrRom){
    const chrBank=v&3;
    const chrSize=emu.chrRom.length;
    emu.chrBank0=(chrBank*8192)%chrSize;
    emu.chrBank1=emu.chrBank0+4096;
  }
}

// ── Color Dreams (Mapper 11) ──
function colorDreamsWrite(a,v){
  // PRG: bits 0-1 select 32KB bank
  const prgBank=v&3;
  emu.prgBank0=(prgBank*32768)%emu.prgSize;
  emu.prgBank1=emu.prgBank0+16384;
  // CHR: bits 4-7 select 8KB bank
  if(emu.chrRom){
    const chrBank=(v>>4)&0xF;
    const chrSize=emu.chrRom.length;
    emu.chrBank0=(chrBank*8192)%chrSize;
    emu.chrBank1=emu.chrBank0+4096;
  }
}

// Load ROM from ArrayBuffer (for Build & Run integration)
function emuLoadRomData(bytes,name='ROM',initFrames=30){try{const rom=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);const h=parseRomHeader(rom);if(!Number.isInteger(initFrames)||initFrames<0||initFrames>120)throw Error('Initialization frame budget must be 0–120');emuPause();clearEmuKeys();emu.prgSize=h.prgSize;emu.prgRom=rom.slice(h.headerSize,h.headerSize+h.prgSize);emu.chrRom=h.chrSize?rom.slice(h.headerSize+h.prgSize,h.headerSize+h.prgSize+h.chrSize):null;emu.hasChrRam=!h.chrSize;emu.mapper=h.mapper;emu.initialMirror=h.mirror;emu.mirroring=h.mirror;emu.vram=new Uint8Array(4096);emu.chrRam=new Uint8Array(8192);emu.sram=new Uint8Array(8192);if(h.trainer)emu.sram.set(rom.slice(16,528),0x1000);emu.loaded=true;emu.lastBuiltRom=new Uint8Array(rom);emu.romName=name;emu.frameBuffer=new Uint8ClampedArray(256*240*4);emu.bgFrameBuffer=new Uint8ClampedArray(256*240*4);emu.frameBuffer.fill(0);emu.bgFrameBuffer.fill(0);emuDoReset();for(let i=0;i<initFrames;i++)emuRunFrame();['emuRunBtn','emuStepBtn','emuResetBtn','emuCapBtn','emuCapFrameBtn','emuCapHybridBtn','emuTraceBtn'].forEach(id=>document.getElementById(id).disabled=false);disasm_output='';disasm_asmText='';document.getElementById('disasmCode').textContent='Open this tab or click Disassemble PRG to inspect the loaded ROM.';document.getElementById('emuLog').textContent='Loaded '+name+'\nMapper '+h.mapper+' • '+h.prgSize/1024+' KB PRG • '+h.chrSize/1024+' KB CHR\nPaused at frame '+emu.frameCount+'. Z=A, X=B, Shift=Select, Enter=Start.\nCPU-clocked audio; experimental scanline video. Raster/IRQ/DMC bus timing remains approximate.';renderEmu();updateEmuSidebar();emuUpdatePerformance(true);const status=document.getElementById('issueStatus');if(status){status.textContent='Loaded '+name+' — press Run to play';status.style.color='var(--acc)';status.title='';}return true;}catch(e){emuPause();reportError(e);return false;}}

// Capture emulator PPU state into tile editor
function emuCaptureMeta(mode){
  return {
    mode,
    frame: emu.frameCount,
    ppuCtrl: emu.ppuCtrl,
    ppuMask: emu.ppuMask,
    ppuStatus: emu.ppuStatus,
    vAddr: emu.vAddr,
    fineX: emu.fineX,
    mirroring: emu.mirroring,
    mapper: emu.mapper,
    splitLine: emu.spr0Line||0,
    chrBank0Pre: emu.chrBank0Pre,
    chrBank1Pre: emu.chrBank1Pre,
    chrBank0Post: emu.chrBank0Post,
    chrBank1Post: emu.chrBank1Post,
    tAddrPre: emu.tAddrPre,
    fineXPre: emu.fineXPre,
    tAddrPost: emu.tAddrPost,
    fineXPost: emu.fineXPost,
    scrollX: emu.fineXPost+(emu.tAddrPost&0x1F)*8,
    scrollY: ((emu.tAddrPost>>12)&7)+((emu.tAddrPost>>5)&0x1F)*8,
    bgPatternSelect: (emu.ppuCtrl&0x10)?1:0,
    sprPatternSelect: (emu.ppuCtrl&0x08)?1:0,
    ntSelect: (emu.ppuCtrl&3)
  };
}
function buildBgPalFromEmu(){return Array.from({length:4},(_,p)=>Array.from({length:4},(_,c)=>ppuBusRead(0x3F00+(c?p*4+c:0))));}
function buildSprPalFromEmu(){return Array.from({length:4},(_,p)=>Array.from({length:4},(_,c)=>ppuBusRead(c?0x3F10+p*4+c:0x3F00)));}
function decodeChrFromEmuBase(baseAddr){
  const tiles=[];
  const len=emu.hasChrRam ? emu.chrRam.length : ((emu.chrRom&&emu.chrRom.length)||0);
  for(let t=0;t<256;t++){
    const tile=[];
    for(let py=0;py<8;py++){
      const row=[];
      let p0=0,p1=0;
      if(len){
        if(emu.hasChrRam){
          p0=emu.chrRam[(baseAddr+t*16+py)%len];
          p1=emu.chrRam[(baseAddr+t*16+py+8)%len];
        }else if(emu.chrRom){
          p0=emu.chrRom[(baseAddr+t*16+py)%len];
          p1=emu.chrRom[(baseAddr+t*16+py+8)%len];
        }
      }
      for(let px=0;px<8;px++) row.push(((p0>>(7-px))&1)|(((p1>>(7-px))&1)<<1));
      tile.push(row);
    }
    tiles.push(tile);
  }
  return tiles;
}
function blankTileData(){
  return Array.from({length:8},()=>Array(8).fill(0));
}
// ── Capture target: 'new' (default), 'replace', 'merge' ──
// Global capture target setting, controlled by UI dropdown
let captureTarget='new';
const MERGE_FIELDS=['nt','attr','pal','sprPal','oam','chr'];
let captureTargetMergeFields={nt:true,attr:true,pal:true,sprPal:true,oam:true,chr:false};

function mergeSceneCapture(targetIdx,source,fields){const sc=S.scenes[targetIdx];for(const key of ['nt','attr','pal','sprPal','oam','chr','sprChr'])if(fields[key]&&source[key])sc[key]=copyData(source[key]);sc.captureMeta=copyData(source.captureMeta);}

function pushSceneFromCapture(scene,opts={}){const target=opts.target||captureTarget||'new';if(target==='new'&&S.scenes.length>=64)return reportError(new Error('Editor scene limit reached'));if(!opts.noSnapshot)snapshot();saveCurrentScene();if(target==='new'){S.scenes.push(makeScene(scene));S.activeScene=S.scenes.length-1;}else{const sc=S.scenes[S.activeScene],fields=target==='replace'?{nt:true,attr:true,pal:true,sprPal:true,oam:true,chr:true,sprChr:true}:captureTargetMergeFields;for(const field of ['nt','attr','pal','sprPal','oam','chr','sprChr'])if(fields[field]&&scene[field])sc[field]=copyData(scene[field]);if(fields.chr)sc.tileProps=scene.tileProps||new Array(256).fill(0);sc.bgColor=sc.pal[0][0];sc.captureMeta=copyData(scene.captureMeta);}loadSceneData(S.activeScene);rebuildAllUI();broadcastState('capture');switchTab('scene');const loss=scene.captureMeta?.changedPixels||0;showToast(scene.name+' → '+target+(loss?' • '+loss+' pixels approximated':' • captured'));return S.scenes[S.activeScene];}
function emuCapture(){
  return emuCaptureNametable();
}
function emuCaptureNametable(){if(!emu.loaded)return;try{return pushSceneFromCapture(captureRuntimeData());}catch(e){reportError(e);}}
function nearestColorIndex(rowRgb,r,g,b){
  let bi=0,bd=1e18;
  for(let i=0;i<4;i++){
    const c=rowRgb[i];
    const dr=r-c[0],dg=g-c[1],db=b-c[2];
    const d=dr*dr+dg*dg+db*db;
    if(d<bd){bd=d;bi=i}
  }
  return {index:bi,error:bd};
}
function tileKeyFromData(tile){
  let s='';
  for(let y=0;y<8;y++) for(let x=0;x<8;x++) s+=tile[y][x];
  return s;
}
function tileDiffScore(a,b){
  let diff=0;
  for(let y=0;y<8;y++) for(let x=0;x<8;x++) if(a[y][x]!==b[y][x]) diff++;
  return diff;
}
function findNearestExistingTile(tile,tiles){
  let best=0,bestDiff=1e18;
  for(let i=0;i<tiles.length;i++){
    const d=tileDiffScore(tile,tiles[i]);
    if(d<bestDiff){bestDiff=d;best=i;if(d===0)break;}
  }
  return best;
}
function emuCaptureVisibleFrame(){if(!emu.loaded)return;try{renderEmu();const scene=quantizeFrame(emu.frameBuffer,buildBgPalFromEmu());scene.name='Baked frame F'+emu.frameCount;scene.sprPal=buildSprPalFromEmu();scene.captureMeta={...emuCaptureMeta('visible-frame'),...scene.captureMeta,bakedSprites:true,note:'Constrained conversion of rendered RGB; differences are counted, not hidden.'};return pushSceneFromCapture(scene,{mode:'frame'});}catch(e){reportError(e);}}

// ── Hybrid Capture: frame-baked tiles + nametable OAM + palette fidelity ──
function emuCaptureHybrid(){if(!emu.loaded)return;try{renderEmu();const scene=quantizeFrame(emu.bgFrameBuffer,buildBgPalFromEmu()),sprites=captureSpriteData();scene.name='Hybrid F'+emu.frameCount;scene.sprPal=buildSprPalFromEmu();scene.sprChr=sprites.chr;scene.oam=sprites.oam;scene.captureMeta={...emuCaptureMeta('hybrid'),...scene.captureMeta,bakedSprites:false,note:'Background-only frame converted; OAM remains separate. Raster effects may not survive a static tilemap.'};return pushSceneFromCapture(scene);}catch(e){reportError(e);}}

function updateEmuSidebar(){
  if(!emu.loaded)return;
  const $ = id => document.getElementById(id);
  if($('ePpuCtrl'))$('ePpuCtrl').textContent='$'+emu.ppuCtrl.toString(16).toUpperCase().padStart(2,'0');
  if($('ePpuMask'))$('ePpuMask').textContent='$'+emu.ppuMask.toString(16).toUpperCase().padStart(2,'0');
  if($('ePpuStat'))$('ePpuStat').textContent='$'+emu.ppuStatus.toString(16).toUpperCase().padStart(2,'0');
  if($('eVAddr'))$('eVAddr').textContent='$'+emu.vAddr.toString(16).toUpperCase().padStart(4,'0');
  if($('eFineX'))$('eFineX').textContent=emu.fineX;
  if($('eMapper'))$('eMapper').textContent=emu.mapper;
  if($('ePrgBanks'))$('ePrgBanks').textContent=Math.ceil(emu.prgSize/16384);
  if($('eChrBanks'))$('eChrBanks').textContent=emu.chrRom?Math.ceil(emu.chrRom.length/8192):'RAM';
  if($('eMirror'))$('eMirror').textContent=['H','V','1L','1U'][emu.mirroring]||'?';
  const pv=$('emuPalView');
  if(pv){
    let h='';
    for(let i=0;i<32;i++){
      if(i===16)h+='<br>';
      const c=emu.palRam[i]&0x3F;const rgb=NP[c]||[0,0,0];
      h+='<span style="display:inline-block;width:12px;height:12px;background:rgb('+rgb.join(',')+');border:1px solid #333;font-size:6px;color:#fff;text-align:center;line-height:12px" title="$'+c.toString(16).toUpperCase()+'"></span>';
    }
    pv.innerHTML=h;
  }
  if($('eOamCount'))$('eOamCount').textContent=Array.from({length:64}).filter((_,i)=>emu.oamMem[i*4]<0xEF).length;
}

// Build & Run integration
function buildAndRun(){let rom;try{window._buildAndRunMode=true;rom=buildNesRom();}finally{window._buildAndRunMode=false;}if(!rom)return false;if(!emuLoadRomData(rom,'Current project build'))return false;switchTab('emu');emuToggleRun();return true;}

// ═══════════════════════════════════════════════
// NES FORGE: 6502 DISASSEMBLER
// ═══════════════════════════════════════════════
