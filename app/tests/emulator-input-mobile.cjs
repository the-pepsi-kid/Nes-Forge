#!/usr/bin/env node
'use strict';
// Full candidate script + actual NES controller latch. Mock gamepads exercise
// input/lifecycle contracts; these tests do not establish hardware compatibility.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const {referenceSource,verifyRuntimeReference}=require('./source-preservation200.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const tests=[],test=(name,fn)=>tests.push({name,fn});
function pad(index=0,id='Test controller',mapping='standard'){return {index,id,mapping,connected:true,buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0]};}
function press(device,index,value=true){device.buttons[index]={pressed:value,value:value?1:0};}
function fresh({devices=[],unsupported=false,denied=false}={}){
  const state={devices,denied,calls:0};
  const navigator={userAgent:'Node mobile input harness',platform:'test',clipboard:{writeText:async()=>{}}};
  if(!unsupported)navigator.getGamepads=()=>{state.calls++;if(state.denied)throw Error('SecurityError');return state.devices;};
  const h=loadForge(html,{environment:{navigator}});h.input=h.context.Forge.services.EmulatorInput;h.pads=state;
  assert.ok(h.input,'Input module must be present in the actual bundled candidate');
  assert.deepEqual(h.errors,[]);h.run('S.tab="emu";emu.running=true');return h;
}
function joy(h){return h.run('emuReadJoyState()');}
function loopRom(){const bytes=new Uint8Array(16+16384+8192);bytes.set([78,69,83,26,1,1]);bytes.set([0x4c,0,0xc0],16);for(const offset of[0x3ffa,0x3ffc,0x3ffe])bytes.set([0,0xc0],16+offset);return bytes;}
function load(h){h.context.mobileRom=loopRom();assert.equal(h.run('emuLoadRomData(mobileRom,"input loop",0)'),true);h.run('S.tab="emu";emu.running=true');}

test('Only enumerated mobile, RE and exact audio correction changes affect the corrected baseline sources',()=>{
  verifyRuntimeReference();
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline/1.9.0-corrected-build-inputs.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
  const exceptions=new Set(['src/services/release-info.js','src/services/documentation.js']);
  for(const input of baseline.inputs){
    if(exceptions.has(input.path))continue;
    let source=referenceSource(input.path);
    // Recognize only the two exact D048-approved edits; every other byte keeps
    // its original hash guard, including the emulator and project lifecycle.
    if(input.path==='src/shell-prefix.html'){
      const label='>RE / DISASM</button>';
      assert.equal(source.split(label).length,2,'Exactly one renamed RE tab');
      source=source.replace(label,'>DISASM</button>');
    }
    if(input.path==='src/services/project-store.js'){
      const guard="  if(d&&typeof d==='object'&&['NESForgeREInspection','NESForgeREPreviewEvidence','NESForgeRERecovery'].includes(d.format))fail('This is an RE inspection report, not a Forge project. Open its original ROM in RE / DISASM, then use Import as new project or Download Forge project JSON for a supported recovery profile.');\n";
      assert.equal(source.split(guard).length,2,'Exactly one report-import diagnostic');
      source=source.replace(guard,'');
    }
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'),input.sha256,input.path);
  }
  const previous=baseline.inputs.map(input=>input.path),extra=manifest.parts.filter(part=>!previous.includes(part));
  assert.deepEqual(extra,['src/services/emulator-input.js','src/services/emulator-timeline.js','src/services/emulator-play-ui.js','src/audio/audio-adaptive-ui.js','src/re/re-bridge.js','src/re/re-ui.js','src/re/re-analysis.js','src/re/re-analysis-ui.js','src/re/re-runtime.js','src/re/re-runtime-ui.js']);
  assert.deepEqual(manifest.parts.filter(part=>previous.includes(part)),previous,'Original source ordering is preserved');
});

test('Keyboard aliases and intentional paused keyboard frame stepping remain functional',()=>{
  const h=fresh();h.run('emu.running=false');
  for(const [key,mask]of Object.entries({KeyZ:1,KeyA:1,KeyX:2,KeyS:2,ShiftLeft:4,ShiftRight:4,Enter:8,ArrowUp:16,ArrowDown:32,ArrowLeft:64,ArrowRight:128})){
    h.run('clearEmuKeys()');h.context.testKey=key;h.run('emuKeys[testKey]=true');assert.equal(joy(h),mask,key);
  }
  load(h);h.run('emu.running=false;clearEmuKeys();emuKeys.KeyZ=true;emuRunFrame()');assert.equal(joy(h),1);assert.equal(h.run('emu.frameCount'),1);
});
test('The actual Frame command preserves held keyboard keys while ordinary Pause releases them',()=>{
  const h=fresh();load(h);h.run('emuKeys.KeyZ=true;emuKeys.ArrowRight=true;emuStep()');
  assert.equal(h.run('emu.running'),false);assert.equal(h.run('emu.frameCount'),1);assert.equal(joy(h),129);
  h.run('emuPause()');assert.equal(joy(h),0);
});

