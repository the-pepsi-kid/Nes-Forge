#!/usr/bin/env node
'use strict';
// Application adapter tests against independently authored source code, executed
// through the existing CPU/bus. Direct routines are not full-cartridge acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(process.argv[2]||path.join(root,manifest.output)),tests=[],test=(name,fn)=>tests.push({name,fn}),cp=value=>JSON.parse(JSON.stringify(value)),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);const api=h.context.Forge.services.RENativeCommandMap;assert.ok(api,'Actual bundle must include native command-map decoding');
const base=new Uint8Array(fs.readFileSync(path.join(root,'examples/RE_Native_Map/DABG-reproduced.nes'))),off=address=>address-0x8000+16,putWord=(bytes,index,value)=>{bytes[index]=value&255;bytes[index+1]=value>>>8;},decode=bytes=>api.decode(bytes);
function good(bytes=base){const value=decode(bytes);assert.equal(value.status,'supported',value.reason);return value;}
const original=good(),finalAddress=0xbfe3,finalOffset=off(finalAddress),nativeFlags=[0,0,0,0,0,0,0,0,1,1,2,2,0,0,0,0,0,0,0,0,0,4,0,0,0,4,6,2,5,5,5,5,5,5,5,5];
function mapAt(result,address=finalAddress){const map=result.maps.find(item=>item.cpuAddress===address);assert.ok(map);return map;}
function state(){return{project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),emulator:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,frame:emu.frameCount})')};}
const runtime=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(runtime.errors,[]);runtime.run('var mapNativeWrites=[],mapNativeWrite=cpuWrite;cpuWrite=function(a,v){if(a>=0x700&&a<=0x7ff)mapNativeWrites.push([a-0x700,v&255]);return mapNativeWrite(a,v);};');
function reset(source){runtime.context.mapNativePRG=source.slice(16);runtime.run('emu.prgRom=mapNativePRG;emu.prgSize=32768;emu.mapper=0;emu.prgBank0=0;emu.prgBank1=16384;emu.hasChrRam=true;emu.chrRam=new Uint8Array(8192);emu.sram=null;emu.loaded=false;emu.running=false;emu.ram.fill(0);emu.A=emu.X=emu.Y=emu.C=emu.Z=emu.D=emu.V=emu.N=0;emu.SP=0xfd;emu.I=1;emu.cycles=emu.opsMissed=0;emu.irqPending=false;mapNativeWrites=[];');}
function call(address,budget=50000){runtime.context.mapNativeStart=address;runtime.context.mapNativeBudget=budget;runtime.run('emu.PC=mapNativeStart;cpuPush(0x5f);cpuPush(0xff);var mapNativeSteps=0;while(emu.PC!==0x6000){if(++mapNativeSteps>mapNativeBudget)throw Error("Native routine exceeded bounded instruction count");cpuStep();}if(emu.opsMissed)throw Error("Native opcode missed");',30000);assert.equal(runtime.run('emu.SP'),0xfd);}
function originalMap(source,address,loader=0xc12a){reset(source);runtime.run(`cpuWrite(0x4e6,${address&255});cpuWrite(0x4e7,${address>>>8});`);call(loader);return{cells:runtime.json('Array.from(emu.ram.slice(0x700,0x800))'),writes:runtime.json('mapNativeWrites'),spawn:runtime.json('({x:cpuRead(0x4e9),y:cpuRead(0x4ea)})')};}
function compareNative(source,address,loader=0xc12a){const map=mapAt(good(source),address),actual=originalMap(source,address,loader);assert.deepEqual(cp(map.cells),actual.cells);assert.deepEqual(cp(map.orderedWrites),actual.writes);assert.deepEqual(cp(map.spawn),actual.spawn);return map;}
function redirect(source,address){for(let index=0;index<52;index++){const pos=off(0xbbe2)+index*8+6;if((source[pos]|source[pos+1]<<8)===finalAddress)putWord(source,pos,address);}}
function custom(commands,address=0xf611){const bytes=base.slice();bytes.set(commands,off(address));redirect(bytes,address);return bytes;}

