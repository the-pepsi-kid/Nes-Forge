'use strict';
// AL-EXP-02 acceptance: independent experimental verification and reproducible evidence, on original synthetic NROM
// fixtures only.
//   node QA/al-exp-02.cjs <editor.html> <report.json> [artifacts directory]
//   AL_EXP_02_SEEDS=development   the development fixtures only (the withheld fixtures are for acceptance runs)
// The independent emulator is FCEUX (tools/agent-lab/independent). If it cannot run here, every check that needs it is
// reported BLOCKED (never PASS) and the rest still runs.
// Discovery runs blind in the editor's sandbox; each fixture's truth file is read only after the discovery report, the
// exported package and the independent receipt exist. The oracle (QA/fixtures/al-exp-02/oracle.cjs) shares no code with
// the editor.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), {spawnSync} = require('node:child_process');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname, '..'), FX = path.join(ROOT, 'QA/fixtures/al-exp-02'), FX1 = path.join(ROOT, 'QA/fixtures/al-exp-01');
const [editorArg, output, artifacts] = process.argv.slice(2);
const editor = path.resolve(editorArg || path.join(ROOT, 'NES_Forge.html'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const APP = path.join(ROOT, 'app/src/re');
const Contract = require(path.join(APP, 'experiment-contract.js')), Finder = require(path.join(APP, 'metatile-finder.js')), V = require(path.join(APP, 'experiment-verification.js'));
const Life = require(path.join(APP, 'experiment-lifecycle.js')), Promo = require(path.join(APP, 'experiment-promotion.js')), Pkg = require(path.join(APP, 'experiment-package.js'));
const gen = require(path.join(FX, 'generate.cjs')), oracle = require(path.join(FX, 'oracle.cjs'));
const FCEUX = require(path.join(ROOT, 'tools/agent-lab/independent/fceux.cjs')), VP = require(path.join(ROOT, 'tools/agent-lab/independent/verify-package.cjs'));
const report = {suite: 'al-exp-02', editorSha256: sha(fs.readFileSync(editor)), checks: [], fixtures: [], metrics: {}, measurements: {}, independentEngine: null};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, status: passed ? 'pass' : 'fail', detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 1500))); };
const blocked = (name, reason) => { report.checks.push({name, passed: null, status: 'blocked', detail: reason}); console.log('BLOCKED ' + name + ' — ' + reason); };
const throws = fn => { try { fn(); return null; } catch (e) { return e.message; } };
const msg = e => String(e?.message ?? e ?? '');
if (artifacts) fs.mkdirSync(artifacts, {recursive: true});
const seedsDoc = gen.committed(), development = seedsDoc.fixtures.filter(f => f.role === 'development');
const withheld = process.env.AL_EXP_02_SEEDS === 'development' ? [] : seedsDoc.fixtures.filter(f => f.role === 'withheld');
const romOf = f => new Uint8Array(fs.readFileSync(gen.files(f).rom));
const truthOf = f => JSON.parse(fs.readFileSync(gen.files(f).truth, 'utf8'));
const designOf = truth => k => ({steps: truth.inputs[k].steps, captures: truth.inputs[k].captures.map(c => ({label: c.label, frame: c.frame}))});
// The input design is the same for every AL-EXP-02 fixture (Right twice for the training screens, B for the withheld one):
// discovery gets it from here, never from a truth file; the suite checks afterwards that each truth file agrees.
const INPUTS = {training: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['Right']}, {frames: 56, buttons: []}, {frames: 4, buttons: ['Right']}, {frames: 56, buttons: []}], captures: [{label: 'scene-0', frame: 60}, {label: 'scene-1', frame: 120}, {label: 'scene-2', frame: 180}]},
  holdout: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['B']}, {frames: 56, buttons: []}], captures: [{label: 'holdout', frame: 120}]}};
const sameInputs = truth => ['training', 'holdout'].every(k => JSON.stringify(designOf(truth)(k)) === JSON.stringify(INPUTS[k]));

