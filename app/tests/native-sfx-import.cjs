#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{loadForge}=require('./harness.cjs');
const app=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(app,require('../source-manifest.json').output)),tests=[],test=(name,fn)=>tests.push({name,fn}),cp=value=>JSON.parse(JSON.stringify(value)),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const h=loadForge(html,{environment:{crypto:crypto.webcrypto}});h.context.setTimeout=(fn,ms)=>ms===0?setImmediate(fn):1;assert.deepEqual(h.errors,[]);assert.equal(h.run('typeof FamiTone2SfxImport.preview'),'function','Actual candidate must bundle the SFX converter');
const bytes=new Uint8Array(fs.readFileSync(path.join(app,'examples/RE_Native_Audio/independent.nes'))),native=require('../src/re/famitone2-native.js'),common=require('../src/re/famitone2-sfx-import.js'),evidence=native.decode(bytes),effect=evidence.native.sfx.effects[0],offset=address=>16+(address-0x8000)%16384;
function preview(source=bytes,options={}){h.context.sfxInput=source;h.context.sfxOptions=options;h.run('var sfxPlan=FamiTone2SfxImport.preview(new Uint8Array(sfxInput),sfxOptions)',15000);return h.json('sfxPlan');}
function refusal(source,options,code){const p=preview(source,options);assert.equal(p.status,'unsupported');assert.equal(p.imported,null);assert.equal(p.provenance,null);assert.ok(p.diagnostics.some(item=>item.code===code),JSON.stringify(p.diagnostics));return p;}
function custom(data){const source=bytes.slice();source.set(data,offset(0xe600));source[effect.source.fileOffset]=0;source[effect.source.fileOffset+1]=0xe6;return source;}
function state(){return{project:h.run('Forge.services.ProjectStore.serialize()'),history:h.json('({undo:undoStack,redo:redoStack,undoBytes})'),emulator:h.json('({loaded:emu.loaded,running:emu.running,PC:emu.PC,frame:emu.frameCount,last:Array.from(emu.lastBuiltRom||[])})')};}
const cell=(plan,frame,channel=plan.imported.sfx[0].channel)=>plan.imported.patterns[0].rows[frame][channel],base=preview(),second=preview(bytes,{effectId:1}),originalState=state(),controls=[63,62,189,188,187,186,185,184,183,182,181,180];

test('Independent effects 0 and 1 become detached canonical single-pulse SFX with exact source identities',()=>{
 for(const [id,plan] of [[0,base],[1,second]]){assert.equal(plan.status,'ready',JSON.stringify(plan.diagnostics));assert.equal(plan.sourceSha256,sha(bytes));assert.equal(plan.method,'famitone2-canonical-sfx-transcription-1');assert.equal(plan.imported.format,'famitone2-sfx-transcription');assert.equal(plan.imported.patterns.length,1);assert.equal(plan.imported.rows,64);assert.equal(plan.imported.tempo,150);assert.equal(plan.imported.speed,1);assert.equal(plan.imported.durationFrames,12);assert.equal(plan.imported.noteCount,12);assert.equal(plan.imported.paddingFrames,52);assert.deepEqual(plan.imported.sfx,[{id:'re-sfx-'+sha(bytes)+'-'+id,name:'Native SFX '+id+' Pulse 1',channel:0,pattern:0,startRow:0,endRow:12}]);assert.equal(plan.imported.orderList,undefined);assert.ok(plan.imported.sfx[0].id.length<=80);}
});

test('Every original frame retains actual control duty and volume instead of inferring a generic envelope',()=>{
 for(const plan of [base,second]){assert.equal(plan.provenance.frameStates.length,12);for(let frame=0;frame<12;frame++){const state=plan.provenance.frameStates[frame],c=cell(plan,frame),inst=plan.imported.instruments[c.inst];assert.equal(state.registers.control,controls[frame]);assert.equal(state.volume,controls[frame]&15);assert.equal(state.duty,controls[frame]>>>6);assert.deepEqual(inst.volEnv,[controls[frame]&15]);assert.deepEqual(inst.dutyEnv,[controls[frame]>>>6]);assert.equal(c.vol,15);assert.equal(state.audible,true);assert.equal(c.note,plan===base?36:48);}}
});

