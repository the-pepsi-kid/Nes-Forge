'use strict';
// AL-EXP-02 randomized synthetic fixture generator. Every byte is original and derived from (seed, scenario) alone, so
// committed cartridges regenerate byte for byte. Same cartridge family as AL-EXP-01 (NROM-128, one of four 16x15
// screens of 2x2 metatiles; Right cycles three training screens, B shows the withheld screen, Select switches the
// palette set), with much more variation and adversarial scenarios:
//
//   placement   table, palette array, maps, code and decoys at random PRG offsets; table, data and code read through
//               the $8000 or $C000 mirror; the table read with X or Y; zero-page variables at random addresses
//   content     record count, tiles, palettes, alias groups, screen arrangement, decoy set, unused-data styles
//   scenarios   standard, perfect-decoy (an exact copy never read), read-unrelated (a table the CPU reads every frame
//               that holds a partial copy of the records but has nothing to do with the screen), palette-aliases,
//               identical-aliases, unobserved-records, insufficient-observations (training shows two records),
//               indirect-numbering (records reached through a computed pointer from a shifted index: no instruction
//               names record 0), confounded-guard (a checksum over the table at boot; a mismatch switches drawing to a
//               backup copy, so changing the table changes the program's path)
//
// The cartridge's marker is the gate prefix plus random filler: it carries no seed, scenario or generator name, so
// nothing inside the cartridge identifies how to regenerate it. The truth file describes everything and is used only
// by the oracle (oracle.cjs) and by tests that need a known effect; discovery never reads it.
//
//   node QA/fixtures/al-exp-02/generate.cjs --seed 3 --scenario standard --out DIR
//   node QA/fixtures/al-exp-02/generate.cjs --write      the committed fixtures (seeds.json)
//   node QA/fixtures/al-exp-02/generate.cjs --check      regenerate and compare every committed file
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {assemble} = require('./asm6502.cjs');
const GENERATOR = 'al-exp-02-fixture/1';
const HERE = __dirname;
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const SCENARIOS = Object.freeze(['standard', 'perfect-decoy', 'read-unrelated', 'palette-aliases', 'identical-aliases', 'unobserved-records', 'insufficient-observations', 'indirect-numbering', 'confounded-guard']);
const EXPECT = Object.freeze({standard: 'candidate', 'perfect-decoy': 'candidate', 'read-unrelated': 'candidate', 'palette-aliases': 'candidate', 'identical-aliases': 'candidate', 'unobserved-records': 'candidate',
  'insufficient-observations': 'insufficient-evidence', 'indirect-numbering': 'ambiguous', 'confounded-guard': 'inconclusive'});
const QUADS = ['TL', 'TR', 'BL', 'BR'];

