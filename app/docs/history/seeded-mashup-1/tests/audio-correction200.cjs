#!/usr/bin/env node
'use strict';
// Independent authored-song contracts, exercised through complete generated
// viewer/single-room/World ROMs and actual bundled CPU/APU execution. No source
// repair, compiler helper oracle, synthetic pass counts, or audible-output claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{worldProject,clone}=require('./world-fixtures170.cjs');
const scout=require('./fixtures/scout166.json'),viewer=require('./fixtures/golden167/packed-viewer.project.json');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'),'utf8'));
const html=path.resolve(process.argv[2]||path.join(root,manifest.output));
const tests=[],metrics={},test=(name,fn)=>tests.push({name,fn}),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const empty=()=>({note:-1,inst:-1,vol:-1,fx:0,fxp:0}),pattern=rows=>({rows:Array.from({length:rows},()=>Array.from({length:5},empty))});
const noteCell=note=>({note,inst:0,vol:15,fx:0,fxp:0});
// Independent musical/hardware oracle: equal-tempered A4=440 Hz; the waveform
// occupies 16 CPU timer units for pulse and 32 for triangle. Values outside the
// declared hardware period range retain the existing saturation contract.
function expectedPeriod(note,channel=0){const hz=440*2**((note-57)/12),divider=channel===2?32:16;return Math.max(channel===2?2:8,Math.min(2047,Math.round(1789773/(divider*hz)-1)));}
function project(backend,rows=128){
 const p=clone(backend==='world'?worldProject():backend==='single-room'?scout:viewer);
 p.version=12;p.foundation='1.9.0';p.audioRuntime={enabled:true,musicEnabled:true};p.audRows=rows;p.tempo=150;p.speed=1;
 p.instruments=[{name:'Constant regression tone',volEnv:[15],dutyEnv:[2],arpEnv:[0],pitchEnv:[0],loopVol:0,loopArp:0}];
 p.patterns=[pattern(rows)];p.orderList=[[0,0,0,0,0]];p.sfx=[];
 for(const animation of p.animations||[])for(const frame of animation.frames||[])frame.events=(frame.events||[]).filter(event=>event.type!=='sound');
 if(backend==='world')p.worldRuntime.enabled=true;
 else{p.worldRuntime={...worldProject().worldRuntime,enabled:false};p.gameplay={...(p.gameplay||clone(scout.gameplay)),mode:backend==='single-room'?'single-room':'viewer'};}
 return p;
}
function boot(backend,p){
 const h=loadForge(html);h.context.correctionProject=p;h.run('Forge.services.ProjectStore.load(correctionProject);window._buildAndRunMode=true');
 h.context.correctionArtifact=h.run('Forge.services.RuntimeCompiler.compile()',30000);
 assert.equal(h.context.correctionArtifact.backend,backend==='viewer'?'packed':backend);assert.deepEqual(h.errors,[]);
 h.context.correctionROM=h.context.correctionArtifact.rom;
 assert.equal(h.run('emuLoadRomData(correctionROM,"Audio correction contract",0)',20000),true);
 if(backend!=='viewer')h.context.correctionSymbols=backend==='world'?h.context.correctionArtifact.world.symbols:h.context.correctionArtifact.gameplay.symbols;
 h.run('clearEmuKeys();S.tab="emu";var correctionWrites=[];var correctionOriginalWrite=cpuWrite;cpuWrite=function(address,value){const result=correctionOriginalWrite.apply(this,arguments);if(address===0x4003||address===0x4007||address===0x400B){const channel=address===0x4003?0:address===0x4007?1:2,base=channel*4;correctionWrites.push({channel,period:emu.apuRegs[base+2]+((emu.apuRegs[base+3]&7)<<8),frame:emu.frameCount,cycles:emu.cycles});}return result;}');
 return h;
}
function frame(h,backend){
 h.run('emuRunFrame()',15000);
 if(backend!=='viewer'&&h.run('emu.ram[correctionSymbols.ready]'))h.run('for(var correctionSteps=0;emu.PC!==correctionSymbols.labels.main||emu.ram[correctionSymbols.frameReady];correctionSteps++){if(correctionSteps>=60000)throw Error("Audio update did not return to the game loop within 60000 instructions");cpuStep();}',15000);
 assert.equal(h.run('emu.opsMissed'),0,'No unknown CPU instruction during generated audio execution');
}
function changes(h,channel=0){const out=[];for(const value of h.json('correctionWrites'))if(value.channel===channel&&value.period!==out.at(-1))out.push(value.period);return out;}
function awaitChanges(h,backend,channel,count,budget){for(let i=0;i<budget;i++){frame(h,backend);if(changes(h,channel).length>=count)return;}assert.fail('Expected '+count+' pitch changes within '+budget+' frames; observed '+changes(h,channel).length);}
function verifyClean(h){assert.deepEqual(h.errors,[]);assert.equal(h.run('emu.opsMissed'),0);}
const melody=count=>Array.from({length:count},(_,i)=>48+i%24);

