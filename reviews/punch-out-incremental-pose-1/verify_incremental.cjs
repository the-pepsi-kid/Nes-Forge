'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const {loadForge} = require('../../app/tests/harness.cjs');
const Pose = require('../../app/src/re/punch-out-pose.js'), States = require('../../app/src/re/punch-out-states.js');
const root = path.resolve(__dirname, '../..'), html = path.join(root, 'app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fresh = file => loadForge(file || html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
const copy = value => JSON.parse(JSON.stringify(value));

function visibleTranslation(before, after, dx, dy, computedPriority = false) {
  let count = 0, priorityChanges = 0;
  for (let i = 12; i < 256; i += 4) {
    assert.equal(after[i] < 239, before[i] < 239);
    if (before[i] >= 239) continue;
    count++;
    assert.equal(after[i], before[i] + dy);
    assert.equal(after[i + 1], before[i + 1]);
    const attributes = computedPriority ? (before[i + 2] & 223) | (before[i] + dy >= 80 ? 32 : 0) : before[i + 2];
    assert.equal(after[i + 2], attributes);
    if (after[i + 2] !== before[i + 2]) priorityChanges++;
    assert.equal(after[i + 3], (before[i + 3] + dx) & 255);
  }
  assert(count > 0);
  return priorityChanges;
}

function samples(bytes, state, maxUpdates = 240) {
  const updates = [];
  const trace = States.open(bytes).trace(0, state, {maxUpdates,
    onUpdate(s) {updates.push({selector: s.ram[0xA1], state: s.ram[0x90],
      anchor: [s.ram[0xB0], s.ram[0xB1]], oam: s.oam});}});
  return {trace, updates};
}

(async () => {
  const results = [];
  for (let revision = 0; revision < 2; revision++) {
    const name = `Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`;
    const bytes = new Uint8Array(fs.readFileSync(path.join(process.argv[2], name))), original = sha(bytes);
    const model = Pose.open(bytes);
    assert.equal(model.inventory.filter(item => item.kind === 'full').length, 30);
    assert.deepEqual(model.inventory.filter(item => item.kind === 'incremental').map(item => item.selector), [132,192,194,196,198]);
    for (const item of model.inventory) {
      const r = model.record(item.selector), baseline = model.frame(item.selector, 'test', 'test-scene');
      assert.deepEqual(model.encode(bytes, [model.placement(item.selector, baseline, baseline)]), bytes);
      const moved = copy(baseline); moved.pieces.forEach(piece => piece.x++);
      const output = model.encode(bytes, [model.placement(item.selector, moved, baseline)]);
      assert.deepEqual(Array.from(output.keys()).filter(at => output[at] !== bytes[at]), [r.offset]);
      assert.equal(output[r.offset], (r.x + 1) & 255);
    }
    for (const selector of [1,128,130,134,200,202,204]) assert.throws(() => model.record(selector));
    let observedMatches = 0, computedPriorityChanges = 0;
    const stateList = States.open(bytes).states[0].filter(state => state.available);
    const baselines = new Map(stateList.map(state => [state.index, samples(bytes, state.index)]));
    for (const spec of Pose.incrementalPositions) {
      const r = model.record(spec.selector), edited = model.encode(bytes, [{selector: spec.selector, x: r.x + 2, y: r.y + 1}]);
      for (const state of stateList) {
        const before = baselines.get(state.index);
        if (!before.updates.some(sample => sample.selector === spec.selector)) continue;
        const after = samples(edited, state.index);
        assert.equal(after.trace.status, before.trace.status); assert.equal(after.trace.stop, before.trace.stop);
        assert.deepEqual(after.trace.commands, before.trace.commands); assert.deepEqual(after.trace.audioEvents, before.trace.audioEvents);
        assert.equal(after.updates.length, before.updates.length);
        before.updates.forEach((a, i) => {
          const b = after.updates[i]; assert.equal(b.selector, a.selector); assert.equal(b.state, a.state); assert.deepEqual(b.anchor, a.anchor);
          if (a.selector === spec.selector) {
            try {computedPriorityChanges += visibleTranslation(a.oam, b.oam, 2, 1, spec.selector >= 192);} catch (error) {
              throw Error(`Revision ${revision}, selector $${spec.selector.toString(16)}, state ${state.index}, update ${i}: ${error.message}`);
            }
            observedMatches++;
          }
        });
      }
    }
    const idleBytes = model.encode(bytes, Pose.idleSelectors.map(selector => {
      const r = model.record(selector); return {selector, x: r.x + 2, y: r.y};
    }));
    const beforeIdle = samples(bytes, 1), afterIdle = samples(idleBytes, 1);
    assert.equal(afterIdle.updates.length, 240); assert.equal(afterIdle.trace.frames.length, beforeIdle.trace.frames.length);
    assert.deepEqual(afterIdle.trace.frames.map(f => [f.selector,f.update,f.duration]), beforeIdle.trace.frames.map(f => [f.selector,f.update,f.duration]));
    beforeIdle.updates.forEach((a, i) => visibleTranslation(a.oam, afterIdle.updates[i].oam, 2, 0));
    const c0 = model.record(0xC0), base = model.frame(0xC0, 'priority-test', 'priority-source');
    const vertical = model.moveFrame(0xC0, base, c0.x, c0.y - 6);
    assert(vertical.pieces.some((piece, i) => piece.behind !== base.pieces[i].behind));
    assert.equal(model.placement(0xC0, vertical, base).dy, -6);
    assert.doesNotThrow(() => model.encode(bytes, [model.placement(0xC0, vertical, base)]));

    const h = fresh(), s = h.context.Forge.services;
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
    assert.equal(h.get('punchOutPoseChoice').children.length, 35);
    const id = s.PunchOutPoseUI.open(0xC0), opened = s.ProjectStore.serialize();
    assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom), original);
    assert.equal(h.get('punchOutPoseIdleLabel').hidden, false);
    h.get('punchOutPoseIdleGroup').checked = true;
    h.get('punchOutPoseX').value = '-128';
    assert.equal(h.get('punchOutPoseApply').onclick(), false); assert.equal(s.ProjectStore.serialize(), opened);
    h.get('punchOutPoseX').value = '-12';
    assert.equal(h.get('punchOutPoseApply').onclick(), true, h.get('punchOutPoseStatus').textContent);
    const built = s.NativeResourceProject.build(s.ProjectStore.capture());
    assert.deepEqual(Array.from(built.metadata.changes, value => value.offset), [490,497,504]);
    assert.equal(sha(s.RuntimeCompiler.compile().rom), sha(built.rom));
    assert.equal(sha(built.rom), sha(idleBytes));
    assert.equal(s.ProjectStore.capture().metasprites.filter(frame => Pose.idleSelectors.some(selector => frame.id === s.PunchOutPoseProject.frameId(selector))).length, 3);
    h.run('undo()', 30000); await s.InvestigationUI.whenReady(); assert.equal(s.ProjectStore.serialize(), opened);
    h.run('redo()', 30000); await s.InvestigationUI.whenReady(); assert.equal(sha(s.NativeResourceProject.build(s.ProjectStore.capture()).rom), sha(built.rom));
    const saved = s.ProjectStore.serialize(), reopened = fresh(), t = reopened.context.Forge.services;
    t.ProjectStore.load(saved, {sync: true}); await t.InvestigationUI.whenReady();
    assert.equal(sha(t.NativeResourceProject.build(t.ProjectStore.capture()).rom), sha(built.rom));
    assert.equal(t.PunchOutPoseProject.describe(t.ProjectStore.capture(), id).x, -12);
    assert.match(reopened.get('nativeAudioStatus').textContent, /Decoded 84/);
    const derived = await t.NativeResourceProject.create(built.rom, 'Native idle derivative');
    assert.equal(sha(t.NativeResourceProject.build(derived).rom), sha(built.rom));
    assert.equal(t.PunchOutPoseProject.describe(t.PunchOutPoseProject.prepare(derived, 0xC0).project, id).x, -12);
    for (const mutate of [p => p.metasprites.find(frame => frame.id === id).pieces[0].x++,
      p => p.metasprites.find(frame => frame.id === id).pieces[0].tile ^= 1,
      p => p.metasprites.find(frame => frame.id === id).pieces[0].flipH = true,
      p => p.metasprites.find(frame => frame.id === id).pieces[0].behind = !p.metasprites.find(frame => frame.id === id).pieces[0].behind]) {
      const unsupported = t.ProjectStore.capture(); mutate(unsupported);
      assert.doesNotThrow(() => t.ProjectStore.prepareLoad(unsupported));
      assert.throws(() => t.NativeResourceProject.build(unsupported));
      assert.throws(() => t.PunchOutPoseProject.moveIdle(unsupported, id, -10, -97));
    }
    for (const offset of [140,142,478,489,496,503,510,100,0x1D053]) {
      const tampered = built.rom.slice(); tampered[offset] ^= 1; assert.equal(t.NativeResourceProject.recognizes(tampered), null);
    }
    const fullId = t.PunchOutPoseUI.open(0);
    t.ProjectStore.load(t.PunchOutPoseProject.move(t.ProjectStore.capture(), fullId, -15, -96), {sync: true});
    t.PunchOutArtUI.open('chr', 0); reopened.run('snapshot();S.chr[1][0][0]^=1;notify("incrementalCompositionChr")');
    t.PunchOutArtUI.open('palette', 0); reopened.run('snapshot();S.pal[0][1]=33;notify("incrementalCompositionPalette")');
    assert(t.PunchOutArenaUI.open()); reopened.run('snapshot();S.selTile=36;S.selPal=0;paintScenePoint(96,152);');
    const composed = t.NativeResourceProject.build(t.ProjectStore.capture()).rom;
    assert.equal(composed[156], 241); assert.equal(composed[490], 244); assert.equal(composed[497], 242); assert.equal(composed[504], 243);
    assert.equal(composed[4807], 33); assert.notEqual(composed[0x20020], bytes[0x20020]);
    assert.equal(sha(t.NativeResourceProject.build(await t.NativeResourceProject.create(composed, 'Composed idle derivative')).rom), sha(composed));
    for (const [a,b] of [[0xC010,0xE010],[0x10010,0x12010],[0x1A010,0x20010]]) assert.deepEqual(composed.slice(a,b), bytes.slice(a,b));
    let previousReader = false;
    if (process.argv[3]) {
      const old = fresh(process.argv[3]), u = old.context.Forge.services;
      u.ProjectStore.load(saved, {sync: true}); await u.InvestigationUI.whenReady();
      assert.equal(JSON.stringify(u.ProjectStore.capture().metasprites.find(frame => frame.id === id)), JSON.stringify(s.ProjectStore.capture().metasprites.find(frame => frame.id === id)));
      assert.throws(() => u.NativeResourceProject.build(u.ProjectStore.capture())); previousReader = true;
    }
    assert.equal(sha(bytes), original); assert.deepEqual(h.errors, []); assert.deepEqual(reopened.errors, []);
    results.push({revision: name, passed: true, fullPosesRoundtrippedAndMoved: 30, incrementalPosesRoundtrippedAndMoved: 5,
      observedNativeUpdatesChecked: observedMatches, nativeComputedPriorityChangesChecked: computedPriorityChanges,
      nativePriorityDividerOamY: 80, idleUpdatesWithOriginalBobbingAndTiming: 240,
      groupedIdleOffsets: [490,497,504], groupUndoRedoAndAtomicRefusal: true, saveReopenAndReimport: true,
      fullPoseArtPaletteArenaComposition: true, protectedFlagsPointersCodeRejected: true,
      unsupportedEditsPreservedAndRefused: true, previousReaderPreservesAndRefuses: previousReader, audioEntries: 84});
    console.log('PASS incremental positions and grouped idle lifecycle ' + name);
  }
  fs.writeFileSync(path.join(__dirname, 'Incremental_Verification.json'), JSON.stringify({status: 'passed',
    htmlSha256: sha(fs.readFileSync(html)), scope: 'Original bounded state/shape execution plus actual project/UI/native-build lifecycle; live original-engine playback and DOM controls are separate.', results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
