#!/usr/bin/env node
'use strict';
// Real Chromium supplement. Missing browser means blocked with zero checks.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),htmlPath=path.resolve(process.argv[2]||path.join(root,manifest.output)),html=fs.readFileSync(htmlPath),out=path.resolve(process.argv[3]||path.join(root,'test-results/browser-native-map'));
fs.mkdirSync(out,{recursive:true});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const report={format:'NESForgeNativeMapBrowserQA',version:1,html:path.relative(root,htmlPath),sha256:hash(html),started:new Date().toISOString(),status:'running',browser:null,checks:[],screenshots:[],pageErrors:[],limitations:[
 'Desktop and phone viewports are Chromium automation, not physical mobile, touchscreen, keyboard or controller acceptance.',
 'Tests inspect original files through native file inputs and application handlers. The source ROM and recovered playable adaptation are never executed.',
 'Save checks use the real explicit browser-download fallback, with native Save As capability disabled for these contexts. System Save As dialogs remain separate acceptance.',
 'Screenshots need visual review. Map decoding and canonical compilation do not establish original game behavior, full cartridge acceptance, audio or hardware compatibility.'
]};
let browser,server;
function save(){report.passed=report.checks.filter(item=>item.status==='passed').length;report.failed=report.checks.filter(item=>item.status==='failed').length;report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'Report.json'),JSON.stringify(report,null,2)+'\n');}
async function check(name,fn){const started=Date.now();try{await fn();report.checks.push({name,status:'passed',milliseconds:Date.now()-started});}catch(error){report.checks.push({name,status:'failed',milliseconds:Date.now()-started,error:error.stack||String(error)});}}
function requirePlaywright(){try{return require('playwright');}catch(error){if(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));throw error;}}
async function snapshot(page){return page.evaluate(()=>{
 const hash=values=>{let value=2166136261;for(const byte of values||[])value=Math.imul(value^byte,16777619);return value>>>0;};
 return {project:Forge.services.ProjectStore.serialize(),undo:undoStack.length,redo:redoStack.length,
  runtime:JSON.stringify({loaded:emu.loaded,running:emu.running,frame:emu.frameCount,PC:emu.PC,cycles:emu.cycles,ram:hash(emu.ram),vram:hash(emu.vram),pixels:hash(emu.frameBuffer),rom:hash(emu.lastBuiltRom),lastBuild:hash(window._lastBuiltRom),artifact:hash(Forge.services.RuntimeCompiler.lastArtifact?.rom)}),
  native:JSON.stringify(Forge.services.RENativeAudioUI.getState())};
 });}
