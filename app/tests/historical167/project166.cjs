#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),candidate=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.6_No_Code_Workflow.html'));
const html=candidate;if(!fs.existsSync(html))throw Error('Missing release candidate: '+html);
const tests=[],test=(name,fn)=>tests.push({name,fn});
function fresh(){const h=loadForge(html);assert.ok(h.run('!!window.Forge166?.project'),'Project actions must be bundled');h.context.externalScoutFixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/scout166.json'),'utf8'));assert.deepEqual(h.errors,[]);h.run('window._buildAndRunMode=true');return h;}
function build(h){const rom=h.run('buildNesRom()',20000);assert.ok(rom instanceof Uint8Array,h.errors.join('; '));return rom;}
let scoutRom;
function romFixture(){if(!scoutRom){const h=fresh();h.run('Forge166.project.replaceProject(externalScoutFixture)');scoutRom=build(h);}return scoutRom.slice();}
function primeRuntime(h){h.run('emu.loaded=true;emu.running=true;emu.frameCount=73;emu.romName="prior-runtime";emu.lastBuiltRom=new Uint8Array([1,2,3]);window._lastBuiltRom=emu.lastBuiltRom;Forge165.lastBuild={sentinel:true};S.projectId=88');}
function runtime(h){return h.json('({loaded:emu.loaded,running:emu.running,frame:emu.frameCount,name:emu.romName,rom:Array.from(emu.lastBuiltRom||[]),built:Array.from(window._lastBuiltRom||[]),last:Forge165.lastBuild,id:S.projectId})');}
function history(h){return h.json('({undo:undoStack,redo:redoStack,bytes:undoBytes})');}
// The legacy loader canonicalizes absent raster state to null on ordinary undo.
function content(h){const data=h.json('projectData()');for(const scene of data.scenes)if(scene.raster==null)delete scene.raster;return data;}
function assertRejectedUnchanged(h,bytes,pattern){const before=h.json('projectData()'),stack=history(h),run=runtime(h);h.context.bad=bytes;assert.throws(()=>h.run('Forge166.project.openRom(bad,"Bad.nes")',20000),pattern);assert.deepEqual(h.json('projectData()'),before);assert.deepEqual(history(h),stack);assert.deepEqual(runtime(h),run);}

test('Blank room starts clean with explicit fixed sideview defaults and missing player',()=>{
  const h=fresh();h.run('Forge166.project.replaceProject(externalScoutFixture);Forge166.project.create("blank")');
  assert.deepEqual(h.json('({scenes:S.scenes.length,frames:S.metasprites.length,animations:S.animations.length,entities:S.scenes[0].entities.length,worlds:S.worlds.length,asm:S.asmSource,imported:S.importedRom})'),{scenes:1,frames:0,animations:0,entities:0,worlds:0,asm:'',imported:null});
  assert.deepEqual(h.json('({type:S.scenes[0].sceneType,scroll:S.scenes[0].scrollDir,w:S.scenes[0].view.w,h:S.scenes[0].view.h,include:S.scenes[0].buildInclude})'),{type:'sideview',scroll:'none',w:256,h:240,include:true});
  assert.equal(h.run('S.gameplay.mode'),'single-room');assert.equal(h.run('S.gameplay.sceneId===S.scenes[0].id'),true);assert.equal(h.run('S.gameplay.playerId'),'');assert.equal(h.run('buildNesRom()'),null);assert.match(h.errors.at(-1),/player entity/);
});
test('External Scout example builds through validated project replacement without custom code',()=>{
  const h=fresh();h.run('Forge166.project.replaceProject(externalScoutFixture)');const rom=build(h);assert.equal(rom.length,40976);assert.equal(h.run('S.asmSource'),'');assert.equal(h.run('S.scenes.length'),1);assert.equal(h.run('S.animations.length'),4);assert.equal(h.run('S.metasprites.length'),4);
});
test('Fresh editor opens Scout as one editable room and immediately rebuilds',()=>{
  const h=fresh();h.context.rom=romFixture();assert.equal(h.run('Forge166.project.openRom(rom,"Scout.nes")',20000),true);assert.equal(h.run('S.scenes.length'),1);assert.equal(h.run('S.projectName'),'Scout');assert.deepEqual(h.json('Array.from(S.importedRom)'),Array.from(h.context.rom));build(h);assert.equal(h.run('Forge165.lastBuild.spec.sceneIndex'),0);
});
test('Opening from a populated project removes duplicate global assets and unrelated ASM',()=>{
  const h=fresh();h.run('Forge166.project.replaceProject(externalScoutFixture);document.getElementById("codeInput").value=".org $C000\\nRTS";S.asmSource=document.getElementById("codeInput").value;S.projectId=24');
  h.context.rom=romFixture();h.run('Forge166.project.openRom(rom,"Again.nes")',20000);assert.equal(h.run('S.scenes.length'),1);assert.equal(h.run('S.animations.length'),4);assert.equal(h.run('S.metasprites.length'),4);assert.equal(h.run('document.getElementById("codeInput").value'),'');assert.equal(h.run('S.projectId'),null);build(h);
});
test('Four edit/build/open cycles preserve identities, counts and metadata size',()=>{
  const h=fresh();h.context.rom=romFixture();let firstIds,firstSize;
  for(let i=0;i<4;i++){
    h.run('Forge166.project.openRom(rom,"Cycle.nes")',20000);assert.equal(h.run('S.scenes.length'),1);assert.equal(h.run('S.animations.length'),4);assert.equal(h.run('S.metasprites.length'),4);
    h.context.speed=i%2+2;h.run('Forge165.config.set("moveSpeed",speed)');h.context.rom=build(h);
    const ids=h.json('({frames:S.metasprites.map(f=>f.id),animations:S.animations.map(a=>a.id),entities:S.scenes[0].entities.map(e=>e.id)})');
    const size=h.run('(()=>{const h=parseRomHeader(rom);return Forge161.build.inspectWorldRom(rom.subarray(h.headerSize,h.headerSize+h.prgSize),h.prgSize).extension.length})()');
    if(i===0){firstIds=ids;firstSize=size;}else{assert.deepEqual(ids,firstIds);assert.equal(size,firstSize);}
    assert.equal(h.run('Forge165.readGameplayRom(rom).moveSpeed'),i%2+2);
  }
});
test('Reordered rooms restore separate art sources, independent CHR banks and complete linked worlds',()=>{
  const h=fresh();h.run(`Forge166.project.replaceProject(externalScoutFixture);saveCurrentScene();const room=S.scenes[0],other=makeScene({...JSON.parse(JSON.stringify(room)),id:'source-two',name:'Source Two',entities:[],buildOrder:0});room.buildOrder=1;S.scenes.push(other);
    for(const frame of S.metasprites)frame.sceneId=other.id;
    S.worlds=[{id:'world-a',name:'World A',tilesetSceneId:room.id,widthScreens:1,heightScreens:1,map:Array(240).fill(1),rooms:[{id:'room-a',name:'A',x:0,y:0,w:16,h:15}],markers:[{id:'exit-a',name:'Exit A',kind:'exit',x:1,y:1,targetWorldId:'world-b',targetMarkerId:'entry-b'}],cameraRegions:[{id:'camera-a',name:'Camera A',x:0,y:0,w:16,h:15,mode:'locked'}]},
      {id:'world-b',name:'World B',tilesetSceneId:other.id,widthScreens:1,heightScreens:1,map:Array(240).fill(1),rooms:[],markers:[{id:'entry-b',name:'Entry B',kind:'entrance',x:2,y:2,targetWorldId:'world-a',targetMarkerId:'exit-a'}],cameraRegions:[]}];
    window.worldContent166=()=>S.worlds.map(w=>({...w,tilesetSceneId:S.scenes.find(s=>s.id===w.tilesetSceneId).name}));`);
  const beforeWorlds=h.json('worldContent166()'),beforePalette=h.json('S.scenes[1].sprPal');
  h.context.rom=build(h);h.run('Forge166.project.openRom(rom,"Worlds.nes")',20000);
  assert.equal(h.run('S.activeScene'),1);assert.equal(h.run('S.gameplay.sceneId===S.scenes[1].id'),true);
  assert.deepEqual(h.json('worldContent166()'),beforeWorlds);
  assert.deepEqual(h.json('S.metasprites.map(frame=>S.scenes.find(scene=>scene.id===frame.sceneId).name)'),Array(4).fill('Source Two'));
  assert.deepEqual(h.json('S.scenes[0].sprPal'),beforePalette);
  assert.deepEqual(h.json('S.scenes.map(scene=>({linked:scene.metaMap[206],collision:scene.metatiles.find(m=>m.id===1).collision}))'),Array.from({length:2},()=>({linked:1,collision:[1,1,1,1]})));
  assert.equal(h.run('S.allChrBanks.length'),2);
  assert.equal(h.run('S.scenes[0].chr!==S.scenes[1].chr&&S.scenes[0].chr[0]!==S.scenes[1].chr[0]&&S.chr!==S.scenes[1].chr'),true);
  build(h);assert.equal(h.run('Forge165.lastBuild.spec.sceneIndex'),1);
});
test('Replacement adds exactly one undo step and clears redo while preserving older history',()=>{
  const h=fresh();h.run('snapshot();S.projectName="Earlier edit";snapshot();S.projectName="Before replacement"');const older=h.json('undoStack'),before=content(h);h.run('Forge166.project.replaceProject(externalScoutFixture)');assert.equal(h.run('undoStack.length'),older.length+1);assert.deepEqual(h.json('undoStack.slice(0,-1)'),older);assert.equal(h.run('redoStack.length'),0);h.run('undo()');assert.deepEqual(content(h),before);h.run('redo()');assert.equal(h.run('S.gameplay.playerId'),'scout-player');
});
test('Undo/redo restores project content while keeping browser save identity detached',()=>{
  const h=fresh();h.run('S.projectId=51;S.projectName="Saved prior game"');const before=content(h);h.context.rom=romFixture();h.run('Forge166.project.openRom(rom,"Opened.nes")',20000);const after=content(h);assert.equal(h.run('S.projectId'),null);h.run('undo()');assert.deepEqual(content(h),before);assert.equal(h.run('S.projectId'),null);h.run('S.projectId=99;redo()');assert.deepEqual(content(h),after);assert.equal(h.run('S.projectId'),null);
});
test('Ordinary authoring undo and redo retain emulator state and browser-save identity',()=>{
  const h=fresh();h.run('Forge166.project.replaceProject(externalScoutFixture)');primeRuntime(h);const before=runtime(h);h.run('Forge165.config.set("moveSpeed",3);undo()');assert.deepEqual(runtime(h),before);h.run('redo()');assert.deepEqual(runtime(h),before);assert.equal(h.run('S.gameplay.moveSpeed'),3);
});
test('Successful project replacement pauses stale playback and clears built-ROM caches',()=>{
  const h=fresh();primeRuntime(h);h.run('Forge166.project.create("blank")');assert.equal(h.run('emu.loaded'),false);assert.equal(h.run('emu.running'),false);assert.equal(h.run('window._lastBuiltRom'),null);assert.equal(h.run('emu.lastBuiltRom'),null);assert.equal(h.run('Forge165.lastBuild'),null);assert.equal(h.get('emuRunBtn').disabled,true);
});
for(const [name,mutate,pattern]of [
  ['bad GP16 checksum',rom=>{rom[16+0x3800+20]^=1;return rom;},/checksum/],
  ['unsupported GP16 version',rom=>{rom[16+0x3800+4]=77;return rom;},/version/],
  ['bad MS16 checksum',rom=>{const at=Buffer.from(rom).indexOf(Buffer.from('MS16'));assert.ok(at>0);rom[at+9]^=1;return rom;},/checksum/],
  ['truncated header',()=>new Uint8Array([78,69,83]),/header|ROM|NES/i],
])test('Rejected '+name+' leaves project, history, identity and running emulator unchanged',()=>{
  const h=fresh();h.run('Forge166.project.replaceProject(externalScoutFixture);snapshot()');primeRuntime(h);assertRejectedUnchanged(h,mutate(romFixture()),pattern);
});
test('Foreign ROM classification is nonmutating and cannot masquerade as a recovered project',()=>{
  const h=fresh();primeRuntime(h);const rom=new Uint8Array(16+16384+8192);rom.set([78,69,83,26,1,1]);rom.set([0x4c,0,0xc0],16);rom.set([0,0xc0,0,0xc0,0,0xc0],16+0x3ffa);h.context.foreign=rom;
  assert.deepEqual(h.json('Forge166.project.classifyRom(foreign)'),{kind:'rom',label:'Other NES ROM — runtime capture and original playback',mapper:0,sceneCount:0,editableProject:false,captureOnly:true});assertRejectedUnchanged(h,rom,/requires a Forge First Playable Room/);
});
test('Legacy append import remains available and foreign success message states capture limits',()=>{
  const h=fresh();const rom=new Uint8Array(16+16384+8192);rom.set([78,69,83,26,1,1]);rom.set([0x4c,0,0xc0],16);rom.set([0,0xc0,0,0xc0,0,0xc0],16+0x3ffa);h.context.rom=rom;assert.equal(h.run('importRom(rom,"Unknown.nes")',20000),true);assert.equal(h.run('S.scenes.length'),2);assert.equal(h.run('S.metasprites.length'),0);assert.match(h.get('toast').textContent,/runtime scene captured/);assert.match(h.get('toast').textContent,/not reconstructed/);
});
test('Unknown starter kind is rejected without modifying the workspace',()=>{const h=fresh(),before=h.json('projectData()'),stack=history(h);assert.throws(()=>h.run('Forge166.project.create("unknown")'),/blank project/);assert.deepEqual(h.json('projectData()'),before);assert.deepEqual(history(h),stack);});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}const passed=results.filter(result=>result.passed).length,report={suite:'project166',scope:'Full application VM: clean starter creation, GP16 project reopening/edit/build cycles, atomic rejection, history/browser identity, and foreign capture boundaries; mock DOM.',passed,total:results.length,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})();
