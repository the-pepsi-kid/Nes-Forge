#!/usr/bin/env node
'use strict';
// The complete bundled candidate, inherited DOM harness and real ROM/frame
// routines exercise lifecycle/input integration. This is not visual/device QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
// Record document listeners in a test-local copy of the inherited harness so
// keyboard propagation runs the candidate's real handlers, including Save As.
// No application source/function is rewritten and the shared harness is intact.
const Module=require('node:module'),harnessPath=require.resolve('./harness.cjs');
const harnessSource=fs.readFileSync(harnessPath,'utf8'),documentEventStub='addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,';
assert.equal(harnessSource.split(documentEventStub).length,2,'Expected one document event stub');
const eventHarness=new Module(harnessPath,module);eventHarness.filename=harnessPath;eventHarness.paths=module.paths;
eventHarness._compile(harnessSource.replace(documentEventStub,'_testListeners: [], addEventListener(type, fn, options) { this._testListeners.push({type,fn,capture:options===true||!!options?.capture}); }, removeEventListener: noop, dispatchEvent: noop,'),harnessPath);
const loadWithDocumentEvents=eventHarness.exports.loadForge;
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const tests=[],test=(name,fn)=>tests.push({name,fn});
function pad(index=0){return {index,id:'Test controller '+index,mapping:'standard',connected:true,buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]};}
function press(device,index,value=true){device.buttons[index]={pressed:value,value:value?1:0};}
function loopRom(){const bytes=new Uint8Array(16+16384+8192);bytes.set([78,69,83,26,1,1]);bytes.set([0x4c,0,0xc0],16);for(const offset of [0x3ffa,0x3ffc,0x3ffe])bytes.set([0,0xc0],16+offset);return bytes;}
function fresh({devices=[],width=390,documentEvents=false,environment={}}={}){
  const state={devices},navigator={userAgent:'Node mobile play harness',platform:'test',clipboard:{writeText:async()=>{}},getGamepads:()=>state.devices};
  const h=(documentEvents?loadWithDocumentEvents:loadForge)(html,{environment:{navigator,innerWidth:width,...environment}});h.input=h.context.Forge.services.EmulatorInput;h.play=h.context.Forge.services.EmulatorPlay;h.pads=state;
  assert.ok(h.play,'Actual candidate must include Play UI');assert.deepEqual(h.errors,[]);
  h.focuses=[];for(const id of ['emuCanvas','emuPlayLaunch','emuPlayGamepad','emuPlayRun','emuPlaySettingsDone'])h.get(id).focus=()=>{h.context.document.activeElement=h.get(id);h.focuses.push(id);};
  h.context.mobileRom=loopRom();assert.equal(h.run('emuLoadRomData(mobileRom,"mobile play loop",0)'),true);h.run('S.tab="emu";emu.running=true');h.play.setTouchVisible(true);return h;
}
function dispatch(el,type,properties={}){const e={type,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...properties};el.dispatchEvent(e);return e;}
function pointer(h,id,type,pointerId,x=0,y=0){return dispatch(h.get(id),type,{pointerId,pointerType:'touch',button:0,clientX:x,clientY:y});}
function dpad(h){const el=h.get('emuPlayDpad');el.getBoundingClientRect=()=>({left:0,top:0,width:132,height:132});return el;}
function joy(h){return h.run('emuReadJoyState()');}
function keyThroughDocument(h,target,properties){
  const event={type:'keydown',target,key:'s',code:'KeyS',preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;this.immediate=true;},...properties};
  const path=[];for(let el=target;el;el=el.parentNode)path.push(el);
  const listeners=h.context.document._testListeners;
  for(const item of listeners.filter(item=>item.type==='keydown'&&item.capture)){item.fn(event);if(event.stopped)return event;}
  for(const el of path){el.dispatchEvent?.(event);if(event.stopped)return event;}
  for(const item of listeners.filter(item=>item.type==='keydown'&&!item.capture)){item.fn(event);if(event.immediate)return event;}
  return event;
}

