#!/usr/bin/env node
'use strict';
/*
 NES Forge runtime snapshot capture (headless, uses Forge.html's own emulator)

 Usage:
   node forge_capture.cjs <rom.nes> <outdir> --forge <Forge.html> --harness <harness.cjs>
        --at 30,300,600 [--input "120:Enter:4,200:Enter:4"] [--tag title]

 --at     comma list of emulator frames to snapshot (ascending)
 --input  frame:Key:holdFrames  (Key = a KeyboardEvent.code Forge reads, e.g. Enter, KeyZ,
          KeyX, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ShiftLeft)

 Per snapshot it writes <outdir>/<tag>_f<frame>/:
   state.json      mapper regs, active PRG/CHR file offsets, PPU regs, palettes, OAM, evidence
   screen.png      the emulator's actual rendered frame (ground truth for pixel diff)
   forge_shapes.json  chr/sprChr/pal/sprPal/nt/attr/oam in Forge .nesforge.json shapes
 Every CHR tile is tagged with its exact ROM FILE offset (computed from the live mapping,
 not searched). Nothing here interprets game logic; status for all of it is "observed".
*/
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');

function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; }
const romPath = process.argv[2], outDir = process.argv[3];
if (!romPath || !outDir || romPath.startsWith('--')) {
  console.error('Usage: node forge_capture.cjs <rom.nes> <outdir> --forge Forge.html --harness harness.cjs --at 30,300 [--input "120:Enter:4"] [--tag name]');
  process.exit(1);
}
const forgePath = path.resolve(arg('forge', 'Forge.html'));
const harnessPath = path.resolve(arg('harness', 'Tests/upstream/harness.cjs'));
const at = String(arg('at', '30')).split(',').map(Number).sort((a, b) => a - b);
const tag = arg('tag', 'snap');
const inputs = String(arg('input', '')).split(',').filter(Boolean).map(s => {
  const [frame, key, hold] = s.split(':'); return { frame: +frame, key, hold: +(hold || 4) };
});

const rom = fs.readFileSync(romPath);
const sha = crypto.createHash('sha256').update(rom).digest('hex');
const hdr = { prg: rom[4] * 16384, chr: rom[5] * 8192, trainer: (rom[6] & 4) ? 512 : 0 };
const chrFileBase = 16 + hdr.trainer + hdr.prg;

const { loadForge } = require(harnessPath);
const forge = loadForge(forgePath);
forge.context.__rom = new Uint8Array(rom);
const ok = forge.run('emuLoadRomData(__rom,"rom.nes",0)', 20000);
if (!ok) { console.error('Forge emulator refused the ROM'); process.exit(2); }
forge.run('S.tab="emu"'); // Forge only reads the pad while the emulator tab is active
// Log every PPU / mapper / OAM-DMA write with its scanline, so mid-frame splits (status bars, bank switches) can be modelled.
forge.run(`globalThis.__log=[];globalThis.__c0=0;(function(){const __orig=cpuWrite;cpuWrite=function(a,v){const A=a&0xFFFF;const R=A&7;const va=emu.vAddr;const r=__orig(a,v);if((A>=0x2000&&A<0x4000&&(R===0||R===1||R===5||R===6))||A>=0x8000||A===0x4014){__log.push([emu._ppuFrameLine,A,v&255,emu.tAddr,emu.fineX,emu.wLatch?1:0,emu.ppuCtrl,emu.chrBank0,emu.chrBank1]);}else if(A>=0x2000&&A<0x4000&&R===7&&(va&0x3FFF)>=0x3F00){__log.push([emu._ppuFrameLine,A,v&255,va&0x3FFF,0,0,0,0,0]);}return r;};})();`);
const getChr = () => forge.context.__chr || (forge.context.__chr = new Uint8Array(rom.subarray(chrFileBase, chrFileBase + hdr.chr)));