test('The native retained end frame sounds before the following canonical cut and silent padding',()=>{
 assert.equal(base.provenance.sourceStream.endFrame,11);assert.equal(base.provenance.events.at(-1).mixesRetainedBufferThisFrame,true);assert.equal(cell(base,11).note,36);assert.equal(cell(base,12).note,-2);assert.deepEqual(base.provenance.terminalCut,{frame:12,channel:0,note:-2});for(let frame=13;frame<64;frame++)assert.equal(cell(base,frame).note,-1);for(let frame=0;frame<64;frame++)for(let channel=1;channel<5;channel++)assert.equal(cell(base,frame,channel).note,-1);
});

test('Original timers match existing canonical note tables and strict mode accepts only that measured claim',()=>{
 for(const [effectId,period,note] of [[0,854,36],[1,427,48]]){const plan=preview(bytes,{effectId,mode:'strict'});assert.equal(plan.status,'ready');assert.deepEqual(plan.provenance.tuning,[{channel:0,period,note,canonicalPeriod:period,cents:0}]);assert.equal(plan.provenance.fidelity.changedPitchMappings,0);assert.match(plan.limitations.join(' '),/not lossless/);assert.match(plan.provenance.fidelity.mixing,/not transcribed/);}
});

test('Raw command, pointer and frame-source spans retain exact source bytes and bounded physical provenance',()=>{
 for(const source of [base.provenance.effectSource,...base.provenance.events.map(event=>event.source),...base.provenance.frameStates.flatMap(frame=>frame.sourceEvents)]){assert.ok(source.fileOffset>=16&&source.fileOffset+source.length<=bytes.length);assert.deepEqual(source.bytes,Array.from(bytes.slice(source.fileOffset,source.fileOffset+source.length)));}assert.equal(base.provenance.driver.address,evidence.recognition.driver.base);assert.equal(base.provenance.source.sha256,sha(bytes));assert.ok(JSON.stringify(base).length<common.limits.resultBytes);
});

test('Relocated and NROM32 native sources preserve canonical audio without a ROM name or hash allowlist',()=>{
 for(const name of ['relocated.nes','nrom32.nes']){const source=fs.readFileSync(path.join(app,'examples/RE_Native_Audio',name)),plan=preview(source);assert.equal(plan.status,'ready',JSON.stringify(plan.diagnostics));assert.deepEqual(plan.imported.patterns,base.imported.patterns);assert.deepEqual(plan.imported.instruments,base.imported.instruments);assert.notEqual(plan.sourceSha256,base.sourceSha256);assert.notEqual(plan.provenance.driver.address,base.provenance.driver.address);}
});

test('Trainer offset and relocated native stream references change provenance without changing SFX values',()=>{
 const trainer=new Uint8Array(bytes.length+512);trainer.set(bytes.slice(0,16));trainer[6]|=4;trainer.set(bytes.slice(16),528);const p=preview(trainer);assert.equal(p.status,'ready');assert.deepEqual(p.imported.patterns,base.imported.patterns);assert.equal(p.provenance.events[0].source.fileOffset,base.provenance.events[0].source.fileOffset+512);const relocated=custom(Array.from(bytes.slice(effect.NTSC.events[0].source.fileOffset,effect.NTSC.events[0].source.fileOffset+effect.NTSC.byteLength))),q=preview(relocated);assert.equal(q.status,'ready',JSON.stringify(q.diagnostics));assert.equal(q.provenance.sourceStream.address,0xe600);assert.deepEqual(q.imported.patterns,base.imported.patterns);
});

test('Pulse 2 register streams retain channel identity and leave pulse 1 untouched',()=>{
 const source=bytes.slice();for(const event of effect.NTSC.events)if(event.kind==='register')source[event.source.fileOffset]+=3;const plan=preview(source);assert.equal(plan.status,'ready',JSON.stringify(plan.diagnostics));assert.equal(plan.imported.sfx[0].channel,1);for(let frame=0;frame<12;frame++){assert.equal(cell(plan,frame,0).note,-1);assert.equal(cell(plan,frame,1).note,36);}assert.equal(cell(plan,12,1).note,-2);
});

test('Delay edits retain every held video frame and final end-frame mix without time quantization',()=>{
 const source=bytes.slice(),delay=effect.NTSC.events.find(event=>event.kind==='delay');source[delay.source.fileOffset]=3;const plan=preview(source);assert.equal(plan.status,'ready');assert.equal(plan.imported.durationFrames,14);assert.deepEqual(plan.provenance.frameStates.slice(0,4).map(frame=>frame.volume),[15,15,15,14]);assert.equal(cell(plan,13).note,36);assert.equal(cell(plan,14).note,-2);
});

