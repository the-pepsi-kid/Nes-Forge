/*
 * NES FORGE MODULE: src/re/punch-out-art.js
 * Physical 4 KiB CHR and 32-byte fight-palette codec. The native resource owner
 * validates revision identity; this pure codec validates bitplanes, source table
 * pointers and color aliases. It never changes input, project state or an emulator.
 */
(function(root, factory) {
  const node = typeof module !== 'undefined' && module.exports;
  const api = factory(node ? require('./punch-out-content.js') : root.PunchOutContent);
  if (node) module.exports = api; else root.PunchOutArt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(content) {
  'use strict';
  const fail = m => { throw Error('Punch-Out native artwork: ' + m); };
  function number(v, max) { if (!Number.isInteger(v) || v < 0 || v > max) fail('Invalid art index/value'); return v; }
  function packChr(tiles) {
    if (!Array.isArray(tiles) || tiles.length !== 256) fail('A physical bank needs 256 tiles');
    const out = new Uint8Array(4096);
    tiles.forEach((tile, t) => {
      if (!Array.isArray(tile) || tile.length !== 8) fail('A tile needs eight rows');
      tile.forEach((row, y) => {
        if (!Array.isArray(row) || row.length !== 8) fail('A tile row needs eight pixels');
        row.forEach((pixel, x) => { number(pixel, 3); out[t * 16 + y] |= (pixel & 1) << (7 - x);
          out[t * 16 + y + 8] |= (pixel >> 1) << (7 - x); });
      });
    });
    return out;
  }
  function paletteBytes(scene, original = null) {
    if (original !== null && (!(original instanceof Uint8Array) || original.length !== 32)) fail('Original palette flag bytes are required');
    const bg = number(scene.bgColor, 63), values = [];
    for (const groups of [scene.pal, scene.sprPal]) {
      if (!Array.isArray(groups) || groups.length !== 4) fail('Palette needs four groups');
      for (const row of groups) {
        if (!Array.isArray(row) || row.length !== 4) fail('Palette group needs four slots');
        row.forEach(v => values.push(number(v, 63)));
        if (row[0] !== bg) fail('Universal color aliases must agree with the Scene background color');
      }
    }
    // High source bits participate in native palette/fade behavior. A color edit
    // owns the six PPU color bits only; retain the source flags byte for byte.
    return Uint8Array.from(values, (v, i) => v | (original ? original[i] & 192 : 0));
  }
  function open(input) {
    const bytes = Uint8Array.from(input), model = content.open(bytes);
    function bank(index) { number(index, 31); return {bank: index, offset: 0x20010 + index * 4096, chr: model.chr(index)}; }
    function palette(index) {
      number(index, 13); const fight = model.fights[index], raw = bytes.slice(fight.paletteFileOffset, fight.paletteFileOffset + 32);
      if (raw.some((v, i) => !(i & 3) && (v & 63) !== (raw[0] & 63)))
        fail('Source palette has unsupported color/alias state');
      return {fight: index, label: fight.label, offset: fight.paletteFileOffset, bgColor: raw[0] & 63,
        pal: Array.from({length: 4}, (_, p) => Array.from(raw.slice(p * 4, p * 4 + 4), v => v & 63)),
        sprPal: Array.from({length: 4}, (_, p) => Array.from(raw.slice(16 + p * 4, 20 + p * 4), v => v & 63))};
    }
    // Validate every palette even for a single-bank operation. Derivatives cannot
    // hide a lossy unrepresentable palette behind the broader art identity mask.
    for (let i = 0; i < 14; i++) palette(i);
    return Object.freeze({bank, palette, fights: model.fights.map(f => ({index: f.index, label: f.label}))});
  }
  return Object.freeze({version: 1, open, packChr, paletteBytes});
});