(async () => {
  // =================================================================================================================
  // Node: fixtures, independence of the oracle, separation, contract, lifecycle, promotion
  // =================================================================================================================
  const regen2 = spawnSync(process.execPath, [path.join(FX, 'generate.cjs'), '--check'], {encoding: 'utf8'}), regen1 = spawnSync(process.execPath, [path.join(FX1, 'generate.cjs'), '--check'], {encoding: 'utf8'});
  const scenarios = seedsDoc.fixtures.reduce((m, f) => { m[f.scenario] = (m[f.scenario] || 0) + 1; return m; }, {});
  check('Fixtures: all 22 AL-EXP-02 fixtures (11 development, 11 withheld; ' + Object.keys(scenarios).length + ' scenarios) and every AL-EXP-01 fixture regenerate byte for byte from their seeds',
    regen2.status === 0 && regen1.status === 0 && seedsDoc.fixtures.length === 22, {al02: regen2.stdout.trim(), al01: regen1.stdout.trim(), scenarios});
  // the fixtures themselves, in the independent emulator: each draws its four truth screens (a check of the generator,
  // not of discovery); the guard fixture's checksum switches drawing to its backup copy
  const fx = FCEUX.open(); report.independentEngine = fx.available ? fx.identity : {available: false, reason: fx.reason};
  if (fx.available) {
    const train = [...Array(50).fill(0), ...Array(4).fill(0x80), ...Array(56).fill(0), ...Array(4).fill(0x80), ...Array(60).fill(0)], hold = [...Array(50).fill(0), ...Array(4).fill(0x02), ...Array(60).fill(0)];
    const rows = [];
    for (const f of seedsDoc.fixtures) {
      const rom = romOf(f), truth = truthOf(f), nmiTarget = rom[16 + 0x3ffa] | (rom[16 + 0x3ffb] << 8);
      const eq = (c, i) => !!c && Buffer.from(c.ppu.subarray(0, 0x3c0)).toString('hex') === truth.expected[i].nametable && Buffer.from(c.ppu.subarray(0x3c0, 0x400)).toString('hex') === truth.expected[i].attributes;
      const a = fx.run({id: 't', rom, nmiTarget, latches: train, checkpoints: [{label: 's0', nmi: 45}, {label: 's1', nmi: 105}, {label: 's2', nmi: 170}], maxFrames: 400});
      const b = fx.run({id: 'h', rom, nmiTarget, latches: hold, checkpoints: [{label: 'h', nmi: 100}], maxFrames: 300});
      let guard = null;
      if (truth.guard) { const v = new Uint8Array(rom); for (const m of truth.patches.guardTrip) v[m.offset] = m.value; const g = fx.run({id: 'g', rom: v, nmiTarget, latches: train, checkpoints: [{label: 's0', nmi: 45}], maxFrames: 200, trace: true});
        guard = {sameScreen: eq(g.captures?.[0], 0), backupReads: g.captures?.[0]?.reads.filter(r => { const p = 16 + ((r[1] - 0x8000) & 0x3fff); return p >= truth.guard.backup && p < truth.guard.backup + truth.regions.backup.length; }).length || 0}; }
      rows.push({seed: f.seed, scenario: f.scenario, screens: a.ok && b.ok && [0, 1, 2].every(i => eq(a.captures[i], i)) && eq(b.captures[0], 3), guard});
    }
    check('Fixtures in the independent emulator: every fixture draws its four truth screens in FCEUX; tripping the guard\'s checksum draws the same screen from the backup copy', rows.every(r => r.screens && (!r.guard || (r.guard.sameScreen && r.guard.backupReads > 0))), rows.filter(r => !r.screens || r.guard));
  } else blocked('Fixtures in the independent emulator', fx.reason);
  // separation
  const appRefs = ['generate.cjs', 'asm6502.cjs', 'oracle.cjs'].filter(n => /require\([^)]*app\//.test(fs.readFileSync(path.join(FX, n), 'utf8')));
  const discoveryFiles = ['metatile-finder.js', 'experiment-discovery.js', 'experiment-runner.js', 'bus-observer.js', 'experiment-sandbox.js', 'experiment-verification.js', 'experiment-lifecycle.js', 'experiment-package.js', 'experiment-promotion.js'];
  const leaks = discoveryFiles.flatMap(n => { const t = fs.readFileSync(path.join(APP, n), 'utf8'); return ['truth', 'seeds.json', 'QA/fixtures', 'readFile', 'fetch(', 'XMLHttpRequest', 'al-exp-02-fixture', 'scenario'].filter(w => t.includes(w)).map(w => n + ': ' + w); });
  const html = fs.readFileSync(editor, 'utf8'), inBuild = ['NESForgeSyntheticFixtureTruth', 'al-exp-02-fixture/1', 'unusedDataStyles', 'confounded-guard', 'insufficient-observations'].filter(w => html.includes(w));
  const markers = seedsDoc.fixtures.map(f => { const rom = romOf(f), text = Buffer.from(rom.subarray(16 + 0x3f00, 16 + 0x3f00 + 80)).toString('latin1').split('\0')[0]; return {seed: f.seed, text, prefix: text.startsWith(Contract.SYNTHETIC_MARKER),
    // the documented form only: the gate prefix and 48 random [a-z0-9]; never a generator name, scenario or "seed"; a seed of six or more digits would not
    // appear by chance (a two-digit seed can, in random filler that includes digits)
    carriesSeed: !/^NESFORGE-SYNTHETIC\/1 [a-z0-9]{48}$/.test(text) || /seed|al-exp|scenario/.test(text) || text.includes(f.scenario) || (String(f.seed).length >= 6 && text.includes(String(f.seed)))}; });
  check('Separation: the generator and oracle import nothing from the editor; discovery, verification, lifecycle, package and promotion code names no fixture answers and reads no files; the build carries no generator, oracle or truth; no AL-EXP-02 cartridge carries its seed, scenario or generator name',
    !appRefs.length && !leaks.length && !inBuild.length && markers.every(m => m.prefix && !m.carriesSeed), {appRefs, leaks, inBuild, markers: markers.filter(m => !m.prefix || m.carriesSeed)});
  // the withheld seeds were declared before any AL-EXP-02 generator or discovery change (git history)
  const git = (...a) => spawnSync('git', a, {cwd: ROOT, encoding: 'utf8'});
  const seedsCommit = git('log', '--diff-filter=A', '--format=%H', '--', 'QA/fixtures/al-exp-02/seeds.json').stdout.trim().split('\n').pop();
  const codeCommits = git('log', '--format=%H', seedsCommit + '..HEAD', '--', 'app/src/re/experiment-discovery.js', 'app/src/re/metatile-finder.js', 'QA/fixtures/al-exp-02/generate.cjs').stdout.trim().split('\n').filter(Boolean);
  const firstGen = git('log', '--diff-filter=A', '--format=%H', '--', 'QA/fixtures/al-exp-02/generate.cjs').stdout.trim().split('\n').pop();
  if (seedsCommit) check('History: the 22 seeds (11 withheld, drawn from /dev/urandom) were committed before the AL-EXP-02 generator and every discovery change',
    !!firstGen && git('merge-base', '--is-ancestor', seedsCommit, firstGen).status === 0 && seedsCommit !== firstGen && codeCommits.every(c => git('merge-base', '--is-ancestor', seedsCommit, c).status === 0), {seedsCommit: seedsCommit.slice(0, 10), generatorAdded: firstGen.slice(0, 10), laterCodeCommits: codeCommits.length});
  else blocked('History: seeds declared before code', 'no git history available');
  // contract: candidates stay candidates; revisions start untested
  const base = {format: 'NESForgeCandidateDefinition', version: 2, kind: 'metatile-table-2x2', status: 'candidate', hypothesis: 'supported', source: {sha256: 'a'.repeat(64), byteLength: 24592},
    table: {layout: 'interleaved', order: 'row', physicalBase: 1000, cpuBase: null, recordStep: 4, fieldStep: 1, grid: {x: 0, y: 0}, baseEvidence: {}, numbering: 'operand-evidence'}, attributes: null, extent: {knownIds: [0], lowest: 0, highest: 0}, aliases: [],
    evidence: {plans: [], interventions: [{result: 'supported', receipt: 'r1'}]}, verification: {repeatability: 'x', interventions: 'x', independent: 'not performed'}, limitations: [],
    revision: {number: 1, previous: null, reason: 'frozen'}, decoder: {name: 'metatile-2x2', version: 1}, assumptions: {mapper: 'NROM', banking: 'none', mirroring: 'vertical', screen: 'unscrolled'}, unsupported: []};
  const sealed = Contract.sealCandidate(base), rev = Contract.reviseCandidate(sealed, {table: {...sealed.table, physicalBase: 1004}}, 'shifted by one record after evaluation');
  const contractCases = {v2: Contract.verifyCandidate(sealed).ok, v1StillReadable: (() => { const {revision, decoder, assumptions, unsupported, ...v1} = base, {numbering, ...table} = base.table; return Contract.verifyCandidate(Contract.sealCandidate({...v1, version: 1, table})).ok; })(),
    markedVerified: !!throws(() => Contract.sealCandidate({...base, status: 'verified'})), markedIndependent: !!throws(() => Contract.sealCandidate({...base, hypothesis: 'independently_verified'})),
    revisionUntested: rev.revision.number === 2 && rev.revision.previous === sealed.definitionHash && rev.hypothesis === 'proposed' && !rev.evidence.interventions.length, revisionCannotChangeStatus: !!throws(() => Contract.reviseCandidate(sealed, {status: 'verified'}, 'x'))};
  check('Contract: v2 candidate definitions (revision, decoder, assumptions, unsupported cases, record numbering) seal and verify, v1 stays readable; no definition can be marked verified or independently verified; a changed definition is a new revision that starts untested and names the one it replaces',
    Object.values(contractCases).every(Boolean), contractCases);
  // lifecycle: every state documented; nothing reaches "verified" without an independent receipt about this definition
  const documented = [...Life.STATES, ...Life.SIDE].every(s => typeof Life.REQUIREMENTS[s] === 'string' && Life.REQUIREMENTS[s].length > 20);
  const noEvidence = Life.assess({}), onlyScreens = Life.assess({discovery: {stages: {observe: {repeatability: 'passed', trace: {}}, propose: {ranked: [{id: 'x', coverage: 1}]}}, plans: [{receipts: [{trial: 'baseline-cold-1', receiptHash: 'h'}]}], result: {classification: 'insufficient-evidence', reason: 'r'}}});
  check('Lifecycle: every state and side state has a documented evidence requirement; with no evidence the state is uninvestigated; a hypothesis that explains 100% of the screens but was never tested stays a hypothesis (no score promotes anything)',
    documented && noEvidence.state === 'uninvestigated' && onlyScreens.state === 'hypothesis' && onlyScreens.side === 'inconclusive', {states: Life.STATES, side: Life.SIDE, noEvidence: noEvidence.state, onlyScreens: [onlyScreens.state, onlyScreens.side]});
  const promoKeys = Object.keys(Promo), unverifiedPreview = Promo.preview({definition: sealed, rom: new Uint8Array(24592), assessment: {state: 'same-engine-repeatable', side: null, definitionHash: sealed.definitionHash}});
  check('Promotion contract: destinations listed with what each can take; an unverified candidate is not eligible and its preview is empty; the module has no function that writes, promotes, registers or commits anything',
    !unverifiedPreview.eligible && !unverifiedPreview.records.length && !promoKeys.some(k => /write|promote|register|commit|apply/i.test(k)) && Object.keys(Promo.DESTINATIONS).length === 7, {promoKeys, unmet: unverifiedPreview.unmet, destinations: Object.keys(Promo.DESTINATIONS)});
  const fakeEngine = throws(() => V.sealIndependent({format: V.FORMATS.independent, version: 1, engine: {name: 'NES Forge', version: '1'}, forgeEngine: {}, subject: {cartridgeSha256: 'a'.repeat(64)}, jobs: [], comparisons: [], predictions: [], verdict: {result: 'verified', reason: ''}, discrepancies: [], limitations: [], independent: true}));
  check('Independent receipts: NES Forge cannot be its own independent verifier; a receipt must say independent: true and name its engine and version', !!fakeEngine, fakeEngine);

  // =================================================================================================================
  // Chromium: the standalone editor from file://
  // =================================================================================================================
  const browser = await chromium.launch({args: ['--enable-precise-memory-info']}), context = await browser.newContext({viewport: {width: 1280, height: 2400}}), page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push('page: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  context.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) requests.push(u); });
  await page.goto('file://' + editor); await page.waitForFunction(() => window.Forge && Forge.commands && Forge.services.ExperimentSandbox && Forge.services.ResourceLibrary && Forge.services.ExperimentUI, null, {timeout: 180000});
  const run = (name, args) => page.evaluate(async ([n, a]) => { const r = await Forge.commands.run(n, a); return r; }, [name, args]);
  const liveRom = fs.readFileSync(path.join(ROOT, 'QA/r/game.nes'));
  const loaded = await run('emulator.load', {bytes: Array.from(liveRom), name: 'game.nes'}); await run('emulator.frames', {count: 90});
  const registered = await run('library.registerFrame', {label: 'live frame before experiments'});
  const liveDigest = () => page.evaluate(async () => {
    const h = async b => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b instanceof Uint8Array ? b : new TextEncoder().encode(b))), x => x.toString(16).padStart(2, '0')).join('');
    const L = Forge.services.ResourceLibrary, status = await L.status(), entries = await L.list({});
    return {emulator: await h(JSON.stringify({A: emu.A, X: emu.X, Y: emu.Y, SP: emu.SP, PC: emu.PC, cycles: emu.cycles, frame: emu.frameCount, ram: Array.from(emu.ram), vram: Array.from(emu.vram), pal: Array.from(emu.palRam), oam: Array.from(emu.oamMem)})),
      rom: await h(emu.lastBuiltRom), project: await h(Forge.services.ProjectStore.serialize()), library: await h(JSON.stringify({entries: status.entries ?? null, packs: status.packs ?? null, list: entries})),
      libraryEntries: entries?.total ?? entries?.items?.length ?? null, databases: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name).sort() : null, iframes: document.querySelectorAll('iframe').length};
  });
  const liveBefore = await liveDigest();
  check('Live editor set up before any experiment: an authored cartridge running, a frame in the library, the default project', loaded.ok && registered.ok && liveBefore.libraryEntries >= 1, {liveBefore});
  const pcdp = await context.newCDPSession(page), heap = async () => { await pcdp.send('HeapProfiler.collectGarbage'); return (await pcdp.send('Runtime.getHeapUsage')).usedSize; };
  const heapBefore = await heap();

  // ---- blind discovery on every fixture: discovery, package, independent emulator, re-check, then the oracle ----
  const pkgs = new Map(), receipts = new Map();
  const discoverOne = async rom => {
    const t0 = Date.now();
    const r = await run('experiment.discoverMetatiles', {bytes: Array.from(rom), training: INPUTS.training, holdout: INPUTS.holdout});
    if (!r.ok) return {error: r.error};
    const d = r.result, ms = Date.now() - t0;
    const ex = await run('experiment.exportPackage', {}); if (!ex.ok) return {error: 'export: ' + ex.error, d};
    const pkg = ex.result, valid = Pkg.validate(pkg);
    let receipt = null, attached = null, vms = null;
    if (fx.available) { const t1 = Date.now(); try { receipt = VP.verifyPackage(pkg, {fceux: fx}).receipt; } catch (e) { receipt = {error: e.message}; } vms = Date.now() - t1;
      if (receipt && !receipt.error) { const at = await run('experiment.attachVerification', {receipt}); attached = at.ok ? at.result : {error: at.error}; } }
    const life = (await run('experiment.lifecycle', {})).result;
    return {d, pkg, valid, receipt, attached, life, ms, verifyMs: vms};
  };
  const rows = [];let rep11 = null;
  for (const f of [...development, ...withheld]) {
    const rom = romOf(f), out = await discoverOne(rom);
    const truth = truthOf(f); // read now, after discovery, the package and the independent receipt exist
    if (!sameInputs(truth)) { rows.push({seed: f.seed, scenario: f.scenario, role: f.role, error: 'the fixture\'s input design differs from the suite\'s'}); continue; }
    if (f.role === 'development' && f.scenario === 'standard' && !rep11 && out.d) rep11 = out.d;
    if (out.error) { rows.push({seed: f.seed, scenario: f.scenario, role: f.role, error: out.error}); console.log('seed ' + f.seed + ' ' + f.scenario + ': ERROR ' + out.error); continue; }
    pkgs.set(f.seed, out.pkg); if (out.receipt && !out.receipt.error) receipts.set(f.seed, out.receipt);
    const ev = oracle.evaluate(truth, out.d, rom, {independent: out.attached && !out.attached.error ? {verdict: {result: out.attached.verdict.result}, comparisons: Array(out.attached.checkpoints).fill(0).map((_, i) => ({agree: i < out.attached.agree})), predictions: Array(out.attached.predictions).fill(0).map((_, i) => ({holds: i < out.attached.predictionsHold}))} : null});
    const independentRow = out.receipt?.error ? {error: out.receipt.error} : out.receipt ? {verdict: out.receipt.verdict.result, editorRecheck: out.attached?.verdict?.result ?? out.attached?.error, matchesReceipt: out.attached?.matchesReceipt ?? null,
      checkpoints: out.receipt.comparisons.length, agree: out.receipt.comparisons.filter(c => c.agree).length, timingOnly: out.receipt.comparisons.filter(c => c.channels?.ram?.status === 'equal-except-timing').length, predictions: out.receipt.predictions.length, hold: out.receipt.predictions.filter(p => p.holds).length} : {verdict: 'blocked'};
    const row = {seed: f.seed, scenario: f.scenario, role: f.role, expect: truth.expect, classification: out.d.result.classification, oracle: ev.passed, failed: ev.checks.filter(c => !c.passed).map(c => c.name), metrics: ev.metrics,
      lifecycle: {state: out.life.state, side: out.life.side}, packageValid: out.valid.ok, packageKB: Math.round(JSON.stringify(out.pkg).length / 1024), completeness: out.pkg.manifest.completeness.kind,
      independent: independentRow, seconds: Math.round(out.ms / 100) / 10, verifySeconds: out.verifyMs === null ? null : Math.round(out.verifyMs / 100) / 10, sandboxRuns: out.d.sandbox.runs, traceComplete: out.d.stages.observe?.trace?.complete ?? null, frozenBeforeHoldout: !out.d.definition || (out.d.stages.freeze.frozenBeforeHoldout && out.d.holdout?.definitionHash === out.d.definition.definitionHash)};
    rows.push(row); report.fixtures.push({...row, evaluation: ev});
    console.log('seed ' + f.seed + ' ' + f.scenario + ' (' + f.role + '): ' + row.classification + ' (expect ' + row.expect + '), oracle ' + (ev.passed ? 'pass' : 'FAIL ' + row.failed.join('; ')) + ', independent ' + (independentRow.verdict || independentRow.error) + ', lifecycle ' + row.lifecycle.state + (row.lifecycle.side ? '/' + row.lifecycle.side : '') + ', ' + row.seconds + ' s');
  }
  const okRow = r => !r.error && r.oracle && r.classification === r.expect && r.packageValid && r.frozenBeforeHoldout && (!fx.available || (['verified', 'reproduced'].includes(r.independent.verdict) && r.independent.editorRecheck === r.independent.verdict && r.independent.matchesReceipt && r.independent.agree === r.independent.checkpoints && r.independent.hold === r.independent.predictions));
  const lifeOk = r => r.error ? false : r.expect === 'candidate' ? (fx.available ? r.lifecycle.state === 'promotion-eligible' && !r.lifecycle.side : r.lifecycle.state === 'same-engine-repeatable') : r.expect === 'ambiguous' ? r.lifecycle.side === 'ambiguous' : ['inconclusive', 'falsified'].includes(r.lifecycle.side);
  const groupCheck = (title, list) => check(title, list.length > 0 && list.every(okRow) && list.every(lifeOk), list.map(r => ({seed: r.seed, scenario: r.scenario, expect: r.expect, got: r.classification, oracle: r.oracle, failed: r.failed, independent: r.independent, lifecycle: r.lifecycle, error: r.error})));
  groupCheck('Development fixtures (' + development.length + '): each reaches its expected result (candidate, ambiguous, insufficient evidence or inconclusive) as judged by the independent oracle; every package validates; FCEUX agrees at every checkpoint and every prediction holds on it, as NES Forge re-computes from the receipt\'s raw captures; the lifecycle matches (only unambiguous candidates become promotion-eligible)', rows.filter(r => r.role === 'development'));
  if (withheld.length) groupCheck('Withheld fixtures (' + withheld.length + ', never run while the AL-EXP-02 code was built): the same, judged by the same oracle', rows.filter(r => r.role === 'withheld'));
  report.metrics = aggregate(rows);

  // ---- circular verification: discovery cannot use fixture metadata, fixed offsets or labels ----
  const f11 = development.find(f => f.scenario === 'standard'), t11 = truthOf(f11), rom11 = romOf(f11), d11 = report.fixtures.find(x => x.seed === f11.seed);
  const tableOf = d => d && d.definition ? JSON.stringify({...d.definition.table, baseEvidence: undefined}) : null;
  const ref11 = await run('experiment.discoverMetatiles', {bytes: Array.from(rom11), training: INPUTS.training, holdout: INPUTS.holdout});
  const scrambled = new Uint8Array(rom11); for (let i = 16 + 0x3f00 + Contract.SYNTHETIC_MARKER.length; i < 16 + 0x3f00 + 0x80; i++) scrambled[i] = (scrambled[i] * 7 + 13) & 0xff;
  const sc = await run('experiment.discoverMetatiles', {bytes: Array.from(scrambled), training: INPUTS.training, holdout: INPUTS.holdout});
  const renamed = d => ({steps: d.steps, captures: d.captures.map((c, i) => ({label: 'view-' + String.fromCharCode(97 + i), frame: c.frame}))});
  const rn = await run('experiment.discoverMetatiles', {bytes: Array.from(rom11), training: renamed(INPUTS.training), holdout: renamed(INPUTS.holdout)});
  let delta = 0, moved = null; for (const dlt of [64, -64, 128, -128, 256, -256, 512, -512]) { try { moved = gen.generate(f11.seed, f11.scenario, {relocate: dlt}); delta = dlt; break; } catch (_) {} }
  const mv = moved ? await run('experiment.discoverMetatiles', {bytes: Array.from(moved.rom), training: INPUTS.training, holdout: INPUTS.holdout}) : {ok: false, error: 'no free room to relocate'};
  const circ = {referenceBase: ref11.result?.definition?.table.physicalBase, scrambledSameTable: tableOf(sc.result) === tableOf(ref11.result), labelsRenamedSameTable: tableOf(rn.result) === tableOf(ref11.result),
    relocatedBy: delta, relocatedBase: mv.result?.definition?.table.physicalBase, followsTable: mv.ok && mv.result.definition?.table.physicalBase === ref11.result?.definition?.table.physicalBase + delta && mv.result.definition.table.physicalBase === moved.truth.table.physicalBase};
  check('Circular verification: scrambling everything after the marker\'s gate prefix, renaming every capture label, or moving the table by ' + delta + ' bytes changes nothing but the answer\'s offset (it follows the table): discovery uses no fixture metadata, labels or fixed offsets',
    ref11.ok && sc.ok && rn.ok && circ.scrambledSameTable && circ.labelsRenamedSameTable && circ.followsTable, circ);

  // ---- independent verification that must not pass ----
  // (re-establish the standard fixture as the editor's last result, so receipts attach to it)
  if (fx.available) {
    const pkg11 = pkgs.get(f11.seed), receipt11 = receipts.get(f11.seed);
    await run('experiment.discoverMetatiles', {bytes: Array.from(rom11), training: INPUTS.training, holdout: INPUTS.holdout});
    // a forged receipt: one nametable byte of a variant capture changed, re-sealed, still claiming "verified"
    const forged = JSON.parse(JSON.stringify(receipt11)); delete forged.receiptHash; delete forged.timing;
    const j = forged.jobs.find(x => x.id === 'tile-0'), cap = j.captures[0], nt = Buffer.from(cap.payloads.nametables, 'base64'); nt[100] ^= 1; cap.payloads.nametables = nt.toString('base64');
    const forgedSealed = V.sealIndependent(forged), fa = await run('experiment.attachVerification', {receipt: forgedSealed});
    const tampered = JSON.parse(JSON.stringify(receipt11)); tampered.verdict = {result: 'verified', reason: 'edited'}; tampered.jobs[0].captures[0].payloads.palette = Buffer.from(new Uint8Array(32)).toString('base64');
    const ta = await run('experiment.attachVerification', {receipt: tampered});
    const otherDef = JSON.parse(JSON.stringify(receipt11)); delete otherDef.receiptHash; delete otherDef.timing; otherDef.subject.definitionHash = 'b'.repeat(64);
    const oa = await run('experiment.attachVerification', {receipt: V.sealIndependent(otherDef)});
    check('Disagreement stays visible: a receipt whose raw captures disagree with NES Forge in one nametable byte, re-sealed and still claiming "verified", is re-computed by the editor as failed and flagged as not matching its claim; an edited receipt is refused by its seal; a receipt about another definition is refused',
      fa.ok && fa.result.verdict.result === 'failed' && fa.result.matchesReceipt === false && fa.result.lifecycle.side === 'verification-failed' && !ta.ok && /refused|hash/.test(msg(ta.error)) && !oa.ok && /another definition/.test(msg(oa.error)),
      {forged: fa.ok ? {verdict: fa.result.verdict, matchesReceipt: fa.result.matchesReceipt, lifecycle: fa.result.lifecycle.side} : fa.error, tampered: msg(ta.error), other: msg(oa.error)});
    // a deliberately wrong definition (shifted by one record): FCEUX shows its withheld-screen claims fail
    const broken = (() => { const p = JSON.parse(JSON.stringify(pkg11)); const def = oracle.broken(p.candidate); delete def.definitionHash; const sealedBroken = Contract.sealCandidate(def);
      const hold = p.verification.jobs.find(x => x.job.id === 'holdout-baseline'), c = hold.forge.captures[0], ntB = Buffer.from(c.channels.nametables.base64, 'base64'), atB = Buffer.from(c.channels.attributes.base64, 'base64');
      const vram = new Uint8Array(0x1000); vram.set(ntB.subarray(0, 960), 0); vram.set(atB.subarray(0, 64), 960); vram.set(ntB.subarray(960, 1920), 0x400); vram.set(atB.subarray(64, 128), 0x400 + 960);
      const recon = Finder.reconstruct(sealedBroken, rom11, Contract.romLayout(rom11), {label: c.label, nametables: vram, ppu: {ctrl: 0, mirroring: t11.mirroring === 'vertical' ? 1 : 0, scrollX: 0, scrollY: 0}});
      const claims = {label: c.label, definitionHash: sealedBroken.definitionHash, cells: recon.cells.filter(x => x.ids.length).map(x => ({cell: [x.mx, x.my], status: x.status, ids: x.ids, index: (2 * x.my) * 32 + 2 * x.mx, tiles: Finder.decodeRecord(sealedBroken, rom11, x.ids[0])})), attributes: recon.attributes.filter(a => a.knownMask)};
      p.candidate = sealedBroken; hold.expectation = {kind: 'claims', claims}; p.reconstruction = {...p.reconstruction, definitionHash: sealedBroken.definitionHash, claims}; delete p.packageHash; return {...p, packageHash: Contract.hashOf(p)}; })();
    const brokenReceipt = VP.verifyPackage(broken, {fceux: fx}).receipt, failedClaims = brokenReceipt.predictions.find(x => x.kind === 'claims');
    const brokenLife = Life.assess({discovery: {...rep11, definition: broken.candidate, stages: {...rep11.stages, freeze: {...rep11.stages.freeze, definitionHash: broken.candidate.definitionHash}}}, independent: brokenReceipt});
    check('A wrong definition (the true table shifted by one record) fails independent verification: FCEUX\'s withheld screen contradicts its claims, the verdict is "failed" and the lifecycle says verification failed',
      brokenReceipt.verdict.result === 'failed' && failedClaims && !failedClaims.holds && brokenLife.side === 'verification-failed', {verdict: brokenReceipt.verdict, claims: failedClaims && {cells: failedClaims.cells, hold: failedClaims.cellsHold}, lifecycle: brokenLife.side});
    // the independent emulator unavailable: reported as blocked, never as passed
    const savedPath = process.env.FCEUX_PATH; process.env.FCEUX_PATH = '/nonexistent/fceux';
    const blockedReceipt = VP.verifyPackage(pkg11).receipt; if (savedPath === undefined) delete process.env.FCEUX_PATH; else process.env.FCEUX_PATH = savedPath;
    const ba = await run('experiment.attachVerification', {receipt: blockedReceipt});
    check('No independent emulator: the harness writes a sealed receipt that says "blocked" (nothing verified); attached, the lifecycle says verification blocked',
      blockedReceipt.verdict.result === 'blocked' && V.verifyIndependent(blockedReceipt).ok && ba.ok && ba.result.lifecycle.side === 'verification-blocked', {verdict: blockedReceipt.verdict, lifecycle: ba.ok ? ba.result.lifecycle.side : ba.error});
    // re-attach the genuine receipt so the editor's last state is the verified one
    await run('experiment.attachVerification', {receipt: receipt11});
  } else ['Disagreement stays visible', 'A wrong definition fails independent verification', 'No independent emulator: blocked'].forEach(n => blocked(n, fx.reason));

  // ---- packages: complete vs referenced evidence, private packages, local cartridge, replay, inspection ----
  const pkg11 = pkgs.get(f11.seed);
  const insp = spawnSync(process.execPath, [path.join(ROOT, 'tools/agent-lab/inspect-package.cjs'), writeTmp('pkg11.json', pkg11)], {encoding: 'utf8'});
  const priv = await run('experiment.exportPackage', {privacy: 'private'}), privText = priv.ok ? JSON.stringify(priv.result) : '';
  const privChecks = priv.ok ? {valid: Pkg.validate(priv.result).ok, cartridgeReferenced: priv.result.cartridge.availability === 'reference' && !priv.result.cartridge.base64, noPayloadBytes: !priv.result.payloads.some(p => p.base64),
    noJobBytes: priv.result.verification.jobs.every(j => j.forge.captures.every(c => Object.values(c.channels).every(x => !x.base64))), mutationsRedacted: priv.result.interventions.interventions.every(i => i.mutation.expected === undefined && i.mutation.value === undefined) && priv.result.verification.jobs.every(j => j.job.mutations.every(m => m.expected === undefined && m.value === undefined)),
    noCartridgeValues: priv.result.reconstruction.claims.cells.every(c => !c.tiles) && priv.result.verification.jobs.every(j => !(j.expectation.predict || []).some(p => p.value !== undefined)), noPaths: !/\/home\/|\.nes"/.test(privText)} : {error: priv.error};
  let localVerify = null, wrongCartridge = null;
  if (fx.available && priv.ok) { localVerify = VP.verifyPackage(priv.result, {fceux: fx, cartridge: rom11}).receipt; wrongCartridge = throws(() => VP.verifyPackage(priv.result, {fceux: fx, cartridge: romOf(development[1])})); }
  check('Packages: the inspector validates an exported package outside the editor; a private package embeds no cartridge, payload or capture bytes, no mutation values, no claimed tiles or predicted values (mutations kept as offset and XOR mask), and still validates; verified against a locally supplied cartridge with the recorded SHA-256 it passes on digests alone, and the wrong cartridge is refused',
    insp.status === 0 && Object.values(privChecks).every(v => v === true) && (!fx.available || (localVerify?.verdict.result === 'verified' && /SHA-256/.test(wrongCartridge || ''))),
    {inspector: insp.status === 0 ? 'valid' : insp.stdout.slice(0, 400) + insp.stderr.slice(0, 200), privChecks, localVerify: localVerify?.verdict, wrongCartridge});
  const meta = await run('experiment.exportMetadata', {});
  check('The metadata-only export stays available as the lightweight alternative (hashes, offsets, counts, outcomes; no payload bytes)', meta.ok && !JSON.stringify(meta.result).includes('"base64"'), meta.ok ? {receipts: meta.result.receipts.length} : meta.error);
  const rp = await run('experiment.replayPackage', {package: pkg11});
  check('Reproduction: every trial and every verification job of an exported package, re-run in the sandbox from its recorded inputs and mutations, gives captures identical to the recorded ones (the jobs run in job mode here, reproducing the snapshots taken during the original trials)',
    rp.ok && rp.result.summary.trials > 0 && rp.result.summary.reproduced === rp.result.summary.trials && rp.result.summary.jobsReproduced === rp.result.summary.jobs, rp.ok ? rp.result.summary : rp.error);
  if (artifacts) { fs.writeFileSync(path.join(artifacts, 'example.forge-experiment.json'), JSON.stringify(pkg11) + '\n'); if (receipts.get(f11.seed)) fs.writeFileSync(path.join(artifacts, 'example.independent-receipt.json'), JSON.stringify(receipts.get(f11.seed), null, 1) + '\n'); }

  // ---- differential execution and mutation controls (runner level, with the generator's known-effect patches) ----
  const ctrl = await controls();
  check('Controls: a positive control (a drawn record byte) changes the screen; a palette-only change changes only the palette; a same-value write changes nothing; the original cartridge after every variant gives the original result (restoration); an exact-copy decoy the complete trace shows was never read changes nothing (irrelevant for this input); a byte the program does read, from a table it reads every frame for another purpose, changes nothing observed (no observed effect, which is not irrelevance); tripping the guard changes the program\'s path while the screen stays the same (confounded); a program stuck in a loop times out; rendering never enabled is "target not reached"',
    ctrl.ok, ctrl);
  const truncated = await run('experiment.run', {plan: plan1('truncation', rom11, t11, [{id: 'baseline', kind: 'baseline', mutations: [], trace: true}], {prgReads: true, ppuWrites: true, maxEvents: 50}), bytes: Array.from(rom11)});
  const tr = truncated.ok ? truncated.result.receipts[0] : null;
  check('Trace truncation: a trace that reaches its event cap is marked truncated and incomplete, and the receipt says absence of an event is not evidence', !!tr && tr.trace.truncated && !tr.trace.complete && tr.limitations.some(l => /absence/.test(l)), tr ? tr.trace : truncated.error);
  const bad = new Uint8Array(rom11); bad[12] = 1; const nonSynth = new Uint8Array(rom11); nonSynth.fill(0, 16 + 0x3f00, 16 + 0x3f10);
  const badRun = await run('experiment.discoverMetatiles', {bytes: Array.from(bad), training: INPUTS.training, holdout: INPUTS.holdout}), nsRun = await run('experiment.discoverMetatiles', {bytes: Array.from(nonSynth), training: INPUTS.training, holdout: INPUTS.holdout});
  check('Invalid or unsupported cartridges: a malformed header is refused (not repaired) and a cartridge without the synthetic-fixture marker is refused before anything runs', !badRun.ok && /header|repaired/.test(msg(badRun.error)) && !nsRun.ok && /synthetic/.test(msg(nsRun.error)), {bad: msg(badRun.error), nonSynthetic: msg(nsRun.error)});
  // cancellation: a discovery cancelled mid-run stops, and leaves no sandbox behind
  const cancelStart = Date.now(); const pending = run('experiment.discoverMetatiles', {bytes: Array.from(rom11), training: INPUTS.training, holdout: INPUTS.holdout});
  await new Promise(r => setTimeout(r, 4000)); await run('experiment.cancel', {}); const cancelled = await pending; const afterCancel = await page.evaluate(() => ({iframes: document.querySelectorAll('iframe').length, sessions: Forge.services.ExperimentSandbox.sessions()}));
  check('Cancellation: a discovery cancelled after 4 s stops within moments, claims nothing, and leaves no sandbox behind', (cancelled.ok ? cancelled.result.cancelled === true && /cancel/.test(cancelled.result.result?.reason || '') && !cancelled.result.definition : /cancel/i.test(msg(cancelled.error))) && afterCancel.iframes === 0 && afterCancel.sessions === 0 && Date.now() - cancelStart < 30000,
    {result: cancelled.ok ? {...cancelled.result.result, cancelled: cancelled.result.cancelled} : msg(cancelled.error), afterCancel, ms: Date.now() - cancelStart});

  // ---- promotion preview, panel, isolation ----
  await run('experiment.discoverMetatiles', {bytes: Array.from(rom11), training: INPUTS.training, holdout: INPUTS.holdout});
  if (fx.available) { const re = VP.verifyPackage((await run('experiment.exportPackage', {})).result, {fceux: fx}).receipt; await run('experiment.attachVerification', {receipt: re}); }
  const preview = await run('experiment.promotionPreview', {destination: 'metatiles'}), chrPreview = await run('experiment.promotionPreview', {destination: 'chr'});
  const pv = preview.ok ? preview.result.preview : null;
  if (fx.available) check('Promotion preview: an independently verified candidate is eligible for the Metatiles destination; its preview lists every record with its tiles, palette, source offsets and aliases, the source hash, CPU address, decoder version and unsupported cases, and writes nothing; the CHR destination is refused with its reason',
    !!pv && pv.eligible && pv.records.length > 0 && pv.records.every(r => r.sourceOffsets.length === 4) && pv.writes.length === 0 && !!pv.previewHash && pv.decoder.name === 'metatile-2x2' && chrPreview.ok && !chrPreview.result.eligibility.eligible,
    {preview: pv ? {records: pv.records.length, source: pv.source, writes: pv.writes, unsupported: pv.unsupported.length} : preview.error, chr: chrPreview.ok ? chrPreview.result.eligibility.unmet : chrPreview.error});
  else blocked('Promotion preview of an independently verified candidate', fx.reason);
  await page.evaluate(() => { switchTab('disasm'); Forge.services.REAnalysisUI?.showWorkspace?.(true); document.getElementById('reDiscoveryPanel')?.scrollIntoView({block: 'start'}); });
  const panel = await page.evaluate(() => { const p = document.getElementById('reDiscoveryPanel'); if (!p) return null; const c = p.cloneNode(true); c.querySelectorAll('style').forEach(e => e.remove());
    return {text: c.textContent.replace(/\s+/g, ' '), buttons: [...p.querySelectorAll('button')].map(b => b.textContent), pickers: p.querySelectorAll('input[type=file], select').length, state: p.querySelector('#reDiscoveryLifecycle')?.textContent}; });
  if (artifacts) await page.locator('#reDiscoveryPanel').screenshot({path: path.join(artifacts, 'AL2_discovery_panel.png')});
  const wantButtons = ['Run demonstration', 'Cancel', 'Export metadata', 'Export evidence package', 'Attach verification receipt…', 'Reproduce from recorded inputs', 'Inspect definition', 'Inspect hypotheses', 'Inspect discrepancies'];
  check('Panel: shows experiment status, lifecycle state, both engines\' identities, the hypotheses tested, controls, withheld-screen results, the cross-emulator comparison and limitations, with controls to run, cancel, export metadata and packages, attach receipts, reproduce and inspect; no cartridge picker',
    !!panel && wantButtons.every(b => panel.buttons.includes(b)) && panel.pickers === 0 && /Lifecycle/.test(panel.text) && /Independent engine: FCEUX/.test(panel.text) === fx.available && /Cross-emulator comparison/.test(panel.text) === fx.available && /Controls:/.test(panel.text) && /Withheld screen/.test(panel.text) && /Limitations/.test(panel.text),
    panel ? {buttons: panel.buttons, state: panel.state, text: panel.text.slice(0, 900)} : null);
  const heapAfter = await heap();
  const liveAfter = await liveDigest();
  check('The live project, the editor\'s emulator state and cartridge, the resource library and the browser databases are exactly as before every experiment; no sandbox is left open',
    JSON.stringify(liveAfter) === JSON.stringify(liveBefore) && liveAfter.iframes === 0, {liveBefore, liveAfter});
  check('Offline: no network request left file:// during the whole run', requests.length === 0, requests.slice(0, 5));
  check('No uncaught page errors', errors.length === 0, errors.slice(0, 8));
  report.measurements.editorHeapBytes = {before: heapBefore, after: heapAfter};
  await browser.close(); if (fx.available) fx.close();

  // ---- summary ----
  report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed === true).length; report.checksBlocked = report.checks.filter(c => c.status === 'blocked').length; report.checksFailed = report.checks.filter(c => c.passed === false).length;
  report.passed = report.checksFailed === 0;
  console.log((report.passed ? 'PASSED' : 'FAILED') + ' ' + report.checksPassed + '/' + report.total + (report.checksBlocked ? ' (' + report.checksBlocked + ' blocked)' : ''));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
  process.exit(report.passed ? 0 : 1);

  // ------------------------------------------------------------------------------------------------------------------
  function writeTmp(name, data) { const dir = artifacts || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'al-exp-02-')); const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(data)); return p; }
  function plan1(id, rom, truth, trials, trace = null, k = 'training') {
    const input = designOf(truth)(k), total = input.steps.reduce((n, s) => n + s.frames, 0);
    return {format: 'NESForgeExperimentPlan', version: 1, id, privacy: 'synthetic', source: {sha256: sha(rom), byteLength: rom.length}, input: {steps: input.steps}, captures: input.captures, target: {backgroundEnabled: true},
      observe: {channels: ['cpu', 'ram', 'nametables', 'palette', 'oam', 'chr', 'pixels'], payloads: ['nametables', 'palette', 'ram'], frameDigests: true, ...(trace ? {trace} : {})}, budgets: {framesPerTrial: total, wallMsPerTrial: 60000, maxTrials: trials.length, eventsPerTrial: 100000}, trials};
  }
  async function controls() {
    const out = {}, P = t11.patches;
    const r = await run('experiment.run', {plan: plan1('controls', rom11, t11, [{id: 'baseline', kind: 'baseline', mutations: [], trace: true}, {id: 'positive', kind: 'variant', mutations: P.positive}, {id: 'palette-only', kind: 'variant', mutations: P.paletteOnly},
      {id: 'same-value', kind: 'control-same-value', mutations: [{...P.positive[0], value: P.positive[0].expected}]}, {id: 'hang', kind: 'variant', mutations: P.hang}, {id: 'rendering-off', kind: 'variant', mutations: P.renderingOff},
      {id: 'baseline-after', kind: 'baseline', mutations: []}], {prgReads: true, ppuWrites: true, maxEvents: 100000}), bytes: Array.from(rom11)});
    if (!r.ok) return {ok: false, error: msg(r.error)};
    const rc = (res, id) => res.result.receipts.find(x => x.trialId === id), ch = (res, id, name) => rc(res, id)?.channels?.[name]?.equalToBaseline;
    out.positive = rc(r, 'positive').outcome === 'effect_observed' && ch(r, 'positive', 'nametables') === false;
    out.paletteOnly = rc(r, 'palette-only').outcome === 'effect_observed' && ch(r, 'palette-only', 'palette') === false && ch(r, 'palette-only', 'nametables') === true;
    out.sameValue = rc(r, 'same-value').outcome === 'no_effect_observed';
    out.restoration = rc(r, 'baseline-after').outcome === 'no_effect_observed';
    out.hang = rc(r, 'hang').outcome === 'timeout'; out.renderingOff = rc(r, 'rendering-off').outcome === 'target_not_reached';
    // "not read" (irrelevant for this input) versus "read, no observed effect": an exact-copy decoy, and a byte of the
    // table the NMI handler reads every frame for another purpose
    const fD = development.find(f => f.scenario === 'perfect-decoy'), tD = truthOf(fD), rD = romOf(fD);
    const d = await run('experiment.run', {plan: plan1('decoy', rD, tD, [{id: 'baseline', kind: 'baseline', mutations: [], trace: true}, {id: 'decoy', kind: 'variant', mutations: tD.patches.decoyCopy}], {prgReads: true, ppuWrites: true, maxEvents: 100000}), bytes: Array.from(rD)});
    const dm = tD.patches.decoyCopy[0].offset; out.decoyNotRead = d.ok && rc(d, 'decoy').outcome === 'no_effect_observed' && d.result.readByBaseline?.[dm]?.read === false && d.result.readByBaseline[dm].traceComplete;
    const fU = development.find(f => f.scenario === 'read-unrelated'), tU = truthOf(fU), rU = romOf(fU);
    const u = await run('experiment.run', {plan: plan1('unrelated', rU, tU, [{id: 'baseline', kind: 'baseline', mutations: [], trace: true}, {id: 'unrelated', kind: 'variant', mutations: tU.patches.unrelated}], {prgReads: true, ppuWrites: true, maxEvents: 100000}), bytes: Array.from(rU)});
    // the bus trace sees the different value being read (the runner counts that as a divergence); every captured state channel stays equal
    const um = tU.patches.unrelated[0].offset, uc = u.ok ? rc(u, 'unrelated').channels : null; out.readNoObservedEffect = u.ok && Object.values(uc).every(c => c.equalToBaseline === true) && u.result.readByBaseline?.[um]?.read === true;
    out.readNoObservedEffectDetail = u.ok ? {outcome: rc(u, 'unrelated').outcome, stateChannelsEqual: Object.values(uc).every(c => c.equalToBaseline === true), firstDivergence: rc(u, 'unrelated').firstDivergence, read: u.result.readByBaseline?.[um]} : msg(u.error);
    const fG = development.find(f => f.scenario === 'confounded-guard'), tG = truthOf(fG), rG = romOf(fG);
    const g = await run('experiment.run', {plan: plan1('guard', rG, tG, [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'trip', kind: 'variant', mutations: tG.patches.guardTrip}]), bytes: Array.from(rG)});
    if (g.ok) { const [b0, t0] = g.result.results, div = b0.sync.pathDigests.findIndex((h, i) => h !== t0.sync.pathDigests[i]); out.guardConfounded = div >= 0 && g.result.receipts[1].channels.nametables.equalToBaseline === true; out.guardPathDivergesAtFrame = div + 1; }
    out.ok = ['positive', 'paletteOnly', 'sameValue', 'restoration', 'hang', 'renderingOff', 'decoyNotRead', 'readNoObservedEffect', 'guardConfounded'].every(k => out[k] === true);
    return out;
  }
})().catch(error => { console.error(error); process.exit(1); });

