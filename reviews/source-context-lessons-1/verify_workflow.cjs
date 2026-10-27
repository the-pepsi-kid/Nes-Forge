'use strict';
// Actual parsed app, source owners, guards and native compiler. Canvas/layout and
// timers use the retained stub. Private bytes stay in RAM; UI evidence is text.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {load}=require('../punch-out-pose-position-1/dom-runtime.cjs');
const root=path.resolve(__dirname,'../..'),html=path.resolve(process.env.FORGE_REVIEW_HTML||path.join(root,'nes-forge.html'));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex'),identity=sha(fs.readFileSync(html)),checks=[];
const get=(h,id)=>{const node=h.document.getElementById(id);assert(node?.isConnected,id);return node;};
function instance(){return load(html);}
const clean=h=>{assert.deepEqual(h.errors,[]);assert.deepEqual(h.consoleErrors,[]);assert.deepEqual(h.domErrors,[]);};
async function check(name,fn){await fn();checks.push({name,passed:true});console.log('PASS '+name);}
function unknown(w){const b=new w.Uint8Array(24592);b.set([78,69,83,26,1,1]);return b;}
const file=(bytes,name)=>({name,size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer});
function assets(s){const p=s.ProjectStore.capture();for(const k of ['chr','sprChr','nt','attr','pal','sprPal','oam','tileProps','activeScene','selTile','editTile','selSprite','selEntity','chrBank','_selAnim','_animFrame'])delete p[k];return sha(JSON.stringify(p));}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timed out waiting for source state');}
(async()=>{
 const h=instance(),w=h.window,s=w.Forge.services;
 try{
  await check('Standalone startup exposes all maintained offline lessons without application errors',()=>{assert.equal(s.ProjectLessons.chapters().length,16);get(h,'projectLessonsOpen');assert.equal(s.SourceContext.project(),null);clean(h);});
  await check('Every chapter/section renders through actual controls without mutating project or build',()=>{
   const before=s.ProjectStore.serialize(),rom=sha(s.RuntimeCompiler.compile().rom);get(h,'projectLessonsOpen').click();
   for(const chapter of s.ProjectLessons.chapters()){
    const select=get(h,'projectLessonChapter');select.value=chapter.id;select.dispatchEvent(new w.Event('change',{bubbles:true}));
    const body=get(h,'projectLessonBody');assert(body.textContent.length>100,chapter.id);
    const ids=[...get(h,'projectLessons').querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,chapter.id);
    for(const option of [...get(h,'projectLessonSection').options].slice(1)){const topic=get(h,'projectLessonSection');topic.value=option.value;topic.dispatchEvent(new w.Event('change',{bubbles:true}));assert(get(h,'projectLessons').querySelectorAll('[id]').length);assert.equal(s.ProjectLessons.getState().anchor,option.value);}
   }
   assert.equal(s.ProjectStore.serialize(),before);assert.equal(sha(s.RuntimeCompiler.compile().rom),rom);assert.equal(w.eval('S.tab'),'docs');
   get(h,'projectLessonReturn').click();assert.equal(w.eval('S.tab'),'scene');
  });
  await check('Cross-chapter links select Audio chapters instead of shorter shared prefixes',()=>{
   s.ProjectLessons.open({chapter:'projects'});const link=get(h,'projectLessonBody').querySelector('a[href="#lolo-audio"]');assert(link);link.click();assert.equal(s.ProjectLessons.getState().chapter,'lolo-audio');
   s.ProjectLessons.open({chapter:'projects'});get(h,'projectLessonBody').querySelector('a[href="#metroid-audio"]').click();assert.equal(s.ProjectLessons.getState().chapter,'metroid-audio');
  });
  await check('Registered title identifiers choose their own method and unknown names never grant one',()=>{
   for(const p of w.NativePRGResources.profiles){const expected={'punch-out':'punch-out',metroid:'metroid',lolo:'lolo','river-city':'river-city',shadowgate:'shadowgate',contra:'native-pages',ff:'native-pages',megaman:'native-pages'}[p.kind];assert.equal(s.ProjectLessons.recommend({profile:p.id,sourceSha256:p.sha256,editor:'scene'}).chapter,expected,p.id);}
   assert.equal(s.ProjectLessons.recommend({profile:'ninja-gaiden-us'}).chapter,'ninja');assert.equal(s.ProjectLessons.recommend({profile:'zelda2-us'}).chapter,'zelda2');
   assert.equal(s.ProjectLessons.recommend({profile:'unsupported',name:'Punch-Out.nes',sourceSha256:'1'.repeat(64)}).chapter,'general');
  });
  await check('Independent byte inspection stays separate across authored project replacement',async()=>{
   const bytes=unknown(w),before=assets(s);await s.REAnalysisUI.openFile(file(bytes,'Independent unknown.nes'));s.SourceContextUI.refresh();assert.equal(get(h,'reAnalysisSourceContext').dataset.sourceRole,'independent');assert.equal(assets(s),before);
   s.ProjectStore.initializeBlank();s.SourceContextUI.refresh();assert.equal(s.REAnalysisUI.currentAnalysis().report.identity.sha256,sha(bytes));assert.equal(get(h,'reAnalysisSourceContext').dataset.sourceRole,'independent');
   assert.equal(s.ProjectStore.capture().importedRom,null);
  });
  await check('Intake shows fresh independent input and leaves canonical source/emulator untouched',async()=>{
   const bytes=unknown(w),before=assets(s),loaded=w.eval('emu.loaded');assert(await s.ProjectGatewayUI.openFile(file(bytes,'Intake unknown.nes')));
   assert(s.ProjectGatewayUI.getState().ready);assert.equal(s.ProjectGatewayUI.getState().sourceRole,'independent');assert.equal(get(h,'projectGatewayPanel').dataset.sourceRole,'independent');
   assert([...get(h,'projectGatewayActions').querySelectorAll('button')].every(b=>!b.disabled));assert.equal(assets(s),before);assert.equal(w.eval('emu.loaded'),loaded);
  });
  await check('Editing visibly invalidates intake actions while the immutable input remains available',async()=>{
   const receipt=s.ProjectGatewayUI.report(),hash=sha(s.ProjectGateway.read(receipt).bytes);w.eval('S.chr[0][0][0]=1');s.SourceContextUI.refresh();
   assert(!s.ProjectGatewayUI.getState().ready);assert.equal(get(h,'projectGatewayPanel').dataset.sourceRole,'detached');assert([...get(h,'projectGatewayActions').querySelectorAll('button')].every(b=>b.disabled));
   await assert.rejects(()=>s.ProjectGatewayUI.route('analysis'),/active project changed/);assert.equal(sha(s.ProjectGateway.read(receipt).bytes),hash);
  });
  await check('Project replacement invalidates intake immediately without another user interaction',async()=>{
   await s.ProjectGatewayUI.openFile(file(unknown(w),'Intake replacement.nes'));assert(s.ProjectGatewayUI.getState().ready);s.ProjectStore.initializeBlank();
   assert(!s.ProjectGatewayUI.getState().ready);assert.equal(get(h,'projectGatewayPanel').dataset.sourceRole,'detached');assert.match(get(h,'projectGatewayStatus').textContent,/Previous capabilities/);
  });
  await check('An input completing after project replacement cannot become a ready intake',async()=>{
   const bytes=unknown(w);let release;const pending=s.ProjectGatewayUI.openFile({name:'Late input.nes',size:bytes.length,arrayBuffer:()=>new Promise(r=>release=r)});
   s.ProjectStore.initializeBlank();release(bytes.buffer);await pending;assert(!s.ProjectGatewayUI.getState().ready);assert([...get(h,'projectGatewayActions').querySelectorAll('button')].every(b=>b.disabled));
  });
  await check('Opening/reading lessons does not invalidate an otherwise fresh intake',async()=>{
   await s.ProjectGatewayUI.openFile(file(unknown(w),'Reading input.nes'));const before=assets(s);get(h,'projectGatewayLesson').click();assert(s.ProjectGatewayUI.getState().ready);assert.equal(assets(s),before);
  });
  await check('Independent RE help follows the inspected bytes instead of an unrelated project source',async()=>{
   await s.REAnalysisUI.openFile(file(unknown(w),'Manual inspection.nes'));w.switchTab('disasm');get(h,'projectLessonsOpen').click();
   assert.equal(s.ProjectLessons.getState().chapter,'general');assert.match(s.ProjectLessons.getState().anchor,/5-manual-re/);assert.match(get(h,'projectLessonContext').textContent,/Manual inspection/);
  });
  await check('Independent code help follows its multi-file workspace and preserves its output',()=>{
   s.SourceWorkspaceUI.example();w.switchTab('code');s.SourceWorkspaceUI.show(true);get(h,'projectLessonsOpen').click();assert.equal(s.ProjectLessons.getState().chapter,'general');assert.match(s.ProjectLessons.getState().anchor,/8-writing-6502/);assert.match(get(h,'projectLessonContext').textContent,/Independent multi-file/);
  });
  await check('Multi-file source and its independent output survive project replacement',()=>{
   s.SourceWorkspaceUI.example();const output=s.SourceWorkspaceUI.build(),before=sha(output.rom);s.ProjectStore.initializeBlank();
   assert(s.SourceWorkspaceUI.getState().document);assert.equal(sha(s.SourceWorkspaceUI.build().rom),before);assert.equal(get(h,'sourceWorkspaceContext').dataset.sourceRole,'independent');assert.equal(s.ProjectStore.capture().asmSource,'');clean(h);
  });
 }finally{h.dom.window.close();}
 if(process.argv[2])for(let revision=0;revision<2;revision++){
  const bytes=fs.readFileSync(path.join(process.argv[2],`Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`)),h=instance(),w=h.window,s=w.Forge.services,prefix='PRG'+revision+' ';let baseline,pid,sid;
  const restore=async()=>{s.ProjectStore.load(baseline,{sync:true});await s.InvestigationUI.whenReady();s.SourceContextUI.refresh();};
  try{
   baseline=await s.NativeResourceProject.create(w.Uint8Array.from(bytes),'Source context verification');await restore();
   await check(prefix+'native restoration labels the matching Audio/RE source and preserves original output',()=>{
    assert.equal(s.NativeAudioLibraryUI.getState().sourceRole,'project');assert.equal(get(h,'nativeAudioSourceContext').dataset.sourceRole,'project');assert.equal(get(h,'reAnalysisSourceContext').dataset.sourceRole,'project');assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(bytes));
   });
   await check(prefix+'matching intake can prepare and then visibly invalidate a replacement preview',async()=>{
    assert(await s.ProjectGatewayUI.openFile(file(w.Uint8Array.from(bytes),'Matching Punch-Out.nes')));assert.equal(s.ProjectGatewayUI.getState().sourceRole,'project');
    await s.ProjectGatewayUI.route('rom-project');assert(s.InvestigationUI.getState().staged);assert(!get(h,'investigationImport').disabled);
    s.ProjectStore.initializeBlank();assert(!s.InvestigationUI.getState().staged);assert(get(h,'investigationImport').disabled);assert.match(get(h,'investigationStatus').textContent,/detached/);await restore();
   });
   await check(prefix+'a spatial-source change visibly invalidates its prepared import without changing project assets',async()=>{
    await s.SpatialREUI.openFile(file(w.Uint8Array.from(bytes),'Spatial preparation.nes'));assert(await s.InvestigationUI.preview());assert(s.InvestigationUI.getState().staged);
    const before=assets(s);s.SpatialREUI.clear();await until(()=>!s.InvestigationUI.getState().staged);assert(get(h,'investigationImport').disabled);assert.equal(assets(s),before);await restore();
   });
   await check(prefix+'current-project Audio shortcut replaces an expired intake guard without touching the project',async()=>{
    await s.ProjectGatewayUI.openFile(file(w.Uint8Array.from(bytes),'Guarded Audio input.nes'));await s.ProjectGatewayUI.route('audio');
    w.eval('S.editTile=(S.editTile+1)%256');s.SourceContextUI.refresh();assert.equal(s.NativeAudioLibraryUI.getState().sourceRole,'detached');assert(!get(h,'nativeAudioProjectSource').hidden);
    const before=assets(s),loaded=w.eval('emu.loaded');assert(await s.NativeAudioLibraryUI.useProjectSource());assert.equal(s.NativeAudioLibraryUI.getState().sourceRole,'project');assert.equal(assets(s),before);assert.equal(w.eval('emu.loaded'),loaded);assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(bytes));
   });
   await check(prefix+'native idle lesson follows the selected pose despite an independently browsed Scene',()=>{
    s.PunchOutPoseUI.open(192);pid=w.Forge163.metasprites.current.id;sid=w.Forge163.metasprites.current.sceneId;s.SceneContext.selectScene(s.ProjectStore.capture().scenes[0].id);w.Forge163.metasprites.select(pid);w.switchTab('metasprites');
    const before=assets(s);get(h,'projectLessonsOpen').click();assert.equal(s.ProjectLessons.getState().chapter,'punch-out');assert.match(s.ProjectLessons.getState().anchor,/17-edit-native-idle/);assert.match(get(h,'projectLessonBody').textContent,/Keep idle poses together/);
    get(h,'projectLessonCurrent').click();assert.match(s.ProjectLessons.getState().anchor,/17-edit-native-idle/);get(h,'projectLessonReturn').click();assert.equal(w.eval('S.tab'),'metasprites');assert.equal(w.Forge163.metasprites.current.id,pid);assert.equal(assets(s),before);
   });
   await check(prefix+'Resources lesson shortcut uses the resource role without changing assets or native bytes',()=>{
    s.PunchOutArtUI.open('chr',29);const before=assets(s),rom=sha(s.RuntimeCompiler.compile().rom);s.ResourceRelationshipPreview.openAt('chr:bg:po-native-art-chr-29');
    const button=[...get(h,'frx-related-tools').querySelectorAll('button')].find(b=>b.textContent==='Lesson for this resource');assert(button);button.click();assert.equal(s.ProjectLessons.getState().chapter,'punch-out');assert.match(s.ProjectLessons.getState().anchor,/19-follow-a-pose/);
    assert.equal(assets(s),before);assert.equal(sha(s.RuntimeCompiler.compile().rom),rom);
   });
   await check(prefix+'Audio lesson opens the exact native cue workflow and names active project output separately',()=>{
    s.NativeAudioLibraryUI.open(true);w.switchTab('audio');get(h,'nativeAudioLesson').click();assert.equal(s.ProjectLessons.getState().chapter,'punch-out');assert.match(s.ProjectLessons.getState().anchor,/7-audio/);assert.match(get(h,'projectLessonScope').textContent,/Active project output/);
   });
   if(revision===0)await check('Switching between both native revisions refreshes source identities without cross-source writes',async()=>{
    const other=fs.readFileSync(path.join(process.argv[2],"Mike Tyson's Punch-Out!! (U) (PRG 1).nes"));s.ProjectStore.load(await s.NativeResourceProject.create(w.Uint8Array.from(other),'Other revision'),{sync:true});await s.InvestigationUI.whenReady();s.SourceContextUI.refresh();
    assert.equal(s.NativeAudioLibraryUI.getState().sourceSha256,sha(other));assert.equal(s.NativeAudioLibraryUI.getState().sourceRole,'project');assert.equal(sha(s.RuntimeCompiler.compile().rom),sha(other));await restore();
   });
   await check(prefix+'project replacement keeps old Audio evidence visibly detached with stale operations disabled',()=>{
    s.ProjectStore.initializeBlank();const state=s.NativeAudioLibraryUI.getState();assert.equal(state.sourceRole,'detached');assert(!state.isCurrent);assert(state.cues>0);assert.equal(state.sourceSha256,sha(bytes));
    for(const id of ['nativeAudioInspect','nativeAudioPlay','nativeAudioPreview','nativeAudioApply'])assert(get(h,id).disabled,id);assert(!get(h,'nativeAudioIndependent').hidden);assert.match(get(h,'nativeAudioStatus').textContent,/Detached source/);
   });
   await check(prefix+'help for a detached Audio catalog does not pretend it is an independent active source',()=>{
    w.switchTab('audio');s.NativeAudioLibraryUI.open(true);get(h,'nativeAudioLesson').click();assert.equal(s.ProjectLessons.getState().chapter,'punch-out');assert.match(get(h,'projectLessonContext').textContent,/Detached source/);assert(!s.NativeAudioLibraryUI.getState().isCurrent);
   });
   await check(prefix+'stale direct Audio actions still refuse through the existing source guard',async()=>{
    const before=assets(s);assert.equal(await s.NativeAudioLibraryUI.inspect(),false);assert.equal(await s.NativeAudioLibraryUI.preview(),false);assert.equal(assets(s),before);assert(!s.NativeAudioLibraryUI.getState().hasStage);
   });
   await check(prefix+'explicit independent Audio continuation reopens the exact ROM without project/emulator replacement',async()=>{
    const before=assets(s),loaded=w.eval('emu.loaded');get(h,'nativeAudioIndependent').click();await until(()=>s.NativeAudioLibraryUI.getState().isCurrent&&!s.NativeAudioLibraryUI.getState().busy);
    assert.equal(s.NativeAudioLibraryUI.getState().sourceRole,'independent');assert.equal(s.NativeAudioLibraryUI.getState().sourceSha256,sha(bytes));assert.equal(assets(s),before);assert.equal(w.eval('emu.loaded'),loaded);assert(!get(h,'nativeAudioInspect').disabled);
    s.NativeAudioLibraryUI.open(true);w.switchTab('audio');get(h,'nativeAudioLesson').click();assert.equal(s.ProjectLessons.getState().chapter,'punch-out');assert.match(get(h,'projectLessonContext').textContent,/Independent source/);assert.match(get(h,'projectLessonScope').textContent,/Generated/);
   });
   await check(prefix+'deliberate independent Audio remains independent across another project replacement',()=>{
    s.ProjectStore.initializeBlank();assert(s.NativeAudioLibraryUI.getState().isCurrent);assert.equal(s.NativeAudioLibraryUI.getState().sourceRole,'independent');assert.equal(s.ProjectStore.capture().importedRom,null);
   });
   await check(prefix+'a pending project-owned Audio catalog cannot publish ready after replacement',async()=>{
    const epoch=s.ProjectStore.state.epoch,pending=s.NativeAudioLibraryUI.sourceLoaded(w.Uint8Array.from(bytes),'Pending owned source',{isCurrent:()=>s.ProjectStore.state.epoch===epoch});s.ProjectStore.initializeBlank();await pending;
    assert(!s.NativeAudioLibraryUI.getState().busy);assert(!s.NativeAudioLibraryUI.getState().isCurrent);assert(get(h,'nativeAudioInspect').disabled);assert.match(get(h,'nativeAudioStatus').textContent,/Detached source/);clean(h);
   });
  }finally{h.dom.window.close();}
 }
 assert.equal(sha(fs.readFileSync(html)),identity);
 const report={status:'passed',htmlSha256:identity,checks,scope:'Real parsed app, canonical/source owners and guards; canvas/layout/timers stubbed. Private source input stays in memory. Browser UI checks are separate.'};
 fs.writeFileSync(process.env.FORGE_SOURCE_LESSONS_REPORT||path.join(__dirname,'Workflow_DOM.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:checks.length}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
