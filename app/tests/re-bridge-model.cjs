#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const fixture=path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes');
const tests=[],test=(name,fn)=>tests.push({name,fn}),copy=value=>JSON.parse(JSON.stringify(value));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),at=cpu=>16+cpu-0x8000;
function fresh(environment={}){const h=loadForge(html,{environment:{crypto:crypto.webcrypto,...environment}});assert.deepEqual(h.errors,[]);assert.ok(h.context.Forge.services.REBridge,'Candidate must include actual RE bridge');h.bridge=h.context.Forge.services.REBridge;return h;}
const bytes=()=>new Uint8Array(fs.readFileSync(fixture));
function guard(h){return {project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes,identity:S.projectId,epoch:Forge.services.ProjectStore.state.epoch})'),emu:h.json('({loaded:emu.loaded,running:emu.running,frame:emu.frameCount,PC:emu.PC})'),rom:h.run('emu.lastBuiltRom')};}
function unchanged(h,before){assert.equal(h.run('Forge.services.ProjectStore.serialize()'),before.project);assert.deepEqual(h.json('({undo:undoStack,redo:redoStack,undoBytes,identity:S.projectId,epoch:Forge.services.ProjectStore.state.epoch})'),before.history);assert.deepEqual(h.json('({loaded:emu.loaded,running:emu.running,frame:emu.frameCount,PC:emu.PC})'),before.emu);assert.equal(h.run('emu.lastBuiltRom'),before.rom);}
function collision(scene){const result=Array.from(scene.nt,tile=>scene.tileProps[tile]),defs=new Map(scene.metatiles.map(m=>[m.id,m]));for(let cell=0;cell<240;cell++){const id=scene.metaMap[cell];if(id<0)continue;const col=(cell%16)*2,row=Math.floor(cell/16)*2;for(let q=0;q<4;q++)result[(row+(q>>1))*32+col+(q&1)]=defs.get(id).collision[q];}return result;}
async function rejected(h,mutation,pattern){const rom=bytes();const input=mutation(rom)||rom,before=guard(h);await assert.rejects(h.bridge.analyze(input,'rejected.nes'),pattern);unchanged(h,before);}

