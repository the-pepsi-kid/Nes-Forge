/* Native Glass Joe pose positions: thirty full records and five incremental
 * records with explicit signed X/Y operands. Position-less incremental records
 * inherit earlier OAM/offsets and are deliberately not invented as editable data.
 *
 * Full poses use PunchOutContent's original shape dispatcher. Incremental views
 * use PunchOutStates to retain real preceding OAM along a declared state path.
 * This pure codec owns no project, live emulator, hidden placement or timing.
 */
(function(root, factory) {
  const node = typeof module !== 'undefined' && module.exports;
  const api = factory(node ? require('./punch-out-content.js') : root.PunchOutContent,
    node ? require('./punch-out-states.js') : root.PunchOutStates);
  if (node) module.exports = api; else root.PunchOutPose = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(content, states) {
  'use strict';
  const fail = message => { throw Error('Punch-Out native pose: ' + message); };
  const signed = value => ((value + 128) & 255) - 128;
  const integer = value => Number.isInteger(value) && value >= -128 && value <= 127;
  const copy = value => JSON.parse(JSON.stringify(value));
  const hex = value => value.toString(16).toUpperCase().padStart(2, '0');
  const offsets = Object.freeze([156,169,182,195,208,221,234,243,252,263,274,285,294,303,312,
    323,332,343,352,363,372,381,390,399,408,417,426,435,444,453]);

  // File offsets include the iNES header. The protected byte immediately before
  // each pair is the native "explicit position" flag. Table pointers/streams,
  // that flag, tile inheritance and all state commands remain protected.
  const incrementalPositions = Object.freeze([
    {selector: 0x84, recordOffset: 478, offset: 479, table: 1, state: 3, update: 6},
    {selector: 0xC0, recordOffset: 489, offset: 490, table: 2, state: 1, update: 0},
    {selector: 0xC2, recordOffset: 496, offset: 497, table: 2, state: 1, update: 11},
    {selector: 0xC4, recordOffset: 503, offset: 504, table: 2, state: 1, update: 6},
    {selector: 0xC6, recordOffset: 510, offset: 511, table: 2, state: 5, update: 10}
  ].map(Object.freeze));
  const idleSelectors = Object.freeze([0xC0, 0xC2, 0xC4]);

  // The source $D043 routine derives priority for the $C0-family records:
  // native OAM Y >= $50 is behind the background. This is a consequence of
  // position, not permission to write attribute streams or arbitrary flags.
  const derivedPriority = record => record.kind === 'incremental' && record.selector >= 0xC0;
  const positionAttributes = (record, piece, dy) => derivedPriority(record)
    ? (piece.attributes & 223) | (piece.y - 1 + dy >= 0x50 ? 32 : 0) : piece.attributes;

  function inventory() {
    return [...offsets.map((_, i) => ({selector: i * 2, kind: 'full',
      label: 'Glass Joe · pose $' + hex(i * 2)})),
    ...incrementalPositions.map(item => ({selector: item.selector, kind: 'incremental',
      label: 'Glass Joe · incremental $' + hex(item.selector) +
        (idleSelectors.includes(item.selector) ? ' · idle' : ' · state $' + hex(item.state))}))];
  }

  function frame(pose, fight, id, sceneId) {
    const anchorX = pose.anchorX ?? fight.baseX, anchorY = pose.anchorY ?? fight.baseY;
    return {id, name: 'Native Glass Joe · ' + (pose.selector >= 128 ? 'incremental pose $' : 'pose $') + hex(pose.selector),
      sceneId, spriteMode: pose.spriteMode, originX: 0, originY: 0,
      pieces: pose.pieces.map(piece => ({id: 'oam-' + piece.slot, tile: piece.tile,
        tile2: (piece.tile + 1) & 255, x: signed(piece.x - anchorX),
        y: signed(piece.y - 1 - anchorY) + 1, pal: piece.attributes & 3,
        flipH: !!(piece.attributes & 64), flipV: !!(piece.attributes & 128), behind: !!(piece.attributes & 32)}))};
  }

  function open(input) {
    const bytes = Uint8Array.from(input), model = content.open(bytes), fight = model.fights[0];
    if (fight.bank8KiB !== 0 || fight.spriteMode !== 8 || fight.poses.length !== offsets.length ||
      fight.poses.some((record, i) => record.fileOffset !== offsets[i] || record.selector !== i * 2))
      fail('Glass Joe full-pose pointer graph differs from the supported source.');
    for (const item of incrementalPositions) {
      const at = 16 + fight.shapeTables[item.table] - 0x8000 + (item.selector & 63);
      const address = bytes[at] | bytes[at + 1] << 8;
      if (address !== 0x8000 + item.recordOffset - 16 || bytes[item.recordOffset] !== 1)
        fail('The incremental pose does not retain its verified pointer and explicit-position flag.');
    }
    let stateReader;
    const observed = new Map();

    function incrementalPose(item) {
      if (!observed.has(item.selector)) {
        stateReader ||= states.open(bytes);
        let sample;
        const trace = stateReader.trace(0, item.state, {maxUpdates: item.update + 1,
          onUpdate(value) {if (value.update === item.update) sample = value;}});
        const display = trace.frames.at(-1);
        if (!trace.editable || !sample || sample.ram[0xA1] !== item.selector ||
          display?.spriteMode !== 8 || display.status !== 'decoded' || !display.pieces.length)
          fail('The declared incremental pose requires unsupported prior state.');
        // Display holds may coalesce equal OAM across selectors. RAM at the exact
        // native update proves which command ran; a coalesced display label does not.
        observed.set(item.selector, {...display, fight: 0, selector: item.selector,
          anchorX: sample.ram[0xB0], anchorY: sample.ram[0xB1]});
      }
      return copy(observed.get(item.selector));
    }

    function record(selector) {
      const item = incrementalPositions.find(item => item.selector === selector);
      if (item) {
        const pose = incrementalPose(item);
        return {selector, kind: 'incremental', offset: item.offset,
          x: signed(bytes[item.offset]), y: signed(bytes[item.offset + 1]),
          context: {state: item.state, update: item.update, initialFullPose: 0,
            anchorX: pose.anchorX, anchorY: pose.anchorY}, pose, fight};
      }
      if (!Number.isInteger(selector) || selector < 0 || selector > 58 || selector & 1)
        fail('Choose a listed full pose or an incremental pose with explicit position bytes.');
      const source = fight.poses[selector / 2], pose = model.pose(0, selector);
      if (pose.status !== 'decoded' || pose.spriteMode !== 8 || !pose.pieces.length)
        fail('This pose requires unsupported prior state.');
      return {selector, kind: 'full', offset: source.fileOffset, x: signed(bytes[source.fileOffset]),
        y: signed(bytes[source.fileOffset + 1]), context: null, pose, fight};
    }

    function placement(selector, actual, baseline) {
      const r = record(selector);
      if (!actual || !baseline || actual.pieces?.length !== baseline.pieces.length || !baseline.pieces.length)
        fail('The native pose must retain every original OAM piece and its order.');
      let dx, dy;
      actual.pieces.forEach((piece, index) => {
        const original = baseline.pieces[index];
        if (Object.keys(piece).sort().join(',') !== Object.keys(original).sort().join(',') ||
          Object.keys(original).some(key => !['x', 'y', ...(derivedPriority(r) ? ['behind'] : [])].includes(key) && piece[key] !== original[key]))
          fail('Only whole-pose position has a native writer here. Preserve piece tiles, flags, order and identity.');
        const x = piece.x - actual.originX - original.x + baseline.originX;
        const y = piece.y - actual.originY - original.y + baseline.originY;
        if (!Number.isInteger(x) || !Number.isInteger(y) || index && (x !== dx || y !== dy))
          fail('Move the complete pose together. Individual geometry edits remain savable but cannot build natively.');
        if (derivedPriority(r) && piece.behind !== !!(positionAttributes(r, r.pose.pieces[index], y) & 32))
          fail('Native priority follows the OAM Y=$50 divider. Use Native X/Y controls to update the derived flag; manual priority edits have no writer.');
        dx = x; dy = y;
      });
      const x = r.x + dx, y = r.y + dy;
      if (!integer(x) || !integer(y)) fail('Native pose offsets must stay between -128 and 127.');
      return {selector, offset: r.offset, x, y, dx, dy, kind: r.kind, context: r.context};
    }

    function moveFrame(selector, actual, x, y) {
      const r = record(selector), baseline = frame(r.pose, fight, actual.id, actual.sceneId);
      placement(selector, actual, baseline);
      if (!integer(x) || !integer(y)) fail('Native X/Y offsets must be -128 through 127.');
      const next = copy(actual), dx = x - r.x, dy = y - r.y;
      next.originX = 0; next.originY = 0;
      next.pieces.forEach((piece, i) => {
        piece.x = baseline.pieces[i].x + dx; piece.y = baseline.pieces[i].y + dy;
        piece.behind = !!(positionAttributes(r, r.pose.pieces[i], dy) & 32);
      });
      return next;
    }

    function encode(inputBytes, edits) {
      const output = Uint8Array.from(inputBytes), seen = new Set();
      if (output.length !== bytes.length) fail('Source container length changed.');
      for (const edit of edits) {
        const r = record(edit.selector);
        if (seen.has(edit.selector) || !integer(edit.x) || !integer(edit.y)) fail('Invalid or duplicate placement.');
        seen.add(edit.selector); output[r.offset] = edit.x & 255; output[r.offset + 1] = edit.y & 255;
      }
      const candidate = open(output);
      for (const edit of edits) {
        const r = record(edit.selector), next = candidate.record(edit.selector).pose;
        const dx = edit.x - r.x, dy = edit.y - r.y;
        if (next.status !== 'decoded' || next.pieces.length !== r.pose.pieces.length || next.chrBank4KiB !== r.pose.chrBank4KiB)
          fail('This position changes source visibility or shape context. Choose a smaller offset.');
        r.pose.pieces.forEach((piece, i) => {
          const q = next.pieces[i];
          if (q.slot !== piece.slot || q.x !== ((piece.x + dx) & 255) || q.y !== piece.y + dy ||
            q.tile !== piece.tile || q.attributes !== positionAttributes(r, piece, dy))
            fail('The original shape reader did not reproduce the requested placement.');
        });
      }
      return output;
    }

    return Object.freeze({record, placement, moveFrame, encode,
      frame: (selector, id, sceneId) => frame(record(selector).pose, fight, id, sceneId), inventory: inventory()});
  }
  return Object.freeze({version: 2, open, offsets, incrementalPositions, idleSelectors, inventory});
});
