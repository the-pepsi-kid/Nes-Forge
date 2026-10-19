'use strict';
// This outer layer restores the exact, committed Audio Tool Import candidate
// before every retained historical guard runs. No source or assertion exemption.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'docs/history/audio-tool-import-1'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pinned='1fd884cdc1b568b72e3bc777ef3a0b1a926b6020e8b143d8110a9a9001dc821d';
const inventoryPin='cb4c608b50c30bec3203d0bd818f38c2d57a4d2bd11b4e1abfecd8b4778357c6';
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/audio-driver-survey-source-delta.json')));
assert.equal(delta.referenceHtmlSha256,pinned);assert.equal(delta.referenceCandidate,'audio-tool-import-1');assert.equal(delta.candidate,'audio-driver-survey-1');
const sourceAllowed=new Set(['src/shell-prefix.html','src/services/release-info.js','src/re/re-runtime.js','src/re/re-runtime-ui.js']);
const testAllowed=new Set(['tests/audio-tool-import-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs']);
for(const item of delta.changes)assert.ok(sourceAllowed.has(item.path),'Unreviewed audio driver survey source: '+item.path);
for(const item of delta.testChanges)assert.ok(testAllowed.has(item.path),'Unreviewed retained assertion/infrastructure change: '+item.path);
assert.equal(new Set(delta.changes.map(item=>item.path)).size,delta.changes.length);assert.equal(new Set(delta.testChanges.map(item=>item.path)).size,delta.testChanges.length);
function referenceBytes(name,changes){
 const bytes=fs.readFileSync(path.join(root,name)),change=changes.find(item=>item.path===name);if(!change)return bytes;
 assert.equal(hash(bytes),change.afterSha256,name+' differs from the exact reviewed audio driver survey delta');
 let source=bytes.toString('utf8');for(const edit of change.replacements){assert.ok(edit.after);assert.equal(source.split(edit.after).length,2,name+' reverse patch must occur exactly once');source=source.replace(edit.after,()=>edit.before);}
 const restored=Buffer.from(source);assert.equal(hash(restored),change.beforeSha256,name+' does not restore the committed audio tool import candidate');return restored;
}
function audioDriverSurveyReferenceSource(name){return referenceBytes(name,delta.changes).toString('utf8');}
function audioDriverSurveyReferenceTestBytes(name){return referenceBytes(name,delta.testChanges);}
function audioDriverSurveyReferenceManifest(manifest){
 const reference=JSON.parse(fs.readFileSync(path.join(archive,'root/source-manifest.json')));
 assert.deepEqual(manifest,reference,'Audio driver survey adds, removes and reorders no production modules or schema');
 assert.deepEqual(manifest.parts,delta.referenceParts);assert.deepEqual(delta.candidateParts,delta.referenceParts);
 return manifest;
}
function verifyAudioToolImportReference(){
 const inventoryBytes=fs.readFileSync(path.join(archive,'Reference_Inventory.json'));assert.equal(hash(inventoryBytes),inventoryPin,'Committed audio tool import inventory changed');
 const inventory=JSON.parse(inventoryBytes);assert.equal(inventory.htmlSha256,pinned);assert.equal(inventory.sourceCommit,'ffb57eab61d2e69ae0b92838c7b55748423b3140');
 for(const item of inventory.archiveFiles){const bytes=fs.readFileSync(path.join(root,item.path));assert.equal(hash(bytes),item.sha256,'Committed audio tool import reference changed: '+item.path);assert.equal(bytes.length,item.bytes,item.path);}
 const baseline=JSON.parse(fs.readFileSync(path.join(archive,'root/build-inputs.json')));assert.equal(baseline.sha256,pinned);
 const manifest=audioDriverSurveyReferenceManifest(JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))));assert.deepEqual(manifest.parts,baseline.inputs.map(item=>item.path));
 const sources=baseline.inputs.map(item=>{const bytes=Buffer.from(audioDriverSurveyReferenceSource(item.path));assert.equal(hash(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);return bytes;});
 assert.equal(hash(Buffer.concat(sources)),pinned,'Exact parent standalone HTML reconstruction');
 for(const item of inventory.protectedFiles){const bytes=item.path.startsWith('tests/')?audioDriverSurveyReferenceTestBytes(item.path):fs.readFileSync(path.join(root,item.path));assert.equal(hash(bytes),item.sha256,'Retained test/fixture/contract changed beyond its reviewed exact delta: '+item.path);assert.equal(bytes.length,item.bytes,item.path);}
 const reference=JSON.parse(fs.readFileSync(path.join(archive,'root/gate-reference.json'))),counts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-audio-tool-import-suite-counts.json')));
 assert.equal(reference.sha256,pinned);assert.equal(reference.status,'passed');assert.equal(reference.suiteCount,97);assert.equal(reference.total,1872);assert.deepEqual(counts,Object.fromEntries(reference.suites.map(suite=>[suite.name,suite.total])));
 for(const suite of reference.suites){assert.equal(hash(audioDriverSurveyReferenceTestBytes(suite.script)),suite.scriptSha256,suite.script+' committed test provenance');assert.equal(suite.passed,suite.total);assert.equal(suite.failed,0);}
}
module.exports={audioDriverSurveyReferenceSource,audioDriverSurveyReferenceTestBytes,audioDriverSurveyReferenceManifest,verifyAudioToolImportReference};
