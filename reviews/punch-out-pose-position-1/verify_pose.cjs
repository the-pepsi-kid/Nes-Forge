'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const {loadForge} = require('../../app/tests/harness.cjs'), Pose = require('../../app/src/re/punch-out-pose.js');
const root = path.resolve(__dirname, '../..'), html = path.join(root, 'app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), copy = value => JSON.parse(JSON.stringify(value));
const fresh = file => loadForge(file || html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
(async () => {
  const results = [];
  for (let revision = 0; revision < 2; revision++) {
    const name = `Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`, bytes = new Uint8Array(fs.readFileSync(path.join(process.argv[2], name))), original = sha(bytes);
    const codec = Pose.open(bytes);
    for (const item of codec.inventory) {
      const r = codec.record(item.selector), baseline = codec.frame(item.selector, 'test', 'test-scene');
      const position = codec.placement(item.selector, baseline, baseline);
      assert.deepEqual(codec.encode(bytes, [position]), bytes);
      const moved = copy(baseline); moved.pieces.forEach(piece => piece.x++);
      const edit = codec.placement(item.selector, moved, baseline), output = codec.encode(bytes, [edit]);
      assert.equal(output[r.offset], (r.x + 1) & 255);
      assert.deepEqual(output.slice(r.offset + 1), bytes.slice(r.offset + 1));
      assert.deepEqual(output.slice(0, r.offset), bytes.slice(0, r.offset));
    }
    assert.throws(() => codec.record(1)); assert.throws(() => codec.record(128));
    const baseline = codec.frame(0, 'test', 'test-scene'), broken = copy(baseline);
    broken.pieces[0].x++; assert.throws(() => codec.placement(0, broken, baseline), /complete pose/);
    const origin = copy(baseline); origin.originX = -2;
    assert.equal(codec.placement(0, origin, baseline).dx, 2);
    assert.throws(() => codec.encode(bytes, [{selector: 0, x: 128, y: 0}]));
    assert.throws(() => codec.encode(bytes, [{selector: 0, x: -16, y: -96}, {selector: 0, x: -16, y: -96}]));
    const h = fresh(), s = h.context.Forge.services;
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
    const before = s.ProjectStore.serialize(), id = s.PunchOutPoseUI.open(0);
    assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom), original);
    assert.equal(h.run('S.tab'), 'metasprites'); assert.equal(h.get('punchOutPoseControls').hidden, false);
    h.run('undo()', 30000); await s.InvestigationUI.whenReady(); assert.equal(s.ProjectStore.serialize(), before);
    h.run('redo()', 30000); await s.InvestigationUI.whenReady(); assert(s.ProjectStore.capture().metasprites.some(frame => frame.id === id));
    // Composer selection is browsing state, not history data. Re-select the
    // restored frame through its normal native shortcut after undoing its creation.
    s.PunchOutPoseUI.open(0);
    h.get('punchOutPoseX').value = '-14'; h.get('punchOutPoseY').value = '-95';
    assert.equal(h.get('punchOutPoseApply').onclick(), true, h.get('punchOutPoseStatus').textContent);
    let built = s.NativeResourceProject.build(s.ProjectStore.capture()); assert.deepEqual(Array.from(built.metadata.changes, change => change.offset), [156,157]);
    assert.equal(sha(s.RuntimeCompiler.compile().rom), sha(built.rom));
    h.run('undo()', 30000); await s.InvestigationUI.whenReady(); assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom), original);
    h.run('redo()', 30000); await s.InvestigationUI.whenReady(); assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom), sha(built.rom));
    const saved = s.ProjectStore.serialize(), reopened = fresh(), t = reopened.context.Forge.services;
    t.ProjectStore.load(saved, {sync: true}); await t.InvestigationUI.whenReady();
    assert.equal(sha(t.NativeResourceProject.build(t.ProjectStore.capture()).rom), sha(built.rom));
    assert.match(reopened.get('nativeAudioStatus').textContent, /Decoded 84/);
    assert.equal(t.NativeResourceProject.recognizes(built.rom).id, t.ProjectStore.capture().nativeGame.adapter);
    const reimported = await t.NativeResourceProject.create(built.rom, 'Reimported native pose');
    assert.equal(sha(t.NativeResourceProject.build(reimported).rom), sha(built.rom));
    const again = t.PunchOutPoseProject.prepare(reimported, 0);
    assert.equal(t.PunchOutPoseProject.describe(again.project, id).x, -14); assert.equal(t.PunchOutPoseProject.describe(again.project, id).y, -95);
    assert.equal(sha(t.NativeResourceProject.build(again.project).rom), sha(built.rom));
    for (const mutate of [p => p.metasprites.find(frame => frame.id === id).pieces[0].x++,
      p => p.metasprites.find(frame => frame.id === id).pieces[0].tile ^= 1,
      p => p.metasprites.find(frame => frame.id === id).pieces[0].flipH = true,
      p => p.metasprites.find(frame => frame.id === id).pieces.pop(),
      p => p.metasprites.find(frame => frame.id === id).sceneId = p.scenes[0].id]) {
      const unsupported = t.ProjectStore.capture(); mutate(unsupported);
      assert.doesNotThrow(() => t.ProjectStore.prepareLoad(unsupported));
      assert.throws(() => t.NativeResourceProject.build(unsupported));
      assert.throws(() => t.PunchOutPoseProject.prepare(unsupported, 2));
    }
    const invalid = t.ProjectStore.capture(); invalid.scenes.find(scene => scene.id === t.PunchOutPoseProject.sceneId(0)).captureMeta.punchOutPose.sourceSha256 = '0'.repeat(64);
    assert.throws(() => t.NativeResourceProject.build(invalid), /ownership/);
    const snapshot = t.ProjectStore.capture(); snapshot.metasprites.find(frame => frame.id === 'po-pose-f0-s0').pieces[0].x++;
    assert.throws(() => t.NativeResourceProject.build(snapshot), /native encoder/);
    const badPointer = built.rom.slice(); badPointer[158] ^= 1; assert.equal(t.NativeResourceProject.recognizes(badPointer), null);
    const protectedByte = built.rom.slice(); protectedByte[100] ^= 1; assert.equal(t.NativeResourceProject.recognizes(protectedByte), null);
    // Physical art and arena writers compose with the pose's disjoint two bytes.
    t.PunchOutArtUI.open('chr', 0); reopened.run('snapshot();S.chr[1][0][0]^=1;notify("poseChrComposition")');
    t.PunchOutArtUI.open('palette', 0); reopened.run('snapshot();S.pal[0][1]=33;notify("posePaletteComposition")');
    assert(t.PunchOutArenaUI.open()); reopened.run('snapshot();S.selTile=36;S.selPal=0;paintScenePoint(96,152);');
    const composed = t.NativeResourceProject.build(t.ProjectStore.capture()).rom;
    assert.equal(composed[156], 242); assert.equal(composed[157], 161); assert.equal(composed[4807], 33);
    assert.notEqual(composed[0x20020], bytes[0x20020]); assert(t.NativeResourceProject.recognizes(composed));
    assert.equal(sha(t.NativeResourceProject.build(await t.NativeResourceProject.create(composed, 'Composed derivative')).rom), sha(composed));
    for (const [a,b] of [[0xc010,0xe010],[0x10010,0x12010],[0x1a010,0x20010]]) assert.deepEqual(composed.slice(a,b), bytes.slice(a,b));
    let priorReader;
    if (process.argv[3]) {
      const old = fresh(process.argv[3]), oldServices = old.context.Forge.services;
      oldServices.ProjectStore.load(saved, {sync: true}); await oldServices.InvestigationUI.whenReady();
      assert.equal(JSON.stringify(oldServices.ProjectStore.capture().metasprites.find(frame => frame.id === id)), JSON.stringify(s.ProjectStore.capture().metasprites.find(frame => frame.id === id)));
      assert.throws(() => oldServices.NativeResourceProject.build(oldServices.ProjectStore.capture()), /native encoder/); priorReader = true;
    }
    assert.equal(sha(bytes), original); assert.deepEqual(h.errors, []); assert.deepEqual(reopened.errors, []);
    results.push({revision: name, passed: true, posesRoundtrippedAndMoved: 30, unchangedOutput: true, originalShapeReaderChecks: true,
      exactTwoBytePositionEdit: true, ordinaryMetaspriteAndHistory: true, saveReopen: true, nativeBuildDispatch: true,
      derivativeReimport: true, unownedEditsPreservedAndRefused: true, protectedPointersRejected: true,
      artPaletteArenaComposition: true, priorReaderPreservesAndRefuses: priorReader, audioEntries: 84});
    console.log('PASS native pose codec/lifecycle ' + name);
  }
  fs.writeFileSync(path.join(__dirname, 'Pose_Verification.json'), JSON.stringify({status: 'passed', htmlSha256: sha(fs.readFileSync(html)), results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
