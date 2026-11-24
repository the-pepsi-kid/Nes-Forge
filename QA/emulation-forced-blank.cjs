'use strict';
// Emulation regression: the vertical scroll when rendering is turned on mid-frame (forced blank).
// The PPU keeps its vertical position in v. The pre-render line copies it from t only while rendering is on; a game that
// keeps rendering off through it (to upload more VRAM, as Battletoads does) and turns it on mid-frame renders from v,
// which its own $2006 writes set. NES Forge's emulator used t there, so a sprite-0 hit placed by v never happened and
// Battletoads hung at the start of Level 1 (NESdev lists it among games sensitive to scrolling and sprite-0 timing).
//
// Three synthetic NROM cartridges, built here (none is stored), each run in NES Forge's emulator and in FCEUX:
// The only opaque background is a column of tiles in nametable rows 4-6 (24 lines); sprite 0 covers lines 15-22.
//   v-row4       rendering off at pre-render; $2006 -> v at row 4; rendering on near line 11: rows 4-6 are drawn on
//                about lines 11-34, under sprite 0 -> hit expected (drawn from t, they would be on lines 32-55: no hit)
//   v-row0       the same with v at row 0: rows 4-6 on about lines 43-66 -> no hit expected (control)
//   t-scroll     rendering stays on; $2005 Y = 20 is copied from t at pre-render: rows 4-6 on lines 12-35 -> hit expected
// The result is read from CPU RAM: $10 frames measured, $11 frames with a sprite-0 hit.
// With the local Battletoads (U) cartridge: NES Forge's emulator reaches Level 1 (it previously waited forever at $863E).
//   node QA/emulation-forced-blank.cjs [editor.html] [out.json] [cartridge folder]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), editor = process.argv[2] || path.join(root, 'NES_Forge.html'), out = process.argv[3], carts = process.argv[4];
const {assemble} = require('./fixtures/al-exp-02/asm6502.cjs'), hash = b => crypto.createHash('sha256').update(b).digest('hex');
const results = [];
async function check(name, fn) { try { const detail = await fn(); results.push({name, ok: true, ...(detail ? {detail} : {})}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, error: String(e && e.stack || e).slice(0, 1200)}); console.log('FAIL', name, '\n ', String(e && e.message || e).slice(0, 400)); } }

