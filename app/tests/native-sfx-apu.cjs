#!/usr/bin/env node
'use strict';
// Exact source-linked native and emitted 6502 instructions execute on the
// existing CPU/APU buses. Controlled calls isolate one SFX update per frame;
// this is not full-game timing, speaker, browser or hardware acceptance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{worldProject,clone}=require('./world-fixtures170.cjs');
const root=path.resolve(__dirname,'..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
const cell=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
const pulseTimer=note=>Math.max(8,Math.min(2047,Math.round(1789773/(16*440*Math.pow(2,(note-57)/12))-1)));
const sample=registers=>Array.from({length:4},(_,channel)=>({channel,control:registers[channel*4],volume:channel===2?((registers[8]&127)?1:0):registers[channel*4]&15,duty:channel<2?registers[channel*4]>>>6:null,period:channel===3?registers[14]&15:registers[channel*4+2]|((registers[channel*4+3]&7)<<8)}));

function runNativeSfxAPU(htmlInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(root,manifest.output)),rom=new Uint8Array(fs.readFileSync(path.join(root,'examples/RE_Native_Audio/HonkeyPong-reproduced.nes'))),results=[],metrics={sourceSha256:sha(rom),effects:[]};
 const setup=loadForge(html);assert.deepEqual(setup.errors,[]);assert.ok(setup.context.FamiTone2SfxImport,'Actual bundled native SFX transcription module is required');
 function test(name,fn){const start=Date.now();try{fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error).slice(0,5000));}}
 function decode(bytes){setup.context.sfxSource=bytes;const evidence=setup.json('FamiTone2Native.decode(new Uint8Array(sfxSource))');assert.equal(evidence.status,'decoded',JSON.stringify(evidence.diagnostics));return evidence;}
 function preview(bytes,id){setup.context.sfxSource=bytes;setup.context.sfxId=id;const result=setup.json('FamiTone2SfxImport.preview(new Uint8Array(sfxSource),{effectId:sfxId,region:"NTSC",rows:64,mode:"transcription"})');assert.equal(result.status,'ready',JSON.stringify(result.diagnostics));return result;}
 function install(h,bytes){
  h.context.sfxROM=bytes;assert.equal(h.run('emuLoadRomData(new Uint8Array(sfxROM),"Native SFX CPU proof",0)'),true);
  h.run('var sfxProofFrame=-1,sfxProofWrites=[],sfxProofWrite=cpuWrite;cpuWrite=function(address,value){if(address>=0x4000&&address<=0x4017)sfxProofWrites.push({frame:sfxProofFrame,address,value:value&255});return sfxProofWrite(address,value);};function sfxProofCall(address,a,x,y){emu.A=a||0;emu.X=x||0;emu.Y=y||0;emu.PC=address;emu.SP=0xfd;emu.I=1;cpuPush(0x7f);cpuPush(0xfe);for(var steps=0;emu.PC!==0x7fff;steps++){if(steps>30000)throw Error("SFX routine failed to return within instruction budget");cpuStep();}if(emu.SP!==0xfd)throw Error("SFX routine stack is not balanced");}');
 }
 function call(h,address,a=0,x=0,y=0){h.run(`sfxProofCall(${address},${a},${x},${y})`,30000);}
 function nativeRun(bytes,id,frames=14,{music=false,seed=0xa5}={}){
  const evidence=decode(bytes),h=loadForge(html),sy=evidence.recognition.driver.symbols,musicAddress=evidence.native.music.address,table=evidence.native.sfx.tableAddress,ram=evidence.recognition.driver.ramBase;
  install(h,bytes);
  // Source famitone2.oph: FT_VARS is base+100; each 15-byte SFX stream
  // begins at base+125, with its 11-byte register buffer four bytes later.
  // ClearChannel only initializes controls. Deliberately seed every retained
  // timer byte; silent buffers must not be mistaken for known-zero timers.
  for(let stream=0;stream<4;stream++)for(const index of [1,2,4,5,7,8,10])h.run(`cpuWrite(${ram+129+stream*15+index},${seed})`);
  call(h,sy.famitoneinit,1,musicAddress&255,musicAddress>>>8);call(h,sy.famitonesfxinit,0,table&255,table>>>8);
  const initialized=h.json(`Array.from(emu.ram.slice(${ram+129},${ram+140}))`);
  if(music)call(h,sy.famitonemusicplay,0);if(id!==null)call(h,sy.famitonesfxplay,id,0);
  const timeline=[],active=[];for(let frame=0;frame<frames;frame++){h.context.sfxProofFrame=frame;call(h,sy.famitoneupdate);timeline.push(sample(h.json('Array.from(emu.apuRegs)')));active.push(h.run(`cpuRead(${ram+127})!==0`));}
  assert.equal(h.run('emu.opsMissed'),0);assert.deepEqual(h.errors,[]);return{evidence,timeline,active,initialized,writes:h.json('sfxProofWrites'),opsMissed:h.run('emu.opsMissed')};
 }
 function project(imported,withMusic=false){
  const p=clone(worldProject());p.worldRuntime.enabled=true;p.audioRuntime={enabled:true,musicEnabled:withMusic};p.tempo=imported.tempo;p.speed=imported.speed;p.audRows=imported.rows;p.patterns=copy(imported.patterns);p.instruments=copy(imported.instruments);p.sfx=copy(imported.sfx);p.orderList=[[0,0,0,0,0]];
  for(const animation of p.animations||[])for(const frame of animation.frames||[])frame.events=(frame.events||[]).filter(event=>event.type!=='sound');
  if(withMusic){const pattern={rows:Array.from({length:p.audRows},()=>Array.from({length:5},cell))},instrument=p.instruments.length;p.instruments.push({name:'SFX resume proof',volEnv:[15],dutyEnv:[3],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0});for(const [channel,note,vol]of [[0,57,15],[1,45,6],[2,33,15],[3,24,5]])pattern.rows[0][channel]={note,inst:instrument,vol,fx:0,fxp:0};const pi=p.patterns.length;p.patterns.push(pattern);p.orderList=[[pi,pi,pi,pi,pi]];}
  return p;
 }
 function buildProject(p){const h=loadForge(html);h.context.sfxProject=p;h.run('db_deserializeState(sfxProject);window._buildAndRunMode=true');const artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000);assert.ok(artifact?.rom,'Canonical compiler returned no ROM');assert.equal(artifact.backend,'world');assert.deepEqual(h.errors,[]);return{h,artifact,project:p};}
 function build(imported,edit,withMusic=false){const p=project(imported,withMusic);if(edit)edit(p);return buildProject(p);}
 function canonicalRun(built,frames=14,{preFrames=0,trigger=true,retriggerFrame=null}={}){
  const h=loadForge(html),sy=built.artifact.world.symbols.labels,zp=built.artifact.world.symbols.audio;install(h,built.artifact.rom);call(h,sy.aud_init);
  const before=[];for(let frame=0;frame<preFrames;frame++){h.context.sfxProofFrame=frame-preFrames;call(h,sy.aud_frame);before.push(sample(h.json('Array.from(emu.apuRegs)')));}
  if(trigger)call(h,sy.aud_play_sfx,0);const timeline=[],active=[];
  for(let frame=0;frame<frames;frame++){h.context.sfxProofFrame=frame;if(frame===retriggerFrame)call(h,sy.aud_play_sfx,0);call(h,sy.aud_frame);timeline.push(sample(h.json('Array.from(emu.apuRegs)')));active.push(h.run(`cpuRead(${zp.sfxActive})!==0`));}
  assert.equal(h.run('emu.opsMissed'),0);assert.deepEqual(h.errors,[]);return{before,timeline,active,writes:h.json('sfxProofWrites'),opsMissed:h.run('emu.opsMissed')};
 }
 function compare(native,canonical,frames,channel=0){
  let maximumCents=0;for(let frame=0;frame<frames;frame++){
   const a=native.timeline[frame][channel],b=canonical.timeline[frame][channel];assert.equal(b.volume,a.volume,'Volume frame '+frame);if(a.volume){assert.equal(b.duty,a.duty,'Duty frame '+frame);const error=Math.abs(1200*Math.log2((a.period+1)/(b.period+1))),best=Math.min(...Array.from({length:96},(_,note)=>Math.abs(1200*Math.log2((a.period+1)/(pulseTimer(note)+1)))));assert.ok(error<=best+1e-7,'Nearest native pitch frame '+frame);maximumCents=Math.max(maximumCents,error);}
  }
  return maximumCents;
 }
 const originals=[];
 for(const effectId of [0,1]){
  const item={effectId};originals.push(item);
  test('Independent effect '+effectId+' becomes a finite canonical SFX with original terminal frame retained',()=>{
   item.preview=preview(rom,effectId);const imported=item.preview.imported;assert.equal(imported.tempo,150);assert.equal(imported.speed,1);assert.equal(imported.durationFrames,12);assert.equal(imported.sfx.length,1);assert.equal(imported.sfx[0].startRow,0);assert.equal(imported.sfx[0].endRow,12);assert.equal(imported.sfx[0].channel,0);assert.equal(imported.patterns[0].rows[12][0].note,-2);item.native=nativeRun(rom,effectId);item.built=build(imported);item.canonical=canonicalRun(item.built);assert.deepEqual(item.native.timeline.slice(0,12).map(frame=>frame[0].volume),Array.from({length:12},(_,i)=>15-i));assert.deepEqual(item.native.timeline.slice(0,12).map(frame=>frame[0].duty),[0,0,...Array(10).fill(2)]);assert.deepEqual(item.native.timeline.slice(0,12).map(frame=>frame[0].period),Array(12).fill(effectId===0?854:427));
  });
  test('Independent effect '+effectId+' matches original per-frame volume, duty, nearest pitch and silent other channels',()=>{
   assert.ok(item.canonical);const maximumCents=compare(item.native,item.canonical,12);for(let frame=0;frame<14;frame++)for(let channel=1;channel<4;channel++){assert.equal(item.native.timeline[frame][channel].volume,0);assert.equal(item.canonical.timeline[frame][channel].volume,0);}assert.equal(item.native.opsMissed,0);assert.equal(item.canonical.opsMissed,0);assert.notDeepEqual(item.native.writes,item.canonical.writes,'Do not claim exact source register streams');metrics.effects.push({effectId,sourcePeriod:effectId===0?854:427,durationFrames:12,maximumAbsoluteCents:maximumCents,nativeWrites:item.native.writes.length,canonicalWrites:item.canonical.writes.length,canonicalRomSha256:sha(item.built.artifact.rom)});
  });
 }
 test('Source EOF mixes its final retained buffer before silence, while canonical terminal row prevents early cutoff',()=>{
  for(const item of originals){assert.equal(item.native.active[10],true);assert.equal(item.native.active[11],false);assert.equal(item.native.timeline[11][0].volume,4);assert.equal(item.canonical.timeline[11][0].volume,4);assert.equal(item.canonical.active[11],true);for(const frame of [12,13]){assert.equal(item.native.timeline[frame][0].volume,0);assert.equal(item.canonical.timeline[frame][0].volume,0);assert.equal(item.canonical.active[frame],false);}}
 });
 test('Native initialization retains unknown timer bytes but independent pulse effects establish their audible state',()=>{
  const otherSeed=nativeRun(rom,0,14,{seed:0x69});for(const index of [1,2,4,5,7,8,10]){assert.equal(originals[0].native.initialized[index],0xa5);assert.equal(otherSeed.initialized[index],0x69);}assert.deepEqual(originals[0].native.initialized.filter((_,i)=>[0,3,6,9].includes(i)),[0x30,0x30,0,0x30]);assert.deepEqual(otherSeed.timeline.map(frame=>frame[0]),originals[0].native.timeline.map(frame=>frame[0]));assert.notEqual(otherSeed.timeline[0][1].period,originals[0].native.timeline[0][1].period,'Silent timer output is genuinely dependent on prior buffer state');
 });
 test('Changing native timer and duty bytes leaves driver code untouched and changes actual source and generated APU output',()=>{
  const evidence=decode(rom),effect=evidence.native.sfx.effects.find(item=>item.id===0).NTSC,low=effect.events.find(event=>event.kind==='register'&&event.register===0x4002),control=effect.events.find(event=>event.kind==='register'&&event.frame===2),changed=rom.slice();changed[low.source.fileOffset+1]=0x26;changed[control.source.fileOffset+1]=0x7b;const driver=evidence.recognition.driver.source;assert.deepEqual(Array.from(changed.slice(driver.fileOffset,driver.fileOffset+driver.length)),Array.from(rom.slice(driver.fileOffset,driver.fileOffset+driver.length)));assert.deepEqual(Array.from(rom.keys()).filter(index=>rom[index]!==changed[index]),[low.source.fileOffset+1,control.source.fileOffset+1]);const converted=preview(changed,0),native=nativeRun(changed,0),canonical=canonicalRun(build(converted.imported));compare(native,canonical,12);assert.equal(native.timeline[0][0].period,806);assert.equal(native.timeline[2][0].duty,1);assert.equal(native.timeline[2][0].volume,11);assert.notEqual(canonical.timeline[0][0].period,originals[0].canonical.timeline[0][0].period);assert.equal(canonical.timeline[2][0].duty,1);assert.equal(canonical.timeline[2][0].volume,11);metrics.nativeDerivative={sha256:sha(changed),changedOffsets:[low.source.fileOffset+1,control.source.fileOffset+1]};
 });
 test('A native Pulse 2 stream derivative matches original and generated APU output on the selected channel only',()=>{
  // Directed derivative of the same independent input, not a second game.
  // The three native buffer opcodes move from Pulse 1 slots $80..$82 to
  // Pulse 2 slots $83..$85; control values, timings and driver remain exact.
  const evidence=decode(rom),effect=evidence.native.sfx.effects.find(item=>item.id===0).NTSC,changed=rom.slice(),offsets=[];
  for(const event of effect.events)if(event.kind==='register'){const at=event.source.fileOffset;assert.ok(changed[at]>=0x80&&changed[at]<=0x82);changed[at]+=3;offsets.push(at);}
  assert.deepEqual(Array.from(rom.keys()).filter(index=>rom[index]!==changed[index]),offsets);const driver=evidence.recognition.driver.source;assert.deepEqual(Array.from(changed.slice(driver.fileOffset,driver.fileOffset+driver.length)),Array.from(rom.slice(driver.fileOffset,driver.fileOffset+driver.length)));
  const converted=preview(changed,0),native=nativeRun(changed,0),canonical=canonicalRun(build(converted.imported));assert.equal(converted.imported.sfx[0].channel,1);assert.equal(converted.imported.sfx[0].endRow,12);assert.equal(converted.imported.patterns[0].rows[12][1].note,-2);const maximumCents=compare(native,canonical,12,1);
  assert.deepEqual(native.timeline.slice(0,12).map(frame=>frame[1].volume),Array.from({length:12},(_,i)=>15-i));assert.deepEqual(native.timeline.slice(0,12).map(frame=>frame[1].duty),[0,0,...Array(10).fill(2)]);assert.deepEqual(native.timeline.slice(0,12).map(frame=>frame[1].period),Array(12).fill(854));
  for(let frame=0;frame<14;frame++)for(const channel of [0,2,3]){assert.equal(native.timeline[frame][channel].volume,0);assert.equal(canonical.timeline[frame][channel].volume,0);}for(const frame of [12,13]){assert.equal(native.timeline[frame][1].volume,0);assert.equal(canonical.timeline[frame][1].volume,0);assert.equal(canonical.active[frame],false);}metrics.pulse2Derivative={sha256:sha(changed),changedOffsets:offsets,durationFrames:12,maximumAbsoluteCents:maximumCents};
 });
 test('Ordinary canonical note and volume edits change the rebuilt ROM and only the authored SFX frame',()=>{
  const item=originals[0],before=item.preview.imported.patterns[0].rows[0][0],edited=build(item.preview.imported,p=>{p.patterns[0].rows[0][0].note++;p.patterns[0].rows[0][0].vol=7;}),actual=canonicalRun(edited);assert.notEqual(sha(edited.artifact.rom),sha(item.built.artifact.rom));assert.equal(actual.timeline[0][0].period,pulseTimer(before.note+1));assert.equal(actual.timeline[0][0].volume,7);assert.notEqual(actual.timeline[0][0].period,item.canonical.timeline[0][0].period);assert.deepEqual(actual.timeline.slice(1),item.canonical.timeline.slice(1));for(let channel=1;channel<4;channel++)assert.deepEqual(actual.timeline[0][channel],item.canonical.timeline[0][channel]);metrics.canonicalEdit={noteBefore:before.note,noteAfter:before.note+1,volume:7,romSha256:sha(edited.artifact.rom)};
 });
 test('Canonical SFX IDs, patterns, instruments and generated bytes survive actual project serialization and reopening',()=>{
  const item=originals[1],saved=item.built.h.run('Forge.services.ProjectStore.serialize()'),snapshot=JSON.parse(saved),reopened=buildProject(JSON.parse(saved));assert.equal(snapshot.version,13);assert.deepEqual(snapshot.sfx,item.preview.imported.sfx);assert.deepEqual(snapshot.patterns,item.preview.imported.patterns);assert.deepEqual(snapshot.instruments,item.preview.imported.instruments);assert.equal(sha(reopened.artifact.rom),sha(item.built.artifact.rom));assert.deepEqual(canonicalRun(reopened).timeline,item.canonical.timeline);assert.equal(sha(rom),metrics.sourceSha256);
 });
 test('Imported effect follows existing Forge music takeover, busy rejection and exact saved-channel restoration',()=>{
  const built=build(originals[0].preview.imported,null,true),music=canonicalRun(built,14,{preFrames:1,trigger:false}),mixed=canonicalRun(built,14,{preFrames:1}),busy=canonicalRun(built,14,{preFrames:1,retriggerFrame:3});assert.deepEqual(mixed.before[0],music.before[0]);assert.deepEqual(busy.timeline,mixed.timeline,'Existing one-SFX busy gate must remain unchanged');for(let frame=0;frame<14;frame++)for(let channel=1;channel<4;channel++)assert.deepEqual(mixed.timeline[frame][channel],music.timeline[frame][channel]);for(let frame=0;frame<12;frame++){assert.equal(mixed.timeline[frame][0].volume,15-frame);assert.equal(mixed.timeline[frame][0].period,originals[0].canonical.timeline[frame][0].period);}assert.deepEqual(mixed.timeline[12][0],music.before[0][0]);assert.deepEqual(mixed.timeline[13][0],music.timeline[13][0]);assert.equal(mixed.active[12],false);
 });
 test('Original louder-or-equal arbitration remains distinct from imported Forge channel ownership',()=>{
  const music=nativeRun(rom,null,14,{music:true}),mixed=nativeRun(rom,0,14,{music:true}),frame=2;assert.equal(music.timeline[frame][0].volume,14);assert.equal(originals[0].native.timeline[frame][0].volume,13);assert.deepEqual(mixed.timeline[frame][0],music.timeline[frame][0],'Native louder music wins');assert.match(originals[0].preview.limitations.join(' '),/arbitration|mixing|ownership|preempt/i);metrics.arbitrationDifference={frame,nativeMusicVolume:14,nativeSfxVolume:13,nativeWinner:'music',canonicalContract:'One imported SFX owns its chosen channel and restores saved music state; native arbitration is not transcribed.'};
 });
 const passed=results.filter(item=>item.passed).length;return{suite:'native-sfx-apu',html:path.basename(html),htmlSha256:sha(fs.readFileSync(html)),scope:'Two independently authored native pulse SFX and a directed data-only edit. Actual original and generated CPU/APU routines verify volume, duty, nearest canonical pitch, terminal-buffer frame, source initialization ambiguity, ordinary canonical edits, persistence and unchanged Forge SFX ownership/restoration. Controlled routine calls isolate one update per frame; this is not general SFX recovery, native arbitration replay, identical waveforms, full-game timing, speaker output, browser or hardware acceptance.',passed,failed:results.length-passed,total:results.length,metrics,results};
}
module.exports=runNativeSfxAPU;
if(require.main===module){const report=runNativeSfxAPU(process.argv[2]),output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(report.passed+'/'+report.total+' passed');process.exitCode=report.failed?1:0;}
