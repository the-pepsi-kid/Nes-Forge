#!/usr/bin/env node
'use strict';
// Replays Guides/Audio.md through visible controls in the packaged application.
// Read-only state observations verify those actions. The final CPU supplement
// executes the actual emitted ROM, not a second generated sound engine.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=__dirname,htmlPath=path.join(root,'NES_Forge.html'),guidePath=path.join(root,'Guides/Audio.md'),out=path.join(root,'review/audio-tutorial');
const html=fs.readFileSync(htmlPath),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(out,{recursive:true});
const report={format:'NESForgeAudioTutorialBrowserReview',version:1,started:new Date().toISOString(),status:'running',html:'NES_Forge.html',htmlSha256:hash(html),guide:'Guides/Audio.md',guideSha256:hash(fs.readFileSync(guidePath)),script:'verify_audio_tutorial.cjs',scriptSha256:hash(fs.readFileSync(__filename)),checks:[],screenshots:[],pageErrors:[],metrics:{},limitations:[
 'Desktop Chromium only. Browser preview transport and note state were observed; audible listening, physical-phone behavior, independent emulators, and NES hardware were not tested.',
 'Save As uses the explicit browser-download fallback with showSaveFilePicker disabled. A real browser download and Open Project file chooser are exercised; the native operating-system Save As dialog is untested.',
 'The CPU supplement locates the audio-frame call in the emitted viewer NMI trampoline and invokes that emitted routine directly. It verifies the authored phrase, cut, and repeat through APU register writes, not full-game or host-audio timing.'
]};
let browser,server,page;
function save(){report.passed=report.checks.filter(x=>x.status==='passed').length;report.failed=report.checks.filter(x=>x.status==='failed').length;report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'Report.json'),JSON.stringify(report,null,2)+'\n');}
async function check(name,fn){try{await fn();report.checks.push({name,status:'passed'});console.log('PASS '+name);}catch(error){report.checks.push({name,status:'failed',error:error.stack});throw error;}}
async function field(selector,value){await page.locator(selector).fill(String(value));await page.locator(selector).press('Tab');}
async function tab(name){await page.locator('.tab[data-view="'+name+'"]').click();}
async function trackerKey(row,key){await page.locator('#cv').scrollIntoViewIfNeeded();const point=await page.locator('#cv').evaluate((canvas,row)=>{const r=canvas.getBoundingClientRect();return{x:r.left+30*r.width/canvas.width,y:r.top+(26+row*18+8)*r.height/canvas.height};},row);await page.mouse.click(point.x,point.y);await page.keyboard.press(key);}
async function audioState(){return page.evaluate(()=>({rows:S.audRows,tempo:S.tempo,speed:S.speed,instruments:JSON.parse(JSON.stringify(S.instruments)),patterns:JSON.parse(JSON.stringify(S.patterns)),order:JSON.parse(JSON.stringify(S.orderList)),runtime:JSON.parse(JSON.stringify(S.audioRuntime))}));}
async function shot(name){await page.screenshot({path:path.join(out,name)});report.screenshots.push({file:name,visualReview:'pending'});}
async function download(button,filename){await button.click();await page.locator('#forgeSaveDialog').waitFor({state:'visible'});await page.locator('#forgeSaveName').fill(filename);const pending=page.waitForEvent('download');await page.locator('#forgeSaveBrowser').click();const result=await pending;const target=path.join(out,filename);await result.saveAs(target);assert.equal(await result.failure(),null);return fs.readFileSync(target);}
async function openProject(filename){const pending=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Open Project',exact:true}).click();await(await pending).setFiles(path.join(out,filename));await page.waitForFunction(()=>Forge.services.ProjectStore.state.lastIntent==='file-open');}

(async()=>{
 let pw;try{try{pw=require('playwright');}catch(_){pw=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}browser=await pw.chromium.launch({headless:true,...(process.env.FORGE_CHROMIUM?{executablePath:process.env.FORGE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']});}catch(error){report.status='blocked';report.reason=error.message;save();process.exitCode=1;return;}
 report.browser=browser.version();server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});await context.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#npNew166').waitFor({state:'visible'});
 await check('New Project creates the documented blank workspace and single-room default',async()=>{
  await page.locator('#npNew166').click();const state=await page.evaluate(()=>({name:S.projectName,scene:S.scenes[S.activeScene].name,instruments:S.instruments.length,entities:S.scenes[S.activeScene].entities.length,mode:S.gameplay.mode,asm:document.getElementById('codeInput').value}));assert.equal(state.name,'My First NES Game');assert.equal(state.scene,'My First Room');assert.equal(state.instruments,0);assert.equal(state.entities,0);assert.equal(state.mode,'single-room');assert.equal(state.asm,'');report.metrics.blankProject=state;
 });
 await check('Visible AUDIO fields set 16 rows, tempo 150 and speed 6, with runtime off',async()=>{
  await tab('audio');await field('#audRows',16);await field('#audTempo',150);await field('#audSpeed',6);const state=await audioState();assert.equal(state.rows,16);assert.equal(state.tempo,150);assert.equal(state.speed,6);assert.equal(state.runtime.enabled,false);assert.equal(await page.locator('#audRuntimeEnabled180').isChecked(),false);
 });
 await check('Add Instrument and Name create the documented Melody instrument',async()=>{
  await page.getByRole('button',{name:'+ Add Instrument',exact:true}).click();await field('#instName','Melody');assert.equal(await page.locator('#instDuty').inputValue(),'2');const state=await audioState();assert.equal(state.instruments.length,1);assert.equal(state.instruments[0].name,'Melody');assert.deepEqual(state.instruments[0].volEnv,[15,14,12,10,8,6,4,2,0]);
 });
 await check('Actual tracker clicks and piano keys enter C4, D4, E4, G4 and the final cut',async()=>{
  for(const [row,key]of [[0,'q'],[4,'w'],[8,'e'],[12,'t'],[15,'Backspace']])await trackerKey(row,key);const state=await audioState(),p=state.patterns[state.order[0][0]];assert.deepEqual([0,4,8,12,15].map(row=>p.rows[row][0].note),[48,50,52,55,-2]);assert.deepEqual([0,4,8,12].map(row=>p.rows[row][0].inst),[0,0,0,0]);assert.equal(await page.evaluate(()=>aud_currentRow),15);assert.ok(p.rows.every(row=>row.slice(1).every(cell=>cell.note===-1)));report.metrics.authoredNotes=[{row:0,note:'C4'},{row:4,note:'D4'},{row:8,note:'E4'},{row:12,note:'G4'},{row:15,note:'cut'}];await shot('audio-authored.png');
 });
 await check('Visible Play and Stop start from order zero, advance the browser preview and stop',async()=>{
  await page.locator('button[onclick="aud_play()"]').click();await page.waitForFunction(()=>aud_playing&&aud_currentRow>0);const playing=await page.evaluate(()=>({playing:aud_playing,row:aud_currentRow,order:aud_currentOrder}));assert.equal(playing.playing,true);assert.equal(playing.order,0);await page.locator('button[onclick="aud_stop()"]').click();assert.equal(await page.evaluate(()=>aud_playing),false);report.metrics.previewTransport=playing;
 });
 await check('The tutorial note edit and one Undo restore the original phrase',async()=>{
  await trackerKey(4,'e');assert.equal(await page.evaluate(()=>S.patterns[S.orderList[0][0]].rows[4][0].note),52);await page.locator('button[onclick="aud_play()"]').click();await page.waitForFunction(()=>aud_playing);await page.locator('button[onclick="aud_stop()"]').click();await page.locator('#undoBtn').click();assert.equal(await page.evaluate(()=>S.patterns[S.orderList[0][0]].rows[4][0].note),50);
 });
 let savedAudio;
 await check('Save Project As performs a real download and Open Project reopens the editable score',async()=>{
  savedAudio=await audioState();const bytes=await download(page.locator('button[onclick="project_export()"]'),'My_First_Forge_Melody.json');const json=JSON.parse(bytes.toString('utf8'));assert.ok(json);report.metrics.projectDownload={file:'My_First_Forge_Melody.json',bytes:bytes.length,sha256:hash(bytes)};await openProject('My_First_Forge_Melody.json');await tab('audio');assert.deepEqual(await audioState(),savedAudio);await page.locator('button[onclick="aud_play()"]').click();await page.waitForFunction(()=>aud_playing);await page.locator('button[onclick="aud_stop()"]').click();
 });
 await check('Visible Gameplay selection and Audio switches prepare a generated music viewer',async()=>{
  await tab('scene');const details=page.locator('#npGameplay166');if(!(await details.getAttribute('open')))await details.locator('summary').first().click();await page.locator('#gpMode165').selectOption('viewer');assert.equal(await page.evaluate(()=>S.gameplay.mode),'viewer');assert.match(await page.locator('#gpStatus165').textContent(),/Scene viewer selected/);await tab('code');assert.equal(await page.locator('#codeInput').inputValue(),'');await tab('audio');await page.locator('#audRuntimeEnabled180').check();await page.locator('#audMusicEnabled180').check();assert.deepEqual(await page.evaluate(()=>S.audioRuntime),{enabled:true,musicEnabled:true});
 });
 let romIdentity;
 await check('Visible Build & Run builds and loads the current music-enabled mapper-0 viewer',async()=>{
  await page.locator('button[onclick="buildAndRun()"]').click();await page.waitForFunction(()=>S.tab==='emu'&&Forge.services.RuntimeCompiler.lastArtifact?.rom?.length>0);const result=await page.evaluate(()=>{const a=Forge.services.RuntimeCompiler.lastArtifact;return{rom:Array.from(a.rom),backend:a.backend,mode:a.plan.source.gameplay.mode,audio:{enabled:a.plan.audio.enabled,musicEnabled:a.plan.audio.musicEnabled,records:a.plan.audio.records.length},buildLog:document.getElementById('buildLog').textContent,loaded:emu.loaded,loadedRomMatches:emu.lastBuiltRom?.length===a.rom.length&&a.rom.every((v,i)=>v===emu.lastBuiltRom[i])};});const bytes=Uint8Array.from(result.rom);assert.deepEqual(Array.from(bytes.slice(0,4)),[78,69,83,26]);assert.equal(bytes[6]>>4,0);assert.equal(result.backend,'packed');assert.equal(result.mode,'viewer');assert.deepEqual(result.audio,{enabled:true,musicEnabled:true,records:4});assert.equal(result.loaded,true);assert.equal(result.loadedRomMatches,true);assert.match(result.buildLog,/Built packed NROM/);delete result.rom;romIdentity={bytes:bytes.length,sha256:hash(bytes)};report.metrics.build={...result,...romIdentity};await shot('audio-rom-running.png');
 });
 await check('The emitted 6502 viewer plays all four pulse periods, cuts, and repeats in controlled APU observations',async()=>{
  const observed=await page.evaluate(()=>{
   emuPause();const rom=Forge.services.RuntimeCompiler.lastArtifact.rom;if(!emuLoadRomData(rom,'Audio tutorial emitted ROM proof',0))throw Error('Generated ROM did not load');
   const prgSize=rom[4]*16384,offset=address=>16+((address-0x8000)%prgSize),word=address=>rom[offset(address)]|(rom[offset(address+1)]<<8),nmi=word(0xfffa);
   const trampoline=Array.from({length:11},(_,i)=>rom[offset(nmi+i)]);if(JSON.stringify(trampoline.slice(0,6))!==JSON.stringify([0x48,0x8a,0x48,0x98,0x48,0x20])||trampoline[8]!==0x20)throw Error('Emitted viewer NMI trampoline not recognized');const frameAddress=trampoline[9]|trampoline[10]<<8;
   let writes=0,pulsePeriodWrites=0;const original=cpuWrite;cpuWrite=function(address,value){if(address>=0x4000&&address<=0x4017)writes++;if(address===0x4002)pulsePeriodWrites++;return original(address,value);};
   const wanted=new Set([0,24,48,72,90,96]),frames=[];let totalInstructions=0;
   try{for(let frame=0;frame<=96;frame++){emu.A=0;emu.X=0;emu.Y=0;emu.PC=frameAddress;emu.SP=0xfd;emu.I=1;cpuPush(0x7f);cpuPush(0xfe);let steps=0;while(emu.PC!==0x7fff){if(++steps>30000)throw Error('Audio frame exceeded instruction budget');cpuStep();}totalInstructions+=steps;if(emu.SP!==0xfd)throw Error('Audio frame unbalanced stack');if(wanted.has(frame))frames.push({frame,period:emu.apuRegs[2]|((emu.apuRegs[3]&7)<<8),volume:emu.apuRegs[0]&15,duty:emu.apuRegs[0]>>>6});}return{nmiAddress:nmi,audioFrameAddress:frameAddress,trampoline,frames,apuWrites:writes,pulsePeriodWrites,totalInstructions,missedOpcodes:emu.opsMissed};}finally{cpuWrite=original;}
  });
  assert.deepEqual(observed.frames.slice(0,4).map(x=>x.period),[427,380,338,284]);assert.ok(observed.frames.slice(0,4).every(x=>x.volume===15&&x.duty===2));assert.equal(observed.frames[4].volume,0);assert.equal(observed.frames[5].period,427);assert.equal(observed.frames[5].volume,15);assert.equal(observed.missedOpcodes,0);assert.ok(observed.apuWrites>0&&observed.pulsePeriodWrites>0);report.metrics.emittedAudio=observed;
 });
 await check('Build .NES ROM downloads the same music output and saved project retains runtime choices',async()=>{
  const bytes=await download(page.locator('button[onclick="buildNesRom()"]'),'My_First_Forge_Melody.nes');assert.equal(hash(bytes),romIdentity.sha256);report.metrics.romDownload={file:'My_First_Forge_Melody.nes',bytes:bytes.length,sha256:hash(bytes)};const project=await download(page.locator('button[onclick="project_export()"]'),'My_First_Forge_Melody_Runtime.json');report.metrics.runtimeProjectDownload={file:'My_First_Forge_Melody_Runtime.json',bytes:project.length,sha256:hash(project)};await openProject('My_First_Forge_Melody_Runtime.json');assert.equal(await page.evaluate(()=>S.gameplay.mode),'viewer');assert.deepEqual(await page.evaluate(()=>S.audioRuntime),{enabled:true,musicEnabled:true});
 });
 await check('No uncaught browser errors',()=>assert.deepEqual(report.pageErrors,[]));report.status='passed';save();
})().catch(async error=>{report.status='failed';report.error=error.stack;if(page)try{await shot('failure.png');}catch(_){}save();console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
