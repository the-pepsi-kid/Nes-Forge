#!/usr/bin/env node
'use strict';
// Executes the generated World program in the application's bundled 6502
// emulator. No JavaScript movement/collision model substitutes for ROM code.
// Mock DOM and approximate bundled PPU timing are not real-browser/hardware QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{worldProject,IDS,clone,marker}=require('./world-fixtures170.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const baseline=path.join(root,'baseline/NES_Forge_1.6.7_Architecture_Convergence.html');
const htmlSha256=crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),filtered=!!process.env.FORGE_TEST_FILTER;
const tests=[],test=(name,fn)=>tests.push({name,fn}),metrics={};
const PHYSICS=['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'];
function fresh(project=worldProject()){
 const h=loadForge(html);h.context.fixture170=project;h.run('db_deserializeState(fixture170);window._buildAndRunMode=true');
 assert.deepEqual(h.errors,[]);return h;
}
function plan(project=worldProject()){
 const h=fresh(project);h.run('window.source170=Forge.services.ProjectStore.prepareSnapshot({intent:"build"});window.plan170=Forge.services.WorldCompiler.plan(source170)',10000);return h;
}
function built(project=worldProject()){
 const h=fresh(project);h.context.artifact170=h.run('Forge.services.RuntimeCompiler.compile()',20000);
 assert.equal(h.context.artifact170.backend,'world');assert.ok(h.context.artifact170.rom instanceof Uint8Array);assert.ok(h.context.artifact170.world);
 h.context.sy170=h.context.artifact170.world.symbols;h.context.rom170=h.context.artifact170.rom;return h;
}
function value(h,key){const address=h.context.sy170[key];assert.ok(Number.isInteger(address)&&address>=0&&address<0x800,'Missing RAM symbol '+key);return h.run('emu.ram['+address+']');}
function ticks(h){return value(h,'tickLo')+256*value(h,'tickHi');}
function state(h){return Object.fromEntries(['ready','screen','screenX','screenY','worldIndex','roomIndex','cameraIndex','playerX','playerY','velocityY','grounded','playerState','playerFrame','playerFacing'].filter(key=>Number.isInteger(h.context.sy170[key])).map(key=>[key,value(h,key)]));}
function keys(h,names=[]){h.context.keys170=names;h.run('clearEmuKeys();S.tab="emu";for(const key of keys170)emuKeys[key]=true');}
function settle(h){h.run('for(let steps170=0;!(emu.PC===sy170.labels.main&&emu.ram[sy170.frameReady]===0);steps170++){if(steps170>50000)throw Error("World update did not settle");if(emu.ram[sy170.transition]&&(emu.PC===sy170.labels.transition_vblank||emu.PC===sy170.labels.enable_vblank))emuRunFrame();else cpuStep()}',15000);}
function frames(h,count=1,names){if(names)keys(h,names);for(let i=0;i<count;i++){h.run('emuRunFrame()',15000);if(value(h,'ready'))settle(h);}assert.equal(h.run('emu.opsMissed'),0);return state(h);}
function boot(project=worldProject()){
 const h=built(project);assert.equal(h.run('emuLoadRomData(rom170,"External Scout world",0)',15000),true);keys(h,[]);
 for(let i=0;i<120;i++){frames(h);if(value(h,'ready')&&ticks(h)>=3){frames(h,2,[]);return h;}}throw Error('World engine did not boot');
}
function until(h,predicate,max=150){for(let i=0;i<max;i++){const s=frames(h);if(predicate(s))return s;}throw Error('Runtime condition timed out: '+JSON.stringify(state(h)));}
function worldX(h){return value(h,'screenX')*256+value(h,'playerX');}
function digest(h,expression){return crypto.createHash('sha256').update(Buffer.from(h.run(expression))).digest('hex');}
function authored(h){return h.json('({scenes:S.scenes,worlds:S.worlds,animations:S.animations,metasprites:S.metasprites,gameplay:S.gameplay,worldRuntime:S.worldRuntime,asmSource:S.asmSource})');}
function atomicSnapshot(h){return h.json('({project:projectData(),projectId:S.projectId,dirty:Forge15.dirty,epoch:Forge.services.ProjectStore.state.epoch,undo:undoStack,redo:redoStack,undoBytes,runtime:{loaded:emu.loaded,running:emu.running,frame:emu.frameCount,cycles:emu.cycles,PC:emu.PC,SP:emu.SP,generation:emuRunGeneration,prg:Array.from(emu.prgRom||[]),ram:Array.from(emu.ram),vram:Array.from(emu.vram),oam:Array.from(emu.oamMem),imported:Array.from(S.importedRom||[]),last:Array.from(window._lastBuiltRom||[])}})');}
function rejectsPlan(edit,pattern){const p=worldProject();edit(p);const h=fresh();h.context.invalid170=p;const before=authored(h);assert.throws(()=>h.run('Forge.services.WorldCompiler.plan(invalid170)',15000),pattern);assert.deepEqual(authored(h),before);}
let defaultCompiled;
function defaultBuild(){return defaultCompiled||(defaultCompiled=built());}

