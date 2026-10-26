'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const {loadForge} = require('../../app/tests/harness.cjs');
const html = path.resolve(__dirname, '../../app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fresh = file => loadForge(file, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
(async () => {
  assert.equal(sha(fs.readFileSync(process.argv[3])), '90c179abf3360821dc2dd93168ef74fa6ae2282a78ee6c7357958424612c4322');
  const results = [];
  for (let revision = 0; revision < 2; revision++) {
    const name = `Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`;
    const bytes = new Uint8Array(fs.readFileSync(path.join(process.argv[2], name))), old = fresh(process.argv[3]);
    const s = old.context.Forge.services;
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
    const id = s.PunchOutPoseUI.open(0);
    s.ProjectStore.load(s.PunchOutPoseProject.move(s.ProjectStore.capture(), id, -14, -95), {sync: true});
    s.PunchOutArtUI.open('chr', 0); old.run('snapshot();S.chr[1][0][0]^=1;notify("oldCompatibilityChr")');
    s.PunchOutArtUI.open('palette', 0); old.run('snapshot();S.pal[0][1]=33;notify("oldCompatibilityPalette")');
    assert(s.PunchOutArenaUI.open()); old.run('snapshot();S.selTile=36;S.selPal=0;paintScenePoint(96,152);');
    const saved = s.ProjectStore.serialize(), output = s.NativeResourceProject.build(s.ProjectStore.capture()).rom;
    const next = fresh(html), t = next.context.Forge.services;
    t.ProjectStore.load(saved, {sync: true}); await t.InvestigationUI.whenReady();
    assert.equal(sha(t.NativeResourceProject.build(t.ProjectStore.capture()).rom), sha(output));
    assert.equal(JSON.stringify(t.ProjectStore.capture().metasprites.find(frame => frame.id === id)), JSON.stringify(s.ProjectStore.capture().metasprites.find(frame => frame.id === id)));
    const derivative = await t.NativeResourceProject.create(output, 'Earlier full-pose/art/arena output');
    assert.equal(sha(t.NativeResourceProject.build(derivative).rom), sha(output));
    assert.match(next.get('nativeAudioStatus').textContent, /Decoded 84/);
    assert.deepEqual(old.errors, []); assert.deepEqual(next.errors, []);
    results.push({revision: name, passed: true, actualPreviousApplication: true, earlierFullPoseArtPaletteArenaProjectReopens: true,
      nativeOutputByteIdentical: true, priorMetaspritePreserved: true, earlierDerivativeRecognizedAndRebuilt: true, audioEntries: 84});
    console.log('PASS previous main project and derivative compatibility ' + name);
  }
  fs.writeFileSync(path.join(__dirname, 'Compatibility_Verification.json'), JSON.stringify({status: 'passed',
    htmlSha256: sha(fs.readFileSync(html)), previousHtmlSha256: sha(fs.readFileSync(process.argv[3])), results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
