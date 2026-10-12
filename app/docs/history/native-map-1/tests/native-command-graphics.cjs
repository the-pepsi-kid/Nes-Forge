#!/usr/bin/env node
'use strict';
// Source-linked original 6502 instructions independently verify the static
// graphics decoder. Harness entry into a routine is not a game/emulator boot.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(process.argv[2]||path.join(root,manifest.output)),sha=value=>crypto.createHash('sha256').update(value).digest('hex'),cp=value=>JSON.parse(JSON.stringify(value));
const tests=[],test=(name,fn)=>tests.push({name,fn}),h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);
const api=h.context.Forge.services.RENativeCommandGraphics,maps=h.context.Forge.services.RENativeCommandMap;assert.ok(api,'Actual bundle must include native command graphics');assert.ok(maps);
const base=new Uint8Array(fs.readFileSync(path.join(root,'examples/RE_Native_Map/DABG-reproduced.nes'))),fixture=path.join(__dirname,'fixtures/native-command-map');
const labelText=fs.readFileSync(path.join(fixture,'dabg.lbl'),'utf8'),labels=new Map([...labelText.matchAll(/^al ([0-9A-Fa-f]+) \.(\w+)$/gm)].map(match=>[match[2],parseInt(match[1],16)]));
const address=name=>{assert.ok(labels.has(name),'Source-linked label '+name);return labels.get(name);},offset=cpu=>cpu-0x8000+16,cpu=file=>file+0x8000-16,word=(b,i)=>b[i]|b[i+1]<<8,put=(b,i,value)=>{b[i]=value&255;b[i+1]=value>>>8;};
const good=b=>{const result=api.decode(b);assert.equal(result.status,'supported',result.reason);return result.graphics;};
const baseline=good(base),native=maps.decode(base),sourceHash=sha(base);
const runtime=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(runtime.errors,[]);
runtime.run('var graphicsWrites=[],graphicsWrite=cpuWrite;cpuWrite=function(address,value){if(address===0x2007)graphicsWrites.push({address:emu.vAddr&0x3fff,value:value&255});return graphicsWrite(address,value);};');
function reset(source,seed=0xa5){runtime.context.graphicsROM=source;runtime.context.graphicsSeed=seed;runtime.run('emu.prgRom=graphicsROM.slice(16);emu.prgSize=32768;emu.mapper=0;emu.prgBank0=0;emu.prgBank1=16384;emu.chrBank0=0;emu.chrBank1=4096;emu.hasChrRam=true;emu.chrRam=new Uint8Array(8192);emu.sram=null;emu.loaded=false;emu.running=false;emu.ram.fill(graphicsSeed);emu.vram.fill(0x69);emu.palRam.fill(0x15);emu.A=emu.X=emu.Y=emu.C=emu.Z=emu.D=emu.V=emu.N=0;emu.SP=0xfd;emu.I=1;emu.cycles=emu.opsMissed=0;emu.irqPending=false;emu.ppuCtrl=emu.ppuMask=0;emu.vAddr=emu.tAddr=0;emu.wLatch=false;graphicsWrites=[];');}
function execute(start,stop,budget=250000){runtime.context.graphicsStart=start;runtime.context.graphicsStop=stop;runtime.context.graphicsBudget=budget;runtime.run('emu.PC=graphicsStart;var graphicsSteps=0;while(emu.PC!==graphicsStop){if(++graphicsSteps>graphicsBudget)throw Error("Native graphics instruction budget exceeded at "+emu.PC.toString(16));cpuStep();}if(emu.opsMissed)throw Error("Unknown original opcode");',30000);return runtime.json('graphicsWrites');}
function call(start,budget){runtime.run('cpuPush(0x5f);cpuPush(0xff);');const writes=execute(start,0x6000,budget);assert.equal(runtime.run('emu.SP'),0xfd);return writes;}
function upload(source,start=address('DecompressCHR'),seed=0xa5){reset(source,seed);const writes=call(start);assert.equal(writes.length,8192);assert.deepEqual(writes.map(item=>item.address),Array.from({length:8192},(_,i)=>i));assert.deepEqual(runtime.json('Array.from(emu.chrRam)'),writes.map(item=>item.value));return writes.map(item=>item.value);}
function palette(source,start=address('reset')){reset(source);const writes=execute(start+27,start+80,3000);assert.equal(writes.length,33);assert.deepEqual(writes.map(item=>item.address),[...Array.from({length:32},(_,i)=>0x3f00+i),0x3f07]);return runtime.json('Array.from(emu.palRam)');}
function renderOriginal(source,cells,start=address('RenderLevelBuf')){reset(source);runtime.context.graphicsCells=cells;runtime.run('for(var graphicsIndex=0;graphicsIndex<256;graphicsIndex++)cpuWrite(0x700+graphicsIndex,graphicsCells[graphicsIndex]);');const writes=call(start,50000);assert.equal(writes.length,1024);assert.deepEqual(writes.map(item=>item.address),Array.from({length:1024},(_,i)=>0x2000+i));return{nametable:writes.map(item=>item.value),postRenderCells:runtime.json('Array.from(emu.ram.slice(0x700,0x800))')};}
function authoringState(){return{project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),emulator:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,frame:emu.frameCount})')};}

