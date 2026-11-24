'use strict';
// AL-EXP-01 synthetic fixture generator. Every byte is original and derived from the seed alone (deterministic), so
// committed cartridges can be regenerated and compared byte for byte.
//
//   node QA/fixtures/al-exp-01/generate.cjs --seed 3 --out DIR [--trainer]   one cartridge + its truth file
//   node QA/fixtures/al-exp-01/generate.cjs --write                           the committed seeds (seeds.json)
//   node QA/fixtures/al-exp-01/generate.cjs --check                           regenerate and compare every committed file
//
// The cartridge is NROM-128 (16 KiB PRG, 8 KiB CHR-ROM). Its program draws one of four 16x15 screens of 2x2 metatiles
// from a metatile table whose layout (interleaved or split arrays), quadrant order, size and position come from the seed,
// next to decoys: an exact copy, a copy in the other quadrant order, a partial copy, a repeated record and a fake palette
// array. Right cycles the three training screens; B shows the withheld screen; Select switches the background palette
// set. The truth file describes all of it and is used only by the independent oracle (oracle.cjs) and by tests that
// need a known effect; discovery never reads it.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {assemble} = require('./asm6502.cjs');
const GENERATOR = 'al-exp-01-fixture/1';
const HERE = __dirname;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

function prng(seed) { let a = seed >>> 0 || 0x9e3779b9; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function generate(seed, {trainer = false} = {}) {
  const rnd = prng(seed), int = n => Math.floor(rnd() * n), pick = list => list[int(list.length)];
  const shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const layout = seed & 1 ? 'split' : 'interleaved', order = (seed >> 1) & 1 ? 'column' : 'row';
  const N = 36 + int(25), stride = layout === 'split' ? N + int(17) : 1;
  const paletteMode = int(2) ? 'high' : 'low', vertical = !!int(2), fullCopy = !!int(2);
  // field index of each quadrant (TL, TR, BL, BR) inside a record (interleaved) or array order (split)
  const field = order === 'row' ? {TL: 0, TR: 1, BL: 2, BR: 3} : {TL: 0, BL: 1, TR: 2, BR: 3};
  const otherField = order === 'row' ? {TL: 0, BL: 1, TR: 2, BR: 3} : {TL: 0, TR: 1, BL: 2, BR: 3};
  const recordStep = layout === 'interleaved' ? 4 : 1, fieldStep = layout === 'interleaved' ? 1 : stride;

  // ---- metatiles: N records of four tiles, three alias pairs ----
  const ids = shuffle([...Array(N).keys()]);
  const holdoutOnly = ids.slice(0, 3), scene2Only = ids.slice(3, 7), common = ids.slice(7);
  const aliasPairs = [[common[0], common[1], true], [common[2], common[3], true], [common[4], common[5], false]];
  const records = [], seen = new Set();
  for (let id = 0; id < N; id++) { let r; do r = [1 + int(255), 1 + int(255), 1 + int(255), 1 + int(255)]; while (seen.has(r.join())); seen.add(r.join()); records.push(r); }
  const palettes = Array.from({length: N}, () => int(4));
  for (const [a, b, same] of aliasPairs) { records[b] = records[a].slice(); if (same) palettes[b] = palettes[a]; else if (palettes[b] === palettes[a]) palettes[b] = (palettes[a] + 1 + int(3)) % 4; }
  const paletteByte = p => paletteMode === 'low' ? (p | (int(64) << 2)) : ((p << 6) | int(64));

  // ---- screens: 16x15 metatile ids; scenes 0-2 train, scene 3 is withheld ----
  const scene = allowed => { const cells = []; for (let i = 0; i < 240; i++) cells.push(i % 16 && rnd() < 0.45 ? cells[i - 1] : pick(allowed)); return cells; };
  const place = (cells, required) => { const spots = shuffle([...Array(240).keys()]); required.forEach((id, k) => { cells[spots[k]] = id; }); };
  const scenes = [scene(common), scene(common), scene([...common, ...scene2Only]), scene([...common, ...holdoutOnly])];
  const half = Math.ceil(common.length / 2);
  place(scenes[0], [...common.slice(0, half), ...aliasPairs.flat().filter(x => typeof x === 'number')]);
  place(scenes[1], common.slice(half));
  place(scenes[2], scene2Only);
  place(scenes[3], [...holdoutOnly, ...aliasPairs.map(p => p[1])]);
  for (const id of scene2Only) for (const s of [0, 1, 3]) if (scenes[s].includes(id)) throw Error('scene-2 ids leaked');

  // ---- PRG layout ----
  const PRG = 0x4000, prg = new Uint8Array(PRG);
  for (let i = 0; i < PRG; i++) prg[i] = int(256);
  const used = [[0x0000, 0x0300], [0x3f00, 0x4000]];
  const alloc = (size, label) => {
    for (let tries = 0; tries < 10000; tries++) {
      const at = 0x0300 + int(0x3f00 - 0x0300 - size);
      if (used.every(([s, e]) => at + size + 8 <= s || at >= e + 8)) { used.push([at, at + size]); return at; }
    }
    throw Error('no room for ' + label);
  };
  const tableBytes = (rs, fs, fld, count, from = 0) => {
    const size = rs === 4 ? 4 * count : 3 * fs + count, out = new Uint8Array(size);
    if (rs === 1) for (let i = 0; i < size; i++) out[i] = int(256); // padding between split arrays is filler
    for (let i = 0; i < count; i++) for (const q of ['TL', 'TR', 'BL', 'BR']) out[i * rs + fld[q] * fs] = records[from + i][['TL', 'TR', 'BL', 'BR'].indexOf(q)];
    return out;
  };
  const regions = {};
  const put = (name, bytes) => { const at = alloc(bytes.length, name); prg.set(bytes, at); regions[name] = {prg: at, length: bytes.length}; return at; };
  const order0 = shuffle(['table', 'paltab', 'maps', 'maplo', 'maphi', 'palettes', 'decoyOrder', 'decoyPartial', 'decoyRepeat', 'decoyPalette', ...(fullCopy ? ['decoyCopy'] : [])]);
  const partialFrom = int(N - 12), partialCount = 10 + int(3), partialStride = layout === 'split' ? partialCount + int(9) : 1;
  const colors = [0x01, 0x02, 0x04, 0x06, 0x07, 0x09, 0x0a, 0x0c, 0x11, 0x12, 0x14, 0x16, 0x17, 0x19, 0x1a, 0x1c, 0x21, 0x22, 0x24, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2c, 0x30, 0x31, 0x33, 0x36, 0x38, 0x3a, 0x3c];
  const paletteSets = new Uint8Array(64);
  for (let set = 0; set < 2; set++) { for (let i = 0; i < 16; i++) paletteSets[set * 32 + i] = i % 4 ? pick(colors) : 0x0f; for (let i = 16; i < 32; i++) paletteSets[set * 32 + i] = paletteSets[set * 32 + i - 16]; }
  for (const name of order0) {
    if (name === 'table') put(name, tableBytes(recordStep, fieldStep, field, N));
    if (name === 'decoyCopy') put(name, tableBytes(recordStep, fieldStep, field, N));
    if (name === 'decoyOrder') put(name, tableBytes(recordStep, fieldStep, otherField, N));
    if (name === 'decoyPartial') put(name, tableBytes(recordStep, layout === 'split' ? partialStride : 1, field, partialCount, partialFrom));
    if (name === 'decoyRepeat') { const r = records[pick(common)], b = new Uint8Array(4 * 24); for (let i = 0; i < 24; i++) b.set(order === 'row' ? r : [r[0], r[2], r[1], r[3]], 4 * i); put(name, b); }
    if (name === 'paltab') put(name, Uint8Array.from(palettes, paletteByte));
    if (name === 'decoyPalette') put(name, Uint8Array.from({length: N}, () => paletteByte(int(4))));
    if (name === 'maps') put(name, Uint8Array.from(scenes.flat()));
    if (name === 'palettes') put(name, paletteSets);
    if (name === 'maplo' || name === 'maphi') put(name, new Uint8Array(4)); // filled once the maps are placed
  }
  const cpu = (name, mirror = 0xc000) => mirror + regions[name].prg;
  for (let s = 0; s < 4; s++) { const a = cpu('maps') + 240 * s; prg[regions.maplo.prg + s] = a & 0xff; prg[regions.maphi.prg + s] = a >> 8; }
  const T = 0x8000 + regions.table.prg; // the table is read through the $8000 mirror, everything else through $C000

  // ---- program ----
  const Z = {SCENE: 0x00, COUNTER: 0x01, NMIFLAG: 0x02, PAD: 0x03, PREV: 0x04, PRESSED: 0x05, PTR: 0x06, ROW: 0x08, PALSET: 0x09, AY: 0x0a, AX: 0x0b, ATTR: 0x0c, TMP: 0x0d};
  const at = q => layout === 'interleaved' ? T + field[q] : T + field[q] * stride;
  const emit = (a, b) => [...(layout === 'interleaved' ? [['ASL', 'acc'], ['ASL', 'acc'], ['TAX']] : [['TAX']]),
    ['LDA', 'absx', at(a)], ['STA', 'abs', 0x2007], ['LDA', 'absx', at(b)], ['STA', 'abs', 0x2007]];
  const getpal = paletteMode === 'low' ? [['AND', 'imm', 3]] : Array(6).fill(['LSR', 'acc']);
  const attrHi = vertical ? 0x2b : 0x27; // a mirror of $23C0 under the cartridge's mirroring
  const P = [
    {label: 'RESET'}, ['SEI'], ['CLD'], ['LDX', 'imm', 0xff], ['TXS'], ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001],
    ['STA', 'zp', Z.SCENE], ['STA', 'zp', Z.PALSET], ['STA', 'zp', Z.NMIFLAG], ['STA', 'zp', Z.PREV], ['STA', 'zp', Z.COUNTER],
    {label: 'DUAL'}, ['LDA', 'abs', 'VW1'], // reads an opcode byte of its own code as data: a dual-use byte for the access-role tests
    {label: 'VW1'}, ['BIT', 'abs', 0x2002], ['BPL', 'rel', 'VW1'],
    {label: 'VW2'}, ['BIT', 'abs', 0x2002], ['BPL', 'rel', 'VW2'],
    ['JSR', 'abs', 'LOADPAL'], ['JSR', 'abs', 'DRAWNT'], ['JSR', 'abs', 'DRAWATTR'], ['JSR', 'abs', 'ENABLE'],
    {label: 'MAIN'}, ['LDA', 'zp', Z.NMIFLAG], ['BEQ', 'rel', 'MAIN'], ['LDA', 'imm', 0], ['STA', 'zp', Z.NMIFLAG], ['JSR', 'abs', 'READPAD'],
    ['LDA', 'zp', Z.PREV], ['EOR', 'imm', 0xff], ['AND', 'zp', Z.PAD], ['STA', 'zp', Z.PRESSED], ['LDA', 'zp', Z.PAD], ['STA', 'zp', Z.PREV],
    ['LDA', 'zp', Z.PRESSED], ['AND', 'imm', 0x01], ['BEQ', 'rel', 'NOR'], ['LDX', 'zp', Z.SCENE], ['INX'], ['CPX', 'imm', 3], ['BCC', 'rel', 'SETR'], ['LDX', 'imm', 0],
    {label: 'SETR'}, ['STX', 'zp', Z.SCENE], ['JSR', 'abs', 'REDRAW'],
    {label: 'NOR'}, ['LDA', 'zp', Z.PRESSED], ['AND', 'imm', 0x40], ['BEQ', 'rel', 'NOB'], ['LDA', 'imm', 3], ['STA', 'zp', Z.SCENE], ['JSR', 'abs', 'REDRAW'],
    {label: 'NOB'}, ['LDA', 'zp', Z.PRESSED], ['AND', 'imm', 0x20], ['BEQ', 'rel', 'NOS'], ['LDA', 'zp', Z.PALSET], ['EOR', 'imm', 1], ['STA', 'zp', Z.PALSET], ['JSR', 'abs', 'REPAL'],
    {label: 'NOS'}, ['JMP', 'abs', 'MAIN'],
    {label: 'NMI'}, ['PHA'], ['LDA', 'imm', 1], ['STA', 'zp', Z.NMIFLAG], {label: 'NMI_INC'}, ['INC', 'zp', Z.COUNTER], ['PLA'], ['RTI'],
    {label: 'IRQ'}, ['RTI'],
    {label: 'READPAD'}, ['LDA', 'imm', 1], ['STA', 'abs', 0x4016], ['LDA', 'imm', 0], ['STA', 'abs', 0x4016], ['LDX', 'imm', 8],
    {label: 'RPL'}, ['LDA', 'abs', 0x4016], ['LSR', 'acc'], ['ROL', 'zp', Z.PAD], ['DEX'], ['BNE', 'rel', 'RPL'], ['RTS'],
    {label: 'REDRAW'}, ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001], ['JSR', 'abs', 'DRAWNT'], ['JSR', 'abs', 'DRAWATTR'], ['JSR', 'abs', 'ENABLE'], ['RTS'],
    {label: 'REPAL'}, ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001], ['JSR', 'abs', 'LOADPAL'], ['JSR', 'abs', 'ENABLE'], ['RTS'],
    {label: 'ENABLE'}, ['LDA', 'abs', 0x2002], ['LDA', 'imm', 0], ['STA', 'abs', 0x2005], ['STA', 'abs', 0x2005], ['LDA', 'imm', 0x80], ['STA', 'abs', 0x2000], {label: 'ENABLE_MASK'}, ['LDA', 'imm', 0x0a], ['STA', 'abs', 0x2001], ['RTS'],
    {label: 'LOADPAL'}, ['LDA', 'abs', 0x2002], ['LDA', 'imm', 0x3f], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'abs', 0x2006],
    ['LDA', 'zp', Z.PALSET], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['TAX'], ['LDY', 'imm', 32],
    {label: 'LPL'}, ['LDA', 'absx', cpu('palettes')], ['STA', 'abs', 0x2007], ['INX'], ['DEY'], ['BNE', 'rel', 'LPL'], ['RTS'],
    {label: 'DRAWNT'}, ['LDX', 'zp', Z.SCENE], ['LDA', 'absx', cpu('maplo')], ['STA', 'zp', Z.PTR], ['LDA', 'absx', cpu('maphi')], ['STA', 'zp', Z.PTR + 1],
    ['LDA', 'abs', 0x2002], ['LDA', 'imm', 0x20], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'zp', Z.ROW],
    {label: 'ROWL'}, ['LDY', 'imm', 0],
    {label: 'TOPL'}, ['LDA', 'indy', Z.PTR], ...emit('TL', 'TR'), ['INY'], ['CPY', 'imm', 16], ['BNE', 'rel', 'TOPL'], ['LDY', 'imm', 0],
    {label: 'BOTL'}, ['LDA', 'indy', Z.PTR], ...emit('BL', 'BR'), ['INY'], ['CPY', 'imm', 16], ['BNE', 'rel', 'BOTL'],
    ['LDA', 'zp', Z.PTR], ['CLC'], ['ADC', 'imm', 16], ['STA', 'zp', Z.PTR], ['LDA', 'zp', Z.PTR + 1], ['ADC', 'imm', 0], ['STA', 'zp', Z.PTR + 1],
    ['INC', 'zp', Z.ROW], ['LDA', 'zp', Z.ROW], ['CMP', 'imm', 15], ['BNE', 'rel', 'ROWL'], ['RTS'],
    {label: 'DRAWATTR'}, ['LDX', 'zp', Z.SCENE], ['LDA', 'absx', cpu('maplo')], ['STA', 'zp', Z.PTR], ['LDA', 'absx', cpu('maphi')], ['STA', 'zp', Z.PTR + 1],
    ['LDA', 'abs', 0x2002], ['LDA', 'imm', attrHi], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0xc0], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'zp', Z.AY],
    {label: 'AYL'}, ['LDA', 'imm', 0], ['STA', 'zp', Z.AX],
    {label: 'AXL'}, ['LDA', 'zp', Z.AY], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['STA', 'zp', Z.TMP], ['LDA', 'zp', Z.AX], ['ASL', 'acc'], ['CLC'], ['ADC', 'zp', Z.TMP], ['TAY'],
    ['LDA', 'imm', 0], ['STA', 'zp', Z.ATTR], ['LDA', 'zp', Z.AY], ['CMP', 'imm', 7], ['BEQ', 'rel', 'HIGH'],
    ['TYA'], ['CLC'], ['ADC', 'imm', 17], ['TAY'], ['LDA', 'indy', Z.PTR], ['JSR', 'abs', 'GETPAL'], ['STA', 'zp', Z.ATTR], ['ASL', 'zp', Z.ATTR], ['ASL', 'zp', Z.ATTR],
    ['DEY'], ['LDA', 'indy', Z.PTR], ['JSR', 'abs', 'GETPAL'], ['ORA', 'zp', Z.ATTR], ['STA', 'zp', Z.ATTR], ['TYA'], ['SEC'], ['SBC', 'imm', 16], ['TAY'],
    {label: 'HIGH'}, ['ASL', 'zp', Z.ATTR], ['ASL', 'zp', Z.ATTR], ['INY'], ['LDA', 'indy', Z.PTR], ['JSR', 'abs', 'GETPAL'], ['ORA', 'zp', Z.ATTR], ['STA', 'zp', Z.ATTR],
    ['ASL', 'zp', Z.ATTR], ['ASL', 'zp', Z.ATTR], ['DEY'], ['LDA', 'indy', Z.PTR], ['JSR', 'abs', 'GETPAL'], ['ORA', 'zp', Z.ATTR], ['STA', 'abs', 0x2007],
    ['INC', 'zp', Z.AX], ['LDA', 'zp', Z.AX], ['CMP', 'imm', 8], ['BNE', 'rel', 'AXL'], ['INC', 'zp', Z.AY], ['LDA', 'zp', Z.AY], ['CMP', 'imm', 8], ['BNE', 'rel', 'AYL'], ['RTS'],
    {label: 'GETPAL'}, ['TAX'], ['LDA', 'absx', cpu('paltab')], ...getpal, ['RTS'],
  ];
  const program = assemble(0xc000, P);
  if (program.bytes.length > 0x300) throw Error('program too large: ' + program.bytes.length);
  prg.set(program.bytes, 0);
  const L = program.labels;
  prg.set([L.NMI & 0xff, L.NMI >> 8, L.RESET & 0xff, L.RESET >> 8, L.IRQ & 0xff, L.IRQ >> 8], 0x3ffa);
  const marker = Buffer.from('NESFORGE-SYNTHETIC/1 ' + GENERATOR + ' seed=' + seed + ' (original synthetic test cartridge; Apache-2.0)\0', 'latin1');
  prg.set(marker, 0x3f00);

  // ---- CHR: 255 original procedural tiles, tile 0 blank ----
  const chr = new Uint8Array(8192);
  for (let t = 1; t < 256; t++) for (let i = 0; i < 16; i++) chr[t * 16 + i] = int(256);

  // ---- iNES file ----
  const trainerBytes = trainer ? 512 : 0, header = new Uint8Array(16);
  header.set([0x4e, 0x45, 0x53, 0x1a, 1, 1, (vertical ? 1 : 0) | (trainer ? 4 : 0), 0]);
  const rom = new Uint8Array(16 + trainerBytes + PRG + 8192); rom.set(header, 0);
  if (trainer) for (let i = 0; i < 512; i++) rom[16 + i] = int(256);
  const prgStart = 16 + trainerBytes; rom.set(prg, prgStart); rom.set(chr, prgStart + PRG);
  const phys = name => prgStart + regions[name].prg, pcPhys = cpuAddr => prgStart + ((cpuAddr - 0x8000) & 0x3fff);

  // ---- expected screens, computed from the data above (no emulation) ----
  const expected = scenes.map(map => {
    const nametable = new Uint8Array(960), attributes = new Uint8Array(64);
    for (let my = 0; my < 15; my++) for (let mx = 0; mx < 16; mx++) { const r = records[map[my * 16 + mx]]; nametable[2 * my * 32 + 2 * mx] = r[0]; nametable[2 * my * 32 + 2 * mx + 1] = r[1]; nametable[(2 * my + 1) * 32 + 2 * mx] = r[2]; nametable[(2 * my + 1) * 32 + 2 * mx + 1] = r[3]; }
    for (let ay = 0; ay < 8; ay++) for (let ax = 0; ax < 8; ax++) { const p = (my, mx) => my < 15 ? palettes[map[my * 16 + mx]] : 0; attributes[ay * 8 + ax] = p(2 * ay, 2 * ax) | p(2 * ay, 2 * ax + 1) << 2 | p(2 * ay + 1, 2 * ax) << 4 | p(2 * ay + 1, 2 * ax + 1) << 6; }
    return {ids: map.slice(), nametable: Buffer.from(nametable).toString('hex'), attributes: Buffer.from(attributes).toString('hex')};
  });
  const counterOperand = pcPhys(L.NMI_INC) + 1, vw1 = pcPhys(L.VW1);
  const truth = {
    format: 'NESForgeSyntheticFixtureTruth', version: 1, generator: GENERATOR, seed, trainer,
    rom: {sha256: sha(rom), byteLength: rom.length}, prgStart, mirroring: vertical ? 'vertical' : 'horizontal', attributeWriteAddress: attrHi << 8 | 0xc0,
    table: {layout, order, count: N, stride: layout === 'split' ? stride : null, recordStep, fieldStep, physicalBase: phys('table'), cpuBase: T, field},
    palette: {mode: paletteMode, physicalBase: phys('paltab'), cpuBase: cpu('paltab')},
    records, palettes, aliases: aliasPairs.map(([a, b, same]) => ({ids: [a, b], samePalette: same})),
    ids: {common: common.slice().sort((a, b) => a - b), scene2Only: scene2Only.slice().sort((a, b) => a - b), holdoutOnly: holdoutOnly.slice().sort((a, b) => a - b)},
    regions: Object.fromEntries(Object.entries(regions).map(([k, v]) => [k, {physical: prgStart + v.prg, length: v.length}])),
    code: {physical: prgStart, length: program.bytes.length, labels: Object.fromEntries(Object.entries(L).map(([k, v]) => [k, pcPhys(v)])), instructions: program.instructions.map(([pc, n]) => [pcPhys(pc), n]), dualUse: [pcPhys(L.VW1)]},
    marker: {physical: prgStart + 0x3f00},
    // known-effect patches for runner tests (never for discovery)
    patches: {
      hang: [{offset: vw1, expected: 0x2c, value: 0x4c}, {offset: vw1 + 1, expected: 0x02, value: L.VW1 & 0xff}, {offset: vw1 + 2, expected: 0x20, value: L.VW1 >> 8}],
      counterOnly: [{offset: counterOperand, expected: Z.COUNTER, value: 0x0e}],
      renderingOff: [{offset: pcPhys(L.ENABLE_MASK) + 1, expected: 0x0a, value: 0x00}],
      paletteOnly: [{offset: phys('palettes') + 1, expected: paletteSets[1], value: paletteSets[1] === 0x30 ? 0x16 : 0x30}],
      scene2Record: (() => { const id = scene2Only[0], q = 'TL', off = phys('table') + id * recordStep + field[q] * fieldStep; return [{offset: off, expected: records[id][0], value: records[id][0] === 0xff ? 0xfe : records[id][0] + 1}]; })(),
    },
    inputs: {
      training: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['Right']}, {frames: 56, buttons: []}, {frames: 4, buttons: ['Right']}, {frames: 56, buttons: []}],
        captures: [{label: 'scene-0', frame: 60, scene: 0}, {label: 'scene-1', frame: 120, scene: 1}, {label: 'scene-2', frame: 180, scene: 2}]},
      holdout: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['B']}, {frames: 56, buttons: []}], captures: [{label: 'holdout', frame: 120, scene: 3}]},
      palette: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['Select']}, {frames: 56, buttons: []}], captures: [{label: 'palette-set-1', frame: 120, scene: 0}]},
    },
    expected,
  };
  return {rom, truth};
}

