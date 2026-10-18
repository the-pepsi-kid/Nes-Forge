#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {inspect,compare,LIMITS,sha256}=require('../research/audio-recognition-1/features.cjs');
const {run,loadCorpus,corpus}=require('../research/audio-recognition-1/benchmark.cjs');
const {loadForge}=require('./harness.cjs');
const app=path.resolve(__dirname,'..'),manifest=require('../source-manifest.json'),html=path.resolve(process.argv[2]||path.join(app,manifest.output));
const results=[],test=(name,fn)=>{try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});}};
const report=run({timings:false}),fixtures=loadCorpus(),byId=id=>report.cases.find(c=>c.id===id);
function synthetic({base=0xc000,ram=0x300,zp=0x20,hardware=0x4000}={}) {
  const b=Buffer.alloc(16+16384);b.set([78,69,83,26,1,0]);
  b.set([0xad,ram&255,ram>>8,0x8d,hardware&255,hardware>>8,0xad,(ram+1)&255,(ram+1)>>8,0x65,zp,0x85,zp+1,0x20,(base+0x40)&255,(base+0x40)>>8,0xd0,1,0xea,0x60],16+base-0xc000);
  b[16+base-0xc000+0x40]=0x60;
  for(const v of [0x3ffa,0x3ffc,0x3ffe]){b[16+v]=base&255;b[16+v+1]=base>>8;}
  return b;
}
test('Pinned source/ROM/profile identities and all declared strict outcomes hold',()=>{
  assert.equal(report.passed,true);assert.equal(report.conclusions.falseAcceptancesInDeclaredControls,0);
  assert.deepEqual(report.conclusions.strictAccepted,['honkeypong','honkeypong-relocated','honkeypong-nrom32']);
  assert.equal(report.counts.heldOutIndependentSameFamilyProjects,0);
});
test('Source reassembly variants share a normalized update-routine fingerprint',()=>{
  for(const id of ['honkeypong-relocated','honkeypong-nrom32'])assert.equal(byId(id).topComparisons[0].identicalFingerprint,true);
  assert.notEqual(byId('honkeypong').topComparisons[0].candidateEntry,byId('honkeypong-relocated').topComparisons[0].candidateEntry);
});
test('DABG original container refusal is separate from different-engine code refusal',()=>{
  assert.deepEqual(byId('dabg-original').strict.diagnosticCodes,['UNSUPPORTED_CONTAINER']);
  assert.deepEqual(byId('dabg-ines-header').strict.diagnosticCodes,['NO_PROFILE']);
  const original=fixtures.get('dabg-original').bytes,derived=fixtures.get('dabg-ines-header').bytes;
  assert.deepEqual(original.subarray(16),derived.subarray(16));
  assert.equal(byId('dabg-original').topComparisons.some(c=>c.identicalFingerprint),false);
});
test('Official FamiStudio MMC5 export is a mapper control, not an engine classification result',()=>{
  const item=byId('famistudio-official-mmc5');assert.deepEqual(item.strict.diagnosticCodes,['UNSUPPORTED_MAPPER']);
  assert.equal(item.featureStatus,'unavailable');assert.equal(item.routineCount,0);assert.equal(item.topComparisons.length,0);
});
test('An exact candidate routine match cannot authorize a damaged driver',()=>{
  const mutated=byId('honkeypong-opcode-mutant');
  assert.equal(mutated.topComparisons[0].score,1);assert.equal(mutated.strict.status,'unknown');
  assert.equal(mutated.strict.conversionAuthorizedByBenchmark,false);assert.equal(report.conclusions.newFamiliesSupported,0);
});
test('CHR byte decoys and malformed input do not create reachable routine evidence',()=>{
  assert.equal(byId('honkeypong-chr-decoy').routineCount,0);
  assert.equal(byId('truncated').featureStatus,'unavailable');assert.equal(byId('truncated').routineCount,0);
});
test('All instruction/APU evidence resolves to exact immutable physical bytes',()=>{
  for(const item of fixtures.values()){
    const saved=Buffer.from(item.bytes),evidence=inspect(item.bytes);
    for(const routine of evidence.routines)for(const span of [...routine.spans,...routine.apuWrites]){
      assert.deepEqual(Array.from(item.bytes.subarray(span.fileOffset,span.fileOffset+span.bytes.length)),span.bytes);
      assert.ok(span.fileOffset>=evidence.mapping.prgFileOffset);
      assert.ok(span.fileOffset+span.bytes.length<=evidence.mapping.prgFileOffset+evidence.mapping.prgBytes);
    }
    assert.deepEqual(item.bytes,saved);assert.equal(sha256(item.bytes),evidence.sourceSha256);
  }
});
test('Uniform RAM, zero-page and code relocation preserves aliases and fingerprints',()=>{
  const a=inspect(synthetic()),b=inspect(synthetic({base:0xd000,ram:0x500,zp:0x60}));
  assert.equal(a.routines.length,1);assert.equal(b.routines.length,1);
  assert.equal(a.routines[0].fingerprint,b.routines[0].fingerprint);assert.equal(compare(a,b)[0].score,1);
  assert.ok(a.routines[0].tokens.includes('LDA/b/ram+1'));assert.ok(a.routines[0].tokens.includes('STA/z/zp+1'));
});
test('Hardware registers retain their exact addresses during normalization',()=>{
  const a=inspect(synthetic()),b=inspect(synthetic({hardware:0x4004}));
  assert.notEqual(a.routines[0].fingerprint,b.routines[0].fingerprint);
  assert.ok(a.routines[0].tokens.includes('STA/b/fixed:$4000'));
  assert.ok(b.routines[0].tokens.includes('STA/b/fixed:$4004'));
});
test('Zero-page aliases accessed through absolute addressing retain their relationship',()=>{
  const same=synthetic({ram:0x20,zp:0x20}),split=synthetic({ram:0x40,zp:0x20});
  const a=inspect(same).routines[0],b=inspect(split).routines[0];
  assert.notEqual(a.fingerprint,b.fingerprint);
  assert.ok(a.tokens.includes('LDA/b/zp+0'));assert.ok(b.tokens.includes('LDA/b/zp+32'));
});
test('Indexed APU base evidence never claims a proven effective address',()=>{
  const bytes=synthetic();bytes[19]=0x9d;const r=inspect(bytes).routines[0];
  assert.match(r.apuWrites[0].certainty,/effective address is not proven/);
});
test('Routine budget exposes partial evidence and oversized input is refused before hashing',()=>{
  const bytes=synthetic();bytes.fill(0xea,16,16+16384-6);bytes.set([0x8d,0,0x40],16);
  const result=inspect(bytes);assert.equal(result.status,'partial');assert.equal(result.routines[0].partial,true);
  assert.ok(result.work.routineInstructions<=LIMITS.routineWork);
  const over=inspect(Buffer.alloc(LIMITS.maxBytes+1));assert.equal(over.status,'unavailable');assert.equal(over.sourceSha256,null);
  assert.equal(inspect(null).status,'unavailable');
});
test('Benchmark is deterministic apart from optional elapsed measurements',()=>{
  assert.deepEqual(run({timings:false}),report);
});
test('Actual bundled strict decoder retains outcomes and project/emulator state',()=>{
  const h=loadForge(html);
  const state=h.run('JSON.stringify(S)'),emulator=h.run('JSON.stringify(emu)');
  for(const item of fixtures.values()){
    h.context.benchmarkBytes=item.bytes;
    const actual=h.json('FamiTone2Native.decode(new Uint8Array(benchmarkBytes))');
    assert.equal(actual.status,item.expectedStrict,item.id);
    if(item.expectedDiagnostic)assert.ok(actual.diagnostics.some(d=>d.code===item.expectedDiagnostic));
  }
  assert.equal(h.run('JSON.stringify(S)'),state);assert.equal(h.run('JSON.stringify(emu)'),emulator);assert.deepEqual(h.errors,[]);
});
const output={suite:'audio-recognition-benchmark',passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,total:results.length,results,htmlSha256:sha256(fs.readFileSync(html)),corpusSha256:report.corpusSha256,strictDecoderSha256:corpus.strictDecoder.sha256};
const reportPath=process.env.FORGE_TEST_REPORT||process.argv[3];if(reportPath){fs.mkdirSync(path.dirname(path.resolve(reportPath)),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(output,null,2)+'\n');}
console.log(JSON.stringify(output,null,2));process.exitCode=output.failed?1:0;