for(const backend of ['viewer','single-room','world'])for(const eventCount of [63,64,128])test(backend+' music '+eventCount+' dense events reaches the sentinel, next order and loop without a stalled CPU',()=>{
 const p=project(backend),notes=melody(eventCount);p.tempo=300;notes.forEach((note,row)=>p.patterns[0].rows[row][0]=noteCell(note));
 p.patterns.push(pattern(128));p.patterns[1].rows[0][0]=noteCell(85);p.patterns[1].rows[1][0]=noteCell(84);p.orderList.push([1,1,1,1,1]);
 const h=boot(backend,p),expected=[...notes,85,84,notes[0]].map(note=>expectedPeriod(note));
 awaitChanges(h,backend,0,expected.length,180);assert.deepEqual(changes(h).slice(0,expected.length),expected,'Every authored event, next-order marker and loop entry must reach the APU in order');verifyClean(h);
 metrics[backend+'Music'+eventCount]={eventCount,observedChanges:expected.length,completedFrame:h.run('emu.frameCount'),romSha256:sha(h.context.correctionROM)};
});

function sfxCase(backend,eventCount,startRow=0){
 const p=project(backend),notes=melody(eventCount);p.tempo=300;p.patterns[0].rows[0][0]=noteCell(33);p.patterns.push(pattern(128));
 notes.forEach((note,row)=>p.patterns[1].rows[row][0]=noteCell(note));
 p.sfx=[{id:'dense-correction-sfx',name:'Dense correction SFX',channel:0,pattern:1,startRow,endRow:127}];
 const attack=p.animations.find(animation=>animation.state==='attack');assert.ok(attack?.frames.length>1,'Fixture must provide a genuine attack frame entry');attack.frames[1].events.push({id:'dense-correction-sound-event',type:'sound',name:'Dense correction trigger',value:'dense-correction-sfx'});
 const h=boot(backend,p);for(let i=0;i<120&&!h.run('emu.ram[correctionSymbols.ready]');i++)frame(h,backend);assert.ok(h.run('emu.ram[correctionSymbols.ready]'),'Playable runtime booted');
 for(let i=0;i<3;i++)frame(h,backend);assert.equal(changes(h).at(-1),expectedPeriod(33));h.run('correctionWrites=[];emuKeys.KeyX=true');frame(h,backend);h.run('emuKeys.KeyX=false');
 let started=false,finished=false;for(let i=0;i<160;i++){frame(h,backend);const active=h.run('emu.ram[correctionSymbols.audio.sfxActive]');if(active)started=true;if(started&&!active){finished=true;break;}}
 assert.ok(started,'Animation frame entry must start the authored SFX');assert.ok(finished,'SFX must finish and release the music channel within its frame budget');
 const actual=changes(h);while(actual[0]===expectedPeriod(33))actual.shift();const expected=[...notes.slice(startRow),33].map(note=>expectedPeriod(note));
 assert.deepEqual(actual,expected,'Requested SFX range plays every note and restores the prior music pitch');verifyClean(h);
 metrics[backend+'Sfx'+eventCount+'From'+startRow]={eventCount,startRow,endRow:127,observedChanges:actual.length,completedFrame:h.run('emu.frameCount'),romSha256:sha(h.context.correctionROM)};
}
for(const backend of ['single-room','world']){
 for(const eventCount of [63,64,128])test(backend+' animation-triggered SFX '+eventCount+' dense events honors end row 127 and restores music',()=>sfxCase(backend,eventCount));
 test(backend+' late SFX range scans past 64 events and plays rows 120–127 before restoring music',()=>sfxCase(backend,128,120));
}

