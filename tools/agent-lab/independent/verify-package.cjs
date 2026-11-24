#!/usr/bin/env node
'use strict';
// NES Forge AL-EXP-02: independent verification of an experiment package in FCEUX (a development and acceptance-testing
// harness; the standalone editor never needs it).
//
//   node tools/agent-lab/independent/verify-package.cjs PACKAGE.json --out RECEIPT.json [--cartridge FILE.nes]
//
// Reads the package, takes the cartridge (embedded, or the locally supplied file, which must have the recorded SHA-256),
// rebuilds each job's variant from its recorded mutations, runs every job in FCEUX from power-on with the recorded
// latch masks, normalizes FCEUX's captures and compares them with NES Forge's, judges every prediction on FCEUX's
// captures alone (the withheld-screen claims re-decoded here from the frozen definition), and writes a sealed
// NESForgeIndependentVerification receipt. If FCEUX cannot run, the receipt says "blocked" and nothing is verified.
// Exit codes: 0 verified, 1 failed, 2 usage or invalid package, 3 blocked.
const fs = require('node:fs'), path = require('node:path');
const APP = path.join(__dirname, '../../../app/src/re');
const C = require(path.join(APP, 'experiment-contract.js')), V = require(path.join(APP, 'experiment-verification.js')), P = require(path.join(APP, 'experiment-package.js'));
const FCEUX = require('./fceux.cjs');
const ORDERS = {row: {TL: 0, TR: 1, BL: 2, BR: 3}, column: {TL: 0, BL: 1, TR: 2, BR: 3}}, QUADS = ['TL', 'TR', 'BL', 'BR'];
const b64 = u => Buffer.from(u).toString('base64');

// the harness's own decoder for a frozen definition's claims (not NES Forge's finder)
function decode(def, rom, id) { const t = def.table, f = ORDERS[t.order]; return QUADS.map(q => rom[t.physicalBase + id * t.recordStep + f[q] * t.fieldStep]); }

