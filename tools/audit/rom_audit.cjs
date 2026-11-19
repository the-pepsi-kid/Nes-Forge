#!/usr/bin/env node
'use strict';
/*
 ROM capability audit: what NES Forge can actually do with each exact ROM revision, measured by driving the
 editor through Forge.commands (the same path as the UI), not taken from documentation.

   node tools/audit/rom_audit.cjs --roms <folder of .nes> [--packs <folder of extraction ZIPs>] --out <folder> [--forge NES_Forge.html]
   node tools/audit/rom_audit.cjs --report-only --out <folder>     (rebuild matrix/report from saved per-ROM results)

 Per ROM (one fresh editor each):
   identity    SHA-256, size, iNES / NES 2.0 header, declared mapper and the mapper after ignoring a dirty header
   intake      the editor's own per-resource statement (rom.inspect rows: inspect / edit / build)
   import      rom.import, then project.info (kind, writers) and resources.list (counts by type and level)
   round trip  project.save -> project.load -> same resources; build.check before and after
   rebuild     unchanged import builds; for native projects, is the output the original ROM byte-for-byte
   audio       native audio driver catalog (cue count) when the editor recognises the driver
   packs       matching extraction ZIPs (by ROM SHA-256): record groups the editor accepts
 Writes <out>/roms/<title>.json, <out>/matrix.csv, <out>/AUDIT.md (matrix, per-ROM notes, backlog), <out>/audit.json.
 Contains titles, hashes, counts and capability states only: no ROM bytes or decoded game data.
*/
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1]; };
const forgePath = path.resolve(opt('forge', path.join(repo, 'NES_Forge.html')));

