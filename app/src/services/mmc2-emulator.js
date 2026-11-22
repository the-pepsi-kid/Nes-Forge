/*
 * NES FORGE MODULE: src/services/mmc2-emulator.js
 * Entry: Forge.services.MMC2Mapping / live mapper-9 wrappers
 * Purpose: Install MMC2 CPU/PPU mapping and scanline rendering while delegating every other mapper.
 * Connections: Wraps the legacy emulator functions; the shared Forge6502Core still owns CPU instruction behavior.
 * Contract: Retain offscreen background fetch side effects. Timing remains approximate. Each line records what it
 *   fetched (the latch-switched bank of every pattern fetch, the sprite bytes) in the runtime trace, so MMC2 frames are
 *   synchronization-checked and captured like every other mapper's.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Add MMC2 bus mapping without altering prior mapper or instruction cores.
 * The existing scanline timing model remains approximate. The MMC2 renderer
 * fetches each pattern row once and hands the runtime trace what it fetched. */
(() => {
  'use strict';
  const api = ForgeMMC2,
    prior = {
      parse: parseRomHeader,
      reset: emuDoReset,
      read: cpuRead,
      write: mapperWrite,
      ppu: ppuBusRead,
      line: renderEmuLine
    };

  function sync() {
    const s = emu.mmc2;
    emu.prgBank0 = api.cpu(s, 0x8000);
    emu.prgBank1 = api.cpu(s, 0xc000);
    emu.prgPage = [0x8000, 0xa000, 0xc000, 0xe000].map(a => api.cpu(s, a));
    emu.chrBank0 = api.chr(s, 0);
    emu.chrBank1 = api.chr(s, 4096);
    emu.mirroring = s.mirror;
  }
  parseRomHeader = function(input) {
    const b = input instanceof Uint8Array ? input : Uint8Array.from(input || []);
    if (b.length >= 16 && ((b[6] >> 4) | (b[7] & 240)) === 9) {
      const v = b.slice();
      v[6] = (v[6] & 15) | 0x40;
      v[7] &= 15;
      const h = prior.parse(v);
      api.create(h.prgSize, h.chrSize, h.mirror);
      return {
        ...h,
        mapper: 9
      };
    }
    return prior.parse(input);
  };
  cpuRead = function(a) {
    a &= 65535;
    if (emu.mapper === 9 && a >= 0x8000) return emu.prgRom[api.cpu(emu.mmc2 || api.create(emu
      .prgSize, emu.chrRom?.length || 8192, emu.initialMirror), a)] || 0;
    return prior.read(a);
  };
  mapperWrite = function(a, v) {
    if (emu.mapper !== 9) return prior.write(a, v);
    api.write(emu.mmc2, a, v);
    sync();
  };
  ppuBusRead = function(a) {
    a &= 16383;
    if (emu.mapper !== 9 || a >= 8192) return prior.ppu(a);
    const s = emu.mmc2,
      half = a >> 12,
      before = s.latch[half],
      offset = api.chr(s, a),
      value = emu.chrRom[offset] || 0;
    api.latch(s, a);
    if (before !== s.latch[half]) {
      emu.chrBank0 = api.chr(s, 0);
      emu.chrBank1 = api.chr(s, 4096);
    }
    return value;
  };
  emuDoReset = function() {
    if (emu.mapper === 9) {
      emu.mmc2 = api.create(emu.prgSize, emu.chrRom?.length || 8192, emu.initialMirror);
    }
    prior.reset();
    if (emu.mapper === 9) {
      sync();
      emu.captureTrace = null;
    }
  };
  renderEmuLine = function(line, baseY, baseNTY) {
    if (emu.mapper !== 9) return prior.line(line, baseY, baseNTY);
    // Reuse the same emulator-owned row buffers as the other mapper renderer.
    // Clear coverage/priority every line so mask changes cannot retain pixels.
    // Timeline's existing physical-state codec already owns these typed arrays;
    // no project resource, separate cache or mapper-fetch shortcut is added.
    const mask = emu.ppuMask,
      opaque = emu._lineOpaque || (emu._lineOpaque = new Uint8Array(256)),
      colors = emu._lineColors || (emu._lineColors = new Uint8Array(256)),
      claimed = emu._lineClaimed || (emu._lineClaimed = new Uint8Array(256)),
      scroll = (emu.tAddr & 31) * 8 + emu.fineX,
      ntx = (emu.tAddr >> 10) & 1,
      wy = baseY + line,
      ly = ((wy % 240) + 240) % 240,
      nty = baseNTY ^ (Math.floor(wy / 240) & 1);
    opaque.fill(0);
    claimed.fill(0);
    colors.fill(ppuBusRead(0x3f00));
    // What this line fetched, for the runtime trace: the bank registers in effect at each pattern fetch (the latch
    // switches after the triggering read, so a tile's two planes come from the bank before it) and the sprite bytes.
    const s = emu.mmc2,
      fetched = {
        start: [emu.chrBank0, emu.chrBank1],
        latch: {atStart: s.latch.slice(), atEnd: null},
        chr: s.chr.slice(),
        bg: [],
        sprites: []
      };
    // PPU background work includes 34 pattern fetches, even when the last
    // tiles fall outside the visible 256 pixels. Punch-Out puts an MMC2 latch
    // tile there; omitting it leaves the next row in Little Mac's CHR bank.
    // This retains the existing scanline CPU/sprite timing approximation.
    if (mask & 24)
      for (let fetch = 0; fetch < 34; fetch++) {
        const wx = (scroll & ~7) + fetch * 8,
          lx = wx & 255,
          nt = (nty * 2 + (ntx ^ ((wx >> 8) & 1))) * 1024,
          tr = ly >> 3,
          tc = lx >> 3,
          t = emu.vram[ppuMirror(nt + tr * 32 + tc)],
          a = emu.vram[ppuMirror(nt + 960 + (tr >> 2) * 8 + (tc >> 2))],
          pal = (a >> ((((tr >> 1) & 1) * 2 + ((tc >> 1) & 1)) * 2)) & 3,
          addr = (emu.ppuCtrl & 16 ? 4096 : 0) + t * 16 + (ly & 7);
        fetched.bg[fetch] = [emu.chrBank0, emu.chrBank1];
        const lo = ppuBusRead(addr),
          hi = ppuBusRead(addr + 8);
        for (let j = 0; j < 8; j++) {
          const px = fetch * 8 - (scroll & 7) + j;
          if (!(mask & 8) || px < 0 || px >= 256 || px < 8 && !(mask & 2)) continue;
          const bit = 7 - j,
            ci = (lo >> bit & 1) | (hi >> bit & 1) << 1;
          opaque[px] = ci;
          colors[px] = ppuBusRead(0x3f00 + (ci ? pal * 4 + ci : 0));
        }
      }

    function put(buffer, x, c) {
      if (mask & 1) c &= 48;
      const rgb = NP[c & 63] || NP[15],
        o = (line * 256 + x) * 4;
      buffer[o] = rgb[0];
      buffer[o + 1] = rgb[1];
      buffer[o + 2] = rgb[2];
      buffer[o + 3] = 255;
    }
    for (let x = 0; x < 256; x++) put(emu.bgFrameBuffer, x, colors[x]);
    let visible = 0,
      hit = -1;
    if (mask & 16)
      for (let i = 0; i < 64; i++) {
        const o = i * 4,
          top = emu.oamMem[o] + 1,
          h = emu.ppuCtrl & 32 ? 16 : 8;
        if (top > 239 || line < top || line >= top + h) continue;
        if (visible++ >= 8) {
          emu.ppuStatus |= 32;
          continue;
        }
        const tile = emu.oamMem[o + 1],
          at = emu.oamMem[o + 2],
          sx = emu.oamMem[o + 3],
          py = at & 128 ? h - 1 - (line - top) : line - top,
          bank = h === 16 ? (tile & 1) * 4096 : (emu.ppuCtrl & 8 ? 4096 : 0),
          ti = h === 16 ? (tile & 254) + (py >> 3) : tile,
          addr = bank + ti * 16 + (py & 7),
          banks = [emu.chrBank0, emu.chrBank1],
          lo = ppuBusRead(addr),
          hi = ppuBusRead(addr + 8);
        fetched.sprites[i] = {banks, lo, hi};
        for (let px = 0; px < 8; px++) {
          const x = sx + px;
          if (x >= 256 || x < 8 && !(mask & 4)) continue;
          const bit = at & 64 ? px : 7 - px,
            ci = (lo >> bit & 1) | (hi >> bit & 1) << 1;
          if (!ci) continue;
          if (i === 0 && x < 255 && opaque[x] && mask & 8 && hit < 0) hit = x;
          if (claimed[x]) continue;
          claimed[x] = 1;
          if (at & 32 && opaque[x]) continue;
          colors[x] = ppuBusRead(0x3f10 + (at & 3) * 4 + ci);
        }
      }
    for (let x = 0; x < 256; x++) put(emu.frameBuffer, x, colors[x]);
    fetched.latch.atEnd = s.latch.slice();
    // the same runtime trace as every other mapper, from what was fetched (nothing is read again)
    window.forgeCapture?.recordFetchedLine?.(line, baseY, baseNTY, fetched);
    return hit;
  };
  Forge.services.MMC2Mapping = Object.freeze({
    version: 2,
    scope: 'Standard MMC2 physical banking; scanline rendering remains approximate. Runtime capture comes from the trace of each pattern fetch (its latch-switched bank) and is checked by rebuilding the frame.'
  });
})();