test('Multitouch combines independent pointers and preserves another finger on release or slide',()=>{
  const h=fresh();h.input.setTouch(11,128);h.input.setTouch(12,1);h.input.setTouch(13,2);assert.equal(joy(h),131);
  h.input.releaseTouch(12);assert.equal(joy(h),130);h.input.setTouch(11,16|128);assert.equal(joy(h),146);
  h.input.setTouch(11,0);assert.equal(joy(h),2);h.input.clearTouch();assert.equal(joy(h),0);
});
test('Opposite directions cancel after keyboard, touch and gamepad are merged',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();press(device,12);h.input.poll();h.run('emuKeys.ArrowLeft=true');h.input.setTouch(1,128|32|1);
  assert.equal(joy(h),1);h.input.releaseTouch(1);assert.equal(joy(h),16|64);
});
test('Standard gamepad buttons and left stick feed NES port one after initial neutral sample',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();assert.equal(h.input.status().waitingForNeutral,false);
  for(const [button,mask]of [[0,1],[1,2],[8,4],[9,8],[12,16],[13,32],[14,64],[15,128]]){
    press(device,button);h.input.poll();assert.equal(joy(h),mask);press(device,button,false);
  }
  device.axes=[0.2,-0.35,0,0];h.input.poll();assert.equal(joy(h),0);
  device.axes=[0.36,-0.9,0,0];h.input.poll();assert.equal(joy(h),16|128);
});
test('Initially held controller cannot take over until all mapped inputs are neutral',()=>{
  const device=pad();press(device,0);const h=fresh({devices:[device]});h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().waitingForNeutral,true);
  press(device,0,false);device.axes[0]=1;h.input.poll();assert.equal(joy(h),0);
  device.axes[0]=0;h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
});
test('Button and axis remapping covers all eight actions; unknown pads are never guessed',()=>{
  const device=pad(0,'Unmapped',''),h=fresh({devices:[device]});h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),0);
  const actions=['A','B','Select','Start','Up','Down','Left','Right'];
  actions.forEach((action,index)=>assert.equal(h.input.setBinding(action,'button:'+index),true));
  press(device,0,false);h.input.poll();press(device,2);h.input.poll();assert.equal(joy(h),4);
  press(device,2,false);assert.equal(h.input.setBinding('A','axis:2:-1'),true);h.input.poll();device.axes[2]=-0.8;h.input.poll();assert.equal(joy(h),1);
  assert.equal(h.input.setBinding('bogus','button:0'),false);assert.equal(h.input.setBinding('A','button:99'),false);
  assert.equal(h.input.setBinding('A','axis:99:1'),false);assert.equal(h.input.setBinding('A','axis:2:0'),false);
  assert.equal(h.input.setBinding('A',''),true);h.input.poll();assert.equal(joy(h),0);h.input.resetBindings();assert.ok(Object.values(h.input.status().bindings).every(value=>value===''));
});
test('Remapping a standard direction removes only that direction’s default axis supplement',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();assert.equal(h.input.setBinding('Right','button:2'),true);h.input.poll();
  device.axes[0]=1;h.input.poll();assert.equal(joy(h),0);press(device,2);h.input.poll();assert.equal(joy(h),128);
  device.axes[0]=-1;press(device,2,false);h.input.poll();assert.equal(joy(h),64);h.input.resetBindings();device.axes[0]=0;h.input.poll();device.axes[0]=1;h.input.poll();assert.equal(joy(h),128);
});
test('Only the selected pad drives port one; deselection and session profiles are explicit',()=>{
  const one=pad(0,'First'),two=pad(1,'Second'),h=fresh({devices:[one,two]});h.input.poll();press(two,0);h.input.poll();assert.equal(joy(h),0);
  assert.equal(h.input.selectGamepad(1),true);h.input.poll();assert.equal(joy(h),0);press(two,0,false);h.input.poll();press(two,1);h.input.poll();assert.equal(joy(h),2);
  h.input.setBinding('A','button:3');h.input.selectGamepad(0);h.input.selectGamepad(1);assert.equal(h.input.status().bindings.A,'button:3');
  h.input.selectGamepad(null);press(one,0);h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().selectedIndex,null);assert.equal(h.input.selectGamepad(9),false);
});
test('Disconnect drops only gamepad input and does not silently select another held pad',()=>{
  const one=pad(),two=pad(1,'Second'),h=fresh({devices:[one,two]});h.input.poll();press(one,0);press(two,0);h.input.poll();h.input.setTouch(1,2);h.run('emuKeys.ArrowRight=true');assert.equal(joy(h),131);
  h.pads.devices=[null,two];h.input.poll();assert.equal(joy(h),130);assert.equal(h.input.status().selectedIndex,null);
  h.input.poll();assert.equal(h.input.status().selectedIndex,null);
});
test('Reusing a gamepad index for another device cannot inherit the prior input or assignment',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
  const replacement=pad(0,'Different device');press(replacement,0);h.pads.devices=[replacement];h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().selectedIndex,null);
  h.input.selectGamepad(0);h.input.poll();assert.equal(joy(h),0);press(replacement,0,false);h.input.poll();press(replacement,0);h.input.poll();assert.equal(joy(h),1);
});
test('Disconnect event catches same-model same-index reconnection and requires selection plus neutral',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();press(device,0);h.input.poll();
  h.context.dispatchEvent({type:'gamepaddisconnected',gamepad:device});assert.equal(joy(h),0);assert.equal(h.input.status().selectedIndex,null);
  h.input.selectGamepad(0);h.input.poll();assert.equal(joy(h),0);
});
test('Unavailable or policy-denied Gamepad API leaves keyboard and touch usable',()=>{
  for(const options of [{unsupported:true},{denied:true}]){
    const h=fresh(options);h.input.poll();h.run('emuKeys.KeyZ=true');h.input.setTouch(1,2);assert.equal(joy(h),3);assert.match(h.input.status().error,/unavailable/);
  }
  const device=pad(),h=fresh({devices:[device]});h.input.poll();press(device,0);h.input.poll();h.pads.denied=true;h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().selectedIndex,null);
});
test('Pause clears every source and paused discovery cannot pre-arm held controller input',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();h.input.setTouch(1,2);h.run('emuKeys.KeyZ=true');press(device,15);h.input.poll();assert.equal(joy(h),131);
  h.run('emuPause()');assert.equal(joy(h),0);assert.equal(h.input.status().touchMask,0);press(device,15,false);h.input.poll();assert.equal(h.input.status().waitingForNeutral,true);
  press(device,15);h.run('emu.running=true');h.input.poll();assert.equal(joy(h),0);press(device,15,false);h.input.poll();press(device,15);h.input.poll();assert.equal(joy(h),128);
});
test('Focus loss suppresses all inputs until focus returns and controller is neutral',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();press(device,0);h.input.poll();h.input.setTouch(1,2);
  h.context.dispatchEvent({type:'blur'});h.run('emuKeys.ArrowRight=true');h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.setTouch(2,1),false);
  h.context.dispatchEvent({type:'focus'});h.input.poll();assert.equal(joy(h),0);press(device,0,false);h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
});
test('Hidden documents cannot receive gamepad or touch; returning requires neutral',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();press(device,0);h.input.poll();h.input.setTouch(1,2);
  h.context.document.hidden=true;h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().touchMask,0);
  h.context.document.hidden=false;h.input.poll();assert.equal(joy(h),0);press(device,0,false);h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
});
test('Nested settings and focus blockers do not reactivate input until every blocker closes',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();h.input.setBlocked('settings',true);h.input.setBlocked('control-focus',true);
  h.input.setBlocked('settings',false);h.run('emuKeys.KeyZ=true');h.input.poll();assert.equal(joy(h),0);
  h.input.setBlocked('control-focus',false);assert.equal(joy(h),0);h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
});
test('Save, project and palette dialogs suspend inputs for their entire lifetime',()=>{
  for(const [id,mode]of [['forgeSaveDialog','open'],['projModal','show'],['nesPicker','show']]){
    const device=pad(),h=fresh({devices:[device]});h.input.poll();h.input.setTouch(1,2);h.run('emuKeys.KeyZ=true');const el=h.get(id);
    if(mode==='open')el.open=true;else el.classList.add('show');h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().touchMask,0);
    h.input.poll();assert.equal(h.input.status().waitingForNeutral,true,'Neutral pad cannot rearm through '+id);
    press(device,0);if(mode==='open')el.open=false;else el.classList.remove('show');h.input.poll();assert.equal(joy(h),0);
    press(device,0,false);h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
  }
});
test('Editable focus clears source state and only rearms after field exit plus controller neutral',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();h.run('emuKeys.KeyZ=true');h.input.setTouch(1,2);
  h.context.document.activeElement=h.context.document.createElement('input');assert.equal(joy(h),0);assert.equal(h.input.status().touchMask,0);
  h.input.poll();assert.equal(h.input.status().waitingForNeutral,true);press(device,0);h.context.document.activeElement=null;h.input.poll();assert.equal(joy(h),0);
  press(device,0,false);h.input.poll();press(device,0);h.input.poll();assert.equal(joy(h),1);
});

