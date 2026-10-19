#!/usr/bin/env node
'use strict';
// Active routes and bounded side effects in the complete candidate application.
// Forwarding spies count real calls; no production module is replaced or repaired.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const dir=path.join(__dirname,'fixtures/golden167'),tests=[],test=(name,fn)=>tests.push({name,fn});
const input=id=>JSON.parse(fs.readFileSync(path.join(dir,id+'.project.json'),'utf8'));
const rom=id=>Uint8Array.from(fs.readFileSync(path.join(dir,id+'.nes')));
const expectedPhases=['prepare-snapshot','select-remap','atlas','metatile-metadata','world-metadata','asset-link-encode','audio-link','gameplay-core-link','code-occupancy','allocation','scene-metadata-pack','chr-serialize','gameplay-compile','artifact'];
function fresh(id){const h=loadForge(html);assert.deepEqual(h.errors,[]);assert.ok(h.context.Forge?.services,'Candidate must provide its own active services');if(id){h.context.fixture=input(id);h.run('db_deserializeState(fixture)');}return h;}
function spy(object,key){const original=object[key];assert.equal(typeof original,'function',key+' is callable');let calls=0;object[key]=function(...args){calls++;return original.apply(this,args);};return {get calls(){return calls;},restore(){object[key]=original;}};}
function graphSpies(h){const s=h.context.Forge.services;return [spy(s.ProjectStore,'prepareSnapshot'),spy(h.context.Forge16.build,'encodeExtension'),spy(h.context.Forge161.build,'worldPayload'),spy(h.context.Forge164.persistence,'encodeAssets')];}
function counts(spies){return spies.map(s=>s.calls);}
function state(h){return h.json('({project:projectData(),undo:undoStack,redo:redoStack,bytes:undoBytes,loaded:emu.loaded,running:emu.running,frame:emu.frameCount,cycles:emu.cycles,projectId:S.projectId})');}

test('Public build and preflight routes have one authoritative service owner',()=>{
  const h=fresh(),s=h.context.Forge.services;
  assert.equal(h.run('buildNesRom'),s.RuntimeCompiler.build);
  for(const api of [h.context.Forge15.build,h.context.Forge16.build]){assert.equal(api.plan,s.BuildGraph.plan);assert.equal(api.preflight,s.BuildGraph.preflight);}
  assert.equal(h.context.Forge15.build.showPreflight,s.BuildGraph.preflight);
  assert.equal(h.context.forge15_preflight,s.BuildGraph.preflight);assert.equal(h.get('forge15PreflightBtn').onclick,s.BuildGraph.preflight);
  assert.deepEqual(Array.from(s.RuntimeCompiler.backends),['packed','unpacked-custom','single-room','world']);
});
test('Preflight links one prepared project exactly once; compiling that plan does not relink or publish',()=>{
  const h=fresh('packed-world-assets-reordered'),s=h.context.Forge.services,spies=graphSpies(h);
  h.context.sentinel=Uint8Array.from([7,8,9]);h.run('window._lastBuiltRom=sentinel');
  try{
    const plan=s.BuildGraph.preflight();assert.ok(plan,h.get('forge15Preflight').innerHTML);assert.deepEqual(counts(spies),[1,1,1,1]);
    const artifact=s.RuntimeCompiler.compile(plan);assert.deepEqual(counts(spies),[1,1,1,1]);assert.equal(artifact.plan,plan);
    assert.equal(h.run('window._lastBuiltRom'),h.context.sentinel);assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0});
    assert.deepEqual(Buffer.from(artifact.rom),Buffer.from(rom('packed-world-assets-reordered')));
    assert.throws(()=>s.RuntimeCompiler.compile(plan),/single-use|new graph/i);
  }finally{spies.forEach(s=>s.restore());}
});
test('Actual compile phase order keeps linking before occupancy/allocation and final CHR bytes',()=>{
  const h=fresh('single-room-poc'),s=h.context.Forge.services;
  assert.deepEqual(Array.from(s.BuildGraph.phaseOrder),expectedPhases);
  const artifact=s.RuntimeCompiler.compile();assert.deepEqual(Array.from(artifact.phases),expectedPhases);
  assert.deepEqual(Buffer.from(artifact.rom),Buffer.from(rom('single-room-poc')));
  assert.equal(artifact.backend,'single-room');assert.equal(artifact.metadata.prgSize,32768);
});
test('Global Build prepares, links, compiles, commits and requests Save As exactly once',async()=>{
  const h=fresh('packed-viewer'),s=h.context.Forge.services,spies=graphSpies(h),compile=spy(s.RuntimeCompiler,'compile'),commit=spy(s.RuntimeCompiler,'commit'),save=spy(h.context,'download');
  try{
    h.run('window._buildAndRunMode=false');const built=h.run('buildNesRom()',15000);
    assert.ok(built instanceof Uint8Array);assert.deepEqual(counts(spies),[1,1,1,1]);assert.equal(compile.calls,1);assert.equal(commit.calls,1);assert.equal(save.calls,1);
    assert.equal(h.run('window._lastBuiltRom'),built);assert.equal(s.RuntimeCompiler.lastArtifact.rom,built);
    assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0},'Save As must wait for user selection');
    h.context.forgeSave.cancel();await h.context.forgeSave.lastPromise;assert.deepEqual(h.metrics(),{objectURLs:0,downloadClicks:0});
  }finally{[...spies,compile,commit,save].forEach(s=>s.restore());}
});
test('Existing Build & Run uses one current compiler dispatch without a Save As request',()=>{
  const h=fresh('packed-viewer'),s=h.context.Forge.services,compile=spy(s.RuntimeCompiler,'compile'),commit=spy(s.RuntimeCompiler,'commit'),save=spy(h.context,'download');
  try{
    assert.equal(h.run('buildAndRun()',15000),true);assert.equal(compile.calls,1);assert.equal(commit.calls,1);assert.equal(save.calls,0);
    assert.equal(h.run('emu.loaded'),true);assert.equal(h.run('emu.running'),true);assert.equal(h.run('emu.romName'),'Current project build');
    assert.deepEqual(Buffer.from(h.run('emu.lastBuiltRom')),Buffer.from(rom('packed-viewer')));
  }finally{[compile,commit,save].forEach(s=>s.restore());h.run('emuPause()');}
});
test('Failed compile clears published artifacts and does not run/export a stale ROM',()=>{
  const h=fresh('packed-viewer'),s=h.context.Forge.services;h.run('window._buildAndRunMode=true;buildNesRom()');assert.ok(s.RuntimeCompiler.lastArtifact);
  h.run('S.scenes[0].buildInclude=false');const save=spy(h.context,'download');
  try{assert.equal(h.run('buildAndRun()'),false);assert.equal(h.run('window._lastBuiltRom'),null);assert.equal(s.RuntimeCompiler.lastArtifact,null);assert.equal(h.context.Forge165.lastBuild,null);assert.equal(save.calls,0);assert.equal(h.run('emu.running'),false);assert.ok(s.BuildGraph.lastDiagnostics.some(d=>d.severity==='error'));}finally{save.restore();}
});

