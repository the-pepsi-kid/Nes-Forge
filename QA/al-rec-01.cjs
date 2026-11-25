#!/usr/bin/env node
'use strict';
// AL-REC-01 acceptance: persistent ROM recovery and reconstruction.
//   node QA/al-rec-01.cjs <NES_Forge.html> <receipt.json> [<cartridges folder>] [<extractions folder>]
// Without cartridges only the synthetic checks run; checks that need a cartridge say so ("skipped") and do not pass.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto'), {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const [editorArg, out, cartDir, exDir] = process.argv.slice(2);
const editor = path.resolve(editorArg || path.join(ROOT, 'NES_Forge.html'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const cart = n => { const f = cartDir && path.join(cartDir, n + '.nes'); return f && fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null; };
const results = [], metrics = {};
async function check(name, fn) { const t0 = Date.now(); try { const detail = await fn(); const skipped = detail && detail.skipped; results.push({name, passed: !skipped, skipped: !!skipped, ms: Date.now() - t0, detail}); console.log((skipped ? 'SKIP ' : 'PASS ') + name + (skipped ? ' (' + detail.skipped + ')' : '')); }
  catch (e) { results.push({name, passed: false, ms: Date.now() - t0, error: String(e.stack || e).slice(0, 2000)}); console.log('FAIL ' + name + '\n' + String(e.stack || e).slice(0, 1200)); } }
const jsdom = async () => { const {load} = require('../app/tests/dom-environment.cjs'); const a = load(editor), w = a.window; await new Promise(r => setTimeout(r, 40)); w.emuReadJoyState = () => 0; return w; };
let browser = null; const chromiumPage = async () => { const {chromium} = require('playwright'); browser = browser || await chromium.launch(); const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.RecoveryLedger'); await page.waitForTimeout(300); return {ctx, page, errors}; };

(async () => {
  // ---------- 1. CHR provenance on a cartridge whose answer is known ----------
  await check('provenance: the CHR RAM tracer classifies each graphics source of a synthetic cartridge correctly', async () => {
    const {build} = require('./fixtures/al-rec-01/chr-sources.cjs'), f = build(), w = await jsdom(), emu = w.eval('emu'), run = w.eval('emuRunFrame');
    assert.ok(w.eval('emuLoadRomData')(w.Uint8Array.from(f.rom), 'synthetic.nes', 0));
    let n = 0; while (emu.chrRam.subarray(80, 96).every(v => v === 0) && n++ < 20) run();
    const T = w.Forge.services.RecoveryTrace, tr = T.install(); let m = 0; while (emu.chrRam.subarray(64, 80).every(v => v === 0) && m++ < 20) { run(); tr.endFrame(); } run(); tr.endFrame();
    const cap = tr.capture(); tr.uninstall(); const an = T.analyze(cap, f.rom), rows = new Map(an.rows.map(r => [r.tile, r]));
    for (const [tile, want] of Object.entries(f.expected)) { const r = rows.get(+tile); assert.equal(r.class, want.class, 'tile ' + tile + ': ' + JSON.stringify(r));
      if (want.offsets) assert.deepEqual(Array.from(r.offsets.slice(0, want.offsets.length)), want.offsets, 'tile ' + tile + ' source'); if (want.transform) assert.equal(r.transform, want.transform); if (want.located) assert.equal(r.located, want.located); }
    return {tiles: Object.fromEntries([...rows].filter(([t]) => t < 6).map(([t, r]) => [t, r.class + (r.detail ? ': ' + r.detail : '')])), writers: cap.writers.length};
  });
  await check('provenance: traced tiles are written back into PRG, the game uploads the edit, and the original file is unchanged', async () => {
    const {build} = require('./fixtures/al-rec-01/chr-sources.cjs'), P = require('../app/src/re/chr-provenance.js'), f = build(), before = sha(f.rom);
    const w = await jsdom(), emu = w.eval('emu'), run = w.eval('emuRunFrame');
    w.eval('emuLoadRomData')(w.Uint8Array.from(f.rom), 's.nes', 0); for (let i = 0; i < 2; i++) run();
    const T = w.Forge.services.RecoveryTrace, tr = T.install(); for (let i = 0; i < 4; i++) { run(); tr.endFrame(); } const cap = tr.capture(); tr.uninstall();
    const rows = T.analyze(cap, f.rom).rows, edit = Uint8Array.from({length: 16}, (_, i) => (i * 37 + 11) & 255);
    const wb = P.writeback(f.rom, rows.map(r => ({...r})), [{tile: 0, bytes: edit}, {tile: 4, bytes: edit}, {tile: 3, bytes: edit}]);
    assert.equal(wb.refused.length, 1); assert.equal(wb.refused[0].tile, 3, 'the procedural tile has no native source to write');
    assert.equal(sha(f.rom), before, 'the original cartridge bytes are unchanged');
    const w2 = await jsdom(), emu2 = w2.eval('emu'), run2 = w2.eval('emuRunFrame'); w2.eval('emuLoadRomData')(w2.Uint8Array.from(wb.rom), 'edited.nes', 0); for (let i = 0; i < 6; i++) run2();
    assert.deepEqual(Array.from(emu2.chrRam.subarray(0, 16)), Array.from(edit), 'tile 0 (direct copy) carries the edit after the game uploads it');
    assert.deepEqual(Array.from(emu2.chrRam.subarray(64, 80)), Array.from(edit), 'tile 4 (decoded bit by bit) carries the edit');
    return {written: wb.written.length, refused: wb.refused.map(r => r.reason)};
  });
  // ---------- 2. machine state and isolation ----------
  await check('machine state: restoring a saved state reproduces the same emulation; another cartridge is refused; runs refuse the editor\'s own emulator', async () => {
    const {build} = require('./fixtures/al-rec-01/chr-sources.cjs'), w = await jsdom(), emu = w.eval('emu'), run = w.eval('emuRunFrame'), T = w.Forge.services.EmulatorTimeline;
    w.eval('emuLoadRomData')(w.Uint8Array.from(build().rom), 's.nes', 0); for (let i = 0; i < 30; i++) run();
    const s = T.machineState(), digest = () => sha(Buffer.concat([Buffer.from(emu.ram), Buffer.from(emu.vram), Buffer.from(emu.chrRam), Buffer.from([emu.A, emu.X, emu.Y, emu.PC & 255, emu.PC >> 8])]));
    for (let i = 0; i < 60; i++) run(); const a = digest(), fa = emu.frameCount; T.applyMachineState(s); for (let i = 0; i < 60; i++) run(); assert.equal(digest(), a); assert.equal(emu.frameCount, fa);
    const other = build().rom; other[16 + 0x2000] ^= 1; w.eval('emuLoadRomData')(w.Uint8Array.from(other), 'other.nes', 0); assert.throws(() => T.applyMachineState(s), /another cartridge/);
    await assert.rejects(() => w.Forge.services.RecoveryExplorer.run({rom: w.Uint8Array.from(other)}), /isolated copy/);
    await assert.rejects(() => w.Forge.services.RecoveryExplorer.replay(w.Uint8Array.from(other), []), /isolated copy/);
    return {stateBytes: JSON.stringify(Object.keys(s.emu)).length};
  });
  // ---------- 3. persistent, incremental recovery on a cartridge already in the library ----------
  const MM = cart('Mega Man (U)');
  await check('ledger: a cartridge already in the library is recovered further by continuing; the ledger persists and never calls it recovered', async () => {
    if (!MM) return {skipped: 'no Mega Man (U) cartridge'};
    const {ctx, page} = await chromiumPage(), pack = exDir && fs.existsSync(path.join(exDir, 'Mega_Man_U.zip')) ? Array.from(fs.readFileSync(path.join(exDir, 'Mega_Man_U.zip'))) : null;
    const r = await page.evaluate(async ([rom, pack]) => { const s = Forge.services, bytes = new Uint8Array(rom), e = await s.RomImports.record(bytes, 'Mega Man (U).nes', 'qa');
      if (pack) await s.ResourceLibrary.register(new Uint8Array(pack), {name: 'Mega_Man_U.zip'}); await s.CadPortRecovery.settled();
      const before = (await s.ResourceLibrary.list({shelf: e.sha256, limit: 1})).total;
      const a = await s.RecoveryLedger.run(bytes, 'Mega Man (U).nes', {mode: 'continue', budget: {frames: 14000, wallMs: 600000}});
      const b = await s.RecoveryLedger.run(bytes, 'Mega Man (U).nes', {mode: 'continue', budget: {frames: 8000, wallMs: 600000}});
      const after = (await s.ResourceLibrary.list({shelf: e.sha256, limit: 1})).total, l = await s.RecoveryLedger.read(e.sha256), arc = await s.RecoveryLedger.archive(e.sha256);
      return {sha: e.sha256, before, after, a: a.run, b: b.run, state: l.state, revision: l.revision, cells: arc.cells.length, known: a.ledger.known, known2: b.ledger.known}; }, [Array.from(MM), pack]);
    assert.ok(r.a.recorded > 0, 'the first run recorded new observations'); assert.ok(r.after > r.before, 'the library grew (' + r.before + ' -> ' + r.after + ')');
    assert.ok(r.b.resumedFrom > 0, 'the second run continued from the first run\'s states'); assert.notEqual(r.state, 'recovered');
    assert.ok(r.b.recorded > 0 || /converged/.test(r.b.stopReason), 'the second run added more, or says it converged: ' + r.b.stopReason);
    // the ledger is in the browser's storage: a new page of the same profile reads it back
    const p2 = await ctx.newPage(); await p2.goto('file://' + editor); await p2.waitForFunction('window.Forge?.services?.RecoveryLedger');
    const again = await p2.evaluate(async sha => { const l = await Forge.services.RecoveryLedger.read(sha), a = await Forge.services.RecoveryLedger.archive(sha); return {revision: l?.revision, cells: a?.cells.length}; }, r.sha);
    assert.equal(again.revision, r.revision); assert.equal(again.cells, r.cells); await ctx.close();
    metrics.continuation = {libraryBefore: r.before, libraryAfter: r.after, first: {recorded: r.a.recorded, stop: r.a.stopReason, gained: r.a.gained}, second: {recorded: r.b.recorded, stop: r.b.stopReason, gained: r.b.gained, resumedFrom: r.b.resumedFrom}};
    return metrics.continuation;
  });
  await check('controls: pause keeps the states and Resume continues from them; cancel keeps what was found', async () => {
    if (!MM) return {skipped: 'no Mega Man (U) cartridge'};
    const {ctx, page} = await chromiumPage();
    const r = await page.evaluate(async rom => { const s = Forge.services, R = s.RecoveryLedger, bytes = new Uint8Array(rom), e = await s.RomImports.record(bytes, 'mm.nes', 'qa');
      const running = R.run(bytes, 'mm.nes', {mode: 'continue', budget: {frames: 40000, wallMs: 600000}});
      await new Promise(res => { const off = R.subscribe(st => { const x = st.running[0]; if (x?.progress?.frames > 2500) { off(); res(); } }); });
      R.pause(e.sha256); const p = await running, archive = await R.archive(e.sha256);
      const resumed = await R.run(bytes, 'mm.nes', {mode: 'continue', budget: {frames: 3000, wallMs: 600000}});
      const third = R.run(bytes, 'mm.nes', {mode: 'continue', budget: {frames: 40000, wallMs: 600000}});
      await new Promise(res => { const off = R.subscribe(st => { const x = st.running[0]; if (x?.progress?.frames > 1500) { off(); res(); } }); });
      R.cancel(e.sha256); const c = await third, l = await R.read(e.sha256);
      return {paused: p.run.state, pauseReason: p.run.stopReason, cells: archive.cells.length, resumedFrom: resumed.run.resumedFrom, cancelled: c.run.state, cancelReason: c.run.stopReason, observations: l.observations.length, lastPaused: (await R.ledger(e.sha256)).paused}; }, Array.from(MM));
    await ctx.close();
    assert.equal(r.paused, 'paused'); assert.equal(r.pauseReason, 'paused by the user'); assert.ok(r.cells > 0); assert.ok(r.resumedFrom >= r.cells, 'resume starts from the paused run\'s states');
    assert.equal(r.cancelled, 'cancelled'); assert.ok(r.observations > 0, 'what the runs found is kept');
    return r;
  });
  await check('controls: Investigate Current Emulator State and Record Gameplay for Recovery add observations and starting points without restarting the ROM', async () => {
    if (!MM) return {skipped: 'no Mega Man (U) cartridge'};
    const {ctx, page} = await chromiumPage();
    const r = await page.evaluate(async rom => { const s = Forge.services, R = s.RecoveryLedger, bytes = new Uint8Array(rom);
      emuLoadRomData(bytes, 'Mega Man (U).nes', 0); emuPause(); let mask = 0; const prev = emuReadJoyState; emuReadJoyState = () => mask;
      const on = await R.recordGameplay(true);
      const script = [[0, 150], [8, 6], [0, 200], [8, 6], [0, 200], [1, 6], [0, 300], [128, 400], [129, 30], [128, 300]];
      for (const [m, n] of script) for (let i = 0; i < n; i++) { mask = m; emuRunFrame(); if ((i & 63) === 0) await new Promise(r => setTimeout(r, 0)); }
      const frameBefore = emu.frameCount, off = await R.recordGameplay(false);
      const cur = await R.current({label: 'qa'}); emuReadJoyState = prev;
      const sha = await s.RecoveryLedger.hex256(bytes), arc = await R.archive(sha);
      return {fromPowerOn: on.fromPowerOn, observations: off.observations, seeds: off.seeds, bankChanges: off.bankChanges, current: {matched: cur.matched, entry: !!cur.entryId}, frameAfter: emu.frameCount, frameBefore, seedsWithPath: arc.cells.filter(c => c.path).length, userSeeds: arc.cells.filter(c => /your emulator/.test(c.label)).length}; }, Array.from(MM));
    await ctx.close();
    assert.equal(r.fromPowerOn, true); assert.ok(r.observations > 0, 'gameplay produced observations'); assert.ok(r.seeds > 0 && r.seedsWithPath > 0, 'gameplay states are starting points, replayable from power-on');
    assert.ok(r.current.entry && r.current.matched, 'the current state is in the library, rebuilt without difference'); assert.equal(r.userSeeds, 1);
    assert.equal(r.frameAfter, r.frameBefore, 'capturing the current state does not advance or restart the emulator');
    return r;
  });
  // ---------- 4. dynamic CHR RAM (Battletoads) ----------
  const BT = cart('Battletoads (U)');
  await check('Battletoads: CHR RAM traced to its sources (direct, compressed, transformed); a traced tile written back reaches the game\'s CHR RAM', async () => {
    if (!BT) return {skipped: 'no Battletoads (U) cartridge'};
    const {ctx, page} = await chromiumPage(), P = require('../app/src/re/chr-provenance.js');
    const r = await page.evaluate(async rom => { window.__forgeAgentLabPage = true; const s = Forge.services, bytes = new Uint8Array(rom); emuLoadRomData(bytes, 'bt', 0); const tr = s.RecoveryTrace.install(); let cap = null;
      await s.RecoveryExplorer.replay(bytes, [['script', 2, 3000]], {loaded: true, onFrame: () => { tr.endFrame(); if (emu.frameCount === 3000) cap = tr.capture(); }}); tr.uninstall();
      const an = s.RecoveryTrace.analyze(cap, bytes);
      return {summary: an.summary, shown: an.shown, rows: an.rows.filter(x => x.class !== 'uniform').map(x => ({tile: x.tile, class: x.class, offsets: x.offsets || null, writable: x.writable || false, tests: x.tests || null, background: !!x.background, plane: x.plane, fill: x.fill, literals: x.literals || null})), chr: Array.from(cap.chr), writers: cap.writers.slice(0, 4)}; }, Array.from(BT));
    const by = r.summary.byClass; assert.ok(by.direct > 0 && by.compressed > 0 && by.transformed > 0, JSON.stringify(by));
    // a direct background tile whose edit the writeback accepts (bytes the decoder also tests must keep what it tests)
    let pick = null, edit = null, wb = null; const refusedEdits = [];
    for (const x of r.rows.filter(x => x.class === 'direct' && x.writable && x.background)) {
      const original = Uint8Array.from(r.chr.slice(x.tile * 16, x.tile * 16 + 16)), e = original.map(v => v ^ 0xff), w = P.writeback(BT, r.rows, [{tile: x.tile, bytes: e, original}]);
      if (w.refused.length) { refusedEdits.push({tile: x.tile, reason: w.refused[0].reason}); continue; } pick = x; edit = e; wb = w; break; }
    assert.ok(pick, 'some traced direct tile accepts an edit'); assert.notEqual(sha(wb.rom), sha(BT)); assert.equal(sha(BT), sha(cart('Battletoads (U)')), 'the original stays as it is');
    const r2 = await page.evaluate(async ([rom, tile]) => { const s = Forge.services, bytes = new Uint8Array(rom); await s.RecoveryExplorer.replay(bytes, [['script', 2, 3000]]); return Array.from(emu.chrRam.subarray(tile * 16, tile * 16 + 16)); }, [Array.from(wb.rom), pick.tile]);
    await ctx.close();
    assert.deepEqual(r2, Array.from(edit), 'the edited tile is what the game uploads');
    metrics.battletoads = {byClass: by, writable: r.summary.writable, writableWithoutConditions: r.summary.writableWholeTile, checked: r.rows.filter(x => x.writable === 'checked').length, shown: r.shown.byClass, writebackTile: pick.tile, writebackOffset: pick.offsets[0], refusedBeforeIt: refusedEdits, writers: r.writers};
    return metrics.battletoads;
  });
  await check('Battletoads: translated layouts get captured graphics where a run saw their screens; editable pages appear', async () => {
    if (!BT) return {skipped: 'no Battletoads (U) cartridge'};
    const {ctx, page} = await chromiumPage();
    const r = await page.evaluate(async rom => { const s = Forge.services, bytes = new Uint8Array(rom); await s.RomImports.record(bytes, 'Battletoads (U).nes', 'qa'); await s.CadPortRecovery.settled();
      const before = await s.CadPortRecovery.register(bytes, 'Battletoads (U).nes', {quiet: true});
      const run = await s.RecoveryLedger.run(bytes, 'Battletoads (U).nes', {mode: 'continue', budget: {frames: 16000, wallMs: 900000}});
      return {before: {withGraphics: before.withGraphics, editablePages: before.editablePages || 0}, after: run.cadPort}; }, Array.from(BT));
    await ctx.close();
    assert.equal(r.before.withGraphics, 0); assert.ok(r.after.capturedGraphics > 0 && r.after.editablePages > 0, JSON.stringify(r.after));
    metrics.battletoadsLayouts = r; return r;
  });
  // ---------- 5. scenes: no 12-page cap ----------
  const TM = cart('Teenage Mutant Ninja Turtles (U)');
  await check('scenes: every page with established graphics is editable, in linked project parts of at most 12 pages', async () => {
    if (!TM) return {skipped: 'no TMNT cartridge'};
    const w = await jsdom(), p = await w.Forge.services.CadPortRecovery.pack(w.Uint8Array.from(TM), 'Teenage Mutant Ninja Turtles (U).nes'), opened = await w.Forge.services.ExtractionPack.open(p.zip);
    let pages = 0, parts = 0, maxPart = 0, linked = 0;
    for (const d of p.definitions.filter(d => d.project)) { pages += d.projectPages; parts += d.projectParts; }
    for (const f of opened.files.project) { const e = await opened.entry(f); parts; maxPart = Math.max(maxPart, e.data.scenes.length); }
    for (const f of opened.files.resource) { const e = await opened.entry(f); if (e.data.projects?.parts?.length) { linked++; assert.equal(e.data.projects.parts.length, Math.ceil(e.data.projects.pages / 12)); } }
    assert.ok(pages > 12 * p.definitions.filter(d => d.project).length / 2, 'more pages than the old cap allowed'); assert.ok(maxPart <= 12); assert.ok(linked > 0);
    metrics.tmnt = {editablePages: pages, parts, linkedResources: linked, baselineEditablePages: 157}; return metrics.tmnt;
  });
  // ---------- 6. Agent Lab: continuation plans ----------
  await check('worker: a continuation plan starts from the archive; identical work is deduplicated; a run that finds nothing new completes', async () => {
    if (!MM) return {skipped: 'no Mega Man (U) cartridge'};
    const W = path.join(ROOT, 'tools/agent-lab/capture_worker.cjs'), root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-alrec-')), romFile = path.join(root, 'mm.nes'); fs.writeFileSync(romFile, MM);
    const env = {...process.env}; delete env.CHROMIUM_PATH; const cli = (...a) => spawnSync('node', [W, ...a], {encoding: 'utf8', env, timeout: 1800000});
    const jobOf = t => { const s = t.stdout; return JSON.parse(s.slice(s.indexOf('{'))); };
    const j1 = jobOf(cli('enqueue', '--root', root, '--rom', romFile, '--plan', 'continue')), j1b = jobOf(cli('enqueue', '--root', root, '--rom', romFile, '--plan', 'continue'));
    assert.equal(j1b.id, j1.id, 'identical work is not queued twice');
    cli('run', '--root', root, '--forge', editor, '--once'); const done1 = JSON.parse(fs.readFileSync(path.join(root, 'jobs', j1.id, 'job.json'), 'utf8'));
    const j2 = jobOf(cli('enqueue', '--root', root, '--rom', romFile, '--plan', 'continue')); assert.notEqual(j2.id, j1.id, 'new evidence: a new plan'); assert.match(j2.plan.name, /from archive/);
    cli('run', '--root', root, '--forge', editor, '--once'); const done2 = JSON.parse(fs.readFileSync(path.join(root, 'jobs', j2.id, 'job.json'), 'utf8'));
    fs.rmSync(root, {recursive: true, force: true});
    assert.equal(done1.state, 'completed'); assert.ok(done1.results.length > 0); assert.equal(done2.state, 'completed', JSON.stringify(done2.failures));
    return {first: {frames: done1.results.length, stop: done1.exploration[0].stopReason}, second: {frames: done2.results.length, stop: done2.exploration[0].stopReason, plan: j2.plan.name}};
  });
  // ---------- 7. experiments on locally supplied cartridges ----------
  await check('experiments: a locally supplied cartridge needs privacy "private", a supported mapper and explicit approval; with them the method runs and the original is unchanged', async () => {
    const C = require('../app/src/re/experiment-contract.js'), CV = cart('Castlevania (U) (PRG 0)'), PO = cart("Mike Tyson's Punch-Out!! (U) (PRG 0)");
    if (!CV) return {skipped: 'no Castlevania (U) (PRG 0) cartridge'};
    const L = C.romLayout(CV); assert.throws(() => C.authorize(CV, L, {privacy: 'private'}), /explicit approval/); assert.throws(() => C.authorize(CV, L, {privacy: 'synthetic', approval: C.approval(CV)}), /must declare privacy "private"/);
    assert.throws(() => C.authorize(CV, L, {privacy: 'private', approval: C.approval(cart('Mega Man (U)') || new Uint8Array(24592))}), /explicit approval/);
    if (PO) assert.throws(() => C.authorize(PO, C.romLayout(PO), {privacy: 'private', approval: C.approval(PO)}), /mapper 9/);
    const before = sha(CV), {ctx, page} = await chromiumPage();
    const r = await page.evaluate(async rom => { const s = Forge.services, C = window.ForgeExperimentContract, bytes = new Uint8Array(rom);
      const training = {steps: [{frames: 90, buttons: []}, {frames: 6, buttons: ['Start']}, {frames: 500, buttons: []}, {frames: 300, buttons: ['Right']}, {frames: 300, buttons: ['Right']}, {frames: 300, buttons: ['Right']}], captures: [{label: 'a', frame: 800}, {label: 'b', frame: 1000}, {label: 'c', frame: 1200}, {label: 'd', frame: 1400}]};
      const holdout = {steps: [{frames: 90, buttons: []}, {frames: 6, buttons: ['Start']}, {frames: 500, buttons: []}, {frames: 500, buttons: ['Right', 'B']}], captures: [{label: 'h', frame: 1000}]};
      const rep = await s.MetatileDiscovery.discover({rom: bytes, training, holdout, prepareVerification: false, approval: C.approval(bytes, {by: 'qa'})});
      return {authorization: rep.authorization, repeatability: rep.stages.observe?.repeatability, result: rep.result, distinct: rep.stages.propose?.distinctTuples, tested: (rep.hypotheses.falsified || []).length + (rep.hypotheses.supported || []).length, privacy: rep.plans?.[0]?.privacy || null}; }, Array.from(CV));
    await ctx.close();
    assert.equal(sha(CV), before); assert.equal(r.authorization.kind, 'locally supplied cartridge'); assert.equal(r.repeatability, 'passed', 'the baselines repeat (traces are compared within the window both recorded)');
    assert.ok(r.result.classification, 'an outcome is recorded'); metrics.commercialDiscovery = r; return r;
  });
  // ---------- 8. reconstruction report ----------
  await check('report: per category, captured / decoded / editable / verified / writable, with a verdict that never claims 1:1 without evidence', async () => {
    if (!MM) return {skipped: 'no Mega Man (U) cartridge'};
    const {ctx, page} = await chromiumPage();
    const r = await page.evaluate(async rom => { const s = Forge.services, bytes = new Uint8Array(rom), e = await s.RomImports.record(bytes, 'mm.nes', 'qa');
      await s.RecoveryLedger.run(bytes, 'mm.nes', {mode: 'continue', budget: {frames: 6000, wallMs: 300000}}); return s.RecoveryLedger.assess(e.sha256); }, Array.from(MM));
    await ctx.close();
    assert.equal(r.table.length, 14); assert.match(r.verdict, /^Not reconstructed 1:1/); assert.ok(r.parity.frames > 0 && r.parity.rebuiltWithoutDifference === r.parity.frames, JSON.stringify(r.parity));
    assert.ok(r.world && r.world.areas.length > 0); return {parity: r.parity, world: {areas: r.world.areas.length, transitions: r.world.transitions.length}, nothing: r.table.filter(x => x.state === 'nothing recovered').map(x => x.category)};
  });
  if (browser) await browser.close();
  const passed = results.filter(r => r.passed).length, failed = results.filter(r => !r.passed && !r.skipped).length;
  const receipt = {suite: 'al-rec-01', editorSha256: sha(fs.readFileSync(editor)), passed: failed === 0 && passed > 0, total: results.length, checksPassed: passed, skipped: results.filter(r => r.skipped).length, failed, metrics, results};
  if (out) fs.writeFileSync(out, JSON.stringify(receipt, null, 1) + '\n');
  console.log((receipt.passed ? 'PASSED ' : 'FAILED ') + passed + '/' + results.length);
  process.exit(receipt.passed ? 0 : 1);
})();
