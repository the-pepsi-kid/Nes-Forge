#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadForge}=require('./harness.cjs'),{gameplayProject}=require('./gameplay165.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const tests=[],test=(name,fn)=>tests.push({name,fn}),cp=x=>JSON.parse(JSON.stringify(x));
function fresh(p=gameplayProject()){const h=loadForge(html);h.context.fixture=p;h.run('db_deserializeState(fixture);window._buildAndRunMode=true');assert.equal(h.errors.length,0,h.errors.join('; '));return h;}
function build(h){h.context.rom=h.run('buildNesRom()',10000);assert.ok(h.context.rom instanceof Uint8Array,h.errors.join('; '));return h.context.rom;}
function unchangedImport(h,rom){const before=h.json('projectData()'),depth=h.run('undoStack.length');h.context.badRom=rom;assert.equal(h.run('importRom(badRom,"Invalid gameplay.nes")',20000),false);assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),depth);}
function recordRom(h,changes){const rom=build(h).slice(),record=h.json('Forge165.readGameplayRom(rom)');Object.assign(record,changes);const payload=new TextEncoder().encode(JSON.stringify(record));h.context.payload=payload;const checksum=h.run('zipCRC(payload)'),at=16+0x3800;rom.fill(0,at,at+0x800);rom.set([71,80,49,54,1],at);const view=new DataView(rom.buffer);view.setUint32(at+5,payload.length,true);view.setUint32(at+9,checksum,true);rom.set(payload,at+13);return rom;}

test('v8 portable ZIP preserves complete gameplay configuration and manifest',async()=>{
  const h=fresh(),before=h.json('projectData()');h.run('window.blob=buildZip([{name:"project.json",data:new TextEncoder().encode(db_serializeState())}])');h.context.zip=new Uint8Array(await h.run('blob.arrayBuffer()'));
  assert.deepEqual(h.json('JSON.parse(new TextDecoder().decode(parseZip(zip)["gameplay.json"].bytes)).gameplay'),before.gameplay);
  h.run('Forge165.config.set("mode","viewer")');assert.equal(await h.run('loadZipPack(zip)',15000),true);assert.deepEqual(h.json('projectData().gameplay'),before.gameplay);
  for(const key of ['scenes','animations','metasprites'])assert.deepEqual(h.json('projectData().'+key),before[key]);
});
for(const [name,change]of [['null settings',p=>p.gameplay=null],['odd body width',p=>p.gameplay.bodyWidth=9],['invalid mode',p=>p.gameplay.mode='unknown'],['unknown setting',p=>p.gameplay.execute='code'],['invalid target ID type',p=>p.gameplay.targetId=23]])test('Malformed v8 '+name+' rejects before live/history mutation',()=>{
  const h=fresh(),before=h.json('projectData()'),depth=h.run('undoStack.length'),bad=gameplayProject();change(bad);h.context.bad=bad;assert.throws(()=>h.run('db_deserializeState(bad)'));assert.deepEqual(h.json('projectData()'),before);assert.equal(h.run('undoStack.length'),depth);
});
test('Ordinary 32 KB NROM with non-UTF8 bytes at the probe address still imports',()=>{
  const h=fresh(),rom=new Uint8Array(16+32768+8192);rom.set([78,69,83,26,2,1]);rom.fill(255,16,16+32768);h.context.otherRom=rom;
  assert.equal(h.run('Forge165.readGameplayRom(otherRom)'),null);assert.equal(h.run('importRom(otherRom,"Ordinary NROM.nes")',20000),true,h.errors.join('; '));
});
test('Gameplay ROM re-import remaps selected room, player and target and preserves physics',()=>{
  const h=fresh(),before=h.json('projectData()');build(h);assert.equal(h.run('importRom(rom,"Gameplay.nes")',20000),true,h.errors.join('; '));
  assert.equal(h.run('S.scenes.length'),2);const after=h.json('projectData()');assert.deepEqual(after.scenes[0],before.scenes[0]);
  assert.equal(after.gameplay.sceneId,after.scenes[1].id);assert.equal(after.gameplay.playerId,after.scenes[1].entities[0].id);assert.equal(after.gameplay.targetId,after.scenes[1].entities[1].id);
  for(const key of ['moveSpeed','jumpSpeed','gravity','maxFallSpeed','bodyWidth','bodyHeight'])assert.equal(after.gameplay[key],before.gameplay[key]);
  assert.equal(after.scenes[1].entities[0].animationBinding.states[0].animationId,after.animations[4].id);
  const rebuilt=build(h);assert.equal(rebuilt[4],2);assert.equal(h.run('Forge165.readGameplayRom(rom).sceneIndex'),1);h.run('undo()');assert.deepEqual(h.json('projectData().gameplay'),before.gameplay);
});
test('Gameplay ROM without a target restores an empty optional target',()=>{const h=fresh(gameplayProject({noTarget:true}));build(h);assert.equal(h.run('Forge165.readGameplayRom(rom).targetIndex'),-1);assert.equal(h.run('importRom(rom,"Solo.nes")',20000),true);assert.equal(h.run('S.gameplay.targetId'),'');});
test('GP16 checksum corruption rejects atomically',()=>{const h=fresh(),bad=build(h).slice();bad[16+0x3800+20]^=1;unchangedImport(h,bad);assert.match(h.errors.at(-1),/checksum/);});
test('Unknown GP16 version rejects atomically',()=>{const h=fresh(),bad=build(h).slice();bad[16+0x3800+4]=2;unchangedImport(h,bad);assert.match(h.errors.at(-1),/version/);});
test('GP16 length outside reserved region rejects atomically',()=>{const h=fresh(),bad=build(h).slice();new DataView(bad.buffer).setUint32(16+0x3800+5,2048,true);unchangedImport(h,bad);assert.match(h.errors.at(-1),/length/);});
for(const [name,changes]of [['missing room',{sceneIndex:6}],['nonplayer selection',{playerIndex:1,targetIndex:-1}],['missing target',{targetIndex:15}],['invalid physics',{moveSpeed:99}]])test('Rechecksummed GP16 '+name+' rejects before import mutation',()=>{const h=fresh();unchangedImport(h,recordRom(h,changes));});
test('Reordered included scenes preserve gameplay indices and remap to the correct imported room',()=>{
  const p=gameplayProject(),other=cp(p.scenes[0]);other.id='decor';other.name='Other room';other.entities=[];other.buildOrder=0;p.scenes[0].buildOrder=1;p.scenes.push(other);const h=fresh(p);build(h);
  assert.equal(h.run('Forge165.readGameplayRom(rom).sceneIndex'),1);assert.equal(h.run('importRom(rom,"Ordered gameplay.nes")',20000),true);assert.equal(h.run('S.gameplay.sceneId===S.scenes[3].id'),true);assert.equal(h.run('S.gameplay.playerId===S.scenes[3].entities[0].id'),true);
});
test('Gameplay compilation failure clears the previous built ROM without downloading',()=>{
  const h=fresh();build(h);const clicks=h.metrics().downloadClicks;h.run('S.gameplay.playerId="missing";window._buildAndRunMode=false');assert.equal(h.run('buildNesRom()'),null);assert.equal(h.run('window._lastBuiltRom'),null);assert.equal(h.metrics().downloadClicks,clicks);
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}const passed=results.filter(r=>r.passed).length,report={suite:'persistence165',scope:'v8 settings/ZIP and GP16 actual build/import preservation, identity mapping, corruption rejection and atomic failure; mock DOM.',passed,total:results.length,results};const file=process.env.FORGE_TEST_REPORT||process.argv[3];if(file)fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})();
