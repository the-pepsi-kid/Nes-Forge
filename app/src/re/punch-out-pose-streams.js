/*
 * NES FORGE MODULE: src/re/punch-out-pose-streams.js
 * Entry: PunchOutPoseStreams
 * Purpose: Read and write Punch-Out full-pose records (piece geometry, attributes, tiles) in the native stream format.
 * Connections: PunchOutContent runs the original dispatcher; PunchOutPoseGeometryProject owns project views and builds.
 * Contract: encode() output must decode, through the original routine, to exactly the requested OAM. plan() only
 *   writes new streams into declared trailing fill space and re-points one full-pose table entry; original streams
 *   (which other poses share) are never changed.
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Native format (full poses, selector < $80), derived from the dispatcher at $C890:
 *   record      dx, dy, geometry*, attributes*, n, tiles* x n        (pointers little-endian CPU addresses)
 *   first slot  X = base X + dx, Y = base Y + dy; the streams continue from the previous slot.
 *   geometry    00 end | 0n head (dx; Y += sprite height) + n-1 pieces at X+8 | 1n one piece (dx; same Y)
 *               2n n pieces at X+8 | 3n-7n head (dx, dy) + n-1 at X+8 | 8n n hidden slots (Y=$F8, blank tile)
 *               9n / An / Bn-Fn as 0n / 2n / 3n stepping X-8. Runs after a head are at most 7 pieces.
 *   attributes  00 end | 0n/2n/4n/6n (top three bits 000-011) n slots of palette 0-3 | 8n-Fn n explicit bytes.
 *               From the first slot whose OAM Y >= $50 to the end of the stream the reader is in its
 *               behind-background mode: palette runs write palette|$20 and explicit bytes are EOR $20.
 *   tiles       00 end of this stream | 0n T: n tiles from T stepping 1 (8x8) or 2 (8x16) | 1_ B: CHR bank B
 *               2n n explicit tiles | 8n-Fn n blank tiles. The record lists n tile streams, read in order.
 * The interpreter below is a reference for that format. Owner-side tests compare it and the encoder with the
 * original routine on every full pose of a supplied cartridge. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PunchOutPoseStreams = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const fail = message => { throw Error('Punch-Out pose streams: ' + message); };
  const FIRST_SLOT = 3, LAST_SLOT = 63, LOW_LINE = 0x50, HIDDEN_Y = 0xf8, RUN = 7;
  const blankTile = mode => mode === 16 ? 0xfe : 0xff;
  const step = mode => mode === 16 ? 2 : 1;
  const byte = v => v & 255;

  /* read(address) returns the byte the dispatcher would see at a CPU address ($8000-$FFFF). The model works on the
   * OAM page byte by byte like the original (X register = slot offset), including its carry behaviour: a "next row"
   * head whose Y passes 255 advances X by 5, and tile runs that pass 255 add the carry to the next tile. */
  function interpret(read, record, ctx) {
    const mode = ctx.spriteMode, height = mode, page = new Uint8Array(256).fill(0xf8), touched = new Set();
    const used = new Map();
    const at = (a, tag) => { const v = read(a & 65535); if (!used.has(a & 65535)) used.set(a & 65535, tag); return v; };
    const word = (a, tag) => at(a, tag) | (at(a + 1, tag) << 8);
    const base = ctx.slotOffset ?? 0;            // $AA
    let chrBank = ctx.chrBank ?? 5, X = base, slots = 0;
    // Absolute indexed writes do not wrap: past the OAM page they land in the next RAM page (kept, not OAM).
    const beyond = new Map();
    const W = (offset, value) => { const o = 0x0c + X + offset; if (o < 256) { page[o] = byte(value); touched.add(o); } else beyond.set(o, byte(value)); };
    const R = offset => { const o = 0x0c + X + offset; return o < 256 ? page[o] : beyond.get(o) ?? 0; };
    const next = (carry = 0) => { X = (X + 4 + carry) & 255; slots++; if (slots > 61) fail('pose writes past the 61 fighter OAM slots'); };
    // record header and first slot
    const dx = at(record, 'record'), dy = at(record + 1, 'record');
    W(3, ctx.baseX + dx); W(0, ctx.baseY + dy); next();
    const geometry = word(record + 2, 'record'), attributes = word(record + 4, 'record');
    const tileCount = at(record + 6, 'record'), tiles = [];
    for (let i = 0; i < tileCount; i++) tiles.push(word(record + 7 + i * 2, 'record'));
    const recordLength = 7 + tileCount * 2;
    // geometry (R(-1) = previous slot's X, R(-4) = previous slot's Y)
    let p = geometry, guard = 0;
    const run = (count, dir) => {
      // the native continuation writes at most 7 pieces (larger counts fall into its 7-piece entry)
      for (let i = 0; i < Math.min(count, RUN); i++) { const y = R(-4); W(3, R(-1) + dir * 8); W(0, y); next(); }
    };
    for (;;) {
      if (++guard > 256) fail('geometry stream does not end');
      const op = at(p++, 'geometry');
      if (!op) break;
      const n = op & 15, hi = op & 0xf0;
      if (hi === 0x80) {
        const hidden = () => { W(0, HIDDEN_Y); W(1, blankTile(mode)); next(); };
        for (let i = 0; i < n; i++) hidden();
        continue;
      }
      if (hi === 0x10) { W(3, R(-1) + at(p++, 'geometry')); W(0, R(-4)); next(); continue; }
      const dir = hi >= 0x90 ? -1 : 1;
      if (hi === 0x20 || hi === 0xa0) { run(n, dir); continue; }
      const head = hi === 0x00 || hi === 0x90;
      W(3, R(-1) + at(p++, 'geometry'));
      if (head) { const sum = R(-4) + height; W(0, sum); next(sum > 255 ? 1 : 0); }
      else { W(0, R(-4) + at(p++, 'geometry')); next(); }
      if (n > 1) run(n - 1, dir);           // n = 0 behaves as 1 piece and no run (E2 decrements to 255 then BNE)
    }
    const geometryLength = p - geometry, slotCount = slots;
    // attributes: per slot, with the sticky behind-background mode; X restarts at $AA with a clean stride
    p = attributes; guard = 0; X = base;
    let low = false;
    const attr = (value, explicit) => {
      if (!low && R(0) >= LOW_LINE) low = true;
      W(2, explicit ? (low ? value ^ 0x20 : value) : (low ? value | 0x20 : value)); X = (X + 4) & 255;
    };
    for (;;) {
      if (++guard > 256) fail('attribute stream does not end');
      const op = at(p++, 'attributes');
      if (!op) break;
      const n = op & 31;
      if (op & 0x80) for (let i = 0; i < n; i++) attr(at(p++, 'attributes'), true);
      else for (let i = 0; i < n; i++) attr((op >> 5) & 3, false);
    }
    const attributesLength = p - attributes;
    // tiles
    X = base;
    const tileStreams = tiles.map(start => {
      let q = start, g = 0;
      const tile = v => { W(1, v); X = (X + 4) & 255; };
      for (;;) {
        if (++g > 256) fail('tile stream does not end');
        const op = at(q++, 'tiles');
        if (!op) break;
        const n = op & 15, hi = op & 0xf0;
        if (hi === 0) {
          let v = at(q++, 'tiles'), c = 0;
          for (let i = 0; i < n; i++) {
            tile(v); const sum = v + step(mode) + c; v = sum & 255;
            c = n >= 8 && i === 7 ? 0 : (sum > 255 ? 1 : 0);
          }
        }
        else if (hi & 0x80) for (let i = 0; i < n; i++) tile(blankTile(mode));
        else if (hi === 0x20) for (let i = 0; i < n; i++) tile(at(q++, 'tiles'));
        else chrBank = at(q++, 'tiles');
      }
      return {address: start, length: q - start};
    });
    const oam = Array.from(page), list = [];
    for (let k = 0; k < slotCount; k++) {
      const o = 0x0c + base + k * 4;
      if (o + 3 < 256) list.push({slot: o >> 2, y: page[o], tile: page[o + 1], attr: page[o + 2], x: page[o + 3]});
    }
    return {slots: list, oam, chrBank4KiB: chrBank & 31, writesBeyondOam: beyond.size,
      streams: {record: {address: record, length: recordLength}, geometry: {address: geometry, length: geometryLength},
        attributes: {address: attributes, length: attributesLength}, tiles: tileStreams},
      addresses: [...used.keys()].sort((a, b) => a - b)};
  }

  /* slots: [{x, y, tile, attr}] in final OAM values (y as stored in OAM), or {hidden:true}. */
  function encode(slots, ctx) {
    const mode = ctx.spriteMode;
    if (mode !== 8 && mode !== 16) fail('sprite mode must be 8 or 16');
    if (!Array.isArray(slots) || !slots.length || slots.length > LAST_SLOT - FIRST_SLOT + 1) fail('a pose needs 1-61 slots');
    const sl = slots.map((p, i) => {
      if (p.hidden) return {hidden: true, x: 0xf8, y: HIDDEN_Y, tile: blankTile(mode), attr: null};
      for (const k of ['x', 'y', 'tile', 'attr'])
        if (!Number.isInteger(p[k]) || p[k] < 0 || p[k] > 255) fail('slot ' + i + ' ' + k + ' must be a byte');
      return {hidden: false, x: p.x, y: p.y, tile: p.tile, attr: p.attr};
    });
    if (sl[0].hidden) fail('the first slot of a pose must be visible');
    // Hidden slots carry no position, so only trailing hidden slots use the hidden op; a hidden slot that is
    // followed by visible pieces is written as an off-screen positioned piece with a blank tile.
    const lastVisible = sl.map(p => !p.hidden).lastIndexOf(true);
    for (let i = 1; i <= lastVisible; i++) if (sl[i].hidden) sl[i] = {hidden: false, x: sl[i - 1].x, y: HIDDEN_Y,
      tile: blankTile(mode), attr: sl[i - 1].attr ?? 0};
    const geometry = [];
    let i = 1;
    while (i < sl.length) {
      if (sl[i].hidden) { const n = Math.min(15, sl.length - i); geometry.push(0x80 | n); i += n; continue; }
      const head = sl[i], prev = sl[i - 1];
      let n = 1; i++;
      while (i < sl.length && !sl[i].hidden && n < RUN && sl[i].y === sl[i - 1].y && sl[i].x === byte(sl[i - 1].x + 8)) { n++; i++; }
      geometry.push(0x30 | n, byte(head.x - prev.x), byte(head.y - prev.y));
    }
    geometry.push(0);
    // attributes: sticky low mode from the first slot whose Y >= $50 (hidden slots count: their Y is $F8)
    const lowFrom = (() => { const q = sl.findIndex(p => p.y >= LOW_LINE); return q < 0 ? sl.length : q; })();
    const want = q => q >= lowFrom ? (sl[q].attr ?? 0x20) ^ 0x20 : sl[q].attr ?? 0;
    const pal = q => { const a = want(q); return a < 4 ? a : -1; };
    const attributes = [];
    let k = 0;
    while (k < sl.length) {
      const v = pal(k);
      if (v >= 0) { let n = 0; while (k + n < sl.length && n < 31 && pal(k + n) === v) n++; attributes.push((v << 5) | n); k += n; continue; }
      const st = k; let m = 0;
      while (k < sl.length && m < 31 && !(m > 0 && pal(k) >= 0 && k + 1 < sl.length && pal(k + 1) === pal(k))) { k++; m++; }
      attributes.push(0x80 | m); for (let q = st; q < st + m; q++) attributes.push(want(q));
    }
    attributes.push(0);
    // tiles: one stream, starting with the CHR bank
    const tiles = [0x10, ctx.chrBank & 31], blank = blankTile(mode), inc = step(mode);
    k = 0;
    while (k < sl.length) {
      if (sl[k].tile === blank) { let n = 0; while (k < sl.length && n < 15 && sl[k].tile === blank) { n++; k++; } tiles.push(0x80 | n); continue; }
      // runs stay below 256: the native run carries an overflow into the next tile
      let n = 1; while (k + n < sl.length && n < 15 && sl[k].tile + n * inc <= 255 && sl[k + n].tile === sl[k].tile + n * inc) n++;
      if (n >= 2) { tiles.push(n, sl[k].tile); k += n; continue; }
      const st = k; let m = 0;
      while (k < sl.length && m < 15 && sl[k].tile !== blank && !(m > 0 && k + 1 < sl.length && sl[k].tile + inc <= 255 && sl[k + 1].tile === sl[k].tile + inc)) { k++; m++; }
      if (!m) { k++; m = 1; }
      tiles.push(0x20 | m); for (let q = st; q < st + m; q++) tiles.push(sl[q].tile);
    }
    tiles.push(0);
    return {dx: byte(sl[0].x - ctx.baseX), dy: byte(sl[0].y - ctx.baseY), geometry, attributes, tiles,
      bytes: geometry.length + attributes.length + tiles.length + 9};
  }

  /* Trailing fill space: the zero run that ends a physical 8 KiB bank. Only runs of at least `minimum` bytes count,
   * and the first 8 bytes of each run are left as a margin after the last original byte. */
  function trailingFill(bytes, fileStart, cpuStart, minimum = 128) {
    let end = fileStart + 8192, k = end;
    while (k > fileStart && bytes[k - 1] === 0) k--;
    const length = end - k - 8;
    return length >= minimum ? {fileOffset: k + 8, cpu: cpuStart + (k + 8 - fileStart), length} : null;
  }

  return Object.freeze({version: 1, interpret, encode, trailingFill, firstSlot: FIRST_SLOT, lowLine: LOW_LINE,
    blankTile, step});
});
