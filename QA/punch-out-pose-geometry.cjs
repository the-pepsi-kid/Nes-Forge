'use strict';
// Owner-side (needs the supplied Punch-Out PRG1 cartridge): the pose stream codec and the pose geometry writer
// against the original game.
//   node QA/punch-out-pose-geometry.cjs <editor.html> <report.json> <cartridge directory>
// 1. The reference interpreter equals the original dispatcher on every full pose of every fighter.
// 2. Every full pose re-encoded by the encoder decodes, through the original dispatcher, to exactly the same OAM.
// 3. Through the command core: an unchanged import rebuilds the original; Mike Tyson pose $00 made half size builds,
//    decodes to the new layout, survives save/reopen, and leaves every other pose unchanged.
// 4. In the emulator, the half-size build follows the original's game trace (pose selector and fighter position per
//    frame) from the passcode through the bout start, i.e. the edit does not disturb the game (sprite-0 split, latches).
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html'));
const output = process.argv[3], corpus = process.argv[4];
const {loadForge} = require('./t/u/harness.cjs');
const PC = require(path.join(root, 'app/src/re/punch-out-content.js')), PS = require(path.join(root, 'app/src/re/punch-out-pose-streams.js'));
const PRG1 = '22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {suite: 'punch-out-pose-geometry', editorSha256: sha(fs.readFileSync(editor)), checks: []};
const checks = [];
const check = (name, fn) => checks.push([name, fn]);
let rom = null;
if (corpus && fs.existsSync(corpus)) for (const n of fs.readdirSync(corpus)) {
  if (!n.toLowerCase().endsWith('.nes')) continue;
  const b = new Uint8Array(fs.readFileSync(path.join(corpus, n)));
  if (sha(b) === PRG1) { rom = b; break; }
}
const reader = (bytes, bank) => a => a < 0xa000 ? bytes[16 + bank * 8192 + a - 0x8000] : bytes[16 + 131072 - 24576 + a - 0xa000];

function forge() {
  const h = loadForge(editor);
  for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
  if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
  h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
  const R = async (name, args) => { h.context.__a = args === undefined ? null : args;
    const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 900000)));
    if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };
  return {h, R};
}

