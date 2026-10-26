'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert/strict');
const {loadForge} = require('../../app/tests/harness.cjs');
const html = path.resolve(__dirname, '../../app/mainline/NES_Forge_2.0.0-alpha.11.html');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fresh = () => loadForge(html, {environment: {crypto: crypto.webcrypto, setTimeout, clearTimeout}});
async function play(bytes, name) {
  const h = fresh(), s = h.context.Forge.services, samples = new Map();
  s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
  const saved = s.ProjectStore.serialize(); let last = -1;
  const off = s.EmulatorTimeline.subscribe(() => {
    const frame = h.run('emu.frameCount'); if (frame === last || frame < 600) return; last = frame;
    const sample = h.run('(()=>{const r=emu.ram;return {frame:emu.frameCount,round:r[6],phase:r[0],mac:r[0x50],opponent:r[0x90],anchorX:r[0xb0],anchorY:r[0xb1],selector:r[0xa1],slots:Array.from(emu.oamMem.slice(12,256)),pixels:emu.frameBuffer.slice()};})()');
    if (sample.round === 1) {sample.pixels = sha(sample.pixels); samples.set(sample.frame, JSON.parse(JSON.stringify(sample)));}
  });
  const result = await s.PunchOutReplay.run('sequence'); off();
  assert.equal(result.status, 'completed', result.stop); assert.equal(result.seeds.length, 0);
  assert.equal(s.ProjectStore.serialize(), saved); assert(result.audio.writes > 0); assert.deepEqual(h.errors, []);
  return {result, samples, audioEntries: /Decoded 84/.test(h.get('nativeAudioStatus').textContent)};
}
(async () => {
  const results = [];
  for (let revision = 0; revision < 2; revision++) {
    const name = `Mike Tyson's Punch-Out!! (U) (PRG ${revision}).nes`;
    const bytes = new Uint8Array(fs.readFileSync(path.join(process.argv[2], name))), h = fresh(), s = h.context.Forge.services;
    s.ProjectStore.load(await s.NativeResourceProject.create(bytes, name), {sync: true}); await s.InvestigationUI.whenReady();
    const id = s.PunchOutPoseUI.open(0xC0), project = s.PunchOutPoseProject.moveIdle(s.ProjectStore.capture(), id, -12, -97);
    const built = s.NativeResourceProject.build(project);
    assert.deepEqual(Array.from(built.metadata.changes, value => value.offset), [490,497,504]);
    console.log('Running original engine baseline ' + name); const before = await play(bytes, 'Original ' + name);
    console.log('Running exported/reimported idle edit ' + name); const after = await play(built.rom, 'Idle derivative ' + name);
    const ready = before.result.milestones.find(m => m.name === 'fight-ready').frame;
    assert.equal(after.result.milestones.find(m => m.name === 'fight-ready').frame, ready);
    const matches = [], seen = new Set();
    for (const [frame, a] of before.samples) {
      const b = after.samples.get(frame); if (!b) continue;
      assert.equal(b.anchorX, a.anchorX); assert.equal(b.anchorY, a.anchorY);
      assert.equal(b.mac, a.mac); assert.equal(b.opponent, a.opponent); assert.equal(b.selector, a.selector);
      if (frame < ready || ![192,194,196].includes(a.selector)) continue;
      let visible = 0, moved = 0, unexpected = 0;
      for (let i = 0; i < a.slots.length; i += 4) {
        if (a.slots[i] !== b.slots[i] || a.slots[i+1] !== b.slots[i+1] || a.slots[i+2] !== b.slots[i+2]) unexpected++;
        if (a.slots[i] < 239) {visible++; if (b.slots[i+3] === ((a.slots[i+3] + 2) & 255)) moved++; else unexpected++;}
      }
      if (visible && moved === visible && !unexpected && a.pixels !== b.pixels) {
        seen.add(a.selector); matches.push({frame, selector: a.selector, movedSlots: moved, beforePixels: a.pixels, afterPixels: b.pixels});
      }
    }
    assert(matches.length >= 20, 'No sustained live idle translation.'); assert.deepEqual([...seen].sort(), [192,194,196]);
    assert.equal(JSON.stringify(after.result.last.hp), JSON.stringify(before.result.last.hp));
    assert(before.audioEntries && after.audioEntries);
    results.push({revision: name, passed: true, outputSha256: sha(built.rom), exactChangedOffsets: [490,497,504],
      reimportedOutput: true, resetAndControllerInputOnly: true, readyFrame: ready, liveSelectorsObserved: [...seen].sort(),
      matchedIdleFrameCount: matches.length, liveOamAndVideoConfirmTwoPixelMove: matches.slice(0,3),
      nativeAnchorStateAndHealthPathPreserved: true, audioEntries: 84, audioRegistersActive: true});
    console.log('PASS live idle output ' + name + ' · ' + matches.length + ' matching frames');
  }
  fs.writeFileSync(path.join(__dirname, 'Idle_Playback_Verification.json'), JSON.stringify({status: 'passed',
    htmlSha256: sha(fs.readFileSync(html)), scope: 'Actual original-engine opening/punch/dodge on existing approximate MMC2 emulator, no RAM seeds. Live OAM/video evidence, not hardware/browser listening acceptance.', results}, null, 2) + '\n');
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
