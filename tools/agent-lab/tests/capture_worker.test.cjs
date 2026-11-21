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
  const {job} = W.enqueue(root, {romBytes: rom(), romName: 'synthetic.nes', planSpec: 'generic'});
  assert.equal(job.state, 'queued'); assert.equal(job.progress.targets, 3); assert.match(job.planSha256, /^[0-9a-f]{64}$/);
  assert.equal(W.control(root, job.id, 'pause').state, 'paused'); assert.equal(W.control(root, job.id, 'resume').state, 'queued');
  assert.equal(W.control(root, job.id, 'cancel').state, 'cancelled'); assert.throws(() => W.control(root, job.id, 'resume'), /cannot be resumed/);
  assert.ok(fs.existsSync(path.join(root, 'roms', job.rom.sha256 + '.nes')));
  fs.rmSync(root, {recursive: true, force: true}); });
test('The status summary lists a damaged header as unresolved', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const {job} = W.enqueue(root, {romBytes: rom(0x44, [...Buffer.from('iskDude!')]), romName: 'dirty.nes', planSpec: 'generic'});
  assert.match(W.summary(job).unresolved.join(' '), /damaged header suspected/);
  fs.rmSync(root, {recursive: true, force: true}); });
test('Duplicate investigations: the same ROM, plan, emulator build and verification reuse the existing job', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const a = W.enqueue(root, {romBytes: rom(), romName: 'a.nes', planSpec: 'generic', editorSha: 'e1'}), b = W.enqueue(root, {romBytes: rom(), romName: 'renamed.nes', planSpec: 'generic', editorSha: 'e1'});
  assert.equal(a.duplicate, false); assert.equal(b.duplicate, true); assert.equal(b.job.id, a.job.id);
  assert.equal(W.enqueue(root, {romBytes: rom(), romName: 'a.nes', planSpec: 'generic', editorSha: 'e2'}).duplicate, false, 'another emulator build is a new investigation');
  assert.equal(W.enqueue(root, {romBytes: rom(), romName: 'a.nes', planSpec: 'generic', editorSha: 'e1', verify: 'cold'}).duplicate, false, 'another verification is a new investigation');
  W.control(root, a.job.id, 'cancel');
  assert.equal(W.enqueue(root, {romBytes: rom(), romName: 'a.nes', planSpec: 'generic', editorSha: 'e1'}).duplicate, false, 'a cancelled job does not block a new one');
  assert.equal(W.listJobs(root).length, 4);
  fs.rmSync(root, {recursive: true, force: true}); });
test('A worker restart is reported as a recovered interruption, not a failure', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const {job} = W.enqueue(root, {romBytes: rom(), romName: 'a.nes', planSpec: 'generic'});
  job.state = 'completed'; job.interruptions = [{at: 'x', atTarget: 1, detail: 'the worker stopped while this job was running; it resumes at its first unfinished target'}];
  job.failures = [{at: 'y', stage: 'idle', error: 'target condition failed'}];
  const s = W.summary(job); assert.equal(s.recovered, true); assert.equal(s.interruptions.length, 1); assert.deepEqual(s.failures.map(f => f.stage), ['idle']);
  // jobs written by the previous worker version kept the interruption among failures: it is moved out
  const old = {...job, interruptions: undefined, failures: [{at: 'z', stage: 'worker', error: 'the worker stopped while this job was running; it resumes at its first unfinished target'}]};
  assert.equal(W.summary(old).failures.length, 0); assert.equal(W.summary(old).interruptions.length, 1);
  fs.rmSync(root, {recursive: true, force: true}); });
