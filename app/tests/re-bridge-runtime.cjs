#!/usr/bin/env node
'use strict';
// Independent end-to-end proof: execute the original authored 6502 fixture,
// recover canonical authoring data, rebuild with Forge, and execute real edits.
// This uses the bundled CPU/PPU/APU and a mock DOM, not browser or hardware QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html'));
const fixturePath=path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes'),original=Uint8Array.from(fs.readFileSync(fixturePath));
const digest=data=>crypto.createHash('sha256').update(data).digest('hex'),originalHash=digest(original),plain=value=>JSON.parse(JSON.stringify(value));
// Authored fixture expectations, deliberately independent of REBridge output.
const NOTES=[48,52,55,60,59,55,52,50,48,52,55,57,55,52,50,48];
const TIMERS=[427,338,284,213,225,284,338,380,427,338,284,253,284,338,380,427];
const PALETTES=[33,15,39,41,33,15,22,39,33,17,48,33,33,15,39,41,33,15,40,22,33,15,48,18,33,15,48,18,33,15,48,18];
const ORIGINAL_SYMBOLS={ready:8,frameReady:0,playerX:1,labels:{main:32944}};
const tests=[],test=(name,fn)=>tests.push({name,fn}),metrics={sourceRomSha256:originalHash,limitations:['Mock DOM: no browser interaction, native dialogs, audible output, mobile latency or physical hardware acceptance.','Rebuilt runtime uses Forge sideview physics including jump and attack states. Original engine has horizontal movement only; whole-engine equivalence is not claimed.']};
const captures={};let recovered,baselineProject,baselineBuilt,originalBoot;
function fresh(){const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);return h;}
function keys(h,names=[]){h.context.reKeys=names;h.run('clearEmuKeys();S.tab="emu";for(const key of reKeys)emuKeys[key]=true');}
function frames(h,count=1,names){if(names)keys(h,names);h.run(`for(let i=0;i<${count};i++){emuRunFrame();if(emu.ram[reSymbols.ready]){let steps=0;while(emu.PC!==reSymbols.labels.main||emu.ram[reSymbols.frameReady]){cpuStep();if(++steps>30000)throw Error('RE runtime did not reach committed main-loop boundary');}}}`,Math.max(15000,count*250));assert.equal(h.run('emu.opsMissed'),0);}
function boot(h,rom,symbols){h.context.reRom=Uint8Array.from(rom);h.context.reSymbols=symbols;assert.equal(h.run('emuLoadRomData(reRom,"RE proof",0)',15000),true);keys(h,[]);for(let i=0;i<120;i++){frames(h);if(h.run('emu.ram[reSymbols.ready]')){frames(h,3);return h;}}throw Error('RE proof ROM did not boot');}
function build(h){h.run('window._buildAndRunMode=true');h.context.reArtifact=h.run('Forge.services.RuntimeCompiler.compile()',30000);assert.equal(h.context.reArtifact.backend,'single-room');assert.ok(h.context.reArtifact.rom instanceof Uint8Array);assert.deepEqual(h.errors,[]);return h.context.reArtifact;}
function bootProject(project){const h=fresh();h.context.reProject=plain(project);h.run('Forge.services.ProjectStore.load(reProject)');const artifact=build(h);return boot(h,artifact.rom,artifact.gameplay.symbols);}
function state(h){return h.json('({x:emu.ram[reSymbols.playerX],y:Number.isInteger(reSymbols.playerY)?emu.ram[reSymbols.playerY]:208,apu:Array.from(emu.apuRegs.slice(0,4)),missed:emu.opsMissed})');}
function timer(h){return h.run('emu.apuRegs[2]+((emu.apuRegs[3]&7)<<8)');}
function framebuffer(h,bg=false){return Buffer.from(h.run(bg?'emu.bgFrameBuffer':'emu.frameBuffer'));}
function capture(h,name){captures[name]=framebuffer(h);return digest(captures[name]);}
async function recover(){if(!recovered){const h=fresh();h.context.reInput=Uint8Array.from(original);h.context.reAnalysis=await h.run('Forge.services.REBridge.analyze(reInput,"Bridge_Room.nes")',15000);assert.ok(h.context.reAnalysis.exportProject);h.run('Forge.services.REBridge.importProject(reAnalysis)');baselineProject=h.json('Forge.services.ProjectStore.capture()');recovered=h;}return recovered;}
function expectedCollision(){return Array.from({length:960},(_,i)=>{const x=i%32,y=Math.floor(i/32);return y>=26||(y>=16&&y<26&&x>=24&&x<26)?1:0;});}
function canonicalCollision(sc){return sc.nt.map((tile,i)=>{const x=i%32,y=Math.floor(i/32),id=sc.metaMap[Math.floor(y/2)*16+Math.floor(x/2)];if(id===-1)return sc.tileProps[tile];const m=sc.metatiles.find(item=>item.id===id);assert.ok(m,'Linked metatile must retain its explicit collision');return m.collision[(y%2)*2+x%2];});}
function packedTile(tile){return Uint8Array.from([0,1].flatMap(bit=>tile.map(row=>row.reduce((value,pixel,x)=>value|(((pixel>>bit)&1)<<(7-x)),0))));}