// ---------- the test cartridges ----------
function cartridge(variant) {
  const ORG = 0xc000, Z = {MEASURED: 0x10, HITS: 0x11, NMI: 0x12};
  const vHi = 0x20, vLo = variant === 'v-row4' ? 0x80 : 0x00; // nametable 0, coarse Y 4 (or 0), fine Y 0
  const P = [
    {label: 'RESET'}, ['SEI'], ['CLD'], ['LDX', 'imm', 0xff], ['TXS'], ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001],
    ['STA', 'zp', Z.MEASURED], ['STA', 'zp', Z.HITS], ['STA', 'zp', Z.NMI],
    {label: 'VB1'}, ['LDA', 'abs', 0x2002], ['BPL', 'rel', 'VB1'], {label: 'VB2'}, ['LDA', 'abs', 0x2002], ['BPL', 'rel', 'VB2'],
    // nametable 0 cleared to tile 0; tile 1 at rows 4-6, column 10 ($208A, $20AA, $20CA)
    ['LDA', 'imm', 0x20], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'abs', 0x2006], ['LDY', 'imm', 4], ['LDX', 'imm', 0],
    {label: 'CLR'}, ['STA', 'abs', 0x2007], ['DEX'], ['BNE', 'rel', 'CLR'], ['DEY'], ['BNE', 'rel', 'CLR'],
    ...[0x8a, 0xaa, 0xca].flatMap(lo => [['LDA', 'imm', 0x20], ['STA', 'abs', 0x2006], ['LDA', 'imm', lo], ['STA', 'abs', 0x2006], ['LDA', 'imm', 1], ['STA', 'abs', 0x2007]]),
    // palette: backdrop black, colour 1 white for background and sprites
    ['LDA', 'imm', 0x3f], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0x0f], ['STA', 'abs', 0x2007], ['LDA', 'imm', 0x30], ['STA', 'abs', 0x2007],
    ['LDA', 'imm', 0x3f], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0x11], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0x30], ['STA', 'abs', 0x2007],
    // OAM: sprite 0 at y 14 (lines 15-22), tile 1, x 80 (columns 80-87, over tile column 10); the rest off screen
    ['LDA', 'imm', 0], ['STA', 'abs', 0x2003], ['LDA', 'imm', 14], ['STA', 'abs', 0x2004], ['LDA', 'imm', 1], ['STA', 'abs', 0x2004], ['LDA', 'imm', 0], ['STA', 'abs', 0x2004], ['LDA', 'imm', 80], ['STA', 'abs', 0x2004],
    ['LDX', 'imm', 63], {label: 'OAMF'}, ['LDA', 'imm', 0xf0], ['STA', 'abs', 0x2004], ['STA', 'abs', 0x2004], ['STA', 'abs', 0x2004], ['STA', 'abs', 0x2004], ['DEX'], ['BNE', 'rel', 'OAMF'],
    variant === 't-scroll' ? ['LDA', 'imm', 0x18] : ['LDA', 'imm', 0], ['STA', 'abs', 0x2001],
    ['LDA', 'imm', 0x80], ['STA', 'abs', 0x2000], // NMI on (the handler only sets a flag)
    {label: 'FRAME'}, ['LDA', 'zp', Z.NMI], ['BEQ', 'rel', 'FRAME'], ['LDA', 'imm', 0], ['STA', 'zp', Z.NMI],
    ['LDA', 'abs', 0x2002],
    ...(variant === 't-scroll'
      ? [['LDA', 'imm', 0], ['STA', 'abs', 0x2005], ['LDA', 'imm', 20], ['STA', 'abs', 0x2005], ['LDA', 'imm', 0x80], ['STA', 'abs', 0x2000]]
      : [['LDA', 'imm', 0], ['STA', 'abs', 0x2001], // forced blank through the pre-render line
         ['LDA', 'imm', vHi], ['STA', 'abs', 0x2006], ['LDA', 'imm', vLo], ['STA', 'abs', 0x2006], // v
         ['LDA', 'imm', 0], ['STA', 'abs', 0x2005], ['STA', 'abs', 0x2005], ['LDA', 'imm', 0x80], ['STA', 'abs', 0x2000], // t only
         // about 3,500 cycles: the rest of vertical blank and about ten visible lines
         ['LDY', 'imm', 7], {label: 'D1'}, ['LDX', 'imm', 100], {label: 'D2'}, ['DEX'], ['BNE', 'rel', 'D2'], ['DEY'], ['BNE', 'rel', 'D1'],
         ['LDA', 'imm', 0x18], ['STA', 'abs', 0x2001]]),
    // poll the sprite-0 hit flag for the rest of the frame (bounded)
    ['LDX', 'imm', 0], ['LDY', 'imm', 6],
    {label: 'POLL'}, ['LDA', 'abs', 0x2002], ['AND', 'imm', 0x40], ['BNE', 'rel', 'HIT'], ['DEX'], ['BNE', 'rel', 'POLL'], ['DEY'], ['BNE', 'rel', 'POLL'], ['JMP', 'abs', 'COUNT'],
    {label: 'HIT'}, ['INC', 'zp', Z.HITS],
    {label: 'COUNT'}, ['INC', 'zp', Z.MEASURED], ['JMP', 'abs', 'FRAME'],
    {label: 'NMI'}, ['PHA'], ['LDA', 'imm', 1], ['STA', 'zp', Z.NMI], ['PLA'], ['RTI'],
  ];
  const prg = new Uint8Array(16384).fill(0xea), code = assemble(ORG, P); prg.set(code.bytes, 0);
  const L = code.labels; prg.set([L.NMI & 0xff, L.NMI >> 8, L.RESET & 0xff, L.RESET >> 8, L.NMI & 0xff, L.NMI >> 8], 0x3ffa);
  const chr = new Uint8Array(8192); for (let y = 0; y < 8; y++) chr[16 + y] = 0xff; // tile 1: opaque (colour 1)
  const rom = new Uint8Array(16 + 16384 + 8192); rom.set([0x4e, 0x45, 0x53, 0x1a, 1, 1, 0x00, 0]); rom.set(prg, 16); rom.set(chr, 16 + 16384);
  return {rom, nmi: L.NMI};
}
const VARIANTS = {'v-row4': {hit: true}, 'v-row0': {hit: false}, 't-scroll': {hit: true}};
const FRAMES = 30;

