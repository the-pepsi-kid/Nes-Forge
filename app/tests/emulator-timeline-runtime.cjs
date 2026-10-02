#!/usr/bin/env node
'use strict';
// Independent actual CPU/PPU/APU state-navigation tests. No JavaScript game
// simulation substitutes for execution. Browser/device acceptance is separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.9.0_Gameplay_Core.html'));
const native=Uint8Array.from(fs.readFileSync(path.join(root,'examples/RE_Bridge_Room/Bridge_Room.nes'))),world=Uint8Array.from(fs.readFileSync(path.join(root,'examples/Scout_Gameplay_Core_1.9.0.nes')));
const hash=data=>crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');
const tests=[],test=(name,fn)=>tests.push({name,fn}),metrics={};
const volatile=new Set(['prgRom','chrRom','lastBuiltRom','loaded','running','loading','romName','rafId','loadGeneration']);
function fresh(rom=native,name='Timeline native'){
 const h=loadForge(html,{environment:{crypto:crypto.webcrypto,structuredClone,setTimeout:(fn,ms,...args)=>ms===0?setTimeout(fn,0,...args):1,clearTimeout}});
 h.context.timelineROM=Uint8Array.from(rom);assert.equal(h.run('emuLoadRomData(timelineROM,"'+name+'",0)'),true);h.run('S.tab="emu";for(let n=0;n<8;n++)emuRunFrame()',20000);assert.deepEqual(h.errors,[]);h.timeline=h.context.Forge.services.EmulatorTimeline;assert.ok(h.timeline,'EmulatorTimeline service missing');return h;
}
function machine(h){return {emu:structuredClone(Object.fromEntries(Object.entries(h.run('emu')).filter(([key])=>!volatile.has(key)))),apu:structuredClone(Object.fromEntries(Object.entries(h.run('apuCore')).filter(([,value])=>typeof value!=='function')))};}
function frames(h,count,names=[]){h.context.timelineKeys=names;h.run('clearEmuKeys();S.tab="emu";for(const key of timelineKeys)emuKeys[key]=true');h.run('for(let n=0;n<'+count+';n++)emuRunFrame()',Math.max(20000,count*300));assert.equal(h.run('emu.opsMissed'),0);}
function inputState(h){return h.json('({project:Forge.services.ProjectStore.capture(),undo:undoStack,redo:redoStack,projectId:S.projectId,rom:Array.from(emu.lastBuiltRom)})');}
function frameHash(h){return hash(h.run('emu.frameBuffer'));}
function enable(h){assert.notEqual(h.timeline.setEnabled(true),false);assert.equal(h.timeline.status().enabled,true);}

// Original authored bytecode: NMI increments SRAM, writes CHR-RAM and palette,
// and DMA-copies OAM. Identical execution code in every 8K bank lets mapper
// writes change real mappings while execution remains on a valid instruction.
function bankedChrRamRom(mapper){
 const rom=new Uint8Array(16+65536);rom.set([78,69,83,26,4,0,(mapper&15)<<4,mapper&240]);rom.fill(0xea,16);
 const reset=[0x78,0xd8,0xa2,0xff,0x9a,0xa9,0x80,0x8d,0,0x20,0xa9,0x1e,0x8d,1,0x20,0x4c,0x0f,0xc0];
 const nmi=[0x48,0xee,0,0x60,0xad,0,0x60,0x8d,0,2,0xa9,0x3f,0x8d,6,0x20,0xa9,1,0x8d,6,0x20,0xad,0,0x60,0x29,0x3f,0x8d,7,0x20,0xa9,0,0x8d,6,0x20,0x8d,6,0x20,0xad,0,0x60,0x8d,7,0x20,0xa9,2,0x8d,0x14,0x40,0x68,0x40];
 for(let bank=0;bank<8;bank++){const start=16+bank*8192;rom.set(reset,start);rom.set(nmi,start+64);rom[start+0x100]=0xa0+bank;rom.set([0x40,0xc0,0,0xc0,0x40,0xc0],start+8192-6);}return rom;
}

