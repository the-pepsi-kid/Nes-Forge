'use strict';
// Owner-side (needs original cartridges; no game data is written to the report, only digests, counts and timings):
// one frame-indexed evidence record per frame, reached from ONE boot by restoring a physical emulator checkpoint, and
// proven equal to independent cold-boot references.
//   Ninja Gaiden (reference): the 22 areas reached by the game's own time-over restart; per area the checkpoint capture
//     and a cold boot capture agree in every section (CPU, RAM, PPU, nametables, palette, OAM, mapper, PRG/CHR banks,
//     framebuffer); the HUD shows the catalog's stage; the frame rebuilds from its own data with 0 different pixels;
//     PRG/CHR banks are located in the cartridge file; CHR banks link to their library entries
//   execution trace: replaying a target's last frame from the checkpoint gives the same code coverage twice
//   stage survey: booting once (checkpoint) gives exactly the cold-boot survey's results, faster
//   other games (one per emulated mapper family, generic inputs, no game knowledge): checkpoint == cold for every
//     target; CHR ROM banks equal the cartridge bytes; synchronization reported per game, not assumed
//   node QA/frame-evidence.cjs <NES_Forge.html> <report.json> <folder with cartridges> [<screenshot folder>]
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), zlib = require('node:zlib');
const {chromium} = require('playwright');
const [editorArg, output, cartDir, shots] = process.argv.slice(2);
const editor = path.resolve(editorArg), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {editorSha256: sha(fs.readFileSync(editor)), checks: [], timings: {}, games: []};
const check = (name, passed, detail) => { report.checks.push({name, passed: !!passed, ...(detail === undefined ? {} : {detail})}); process.stderr.write((passed ? 'ok ' : 'not ok ') + name + '\n'); };
const NINJA = '07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e';
const carts = fs.readdirSync(cartDir).filter(f => /\.nes$/i.test(f)).map(f => ({file: path.join(cartDir, f), name: f, sha: sha(fs.readFileSync(path.join(cartDir, f)))}));
const OTHERS = [/^Super Mario Bros - Duck Hunt/i, /^Mega Man 2/i, /^Zelda 2/i, /^Contra/i, /^Super Mario Bros 3/i, /^Battletoads/i, /^Mike Tyson/i];
function png(rgba) { // 256x240 RGBA -> PNG
  const raw = Buffer.alloc(240 * (256 * 4 + 1)); for (let y = 0; y < 240; y++) rgba.copy(raw, y * 1025 + 1, y * 1024, y * 1024 + 1024);
  const crcT = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const n = Buffer.from(t), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(Buffer.concat([n, d]))); return Buffer.concat([l, n, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(256, 0); ih.writeUInt32BE(240, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}}); page.setDefaultTimeout(1800000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const run = (name, args) => page.evaluate(async ([name, args]) => { if (args?.__b64) { args = {...args, bytes: Uint8Array.from(atob(args.__b64), c => c.charCodeAt(0))}; delete args.__b64; }
    const r = await Forge.commands.run(name, args); if (!r.ok) throw Error(name + ': ' + r.error.message); return r.result; }, [name, args]);
  const time = async fn => { const t = Date.now(); const r = await fn(); return [r, Date.now() - t]; };
  const sectionDiff = (a, b) => a.results.map((r, i) => Object.keys(r.digests).filter(k => r.digests[k] !== b.results[i]?.digests[k]));
  try {
    await page.goto('file://' + editor); await page.waitForFunction('window.Forge?.services?.FrameEvidence');
    // ---------- Ninja Gaiden: 22 areas ----------
    const ng = carts.find(c => c.sha === NINJA); if (!ng) throw Error('Ninja Gaiden (US) cartridge not found');
    const ngB64 = fs.readFileSync(ng.file).toString('base64');
    await run('rom.import', {__b64: ngB64, name: 'Ninja Gaiden (U).nes'}); await run('library.registerCatalog');
    const scenes = await page.evaluate(() => Forge.services.ProjectStore.capture().investigation.catalogs.native.scenes.map(s => ({area: s.area, room: s.room, first: s.areaFirstRoom, stage: s.stage})));
    const areas = [...new Set(scenes.map(s => s.area))].sort((a, b) => a - b);
    const ngPlan = {boot: {frames: 0, pressUntil: {buttons: {start: true}, every: 30, hold: 4, conditions: [{vram: 0x97, equals: 0x18}, {address: 0x6D, equals: 0}], maxFrames: 3000, after: 60}},
      targets: areas.map(area => { const first = scenes.find(s => s.area === area); const room = first.first ?? first.room;
        return area ? {label: 'area ' + area, ram: {0x6D: area, 0x6E: room, 0x6F: room, 0x63: 1, 0x76: 2}, until: [{address: 0x63, equals: 0}, {address: 0x63, min: 140, max: 150}], maxFrames: 6000, frames: 60} : {label: 'area 0', frames: 60}; })};
    const [warm, warmMs] = await time(() => run('emulator.capturePlan', {__b64: ngB64, name: 'ng.nes', plan: ngPlan, mode: 'checkpoint', pixels: !!shots}));
    const [cold, coldMs] = await time(() => run('emulator.capturePlan', {__b64: ngB64, name: 'ng.nes', plan: ngPlan, mode: 'cold'}));
    report.timings.ninjaGaiden22Areas = {checkpointMs: warmMs, coldMs, checkpointBoots: warm.boots, coldBoots: cold.boots, checkpointBootMs: warm.bootMs, coldBootMs: cold.bootMs};
    const diffs = sectionDiff(warm, cold);
    check('Ninja Gaiden, 22 areas: every section of the checkpoint capture equals the cold-boot capture (CPU, RAM, PPU, nametables, palette, OAM, mapper, banks, framebuffer)',
      warm.results.length === areas.length && diffs.every(d => d.length === 0) && warm.results.every(r => r.reached.reached), {differing: diffs.map((d, i) => d.length ? areas[i] + ':' + d.join('/') : null).filter(Boolean)});
    const hudOk = warm.results.map((r, i) => { const ram = Buffer.from(r.memory.ram, 'base64'), nt = Buffer.from(r.nametables, 'base64'), st = scenes.find(s => s.area === areas[i]).stage;
      return ram[0x6D] === areas[i] && nt[0x96] === st.act && nt[0x97] === 0x18 && nt[0x98] === st.number; });
    check('Each capture is in its area and the game draws the catalog\'s stage on the HUD', hudOk.every(Boolean), {wrong: hudOk.map((ok, i) => ok ? null : areas[i]).filter(x => x !== null)});
    check('Each frame rebuilds from its own captured data with 0 different pixels (data and image are the same frame)',
      warm.results.every(r => r.synchronization.state === 'matched' && r.synchronization.compositeDifferentPixels === 0 && r.synchronization.backgroundDifferentPixels === 0), warm.results.map(r => r.synchronization.state));
    const rom = fs.readFileSync(ng.file);
    const banksOk = warm.results.every(r => r.banks.prg.every(w => w.located === 'unique' && w.matchesFile) && r.banks.chr.every(w => w.source === 'CHR ROM' && w.matchesFile) &&
      r.banks.chr.every(w => rom.subarray(w.fileOffset, w.fileOffset + 16).equals(rom.subarray(16 + 8 * 16384 + w.offset, 16 + 8 * 16384 + w.offset + 16))));
    check('Mapped PRG and CHR banks are located in the cartridge file and their bytes match it', banksOk, warm.results[0].banks.chr.map(w => w.chrBank1KiB));
    const pcOk = warm.results.every(r => Number.isInteger(r.cpu.pcLocation.fileOffset) && rom[r.cpu.pcLocation.fileOffset] !== undefined);
    check('The CPU\'s position is located in the cartridge (PC to file offset through the mapped PRG window)', pcOk, warm.results.slice(0, 3).map(r => r.cpu.pcLocation));
    const links = warm.results[3].links || [];
    check('Mapped CHR banks link to their recovered-catalog library entries', links.length > 0 && links.every(l => /^rom:07d9e57e35184667:chr:chr:\d+$/.test(l.entryId)), links.map(l => l.entryId));
    if (shots) { fs.mkdirSync(shots, {recursive: true}); let okShots = 0;
      for (const [i, r] of warm.results.entries()) { const rgba = Buffer.from(r.rendered.rgba, 'base64'); if (sha(rgba) === r.rendered.framebufferSha256) okShots++;
        if ([0, 2, 3, 8, 16, 21].includes(areas[i])) fs.writeFileSync(path.join(shots, 'frame_area_' + String(areas[i]).padStart(2, '0') + '.png'), png(rgba)); }
      check('Screenshots are the captured frames: each image\'s pixels hash to its record\'s framebuffer SHA-256', okShots === warm.results.length, {okShots}); }
    // ---------- a frame in the library: screenshot as a rendered preview, CHR data in the linked CHR entries ----------
    const reg = await run('library.registerFrame', {label: 'Ninja Gaiden area 21'});
    const fe = await page.evaluate(async id => { const L = Forge.services.ResourceLibrary, e = await L.entry(id);
      const chr = []; for (const l of e.links) { const c = await L.entry(l.id); chr.push({id: c.id, kind: c.kind, fileType: c.fileType, contentHash: c.contentHash, fileOffset: c.evidence?.primary?.fileOffset, length: c.evidence?.primary?.length}); }
      return {kind: e.kind, origin: e.origin, preview: e.preview, primary: e.evidence.primary, links: e.links.length, chr}; }, reg.id);
    const chrOk = fe.chr.length > 0 && fe.chr.every(c => c.kind === 'chr' && c.fileType === 'binary' && c.contentHash === sha(rom.subarray(c.fileOffset, c.fileOffset + c.length)));
    check('A frame in the library: its screenshot is a preview marked as rendered pixels, its PC is a typed code location, and it links to CHR entries whose bytes equal the cartridge\'s',
      reg.preview && fe.kind === 'frame' && fe.origin === 'runtime-capture' && /rendered framebuffer/.test(fe.preview?.derivation || '') && fe.primary?.code && Number.isInteger(fe.primary.fileOffset) && chrOk,
      {links: fe.links, chr: fe.chr.map(c => c.id), primary: fe.primary});
    // ---------- execution trace on demand ----------
    const tracePlan = {boot: ngPlan.boot, targets: [ngPlan.targets.find(t => t.label === 'area 3')]};
    const t1 = await run('emulator.capturePlan', {__b64: ngB64, name: 'ng.nes', plan: tracePlan, mode: 'checkpoint', trace: true});
    const t2 = await run('emulator.capturePlan', {__b64: ngB64, name: 'ng.nes', plan: tracePlan, mode: 'checkpoint', trace: true});
    const tr1 = t1.results[0].trace, tr2 = t2.results[0].trace;
    check('Execution trace on demand: replaying the frame before a snapshot from its checkpoint records code coverage, identically twice',
      tr1.state === 'recorded' && tr1.coverageEntries > 0 && tr1.instructions > 0 && tr1.instructions === tr2.instructions && tr1.coverageEntries === tr2.coverageEntries &&
      JSON.stringify(tr1.sample) === JSON.stringify(tr2.sample) && t1.results[0].digests.all === warm.results[3].digests.all, {instructions: tr1.instructions, coverage: tr1.coverageEntries, withOffsets: tr1.sample.filter(s => s.fileOffset !== null).length});
    // ---------- the stage survey: one boot instead of one per area ----------
    const [sCold, sColdMs] = await time(() => run('library.surveyStages', {areas: '0,2,3', frames: 1500, boot: 'cold'}));
    const [sWarm, sWarmMs] = await time(() => run('library.surveyStages', {areas: '0,2,3', frames: 1500, boot: 'checkpoint'}));
    report.timings.survey3Stages = {coldMs: sColdMs, checkpointMs: sWarmMs, coldBoots: sCold.timing.boots, checkpointBoots: sWarm.timing.boots};
    const strip = r => JSON.stringify(r.areas.map(a => ({...a, route: undefined})));
    check('Stage survey: booting once and restoring per area gives exactly the results of booting per area', strip(sCold) === strip(sWarm) && sWarm.timing.boots === 1 && sCold.timing.boots === 3,
      {coldMs: sColdMs, checkpointMs: sWarmMs});
    // ---------- other games, one per mapper family, generic inputs ----------
    const generic = {boot: {frames: 360, inputs: [{from: 120, to: 124, buttons: {start: true}}, {from: 240, to: 244, buttons: {start: true}}]},
      targets: [{label: 'idle', frames: 30}, {label: 'right', frames: 600, inputs: [{from: 0, to: 599, buttons: {right: true}}, {from: 200, to: 210, buttons: {a: true}}]},
        {label: 'start, then right', frames: 900, inputs: [{from: 10, to: 14, buttons: {start: true}}, {from: 300, to: 899, buttons: {right: true}}]}]};
    for (const pattern of OTHERS) {
      const c = carts.find(x => pattern.test(x.name)); if (!c) { report.games.push({game: String(pattern), state: 'cartridge not found'}); continue; }
      const b64 = fs.readFileSync(c.file).toString('base64'), file = fs.readFileSync(c.file);
      try {
        const [w, wMs] = await time(() => run('emulator.capturePlan', {__b64: b64, name: c.name, plan: generic, mode: 'checkpoint'}));
        const [k, kMs] = await time(() => run('emulator.capturePlan', {__b64: b64, name: c.name, plan: generic, mode: 'cold'}));
        const d = sectionDiff(w, k), r0 = w.results[0];
        const chrRom = w.results.flatMap(r => r.banks.chr.filter(x => x.source === 'CHR ROM'));
        report.games.push({game: c.name.replace(/\.nes$/i, ''), mapper: r0.rom.mapper, chr: r0.rom.chrRam ? 'CHR RAM' : 'CHR ROM', checkpointMs: wMs, coldMs: kMs,
          equal: d.every(x => x.length === 0), differing: d.map(x => x.join('/')).filter(Boolean),
          chrRomBanksMatchFile: chrRom.length ? chrRom.every(x => x.matchesFile) : null, prgLocated: w.results.every(r => r.banks.prg.every(x => x.located !== 'not in PRG ROM (RAM or open bus)' && x.matchesFile !== false)),
          synchronization: w.results.map(r => r.synchronization.state === 'matched' ? 'matched' : 'not matched: ' + r.synchronization.reason.slice(0, 90)), file: file.length});
      } catch (e) { report.games.push({game: c.name, state: 'error', error: String(e.message).slice(0, 200)}); }
    }
    const played = report.games.filter(g => g.equal !== undefined);
    check('Other games (one per emulated mapper family): every checkpoint capture equals its cold-boot capture', played.length >= 5 && played.every(g => g.equal), played.map(g => g.game + ': ' + (g.equal ? 'equal' : g.differing.join(','))));
    check('Other games: every mapped CHR ROM bank equals the cartridge bytes at its reported file offset', played.every(g => g.chrRomBanksMatchFile !== false), played.map(g => g.game + ': ' + g.chrRomBanksMatchFile));
    check('No uncaught page errors', errors.length === 0, errors.slice(0, 3));
  } catch (e) { check('run', false, String(e.stack || e.message).slice(0, 800)); }
  await browser.close();
  report.passed = report.checks.length > 0 && report.checks.every(c => c.passed);
  for (const c of report.checks) console.log((c.passed ? 'PASS ' : 'FAIL ') + c.name + (c.passed || c.detail === undefined ? '' : ': ' + JSON.stringify(c.detail).slice(0, 600)));
  console.log('timings ' + JSON.stringify(report.timings));
  for (const g of report.games) console.log('game ' + JSON.stringify(g));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.passed ? 0 : 1;
})();
