#!/usr/bin/env node
'use strict';
// Executes 1.8 tracker music and pattern-backed SFX in the application's own
// generated 6502 runtimes and bundled NES/APU emulator. The DOM harness is not
// real-browser audio-output or native-file-picker acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{worldProject,clone}=require('./world-fixtures170.cjs'),scout=require('./fixtures/scout166.json'),viewerFixture=require('./fixtures/golden167/packed-viewer.project.json');
const root=path.resolve(__dirname,'..');
const html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const baseline=path.join(root,'baseline/NES_Forge_1.7_World_Runtime.html');
const tests=[],test=(name,fn)=>tests.push({name,fn}),metrics={};
const cell=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0});
const pattern=rows=>({rows:Array.from({length:rows},()=>Array.from({length:5},cell))});
function midiFixture(){const track=Uint8Array.from([0,0xff,0x51,3,7,0xa1,0x20,0,0xc0,5,0,0x90,69,100,0x60,0x80,69,0,0,0xff,0x2f,0]),bytes=new Uint8Array(14+8+track.length);bytes.set([77,84,104,100,0,0,0,6,0,0,0,1,0,96]);bytes.set([77,84,114,107,0,0,0,track.length],14);bytes.set(track,22);return bytes;}
function withAudio(project=worldProject(),options={}){
 const p=clone(project),rows=16,music=pattern(rows),effect=pattern(rows);
 p.version=11;p.foundation='1.8';p.audioRuntime={enabled:true,musicEnabled:options.musicEnabled!==false};
 p.audRows=rows;p.tempo=150;p.speed=2;
 p.instruments=[{name:'Runtime Lead',volEnv:[15,12,8,4],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0}];
 for(const [channel,note]of [[0,57],[1,45],[2,33],[3,24]])music.rows[0][channel]={note,inst:0,vol:15,fx:0,fxp:0};
 effect.rows[4][0]={note:69,inst:0,vol:15,fx:0,fxp:0};
 p.patterns=[music,effect];p.orderList=[[0,0,0,0,0]];
 p.sfx=[{id:'sword_swing',name:'Sword Swing',channel:0,pattern:1,startRow:4,endRow:5}];
 return p;
}
function forBackend(backend,options={}){
 const p=withAudio(backend==='world'?worldProject():backend==='single-room'?scout:viewerFixture,options);
 if(backend==='world')p.worldRuntime.enabled=true;
 else{p.worldRuntime={...worldProject().worldRuntime,enabled:false};p.gameplay={...(p.gameplay||clone(scout.gameplay)),mode:backend==='single-room'?'single-room':'viewer'};}
 return p;
}
function fresh(project=forBackend('viewer')){
 const h=loadForge(html);h.context.audioProject180=project;h.run('db_deserializeState(audioProject180);window._buildAndRunMode=true');assert.deepEqual(h.errors,[]);return h;
}
function compile(project){const h=fresh(project);h.context.artifact180=h.run('Forge.services.RuntimeCompiler.compile()',30000);assert.ok(h.context.artifact180?.rom instanceof Uint8Array,h.errors.join('; '));h.context.rom180=h.context.artifact180.rom;return h;}
function apu(h,index){return h.run('emu.apuRegs['+index+']');}
function bootViewer(project=forBackend('viewer')){
 const h=compile(project);assert.equal(h.context.artifact180.backend,'packed');assert.equal(h.run('emuLoadRomData(rom180,"Audio viewer",0)',20000),true);h.run('clearEmuKeys();S.tab="emu"');for(let i=0;i<8;i++)h.run('emuRunFrame()',15000);assert.equal(h.run('emu.opsMissed'),0);return h;
}
function runtimeSymbols(h,backend){h.context.sy180=backend==='world'?h.context.artifact180.world.symbols:h.context.artifact180.gameplay.symbols;assert.ok(h.context.sy180.audio);}
function value(h,key){const at=h.context.sy180[key];assert.ok(Number.isInteger(at),'Missing runtime symbol '+key);return h.run('emu.ram['+at+']');}
function audioValue(h,key){const at=h.context.sy180.audio[key];assert.ok(Number.isInteger(at),'Missing audio symbol '+key);return h.run('emu.ram['+at+']');}
function keys(h,names=[]){h.context.keys180=names;h.run('clearEmuKeys();S.tab="emu";for(const key of keys180)emuKeys[key]=true');}
function settle(h,backend){
 if(backend==='world')h.run('for(let n180=0;!(emu.PC===sy180.labels.main&&emu.ram[sy180.frameReady]===0);n180++){if(n180>50000)throw Error("World audio update did not settle");if(emu.ram[sy180.transition]&&(emu.PC===sy180.labels.transition_vblank||emu.PC===sy180.labels.enable_vblank))emuRunFrame();else cpuStep()}',20000);
 else h.run('for(let n180=0;emu.PC!==sy180.labels.main||emu.ram[sy180.frameReady];n180++){if(n180>30000)throw Error("Single-room audio update did not settle");cpuStep()}',15000);
}
function frames(h,backend,count=1,names){if(names)keys(h,names);for(let i=0;i<count;i++){h.run('emuRunFrame()',15000);if(value(h,'ready'))settle(h,backend);}assert.equal(h.run('emu.opsMissed'),0);}
function bootPlayable(backend,project=forBackend(backend)){
 const h=compile(project);assert.equal(h.context.artifact180.backend,backend);runtimeSymbols(h,backend);assert.equal(h.run('emuLoadRomData(rom180,"Audio '+backend+'",0)',20000),true);keys(h,[]);
 for(let i=0;i<120;i++){frames(h,backend);if(value(h,'ready')){frames(h,backend,3);return h;}}throw Error(backend+' did not boot');
}
function until(h,backend,predicate,max=120){for(let i=0;i<max;i++){frames(h,backend);if(predicate())return;}throw Error('Audio runtime condition did not occur');}
function projectState(h){return h.json('({project:projectData(),undo:undoStack,redo:redoStack,epoch:Forge.services.ProjectStore.state.epoch,id:S.projectId,runtime:{loaded:emu.loaded,running:emu.running,last:Array.from(window._lastBuiltRom||[])}})');}
function buildFails(project,pattern){const h=fresh(project);h.run('window._lastBuiltRom=new Uint8Array([1,2,3])');assert.equal(h.run('buildNesRom()',30000),null);assert.equal(h.run('window._lastBuiltRom'),null);assert.match(h.errors.at(-1)||'',pattern);}

