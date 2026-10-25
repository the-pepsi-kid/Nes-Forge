/*
 * NES FORGE MODULE: src/re/punch-out-states.js
 * Entry: PunchOutStates
 * Purpose: Trace one opponent-state path while retaining preceding OAM, sprite size and tile stride.
 * Connections: Uses Forge6502Core and PunchOutContent; PunchOutStateRecovery converts the trace to Animation assets.
 * Contract: An observed path under declared inputs is not a complete fight. No native animation writer is installed.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Bounded original opponent-state execution. Timed excerpts retain preceding
 * OAM and native sprite-size/stride changes. No live emulator, PPU or APU bus. */
(function(root, factory) {
  const node = typeof module !== 'undefined' && module.exports,
    api = factory(node ? require('../services/cpu6502-core.js') : root.Forge6502Core, node ?
      require('./punch-out-content.js') : root.PunchOutContent);
  if (node) module.exports = api;
  else root.PunchOutStates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(cpu, contentApi) {
  'use strict';
  const fail = m => {
      throw Error('Punch-Out states: ' + m);
    },
    hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');

  function open(input) {
    const content = contentApi.open(input),
      bytes = input.slice(),
      at = (bank, a) => 16 + bank * 8192 + a - 0x8000,
      word = (bank, a) => bytes[at(bank, a)] | (bytes[at(bank, a) + 1] << 8);
    const states = content.fights.map(f => {
      const count = (f.stateTables[1].address - f.stateTables[0].address) / 2;
      if (!Number.isInteger(count) || count < 1 || count > 64) fail(
        'Primary state table has invalid bounds.');
      return Array.from({
        length: count
      }, (_, index) => {
        const address = word(f.bank8KiB, f.stateTables[0].address + index * 2);
        return {
          fight: f.index,
          index,
          id: 'po-state-f' + f.index + '-s' + index,
          address,
          fileOffset: address >= 0x8000 && address < 0xa000 ? at(f.bank8KiB, address) :
            null,
          label: 'State ' + hex(index),
          available: address >= 0x8000 && address < 0xa000
        };
      });
    });

    /* Retain RAM/OAM across native updates. Incremental poses and size/stride commands
     * depend on this continuity; decoding each frame from zero would garble them. */
    function trace(fightIndex, stateIndex, {
      maxUpdates = 240,
      onUpdate = null
    } = {}) {
      const f = content.fights[fightIndex],
        root = states[fightIndex]?.find(s => s.index === stateIndex);
      if (!root?.available) fail('Choose an available source state.');
      if (!Number.isInteger(maxUpdates) || maxUpdates < 1 || maxUpdates > 600 || onUpdate !==
        null && typeof onUpdate !== 'function') fail('Choose 1–600 native updates.');
      const ram = new Uint8Array(2048),
        state = {
          A: 0,
          X: 0,
          Y: 0,
          SP: 0xfd,
          PC: 0,
          C: 0,
          Z: 0,
          I: 1,
          D: 0,
          V: 0,
          N: 0,
          cycles: 0,
          opsMissed: 0
        },
        frames = [],
        commands = [],
        audioEvents = [];
      let instructions = 0,
        update = -1,
        waiting = false,
        command = null,
        lastKey = '',
        stop = 'update-limit',
        status = 'bounded',
        updates = 0;
      const physical = a => a < 0xa000 ? at(f.bank8KiB, a) : 16 + 106496 + a - 0xa000;

      function read(a) {
        a &= 65535;
        if (a < 0x2000) return ram[a & 2047];
        if (a >= 0x8000) return bytes[physical(a)];
        fail('State requires runtime bus ' + hex(a));
      }

      function write(a, v) {
        a &= 65535;
        v &= 255;
        if (a < 0x2000) {
          ram[a & 2047] = v;
          if (update >= 0 && a >= 0xf0 && a <= 0xf3) {
            if (audioEvents.length >= 4096) fail('Audio event budget exceeded.');
            audioEvents.push({
              update,
              register: a,
              value: v,
              pc: state.PC,
              fileOffset: command
            });
          }
          return;
        }
        if (a === 0xa000 && v === f.bank8KiB) return;
        fail('State requires runtime bus ' + hex(a));
      }
      const core = cpu.create(state, read, write);

      function call(pc) {
        state.PC = pc;
        state.SP = 0xfb;
        ram[0x1fc] = 0xee;
        ram[0x1fd] = 0x7f;
        let steps = 0;
        while (state.PC !== 0x7fef) {
          if (++steps > 50000 || ++instructions > 1500000) fail(
            'Native instruction budget exceeded.');
          if (state.PC < 0xa000 || state.PC >= 0xd858) fail(
            'State leaves the bounded native code at ' + hex(state.PC));
          if (state.PC === 0xc74e) waiting = true;
          if (state.PC === 0xc552) {
            const address = (ram[0x94] | ram[0x95] << 8) + state.Y;
            if (address < 0x8000 || address >= 0xa000) fail(
              'State stream leaves its source bank.');
            command = at(f.bank8KiB, address);
            if (commands.length >= 4096) fail('State command budget exceeded.');
            commands.push({
              update,
              fileOffset: command,
              opcode: bytes[command],
              spriteMode: ram[0x80]
            });
          }
          core.step();
          state.PC &= 65535;
          if (state.opsMissed) fail('Unsupported native instruction.');
        }
        if (state.SP !== 0xfd) fail('Unbalanced native state stack.');
      }
      ram.set(f.configBytes, 0x5a0);
      ram.set(f.palette, 0x480);
      ram[2] = f.bank8KiB;
      ram[3] = f.entryOffset;
      ram[0x80] = f.spriteMode;
      ram[0x81] = f.spriteMode / 8;
      ram[0x82] = f.spriteMode === 16 ? 254 : 255;
      ram[0xa9] = 5;
      ram[0xb0] = f.baseX;
      ram[0xb1] = f.baseY;
      ram[0xa0] = 128;
      ram.fill(248, 0x200, 0x300);
      // The baseline full pose supplies real preceding tiles to incremental poses.
      call(0xc890);
      ram[0x90] = stateIndex;
      ram[0x94] = root.address & 255;
      ram[0x95] = root.address >> 8;
      ram[0x93] = 0;
      ram[0x92] = 1;
      try {
        for (update = 0; update < maxUpdates; update++) {
          waiting = false;
          call(update === 0 ? 0xc550 : 0xc4e7);
          if (ram[0xa0]) call(0xc890);
          const mode = ram[0x80];
          if (![8, 16].includes(mode)) fail('State has an unknown sprite size.');
          const oam = Array.from(ram.slice(0x200, 0x300)),
            palette = Array.from(ram.slice(0x490, 0x4a0), v => v & 63),
            bank = ram[0xa9] & 31,
            pieces = [];
          for (let slot = 3; slot < 64; slot++) {
            const i = slot * 4;
            if (oam[i] >= 239) continue;
            pieces.push({
              slot,
              x: oam[i + 3],
              y: oam[i] + 1,
              tile: oam[i + 1],
              attributes: oam[i + 2],
              chrHalf: mode === 16 ? oam[i + 1] & 1 : 0
            });
          }
          const key = JSON.stringify([mode, bank, palette, oam]);
          if (key === lastKey) frames.at(-1).duration++;
          else {
            frames.push({
              index: frames.length,
              update,
              duration: 1,
              selector: ram[0xa1],
              spriteMode: mode,
              tileStride: ram[0x81],
              chrBank4KiB: bank,
              palette,
              oam,
              pieces,
              sourceCommandFileOffset: command,
              status: pieces.some(p => p.chrHalf) ? 'context-required' : 'decoded'
            });
            lastKey = key;
          }
          updates++;
          if (onUpdate) onUpdate({
            update,
            ram: Array.from(ram),
            oam,
            command
          });
          if (ram[0x90] & 128 || ram[0x90] === 0) {
            stop = 'state-boundary';
            status = 'stopped';
            break;
          }
          if (waiting) {
            stop = 'external-condition';
            status = 'stopped';
            break;
          }
        }
      } catch (e) {
        stop = e.message;
        status = 'refused';
      }
      const pending = frames.filter(f => f.status !== 'decoded').length;
      return {
        version: 1,
        fight: fightIndex,
        state: root,
        maxUpdates,
        updates,
        status,
        stop,
        truncated: stop === 'update-limit',
        instructions,
        frames,
        commands,
        audioEvents,
        editable: status !== 'refused' && frames.length > 0 && !pending,
        pendingFrames: pending,
        assumptions: [
          'Initial full pose 0, source fight configuration/palette and zeroed scratch RAM. No concurrent player/referee/game-clock update or player input is simulated.',
          'Durations count original opponent-state updates; freezes, lag and other game systems can change wall-clock timing.',
          'Only the selected primary state path under these inputs is observed. Conditional branches, full fights and all secondary states are not exhaustively recovered.',
          'Incremental poses retain preceding native OAM. Upper-half CHR dependencies are refused. Native sprite, CHR and Audio writing remain unavailable.'
        ]
      };
    }
    return Object.freeze({
      states,
      trace
    });
  }
  return Object.freeze({
    version: 1,
    open
  });
});