function verifyPackage(input, {cartridge = null, fceux = null, log = () => {}} = {}) {
  const pkg = JSON.parse(JSON.stringify(input)); // the harness never modifies the caller's package
  const v = P.validate(pkg); if (!v.ok) throw Object.assign(Error('invalid package: ' + v.problems.join('; ')), {code: 2});
  const rom = P.cartridgeBytes(pkg, cartridge), layout = C.romLayout(rom), mirroring = pkg.verification.mirroring || layout.mirroring;
  const session = fceux || FCEUX.open();
  const subject = {packageHash: pkg.packageHash, definitionHash: pkg.candidate?.definitionHash || null, cartridgeSha256: pkg.cartridge.sha256};
  const limitations = ['OAM is not compared: FCEUX 2.6 exposes no OAM read to Lua (the fixtures draw no sprites)', 'audio is not compared',
    'frames are numbered differently by the two engines; the program\'s NMI entries and $4016 latches are the common clock', 'the comparison code is NES Forge\'s (shared with the editor); the execution is FCEUX\'s'];
  if (!session.available) {
    const receipt = V.sealIndependent({format: V.FORMATS.independent, version: V.version, engine: {name: 'FCEUX', version: 'unavailable', reason: session.reason}, forgeEngine: pkg.manifest.engine, subject, jobs: [], comparisons: [], predictions: [], verdict: {result: 'blocked', reason: session.reason}, discrepancies: [], limitations, independent: true});
    return {receipt, blocked: true};
  }
  const jobs = [], comparisons = [], predictions = [], jobTimes = [], t0 = Date.now(); // run times stay outside the sealed body
  const forgeJobs = pkg.verification.jobs;
  const independentNorm = new Map();
  try {
    for (const fj of forgeJobs) {
      // a private package stores a mutation as offset + XOR mask: the original byte comes from the local cartridge
      const job = fj.job, mutations = C.validateMutations(rom, layout, (job.mutations || []).map(m => m.xor !== undefined ? {offset: m.offset, expected: rom[m.offset], value: rom[m.offset] ^ m.xor} : m)), variant = mutations.length ? C.buildVariant(rom, pkg.cartridge.sha256, mutations) : {bytes: rom, sha256: pkg.cartridge.sha256};
      if (variant.sha256 !== job.variantSha256) throw Object.assign(Error('job ' + job.id + ': the rebuilt variant does not match the recorded SHA-256'), {code: 2});
      log('job ' + job.id);
      const r = session.run({id: job.id, rom: variant.bytes, nmiTarget: job.nmiTarget, latches: job.latches, defaultMask: job.defaultMask, checkpoints: job.checkpoints, maxFrames: job.maxFrames, trace: job.trace, chr: job.chr, pixels: job.pixels});
      if (!r.ok) { jobs.push({id: job.id, kind: job.kind, cartridgeSha256: variant.sha256, mutations: job.mutations, result: {stopReason: r.reason}, captures: []}); continue; }
      const caps = r.captures.map(c => { const n = V.normalize(c, {engine: 'fceux', mirroring, colourClass: forgeColourClass(pkg)}); independentNorm.set(job.id + ':' + c.label, n); return {label: c.label, nmi: c.nmi, frame: c.frame, latches: c.latches, digests: V.digestAll(n),
        payloads: Object.fromEntries(['cpu', 'ram', 'nametables', 'attributes', 'palette'].filter(ch => n.channels[ch]).map(ch => [ch, b64(n.channels[ch])]))}; });
      jobs.push({id: job.id, kind: job.kind, cartridgeSha256: variant.sha256, mutations: job.mutations, result: {frames: r.frames, nmis: r.nmis, latches: r.latches, multiLatchFrames: r.multiLatchFrames, missing: r.missing ? job.checkpoints.filter(cp => !r.captures.some(c => c.label === cp.label)).map(cp => cp.label) : []}, captures: caps});
      jobTimes.push({id: job.id, ms: r.ms});
      // compare with NES Forge's captures of the same job
      for (const fc of fj.forge.captures) {
        const ic = caps.find(c => c.label === fc.label);
        if (!ic) { comparisons.push({job: job.id, label: fc.label, agree: false, discrepancies: [{channel: 'all', classification: 'checkpoint not reached on FCEUX'}]}); continue; }
        const forgeSide = {digests: fc.digests, channels: Object.fromEntries(Object.entries(fc.channels).filter(([, x]) => x.availability === 'embedded').map(([ch, x]) => [ch, Uint8Array.from(Buffer.from(x.base64, 'base64'))]))};
        const indep = independentNorm.get(job.id + ':' + fc.label);
        comparisons.push({job: job.id, label: fc.label, nmi: fc.nmi, frames: {forge: fc.frame, fceux: ic.frame}, ...V.compareByDigest(forgeSide, {channels: indep.channels, digests: ic.digests})});
      }
    }
    // predictions, judged on FCEUX's captures alone
    const base = label => independentNorm.get('training-baseline:' + label);
    for (const fj of forgeJobs) {
      const e = fj.expectation;
      if (e.kind === 'prediction' || e.kind === 'no-effect') for (const cp of fj.job.checkpoints) { const n = independentNorm.get(fj.job.id + ':' + cp.label), b = base(cp.label); if (!n || !b) { predictions.push({job: fj.job.id, label: cp.label, kind: e.kind, holds: false, error: 'capture missing on FCEUX'}); continue; }
        predictions.push({job: fj.job.id, label: cp.label, kind: e.kind, engine: 'FCEUX', ...(e.kind === 'prediction' ? V.checkPrediction(b, n, e.predict.filter(p => p.label === cp.label)) : V.checkNoEffect(b, n))}); }
      if (e.kind === 'claims') {
        const n = independentNorm.get(fj.job.id + ':' + fj.job.checkpoints[0]?.label);
        if (pkg.candidate) completeClaims(e.claims, pkg.candidate, rom);
        // re-derive each claimed cell's tiles with this harness's own decoder and the frozen definition
        const def = pkg.candidate, mismatched = def ? e.claims.cells.filter(c => decode(def, rom, c.ids[0]).join() !== c.tiles.join()).length : null;
        if (!n) predictions.push({job: fj.job.id, kind: 'claims', holds: false, error: 'capture missing on FCEUX'});
        else predictions.push({job: fj.job.id, label: n.label, kind: 'claims', engine: 'FCEUX', claimsRedecoded: mismatched === 0, ...V.checkClaims(n, e.claims), ...(mismatched ? {holds: false, error: mismatched + ' claimed cells do not decode to their stated tiles'} : {})});
      }
    }
  } finally { if (!fceux) session.close(); }
  const verdict = V.verdictOf({comparisons, predictions, hasCandidate: !!pkg.candidate});
  const discrepancies = comparisons.filter(c => !c.agree).map(c => ({job: c.job, label: c.label, discrepancies: c.discrepancies}));
  const receipt = V.sealIndependent({format: V.FORMATS.independent, version: V.version, engine: {...session.identity, lua: jobs.find(j => j.captures.length) ? 'Lua 5.1' : null}, forgeEngine: pkg.manifest.engine, subject, jobs, comparisons, predictions, verdict, discrepancies, limitations, independent: true, timing: {ms: Date.now() - t0, jobs: jobTimes}});
  return {receipt};
}
// A private package's claims carry cell IDs only: tiles and attribute bits are re-derived here from the frozen definition
// and the local cartridge (the harness's own decoder), exactly as the definition states them.
function completeClaims(claims, def, rom) {
  for (const c of claims.cells) if (!c.tiles) c.tiles = decode(def, rom, c.ids[0]);
  if (claims.attributes.some(a => a.value === undefined)) {
    const pal = def.attributes ? id => { const v = rom[def.attributes.physicalBase + id]; return def.attributes.decode === 'low2' ? v & 3 : v >> 6; } : null;
    const byCell = new Map(claims.cells.map(c => [c.cell[1] * 16 + c.cell[0], c]));
    for (const a of claims.attributes) { if (a.value !== undefined || !pal) continue; let value = 0; const ay = a.index >> 3, ax = a.index & 7;
      for (const [dy, dx, shift] of [[0, 0, 0], [0, 1, 2], [1, 0, 4], [1, 1, 6]]) { const c = byCell.get((2 * ay + dy) * 16 + 2 * ax + dx); if (c && (a.knownMask >> shift & 3)) value |= pal(c.ids[0]) << shift; }
      a.value = value; }
  }
}
// NES Forge compares pictures as colour classes (indices its palette table draws identically share a class); the
// package records that 64-entry table, and FCEUX's indices are reduced with the same table.
function forgeColourClass(pkg) { const cc = pkg.verification.colourClass; return cc ? Uint8Array.from(cc) : null; }

if (require.main === module) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find(a => !a.startsWith('--') && a !== opt('--out') && a !== opt('--cartridge')), out = opt('--out');
  if (!file || !out) { console.error('usage: verify-package.cjs PACKAGE.json --out RECEIPT.json [--cartridge FILE.nes]'); process.exit(2); }
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8')), cartridge = opt('--cartridge') ? new Uint8Array(fs.readFileSync(opt('--cartridge'))) : null;
    const {receipt, blocked} = verifyPackage(pkg, {cartridge, log: m => process.stderr.write(m + '\n')});
    fs.writeFileSync(out, JSON.stringify(receipt, null, 1) + '\n');
    console.log(JSON.stringify({verdict: receipt.verdict, engine: receipt.engine.name + ' ' + receipt.engine.version, jobs: receipt.jobs.length, checkpoints: receipt.comparisons.length, predictions: receipt.predictions.length, discrepancies: receipt.discrepancies.length, receiptHash: receipt.receiptHash}));
    process.exit(blocked ? 3 : ['verified', 'reproduced'].includes(receipt.verdict.result) ? 0 : 1);
  } catch (error) { console.error(error.message); process.exit(error.code === 2 ? 2 : 1); }
}
module.exports = {verifyPackage, decode};
