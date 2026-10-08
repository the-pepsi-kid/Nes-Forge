#!/usr/bin/env node
'use strict';
// Real bundled UI and project lifecycle in the inherited DOM harness.
// Per-test deferred adapters isolate asynchronous UI races; this is not a
// browser, layout, canvas screenshot, audio, or device validation claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const romPath=path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes');
const tests=[],test=(name,fn)=>tests.push({name,fn});
const bytes=()=>new Uint8Array(fs.readFileSync(romPath));
function file(name='Bridge_Room.nes',data=bytes()){return {name,size:data.length,arrayBuffer:async()=>data.slice().buffer};}
function fresh(){const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);assert.ok(h.context.Forge.services.REUI,'The bundled candidate must mount REUI');h.ui=h.context.Forge.services.REUI;h.bridge=h.context.Forge.services.REBridge;assert.ok(h.bridge,'The bundled candidate must include REBridge');return h;}
function project(h){return h.json('projectData()');}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function tinyAnalysis(name='test.nes',sc={}){const scene={chr:Array.from({length:256},()=>Array.from({length:8},()=>Array(8).fill(0))),nt:Array(960).fill(0),attr:Array(64).fill(0),pal:[[15,1,2,3],[15,1,2,3],[15,1,2,3],[15,1,2,3]],tileProps:Array(256).fill(0),...sc};return {report:{format:'NESForgeRERecovery',version:1,source:{name,sha256:'ab'.repeat(32)},recovered:{sceneCount:1,chrTiles:512,collisionCells:960,solidCells:1,musicRows:16,pulseNotes:16},limitations:['Only the test profile is supported.']},exportProject:()=>({format:'NESForge',version:12,scenes:[scene],activeScene:0})};}
function adapter(h,analyze,importProject=()=>{throw Error('Unexpected import');}){h.context.Forge.services.REBridge={analyze,importProject};}

