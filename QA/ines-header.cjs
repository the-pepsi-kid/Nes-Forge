'use strict';
// Formal regression cases for NES cartridge header recognition (src/re/ines-header.js): iNES 1.0, NES 2.0 and archaic
// iNES (bytes 7-15 not header fields, e.g. "DiskDude!"), on synthetic headers and on the local cartridges; the original
// bytes and SHA-256 are never changed; the emulator, the intake analysis and the library read the same mapper; a
// cartridge with a "DiskDude!" header runs in NES Forge's emulator unmodified (it previously read mapper 66 and never
// reached the game's NMI handler).
//   node QA/ines-header.cjs [editor.html] [out.json] [cartridge folder]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), editor = process.argv[2] || path.join(root, 'NES_Forge.html'), out = process.argv[3], carts = process.argv[4];
const H = require('../app/src/re/ines-header.js'), hash = b => crypto.createHash('sha256').update(b).digest('hex');
const results = [];
async function check(name, fn) { try { const detail = await fn(); results.push({name, ok: true, ...(detail ? {detail} : {})}); console.log('PASS', name); }
  catch (e) { results.push({name, ok: false, error: String(e && e.stack || e).slice(0, 1200)}); console.log('FAIL', name, '\n ', String(e && e.message || e).slice(0, 400)); } }
function rom({prg = 2, chr = 1, b6 = 0, b7 = 0, tail = [], extra = 0} = {}) { const r = new Uint8Array(16 + prg * 16384 + chr * 8192 + extra); r.set([0x4e, 0x45, 0x53, 0x1a, prg, chr, b6, b7]); tail.forEach((v, i) => { r[8 + i] = v; }); return r; }
const ascii = s => Array.from(s, c => c.charCodeAt(0));
// the local cartridges' expected header readings (by SHA-256: only revisions that were examined are named)
const EXPECTED = {
  'Mega Man (U)': {format: 'archaic iNES', mapper: 2, declaredMapper: 66, signature: 'DiskDude!'},
  'Shadowgate (U)': {format: 'archaic iNES', mapper: 4, declaredMapper: 68, signature: 'DiskDude!'},
  'Castlevania (U) (PRG 1)': {format: 'archaic iNES', mapper: 2, signature: 'NI 1.3'},
  'Metroid (U)': {format: 'archaic iNES', mapper: 1, signature: 'NI 1.3'},
  "Mike Tyson's Punch-Out!! (U) (PRG 1)": {format: 'archaic iNES', mapper: 9, signature: 'MJR'},
  'Teenage Mutant Ninja Turtles (U)': {format: 'archaic iNES', mapper: 1, signature: 'aster'},
  'Battletoads (U)': {format: 'iNES 1.0', mapper: 7}, 'Ninja Gaiden (U)': {format: 'iNES 1.0', mapper: 1}, 'Mega Man 2 (U)': {format: 'iNES 1.0', mapper: 1},
  'Super Mario Bros - Duck Hunt (U)': {format: 'iNES 1.0', mapper: 66}};
