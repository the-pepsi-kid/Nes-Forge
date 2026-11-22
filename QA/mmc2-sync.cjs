'use strict';
// Owner-side (needs the supplied Punch-Out!! PRG 1 cartridge): MMC2 frames are synchronization-checked, and the
// latch-switched CHR mapping each frame used is verified independently of Forge's mapper code.
//   node QA/mmc2-sync.cjs <editor.html> <report.json> <cartridge directory>
// 1. Along the game's own route (boot, title, passcode, the Mike Tyson bout) every frame's evidence rebuilds from its
//    runtime trace with 0 different pixels, background and composite.
// 2. An MMC2 model written here from the mapper's description (four 4 KiB CHR registers, two latches set by reads of
//    $0FD8/$0FE8 and $1FD8-$1FDF/$1FE8-$1FEF, switching after the read) replays every line's pattern fetches (34
//    background fetches, then the line's first 8 sprites, as Forge's scanline renderer orders them) from the latch
//    state at the line start: every visible background tile comes from the predicted bank and tile, every drawn sprite
//    row equals the cartridge's row in the predicted bank, and the latches end the line as recorded.
// 3. Every tile the trace recorded equals the cartridge's bytes at its recorded offset (read from the file here).
// 4. The latches really switch inside frames: lines change latch state, and frames draw background tiles from more
//    than one bank of the same pattern table.
// 5. A bout frame is captured as an editable Scene (the emulator's Capture), validated at 0 different pixels.
// 6. Agent Lab: background jobs on Punch-Out!! (the generic first look, and the Punch-Out plan that reaches the bout)
//    with cold-boot verification: every frame is synchronization-checked, has its scene, and no frame is reported with
//    unverified sprite pattern locations.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const {spawnSync, spawn} = require('node:child_process');
const root = path.resolve(__dirname, '..'), editor = path.resolve(process.argv[2] || path.join(root, 'NES_Forge.html'));
const output = process.argv[3], corpus = process.argv[4];
const {loadForge} = require('./t/u/harness.cjs');
const PRG1 = '22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {suite: 'mmc2-sync', editorSha256: sha(fs.readFileSync(editor)), checks: [], frames: [], model: null, agentLab: null};
const checks = [];
const check = (name, fn) => checks.push([name, fn]);
let rom = null, romFile = null;
if (corpus && fs.existsSync(corpus)) for (const n of fs.readdirSync(corpus)) {
  if (!n.toLowerCase().endsWith('.nes')) continue;
  const b = new Uint8Array(fs.readFileSync(path.join(corpus, n)));
  if (sha(b) === PRG1) { rom = b; romFile = path.join(corpus, n); break; }
}

function forge() {
  const h = loadForge(editor);
  for (const k of ['DecompressionStream', 'Blob', 'Response', 'ReadableStream', 'TextDecoder', 'TextEncoder', 'atob', 'btoa']) if (!h.context[k]) h.context[k] = globalThis[k];
  if (!h.context.crypto || !h.context.crypto.subtle) h.context.crypto = crypto.webcrypto;
  h.context.setTimeout = (fn, ms, ...a) => setTimeout(fn, 0, ...a);
  const R = async (name, args) => { h.context.__a = args === undefined ? null : args;
    const r = JSON.parse(JSON.stringify(await h.run(`Forge.commands.run(${JSON.stringify(name)},__a)`, 900000)));
    if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; };
  return {h, R};
}