test('RE panel mounts once in DISASM without replacing the blank project or starting playback',()=>{
  const h=fresh(),before=project(h),panel=h.get('reRecoveryPanel');assert.equal(panel.parentNode,h.get('sideDisasm'));assert.equal(h.get('sideDisasm').children.filter(node=>node===panel).length,1);h.ui.mount();assert.equal(h.get('sideDisasm').children.filter(node=>node===panel).length,1);assert.deepEqual(project(h),before);assert.equal(h.run('emu.loaded'),false);assert.equal(h.get('reRecoveryAnalyze').disabled,true);assert.equal(h.get('reRecoveryResult').hidden,true);assert.match(h.get('reRecoveryHint').textContent,/Bridge_Room\.nes/);
});
test('Choosing a ROM is separate from analysis and never changes active authoring state',()=>{
  const h=fresh(),before=project(h);h.get('reRecoveryFile').files=[file()];h.get('reRecoveryFile').dispatchEvent({type:'change'});assert.equal(h.ui.getState().staged,false);assert.equal(h.get('reRecoveryAnalyze').disabled,false);assert.deepEqual(project(h),before);assert.match(h.get('reRecoveryStatus').textContent,/Analyze to preview/);
});
test('Actual supported ROM stages room, collision and audio counts without importing or altering history',async()=>{
  const h=fresh(),before=project(h),history=h.json('({undo:undoStack.length,redo:redoStack.length})');assert.equal(await h.ui.analyzeFile(file()),true);assert.equal(h.ui.getState().staged,true);assert.equal(h.get('reRecoveryResult').hidden,false);assert.match(h.get('reRecoverySource').textContent,new RegExp(crypto.createHash('sha256').update(bytes()).digest('hex')));assert.match(h.get('reRecoverySummary').textContent,/1 scene · 512 CHR tiles/);assert.match(h.get('reRecoverySummary').textContent,/16 music rows · 16 pulse notes/);assert.deepEqual(project(h),before);assert.deepEqual(h.json('({undo:undoStack.length,redo:redoStack.length})'),history);assert.equal(h.run('emu.loaded'),false);assert.equal(h.get('reRecoveryImport').disabled,false);
});
test('Preview renders decoded graphics and cell-specific collision overrides instead of treating every shared tile as solid',async()=>{
  const h=fresh(),imageWrites=[],rects=[];
  h.get('reRecoveryScene').getContext=()=>({createImageData:(w,z)=>({data:new Uint8ClampedArray(w*z*4)}),putImageData:image=>imageWrites.push(image),fillRect:(...args)=>rects.push(args)});
  const chr=Array.from({length:256},()=>Array.from({length:8},()=>Array(8).fill(1))),analysis=tinyAnalysis('collision.nes',{chr,tileProps:Array(256).fill(1),metaMap:Array(240).fill(0),metatiles:[{id:0,collision:[0,1,0,0]}]});
  adapter(h,async()=>analysis);assert.equal(await h.ui.analyzeFile(file()),true);assert.deepEqual(Array.from(imageWrites[0].data.slice(0,4)),h.json('[...NP[1],255]'));assert.equal(rects.length,240);assert.deepEqual(rects[0],[8,0,8,8]);assert.ok(rects.every(([x,y])=>x%16===8&&y%16===0));
  rects.length=0;h.get('reRecoveryCollision').checked=false;h.get('reRecoveryCollision').dispatchEvent({type:'change'});assert.equal(imageWrites.length,2);assert.equal(rects.length,0);assert.equal(h.ui.getState().staged,true);
});
test('Untrusted filenames remain literal text in the result and never create markup',async()=>{
  const h=fresh(),name='<img src=x onerror=alert(1)>.nes';assert.equal(await h.ui.analyzeFile(file(name)),true);assert.ok(h.get('reRecoverySource').textContent.startsWith(name+'\n'));assert.equal(h.get('reRecoverySource').children.length,0);assert.equal(h.get('reRecoverySource').innerHTML,'');
});
test('Invalid ROM and oversized file failures remain visible and preserve the project',async()=>{
  const h=fresh(),before=project(h);assert.equal(await h.ui.analyzeFile(file('bad.nes',new Uint8Array([1,2,3]))),false);assert.match(h.get('reRecoveryStatus').textContent,/Truncated iNES header/);assert.equal(h.get('reRecoveryImport').disabled,true);let reads=0;assert.equal(await h.ui.analyzeFile({name:'too-big.nes',size:64*1024*1024+1,arrayBuffer:()=>{reads++;return Promise.resolve(new ArrayBuffer(0));}}),false);assert.equal(reads,0);assert.match(h.get('reRecoveryStatus').textContent,/64 MB/);assert.deepEqual(project(h),before);
});
test('A delayed earlier file read cannot replace a newer staged ROM or status',async()=>{
  const h=fresh(),pending=deferred();adapter(h,async(_,name)=>tinyAnalysis(name));const first=h.ui.analyzeFile({name:'first.nes',size:1,arrayBuffer:()=>pending.promise});assert.equal(await h.ui.analyzeFile(file('second.nes')),true);pending.resolve(new ArrayBuffer(1));assert.equal(await first,false);assert.match(h.get('reRecoverySource').textContent,/^second\.nes/);assert.equal(h.ui.getState().busy,false);assert.equal(h.ui.getState().staged,true);
});
test('A delayed hash analysis cannot publish after another file selection',async()=>{
  const h=fresh(),pending=deferred(),entered=deferred();adapter(h,()=>{entered.resolve();return pending.promise;});const request=h.ui.analyzeFile(file('first.nes'));await entered.promise;h.ui.selectFile(file('second.nes'));pending.resolve(tinyAnalysis('first.nes'));assert.equal(await request,false);assert.equal(h.ui.getState().staged,false);assert.equal(h.ui.getState().busy,false);assert.match(h.get('reRecoveryStatus').textContent,/Selected second\.nes/);
});
test('Project changes during analysis reject the preview without overwriting newer edits',async()=>{
  const h=fresh(),pending=deferred(),entered=deferred();adapter(h,()=>{entered.resolve();return pending.promise;});const request=h.ui.analyzeFile(file());await entered.promise;h.run('S.projectName="A newer edit"');const changed=project(h);pending.resolve(tinyAnalysis());assert.equal(await request,false);assert.match(h.get('reRecoveryStatus').textContent,/changed during analysis/);assert.deepEqual(project(h),changed);assert.equal(h.ui.getState().staged,false);
});
test('Changed project content or lifecycle epoch prevents a staged import',async()=>{
  for(const change of ['S.projectName="Later edit"','Forge.services.ProjectStore.state.epoch++']){const h=fresh();assert.equal(await h.ui.analyzeFile(file()),true);h.run(change);const newer=project(h);assert.equal(h.ui.importStaged(),false);assert.match(h.get('reRecoveryStatus').textContent,/changed after this preview/);assert.deepEqual(project(h),newer);assert.equal(h.ui.getState().imported,false);}
});
test('Explicit supported import is a single undoable project replacement and a repeated click does nothing',async()=>{
  const h=fresh(),before=project(h);assert.equal(await h.ui.analyzeFile(file()),true);assert.equal(h.ui.importStaged(),true);assert.equal(h.ui.getState().imported,true);assert.equal(h.run('S.tab'),'scene');assert.equal(h.run('S.scenes[0].id'),'re-room-v1');assert.equal(h.run('S.patterns[0].rows.length'),16);assert.equal(h.run('undoStack.length'),1);assert.equal(h.ui.importStaged(),false);assert.equal(h.run('undoStack.length'),1);h.run('undo()');assert.deepEqual(project(h),before);
});
test('Project and inspection exports are distinct JSON formats through the existing Save As transport',async()=>{
  const h=fresh();assert.equal(await h.ui.analyzeFile(file()),true);const before=project(h),saved=[];h.context.forgeSave.request=async(data,name,mime)=>{saved.push({data:JSON.parse(new TextDecoder().decode(data)),name,mime});return {status:'saved'};};await h.ui.downloadProject();await h.ui.downloadReport();assert.equal(saved.length,2);assert.equal(saved[0].data.format,'NESForge');assert.equal(saved[0].data.version,12);assert.equal(saved[0].data.scenes.length,1);assert.match(saved[0].name,/-Forge-project\.json$/);assert.equal(saved[1].data.format,'NESForgeRERecovery');assert.equal(saved[1].data.scenes,undefined);assert.match(saved[1].name,/-RE-report\.json$/);assert.ok(saved.every(item=>item.mime==='application/json'));assert.deepEqual(project(h),before);
});
test('Download failures leave the staged recovery available and show the actual error',async()=>{
  const h=fresh();assert.equal(await h.ui.analyzeFile(file()),true);h.context.forgeSave.request=async()=>{throw Error('Test save unavailable');};assert.equal(await h.ui.downloadProject(),false);assert.equal(h.ui.getState().staged,true);assert.match(h.get('reRecoveryStatus').textContent,/Test save unavailable/);
});

(async()=>{const results=[];for(const {name,fn}of tests){try{await fn();results.push({name,passed:true});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,error:error.stack||String(error)});process.stderr.write('FAIL '+name+'\n'+(error.stack||String(error))+'\n');}}
  const passed=results.filter(item=>item.passed).length,report={suite:'re-bridge-ui',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}process.stdout.write(passed+'/'+results.length+' passed\n');if(report.failed)process.exitCode=1;
})();