test('Independent source ROM is metadata-free and executes its native collision and pulse music',()=>{
 for(const marker of ['NESForge','NF190','GameplayCore'])assert.equal(Buffer.from(original).includes(Buffer.from(marker)),false,marker);
 assert.equal(original.length,40976);assert.deepEqual(Array.from(original.slice(0,8)),[78,69,83,26,2,1,0,0]);
 const h=boot(fresh(),original,ORIGINAL_SYMBOLS);originalBoot=h;assert.equal(state(h).x,40);assert.equal(timer(h),427);assert.equal(h.run('emu.apuRegs[0]'),188);
 const start=state(h);metrics.originalBoot={...start,framebufferSha256:capture(h,'original')};frames(h,100,['ArrowRight']);const blocked=state(h);assert.equal(blocked.x,188);frames(h,8,['ArrowRight']);assert.equal(state(h).x,188);frames(h,20,['ArrowLeft']);assert.equal(state(h).x,148);metrics.originalMovement={start,blocked,afterLeft:state(h)};
 assert.equal(digest(original),originalHash);
});
test('ROM recovery materializes every authored collision cell, graphic tile, palette and music row',async()=>{
 const h=await recover(),p=baselineProject,sc=p.scenes[0];assert.equal(p.format,'NESForge');assert.equal(p.version,12);assert.equal(p.scenes.length,1);assert.deepEqual(Buffer.from(p.importedRom,'base64'),Buffer.from(original));assert.deepEqual(canonicalCollision(sc),expectedCollision());
 assert.deepEqual(sc.nt,Array.from(original.slice(0x3010,0x3010+960)));assert.deepEqual(sc.attr,Array.from(original.slice(0x33d0,0x33d0+64)));assert.deepEqual([...sc.pal.flat(),...sc.sprPal.flat()],PALETTES);
 for(let i=0;i<256;i++){assert.deepEqual(Array.from(packedTile(sc.chr[i])),Array.from(original.slice(32784+i*16,32784+i*16+16)));assert.deepEqual(Array.from(packedTile(sc.sprChr[i])),Array.from(original.slice(36880+i*16,36880+i*16+16)));}
 assert.deepEqual(p.patterns[0].rows.map(row=>row[0].note),NOTES);assert.equal(p.speed,12);assert.equal(p.tempo,150);assert.deepEqual(p.sfx,[]);assert.equal(p.gameplay.bodyWidth,8);assert.equal(p.gameplay.bodyHeight,8);assert.equal(p.gameplay.moveSpeed,2);assert.equal(sc.entities.find(e=>e.type==='player').x,40);
 metrics.recovery={cells:960,backgroundTiles:256,spriteTiles:256,musicRows:16,sfxRecovered:0,projectSha256:digest(Buffer.from(JSON.stringify(p)))};assert.equal(digest(h.context.reInput),originalHash);
});
test('Imported project rebuilds and its displayed scene pixels equal the original completed frame',async()=>{
 await recover();baselineBuilt=bootProject(baselineProject);const h=baselineBuilt;assert.equal(state(h).x,40);assert.equal(state(h).y,208);assert.equal(timer(h),427);assert.equal(h.run('emu.apuRegs[0]'),188);assert.deepEqual(framebuffer(h,true),framebuffer(originalBoot,true),'Background pixels');
 assert.deepEqual(framebuffer(h),captures.original,'Background and player pixels');metrics.rebuiltBoot={...state(h),framebufferSha256:capture(h,'rebuilt'),romSha256:digest(h.context.reArtifact.rom)};
});
test('Rebuilt 6502 engine honors recovered wall, floor and matching left/right movement',async()=>{
 await recover();const h=bootProject(baselineProject),start=state(h);frames(h,100,['ArrowRight']);const blocked=state(h);assert.equal(blocked.x,188);assert.equal(blocked.y,208);frames(h,8,['ArrowRight']);assert.equal(state(h).x,188);frames(h,20,['ArrowLeft']);assert.equal(state(h).x,148);metrics.rebuiltMovement={start,blocked,afterLeft:state(h)};
});
test('Original and rebuilt programs emit the complete authored pulse-note sequence through the APU',async()=>{
 await recover();const sequences={};for(const [name,h] of [['original',boot(fresh(),original,ORIGINAL_SYMBOLS)],['rebuilt',bootProject(baselineProject)]]){const observed=[timer(h)],events=[{frame:0,timer:timer(h)}];for(let frame=1;frame<=200&&observed.length<16;frame++){frames(h,1,[]);const current=timer(h);if(current!==observed.at(-1)){observed.push(current);events.push({frame,timer:current});}}assert.deepEqual(observed,TIMERS,name+' complete note sequence');for(let i=2;i<events.length;i++)assert.equal(events[i].frame-events[i-1].frame,12,name+' music row spacing');sequences[name]=events;}metrics.musicSequences=sequences;
});
test('Canonical wall-collision edit changes emitted collision and lets actual 6502 player cross the wall',async()=>{
 await recover();const h=fresh();h.context.reProject=plain(baselineProject);h.run('Forge.services.ProjectStore.load(reProject)');h.get('colPropSel').value='0';h.run('col_setTileProp(2)');const edited=h.json('Forge.services.ProjectStore.capture()'),editedCollision=canonicalCollision(edited.scenes[0]);assert.equal(editedCollision[25*32+24],0);assert.equal(editedCollision[26*32+24],1);const artifact=build(h);boot(h,artifact.rom,artifact.gameplay.symbols);frames(h,100,['ArrowRight']);assert.equal(state(h).x,240);assert.equal(state(h).y,208);metrics.collisionEdit={...state(h),romSha256:digest(artifact.rom),framebufferSha256:capture(h,'edited-collision')};
 h.run('undo()');assert.deepEqual(canonicalCollision(h.json('Forge.services.ProjectStore.capture().scenes[0]')),expectedCollision());
});
test('Canonical CHR pixel edit reaches rebuilt pattern bytes and the displayed 6502 framebuffer',async()=>{
 await recover();const h=fresh();h.context.reProject=plain(baselineProject);h.run('Forge.services.ProjectStore.load(reProject);snapshot();S.chr[2][0][0]=3;notify("reProofPixelEdit")');const artifact=build(h);boot(h,artifact.rom,artifact.gameplay.symbols);
 const frame=framebuffer(h,true),before=framebuffer(baselineBuilt,true),pixel=(128*256+192)*4;assert.notDeepEqual(frame.subarray(pixel,pixel+3),before.subarray(pixel,pixel+3));
 const packedChr=Buffer.from(artifact.rom.slice(16+artifact.rom[4]*16384)),nt=h.json('Array.from(emu.vram.slice(0,960))'),tile=nt[16*32+24];assert.equal((packedChr[tile*16]>>7)&1,1);assert.equal((packedChr[tile*16+8]>>7)&1,1);metrics.chrEdit={tile,sourcePixel:{x:192,y:128},before:Array.from(before.subarray(pixel,pixel+4)),after:Array.from(frame.subarray(pixel,pixel+4)),romSha256:digest(artifact.rom),framebufferSha256:capture(h,'edited-chr')};
});
test('Canonical tracker-note edit changes the actual APU timer from C4 to C5',async()=>{
 await recover();const h=fresh();h.context.reProject=plain(baselineProject);h.run('Forge.services.ProjectStore.load(reProject);snapshot();S.patterns[0].rows[0][0].note=60;notify("reProofMusicEdit")');const artifact=build(h);boot(h,artifact.rom,artifact.gameplay.symbols);assert.equal(timer(h),213);assert.notEqual(timer(h),427);metrics.musicEdit={beforeTimer:427,afterTimer:timer(h),apu:state(h).apu,romSha256:digest(artifact.rom)};
});
test('Authoritative ProjectStore JSON save/reload preserves canonical recovery and deterministic rebuilt bytes',async()=>{
 const h=await recover();const before=h.json('Forge.services.ProjectStore.capture()'),saved=h.run('Forge.services.ProjectStore.serialize()'),first=Buffer.from(build(h).rom);assert.equal(JSON.parse(saved).format,'NESForge');const reopened=fresh();reopened.context.savedRE=saved;assert.equal(reopened.run('Forge.services.ProjectStore.load(savedRE)'),true);assert.deepEqual(reopened.json('Forge.services.ProjectStore.capture()'),before);const second=Buffer.from(build(reopened).rom);assert.deepEqual(second,first);metrics.projectRoundTrip={jsonSha256:digest(Buffer.from(saved)),romSha256:digest(second),jsonBytes:Buffer.byteLength(saved)};assert.equal(digest(original),originalHash);assert.equal(digest(fs.readFileSync(fixturePath)),originalHash);assert.equal(digest(h.context.reInput),originalHash);
});

