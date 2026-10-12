#!/usr/bin/env node
'use strict';
// Actual shared scene UI and real native records. DOM harness checks do not
// establish browser layout, user activation, cartridge or hardware acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output)),fixture=path.join(root,'examples/RE_Native_Map/DABG-reproduced.nes'),methodId='nes.command-metatile-map.v1';
const tests=[],test=(name,fn)=>tests.push({name,fn}),plain=value=>JSON.parse(JSON.stringify(value)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const bytes=()=>new Uint8Array(fs.readFileSync(fixture)),file=()=>{const value=bytes();return {name:'DABG-reproduced.nes',size:value.length,arrayBuffer:async()=>value.slice().buffer};};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fresh(){const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);h.context.setTimeout=fn=>setTimeout(fn,0);h.ui=h.context.Forge.services.RENativeSceneUI;h.core=h.context.Forge.services.RENativeMap;h.analysis=h.context.Forge.services.REAnalysisUI;h.discovery=h.context.Forge.services.RERecoveryMethodsUI;assert.ok(h.ui&&h.core,'Production native map service and shared UI required');return h;}
function guard(h){return {project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),runtime:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,cycles:emu.cycles,frame:emu.frameCount,ram:Array.from(emu.ram||[]),vram:Array.from(emu.vram||[]),lastBuiltRom:Array.from(window._lastBuiltRom||[])})'),native:plain(h.context.Forge.services.RENativeAudioUI.getState())};}
function unchanged(h,before){assert.deepEqual(guard(h),before);}
async function open(h){assert.equal(await h.analysis.openFile(file()),true);assert.equal(h.ui.selectMethod(methodId),true);}
async function find(h){await open(h);assert.equal(await h.ui.findResources(),true,h.get('reNativeBackgroundStatus').textContent);return plain(h.ui.getState());}
async function preview(h){await find(h);assert.equal(await h.ui.preview(),true,h.get('reNativeBackgroundStatus').textContent);return plain(h.ui.getState());}
function choose(h,key){h.get('reNativeMapResource').value=key;h.get('reNativeMapResource').dispatchEvent({type:'change'});}
function acknowledge(h){h.get('reNativeBackgroundAcknowledge').checked=true;h.get('reNativeBackgroundAcknowledge').dispatchEvent({type:'change'});}
function wrap(h,changes){h.context.Forge.services.RENativeMap={...h.core,...changes};}
async function clicked(h,id){h.get(id).dispatchEvent({type:'click'});for(let n=0;h.ui.getState().busy&&n<500;n++)await new Promise(resolve=>setTimeout(resolve,1));assert.equal(h.ui.getState().busy,false,'Shared scene UI action must settle');}

test('Scene conversion metadata is optional, bounded and cannot imply an undeclared convert operation',()=>{
 const h=fresh(),registry=h.context.Forge.services.REMethods.createRegistry(),base={id:'test.scene',version:1,contractVersion:2,name:'Test scene',domains:['graphics'],limitations:['Fixture metadata only'],limits:{maxSourceBytes:1,maxWork:1},operations:{decode:{label:'Decode',effect:'read-only'}},probe:()=>{},handlers:{decode:()=>{}}};
 assert.equal(registry.registerProfile(base).sceneConversion,undefined);for(const [index,sceneConversion]of ['game','',{},'map'].entries())assert.throws(()=>registry.registerProfile({...base,id:'test.bad'+index,sceneConversion}),/Scene conversion/);
 const descriptor=registry.registerProfile({...base,id:'test.valid',sceneConversion:'map',operations:{convert:{label:'Preview',effect:'preview',fidelity:'subset'}},handlers:{convert:()=>{}}});assert.equal(descriptor.sceneConversion,'map');assert.equal(Object.isFrozen(descriptor),true);
});

test('Map and background share one panel with explicit output kind and preserved background API',()=>{
 const h=fresh();assert.equal(h.ui,h.context.Forge.services.RENativeBackgroundUI);assert.equal(h.ui.getState().conversionKind,'background');assert.equal(h.get('reNativeMapResources').hidden,true);
 assert.equal(h.ui.selectMethod(methodId),true);assert.equal(h.get('reNativeBackgroundPanel')['aria-label'],'Native map and collision recovery');assert.equal(h.get('reNativeMapResources').hidden,false);assert.equal(h.get('reNativeBackgroundPreview').textContent,'Preview map');assert.equal(h.get('reNativeBackgroundPreview').disabled,true);assert.equal(h.get('reNativeBackgroundProject').textContent,'Download map project');
 assert.equal(h.ui.selectMethod('nes.famitone2-native.v1'),false,'Audio conversion is not a scene conversion');assert.equal(h.ui.getState().methodId,methodId);assert.equal(h.ui.getState().staged,false);
});