// ---------- PNG (RGBA) ----------
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const n = Buffer.from(t), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(Buffer.concat([n, d]))); return Buffer.concat([l, n, d, c]); };
function pngRGBA(w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- decode ----------
function decodeTile(chr, off) { // -> 8x8 palette indices (Forge chr format)
  const t = [];
  for (let y = 0; y < 8; y++) {
    const lo = chr[off + y], hi = chr[off + 8 + y], row = [];
    for (let x = 0; x < 8; x++) row.push(((lo >> (7 - x)) & 1) | (((hi >> (7 - x)) & 1) << 1));
    t.push(row);
  }
  return t;
}


function mapperState(raw, mm) {
  const base = {
    mapper: raw.mapper,
    prg_bank0_prg_offset: raw.prgBank0, prg_bank1_prg_offset: raw.prgBank1,
    prg_bank0_file_offset: 16 + hdr.trainer + raw.prgBank0, prg_bank1_file_offset: 16 + hdr.trainer + raw.prgBank1,
    chr_pt0_chr_offset: raw.chrBank0, chr_pt1_chr_offset: raw.chrBank1,
    chr_pt0_file_offset: raw.hasChrRam ? null : chrFileBase + raw.chrBank0,
    chr_pt1_file_offset: raw.hasChrRam ? null : chrFileBase + raw.chrBank1,
    chr_is_ram: !!raw.hasChrRam
  };
  if (raw.mapper === 1) { // MMC1: registers and software-controlled mirroring/modes
    return Object.assign(base, {
      mmc1_control: raw.mmc1.control, mmc1_prg_reg: raw.mmc1.prg, mmc1_chr0: raw.mmc1.chr0, mmc1_chr1: raw.mmc1.chr1,
      nametable_mirroring: ['single_screen_low', 'single_screen_high', 'vertical', 'horizontal'][mm],
      prg_mode: (raw.mmc1.control >> 2) & 3, chr_mode_4k: !!((raw.mmc1.control >> 4) & 1)
    });
  }
  // Any other mapper: do NOT print MMC1 fields. Mirroring is taken from the iNES header (a mapper may override it).
  const fourScreen = !!(rom[6] & 8);
  return Object.assign(base, {
    nametable_mirroring: fourScreen ? 'four_screen_header' : ((rom[6] & 1) ? 'vertical_header' : 'horizontal_header'),
    mapper_registers: 'not captured: this tool only decodes MMC1 registers (mapper 1). Bank offsets above come from the emulator.',
    emulator_mirroring_field: raw.mirroringField
  });
}

function snapshot(frame) {
  const raw = JSON.parse(forge.run(`(()=>{const e=emu;const a=x=>Array.from(x);
    return JSON.stringify({frame:e.frameCount,mapper:e.mapper,mirroringField:e.mirroring,
      mmc1:{control:e.mmc1Ctrl,prg:e.mmc1Prg,chr0:e.mmc1Chr0,chr1:e.mmc1Chr1},
      prgBank0:e.prgBank0,prgBank1:e.prgBank1,chrBank0:e.chrBank0,chrBank1:e.chrBank1,hasChrRam:e.hasChrRam,
      ppuCtrl:e.ppuCtrl,ppuMask:e.ppuMask,palRam:a(e.palRam),oam:a(e.oamMem),vram:a(e.vram),ram:a(e.ram),
      chrRamFirst:e.hasChrRam?a(e.chrRam):null,
      tAddrPre:e.tAddrPre,fineXPre:e.fineXPre,chrBank0Pre:e.chrBank0Pre,chrBank1Pre:e.chrBank1Pre,ctrl0:globalThis.__c0,pal0:globalThis.__pal0,vram0:globalThis.__vram0,oam0:globalThis.__oam0,log:globalThis.__log.slice()});})()`, 20000));
  const fb = forge.run('Array.from(emu.frameBuffer)', 20000);
  const dir = path.join(outDir, `${tag}_f${frame}`); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'screen.png'), pngRGBA(256, 240, Uint8ClampedArray.from(fb)));

  const ctrl = raw.ppuCtrl;
  const bgTable = (ctrl >> 4) & 1, spTable = (ctrl >> 3) & 1, tall = !!((ctrl >> 5) & 1), ntBase = ctrl & 3;
  const chrSrc = raw.hasChrRam ? Uint8Array.from(raw.chrRamFirst) : null;
  const tableOffsets = [raw.chrBank0, raw.chrBank1];
  function table(which) { // 256 tiles of the 4 KiB pattern table 'which' (0=$0000,1=$1000)
    const base = tableOffsets[which], tiles = [], src = [];
    for (let i = 0; i < 256; i++) {
      const off = base + i * 16;
      if (chrSrc) { tiles.push(decodeTile(chrSrc, which * 4096 + i * 16)); src.push(null); }
      else { tiles.push(decodeTile(getChr(), off)); src.push(chrFileBase + off); }
    }
    return { tiles, fileOffsets: src };
  }
  const bgT = table(bgTable), spT = table(spTable);
  const vram = raw.vram0 || raw.vram; // VRAM as it was when the frame started rendering (end-of-frame VRAM already holds next frame's vblank writes)
  const nts = [0, 1, 2, 3].map(n => ({ nt: vram.slice(n * 1024, n * 1024 + 960), attr: vram.slice(n * 1024 + 960, n * 1024 + 1024) }));
  const mm = raw.mmc1.control & 3; // 0/1 single-screen, 2 vertical, 3 horizontal
  // Forge's emulator stores 2 physical nametables (vram[0..1023]=A, [1024..2047]=B); map the 4 LOGICAL tables onto them.
  const mirrorMode = raw.mapper === 1 ? ['single_low', 'single_high', 'vertical', 'horizontal'][mm] : ((rom[6] & 8) ? 'four' : ((rom[6] & 1) ? 'vertical' : 'horizontal'));
  const phys = l => mirrorMode === 'vertical' ? (l & 1) : mirrorMode === 'horizontal' ? (l >> 1) : mirrorMode === 'single_low' ? 0 : mirrorMode === 'single_high' ? 1 : l;
  const oam = [];
  for (let i = 0; i < 64; i++) {
    const y = (raw.oam0 || raw.oam)[i * 4], tile = (raw.oam0 || raw.oam)[i * 4 + 1], attr = (raw.oam0 || raw.oam)[i * 4 + 2], x = (raw.oam0 || raw.oam)[i * 4 + 3];
    if (y >= 0xef) continue; // off-screen
    oam.push({ index: i, y: y + 1, tile, attr, x, pal: attr & 3, flipH: !!(attr & 0x40), flipV: !!(attr & 0x80), behind: !!(attr & 0x20) });
  }
  // ---- built-in self-check: rebuild BG from captured data, compare to emulator screen.png ----
  // Palette-free: learns NES-color -> RGB from the emulator frame itself. If tiles/attrs/palettes
  // were captured correctly, every NES color index maps to exactly ONE rgb. Sprite boxes are skipped.
  const maskSet = new Set(); const sprH = tall ? 16 : 8;
  for (const o of oam) for (let yy = o.y; yy < Math.min(240, o.y + sprH); yy++) for (let xx = o.x; xx < Math.min(256, o.x + 8); xx++) maskSet.add(yy * 256 + xx);
  const votes = new Map(), pts = [];
  const nt0 = nts[phys(ntBase)].nt, at0 = nts[phys(ntBase)].attr, pr0 = raw.palRam[0];
  for (let ty = 0; ty < 30; ty++) for (let tx = 0; tx < 32; tx++) {
    const t = bgT.tiles[nt0[ty * 32 + tx]], a = at0[(ty >> 2) * 8 + (tx >> 2)], p = (a >> ((((ty >> 1) & 1) * 2 + ((tx >> 1) & 1)) * 2)) & 3;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const X = tx * 8 + x, Y = ty * 8 + y; if (maskSet.has(Y * 256 + X)) continue;
      const i = t[y][x], c = (i ? raw.palRam[p * 4 + i] : pr0) & 63, k = (fb[(Y * 256 + X) * 4] << 16) | (fb[(Y * 256 + X) * 4 + 1] << 8) | fb[(Y * 256 + X) * 4 + 2];
      if (!votes.has(c)) votes.set(c, new Map()); votes.get(c).set(k, (votes.get(c).get(k) || 0) + 1); pts.push([c, k]);
    }
  }
  const best = new Map(); for (const [c, m] of votes) best.set(c, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  const okPx = pts.filter(([c, k]) => best.get(c) === k).length;
  let consistency = pts.length ? +(100 * okPx / pts.length).toFixed(2) : null;
  const screenColors = new Set(pts.map(p => p[1])).size;
  let verdict = consistency === null ? 'UNKNOWN' : (consistency >= 99.5 ? 'PASS' : 'FAIL');

  // ---- per-scanline model: replays the frame's PPU writes line by line (HUD splits, mid-frame scroll/bank changes) ----
  let segments = null, flatConsistency = consistency, mainNt = nts[phys(ntBase)].nt, mainAttr = nts[phys(ntBase)].attr, mainChrTiles = bgT.tiles, mainPal = raw.palRam, modelNote = 'flat (single PPU state per frame)';
  if (!raw.hasChrRam && Array.isArray(raw.log)) {
    const CHR = getChr();
    let t = raw.tAddrPre, fineX = raw.fineXPre, ctrl = raw.ctrl0, c0 = raw.chrBank0Pre, c1 = raw.chrBank1Pre;
    let yBase = ((t >> 5) & 31) * 8 + ((t >> 12) & 7), ntyBase = (t >> 11) & 1, yRef = 0;
    const evs = raw.log.filter(e => e[0] >= 0 && e[0] < 240);
    let ei = 0; const L = []; const palNow = Array.from(raw.pal0 || raw.palRam); const palLines = [];
    for (let y = 0; y < 240; y++) {
      while (ei < evs.length && evs[ei][0] < y) {
        const e = evs[ei++], A = e[1];
        if (A >= 0x2000 && A < 0x4000 && (A & 7) === 7) { let pa = e[3] & 0x1F; if (pa >= 16 && (pa & 3) === 0) pa -= 16; palNow[pa] = e[2] & 63; continue; }
        if (A >= 0x2000 && A < 0x4000) {
          t = e[3]; fineX = e[4]; ctrl = e[6];
          if ((A & 7) === 6 && e[5] === 0) { yBase = ((t >> 5) & 31) * 8 + ((t >> 12) & 7); ntyBase = (t >> 11) & 1; yRef = e[0] + 1; }
        }
        c0 = e[7]; c1 = e[8];
      }
      let Y = yBase + (y - yRef), nty = ntyBase; while (Y >= 240) { Y -= 240; nty ^= 1; }
      L.push({ ntx: (t >> 10) & 1, nty, cx: t & 31, fx: fineX, Y, bg: (ctrl >> 4) & 1, c0, c1, pal: palNow.join(',') }); palLines.push(Array.from(palNow));
    }
    const tcache = new Map(), tileRows = (base, idx) => { const k = base * 256 + idx; let r = tcache.get(k); if (!r) { r = decodeTile(CHR, base + idx * 16); tcache.set(k, r); } return r; };
    const v2 = new Map(), p2 = []; const cidx = new Int16Array(240 * 256).fill(-1);
    for (let y = 0; y < 240; y++) {
      const st = L[y], base = st.bg ? st.c1 : st.c0;
      for (let x = 0; x < 256; x++) {
        if (maskSet.has(y * 256 + x)) continue;
        const wx = st.cx * 8 + st.fx + x, xf = (wx >> 8) & 1, col = wx & 255;
        const N = nts[phys(st.nty * 2 + (st.ntx ^ xf))], tc = col >> 3, tr = st.Y >> 3;
        const a = N.attr[(tr >> 2) * 8 + (tc >> 2)], pp = (a >> ((((tr >> 1) & 1) * 2 + ((tc >> 1) & 1)) * 2)) & 3;
        const px = tileRows(base, N.nt[tr * 32 + tc])[st.Y & 7][col & 7];
        const PL = palLines[y], c = (px ? PL[pp * 4 + px] : PL[0]) & 63, k = (fb[(y * 256 + x) * 4] << 16) | (fb[(y * 256 + x) * 4 + 1] << 8) | fb[(y * 256 + x) * 4 + 2];
        if (!v2.has(c)) v2.set(c, new Map()); v2.get(c).set(k, (v2.get(c).get(k) || 0) + 1); p2.push([c, k]); cidx[y * 256 + x] = c;
      }
    }
    const best2 = new Map(); for (const [c, m] of v2) best2.set(c, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
    const ok2 = p2.filter(([c, k]) => best2.get(c) === k).length;
    { // debug image: what the model rebuilt (magenta = sprite-masked pixel), for visual comparison with screen.png
      const out = new Uint8ClampedArray(240 * 256 * 4);
      for (let i = 0; i < 240 * 256; i++) { const c = cidx[i], k = c >= 0 ? best2.get(c) : null; out[i * 4] = k == null ? 255 : (k >> 16) & 255; out[i * 4 + 1] = k == null ? 0 : (k >> 8) & 255; out[i * 4 + 2] = k == null ? 255 : k & 255; out[i * 4 + 3] = 255; }
      fs.writeFileSync(path.join(dir, 'rebuilt.png'), pngRGBA(256, 240, out));
    }
    consistency = p2.length ? +(100 * ok2 / p2.length).toFixed(2) : null;
    verdict = consistency === null ? 'UNKNOWN' : (consistency >= 99.5 ? 'PASS' : 'FAIL');
    modelNote = 'per-scanline replay of PPU writes';
    // segments of identical PPU state
    segments = []; let cur = null;
    for (let y = 0; y < 240; y++) {
      const st = L[y], key = [st.ntx, st.cx, st.fx, st.bg, st.c0, st.c1, ((st.Y - y) % 240 + 240) % 240, st.pal].join(',');
      if (cur && cur.key === key) cur.to_line = y; else { cur = { key, from_line: y, to_line: y, nametable_x: st.ntx, nametable_y_at_start: st.nty, coarse_x: st.cx, fine_x: st.fx, y_scroll_at_start: st.Y, bg_pattern_table: st.bg, chr_pt0_chr_offset: st.c0, chr_pt1_chr_offset: st.c1, palette_ram: st.pal.split(',').map(Number) }; segments.push(cur); }
    }
    segments.forEach(g => delete g.key);
    const main = segments.slice().sort((a, b) => (b.to_line - b.from_line) - (a.to_line - a.from_line))[0];
    const mN = nts[phys(main.nametable_y_at_start * 2 + main.nametable_x)]; mainNt = mN.nt; mainAttr = mN.attr; mainPal = main.palette_ram;
    const mBase = main.bg_pattern_table ? main.chr_pt1_chr_offset : main.chr_pt0_chr_offset; mainChrTiles = [];
    for (let i = 0; i < 256; i++) mainChrTiles.push(decodeTile(CHR, mBase + i * 16));
    fs.writeFileSync(path.join(dir, 'ppu_writes.json'), JSON.stringify({ note: 'rows: [scanline, cpu_addr, value, t_after, fineX_after, wLatch_after, ppuCtrl_after, chr0_after, chr1_after]', frame_start: { tAddr: raw.tAddrPre, fineX: raw.fineXPre, ppuCtrl: raw.ctrl0, chr0: raw.chrBank0Pre, chr1: raw.chrBank1Pre }, writes: raw.log }));
  }
  console.log(`  verify frame ${frame}: bg_consistency=${consistency}% -> ${verdict} [${modelNote.startsWith('per') ? 'per-scanline' : 'flat'}; flat model ${flatConsistency}%] (distinct on-screen colors ${screenColors}, rebuilt NES colors ${best.size}, sprites ${oam.length})`);
  const sh = i => fs.writeFileSync(path.join(dir, i[0]), JSON.stringify(i[1], null, 1) + '\n');
  const sprChrSrc = tall ? 'sprite size 8x16: tile bit0 selects pattern table' : `table $${spTable ? '1000' : '0000'}`;
  sh(['state.json', {
    format: 'NESForgeRuntimeSnapshot', version: '0.1', status: 'observed',
    rom: { sha256: sha, mapper: raw.mapper }, frame: raw.frame, input_script: inputs,
    mapper_state: mapperState(raw, mm),
    nametable_mirroring_mode: mirrorMode, logical_to_physical_nametable: [0, 1, 2, 3].map(phys), scanline_segments: segments, hud_split: !!(segments && segments.length > 1),
    ppu: { ctrl: ctrl, mask: raw.ppuMask, bg_pattern_table: bgTable, sprite_pattern_table: spTable, sprite_size: tall ? '8x16' : '8x8', base_nametable: ntBase, scroll: 'not captured (emulator field unverified)' },
    palette_ram: raw.palRam, oam_visible: oam, sprite_chr_note: sprChrSrc,
    nametables_equal: { nt0_nt1: JSON.stringify(nts[0].nt) === JSON.stringify(nts[1].nt), nt0_nt2: JSON.stringify(nts[0].nt) === JSON.stringify(nts[2].nt) },
    evidence: { method: 'Forge.html emulator via headless harness', reproduce: `node forge_capture.cjs <rom> <out> --at ${at.join(',')}${inputs.length ? ' --input "' + inputs.map(i => i.frame + ':' + i.key + ':' + i.hold).join(',') + '"' : ''}`, screen_png: 'screen.png' },
    self_check: { bg_consistency_pct: consistency, flat_model_consistency_pct: flatConsistency, model: modelNote, verdict, note: 'PASS means static-background rebuild matches the emulator frame; FAIL usually means scroll, mid-frame register changes, or bank switches not captured' },
    unknowns: ['scroll registers', 'what code loaded these nametables', 'compression format of source data', 'CHR bank switch history before this frame']
  }]);
  sh(['forge_shapes.json', {
    note: 'Forge .nesforge.json field shapes. chr = BG pattern table in use, sprChr = sprite table in use. nt/attr are the nametable selected by PPUCTRL; other nametables in nametables[].',
    chr: mainChrTiles, sprChr: spT.tiles,
    pal: [0, 1, 2, 3].map(i => mainPal.slice(i * 4, i * 4 + 4)),
    sprPal: [0, 1, 2, 3].map(i => mainPal.slice(16 + i * 4, 16 + i * 4 + 4)),
    nt: mainNt, attr: mainAttr, nametables: nts, scanline_segments: segments,
    oam: oam.map(o => ({ y: o.y, tile: o.tile, attr: o.attr, x: o.x, active: true, height: tall ? 16 : 8 })),
    chr_tile_file_offsets: { bg: bgT.fileOffsets, spr: spT.fileOffsets }
  }]);
  return dir;
}

// ---------- run ----------
const maxFrame = at[at.length - 1], held = new Map();
let nextAt = 0;
for (let f = 1; f <= maxFrame; f++) {
  for (const i of inputs) if (i.frame === f) { forge.run(`emuKeys[${JSON.stringify(i.key)}]=true`); held.set(i.key, f + i.hold); }
  for (const [k, until] of [...held]) if (f >= until) { forge.run(`delete emuKeys[${JSON.stringify(k)}]`); held.delete(k); }
  forge.run('__log.length=0;__c0=emu.ppuCtrl;__pal0=Array.from(emu.palRam);__vram0=Array.from(emu.vram);__oam0=Array.from(emu.oamMem);emuRunFrame()', 20000);
  if (f === at[nextAt]) { console.log('snapshot ->', snapshot(f)); nextAt++; }
}
if (forge.errors.length) console.error('Forge reported', forge.errors.length, 'script errors');
