#!/usr/bin/env node
'use strict';
/*
 NES Forge Agent Lab · background capture worker (v0.4.1)

 Investigates a ROM while the developer keeps working in Forge. It runs Forge's own emulator in an isolated headless
 Chromium (its own process and profile: nothing is shared with an open Forge window), follows a capture plan, and
 writes synchronized frame-evidence records (NESForgeFrameEvidence) with screenshots, hashes, CHR associations,
 sprites, CPU/PPU/APU state and code locations. Results are imported into Forge's library from Forge itself.

   node capture_worker.cjs serve   --root DIR --forge NES_Forge.html [--port 8787]   queue + worker + local API
   node capture_worker.cjs run     --root DIR --forge NES_Forge.html [--once]        worker only (no API)
   node capture_worker.cjs enqueue --root DIR --rom game.nes [--plan generic|profile|plan.json] [--verify cold]
   node capture_worker.cjs status  --root DIR
   node capture_worker.cjs pause|resume|cancel --root DIR --job ID
   node capture_worker.cjs pair    --root DIR                                         a new pairing code for Forge
   node capture_worker.cjs clients --root DIR [--revoke CLIENT]                       paired Forge clients

 Queue: DIR/jobs/<id>/job.json, one file per job, written atomically. States: queued, running, paused, completed,
 failed, interrupted, cancelled. A job left "running" by a worker that is gone becomes "interrupted" and resumes at its
 first unfinished target; finished targets are never redone. Pause and cancel take effect between targets.
 Checkpoints: DIR/checkpoints/<key>/ where key = SHA-256 of ROM SHA-256, editor SHA-256 (the emulator build),
 mapper configuration and the boot plan. A boot checkpoint is used only after it restored to exactly the state it was
 saved from (evidence digest), and, when first created, after a cold boot reproduced that same state. Target
 checkpoints skip a target's restart sequence on later runs and are checked against the digest recorded with them.
 Limits: one job at a time, lowered CPU priority, a time limit per job, frame limits per target from the plan.
 Private: ROM copies, records and screenshots stay under DIR. DIR must not be inside a Git working tree.
 The local API listens on 127.0.0.1 only. Forge pairs once with a single-use code printed at start and then signs every
 request with a key it cannot export (see "the local API" below and docs/architecture/AGENT_LAB_SECURITY.md).
 Scripts use the admin token in DIR/token (mode 0600), which browsers cannot use.
*/
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), zlib = require('node:zlib'), http = require('node:http');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const STATES = ['queued', 'running', 'paused', 'completed', 'failed', 'interrupted', 'cancelled'];
const args = process.argv.slice(2), command = args[0];
const opt = name => { const i = args.indexOf('--' + name); return i > 0 ? args[i + 1] : undefined; };
const flag = name => args.includes('--' + name);
const now = () => new Date().toISOString();
const log = (...a) => console.log('[agent-lab ' + new Date().toISOString().slice(11, 19) + ']', ...a);

// ---------- storage ----------
function writeAtomic(file, data, mode) { fs.mkdirSync(path.dirname(file), {recursive: true, mode: 0o700}); const tmp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, data, mode ? {mode} : undefined); fs.renameSync(tmp, file); }
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function insideGit(dir) { let d = path.resolve(dir); for (;;) { if (fs.existsSync(path.join(d, '.git'))) return d; const up = path.dirname(d); if (up === d) return null; d = up; } }
function openRoot(dir) {
  if (!dir) throw Error('give --root DIR (a private folder outside any Git checkout)');
  const root = path.resolve(dir), git = insideGit(root);
  if (git && !flag('allow-git')) throw Error('refusing a private output folder inside the Git working tree ' + git);
  // ROM copies, checkpoints and secrets: the folder and its subfolders are for the user only (0700 where supported)
  const created = !fs.existsSync(root);
  for (const sub of ['jobs', 'roms', 'checkpoints']) { fs.mkdirSync(path.join(root, sub), {recursive: true, mode: 0o700}); try { fs.chmodSync(path.join(root, sub), 0o700); } catch (_) {} }
  if (created) try { fs.chmodSync(root, 0o700); } catch (_) { /* Windows: the user folder's ACLs apply */ }
  else if (process.platform !== 'win32' && (fs.statSync(root).mode & 0o077)) log('note: ' + root + ' is readable by other users; its subfolders and secret files are not');
  return root;
}
const jobDir = (root, id) => path.join(root, 'jobs', id);
const jobFile = (root, id) => path.join(jobDir(root, id), 'job.json');
const loadJob = (root, id) => readJson(jobFile(root, id));
function saveJob(root, job) { job.updated = now(); writeAtomic(jobFile(root, job.id), JSON.stringify(job, null, 1), 0o600); return job; }
function listJobs(root) { return fs.readdirSync(path.join(root, 'jobs')).filter(id => fs.existsSync(jobFile(root, id))).map(id => loadJob(root, id)).sort((a, b) => a.created.localeCompare(b.created)); }
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

