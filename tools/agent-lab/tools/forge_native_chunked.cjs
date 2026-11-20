#!/usr/bin/env node
'use strict';
/*
 NES Forge NATIVE RESOURCES extraction: every room/level page Forge's built-in adapters can read
 straight from the ROM bytes (Metroid, Mega Man, Contra, TMNT, Final Fantasy, Shadowgate, Lolo,
 River City Ransom, Punch-Out!! ... whichever adapters this Forge.html has).

 Usage:
   node forge_native_resources.cjs <rom.nes> <outdir> --forge <Forge.html> --harness <harness.cjs> [--only TEXT]

 Writes <outdir>/:
   resources/<group>/<room>.png    each room drawn with its real tiles and palettes (pages side by side)
   resources/<group>/<room>.json   the room's pages as Forge scenes (tiles, palettes, layout)
   <name>.native.nesforge.json     ONE Forge project for the whole game. Open it in Forge and use
                                   Area library to browse and edit every room. It contains your ROM,
                                   so keep it private.
   resources.html                  every room as a picture
   resources_report.json           counts, PASS/FAIL
*/
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
function arg(name, def) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; }
const romPath = process.argv[2], outDir = process.argv[3];
if (!romPath || !outDir || romPath.startsWith('--')) {
  console.error('Usage: node forge_native_resources.cjs <rom.nes> <outdir> --forge Forge.html --harness harness.cjs [--only TEXT]');
  process.exit(1);
}
const forgePath = path.resolve(arg('forge', 'Forge.html')), harnessPath = path.resolve(arg('harness', 'Tests/upstream/harness.cjs'));
const only = arg('only', null);
const startRaw = arg('start-room', '0'), maxRaw = arg('max-rooms', null);
const safeInt = text => /^\d+$/.test(text) && Number.isSafeInteger(Number(text));
if (!safeInt(startRaw) || (maxRaw !== null && (!safeInt(maxRaw) || Number(maxRaw) < 1))) {
  console.error('Invalid room window; use --start-room >= 0 and --max-rooms >= 1.'); process.exit(2);
}
const startRoom = Number(startRaw), maxRooms = maxRaw === null ? null : Number(maxRaw);
const rom = fs.readFileSync(romPath);
const sha = crypto.createHash('sha256').update(rom).digest('hex');
const { loadForge } = require(harnessPath);
const forge = loadForge(forgePath);
if (!forge.context.crypto || !forge.context.crypto.subtle) forge.context.crypto = crypto.webcrypto;
forge.context.setTimeout = (fn, ms, ...rest) => setTimeout(fn, 0, ...rest);
const plain = v => JSON.parse(JSON.stringify(v));
const safe = s => String(s).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'x';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const n = Buffer.from(t), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(Buffer.concat([n, d]))); return Buffer.concat([l, n, d, c]); };
function pngRGB(w, h, rgb) {
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const NES = plain(forge.run('NP'));
// Draw one Forge scene (32x30 tiles, attribute table, 4 palettes) into an RGB buffer at x offset.
function drawScene(sc, rgb, width, ox) {
  for (let ty = 0; ty < 30; ty++) for (let tx = 0; tx < 32; tx++) {
    const tile = sc.chr[sc.nt[ty * 32 + tx]] , a = sc.attr[(ty >> 2) * 8 + (tx >> 2)], pal = sc.pal[(a >> (((ty & 2) ? 4 : 0) + ((tx & 2) ? 2 : 0))) & 3];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const ci = tile ? tile[y][x] : 0, c = NES[(ci ? pal[ci] : sc.pal[0][0]) & 63], i = ((ty * 8 + y) * width + ox + tx * 8 + x) * 3;
      rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
    }
  }
}

