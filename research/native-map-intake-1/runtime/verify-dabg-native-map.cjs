#!/usr/bin/env node
'use strict';
// Research-only verification. Does not patch the application or source ROM header.
// Execute unchanged, source-linked DABG machine code through the existing Forge
// CPU and memory bus. This is isolated CPU verification, not an emulator boot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const research=path.resolve(__dirname,'..');
if(process.argv.includes('--help')){console.log('Usage: node verify-dabg-native-map.cjs [APP_DIRECTORY] [ROM_PATH] [LABELS_PATH] [SOURCE_DIRECTORY] [LISTING_PATH] [REPORT_PATH]\nDefaults locate app/ two directories above the checkpoint, and build/, source/DABG/ inside the checkpoint.');process.exit(0);}
const app=path.resolve(process.argv[2]||path.join(research,'../../app'));
const romPath=path.resolve(process.argv[3]||path.join(research,'build/dabg.nes'));
const labelsPath=path.resolve(process.argv[4]||path.join(research,'build/dabg.lbl'));
const sourceDirectory=path.resolve(process.argv[5]||path.join(research,'source/DABG'));
const listingPath=path.resolve(process.argv[6]||path.join(research,'build/dabg.lst'));
const output=path.resolve(process.argv[7]||path.join(__dirname,'DABG_Native_Map_CPU_Verification.json'));
const {loadForge}=require(path.join(app,'tests/harness.cjs'));
const manifest=JSON.parse(fs.readFileSync(path.join(app,'source-manifest.json')));
const html=path.join(app,manifest.output),rom=fs.readFileSync(romPath);
const labelsText=fs.readFileSync(labelsPath,'utf8');
const labels=new Map([...labelsText.matchAll(/^al ([0-9A-Fa-f]+) \.(\w+)$/gm)].map(m=>[m[2],parseInt(m[1],16)]));
const addr=name=>{assert.ok(labels.has(name),'Missing source-linked label '+name);return labels.get(name);};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const offset=cpu=>{assert.ok(cpu>=0x8000&&cpu<=0xffff);return 16+cpu-0x8000;};
const single=[0,1,2,3,21,4,23,9,10,26,11,27,16,17,18,19];
const extra=[12,13,14,15,25,20];
const fill=[21,0,10,26,23,11,27];
const flags=[0,0,0,0,0,0,0,0,1,1,2,2,0,0,0,0,0,0,0,0,0,4,0,0,0,4,6,2,5,5,5,5,5,5,5,5];
const levelBuf=0x700,mapPointer=addr('LevelConfigBytes')+6;
assert.equal(rom.length,32784);assert.deepEqual(Array.from(rom.subarray(0,14)),[78,69,83,26,2,0,0,8,0,0,0,7,0,0]);
assert.deepEqual(Array.from(rom.subarray(offset(addr('LevelData_MetaList')),offset(addr('LevelData_MetaList'))+22)),[...single,...extra]);
assert.deepEqual(Array.from(rom.subarray(offset(addr('MetatileFlags')),offset(addr('MetatileFlags'))+flags.length)),flags);

