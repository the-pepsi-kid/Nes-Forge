#!/usr/bin/env node
'use strict';
// AL-REC-01: per-cartridge recovery after implementation, in the real editor (Chromium), compared with the baseline
// measured before it (QA/fixtures/al-rec-01/baseline.json, from tools/al-rec/measure.cjs).
//
//   node tools/al-rec/recover.cjs --carts DIR --extractions DIR --out DIR [--editor NES_Forge.html] [--only NAME]...
//        [--frames 20000] [--second 12000]
//
// For each cartridge, in a fresh browser profile:
//   1. the usual import (ProjectGatewayUI.openFile), its recovered catalog where Forge has one, the CAD-PORT pack, and
//      its existing extraction pack: the library as the user had it (the cartridge is already in the library);
//   2. Continue Recovery (the recovery ledger, in the isolated sandbox);
//   3. a second run that continues from the first one's states (Retry Unresolved: with CHR RAM tracing);
//   4. the library, the ledger, the reconstruction report and the world organization afterwards.
// Output: one JSON per cartridge and a summary, with counts and hashes only (no cartridge bytes, pictures or data).
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), {spawnSync} = require('node:child_process');
const {chromium} = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const arg = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const all = k => process.argv.flatMap((v, i) => v === '--' + k ? [process.argv[i + 1]] : []);
const editor = path.resolve(arg('editor', path.join(ROOT, 'NES_Forge.html'))), cartDir = arg('carts'), exDir = arg('extractions'), outDir = arg('out');
const frames = +arg('frames', 20000), second = +arg('second', 12000);
if (!cartDir || !outDir) { console.error('usage: recover.cjs --carts DIR --out DIR [--extractions DIR] [--only NAME]...'); process.exit(2); }
const DEFAULT = ['Battletoads (U)', 'Castlevania (U) (PRG 0)', 'Castlevania (U) (PRG 1)', 'Mega Man (U)', 'Mega Man 2 (U)', 'Ninja Gaiden (U)', 'Teenage Mutant Ninja Turtles (U)', 'Zelda 2 - The Adventure of Link (U)', 'Metroid (U)', "Mike Tyson's Punch-Out!! (U) (PRG 0)", "Mike Tyson's Punch-Out!! (U) (PRG 1)"];
const wanted = all('only').length ? all('only') : DEFAULT;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function packFor(romSha, name) {
  if (!exDir || !fs.existsSync(exDir)) return null;
  for (const f of fs.readdirSync(exDir).filter(f => f.endsWith('.zip'))) {
    const py = spawnSync('python3', ['-I', '-c', 'import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nfor n in z.namelist():\n  if n.endswith("native_report.json"):\n    r=json.loads(z.read(n));print((r.get("rom") or {}).get("sha256") or (r.get("source") or {}).get("sha256") or "");break', path.join(exDir, f)], {encoding: 'utf8'});
    if ((py.stdout || '').trim() === romSha) return {file: f, bytes: fs.readFileSync(path.join(exDir, f))};
  }
  // older packs do not record the cartridge's SHA-256: matched by name, as the baseline measurement did
  const norm = s => s.replace(/\.(nes|zip)$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  for (const f of fs.readdirSync(exDir).filter(f => f.endsWith('.zip'))) if (norm(f) === norm(name)) return {file: f, bytes: fs.readFileSync(path.join(exDir, f)), matched: 'by name'};
  return null;
}
const PAGE_LIBRARY = async sha => { const L = Forge.services.ResourceLibrary, r = await L.list({shelf: sha, limit: 1e6}); let scenes = 0, projects = 0;
  for (const e of r.items.filter(e => e.project || /project/i.test(e.kind))) { projects++; try { const {bytes} = await L.readEntry(e.id); const d = JSON.parse(new TextDecoder().decode(bytes)); scenes += (d.scenes || []).length; } catch (_) {} }
  return {entries: r.total, kinds: r.counts, previews: r.items.filter(e => e.preview).length, projects, projectScenes: scenes}; };
(async () => {
  fs.mkdirSync(outDir, {recursive: true}); const browser = await chromium.launch(), rows = [];
  for (const n of wanted) {
    const f = path.join(cartDir, n + '.nes'); if (!fs.existsSync(f)) continue;
    const rom = fs.readFileSync(f), romSha = sha(rom), pack = packFor(romSha, n), t0 = Date.now();
    process.stdout.write(n + ' … ');
    const ctx = await browser.newContext(), page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.RecoveryLedger'); await page.waitForTimeout(500);
    let row;
    try {
      row = await page.evaluate(async ([romArr, name, packArr, packName, frames, second, libraryFn]) => {
        const s = Forge.services, bytes = new Uint8Array(romArr), library = eval('(' + libraryFn + ')'), out = {steps: {}};
        const file = {name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer};
        try { out.steps.import = {opened: !!(await s.ProjectGatewayUI.openFile(file)), profile: s.ProjectGatewayUI.report?.()?.profile || null}; } catch (e) { out.steps.import = {error: e.message}; }
        try { const r = await s.LibraryCatalog.registerCatalog(); out.steps.catalog = {registered: true}; } catch (e) { out.steps.catalog = {registered: false}; }
        const entry = await s.RomImports.record(bytes, name, 'measure'); await s.CadPortRecovery.settled();
        if (packArr) { try { await s.ResourceLibrary.register(new Uint8Array(packArr), {name: packName}); out.steps.pack = packName; } catch (e) { out.steps.pack = {error: e.message}; } }
        const cadBefore = s.CadPortRecovery.recognize(bytes, name).recognized ? await s.CadPortRecovery.register(bytes, name, {quiet: true}) : null;
        out.before = await library(entry.sha256);
        const t1 = performance.now(), a = await s.RecoveryLedger.run(bytes, name, {mode: 'continue', budget: {frames, wallMs: 1200000}});
        const t2 = performance.now(), b = await s.RecoveryLedger.run(bytes, name, {mode: 'retry', budget: {frames: second, wallMs: 1200000}});
        out.runs = [{...a.run, ms: Math.round(t2 - t1), registered: a.registered, cadPort: a.cadPort || null}, {...b.run, ms: Math.round(performance.now() - t2), registered: b.registered, cadPort: b.cadPort || null}];
        out.after = await library(entry.sha256);
        const rep = await s.RecoveryLedger.assess(entry.sha256), l = await s.RecoveryLedger.read(entry.sha256);
        out.report = {table: rep.table, parity: rep.parity, graphics: rep.graphics, verdict: rep.verdict, world: rep.world ? {areas: rep.world.areas.length, transitions: rep.world.transitions.length, scrolling: rep.world.scrolling.length} : null};
        out.ledger = {known: rep.ledger?.known, observations: rep.ledger?.observations, editable: rep.ledger?.editable, traced: l.graphics.traced.length, writableTiles: l.graphics.writableTiles, next: rep.ledger?.next.map(x => (x.blocked ? 'blocked: ' : '') + x.reason), runs: l.investigations.map(i => ({mode: i.mode, state: i.state, stopReason: i.stopReason, frames: i.frames, recorded: i.recorded, gained: i.gained, resumedFrom: i.resumedFrom}))};
        out.traced = l.graphics.traced.slice(-1).map(t => ({frame: t.frame, summary: t.summary, shown: t.shown, writers: (t.writers || []).slice(0, 6)}))[0] || null;
        out.cadPort = {before: cadBefore ? {screens: cadBefore.screens, withGraphics: cadBefore.withGraphics, editable: cadBefore.editable, editablePages: cadBefore.editablePages} : null, after: b.cadPort || a.cadPort || null};
        return out;
      }, [Array.from(rom), n + '.nes', pack ? Array.from(pack.bytes) : null, pack?.file || null, frames, second, PAGE_LIBRARY.toString()]);
    } catch (e) { row = {error: e.message.slice(0, 400)}; }
    await ctx.close();
    row = {cartridge: n, sha256: romSha, ms: Date.now() - t0, extractionPack: pack?.file || null, pageErrors: errors.slice(0, 5), ...row};
    fs.writeFileSync(path.join(outDir, n.replace(/[^A-Za-z0-9]+/g, '_') + '.json'), JSON.stringify(row, null, 1) + '\n');
    rows.push(row);
    console.log(row.error ? 'error ' + row.error : JSON.stringify({before: row.before?.entries, after: row.after?.entries, recorded: row.runs?.map(r => r.registered), stops: row.runs?.map(r => r.stopReason)}));
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({format: 'NESForgeRecoveryComparison', version: 1, editorSha256: sha(fs.readFileSync(editor)), measured: new Date().toISOString(), frames, second, privacy: 'counts and hashes only', rows: rows.map(r => ({cartridge: r.cartridge, sha256: r.sha256, before: r.before, after: r.after, runs: r.runs, ledger: r.ledger, cadPort: r.cadPort, world: r.report?.world, parity: r.report?.parity, error: r.error || null}))}, null, 1) + '\n');
  console.log('wrote', outDir);
  process.exit(0);
})();