test('Original independent container and source-linked structures decode 52 configurations and 22 referenced maps',()=>{
 assert.equal(sha(base),'eca79b9d0b546e96c1bc73099e239539fb9c7773ff10a431bb3a9cd6763208ca');assert.equal(original.configurations.length,52);assert.equal(original.maps.length,22);assert.equal(original.structure.decodeLevelMap,0xc12a);assert.equal(original.structure.blockIsSolid,0x9069);assert.equal(original.structure.renderLevelBuf,0x923d);assert.deepEqual(cp(original.tables.flags),nativeFlags);assert.deepEqual(cp(original.maps.filter(item=>item.staticConvertible).map(item=>item.cpuAddress)),[finalAddress]);assert.equal(mapAt(original).cells.filter(value=>value===21).length,14);assert.equal(Object.isFrozen(original.maps[0].cells),true);assert.ok(JSON.stringify(original).length<2*1024*1024);
 for(const record of [...original.evidence,...original.maps.flatMap(map=>map.evidence)])for(const range of record.ranges)assert.ok(range.start>=16&&range.length>0&&range.start+range.length<=base.length);
});

test('Every referenced original map and exact ordered overwrite sequence matches original assembled loader execution',()=>{for(const map of original.maps)compareNative(base,map.cpuAddress);});

test('All 36 full-solid flags match original native predicate while keeping non-solid interactions distinct',()=>{
 reset(base);for(let tile=0;tile<36;tile++){runtime.run(`emu.A=${tile};emu.Y=157;`);call(0x9069,100);assert.equal(runtime.run('emu.A'),nativeFlags[tile]&4);assert.equal(runtime.run('emu.Y'),157);assert.equal(runtime.run('emu.Z'),nativeFlags[tile]&4?0:1);}assert.ok(original.maps.some(map=>map.unsupportedCells.length&&map.cells.some(tile=>tile===23)));assert.equal(original.tables.flags[23]&4,0);
});

test('A native solid-run edit to empty changes decoded cells and original native routine results',()=>{
 const changed=base.slice();changed[finalOffset+1]=0x3d;const map=compareNative(changed,finalAddress);assert.equal(map.staticConvertible,true);assert.equal(map.cells.some(Boolean),false);assert.deepEqual(cp(map.spawn),{x:4,y:13});assert.equal(sha(base),'eca79b9d0b546e96c1bc73099e239539fb9c7773ff10a431bb3a9cd6763208ca');
});

test('Relocated map records follow configuration pointers without filename or content-hash matching',()=>{
 const relocated=base.slice(),address=0xf611;relocated.set(base.slice(finalOffset,finalOffset+4),off(address));redirect(relocated,address);const map=compareNative(relocated,address);assert.equal(map.staticConvertible,true);assert.equal(map.fileOffset,off(address));assert.deepEqual(cp(map.cells),cp(mapAt(original).cells));assert.notEqual(sha(relocated),sha(base));
});

test('Relocated parameter table follows the source-linked eight-byte record loader',()=>{
 const relocated=base.slice(),address=0xf401;relocated.set(base.slice(off(0xbbe2),off(0xbbe2)+52*8),off(address));relocated[off(0xbd82)+18]=address&255;relocated[off(0xbd82)+24]=address>>>8;const out=good(relocated);assert.equal(out.structure.levelTable,address);assert.deepEqual(cp(out.maps),cp(original.maps));assert.deepEqual(cp(out.configurations.map(config=>config.raw)),cp(original.configurations.map(config=>config.raw)));
});

test('A structurally relocated horizontal handler retains dispatch meaning and original CPU behavior',()=>{
 const relocated=base.slice(),address=0xf611;relocated.set(base.slice(off(0xc1b1),off(0xc1b1)+18),off(address));for(let kind=2;kind<=8;kind++)putWord(relocated,off(0xc182)+kind*2,address-1);compareNative(relocated,finalAddress);
});

test('Changing the coherent native level bound changes record discovery without a hard-coded count',()=>{
 const changed=base.slice();changed[off(0x8dfd)+16]=32;const out=good(changed);assert.equal(out.configurations.length,32);assert.equal(out.structure.levelCount,32);assert.ok(out.maps.length<22);assert.equal(mapAt(out).staticConvertible,true);
});

test('Overlapping rectangles and empty overwrites preserve minus-one dimensions and ordered writes',()=>{
 const source=custom([0xa1,0xd4,0x22,0xb2,0x31,0xd4,0]);const map=compareNative(source,0xf611);assert.equal(map.commands[0].width,3);assert.equal(map.commands[0].height,3);assert.equal(map.orderedWrites.length,11);assert.equal(map.cells[0xb2],0);assert.equal(map.cells[0xa1],21);assert.equal(map.lastWriterCommands[0xb2],1);assert.equal(map.staticConvertible,true);
});

test('Maximum stored dimensions retain actual native X wrap while refusing canonical conversion',()=>{
 const source=custom([0x11,0xd4,0xff,0xd4,0]);const map=compareNative(source,0xf611);assert.equal(map.commands[0].writeCount,256);assert.equal(map.wrapsBuffer,true);assert.equal(map.crossesRow,true);assert.equal(map.staticConvertible,false);assert.ok(map.conversionRefusals.some(reason=>reason.includes('wrap')));
});

