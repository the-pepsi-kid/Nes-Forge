#!/usr/bin/env node
'use strict';
// AL-REC-01: per-cartridge recovery measurement, independent of the recovery code it measures.
//
//   node tools/al-rec/measure.cjs --editor NES_Forge.html --carts DIR [--extractions DIR] [--worker-root DIR]
//        [--only "Mega Man (U)"] --out report.json [--label baseline]
//
// For each cartridge it measures what the user's existing path reaches, in two parts kept apart:
//   library        the usual ROM import (ProjectGatewayUI.openFile), the recovered catalog where the open project
//                  has one (LibraryCatalog.registerCatalog), the CAD-PORT pack (RomImports.record), and the
//                  cartridge's extraction pack when one is supplied: Resource library entries by kind, editable
//                  projects and the scenes they hold, entries with pictures;
//   investigation  one Agent Lab job with the plan the worker chooses for the cartridge (its profile plan, else the
//                  generic plan): frames, distinct screens (nametable contents), palettes, rendered images, and the
//                  graphics the frames show: CHR ROM 1 KiB banks seen mapped, or CHR RAM tiles seen and how many of
//                  them occur verbatim in PRG.
// The report holds counts and hashes only: no cartridge bytes, pictures or extracted data.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const arg = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const all = k => process.argv.flatMap((v, i) => v === '--' + k ? [process.argv[i + 1]] : []);
const editor = path.resolve(arg('editor', path.join(ROOT, 'NES_Forge.html'))), cartDir = arg('carts'), exDir = arg('extractions'), workerRoot = arg('worker-root'), out = arg('out'), only = all('only'), label = arg('label', 'measurement');
if (!cartDir || !out) { console.error('usage: measure.cjs --carts DIR --out report.json [--editor F] [--extractions DIR] [--worker-root DIR] [--only NAME]...'); process.exit(2); }
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const DEFAULT = ['Battletoads (U)', 'Castlevania (U) (PRG 0)', 'Castlevania (U) (PRG 1)', 'Mega Man (U)', 'Mega Man 2 (U)', 'Ninja Gaiden (U)', 'Teenage Mutant Ninja Turtles (U)', 'Zelda 2 - The Adventure of Link (U)', 'Metroid (U)', "Mike Tyson's Punch-Out!! (U) (PRG 0)", "Mike Tyson's Punch-Out!! (U) (PRG 1)"];
const wanted = only.length ? only : DEFAULT;
const carts = wanted.map(n => { const f = path.join(cartDir, n + '.nes'); if (!fs.existsSync(f)) return null; const bytes = new Uint8Array(fs.readFileSync(f)); return {name: n + '.nes', bytes, sha256: sha(bytes)}; }).filter(Boolean);

