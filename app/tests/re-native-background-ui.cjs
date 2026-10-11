#!/usr/bin/env node
'use strict';
// Actual bundled UI handlers and real supported native sources. The small DOM
// harness does not prove browser layout, pixels, user activation or playback.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const sources=[
 {id:'nes.pointer-nametable.v1',name:'HonkeyPong.nes',path:'examples/RE_Native_Audio/HonkeyPong-reproduced.nes',route:'pointer-background'},
 {id:'nes.immediate-ppu-background.v1',name:'pepsi_vending_v9e.nes',path:'tests/fixtures/re-runtime/pepsi_vending_v9e.nes',route:'immediate-background'}
];
const tests=[],test=(name,fn)=>tests.push({name,fn}),plain=value=>JSON.parse(JSON.stringify(value)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const bytes=source=>new Uint8Array(fs.readFileSync(path.join(root,source.path))),file=(source=sources[0])=>{const value=bytes(source);return {name:source.name,size:value.length,arrayBuffer:async()=>value.slice().buffer};};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fresh(){
 const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);h.context.setTimeout=fn=>setTimeout(fn,0);
 h.ui=h.context.Forge.services.RENativeBackgroundUI;h.core=h.context.Forge.services.RENativeBackground;h.analysis=h.context.Forge.services.REAnalysisUI;h.discovery=h.context.Forge.services.RERecoveryMethodsUI;
 assert.ok(h.ui&&h.core,'Actual bundle requires native background core and UI');return h;
}
function guard(h){return {project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),runtime:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,cycles:emu.cycles,frame:emu.frameCount,ram:Array.from(emu.ram||[]),vram:Array.from(emu.vram||[]),lastBuiltRom:Array.from(window._lastBuiltRom||[])})'),native:plain(h.context.Forge.services.RENativeAudioUI.getState())};}
function unchanged(h,before){assert.deepEqual(guard(h),before);}
async function open(h,source=sources[0]){assert.equal(await h.analysis.openFile(file(source)),true);assert.equal(h.ui.selectMethod(source.id),true);}
async function clicked(h,id){h.get(id).dispatchEvent({type:'click'});for(let n=0;h.ui.getState().busy&&n<400;n++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(h.ui.getState().busy,false,'Native background action must settle');}
async function preview(h,source=sources[0]){await open(h,source);assert.equal(await h.ui.preview(),true,h.get('reNativeBackgroundStatus').textContent);return plain(h.ui.getState());}
function acknowledge(h){h.get('reNativeBackgroundAcknowledge').checked=true;h.get('reNativeBackgroundAcknowledge').dispatchEvent({type:'change'});}
function wrapStage(h,fn){h.context.Forge.services.RENativeBackground={...h.core,stage:fn};}

test('Panel mounts once with graphics conversion profiles and no automatic recovery',()=>{
 const h=fresh(),panel=h.get('reNativeBackgroundPanel');assert.equal(panel.parentNode,h.get('reAnalysisWorkspace'));h.ui.mount();assert.equal(panel.parentNode.children.filter(item=>item===panel).length,1);
 assert.equal(panel['aria-label'],'Native background recovery');assert.deepEqual(h.get('reNativeBackgroundMethod').children.map(item=>item.value).sort(),sources.map(item=>item.id).sort());
 assert.equal(h.get('reNativeBackgroundImport').disabled,true);assert.equal(h.get('reNativeBackgroundProject').disabled,true);assert.equal(h.get('reNativeBackgroundEvidence').disabled,true);assert.equal(h.get('reNativeBackgroundCancel').disabled,true);assert.equal(h.ui.getState().staged,false);
});

test('Missing, merely selected and unrecognized sources cannot enable an import',async()=>{
 const h=fresh(),before=guard(h);assert.equal(await h.ui.preview(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/Open a ROM|Open for analysis/);
 h.analysis.selectFile(file());assert.equal(await h.ui.preview(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/selection changed|Open for analysis|Open a ROM/);
 const method=h.ui.getState().methodId;assert.equal(h.ui.selectMethod('not-a-method'),false);assert.equal(h.ui.getState().methodId,method);
 assert.equal(await h.analysis.openFile({name:'unknown.bin',size:3,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer}),true);
 assert.equal(await h.ui.preview(),false);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundImport').disabled,true);unchanged(h,before);
});

for(const source of sources)test(source.id+': visible Preview decodes real source, shows complete evidence and leaves authoring/runtime untouched',async()=>{
 const h=fresh();await open(h,source);const before=guard(h);await clicked(h,'reNativeBackgroundPreview');const state=plain(h.ui.getState());
 assert.equal(state.staged,true,h.get('reNativeBackgroundStatus').textContent);assert.equal(state.sourceSha256,hash(bytes(source)));assert.equal(state.methodId,source.id);assert.equal(state.sourceCurrent,true);
 assert.equal(state.report.format,'NESForgeNativeBackgroundRecovery');assert.equal(state.report.version,1);assert.equal(state.report.method.id,source.id);assert.equal(state.report.source.sha256,hash(bytes(source)));
 assert.deepEqual(JSON.parse(h.get('reNativeBackgroundDetail').textContent),state.report);assert.equal(state.previewBuild.backend,'packed');assert.ok(state.previewBuild.byteLength>0);assert.match(state.previewBuild.sha256,/^[a-f0-9]{64}$/);
 assert.match(h.get('reNativeBackgroundSummary').textContent,/static background adaptation/i);assert.match(h.get('reNativeBackgroundSummary').textContent,/Unknown or omitted/);assert.ok(h.get('reNativeBackgroundSummary').textContent.includes(state.previewBuild.sha256));
 assert.equal(h.get('reNativeBackgroundCanvas').children.length,1);assert.equal(h.get('reNativeBackgroundImport').disabled,true);assert.equal(h.get('reNativeBackgroundAcknowledge').disabled,false);assert.equal(h.get('reNativeBackgroundProject').disabled,false);unchanged(h,before);
});

for(const source of sources)test(source.id+': acknowledged visible import appends one excluded scene and one Undo while retaining runtime settings',async()=>{
 const h=fresh();await preview(h,source);const before=guard(h),base=JSON.parse(before.project);let confirmations=0;h.context.confirm=()=>{confirmations++;return true;};
 assert.equal(await h.ui.importScene(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/Acknowledge/);assert.equal(h.ui.getState().staged,true);unchanged(h,before);
 acknowledge(h);assert.equal(h.get('reNativeBackgroundImport').disabled,false);await clicked(h,'reNativeBackgroundImport');assert.equal(confirmations,0,'The explicit checkbox and Import action are the complete confirmation');
 const after=guard(h),current=JSON.parse(after.project);assert.equal(current.scenes.length,base.scenes.length+1);assert.deepEqual(current.scenes.slice(0,base.scenes.length),base.scenes);assert.equal(current.scenes.at(-1).buildInclude,false);
 for(const key of ['worldRuntime','gameplay','audioRuntime','gameplayCore','worlds','patterns','instruments','importedRom'])assert.deepEqual(current[key],base[key],key+' remains intact');
 assert.equal(after.history.undo.length,before.history.undo.length+1);assert.deepEqual(after.runtime,before.runtime);assert.deepEqual(after.native,before.native);assert.equal(h.ui.getState().imported,true);assert.equal(h.get('reNativeBackgroundImport').disabled,true);assert.equal(await h.ui.importScene(),false);assert.deepEqual(guard(h),after);
 h.run('undo()');assert.equal(h.run('Forge.services.ProjectStore.serialize()'),before.project);assert.deepEqual(guard(h).runtime,before.runtime);assert.deepEqual(guard(h).native,before.native);
});

test('Background preview preserves an existing edited native Audio copy',async()=>{
 const h=fresh();await open(h);const native=h.context.Forge.services.RENativeAudioUI;assert.equal(await native.analyze(),true);
 const decoded=h.context.FamiTone2Native.decode(bytes(sources[0])),event=decoded.native.music.songs[0].channels[0].events.findIndex(item=>item.kind==='note');
 h.get('reNativeAudioCommand').value=String(event);h.get('reNativeAudioCommand').dispatchEvent({type:'change'});h.get('reNativeAudioNote').value=String(decoded.native.music.songs[0].channels[0].events[event].noteCode+1);h.get('reNativeAudioNote').dispatchEvent({type:'input'});assert.equal(await native.applyEdit(),true);
 assert.notEqual(native.getState().currentSha256,native.getState().sourceSha256);const before=guard(h);assert.equal(await h.ui.preview(),true,h.get('reNativeBackgroundStatus').textContent);unchanged(h,before);
});

test('Project changes after preview refuse import without rolling back the newer edit',async()=>{
 const h=fresh();await preview(h);acknowledge(h);h.run('S.projectName="Edit made after background preview"');const edited=guard(h);
 assert.equal(await h.ui.importScene(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/project changed/i);assert.equal(h.ui.getState().staged,false);unchanged(h,edited);
});

test('Selecting a new source immediately removes stale preview, acknowledgement and export actions',async()=>{
 const h=fresh();await preview(h);acknowledge(h);const before=guard(h);h.analysis.selectFile(file(sources[1]));
 assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundAcknowledge').checked,false);assert.equal(h.get('reNativeBackgroundImport').disabled,true);assert.equal(h.get('reNativeBackgroundProject').disabled,true);
 assert.equal(await h.ui.importScene(),false);assert.equal(await h.ui.downloadEvidence(),false);assert.equal(await h.ui.downloadProject(),false);unchanged(h,before);
});

test('Busy and failed reads cannot preview a retained prior inspection',async()=>{
 const h=fresh();await preview(h);const pending=deferred(),before=guard(h),request=h.analysis.openFile({name:'pending.bin',size:1,arrayBuffer:()=>pending.promise});
 assert.equal(await h.ui.preview(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/finish opening/);pending.resolve(new Uint8Array([0]).buffer);await request;
 assert.equal(await h.analysis.openFile({name:'failed.bin',size:1,arrayBuffer:async()=>{throw Error('Read rejected');}}),false);assert.equal(await h.ui.preview(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/selection changed|Open for analysis|Open a ROM/);unchanged(h,before);
});

test('Source change while preview is pending aborts cooperative work and prevents stale publication',async()=>{
 const h=fresh();await open(h);const pending=deferred();let controls;wrapStage(h,async(...args)=>{controls=args[3];await pending.promise;return h.core.stage(...args);});
 const before=guard(h),request=h.ui.preview();assert.equal(h.ui.getState().busy,true);h.analysis.selectFile(file(sources[1]));const status=h.get('reNativeBackgroundStatus').textContent;assert.equal(controls.signal.aborted,true);
 pending.resolve();assert.equal(await request,false);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundStatus').textContent,status);unchanged(h,before);
});

test('Explicit cancel lets a later preview finish while an older completion stays discarded',async()=>{
 const h=fresh();await open(h);const pending=deferred();let calls=0;wrapStage(h,async(...args)=>{if(++calls===1)await pending.promise;return h.core.stage(...args);});
 const before=guard(h),first=h.ui.preview();assert.equal(await h.ui.preview(),false);assert.equal(calls,1);await clicked(h,'reNativeBackgroundCancel');assert.equal(h.ui.getState().busy,false);
 assert.equal(await h.ui.preview(),true,h.get('reNativeBackgroundStatus').textContent);const state=plain(h.ui.getState()),status=h.get('reNativeBackgroundStatus').textContent;
 pending.resolve();assert.equal(await first,false);assert.deepEqual(plain(h.ui.getState()),state);assert.equal(h.get('reNativeBackgroundStatus').textContent,status);unchanged(h,before);
});

test('Changing methods invalidates staged output and cannot publish an in-flight former method',async()=>{
 const h=fresh();await preview(h);acknowledge(h);h.get('reNativeBackgroundMethod').value=sources[1].id;h.get('reNativeBackgroundMethod').dispatchEvent({type:'change'});
 assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundAcknowledge').checked,false);
 await open(h);const pending=deferred();wrapStage(h,async(...args)=>{await pending.promise;return h.core.stage(...args);});const before=guard(h),request=h.ui.preview();
 h.get('reNativeBackgroundMethod').value=sources[1].id;h.get('reNativeBackgroundMethod').dispatchEvent({type:'change'});const status=h.get('reNativeBackgroundStatus').textContent;
 pending.resolve();assert.equal(await request,false);assert.equal(h.ui.getState().methodId,sources[1].id);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundStatus').textContent,status);unchanged(h,before);
});

test('Project changes during conversion reject a stale stage before showing an import',async()=>{
 const h=fresh();await open(h);const pending=deferred();wrapStage(h,async(...args)=>{await pending.promise;return h.core.stage(...args);});const request=h.ui.preview();h.run('S.projectName="Changed during conversion"');const edited=guard(h);
 pending.resolve();assert.equal(await request,false);assert.match(h.get('reNativeBackgroundStatus').textContent,/project changed/i);assert.equal(h.ui.getState().staged,false);unchanged(h,edited);
});

test('Mismatched source identity and missing static compile proof are refused',async()=>{
 for(const mutate of [result=>({...result,report:{...result.report,source:{...result.report.source,sha256:'0'.repeat(64)}}}),result=>({...result,previewBuild:{backend:'packed',byteLength:1,sha256:'not-a-hash'}})]){
  const h=fresh();await open(h);const before=guard(h);wrapStage(h,async(...args)=>mutate(await h.core.stage(...args)));
  assert.equal(await h.ui.preview(),false);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundImport').disabled,true);unchanged(h,before);
 }
});

test('Project/evidence downloads retain distinct payloads and never load the independent viewer into the editor',async()=>{
 const h=fresh();const state=await preview(h),before=guard(h),saved=[];h.context.forgeSave.request=async(data,name,mime)=>{saved.push({data:JSON.parse(new TextDecoder().decode(data)),name,mime});return {status:'saved'};};
 await h.ui.downloadProject();await h.ui.downloadEvidence();assert.equal(saved.length,2);assert.equal(saved[0].data.format,'NESForge');assert.equal(saved[0].data.scenes.length,1);assert.equal(saved[0].data.scenes[0].buildInclude,true);assert.equal(saved[0].data.worldRuntime.enabled,false);assert.notEqual(saved[0].data.gameplay.mode,'single-room');
 assert.deepEqual(saved[1].data,state.report);assert.equal(saved[1].data.format,'NESForgeNativeBackgroundRecovery');assert.equal(saved[1].data.rom,undefined);assert.equal(saved[1].data.project,undefined);assert.equal(saved[1].data.source.sha256,hash(bytes(sources[0])));
 assert.match(saved[0].name,/-background\.nesforge\.json$/);assert.match(saved[1].name,/-background-evidence\.json$/);assert.ok(saved.every(item=>item.mime==='application/json'));unchanged(h,before);
});

test('Save As busy, cancellation and failure reports are accurate and preserve the preview',async()=>{
 const h=fresh();await preview(h);const before=guard(h),first=h.ui.downloadProject();assert.equal((await h.ui.downloadEvidence()).status,'busy');assert.match(h.get('reNativeBackgroundStatus').textContent,/Another Save As request/);
 h.context.forgeSave.cancel();assert.equal((await first).status,'cancelled');assert.match(h.get('reNativeBackgroundStatus').textContent,/cancelled/);assert.equal(h.ui.getState().staged,true);
 h.context.forgeSave.request=async()=>({status:'error',message:'Download failed'});await h.ui.downloadEvidence();assert.match(h.get('reNativeBackgroundStatus').textContent,/not completed: Download failed/);assert.equal(h.ui.getState().staged,true);unchanged(h,before);
});

test('Late save completion cannot overwrite status for a newly selected source',async()=>{
 const h=fresh();await preview(h);const pending=deferred();h.context.forgeSave.request=()=>pending.promise;const request=h.ui.downloadEvidence();h.analysis.selectFile(file(sources[1]));const status=h.get('reNativeBackgroundStatus').textContent;
 pending.resolve({status:'saved'});await request;assert.equal(h.get('reNativeBackgroundStatus').textContent,status);assert.equal(h.ui.getState().staged,false);
});

for(const source of sources)test(source.id+': discovery route selects and focuses background tools without previewing or importing',async()=>{
 const h=fresh();await h.analysis.openFile(file(source));assert.equal(await h.discovery.discover(),true);const before=guard(h);let focused=0;h.get('reNativeBackgroundPreview').focus=()=>focused++;
 assert.equal(h.discovery.route(source.id,source.route),true,h.get('recoveryMethodsStatus').textContent);assert.equal(h.ui.getState().methodId,source.id);assert.equal(focused,1);assert.equal(h.ui.getState().staged,false);assert.match(h.get('recoveryMethodsStatus').textContent,/Discovery has not converted or imported/);unchanged(h,before);
});

test('Recovery controls stop editor/game keyboard propagation without blocking native control defaults',()=>{
 const h=fresh();for(const type of ['keydown','keyup']){let stopped=0,prevented=0;h.get('reNativeBackgroundPanel').dispatchEvent({type,stopPropagation:()=>stopped++,preventDefault:()=>prevented++});assert.equal(stopped,1);assert.equal(prevented,0);}
});

(async()=>{const results=[];for(const {name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);}}const passed=results.filter(item=>item.passed).length,report={suite:'re-native-background-ui',htmlSha256:hash(fs.readFileSync(html)),sources:sources.map(source=>({method:source.id,sha256:hash(bytes(source))})),scope:'Actual bundled native background UI, supported source conversion, full evidence and build proof, acknowledgement/import/Undo, source and project guards, cancellation, discovery routing and protected Save As outcomes. No real browser layout or playback claim.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');if(report.failed)process.exitCode=1;})();
