/* Native Glass Joe full-pose placement codec.
 * A full pose starts with signed X/Y offsets, followed by shared geometry,
 * attribute and tile-stream pointers. Only the two offsets belong to this
 * writer. The original CPU shape reader independently checks the result.
 * This module is pure: no project, editor, live emulator or source mutation.
 */
(function(root, factory) {
  const node = typeof module !== 'undefined' && module.exports;
  const api = factory(node ? require('./punch-out-content.js') : root.PunchOutContent);
  if (node) module.exports = api; else root.PunchOutPose = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(content) {
  'use strict';
  const fail = message => { throw Error('Punch-Out native pose: ' + message); };
  const signed = value => ((value + 128) & 255) - 128;
  const integer = value => Number.isInteger(value) && value >= -128 && value <= 127;
  const offsets = Object.freeze([156,169,182,195,208,221,234,243,252,263,274,285,294,303,312,
    323,332,343,352,363,372,381,390,399,408,417,426,435,444,453]);
  function frame(pose, fight, id, sceneId) {
    return {id, name: 'Native Glass Joe · pose $' + pose.selector.toString(16).toUpperCase().padStart(2, '0'),
      sceneId, spriteMode: pose.spriteMode, originX: 0, originY: 0,
      pieces: pose.pieces.map(piece => ({id: 'oam-' + piece.slot, tile: piece.tile,
        tile2: (piece.tile + 1) & 255, x: signed(piece.x - fight.baseX),
        y: signed(piece.y - 1 - fight.baseY) + 1, pal: piece.attributes & 3,
        flipH: !!(piece.attributes & 64), flipV: !!(piece.attributes & 128), behind: !!(piece.attributes & 32)}))};
  }
  function open(input) {
    const bytes = Uint8Array.from(input), model = content.open(bytes), fight = model.fights[0];
    if (fight.bank8KiB !== 0 || fight.spriteMode !== 8 || fight.poses.length !== offsets.length ||
      fight.poses.some((record, i) => record.fileOffset !== offsets[i] || record.selector !== i * 2))
      fail('Glass Joe full-pose pointer graph differs from the supported source.');
    function record(selector) {
      if (!Number.isInteger(selector) || selector < 0 || selector > 58 || selector & 1)
        fail('Choose a Glass Joe full-pose selector from $00 through $3A.');
      const source = fight.poses[selector / 2], pose = model.pose(0, selector);
      if (pose.status !== 'decoded' || pose.spriteMode !== 8 || !pose.pieces.length)
        fail('This pose requires unsupported prior state.');
      return {selector, offset: source.fileOffset, x: signed(bytes[source.fileOffset]),
        y: signed(bytes[source.fileOffset + 1]), pose, fight};
    }
    function placement(selector, actual, baseline) {
      const r = record(selector);
      if (!actual || actual.pieces?.length !== baseline.pieces.length || !baseline.pieces.length)
        fail('The native pose must retain every original OAM piece and its order.');
      let dx, dy;
      actual.pieces.forEach((piece, index) => {
        const original = baseline.pieces[index];
        if (Object.keys(piece).sort().join(',') !== Object.keys(original).sort().join(',') ||
          Object.keys(original).some(key => !['x', 'y'].includes(key) && piece[key] !== original[key]))
          fail('Only whole-pose position has a native writer here. Preserve piece tiles, flags, order and identity.');
        const x = piece.x - actual.originX - original.x + baseline.originX;
        const y = piece.y - actual.originY - original.y + baseline.originY;
        if (!Number.isInteger(x) || !Number.isInteger(y) || index && (x !== dx || y !== dy))
          fail('Move the complete pose together. Individual geometry edits remain savable but cannot build natively.');
        dx = x; dy = y;
      });
      const x = r.x + dx, y = r.y + dy;
      if (!integer(x) || !integer(y)) fail('Native pose offsets must stay between -128 and 127.');
      return {selector, offset: r.offset, x, y, dx, dy};
    }
    function encode(inputBytes, edits) {
      const output = Uint8Array.from(inputBytes), seen = new Set();
      if (output.length !== bytes.length) fail('Source container length changed.');
      for (const edit of edits) {
        const r = record(edit.selector);
        if (seen.has(edit.selector) || !integer(edit.x) || !integer(edit.y)) fail('Invalid or duplicate placement.');
        seen.add(edit.selector); output[r.offset] = edit.x & 255; output[r.offset + 1] = edit.y & 255;
      }
      const candidate = content.open(output);
      for (const edit of edits) {
        const r = record(edit.selector), next = candidate.pose(0, edit.selector), dx = edit.x - r.x, dy = edit.y - r.y;
        if (next.status !== 'decoded' || next.pieces.length !== r.pose.pieces.length || next.chrBank4KiB !== r.pose.chrBank4KiB)
          fail('This position changes source visibility or shape context. Choose a smaller offset.');
        r.pose.pieces.forEach((piece, i) => {
          const q = next.pieces[i];
          if (q.slot !== piece.slot || q.x !== ((piece.x + dx) & 255) || q.y !== piece.y + dy ||
            q.tile !== piece.tile || q.attributes !== piece.attributes)
            fail('The original shape reader did not reproduce the requested placement.');
        });
      }
      return output;
    }
    return Object.freeze({record, placement, encode, frame: (selector, id, sceneId) => frame(record(selector).pose, fight, id, sceneId),
      inventory: fight.poses.map(record => ({selector: record.selector, label: 'Glass Joe · pose $' + record.selector.toString(16).toUpperCase().padStart(2, '0')}))});
  }
  return Object.freeze({version: 1, open, offsets});
});
