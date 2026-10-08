#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadForge}=require('./harness.cjs');
const {BASELINE_SHA256,hash,buildCase}=require('../tools/capture_goldens.cjs');
const root=path.resolve(__dirname,'..'),html=path.resolve(process.argv[2]||path.join(root,'mainline/NES_Forge_1.6.7_Architecture_Convergence.html'));
const dir=path.join(__dirname,'fixtures/golden167'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const tests=[],test=(name,fn)=>tests.push({name,fn});
test('Golden inputs and expected outputs have complete immutable manifest hashes',()=>{
  assert.equal(manifest.referenceSha256,BASELINE_SHA256);assert.equal(manifest.cases.length,5);
  for(const c of manifest.cases){
    assert.equal(hash(fs.readFileSync(path.join(dir,c.projectFile))),c.projectSha256,c.id+' input');
    const expected=fs.readFileSync(path.join(dir,c.romFile));assert.equal(hash(expected),c.sha256,c.id+' ROM');assert.equal(expected.length,c.bytes,c.id+' length');
    assert.equal(hash(fs.readFileSync(path.join(dir,c.metadataFile))),c.metadataSha256,c.id+' metadata');
  }
});
for(const c of manifest.cases)test('Whole-ROM golden parity: '+c.id,()=>{
  const project=JSON.parse(fs.readFileSync(path.join(dir,c.projectFile),'utf8')),expected=fs.readFileSync(path.join(dir,c.romFile));
  const actual=buildCase(html,project);
  if(!actual.bytes.equals(expected)){
    let first=0;while(first<Math.min(expected.length,actual.bytes.length)&&expected[first]===actual.bytes[first])first++;
    assert.fail(c.id+' differs at file offset 0x'+first.toString(16)+', expected '+expected.length+' bytes '+c.sha256+', actual '+actual.bytes.length+' bytes '+hash(actual.bytes));
  }
  assert.deepEqual(actual.metadata,JSON.parse(fs.readFileSync(path.join(dir,c.metadataFile),'utf8')),c.id+' decoded extension metadata');
});
test('Actual frozen 1.6.6 rejects schema v9 before changing project or undo history',()=>{
  const baseline=path.join(root,'baseline/NES_Forge_1.6.6_Visual_Workspace.html');
  assert.equal(hash(fs.readFileSync(baseline)),BASELINE_SHA256);
  const h=loadForge(baseline);h.context.reference=JSON.parse(fs.readFileSync(path.join(dir,manifest.cases[0].projectFile),'utf8'));
  h.run('db_deserializeState(reference);snapshot();S.projectName="Unsaved reference";');
  const before=h.json('projectData()'),undo=h.json('undoStack'),redo=h.json('redoStack');
  h.context.future={...h.context.reference,version:9,projectName:'Must not load'};
  assert.throws(()=>h.run('db_deserializeState(future)'),/newer NES Forge/);
  assert.deepEqual(h.json('projectData()'),before);assert.deepEqual(h.json('undoStack'),undo);assert.deepEqual(h.json('redoStack'),redo);
});
(async()=>{
  const results=[];
  for(const {name,fn}of tests){const start=Date.now();try{await fn();results.push({name,passed:true,milliseconds:Date.now()-start});process.stdout.write('PASS '+name+'\n');}catch(error){results.push({name,passed:false,milliseconds:Date.now()-start,error:error.stack});process.stdout.write('FAIL '+name+'\n  '+error.message+'\n');}}
  const passed=results.filter(x=>x.passed).length,report={suite:'golden-parity167',html:path.basename(html),htmlSha256:hash(fs.readFileSync(html)),referenceSha256:BASELINE_SHA256,
    scope:'Five frozen complete-ROM byte comparisons through actual runtime dispatch, immutable inputs and expected metadata; actual frozen 1.6.6 schema v9 atomic downgrade rejection. Full-script VM; no real-browser claim.',passed,failed:results.length-passed,total:results.length,results};
  if(process.env.FORGE_TEST_REPORT)fs.writeFileSync(process.env.FORGE_TEST_REPORT,JSON.stringify(report,null,2)+'\n');
  process.stdout.write('\n'+passed+'/'+results.length+' passed\n');process.exitCode=passed===results.length?0:1;
})();
