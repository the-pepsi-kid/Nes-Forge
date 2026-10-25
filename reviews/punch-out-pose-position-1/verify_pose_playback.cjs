'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const {loadForge} = require('../../app/tests/harness.cjs');
const html = path.resolve(__dirname, '../../app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fresh = () => loadForge(html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
async function play(bytes, name) {
  const h = fresh(), s = h.context.Forge.services, samples = new Map();
  s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
  const saved = s.ProjectStore.serialize();
  let last = -1;
  const off = s.EmulatorTimeline.subscribe(() => {
    const frame = h.run('emu.frameCount');
    if (frame === last || frame < 600) return;
    last = frame;
    const sample = h.run('(()=>{const r=emu.ram;return {frame:emu.frameCount,round:r[6],phase:r[0],mac:r[0x50],opponent:r[0x90],anchorX:r[0xb0],anchorY:r[0xb1],selector:r[0xa1],slots:Array.from(emu.oamMem.slice(12,256)),pixels:emu.frameBuffer.slice()};})()');
    if (sample.round === 1) {
      const pixels = sha(sample.pixels); sample.pixels = pixels;
      samples.set(sample.frame, JSON.parse(JSON.stringify(sample)));
    }
  });
  const result = await s.PunchOutReplay.run('sequence'); off();
  assert.equal(result.status, 'completed', result.stop); assert.equal(result.seeds.length, 0);
  assert.equal(s.ProjectStore.serialize(), saved); assert(result.audio.writes > 0); assert.deepEqual(h.errors, []);
  return {result, samples, audioEntries: /Decoded 84/.test(h.get('nativeAudioStatus').textContent)};
}
(async () => {
  const results = [];
  for (let revision = 0; revision < 2; revision++) {
    const name = `Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`, bytes = new Uint8Array(fs.readFileSync(path.join(process.argv[2], name)));
    const h = fresh(), s = h.context.Forge.services;
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
    const id = s.PunchOutPoseUI.open(0), next = s.PunchOutPoseProject.move(s.ProjectStore.capture(), id, -14, -96);
    const built = s.NativeResourceProject.build(next); assert.equal(built.metadata.changes.length, 1); assert.equal(built.metadata.changes[0].offset, 156);
    console.log('Running original engine baseline ' + name); const before = await play(bytes, 'Original ' + name);
    console.log('Running exported/reimported pose edit ' + name); const after = await play(built.rom, 'Pose derivative ' + name);
    const ready = before.result.milestones.find(m => m.name === 'fight-ready').frame;
    assert.equal(after.result.milestones.find(m => m.name === 'fight-ready').frame, ready);
    const matches = [];
    for (const [frame, a] of before.samples) {
      const b = after.samples.get(frame); if (!b) continue;
      assert.equal(b.anchorX, a.anchorX); assert.equal(b.anchorY, a.anchorY);
      assert.equal(b.mac, a.mac); assert.equal(b.opponent, a.opponent);
      let moved = 0, unexpected = 0;
      for (let i = 0; i < a.slots.length; i += 4) {
        if (a.slots[i] !== b.slots[i] || a.slots[i+1] !== b.slots[i+1] || a.slots[i+2] !== b.slots[i+2]) unexpected++;
        if (a.slots[i] < 239 && b.slots[i+3] !== a.slots[i+3]) {
          if (b.slots[i+3] === ((a.slots[i+3] + 2) & 255)) moved++; else unexpected++;
        }
      }
      if (moved && !unexpected && a.pixels !== b.pixels) matches.push({frame, movedSlots: moved, beforePixels: a.pixels, afterPixels: b.pixels});
    }
    assert(matches.length > 0, 'No live original-engine frame showed the declared two-pixel pose move.');
    assert.equal(JSON.stringify(after.result.last.hp), JSON.stringify(before.result.last.hp));
    assert(before.audioEntries && after.audioEntries);
    results.push({revision: name, passed: true, outputSha256: sha(built.rom), exactChangedOffsets: [156], reimportedOutput: true,
      resetAndControllerInputOnly: true, readyFrame: ready, liveOamAndVideoConfirmTwoPixelMove: matches.slice(0,3),
      matchedFrameCount: matches.length, nativeOpponentAnchorUnchanged: true, phaseInputAndHealthPathPreserved: true,
      audioEntries: 84, audioRegistersActive: true});
    console.log('PASS live pose output ' + name + ' · ' + matches.length + ' matched frames');
  }
  fs.writeFileSync(path.join(__dirname, 'Pose_Playback_Verification.json'), JSON.stringify({status: 'passed', htmlSha256: sha(fs.readFileSync(html)),
    scope: 'Actual original-engine opening/punch/dodge playback on existing MMC2 emulator; no RAM seeds. Live OAM plus video hashes, not hardware/browser listening acceptance.', results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
