'use strict';
// Synthetic teaching format, authored for this tutorial. This is NOT an NES
// game decoder or evidence that any commercial title is supported.
const assert = require('node:assert/strict');

// File layout: 16-byte header, 16-byte RLE storage, 16 protected sentinel bytes.
// Header [0..3] identifies this format; [4..5] is a little-endian data pointer.
// Each stream pair is [count, tile], with count=0 terminating the stream.
const DATA = 16, CAPACITY = 16, CELLS = 8;
function decode(rom) {
  assert.equal(rom.length, 48);
  assert.deepEqual([...rom.slice(0, 4)], [0x4e, 0x46, 0x45, 1]);
  const start = rom[4] | rom[5] << 8;
  assert.equal(start, DATA);
  const cells = [];
  let ended = false;
  for (let p = start; p < DATA + CAPACITY;) {
    const count = rom[p++];
    if (!count) { ended = true; break; }
    assert(p < DATA + CAPACITY, 'Missing RLE operand');
    const tile = rom[p++];
    assert(cells.length + count <= CELLS, 'RLE overrun');
    cells.push(...Array(count).fill(tile));
  }
  assert(ended && cells.length === CELLS, 'Missing terminator or incomplete room');
  return {width: 4, height: 2, cells};
}
function encode(source, room) {
  decode(source); // Validate the source before deriving a new candidate.
  assert.equal(room.cells.length, CELLS);
  assert(room.cells.every(n => Number.isInteger(n) && n >= 0 && n <= 255));
  const stream = [];
  for (let i = 0; i < CELLS;) {
    let count = 1;
    while (i + count < CELLS && room.cells[i + count] === room.cells[i]) count++;
    stream.push(count, room.cells[i]);
    i += count;
  }
  stream.push(0);
  assert(stream.length <= CAPACITY, 'Fixed native storage capacity exceeded');
  const candidate = source.slice();
  candidate.set(stream, DATA); // Do not rewrite the header or protected bytes.
  assert.deepEqual(decode(candidate).cells, room.cells);
  for (let i = 0; i < source.length; i++) {
    if (i < DATA || i >= DATA + CAPACITY) assert.equal(candidate[i], source[i]);
  }
  return candidate;
}
function exercise() {
  const source = new Uint8Array(48).fill(0xaa);
  source.set([0x4e, 0x46, 0x45, 1, DATA, 0], 0);
  source.fill(0, DATA, DATA + CAPACITY);
  source.set([4, 1, 4, 2, 0], DATA);
  const frozen = source.slice();
  const room = decode(source);
  assert.deepEqual(room.cells, [1, 1, 1, 1, 2, 2, 2, 2]);
  room.cells[1] = 3;
  const built = encode(source, room);
  assert.deepEqual(decode(built), room);
  assert.deepEqual(source, frozen, 'The source must remain unchanged');
  const saved = JSON.stringify({source: [...source], room});
  const reopened = JSON.parse(saved);
  assert.deepEqual(encode(Uint8Array.from(reopened.source), reopened.room), built);
  assert.deepEqual(encode(built, decode(built)), built, 'Unchanged derivative is byte-identical');
  assert.throws(() => encode(source, {cells: [0, 1, 2, 3, 4, 5, 6, 7]}), /capacity/);
  const invalid = source.slice(); invalid[4] = 47;
  assert.throws(() => decode(invalid));
  console.log('Synthetic codec exercise passed: decode, edit, encode, reopen, re-import, bounds, protected bytes.');
}
if (require.main === module) exercise();
module.exports = {decode, encode, exercise};