// Independent source-derived specification. Uses literal semantic tables above,
// not a production decoder. All X indexes wrap as the original 8-bit CPU does.
function expand(source,cpu){
 const cells=new Uint8Array(256),writes=[],commands=[];let cursor=0;
 const byte=()=>{assert.ok(cursor<256,'Native Y offset would wrap without a terminator');return source[offset(cpu)+(cursor++)];};
 const put=(index,tile)=>{assert.ok(Number.isInteger(tile)&&tile>=0&&tile<36);const cell=index&255;cells[cell]=tile;writes.push({address:levelBuf+cell,value:tile});};
 while(cursor<256){const start=cursor,position=byte(),type=byte(),kind=type>>>4,param=type&15;
  if(type===0)return{cells,writes,commands,byteLength:cursor,spawn:{x:position&15,y:position>>>4}};
  assert.ok(kind<=13,'Unsupported dispatch index '+kind);
  const command={sourceOffset:offset(cpu)+start,position,type};
  if(kind===0)put(position,single[param]);
  else if(kind===1){assert.ok(param<extra.length);put(position,extra[param]);}
  else if(kind<=8){for(let i=0;i<=param;i++)put(position+i,fill[kind-2]);}
  else if(kind<=12){for(let i=0;i<=param;i++)put(position+16*i,fill[kind-9]);}
  else {const dimensions=byte();command.dimensions=dimensions;for(let y=0;y<=(dimensions>>>4);y++)for(let x=0;x<=(dimensions&15);x++)put(position+16*y+x,single[param]);}
  commands.push(command);
 }
 throw Error('Missing terminator');
}
const runtime=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(runtime.errors,[]);
runtime.context.researchROM=new Uint8Array(rom);
let publicHeaderError=null;try{runtime.run('parseRomHeader(researchROM)');}catch(error){publicHeaderError=error.message;}
assert.match(publicHeaderError,/NES 2\.0 is not supported/);
// Configure only the PRG mapping and bus state used by CPU subroutine execution.
// Keep original input bytes and header intact. No call to emuLoadRomData succeeds.
runtime.run('emu.prgRom=researchROM.slice(16);emu.prgSize=32768;emu.mapper=0;emu.prgBank0=0;emu.prgBank1=16384;emu.hasChrRam=true;emu.chrRam=new Uint8Array(8192);emu.sram=null;emu.loaded=false;emu.running=false;var researchWriteLog=[],researchWrite=cpuWrite;cpuWrite=function(a,v){if(a>=0x700&&a<=0x7ff)researchWriteLog.push({address:a,value:v&255});return researchWrite(a,v);};');
function reset(source){runtime.context.researchPRG=new Uint8Array(source.subarray(16));runtime.run('emu.prgRom=researchPRG;emu.ram.fill(0);emu.A=emu.X=emu.Y=emu.C=emu.Z=emu.D=emu.V=emu.N=0;emu.SP=0xfd;emu.I=1;emu.cycles=emu.opsMissed=0;emu.irqPending=false;researchWriteLog=[];');}
function execute(start,stop=0x6000,budget=50000){runtime.context.researchStart=start;runtime.context.researchStop=stop;runtime.context.researchBudget=budget;return runtime.run('emu.PC=researchStart;var researchSteps=0;while(emu.PC!==researchStop){if(++researchSteps>researchBudget)throw Error("Original CPU routine exceeded instruction budget at "+emu.PC.toString(16));cpuStep();}if(emu.opsMissed)throw Error("Unimplemented CPU opcode encountered");researchSteps;',30000);}
function call(start,budget){runtime.run('cpuPush(0x5f);cpuPush(0xff);');const steps=execute(start,0x6000,budget);assert.equal(runtime.run('emu.SP'),0xfd,'Original routine restores stack');return steps;}
function decode(source,cpu){reset(source);runtime.run(`cpuWrite(${mapPointer},${cpu&255});cpuWrite(${mapPointer+1},${cpu>>>8});`);const steps=call(addr('DecodeLevelMap'));return{cells:Uint8Array.from(runtime.json('Array.from(emu.ram.slice(0x700,0x800))')),writes:runtime.json('researchWriteLog'),spawn:{x:runtime.run(`cpuRead(${addr('LevelEditStartX')})`),y:runtime.run(`cpuRead(${addr('LevelEditStartY')})`)},steps};}
function predicate(tile,y=0x9d){runtime.run(`emu.A=${tile};emu.Y=${y};emu.SP=0xfd;`);call(addr('BlockIsSolid'));const result=runtime.json('({a:emu.A,y:emu.Y,z:emu.Z})');assert.equal(result.y,y,'BlockIsSolid retains Y');assert.equal(result.a,flags[tile]&4);assert.equal(result.z,result.a===0?1:0);return result.a!==0;}
const source=fs.readFileSync(path.join(sourceDirectory,'levels.s'),'utf8');
const mapNames=[...source.matchAll(/^(Level\w+):/gm)].map(m=>m[1]).filter(name=>!name.startsWith('LevelData_'));
const configByteLength=addr('LoadLevelParams')-addr('LevelParamTable');assert.equal(configByteLength%8,0);
const configPointers=Array.from({length:configByteLength/8},(_,i)=>rom.readUInt16LE(offset(addr('LevelParamTable'))+i*8+6));
const referencedMaps=new Set(configPointers.filter(Boolean));
const mapResults=[];
for(const name of mapNames){const cpu=addr(name),expected=expand(rom,cpu),actual=decode(rom,cpu);assert.deepEqual(actual.cells,expected.cells,name+' map memory');assert.deepEqual(actual.writes,expected.writes,name+' exact ordered writes');assert.deepEqual(actual.spawn,expected.spawn,name+' terminal spawn');let solidCount=0;for(const tile of actual.cells)solidCount+=predicate(tile)?1:0;mapResults.push({name,cpuAddress:cpu,fileOffset:offset(cpu),referencedByLevelTable:referencedMaps.has(cpu),encodedByteLength:expected.byteLength,commandCount:expected.commands.length,writeCount:actual.writes.length,decodedSha256:sha(actual.cells),solidCount,spawn:actual.spawn,instructions:actual.steps,passed:true});}
assert.deepEqual([...referencedMaps].sort((a,b)=>a-b),mapResults.filter(r=>r.referencedByLevelTable).map(r=>r.cpuAddress).sort((a,b)=>a-b));
const predicateResults=flags.map((f,tile)=>({tile,nativeFlags:f,solid:predicate(tile),passed:true}));

