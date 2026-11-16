'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load}=require('../app/tests/dom-environment.cjs');
const root=path.resolve(__dirname,'..'),editor=process.argv[2]||path.join(root,'NES_Forge.html'),output=process.argv[3];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const report={editorSha256:sha(fs.readFileSync(editor)),checks:[]};
const env=load(editor),w=env.window,d=env.document,s=w.Forge.services,store=s.ProjectStore;
const bytes=value=>w.Uint8Array.from(value),file=(name,value)=>({name,size:value.length,arrayBuffer:async()=>Uint8Array.from(value).buffer});
async function test(name,fn){try{const evidence=await fn();report.checks.push({name,passed:true,evidence});}catch(e){report.checks.push({name,passed:false,error:e.message});}console.log(name,report.checks.at(-1).passed,report.checks.at(-1).error||'');}
async function archive(entries){return bytes(new Uint8Array(await w.eval('buildZip')(entries.map(([name,value])=>({name,data:bytes(typeof value==='string'?Buffer.from(value):value)}))).arrayBuffer()));}
(async()=>{
 await new Promise(resolve=>setTimeout(resolve,20));
 await test('Unknown-ROM physical CHR opens as tile sheets without claiming recovered rooms',async()=>{
  const input=Buffer.alloc(16+16384+8192);input.set([78,69,83,26,1,1]);input[16+16384]=128;
  const gate=s.ProjectGatewayUI;assert(await gate.openFile(file('unknown-fixture.nes',input)));assert(await gate.route('rom-project'));
  d.getElementById('investigationImport').click();
  const end=Date.now()+30000;while(!s.ROMProject.matches(store.capture())&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,15));
  const project=store.capture();assert(s.ROMProject.matches(project));assert.equal(project.scenes.length,2);
  const before=store.serialize(),key='scene:'+project.scenes[0].id,explorer=s.ResourceRelationshipPreview;
  const graph=explorer.liveGraph(),owner=graph.nodes.get(key);assert.equal(owner.type,'chr');assert.equal(owner.open.kind,'chr');
  assert.match(owner.scope,/layout unresolved/);assert.equal([...graph.nodes.values()].filter(n=>n.type==='scene').length,0);
  assert.equal([...graph.nodes.values()].filter(n=>n.type==='collision'||n.type==='sprite').length,0);
  explorer.openAt(key);assert.match(d.getElementById('frx-description').textContent,/room placement/);
  assert.match(d.getElementById('frx-viewer-caption').textContent,/placement.*unresolved/);
  assert.equal(d.querySelectorAll('#frx-related-tools button.frx-context-shortcut').length,2); // CHR and context lesson
  assert(!d.getElementById('frx-related-tools').textContent.includes('Collision'));
  assert.match(d.getElementById('frx-open-editor').textContent,/CHR Sheet/);
  assert.equal(store.serialize(),before);await d.getElementById('frx-open-editor').onclick();assert.equal(w.eval('S.tab'),'chr');
  assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(input));
  return {fixture:'Synthetic valid NROM with physical CHR; not the owner’s alternate Ninja Gaiden revision',sheets:2,roomClaims:0,unchangedNativeOutput:true};
 });
 await test('Authored scenes retain Scene previews and their existing build',()=>{
  store.load(JSON.parse(fs.readFileSync(path.join(root,'Examples/TwoStages.nesforge.json'))),{intent:'placement-regression'});
  const before=store.serialize(),rom=sha(s.RuntimeCompiler.compile().rom),project=store.capture(),explorer=s.ResourceRelationshipPreview;
  for(const sc of project.scenes){const key='scene:'+sc.id;assert.equal(explorer.liveGraph().nodes.get(key).type,'scene');explorer.openAt(key);assert.match(d.getElementById('frx-viewer-caption').textContent,/Scene composite/);}
  assert.equal(store.serialize(),before);assert.equal(sha(s.RuntimeCompiler.compile().rom),rom);
  return {scenes:project.scenes.length,romSha256:rom};
 });
 await test('Resource packs refuse a native project from another source without changing the active project',async()=>{
  const active=store.serialize(),original=JSON.parse(active),report={format:'NESForgeNativeResourceExtraction',rom:{sha256:'0'.repeat(64)},title:'Wrong-source fixture',project:'fixture.native.nesforge.json'};
  const pack=await s.ExtractionPack.open(await archive([['fixture/resources_report.json',JSON.stringify(report)],['fixture/fixture.native.nesforge.json',JSON.stringify(original)]]));
  await assert.rejects(pack.entry(pack.files.nativeProject[0]),/source differs/);assert.equal(store.serialize(),active);
 });
 await test('Multiple extraction roots refuse before a project can be selected',async()=>{
  const active=store.serialize(),r={format:'NESForgeNativeResourceExtraction',rom:{sha256:'0'.repeat(64)},project:'project.json'};
  const a=await archive([['a/resources_report.json',JSON.stringify(r)],['b/native_report.json',JSON.stringify({...r,format:'NESForgeNativeExtraction'})]]);
  await assert.rejects(s.ExtractionPack.open(a),/Multiple extraction roots/);assert.equal(store.serialize(),active);
 });
 await test('Observed capture archives reject mismatched snapshot identity',async()=>{
  const report={format:'NESForgeAudioCapture',rom:{sha256:'1'.repeat(64)},project:'title.nesforge.json'},project=store.capture();
  const raw=await archive([['capture/title_audio/audio_report.json',JSON.stringify(report)],['capture/title_audio/title.nesforge.json',JSON.stringify(project)],['capture/screens/f1/state.json',JSON.stringify({format:'NESForgeRuntimeSnapshot',status:'observed',frame:1,rom:{sha256:'2'.repeat(64)}})]]);
  const before=store.serialize(),pack=await s.ExtractionPack.open(raw);
  await assert.rejects(pack.entry(pack.files.capture[0]),/wrong-source runtime snapshot/);assert.equal(store.serialize(),before);
 });
 await test('Malformed exported collision dimensions refuse without modifying project physics',async()=>{
  const report={format:'NESForgeNativeExtraction',rom:{sha256:'1'.repeat(64)},game:'Fixture'},room={format:'NESForgeNativeSceneEvidence',collision:{width:2,height:2,solid:[0]}};
  const raw=await archive([['fixture/native_report.json',JSON.stringify(report)],['fixture/rooms/room.json',JSON.stringify(room)],['fixture/rooms/room_collision.png',Buffer.from('not decoded by this test')]]);
  const before=store.serialize(),pack=await s.ExtractionPack.open(raw);assert.equal(pack.files.collision.length,1);
  await assert.rejects(pack.entry(pack.files.collision[0]),/collision reference grid/);assert.equal(store.serialize(),before);
 });
 report.domErrors=[...env.errors,...env.consoleErrors,...env.domErrors];report.passed=report.checks.filter(r=>r.passed).length;report.total=report.checks.length;
 report.ok=report.passed===report.total&&!report.domErrors.length;
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');w.close();process.exitCode=report.ok?0:1;
})().catch(error=>{console.error(error);w.close();process.exitCode=1;});