test('One-cell repeats and vertical progression match native assembly at command boundaries',()=>{
 const source=custom([0x21,0x20,0x22,0x92,0x32,0xa0,0xd4,0]);const map=compareNative(source,0xf611);assert.equal(map.cells[0x21],21);assert.equal(map.cells[0x22],21);assert.equal(map.cells[0x32],0);assert.equal(map.cells[0x42],21);assert.equal(map.staticConvertible,true);
});

test('Map row outside the visible screen and nonempty crossing rows refuse conversion',()=>{
 for(const commands of [[0xf1,0x20,0xd4,0],[0xae,0x23,0xd4,0]]){const map=compareNative(custom(commands),0xf611);assert.equal(map.staticConvertible,false);assert.ok(map.conversionRefusals.some(reason=>/row|wrap/.test(reason)));}
});

test('Hazards, one-way cells, cycling and moving semantics never collapse to empty or solid',()=>{
 for(const type of [1,6,8,9,10,11,0x10,0x14]){const source=custom([0x71,type,0xd4,0]),map=compareNative(source,0xf611);assert.equal(map.staticConvertible,false);assert.ok(map.unsupportedCells.includes(0x71));}const overwritten=mapAt(good(custom([0x71,1,0x71,0x30,0xd4,0])),0xf611);assert.equal(overwritten.unsupportedCells.length,0);assert.equal(overwritten.staticConvertible,false);
});

test('Scrolling-only and zero-low-byte procedural configurations prevent static initial-map claims',()=>{
 const scrolling=base.slice();for(const config of original.configurations.filter(config=>config.mapAddress===finalAddress))scrolling[config.fileOffset+1]=(scrolling[config.fileOffset+1]&15)|0x20;assert.equal(mapAt(good(scrolling)).staticConvertible,false);const address=0xf600,source=custom([0xe1,0x2d,0xd4,0],address),out=good(source),map=mapAt(out,address);assert.equal(map.staticConvertible,false);assert.ok(out.configurations.filter(config=>config.mapAddress===address).every(config=>config.procedural));assert.equal(map.initialization,'unknown-procedural-base');assert.equal(map.knownCells[0],false);assert.equal(map.solid[0],null);assert.equal(map.knownCells[0xe1],true);assert.equal(map.solid[0xe1],true);
});

test('Changed fixed collision flags remain native evidence and explicitly refuse the fixed conversion subset',()=>{
 const changed=base.slice();changed[off(0x9045)+21]=0;const map=mapAt(good(changed));assert.equal(map.solid.some(Boolean),false);assert.equal(map.staticConvertible,false);assert.ok(map.conversionRefusals.some(reason=>reason.includes('flag values')));
});

test('Near-match routines, incoherent code references and changed source bounds are not silently accepted',()=>{
 for(const mutate of [b=>b[off(0xc12a)+18]=7,b=>b[off(0xc12a)+64]^=1,b=>b[off(0xc1b1)+8]=2,b=>b[off(0xc1db)+38]=0xef,b=>b[off(0x9069)+9]=2,b=>b[off(0x9074)+15]=1,b=>b[off(0x8dfd)+16]=65,b=>b[off(0x8ee6)+6]^=1]){const changed=base.slice();mutate(changed);assert.notEqual(decode(changed).status,'supported');}
});

test('Native RAM ownership rejects aliases that the real zero-fill and loader would overwrite',()=>{
 const configAt=(bytes,address)=>{putWord(bytes,off(0xbd82)+32,address);putWord(bytes,off(0xc12a)+1,address+6);putWord(bytes,off(0xc12a)+6,address+7);putWord(bytes,off(0x9074)+21,address+6);putWord(bytes,off(0x9074)+112,address+7);};
 const aliased=base.slice();configAt(aliased,0x700);assert.notEqual(decode(aliased).status,'supported');
 // Refutation by the source CPU: the matched GenerateLevel prefix clears the
 // aliased pointer before its map/procedural decision, so zero-base decoding
 // must not certify this superficially coherent construction.
 reset(aliased);runtime.run('cpuWrite(0x706,0xe3);cpuWrite(0x707,0xbf);emu.PC=0x9074;var ownershipSteps=0;while(emu.PC!==0x9088){if(++ownershipSteps>1000)throw Error("Native clear prefix exceeded budget");cpuStep();}');assert.equal(runtime.run('cpuRead(0x706)|cpuRead(0x707)<<8'),0);assert.equal(runtime.run('emu.opsMissed'),0);
 const mutations=[b=>configAt(b,0x800),b=>configAt(b,0),b=>configAt(b,0x100),b=>putWord(b,off(0xc12a)+32,0x1fe),b=>putWord(b,off(0xc12a)+13,6),b=>putWord(b,off(0xc12a)+32,0x700),b=>putWord(b,off(0xc12a)+32,0x4ea),b=>{putWord(b,off(0xbd82)+1,0x2002);putWord(b,off(0x9074)+1,0x2002);putWord(b,off(0x8ee6)+14,0x2002);},b=>{b[off(0xc1a4)+1]=1;b[off(0xc1a4)+8]=1;},b=>{b[off(0x9069)+1]=0;b[off(0x9069)+7]=0;}];
 for(const mutate of mutations){const changed=base.slice();mutate(changed);assert.notEqual(decode(changed).status,'supported');}
});