test('Valid native duty, volume and timer edits change detached notes and report nearest tuning differences',()=>{
 const source=bytes.slice();source[effect.NTSC.events[0].source.fileOffset+1]=0xf7;source[effect.NTSC.events[1].source.fileOffset+1]=85;const plan=preview(source);assert.equal(plan.status,'ready');assert.notEqual(plan.sourceSha256,base.sourceSha256);assert.equal(plan.provenance.frameStates[0].duty,3);assert.equal(plan.provenance.frameStates[0].volume,7);assert.equal(plan.provenance.tuning[0].period,853);assert.equal(plan.provenance.tuning[0].canonicalPeriod,854);assert.ok(plan.provenance.fidelity.maxAbsoluteCents>0);assert.match(plan.warnings.join(' '),/nearby canonical timer/);refusal(source,{mode:'strict'},'TUNING_MISMATCH');
});

test('Native clear-state mute allows unknown timers until explicit low and high writes precede audibility',()=>{
 const plan=preview(custom([2,0x80,0x3f,0x81,0x56,0x82,3,0]));assert.equal(plan.status,'ready',JSON.stringify(plan.diagnostics));assert.equal(plan.imported.durationFrames,3);assert.equal(plan.imported.noteCount,1);for(let frame=0;frame<2;frame++){const s=plan.provenance.frameStates[frame];assert.equal(s.audible,false);assert.equal(s.registers.control,0x30);assert.equal(s.registers.low,null);assert.equal(s.registers.high,null);assert.equal(s.period,null);assert.equal(cell(plan,frame).note,-2);}assert.equal(cell(plan,2).note,36);assert.equal(cell(plan,3).note,-2);
});

test('A native zero-volume interval cuts the canonical channel and later initialization can restart it',()=>{
 const plan=preview(custom([0x80,0x3f,0x81,0x56,0x82,3,1,0x80,0x30,2,0x80,0xbf,0]));assert.equal(plan.status,'ready');assert.deepEqual(plan.provenance.frameStates.map(state=>state.audible),[true,false,false,true]);assert.deepEqual(plan.imported.patterns[0].rows.slice(0,5).map(row=>row[0].note),[36,-2,-2,36,-2]);assert.equal(plan.provenance.frameStates[3].duty,2);
});

test('Missing audible timer initialization is refused instead of inheriting unknown native RAM',()=>{
 for(const data of [[0x80,0x3f,0x81,0x56,0],[0x80,0x3f,0x82,3,0],[0x80,0x3f,1,0x81,0x56,0x82,3,0]])refusal(custom(data),{},'UNKNOWN_REGISTER');
});

test('Unsupported pulse envelope, length and timer control bits are explicit representability refusals',()=>{
 for(const control of [0x0f,0x1f,0x2f,0])refusal(custom([0x80,control,0x81,0x56,0x82,3,0]),{},'PULSE_CONTROL');for(const high of [8,31,255])refusal(custom([0x80,0x3f,0x81,0x56,0x82,high,0]),{},'TIMER_CONTROL');for(const low of [0,7])refusal(custom([0x80,0x3f,0x81,low,0x82,0,0]),{},'TIMER_RANGE');
});

test('Multichannel original SFX and triangle or noise stream edits refuse without discarding a channel',()=>{
 refusal(bytes,{effectId:2},'SFX_MULTICHANNEL');for(const opcode of [0x86,0x89,0x8a])refusal(custom([opcode,0x3f,1,0]),{},'SFX_CHANNEL');
});

test('Only statically known effect IDs are selectable and entirely muted effects do not invent notes',()=>{
 refusal(bytes,{effectId:3},'EFFECT_ID');refusal(bytes,{effectId:63},'EFFECT_ID');refusal(custom([0x80,0x30,1,0]),{},'NO_NOTES');refusal(custom([1,0]),{},'NO_NOTES');
});

