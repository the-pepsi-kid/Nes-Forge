/* Isolated native-driver execution using the same instruction implementation
 * and ForgeAPU class as live emulation. Fixed physical banks, no DOM/files/network,
 * no live emulator mutation, no ROM writes. All calls and windows are bounded. */
(()=>{
'use strict';
const services=window.Forge.services;
function create(bytes,bank0,{maxInstructions=2000000,maxWrites=131072,onSample=()=>{},ignoreFdsWrites=false,mmc3FixedPair=false,mmc2FixedBank=false}={}){
 const valid=bytes instanceof Uint8Array&&bytes.length>=16&&bytes[0]===78&&bytes[1]===69&&bytes[2]===83&&bytes[3]===26&&((bytes[7]&12)===0||mmc3FixedPair&&typeof ShadowgateAudio!=='undefined'&&ShadowgateAudio.recognizes(bytes))&&(((bytes[6]>>4)|(bytes[7]&240))===1||mmc2FixedBank&&((bytes[6]>>4)|(bytes[7]&240))===9||mmc3FixedPair&&(((bytes[6]>>4)|(bytes[7]&240))===4||typeof ShadowgateAudio!=='undefined'&&ShadowgateAudio.recognizes(bytes)))&&!(bytes[6]&4)&&bytes[4]>=1&&bytes[4]<=32&&bytes.length===16+bytes[4]*16384+bytes[5]*8192;
 if(!valid||!Number.isInteger(bank0)||bank0<0||bank0>=bytes[4]*(mmc2FixedBank?2:1))throw Error('A complete iNES source with an allowed fixed bank mapping is required.');
 const fixedBank=bytes[4]-1;
 if(!Number.isInteger(maxInstructions)||maxInstructions<1||maxInstructions>2000000||!Number.isInteger(maxWrites)||maxWrites<1||maxWrites>131072||typeof onSample!=='function')throw Error('Invalid isolated execution limits.');
 if(typeof ignoreFdsWrites!=='boolean'||typeof mmc3FixedPair!=='boolean'||typeof mmc2FixedBank!=='boolean')throw Error('Invalid expansion bus policy.');
 const rom=bytes.slice(),ram=new Uint8Array(2048),sram=new Uint8Array(8192),writes=[],state={A:0,X:0,Y:0,SP:0xfd,PC:0,C:0,Z:0,I:1,D:0,V:0,N:0,cycles:0,opsMissed:0};let instructions=0,origin=null,frame=-1,ignoredFdsWrites=0;
 const physical=a=>mmc2FixedBank?16+(a<0xa000?bank0*8192+(a&8191):bytes[4]*16384-24576+a-0xa000):16+(a<0xc000?bank0:fixedBank)*16384+(a&0x3fff);
 function read(a){a&=65535;if(a<0x2000)return ram[a&2047];if(a===0x4015)return apu.readStatus();if(a>=0x6000&&a<0x8000)return sram[a-0x6000];if(a>=0x8000)return rom[physical(a)];throw Error('Isolated driver read unsupported bus address $'+a.toString(16));}
 function write(a,v){a&=65535;v&=255;if(a<0x2000){ram[a&2047]=v;return;}if((a>=0x4000&&a<=0x4013)||a===0x4015||a===0x4017){if(writes.length>=maxWrites)throw Error('Native APU write limit reached. Choose a shorter window.');apu.write(a,v);writes.push({frame,cycles:apu.cycles,address:a,value:v,pc:origin,fileOffset:origin>=0x8000?physical(origin):null});return;}if(ignoreFdsWrites&&a>=0x4040&&a<=0x4089){if(++ignoredFdsWrites>maxWrites)throw Error('Unused expansion write limit reached.');return;}if(a>=0x6000&&a<0x8000){sram[a-0x6000]=v;return;}throw Error('Isolated driver write unsupported bus address $'+a.toString(16));}
 const apu=new ForgeAPU(onSample,read),core=Forge6502Core.create(state,read,write);
 function clock(n){if(!Number.isInteger(n)||n<0||n>100000)throw Error('Invalid isolated clock budget.');state.cycles+=apu.clock(n);}
 function call(pc,a=0){if(routineActive)throw Error('A native routine is already active.');if(!Number.isInteger(pc)||pc<0x8000||pc>0xffff)throw Error('Invalid native subroutine entry.');state.PC=pc;state.A=a;state.SP=0xfd;ram[0x1fd]=0x7f;ram[0x1fc]=0xee;state.SP=0xfb;let steps=0;
 while(state.PC!==0x7fef){if(++steps>50000||++instructions>maxInstructions)throw Error('Native instruction limit reached. Choose a shorter window.');origin=state.PC;const before=state.cycles;core.step();state.PC&=65535;const elapsed=state.cycles-before;if(!Number.isInteger(elapsed)||elapsed<1||elapsed>2048)throw Error('Invalid native CPU progression.');clock(elapsed);}
 origin=null;if(state.SP!==0xfd)throw Error('Native subroutine did not balance its stack.');return steps;}
 // Resumable one-shot execution for native routines that own their sample timing.
 // Ordinary frame-update calls retain their preceding implementation and limits.
 let routineActive=false,routineEndCycle=null;
 function startRoutine(pc,a=0){if(routineActive)throw Error('A native routine is already active.');if(!Number.isInteger(pc)||pc<0x8000||pc>0xffff)throw Error('Invalid native subroutine entry.');state.PC=pc;state.A=a;state.SP=0xfb;ram[0x1fd]=0x7f;ram[0x1fc]=0xee;routineActive=true;routineEndCycle=null;}
 function advanceRoutine(cycles){if(!Number.isInteger(cycles)||cycles<0||cycles>100000)throw Error('Invalid native routine window.');const target=apu.cycles+cycles;while(routineActive&&apu.cycles<target){if(++instructions>maxInstructions)throw Error('Native instruction limit reached. Choose a shorter window.');origin=state.PC;const before=state.cycles;core.step();state.PC&=65535;const elapsed=state.cycles-before;if(!Number.isInteger(elapsed)||elapsed<1||elapsed>2048)throw Error('Invalid native CPU progression.');clock(elapsed);if(state.PC===0x7fef){if(state.SP!==0xfd)throw Error('Native subroutine did not balance its stack.');routineActive=false;routineEndCycle=apu.cycles;}}origin=null;return {complete:!routineActive,endCycle:routineEndCycle};}
 function channels(){return [...apu.pulse.map((p,i)=>({channel:i,period:p.period,volume:p.enabled&&p.length&&p.period>=8&&apu.sweepTarget(p,i)<=2047?(p.ctrl&16?p.ctrl&15:p.env):0,duty:p.ctrl>>6,sweep:p.sweep})),{channel:2,period:apu.triangle.period,volume:apu.triangle.enabled&&apu.triangle.length&&apu.triangle.linear&&apu.triangle.period>=2?15:0,duty:0},{channel:3,period:apu.noise.period,periodIndex:[4,8,16,32,64,96,128,160,202,254,380,508,762,1016,2034,4068].indexOf(apu.noise.period),volume:apu.noise.enabled&&apu.noise.length?(apu.noise.ctrl&16?apu.noise.ctrl&15:apu.noise.env):0,short:apu.noise.short,duty:0}];}
 return Object.freeze({ram,state,apu,writes,call,clock,write,channels,startRoutine,advanceRoutine,setFrame:n=>{frame=n;},stats:()=>({instructions,writes:writes.length,cycles:state.cycles,opsMissed:state.opsMissed,...(ignoreFdsWrites?{ignoredFdsWrites}:{})}),snapshot:()=>({state:{...state},ram:Array.from(ram),apu:JSON.parse(JSON.stringify(apu))})});
}
services.NativeAudioMachine=Object.freeze({create,version:1});
})();
