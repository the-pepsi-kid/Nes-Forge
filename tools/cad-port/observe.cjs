#!/usr/bin/env node
'use strict';
// CAD-PORT-01 runtime observation (Agent Lab, development only). Plays a local cartridge with a scripted input in NES
// Forge's emulator and, independently, in FCEUX, captures the PPU nametables, palette, CHR and PPUCTRL every few frames,
// and asks: does the running game draw the screens a translated definition decodes from the cartridge? It also locates
// the background graphics the game used when it drew them (as cartridge offsets, never as copied bytes).
//
//   node tools/cad-port/observe.cjs --cartridge "X.nes" --game tmnt [--engines forge,fceux] [--script default]
//        [--every 15] [--editor NES_Forge.html] [--out observation.json]
//
// The output holds hashes, offsets, counts, screen indexes and the 16 background colour numbers in use: no cartridge
// bytes and no captured graphics.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const D = require('../../app/src/re/cad-port-decoders.js'), C = require('../../app/src/re/cad-port-catalog.js');
const args = process.argv.slice(2), opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const cart = opt('--cartridge'), game = opt('--game'); if (!cart || !game) { console.error('usage: observe.cjs --cartridge X.nes --game folder'); process.exit(2); }
const engines = opt('--engines', 'forge,fceux').split(','), every = +opt('--every', 15), scriptName = opt('--script', 'default');
const editor = opt('--editor', path.join(__dirname, '../../NES_Forge.html')), outFile = opt('--out');
const SCRIPTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'observation-scripts.json'), 'utf8'));
const rom = new Uint8Array(fs.readFileSync(cart)), sha256 = crypto.createHash('sha256').update(rom).digest('hex');
const g = C.games.find(x => x.folder === game); if (!g) { console.error('no such game folder', game); process.exit(2); }
const script = SCRIPTS.scripts[(SCRIPTS.games[game] || {})[scriptName] || scriptName]; if (!script) { console.error('no script', scriptName); process.exit(2); }
const frames = []; for (const [mask, n] of script.steps) for (let i = 0; i < n; i++) frames.push(mask);
const capturesAt = []; for (let f = every; f <= frames.length; f += every) capturesAt.push(f);

// the definitions and their decoded screens
const defs = g.definitions.filter(d => d.status === 'decodable').map(d => {
  const a = D.applicability(rom, d); if (a.state === 'contradicted') return {d, a, projections: null};
  try { const dec = D.decodeAll(rom, d); return {d, a, projections: dec.screens.map(s => D.project(dec, d, s))}; } catch (e) { return {d, a, projections: null, error: e.message}; }
});