test('Play UI startup preserves intrinsic canvas size and accurately labels default touch visibility',()=>{
  const desktop=loadForge(html,{environment:{innerWidth:1280}}),mobile=loadForge(html,{environment:{innerWidth:390}});
  for(const h of [desktop,mobile]){assert.deepEqual(h.errors,[]);assert.equal(h.get('emuCanvas').width,256);assert.equal(h.get('emuCanvas').height,240);assert.equal(h.context.Forge.services.EmulatorPlay.isExpanded(),false);}
  assert.equal(desktop.get('emuPlayTouchToggle').textContent,'Show touch');assert.equal(mobile.get('emuPlayTouchToggle').textContent,'Hide touch');
});
test('Enter and exit retain the same canvas, ROM, framebuffer, running state and editor project',()=>{
  const h=fresh(),canvas=h.get('emuCanvas'),parent=canvas.parentNode,rom=h.run('emu.lastBuiltRom'),frame=h.run('emu.frameBuffer'),project=h.json('projectData()');h.run('emuRunFrame()');const before=h.json('({frame:emu.frameCount,pc:emu.PC,running:emu.running})');
  h.context.document.body.style.overflow='auto';h.play.enter();assert.equal(h.play.isExpanded(),true);assert.equal(h.get('emuPlayPanel').parentNode,h.context.document.body);assert.equal(h.get('emuCanvas'),canvas);assert.equal(h.get('emuCanvas').parentNode,parent);assert.equal(h.context.document.body.style.overflow,'hidden');
  h.play.exit();assert.equal(h.play.isExpanded(),false);assert.equal(h.get('emuCanvas'),canvas);assert.equal(h.run('emu.lastBuiltRom'),rom);assert.equal(h.run('emu.frameBuffer'),frame);assert.deepEqual(h.json('({frame:emu.frameCount,pc:emu.PC,running:emu.running})'),before);assert.deepEqual(h.json('projectData()'),project);assert.equal(h.context.document.body.style.overflow,'auto');
});
test('Expanded view hides editor siblings from focus/assistive access and restores their prior values',()=>{
  const h=fresh(),background=h.context.document.createElement('div');background.inert=false;background.setAttribute('aria-hidden','false');h.context.document.body.appendChild(background);h.play.enter();assert.equal(background.inert,true);assert.equal(background.getAttribute('aria-hidden'),'true');h.play.exit();assert.equal(background.inert,false);assert.equal(background.getAttribute('aria-hidden'),'false');
});
test('Protected Save As exits expanded view, restores dialog access and preserves its focused field',()=>{
  const h=fresh(),dialog=h.get('forgeSaveDialog'),before=h.metrics().downloadClicks;h.play.enter();assert.equal(dialog.inert,true);h.run('forgeSave.request(new Uint8Array([1,2,3]),"play-save-test.nes")');h.context.document.activeElement=h.get('forgeSaveName');const focusCount=h.focuses.length;h.play.refresh();assert.equal(h.play.isExpanded(),false);assert.notEqual(dialog.inert,true);assert.notEqual(dialog.getAttribute('aria-hidden'),'true');assert.equal(h.context.document.activeElement,h.get('forgeSaveName'));assert.equal(h.focuses.length,focusCount);assert.equal(h.metrics().downloadClicks,before);assert.equal(h.input.status().blocked,true);h.run('forgeSave.cancel()');
});
test('Ctrl and Command Save reach the actual protected export handler from focused player controls',()=>{
  for(const modifier of ['ctrlKey','metaKey'])for(const id of ['emuPlayRun','emuPlaySound','emuPlayA','emuPlayController','emuPlayLaunch']){
    const h=fresh({documentEvents:true});h.play.enter();const target=h.get(id);h.context.document.activeElement=target;const downloads=h.metrics().downloadClicks;
    const event=keyThroughDocument(h,target,{[modifier]:true});assert.equal(event.defaultPrevented,true,modifier+' '+id+' handled by original export shortcut');assert.equal(h.play.isExpanded(),false);assert.ok(h.context.forgeSave.lastPromise,modifier+' '+id+' opened actual Save As');assert.notEqual(h.get('forgeSaveDialog').getAttribute('open'),null);assert.notEqual(h.get('forgeSaveDialog').inert,true);assert.equal(h.metrics().downloadClicks,downloads);h.run('forgeSave.cancel()');
  }
});
test('Real pointer controls combine D-pad movement with A and B and release individual fingers',()=>{
  const h=fresh();dpad(h);pointer(h,'emuPlayDpad','pointerdown',1,120,66);pointer(h,'emuPlayA','pointerdown',2);pointer(h,'emuPlayB','pointerdown',3);assert.equal(joy(h),131);
  h.run('emuRunFrame()');assert.equal(h.run('emu.frameCount'),1);assert.equal(joy(h),131);
  pointer(h,'emuPlayA','pointerup',2);assert.equal(joy(h),130);pointer(h,'emuPlayDpad','pointermove',1,12,12);assert.equal(joy(h),82);pointer(h,'emuPlayDpad','pointermove',1,66,66);assert.equal(joy(h),2);pointer(h,'emuPlayB','pointercancel',3);assert.equal(joy(h),0);
});
test('Lost capture, leaving D-pad bounds and hiding controls never leave a NES button held',()=>{
  const h=fresh();dpad(h);pointer(h,'emuPlayDpad','pointerdown',10,12,66);pointer(h,'emuPlayDpad','pointermove',10,-12,66);assert.equal(joy(h),0);pointer(h,'emuPlayDpad','pointermove',10,12,66);assert.equal(joy(h),64);pointer(h,'emuPlayDpad','lostpointercapture',10);assert.equal(joy(h),0);
  pointer(h,'emuPlayA','pointerdown',11);h.play.setTouchVisible(false);assert.equal(joy(h),0);assert.equal(h.get('emuPlayTouchToggle').textContent,'Show touch');h.play.setTouchVisible(true);pointer(h,'emuPlayDpad','pointermove',10,120,66);assert.equal(joy(h),0);
});
test('Pause/resume invalidates old touch-pointer ownership until a new pointerdown',()=>{
  const h=fresh();dpad(h);pointer(h,'emuPlayDpad','pointerdown',12,120,66);assert.equal(joy(h),128);h.run('emuPause();emuToggleRun()');pointer(h,'emuPlayDpad','pointermove',12,12,66);assert.equal(joy(h),0);pointer(h,'emuPlayDpad','pointerdown',13,12,66);assert.equal(joy(h),64);
});
test('Touch buttons are keyboard accessible without leaking Enter into NES Start',()=>{
  const h=fresh(),button=h.get('emuPlayA'),down=dispatch(button,'keydown',{key:'Enter',repeat:false});assert.equal(down.defaultPrevented,true);assert.equal(down.stopped,true);assert.equal(joy(h),1);dispatch(button,'keyup',{key:'Enter'});assert.equal(joy(h),0);
  const toolbarEvent=dispatch(h.get('emuPlayPanel'),'keydown',{key:'Enter',target:h.get('emuPlayRun')});assert.equal(toolbarEvent.stopped,true);assert.notEqual(toolbarEvent.defaultPrevented,true);
  const launcher=dispatch(h.get('emuPlayLaunch'),'keydown',{key:'Enter'});assert.equal(launcher.stopped,true);assert.notEqual(launcher.defaultPrevented,true);
});
test('Controller settings pause playback, block input, and leave resumption explicit',()=>{
  const h=fresh();pointer(h,'emuPlayA','pointerdown',1);const count=h.run('emu.frameCount');h.play.openSettings();assert.equal(h.play.isSettingsOpen(),true);assert.equal(h.run('emu.running'),false);assert.equal(joy(h),0);assert.equal(h.input.status().blocked,true);h.run('emuKeys.Enter=true');assert.equal(joy(h),0);h.play.closeSettings();assert.equal(h.play.isSettingsOpen(),false);assert.equal(h.input.status().blocked,false);assert.equal(h.run('emu.running'),false);assert.equal(h.run('emu.frameCount'),count);h.get('emuPlayRun').click();assert.equal(h.run('emu.running'),true);
});
test('Controller mapper waits for release and captures a button or signed axis with input blocked',()=>{
  const device=pad(),h=fresh({devices:[device]});h.play.tick();h.play.openSettings();press(device,0);h.get('emuPlayBindA').click();h.play.tick();assert.match(h.get('emuPlaySettingsStatus').textContent,/release all/);assert.equal(h.input.status().bindings.A,'button:0');press(device,0,false);h.play.tick();press(device,3);h.play.tick();assert.equal(h.input.status().bindings.A,'button:3');assert.equal(joy(h),0);
  press(device,3,false);h.get('emuPlayBindLeft').click();h.play.tick();device.axes[2]=-.9;h.play.tick();assert.equal(h.input.status().bindings.Left,'axis:2:-1');h.play.closeSettings();assert.equal(h.input.status().waitingForNeutral,true);assert.equal(h.run('emu.running'),false);
});
test('Player status reflects controller selection, neutralization and disconnect',()=>{
  const device=pad(),h=fresh({devices:[device]});h.play.tick();assert.match(h.get('emuPlayStatus').textContent,/Test controller 0.*Ready/);h.input.release('test');h.play.refresh();assert.match(h.get('emuPlayStatus').textContent,/Release controls/);h.pads.devices=[];h.play.tick();assert.match(h.get('emuPlayStatus').textContent,/Connect.*controller/);
});
test('Fullscreen unsupported and rejected requests retain usable expanded play without resetting state',async()=>{
  const h=fresh(),before=h.run('emu.frameCount');assert.equal(await h.play.requestFullscreen(),false);assert.equal(h.play.isExpanded(),true);assert.match(h.get('emuPlayStatus').textContent,/fullscreen unavailable/);h.get('emuPlayPanel').requestFullscreen=()=>Promise.reject(Error('Denied'));assert.equal(await h.play.requestFullscreen(),false);h.play.tick();assert.match(h.get('emuPlayStatus').textContent,/fullscreen unavailable/);assert.equal(h.run('emu.frameCount'),before);assert.equal(h.run('emu.running'),true);h.play.exit();
});
test('Successful container fullscreen includes the original canvas and cleans up on exit',async()=>{
  const h=fresh(),panel=h.get('emuPlayPanel');let exits=0;panel.requestFullscreen=()=>{h.context.document.fullscreenElement=panel;return Promise.resolve();};h.context.document.exitFullscreen=()=>{exits++;h.context.document.fullscreenElement=null;return Promise.resolve();};assert.equal(await h.play.requestFullscreen(),true);assert.equal(h.get('emuCanvas').parentNode.parentNode.parentNode,panel);h.play.exit();assert.equal(exits,1);assert.equal(h.play.isExpanded(),false);
});
test('A late rejected fullscreen request cannot steal focus after Exit',async()=>{
  const h=fresh();let reject;h.get('emuPlayPanel').requestFullscreen=()=>new Promise((resolve,rej)=>{reject=rej;});const request=h.play.requestFullscreen();h.play.exit();const focusCount=h.focuses.length;reject(Error('Late denial'));await request;assert.equal(h.play.isExpanded(),false);assert.equal(h.focuses.length,focusCount);
});
test('A late successful fullscreen request is dismissed, and concurrent requests do not overlap',async()=>{
  const h=fresh(),panel=h.get('emuPlayPanel');let resolve,calls=0,exits=0;panel.requestFullscreen=()=>{calls++;return new Promise(done=>{resolve=done;});};h.context.document.exitFullscreen=()=>{exits++;h.context.document.fullscreenElement=null;return Promise.resolve();};const request=h.play.requestFullscreen();h.play.exit();h.play.enter();assert.equal(await h.play.requestFullscreen(),false);assert.equal(calls,1);h.context.document.fullscreenElement=panel;resolve();await request;assert.equal(exits,1);assert.equal(h.play.isExpanded(),true);assert.equal(h.context.document.fullscreenElement,null);h.play.exit();
});
test('Changing editor tab exits expanded view, closes settings and releases touch input',()=>{
  const h=fresh();h.play.enter();h.play.tick();pointer(h,'emuPlayA','pointerdown',1);h.run('S.tab="scene"');h.play.tick();assert.equal(h.play.isExpanded(),false);assert.equal(h.input.status().touchMask,0);assert.equal(h.context.document.body.style.overflow,'');
});
test('Play settings retain native selector keyboard behavior while containing Escape',()=>{
  const h=fresh();h.play.enter();h.play.openSettings();const event=dispatch(h.get('emuPlayPanel'),'keydown',{key:'ArrowDown',target:h.get('emuPlayGamepad')});assert.equal(event.stopped,true);assert.notEqual(event.defaultPrevented,true);dispatch(h.get('emuPlayPanel'),'keydown',{key:'Escape',target:h.get('emuPlaySettingsDone')});assert.equal(h.play.isSettingsOpen(),false);assert.equal(h.play.isExpanded(),true);dispatch(h.get('emuPlayPanel'),'keydown',{key:'Escape',target:h.get('emuCanvas')});assert.equal(h.play.isExpanded(),false);
});

