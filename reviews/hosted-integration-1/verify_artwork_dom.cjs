'use strict';
// Exercise the reported navigation through the parsed delivered HTML. Real
// clicks select both buffers and paint pixels; only layout/canvas/timers stub.
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const {load} = require('../punch-out-pose-position-1/dom-runtime.cjs');
const html = path.resolve(process.env.FORGE_REVIEW_HTML||path.join(__dirname, '../../app/mainline/NES_Forge_2.0.0-alpha.11.html'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const results = [];
  for (let revision = 0; revision < 2; revision++) {
    const h = load(html), w = h.window, d = h.document, s = w.Forge.services;
    w.ImageData = class {constructor(data, width, height) {this.data = data; this.width = width; this.height = height;}};
    const get = id => {const node = d.getElementById(id); assert(node?.isConnected, id); return node;};
    const tab = name => d.querySelector('[data-view="' + name + '"]').click();
    const build = () => s.RuntimeCompiler.compile().rom;
    const activeScene = () => s.ProjectStore.capture().scenes[w.eval('S.activeScene')];
    try {
      const blank = s.ProjectStore.serialize(), starter = sha(build());
      const name = `Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`;
      const bytes = w.Uint8Array.from(fs.readFileSync(path.join(process.argv[2], name)));
      s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true});
      await s.InvestigationUI.whenReady();
      get('nf-skin-toggle').click(); assert(d.body.classList.contains('nf-retro'));
      get('punchOutContentOpen').click();
      assert(get('punchOutPosePanel').open);
      assert(get('punchOutPosePanel').compareDocumentPosition(get('punchOutContentPreview')) & w.Node.DOCUMENT_POSITION_FOLLOWING);
      get('punchOutPoseChoice').value = '192'; get('punchOutPoseOpen').click();
      const frameId = s.PunchOutPoseProject.frameId(192), poseSceneId = activeScene().id;
      assert.equal(w.eval('S.chrBank'), 'spr'); assert.equal(w.eval('S.tab'), 'metasprites');
      const originalTiles = JSON.stringify(activeScene().sprChr);
      assert(activeScene().sprChr.flat(2).some(Boolean)); assert(activeScene().chr.flat(2).every(v => v === 0));
      const initialCount = s.ProjectStore.capture().scenes.length;
      tab('chr');
      assert.equal(get('punchOutChrContext').hidden, false);
      assert.equal(get('punchOutChrContext').nextElementSibling, get('cv'));
      assert.match(get('punchOutChrInfo').textContent, /Sprite Bank \(\$1000\)/);
      assert.equal(w.eval('S.chrBank'), 'spr'); assert.equal(sha(build()), sha(bytes));
      get('bankBg').click(); assert.equal(w.eval('S.chrBank'), 'bg');
      assert.match(get('punchOutChrInfo').textContent, /Background bank selected/);
      const savedWithBg = s.ProjectStore.serialize();
      s.ProjectStore.load(savedWithBg, {sync: true}); await s.InvestigationUI.whenReady();
      assert.equal(w.eval('S.chrBank'), 'spr'); // Reopening the same Scene is a fresh entry.
      get('bankBg').click(); assert.equal(w.eval('S.chrBank'), 'bg');
      get('punchOutChrTiles').click(); assert.equal(w.eval('S.chrBank'), 'spr');
      assert.equal(s.ProjectStore.capture().scenes.length, initialCount);
      tab('metasprites'); assert(get('punchOutChrContext').hidden);
      assert.equal(get('leftP').classList.contains('punch-out-chr-context'), false);
      w.setChrBank('bg'); get('punchOutPoseTiles').click(); assert.equal(w.eval('S.chrBank'), 'spr');
      get('punchOutChrArtwork').click();
      assert.equal(activeScene().id, s.PunchOutArtProject.sceneId('chr', 29), get('punchOutChrInfo').textContent);
      assert.equal(w.eval('S.chrBank'), 'bg'); assert(get('bankBg').classList.contains('on'));
      assert(activeScene().chr.flat(2).some(Boolean)); assert.match(get('punchOutChrInfo').textContent, /physical CHR bank 29/);
      assert.equal(sha(build()), sha(bytes)); assert.equal(s.ProjectStore.capture().scenes.length, initialCount + 1);
      // Select a tile using the actual sheet mouse handler, then paint its first
      // pixel with the ordinary palette-index controls and pixel canvas handler.
      const tile = s.ProjectStore.capture().metasprites.find(frame => frame.id === frameId).pieces[0].tile;
      const sheet = get('cv'); sheet.getBoundingClientRect = () => ({left: 0, top: 0, width: 384, height: 384});
      sheet.dispatchEvent(new w.MouseEvent('mousedown', {bubbles: true, button: 0,
        clientX: (tile % 16) * 24 + 4, clientY: Math.floor(tile / 16) * 24 + 4}));
      assert.equal(w.eval('S.editTile'), tile);
      const beforePixel = activeScene().chr[tile][0][0], color = (beforePixel + 1) % 4;
      get('pixColorSel').children[color].click();
      const pixels = get('chrEditCanvas'); pixels.getBoundingClientRect = () => ({left: 0, top: 0, width: 128, height: 128});
      pixels.dispatchEvent(new w.MouseEvent('mousedown', {bubbles: true, button: 0, clientX: 8, clientY: 8}));
      d.dispatchEvent(new w.MouseEvent('mouseup', {bubbles: true, button: 0}));
      assert.equal(activeScene().chr[tile][0][0], color);
      const edited = build(), bankOffset = w.PunchOutArt.open(bytes).bank(29).offset;
      const changed = Array.from(edited.keys()).filter(i => edited[i] !== bytes[i]);
      assert(changed.length > 0 && changed.length <= 2);
      for (const offset of changed) assert([bankOffset + tile * 16, bankOffset + tile * 16 + 8].includes(offset));
      w.undo(); await s.InvestigationUI.whenReady(); assert.equal(sha(build()), sha(bytes));
      w.redo(); await s.InvestigationUI.whenReady(); assert.equal(sha(build()), sha(edited));
      s.ProjectStore.load(s.ProjectStore.serialize(), {sync: true}); await s.InvestigationUI.whenReady();
      assert.equal(sha(build()), sha(edited)); assert.equal(w.eval('S.chrBank'), 'bg');
      get('punchOutChrPose').click();
      assert.equal(activeScene().id, poseSceneId); assert.equal(w.eval('S.tab'), 'metasprites');
      assert.equal(JSON.stringify(activeScene().sprChr), originalTiles); // Original snapshot was not re-signed.
      get('punchOutPoseIdleGroup').click(); get('punchOutPoseX').value = '-12'; get('punchOutPoseApply').click();
      const composed = build();
      assert.equal(composed[490], 244); assert.equal(composed[497], 242); assert.equal(composed[504], 243);
      for (const offset of changed) assert.equal(composed[offset], edited[offset]);
      get('punchOutPoseArtwork').click(); assert.equal(w.eval('S.chrBank'), 'bg');
      assert.equal(activeScene().chr[tile][0][0], color); assert.equal(sha(build()), sha(composed));
      get('punchOutChrPose').click(); get('punchOutPoseTiles').click();
      const sourcePixel = activeScene().sprChr[w.eval('S.editTile')][0][0];
      get('pixColorSel').children[(sourcePixel + 1) % 4].click();
      pixels.dispatchEvent(new w.MouseEvent('mousedown', {bubbles: true, button: 0, clientX: 8, clientY: 8}));
      d.dispatchEvent(new w.MouseEvent('mouseup', {bubbles: true}));
      assert.throws(build); const unsupported = s.ProjectStore.serialize();
      get('punchOutChrArtwork').click(); assert.equal(s.ProjectStore.serialize(), unsupported);
      w.undo(); await s.InvestigationUI.whenReady(); assert.equal(sha(build()), sha(composed));
      s.ProjectStore.load(blank, {sync: true}); await s.InvestigationUI.whenReady();
      tab('chr'); w.setChrBank('spr'); tab('scene'); tab('chr');
      assert.equal(w.eval('S.chrBank'), 'spr'); assert(get('punchOutChrContext').hidden);
      assert.equal(sha(build()), starter);
      assert.deepEqual(h.errors, []); assert.deepEqual(h.consoleErrors, []); assert.deepEqual(h.domErrors, []);
      results.push({revision, status: 'passed', nativePickerAboveReferencePreview: true,
        correctSpriteBufferOnPoseEntry: true, explicitBankToggleRetained: true, nativeArtworkOpensBgBuffer: true,
        noOpBuildUnchanged: true, actualPixelClickNativeOffsets: changed, pixelUndoRedoAndSaveReopen: true,
        referenceSnapshotsPreserved: true, idleAndArtComposition: true, unsupportedReferenceEditsRefuseWithoutRebase: true,
        unrelatedAuthoringProjectUnchanged: true, retroAndStartupRetained: true});
      console.log('PASS artwork navigation PRG ' + revision);
    } finally {h.dom.window.close();}
  }
  fs.writeFileSync(path.join(__dirname, 'Navigation_DOM_Verification.json'), JSON.stringify({status: 'passed',
    htmlSha256: sha(fs.readFileSync(html)), scope: 'Parsed delivered HTML with actual buttons and pixel mouse events. Canvas/layout/timers stubbed; no device or hardware acceptance.', results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
