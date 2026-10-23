/* Shared 6502 instruction implementation. Live emulation and isolated RE
 * subroutine execution use separate state/buses with the same opcode code. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Forge6502Core=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(emu,cpuRead,cpuWrite){
function cpuRead16(a){return cpuRead(a)|(cpuRead((a+1)&0xFFFF)<<8)}
function cpuRead16Bug(a){return cpuRead(a)|(cpuRead((a&0xFF00)|((a+1)&0xFF))<<8)} // page wrap bug
function cpuPush(v){cpuWrite(0x100|emu.SP,v);emu.SP=(emu.SP-1)&0xFF}
function cpuPull(){emu.SP=(emu.SP+1)&0xFF;return cpuRead(0x100|emu.SP)}
function cpuGetP(){return(emu.C)|(emu.Z<<1)|(emu.I<<2)|(emu.D<<3)|(1<<5)|(emu.V<<6)|(emu.N<<7)}
function cpuSetP(v){emu.C=v&1;emu.Z=(v>>1)&1;emu.I=(v>>2)&1;emu.D=(v>>3)&1;emu.V=(v>>6)&1;emu.N=(v>>7)&1}
function setNZ(v){emu.N=(v>>7)&1;emu.Z=v===0?1:0}
function cpuStepRaw(){
  const op=cpuRead(emu.PC++);emu.PC&=0xFFFF;
  let a=0,v=0,t=0,c=0;
  // Addressing modes
  function imm(){return emu.PC++}
  function zp(){return cpuRead(emu.PC++)}
  function zpx(){return(cpuRead(emu.PC++)+emu.X)&0xFF}
  function zpy(){return(cpuRead(emu.PC++)+emu.Y)&0xFF}
  function ab(){a=cpuRead16(emu.PC);emu.PC+=2;return a}
  function abx(){a=cpuRead16(emu.PC);emu.PC=(emu.PC+2)&65535;const addr=(a+emu.X)&65535;if((a&0xFF00)!==(addr&0xFF00)&&[0x1D,0x3D,0x5D,0x7D,0xBD,0xBC,0xDD,0xFD,0x1C,0x3C,0x5C,0x7C,0xDC,0xFC].includes(op))emu.cycles++;return addr;}
  function aby(){a=cpuRead16(emu.PC);emu.PC=(emu.PC+2)&65535;const addr=(a+emu.Y)&65535;if((a&0xFF00)!==(addr&0xFF00)&&[0x19,0x39,0x59,0x79,0xB9,0xBE,0xD9,0xF9,0xBF].includes(op))emu.cycles++;return addr;}
  function izx(){t=(cpuRead(emu.PC++)+emu.X)&0xFF;return cpuRead16Bug(t)}
  function izy(){t=cpuRead(emu.PC++);const base=cpuRead16Bug(t),addr=(base+emu.Y)&65535;if((base&0xFF00)!==(addr&0xFF00)&&[0x11,0x31,0x51,0x71,0xB1,0xD1,0xF1,0xB3].includes(op))emu.cycles++;return addr;}
  function br(c){const o=cpuRead(emu.PC++);if(c){const before=emu.PC&65535;emu.PC=(before+((o&128)?o-256:o))&65535;emu.cycles+=1+((before&0xFF00)!==(emu.PC&0xFF00)?1:0);}}
  function cmp(a,b){emu.C=a>=b?1:0;setNZ((a-b)&0xFF)}
  function adc(v){const s=emu.A+v+emu.C;emu.V=((~(emu.A^v))&(emu.A^s)&0x80)?1:0;emu.C=s>255?1:0;emu.A=s&0xFF;setNZ(emu.A)}
  function sbc(v){adc(v^0xFF)}
  switch(op){
  // BRK
  case 0x00:emu.PC++;cpuPush((emu.PC>>8)&0xFF);cpuPush(emu.PC&0xFF);cpuPush(cpuGetP()|0x10);emu.I=1;emu.PC=cpuRead16(0xFFFE);emu.cycles+=7;return;
  // ORA
  case 0x01:emu.A|=cpuRead(izx());setNZ(emu.A);emu.cycles+=6;return;
  case 0x05:emu.A|=cpuRead(zp());setNZ(emu.A);emu.cycles+=3;return;
  case 0x09:emu.A|=cpuRead(imm());setNZ(emu.A);emu.cycles+=2;return;
  case 0x0D:emu.A|=cpuRead(ab());setNZ(emu.A);emu.cycles+=4;return;
  case 0x11:emu.A|=cpuRead(izy());setNZ(emu.A);emu.cycles+=5;return;
  case 0x15:emu.A|=cpuRead(zpx());setNZ(emu.A);emu.cycles+=4;return;
  case 0x19:emu.A|=cpuRead(aby());setNZ(emu.A);emu.cycles+=4;return;
  case 0x1D:emu.A|=cpuRead(abx());setNZ(emu.A);emu.cycles+=4;return;
  // ASL
  case 0x06:a=zp();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=5;return;
  case 0x0A:emu.C=(emu.A>>7)&1;emu.A=(emu.A<<1)&0xFF;setNZ(emu.A);emu.cycles+=2;return;
  case 0x0E:a=ab();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x16:a=zpx();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x1E:a=abx();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=7;return;
  // BPL
  case 0x10:br(!emu.N);emu.cycles+=2;return;
  // CLC
  case 0x18:emu.C=0;emu.cycles+=2;return;
  // JSR
  case 0x20:a=cpuRead16(emu.PC);emu.PC+=2;cpuPush(((emu.PC-1)>>8)&0xFF);cpuPush((emu.PC-1)&0xFF);emu.PC=a;emu.cycles+=6;return;
  // AND
  case 0x21:emu.A&=cpuRead(izx());setNZ(emu.A);emu.cycles+=6;return;
  case 0x25:emu.A&=cpuRead(zp());setNZ(emu.A);emu.cycles+=3;return;
  case 0x29:emu.A&=cpuRead(imm());setNZ(emu.A);emu.cycles+=2;return;
  case 0x2D:emu.A&=cpuRead(ab());setNZ(emu.A);emu.cycles+=4;return;
  case 0x31:emu.A&=cpuRead(izy());setNZ(emu.A);emu.cycles+=5;return;
  case 0x35:emu.A&=cpuRead(zpx());setNZ(emu.A);emu.cycles+=4;return;
  case 0x39:emu.A&=cpuRead(aby());setNZ(emu.A);emu.cycles+=4;return;
  case 0x3D:emu.A&=cpuRead(abx());setNZ(emu.A);emu.cycles+=4;return;
  // BIT
  case 0x24:v=cpuRead(zp());emu.N=(v>>7)&1;emu.V=(v>>6)&1;emu.Z=(v&emu.A)===0?1:0;emu.cycles+=3;return;
  case 0x2C:v=cpuRead(ab());emu.N=(v>>7)&1;emu.V=(v>>6)&1;emu.Z=(v&emu.A)===0?1:0;emu.cycles+=4;return;
  // ROL
  case 0x26:a=zp();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=5;return;
  case 0x2A:t=emu.C;emu.C=(emu.A>>7)&1;emu.A=((emu.A<<1)|t)&0xFF;setNZ(emu.A);emu.cycles+=2;return;
  case 0x2E:a=ab();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x36:a=zpx();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x3E:a=abx();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=7;return;
  // PLP
  case 0x28:cpuSetP(cpuPull());emu.cycles+=4;return;
  // BMI
  case 0x30:br(!!emu.N);emu.cycles+=2;return;
  // SEC
  case 0x38:emu.C=1;emu.cycles+=2;return;
  // RTI
  case 0x40:cpuSetP(cpuPull());emu.PC=cpuPull()|(cpuPull()<<8);emu.cycles+=6;return;
  // EOR
  case 0x41:emu.A^=cpuRead(izx());setNZ(emu.A);emu.cycles+=6;return;
  case 0x45:emu.A^=cpuRead(zp());setNZ(emu.A);emu.cycles+=3;return;
  case 0x49:emu.A^=cpuRead(imm());setNZ(emu.A);emu.cycles+=2;return;
  case 0x4D:emu.A^=cpuRead(ab());setNZ(emu.A);emu.cycles+=4;return;
  case 0x51:emu.A^=cpuRead(izy());setNZ(emu.A);emu.cycles+=5;return;
  case 0x55:emu.A^=cpuRead(zpx());setNZ(emu.A);emu.cycles+=4;return;
  case 0x59:emu.A^=cpuRead(aby());setNZ(emu.A);emu.cycles+=4;return;
  case 0x5D:emu.A^=cpuRead(abx());setNZ(emu.A);emu.cycles+=4;return;
  // LSR
  case 0x46:a=zp();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);setNZ(v);emu.cycles+=5;return;
  case 0x4A:emu.C=emu.A&1;emu.A>>=1;setNZ(emu.A);emu.cycles+=2;return;
  case 0x4E:a=ab();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x56:a=zpx();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x5E:a=abx();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);setNZ(v);emu.cycles+=7;return;
  // PHA
  case 0x48:cpuPush(emu.A);emu.cycles+=3;return;
  // JMP
  case 0x4C:emu.PC=cpuRead16(emu.PC);emu.cycles+=3;return;
  case 0x6C:emu.PC=cpuRead16Bug(cpuRead16(emu.PC));emu.cycles+=5;return;
  // BVC
  case 0x50:br(!emu.V);emu.cycles+=2;return;
  // CLI
  case 0x58:emu.I=0;emu.cycles+=2;return;
  // RTS
  case 0x60:emu.PC=(cpuPull()|(cpuPull()<<8))+1;emu.PC&=0xFFFF;emu.cycles+=6;return;
  // ADC
  case 0x61:adc(cpuRead(izx()));emu.cycles+=6;return;
  case 0x65:adc(cpuRead(zp()));emu.cycles+=3;return;
  case 0x69:adc(cpuRead(imm()));emu.cycles+=2;return;
  case 0x6D:adc(cpuRead(ab()));emu.cycles+=4;return;
  case 0x71:adc(cpuRead(izy()));emu.cycles+=5;return;
  case 0x75:adc(cpuRead(zpx()));emu.cycles+=4;return;
  case 0x79:adc(cpuRead(aby()));emu.cycles+=4;return;
  case 0x7D:adc(cpuRead(abx()));emu.cycles+=4;return;
  // ROR
  case 0x66:a=zp();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);setNZ(v);emu.cycles+=5;return;
  case 0x6A:t=emu.C;emu.C=emu.A&1;emu.A=(emu.A>>1)|(t<<7);setNZ(emu.A);emu.cycles+=2;return;
  case 0x6E:a=ab();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x76:a=zpx();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0x7E:a=abx();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);setNZ(v);emu.cycles+=7;return;
  // PLA
  case 0x68:emu.A=cpuPull();setNZ(emu.A);emu.cycles+=4;return;
  // BVS
  case 0x70:br(!!emu.V);emu.cycles+=2;return;
  // SEI
  case 0x78:emu.I=1;emu.cycles+=2;return;
  // STA
  case 0x81:cpuWrite(izx(),emu.A);emu.cycles+=6;return;
  case 0x85:cpuWrite(zp(),emu.A);emu.cycles+=3;return;
  case 0x8D:cpuWrite(ab(),emu.A);emu.cycles+=4;return;
  case 0x91:cpuWrite(izy(),emu.A);emu.cycles+=6;return;
  case 0x95:cpuWrite(zpx(),emu.A);emu.cycles+=4;return;
  case 0x99:cpuWrite(aby(),emu.A);emu.cycles+=5;return;
  case 0x9D:cpuWrite(abx(),emu.A);emu.cycles+=5;return;
  // STX
  case 0x86:cpuWrite(zp(),emu.X);emu.cycles+=3;return;
  case 0x8E:cpuWrite(ab(),emu.X);emu.cycles+=4;return;
  case 0x96:cpuWrite(zpy(),emu.X);emu.cycles+=4;return;
  // STY
  case 0x84:cpuWrite(zp(),emu.Y);emu.cycles+=3;return;
  case 0x8C:cpuWrite(ab(),emu.Y);emu.cycles+=4;return;
  case 0x94:cpuWrite(zpx(),emu.Y);emu.cycles+=4;return;
  // PHP
  case 0x08:cpuPush(cpuGetP()|0x10);emu.cycles+=3;return;
  // DEY
  case 0x88:emu.Y=(emu.Y-1)&0xFF;setNZ(emu.Y);emu.cycles+=2;return;
  // TXA
  case 0x8A:emu.A=emu.X;setNZ(emu.A);emu.cycles+=2;return;
  // BCC
  case 0x90:br(!emu.C);emu.cycles+=2;return;
  // TYA
  case 0x98:emu.A=emu.Y;setNZ(emu.A);emu.cycles+=2;return;
  // TXS
  case 0x9A:emu.SP=emu.X;emu.cycles+=2;return;
  // TAY
  case 0xA8:emu.Y=emu.A;setNZ(emu.Y);emu.cycles+=2;return;
  // TAX
  case 0xAA:emu.X=emu.A;setNZ(emu.X);emu.cycles+=2;return;
  // LDA
  case 0xA1:emu.A=cpuRead(izx());setNZ(emu.A);emu.cycles+=6;return;
  case 0xA5:emu.A=cpuRead(zp());setNZ(emu.A);emu.cycles+=3;return;
  case 0xA9:emu.A=cpuRead(imm());setNZ(emu.A);emu.cycles+=2;return;
  case 0xAD:emu.A=cpuRead(ab());setNZ(emu.A);emu.cycles+=4;return;
  case 0xB1:emu.A=cpuRead(izy());setNZ(emu.A);emu.cycles+=5;return;
  case 0xB5:emu.A=cpuRead(zpx());setNZ(emu.A);emu.cycles+=4;return;
  case 0xB9:emu.A=cpuRead(aby());setNZ(emu.A);emu.cycles+=4;return;
  case 0xBD:emu.A=cpuRead(abx());setNZ(emu.A);emu.cycles+=4;return;
  // LDX
  case 0xA2:emu.X=cpuRead(imm());setNZ(emu.X);emu.cycles+=2;return;
  case 0xA6:emu.X=cpuRead(zp());setNZ(emu.X);emu.cycles+=3;return;
  case 0xAE:emu.X=cpuRead(ab());setNZ(emu.X);emu.cycles+=4;return;
  case 0xB6:emu.X=cpuRead(zpy());setNZ(emu.X);emu.cycles+=4;return;
  case 0xBE:emu.X=cpuRead(aby());setNZ(emu.X);emu.cycles+=4;return;
  // LDY
  case 0xA0:emu.Y=cpuRead(imm());setNZ(emu.Y);emu.cycles+=2;return;
  case 0xA4:emu.Y=cpuRead(zp());setNZ(emu.Y);emu.cycles+=3;return;
  case 0xAC:emu.Y=cpuRead(ab());setNZ(emu.Y);emu.cycles+=4;return;
  case 0xB4:emu.Y=cpuRead(zpx());setNZ(emu.Y);emu.cycles+=4;return;
  case 0xBC:emu.Y=cpuRead(abx());setNZ(emu.Y);emu.cycles+=4;return;
  // BCS
  case 0xB0:br(!!emu.C);emu.cycles+=2;return;
  // CLV
  case 0xB8:emu.V=0;emu.cycles+=2;return;
  // TSX
  case 0xBA:emu.X=emu.SP;setNZ(emu.X);emu.cycles+=2;return;
  // CMP
  case 0xC1:cmp(emu.A,cpuRead(izx()));emu.cycles+=6;return;
  case 0xC5:cmp(emu.A,cpuRead(zp()));emu.cycles+=3;return;
  case 0xC9:cmp(emu.A,cpuRead(imm()));emu.cycles+=2;return;
  case 0xCD:cmp(emu.A,cpuRead(ab()));emu.cycles+=4;return;
  case 0xD1:cmp(emu.A,cpuRead(izy()));emu.cycles+=5;return;
  case 0xD5:cmp(emu.A,cpuRead(zpx()));emu.cycles+=4;return;
  case 0xD9:cmp(emu.A,cpuRead(aby()));emu.cycles+=4;return;
  case 0xDD:cmp(emu.A,cpuRead(abx()));emu.cycles+=4;return;
  // CPX
  case 0xE0:cmp(emu.X,cpuRead(imm()));emu.cycles+=2;return;
  case 0xE4:cmp(emu.X,cpuRead(zp()));emu.cycles+=3;return;
  case 0xEC:cmp(emu.X,cpuRead(ab()));emu.cycles+=4;return;
  // CPY
  case 0xC0:cmp(emu.Y,cpuRead(imm()));emu.cycles+=2;return;
  case 0xC4:cmp(emu.Y,cpuRead(zp()));emu.cycles+=3;return;
  case 0xCC:cmp(emu.Y,cpuRead(ab()));emu.cycles+=4;return;
  // DEC
  case 0xC6:a=zp();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=5;return;
  case 0xCE:a=ab();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0xD6:a=zpx();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0xDE:a=abx();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=7;return;
  // INC
  case 0xE6:a=zp();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=5;return;
  case 0xEE:a=ab();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0xF6:a=zpx();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=6;return;
  case 0xFE:a=abx();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);setNZ(v);emu.cycles+=7;return;
  // DEX INX
  case 0xCA:emu.X=(emu.X-1)&0xFF;setNZ(emu.X);emu.cycles+=2;return;
  case 0xE8:emu.X=(emu.X+1)&0xFF;setNZ(emu.X);emu.cycles+=2;return;
  // INY
  case 0xC8:emu.Y=(emu.Y+1)&0xFF;setNZ(emu.Y);emu.cycles+=2;return;
  // SBC
  case 0xE1:sbc(cpuRead(izx()));emu.cycles+=6;return;
  case 0xE5:sbc(cpuRead(zp()));emu.cycles+=3;return;
  case 0xE9:sbc(cpuRead(imm()));emu.cycles+=2;return;
  case 0xEB:sbc(cpuRead(imm()));emu.cycles+=2;return; // unofficial SBC
  case 0xED:sbc(cpuRead(ab()));emu.cycles+=4;return;
  case 0xF1:sbc(cpuRead(izy()));emu.cycles+=5;return;
  case 0xF5:sbc(cpuRead(zpx()));emu.cycles+=4;return;
  case 0xF9:sbc(cpuRead(aby()));emu.cycles+=4;return;
  case 0xFD:sbc(cpuRead(abx()));emu.cycles+=4;return;
  // BNE BEQ
  case 0xD0:br(!emu.Z);emu.cycles+=2;return;
  case 0xF0:br(!!emu.Z);emu.cycles+=2;return;
  // CLD SED
  case 0xD8:emu.D=0;emu.cycles+=2;return;
  case 0xF8:emu.D=1;emu.cycles+=2;return;
  // NOP
  case 0xEA:emu.cycles+=2;return;
  // ── Unofficial opcodes ──
  // Implied NOPs
  case 0x1A:case 0x3A:case 0x5A:case 0x7A:case 0xDA:case 0xFA:emu.cycles+=2;return;
  // 2-byte NOPs (skip 1)
  case 0x04:case 0x14:case 0x34:case 0x44:case 0x54:case 0x64:case 0x74:
  case 0x80:case 0x82:case 0x89:case 0xC2:case 0xD4:case 0xE2:case 0xF4:emu.PC++;emu.cycles+=3;return;
  // 3-byte NOPs (skip 2)
  case 0x0C:case 0x1C:case 0x3C:case 0x5C:case 0x7C:case 0xDC:case 0xFC:emu.PC+=2;emu.cycles+=4;return;
  // JAM/KIL (halt opcodes — skip 1 byte, don't crash)
  case 0x02:case 0x12:case 0x22:case 0x32:case 0x42:case 0x52:
  case 0x62:case 0x72:case 0x92:case 0xB2:case 0xD2:case 0xF2:emu.PC++;emu.cycles+=2;return;
  // LAX
  case 0xA7:emu.A=emu.X=cpuRead(zp());setNZ(emu.A);emu.cycles+=3;return;
  case 0xB7:emu.A=emu.X=cpuRead(zpy());setNZ(emu.A);emu.cycles+=4;return;
  case 0xAF:emu.A=emu.X=cpuRead(ab());setNZ(emu.A);emu.cycles+=4;return;
  case 0xBF:emu.A=emu.X=cpuRead(aby());setNZ(emu.A);emu.cycles+=4;return;
  case 0xA3:emu.A=emu.X=cpuRead(izx());setNZ(emu.A);emu.cycles+=6;return;
  case 0xB3:emu.A=emu.X=cpuRead(izy());setNZ(emu.A);emu.cycles+=5;return;
  // SAX
  case 0x87:cpuWrite(zp(),emu.A&emu.X);emu.cycles+=3;return;
  case 0x97:cpuWrite(zpy(),emu.A&emu.X);emu.cycles+=4;return;
  case 0x8F:cpuWrite(ab(),emu.A&emu.X);emu.cycles+=4;return;
  case 0x83:cpuWrite(izx(),emu.A&emu.X);emu.cycles+=6;return;
  // DCP
  case 0xC7:a=zp();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=5;return;
  case 0xD7:a=zpx();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=6;return;
  case 0xCF:a=ab();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=6;return;
  case 0xDF:a=abx();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=7;return;
  case 0xDB:a=aby();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=7;return;
  case 0xC3:a=izx();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=8;return;
  case 0xD3:a=izy();v=(cpuRead(a)-1)&0xFF;cpuWrite(a,v);cmp(emu.A,v);emu.cycles+=8;return;
  // ISC
  case 0xE7:a=zp();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=5;return;
  case 0xF7:a=zpx();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=6;return;
  case 0xEF:a=ab();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=6;return;
  case 0xFF:a=abx();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=7;return;
  case 0xFB:a=aby();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=7;return;
  case 0xE3:a=izx();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=8;return;
  case 0xF3:a=izy();v=(cpuRead(a)+1)&0xFF;cpuWrite(a,v);sbc(v);emu.cycles+=8;return;
  // SLO
  case 0x07:a=zp();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=5;return;
  case 0x17:a=zpx();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=6;return;
  case 0x0F:a=ab();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=6;return;
  case 0x1F:a=abx();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=7;return;
  case 0x1B:a=aby();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=7;return;
  case 0x03:a=izx();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=8;return;
  case 0x13:a=izy();v=cpuRead(a);emu.C=(v>>7)&1;v=(v<<1)&0xFF;cpuWrite(a,v);emu.A|=v;setNZ(emu.A);emu.cycles+=8;return;
  // RLA
  case 0x27:a=zp();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=5;return;
  case 0x37:a=zpx();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=6;return;
  case 0x2F:a=ab();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=6;return;
  case 0x3F:a=abx();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=7;return;
  case 0x3B:a=aby();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=7;return;
  case 0x23:a=izx();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=8;return;
  case 0x33:a=izy();v=cpuRead(a);t=emu.C;emu.C=(v>>7)&1;v=((v<<1)|t)&0xFF;cpuWrite(a,v);emu.A&=v;setNZ(emu.A);emu.cycles+=8;return;
  // SRE
  case 0x47:a=zp();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=5;return;
  case 0x57:a=zpx();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=6;return;
  case 0x4F:a=ab();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=6;return;
  case 0x5F:a=abx();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=7;return;
  case 0x5B:a=aby();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=7;return;
  case 0x43:a=izx();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=8;return;
  case 0x53:a=izy();v=cpuRead(a);emu.C=v&1;v>>=1;cpuWrite(a,v);emu.A^=v;setNZ(emu.A);emu.cycles+=8;return;
  // RRA
  case 0x67:a=zp();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=5;return;
  case 0x77:a=zpx();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=6;return;
  case 0x6F:a=ab();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=6;return;
  case 0x7F:a=abx();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=7;return;
  case 0x7B:a=aby();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=7;return;
  case 0x63:a=izx();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=8;return;
  case 0x73:a=izy();v=cpuRead(a);t=emu.C;emu.C=v&1;v=(v>>1)|(t<<7);cpuWrite(a,v);adc(v);emu.cycles+=8;return;
  // ANC/ALR/ARR
  case 0x0B:case 0x2B:emu.A&=cpuRead(imm());setNZ(emu.A);emu.C=emu.N;emu.cycles+=2;return;
  case 0x4B:emu.A&=cpuRead(imm());emu.C=emu.A&1;emu.A>>=1;setNZ(emu.A);emu.cycles+=2;return;
  case 0x6B:emu.A&=cpuRead(imm());emu.A=(emu.A>>1)|(emu.C<<7);setNZ(emu.A);emu.C=(emu.A>>6)&1;emu.V=((emu.A>>6)^(emu.A>>5))&1;emu.cycles+=2;return;
  // Unknown
  default:emu.opsMissed++;throw new Error('Unsupported CPU opcode $'+op.toString(16).toUpperCase()+' at $'+((emu.PC-1)&65535).toString(16).toUpperCase());
  }
}
return Object.freeze({step:cpuStepRaw});
}
return Object.freeze({create,version:1});
});