const SEEDS = path.join(HERE, 'seeds.json');
function committed() { return JSON.parse(fs.readFileSync(SEEDS, 'utf8')); }
function files(entry) { return {rom: path.join(HERE, 'roms', entry.file), truth: path.join(HERE, 'truth', entry.file.replace(/\.nes$/, '.truth.json'))}; }
const truthText = truth => JSON.stringify(truth, null, 1) + '\n';
// The editor's experimental panel runs one committed fixture: its bytes and its input design (never its truth file).
const DEMO = path.join(HERE, '../../../app/src/re/experiment-demo-fixture.js');
function demoModule(seed) {
  const {rom, truth} = generate(seed), design = k => ({steps: truth.inputs[k].steps, captures: truth.inputs[k].captures.map(c => ({label: c.label, frame: c.frame}))});
  return '/* Generated by QA/fixtures/al-exp-01/generate.cjs --write; do not edit. An original synthetic test cartridge for the\n' +
    ' * AL-EXP-01 experimental panel (fixture seed ' + seed + ', ' + GENERATOR + '; Apache-2.0). Its input design only: the fixture\n' +
    ' * answers live outside the editor, with the acceptance suite\'s oracle. */\n' +
    'window.ForgeExperimentDemoFixture=Object.freeze(' + JSON.stringify({generator: GENERATOR, seed, sha256: truth.rom.sha256, byteLength: rom.length,
      base64: Buffer.from(rom).toString('base64'), training: design('training'), holdout: design('holdout')}) + ');\n';
}