// ---------- ROM identity and compatibility (nothing is repaired) ----------
function inspectRom(bytes) {
  const items = [];
  if (bytes.length < 16 || bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) return {header: null, items: [{kind: 'container', state: 'unsupported', detail: 'not an iNES file'}]};
  const nes2 = (bytes[7] & 0x0c) === 0x08, mapper = (bytes[6] >> 4) | (bytes[7] & 0xf0), tail = [...bytes.subarray(8, 16)];
  const header = {format: nes2 ? 'NES 2.0' : 'iNES', mapperFromHeader: mapper, prgBytes: bytes[4] * 16384, chrBytes: bytes[5] * 8192, trainer: !!(bytes[6] & 4), headerSha256: sha(bytes.subarray(0, 16))};
  if (!nes2 && tail.slice(3).some(b => b !== 0)) items.push({kind: 'header', state: 'damaged header suspected', detail: 'iNES bytes 11-15 are not zero (' + Buffer.from(bytes.subarray(7, 16)).toString('latin1').replace(/[^\x20-\x7e]/g, '.') + '); byte 7 may carry junk, so the mapper read from it (' + mapper + ') may be wrong. Not repaired.'});
  return {header, items};
}

// ---------- plans ----------
const PLAN_DIR = path.join(__dirname, 'plans');
function choosePlan(spec, romSha) {
  if (spec && spec !== 'generic' && spec !== 'profile') { const p = readJson(path.resolve(spec)); return {plan: p, source: 'file ' + path.basename(spec)}; }
  if (spec !== 'generic') for (const f of fs.readdirSync(PLAN_DIR).filter(f => f.endsWith('.json'))) { const p = readJson(path.join(PLAN_DIR, f)); if (p.match?.sha256?.includes(romSha)) return {plan: p, source: 'profile ' + f}; }
  if (spec === 'profile') throw Error('no profile plan matches this ROM; use the generic plan');
  return {plan: readJson(path.join(PLAN_DIR, 'generic.json')), source: 'generic.json'};
}
function validatePlan(plan) {
  if (!plan || plan.format !== 'NESForgeCapturePlan' || plan.version !== 1) throw Error('not a capture plan (NESForgeCapturePlan v1)');
  if (!Array.isArray(plan.targets) || !plan.targets.length || plan.targets.length > 512) throw Error('a plan needs 1-512 targets');
  for (const t of plan.targets) { if ((t.frames || 1) > 36000 || (t.maxFrames || 0) > 72000) throw Error('target "' + t.label + '" exceeds the frame limits'); }
}

// ---------- jobs ----------
// A ROM already investigated (or being investigated) with the same plan, emulator build and verification is not
// queued again: the existing job is returned. Failed and cancelled jobs do not count.
const investigationKey = (romSha, planSha, editorSha, verify) => sha(JSON.stringify({romSha, planSha, editorSha: editorSha || null, verify}));
function enqueue(root, {romBytes, romName, planSpec, plan: planObject, verify = 'restore', maxJobMs = 30 * 60 * 1000, editorSha = null, requestedBy = null, reason = null, allowDuplicate = false}) {
  const romSha = sha(romBytes), rom = inspectRom(romBytes);
  if (!rom.header) throw Error('not an iNES ROM');
  const chosen = planObject ? {plan: planObject, source: 'supplied'} : choosePlan(planSpec, romSha); validatePlan(chosen.plan);
  const key = investigationKey(romSha, sha(JSON.stringify(chosen.plan)), editorSha, verify);
  if (!allowDuplicate) { const same = listJobs(root).find(j => j.investigationKey === key && !['failed', 'cancelled'].includes(j.state)); if (same) return {job: same, duplicate: true}; }
  writeAtomic(path.join(root, 'roms', romSha + '.nes'), romBytes, 0o600);
  const id = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + romSha.slice(0, 8) + '-' + crypto.randomBytes(3).toString('hex');
  const job = {format: 'NESForgeAgentJob', version: 1, id, state: 'queued', created: now(), updated: now(),
    rom: {name: romName || 'rom.nes', sha256: romSha, bytes: romBytes.length, header: rom.header}, compatibility: rom.items,
    plan: chosen.plan, planSource: chosen.source, planSha256: sha(JSON.stringify(chosen.plan)), verify, limits: {maxJobMs, oneJobAtATime: true, cpuPriority: 'lowered'},
    investigationKey: key, editorSha256Expected: editorSha, requestedBy, reason,
    progress: {targets: chosen.plan.targets.length, done: 0, current: null}, results: [], failures: [], interruptions: [], checkpoint: null, runs: []};
  fs.mkdirSync(jobDir(root, id), {recursive: true, mode: 0o700}); saveJob(root, job); return {job, duplicate: false};
}
function control(root, id, action) {
  const job = loadJob(root, id);
  if (action === 'pause') { if (['queued', 'interrupted'].includes(job.state)) job.state = 'paused'; else if (job.state === 'running') job.control = 'pause'; else throw Error('a ' + job.state + ' job cannot be paused'); }
  else if (action === 'resume') { if (!['paused', 'failed', 'interrupted'].includes(job.state)) throw Error('a ' + job.state + ' job cannot be resumed'); job.state = 'queued'; delete job.control; }
  else if (action === 'cancel') { if (job.state === 'running') job.control = 'cancel'; else if (!['completed', 'cancelled'].includes(job.state)) job.state = 'cancelled'; }
  else throw Error('unknown action ' + action);
  return saveJob(root, job);
}
function summary(job) {
  const sync = job.results.filter(r => r.synchronization === 'matched').length;
  return {id: job.id, state: job.state, control: job.control || null, rom: {name: job.rom.name, sha256: job.rom.sha256}, plan: {name: job.plan.name, source: job.planSource, sha256: job.planSha256},
    progress: job.progress, frames: job.results.length, synchronized: sync,
    unresolved: [...job.compatibility.filter(c => c.state !== 'emulated').map(c => c.kind + ': ' + c.state + (c.detail ? ' (' + c.detail + ')' : '')), ...job.results.filter(r => r.synchronization !== 'matched').map(r => r.label + ': frame not synchronization-checked (' + r.synchronizationReason + ')'), ...job.results.filter(r => !r.reached).map(r => r.label + ': target condition not reached'),
      ...(job.results.some(r => r.split) ? [job.results.filter(r => r.split).length + ' frame(s) switch CHR banks or scroll mid-frame: their sprite pattern locations are unverified'] : []),
      ...(job.results.length ? ['sprite → pose/actor relationships: not established (needs game knowledge or a decoded actor table)'] : [])],
    failures: job.failures.filter(f => f.stage !== 'worker' || !/stopped while this job was running/.test(f.error)), interruptions: job.interruptions || job.failures.filter(f => f.stage === 'worker' && /stopped while this job was running/.test(f.error)).map(f => ({at: f.at, detail: f.error})),
    recovered: (job.interruptions || []).length > 0 && ['running', 'completed', 'queued'].includes(job.state), requestedBy: job.requestedBy || null, reason: job.reason || null,
    checkpoint: job.checkpoint, created: job.created, updated: job.updated, completed: job.completed || null, runs: job.runs};
}

