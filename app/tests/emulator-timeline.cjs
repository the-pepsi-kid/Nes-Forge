#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn});
const excluded=['prgRom','chrRom','lastBuiltRom','loaded','running','loading','romName','rafId','loadGeneration'];
function loopRom(){const rom=new Uint8Array(40976);rom.set([78,69,83,26,2,1]);rom.set([0xe6,0x10,0x4c,0x00,0x80],16);for(const off of[0x7ffa,0x7ffc,0x7ffe])rom.set([0,0x80],16+off);return rom;}
function fresh({native=false}={}){const h=loadForge(html,{environment:{crypto:crypto.webcrypto,setTimeout:(fn,delay)=>setTimeout(fn,delay===0?0:1),clearTimeout}});assert.deepEqual(h.errors,[]);h.timeline=h.context.Forge.services.EmulatorTimeline;assert.ok(h.timeline,'Bundled timeline service required');h.context.rom=native?new Uint8Array(fs.readFileSync(path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes'))):loopRom();assert.equal(h.run('emuLoadRomData(rom,"Timeline fixture",0);S.tab="emu";emu.loaded'),true);return h;}
function physical(h){h.context.timelineExcluded=excluded;return structuredClone(h.run('({emu:Object.fromEntries(Object.entries(emu).filter(([k])=>!timelineExcluded.includes(k))),apu:Object.fromEntries(Object.entries(apuCore).filter(([,v])=>typeof v!=="function"))})'));}
function frames(h,count){for(let i=0;i<count;i++)h.run('emuRunFrame()');}

test('Default-off history adds no frame storage or per-frame subscriber work',()=>{
 const h=fresh();assert.equal(h.timeline.status().enabled,false);let notices=0;h.timeline.subscribe(()=>notices++);const before=notices;frames(h,3);assert.equal(h.timeline.status().storedStates,0);assert.equal(h.timeline.status().storedBytes,0);assert.equal(notices,before);assert.equal(h.run('emu.frameCount'),3);
});
test('Forward works with recording off, stays paused, and does not implicitly enable history',async()=>{
 const h=fresh();assert.equal(await h.timeline.forward(3),true);assert.equal(h.run('emu.frameCount'),3);assert.equal(h.run('emu.running'),false);assert.equal(h.timeline.status().enabled,false);assert.equal(h.timeline.status().storedStates,0);assert.equal(await h.timeline.back(),false);
});
test('Back restores complete physical state and forward reuses recorded future without executing CPU',async()=>{
 const h=fresh({native:true});frames(h,5);h.timeline.setEnabled(true);const before=physical(h);frames(h,3);const future=physical(h);h.run('window.timelineCpuSteps=0;window.timelineOldCpuStep=cpuStep;cpuStep=function(...args){timelineCpuSteps++;return timelineOldCpuStep.apply(this,args)}');
 assert.equal(await h.timeline.back(3),true);assert.deepEqual(physical(h),before);assert.equal(h.run('timelineCpuSteps'),0);assert.equal(await h.timeline.forward(3),true);assert.deepEqual(physical(h),future);assert.equal(h.run('timelineCpuSteps'),0);assert.equal(h.run('emu.captureTrace.tileMap instanceof Map'),true);assert.equal(h.run('emu.captureTrace.palMap instanceof Map'),true);
});
test('Re-executing from restored state produces the same CPU, APU, trace and video',async()=>{
 const h=fresh({native:true});frames(h,5);h.timeline.setEnabled(true);frames(h,4);const expected=physical(h);assert.equal(await h.timeline.back(4),true);frames(h,4);assert.deepEqual(physical(h),expected);assert.equal(h.timeline.status().newest,9);
});
test('Navigation preserves ROM, project and APU callbacks while clearing host audio and live controls',async()=>{
 const h=fresh({native:true});frames(h,4);h.timeline.setEnabled(true);frames(h,2);const rom=h.run('emu.lastBuiltRom'),project=h.run('Forge.services.ProjectStore.serialize()'),sample=h.run('apuCore.onSample'),read=h.run('apuCore.readMemory');h.run('emuKeys.ArrowRight=true;apuBufferUsed=100;apuNextTime=10;window.timelineStopped=0;apuSources.add({stop(){timelineStopped++},disconnect(){}})');
 assert.equal(await h.timeline.back(),true);assert.equal(h.run('emu.lastBuiltRom'),rom);assert.equal(h.run('Forge.services.ProjectStore.serialize()'),project);assert.equal(h.run('apuCore.onSample'),sample);assert.equal(h.run('apuCore.readMemory'),read);assert.equal(h.run('apuBufferUsed'),0);assert.equal(h.run('apuNextTime'),0);assert.equal(h.run('apuSources.size'),0);assert.equal(h.run('timelineStopped'),1);assert.equal(h.run('Object.keys(emuKeys).length'),0);
});
test('Existing Frame retains held-key behavior and branches after a rewind',async()=>{
 const h=fresh({native:true});frames(h,5);h.timeline.setEnabled(true);frames(h,4);assert.equal(await h.timeline.back(3),true);const beforeX=h.run('emu.ram[1]');h.run('emuKeys.ArrowRight=true;emuStep()');assert.ok(h.run('emu.ram[1]')>beforeX);assert.equal(h.timeline.status().current,7);assert.equal(h.timeline.status().newest,7);assert.equal(h.run('emu.running'),false);
});
test('Starting Run after rewind discards recorded future without restarting ROM state',async()=>{
 const h=fresh();h.timeline.setEnabled(true);frames(h,5);await h.timeline.back(3);const before=physical(h);h.run('emuToggleRun()');assert.equal(h.timeline.status().newest,2);assert.equal(h.run('emu.running'),true);assert.deepEqual(physical(h),before);h.run('emuPause()');
});
test('The 300-state cap evicts oldest snapshots and reports the actual retained range',()=>{
 const h=fresh();h.timeline.setEnabled(true);frames(h,305);const state=h.timeline.status();assert.ok(state.storedStates<=300);assert.equal(state.storedStates,300);assert.equal(state.oldest,6);assert.equal(state.newest,305);assert.equal(state.current,305);assert.ok(state.storedBytes>0&&state.storedBytes<=state.maxBytes);
});
test('Stored-byte cap evicts snapshots before 32 MiB and reports a shorter window',()=>{
 const h=fresh();h.run('emu.timelineBudgetProbe=new Uint8Array(2*1024*1024)');h.timeline.setEnabled(true);frames(h,14);const state=h.timeline.status();assert.equal(state.enabled,true);assert.ok(state.storedStates>1&&state.storedStates<15);assert.ok(state.oldest>0);assert.ok(state.storedBytes<=32*1024*1024);assert.equal(state.maxBytes,32*1024*1024);
});
test('Unknown current function state rejects restoration atomically and clears unusable history',async()=>{
 for(const owner of['emu','apuCore']){const h=fresh();h.timeline.setEnabled(true);frames(h,3);const before=physical(h);h.run(owner+'.timelineUnsupported=()=>0');assert.equal(await h.timeline.back(),false);h.run('delete '+owner+'.timelineUnsupported');assert.deepEqual(physical(h),before);const state=h.timeline.status();assert.equal(state.enabled,false);assert.equal(state.supported,false);assert.equal(state.storedStates,0);assert.match(state.message,/Unsupported/);}
});
test('Successful load isolates sessions while rejected headers retain current history',async()=>{
 const h=fresh();h.timeline.setEnabled(true);frames(h,3);const state=h.timeline.status(),rom=h.run('emu.lastBuiltRom');assert.equal(h.run('emuLoadRomData(new Uint8Array([1,2,3]),"invalid",0)'),false);assert.equal(h.run('emu.lastBuiltRom'),rom);assert.equal(h.timeline.status().storedStates,state.storedStates);h.run('emuLoadRomData(rom,"new session",0)');assert.equal(h.timeline.status().storedStates,1);assert.equal(h.timeline.status().oldest,0);assert.equal(await h.timeline.back(),false);
});
test('Reset reseeds, CPU instruction tracing invalidates, and project unload clears history',()=>{
 const h=fresh();h.timeline.setEnabled(true);frames(h,3);h.run('emuReset()');assert.equal(h.timeline.status().storedStates,1);assert.equal(h.timeline.status().oldest,0);frames(h,2);h.run('emuTrace()');assert.equal(h.timeline.status().storedStates,0);assert.equal(h.run('emu.captureTrace'),null);frames(h,1);assert.equal(h.timeline.status().storedStates,1);const project=h.run('Forge.services.ProjectStore.serialize()');h.context.Forge.services.ProjectStore.load(project);assert.equal(h.timeline.status().loaded,false);assert.equal(h.timeline.status().storedStates,0);
});
test('Large forward requests yield and can be canceled without additional frames',async()=>{
 const h=fresh(),pending=h.timeline.forward(60);assert.equal(h.timeline.status().busy,true);const current=h.run('emu.frameCount');assert.ok(current>0&&current<60);h.timeline.cancel('Test cancellation');assert.equal(await pending,false);assert.equal(h.run('emu.frameCount'),current);assert.equal(h.timeline.status().busy,false);assert.equal(h.run('emu.running'),false);assert.equal(h.context.Forge.services.EmulatorInput.status().blockingReasons.includes('frame-navigation'),false);
});
test('Inputs pressed during a yielded seek stay blocked until completion without removing other blockers',async()=>{
 const h=fresh({native:true});frames(h,5);const startX=h.run('emu.ram[1]'),input=h.context.Forge.services.EmulatorInput;input.setBlocked('test-dialog',true);const pending=h.timeline.forward(12);assert.equal(h.timeline.status().busy,true);assert.ok(input.status().blockingReasons.includes('frame-navigation'));h.context.document.activeElement=h.get('emuCanvas');input.setBlocked('test-dialog',false);h.run('emuKeys.ArrowRight=true;emuKeys.KeyZ=true');assert.equal(h.run('emuReadJoyState()'),0);assert.equal(input.setTouch(72,128),false);assert.equal(await pending,true);assert.equal(h.run('emu.ram[1]'),startX);assert.equal(input.status().blockingReasons.includes('frame-navigation'),false);assert.equal(h.run('emuReadJoyState()'),0);const next=h.timeline.forward(2);input.setBlocked('test-dialog',true);assert.equal(await next,true);assert.equal(input.status().blockingReasons.includes('frame-navigation'),false);assert.equal(input.status().blockingReasons.includes('test-dialog'),true);input.setBlocked('test-dialog',false);
});
test('New loads during a yielded seek cannot apply the previous ROM future',async()=>{
 const h=fresh();h.timeline.setEnabled(true);const pending=h.timeline.forward(60);assert.equal(h.timeline.status().busy,true);h.run('emuLoadRomData(rom,"replacement",0)');assert.equal(await pending,false);assert.equal(h.run('emu.frameCount'),0);assert.equal(h.timeline.status().storedStates,1);assert.equal(h.run('emu.romName'),'replacement');assert.equal(h.context.Forge.services.EmulatorInput.status().blockingReasons.includes('frame-navigation'),false);
});
test('Disabling history releases its storage and rejects invalid navigation distances',async()=>{
 const h=fresh();h.timeline.setEnabled(true);frames(h,2);h.timeline.setEnabled(false);assert.equal(h.timeline.status().storedBytes,0);assert.equal(h.timeline.status().storedStates,0);assert.equal(await h.timeline.back(),false);for(const n of[0,61,-61,1.5,NaN])await assert.rejects(h.timeline.seekRelative(n),/Navigation distance/);
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}const passed=results.filter(result=>result.passed).length,report={suite:'emulator-timeline',html:path.basename(html),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Actual bundled emulator, physical snapshot service, real ROM execution and lifecycle in inherited mock DOM; no visual/browser/device validation.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;})().catch(error=>{console.error(error);process.exitCode=1;});