test('Native reset and renderer structures recover complete known CHR-RAM, reset palette and metatile evidence without changing state',()=>{
 const before=authoringState(),result=good(base);assert.equal(sha(base),sourceHash);assert.deepEqual(authoringState(),before);assert.equal(result.chrBytes.length,4096);assert.equal(result.chrRamBytes.length,8192);assert.equal(result.knownChrRam.filter(Boolean).length,8192);assert.equal(result.palette.length,32);assert.equal(result.metatileTiles.length,144);assert.equal(result.metatileFlags.length,36);assert.equal(result.metatileBecomes.length,36);assert.equal(result.backgroundPatternTable,0);assert.equal(result.ppuMask,0);assert.equal(result.construction.stream.length,4811);assert.equal(result.construction.stream.tokens.length,512);assert.equal(result.construction.reset.cpuAddress,address('reset'));assert.equal(result.construction.renderer.cpuAddress,address('RenderLevelBuf'));assert.equal(Object.isFrozen(result),true);for(const item of result.evidence)for(const range of item.ranges)assert.ok(range.start>=16&&range.length>0&&range.start+range.length<=base.length);
});

test('Original native decompressor confirms all 8192 PPU bytes with nonzero initial RAM and source PB53 retained-buffer behavior',()=>{
 assert.deepEqual(upload(base),cp(baseline.chrRamBytes));const asset=fs.readFileSync(path.join(fixture,'ascii.chr'));const changed=baseline.chrRamBytes.map((value,index)=>value!==asset[index]?index:null).filter(value=>value!==null);assert.equal(changed.length,10);assert.equal(baseline.construction.stream.tokens.filter(token=>token.control===0x83).length,1);assert.equal(runtime.run('emu.opsMissed'),0);assert.equal(runtime.run('emu.loaded'),false);assert.throws(()=>{runtime.context.graphicsROM=base;runtime.run('parseRomHeader(graphicsROM)');},/NES 2\.0 is not supported/);assert.equal(sha(base),sourceHash);
});

test('Original reset palette writes independently confirm aliases and explicit override',()=>{
 assert.deepEqual(palette(base),cp(baseline.palette));assert.equal(baseline.palette[7],0x17);for(const index of [0,4,8,12])assert.equal(baseline.palette[index],baseline.palette[index+16]);
});

test('Original metatile renderer confirms all referenced raw maps including attributes and post-render IDs',()=>{
 assert.equal(native.status,'supported');assert.ok(native.maps.length>=20);for(const map of native.maps){const expected=api.render(baseline,map.cells),actual=renderOriginal(base,map.cells);assert.deepEqual(actual.nametable,cp(expected.nametable),map.key+' exact PPU writes');assert.deepEqual(actual.postRenderCells,cp(expected.postRenderCells),map.key+' post-render cells');assert.equal(expected.knownNametable.filter(Boolean).length,1024);assert.deepEqual(cp(expected.postRenderCells.slice(240)),cp(map.cells.slice(240)));}
});