function packsBySource() {
  const m = new Map(); if (!exDir || !fs.existsSync(exDir)) return m;
  for (const f of fs.readdirSync(exDir).filter(f => f.endsWith('.zip'))) {
    let source = null;
    const py = spawnSync('python3', ['-I', '-c', 'import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nfor n in z.namelist():\n  if n.endswith("native_report.json"):\n    r=json.loads(z.read(n));print((r.get("rom") or {}).get("sha256") or (r.get("source") or {}).get("sha256") or "");break', path.join(exDir, f)], {encoding: 'utf8'});
    source = (py.stdout || '').trim() || null;
    const bytes = new Uint8Array(fs.readFileSync(path.join(exDir, f)));
    m.set(source || ('name:' + f.replace(/\.zip$/, '').toLowerCase()), {file: f, bytes});
  }
  return m;
}
const norm = s => s.replace(/\.nes$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '').toLowerCase();
async function library(c, packs) {
  const {load} = require(path.join(ROOT, 'app/tests/dom-environment.cjs'));
  const a = load(editor), w = a.window, s = w.Forge.services, steps = {};
  await new Promise(r => setTimeout(r, 30));
  const until = async (fn, ms = 180000) => { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) return null; await new Promise(r => setTimeout(r, 50)); } };
  const file = {name: c.name, size: c.bytes.length, arrayBuffer: async () => Uint8Array.from(c.bytes).buffer};
  try { const ok = await s.ProjectGatewayUI.openFile(file), rec = s.ProjectGatewayUI.report?.() || null; steps.import = {opened: !!ok, profile: rec?.profile || null, rows: (rec?.rows || []).length}; } catch (e) { steps.import = {error: e.message}; }
  try { const r = await s.LibraryCatalog.registerCatalog(); steps.catalog = {registered: true, entries: r.stats?.entries ?? null}; } catch (e) { steps.catalog = {registered: false, reason: e.message.slice(0, 160)}; }
  try { await s.RomImports.record(w.Uint8Array.from(c.bytes), c.name, 'measure'); await until(() => { const v = s.CadPortRecovery?.status?.(); return !v || !v.pending; }); await s.CadPortRecovery?.settled?.(); const mine = s.CadPortRecovery ? await s.CadPortRecovery.register(w.Uint8Array.from(c.bytes), c.name, {quiet: true}) : null; steps.cadPort = mine?.registered ? {definitions: mine.definitions, screens: mine.screens, withGraphics: mine.withGraphics, editable: mine.editable, skipped: mine.skipped.length} : {registered: false, reason: mine?.reason || null}; } catch (e) { steps.cadPort = {error: e.message}; }
  const pack = packs.get(c.sha256) || packs.get('name:' + norm(c.name).replace(/^(.*)$/, '$1'));
  if (pack) { try { const r = await s.ResourceLibrary.register(w.Uint8Array.from(pack.bytes), {name: pack.file}); steps.extractionPack = {file: pack.file, entries: r?.stats?.entries ?? r?.entries ?? null}; } catch (e) { steps.extractionPack = {file: pack.file, error: e.message.slice(0, 160)}; } }
  else steps.extractionPack = {none: true};
  const L = s.ResourceLibrary, listed = await L.list({shelf: c.sha256, limit: 100000});
  const projects = [], kinds = listed.counts;
  for (const e of listed.items.filter(e => e.project || /project/i.test(e.kind))) {
    try { const {bytes} = await L.readEntry(e.id); const d = JSON.parse(new w.TextDecoder().decode(bytes)); projects.push({kind: e.kind, scenes: Array.isArray(d.scenes) ? d.scenes.length : 0, metasprites: (d.metasprites || []).length, animations: (d.animations || []).length}); } catch (_) { projects.push({kind: e.kind, unreadable: true}); }
  }
  const out = {steps, entries: listed.total, kinds, previews: listed.items.filter(e => e.preview).length,
    projects: {count: projects.length, scenes: projects.reduce((n, p) => n + (p.scenes || 0), 0), metasprites: projects.reduce((n, p) => n + (p.metasprites || 0), 0), animations: projects.reduce((n, p) => n + (p.animations || 0), 0)}};
  try { w.close(); } catch (_) {}
  return out;
}
function prgIndex(rom) {
  const prgStart = 16 + (rom[6] & 4 ? 512 : 0), prgBytes = rom[4] * 16384, idx = new Map();
  for (let o = prgStart; o + 16 <= prgStart + prgBytes; o++) { const k = rom[o] | rom[o + 1] << 8 | rom[o + 2] << 16 | (rom[o + 3] << 24 >>> 0); let l = idx.get(k); if (!l) idx.set(k, l = []); l.push(o); }
  return (tile) => { const k = tile[0] | tile[1] << 8 | tile[2] << 16 | (tile[3] << 24 >>> 0); for (const o of idx.get(k) || []) { let ok = true; for (let i = 4; i < 16; i++) if (rom[o + i] !== tile[i]) { ok = false; break; } if (ok) return o; } return -1; };
}
function investigation(c) {
  if (!workerRoot) return {skipped: 'no --worker-root'};
  fs.mkdirSync(workerRoot, {recursive: true});
  const romFile = path.join(workerRoot, 'measure-' + c.sha256.slice(0, 12) + '.nes'); fs.writeFileSync(romFile, c.bytes, {mode: 0o600});
  const W = path.join(ROOT, 'tools/agent-lab/capture_worker.cjs'), env = {...process.env}; delete env.CHROMIUM_PATH;
  const q = spawnSync('node', [W, 'enqueue', '--root', workerRoot, '--rom', romFile], {encoding: 'utf8', env}); fs.rmSync(romFile, {force: true});
  let job; try { job = JSON.parse(q.stdout.slice(q.stdout.indexOf('{'))); job = job.job || job; } catch (_) { return {error: 'enqueue failed: ' + (q.stderr || q.stdout).slice(0, 300)}; }
  const t0 = Date.now(); const r = spawnSync('node', [W, 'run', '--root', workerRoot, '--forge', editor, '--once'], {encoding: 'utf8', env, timeout: 40 * 60 * 1000});
  const dir = path.join(workerRoot, 'jobs', job.id), j = JSON.parse(fs.readFileSync(path.join(dir, 'job.json'), 'utf8'));
  return {job: j.id, state: j.state, plan: j.plan.name, planSource: j.planSource, targets: j.plan.targets.length, ms: Date.now() - t0, ...frames(c, dir, j)};
}
function frames(c, dir, j) {
  const nt = new Set(), pal = new Set(), img = new Set(), chrBanks = new Set(), tiles = new Map(); let chrRam = false, n = 0;
  const find = prgIndex(c.bytes), chrStart = 16 + (c.bytes[6] & 4 ? 512 : 0) + c.bytes[4] * 16384, chrKiB = c.bytes[5] * 8;
  for (const r of j.results) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, r.file), 'utf8')); } catch (_) { continue; } n++;
    nt.add(d.digests?.nametables); pal.add(d.digests?.palette); img.add(d.rendered?.framebufferSha256);
    if (d.rom?.chrRam && d.memory?.chrRam) { chrRam = true; const b = Buffer.from(d.memory.chrRam, 'base64');
      for (let t = 0; t + 16 <= Math.min(b.length, 8192); t += 16) { const tile = b.subarray(t, t + 16); if (tile.every(v => v === tile[0])) continue; const k = tile.toString('hex'); if (!tiles.has(k)) tiles.set(k, find(tile)); } }
    for (const bank of d.banks?.chr || []) if (/CHR ROM/i.test(bank.source || '') && Number.isInteger(bank.offset)) chrBanks.add(Math.floor(bank.offset / 1024));
  }
  const graphics = chrRam ? {kind: 'CHR RAM', distinctTiles: tiles.size, verbatimInPrg: [...tiles.values()].filter(o => o >= 0).length}
    : {kind: 'CHR ROM', banks1KiB: chrKiB, banksSeenMapped: chrBanks.size};
  return {frames: n, distinctScreens: nt.size, distinctPalettes: pal.size, distinctImages: img.size, graphics, chrStart};
}
(async () => {
  const packs = packsBySource(), rows = [];
  for (const c of carts) {
    process.stdout.write(c.name + ' … ');
    const row = {cartridge: c.name.replace(/\.nes$/, ''), sha256: c.sha256, mapper: (c.bytes[6] >> 4) | ((c.bytes[7] & 0x0c) === 0 ? c.bytes[7] & 0xf0 : 0), prgKiB: c.bytes[4] * 16, chrKiB: c.bytes[5] * 8};
    try { row.library = await library(c, packs); } catch (e) { row.library = {error: e.stack.slice(0, 400)}; }
    try { row.investigation = investigation(c); } catch (e) { row.investigation = {error: e.message.slice(0, 400)}; }
    rows.push(row); console.log(JSON.stringify({entries: row.library.entries, projects: row.library.projects, inv: row.investigation.frames, screens: row.investigation.distinctScreens, graphics: row.investigation.graphics}));
  }
  const report = {format: 'NESForgeRecoveryMeasurement', version: 1, label, editorSha256: sha(fs.readFileSync(editor)), measured: new Date().toISOString(), privacy: 'counts and hashes only; no cartridge bytes, pictures or extracted data', rows};
  fs.mkdirSync(path.dirname(path.resolve(out)), {recursive: true}); fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
  console.log('wrote', out);
  process.exit(0);
})();