function prng(seed) { let a = seed >>> 0 || 0x9e3779b9; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function scenarioSalt(name) { let h = 0x811c9dc5; for (const c of name) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; }

function generate(seed, scenario, {relocate = 0} = {}) {
  if (!SCENARIOS.includes(scenario)) throw Error('unknown scenario ' + scenario);
  const rnd = prng((seed ^ scenarioSalt(scenario)) >>> 0), int = n => Math.floor(rnd() * n), pick = list => list[int(list.length)];
  const shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const guard = scenario === 'confounded-guard', indirect = scenario === 'indirect-numbering', unrelatedTable = scenario === 'read-unrelated';
  const layout = guard || indirect ? 'interleaved' : int(2) ? 'split' : 'interleaved', order = int(2) ? 'column' : 'row';
  const drawn = scenario === 'unobserved-records' ? 48 + int(33) : guard ? 28 + int(29) : 28 + int(53);
  // an interleaved table read with absolute indexing reaches 64 records: the program forms id*4 in an 8-bit register
  const N = layout === 'interleaved' && !indirect ? Math.min(drawn, 64) : drawn;
  const stride = layout === 'split' ? N + int(25) : 1;
  const paletteMode = int(2) ? 'high' : 'low', vertical = !!int(2);
  const indexReg = indirect ? null : int(2) ? 'y' : 'x', K = indirect ? 1 + int(8) : 0;
  const mirror = () => int(2) ? 0x8000 : 0xc000, tableMirror = mirror(), dataMirror = mirror(), codeMirror = mirror();
  const field = order === 'row' ? {TL: 0, TR: 1, BL: 2, BR: 3} : {TL: 0, BL: 1, TR: 2, BR: 3};
  const otherField = order === 'row' ? {TL: 0, BL: 1, TR: 2, BR: 3} : {TL: 0, TR: 1, BL: 2, BR: 3};
  const recordStep = layout === 'interleaved' ? 4 : 1, fieldStep = layout === 'interleaved' ? 1 : stride;

  // ---- records, palettes, alias groups ----
  const records = [], seen = new Set();
  for (let id = 0; id < N; id++) { let r; do r = [1 + int(255), 1 + int(255), 1 + int(255), 1 + int(255)]; while (seen.has(r.join())); seen.add(r.join()); records.push(r); }
  const palettes = Array.from({length: N}, () => int(4));
  const usable = shuffle([...Array(N).keys()].filter(id => id >= K)); // indirect: ids below K are never drawn
  let holdoutOnly, rest = usable.slice();
  if (scenario === 'unobserved-records') { const top = usable.slice().sort((a, b) => b - a).slice(0, 3), more = usable.filter(id => !top.includes(id)).slice(0, Math.round(0.35 * usable.length) - 3); holdoutOnly = [...top, ...more]; }
  else holdoutOnly = usable.slice(0, 2 + int(4));
  rest = rest.filter(id => !holdoutOnly.includes(id));
  const scene2Only = rest.slice(0, 3 + int(3)), common = rest.slice(scene2Only.length);
  const groupCount = scenario === 'palette-aliases' ? 3 + int(3) : scenario === 'identical-aliases' ? 3 + int(2) : scenario === 'insufficient-observations' ? int(2) : int(4);
  const aliasGroups = [];
  let pool = shuffle(common);
  for (let g = 0; g < groupCount && pool.length >= 6; g++) {
    const size = 2 + (int(3) === 0 ? 1 : 0), ids = pool.slice(0, size); pool = pool.slice(size);
    const samePalette = scenario === 'palette-aliases' ? false : scenario === 'identical-aliases' ? true : !!int(2);
    for (const id of ids.slice(1)) { records[id] = records[ids[0]].slice(); palettes[id] = samePalette ? palettes[ids[0]] : palettes[id]; }
    if (!samePalette) { const used = new Set([palettes[ids[0]]]); for (const id of ids.slice(1)) { if (used.has(palettes[id])) palettes[id] = [0, 1, 2, 3].find(p => !used.has(p)); used.add(palettes[id]); } }
    aliasGroups.push({ids: ids.slice(), samePalette});
  }
  const aliasMembers = aliasGroups.flatMap(g => g.ids);

  // ---- screens: 16x15 metatile ids; scenes 0-2 train, scene 3 is withheld ----
  const scene = allowed => { const cells = []; for (let i = 0; i < 240; i++) cells.push(i % 16 && rnd() < 0.45 ? cells[i - 1] : pick(allowed)); return cells; };
  const place = (cells, required) => { const spots = shuffle([...Array(240).keys()]); required.forEach((id, k) => { cells[spots[k]] = id; }); };
  let scenes, trainingIds;
  if (scenario === 'insufficient-observations') {
    const [a, b] = common.filter(id => !aliasMembers.includes(id)).slice(0, 2);
    scenes = [Array(240).fill(a), Array(240).fill(b), scene([a, b]), scene([...common, ...holdoutOnly])];
    place(scenes[3], holdoutOnly); trainingIds = [a, b];
  } else {
    const half = Math.ceil(common.length / 2);
    scenes = [scene(common), scene(common), scene([...common, ...scene2Only]), scene([...common, ...holdoutOnly])];
    place(scenes[0], [...common.slice(0, half), ...aliasGroups.map(g => g.ids[0])]);
    place(scenes[1], common.slice(half));
    place(scenes[2], scene2Only);
    place(scenes[3], [...holdoutOnly, ...aliasGroups.flatMap(g => scenario === 'identical-aliases' ? g.ids : g.ids.slice(1))]);
    trainingIds = [...new Set(scenes.slice(0, 3).flat())];
  }
  for (const id of holdoutOnly) for (const s of [0, 1, 2]) if (scenes[s].includes(id)) throw Error('a withheld-only id leaked into training');
  for (const id of scene2Only) for (const s of [0, 1, 3]) if (scenario !== 'insufficient-observations' && scenes[s].includes(id)) throw Error('a scene-2 id leaked');
  const mapValue = id => id - K;

  // ---- PRG: unused data in mixed styles, then regions at random offsets ----
  const PRG = 0x4000, prg = new Uint8Array(PRG), styles = [];
  for (let chunk = 0; chunk < 16; chunk++) {
    const style = pick(['random', 'random', 'zero', 'ramp', 'records']); styles.push(style);
    const base = chunk * 1024, rec = [int(256), int(256), int(256), int(256)];
    for (let i = 0; i < 1024; i++) prg[base + i] = style === 'random' ? int(256) : style === 'zero' ? 0 : style === 'ramp' ? (i * 3 + chunk) & 0xff : (i % 16 < 4 ? rec[i % 4] : int(256));
  }
  const used = [[0x3f00, 0x4000]];
  const free = (at, size) => at >= 0 && at + size <= 0x3f00 && used.every(([s, e]) => at + size + 8 <= s || at >= e + 8);
  const alloc = (size, label) => { for (let tries = 0; tries < 20000; tries++) { const at = int(0x3f00 - size); if (free(at, size)) { used.push([at, at + size]); return at; } } throw Error('no room for ' + label); };
  const tableBytes = (fld, count, from = 0, stepOverride) => {
    const fs2 = stepOverride || fieldStep, size = recordStep === 4 ? 4 * count : 3 * fs2 + count, out = new Uint8Array(size);
    if (recordStep === 1) for (let i = 0; i < size; i++) out[i] = int(256);
    for (let i = 0; i < count; i++) for (const q of QUADS) out[i * recordStep + fld[q] * fs2] = records[from + i][QUADS.indexOf(q)];
    return out;
  };
  const regions = {};
  const put = (name, bytes, kind) => { const at = alloc(bytes.length, name); prg.set(bytes, at); regions[name] = {prg: at, length: bytes.length, kind}; return at; };
  const colors = [0x01, 0x02, 0x04, 0x06, 0x07, 0x09, 0x0a, 0x0c, 0x11, 0x12, 0x14, 0x16, 0x17, 0x19, 0x1a, 0x1c, 0x21, 0x22, 0x24, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2c, 0x30, 0x31, 0x33, 0x36, 0x38, 0x3a, 0x3c];
  const paletteSets = new Uint8Array(64);
  for (let set = 0; set < 2; set++) { for (let i = 0; i < 16; i++) paletteSets[set * 32 + i] = i % 4 ? pick(colors) : 0x0f; for (let i = 16; i < 32; i++) paletteSets[set * 32 + i] = paletteSets[set * 32 + i - 16]; }
  const paletteByte = p => paletteMode === 'low' ? (p | (int(64) << 2)) : ((p << 6) | int(64));
  const decoys = [];
  const want = name => rnd() < 0.6 || (name === 'decoyCopy' && scenario === 'perfect-decoy');
  const names = shuffle(['table', 'paltab', 'maps', 'maplo', 'maphi', 'palettes', 'decoyCopy', 'decoyOrder', 'decoyPartial', 'decoyRepeat', 'decoyPalette', ...(guard ? ['backup', 'checksum'] : []), ...(unrelatedTable ? ['unrelated'] : [])]);
  const partialFrom = int(N - 12), partialCount = 10 + int(3), partialStride = layout === 'split' ? partialCount + int(9) : undefined;
  let unrelatedCopied = [];
  for (const name of names) {
    if (name === 'table') put(name, tableBytes(field, N), 'table');
    else if (name === 'backup') put(name, tableBytes(field, N), 'backup copy (read only after a checksum mismatch)');
    else if (name === 'checksum') put(name, new Uint8Array([0]), 'checksum byte');
    else if (name === 'paltab') put(name, Uint8Array.from({length: N - K}, (_, v) => paletteByte(palettes[v + K])), 'palette array');
    else if (name === 'maps') put(name, Uint8Array.from(scenes.flat().map(mapValue)), 'screen maps');
    else if (name === 'maplo' || name === 'maphi') put(name, new Uint8Array(4), 'map pointers');
    else if (name === 'palettes') put(name, paletteSets, 'background palettes');
    else if (name === 'unrelated') {
      const b = new Uint8Array(128); for (let i = 0; i < 128; i++) b[i] = int(256);
      unrelatedCopied = shuffle([...Array(N).keys()]).slice(0, Math.max(6, Math.round(N / 4)) > 32 ? 32 : Math.max(6, Math.round(N / 4)));
      unrelatedCopied.forEach((id, k) => { const r = records[id], rr = QUADS.map(q => r[QUADS.indexOf(q)]); for (const q of QUADS) b[4 * k + field[q]] = rr[QUADS.indexOf(q)]; });
      put(name, b, 'unrelated table read every frame (holds a partial copy of the records)');
    } else if (want(name)) {
      if (name === 'decoyCopy') put(name, tableBytes(field, N), 'decoy: exact copy, never read');
      if (name === 'decoyOrder') put(name, tableBytes(otherField, N), 'decoy: other quadrant order, never read');
      if (name === 'decoyPartial') put(name, tableBytes(field, partialCount, partialFrom, partialStride), 'decoy: partial copy, never read');
      if (name === 'decoyRepeat') { const r = records[pick(common)], b = new Uint8Array(4 * 24); for (let i = 0; i < 24; i++) b.set(order === 'row' ? r : [r[0], r[2], r[1], r[3]], 4 * i); put(name, b, 'decoy: one record repeated, never read'); }
      if (name === 'decoyPalette') put(name, Uint8Array.from({length: N}, () => paletteByte(int(4))), 'decoy: palette-like array, never read');
      if (regions[name]) decoys.push(name);
    }
  }
  if (relocate) { const r = regions.table, to = r.prg + relocate; used.splice(used.findIndex(([s]) => s === r.prg), 1); if (!free(to, r.length)) throw Error('cannot relocate the table by ' + relocate); const bytes = prg.slice(r.prg, r.prg + r.length); prg.fill(0, r.prg, r.prg + r.length); prg.set(bytes, to); r.prg = to; used.push([to, to + r.length]); }
  if (guard) { let sum = 0; for (let i = 0; i < regions.table.length; i++) sum = (sum + prg[regions.table.prg + i]) & 0xff; prg[regions.checksum.prg] = sum; }
  const cpu = (name, m = dataMirror) => m + regions[name].prg;
  for (let s = 0; s < 4; s++) { const a = cpu('maps') + 240 * s; prg[regions.maplo.prg + s] = a & 0xff; prg[regions.maphi.prg + s] = a >> 8; }
  const T = tableMirror + regions.table.prg, TB = guard ? tableMirror + regions.backup.prg : 0;

  // ---- zero-page variables at random addresses ----
  const zp = shuffle([...Array(0xe0).keys()].map(i => 0x10 + i));
  const Z = {}; for (const name of ['PTR', 'P2']) { const at = zp.find(a => a < 0xef && zp.includes(a + 1) && !Object.values(Z).some(v => v === a || v === a + 1 || v + 1 === a)); Z[name] = at; zp.splice(zp.indexOf(at), 1); zp.splice(zp.indexOf(at + 1), 1); }
  for (const name of ['SCENE', 'COUNTER', 'NMIFLAG', 'PAD', 'PREV', 'PRESSED', 'ROW', 'PALSET', 'AY', 'AX', 'ATTR', 'TMP', 'COL', 'SUM', 'USEB', 'UIDX', 'UCNT', 'SINK']) Z[name] = zp.shift();

  // ---- program ----
  const at = (base, q) => layout === 'interleaved' ? base + field[q] : base + field[q] * stride;
  const cell = (base, a, b) => {
    if (indirect) return [['STY', 'zp', Z.COL], ['CLC'], ['ADC', 'imm', K], ['STA', 'zp', Z.TMP], ['LDA', 'imm', 0], ['STA', 'zp', Z.P2 + 1], ['LDA', 'zp', Z.TMP],
      ['ASL', 'acc'], ['ROL', 'zp', Z.P2 + 1], ['ASL', 'acc'], ['ROL', 'zp', Z.P2 + 1], ['CLC'], ['ADC', 'imm', base & 0xff], ['STA', 'zp', Z.P2], ['LDA', 'zp', Z.P2 + 1], ['ADC', 'imm', base >> 8], ['STA', 'zp', Z.P2 + 1],
      ['LDY', 'imm', field[a]], ['LDA', 'indy', Z.P2], ['STA', 'abs', 0x2007], ['LDY', 'imm', field[b]], ['LDA', 'indy', Z.P2], ['STA', 'abs', 0x2007], ['LDY', 'zp', Z.COL]];
    const scale = layout === 'interleaved' ? [['ASL', 'acc'], ['ASL', 'acc']] : [];
    if (indexReg === 'x') return [...scale, ['TAX'], ['LDA', 'absx', at(base, a)], ['STA', 'abs', 0x2007], ['LDA', 'absx', at(base, b)], ['STA', 'abs', 0x2007]];
    return [['STY', 'zp', Z.COL], ...scale, ['TAY'], ['LDA', 'absy', at(base, a)], ['STA', 'abs', 0x2007], ['LDA', 'absy', at(base, b)], ['STA', 'abs', 0x2007], ['LDY', 'zp', Z.COL]];
  };
  const draw = (base, s) => [
    ['LDX', 'zp', Z.SCENE], ['LDA', 'absx', cpu('maplo')], ['STA', 'zp', Z.PTR], ['LDA', 'absx', cpu('maphi')], ['STA', 'zp', Z.PTR + 1],
    ['LDA', 'abs', 0x2002], ['LDA', 'imm', 0x20], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'zp', Z.ROW],
    {label: 'ROWL' + s}, ['LDY', 'imm', 0],
    {label: 'TOPL' + s}, ['LDA', 'indy', Z.PTR], ...cell(base, 'TL', 'TR'), ['INY'], ['CPY', 'imm', 16], ['BNE', 'rel', 'TOPL' + s], ['LDY', 'imm', 0],
    {label: 'BOTL' + s}, ['LDA', 'indy', Z.PTR], ...cell(base, 'BL', 'BR'), ['INY'], ['CPY', 'imm', 16], ['BNE', 'rel', 'BOTL' + s],
    ['LDA', 'zp', Z.PTR], ['CLC'], ['ADC', 'imm', 16], ['STA', 'zp', Z.PTR], ['LDA', 'zp', Z.PTR + 1], ['ADC', 'imm', 0], ['STA', 'zp', Z.PTR + 1],
    ['INC', 'zp', Z.ROW], ['LDA', 'zp', Z.ROW], ['CMP', 'imm', 15], ['BEQ', 'rel', 'ROWD' + s], ['JMP', 'abs', 'ROWL' + s], {label: 'ROWD' + s}, ['RTS']];
  const getpal = paletteMode === 'low' ? [['AND', 'imm', 3]] : Array(6).fill(['LSR', 'acc']);
  const attrHi = vertical ? 0x2b : 0x27; // a mirror of $23C0 under the cartridge's mirroring
  const P = [
    {label: 'RESET'}, ['SEI'], ['CLD'], ['LDX', 'imm', 0xff], ['TXS'], ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001],
    ...['SCENE', 'PALSET', 'NMIFLAG', 'PREV', 'COUNTER', 'USEB', 'UIDX'].map(n => ['STA', 'zp', Z[n]]),
    {label: 'VW1'}, ['BIT', 'abs', 0x2002], ['BPL', 'rel', 'VW1'],
    {label: 'VW2'}, ['BIT', 'abs', 0x2002], ['BPL', 'rel', 'VW2'],
    ...(guard ? [['JSR', 'abs', 'CHECKSUM']] : []),
    ['JSR', 'abs', 'LOADPAL'], ['JSR', 'abs', 'DRAWNT'], ['JSR', 'abs', 'DRAWATTR'], ['JSR', 'abs', 'ENABLE'],
    {label: 'MAIN'}, ['LDA', 'zp', Z.NMIFLAG], ['BEQ', 'rel', 'MAIN'], ['LDA', 'imm', 0], ['STA', 'zp', Z.NMIFLAG], ['JSR', 'abs', 'READPAD'],
    ['LDA', 'zp', Z.PREV], ['EOR', 'imm', 0xff], ['AND', 'zp', Z.PAD], ['STA', 'zp', Z.PRESSED], ['LDA', 'zp', Z.PAD], ['STA', 'zp', Z.PREV],
    ['LDA', 'zp', Z.PRESSED], ['AND', 'imm', 0x01], ['BEQ', 'rel', 'NOR'], ['LDX', 'zp', Z.SCENE], ['INX'], ['CPX', 'imm', 3], ['BCC', 'rel', 'SETR'], ['LDX', 'imm', 0],
    {label: 'SETR'}, ['STX', 'zp', Z.SCENE], ['JSR', 'abs', 'REDRAW'],
    {label: 'NOR'}, ['LDA', 'zp', Z.PRESSED], ['AND', 'imm', 0x40], ['BEQ', 'rel', 'NOB'], ['LDA', 'imm', 3], ['STA', 'zp', Z.SCENE], ['JSR', 'abs', 'REDRAW'],
    {label: 'NOB'}, ['LDA', 'zp', Z.PRESSED], ['AND', 'imm', 0x20], ['BEQ', 'rel', 'NOS'], ['LDA', 'zp', Z.PALSET], ['EOR', 'imm', 1], ['STA', 'zp', Z.PALSET], ['JSR', 'abs', 'REPAL'],
    {label: 'NOS'}, ['JMP', 'abs', 'MAIN'],
    {label: 'NMI'}, ['PHA'], ...(unrelatedTable ? [['TXA'], ['PHA']] : []), ['LDA', 'imm', 1], ['STA', 'zp', Z.NMIFLAG], ['INC', 'zp', Z.COUNTER],
    ...(unrelatedTable ? [['LDA', 'imm', 8], ['STA', 'zp', Z.UCNT], ['LDX', 'zp', Z.UIDX], {label: 'URL'}, ['LDA', 'absx', cpu('unrelated')], ['STA', 'zp', Z.SINK], ['INX'], ['TXA'], ['AND', 'imm', 0x7f], ['TAX'], ['DEC', 'zp', Z.UCNT], ['BNE', 'rel', 'URL'], ['STX', 'zp', Z.UIDX], ['PLA'], ['TAX']] : []),
    ['PLA'], ['RTI'],
    {label: 'IRQ'}, ['RTI'],
    {label: 'READPAD'}, ['LDA', 'imm', 1], ['STA', 'abs', 0x4016], ['LDA', 'imm', 0], ['STA', 'abs', 0x4016], ['LDX', 'imm', 8],
    {label: 'RPL'}, ['LDA', 'abs', 0x4016], ['LSR', 'acc'], ['ROL', 'zp', Z.PAD], ['DEX'], ['BNE', 'rel', 'RPL'], ['RTS'],
    {label: 'REDRAW'}, ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001], ['JSR', 'abs', 'DRAWNT'], ['JSR', 'abs', 'DRAWATTR'], ['JSR', 'abs', 'ENABLE'], ['RTS'],
    {label: 'REPAL'}, ['LDA', 'imm', 0], ['STA', 'abs', 0x2000], ['STA', 'abs', 0x2001], ['JSR', 'abs', 'LOADPAL'], ['JSR', 'abs', 'ENABLE'], ['RTS'],
    {label: 'ENABLE'}, ['LDA', 'abs', 0x2002], ['LDA', 'imm', 0], ['STA', 'abs', 0x2005], ['STA', 'abs', 0x2005], ['LDA', 'imm', 0x80], ['STA', 'abs', 0x2000], {label: 'ENABLE_MASK'}, ['LDA', 'imm', 0x0a], ['STA', 'abs', 0x2001], ['RTS'],
    {label: 'LOADPAL'}, ['LDA', 'abs', 0x2002], ['LDA', 'imm', 0x3f], ['STA', 'abs', 0x2006], ['LDA', 'imm', 0], ['STA', 'abs', 0x2006],
    ['LDA', 'zp', Z.PALSET], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['ASL', 'acc'], ['TAX'], ['LDY', 'imm', 32],
    {label: 'LPL'}, ['LDA', 'absx', cpu('palettes')], ['STA', 'abs', 0x2007], ['INX'], ['DEY'], ['BNE', 'rel', 'LPL'], ['RTS'],
    {label: 'DRAWNT'}, ...(guard ? [['LDA', 'zp', Z.USEB], ['BEQ', 'rel', 'DRAWA'], ['JMP', 'abs', 'DRAWB'], {label: 'DRAWA'}] : []), ...draw(T, 'A'),
    ...(guard ? [{label: 'DRAWB'}, ...draw(TB, 'B')] : []),
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
    ...(guard ? [{label: 'CHECKSUM'}, ['LDA', 'imm', T & 0xff], ['STA', 'zp', Z.P2], ['LDA', 'imm', T >> 8], ['STA', 'zp', Z.P2 + 1], ['LDA', 'imm', 0], ['STA', 'zp', Z.SUM], ['LDY', 'imm', 0],
      {label: 'CSL'}, ['LDA', 'indy', Z.P2], ['CLC'], ['ADC', 'zp', Z.SUM], ['STA', 'zp', Z.SUM], ['INY'], ['CPY', 'imm', regions.table.length], ['BNE', 'rel', 'CSL'],
      ['LDA', 'zp', Z.SUM], ['CMP', 'abs', cpu('checksum')], ['BEQ', 'rel', 'CSOK'], ['LDA', 'imm', 1], ['STA', 'zp', Z.USEB], {label: 'CSOK'}, ['RTS']] : []),
  ];
  const size = assemble(codeMirror, P).bytes.length, codeAt = alloc(size, 'code');
  const program = assemble(codeMirror + codeAt, P);
  prg.set(program.bytes, codeAt); regions.code = {prg: codeAt, length: size, kind: 'program'};
  const L = program.labels;
  prg.set([L.NMI & 0xff, L.NMI >> 8, L.RESET & 0xff, L.RESET >> 8, L.IRQ & 0xff, L.IRQ >> 8], 0x3ffa);
  const tail = Array.from({length: 48}, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[int(36)]).join('');
  prg.set(Buffer.from('NESFORGE-SYNTHETIC/1 ' + tail + '\0', 'latin1'), 0x3f00); // gate prefix + random filler; no seed

  // ---- CHR: 255 original procedural tiles, tile 0 blank ----
  const chr = new Uint8Array(8192);
  for (let t = 1; t < 256; t++) for (let i = 0; i < 16; i++) chr[t * 16 + i] = int(256);

  // ---- iNES file ----
  const header = new Uint8Array(16); header.set([0x4e, 0x45, 0x53, 0x1a, 1, 1, vertical ? 1 : 0, 0]);
  const rom = new Uint8Array(16 + PRG + 8192); rom.set(header, 0);
  const prgStart = 16; rom.set(prg, prgStart); rom.set(chr, prgStart + PRG);
  const phys = name => prgStart + regions[name].prg, pcPhys = cpuAddr => prgStart + ((cpuAddr - 0x8000) & 0x3fff);

  // ---- expected screens, computed from the data above (no emulation) ----
  const expected = scenes.map(map => {
    const nametable = new Uint8Array(960), attributes = new Uint8Array(64);
    for (let my = 0; my < 15; my++) for (let mx = 0; mx < 16; mx++) { const r = records[map[my * 16 + mx]]; nametable[2 * my * 32 + 2 * mx] = r[0]; nametable[2 * my * 32 + 2 * mx + 1] = r[1]; nametable[(2 * my + 1) * 32 + 2 * mx] = r[2]; nametable[(2 * my + 1) * 32 + 2 * mx + 1] = r[3]; }
    for (let ay = 0; ay < 8; ay++) for (let ax = 0; ax < 8; ax++) { const p = (my, mx) => my < 15 ? palettes[map[my * 16 + mx]] : 0; attributes[ay * 8 + ax] = p(2 * ay, 2 * ax) | p(2 * ay, 2 * ax + 1) << 2 | p(2 * ay + 1, 2 * ax) << 4 | p(2 * ay + 1, 2 * ax + 1) << 6; }
    return {ids: map.slice(), nametable: Buffer.from(nametable).toString('hex'), attributes: Buffer.from(attributes).toString('hex')};
  });
  const recordByte = (base, id, q) => base + id * recordStep + field[q] * fieldStep;
  const someTrainingOnly = trainingIds.find(id => !aliasMembers.includes(id)) ?? trainingIds[0];
  const truth = {
    format: 'NESForgeSyntheticFixtureTruth', version: 2, generator: GENERATOR, seed, scenario, expect: EXPECT[scenario], relocate,
    rom: {sha256: sha(rom), byteLength: rom.length}, prgStart, mirroring: vertical ? 'vertical' : 'horizontal', attributeWriteAddress: attrHi << 8 | 0xc0,
    table: {layout, order, count: N, stride: layout === 'split' ? stride : null, recordStep, fieldStep, physicalBase: phys('table'), cpuBase: T, field, mirror: tableMirror, indexRegister: indexReg,
      numbering: indirect ? {evidence: 'none: records are reached through a pointer computed from (map value + ' + K + ')', mapOffset: K} : {evidence: 'operand of the indexed instructions', mapOffset: 0}},
    palette: {mode: paletteMode, physicalBase: phys('paltab') - K, cpuBase: cpu('paltab') - K},
    records, palettes, aliases: aliasGroups.map(g => ({ids: g.ids.slice().sort((a, b) => a - b), samePalette: g.samePalette})),
    ids: {training: trainingIds.slice().sort((a, b) => a - b), scene2Only: scene2Only.slice().sort((a, b) => a - b), holdoutOnly: holdoutOnly.slice().sort((a, b) => a - b), neverDrawn: [...Array(N).keys()].filter(id => !scenes.some(s => s.includes(id)))},
    regions: Object.fromEntries(Object.entries(regions).map(([k, v]) => [k, {physical: prgStart + v.prg, length: v.length, kind: v.kind}])),
    decoys, unrelated: unrelatedTable ? {physical: phys('unrelated'), length: 128, copiedIds: unrelatedCopied.slice().sort((a, b) => a - b), readBy: 'NMI handler, 8 bytes per frame'} : null,
    guard: guard ? {table: phys('table'), backup: phys('backup'), checksum: phys('checksum'), effect: 'any change to the table fails the boot checksum and switches drawing to the backup copy'} : null,
    unusedDataStyles: styles, zeroPage: Z,
    code: {physical: phys('code'), length: size, origin: codeMirror + codeAt, labels: Object.fromEntries(Object.entries(L).map(([k, v]) => [k, pcPhys(v)])), instructions: program.instructions.map(([pc, n]) => [pcPhys(pc), n])},
    marker: {physical: prgStart + 0x3f00, carries: 'the gate prefix and random filler only'},
    patches: {
      positive: [(() => { const id = someTrainingOnly, off = recordByte(phys('table'), id, 'TL'); return {offset: off, expected: records[id][0], value: records[id][0] === 0xff ? 0xfe : records[id][0] + 1}; })()],
      ...(guard ? {guardTrip: [{offset: phys('table') + 1, expected: prg[regions.table.prg + 1], value: prg[regions.table.prg + 1] ^ 1}]} : {}),
      ...(regions.decoyCopy ? {decoyCopy: [{offset: phys('decoyCopy'), expected: prg[regions.decoyCopy.prg], value: prg[regions.decoyCopy.prg] ^ 1}]} : {}),
      ...(unrelatedTable ? {unrelated: [{offset: phys('unrelated') + 5, expected: prg[regions.unrelated.prg + 5], value: prg[regions.unrelated.prg + 5] ^ 1}]} : {}),
      paletteOnly: [{offset: phys('palettes') + 1, expected: paletteSets[1], value: paletteSets[1] === 0x30 ? 0x16 : 0x30}],
      renderingOff: [{offset: pcPhys(L.ENABLE_MASK) + 1, expected: 0x0a, value: 0x00}],
      hang: [{offset: pcPhys(L.VW1), expected: 0x2c, value: 0x4c}, {offset: pcPhys(L.VW1) + 1, expected: 0x02, value: L.VW1 & 0xff}, {offset: pcPhys(L.VW1) + 2, expected: 0x20, value: L.VW1 >> 8}],
    },
    inputs: {
      training: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['Right']}, {frames: 56, buttons: []}, {frames: 4, buttons: ['Right']}, {frames: 56, buttons: []}],
        captures: [{label: 'scene-0', frame: 60, scene: 0}, {label: 'scene-1', frame: 120, scene: 1}, {label: 'scene-2', frame: 180, scene: 2}]},
      holdout: {steps: [{frames: 60, buttons: []}, {frames: 4, buttons: ['B']}, {frames: 56, buttons: []}], captures: [{label: 'holdout', frame: 120, scene: 3}]},
    },
    expected,
  };
  return {rom, truth};
}