test('Valid compressed literal, palette and metatile edits are decoded as data and match original CPU construction',()=>{
 const altered=base.slice(),token=baseline.construction.stream.tokens.find(item=>item.control<0x80);altered[token.fileOffset+1]^=0x80;altered[baseline.construction.palette.fileOffset]=0x24;altered[baseline.construction.tables.tiles.fileOffset]=0x21;const result=good(altered);assert.notEqual(sha(altered),sourceHash);assert.notDeepEqual(cp(result.chrRamBytes),cp(baseline.chrRamBytes));assert.deepEqual(upload(altered),cp(result.chrRamBytes));assert.deepEqual(palette(altered),cp(result.palette));assert.equal(result.palette[2],0x24);assert.deepEqual(renderOriginal(altered,native.maps[0].cells).nametable,cp(api.render(result,native.maps[0].cells).nametable));
});

test('PB53 plane repeats, inversions, arbitrary solid controls and retained slots follow the original loader',()=>{
 const altered=base.slice(),stream=[0x84,0,...Array.from({length:8},(_,i)=>i*19),0,...Array.from({length:8},(_,i)=>255-i*17),0x7f,0x5a,0x82,0x80,0xff,0x82,0xff,0x86,0x85,0x83];
 // Nine tiles: first chunk establishes every buffer slot; tile eight reuses
 // slot zero, matching this loader instead of a generic previous-bank rule.
 for(let tile=9;tile<512;tile++)stream.push([0x84,0x85,0x86,0x87][tile%4]);altered.set(stream,baseline.construction.stream.fileOffset);const result=good(altered);assert.equal(result.construction.stream.length,stream.length);assert.equal(result.knownChrRam.filter(Boolean).length,8192);assert.deepEqual(upload(altered),cp(result.chrRamBytes));assert.deepEqual(cp(result.chrRamBytes.slice(128,144)),cp(result.chrRamBytes.slice(0,16)));
});

test('Coherent relocation of compressed data, upload, unpacker, reset, renderer and visual tables follows references',()=>{
 const altered=base.slice(),s=baseline.construction,stream=0x2010,pb=0x7010,uploadOffset=0x70d0,resetOffset=0x7140,renderer=0x7200,tiles=0x7300,becomes=0x7390;
 altered.set(base.slice(s.stream.fileOffset,s.stream.fileOffset+s.stream.length),stream);altered.set(base.slice(s.unpacker.fileOffset,s.unpacker.fileOffset+s.unpacker.length),pb);
 for(const [operand,relative]of [[60,27],[64,126],[69,126],[72,43],[75,122],[92,122],[95,43],[120,43]])put(altered,pb+operand,cpu(pb)+relative);
 altered.set(base.slice(s.upload.fileOffset,s.upload.fileOffset+s.upload.length),uploadOffset);altered[uploadOffset+13]=cpu(stream)&255;altered[uploadOffset+17]=cpu(stream)>>>8;put(altered,uploadOffset+29,cpu(pb));
 altered.set(base.slice(s.reset.fileOffset,s.reset.fileOffset+s.reset.length),resetOffset);put(altered,resetOffset+81,cpu(uploadOffset));put(altered,offset(0xfffc),cpu(resetOffset));
 altered.set(base.slice(s.renderer.fileOffset,s.renderer.fileOffset+s.renderer.length),renderer);put(altered,offset(native.structure.generateLevel)+126,cpu(renderer));
 altered.set(base.slice(s.tables.tiles.fileOffset,s.tables.tiles.fileOffset+144),tiles);altered.set(base.slice(s.tables.becomes.fileOffset,s.tables.becomes.fileOffset+36),becomes);for(const [operand,delta]of [[39,0],[45,1],[82,2],[88,3]])put(altered,renderer+operand,cpu(tiles)+delta);put(altered,renderer+72,cpu(becomes));
 const result=good(altered);assert.equal(result.construction.stream.fileOffset,stream);assert.equal(result.construction.upload.fileOffset,uploadOffset);assert.equal(result.construction.renderer.fileOffset,renderer);assert.deepEqual(cp(result.chrRamBytes),cp(baseline.chrRamBytes));assert.deepEqual(upload(altered,cpu(uploadOffset)),cp(result.chrRamBytes));assert.deepEqual(palette(altered,cpu(resetOffset)),cp(result.palette));assert.deepEqual(renderOriginal(altered,native.maps[0].cells,cpu(renderer)).nametable,cp(api.render(result,native.maps[0].cells).nametable));
});