// ---------- child: audit one ROM in a fresh editor ----------
if (argv.includes('--one')) {
  const romPath = opt('one'), packDir = opt('packs', null);
  const { loadForge } = require(path.join(repo, 'QA/t/u/harness.cjs'));
  const h = loadForge(forgePath);
  for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
  if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
  h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
  h.run("Forge.commands.registerAdapter({id:'audit',kind:'agent',title:'ROM audit'})");
  const R = async (name, args) => { h.context.__a = args === undefined ? null : args; return JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a,{adapter:'audit'})`, 1800000))); };
  (async () => {
    const bytes = fs.readFileSync(romPath), sha = crypto.createHash('sha256').update(bytes).digest('hex');
    const hd = bytes.subarray(0, 16), nes2 = (hd[7] & 0x0C) === 0x08, dirty = !nes2 && hd.subarray(8, 16).some(b => b !== 0);
    const declared = (hd[6] >> 4) | (hd[7] & 0xF0), corrected = dirty ? (hd[6] >> 4) : declared;
    const out = { file: path.basename(romPath), sha256: sha, byteLength: bytes.length, forgeSha256: crypto.createHash('sha256').update(fs.readFileSync(forgePath)).digest('hex'),
      header: { format: hd.subarray(0, 4).toString('latin1') === 'NES\x1a' ? (nes2 ? 'NES 2.0' : 'iNES') : 'unknown', prgKiB: hd[4] * 16, chrKiB: hd[5] * 8, chrRam: hd[5] === 0,
        declaredMapper: declared, mapper: corrected, dirtyHeader: dirty }, steps: {} };
    const step = async (name, fn) => { try { out.steps[name] = await fn(); } catch (e) { out.steps[name] = { error: String(e.message).slice(0, 300) }; } };
    await step('intake', async () => { const r = await R('rom.inspect', { bytes: new Uint8Array(bytes), name: out.file }); if (!r.ok) throw Error(r.error.message);
      return { profile: r.result.profile, intakeMapper: r.result.container?.mapper ?? null, rows: r.result.rows }; });
    await step('import', async () => { const r = await R('rom.import', { bytes: new Uint8Array(bytes), name: out.file }); if (!r.ok) throw Error(r.error.message);
      const info = (await R('project.info')).result;
      const list = (await R('resources.list', { limit: 5000 })).result;
      const byType = {}; for (const i of list.items) { const t = byType[i.type] = byType[i.type] || { total: 0 }; t.total++; t[i.editability.level] = (t[i.editability.level] || 0) + 1; }
      return { project: info.name, kind: info.kind, backend: info.backend, label: info.label, counts: info.counts, writers: info.writers.map(w => ({ id: w.id, title: w.title, route: w.route })),
        resources: list.total, levels: list.counts, byType }; });
    await step('build', async () => { const r = await R('build.check'); if (!r.ok) return { builds: false, error: r.error.message.slice(0, 300) };
      return { builds: true, backend: r.result.backend, bytes: r.result.bytes, identicalToSource: r.result.sha256 === sha, sha256: r.result.sha256 }; });
    await step('roundTrip', async () => { const saved = (await R('project.save')).result.json, before = out.steps.import?.resources;
      const load = await R('project.load', { json: saved }); if (!load.ok) return { reopens: false, error: load.error.message.slice(0, 300) };
      const after = (await R('resources.list', { limit: 1 })).result.total, b = await R('build.check');
      return { reopens: true, sameResourceCount: after === before, buildsAfterReopen: b.ok, sameBuild: b.ok && out.steps.build?.sha256 === b.result.sha256 }; });
    await step('audio', async () => { h.context.__rom = new Uint8Array(bytes);
      const id = JSON.parse(JSON.stringify(await h.run('Forge.services.NativeAudioCatalog.identify(__rom)', 600000) || null));
      if (!id || !id.profile) return { driver: null };
      const cat = JSON.parse(JSON.stringify(await h.run('Forge.services.NativeAudioCatalog.inspect(__rom)', 900000)));
      return { driver: id.profile.title || id.profile.id, cues: (cat.cues || []).length, nativeWriter: false }; });
    if (packDir && fs.existsSync(packDir)) await step('packs', async () => {
      const rows = [];
      for (const z of fs.readdirSync(packDir).filter(n => n.toLowerCase().endsWith('.zip'))) {
        const r = await R('pack.open', { bytes: new Uint8Array(fs.readFileSync(path.join(packDir, z))), name: z });
        if (r.ok && r.result.romSha256.toLowerCase() === sha) rows.push({ pack: z, game: r.result.game, groups: r.result.groups });
      }
      return rows; });
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  })().catch(e => { process.stdout.write(JSON.stringify({ file: path.basename(romPath), fatal: e.message })); process.exit(0); });
  return;
}

// ---------- parent: run every ROM, then build the matrix ----------
const romDir = opt('roms'), outDir = opt('out'), packDir = opt('packs', null);
if ((!romDir && !argv.includes('--report-only')) || !outDir) { console.error('Usage: node tools/audit/rom_audit.cjs --roms <dir> [--packs <dir>] --out <dir> [--forge NES_Forge.html]'); process.exit(1); }
const reportOnly = argv.includes('--report-only');
const roms = reportOnly ? [] : fs.readdirSync(romDir).filter(n => /\.(nes)$/i.test(n)).sort();
fs.mkdirSync(path.join(outDir, 'roms'), { recursive: true });
const results = reportOnly ? fs.readdirSync(path.join(outDir, 'roms')).filter(n => n.endsWith('.json')).sort().map(n => JSON.parse(fs.readFileSync(path.join(outDir, 'roms', n), 'utf8'))) : [];
for (const name of roms) {
  process.stderr.write('auditing ' + name + ' ... ');
  let r;
  try { r = JSON.parse(execFileSync(process.execPath, [__filename, '--forge', forgePath, '--one', path.join(romDir, name), ...(packDir ? ['--packs', packDir] : [])], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 3600000 })); }
  catch (e) { r = { file: name, fatal: String(e.message).slice(0, 300) }; }
  results.push(r); fs.writeFileSync(path.join(outDir, 'roms', name.replace(/[^\w.-]+/g, '_') + '.json'), JSON.stringify(r, null, 1));
  process.stderr.write((r.fatal ? 'FAILED' : 'ok') + '\n');
}

// Category states, strongest first: rebuild (edits reach a built ROM) > edit (editable copies) > visible (in the Library) > identified > none
const CATS = [
  ['Scenes / rooms', i => i.byType?.scene],
  ['CHR / tiles', i => i.byType?.chr],
  ['Palettes', i => i.byType?.palette],
  ['Sprites / poses', i => i.byType?.metasprite],
  ['Animations', i => i.byType?.animation],
  ['Worlds / maps', i => i.byType?.world],
  ['Collision', i => i.byType?.collision],
];
function state(res, kind) {
  if (!res) return 'none';
  if (kind === 'author') return res.build ? 'rebuild (authored)' : 'visible';
  if (res.native) return 'rebuild (' + res.native + ' native)';
  if (res.copy) return 'edit copy (' + res.copy + ')';
  if (res.reference) return 'visible (reference)';
  return res.total ? 'visible' : 'none';
}
const rows = results.map(r => {
  const imp = r.steps?.import || {}, kind = imp.kind;
  const cats = Object.fromEntries(CATS.map(([n, f]) => [n, imp.error ? 'import failed' : state(f(imp), kind)]));
  const audio = r.steps?.audio?.driver ? 'catalog ' + r.steps.audio.cues + ' cues (no native writer)' : 'not identified';
  const packs = (r.steps?.packs || []).map(p => Object.entries(p.groups).map(([k, v]) => k + ' ' + v).join(', ')).join(' | ');
  return { title: r.file.replace(/\.nes$/i, ''), sha256: r.sha256, mapper: r.header ? r.header.mapper + (r.header.dirtyHeader && r.header.declaredMapper !== r.header.mapper ? ' (header says ' + r.header.declaredMapper + ')' : '') : '?',
    profile: r.steps?.intake?.profile || '—', kind: kind || '—', writers: (imp.writers || []).map(w => w.title).join('; ') || '—', cats, audio,
    builds: r.steps?.build?.builds ? (r.steps.build.identicalToSource ? 'yes, identical to source' : 'yes') : 'no', roundTrip: r.steps?.roundTrip?.reopens ? (r.steps.roundTrip.sameResourceCount && r.steps.roundTrip.sameBuild ? 'yes' : 'partial') : 'no',
    packs: packs || '—', fatal: r.fatal || null };
});
// Backlog: capability gaps that block the most ROMs (reusable fixes first).
const gaps = {};
const gap = (key, title) => { gaps[key] = gaps[key] || { title, roms: [] }; return gaps[key]; };
for (const row of rows) {
  if (row.fatal) { gap('fatal', 'Audit could not run').roms.push(row.title); continue; }
  for (const [cat, s] of Object.entries(row.cats)) {
    if (s.startsWith('edit copy')) gap('writer:' + cat, 'No native writer: ' + cat + ' edits are refused at native build').roms.push(row.title);
    if (s === 'none' && row.kind !== 'author') gap('decode:' + cat, 'Not decoded: ' + cat).roms.push(row.title);
  }
  if (row.audio === 'not identified') gap('audio', 'No native audio driver profile').roms.push(row.title);
  else gap('audio-writer', 'Native audio catalog but no native audio writer').roms.push(row.title);
  if (!row.builds.startsWith('yes')) gap('build', 'Unchanged import does not build').roms.push(row.title);
  if (row.roundTrip !== 'yes') gap('roundtrip', 'Save / reopen does not return the same project').roms.push(row.title);
}
const auditedWith = [...new Set(results.map(r => r.forgeSha256).filter(Boolean))], editorShas = auditedWith.length ? auditedWith : [crypto.createHash('sha256').update(fs.readFileSync(forgePath)).digest('hex')];
const backlog = Object.entries(gaps).map(([k, g]) => ({ key: k, title: g.title, count: g.roms.length, roms: g.roms })).sort((a, b) => b.count - a.count);
fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify({ format: 'NESForgeRomAudit', version: 1, forgeSha256: editorShas, roms: results.length, rows, backlog }, null, 1));
const csvCell = v => '"' + String(v).replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(outDir, 'matrix.csv'), [['ROM', 'SHA-256', 'Mapper', 'Intake profile', 'Project kind', 'Native writers', ...CATS.map(c => c[0]), 'Audio', 'Unchanged build', 'Save/reopen', 'Extraction packs'].map(csvCell).join(','),
  ...rows.map(r => [r.title, r.sha256, r.mapper, r.profile, r.kind, r.writers, ...CATS.map(c => r.cats[c[0]]), r.audio, r.builds, r.roundTrip, r.packs].map(csvCell).join(','))].join('\n') + '\n');
const md = ['# NES Forge ROM capability audit', '',
  'Measured by importing each exact ROM through `Forge.commands` (the same path as the editor), listing every resource with its editability level, building the unchanged import and saving / reopening it. Editor SHA-256 `' + editorShas.join('`, `') + '`' + (editorShas.length > 1 ? ' (results come from more than one editor build)' : '') + '.', '',
  'States: **rebuild** = edits reach a built ROM (authored game, or a registered native writer); **edit copy** = editable but a native build refuses the change; **visible** = shown in the Library, read-only; **none** = not decoded.', '',
  '| ROM | Mapper | Kind | ' + CATS.map(c => c[0]).join(' | ') + ' | Audio | Unchanged build | Save/reopen |', '|' + '---|'.repeat(CATS.length + 6),
  ...rows.map(r => '| ' + [r.title, r.mapper, r.kind, ...CATS.map(c => r.cats[c[0]]), r.audio, r.builds, r.roundTrip].join(' | ') + ' |'), '',
  '## Backlog (gaps ranked by how many ROMs they block)', '', ...backlog.map(b => '- **' + b.title + '** — ' + b.count + ' ROM(s): ' + b.roms.join(', ')), '',
  '## Native writers per ROM', '', ...rows.map(r => '- **' + r.title + '**: ' + r.writers + (r.packs !== '—' ? ' · packs: ' + r.packs : '')), ''];
fs.writeFileSync(path.join(outDir, 'AUDIT.md'), md.join('\n'));
console.log('audited ' + results.length + ' ROM(s): ' + path.join(outDir, 'AUDIT.md'));