for(const backend of ['viewer','single-room','world'])for(const variant of ['A4','arpeggio','bounds'])test(backend+' triangle '+variant+' uses the authored pitch and independent channel period limits',()=>{
 const p=project(backend,16);p.speed=15;
 const base=variant==='bounds'?0:57,arp=variant==='arpeggio'?[-24,0,24]:variant==='bounds'?[-24,0,24]:[0];p.instruments[0].arpEnv=arp;
 p.patterns[0].rows[0][0]=noteCell(base);p.patterns[0].rows[0][2]=noteCell(base);
 if(variant==='bounds'){p.patterns[0].rows[1][0]=noteCell(95);p.patterns[0].rows[1][2]=noteCell(95);}
 const h=boot(backend,p);for(let i=0;i<(variant==='bounds'?38:14);i++)frame(h,backend);
 const pulse=changes(h,0),triangle=changes(h,2),expectedNotes=variant==='bounds'?[0,24,71,95]:variant==='arpeggio'?[33,57,81]:[57];
 for(const note of expectedNotes){assert.ok(pulse.includes(expectedPeriod(note,0)),'Pulse APU evidence missing authored note '+note);assert.ok(triangle.includes(expectedPeriod(note,2)),'Triangle APU evidence missing authored note '+note);}
 if(variant==='A4'){assert.deepEqual(pulse,[253]);assert.deepEqual(triangle,[126]);const pulseHz=1789773/(16*(pulse[0]+1)),triangleHz=1789773/(32*(triangle[0]+1));assert.ok(Math.abs(pulseHz-440)<1);assert.ok(Math.abs(triangleHz-440)<1);assert.equal(triangleHz,pulseHz,'Same authored note must have the same fundamental frequency');}
 if(variant==='bounds'){assert.ok(triangle.includes(2047),'Low triangle period saturation');assert.ok(triangle.includes(expectedPeriod(95,2)),'Positive arpeggio clamps to the highest canonical note');assert.ok(triangle.every(value=>value>=2&&value<=2047));}
 verifyClean(h);metrics[backend+'Triangle'+variant]={pulsePeriods:pulse,trianglePeriods:triangle,romSha256:sha(h.context.correctionROM)};
});

const results=[];for(const {name,fn}of tests){const started=Date.now();try{fn();results.push({name,passed:true,milliseconds:Date.now()-started});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-started,error:error.stack});process.stdout.write('FAIL '+name+'\n'+error.message+'\n');}}
const passed=results.filter(result=>result.passed).length,report={suite:'audio-correction200',html:path.basename(html),htmlSha256:sha(fs.readFileSync(html)),scope:'Complete standalone candidate; actual generated CPU/APU execution for dense music and animation-triggered SFX, sentinel/order/end-row continuation, and triangle pitch/arpeggio/saturation. VM harness; no browser speaker, mobile latency, or physical-hardware acceptance.',passed,failed:results.length-passed,total:results.length,metrics,results};
const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
process.stdout.write(passed+'/'+results.length+' passed\n');process.exitCode=report.failed?1:0;