// Configuration and compiler/link contracts.
test('External example preserves Scout bindings and uses metatiles absent from the source scene map',()=>{
 const p=worldProject(),scout=require('./fixtures/scout166.json');assert.deepEqual(p.scenes[0].entities,scout.scenes[0].entities);assert.deepEqual(p.scenes[0].metaMap,scout.scenes[0].metaMap);
 assert.deepEqual(p.animations,scout.animations);assert.deepEqual(p.metasprites,scout.metasprites);
 for(const id of [IDS.surface,IDS.solid,IDS.detailA,IDS.detailB])assert.ok(!p.scenes[0].metaMap.includes(id));
});
test('Legacy project migration leaves World runtime disabled and startup remains empty',()=>{
 const h=loadForge(html);assert.deepEqual(h.json('S.worlds'),[]);assert.equal(h.run('S.worldRuntime.enabled'),false);
 h.context.old170=require('./fixtures/scout166.json');h.run('db_deserializeState(old170)');assert.equal(h.run('S.worldRuntime.enabled'),false);assert.equal(h.run('S.audioRuntime.enabled'),false);assert.equal(h.run('S.gameplayCore.enabled'),false);assert.equal(h.run('S.gameplay.mode'),'single-room');assert.equal(h.run('projectData().version'),12);
});
test('World runtime configuration persists through JSON, undo and redo',()=>{
 const h=fresh(),before=h.json('Forge.services.WorldConfig.get()');h.run('Forge.services.WorldConfig.set("moveSpeed",3)');assert.equal(h.run('S.worldRuntime.moveSpeed'),3);
 h.run('undo()');assert.deepEqual(h.json('Forge.services.WorldConfig.get()'),before);h.run('redo();db_deserializeState(db_serializeState())');assert.equal(h.run('S.worldRuntime.moveSpeed'),3);
 assert.deepEqual(h.json('S.worldRuntime'),{...before,moveSpeed:3});
 h.run('Forge.services.WorldConfig.set("bodyWidth",20);Forge.services.WorldConfig.set("bodyHeight",32)');
 assert.deepEqual(h.json('Forge166.placement.body(S.scenes[0].entities[0])'),{x:38,y:176,w:20,h:32});
});
test('Invalid World configuration fields reject atomically without growing undo history',()=>{
 const h=fresh();for(const [field,bad]of [['enabled','true'],['moveSpeed',0],['jumpSpeed',13],['gravity',4],['maxFallSpeed',9],['bodyWidth',13],['bodyHeight',49]]){
  const before=atomicSnapshot(h);h.context.badValue170=bad;assert.throws(()=>h.run('Forge.services.WorldConfig.set('+JSON.stringify(field)+',badValue170)'));assert.deepEqual(atomicSnapshot(h),before);
 }
});
test('World-only metatiles close graphics and collision dependencies without rewriting source authoring',()=>{
 const h=plan(),before=authored(h);h.context.artifact170=h.run('Forge.services.RuntimeCompiler.compile()',20000);assert.deepEqual(authored(h),before);
 const p=h.context.plan170;assert.equal(p.spec.screens.length,3);assert.equal(p.chr.length,8192);assert.deepEqual(Buffer.from(h.context.artifact170.rom.slice(16+32768)),Buffer.from(p.chr));
 assert.notDeepEqual(Array.from(p.spec.screens[0].nt),Array.from(p.spec.screens[1].nt));
 assert.notDeepEqual(Array.from(p.spec.screens[1].nt),Array.from(p.spec.screens[2].nt));
 for(const screen of p.spec.screens){assert.equal(screen.nt.length,1024);assert.equal(screen.collision.length,960);assert.equal(screen.collision[24*32+4],0);assert.equal(screen.collision[25*32+4],1);assert.equal(screen.collision[26*32+4],1);}
});
test('World builds follow reachable World references independently of legacy scene inclusion',()=>{
 const p=worldProject();p.scenes[0].buildInclude=false;const h=built(p);assert.equal(h.context.artifact170.world.spec.screens.length,3);
 const q=worldProject();q.worlds.push({...clone(q.worlds[1]),id:'unreachable',tilesetSceneId:'missing-preserved-source',markers:[]});const other=built(q);assert.equal(other.context.artifact170.world.spec.screens.length,3);assert.equal(other.run('S.worlds.length'),3);
});
test('One World build creates one authoritative artifact and clears stale success after failure',()=>{
 const h=fresh();h.run('window.worldCalls170=0;window.engineCalls170=0;const wp170=Forge.services.WorldCompiler.plan,we170=Forge.services.WorldEngine.compile;Forge.services.WorldCompiler={...Forge.services.WorldCompiler,plan:function(...args){worldCalls170++;return wp170(...args)}};Forge.services.WorldEngine={...Forge.services.WorldEngine,compile:function(...args){engineCalls170++;return we170(...args)}}');
 assert.ok(h.run('buildNesRom()',20000) instanceof Uint8Array);assert.equal(h.run('worldCalls170'),1);assert.equal(h.run('engineCalls170'),1);assert.equal(h.run('Forge.services.RuntimeCompiler.lastArtifact.backend'),'world');
 assert.equal(h.run('window._lastBuiltRom===Forge.services.RuntimeCompiler.lastArtifact.rom'),true);
 h.run('S.worldRuntime.worldId="missing-world"');assert.equal(h.run('buildNesRom()',15000),null);assert.equal(h.run('window._lastBuiltRom'),null);assert.equal(h.run('Forge.services.RuntimeCompiler.lastArtifact'),null);
});
for(const [name,edit,pattern]of [
 ['missing selected world',p=>p.worldRuntime.worldId='missing',/world|missing/i],
 ['missing spawn',p=>p.worldRuntime.spawnId='missing',/spawn|marker|missing/i],
 ['missing selected player',p=>p.worldRuntime.playerId='missing',/player|missing/i],
 ['missing World tileset',p=>p.worlds[0].tilesetSceneId='missing',/scene|tileset|missing/i],
 ['missing World metatile',p=>p.worlds[0].map[0]=254,/metatile|undefined|missing/i],
 ['unsupported World collision',p=>p.scenes[0].metatiles.find(m=>m.id===IDS.solid).collision[0]=2,/collision|solid|unsupported/i],
 ['partial destination link',p=>p.worlds[0].markers[1].targetMarkerId='',/target|link|destination/i],
 ['missing destination marker',p=>p.worlds[0].markers[1].targetMarkerId='missing',/target|marker|destination/i],
 ['exit as destination spawn',p=>p.worlds[0].markers[1].targetMarkerId=IDS.exitB,/spawn|entrance|destination/i],
 ['unreachable solid-overlapping spawn',p=>p.worlds[0].markers[0].y=13,/spawn|solid|body/i],
 ['two action markers in one cell',p=>p.worlds[0].markers.push({...clone(p.worlds[0].markers[1]),id:'duplicate-exit'}),/marker|cell|overlap|duplicate/i],
 ['unaligned room',p=>p.worlds[0].rooms[0].w=31,/align|screen|room/i],
 ['overlapping rooms',p=>p.worlds[0].rooms.push({...clone(p.worlds[0].rooms[0]),id:'overlap-room'}),/overlap|room/i],
 ['unaligned camera',p=>p.worlds[0].cameraRegions[0].w=31,/align|screen|camera/i],
 ['overlapping cameras',p=>p.worlds[0].cameraRegions.push({...clone(p.worlds[0].cameraRegions[0]),id:'overlap-camera'}),/overlap|camera/i],
 ['custom assembly conflict',p=>p.asmSource='.org $8000\nNOP',/assembly|ASM|custom/i],
 ['unsupported mapper',p=>p.mapper=1,/mapper|NROM/i]
])test('Compiler rejects '+name+' without mutating source',()=>rejectsPlan(edit,pattern));
test('All four authored camera modes compile their distinct screen origin and axis rules',()=>{
 const h=fresh(),p=worldProject(),w=p.worlds[0];w.heightScreens=2;w.map=[...w.map,...Array(480).fill(-1)];w.rooms[0].h=30;w.cameraRegions[0].h=30;
 for(const [mode,expected]of [['locked',[0,0,0,0]],['horizontal',[0,1,0,1]],['vertical',[0,0,2,2]],['follow',[0,1,2,3]]]){
  w.cameraRegions[0].mode=mode;h.context.cameraProject170=p;assert.deepEqual(h.json('Forge.services.WorldCompiler.plan(cameraProject170).spec.screens.slice(0,4).map(s=>s.cameraScreen)'),expected,mode);
 }
});
test('Oversized reachable worlds fail explicitly before ROM commit',()=>{
 const p=worldProject(),w=p.worlds[0];w.widthScreens=16;w.heightScreens=16;w.map=Array(16*16*240).fill(-1);w.rooms=[{id:'large-room',name:'Oversized',x:0,y:0,w:256,h:240}];w.cameraRegions=[{id:'large-camera',name:'Oversized',x:0,y:0,w:256,h:240,mode:'follow'}];
 const h=fresh();h.context.large170=p;assert.throws(()=>h.run('Forge.services.WorldCompiler.plan(large170)',20000),/screen|capacity|limit|64|PRG/i);
});

