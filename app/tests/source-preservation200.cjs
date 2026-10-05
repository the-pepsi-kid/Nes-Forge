'use strict';
// Reverse the exact, reviewable two-defect delta; never exempt entire audio
// files from historical source checks or regenerate a frozen reference oracle.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/audio-correction-source-delta.json')));
const allowed=['src/shell-prefix.html','src/services/release-info.js','src/audio/audio-compiler.js','src/audio/audio-engine.js'];
assert.deepEqual(delta.changes.map(change=>change.path),allowed,'Only the two corrected audio sources and exact release identity changes are authorized');
const changes=new Map(delta.changes.map(change=>[change.path,change]));
function referenceSource(name){
  let source=fs.readFileSync(path.join(root,name),'utf8');
  const change=changes.get(name);if(!change)return source;
  assert.equal(digest(source),change.afterSha256,name+' must match the exact bounded candidate delta');
  for(const replacement of change.replacements){
    assert.ok(replacement.after.length>0,'Reverse patch must have an exact nonempty anchor');
    assert.equal(source.split(replacement.after).length,2,name+' reverse patch must occur exactly once');
    source=source.replace(replacement.after,replacement.before);
  }
  assert.equal(digest(source),change.beforeSha256,name+' must restore the reference source exactly');
  return source;
}
function verifyRuntimeReference(){
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/history/re-runtime-1/root/build-inputs.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
  const referenceHash='e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d';
  assert.equal(baseline.sha256,referenceHash);assert.equal(delta.referenceHtmlSha256,referenceHash);
  assert.equal(digest(fs.readFileSync(path.join(root,'baseline/NES_Forge_1.9.0_RE_Runtime.html'))),referenceHash);
  assert.deepEqual(manifest.parts,baseline.inputs.map(input=>input.path),'Audio correction adds, removes, or reorders no production modules');
  const restored=baseline.inputs.map(input=>{const source=Buffer.from(referenceSource(input.path));assert.equal(digest(source),input.sha256,input.path);assert.equal(source.length,input.bytes,input.path);return source;});
  assert.equal(digest(Buffer.concat(restored)),referenceHash,'Every byte outside the exact correction delta remains protected');
}
module.exports={referenceSource,verifyRuntimeReference};