async function newPage(name,viewport,mobile,baseURL){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
 await context.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.pageErrors.push({viewport:name,error:error.message}));
 await page.route('**/*',route=>{const url=route.request().url();return url.startsWith(baseURL+'/')||url.startsWith('blob:')?route.continue():route.abort();});
 await page.goto(baseURL+'/',{waitUntil:'load'});await page.waitForFunction(()=>!!window.Forge?.services?.RENativeSceneUI);
 return {context,page};
}
async function download(page,selector,name){
 await page.locator(selector).click();await page.locator('#forgeSaveDialog').waitFor({state:'visible'});await page.locator('#forgeSaveName').fill(name);
 const pending=page.waitForEvent('download');await page.locator('#forgeSaveBrowser').click();const result=await pending;assert.equal(await result.failure(),null);assert.equal(result.suggestedFilename(),name);
 const destination=path.join(out,name);await result.saveAs(destination);await page.locator('#forgeSaveDialog').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>forgeSave.lastResult.status),'download-requested');return destination;
}
async function runSource(name,viewport,mobile,baseURL,source,rom){
 const label=name+' '+source.label,{context,page}=await newPage(label,viewport,mobile,baseURL);let before,state,projectFile,projectJSON,evidenceFile;const dialogs=[];
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});
 try{
  await page.evaluate(rom=>{switchTab('emu');if(!emuLoadRomData(new Uint8Array(rom),'Map browser preserved-ROM fixture',30))throw Error('Paused-ROM fixture failed to load');emuPause();switchTab('disasm');},rom);
  before=await snapshot(page);
  await check(label+': native file input and explicit discovery route select map tools without conversion',async()=>{
   assert.equal(await page.locator('#reAnalysisFile').isVisible(),true);await page.locator('#reAnalysisFile').setInputFiles(source.path);await page.locator('#reAnalysisOpen').click();
   await page.waitForFunction(()=>{const state=Forge.services.REAnalysisUI.getState();return !state.busy&&state.opened&&!state.pendingSelection;});
   assert.equal(await page.locator('#reNativeBackgroundPanel').isVisible(),true);assert.equal(await page.evaluate(()=>Forge.services.RENativeSceneUI.getState().staged),false);
   await page.locator('#recoveryMethodsDiscover').click();await page.waitForFunction(()=>{const state=Forge.services.RERecoveryMethodsUI.getState();return state.hasResults&&!state.busy;});
   await page.locator('#recoveryMethodsRoute-'+source.route).click();assert.equal(await page.locator('#reNativeBackgroundMethod').inputValue(),source.id);assert.equal(await page.evaluate(()=>document.activeElement.id),'reNativeMapFind');
   for(const id of ['reNativeBackgroundMethod','reNativeMapFind','reNativeMapResource','reNativeBackgroundPreview','reNativeBackgroundImport','reNativeBackgroundProject','reNativeBackgroundEvidence']){const target=page.locator('#'+id);assert.equal(await target.isVisible(),true,id);assert.ok((await target.boundingBox()).height>=44,id+' has a 44px target');}
   assert.equal(await page.locator('#reNativeBackgroundImport').isDisabled(),true);assert.equal(await page.evaluate(()=>Forge.services.RENativeSceneUI.getState().staged),false);assert.deepEqual(await snapshot(page),before);
  });
  await check(label+': explicit map inspection lists supported and unsupported native records without conversion',async()=>{
   await page.locator('#reNativeMapFind').click();await page.waitForFunction(()=>{const state=Forge.services.RENativeSceneUI.getState();return !state.busy&&state.resources.length>0;});
   const resources=await page.evaluate(()=>Forge.services.RENativeSceneUI.getState().resources);assert.equal(resources.length,22);assert.ok(resources.some(item=>item.supported));assert.ok(resources.some(item=>!item.supported));
   const unsupported=resources.find(item=>!item.supported);await page.locator('#reNativeMapResource').selectOption(unsupported.key);assert.equal(await page.locator('#reNativeBackgroundPreview').isDisabled(),true);assert.equal(await page.locator('#reNativeMapResourceReason').textContent(),unsupported.reason);
   await page.locator('#reNativeMapResource').selectOption(resources.find(item=>item.supported).key);assert.equal(await page.locator('#reNativeBackgroundPreview').isDisabled(),false);assert.equal(await page.evaluate(()=>Forge.services.RENativeSceneUI.getState().staged),false);assert.deepEqual(await snapshot(page),before);
  });
  await check(label+': visible preview contains original identity, selected native resource, collision and playable build proof',async()=>{
   await page.locator('#reNativeBackgroundPreview').click();await page.waitForFunction(()=>{const state=Forge.services.RENativeSceneUI.getState();return !state.busy&&state.staged;});
   state=await page.evaluate(()=>Forge.services.RENativeSceneUI.getState());assert.equal(state.sourceSha256,source.sha256);assert.equal(state.report.method.id,source.id);assert.equal(state.sourceCurrent,true);assert.equal(state.previewBuild.backend,'single-room');assert.ok(state.previewBuild.byteLength>0);assert.match(state.previewBuild.sha256,/^[a-f0-9]{64}$/);
   assert.deepEqual(JSON.parse(await page.locator('#reNativeBackgroundDetail').textContent()),state.report);assert.equal(state.report.format,'NESForgeNativeMapRecovery');assert.equal(state.report.resourceKey,state.resourceKey);assert.match(await page.locator('#reNativeBackgroundSummary').textContent(),/static solid\/empty map adaptation/);assert.match(await page.locator('#reNativeBackgroundSummary').textContent(),/authored validation player/);assert.match(await page.locator('#reNativeBackgroundSummary').textContent(),/Unknown or omitted/);
   assert.equal(await page.locator('#reNativeBackgroundCanvas canvas').count(),1);assert.equal(await page.locator('#reNativeBackgroundImport').isDisabled(),true);assert.deepEqual(await snapshot(page),before);
   await page.locator('#reNativeBackgroundCanvas').scrollIntoViewIfNeeded();const image=name+'-'+source.label+'-map.png';await page.screenshot({path:path.join(out,image)});report.screenshots.push({file:image,viewport,visualReview:'pending'});
  });
  await check(label+': project and evidence download through explicit Save As browser fallback',async()=>{
   assert.ok(state,'Preview completed');projectFile=await download(page,'#reNativeBackgroundProject',name+'-'+source.label+'-map.nesforge.json');evidenceFile=await download(page,'#reNativeBackgroundEvidence',name+'-'+source.label+'-evidence.json');
   projectJSON=JSON.parse(fs.readFileSync(projectFile));const evidence=JSON.parse(fs.readFileSync(evidenceFile));assert.equal(projectJSON.format,'NESForge');assert.equal(projectJSON.scenes.length,1);assert.equal(projectJSON.scenes[0].buildInclude,true);assert.equal(projectJSON.worldRuntime.enabled,false);assert.equal(projectJSON.gameplay.mode,'single-room');assert.deepEqual(evidence,state.report);assert.equal(evidence.rom,undefined);assert.deepEqual(await snapshot(page),before);
  });
  await check(label+': acknowledged Import appends an excluded scene in one Undo and preserves paused runtime',async()=>{
   assert.ok(state,'Preview completed');await page.locator('#reNativeBackgroundAcknowledge').check();assert.equal(await page.locator('#reNativeBackgroundImport').isDisabled(),false);await page.locator('#reNativeBackgroundImport').click();
   await page.waitForFunction(()=>{const state=Forge.services.RENativeSceneUI.getState();return !state.busy&&state.imported;});const after=await snapshot(page),base=JSON.parse(before.project),applied=JSON.parse(after.project);
   assert.equal(applied.scenes.length,base.scenes.length+1);assert.deepEqual(applied.scenes.slice(0,base.scenes.length),base.scenes);assert.equal(applied.scenes.at(-1).buildInclude,false);assert.equal(applied.scenes.at(-1).id,state.sceneId);
   for(const key of ['worldRuntime','gameplay','audioRuntime','gameplayCore','patterns','instruments','worlds','importedRom'])assert.deepEqual(applied[key],base[key],key+' preserved');
   assert.equal(after.undo,before.undo+1);assert.equal(after.runtime,before.runtime);assert.equal(after.native,before.native);assert.equal(await page.locator('#reNativeBackgroundImport').isDisabled(),true);assert.deepEqual(dialogs,[],'Checkbox plus Import is the whole confirmation flow');
   await page.locator('#undoBtn').click();const undone=await snapshot(page);assert.equal(undone.project,before.project);assert.equal(undone.undo,before.undo);assert.equal(undone.redo,before.redo+1);assert.equal(undone.runtime,before.runtime);assert.equal(undone.native,before.native);
  });
  await check(label+': downloaded playable project reopens through Open Project and remains independently buildable',async()=>{
   assert.ok(projectFile&&projectJSON,'Project was downloaded');const reopened=await newPage(label+'-reopen',viewport,mobile,baseURL);
   try{
    const epoch=await reopened.page.evaluate(()=>Forge.services.ProjectStore.state.epoch),pending=reopened.page.waitForEvent('filechooser');await reopened.page.getByRole('button',{name:'Open Project',exact:true}).click();await (await pending).setFiles(projectFile);await reopened.page.waitForFunction(epoch=>Forge.services.ProjectStore.state.epoch>epoch,epoch);
    const result=await reopened.page.evaluate(()=>{const project=Forge.services.ProjectStore.capture(),artifact=Forge.services.RuntimeCompiler.compileDetached(project);return {scene:project.scenes[0],world:project.worldRuntime.enabled,mode:project.gameplay.mode,loaded:emu.loaded,running:emu.running,backend:artifact.backend,bytes:artifact.rom.length,sha256:FamiTone2Native.sha256(artifact.rom)};});
    assert.deepEqual(result.scene,projectJSON.scenes[0]);assert.equal(result.backend,'single-room');assert.equal(result.bytes,state.previewBuild.byteLength);assert.equal(result.sha256,state.previewBuild.sha256);assert.equal(result.world,false);assert.equal(result.mode,'single-room');assert.equal(result.loaded,false);assert.equal(result.running,false);
   }finally{await reopened.context.close();}
   assert.equal((await snapshot(page)).runtime,before.runtime);
  });
  await check(label+': selecting a new file invalidates preview and disables import/export immediately',async()=>{
   await page.locator('#reNativeBackgroundPreview').click();await page.waitForFunction(()=>{const state=Forge.services.RENativeSceneUI.getState();return !state.busy&&state.staged;});await page.locator('#reNativeBackgroundAcknowledge').check();
   const prior=await snapshot(page);await page.locator('#reAnalysisFile').setInputFiles({name:'new-source.bin',mimeType:'application/octet-stream',buffer:Buffer.from([1,2,3])});assert.equal(await page.evaluate(()=>Forge.services.RENativeSceneUI.getState().staged),false);
   for(const id of ['reNativeBackgroundImport','reNativeBackgroundProject','reNativeBackgroundEvidence'])assert.equal(await page.locator('#'+id).isDisabled(),true);assert.equal(await page.locator('#reNativeBackgroundAcknowledge').isChecked(),false);assert.deepEqual(await snapshot(page),prior);
  });
 }finally{await context.close();}
}
(async()=>{
 try{const {chromium}=requirePlaywright();browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});}
 catch(error){report.status='blocked';report.reason=error.message;save();console.log('BLOCKED: Chromium unavailable; zero Native Map browser checks.');return;}
 report.browser={name:'Chromium',version:browser.version(),headless:true};server=http.createServer((request,response)=>{if(request.url!=='/'){response.writeHead(404);response.end();return;}response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const baseURL='http://127.0.0.1:'+server.address().port,sources=[{label:'command-map',id:'nes.command-metatile-map.v1',route:'native-map',path:path.join(root,'examples/RE_Native_Map/DABG-reproduced.nes')}],rom=[...fs.readFileSync(path.join(root,'tests/fixtures/golden167/single-room-poc.nes'))];
 for(const source of sources)source.sha256=hash(fs.readFileSync(source.path));
 for(const [name,viewport,mobile]of [['desktop',{width:1280,height:900},false],['phone',{width:390,height:844},true]])for(const source of sources)await runSource(name,viewport,mobile,baseURL,source,rom);
 await check('No uncaught browser errors',()=>assert.deepEqual(report.pageErrors,[]));report.status=report.checks.some(item=>item.status==='failed')?'failed':'passed';save();if(report.status==='failed')process.exitCode=1;
})().catch(error=>{report.status='failed';report.error=error.stack||String(error);save();process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