test('Measured screen data overflow fails below the 64-screen profile ceiling',()=>{
 const p=worldProject(),w=p.worlds[0];w.widthScreens=16;w.heightScreens=2;w.map=Array(256*30).fill(-1);w.rooms=[{id:'wide-room',name:'Wide',x:0,y:0,w:256,h:30}];w.cameraRegions=[{id:'wide-camera',name:'Wide',x:0,y:0,w:256,h:30,mode:'follow'}];
 for(let sy=0;sy<2;sy++)for(let sx=0;sx<16;sx++){
  const index=sy*16+sx;for(let bit=0;bit<5;bit++)if(index&(1<<bit))w.map[sy*15*256+sx*16+bit]=IDS.detailA;
  for(let x=0;x<16;x++)for(let y=12;y<15;y++)w.map[(sy*15+y)*256+sx*16+x]=y===12?IDS.surface:IDS.solid;
 }
 const h=fresh();h.context.overfull170=p;assert.throws(()=>h.run('Forge.services.WorldCompiler.plan(overfull170)',20000),/screen resources|code.resource region|exceed|capacity/i);
});

// Actual machine execution, screen boundaries and transition semantics.
test('World ROM boots at authored marker feet with selected actor and balanced 6502 stack',()=>{
 const h=boot();assert.equal(value(h,'worldIndex'),0);assert.equal(value(h,'screenX'),0);assert.equal(value(h,'playerX'),56);assert.equal(value(h,'playerY'),200);assert.equal(value(h,'grounded'),1);
 assert.ok(h.run('new Set(Array.from(emu.frameBuffer)).size')>3);assert.ok(h.run('emu.SP')>=0xf0);const stack=h.run('emu.SP'),tick=ticks(h);frames(h,10,[]);assert.equal(ticks(h)-tick,10);assert.equal(h.run('emu.SP'),stack);assert.equal(h.errors.length,0);
});
test('Walking crosses the 255 boundary into the adjacent World screen without byte wrap or source-room art',()=>{
 const h=boot(),first=digest(h,'emu.bgFrameBuffer');frames(h,104,['ArrowRight']);assert.equal(value(h,'screenX'),1);assert.equal(worldX(h),264);assert.equal(value(h,'playerY'),200);assert.equal(value(h,'grounded'),1);
 frames(h,2,[]);assert.notEqual(digest(h,'emu.bgFrameBuffer'),first);frames(h,8,['ArrowLeft']);assert.equal(value(h,'screenX'),0);assert.equal(worldX(h),248);assert.equal(value(h,'grounded'),1);
});
test('Locked camera holds its authored screen while off-camera physics advances without sprite wrapping',()=>{
 const p=worldProject();p.worlds[0].cameraRegions[0].mode='locked';const h=boot(p),first=digest(h,'emu.bgFrameBuffer');
 frames(h,104,['ArrowRight']);frames(h,2,[]);assert.equal(value(h,'screen'),1);assert.equal(worldX(h),264);assert.equal(value(h,'cameraScreen'),0);assert.equal(value(h,'renderedScreen'),0);
 assert.equal(digest(h,'emu.bgFrameBuffer'),first);assert.ok(h.json('Array.from(emu.oamMem)').every(v=>v===255));
 frames(h,8,['ArrowLeft']);frames(h,2,[]);assert.equal(value(h,'screen'),0);assert.ok(h.json('Array.from(emu.oamMem)').some(v=>v!==255));
});
test('Adjacent screen wall blocks the full straddling body before its center crosses',()=>{
 const h=boot(worldProject({spawnCellA:15,wallCell:16,physics:{moveSpeed:4}}));assert.equal(worldX(h),248);frames(h,8,['ArrowRight']);assert.equal(worldX(h),250);assert.equal(value(h,'screenX'),0);assert.equal(value(h,'playerY'),200);frames(h,2,['ArrowLeft']);assert.equal(worldX(h),242);
});
test('World outer edges clamp a two-pixel body without wrapping to another screen or world',()=>{
 const h=boot(worldProject({physics:{bodyWidth:2,moveSpeed:4}}));frames(h,18,['ArrowLeft']);assert.equal(worldX(h),1);frames(h,140,['ArrowRight']);assert.equal(worldX(h),511);assert.equal(value(h,'worldIndex'),0);assert.equal(value(h,'playerY'),200);
});
test('Jump crosses a screen boundary, lands on neighboring collision and requires a fresh A edge',()=>{
 const h=boot(worldProject({spawnCellA:15}));frames(h,8,['ArrowRight','KeyZ']);assert.equal(value(h,'screenX'),1);assert.ok(value(h,'playerY')<200);assert.equal(value(h,'grounded'),0);
 keys(h,['KeyZ']);until(h,s=>s.grounded===1,60);assert.equal(value(h,'playerY'),200);frames(h,10);assert.equal(value(h,'playerY'),200);frames(h,1,[]);frames(h,1,['KeyZ']);assert.ok(value(h,'playerY')<200);
});
test('Vertical traversal falls to the next screen and jumps back with correct collision and camera state',()=>{
 const p=worldProject(),w=p.worlds[0];w.widthScreens=1;w.heightScreens=2;w.map=Array(16*30).fill(-1);w.rooms=[{id:'vertical-room',name:'Vertical room',x:0,y:0,w:16,h:30}];w.cameraRegions=[{id:'vertical-camera',name:'Follow camera',x:0,y:0,w:16,h:30,mode:'follow'}];w.markers[0].y=14;w.markers[1].x=8;w.markers[1].y=16;
 for(let x=0;x<16;x++)for(let y=16;y<30;y++)w.map[y*16+x]=y===16?IDS.surface:IDS.solid;
 const h=boot(p);until(h,s=>s.grounded===1,30);assert.equal(value(h,'screenY'),1);assert.equal(value(h,'playerY'),24);assert.equal(value(h,'cameraScreen'),1);assert.equal(value(h,'playerX'),56);
 frames(h,4,['KeyZ']);assert.equal(value(h,'screenY'),0);assert.ok(value(h,'playerY')<240);assert.equal(value(h,'cameraScreen'),0);assert.equal(value(h,'grounded'),0);frames(h,2,[]);assert.ok(h.json('Array.from(emu.oamMem)').some(v=>v!==255));
 until(h,s=>s.grounded===1,40);assert.equal(value(h,'screenY'),1);assert.equal(value(h,'playerY'),24);assert.equal(value(h,'worldIndex'),0);assert.equal(value(h,'playerX'),56);
});
test('Opposed directions hold facing; directional movement follows authored walk frame timing',()=>{
 const h=boot(),walk=worldProject().animations.find(a=>a.id==='walk');frames(h,1,['ArrowRight']);const observed=[];for(let i=0;i<walk.frames.reduce((n,f)=>n+f.duration,0);i++){observed.push(value(h,'playerFrame'));frames(h);}
 assert.deepEqual(observed,walk.frames.flatMap((f,index)=>Array(f.duration).fill(index)));assert.equal(value(h,'playerFacing'),0);
 frames(h,1,['ArrowLeft']);const x=worldX(h);assert.equal(value(h,'playerFacing'),1);frames(h,4,['ArrowLeft','ArrowRight']);assert.equal(worldX(h),x);assert.equal(value(h,'playerFacing'),1);frames(h,2,[]);assert.equal(value(h,'playerState'),0);
});
test('Facing mirrors actual hardware sprite positions and pixels around the feet origin',()=>{
 const h=boot(),pieceCount=h.context.artifact170.world.spec.player.animations.idle.frames[0].pieces.length;
 frames(h,2,[]);const right=h.json('Array.from(emu.oamMem.slice(0,'+(pieceCount*4)+'))'),rx=value(h,'playerX');
 frames(h,1,['ArrowLeft']);frames(h,2,[]);const left=h.json('Array.from(emu.oamMem.slice(0,'+(pieceCount*4)+'))'),lx=value(h,'playerX');
 for(let i=0;i<pieceCount;i++){assert.equal(left[i*4],right[i*4]);assert.equal(left[i*4+1],right[i*4+1]);assert.equal((left[i*4+2]^right[i*4+2])&64,64);assert.equal(left[i*4+3]-lx,-(right[i*4+3]-rx)-8);}
});
test('Bound attack follows authored frame duration and a held B button does not retrigger',()=>{
 const h=boot(),attack=worldProject().animations.find(a=>a.id==='attack');frames(h,1,['KeyX']);const indices=[];
 for(let i=0;i<attack.frames.reduce((n,f)=>n+f.duration,0);i++){assert.equal(value(h,'playerState'),3);indices.push(value(h,'playerFrame'));frames(h);}
 assert.deepEqual(indices,attack.frames.flatMap((f,index)=>Array(f.duration).fill(index)));frames(h,12,['KeyX']);assert.equal(value(h,'playerState'),0);frames(h,1,[]);frames(h,1,['KeyX']);assert.equal(value(h,'playerState'),3);
});
test('Up edge resolves exact destination and held Up cannot bounce through a reciprocal exit',()=>{
 const h=boot();frames(h,176,['ArrowRight']);assert.equal(worldX(h),408);frames(h,1,[]);frames(h,1,['ArrowUp']);
 assert.equal(value(h,'worldIndex'),1);assert.equal(value(h,'screenX'),0);assert.equal(value(h,'playerX'),72);assert.equal(value(h,'playerY'),200);assert.equal(value(h,'velocityY'),0);assert.equal(value(h,'grounded'),1);
 frames(h,12,['ArrowUp']);assert.equal(value(h,'worldIndex'),1);frames(h,1,[]);frames(h,1,['ArrowUp']);assert.equal(value(h,'worldIndex'),0);assert.equal(worldX(h),56);assert.equal(value(h,'playerY'),200);
});
test('Up uses the lower body pixel in the marker cell above a full-metatile floor',()=>{
 const p=worldProject({spawnCellA:25}),w=p.worlds[0];for(let x=0;x<32;x++)w.map[12*32+x]=-1;
 const h=boot(p);assert.equal(value(h,'worldIndex'),0);assert.equal(worldX(h),408);assert.equal(value(h,'playerY'),208);assert.equal(value(h,'grounded'),1);
 frames(h,1,['ArrowUp']);assert.equal(value(h,'worldIndex'),1);assert.equal(value(h,'playerX'),72);assert.equal(value(h,'playerY'),200);assert.equal(value(h,'grounded'),1);
});
test('Start resets World, screen, position and motion to configured initial spawn',()=>{
 const h=boot();frames(h,176,['ArrowRight']);frames(h,1,['ArrowUp']);assert.equal(value(h,'worldIndex'),1);frames(h,6,['ArrowRight','KeyZ']);frames(h,1,['Enter']);assert.equal(value(h,'worldIndex'),0);assert.equal(value(h,'screenX'),0);assert.equal(value(h,'playerX'),56);assert.equal(value(h,'playerY'),200);assert.equal(value(h,'velocityY'),0);assert.equal(value(h,'playerState'),0);
});
test('Ordinary World updates stay within an NTSC frame across maximum-physics body alignments',()=>{
 const h=boot(worldProject({physics:{moveSpeed:4,jumpSpeed:12,gravity:1,maxFallSpeed:8,bodyWidth:32,bodyHeight:48}}));let worst=0;
 // All 64 pixel residues exercise the extra edge row/column needed when the
 // largest body is misaligned. This executes emitted machine instructions.
 for(let xr=0;xr<8;xr++)for(let yr=0;yr<8;yr++){
  h.context.xResidue170=xr;h.context.yResidue170=yr;
  h.run('clearEmuKeys();emuKeys.ArrowRight=true;emuKeys.KeyZ=true;emuKeys.KeyX=true;emu.ram[sy170.playerX]=136+xResidue170;emu.ram[sy170.playerY]=200-yResidue170;emu.ram[sy170.previousButtons]=0;emu.ram[sy170.playerState]=0;emu.ram[sy170.grounded]=1;emu.ram[sy170.velocityY]=0;emu.ram[sy170.frameReady]=1;emu.PC=sy170.labels.main');
  const before=h.run('emu.cycles');h.run('cpuStep()');settle(h);worst=Math.max(worst,h.run('emu.cycles')-before);assert.equal(value(h,'playerY'),188-yr);
 }
 h.run('emu.A=90;emu.X=51;emu.Y=204;emu.ram[sy170.oamReady]=1');const registers=h.json('({A:emu.A,X:emu.X,Y:emu.Y,SP:emu.SP,P:cpuGetP()})'),nmiStart=h.run('emu.cycles');
 h.run('cpuNmi();for(let nmiSteps170=0;emu.PC!==sy170.labels.main;nmiSteps170++){if(nmiSteps170>1000)throw Error("NMI did not return");cpuStep()}');
 assert.deepEqual(h.json('({A:emu.A,X:emu.X,Y:emu.Y,SP:emu.SP,P:cpuGetP()})'),registers);const nmiCycles=h.run('emu.cycles')-nmiStart;
 metrics.worstOrdinaryMainCycles=worst;metrics.actualNmiCycles=nmiCycles;metrics.ntscFrameCycles=29780;metrics.physicsAlignments=64;
 assert.ok(nmiCycles<1200);assert.ok(worst+1200<29780,'Main '+worst+' cycles + NMI allowance exceeds one frame');assert.ok(h.run('emu.SP')>=0xf0);
});
test('Maximum body corner queries and 24 visible pieces complete within one NTSC frame',()=>{
 const p=worldProject({physics:{moveSpeed:4,jumpSpeed:12,gravity:1,maxFallSpeed:8,bodyWidth:32,bodyHeight:48}}),w=p.worlds[0];
 w.widthScreens=3;w.heightScreens=3;w.map=Array(48*45).fill(-1);w.rooms=[{id:'corner-room',name:'Corner stress room',x:0,y:0,w:48,h:45}];w.cameraRegions=[{id:'corner-camera',name:'Corner stress camera',x:0,y:0,w:48,h:45,mode:'follow'}];w.markers=[marker(IDS.spawnA,'spawn',16,15)];
 for(const m of p.metasprites){const base=clone(m.pieces[0]);m.originX=0;m.originY=0;m.spriteMode=8;m.pieces=Array.from({length:24},(_,i)=>({...base,id:m.id+'-stress-'+i,x:-8-(i%4)*8,y:Math.floor(i/4)*8}));}
 const h=boot(p);h.run('clearEmuKeys();emuKeys.ArrowLeft=true;emuKeys.KeyZ=true;emuKeys.KeyX=true;emu.ram[sy170.screen]=4;emu.ram[sy170.playerX]=5;emu.ram[sy170.playerY]=13;emu.ram[sy170.previousButtons]=0;emu.ram[sy170.playerState]=0;emu.ram[sy170.grounded]=1;emu.ram[sy170.velocityY]=0;emu.ram[sy170.frameReady]=1;emu.PC=sy170.labels.main');
 const start=h.run('emu.cycles');h.run('cpuStep()');settle(h);const cycles=h.run('emu.cycles')-start;
 assert.equal(value(h,'screen'),4);assert.equal(value(h,'playerX'),1);assert.equal(value(h,'playerY'),1);assert.equal(value(h,'oamIndex'),96);assert.ok(h.json('Array.from(emu.ram.slice(0x200,0x260))').every((v,i)=>i%4!==0||v!==255));
 metrics.cornerMainCycles=cycles;metrics.cornerVisiblePieces=24;assert.ok(cycles+1200<29780,'Corner main '+cycles+' cycles + NMI allowance exceeds one frame');
});
test('Dense marker lookup is bounded with maximum physics and guards the zero-Y table boundary',()=>{
 // Full compiler fixture with 239 distinct action cells on the center screen.
 // Cell zero is intentionally empty; the final cell uses the final record.
 const p=worldProject({physics:{moveSpeed:4,jumpSpeed:12,gravity:1,maxFallSpeed:8,bodyWidth:32,bodyHeight:48}}),w=p.worlds[0];
 w.widthScreens=3;w.heightScreens=3;w.map=Array(48*45).fill(-1);w.rooms=[{id:'dense-room',name:'Dense marker room',x:0,y:0,w:48,h:45}];w.cameraRegions=[{id:'dense-camera',name:'Dense marker camera',x:0,y:0,w:48,h:45,mode:'follow'}];
 w.markers=[marker(IDS.spawnA,'spawn',16,15),...Array.from({length:239},(_,i)=>{const cell=i+1;return marker('dense-'+cell,'exit',16+(cell%16),15+Math.floor(cell/16),IDS.worldA,IDS.spawnA);})];
 for(const m of p.metasprites){const base=clone(m.pieces[0]);m.originX=0;m.originY=0;m.spriteMode=8;m.pieces=Array.from({length:24},(_,i)=>({...base,id:m.id+'-dense-'+i,x:-8-(i%4)*8,y:Math.floor(i/4)*8}));}
 const h=boot(p);assert.equal(h.context.artifact170.world.spec.screens[4].markers.length,239);
 function updateAt(x,y,names){h.context.denseX170=x;h.context.denseY170=y;keys(h,names);h.run('emu.ram[sy170.screen]=4;emu.ram[sy170.playerX]=denseX170;emu.ram[sy170.playerY]=denseY170;emu.ram[sy170.previousButtons]=0;emu.ram[sy170.playerState]=0;emu.ram[sy170.grounded]=1;emu.ram[sy170.velocityY]=0;emu.ram[sy170.frameReady]=1;emu.PC=sy170.labels.main');const start=h.run('emu.cycles');h.run('cpuStep()');settle(h);return h.run('emu.cycles')-start;}
 const cycles=updateAt(5,13,['ArrowUp','ArrowLeft','KeyZ','KeyX']);
 assert.equal(value(h,'screen'),4);assert.equal(value(h,'playerX'),1);assert.equal(value(h,'playerY'),1);assert.equal(value(h,'playerState'),3);assert.equal(value(h,'oamIndex'),96);assert.equal(value(h,'buttons')&0x53,0x53);assert.equal(value(h,'edges')&0x53,0x53);
 assert.ok(cycles+1200<29780,'Dense-marker corner main '+cycles+' cycles + NMI allowance exceeds one frame');
 const lastCycles=updateAt(248,233,['ArrowUp']);assert.equal(value(h,'screen'),4);assert.equal(value(h,'playerX'),8);assert.equal(value(h,'playerY'),8);assert.equal(value(h,'previousButtons'),16);assert.ok(lastCycles+1200<29780);
 const boundaryCycles=updateAt(5,0,['ArrowUp']);assert.equal(value(h,'screen'),4);assert.equal(value(h,'playerX'),5);assert.equal(value(h,'playerY'),0);assert.equal(value(h,'edges'),16);assert.ok(boundaryCycles+1200<29780);
 assert.equal(h.run('emu.opsMissed'),0);metrics.denseMarkerCount=239;metrics.denseMarkerWorstMainCycles=cycles;metrics.denseMarkerLastCellCycles=lastCycles;metrics.denseMarkerZeroYCycles=boundaryCycles;
});
test('Runtime PPU writes occur during forced blank or vblank, with no missed opcodes across transitions',()=>{
 const h=boot();h.run('window.ppuWrites170=[];const write170=cpuWrite;cpuWrite=function(address,value){const reg=address>=0x2000&&address<0x4000?(address&7):-1;if(reg===5||reg===6||reg===7)ppuWrites170.push({reg,mask:emu.ppuMask,cycle:emu.cycles});return write170(address,value)}');
 frames(h,176,['ArrowRight']);frames(h,1,['ArrowUp']);frames(h,2,[]);frames(h,1,['ArrowUp']);frames(h,5,[]);
 const writes=h.json('ppuWrites170');assert.ok(writes.some(w=>w.reg===7),'Transition must upload authored screen data');
 const frameCycles=262*341/3,vblankStart=241*341/3;
 for(const w of writes)if(w.mask&24){const phase=w.cycle%frameCycles;assert.ok(phase>=vblankStart&&phase<frameCycles,'Rendering-active PPU register '+w.reg+' write at cycle phase '+phase);}
 assert.equal(h.run('emu.opsMissed'),0);assert.ok(h.run('emu.SP')>=0xf0);metrics.ppuWriteCount=writes.length;
});

