'use strict';
// This outer layer restores the exact committed compatibility-stabilization candidate.
// Retained layers see restored bytes, with no widened normalization or oracle replacement.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'docs/history/compatibility-stabilization-1'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pinned='b3d9b852782b1b7ebd56637bb94e4dbcb09379614b7c8577e007046db45c8e02';
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/native-background-source-delta.json')));
assert.equal(delta.referenceHtmlSha256,pinned);assert.equal(delta.referenceCandidate,'compatibility-stabilization-1');assert.equal(delta.candidate,'native-background-1');
const sourceAllowed=new Set(['src/shell-prefix.html','src/services/release-info.js','src/services/project-store.js','src/services/build-services.js','src/re/recovery-methods-ui.js']);
const testAllowed=new Set(['tests/compatibility-stabilization-preservation.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/recovery-methods-ui.cjs']);
for(const item of delta.changes)assert.ok(sourceAllowed.has(item.path),'Unreviewed native background source: '+item.path);
for(const item of delta.testChanges)assert.ok(testAllowed.has(item.path),'Unreviewed retained assertion/infrastructure change: '+item.path);
assert.equal(new Set(delta.changes.map(item=>item.path)).size,delta.changes.length);assert.equal(new Set(delta.testChanges.map(item=>item.path)).size,delta.testChanges.length);
function referenceBytes(name,changes){const bytes=fs.readFileSync(path.join(root,name)),change=changes.find(item=>item.path===name);if(!change)return bytes;assert.equal(hash(bytes),change.afterSha256,name+' differs from the exact reviewed native background delta');let source=bytes.toString('utf8');for(const edit of change.replacements){assert.ok(edit.after);assert.equal(source.split(edit.after).length,2,name+' reverse patch must occur exactly once');source=source.replace(edit.after,()=>edit.before);}const restored=Buffer.from(source);assert.equal(hash(restored),change.beforeSha256,name+' does not restore the committed stabilization candidate');return restored;}
function nativeBackgroundReferenceSource(name){return referenceBytes(name,delta.changes).toString('utf8');}
function nativeBackgroundReferenceTest(name){return referenceBytes(name,delta.testChanges).toString('utf8');}
function nativeBackgroundReferenceTestBytes(name){return referenceBytes(name,delta.testChanges);}
function nativeBackgroundReferenceManifest(manifest){
 assert.equal(manifest.release,'2.0.0-alpha.11');assert.equal(manifest.output,'mainline/NES_Forge_2.0.0-alpha.11.html');
 const declared=JSON.parse(fs.readFileSync(path.join(root,'native-background-modules.json'))),expected=delta.referenceParts.slice();assert.equal(declared.candidate,'native-background-1');
 assert.deepEqual(declared.insertions,[{after:'src/re/recovery-profiles.js',parts:['src/re/re-native-background.js','src/re/native-background-construction.js','src/re/native-background-nametable.js','src/re/re-native-background-ui.js']}]);
 for(const insertion of declared.insertions){assert.ok(expected.includes(insertion.after));expected.splice(expected.indexOf(insertion.after)+1,0,...insertion.parts);}
 assert.deepEqual(manifest.parts,expected);assert.deepEqual(manifest.parts,delta.candidateParts);assert.deepEqual(delta.added.map(item=>item.path),declared.insertions.flatMap(item=>item.parts));
 for(const item of delta.added)assert.equal(hash(fs.readFileSync(path.join(root,item.path))),item.sha256,item.path+' differs from its frozen native background module');
 return {...manifest,parts:delta.referenceParts};
}
function verifyCompatibilityStabilizationReference(){
 assert.equal(hash(fs.readFileSync(path.join(root,'baseline/NES_Forge_2.0.0-alpha.11_Compatibility_Stabilization.html'))),pinned);
 const baseline=JSON.parse(fs.readFileSync(path.join(archive,'root/build-inputs.json')));assert.equal(baseline.sha256,pinned);
 const manifest=nativeBackgroundReferenceManifest(JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))));assert.deepEqual(manifest.parts,baseline.inputs.map(item=>item.path));
 const sources=baseline.inputs.map(item=>{const bytes=Buffer.from(nativeBackgroundReferenceSource(item.path));assert.equal(hash(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);assert.deepEqual(bytes,fs.readFileSync(path.join(archive,item.path)));return bytes;});assert.equal(hash(Buffer.concat(sources)),pinned);
 const inventory=JSON.parse(fs.readFileSync(path.join(archive,'Reference_Inventory.json')));assert.equal(inventory.htmlSha256,pinned);assert.equal(inventory.sourceCommit,'de77c105bc451f3ab7a90c00fe1c4162675ccd52');
 for(const item of inventory.files){const file=path.join(root,item.path);assert.equal(hash(fs.readFileSync(file)),item.sha256,'Committed stabilization reference changed: '+item.path);assert.equal(fs.statSync(file).size,item.bytes);const prefix='docs/history/compatibility-stabilization-1/tests/';if(item.path.startsWith(prefix)){const originalPath='tests/'+item.path.slice(prefix.length);assert.deepEqual(nativeBackgroundReferenceTestBytes(originalPath),fs.readFileSync(file),'Retained test/fixture changed beyond its exact delta: '+originalPath);}}
 for(const name of ['compatibility-stabilization-modules.json','compatibility-stabilization-suites.json','movement-rules-modules.json','movement-rules-suites.json','seeded-mashup-modules.json','seeded-mashup-suites.json'])assert.deepEqual(fs.readFileSync(path.join(root,name)),fs.readFileSync(path.join(archive,'root',name)),name+' historical contract changed');
 const reference=JSON.parse(fs.readFileSync(path.join(root,'checkpoints/compatibility-stabilization-1-reference/test-results/candidate/Summary.json'))),counts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-compatibility-stabilization-suite-counts.json')));assert.equal(reference.sha256,pinned);assert.equal(reference.status,'passed');assert.equal(reference.suiteCount,72);assert.equal(reference.total,1541);assert.deepEqual(counts,Object.fromEntries(reference.suites.map(s=>[s.name,s.total])));
 for(const suite of reference.suites){const expected=fs.readFileSync(path.join(archive,suite.script));assert.equal(hash(expected),suite.scriptSha256,suite.script+' committed test provenance');assert.deepEqual(nativeBackgroundReferenceTestBytes(suite.script),expected,suite.script+' retained assertions changed beyond the reviewed exact delta');}
}
module.exports={nativeBackgroundReferenceSource,nativeBackgroundReferenceTest,nativeBackgroundReferenceTestBytes,nativeBackgroundReferenceManifest,verifyCompatibilityStabilizationReference};
