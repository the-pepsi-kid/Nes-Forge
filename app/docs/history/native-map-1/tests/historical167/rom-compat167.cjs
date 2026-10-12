#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadStoredForge,settle}=require('./storage-harness167.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.7_Architecture_Convergence.html'));
const tests=[],test=(name,fn)=>tests.push({name,fn});
const fixtures=[{name:'16 KB viewer',file:'packed-viewer',size:16384,marker:0x0ff0,kind:'forge'},
  {name:'32 KB playable slice',file:'single-room-poc',size:32768,marker:0x4ff0,kind:'playable'}];
function bytes(fixture){return new Uint8Array(fs.readFileSync(path.join(root,'tests/fixtures/golden167',fixture.file+'.nes')));}
async function fresh(){const h=loadStoredForge(html);await settle();assert.deepEqual(h.errors,[]);return h;}
function snapshot(h){return h.json(`({project:projectData(),id:S.projectId,dirty:Forge15.dirty,epoch:Forge.services.ProjectStore.state.epoch,
  history:{undo:undoStack,redo:redoStack,bytes:undoBytes},runtime:{loaded:emu.loaded,running:emu.running,frame:emu.frameCount,
  cycles:emu.cycles,PC:emu.PC,name:emu.romName,generation:emuRunGeneration,raf:emu.rafId,
  prg:Array.from(emu.prgRom||[]),original:Array.from(S.importedRom||[]),last:Array.from(emu.lastBuiltRom||[]),
  built:Array.from(window._lastBuiltRom||[]),ram:Array.from(emu.ram),palette:Array.from(emu.palRam),oam:Array.from(emu.oamMem)}})`);}
async function running(){const h=await fresh();h.context.reference167=bytes(fixtures[1]);
  h.run('Forge166.project.openRom(reference167,"Active reference.nes");snapshot();S.nt[0]=(S.nt[0]+1)&255;notify("compatibilityEdit");S.projectId=73');
  assert.equal(h.run('emuLoadRomData(reference167,"Running reference",2)',20000),true);
  h.run('emuToggleRun()');assert.equal(h.run('emu.running'),true);assert.equal(h.run('emu.frameCount'),2);
  assert.deepEqual(h.json('Array.from(S.importedRom)'),Array.from(h.context.reference167));return h;
}
function rejectAll(h,rom,pattern,{decoderCalls}={}){
  h.context.bad167=rom;const before=snapshot(h);
  assert.throws(()=>h.run('Forge166.project.classifyRom(bad167)',20000),pattern);assert.deepEqual(snapshot(h),before);
  assert.throws(()=>h.run('Forge166.project.openRom(bad167,"Unsupported.nes")',20000),pattern);assert.deepEqual(snapshot(h),before);
  assert.equal(h.run('importRom(bad167,"Unsupported.nes")',20000),false);assert.deepEqual(snapshot(h),before);
  assert.match(h.errors.at(-1),pattern);
  if(decoderCalls!==undefined)assert.equal(h.run('decoderCalls167'),decoderCalls,'Unsupported outer layout stops before the retained decoder');
}
test('Native blank factory submits schema 9 and current foundation before project normalization',async()=>{
  const h=await fresh();h.run(`window.factoryInput167=null;const prepare167=Forge.services.ProjectStore.prepareLoad;
  Forge.services.ProjectStore.prepareLoad=function(input){factoryInput167={version:input.version,foundation:input.foundation};return prepare167(input);};Forge166.project.create('blank')`);
  assert.deepEqual(h.json('factoryInput167'),{version:9,foundation:'1.6.7'});assert.equal(h.run('S.gameplay.mode'),'single-room');
});
for(const fixture of fixtures)test('Current layout 3 '+fixture.name+' remains recognizable and appendable',async()=>{
  const h=await fresh();h.context.current167=bytes(fixture);assert.equal(h.context.current167[16+fixture.marker+8],3);
  const before=snapshot(h),info=h.json('Forge166.project.classifyRom(current167)');assert.equal(info.kind,fixture.kind);assert.equal(info.captureOnly,false);assert.deepEqual(snapshot(h),before);
  if(fixture.kind==='playable'){
    h.run(`window.factoryInput167=null;const prepare167=Forge.services.ProjectStore.prepareLoad;
    Forge.services.ProjectStore.prepareLoad=function(input){factoryInput167={version:input.version,foundation:input.foundation};return prepare167(input);}`);
    assert.equal(h.run('Forge166.project.openRom(current167,"Current.nes")',20000),true);assert.deepEqual(h.json('factoryInput167'),{version:9,foundation:'1.6.7'});
    assert.deepEqual(h.json('Array.from(S.importedRom)'),Array.from(h.context.current167));
  }
  const append=await fresh();append.context.current167=bytes(fixture);assert.equal(append.run('importRom(current167,"Compatible.nes")',20000),true);
  assert.ok(append.run('S.scenes.length')>1);assert.deepEqual(append.json('Array.from(S.importedRom)'),Array.from(append.context.current167));
});
for(const fixture of fixtures)test('Unknown outer layouts in '+fixture.name+' reject classify/open/import before decoding or live mutation',async()=>{
  const h=await running();h.run(`window.decoderCalls167=0;const inspect167=Forge161.build.inspectWorldRom;
  Forge161.build.inspectWorldRom=function(...args){decoderCalls167++;return inspect167(...args);};`);
  for(const version of [0,4,255]){const rom=bytes(fixture);rom[16+fixture.marker+8]=version;rejectAll(h,rom,/Unsupported Forge ROM layout/,{decoderCalls:0});}
});
for(const fixture of fixtures)test('Unknown NFEX version in '+fixture.name+' retains existing atomic decoder rejection',async()=>{
  const h=await running(),rom=bytes(fixture),prg=rom.subarray(16,16+fixture.size),address=prg[fixture.marker+10]|prg[fixture.marker+11]<<8;
  const extension=16+(fixture.size===32768?0x4000:0)+address-0xc000;assert.equal(Buffer.from(rom.subarray(extension,extension+4)).toString(),'NFEX');
  rom[extension+4]=2;rejectAll(h,rom,/NFEX/);
});
test('A foreign ROM without the Forge marker retains foreign classification',async()=>{
  const h=await running(),rom=new Uint8Array(16+16384+8192);rom.set([78,69,83,26,1,1]);rom.set([0x4c,0,0xc0],16);rom.set([0,0xc0,0,0xc0,0,0xc0],16+0x3ffa);h.context.foreign167=rom;
  const before=snapshot(h),info=h.json('Forge166.project.classifyRom(foreign167)');assert.equal(info.kind,'rom');assert.equal(info.captureOnly,true);assert.deepEqual(snapshot(h),before);
});
(async()=>{const results=[];for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.message);}}
  const passed=results.filter(result=>result.passed).length,report={suite:'rom-compat167',scope:'Full production application VM and preserved emulator APIs: current golden ROM compatibility, explicit outer-layout rejection before retained decoders, inner-version rejection, and unchanged project/history/imported bytes/running emulator on failure. Mock DOM and animation scheduling; not a browser test.',passed,total:results.length,results};
  const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;
})();
