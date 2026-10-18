#!/usr/bin/env node
'use strict';
// Real Chromium workflow. APU observations below execute the emitted 6502
// routines; they do not establish listening or FamiStudio-engine equivalence.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {worldProject}=require('./world-fixtures170.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),htmlPath=path.resolve(process.argv[2]||path.join(root,manifest.output)),html=fs.readFileSync(htmlPath),fixture=path.join(root,'tests/fixtures/famistudio-export/forge-four-channel-famitracker-tempo.txt'),out=path.resolve(process.argv[3]||path.join(root,'test-results/browser-audio-tool-import'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');fs.mkdirSync(out,{recursive:true});
const report={suite:'browser-audio-tool-import',format:'NESForgeAudioToolImportBrowserQA',version:1,html:path.relative(root,htmlPath),htmlSha256:hash(html),fixtureSha256:hash(fs.readFileSync(fixture)),started:new Date().toISOString(),status:'running',checks:[],screenshots:[],pageErrors:[],metrics:{},limitations:['Desktop Chromium and phone viewport emulation do not establish physical-device keyboard, listening, hardware, or FamiStudio-engine equivalence.','APU evidence executes aud_init and aud_frame as controlled CPU subroutine calls, not full-game timing.','Save As uses the real explicit browser-download fallback with the OS file-picker capability disabled; native OS Save As is not tested.']};
let browser,server;function save(){report.passed=report.checks.filter(x=>x.status==='passed').length;report.failed=report.checks.filter(x=>x.status==='failed').length;report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'Report.json'),JSON.stringify(report,null,2)+'\n');}
async function check(name,fn){try{await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);}catch(error){report.checks.push({name,status:'failed',error:error.stack});throw error;}}
async function choose(page,button,filename){const pending=page.waitForEvent('filechooser');await button.click();await(await pending).setFiles(filename);}
async function screenshot(page,name){await page.screenshot({path:path.join(out,name)});report.screenshots.push({file:name,visualReview:'pending'});}
async function download(page,button,name){await button.click();const [result]=await Promise.all([page.waitForEvent('download'),page.locator('#forgeSaveBrowser').click()]),filename=path.join(out,name);await result.saveAs(filename);assert.equal(await result.failure(),null);return fs.readFileSync(filename,'utf8');}
async function buildAndObserve(page){
 await page.locator('button[onclick="buildAndRun()"]').click();
 const observed=await page.evaluate(()=>{
  emuPause();const artifact=Forge.services.RuntimeCompiler.lastArtifact;if(!artifact?.rom)throw Error('Visible Build & Run produced no ROM');const labels=artifact.world?.symbols?.labels;if(!Number.isInteger(labels?.aud_init)||!Number.isInteger(labels?.aud_frame))throw Error('Generated Audio Runtime symbols missing');
  if(!emuLoadRomData(artifact.rom,'FamiStudio import CPU proof',0))throw Error('Generated ROM failed to load');
  const writes=[],original=cpuWrite;cpuWrite=function(address,value){if(address>=0x4000&&address<=0x4017)writes.push({address,value});return original(address,value);};
  function call(address){emu.A=0;emu.X=0;emu.Y=0;emu.PC=address;emu.SP=0xfd;emu.I=1;cpuPush(0x7f);cpuPush(0xfe);for(let steps=0;emu.PC!==0x7fff;steps++){if(steps>30000)throw Error('Audio routine exceeded CPU instruction budget');cpuStep();}if(emu.SP!==0xfd)throw Error('Audio routine unbalanced the stack');}
  try{call(labels.aud_init);call(labels.aud_frame);return {rom:Array.from(artifact.rom),writes,period:emu.apuRegs[2]|((emu.apuRegs[3]&7)<<8),volume:emu.apuRegs[0]&15,duty:emu.apuRegs[0]>>>6,missed:emu.opsMissed};}finally{cpuWrite=original;}
 });
 const rom=Uint8Array.from(observed.rom);assert.deepEqual(Array.from(rom.slice(0,4)),[78,69,83,26]);assert.ok(rom.length>16384);delete observed.rom;return {...observed,romBytes:rom.length,romSha256:hash(rom)};
}