test('Pattern limits reserve a real terminal-cut row, including the 128-row maximum',()=>{
 const short=preview(custom([0x80,0x3f,0x81,0x56,0x82,3,14,0]),{rows:16});assert.equal(short.status,'ready');assert.equal(short.imported.durationFrames,15);assert.equal(cell(short,15).note,-2);refusal(custom([0x80,0x3f,0x81,0x56,0x82,3,15,0]),{rows:16},'DURATION');const longest=preview(custom([0x80,0x3f,0x81,0x56,0x82,3,126,0]),{rows:128});assert.equal(longest.status,'ready');assert.equal(longest.imported.durationFrames,127);assert.equal(cell(longest,127).note,-2);refusal(custom([0x80,0x3f,0x81,0x56,0x82,3,127,0]),{rows:128},'DURATION');
});

test('Undeclared options, noninteger sizes, PAL and unsupported modes are refused atomically',()=>{
 for(const rows of [15,129,16.5,NaN,Infinity])refusal(bytes,{rows},'OPTIONS');for(const effectId of [-1,64,0.5,'0'])refusal(bytes,{effectId},'OPTIONS');for(const options of [{extra:true},{nativeRows:16},{mode:'lossless'}])refusal(bytes,options,'OPTIONS');refusal(bytes,{region:'PAL'},'REGION');refusal(bytes,{region:'Dendy'},'REGION');
});

test('Expected physical identity catches stale inputs while valid unrelated source edits require redecoding',()=>{
 const changed=bytes.slice();changed[changed.length-1]^=1;refusal(changed,{expectedSourceSha256:base.sourceSha256},'SOURCE_IDENTITY');const plan=preview(changed);assert.equal(plan.status,'ready');assert.notEqual(plan.sourceSha256,base.sourceSha256);assert.deepEqual(plan.imported.patterns,base.imported.patterns);assert.equal(preview(bytes,{expectedSourceSha256:base.sourceSha256}).status,'ready');
});

test('Unknown drivers, malformed streams and oversized input never return partial canonical content',()=>{
 const mapper=bytes.slice();mapper[6]|=16;refusal(mapper,{},'NATIVE_PROFILE');refusal(bytes.slice(0,20),{},'NATIVE_PROFILE');refusal(custom([0x8b,0,0]),{},'NATIVE_PROFILE');refusal(custom(Array(256).fill(1)),{},'NATIVE_PROFILE');refusal(new Uint8Array(41489),{},'SOURCE_BUDGET');
});

test('Single-frame command order uses final register values and retains a native terminal frame',()=>{
 const plan=preview(custom([0x80,0x3f,0x81,0x56,0x82,3,0x80,0xb4,0]));assert.equal(plan.status,'ready');assert.equal(plan.imported.durationFrames,1);assert.equal(plan.imported.noteCount,1);assert.equal(plan.provenance.frameStates[0].volume,4);assert.equal(plan.provenance.frameStates[0].duty,2);assert.equal(cell(plan,0).note,36);assert.equal(cell(plan,1).note,-2);assert.equal(plan.provenance.events.length,5);
});

test('Result and input ownership stay detached and CommonJS matches the actual browser implementation',()=>{
 const source=bytes.slice(),plan=preview(source);plan.imported.patterns[0].rows[0][0].note=95;plan.provenance.events[0].source.bytes[1]=0;assert.deepEqual(preview(source),base);assert.deepEqual(source,bytes);assert.deepEqual(cp(common.preview(source)),base);assert.deepEqual(state(),originalState);
});

test('Canonical AudioCompiler accepts the ordinary pattern-backed SFX and unchanged timer helper',()=>{
 h.context.sfxImported=base.imported;h.run('var sfxCompilerProject=JSON.parse(JSON.stringify(S));Object.assign(sfxCompilerProject,sfxImported,{audRows:sfxImported.rows,audioRuntime:{enabled:true,musicEnabled:false},orderList:[[0,0,0,0,0]]});var sfxCompilerPlan=Forge.services.AudioCompiler.plan(sfxCompilerProject)');assert.equal(h.run('sfxCompilerPlan.enabled'),true);assert.equal(h.run('sfxCompilerPlan.sfx.length'),1);for(let note=0;note<96;note++)assert.equal(require('../src/re/famitone2-audio-import.js').timer(note,0),h.run('Forge.services.AudioCompiler.timer('+note+')'));assert.deepEqual(state(),originalState);
});

