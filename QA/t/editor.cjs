'use strict';
// Run from any directory with Node 20+.
// Optional arguments select another Forge HTML and an output JSON path.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {loadForge} = require('./u/harness-fast.cjs');
const root = path.resolve(__dirname, '..');
const html = process.argv[2] || path.join(root, 'Forge.html');
const reference = JSON.parse(fs.readFileSync(path.join(root, 'p/game.json')));
const original = JSON.parse(fs.readFileSync(path.join(root, 'p/original.json')));
const packaged = fs.readFileSync(path.join(root, 'r/game.nes'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [];
const test = (name, fn) => cases.push({name, fn});
function fresh() {
  const h = loadForge(html);
  assert.deepEqual(h.errors, []);
  return {h, run: expression => h.run(expression, 60000)};
}
async function open(env, project) {
  const text = JSON.stringify(project);
  env.h.context.reviewFile = {name:'review.nesforge.json', size:Buffer.byteLength(text), text:async () => text};
  assert.equal(await env.run('project_importFile({target:{files:[reviewFile],value:""}})'), true);
}
async function withProject(source=reference) {
  const env = fresh();
  await open(env, source);
  return env;
}
const resources = 'Forge.services.ResourceRelationshipPreview';
function select(env, key) {
  env.h.context.reviewKey = key;
  env.run(resources+'.openAt(reviewKey)');
}
const openSelected = env => env.run('document.getElementById("frx-open-editor").onclick()');
const graph = env => env.run(resources+'.liveGraph()');
const store = 'Forge.services.ProjectStore';
const status = env => env.h.get('dgAiDebugStatus');
function toggle(env, checked) {
  env.h.get('dgAiDebugToggle').checked = checked;
  env.run('renderEmu()');
}
function play(env) {
  assert.equal(env.run('buildAndRun()'), true);
  env.run('emuPause()');
  toggle(env, true);
}
function smallBinding(env) {
  env.run(`switchTab('entity-studio');S.selEntity=1;
    document.getElementById('esNewState164').value='fly';
    document.getElementById('esNewAnimation164').value=S.animations.find(a=>a.name==='Imp Fly').id;
    document.getElementById('esAssign164').onclick();`);
  assert.equal(env.run("S.scenes[0].entities[1].animationBinding.states[0].animationId===S.animations.find(a=>a.name==='Imp Fly').id"), true);
}
function compile(env) {
  return Buffer.from(env.run('Forge.services.RuntimeCompiler.commit(Forge.services.RuntimeCompiler.compile())'));
}
function canonical(env) {return env.run(store+'.serialize()');}

test('Every authored animation is resolved, with its name, action and incoming edges',async()=>{
  const e=await withProject(), before=canonical(e), g=graph(e);
  assert.equal(g.nodes.size,33);assert.equal(g.edges.length,69);
  assert.deepEqual(Array.from(g.issues),[]);
  const bound = new Set(reference.scenes.flatMap(s=>s.entities.flatMap(a=>(a.animationBinding?.states||[]).map(b=>b.animationId))));
  assert.equal(bound.size,4);
  for(const a of reference.animations){
    const node=g.nodes.get('animation:'+a.id);assert.equal(node.name,a.name);assert.equal(node.type,'animation');
    assert.equal(node.open.animationId,a.id);
    if(bound.has(a.id))assert.ok(g.edges.some(edge=>edge.to===node.key&&edge.why==='plays bound Animation'));
  }
  assert.equal(canonical(e),before);
});
test('A real dangling binding stays missing, retains both users and resolves on refresh',async()=>{
  const e=await withProject(), id='test-dangling', key='animation:'+id;
  e.run("for(const actor of S.scenes[0].entities)actor.animationBinding.states[0].animationId='test-dangling'");
  let g=graph(e);
  assert.equal(g.nodes.get(key).type,'unresolved');assert.equal(g.nodes.get(key).open,null);
  assert.equal(Array.from(g.issues).filter(x=>x==='Unresolved reference '+key).length,1);
  assert.equal(g.edges.filter(edge=>edge.to===key).length,2);
  e.run("S.animations.push({...S.animations[0],id:'test-dangling',name:'Restored clip'})");
  g=graph(e);assert.equal(g.nodes.get(key).name,'Restored clip');
  assert.equal(g.edges.filter(edge=>edge.to===key).length,2);assert.ok(!g.issues.includes('Unresolved reference '+key));
});
test('Open in editor selects each bound animation by ID and starts on frame zero',async()=>{
  const e=await withProject(),before=canonical(e);
  for(const a of reference.animations){
    select(e,'animation:'+a.id);await openSelected(e);
    assert.equal(e.run('S.tab'),'anim');assert.equal(e.run('S.animations[S._selAnim].id'),a.id);assert.equal(e.run('S._animFrame'),0);
  }
  assert.equal(e.run('undoStack.length'),0);assert.equal(canonical(e),before);
});
test('Guided-example, filter and refresh stay isolated from the live project',async()=>{
  const e=await withProject(), before=canonical(e);e.run(resources+'.open()');
  e.h.get('frx-demo').onclick();assert.equal(e.run(resources+'.summary().mode'),'demo');
  e.h.get('frx-search').value='Imp';e.h.get('frx-search').oninput();e.h.get('frx-refresh').onclick();
  assert.equal(e.run(resources+'.summary().mode'),'demo');await openSelected(e);
  e.h.get('frx-live').onclick();assert.equal(e.run(resources+'.summary().mode'),'live');
  assert.equal(canonical(e),before);assert.equal(e.run('undoStack.length'),0);
});
test('Metatile item opens its exact definition, including ID zero, without making an edit',async()=>{
  const e=await withProject(),before=canonical(e),scene=reference.scenes[0].id;
  for(const id of [3,0,4]){
    select(e,'metatile:'+scene+'::'+id);await openSelected(e);
    assert.equal(e.run('S.tab'),'meta');assert.equal(e.run('Forge16.metatileState.selectedId'),id);
    assert.equal(e.h.get('mtEditId16').textContent,'$'+id.toString(16).padStart(2,'0'));
  }
  assert.equal(e.run('undoStack.length'),0);assert.equal(canonical(e),before);
});
function twoScenes(){
  const fixture=structuredClone(reference),other=structuredClone(fixture.scenes[0]);
  other.id='test-other-scene';other.name='Other scene';other.entities=[];
  other.metatiles.forEach(m=>{m.name='Other '+m.name;});fixture.scenes.push(other);return fixture;
}
test('Duplicate scene-local IDs select the correct owner with Follow on and off',async()=>{
  const fixture=twoScenes(),e=await withProject(fixture),first=fixture.scenes[0].id,second=fixture.scenes[1].id;
  e.run('Forge16.metatiles.select(0)');select(e,'metatile:'+second+'::3');
  assert.equal(e.run('S.scenes[S.activeScene].id'),first);
  await openSelected(e);assert.equal(e.run('S.scenes[S.activeScene].id'),second);assert.equal(e.run('Forge16.metatileState.selectedId'),3);
  e.run(resources+'.open()');e.h.get('frx-follow').checked=true;e.h.get('frx-follow').onchange();
  select(e,'metatile:'+first+'::4');assert.equal(e.run('S.scenes[S.activeScene].id'),first);await openSelected(e);
  assert.equal(e.run('Forge16.metatileState.selectedId'),4);assert.equal(e.run('undoStack.length'),0);
});
test('Stale metatile selection refuses before switching scenes and exposes a status',async()=>{
  const fixture=twoScenes(),e=await withProject(fixture),first=fixture.scenes[0].id,second=fixture.scenes[1].id;
  select(e,'metatile:'+second+'::3');e.run('S.scenes[1].metatiles=S.scenes[1].metatiles.filter(m=>m.id!==3)');
  await openSelected(e);assert.equal(e.run('S.scenes[S.activeScene].id'),first);
  assert.match(e.h.get('frx-context-result').textContent,/metatile no longer exists/);
  assert.equal(e.h.get('frx-root').classList.contains('frx-visible'),true);
  assert.equal(e.h.get('frx-open-editor').disabled,true);assert.equal(e.run(resources+'.summary().selected'),null);
  const row=e.h.get('frx-items').children.find(control=>control.title?.endsWith(' · '+first+'::4'));
  assert.ok(row);row.click();assert.ok(!e.h.get('frx-context-result').textContent.includes('no longer exists'));
  await openSelected(e);assert.equal(e.run('Forge16.metatileState.selectedId'),4);assert.equal(e.run('undoStack.length'),0);
});
test('A missing direct link clears the old target and lets the user select a real one',async()=>{
  const e=await withProject(),before=canonical(e),owner=reference.scenes[0].id;
  select(e,'metatile:'+owner+'::3');select(e,'metatile:'+owner+'::999');
  assert.equal(e.run(resources+'.summary().selected'),null);assert.equal(e.h.get('frx-open-editor').disabled,true);
  assert.match(e.h.get('frx-context-result').textContent,/no longer in the live project/);
  await openSelected(e);assert.equal(canonical(e),before);
  select(e,'metatile:'+owner+'::4');await openSelected(e);assert.equal(e.run('Forge16.metatileState.selectedId'),4);
});
test('Building a different size leaves the live overlay pinned, then Build & Run switches it',async()=>{
  const e=await withProject();play(e);const running=digest(e.run('emu.lastBuiltRom'));assert.match(status(e).textContent,/26×18/);
  smallBinding(e);const next=e.run('buildNesRom()');e.h.get('forgeSaveCancel').onclick();
  assert.notEqual(digest(next),running);assert.equal(digest(e.run('emu.lastBuiltRom')),running);
  e.run("switchTab('emu');renderEmu()");assert.match(status(e).textContent,/26×18/);
  play(e);assert.equal(digest(e.run('emu.lastBuiltRom')),digest(next));assert.match(status(e).textContent,/14×10/);
});
test('A failed build cannot erase the loaded cartridge diagnostics',async()=>{
  const e=await withProject();play(e);const prior=digest(e.run('emu.lastBuiltRom'));
  e.run("S.worldRuntime.worldId='missing-world'");
  assert.equal(e.run('buildNesRom()'),null);assert.equal(e.run('Forge.services.WorldCompiler.lastBuild'),null);
  e.run('renderEmu()');assert.equal(digest(e.run('emu.lastBuiltRom')),prior);assert.match(status(e).textContent,/26×18/);
});
test('External and mismatched bytes cannot inherit debug symbols, even under the build label',async()=>{
  const e=await withProject();play(e);
  assert.ok(e.run('emuLoadRomData(emu.lastBuiltRom,"External cartridge",0)'));assert.equal(e.run('emu._dgAiDebugSymbols'),null);
  assert.equal(status(e).dataset.state,'unavailable');
  e.run('globalThis.otherImage=new Uint8Array(emu.lastBuiltRom);otherImage[otherImage.length-1]^=1');
  assert.ok(e.run('Forge.services.EmulatorBridge.loadBuilt(otherImage)'));assert.equal(e.run('emu._dgAiDebugSymbols'),null);
  assert.equal(status(e).dataset.state,'unavailable');
  assert.ok(e.run('Forge.services.EmulatorBridge.loadBuilt(new Uint8Array(Forge.services.WorldCompiler.lastBuild.rom))'));
  assert.equal(status(e).dataset.state,'live');assert.match(status(e).textContent,/26×18/);
});
test('Overlay announces availability transitions only and clears its timer when turned off',async()=>{
  const e=fresh(),announce=e.h.get('dgAiDebugAnnounce');let value='',writes=0;
  Object.defineProperty(announce,'textContent',{get:()=>value,set:v=>{writes++;value=v;}});
  toggle(e,true);assert.equal(status(e).dataset.state,'unavailable');assert.equal(writes,1);
  await open(e,reference);play(e);assert.equal(status(e).dataset.state,'live');const prior=writes;
  e.run('emu.ram[emu._dgAiDebugSymbols.enemyTimer]=17;renderEmu();renderEmu()');
  assert.match(status(e).textContent,/Timer 17/);assert.equal(writes,prior);
  toggle(e,false);assert.equal(status(e).dataset.state,'off');assert.equal(status(e).textContent,'');assert.match(value,/overlay off/i);
  const last=writes;toggle(e,false);assert.equal(writes,last);
  toggle(e,true);await open(e,original);e.run('renderEmu()');
  assert.equal(status(e).dataset.state,'unavailable');assert.equal(status(e).textContent,'');
});
test('Reset and checkpoint restore retain overlay binding while restoring the physical RAM state',async()=>{
  const e=await withProject();play(e);
  const id=e.run('Forge.services.EmulatorTimeline.saveCheckpoint("Before timer change").id');
  e.h.context.checkpointId=id;
  const initial=status(e).textContent;e.run('emu.ram[emu._dgAiDebugSymbols.enemyTimer]=23;renderEmu()');
  assert.match(status(e).textContent,/Timer 23/);
  await e.run('Forge.services.EmulatorTimeline.restoreCheckpoint(checkpointId)');e.run('renderEmu()');
  assert.equal(status(e).textContent,initial);
  e.run('emuDoReset();renderEmu()');assert.match(status(e).textContent,/26×18/);
});
const connected = 'Forge.services.ConnectedWorkspacePreview';
function fileInput(env){
  const host=env.h.get('fcw-panel-import');
  function find(node){
    if(node.tagName==='INPUT'&&node.type==='file')return node;
    for(const child of node.children||[]){const match=find(child);if(match)return match;}
  }
  const input=find(host);assert.ok(input);return input;
}
function pick(env, files){
  const input=fileInput(env);input.files=files;return input.onchange();
}
function sampleFile(name, promise=Promise.resolve(Uint8Array.of(0x50,0x4b).buffer)){
  return {name,size:20,slice(start,end){assert.equal(start,0);assert.equal(end,16);return {arrayBuffer:()=>promise};}};
}
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};}
test('Out-of-order file inspection publishes only the most recent batch',async()=>{
  const e=await withProject(),before=canonical(e);e.run(connected+'.open("import")');
  const slow=deferred(),first=pick(e,[sampleFile('old.zip',slow.promise)]);
  const fast=pick(e,[sampleFile('new.zip')]);await fast;slow.resolve(Uint8Array.of(0x50,0x4b).buffer);await first;
  assert.deepEqual(e.h.json(connected+'.staged().map(f=>f.filename)'),['new.zip']);
  assert.ok(!e.h.get('fcw-report').textContent.includes('old.zip'));assert.equal(canonical(e),before);
});
test('A superseded read failure cannot overwrite a newer successful report',async()=>{
  const e=await withProject();e.run(connected+'.open("import")');const slow=deferred();
  const old=pick(e,[sampleFile('unreadable.zip',slow.promise)]);await pick(e,[sampleFile('ready.zip')]);
  slow.reject(Error('old read failed'));await old;
  assert.match(e.h.get('fcw-report').textContent,/ready.zip/);assert.equal(e.h.get('fcw-report').dataset.state,'ready');
});
test('A current read failure exposes no partial batch and supports retry, clearing and the 25-file cap',async()=>{
  const e=await withProject(),before=canonical(e);e.run(connected+'.open("import")');
  const bad=deferred(),first=pick(e,[sampleFile('good.zip'),sampleFile('retry.zip',bad.promise)]);
  assert.equal(e.h.get('fcw-report').getAttribute('aria-busy'),'true');
  bad.reject(Error('read failed'));await first;
  assert.equal(e.h.get('fcw-report').dataset.state,'failed');assert.deepEqual(e.h.json(connected+'.staged()'),[]);
  assert.match(e.h.get('fcw-import-status').textContent,/retry.zip/);
  await pick(e,[sampleFile('retry.zip')]);assert.equal(e.h.get('fcw-report').dataset.state,'ready');
  const many=Array.from({length:30},(_,i)=>sampleFile('file'+i+'.zip'));await pick(e,many);
  assert.equal(e.run(connected+'.staged().length'),25);assert.equal(e.h.get('fcw-report').getAttribute('aria-busy'),'false');
  const pending=deferred(),earlier=pick(e,[sampleFile('old.zip',pending.promise)]);await pick(e,[]);
  pending.resolve(new ArrayBuffer(0));await earlier;
  assert.equal(e.h.get('fcw-report').dataset.state,'idle');assert.deepEqual(e.h.json(connected+'.staged()'),[]);
  assert.equal(canonical(e),before);assert.equal(e.run('undoStack.length'),0);
});
test('240 frames with diagnostics match the same ROM with diagnostics off',async()=>{
  const on=await withProject(),off=await withProject();play(on);play(off);toggle(off,false);
  for(let segment=0;segment<8;segment++){
    for(const e of [on,off]){
      e.h.context.holdRight=segment<5;
      e.run('emuKeys.ArrowRight=holdRight;for(let i=0;i<30;i++){emuRunFrame();if(i%6===0)renderEmu();}renderEmu()');
    }
    assert.deepEqual(Buffer.from(on.run('emu.ram')),Buffer.from(off.run('emu.ram')));
    assert.deepEqual(Buffer.from(on.run('emu.frameBuffer')),Buffer.from(off.run('emu.frameBuffer')));
    assert.equal(on.run('emu.frameCount'),60+segment*30);
  }
});
test('All twelve installed native-audio profiles are read-only and reject an unrelated ROM',async()=>{
  const h=loadForge(html,{environment:{crypto:crypto.webcrypto,structuredClone,setTimeout,clearTimeout}});
  const services=h.context.Forge.services,profiles=services.REMethods.list().filter(p=>p.id.startsWith('native-audio.'));
  assert.equal(profiles.length,12);
  for(const item of profiles){assert.equal(item.operations.encode,undefined);assert.equal(item.operations.convert,undefined);assert.equal(item.operations.decode.effect,'read-only');}
  const analysis=await services.REAnalysis.open(new Uint8Array(packaged)),report=await services.REMethods.discover(analysis);
  const rows=Array.from(report.results).filter(r=>r.method.id.startsWith('native-audio.'));
  assert.equal(rows.length,profiles.length);assert.ok(rows.every(r=>r.status==='unknown'));
});
test('Six World variants preserve source and rebuild deterministically; no-AI bytes stay unchanged',async()=>{
  const variants=[reference,original];
  for(const edit of [
    p=>p.scenes[0].entities[1].ai.config.contactBounce=true,
    p=>p.scenes[0].entities[1].animationBinding.states[0].animationId=p.animations.find(a=>a.name==='Imp Fly').id,
    p=>Object.assign(p.scenes[0].entities[1].ai.config,{detectX:16,detectY:16}),
    p=>delete p.scenes[0].entities[1].ai.config.contactBounce
  ]){const project=structuredClone(reference);edit(project);variants.push(project);}
  const e=fresh();
  for(const project of variants){
    await open(e,project);const canonicalSource=canonical(e),rom=compile(e);
    assert.equal(rom.length,40976);
    if(project===reference)assert.deepEqual(rom,packaged);
    // 2.0.0-alpha.12: the embedded project's foundation string changed (13 bytes in the source record); alpha.11 gave 92bc8db7…dca2.
    if(project===original)assert.equal(digest(rom),'7faabae4c98e4d3722002025cb52f382233c21fcfdd026a1e3cdb7c6f7110b2b');
    e.h.context.roundTripRom=new Uint8Array(rom);
    const source=e.h.json('Forge.services.WorldRom.inspect(roundTripRom).source');
    await open(e,source);assert.equal(canonical(e),canonicalSource);assert.deepEqual(compile(e),rom);
  }
});
test('Packed, single-room and unpacked custom backends retain their reference hashes',async()=>{
  const e=fresh();
  const hashes={
    packed:'0617c784a5c673e228ce3118a49766e5e5990276486162c20236552ee504301b',
    'single-room':'dbf8c464d0c07c8f2a95cde6e6c05c7f2fc0c6e23614986fcc9564d977fa60ef',
    'unpacked-custom':'7c38d9972fb8d4ba031b42c916bb9b7d46b5a13cb7c97f3cb2591721aff80a53'
  };
  for(const [mode,expected] of Object.entries(hashes)){
    const p=structuredClone(reference),sc=p.scenes[0],player=sc.entities[0];
    p.worlds=[];delete p.worldRuntime;p.gameplay.mode=mode==='single-room'?'single-room':'viewer';
    p.gameplay.playerId=player.id;p.gameplay.targetId='';
    if(mode==='unpacked-custom'){
      p.packScenes=false;p.asmSource='.org $8000\nreset:\n  SEI\nloop:\n  JMP loop\n.org $FFFA\n.word reset, reset, reset';
    }else{
      sc.entities=[player];sc.metatiles=[];sc.metaMap=Array(240).fill(-1);
      p.gameplay.bodyWidth=8;p.gameplay.bodyHeight=8;
      const idle=p.animations.find(a=>a.id===player.animationBinding.states[0].animationId);
      const attack=p.animations.find(a=>a.name==='Ghost Attack');
      p.animations=[idle,attack];for(const a of p.animations)a.frames=a.frames.slice(0,1);
      for(const binding of player.animationBinding.states)binding.animationId=binding.state==='attack'?attack.id:idle.id;
      p.metasprites=p.metasprites.filter(m=>p.animations.some(a=>a.frames[0].metaspriteId===m.id));
    }
    await open(e,p);const rom=compile(e);
    assert.equal(e.run('Forge.services.RuntimeCompiler.lastArtifact.backend'),mode);assert.equal(digest(rom),expected);
    e.h.context.nonAiCart=new Uint8Array(rom);assert.ok(e.run('Forge.services.EmulatorBridge.loadBuilt(nonAiCart)'));
    assert.equal(e.run('emu._dgAiDebugSymbols'),null);
  }
});
test('Portable Save As and ROM reopen reproduce bytes with the same embedded project name',async()=>{
  const e=await withProject(),first=compile(e);let saved;
  e.h.context.URL.createObjectURL=b=>{saved=b;return 'blob:workflow-test';};
  const promise=e.run('project_export()');e.h.get('forgeSaveBrowser').onclick();await promise;
  assert.ok(saved);const portable=JSON.parse(await saved.text());assert.equal(portable.version,reference.version);
  await open(e,portable);assert.deepEqual(compile(e),first);
  e.h.context.image=new Uint8Array(first);
  e.run('Forge166.project.openRom(image,"Review.nes")');
  const renamed=compile(e);assert.notDeepEqual(renamed,first);
  const actual=e.h.json('Forge.services.WorldRom.inspect(Forge.services.RuntimeCompiler.lastArtifact.rom).source');
  const expected=e.h.json('Forge.services.WorldRom.inspect(image).source');
  assert.equal(actual.projectName,'Review');assert.deepEqual({...actual,projectName:expected.projectName},expected);
  e.h.context.originalName=expected.projectName+'.nes';
  e.run('Forge166.project.openRom(image,originalName)');assert.deepEqual(compile(e),first);
});
test('One entity edit, Undo and Redo restore the corresponding ROMs',async()=>{
  const e=await withProject(),large=compile(e);smallBinding(e);const small=compile(e);
  assert.notDeepEqual(small,large);assert.equal(e.run('undoStack.length'),1);
  e.run('undo()');assert.deepEqual(compile(e),large);e.run('redo()');assert.deepEqual(compile(e),small);
});
(async()=>{
  const results=[];
  for(const {name,fn} of cases){
    try{await fn();results.push({name,passed:true});console.log('PASS '+name);}
    catch(error){results.push({name,passed:false,error:String(error.message)});console.error('FAIL '+name+'\n'+error.stack);}
  }
  const passed=results.filter(x=>x.passed).length;
  const report={suite:'editor-workflows-patch5',htmlSha256:digest(fs.readFileSync(html)),passed,total:results.length,results};
  if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
  console.log(passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;
})();
