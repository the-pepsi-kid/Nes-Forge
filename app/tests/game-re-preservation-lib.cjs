'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'docs/history/spatial-re-1'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/game-re-source-delta.json')));
const PIN='b5f73734aa43356067e8fc0b0a9f45c7cbe434b4a38dfbedde827f1d534c0945',INVENTORY='7767d9ee402b0cb8b63c6e92af8467b3558a0cf6fd29a83fb55f16bcb5ce758e';
function referenceBytes(name){
 const bytes=fs.readFileSync(path.join(root,name)),change=delta.changes.find(c=>c.path===name);if(!change)return bytes;
 assert.equal(sha(bytes),change.afterSha256,'Unreviewed native game change: '+name);let text=bytes.toString();
 for(const edit of change.replacements){assert.ok(edit.after);assert.equal(text.split(edit.after).length,2,'Nonunique native game reversal: '+name);text=text.replace(edit.after,()=>edit.before);}
 const restored=Buffer.from(text);assert.equal(sha(restored),change.beforeSha256,'Spatial parent restoration: '+name);return restored;
}
function referenceManifest(manifest){
 const old=JSON.parse(fs.readFileSync(path.join(archive,'source-manifest.json')));
 if(JSON.stringify(manifest.parts)===JSON.stringify(delta.candidateParts)){assert.deepEqual({...manifest,parts:delta.referenceParts},old);return old;}return manifest;
}
function verifySpatialReference(){
 assert.equal(delta.referenceHtmlSha256,PIN);assert.equal(delta.referenceCandidate,'spatial-re-1');assert.equal(delta.candidate,'ninja-zelda-re-1');assert.equal(delta.inventorySha256,INVENTORY);
 const allowed=['src/legacy/01-emulator.js','src/re/spatial-re-ui.js','src/services/documentation.js','src/services/release-info.js','src/shell-prefix.html','tests/megaman2-audio.cjs','tests/run_candidate.cjs','tests/services167.cjs','tests/spatial-re-preservation-lib.cjs','tests/spatial-re.cjs'];assert.deepEqual(delta.changes.map(c=>c.path),allowed);
 assert.deepEqual(delta.added.map(c=>c.path),['src/re/game-re-index.js','src/re/game-re-native.js','src/re/game-re-ui.js']);for(const item of delta.added)assert.equal(sha(fs.readFileSync(path.join(root,item.path))),item.sha256,item.path);
 const inventoryBytes=fs.readFileSync(path.join(archive,'Reference_Inventory.json'));assert.equal(sha(inventoryBytes),INVENTORY);const inventory=JSON.parse(inventoryBytes);assert.equal(inventory.commit,'387b99b5f4bec1e05568482c15ef5bbea1ae4527');assert.equal(inventory.protectedFiles.length,288);
 const manifest=referenceManifest(JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')))),base=JSON.parse(fs.readFileSync(path.join(archive,'build-inputs.json')));assert.equal(base.sha256,PIN);assert.deepEqual(manifest.parts,base.inputs.map(i=>i.path));
 const parts=base.inputs.map(i=>{const bytes=referenceBytes(i.path);assert.equal(bytes.length,i.bytes,i.path);assert.equal(sha(bytes),i.sha256,i.path);return bytes;});assert.equal(sha(Buffer.concat(parts)),PIN,'Exact previous Spatial RE application');
 for(const item of inventory.protectedFiles){const bytes=referenceBytes(item.path);assert.equal(bytes.length,item.bytes,item.path);assert.equal(sha(bytes),item.sha256,item.path);}
 const gate=JSON.parse(fs.readFileSync(path.join(archive,'gate-reference.json')));assert.equal(gate.sha256,PIN);assert.equal(gate.status,'passed');assert.equal(gate.suiteCount,107);assert.equal(gate.total,1970);
 const counts=JSON.parse(fs.readFileSync(path.join(__dirname,'retained-spatial-re-suite-counts.json')));assert.deepEqual(counts,Object.fromEntries(gate.suites.map(s=>[s.name,s.total])));
 for(const suite of gate.suites){assert.equal(sha(referenceBytes(suite.script)),suite.scriptSha256,suite.name);assert.equal(suite.passed,suite.total);assert.equal(suite.failed,0);}
 // Only the scoped visible PPU address reload is permitted in the emulator.
 // CPU instructions, APU, capture implementation, compiler, native drivers,
 // project/schema and every other parent production part are exact above.
}
module.exports={referenceBytes,referenceManifest,verifySpatialReference};
