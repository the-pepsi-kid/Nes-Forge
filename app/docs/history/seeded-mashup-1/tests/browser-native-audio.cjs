'use strict';
// Native Audio real-browser supplement. A blocked launch records zero checks;
// Includes the licensed independent input and unknown-input refusal.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),htmlPath=path.resolve(process.argv[2]||path.join(root,manifest.output)),html=fs.readFileSync(htmlPath),out=path.resolve(process.argv[3]||path.join(root,'test-results/browser-native-audio'));fs.mkdirSync(out,{recursive:true});
const report={format:'NESForgeNativeAudioBrowserQA',version:1,html:path.relative(root,htmlPath),sha256:crypto.createHash('sha256').update(html).digest('hex'),started:new Date().toISOString(),status:'running',checks:[],screenshots:[],pageErrors:[],limitations:['Viewport emulation does not establish physical-device, native keyboard, listening or hardware acceptance.','Native ROM edits are not canonical AUDIO tracker import.','Screenshots require visual review.']};
let browser,server;const save=()=>{report.passed=report.checks.filter(check=>check.status==='passed').length;report.failed=report.checks.filter(check=>check.status==='failed').length;report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'Report.json'),JSON.stringify(report,null,2)+'\n');};
async function check(name,fn){try{await fn();report.checks.push({name,status:'passed'});}catch(error){report.checks.push({name,status:'failed',error:error.stack});}}
(async()=>{let pw;try{try{pw=require('playwright');}catch(error){pw=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}browser=await pw.chromium.launch({headless:true});}catch(error){report.status='blocked';report.reason=error.message;save();console.log('BLOCKED: Chromium unavailable; zero Native Audio browser checks.');return;}
 report.browser=browser.version();server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 for(const [name,viewport,mobile]of[['desktop',{width:1280,height:900},false],['phone',{width:390,height:844},true]]){const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
  await check(name+' Native Audio panel and controls are integrated',async()=>{await page.evaluate(()=>switchTab('disasm'));assert.equal(await page.locator('#reNativeAudioPanel').count(),1);for(const id of ['reNativeAudioAnalyze','reNativeAudioStatus','reNativeAudioApply','reNativeAudioUndo','reNativeAudioRedo','reNativeAudioDownloadRom','reNativeAudioDownloadReport'])assert.equal(await page.locator('#'+id).count(),1,id);assert.equal(await page.locator('#reNativeAudioStatus').getAttribute('role'),'status');});
  await check(name+' independent native note edit and Undo/Redo through visible controls',async()=>{
   const input=Array.from(fs.readFileSync(path.join(root,'examples/RE_Native_Audio/HonkeyPong-reproduced.nes')));
   const projectBefore=await page.evaluate(()=>Forge.services.ProjectStore.serialize());
   await page.evaluate(async bytes=>{const rom=new Uint8Array(bytes);await Forge.services.REAnalysisUI.openFile({name:'Independent native music.nes',size:rom.length,arrayBuffer:async()=>rom.slice().buffer});},input);
   await page.locator('#reNativeAudioAnalyze').click();
   await page.waitForFunction(()=>Forge.services.RENativeAudioUI.getState().hasSession&&!Forge.services.RENativeAudioUI.getState().busy);
   const original=await page.evaluate(()=>Forge.services.RENativeAudioUI.getState().currentSha256);
   assert.equal(original,crypto.createHash('sha256').update(Buffer.from(input)).digest('hex'));
   const option=await page.locator('#reNativeAudioCommand').evaluate(el=>Array.from(el.options).map(o=>({value:o.value,label:o.textContent})).find(o=>/· note \d+ ·/.test(o.label)));
   assert.ok(option,'A supported native note must be visible');
   const note=Number(option.label.match(/· note (\d+) ·/)[1]);
   await page.locator('#reNativeAudioCommand').selectOption(option.value);
   await page.locator('#reNativeAudioNote').fill(String(note===60?59:note+1));
   await page.locator('#reNativeAudioApply').click();
   await page.waitForFunction(old=>{const s=Forge.services.RENativeAudioUI.getState();return !s.busy&&s.currentSha256!==old;},original);
   const modified=await page.evaluate(()=>Forge.services.RENativeAudioUI.getState().currentSha256);
   await page.locator('#reNativeAudioUndo').click();
   await page.waitForFunction(old=>{const s=Forge.services.RENativeAudioUI.getState();return !s.busy&&s.currentSha256===old;},original);
   await page.locator('#reNativeAudioRedo').click();
   await page.waitForFunction(expected=>{const s=Forge.services.RENativeAudioUI.getState();return !s.busy&&s.currentSha256===expected;},modified);
   assert.equal(await page.evaluate(()=>Forge.services.ProjectStore.serialize()),projectBefore);
   await page.screenshot({path:path.join(out,name+'-native-audio-edit.png')});report.screenshots.push({file:name+'-native-audio-edit.png',visualReview:'pending'});
  });
  await check(name+' unknown ROM refuses a native edit session and preserves project/emulator',async()=>{const result=await page.evaluate(async()=>{const before=Forge.services.ProjectStore.serialize(),wasLoaded=emu.loaded,rom=emu.lastBuiltRom;const bytes=new Uint8Array(16+16384);bytes.set([78,69,83,26,1,0]);bytes.fill(0xea,16);bytes.set([0,0xc0,0,0xc0,0,0xc0],bytes.length-6);await Forge.services.REAnalysisUI.openFile({name:'Unknown native-audio engine.nes',size:bytes.length,arrayBuffer:async()=>bytes.slice().buffer});await Forge.services.RENativeAudioUI.analyze();const state=Forge.services.RENativeAudioUI.getState();return {status:state.status,hasSession:state.hasSession,projectUnchanged:before===Forge.services.ProjectStore.serialize(),emulatorUnchanged:emu.loaded===wasLoaded&&emu.lastBuiltRom===rom};});assert.ok(['unknown','invalid'].includes(result.status));assert.equal(result.hasSession,false);assert.equal(result.projectUnchanged,true);assert.equal(result.emulatorUnchanged,true);assert.equal(await page.locator('#reNativeAudioApply').isDisabled(),true);assert.equal(await page.locator('#reNativeAudioDownloadRom').isDisabled(),true);});
  await page.screenshot({path:path.join(out,name+'-native-audio.png')});report.screenshots.push({file:name+'-native-audio.png',visualReview:'pending'});await context.close();
 }
 await check('No uncaught browser errors',()=>assert.deepEqual(report.pageErrors,[]));report.status=report.checks.some(check=>check.status==='failed')?'failed':'passed';save();if(report.status==='failed')process.exitCode=1;
})().catch(error=>{report.status='failed';report.error=error.stack;save();process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