test('Disclosure separates audible timing from native mixing, phase, unknown muted timers and triggers',()=>{
 const text=[...base.warnings,...base.limitations].join(' ');for(const pattern of [/not lossless/,/retained buffer/,/Unknown timers/,/project-wide tempo/,/zero-volume/,/phase/,/gameplay triggers/,/source ROM is unchanged/])assert.match(text,pattern);assert.equal(base.provenance.fidelity.mixing,'native SFX/music arbitration not transcribed');assert.equal(base.provenance.fidelity.gameplayTriggers,'not recovered');
});

test('Existing registry routes SFX through one profile with bounded source evidence and no active mutation',async()=>{
 const before=state(),analysis=await h.context.Forge.services.REAnalysis.open(bytes,{name:'unrelated-input.nes'}),result=await h.context.Forge.services.REMethods.dispatch('nes.famitone2-native.v1','convert',analysis,{resourceKind:'sfx',effectId:0,rows:16});assert.equal(result.status,'supported',result.reason);assert.equal(result.data.conversion.imported.format,'famitone2-sfx-transcription');assert.equal(result.data.conversion.sourceSha256,sha(bytes));assert.equal(result.data.canonicalCommit,false);assert.equal(result.data.inverseSupported,false);assert.equal(result.data.sourceUnchanged,true);for(const item of result.evidence){assert.equal(item.sourceSha256,sha(bytes));for(const range of item.ranges)assert.ok(range.start>=16&&range.length>0&&range.endExclusive<=bytes.length);}assert.ok(JSON.stringify(result).length<2*1024*1024);assert.deepEqual(state(),before);assert.equal(h.context.Forge.services.REMethods.profiles().filter(profile=>profile.id==='nes.famitone2-native.v1').length,1);
});

test('Registry SFX refusal preserves unsupported semantics, stale identity and option validation',async()=>{
 const before=state(),analysis=await h.context.Forge.services.REAnalysis.open(bytes),methods=h.context.Forge.services.REMethods;const unsupported=await methods.dispatch('nes.famitone2-native.v1','convert',analysis,{resourceKind:'sfx',effectId:2});assert.equal(unsupported.status,'unsupported');assert.equal(unsupported.data.conversion.imported,null);for(const options of [{resourceKind:'unknown'},{resourceKind:'sfx',songIndex:0},{resourceKind:'sfx',expectedSourceSha256:'0'.repeat(64)}])assert.equal((await methods.dispatch('nes.famitone2-native.v1','convert',analysis,options)).status,'invalid');assert.deepEqual(state(),before);
});

test('Registry cancellation, work limits and result bounds preserve SFX source and application state',async()=>{
 const before=state(),analysis=await h.context.Forge.services.REAnalysis.open(bytes),methods=h.context.Forge.services.REMethods;await assert.rejects(methods.dispatch('nes.famitone2-native.v1','convert',analysis,{resourceKind:'sfx'},{signal:{aborted:true}}),/abort|cancel/i);const work=await methods.dispatch('nes.famitone2-native.v1','convert',analysis,{resourceKind:'sfx'},{workBudget:1});assert.equal(work.status,'unsupported');const old=h.context.FamiTone2SfxImport;try{h.context.FamiTone2SfxImport={...old,preview(...args){const value=cp(old.preview(...args));value.provenance.excess='x'.repeat(2*1024*1024);return value;}};const result=await methods.dispatch('nes.famitone2-native.v1','convert',analysis,{resourceKind:'sfx'});assert.equal(result.status,'unsupported');assert.equal(result.data.diagnostics[0].code,'OUTPUT_LIMIT');assert.ok(JSON.stringify(result).length<10000);}finally{h.context.FamiTone2SfxImport=old;}assert.deepEqual(state(),before);assert.equal(sha(bytes),base.sourceSha256);
});

(async()=>{const results=[];for(const{name,fn}of tests){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:String(error.stack||error)});console.error('FAIL '+name+'\n'+String(error.stack||error).slice(0,6000));}}const passed=results.filter(item=>item.passed).length,report={suite:'native-sfx-import',htmlSha256:sha(fs.readFileSync(html)),fixtureSha256:sha(bytes),scope:'Actual bundled pure single-pulse FamiTone2 SFX transcription and existing REMethods conversion branch, independent native records, retained terminal frame, exact source spans, timing/tuning/control bounds and nonmutation. No native mixing, pulse-phase, listening or whole-game equivalence claim.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}console.log(passed+'/'+results.length+' passed');process.exitCode=report.failed?1:0;})();
