/* The native arena setup spans two vertically mirrored nametables. Interpret
 * its original PPU loader on a private bus; no live emulator state is touched. */
(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('../services/cpu6502-core.js'):root.Forge6502Core,typeof module!=='undefined'&&module.exports?require('./punch-out-content.js'):root.PunchOutContent);if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PunchOutArena=api;})(typeof globalThis!=='undefined'?globalThis:this,function(cpu,content){
'use strict';
const fail=m=>{throw Error('Punch-Out arena: '+m);};
function open(input){
 const bytes=Uint8Array.from(input),source=content.open(bytes),f=source.fights[0],ram=new Uint8Array(2048),pages=new Uint8Array(2048),written=new Uint8Array(2048),writes=[];
 const anchor=[0xa9,1,0x20,0x18,0xc1,0xa9,2,0x20,0x18,0xc1];if(!anchor.every((v,i)=>bytes[16+13*8192+0xb76+i]===v))fail('The original arena setup differs.');
 let address=0,high=true,control=0;
 const state={A:0,X:0,Y:0,SP:0xfb,PC:0xc118,C:0,Z:0,I:1,D:0,V:0,N:0,cycles:0,opsMissed:0};
 const read=a=>{a&=65535;if(a<8192)return ram[a&2047];if(a===0x2002){high=true;return 0;}if(a>=0x8000)return bytes[16+(a<0xa000?12*8192+a-0x8000:106496+a-0xa000)];fail('Unexpected source bus read.');};
 const write=(a,v)=>{a&=65535;v&=255;if(a<8192){ram[a&2047]=v;return;}if(a===0x2000){control=v;return;}if(a===0x2006){address=high?(v&63)<<8:(address&0x3f00)|v;high=!high;return;}if(a===0x2007){if(address<0x2000||address>=0x2800)fail('Arena program leaves its two source pages.');const at=address-0x2000;pages[at]=v;written[at]=1;writes.push({address,value:v});address=(address+(control&4?32:1))&16383;return;}fail('Unexpected source bus write.');};
 const core=cpu.create(state,read,write);let instructions=0;
 for(const id of [1,2]){state.A=id;state.PC=0xc118;state.SP=0xfb;ram[508]=0xee;ram[509]=0x7f;let count=0;while(state.PC!==0x7fef){const pc=state.PC;if(++count>50000||!((pc>=0xc113&&pc<=0xc247)||(pc>=0xbf9e&&pc<=0xbfb0)))fail('PPU loader leaves its bounded routine.');core.step();state.PC&=65535;if(state.opsMissed)fail('Unsupported native instruction.');}instructions+=count;if(state.SP!==0xfd||state.A!==0)fail('PPU loader return differs.');}
 if(written.some(v=>!v)||writes.length!==2048)fail('Arena setup did not initialize both pages.');
 // AB8E/BF55 select upper FD=0 and FE=0 after the PPU loader returns A=0.
 // AB A0-AE establish NT1 and horizontal scroll $B0 for the 8-pixel setup.
 const scrollX=176,baseNametable=1,nt=[],attr=Array(64).fill(0),cellSources=[];
 for(let y=0;y<30;y++)for(let x=0;x<32;x++){const worldX=256+scrollX+x*8,page=(worldX>>8)&1,sx=(worldX&255)>>3,at=page*1024+y*32+sx,ab=pages[page*1024+960+(y>>2)*8+(sx>>2)],pal=(ab>>(((y&2)?4:0)+((sx&2)?2:0)))&3;nt.push(pages[at]);cellSources.push({nametable:0x2000+page*1024,cell:y*32+sx});const ai=(y>>2)*8+(x>>2),shift=((y&2)?4:0)+((x&2)?2:0);attr[ai]=(attr[ai]&~(3<<shift))|(pal<<shift);}
 // AF5B copies this fight's palette and overrides RAM $048D with $20.
 const colors=f.palette.slice(0,16);colors[13]=32;const palette=Array.from({length:4},(_,i)=>[colors[0],...colors.slice(i*4+1,i*4+4)]);
 return {nt,attr,chr:source.chr(0),palette,rawPages:Array.from(pages),writes,instructions,context:{programs:[1,2],programTableBank8KiB:12,programTablePointer:0x8000,mirroring:'vertical',baseNametable,scrollX,scrollY:0,backgroundPatternBase:0x1000,chrFD:0,chrFE:0,paletteFight:0,paletteFileOffset:f.paletteFileOffset,paletteOverride:{index:13,value:32},spriteMode:8},cellSources,limits:['Static arena setup: ring, audience pattern and initial scoreboard layout from the original two source pages.','The health-bar fields retain their source setup placeholders. Live health, scores, clock and round updates are not simulated.','Little Mac, opponent, referee, camera motion, raster effects and gameplay are separate layers. This is not a complete running fight.','This recovered reference is savable. Arena layout/CHR/palette edits have no native encoder.']};
}
return Object.freeze({version:1,open});
});
