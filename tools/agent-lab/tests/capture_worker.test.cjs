'use strict';
// Agent Lab capture worker: logic that needs no browser and no cartridge (synthetic ROM bytes only).
//   node tools/agent-lab/tests/capture_worker.test.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const W = require('../capture_worker.cjs');
const rom = (h7 = 0, tail = [0, 0, 0, 0, 0, 0, 0, 0], mapperLow = 0x10) => { const b = Buffer.alloc(16 + 16384 + 8192); b.write('NES\x1a', 0, 'latin1'); b[4] = 1; b[5] = 1; b[6] = mapperLow; b[7] = h7; for (let i = 0; i < 8; i++) b[8 + i] = tail[i]; return b; };
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
test('A clean iNES header raises no compatibility item', () => { const r = W.inspectRom(rom()); assert.equal(r.header.mapperFromHeader, 1); assert.deepEqual(r.items, []); });
test('A damaged header ("DiskDude!") is reported, its mapper read as-is and nothing repaired', () => {
  const b = rom(0x44, [...Buffer.from('iskDude!')]), copy = Buffer.from(b), r = W.inspectRom(b);
  assert.equal(r.items[0].state, 'damaged header suspected'); assert.equal(r.header.mapperFromHeader, 0x41); assert.match(r.items[0].detail, /Not repaired/); assert.ok(b.equals(copy)); });
test('A file that is not iNES is unsupported', () => { const r = W.inspectRom(Buffer.from('not a rom at all')); assert.equal(r.header, null); assert.equal(r.items[0].state, 'unsupported'); });
test('Plans are validated', () => {
  assert.throws(() => W.validatePlan({format: 'x'}), /not a capture plan/);
  assert.throws(() => W.validatePlan({format: 'NESForgeCapturePlan', version: 1, targets: []}), /1-512 targets/);
  assert.throws(() => W.validatePlan({format: 'NESForgeCapturePlan', version: 1, targets: [{label: 'x', frames: 40000}]}), /frame limits/);
  W.validatePlan({format: 'NESForgeCapturePlan', version: 1, targets: [{label: 'x', frames: 60}]}); });
test('Plan choice: a profile plan only for the ROM it names, the generic plan otherwise', () => {
  assert.equal(W.choosePlan('profile', '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e').plan.profile, 'ninja-gaiden-us');
  assert.equal(W.choosePlan(undefined, 'ab'.repeat(32)).source, 'generic.json');
  assert.throws(() => W.choosePlan('profile', 'ab'.repeat(32)), /no profile plan/); });
test('Private output is refused inside a Git working tree', () => { assert.throws(() => W.openRoot(path.join(__dirname, 'private-out')), /inside the Git working tree/); });
test('Job states: queued -> paused -> queued -> cancelled; a cancelled job cannot be resumed', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const job = W.enqueue(root, {romBytes: rom(), romName: 'synthetic.nes', planSpec: 'generic'});
  assert.equal(job.state, 'queued'); assert.equal(job.progress.targets, 3); assert.match(job.planSha256, /^[0-9a-f]{64}$/);
  assert.equal(W.control(root, job.id, 'pause').state, 'paused'); assert.equal(W.control(root, job.id, 'resume').state, 'queued');
  assert.equal(W.control(root, job.id, 'cancel').state, 'cancelled'); assert.throws(() => W.control(root, job.id, 'resume'), /cannot be resumed/);
  assert.ok(fs.existsSync(path.join(root, 'roms', job.rom.sha256 + '.nes')));
  fs.rmSync(root, {recursive: true, force: true}); });
test('The status summary lists a damaged header as unresolved', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const job = W.enqueue(root, {romBytes: rom(0x44, [...Buffer.from('iskDude!')]), romName: 'dirty.nes', planSpec: 'generic'});
  assert.match(W.summary(job).unresolved.join(' '), /damaged header suspected/);
  fs.rmSync(root, {recursive: true, force: true}); });
let failed = 0;
for (const [name, fn] of tests) { try { fn(); console.log('PASS ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
console.log(tests.length - failed + '/' + tests.length + ' passed'); process.exitCode = failed ? 1 : 0;
