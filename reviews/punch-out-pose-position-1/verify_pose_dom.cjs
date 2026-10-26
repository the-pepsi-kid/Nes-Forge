'use strict';
// A parsed DOM enforces real ancestry and creates no fabricated controls.
// Pointer geometry/canvas pixels and physical browser acceptance are separate.
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const {load} = require('./dom-runtime.cjs');
const html = path.resolve(__dirname, '../../app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const h = load(html), w = h.window, d = h.document, s = w.Forge.services;
  try {
    const get = id => {const node = d.getElementById(id); assert(node?.isConnected, id + ' must be mounted'); return node;};
    const bytes = w.Uint8Array.from(fs.readFileSync(path.join(process.argv[2], "Mike Tyson's Punch-Out!! (U) (PRG 0).nes")));
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, 'Native pose DOM verification'), {sync: true});
    await s.InvestigationUI.whenReady();
    get('nf-skin-toggle').click(); assert(d.body.classList.contains('nf-retro'));
    get('punchOutContentOpen').click(); assert.equal(get('punchOutContentPanel').hidden, false);
    assert.equal(Array.from(get('punchOutPoseChoice').options).filter(option => Number(option.value) < 128).length, 30);
    get('punchOutPoseChoice').value = '0'; get('punchOutPoseOpen').click();
    assert.equal(get('punchOutPoseControls').hidden, false); assert.equal(w.eval('S.tab'), 'metasprites');
    assert.equal(get('punchOutPoseX').value, '-16'); assert.equal(get('punchOutPoseY').value, '-96');
    const unchanged = s.ProjectStore.serialize();
    get('punchOutPoseX').value = '-14'; get('punchOutPoseY').value = '-95'; get('punchOutPoseApply').click();
    assert.match(get('punchOutPoseStatus').textContent, /movement 2, 1/);
    const built = s.RuntimeCompiler.compile().rom;
    assert.equal(built[156], 242); assert.equal(built[157], 161);
    get('punchOutPoseCheck').click(); assert.match(get('punchOutPoseStatus').textContent, /2 total native byte/);
    w.undo(); await s.InvestigationUI.whenReady(); assert.equal(s.ProjectStore.serialize(), unchanged);
    w.redo(); await s.InvestigationUI.whenReady(); assert.equal(sha(s.RuntimeCompiler.compile().rom), sha(built));
    const saved = s.ProjectStore.serialize(); s.ProjectStore.load(saved, {sync: true}); await s.InvestigationUI.whenReady();
    get('punchOutPoseOpen').click(); assert.equal(get('punchOutPoseX').value, '-14'); assert.equal(get('punchOutPoseY').value, '-95');
    get('punchOutPoseX').value = '128'; get('punchOutPoseApply').click();
    assert.match(get('punchOutPoseStatus').textContent, /-128 through 127/); assert.equal(sha(s.RuntimeCompiler.compile().rom), sha(built));
    assert.deepEqual(h.errors, []); assert.deepEqual(h.consoleErrors, []); assert.deepEqual(h.domErrors, []);
    fs.writeFileSync(path.join(__dirname, 'Pose_DOM_Verification.json'), JSON.stringify({status: 'passed', htmlSha256: sha(fs.readFileSync(html)),
      scope: 'Full parsed DOM plus actual click/input controls; canvas/animation frames stubbed; not layout/device/listening acceptance.',
      entryAndComposerControlsMounted: true, retroAppearanceRetained: true, thirtyNativePoseChoices: true,
      nativePoseOffsetControls: true, originalBuildDispatch: true, undoRedo: true, saveReopen: true,
      invalidOffsetRefusesWithoutMutation: true, noUncaughtStartupOrInteractionErrors: true}, null, 2) + '\n');
    console.log('PASS strict parsed-DOM native pose editing and existing workstation startup');
  } finally {h.dom.window.close();}
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