(async () => {
  const {load} = require('../app/tests/dom-environment.cjs');
  const forgeRun = async rom => { const a = load(editor), w = a.window; await new Promise(r => setTimeout(r, 30)); w.emuReadJoyState = () => 0;
    assert.ok(w.eval('emuLoadRomData')(w.Uint8Array.from(rom), 'forced-blank.nes', 0)); const run = w.eval('emuRunFrame'), emu = w.eval('emu');
    for (let f = 0; f < FRAMES; f++) run(); return {measured: emu.ram[0x10], hits: emu.ram[0x11]}; };
  let F = null; try { F = require('../tools/agent-lab/independent/fceux.cjs').open(); } catch (_) { F = null; }
  const fceuxRun = (rom, nmi) => { if (!F?.available) return {blocked: F?.reason || 'FCEUX unavailable'};
    const r = F.run({id: 'forced-blank', rom, nmiTarget: nmi, latches: [], checkpoints: [{label: 'end', nmi: FRAMES - 2}], maxFrames: FRAMES + 20}, {timeoutMs: 120000});
    if (!r.ok) return {blocked: r.reason}; const ram = r.captures[0].ram; return {measured: ram[0x10], hits: ram[0x11]}; };
  const rows = {};
  for (const [variant, expect] of Object.entries(VARIANTS)) {
    await check('forced blank: ' + variant + ' (' + (expect.hit ? 'sprite-0 hit expected' : 'no hit expected') + ') in NES Forge\'s emulator and in FCEUX', async () => {
      const {rom, nmi} = cartridge(variant), forge = await forgeRun(rom), fceux = fceuxRun(rom, nmi);
      rows[variant] = {sha256: hash(rom), forge, fceux};
      assert.ok(forge.measured >= 20, 'NES Forge measured ' + forge.measured + ' frames');
      if (expect.hit) assert.ok(forge.hits >= forge.measured - 2, 'NES Forge: hits in ' + forge.hits + ' of ' + forge.measured + ' frames');
      else assert.equal(forge.hits, 0, 'NES Forge: no hit expected, got ' + forge.hits);
      if (!fceux.blocked) { assert.ok(fceux.measured >= 15, 'FCEUX measured ' + fceux.measured); if (expect.hit) assert.ok(fceux.hits >= fceux.measured - 2, 'FCEUX: hits in ' + fceux.hits + ' of ' + fceux.measured); else assert.equal(fceux.hits, 0, 'FCEUX: no hit expected'); }
      return rows[variant];
    });
  }
  // the commercial case, when the local cartridge is available
  const bt = carts && fs.existsSync(path.join(carts, 'Battletoads (U).nes')) ? new Uint8Array(fs.readFileSync(path.join(carts, 'Battletoads (U).nes'))) : null;
  await check('Battletoads (U): NES Forge\'s emulator reaches Level 1 (it waited forever for a sprite-0 hit at $863E)', async () => {
    if (!bt) return {skipped: 'no Battletoads (U) cartridge'};
    const S = JSON.parse(fs.readFileSync(path.join(root, 'tools/cad-port/observation-scripts.json'), 'utf8')), frames = []; for (const [m, n] of S.scripts['late-start'].steps) for (let i = 0; i < n; i++) frames.push(m);
    const a = load(editor), w = a.window; await new Promise(r => setTimeout(r, 30)); let mask = 0; w.emuReadJoyState = () => mask;
    assert.ok(w.eval('emuLoadRomData')(w.Uint8Array.from(bt), 'Battletoads (U).nes', 0)); const run = w.eval('emuRunFrame'), emu = w.eval('emu');
    const vec = 16 + bt[4] * 16384 - 6, nmiTarget = bt[vec] | (bt[vec + 1] << 8); let nmis = 0, waits = 0; w.__t = nmiTarget; w.__n = () => nmis++; w.__w = () => waits++;
    w.eval('(function(){const s=cpuStepRaw;cpuStepRaw=function(...x){const pc=emu.PC&0xffff;if(pc===window.__t)window.__n();else if(pc===0x863e)window.__w();return s.apply(this,x);};})()');
    for (let f = 0; f < 2600; f++) { mask = frames[f]; run(); }
    const n0 = nmis, w0 = waits; for (let f = 2600; f < 3000; f++) { mask = frames[f]; run(); }
    const nmisLate = nmis - n0, waitsLate = waits - w0;
    assert.ok(nmisLate >= 380, 'the game\'s NMI handler ran ' + nmisLate + ' times in frames 2600-3000 (it stopped when the game hung)');
    assert.ok(waitsLate < 400 * 2000, 'the sprite-0 wait loop does not spin for whole frames (' + waitsLate + ' iterations)');
    return {nmisInFrames2600to3000: nmisLate, spriteZeroWaitIterations: waitsLate};
  });
  F?.close?.();
  const failed = results.filter(r => !r.ok);
  const report = {suite: 'emulation-forced-blank', editorSha256: hash(fs.readFileSync(editor)), passed: failed.length === 0, total: results.length, checksPassed: results.length - failed.length, results};
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
  console.log((failed.length ? 'FAILED ' : 'PASSED ') + (results.length - failed.length) + '/' + results.length);
  process.exit(failed.length ? 1 : 0);
})();