// ---------- Metroid collision ----------
// Fixed-bank routine at $E7EB reads the room tile, calls $D651 (CMP #$70, or CMP #$80 in one area) and then CMP #$A0.
// For Samus: any tile below $A0 blocks. Tiles from the first threshold up to $97 are removed when shot.
// The opcodes are checked in the ROM before the rule is used.
function metroidRule(bytes) {
  const f = pc => 16 + 7 * 16384 + (pc - 0xC000), eq = (pc, list) => list.every((b, i) => bytes[f(pc) + i] === b);
  if (!eq(0xD651, [0xA4, 0x74, 0xC0, 0x10, 0xF0, 0x04, 0xC9, 0x70, 0xB0, 0x02, 0xC9, 0x80, 0x60]) || !eq(0xE7F4, [0x20, 0x51, 0xD6, 0x90, 0x24, 0xC9, 0xA0]) || !eq(0xE9C6, [0xC0, 0x98])) return null;
  const cls = t => (t >= 0xA0 ? 0 : t >= 0x98 ? 1 : t >= 0x80 ? 2 : t >= 0x70 ? 3 : 1);
  return { cls, names: ['open', 'solid', 'solid, removed when shot', 'solid, removed when shot (except in the area whose id is $10)'],
    source: { solidityTestCpu: 0xD651, solidityTestFileOffset: f(0xD651), callerCpu: 0xE7EB, callerFileOffset: f(0xE7EB), breakLimitCpu: 0xE9C6 },
    rule: 'tile < $A0 blocks; $70/$80..$97 can be shot away; tile $4E is an item tile handled separately',
    limits: ['Static tiles only. Doors, elevators, lava/acid damage and enemies are separate checks.'] };
}

// ---------- Mega Man collision ----------
// Fixed-bank routine at $CCD8: room = [$8C00 + screen]; layout = pointer at $8C30 + room*2 (64 block ids, column-major);
// tile byte = [$8000 + block*4 + quadrant]; type = tile byte >> 6; class = [$CD46 + stage*4 + type].
// The caller treats class 1 and 4 as ground and class 2 as a ladder. Opcodes are checked before the rule is used.
function megamanRule(bytes) {
  const f = pc => 16 + 7 * 16384 + (pc - 0xC000), eq = (pc, list) => list.every((b, i) => bytes[f(pc) + i] === b);
  if (!eq(0xCCDA, [0xB9, 0x00, 0x8C]) || !eq(0xCCDF, [0xB9, 0x30, 0x8C]) || !eq(0xCD22, [0xB1, 0x08, 0x29, 0xC0]) || !eq(0xCD32, [0xB9, 0x46, 0xCD]) || !eq(0xCCA1, [0xC9, 0x01, 0xF0, 0x0B, 0xC9, 0x04])) return null;
  const names = ['open', 'solid', 'ladder', 'special type 3 (stage hazard; meaning not traced)', 'solid (second ground class, Ice Man stage)', 'special type 5 (Ice Man stage; meaning not traced)', 'special type 6 (Fire Man stage; meaning not traced)', 'block object from the stage zone table (solid to the player; e.g. blocks Guts Man can lift)'];
  function room(resourceId) {
    const m = /^megaman:(\d+):(\d+)$/.exec(resourceId); if (!m) return null;
    const stage = +m[1], r = +m[2], bank = stage < 6 ? stage : stage - 6, base = 16 + bank * 16384;
    const pointer = bytes[base + 0xC30 + r * 2] | (bytes[base + 0xC31 + r * 2] << 8);
    if (pointer < 0x8000 || pointer > 0xBFC0) return null;
    const layout = base + pointer - 0x8000, cells = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const block = bytes[layout + (x >> 1) * 8 + (y >> 1)], tile = bytes[base + block * 4 + (y & 1) + 2 * (x & 1)];
      cells.push(bytes[f(0xCD46) + stage * 4 + (tile >> 6)]);
    }
    // Zone table (copied to RAM $0720 at $C4C6): [count] then [class, screen, x1, y1, x2, y2] per zone, checked at $CD8A
    // before the tile lookup. A zone with class 0 is skipped by the game. Zones are per screen; apply those of every
    // screen that shows this room ([$8C00 + screen] = room).
    const zo = base + (stage < 6 ? 0x8DFF : 0x8E9F) - 0x8000, n = bytes[zo + 1], screens = [], zones = [];
    for (let sc = 0; sc < 64 && bytes[base + 0xC00 + sc] !== 0xFF; sc++) if (bytes[base + 0xC00 + sc] === r) screens.push(sc);
    for (let i = 0; i < n; i++) { const e = bytes.subarray(zo + 2 + i * 6, zo + 8 + i * 6); if (e[0] && screens.includes(e[1])) zones.push({ zoneClass: e[0], screen: e[1], x1: e[2], y1: e[3], x2: e[4], y2: e[5] }); }
    for (const z of zones) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const px = x * 16 + 8, py = y * 16 + 8;
      if (px >= z.x1 && (!z.x2 || px < z.x2) && py >= z.y1 && (!z.y2 || py < z.y2)) cells[y * 16 + x] = 7; }
    return { width: 16, height: 16, cellPixels: 16, cells, zones, screens, source: { stage, room: r, zoneTableFileOffset: zo, bank16KiB: bank, layoutFileOffset: layout, blockTableFileOffset: base, classTableFileOffset: f(0xCD46) + stage * 4 } };
  }
  return { room, names, rule: 'zone table first (class 7 inside a zone rectangle), otherwise class = [$CD46 + stage*4 + (tileByte >> 6)]. Checked against the game: the game\'s own routine at $CCB7 gives the same result for every cell of every screen in all 10 stages', limits: ['Static level cells only. Disappearing blocks, moving platforms, enemies and boss doors are separate objects.', 'Classes 3, 5 and 6 are distinct in the ROM but their effect on the player has not been traced.'] };
}

