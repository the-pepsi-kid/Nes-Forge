/*
 * NES FORGE MODULE: src/re/punch-out-layout.js
 * Entry: PunchOutLayout
 * Purpose: Independent native PPU-command interpreter; records literal provenance and protected metadata.
 * Connections: native-punch-out-resources.js uses program() for static pages and arenaPrograms() for derivative validation.
 * Contract: No project mutation or live emulator access. Native CPU-loader comparisons provide a separate oracle.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Bounded independent interpretation of native C113–C247 PPU commands.
 * Original patterns, palettes and layouts are read from the supplied file. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PunchOutLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function open(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 0x1a010) throw Error(
      'Incomplete Punch-Out source bank');
    const base = 0x18010,
      b = a => {
        if (a < 0x8000 || a > 0x9fff) throw Error('Bank bounds ' + a.toString(16));
        return bytes[base + a - 0x8000];
      },
      w = a => b(a) | b(a + 1) << 8;
    const protectedOffsets = new Set(),
      literal = new Set();
    const meta = a => {
        protectedOffsets.add(base + a - 0x8000);
        return b(a);
      },
      mw = a => meta(a) | meta(a + 1) << 8;

    function program(id, streamRange = null) {
      if (!Number.isInteger(id) || id < 0 || id > 94) throw Error(
        "Punch-Out source program index out of bounds");
      let rec = mw(mw(0x8002) + id * 2);
      if (!rec) return null;
      let target = mw(rec),
        writes = [],
        steps = 0;
      rec += 2;
      for (let section = 0; section < 64; section++) {
        if (!meta(rec)) return {
          id,
          writes
        };
        const start = mw(rec + 1);
        rec += 3;
        let y = 0, consumed = 0;
        // Native commands index each stream with an 8-bit Y register. An arena
        // derivative must terminate before wrapping and stay in its owned area.
        const peek = () => {
          if (streamRange && (consumed >= 256 || start + y < streamRange.start ||
              start + y >= streamRange.end)) {
            throw Error('Arena command stream leaves its owned data area or wraps Y');
          }
          return b(start + y);
        };
        const take = (control = true) => {
            peek();
            const at = start + y;
            y = (y + 1) & 255;
            consumed++;
            return {
              value: control ? meta(at) : b(at),
              offset: base + at - 0x8000
            };
          },
          emit = (v, o = null) => {
            writes.push({
              address: target & 16383,
              value: v & 255,
              offset: o
            });
            target++;
            if (writes.length > 8192) throw Error('Write budget');
          };
        let rowBase = target;
        for (;;) {
          if (++steps > 8192) throw Error('Instruction budget');
          const cmd = take().value;
          if (!cmd) break;
          let n = cmd & 15,
            t = cmd >> 4;
          if (t === 0) {
            const v = take().value;
            for (let k = 0; k < (n || 256); k++) emit(v + k);
          } else if (t < 5) {
            for (let k = 0; k < (n || 256); k++) {
              const v = take(false);
              literal.add(v.offset);
              emit(v.value, v.offset);
            }
          } else if (t === 5) {
            const count = take().value,
              v = take().value;
            for (let j = 0; j < (n || 256); j++)
              for (let k = 0; k < (count || 256); k++) emit(v + k);
          } else if (t < 8) {
            const count = take().value,
              save = y,
              data = [];
            for (let k = 0; k < (count || 256); k++) {
              const v = take(false);
              literal.add(v.offset);
              data.push(v);
            }
            for (let j = 0; j < (n || 256); j++)
              for (const v of data) emit(v.value, v.offset);
          } else if (t === 8) {
            while (peek() >> 4 === 8) n = (n + (take().value & 15)) & 255;
            target = (rowBase + n) & 65535;
          } else if (t === 9) {
            rowBase = (rowBase + 32) & 65535;
            target = rowBase;
          } else if (t < 15) {
            const v = take(false);
            literal.add(v.offset);
            for (let j = 0; j < (n || 32); j++) emit(v.value, v.offset);
          } else
            for (let j = 0; j < (n || 32); j++) emit(255);
        }
      }
      throw Error('Section budget');
    }
    return {
      program,
      protectedOffsets,
      literal,
      b,
      w
    };
  }
  /** Validate re-importable arena data independently of Forge's encoder.
   * The arena loader uses table $8000; the generic screen reader uses $8002.
   * Redirect a private copy so both use the same bounded command interpreter.
   * Descriptors remain protected by the source identity; only stream pointers
   * and the exclusive $9190-$930C data range may differ from the original.
   */
  function arenaPrograms(bytes) {
    const redirected = bytes.slice();
    redirected[0x18012] = redirected[0x18010];
    redirected[0x18013] = redirected[0x18011];
    const source = open(redirected);
    const writes = [1, 2].flatMap(id => {
      const result = source.program(id, {start: 0x9190, end: 0x930d});
      if (!result) throw Error('Missing arena source program');
      return result.writes;
    });
    if (writes.length !== 2048 || writes.some((w, i) => w.address !== 0x2000 + i)) {
      throw Error('Arena programs must initialize their two complete native pages');
    }
    return writes;
  }
  return Object.freeze({open, arenaPrograms});
});
