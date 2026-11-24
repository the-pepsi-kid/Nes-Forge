'use strict';
// AL-EXP-01 acceptance: the experimental discovery foundation, on original synthetic NROM fixtures only.
//   node QA/al-exp-01.cjs <editor.html> <report.json> [screenshot directory]
//   AL_EXP_SEEDS=development  runs the development seeds only (the withheld seeds are for acceptance runs)
// Node checks the contract, the fixtures and the pure finder first; then Chromium opens the standalone editor from
// file://, with a live cartridge, project and library entry in place, and runs every experiment in the isolated sandbox.
// Discovery runs blind: the fixture's truth file is read only after the frozen definition and the withheld screen's
// reconstruction are back; the oracle (QA/fixtures/al-exp-01/oracle.cjs) shares no code with the editor.
// Test IDs are Audit 02's (07_verification_acceptance.md); each is reported PASS, PARTIAL (the NROM / slice-1 portion
// ran and passed) or DEFERRED (later scope), never PASS for cases that did not run.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), {spawnSync} = require('node:child_process');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname, '..'), FX = path.join(ROOT, 'QA/fixtures/al-exp-01');
const [editorArg, output, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg || path.join(ROOT, 'NES_Forge.html'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const Contract = require(path.join(ROOT, 'app/src/re/experiment-contract.js'));
const Finder = require(path.join(ROOT, 'app/src/re/metatile-finder.js'));
const Evidence = require(path.join(ROOT, 'app/src/re/experiment-evidence.js'));
const {generate} = require(path.join(FX, 'generate.cjs'));
const oracle = require(path.join(FX, 'oracle.cjs'));
const report = {suite: 'al-exp-01', editorSha256: sha(fs.readFileSync(editor)), checks: [], acceptance: {}, seeds: [], measurements: {}};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 1500))); };
const accept = (id, status, note) => { report.acceptance[id] = {status, note}; };
const throws = fn => { try { fn(); return null; } catch (e) { return e.message; } };
if (shots) fs.mkdirSync(shots, {recursive: true});
const seedsDoc = JSON.parse(fs.readFileSync(path.join(FX, 'seeds.json'), 'utf8'));
const development = seedsDoc.fixtures.filter(f => f.role.startsWith('development'));
const withheld = ['development', 'quick'].includes(process.env.AL_EXP_SEEDS) ? [] : seedsDoc.fixtures.filter(f => !f.role.startsWith('development'));
const romOf = f => new Uint8Array(fs.readFileSync(path.join(FX, 'roms', f.file)));
const truthOf = f => JSON.parse(fs.readFileSync(path.join(FX, 'truth', f.file.replace(/\.nes$/, '.truth.json')), 'utf8'));
const design = (truth, k) => ({steps: truth.inputs[k].steps, captures: truth.inputs[k].captures.map(c => ({label: c.label, frame: c.frame}))});
const ALL = ['cpu', 'ram', 'nametables', 'palette', 'oam', 'chr', 'pixels'];
function plan(id, rom, input, trials, extra = {}) {
  const total = input.steps.reduce((n, s) => n + s.frames, 0);
  return {format: 'NESForgeExperimentPlan', version: 1, id, privacy: 'synthetic', source: {sha256: sha(rom), byteLength: rom.length}, input: {steps: input.steps}, captures: input.captures,
    target: {backgroundEnabled: true}, observe: {channels: ALL, payloads: ['nametables', 'palette'], frameDigests: true, ...(extra.observe || {})},
    budgets: {framesPerTrial: total, wallMsPerTrial: 60000, maxTrials: trials.length, eventsPerTrial: 100000, ...(extra.budgets || {})}, trials, ...(extra.top || {})};
}