test('Tab exit clears touch and keyboard and forces controller neutral on return',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();h.input.setTouch(1,2);h.run('emuKeys.KeyZ=true');press(device,15);h.input.poll();
  h.run('switchTab("scene")');h.input.poll();assert.equal(joy(h),0);assert.equal(h.input.status().touchMask,0);
  h.run('switchTab("emu")');h.input.poll();assert.equal(joy(h),0);press(device,15,false);h.input.poll();press(device,15);h.input.poll();assert.equal(joy(h),128);
});
test('Actual reset and ROM replacement clear controls and keep emulator paused',()=>{
  const device=pad(),h=fresh({devices:[device]});load(h);h.input.poll();h.input.setTouch(1,1);press(device,15);h.input.poll();h.run('emuKeys.KeyX=true;emuReset()');
  assert.equal(joy(h),0);assert.equal(h.run('emu.running'),false);assert.equal(h.input.status().touchMask,0);
  h.run('emu.running=true');h.input.poll();assert.equal(joy(h),0);press(device,15,false);h.input.poll();h.input.setTouch(1,2);
  h.run('emuLoadRomData(mobileRom,"replacement",2)');assert.equal(joy(h),0);assert.equal(h.run('emu.running'),false);assert.equal(h.input.status().waitingForNeutral,true);
});
test('Existing frame loop performs one gamepad sample per frame and never changes port two',()=>{
  const device=pad(),h=fresh({devices:[device]});load(h);const before=h.pads.calls;h.run('emuRunFrame()');assert.equal(h.pads.calls-before,1);
  assert.equal(h.run('cpuRead(0x4017)'),0x40);assert.equal(h.run('emu.frameCount'),1);
});
test('NES strobe and serial latch retain captured bits while live input changes',()=>{
  const h=fresh();h.input.setTouch(1,1|4|16|128);
  h.run('cpuWrite(0x4016,1)');assert.equal(h.run('cpuRead(0x4016)'),1);h.input.setTouch(1,2);assert.equal(h.run('cpuRead(0x4016)'),0);
  h.input.setTouch(1,1|4|16|128);h.run('cpuWrite(0x4016,0)');h.input.clearTouch();
  assert.deepEqual(h.json('Array.from({length:8},()=>cpuRead(0x4016)&1)'),[1,0,1,0,1,0,0,1]);assert.equal(h.run('cpuRead(0x4016)&1'),1);
});
test('Lifecycle releases expose a generation so held browser pointers cannot resurrect input',()=>{
  const h=fresh(),first=h.input.status().releaseGeneration;h.input.setTouch(1,1);h.input.releaseTouch(1);
  assert.equal(h.input.status().releaseGeneration,first,'Releasing one finger must not cancel another');
  h.input.setTouch(1,1);h.run('emuPause()');assert.ok(h.input.status().releaseGeneration>first);
  const paused=h.input.status().releaseGeneration;h.input.clearTouch();assert.ok(h.input.status().releaseGeneration>paused);
});

test('Status snapshots cannot mutate adapter state and subscriptions can unsubscribe',()=>{
  const device=pad(),h=fresh({devices:[device]});h.input.poll();let notifications=0;const stop=h.input.subscribe(()=>notifications++);
  const state=h.input.status();state.bindings.A='button:99';state.devices[0].id='changed';assert.equal(h.input.status().bindings.A,'button:0');assert.notEqual(h.input.status().devices[0].id,'changed');
  h.input.setTouch(1,1);const before=notifications;stop();h.input.clearTouch();assert.equal(notifications,before);
});
const results=[];for(const {name,fn}of tests){const start=Date.now();try{fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}
const passed=results.filter(result=>result.passed).length,report={suite:'emulator-input-mobile',html:path.basename(html),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Bundled candidate input adapter with simulated gamepads and mock DOM; actual NES CPU joypad latch, pause/reset/load/tab/focus lifecycle. Physical controllers and real mobile browsers require separate acceptance.',passed,failed:results.length-passed,total:results.length,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;
