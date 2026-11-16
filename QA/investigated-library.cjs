'use strict';
// Exercise the actual retained-ROM intake and library/editor actions. Counts
// alone do not establish that a source pose or room reaches a canonical editor.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadForge}=require('./t/u/harness-fast.cjs'),{load}=require('../app/tests/dom-environment.cjs');
const editor=process.argv[2]||path.resolve(__dirname,'../NES_Forge.html'),out=process.argv[3],corpus=process.argv[4];
if(!corpus)throw Error('Supply the private original-ROM corpus.');
const list=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)):e.name.endsWith('.nes')?[path.join(dir,e.name)]:[]);
const originals=list(corpus),find=name=>{const f=originals.find(f=>path.basename(f).includes(name));if(!f)throw Error('Missing '+name);return {name:path.basename(f),bytes:fs.readFileSync(f)};};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),plain=v=>JSON.parse(JSON.stringify(v)),pause=()=>new Promise(r=>setImmediate(r));
const report={editorSha256:hash(fs.readFileSync(editor)),checks:[]};
async function test(name,fn){try{const evidence=await fn();report.checks.push({name,passed:true,evidence});console.log('PASS',name);}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}}
const h=loadForge(editor,{environment:{crypto:crypto.webcrypto}}),w=h.context,s=w.Forge.services,store=s.ProjectStore;
let zelda,ninja;
async function importCart(name){const cart=find(name),p=await s.InvestigationProject.create(new Uint8Array(cart.bytes),cart.name);store.load(p);return cart;}
function assertArt(native,adapted,scene){assert.equal(native.pieces.length,adapted.pieces.length);for(let i=0;i<native.pieces.length;i++){const a=native.pieces[i],b=adapted.pieces[i];assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(a.flipH,b.flipH);assert.equal(a.flipV,b.flipV);assert.deepEqual(plain(scene.sprChr[b.tile]),plain(native._source.sprChr[a.tile]));assert.deepEqual(plain(scene.sprChr[b.tile2]),plain(native._source.sprChr[a.tile2]));}}
(async()=>{
 await test('Zelda RE import exposes the full library while keeping working copies distinct',async()=>{
  zelda=await importCart('Zelda');const p=store.capture(),d=s.InvestigatedLibrary.describe(),g=s.ResourceRelationshipPreview.liveGraph();
  assert.equal(p.scenes.length,3);assert.equal(p.metasprites.length,1);assert.deepEqual(plain(d.counts),{rooms:258,roomSlots:567,poses:30,animations:0,actorRecords:324,cues:75});
  assert.equal([...g.nodes.values()].filter(n=>n.sourceResource?.kind==='pose').length,30);assert.equal([...g.nodes.values()].filter(n=>n.type==='metasprite').length,30);
  assert.equal([...g.nodes.values()].filter(n=>n.type==='actor-record').length,324);assert.equal(p.gameplayCore.actorDefinitions.length,0);
  assert.equal(hash(s.NativeEngineProject.build(p).rom),hash(zelda.bytes));return {source:d.counts,working:{scenes:p.scenes.length,poses:p.metasprites.length}};
 });
 await test('All 30 Link poses open as real metasprites with exact source pixels and no 30-Scene duplication',()=>{
  const d=s.InvestigatedLibrary.describe();for(const item of d.items.filter(i=>i.kind==='pose')){
   const preview=s.InvestigatedLibrary.preview(item.request),native=preview.poses[0];native._source=preview.scene;
   const result=s.InvestigatedLibrary.edit(item.request),p=store.capture(),frame=p.metasprites.find(f=>f.id===result.poseId),scene=p.scenes.find(sc=>sc.id===frame.sceneId);
   assertArt(native,frame,scene);
  }
  const p=store.capture();assert.equal(p.metasprites.length,30);assert.equal(p.scenes.length,3);assert.equal(hash(s.NativeEngineProject.build(p).rom),hash(zelda.bytes));
  return {editablePoses:30,sceneOwners:p.scenes.length,nativeOutputIdentical:true};
 });
 await test('A different source room opens all its pages, survives Save/reopen, and is one Undo step',async()=>{
  const d=s.InvestigatedLibrary.describe(),item=d.items.find(i=>i.kind==='scene'&&!i.reason&&!i.existing&&i.record.set==='east'),before=store.capture(),beforeSnapshot=store.serialize();assert(item);
  const preview=s.InvestigatedLibrary.preview(item.request),result=s.InvestigatedLibrary.edit(item.request),after=store.capture();
  assert.equal(after.scenes.length,before.scenes.length+preview.pages.length);assert.equal(h.run('undoStack.at(-1)'),beforeSnapshot);
  assert.deepEqual(plain(after.scenes.find(sc=>sc.id===result.sceneId).nt),plain(preview.scene.nt));
  h.run('undo()',10000);assert.equal(store.capture().scenes.length,before.scenes.length);assert.equal(store.capture().metasprites.length,30);
  h.run('redo()',10000);assert.equal(store.capture().scenes.length,after.scenes.length);
  const saved=store.serialize();store.initializeBlank();store.load(saved);assert.equal(store.capture().metasprites.length,30);assert.equal(s.InvestigatedLibrary.describe().counts.roomSlots,567);
  assert.equal(hash(s.NativeEngineProject.build(store.capture()).rom),hash(zelda.bytes));return {pagesOpened:preview.pages.length,savedAndReopened:true,undoAndRedo:true};
 });
 await test('Opening more source assets never clears an unsupported editor edit',()=>{
  h.state().nt[0]=(h.state().nt[0]+1)&255;const dirty=store.capture(),oldHash=dirty.nativeGame.projectionSha256;assert.throws(()=>s.NativeEngineProject.build(dirty),/without a native encoder/);
  const item=s.InvestigatedLibrary.describe().items.find(i=>i.kind==='scene'&&!i.reason&&!i.existing);s.InvestigatedLibrary.edit(item.request);
  assert.equal(store.capture().nativeGame.projectionSha256,oldHash);assert.throws(()=>s.NativeEngineProject.build(store.capture()),/without a native encoder/);
  const snapshot=store.serialize();assert.throws(()=>store.openInvestigatedResource(item.request,{expected:{epoch:store.state.epoch,snapshot:'stale'}}),/changed/);assert.equal(store.serialize(),snapshot);
  return {unsupportedEditStillBlocked:true,staleGuardRejected:true};
 });
 await test('Ninja exposes all recovered poses/scripts and refuses its three unresolved scripts',async()=>{
  ninja=await importCart('Ninja');const d=s.InvestigatedLibrary.describe();assert.equal(d.counts.poses,202);assert.equal(d.counts.animations,83);const scripts=d.items.filter(i=>i.kind==='animation');
  const unresolved=scripts.filter(i=>i.reason);assert.equal(unresolved.length,3);for(const item of unresolved){const before=store.serialize();assert.throws(()=>s.InvestigatedLibrary.edit(item.request));assert.equal(store.serialize(),before);}
  const selected=[scripts.find(i=>!i.reason&&i.record.owner==='player'),scripts.find(i=>!i.reason&&i.record.owner==='enemy')];
  for(const item of selected){const expected=s.InvestigatedLibrary.preview(item.request),result=s.InvestigatedLibrary.edit(item.request),p=store.capture(),actual=p.animations.find(a=>a.id===result.animationId);assert.equal(actual.frames.length,expected.animation.frames.length);assert.deepEqual(plain(actual.frames.map(f=>f.duration)),plain(expected.animation.frames.map(f=>f.duration)));
   for(let i=0;i<actual.frames.length;i++){const sourceFrame=expected.poses.find(f=>f.id===expected.animation.frames[i].metaspriteId);sourceFrame._source=expected.scene;const frame=p.metasprites.find(f=>f.id===actual.frames[i].metaspriteId);assertArt(sourceFrame,frame,p.scenes.find(sc=>sc.id===frame.sceneId));}
   const count=p.animations.length;s.InvestigatedLibrary.edit(item.request);assert.equal(store.capture().animations.length,count);
  }
  assert.equal(hash(s.NativeEngineProject.build(store.capture()).rom),hash(ninja.bytes));return {sourcePoses:202,scripts:83,refusedUnresolved:unresolved.map(i=>i.id),realEditableScripts:selected.map(i=>i.id)};
 });
 await test('The shared library exposes a PRG resource title and opens a previously absent page',async()=>{
  const cart=await importCart('Contra'),d=s.InvestigatedLibrary.describe();assert(d.counts.rooms>1);const item=d.items.filter(i=>i.kind==='scene'&&!i.reason).at(-1),before=store.capture().scenes.length;
  const preview=s.InvestigatedLibrary.preview(item.request),target=s.InvestigatedLibrary.edit(item.request),p=store.capture();assert.equal(p.scenes.length,before+1);assert.deepEqual(plain(p.scenes.find(sc=>sc.id===target.sceneId).nt),plain(preview.scene.nt));assert.equal(hash(s.NativeEngineProject.build(p).rom),hash(cart.bytes));return {catalogRooms:d.counts.rooms,opened:target.sceneId};
 });
 await test('A different Ninja graphics context allocates its own sprite atlas and preserves native output on reopen',async()=>{
  await importCart('Ninja');const d=s.InvestigatedLibrary.describe(),item=d.items.find(i=>i.kind==='pose'&&!i.existing),context=d.contexts.find(c=>c.id!==d.contextSceneId).id,before=store.capture(),expected=s.InvestigatedLibrary.preview(item.request,{contextSceneId:context});
  const result=s.InvestigatedLibrary.edit(item.request,{contextSceneId:context}),p=store.capture(),scene=p.scenes.find(sc=>sc.id===result.sceneId),frame=p.metasprites.find(f=>f.id===result.poseId);assert.equal(p.scenes.length,before.scenes.length+1);assert.equal(scene.captureMeta.sourceLibrary.contextSceneId,context);expected.poses[0]._source=expected.scene;assertArt(expected.poses[0],frame,scene);assert.equal(hash(s.NativeEngineProject.build(p).rom),hash(ninja.bytes));
  const saved=store.serialize();store.initializeBlank();store.load(saved);assert.equal(hash(s.NativeEngineProject.build(store.capture()).rom),hash(ninja.bytes));const count=store.capture().scenes.length;s.InvestigatedLibrary.edit(item.request,{contextSceneId:context});assert.equal(store.capture().scenes.length,count);return {context,atlasOwner:scene.id,reused:true,reopened:true};
 });
 await test('Actual ROM intake, Resources filtering, source preview, editor action and room picker are connected',async()=>{
  const dom=load(editor),v=dom.window,sv=v.Forge.services,doc=dom.document,cart=find('Zelda');
  try{
   await pause();const file={name:cart.name,size:cart.bytes.length,arrayBuffer:async()=>v.Uint8Array.from(cart.bytes).buffer};
   assert(await sv.ProjectGatewayUI.openFile(file));assert(await sv.ProjectGatewayUI.route('rom-project'));assert(sv.InvestigationUI.importProject());await sv.InvestigationUI.whenReady();
   const library=sv.InvestigatedLibrary.describe(),pose=library.items.filter(i=>i.kind==='pose').at(-1),before=sv.ProjectStore.serialize();
   sv.ResourceRelationshipPreview.openAt(pose.key);doc.getElementById('frx-scope').value='source';doc.getElementById('frx-kind').value='metasprite';doc.getElementById('frx-kind').dispatchEvent(new v.Event('change'));
   assert.equal(doc.querySelectorAll('#frx-items .frx-item').length,30);assert(doc.querySelector('#frx-preview canvas'));assert.equal(sv.ProjectStore.serialize(),before,'Browsing must not alter the project.');
   doc.getElementById('frx-open-editor').click();await pause();const project=sv.ProjectStore.capture();assert.equal(project.metasprites.length,2);assert.equal(v.eval('S.tab'),'metasprites');assert(!doc.getElementById('frx-root').classList.contains('frx-visible'));
   const room=sv.SceneContext.describe().rooms.find(r=>!r.sceneIds.length&&r.status!=='unavailable');assert(room);const option=[...doc.getElementById('sceneContextRoom').options].find(o=>o.value===room.sceneId);assert(!option.disabled);sv.SceneContext.selectRoom(room.sceneId);assert(doc.getElementById('frx-root').classList.contains('frx-visible'));assert.equal(doc.getElementById('frx-name').textContent,room.label);
   doc.getElementById('frx-open-editor').click();await pause();assert.equal(sv.SceneContext.describe().activeRoomId,room.sceneId);
   const cue=sv.InvestigatedLibrary.describe().items.find(i=>i.kind==='cue');sv.ResourceRelationshipPreview.openAt(cue.key);doc.getElementById('frx-open-editor').click();await sv.InvestigationUI.whenReady();await pause();await pause();assert.equal(sv.NativeAudioLibraryUI.getState().selectedCue,cue.record.id);
   const map=sv.InvestigatedLibrary.describe().items.find(i=>i.kind==='map');sv.ResourceRelationshipPreview.openAt(map.key);doc.getElementById('frx-open-editor').click();await sv.InvestigationUI.whenReady();await pause();await pause();assert.equal(sv.SpatialREUI.getState().selectedMap,map.id);assert(doc.getElementById('areaLibrary').hidden);
   assert.equal(hash(sv.NativeEngineProject.build(sv.ProjectStore.capture()).rom),hash(cart.bytes));
   await sv.InvestigationUI.whenReady();await pause();const errors=[...dom.errors,...dom.consoleErrors,...dom.domErrors];assert.equal(errors.length,0,JSON.stringify(errors));return {filteredPoses:30,poseOpened:true,unopenedRoomSelectable:true,sourceCueSelected:cue.record.id};
  }finally{await sv.InvestigationUI.whenReady();await pause();v.close();}
 });
 report.harnessErrors=h.errors;report.total=report.checks.length;report.passed=report.checks.filter(c=>c.passed).length;report.ok=report.passed===report.total&&!h.errors.length;
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(report.passed+'/'+report.total);process.exitCode=report.ok?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