test('Visible Find maps lists the 22 referenced native maps and distinguishes unsupported semantics without authoring changes',async()=>{
 const h=fresh();await open(h);const before=guard(h);await clicked(h,'reNativeMapFind');const state=plain(h.ui.getState());assert.equal(state.resources.length,22,h.get('reNativeBackgroundStatus').textContent);assert.ok(state.resources.some(item=>item.supported));assert.ok(state.resources.some(item=>!item.supported));
 for(const resource of state.resources){assert.equal(typeof resource.reason,'string');assert.ok(resource.reason.length>0);}assert.equal(h.get('reNativeMapResource').children.length,22);assert.equal(h.get('reNativeBackgroundPreview').disabled,false);assert.equal(state.staged,false);assert.equal(h.get('reNativeBackgroundImport').disabled,true);unchanged(h,before);
});

test('Map discovery route opens shared controls without finding, converting, importing or playing maps',async()=>{
 const h=fresh();assert.equal(await h.analysis.openFile(file()),true);assert.equal(await h.discovery.discover(),true);const before=guard(h);let focused=0;h.get('reNativeMapFind').focus=()=>focused++;
 assert.equal(h.discovery.route(methodId,'native-map'),true,h.get('recoveryMethodsStatus').textContent);assert.equal(focused,1);assert.equal(h.ui.getState().conversionKind,'map');assert.equal(h.ui.getState().resources.length,0);assert.equal(h.ui.getState().staged,false);assert.match(h.get('recoveryMethodsStatus').textContent,/Discovery has not converted or imported/);unchanged(h,before);
});

