'use strict';
// Independent CPU/APU comparison of the external driver's score and the
// canonical 6502 Audio Runtime. This deliberately does NOT claim identical
// waveforms, register-write streams, speaker output, or hardware acceptance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{worldProject,clone}=require('./world-fixtures170.cjs');
const app=path.resolve(__dirname,'..');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const sampleRegs=registers=>[0,1,2,3].map(channel=>{
 const at=channel*4,control=registers[at],period=channel===3?registers[14]&15:registers[at+2]|((registers[at+3]&7)<<8);
 return{channel,control,volume:channel===2?((control&127)?1:0):control&15,duty:channel<2?control>>>6:null,period};
});

function runNativeImportAPU(htmlInput){
 const manifest=JSON.parse(fs.readFileSync(path.join(app,'source-manifest.json'))),html=path.resolve(htmlInput||path.join(app,manifest.output)),rom=fs.readFileSync(path.join(app,'examples/RE_Native_Audio/HonkeyPong-reproduced.nes'));
 const results=[],metrics={inputSha256:hash(rom),cases:[]};
 function test(name,fn){const start=Date.now();try{fn();results.push({name,passed:true,milliseconds:Date.now()-start});}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});}}
 function installCPU(h,bytes){
  h.context.importAPURom=Uint8Array.from(bytes);
  assert.equal(h.run('emuLoadRomData(importAPURom,"Native transcription CPU evidence",0)'),true);
  h.run(`var importFrame=-1,importWrites=[],importRows=[],importChannelUpdate=-1;
   var importOriginalWrite=cpuWrite;cpuWrite=function(a,v){if(a>=0x4000&&a<=0x4017)importWrites.push({frame:importFrame,address:a,value:v});return importOriginalWrite(a,v)};
   function importCPUCall(address,a,x,y){
    emu.A=a||0;emu.X=x||0;emu.Y=y||0;emu.PC=address;emu.SP=0xfd;emu.I=1;
    // $7FFF is an unexecuted return sentinel outside NROM. Every opcode of
    // the original/generated routine, including RTS, executes normally.
    cpuPush(0x7f);cpuPush(0xfe);
    for(var steps=0;emu.PC!==0x7fff;steps++){
     if(steps>30000)throw Error('Audio subroutine failed to return within CPU budget');
     if(emu.PC===importChannelUpdate&&emu.X===55)importRows.push(importFrame);
     cpuStep();
    }
    if(emu.SP!==0xfd)throw Error('Unbalanced audio subroutine stack');
   }
  `);
 }
 function nativeRun(evidence,songIndex,frames,sourceROM=rom){
  const h=loadForge(html),driver=evidence.recognition.driver,sy=driver.symbols,music=evidence.native.music.address;
  installCPU(h,sourceROM);h.context.importChannelUpdate=sy._ft2channelupdate;
  h.run(`importChannelUpdate=${sy._ft2channelupdate};importCPUCall(${sy.famitoneinit},1,${music&255},${music>>>8});importCPUCall(${sy.famitonemusicplay},${songIndex},0,0)`);
  const timeline=[];for(let frame=0;frame<frames;frame++){h.run(`importFrame=${frame};importCPUCall(${sy.famitoneupdate},0,0,0)`);timeline.push(sampleRegs(h.json('Array.from(emu.apuRegs)')));}
  return{timeline,writes:h.json('importWrites'),rowFrames:h.json('importRows'),opsMissed:h.run('emu.opsMissed'),errors:[...h.errors]};
 }
 function build(imported,edit){
  const p=clone(worldProject());p.audioRuntime={enabled:true,musicEnabled:true};p.worldRuntime.enabled=true;
  Object.assign(p,{tempo:imported.tempo,speed:imported.speed,audRows:imported.rows,patterns:clone(imported.patterns),orderList:clone(imported.orderList),instruments:clone(imported.instruments),sfx:[]});
  // This isolated audio proof has no gameplay-triggered effects. Removing
  // fixture sound links is explicit; the normal import keeps user's SFX.
  for(const animation of p.animations||[])for(const frame of animation.frames||[])frame.events=(frame.events||[]).filter(event=>event.type!=='sound');
  if(edit)edit(p);
  const h=loadForge(html);h.context.importAudioProject=p;h.run('db_deserializeState(importAudioProject);window._buildAndRunMode=true');
  const artifact=h.run('Forge.services.RuntimeCompiler.compile()',30000);assert.ok(artifact?.rom,'Canonical RuntimeCompiler returned no ROM');assert.equal(artifact.backend,'world');
  return{h,artifact,project:p};
 }
 function canonicalRun(built,frames){
  const h=built.h,labels=built.artifact.world.symbols.labels;assert.ok(Number.isInteger(labels.aud_frame),'Missing emitted Audio Runtime frame symbol');
  installCPU(h,built.artifact.rom);h.run(`importCPUCall(${labels.aud_init},0,0,0)`);
  const timeline=[];for(let frame=0;frame<frames;frame++){h.run(`importFrame=${frame};importCPUCall(${labels.aud_frame},0,0,0)`);timeline.push(sampleRegs(h.json('Array.from(emu.apuRegs)')));}
  return{timeline,writes:h.json('importWrites'),opsMissed:h.run('emu.opsMissed'),errors:[...h.errors]};
 }
 const setup=loadForge(html);setup.context.nativeImportBytes=rom;
 const evidence=setup.json('FamiTone2Native.decode(new Uint8Array(nativeImportBytes))');assert.equal(evidence.status,'decoded');
 const canonicalTables=setup.json('Array.from({length:3},(_,channel)=>Array.from({length:96},(_,note)=>channel===2?Forge.services.AudioCompiler.triangleTimer(note):Forge.services.AudioCompiler.timer(note)))');
 const previews=[],cases=[];
 for(const songIndex of [0,1]){
  setup.context.nativeImportOptions={songIndex,region:'NTSC',nativeRows:64,rows:64,mode:'transcription'};
  const preview=setup.json('FamiTone2AudioImport.preview(new Uint8Array(nativeImportBytes),nativeImportOptions)');previews.push(preview);
  test('Independent subsong '+songIndex+' produces a canonical score for explicit transcription',()=>{assert.equal(preview.status,'ready',JSON.stringify(preview.diagnostics));assert.equal(preview.sourceSha256,hash(rom));assert.equal(preview.imported.tempo,150);assert.equal(preview.imported.speed,1);});
  if(preview.status!=='ready')continue;
  const frames=preview.imported.durationFrames,native=nativeRun(evidence,songIndex,frames+1),built=build(preview.imported),canonical=canonicalRun(built,frames+1);
  const item={songIndex,preview,frames,native,canonical,built};cases.push(item);
  const observed={songIndex,frames,nativeRowFrames:native.rowFrames,maximumAbsoluteCents:0,periodDifferences:0,firstDifferences:[],nativeWrites:native.writes.length,canonicalWrites:canonical.writes.length};metrics.cases.push(observed);
  test('Subsongs '+songIndex+': original and generated 6502 routines execute without missed opcodes',()=>{assert.equal(native.opsMissed,0);assert.equal(canonical.opsMissed,0);assert.deepEqual(native.errors,[]);assert.deepEqual(canonical.errors,[]);});
  test('Subsong '+songIndex+': row scheduling matches actual external driver calls',()=>{assert.equal(preview.provenance.frameSchedule.length,64);assert.deepEqual(preview.provenance.frameSchedule.map(row=>row.frame),native.rowFrames.slice(0,64));});
  test('Subsong '+songIndex+': pulse volume/duty and four channel gates match every source frame',()=>{
   for(let frame=0;frame<frames;frame++)for(let channel=0;channel<4;channel++){
    const a=native.timeline[frame][channel],b=canonical.timeline[frame][channel],label='frame '+frame+' channel '+channel;
    assert.equal(b.volume,a.volume,label+' volume/gate');if(channel<2&&a.volume)assert.equal(b.duty,a.duty,label+' duty');
   }
  });
  test('Subsong '+songIndex+': sounding pitch maps to the nearest canonical period with measured error',()=>{
   for(let frame=0;frame<frames;frame++)for(let channel=0;channel<3;channel++){
    const a=native.timeline[frame][channel],b=canonical.timeline[frame][channel];if(!a.volume)continue;
    const table=canonicalTables[channel];
    const error=1200*Math.log2((a.period+1)/(b.period+1)),best=Math.min(...table.map(value=>Math.abs(1200*Math.log2((a.period+1)/(value+1)))));
    assert.ok(Math.abs(error)<=best+1e-7,'Not nearest pitch at frame '+frame+' channel '+channel);assert.ok(Math.abs(error)<=50,'More than half a semitone drift');
    observed.maximumAbsoluteCents=Math.max(observed.maximumAbsoluteCents,Math.abs(error));
    if(a.period!==b.period){observed.periodDifferences++;if(observed.firstDifferences.length<8)observed.firstDifferences.push({frame,channel,nativePeriod:a.period,canonicalPeriod:b.period,cents:error});}
   }
   assert.ok(observed.periodDifferences>0,'Fixture must exercise disclosed nonidentical tuning');
  });
  test('Subsong '+songIndex+': canonical excerpt cuts all channels at the declared end',()=>{assert.deepEqual(canonical.timeline[frames].map(ch=>ch.volume),[0,0,0,0]);});
 }
 test('Evidence records real register-behavior differences rather than claiming bit-exact playback',()=>{
  assert.equal(cases.length,2);for(const {native,canonical} of cases){assert.notDeepEqual(native.writes,canonical.writes);assert.ok(canonical.writes.filter(w=>w.address===0x4003&&w.frame>=0).length>native.writes.filter(w=>w.address===0x4003&&w.frame>=0).length);assert.ok(native.writes.some(w=>w.address===0x4008&&w.value>0x80&&w.value<0xff));assert.ok(canonical.writes.some(w=>w.address===0x4008&&w.value===0xff));}
 });
 test('External-driver derivative preserves looping volume/arpeggio frames and negative-arpeggio ADC carry',()=>{
  // Directed test derivative of the permitted input, NOT another independently
  // authored game. Replace only instrument-0 volume/arpeggio pointers plus two
  // short envelopes in verified zero padding. Keep pitch and driver unchanged.
  const derivative=Buffer.from(rom),at=16+16000,address=0xc000+16000,record=evidence.native.music.instruments[0].source.fileOffset;
  assert.ok(derivative.subarray(at,at+48).every(byte=>byte===0),'Derivative storage is not unused zero padding');
  const volume=[195,2,204,1,192,0,0],arpeggio=[191,1,192,2,194,0,0];
  derivative.set(volume,at);derivative.set(arpeggio,at+32);
  derivative[record+1]=address&255;derivative[record+2]=address>>>8;
  derivative[record+3]=(address+32)&255;derivative[record+4]=(address+32)>>>8;
  const span=evidence.recognition.driver.source;assert.deepEqual(derivative.subarray(span.fileOffset,span.fileOffset+span.length),rom.subarray(span.fileOffset,span.fileOffset+span.length));
  setup.context.nativeImportDerivative=derivative;
  const decoded=setup.json('FamiTone2Native.decode(new Uint8Array(nativeImportDerivative))');assert.equal(decoded.status,'decoded',JSON.stringify(decoded.diagnostics));
  const preview=setup.json('FamiTone2AudioImport.preview(new Uint8Array(nativeImportDerivative),{songIndex:0,region:"NTSC",nativeRows:16,rows:64,mode:"transcription"})');
  assert.equal(preview.status,'ready',JSON.stringify(preview.diagnostics));const frames=preview.imported.durationFrames,native=nativeRun(decoded,0,frames,derivative),canonical=canonicalRun(build(preview.imported),frames);
  // The real linked code leaves carry from note20 + signed(-1) and feeds it
  // into the low timer ADC. Reproducing table[19] alone would be one unit off.
  const expectedNegative=decoded.native.timerTables.NTSC[19]+1;
  assert.equal(native.timeline[0][0].period,expectedNegative);assert.equal(native.timeline[1][0].period,expectedNegative);
  assert.equal(native.timeline[2][0].period,decoded.native.timerTables.NTSC[20]);assert.equal(native.timeline[5][0].period,decoded.native.timerTables.NTSC[22]);assert.equal(native.timeline[6][0].period,expectedNegative);
  assert.deepEqual(native.timeline.slice(0,12).map(frame=>frame[0].volume),[3,3,3,12,12,0,3,3,3,12,12,0]);
  assert.ok(preview.provenance.tuning.some(item=>item.channel===0&&item.nativeNoteCode===20&&item.arp===-1&&item.period===expectedNegative));
  for(let frame=0;frame<frames;frame++)for(let channel=0;channel<4;channel++){
   const a=native.timeline[frame][channel],b=canonical.timeline[frame][channel];assert.equal(b.volume,a.volume,'Envelope derivative volume/gate '+frame+':'+channel);
   if(channel<2&&a.volume)assert.equal(b.duty,a.duty);
   if(channel<3&&a.volume){const error=Math.abs(1200*Math.log2((a.period+1)/(b.period+1))),best=Math.min(...canonicalTables[channel].map(value=>Math.abs(1200*Math.log2((a.period+1)/(value+1)))));assert.ok(error<=best+1e-7,'Envelope derivative pitch '+frame+':'+channel);}
  }
  assert.equal(native.opsMissed,0);assert.equal(canonical.opsMissed,0);assert.deepEqual(native.errors,[]);assert.deepEqual(canonical.errors,[]);
  metrics.envelopeDerivative={description:'HonkeyPong derivative with instrument-0 volume/arpeggio pointers redirected to test envelopes in zero padding; original linked driver and pitch envelope unchanged',romSha256:hash(derivative),frames,storageFileOffset:at,volumeBytes:volume,arpeggioBytes:arpeggio,expectedNegativeCarryPeriod:expectedNegative,first12NativePulseFrames:native.timeline.slice(0,12).map(frame=>frame[0]),first12CanonicalPulseFrames:canonical.timeline.slice(0,12).map(frame=>frame[0])};
 });
 test('External-driver derivative confirms global speed precedence through repeated channel loops',()=>{
  const derivative=Buffer.from(rom),at=16+15872,address=0xc000+15872,header=evidence.native.music.songs[0].source.fileOffset;
  assert.ok(derivative.subarray(at,at+128).every(byte=>byte===0));
  // All five streams loop every six logical rows. At row0 pulse1 sets3,
  // pulse2 sets2, then triangle sets7. Pulse2 changes to4 at row3; pulse1
  // changes to5 at row4. These are test score bytes, never patched driver code.
  const streams=[{offset:0,bytes:[0xfb,3,0x80,40,0x85,0xfb,5,42,0x81]},
   {offset:32,bytes:[0xfb,2,0x85,0xfb,4,0x85]},
   {offset:64,bytes:[0xfb,7,0x80,50,0x89]},
   {offset:96,bytes:[0x8b]},{offset:112,bytes:[0x8b]}];
  for(let channel=0;channel<5;channel++){const stream=streams[channel],ptr=address+stream.offset;derivative.set([...stream.bytes,0xfd,ptr&255,ptr>>>8],at+stream.offset);derivative[header+2*channel]=ptr&255;derivative[header+2*channel+1]=ptr>>>8;}
  const span=evidence.recognition.driver.source;assert.deepEqual(derivative.subarray(span.fileOffset,span.fileOffset+span.length),rom.subarray(span.fileOffset,span.fileOffset+span.length));
  setup.context.nativeSpeedDerivative=derivative;
  const decoded=setup.json('FamiTone2Native.decode(new Uint8Array(nativeSpeedDerivative))');assert.equal(decoded.status,'decoded',JSON.stringify(decoded.diagnostics));
  const preview=setup.json('FamiTone2AudioImport.preview(new Uint8Array(nativeSpeedDerivative),{songIndex:0,region:"NTSC",nativeRows:24,rows:64,mode:"transcription"})');assert.equal(preview.status,'ready',JSON.stringify(preview.diagnostics));
  const frames=preview.imported.durationFrames,native=nativeRun(decoded,0,frames+1,derivative),canonical=canonicalRun(build(preview.imported),frames+1);
  assert.deepEqual(preview.provenance.frameSchedule.map(item=>item.frame),native.rowFrames.slice(0,24));
  assert.deepEqual(preview.provenance.frameSchedule.map(item=>item.speed),Array.from({length:4},()=>[7,7,7,4,5,5]).flat());
  for(let frame=0;frame<frames;frame++)for(let channel=0;channel<4;channel++){
   const a=native.timeline[frame][channel],b=canonical.timeline[frame][channel];assert.equal(b.volume,a.volume,'Speed derivative gate/envelope '+frame+':'+channel);
   if(channel<2&&a.volume)assert.equal(b.duty,a.duty);
   if(channel<3&&a.volume){const error=Math.abs(1200*Math.log2((a.period+1)/(b.period+1))),best=Math.min(...canonicalTables[channel].map(value=>Math.abs(1200*Math.log2((a.period+1)/(value+1)))));assert.ok(error<=best+1e-7,'Speed derivative pitch '+frame+':'+channel);}
  }
  assert.deepEqual(canonical.timeline[frames].map(item=>item.volume),[0,0,0,0]);assert.equal(native.opsMissed,0);assert.equal(canonical.opsMissed,0);assert.deepEqual(native.errors,[]);assert.deepEqual(canonical.errors,[]);
  metrics.speedDerivative={description:'HonkeyPong derivative redirects only subsong0 channel pointers to five short test streams in zero padding; linked driver and original instruments unchanged',romSha256:hash(derivative),frames,storageFileOffset:at,streams,nativeRowFrames:native.rowFrames,frameSchedule:preview.provenance.frameSchedule};
 });
 test('Editing an imported ordinary tracker note changes the rebuilt ROM and real APU pitch',()=>{
  const item=cases[0];assert.ok(item,'Missing first transcription');let change;
  const edited=build(item.preview.imported,p=>{for(let order=0;order<p.orderList.length&&!change;order++){const pi=p.orderList[order][0],pattern=p.patterns[pi];for(let row=0;row<p.audRows;row++)if(pattern.rows[row][0].note>=0){const before=pattern.rows[row][0].note;pattern.rows[row][0].note=before+1;change={frame:order*p.audRows+row,before,after:before+1};break;}}});
  assert.ok(change);assert.notEqual(hash(edited.artifact.rom),hash(item.built.artifact.rom));const changed=canonicalRun(edited,item.frames+1),expected=setup.run('Forge.services.AudioCompiler.timer('+change.after+')');let differences=0;
  for(let frame=0;frame<=item.frames;frame++){
   assert.deepEqual(changed.timeline[frame].map(ch=>ch.volume),item.canonical.timeline[frame].map(ch=>ch.volume),'Editor note change preserves gates/envelopes');
   for(let channel=1;channel<4;channel++)assert.deepEqual(changed.timeline[frame][channel],item.canonical.timeline[frame][channel]);
   const before=item.canonical.timeline[frame][0],after=changed.timeline[frame][0];if(before.volume&&before.period!==after.period){differences++;assert.equal(after.period,expected);}
  }
  assert.ok(differences>0,'No observable generated pitch change');assert.equal(changed.opsMissed,0);assert.deepEqual(changed.errors,[]);metrics.edit={...change,changedSoundingFrames:differences,rebuiltRomSha256:hash(edited.artifact.rom)};
 });
 const passed=results.filter(result=>result.passed).length;
 return{suite:'native-audio-import-apu200',html:path.basename(html),htmlSha256:hash(fs.readFileSync(html)),scope:'Two subsongs of independently permitted HonkeyPong and directed looping-envelope/global-speed derivatives: original linked FamiTone2 and generated canonical World Audio routines executed by the actual candidate 6502 emulator, one controlled subroutine call per logical video frame. Exact supported row/gate/volume/duty observations, actual negative-arpeggio ADC carry, quantified nearest-pitch transcription, deliberate end cuts, and ordinary tracker-note rebuild evidence. Controlled calls isolate music; no SFX arbitration, full-game timing, identical synthesis, listening, browser, or hardware acceptance.',passed,failed:results.length-passed,total:results.length,metrics,results};
}
module.exports=runNativeImportAPU;
if(require.main===module){const report=runNativeImportAPU(process.argv[2]),output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;}
