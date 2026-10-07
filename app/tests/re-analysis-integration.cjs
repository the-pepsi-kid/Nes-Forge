#!/usr/bin/env node
'use strict';
// Independent analysis-boundary tests against the complete standalone candidate.
// The authored byte fixtures below are not built by the implementation's decoder.
// VM/DOM measurements do not constitute browser or physical-device acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs');
const {referenceSource,verifyRuntimeReference}=require('./source-preservation200.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const tests=[],test=(name,fn)=>tests.push({name,fn});
const plain=value=>JSON.parse(JSON.stringify(value));
function fresh(){const h=loadForge(html,{environment:{crypto:crypto.webcrypto,structuredClone,setTimeout:(fn,ms,...args)=>ms===0?setTimeout(fn,0,...args):1,clearTimeout}});assert.deepEqual(h.errors,[]);h.analysis=h.context.Forge.services.REAnalysis;h.ui=h.context.Forge.services.REAnalysisUI;assert.ok(h.analysis,'REAnalysis must exist in the actual standalone bundle');assert.ok(h.ui,'REAnalysisUI must exist in the actual standalone bundle');return h;}
function nrom(mapper=0,{trainer=false,chr=true}={}){const base=16+(trainer?512:0),rom=new Uint8Array(base+16384+(chr?8192:0));rom.set([78,69,83,26,1,chr?1:0,(mapper&15)<<4|(trainer?4:0),mapper&240]);rom.fill(0xea,base,base+16384);rom.set([0x4c,0,0xc0],base);rom.set([0,0xc0,0,0xc0,0,0xc0],base+16384-6);return rom;}
function file(name,data){return {name,size:data.length,arrayBuffer:async()=>data.slice().buffer};}
function active(h){h.context.integrationROM=nrom();assert.equal(h.run('emuLoadRomData(integrationROM,"Unrelated running project ROM",0)'),true);h.run('S.projectName="Keep my authored project";snapshot();S.projectName="Keep current edits";snapshot();S.projectName="Keep later edits";undo();S.tab="emu";Forge.services.EmulatorTimeline.setEnabled(true);emuRunFrame();emuRunFrame();emu.joyShift=0xA5;emu.joyState=0x81;emuKeys.KeyZ=true;',20000);assert.ok(h.run('undoStack.length')>0);assert.ok(h.run('redoStack.length')>0);}
function snapshot(h){
 const machine=structuredClone(Object.fromEntries(Object.entries(h.run('emu')).filter(([,value])=>typeof value!=='function')));
 const apu=structuredClone(Object.fromEntries(Object.entries(h.run('apuCore')).filter(([,value])=>typeof value!=='function')));
 return {machine,apu,authoring:h.json('({project:Forge.services.ProjectStore.serialize(),epoch:Forge.services.ProjectStore.state.epoch,undo:undoStack,redo:redoStack,undoBytes,keys:emuKeys})'),timeline:plain(h.context.Forge.services.EmulatorTimeline.status())};
}

test('Every protected navigation baseline source survives the exact audio correction, release and recovery-label edits',()=>{
 verifyRuntimeReference();
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline/re-navigation-1-build-inputs.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
 for(const input of baseline.inputs){let source=referenceSource(input.path);if(input.path==='src/services/release-info.js'){const revised="candidate:'re-runtime-1'";assert.equal(source.split(revised).length,2,'Exactly one updated candidate identity');source=source.replace(revised,"candidate:'re-navigation-1'");}if(input.path==='src/re/re-ui.js'){const revised="'Preview editable recovery'";assert.equal(source.split(revised).length,2,'Exactly one renamed recovery command');source=source.replace(revised,"'Analyze ROM'");}assert.equal(hash(source),input.sha256,input.path);}
 const previous=baseline.inputs.map(input=>input.path);assert.deepEqual(manifest.parts.filter(part=>!previous.includes(part)),['src/audio/audio-adaptive-ui.js','src/re/re-analysis.js','src/re/re-analysis-ui.js','src/re/re-runtime.js','src/re/re-runtime-ui.js']);assert.deepEqual(manifest.parts.filter(part=>previous.includes(part)),previous);
});

test('Unknown engine and unsupported mapper are inspectable beside a populated emulator and recorded history',async()=>{
 const h=fresh();active(h);const before=snapshot(h),rom=nrom(255,{trainer:true});rom[16]=0x5a;rom[528]=0xa9;rom[529]=0x42;
 const result=await h.analysis.open(rom,{name:'Unknown engine mapper 255.nes'});assert.equal(result.report.header.status,'valid');assert.equal(result.report.header.mapper,255);assert.equal(result.report.cpuMapping.status,'unknown');assert.deepEqual(plain(result.report.cpuMapping.windows),[]);assert.ok(result.report.vectors.every(vector=>vector.status==='unknown'));assert.equal(result.report.layout.prg.start,528);assert.deepEqual(plain(result.read(528,2).bytes),[0xa9,0x42]);assert.equal(result.report.identity.sha256,hash(rom));
 assert.deepEqual(snapshot(h),before);assert.equal(h.run('emu.mapper'),0);assert.notEqual(h.run('emu.romName'),result.report.identity.name);
 const raw=await h.analysis.open(Uint8Array.from([0xa9,0x12,0x8d,0x00,0x20]),{name:'Different 6502 machine.bin'});assert.equal(raw.report.header.status,'raw');assert.equal(raw.disassemble({fileOffset:0,length:5}).rows[1].text,'STA $2000');assert.deepEqual(snapshot(h),before);assert.deepEqual(h.errors,[]);
});

test('Authentic Bridge Room recovery refusal leaves a general analysis and original emulator intact',async()=>{
 const h=fresh();active(h);const before=snapshot(h),rom=nrom(255),result=await h.analysis.open(rom,{name:'Unsupported recovery.nes'}),first=result.read(16,8),identity=result.report.identity.sha256;
 await assert.rejects(()=>h.context.Forge.services.REBridge.analyze(rom,'Unsupported recovery.nes'),/mapper|profile|Native Room|supported/i);
 assert.deepEqual(result.read(16,8),first);assert.equal(result.report.identity.sha256,identity);assert.deepEqual(snapshot(h),before);
});

test('NROM mirror aliases have distinct branch destinations while every row retains its physical file offset',async()=>{
 const h=fresh(),rom=nrom();rom.set([0xd0,0x7f,0xd0,0x80],16+0xfc);const result=await h.analysis.open(rom),windows=result.report.cpuMapping.windows;
 assert.deepEqual(plain(windows.map(window=>[window.cpu.start,window.file.start,window.file.length])),[[0x8000,16,16384],[0xc000,16,16384]]);
 const physical=result.disassemble({fileOffset:16+0xfc,length:4});assert.deepEqual(plain(physical.rows.map(row=>row.cpuAddress)),[null,null]);assert.deepEqual(plain(physical.rows.map(row=>row.target)),[null,null]);
 for(const origin of [0x80fc,0xc0fc]){const output=result.disassemble({fileOffset:16+0xfc,length:4,cpuAddress:origin,bankLabel:'Explicit mirror choice'});assert.deepEqual(plain(output.rows.map(row=>row.fileOffset)),[16+0xfc,16+0xfe]);assert.deepEqual(plain(output.rows.map(row=>row.target)),[origin+129,origin-124]);assert.equal(output.mapping.evidence,'user-supplied-mapping');assert.equal(output.provenance.sha256,hash(rom));}
});

test('Independent opcode bytes decode addressing and endian order without inventing indirect jump targets',async()=>{
 const h=fresh(),raw=Uint8Array.from([0xa9,0x80,0x85,0x10,0xbd,0xff,0x20,0xb1,0xff,0x6c,0xff,0x20,0xd0,0x80,0x60,0x02,0x4c,0x34]),result=await h.analysis.open(raw),rows=result.disassemble({fileOffset:0,length:raw.length,cpuAddress:0x80f0,variant:'2a03'}).rows;
 assert.deepEqual(plain(rows.slice(0,8).map(row=>row.text)),['LDA #$80','STA $10','LDA $20FF,X','LDA ($FF),Y','JMP ($20FF)','BNE $807E','RTS','.byte $02']);assert.deepEqual(plain(rows.slice(0,8).map(row=>row.length)),[2,2,3,2,3,2,1,1]);assert.equal(rows[4].target,null);assert.equal(rows[5].target,0x807e);assert.equal(rows[7].status,'unclassified-byte');assert.equal(rows[8].text,'.byte $4C');assert.equal(rows[8].status,'truncated-instruction');assert.equal(rows[8].length,1);
 assert.deepEqual(plain(rows.flatMap(row=>row.bytes)),Array.from(raw));
});

test('Relative branches wrap CPU addresses while user mappings never silently cross the address space',async()=>{
 const h=fresh(),result=await h.analysis.open(Uint8Array.from([0xd0,0xfc]));assert.equal(result.disassemble({fileOffset:0,length:2,cpuAddress:0}).rows[0].target,0xfffe);assert.equal(result.disassemble({fileOffset:0,length:2,cpuAddress:0xfffe}).rows[0].target,0xfffc);assert.throws(()=>result.disassemble({fileOffset:0,length:2,cpuAddress:0xffff}),/crosses/);assert.throws(()=>result.mapRange({fileOffset:0,length:2,cpuAddress:0xffff}),/crosses/);assert.equal(result.mapRange({fileOffset:0,length:2,cpuAddress:0xfffe}).cpu.endExclusive,65536);assert.equal(result.disassemble({fileOffset:0,length:2}).rows[0].target,null);
});

test('Physical search resumes across chunk and overlapping-pattern boundaries without omitted matches',async()=>{
 const h=fresh(),raw=Uint8Array.from([8,8,0xa9,0xa9,0xa9,0xa9,0xa9,8,0xa9,0xa9]),result=await h.analysis.open(raw),matches=[];let start=0,iterations=0;
 do{const page=result.search([0xa9,0xa9],{start,maxResults:1,maxScan:3});matches.push(...page.matches.map(match=>match.fileOffset));assert.ok(page.scannedBytes<=3);assert.ok(page.nextStart>start);start=page.nextStart;if(!page.hasMore)break;assert.ok(++iterations<raw.length);}while(true);
 assert.deepEqual(matches,[2,3,4,5,8]);assert.equal(start,raw.length);assert.equal(result.search([0xa9,0xa9],{start:raw.length}).hasMore,false);
});

test('ROM identity and readable bytes remain fixed even when callers mutate input during hashing',async()=>{
 const h=fresh(),raw=Uint8Array.from([0xa9,0x42,0x60]),original=raw.slice(),opening=h.analysis.open(raw,{name:'Input snapshot'});raw.fill(0);const result=await opening;assert.equal(result.report.identity.sha256,hash(original));assert.deepEqual(plain(result.read(0,3).bytes),Array.from(original));assert.throws(()=>{result.read(0,3).bytes[0]=7;},TypeError);assert.throws(()=>{result.report.identity.name='altered';},TypeError);assert.deepEqual(plain(result.read(0,3).bytes),Array.from(original));
 const second=await h.analysis.open(raw,{name:'Different bytes'});assert.notEqual(second.report.identity.sha256,result.report.identity.sha256);assert.deepEqual(plain(second.read(0,3).bytes),[0,0,0]);
});

test('Malformed container declarations retain every original byte and do not manufacture banks or vectors',async()=>{
 const h=fresh(),cases=[Uint8Array.from([78,69,83,26,1]),Uint8Array.from([78,69,83,26,1,0,0,0,0,0,0,0,0,0,0,0]),Uint8Array.from([78,69,83,26,255,0,0,8,0,15,0,0,0,0,0,0])];
 for(const raw of cases){const result=await h.analysis.open(raw);assert.equal(result.report.header.status,'raw');assert.equal(result.report.cpuMapping.status,'unknown');assert.deepEqual(plain(result.report.cpuMapping.windows),[]);assert.ok(result.report.vectors.every(vector=>vector.status==='unknown'));assert.deepEqual(plain(result.read(0,raw.length).bytes),Array.from(raw));assert.equal(result.report.identity.sha256,hash(raw));assert.ok(result.report.warnings.length);}
});

test('Actual analysis UI opens unknown mapper, maps banks, searches and labels without replacing emulator or authoring state',async()=>{
 const h=fresh();active(h);const before=snapshot(h),rom=nrom(255,{trainer:true});rom.set([0xa9,0x42,0x8d,0x00,0x20],528);
 assert.equal(await h.ui.openFile(file('Independently authored unknown mapper.nes',rom)),true);assert.equal(h.ui.getState().opened,true);assert.equal(h.ui.getState().selection.cpuAddress,null);assert.match(h.get('reAnalysisCapabilities').textContent,/mapper 255/);assert.match(h.get('reAnalysisCode').textContent,/LDA #\$42/);
 assert.equal(h.ui.saveMapping({fileOffset:528,length:512,cpuAddress:0x8000,bankLabel:'Candidate code bank',variant:'2a03'}),true);assert.equal(h.ui.goMapping(0),true);assert.equal(h.ui.getState().selection.cpuAddress,0x8000);
 assert.equal(await h.ui.searchBytes('A9 42 8D',{start:0}),true);assert.equal(h.ui.getState().matches,1);assert.equal(h.ui.goResult(0),true);assert.equal(h.ui.getState().selection.fileOffset,528);assert.equal(h.ui.getState().selection.cpuAddress,0x8000);
 assert.equal(h.ui.annotate({fileOffset:528,length:5,label:'Possible reset code',comment:'Observed original bytes; role still a hypothesis.'}),true);const report=h.ui.exportData();assert.equal(report.identity.sha256,hash(rom));assert.equal(report.annotations[0].evidence,'user');assert.equal(report.mappings[0].evidence,'user-supplied-mapping');assert.deepEqual(snapshot(h),before);
 assert.equal(await h.context.Forge.services.REUI.analyzeFile(file('Unsupported recovery.nes',rom)),false);assert.equal(h.ui.exportData().identity.sha256,hash(rom));assert.equal(h.ui.getState().annotations,1);assert.match(h.get('reAnalysisCode').textContent,/LDA #\$42/);assert.deepEqual(snapshot(h),before);assert.deepEqual(h.errors,[]);
});

test('New raw file owns fresh mappings and annotations while an older pending file cannot publish over it',async()=>{
 const h=fresh(),old=nrom();assert.equal(await h.ui.openFile(file('Old profile.nes',old)),true);assert.equal(h.ui.annotate({fileOffset:16,length:3,label:'Old note',comment:''}),true);assert.equal(h.ui.getState().mappings,2);
 let release;const delayed=new Promise(resolve=>{release=resolve;}),pending=h.ui.openFile({name:'Slow old file.nes',size:old.length,arrayBuffer:()=>delayed});const raw=Uint8Array.from([0xa9,0x77,0x60]);assert.equal(await h.ui.openFile(file('New raw platform.bin',raw)),true);release(old.slice().buffer);assert.equal(await pending,false);
 const report=h.ui.exportData();assert.equal(report.identity.name,'New raw platform.bin');assert.equal(report.identity.sha256,hash(raw));assert.deepEqual(plain(report.annotations),[]);assert.deepEqual(plain(report.mappings),[]);assert.equal(h.ui.getState().selection.cpuAddress,null);assert.equal(h.ui.getState().selection.variant,'6502');assert.equal(h.ui.getState().busy,false);assert.match(h.get('reAnalysisStatus').textContent,/File opened for analysis/);
});

test('A canceled asynchronous search cannot append stale matches after another file opens',async()=>{
 const h=fresh();assert.equal(await h.ui.openFile(file('Search owner.bin',Uint8Array.from([0xa9,0x42,0xa9,0x42]))),true);const searching=h.ui.searchBytes('A9 42',{start:0});assert.equal(h.ui.getState().searching,true);h.ui.selectFile(file('Replacement.bin',Uint8Array.from([0x60])));assert.equal(await searching,false);assert.equal(await h.ui.openFile(),true);assert.equal(h.ui.getState().matches,0);assert.equal(h.ui.getState().searching,false);assert.equal(h.ui.exportData().identity.name,'Replacement.bin');assert.equal(h.get('reAnalysisResults').children.length,0);
});

test('Inspection exports identify user evidence and reject project import without dropping active work',async()=>{
 const h=fresh();active(h);const before=snapshot(h),raw=Uint8Array.from([0xa9,0x21,0x60]),name='<img src=x onerror=alert(1)>.bin';assert.equal(await h.ui.openFile(file(name,raw)),true);assert.ok(h.get('reAnalysisIdentity').textContent.startsWith(name));assert.equal(h.get('reAnalysisIdentity').children.length,0);
 assert.equal(h.ui.annotate({fileOffset:0,length:2,label:'<b>Suspected value</b>',comment:'Do not treat as recovered gameplay.'}),true);assert.equal(h.get('reAnalysisNotes').children[0].children.length,0);
 let saved;h.context.forgeSave.request=async(data,filename,mime)=>{saved={data:JSON.parse(new TextDecoder().decode(data)),filename,mime};return {status:'saved'};};await h.ui.downloadReport();assert.equal(saved.data.format,'NESForgeREInspection');assert.equal(saved.data.version,2);assert.equal(saved.data.identity.sha256,hash(raw));assert.equal(saved.data.annotations[0].evidence,'user');assert.equal(saved.mime,'application/json');assert.doesNotMatch(saved.filename,/[<>]/);assert.equal(saved.data.scenes,undefined);
 h.context.integrationInspection=JSON.stringify(saved.data);assert.throws(()=>h.run('Forge.services.ProjectStore.load(integrationInspection)'),/inspection report, not a Forge project/);assert.deepEqual(snapshot(h),before);
});

(async()=>{const results=[];for(const {name,fn}of tests){const started=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-started});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-started,error:error.stack});process.stderr.write('FAIL '+name+'\n'+(error.stack||String(error))+'\n');}}
 const passed=results.filter(item=>item.passed).length,report={suite:'re-analysis-integration',html:path.basename(html),htmlSha256:hash(fs.readFileSync(html)),scope:'Independent bundled analysis, explicit CPU mapping and authored opcode fixtures; isolation from actual loaded emulator, APU, original ROM, active project, undo/redo and recorded history. VM DOM, not browser or hardware acceptance.',passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}process.stdout.write(passed+'/'+results.length+' passed\n');process.exitCode=report.failed?1:0;
})();