(async()=>{
 let pw;try{try{pw=require('playwright');}catch(_){pw=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}browser=await pw.chromium.launch({headless:true,...(process.env.FORGE_CHROMIUM?{executablePath:process.env.FORGE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']});}catch(error){report.status='blocked';report.reason=error.message;save();console.log('BLOCKED: Chromium unavailable; zero Audio Tool Import browser checks.');process.exitCode=1;return;}
 report.browser=browser.version();server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});await context.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});});const page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(error.message));let accept=true;page.on('dialog',dialog=>accept?dialog.accept():dialog.dismiss());await page.goto('http://127.0.0.1:'+server.address().port);
 const seed=worldProject();seed.audioRuntime={enabled:true,musicEnabled:true};for(const a of seed.animations)for(const f of a.frames)f.events=(f.events||[]).filter(e=>e.type!=='sound');
 await page.evaluate(project=>{Forge.services.ProjectStore.load(project);S.sfx=[{id:'retained-effect',name:'Retained effect',channel:0,pattern:0,startRow:0,endRow:0}];switchTab('audio');},seed);
 const before=await page.evaluate(()=>({project:Forge.services.ProjectStore.serialize(),patterns:S.patterns.length,instruments:S.instruments.length,sfx:JSON.stringify(S.sfx),scenes:JSON.stringify(S.scenes),history:undoStack.length}));
 await check('Visible file chooser loads an official FamiStudio export and preview is read-only',async()=>{
  assert.equal(await page.locator('#audioToolApply').isDisabled(),true);await choose(page,page.locator('#audioToolChoose'),fixture);await page.waitForFunction(()=>Forge.services.AudioToolImportUI.getState().hasSource&&!Forge.services.AudioToolImportUI.getState().busy);await page.locator('#audioToolPreview').click();await page.waitForFunction(()=>Forge.services.AudioToolImportUI.getState().hasStage&&!Forge.services.AudioToolImportUI.getState().busy);
  assert.equal(await page.evaluate(()=>Forge.services.ProjectStore.serialize()),before.project);assert.match(await page.locator('#audioToolSummary').textContent(),/pattern|instrument/i);assert.equal(await page.locator('#audioToolApply').isDisabled(),false);await screenshot(page,'desktop-preview.png');
 });
 await check('Cancelling confirmation preserves the preview, project and Undo history',async()=>{
  accept=false;await page.locator('#audioToolApply').click();await page.waitForFunction(()=>!Forge.services.AudioToolImportUI.getState().busy);accept=true;assert.equal(await page.evaluate(()=>Forge.services.ProjectStore.serialize()),before.project);assert.equal(await page.evaluate(()=>undoStack.length),before.history);assert.equal(await page.evaluate(()=>Forge.services.AudioToolImportUI.getState().hasStage),true);
 });
 await check('Confirmed import appends editable music, preserves SFX/scenes, and makes exactly one Undo entry',async()=>{
  await page.locator('#audioToolApply').click();await page.waitForFunction(()=>Forge.services.AudioToolImportUI.getState().receiptOutcome==='imported'&&!Forge.services.AudioToolImportUI.getState().busy);
  const after=await page.evaluate(()=>({patterns:S.patterns.length,instruments:S.instruments.length,sfx:JSON.stringify(S.sfx),scenes:JSON.stringify(S.scenes),history:undoStack.length,note:S.patterns[S.orderList[0][0]].rows[0][0].note}));assert.ok(after.patterns>before.patterns&&after.instruments>before.instruments);assert.equal(after.sfx,before.sfx);assert.equal(after.scenes,before.scenes);assert.equal(after.history,before.history+1);assert.equal(after.note,48);await screenshot(page,'desktop-imported.png');
  const imported=await page.evaluate(()=>Forge.services.ProjectStore.serialize());await page.locator('#undoBtn').click();assert.equal(await page.evaluate(()=>Forge.services.ProjectStore.serialize()),before.project);await page.keyboard.press('Control+Shift+z');assert.equal(await page.evaluate(()=>Forge.services.ProjectStore.serialize()),imported);
 });
 await check('Receipt download contains the exact original text and imported outcome',async()=>{
  const receipt=JSON.parse(await download(page,page.locator('#audioToolReceipt'),'import-receipt.json'));assert.equal(receipt.outcome,'imported');assert.equal(receipt.source.text,fs.readFileSync(fixture,'utf8'));assert.equal(receipt.source.sha256,report.fixtureSha256);
 });
 let original;
 await check('Visible Build & Run emits a ROM whose 6502 Audio Runtime writes the imported C4 pulse',async()=>{
  original=await buildAndObserve(page);const expected=await page.evaluate(()=>Forge.services.AudioCompiler.timer(48));assert.equal(original.period,expected);assert.equal(original.volume,12);assert.equal(original.duty,2);assert.equal(original.missed,0);assert.ok(original.writes.some(w=>w.address===0x4002));report.metrics.original=original;
 });
 let editedProject;
 await check('A real tracker click and piano key edit the imported first note',async()=>{
  await page.locator('.tab[data-view="audio"]').click();const geometry=await page.locator('#cv').evaluate(canvas=>{const r=canvas.getBoundingClientRect();return {x:r.left+20*r.width/canvas.width,y:r.top+34*r.height/canvas.height};});await page.mouse.click(geometry.x,geometry.y);await page.keyboard.press('w');assert.equal(await page.evaluate(()=>S.patterns[S.orderList[0][0]].rows[0][0].note),50);editedProject=await page.evaluate(()=>Forge.services.ProjectStore.serialize());await screenshot(page,'desktop-edited.png');
 });
 await check('Visible Save Project As and Open Project preserve the edited score',async()=>{
  const saved=await download(page,page.locator('button[onclick="project_export()"]'),'edited-project.nesforge.json');assert.equal(saved,editedProject);await choose(page,page.getByRole('button',{name:'Open Project',exact:true}),path.join(out,'edited-project.nesforge.json'));await page.waitForFunction(()=>Forge.services.ProjectStore.state.lastIntent==='file-open');assert.equal(await page.evaluate(()=>Forge.services.ProjectStore.serialize()),editedProject);
 });
 await check('Rebuilding after the note edit changes the ROM and actual APU pitch',async()=>{
  const changed=await buildAndObserve(page),expected=await page.evaluate(()=>Forge.services.AudioCompiler.timer(50));assert.equal(changed.period,expected);assert.notEqual(changed.period,original.period);assert.notEqual(changed.romSha256,original.romSha256);assert.equal(changed.missed,0);assert.ok(changed.writes.length>0);report.metrics.edited=changed;
 });
 await check('Phone viewport keeps import controls visible and functional',async()=>{
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>switchTab('audio'));await choose(page,page.locator('#audioToolChoose'),fixture);await page.waitForFunction(()=>Forge.services.AudioToolImportUI.getState().hasSource&&!Forge.services.AudioToolImportUI.getState().busy);await page.locator('#audioToolPreview').click();await page.waitForFunction(()=>Forge.services.AudioToolImportUI.getState().hasStage&&!Forge.services.AudioToolImportUI.getState().busy);assert.equal(await page.locator('#audioToolApply').isEnabled(),true);await page.locator('#audioToolApply').scrollIntoViewIfNeeded();const box=await page.locator('#audioToolApply').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=390);await screenshot(page,'phone-preview.png');
 });
 await check('No uncaught browser errors',()=>assert.deepEqual(report.pageErrors,[]));report.status='passed';save();
})().catch(error=>{report.status='failed';report.error=error.stack;save();console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
