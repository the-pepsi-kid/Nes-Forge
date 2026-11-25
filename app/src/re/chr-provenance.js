/* NES FORGE MODULE: src/re/chr-provenance.js  (UMD: window.ForgeChrProvenance, and require() in Node)
 * AL-REC-01: where the bytes of a CHR RAM tile came from. Pure functions, no emulator access.
 *
 * The browser tracer (src/re/recovery-trace.js) follows each byte value the CPU moves: a PRG data read, an immediate
 * operand, internal or cartridge RAM, or a VRAM read-back. Registers and RAM carry the origin of the value they hold,
 * by instruction semantics (loads, stores, transfers, arithmetic, read-modify-write, stack). When the game writes a
 * byte to the pattern tables through $2007, the byte's origin is recorded. This module holds the semantics table and
 * classifies each tile of a CHR RAM snapshot from those origins:
 *
 *   uniform      every byte the same (often blank); nothing to recover
 *   direct       the 16 bytes were copied from PRG: one run of 16, or two runs of 8 (the planes). Checked against the
 *                cartridge byte for byte. These tiles can be written back into PRG (writeback()).
 *   transformed  every byte is a fixed function of one PRG byte (inverted, mirrored, or a plane duplicated/cleared)
 *   compressed   derived from PRG data but not 1:1: repeated source bytes (run-length), scattered sources (literal
 *                copies), arithmetic on PRG data, or bytes read back from VRAM (back-references)
 *   procedural   no PRG data contributed: immediate operands and arithmetic only
 *   assembled    bytes of several kinds in one tile (parts copied, parts generated)
 *   (rewritten)  any class can also be flagged rewritten: the slot held several contents during the trace (animation,
 *                or reuse by another scene)
 *   untraced     written before tracing started; if its content occurs in PRG (as is, or under one of the
 *                transforms) the location is reported as located by content, not by trace
 * Captured content is exact either way: classification says how far its origin is known, not whether it is right.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ForgeChrProvenance = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // origin codes; a value >= 0 is the cartridge file offset of the PRG byte the value was copied from
  const ORIGIN = Object.freeze({IMMEDIATE: -1, DERIVED: -2, COMPUTED: -3, VRAM: -4, IO: -5, UNKNOWN: -6});
  // 6502 mnemonics by opcode (official set; '???' for the unofficial opcodes, treated conservatively)
  const MN = ('BRK ORA ??? ??? ??? ORA ASL ??? PHP ORA ASL ??? ??? ORA ASL ??? BPL ORA ??? ??? ??? ORA ASL ??? CLC ORA ??? ??? ??? ORA ASL ??? ' +
    'JSR AND ??? ??? BIT AND ROL ??? PLP AND ROL ??? BIT AND ROL ??? BMI AND ??? ??? ??? AND ROL ??? SEC AND ??? ??? ??? AND ROL ??? ' +
    'RTI EOR ??? ??? ??? EOR LSR ??? PHA EOR LSR ??? JMP EOR LSR ??? BVC EOR ??? ??? ??? EOR LSR ??? CLI EOR ??? ??? ??? EOR LSR ??? ' +
    'RTS ADC ??? ??? ??? ADC ROR ??? PLA ADC ROR ??? JMP ADC ROR ??? BVS ADC ??? ??? ??? ADC ROR ??? SEI ADC ??? ??? ??? ADC ROR ??? ' +
    '??? STA ??? ??? STY STA STX ??? DEY ??? TXA ??? STY STA STX ??? BCC STA ??? ??? STY STA STX ??? TYA STA TXS ??? ??? STA ??? ??? ' +
    'LDY LDA LDX ??? LDY LDA LDX ??? TAY LDA TAX ??? LDY LDA LDX ??? BCS LDA ??? ??? LDY LDA LDX ??? CLV LDA TSX ??? LDY LDA LDX ??? ' +
    'CPY CMP ??? ??? CPY CMP DEC ??? INY CMP DEX ??? CPY CMP DEC ??? BNE CMP ??? ??? ??? CMP DEC ??? CLD CMP ??? ??? ??? CMP DEC ??? ' +
    'CPX SBC ??? ??? CPX SBC INC ??? INX SBC NOP ??? CPX SBC INC ??? BEQ SBC ??? ??? ??? SBC INC ??? SED SBC ??? ??? ??? SBC INC ???').split(' ');
  // semantic kind per opcode: what the instruction does to register and memory origins
  const K = Object.freeze({NONE: 0, LOAD: 1, STORE: 2, MOVE: 3, ALU: 4, RMW: 5, STEP: 6, PUSH: 7, PULL: 8, UNOFFICIAL: 9, STACK: 10});
  const REG = {A: 0, X: 1, Y: 2};
  const SEM = MN.map((m, op) => {
    switch (m) {
      case 'LDA': return [K.LOAD, REG.A]; case 'LDX': return [K.LOAD, REG.X]; case 'LDY': return [K.LOAD, REG.Y];
      case 'STA': return [K.STORE, REG.A]; case 'STX': return [K.STORE, REG.X]; case 'STY': return [K.STORE, REG.Y];
      case 'TAX': return [K.MOVE, REG.X, REG.A]; case 'TAY': return [K.MOVE, REG.Y, REG.A]; case 'TXA': return [K.MOVE, REG.A, REG.X]; case 'TYA': return [K.MOVE, REG.A, REG.Y];
      case 'TSX': return [K.STEP, REG.X, -1];
      case 'ADC': case 'SBC': case 'AND': case 'ORA': case 'EOR': return [K.ALU, REG.A];
      case 'ASL': case 'LSR': case 'ROL': case 'ROR': return (op & 0x1f) === 0x0a ? [K.STEP, REG.A, REG.A] : [K.RMW, -1];
      case 'INC': case 'DEC': return [K.RMW, -1];
      case 'INX': case 'DEX': return [K.STEP, REG.X, REG.X]; case 'INY': case 'DEY': return [K.STEP, REG.Y, REG.Y];
      case 'PHA': return [K.PUSH, REG.A]; case 'PLA': return [K.PULL, REG.A];
      case 'PHP': case 'JSR': case 'BRK': return [K.STACK, -1];
      case '???': return [K.UNOFFICIAL, -1];
      default: return [K.NONE, -1];
    }
  });
  const isPrg = o => o >= 0 || o === ORIGIN.DERIVED;
  // the origin of a value computed from several inputs ([origin, src] pairs): derived from PRG data if any input is
  const combine = (...inputs) => {
    let src = -1, vram = false, unknown = false;
    for (const [o, s] of inputs) { if (o >= 0) { src = o; break; } if (o === ORIGIN.DERIVED && src < 0) src = s; if (o === ORIGIN.VRAM) vram = true; if (o === ORIGIN.UNKNOWN) unknown = true; }
    if (src >= 0) return [ORIGIN.DERIVED, src];
    return [vram ? ORIGIN.VRAM : unknown ? ORIGIN.UNKNOWN : ORIGIN.COMPUTED, -1];
  };

  // ---------- transforms between one source byte and one output byte ----------
  const REV = new Uint8Array(256); for (let i = 0; i < 256; i++) { let r = 0; for (let b = 0; b < 8; b++) if (i & (1 << b)) r |= 0x80 >> b; REV[i] = r; }
  const TRANSFORMS = Object.freeze({identity: v => v, inverted: v => v ^ 0xff, mirrored: v => REV[v], 'mirrored and inverted': v => REV[v] ^ 0xff});

  // ---------- located by content ----------
  // an index of every 16-byte PRG window (by its first 4 bytes); look-ups return file offsets
  function contentIndex(rom, prgStart, prgBytes) {
    const idx = new Map(), end = prgStart + prgBytes;
    for (let o = prgStart; o + 16 <= end; o++) { const k = (rom[o] | rom[o + 1] << 8 | rom[o + 2] << 16 | rom[o + 3] << 24) >>> 0; let l = idx.get(k); if (!l) idx.set(k, l = []); l.push(o); }
    const find = tile => { const k = (tile[0] | tile[1] << 8 | tile[2] << 16 | tile[3] << 24) >>> 0, hits = []; for (const o of idx.get(k) || []) { let ok = true; for (let i = 4; i < 16; i++) if (rom[o + i] !== tile[i]) { ok = false; break; } if (ok) { hits.push(o); if (hits.length > 8) break; } } return hits; };
    return {find, locate(tile) {
      for (const [name, f] of Object.entries(TRANSFORMS)) { const t = Uint8Array.from(tile, f), hits = find(t); if (hits.length) return {transform: name, offsets: hits}; }
      // vertically flipped (rows reversed within each plane)
      const v = new Uint8Array(16); for (let i = 0; i < 8; i++) { v[i] = tile[7 - i]; v[8 + i] = tile[15 - i]; } const hv = find(v); if (hv.length) return {transform: 'flipped vertically', offsets: hv};
      return null;
    }};
  }

  // ---------- one tile ----------
  // t: {bytes (16), origin (16 ints), src (16 ints), writes (16 counts), versions (distinct contents seen)}
  function classifyTile(t, rom, index) {
    const b = t.bytes, o = t.origin;
    if (b.every(v => v === b[0])) return {class: 'uniform', value: b[0]};
    if (o.every(x => x === ORIGIN.UNKNOWN)) {
      const at = index ? index.locate(b) : null;
      return at ? {class: 'untraced', located: at.transform === 'identity' ? 'verbatim' : at.transform, offsets: at.offsets.slice(0, 4), ambiguous: at.offsets.length > 1} : {class: 'untraced', located: null};
    }
    const rewritten = (t.versions || 1) > 1;
    // every byte copied from PRG
    if (o.every(x => x >= 0)) {
      if (!o.every((x, i) => rom[x] === b[i])) return {class: 'compressed', detail: 'copied values do not match their PRG bytes (rewritten after copying)', rewritten};
      const run = (from, n) => { for (let i = 1; i < n; i++) if (o[from + i] !== o[from] + i) return false; return true; };
      if (run(0, 16)) return {class: 'direct', detail: 'one 16-byte copy', offsets: [o[0]], writable: true, rewritten};
      if (run(0, 8) && run(8, 8)) return {class: 'direct', detail: 'the two planes copied from separate places', offsets: [o[0], o[8]], writable: true, rewritten};
      const distinct = new Set(o).size;
      return {class: 'compressed', detail: distinct < 16 ? 'run-length: ' + distinct + ' source bytes for 16' : 'literal copies from scattered PRG bytes', sources: distinct, rewritten};
    }
    // 1 bpp graphics expanded to two planes: one plane copied from 8 consecutive PRG bytes, the other a constant fill
    const srcOf = i => o[i] >= 0 ? o[i] : o[i] === ORIGIN.DERIVED ? t.src[i] : -1;
    const planeCopy = from => { const q = []; for (let i = 0; i < 8; i++) q.push(srcOf(from + i)); return q.every((x, i) => x >= 0 && x === q[0] + i && rom[x] === b[from + i]) ? q[0] : -1; };
    const flat = from => { for (let i = 1; i < 8; i++) if (b[from + i] !== b[from]) return false; return true; };
    for (const [copied, filled] of [[0, 8], [8, 0]]) { const at = planeCopy(copied); if (at >= 0 && flat(filled) && !(planeCopy(filled) >= 0))
      return {class: 'transformed', detail: '1 bpp graphics expanded: plane ' + (copied ? 1 : 0) + ' copied from PRG, plane ' + (filled ? 1 : 0) + ' filled with $' + b[filled].toString(16).padStart(2, '0'), transform: 'plane expansion', offsets: [at], plane: copied ? 1 : 0, fill: b[filled], writable: 'plane', rewritten}; }
    // literal bytes copied from PRG in order, with generated constant runs between them (zero-run and similar encodings):
    // the literals can be rewritten in place as long as the generated bytes keep their values
    { const lit = o.map((x, i) => x >= 0 && rom[x] === b[i]), gen = o.map(x => x === ORIGIN.IMMEDIATE || x === ORIGIN.COMPUTED), srcs = o.filter(x => x >= 0);
      if (lit.some(Boolean) && o.every((x, i) => lit[i] || gen[i]) && srcs.every((x, i) => i === 0 || x > srcs[i - 1])) {
        const values = [...new Set(b.filter((_, i) => gen[i]))].map(v => '$' + v.toString(16).padStart(2, '0'));
        return {class: 'compressed', detail: 'literal bytes from PRG with generated runs of ' + values.join(', ') + ' (a run encoding)', literals: o.map((x, i) => lit[i] ? x : -1), sources: srcs.length, writable: 'literals', rewritten}; } }
    const kinds = new Set(o.map(x => x >= 0 ? 'copy' : x === ORIGIN.DERIVED ? 'derived' : x === ORIGIN.VRAM ? 'vram' : x === ORIGIN.UNKNOWN ? 'unknown' : 'generated'));
    if (kinds.has('vram')) return {class: 'compressed', detail: 'bytes read back from VRAM (back-references)', rewritten};
    if (!o.some(isPrg)) return {class: kinds.has('unknown') ? 'assembled' : 'procedural', detail: kinds.has('unknown') ? 'parts generated and parts written before tracing' : 'generated without PRG data (immediate values and arithmetic)', rewritten};
    // derived from PRG: is one fixed transform of each source byte the whole story?
    const src = o.map((x, i) => x >= 0 ? x : x === ORIGIN.DERIVED ? t.src[i] : -1);
    if (src.every(s => s >= 0)) {
      // equal to the PRG bytes, though moved through computation (a bit-by-bit copy): as good as a copy for writing back
      if (src.every((x, i) => rom[x] === b[i])) {
        const run = (from, n) => { for (let i = 1; i < n; i++) if (src[from + i] !== src[from] + i) return false; return true; };
        if (run(0, 16)) return {class: 'direct', detail: 'decoded bit by bit, equal to 16 consecutive PRG bytes', offsets: [src[0]], writable: true, via: 'computation', rewritten};
        if (run(0, 8) && run(8, 8)) return {class: 'direct', detail: 'decoded bit by bit, equal to PRG bytes (two planes)', offsets: [src[0], src[8]], writable: true, via: 'computation', rewritten};
      }
      for (const [name, f] of Object.entries(TRANSFORMS)) if (name !== 'identity' && src.every((s, i) => f(rom[s]) === b[i])) return {class: 'transformed', detail: name + ' copy of PRG bytes', transform: name, offsets: [...new Set(src)].slice(0, 2), rewritten};
      // one plane copied and the other a function of it (1 bpp graphics expanded to 2 bpp)
      if (src.slice(0, 8).every((s, i) => s === src[8 + i])) { const rel = Object.entries(TRANSFORMS).find(([, f]) => src.every((s, i) => f(rom[s]) === b[i] || (i >= 8 && (b[i] === 0 || b[i] === 0xff || b[i] === b[i - 8])))); if (rel) return {class: 'transformed', detail: '1 bpp source expanded to two planes', transform: 'plane expansion', offsets: [src[0]], rewritten}; }
    }
    if (kinds.has('generated') || kinds.has('unknown')) return {class: 'assembled', detail: 'parts from PRG and parts generated in one tile', rewritten};
    return {class: 'compressed', detail: 'computed from PRG data (decoded)', sources: new Set(src.filter(s => s >= 0)).size, rewritten};
  }
  // ---------- a CHR RAM snapshot ----------
  // trace: {origin: Int32Array(n), src: Int32Array(n), writes: Uint32Array(n), versions: Uint8Array(n/16)} for CHR RAM of n bytes
  function classify({chr, trace, rom, prgStart, prgBytes, tiles = null}) {
    const n = chr.length >> 4, index = rom ? contentIndex(rom, prgStart, prgBytes) : null, out = [];
    for (let t = 0; t < n; t++) {
      if (tiles && !tiles.has(t)) continue;
      const at = t * 16, row = {bytes: chr.subarray(at, at + 16), origin: Array.from(trace.origin.subarray(at, at + 16)), src: Array.from(trace.src.subarray(at, at + 16)), versions: trace.versions ? trace.versions[t] : 1};
      out.push({tile: t, ...classifyTile(row, rom, index)});
    }
    return out;
  }
  function summarize(rows) {
    const by = {}; for (const r of rows) { const k = r.class === 'untraced' && r.located ? 'untraced (located by content)' : r.class; by[k] = (by[k] || 0) + 1; }
    return {tiles: rows.length, byClass: by, writable: rows.filter(r => r.writable).length, writableWholeTile: rows.filter(r => r.writable === true).length, nonUniform: rows.filter(r => r.class !== 'uniform').length, rewritten: rows.filter(r => r.rewritten).length};
  }
  // ---------- native writeback for traced direct tiles ----------
  // edits: [{tile, bytes (16)}]; rows: classify() output. Returns the new cartridge and the PRG ranges written.
  function writeback(rom, rows, edits) {
    const out = Uint8Array.from(rom), written = [], refused = [];
    const byTile = new Map(rows.map(r => [r.tile, r]));
    for (const e of edits) {
      const r = byTile.get(e.tile);
      if (r && r.writable === 'literals') {
        // the captured tile (e.original) says what the generated bytes are; an edit must keep them
        const keep = r.literals.map((x, i) => x < 0 ? i : -1).filter(i => i >= 0);
        if (!e.original || keep.some(i => e.bytes[i] !== e.original[i])) { refused.push({tile: e.tile, reason: 'bytes ' + keep.join(', ') + ' are generated by the game\'s decoder; an edit must keep them (and needs the captured tile to compare)'}); continue; }
        for (let i = 0; i < 16; i++) if (r.literals[i] >= 0) { out[r.literals[i]] = e.bytes[i]; written.push({fileOffset: r.literals[i], length: 1, tile: e.tile}); }
        continue; }
      if (r && r.writable === 'plane') {
        const keep = r.plane ? 0 : 8; if (!e.bytes.slice(keep, keep + 8).every(v => v === r.fill)) { refused.push({tile: e.tile, reason: 'the game fills plane ' + (r.plane ? 0 : 1) + ' with $' + r.fill.toString(16).padStart(2, '0') + '; an edit must keep it'}); continue; }
        out.set(e.bytes.slice(r.plane * 8, r.plane * 8 + 8), r.offsets[0]); written.push({fileOffset: r.offsets[0], length: 8, tile: e.tile}); continue; }
      if (!r || r.class !== 'direct' || !r.writable) { refused.push({tile: e.tile, reason: r ? 'its graphics are ' + r.class + ', not a traced direct copy' : 'not traced'}); continue; }
      const parts = r.offsets.length === 1 ? [[r.offsets[0], 0, 16]] : [[r.offsets[0], 0, 8], [r.offsets[1], 8, 8]];
      for (const [o, from, len] of parts) { out.set(e.bytes.slice(from, from + len), o); written.push({fileOffset: o, length: len, tile: e.tile}); }
    }
    return {rom: out, written, refused};
  }
  return Object.freeze({ORIGIN, K, REG, MN, SEM, TRANSFORMS, combine, isPrg, contentIndex, classifyTile, classify, summarize, writeback});
});