function png(rgba){const crc=buffer=>{let n=0xffffffff;for(const byte of buffer){n^=byte;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;},chunk=(type,data)=>{const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([name,data])),out.length-4);return out;};const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(256,0);ihdr.writeUInt32BE(240,4);ihdr[8]=8;ihdr[9]=6;const scan=Buffer.alloc(240*(1024+1));for(let y=0;y<240;y++)rgba.copy(scan,y*1025+1,y*1024,(y+1)*1024);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);}
(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
 const passed=results.filter(x=>x.passed).length,report={suite:'re-bridge-runtime',html:path.basename(html),htmlSha256:digest(fs.readFileSync(html)),scope:'Independent authored source ROM versus recovered canonical project and rebuilt actual 6502 CPU/PPU/APU execution; collision, CHR and tracker edits; ProjectStore JSON round trip. Mock DOM, not browser or hardware acceptance.',passed,failed:results.length-passed,total:results.length,metrics,results};
 const reportPath=process.env.FORGE_TEST_REPORT||process.argv[3];if(reportPath){fs.mkdirSync(path.dirname(path.resolve(reportPath)),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
 if(process.env.FORGE_RE_EVIDENCE_DIR){const dir=path.resolve(process.env.FORGE_RE_EVIDENCE_DIR);fs.mkdirSync(dir,{recursive:true});for(const [name,rgba]of Object.entries(captures))fs.writeFileSync(path.join(dir,name+'.png'),png(rgba));if(baselineProject)fs.writeFileSync(path.join(dir,'Bridge_Room_Recovered.nesforge.json'),JSON.stringify(baselineProject,null,2)+'\n');if(baselineBuilt)fs.writeFileSync(path.join(dir,'Bridge_Room_Rebuilt.nes'),Buffer.from(baselineBuilt.context.reArtifact.rom));}
 process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;
})();