(async () => {
  // =================================================================================================================
  // Node: fixtures, separation, contract, evidence store, pure finder
  // =================================================================================================================
  const regen = spawnSync(process.execPath, [path.join(FX, 'generate.cjs'), '--check'], {encoding: 'utf8'});
  const roles = seedsDoc.fixtures.reduce((m, f) => { const r = f.role.split(' ')[0]; m[r] = (m[r] || 0) + 1; return m; }, {});
  check('Fixtures: every committed synthetic cartridge, truth file and the panel\'s embedded cartridge regenerate byte for byte from their seeds', regen.status === 0, {stdout: regen.stdout.trim(), stderr: regen.stderr.trim(), roles});
  const appRefs = ['generate.cjs', 'asm6502.cjs', 'oracle.cjs'].filter(n => /require\([^)]*app\//.test(fs.readFileSync(path.join(FX, n), 'utf8')));
  const discoveryFiles = ['metatile-finder.js', 'experiment-discovery.js', 'experiment-runner.js', 'bus-observer.js', 'experiment-sandbox.js'];
  const leaks = discoveryFiles.flatMap(n => { const t = fs.readFileSync(path.join(ROOT, 'app/src/re', n), 'utf8'); return ['truth', 'seeds.json', 'QA/', 'require(', 'fetch(', 'XMLHttpRequest', 'readFile'].filter(w => t.includes(w)).map(w => n + ': ' + w); });
  const html = fs.readFileSync(editor, 'utf8'), inBuild = ['NESForgeSyntheticFixtureTruth', 'generator truth (al-exp-01 fixture)', 'oracle.cjs'].filter(w => html.includes(w));
  check('Separation: the generator and oracle import nothing from the editor; the discovery code reads no files and names no fixture answers; the build carries no truth or oracle code',
    !appRefs.length && !leaks.length && !inBuild.length, {appRefs, leaks, inBuild});

  // ---- BL01 contract (A14, A16) ----
  const canon = Contract.canonical({b: 1, a: [2, {d: 3, c: 4}]});
  const canonOk = canon === '{"a":[2,{"c":4,"d":3}],"b":1}' && !!throws(() => Contract.canonical({x: 1.5})) && !!throws(() => Contract.canonical({x: undefined})) && !!throws(() => Contract.canonical({x: new Uint8Array(1)}))
    && Contract.sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const f1 = development[0], rom1 = romOf(f1), t1 = truthOf(f1);
  const good = plan('contract-check', rom1, design(t1, 'training'), [{id: 'baseline', kind: 'baseline', mutations: []}]);
  const shuffled = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(good).reverse())));
  const validHash = Contract.validatePlan(good).planHash, sameHash = Contract.validatePlan(shuffled).planHash === validHash;
  const bad = {
    'unknown top-level field (eval)': p => ({...p, eval: 'fetch("http://example.invalid")'}),
    'unknown trial kind (shell)': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'x', kind: 'shell', mutations: []}]}),
    'code-bearing field on a trial (script)': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: [], script: 'while(1){}'}]}),
    'adversarial model suggestion (command)': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'suggested', kind: 'variant', mutations: [{offset: 100, expected: rom1[100], value: 1}], command: 'rm -rf /'}]}),
    'more than 16 mutations': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'v', kind: 'variant', mutations: Array.from({length: 17}, (_, i) => ({offset: 1000 + i, expected: rom1[1000 + i], value: rom1[1000 + i] ^ 1}))}]}),
    'input longer than 1800 frames': p => ({...p, input: {steps: [{frames: 600, buttons: []}, {frames: 600, buttons: []}, {frames: 600, buttons: []}, {frames: 1, buttons: []}]}}),
    'opposite directions held': p => ({...p, input: {steps: [{frames: 200, buttons: ['Left', 'Right']}]}}),
    'wall-clock budget below 10 ms': p => ({...p, budgets: {...p.budgets, wallMsPerTrial: 0}}),
    'no cold baseline': p => ({...p, trials: [{id: 'v', kind: 'variant', mutations: [{offset: 100, expected: rom1[100], value: rom1[100] ^ 1}]}]}),
    'duplicate trial id': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'baseline', kind: 'baseline', mutations: []}]}),
    'captures out of order': p => ({...p, captures: [p.captures[1], p.captures[0]]}),
    'capture past the input': p => ({...p, captures: [{label: 'late', frame: 5000}]}),
    'unknown privacy class': p => ({...p, privacy: 'public'}),
    'same-value control that changes a byte': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 's', kind: 'control-same-value', mutations: [{offset: 100, expected: rom1[100], value: rom1[100] ^ 1}]}]}),
    'variant that changes nothing': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'v', kind: 'variant', mutations: [{offset: 100, expected: rom1[100], value: rom1[100]}]}]}),
    'restore from an undeclared checkpoint': p => ({...p, trials: [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'r', kind: 'baseline', mutations: [], fromCheckpoint: 'nowhere'}]}),
    'trace cap above the event budget': p => ({...p, observe: {...p.observe, trace: {prgReads: true, ppuWrites: true, maxEvents: 100001}}}),
    'source identity not a full SHA-256': p => ({...p, source: {...p.source, sha256: 'abc'}}),
  };
  const rejected = Object.entries(bad).map(([name, fn]) => [name, throws(() => Contract.validatePlan(fn(JSON.parse(JSON.stringify(good)))))]);
  check('BL01 contract: canonical JSON (sorted keys, integers only) and SHA-256; a valid plan has one hash whatever its key order; 18 invalid or adversarial plans are refused with explicit reasons',
    canonOk && sameHash && rejected.every(([, e]) => e && /Experiment contract/.test(e)), {canon, sameHash, rejected});
  // headers: refused, never repaired
  const variants = {'NES 2.0': b => { b[7] = 0x08; }, 'truncated': null, 'trailing byte': null, 'dirty header tail': b => { b[12] = 0x41; }};
  const headerResults = Object.entries(variants).map(([name, fn]) => {
    let b = new Uint8Array(rom1); if (fn) fn(b); if (name === 'truncated') b = b.slice(0, -1); if (name === 'trailing byte') { const c = new Uint8Array(b.length + 1); c.set(b); b = c; }
    const before = sha(b), e = throws(() => Contract.romLayout(b)); return [name, e, sha(b) === before];
  });
  check('Malformed iNES headers (NES 2.0, truncated, trailing data, dirty header tail) are refused and the bytes are left as they were (not repaired)', headerResults.every(([, e, same]) => e && same), headerResults);
  // mutations (A01, unit)
  const L1 = Contract.romLayout(rom1), f7 = development.find(f => f.trainer), rom7 = romOf(f7), L7 = Contract.romLayout(rom7);
  const mut = (bytes, layout, list) => throws(() => Contract.validateMutations(bytes, layout, list));
  const mutationCases = {
    header: mut(rom1, L1, [{offset: 5, expected: rom1[5], value: 0}]), vector: mut(rom1, L1, [{offset: L1.vectors.start + 2, expected: rom1[L1.vectors.start + 2], value: 0}]),
    'past the end': mut(rom1, L1, [{offset: rom1.length, expected: 0, value: 1}]), duplicate: mut(rom1, L1, [{offset: 200, expected: rom1[200], value: 1}, {offset: 200, expected: rom1[200], value: 2}]),
    'wrong expected': mut(rom1, L1, [{offset: 200, expected: (rom1[200] + 1) & 255, value: 3}]), trainer: mut(rom7, L7, [{offset: 100, expected: rom7[100], value: rom7[100] ^ 1}]),
    'plan-protected range': throws(() => Contract.validateMutations(rom1, L1, [{offset: 300, expected: rom1[300], value: 1}], [{start: 256, end: 512, reason: 'declared by the plan'}])),
  };
  const okMut = Contract.validateMutations(rom1, L1, [{offset: 200, expected: rom1[200], value: rom1[200] ^ 1}, {offset: L1.chrStart + 5, expected: rom1[L1.chrStart + 5], value: 7}]);
  const before1 = sha(rom1), v = Contract.buildVariant(rom1, before1, okMut), manual = new Uint8Array(rom1); manual[200] ^= 1; manual[L1.chrStart + 5] = 7;
  check('A01 (unit): header, trainer, vector, out-of-range, duplicate, wrong-expected and plan-protected mutations are refused; a valid PRG+CHR variant is a new array whose SHA-256 equals an independently patched copy; the base is unchanged',
    Object.values(mutationCases).every(Boolean) && okMut.map(m => m.region).join() === 'prg,chr' && v.sha256 === sha(manual) && sha(rom1) === before1, {mutationCases, variant: v.sha256.slice(0, 16)});
  // receipts and candidates (A16)
  const sealedReceipt = Contract.sealReceipt({format: 'NESForgeExperimentReceipt', version: 1, planHash: validHash, planId: 'contract-check', trialId: 'baseline', kind: 'baseline', engine: {documentSha256: report.editorSha256, engine: 'test'},
    base: {sha256: before1, byteLength: rom1.length}, variant: {sha256: v.sha256, variantId: v.variantId, mutations: okMut.map(m => ({offset: m.offset, expected: m.expected, value: m.value, region: m.region}))}, inputHash: validHash,
    checkpoint: null, framesRun: 1, stopReason: null, targetReached: true, outcome: 'effect_observed', channels: null, captures: [], firstDivergence: null, trace: null, limits: {}, limitations: [],
    verification: {kind: 'none', independent: false, note: 'unit'}, evidence: {}});
  const tamper = fn => { const r = JSON.parse(JSON.stringify(sealedReceipt)); fn(r); return Contract.verifyReceipt(r).ok; };
  const receiptCases = {sealed: Contract.verifyReceipt(sealedReceipt).ok, 'base hash': tamper(r => { r.base.sha256 = '0'.repeat(64); }), 'variant list': tamper(r => { r.variant.mutations[0].value ^= 2; }),
    producer: tamper(r => { r.engine.engine = 'another engine'; }), 'extra field': tamper(r => { r.approvedBy = 'me'; }), 'independent claim': !!throws(() => Contract.sealReceipt({...sealedReceipt, verification: {kind: 'independent oracle', independent: true, note: ''}, receiptHash: undefined}))};
  const candidateBase = {format: 'NESForgeCandidateDefinition', version: 1, kind: 'metatile-table-2x2', status: 'candidate', hypothesis: 'supported', source: {sha256: before1, byteLength: rom1.length},
    table: {layout: 'split', order: 'row', physicalBase: 1000, cpuBase: null, recordStep: 1, fieldStep: 51, grid: {x: 0, y: 0}, baseEvidence: {}}, attributes: null, extent: {knownIds: [0], lowest: 0, highest: 0}, aliases: [], evidence: {}, verification: {repeatability: 'x', interventions: 'x', independent: 'not performed'}, limitations: []};
  const sealedCandidate = Contract.sealCandidate(candidateBase);
  const candidateCases = {sealed: Contract.verifyCandidate(sealedCandidate).ok, 'marked verified': !!throws(() => Contract.sealCandidate({...candidateBase, status: 'verified'})), 'marked reviewed': !!throws(() => Contract.sealCandidate({...candidateBase, hypothesis: 'reviewed'})),
    'claims independent verification': !!throws(() => Contract.sealCandidate({...candidateBase, verification: {...candidateBase.verification, independent: 'passed'}})), tampered: Contract.verifyCandidate({...sealedCandidate, table: {...sealedCandidate.table, physicalBase: 1001}}).ok};
  check('A16 (records): a sealed receipt verifies; a changed base hash, variant list, producer or extra field is refused; no receipt can claim independence; a candidate cannot be marked verified or reviewed, or claim independent verification, and a tampered one is refused',
    receiptCases.sealed && !receiptCases['base hash'] && !receiptCases['variant list'] && !receiptCases.producer && !receiptCases['extra field'] && receiptCases['independent claim']
    && candidateCases.sealed && candidateCases['marked verified'] && candidateCases['marked reviewed'] && candidateCases['claims independent verification'] && !candidateCases.tampered, {receiptCases, candidateCases});
  // evidence store (A10, A16)
  const store = Evidence.createStore(), payload = new Uint8Array([1, 2, 3]), id1 = store.putBytes(payload, 'nametables'), id2 = store.putBytes(new Uint8Array([1, 2, 3]), 'nametables');
  store.addReceipt(sealedReceipt); const e1 = store.addEdge({trial: 'a', from: 'variant:x', to: id1, kind: 'no_effect_observed'}), e2 = store.addEdge({trial: 'b', from: 'variant:y', to: id1, kind: 'no_effect_observed'});
  const priv = store.exportPrivate(), copy = Evidence.createStore(), firstImport = copy.importEvidence(priv), secondImport = copy.importEvidence(priv);
  const altered = JSON.parse(JSON.stringify(priv)); altered.payloads[0].base64 = Buffer.from([9, 9, 9]).toString('base64');
  const forged = JSON.parse(JSON.stringify(priv)); forged.receipts[0].outcome = 'no_effect_observed';
  const meta = store.exportMetadata({privacy: 'private'}), metaText = JSON.stringify(meta);
  check('A10/A16 (store): one payload per exact content, one causal edge per trial; importing twice adds nothing; an altered payload or forged receipt is refused; the private-class metadata export has no payload bytes, cartridge byte values, file names or paths',
    id1 === id2 && store.stats().payloads === 1 && e1 && e2 && store.stats().edges === 2 && firstImport.receipts === 1 && secondImport.receipts === 0 && secondImport.payloads === 0
    && !!throws(() => Evidence.createStore().importEvidence(altered)) && !!throws(() => Evidence.createStore().importEvidence(forged))
    && !/base64|"expected"|\.nes|\/home|\\\\/.test(metaText), {firstImport, secondImport, stats: store.stats()});
  // the pure finder on the generator's own screens (no emulator, no trace): static ranking only
  const staticRanks = development.map(f => {
    const truth = truthOf(f), rom = romOf(f), layout = Contract.romLayout(rom);
    const captures = truth.expected.slice(0, 3).map((s, i) => { const vram = new Uint8Array(0x1000); vram.set(Buffer.from(s.nametable, 'hex'), 0); vram.set(Buffer.from(s.attributes, 'hex'), 960); return {label: 'scene-' + i, nametables: vram, ppu: {ctrl: 0, mirroring: truth.mirroring === 'vertical' ? 1 : 0, scrollX: 0, scrollY: 0}}; });
    const p = Finder.propose({rom, layout, captures}), all = p.candidates, rank = all.findIndex(w => w.lo + layout.prgStart === truth.table.physicalBase + (Math.min(...truth.ids.common, ...truth.ids.scene2Only)) * truth.table.recordStep && w.hypothesis.layout === truth.table.layout && w.hypothesis.order === truth.table.order && w.hypothesis.fieldStep === truth.table.fieldStep) + 1;
    return {seed: f.seed, rank, ties: all.filter(w => w.coverage === 1).length};
  });
  check('A08 (pure finder, no trace): on the generator\'s own screens, the true table is among the top five candidates for every development seed (decoys can tie without a trace)', staticRanks.every(r => r.rank >= 1 && r.rank <= 5), staticRanks);

  // =================================================================================================================
  // Chromium: the standalone editor from file://
  // =================================================================================================================
  const browser = await chromium.launch({args: ['--enable-precise-memory-info']}), context = await browser.newContext({viewport: {width: 1280, height: 2000}}), page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push('page: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  context.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) requests.push(u); });
  await page.goto('file://' + editor); await page.waitForFunction(() => window.Forge && Forge.commands && Forge.services.ExperimentSandbox && Forge.services.ResourceLibrary, null, {timeout: 180000});
  const run = (name, args) => page.evaluate(async ([n, a]) => { const r = await Forge.commands.run(n, a); return r; }, [name, args]);
  const toArr = b => Array.from(b);
  // the live editor: an authored cartridge running, a library entry, the default project
  const liveRom = fs.readFileSync(path.join(ROOT, 'QA/r/game.nes'));
  const loaded = await run('emulator.load', {bytes: toArr(liveRom), name: 'game.nes'}); await run('emulator.frames', {count: 90});
  const registered = await run('library.registerFrame', {label: 'live frame before experiments'});
  const liveDigest = () => page.evaluate(async () => {
    const h = async b => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b instanceof Uint8Array ? b : new TextEncoder().encode(b))), x => x.toString(16).padStart(2, '0')).join('');
    const L = Forge.services.ResourceLibrary, status = await L.status(), entries = await L.list({});
    return {emulator: await h(JSON.stringify({A: emu.A, X: emu.X, Y: emu.Y, SP: emu.SP, PC: emu.PC, cycles: emu.cycles, frame: emu.frameCount, ram: Array.from(emu.ram), vram: Array.from(emu.vram), pal: Array.from(emu.palRam), oam: Array.from(emu.oamMem)})),
      rom: await h(emu.lastBuiltRom), project: await h(Forge.services.ProjectStore.serialize()), library: await h(JSON.stringify({entries: status.entries ?? null, packs: status.packs ?? null, list: entries})),
      libraryEntries: entries?.total ?? entries?.items?.length ?? null, databases: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name).sort() : null, iframes: document.querySelectorAll('iframe').length};
  });
  const liveBefore = await liveDigest();
  check('Live editor set up before any experiment: an authored cartridge running, a frame in the library, the default project', loaded.ok && registered.ok && liveBefore.libraryEntries >= 1, {loaded: loaded.ok, registered: registered.ok ? null : registered.error, liveBefore});

  // ---- isolation (BL02) ----
  const bcdp = await browser.newBrowserCDPSession(), pcdp = await context.newCDPSession(page);
  const rssOfBrowser = async () => { const {processInfo} = await bcdp.send('SystemInfo.getProcessInfo'); let total = 0; const byType = {};
    for (const p of processInfo) { try { const m = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync('/proc/' + p.id + '/status', 'utf8')); if (m) { total += Number(m[1]); byType[p.type] = (byType[p.type] || 0) + Number(m[1]); } } catch (_) {} }
    return {totalKiB: total, byType, processes: processInfo.length}; };
  const heap = async () => { await pcdp.send('HeapProfiler.collectGarbage'); return (await pcdp.send('Runtime.getHeapUsage')).usedSize; };
  await page.evaluate(() => { window.__lateness = []; let last = performance.now(); window.__lagTimer = setInterval(() => { const now = performance.now(); window.__lateness.push(now - last - 50); last = now; }, 50); });
  const rssBefore = await rssOfBrowser(), heapBefore = await heap();
  const opened = await page.evaluate(async () => { const t = performance.now(); window.__session = await Forge.services.ExperimentSandbox.open(); return {ms: performance.now() - t, identity: window.__session.identity, errors: window.__session.errors()}; });
  const bootLateness = await page.evaluate(() => { const l = window.__lateness.splice(0); return Math.round(Math.max(0, ...l)); });
  const rssOpen = await rssOfBrowser(), heapOpen = await heap();
  const sandboxFrame = page.frames().find(f => f.name().startsWith('nes-forge-experiment-sandbox:'));
  const inside = sandboxFrame ? await sandboxFrame.evaluate(() => ({origin: self.origin, local: (() => { try { localStorage.length; return 'readable'; } catch (e) { return 'refused: ' + e.name; } })(),
    idb: (() => { try { indexedDB.open('probe'); return 'opened'; } catch (e) { return 'refused: ' + e.name; } })(), parentDocument: (() => { try { return typeof window.parent.document; } catch (e) { return 'refused: ' + e.name; } })(),
    heap: performance.memory ? performance.memory.usedJSHeapSize : null})) : null;
  const cdp = await context.newCDPSession(page), targets = (await cdp.send('Target.getTargets')).targetInfos.map(t => t.type);
  check('Isolation: the sandbox is a byte-identical copy of this build (its document SHA-256 equals the file\'s), in an opaque origin that cannot reach the editor\'s storage or document',
    opened.identity.documentSha256 === report.editorSha256 && inside && inside.origin === 'null' && /refused/.test(inside.local) && /refused/.test(inside.idb) && /refused/.test(inside.parentDocument),
    {document: opened.identity.documentSha256.slice(0, 16), file: report.editorSha256.slice(0, 16), inside, bootMs: Math.round(opened.ms), bootErrors: opened.errors});
  report.measurements.sandbox = {bootMs: Math.round(opened.ms), editorTimerLatenessDuringBootMs: bootLateness, rssKiB: {before: rssBefore, withSandbox: rssOpen, delta: rssOpen.totalKiB - rssBefore.totalKiB},
    jsHeapBytes: {editorAlone: heapBefore, withSandbox: heapOpen, sandbox: heapOpen - heapBefore, note: 'the renderer\'s V8 heap after a forced collection, with and without the sandbox open'},
    processModel: targets.includes('iframe') ? 'separate renderer process (out-of-process iframe)' : 'same renderer process as the editor', targets};

  // a runner call inside the page with the open session; returns compact results (big arrays only when asked)
  const runPlan = (p, bytes, keep = {}) => page.evaluate(async ([p, bytes, keep]) => {
    const r = await Forge.services.ExperimentRunner.run(p, new Uint8Array(bytes), {session: window.__session});
    return {repeatability: r.repeatability, baseUnchanged: r.baseUnchanged, receipts: r.receipts.map(x => JSON.parse(JSON.stringify(x))),
      results: r.results.map(x => ({id: x.trial.id, framesRun: x.result.framesRun, wallMs: x.result.wallMs, comparison: x.comparison,
        nametables: keep.nametables ? x.result.captures.map(c => ({label: c.label, ppu: c.ppu, nametables: Array.from(c.payloads.nametables || [])})) : undefined,
        trace: keep.trace && x.result.trace ? {roles: Array.from(x.result.trace.roles), events: x.result.trace.events, frames: x.result.trace.frames} : undefined}))};
  }, [p, Array.from(bytes), keep]);
  const byId = (r, id) => r.receipts.find(x => x.trialId === id);

  // ---- A01: mutation bounds in the runner; base unchanged across success, rejection ----
  const T = t1.patches, train1 = design(t1, 'training');
  const a01 = await runPlan(plan('a01-mutations', rom1, train1, [
    {id: 'baseline', kind: 'baseline', mutations: []},
    {id: 'valid', kind: 'variant', mutations: T.scene2Record},
    {id: 'header', kind: 'variant', mutations: [{offset: 5, expected: rom1[5], value: rom1[5] ^ 1}]},
    {id: 'vector', kind: 'variant', mutations: [{offset: L1.vectors.start, expected: rom1[L1.vectors.start], value: rom1[L1.vectors.start] ^ 1}]},
    {id: 'past-end', kind: 'variant', mutations: [{offset: rom1.length + 3, expected: 0, value: 1}]},
    {id: 'duplicate', kind: 'variant', mutations: [{...T.scene2Record[0]}, {...T.scene2Record[0], value: T.scene2Record[0].value ^ 2}]},
    {id: 'wrong-expected', kind: 'variant', mutations: [{...T.scene2Record[0], expected: (T.scene2Record[0].expected + 7) & 255}]},
  ]), rom1);
  const patched = new Uint8Array(rom1); patched[T.scene2Record[0].offset] = T.scene2Record[0].value;
  const t7 = truthOf(f7), a01t = await runPlan(plan('a01-trainer', rom7, design(t7, 'training'), [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'trainer', kind: 'variant', mutations: [{offset: 300, expected: rom7[300], value: rom7[300] ^ 1}]}]), rom7);
  const a01ok = byId(a01, 'valid').outcome === 'effect_observed' && byId(a01, 'valid').variant.sha256 === sha(patched) && ['header', 'vector', 'past-end', 'duplicate', 'wrong-expected'].every(id => byId(a01, id).outcome === 'invalid')
    && byId(a01t, 'trainer').outcome === 'invalid' && a01.baseUnchanged && a01t.baseUnchanged && sha(romOf(f1)) === f1.sha256 && sha(romOf(f7)) === f7.sha256;
  check('A01: in the sandbox runner only the valid scoped variant runs (its SHA-256 equals an independently patched copy); header, vector, past-the-end, duplicate, wrong-expected and trainer mutations end as invalid; the base is unchanged after every trial and the fixture files are untouched',
    a01ok, {outcomes: a01.receipts.map(r => r.trialId + ':' + r.outcome + (r.stopReason ? ' (' + r.stopReason.slice(0, 80) + ')' : '')), trainer: byId(a01t, 'trainer').stopReason});

  // ---- A02: determinism, checkpoints, same-value control, incompatible state ----
  const a02 = await runPlan(plan('a02-repeatability', rom1, train1, [
    {id: 'cold-1', kind: 'baseline', mutations: [], saveCheckpoints: true, trace: true},
    {id: 'restored-1', kind: 'baseline', mutations: [], fromCheckpoint: 'after-boot', trace: true},
    {id: 'restored-2', kind: 'baseline', mutations: [], fromCheckpoint: 'after-boot', trace: false},
    {id: 'same-value', kind: 'control-same-value', mutations: [{...T.scene2Record[0], value: T.scene2Record[0].expected}], trace: true},
    {id: 'cold-2', kind: 'baseline', mutations: [], trace: true},
    {id: 'restored-after-reload', kind: 'baseline', mutations: [], fromCheckpoint: 'after-boot'},
  ], {observe: {trace: {prgReads: true, ppuWrites: true, maxEvents: 100000}, watchRam: [1]}, top: {checkpoints: [{label: 'after-boot', frame: 30}]}}), rom1, {trace: true, nametables: true});
  const repeatOk = ['restored-1', 'restored-2', 'cold-2', 'same-value'].every(id => byId(a02, id).outcome === 'no_effect_observed' && byId(a02, id).firstDivergence === null);
  check('A02: two cold runs and two runs restored from an in-sandbox checkpoint give identical state, frames and ordered bus events; the same-value control has no effect; a checkpoint is not restored once another load replaced its machine',
    repeatOk && a02.repeatability === 'passed' && byId(a02, 'restored-after-reload').outcome === 'invalid', {outcomes: a02.receipts.map(r => r.trialId + ':' + r.outcome), divergence: a02.receipts.map(r => r.firstDivergence), repeatability: a02.repeatability, reload: byId(a02, 'restored-after-reload').stopReason, checkpoint: byId(a02, 'restored-1').checkpoint});
  const a02v = await runPlan(plan('a02-incompatible', rom1, train1, [{id: 'baseline', kind: 'baseline', mutations: [], saveCheckpoints: true}, {id: 'variant', kind: 'variant', mutations: T.counterOnly}, {id: 'variant-restored', kind: 'variant', mutations: T.counterOnly, fromCheckpoint: 'after-boot'}],
    {top: {checkpoints: [{label: 'after-boot', frame: 30}]}}), rom1);
  check('A02: a variant cannot start from the base cartridge\'s checkpoint (incompatible state refused)', byId(a02v, 'variant-restored').outcome === 'invalid', {reason: byId(a02v, 'variant-restored').stopReason});

  // ---- A04 / A07 (NROM): access roles and write trace, from cold-1's trace ----
  const tr = a02.results.find(r => r.id === 'cold-1').trace, prgStart = t1.prgStart, roleAt = o => tr.roles[o - prgStart] || 0;
  const starts = new Map(t1.code.instructions.map(([o, n]) => [o, n])), within = new Map(); for (const [o, n] of t1.code.instructions) for (let k = 1; k < n; k++) within.set(o + k, o);
  let opcodeOk = 0, opcodeBad = [], operandOk = 0, operandBad = [];
  for (let i = 0; i < tr.roles.length; i++) { const o = prgStart + i, r = tr.roles[i]; if (r & 1) { if (starts.has(o)) opcodeOk++; else opcodeBad.push(o); } if (r & 2) { if (within.has(o)) operandOk++; else operandBad.push(o); } }
  const dual = t1.code.dualUse[0], prgEnd = prgStart + 0x4000, codeEnd = t1.code.physical + t1.code.length;
  const dataInCode = []; for (let o = t1.code.physical; o < codeEnd; o++) if ((roleAt(o) & 4) && o !== dual) dataInCode.push(o);
  const drawn = new Set(t1.expected.slice(0, 3).flatMap(s => s.ids)), tableBytes = [...drawn].flatMap(id => [0, 1, 2, 3].map(f => t1.table.physicalBase + id * t1.table.recordStep + f * t1.table.fieldStep));
  const tableRead = tableBytes.filter(o => roleAt(o) & 4).length, tableEvents = tr.events.filter(e => e[1] === 0 && tableBytes.includes(e[5])), mirrors = new Set(tableEvents.map(e => e[4] >> 14)), codeFetchCpu = new Set(t1.code.instructions.filter(([o]) => roleAt(o) & 1).map(() => 'C'));
  const decoyUntouched = ['decoyOrder', 'decoyPartial', 'decoyRepeat', 'decoyPalette', ...(t1.regions.decoyCopy ? ['decoyCopy'] : [])].every(k => { const r = t1.regions[k]; for (let o = r.physical; o < r.physical + r.length; o++) if (roleAt(o)) return false; return true; });
  const unknownBytes = tr.roles.filter(r => r === 0).length;
  const a04 = {opcodeOk, opcodeBad: opcodeBad.slice(0, 5), operandOk, operandBad: operandBad.slice(0, 5), dualUse: roleAt(dual), dataInCode: dataInCode.slice(0, 5), tableRead, tableBytes: tableBytes.length, tableMirror: [...mirrors], nmiVector: [roleAt(prgEnd - 6), roleAt(prgEnd - 5)], irqVector: [roleAt(prgEnd - 2), roleAt(prgEnd - 1)], decoyUntouched, unknownBytes};
  check('A04 (NROM): every opcode-fetch byte is an instruction start and every operand byte lies inside an instruction (checked against the generator\'s own listing); the one dual-use byte is both; drawn table bytes are data reads made through the $8000 mirror of the single 16 KiB PRG while code runs at $C000; NMI vector bytes are vector reads; the never-taken IRQ vector, the decoys and other untouched bytes stay unknown',
    opcodeOk > 100 && !opcodeBad.length && operandOk > 100 && !operandBad.length && roleAt(dual) === (1 | 4) && !dataInCode.length && tableRead === tableBytes.length && mirrors.size === 1 && [...mirrors][0] === 2
    && (a04.nmiVector[0] & 8) && (a04.nmiVector[1] & 8) && a04.irqVector[0] === 0 && a04.irqVector[1] === 0 && decoyUntouched && unknownBytes > 1000, a04);
  const ppu = tr.events.filter(e => e[1] === 2), firstScene = ppu.filter(e => e[4] >= 0x2000 && e[4] < 0x23c0).slice(0, 960), expectedNt = Buffer.from(t1.expected[0].nametable, 'hex');
  const ntOrder = firstScene.length === 960 && firstScene.every((e, i) => e[4] === 0x2000 + i && e[5] === i && e[6] === expectedNt[i]);
  const attrWrites = ppu.filter(e => e[4] >= t1.attributeWriteAddress && e[4] < t1.attributeWriteAddress + 64).slice(0, 64), attrMapped = attrWrites.length === 64 && attrWrites.every((e, i) => e[5] === 0x3c0 + i);
  const pal = ppu.filter(e => e[4] >= 0x3f00 && e[4] < 0x3f20).slice(0, 32), palMirror = pal.length === 32 && pal[16][4] === 0x3f10 && pal[16][5] === 0x4000;
  const ram = tr.events.filter(e => e[1] === 3), counterPc = 0xc000 + (t1.code.labels.NMI_INC - prgStart), ramOk = ram.every(e => e[5] === 1) && ram.filter(e => e[2] === counterPc).length >= 150 && ram.filter(e => e[2] !== counterPc).length <= 1; // the reset code clears it once
  check('A07 (NROM): PPU writes are logged in order with their mapped addresses (the first screen\'s 960 nametable writes equal the generator\'s nametable; attribute writes made through the cartridge\'s mirror land at $23C0–$23FF; the $3F10 write lands on palette 0); watched RAM writes carry the writing instruction',
    ntOrder && attrMapped && palMirror && ramOk, {ntOrder, attrMapped, attributeWriteAddress: t1.attributeWriteAddress.toString(16), palMirror, ramWrites: ram.length, counterPc: counterPc.toString(16)});
  const cap = await runPlan(plan('a07-cap', rom1, train1, [{id: 'baseline', kind: 'baseline', mutations: [], trace: true}], {observe: {trace: {prgReads: true, ppuWrites: true, maxEvents: 100}}, budgets: {eventsPerTrial: 100}}), rom1);
  const passive = byId(a02, 'restored-2').channels && Object.values(byId(a02, 'restored-2').channels).every(c => c.equalToBaseline);
  check('A07: at the event cap the trace is marked truncated and incomplete, and the receipt says absence is not evidence; observing is passive (a traced run and an untraced run give identical state)',
    cap.receipts[0].trace.truncated && !cap.receipts[0].trace.complete && cap.receipts[0].limitations.some(l => /absence/.test(l)) && passive, {trace: cap.receipts[0].trace, limitations: cap.receipts[0].limitations});

  // ---- A05: the comparator ----
  const a05 = await runPlan(plan('a05-comparator', rom1, train1, [
    {id: 'baseline', kind: 'baseline', mutations: []},
    {id: 'ram-only', kind: 'variant', mutations: T.counterOnly},
    {id: 'palette-only', kind: 'variant', mutations: T.paletteOnly},
    {id: 'scene-2-record', kind: 'variant', mutations: T.scene2Record},
    {id: 'rendering-off', kind: 'variant', mutations: T.renderingOff},
  ], {observe: {trace: {prgReads: true, ppuWrites: false, maxEvents: 100000}}}), rom1);
  const ch = (id, name) => byId(a05, id).channels[name].equalToBaseline, s2 = byId(a05, 'scene-2-record');
  const s2Caps = a05.results.find(r => r.id === 'scene-2-record').comparison.captures;
  const a05ok = byId(a05, 'ram-only').outcome === 'effect_observed' && ch('ram-only', 'ram') === false && ch('ram-only', 'nametables') && ch('ram-only', 'palette') && ch('ram-only', 'pixels')
    && ch('palette-only', 'palette') === false && ch('palette-only', 'pixels') === false && ch('palette-only', 'nametables')
    && s2.outcome === 'effect_observed' && s2.firstDivergence.frame > 120 && s2Caps.find(c => c.label === 'scene-0').differs.length === 0 && s2Caps.find(c => c.label === 'scene-1').differs.length === 0 && s2Caps.find(c => c.label === 'scene-2').differs.includes('nametables')
    && byId(a05, 'rendering-off').outcome === 'target_not_reached';
  check('A05: a RAM-only change with unchanged pixels and a palette change with an unchanged nametable are both detected per channel; a change that only shows in the third screen diverges after frame 120 and leaves the first two captures equal; a cartridge that never enables rendering is "target not reached", not "no effect"',
    a05ok, {outcomes: a05.receipts.map(r => r.trialId + ':' + r.outcome), firstDivergence: s2.firstDivergence?.frame, s2Caps});

  // ---- A03: effect, hang, crash, cancellation, unaffected follow-up ----
  const a03 = await runPlan(plan('a03-hang', rom1, train1, [{id: 'baseline', kind: 'baseline', mutations: [], trace: true}, {id: 'data', kind: 'variant', mutations: T.scene2Record, trace: true}, {id: 'hang', kind: 'variant', mutations: T.hang, trace: true}],
    {observe: {trace: {prgReads: false, ppuWrites: false, maxEvents: 1000}}, budgets: {eventsPerTrial: 1000}}), rom1);
  const crash = await page.evaluate(async bytes => { const r = await window.__session.run({steps: [{frames: 10, buttons: []}], captures: [{label: 'x', frame: 5}], channels: ['no-such-channel'], payloads: [], trace: null, frameDigests: false, budgets: {frames: 10, wallMs: 5000}, hangFrames: 60, rom: new Uint8Array(bytes), romSha: window.ForgeExperimentContract.sha256(new Uint8Array(bytes))});
    return {hint: r.outcomeHint, outcome: Forge.services.ExperimentRunner.classify(r, null, {captures: [{label: 'x'}], target: null}), reason: r.stopReason}; }, Array.from(rom1));
  const longInput = {steps: [{frames: 600, buttons: []}, {frames: 600, buttons: []}, {frames: 600, buttons: []}], captures: [{label: 'end', frame: 1800}]};
  const cancel = await page.evaluate(async ([p, bytes]) => { const c = new AbortController(); let aborted = 0; setTimeout(() => { aborted = performance.now(); c.abort(); }, 400);
    const r = await Forge.services.ExperimentRunner.run(p, new Uint8Array(bytes), {session: window.__session, signal: c.signal}); return {outcome: r.receipts[0].outcome, reason: r.receipts[0].stopReason, latencyMs: Math.round(performance.now() - aborted), framesRun: r.receipts[0].framesRun, closed: window.__session.closed(), baseUnchanged: r.baseUnchanged};
  }, [plan('a03-cancel', rom1, longInput, [{id: 'long', kind: 'baseline', mutations: []}]), Array.from(rom1)]);
  const after = await runPlan(plan('a03-after', rom1, train1, [{id: 'baseline', kind: 'baseline', mutations: []}]), rom1);
  const unaffected = JSON.stringify(after.receipts[0].captures.map(c => c.digests)) === JSON.stringify(byId(a02, 'cold-1').captures.map(c => c.digests));
  check('A03: a data mutation shows its effect; a code mutation that traps the CPU in a loop is capped and classified as a timeout (stuck program); an engine exception in the sandbox is a crash; a cancelled trial stops at the next chunk; the following baseline is identical to the earlier one',
    byId(a03, 'data').outcome === 'effect_observed' && byId(a03, 'hang').outcome === 'timeout' && /stuck/.test(byId(a03, 'hang').stopReason) && crash.outcome === 'crash' && cancel.outcome === 'cancelled' && !cancel.closed && cancel.baseUnchanged && unaffected,
    {hang: byId(a03, 'hang').stopReason, crash, cancel, unaffected});
  // hard cancel: the sandbox is removed mid-trial
  const hard = await page.evaluate(async ([p, bytes]) => { const s = await Forge.services.ExperimentSandbox.open(), t0 = performance.now(); setTimeout(() => s.close('test: removed mid-trial'), 400);
    const r = await Forge.services.ExperimentRunner.run(p, new Uint8Array(bytes), {session: s}); return {outcome: r.receipts[0].outcome, reason: r.receipts[0].stopReason, ms: Math.round(performance.now() - t0), iframes: document.querySelectorAll('iframe[name^="nes-forge-experiment-sandbox:"]').length, baseUnchanged: r.baseUnchanged}; },
  [plan('a03-hard', rom1, longInput, [{id: 'long', kind: 'baseline', mutations: []}]), Array.from(rom1)]);
  check('A03: removing the sandbox mid-trial ends the trial as cancelled within a moment, leaves no sandbox frame behind and leaves the base unchanged', hard.outcome === 'cancelled' && hard.ms < 2000 && hard.iframes === 1 && hard.baseUnchanged, hard);
  report.measurements.cancellation = {softLatencyMs: cancel.latencyMs, softFramesRun: cancel.framesRun, hardCloseToResultMs: hard.ms - 400};

  // ---- A10: identical payloads keep separate causal edges ----
  const r10 = await page.evaluate(async ([p, bytes]) => { const store = window.ForgeExperimentEvidence.createStore(), r = await Forge.services.ExperimentRunner.run(p, new Uint8Array(bytes), {session: window.__session, store});
    const caps = id => r.receipts.find(x => x.trialId === id).captures; const priv = store.exportPrivate(), again = window.ForgeExperimentEvidence.createStore(); again.importEvidence(priv); const second = again.importEvidence(priv);
    return {u1: caps('unrelated-1').map(c => c.payloads.nametables), u2: caps('unrelated-2').map(c => c.payloads.nametables), base: caps('baseline').map(c => c.payloads.nametables), palNt: caps('palette').map(c => c.payloads.nametables), palPal: caps('palette').map(c => c.payloads.palette), basePal: caps('baseline').map(c => c.payloads.palette),
      edges: store.edges().filter(e => e.trial.startsWith('unrelated')).length, stats: store.stats(), second}; },
  [plan('a10-edges', rom1, train1, [{id: 'baseline', kind: 'baseline', mutations: []}, {id: 'unrelated-1', kind: 'control-unrelated', mutations: [{offset: t1.regions.decoyPalette.physical, expected: rom1[t1.regions.decoyPalette.physical], value: rom1[t1.regions.decoyPalette.physical] ^ 0xff}]},
    {id: 'unrelated-2', kind: 'control-unrelated', mutations: [{offset: t1.regions.decoyRepeat.physical, expected: rom1[t1.regions.decoyRepeat.physical], value: rom1[t1.regions.decoyRepeat.physical] ^ 0xff}]}, {id: 'palette', kind: 'variant', mutations: T.paletteOnly}]), Array.from(rom1)]);
  check('A10: two different interventions with identical screens share one stored payload per screen but keep their own causal edges; the palette variant shares the nametable payload yet is a distinct observation; re-importing the private export adds nothing',
    JSON.stringify(r10.u1) === JSON.stringify(r10.u2) && JSON.stringify(r10.u1) === JSON.stringify(r10.base) && r10.edges === 6 && JSON.stringify(r10.palNt) === JSON.stringify(r10.base) && JSON.stringify(r10.palPal) !== JSON.stringify(r10.basePal) && r10.second.receipts === 0 && r10.second.payloads === 0, r10);
  await page.evaluate(() => window.__session.close('runner tests finished'));
  const runLateness = await page.evaluate(() => { clearInterval(window.__lagTimer); const l = window.__lateness.sort((a, b) => a - b); return {samples: l.length, maxMs: Math.round(l[l.length - 1] || 0), p95Ms: Math.round(l[Math.floor(l.length * 0.95)] || 0), over100ms: l.filter(x => x > 100).length}; });
  const rssClosed = await rssOfBrowser(), heapClosed = await heap(); report.measurements.sandbox.rssKiB.afterClose = rssClosed; report.measurements.sandbox.jsHeapBytes.afterClose = heapClosed;
  report.measurements.editorTimerLatenessDuringRunnerTests = runLateness;

  // ---- overhead: the editor's own emulator, a sandboxed run, a traced sandboxed run (a separate page for the editor) ----
  const p2 = await context.newPage(); await p2.goto('file://' + editor); await p2.waitForFunction(() => window.Forge && Forge.commands, null, {timeout: 180000});
  const liveSpeed = await p2.evaluate(async bytes => { emuLoadRomData(new Uint8Array(bytes), 'speed', 0); const t = performance.now(); for (let i = 0; i < 600; i++) emuRunFrame(); return (performance.now() - t) / 600; }, Array.from(rom1));
  await p2.close();
  const speed = await page.evaluate(async ([p, bytes]) => { const s = await Forge.services.ExperimentSandbox.open(); const r = await Forge.services.ExperimentRunner.run(p, new Uint8Array(bytes), {session: s}); s.close('speed');
    return r.results.map(x => ({id: x.trial.id, msPerFrame: x.result.wallMs / x.result.framesRun})); }, [plan('overhead', rom1, {steps: [{frames: 600, buttons: []}], captures: [{label: 'end', frame: 600}]},
    [{id: 'untraced', kind: 'baseline', mutations: [], trace: false}, {id: 'traced', kind: 'baseline', mutations: [], trace: true}], {observe: {trace: {prgReads: true, ppuWrites: true, maxEvents: 100000}}}), Array.from(rom1)]);
  report.measurements.msPerFrame = {editorEmulator: +liveSpeed.toFixed(2), sandboxUntraced: +speed[0].msPerFrame.toFixed(2), sandboxTraced: +speed[1].msPerFrame.toFixed(2), note: 'sandbox figures include per-frame digests, chunked yielding and capture'};

  // =================================================================================================================
  // Discovery on every seed: development, then withheld (acceptance + generalization)
  // =================================================================================================================
  let lag = null;
  await page.evaluate(() => { window.__lateness = []; let last = performance.now(); window.__lagTimer = setInterval(() => { const now = performance.now(); window.__lateness.push(now - last - 50); last = now; }, 50); });
  const discoveries = [];
  const discoverySeeds = process.env.AL_EXP_SEEDS === 'quick' ? development.slice(0, 1) : development; // quick: a developer shortcut, never a receipt
  for (const f of [...discoverySeeds, ...withheld]) {
    const truth = truthOf(f), rom = romOf(f), t0 = Date.now();
    const r = await run('experiment.discoverMetatiles', {bytes: toArr(rom), training: design(truth, 'training'), holdout: design(truth, 'holdout')});
    if (!r.ok) { check('Discovery on seed ' + f.seed + ' (' + f.role + ')', false, r.error); continue; }
    const d = r.result, ev = oracle.evaluate(truth, d.definition, d.holdout.reconstruction, rom); // the truth file is read only now
    const trueRank = d.stages.propose.ranked.find(w => w.base.physical === truth.table.physicalBase && w.layout === truth.table.layout && w.order === truth.table.order && w.fieldStep === truth.table.fieldStep)?.rank ?? null;
    const trueStatic = d.stages.propose.staticRanking.findIndex(id => id === d.stages.propose.ranked.find(w => w.rank === trueRank)?.id) + 1;
    const decoysFalsified = d.stages.test.interventions.filter(i => i.kind === 'tile' && i.candidate !== d.stages.freeze.candidate).every(i => i.result === 'falsified');
    const row = {seed: f.seed, role: f.role, layout: truth.table.layout + '/' + truth.table.order, records: truth.table.count, oracle: ev.passed, failed: ev.checks.filter(c => !c.passed).map(c => c.name), trueRank, trueStaticRank: trueStatic || null,
      frozenRank: d.stages.freeze.rank, decoysFalsified, controls: d.stages.test.controls.map(c => c.outcome), repeatability: d.stages.observe.repeatability, cells: ev.cells, attributes: ev.attributes, statuses: d.holdout.reconstruction.counts,
      frozenBeforeHoldout: d.stages.freeze.frozenBeforeHoldout && d.holdout.definitionHash === d.definition.definitionHash, unknownWithoutId: d.holdout.reconstruction.cells.filter(c => c.status === 'unknown').every(c => c.ids.length === 0),
      baseUnchanged: d.baseUnchanged && sha(romOf(f)) === f.sha256, proposeMs: d.timings.proposeMs, bootMs: d.timings.bootMs, seconds: Math.round((Date.now() - t0) / 100) / 10, sandboxRuns: d.sandbox.runs, definition: d.definition.definitionHash};
    report.seeds.push(row); discoveries.push({f, d, truth, rom});
    console.log('seed ' + f.seed + ' (' + f.role + '): oracle ' + (ev.passed ? 'pass' : 'FAIL') + ', rank ' + trueRank + ', ' + row.seconds + ' s');
  }
  lag = await page.evaluate(() => { clearInterval(window.__lagTimer); const l = window.__lateness.sort((a, b) => a - b); return {samples: l.length, maxMs: Math.round(l[l.length - 1] || 0), p95Ms: Math.round(l[Math.floor(l.length * 0.95)] || 0), over100ms: l.filter(x => x > 100).length}; });
  report.measurements.editorTimerLatenessDuringDiscovery = {...lag, note: 'a 50 ms timer in the editor while discovery ran (each discovery starts one sandbox, whose boot shares the editor\'s thread in this Chromium)'};
  const okRow = r => r.oracle && r.trueRank >= 1 && r.trueRank <= 5 && r.frozenRank === r.trueRank && r.decoysFalsified && r.controls.every(c => c === 'no_effect_observed') && r.repeatability === 'passed' && r.frozenBeforeHoldout && r.unknownWithoutId && r.baseUnchanged;
  const devRows = report.seeds.filter(r => r.role.startsWith('development')), heldRows = report.seeds.filter(r => !r.role.startsWith('development'));
  check('A08/A09 development seeds (' + devRows.length + '): blind discovery finds each table (rank ≤ 5 before testing, the tested survivor is the true table, every tested decoy falsified, controls without effect); the frozen definition reconstructs the withheld screen with no wrong block ID and every stated attribute bit right, judged by the independent oracle',
    devRows.length === discoverySeeds.length && devRows.every(okRow) && (process.env.AL_EXP_SEEDS !== 'quick'), devRows.map(r => ({seed: r.seed, oracle: r.oracle, failed: r.failed, rank: r.trueRank, frozen: r.frozenRank, decoys: r.decoysFalsified, cells: r.cells, attributes: r.attributes})));
  if (withheld.length) check('A08/A09 withheld seeds (' + heldRows.length + ': one acceptance seed and four generalization seeds, never run while the discovery code was built): the same, judged by the same oracle',
    heldRows.length === withheld.length && heldRows.every(okRow), heldRows.map(r => ({seed: r.seed, role: r.role, oracle: r.oracle, failed: r.failed, rank: r.trueRank, frozen: r.frozenRank, decoys: r.decoysFalsified, cells: r.cells, attributes: r.attributes})));

  // ---- A15: same-engine repeatability is not independent verification ----
  const {f: fA, d: dA, truth: tA, rom: romA} = discoveries[0];
  await page.evaluate(async () => { window.__session = await Forge.services.ExperimentSandbox.open(); });
  const hold = await runPlan(plan('a15-holdout', romA, design(tA, 'holdout'), [{id: 'baseline', kind: 'baseline', mutations: []}]), romA, {nametables: true}).catch(e => ({error: e.message}));
  await page.evaluate(() => window.__session.close('A15 finished'));
  let a15 = null;
  if (!hold.error) {
    const c = hold.results[0].nametables[0], capture = {label: c.label, nametables: Uint8Array.from(c.nametables), ppu: c.ppu}, layout = Contract.romLayout(romA), bad = oracle.broken(dA.definition);
    const good1 = Finder.reconstruct(dA.definition, romA, layout, capture), bad1 = Finder.reconstruct(bad, romA, layout, capture), bad2 = Finder.reconstruct(bad, romA, layout, capture);
    a15 = {goodOracle: oracle.evaluate(tA, dA.definition, good1, romA).passed, brokenRepeatable: JSON.stringify(bad1) === JSON.stringify(bad2), brokenOracle: oracle.evaluate(tA, bad, bad1, romA), brokenStatuses: bad1.counts};
  }
  check('A15: a deliberately broken definition (table shifted by one record) reconstructs identically every time on the same engine, yet the independent oracle rejects it; the true definition passes. Repeatability is reported as repeatability only',
    a15 && a15.goodOracle && a15.brokenRepeatable && !a15.brokenOracle.passed && dA.definition.verification.independent === 'not performed', a15 ? {goodOracle: a15.goodOracle, brokenRepeatable: a15.brokenRepeatable, brokenFailed: a15.brokenOracle.checks.filter(x => !x.passed).map(x => x.name), brokenStatuses: a15.brokenStatuses} : hold);
  report.evaluations = discoveries.map(({f, d, truth, rom}) => oracle.evaluate(truth, d.definition, d.holdout.reconstruction, rom));

  // ---- A16 (intake): candidates never enter the verified library ----
  const intake = await page.evaluate(async def => { const L = Forge.services.ResourceLibrary, before = JSON.stringify(await L.list({})), bytes = new TextEncoder().encode(JSON.stringify(def)), out = {};
    for (const [name, fn] of [['library.register', () => L.register(bytes, {name: 'candidate.json'})], ['library.importLibrary', () => L.importLibrary(bytes)], ['library.importInvestigation', () => Forge.services.FrameEvidence.importInvestigation(def)]]) { try { await fn(); out[name] = 'accepted'; } catch (e) { out[name] = 'refused: ' + e.message.slice(0, 90); } }
    out.unchanged = JSON.stringify(await L.list({})) === before; out.mutatingExperimentCommands = Forge.commands.list().filter(c => c.group === 'experiment' && /promote|register|import|library/i.test(c.name)).map(c => c.name); return out; }, dA.definition);
  check('A16 (intake): a candidate definition offered to the library\'s pack registration, library import or investigation import is refused, the library is unchanged, and no experiment command can promote or register anything',
    Object.entries(intake).filter(([k]) => k.startsWith('library.')).every(([, v]) => /refused/.test(v)) && intake.unchanged && !intake.mutatingExperimentCommands.length, intake);

  // ---- the panel (synthetic demonstration only) ----
  await page.evaluate(() => { switchTab('disasm'); Forge.services.REAnalysisUI?.showWorkspace?.(true); document.getElementById('reDiscoveryPanel')?.scrollIntoView({block: 'start'}); });
  // visible text only: the panel carries its own <style>
  const panelText = () => { const p = document.getElementById('reDiscoveryPanel'); if (!p) return ''; const c = p.cloneNode(true); c.querySelectorAll('style,script').forEach(e => e.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
  const panelBefore = await page.evaluate(src => { const panelText = eval(src); return {present: !!document.getElementById('reDiscoveryPanel'), text: panelText().slice(0, 400), pickers: document.querySelectorAll('#reDiscoveryPanel input[type=file], #reDiscoveryPanel select').length}; }, '(' + panelText.toString() + ')');
  await page.click('#reDiscoveryRun'); await page.waitForFunction(() => /^Finished|^Stopped/.test(document.getElementById('reDiscoveryStatus').textContent), null, {timeout: 300000});
  const panel = await page.evaluate(src => { const panelText = eval(src), p = document.getElementById('reDiscoveryPanel'); return {status: document.getElementById('reDiscoveryStatus').textContent, text: panelText(), rows: p.querySelectorAll('tbody tr').length, firstRowTested: p.querySelector('tbody tr td:last-child')?.textContent, chip: p.querySelector('.re-chip')?.textContent}; }, '(' + panelText.toString() + ')');
  if (shots) { await page.locator('#reDiscoveryPanel').screenshot({path: path.join(shots, 'AL1_discovery_panel.png')}); }
  const exported = await run('experiment.exportMetadata', {});
  if (output) fs.writeFileSync(path.join(path.dirname(output), 'al-exp-01-demonstration-metadata.json'), JSON.stringify(exported.ok ? exported.result : exported, null, 1) + '\n');
  const exportText = JSON.stringify(exported.result || {});
  check('Panel: only the synthetic demonstration is offered (no cartridge picker); it runs to a candidate, tested first-ranked table, and says that independent verification is not performed in the editor; its metadata export holds no payload bytes or paths',
    panelBefore.present && panelBefore.pickers === 0 && /^Finished/.test(panel.status) && panel.rows >= 3 && panel.firstRowTested === 'supported' && panel.chip === 'candidate' && /Independent verification: not performed in the editor/.test(panel.text)
    && exported.ok && !/"base64"|\.nes"|\/home\//.test(exportText), {panelBefore, panel: {...panel, text: panel.text.slice(0, 600)}, exportBytes: exportText.length});

  // ---- the live editor afterwards ----
  const liveAfter = await liveDigest();
  check('The live project, the editor\'s emulator state and cartridge, the resource library and the browser databases are exactly as before every experiment; no sandbox is left open',
    JSON.stringify(liveAfter) === JSON.stringify(liveBefore) && liveAfter.iframes === 0, {liveBefore, liveAfter});
  check('Offline: no network request left file:// during the whole run', requests.length === 0, requests.slice(0, 5));
  check('No uncaught page errors', errors.length === 0, errors.slice(0, 8));
  await browser.close();

  // ---- informational: the same sandbox with Chromium's process isolation for sandboxed iframes ----
  try {
    const b2 = await chromium.launch({args: ['--enable-features=IsolateSandboxedIframes']}), c2 = await b2.newContext(), q = await c2.newPage();
    await q.goto('file://' + editor); await q.waitForFunction(() => window.Forge && Forge.services.ExperimentSandbox, null, {timeout: 180000});
    const iso = await q.evaluate(async ([p, bytes]) => { const l = []; let last = performance.now(); const t = setInterval(() => { const now = performance.now(); l.push(now - last - 50); last = now; }, 50);
      const t0 = performance.now(), s = await Forge.services.ExperimentSandbox.open(), boot = performance.now() - t0, bootMax = Math.max(0, ...l.splice(0));
      const r = await Forge.services.ExperimentRunner.run(p, new Uint8Array(bytes), {session: s}); s.close('done'); clearInterval(t);
      return {bootMs: Math.round(boot), latenessDuringBootMs: Math.round(bootMax), latenessDuringRunMaxMs: Math.round(Math.max(0, ...l)), outcome: r.receipts[0].outcome, identical: r.identity.documentSha256}; },
      [plan('isolated-process', rom1, train1, [{id: 'baseline', kind: 'baseline', mutations: []}]), Array.from(rom1)]);
    const targets = (await (await c2.newCDPSession(q)).send('Target.getTargets')).targetInfos.map(t => t.type);
    report.measurements.withSandboxedIframeIsolation = {...iso, identical: iso.identical === report.editorSha256, processModel: targets.includes('iframe') ? 'separate renderer process' : 'same renderer process', note: 'Chromium flag --enable-features=IsolateSandboxedIframes; informational, not a pass/fail check'};
    await b2.close();
  } catch (e) { report.measurements.withSandboxedIframeIsolation = {error: String(e.message || e).slice(0, 300)}; }

  // ---- acceptance map (Audit 02 07_verification_acceptance.md) ----
  const passed = name => report.checks.filter(c => c.name.startsWith(name)).every(c => c.passed) && report.checks.some(c => c.name.startsWith(name));
  const st = (ok, partial) => ok ? (partial ? 'PARTIAL' : 'PASS') : 'FAIL';
  accept('A01', st(passed('A01')), 'header, trainer, PRG/CHR bounds, vector, plan-protected, duplicate and wrong-expected mutations; the base SHA-256 is re-checked after every trial (success, rejection, timeout, soft and hard cancel); the crash case is an engine exception inside the sandbox, which never holds the base');
  accept('A02', st(passed('A02')), 'cold ×2 and checkpoint-restored ×2 identical incl. ordered bus events; same-value control; incompatible checkpoint refused');
  accept('A03', st(passed('A03')), 'data effect, stuck-CPU timeout, sandbox crash, soft and hard cancellation, unaffected follow-up baseline');
  accept('A04', st(passed('A04'), true), 'NROM portion: opcode/operand/data/dual-use/vector/unvisited roles and the $8000/$C000 mirror. Banked fixtures (identical CPU addresses resolving differently): DEFERRED to slice 2');
  accept('A05', st(passed('A05')), 'RAM-only and palette-only differences, delayed first divergence, target not reached kept apart from no effect');
  accept('A06', st(passed('A02: a variant'), true), 'bounded: in-sandbox checkpoints refuse another cartridge or a replaced machine. Corrupted exported checkpoints and worker interruption/restart: DEFERRED (no checkpoint leaves the sandbox in this slice; worker job kind is BL08)');
  accept('A07', st(passed('A07'), true), 'NROM portion: mirrored nametable and palette writes, watched RAM, passive observation, cap and truncation. CHR-RAM and bank-switch events: DEFERRED (NROM CHR-ROM fixture)');
  accept('A08', st(passed('A08'), true), '2x2 interleaved and split-array tables in both quadrant orders, decoys and aliases, 12 seeds incl. 5 withheld. 4x4, other strides beyond split arrays: DEFERRED');
  accept('A09', st(passed('A08/A09'), true), 'held-out screen reconstructed exactly (IDs and attribute bits), unknown and ambiguous kept explicit. Partial scroll and dynamic CHR: DEFERRED');
  accept('A10', st(passed('A10')), 'payload deduplication with separate causal edges, palette distinction, idempotent import, tampered payload and receipt refused');
  accept('A11', 'DEFERRED', 'pointer tables (BL07): later scope');
  accept('A12', 'DEFERRED', 'collision and object fields (BL10): later scope');
  accept('A13', 'DEFERRED', 'compression grammars (BL11): later scope');
  accept('A14', st(passed('BL01 contract')), 'valid/invalid/adversarial plans, unsupported kinds, budget limits; trials run in declared order; explicit states');
  accept('A15', st(passed('A15'), true), 'independent oracle (generator data, no shared code) rejects a broken definition that repeats perfectly on the same engine. Second emulator: DEFERRED (BL12)');
  accept('A16', st(passed('A16')), 'tampered receipts/candidates refused; candidates cannot be marked verified; library intake refuses them; metadata export without bytes or paths; no promotion path exists');
  accept('A17', 'DEFERRED', 'worker experiment endpoints (BL08): later scope. The existing worker security suite (agent-lab-worker) still runs in the full regression');
  accept('A18', st(passed('The live project') && passed('Offline') && passed('Isolation'), true), 'standalone from file:// without the worker, no network, editor state unchanged, timer lateness measured; the full regression is a separate receipt. Worker-paired portion: DEFERRED');
  report.passed = report.checks.every(c => c.passed);
  report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length;
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
  console.log(report.checksPassed + '/' + report.total + ' passed');
  process.exit(report.passed ? 0 : 1);
})().catch(e => { console.error(e); if (output) fs.writeFileSync(output, JSON.stringify({...report, passed: false, error: String(e.stack || e)}, null, 1) + '\n'); process.exit(1); });
