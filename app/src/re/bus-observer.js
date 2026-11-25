/* AL-EXP-01 (BL03): a passive bus observer, installed only inside the experiment sandbox (a separate, sandboxed copy
 * of this editor). It wraps the emulator's own CPU-read, CPU-write, PPU-write and instruction-step functions in that
 * copy and only records what passes through: it never reads the bus itself, so it cannot trigger I/O side effects.
 * Every PRG byte gets access-role bits (opcode fetch, operand fetch, data read, vector read, other); bytes never touched
 * keep 0, which means "unknown", never "data". Data and vector reads, PPU writes and watched RAM writes go to an ordered
 * log with a hard cap; past the cap the log is marked truncated and cannot be used to prove that something did not
 * happen. */
(()=>{
'use strict';
const services=window.Forge.services;
const ROLE=Object.freeze({opcode:1,operand:2,data:4,vector:8,other:16});
const KIND=Object.freeze({prgRead:0,vectorRead:1,ppuWrite:2,ramWrite:3});
// 6502 instruction lengths (official and the unofficial opcodes Forge's core implements)
const LEN=Uint8Array.from(('1212222212123333'+'2212222213133333'+'3212222212123333'+'2212222213133333'+'1212222212123333'+'2212222213133333'+'1212222212123333'+'2212222213133333'+
  '2222222212123333'+'2212222213133333'+'2222222212123333'+'2212222213133333'+'2222222212123333'+'2212222213133333'+'2222222212123333'+'2212222213133333').split('').map(Number));
let active=null;
function fail(message){throw Error('Bus observer: '+message);}

function install({prgStart,prgBytes,prgReads=true,ppuWrites=true,watchRam=[],maxEvents=100000}){
  if(!services.ExperimentSandboxAgent?.inSandbox?.())fail('runs only inside the experiment sandbox');
  if(active)fail('already installed');
  const roles=new Uint8Array(prgBytes),events=[],frames=[],watch=new Set(watchRam.map(a=>a&0x7ff));
  const state={pc:-1,pcPhysical:-1,fetch:false,next:0,remaining:0,frameMin:0x10000,frameMax:-1,frameVectors:0,frameInstructions:0,dropped:0,counts:{opcode:0,operand:0,data:0,vector:0,other:0}};
  // the cartridge file offset a CPU address reads now, through the mapper's PRG banking (8 KiB pages for MMC3 and MMC2,
  // 16 KiB halves for the others; AxROM's 32 KiB bank is two halves)
  const physical=a=>{const within=(emu.mapper===4||emu.mapper===9)&&emu.prgPage?emu.prgPage[(a>>13)&3]+(a&0x1fff):(a>=0xc000?emu.prgBank1:emu.prgBank0)+(a&0x3fff);return prgStart+(within%prgBytes);};
  const log=row=>{if(events.length<maxEvents)events.push(row);else state.dropped++;};
  const prev={step:cpuStepRaw,read:cpuRead,write:cpuWrite,ppu:ppuBusWrite};
  cpuStepRaw=function(...args){
    const pc=emu.PC&0xffff;state.pc=pc;state.pcPhysical=pc>=0x8000?physical(pc):-1;state.fetch=true;state.remaining=0;
    if(pc<state.frameMin)state.frameMin=pc;if(pc>state.frameMax)state.frameMax=pc;state.frameInstructions++;
    try{return prev.step.apply(this,args);}finally{state.fetch=false;state.remaining=0;state.pc=-1;state.pcPhysical=-1;}
  };
  cpuRead=function(a,...rest){
    const v=prev.read.call(this,a,...rest);a&=0xffff;
    if(a>=0x8000){const o=physical(a),i=o-prgStart;let role;
      if(state.pc>=0&&state.fetch&&a===state.pc){role=ROLE.opcode;state.fetch=false;state.remaining=LEN[v]-1;state.next=(a+1)&0xffff;state.counts.opcode++;}
      else if(state.pc>=0&&state.remaining>0&&a===state.next){role=ROLE.operand;state.remaining--;state.next=(a+1)&0xffff;state.counts.operand++;}
      else if(a>=0xfffa){role=ROLE.vector;state.frameVectors++;state.counts.vector++;log([emu.frameCount,KIND.vectorRead,state.pc,state.pcPhysical,a,o,v]);}
      else if(state.pc>=0){role=ROLE.data;state.counts.data++;if(prgReads)log([emu.frameCount,KIND.prgRead,state.pc,state.pcPhysical,a,o,v]);}
      else{role=ROLE.other;state.counts.other++;}
      if(i>=0&&i<prgBytes)roles[i]|=role;}
    return v;
  };
  cpuWrite=function(a,v,...rest){
    if(watch.size&&(a&0xffff)<0x2000&&watch.has(a&0x7ff))log([emu.frameCount,KIND.ramWrite,state.pc,state.pcPhysical,a&0xffff,a&0x7ff,v&255]);
    return prev.write.call(this,a,v,...rest);
  };
  ppuBusWrite=function(a,v,...rest){
    if(ppuWrites){const x=a&0x3fff;let mapped;if(x<0x2000)mapped=-1-x;else if(x<0x3f00)mapped=ppuMirror(x-0x2000);else{let p=x&31;if((p&19)===16)p-=16;mapped=0x4000+p;}
      log([emu.frameCount,KIND.ppuWrite,state.pc,state.pcPhysical,x,mapped,v&255]);}
    return prev.ppu.call(this,a,v,...rest);
  };
  const observer={
    roles,events,frames,
    endFrame(){frames.push([emu.frameCount,state.frameMin===0x10000?-1:state.frameMin,state.frameMax,state.frameVectors,state.frameInstructions]);state.frameMin=0x10000;state.frameMax=-1;state.frameVectors=0;state.frameInstructions=0;},
    summary(){return {events:events.length,dropped:state.dropped,truncated:state.dropped>0,complete:state.dropped===0,counts:{...state.counts},maxEvents};},
    uninstall(){if(active!==observer)return;cpuStepRaw=prev.step;cpuRead=prev.read;cpuWrite=prev.write;ppuBusWrite=prev.ppu;active=null;},
  };
  active=observer;return observer;
}
services.BusObserver=Object.freeze({ROLE,KIND,LEN,install,active:()=>!!active});
})();