// Observe presentation calls, not elapsed time: this harness cannot measure
// phone FPS, browser layout/compositing or speaker latency.
function sidebarWrites(h){
  const doc=h.context.document,get=doc.getElementById,palette=h.get('emuPalView');let writes=0;
  const watched=new Proxy(palette,{set(target,key,value){if(key==='innerHTML')writes++;return Reflect.set(target,key,value);}});
  doc.getElementById=id=>id==='emuPalView'?watched:get.call(doc,id);
  return ()=>writes;
}
function canvasSizing(h){
  const screen=h.get('emuCanvas').parentNode,panel=h.get('emuPlayPanel'),style={},writes=[];let reads=0,rect={width:512,height:480};
  screen.getBoundingClientRect=()=>{reads++;return rect;};
  panel.style.setProperty=(name,value)=>{writes.push([name,value]);style[name]=value;};
  return {screen,style,writes,reads:()=>reads,resize:(width,height)=>{rect={width,height};}};
}
test('Expanded rendering preserves canvas uploads and frame state without rebuilding the hidden sidebar',()=>{
  const h=fresh(),writes=sidebarWrites(h),ctx=h.get('emuCanvas').getContext('2d');let uploads=0;
  ctx.putImageData=()=>uploads++;h.play.enter();h.run('emuRunFrame()');const state=h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles})'),buffer=h.run('emu.frameBuffer');
  for(let i=0;i<60;i++)h.run('renderEmu()');
  assert.equal(uploads,60);assert.equal(writes(),0);assert.equal(h.run('emu.frameBuffer'),buffer);assert.deepEqual(h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles})'),state);
  h.run('emu.palRam[0]=33;emu.ppuCtrl=19');h.play.exit();assert.equal(writes(),1);assert.match(h.get('emuPalView').innerHTML,/title="\$21"/);assert.equal(h.get('ePpuCtrl').textContent,'$13');
  h.run('renderEmu()');assert.equal(writes(),2);assert.equal(uploads,61);
});
test('Tab, Save As and fullscreen exits flush deferred sidebar presentation once',async()=>{
  for(const reason of ['tab','dialog','fullscreen']){
    const h=fresh(),writes=sidebarWrites(h);h.play.enter();h.run('renderEmu()');assert.equal(writes(),0);
    if(reason==='tab'){h.run('S.tab="scene"');h.play.refresh();}
    else if(reason==='dialog'){h.run('forgeSave.request(new Uint8Array([1]),"sidebar-check.nes")');h.play.refresh();h.run('forgeSave.cancel()');}
    else{const panel=h.get('emuPlayPanel');panel.requestFullscreen=()=>{h.context.document.fullscreenElement=panel;return Promise.resolve();};h.context.document.exitFullscreen=()=>{h.context.document.fullscreenElement=null;return Promise.resolve();};await h.play.requestFullscreen();h.play.exit();}
    assert.equal(h.play.isExpanded(),false,reason);assert.equal(writes(),1,reason);h.play.exit();assert.equal(writes(),1,reason+' repeat exit');
  }
});
test('Entering and exiting without a deferred redraw does not invent sidebar work',()=>{
  const h=fresh(),writes=sidebarWrites(h);h.play.enter();h.play.exit();h.play.exit();assert.equal(writes(),0);
});
test('ResizeObserver-supported stable play avoids periodic layout reads and unchanged CSS writes',()=>{
  const observers=[];
  class Observer{constructor(fn){this.fn=fn;this.targets=[];observers.push(this);}observe(el){this.targets.push(el);}disconnect(){}}
  const h=fresh({environment:{ResizeObserver:Observer}}),size=canvasSizing(h);h.play.enter();
  assert.equal(size.style['--emu-play-canvas-width'],'512px');assert.equal(size.style['--emu-play-canvas-height'],'480px');
  const reads=size.reads(),writes=size.writes.length;for(let i=0;i<25;i++)h.play.tick();
  assert.equal(size.reads(),reads);assert.equal(size.writes.length,writes);
  const observer=observers.find(o=>o.targets.includes(size.screen));assert.ok(observer);size.resize(300,300);observer.fn();
  assert.equal(size.style['--emu-play-canvas-width'],'300px');assert.equal(size.style['--emu-play-canvas-height'],'281px');assert.equal(size.writes.length,writes+2);
  observer.fn();assert.equal(size.writes.length,writes+2);
});
test('Without ResizeObserver the timer detects size changes but skips equal size writes',()=>{
  const h=fresh({environment:{ResizeObserver:undefined}}),size=canvasSizing(h);h.play.enter();const writes=size.writes.length,reads=size.reads();
  for(let i=0;i<5;i++)h.play.tick();assert.equal(size.reads(),reads+5);assert.equal(size.writes.length,writes);
  size.resize(256,240);h.play.tick();assert.equal(size.style['--emu-play-canvas-width'],'256px');assert.equal(size.style['--emu-play-canvas-height'],'240px');assert.equal(size.writes.length,writes+2);
});
test('Touch visibility and reentry still fit canvas while paused without advancing the ROM',()=>{
  const h=fresh(),size=canvasSizing(h);h.run('emuPause()');const frame=h.run('emu.frameCount');h.play.enter();size.resize(768,720);h.play.setTouchVisible(false);assert.equal(size.style['--emu-play-canvas-width'],'768px');
  h.play.exit();size.resize(320,300);h.play.enter();assert.equal(size.style['--emu-play-canvas-width'],'320px');assert.equal(size.style['--emu-play-canvas-height'],'300px');assert.equal(h.run('emu.frameCount'),frame);assert.equal(h.run('emu.running'),false);
});

(async()=>{const results=[];for(const {name,fn} of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}const passed=results.filter(r=>r.passed).length,report={suite:'emulator-play-ui-mobile',html:path.basename(html),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Complete standalone candidate with inherited mock DOM; real ROM/frame lifecycle, pointer controls and controller settings, fullscreen success/denial/races. No real layout, native user activation, physical controller, audio or browser/device acceptance.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})().catch(error=>{console.error(error);process.exitCode=1;});