test('Supported native map preview exposes exact identity, resource, collision and actual single-room compile proof',async()=>{
 const h=fresh();await find(h);const before=guard(h);await clicked(h,'reNativeBackgroundPreview');const state=plain(h.ui.getState());assert.equal(state.staged,true,h.get('reNativeBackgroundStatus').textContent);assert.equal(state.sourceSha256,hash(bytes()));assert.equal(state.sourceCurrent,true);assert.equal(state.report.format,'NESForgeNativeMapRecovery');assert.equal(state.report.resourceKey,state.resourceKey);assert.equal(state.report.method.id,methodId);
 assert.equal(state.previewBuild.backend,'single-room');assert.ok(state.previewBuild.byteLength>0);assert.match(state.previewBuild.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(JSON.parse(h.get('reNativeBackgroundDetail').textContent),state.report);assert.match(h.get('reNativeBackgroundSummary').textContent,/static solid\/empty map adaptation/);assert.match(h.get('reNativeBackgroundSummary').textContent,/authored validation player/);assert.match(h.get('reNativeBackgroundSummary').textContent,/Native region and collision/);assert.doesNotMatch(h.get('reNativeBackgroundSummary').textContent,/does not restore original gameplay, scrolling, collision/);
 assert.equal(h.get('reNativeBackgroundCanvas').children.length,1);assert.equal(h.get('reNativeBackgroundImport').disabled,true);unchanged(h,before);
});

test('Unsupported native collision remains listed with its reason and cannot preview or import',async()=>{
 const h=fresh(),state=await find(h),unsupported=state.resources.find(item=>!item.supported),before=guard(h);choose(h,unsupported.key);assert.equal(h.get('reNativeBackgroundPreview').disabled,true);assert.equal(h.get('reNativeMapResourceReason').textContent,unsupported.reason);assert.equal(await h.ui.preview(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/cannot be converted/);assert.equal(h.ui.getState().staged,false);assert.equal(await h.ui.importScene(),false);unchanged(h,before);
});

test('Acknowledged map import adds one excluded canonical scene, one Undo and reversible Redo without changing runtime settings',async()=>{
 const h=fresh(),state=await preview(h),before=guard(h),base=JSON.parse(before.project);let confirmations=0;h.context.confirm=()=>{confirmations++;return true;};assert.equal(await h.ui.importScene(),false);assert.equal(h.ui.getState().staged,true);unchanged(h,before);
 acknowledge(h);await clicked(h,'reNativeBackgroundImport');const after=guard(h),current=JSON.parse(after.project);assert.equal(confirmations,0);assert.equal(current.scenes.length,base.scenes.length+1);assert.deepEqual(current.scenes.slice(0,base.scenes.length),base.scenes);assert.equal(current.scenes.at(-1).id,state.sceneId);assert.equal(current.scenes.at(-1).buildInclude,false);
 for(const key of ['worldRuntime','gameplay','audioRuntime','gameplayCore','worlds','patterns','instruments','importedRom'])assert.deepEqual(current[key],base[key],key+' preserved');assert.equal(after.history.undo.length,before.history.undo.length+1);assert.deepEqual(after.runtime,before.runtime);assert.deepEqual(after.native,before.native);assert.equal(h.ui.getState().imported,true);assert.equal(await h.ui.importScene(),false);
 h.run('undo()');assert.equal(h.run('Forge.services.ProjectStore.serialize()'),before.project);h.run('redo()');assert.equal(h.run('Forge.services.ProjectStore.serialize()'),after.project);assert.deepEqual(guard(h).runtime,before.runtime);
});

test('Changing the selected native resource clears stage, acknowledgement and export eligibility',async()=>{
 const h=fresh(),state=await preview(h),before=guard(h);acknowledge(h);choose(h,state.resources.find(item=>item.key!==state.resourceKey).key);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundAcknowledge').checked,false);assert.equal(h.get('reNativeBackgroundProject').disabled,true);assert.equal(await h.ui.importScene(),false);assert.equal(await h.ui.downloadEvidence(),false);unchanged(h,before);
});

test('Source changes during native resource inspection cancel old work and clear stale choices',async()=>{
 const h=fresh();await open(h);const pending=deferred();let controls;wrap(h,{listResources:async(...args)=>{controls=args[2];await pending.promise;return h.core.listResources(...args);}});const before=guard(h),request=h.ui.findResources();assert.equal(h.ui.getState().busy,true);h.analysis.selectFile({name:'new.bin',size:1,arrayBuffer:async()=>new Uint8Array([1]).buffer});const status=h.get('reNativeBackgroundStatus').textContent;assert.equal(controls.signal.aborted,true);
 pending.resolve();assert.equal(await request,false);assert.equal(h.ui.getState().resources.length,0);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundStatus').textContent,status);unchanged(h,before);
});

test('Explicit cancel prevents an older map inspection from replacing newer results',async()=>{
 const h=fresh();await open(h);const pending=deferred();let calls=0;wrap(h,{listResources:async(...args)=>{if(++calls===1)await pending.promise;return h.core.listResources(...args);}});const before=guard(h),first=h.ui.findResources();assert.equal(await h.ui.findResources(),false);h.ui.cancel();assert.equal(await h.ui.findResources(),true);const state=plain(h.ui.getState()),status=h.get('reNativeBackgroundStatus').textContent;pending.resolve();assert.equal(await first,false);assert.deepEqual(plain(h.ui.getState()),state);assert.equal(h.get('reNativeBackgroundStatus').textContent,status);unchanged(h,before);
});

test('Changing maps while conversion is pending prevents stale preview publication',async()=>{
 const h=fresh(),state=await find(h),pending=deferred();wrap(h,{stage:async(...args)=>{await pending.promise;return h.core.stage(...args);}});const before=guard(h),request=h.ui.preview();choose(h,state.resources.find(item=>item.key!==state.resourceKey).key);const status=h.get('reNativeBackgroundStatus').textContent;pending.resolve();assert.equal(await request,false);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundStatus').textContent,status);unchanged(h,before);
});

test('Project changes during or after map preview refuse stale import without discarding the newer project',async()=>{
 for(const during of [true,false]){const h=fresh();await find(h);if(during){const pending=deferred();wrap(h,{stage:async(...args)=>{await pending.promise;return h.core.stage(...args);}});const request=h.ui.preview();h.run('S.projectName="Map preview newer edit"');const edited=guard(h);pending.resolve();assert.equal(await request,false);assert.match(h.get('reNativeBackgroundStatus').textContent,/project changed/i);unchanged(h,edited);}else{assert.equal(await h.ui.preview(),true);acknowledge(h);h.run('S.projectName="Map import newer edit"');const edited=guard(h);assert.equal(await h.ui.importScene(),false);assert.match(h.get('reNativeBackgroundStatus').textContent,/project changed/i);unchanged(h,edited);}}
});

test('Wrong source, native resource and static-viewer backend cannot masquerade as a map preview',async()=>{
 for(const mutate of [result=>({...result,report:{...result.report,source:{...result.report.source,sha256:'0'.repeat(64)}}}),result=>({...result,report:{...result.report,resourceKey:'other-resource'}}),result=>({...result,previewBuild:{...result.previewBuild,backend:'packed'}})]){const h=fresh();await find(h);const before=guard(h);wrap(h,{stage:async(...args)=>mutate(await h.core.stage(...args))});assert.equal(await h.ui.preview(),false);assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reNativeBackgroundImport').disabled,true);unchanged(h,before);}
});

test('Map project and evidence downloads are separate and never load the playable adaptation into the editor',async()=>{
 const h=fresh(),state=await preview(h),before=guard(h),saved=[];h.context.forgeSave.request=async(data,name,mime)=>{saved.push({data:JSON.parse(new TextDecoder().decode(data)),name,mime});return {status:'saved'};};await h.ui.downloadProject();await h.ui.downloadEvidence();assert.equal(saved.length,2);assert.equal(saved[0].data.format,'NESForge');assert.equal(saved[0].data.gameplay.mode,'single-room');assert.equal(saved[0].data.scenes.length,1);assert.equal(saved[0].data.scenes[0].buildInclude,true);assert.equal(saved[1].data.format,'NESForgeNativeMapRecovery');assert.deepEqual(saved[1].data,state.report);assert.equal(saved[1].data.rom,undefined);assert.equal(saved[1].data.project,undefined);assert.match(saved[0].name,/-map\.nesforge\.json$/);assert.match(saved[1].name,/-map-evidence\.json$/);assert.ok(saved.every(item=>item.mime==='application/json'));unchanged(h,before);
});

test('Map Save As preserves busy, cancellation and failure outcomes and suppresses late status after source change',async()=>{
 const h=fresh();await preview(h);const before=guard(h),first=h.ui.downloadProject();assert.equal((await h.ui.downloadEvidence()).status,'busy');assert.match(h.get('reNativeBackgroundStatus').textContent,/Another Save As request/);h.context.forgeSave.cancel();assert.equal((await first).status,'cancelled');assert.equal(h.ui.getState().staged,true);h.context.forgeSave.request=async()=>({status:'error',message:'Map download failed'});await h.ui.downloadEvidence();assert.match(h.get('reNativeBackgroundStatus').textContent,/not completed: Map download failed/);unchanged(h,before);
 const pending=deferred();h.context.forgeSave.request=()=>pending.promise;const late=h.ui.downloadEvidence();h.analysis.selectFile(file());const status=h.get('reNativeBackgroundStatus').textContent;pending.resolve({status:'saved'});await late;assert.equal(h.get('reNativeBackgroundStatus').textContent,status);assert.equal(h.ui.getState().resources.length,0);assert.equal(h.ui.getState().staged,false);unchanged(h,before);
});

test('Switching conversion kinds clears map records and cannot route old map output into background import',async()=>{
 const h=fresh();await preview(h);acknowledge(h);const before=guard(h);assert.equal(h.ui.selectMethod('nes.pointer-nametable.v1'),true);assert.equal(h.ui.getState().conversionKind,'background');assert.equal(h.ui.getState().resources.length,0);assert.equal(h.get('reNativeMapResources').hidden,true);assert.equal(h.get('reNativeBackgroundPreview').textContent,'Preview background');assert.equal(await h.ui.importScene(),false);assert.equal(await h.ui.downloadProject(),false);unchanged(h,before);
});

(async()=>{const results=[];for(const {name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);}}const passed=results.filter(item=>item.passed).length,report={suite:'re-native-map-ui',htmlSha256:hash(fs.readFileSync(html)),sourceSha256:hash(bytes()),scope:'Production shared scene UI, 22 referenced native resource choices, explicit capability routing, supported and refused conversion, detached playable build proof, acknowledgement/import/Undo/Redo, stale resource/source/project guards, cancellation and protected Save As. No browser layout or cartridge acceptance claim.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');if(report.failed)process.exitCode=1;})();
