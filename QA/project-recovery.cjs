#!/usr/bin/env node
// Crash recovery of a large project, through the real browser lifecycle (owner-side: needs the Ninja Gaiden cartridge).
//   node QA/project-recovery.cjs <NES_Forge.html> <report.json> <folder with cartridges> [<screenshot folder>]
// Every scenario imports the investigated Ninja Gaiden project (about 5.7 MB serialized), edits a scene and a
// metasprite through the UI, ends the tab or the browser in a different way, reopens Forge on the same profile and
// restores. The restored project must equal the project as it was when the tab ended, or the restore must say
// exactly that (and how many) later changes were lost. No scenario may produce a mixed or damaged project.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), {execSync} = require('child_process');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
if (!editorArg || !output || !cartDir) { console.error('usage: node QA/project-recovery.cjs <NES_Forge.html> <report.json> <cartridges> [<shots>]'); process.exit(2); }
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const cart = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => path.join(cartDir, f)).find(f => sha(fs.readFileSync(f)) === NINJA);
const report = {suite: 'project-recovery', editorSha256: sha(fs.readFileSync(editor)), checks: [], measurements: {}, scenarios: {}};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, detail}); console.log((passed ? 'PASS ' : 'FAIL ') + name + (passed ? '' : ' ' + JSON.stringify(detail).slice(0, 600))); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const launch = profile => chromium.launchPersistentContext(profile, {headless: true, viewport: {width: 1440, height: 900}});
async function open(profile) {
  const ctx = await launch(profile), page = ctx.pages()[0] || await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.ProjectStore?.recoveryState');
  await page.waitForFunction(() => !['checking'].includes(Forge.services.ProjectStore.state.recoveryPhase), null, {timeout: 30000});
  return {ctx, page, errors};
}
const rs = page => page.evaluate(() => Forge.services.ProjectStore.recoveryState());
const content = page => page.evaluate(() => Forge.services.ProjectStore.serialize());
const digest = text => sha(Buffer.from(text));
async function importNinja(page) {
  await page.setInputFiles('#projectGatewayFile', cart);
  await page.waitForFunction(() => [...document.querySelectorAll('#projectGatewayPanel button')].some(b => /investigated project/i.test(b.textContent)));
  await page.evaluate(() => [...document.querySelectorAll('#projectGatewayPanel button')].find(b => /investigated project/i.test(b.textContent)).click());
  await page.waitForFunction(() => document.getElementById('investigationPrepare') || document.getElementById('investigationImport'));
  await page.evaluate(() => { const p = document.getElementById('investigationPrepare'); if (p && !p.disabled) p.click(); });
  await page.waitForFunction(() => !document.getElementById('investigationImport')?.disabled);
  await page.click('#investigationImport'); await page.waitForFunction(() => !!S.investigation);
}
const committed = page => page.waitForFunction(() => { const r = Forge.services.ProjectStore.recoveryState(); return r.baseline && !r.writing && r.committedSeq === r.editSeq && r.committedChangeSeq === r.changeSeq; }, null, {timeout: 60000});
// A scene edit through the canvas and a metasprite edit through its inspector, as a user makes them.
async function editScene(page, tile, row) {
  await page.evaluate(() => { if (S.tab !== 'scene') switchTab('scene'); });
  await page.evaluate(t => { S.selTile = t; }, tile);
  const box = await page.$eval('#cv', c => { c.scrollIntoView({block: 'nearest'}); const r = c.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width}; });
  for (let i = 0; i < 4; i++) await page.mouse.click(box.x + (64 + i * 16) * box.w / 256, box.y + row * box.w / 256);
}
async function editMetasprite(page, dx) {
  await page.click('.tab:text-is("METASPRITES")');
  await page.evaluate(d => { const f = S.metasprites[0]; Forge163.metasprites.select(f.id); const i = document.getElementById('msX163'); i.value = String(Number(i.value) + d); i.dispatchEvent(new Event('change', {bubbles: true})); }, dx);
  await page.click('.tab:text-is("SCENE")');
}
async function killBrowser(profile) {
  const pids = execSync('pgrep -f -- "--user-data-dir=' + profile + '" || true').toString().split(/\s+/).filter(Boolean);
  for (const pid of pids) { try { process.kill(Number(pid), 'SIGKILL'); } catch (_) { /* already gone */ } }
  await sleep(1500); return pids.length;
}
// While the recovery banner is shown it must not hide the Studio bar: every visible control and the state chip
// stay uncovered (the topmost element at their centre is the control itself), below the banner.
const bannerSamples = [];
async function bannerLayout(page, scenario, when) {
  const r = await page.evaluate(() => {
    const bn = document.getElementById('autosaveBanner'), bar = document.getElementById('studioBar'), shown = !!bn && getComputedStyle(bn).display !== 'none';
    if (!shown || !bar) return {shown, bar: !!bar};
    const controls = [...bar.querySelectorAll('button,#studioState')].filter(e => e.offsetParent);
    const covered = controls.filter(e => { const q = e.getBoundingClientRect(), top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !top || !e.contains(top); }).map(e => e.id || e.textContent.trim().slice(0, 16));
    const b = bn.getBoundingClientRect(), chip = document.getElementById('studioState').getBoundingClientRect();
    return {shown, mode: bn.dataset.mode, bannerBottom: Math.round(b.bottom), barTop: Math.round(bar.getBoundingClientRect().top), chipTop: Math.round(chip.top), controls: controls.length, covered};
  });
  if (r.shown) bannerSamples.push({scenario, when, ...r});
  return r;
}
async function reopenAndRestore(profile, name) {
  const s = await open(profile);
  const offered = await s.page.evaluate(() => Forge.services.ProjectStore.state.recoveryPhase === 'offered');
  const bannerOffer = await s.page.$eval('#autosaveText', e => e.textContent);
  await bannerLayout(s.page, name, 'offered');
  if (shots) await s.page.screenshot({path: path.join(shots, 'recovery_' + name + '_offered.png')});
  await recordToasts(s.page);
  const restored = offered ? await s.page.evaluate(() => Forge.services.ProjectStore.restoreRecovery()) : false;
  await sleep(300);
  const state = await rs(s.page), text = restored ? await content(s.page) : null, banner = await s.page.$eval('#autosaveText', e => e.textContent);
  const statusLine = await s.page.$eval('#forge15State', e => e.textContent), toast = await lastRecoveryToast(s.page);
  await bannerLayout(s.page, name, 'after restore');
  if (shots) { await s.page.evaluate(() => switchTab('scene')); await sleep(300); await s.page.screenshot({path: path.join(shots, 'recovery_' + name + '_restored.png')}); }
  return {...s, offered, bannerOffer, restored, state, text, banner, statusLine, toast};
}
// the toasts the editor shows (its global showToast, wrapped in the page)
const recordToasts = page => page.evaluate(() => { if (window.__toasts) return; window.__toasts = []; const real = window.showToast; window.showToast = (...a) => { window.__toasts.push(String(a[0])); return real.apply(window, a); }; });
const lastRecoveryToast = page => page.evaluate(() => (window.__toasts || []).filter(t => /^Recovery /.test(t)).pop() || null);
// Prepare a profile with the large project, its recovery baseline committed, and one committed edit.
async function prepared(name) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-recovery-' + name + '-'));
  const s = await open(profile);
  const t0 = Date.now(); await importNinja(s.page); await committed(s.page);
  const baseline = (await rs(s.page)).metrics;
  await editScene(s.page, 7, 88); await committed(s.page);
  return {profile, ...s, baselineWallMs: Date.now() - t0, baseline};
}
(async () => {
  if (!cart) throw Error('needs the Ninja Gaiden (US) cartridge');
  if (shots) fs.mkdirSync(shots, {recursive: true});
  // ---------- indicators and write latency on the large project ----------
  {
    const s = await prepared('latency');
    const size = await s.page.evaluate(() => Forge.services.ProjectStore.serialize({includeEditorView: true}).length);
    const lat = [];
    for (let i = 0; i < 8; i++) {
      await editScene(s.page, 3 + (i % 4), 60 + i * 8);
      const t0 = Date.now(); await committed(s.page); lat.push(Date.now() - t0);
    }
    await editMetasprite(s.page, 1); const tm = Date.now(); await committed(s.page); const msLatency = Date.now() - tm;
    const m = (await rs(s.page)).metrics;
    lat.sort((a, b) => a - b);
    report.measurements.largeProject = {serializedChars: size, baselineWriteMs: Math.round(s.baseline.baselineMs), baselineChars: s.baseline.baselineBytes, importToFirstRecoveryMs: s.baselineWallMs,
      editToCommittedMs: {median: lat[lat.length >> 1], max: lat[lat.length - 1], samples: lat}, metaspriteEditToCommittedMs: msLatency, lastWriteChars: m.lastBytes, lastComputeMs: Math.round(m.lastComputeMs * 10) / 10};
    check('Large project: each edit reaches the recovery copy within 1 s, writing only the changed sections (not the 5.7 MB project)',
      lat[lat.length - 1] < 1000 && msLatency < 1000 && m.lastBytes < size / 10, report.measurements.largeProject);
    // statuses: saved/unsaved and the recovery state
    const labels = {};
    await committed(s.page); labels.upToDate = await s.page.$eval('#forge15State', e => e.textContent);
    await s.page.evaluate(() => Forge.services.ProjectStore.saveBrowser('Recovery QA'));
    labels.savedToBrowser = await s.page.$eval('#forge15State', e => e.textContent);
    // hold the journal's stores with another transaction: the write waits, the indicator must say it is behind
    await s.page.evaluate(() => { window.__hold = true; window.__holding = false; const r = indexedDB.open('nes-forge-recovery-journal'); r.onsuccess = () => { const db = r.result, tx = db.transaction(['heads', 'blobs'], 'readwrite'), st = tx.objectStore('heads'); const spin = () => { window.__holding = true; if (window.__hold) st.get('none').onsuccess = spin; }; spin(); }; });
    await s.page.waitForFunction(() => window.__holding);
    // the label turns "behind" once a change has waited 2 s; it refreshes every second
    await editScene(s.page, 9, 136); await s.page.waitForFunction(() => /recovery behind/.test(document.getElementById('forge15State').textContent), null, {timeout: 8000}).catch(() => {});
    labels.behind = await s.page.$eval('#forge15State', e => e.textContent); labels.behindLevel = await s.page.$eval('#forge15State', e => e.dataset.recovery);
    // the Studio bar (the default layout) shows the same state as the classic toolbar, in full
    labels.studioBehind = await s.page.$eval('#studioState', e => ({text: e.textContent, level: e.dataset.recovery, visible: e.offsetWidth > 0, fits: e.scrollWidth <= e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis'}));
    labels.behindFits = labels.studioBehind.visible && labels.studioBehind.fits && labels.studioBehind.text === labels.behind && labels.studioBehind.level === 'behind';
    if (shots) await s.page.screenshot({path: path.join(shots, 'recovery_indicator_behind.png'), clip: {x: 0, y: 0, width: 1440, height: 120}});
    await s.page.evaluate(() => { window.__hold = false; }); await committed(s.page);
    labels.caughtUp = await s.page.$eval('#forge15State', e => e.textContent);
    // a failing write: the indicator must say so (writes are refused by the storage for this test)
    await s.page.evaluate(() => { const put = IDBObjectStore.prototype.put; window.__restorePut = () => { IDBObjectStore.prototype.put = put; }; IDBObjectStore.prototype.put = function (...a) { if (this.transaction.db.name === 'nes-forge-recovery-journal') throw new DOMException('simulated quota exceeded', 'QuotaExceededError'); return put.apply(this, a); }; });
    await editScene(s.page, 10, 120); await s.page.waitForFunction(() => /recovery failed/.test(document.getElementById('forge15State').textContent), null, {timeout: 8000}).catch(() => {});
    labels.failed = await s.page.$eval('#forge15State', e => e.textContent); labels.failedTitle = await s.page.$eval('#forge15State', e => e.title);
    labels.failedLevel = await s.page.$eval('#forge15State', e => e.dataset.recovery);
    labels.studioFailed = await s.page.$eval('#studioState', e => ({text: e.textContent, level: e.dataset.recovery, visible: e.offsetWidth > 0, fits: e.scrollWidth <= e.clientWidth + 1}));
    labels.failedFits = labels.studioFailed.visible && labels.studioFailed.fits && labels.studioFailed.text === labels.failed && labels.studioFailed.level === 'failed';
    labels.failedColour = await s.page.$eval('#studioState', e => getComputedStyle(e).backgroundColor);
    if (shots) await s.page.screenshot({path: path.join(shots, 'recovery_indicator_failed.png'), clip: {x: 0, y: 0, width: 1440, height: 120}});
    await s.page.evaluate(() => window.__restorePut()); await s.page.evaluate(() => Forge.services.ProjectStore.autoSave());
    labels.recovered = await s.page.$eval('#forge15State', e => e.textContent);
    // one place for the state: in every Studio mode exactly one status chip is on screen, the Studio bar's
    labels.chipsPerMode = {};
    for (const m of ['library', 'edit', 'play', 'build']) {
      await s.page.click('#studioMode-' + m); await sleep(250);
      labels.chipsPerMode[m] = await s.page.evaluate(() => ['studioState', 'forge15State'].filter(id => { const e = document.getElementById(id), r = e && e.getBoundingClientRect(); return !!e && e.offsetParent !== null && r.width > 0 && r.bottom > 0 && r.top < innerHeight; }));
    }
    await s.page.click('#studioMode-edit');
    labels.oneChip = Object.values(labels.chipsPerMode).every(v => v.length === 1 && v[0] === 'studioState');
    report.measurements.indicators = labels;
    check('Indicators distinguish saved/unsaved and up-to-date, behind, failed and caught-up recovery; "behind" and "failed" have their own levels, and the Studio bar shows the same state in full (not cut off), in one place in every mode',
      /Unsaved changes · recovery ✓/.test(labels.upToDate) && /✓ Saved · recovery ✓/.test(labels.savedToBrowser) && /recovery behind · \d+ change/.test(labels.behind) && labels.behindLevel === 'behind' && labels.behindFits && labels.failedLevel === 'failed' && labels.failedFits && labels.oneChip &&
      /recovery ✓/.test(labels.caughtUp) && /recovery failed · use Save As/.test(labels.failed) && /simulated quota/.test(labels.failedTitle) && /recovery ✓/.test(labels.recovered), labels);
    await s.ctx.close();
  }
  // ---------- ending the tab or the browser in each way ----------
  const scenarios = [
    {name: 'immediate_close', how: 'tab closed right after the edits, before any write finished; browser kept running', end: async s => { await s.page.close({runBeforeUnload: true}); await sleep(1500); await s.ctx.close(); }},
    {name: 'normal_close', how: 'tab closed after the indicator showed the recovery copy up to date', wait: true, end: async s => { await s.page.close({runBeforeUnload: true}); await sleep(500); await s.ctx.close(); }},
    {name: 'refresh', how: 'page refreshed right after the edits', end: async s => { await s.page.reload(); await s.page.waitForFunction('window.Forge?.services?.ProjectStore?.recoveryState'); await s.page.waitForFunction(() => Forge.services.ProjectStore.state.recoveryPhase !== 'checking'); }, sameContext: true},
    {name: 'browser_killed_after_write', how: 'browser process killed (SIGKILL) after the recovery copy was up to date', wait: true, end: async s => { s.killed = await killBrowser(s.profile); }, killed: true},
    {name: 'browser_killed_immediately', how: 'browser process killed (SIGKILL) right after the edits', end: async s => { s.killed = await killBrowser(s.profile); }, killed: true, mayLose: true},
  ];
  for (const sc of scenarios) {
    const s = await prepared(sc.name);
    await editScene(s.page, 12, 112); await editMetasprite(s.page, 3); await editScene(s.page, 14, 128);
    if (sc.wait) await committed(s.page);
    const expected = await content(s.page), atEnd = await rs(s.page);
    await sc.end(s);
    let r;
    if (sc.sameContext) {
      const page = s.page, offered = await page.evaluate(() => Forge.services.ProjectStore.state.recoveryPhase === 'offered');
      await recordToasts(page);
      const restored = offered ? await page.evaluate(() => Forge.services.ProjectStore.restoreRecovery()) : false;
      r = {ctx: s.ctx, page, offered, restored, state: await rs(page), text: restored ? await content(page) : null, banner: await page.$eval('#autosaveText', e => e.textContent), statusLine: await page.$eval('#forge15State', e => e.textContent), toast: await lastRecoveryToast(page)};
      if (shots) { await page.evaluate(() => switchTab('scene')); await sleep(300); await page.screenshot({path: path.join(shots, 'recovery_' + sc.name + '_restored.png')}); }
    } else r = await reopenAndRestore(s.profile, sc.name);
    const equal = r.text === expected, rep = r.state.report || {};
    // completeness may be claimed only with evidence of a normal end; after a kill the message must say it cannot confirm
    const honest = sc.killed ? rep.complete !== true && /ended unexpectedly|could not be recovered/.test(rep.text || '') : (equal ? rep.complete === true : rep.complete === false);
    report.scenarios[sc.name] = {toast: r.toast, complete: rep.complete ?? null, how: sc.how, editsAtEnd: atEnd.editSeq, committedAtEnd: atEnd.committedSeq, offered: r.offered, restored: r.restored, identical: equal, source: rep.source, recoveredEditSeq: rep.editSeq, markerEditSeq: rep.markerEditSeq, message: rep.text, statusLine: r.statusLine, killedProcesses: s.killed, errors: (r.errors || []).slice(0, 3)};
    if (sc.mayLose) check('Browser killed right after edits: the restored project is one consistent point (' + (equal ? 'every edit present' : 'later edits missing') + '), and the message does not claim completeness it cannot prove',
      r.offered && r.restored && honest, report.scenarios[sc.name]);
    else if (sc.killed) check(sc.how + ': every edit is restored; the message says the browser ended unexpectedly instead of claiming completeness', r.offered && r.restored && equal && honest, report.scenarios[sc.name]);
    else check(sc.how + ': every scene and metasprite edit is restored, and the message says so', r.offered && r.restored && equal && rep.complete === true && !/could not/.test(rep.text || ''), report.scenarios[sc.name]);
    await r.ctx.close().catch(() => {});
  }
  // ---------- damaged or missing data: never a partial project, never a false "restored" ----------
  {
    const s = await prepared('damaged');
    await editScene(s.page, 11, 96); await committed(s.page); const previous = await content(s.page);
    // one click, so exactly one new recovery point follows the "previous" one (several clicks can be written as several
    // points on a loaded machine)
    await s.page.evaluate(() => { S.selTile = 13; });
    const box = await s.page.$eval('#cv', c => { const r = c.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width}; });
    await s.page.mouse.click(box.x + 64 * box.w / 256, box.y + 104 * box.w / 256); await committed(s.page);
    // damage the newest copy of the edited scene's section in storage
    const damaged = await s.page.evaluate(async () => { const r = Forge.services.ProjectStore.recoveryState(); const J = Forge.services.RecoveryJournal, heads = await J.heads(), h = heads.find(x => x.session === r.session);
      const prevHashes = new Set(h.prev.sections.map(x => x[1])), target = h.sections.find(([n, hash]) => n.startsWith('scene:') && !prevHashes.has(hash));
      if (!target) throw Error('test setup: the newest recovery point holds no scene change (seq ' + h.seq + ', previous ' + h.prev.seq + ')');
      const db = await J.open(); await new Promise((res, rej) => { const tx = db.transaction('blobs', 'readwrite'), st = tx.objectStore('blobs'), id = h.session + '|' + target[1]; st.get(id).onsuccess = e => { const v = e.target.result; v.text = v.text.slice(0, v.text.length >> 1); st.put(v); }; tx.oncomplete = res; tx.onerror = rej; });
      return target[0]; });
    await s.page.close({runBeforeUnload: false}); await s.ctx.close();
    const r = await reopenAndRestore(s.profile, 'damaged_section');
    const rep = r.state.report || {};
    report.scenarios.damaged = {damagedSection: damaged, source: rep.source, problems: rep.problems, message: rep.text, identicalToPrevious: r.text === previous};
    check('A damaged section is detected by its checksum; the previous complete point is restored and the message names the problem and the lost change',
      r.restored && rep.source === 'previous' && r.text === previous && rep.complete === false && /checksum/.test((rep.problems || []).join(' ')) && /could not be recovered/.test(rep.text || ''), report.scenarios.damaged);
    await r.ctx.close();
  }
  {
    // the storage refuses writes and the close-time record cannot be written: the restore must report the lost changes
    const s = await prepared('lost');
    const before = await content(s.page);
    await s.page.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (...a) { if (this.transaction.db.name === 'nes-forge-recovery-journal') throw new DOMException('simulated', 'QuotaExceededError'); return put.apply(this, a); };
      const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('forge.recovery.tail.')) throw new DOMException('simulated', 'QuotaExceededError'); return set.call(this, k, v); }; });
    await editScene(s.page, 15, 120); await editScene(s.page, 16, 136); await sleep(600);
    const statusBefore = await s.page.$eval('#forge15State', e => e.textContent);
    await s.page.close({runBeforeUnload: true}); await sleep(800); await s.ctx.close();
    const r = await reopenAndRestore(s.profile, 'lost_changes');
    const rep = r.state.report || {};
    report.scenarios.lostChanges = {toast: r.toast, complete: rep.complete ?? null, statusBeforeClose: statusBefore, recoveredEditSeq: rep.editSeq, markerEditSeq: rep.markerEditSeq, message: rep.text, identicalToLastWrittenPoint: r.text === before, banner: r.banner, statusLine: r.statusLine};
    check('When changes could not be written, the restore names how many were lost instead of "Recovery restored"',
      r.restored && r.text === before && rep.complete === false && rep.markerEditSeq > rep.editSeq && /could not be recovered/.test(r.banner) && !/^Recovery restored/.test(r.banner), report.scenarios.lostChanges);
    await r.ctx.close();
    // the toast at a restore names its outcome: every change back / the last moments cannot be confirmed / N lost
    const toasts = Object.entries(report.scenarios).filter(([, v]) => v && 'toast' in v).map(([k, v]) => ({scenario: k, complete: v.complete, toast: v.toast}));
    const fits = t => t.complete === true ? /^Recovery complete: every change came back$/.test(t.toast || '') : t.complete === false ? /^Recovery incomplete: \d+ changes? (was|were) lost/.test(t.toast || '') :
      /^Recovery restored: the last moments before Forge ended cannot be confirmed/.test(t.toast || '');
    check('The restore toast states its outcome: "complete" only when every change came back, "cannot be confirmed" after an unexpected end, "incomplete" with the number lost',
      toasts.length >= 4 && toasts.every(fits) && toasts.some(t => t.complete === true) && toasts.some(t => t.complete === null) && toasts.some(t => t.complete === false), toasts);
    // the banner (an offer, or a notice after an incomplete restore) sits above the Studio bar instead of over it
    report.bannerLayout = bannerSamples;
    check('The recovery banner never hides the Studio bar: with an offer or a notice shown, Open, Save, the modes and the state chip stay visible and clickable below it',
      bannerSamples.some(b => b.mode === 'offer') && bannerSamples.some(b => b.mode === 'notice') && bannerSamples.every(b => b.controls >= 8 && b.covered.length === 0 && b.barTop >= b.bannerBottom - 1 && b.chipTop >= b.bannerBottom),
      bannerSamples);
  }
  {
    // an interrupted write leaves the previous point intact (deterministic): the journal's transaction is aborted
    // after its writes were issued, as when a tab dies mid-commit
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-recovery-aborted-'));
    const s = await open(profile);
    await editScene(s.page, 5, 40); await committed(s.page); const small = await content(s.page);
    const before = await s.page.evaluate(async () => { const r = Forge.services.ProjectStore.recoveryState(), J = Forge.services.RecoveryJournal, h = (await J.heads()).find(x => x.session === r.session);
      return {seq: h.seq, editSeq: h.editSeq, blobs: (await J.storedHashes(r.session)).size}; });
    await s.page.evaluate(() => { const tx0 = IDBDatabase.prototype.transaction; window.__aborted = 0; window.__restoreTx = () => { IDBDatabase.prototype.transaction = tx0; };
      IDBDatabase.prototype.transaction = function (...a) { const tx = tx0.apply(this, a); if (this.name === 'nes-forge-recovery-journal' && a[1] === 'readwrite') Promise.resolve().then(() => { try { tx.abort(); window.__aborted++; } catch (_) {} }); return tx; }; });
    await importNinja(s.page); await s.page.waitForFunction(() => window.__aborted > 0 && !Forge.services.ProjectStore.recoveryState().writing);
    const during = await s.page.evaluate(async () => { const r = Forge.services.ProjectStore.recoveryState(), J = Forge.services.RecoveryJournal; window.__restoreTx(); const h = (await J.heads()).find(x => x.session === r.session);
      return {seq: h.seq, editSeq: h.editSeq, blobs: (await J.storedHashes(r.session)).size, label: r.label, lastError: r.lastError, aborted: window.__aborted}; });
    if (shots) await s.page.screenshot({path: path.join(shots, 'recovery_indicator_aborted_write.png'), clip: {x: 0, y: 0, width: 1440, height: 120}});
    // with the aborted write, the stored point is still the small project, untouched
    const kept = await s.page.evaluate(async () => { const r = Forge.services.ProjectStore.recoveryState(), J = Forge.services.RecoveryJournal, h = (await J.heads()).find(x => x.session === r.session), m = await J.blobs(r.session, h.sections.map(x => x[1]));
      return h.sections.every(([n, hash]) => m.has(hash) && J.hash(m.get(hash)) === hash) && !h.sections.some(([n]) => n === 'f:investigation'); });
    await s.page.evaluate(() => Forge.services.ProjectStore.autoSave()); await committed(s.page); const large = await content(s.page);
    await s.page.close({runBeforeUnload: true}); await sleep(500); await s.ctx.close();
    const r = await reopenAndRestore(profile, 'after_aborted_write');
    report.scenarios.abortedWrite = {before, during, previousPointIntactAndVerified: kept, restoredLarge: r.text === large, message: (r.state.report || {}).text};
    check('An interrupted write (transaction aborted after its writes were issued) leaves the previous point complete and verified; the indicator reports the failure; the next write succeeds and restores exactly',
      during.aborted > 0 && during.seq === before.seq && during.editSeq === before.editSeq && during.blobs === before.blobs && kept && /recovery failed/.test(during.label) && r.restored && r.text === large && small !== large, report.scenarios.abortedWrite);
    await r.ctx.close();
  }
  {
    // the browser process is killed at different moments while the 5.7 MB first copy is written: every restore is one
    // complete point (the earlier small project or the large one), never a mix
    const attempts = [];
    for (const delay of [0, 15, 30, 60, 120]) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-recovery-kill-'));
      const s = await open(profile);
      await editScene(s.page, 5, 40); await committed(s.page); const small = await content(s.page);
      await s.page.setInputFiles('#projectGatewayFile', cart);
      await s.page.waitForFunction(() => [...document.querySelectorAll('#projectGatewayPanel button')].some(b => /investigated project/i.test(b.textContent)));
      await s.page.evaluate(() => [...document.querySelectorAll('#projectGatewayPanel button')].find(b => /investigated project/i.test(b.textContent)).click());
      await s.page.waitForFunction(() => document.getElementById('investigationPrepare') || document.getElementById('investigationImport'));
      await s.page.evaluate(() => { const p = document.getElementById('investigationPrepare'); if (p && !p.disabled) p.click(); });
      await s.page.waitForFunction(() => !document.getElementById('investigationImport')?.disabled);
      await s.page.evaluate(() => document.getElementById('investigationImport').click());
      await sleep(delay);
      const atKill = await s.page.evaluate(() => ({writing: Forge.services.ProjectStore.recoveryState().writing, imported: !!S.investigation, baselineLarge: Forge.services.ProjectStore.recoveryState().committedAt})).catch(() => null);
      await killBrowser(profile);
      const r = await reopenAndRestore(profile, 'killed_' + delay + 'ms');
      const kind = !r.text ? 'nothing restored' : r.text === small ? 'earlier small project' : JSON.parse(r.text).investigation ? 'large project' : 'other';
      attempts.push({delayMs: delay, stateJustBeforeKill: atKill, restored: kind, message: (r.state.report || {}).text});
      await r.ctx.close();
    }
    report.scenarios.killedDuringLargeWrite = attempts;
    const interrupted = attempts.filter(a => a.stateJustBeforeKill?.writing && a.restored === 'earlier small project').length;
    check('Browser killed at 5 moments during the 5.7 MB first write: every restore is one complete, checksum-verified point (' + interrupted + ' kill(s) landed while that write was in flight and restored the earlier point)',
      attempts.every(a => a.restored === 'earlier small project' || a.restored === 'large project') && attempts.every(a => !/^Recovery restored/.test(a.message || '')), attempts);
  }
  {
    // another open tab's work is not offered as recovery; a blank session leaves nothing to recover
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-recovery-tabs-'));
    const a = await open(profile); await editScene(a.page, 5, 40); await committed(a.page);
    const b = await a.ctx.newPage(); b.on('dialog', d => d.accept()); await b.goto('file://' + editor); await b.waitForFunction('window.Forge?.services?.ProjectStore?.recoveryState');
    await b.waitForFunction(() => Forge.services.ProjectStore.state.recoveryPhase !== 'checking');
    const offeredWhileOpen = await b.evaluate(() => Forge.services.ProjectStore.state.recoveryPhase === 'offered');
    await a.page.close({runBeforeUnload: true}); await sleep(500);
    await b.reload(); await b.waitForFunction('window.Forge?.services?.ProjectStore?.recoveryState'); await b.waitForFunction(() => Forge.services.ProjectStore.state.recoveryPhase !== 'checking');
    const offeredAfterClose = await b.evaluate(() => Forge.services.ProjectStore.state.recoveryPhase === 'offered');
    report.scenarios.tabs = {offeredWhileOtherTabOpen: offeredWhileOpen, offeredAfterItClosed: offeredAfterClose};
    check('A second tab does not offer the first tab\'s live work as recovery, and offers it once that tab has closed', !offeredWhileOpen && offeredAfterClose, report.scenarios.tabs);
    await a.ctx.close();
  }
  report.passed = report.checks.every(c => c.passed);
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(report.passed ? 'project-recovery: all checks passed' : 'project-recovery: FAILED');
  process.exit(report.passed ? 0 : 1);
})().catch(e => { console.log('FAILED', e.stack); report.passed = false; report.error = e.message; try { fs.writeFileSync(output, JSON.stringify(report, null, 2)); } catch (_) {} process.exit(1); });
