'use strict';
// Owner-side acceptance (needs original cartridges): Agent Lab investigates ROMs in the background while Forge is used.
//   1. the worker runs as its own process (isolated headless Chromium); Forge connects to it from its panel
//   2. Ninja Gaiden (profile plan, 22 areas) is investigated while the developer keeps editing a different project in
//      Forge (paints tiles, builds, runs Forge's own emulator); Forge stays responsive and the project only changes by
//      the developer's own edits
//   3. the worker is killed mid-job and restarted: the job resumes at its first unfinished target, finished targets
//      are not redone, the boot comes from the disk checkpoint
//   4. a second mapper family (Super Mario Bros 3, MMC3, generic plan) is investigated through the local API; a third
//      job is paused, resumed, and a fourth cancelled
//   5. results are imported into the library: every record validated, provenance kept, re-import adds nothing, the
//      project is unchanged by importing
//   6. a captured Ninja Gaiden frame is opened as a Scene and navigated: sprite -> CHR bank entry -> ROM location ->
//      CODE/RE; the frame's PC -> CODE/RE
//   7. the same plan again reuses the verified disk checkpoints (no boot, no restart sequences) with identical digests
//   node QA/agent-lab-background.cjs <NES_Forge.html> <report.json> <folder with cartridges> [<screenshot folder>]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto'), {spawn} = require('node:child_process');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const repo = path.resolve(__dirname, '..'), WORKER = path.join(repo, 'tools/agent-lab/capture_worker.cjs');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: [], measurements: {}, jobs: {}};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})}); process.stderr.write((passed ? 'ok ' : 'not ok ') + name + '\n'); };
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const carts = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => ({file: path.join(cartDir, f), name: f, sha: sha(fs.readFileSync(path.join(cartDir, f)))}));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-agentlab-')), PORT = 8791, TOKEN = crypto.randomBytes(12).toString('hex');
let worker = null, pairingCode = null;
// the admin token is for this script (no Origin header); Forge pairs with the single-use code the worker prints
function startWorker() {
  worker = spawn(process.execPath, [WORKER, 'serve', '--root', root, '--forge', editor, '--port', String(PORT), '--token', TOKEN], {env: process.env, stdio: ['ignore', 'pipe', 'pipe']});
  worker.stdout.on('data', d => { const m = /pairing code ([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(String(d)); if (m) pairingCode = m[1]; process.stderr.write('[worker] ' + d); }); worker.stderr.on('data', d => process.stderr.write('[worker] ' + d));
  return new Promise(r => setTimeout(r, 1500));
}
const job = id => JSON.parse(fs.readFileSync(path.join(root, 'jobs', id, 'job.json'), 'utf8'));
async function api(method, p, body) { const r = await fetch('http://127.0.0.1:' + PORT + p, {method, headers: {'content-type': 'application/json', 'x-forge-agent-token': TOKEN}, ...(body ? {body: JSON.stringify(body)} : {})}); const d = await r.json(); if (!r.ok) throw Error(d.error); return d; }
async function until(fn, ms = 1800000, every = 500) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw Error('timed out'); await new Promise(r => setTimeout(r, every)); } }
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}}); page.setDefaultTimeout(1800000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  const shot = async name => { if (shots) { await page.waitForTimeout(300); await page.screenshot({path: path.join(shots, name + '.png')}); } };
  const run = (name, args) => page.evaluate(async ([name, args]) => { if (args?.__b64) { args = {...args, bytes: Uint8Array.from(atob(args.__b64), c => c.charCodeAt(0))}; delete args.__b64; }
    const r = await Forge.commands.run(name, args); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; }, [name, args]);
  try {
    if (shots) fs.mkdirSync(shots, {recursive: true});
    const ng = carts.find(c => c.sha === NINJA), smb3 = carts.find(c => /^Super Mario Bros 3/i.test(c.name)), contra = carts.find(c => /^Contra/i.test(c.name));
    if (!ng || !smb3 || !contra) throw Error('needs Ninja Gaiden (US), Super Mario Bros 3 and Contra cartridges');
    await startWorker();
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.InvestigationPanel');
    // the ROM open in Forge, its recovered catalog in the library (for CHR links), and the panel connected
    await run('rom.import', {__b64: fs.readFileSync(ng.file).toString('base64'), name: 'Ninja Gaiden (U).nes'}); await run('library.registerCatalog');
    await page.evaluate(() => { document.getElementById('agentLabPanel').open = true; });
    const connected = await page.evaluate(([u, c]) => Forge.services.InvestigationPanel.pair(u, c), ['http://127.0.0.1:' + PORT, pairingCode]);
    const tStart = Date.now(), ngJob = await page.evaluate(() => Forge.services.InvestigationPanel.investigate());
    check('Forge connects to the local worker and starts a background investigation of the open ROM (its profile plan)', connected && ngJob.state === 'queued' && /every area/.test(ngJob.plan.name), {plan: ngJob.plan.name});
    // ---- the developer keeps working while the worker runs ----
    await until(() => job(ngJob.id).progress.done >= 1); // the worker is capturing targets while the developer works
    await run('project.load', {json: fs.readFileSync(path.join(repo, 'Examples/TwoStages.nesforge.json'), 'utf8')});
    await page.evaluate(() => { switchTab('scene'); S.selTile = 3; }); // the developer picks a tile to paint with
    const before = await page.evaluate(() => ({undo: undoStack.length, nt: S.nt.slice(), scenes: S.scenes.length, metasprites: S.metasprites.length}));
    const box = await page.$eval('#cv', c => { const r = c.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width}; });
    const clicks = [];
    for (let i = 0; i < 6; i++) { const t = Date.now(); await page.mouse.click(box.x + (40 + i * 24) * box.w / 256, box.y + 150 * box.w / 256); clicks.push(Date.now() - t); }
    const tb = Date.now(); const built = await run('build.rom'); const buildMs = Date.now() - tb;
    const te = Date.now(); await run('emulator.loadBuilt'); await run('emulator.frames', {count: 300}); const emuMs = Date.now() - te;
    const after = await page.evaluate(() => ({undo: undoStack.length, nt: S.nt.slice(), scenes: S.scenes.length, metasprites: S.metasprites.length}));
    const changedCells = before.nt.filter((v, i) => v !== after.nt[i]).length;
    const midJob = await api('GET', '/status').then(s => s.jobs.find(j => j.id === ngJob.id));
    report.measurements.workingWhileInvestigating = {clickMs: clicks, buildMs, forgeEmulator300FramesMs: emuMs, workerProgressDuringEdits: midJob.progress};
    await page.evaluate(() => document.getElementById('agentLabPanel').scrollIntoView({block: 'nearest'})); await shot('bg_1_editing_while_investigating');
    check('While the worker investigates, the developer edits, builds and runs Forge\'s own emulator; the project changes only by those edits',
      changedCells > 0 && after.undo > before.undo && after.scenes === before.scenes && after.metasprites === before.metasprites && built && Math.max(...clicks) < 2000 && midJob.state === 'running' && midJob.progress.done >= 1,
      {changedCells, undoAdded: after.undo - before.undo, maxClickMs: Math.max(...clicks), buildMs, emuMs, worker: midJob.state + ' ' + midJob.progress.done + '/' + midJob.progress.targets});
    // ---- kill the worker mid-job, restart, resume ----
    const killAt = Math.max(4, midJob.progress.done + 2); await until(() => job(ngJob.id).progress.done >= killAt);
    const doneBeforeKill = job(ngJob.id).progress.done; worker.kill('SIGKILL'); await new Promise(r => setTimeout(r, 800));
    const stale = job(ngJob.id).state;
    const tRestart = Date.now(); await startWorker();
    const resumed = await until(() => { const j = job(ngJob.id); return j.state === 'completed' || j.state === 'failed' ? j : null; });
    report.measurements.ninjaGaidenFirstJob = {ms: Date.now() - tStart, afterRestartMs: Date.now() - tRestart, runs: resumed.runs.map(r => ({boots: r.boots, restoredFromDisk: r.restoredFromDisk, computed: r.targetsComputed, fromCheckpoint: r.targetsFromCheckpoint, ms: r.ms || null}))};
    const run2 = resumed.runs[1];
    check('After the worker is killed mid-job and restarted, the job resumes at its first unfinished target from the disk boot checkpoint, without redoing finished targets',
      stale === 'running' && resumed.state === 'completed' && resumed.results.length === 22 && resumed.runs.length === 2 && run2.boots === 0 && run2.restoredFromDisk && run2.targetsComputed + run2.targetsFromCheckpoint === 22 - doneBeforeKill &&
      (resumed.interruptions || []).some(i => /stopped while this job was running/.test(i.detail)) && !resumed.failures.some(f => /stopped while this job was running/.test(f.error)), {doneBeforeKill, stale, runs: report.measurements.ninjaGaidenFirstJob.runs});
    // ---- a second mapper family through the API; pause/resume; cancel ----
    const smbJob = await api('POST', '/jobs', {rom: fs.readFileSync(smb3.file).toString('base64'), name: smb3.name, plan: 'generic'});
    const contraJob = await api('POST', '/jobs', {rom: fs.readFileSync(contra.file).toString('base64'), name: contra.name, plan: 'generic'});
    const paused = await page.evaluate(id => Forge.services.InvestigationPanel.control(id, 'pause'), contraJob.id);
    // the same ROM and plan again is not a new job: the worker returns the paused one; a deliberate rerun is a separate job
    const same = await api('POST', '/jobs', {rom: fs.readFileSync(contra.file).toString('base64'), name: contra.name, plan: 'generic'});
    const extra = await api('POST', '/jobs', {rom: fs.readFileSync(contra.file).toString('base64'), name: contra.name, plan: 'generic', rerun: true}); const cancelled = await api('POST', '/jobs/' + extra.id + '/cancel');
    await until(() => job(smbJob.id).state === 'completed');
    const stillPaused = job(contraJob.id).state;
    await page.evaluate(id => Forge.services.InvestigationPanel.control(id, 'resume'), contraJob.id);
    await until(() => job(contraJob.id).state === 'completed');
    check('A second mapper family (MMC3) is investigated; a job paused before it ran stays paused until resumed, then completes; the same ROM and plan again returns that job; a cancelled rerun never runs',
      job(smbJob.id).results.length === 3 && stillPaused === 'paused' && paused.state === 'paused' && job(contraJob.id).results.length === 3 && cancelled.state === 'cancelled' && job(extra.id).results.length === 0 &&
      same.duplicate === true && same.id === contraJob.id && extra.id !== contraJob.id,
      {smb3: job(smbJob.id).results.map(r => r.synchronization), contra: job(contraJob.id).results.map(r => r.synchronization)});
    await page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await page.evaluate(() => document.getElementById('agentLabPanel').scrollIntoView({block: 'nearest'})); await shot('bg_2_panel_finished');
    // ---- import into the library ----
    const projectBefore = await page.evaluate(() => Forge.services.ProjectStore.serialize());
    const imports = {};
    for (const j of [ngJob, smbJob, contraJob]) imports[j.id] = await page.evaluate(id => Forge.services.InvestigationPanel.importJob(id), j.id);
    const reimport = await page.evaluate(id => Forge.services.InvestigationPanel.importJob(id), ngJob.id);
    const projectAfter = await page.evaluate(() => Forge.services.ProjectStore.serialize());
    const sample = await page.evaluate(async id => { const e = await Forge.services.ResourceLibrary.entry(id); return {kind: e.kind, origin: e.origin, sourceSha256: e.sourceSha256, provenance: e.provenance, digests: e.evidence.digests, frame: e.evidence.frame, preview: e.preview, artifacts: e.artifacts, links: e.links.length}; }, imports[ngJob.id].entries[3]);
    report.jobs = Object.fromEntries(Object.entries(imports).map(([k, v]) => [k, {imported: v.imported, already: v.already, rejected: v.rejected.length}]));
    check('Import validates and adds every record (digests recomputed, screenshot pixels and scene re-render checked); re-import adds nothing; the project is unchanged by importing',
      Object.values(imports).every(r => r.rejected.length === 0) && imports[ngJob.id].imported === 22 && imports[smbJob.id].imported === 3 && imports[contraJob.id].imported === 3 && reimport.imported === 0 && reimport.already === 22 && projectBefore === projectAfter, report.jobs);
    check('Each imported observation keeps ROM SHA-256, emulator build, capture plan, frame identity, execution provenance and evidence hashes; the screenshot stays a rendered preview',
      sample.kind === 'frame' && sample.sourceSha256 === NINJA && sample.provenance.emulatorBuild === report.editorSha256 && /^[0-9a-f]{64}$/.test(sample.provenance.plan.sha256) && Number.isInteger(sample.frame) &&
      sample.provenance.execution?.source && sample.provenance.job === ngJob.id && /^[0-9a-f]{64}$/.test(sample.digests.all) && /rendered framebuffer/.test(sample.preview.derivation) && sample.artifacts.scene && sample.links > 0,
      {provenance: sample.provenance, links: sample.links});
    // ---- navigate: frame -> Scene; sprite -> CHR bank -> ROM location -> CODE/RE; PC -> CODE/RE ----
    await page.click('#frx-open'); await page.click('#frx-lib'); await page.fill('#frx-search', 'Stage 2-2'); await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent)).click());
    await page.waitForFunction(() => /Sprites ·/i.test(document.getElementById('frx-preview').innerText));
    await page.$eval('#frx-preview', el => { const s = [...el.querySelectorAll('.frx-label')].find(x => /Sprites/i.test(x.textContent)); el.scrollTop = s.offsetTop - el.offsetTop - 40; });
    await shot('bg_3_frame_in_library');
    const frameText = await page.$eval('#frx-preview', el => el.textContent);
    await page.evaluate(() => [...document.querySelectorAll('#frx-preview button')].find(b => /^CHR bank \d+$/.test(b.textContent) && !b.disabled).click());
    await page.waitForFunction(() => /Library · chr/.test(document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || ''));
    await page.waitForFunction(() => /Mapper/i.test(document.getElementById('frx-preview').innerText));
    const chrText = await page.$eval('#frx-preview', el => el.textContent);
    await shot('bg_4_sprite_chr_bank_location');
    await page.evaluate(() => [...document.querySelectorAll('#frx-preview button')].find(b => b.textContent === 'Inspect in CODE/RE').click());
    await page.waitForFunction(() => S.tab === 'disasm' && !!Forge.services.REAnalysisUI.getState().selection);
    const chrRe = await page.evaluate(() => Forge.services.REAnalysisUI.getState().selection);
    await shot('bg_5_chr_bank_in_re');
    check('Navigation: a captured frame lists its sprites with CHR file offsets; a sprite leads to its CHR bank entry, whose typed ROM location opens in CODE/RE',
      /CHR file 0x/.test(frameText) && /Sprite → pose or actor: not established/.test(frameText) && /CHR ROM/.test(chrText) && /physical bank \d+ of 4 KiB/.test(chrText) && chrRe.cpuAddress === null && chrRe.fileOffset >= 16 + 8 * 16384,
      {re: chrRe});
    await page.click('#frx-open'); await page.click('#frx-lib'); await page.fill('#frx-search', 'Stage 2-2'); await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent)).click());
    await page.waitForSelector('[data-frame="open-scene"]');
    const scenesBefore = await page.evaluate(() => S.scenes.length);
    await page.click('[data-frame="open-scene"]'); await page.waitForTimeout(600);
    const opened = await page.evaluate(() => ({scenes: S.scenes.length, name: S.scenes[S.activeScene].name, tab: S.tab, raster: !!S.scenes[S.activeScene].raster, entry: S.scenes[S.activeScene].captureMeta?.libraryEntry || null}));
    await shot('bg_6_frame_opened_as_scene');
    const undone = await page.evaluate(() => { undo(); return S.scenes.length; });
    check('A captured frame opens as a new, editable Scene (verified runtime capture) by explicit action, and Undo removes it',
      opened.scenes === scenesBefore + 1 && opened.raster && opened.tab === 'scene' && /Stage 2-2/.test(opened.name) && opened.entry && undone === scenesBefore, opened);
    const pcInspect = await page.evaluate(async id => (await Forge.commands.run('library.inspectCode', {id})).result, imports[ngJob.id].entries[3]);
    check('The frame\'s PC opens in CODE/RE at its cartridge file offset', pcInspect.opened && pcInspect.code && Number.isInteger(pcInspect.fileOffset), {fileOffset: pcInspect.fileOffset, cpu: pcInspect.cpuAddress});
    // ---- the same plan again: verified disk checkpoints, no boot, no restart sequences ----
    const dup = await api('POST', '/jobs', {rom: fs.readFileSync(ng.file).toString('base64'), name: 'renamed copy.nes', plan: 'profile'});
    check('The same ROM with the same plan and emulator build is not queued twice: the existing job is returned', dup.duplicate === true && dup.id === ngJob.id, {id: dup.id});
    const t2 = Date.now(), again = await api('POST', '/jobs', {rom: fs.readFileSync(ng.file).toString('base64'), name: ng.name, plan: 'profile', rerun: true});
    const second = await until(() => { const j = job(again.id); return j.state === 'completed' ? j : null; });
    const firstDigests = resumed.results.map(r => r.digest), secondDigests = second.results.map(r => r.digest);
    report.measurements.ninjaGaidenSecondJob = {ms: Date.now() - t2, run: second.runs[0]};
    check('The same plan again restores verified disk checkpoints (no boot, no restart sequences) and reproduces identical evidence digests',
      second.runs[0].boots === 0 && second.runs[0].restoredFromDisk && second.runs[0].targetsFromCheckpoint === 22 && JSON.stringify(firstDigests) === JSON.stringify(secondDigests),
      {firstJobMs: report.measurements.ninjaGaidenFirstJob.ms, secondJobMs: report.measurements.ninjaGaidenSecondJob.ms});
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 900)); await shot('bg_error').catch(() => {}); }
  try { worker?.kill('SIGTERM'); } catch (_) {}
  await browser.close();
  report.root = path.basename(root);
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 700)));
  console.log('measurements ' + JSON.stringify(report.measurements));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  setTimeout(() => { fs.rmSync(root, {recursive: true, force: true}); process.exit(report.passed ? 0 : 1); }, 1500);
})();