test('Local API security: loopback Host only, unknown browser origins refused, Origin "null" only with a paired signature', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const sec = W.security(root, {port: 8787, adminToken: 'admintoken'}), req = (headers, method = 'GET') => ({method, headers: {host: '127.0.0.1:8787', ...headers}});
  assert.equal(sec.screen(req({host: 'evil.example:8787'})).status, 421, 'DNS rebinding: foreign Host refused');
  assert.equal(sec.screen(req({origin: 'https://evil.example'})).status, 403, 'foreign origin refused');
  assert.equal(sec.screen(req({origin: 'null'})), null); assert.equal(sec.cors(req({origin: 'null'}))['access-control-allow-origin'], 'null');
  assert.deepEqual(sec.cors(req({origin: 'https://evil.example'})), {}, 'no CORS grant for a foreign origin');
  assert.equal(sec.authorize(req({origin: 'null'}), '/status', '').status, 401, 'Origin null alone grants nothing');
  assert.equal(sec.authorize(req({origin: 'null', 'x-forge-agent-token': 'admintoken'}), '/status', '').status, 401, 'the admin token is refused from browsers');
  assert.equal(sec.authorize(req({'x-forge-agent-token': 'admintoken'}), '/status', '').who, 'admin');
  assert.equal(sec.authorize(req({'x-forge-agent-token': 'wrong'}), '/status', '').status, 401);
  fs.rmSync(root, {recursive: true, force: true}); });
test('Pairing: single-use code, limited attempts, signed requests with time window and nonces; secrets are 0600', () => {
  const root = W.openRoot(fs.mkdtempSync(path.join(os.tmpdir(), 'agentlab-test-')));
  const sec = W.security(root, {port: 8787, adminToken: 'admintoken'}), code = W.newPairing(root);
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.throws(() => sec.pair('AAAA-AAAA', 'Forge', 'null'), /wrong pairing code/);
  const client = sec.pair(code.toLowerCase(), 'Forge', 'null');
  assert.match(client.id, /^c-[0-9a-f]{12}$/); assert.equal(Buffer.from(client.secret, 'base64').length, 32);
  assert.throws(() => sec.pair(code, 'again', 'null'), /no valid pairing code/, 'a code works once');
  const secret = Buffer.from(client.secret, 'base64'), t = Date.now(), body = JSON.stringify({rom: 'AAAA'});
  const signed = (method, p, b, time = t, nonce = 'n0nce-' + Math.random().toString(36).slice(2, 14)) => ({method, headers: {host: '127.0.0.1:8787', origin: 'null', 'x-forge-client': client.id, 'x-forge-time': String(time), 'x-forge-nonce': nonce, 'x-forge-signature': W.signature(secret, method, p, time, nonce, b)}});
  const ok = signed('POST', '/jobs', body); assert.equal(sec.authorize(ok, '/jobs', body).who, 'client');
  assert.equal(sec.authorize(ok, '/jobs', body).error, 'replayed request');
  assert.equal(sec.authorize(signed('POST', '/jobs', body), '/jobs', body + ' ').error, 'invalid signature', 'a changed body breaks the signature');
  assert.equal(sec.authorize(signed('POST', '/jobs', body), '/jobs/x/cancel', body).error, 'invalid signature', 'a changed path breaks the signature');
  assert.match(sec.authorize(signed('GET', '/status', '', t - 10 * 60 * 1000), '/status', '').error, /time outside/);
  assert.equal(sec.revoke(client.id), true); assert.match(sec.authorize(signed('GET', '/status', ''), '/status', '').error, /unknown or revoked/);
  // five wrong codes invalidate a code
  const code2 = W.newPairing(root); for (let i = 0; i < 4; i++) assert.throws(() => sec.pair('ZZZZ-ZZZZ'), /wrong pairing code/);
  assert.throws(() => sec.pair('ZZZZ-ZZZZ'), /now invalid/); assert.throws(() => sec.pair(code2), /no valid pairing code/);
  if (process.platform !== 'win32') for (const f of ['clients.json']) assert.equal(fs.statSync(path.join(root, f)).mode & 0o777, 0o600, f + ' is 0600');
  if (process.platform !== 'win32') for (const d of ['jobs', 'roms', 'checkpoints']) assert.equal(fs.statSync(path.join(root, d)).mode & 0o777, 0o700, d + ' is 0700');
  fs.rmSync(root, {recursive: true, force: true}); });
let failed = 0;
for (const [name, fn] of tests) { try { fn(); console.log('PASS ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
console.log(tests.length - failed + '/' + tests.length + ' passed'); process.exitCode = failed ? 1 : 0;
