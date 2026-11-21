#!/usr/bin/env node
// Recover once, remember persistently, recognize automatically, reuse everywhere: a recovered ROM catalog whose
// registration is interrupted is completed later, without losing what was recovered and without repeating extraction.
// Owner-side (needs the Ninja Gaiden (US) cartridge). Deterministic: after a fixed number of catalog entries is written,
// the library's entry store is held by another transaction, so registration provably stops part-way; then Forge is
// killed or closed.
//   node QA/catalog-recovery.cjs <NES_Forge.html> <report.json> <folder with cartridges> [<screenshot folder>]
// A  first registration interrupted by killing the browser (frames already imported)
// B  reopened without the worker: detected as incomplete, needs the cartridge; completed from the restored project;
//    the 590 entries, 32 CHR banks and 22 frames validated; links, Scene, Metasprites, CHR Sheet and CODE/RE; reuse in
//    a new project; the project's own edits unchanged
// C  later sessions: worker restarted, Forge reopened, the same ROM imported again: recognized, nothing redone
// D  registration interrupted by a normal tab close in another profile; completed with the cartridge from the worker
// E  failing writes: bounded automatic attempts (3, across sessions), visible state, manual Retry completes it
// F  failures before registration begins (the catalog's first write refused): still bounded across sessions, Retry
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), {spawn, execSync} = require('child_process');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
if (!editorArg || !output || !cartDir) { console.error('usage: node QA/catalog-recovery.cjs <NES_Forge.html> <report.json> <cartridges> [<shots>]'); process.exit(2); }
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const WORKER = path.join(path.resolve(__dirname, '..'), 'tools/agent-lab/capture_worker.cjs');
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const NG = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => path.join(cartDir, f)).find(f => sha(fs.readFileSync(f)) === NINJA);
const ROM = NG ? fs.readFileSync(NG) : null;
const report = {suite: 'catalog-recovery', editorSha256: sha(fs.readFileSync(editor)), checks: [], phases: {}};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 800))); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-catalog-')), PORT = 8798, ADMIN = crypto.randomBytes(16).toString('hex');
let worker = null, pairingCode = null;
function startWorker() {
  return new Promise((resolve, reject) => {
    worker = spawn(process.execPath, [WORKER, 'serve', '--root', root, '--forge', editor, '--port', String(PORT), '--token', ADMIN], {stdio: ['ignore', 'pipe', 'pipe']});
    const t = setTimeout(() => reject(Error('worker did not start')), 15000);
    worker.stdout.on('data', d => { const m = /pairing code ([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(String(d)); if (m) { pairingCode = m[1]; clearTimeout(t); resolve(); } });
    worker.stderr.on('data', d => process.stderr.write('[worker] ' + d));
  });
}
const stopWorker = async () => { if (worker) { worker.kill('SIGTERM'); await new Promise(r => worker.once('exit', r)); worker = null; } };
const jobs = () => fs.readdirSync(path.join(root, 'jobs')).map(id => JSON.parse(fs.readFileSync(path.join(root, 'jobs', id, 'job.json'), 'utf8')));
async function until(fn, ms = 900000, every = 300, why = null) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) { let d = ''; try { d = why ? ': ' + JSON.stringify(await why()).slice(0, 4000) : ''; } catch (e) { d = ': (diagnostics failed: ' + e.message + ')'; } throw Error('timed out after ' + ms + ' ms' + d); } await sleep(every); } }
// Counts catalog entries as they are written. 'hold': after K, the library's entry store is held by another
// transaction (every later batch waits) and the test is told. 'throw': writes fail after K (a refusing browser).
const HOOK = ({k, mode}) => {
  window.__qaHook = mode;
  const put0 = IDBObjectStore.prototype.put; let n = 0, fired = false;
  IDBObjectStore.prototype.put = function (v, ...rest) {
    if (this.name === 'entries' && v && v.origin === 'rom-catalog' && this.transaction.db.name === 'nesforge-library') {
      n++; window.__qaCatalogPuts = n;
      if (mode === 'throw' && n >= k) throw new DOMException('simulated: the browser refused to store more data', 'QuotaExceededError');
      if (mode === 'hold' && n >= k && !fired) { fired = true; const r = indexedDB.open('nesforge-library');
        r.onsuccess = () => { const st = r.result.transaction(['entries'], 'readwrite').objectStore('entries'); const spin = () => { st.get('qa-none').onsuccess = spin; }; spin(); window.__qaMidCatalog?.(n); }; }
    }
    return put0.call(this, v, ...rest);
  };
};
async function open(profile, {hook, refuseMarker = false} = {}) {
  const ctx = await chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}});
  const page = ctx.pages()[0] || await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept()); page.setDefaultTimeout(900000);
  if (hook) await page.addInitScript(HOOK, hook);
  // F: the recovered catalog's first write (its "registering" record) is refused, as storage that rejects it would
  if (refuseMarker) await page.addInitScript(() => { const put0 = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, ...rest) {
    if (this.name === 'packs' && v && v.origin === 'rom-catalog' && v.state === 'registering' && this.transaction.db.name === 'nesforge-library') { window.__qaMarkerRefusals = (window.__qaMarkerRefusals || 0) + 1; throw new DOMException('simulated: the browser refused to store the catalog record', 'QuotaExceededError'); }
    return put0.call(this, v, ...rest); }; });
  // every recovery state the library reports, from the first moment of the page (startup attempts included)
  await page.addInitScript(() => { window.__qaRecovery = []; addEventListener('forge:catalog-recovery', e => { const d = e.detail || {}; window.__qaRecovery.push({state: d.state, attempts: d.attempts ?? null, reason: d.reason || null, at: d.at, retryAt: d.retryAt || null}); }); });
  await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.InvestigationPanel && window.Forge.services.LibraryCatalog?.catalogState');
  await page.waitForFunction(() => Forge.services.ProjectStore.state.recoveryPhase !== 'checking');
  return {ctx, page, errors};
}
const shotOf = page => async name => { if (!shots) return; await page.waitForTimeout(300); await page.screenshot({path: path.join(shots, name + '.png')}); };
// a pairing code works once: each further profile gets a new one, as a developer would (capture_worker.cjs pair)
function newPairingCode() { const out = execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(WORKER) + ' pair --root ' + JSON.stringify(root)).toString(); const m = /pairing code ([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(out); if (!m) throw Error('no pairing code: ' + out); pairingCode = m[1]; }
async function pair(page) { await page.evaluate(([u, c]) => Forge.services.InvestigationPanel.pair(u, c), ['http://127.0.0.1:' + PORT, pairingCode]); await page.evaluate(() => Forge.services.InvestigationPanel.setOptions({autoInvestigate: true, autoImport: true})); }
async function importInvestigated(page) {
  await page.setInputFiles('#projectGatewayFile', NG);
  await page.waitForFunction(() => [...document.querySelectorAll('#projectGatewayPanel button')].some(b => /investigated project/i.test(b.textContent)));
  await page.evaluate(() => [...document.querySelectorAll('#projectGatewayPanel button')].find(b => /investigated project/i.test(b.textContent)).click());
  await page.waitForFunction(() => document.getElementById('investigationPrepare') || document.getElementById('investigationImport'));
  await page.evaluate(() => { const p = document.getElementById('investigationPrepare'); if (p && !p.disabled) p.click(); });
  await page.waitForFunction(() => !document.getElementById('investigationImport')?.disabled); await page.click('#investigationImport'); await page.waitForFunction(() => !!S.investigation);
}
const committed = page => page.waitForFunction(() => { const r = Forge.services.ProjectStore.recoveryState(); return r.baseline && !r.writing && r.committedSeq === r.editSeq && r.committedChangeSeq === r.changeSeq; }, null, {timeout: 60000});
async function edit(page) {
  await page.evaluate(() => { switchTab('scene'); S.selTile = 7; });
  const box = await page.$eval('#cv', c => { const r = c.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width}; });
  for (let i = 0; i < 6; i++) await page.mouse.click(box.x + (60 + i * 16) * box.w / 256, box.y + 88 * box.w / 256);
  await page.click('.tab:text-is("METASPRITES")');
  await page.evaluate(() => { const f = S.metasprites[0]; Forge163.metasprites.select(f.id); const i = document.getElementById('msX163'); i.value = String(Number(i.value) + 3); i.dispatchEvent(new Event('change', {bubbles: true})); });
  await page.click('.tab:text-is("SCENE")'); await committed(page);
}
const serialize = page => page.evaluate(() => Forge.services.ProjectStore.serialize());
// What the library holds for Ninja Gaiden. The entry store must not be held when this runs.
const inventory = page => page.evaluate(async sha => {
  const L = Forge.services.ResourceLibrary, all = []; for (let o = 0; ; o += 5000) { const p = await L.list({shelf: sha, offset: o, limit: 5000}); all.push(...p.items); if (o + 5000 >= p.total) break; }
  const packs = (await Forge.commands.run('library.packs')).result.filter(p => p.sourceSha256 === sha);
  const by = (f) => all.filter(f).length, ids = new Set(all.map(e => e.id));
  return {total: all.length, uniqueIds: ids.size, catalogEntries: by(e => e.origin === 'rom-catalog'), chr: by(e => e.origin === 'rom-catalog' && e.kind === 'chr'), poses: by(e => e.origin === 'rom-catalog' && e.kind === 'pose'),
    rooms: by(e => e.origin === 'rom-catalog' && e.kind === 'room'), frames: by(e => e.kind === 'frame'), catalogPacks: packs.filter(p => p.origin === 'rom-catalog').map(p => ({key: p.packSha256, state: p.state, entries: p.stats?.entries, chrBanks: p.stats?.chrBanks, kept: p.stats?.kept, written: p.stats?.written})),
    investigationPacks: packs.filter(p => p.origin === 'agent-lab').map(p => ({key: p.packSha256, updated: p.updated, imported: p.stats?.imported})), framePacks: packs.filter(p => p.origin === 'runtime-capture').map(p => ({fileCount: p.fileCount, updated: p.updated}))};
}, NINJA);
const catalogPack = page => page.evaluate(async sha => { const c = (await Forge.commands.run('library.catalogs')).result.find(x => x.sha === sha); return c ? {...c, pack: c.packKey ? await Forge.services.ResourceLibrary.getPack(c.packKey) : null} : null; }, NINJA);
const status = page => page.evaluate(sha => Forge.services.LibraryCatalog.recoveryStatus().find(s => s.sha === sha) || null, NINJA);
// Resources › Library, waiting (bounded) for the catalog's Retry; on a timeout, what the view shows instead
async function libraryRetry(page, label) {
  await page.click('#frx-open'); await page.click('#frx-lib');
  try { await page.waitForSelector('#frx-catalog-status [data-action="retry-catalog"]', {timeout: 60000}); }
  catch (_) {
    const view = await page.evaluate(() => { const box = document.getElementById('frx-catalog-status'), b = box?.querySelector('[data-action="retry-catalog"]');
      const vis = el => { if (!el) return null; const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return {display: cs.display, visibility: cs.visibility, w: r.width, h: r.height}; };
      return {explorer: document.getElementById('frx-root')?.className, library: document.getElementById('frx-lib')?.getAttribute('aria-pressed'), status: box ? box.textContent.slice(0, 400) : null, retry: vis(b)}; });
    throw Error(label + ': Resources › Library shows no Retry within 60 s: ' + JSON.stringify({view, ...(await diagnose(page, label)())}).slice(0, 3000));
  }
}
// What a stalled wait reports: every recovery status, the panel's view, the catalog marker and recent toasts.
const diagnose = (page, label) => async () => ({label, ...(await page.evaluate(async sha => {
  const panel = Forge.services.InvestigationPanel.state(), c = (await Forge.commands.run('library.catalogs')).result.find(x => x.sha === sha);
  return {statuses: Forge.services.LibraryCatalog.recoveryStatus(), panel: {connected: panel.connected, error: panel.error, notices: (panel.notices || []).slice(0, 6), jobs: (panel.jobs || []).map(j => ({id: j.id, status: j.status, rom: j.rom?.sha256?.slice(0, 12), imported: j.imported}))},
    catalog: c || null, marker: c?.packKey ? await Forge.services.ResourceLibrary.getPack(c.packKey) : null, puts: window.__qaCatalogPuts || 0, hook: window.__qaHook || null,
    toasts: [...document.querySelectorAll('.toast, #toast, [role=status]')].map(e => e.textContent.trim()).filter(Boolean).slice(-4)};
}, NINJA))});
(async () => {
  if (!NG) throw Error('needs the Ninja Gaiden (US) cartridge');
  if (shots) fs.mkdirSync(shots, {recursive: true});
  await startWorker();
  const P1 = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-catalog-p1-'));
  // ---------------- A: interrupted by killing the browser ----------------
  let s = await open(P1); let shot = shotOf(s.page);
  let midway = null; const reached = new Promise(r => { midway = r; });
  await s.ctx.exposeBinding('__qaMidCatalog', (_, n) => midway(n));
  await s.page.evaluate(HOOK, {k: 200, mode: 'hold'});
  await pair(s.page); await importInvestigated(s.page); await edit(s.page);
  const edited = await serialize(s.page);
  const ngJob = await until(() => jobs().find(j => j.rom.sha256 === NINJA));
  const putsAtHold = await reached; // the job finished, its frames were imported, and registration wrote `putsAtHold` entries
  const atKill = await s.page.evaluate(async sha => ({puts: window.__qaCatalogPuts, investigations: (await Forge.services.FrameEvidence.investigations()).map(p => ({job: p.job?.id, imported: p.stats?.imported})),
    catalog: (await Forge.commands.run('library.catalogs')).result.find(x => x.sha === sha), project: Forge.services.ProjectStore.serialize()}), NINJA);
  await shot('A1_registration_in_progress_before_kill');
  const pids = execSync('pgrep -f -- "--user-data-dir=' + P1 + '" || true').toString().split(/\s+/).filter(Boolean); for (const pid of pids) { try { process.kill(Number(pid), 'SIGKILL'); } catch (_) {} } await sleep(1500);
  report.phases.A = {putsAtHold, framesImported: atKill.investigations, catalogAtKill: atKill.catalog, killedProcesses: pids.length};
  check('A: Forge is killed after the 22 frames were imported and while the recovered catalog was part-way registered (marker "incomplete", attempt 1)',
    atKill.investigations.some(i => i.job === ngJob.id && i.imported === 22) && atKill.catalog?.state === 'incomplete' && putsAtHold >= 200 && atKill.project === edited, report.phases.A);
  // ---------------- B: reopened without the worker ----------------
  await stopWorker();
  s = await open(P1); shot = shotOf(s.page);
  await until(() => status(s.page).then(st => st && st.state === 'needs-source'), 30000);
  const before = await inventory(s.page), markerBefore = await catalogPack(s.page);
  await s.page.click('#frx-open'); await s.page.click('#frx-lib'); await s.page.waitForSelector('#frx-catalog-status');
  await s.page.waitForFunction(() => /recovered catalog is incomplete/.test(document.getElementById('frx-preview')?.textContent || ''), null, {timeout: 20000}).catch(() => {});
  const statusLine = await s.page.$eval('#frx-catalog-status', e => e.textContent), previewB = await s.page.$eval('#frx-preview', e => e.textContent); await shot('B1_reopened_incomplete_catalog_needs_rom'); await s.page.click('#frx-close');
  const noticeB = await until(() => s.page.evaluate(() => Forge.services.InvestigationPanel.state().notices.find(n => /^Recovered catalog of .*: incomplete\./.test(n)) || null), 20000).catch(() => null);
  check('B: the wording matches the state: the frame preview says the recovered catalog is incomplete (not that there is none); with the paired worker unreachable, one notice says Forge finishes it when the worker is reachable or the ROM is opened',
    /recovered catalog is incomplete \(its registration was interrupted/.test(previewB) && !/has no recovered catalog/.test(previewB) && /when the paired worker is reachable again, or when you open its ROM/.test(noticeB || ''),
    {preview: (previewB.match(/[^.]*recovered catalog[^.]*\./) || [null])[0], notice: noticeB});
  check('B: on reopening, Forge detects the incomplete registration, keeps what was recovered (22 frames, part of the catalog) and says it needs the cartridge',
    markerBefore?.state === 'incomplete' && markerBefore.pack?.attempts === 1 && before.frames === 22 && before.catalogEntries > 0 && before.catalogEntries < 590 && /open its ROM/.test(statusLine),
    {before, marker: {state: markerBefore?.state, attempts: markerBefore?.pack?.attempts}, statusLine});
  // restoring the project brings the cartridge back (an investigated project carries it): completion starts on its own
  await s.page.click('#autosaveBanner .ab-restore'); await s.page.waitForFunction(() => Forge.services.ProjectStore.recoveryState().report);
  const restored = await serialize(s.page), restoreReport = await s.page.evaluate(() => Forge.services.ProjectStore.recoveryState().report);
  const done = await until(() => status(s.page).then(st => st && ['complete', 'needs-retry', 'failed'].includes(st.state) ? st : null), 180000);
  await shot('B2_catalog_completed_after_restore');
  const after = await inventory(s.page), markerAfter = await catalogPack(s.page), projectAfterCompletion = await serialize(s.page);
  report.phases.B = {before, after, completion: done, markerAfter: {state: markerAfter?.state, attempts: markerAfter?.pack?.attempts, stats: markerAfter?.pack?.stats}, restoreMessage: restoreReport.text};
  check('B: the registration is completed from the restored project: entries already written are kept (not rewritten), the rest written; attempt 2',
    done.state === 'complete' && done.resumed && done.kept === before.catalogEntries && done.kept + done.written === 590 && markerAfter.pack.attempts === 2 && markerAfter.pack.state === 'complete', report.phases.B.completion);
  // the earlier session ended by a kill: the restore says it cannot confirm the last moments (it never claims more)
  check('B: the developer\'s edits came back with the project and the catalog completion did not change them', restored === edited && projectAfterCompletion === edited && restoreReport.complete !== false, {message: restoreReport.text});
  // ---- validate the recovered resources ----
  const chrCheck = await s.page.evaluate(async sha => {
    const L = Forge.services.ResourceLibrary, list = (await L.list({shelf: sha, kind: 'chr', limit: 100})).items.filter(e => e.origin === 'rom-catalog'), out = [];
    for (const item of list) { const e = await L.entry(item.id), r = await Forge.commands.run('library.read', {id: e.id, as: 'base64'}); out.push({id: e.id, fileOffset: e.record?.fileOffset, length: e.record?.length, data: r.result.base64}); }
    return out; }, NINJA);
  const chrStart = 16 + ROM[4] * 16384, offsets = chrCheck.map(c => c.fileOffset).sort((a, b) => a - b);
  const chrBytesMatch = chrCheck.every(c => Buffer.from(c.data, 'base64').equals(ROM.subarray(c.fileOffset, c.fileOffset + c.length)));
  const frameDigests = await s.page.evaluate(async sha => { const L = Forge.services.ResourceLibrary, list = (await L.list({shelf: sha, kind: 'frame', limit: 100})).items, d = []; for (const i of list) d.push((await L.entry(i.id)).evidence.digests.all); return d.sort(); }, NINJA);
  const jobDigests = jobs().find(j => j.id === ngJob.id).results.map(r => r.digest).sort();
  const verified = await s.page.evaluate(() => Forge.commands.run('library.verify', {}).then(r => r.result));
  report.phases.B.validation = {chrBanks: chrCheck.length, chrOffsetsContiguous: offsets.every((o, i) => o === chrStart + i * 4096), chrBytesMatch, framesMatchJob: JSON.stringify(frameDigests) === JSON.stringify(jobDigests), verify: {entries: verified.entries, problems: verified.problems.slice(0, 5)}};
  check('B: all 590 catalog entries and all 32 CHR banks are present; each CHR bank holds the cartridge\'s bytes at its offset (banks 0-31 contiguous); the 22 frames keep their evidence hashes; no duplicates; the library verifies clean',
    after.catalogEntries === 590 && after.chr === 32 && after.frames === 22 && after.uniqueIds === after.total && after.catalogPacks.length === 1 && chrCheck.length === 32 && report.phases.B.validation.chrOffsetsContiguous && chrBytesMatch &&
    report.phases.B.validation.framesMatchJob && verified.ok, {after, validation: report.phases.B.validation});
  check('B: extraction was not repeated: the frames were imported once (investigation pack unchanged)', JSON.stringify(after.investigationPacks) === JSON.stringify(before.investigationPacks), {before: before.investigationPacks, after: after.investigationPacks});
  // ---- the frame's CHR links, CODE/RE, Scene; a pose in a new project (Metasprites, CHR Sheet) ----
  const frameId = await s.page.evaluate(async sha => (await Forge.services.ResourceLibrary.list({shelf: sha, kind: 'frame', search: 'Stage 1-1', limit: 5})).items[0].id, NINJA);
  await s.page.evaluate(id => Forge.services.ResourceRelationshipPreview.openLibraryEntry(id), frameId);
  await s.page.waitForFunction(() => [...document.querySelectorAll('#frx-preview button')].some(b => /^CHR bank \d+$/.test(b.textContent) && !b.disabled), null, {timeout: 20000}).catch(() => {});
  await s.page.$eval('#frx-preview', el => { const x = [...el.querySelectorAll('.frx-label')].find(l => /Sprites/i.test(l.textContent)); if (x) el.scrollTop = x.offsetTop - el.offsetTop - 30; });
  await shot('B3_frame_chr_links_usable');
  const links = await s.page.evaluate(() => [...document.querySelectorAll('#frx-preview button')].filter(b => /^CHR bank \d+$/.test(b.textContent)).map(b => ({text: b.textContent, disabled: b.disabled})));
  await s.page.waitForFunction(() => { const b = [...document.querySelectorAll('#frx-preview button')].find(x => /^CHR bank \d+$/.test(x.textContent) && !x.disabled); if (b) b.click(); return !!b; }, null, {timeout: 30000});
  await s.page.waitForFunction(() => /Library · chr/.test(document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || ''));
  await shot('B4_chr_bank_entry');
  // the button appears once the entry's provenance is resolved (asynchronously): click it in the same evaluation that finds it
  await s.page.waitForFunction(() => { const b = [...document.querySelectorAll('#frx-preview button')].find(x => x.textContent === 'Inspect in CODE/RE' && !x.disabled); if (b) b.click(); return !!b; }, null, {timeout: 30000});
  await s.page.waitForFunction(() => S.tab === 'disasm' && !!Forge.services.REAnalysisUI.getState().selection); const chrRe = await s.page.evaluate(() => Forge.services.REAnalysisUI.getState().selection);
  await shot('B5_chr_bank_in_code_re');
  const pcRe = await s.page.evaluate(async id => (await Forge.commands.run('library.inspectCode', {id})).result, frameId);
  check('B: after completion the frame\'s CHR links are usable: a link opens its CHR bank entry, whose bytes open in CODE/RE; the frame\'s code location opens in CODE/RE',
    links.length > 0 && links.every(l => !l.disabled) && chrRe.cpuAddress === null && chrRe.fileOffset >= chrStart && pcRe?.opened && Number.isInteger(pcRe.fileOffset), {links: links.length, chrRe, pc: pcRe && {fileOffset: pcRe.fileOffset, cpu: pcRe.cpuAddress}});
  // reuse in another project: a new project, the frame as a Scene, a pose copied in (Metasprites, CHR Sheet)
  await s.page.evaluate(() => Forge.commands.run('project.new'));
  const scenesBefore = await s.page.evaluate(() => S.scenes.length);
  const opened = await s.page.evaluate(async id => (await Forge.commands.run('library.openFrameScene', {id})), frameId);
  await s.page.evaluate(() => switchTab('scene')); await shot('B6_frame_as_scene_in_new_project');
  const poseId = await s.page.evaluate(async sha => { const L = Forge.services.ResourceLibrary, list = (await L.list({shelf: sha, kind: 'pose', limit: 400})).items.filter(e => e.rendition); return list.find(e => /ryu/i.test(e.path))?.id || list[0].id; }, NINJA);
  const used = await s.page.evaluate(async id => { const r = await Forge.commands.run('library.usePose', {id, mode: 'copy'}); return r.ok ? {ok: true, metasprites: S.metasprites.length, last: S.metasprites[S.metasprites.length - 1]} : {ok: false, error: r.error.message}; }, poseId);
  await s.page.click('.tab:text-is("METASPRITES")'); await s.page.evaluate(id => { const f = S.metasprites.find(m => m.id === id); if (f) Forge163.metasprites.select(f.id); }, used.last?.id); await shot('B7_recovered_pose_in_metasprites');
  await s.page.click('.tab:text-is("CHR SHEET")'); await shot('B8_recovered_pose_tiles_in_chr_sheet');
  report.phases.B.reuse = {frameScene: opened.ok ? opened.result.name : opened.error?.message, scenesBefore, scenesAfter: await s.page.evaluate(() => S.scenes.length), pose: poseId, used: used.ok ? {metasprites: used.metasprites, name: used.last?.name, provenance: used.last?.library || used.last?.source || null} : used};
  check('B: recovered resources are reusable in another project: the frame opens as a Scene, a recovered pose copies into it as a Metasprite with its tiles (CHR Sheet)',
    opened.ok && report.phases.B.reuse.scenesAfter === scenesBefore + 1 && used.ok && used.metasprites >= 1, report.phases.B.reuse);
  await s.page.evaluate(() => { switchTab('scene'); }); await committed(s.page);
  await s.page.close({runBeforeUnload: true}); await sleep(800); await s.ctx.close();
  // ---------------- C: later sessions: worker restarted, Forge reopened, same ROM imported again ----------------
  await startWorker();
  s = await open(P1); shot = shotOf(s.page);
  await s.page.evaluate(() => Forge.services.InvestigationPanel.whenReady()); await s.page.waitForFunction(() => Forge.services.InvestigationPanel.state().connected, null, {timeout: 20000});
  const invBefore = await inventory(s.page), jobsBefore = jobs().length, packBefore = (await catalogPack(s.page)).pack;
  await s.page.setInputFiles('#projectGatewayFile', NG);
  // recognized from the library before any investigation is requested
  await s.page.waitForFunction(() => Forge.services.InvestigationPanel.state().notices.some(n => /^Recognized /.test(n)), null, {timeout: 30000}).catch(() => {});
  const recognizedC = await s.page.evaluate(sha => Forge.services.LibraryCatalog.recognize(sha), NINJA);
  const noticeC = await s.page.evaluate(() => Forge.services.InvestigationPanel.state().notices.find(n => /^Recognized /.test(n)) || null);
  await s.page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await s.page.waitForTimeout(1500);
  await s.page.evaluate(() => { const d = document.getElementById('agentLabPanel'); if (!d.open) d.querySelector('summary').click(); d.scrollIntoView({block: 'start'}); }); await shot('C1_same_rom_again_recognized');
  const invAfter = await inventory(s.page), packAfter = (await catalogPack(s.page)).pack;
  const resumeAgain = await s.page.evaluate(() => Forge.services.LibraryCatalog.resumeCatalogs({reason: 'test'}));
  report.phases.C = {jobsBefore, jobsAfter: jobs().length, recognized: {catalog: recognizedC.catalog, frames: recognizedC.frames, recovered: recognizedC.recovered}, notice: noticeC, catalogUpdatedBefore: packBefore.updated, catalogUpdatedAfter: packAfter.updated, inventorySame: JSON.stringify(invBefore) === JSON.stringify(invAfter), resumeAgain: resumeAgain.length};
  check('C: closing Forge, restarting the worker and importing the same ROM again: recognized from the library before any investigation (no job requested), no re-import, the catalog untouched (same record), nothing left to resume',
    report.phases.C.jobsAfter === jobsBefore && !!noticeC && /No new investigation was queued/.test(noticeC) && recognizedC.recovered && recognizedC.catalog.state === 'complete' && recognizedC.frames === 22 &&
    report.phases.C.inventorySame && packAfter.updated === packBefore.updated && packAfter.state === 'complete' && resumeAgain.length === 0, report.phases.C);
  await s.ctx.close();
  // ---------------- D: interrupted by a normal tab close; completed with the worker's cartridge ----------------
  const P2 = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-catalog-p2-'));
  s = await open(P2); shot = shotOf(s.page);
  let midway2 = null; const reached2 = new Promise(r => { midway2 = r; });
  await s.ctx.exposeBinding('__qaMidCatalog', (_, n) => midway2(n));
  await s.page.evaluate(HOOK, {k: 150, mode: 'hold'});
  newPairingCode(); await pair(s.page);
  await s.page.setInputFiles('#projectGatewayFile', NG); // the ROM only; the project stays as it is
  const putsD = await reached2;
  const atClose = await s.page.evaluate(async sha => (await Forge.commands.run('library.catalogs')).result.find(x => x.sha === sha), NINJA);
  await s.page.close({runBeforeUnload: true}); await sleep(1500); await s.ctx.close();
  s = await open(P2); shot = shotOf(s.page);
  const doneD = await until(() => status(s.page).then(st => st && ['complete', 'needs-retry'].includes(st.state) ? st : null), 180000);
  await s.page.evaluate(() => { const d = document.getElementById('agentLabPanel'); if (!d.open) d.querySelector('summary').click(); d.scrollIntoView({block: 'start'}); }); await shot('D1_completed_with_cartridge_from_worker');
  const invD = await inventory(s.page), noticesD = await s.page.evaluate(() => Forge.services.InvestigationPanel.state().notices);
  report.phases.D = {putsAtClose: putsD, catalogAtClose: atClose, completion: doneD, inventory: invD, notices: noticesD.slice(0, 4)};
  check('D: a registration interrupted by a normal tab close (frames imported, project not investigated) is completed when Forge reopens, with the cartridge fetched from the paired worker; nothing duplicated',
    atClose?.state === 'incomplete' && doneD.state === 'complete' && doneD.resumed && doneD.kept > 0 && doneD.kept + doneD.written === 590 && /paired worker/.test(doneD.source || '') && invD.catalogEntries === 590 && invD.chr === 32 && invD.frames === 22 && invD.uniqueIds === invD.total, report.phases.D);
  check('D: one notice for the completion, and no "missing cartridge" notice while the paired worker supplies it',
    noticesD.filter(n => /^Recovered catalog of .*completed after an interrupted registration/.test(n)).length === 1 && !noticesD.some(n => /^Recovered catalog of .*: incomplete\./.test(n)) &&
    !noticesD.some(n => /^Completed the interrupted registration/.test(n)), {notices: noticesD});
  await s.ctx.close();
  // ---------------- E: failing writes: bounded attempts across sessions, visible state, manual Retry ----------------
  const P3 = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-catalog-p3-'));
  // the refusing storage is installed in each of these sessions by the test itself (not switched by stored state)
  const attempts = [], HOOK_E = {k: 60, mode: 'throw'};
  const settled = async (page, label, states = ['failed', 'needs-retry']) => {
    const st = await until(() => status(page).then(x => x && [...states, 'complete'].includes(x.state) ? x : null), 180000, 300, diagnose(page, label));
    if (st.state === 'complete') throw Error(label + ': the catalog completed although every catalog write is refused in this session: ' + JSON.stringify(await diagnose(page, label)()).slice(0, 3000));
    return st; };
  const snapshot = async (page, session) => { const marker = await catalogPack(page); return {session, state: (await status(page))?.state, attempts: marker?.pack?.attempts, lastError: marker?.pack?.lastError,
    puts: await page.evaluate(() => window.__qaCatalogPuts || 0), log: await page.evaluate(() => window.__qaRecovery.filter(x => x.state !== 'waiting'))}; };
  // session 1: the ROM is imported, the frames come from the worker, the first attempt fails
  s = await open(P3, {hook: HOOK_E}); shot = shotOf(s.page);
  newPairingCode(); await pair(s.page); await s.page.setInputFiles('#projectGatewayFile', NG);
  await s.page.evaluate(() => Forge.services.InvestigationPanel.whenReady());
  await settled(s.page, 'E session 1'); await sleep(500); attempts.push(await snapshot(s.page, 1)); await s.ctx.close();
  // session 2: the second attempt runs at startup and fails; the third follows in the same tab after the backoff
  s = await open(P3, {hook: HOOK_E}); shot = shotOf(s.page);
  await settled(s.page, 'E session 2 (startup attempt)'); const second = await snapshot(s.page, 2);
  await settled(s.page, 'E session 2 (attempt after the backoff)', ['needs-retry']); await sleep(500);
  const third = await snapshot(s.page, 2); await sleep(8000);
  const quiet2 = await s.page.evaluate(() => window.__qaCatalogPuts || 0);
  attempts.push(second, {...third, putsEightSecondsLater: quiet2});
  await s.page.evaluate(() => { const d = document.getElementById('agentLabPanel'); if (!d.open) d.querySelector('summary').click(); d.scrollIntoView({block: 'start'}); }); await shot('E0_each_failed_attempt_noticed'); await s.ctx.close();
  // session 3: the limit is remembered: no automatic attempt, nothing written, Retry offered
  s = await open(P3, {hook: HOOK_E}); shot = shotOf(s.page);
  await settled(s.page, 'E session 3', ['needs-retry']); await sleep(8000); attempts.push(await snapshot(s.page, 3));
  const tries = log => log.filter(x => x.state === 'completing').map(x => x.at), fails = log => log.filter(x => x.state === 'failed' || x.state === 'needs-retry');
  // the third attempt starts no earlier than the time the failure announced, which is the 30 s backoff after it
  const backoff = (() => { const c = tries(third.log), f = fails(third.log); return c.length >= 2 && f.length >= 1 && f[0].retryAt ? {announcedMs: f[0].retryAt - f[0].at, startedAfterMs: c[1] - f[0].at, notEarly: c[1] >= f[0].retryAt} : null; })();
  await libraryRetry(s.page, 'E session 3');
  const retryLine = await s.page.$eval('#frx-catalog-status', e => e.textContent); await shot('E1_needs_retry_visible');
  await s.ctx.close();
  // the refusing storage is gone in a fresh session; the developer presses Retry
  s = await open(P3); shot = shotOf(s.page);
  await until(() => status(s.page).then(x => x && x.state === 'needs-retry'), 60000);
  await libraryRetry(s.page, 'E retry session');
  await s.page.click('#frx-catalog-status [data-action="retry-catalog"]');
  const doneE = await until(() => status(s.page).then(x => x && ['complete', 'needs-source'].includes(x.state) ? x : null), 180000);
  let finalE = doneE;
  if (doneE.state === 'needs-source') { // a manual retry in a tab without the cartridge: the panel's worker copy completes it
    await s.page.evaluate(() => Forge.services.InvestigationPanel.refresh()); finalE = await until(() => status(s.page).then(x => x?.state === 'complete' ? x : null), 180000); }
  await shot('E2_manual_retry_completed'); const invE = await inventory(s.page);
  report.phases.E = {attempts, backoffMs: backoff, retryLine, afterRetry: {state: finalE.state, kept: finalE.kept, written: finalE.written}, inventory: {catalog: invE.catalogEntries, chr: invE.chr, frames: invE.frames, unique: invE.uniqueIds === invE.total}};
  check('E: failing writes are retried automatically, a bounded number of times: attempt 1 fails (session 1), attempt 2 at the next startup, attempt 3 in the same tab after a backoff of at least 30 s; each failure is recorded with its error',
    attempts[0].attempts === 1 && attempts[0].state === 'failed' && attempts[1].attempts === 2 && attempts[1].state === 'failed' && attempts[2].attempts === 3 && attempts[2].state === 'needs-retry' && backoff !== null && backoff.notEarly && backoff.announcedMs >= 29000 && backoff.startedAfterMs >= 29000 && attempts.slice(0, 3).every(a => /refused/.test(a.lastError || '')), {attempts, backoff});
  check('E: after the limit nothing retries on its own: no catalog writes in the same tab or in a new session (which shows needs-retry at once), and Retry is offered',
    attempts[2].putsEightSecondsLater === attempts[2].puts && attempts[3].state === 'needs-retry' && attempts[3].attempts === 3 && attempts[3].puts === 0 && tries(attempts[3].log).length === 0 && /Retry/.test(retryLine), {third: attempts[2], fourth: attempts[3], retryLine});
  check('E: the manual Retry completes the catalog, keeping the entries the failed attempts wrote; no duplicates', finalE.state === 'complete' && invE.catalogEntries === 590 && invE.chr === 32 && invE.uniqueIds === invE.total, report.phases.E);
  check('No uncaught page errors (phase E)', s.errors.length === 0, s.errors.slice(0, 3));
  await s.ctx.close();
  // ---------------- F: failures before registration begins: the catalog's first write (its marker) is refused ----------------
  const P4 = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-catalog-p4-')), META = 'catalog-failures:' + NINJA, early = [];
  const snapF = async (page, session) => ({session, state: (await status(page))?.state, catalog: await page.evaluate(sha => Forge.commands.run('library.catalogs').then(r => { const c = r.result.find(x => x.sha === sha); return c && {state: c.state, packKey: c.packKey, attempts: c.attempts}; }), NINJA),
    meta: await page.evaluate(k => Forge.services.ResourceLibrary.getMeta(k), META), refusals: await page.evaluate(() => window.__qaMarkerRefusals || 0)});
  for (let session = 1; session <= 4; session++) {
    s = await open(P4, {refuseMarker: true}); shot = shotOf(s.page);
    if (session === 1) { newPairingCode(); await pair(s.page); await s.page.setInputFiles('#projectGatewayFile', NG); }
    const st = await until(() => status(s.page).then(x => x && ['failed', 'needs-retry', 'complete'].includes(x.state) ? x : null), 180000, 300, diagnose(s.page, 'F session ' + session));
    if (st.state === 'complete') throw Error('F session ' + session + ': the catalog completed although its first write is refused');
    await sleep(session === 4 ? 8000 : 500); early.push(await snapF(s.page, session));
    if (session === 4) { await s.page.evaluate(() => { const d = document.getElementById('agentLabPanel'); if (!d.open) d.querySelector('summary').click(); d.scrollIntoView({block: 'start'}); }); await shot('F1_failures_before_registration_bounded'); }
    await s.ctx.close();
  }
  s = await open(P4); shot = shotOf(s.page);
  await until(() => status(s.page).then(x => x && x.state === 'needs-retry'), 60000, 300, diagnose(s.page, 'F retry session'));
  await libraryRetry(s.page, 'F retry session'); await s.page.click('#frx-catalog-status [data-action="retry-catalog"]');
  const doneF = await until(() => status(s.page).then(x => x && x.state === 'complete' ? x : null), 180000, 300, diagnose(s.page, 'F after Retry'));
  const metaAfter = await s.page.evaluate(k => Forge.services.ResourceLibrary.getMeta(k), META), invF = await inventory(s.page);
  report.phases.F = {sessions: early, afterRetry: {state: doneF.state, written: doneF.written, source: doneF.source}, metaAfter: metaAfter || null, inventory: {catalog: invF.catalogEntries, chr: invF.chrBanks ?? invF.chr, frames: invF.frames}};
  check('F: failures before any registration starts (no catalog record could be written) are still counted across sessions: attempts 1, 2, 3, then no automatic attempt in a 4th session (nothing tried), each with its error',
    early.map(e => e.catalog?.attempts).join() === '1,2,3,3' && early.every(e => e.catalog?.state === 'missing' && e.catalog.packKey === null) && early[0].state === 'failed' && early[1].state === 'failed' &&
    early[2].state === 'needs-retry' && early[3].state === 'needs-retry' && early[3].refusals === 0 && early.slice(0, 3).every(e => e.refusals >= 1 && /refused/.test(e.meta?.lastError || '')), report.phases.F);
  check('F: Retry completes it once the storage accepts the record; the failure count is cleared', doneF.state === 'complete' && !metaAfter && invF.catalogEntries === 590 && invF.chr === 32 && invF.uniqueIds === invF.total, report.phases.F);
  check('No uncaught page errors', s.errors.length === 0, s.errors.slice(0, 3));
  await s.ctx.close();
  await stopWorker();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(report.passed ? 'catalog-recovery: all checks passed' : 'catalog-recovery: FAILED');
  setTimeout(() => { if (report.passed) for (const d of [root, P1, P2, P3, P4]) fs.rmSync(d, {recursive: true, force: true}); process.exit(report.passed ? 0 : 1); }, 500);
})().catch(async e => { console.log('FAILED', e.stack); report.passed = false; report.error = e.message; try { fs.writeFileSync(output, JSON.stringify(report, null, 2)); } catch (_) {} try { worker?.kill('SIGKILL'); } catch (_) {} process.exit(1); });