async function runForge() {
  const {load} = require('../../app/tests/dom-environment.cjs');
  const t0 = Date.now(), a = load(editor), w = a.window;
  await new Promise(r => setTimeout(r, 50));
  let mask = 0; w.emuReadJoyState = () => mask;
  if (!w.eval('emuLoadRomData')(w.Uint8Array.from(rom), path.basename(cart), 0)) throw Error('Forge refused the cartridge');
  const caps = [], run = w.eval('emuRunFrame'), bus = w.eval('ppuBusRead'), emu = w.eval('emu');
  // captures at the k-th entry of the NMI handler, the same program event FCEUX's checkpoints use (the sandbox's hook):
  // a split-screen game switches pattern tables mid-frame, so the capture point decides which table is seen
  const prg = rom[4] * 16384, vec = 16 + (rom[6] & 4 ? 512 : 0) + prg - 6, want = new Set(capturesAt); let nmis = 0;
  w.__cadPortNmiTarget = rom[vec] | (rom[vec + 1] << 8);
  w.__cadPortNmi = () => { nmis++; if (!want.has(nmis)) return; want.delete(nmis);
    const nt = new Uint8Array(4096), chr = new Uint8Array(8192); for (let i = 0; i < 4096; i++) nt[i] = bus(0x2000 + i); for (let i = 0; i < 8192; i++) chr[i] = bus(i);
    caps.push({frame: emu.frameCount, nmi: nmis, nametables: nt, palette: Uint8Array.from(emu.palRam), chr, ctrl: emu.ppuCtrl}); };
  w.eval('(function(){const prev=cpuStepRaw;cpuStepRaw=function(...args){if((emu.PC&0xffff)===window.__cadPortNmiTarget)window.__cadPortNmi();return prev.apply(this,args);};})()');
  for (let f = 0; f < frames.length + 60 && want.size; f++) { mask = frames[f] ?? 0; run(); }
  // the window is left open: closing it lets a pending editor timer touch a torn-down document; the process exits below
  return {engine: 'forge', identity: 'NES Forge emulator (this build)', ms: Date.now() - t0, nmis, captures: caps};
}
function runFceux() {
  const F = require('../agent-lab/independent/fceux.cjs'), s = F.open(); if (!s.available) return {engine: 'fceux', blocked: s.reason};
  const t0 = Date.now(), prg = rom[4] * 16384, vec = 16 + (rom[6] & 4 ? 512 : 0) + prg - 6, nmiTarget = rom[vec] | (rom[vec + 1] << 8);
  const r = s.run({id: 'observe', rom, nmiTarget, latches: frames, byFrame: true, ctrl: true, chr: true, checkpoints: capturesAt.map(n => ({label: 'f' + n, nmi: n})), maxFrames: frames.length + 60}, {timeoutMs: 600000});
  s.close();
  if (!r.ok) return {engine: 'fceux', identity: s.identity, blocked: r.reason};
  return {engine: 'fceux', identity: s.identity, ms: Date.now() - t0, nmis: r.nmis, captures: r.captures.map(c => ({frame: c.frame, nmi: c.nmi, nametables: c.ppu, palette: c.palette, chr: c.chr, ctrl: c.ctrl}))};
}
// where the background pattern table the game used came from: each 1 KiB of it located in CHR ROM, or each tile in PRG
function locateGraphics(cap) {
  const bg = cap.ctrl == null ? null : (cap.ctrl & 0x10 ? 0x1000 : 0), out = {table: bg === null ? 'unknown' : bg ? '$1000' : '$0000'};
  if (bg === null) return out;
  const table = cap.chr.subarray(bg, bg + 4096), chrStart = 16 + (rom[6] & 4 ? 512 : 0) + rom[4] * 16384, hasChrRom = rom[5] > 0;
  const find = (needle, from, to, step) => { outer: for (let o = from; o + needle.length <= to; o += step) { for (let i = 0; i < needle.length; i++) if (rom[o + i] !== needle[i]) continue outer; return o; } return null; };
  if (hasChrRom) { out.source = 'chr-rom'; out.kilobytes = [0, 1, 2, 3].map(k => find(table.subarray(k * 1024, k * 1024 + 1024), chrStart, rom.length, 1024)); out.located = out.kilobytes.filter(v => v !== null).length + '/4'; }
  else {
    out.source = 'chr-ram'; let found = 0, blank = 0; const prgStart = 16 + (rom[6] & 4 ? 512 : 0);
    for (let t = 0; t < 256; t++) { const tile = table.subarray(t * 16, t * 16 + 16); if (tile.every(v => v === tile[0])) { blank++; continue; } if (find(tile, prgStart, chrStart, 1) !== null) found++; }
    out.tilesFoundVerbatimInPrg = found; out.uniformTiles = blank; out.located = found + '/' + (256 - blank) + ' non-uniform tiles verbatim in PRG';
  }
  out.paletteHash = crypto.createHash('sha256').update(cap.palette).digest('hex').slice(0, 16);
  out.backgroundPalette = Array.from(cap.palette.subarray(0, 16), (v, i) => (i % 4 === 0 ? cap.palette[0] : v) & 63); // colour numbers only
  return out;
}
function analyse(result) {
  if (result.blocked) return {engine: result.engine, identity: result.identity || null, blocked: result.blocked};
  const per = defs.map(x => ({id: x.d.id, structural: x.a.state, observed: {}, firstFrame: null, best: null, graphics: null, votes: new Map()}));
  // what the upstream knowledge does not cover: the share of the nametables' distinct 2x2 tile groups (aligned, not
  // uniform) that some translated definition's blocks contain. Low shares mark areas no definition explains.
  const known = new Set(); for (const x of defs) if (x.projections) for (const p of x.projections) for (let y = 0; y + 1 < p.rows; y += 2) for (let xx = 0; xx + 1 < p.cols; xx += 2) known.add(p.tiles[y * p.cols + xx] + ',' + p.tiles[y * p.cols + xx + 1] + ',' + p.tiles[(y + 1) * p.cols + xx] + ',' + p.tiles[(y + 1) * p.cols + xx + 1]);
  const explained = result.captures.map(cap => { const g = D.ring(cap.nametables), seen = new Set(); for (let y = 0; y < 60; y += 2) for (let x = 0; x < 64; x += 2) { const a = g[y * 64 + x], b = g[y * 64 + x + 1], c = g[(y + 1) * 64 + x], d = g[(y + 1) * 64 + x + 1]; if (a === b && b === c && c === d) continue; seen.add(a + ',' + b + ',' + c + ',' + d); }
    let hit = 0; for (const k of seen) if (known.has(k)) hit++; return {frame: cap.frame, groups: seen.size, share: seen.size ? hit / seen.size : null}; }).filter(e => e.groups >= 16);
  result.captures.forEach(cap => defs.forEach((x, i) => {
    if (!x.projections) return;
    for (const m of D.observeScreens(cap.nametables, x.projections)) {
      const o = per[i], prev = o.observed[m.screen];
      if (!prev || m.matched > prev.matched) o.observed[m.screen] = {frame: cap.frame, dx: m.dx, dy: m.dy, compared: m.compared, matched: m.matched, attributesCompared: m.attributesCompared, attributesMatched: m.attributesMatched};
      if (o.firstFrame === null) o.firstFrame = cap.frame;
      if (!o.best || m.matched > o.best.matched) o.best = {screen: m.screen, frame: cap.frame, matched: m.matched, compared: m.compared};
      // graphics: located at every capture that shows a screen; the location seen most often is kept (a single capture
      // can fall in a fade or a bank switch)
      const g = locateGraphics(cap), key = JSON.stringify({table: g.table, source: g.source, kilobytes: g.kilobytes, located: g.located}), v = o.votes.get(key) || {g, n: 0, palettes: new Map()};
      v.n++; const pk = JSON.stringify(g.backgroundPalette); v.palettes.set(pk, (v.palettes.get(pk) || 0) + 1); o.votes.set(key, v);
    }
  }));
  for (const o of per) { const top = [...o.votes.values()].sort((a, b) => b.n - a.n)[0];
    if (top) { const pal = [...top.palettes].filter(([k]) => !JSON.parse(k).every(c => c === 15)).sort((a, b) => b[1] - a[1])[0]; o.graphics = {...top.g, backgroundPalette: pal ? JSON.parse(pal[0]) : top.g.backgroundPalette, captures: top.n, of: [...o.votes.values()].reduce((n, v) => n + v.n, 0)}; }
    delete o.votes; }
  const shares = explained.map(e => e.share), unexplained = explained.filter(e => e.share < 0.5);
  const coverage = {captures: explained.length, meanShare: shares.length ? Math.round(shares.reduce((a, b) => a + b, 0) / shares.length * 1000) / 1000 : null,
    capturesBelowHalf: unexplained.length, firstBelowHalf: unexplained.slice(0, 8).map(e => ({frame: e.frame, groups: e.groups, share: Math.round(e.share * 1000) / 1000}))};
  return {engine: result.engine, identity: result.identity, ms: result.ms, captures: result.captures.length, explained: coverage, definitions: per.map(o => ({...o, observedScreens: Object.keys(o.observed).map(Number).sort((a, b) => a - b)}))};
}
(async () => {
  const report = {format: 'NESForgeCadPortObservation', version: 1, cartridge: {name: path.basename(cart).replace(/\.nes$/i, ''), sha256, bytes: rom.length}, game, title: g.title,
    upstream: C.upstream.commit, script: {name: scriptName, frames: frames.length, every, sha256: crypto.createHash('sha256').update(JSON.stringify(script.steps)).digest('hex').slice(0, 16)},
    structural: defs.map(x => ({id: x.d.id, state: x.a.state, log10Chance: x.a.log10Chance, control: x.a.control})), engines: []};
  for (const e of engines) {
    let r; try { r = e === 'forge' ? await runForge() : runFceux(); } catch (err) { r = {engine: e, blocked: String(err.message || err)}; }
    report.engines.push(analyse(r));
    const a = report.engines.at(-1); console.log(e, a.blocked ? 'BLOCKED ' + a.blocked : a.captures + ' captures, ' + a.ms + ' ms');
    if (!a.blocked) console.log('   explained by translated blocks: mean share', a.explained.meanShare, 'over', a.explained.captures, 'captures;', a.explained.capturesBelowHalf, 'below half');
    if (!a.blocked) for (const d of a.definitions) if (d.observedScreens.length) console.log('  ', d.id.padEnd(34), 'screens', d.observedScreens.join(','), 'first frame', d.firstFrame, '| graphics', JSON.stringify(d.graphics));
  }
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 1) + '\n');
  process.exit(0);
})();