test('History is opt-in and ordinary frame execution changes no authoring project or original ROM',()=>{
 const h=fresh(),before=inputState(h);assert.equal(h.timeline.status().enabled,false);frames(h,4,['ArrowRight']);assert.equal(h.timeline.status().storedStates,0);assert.deepEqual(inputState(h),before);assert.equal(hash(h.context.timelineROM),hash(native));metrics.disabled={frames:h.run('emu.frameCount'),storedStates:h.timeline.status().storedStates};
});
for(const [label,rom] of [['native',native],['world',world]])test('Recorded '+label+' frames restore full state and re-execute identical machine state and PCM samples',async()=>{
 const h=fresh(rom,'Timeline '+label),authoringBefore=inputState(h);enable(h);frames(h,3,[]);const anchor=machine(h),frame=h.run('emu.frameCount');
 h.context.timelineSamples=[];h.run('apuCore.onSample=value=>timelineSamples.push(value)');const callback=h.run('apuCore.onSample');frames(h,5,['ArrowRight']);const expected=machine(h),expectedSamples=Float64Array.from(h.context.timelineSamples),expectedHash=frameHash(h);assert.ok(expectedSamples.length>3000);
 assert.equal(await h.timeline.back(5),true);assert.equal(h.run('emu.running'),false);assert.deepEqual(machine(h),anchor);assert.equal(h.run('apuCore.onSample'),callback);assert.equal(h.get('rPC').textContent,h.run('emu.PC.toString(16).toUpperCase().padStart(4,"0")'));assert.equal(h.get('rFrm').textContent,frame);
 assert.equal(await h.timeline.forward(5),true);assert.deepEqual(machine(h),expected);assert.equal(frameHash(h),expectedHash);
 assert.equal(await h.timeline.back(5),true);h.context.timelineSamples=[];h.run('emuToggleRun()');frames(h,5,['ArrowRight']);h.run('emuPause()');assert.deepEqual(machine(h),expected);assert.deepEqual(Float64Array.from(h.context.timelineSamples),expectedSamples);assert.equal(frameHash(h),expectedHash);
 assert.deepEqual(inputState(h),authoringBefore);frames(h,60,[]);const retained=h.timeline.status();assert.ok(retained.storedStates>=61,label+' must retain enough states for a full 60-frame rewind');assert.ok(retained.storedBytes<=33554432);assert.equal(await h.timeline.back(60),true);assert.deepEqual(machine(h),expected);assert.deepEqual(inputState(h),authoringBefore);metrics[label]={anchorFrame:frame,restoredFrame:frame,finalFrame:h.run('emu.frameCount'),framebufferSha256:expectedHash,pcmSamples:expectedSamples.length,pcmSha256:hash(new Uint8Array(expectedSamples.buffer)),fullSixtyFrameRewind:{retainedStates:retained.storedStates,storedBytes:retained.storedBytes,fromFrame:retained.current,toFrame:h.run('emu.frameCount')},history:h.timeline.status()};
});
test('Runtime capture after rewind uses restored native tiles, scanline provenance and prior sprite positions',async()=>{
 const h=fresh();enable(h);frames(h,3,[]);const oldFrame=h.run('emu.frameCount'),oldPixels=Buffer.from(h.run('emu.frameBuffer')),oldCapture=h.json('captureRuntimeData()');frames(h,12,['ArrowRight']);assert.notEqual(frameHash(h),hash(oldPixels));assert.equal(await h.timeline.back(12),true);const restored=h.run('captureRuntimeData()');assert.equal(restored.captureMeta.frame,oldFrame);assert.equal(restored.captureMeta.validation.backgroundDifferentPixels,0);assert.equal(restored.captureMeta.validation.compositeDifferentPixels,0);assert.deepEqual(Buffer.from(h.context.forgeCapture.scenePixels(restored,true).rgba),oldPixels);assert.deepEqual(JSON.parse(JSON.stringify(restored.oam)),oldCapture.oam);assert.equal(h.run('emu.captureTrace.tileMap instanceof Map'),true);assert.equal(h.run('emu.captureTrace.palMap instanceof Map'),true);metrics.capture={frame:oldFrame,framebufferSha256:hash(oldPixels),backgroundDifferentPixels:0,compositeDifferentPixels:0};
});
for(const mapper of [1,4])test('Mapper '+mapper+' rewind restores actual bank state, CHR-RAM, SRAM, controller latch and active DMC internals',async()=>{
 const h=fresh(bankedChrRamRom(mapper),'Mapper '+mapper);h.run('cpuWrite(0x4010,0x4f);cpuWrite(0x4011,40);cpuWrite(0x4012,0);cpuWrite(0x4013,2);cpuWrite(0x4015,0x11);cpuWrite(0x4000,0xbc);cpuWrite(0x4002,0xab);cpuWrite(0x4003,9)');
 if(mapper===1)h.run('cpuWrite(0xe000,1);cpuWrite(0xe000,0)');else h.run('cpuWrite(0x8000,0xc6);cpuWrite(0x8001,3);cpuWrite(0xc000,7);cpuWrite(0xc001,0);cpuWrite(0xe001,0)');
 h.run('emu.joyShift=0xa5;emu.joyState=0x80;emu.joyStrobe=false');enable(h);frames(h,1,[]);const anchor=machine(h),mapped=h.run('cpuRead(0x8100)');assert.equal(h.run('emu.hasChrRam'),true);assert.ok(h.run('emu.chrRam[0]')>0);assert.ok(h.run('emu.sram[0]')>0);assert.ok(h.run('apuCore.dmc.remaining')>0);frames(h,4,[]);const expected=machine(h);
 if(mapper===1)h.run('cpuWrite(0xe000,0x80);cpuWrite(0xe000,0);cpuWrite(0xe000,1);cpuWrite(0xe000,0);cpuWrite(0xe000,0);cpuWrite(0xe000,0)');else h.run('cpuWrite(0x8000,6);cpuWrite(0x8001,1);cpuWrite(0xa000,1);cpuWrite(0xe000,0)');frames(h,1,[]);
 assert.equal(await h.timeline.back(5),true);assert.deepEqual(machine(h),anchor);assert.equal(h.run('cpuRead(0x8100)'),mapped);h.run('emuToggleRun()');frames(h,4,[]);h.run('emuPause()');assert.deepEqual(machine(h),expected);metrics['mapper'+mapper]={mappedByte:mapped,ramHash:hash(h.run('emu.ram')),chrRamHash:hash(h.run('emu.chrRam')),sramHash:hash(h.run('emu.sram')),framebufferSha256:frameHash(h),dmc:h.json('apuCore.dmc')};
});
test('Recorded future is restored without CPU execution; resumed play branches and discards that future',async()=>{
 const h=fresh();enable(h);frames(h,10,['ArrowRight']);const end=h.run('emu.frameCount');assert.equal(await h.timeline.back(6),true);h.run('window.timelineCpuSteps=0;window.timelineOriginalCpuStep=cpuStep;cpuStep=function(){timelineCpuSteps++;return timelineOriginalCpuStep()}');assert.equal(await h.timeline.forward(3),true);assert.equal(h.run('timelineCpuSteps'),0);assert.equal(h.run('emu.frameCount'),end-3);h.run('emuToggleRun()');frames(h,1,['ArrowLeft']);h.run('emuPause()');assert.equal(h.timeline.status().newest,end-2);assert.equal(h.timeline.status().current,end-2);assert.ok(h.timeline.status().newest<end);metrics.branch={oldNewest:end,newNewest:h.timeline.status().newest};
});
test('Unknown current emulator state rejects rewind atomically instead of dropping unsupported state',async()=>{
 const h=fresh();enable(h);frames(h,3,[]);const before=machine(h);h.run('emu.timelineUnknownFunction=()=>7');const unknown=h.run('emu.timelineUnknownFunction');assert.equal(await h.timeline.back(),false);assert.equal(h.run('emu.timelineUnknownFunction'),unknown);h.run('delete emu.timelineUnknownFunction');assert.deepEqual(machine(h),before);assert.equal(h.run('emu.running'),false);
});
test('A replacement ROM cancels a yielding forward skip and cannot receive stale execution or restore',async()=>{
 const h=fresh(world,'Old world');enable(h);const pending=h.timeline.forward(60);h.context.timelineReplacement=Uint8Array.from(native);assert.equal(h.run('emuLoadRomData(timelineReplacement,"Replacement native",0)'),true);assert.equal(await pending,false);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(h.run('emu.frameCount'),0);assert.equal(h.run('emu.romName'),'Replacement native');assert.equal(h.run('emu.running'),false);assert.deepEqual(Buffer.from(h.run('emu.lastBuiltRom')),Buffer.from(native));assert.equal(h.timeline.status().canBack,false);metrics.cancel={newFrame:0,romSha256:hash(h.run('emu.lastBuiltRom'))};
});

(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
 const passed=results.filter(item=>item.passed).length,report={suite:'emulator-timeline-runtime',html:path.basename(html),htmlSha256:hash(fs.readFileSync(html)),scope:'Independent actual CPU/PPU/APU execution with native/world and original synthetic MMC1/MMC3 CHR-RAM fixtures; complete historical state, PCM continuation, frame-validated runtime capture, branching, cancellation and unknown-state rejection. Mock DOM, not browser or physical-hardware acceptance.',passed,failed:results.length-passed,total:results.length,metrics,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;
})();