// ---------- Contra collision ----------
// Fixed-bank classifier at $E005 runs on the pattern tile at the top-left of each 16x16 cell while the level is drawn:
//   tile 0 -> empty; tile < T0 -> floor; tile < T1 -> empty; tile < T2 -> water; otherwise solid.
// T0..T2 are bytes 6-8 of the level's 32-byte header in bank 2 (level 1 header at $B31C). Checked against the running game:
// in level 1 the live thresholds at $49-$4B are 06 F9 FF, the same as the header. Opcodes are checked before use.
function contraRule(bytes) {
  const f = pc => 16 + 7 * 16384 + (pc - 0xC000), eq = (pc, list) => list.every((b, i) => bytes[f(pc) + i] === b);
  if (!eq(0xE005, [0xA8, 0xF0, 0x0C, 0xC5, 0x49, 0xB0, 0x04, 0xA9, 0x01]) || !eq(0xE010, [0xC5, 0x4A, 0xB0, 0x04, 0xA9, 0x00]) || !eq(0xE018, [0xC5, 0x4B, 0xB0, 0x04, 0xA9, 0x02])) return null;
  const header = lv => 16 + 2 * 16384 + (0xB31C - 0x8000) + lv * 32;
  if (bytes[header(0) + 6] !== 0x06 || bytes[header(0) + 7] !== 0xF9 || bytes[header(0) + 8] !== 0xFF) return null;
  const names = ['open', 'floor (stand on, can pass through from below)', 'water', 'solid'];
  function level(resourceId) {
    const m = /^contra:(\d+):/.exec(resourceId); if (!m) return null;
    const lv = +m[1]; if (lv < 0 || lv > 7) return null;
    const at = header(lv) + 6, t = [bytes[at], bytes[at + 1], bytes[at + 2]];
    const cls = tile => (tile === 0 ? 0 : tile < t[0] ? 1 : tile < t[1] ? 0 : tile < t[2] ? 2 : 3);
    return { cls, thresholds: t, source: { level: lv, thresholdFileOffset: at, classifierCpu: 0xE005, classifierFileOffset: f(0xE005) } };
  }
  return { level, names, rule: 'class by the pattern tile at the top-left of each 16x16 cell: 0 open; <T0 floor; <T1 open; <T2 water; else solid',
    limits: ['Applies to the side-scrolling and vertical levels. The two indoor base levels use a different play field and are not classified.', 'Static level cells only; bridges that explode, enemies and bullets are separate objects.'] };
}