function aggregate(rows) {
  const ok = rows.filter(r => !r.error), m = r => r.metrics || {}, sum = f => ok.reduce((n, r) => n + (f(r) || 0), 0);
  const withDef = ok.filter(r => m(r).definition);
  return {
    fixtures: rows.length, errors: rows.filter(r => r.error).length,
    outcomesCorrect: ok.filter(r => r.classification === r.expect).length,
    byExpectation: Object.fromEntries(['candidate', 'ambiguous', 'insufficient-evidence', 'inconclusive'].map(e => [e, {expected: ok.filter(r => r.expect === e).length, reached: ok.filter(r => r.expect === e && r.classification === e).length}])),
    tableLocations: {correct: withDef.filter(r => m(r).tableLocation === 'correct').length, incorrect: withDef.filter(r => m(r).tableLocation === 'incorrect').length},
    recordLayouts: {correct: withDef.filter(r => m(r).recordLayout === 'correct').length, incorrect: withDef.filter(r => m(r).recordLayout === 'incorrect').length},
    falsePositives: ok.filter(r => m(r).falsePositive).length, falseNegatives: ok.filter(r => m(r).falseNegative).length,
    decoys: {ranked: sum(r => m(r).hypotheses?.decoysRanked), rejected: sum(r => m(r).hypotheses?.decoysRejected), unresolved: sum(r => m(r).hypotheses?.decoysUnresolved), accepted: sum(r => m(r).hypotheses?.decoysAccepted)},
    ambiguity: {resultLevelExpected: ok.filter(r => r.expect === 'ambiguous').length, resultLevelDetected: ok.filter(r => r.expect === 'ambiguous' && r.classification === 'ambiguous').length,
      cellsAmbiguous: sum(r => m(r).withheld?.ambiguous), cellsAmbiguityCorrect: sum(r => m(r).withheld?.ambiguityCorrect)},
    withheld: {cells: sum(r => m(r).withheld?.tally?.cells), cellsWithId: sum(r => m(r).withheld?.tally?.withId), singleIdCells: sum(r => m(r).withheld?.tally?.single), singleIdCellsWhereIdentityIsClaimed: sum(r => typeof m(r).withheld?.exactIdentityPct === 'number' ? m(r).withheld.tally.single : 0), exactIdentityCorrect: sum(r => m(r).withheld?.tally?.identityCorrect), exactIdentityClaimedFixtures: withDef.filter(r => typeof m(r).withheld?.exactIdentityPct === 'number').length,
      visualCorrect: sum(r => m(r).withheld?.tally?.visualCorrect), paletteStated: sum(r => m(r).withheld?.tally?.paletteStated), paletteCorrect: sum(r => m(r).withheld?.tally?.paletteCorrect), attributeBitsStated: sum(r => m(r).withheld?.attributeBitsStated), attributeBitsCorrect: sum(r => m(r).withheld?.attributeBitsCorrect), unknownMissed: sum(r => m(r).withheld?.unknownMissed)},
    crossEmulator: {fixtures: ok.filter(r => r.independent?.checkpoints).length, checkpoints: sum(r => r.independent?.checkpoints), agree: sum(r => r.independent?.agree), timingOnly: sum(r => r.independent?.timingOnly), predictions: sum(r => r.independent?.predictions), hold: sum(r => r.independent?.hold)},
    runtime: {discoverySeconds: ok.map(r => r.seconds), verifySeconds: ok.map(r => r.verifySeconds), sandboxRuns: ok.map(r => r.sandboxRuns), packageKB: ok.map(r => r.packageKB)},
    traceComplete: {complete: ok.filter(r => r.traceComplete === true).length, of: ok.length},
  };
}