const finalAddress=addr('LevelFinal'),finalOffset=offset(finalAddress);
assert.deepEqual(Array.from(rom.subarray(finalOffset,finalOffset+4)),[0xe1,0x2d,0xd4,0]);
const altered=Buffer.from(rom);altered[finalOffset+1]=0x3d;
const before=decode(rom,finalAddress),after=decode(altered,finalAddress),changed=[];
assert.deepEqual(before.cells,expand(rom,finalAddress).cells);assert.deepEqual(after.cells,expand(altered,finalAddress).cells);
for(let i=0;i<256;i++)if(before.cells[i]!==after.cells[i])changed.push(i);
assert.deepEqual(changed,Array.from({length:14},(_,i)=>0xe1+i));
assert.equal(before.cells[0xe1],21);assert.equal(after.cells[0xe1],0);

// Run the original player horizontal movement instruction range. The ca65
// listing independently marks both boundaries; no replacement routine is used.
const listing=fs.readFileSync(listingPath,'utf8');
function markerAddress(marker){const escaped=marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=listing.match(new RegExp('^([0-9A-Fa-f]{6})r[^\\n]*; '+escaped+'$','m'));assert.ok(match,'Missing source listing boundary '+marker);return 0x8000+parseInt(match[1],16);}
const movementStart=markerAddress('moving left and right'),movementStop=markerAddress('select skips to the next level, or skips to the level edit screen');
function moveRight(source){const state=decode(source,finalAddress);runtime.run(`emu.X=0;emu.SP=0xfd;cpuWrite(0,2);cpuWrite(${addr('keydown')},1);cpuWrite(${addr('PlayerPX')},8);cpuWrite(${addr('PlayerPYH')},216);cpuWrite(${addr('PlayerDir')},1);`);const instructions=execute(movementStart,movementStop,500);return{startingX:8,endingX:runtime.run(`cpuRead(${addr('PlayerPX')})`),y:216,probeCell:0xe1,probeTile:state.cells[0xe1],solid:predicate(state.cells[0xe1]),instructions};}
const blocked=moveRight(rom),traversable=moveRight(altered);assert.equal(blocked.endingX,8);assert.equal(traversable.endingX,10);
assert.equal(sha(rom),sha(fs.readFileSync(romPath)));
assert.deepEqual(Array.from(rom.keys()).filter(i=>rom[i]!==altered[i]),[finalOffset+1]);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(path.join(path.dirname(output),'DABG_LevelFinal_Empty_Run_Research_Variant.nes'),altered);
const report={format:'NESForgeIndependentNativeMapCPUResearch',version:1,status:'passed',
 scope:'Research only. Original assembled DABG map decoder, block-solid predicate and isolated horizontal player movement range executed through the existing unmodified Forge CPU/bus. No frontend ROM load, full-game boot, browser, independent emulator, hardware, canonical project import or rebuilding acceptance.',
 source:{title:'Double Action Blaster Guys',rom:path.relative(path.dirname(output),romPath),sha256:sha(rom),byteLength:rom.length,headerBytes:Array.from(rom.subarray(0,16)),format:'NES 2.0',mapper:0,prgBytes:32768,chrRomBytes:0,chrRamBytes:8192},
 evidence:{labelsSha256:sha(fs.readFileSync(labelsPath)),listingSha256:sha(fs.readFileSync(listingPath)),scriptSha256:sha(fs.readFileSync(__filename)),sourceFiles:['levels.s','meta.s','player.s','memory.s','ns_nes.s'].map(name=>({name,sha256:sha(fs.readFileSync(path.join(sourceDirectory,name)))}))},
 framework:{htmlSha256:sha(fs.readFileSync(html)),publicHeaderError,originalHeaderPreserved:true,emulatorLoaded:runtime.run('emu.loaded'),opcodeMisses:runtime.run('emu.opsMissed')},
 harness:{ramInitialState:'All zero; models the caller GenerateLevel clearing its LevelBuf before invoking DecodeLevelMap.',prgMapping:'CPU $8000-$FFFF maps the unchanged 32768 PRG bytes after the original 16-byte header.',stack:'Harness pushes return address $5FFF so original RTS stops at $6000.',interrupts:'Disabled; no frame loop or PPU boot.',limitInstructionsPerMap:50000,sourceFiles:['levels.s','meta.s','player.s','memory.s','ns_nes.s'],routines:{DecodeLevelMap:addr('DecodeLevelMap'),BlockIsSolid:addr('BlockIsSolid'),movementStart,movementStop}},
 findings:{mapBuffer:{width:16,height:16,cellPixels:16,address:levelBuf},presentation:'The visible screen is 16 by 15 metatiles; native buffer row 15 remains represented as native data.',repeatLengths:'A low nibble n writes n+1 cells, including horizontal and vertical commands. Rectangle stored width/height nibbles also mean n+1.',rectangleType:'The subtype selects LevelData_MetaList directly. $D4 is solid and $D0 is empty; levelformat.txt describes this incorrectly.',collision:'MetatileFlags bit 2 is the full-solid predicate used for horizontal movement. Separate top-landing/platform and interactive-block semantics remain outside this predicate.',decodingScope:'Static command output before PrettyLevel. GenerateLevel subsequently calls PreLevelScreen, PrettyLevel and RenderLevelBuf. PrettyLevel adds random clouds and alters grass/platform presentation, so raw map IDs are not a final rendered screenshot.'},
 mapResults,predicateResults,
 nativeEdit:{originalSha256:sha(rom),variant:'DABG_LevelFinal_Empty_Run_Research_Variant.nes',variantSha256:sha(altered),byteEdits:[{fileOffset:finalOffset+1,from:0x2d,to:0x3d,meaning:'Horizontal solid run of 14 cells becomes horizontal empty run of the same length.'}],changedCells:changed,spawnBefore:before.spawn,spawnAfter:after.spawn,originalMovement:blocked,editedMovement:traversable,passed:true},
 totals:{originalMaps:mapResults.length,referencedUniqueMaps:referencedMaps.size,levelConfigurationRecords:configPointers.length,mappedLevelConfigurationRecords:configPointers.filter(Boolean).length,originalMapCellsCompared:mapResults.length*256,originalOrderedWritesCompared:mapResults.reduce((sum,x)=>sum+x.writeCount,0),metatilePredicates:predicateResults.length,editedMaps:1,movementCases:2,failed:0}};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:output,...report.totals},null,2));