if (require.main === module) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('--check') || args.includes('--write')) {
    const write = args.includes('--write'), problems = [];
    for (const entry of committed().fixtures) {
      const {rom, truth} = generate(entry.seed, {trainer: !!entry.trainer}), f = files(entry);
      if (write) { fs.mkdirSync(path.dirname(f.rom), {recursive: true}); fs.mkdirSync(path.dirname(f.truth), {recursive: true}); fs.writeFileSync(f.rom, rom); fs.writeFileSync(f.truth, truthText(truth)); console.log(entry.file, truth.rom.sha256); continue; }
      if (sha(rom) !== entry.sha256) problems.push(entry.file + ': regenerated SHA-256 ' + sha(rom) + ' differs from the pinned ' + entry.sha256);
      if (!fs.existsSync(f.rom) || !Buffer.from(rom).equals(fs.readFileSync(f.rom))) problems.push(entry.file + ': committed cartridge differs from the regenerated bytes');
      if (!fs.existsSync(f.truth) || fs.readFileSync(f.truth, 'utf8') !== truthText(truth)) problems.push(entry.file + ': committed truth file differs');
    }
    const demo = demoModule(committed().demoSeed);
    if (write) { fs.writeFileSync(DEMO, demo); console.log('demo module', path.relative(process.cwd(), DEMO)); }
    else if (!fs.existsSync(DEMO) || fs.readFileSync(DEMO, 'utf8') !== demo) problems.push('app/src/re/experiment-demo-fixture.js differs from the regenerated demo module');
    if (!write) { console.log(problems.length ? problems.join('\n') : 'all committed fixtures regenerate byte for byte'); process.exit(problems.length ? 1 : 0); }
  } else {
    const seed = Number(opt('--seed')), out = opt('--out');
    if (!Number.isSafeInteger(seed) || !out) { console.error('usage: generate.cjs --seed N --out DIR [--trainer] | --write | --check'); process.exit(2); }
    const {rom, truth} = generate(seed, {trainer: args.includes('--trainer')});
    fs.mkdirSync(out, {recursive: true}); fs.writeFileSync(path.join(out, 'seed-' + seed + '.nes'), rom); fs.writeFileSync(path.join(out, 'seed-' + seed + '.truth.json'), truthText(truth));
    console.log(JSON.stringify({seed, sha256: truth.rom.sha256, layout: truth.table.layout, order: truth.table.order, count: truth.table.count}));
  }
}
module.exports = {generate, GENERATOR, committed, files, truthText, demoModule};