test('Unknown initial PB53 buffer dependencies remain marked and refuse rendering when a visible tile uses them',()=>{
 for(const control of [0x82,0x83]){const altered=base.slice(),stream=baseline.construction.stream.fileOffset;altered.fill(0x84,stream,stream+512);altered[stream]=control;altered[baseline.construction.tables.tiles.fileOffset]=0;const result=good(altered);assert.equal(result.knownChr.slice(0,16).some(Boolean),false);const fromA5=upload(altered,undefined,0xa5),from69=upload(altered,undefined,0x69);assert.deepEqual(fromA5.slice(0,16),Array(16).fill(0xa5));assert.deepEqual(from69.slice(0,16),Array(16).fill(0x69));for(let i=0;i<8192;i++)if(result.knownChrRam[i])assert.equal(fromA5[i],result.chrRamBytes[i]);assert.throws(()=>api.render(result,Array(256).fill(0)),/unknown initial/);}
});

test('Final reset background-bank selection is explicit and does not change the recovered upload',()=>{
 const altered=base.slice();altered[baseline.construction.reset.fileOffset+166]=0x98;const result=good(altered);assert.equal(result.backgroundPatternTable,1);assert.deepEqual(cp(result.chrBytes),cp(result.chrRamBytes.slice(4096)));assert.deepEqual(cp(result.chrRamBytes),cp(baseline.chrRamBytes));
});

test('Incoherent routines, pointers, masks, out-of-range tables and compressed source bounds refuse',()=>{
 const s=baseline.construction;for(const mutate of [b=>b[s.reset.fileOffset+2]^=1,b=>b[offset(address('ReadJoyOnce'))+1]=0,b=>b[s.upload.fileOffset+1]=63,b=>b[s.unpacker.fileOffset+88]=0x81,b=>b[s.unpacker.fileOffset+60]^=1,b=>b[s.renderer.fileOffset+45]^=1,b=>b[s.tables.becomes.fileOffset]=36,b=>b[s.palette.fileOffset]=64,b=>b[s.reset.fileOffset+166]=0x8c,b=>put(b,s.renderer.fileOffset+39,0xfff0),b=>{b[s.upload.fileOffset+13]=0xff;b[s.upload.fileOffset+17]=0xff;}]){const altered=base.slice();mutate(altered);assert.notEqual(api.decode(altered).status,'supported');}assert.notEqual(api.decode(base.slice(0,100)).status,'supported');assert.notEqual(api.decode(Array.from(base)).status,'supported');const forged=cp(native);forged.structure.renderLevelBuf++;assert.notEqual(api.decode(base,forged).status,'supported');
 // A coherent map decoder on another RAM page is still inspectable, but this
 // renderer reads $0700; the two structures must not be silently combined.
 const changedBuffer=base.slice();for(const range of native.evidence[0].ranges)for(let index=range.start;index+2<range.start+range.length;index++)if([0x9d,0xbd,0xb9].includes(changedBuffer[index])&&word(changedBuffer,index+1)===0x700)put(changedBuffer,index+1,0x600);assert.equal(maps.decode(changedBuffer).status,'supported');assert.match(api.decode(changedBuffer).reason,/same native cell buffer/);
});

test('Rendering is bounded, deterministic and isolated from active authoring and emulator state',()=>{
 h.run('emu.loaded=true;emu.running=true;emu.PC=4321;emu.frameCount=13');const before=authoringState();assert.deepEqual(cp(good(base)),cp(baseline));assert.deepEqual(cp(api.render(baseline,native.maps[0].cells)),cp(api.render(baseline,native.maps[0].cells)));assert.throws(()=>api.render(baseline,Array(255).fill(0)),/256/);assert.throws(()=>api.render(baseline,Array(256).fill(36)),/bounded/);assert.deepEqual(authoringState(),before);assert.equal(sha(base),sourceHash);
});

(async()=>{const results=[];for(const{name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error).slice(0,6000));}}const passed=results.filter(item=>item.passed).length,report={suite:'native-command-graphics',htmlSha256:sha(fs.readFileSync(html)),scope:'Actual bundled bounded native PB53 graphics and raw map rendering. Independent execution of original source-linked 6502 palette/upload/renderer instructions verifies exact PPU writes, changed data and coherent relocation. Unknown initial buffer bytes are tracked and used unknown tiles refuse rendering. This is not game boot, PrettyLevel recovery, browser, hardware or independent emulator acceptance.',passed,failed:results.length-passed,total:results.length,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;})();