// Versioned authoring reconstruction and atomic rejection against real 1.6.7.
test('World layout4 ROM preserves full source through inspect and Open Forge ROM',()=>{
 const h=defaultBuild();h.context.inspect170=h.run('Forge.services.WorldRom.inspect(rom170)',20000);const info=h.context.inspect170;
 assert.deepEqual(clone(info.source),clone(h.context.artifact170.plan.source));assert.equal(info.source.version,12);assert.deepEqual(clone(info.source.worlds),h.json('S.worlds'));assert.deepEqual(clone(info.source.worldRuntime),h.json('S.worldRuntime'));assert.deepEqual(clone(info.source.scenes),h.json('S.scenes'));
 assert.equal(h.run('Forge166.project.classifyRom(rom170).captureOnly',20000),false);
 const opened=fresh();opened.context.reopen170=h.context.rom170;const beforeAppend=atomicSnapshot(opened);assert.equal(opened.run('importRom(reopen170,"World roundtrip.nes")',20000),false);assert.deepEqual(atomicSnapshot(opened),beforeAppend);assert.match(opened.errors.at(-1),/Open Forge ROM|append/i);assert.equal(opened.run('Forge166.project.openRom(reopen170,"World roundtrip.nes")',20000),true);
 assert.deepEqual(authored(opened),authored(h));assert.deepEqual(opened.json('Array.from(S.importedRom)'),Array.from(h.context.rom170));
});
test('World ROM payload, header, code, CHR, version and truncation errors reject before project/runtime mutation',()=>{
 const valid=defaultBuild().context.rom170,h=boot();h.run('snapshot();S.worlds[0].name="Unsaved name";notify("worldCodecTest");emuToggleRun()');
 const markerOffset=16+0x4ff0,recordCPU=valid[markerOffset+10]|valid[markerOffset+11]<<8,recordOffset=16+recordCPU-0x8000;
 assert.equal(Buffer.from(valid.slice(recordOffset,recordOffset+4)).toString(),'WG17');
 const variants=[['header',recordOffset+8],['payload',recordOffset+64],['engine',16+8],['CHR',16+32768+1],['version',recordOffset+4],['layout',markerOffset+8]];
 const bads=variants.map(([name,offset])=>{const bytes=new Uint8Array(valid);bytes[offset]^=1;return[name,bytes];});
 bads.push(['truncated header',valid.slice(0,15)],['truncated PRG',valid.slice(0,1000)],['truncated CHR',valid.slice(0,-1)]);
 for(const [name,bytes]of bads){h.context.badRom170=bytes;const before=atomicSnapshot(h);assert.throws(()=>h.run('Forge166.project.classifyRom(badRom170)',20000),undefined,name);assert.deepEqual(atomicSnapshot(h),before,name+' classify');assert.throws(()=>h.run('Forge166.project.openRom(badRom170,"Bad.nes")',20000),undefined,name);assert.deepEqual(atomicSnapshot(h),before,name+' open');assert.equal(h.run('importRom(badRom170,"Bad.nes")',20000),false,name);assert.deepEqual(atomicSnapshot(h),before,name+' append');}
});
test('Actual frozen 1.6.7 rejects schema10 and layout4 atomically',()=>{
 const h=loadForge(baseline),old=require('./fixtures/scout166.json');h.context.old170=old;h.run('db_deserializeState(old170);window._buildAndRunMode=true;window.oldRom170=buildNesRom();emuLoadRomData(oldRom170,"Active baseline",2);emuToggleRun();snapshot();S.projectName="Unsaved baseline";notify("baselineCompatibility")',20000);
 const before=atomicSnapshot(h);h.context.futureProject170=worldProject();assert.throws(()=>h.run('db_deserializeState(futureProject170)'),/newer|version|schema/i);assert.deepEqual(atomicSnapshot(h),before);
 h.context.futureRom170=defaultBuild().context.rom170;assert.throws(()=>h.run('Forge166.project.classifyRom(futureRom170)'),/layout|unsupported/i);assert.deepEqual(atomicSnapshot(h),before);assert.throws(()=>h.run('Forge166.project.openRom(futureRom170,"Future.nes")'),/layout|unsupported/i);assert.deepEqual(atomicSnapshot(h),before);assert.equal(h.run('importRom(futureRom170,"Future.nes")'),false);assert.deepEqual(atomicSnapshot(h),before);
});

(async()=>{const results=[];for(const {name,fn}of tests.filter(t=>!process.env.FORGE_TEST_FILTER||new RegExp(process.env.FORGE_TEST_FILTER,'i').test(t.name))){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}
 const finalHtmlSha256=crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');if(!filtered&&finalHtmlSha256!==htmlSha256)results.push({name:'Candidate HTML remained unchanged during the full suite',passed:false,error:'Candidate HTML changed from '+htmlSha256+' to '+finalHtmlSha256+'; rerun against a frozen bundle.'});
 const passed=results.filter(r=>r.passed).length,report={suite:'world-runtime170',html:path.basename(html),htmlSha256,filtered,scope:'World configuration/compiler/ROM compatibility contracts plus actual generated 6502 execution in the bundled emulator. External original Scout authoring fixture; no JS physics substitute. Mock DOM; native browser acceptance and hardware-perfect PPU timing not implied.',passed,failed:results.length-passed,total:results.length,metrics,results};
 if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;
})();
