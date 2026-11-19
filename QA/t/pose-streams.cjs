'use strict';
// PunchOutPoseStreams on synthetic data only (no cartridge bytes): the encoder's output, read back by the reference
// interpreter, reproduces the requested OAM, including the native quirks it must respect. The comparison with the
// original dispatcher on a supplied cartridge is QA/punch-out-pose-geometry.cjs (owner side).
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html')), output = process.argv[3];
const PS = require(path.join(root, 'app/src/re/punch-out-pose-streams.js'));
const report = {editorSha256: crypto.createHash('sha256').update(fs.readFileSync(editor)).digest('hex'), checks: []};
const check = (name, fn) => { try { fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.message).slice(0, 500)}); } };

// A 64 KiB CPU space; streams are written at fixed addresses.
function place(encoded, at = 0x9000) {
  const mem = new Uint8Array(65536);
  let p = at;
  const put = data => { const start = p; mem.set(data, p); p += data.length; return start; };
  const g = put(encoded.geometry), a = put(encoded.attributes), t = put(encoded.tiles);
  const record = put([encoded.dx, encoded.dy, g & 255, g >> 8, a & 255, a >> 8, 1, t & 255, t >> 8]);
  return {read: x => mem[x], record, mem};
}
const ctx = {baseX: 120, baseY: 100, spriteMode: 16, chrBank: 9};
const roundTrip = slots => {
  const e = PS.encode(slots, ctx), {read, record} = place(e), r = PS.interpret(read, record, ctx);
  slots.forEach((s, i) => {
    const got = r.slots[i];
    if (s.hidden) { assert.equal(got.y, 0xf8, 'slot ' + i + ' hidden'); assert.equal(got.tile, 0xfe); }
    else assert.deepEqual([got.x, got.y, got.tile, got.attr], [s.x, s.y, s.tile, s.attr], 'slot ' + i);
  });
  assert.equal(r.chrBank4KiB, ctx.chrBank);
  return {e, r};
};
// deterministic pseudo-random layouts
let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

check('A grid layout (rows of 8-pixel steps) round-trips and uses compact runs', () => {
  const slots = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++)
    slots.push({x: 100 + col * 8, y: 40 + row * 16, tile: (row * 10 + col * 2) & 254, attr: row & 3});
  const {e} = roundTrip(slots);
  assert.ok(e.geometry.length < slots.length * 2, 'geometry should use row runs, got ' + e.geometry.length + ' bytes');
});
check('Random layouts with flips and palettes round-trip exactly', () => {
  for (let n = 0; n < 200; n++) {
    const count = 1 + rnd(40), slots = [];
    for (let i = 0; i < count; i++) slots.push({x: rnd(256), y: rnd(0x4f), tile: rnd(128) * 2, attr: rnd(4) | (rnd(2) ? 64 : 0) | (rnd(2) ? 128 : 0)});
    roundTrip(slots);
  }
});
check('Behind-background: palette runs follow the sticky native mode, explicit bytes can still request either', () => {
  const slots = [{x: 10, y: 0x30, tile: 2, attr: 1}, {x: 18, y: 0x60, tile: 4, attr: 1 | 32}, {x: 26, y: 0x20, tile: 6, attr: 2 | 32},
    {x: 34, y: 0x20, tile: 8, attr: 3 | 64 | 32}];
  roundTrip(slots);
  // after the switch a front-of-background piece needs an explicit byte (EOR $20); the encoder emits it
  const {e} = roundTrip([{x: 10, y: 0x60, tile: 2, attr: 32}, {x: 18, y: 0x10, tile: 4, attr: 0}, {x: 26, y: 0x10, tile: 6, attr: 0}]);
  assert.ok(e.attributes.some(v => v & 0x80), 'explicit attribute run expected');
});
check('Trailing hidden slots use the hidden op; hidden slots before visible ones are positioned off-screen', () => {
  const slots = [{x: 50, y: 50, tile: 2, attr: 0}, {hidden: true}, {x: 66, y: 50, tile: 6, attr: 0}, {hidden: true}, {hidden: true}];
  const {e} = roundTrip(slots);
  assert.ok(e.geometry.includes(0x82), 'trailing run of two hidden slots');
});
check('Rows longer than the native 7-piece continuation are split', () => {
  const slots = Array.from({length: 20}, (_, i) => ({x: 8 + i * 8, y: 20, tile: 2, attr: 0}));
  const {e} = roundTrip(slots);
  for (let i = 0; i < e.geometry.length - 1;) { const op = e.geometry[i]; if (!op) break; assert.ok((op & 15) <= 7, 'run ' + op.toString(16)); i += 3; }
});
check('Tile runs never cross 255 (the native run adds the carry to the next tile)', () => {
  const ctx8 = {...ctx, spriteMode: 8}, slots = [250, 251, 252, 253, 254, 0, 1, 2].map((tile, i) => ({x: i * 8, y: 10, tile, attr: 0}));
  const e = PS.encode(slots, ctx8), {read, record} = place(e), r = PS.interpret(read, record, ctx8);
  slots.forEach((s, i) => assert.equal(r.slots[i].tile, s.tile, 'tile ' + i));
  const wrapped = [252, 254, 0, 2].map((tile, i) => ({x: i * 8, y: 10, tile, attr: 0}));
  roundTrip(wrapped);
});
check('The interpreter models the native carry quirk of a "next row" head that passes Y 255', () => {
  // record: first slot at Y $F8; op 02 = head (dx=8, Y += 16 -> 264: carry) + one continuation piece
  const mem = new Uint8Array(65536), rec = 0x9000, geo = 0x9100, att = 0x9200, til = 0x9300;
  mem.set([0, 0xf8 - ctx.baseY & 255, geo & 255, geo >> 8, att & 255, att >> 8, 1, til & 255, til >> 8], rec);
  mem.set([0x02, 0x08, 0x00], geo); mem.set([0x00], att); mem.set([0x00], til);
  const r = PS.interpret(a => mem[a], rec, ctx);
  // the head lands in slot 4; the carry shifts the continuation one byte: it reads the previous "X" from slot 5's Y
  // byte ($F8 fill) and writes X = $F8 + 8 = 0 into slot 6's Y byte, leaving slot 5's X unwritten
  assert.equal(r.oam[4 * 4 + 3], 128); assert.equal(r.oam[4 * 4], (0xf8 + 16) & 255);
  assert.equal(r.oam[6 * 4], 0, 'continuation X lands in the next slot\'s first byte');
  assert.equal(r.oam[5 * 4 + 3], 0xf8, 'a clean stride would have written X 136 here');
});
check('Malformed streams refuse instead of running away', () => {
  const mem = new Uint8Array(65536).fill(0x21);   // geometry that never ends
  mem.set([0, 0, 0x00, 0x91, 0x00, 0x92, 0], 0x9000);
  assert.throws(() => PS.interpret(a => mem[a], 0x9000, ctx), /does not end|61 fighter OAM slots/);
  assert.throws(() => PS.encode([], ctx), /1-61 slots/);
  assert.throws(() => PS.encode([{hidden: true}], ctx), /first slot/);
  assert.throws(() => PS.encode([{x: 1, y: 2, tile: 300, attr: 0}], ctx), /byte/);
});

report.passed = report.checks.every(c => c.passed);
for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.passed ? 0 : 1;
