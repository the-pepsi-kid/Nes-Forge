#!/usr/bin/env node
// "One ROM, no manual steps after pairing": the developer pairs Forge with the local Agent Lab worker once, turns on
// the two remembered options, imports ROMs and keeps working. Owner-side end to end: needs the Ninja Gaiden (US) and
// Super Mario Bros. 3 (MMC3) cartridges. Every step uses Forge's real UI (clicks, typing, file pickers).
//   node QA/one-rom-loop.cjs <NES_Forge.html> <report.json> <folder with cartridges> [<screenshot folder>]
//  1 pair · 2 options · 3 import Ninja Gaiden (project gateway): queued automatically · 4 edit scene and metasprite
//  while it runs · 5 import SMB3 (emulator Load ROM): queued behind it · 6 kill and restart the worker: the job
//  resumes · 7 close and reopen Forge: edits restored, pairing and options remembered · 8 results registered
//  automatically (frames, Ninja Gaiden's recovered catalog; none for SMB3, said so) · 9 navigate them in Resources ·
//  10 import Ninja Gaiden again: no duplicate job, no duplicate entries · 11 checkpoint reuse with identical evidence
//  hashes · 12 the project equals what the developer made (imports never changed it) · 13 security of the local API.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http'), {spawn} = require('child_process');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
if (!editorArg || !output || !cartDir) { console.error('usage: node QA/one-rom-loop.cjs <NES_Forge.html> <report.json> <cartridges> [<shots>]'); process.exit(2); }
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const repo = path.resolve(__dirname, '..'), WORKER = path.join(repo, 'tools/agent-lab/capture_worker.cjs');
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const carts = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => path.join(cartDir, f));
const NG = carts.find(f => sha(fs.readFileSync(f)) === NINJA), SMB3 = carts.find(f => /^Super Mario Bros 3/i.test(path.basename(f)));
const report = {suite: 'one-rom-loop', editorSha256: sha(fs.readFileSync(editor)), checks: [], measurements: {}, steps: {}};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 700))); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-loop-')), profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-loop-profile-')), PORT = 8796, ADMIN = crypto.randomBytes(16).toString('hex');
let worker = null, pairingCode = null;
function startWorker() {
  return new Promise((resolve, reject) => {
    worker = spawn(process.execPath, [WORKER, 'serve', '--root', root, '--forge', editor, '--port', String(PORT), '--token', ADMIN], {stdio: ['ignore', 'pipe', 'pipe']});
    let ok = false; const t = setTimeout(() => ok || reject(Error('worker did not start')), 15000);
    worker.stdout.on('data', d => { const s = String(d); const m = /pairing code ([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(s); if (m) { pairingCode = m[1]; ok = true; clearTimeout(t); resolve(); } });
    worker.stderr.on('data', d => process.stderr.write('[worker] ' + d));
  });
}
const job = id => JSON.parse(fs.readFileSync(path.join(root, 'jobs', id, 'job.json'), 'utf8'));
const jobs = () => fs.readdirSync(path.join(root, 'jobs')).map(id => job(id));
async function admin(method, p, body) { const r = await fetch('http://127.0.0.1:' + PORT + p, {method, headers: {'content-type': 'application/json', 'x-forge-agent-token': ADMIN}, ...(body ? {body: JSON.stringify(body)} : {})}); const d = await r.json(); if (!r.ok) throw Error(d.error); return d; }
function raw(method, p, headers, body) { return new Promise(resolve => { const req = http.request({host: '127.0.0.1', port: PORT, path: p, method, headers}, res => { let b = ''; res.on('data', c => { b += c; }); res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: b})); }); req.on('error', e => resolve({status: 0, error: e.message})); if (body) req.write(body); req.end(); }); }
async function until(fn, ms = 900000, every = 500) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw Error('timed out'); await sleep(every); } }
(async () => {
  if (!NG || !SMB3) throw Error('needs the Ninja Gaiden (US) and Super Mario Bros 3 cartridges');
  if (shots) fs.mkdirSync(shots, {recursive: true});
  await startWorker();
  let ctx = await chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}});
  let page = ctx.pages()[0] || await ctx.newPage(); page.setDefaultTimeout(900000);
  const errors = []; const hook = p => { p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept()); }; hook(page);
  const shot = async name => { if (!shots) return; await page.waitForTimeout(350); await page.screenshot({path: path.join(shots, name + '.png')}); };
  const panel = async () => { await page.evaluate(() => { const d = document.getElementById('agentLabPanel'); if (!d.open) d.querySelector('summary').click(); }); await page.waitForTimeout(250); await page.evaluate(() => document.getElementById('agentLabPanel').scrollIntoView({block: 'start'})); };
  const ps = () => page.evaluate(() => Forge.services.InvestigationPanel.state());
  const recovery = () => page.evaluate(() => Forge.services.ProjectStore.recoveryState());
  const serialize = () => page.evaluate(() => Forge.services.ProjectStore.serialize());
  try {
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.InvestigationPanel');
    // ---- 1 pair, 2 options ----
    await panel(); await page.fill('#agentLabUrl', 'http://127.0.0.1:' + PORT); await page.fill('#agentLabCode', pairingCode); await shot('01_pairing_code_entered');
    await page.click('#agentLabPair'); await page.waitForFunction(() => Forge.services.InvestigationPanel.state().connected, null, {timeout: 15000});
    await page.check('#agentLabAutoInvestigate'); await page.check('#agentLabAutoImport'); await panel(); await shot('02_paired_options_on');
    const stored = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('forge.agentLab')).map(k => k + '=' + localStorage.getItem(k)));
    check('Forge pairs with the worker through the panel; no token is shown or stored in localStorage; the two options are remembered',
      (await ps()).connected && stored.some(s => s === 'forge.agentLab.autoInvestigate=1') && stored.some(s => s === 'forge.agentLab.autoImport=1') && !stored.some(s => /token|secret/i.test(s)) && !(await page.content()).includes(pairingCode.replace('-', '')),
      {stored});
    // ---- 3 import Ninja Gaiden through the project gateway: queued automatically ----
    const t3 = Date.now();
    await page.setInputFiles('#projectGatewayFile', NG);
    const ngJobId = await until(() => jobs().find(j => j.rom.sha256 === NINJA)?.id, 30000, 100);
    const queuedMs = Date.now() - t3;
    await page.waitForFunction(() => [...document.querySelectorAll('#projectGatewayPanel button')].some(b => /investigated project/i.test(b.textContent)));
    await page.evaluate(() => [...document.querySelectorAll('#projectGatewayPanel button')].find(b => /investigated project/i.test(b.textContent)).click());
    await page.waitForFunction(() => document.getElementById('investigationPrepare') || document.getElementById('investigationImport'));
    await page.evaluate(() => { const p = document.getElementById('investigationPrepare'); if (p && !p.disabled) p.click(); });
    await page.waitForFunction(() => !document.getElementById('investigationImport')?.disabled); await page.click('#investigationImport'); await page.waitForFunction(() => !!S.investigation);
    await page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await panel(); await shot('03_ninja_gaiden_imported_queued_automatically');
    const ngJob0 = job(ngJobId);
    report.measurements.importToQueuedMs = queuedMs;
    check('Importing Ninja Gaiden queues its investigation automatically, for exactly the imported ROM (by SHA-256), with its profile plan', ngJob0.reason === 'import' && ngJob0.rom.sha256 === NINJA && /every area/.test(ngJob0.plan.name) && queuedMs < 10000, {queuedMs, plan: ngJob0.plan.name, reason: ngJob0.reason});
    // ---- 4 keep editing while it runs ----
    await until(() => job(ngJobId).progress.done >= 1);
    await page.evaluate(() => { switchTab('scene'); S.selTile = 7; });
    const box = await page.$eval('#cv', c => { const r = c.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width}; });
    const clicks = [];
    for (let i = 0; i < 8; i++) { const t = Date.now(); await page.mouse.click(box.x + (60 + i * 16) * box.w / 256, box.y + 88 * box.w / 256); clicks.push(Date.now() - t); }
    await page.click('.tab:text-is("METASPRITES")');
    await page.evaluate(() => { const f = S.metasprites[0]; Forge163.metasprites.select(f.id); const i = document.getElementById('msX163'); i.value = String(Number(i.value) + 2); i.dispatchEvent(new Event('change', {bubbles: true})); });
    await shot('04b_metasprite_edited_while_investigating');
    await page.click('.tab:text-is("SCENE")'); await page.waitForFunction(() => { const r = Forge.services.ProjectStore.recoveryState(); return r.committedSeq === r.editSeq && r.committedChangeSeq === r.changeSeq && !r.writing; });
    const statusLine = await page.$eval('#forge15State', e => e.textContent);
    await panel(); await shot('04_scene_edited_while_investigating');
    const workerAtEdit = job(ngJobId);
    check('While the worker investigates, scene and metasprite edits stay responsive and reach the recovery copy',
      Math.max(...clicks) < 2000 && workerAtEdit.state === 'running' && /recovery ✓/.test(statusLine), {maxClickMs: Math.max(...clicks), worker: workerAtEdit.state + ' ' + workerAtEdit.progress.done + '/22', statusLine});
    // ---- 5 import SMB3 through the emulator's Load ROM: queued behind ----
    await page.setInputFiles('#emuRomIn', SMB3);
    const smbJobId = await until(() => jobs().find(j => j.rom.sha256 !== NINJA)?.id, 30000, 100);
    await page.click('.tab:text-is("SCENE")');
    await page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await panel(); await shot('05_smb3_imported_queued_behind');
    check('Importing SMB3 through the emulator queues it behind Ninja Gaiden (one job at a time), for the ROM the emulator loaded', job(smbJobId).reason === 'import' && /SMB|Mario/i.test(job(smbJobId).rom.name) && ['queued', 'running'].includes(job(smbJobId).state) && job(ngJobId).state === 'running',
      {smb3: job(smbJobId).state, ng: job(ngJobId).state});
    // ---- 6 the worker dies mid-job and is restarted: the job resumes ----
    await until(() => job(ngJobId).progress.done >= 5);
    const doneAtKill = job(ngJobId).progress.done; worker.kill('SIGKILL'); await sleep(1200);
    await page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await panel(); await shot('06_worker_killed');
    const unreachable = (await ps()).connected === false;
    const tRestart = Date.now(); await startWorker(); await sleep(1500);
    await page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await until(() => job(ngJobId).state === 'running', 60000);
    await panel(); await shot('07_worker_restarted_job_resumed');
    check('After the worker is killed, the panel says it is unreachable; on restart the same pairing still works and the job resumes where it stopped',
      unreachable && (await ps()).connected && job(ngJobId).interruptions.length === 1 && job(ngJobId).runs.length === 2, {doneAtKill, interruptions: job(ngJobId).interruptions.length});
    // ---- 7 close Forge and reopen it: nothing lost; pairing and options remembered ----
    await page.evaluate(() => { switchTab('scene'); S.selTile = 9; });
    for (let i = 0; i < 4; i++) await page.mouse.click(box.x + (60 + i * 16) * box.w / 256, box.y + 104 * box.w / 256);
    const beforeClose = await serialize();
    // where Ninja Gaiden's results were imported (its notice appears in the tab that imported them)
    const beforeCloseState = await page.evaluate(async () => ({imported: (await Forge.services.FrameEvidence.investigations()).map(p => p.job?.id), catalogs: Object.keys(Forge.services.InvestigationPanel.state().catalogs), notices: Forge.services.InvestigationPanel.state().notices}));
    report.steps.beforeClose = {ngJobState: job(ngJobId).state, ngImportedInEarlierTab: beforeCloseState.imported.includes(ngJobId), catalogsInEarlierTab: beforeCloseState.catalogs};
    await page.close({runBeforeUnload: true}); await sleep(1500);
    page = await ctx.newPage(); hook(page); page.setDefaultTimeout(900000);
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.InvestigationPanel');
    await page.waitForFunction(() => Forge.services.ProjectStore.state.recoveryPhase === 'offered', null, {timeout: 30000});
    await shot('08a_reopened_recovery_offered');
    await page.click('#autosaveBanner .ab-restore'); await page.waitForFunction(() => Forge.services.ProjectStore.recoveryState().report);
    const restoredReport = (await recovery()).report, restored = await serialize();
    await page.evaluate(() => switchTab('scene')); await page.waitForTimeout(300); await shot('08b_restored_every_edit');
    await page.evaluate(() => Forge.services.InvestigationPanel.whenReady()); await page.waitForFunction(() => Forge.services.InvestigationPanel.state().connected, null, {timeout: 15000});
    const afterReopen = await ps();
    check('Closing and reopening Forge loses no edit (the restore says every change was recovered); the pairing and both options are still in place',
      restored === beforeClose && restoredReport.complete === true && afterReopen.paired && afterReopen.settings.autoInvestigate && afterReopen.settings.autoImport, {message: restoredReport.text});
    // ---- 8 results registered automatically ----
    const projectBeforeImports = await serialize();
    await until(() => job(ngJobId).state === 'completed' && job(smbJobId).state === 'completed');
    const tDone = Date.now();
    await page.waitForFunction(() => Forge.services.InvestigationPanel.state().imported.length >= 2, null, {timeout: 120000});
    await page.waitForFunction(() => Object.keys(Forge.services.InvestigationPanel.state().catalogs).length >= 2, null, {timeout: 120000});
    report.measurements.completedToLibraryMs = Date.now() - tDone;
    await panel(); await shot('09_results_registered_automatically');
    const st = await ps(), lib = await page.evaluate(async () => { const L = Forge.services.ResourceLibrary, f = await L.list({kind: 'frame', limit: 500}), c = await L.list({kind: 'chr', limit: 500}); return {frames: f.total, chr: c.total}; });
    const cat = st.catalogs, ngCat = cat[NINJA], smbCat = Object.entries(cat).find(([k]) => k !== NINJA)?.[1];
    check('When each job finishes, its validated frames enter the library without a click; Ninja Gaiden\'s recovered catalog is registered through the existing mechanism; SMB3 is said to have none',
      lib.frames === 25 && lib.chr === 32 && ['registered', 'already'].includes(ngCat?.state) && smbCat?.state === 'none' && st.notices.some(n => /added to the library/.test(n)) && (await serialize()) === projectBeforeImports,
      {lib, ngCatalog: ngCat, smbCatalog: smbCat, notices: st.notices.slice(0, 4), jobFailures: {ng: job(ngJobId).failures, smb3: job(smbJobId).failures, smb3Results: job(smbJobId).results.length}});
    const ngFinal = job(ngJobId);
    check('The finished Ninja Gaiden job reads "completed · recovered after 1 worker restart"; the restart is not listed as a failure; unresolved evidence is listed separately',
      await page.$eval('#agentLabJobs tr[data-job="' + ngJobId + '"] .al-state', e => /completed 22\/22 · recovered after 1 worker restart/.test(e.textContent)) &&
      await page.$eval('#agentLabJobs tr[data-job="' + ngJobId + '"] .al-failure', e => e.textContent === 'none') && await page.$eval('#agentLabJobs tr[data-job="' + ngJobId + '"] .al-unresolved', e => /mid-frame/.test(e.textContent)),
      {failures: ngFinal.failures});
    // ---- 9 navigate the findings in Resources ----
    // Ninja Gaiden's "Open in Library" notice is in the tab that imported its results. If that was this tab, a missing
    // notice is a failure (with the panel's state and DOM recorded); if it was the earlier tab, Resources › Library is used.
    const noticeDiag = await page.evaluate(() => ({stateNotices: Forge.services.InvestigationPanel.state().notices, catalogsHere: Object.keys(Forge.services.InvestigationPanel.state().catalogs),
      dom: [...document.querySelectorAll('#agentLabNotices li')].map(li => ({text: li.textContent.slice(0, 120), openButton: !!li.querySelector('button[data-action="open-library"]')})),
      panelRendered: !!document.getElementById('agentLabJobs')}));
    const ngImportedHere = noticeDiag.catalogsHere.includes(NINJA) && !report.steps.beforeClose.ngImportedInEarlierTab;
    const viaNotice = await page.evaluate(() => { const b = [...document.querySelectorAll('#agentLabNotices button[data-action="open-library"]')].find(x => /Ninja/.test(x.parentElement.textContent)); if (b) b.click(); return !!b; });
    report.steps.ninjaNotice = {...noticeDiag, ngImportedHere, viaNotice};
    if (ngImportedHere) check('The tab that imported Ninja Gaiden\'s results shows its notice with "Open in Library"', viaNotice, report.steps.ninjaNotice);
    if (!viaNotice) { await page.click('#frx-open'); await page.click('#frx-lib'); await page.fill('#frx-search', 'Stage 2-2'); await page.waitForTimeout(500);
      await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent)).click()); }
    report.steps.openedNinjaFrameVia = viaNotice ? 'notice Open in Library' : ngImportedHere ? 'Resources › Library search (notice missing: see the failed check)' : 'Resources › Library search (results were imported in the earlier tab)';
    await page.waitForFunction(() => /Sprites ·/i.test(document.getElementById('frx-preview')?.innerText || ''));
    await shot('10_open_in_library_frame');
    await page.$eval('#frx-preview', el => { const s = [...el.querySelectorAll('.frx-label')].find(x => /Sprites/i.test(x.textContent)); el.scrollTop = s.offsetTop - el.offsetTop - 30; });
    await shot('11_frame_sprites_chr_links');
    const ngText = await page.$eval('#frx-preview', el => el.textContent);
    // the frame's CHR bank links: with Ninja Gaiden's catalog registered they must be enabled; if none is, record why
    const chrLinks = () => page.evaluate(async () => ({selected: Forge.services.ResourceRelationshipPreview.summary().selected, graphNodes: Forge.services.ResourceRelationshipPreview.summary().nodes,
      buttons: [...document.querySelectorAll('#frx-preview button')].filter(b => /^CHR bank \d+$/.test(b.textContent)).map(b => ({text: b.textContent, disabled: b.disabled, title: b.title})),
      chrEntriesInLibrary: (await Forge.services.ResourceLibrary.list({kind: 'chr', limit: 1})).total,
      catalogPack: ((await Forge.commands.run('library.packs')).result || []).filter(p => p.origin === 'rom-catalog').map(p => ({state: p.state, entries: p.stats?.entries}))}));
    // the preview renders asynchronously (it can be re-rendered while the library loads): wait up to 10 s for its links
    await page.waitForFunction(() => [...document.querySelectorAll('#frx-preview button')].some(b => /^CHR bank \d+$/.test(b.textContent) && !b.disabled), null, {timeout: 10000}).catch(() => {});
    let links = await chrLinks();
    report.steps.chrLinksAtFirstRender = links;
    const enabledFirst = links.buttons.some(b => !b.disabled);
    check('A Ninja Gaiden frame opened from its notice links its sprites to enabled CHR bank entries', enabledFirst, links);
    if (!enabledFirst) { await page.click('#frx-refresh'); await page.waitForTimeout(1500); links = await chrLinks(); report.steps.chrLinksAfterRefresh = links; }
    await page.waitForFunction(() => { const b = [...document.querySelectorAll('#frx-preview button')].find(x => /^CHR bank \d+$/.test(x.textContent) && !x.disabled); if (b) b.click(); return !!b; }, null, {timeout: 30000});
    await page.waitForFunction(() => /Library · chr/.test(document.querySelector('#frx-items .frx-item[aria-current="true"]')?.textContent || ''));
    await shot('12_chr_bank_entry');
    // the button appears once the entry's provenance is resolved (asynchronously): click it in the same evaluation that finds it
    await page.waitForFunction(() => { const b = [...document.querySelectorAll('#frx-preview button')].find(x => x.textContent === 'Inspect in CODE/RE' && !x.disabled); if (b) b.click(); return !!b; }, null, {timeout: 30000});
    await page.waitForFunction(() => S.tab === 'disasm' && !!Forge.services.REAnalysisUI.getState().selection);
    const re = await page.evaluate(() => Forge.services.REAnalysisUI.getState().selection);
    await shot('13_chr_bytes_in_code_re');
    await page.click('#frx-open'); await page.click('#frx-lib'); await page.fill('#frx-search', 'holding right'); await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('#frx-items .frx-item')].find(b => /Library · frame/.test(b.textContent)).click());
    await page.waitForFunction(() => /Sprites ·/i.test(document.getElementById('frx-preview').innerText));
    await shot('14_smb3_frame_preview_wording');
    const smbText = await page.$eval('#frx-preview', el => el.textContent);
    await page.$eval('#frx-preview', el => { const s = [...el.querySelectorAll('.frx-label')].find(x => /Sprites/i.test(x.textContent)); el.scrollTop = s.offsetTop - el.offsetTop - 30; });
    await shot('15_smb3_unavailable_links_explained');
    const smbLinks = await page.evaluate(() => [...document.querySelectorAll('#frx-preview button')].filter(b => /^CHR bank \d+$/.test(b.textContent)).map(b => ({disabled: b.disabled, opacity: getComputedStyle(b).opacity, reason: b.nextElementSibling?.className === 'frx-unavailable' ? b.nextElementSibling.textContent : null})));
    const inspector = await page.$eval('#frx-details', e => e.textContent);
    check('Navigation: frame → CHR bank entry → its bytes in CODE/RE for Ninja Gaiden; the preview is labelled rendered pixels and points to the cartridge data that is (or is not) linked',
      /CHR file 0x/.test(ngText) && /original cartridge tile data is in this ROM's CHR library entries/.test(ngText) && re.fileOffset >= 16 + 8 * 16384 && re.cpuAddress === null &&
      /rendered framebuffer: pixels, not CHR data/.test(smbText) && /has no recovered catalog in the library/.test(smbText) && /Observed at runtime/.test(inspector), {re});
    check('Unavailable CHR links are visibly disabled (dimmed, dashed) with the reason next to each', smbLinks.length > 0 && smbLinks.every(l => l.disabled && Number(l.opacity) < 0.6 && /unavailable: this ROM has no recovered catalog in the library/.test(l.reason || '')), {sample: smbLinks.slice(0, 2), count: smbLinks.length});
    await page.evaluate(() => { document.getElementById('frx-close')?.click(); switchTab('scene'); });
    // ---- 10 the same ROM imported again ----
    const jobsBefore = jobs().length;
    await page.setInputFiles('#projectGatewayFile', NG); await page.waitForFunction(() => Forge.services.InvestigationPanel.state().notices.some(n => /^Recognized Ninja Gaiden/.test(n)), null, {timeout: 30000}).catch(() => {});
    await page.evaluate(() => Forge.services.InvestigationPanel.refresh()); await panel(); await shot('16_same_rom_imported_again_no_duplicate');
    const dupNotice = (await ps()).notices.find(n => /^Recognized Ninja Gaiden.*No new investigation was queued/.test(n));
    const again = await page.evaluate(id => Forge.services.InvestigationPanel.importJob(id), ngJobId);
    check('Importing Ninja Gaiden again is recognized from the library (no new job requested) and importing its results again adds no entry',
      jobs().length === jobsBefore && !!dupNotice && again.imported === 0 && again.already === 22 && again.rejected.length === 0, {dupNotice, again: {imported: again.imported, already: again.already}});
    // ---- 11 checkpoint reuse and unchanged evidence hashes ----
    const t11 = Date.now(), rerun = await admin('POST', '/jobs', {rom: fs.readFileSync(NG).toString('base64'), name: 'Ninja Gaiden (U).nes', plan: 'profile', rerun: true});
    const second = await until(() => { const j = job(rerun.id); return j.state === 'completed' ? j : null; });
    const libraryDigests = await page.evaluate(async () => { const L = Forge.services.ResourceLibrary, f = await L.list({kind: 'frame', limit: 500}), out = []; for (const e of f.items) { const x = await L.entry(e.id); if (x.sourceSha256 === '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e') out.push(x.evidence.digests.all); } return out.sort(); });
    report.measurements.checkpointRerun = {ms: Date.now() - t11, run: second.runs[0]};
    check('Investigating again restores the verified disk checkpoints (no boot, no restart sequences) and reproduces every evidence hash already in the library',
      second.runs[0].boots === 0 && second.runs[0].restoredFromDisk && second.runs[0].targetsFromCheckpoint === 22 && JSON.stringify(second.results.map(r => r.digest).sort()) === JSON.stringify(libraryDigests) &&
      JSON.stringify(second.results.map(r => r.digest)) === JSON.stringify(job(ngJobId).results.map(r => r.digest)), report.measurements.checkpointRerun);
    // ---- 12 the project is what the developer made ----
    const finalProject = await serialize();
    check('The project equals the developer\'s own work: imports, catalog registration and investigations never changed it', finalProject === projectBeforeImports, {});
    // ---- 13 the local API refuses what it should ----
    const sec = {
      foreignOrigin: (await raw('GET', '/status', {origin: 'https://evil.example'})).status,
      nullOriginUnsigned: (await raw('GET', '/status', {origin: 'null'})).status,
      foreignHost: (await raw('GET', '/status', {host: 'evil.example:' + PORT})).status,
      adminTokenFromBrowserOrigin: (await raw('GET', '/status', {origin: 'null', 'x-forge-agent-token': ADMIN})).status,
      corsForForeignOrigin: (await raw('OPTIONS', '/status', {origin: 'https://evil.example', 'access-control-request-method': 'GET'})).headers?.['access-control-allow-origin'] || null,
      bundleUnsigned: (await raw('GET', '/jobs/' + ngJobId + '/bundle', {origin: 'null'})).status,
      romUnsigned: (await raw('GET', '/jobs/' + ngJobId + '/rom', {})).status,
      fileModes: Object.fromEntries(['token', 'clients.json', 'worker-id'].map(f => [f, (fs.statSync(path.join(root, f)).mode & 0o777).toString(8)])),
      dirModes: Object.fromEntries(['jobs', 'roms', 'checkpoints'].map(f => [f, (fs.statSync(path.join(root, f)).mode & 0o777).toString(8)])),
    };
    report.steps.security = sec;
    check('The local API refuses foreign origins, foreign Host names, unsigned requests and the admin token from a browser; ROMs and results need a paired signature; secrets and data are user-only',
      sec.foreignOrigin === 403 && sec.nullOriginUnsigned === 401 && sec.foreignHost === 421 && sec.adminTokenFromBrowserOrigin === 401 && sec.corsForForeignOrigin === null && sec.bundleUnsigned === 401 && sec.romUnsigned === 401 &&
      Object.values(sec.fileModes).every(m => m === '600') && Object.values(sec.dirModes).every(m => m === '700'), sec);
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 900)); try { await shot('error'); } catch (_) {} }
  try { worker?.kill('SIGTERM'); } catch (_) {}
  await ctx.close().catch(() => {});
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log('measurements ' + JSON.stringify(report.measurements));
  console.log(report.passed ? 'one-rom-loop: all checks passed' : 'one-rom-loop: FAILED');
  setTimeout(() => { fs.rmSync(root, {recursive: true, force: true}); process.exit(report.passed ? 0 : 1); }, 1500);
})();
