/*
 * NES FORGE MODULE: src/re/punch-out-fight.js
 * Purpose: recover Glass Joe setup layers, Little Mac/referee background commands,
 * and bounded player-state paths using the source's original bank-11 routines.
 * Connections: Forge6502Core executes a PRIVATE bus; PunchOutContent supplies the
 * opponent OAM; PunchOutArena supplies both source nametables. project() emits
 * the existing canonical raster/CHR/OAM representation, never a screenshot.
 * Contract: a declared pose composition or observed state excerpt is a reference,
 * not a full fight simulation or a native writer. The live emulator is untouched.
 */
(function(root, factory) {
  const node = typeof module !== 'undefined' && module.exports;
  const api = factory(node ? require('../services/cpu6502-core.js') : root.Forge6502Core,
    node ? require('./punch-out-content.js') : root.PunchOutContent,
    node ? require('./punch-out-arena.js') : root.PunchOutArena,
    node ? require('./mmc2.js') : root.ForgeMMC2);
  if (node) module.exports = api; else root.PunchOutFight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(cpu, contentApi, arenaApi, mapperApi) {
  'use strict';
  const fail = message => { throw Error('Punch-Out fight context: ' + message); };
  const integer = (v, low, high, name) => {
    if (!Number.isInteger(v) || v < low || v > high) fail('Invalid ' + name);
    return v;
  };
  const names = ['Disabled', 'Waiting', 'No hearts', 'Dodge right', 'Dodge right return',
    'Dodge left', 'Dodge left return', 'Block', 'Block hit', 'Right body punch',
    'Left body punch', 'Right face punch', 'Left face punch', 'Star punch', 'Duck',
    'Unused state', 'Stun right', 'Stun left', 'Player state 18', 'Player state 19',
    'Player state 20', 'Player state 21'];
  const limits = Object.freeze([
    'Glass Joe source setup, selected background commands and bounded player/referee state excerpts. Opponent placement starts from the original fight configuration.',
    'Little Mac and referee/speech graphics use background nametable streams, not opponent metasprites. Bank switching and fine scroll are retained in canonical raster data.',
    'State excerpts start with declared configuration, idle pose, full initial health and zero input/scratch RAM. Opponent AI, damage, concurrent fight phases and vblank transfer arbitration are not simulated.',
    'References are editable and savable copies. Native Mac/referee/CHR/palette/animation writers are not installed; unsupported reference edits block native builds. Use the existing arena Scene for supported native layout edits.'
  ]);

  function open(input) {
    const bytes = Uint8Array.from(input), content = contentApi.open(bytes), arena = arenaApi.open(bytes);
    const fight = content.fights[0], at = a => 16 + 11 * 8192 + a - 0x8000;
    const word = a => bytes[at(a)] | bytes[at(a + 1)] << 8;
    // These are the actual entry jumps used by fixed-bank AA87/AA9F.
    for (const [address, target] of [[0x8000, 0x8020], [0x8003, 0x8119],
      [0x8006, 0x8319], [0x8009, 0x8280]]) {
      if (bytes[at(address)] !== 0x4c || word(address + 1) !== target) fail('Player drawing/state entry differs');
    }
    const poses = [...Array.from({length: 98}, (_, selector) => ({selector,
      family: 'mac', label: 'Little Mac command $' + selector.toString(16).padStart(2, '0'),
      table: 0x8800, descriptor: word(0x8800 + selector * 2)})),
    ...Array.from({length: 47}, (_, i) => ({selector: 128 + i,
      family: 'referee', label: 'Referee / speech command $' + (128 + i).toString(16),
      table: 0x88c4, descriptor: word(0x88c4 + i * 2)}))].map(p => ({...p,
      descriptorFileOffset: at(p.descriptor), tableFileOffset: at(p.table + (p.selector & 127) * 2)}));
    if (poses.some(p => p.descriptor < 0x8000 || p.descriptor + 3 > 0xa000)) fail('Pose descriptor leaves bank 11');
    const states = [...Array.from({length: 22}, (_, index) => ({index,
      label: names[index], address: word(0x9800 + index * 2)})),
    ...[64, 65, 66].map((index, i) => ({index,
      label: ['Pre-fight / referee entry', 'Opponent down / referee count', 'Round over'][i],
      address: word(0x982c + i * 2)}))].map(s => ({...s,
      available: s.address >= 0x8000 && s.address < 0xa000,
      fileOffset: s.address >= 0x8000 && s.address < 0xa000 ? at(s.address) : null}));

    /** Every call runs the unmodified source code. PPU writes, source reads and
     * sound requests are recorded; unexpected buses and unbounded work refuse. */
    function machine(opponentPose = 0) {
      const opponent = content.pose(0, opponentPose);
      if (opponent.status !== 'decoded' || opponent.spriteMode !== 8) fail('Opponent pose needs another context');
      const ram = new Uint8Array(2048), pages = Uint8Array.from(arena.rawPages);
      const mapper = mapperApi.create(131072, 131072, 1);
      mapper.chr = [5, opponent.chrBank4KiB, 0, 1];
      const state = {A: 0, X: 0, Y: 0, SP: 0xfb, PC: 0, C: 0, Z: 0, I: 1,
        D: 0, V: 0, N: 0, cycles: 0, opsMissed: 0};
      const writes = [], audioEvents = [], reads = new Set(), commands = [];
      let address = 0, high = true, control = 0x15, instructions = 0, update = -1;
      const read = a => {
        a &= 65535;
        if (a < 0x2000) return ram[a & 2047];
        if (a === 0x2002) { high = true; return 0; }
        if (a >= 0x8000) { const o = 16 + mapperApi.cpu(mapper, a); reads.add(o); return bytes[o]; }
        fail('Unexpected private source read $' + a.toString(16));
      };
      const write = (a, v) => {
        a &= 65535; v &= 255;
        if (a < 0x2000) {
          ram[a & 2047] = v;
          if (update >= 0 && a >= 0xf0 && a <= 0xf3) {
            if (audioEvents.length >= 4096) fail('Sound request budget exceeded');
            audioEvents.push({update, register: a, value: v});
          }
          return;
        }
        if (a === 0x2000) { control = v; return; }
        if (a === 0x2006) { address = high ? (v & 63) << 8 : (address & 0x3f00) | v; high = !high; return; }
        if (a === 0x2007) {
          if (address < 0x2000 || address >= 0x3000) fail('Drawing leaves native nametables');
          const cell = (address - 0x2000) & 2047;
          pages[cell] = v;
          writes.push({update, address, value: v});
          if (writes.length > 100000) fail('PPU write budget exceeded');
          address = (address + (control & 4 ? 32 : 1)) & 16383;
          return;
        }
        if (a >= 0xa000) { mapperApi.write(mapper, a, v); return; }
        fail('Unexpected private source write $' + a.toString(16));
      };
      const core = cpu.create(state, read, write);
      function call(pc) {
        state.PC = pc; state.SP = 0xfb; ram[508] = 0xee; ram[509] = 0x7f;
        let count = 0;
        while (state.PC !== 0x7fef) {
          if (++count > 50000 || ++instructions > 1500000 || state.PC < 0x8000 || state.PC >= 0xd858)
            fail('Native routine left its instruction/address budget');
          if (mapper.prg === 11 && state.PC === 0x8327) {
            const p = (ram[0x54] | ram[0x55] << 8) + state.Y;
            if (p < 0x8000 || p >= 0xa000) fail('State stream leaves bank 11');
            commands.push({update, fileOffset: at(p), opcode: bytes[at(p)]});
            if (commands.length > 4096) fail('State command budget exceeded');
          }
          core.step(); state.PC &= 65535;
          if (state.opsMissed) fail('Unsupported native instruction');
        }
        if (state.SP !== 0xfd) fail('Unbalanced native stack');
      }
      const bank = n => mapperApi.write(mapper, 0xa000, n);
      ram.set(fight.configBytes, 0x5a0); ram.set(fight.palette, 0x480); ram[0x48d] = 32;
      ram[1] = 0; ram[2] = fight.bank8KiB; ram[3] = fight.entryOffset; ram[4] = 255; ram[6] = 1;
      ram[0x10] = 0x15; ram[0x13] = ram[0x15] = 176; ram[0x14] = ram[0x16] = 1;
      ram[0x80] = 8; ram[0x81] = 1; ram[0x82] = 255;
      ram.set(opponent.oam, 0x200); ram[0xa9] = opponent.chrBank4KiB;
      bank(fight.bank8KiB); call(0xaf43); call(0xb5a9);
      // Initial HUD values are produced by the real clock/hearts/stars/HP writers,
      // rather than painting guessed health bars over the arena placeholders.
      ram[0x390] = 0x81; ram[0x3e7] = 0x80;
      bank(7); for (const pc of [0x8009, 0x800c, 0x8006, 0x8003, 0x8000]) call(pc);
      call(0xae9b);
      for (let i = 0; i < 100; i++) { bank(7); call(0x8006); call(0xc041); }
      for (const pc of [0xc079, 0xc09d, 0xc0bb, 0xc0e0]) call(pc);
      function drawPrepared() {
        if (ram[0x60] && !(ram[0x60] & 128)) {
          bank(11); call(0xaea5); call(0x8000);
          mapperApi.write(mapper, 0xe000, ram[0x69]);
        }
      }
      function pose(selector) {
        if (!poses.some(p => p.selector === selector)) fail('Select a catalogued background command');
        ram[0x60] = 128; ram[0x61] = selector;
        bank(11); call(0x8009); drawPrepared();
      }
      function frame() {
        return {pages: Array.from(pages), palette: Array.from(ram.slice(0x480, 0x4a0), v => v & 63),
          oam: Array.from(ram.slice(0x200, 0x300)), mapper: {...mapper, chr: mapper.chr.slice(), latch: [1, 1]},
          scrollX: ram[0x15], baseNametable: ram[0x16] & 1, ppuCtrl: ram[0x10] & ~4,
          ppuMask: 30, playerState: ram[0x50], playerStatus: ram[0x51], selector: ram[0x61],
          instructions, sourceBytesRead: reads.size};
      }
      return {ram, pages, call, bank, pose, frame, drawPrepared, writes, audioEvents, commands,
        setUpdate: n => { update = n; }};
    }

    function compose({mac = 0, referee = 144, opponent = 0} = {}) {
      integer(mac, 0, 97, 'Little Mac command');
      if (referee !== null) integer(referee, 128, 174, 'referee command');
      const m = machine(opponent); m.pose(mac); if (referee !== null) m.pose(referee);
      return {...m.frame(), recipe: {kind: 'composition', mac, referee, opponent},
        writes: m.writes, commands: m.commands, audioEvents: m.audioEvents, limits: [...limits]};
    }

    function tracePlayer(index, {maxUpdates = 120, opponent = 0, onUpdate = null} = {}) {
      const entry = states.find(s => s.index === index && s.available);
      if (!entry) fail('Choose an available native player state');
      integer(maxUpdates, 1, 600, 'native update window');
      if (onUpdate !== null && typeof onUpdate !== 'function') fail('Invalid update observer');
      const m = machine(opponent), frames = [];
      m.pose(0); m.ram[0x50] = 128 | index;
      let key = '', status = 'bounded', stop = 'update-limit', updates = 0;
      try {
        for (let update = 0; update < maxUpdates; update++) {
          m.setUpdate(update); m.bank(11); m.call(0x8006); m.call(0x8009); m.drawPrepared();
          const frame = m.frame(), signature = JSON.stringify([frame.pages, frame.palette,
            frame.mapper.chr, frame.scrollX, frame.baseNametable]);
          if (signature === key) frames.at(-1).duration++;
          else { frames.push({...frame, update, duration: 1}); key = signature; }
          updates++;
          if (onUpdate) onUpdate({update, ram: Array.from(m.ram), frame});
          m.ram[0x1e]++;
          if (m.ram[0x50] !== index) { status = 'stopped'; stop = 'state-boundary'; break; }
        }
      } catch (error) { status = 'refused'; stop = error.message; }
      return {recipe: {kind: 'player-state', state: index, maxUpdates, opponent}, entry,
        updates, frames, status, stop, truncated: stop === 'update-limit',
        commands: m.commands, audioEvents: m.audioEvents, writes: m.writes,
        limits: [...limits, 'Durations count source-state updates followed by source PPU upload; they do not model the original NMI transfer schedule.']};
    }

    /** Project physical bank/latch reads into the existing raster representation.
     * 34 fetches include invisible latch controls. Sprite pattern reads retain
     * lower-latch side effects, source OAM order and the eight-sprite line limit. */
    function project(frame) {
      if (!frame || frame.pages?.length !== 2048 || frame.oam?.length !== 256 ||
        frame.palette?.length !== 32 || [...frame.pages, ...frame.oam].some(v => !Number.isInteger(v) || v < 0 || v > 255) ||
        frame.palette.some(v => !Number.isInteger(v) || v < 0 || v > 63)) fail('Invalid native reference frame');
      integer(frame.scrollX, 0, 255, 'source scroll'); integer(frame.baseNametable, 0, 1, 'base nametable');
      integer(frame.ppuCtrl, 0, 255, 'PPU control');
      if (frame.ppuMask !== 30 || !(frame.ppuCtrl & 16) || frame.ppuCtrl & 32 ||
        frame.mapper?.chr?.length !== 4 || frame.mapper.chr.some(v => !Number.isInteger(v) || v < 0 || v > 31) ||
        frame.mapper.prgBytes !== 131072 || frame.mapper.chrBytes !== 131072 || frame.mapper.mirror !== 1)
        fail('Reference needs the verified 8-pixel, vertical-mirroring Glass Joe graphics context');
      const chr = [Array.from({length: 8}, () => Array(8).fill(0))], sources = [{kind: 'blank'}];
      const tiles = new Map(), rows = [], mapper = {...frame.mapper, chr: frame.mapper.chr.slice(), latch: [1, 1]};
      const sourceTile = offset => {
        if (!tiles.has(offset)) {
          const ti = chr.length; tiles.set(offset, ti);
          chr.push(Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) =>
            (bytes[offset + y] >> (7 - x) & 1) | (bytes[offset + y + 8] >> (7 - x) & 1) << 1)));
          sources.push({kind: 'CHR-ROM', offset: offset - 0x20010, fileOffset: offset,
            bank4KiB: (offset - 0x20010) >> 12, originalTile: ((offset - 0x20010) & 4095) >> 4});
        }
        return tiles.get(offset);
      };
      const pattern = address => {
        const offset = 0x20010 + mapperApi.chr(mapper, address), value = bytes[offset];
        mapperApi.latch(mapper, address); return {value, offset};
      };
      const sprites = Array.from({length: 64}, (_, slot) => {
        const i = slot * 4, t = frame.oam[i + 1], h = frame.ppuCtrl & 32 ? 16 : 8;
        return {slot, x: frame.oam[i + 3], y: frame.oam[i] + 1, tile: t, attr: frame.oam[i + 2],
          height: h, pixels: Array.from({length: h}, () => Array(8).fill(0)), rowSources: Array(h).fill(null)};
      });
      for (let pass = 0; pass < 2; pass++) for (let y = 0; y < 240; y++) {
        const row = [];
        for (let fetch = 0; fetch < 34; fetch++) {
          const wx = (frame.scrollX & ~7) + fetch * 8, lx = wx & 255;
          const page = (frame.baseNametable ^ ((wx >> 8) & 1)) & 1;
          const cell = page * 1024 + (y >> 3) * 32 + (lx >> 3), t = frame.pages[cell];
          const ab = frame.pages[page * 1024 + 960 + (y >> 5) * 8 + (lx >> 5)];
          const pal = (ab >> (((y & 16) >> 2) + ((lx & 16) >> 3))) & 3;
          const address = (frame.ppuCtrl & 16 ? 4096 : 0) + t * 16 + (y & 7);
          const lo = pattern(address); pattern(address + 8);
          const start = fetch * 8 - (frame.scrollX & 7), x = Math.max(0, start), end = Math.min(256, start + 8);
          if (pass && end > x) row.push(x, end - x, sourceTile(lo.offset - (y & 7)), x - start, y & 7, pal);
        }
        let visible = 0;
        for (const sprite of sprites) {
          if (sprite.y > 239 || y < sprite.y || y >= sprite.y + sprite.height) continue;
          if (visible++ >= 8) continue;
          const py = sprite.attr & 128 ? sprite.height - 1 - (y - sprite.y) : y - sprite.y;
          const base = sprite.height === 16 ? (sprite.tile & 1) * 4096 : (frame.ppuCtrl & 8 ? 4096 : 0);
          const t = sprite.height === 16 ? (sprite.tile & 254) + (py >> 3) : sprite.tile;
          const address = base + t * 16 + (py & 7), lo = pattern(address), hi = pattern(address + 8);
          if (pass) {
            sprite.pixels[py] = Array.from({length: 8}, (_, x) =>
              (lo.value >> (7 - x) & 1) | (hi.value >> (7 - x) & 1) << 1);
            sprite.rowSources[py] = [lo.offset, hi.offset];
          }
        }
        if (pass) rows.push(row);
      }
      const nt = [], attr = Array(64).fill(0);
      function atPixel(x, y) { const row = rows[y]; for (let i = 0; i < row.length; i += 6)
        if (x >= row[i] && x < row[i] + row[i + 1]) return {tile: row[i + 2], pal: row[i + 5]}; }
      for (let y = 0; y < 30; y++) for (let x = 0; x < 32; x++) nt.push(atPixel(x * 8, y * 8).tile);
      for (let y = 0; y < 15; y++) for (let x = 0; x < 16; x++)
        attr[(y >> 1) * 8 + (x >> 1)] |= atPixel(x * 16, y * 16).pal << (((y & 1) * 2 + (x & 1)) * 2);
      const sprChr = [], oam = [], spriteSources = [];
      for (const sprite of sprites) {
        if (sprite.y > 239) continue;
        const tile = sprChr.length; sprChr.push(sprite.pixels.slice(0, 8));
        if (sprite.height === 16) sprChr.push(sprite.pixels.slice(8));
        oam.push({x: sprite.x, y: sprite.y, tile, tile2: sprite.height === 16 ? tile + 1 : tile,
          attr: sprite.attr, height: sprite.height, active: true, sourceOamIndex: sprite.slot});
        spriteSources.push({slot: sprite.slot, originalTile: sprite.tile, rowSources: sprite.rowSources});
      }
      while (chr.length < 256) chr.push(Array.from({length: 8}, () => Array(8).fill(0)));
      while (sprChr.length < 256) sprChr.push(Array.from({length: 8}, () => Array(8).fill(0)));
      const palettes = offset => Array.from({length: 4}, (_, p) => [frame.palette[0],
        ...frame.palette.slice(offset + p * 4 + 1, offset + p * 4 + 4)]);
      return {chr, sprChr, nt, attr, pal: palettes(0), sprPal: palettes(16), oam,
        tileProps: Array(chr.length).fill(0), raster: {version: 1, rows,
          palettes: [frame.palette.slice()], linePal: Array(240).fill(0), masks: Array(240).fill(frame.ppuMask),
          sources, baseNt: nt.slice(), baseAttr: attr.slice(), painted: {}, attrEdited: {}, useMask: true},
        spriteSources};
    }
    return Object.freeze({poses, states, compose, tracePlayer, project, limits});
  }
  return Object.freeze({version: 1, open});
});
