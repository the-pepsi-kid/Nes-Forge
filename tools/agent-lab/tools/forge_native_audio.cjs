#!/usr/bin/env node
'use strict';
/*
 NES Forge NATIVE AUDIO extraction: every song and sound in the ROM, without playing the game.

 Forge.html contains the game's own music driver profile for some ROMs. This script lists every
 music/sound request in the ROM, runs the game's own driver code for each one in isolation, and
 writes each as a Forge project with the notes in the AUDIO tab.

 Usage:
   node forge_native_audio.cjs <rom.nes> <outdir> --forge <Forge.html> --harness <harness.cjs> [--frames 3600]

 --frames  how long to run each cue (60 = 1 second; default 3600 = one minute; max 16384)

 Writes <outdir>/audio/:
   <cue>.nesforge.json     one Forge project per song or sound (Open Project, AUDIO tab)
   index.html              list of every cue with note counts
   audio_catalog.json      the driver's full catalog with ROM file offsets
   audio_report.json       what converted, what did not and why
*/
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; }
const romPath = process.argv[2], outDir = process.argv[3];
if (!romPath || !outDir || romPath.startsWith('--')) {
  console.error('Usage: node forge_native_audio.cjs <rom.nes> <outdir> --forge Forge.html --harness harness.cjs [--frames 3600]');
  process.exit(1);
}
const forgePath = path.resolve(arg('forge', 'Forge.html')), harnessPath = path.resolve(arg('harness', 'Tests/upstream/harness.cjs'));
const frames = Number(arg('frames', '3600'));
if (!Number.isInteger(frames) || frames < 16 || frames > 16384) { console.error('ERROR: --frames must be 16 to 16384'); process.exit(1); }
const rom = fs.readFileSync(romPath);
const sha = crypto.createHash('sha256').update(rom).digest('hex');
const { loadForge } = require(harnessPath);
// Forge limits one native audio run to 1024 frames (17 seconds). For longer songs, load a temporary
// copy of Forge.html with only that one number raised. Your Forge.html is not modified.
let loadPath = forgePath, capNote = null, effectiveFrames = frames;
if (frames > 1024) {
  // Forge bounds one native audio run (1024 frames, 2,000,000 CPU instructions, 131,072 register writes).
  // Those bounds are raised in a temporary copy only; your Forge.html is not modified.
  let html = fs.readFileSync(forgePath, 'utf8');
  const raise = [
    ['const services=window.Forge.services,MAX_FRAMES=1024', 'const services=window.Forge.services,MAX_FRAMES=16384', true],
    ['{maxInstructions=2000000,maxWrites=131072,', '{maxInstructions=2000000000,maxWrites=16000000,', false],
    ['maxInstructions>2000000||', 'maxInstructions>2000000000||', false],
    ['maxWrites>131072||', 'maxWrites>16000000||', false],
  ];
  let ok = true;
  for (const [from, to, required] of raise) { if (html.split(from).length === 2) html = html.replace(from, to); else if (required) ok = false; }
  if (ok) {
    loadPath = path.join(require('node:os').tmpdir(), 'forge_audio_long_' + process.pid + '.html');
    fs.writeFileSync(loadPath, html);
    process.on('exit', () => { try { fs.unlinkSync(loadPath); } catch { /* already gone */ } });
  } else { effectiveFrames = 1024; capNote = 'This Forge.html build limits native audio to 1024 frames (17 s) per cue; songs are cut there.'; }
}
const forge = loadForge(loadPath);
if (!forge.context.crypto || !forge.context.crypto.subtle) forge.context.crypto = crypto.webcrypto;
// The driver runner yields with setTimeout every few frames; the test harness stubs timers out, so give it a real one.
forge.context.setTimeout = (fn, ms, ...rest) => setTimeout(fn, 0, ...rest);
const plain = v => JSON.parse(JSON.stringify(v));
const safe = s => String(s).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'x';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