// ---------- the isolated emulator session ----------
function loadPlaywright() { try { return require('playwright'); } catch (_) { return require(path.join(__dirname, '../../QA/node_modules/playwright')); } }
async function openSession(forgePath) {
  const {chromium} = loadPlaywright();
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = await browser.newPage(); page.setDefaultTimeout(30 * 60 * 1000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(forgePath)); await page.waitForFunction('window.Forge?.services?.FrameEvidence?.runTarget');
  const call = (fn, a) => page.evaluate(fn, a);
  return {browser, page, errors, call};
}
const PAGE = {
  load: async ([b64, name]) => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const r = await Forge.commands.run('emulator.load', {bytes, name}); if (!r.ok) throw Error(r.error.message); return {loaded: !!emu.loaded, mapper: emu.mapper}; },
  boot: async ([b64, name, plan]) => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await Forge.services.FrameEvidence.boot(bytes, name, plan); return {frame: emu.frameCount}; },
  digest: async () => (await Forge.services.FrameEvidence.capture({label: 'state', links: false})).digests.all,
  save: async name => { const T = Forge.services.EmulatorTimeline, ck = T.saveOwnedCheckpoint(name); const data = T.exportCheckpoint(ck.id); window.__agentCk = window.__agentCk || {}; window.__agentCk[name] = ck; return data; },
  import: async ([data, romSha256, name]) => { window.__agentCk = window.__agentCk || {}; window.__agentCk[name]?.release?.(); window.__agentCk[name] = await Forge.services.FrameEvidence.importCheckpoint(data, {romSha256, name}); return true; },
  restore: async name => { window.__agentCk[name].restore(); return emu.frameCount; },
  release: async name => { window.__agentCk?.[name]?.release?.(); delete window.__agentCk?.[name]; return true; },
  target: async target => Forge.services.FrameEvidence.runTarget(target),
  capture: async label => Forge.services.FrameEvidence.capture({label, links: false, pixels: true, scene: true})
};
function png(rgba) {
  const raw = Buffer.alloc(240 * (256 * 4 + 1)); for (let y = 0; y < 240; y++) rgba.copy(raw, y * 1025 + 1, y * 1024, y * 1024 + 1024);
  const crcT = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const n = Buffer.from(t), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(Buffer.concat([n, d]))); return Buffer.concat([l, n, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(256, 0); ih.writeUInt32BE(240, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- running one job ----------
async function runJob(root, job, session, editorSha, stop) {
  const started = Date.now(), dir = jobDir(root, job.id), romBytes = fs.readFileSync(path.join(root, 'roms', job.rom.sha256 + '.nes')), b64 = romBytes.toString('base64');
  const run = {started: now(), worker: process.pid, editorSha256: editorSha, boots: 0, restoredFromDisk: false, targetsFromCheckpoint: 0, targetsComputed: 0};
  job.runs.push(run); job.state = 'running'; delete job.control; job.editorSha256 = editorSha; saveJob(root, job);
  const {call} = session;
  const loaded = await call(PAGE.load, [b64, job.rom.name]).catch(e => ({error: e.message}));
  if (loaded.error || !loaded.loaded) { job.state = 'failed'; job.failures.push({at: now(), stage: 'load', error: 'the emulator could not load this ROM' + (loaded.error ? ': ' + loaded.error : '') + ' (mapper ' + job.rom.header.mapperFromHeader + ' from the header)'}); return saveJob(root, job); }
  job.rom.mapperEmulated = loaded.mapper;
  if (!job.compatibility.some(c => c.kind === 'mapper')) job.compatibility.push({kind: 'mapper', state: loaded.mapper === job.rom.header.mapperFromHeader ? 'emulated' : 'emulated as ' + loaded.mapper, detail: 'the emulator runs mapper ' + loaded.mapper});
  // ---- boot checkpoint: from disk when it restores exactly; otherwise boot, save, and verify ----
  const key = sha(JSON.stringify({rom: job.rom.sha256, editor: editorSha, mapper: loaded.mapper, header: job.rom.header.headerSha256, boot: job.plan.boot})), ckDir = path.join(root, 'checkpoints', key), bootFile = path.join(ckDir, 'boot.json');
  job.checkpoint = {key, keyedBy: 'ROM SHA-256, editor SHA-256 (emulator build), mapper, header, boot plan'};
  let boot = fs.existsSync(bootFile) ? readJson(bootFile) : null;
  if (boot) {
    try { await call(PAGE.import, [boot.checkpoint, job.rom.sha256, 'boot']); await call(PAGE.restore, 'boot'); const d = await call(PAGE.digest);
      if (d !== boot.digest) throw Error('restored state differs from the state it was saved from');
      run.restoredFromDisk = true; job.checkpoint.boot = {source: 'disk', verified: boot.verified, frame: boot.frame, digest: d};
    } catch (e) { job.failures.push({at: now(), stage: 'boot checkpoint', error: 'not used: ' + e.message}); boot = null; fs.rmSync(bootFile, {force: true}); }
  }
  if (!boot) {
    await call(PAGE.boot, [b64, job.rom.name, job.plan.boot]); run.boots++;
    const d1 = await call(PAGE.digest), data = await call(PAGE.save, 'boot');
    // verified: the saved checkpoint restores to the same state, and a cold boot reproduces it
    await call(PAGE.load, [b64, job.rom.name]); await call(PAGE.import, [data, job.rom.sha256, 'boot']); await call(PAGE.restore, 'boot');
    const d2 = await call(PAGE.digest);
    await call(PAGE.boot, [b64, job.rom.name, job.plan.boot]); run.boots++; const d3 = await call(PAGE.digest);
    if (d2 !== d1 || d3 !== d1) { job.state = 'failed'; job.failures.push({at: now(), stage: 'boot checkpoint', error: 'the boot is not reproducible (saved ' + d1.slice(0, 12) + ', restored ' + d2.slice(0, 12) + ', cold ' + d3.slice(0, 12) + ')'}); return saveJob(root, job); }
    boot = {format: 'NESForgeAgentCheckpoint', version: 1, key, rom: job.rom.sha256, editor: editorSha, mapper: loaded.mapper, frame: data.frame, digest: d1, checkpoint: data,
      verified: {method: 'restored state and a cold boot both equal the saved state (evidence digest)', at: now()}, created: now()};
    writeAtomic(bootFile, JSON.stringify(boot));
    await call(PAGE.import, [data, job.rom.sha256, 'boot']);
    job.checkpoint.boot = {source: 'created', verified: boot.verified, frame: boot.frame, digest: d1};
  }
  saveJob(root, job);
  // ---- targets ----
  for (let i = 0; i < job.plan.targets.length; i++) {
    if (job.results.some(r => r.index === i)) continue; // finished in an earlier run
    const fresh = loadJob(root, job.id); if (fresh.control) job.control = fresh.control;
    if (job.control === 'pause') { job.state = 'paused'; delete job.control; run.ended = now(); return saveJob(root, job); }
    if (job.control === 'cancel' || stop()) { job.state = job.control === 'cancel' ? 'cancelled' : 'interrupted'; delete job.control; run.ended = now(); return saveJob(root, job); }
    if (Date.now() - started > job.limits.maxJobMs) { job.state = 'paused'; job.failures.push({at: now(), stage: 'limit', error: 'paused at the job time limit (' + Math.round(job.limits.maxJobMs / 1000) + ' s); resume to continue'}); run.ended = now(); return saveJob(root, job); }
    const target = job.plan.targets[i], tHash = sha(JSON.stringify(target)).slice(0, 24), tFile = path.join(ckDir, 'targets', tHash + '.json'), t0 = Date.now();
    job.progress.current = target.label; saveJob(root, job);
    let record = null, source = 'computed', reached = {reached: true, frames: 0};
    const saved = fs.existsSync(tFile) ? readJson(tFile) : null;
    if (saved) {
      try { await call(PAGE.import, [saved.checkpoint, job.rom.sha256, 'target']); await call(PAGE.restore, 'target'); record = await call(PAGE.capture, target.label);
        if (record.digests.all !== saved.digest) throw Error('restored target differs from its recorded capture');
        source = 'target checkpoint'; reached = saved.reached; run.targetsFromCheckpoint++;
      } catch (e) { job.failures.push({at: now(), stage: target.label, error: 'target checkpoint not used: ' + e.message}); record = null; fs.rmSync(tFile, {force: true}); }
      await call(PAGE.release, 'target');
    }
    if (!record) {
      try { await call(PAGE.restore, 'boot'); reached = await call(PAGE.target, target); record = await call(PAGE.capture, target.label); run.targetsComputed++;
        const data = await call(PAGE.save, 'target-save');
        writeAtomic(tFile, JSON.stringify({format: 'NESForgeAgentCheckpoint', version: 1, key, target: tHash, label: target.label, digest: record.digests.all, reached, checkpoint: data, created: now(),
          verified: {method: 'state at capture, reached from the verified boot checkpoint; reuse requires the same capture digest'}}));
        await call(PAGE.release, 'target-save');
        if (job.verify === 'cold') { await call(PAGE.boot, [b64, job.rom.name, job.plan.boot]); run.boots++; await call(PAGE.target, target); const cold = await call(PAGE.digest);
          // the digest of a plain capture equals the evidence digest: the same sections, without pixels or scene
          if (cold !== record.digests.all) throw Error('a cold boot did not reproduce this target (' + cold.slice(0, 12) + ' vs ' + record.digests.all.slice(0, 12) + ')');
          await call(PAGE.import, [boot.checkpoint, job.rom.sha256, 'boot']); }
      } catch (e) { job.failures.push({at: now(), stage: target.label, error: String(e.message).slice(0, 300)}); job.progress.failed = (job.progress.failed || 0) + 1; saveJob(root, job); continue; }
    }
    const name = String(i).padStart(3, '0'), rgba = Buffer.from(record.rendered.rgba, 'base64');
    if (sha(rgba) !== record.rendered.framebufferSha256) throw Error('screenshot pixels differ from the record');
    const {rgba: _drop, ...rendered} = record.rendered; const stored = {...record, rendered, provenance: {job: job.id, plan: {name: job.plan.name, sha256: job.planSha256, target: i, targetSha256: tHash},
      emulatorBuild: editorSha, execution: {source, reached, boots: run.boots, checkpointKey: key, worker: 'agent-lab capture_worker v0.4'}}};
    writeAtomic(path.join(dir, 'frames', name + '.png'), png(rgba));
    writeAtomic(path.join(dir, 'frames', name + '.json'), JSON.stringify(stored));
    job.results.push({index: i, label: target.label, file: 'frames/' + name + '.json', png: 'frames/' + name + '.png', digest: record.digests.all, frame: record.frame, ms: Date.now() - t0, source, reached: reached.reached,
      synchronization: record.synchronization.state, synchronizationReason: record.synchronization.reason || null, scene: !!record.scene, split: !!record.ppu.split && record.spritePatternsAt !== 'fetch'});
    job.results.sort((a, b) => a.index - b.index); job.progress.done = job.results.length; saveJob(root, job);
  }
  job.progress.current = null; run.ended = now(); run.ms = Date.now() - started;
  job.state = job.results.length ? 'completed' : 'failed'; if (job.state === 'completed') job.completed = now();
  return saveJob(root, job);
}
// the results bundle Forge imports (validated there again)
function bundle(root, id) {
  const job = loadJob(root, id), dir = jobDir(root, id);
  return {format: 'NESForgeInvestigationResults', version: 1, job: {id: job.id, state: job.state, rom: job.rom, plan: {name: job.plan.name, source: job.planSource, sha256: job.planSha256, method: job.plan.method || null},
    editorSha256: job.editorSha256, checkpoint: job.checkpoint, compatibility: job.compatibility, failures: job.failures, runs: job.runs, created: job.created, completed: job.completed || null},
    records: job.results.map(r => ({record: readJson(path.join(dir, r.file)), png: fs.readFileSync(path.join(dir, r.png)).toString('base64')}))};
}

// ---------- the worker loop ----------
async function workerLoop(root, forgePath, {once = false, state}) {
  const lock = path.join(root, 'worker.lock');
  if (fs.existsSync(lock)) { const other = readJson(lock); if (other.pid !== process.pid && pidAlive(other.pid)) throw Error('another worker (pid ' + other.pid + ') is using ' + root); }
  writeAtomic(lock, JSON.stringify({pid: process.pid, started: now(), host: os.hostname()}));
  try { os.setPriority(0, 10); } catch (_) { /* priority is a courtesy */ }
  // jobs a previous worker left running are interrupted, and resume where they stopped
  for (const job of listJobs(root)) if (job.state === 'running') { job.state = 'interrupted'; (job.interruptions = job.interruptions || []).push({at: now(), atTarget: job.progress.done, detail: 'the worker stopped while this job was running; it resumes at its first unfinished target'}); saveJob(root, job); }
  const editorSha = sha(fs.readFileSync(forgePath));
  let session = null;
  const stop = () => state.stopping;
  try {
    while (!state.stopping) {
      const next = listJobs(root).find(j => j.state === 'queued' || j.state === 'interrupted');
      if (!next) { state.current = null; if (once) break; await new Promise(r => setTimeout(r, 1000)); continue; }
      state.current = next.id; log('job', next.id, next.state === 'interrupted' ? '(resuming)' : '', next.rom.name, '·', next.plan.name);
      if (!session) session = await openSession(forgePath);
      try { const done = await runJob(root, next, session, editorSha, stop); log('job', done.id, done.state, done.results.length + '/' + done.progress.targets, 'frames'); }
      catch (e) { const job = loadJob(root, next.id); job.state = 'failed'; job.failures.push({at: now(), stage: 'worker', error: String(e.message).slice(0, 400)}); saveJob(root, job); log('job', job.id, 'failed:', e.message);
        try { await session.browser.close(); } catch (_) {} session = null; }
      if (once && !listJobs(root).some(j => j.state === 'queued' || j.state === 'interrupted')) break;
    }
  } finally { try { await session?.browser.close(); } catch (_) {} fs.rmSync(lock, {force: true}); state.current = null; }
}

// ---------- the local API (loopback only; paired, signed requests) ----------
// Forge is a standalone HTML file, usually opened from file://, so its requests carry `Origin: null`, which any
// sandboxed frame or data: page can also send: an Origin header cannot identify Forge. Authority comes from a pairing
// instead. The worker prints a short single-use pairing code; Forge exchanges it once (POST /pair) for a client id and
// a 256-bit secret, imports the secret as a non-extractable WebCrypto HMAC key kept in IndexedDB, and signs every
// request (method, path, time, nonce, body hash). The worker checks the signature, a 2-minute time window and
// single-use nonces. The Host header must name the loopback address (DNS rebinding), browser origins outside the
// allow-list are refused outright, and the admin token (for scripts) is accepted only from non-browser clients.
// Secrets live in files readable only by the user (0600) inside a 0700 folder where the OS supports it.
const PAIR_TTL = 10 * 60 * 1000, SKEW = 120 * 1000, MAX_BODY = 16 * 1024 * 1024, SIGNED = ['x-forge-client', 'x-forge-time', 'x-forge-nonce', 'x-forge-signature'];
const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const signature = (secret, method, pathName, time, nonce, body) => b64url(crypto.createHmac('sha256', secret).update([method.toUpperCase(), pathName, String(time), nonce, sha(body || '')].join('\n')).digest());
function secureWrite(file, data) { writeAtomic(file, data, 0o600); try { fs.chmodSync(file, 0o600); } catch (_) { /* Windows: ACLs of the user's folder apply */ } }
function pairingCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += a[b[i] % a.length]; return s.slice(0, 4) + '-' + s.slice(4); }
function newPairing(root) { const code = pairingCode(); secureWrite(path.join(root, 'pairing.json'), JSON.stringify({codeSha256: sha(code.replace('-', '')), expires: Date.now() + PAIR_TTL, attempts: 0})); return code; }
function security(root, {port, allowOrigins = [], adminToken}) {
  const clientsFile = path.join(root, 'clients.json'), pairingFile = path.join(root, 'pairing.json');
  const clients = () => { try { return readJson(clientsFile); } catch (_) { return []; } };
  const saveClients = list => secureWrite(clientsFile, JSON.stringify(list, null, 1));
  const origins = new Set(['null', ...allowOrigins]), hosts = new Set(['127.0.0.1:' + port, 'localhost:' + port, '[::1]:' + port]);
  const nonces = new Map(); let failures = [];
  const equal = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  function screen(req) {
    if (!hosts.has(String(req.headers.host || '').toLowerCase())) return {status: 421, error: 'this worker answers only to its loopback address'};
    const origin = req.headers.origin;
    if (origin !== undefined && !origins.has(origin)) return {status: 403, error: 'origin not allowed'};
    failures = failures.filter(t => Date.now() - t < 60000); if (failures.length >= 30) return {status: 429, error: 'too many failed requests; wait a minute'};
    return null;
  }
  function cors(req) {
    const origin = req.headers.origin; if (origin === undefined || !origins.has(origin)) return {};
    return {'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': ['content-type', ...SIGNED].join(', '), 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'access-control-allow-private-network': 'true', 'access-control-max-age': '600'};
  }
  function authorize(req, pathName, body) {
    const h = req.headers;
    if (h['x-forge-agent-token'] !== undefined) {
      if (h.origin !== undefined) { failures.push(Date.now()); return {status: 401, error: 'the admin token is for scripts, not browsers; pair Forge instead'}; }
      if (adminToken && equal(h['x-forge-agent-token'], adminToken)) return {who: 'admin'};
      failures.push(Date.now()); return {status: 401, error: 'invalid token'};
    }
    if (SIGNED.some(k => typeof h[k] !== 'string')) return {status: 401, error: 'pairing required'};
    const client = clients().find(c => c.id === h['x-forge-client']), time = Number(h['x-forge-time']), nonce = h['x-forge-nonce'];
    if (!client) { failures.push(Date.now()); return {status: 401, error: 'unknown or revoked client; pair again'}; }
    if (!Number.isFinite(time) || Math.abs(Date.now() - time) > SKEW) return {status: 401, error: 'request time outside the allowed window (check the clock)'};
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return {status: 401, error: 'invalid nonce'};
    for (const [n, t] of nonces) if (Date.now() - t > 2 * SKEW) nonces.delete(n);
    if (nonces.has(client.id + ':' + nonce)) { failures.push(Date.now()); return {status: 401, error: 'replayed request'}; }
    if (!equal(h['x-forge-signature'], signature(Buffer.from(client.secret, 'base64'), req.method, pathName, time, nonce, body))) { failures.push(Date.now()); return {status: 401, error: 'invalid signature'}; }
    nonces.set(client.id + ':' + nonce, Date.now());
    if (Date.now() - (client.lastSeen || 0) > 60000) { const list = clients(); const c = list.find(x => x.id === client.id); if (c) { c.lastSeen = Date.now(); saveClients(list); } }
    return {who: 'client', client};
  }
  function pair(code, name, origin) {
    let p; try { p = readJson(pairingFile); } catch (_) { p = null; }
    if (!p || Date.now() > p.expires) { failures.push(Date.now()); throw Object.assign(Error('no valid pairing code; run "capture_worker.cjs pair --root <folder>" for a new one'), {status: 401}); }
    if (!equal(sha(String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')), p.codeSha256)) {
      p.attempts++; failures.push(Date.now());
      if (p.attempts >= 5) { fs.rmSync(pairingFile, {force: true}); throw Object.assign(Error('wrong pairing code; the code is now invalid (too many attempts)'), {status: 401}); }
      secureWrite(pairingFile, JSON.stringify(p)); throw Object.assign(Error('wrong pairing code'), {status: 401});
    }
    fs.rmSync(pairingFile, {force: true});
    const client = {id: 'c-' + crypto.randomBytes(6).toString('hex'), name: String(name || 'Forge').slice(0, 80), origin: origin ?? null, secret: crypto.randomBytes(32).toString('base64'), created: now(), lastSeen: Date.now()};
    saveClients([...clients(), client]);
    return client;
  }
  function revoke(id) { const list = clients(), left = list.filter(c => c.id !== id); saveClients(left); return list.length !== left.length; }
  return {screen, cors, authorize, pair, revoke, clients: () => clients().map(({secret, ...c}) => c)};
}
function serve(root, forgePath, port) {
  const tokenFile = path.join(root, 'token'), idFile = path.join(root, 'worker-id');
  const adminToken = opt('token') || (fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : crypto.randomBytes(24).toString('hex'));
  secureWrite(tokenFile, adminToken);
  const workerId = fs.existsSync(idFile) ? fs.readFileSync(idFile, 'utf8').trim() : 'w-' + crypto.randomBytes(5).toString('hex'); secureWrite(idFile, workerId);
  const allowOrigins = String(opt('allow-origin') || '').split(',').map(s => s.trim()).filter(Boolean);
  const sec = security(root, {port, allowOrigins, adminToken}), editorSha = sha(fs.readFileSync(forgePath));
  const state = {stopping: false, current: null, started: now()};
  const server = http.createServer((req, res) => {
    const reply = (code, body) => { res.writeHead(code, {'content-type': 'application/json', 'cache-control': 'no-store', ...sec.cors(req)}); res.end(JSON.stringify(body)); };
    const refused = sec.screen(req); if (refused) { res.writeHead(refused.status, {'content-type': 'application/json'}); return res.end(JSON.stringify({error: refused.error})); }
    if (req.method === 'OPTIONS') return reply(204, {});
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reply(413, {error: 'request too large'}); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (size > MAX_BODY) return;
      const body = Buffer.concat(chunks).toString('utf8');
      try {
        const url = new URL(req.url, 'http://127.0.0.1'), parts = url.pathname.split('/').filter(Boolean);
        if (req.method === 'POST' && url.pathname === '/pair') { const a = JSON.parse(body || '{}'); const c = sec.pair(a.code, a.name, req.headers.origin); log('paired client', c.id, c.name); return reply(200, {clientId: c.id, secret: c.secret, workerId}); }
        const auth = sec.authorize(req, url.pathname + url.search, body); if (auth.status) return reply(auth.status, {error: auth.error});
        if (req.method === 'GET' && url.pathname === '/status') return reply(200, {format: 'NESForgeAgentStatus', version: 2, worker: {id: workerId, pid: process.pid, started: state.started, state: state.current ? 'running' : 'idle', current: state.current, editorSha256: editorSha}, client: auth.client ? {id: auth.client.id, name: auth.client.name} : null, jobs: listJobs(root).map(summary)});
        if (req.method === 'POST' && url.pathname === '/jobs') { const a = JSON.parse(body || '{}'); const r = enqueue(root, {romBytes: Buffer.from(String(a.rom || ''), 'base64'), romName: a.name, planSpec: typeof a.plan === 'string' ? a.plan : undefined, plan: typeof a.plan === 'object' ? a.plan : undefined, verify: a.verify === 'cold' ? 'cold' : 'restore', editorSha, requestedBy: auth.client?.id || 'admin', reason: typeof a.reason === 'string' ? a.reason.slice(0, 40) : null, allowDuplicate: a.rerun === true}); return reply(r.duplicate ? 200 : 201, {...summary(r.job), duplicate: !!r.duplicate}); }
        if (req.method === 'POST' && parts[0] === 'jobs' && parts[1] && ['pause', 'resume', 'cancel'].includes(parts[2]) && parts.length === 3) return reply(200, summary(control(root, parts[1], parts[2])));
        if (req.method === 'GET' && parts[0] === 'jobs' && parts[1] && parts[2] === 'bundle') return reply(200, bundle(root, parts[1]));
        if (req.method === 'GET' && parts[0] === 'jobs' && parts[1] && parts[2] === 'rom') { const job = loadJob(root, parts[1]); return reply(200, {name: job.rom.name, sha256: job.rom.sha256, rom: fs.readFileSync(path.join(root, 'roms', job.rom.sha256 + '.nes')).toString('base64')}); }
        if (req.method === 'DELETE' && parts[0] === 'clients' && parts[1] && (auth.who === 'admin' || auth.client?.id === parts[1])) return reply(200, {revoked: sec.revoke(parts[1])});
        return reply(404, {error: 'unknown request'});
      } catch (e) { return reply(e.status || 400, {error: String(e.message).slice(0, 300)}); }
    });
  });
  server.listen(port, '127.0.0.1', () => {
    log('listening on http://127.0.0.1:' + port + ' (loopback only) · worker ' + workerId);
    log('pairing code ' + newPairing(root) + ' · valid 10 minutes, single use · enter it in Forge › Background investigation › Pair');
    log('scripts: admin token in ' + tokenFile + ' (readable only by you); ' + sec.clients().length + ' paired client(s)' + (allowOrigins.length ? ' · extra allowed origins: ' + allowOrigins.join(', ') : ''));
  });
  const shutdown = () => { state.stopping = true; server.close(); setTimeout(() => process.exit(0), 15000).unref(); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  workerLoop(root, forgePath, {state}).catch(e => { log('worker stopped:', e.message); process.exitCode = 1; server.close(); });
  return {server, sec, workerId};
}

// ---------- command line ----------
if (require.main === module) (async () => {
  try {
    if (command === 'serve') return serve(openRoot(opt('root')), path.resolve(opt('forge') || 'NES_Forge.html'), Number(opt('port') || 8787));
    const root = openRoot(opt('root'));
    if (command === 'pair') { console.log('pairing code ' + newPairing(root) + ' · valid 10 minutes, single use (a running worker accepts it)'); return; }
    if (command === 'clients') { const sec = security(root, {port: 0}); if (opt('revoke')) console.log(sec.revoke(opt('revoke')) ? 'revoked ' + opt('revoke') : 'no such client'); else console.log(JSON.stringify(sec.clients(), null, 1)); return; }
    if (command === 'enqueue') { const rom = opt('rom'); if (!rom) throw Error('give --rom'); const {job} = enqueue(root, {romBytes: fs.readFileSync(rom), romName: path.basename(rom), planSpec: opt('plan'), verify: opt('verify') === 'cold' ? 'cold' : 'restore', maxJobMs: opt('max-job-ms') ? Number(opt('max-job-ms')) : undefined}); console.log(JSON.stringify(summary(job), null, 1)); }
    else if (command === 'run') { const state = {stopping: false}; process.on('SIGINT', () => { state.stopping = true; }); process.on('SIGTERM', () => { state.stopping = true; }); await workerLoop(root, path.resolve(opt('forge') || 'NES_Forge.html'), {once: flag('once'), state}); }
    else if (command === 'status') console.log(JSON.stringify(listJobs(root).map(summary), null, 1));
    else if (['pause', 'resume', 'cancel'].includes(command)) console.log(JSON.stringify(summary(control(root, opt('job'), command)), null, 1));
    else { console.error('commands: serve, run, enqueue, status, pause, resume, cancel (see the header of this file)'); process.exitCode = 2; }
  } catch (e) { console.error('agent-lab:', e.message); process.exitCode = 1; }
})();
module.exports = {inspectRom, choosePlan, validatePlan, openRoot, enqueue, control, summary, listJobs, bundle, security, signature, newPairing, serve, STATES};