check('The reference interpreter equals the original dispatcher on every full pose', () => {
  const c = PC.open(rom); let n = 0;
  for (const f of c.fights) for (const p of f.poses) {
    if (p.status !== 'source-record') continue;
    const a = c.pose(f.index, p.selector).oam, b = PS.interpret(reader(rom, f.bank8KiB), p.address, {baseX: f.baseX, baseY: f.baseY, spriteMode: f.spriteMode, chrBank: 5}).oam;
    assert.deepEqual(Array.from(b), Array.from(a), f.label + ' $' + p.selector.toString(16)); n++;
  }
  assert.equal(n, 543);
});
check('Every full pose re-encoded decodes through the original dispatcher to the same OAM', () => {
  const c = PC.open(rom), fixed = PS.trailingFill(rom, 16 + 131072 - 24576 + 8192, 0xc000);
  for (const f of c.fights) {
    const local = PS.trailingFill(rom, 16 + f.bank8KiB * 8192, 0x8000, 16);
    for (const p of f.poses) {
      if (p.status !== 'source-record') continue;
      const n = c.pose(f.index, p.selector); let last = 63;
      while (last >= 3 && n.oam.slice(last * 4, last * 4 + 4).every(v => v === 248)) last--;
      const slots = []; for (let s = 3; s <= last; s++) { const o = n.oam.slice(s * 4, s * 4 + 4); slots.push({y: o[0], tile: o[1], attr: o[2], x: o[3]}); }
      const e = PS.encode(slots, {baseX: f.baseX, baseY: f.baseY, spriteMode: f.spriteMode, chrBank: n.chrBank4KiB});
      const out = rom.slice(), off = cpu => cpu < 0xa000 ? 16 + f.bank8KiB * 8192 + cpu - 0x8000 : 16 + 131072 - 24576 + cpu - 0xa000;
      let sa = local.length >= e.bytes ? local.cpu + 9 : fixed.cpu;
      const put = d => { const s = sa; d.forEach((v, k) => { out[off(sa + k)] = v; }); sa += d.length; return s; };
      const g = put(e.geometry), a = put(e.attributes), t = put(e.tiles);
      [e.dx, e.dy, g & 255, g >> 8, a & 255, a >> 8, 1, t & 255, t >> 8].forEach((v, k) => { out[off(local.cpu + k)] = v; });
      out[off(f.shapeTables[0] + p.selector)] = local.cpu & 255; out[off(f.shapeTables[0] + p.selector + 1)] = local.cpu >> 8;
      assert.deepEqual(PC.open(out).pose(f.index, p.selector).oam, n.oam, f.label + ' $' + p.selector.toString(16));
    }
  }
});
let half = null;
check('Command core: unchanged import rebuilds the original; Tyson pose $00 at half size builds and reopens', async () => {
  const {R} = forge();
  await R('rom.import', {bytes: rom, name: 'punch-out.nes'});
  assert.equal((await R('build.rom')).sha256, sha(rom), 'unchanged import');
  const r = await R('writer.halfSize', {fight: 13, index: 0});
  assert.ok(r.pieces > 0 && r.pieces < r.originalPieces, JSON.stringify(r));
  assert.ok(!r.tilePairs.some(t => [0, 0xfc, 0xfe].includes(t)), 'reserved tile pairs');
  const built = await R('build.rom'); half = new Uint8Array(Buffer.from(built.base64, 'base64'));
  const pose = PC.open(half).pose(13, 0);
  assert.equal(pose.chrBank4KiB, r.chrBank4KiB); assert.equal(pose.pieces.length, r.pieces);
  const before = PC.open(rom);
  for (const f of before.fights) for (const p of f.poses) if (p.status === 'source-record' && !(f.index === 13 && p.selector === 0))
    assert.deepEqual(PC.open(half).pose(f.index, p.selector).oam, before.pose(f.index, p.selector).oam, f.label + ' $' + p.selector.toString(16));
  const saved = (await R('project.save')).json;
  await R('project.load', {json: saved});
  assert.equal((await R('build.rom')).sha256, built.sha256, 'save/reopen rebuild');
});
check('Emulator: the half-size build follows the original game trace from the passcode through the bout start', async () => {
  assert.ok(half, 'needs the half-size build');
  const trace = async bytes => {
    const {h, R} = forge();
    const press = async (b, hold = 4, after = 12) => { await R('input.set', {buttons: {[b]: true}}); await R('emulator.frames', {count: hold});
      await R('input.set', {buttons: {[b]: false}}); await R('emulator.frames', {count: after}); };
    await R('emulator.load', {bytes, name: 'po.nes'});
    await R('emulator.frames', {count: 1200}); await press('start', 4, 90); await press('down', 8, 40);
    for (const d of '0073735963') { await press('a', 4, 12); for (let i = 0; i < +d; i++) await press('right', 4, 8); }
    await press('start', 4, 300); await press('start', 4, 30);
    const out = [];
    for (let fr = 0; fr < 1500; fr++) { await R('emulator.frames', {count: 1}); out.push(h.run('[emu.ram[0xA1],emu.ram[0xB0],emu.ram[0xB1]].join(",")')); }
    return out;
  };
  const a = await trace(rom), b = await trace(half);
  const first = a.findIndex((v, i) => v !== b[i]);
  assert.equal(first, -1, 'traces diverge at frame ' + first + ': ' + a[first] + ' vs ' + b[first]);
  assert.ok(a.some(v => +v.split(',')[2] >= 180), 'the original reaches the fight stance');
});

(async () => {
  if (!rom) { report.skipped = 'No Punch-Out PRG1 cartridge in ' + (corpus ? 'the supplied directory' : 'arguments'); report.passed = true; }
  else {
    for (const [name, fn] of checks) { try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 600)}); } }
    report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length; report.passed = report.checksPassed === report.total;
  }
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (report.skipped) console.log('SKIP ' + report.skipped);
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
