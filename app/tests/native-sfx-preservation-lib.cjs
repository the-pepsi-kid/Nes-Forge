'use strict';
// Restore exact A2 bytes before retained guards inspect their historical layers.
// Each approved change is full-file hashed and reversed through unique patches.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sourceIntakeReferenceSource,sourceIntakeReferenceTestBytes,sourceIntakeReferenceManifest,verifyNativeSfxReference}=require('./source-intake-preservation-lib.cjs');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'docs/history/native-map-1'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pinned='d7087da3100ad82ace657ec5010e70bd0e627466df89ad247a84f87775a269be';
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/native-sfx-source-delta.json')));
assert.equal(delta.referenceHtmlSha256,pinned);assert.equal(delta.referenceCandidate,'native-map-1');assert.equal(delta.candidate,'native-sfx-1');
const sourceAllowed=new Set(['src/shell-prefix.html','src/services/release-info.js','src/services/project-store.js','src/re/re-native-audio-import-ui.js','src/re/recovery-profiles.js']);
const testAllowed=new Set(['tests/native-map-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/native-audio-import-preservation.cjs']);
for(const item of delta.changes)assert.ok(sourceAllowed.has(item.path),'Unreviewed native SFX source: '+item.path);
for(const item of delta.testChanges)assert.ok(testAllowed.has(item.path),'Unreviewed retained assertion/infrastructure change: '+item.path);
assert.equal(new Set(delta.changes.map(item=>item.path)).size,delta.changes.length);assert.equal(new Set(delta.testChanges.map(item=>item.path)).size,delta.testChanges.length);
function referenceBytes(name,changes){const bytes=changes===delta.changes?Buffer.from(sourceIntakeReferenceSource(name)):sourceIntakeReferenceTestBytes(name),change=changes.find(item=>item.path===name);if(!change)return bytes;assert.equal(hash(bytes),change.afterSha256,name+' differs from the exact reviewed native SFX delta');let source=bytes.toString('utf8');for(const edit of change.replacements){assert.ok(edit.after);assert.equal(source.split(edit.after).length,2,name+' reverse patch must occur exactly once');source=source.replace(edit.after,()=>edit.before);}const restored=Buffer.from(source);assert.equal(hash(restored),change.beforeSha256,name+' does not restore the committed native map candidate');return restored;}
function nativeSfxReferenceSource(name){return referenceBytes(name,delta.changes).toString('utf8');}
function nativeSfxReferenceTest(name){return referenceBytes(name,delta.testChanges).toString('utf8');}
function nativeSfxReferenceTestBytes(name){return referenceBytes(name,delta.testChanges);}
function nativeSfxReferenceManifest(manifest){
 manifest=sourceIntakeReferenceManifest(manifest);
 assert.equal(manifest.release,'2.0.0-alpha.11');assert.equal(manifest.output,'mainline/NES_Forge_2.0.0-alpha.11.html');
 const declared=JSON.parse(fs.readFileSync(path.join(root,'native-sfx-modules.json'))),expected=delta.referenceParts.slice();assert.equal(declared.candidate,'native-sfx-1');
 assert.deepEqual(declared.insertions,[{after:'src/re/famitone2-audio-import.js',parts:['src/re/famitone2-sfx-import.js','src/re/re-native-audio-import.js']},{after:'src/re/re-native-audio-import-ui.js',parts:['src/re/re-native-sfx-ui.js']}]);
 for(const insertion of declared.insertions){assert.ok(expected.includes(insertion.after));expected.splice(expected.indexOf(insertion.after)+1,0,...insertion.parts);}
 assert.deepEqual(manifest.parts,expected);assert.deepEqual(manifest.parts,delta.candidateParts);assert.deepEqual(delta.added.map(item=>item.path),declared.insertions.flatMap(item=>item.parts));
 for(const item of delta.added)assert.equal(hash(sourceIntakeReferenceSource(item.path)),item.sha256,item.path+' differs from its frozen native SFX module');
 return {...manifest,parts:delta.referenceParts};
}
function verifyNativeMapReference(){
 verifyNativeSfxReference();
 assert.equal(hash(fs.readFileSync(path.join(root,'baseline/NES_Forge_2.0.0-alpha.11_Native_Map.html'))),pinned);
 const baseline=JSON.parse(fs.readFileSync(path.join(archive,'root/build-inputs.json')));assert.equal(baseline.sha256,pinned);
 const manifest=nativeSfxReferenceManifest(JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))));assert.deepEqual(manifest.parts,baseline.inputs.map(item=>item.path));
 const sources=baseline.inputs.map(item=>{const bytes=Buffer.from(nativeSfxReferenceSource(item.path));assert.equal(hash(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);assert.deepEqual(bytes,fs.readFileSync(path.join(archive,item.path)));return bytes;});assert.equal(hash(Buffer.concat(sources)),pinned);
 const inventory=JSON.parse(fs.readFileSync(path.join(archive,'Reference_Inventory.json')));assert.equal(inventory.htmlSha256,pinned);assert.equal(inventory.sourceCommit,'5de81d48e67a0f076ce067fbf8ca3f1c3a89baf3');
 for(const item of inventory.files){const file=path.join(root,item.path);assert.equal(hash(fs.readFileSync(file)),item.sha256,'Committed native map reference changed: '+item.path);assert.equal(fs.statSync(file).size,item.bytes);const prefix='docs/history/native-map-1/tests/';if(item.path.startsWith(prefix)){const originalPath='tests/'+item.path.slice(prefix.length);assert.deepEqual(nativeSfxReferenceTestBytes(originalPath),fs.readFileSync(file),'Retained test/fixture changed beyond its exact delta: '+originalPath);}}
 for(const name of ['native-map-modules.json','native-map-suites.json','native-background-modules.json','native-background-suites.json','compatibility-stabilization-modules.json','compatibility-stabilization-suites.json','movement-rules-modules.json','movement-rules-suites.json','seeded-mashup-modules.json','seeded-mashup-suites.json'])assert.deepEqual(fs.readFileSync(path.join(root,name)),fs.readFileSync(path.join(archive,'root',name)),name+' historical contract changed');
 const reference=JSON.parse(fs.readFileSync(path.join(root,'checkpoints/native-map-1-reference/test-results/candidate/Summary.json'))),counts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-native-map-suite-counts.json')));assert.equal(reference.sha256,pinned);assert.equal(reference.status,'passed');assert.equal(reference.suiteCount,84);assert.equal(reference.total,1694);assert.deepEqual(counts,Object.fromEntries(reference.suites.map(s=>[s.name,s.total])));
 for(const suite of reference.suites){const expected=fs.readFileSync(path.join(archive,suite.script));assert.equal(hash(expected),suite.scriptSha256,suite.script+' committed test provenance');assert.deepEqual(nativeSfxReferenceTestBytes(suite.script),expected,suite.script+' retained assertions changed beyond the reviewed exact delta');}
}
module.exports={nativeSfxReferenceSource,nativeSfxReferenceTest,nativeSfxReferenceTestBytes,nativeSfxReferenceManifest,verifyNativeMapReference};