// ---------- the independent MMC2 model ----------
// Data meaning (from the record, not from Forge's mapper code): chr = the registers written at $B000, $C000, $D000,
// $E000 (4 KiB bank numbers); latch[t] for pattern table t: 0 = $FD selected, 1 = $FE selected.
const LATCH_FD = 0, LATCH_FE = 1;
function mmc2(chrRegisters, latchAtStart, banksInRom) {
  const latch = latchAtStart.slice();
  const bankFor = a => {
    const table = a >> 12;
    // table 0: $FD -> $B000, $FE -> $C000; table 1: $FD -> $D000, $FE -> $E000
    const register = table === 0 ? (latch[0] === LATCH_FD ? chrRegisters[0] : chrRegisters[1]) : (latch[1] === LATCH_FD ? chrRegisters[2] : chrRegisters[3]);
    return register % banksInRom;
  };
  return {
    latch,
    read(a) {   // the bank this read comes from; the latch switches after the read
      const bank = bankFor(a);
      if (a === 0x0FD8) latch[0] = LATCH_FD; else if (a === 0x0FE8) latch[0] = LATCH_FE;
      else if (a >= 0x1FD8 && a <= 0x1FDF) latch[1] = LATCH_FD; else if (a >= 0x1FE8 && a <= 0x1FEF) latch[1] = LATCH_FE;
      return bank;
    }
  };
}
const pixelsOf = (lo, hi) => Array.from({length: 8}, (_, x) => ((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1));
// one frame's trace against the model and the cartridge
function verifyFrame(f, file) {
  const chrStart = 16 + file[4] * 16384, banksInRom = file[5] * 2, out = {lines: 0, bgFetches: 0, visibleTiles: 0, spriteRows: 0, latchSwitchLines: 0, continuityBreaks: 0,
    tileMismatches: [], bankMismatches: [], spriteMismatches: [], latchMismatches: [], fileMismatches: [], banksPerTable: [new Set(), new Set()]};
  const {trace, vram, oam} = f, pageOf = n => vram.length >= 4096 ? n : null;
  for (let line = 0; line < 240; line++) {
    const ls = trace.lineState[line]; if (!ls || !ls.latch) { out.latchMismatches.push({line, problem: 'no latch state recorded'}); continue; }
    out.lines++;
    if (line > 0 && trace.lineState[line - 1]?.latch && trace.lineState[line - 1].latch.atEnd.join() !== ls.latch.atStart.join()) out.continuityBreaks++;
    if (ls.latch.atStart.join() !== ls.latch.atEnd.join()) out.latchSwitchLines++;
    const m = mmc2(ls.latch.chr, ls.latch.atStart, banksInRom), predicted = [];
    const mirrorPage = n => { const p = pageOf(n); if (p !== null) return p; return ls.mirror === 1 ? (n & 1) : (n >> 1); }; // 1 vertical, 0 horizontal (iNES)
    if (ls.mask & 24) for (let k = 0; k < 34; k++) {
      const coarse = (ls.scrollX >> 3) + k, nt = ls.ntY * 2 + (ls.ntX ^ ((coarse >> 5) & 1)), tile = vram[mirrorPage(nt) * 1024 + (ls.localY >> 3) * 32 + (coarse & 31)];
      const addr = (ls.ctrl & 16 ? 0x1000 : 0) + tile * 16 + (ls.localY & 7), bank = m.read(addr); m.read(addr + 8);
      predicted.push({tile, bank, table: addr >> 12}); out.bgFetches++;
    }
    if (ls.mask & 16) {
      let visible = 0;
      for (let i = 0; i < 64; i++) {
        const top = oam[i * 4] + 1, h = ls.ctrl & 32 ? 16 : 8;
        if (top > 239 || line < top || line >= top + h) continue;
        if (visible++ >= 8) continue;
        const tile = oam[i * 4 + 1], attr = oam[i * 4 + 2], py = attr & 128 ? h - 1 - (line - top) : line - top;
        const base = h === 16 ? (tile & 1) * 0x1000 : (ls.ctrl & 8 ? 0x1000 : 0), ti = h === 16 ? (tile & 0xFE) + (py >> 3) : tile, addr = base + ti * 16 + (py & 7);
        const bank = m.read(addr); m.read(addr + 8);
        const at = chrStart + bank * 4096 + (addr & 4095), expect = pixelsOf(file[at], file[at + 8]);
        const s = trace.sprites[i], row = s && (py >= 8 ? s.bottom : s.top)?.[py & 7];
        out.spriteRows++;
        if (!row || row.join() !== expect.join()) out.spriteMismatches.push({line, sprite: i, py, bank});
      }
    }
    if (m.latch.join() !== ls.latch.atEnd.join()) out.latchMismatches.push({line, model: m.latch.slice(), recorded: ls.latch.atEnd});
    // every visible background tile: its source in the trace is the predicted tile in the predicted bank
    const row = trace.rows[line];
    for (let i = 0; i < row.length; i += 6) {
      const x = row[i], ti = row[i + 2]; if (!ti) continue;
      const k = ((ls.scrollX + x) >> 3) - (ls.scrollX >> 3), p = predicted[k], src = trace.sources[ti];
      out.visibleTiles++;
      if (!p || src.originalTile !== p.tile) { out.tileMismatches.push({line, x, trace: src.originalTile, model: p && p.tile}); continue; }
      if (src.offset !== p.bank * 4096 + p.tile * 16) out.bankMismatches.push({line, x, tile: p.tile, traceBank: src.offset >> 12, modelBank: p.bank});
      out.banksPerTable[p.table].add(p.bank);
    }
  }
  // every recorded tile equals the cartridge's bytes at its offset
  for (let id = 1; id < trace.sources.length; id++) {
    const s = trace.sources[id]; if (s.kind !== 'CHR-ROM') continue;
    const at = chrStart + s.offset, expect = Array.from({length: 8}, (_, y) => pixelsOf(file[at + y], file[at + 8 + y]));
    if (JSON.stringify(expect) !== JSON.stringify(trace.tiles[id])) out.fileMismatches.push({id, offset: s.offset});
  }
  out.banksPerTable = out.banksPerTable.map(s => [...s].sort((a, b) => a - b));
  return out;
}

// ---------- in Forge: the route, evidence and traces ----------
let session = null;
const captured = [];
async function route() {
  if (session) return session;
  const {h, R} = forge();
  const press = async (b, hold = 4, after = 12) => { await R('input.set', {buttons: {[b]: true}}); await R('emulator.frames', {count: hold});
    await R('input.set', {buttons: {[b]: false}}); await R('emulator.frames', {count: after}); };
  const grab = async label => {
    const e = await R('emulator.frameEvidence', {label});
    // nametables and OAM as they were while the frame was drawn (taken after its last line; the game's vblank code
    // that runs before the frame evidence is taken already prepares the next frame)
    const f = JSON.parse(h.run('JSON.stringify({trace:{rows:emu.captureTrace.rows,sources:emu.captureTrace.sources,tiles:emu.captureTrace.tiles,lineState:emu.captureTrace.lineState,sprites:emu.captureTrace.sprites,complete:emu.captureTrace.complete},vram:__drawn.vram,oam:__drawn.oam,drawnFrame:__drawn.frame})'));
    captured.push({label, evidence: e, ...f});
  };
  await R('emulator.load', {bytes: rom, name: 'Punch-Out.nes'});
  // test instrumentation only: copy the nametables and OAM once a frame's last line is drawn
  h.run('(()=>{const inner=renderEmuLine;renderEmuLine=function(line,...rest){const r=inner.call(this,line,...rest);if(line===239)globalThis.__drawn={vram:Array.from(emu.vram),oam:Array.from(emu.oamMem),frame:emu.frameCount};return r;};})()');
  for (const at of [300, 700, 1200]) { await R('emulator.frames', {count: at - h.run('emu.frameCount')}); await grab('boot frame ' + at); }
  await press('start', 4, 90); await press('down', 8, 40); await grab('passcode entry');
  for (const d of '0073735963') { await press('a', 4, 12); for (let i = 0; i < +d; i++) await press('right', 4, 8); }
  await press('start', 4, 300); await grab('bout introduction');
  await press('start', 4, 30);
  for (let k = 1; k <= 8; k++) { await R('emulator.frames', {count: 150}); await grab('bout +' + k * 150 + ' frames'); }
  const fightStance = h.run('emu.ram[0xB1]');
  session = {h, R, fightStance};
  return session;
}

check('Every frame along the route rebuilds from its trace with 0 different pixels (title, passcode, the Mike Tyson bout)', async () => {
  const {fightStance} = await route();
  report.frames = captured.map(c => ({label: c.label, frame: c.evidence.frame, synchronization: c.evidence.synchronization.state, backgroundDifferentPixels: c.evidence.synchronization.backgroundDifferentPixels,
    compositeDifferentPixels: c.evidence.synchronization.compositeDifferentPixels, nativeTiles: c.evidence.synchronization.nativeTiles, latchAtCapture: c.evidence.mapper.mmc2?.latch, spritePatternsAt: c.evidence.spritePatternsAt}));
  assert.equal(captured.length, 13);
  for (const c of captured) {
    const s = c.evidence.synchronization;
    assert.equal(s.state, 'matched', c.label + ': ' + (s.reason || ''));
    assert.equal(s.backgroundDifferentPixels, 0, c.label); assert.equal(s.compositeDifferentPixels, 0, c.label);
    assert.equal(c.evidence.rom.mapper, 9); assert.equal(c.evidence.spritePatternsAt, 'fetch');
  }
  assert.ok(captured.filter(c => /^bout/.test(c.label)).every(c => c.evidence.synchronization.nativeTiles > 100), 'the bout frames draw the arena');
  report.fightStanceByte = fightStance;
});
check('An independent MMC2 model predicts every line\'s pattern fetches: each visible background tile comes from the predicted tile and bank, each drawn sprite row equals the cartridge row in the predicted bank, and the latches end each line as recorded', async () => {
  await route();
  const per = captured.map(c => ({label: c.label, ...verifyFrame(c, rom)}));
  const sum = k => per.reduce((n, p) => n + (Array.isArray(p[k]) ? p[k].length : p[k]), 0);
  report.model = {frames: per.length, lines: sum('lines'), backgroundFetches: sum('bgFetches'), visibleTiles: sum('visibleTiles'), spriteRows: sum('spriteRows'), latchSwitchLines: sum('latchSwitchLines'),
    continuityBreaks: sum('continuityBreaks'), tileMismatches: sum('tileMismatches'), bankMismatches: sum('bankMismatches'), spriteMismatches: sum('spriteMismatches'), latchMismatches: sum('latchMismatches'),
    perFrame: per.map(p => ({label: p.label, visibleTiles: p.visibleTiles, spriteRows: p.spriteRows, latchSwitchLines: p.latchSwitchLines, banksPerTable: p.banksPerTable,
      first: {tile: p.tileMismatches[0] || null, bank: p.bankMismatches[0] || null, sprite: p.spriteMismatches[0] || null, latch: p.latchMismatches[0] || null}}))};
  assert.equal(report.model.lines, 240 * per.length, 'every line carries its latch state');
  for (const k of ['tileMismatches', 'bankMismatches', 'spriteMismatches', 'latchMismatches']) assert.equal(report.model[k], 0, k + ': ' + JSON.stringify(per.find(p => p[k].length)?.[k][0]));
  assert.equal(report.model.continuityBreaks, 0, 'each line starts with the latches the previous one ended with');
  assert.ok(report.model.visibleTiles > 50000 && report.model.spriteRows > 1000, 'the model checked the frames\' tiles and sprite rows');
});
check('Every tile the trace recorded equals the cartridge\'s bytes at its recorded offset', async () => {
  await route();
  const bad = captured.flatMap(c => verifyFrame(c, rom).fileMismatches.map(m => ({label: c.label, ...m})));
  report.cartridge = {tiles: captured.reduce((n, c) => n + c.trace.sources.filter(s => s.kind === 'CHR-ROM').length, 0), mismatches: bad.length};
  assert.equal(bad.length, 0, JSON.stringify(bad[0]));
});
check('The latches switch inside frames: lines change latch state, and frames draw background tiles from more than one bank of the same pattern table', async () => {
  await route();
  const per = report.model.perFrame;
  const multi = per.filter(p => p.banksPerTable.some(b => b.length > 1));
  report.switching = {linesThatSwitch: report.model.latchSwitchLines, framesWithSeveralBanksInOneTable: multi.map(p => ({label: p.label, banksPerTable: p.banksPerTable}))};
  assert.ok(report.model.latchSwitchLines > 0, 'the latches change during lines');
  assert.ok(multi.length >= 5 && multi.some(p => /^bout/.test(p.label)), 'several frames, the bout among them, draw one pattern table from several banks');
});
check('A bout frame is captured as an editable Scene (the emulator\'s Capture), validated at 0 different pixels', async () => {
  const {h} = await route();
  const before = h.run('S.scenes.length');
  h.run('emuCapture()');
  const after = JSON.parse(h.run('JSON.stringify({n:S.scenes.length,meta:S.scenes[S.activeScene].captureMeta,name:S.scenes[S.activeScene].name})'));
  report.scene = {before, after: after.n, name: after.name, mapper: after.meta?.mapper, validation: after.meta?.validation, nativeTiles: after.meta?.nativeTiles};
  assert.equal(after.n, before + 1, 'a new scene');
  assert.equal(after.meta.mapper, 9);
  assert.equal(after.meta.validation.backgroundDifferentPixels, 0); assert.equal(after.meta.validation.compositeDifferentPixels, 0);
});
check('Agent Lab: background jobs on Punch-Out!! (generic first look, and the Punch-Out plan to the bout), verified by cold boots: every frame synchronization-checked, with its scene, none with unverified sprite locations', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-mmc2-lab-')), worker = path.join(root, 'tools/agent-lab/capture_worker.cjs');
  try {
    const cli = (...args) => { const r = spawnSync(process.execPath, [worker, ...args, '--root', dir], {encoding: 'utf8', timeout: 900000, env: process.env});
      if (r.status !== 0) throw Error(args[0] + ': ' + (r.stderr || r.stdout).slice(-600)); return r.stdout; };
    cli('enqueue', '--rom', romFile, '--plan', 'generic', '--verify', 'cold');
    cli('enqueue', '--rom', romFile, '--plan', 'profile', '--verify', 'cold');
    // the worker runs for minutes: its log is forwarded and a heartbeat printed, so the suite is never silent
    const t0 = Date.now();
    await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, [worker, 'run', '--root', dir, '--forge', editor, '--once'], {env: process.env}); let err = '';
      p.stdout.on('data', d => process.stdout.write(String(d).split('\n').filter(Boolean).map(l => '  agent-lab: ' + l + '\n').join('')));
      p.stderr.on('data', d => { err += d; });
      const beat = setInterval(() => console.log('  agent-lab: running · ' + Math.round((Date.now() - t0) / 1000) + ' s'), 30000);
      p.on('exit', code => { clearInterval(beat); code === 0 ? resolve() : reject(Error('run: ' + err.slice(-600))); });
    });
    const ms = Date.now() - t0;
    const jobs = JSON.parse(cli('status'));
    const full = jobs.map(j => JSON.parse(fs.readFileSync(path.join(dir, 'jobs', j.id, 'job.json'), 'utf8')));
    const frames = full.flatMap(j => j.results.map(r => {
      const rec = JSON.parse(fs.readFileSync(path.join(dir, 'jobs', j.id, r.file), 'utf8'));   // the record, with its provenance
      return {plan: j.plan.name, label: r.label, synchronization: r.synchronization, scene: r.scene, split: r.split, mapper: rec.rom?.mapper, spritePatternsAt: rec.spritePatternsAt,
        banks: (rec.synchronization?.backgroundTileSources || []).map(s => s.chrOffset >> 12)};
    }));
    report.agentLab = {ms, jobs: jobs.map(j => ({plan: j.plan.name, source: j.plan.source, state: j.state, frames: j.frames, synchronized: j.synchronized, unresolved: j.unresolved})), frames};
    assert.equal(jobs.length, 2); assert.ok(jobs.every(j => j.state === 'completed'), JSON.stringify(jobs.map(j => j.state)));
    assert.ok(jobs.some(j => /Punch-Out/.test(j.plan.name)), 'the Punch-Out plan was chosen for this cartridge');
    assert.equal(frames.length, 3 + 4);
    assert.ok(frames.every(f => f.synchronization === 'matched' && f.scene && !f.split && f.mapper === 9 && f.spritePatternsAt === 'fetch'), JSON.stringify(frames.find(f => f.synchronization !== 'matched' || !f.scene || f.split)));
    assert.ok(jobs.every(j => !j.unresolved.some(u => /not synchronization-checked|sprite pattern locations are unverified/.test(u))), JSON.stringify(jobs.map(j => j.unresolved)));
    assert.ok(frames.some(f => /fighting/.test(f.label) && new Set(f.banks).size > 1), 'the bout frame draws from several banks');
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

(async () => {
  if (!rom) { report.skipped = 'No Punch-Out!! PRG 1 cartridge in ' + (corpus ? 'the supplied directory' : 'arguments'); report.passed = true; }
  else {
    for (const [name, fn] of checks) { process.stderr.write('check: ' + name + '\n'); try { await fn(); report.checks.push({name, passed: true}); } catch (e) { report.checks.push({name, passed: false, error: String(e.stack || e.message).slice(0, 900)}); } }
    report.total = report.checks.length; report.checksPassed = report.checks.filter(c => c.passed).length; report.passed = report.checksPassed === report.total;
  }
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.error ? ': ' + c.error : ''));
  if (report.skipped) console.log('SKIP ' + report.skipped);
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