const SEEDS = path.join(HERE, 'seeds.json');
function committed() { return JSON.parse(fs.readFileSync(SEEDS, 'utf8')); }
const fileName = entry => 'seed-' + entry.seed + '-' + entry.scenario + '.nes';
function files(entry) { return {rom: path.join(HERE, 'roms', fileName(entry)), truth: path.join(HERE, 'truth', fileName(entry).replace(/\.nes$/, '.truth.json'))}; }
const truthText = truth => JSON.stringify(truth, null, 1) + '\n';

if (require.main === module) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes('--check') || args.includes('--write')) {
    const write = args.includes('--write'), problems = [], seeds = committed();
    for (const entry of seeds.fixtures) {
      const {rom, truth} = generate(entry.seed, entry.scenario), f = files(entry);
      if (write) { fs.mkdirSync(path.dirname(f.rom), {recursive: true}); fs.mkdirSync(path.dirname(f.truth), {recursive: true}); fs.writeFileSync(f.rom, rom); fs.writeFileSync(f.truth, truthText(truth)); entry.sha256 = truth.rom.sha256; entry.file = fileName(entry); continue; }
      if (sha(rom) !== entry.sha256) problems.push(fileName(entry) + ': regenerated SHA-256 ' + sha(rom) + ' differs from the pinned ' + entry.sha256);
      if (!fs.existsSync(f.rom) || !Buffer.from(rom).equals(fs.readFileSync(f.rom))) problems.push(fileName(entry) + ': committed cartridge differs from the regenerated bytes');
      if (!fs.existsSync(f.truth) || fs.readFileSync(f.truth, 'utf8') !== truthText(truth)) problems.push(fileName(entry) + ': committed truth file differs');
    }
    if (write) { fs.writeFileSync(SEEDS, JSON.stringify(seeds, null, 1) + '\n'); console.log('wrote', seeds.fixtures.length, 'fixtures'); }
    else { console.log(problems.length ? problems.join('\n') : 'all committed AL-EXP-02 fixtures regenerate byte for byte'); process.exit(problems.length ? 1 : 0); }
  } else {
    const seed = Number(opt('--seed')), scenario = opt('--scenario') || 'standard', out = opt('--out');
    if (!Number.isSafeInteger(seed) || !out) { console.error('usage: generate.cjs --seed N [--scenario NAME] --out DIR | --write | --check'); process.exit(2); }
    const {rom, truth} = generate(seed, scenario, {relocate: Number(opt('--relocate') || 0)});
    fs.mkdirSync(out, {recursive: true}); const name = fileName({seed, scenario}); fs.writeFileSync(path.join(out, name), rom); fs.writeFileSync(path.join(out, name.replace(/\.nes$/, '.truth.json')), truthText(truth));
    console.log(JSON.stringify({seed, scenario, sha256: truth.rom.sha256, layout: truth.table.layout, order: truth.table.order, count: truth.table.count, physicalBase: truth.table.physicalBase}));
  }
}
module.exports = {generate, GENERATOR, SCENARIOS, EXPECT, committed, files, fileName, truthText};