test('ReleaseInfo owns current version/schema and production has no embedded Scout starter',()=>{
  const h=fresh();assert.equal(h.context.Forge.release.version,'2.0.0-alpha.11');assert.equal(h.context.Forge.release.schema,12);
  assert.match(h.context.document.title,/2\.0\.0-alpha\.11.*Audio Discovery/);assert.equal(h.context.Forge.release.candidate,'audio-discovery-1');
  assert.equal(h.run('projectData().version'),12);assert.equal(h.run('projectData().foundation'),'2.0.0-alpha.11');
  assert.doesNotMatch(h.html,/const\s+STARTER\s*=/);assert.doesNotMatch(h.html,/const\s+SCOUT_STARTER\s*=/);
});
test('Current Tech Docs render through one owner without accumulating historical sections',()=>{
  const h=fresh(),docs=h.context.Forge.services.Documentation;assert.equal(h.run('renderDocs'),docs.render);
  h.run('renderDocs()');const first=h.get('sideDocs').innerHTML;h.run('renderDocs();renderDocs()');assert.equal(h.get('sideDocs').innerHTML,first);
  assert.match(first,/2\.0\.0-alpha\.11/);assert.match(first,/Audio Discovery/);assert.match(first,/Gameplay Core/);assert.match(first,/Audio Runtime/);assert.match(first,/World Runtime/);
  assert.doesNotMatch(first,/<h[1-6][^>]*>\s*(?:NES Forge\s+)?1\.[0-5][^<]*<\/h/i);
  for(const term of ['World','Audio','Live','Save','Capture','Source workspace','Checkpoints','BEHAVIOR GRAPH','Export MIDI'])assert.match(first,new RegExp(term,'i'),'Current reference documents '+term);
});
test('AssetRegistry lookups and validation leave authored data, IDs and history untouched',()=>{
  const h=fresh('packed-world-assets-reordered'),registry=h.context.Forge.services.AssetRegistry;const before=state(h);
  h.run('window.references=[S.scenes,S.animations,S.metasprites,S.worlds,S.chr,S.sprChr]');const refs=h.run('references');
  assert.equal(registry.scene('scene-a').id,'scene-a');assert.equal(registry.animation('walk').id,'walk');assert.equal(registry.metasprite('hero').id,'hero');assert.equal(registry.entity('actor-a').id,'actor-a');
  registry.index();registry.validate();registry.index();registry.validate();
  assert.deepEqual(state(h),before);h.run('[S.scenes,S.animations,S.metasprites,S.worlds,S.chr,S.sprChr]').forEach((r,i)=>assert.equal(r,refs[i]));
});
test('AssetRegistry validates detached inputs without repairing them or changing live project',()=>{
  const h=fresh('packed-viewer'),registry=h.context.Forge.services.AssetRegistry,project=input('packed-world-assets-reordered');project.metasprites[0].sceneId='unresolved-scene';
  const text=JSON.stringify(project),before=state(h);const diagnostics=registry.validate(project);assert.ok(diagnostics,'Validation returns a result');
  assert.match(JSON.stringify(diagnostics),/unresolved-scene|missing|unresolved/i);assert.equal(JSON.stringify(project),text);assert.deepEqual(state(h),before);
  assert.equal(registry.scene('scene-a',project).id,'scene-a');assert.equal(registry.scene('absent',project)==null,true);
});
test('EmulatorBridge exposes existing commands and preserves real emulator stepping/reset semantics',()=>{
  const h=fresh(),bridge=h.context.Forge.services.EmulatorBridge;
  for(const method of ['loadBuilt','runOriginal','loadRom','run','pause','step','reset','captureRuntime','captureHybrid','bakeVisible'])assert.equal(typeof bridge[method],'function',method);
  h.context.goldenRom=rom('packed-viewer');assert.equal(bridge.loadRom(h.context.goldenRom,'Bridge fixture',4),true);assert.equal(h.run('emu.frameCount'),4);assert.equal(h.run('emu.running'),false);
  bridge.step();assert.equal(h.run('emu.frameCount'),5);assert.equal(h.run('emu.running'),false);bridge.reset();assert.equal(h.run('emu.frameCount'),0);assert.equal(h.run('emu.running'),false);
  assert.deepEqual(Buffer.from(h.run('emu.lastBuiltRom')),Buffer.from(h.context.goldenRom));assert.deepEqual(h.errors,[]);
});
test('EmulatorBridge runtime capture preserves validated pixels and performs one undoable insertion',()=>{
  const h=fresh(),bridge=h.context.Forge.services.EmulatorBridge;assert.equal(bridge.loadRom(rom('packed-viewer'),'Capture fixture',4),true);
  const before=h.run('S.scenes.length'),undo=h.run('undoStack.length'),result=bridge.captureRuntime();assert.ok(result,'Capture returns the inserted scene');
  assert.equal(h.run('S.scenes.length'),before+1);assert.equal(h.run('undoStack.length'),undo+1);assert.equal(result.captureMeta.bakedSprites,false);
  assert.deepEqual(JSON.parse(JSON.stringify(result.captureMeta.validation)),{backgroundDifferentPixels:0,compositeDifferentPixels:0,pixels:61440,reference:'completed emulator framebuffer, without editor overlays'});
  const captures=h.run('S.scenes.length');h.run('undo()');assert.equal(h.run('S.scenes.length'),captures-1);assert.deepEqual(h.errors,[]);
});
test('EmulatorBridge Run Original uses preserved bytes without compiling current editor data',()=>{
  const h=fresh('packed-viewer'),s=h.context.Forge.services;h.context.original=rom('single-room-poc');h.run('S.importedRom=original');const before=state(h),compile=spy(s.RuntimeCompiler,'compile');
  try{s.EmulatorBridge.runOriginal();assert.equal(compile.calls,0);assert.equal(h.run('emu.romName'),'Original imported ROM');assert.deepEqual(Buffer.from(h.run('emu.lastBuiltRom')),Buffer.from(h.context.original));assert.deepEqual(h.json('projectData()'),before.project);assert.equal(h.run('emu.running'),true);}finally{compile.restore();s.EmulatorBridge.pause();}
});
test('Inactive LiveLink reports no capabilities and rejects apply without side effects',()=>{
  const h=fresh('packed-viewer'),link=h.context.Forge.services.LiveLink,before=state(h),metrics=h.metrics();
  assert.deepEqual(JSON.parse(JSON.stringify(link.capabilities())),{active:false,incrementalCompilation:false,runtimePatching:false});
  assert.throws(()=>link.apply({assetId:'test',bytes:new Uint8Array([1,2,3])}),/inactive|unsupported|not supported|not enabled/i);
  assert.deepEqual(state(h),before);assert.deepEqual(h.metrics(),metrics);assert.equal(h.run('window._lastBuiltRom'),null);
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
  const passed=results.filter(r=>r.passed).length,report={suite:'services167',html:path.basename(html),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Active service ownership and dispatch, single-pass graph preparation/linking, phase order, output side effects, release/docs consolidation, read-only registry, existing emulator/capture delegation, inactive LiveLink. Full-script VM; no real-browser claim.',passed,failed:results.length-passed,total:results.length,results};if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;
})();