(async () => {
  let note = null, recognised = null;
  const variants = [new Uint8Array(rom)];
  for (const low of [0, 1, 2, 3]) for (const b7 of [rom[7] & 0xf0, 0]) { const c = new Uint8Array(rom); c[6] = (rom[6] & 0xf0) | low; c[7] = b7; c.fill(0, 8, 16); variants.push(c); }
  for (const v of variants) {
    forge.context.__rom = v;
    const rec = plain(forge.run('Forge.services.NativeResourceProject.recognizes(__rom)||null'));
    if (rec) { recognised = rec; if (v !== variants[0]) note = 'Recognised after normalising the 16-byte header in memory.'; break; }
  }
  if (!recognised) {
    console.error('NO NATIVE RESOURCE ADAPTER for this exact ROM (SHA-256 ' + sha + ').');
    process.exit(3);
  }
  forge.context.__name = path.basename(romPath);
  await forge.run('(async()=>{globalThis.__p=await Forge.services.NativeResourceProject.create(__rom,__name)})()', 600000);
  const lib = plain(forge.run('(()=>{const v=Forge.services.NativeResourceProject.libraryView(__p);return {scenes:v.scenes||[],maps:v.maps||[],profile:v.profile||null}})()', 600000));
  const title = forge.run('__p.projectName');
  fs.mkdirSync(outDir, { recursive: true });
  const stem = safe(path.basename(romPath).replace(/\.nes$/i, ''));
  const projectFile = path.join(outDir, stem + '.native.nesforge.json');
  fs.writeFileSync(projectFile, forge.run('JSON.stringify(__p)', 600000));

  const filtered = lib.scenes.filter(res => !only || ((res.label || '') + ' ' + (res.group || '')).toLowerCase().includes(only.toLowerCase()));
  const selected = filtered.slice(startRoom, maxRooms === null ? undefined : startRoom + maxRooms);
  if (!selected.length) throw Error('Empty native room window; inspect listed count and --start-room.');
  const selection = { filtered: filtered.length, start: startRoom, selected: selected.length,
    end_exclusive: startRoom + selected.length, complete: selected.length === lib.scenes.length };
  const stats = { adapter: recognised.id, listed: lib.scenes.length, rooms: 0, pages: 0, unavailable: 0, failed: 0, rooms_with_collision: 0 };
  const tileRule = recognised.kind === 'metroid' ? metroidRule(forge.context.__rom) : null;
  const cellRule = recognised.kind === 'megaman' ? megamanRule(forge.context.__rom) : null;
  const ntRule = recognised.kind === 'contra' ? contraRule(forge.context.__rom) : null;
  const cards = [], problems = [];
  for (const res of selected) {
    forge.context.__res = res.id;
    let pages;
    try { pages = plain(forge.run('Forge.services.NativeResourceProject.pageList(__p,__res)', 600000)); } catch (e) { pages = []; problems.push(res.label + ': ' + String(e.message).slice(0, 120)); }
    if (!pages.length) { stats.unavailable++; continue; }
    const scenes = [];
    for (const pg of pages) {
      forge.context.__page = pg.page;
      try {
        const sc = plain(forge.run('(()=>{const r=Forge.services.NativeResourceProject.addPage(__p,__res,__page);return r.scenes[r.activeScene]})()', 600000));
        scenes.push(sc);
      } catch (e) { stats.failed++; problems.push(res.label + ' page ' + pg.page + ': ' + String(e.message).slice(0, 120)); }
    }
    if (!scenes.length) continue;
    const group = safe(res.group || 'rooms'), base = safe(res.label || res.id), dir = path.join(outDir, 'resources', group);
    fs.mkdirSync(dir, { recursive: true });
    const width = scenes.length * 256, rgb = Buffer.alloc(width * 240 * 3);
    scenes.forEach((sc, i) => drawScene(sc, rgb, width, i * 256));
    fs.writeFileSync(path.join(dir, base + '.png'), pngRGB(width, 240, rgb));
    let collision = null;
    if (tileRule) {
      // In this game collision is decided by the tile number itself, so Forge's per-tile collision table is exact.
      const props = Array.from({ length: 256 }, (_, t) => (tileRule.cls(t) ? 1 : 0));
      for (const sc of scenes) sc.tileProps = props;
      const over = Buffer.from(rgb), tint = [null, [150, 0, 0], [150, 110, 0], [150, 110, 0]];
      scenes.forEach((sc, pi) => { for (let ty = 0; ty < 30; ty++) for (let tx = 0; tx < 32; tx++) { const k = tileRule.cls(sc.nt[ty * 32 + tx]);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = ((ty * 8 + y) * width + pi * 256 + tx * 8 + x) * 3;
          if (k) { over[i] = Math.min(255, (over[i] >> 1) + tint[k][0]); over[i + 1] = Math.min(255, (over[i + 1] >> 1) + tint[k][1]); over[i + 2] >>= 1; } else { over[i] >>= 2; over[i + 1] >>= 2; over[i + 2] >>= 2; } } } });
      fs.writeFileSync(path.join(dir, base + '_collision.png'), pngRGB(width, 240, over));
      collision = { rule: tileRule.rule, classNames: tileRule.names, source: tileRule.source, limits: tileRule.limits, pages: scenes.map(sc => sc.nt.map(t => tileRule.cls(t))) };
      stats.rooms_with_collision++;
    }
    fs.writeFileSync(path.join(dir, base + '.json'), JSON.stringify({ resource: res, collision, pages: scenes.map(sc => ({ name: sc.name, nt: sc.nt, attr: sc.attr, pal: sc.pal, tileProps: sc.tileProps, captureMeta: sc.captureMeta })), chr: scenes[0].chr }));
    if (ntRule && scenes.length) {
      const lv = ntRule.level(res.id);
      if (lv && !(lv.thresholds[1] === 255 && lv.thresholds[0] === 0)) {
        const over = Buffer.from(rgb), tints = [null, [0, 130, 0], [0, 60, 170], [150, 0, 0]], pages = [];
        scenes.forEach((sc, pi) => { const cells = [];
          for (let cy = 0; cy < 15; cy++) for (let cx = 0; cx < 16; cx++) { const k = lv.cls(sc.nt[cy * 2 * 32 + cx * 2]); cells.push(k);
            for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = ((cy * 16 + y) * width + pi * 256 + cx * 16 + x) * 3;
              if (k) { over[i] = Math.min(255, (over[i] >> 1) + tints[k][0]); over[i + 1] = Math.min(255, (over[i + 1] >> 1) + tints[k][1]); over[i + 2] = Math.min(255, (over[i + 2] >> 1) + tints[k][2]); } else { over[i] >>= 2; over[i + 1] >>= 2; over[i + 2] >>= 2; } } }
          pages.push(cells); });
        fs.writeFileSync(path.join(dir, base + '_collision.png'), pngRGB(width, 240, over));
        collision = { rule: ntRule.rule, classNames: ntRule.names, limits: ntRule.limits, thresholds: lv.thresholds, source: lv.source, width: 16, height: 15, cellPixels: 16, pages };
        stats.rooms_with_collision++;
        const data = JSON.parse(fs.readFileSync(path.join(dir, base + '.json'), 'utf8')); data.collision = collision; fs.writeFileSync(path.join(dir, base + '.json'), JSON.stringify(data));
      }
    }
    if (cellRule && scenes.length) {
      const c = cellRule.room(res.id);
      if (c) {
        // Room is 256x256: page 0 holds the top 240 lines, page 1 the remaining 16.
        const W = 256, H = 256, over = Buffer.alloc(W * H * 3), tints = [null, [150, 0, 0], [0, 110, 150], [150, 110, 0], [150, 0, 90], [150, 110, 0], [150, 110, 0], [170, 60, 0]];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const sy = y < 240 ? y : y - 240, sx = (y < 240 ? 0 : 256) + x, src = (y < 240 || scenes.length > 1) ? (sy * width + sx) * 3 : -1, i = (y * W + x) * 3, k = c.cells[(y >> 4) * 16 + (x >> 4)];
          const p = src >= 0 ? [rgb[src], rgb[src + 1], rgb[src + 2]] : [0, 0, 0];
          if (k) { const t = tints[k] || [150, 110, 0]; over[i] = Math.min(255, (p[0] >> 1) + t[0]); over[i + 1] = Math.min(255, (p[1] >> 1) + t[1]); over[i + 2] = Math.min(255, (p[2] >> 1) + t[2]); } else { over[i] = p[0] >> 2; over[i + 1] = p[1] >> 2; over[i + 2] = p[2] >> 2; }
        }
        fs.writeFileSync(path.join(dir, base + '_collision.png'), pngRGB(W, H, over));
        collision = { rule: cellRule.rule, classNames: cellRule.names, limits: cellRule.limits, ...c };
        stats.rooms_with_collision++;
        const data = JSON.parse(fs.readFileSync(path.join(dir, base + '.json'), 'utf8')); data.collision = collision; fs.writeFileSync(path.join(dir, base + '.json'), JSON.stringify(data));
      }
    }
    stats.rooms++; stats.pages += scenes.length;
    cards.push({ label: res.label, group: res.group || 'rooms', collisionPng: collision ? path.join('resources', group, base + '_collision.png') : null, png: path.join('resources', group, base + '.png'), json: path.join('resources', group, base + '.json'), pages: scenes.length, status: res.status });
  }
  if (tileRule) { // the starting project gets the same per-tile collision table
    const project = JSON.parse(fs.readFileSync(projectFile, 'utf8')), props = Array.from({ length: 256 }, (_, t) => (tileRule.cls(t) ? 1 : 0));
    for (const sc of project.scenes) sc.tileProps = props; if (Array.isArray(project.tileProps)) project.tileProps = props;
    fs.writeFileSync(projectFile, JSON.stringify(project));
  }
  const status = !stats.rooms ? 'FAIL' : selection.complete ? 'PASS' : 'PARTIAL';
  fs.writeFileSync(path.join(outDir, 'resources_report.json'), JSON.stringify({ format: 'NESForgeNativeResourceExtraction', rom: { sha256: sha, file: path.basename(romPath) }, title, header_note: note, status, selection, stats, problems: problems.slice(0, 50),
    project: stem + '.native.nesforge.json', limits: ['Room layouts, tiles and palettes as the adapter decodes them. Collision, enemies and behaviour are included only where the adapter exposes them in tileProps or captureMeta.', 'The .native.nesforge.json project embeds the ROM. Keep it private.'] }, null, 2) + '\n');
  const groups = new Map(); for (const c of cards) { if (!groups.has(c.group)) groups.set(c.group, []); groups.get(c.group).push(c); }
  const html = ['<!doctype html><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{background:#111;color:#ddd;font:14px system-ui,sans-serif;margin:16px}a{color:#7cf}.r{margin:0 0 16px;padding:8px;background:#1b1b1b;border:1px solid #333;overflow-x:auto}.r img{image-rendering:pixelated;display:block;margin-top:6px}.m{color:#999;font-size:12px}</style>',
    '<h1>' + esc(title) + '</h1><p>' + stats.rooms + ' rooms (' + stats.pages + ' screens) read from the ROM bytes. ' + stats.unavailable + ' listed slots have no decodable page.</p><p class="m">Whole game as one Forge project: ' + esc(stem) + '.native.nesforge.json (Open Project, then Area library). Keep this folder private.</p>'];
  for (const [g, list] of groups) { html.push('<h2>' + esc(g) + ' (' + list.length + ')</h2>'); for (const c of list) html.push('<div class="r"><b>' + esc(c.label) + '</b> <span class="m">' + c.pages + ' screen(s) - <a href="' + esc(c.json) + '">data</a>' + (c.collisionPng ? ' - <a href="' + esc(c.collisionPng) + '">collision</a>' : '') + '</span><img src="' + esc(c.png) + '"></div>'); }
  fs.writeFileSync(path.join(outDir, 'resources.html'), html.join('\n'));
  console.log(status + ': ' + title);
  if (note) console.log('NOTE: ' + note);
  console.log('PAGES: ' + stats.rooms + ' rooms, ' + stats.pages + ' screens from ' + stats.listed + ' listed (' + stats.unavailable + ' unavailable, ' + stats.failed + ' failed)');
  if (stats.rooms_with_collision) console.log('PAGES: collision decoded for ' + stats.rooms_with_collision + ' rooms');
  for (const p of problems.slice(0, 4)) console.log('PROBLEM: ' + p);
  console.log('OPEN: ' + path.join(path.resolve(outDir), 'resources.html'));
  process.exit(status !== 'FAIL' ? 0 : 5);
})().catch(e => { console.error('ERROR: ' + String(e.message).slice(0, 300)); process.exit(4); });
