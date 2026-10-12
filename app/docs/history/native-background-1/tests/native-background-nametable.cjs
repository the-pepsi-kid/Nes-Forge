#!/usr/bin/env node
'use strict';
// Source-backed native data/loader checks, including one isolated original
// 6502 loader execution through bundled CPU/PPU buses; not full-game acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(process.argv[2]||path.join(root,manifest.output)),tests=[],test=(name,fn)=>tests.push({name,fn}),cp=value=>JSON.parse(JSON.stringify(value)),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const dir=path.join(root,'examples/RE_Native_Audio'),h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);const api=h.context.Forge.services.REPointerNametable;assert.ok(api,'Actual bundle must include the pointer-page background profile');
const bytes=name=>new Uint8Array(fs.readFileSync(path.join(dir,name))),decode=value=>api.decode(value),base=bytes('HonkeyPong-reproduced.nes');
function good(value){const out=decode(value);assert.equal(out.status,'supported',out.reason);return out.background;}
function mapping(value){const size=value[4]*16384;return{offset:address=>16+(address-0x8000)%size,address:offset=>(size===16384?0xc000:0x8000)+offset-16};}
function putWord(bytes,offset,value){bytes[offset]=value&255;bytes[offset+1]=(value>>>8)&255;}
function state(){return{project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),emulator:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,frame:emu.frameCount})')};}

test('Independent unchanged source yields native title records, selected bank and exact construction evidence',()=>{
 const before=state(),copy=base.slice(),out=good(copy);assert.deepEqual(Array.from(copy),Array.from(base));assert.equal(out.backgroundPatternTable,0);assert.equal(out.chrBytes.length,4096);assert.deepEqual(cp(out.chrBytes),Array.from(base.slice(0x4010,0x5010)));assert.deepEqual(cp(out.palette),Array.from(base.slice(0x402,0x422)));assert.deepEqual(cp(out.nametable),Array.from(base.slice(0x442,0x842)));assert.equal(out.knownNametable.length,1024);assert.equal(out.knownNametable.filter(Boolean).length,1023);assert.equal(out.knownNametable[1023],false);assert.equal(out.construction.loader.fileOffset,0x10a);assert.equal(out.construction.loader.sourceCpuAddress,0xc432);assert.equal(out.construction.transfer.writeCount,1023);assert.equal(out.construction.control.ppuMask,0x18);assert.equal(out.construction.control.leftBackgroundPixelsClipped,8);assert.ok(out.unknown.includes('nametable-byte-1023-prior-state'));assert.ok(out.unknown.includes('collision'));assert.equal(Object.isFrozen(out.nametable),true);for(const evidence of out.evidence)for(const range of evidence.ranges)assert.ok(range.start>=0&&range.length>0&&range.start+range.length<=base.length);assert.deepEqual(state(),before);
});

test('Relocated driver and 32 KiB source-derived variants use structural pointers rather than file identity',()=>{
 const original=good(base);for(const name of ['relocated.nes','nrom32.nes']){const source=bytes(name),out=good(source);assert.notEqual(sha(source),sha(base));assert.deepEqual(cp(out.nametable),cp(original.nametable));assert.deepEqual(cp(out.palette),cp(original.palette));assert.deepEqual(cp(out.chrBytes),cp(original.chrBytes));if(name==='nrom32.nes'){assert.equal(out.construction.loader.sourceCpuAddress,0x8432);assert.equal(out.construction.dispatch.entryAddress,0x88e8);}}
});

test('Valid edits at page boundaries obey actual CPY FF transfer ordering and preserve unknown final attribute',()=>{
 const altered=base.slice(),source=0x442;altered[source+255]=7;altered[source+511]=8;altered[source+767]=9;altered[source+1023]=10;const out=good(altered);assert.equal(out.nametable[255],8);assert.equal(out.nametable[511],9);assert.equal(out.nametable[767],10);assert.equal(out.nametable[1023],0);assert.equal(out.knownNametable[1023],false);assert.equal(out.construction.transfer.sourceIndices.includes(255),false);assert.equal(out.construction.transfer.sourceIndices[255],511);assert.equal(out.construction.transfer.sourceIndices[511],767);assert.equal(out.construction.transfer.sourceIndices[767],1023);
});

