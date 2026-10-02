#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn}),plain=value=>JSON.parse(JSON.stringify(value)),digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fresh(environment={}){const h=loadForge(html,{environment:{crypto:crypto.webcrypto,...environment}});assert.deepEqual(h.errors,[]);h.model=h.context.Forge.services.REAnalysis;assert.ok(h.model,'Actual bundle must include REAnalysis');return h;}
function rom({prg=1,chr=1,mapper=0,trainer=false,nes2=false,submapper=0,extra=0}={}){const b=new Uint8Array(16+(trainer?512:0)+prg*16384+chr*8192+extra);b.set([0x4e,0x45,0x53,0x1a,prg,chr,((mapper&15)<<4)|(trainer?4:0),(mapper&0xf0)|(nes2?8:0)]);if(nes2)b[8]=((submapper&15)<<4)|((mapper>>8)&15);return b;}
function guard(h){return {project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),emulator:h.json('({loaded:emu.loaded,running:emu.running,frame:emu.frameCount,PC:emu.PC})'),rom:h.run('emu.lastBuiltRom')};}
function unchanged(h,b){assert.equal(h.run('Forge.services.ProjectStore.serialize()'),b.project);assert.deepEqual(h.json('({undo:undoStack,redo:redoStack,undoBytes})'),b.history);assert.deepEqual(h.json('({loaded:emu.loaded,running:emu.running,frame:emu.frameCount,PC:emu.PC})'),b.emulator);assert.equal(h.run('emu.lastBuiltRom'),b.rom);}

