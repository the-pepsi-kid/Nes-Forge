'use strict';
// Reverse each exact, reviewable correction in sequence. Never exempt a whole
// source file or regenerate a historical reference oracle to hide a change.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const delta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/audio-correction-source-delta.json')));
const mobileDelta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/mobile-playback-source-delta.json')));
const entryDelta=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/mobile-keyboard-source-delta.json')));
const entryAllowed=['src/shell-prefix.html','src/services/release-info.js','src/audio/audio-ui.js'];
assert.deepEqual(entryDelta.changes.map(change=>change.path),entryAllowed,'Only direct tracker keyboard input and exact release identity may change');
const entryChanges=new Map(entryDelta.changes.map(change=>[change.path,change]));
const allowed=['src/shell-prefix.html','src/services/release-info.js','src/audio/audio-compiler.js','src/audio/audio-engine.js'];
assert.deepEqual(delta.changes.map(change=>change.path),allowed,'Only the two corrected audio sources and exact release identity changes are authorized');
const changes=new Map(delta.changes.map(change=>[change.path,change]));
const mobileAllowed=['src/shell-prefix.html','src/legacy/01-emulator.js','src/legacy/03-runtime-capture.js','src/services/release-info.js','src/services/emulator-play-ui.js'];
assert.deepEqual(mobileDelta.changes.map(change=>change.path),mobileAllowed,'Only frame scheduling, capture observation, Play diagnostics and release identity may change');
const mobileChanges=new Map(mobileDelta.changes.map(change=>[change.path,change]));
function reverseChange(name,source,change){
  if(!change)return source;
  assert.equal(digest(source),change.afterSha256,name+' must match the exact bounded candidate delta');
  for(const replacement of change.replacements){
    assert.ok(replacement.after.length>0,'Reverse patch must have an exact nonempty anchor');
    assert.equal(source.split(replacement.after).length,2,name+' reverse patch must occur exactly once');
    source=source.replace(replacement.after,replacement.before);
  }
  assert.equal(digest(source),change.beforeSha256,name+' must restore the reference source exactly');
  return source;
}
function playbackReferenceSource(name){return reverseChange(name,fs.readFileSync(path.join(root,name),'utf8'),entryChanges.get(name));}
function audioReferenceSource(name){return reverseChange(name,playbackReferenceSource(name),mobileChanges.get(name));}
function referenceSource(name){return reverseChange(name,audioReferenceSource(name),changes.get(name));}
function verifyPlaybackReference(){
  const referenceHash='27c436d1b7356fc8d2ce4c22396a0b768c4c2f3e6b2754f1be14e5db00389782';
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/history/mobile-playback-1/root/build-inputs.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
  assert.equal(baseline.sha256,referenceHash);assert.equal(entryDelta.referenceHtmlSha256,referenceHash);
  assert.equal(digest(fs.readFileSync(path.join(root,'baseline/NES_Forge_2.0.0-alpha.2_Mobile_Playback.html'))),referenceHash);
  assert.equal(entryDelta.referenceCandidate,'mobile-playback-1');assert.equal(entryDelta.candidate,'mobile-keyboard-1');
  assert.deepEqual(manifest.parts,baseline.inputs.map(input=>input.path),'Mobile keyboard adds, removes, or reorders no production modules');
  const restored=baseline.inputs.map(input=>{const source=Buffer.from(playbackReferenceSource(input.path));assert.equal(digest(source),input.sha256,input.path);assert.equal(source.length,input.bytes,input.path);return source;});
  assert.equal(digest(Buffer.concat(restored)),referenceHash,'Every source byte outside the declared direct keyboard UI change remains protected');
}
function verifyAudioReference(){
  verifyPlaybackReference();
  const referenceHash='4cdf7167c0c141e516416c8acabd6854cd979c5fd10e8f8b248514a3ba999aa0';
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/history/audio-correction-1/root/build-inputs.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
  assert.equal(baseline.sha256,referenceHash);assert.equal(mobileDelta.referenceHtmlSha256,referenceHash);
  assert.equal(digest(fs.readFileSync(path.join(root,'baseline/NES_Forge_2.0.0-alpha.1_Audio_Correction.html'))),referenceHash);
  assert.equal(mobileDelta.referenceCandidate,'audio-correction-1');assert.equal(mobileDelta.candidate,'mobile-playback-1');
  assert.deepEqual(manifest.parts,baseline.inputs.map(input=>input.path),'Mobile correction adds, removes, or reorders no production modules');
  const restored=baseline.inputs.map(input=>{const source=Buffer.from(audioReferenceSource(input.path));assert.equal(digest(source),input.sha256,input.path);assert.equal(source.length,input.bytes,input.path);return source;});
  assert.equal(digest(Buffer.concat(restored)),referenceHash,'All source bytes outside the declared mobile correction remain protected');
}
function verifyRuntimeReference(){
  verifyAudioReference();
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/history/re-runtime-1/root/build-inputs.json'))),manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json')));
  const referenceHash='e868b5b13a565049df35972c677498c5764f87ecdead9b732989f37dcec61e5d';
  assert.equal(baseline.sha256,referenceHash);assert.equal(delta.referenceHtmlSha256,referenceHash);
  assert.equal(digest(fs.readFileSync(path.join(root,'baseline/NES_Forge_1.9.0_RE_Runtime.html'))),referenceHash);
  assert.deepEqual(manifest.parts,baseline.inputs.map(input=>input.path),'Audio correction adds, removes, or reorders no production modules');
  const restored=baseline.inputs.map(input=>{const source=Buffer.from(referenceSource(input.path));assert.equal(digest(source),input.sha256,input.path);assert.equal(source.length,input.bytes,input.path);return source;});
  assert.equal(digest(Buffer.concat(restored)),referenceHash,'Every byte outside the exact correction delta remains protected');
}
module.exports={referenceSource,audioReferenceSource,playbackReferenceSource,verifyPlaybackReference,verifyAudioReference,verifyRuntimeReference};