test('Schema 12 preserves Audio Runtime and stable SFX references while schema 10 migrates disabled',()=>{
 const p=withAudio(),h=fresh(p),saved=h.json('projectData()');assert.equal(saved.version,12);assert.equal(saved.foundation,'2.0.0-alpha.1');assert.deepEqual(saved.audioRuntime,p.audioRuntime);assert.deepEqual(saved.sfx,p.sfx);
 h.context.saved180=saved;h.run('db_deserializeState(JSON.stringify(saved180))');assert.deepEqual(h.json('S.audioRuntime'),p.audioRuntime);assert.deepEqual(h.json('S.sfx'),p.sfx);
 const old=clone(p);old.version=10;old.foundation='1.7';delete old.audioRuntime;delete old.sfx;h.context.old180=old;h.run('db_deserializeState(old180)');assert.deepEqual(h.json('S.audioRuntime'),{enabled:false,musicEnabled:true});assert.deepEqual(h.json('S.sfx'),[]);
});
test('Malformed Audio Runtime input rejects before project, history, identity, or emulator mutation',()=>{
 const h=fresh();h.run('snapshot();S.projectId=81;emu.loaded=true;emu.running=true;window._lastBuiltRom=new Uint8Array([9])');const before=projectState(h),bad=h.json('projectData()');bad.audioRuntime.enabled='yes';h.context.bad180=bad;assert.throws(()=>h.run('db_deserializeState(bad180)'),/Audio Runtime|true or false/i);assert.deepEqual(projectState(h),before);
});
test('Actual frozen 1.7 rejects schema 11 before changing project or history',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(baseline)).digest('hex'),'abcf22812bf027001d8a25ac6f64295755d4f1a2ddf281ac3ce0760a3039ed3f');
 const current=fresh(),saved=current.json('projectData()'),old=loadForge(baseline);const before=old.json('({project:projectData(),undo:undoStack,redo:redoStack,id:S.projectId})');old.context.schema11=saved;assert.throws(()=>old.run('db_deserializeState(schema11)'),/newer|version/i);assert.deepEqual(old.json('({project:projectData(),undo:undoStack,redo:redoStack,id:S.projectId})'),before);
});
test('Audio compiler derives deterministic channel records, envelopes, timers, and sound links without source mutation',()=>{
 const p=withAudio(),text=JSON.stringify(p),h=fresh(p);h.context.source180=p;h.context.plan180=h.run('Forge.services.AudioCompiler.plan(source180)');assert.equal(JSON.stringify(p),text);const plan=h.context.plan180;
 assert.equal(plan.enabled,true);assert.equal(plan.musicEnabled,true);assert.equal(plan.orders.length,1);assert.equal(plan.records.length,5);assert.deepEqual(Array.from(plan.orders[0]),[0,1,2,3]);assert.equal(plan.sfx[0].record,4);assert.equal(plan.soundIndex(p.animations.find(a=>a.state==='attack').frames[1],'attack'),0);assert.equal(plan.noteTimers[57],253);assert.ok(plan.estimatedBytes>0);
});
test('Disabled Audio Runtime preserves unresolved audio sketches as authoring-only data',()=>{
 const p=withAudio();p.audioRuntime.enabled=false;p.patterns[0].rows[0][4]={note:50,inst:99,vol:15,fx:7,fxp:12};p.animations.find(a=>a.state==='attack').frames[1].events.find(e=>e.type==='sound').value='missing-sfx';const h=fresh(p),plan=h.run('Forge.services.AudioCompiler.plan(Forge.services.ProjectStore.prepareSnapshot({intent:"build"}))');assert.deepEqual(JSON.parse(JSON.stringify(plan)),{enabled:false,musicEnabled:false});
});
test('Audio compiler rejects missing/ambiguous SFX, unsupported effects and executable DPCM',()=>{
 for(const [edit,patternError]of [
  [p=>p.animations.find(a=>a.state==='attack').frames[1].events.find(e=>e.type==='sound').value='missing',/missing SFX/i],
  [p=>{p.sfx.push({...p.sfx[0],id:'other'});p.animations.find(a=>a.state==='attack').frames[1].events.find(e=>e.type==='sound').value='Sword Swing';},/ambiguous/i],
  [p=>p.patterns[0].rows[0][0].fx=1,/effects.*no 1\.8 runtime meaning/i],
  [p=>p.patterns[0].rows[0][4]={note:48,inst:0,vol:15,fx:0,fxp:0},/DPCM.*no sample model/i]
 ]){const p=withAudio();edit(p);buildFails(p,patternError);}
 const duplicate=withAudio();duplicate.sfx.push({...duplicate.sfx[0]});const h=fresh();h.context.duplicate180=duplicate;assert.throws(()=>h.run('Forge.services.AudioCompiler.plan(duplicate180)'),/Duplicate SFX ID/i);
});
test('Audio-enabled custom assembly fails explicitly instead of silently omitting playback',()=>{const p=forBackend('viewer');p.asmSource='.org $C000\nreset:\n JMP reset\n.org $FFFA\n.word reset\n.word reset\n.word reset';buildFails(p,/Audio Runtime.*custom assembly/i);});
test('Generated viewer autoplays pulse, triangle, and noise through hardware APU registers',()=>{
 const h=bootViewer();assert.notEqual(apu(h,0),0x30);assert.notEqual(apu(h,4),0x30);assert.equal(apu(h,8),0xff);assert.notEqual(apu(h,12),0x30);assert.ok(apu(h,2)||apu(h,3));assert.ok(apu(h,6)||apu(h,7));assert.ok(apu(h,10)||apu(h,11));metrics.viewerApu=h.json('Array.from(emu.apuRegs.slice(0,16))');
});
test('Generated viewer executes authored duty, volume, and arpeggio envelopes over time',()=>{
 const p=forBackend('viewer');p.instruments[0].dutyEnv=[1];p.instruments[0].volEnv=[15,7];p.instruments[0].arpEnv=[0,12];const h=bootViewer(p),controls=[],timers=[];
 for(let i=0;i<8;i++){h.run('emuRunFrame()',15000);controls.push(apu(h,0));timers.push(apu(h,2));}
 assert.ok(controls.every(value=>(value>>6)===1));assert.ok(new Set(controls.map(value=>value&15)).size>1);assert.ok(timers.includes(h.run('Forge.services.AudioCompiler.timer(57)')&255));assert.ok(timers.includes(h.run('Forge.services.AudioCompiler.timer(69)')&255));assert.equal(h.run('emu.opsMissed'),0);
});
test('Single-room sound event preempts its music channel once and restores the authored note',()=>{
 const h=bootPlayable('single-room'),musicTimer=h.run('Forge.services.AudioCompiler.timer(57)'),sfxTimer=h.run('Forge.services.AudioCompiler.timer(69)');assert.equal(apu(h,2),musicTimer&255);
 frames(h,'single-room',1,['KeyX']);frames(h,'single-room',1,[]);until(h,'single-room',()=>audioValue(h,'sfxActive')!==0,20);assert.equal(apu(h,2),sfxTimer&255);assert.equal(audioValue(h,'sfxChannel'),0);
 until(h,'single-room',()=>audioValue(h,'sfxActive')===0,20);assert.equal(apu(h,2),musicTimer&255);assert.equal(h.run('emu.opsMissed'),0);metrics.singleRoomCodeEnd=h.context.artifact180.gameplay.codeEnd;
});
test('World sound event starts the same SFX representation and finishes within frame budget',()=>{
 const p=forBackend('world',{musicEnabled:false}),h=bootPlayable('world',p),timer=h.run('Forge.services.AudioCompiler.timer(69)');assert.equal(apu(h,0),0x30);
 frames(h,'world',1,['KeyX']);frames(h,'world',1,[]);until(h,'world',()=>audioValue(h,'sfxActive')!==0,20);assert.equal(apu(h,2),timer&255);until(h,'world',()=>audioValue(h,'sfxActive')===0,20);assert.equal(apu(h,0),0x30);assert.equal(h.run('emu.opsMissed'),0);metrics.worldCodeEnd=h.context.artifact180.world.codeEnd;
});
test('World ROM round trip preserves schema 12 Audio authoring and older 1.7 rejects it atomically',()=>{
 const p=forBackend('world'),h=compile(p),rom=Uint8Array.from(h.context.rom180),inspection=h.context.Forge.services.WorldRom.inspect(rom);assert.equal(inspection.record.schema,12);assert.deepEqual(JSON.parse(JSON.stringify(inspection.source.audioRuntime)),p.audioRuntime);assert.deepEqual(JSON.parse(JSON.stringify(inspection.source.sfx)),p.sfx);
 h.context.roundtrip180=rom;assert.equal(h.run('Forge166.project.openRom(roundtrip180,"Audio World.nes")',30000),true);assert.deepEqual(h.json('S.audioRuntime'),p.audioRuntime);assert.deepEqual(h.json('S.sfx'),p.sfx);
 const old=loadForge(baseline);old.context.audioWorld180=rom;const before=old.json('({project:projectData(),undo:undoStack,redo:redoStack,id:S.projectId,loaded:emu.loaded})');assert.throws(()=>old.run('Forge166.project.openRom(audioWorld180,"Too new.nes")',30000),/schema|source|unsupported/i);assert.deepEqual(old.json('({project:projectData(),undo:undoStack,redo:redoStack,id:S.projectId,loaded:emu.loaded})'),before);
});
test('Audio Studio controls make runtime and SFX edits undoable without inventing a second note model',()=>{
 const p=forBackend('viewer');p.audioRuntime.enabled=false;p.sfx=[];const h=fresh(p);assert.equal(h.get('audRuntimeEnabled180').checked,false);h.get('audRuntimeEnabled180').checked=true;h.get('audMusicEnabled180').checked=false;h.run('audio18_updateRuntime()');assert.deepEqual(h.json('S.audioRuntime'),{enabled:true,musicEnabled:false});
 const depth=h.run('undoStack.length');h.run('audio18_addSfx()');assert.equal(h.run('S.sfx.length'),1);assert.equal(h.run('undoStack.length'),depth+1);assert.match(h.run('S.sfx[0].id'),/^sfx-/);h.get('audSfxName180').value='Landing';h.get('audSfxChannel180').value='3';h.get('audSfxPattern180').value='1';h.get('audSfxStart180').value='4';h.get('audSfxEnd180').value='5';h.run('audio18_updateSfx()');assert.deepEqual(h.json('({name:S.sfx[0].name,channel:S.sfx[0].channel,pattern:S.sfx[0].pattern,startRow:S.sfx[0].startRow,endRow:S.sfx[0].endRow})'),{name:'Landing',channel:3,pattern:1,startRow:4,endRow:5});h.run('undo()');assert.equal(h.run('S.sfx[0].name'),'SFX 1');
});
test('Standard MIDI import maps timing, pitch, velocity, and program into ordinary tracker data',()=>{
 const h=fresh(),parsed=h.context.Forge.services.AudioImport.parseMidi(midiFixture()),song=h.context.Forge.services.AudioImport.materialize(parsed,16);assert.equal(parsed.tempo,120);assert.equal(parsed.notes.length,1);assert.deepEqual(JSON.parse(JSON.stringify(parsed.notes[0])),{start:0,end:1,note:57,velocity:100,percussion:false,program:5,source:'Track 1'});assert.equal(song.patterns.length,1);assert.deepEqual(JSON.parse(JSON.stringify(song.patterns[0].rows[0][0])),{note:57,inst:0,vol:12,fx:0,fxp:0});assert.equal(song.patterns[0].rows[4][0].note,-2);assert.deepEqual(JSON.parse(JSON.stringify(song.orderList)),[[0,0,0,0,0]]);
});
test('MusicXML import maps score timing into the same tracker representation and rejects excess polyphony',()=>{
 const xml='<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions></attributes><direction><sound tempo="90"/></direction><note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>',h=fresh();const parsed=h.context.Forge.services.AudioImport.parseMusicXml(xml),song=h.context.Forge.services.AudioImport.materialize(parsed,16);assert.equal(parsed.tempo,90);assert.equal(parsed.notes[0].note,57);assert.equal(song.patterns[0].rows[0][0].note,57);assert.equal(song.patterns[0].rows[4][0].note,-2);
 const crowded={format:'test',tempo:120,warnings:[],notes:Array.from({length:4},(_,i)=>({start:0,end:1,note:48+i,velocity:100,percussion:false,program:0,source:'Crowded'}))};assert.throws(()=>h.context.Forge.services.AudioImport.materialize(crowded,16),/polyphony.*three NES tonal channels/i);
});
test('Audio import appends patterns, preserves SFX references, is undoable, and builds playable music',()=>{
 const h=fresh(forBackend('viewer')),before=h.json('projectData()'),id=h.run('S.sfx[0].id'),patternIndex=h.run('S.sfx[0].pattern');h.context.midi180=midiFixture();h.context.result180=h.run('Forge.services.AudioImport.apply(Forge.services.AudioImport.parseMidi(midi180))');assert.equal(h.run('S.sfx[0].id'),id);assert.equal(h.run('S.sfx[0].pattern'),patternIndex);assert.equal(h.run('S.orderList[0][0]'),before.patterns.length);assert.equal(h.run('S.patterns[S.orderList[0][0]].rows[0][0].note'),57);assert.equal(h.run('S.audioRuntime.enabled'),true);
 h.context.importedArtifact180=h.run('Forge.services.RuntimeCompiler.compile()',30000);h.context.importedRom180=h.context.importedArtifact180.rom;assert.equal(h.run('emuLoadRomData(importedRom180,"Imported MIDI",0)',20000),true);for(let i=0;i<8;i++)h.run('emuRunFrame()',15000);assert.notEqual(apu(h,0),0x30);assert.equal(h.run('emu.opsMissed'),0);h.run('undo()');assert.deepEqual(h.json('projectData()'),before);
});
test('Supplied 1.8 Audio example retains its frozen provenance and reproduces its matching generated World ROM',()=>{
 const base=path.join(root,'examples/Scout_Audio_Runtime_1.8'),project=JSON.parse(fs.readFileSync(base+'.nesforge.json')),expected=fs.readFileSync(base+'.nes'),report=JSON.parse(fs.readFileSync(base+'.build.json')),baselineHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'baseline/NES_Forge_1.8_Audio_Runtime.html'))).digest('hex');assert.equal(report.htmlSha256,baselineHash);assert.equal(report.projectSha256,crypto.createHash('sha256').update(fs.readFileSync(base+'.nesforge.json')).digest('hex'));assert.equal(report.romSha256,crypto.createHash('sha256').update(expected).digest('hex'));assert.equal(project.audioRuntime.enabled,true);assert.equal(project.sfx[0].id,'sword_swing');assert.equal(project.animations.find(animation=>animation.state==='attack').frames.some(frame=>frame.events.some(event=>event.type==='sound'&&event.value==='sword_swing')),true);
 const old=loadForge(path.join(root,'baseline/NES_Forge_1.8_Audio_Runtime.html'));old.context.audioExample180=project;old.run('db_deserializeState(audioExample180)');assert.deepEqual(Buffer.from(old.run('Forge.services.RuntimeCompiler.compile()',30000).rom),expected);
 const h=compile(project);assert.equal(h.context.artifact180.backend,'world');assert.equal(h.context.artifact180.world.spec.audio.enabled,true);assert.equal(h.context.artifact180.world.spec.audio.sfx[0].id,'sword_swing');
});

const results=[];for(const {name,fn}of tests){const start=Date.now();try{fn();results.push({name,passed:true,milliseconds:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});console.log('FAIL '+name+'\n  '+error.message);}}
const passed=results.filter(result=>result.passed).length,report={suite:'audio-runtime180',html:path.basename(html),htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),scope:'Schema 12 retention of the established Audio Runtime and compatibility; detached tracker/SFX compilation; generated viewer, single-room and World 6502 execution through the bundled APU emulator; sound-event entry, preemption/restore, explicit unsupported-input rejection and Audio Studio handlers. Mock DOM/emulator evidence, not real-browser speaker output or hardware acceptance.',passed,failed:results.length-passed,total:results.length,metrics,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('\n'+passed+'/'+results.length+' passed');process.exitCode=passed===results.length?0:1;
