'use strict';
// The compact reference records committed bytes, not regenerated expectations.
// Reverse this candidate before any historical preservation layer runs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'docs/history/source-intake-1'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pinned='11676f2618ea9dcb4adc23be993155a49eb6a3c325ff28af5eeae95db11f92dd';
const inventoryPin='e6a96743ab3ae49c60e1dd633805777244bc292367e86e11f67bea5e21677ada';
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/audio-tool-import-source-delta.json')));
assert.equal(delta.referenceHtmlSha256,pinned);assert.equal(delta.referenceCandidate,'source-intake-1');assert.equal(delta.candidate,'audio-tool-import-1');
const sourceAllowed=new Set(['src/shell-prefix.html','src/services/release-info.js']);
const testAllowed=new Set(['tests/source-intake-preservation-lib.cjs','tests/run_candidate.cjs','tests/services167.cjs']);
for(const item of delta.changes)assert.ok(sourceAllowed.has(item.path),'Unreviewed audio tool import source: '+item.path);
for(const item of delta.testChanges)assert.ok(testAllowed.has(item.path),'Unreviewed retained assertion/infrastructure change: '+item.path);
assert.equal(new Set(delta.changes.map(item=>item.path)).size,delta.changes.length);assert.equal(new Set(delta.testChanges.map(item=>item.path)).size,delta.testChanges.length);
function referenceBytes(name,changes){
 const bytes=fs.readFileSync(path.join(root,name)),change=changes.find(item=>item.path===name);if(!change)return bytes;
 assert.equal(hash(bytes),change.afterSha256,name+' differs from the exact reviewed audio tool import delta');
 let source=bytes.toString('utf8');for(const edit of change.replacements){assert.ok(edit.after);assert.equal(source.split(edit.after).length,2,name+' reverse patch must occur exactly once');source=source.replace(edit.after,()=>edit.before);}
 const restored=Buffer.from(source);assert.equal(hash(restored),change.beforeSha256,name+' does not restore the committed source-intake candidate');return restored;
}
function audioToolImportReferenceSource(name){return referenceBytes(name,delta.changes).toString('utf8');}
function audioToolImportReferenceTestBytes(name){return referenceBytes(name,delta.testChanges);}
function audioToolImportReferenceManifest(manifest){
 assert.equal(manifest.release,'2.0.0-alpha.11');assert.equal(manifest.output,'mainline/NES_Forge_2.0.0-alpha.11.html');
 const declared=JSON.parse(fs.readFileSync(path.join(root,'audio-tool-import-modules.json'))),expected=delta.referenceParts.slice();assert.equal(declared.candidate,'audio-tool-import-1');
 assert.deepEqual(declared.insertions,[{after:'src/audio/audio-export.js',parts:['src/audio/famistudio-text.js','src/audio/audio-tool-import.js']},{after:'src/audio/audio-adaptive-ui.js',parts:['src/audio/audio-tool-import-ui.js']}]);
 for(const insertion of declared.insertions){assert.ok(expected.includes(insertion.after));expected.splice(expected.indexOf(insertion.after)+1,0,...insertion.parts);}
 assert.deepEqual(manifest.parts,expected);assert.deepEqual(manifest.parts,delta.candidateParts);assert.deepEqual(delta.added.map(item=>item.path),declared.insertions.flatMap(item=>item.parts));
 for(const item of delta.added)assert.equal(hash(fs.readFileSync(path.join(root,item.path))),item.sha256,item.path+' differs from its reviewed audio tool import module');
 return {...manifest,parts:delta.referenceParts};
}
function verifySourceIntakeReference(){
 const inventoryBytes=fs.readFileSync(path.join(archive,'Reference_Inventory.json'));assert.equal(hash(inventoryBytes),inventoryPin,'Committed source-intake inventory changed');
 const inventory=JSON.parse(inventoryBytes);assert.equal(inventory.htmlSha256,pinned);assert.equal(inventory.sourceCommit,'09f2233908bc511ffe057e3f7e885a5a42ef19ac');
 for(const item of inventory.archiveFiles){const bytes=fs.readFileSync(path.join(root,item.path));assert.equal(hash(bytes),item.sha256,'Committed source-intake reference changed: '+item.path);assert.equal(bytes.length,item.bytes,item.path);}
 const baseline=JSON.parse(fs.readFileSync(path.join(archive,'root/build-inputs.json')));assert.equal(baseline.sha256,pinned);
 const manifest=audioToolImportReferenceManifest(JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))));assert.deepEqual(manifest.parts,baseline.inputs.map(item=>item.path));
 const sources=baseline.inputs.map(item=>{const bytes=Buffer.from(audioToolImportReferenceSource(item.path));assert.equal(hash(bytes),item.sha256,item.path);assert.equal(bytes.length,item.bytes,item.path);return bytes;});
 assert.equal(hash(Buffer.concat(sources)),pinned);assert.deepEqual(Buffer.concat(sources),fs.readFileSync(path.join(root,'baseline/NES_Forge_2.0.0-alpha.11_Source_Intake.html')));
 for(const item of inventory.protectedFiles){const bytes=item.path.startsWith('tests/')?audioToolImportReferenceTestBytes(item.path):fs.readFileSync(path.join(root,item.path));assert.equal(hash(bytes),item.sha256,'Retained test/fixture/contract changed beyond its reviewed exact delta: '+item.path);assert.equal(bytes.length,item.bytes,item.path);}
 const reference=JSON.parse(fs.readFileSync(path.join(root,'checkpoints/source-intake-1-reference/test-results/candidate/Summary.json'))),counts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-source-intake-suite-counts.json')));
 assert.equal(reference.sha256,pinned);assert.equal(reference.status,'passed');assert.equal(reference.suiteCount,93);assert.equal(reference.total,1833);assert.deepEqual(counts,Object.fromEntries(reference.suites.map(suite=>[suite.name,suite.total])));
 for(const suite of reference.suites)assert.equal(hash(audioToolImportReferenceTestBytes(suite.script)),suite.scriptSha256,suite.script+' committed test provenance');
}
module.exports={audioToolImportReferenceSource,audioToolImportReferenceTestBytes,audioToolImportReferenceManifest,verifySourceIntakeReference};
