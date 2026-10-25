'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const {loadForge} = require('../../app/tests/harness.cjs');
const root = path.resolve(__dirname, '../..'), html = path.join(root, 'app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = b => crypto.createHash('sha256').update(b).digest('hex'), plain = v => JSON.parse(JSON.stringify(v));
const identity = sha(fs.readFileSync(html)), results = [];
const fresh = () => loadForge(html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
(async () => {
  const dir = path.resolve(process.argv[2]);
  for (const name of fs.readdirSync(dir).filter(n => n.includes("Mike Tyson's Punch-Out"))) {
    const bytes = new Uint8Array(fs.readFileSync(path.join(dir, name))), original = sha(bytes), h = fresh(), s = h.context.Forge.services;
    assert(await s.ProjectGatewayUI.openFile({name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer}));
    await s.ProjectGatewayUI.route('rom-project'); assert(s.InvestigationUI.importProject()); await s.InvestigationUI.whenReady();
    assert(h.get('punchOutContentOpen').onclick()); const before = s.ProjectStore.serialize();
    assert.equal(h.get('punchOutFightMac').children.length, 98);
    assert.equal(h.get('punchOutFightReferee').children.length, 48);
    assert.equal(h.get('punchOutFightState').children.length, 23);
    assert(s.PunchOutFightUI.preview()); assert.equal(s.ProjectStore.serialize(), before, 'Preview must be detached');
    const id = s.PunchOutFightUI.apply(), project = s.ProjectStore.capture();
    const reference = project.scenes.find(sc => sc.id === id);
    assert(reference.raster && reference.oam.length > 40);
    assert.equal(reference.captureMeta.punchOutFight.sourceSha256, original);
    assert.equal(sha(s.NativeResourceProject.build(project).rom), original);
    h.run('undo()', 30000); await s.InvestigationUI.whenReady();
    assert(!s.ProjectStore.capture().scenes.some(sc => sc.id === id));
    h.run('redo()', 30000); await s.InvestigationUI.whenReady();
    assert(s.ProjectStore.capture().scenes.some(sc => sc.id === id));
    const saved = s.ProjectStore.serialize(), reopened = fresh(), t = reopened.context.Forge.services;
    t.ProjectStore.load(saved, {sync: true}); await t.InvestigationUI.whenReady();
    assert.equal(sha(t.NativeResourceProject.build(t.ProjectStore.capture()).rom), original);
    assert.deepEqual(plain(t.ProjectStore.capture().scenes.find(sc => sc.id === id)), plain(reference));
    assert.match(reopened.get('nativeAudioStatus').textContent, /Decoded 84/);
    // All raw banks stay reachable after materializing a banked reference.
    assert(reopened.get('punchOutContentOpen').onclick()); reopened.get('punchOutContentChr').onclick();
    assert.equal(reopened.run('S.scenes[S.activeScene].id'), t.PunchOutArenaRecovery.sceneId);
    assert.equal(reopened.run('S.tab'), 'chr');
    // Existing source Animation tools remain connected.
    reopened.get('punchOutContentFight').value = '2'; reopened.get('punchOutContentFight').onchange();
    reopened.get('punchOutStateSelect').value = '3'; reopened.get('punchOutStateUpdates').value = '120';
    assert(t.PunchOutStatesUI.inspect()); t.PunchOutStatesUI.materialize(); await t.InvestigationUI.whenReady();
    assert.equal(sha(t.NativeResourceProject.build(t.ProjectStore.capture()).rom), original);
    // Native arena paint is still authoritative. New references reflect its
    // current encoded bytes, without taking ownership of the painted Scene.
    assert(t.PunchOutArenaUI.open());
    reopened.run('snapshot();S.selTile=36;S.selPal=0;paintScenePoint(96,152);');
    const edited = t.ProjectStore.capture(), editedRom = t.NativeResourceProject.build(edited).rom;
    assert.notEqual(sha(editedRom), original);
    assert(reopened.get('punchOutContentOpen').onclick()); assert(t.PunchOutFightUI.preview());
    const editedId = t.PunchOutFightUI.apply(), withReference = t.ProjectStore.capture();
    assert.equal(withReference.scenes.find(sc => sc.id === editedId).captureMeta.punchOutFight.nativeOutputSha256, sha(editedRom));
    assert.equal(sha(t.NativeResourceProject.build(withReference).rom), sha(editedRom));
    // Source-state background traces use the same explicit Scene path.
    reopened.get('punchOutFightState').value = '3'; reopened.get('punchOutFightUpdates').value = '120';
    assert(t.PunchOutFightUI.preview('player-state'));
    assert(reopened.get('punchOutFightFrame').children.length > 10);
    reopened.get('punchOutFightFrame').value = '5'; assert(t.PunchOutFightUI.selectFrame());
    const stateId = t.PunchOutFightUI.apply(), stateProject = t.ProjectStore.capture();
    assert.equal(stateProject.scenes.find(sc => sc.id === stateId).captureMeta.punchOutFight.selection.frameIndex, 5);
    assert.equal(sha(t.NativeResourceProject.build(stateProject).rom), sha(editedRom));
    const reread = fresh(), u = reread.context.Forge.services;
    u.ProjectStore.load(t.ProjectStore.serialize(), {sync: true}); await u.InvestigationUI.whenReady();
    assert.equal(sha(u.NativeResourceProject.build(u.ProjectStore.capture()).rom), sha(editedRom));
    assert.match(reread.get('nativeAudioStatus').textContent, /Decoded 84/);
    assert(reread.get('punchOutContentOpen').onclick()); assert(u.PunchOutFightUI.preview());
    // A stale preview cannot commit, and unsupported reference edits remain
    // savable while blocking native build and projection rebasing.
    reread.run('snapshot();S.projectName += " changed";notify("testStaleFightPreview");');
    assert.throws(() => u.PunchOutFightUI.apply(), /project changed/i);
    reread.run('undo()', 30000); await u.InvestigationUI.whenReady();
    const changed = u.ProjectStore.capture(), sc = changed.scenes.find(sc => sc.id === stateId);
    sc.chr[1][0][0] ^= 1;
    assert.doesNotThrow(() => u.ProjectStore.prepareLoad(changed));
    assert.throws(() => u.NativeResourceProject.build(changed), /native encoder/);
    assert.throws(() => u.PunchOutFightRecovery.recover(changed, {mac: 1}), /native encoder/);
    const inspection = u.PunchOutFightRecovery.preview(changed, {mac: 0, referee: 144});
    assert.match(inspection.context.warning, /native build refuses/);
    assert.equal(sha(bytes), original);
    assert.deepEqual(h.errors, []); assert.deepEqual(reopened.errors, []); assert.deepEqual(reread.errors, []);
    results.push({revision: name, passed: true, sharedGateway: true, detachedPreview: true,
      oneUndoRedo: true, saveReopen: true, unchangedNativeOutput: true,
      rawChrNavigationRetained: true, opponentAnimationRecoveryRetained: true,
      arenaEditComposition: true, selectedStateFrameReopen: true, stalePreviewRefusal: true,
      unsupportedEditPreservedAndBuildRefused: true, sourceInspectionWithUnsupportedEdits: true,
      audioEntries: 84});
    console.log(name + ': fight-reference lifecycle, existing arena/state/CHR tools and Audio passed');
  }
  assert.equal(sha(fs.readFileSync(html)), identity);
  fs.writeFileSync(path.join(__dirname, 'Lifecycle_Verification.json'), JSON.stringify({status: 'passed', htmlSha256: identity,
    scope: 'Real UI/service entry paths under the headless DOM harness; no actual browser layout, listening or device acceptance.', results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
