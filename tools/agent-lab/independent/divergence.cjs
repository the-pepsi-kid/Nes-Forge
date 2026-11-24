#!/usr/bin/env node
'use strict';
// Where does NES Forge's emulator first stop agreeing with FCEUX? (Agent Lab, development only.)
// Both engines get the same input by joypad latch (the k-th $4016 strobe receives the k-th mask), and both capture at
// the k-th entry of the game's NMI handler: CPU registers and the 2 KiB of CPU RAM. The first checkpoint whose RAM
// differs outside the stack page (interrupt-frame timing) is the first divergence; the tool reports the differing
// addresses and the state of both engines there.
//   node tools/agent-lab/independent/divergence.cjs --cartridge X.nes --script late-start [--every 1] [--last 3000]
//        [--editor NES_Forge.html] [--out report.json]
// Writes hashes, register values and the differing RAM addresses only (no cartridge bytes).
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const args = process.argv.slice(2), opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const cart = opt('--cartridge'), scriptName = opt('--script', 'idle'), every = +opt('--every', 1), last = +opt('--last', 3000), first = +opt('--first', 1);
const editor = opt('--editor', path.join(__dirname, '../../../NES_Forge.html')), outFile = opt('--out');
if (!cart) { console.error('usage: divergence.cjs --cartridge X.nes [--script name]'); process.exit(2); }
const SCRIPTS = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cad-port/observation-scripts.json'), 'utf8'));
const script = SCRIPTS.scripts[scriptName]; if (!script) { console.error('no script', scriptName); process.exit(2); }
const masks = []; for (const [m, n] of script.steps) for (let i = 0; i < n; i++) masks.push(m);
const rom = new Uint8Array(fs.readFileSync(cart)), H = require('../../../app/src/re/ines-header.js'), h = H.inspect(rom);
const vec = h.headerSize + h.prgSize - 6, nmiTarget = rom[vec] | (rom[vec + 1] << 8);
const points = []; for (let k = first; k <= last; k += every) points.push(k);

async function forge() {
  const {load} = require('../../../app/tests/dom-environment.cjs');
  const a = load(editor), w = a.window; await new Promise(r => setTimeout(r, 50));
  let mask = 0, latches = 0, nmis = 0; const want = new Set(points), caps = new Map();
  w.emuReadJoyState = () => mask;
  if (!w.eval('emuLoadRomData')(w.Uint8Array.from(rom), path.basename(cart), 0)) throw Error('NES Forge refused the cartridge');
  const emu = w.eval('emu');
  w.__dv = {nmiTarget, onNmi() { nmis++; if (!want.has(nmis)) return; want.delete(nmis);
      caps.set(nmis, {frame: emu.frameCount, latches, regs: {a: emu.A, x: emu.X, y: emu.Y, s: emu.SP, pc: emu.PC}, ram: Uint8Array.from(emu.ram), ctrl: emu.ppuCtrl, mask: emu.ppuMask}); },
    onStrobe() { latches++; mask = masks[latches] ?? 0; } };
  mask = masks[0] ?? 0;
  // the NMI handler's entry, and the falling edge of the $4016 strobe (the next mask is presented for the next read)
  w.eval(`(function(){const step=cpuStepRaw;cpuStepRaw=function(...a){if((emu.PC&0xffff)===window.__dv.nmiTarget)window.__dv.onNmi();return step.apply(this,a);};
    const write=cpuWrite;cpuWrite=function(a,v,...r){const falling=(a&0xffff)===0x4016&&!(v&1)&&emu.joyStrobe;const out=write.call(this,a,v,...r);if(falling)window.__dv.onStrobe();return out;};})()`);
  const run = w.eval('emuRunFrame'); let frames = 0; const t0 = Date.now();
  while (want.size && frames < masks.length + last * 2) { run(); frames++; if (frames - Math.max(...[0, ...[...caps.values()].map(c => c.frame)]) > 600) break; }
  return {engine: 'forge', ms: Date.now() - t0, frames, nmis, latches, caps};
}
function fceux() {
  const F = require('./fceux.cjs'), s = F.open(); if (!s.available) return {engine: 'fceux', blocked: s.reason};
  const t0 = Date.now(), r = s.run({id: 'divergence', rom, nmiTarget, latches: masks, checkpoints: points.map(k => ({label: 'k' + k, nmi: k})), maxFrames: masks.length + last * 2}, {timeoutMs: 900000});
  s.close(); if (!r.ok) return {engine: 'fceux', blocked: r.reason};
  const caps = new Map(r.captures.map(c => [c.nmi, {frame: c.frame, latches: c.latches, regs: c.regs, ram: c.ram}]));
  return {engine: 'fceux', identity: s.identity, ms: Date.now() - t0, nmis: r.nmis, latches: r.latches, caps};
}
(async () => {
  const [a, b] = [await forge(), fceux()];
  if (b.blocked) { console.log('FCEUX blocked:', b.blocked); process.exit(3); }
  const report = {format: 'NESForgeDivergence', version: 1, cartridge: {name: path.basename(cart).replace(/\.nes$/i, ''), sha256: crypto.createHash('sha256').update(rom).digest('hex'), header: H.describe(h)},
    script: scriptName, nmiTarget, engines: {forge: {checkpoints: a.caps.size, nmis: a.nmis, latches: a.latches, frames: a.frames}, fceux: {checkpoints: b.caps.size, nmis: b.nmis, latches: b.latches, identity: b.identity}}, first: null, agree: 0};
  for (const k of points) {
    const x = a.caps.get(k), y = b.caps.get(k);
    if (!x || !y) { report.first = {nmi: k, kind: !x && !y ? 'neither engine reached it' : !x ? 'NES Forge never reached this NMI' : 'FCEUX never reached this NMI', forge: x ? {frame: x.frame, latches: x.latches} : null, fceux: y ? {frame: y.frame, latches: y.latches} : null}; break; }
    const diff = []; for (let i = 0; i < 0x800; i++) if (i >> 8 !== 1 && x.ram[i] !== y.ram[i]) diff.push(i);
    if (diff.length || x.latches !== y.latches) { report.first = {nmi: k, kind: diff.length ? 'RAM differs outside the stack page' : 'different number of joypad latches', addresses: diff.slice(0, 64).map(i => ({address: '$' + i.toString(16).padStart(4, '0'), forge: x.ram[i], fceux: y.ram[i]})), differing: diff.length,
      forge: {frame: x.frame, latches: x.latches, regs: x.regs}, fceux: {frame: y.frame, latches: y.latches, regs: y.regs}}; break; }
    report.agree++;
  }
  console.log(JSON.stringify(report, null, 1));
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 1) + '\n');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