test('Recognized native ROM produces immutable evidence without touching active project, playback or history',async()=>{
 const h=fresh(),before=guard(h),source=bytes(),analysis=await h.bridge.analyze(source,'Bridge_Room.nes');unchanged(h,before);
 assert.equal(analysis.report.format,'NESForgeRERecovery');assert.equal(analysis.report.version,1);assert.equal(analysis.report.source.sha256,digest(source));assert.equal(analysis.report.source.byteLength,40976);assert.equal(analysis.report.engine.verified,true);assert.equal(analysis.report.recovered.collisionCells,960);assert.equal(analysis.report.recovered.chrTiles,512);
 assert.ok(Object.isFrozen(analysis)&&Object.isFrozen(analysis.report)&&Object.isFrozen(analysis.report.evidence[0]));assert.ok(analysis.report.evidence.every(item=>item.sourceSha256===digest(source)));assert.equal(h.bridge.supportedProfile().id,analysis.report.profileId);
});
test('ROM snapshot is copied before async hashing and exported projects are isolated',async()=>{
 const h=fresh(),source=bytes(),expected=digest(source),pending=h.bridge.analyze(source,'race.nes');source.fill(0);const analysis=await pending;
 assert.equal(analysis.report.source.sha256,expected);const first=analysis.exportProject();first.scenes[0].nt[0]=99;first.patterns[0].rows[0][0].note=0;first.importedRom='';const second=analysis.exportProject();assert.notEqual(second.scenes[0].nt[0],99);assert.notEqual(second.patterns[0].rows[0][0].note,0);assert.equal(digest(Buffer.from(second.importedRom,'base64')),expected);
});
test('Recovery reads all native nametable, attributes, palettes and planar CHR bytes exactly',async()=>{
 const h=fresh(),source=bytes(),p=(await h.bridge.analyze(source,'Bridge_Room.nes')).exportProject(),s=p.scenes[0];
 assert.deepEqual(copy(s.nt),Array.from(source.slice(at(0xb000),at(0xb000)+960)));assert.deepEqual(copy(s.attr),Array.from(source.slice(at(0xb3c0),at(0xb3c0)+64)));assert.deepEqual(copy(s.pal.flat()),Array.from(source.slice(at(0xd000),at(0xd000)+16)));assert.deepEqual(copy(s.sprPal.flat()),Array.from(source.slice(at(0xd010),at(0xd010)+16)));
 for(const [tiles,start]of[[s.chr,32784],[s.sprChr,36880]])for(let tile=0;tile<256;tile++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.equal(tiles[tile][y][x],((source[start+tile*16+y]>>(7-x))&1)|(((source[start+tile*16+y+8]>>(7-x))&1)<<1));
});
test('Native cell collision is exact and uniform tiles remain editable through ordinary tile properties',async()=>{
 const h=fresh(),source=bytes(),analysis=await h.bridge.analyze(source),p=analysis.exportProject(),s=p.scenes[0];assert.deepEqual(collision(s),Array.from(source.slice(at(0xc000),at(0xc000)+960)));assert.equal(analysis.report.recovered.collisionMode,'tile-properties');assert.equal(analysis.report.recovered.linkedCollisionCells,0);assert.ok(s.metaMap.every(id=>id===-1));
 const solidTile=s.nt.find((tile,index)=>source[at(0xc000)+index]===1);assert.equal(s.tileProps[solidTile],1);s.tileProps[solidTile]=0;assert.ok(collision(s).every((value,index)=>s.nt[index]!==solidTile||value===0));
});
test('Identical tile art with different native collision gets exact cell overrides without invented global meaning',async()=>{
 const h=fresh(),source=bytes();source[at(0xc000)]=1;const analysis=await h.bridge.analyze(source),p=analysis.exportProject(),s=p.scenes[0];assert.deepEqual(collision(s),Array.from(source.slice(at(0xc000),at(0xc000)+960)));assert.equal(analysis.report.recovered.collisionMode,'tile-properties-with-cell-overrides');assert.ok(analysis.report.recovered.linkedCollisionCells>0);assert.equal(collision(s)[0],1);assert.equal(collision(s)[1],0);
 h.context.Forge.services.ProjectStore.prepareLoad(p);assert.ok(s.metaMap.every(id=>id<0||s.metatiles.some(def=>def.id===id)));
});
test('Pulse timers map exactly to canonical notes, constant instrument and frame duration without invented SFX',async()=>{
 const h=fresh(),source=bytes(),analysis=await h.bridge.analyze(source),p=analysis.exportProject(),plan=h.context.Forge.services.AudioCompiler.plan(p);
 assert.equal(p.tempo,150);assert.equal(p.speed,source[at(0xd031)]);assert.equal(p.audRows,16);assert.equal(plan.musicEnabled,true);assert.equal(plan.instruments[0].duty,2);assert.deepEqual(copy(plan.instruments[0].volume),[12]);assert.deepEqual(copy(p.sfx),[]);assert.equal(p.gameplayCore.enabled,false);
 for(let row=0;row<16;row++){const native=source[at(0xd100)+row*2]|(source[at(0xd100)+row*2+1]<<8),note=p.patterns[0].rows[row][0].note;assert.equal(plan.noteTimers[note],native);assert.equal(analysis.report.audio.timers[row],native);assert.equal(Math.round(plan.instruments[0].volume[0]*p.patterns[0].rows[row][0].vol/15),12);assert.ok(p.patterns[0].rows[row].slice(1).every(cell=>cell.note===-1));}
 assert.match(analysis.report.limitations.join(' '),/Original gameplay code is not recovered/);
});
test('Unsupported cartridge headers, sizes and extensions reject atomically',async()=>{
 const h=fresh();for(const mutation of[b=>b.slice(0,15),b=>{b[0]=0;},b=>{b[7]=8;},b=>{b[6]=1;},b=>{b[6]=4;},b=>{b[4]=1;},b=>{b[10]=1;},b=>b.slice(0,-1),b=>new Uint8Array([...b,0])])await rejected(h,mutation,/RE recovery:/);
});
test('Unknown code fingerprint and changed interrupt vectors never create a recovery project',async()=>{
 const h=fresh();await rejected(h,b=>{b[16]^=1;},/Unsupported engine fingerprint/);await rejected(h,b=>{b[at(0xfffa)]^=1;},/vectors differ/);
});
test('Malformed collision and lossy palette values reject rather than normalize into plausible data',async()=>{
 const h=fresh();await rejected(h,b=>{b[at(0xc000)]=2;},/collision map.*unsupported/);await rejected(h,b=>{b[at(0xd001)]=64;},/Palette color/);await rejected(h,b=>{b[at(0xd004)]=32;},/background aliases differ/);
});
test('Unsupported body geometry and solid spawn fail before mutation',async()=>{
 const h=fresh();await rejected(h,b=>{b[at(0xd022)]=7;},/width must be even/);await rejected(h,b=>{b[at(0xd021)]=200;},/feet at Y=208/);await rejected(h,b=>{b[at(0xd020)]=0;},/outside/);await rejected(h,b=>{b[at(0xc000)+25*32+4]=1;},/spawn overlaps/);await rejected(h,b=>{b[at(0xd024)]=0;},/Move speed/);
});
test('Unsupported and ambiguous pulse timers reject instead of guessing a pitch',async()=>{
 const h=fresh();await rejected(h,b=>{b[at(0xd100)]=0;b[at(0xd101)]=0;},/unsupported timer/);await rejected(h,b=>{b[at(0xd100)]=255;b[at(0xd101)]=7;},/ambiguous timer/);
});
test('Unsupported audio count, duration, envelope and sweep reject atomically',async()=>{
 const h=fresh();await rejected(h,b=>{b[at(0xd030)]=17;},/exactly 16/);await rejected(h,b=>{b[at(0xd031)]=0;},/Frames per music row/);await rejected(h,b=>{b[at(0xd032)]=0;},/envelope or sweep/);await rejected(h,b=>{b[at(0xd033)]=0;},/envelope or sweep/);
});
test('Successful import is an undoable replacement with byte-identical original and validated native project',async()=>{
 const h=fresh(),source=bytes(),before=guard(h),analysis=await h.bridge.analyze(source,'Bridge_Room.nes');assert.equal(h.bridge.importProject(analysis),true);assert.equal(h.run('S.projectId'),null);assert.equal(h.run('undoStack.length'),before.history.undo.length+1);assert.equal(h.run('S.gameplay.mode'),'single-room');assert.equal(digest(h.run('S.importedRom')),digest(source));assert.equal(h.run('S.asmSource'),'');assert.equal(h.run('S.gameplayCore.enabled'),false);
 const saved=h.run('Forge.services.ProjectStore.serialize()');assert.equal(JSON.parse(saved).format,'NESForge');h.context.Forge.services.ProjectStore.prepareLoad(saved);h.run('undo()');assert.equal(h.run('Forge.services.ProjectStore.serialize()'),before.project);
});
test('Ordinary JSON save/reload preserves native assets, exact collision, music and original ROM',async()=>{
 const h=fresh(),source=bytes(),analysis=await h.bridge.analyze(source);h.bridge.importProject(analysis);const saved=h.run('Forge.services.ProjectStore.serialize()'),p=JSON.parse(saved);assert.equal(p.version,13);assert.equal(p.recoveryReport,undefined);assert.equal(p.format,'NESForge');h.context.Forge.services.ProjectStore.load(saved);const reloaded=JSON.parse(h.run('Forge.services.ProjectStore.serialize()'));
 assert.deepEqual(collision(reloaded.scenes[0]),Array.from(source.slice(at(0xc000),at(0xc000)+960)));assert.deepEqual(reloaded.patterns,p.patterns);assert.deepEqual(reloaded.instruments,p.instruments);assert.deepEqual(reloaded.scenes[0].chr,p.scenes[0].chr);assert.equal(digest(Buffer.from(reloaded.importedRom,'base64')),digest(source));assert.equal(reloaded.gameplay.playerId,'re-player-v1');
});
test('Forged stages and unavailable hashing reject with active state intact',async()=>{
 const h=fresh(),before=guard(h);assert.throws(()=>h.bridge.importProject({report:{},exportProject:()=>({})}),/successful analysis/);unchanged(h,before);const unavailable=fresh({crypto:undefined}),prior=guard(unavailable);await assert.rejects(unavailable.bridge.analyze(bytes()),/SHA-256 is unavailable/);unchanged(unavailable,prior);
});
test('Shared-memory inputs reject before hashing instead of claiming a coherent immutable snapshot',async()=>{
 const h=fresh({SharedArrayBuffer}),before=guard(h),shared=new Uint8Array(new SharedArrayBuffer(40976));shared.set(bytes());await assert.rejects(h.bridge.analyze(shared),/Shared memory input is unsupported/);unchanged(h,before);
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}const passed=results.filter(result=>result.passed).length,report={suite:'re-bridge-model',html:path.basename(html),htmlSha256:digest(fs.readFileSync(html)),scope:'Actual bundled decoder, ProjectStore and compiler model in inherited mock DOM. Real browser/device acceptance is separate.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})().catch(error=>{console.error(error);process.exitCode=1;});