(async () => {
  // Same game data under a different 16-byte header is still the same game: try header variants in memory.
  let identity = null, note = null;
  const variants = [new Uint8Array(rom)];
  for (const low of [0, 1, 2, 3]) for (const b7 of [rom[7] & 0xf0, 0]) { const c = new Uint8Array(rom); c[6] = (rom[6] & 0xf0) | low; c[7] = b7; c.fill(0, 8, 16); variants.push(c); }
  for (const v of variants) {
    forge.context.__rom = v;
    const id = plain(await forge.run('Forge.services.NativeAudioCatalog.identify(__rom)', 120000));
    if (id && id.profile) { identity = id; if (v !== variants[0]) note = 'Recognised after normalising the 16-byte header in memory.'; break; }
  }
  if (!identity) {
    let titles = [];
    try { const p = forge.run('(()=>{const c=Forge.services.NativeAudioCatalog.profiles;return JSON.stringify((typeof c==="function"?c():c||[]).map(x=>x.title||x.id))})()'); titles = JSON.parse(p); } catch { /* list is optional */ }
    console.error('NO NATIVE AUDIO DRIVER for this exact ROM (SHA-256 ' + sha + ').');
    if (titles.length) console.error('Drivers in this Forge.html: ' + [...new Set(titles)].join(', '));
    console.error('Use forge_audio.cjs (records what plays) for this ROM instead.');
    process.exit(3);
  }
  const catalog = plain(await forge.run('Forge.services.NativeAudioCatalog.inspect(__rom)', 300000));
  const dir = path.join(outDir, 'audio');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'audio_catalog.json'), JSON.stringify(catalog));
  const title = identity.profile.title;
  const rows = [], counts = { cues: catalog.cues.length, converted: 0, silent: 0, not_convertible: 0, notes: 0 };
  const used = new Set();
  for (const cue of catalog.cues) {
    forge.context.__cue = cue.id; forge.context.__frames = effectiveFrames;
    const kind = String(cue.kind || '');
    let r;
    for (const tryFrames of [effectiveFrames, 1024, 600, 256]) {
      if (tryFrames > effectiveFrames) continue;
      forge.context.__frames = tryFrames;
      try { r = plain(await forge.run('Forge.services.NativeAudioRecovery.preview(__rom,{cueId:__cue,frames:__frames,rows:64,resourceKind:"music"})', 600000)); }
      catch (e) { r = { status: 'unsupported', diagnostics: [{ message: String(e.message) }] }; }
      if (r && r.imported) break;
      if (!/limit reached|shorter window|exceeded/i.test(((r.diagnostics || [])[0] || {}).message || '')) break;
    }
    const imp = r && r.imported;
    if (!imp || !imp.noteCount) {
      const why = ((r.diagnostics || [])[0] || {}).message || 'no notes';
      if (/No representable sounding/.test(why)) counts.silent++; else counts.not_convertible++;
      rows.push({ id: cue.id, label: cue.label, kind, status: 'not converted', reason: why.slice(0, 160) }); continue;
    }
    // Put the song into a blank project through Forge's own project store.
    forge.context.__imp = imp; forge.context.__title = (title + ' - ' + cue.label).slice(0, 120);
    let json;
    try {
      json = forge.run(`(()=>{const PS=Forge.services.ProjectStore;PS.initializeBlank();
        PS.applyAudioImport({patterns:[...S.patterns,...__imp.patterns.map(p=>({rows:p.rows.map(r=>r.map(c=>({...c,inst:c.inst>=0?c.inst+S.instruments.length:c.inst})))}))],
          instruments:[...S.instruments,...__imp.instruments],orderList:__imp.patterns.map((_,i)=>{const n=S.patterns.length+i;return [n,n,n,n,n]}),tempo:150,speed:1},
          {kind:'music',expected:{epoch:PS.state.epoch,snapshot:PS.serialize()},intent:'audioToolImport'});
        S.projectName=__title;return db_serializeState({includeEditorView:true})})()`, 120000);
    } catch (e) { counts.not_convertible++; rows.push({ id: cue.id, label: cue.label, kind, status: 'not converted', reason: ('project: ' + e.message).slice(0, 160) }); continue; }
    let base = safe(cue.label || cue.id); while (used.has(base)) base += '_'; used.add(base);
    fs.writeFileSync(path.join(dir, base + '.nesforge.json'), json);
    counts.converted++; counts.notes += imp.noteCount;
    rows.push({ id: cue.id, label: cue.label, kind, status: 'converted', file: base + '.nesforge.json', notes: imp.noteCount, seconds: +(imp.durationFrames / 60).toFixed(1),
      warnings: (r.warnings || []).filter(w => /omitted|DPCM|short/i.test(w)).map(w => w.slice(0, 140)) });
  }
  const report = { format: 'NESForgeNativeAudioExtraction', rom: { sha256: sha, file: path.basename(romPath) }, driver: identity.profile, header_note: note,
    frames_per_cue: effectiveFrames, cap_note: capNote, counts, status: counts.converted ? 'PASS' : 'FAIL', cues: rows,
    limits: ['Each project is a frame-by-frame transcription made by running the game\'s own sound driver for the stated time; looping songs are cut at that time.',
      'One row per frame (tempo 150, speed 1). DPCM samples and short-mode noise cannot be held by the Forge tracker and are left out.',
      'Volume and pitch effects appear as per-row volumes and separate notes, not as instruments.'] };
  fs.writeFileSync(path.join(dir, 'audio_report.json'), JSON.stringify(report, null, 2) + '\n');
  const html = ['<!doctype html><meta charset="utf-8"><title>' + esc(title) + ' - native audio</title><style>body{background:#111;color:#ddd;font:14px system-ui,sans-serif;margin:16px}a{color:#7cf}td,th{padding:3px 10px;text-align:left;border-bottom:1px solid #333}.m{color:#999}</style>',
    '<h1>' + esc(title) + ' - audio</h1><p>' + counts.converted + ' of ' + counts.cues + ' cues converted (' + counts.notes + ' notes). ' + counts.silent + ' produce no tracker-representable sound, ' + counts.not_convertible + ' are controls, empty slots or sample playback.</p>',
    '<p class="m">Open a project in NES Forge with Open Project, then the AUDIO tab. Keep this folder private.</p><table><tr><th>Cue</th><th>Kind</th><th>Result</th><th>Notes</th><th>Length</th></tr>'];
  for (const r of rows) html.push('<tr><td>' + (r.file ? '<a href="' + esc(r.file) + '">' + esc(r.label) + '</a>' : esc(r.label)) + '</td><td>' + esc(r.kind) + '</td><td>' + esc(r.status === 'converted' ? 'converted' : r.reason) + '</td><td>' + (r.notes || '') + '</td><td>' + (r.seconds ? r.seconds + ' s' : '') + '</td></tr>');
  html.push('</table>');
  fs.writeFileSync(path.join(dir, 'index.html'), html.join('\n'));
  console.log(report.status + ': ' + title + ' native audio');
  if (note) console.log('NOTE: ' + note);
  if (capNote) console.log('NOTE: ' + capNote);
  console.log('CUES: ' + counts.converted + ' of ' + counts.cues + ' converted, ' + counts.notes + ' notes; ' + counts.silent + ' silent, ' + counts.not_convertible + ' not convertible');
  console.log('OPEN: ' + path.join(path.resolve(dir), 'index.html'));
  process.exit(report.status === 'PASS' ? 0 : 5);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(4); });
