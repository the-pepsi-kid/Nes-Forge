#!/usr/bin/env node
'use strict';
// Bundled UI + real timeline/state commands in the inherited DOM harness.
// Real browser layout, audible output, fullscreen permissions and physical
// controllers require separate checks; this suite makes none of those claims.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),Module=require('node:module');
const harnessPath=require.resolve('./harness.cjs'),source=fs.readFileSync(harnessPath,'utf8'),stub='addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,';
assert.equal(source.split(stub).length,2);const moduleWithEvents=new Module(harnessPath,module);moduleWithEvents.filename=harnessPath;moduleWithEvents.paths=module.paths;
moduleWithEvents._compile(source.replace(stub,'_testListeners: [], addEventListener(type, fn, options) { this._testListeners.push({type,fn,capture:options===true||!!options?.capture}); }, removeEventListener: noop, dispatchEvent(e) { for (const item of this._testListeners.filter(item=>item.type===e.type)) item.fn(e); },'),harnessPath);
const {loadForge}=moduleWithEvents.exports,root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn});
function rom(){const data=new Uint8Array(16+16384+8192);data.set([78,69,83,26,1,1]);data.set([0x4c,0,0xc0],16);for(const at of[0x3ffa,0x3ffc,0x3ffe])data.set([0,0xc0],16+at);return data;}
function fresh({loaded=true,width=390}={}){
 const h=loadForge(html,{environment:{innerWidth:width,setTimeout:fn=>setImmediate(fn),clearTimeout:id=>clearImmediate(id)}});assert.deepEqual(h.errors,[]);h.play=h.context.Forge.services.EmulatorPlay;h.timeline=h.context.Forge.services.EmulatorTimeline;assert.ok(h.timeline,'Actual bundled timeline required');
 h.focuses=[];for(const id of ['emuCanvas','emuPlayRun','emuPlayTools','emuPlayRecordHistory','emuPlayBack60','emuPlayBack1','emuPlayForward1','emuPlayForward60','emuPlayCancelNavigation','emuPlayA','emuPlaySettingsDone'])h.get(id).focus=()=>{h.context.document.activeElement=h.get(id);h.focuses.push(id);};
 if(loaded){h.context.navRom=rom();assert.equal(h.run('emuLoadRomData(navRom,"UI navigation loop",0)'),true);h.run('S.tab="emu"');}h.play.refresh();return h;
}
function open(h){h.get('emuPlayTools').click();assert.equal(h.get('emuPlayTransport').hidden,false);}
async function settle(h){for(let i=0;i<1000&&h.timeline.status().busy;i++)await new Promise(setImmediate);await Promise.resolve();assert.equal(h.timeline.status().busy,false,'Navigation must finish within the bounded harness turns');}
async function click(h,id){h.get(id).click();await settle(h);}
function event(h,target,props={}){const e={type:'keydown',key:'Tab',code:'Tab',target,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...props};const listeners=h.context.document._testListeners;
 for(const item of listeners.filter(item=>item.type===e.type&&item.capture)){item.fn(e);if(e.stopped)return e;}for(let el=target;el;el=el.parentNode){el.dispatchEvent?.(e);if(e.stopped)return e;}for(const item of listeners.filter(item=>item.type===e.type&&!item.capture)){item.fn(e);if(e.stopped)return e;}return e;}

