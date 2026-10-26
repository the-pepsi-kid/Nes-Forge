'use strict';
// Full standalone HTML + strict DOM events. Private inputs are optional arguments
// and never copied into this report. Canvas/layout/timers use the retained stub.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const html=path.resolve(__dirname,'../../nes-forge.html'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const checks=[],native=[],copy=v=>JSON.parse(JSON.stringify(v));
const report={htmlSha256:sha(fs.readFileSync(html)),scope:'Parsed-DOM capability labels, applicable controls, native routes, save/fresh reopen and output preservation. Canvas/layout/timers stubbed; no new visual game, listening, browser/device or hardware acceptance.',checks,native};
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS '+name);}
function instance(){const h=load(html);h.window.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height});}};return h;}
const errors=h=>{assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);};
const get=(h,id)=>{const n=h.document.getElementById(id);assert(n?.isConnected,id);return n;};
function untouchedControls(h){
 const w=h.window,s=w.Forge.services,old=s.ProjectStore.serialize(),history=w.eval('undoStack.length');
 const first=get(h,'forge15IncludeFirst7');assert(first.disabled);first.click();first.onclick();
 for(const id of ['spBuildInclude','spBuildOrder']){const n=get(h,id);assert(n.disabled);n.value='999';n.checked=!n.checked;n.dispatchEvent(new w.Event('change',{bubbles:true}));}
 for(const n of get(h,'buildSceneSet').querySelectorAll('input')){assert(n.disabled);n.value='999';n.checked=!n.checked;n.dispatchEvent(new w.Event('change',{bubbles:true}));}
 if(w.eval('!!S.nativeGame'))for(const id of ['cfgMapper','cfgMirror','cfgSRAM','cfgPackScenes']){const n=get(h,id);assert(n.disabled);if(n.type==='checkbox')n.checked=!n.checked;else n.value=id==='cfgMirror'?'h':'0';n.dispatchEvent(new w.Event('change',{bubbles:true}));}
 assert.equal(s.ProjectStore.serialize(),old);assert.equal(w.eval('undoStack.length'),history);
}
function button(h,id){return h.document.querySelector('[data-fcw-writer="'+id+'"]');}
function readOnlyViews(h){const s=h.window.Forge.services,before=s.ProjectStore.serialize();
 const descriptor=s.ProjectCapabilities.describe();descriptor.writers.push({title:'unowned'});
 s.ConnectedWorkspacePreview.open('native');s.ConnectedWorkspacePreview.open('overview');s.AreaLibrary.describe();
 assert(!s.ProjectCapabilities.describe().writers.some(w=>w.title==='unowned'));
 assert.equal(s.ProjectStore.serialize(),before);s.ConnectedWorkspacePreview.close();
}
(async()=>{
 const h=instance(),w=h.window,s=w.Forge.services;
 let authored,stale;
 try{
  await check('Authored seven-Scene selection, build and Undo retain existing behavior',()=>{
   authored=s.ProjectStore.capture();authored.scenes=Array.from({length:9},(_,i)=>w.makeScene({id:'cap-scene-'+i,name:'Authored '+i,buildOrder:20-i}));
   s.ProjectStore.load(authored,{sync:true});s.ConnectedWorkspacePreview.refresh();
   assert.equal(s.ProjectCapabilities.describe().backend,'packed');assert(!get(h,'forge15IncludeFirst7').disabled);
   stale=get(h,'buildSceneSet').querySelector('input');
   const before=s.ProjectStore.serialize();get(h,'forge15IncludeFirst7').click();
   const p=s.ProjectStore.capture();assert.equal(p.version,12);
   assert.deepEqual(Array.from(s.BuildGraph.selectedSceneEntries(),e=>e.sc.id),Array.from({length:7},(_,i)=>'cap-scene-'+i));
   assert.equal(s.RuntimeCompiler.compile().backend,'packed');w.undo();assert.equal(s.ProjectStore.serialize(),before);
  });
  await check('World and unpacked custom builds explain unused Scene controls',()=>{
   for(const [backend,changes] of [['world',{worldRuntime:{...authored.worldRuntime,enabled:true}}],['unpacked-custom',{asmSource:'.org $C000\nRESET: JMP RESET',packScenes:false}]]){
    s.ProjectStore.load({...copy(authored),...changes},{sync:true});s.ConnectedWorkspacePreview.refresh();
    assert.equal(s.ProjectCapabilities.describe().backend,backend);untouchedControls(h);
    assert.match(get(h,'forge15BuildScope').textContent,/not used/);
   }
  });
  await check('Single-room route retains applicable packed Scene controls',()=>{
   const p=copy(authored);p.gameplay.mode='single-room';s.ProjectStore.load(p,{sync:true});s.ConnectedWorkspacePreview.refresh();
   assert.equal(s.ProjectCapabilities.describe().backend,'single-room');assert(!get(h,'forge15IncludeFirst7').disabled);
  });
  await check('Preserved generic ROM is distinguished from native writers',async()=>{
   // A public synthetic iNES source, deliberately without a title adapter.
   const bytes=new w.Uint8Array(16+16384+8192);bytes.set([78,69,83,26,1,1]);
   const p=await s.ROMProject.create(bytes,'Synthetic preservation fixture');s.ProjectStore.load(p,{sync:true});await s.InvestigationUI.whenReady();
   readOnlyViews(h);const c=s.ProjectCapabilities.describe();assert(c.preservationOnly);assert.equal(c.writers.length,0);
   assert.equal(c.backend,'native-engine');assert.match(get(h,'fcw-status').textContent,/unchanged output/);untouchedControls(h);
   const before=s.ProjectStore.serialize();stale.checked=!stale.checked;stale.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(s.ProjectStore.serialize(),before);
   assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(bytes));
   const saved=s.ProjectStore.serialize({includeEditorView:true}),other=instance();
   try{other.window.Forge.services.ProjectStore.load(saved,{sync:true});assert(other.window.Forge.services.ProjectCapabilities.describe().preservationOnly);untouchedControls(other);errors(other);}finally{other.dom.window.close();}
  });
  await check('Returning to authored mode restores controls and exact Gameplay target',()=>{
   s.ProjectStore.load(authored,{sync:true});s.ConnectedWorkspacePreview.refresh();assert(!get(h,'forge15IncludeFirst7').disabled);
   assert(!get(h,'forge15SceneBuild').hidden);const panel=get(h,'gcPanel190');panel.open=false;
   const b=Array.from(get(h,'fcw-panel-overview').querySelectorAll('button')).find(n=>n.textContent==='Edit Gameplay');assert(b);b.click();
   assert.equal(w.eval('S.tab'),'scene');assert(panel.open);errors(h);
  });
 }finally{h.dom.window.close();}
 if(process.argv[2])for(let revision=0;revision<2;revision++){
  const original=fs.readFileSync(path.join(process.argv[2],"Mike Tyson's Punch-Out!! (U) (PRG "+revision+").nes")),identity=sha(original);
  const h=instance(),w=h.window,s=w.Forge.services;
  try{
   await check('Punch-Out PRG'+revision+' coherent capability views and native no-op after disabled controls',async()=>{
    s.ProjectStore.load(await s.NativeResourceProject.create(w.Uint8Array.from(original),'Punch-Out capability verification'),{sync:true});await s.InvestigationUI.whenReady();
    readOnlyViews(h);const c=s.ProjectCapabilities.describe();assert.equal(c.kind,'native');assert.equal(c.writers.length,4);
    assert.match(get(h,'fcw-status').textContent,/Punch-Out.*bounded native editing/);
    const overview=get(h,'fcw-panel-overview').textContent;assert(!overview.includes('Edit Zelda II'));assert(!overview.includes('Inspection only'));
    assert.match(get(h,'investigationSummary').textContent,/Glass Joe pose positions/);
    assert.match(s.SceneContext.describe().nativeBuildScope,/Glass Joe pose positions/);
    assert(s.AreaLibrary.describe().resources.some(r=>r.name==='Physical CHR and fight palettes'));
    const audio=s.NativeAudioLibraryUI.getState();assert.equal(audio.status,'decoded');assert.equal(audio.cues,84);assert(audio.isCurrent);
    report.nativeAudio=report.nativeAudio||[];report.nativeAudio.push({revision,status:audio.status,cues:audio.cues,isCurrent:audio.isCurrent});
    untouchedControls(h);assert.equal(sha(s.RuntimeCompiler.compile().rom),identity);
    get(h,'forge15PreflightBtn').click();assert.match(get(h,'forge15Preflight').textContent,/Native recipe validation passed/);
    assert.match(get(h,'forge15Preflight').textContent,/Glass Joe pose positions/);
   });
   await check('Punch-Out PRG'+revision+' native shortcuts locate explicit pickers and arena owner',()=>{
    const before=s.ProjectStore.serialize();s.ConnectedWorkspacePreview.open('native');button(h,'punch-out-glass-joe-pose-placement-v1').click();
    assert.equal(w.eval('S.tab'),'disasm');assert(get(h,'punchOutPosePanel').open);assert.equal(h.document.activeElement.id,'punchOutPoseChoice');
    assert.equal(s.ProjectStore.serialize(),before);
    s.ConnectedWorkspacePreview.open('native');button(h,'punch-out-physical-art-v1').click();
    assert(get(h,'punchOutArtPanel').open);assert.equal(h.document.activeElement.id,'punchOutArtBank');assert.equal(s.ProjectStore.serialize(),before);
    s.ConnectedWorkspacePreview.open('native');button(h,'punch-out-arena-layout-v1').click();assert.equal(w.eval('S.tab'),'scene');
    assert.equal(s.SceneContext.describe().scene.id,s.PunchOutArenaRecovery.sceneId);assert.equal(sha(s.RuntimeCompiler.compile().rom),identity);
   });
   await check('Punch-Out PRG'+revision+' grouped idle writer, save/fresh reopen and native refusal stay intact',async()=>{
    s.PunchOutPoseUI.open(192);get(h,'punchOutPoseIdleGroup').checked=true;get(h,'punchOutPoseIdleGroup').dispatchEvent(new w.Event('change',{bubbles:true}));
    get(h,'punchOutPoseX').value='-12';get(h,'punchOutPoseApply').click();
    const output=s.RuntimeCompiler.compile().rom;assert.notEqual(sha(output),identity);
    const saved=s.ProjectStore.serialize({includeEditorView:true}),other=instance();
    try{const os=other.window.Forge.services;os.ProjectStore.load(saved,{sync:true});await os.InvestigationUI.whenReady();
     assert.equal(sha(os.RuntimeCompiler.compile().rom),sha(output));readOnlyViews(other);untouchedControls(other);errors(other);
    }finally{other.dom.window.close();}
    const p=s.ProjectStore.capture(),active=p.scenes[p.activeScene],old=active.sprChr[0][0][0];
    active.sprChr[0][0][0]=(old+1)%4;s.ProjectStore.load(p,{sync:true});
    assert.throws(()=>s.RuntimeCompiler.compile(),/native recipe|without a native encoder|differs/i);
    assert.match(s.ProjectCapabilities.describe().label,/bounded native editing/);errors(h);
    native.push({title:'Punch-Out',revision,unchangedOutput:true,groupedIdleOutputSha256:sha(output),freshReopenOutputIdentical:true,unsupportedReferenceEditRefused:true,
     audio:s.NativeAudioLibraryUI.getState().status,sourceUnchanged:sha(fs.readFileSync(path.join(process.argv[2],"Mike Tyson's Punch-Out!! (U) (PRG "+revision+").nes")))===identity});
   });
  }finally{h.dom.window.close();}
 }
 if(process.argv[3]){
  const original=fs.readFileSync(process.argv[3]),identity=sha(original),h=instance(),w=h.window,s=w.Forge.services;
  try{
   await check('Zelda II native World and Area Library routes, edit/build and fresh reopen stay connected',async()=>{
    s.ProjectStore.load(s.NativeWorldProject.create(w.Uint8Array.from(original),'Zelda II capability verification','z2:1:0'),{sync:true});await s.InvestigationUI.whenReady();
    readOnlyViews(h);assert.equal(s.ProjectCapabilities.describe().title,'Zelda II');assert(s.ProjectCapabilities.describe().nativeWorld);untouchedControls(h);
    assert.equal(sha(s.RuntimeCompiler.compile().rom),identity);get(h,'fcw-z2').click();assert.equal(w.eval('S.tab'),'world');
    s.AreaLibrary.show();s.AreaLibrary.selectScope('project');get(h,'areaLibraryProject-native-map').click();assert.equal(w.eval('S.tab'),'world');
    const index=22+26*64,p=s.ProjectStore.capture(),value=p.worlds[0].map[index]===5?4:5;
    s.ProjectStore.applyNativeWorldEdit('z2:1:0',[{index,value}],{expected:{epoch:s.ProjectStore.state.epoch,snapshot:s.ProjectStore.serialize()}});
    const output=s.RuntimeCompiler.compile().rom;assert.notEqual(sha(output),identity);
    const other=instance();try{const os=other.window.Forge.services;os.ProjectStore.load(s.ProjectStore.serialize({includeEditorView:true}),{sync:true});
     assert.equal(sha(os.RuntimeCompiler.compile().rom),sha(output));assert.equal(os.ProjectStore.capture().worlds[0].map[index],value);errors(other);
    }finally{other.dom.window.close();}
    errors(h);native.push({title:'Zelda II',unchangedOutput:true,terrainOutputSha256:sha(output),freshReopenOutputIdentical:true,sourceUnchanged:sha(fs.readFileSync(process.argv[3]))===identity});
   });
  }finally{h.dom.window.close();}
 }
 report.status='passed';report.total=checks.length;
})().catch(e=>{report.status='failed';report.error=e.stack;console.error(e.stack);process.exitCode=1;}).finally(()=>{
 fs.writeFileSync(path.join(__dirname,'Capabilities_DOM_Verification.json'),JSON.stringify(report,null,2)+'\n');
});