test('Complete native parameter routine is checked through its goal, enemy and effect writes',()=>{
 const changed=base.slice();changed.set([0xa9,0,0x8d,0xe6,4,0x60],off(0xbd82)+39);assert.notEqual(decode(changed).status,'supported');
 // The original eight-byte table copy remains intact in this near match, but
 // its altered tail clears the just-loaded pointer. This must not certify the
 // static construction merely because the prefix resembles a record loader.
 reset(changed);runtime.run('emu.A=31;');call(0xbd82,200);assert.equal(runtime.run('cpuRead(0x4e6)'),0);assert.equal(runtime.run('cpuRead(0x4e7)'),0xbf);
 for(const mutate of [b=>putWord(b,off(0xbd82)+125,0x4e0),b=>putWord(b,off(0xbd82)+143,0x4e6),b=>b[off(0xbd82)+161]=7,b=>b[off(0xbd82)+169]=0x84]){const altered=base.slice();mutate(altered);assert.notEqual(decode(altered).status,'supported');}
});

test('Malformed pointers, bad dispatch and unterminated source-index wraps refuse bounded decoding',()=>{
 const mutations=[b=>putWord(b,original.configurations.find(config=>config.mapAddress===finalAddress).fileOffset+6,0x7fff),b=>putWord(b,off(0xc12a)+51,0xfff8),b=>b[finalOffset+1]=0xe1,b=>b[finalOffset+1]=0x1f];for(const mutate of mutations){const changed=base.slice();mutate(changed);assert.notEqual(decode(changed).status,'supported');}const unterminated=custom(Array.from({length:256},(_,index)=>index&1?0x20:0));assert.equal(decode(unterminated).status,'invalid');
});

test('Multiple coherent construction sites refuse ambiguous discovery instead of selecting one',()=>{
 const changed=base.slice();changed.set(base.slice(off(0x8dfd),off(0x8dfd)+50),off(0xf201));changed.set(base.slice(off(0x8ee6),off(0x8ee6)+19),off(0xf251));const out=decode(changed);assert.equal(out.status,'ambiguous');assert.equal(out.maps,undefined);
});

test('Independent header interpretation preserves public input rejection and original bytes',()=>{
 const before=base.slice();for(const index of [4,5,6,7,8,9,10,11,12,13,14,15]){const changed=base.slice();changed[index]^=1;assert.notEqual(decode(changed).status,'supported');}assert.notEqual(decode(base.slice(0,-1)).status,'supported');assert.notEqual(decode(new Uint8Array(16)).status,'supported');assert.notEqual(decode([]).status,'supported');h.context.nativeMapHeaderInput=base;assert.throws(()=>h.run('parseRomHeader(nativeMapHeaderInput)'),/NES 2\.0 is not supported/);assert.deepEqual(base,before);
});

test('Decode is deterministic and leaves authoring history, emulator and source unchanged',()=>{
 h.run('emu.loaded=true;emu.running=true;emu.PC=4660;emu.frameCount=17');const before=state(),source=base.slice();assert.deepEqual(cp(decode(source)),cp(original));assert.deepEqual(cp(decode(source)),cp(original));assert.deepEqual(state(),before);assert.deepEqual(source,base);
});

(async()=>{const results=[];for(const{name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error).slice(0,6000));}}const passed=results.filter(item=>item.passed).length,report={suite:'native-command-map',htmlSha256:sha(fs.readFileSync(html)),scope:'Actual bundled bounded structural map adapter; source-proven original DABG map/predicate CPU execution, changed/relocated data and handler structures, exact ordered command writes, static conversion refusal and isolation. Direct routine harness only; no original full-game, browser, independent-emulator or hardware acceptance.',passed,failed:results.length-passed,total:results.length,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;})();