test('Valid nametable, palette and CHR edits decode directly without recognizing a fixed corpus hash',()=>{
 const altered=base.slice();altered[0x442+99]=37;altered[0x402+1]=0x20;altered[0x4010+17]^=0x80;const out=good(altered);assert.equal(out.nametable[99],37);assert.equal(out.palette[1],0x20);assert.equal(out.chrBytes[17],altered[0x4010+17]);assert.notEqual(sha(altered),sha(base));
});

test('Sequential palette upload models sprite universal aliases and retains original transfer bytes',()=>{
 const altered=base.slice();altered[0x402]=2;altered[0x402+4]=3;altered[0x402+16]=4;altered[0x402+20]=5;const out=good(altered);assert.equal(out.palette[0],4);assert.equal(out.palette[16],4);assert.equal(out.palette[4],5);assert.equal(out.palette[20],5);assert.equal(out.construction.palette.rawBytes[0],2);assert.equal(out.construction.palette.rawBytes[4],3);assert.equal(out.construction.palette.rawBytes[16],4);assert.equal(out.ppuMask,0x18);
});

test('Relocating native map and palette records follows code pointers and records new physical evidence',()=>{
 const altered=base.slice(),map=mapping(altered);altered.set(base.slice(0x442,0x842),0x2800);altered.set(base.slice(0x402,0x422),0x2d00);const address=map.address(0x2800);altered[0x10a+5]=address&255;altered[0x10a+9]=address>>>8;putWord(altered,0x8f8+40,map.address(0x2d00));const out=good(altered),original=good(base);assert.equal(out.construction.loader.sourceFileOffset,0x2800);assert.equal(out.construction.palette.fileOffset,0x2d00);assert.deepEqual(cp(out.nametable),cp(original.nametable));assert.deepEqual(cp(out.palette),cp(original.palette));assert.ok(out.evidence.some(item=>item.ranges.some(range=>range.start===0x2800&&range.length===1024)));
});

test('Coherent zero-page pointer and pattern-table selection changes remain declared format variations',()=>{
 const altered=base.slice();for(const offset of [7,26])altered[0x10a+offset]=0x55;for(const offset of [11,36])altered[0x10a+offset]=0x56;altered[0x8f8+57]=0x90;const out=good(altered);assert.equal(out.construction.loader.zeroPagePointer,0x55);assert.equal(out.backgroundPatternTable,1);assert.deepEqual(cp(out.chrBytes),Array.from(base.slice(0x5010,0x6010)));
});

test('Incidental loop bytes without vector-linked dispatch and mismatched control/routines are not supported',()=>{
 for(const mutate of [b=>putWord(b,0x400a,0xc000),b=>b[0x166b+24]=4,b=>b[0x8f8+92]^=1,b=>b[0x10a+11]^=1,b=>b[0x10a+32]=0,b=>b[0x8f8+57]=0x84,b=>b[0x1f+1]=0x1e,b=>b[0x79+1]=1]){const altered=base.slice();mutate(altered);assert.notEqual(decode(altered).status,'supported');}
});

test('Malformed pointers, six-bit palette overflow and unsupported containers refuse within bounded reads',()=>{
 for(const mutate of [b=>{b[0x10a+5]=0;b[0x10a+9]=0x7f;},b=>{b[0x10a+5]=0x80;b[0x10a+9]=0xff;},b=>putWord(b,0x8f8+40,0xfff0),b=>b[0x402+2]=64,b=>b[6]=0x10,b=>b[10]=0x20,b=>b[11]=1,b=>b[5]=0,b=>b[7]=8]){const altered=base.slice();mutate(altered);assert.notEqual(decode(altered).status,'supported');}assert.notEqual(decode(base.slice(0,2000)).status,'supported');const strict=base.slice();strict[10]=0;assert.equal(decode(strict).status,'supported');assert.notEqual(decode(new Uint8Array(16)).status,'supported');
});

