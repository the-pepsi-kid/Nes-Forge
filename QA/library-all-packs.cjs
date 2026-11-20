'use strict';
// Owner-side (needs the private extraction packs): register every pack in a real Chromium profile, snapshot every
// library entry, close and reopen the browser, and prove nothing was lost, hidden or miscategorised:
//   lost            the same entry ids, kinds, content hashes, data states, validation states and preview links
//   miscategorised  every entry's kind equals the intake's own classification of that file (pack.files), recomputed
//                   independently after the restart; files the intake does not classify carry no intake kind
//   hidden          Resources › Library lists every entry; library.list returns every entry of every pack
//   integrity       every stored entry's data matches its content hash
//   node QA/library-all-packs.cjs <NES_Forge.html> <report.json> <folder of extraction ZIPs>
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const {chromium} = require('playwright');
const [editorArg, output, packDir] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), packs: [], checks: []};
const check = (name, passed, detail) => report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})});
const launch = dir => chromium.launchPersistentContext(dir, {headless: true, viewport: {width: 1440, height: 900}, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
const open = async ctx => { const p = ctx.pages()[0] || await ctx.newPage(); p.setDefaultTimeout(3600000); await p.goto('file://' + editor); await p.waitForFunction('window.Forge?.services?.ResourceLibrary'); return p; };
const snapshot = page => page.evaluate(async () => {
  const b = Forge.services.ResourceLibrary;
  const r = await Forge.commands.run('library.list', {limit: 5000}); if (!r.ok) throw Error(r.error.message);
  const all = []; for (let offset = 0; offset < r.result.total; offset += 5000) { const p = await Forge.commands.run('library.list', {offset, limit: 5000}); all.push(...p.result.items); }
  const full = await Promise.all(all.map(i => b.entry(i.id)));
  return full.map(e => ({id: e.id, kind: e.kind, identified: e.identified, contentHash: e.contentHash, data: e.data?.state, validation: e.validation?.state, preview: e.preview?.hash || null, size: e.size}))
    .sort((a, c) => a.id.localeCompare(c.id));
});
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-allpacks-'));
  const files = fs.readdirSync(packDir).filter(f => /\.zip$/i.test(f)).sort();
  let ctx = await launch(profile), page = await open(ctx);
  try {
    for (const f of files) {
      const b64 = fs.readFileSync(path.join(packDir, f)).toString('base64'), t0 = Date.now();
      const r = await page.evaluate(async ([b64, name]) => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const r = await Forge.commands.run('library.register', {bytes, name}); if (!r.ok) throw Error(r.error.message); return r.result; }, [b64, f]);
      report.packs.push({pack: f, ms: Date.now() - t0, entries: r.stats.entries, stored: r.stats.blobsStored, shared: r.stats.blobsShared, unknown: r.stats.unknown, rejected: r.stats.rejected, notRead: r.stats.notRead});
      process.stderr.write(`registered ${f} ${r.stats.entries} entries in ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
    }
    const before = await snapshot(page), statusBefore = await page.evaluate(async () => (await Forge.commands.run('library.status')).result);
    await ctx.close();
    // ---- restart ----
    ctx = await launch(profile); page = await open(ctx);
    const after = await snapshot(page), statusAfter = await page.evaluate(async () => (await Forge.commands.run('library.status')).result);
    const key = e => JSON.stringify(e), beforeMap = new Map(before.map(e => [e.id, key(e)]));
    const lost = before.filter(e => !after.some(a => a.id === e.id)).map(e => e.id), changed = after.filter(e => beforeMap.has(e.id) && beforeMap.get(e.id) !== key(e)).map(e => e.id);
    check('Every entry survives closing and reopening the browser, unchanged', lost.length === 0 && changed.length === 0 && after.length === before.length && statusAfter.blobs === statusBefore.blobs,
      {entries: after.length, lost: lost.slice(0, 5), changed: changed.slice(0, 5)});
    // every pack: one entry per file, and kinds equal the intake's own classification (recomputed now)
    const packs = await page.evaluate(async () => (await Forge.commands.run('library.packs')).result);
    const wrong = [], counts = [];
    for (const f of files) {
      const p = packs.find(x => x.name === f); if (!p) { wrong.push({pack: f, problem: 'not registered'}); continue; }
      const b64 = fs.readFileSync(path.join(packDir, f)).toString('base64');
      const classes = await page.evaluate(async b64 => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        try { const pk = await Forge.services.ExtractionPack.open(bytes); const out = {}; for (const [k, list] of Object.entries(pk.files || {})) for (const path of list) out[path] = k; return out; } catch (e) { return {}; } }, b64);
      const mine = after.filter(e => e.id.startsWith('pack:' + p.packSha256.slice(0, 16) + ':'));
      counts.push({pack: f, files: p.fileCount, entries: mine.length});
      if (mine.length !== p.fileCount) wrong.push({pack: f, problem: mine.length + ' entries for ' + p.fileCount + ' files'});
      for (const e of mine) { const filePath = e.id.slice(('pack:' + p.packSha256.slice(0, 16) + ':').length), intake = classes[filePath];
        if (intake ? e.kind !== intake || e.identified !== true : e.identified !== false) wrong.push({pack: f, path: filePath, kind: e.kind, intake: intake || null}); }
    }
    check('One entry per file of every pack, and every kind matches the intake\'s own classification', wrong.length === 0, {packs: counts.length, entries: after.length, wrong: wrong.slice(0, 8)});
    // hidden: the Library view lists every entry
    await page.click('#frx-open'); await page.click('#frx-lib');
    await page.waitForFunction(n => document.querySelectorAll('#frx-items .frx-item').length === n, after.length, {timeout: 600000}).catch(() => {});
    const listed = await page.$$eval('#frx-items .frx-item', bs => bs.length);
    check('Resources › Library lists every entry', listed === after.length, {listed, entries: after.length});
    const v = await page.evaluate(async () => (await Forge.commands.run('library.verify')).result);
    check('Integrity: every stored entry matches its content hash', v.ok, {entries: v.entries, blobsChecked: v.blobsChecked, problems: v.problems.slice(0, 5)});
    report.totals = {entries: after.length, blobs: statusAfter.blobs, storage: statusAfter.storage, unidentified: after.filter(e => e.identified === false).length,
      byKind: after.reduce((m, e) => (m[e.kind] = (m[e.kind] || 0) + 1, m), {})};
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 800)); }
  await ctx.close();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 600)));
  if (report.totals) console.log('  ' + report.totals.entries + ' entries, ' + report.totals.blobs + ' blobs, ' + report.totals.unidentified + ' unidentified; storage ' + JSON.stringify(report.totals.storage));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