test('Unknown engine and mapper open for inspection without changing project, undo or emulator',async()=>{
 const h=fresh(),b=rom({mapper:255,prg:3}),before=guard(h);b[16]=0xa9;b[17]=0x2a;const a=await h.model.open(b,{name:'unknown-engine.nes'});unchanged(h,before);
 assert.equal(a.report.format,'NESForgeREInspection');assert.equal(a.report.version,2);assert.equal(a.report.header.status,'valid');assert.equal(a.report.header.mapper,255);assert.equal(a.report.identity.sha256,digest(b));assert.equal(a.report.cpuMapping.status,'unknown');assert.equal(a.report.capabilities.emulation.status,'not-evaluated');assert.equal(a.report.capabilities.recovery.status,'not-checked');assert.equal(a.disassemble({fileOffset:16,length:2}).rows[0].text,'LDA #$2A');
});
test('Raw non-NES binary and empty file retain exact physical identity without invented platform',async()=>{
 const h=fresh(),b=Uint8Array.from([0xa9,0xff,0x60]),a=await h.model.open(b,{name:'machine.bin'}),empty=await h.model.open(new Uint8Array());
 assert.equal(a.report.header.format,'raw');assert.equal(a.report.layout.prg,null);assert.equal(a.report.layout.raw.length,3);assert.equal(a.report.cpuMapping.windows.length,0);assert.deepEqual(plain(a.read(0,3).bytes),[0xa9,255,0x60]);assert.equal(empty.report.identity.byteLength,0);assert.equal(empty.report.identity.sha256,digest(Buffer.alloc(0)));assert.equal(empty.read(0,0).bytes.length,0);assert.equal(empty.disassemble({fileOffset:0,length:0}).rows.length,0);assert.equal(empty.search([1]).hasMore,false);
});
test('Truncated, extended and invalid NES headers fall back to raw bytes rather than reject analysis',async()=>{
 const h=fresh();const variants=[Uint8Array.from([0x4e,0x45,0x53,0x1a,1]),rom().slice(0,-1),rom(),rom(),rom()];variants[2][10]=1;variants[3][7]=4;variants[4][4]=0;
 for(const b of variants){const a=await h.model.open(b);assert.equal(a.report.header.status,'raw');assert.equal(a.report.layout.prg,null);assert.equal(a.report.identity.sha256,digest(b));assert.ok(a.report.warnings[0]);assert.equal(a.read(0,Math.min(16,b.length)).bytes.length,Math.min(16,b.length));}
});
test('NROM 16KiB mirror mapping and vectors use real physical offsets',async()=>{
 const h=fresh(),b=rom(),at=16+16384-6;b.set([0x34,0x82,0x78,0x85,0xbc,0x9a],at);const a=await h.model.open(b),w=a.report.cpuMapping.windows;
 assert.equal(a.report.cpuMapping.profile,'NROM-128');assert.equal(w[0].file.start,16);assert.equal(w[1].file.start,16);assert.equal(w[0].cpu.start,0x8000);assert.equal(w[1].cpu.start,0xc000);assert.deepEqual(plain(a.report.vectors.map(v=>v.target)),[0x8234,0x8578,0x9abc]);assert.equal(a.report.vectors[0].fileOffset,at);assert.equal(a.report.vectors[0].provenance.sha256,digest(b));
});
test('Trainer, distinct NROM32 banks and trailing bytes retain exact spans and hash',async()=>{
 const h=fresh(),b=rom({prg:2,trainer:true,extra:7}),a=await h.model.open(b);
 assert.equal(a.report.layout.trainer.start,16);assert.equal(a.report.layout.trainer.length,512);assert.equal(a.report.layout.prg.start,528);assert.equal(a.report.layout.chr.start,33296);assert.equal(a.report.layout.trailing.length,7);assert.equal(a.report.cpuMapping.windows[1].file.start,16912);assert.equal(a.report.identity.sha256,digest(b));
});
test('NES2 mapper high bits, submapper and linear ROM size are decoded without runtime claims',async()=>{
 const h=fresh(),b=rom({prg:2,mapper:0xabc,nes2:true,submapper:7}),a=await h.model.open(b);
 assert.equal(a.report.header.format,'NES 2.0');assert.equal(a.report.header.mapper,0xabc);assert.equal(a.report.header.submapper,7);assert.equal(a.report.layout.prg.length,32768);assert.equal(a.report.cpuMapping.status,'unknown');assert.equal(a.report.vectors[1].status,'unknown');
});
test('NES2 exponent-multiplier sizes and unsafe declarations are handled without allocations from headers',async()=>{
 const h=fresh(),b=new Uint8Array(16+24576+8192);b.set([0x4e,0x45,0x53,0x1a,(13<<2)|1,(13<<2),0,8,0,0xff]);const a=await h.model.open(b);
 assert.equal(a.report.header.status,'valid');assert.equal(a.report.header.prgSize,24576);assert.equal(a.report.header.chrSize,8192);assert.equal(a.report.layout.chr.start,24592);assert.equal(a.report.cpuMapping.status,'unknown');
 b[4]=255;const unsafe=await h.model.open(b);assert.equal(unsafe.report.header.status,'raw');assert.match(unsafe.report.warnings[0],/bounded/);b[4]=(13<<2)|1;b[12]=128;assert.equal((await h.model.open(b)).report.header.status,'raw');
});
test('NES2 linear size upper nibble is measured in PRG and CHR units',async()=>{
 const h=fresh(),b=new Uint8Array(16+256*16384+8192);b.set([0x4e,0x45,0x53,0x1a,0,1,0x20,8,0,1]);const a=await h.model.open(b);assert.equal(a.report.header.prgSize,4194304);assert.equal(a.report.layout.chr.start,4194320);
});
test('Input bytes are copied synchronously before asynchronous digest resolves',async()=>{
 let finish,received;const h=fresh({crypto:{subtle:{digest:async(_,bytes)=>{received=bytes;return new Promise(resolve=>{finish=()=>{const result=crypto.createHash('sha256').update(bytes).digest();resolve(result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength));};});}}}});
 const original=Uint8Array.from([0xa9,1,0x60]),expected=digest(original),pending=h.model.open(original,{name:'race.bin'});original.fill(0);assert.deepEqual(Array.from(received),[0xa9,1,0x60]);
 assert.notEqual(received,original);finish();const a=await pending;assert.equal(a.report.identity.sha256,expected);assert.deepEqual(plain(a.read(0,3).bytes),[0xa9,1,0x60]);
});
test('Caller ArrayBuffer views and returned objects cannot mutate retained bytes or evidence',async()=>{
 const h=fresh(),underlying=Uint8Array.from([9,0xa9,7,0x60,9]),view=underlying.subarray(1,4),a=await h.model.open(view),r=a.read(0,3);underlying.fill(0);
 assert.equal(a.report.identity.byteLength,3);assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.report)&&Object.isFrozen(a.report.header.rawBytes)&&Object.isFrozen(r.bytes));assert.throws(()=>{r.bytes[0]=0;},TypeError);assert.deepEqual(plain(a.read(0,3).bytes),[0xa9,7,0x60]);assert.notEqual(a.read(0,3).bytes,r.bytes);
 const buffer=Uint8Array.from([1,2]).buffer,opened=await h.model.open(buffer);new Uint8Array(buffer).fill(8);assert.deepEqual(plain(opened.read(0,2).bytes),[1,2]);
});
test('Shared memory, unsupported input and unavailable hash are rejected clearly',async()=>{
 const h=fresh({SharedArrayBuffer}),shared=new Uint8Array(new SharedArrayBuffer(4));await assert.rejects(h.model.open(shared),/Shared memory/);await assert.rejects(h.model.open([1,2]),/Uint8Array/);await assert.rejects(h.model.open('bytes'),/Uint8Array/);await assert.rejects(h.model.open(new Uint8Array(),{name:1}),/text/);await assert.rejects(fresh({crypto:undefined}).model.open(new Uint8Array()),/SHA-256 is unavailable/);
});
test('Input and all public output bounds reject negatives, overflow, fractional values and oversized requests',async()=>{
 const h=fresh(),a=await h.model.open(new Uint8Array(70000));await assert.rejects(h.model.open(new Uint8Array(64*1024*1024+1)),/Input byte length/);
 for(const args of[[-1,1],[0,65537],[70000,1],[0,1.2],[NaN,1],[0,Infinity]])assert.throws(()=>a.read(...args),/RE analysis:/);
 assert.equal(a.read(0,65536).bytes.length,65536);for(const v of[4097,-1,1.5])assert.throws(()=>a.disassemble({fileOffset:0,length:v}),/Disassembly length/);assert.throws(()=>a.search([0],{maxScan:1048577}),/Maximum scanned/);assert.throws(()=>a.search([0],{maxResults:257}),/Maximum results/);
});
test('Explicit CPU mappings preserve overlapping banks and reject crossing physical or CPU limits',async()=>{
 const h=fresh(),a=await h.model.open(new Uint8Array(32768)),first=a.mapRange({fileOffset:0,length:16384,cpuAddress:0x8000,bankLabel:'bank 0'}),second=a.mapRange({fileOffset:16384,length:16384,cpuAddress:0x8000,bankLabel:'bank 1'});
 assert.equal(first.cpuAddress,second.cpuAddress);assert.notEqual(first.fileOffset,second.fileOffset);assert.equal(first.evidence,'user-supplied-mapping');assert.equal(first.provenance.sha256,second.provenance.sha256);assert.ok(Object.isFrozen(first));assert.equal(a.report.cpuMapping.windows.length,0);
 for(const config of[{fileOffset:0,length:2,cpuAddress:65535},{fileOffset:32768,length:1,cpuAddress:0},{fileOffset:0,length:0,cpuAddress:0},{fileOffset:0,length:1,cpuAddress:null},{fileOffset:0,length:1,cpuAddress:NaN}])assert.throws(()=>a.mapRange(config),/RE analysis:/);
 assert.equal(a.mapRange({fileOffset:0,length:1,cpuAddress:65535}).cpu.endExclusive,65536);
});
test('Every documented addressing form uses correct little-endian operands and instruction lengths',async()=>{
 const h=fresh(),bytes=Uint8Array.from([0xa9,0x12,0xa5,0x34,0xb5,0x56,0xb6,0x78,0xad,0x34,0x12,0xbd,0x78,0x56,0xb9,0xbc,0x9a,0xa1,0x20,0xb1,0x22,0x6c,0xff,0x12,0x0a,0xea]),a=await h.model.open(bytes),d=a.disassemble({fileOffset:0,length:bytes.length,cpuAddress:0x8000});
 assert.deepEqual(plain(d.rows.map(r=>r.text)),['LDA #$12','LDA $34','LDA $56,X','LDX $78,Y','LDA $1234','LDA $5678,X','LDA $9ABC,Y','LDA ($20,X)','LDA ($22),Y','JMP ($12FF)','ASL A','NOP']);assert.equal(d.rows[9].target,null);assert.equal(d.rows.at(-1).cpuAddress,0x8019);assert.equal(d.rows.reduce((sum,r)=>sum+r.length,0),bytes.length);
});
test('Relative branches use signed offsets and wrap targets only with an explicit CPU origin',async()=>{
 const h=fresh(),a=await h.model.open(Uint8Array.from([0xd0,0xfe,0x10,0x7f,0x30,0x80])),raw=a.disassemble({fileOffset:0,length:6}),mapped=a.disassemble({fileOffset:0,length:6,cpuAddress:0xfffa});
 assert.equal(raw.rows[0].cpuAddress,null);assert.equal(raw.rows[0].target,null);assert.equal(raw.rows[0].operand,'-2 from next PC');assert.deepEqual(plain(mapped.rows.map(r=>r.target)),[0xfffa,0x007d,0xff80]);assert.throws(()=>a.disassemble({fileOffset:0,length:6,cpuAddress:0xfffb}),/crosses/);
});
test('Disassembly is independent from static NROM mapping and absolute jumps expose encoded targets only',async()=>{
 const h=fresh(),b=rom();b.set([0x20,0x34,0x12,0x4c,0x78,0x56],16);const a=await h.model.open(b),d=a.disassemble({fileOffset:16,length:6});assert.equal(d.mapping,null);assert.equal(d.rows[0].cpuAddress,null);assert.equal(d.rows[0].target,0x1234);assert.equal(d.rows[1].target,0x5678);assert.equal(d.rows[0].status,'candidate-instruction');
});
test('Unknown opcodes and truncated operands retain exact bytes with uncertainty instead of fabricated instructions',async()=>{
 const h=fresh(),a=await h.model.open(Uint8Array.from([0x02,0x80,0xea,0xad,0x12])),d=a.disassemble({fileOffset:0,length:5});assert.deepEqual(plain(d.rows.map(r=>r.mnemonic)),['.byte','.byte','NOP','.byte','.byte']);assert.equal(d.rows[0].status,'unclassified-byte');assert.equal(d.rows[3].status,'truncated-instruction');assert.deepEqual(plain(d.rows.flatMap(r=>r.bytes)),[2,128,234,173,18]);assert.match(d.warnings.join(' '),/uncertain/);
});
test('NMOS and 2A03 document exactly 151 encodings and reject accidental CMOS decoding',async()=>{
 const h=fresh(),a=await h.model.open(new Uint8Array(768));let count=0;
 for(let opcode=0;opcode<256;opcode++){const b=await h.model.open(Uint8Array.from([opcode,0x12,0x34])),n=b.disassemble({fileOffset:0,length:3,variant:'6502'}).rows[0],nes=b.disassemble({fileOffset:0,length:3,variant:'2a03'}).rows[0];assert.equal(n.text,nes.text);if(n.status==='candidate-instruction')count++;}
 assert.equal(count,151);assert.throws(()=>a.disassemble({fileOffset:0,length:1,variant:'65c02'}),/Unsupported CPU variant/);const brk=(await h.model.open(Uint8Array.from([0]))).disassemble({fileOffset:0,length:1}).rows[0];assert.equal(brk.length,1);assert.match(brk.note,/padding/);
});
test('Chunked search retains every match crossing scan boundaries without duplicate offsets',async()=>{
 const h=fresh(),b=Uint8Array.from([0,1,2,3,1,2,3,1,2,3,0]),a=await h.model.open(b);let start=0,results=[],calls=0;do{const page=a.search([1,2,3],{start,maxScan:4,maxResults:2});results.push(...page.matches.map(m=>m.fileOffset));assert.ok(page.scannedBytes<=4);assert.ok(Object.isFrozen(page.matches));start=page.nextStart;calls++;if(!page.hasMore)break;assert.ok(calls<20);}while(true);assert.deepEqual(results,[1,4,7]);assert.equal(start,b.length);
});
test('Result-limited search resumes overlapping repeated matches without skipping',async()=>{
 const h=fresh(),a=await h.model.open(Uint8Array.from([7,7,7,7,7])),first=a.search([7,7],{maxResults:1,maxScan:5}),second=a.search([7,7],{start:first.nextStart,maxResults:1,maxScan:5});assert.equal(first.matches[0].fileOffset,0);assert.equal(first.nextStart,1);assert.equal(second.matches[0].fileOffset,1);assert.equal(second.nextStart,2);const end=a.search([7,7],{start:3,maxResults:1});assert.equal(end.matches[0].fileOffset,3);assert.equal(end.hasMore,false);assert.equal(end.nextStart,5);
});
test('Search validates pattern and scan progress, and reads at most its explicit bound',async()=>{
 const h=fresh(),a=await h.model.open(new Uint8Array(1100000));for(const pattern of[[],[256],[-1],[1.5],new Array(257).fill(0),'00'])assert.throws(()=>a.search(pattern),/RE analysis:/);assert.throws(()=>a.search([1,2],{maxScan:1}),/Maximum scanned/);assert.throws(()=>a.search([0],{start:-1}),/Search start/);const bounded=a.search([1],{maxScan:1048576});assert.equal(bounded.scannedBytes,1048576);assert.equal(bounded.nextStart,1048576);assert.equal(bounded.hasMore,true);assert.equal(a.search([0],{start:1100000}).hasMore,false);
});
test('Physical CHR bitplanes and source evidence decode independently of an unsupported mapper',async()=>{
 const h=fresh(),b=rom({mapper:255}),offset=16+16384;b[offset]=0x80;b[offset+8]=0x40;const a=await h.model.open(b),tile=a.readChrTile(0);assert.equal(tile.pixels[0][0],1);assert.equal(tile.pixels[0][1],2);assert.equal(tile.pixels[0][2],0);assert.equal(tile.fileOffset,offset);assert.equal(tile.ppuMapping.status,'unknown');assert.equal(tile.provenance.sha256,digest(b));assert.equal(a.report.chr.tileCount,512);assert.throws(()=>a.readChrTile(512),/tile index/);assert.ok(Object.isFrozen(tile.pixels[0]));
});
test('CHR RAM and raw layouts never invent graphics from unrelated bytes',async()=>{
 const h=fresh(),ram=await h.model.open(rom({chr:0})),raw=await h.model.open(new Uint8Array(64));assert.equal(ram.report.chr.status,'runtime-CHR-RAM-unknown');assert.throws(()=>ram.readChrTile(0),/No CHR ROM/);assert.equal(raw.report.chr.status,'layout-unknown');assert.throws(()=>raw.readChrTile(0),/CHR layout is unknown/);
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}const passed=results.filter(r=>r.passed).length,report={suite:'re-analysis-model',html:path.basename(html),htmlSha256:digest(fs.readFileSync(html)),scope:'Actual bundled read-only analysis model; physical bytes, container declarations, explicit mappings and instruction candidates. No browser layout or universal emulator acceptance claim.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})().catch(error=>{console.error(error);process.exitCode=1;});