test('Ambiguous vector-linked constructions fail instead of choosing a matching source arbitrarily',()=>{
 const altered=base.slice(),map=mapping(altered);altered.set(base.slice(0x8f8,0x8f8+94),0x3000);putWord(altered,0x166b+26,map.address(0x3000));const out=decode(altered);assert.equal(out.status,'ambiguous');assert.equal(out.background,undefined);
});

test('Original 6502 loader execution independently confirms boundary writes and preserves the unknown final attribute',()=>{
 const altered=base.slice(),source=0x442;altered[source+99]=37;altered[source+255]=7;altered[source+511]=8;altered[source+767]=9;altered[source+1023]=10;const decoded=good(altered),inputHash=sha(altered),runtime=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(runtime.errors,[]);runtime.context.backgroundRuntimeROM=altered;
 assert.equal(runtime.run('emuLoadRomData(backgroundRuntimeROM,"Pointer loader execution proof",0)'),true);
 // Enter the unchanged assembled loader at its independently source-mapped
 // address. Stack return and preloaded PPU state are the test harness only;
 // every transfer then runs through the production 6502 and CPU/PPU buses.
 runtime.run('cpuWrite(0x2000,0);cpuWrite(0x2001,0);ppuBusWrite(0x23ff,0xa5);emu.I=1;emu.SP=0xfd;cpuPush(0x06);cpuPush(0xff);emu.PC=0xc0fa;var backgroundRuntimeWrites=[],backgroundRuntimeWrite=cpuWrite;cpuWrite=function(address,value){if(address===0x2007)backgroundRuntimeWrites.push({address:emu.vAddr&0x3fff,value});return backgroundRuntimeWrite(address,value);};var backgroundRuntimeSteps=0;while(emu.PC!==0x0700){if(++backgroundRuntimeSteps>20000)throw Error("Native title loader did not return within its instruction budget");cpuStep();}',30000);
 const writes=runtime.json('backgroundRuntimeWrites'),vram=runtime.json('Array.from(emu.vram.slice(0,1024))');assert.equal(writes.length,1023);assert.deepEqual(writes.map(item=>item.address),Array.from({length:1023},(_,index)=>0x2000+index));assert.deepEqual(writes.map(item=>item.value),cp(decoded.nametable.slice(0,1023)));assert.deepEqual(vram.slice(0,1023),cp(decoded.nametable.slice(0,1023)));assert.equal(vram[255],8);assert.equal(vram[511],9);assert.equal(vram[767],10);assert.equal(vram[1023],0xa5);assert.equal(decoded.knownNametable[1023],false);assert.equal(runtime.run('emu.SP'),0xfd);assert.equal(runtime.run('emu.opsMissed'),0);assert.equal(runtime.run('emu.ppuMask'),0);assert.equal(sha(altered),inputHash);
});

test('Repeated decode remains deterministic and separate from active authoring and emulator state',()=>{
 h.run('emu.loaded=true;emu.running=true;emu.PC=4660;emu.frameCount=17');const before=state(),first=decode(base);assert.deepEqual(cp(decode(base)),cp(first));assert.deepEqual(state(),before);
});

(async()=>{const results=[];for(const{name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error).slice(0,6000));}}const passed=results.filter(item=>item.passed).length,report={suite:'native-background-nametable',htmlSha256:sha(fs.readFileSync(html)),scope:'Actual bundled pointer-page profile, independent source-backed corpus, native-data/pointer/ZP/bank edits, precise CPY FF write order and unknown retained attribute, declared structural recognition, malformed/ambiguous refusal and authoring/emulator isolation. Includes independent direct execution of the original loader through bundled 6502/PPU buses; no full-game, browser or hardware acceptance.',passed,failed:results.length-passed,total:results.length,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;})();
