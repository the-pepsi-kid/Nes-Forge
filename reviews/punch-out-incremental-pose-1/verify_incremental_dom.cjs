'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const {load} = require('../punch-out-pose-position-1/dom-runtime.cjs');
const html = path.resolve(__dirname, '../../app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const h = load(html), w = h.window, d = h.document, s = w.Forge.services;
  const get = id => {const node = d.getElementById(id); assert(node, id); return node;};
  try {
    const bytes = w.Uint8Array.from(fs.readFileSync(path.join(process.argv[2], "Mike Tyson's Punch-Out!! (U) (PRG 0).nes")));
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, 'Incremental pose DOM check'), {sync: true});
    await s.InvestigationUI.whenReady();
    get('nf-skin-toggle').click(); assert(d.body.classList.contains('nf-retro'));
    get('punchOutContentOpen').click();
    const options = Array.from(get('punchOutPoseChoice').options);
    assert.equal(options.length, 35); assert.equal(options.filter(option => Number(option.value) < 128).length, 30);
    assert.deepEqual(options.filter(option => Number(option.value) >= 128).map(option => Number(option.value)), [132,192,194,196,198]);
    get('punchOutPoseChoice').value = '192'; get('punchOutPoseOpen').click();
    assert.equal(get('punchOutPoseControls').hidden, false); assert.equal(get('punchOutPoseIdleLabel').hidden, false);
    assert.equal(w.eval('S.tab'), 'metasprites'); assert.equal(get('punchOutPoseX').value, '-14');
    assert.match(get('punchOutPoseStatus').textContent, /observed state \$01/);
    const opened = s.ProjectStore.serialize();
    get('punchOutPoseIdleGroup').click(); assert.equal(get('punchOutPoseIdleGroup').checked, true);
    get('punchOutPoseX').value = '-128'; get('punchOutPoseApply').click();
    assert.match(get('punchOutPoseStatus').textContent, /-128 through 127/);
    assert.equal(s.ProjectStore.serialize(), opened);
    get('punchOutPoseX').value = '-12'; get('punchOutPoseApply').click();
    assert.match(get('punchOutPoseStatus').textContent, /movement 2, 0/);
    const built = s.RuntimeCompiler.compile().rom;
    assert.equal(built[490], 244); assert.equal(built[497], 242); assert.equal(built[504], 243);
    get('punchOutPoseCheck').click(); assert.match(get('punchOutPoseStatus').textContent, /3 total native byte/);
    w.undo(); await s.InvestigationUI.whenReady(); assert.equal(s.ProjectStore.serialize(), opened);
    w.redo(); await s.InvestigationUI.whenReady(); assert.equal(sha(s.RuntimeCompiler.compile().rom), sha(built));
    get('punchOutPoseOpen').click();
    get('punchOutPoseIdleGroup').click(); assert.equal(get('punchOutPoseIdleGroup').checked, false);
    const beforePriority = s.ProjectStore.capture().metasprites.find(frame => frame.id === s.PunchOutPoseProject.frameId(192));
    get('punchOutPoseY').value = '-103'; get('punchOutPoseApply').click();
    const afterPriority = s.ProjectStore.capture().metasprites.find(frame => frame.id === beforePriority.id);
    assert(afterPriority.pieces.some((piece, i) => piece.behind !== beforePriority.pieces[i].behind));
    assert.equal(s.RuntimeCompiler.compile().rom[491], 153);
    const saved = s.ProjectStore.serialize(); s.ProjectStore.load(saved, {sync: true}); await s.InvestigationUI.whenReady();
    get('punchOutPoseOpen').click(); assert.equal(get('punchOutPoseX').value, '-12'); assert.equal(get('punchOutPoseY').value, '-103');
    get('punchOutPoseChoice').value = '132'; get('punchOutPoseOpen').click(); assert.equal(get('punchOutPoseIdleLabel').hidden, true);
    get('punchOutPoseChoice').value = '0'; get('punchOutPoseOpen').click(); assert.equal(get('punchOutPoseIdleLabel').hidden, true);
    assert.deepEqual(h.errors, []); assert.deepEqual(h.consoleErrors, []); assert.deepEqual(h.domErrors, []);
    fs.writeFileSync(path.join(__dirname, 'Incremental_DOM_Verification.json'), JSON.stringify({status: 'passed',
      htmlSha256: sha(fs.readFileSync(html)), scope: 'Full parsed DOM and actual click/input controls; canvas/timers stubbed, no browser layout/device acceptance.',
      fullPosesRetained: 30, explicitIncrementalChoices: 5, idleGroupControl: true, atomicInvalidBatchRefusal: true,
      exactThreeByteIdleChange: true, oneUndoRedo: true, nativePriorityPreview: true, saveReopen: true,
      retroStartupRetained: true, noUncaughtStartupOrInteractionErrors: true}, null, 2) + '\n');
    console.log('PASS parsed-DOM incremental/idle controls and native priority preview');
  } finally {h.dom.window.close();}
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
