'use strict';
// Restore exact A1 bytes before retained guards inspect their historical layers.
// Each approved change is full-file hashed and reversed through unique patches.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'docs/history/native-background-1'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pinned='4dec7048b9fdb77bcfcd46ccde3d293313e53489f4987a7a112eced8cce6fa11';
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/native-map-source-delta.json')));
assert.equal(delta.referenceHtmlSha256,pinned);assert.equal(delta.referenceCandidate,'native-background-1');assert.equal(delta.candidate,'native-map-1');
const sourceAllowed=new Set(['src/shell-prefix.html','src/services/release-info.js','src/re/re-methods.js','src/re/re-native-background.js','src/re/re-native-background-ui.js','src/re/recovery-methods-ui.js']);
const testAllowed=new Set(['tests/native-background-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/recovery-methods-ui.cjs','tests/re-native-background-ui.cjs']);
for(const item of delta.changes)assert.ok(sourceAllowed.has(item.path),'Unreviewed native map source: '+item.path);
for(const item of delta.testChanges)assert.ok(testAllowed.has(item.path),'Unreviewed retained assertion/infrastructure change: '+item.path);
assert.equal(new Set(delta.changes.map(item=>item.path)).size,delta.changes.length);assert.equal(new Set(delta.testChanges.map(item=>item.path)).size,delta.testChanges.length);
function referenceBytes(name,changes){const bytes=fs.readFileSync(path.join(root,name)),change=changes.find(item=>item.path===name);if(!change)return bytes;assert.equal(hash(bytes),change.afterSha256,name+' differs from the exact reviewed native map delta');let source=bytes.toString('utf8');for(const edit of change.replacements){assert.ok(edit.after);assert.equal(source.split(edit.after).length,2,name+' reverse patch must occur exactly once');source=source.replace(edit.after,()=>edit.before);}const restored=Buffer.from(source);assert.equal(hash(restored),change.beforeSha256,name+' does not restore the committed native background candidate');return restored;}
function nativeMapReferenceSource(name){return referenceBytes(name,delta.changes).toString('utf8');}
function nativeMapReferenceTest(name){return referenceBytes(name,delta.testChanges).toString('utf8');}
function nativeMapReferenceTestBytes(name){return referenceBytes(name,delta.testChanges);}
function nativeMapReferenceManifest(manifest){
 assert.equal(manifest.release,'2.0.0-alpha.11');assert.equal(manifest.output,'mainline/NES_Forge_2.0.0-alpha.11.html');
 const declared=JSON.parse(fs.readFileSync(path.join(root,'native-map-modules.json'))),expected=delta.referenceParts.slice();assert.equal(declared.candidate,'native-map-1');
 assert.deepEqual(declared.insertions,[{after:'src/re/recovery-profiles.js',parts:['src/re/re-native-scene.js']},{after:'src/re/native-background-nametable.js',parts:['src/re/native-command-map.js','src/re/native-command-graphics.js','src/re/re-native-map.js']}]);
 for(const insertion of declared.insertions){assert.ok(expected.includes(insertion.after));expected.splice(expected.indexOf(insertion.after)+1,0,...insertion.parts);}
 assert.deepEqual(manifest.parts,expected);assert.deepEqual(manifest.parts,delta.candidateParts);assert.deepEqual(delta.added.map(item=>item.path),declared.insertions.flatMap(item=>item.parts));
 for(const item of delta.added)assert.equal(hash(fs.readFileSync(path.join(root,item.path))),item.sha256,item.path+' differs from its frozen native map module');
 return {...manifest,parts:delta.referenceParts};
}
function verifyNativeBackgroundReference(){
 assert.equal(hash(fs.readFileSync(path.join(root,'baseline/NES_Forge_2.0.0-alpha.11_Native_Background.html'))),pinned);
 const baseline=JSON.parse(fs.readFileSync(path.join(archive,'root/build-inputs.json')));assert.equal(baseline.sha256,pinned);
 const manifest=nativeMapReferenceManifest(JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))));assert.deepEqual(manifest.parts,baseline.inputs.map(item=>item.path));
 const sources=baseline.inputs.map(item=>{const bytes=Buffer.from(nativeMapReferenceSource(item.path));assert.equal(hash(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);assert.deepEqual(bytes,fs.readFileSync(path.join(archive,item.path)));return bytes;});assert.equal(hash(Buffer.concat(sources)),pinned);
 const inventory=JSON.parse(fs.readFileSync(path.join(archive,'Reference_Inventory.json')));assert.equal(inventory.htmlSha256,pinned);assert.equal(inventory.sourceCommit,'6cde192eee757e677376c319045944e17c3395fa');
 for(const item of inventory.files){const file=path.join(root,item.path);assert.equal(hash(fs.readFileSync(file)),item.sha256,'Committed native background reference changed: '+item.path);assert.equal(fs.statSync(file).size,item.bytes);const prefix='docs/history/native-background-1/tests/';if(item.path.startsWith(prefix)){const originalPath='tests/'+item.path.slice(prefix.length);assert.deepEqual(nativeMapReferenceTestBytes(originalPath),fs.readFileSync(file),'Retained test/fixture changed beyond its exact delta: '+originalPath);}}
 for(const name of ['native-background-modules.json','native-background-suites.json','compatibility-stabilization-modules.json','compatibility-stabilization-suites.json','movement-rules-modules.json','movement-rules-suites.json','seeded-mashup-modules.json','seeded-mashup-suites.json'])assert.deepEqual(fs.readFileSync(path.join(root,name)),fs.readFileSync(path.join(archive,'root',name)),name+' historical contract changed');
 const reference=JSON.parse(fs.readFileSync(path.join(root,'checkpoints/native-background-1-reference/test-results/candidate/Summary.json'))),counts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-native-background-suite-counts.json')));assert.equal(reference.sha256,pinned);assert.equal(reference.status,'passed');assert.equal(reference.suiteCount,78);assert.equal(reference.total,1617);assert.deepEqual(counts,Object.fromEntries(reference.suites.map(s=>[s.name,s.total])));
 for(const suite of reference.suites){const expected=fs.readFileSync(path.join(archive,suite.script));assert.equal(hash(expected),suite.scriptSha256,suite.script+' committed test provenance');assert.deepEqual(nativeMapReferenceTestBytes(suite.script),expected,suite.script+' retained assertions changed beyond the reviewed exact delta');}
}
module.exports={nativeMapReferenceSource,nativeMapReferenceTest,nativeMapReferenceTestBytes,nativeMapReferenceManifest,verifyNativeBackgroundReference};