test('Playback tools starts collapsed and recording is opt-in without startup state allocation',()=>{
 const h=fresh({loaded:false});assert.equal(h.timeline.status().enabled,false);assert.equal(h.timeline.status().storedStates,0);assert.equal(h.get('emuPlayTransport').hidden,true);assert.equal(h.get('emuPlayTools').getAttribute('aria-expanded'),'false');open(h);assert.equal(h.get('emuPlayRecordHistory').disabled,true);for(const id of ['emuPlayBack60','emuPlayBack1','emuPlayForward1','emuPlayForward60'])assert.equal(h.get(id).disabled,true);assert.equal(h.timeline.status().storedBytes,0);
});
test('Forward controls work with history off, remain paused, and backward controls stay disabled',async()=>{
 const h=fresh();open(h);assert.equal(h.get('emuPlayForward1').disabled,false);assert.equal(h.get('emuPlayBack1').disabled,true);await click(h,'emuPlayForward1');assert.equal(h.run('emu.frameCount'),1);assert.equal(h.run('emu.running'),false);assert.equal(h.timeline.status().enabled,false);assert.equal(h.timeline.status().storedStates,0);assert.match(h.get('emuPlayTimelineStatus').textContent,/F1/);
});
test('Actual record/back/forward buttons restore state and keep displayed history bounds accurate',async()=>{
 const h=fresh();open(h);await click(h,'emuPlayRecordHistory');assert.equal(h.timeline.status().enabled,true);assert.equal(h.get('emuPlayRecordHistory').getAttribute('aria-pressed'),'true');assert.equal(h.get('emuPlayBack1').disabled,true);const before=h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles,ram:Array.from(emu.ram)})');await click(h,'emuPlayForward1');assert.equal(h.get('emuPlayBack1').disabled,false);await click(h,'emuPlayBack1');assert.deepEqual(h.json('({frame:emu.frameCount,pc:emu.PC,cycles:emu.cycles,ram:Array.from(emu.ram)})'),before);assert.equal(h.get('emuPlayBack1').disabled,true);assert.match(h.get('emuPlayTimelineStatus').textContent,/Recorded F0–1/);assert.match(h.get('emuPlayTimelineStatus').textContent,/2\/300 states/);assert.match(h.get('emuPlayTimelineStatus').textContent,/\/32 MiB stored/);await click(h,'emuPlayForward1');assert.equal(h.run('emu.frameCount'),1);assert.equal(h.timeline.status().storedStates,2);
});
test('±60 controls navigate actual frames, clamp to recorded oldest, and allocate no history while off',async()=>{
 const h=fresh();open(h);await click(h,'emuPlayForward60');assert.equal(h.run('emu.frameCount'),60);assert.equal(h.timeline.status().storedStates,0);await click(h,'emuPlayRecordHistory');await click(h,'emuPlayForward60');assert.equal(h.run('emu.frameCount'),120);await click(h,'emuPlayBack60');assert.equal(h.run('emu.frameCount'),60);assert.equal(h.get('emuPlayBack60').disabled,true);assert.equal(h.run('emu.running'),false);
});
test('New timeline commands release held NES input while the protected Frame command retains its keyboard contract',async()=>{
 const h=fresh();open(h);h.run('emuKeys.KeyZ=true;emuKeys.ArrowRight=true');await click(h,'emuPlayForward1');assert.equal(h.run('emuReadJoyState()'),0);h.run('emuKeys.KeyZ=true;emuKeys.ArrowRight=true;emuStep()');assert.equal(h.run('emuReadJoyState()'),129);assert.equal(h.run('emu.running'),false);
});
test('Every enabled playback tool remains inside the fullscreen keyboard focus boundary',async()=>{
 const h=fresh();open(h);await click(h,'emuPlayRecordHistory');await click(h,'emuPlayForward1');h.play.enter();for(const id of ['emuPlayTools','emuPlayRecordHistory','emuPlayBack60','emuPlayBack1','emuPlayForward1','emuPlayForward60']){h.context.document.activeElement=h.get(id);const count=h.focuses.length,e=event(h,h.get(id));assert.equal(e.defaultPrevented,undefined,id+' permits native next focus');assert.equal(h.focuses.length,count,id+' not rejected by focus trap');}
 h.context.document.activeElement=h.get('emuPlayRun');const reverse=event(h,h.get('emuPlayRun'),{shiftKey:true});assert.equal(reverse.defaultPrevented,true);assert.equal(h.context.document.activeElement,h.get('emuPlayA'));
 h.get('emuPlayTools').click();h.context.document.activeElement=h.get('emuPlayForward1');event(h,h.get('emuPlayForward1'));assert.equal(h.context.document.activeElement,h.get('emuPlayRun'),'Hidden tool is excluded');
});
test('Transport keyboard activation does not press NES Start and Ctrl/Cmd Save still reaches Save As',()=>{
 const h=fresh();open(h);h.play.enter();h.context.document.activeElement=h.get('emuPlayForward1');const enter=event(h,h.get('emuPlayForward1'),{key:'Enter',code:'Enter'});assert.equal(enter.stopped,true);assert.equal(h.run('!!emuKeys.Enter'),false);assert.equal(h.run('emu.frameCount'),0);
 for(const modifier of ['ctrlKey','metaKey']){h.play.enter();h.context.document.activeElement=h.get('emuPlayRecordHistory');const save=event(h,h.get('emuPlayRecordHistory'),{key:'s',code:'KeyS',[modifier]:true});assert.equal(save.defaultPrevented,true);assert.ok(h.context.forgeSave.lastPromise);assert.equal(h.play.isExpanded(),false);h.run('forgeSave.cancel()');}
});
test('Busy navigation offers Cancel and disables overlapping transport commands',async()=>{
 const h=fresh();open(h);h.get('emuPlayForward60').click();assert.equal(h.timeline.status().busy,true);assert.equal(h.get('emuPlayCancelNavigation').hidden,false);for(const id of ['emuPlayRecordHistory','emuPlayBack1','emuPlayForward1','emuPlayForward60'])assert.equal(h.get(id).disabled,true);const at=h.run('emu.frameCount');h.get('emuPlayCancelNavigation').click();await settle(h);await new Promise(setImmediate);assert.equal(h.run('emu.frameCount'),at);assert.equal(h.run('emu.running'),false);assert.equal(h.get('emuPlayCancelNavigation').hidden,true);
});
test('Closing tools, settings, tab exit, Play exit, blur and hidden documents cancel pending frame batches',async()=>{
 const actions=[h=>h.get('emuPlayTools').click(),h=>h.play.openSettings(),h=>{h.run('S.tab="chr"');h.play.tick();},h=>h.play.exit(),h=>h.context.dispatchEvent({type:'blur'}),h=>{h.context.document.hidden=true;h.context.document.dispatchEvent({type:'visibilitychange'});}];
 for(const action of actions){const h=fresh();open(h);h.play.enter();h.get('emuPlayForward60').click();assert.equal(h.timeline.status().busy,true);action(h);const at=h.run('emu.frameCount');await settle(h);await new Promise(setImmediate);assert.equal(h.run('emu.frameCount'),at);assert.equal(h.run('emu.running'),false);}
});
test('Save As cancels pending navigation without later batches stealing focus or advancing the ROM',async()=>{
 const h=fresh();open(h);h.play.enter();h.get('emuPlayForward60').click();h.run('forgeSave.request(new Uint8Array([1]),"timeline.bin")');h.context.document.activeElement=h.get('forgeSaveName');h.play.refresh();const at=h.run('emu.frameCount'),focus=h.focuses.length;await settle(h);await new Promise(setImmediate);assert.equal(h.run('emu.frameCount'),at);assert.equal(h.context.document.activeElement,h.get('forgeSaveName'));assert.equal(h.focuses.length,focus);assert.equal(h.play.isExpanded(),false);h.run('forgeSave.cancel()');
});
test('Programmatic transport clicks from another tab or controller settings cannot execute frames',async()=>{
 const h=fresh();open(h);h.run('S.tab="scene"');await click(h,'emuPlayForward1');assert.equal(h.run('emu.frameCount'),0);h.run('S.tab="emu"');h.play.openSettings();await click(h,'emuPlayForward1');assert.equal(h.run('emu.frameCount'),0);h.play.closeSettings();await click(h,'emuPlayForward1');assert.equal(h.run('emu.frameCount'),1);
});
test('Reset and new ROM controls clear prior history bounds in the visible strip',async()=>{
 const h=fresh();open(h);await click(h,'emuPlayRecordHistory');await click(h,'emuPlayForward1');h.run('emuReset()');h.play.refresh();assert.equal(h.get('emuPlayBack1').disabled,true);assert.match(h.get('emuPlayTimelineStatus').textContent,/Recorded F0–0/);await click(h,'emuPlayForward1');h.context.replacement=rom();h.run('emuLoadRomData(replacement,"Second ROM",0)');h.play.refresh();assert.equal(h.get('emuPlayBack60').disabled,true);assert.match(h.get('emuPlayTimelineStatus').textContent,/Recorded F0–0/);
});
test('Turning history off clears stored states and leaves forward navigation available',async()=>{
 const h=fresh();open(h);await click(h,'emuPlayRecordHistory');await click(h,'emuPlayForward1');await click(h,'emuPlayRecordHistory');assert.equal(h.timeline.status().storedStates,0);assert.equal(h.timeline.status().storedBytes,0);assert.equal(h.get('emuPlayRecordHistory').getAttribute('aria-pressed'),'false');assert.equal(h.get('emuPlayBack1').disabled,true);assert.equal(h.get('emuPlayForward1').disabled,false);assert.match(h.get('emuPlayTimelineStatus').textContent,/History off/);
});

(async()=>{const results=[];for(const {name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack||String(error)});console.error('FAIL '+name+'\n'+(error.stack||String(error)));}}
 const passed=results.filter(item=>item.passed).length,report={suite:'emulator-timeline-ui',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
