#!/usr/bin/env node
'use strict';
// Independent authored source corpus, consumed only through the actual bundle.
// Expected DABG reference locations were read from the pinned upstream files;
// this suite does not copy the production lexical scanner to derive its oracle.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadForge}=require('./harness.cjs'),{readDabgInput,dabgWorkspace,storedEntries,sha}=require('./source-intake-fixture.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))).output)),parent=path.join(root,'baseline/NES_Forge_2.0.0-alpha.11_Native_SFX.html');
const tests=[],test=(name,fn)=>tests.push({name,fn}),plain=value=>JSON.parse(JSON.stringify(value)),declared={declaredDialect:'ca65',engine:'Double Action Blaster Guys',engineVersion:''};
function fresh(file=html){const h=loadForge(file,{environment:{crypto:crypto.webcrypto}});assert.deepEqual(h.errors,[]);h.m=h.context.Forge.services.SourceWorkspace;return h;}
const input=readDabgInput();
const includes=[['ns_nes.s',25],['common.s',26],['memory.s',27],['main.s',28],['player.s',29],['newgame.s',30],['meta.s',31],['bullets.s',32],['object.s',33],['screens.s',34],['levels.s',35],['misc.s',36],['unpkb.s',37],['edit.s',38],['explosion.s',39],['powerups.s',40],['math.s',41],['unpb53.s',42],['attract.s',43],['musicseq.h',45],['sound.s',46],['music.s',47],['musicseq.s',48]];
function checkHashes(doc,report){
 const expected=plain(doc.files.map(file=>({path:file.path,currentBytes:Buffer.from(file.base64,'base64').length,originalBytes:Buffer.from(file.originalBase64,'base64').length,currentSha256:sha(Buffer.from(file.base64,'base64')),originalSha256:sha(Buffer.from(file.originalBase64,'base64'))})));
 assert.deepEqual(plain(report.files.map(({path,currentBytes,originalBytes,currentSha256,originalSha256})=>({path,currentBytes,originalBytes,currentSha256,originalSha256}))),expected);
 const workspace={format:doc.format,version:doc.version,dialect:doc.dialect,entry:doc.entry,build:plain(doc.build)};
 for(const original of [false,true]){const identity={workspace,files:expected.map(file=>({path:file.path,sha256:original?file.originalSha256:file.currentSha256}))};assert.equal(report.sourceIdentity[original?'originalSha256':'currentSha256'],sha(Buffer.from(JSON.stringify(identity),'utf8')));}
}
function state(h){return {project:h.context.Forge.services.ProjectStore.serialize(),epoch:h.context.Forge.services.ProjectStore.state.epoch,active:h.json('({asmSource:S.asmSource,asmErrors:S.asmErrors,asmSymbols:S.asmSymbols,asmBinary:S.asmBinary,org:S._asmOrg,writes:S._asmWrites,emitted:S._asmEmitted,undo:undoStack,redo:redoStack,undoBytes,dirty:Forge15.dirty,pc:emu.PC,ram:Array.from(emu.ram)})'),editor:h.get('codeInput').value,storage:[...h.storage],metrics:h.metrics()};}
test('Pinned DABG corpus preserves every original source and mixed-license companion',()=>{
 assert.equal(input.receipt.sha256,'70878e1f407134d699e7a12329102974d9b90056835b535319605f47624adca1');assert.equal(input.pinned.sourceCommit,'5ecc60b6af3f726851bfeb1c2555388c5953e0c0');assert.equal(input.files.length,44);assert.equal(input.files.reduce((n,file)=>n+file.bytes.length,0),281267);
 assert.equal(input.files.length,input.pinned.files.length);for(const item of input.pinned.files){const file=input.files.find(file=>file.path===item.path);assert.ok(file);assert.equal(file.bytes.length,item.byteLength);assert.equal(sha(file.bytes),item.sha256);}
 assert.match(input.entries.get('licenses/GPL-3.0.txt').toString(),/GNU GENERAL PUBLIC LICENSE/);assert.match(input.entries.get('licenses/Upstream-Notices.json').toString(),/Damian Yerrick/);assert.match(input.entries.get('source/DABG/mk.bat').toString(),/ca65 dabg\.s[\s\S]*ld65 -C nrom256\.x/);
});
test('DABG report records the declared entry, exact independent current/original hashes and foreign build boundary',async()=>{
 const h=fresh(),doc=dabgWorkspace(h.m,input),before=JSON.stringify(doc),report=await h.m.analyze(doc,declared);
 assert.equal(report.workspace.entry,'dabg.s');assert.equal(report.declared.dialect,'ca65');assert.equal(report.coverage.inventoryFiles,44);assert.equal(report.assessment.scope,'syntactic-only');assert.equal(report.assessment.buildVerified,false);assert.equal(report.assessment.sourceExecuted,false);assert.equal(report.assessment.sourceTranslated,false);assert.ok(report.diagnostics.some(d=>d.code==='declaration-foreign'));assert.ok(['blocked','incomplete'].includes(report.assessment.status));assert.equal(JSON.stringify(doc),before);checkHashes(doc,report);
});
test('All 23 original DABG includes are located independently with their real one-based source lines',async()=>{
 const h=fresh(),report=await h.m.analyze(dabgWorkspace(h.m,input),declared),refs=report.dependencies.filter(d=>d.kind==='include');
 assert.equal(refs.length,23);for(const [target,line]of includes){const dep=refs.find(d=>d.from==='dabg.s'&&d.line===line);assert.ok(dep,target);assert.equal(dep.path,target);assert.equal(dep.literal,target);assert.equal(dep.status,'present');assert.equal(dep.uncertain,false);assert.equal(dep.reachability,'reachable');}
 assert.equal(report.dependencies.length,27);
});
test('Original conditional title assets remain uncertain while all four literal binary inputs are present',async()=>{
 const h=fresh(),report=await h.m.analyze(dabgWorkspace(h.m,input),declared),refs=report.dependencies.filter(d=>d.kind==='incbin');
 const expected=[['dabg.s',335,'ascii.pb53',false],['screens.s',116,'pc10title.pkb',true],['screens.s',118,'title.pkb',true],['screens.s',121,'fourscore.pkb',false]];
 assert.equal(refs.length,4);for(const [from,line,target,conditional]of expected){const dep=refs.find(d=>d.from===from&&d.line===line);assert.ok(dep,target);assert.equal(dep.path,target);assert.equal(dep.status,'present');assert.equal(dep.context.conditional,conditional);assert.equal(dep.uncertain,conditional);assert.equal(dep.reachability,conditional?'uncertain':'reachable');const file=report.files.find(f=>f.path===target);assert.equal(file.reachability,conditional?'uncertain':'reachable');}
 assert.equal(report.resolution.conditionalExpansionEvaluated,false);assert.equal(report.resolution.macroExpansionEvaluated,false);assert.equal(report.resolution.linkerConfigurationEvaluated,false);assert.equal(report.resolution.foreignSearchPathsEvaluated,false);assert.ok(report.limitations.some(text=>/complete build graph/i.test(text)));
});
test('Supplied macros, linker configuration and build scripts are inventoried without claiming they were executed or reached',async()=>{
 const h=fresh(),report=await h.m.analyze(dabgWorkspace(h.m,input),declared),file=name=>report.files.find(f=>f.path===name);
 for(const name of ['generic.mac','longbranch.mac']){assert.equal(file(name).kind,'assembly');assert.equal(file(name).scanned,true);assert.equal(file(name).reachability,'unreferenced');}
 assert.equal(file('musicseq.h').kind,'assembly');assert.equal(file('musicseq.h').scanned,true);assert.equal(file('musicseq.h').reachability,'reachable');
 for(const name of ['mk.bat','nam.bat','pb53.py']){assert.equal(file(name).kind,'host-source');assert.equal(file(name).scanned,false);assert.equal(file(name).reachability,'unreferenced');}
 for(const name of ['ascii.chr','ascii.pb53','demo.pal','title.nam','fourscore.nam','title.pkb','pc10title.pkb','fourscore.pkb']){assert.equal(file(name).kind,'binary');assert.equal(file(name).scanned,false);}
 assert.equal(file('nrom256.x').scanned,false);assert.equal(file('nrom256.x').reachability,'unreferenced');assert.ok(report.diagnostics.some(d=>d.code==='unsupported-directive'));assert.equal(report.assessment.buildVerified,false);
});
test('Forge multi-file positive control reports its three literal inputs without implying assembly acceptance',async()=>{
 const h=fresh(),doc=h.m.example(),report=await h.m.analyze(doc,{declaredDialect:'forge-6502-v1'});
 assert.deepEqual(plain(report.dependencies.map(d=>({from:d.from,path:d.path,kind:d.kind,status:d.status}))),[{from:'main.asm',path:'src/constants.inc',kind:'include',status:'present'},{from:'main.asm',path:'src/boot.asm',kind:'include',status:'present'},{from:'main.asm',path:'assets/message.bin',kind:'incbin',status:'present'}]);
 assert.equal(report.assessment.status,'no-known-blockers');assert.equal(report.assessment.buildVerified,false);assert.equal(report.truncated,false);checkHashes(doc,report);
});
test('Existing Bridge Room assembly is an additional positive syntax control without a recovered-game claim',async()=>{
 const h=fresh(),bytes=fs.readFileSync(path.join(root,'examples/RE_Bridge_Room/main.asm')),doc=h.m.create([{path:'main.asm',bytes:new Uint8Array(bytes)}],{entry:'main.asm',build:{prgBytes:32768}}),report=await h.m.analyze(doc,{declaredDialect:'forge-6502-v1',engine:'Bridge Room source'});
 assert.equal(report.files.length,1);assert.equal(report.files[0].currentSha256,sha(bytes));assert.equal(report.files[0].scanned,true);assert.equal(report.dependencies.length,0);assert.equal(report.assessment.status,'no-known-blockers');assert.equal(report.assessment.buildVerified,false);checkHashes(doc,report);
});
test('Corpus analysis preserves active project, history, assembler, emulator and both source archive versions',async()=>{
 const h=fresh(),doc=dabgWorkspace(h.m,input);h.get('codeInput').value='.org $C000\n.byte $EA';h.run('asm_assemble()');h.context.corpusRuntimeRom=h.m.build(h.m.example()).rom;h.run('emuLoadRomData(corpusRuntimeRom,"source-intake-control.nes");for(let n=0;n<12;n++)cpuStepRaw();');
 const before=state(h),document=JSON.stringify(doc),archive=Buffer.from(h.m.archive(doc)),entries=storedEntries(archive);await h.m.analyze(doc,declared);
 assert.deepEqual(state(h),before);assert.equal(JSON.stringify(doc),document);assert.ok(Buffer.from(h.m.archive(doc)).equals(archive));for(const file of input.files)for(const prefix of ['current/','original/'])assert.equal(sha(entries.get(prefix+file.path)),sha(file.bytes));assert.equal(entries.size,89);
});
test('Parent and current candidates retain identical workspace serialization, archives, source ROM and line map',async()=>{
 const current=fresh(),prior=fresh(parent),oldDoc=prior.m.example(),doc=current.m.validate(plain(oldDoc)),before=current.m.build(doc),oldBuild=prior.m.build(oldDoc),archive=prior.m.archive(oldDoc);
 await current.m.analyze(doc,{declaredDialect:'forge-6502-v1'});const after=current.m.build(doc);
 assert.equal(JSON.stringify(doc),JSON.stringify(oldDoc));assert.equal(sha(current.m.archive(doc)),sha(archive));assert.equal(sha(before.rom),sha(oldBuild.rom));assert.equal(sha(after.rom),sha(oldBuild.rom));assert.deepEqual(plain(after.sourceMap),plain(oldBuild.sourceMap));assert.equal(after.expandedSource,oldBuild.expandedSource);
});
test('An edited DABG literal is resolved from current source while original bytes and identity remain available',async()=>{
 const h=fresh(),doc=dabgWorkspace(h.m,input),original=await h.m.analyze(doc,declared),oldText=h.m.decodeText(doc,'dabg.s'),edited=h.m.edit(doc,'dabg.s',oldText.replace('.incbin "ascii.pb53"','.incbin "missing-graphics.pb53"')),before=JSON.stringify(edited),report=await h.m.analyze(edited,declared),edge=report.dependencies.find(d=>d.from==='dabg.s'&&d.line===335);
 assert.equal(edge.path,'missing-graphics.pb53');assert.equal(edge.status,'missing');assert.equal(report.sourceIdentity.originalSha256,original.sourceIdentity.originalSha256);assert.notEqual(report.sourceIdentity.currentSha256,original.sourceIdentity.currentSha256);assert.equal(h.m.decodeText(doc,'dabg.s'),oldText);assert.equal(new TextDecoder().decode(h.m.read(edited,'dabg.s',true)),oldText);assert.equal(JSON.stringify(edited),before);checkHashes(edited,report);
});
test('Reopening an edited foreign workspace reproduces diagnostic evidence only when its declaration is supplied again',async()=>{
 const h=fresh(),doc=dabgWorkspace(h.m,input),edited=h.m.edit(doc,'screens.s',h.m.decodeText(doc,'screens.s')+'\n; preserved source review\n'),report=await h.m.analyze(edited,declared),reopened=h.m.validate(JSON.parse(JSON.stringify(edited))),same=await h.m.analyze(reopened,declared),unspecified=await h.m.analyze(reopened);
 assert.deepEqual(plain(same),plain(report));assert.equal(reopened.dialect,'forge-6502-v1');assert.equal(unspecified.declared.dialect,'unknown');assert.equal(unspecified.sourceIdentity.currentSha256,report.sourceIdentity.currentSha256);assert.ok(unspecified.diagnostics.some(d=>d.code==='declaration-unknown'));assert.equal(report.assessment.buildVerified,false);
});
test('Actual corpus source does not establish compatibility when its declaration is changed to Forge',async()=>{
 const h=fresh(),doc=dabgWorkspace(h.m,input),foreign=await h.m.analyze(doc,declared),forge=await h.m.analyze(doc,{declaredDialect:'forge-6502-v1'});
 assert.equal(foreign.sourceIdentity.currentSha256,forge.sourceIdentity.currentSha256);assert.ok(forge.diagnostics.some(d=>d.code==='unsupported-directive'));assert.ok(['blocked','incomplete'].includes(forge.assessment.status));assert.equal(forge.assessment.buildVerified,false);assert.equal(forge.resolution.linkerConfigurationEvaluated,false);assert.equal(forge.dependencies.length,27);
});
(async()=>{const results=[];for(const{name,fn}of tests){try{await fn();results.push({name,passed:true});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,error:error.stack||String(error)});process.stderr.write('FAIL '+name+'\n'+(error.stack||String(error))+'\n');}}const passed=results.filter(result=>result.passed).length,report={suite:'source-intake-corpus',htmlSha256:sha(fs.readFileSync(html)),inputSha256:input.receipt.sha256,passed,total:results.length,failed:results.length-passed,results};const output=process.env.FORGE_TEST_REPORT||process.argv[3];if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}process.stdout.write(passed+'/'+results.length+' passed\n');if(report.failed)process.exitCode=1;})();
