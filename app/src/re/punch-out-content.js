/*
 * NES FORGE MODULE: src/re/punch-out-content.js
 * Entry: PunchOutContent
 * Purpose: Read fight pointer tables, CHR banks and full-pose records through bounded source CPU execution.
 * Connections: PunchOutContentRecovery projects decoded OAM pieces into ordinary Scenes and metasprites.
 * Contract: A pose requiring prior OAM or concurrent upper-half CHR state is reported as context-required.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Source-owned Punch-Out fight/pose inventory. Native shape routines run on a
 * bounded private RAM bus; they cannot access the live emulator, APU or PPU.
 * Inventory is distinct from complete gameplay or native edit support. */
(function(root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports ? require(
    '../services/cpu6502-core.js') : root.Forge6502Core);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PunchOutContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(cpu) {
  'use strict';
  const names = ['Glass Joe', 'Von Kaiser', 'Piston Honda · first fight',
    'Don Flamenco · first fight', 'King Hippo', 'Great Tiger', 'Bald Bull · first fight',
    'Piston Honda · rematch', 'Soda Popinski', 'Bald Bull · rematch', 'Don Flamenco · rematch',
    'Mr. Sandman', 'Super Macho Man', 'Mike Tyson'
  ];
  const fail = m => {
      throw Error('Punch-Out content: ' + m);
    },
    hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');
  // the first bytes of the game's pose routine at $C890 (bank 14, fixed at $C000): LDA $A0 / BEQ / TAX / LDA #$50 / ...
  const ANCHOR = [0xa5, 0xa0, 0xf0, 0xfb, 0xaa, 0xa9, 0x50, 0x85, 0xe7, 0xa4, 0x03];
  // the routine's last instruction (an RTS at $D857): delta poses run its unrolled tail past $D800
  const ROUTINE_END = 0xd857;

  /* Whether a cartridge runs this pose routine at $C890: an MMC2 cartridge with 128 KiB of PRG ROM whose fixed bank 14
   * holds the routine's first bytes. Synchronous and cheap (the emulator asks it when a cartridge is loaded). */
  function hasPoseRoutine(input) {
    if (!(input instanceof Uint8Array) || input.length < 16 + 131072 || input[0] !== 0x4e || input[1] !== 0x45 ||
      input[2] !== 0x53 || input[3] !== 0x1a || input[4] !== 8 || ((input[6] >> 4) | (input[7] & 240)) !== 9 ||
      input[6] & 4) return false;
    const at = 16 + 14 * 8192 + 0x0890;
    return ANCHOR.every((v, i) => input[at + i] === v);
  }

  function open(input) {
    if (!(input instanceof Uint8Array) || input.length !== 262160 || input[4] !== 8 || input[
      5] !== 16 || ((input[6] >> 4) | (input[7] & 240)) !== 9 || input[6] & 4) fail(
      'A complete supported MMC2 source is required.');
    const bytes = input.slice(),
      offset = (bank, a) => {
        if (!Number.isInteger(bank) || bank < 0 || bank > 15 || !Number.isInteger(a) || a <
          0x8000 || a >= 0xa000) fail('Read leaves the declared physical bank.');
        return 16 + bank * 8192 + a - 0x8000;
      },
      b = (bank, a) => bytes[offset(bank, a)],
      word = (bank, a) => b(bank, a) | (b(bank, a + 1) << 8);
    // This entry must retain its original native shape dispatcher.
    if (!ANCHOR.every((v, i) => b(14, 0x8890 + i) === v)) fail('Native shape reader differs.');
    const fights = names.map((label, index) => {
      const bank = b(13, 0x80d1 + index * 2),
        entryOffset = b(13, 0x80d2 + index * 2),
        header = 0x8000 + entryOffset,
        shapes = word(bank, header),
        tables = [0, 2, 4].map(i => word(bank, shapes + i)),
        palette = word(bank, header + 6),
        config = word(bank, header + 14),
        count = (tables[1] - tables[0]) / 2;
      if (!Number.isInteger(count) || count < 1 || count > 64 || tables.some(t => t <
          0x8000 || t >= 0xa000) || palette < 0x8000 || palette + 32 > 0xa000 || config <
        0x8000 || config + 96 > 0xa000) fail('Invalid fight pointer graph.');
      const mode = b(bank, config + 44) ? 16 : 8,
        poses = Array.from({
          length: count
        }, (_, i) => {
          const selector = i * 2,
            address = word(bank, tables[0] + selector);
          return {
            id: 'fight-' + index + '-pose-' + selector,
            selector,
            address,
            fileOffset: address >= 0x8000 && address < 0xa000 ? offset(bank, address) :
              null,
            status: address >= 0x8000 && address < 0xa000 ? 'source-record' :
              'unavailable-slot',
            label: 'Pose ' + hex(selector)
          };
        });
      return {
        id: 'fight-' + index,
        index,
        label,
        bank8KiB: bank,
        entryOffset,
        entryFileOffset: offset(bank, header),
        shapeTables: tables,
        paletteFileOffset: offset(bank, palette),
        palette: Array.from({
          length: 32
        }, (_, i) => b(bank, palette + i) & 63),
        configFileOffset: offset(bank, config),
        configBytes: Array.from({
          length: 96
        }, (_, i) => b(bank, config + i)),
        spriteMode: mode,
        baseX: b(bank, config + 46),
        baseY: b(bank, config + 47),
        poses,
        deltaPoseTables: tables.slice(1).map((address, i) => ({
          selectorBase: i ? 192 : 128,
          address,
          fileOffset: offset(bank, address),
          status: 'requires-previous-pose'
        })),
        stateTables: [2, 4].map(i => ({
          address: word(bank, header + i),
          fileOffset: offset(bank, word(bank, header + i)),
          status: 'native-state-streams-not-translated'
        }))
      };
    });

    /* Run the original shape dispatcher with declared initial RAM. Only source-owned
     * OAM writes count as a decoded pose; inherited/unresolved pieces remain gaps.
     * at: the base position to draw from (default: the fight's configured base). Coordinates are 8-bit, so a wide
     * pose drawn near a screen edge wraps; a central base keeps every piece's relative position.
     * at.mode: the sprite mode the routine draws in ($80 row height 8/16, $81 tile step 1/2; $82 follows the step).
     * Default: the fight's configured mode. The game selects other modes for some poses (Mike Tyson's 8x8 poses use
     * height 8 with tile step 2). */
    function pose(fightIndex, selector, at = null) {
      const f = fights[fightIndex],
        record = f?.poses.find(p => p.selector === selector);
      if (!record || record.status !== 'source-record') fail(
        'Select a valid full-pose source record.');
      if (at && !(Number.isInteger(at.x) && at.x >= 0 && at.x < 256 && Number.isInteger(at.y) && at.y >= 0 && at.y < 240)) fail('The base position must be on screen.');
      const mode = at?.mode || {height: f.spriteMode, step: f.spriteMode / 8};
      if (![8, 16].includes(mode.height) || ![1, 2].includes(mode.step)) fail('The sprite mode must be height 8 or 16 with tile step 1 or 2.');
      const ram = new Uint8Array(2048),
        written = new Set(),
        reads = new Set(),
        state = {
          A: 0,
          X: 0,
          Y: 0,
          SP: 0xfb,
          PC: 0xc890,
          C: 0,
          Z: 0,
          I: 1,
          D: 0,
          V: 0,
          N: 0,
          cycles: 0,
          opsMissed: 0
        };
      let steps = 0;
      const read = a => {
        a &= 65535;
        if (a < 0x2000) return ram[a & 2047];
        if (a >= 0x8000) {
          const at = a < 0xa000 ? offset(f.bank8KiB, a) : 16 + 131072 - 24576 + a - 0xa000;
          reads.add(at);
          return bytes[at];
        }
        fail('Pose requires runtime bus ' + hex(a));
      };
      const write = (a, v) => {
        a &= 65535;
        if (a >= 0x2000) fail('Pose tried to access runtime bus ' + hex(a));
        ram[a & 2047] = v & 255;
        written.add(a & 2047);
      };
      ram[3] = f.entryOffset;
      ram[0xa0] = 128;
      ram[0xa1] = selector;
      ram[0x80] = mode.height;
      ram[0x81] = mode.step;
      ram[0x82] = mode.step === 2 ? 254 : 255;
      ram[0xa9] = 5;
      ram[0xb0] = at ? at.x : f.baseX;
      ram[0xb1] = at ? at.y : f.baseY;
      ram.fill(248, 512, 768);
      ram[0x1fc] = 0xee;
      ram[0x1fd] = 0x7f;
      const core = cpu.create(state, read, write);
      while (state.PC !== 0x7fef) {
        if (++steps > 50000 || state.PC < 0xc88b || state.PC >= 0xd800) fail(
          'Pose leaves the bounded native shape reader.');
        core.step();
        state.PC &= 65535;
        if (state.opsMissed) fail('Unsupported native instruction.');
      }
      if (state.SP !== 0xfd) fail('Native pose stack is unbalanced.');
      const pieces = [],
        gaps = [];
      for (let slot = 3; slot < 64; slot++) {
        const at = 512 + slot * 4,
          y = ram[at],
          tile = ram[at + 1];
        if (y >= 239) continue;
        if (!written.has(at + 1)) {
          gaps.push('Slot ' + slot + ' inherits its tile from an earlier pose.');
          continue;
        }
        pieces.push({
          slot,
          x: ram[at + 3],
          y: y + 1,
          tile,
          attributes: ram[at + 2],
          chrHalf: mode.height === 16 ? tile & 1 : 0,
          // the routine left this slot's attribute byte (palette, flips, priority) as the earlier pose wrote it
          ...(written.has(at + 2) ? {} : {inheritsAttributes: true})
        });
      }
      if (pieces.some(p => p.chrHalf)) gaps.push(
        'Upper CHR half requires the concurrent Little Mac / background bank state.');
      return {
        fight: f.index,
        selector,
        base: {x: at ? at.x : f.baseX, y: at ? at.y : f.baseY},
        mode: {height: mode.height, step: mode.step},
        source: record,
        bank8KiB: f.bank8KiB,
        spriteMode: mode.height,
        chrBank4KiB: ram[0xa9] & 31,
        // whether this pose's own tile streams select the bank ($A9); if not, it is the bank set before it (unknown here)
        chrBankSelected: written.has(0xa9),
        palette: f.palette.slice(16),
        pieces,
        oam: Array.from(ram.slice(512, 768)),
        status: gaps.length ? 'context-required' : 'decoded',
        gaps,
        instructions: steps,
        sourceBytesRead: reads.size
      };
    }

    /* Replay what the game applied: the applications of the pose routine ($C890) that Forge recorded while the game ran
     * (each: the fight's bank $02 and entry $03, the selector $A1, the base $B0/$B1, the sprite mode $80/$81), in order,
     * on one RAM. The first is a full pose (selector below $80), drawn on an empty sprite page; each delta (from $80)
     * changes the sprite page the earlier ones left, as in the game: tiles, attributes and positions. Minimal state
     * otherwise, as in pose(); the routine may run to its end at $D857. Returns the pieces the result draws. */
    function replay(applications) {
      if (!Array.isArray(applications) || !applications.length || applications.length > 4096) fail('Give the applications to replay.');
      const first = applications[0],
        f = fights.find(x => x.bank8KiB === first.bank && x.entryOffset === first.entry);
      if (!f) fail('The applications name no fight of this cartridge.');
      if (!(first.selector < 128)) fail('A replay starts with a full pose.');
      if (applications.some(a => a.bank !== first.bank || a.entry !== first.entry)) fail('The applications name more than one fight.');
      const ram = new Uint8Array(2048);
      ram[0xa9] = 5;
      ram.fill(248, 512, 768);
      let steps = 0;
      for (const a of applications) {
        if (![a.selector, a.x, a.y].every(v => Number.isInteger(v) && v >= 0 && v < 256)) fail('An application is incomplete.');
        if (a.selector < 128 && !f.poses.some(p => p.selector === a.selector && p.status === 'source-record')) fail('A full pose selector names no record.');
        const height = a.height === 16 ? 16 : 8,
          step = a.step === 2 ? 2 : 1,
          state = {A: 0, X: 0, Y: 0, SP: 0xfb, PC: 0xc890, C: 0, Z: 0, I: 1, D: 0, V: 0, N: 0, cycles: 0, opsMissed: 0};
        const read = addr => {
          addr &= 65535;
          if (addr < 0x2000) return ram[addr & 2047];
          if (addr >= 0x8000) return bytes[addr < 0xa000 ? offset(f.bank8KiB, addr) : 16 + 131072 - 24576 + addr - 0xa000];
          fail('Replay requires runtime bus ' + hex(addr));
        };
        const write = (addr, v) => {
          addr &= 65535;
          if (addr >= 0x2000) fail('Replay tried to access runtime bus ' + hex(addr));
          ram[addr & 2047] = v & 255;
        };
        ram[3] = f.entryOffset;
        ram[0x80] = height;
        ram[0x81] = step;
        ram[0x82] = step === 2 ? 254 : 255;
        ram[0xb0] = a.x;
        ram[0xb1] = a.y;
        ram[0xa0] = 128;
        ram[0xa1] = a.selector;
        ram[0x1fc] = 0xee;
        ram[0x1fd] = 0x7f;
        const core = cpu.create(state, read, write);
        let n = 0;
        while (state.PC !== 0x7fef) {
          if (++n > 50000 || state.PC < 0xc88b || state.PC > ROUTINE_END) fail('Replay leaves the bounded native shape reader.');
          core.step();
          state.PC &= 65535;
          if (state.opsMissed) fail('Unsupported native instruction.');
        }
        if (state.SP !== 0xfd) fail('Native pose stack is unbalanced.');
        steps += n;
      }
      const pieces = [];
      for (let slot = 3; slot < 64; slot++) {
        const at = 512 + slot * 4;
        if (ram[at] >= 239) continue;
        pieces.push({slot, x: ram[at + 3], y: ram[at] + 1, tile: ram[at + 1], attributes: ram[at + 2]});
      }
      return {fight: f.index, base: {selector: first.selector, address: f.poses.find(p => p.selector === first.selector).address},
        deltas: applications.slice(1).map(a => a.selector), mode: {height: first.height === 16 ? 16 : 8, step: first.step === 2 ? 2 : 1}, pieces, instructions: steps};
    }

    function chr(bank) {
      if (!Number.isInteger(bank) || bank < 0 || bank >= 32) fail('CHR bank must be 0–31.');
      const start = 131088 + bank * 4096;
      return Array.from({
        length: 256
      }, (_, t) => Array.from({
        length: 8
      }, (_, y) => Array.from({
        length: 8
      }, (_, x) => ((bytes[start + t * 16 + y] >> (7 - x)) & 1) | (((bytes[start + t *
        16 + y + 8] >> (7 - x)) & 1) << 1))));
    }
    return Object.freeze({
      fights,
      pose,
      replay,
      chr,
      physicalChrBanks: 32,
      physicalChrTiles: 8192,
      limits: ['Full pose records only. Delta poses need a preceding animation state.',
        'Native pose execution preserves OAM ordering, coordinates, palette IDs, flips and priority. Concurrent CHR state is required where reported.',
        'Fight behavior, damage/collision, animation timing, menus, scene transitions and native sprite/CHR/Audio writing are separate recovery work.'
      ]
    });
  }
  return Object.freeze({
    version: 1,
    open,
    hasPoseRoutine,
    poseRoutine: Object.freeze({pc: 0xc890, end: ROUTINE_END})
  });
});
