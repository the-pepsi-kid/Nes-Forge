/*
 * NES FORGE MODULE: src/re/native-punch-out-resources.js
 * Entry: NativePRGResources (adds Punch-Out adapters)
 * Purpose: Profiles and shared-operand recipes for the five static background contexts.
 * Connections: Extends the preceding adapter chain; NativeResourceProject calls inspect(), projectPage(), and encode().
 * Contract: derivativeIdentity admits arena builds for recognition only. Recipe spans and Scene-encoder spans stay separate.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Five static source staging contexts. Shared physical literal bytes retain one
 * recipe owner. Rendering keeps their real nametable placement and CHR bank.
 * Fighter layers, timing, sprites, alternate states and interactions are separate. */
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require(
    './native-shadowgate-resources.js'), require('./punch-out-layout.js'));
  else root.NativePRGResources = factory(root.NativePRGResources, root.PunchOutLayout);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(parent, codec) {
  'use strict';
  // Extra recognition spans cover only the four arena pointers and their 381-byte
  // arena data area. These are NOT additional native literal-brush permissions.
  const profiles = Object.freeze([{
    "id": "punch-out-us-prg0-screens-v1",
    "kind": "punch-out",
    "sha256": "0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952",
    "byteLength": 262160,
    "protectedSha256": "7ca5e0f33f82e8cb72c93b2fb410bd42439dcfb3ec493191d00f2ffa55ef2557",
    "spans": [{
      "offset": 99472,
      "length": 1
    }, {
      "offset": 99474,
      "length": 1
    }, {
      "offset": 99476,
      "length": 1
    }, {
      "offset": 99491,
      "length": 1
    }, {
      "offset": 99493,
      "length": 1
    }, {
      "offset": 99495,
      "length": 3
    }, {
      "offset": 99499,
      "length": 1
    }, {
      "offset": 99501,
      "length": 1
    }, {
      "offset": 99516,
      "length": 1
    }, {
      "offset": 99518,
      "length": 1
    }, {
      "offset": 99522,
      "length": 1
    }, {
      "offset": 99524,
      "length": 1
    }, {
      "offset": 99540,
      "length": 2
    }, {
      "offset": 100780,
      "length": 1
    }, {
      "offset": 100783,
      "length": 13
    }, {
      "offset": 100797,
      "length": 1
    }, {
      "offset": 100801,
      "length": 9
    }, {
      "offset": 100812,
      "length": 10
    }, {
      "offset": 100825,
      "length": 10
    }, {
      "offset": 100837,
      "length": 12
    }, {
      "offset": 100852,
      "length": 11
    }, {
      "offset": 100865,
      "length": 9
    }, {
      "offset": 100877,
      "length": 10
    }, {
      "offset": 100889,
      "length": 12
    }, {
      "offset": 100904,
      "length": 4
    }, {
      "offset": 100910,
      "length": 5
    }, {
      "offset": 100918,
      "length": 8
    }, {
      "offset": 100928,
      "length": 9
    }, {
      "offset": 100941,
      "length": 11
    }, {
      "offset": 100953,
      "length": 7
    }, {
      "offset": 100964,
      "length": 10
    }, {
      "offset": 101000,
      "length": 8
    }, {
      "offset": 101010,
      "length": 7
    }, {
      "offset": 101025,
      "length": 1
    }, {
      "offset": 101034,
      "length": 9
    }, {
      "offset": 101048,
      "length": 6
    }, {
      "offset": 101055,
      "length": 9
    }, {
      "offset": 101068,
      "length": 11
    }, {
      "offset": 101080,
      "length": 6
    }, {
      "offset": 101088,
      "length": 12
    }, {
      "offset": 101103,
      "length": 5
    }, {
      "offset": 101111,
      "length": 7
    }, {
      "offset": 101121,
      "length": 1
    }, {
      "offset": 101123,
      "length": 1
    }, {
      "offset": 101128,
      "length": 15
    }, {
      "offset": 101144,
      "length": 1
    }, {
      "offset": 101149,
      "length": 15
    }, {
      "offset": 101168,
      "length": 4
    }, {
      "offset": 101174,
      "length": 2
    }, {
      "offset": 101182,
      "length": 14
    }, {
      "offset": 101197,
      "length": 12
    }, {
      "offset": 101215,
      "length": 13
    }, {
      "offset": 101232,
      "length": 7
    }, {
      "offset": 101243,
      "length": 15
    }, {
      "offset": 101259,
      "length": 1
    }, {
      "offset": 101449,
      "length": 11
    }, {
      "offset": 101463,
      "length": 8
    }, {
      "offset": 101474,
      "length": 9
    }, {
      "offset": 101486,
      "length": 8
    }, {
      "offset": 101497,
      "length": 10
    }, {
      "offset": 101512,
      "length": 15
    }, {
      "offset": 101528,
      "length": 5
    }, {
      "offset": 101536,
      "length": 15
    }, {
      "offset": 101552,
      "length": 5
    }, {
      "offset": 101560,
      "length": 15
    }, {
      "offset": 101576,
      "length": 5
    }, {
      "offset": 101584,
      "length": 15
    }, {
      "offset": 101600,
      "length": 5
    }, {
      "offset": 101608,
      "length": 15
    }, {
      "offset": 101624,
      "length": 5
    }, {
      "offset": 101634,
      "length": 15
    }, {
      "offset": 101650,
      "length": 7
    }, {
      "offset": 101659,
      "length": 15
    }, {
      "offset": 101675,
      "length": 7
    }, {
      "offset": 101684,
      "length": 15
    }, {
      "offset": 101700,
      "length": 7
    }, {
      "offset": 101709,
      "length": 15
    }, {
      "offset": 101725,
      "length": 7
    }, {
      "offset": 101734,
      "length": 15
    }, {
      "offset": 101750,
      "length": 7
    }, {
      "offset": 101762,
      "length": 6
    }, {
      "offset": 101772,
      "length": 3
    }, {
      "offset": 101779,
      "length": 11
    }, {
      "offset": 101794,
      "length": 13
    }, {
      "offset": 101811,
      "length": 10
    }, {
      "offset": 101824,
      "length": 11
    }, {
      "offset": 101839,
      "length": 11
    }, {
      "offset": 101855,
      "length": 14
    }, {
      "offset": 101875,
      "length": 11
    }, {
      "offset": 101896,
      "length": 2
    }, {
      "offset": 101903,
      "length": 1
    }, {
      "offset": 101908,
      "length": 2
    }, {
      "offset": 101914,
      "length": 2
    }, {
      "offset": 101920,
      "length": 2
    }, {
      "offset": 101926,
      "length": 2
    }, {
      "offset": 101932,
      "length": 2
    }, {
      "offset": 101938,
      "length": 2
    }],
    "derivativeIdentity": {
      "spans": [{
        "offset": 102795,
        "length": 2
      }, {
        "offset": 102798,
        "length": 2
      }, {
        "offset": 102804,
        "length": 2
      }, {
        "offset": 102807,
        "length": 2
      }, {
        "offset": 102816,
        "length": 381
      }],
      "protectedSha256": "356e71dc75ecf38ef6218b74904361739992badbc35b726392bb210e84e10366"
    }
  }, {
    "id": "punch-out-us-prg1-screens-v1",
    "kind": "punch-out",
    "sha256": "22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e",
    "byteLength": 262160,
    "protectedSha256": "4f9ac142f3ed8b11e22286440852de92de1caa3b85c182b74dfb826b96a22993",
    "spans": [{
      "offset": 99472,
      "length": 1
    }, {
      "offset": 99474,
      "length": 1
    }, {
      "offset": 99476,
      "length": 1
    }, {
      "offset": 99491,
      "length": 1
    }, {
      "offset": 99493,
      "length": 1
    }, {
      "offset": 99495,
      "length": 3
    }, {
      "offset": 99499,
      "length": 1
    }, {
      "offset": 99501,
      "length": 1
    }, {
      "offset": 99516,
      "length": 1
    }, {
      "offset": 99518,
      "length": 1
    }, {
      "offset": 99522,
      "length": 1
    }, {
      "offset": 99524,
      "length": 1
    }, {
      "offset": 99540,
      "length": 2
    }, {
      "offset": 100780,
      "length": 1
    }, {
      "offset": 100783,
      "length": 13
    }, {
      "offset": 100797,
      "length": 1
    }, {
      "offset": 100801,
      "length": 9
    }, {
      "offset": 100812,
      "length": 10
    }, {
      "offset": 100825,
      "length": 10
    }, {
      "offset": 100837,
      "length": 12
    }, {
      "offset": 100852,
      "length": 11
    }, {
      "offset": 100865,
      "length": 9
    }, {
      "offset": 100877,
      "length": 10
    }, {
      "offset": 100889,
      "length": 12
    }, {
      "offset": 100904,
      "length": 4
    }, {
      "offset": 100910,
      "length": 5
    }, {
      "offset": 100918,
      "length": 8
    }, {
      "offset": 100928,
      "length": 9
    }, {
      "offset": 100941,
      "length": 11
    }, {
      "offset": 100953,
      "length": 7
    }, {
      "offset": 100964,
      "length": 10
    }, {
      "offset": 101000,
      "length": 8
    }, {
      "offset": 101010,
      "length": 7
    }, {
      "offset": 101025,
      "length": 1
    }, {
      "offset": 101034,
      "length": 9
    }, {
      "offset": 101048,
      "length": 6
    }, {
      "offset": 101055,
      "length": 9
    }, {
      "offset": 101068,
      "length": 11
    }, {
      "offset": 101080,
      "length": 6
    }, {
      "offset": 101088,
      "length": 12
    }, {
      "offset": 101103,
      "length": 5
    }, {
      "offset": 101111,
      "length": 7
    }, {
      "offset": 101121,
      "length": 1
    }, {
      "offset": 101123,
      "length": 1
    }, {
      "offset": 101128,
      "length": 15
    }, {
      "offset": 101144,
      "length": 1
    }, {
      "offset": 101149,
      "length": 15
    }, {
      "offset": 101168,
      "length": 4
    }, {
      "offset": 101174,
      "length": 2
    }, {
      "offset": 101182,
      "length": 14
    }, {
      "offset": 101197,
      "length": 12
    }, {
      "offset": 101215,
      "length": 13
    }, {
      "offset": 101232,
      "length": 7
    }, {
      "offset": 101243,
      "length": 15
    }, {
      "offset": 101259,
      "length": 1
    }, {
      "offset": 101449,
      "length": 11
    }, {
      "offset": 101463,
      "length": 8
    }, {
      "offset": 101474,
      "length": 9
    }, {
      "offset": 101486,
      "length": 8
    }, {
      "offset": 101497,
      "length": 10
    }, {
      "offset": 101512,
      "length": 15
    }, {
      "offset": 101528,
      "length": 5
    }, {
      "offset": 101536,
      "length": 15
    }, {
      "offset": 101552,
      "length": 5
    }, {
      "offset": 101560,
      "length": 15
    }, {
      "offset": 101576,
      "length": 5
    }, {
      "offset": 101584,
      "length": 15
    }, {
      "offset": 101600,
      "length": 5
    }, {
      "offset": 101608,
      "length": 15
    }, {
      "offset": 101624,
      "length": 5
    }, {
      "offset": 101634,
      "length": 15
    }, {
      "offset": 101650,
      "length": 7
    }, {
      "offset": 101659,
      "length": 15
    }, {
      "offset": 101675,
      "length": 7
    }, {
      "offset": 101684,
      "length": 15
    }, {
      "offset": 101700,
      "length": 7
    }, {
      "offset": 101709,
      "length": 15
    }, {
      "offset": 101725,
      "length": 7
    }, {
      "offset": 101734,
      "length": 15
    }, {
      "offset": 101750,
      "length": 7
    }, {
      "offset": 101762,
      "length": 6
    }, {
      "offset": 101772,
      "length": 3
    }, {
      "offset": 101779,
      "length": 11
    }, {
      "offset": 101794,
      "length": 13
    }, {
      "offset": 101811,
      "length": 10
    }, {
      "offset": 101824,
      "length": 11
    }, {
      "offset": 101839,
      "length": 11
    }, {
      "offset": 101855,
      "length": 14
    }, {
      "offset": 101875,
      "length": 11
    }, {
      "offset": 101896,
      "length": 2
    }, {
      "offset": 101903,
      "length": 1
    }, {
      "offset": 101908,
      "length": 2
    }, {
      "offset": 101914,
      "length": 2
    }, {
      "offset": 101920,
      "length": 2
    }, {
      "offset": 101926,
      "length": 2
    }, {
      "offset": 101932,
      "length": 2
    }, {
      "offset": 101938,
      "length": 2
    }],
    "derivativeIdentity": {
      "spans": [{
        "offset": 102795,
        "length": 2
      }, {
        "offset": 102798,
        "length": 2
      }, {
        "offset": 102804,
        "length": 2
      }, {
        "offset": 102807,
        "length": 2
      }, {
        "offset": 102816,
        "length": 381
      }],
      "protectedSha256": "db6923c2291d91385edc738de85c12aedd8d9a422dd831d51b70875e83aac994"
    }
  }]);
  const contexts = Object.freeze([{
      key: 'b70e',
      spriteChr: 5,
      chr: 0,
      paletteTable: 6,
      paletteOffset: 0,
      fill: 253,
      programs: [48, 49, 50, 51]
    }, {
      key: 'b88d',
      spriteChr: 4,
      chr: 7,
      paletteTable: 16,
      paletteOffset: 0,
      fill: 254,
      programs: [86, 87]
    }, {
      key: 'b8cb',
      chr: 7,
      paletteTable: 16,
      paletteOffset: 48,
      fill: 253,
      programs: [55, 56]
    }, {
      key: 'b961-0',
      spriteChr: 4,
      chr: 7,
      paletteTable: 16,
      paletteOffset: 0,
      fill: 254,
      programs: [57, 58]
    }, {
      key: 'b961-2',
      chr: 7,
      paletteTable: 16,
      paletteOffset: 48,
      fill: 254,
      programs: [57, 58, 88, 68]
    }]),
    fail = m => {
      throw Error('Punch-Out native screens: ' + m);
    };

  function inspect(bytes, p) {
    if (!profiles.includes(p)) return parent.inspect(bytes, p);
    if (!(bytes instanceof Uint8Array) || bytes.length !== 262160 || bytes[4] !== 8 || bytes[
      5] !== 16 || bytes[6] !== 144 || bytes[7] !== 0) fail('Unsupported source header');
    codec.arenaPrograms(bytes);
    const source = codec.open(bytes),
      all = [];
    for (let i = 0; i < 95; i++) {
      const a = source.program(i);
      if (a) all.push(a);
    }
    const blocked = new Set(source.protectedOffsets);
    for (const a of all)
      for (const w of a.writes)
        if (w.offset !== null && (!(w.address >= 0x2000 && w.address < 0x3000) || ((w.address -
            0x2000) & 1023) >= 960)) blocked.add(w.offset);
    const resources = [],
      used = new Set();
    for (let index = 0; index < contexts.length; index++) {
      const ctx = contexts[index],
        ppu = Array(2048).fill(0),
        refs = Array(2048).fill(null);
      for (let i = 0; i < 1024; i++) ppu[i] = ctx.fill;
      for (const id of ctx.programs) {
        const program = all.find(v => v.id === id);
        if (!program) fail('Missing native PPU program');
        for (const w of program.writes) {
          if (w.address < 0x2000 || w.address >= 0x3000) fail(
            'A source program leaves the nametables');
          const dest = (w.address - 0x2000) & 2047;
          ppu[dest] = w.value;
          refs[dest] = w.offset;
        }
      }
      const palPtr = source.w(0x8000 + ctx.paletteTable) + ctx.paletteOffset,
        raw = Array.from({
          length: 16
        }, (_, j) => source.b(palPtr + j));
      for (let j = 0; j < 32; j++) blocked.add(0x18010 + palPtr - 0x8000 - ctx.paletteOffset + j +
        ctx.paletteOffset);
      const palette = Array.from({
          length: 4
        }, (_, i) => raw.slice(i * 4, i * 4 + 4).map(v => v & 63)),
        bank0 = parent.bitplanes(bytes.slice(0x20010, 0x21010)),
        bank1 = parent.bitplanes(bytes.slice(0x20010 + ctx.chr * 4096, 0x20010 + (ctx.chr + 1) *
          4096)),
        rowMasks = Array(960).fill(0);
      let latch = 1;
      // Background uses $1000 with MMC2 FD bank 0 and the native FE bank.
      // Warm one static frame, then retain every tile row's actual source bank.
      for (let pass = 0; pass < 2; pass++)
        for (let tr = 0; tr < 30; tr++)
          for (let y = 0; y < 8; y++)
            for (let x = 0; x < 32; x++) {
              const cell = tr * 32 + x,
                t = ppu[cell];
              if (pass && latch) rowMasks[cell] |= 1 << y;
              if (t === 253) latch = 0;
              else if (t === 254) latch = 1;
            }
      const masks = [...new Set([0, 255, ...rowMasks])].sort((a, b) => a - b),
        chr = [],
        blockSets = [];
      for (const mask of masks) {
        const base = chr.length;
        for (let id = 0; id < 256; id++) chr.push(Array.from({
          length: 8
        }, (_, y) => (mask & (1 << y) ? bank1 : bank0)[id][y].slice()));
        blockSets.push(Array.from({
          length: 256
        }, (_, id) => ({
          id,
          tiles: [base + id],
          palettes: [0],
          editable: id !== 253 && id !== 254,
          label: 'Native tile ' + id
        })));
      }
      const cellBlockSets = rowMasks.map(v => masks.indexOf(v)),
        nativeNt = ppu.slice(0, 960),
        projectedNt = nativeNt.map((v, i) => cellBlockSets[i] * 256 + v);
      for (const o of refs.slice(0, 960))
        if (o !== null) used.add(o);
      resources.push({
        id: 'punch-out:' + ctx.key,
        label: 'Screen context ' + (index + 1) + ' · native background',
        group: 'Static source staging contexts',
        layoutId: 'layout:punch-out-literals',
        columns: 32,
        rows: 30,
        blockPixels: 8,
        width: 256,
        height: 240,
        available: true,
        blocks: blockSets[masks.indexOf(255)],
        blockSets,
        cellBlockSets,
        backgroundLatchMasks: masks,
        nativeNt,
        chr,
        palette,
        context: ctx,
        projection: {
          nt: projectedNt,
          attr: ppu.slice(960, 1024)
        },
        sourceRefs: refs.slice(0, 960),
        reason: 'Static native background in the declared source staging context. Fighter/background overlays, sprites, UI updates, scene timing, collision, animation and gameplay state remain unresolved. Native literal/repeat operands can be substituted; generated or inherited cells and metadata aliases refuse. Shared physical operands update together. Audio is available separately.'
      });
    }
    const offsets = [-1, ...[...used].sort((a, b) => a - b)],
      map = new Map(offsets.map((o, i) => [o, i])),
      allowed = new Set(p.spans.flatMap(s => Array.from({
        length: s.length
      }, (_, i) => s.offset + i)));
    for (const r of resources) r.cellMap = r.sourceRefs.map(o => o === null ? 0 : map.get(o));
    for (const o of offsets)
      if (allowed.has(o) && (blocked.has(o) || o < 0x182fc || o >= 0x19180)) fail(
        'Protected source alias in writer');
    const cells = offsets.map(o => o < 0 ? 0 : bytes[o]),
      layout = {
        id: 'layout:punch-out-literals',
        offset: offsets[1],
        length: offsets.at(-1) - offsets[1] + 1,
        codec: 'shared-native-literals',
        columns: offsets.length,
        rows: 1,
        blockCount: 256,
        cells,
        offsets,
        writable: offsets.map(o => allowed.has(o))
      };
    return {
      profile: p,
      resources,
      layouts: [layout],
      totalCells: offsets.length,
      sourceProgramCount: all.length
    };
  }

  function projectPage(c, id, page) {
    if (!profiles.includes(c.profile)) return parent.projectPage(c, id, page);
    if (page !== 0) fail('Invalid page');
    const r = c.resources.find(v => v.id === id);
    if (!r) fail('Unknown native screen');
    return {
      resource: r,
      page: parent.pages(r)[0],
      nt: r.projection.nt.slice(),
      attr: r.projection.attr.slice()
    };
  }

  function encode(bytes, c, edits) {
    if (!profiles.includes(c.profile)) return parent.encode(bytes, c, edits);
    if (!Array.isArray(edits) || edits.length > c.totalCells) fail('Invalid recipes');
    const out = bytes.slice(),
      l = c.layouts[0],
      seen = new Set();
    for (const e of edits) {
      if (!e || Object.keys(e).sort().join(',') !== 'block,cell,layoutId' || e.layoutId !== l
        .id || !Number.isInteger(e.cell) || e.cell < 0 || e.cell >= l.cells.length || !Number
        .isInteger(e.block) || e.block < 0 || e.block > 255 || e.block === 253 || e.block === 254)
        fail('Invalid native literal recipe');
      if (!l.writable[e.cell]) fail(
        'Generated/inherited cells or protected metadata aliases are read-only');
      if (seen.has(e.cell)) fail('Duplicate physical recipe');
      seen.add(e.cell);
      out[l.offsets[e.cell]] = e.block;
    }
    const changes = [];
    for (let i = 0; i < out.length; i++)
      if (out[i] !== bytes[i]) changes.push({
        offset: i,
        before: bytes[i],
        after: out[i]
      });
    return {
      bytes: out,
      changes
    };
  }
  return Object.freeze({
    ...parent,
    profiles: Object.freeze([...parent.profiles, ...profiles]),
    inspect,
    projectPage,
    encode,
    punchOutContexts: contexts
  });
});