(async () => {
  await check('synthetic: iNES 1.0, NES 2.0 and archaic headers are told apart by the NESdev rules', () => {
    let i = H.inspect(rom({b6: 0x21, b7: 0x10})); assert.equal(i.format, 'iNES 1.0'); assert.equal(i.mapper, 0x12); assert.equal(i.mirroring, 'vertical');
    i = H.inspect(rom({b6: 0x20, b7: 0x44, tail: ascii('iskDude!')})); assert.equal(i.format, 'archaic iNES'); assert.equal(i.mapper, 2); assert.equal(i.declaredMapper, 0x42); assert.equal(i.ignored.signature, 'DiskDude!');
    i = H.inspect(rom({b6: 0x10, tail: [0, 0, 0, 0, ...ascii('aster')]})); assert.equal(i.format, 'archaic iNES'); assert.equal(i.mapper, 1); assert.equal(i.mapperDiffersFromDeclared, false);
    i = H.inspect(rom({b6: 0x10, b7: 0x04})); assert.equal(i.format, 'archaic iNES', 'byte 7 AND $0C = $04 is archaic');
    i = H.inspect(rom({b6: 0x10, tail: [7, 1, 0]})); assert.equal(i.format, 'iNES 1.0', 'bytes 8-11 may be used by iNES 1.0'); assert.equal(i.mapper, 1);
    // NES 2.0: 12-bit mapper, submapper, sizes from byte 9; only when the sizes fit in the file
    i = H.inspect(rom({b6: 0x41, b7: 0x08, tail: [0x00, 0x00, 0x70, 0x07, 0, 0, 0, 0]})); assert.equal(i.format, 'NES 2.0'); assert.equal(i.mapper, 4); assert.equal(i.prgNvramSize, 8192, 'byte 10 high nibble: battery-backed PRG-NVRAM'); assert.equal(i.prgRamSize, 0); assert.equal(i.chrRamSize, 8192); assert.equal(i.timing, 'NTSC');
    i = H.inspect(rom({b6: 0x10, b7: 0x08, tail: [0x21]})); assert.equal(i.format, 'NES 2.0'); assert.equal(i.mapper, 0x101); assert.equal(i.submapper, 2);
    i = H.inspect(rom({b6: 0x10, b7: 0x08, tail: [0, 0x01]})); assert.equal(i.format, 'archaic iNES', 'NES 2.0 bits with sizes larger than the file are not NES 2.0');
    assert.equal(H.inspect(Uint8Array.from([0x4e, 0x45, 0x53])).valid, false); assert.equal(H.inspect(new Uint8Array(32)).valid, false);
    // truncation and trailing bytes are reported, not repaired
    assert.equal(H.inspect(rom({extra: 3})).trailingBytes, 3); assert.equal(H.inspect(rom().subarray(0, 100)).truncated, true);
  });
  await check('synthetic: the original bytes are never changed; the normalized header is a copy', () => {
    const r = rom({b6: 0x20, b7: 0x44, tail: ascii('iskDude!')}), before = hash(r);
    H.inspect(r); const n = H.normalizedHeader(r), v = H.view(r);
    assert.equal(hash(r), before); assert.deepEqual(Array.from(n.subarray(7)), new Array(9).fill(0)); assert.equal(n[6], 0x20); assert.notEqual(v, r); assert.equal(v[7], 0);
    const clean = rom({b6: 0x41, b7: 0x08, tail: [0, 0, 0x70, 0x07]}); assert.deepEqual(H.normalizedHeader(clean), clean.slice(0, 16), 'iNES 1.0 and NES 2.0 headers are already normal');
  });
  const cartridges = carts && fs.existsSync(carts) ? fs.readdirSync(carts).filter(f => /\.nes$/i.test(f)).sort().map(f => ({name: f.replace(/\.nes$/i, ''), bytes: new Uint8Array(fs.readFileSync(path.join(carts, f)))})) : [];
  await check('local cartridges: every header is recognized as expected and none is changed', () => {
    if (!cartridges.length) return {skipped: 'no cartridge folder'};
    const rows = [];
    for (const c of cartridges) { const before = hash(c.bytes), i = H.inspect(c.bytes); H.view(c.bytes); assert.equal(hash(c.bytes), before, c.name);
      assert.ok(i.valid && !i.truncated, c.name); const e = EXPECTED[c.name];
      if (e) { assert.equal(i.format, e.format, c.name); assert.equal(i.mapper, e.mapper, c.name); if (e.declaredMapper !== undefined) assert.equal(i.declaredMapper, e.declaredMapper, c.name); if (e.signature) assert.equal(i.ignored.signature, e.signature, c.name); }
      rows.push({cartridge: c.name, reading: H.describe(i)}); }
    return {rows};
  });
  // ---------- the editor ----------
  const {load} = require('../app/tests/dom-environment.cjs');
  await check('editor: the emulator, the intake analysis and the library read the same mapper', async () => {
    const a = load(editor), w = a.window, s = w.Forge.services; await new Promise(r => setTimeout(r, 30));
    const parse = w.eval('parseRomHeader'), rows = [];
    for (const c of cartridges) { const i = H.inspect(c.bytes); let emu = null; try { emu = parse(w.Uint8Array.from(c.bytes)).mapper; } catch (e) { emu = 'refused: ' + e.message; }
      const an = await s.REAnalysis.open(w.Uint8Array.from(c.bytes), {name: c.name + '.nes', allowLegacyHeaderLayout: true}), am = an.report.headerReading.mapper;
      // the analysis's header record keeps the declarations unchanged (stored ROM-project catalogs compare it exactly)
      assert.equal(an.report.header.mapper, i.declaredMapper, c.name + ' declared mapper');
      const lib = s.LibraryCatalog.romLayout(w.Uint8Array.from(c.bytes)).mapper;
      if (typeof emu === 'number') assert.equal(emu, i.mapper, c.name + ' emulator'); assert.equal(am, i.mapper, c.name + ' analysis'); assert.equal(lib, i.mapper, c.name + ' library');
      rows.push({cartridge: c.name, mapper: i.mapper, emulator: emu, analysis: am, library: lib}); }
    // synthetic: an archaic header with a supported mapper loads with byte 6's mapper; NES 2.0 with a supported mapper loads
    assert.equal(parse(w.Uint8Array.from(rom({b6: 0x20, b7: 0x44, tail: ascii('iskDude!')}))).mapper, 2);
    const n2 = parse(w.Uint8Array.from(rom({b6: 0x11, b7: 0x08, tail: [0, 0, 0, 0x07]}))); assert.equal(n2.mapper, 1); assert.equal(n2.headerFormat, 'NES 2.0');
    assert.throws(() => parse(w.Uint8Array.from(rom({b6: 0x10, b7: 0x08, tail: [0x21]}))), /submapper|Unsupported mapper/);
    assert.throws(() => parse(w.Uint8Array.from(rom({b6: 0x00, b7: 0x09}))), /VS System/);
    return {rows};
  });
  await check('editor: Mega Man (U) with its "DiskDude!" header runs in NES Forge\'s emulator unmodified', async () => {
    const c = cartridges.find(x => x.name === 'Mega Man (U)'); if (!c) return {skipped: 'no Mega Man (U) cartridge'};
    const a = load(editor), w = a.window; await new Promise(r => setTimeout(r, 30)); w.emuReadJoyState = () => 0;
    const before = hash(c.bytes), given = w.Uint8Array.from(c.bytes); assert.ok(w.eval('emuLoadRomData')(given, 'Mega Man (U).nes', 0));
    assert.equal(hash(Buffer.from(given)), before, 'the bytes given to the emulator are unchanged');
    const emu = w.eval('emu'), run = w.eval('emuRunFrame'), vec = 16 + c.bytes[4] * 16384 - 6, nmi = c.bytes[vec] | (c.bytes[vec + 1] << 8); let nmis = 0;
    w.__nmiTarget = nmi; w.__nmiSeen = () => nmis++;
    w.eval('(function(){const prev=cpuStepRaw;cpuStepRaw=function(...a){if((emu.PC&0xffff)===window.__nmiTarget)window.__nmiSeen();return prev.apply(this,a);};})()');
    for (let f = 0; f < 240; f++) run();
    assert.equal(emu.mapper, 2); assert.ok(nmis >= 100, 'the game\'s NMI handler ran ' + nmis + ' times in 240 frames (previously never)');
    const shown = Array.from({length: 960}, (_, i) => w.eval('ppuBusRead')(0x2000 + i)).filter(v => v).length;
    return {mapper: emu.mapper, nmis, nonzeroNametableTiles: shown};
  });
  await check('editor: the intake keeps the header\'s declarations and reports the archaic reading and the mapper it uses', async () => {
    const c = cartridges.find(x => x.name === 'Shadowgate (U)') || cartridges.find(x => x.name === 'Mega Man (U)'); if (!c) return {skipped: 'no cartridge'};
    const a = load(editor), w = a.window, s = w.Forge.services; await new Promise(r => setTimeout(r, 30));
    const an = await s.REAnalysis.open(w.Uint8Array.from(c.bytes), {name: c.name + '.nes', allowLegacyHeaderLayout: true});
    assert.equal(an.report.headerReading.format, 'archaic iNES'); assert.ok(an.report.warnings?.some?.(x => /Archaic iNES header/.test(x)) || JSON.stringify(an.report).includes('Archaic iNES header'));
    assert.equal(an.report.header.format, 'iNES 1.0', 'the declared header record is unchanged');
    return {cartridge: c.name, declared: {format: an.report.header.format, mapper: an.report.header.mapper}, reading: an.report.headerReading};
  });
  const failed = results.filter(r => !r.ok);
  const report = {suite: 'ines-header', editorSha256: hash(fs.readFileSync(editor)), passed: failed.length === 0, total: results.length, checksPassed: results.length - failed.length, results};
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
  console.log((failed.length ? 'FAILED ' : 'PASSED ') + (results.length - failed.length) + '/' + results.length);
  process.exit(failed.length ? 1 : 0);
})();
